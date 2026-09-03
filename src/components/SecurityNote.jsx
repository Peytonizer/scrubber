import { ChevronDown, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

/**
 * States the privacy guarantee on the page itself, not just in the README — and points at the
 * mechanism that enforces each claim rather than just asserting it, so a sceptical user can
 * check for themselves. Expanded by default: this is the whole reason to trust the tool with
 * secrets, so it earns first billing above the panes rather than being a footnote. Collapses
 * to one line for anyone who's already satisfied and wants the vertical space back — there's
 * nowhere to remember that choice (no persistence, by design), so it opens the same way on
 * every reload, which re-lands the point each session rather than losing it to a stored
 * preference.
 */
export default function SecurityNote() {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded border border-border bg-surface px-4 py-3 font-mono text-[12px]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left text-text-muted"
      >
        <ShieldCheck size={14} strokeWidth={1.6} className="shrink-0 text-accent" />
        <span className="flex-1">Nothing you paste here ever leaves this page</span>
        <ChevronDown
          size={14}
          strokeWidth={1.6}
          className={`shrink-0 text-text-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-text-faint">
          <li>
            <span className="text-text-dim">No network calls, ever.</span> Enforced by this
            page's Content-Security-Policy (<code className="text-text-muted">connect-src
            'none'</code>), not just promised — open dev tools and watch the Network tab stay
            empty while you use it.
          </li>
          <li>
            <span className="text-text-dim">No CDN.</span> Fonts, icons and code are bundled
            into this page at build time. There's nowhere else for it to load from.
          </li>
          <li>
            <span className="text-text-dim">Nothing is stored.</span> No localStorage, no
            cookies, no server. The mapping — the only record of what got redacted — lives in
            this tab's memory alone. Reload the page and it's gone for good.
          </li>
        </ul>
      )}
    </div>
  )
}
