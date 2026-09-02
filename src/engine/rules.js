/**
 * Every detection rule Scrubber ships, in one place. This file is data, not logic — `detect.js`
 * is what actually runs a rule against text. See SPEC.md's "Rules" section for the full table
 * this is transcribed from, including the reasoning behind each priority.
 *
 * A rule is:
 *   {
 *     id,             stable, kebab-case, used as the toggle key in the rule drawer
 *     category,       'cloud' | 'identity' | 'network' | 'secrets' | 'pii'
 *     label,          shown in the rule drawer
 *     tokenType,      UPPER_SNAKE; becomes {{TYPE_N}}
 *     priority,       higher wins a contested span in overlap.js
 *     defaultEnabled, whether the rule starts on
 *     noisy,          true shows a "may over-match" hint in the drawer
 *     pattern,        a global regex (matched with matchAll)…
 *     captureGroup,   …optionally redacting only this group, not the whole match. Any regex
 *                     used with captureGroup carries the `d` (hasIndices) flag so detect.js can
 *                     read the group's own start/end rather than the whole match's.
 *     validate,       optional (value) => boolean run after a regex match, for rules whose
 *                     shape a regex can express but whose *validity* it can't — an IPv4 octet
 *                     range, a Luhn checksum, a minimum entropy. Not in SPEC.md's data shape
 *                     verbatim, but implied by its per-rule notes ("kept only if..."); adding
 *                     the hook here is simpler than forcing those three rules into `detect`
 *                     functions just to express a single boolean filter.
 *     detect,         …or a function (text) => Match[], for rules that emit more than one
 *                     token from a single match (a connection string's user and password).
 *   }
 */

import { isIPv4, isIPv6, luhn, shannonEntropy } from './heuristics.js'

