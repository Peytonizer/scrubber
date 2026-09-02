/**
 * Splices each resolved match's token into `text`, per SPEC.md's pipeline:
 *   detect -> resolveOverlaps -> tokenise -> redact(text, resolvedMatches, mapping)
 *
 * `mapping` (from tokenise) supplies each match's token and whether it's still enabled — a row
 * the user disabled in the mapping inspector (a false positive) is left alone in the output.
 * Walks the matches back-to-front so replacing one span doesn't shift the offsets of matches
 * still to come.
 */
export function redact(text, resolvedMatches, mapping) {
  const backToFront = [...resolvedMatches].sort((a, b) => b.start - a.start)

  let result = text
  for (const match of backToFront) {
    const entry = mapping.get(match.value)
    if (!entry || !entry.enabled) continue
    result = result.slice(0, match.start) + entry.token + result.slice(match.end)
  }
  return result
}
