/**
 * Validation and scoring helpers for rules in rules.js that a regex alone can't get right.
 * Kept separate from the patterns themselves so each check is unit-testable on its own, and so
 * `rules.js` stays a plain data table.
 */

/**
 * True if `value` is a syntactically valid dotted-quad IPv4 address: four segments, each
 * 0-255. The `ipv4` rule's pattern only checks digit *shape* (`\d{1,3}` per octet), so it also
 * matches strings like `999.999.999.999` — this is the filter that throws those out after the
 * regex has found the candidate. See SPEC.md's network rules table.
 */
export function isIPv4(value) {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false
    return Number(part) <= 255
  })
}

/**
 * True if `value` is a plausible IPv6 address. Deliberately permissive rather than one
 * exhaustive regex (per SPEC.md's network rules table) — it accepts the full 8-group form and
 * the `::`-compressed form, including an embedded trailing IPv4 (e.g. `::ffff:192.0.2.1`), and
 * rejects the obviously malformed cases: more than one `::`, the wrong group count, or a group
 * that isn't 1-4 hex digits. It does not attempt every edge case the IPv6 spec allows (e.g. a
 * leading embedded IPv4 without `::`) — those are rare enough in logs and configs that a false
 * negative here is an acceptable gap, per the noisy-rules trade-off documented in SPEC.md.
 */
export function isIPv6(value) {
  if ((value.match(/::/g) || []).length > 1) return false

  const hasDoubleColon = value.includes('::')
  const [head, tail] = hasDoubleColon ? value.split('::') : [value, '']
  const headGroups = head === '' ? [] : head.split(':')
  const tailGroups = tail === '' ? [] : tail.split(':')

  // An embedded trailing IPv4 (only valid as the last group) counts as two 16-bit groups.
  const lastTailGroup = tailGroups[tailGroups.length - 1]
  const hasEmbeddedIPv4 = lastTailGroup !== undefined && isIPv4(lastTailGroup)
  const hexGroups = hasEmbeddedIPv4
    ? [...headGroups, ...tailGroups.slice(0, -1)]
    : [...headGroups, ...tailGroups]

  if (!hexGroups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return false

  const groupCount = headGroups.length + tailGroups.length + (hasEmbeddedIPv4 ? 1 : 0)
  // `::` stands in for one or more all-zero groups, so the explicit count must be under 8;
  // without it, the address must spell out exactly 8.
  return hasDoubleColon ? groupCount < 8 : groupCount === 8
}

/**
 * Luhn checksum, used to keep the `credit-card` rule from firing on every 13-19 digit run
 * (order numbers, invoice IDs, phone numbers with punctuation stripped). `digits` must already
 * be digits-only — strip separators before calling this.
 */
export function luhn(digits) {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (double) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    double = !double
  }
  return sum % 10 === 0
}

/**
 * Weighted-checksum validators for three Australian government identifiers, in the same spirit
 * as `luhn` above: each keeps its rule in rules.js from matching every digit string of the
 * right length by checking it against the algorithm the issuing agency actually publishes (the
 * ATO for TFN and ABN, Medicare for the card number), rather than shape alone. `digits` must
 * already be digits-only in every case — strip spaces before calling these.
 */

/** Tax File Number: 9 digits, weighted modulus 11. */
export function isValidTfn(digits) {
  if (!/^\d{9}$/.test(digits)) return false
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10]
  const sum = weights.reduce((total, w, i) => total + w * Number(digits[i]), 0)
  return sum % 11 === 0
}

/**
 * Medicare card number: 10 printed digits. The first 9 are an identification number whose 9th
 * digit is a check digit over the first 8 (weighted modulus 10); the 10th is the individual
 * reference number — a person's position on the card — and carries no checksum of its own, so
 * it's accepted here unchecked.
 */
export function isValidMedicare(digits) {
  if (!/^\d{10}$/.test(digits)) return false
  const weights = [1, 3, 7, 9, 1, 3, 7, 9]
  const sum = weights.reduce((total, w, i) => total + w * Number(digits[i]), 0)
  return sum % 10 === Number(digits[8])
}

/**
 * Australian Business Number: 11 digits. Subtract 1 from the first digit, then a weighted
 * modulus 89 over all eleven.
 */
export function isValidAbn(digits) {
  if (!/^\d{11}$/.test(digits)) return false
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const adjusted = digits.split('').map(Number)
  adjusted[0] -= 1
  const sum = weights.reduce((total, w, i) => total + w * adjusted[i], 0)
  return sum % 89 === 0
}

/**
 * Shannon entropy of `value`, in bits per character. The `high-entropy` rule uses this to tell
 * a likely secret (random-looking base64/hex) apart from ordinary words or repeated
 * characters, which length and charset alone can't do.
 */
export function shannonEntropy(value) {
  if (value.length === 0) return 0
  const counts = new Map()
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  let entropy = 0
  for (const count of counts.values()) {
    const p = count / value.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}
