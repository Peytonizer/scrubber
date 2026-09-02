# Scrubber

**[scrubber.noradz.io](https://scrubber.noradz.io)** — not yet live; see Status below.

Redact secrets out of text before you paste it into an LLM — then paste the reply back and
get your real values returned.

Scrubber finds cloud resource identifiers, usernames, hostnames, IP addresses, API keys,
tokens and standard PII in whatever you paste, and swaps each one for a stable placeholder
like `{{IP_ADDR_1}}`. Ask your question with the redacted text. When the model answers, paste
its reply into Scrubber's re-hydrate mode and every placeholder turns back into the original
value.

The same value always gets the same placeholder, so the text stays coherent — a model reading
`{{USER_1}} cannot reach {{IP_ADDR_2}}` can still reason about it properly.

## The privacy guarantee

- **Nothing leaves your browser.** Scrubber makes no network requests once the page has
  loaded. No analytics, no error reporting, no CDN. This isn't only a promise: the page ships
  a Content-Security-Policy that tells the browser to block outbound connections outright, so
  you can verify it by reading one line of the HTML, or by watching an empty Network tab.
- **No fonts, icons or scripts from anywhere else.** Everything the page needs is bundled
  into it at build time. There is no CDN link to fall back on, which is why the fonts are
  self-hosted rather than pulled from Google Fonts like the rest of the noradz sites.
- **Nothing is stored.** No `localStorage`, no cookies, no server. The table mapping
  placeholders back to your real values lives only in the tab's memory. Close or reload the
  page and it's gone — which is deliberate, because that table is a plaintext list of your
  secrets, neatly labelled. Finish the round trip before you close the tab.

## What it detects

| Category | Examples |
| --- | --- |
| Cloud | AWS ARNs, account IDs, access keys, S3 buckets; Azure resource IDs, subscription and tenant GUIDs; GCP project IDs and service accounts |
| Identity | Usernames in `/home/…`, `/Users/…` and `C:\Users\…` paths, `ssh user@host`, `user=` / `username:` config pairs, credentials inside connection strings |
| Network | IPv4 and IPv6 addresses, MAC addresses, internal hostnames (`.local`, `.internal`, `.corp`, …) |
| Secrets | Private key blocks, JWTs, Bearer tokens, GitHub / GitLab / Slack tokens, and generic high-entropy strings |
| PII | Email addresses, phone numbers, credit card numbers (Luhn-checked) |

Including, because it comes up more than you'd think, the API keys for LLMs themselves —
`sk-ant-…` and `sk-…` keys are a very common passenger in a snippet someone is about to paste
into a chat window.

Plus anything you add yourself: a custom-terms field takes company names, project codenames
or specific handles that no pattern would catch, and those outrank every built-in rule.

Every rule can be switched off individually, and the mapping table lets you drop a false
positive with one click before you copy the output. Scrubber deliberately errs towards
redacting too much — a wrong match costs you a click, a missed one costs you a secret.

## Running it locally

Requires Node 18 or newer.

```
npm install
npm run dev
```

Then open the URL it prints.

## Building

```
npm run build          # static site in dist/
npm run build:single   # one self-contained file: dist-single/scrubber.html
```

The single-file build has no external assets at all — save it anywhere and open it straight
from your filesystem, no server and no network needed. Its CSP adds `'unsafe-inline'` to
`script-src` and `style-src`, and `data:` to `font-src`, because everything (JS, CSS, fonts,
even the favicon) is inlined directly into the one HTML file rather than loaded as a separate
same-origin resource. `connect-src 'none'` — the directive that actually enforces the
no-network guarantee — is exactly the same in both builds.

## Design

Scrubber uses the [noradz](https://noradz.io) "Signal" theme — near-black surfaces, a single
red accent, Space Grotesk for copy and IBM Plex Mono for everything that looks like data.
Dark only.

## Licence

MIT. See `LICENSE`. Fork it, audit it, host it yourself — that's rather the point.

## Status

Early. See `CHANGELOG.md` for what has landed.
