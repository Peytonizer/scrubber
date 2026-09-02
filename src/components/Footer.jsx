/**
 * The noradz footer, reduced to its one line: no `© noradz` on the right, since Scrubber
 * states its own guarantee instead. "nothing here leaves the page" is the noradz lore line
 * ("nothing here is spilled") adapted to state the privacy claim directly — see SPEC.md's
 * component-mapping notes.
 */
export default function Footer() {
  return (
    <footer className="border-t border-border px-8 py-8 max-[900px]:px-8 min-[901px]:px-[72px]">
      <p className="m-0 font-mono text-[11px] tracking-[0.08em] text-text-faintest">
        nothing here leaves the page
      </p>
    </footer>
  )
}
