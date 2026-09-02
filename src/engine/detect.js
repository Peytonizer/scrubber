/**
 * The first stage of the pipeline described in SPEC.md:
 *   detect(text, enabledRules) -> resolveOverlaps(matches) -> tokenise(...) -> redact(...)
 *
 * Runs every enabled rule over `text` and returns every match found, in no particular order —
 * `overlap.js` is what makes the eventual order and winner-picking deterministic.
 */
export function detect(text, enabledRules) {
  const matches = []
  for (const rule of enabledRules) {
    if (rule.detect) {
      matches.push(...rule.detect(text))
      continue
    }
    for (const m of text.matchAll(rule.pattern)) {
      const match = extractMatch(rule, m)
      if (!match) continue
      if (rule.validate && !rule.validate(match.value)) continue
      matches.push(match)
    }
  }
  return matches
}

/**
 * Turns one regex match into a Match. When `captureGroup` is set, the span is the group's own
 * start/end (not the whole match's) so surrounding structure — a file path, a URL — survives
 * in the output. Reading a group's span requires the regex to carry the `d` (hasIndices) flag;
 * every rule with a `captureGroup` in rules.js has it.
 */
function extractMatch(rule, m) {
  if (rule.captureGroup) {
    const span = m.indices?.[rule.captureGroup]
    if (!span) return null // the group didn't participate in this particular match
    return {
      ruleId: rule.id,
      tokenType: rule.tokenType,
      start: span[0],
      end: span[1],
      value: m[rule.captureGroup],
      priority: rule.priority,
    }
  }
  return {
    ruleId: rule.id,
    tokenType: rule.tokenType,
    start: m.index,
    end: m.index + m[0].length,
    value: m[0],
    priority: rule.priority,
  }
}
