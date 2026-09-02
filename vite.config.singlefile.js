import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Second build target (SPEC.md build order, stage 8): produces `dist-single/scrubber.html`, a
 * single self-contained file that runs from a `file://` URL with no server — the form people
 * will actually email to a colleague on a locked-down machine.
 *
 * Same React plugin and the same `index.html`/Tailwind pipeline as the normal build
 * (`vite.config.js`); `viteSingleFile`'s recommended config (on by default) is what does the
 * actual work of inlining the built CSS and JS as data URIs and `<style>`/`<script>` tags —
 * see the fonts already being base64-inlined via `@fontsource` in both build targets. The two
 * plugins below handle what's left over: the CSP needs relaxing for inline script to run at
 * all, and the favicon is a `public/` file vite-plugin-singlefile explicitly doesn't inline
 * (per its README), so it's the one remaining external reference this build would otherwise
 * carry.
 */

/** An inlined `<script>` needs `'unsafe-inline'` in `script-src` to run — `'self'` only covers
 * a same-origin *external* file, which an inlined script no longer is. `style-src` already
 * carries `'unsafe-inline'` (added in stage 1, for Vite's dev-mode CSS injection). The fonts
 * are inlined too — as `data:` URIs inside the (now inline) CSS's `@font-face` rules — so
 * `font-src` needs `data:` added, the same way `img-src` already allows it; `font-src 'self'`
 * alone does not cover a `data:` source. `connect-src 'none'` — the part of the CSP that
 * actually matters for the privacy guarantee — is untouched by any of this. */
function relaxCspForSingleFile() {
  return {
    name: 'relax-csp-for-single-file',
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
        .replace("font-src 'self';", "font-src 'self' data:;")
    },
  }
}

/** Replaces the `<link rel="icon">`'s `href="/favicon.svg"` with the file's own content as a
 * data URI, so the single-file build has no dependency on a `public/` file existing alongside
 * it — genuinely one file, nothing else to lose. */
function inlineFavicon() {
  return {
    name: 'inline-favicon',
    transformIndexHtml(html) {
      const svg = readFileSync(new URL('./public/favicon.svg', import.meta.url), 'utf8')
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
      return html.replace('/favicon.svg', dataUri)
    },
  }
}

export default defineConfig({
  plugins: [react(), relaxCspForSingleFile(), inlineFavicon(), viteSingleFile()],
  // The favicon is inlined as a data URI above, and nothing else references a public/ file, so
  // there is nothing left to copy — `publicDir: false` keeps this build to genuinely one file.
  publicDir: false,
  build: {
    outDir: 'dist-single',
  },
})
