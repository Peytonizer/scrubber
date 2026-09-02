import { useEffect, useState } from 'react'
import Footer from './components/Footer'
import Header from './components/Header'
import InputPane from './components/InputPane'
import MappingTable from './components/MappingTable'
import OutputPane from './components/OutputPane'
import RuleDrawer from './components/RuleDrawer'
import StatsBadges from './components/StatsBadges'
import { useSession } from './state/useSession.js'

const PANE_LABELS = {
  deidentify: { input: 'Input', output: 'Redacted' },
  rehydrate: { input: 'Model output', output: 'Restored' },
}

function App() {
  const {
    state,
    dispatch,
    overThreshold,
    requestScrub,
    output,
    matches,
    unknownTokens,
    roundTripFailed,
    looksLikeModelOutput,
    bracesCollision,
  } = useSession()

  const [autoDetectDismissed, setAutoDetectDismissed] = useState(false)
  const [collisionDismissed, setCollisionDismissed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const labels = PANE_LABELS[state.mode]

  let statusMessage = null
  if (state.mode === 'deidentify') {
    if (state.input.trim() === '') {
      statusMessage = 'Paste something into the input pane to get started.'
    } else if (overThreshold && output === '') {
      statusMessage = 'Input is over 200 KB — live redaction is paused. Click Scrub to redact it.'
    } else if (!overThreshold && matches.length === 0) {
      statusMessage = 'No sensitive values found.'
    }
  }

  const showAutoDetect = looksLikeModelOutput && !autoDetectDismissed
  const showCollisionOffer = bracesCollision && !collisionDismissed

  // Keyboard shortcuts (SPEC.md feature 16): Cmd/Ctrl+Enter copies the output, Cmd/Ctrl+K
  // toggles mode, Cmd/Ctrl+B toggles the rule drawer. A window-level listener sees these
  // regardless of which pane has focus — keydown bubbles there from anywhere on the page.
  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (output) navigator.clipboard.writeText(output).catch(() => {})
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        dispatch({ type: 'SET_MODE', mode: state.mode === 'deidentify' ? 'rehydrate' : 'deidentify' })
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setDrawerOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [output, state.mode, dispatch])

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        mode={state.mode}
        onModeChange={(mode) => dispatch({ type: 'SET_MODE', mode })}
        mappingSize={state.mapping.size}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        onPurge={() => dispatch({ type: 'PURGE' })}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-8 max-[900px]:px-8 min-[901px]:px-[72px]">
        {showAutoDetect && (
          <div className="flex items-center justify-between gap-4 rounded border border-accent/40 bg-surface px-4 py-3 font-mono text-[12px] text-text-dim">
            <span>This looks like model output — switch to re-hydrate?</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_MODE', mode: 'rehydrate' })}
                className="rounded-[3px] bg-accent px-3 py-1 font-semibold text-bg hover:bg-accent-hover"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={() => setAutoDetectDismissed(true)}
                className="text-text-faint hover:text-text-muted"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {showCollisionOffer && (
          <div className="flex items-center justify-between gap-4 rounded border border-accent/40 bg-surface px-4 py-3 font-mono text-[12px] text-text-dim">
            <span>
              Input already contains <code>{'{{'}</code> — use <code>{'<< >>'}</code> tokens
              instead so they stay distinguishable?
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_DELIMITER', delimiter: 'angle' })}
                className="rounded-[3px] bg-accent px-3 py-1 font-semibold text-bg hover:bg-accent-hover"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={() => setCollisionDismissed(true)}
                className="text-text-faint hover:text-text-muted"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {roundTripFailed && (
          <div className="rounded border border-accent/40 bg-surface px-4 py-3 font-mono text-[12px] text-text-dim">
            Round-trip check failed — re-hydrating the output didn't reproduce the input.
            {unknownTokens.length > 0 && ` Unrecognised: ${unknownTokens.join(', ')}`}
          </div>
        )}

        {state.mode === 'rehydrate' && unknownTokens.length > 0 && (
          <div className="rounded border border-accent/40 bg-surface px-4 py-3 font-mono text-[12px] text-text-dim">
            {unknownTokens.length} unknown token{unknownTokens.length === 1 ? '' : 's'} left
            unchanged: {[...new Set(unknownTokens)].join(', ')}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-6 min-[901px]:flex-row">
          <InputPane
            label={labels.input}
            value={state.input}
            onChange={(input) => dispatch({ type: 'SET_INPUT', input })}
          />
          <OutputPane
            label={labels.output}
            value={output}
            statusMessage={statusMessage}
            overThreshold={state.mode === 'deidentify' && overThreshold}
            onScrub={requestScrub}
          />
          {drawerOpen && (
            <RuleDrawer
              categoryToggles={state.categoryToggles}
              ruleToggles={state.ruleToggles}
              customTerms={state.customTerms}
              onToggleCategory={(category) => dispatch({ type: 'TOGGLE_CATEGORY', category })}
              onToggleRule={(id) => dispatch({ type: 'TOGGLE_RULE', id })}
              onSetCustomTerms={(terms) => dispatch({ type: 'SET_CUSTOM_TERMS', terms })}
            />
          )}
        </div>

        <StatsBadges mapping={state.mapping} />

        <MappingTable
          mapping={state.mapping}
          onToggleEnabled={(original, enabled) =>
            dispatch({ type: 'SET_MAPPING_ENTRY', original, patch: { enabled } })
          }
          onRename={(original, open, name, close) =>
            dispatch({ type: 'RENAME_TOKEN', original, open, name, close })
          }
        />
      </main>

      <Footer />
    </div>
  )
}

export default App
