import { describe, expect, it } from 'vitest'
import { detect } from '../../src/engine/detect.js'
import { resolveOverlaps } from '../../src/engine/overlap.js'
import { rules } from '../../src/engine/rules.js'

const byId = (id) => rules.find((r) => r.id === id)

describe('resolveOverlaps', () => {
  it('lets a higher-priority ARN win over the bare account ID it contains', () => {
    const text = 'Role: arn:aws:iam::123456789012:role/example-role'
    const arnRule = byId('aws-arn')
    const accountRule = byId('aws-account-id')

    const matches = detect(text, [arnRule, accountRule])
    // Sanity check: both rules do find a candidate before resolution.
    expect(matches.some((m) => m.ruleId === 'aws-arn')).toBe(true)
    expect(matches.some((m) => m.ruleId === 'aws-account-id')).toBe(true)

    const resolved = resolveOverlaps(matches)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].ruleId).toBe('aws-arn')
    expect(resolved[0].tokenType).toBe('AWS_ARN')
  })

  it('keeps two matches that do not overlap', () => {
    const text = 'user: alice connected from 203.0.113.7'
    const resolved = resolveOverlaps(detect(text, [byId('kv-username'), byId('ipv4')]))
    expect(resolved).toHaveLength(2)
  })

  it('breaks a tie between equal-priority matches at the same start by length, longest wins', () => {
    const matches = [
      { ruleId: 'a', tokenType: 'A', start: 0, end: 5, value: 'abcde', priority: 100 },
      { ruleId: 'b', tokenType: 'B', start: 0, end: 10, value: 'abcdefghij', priority: 100 },
    ]
    const resolved = resolveOverlaps(matches)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].ruleId).toBe('b')
  })

  it('drops a lower-priority match that overlaps a higher-priority one starting earlier', () => {
    const matches = [
      { ruleId: 'high', tokenType: 'X', start: 0, end: 10, value: '0123456789', priority: 200 },
      { ruleId: 'low', tokenType: 'Y', start: 5, end: 15, value: '56789abcde', priority: 50 },
    ]
    const resolved = resolveOverlaps(matches)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].ruleId).toBe('high')
  })
})
