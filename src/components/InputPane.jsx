/**
 * The editable pane: raw text in de-identify mode, a pasted model reply in re-hydrate mode.
 * `label` swaps with the session's mode so the pane always reads as "what you paste" — see
 * SPEC.md's component-mapping notes (mono eyebrow header with a counter on the right, the
 * `.card` treatment for the body).
 */
export default function InputPane({ label, value, onChange }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text">
          {label}
        </h2>
        <span className="font-mono text-[12px] text-text-faintest">
          {value.length.toLocaleString()} chars
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="Paste text here…"
        className="min-h-0 flex-1 resize-none rounded border border-border bg-surface p-4 font-mono text-[13px] leading-relaxed text-text placeholder:text-text-faintest focus:border-border-soft focus:outline-none"
      />
    </section>
  )
}
