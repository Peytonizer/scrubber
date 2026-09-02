import RazorMark from './RazorMark'
import StatusGrid from './StatusGrid'

/**
 * The noradz nav, repurposed: mark + wordmark on the left; the mode toggle and purge button
 * will take the right side once the session store exists (stages 5 and 7). The status grid
 * stays there in the meantime as the reload-loses-state reminder described in SPEC.md.
 */
export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-7 max-[900px]:px-8 min-[901px]:px-[72px]">
      <div className="flex items-center gap-[10px] font-mono text-[15px] tracking-[0.14em]">
        <RazorMark />
        <span>SCRUBBER</span>
      </div>
      <StatusGrid />
    </header>
  )
}
