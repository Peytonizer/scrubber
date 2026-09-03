/**
 * Tailwind config for the noradz "Signal" theme.
 *
 * Every colour Scrubber uses is a token defined here, once, so there is exactly one place to
 * change a value. Components reference the semantic names (`bg-surface`, `text-muted`,
 * `border-border`) rather than hex codes. Values are copied from
 * `~/git/workbench/noradz/noradz-site-spec.md` and the built noradz stylesheet — see
 * SPEC.md's "Visual design" section for the full rationale, including why the category
 * palette diverges from noradz's one-accent rule.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // No `darkMode` setting: Scrubber is dark-only and never uses a `dark:` variant, so the
  // option (which Tailwind now treats as an alias for 'media' regardless) is moot either way.
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0d',
        surface: '#131315',
        border: {
          DEFAULT: '#212124',
          soft: '#2c2c30',
        },
        text: {
          DEFAULT: '#ededed',
          muted: '#9a9aa0',
          dim: '#8a8a90',
          // `faint` and `faintest` are brightened from the noradz spec's `#6a6a70` / `#4a4a50`
          // (3.7:1 and 2.2:1 against `bg`, both below WCAG AA's 4.5:1 for normal text). These
          // tokens carry section labels, table headers and placeholder text that get read
          // constantly, so a deliberate divergence from the canonical values here — brought up
          // by Matt after finding the live site hard to read. `faint` now clears AA (4.7:1);
          // `faintest` stays the dimmest tier by design but is no longer near-invisible (3.2:1).
          faint: '#7d7d84',
          faintest: '#626268',
        },
        accent: {
          DEFAULT: '#d1293d',
          hover: '#ee5a6b',
        },
        // Category hues: used only as a left-border, a dot, or a badge tint — never as text
        // colour. None of them clear a comfortable contrast ratio at 11px on `bg`.
        category: {
          cloud: '#5b8fb9',
          identity: '#8a7fb5',
          network: '#4f9d8c',
          secrets: '#d1293d', // deliberately the accent red — secrets are the critical category
          pii: '#c08a4a',
          custom: '#9a9aa0',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
}
