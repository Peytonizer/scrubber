/**
 * The noradz 3x3 status-dot grid, repurposed: on noradz it's a static "live" indicator, always
 * lit. Here it lights up only when `active` — i.e. when the session's mapping is non-empty —
 * which doubles as a reminder that there is state in memory to lose on reload. `active` is
 * always false until the session store lands in a later stage.
 */
export default function StatusGrid({ active = false }) {
  return (
    <div
      className="grid grid-cols-3 grid-rows-3 gap-[2px]"
      role="presentation"
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={`h-[3px] w-[3px] rounded-full transition-colors duration-300 ${
            active ? 'bg-accent shadow-[0_0_3px_#d1293d]' : 'bg-border-soft'
          }`}
        />
      ))}
    </div>
  )
}
