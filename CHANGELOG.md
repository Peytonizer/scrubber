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
- Re-hydration: `rehydrate.js` restores every known `{{TYPE_N}}` token in a model's reply,
  tolerating stray whitespace or backticks a model adds around a placeholder, and reports any
  `{{…}}`-shaped token it doesn't recognise instead of silently leaving a partial restore.
  Added `test/fixtures/mixed-log.txt`, a fabricated deploy log spanning most rule categories,
  and a full round-trip test: redact it, rehydrate the result, assert the output is the
  original byte-for-byte. The engine (stages 2-4) is now complete and self-verifying end to
  end; the UI is next.
- Dual-pane UI: the app is now usable end to end. `useSession.js` is the single session store
  (mode, input, toggles, mapping) and drives the live pipeline — debounced 150ms, gated off
  above 200 KB in favour of a manual Scrub button. `ModeToggle` now lives in the header
  alongside the status-dot grid, which lights up for real once the mapping holds something.
  `InputPane`/`OutputPane` give the explicit empty state ("No sensitive values found") instead
  of ambiguous unchanged output, a Copy button, and the round-trip self-check and mode
  auto-detect banners from SPEC.md's feature list. Verified in a real browser against a
  production build: live redaction, deterministic token reuse across repeated values,
  re-hydration (including the tolerant-whitespace and unknown-token cases), and the mode
  toggle — no console errors. One bug found and fixed by that manual testing: the round-trip
  check was comparing against unrelated `{{…}}`-shaped text already sitting in the input when
  nothing was actually redacted that run, so it's now gated on `matches.length > 0`.
- Rule drawer: a collapsible right-hand sidebar (toggled from a new header button) listing
  every rule under its category, each with its own checkbox; a category checkbox gates every
  rule beneath it regardless of that rule's own toggle, and a `noisy` badge marks rules that
  may over-match. The free-text custom-terms field adds a term on Enter/comma/blur as a
  removable tag, each one becoming a highest-priority rule at runtime. Manually verified: a
  category toggle stops its rules from matching without touching anything else, and a custom
  term redacts correctly, mid-sentence, on the next debounce tick — no console errors.
- Mapping inspector, stats, purge and keyboard shortcuts — the last of v1's UI. `MappingTable`
  lists every entry with its category dot, a per-row enable checkbox, and a click-to-rename
  token field that rejects a name colliding with another entry's token. `StatsBadges` counts
  enabled entries per category. `PurgeButton` is a two-step inline confirmation naming exactly
  what will be lost, replacing itself once the mapping is empty. `Cmd/Ctrl+Enter` copies the
  output, `Cmd/Ctrl+K` toggles mode, `Cmd/Ctrl+B` toggles the drawer.
  Also implemented the `{{` token-delimiter collision from SPEC.md's decisions table:
  `tokenise.js` takes a `delimiter` param (`curly` or `angle`) and only affects tokens minted
  from that point on, so a mid-session switch never rewrites a token already handed out;
  `rehydrate.js` recognises both `{{TYPE_N}}` and `<<TYPE_N>>` without needing to know which
  one is active.
  `output` is now derived (`redact(matchedText, matches, mapping)`) rather than stored, so
  toggling or renaming a mapping row updates the visible output instantly with no re-detect.
  Manually stress-tested with 31 mapping rows (SPEC.md flagged the inspector's layout at that
  scale as needing a check before committing to a design) — the plain scrolling table reads
  fine at that size, so no virtualisation or pagination was needed. Also verified in-browser:
  rename updates the output live and rejects a colliding name, disabling a row un-redacts it
  live, the delimiter switch mints new tokens in the new style while leaving existing ones
  alone, all three keyboard shortcuts, and the full purge confirm/cancel flow. No console
  errors. Every v1 feature in SPEC.md's list is now implemented; single-file build and
  deployment (stages 8-9) are what's left.
