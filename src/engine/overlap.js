/**
 * Resolves overlapping matches, per SPEC.md's pipeline: sort by `start` ascending, then
 * `priority` descending, then length descending, and walk the list greedily, keeping a match
 * only if it doesn't overlap one already kept.
 *
 * This is why the priority table in rules.js matters: it decides which rule owns a contested
 * span. An AWS ARN contains a 12-digit account ID — redacting them independently would produce
 * a nested token that can't be reversed unambiguously, so the higher-priority `aws-arn` rule
 * wins the whole span and the lower-priority `aws-account-id` match inside it is dropped.
 *
 * Each Match carries its rule's `priority` directly (attached in detect.js) rather than this
 * function looking it up from a separate rules list — SPEC.md's pipeline signature is
 * `resolveOverlaps(matches)`, matches only, so the priority has to travel on the match itself.
 */
export function resolveOverlaps(matches) {
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    if (a.priority !== b.priority) return b.priority - a.priority
    return b.end - b.start - (a.end - a.start)
  })

  const kept = []
  let lastEnd = -1
  for (const match of sorted) {
    if (match.start < lastEnd) continue // overlaps a higher-priority match already kept
    kept.push(match)
    lastEnd = match.end
  }
  return kept
}
