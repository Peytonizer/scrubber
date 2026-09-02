import { describe, expect, it } from 'vitest'
import { detect } from '../../src/engine/detect.js'
import { buildCustomRules, rules } from '../../src/engine/rules.js'

describe('detect', () => {
  it('a captureGroup match spans only the group, leaving the surrounding text intact', () => {
    const rule = rules.find((r) => r.id === 'unix-home-path')
    const text = '/home/alice/logs'
    const [match] = detect(text, [rule])
    expect(match.value).toBe('alice')
    expect(text.slice(match.start, match.end)).toBe('alice')
    // The path structure around the captured span is untouched by the match itself.
    expect(text.slice(0, match.start)).toBe('/home/')
    expect(text.slice(match.end)).toBe('/logs')
  })

  it('runs several rules over the same text and concatenates their matches', () => {
    const text = 'user: alice reached 203.0.113.7'
    const matches = detect(text, [
      rules.find((r) => r.id === 'kv-username'),
      rules.find((r) => r.id === 'ipv4'),
    ])
    expect(matches.map((m) => m.tokenType).sort()).toEqual(['IP_ADDR', 'USER'])
  })

  it('is safe to call twice with the same rule objects (matchAll does not carry state across calls)', () => {
    const rule = rules.find((r) => r.id === 'ipv4')
    const text = 'first 203.0.113.7 then 198.51.100.2'
    const first = detect(text, [rule])
    const second = detect(text, [rule])
    expect(second).toEqual(first)
    expect(first).toHaveLength(2)
  })
})

describe('buildCustomRules', () => {
  it('matches a whole-word alphanumeric term case-insensitively', () => {
    const [rule] = buildCustomRules(['Initech'])
    const matches = detect('Contact someone at INITECH corp about initech-prod', [rule])
    // Both occurrences count: "INITECH" is its own word, and "initech-prod" still matches on
    // the left because a hyphen is a non-word character, so \b holds right before "prod" too.
    expect(matches).toHaveLength(2)
    expect(matches.every((m) => m.tokenType === 'CUSTOM')).toBe(true)
  })

  it('matches a punctuated term as a literal substring', () => {
    const [rule] = buildCustomRules(['db.internal.example'])
    const matches = detect('connect to db.internal.example now', [rule])
    expect(matches).toHaveLength(1)
    expect(matches[0].value).toBe('db.internal.example')
  })

  it('ignores blank entries', () => {
    expect(buildCustomRules(['', '   ', 'real-term'])).toHaveLength(1)
  })

  it('gives every custom rule the highest priority', () => {
    const [rule] = buildCustomRules(['anything'])
    expect(rule.priority).toBe(200)
  })
})
