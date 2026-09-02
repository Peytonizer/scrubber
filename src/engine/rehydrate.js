/**
 * Replaces every known token in `text` with its original value — the reverse of `redact`, per
 * SPEC.md's re-hydration section. Matches tolerantly (`\{\{\s*([A-Z0-9_]+)\s*\}\}`) because a
 * model's reply sometimes adds stray whitespace inside the braces or wraps a placeholder in
 * backticks, even though it rarely changes the token text itself.
 *
 * Returns both the restored text and the list of `{{…}}`-shaped tokens found that aren't in
 * `reverseMap`. SPEC.md requires those to be left alone in the output *and* reported, rather
 * than letting a partial restore look like a complete one — see the warning-strip feature.
 * `unknownTokens` lists every occurrence, not deduplicated, so "3 unknown tokens" means three
 * places in the text, not three distinct names; the caller can dedupe for display if it wants a
 * different count.
 */
export function rehydrate(text, reverseMap) {
  const unknownTokens = []
  const restored = text.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (whole, inner) => {
    const normalised = `{{${inner}}}`
    const original = reverseMap.get(normalised)
    if (original === undefined) {
      unknownTokens.push(normalised)
      return whole // leave the unrecognised token exactly as found
    }
    return original
  })
  return { text: restored, unknownTokens }
}
