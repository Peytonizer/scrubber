import { describe, expect, it } from 'vitest'
import {
  isIPv4,
  isIPv6,
  isValidAbn,
  isValidMedicare,
  isValidTfn,
  luhn,
  shannonEntropy,
} from '../../src/engine/heuristics.js'

describe('isIPv4', () => {
  it('accepts a valid dotted-quad address', () => {
    expect(isIPv4('203.0.113.7')).toBe(true)
  })
  it('rejects an octet over 255', () => {
    expect(isIPv4('999.999.999.999')).toBe(false)
  })
  it('rejects the wrong number of segments', () => {
    expect(isIPv4('203.0.113')).toBe(false)
  })
})

describe('isIPv6', () => {
  it('accepts the full 8-group form', () => {
    expect(isIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(true)
  })
  it('accepts a :: compressed form', () => {
    expect(isIPv6('2001:db8::1')).toBe(true)
  })
  it('accepts an embedded trailing IPv4', () => {
    expect(isIPv6('::ffff:192.0.2.1')).toBe(true)
  })
  it('rejects more than one ::', () => {
    expect(isIPv6('2001::db8::1')).toBe(false)
  })
  it('rejects the wrong group count with no ::', () => {
    expect(isIPv6('aaaa:bbbb:cccc:dddd:eeee:ffff:1111:2222:3333')).toBe(false)
  })
  it('rejects a group with invalid hex digits', () => {
    expect(isIPv6('gggg::1')).toBe(false)
  })
})

describe('luhn', () => {
  it('accepts a well-known test card number', () => {
    expect(luhn('4111111111111111')).toBe(true)
  })
  it('rejects a number that fails the checksum', () => {
    expect(luhn('1234567890123456')).toBe(false)
  })
})

describe('isValidTfn', () => {
  it('accepts the ATO published worked example (123 456 782)', () => {
    expect(isValidTfn('123456782')).toBe(true)
  })
  it('rejects a checksum failure', () => {
    expect(isValidTfn('123456781')).toBe(false)
  })
  it('rejects the wrong number of digits', () => {
    expect(isValidTfn('12345678')).toBe(false)
  })
})

describe('isValidMedicare', () => {
  it('accepts a number with a correct check digit', () => {
    expect(isValidMedicare('2123456701')).toBe(true)
  })
  it('rejects a wrong check digit', () => {
    expect(isValidMedicare('2123456711')).toBe(false)
  })
  it('rejects the wrong number of digits', () => {
    expect(isValidMedicare('212345670')).toBe(false)
  })
})

describe('isValidAbn', () => {
  it('accepts a well-known valid ABN (51 824 753 556)', () => {
    expect(isValidAbn('51824753556')).toBe(true)
  })
  it('rejects a checksum failure', () => {
    expect(isValidAbn('51824753557')).toBe(false)
  })
  it('rejects the wrong number of digits', () => {
    expect(isValidAbn('5182475355')).toBe(false)
  })
})

describe('shannonEntropy', () => {
  it('is zero for a repeated character', () => {
    expect(shannonEntropy('aaaaaaaa')).toBe(0)
  })
  it('is high for a random-looking string', () => {
    expect(shannonEntropy('aB3xQ9zK7mN2pL5v')).toBeGreaterThan(3.5)
  })
})
