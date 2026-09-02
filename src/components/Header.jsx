import ModeToggle from './ModeToggle'
import RazorMark from './RazorMark'
import StatusGrid from './StatusGrid'

/**
 * The noradz nav, repurposed: mark + wordmark on the left; the mode toggle on the right, with
 * the purge button to join it once the mapping inspector exists (stage 7). The status grid
 * lights up once the mapping is non-empty — the reload-loses-state reminder from SPEC.md.
 */
export default function Header({ mode, onModeChange, mappingNonEmpty }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-7 max-[900px]:px-8 min-[901px]:px-[72px]">
      <div className="flex items-center gap-[10px] font-mono text-[15px] tracking-[0.14em]">
        <RazorMark />
        <span>SCRUBBER</span>
      </div>
      <div className="flex items-center gap-5">
        <ModeToggle mode={mode} onChange={onModeChange} />
        <StatusGrid active={mappingNonEmpty} />
      </div>
    </header>
  )
}
