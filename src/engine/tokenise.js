/**
 * Looks each match's value up in the session's mapping, allocating a new token when the value
 * hasn't been seen before and reusing the existing one when it has — this is the determinism
 * guarantee from SPEC.md's decisions table: the same original value always yields the same
 * token within a session, however many times or wherever it appears.
 *
 * Pure: returns a new `{ mapping, reverse, counters }` rather than mutating `session`, so it's
 * safe to call from a React reducer and easy to test without a store at all. An entry already
 * in `session.mapping` is copied forward untouched if its value doesn't appear in `matches`
 * this run — the mapping lifetime is append-only (SPEC.md), so a value dropping out of the
 * current input must not lose its entry.
 */
export function tokenise(matches, session) {
  const mapping = new Map(session.mapping)
  const reverse = new Map(session.reverse)
  const counters = { ...session.counters }

  // Count each distinct value's occurrences in *this* run, and remember the match that first
  // introduced it (for its tokenType/ruleId), before touching the mapping. A MappingEntry's
  // `count` is "occurrences in the current input" (SPEC.md's data shape), not a tally
  // accumulated across separate pipeline runs.
  const occurrences = new Map() // value -> count
  const firstMatch = new Map() // value -> the match that introduced it
  for (const match of matches) {
    occurrences.set(match.value, (occurrences.get(match.value) ?? 0) + 1)
    if (!firstMatch.has(match.value)) firstMatch.set(match.value, match)
  }

  for (const [value, count] of occurrences) {
    const existing = mapping.get(value)
    if (existing) {
      mapping.set(value, { ...existing, count })
      continue
    }
    const match = firstMatch.get(value)
    const n = (counters[match.tokenType] ?? 0) + 1
    counters[match.tokenType] = n
    const entry = {
      original: value,
      token: `{{${match.tokenType}_${n}}}`,
      tokenType: match.tokenType,
      ruleId: match.ruleId,
      count,
      enabled: true,
    }
    mapping.set(value, entry)
    reverse.set(entry.token, value)
  }

  return { mapping, reverse, counters }
}
