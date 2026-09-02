import { describe, expect, it } from 'vitest'
import { detect } from '../../src/engine/detect.js'
import { redact } from '../../src/engine/redact.js'
import { resolveOverlaps } from '../../src/engine/overlap.js'
import { rules } from '../../src/engine/rules.js'
import { tokenise } from '../../src/engine/tokenise.js'

const emptySession = () => ({ mapping: new Map(), reverse: new Map(), counters: {} })

/** Runs the full detect -> resolveOverlaps -> tokenise -> redact pipeline once. */
function run(text, enabledRules, session = emptySession()) {
  const matches = resolveOverlaps(detect(text, enabledRules))
  const { mapping, reverse, counters } = tokenise(matches, session)
  const output = redact(text, matches, mapping)
  return { output, session: { mapping, reverse, counters } }
}

describe('redact', () => {
  it('replaces a single match with its token', () => {
    const rule = rules.find((r) => r.id === 'ipv4')
    const { output } = run('host 203.0.113.7 responded', [rule])
    expect(output).toBe('host {{IP_ADDR_1}} responded')
  })

  it('replaces the same value with the same token everywhere it appears', () => {
    const rule = rules.find((r) => r.id === 'ipv4')
    const { output } = run('203.0.113.7 pinged 203.0.113.7 again', [rule])
    expect(output).toBe('{{IP_ADDR_1}} pinged {{IP_ADDR_1}} again')
  })

  it('a captureGroup rule leaves the surrounding structure intact', () => {
    const rule = rules.find((r) => r.id === 'unix-home-path')
    const { output } = run('/home/alice/logs/app.log', [rule])
    expect(output).toBe('/home/{{USER_1}}/logs/app.log')
  })

  it('splices several non-overlapping matches back-to-front without corrupting offsets', () => {
    const ipRule = rules.find((r) => r.id === 'ipv4')
    const userRule = rules.find((r) => r.id === 'kv-username')
    const { output } = run('user: alice connected from 203.0.113.7 then 198.51.100.2', [
      ipRule,
      userRule,
    ])
    expect(output).toBe('user: {{USER_1}} connected from {{IP_ADDR_1}} then {{IP_ADDR_2}}')
  })

  it('leaves a disabled mapping entry unredacted (a false positive turned off)', () => {
    const rule = rules.find((r) => r.id === 'ipv4')
    const session = emptySession()
    const matches = resolveOverlaps(detect('host 203.0.113.7 responded', [rule]))
    const { mapping } = tokenise(matches, session)
    mapping.set('203.0.113.7', { ...mapping.get('203.0.113.7'), enabled: false })

    const output = redact('host 203.0.113.7 responded', matches, mapping)
    expect(output).toBe('host 203.0.113.7 responded')
  })

  it('is deterministic across separate pipeline runs sharing one session', () => {
    const rule = rules.find((r) => r.id === 'ipv4')
    const first = run('host 203.0.113.7 responded', [rule])
    const second = run('still see 203.0.113.7 here', [rule], first.session)
    expect(second.output).toBe('still see {{IP_ADDR_1}} here')
  })
})
