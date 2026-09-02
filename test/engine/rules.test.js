/**
 * One positive and one negative case per rule, as required by SPEC.md's build order for this
 * stage. Every fixture value is fabricated — see CLAUDE.md's "Test data" rule: AWS-style keys
 * use the `...EXAMPLE` suffix, IPs come from the RFC 5737 documentation ranges, domains are
 * `example.com`, and the credit-card number is the standard published test Visa number.
 *
 * `fixtures` is keyed by rule id and checked against `rules` below so a rule can't be added to
 * rules.js without a fixture also being added here.
 */
import { describe, expect, it } from 'vitest'
import { detect } from '../../src/engine/detect.js'
import { rules } from '../../src/engine/rules.js'

const fixtures = {
  'aws-arn': {
    match: 'Role: arn:aws:iam::123456789012:role/example-role',
    expectedValue: 'arn:aws:iam::123456789012:role/example-role',
    noMatch: 'Role: not-an-arn-string',
  },
  'azure-resource-id': {
    match:
      '/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/example-rg/providers/Microsoft.Compute/virtualMachines/example-vm',
    expectedValue:
      '/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/example-rg/providers/Microsoft.Compute/virtualMachines/example-vm',
    noMatch: '/subscriptions/too-short/resourceGroups/x',
  },
  'aws-access-key': {
    match: 'key: AKIAIOSFODNN7EXAMPLE',
    expectedValue: 'AKIAIOSFODNN7EXAMPLE',
    noMatch: 'key: AKIA123SHORT',
  },
  'gcp-service-account': {
    match: 'example-sa@example-project.iam.gserviceaccount.com',
    expectedValue: 'example-sa@example-project.iam.gserviceaccount.com',
    noMatch: 'someone@example.com',
  },
  's3-uri': {
    match: 's3://example-bucket/path/to/object',
    expectedValue: 's3://example-bucket/path/to/object',
    noMatch: 'https://example.com/path/to/object',
  },
  's3-vhost': {
    match: 'https://example-bucket.s3.amazonaws.com/key',
    expectedValue: 'example-bucket.s3.amazonaws.com',
    noMatch: 'https://example-bucket.storage.example.com/key',
  },
  guid: {
    match: 'id: 550e8400-e29b-41d4-a716-446655440000',
    expectedValue: '550e8400-e29b-41d4-a716-446655440000',
    noMatch: 'id: not-a-guid-value',
  },
  'gcp-project-id': {
    match: 'project_id: example-project-1',
    expectedValue: 'example-project-1',
    noMatch: 'no project reference here',
  },
  'aws-account-id': {
    match: 'Account: 123456789012 done',
    expectedValue: '123456789012',
    noMatch: 'Order number 12345',
  },
  'k8s-context': {
    match: 'context: example-cluster-prod',
    expectedValue: 'example-cluster-prod',
    noMatch: 'no keyword here',
  },
  'url-secret-param': {
    match: 'https://example.com/path?token=abc123XYZ',
    expectedValue: 'abc123XYZ',
    noMatch: 'https://example.com/path?foo=bar',
  },
  'unix-home-path': {
    match: '/home/alice/logs/app.log',
    expectedValue: 'alice',
    noMatch: '/var/log/app.log',
  },
  'windows-user-path': {
    match: 'C:\\Users\\alice\\Documents',
    expectedValue: 'alice',
    noMatch: 'C:\\Program Files\\App',
  },
  'ssh-target': {
    match: 'ssh alice@203.0.113.7',
    expectedValue: 'alice',
    noMatch: 'ssh 203.0.113.7',
  },
  'kv-username': {
    match: 'username: alice',
    expectedValue: 'alice',
    noMatch: 'no keyword here',
  },
  'windows-domain-user': {
    match: 'CORP\\jsmith',
    expectedValue: 'jsmith',
    noMatch: 'no domain user here',
  },
  ipv6: {
    match: 'connect to 2001:db8::1 now',
    expectedValue: '2001:db8::1',
    noMatch: 'localhost:8080',
  },
  ipv4: {
    match: 'host 203.0.113.7 responded',
    expectedValue: '203.0.113.7',
    noMatch: 'version 10.20.30 released',
  },
  'mac-address': {
    match: 'mac 00:1A:2B:3C:4D:5E seen',
    expectedValue: '00:1A:2B:3C:4D:5E',
    noMatch: 'mac 00:1A:2B:3C:4D seen',
  },
  'internal-domain': {
    match: 'connecting to db01.prod.internal',
    expectedValue: 'db01.prod.internal',
    noMatch: 'connecting to example.com',
  },
  'private-key-block': {
    match: '-----BEGIN PRIVATE KEY-----\nMIIExampleBase64Body==\n-----END PRIVATE KEY-----',
    expectedValue: '-----BEGIN PRIVATE KEY-----\nMIIExampleBase64Body==\n-----END PRIVATE KEY-----',
    noMatch: 'no key block here',
  },
  jwt: {
    match: 'token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc2lzbm90YXJlYWxzaWc',
    expectedValue: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc2lzbm90YXJlYWxzaWc',
    noMatch: 'not.a.jwt',
  },
  'bearer-token': {
    match: 'Authorization: Bearer abcDEF1234567890123456==',
    expectedValue: 'abcDEF1234567890123456==',
    noMatch: 'Authorization: Basic shortvalue',
  },
  'github-token': {
    match: 'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz',
    expectedValue: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
    noMatch: 'token: ghp_short',
  },
  'gitlab-token': {
    match: 'token: glpat-1234567890abcdefghij',
    expectedValue: 'glpat-1234567890abcdefghij',
    noMatch: 'token: glpat-short',
  },
  'slack-token': {
    match: 'token: xoxb-1234567890-abcdefghij',
    expectedValue: 'xoxb-1234567890-abcdefghij',
    noMatch: 'token: xoxb-short',
  },
  'google-api-key': {
    match: 'key: AIzaSyDABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
    expectedValue: 'AIzaSyDABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
    noMatch: 'key: AIzaShort',
  },
  'stripe-key': {
    match: 'key: sk_test_1234567890abcdef',
    expectedValue: 'sk_test_1234567890abcdef',
    noMatch: 'key: sk_test_short',
  },
  'llm-api-key': {
    match: 'key: sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
    expectedValue: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
    noMatch: 'key: sk-short',
  },
  'azure-storage-conn': {
    // The rule's pattern stops at AccountKey's value (see rules.js) — any fields after it,
    // such as EndpointSuffix, are outside the match, so the fixture doesn't include one.
    match: 'DefaultEndpointsProtocol=https;AccountName=example;AccountKey=abcd1234==;',
    expectedValue: 'DefaultEndpointsProtocol=https;AccountName=example;AccountKey=abcd1234==;',
    noMatch: 'DefaultEndpointsProtocol=https',
  },
  'npmrc-token': {
    match: '_authToken=abcDEF123456',
    expectedValue: 'abcDEF123456',
    noMatch: 'authToken=abcDEF123456',
  },
  'high-entropy': {
    match: 'secret: aB3xQ9zK7mN2pL5vR8tY1uI4oP6sD0fG',
    expectedValue: 'aB3xQ9zK7mN2pL5vR8tY1uI4oP6sD0fG',
    noMatch: 'secret: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
  email: {
    match: 'contact alice@example.com please',
    expectedValue: 'alice@example.com',
    noMatch: 'contact not an email please',
  },
  'credit-card': {
    match: 'card 4111111111111111 on file',
    expectedValue: '4111111111111111',
    noMatch: 'card 1234567890123456 on file',
  },
  'phone-e164': {
    match: 'call +14155552671 now',
    expectedValue: '+14155552671',
    noMatch: 'call 4155552671 now',
  },
  'phone-au': {
    match: 'call 0412345678 now',
    expectedValue: '0412345678',
    noMatch: 'call 12345 now',
  },
}

// connection-string is a `detect`-function rule that emits two differently-typed matches from
// one input, so it doesn't fit the single value/tokenType shape this table checks. It has its
// own describe block below instead.
const EXEMPT_FROM_TABLE = ['connection-string']

describe('rule fixtures', () => {
  it('has a fixture for every non-exempt rule, and no orphaned fixtures', () => {
    const ruleIds = rules.map((r) => r.id).filter((id) => !EXEMPT_FROM_TABLE.includes(id)).sort()
    const fixtureIds = Object.keys(fixtures).sort()
    expect(fixtureIds).toEqual(ruleIds)
  })

  for (const rule of rules.filter((r) => !EXEMPT_FROM_TABLE.includes(r.id))) {
    const fixture = fixtures[rule.id]

    it(`${rule.id}: matches its positive fixture`, () => {
      const matches = detect(fixture.match, [rule])
      expect(matches).toHaveLength(1)
      expect(matches[0].value).toBe(fixture.expectedValue)
      expect(matches[0].tokenType).toBe(rule.tokenType)
    })

    it(`${rule.id}: does not match its negative fixture`, () => {
      expect(detect(fixture.noMatch, [rule])).toHaveLength(0)
    })
  }
})

describe('validated rules reject a pattern match that fails the heuristic', () => {
  it('ipv4 rejects an out-of-range octet', () => {
    const rule = rules.find((r) => r.id === 'ipv4')
    expect(detect('host 999.999.999.999 responded', [rule])).toHaveLength(0)
  })

  it('ipv6 rejects a candidate with the wrong group count', () => {
    const rule = rules.find((r) => r.id === 'ipv6')
    expect(detect('aaaa:bbbb:cccc:dddd:eeee:ffff:1111:2222:3333', [rule])).toHaveLength(0)
  })

  it('credit-card rejects a number that fails the Luhn check', () => {
    const rule = rules.find((r) => r.id === 'credit-card')
    expect(detect('card 1234567890123456 on file', [rule])).toHaveLength(0)
  })

  it('high-entropy rejects a low-entropy string of the same length and charset', () => {
    const rule = rules.find((r) => r.id === 'high-entropy')
    expect(detect('secret: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', [rule])).toHaveLength(0)
  })
})

describe('connection-string (detect function, two token types from one match)', () => {
  it('emits a USER match and a PASSWORD match', () => {
    const rule = rules.find((r) => r.id === 'connection-string')
    const matches = detect('postgres://alice:s3cr3tPW@db.example.com:5432/mydb', [rule])
    expect(matches).toHaveLength(2)
    const user = matches.find((m) => m.tokenType === 'USER')
    const password = matches.find((m) => m.tokenType === 'PASSWORD')
    expect(user.value).toBe('alice')
    expect(password.value).toBe('s3cr3tPW')
  })

  it('emits nothing when the URL has no credentials', () => {
    const rule = rules.find((r) => r.id === 'connection-string')
    expect(detect('postgres://db.example.com:5432/mydb', [rule])).toHaveLength(0)
  })
})
