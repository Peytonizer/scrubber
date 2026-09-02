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
