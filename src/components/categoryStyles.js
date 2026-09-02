/**
 * Shared category presentation data (RuleDrawer, MappingTable, StatsBadges): the display label
 * and the Tailwind class names for each category's hue, used only as a dot/border/badge tint,
 * never as text colour — see SPEC.md's "Visual design" section. Written out as literal class
 * name strings (not built with template interpolation) because Tailwind's build-time scanner
 * greps source files for class names it can find as-is; `bg-category-${category}` would never
 * be found.
 */
export const CATEGORY_ORDER = ['cloud', 'identity', 'network', 'secrets', 'pii', 'custom']

export const CATEGORY_LABEL = {
  cloud: 'Cloud',
  identity: 'Identity',
  network: 'Network',
  secrets: 'Secrets',
  pii: 'PII',
  custom: 'Custom',
}

export const CATEGORY_DOT = {
  cloud: 'bg-category-cloud',
  identity: 'bg-category-identity',
  network: 'bg-category-network',
  secrets: 'bg-category-secrets',
  pii: 'bg-category-pii',
  custom: 'bg-category-custom',
}

export const CATEGORY_BORDER = {
  cloud: 'border-category-cloud',
  identity: 'border-category-identity',
  network: 'border-category-network',
  secrets: 'border-category-secrets',
  pii: 'border-category-pii',
  custom: 'border-category-custom',
}
