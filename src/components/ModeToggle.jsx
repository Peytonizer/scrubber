const MODES = [
  { value: 'deidentify', label: 'De-identify' },
  { value: 'rehydrate', label: 'Re-hydrate' },
]

/**
 * The single toggle that switches which direction the panes run in (SPEC.md feature 1). A
 * two-segment control rather than a checkbox, since "de-identify" and "re-hydrate" are two
 * named states, not an on/off.
 */
export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-[3px] border border-border-soft font-mono text-[13px]" role="group" aria-label="Mode">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={mode === value}
          className={`px-3 py-[6px] transition-colors ${
            mode === value ? 'bg-accent font-semibold text-bg' : 'text-text-muted hover:text-text'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
