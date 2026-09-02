# Changelog

All notable changes to Scrubber are recorded here. One line per meaningful change; version
headings are cut when a meaningful chunk of work lands, not on every commit.

## Unreleased

- Project scaffolding: specification, backlog, README, changelog and `.gitignore`. No
  application code yet.
- Adopted the noradz "Signal" theme (dark base, red accent, Space Grotesk + IBM Plex Mono),
  with fonts self-hosted rather than CDN-loaded so the no-network guarantee still holds.
- Added an MIT licence.
- Scaffolded the Vite + React app and wired up Tailwind with the noradz colour and type
  tokens. The CSP `<meta>` tag (`connect-src 'none'`) is in `index.html` from the first
  commit, and the header/footer chrome (razor mark, wordmark, status-dot grid, footer line)
  is built and verified against a production build with no console errors or CSP violations.
- Detection engine: `rules.js` (every SPEC.md rule across the five categories, plus
  runtime-built custom-term rules), `heuristics.js` (IPv4/IPv6 shape validation, Luhn, Shannon
  entropy), `detect.js` and `overlap.js`. 103 Vitest cases, including a positive and negative
  fixture per rule and a test proving an AWS ARN wins the span over the bare account ID inside
  it. Two of SPEC.md's given regexes needed a small, commented correction once fixtures
  exercised them: `credit-card` was sweeping a trailing space into the match, and `ipv6`'s
  attempt to spell out the `::`-compression grammar directly matched only the tail of a
  compressed address — both are now a permissive pattern plus a real validator, as the network
  rules table already intended for `ipv4`.
- Tokenising and redaction: `tokenise.js` allocates `{{TYPE_N}}` tokens and reuses them for
  values already seen, returning a new session slice rather than mutating the one it's given;
  `redact.js` splices resolved matches into the text back-to-front, skipping any entry the
  user has disabled. 12 further Vitest cases cover the determinism guarantee across separate
  pipeline runs, the append-only mapping lifetime, and a captureGroup rule leaving its
  surrounding path structure intact.
