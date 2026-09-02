import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detect } from '../../src/engine/detect.js'
import { redact } from '../../src/engine/redact.js'
import { rehydrate } from '../../src/engine/rehydrate.js'
import { resolveOverlaps } from '../../src/engine/overlap.js'
import { rules } from '../../src/engine/rules.js'
import { tokenise } from '../../src/engine/tokenise.js'

describe('rehydrate', () => {
  it('restores a known token to its original value', () => {
    const reverse = new Map([['{{IP_ADDR_1}}', '203.0.113.7']])
    const { text, unknownTokens } = rehydrate('host {{IP_ADDR_1}} responded', reverse)
    expect(text).toBe('host 203.0.113.7 responded')
    expect(unknownTokens).toEqual([])
  })

  it('tolerates extra whitespace inside the braces', () => {
    const reverse = new Map([['{{IP_ADDR_1}}', '203.0.113.7']])
    const { text } = rehydrate('host {{ IP_ADDR_1 }} responded', reverse)
    expect(text).toBe('host 203.0.113.7 responded')
  })

  it('leaves an unknown token unchanged and reports it', () => {
    const reverse = new Map()
    const { text, unknownTokens } = rehydrate('see {{IP_ADDR_1}} here', reverse)
    expect(text).toBe('see {{IP_ADDR_1}} here')
    expect(unknownTokens).toEqual(['{{IP_ADDR_1}}'])
  })

  it('reports one entry per occurrence, not deduplicated', () => {
    const reverse = new Map()
    const { unknownTokens } = rehydrate('{{X_1}} and {{X_1}} again', reverse)
    expect(unknownTokens).toEqual(['{{X_1}}', '{{X_1}}'])
  })

  it('restores a token even when a model wraps it in backticks', () => {
    const reverse = new Map([['{{IP_ADDR_1}}', '203.0.113.7']])
    const { text } = rehydrate('host `{{IP_ADDR_1}}` responded', reverse)
    expect(text).toBe('host `203.0.113.7` responded')
  })
})

describe('round trip', () => {
  it('redacting a fixture then rehydrating the result reproduces the original exactly', () => {
    const original = readFileSync(new URL('../fixtures/mixed-log.txt', import.meta.url), 'utf8')
    const session = { mapping: new Map(), reverse: new Map(), counters: {} }

    const matches = resolveOverlaps(detect(original, rules))
    const { mapping, reverse } = tokenise(matches, session)
    const redacted = redact(original, matches, mapping)

    // Sanity check: something was actually found and replaced.
    expect(redacted).not.toBe(original)
    expect(redacted).toMatch(/\{\{[A-Z0-9_]+\}\}/)

    const { text: restored, unknownTokens } = rehydrate(redacted, reverse)
    expect(unknownTokens).toEqual([])
    expect(restored).toBe(original)
  })
})
