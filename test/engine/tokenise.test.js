import { describe, expect, it } from 'vitest'
import { tokenise } from '../../src/engine/tokenise.js'

const emptySession = () => ({ mapping: new Map(), reverse: new Map(), counters: {} })

const match = (overrides) => ({
  ruleId: 'ipv4',
  tokenType: 'IP_ADDR',
  start: 0,
  end: 0,
  priority: 110,
  value: '203.0.113.7',
  ...overrides,
})

describe('tokenise', () => {
  it('allocates {{TYPE_1}} on first sight, with count set to occurrences in this run', () => {
    const matches = [match({ start: 0, end: 11 }), match({ start: 20, end: 31 })]
    const { mapping } = tokenise(matches, emptySession())
    const entry = mapping.get('203.0.113.7')
    expect(entry.token).toBe('{{IP_ADDR_1}}')
    expect(entry.count).toBe(2)
    expect(entry.enabled).toBe(true)
  })

  it('numbers distinct values of the same type monotonically', () => {
    const matches = [
      match({ value: '203.0.113.7' }),
      match({ value: '198.51.100.2' }),
    ]
    const { mapping } = tokenise(matches, emptySession())
    expect(mapping.get('203.0.113.7').token).toBe('{{IP_ADDR_1}}')
    expect(mapping.get('198.51.100.2').token).toBe('{{IP_ADDR_2}}')
  })

  it('reuses the existing token for the same value across separate calls (determinism)', () => {
    const session1 = emptySession()
    const { mapping: mapping1, reverse: reverse1, counters: counters1 } = tokenise(
      [match({ value: '203.0.113.7' })],
      session1,
    )
    const session2 = { mapping: mapping1, reverse: reverse1, counters: counters1 }
    const { mapping: mapping2 } = tokenise([match({ value: '203.0.113.7' })], session2)

    expect(mapping2.get('203.0.113.7').token).toBe('{{IP_ADDR_1}}')
    // A second, different value introduced in the later call still gets the next number, not
    // a restart — the counter travelled forward with the session.
    const { mapping: mapping3 } = tokenise(
      [match({ value: '203.0.113.7' }), match({ value: '198.51.100.2' })],
      session2,
    )
    expect(mapping3.get('198.51.100.2').token).toBe('{{IP_ADDR_2}}')
  })

  it('does not mutate the session it was given', () => {
    const session = emptySession()
    tokenise([match({ value: '203.0.113.7' })], session)
    expect(session.mapping.size).toBe(0)
    expect(session.counters).toEqual({})
  })

  it('keeps an existing entry when its value drops out of the current input (append-only)', () => {
    const session1 = emptySession()
    const run1 = tokenise([match({ value: '203.0.113.7' })], session1)

    // Second run's text no longer contains that IP at all.
    const run2 = tokenise([], run1)

    expect(run2.mapping.get('203.0.113.7')).toEqual(run1.mapping.get('203.0.113.7'))
    expect(run2.reverse.get('{{IP_ADDR_1}}')).toBe('203.0.113.7')
  })

  it('preserves a user override (enabled: false) already on an existing entry', () => {
    const session1 = emptySession()
    const run1 = tokenise([match({ value: '203.0.113.7' })], session1)
    run1.mapping.set('203.0.113.7', { ...run1.mapping.get('203.0.113.7'), enabled: false })

    const run2 = tokenise([match({ value: '203.0.113.7' })], run1)
    expect(run2.mapping.get('203.0.113.7').enabled).toBe(false)
  })

  it('allocates <<TYPE_N>> tokens when the angle delimiter is requested', () => {
    const { mapping, reverse } = tokenise([match({ value: '203.0.113.7' })], emptySession(), 'angle')
    expect(mapping.get('203.0.113.7').token).toBe('<<IP_ADDR_1>>')
    expect(reverse.get('<<IP_ADDR_1>>')).toBe('203.0.113.7')
  })

  it('leaves an entry already minted under one delimiter alone when the other is requested later', () => {
    const session1 = emptySession()
    const run1 = tokenise([match({ value: '203.0.113.7' })], session1, 'curly')
    const run2 = tokenise(
      [match({ value: '203.0.113.7' }), match({ value: '198.51.100.2' })],
      run1,
      'angle',
    )
    expect(run2.mapping.get('203.0.113.7').token).toBe('{{IP_ADDR_1}}') // unchanged
    expect(run2.mapping.get('198.51.100.2').token).toBe('<<IP_ADDR_2>>') // new, angle style
  })
})
