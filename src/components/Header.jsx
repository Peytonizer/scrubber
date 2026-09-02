import { SlidersHorizontal } from 'lucide-react'
import ModeToggle from './ModeToggle'
import PurgeButton from './PurgeButton'
import RazorMark from './RazorMark'
import StatusGrid from './StatusGrid'

/**
 * The noradz nav, repurposed: mark + wordmark on the left; the mode toggle, the rule-drawer
 * toggle and the purge button on the right (the purge button hides itself when there's nothing
 * to purge). The status grid lights up once the mapping is non-empty — the reload-loses-state
 * reminder from SPEC.md.
 */
export default function Header({
  mode,
  onModeChange,
  mappingSize,
  drawerOpen,
  onToggleDrawer,
  onPurge,
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-7 max-[900px]:px-8 min-[901px]:px-[72px]">
      <div className="flex items-center gap-[10px] font-mono text-[15px] tracking-[0.14em]">
        <RazorMark />
        <span>SCRUBBER</span>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <PurgeButton mappingSize={mappingSize} onPurge={onPurge} />
        <ModeToggle mode={mode} onChange={onModeChange} />
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-pressed={drawerOpen}
          aria-label="Toggle rule drawer"
          title="Rules"
          className={`rounded-[3px] border p-[6px] transition-colors ${
            drawerOpen
              ? 'border-accent text-accent'
              : 'border-border-soft text-text-muted hover:text-text'
          }`}
        >
          <SlidersHorizontal size={16} strokeWidth={1.6} />
        </button>
        <StatusGrid active={mappingSize > 0} />
      </div>
    </header>
  )
}
