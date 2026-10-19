/**
 * Gus's inbox rules. They run before the AI and exactly as written, with no AI guesswork.
 *
 * How rules and the AI combine:
 *   - An "urgent" or "needs me" rule always wins: rules can make an email more urgent, never less.
 *   - An "FYI" or "noise" rule can quieten what the AI thought, but never an email the AI thinks is
 *     urgent, and never one an urgent rule or a deadline in the next 48 hours flags.
 *   - A deadline within the window makes it urgent.
 */
import type { Contact } from '../model/contact';
import type { InboxCategory, InboxRule } from '../model/inbox';
import type { Organisation } from '../model/organisation';
import type { PipelineItem } from '../model/pipeline';

export const URGENCY: Record<InboxCategory, number> = { urgent: 4, needs_me: 3, routine: 2, fyi: 1, noise: 0 };
export const moreUrgent = (a: InboxCategory, b: InboxCategory): InboxCategory => (URGENCY[a] >= URGENCY[b] ? a : b);

export interface RuleContext {
  fromEmail: string;
  subject: string;
  body: string;
  sender?: Contact;
  organisations: readonly Organisation[];
  pipelineItems: readonly PipelineItem[];
}

export interface RuleResult {
  /** The most urgent "raise" rule that matched (urgent / needs_me). */
  raise?: InboxCategory;
  /** The quietest "lower" rule that matched (fyi / noise). */
  lower?: InboxCategory;
  reasons: string[];
}

const domainOf = (email: string) => email.toLowerCase().split('@')[1] ?? '';

function matches(rule: InboxRule, ctx: RuleContext): boolean {
  const m = rule.match;
  const from = ctx.fromEmail.toLowerCase();
  const domain = domainOf(from);
  switch (m.kind) {
    case 'from_domain':
      return domain === m.domain.toLowerCase() || domain.endsWith(`.${m.domain.toLowerCase()}`);
    case 'from_email':
      return from === m.email.toLowerCase();
    case 'organisation': {
      if (ctx.sender?.orgIds.includes(m.orgId)) return true;
      const org = ctx.organisations.find((o) => o.id === m.orgId);
      return !!org && org.domains.some((d) => domain === d.toLowerCase());
    }
    case 'pipeline':
      return !!ctx.sender && ctx.pipelineItems.some((i) => i.pipelineId === m.pipelineId && i.contactId === ctx.sender!.id);
    case 'keywords': {
      const text = `${ctx.subject}\n${ctx.body}`.toLowerCase();
      return m.any.some((k) => k.trim() && text.includes(k.toLowerCase()));
    }
  }
}

export function applyRules(rules: readonly InboxRule[], ctx: RuleContext): RuleResult {
  const out: RuleResult = { reasons: [] };
  for (const rule of rules) {
    if (!rule.enabled || !matches(rule, ctx)) continue;
    out.reasons.push(`Rule: ${rule.understood}`);
    if (rule.category === 'urgent' || rule.category === 'needs_me') out.raise = out.raise ? moreUrgent(out.raise, rule.category) : rule.category;
    else out.lower = out.lower && URGENCY[out.lower] <= URGENCY[rule.category] ? out.lower : rule.category;
  }
  return out;
}

/** The final category from the AI's view, the rules, and any close deadline. */
export function combineCategory(ai: InboxCategory, rules: RuleResult, deadlineSoon: boolean): InboxCategory {
  let category = rules.lower && !rules.raise && ai !== 'urgent' ? rules.lower : ai;
  if (rules.raise) category = moreUrgent(category, rules.raise);
  if (deadlineSoon) category = 'urgent';
  return category;
}
