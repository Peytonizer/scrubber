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

/** Matches a token in either delimiter style tokenise.js can produce — used to notice when
 * de-identify mode has been pasted the output of an earlier re-hydrate (the mode auto-detect
 * feature) and to detect a `{{` collision in fresh input. */
const TOKEN_PATTERN = /\{\{[A-Z0-9_]+\}\}|<<[A-Z0-9_]+>>/g

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
    // 'curly' ({{TYPE_N}}) unless the user has accepted the collision offer for input that
    // already contains `{{` — SPEC.md's token-delimiter-collision decision.
    delimiter: 'curly',
    // Not part of SPEC.md's session data shape verbatim: the exact text the current `matches`
    // were detected against. Keeping it lets `output` be derived (matchedText, matches,
    // mapping) rather than stored, so toggling or renaming a mapping row re-splices the
    // existing matches into that same text instantly, without re-running detection.
    matchedText: '',
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
    case 'SET_DELIMITER':
      return { ...state, delimiter: action.delimiter }
    case 'SET_MAPPING_ENTRY': {
      const mapping = new Map(state.mapping)
      const existing = mapping.get(action.original)
      if (!existing) return state
      mapping.set(action.original, { ...existing, ...action.patch })
      return { ...state, mapping }
    }
    case 'RENAME_TOKEN': {
      const entry = state.mapping.get(action.original)
      if (!entry) return state
      const newToken = `${action.open}${action.name}${action.close}`
      if (newToken === entry.token) return state
      // Reject a collision with a different entry's token — the caller (MappingTable) is
      // expected to have already checked this and shown its own error, but the reducer stays
      // safe on its own rather than trusting the caller.
      for (const other of state.mapping.values()) {
        if (other !== entry && other.token === newToken) return state
      }
      const mapping = new Map(state.mapping)
      mapping.set(action.original, { ...entry, token: newToken })
      const reverse = new Map(state.reverse)
      reverse.delete(entry.token)
      reverse.set(newToken, action.original)
      return { ...state, mapping, reverse }
    }
    case 'RUN_RESULT':
      return {
        ...state,
        mapping: action.mapping,
        reverse: action.reverse,
        counters: action.counters,
        matches: action.matches,
        matchedText: action.matchedText,
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

  // tokenise needs the mapping/reverse/counters/delimiter as they stood before this run, but
  // must not itself be a reactive dependency of the effect below — depending on it would mean
  // the effect re-runs on the very state update it just produced. A ref sidesteps that: it
  // always holds the latest state without being part of any dependency array.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const runPipeline = useCallback(
    (text) => {
      const resolved = resolveOverlaps(detect(text, enabledRules))
      const { mapping, reverse, counters } = tokenise(resolved, stateRef.current, stateRef.current.delimiter)
      dispatch({ type: 'RUN_RESULT', mapping, reverse, counters, matches: resolved, matchedText: text })
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

  // The redacted text is derived, not stored: re-splicing `state.matches` into `state.matchedText`
  // with the current `state.mapping` picks up a row's enabled toggle or a token rename
  // instantly, with no need to re-run detection over text that hasn't changed.
  const output = useMemo(
    () => redact(state.matchedText, state.matches, state.mapping),
    [state.matchedText, state.matches, state.mapping],
  )

  // Re-hydration is cheap regardless of size, so it just runs live off the debounced input —
  // no threshold, no dispatch (it doesn't grow the mapping, only reads it).
  const rehydrated = useMemo(() => {
    if (state.mode !== 'rehydrate') return { text: '', unknownTokens: [] }
    return rehydrate(debouncedInput, state.reverse)
  }, [debouncedInput, state.mode, state.reverse])

  // Round-trip self-check (SPEC.md feature 13): rehydrating the output should reproduce
  // exactly the text it was redacted from. Gated on `matches.length > 0`: with nothing
  // redacted, output is just a passthrough of the input, and if that input happens to already
  // contain token-shaped text (a template file, or model output pasted into the wrong pane),
  // rehydrating it would "restore" text the redaction never touched and report a false
  // failure.
  const roundTrip = useMemo(() => {
    if (state.mode !== 'deidentify' || state.matches.length === 0) return { ok: true, unknownTokens: [] }
    const result = rehydrate(output, state.reverse)
    return { ok: result.text === state.matchedText, unknownTokens: result.unknownTokens }
  }, [output, state.matches, state.reverse, state.mode, state.matchedText])

  // Mode auto-detect (SPEC.md feature 12): de-identify mode has been given text that contains
  // a token this session already minted — very likely a model's reply pasted into the wrong
  // pane.
  const looksLikeModelOutput = useMemo(() => {
    if (state.mode !== 'deidentify') return false
    const found = state.input.match(TOKEN_PATTERN)
    return found ? found.some((token) => state.reverse.has(token)) : false
  }, [state.input, state.mode, state.reverse])

  // Token-delimiter collision (SPEC.md's decisions table): de-identify input already contains
  // `{{`, and the session hasn't already switched to the angle-bracket delimiter — offer the
  // switch rather than producing curly tokens indistinguishable from the input's own braces.
  const bracesCollision =
    state.mode === 'deidentify' && state.delimiter === 'curly' && state.input.includes('{{')

  return {
    state,
    dispatch,
    enabledRules,
    overThreshold,
    requestScrub,
    output: state.mode === 'deidentify' ? output : rehydrated.text,
    matches: state.matches,
    unknownTokens: state.mode === 'rehydrate' ? rehydrated.unknownTokens : roundTrip.unknownTokens,
    roundTripFailed: state.mode === 'deidentify' && !roundTrip.ok,
    looksLikeModelOutput,
    bracesCollision,
  }
}
