import { useState } from 'react'
import { rules } from '../engine/rules.js'
import { CATEGORY_BORDER, CATEGORY_DOT, CATEGORY_LABEL } from './categoryStyles.js'

// The drawer only lists built-in rules — custom terms get their own field below, not a
// category of static rules to toggle individually.
const DRAWER_CATEGORIES = ['cloud', 'identity', 'network', 'secrets', 'pii']

const RULES_BY_CATEGORY = DRAWER_CATEGORIES.map((category) => ({
  category,
  rules: rules.filter((r) => r.category === category),
}))

/**
 * The collapsible rule drawer (SPEC.md feature 5): a toggle per category and per individual
 * rule, plus the free-text custom-terms field. A category toggle gates every rule beneath it
 * regardless of that rule's own toggle — see the enabledRules filter in useSession.js, which
 * this component's props mirror exactly.
 */
export default function RuleDrawer({
  categoryToggles,
  ruleToggles,
  customTerms,
  onToggleCategory,
  onToggleRule,
  onSetCustomTerms,
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto rounded border border-border bg-surface p-5 min-[901px]:w-72">
      {RULES_BY_CATEGORY.map(({ category, rules: categoryRules }) => {
        const categoryOn = categoryToggles[category] !== false
        return (
          <div key={category}>
            <label className="mb-2 flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text">
              <input
                type="checkbox"
                checked={categoryOn}
                onChange={() => onToggleCategory(category)}
                className="accent-accent"
              />
              <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[category]}`} />
              {CATEGORY_LABEL[category]}
            </label>
            <ul className={`flex flex-col gap-[6px] border-l-2 pl-3 ${CATEGORY_BORDER[category]}`}>
              {categoryRules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between gap-2">
                  <label
                    className={`flex cursor-pointer items-center gap-2 font-mono text-[12px] ${
                      categoryOn ? 'text-text-dim' : 'text-text-faintest'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ruleToggles[rule.id] !== false}
                      onChange={() => onToggleRule(rule.id)}
                      disabled={!categoryOn}
                      className="accent-accent"
                    />
                    {rule.label}
                  </label>
                  {rule.noisy && (
                    <span
                      title="May over-match — kept on deliberately, per Scrubber's over-redaction principle"
                      className="rounded-full border border-border-soft px-2 py-[1px] font-mono text-[10px] text-text-faint"
                    >
                      noisy
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      <CustomTermsField terms={customTerms} onChange={onSetCustomTerms} />
    </aside>
  )
}

/**
 * A free-text field for terms no pattern would catch — company names, project codenames,
 * specific handles. Each committed term becomes its own rule at runtime (SPEC.md's
 * `buildCustomRules`) with the highest priority of anything.
 */
function CustomTermsField({ terms, onChange }) {
  const [draft, setDraft] = useState('')

  function commit() {
    const term = draft.trim()
    if (term && !terms.includes(term)) onChange([...terms, term])
    setDraft('')
  }

  function remove(term) {
    onChange(terms.filter((t) => t !== term))
  }

  return (
    <div>
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text">
        Custom terms
      </h3>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
        placeholder="Company name, project codename…"
        className="w-full rounded border border-border-soft bg-bg px-3 py-2 font-mono text-[12px] text-text placeholder:text-text-faintest focus:border-accent focus:outline-none"
      />
      {terms.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {terms.map((term) => (
            <li key={term}>
              <button
                type="button"
                onClick={() => remove(term)}
                title="Remove"
                className="rounded-full border border-border-soft px-2 py-[3px] font-mono text-[11px] text-text-muted hover:border-accent hover:text-accent"
              >
                {term} ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
