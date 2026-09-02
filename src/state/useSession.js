import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { detect } from '../engine/detect.js'
import { redact } from '../engine/redact.js'
import { rehydrate } from '../engine/rehydrate.js'
import { resolveOverlaps } from '../engine/overlap.js'
import { buildCustomRules, rules as builtInRules } from '../engine/rules.js'
import { tokenise } from '../engine/tokenise.js'

/**
 * Above this input size, live redaction switches off and the caller must trigger a run
 * explicitly via `requestScrub` — SPEC.md's decisions table. Re-hydration has no such gate:
 * it's one tolerant regex pass, cheap regardless of size.
 */
export const LIVE_REDACTION_THRESHOLD_BYTES = 200 * 1024

const CATEGORIES = ['cloud', 'identity', 'network', 'secrets', 'pii', 'custom']

/** A `{{TYPE_N}}`-shaped token, used to notice when de-identify mode has been pasted the
 * output of an earlier re-hydrate — see the mode auto-detect feature in SPEC.md. */
const TOKEN_PATTERN = /\{\{[A-Z0-9_]+\}\}/g

function initialState() {
  return {
    mode: 'deidentify',
    input: '',
    ruleToggles: Object.fromEntries(builtInRules.map((r) => [r.id, r.defaultEnabled])),
    categoryToggles: Object.fromEntries(CATEGORIES.map((c) => [c, true])),
    customTerms: [],
    mapping: new Map(),
    reverse: new Map(),
    counters: {},
    // Not part of SPEC.md's session data shape verbatim, but the natural place to hold the
    // de-identify pipeline's latest result: it's produced by the same action (RUN_RESULT) that
    // updates the mapping, so both land in one dispatch rather than several separate setState
    // calls racing each other across renders.
    output: '',
    matches: [],
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'TOGGLE_RULE':
      return {
        ...state,
        ruleToggles: { ...state.ruleToggles, [action.id]: !(state.ruleToggles[action.id] ?? true) },
      }
    case 'TOGGLE_CATEGORY':
      return {
        ...state,
        categoryToggles: {
          ...state.categoryToggles,
          [action.category]: !(state.categoryToggles[action.category] ?? true),
        },
      }
    case 'SET_CUSTOM_TERMS':
      return { ...state, customTerms: action.terms }
    case 'SET_MAPPING_ENTRY': {
      const mapping = new Map(state.mapping)
      const existing = mapping.get(action.original)
      if (!existing) return state
      mapping.set(action.original, { ...existing, ...action.patch })
      return { ...state, mapping }
    }
    case 'RUN_RESULT':
      return {
        ...state,
        mapping: action.mapping,
        reverse: action.reverse,
        counters: action.counters,
        matches: action.matches,
        output: action.output,
      }
    case 'PURGE':
      return initialState()
    default:
      return state
  }
}

/**
 * Delays reacting to `value` by `delayMs`, resetting the timer on every change — keeps the
 * detection pipeline from re-running on every keystroke. SPEC.md specifies 150ms.
 */
function useDebounced(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function byteSize(text) {
  return new TextEncoder().encode(text).length
}

/**
 * The single session store (SPEC.md's `state/useSession.js`): owns mode, input, rule/category
 * toggles, custom terms and the mapping, and drives the pipeline —
 * `detect -> resolveOverlaps -> tokenise -> redact` in de-identify mode, `rehydrate` in the
 * other — over it. The engine itself stays pure; this hook is the only place it touches React
 * state, and everything a component needs to render is returned from here.
 */
export function useSession() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const debouncedInput = useDebounced(state.input, 150)

  const enabledRules = useMemo(() => {
    const custom = buildCustomRules(state.customTerms)
    return [...builtInRules, ...custom].filter((rule) => {
      if (state.categoryToggles[rule.category] === false) return false
      if (rule.category !== 'custom' && state.ruleToggles[rule.id] === false) return false
      return true
    })
  }, [state.customTerms, state.categoryToggles, state.ruleToggles])

  const overThreshold = byteSize(state.input) > LIVE_REDACTION_THRESHOLD_BYTES

  // tokenise needs the mapping/reverse/counters as they stood before this run, but must not
  // itself be a reactive dependency of the effect below — depending on it would mean the
  // effect re-runs on the very state update it just produced. A ref sidesteps that: it always
  // holds the latest state without being part of any dependency array.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const runPipeline = useCallback(
    (text) => {
      const resolved = resolveOverlaps(detect(text, enabledRules))
      const { mapping, reverse, counters } = tokenise(resolved, stateRef.current)
      dispatch({
        type: 'RUN_RESULT',
        mapping,
        reverse,
        counters,
        matches: resolved,
        output: redact(text, resolved, mapping),
      })
    },
    [enabledRules],
  )

  // The live path: runs automatically on every debounced input/rule change, but only below the
  // size threshold.
  useEffect(() => {
    if (state.mode !== 'deidentify' || overThreshold) return
    runPipeline(debouncedInput)
  }, [debouncedInput, state.mode, overThreshold, runPipeline])

  // The manual path for oversized input: bypasses the debounce and the threshold gate, using
  // whatever text is in the box right now.
  const requestScrub = useCallback(() => runPipeline(state.input), [runPipeline, state.input])

  // Re-hydration is cheap regardless of size, so it just runs live off the debounced input —
  // no threshold, no dispatch (it doesn't grow the mapping, only reads it).
  const rehydrated = useMemo(() => {
    if (state.mode !== 'rehydrate') return { text: '', unknownTokens: [] }
    return rehydrate(debouncedInput, state.reverse)
  }, [debouncedInput, state.mode, state.reverse])

  // Round-trip self-check (SPEC.md feature 13): after a redaction, rehydrating the output
  // should reproduce exactly the text that was redacted. This can only actually fail once a
  // token can be renamed (a later stage), but the check runs from the first redaction onward.
  // Gated on `matches.length > 0`: with nothing redacted this run, output is just a passthrough
  // of the input, and if that input happens to already contain `{{...}}`-shaped text (a
  // template file, or model output pasted into the wrong pane), rehydrating it would "restore"
  // text the redaction never touched and report a false failure — see the token-delimiter
  // collision this app doesn't yet detect (SPEC.md, deferred to a later stage).
  const roundTrip = useMemo(() => {
    if (state.mode !== 'deidentify' || state.matches.length === 0) return { ok: true, unknownTokens: [] }
    const result = rehydrate(state.output, state.reverse)
    return { ok: result.text === debouncedInput, unknownTokens: result.unknownTokens }
  }, [state.output, state.matches, state.reverse, state.mode, debouncedInput])

  // Mode auto-detect (SPEC.md feature 12): de-identify mode has been given text that contains
  // a token this session already minted — very likely a model's reply pasted into the wrong
  // pane.
  const looksLikeModelOutput = useMemo(() => {
    if (state.mode !== 'deidentify') return false
    const found = state.input.match(TOKEN_PATTERN)
    return found ? found.some((token) => state.reverse.has(token)) : false
  }, [state.input, state.mode, state.reverse])

  return {
    state,
    dispatch,
    enabledRules,
    overThreshold,
    requestScrub,
    output: state.mode === 'deidentify' ? state.output : rehydrated.text,
    matches: state.matches,
    unknownTokens: state.mode === 'rehydrate' ? rehydrated.unknownTokens : roundTrip.unknownTokens,
    roundTripFailed: state.mode === 'deidentify' && !roundTrip.ok,
    looksLikeModelOutput,
  }
}
