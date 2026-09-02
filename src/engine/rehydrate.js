/**
 * Replaces every known token in `text` with its original value — the reverse of `redact`, per
 * SPEC.md's re-hydration section. Matches tolerantly (stray whitespace inside the braces is
 * ignored) because a model's reply sometimes adds it, or wraps a placeholder in backticks,
 * even though it rarely changes the token text itself. Recognises both delimiter styles
 * tokenise.js can produce — `{{TYPE_N}}` and the `<<TYPE_N>>` collision escape hatch — since a
 * session can easily have minted tokens in either style at different points.
 *
 * Returns both the restored text and the list of tokens found that aren't in `reverseMap`.
 * SPEC.md requires those to be left alone in the output *and* reported, rather than letting a
 * partial restore look like a complete one — see the warning-strip feature. `unknownTokens`
 * lists every occurrence, not deduplicated, so "3 unknown tokens" means three places in the
 * text, not three distinct names; the caller can dedupe for display if it wants a different
 * count.
 */
const TOKEN_PATTERN = /\{\{\s*([A-Z0-9_]+)\s*\}\}|<<\s*([A-Z0-9_]+)\s*>>/g

export function rehydrate(text, reverseMap) {
  const unknownTokens = []
  const restored = text.replace(TOKEN_PATTERN, (whole, curlyInner, angleInner) => {
    const isAngle = angleInner !== undefined
    const inner = isAngle ? angleInner : curlyInner
    const normalised = isAngle ? `<<${inner}>>` : `{{${inner}}}`
    const original = reverseMap.get(normalised)
    if (original === undefined) {
      unknownTokens.push(normalised)
      return whole // leave the unrecognised token exactly as found
    }
    return original
  })
  return { text: restored, unknownTokens }
}
