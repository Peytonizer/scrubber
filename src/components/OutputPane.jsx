import { useState } from 'react'

/**
 * The read-only pane: the redacted text in de-identify mode, the restored text in re-hydrate
 * mode. `statusMessage`, when given, replaces the text body with an explicit note — used for
 * the empty state ("No sensitive values found", SPEC.md feature 14) and the oversized-input
 * gate, rather than ever showing unchanged input with no explanation.
 */
export default function OutputPane({ label, value, statusMessage, overThreshold, onScrub }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied by the browser sandbox; there's nothing useful to do
      // beyond leaving the button as-is so the user notices nothing happened.
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text">
          {label}
        </h2>
        <div className="flex items-center gap-3">
          {overThreshold && (
            <button
              type="button"
              onClick={onScrub}
              className="rounded-[3px] bg-accent px-3 py-1 font-mono text-[12px] font-semibold text-bg hover:bg-accent-hover"
            >
              Scrub
            </button>
          )}
          <span className="font-mono text-[12px] text-text-faintest">
            {value.length.toLocaleString()} chars
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={value === ''}
            className="rounded-[3px] bg-accent px-3 py-1 font-mono text-[12px] font-semibold text-bg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy output'}
          </button>
        </div>
      </div>
      {statusMessage ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded border border-border bg-surface p-4 text-center font-mono text-[13px] text-text-faint">
          {statusMessage}
        </div>
      ) : (
        <pre className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-surface p-4 font-mono text-[13px] leading-relaxed text-text">
          {value}
        </pre>
      )}
    </section>
  )
}
