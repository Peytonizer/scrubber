/**
 * The noradz "Straight Razor" mark — a nod to the Noradz citizens' shaved heads under the
 * cleanliness rule. Copied verbatim from the noradz site spec: 18px, accent stroke, round
 * caps, the chord touching the circle exactly at both ends. Scrubber reuses it unmodified
 * since it is a noradz project, not a new brand.
 */
export default function RazorMark({ className = '' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d1293d"
      strokeWidth="1.6"
      strokeLinecap="round"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="13" r="6" />
      <path d="M7.13 9.5L16.87 9.5" />
    </svg>
  )
}
