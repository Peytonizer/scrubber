import { rules } from '../engine/rules.js'
import { CATEGORY_BORDER, CATEGORY_LABEL, CATEGORY_ORDER } from './categoryStyles.js'

const RULE_CATEGORY = Object.fromEntries(rules.map((r) => [r.id, r.category]))
function categoryFor(ruleId) {
  return RULE_CATEGORY[ruleId] ?? 'custom'
}

/**
 * A count of redacted items per category (SPEC.md feature 7), so the user can see at a glance
 * that something was found. Counts only *enabled* entries — a row the user has turned off is a
 * declared false positive, not something currently being redacted.
 */
export default function StatsBadges({ mapping }) {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0]))
  for (const entry of mapping.values()) {
    if (entry.enabled) counts[categoryFor(entry.ruleId)] += 1
  }
  const active = CATEGORY_ORDER.filter((c) => counts[c] > 0)
  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {active.map((category) => (
        <span
          key={category}
          className={`rounded-full border px-[10px] py-[4px] font-mono text-[11px] text-text-muted ${CATEGORY_BORDER[category]}`}
        >
          {CATEGORY_LABEL[category]} {counts[category]}
        </span>
      ))}
    </div>
  )
}
