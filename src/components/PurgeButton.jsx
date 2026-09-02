import { useState } from 'react'

/**
 * Purge (SPEC.md feature 8 and 15): clears all in-memory state, unrecoverably — it's the only
 * thing that clears the mapping (the lifetime is otherwise append-only). A two-step inline
 * confirmation names exactly what will be lost before committing to it, rather than a native
 * `confirm()` dialog, which can't carry that detail and doesn't match the rest of the UI.
 */
export default function PurgeButton({ mappingSize, onPurge }) {
  const [confirming, setConfirming] = useState(false)

  if (mappingSize === 0) return null // nothing to lose, nothing to confirm

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
        <span className="text-text-dim">
          {mappingSize} mapping{mappingSize === 1 ? '' : 's'} — you won't be able to re-hydrate
          after this.
        </span>
        <button
          type="button"
          onClick={() => {
            onPurge()
            setConfirming(false)
          }}
          className="rounded-[3px] bg-accent px-3 py-1 font-semibold text-bg hover:bg-accent-hover"
        >
          Confirm purge
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-text-faint hover:text-text-muted"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-[3px] border border-border-soft px-3 py-[6px] font-mono text-[13px] text-text-muted hover:border-accent hover:text-accent"
    >
      Purge
    </button>
  )
}