- Single-file build: `vite.config.singlefile.js` (via `vite-plugin-singlefile`) produces
  `dist-single/scrubber.html` — one file, nothing else, that runs with no server. Two plugins
  handle what the singlefile plugin doesn't: `relaxCspForSingleFile` adds `'unsafe-inline'` to
  `script-src` (an inlined `<script>` isn't covered by `'self'`, which only allows a
  same-origin *external* file) and `data:` to `font-src` (the fonts are now inlined as `data:`
  URIs too); `inlineFavicon` replaces the `public/favicon.svg` reference with the file's own
  content as a data URI, and `publicDir: false` stops that file being copied in as well, so
  the build is genuinely one file rather than one file plus an orphaned favicon.
  `connect-src 'none'` is untouched in both builds — see the README's new note on this.
  `npm run build:single` builds then renames Vite's `index.html` output to `scrubber.html`
  (the CLI supplies the rename; there's no built-in Vite option for it).
  Verified by serving the built file (the browser automation tool can't drive a `file://` URL
  directly, so this stands in for it — the CSP directives themselves don't behave differently
  by scheme) and confirming zero non-inlined network requests, correct font rendering, and a
  full working de-identify/re-hydrate round trip with the mapping table, stats and drawer all
  functioning identically to the normal build. No console errors.
- Deploy: `.github/workflows/deploy.yml` builds, runs the test suite (a push to `main` is now
  a deploy, so it never publishes a build whose own tests fail), builds the `dist` site, copies
  `CNAME` into it, and publishes via the standard `actions/deploy-pages` flow. Enabled Pages on
  the repo (`build_type: workflow`, via the API) so this workflow has somewhere to deploy to.
  The `scrubber.noradz.io` DNS record still needs setting up at the domain registrar — a
  one-time interactive step outside what this session can do — so the site will build and
  deploy correctly but only be reachable at the default `peytonizer.github.io/scrubber/` URL
  until that record exists and GitHub's certificate provisioning picks it up.
  Confirmed LICENSE (MIT, "Peytonizer") was already in place from stage 1.
  This is the last of SPEC.md's nine build-order stages — v1 is feature-complete.
- Live at `scrubber.noradz.io` — the DNS record now resolves and GitHub's certificate is
  approved.
- Added `SecurityNote`: states the privacy guarantee on the page itself (not only the README),
  expanded by default above the panes, pointing at the mechanism behind each claim — the CSP's
  `connect-src 'none'`, no CDN, no persistence — rather than just asserting it. Collapses to
  one line; there's nowhere to remember that choice (by design), so it opens the same way
  every reload.
- Source-to-deploy provenance: both build targets now stamp the current commit SHA in at build
  time (`vite.commit-sha.js`, shared by `vite.config.js` and `vite.config.singlefile.js`) and
  the footer links to it on GitHub — `built from commit 2491ce7`, say. It's the one outbound
  link the app ships, so it opens in a new tab rather than navigating the current one away,
  since the mapping table lives only in this tab's memory and a footer click should never risk
  it. Lets a sceptical user confirm the page they're looking at was actually built from the
  source they audited, closing the last link in the README's "read the CSP line, watch the
  Network tab" verifiability story. Verified in a real browser against a production build: the
  link renders and points at the right commit, no console errors, no CSP violations.
- Five more PII rules: Australian Tax File Number, Medicare card number and ABN — each backed
  by a real weighted-checksum validator transcribed from the issuing agency's own published
  algorithm (`heuristics.isValidTfn`/`isValidMedicare`/`isValidAbn`, in the same spirit as
  `luhn` for credit cards) — plus driver's licence and passport numbers, which have no public
  checksum to validate against and so are contextual instead: they only fire next to a
  recognisable label ("driver's licence", "licence number", "passport"), the same trade-off
  `kv-username` and `gcp-project-id` already make. 22 new Vitest cases (checksum validators,
  rule fixtures, and a rejection case per checksummed rule). Verified in a real browser: all
  five redact correctly, round-trip through re-hydrate correctly, and show up in the mapping
  table and PII stat badge with no console errors.
