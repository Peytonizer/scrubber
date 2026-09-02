import { useState } from 'react'
import { rules } from '../engine/rules.js'
import { CATEGORY_DOT } from './categoryStyles.js'

const RULE_CATEGORY = Object.fromEntries(rules.map((r) => [r.id, r.category]))
function categoryFor(ruleId) {
  return RULE_CATEGORY[ruleId] ?? 'custom' // custom-term-N ids aren't in the static table
}

/** Splits a token into its delimiter and the editable inner name, e.g. `{{USER_1}}` ->
 * `{ open: '{{', close: '}}', inner: 'USER_1' }`. Works for both delimiter styles. */
function parseToken(token) {
  const open = token.startsWith('<<') ? '<<' : '{{'
  const close = token.startsWith('<<') ? '>>' : '}}'
  return { open, close, inner: token.slice(open.length, -close.length) }
}

/**
 * The mapping inspector (SPEC.md feature 6): a table of original/token pairs with an
 * occurrence count. Each row can be disabled — the original is then left alone in redact.js's
 * output — and each token's name can be renamed in place, rejecting a name that would collide
 * with another entry's current token (silently corrupting re-hydration is exactly the failure
 * mode the round-trip self-check exists to catch, but refusing the collision up front is
 * simpler than explaining that check to a user).
 */
export default function MappingTable({ mapping, onToggleEnabled, onRename }) {
  const entries = [...mapping.values()]
  const [editingOriginal, setEditingOriginal] = useState(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  function startEdit(entry) {
    setEditingOriginal(entry.original)
    setDraft(parseToken(entry.token).inner)
    setError('')
  }

  function commit(entry) {
    const cleaned = draft.toUpperCase().replace(/[^A-Z0-9_]/g, '')
    if (!cleaned) {
      setError('Name required')
      return
    }
    const { open, close } = parseToken(entry.token)
    const newToken = `${open}${cleaned}${close}`
    const collides = entries.some((e) => e.original !== entry.original && e.token === newToken)
    if (collides) {
      setError('Already in use')
      return
    }
    onRename(entry.original, open, cleaned, close)
    setEditingOriginal(null)
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-faint">
        Mapping {entries.length > 0 && `(${entries.length})`}
      </h2>
      {entries.length === 0 ? (
        <div className="rounded border border-border bg-surface px-5 py-4 font-mono text-[12px] text-text-faint">
          Nothing redacted yet — entries appear here as they're found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[520px] border-collapse font-mono text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8" />
                <th className="px-5 py-[14px] text-left text-[11px] font-normal uppercase tracking-[0.08em] text-text-faint">
                  Original
                </th>
                <th className="px-5 py-[14px] text-left text-[11px] font-normal uppercase tracking-[0.08em] text-text-faint">
                  Token
                </th>
                <th className="px-5 py-[14px] text-right text-[11px] font-normal uppercase tracking-[0.08em] text-text-faint">
                  Count
                </th>
                <th className="px-5 py-[14px] text-center text-[11px] font-normal uppercase tracking-[0.08em] text-text-faint">
                  On
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.original} className="border-b border-border last:border-b-0">
                  <td>
                    <span
                      className={`ml-3 inline-block h-2 w-2 rounded-full ${CATEGORY_DOT[categoryFor(entry.ruleId)]}`}
                    />
                  </td>
                  <td
                    className={`max-w-[280px] truncate px-5 py-[14px] ${
                      entry.enabled ? 'text-text' : 'text-text-faintest line-through'
                    }`}
                    title={entry.original}
                  >
                    {entry.original}
                  </td>
                  <td className="px-5 py-[14px]">
                    {editingOriginal === entry.original ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commit(entry)
                            if (e.key === 'Escape') setEditingOriginal(null)
                          }}
                          onBlur={() => commit(entry)}
                          className="w-28 rounded border border-border-soft bg-bg px-2 py-1 text-text focus:border-accent focus:outline-none"
                        />
                        {error && <span className="text-[11px] text-accent">{error}</span>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        title="Rename"
                        className="text-text-dim hover:text-accent"
                      >
                        {entry.token}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-[14px] text-right text-text-faint">{entry.count}</td>
                  <td className="px-5 py-[14px] text-center">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={() => onToggleEnabled(entry.original, !entry.enabled)}
                      className="accent-accent"
                      aria-label={`Include ${entry.original} in redaction`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