export const rules = [
  // ---------- A. Cloud ----------

  {
    id: 'aws-arn',
    category: 'cloud',
    label: 'AWS ARN',
    tokenType: 'AWS_ARN',
    priority: 140,
    defaultEnabled: true,
    noisy: false,
    // arn:aws:<service>:<region>:<account-id>:<resource>. Highest cloud priority so it wins
    // the span over the bare 12-digit account ID it contains.
    pattern: /arn:aws[a-z0-9-]*:[a-z0-9-]*:[a-z0-9-]*:\d{12}:[^\s"'`,)\]]+/g,
  },
  {
    id: 'azure-resource-id',
    category: 'cloud',
    label: 'Azure resource ID',
    tokenType: 'AZURE_RESOURCE',
    priority: 140,
    defaultEnabled: true,
    noisy: false,
    // /subscriptions/<guid>/resourceGroups/<name>[/providers/...]. Wins over the bare `guid`
    // rule so the subscription ID isn't tokenised separately from its resource path.
    pattern: /\/subscriptions\/[0-9a-fA-F-]{36}\/resourceGroups\/[^/\s]+(?:\/providers\/[^\s"'`,)\]]+)?/gi,
  },
  {
    id: 'aws-access-key',
    category: 'cloud',
    label: 'AWS access key',
    tokenType: 'AWS_KEY',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    // The four AWS key-id prefixes in current use (access, temporary/STS, and two less common
    // internal ones) followed by 16 more base32-ish characters.
    pattern: /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g,
  },
  {
    id: 'gcp-service-account',
    category: 'cloud',
    label: 'GCP service account',
    tokenType: 'GCP_SA',
    priority: 120,
    defaultEnabled: true,
    noisy: false,
    // Must outrank `email` — a service account address is structurally an email address but
    // is a resource identifier, not a person.
    pattern: /\b[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com\b/g,
  },
  {
    id: 's3-uri',
    category: 'cloud',
    label: 'S3 URI',
    tokenType: 'S3_BUCKET',
    priority: 120,
    defaultEnabled: true,
    noisy: false,
    pattern: /s3:\/\/[a-z0-9][a-z0-9.-]{1,61}[a-z0-9](?:\/[^\s"'`]*)?/g,
  },
  {
    id: 's3-vhost',
    category: 'cloud',
    label: 'S3 virtual-host URL',
    tokenType: 'S3_BUCKET',
    priority: 120,
    defaultEnabled: true,
    noisy: false,
    pattern: /\b[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com/g,
  },
  {
    id: 'guid',
    category: 'cloud',
    label: 'GUID',
    tokenType: 'GUID',
    priority: 110,
    defaultEnabled: true,
    noisy: false,
    // Covers Azure subscription and tenant IDs, and any other bare GUID/UUID.
    pattern: /\b[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\b/g,
  },
  {
    id: 'gcp-project-id',
    category: 'cloud',
    label: 'GCP project ID',
    tokenType: 'GCP_PROJECT',
    priority: 100,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    // Contextual: only fires next to a recognisable project-id key/flag, since a bare
    // lowercase-hyphenated word on its own is too common to redact blind.
    pattern: /\b(?:project[_-]?id|--project|set project)\s*[:=]?\s*["']?([a-z][a-z0-9-]{4,28}[a-z0-9])["']?/gid,
  },
  {
    id: 'aws-account-id',
    category: 'cloud',
    label: 'AWS account ID',
    tokenType: 'AWS_ACCOUNT',
    priority: 70,
    defaultEnabled: true,
    // Any bare 12-digit number matches — noisy by design. Kept on by default under the
    // over-redaction principle: a leaked account ID is worth more to an attacker than a
    // redacted order number costs the user. See SPEC.md's decisions table.
    noisy: true,
    pattern: /(?<![\d-])\d{12}(?![\d-])/g,
  },
  {
    id: 'k8s-context',
    category: 'cloud',
    label: 'Kubernetes cluster/context/namespace',
    tokenType: 'K8S_CLUSTER',
    priority: 120,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    // Cluster and namespace names routinely encode the company, environment and region.
    pattern: /\b(?:cluster|context|namespace)\s*[:=]\s*["']?([A-Za-z0-9][A-Za-z0-9._-]{2,62})/gid,
  },
  {
    id: 'url-secret-param',
    category: 'cloud',
    label: 'URL token/secret query parameter',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 2,
    // Redacts only the value, keeping the parameter name (group 1, not captured) so the URL's
    // shape survives. Catches Azure SAS URLs and most signed links.
    pattern: /([?&](?:token|key|api[_-]?key|access[_-]?token|sig|signature|password|secret)=)([^&\s"'#]+)/gid,
  },

  // ---------- B. Identity ----------

  {
    id: 'unix-home-path',
    category: 'identity',
    label: 'Unix home directory user',
    tokenType: 'USER',
    priority: 100,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    pattern: /(?:\/home\/|\/Users\/)([A-Za-z0-9._-]+)/gd,
  },
  {
    id: 'windows-user-path',
    category: 'identity',
    label: 'Windows user directory user',
    tokenType: 'USER',
    priority: 100,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 2,
    pattern: /([A-Za-z]:\\Users\\)([A-Za-z0-9._ -]+)/gd,
  },
  {
    id: 'ssh-target',
    category: 'identity',
    label: 'SSH target user',
    tokenType: 'USER',
    priority: 100,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    pattern: /\bssh\s+(?:-\S+\s+\S+\s+)*([A-Za-z0-9._-]+)@/gd,
  },
  {
    id: 'kv-username',
    category: 'identity',
    label: 'Key-value username',
    tokenType: 'USER',
    priority: 100,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    pattern: /\b(?:user|username|uid|login|owner|author|created_by|db_user)\s*["']?\s*[:=]\s*["']?([A-Za-z0-9._@-]+)/gid,
  },
  {
    id: 'windows-domain-user',
    category: 'identity',
    label: 'Windows domain user',
    tokenType: 'USER',
    priority: 100,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 2,
    // The Active Directory `CORP\jsmith` form. Redacts the username; the domain is caught
    // separately as a custom term if it matters.
    pattern: /\b([A-Z][A-Z0-9-]{1,20})\\([A-Za-z0-9._-]+)\b/gd,
  },
  {
    id: 'connection-string',
    category: 'identity',
    label: 'Connection string credentials',
    tokenType: 'USER', // nominal — this rule actually emits USER and PASSWORD tokens
    priority: 140,
    defaultEnabled: true,
    noisy: false,
    // `scheme://user:password@host`. A `detect` function, not a plain pattern+captureGroup,
    // because one match must emit two differently-typed tokens — the reason the `detect`
    // escape hatch exists at all. Don't try to express this as one regex with one group.
    detect(text) {
      const pattern = /\b([a-z][a-z0-9+.-]*):\/\/([^:@/\s]+):([^@/\s]+)@/gid
      const matches = []
      for (const m of text.matchAll(pattern)) {
        const userSpan = m.indices[2]
        const passwordSpan = m.indices[3]
        matches.push({
          ruleId: 'connection-string',
          tokenType: 'USER',
          start: userSpan[0],
          end: userSpan[1],
          value: m[2],
          priority: 140,
        })
        matches.push({
          ruleId: 'connection-string',
          tokenType: 'PASSWORD',
          start: passwordSpan[0],
          end: passwordSpan[1],
          value: m[3],
          priority: 140,
        })
      }
      return matches
    },
  },

  // ---------- C. Network ----------

  {
    id: 'ipv6',
    category: 'network',
    label: 'IPv6 address',
    tokenType: 'IPV6_ADDR',
    priority: 115,
    defaultEnabled: true,
    noisy: false,
    // Tried before `ipv4` (higher priority) so an embedded-IPv4 form like `::ffff:192.0.2.1`
    // isn't split into a separate IPv4 match. Deliberately loose — it grabs the whole run of
    // hex digits and colons (optionally followed by a dotted IPv4 tail), as long as a colon
    // appears somewhere in it, and leaves the real validation entirely to heuristics.isIPv6.
    // An earlier version tried to spell out the `::`-compression grammar directly in the
    // regex and got it wrong (it matched only the last segment of `2001:db8::1`, for
    // instance) — this is the "permissive pattern plus a real validator" SPEC.md asks for.
    pattern: /\b(?=[0-9a-fA-F:]*:)[0-9a-fA-F:]{2,}(?:\.\d{1,3}){0,3}\b/g,
    validate: (value) => isIPv6(value),
  },
  {
    id: 'ipv4',
    category: 'network',
    label: 'IPv4 address',
    tokenType: 'IP_ADDR',
    priority: 110,
    defaultEnabled: true,
    noisy: false,
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    validate: (value) => isIPv4(value),
  },
  {
    id: 'mac-address',
    category: 'network',
    label: 'MAC address',
    tokenType: 'MAC_ADDR',
    priority: 110,
    defaultEnabled: true,
    noisy: false,
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
  },
  {
    id: 'internal-domain',
    category: 'network',
    label: 'Internal hostname',
    tokenType: 'HOSTNAME',
    priority: 90,
    defaultEnabled: true,
    noisy: false,
    // Domains under a suffix that only resolves inside a private network. Users can add more
    // suffixes as custom terms.
    pattern: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:local|internal|corp|lan|intranet|home\.arpa)\b/gi,
  },

  // ---------- D. Secrets ----------

  {
    id: 'private-key-block',
    category: 'secrets',
    label: 'Private key block',
    tokenType: 'PRIVATE_KEY',
    priority: 150,
    defaultEnabled: true,
    noisy: false,
    // Highest priority of any rule: a key block's base64 body would otherwise also match
    // `high-entropy` (and possibly other rules) as several separate spans. Whole-block
    // replacement keeps it one token.
    pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g,
  },
  {
    id: 'jwt',
    category: 'secrets',
    label: 'JWT',
    tokenType: 'JWT',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: 'bearer-token',
    category: 'secrets',
    label: 'Bearer token',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    // Redacts the token, keeps the word `Bearer` so the header's shape survives.
    pattern: /\bBearer\s+([A-Za-z0-9._~+/-]{20,}={0,2})/gd,
  },
  {
    id: 'github-token',
    category: 'secrets',
    label: 'GitHub token',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    id: 'gitlab-token',
    category: 'secrets',
    label: 'GitLab token',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: 'slack-token',
    category: 'secrets',
    label: 'Slack token',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: 'google-api-key',
    category: 'secrets',
    label: 'Google API key',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: 'stripe-key',
    category: 'secrets',
    label: 'Stripe key',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    pattern: /\b(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{16,}\b/g,
  },
  {
    id: 'llm-api-key',
    category: 'secrets',
    label: 'LLM API key',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    // Anthropic and OpenAI keys. The single most likely secret to be in a snippet someone is
    // about to paste into an LLM is the key for an LLM.
    pattern: /\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,})\b/g,
  },
  {
    id: 'azure-storage-conn',
    category: 'secrets',
    label: 'Azure storage connection string',
    tokenType: 'SECRET',
    priority: 140,
    defaultEnabled: true,
    noisy: false,
    // Replaced whole, because the account name and key together are the credential.
    pattern: /\bDefaultEndpointsProtocol=[^\s;]+;(?:[^\s;]+;)*AccountKey=[^\s;]+;?/gi,
  },
  {
    id: 'npmrc-token',
    category: 'secrets',
    label: '.npmrc auth token',
    tokenType: 'TOKEN',
    priority: 130,
    defaultEnabled: true,
    noisy: false,
    captureGroup: 1,
    pattern: /_authToken\s*=\s*(\S+)/gid,
  },
  {
    id: 'high-entropy',
    category: 'secrets',
    label: 'High-entropy string',
    tokenType: 'SECRET',
    priority: 10,
    defaultEnabled: true,
    // Will catch git SHAs and base64 blobs — that's the trade-off for catching unrecognised
    // secret formats. Lowest priority of any rule so every specific rule above wins the span
    // first. Listed noisy so the drawer surfaces it as the one to disable if it's too eager.
    noisy: true,
    pattern: /\b[A-Za-z0-9+/_-]{32,}={0,2}\b/g,
    validate: (value) => shannonEntropy(value) >= 3.5,
  },

  // ---------- E. PII ----------

  {
    id: 'email',
    category: 'pii',
    label: 'Email address',
    tokenType: 'EMAIL',
    priority: 90,
    defaultEnabled: true,
    noisy: false,
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    id: 'credit-card',
    category: 'pii',
    label: 'Credit card number',
    tokenType: 'CREDIT_CARD',
    priority: 80,
    defaultEnabled: true,
    noisy: false,
    // The Luhn check is what makes this rule usable rather than a menace — without it, any
    // 13-19 digit run (order numbers, invoice IDs) would match. Rewritten from SPEC.md's
    // `(?:\d[ -]?){13,19}` so every repetition ends on a digit: the original let the trailing
    // `[ -]?` sweep up an adjacent separator or space after the last digit (`\b` still held
    // afterwards), so a card number at the end of a sentence redacted the following space too.
    pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
    validate: (value) => luhn(value.replace(/[ -]/g, '')),
  },
  {
    id: 'phone-e164',
    category: 'pii',
    label: 'Phone number (E.164)',
    tokenType: 'PHONE',
    priority: 80,
    defaultEnabled: true,
    noisy: false,
    pattern: /(?<![\w.])\+[1-9]\d{7,14}(?!\w)/g,
  },
  {
    id: 'phone-au',
    category: 'pii',
    label: 'Phone number (AU)',
    tokenType: 'PHONE',
    priority: 80,
    defaultEnabled: true,
    noisy: false,
    // Australian local formats; other locales are an IDEAS.md entry, not a v1 gap to paper
    // over.
    pattern: /\b(?:0[2-478]|\(0[2-478]\))\s?\d{4}\s?\d{4}\b/g,
  },
]

/**
 * Builds one rule per custom term (SPEC.md category F). Not part of `rules` above because
 * these depend on runtime state — the caller concatenates the result into the enabled-rules
 * list it passes to `detect`. Highest priority of anything: if the user explicitly said to
 * redact a term, nothing outranks that.
 */
export function buildCustomRules(customTerms) {
  return customTerms
    .filter((term) => term.trim().length > 0)
    .map((term, i) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Word boundaries for an alphanumeric term (so "app" doesn't match inside "apple"); a
      // literal substring match otherwise, since a term with punctuation (a hostname, an
      // email-like handle) has no clean word boundary to anchor to.
      const isWordy = /^\w+$/.test(term)
      return {
        id: `custom-term-${i}`,
        category: 'custom',
        label: term,
        tokenType: 'CUSTOM',
        priority: 200,
        defaultEnabled: true,
        noisy: false,
        pattern: new RegExp(isWordy ? `\\b${escaped}\\b` : escaped, 'gi'),
      }
    })
}
