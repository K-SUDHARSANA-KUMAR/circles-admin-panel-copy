/**
 * The permission check in front of every inbox-agent action. Nothing the agent does to Gmail or the
 * CRM happens without passing through checkAgentRequest first, and anything refused is logged.
 *
 * The agent can:          label · draft a reply to the sender · create or update the sender's
 *                         contact, notes, tasks and follow-up date · notify Gus · send an approved
 *                         answer to the sender (only under the strict auto-reply conditions)
 * The agent can't:        everything else. In particular it can't email anyone but the sender,
 *                         forward, delete, archive, export, change a status, subscription, consent
 *                         or setting, or put anyone else's personal details in a reply.
 *
 * TODO-SECURITY: review this list against the Gmail OAuth scope granted (gmail.modify). The
 * MailboxPort has no method for the forbidden actions, so this is the second of two independent
 * barriers.
 */
import { normaliseEmail } from '../contacts/addressKind';
import type { AnswerTemplate } from '../model/template';
import type { Classification, InboundEmail, InboxSettings } from '../model/inbox';
import type { KillSwitches } from '../model/settings';

export const AGENT_LABELS = ['CRM/Urgent', 'CRM/Needs me', 'CRM/Routine', 'CRM/FYI', 'CRM/Noise', 'CRM/Suspicious', 'CRM/Auto-replied'] as const;

export type AgentRequest =
  | { kind: 'label'; labels: string[] }
  | { kind: 'draft_reply'; to: string; text: string }
  | { kind: 'send_template_reply'; to: string; text: string; answerTemplateId: string }
  | { kind: 'create_contact'; email: string }
  | { kind: 'create_task'; contactId?: string; title: string }
  | { kind: 'add_note'; contactId: string; text: string }
  | { kind: 'set_follow_up'; contactId: string; date: string }
  | { kind: 'notify_owner'; text: string; urgent: boolean };

export interface PolicyContext {
  email: InboundEmail;
  /** The sender's contact (existing or just created). Only this contact can be touched. */
  senderContactId?: string;
  suspicious: boolean;
  classification: Classification;
  inbox: InboxSettings;
  killSwitches: KillSwitches;
  answers: readonly AnswerTemplate[];
  /** Other people's identifiers, to catch them in drafts. Never sent to the AI. */
  others: { names: readonly string[]; emails: ReadonlySet<string>; phones: ReadonlySet<string> };
  senderPhones: readonly string[];
  /** Addresses that belong to Circles itself (fine to mention). */
  ownDomains: readonly string[];
  now: Date;
  /** Already auto-replied in this thread / to this sender today. */
  threadAutoReplied: boolean;
  autoRepliesToSenderToday: number;
  /** On the suppression list with scope "all" (bounced, complained, erased, never contact). */
  senderSuppressed: boolean;
  /** Processing emails that arrived while the agent was off: never auto-reply to those. */
  backlog: boolean;
}

export type PolicyDecision = { allowed: true; flags: string[] } | { allowed: false; reason: string };

const allow = (flags: string[] = []): PolicyDecision => ({ allowed: true, flags });
const refuse = (reason: string): PolicyDecision => ({ allowed: false, reason });

const AUTO_REPLY_MAX_AGE_MS = 2 * 3_600_000;
const AUTO_REPLIES_PER_SENDER_PER_DAY = 3;

/** True for mailing lists, bounces and other machines: never reply to these automatically. */
export function isAutomatedSender(email: InboundEmail): boolean {
  const from = normaliseEmail(email.from.email);
  const local = from.split('@')[0] ?? '';
  if (/^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?|notifications?|alerts?|newsletter|news|updates|reports?|billing|payments?-noreply|.*-noreply)$/.test(local)) return true;
  const h = email.headers;
  if (h.autoSubmitted && h.autoSubmitted.toLowerCase() !== 'no') return true;
  if (h.precedence && /bulk|list|junk/i.test(h.precedence)) return true;
  return !!h.listUnsubscribe;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+?\d[\d\s().-]{8,}\d)/g;
const digits = (s: string) => s.replace(/\D/g, '').replace(/^44/, '0');

/**
 * Anyone other than the sender mentioned in a draft: their email address, phone number or name.
 * Returns plain descriptions (never the details themselves, so logs stay clean).
 */
export function findOtherPeople(text: string, ctx: Pick<PolicyContext, 'email' | 'others' | 'senderPhones' | 'ownDomains'>): string[] {
  const found = new Set<string>();
  const sender = normaliseEmail(ctx.email.from.email);
  for (const m of text.match(EMAIL_RE) ?? []) {
    const e = normaliseEmail(m);
    if (e === sender || ctx.ownDomains.some((d) => e.endsWith(`@${d}`))) continue;
    found.add('an email address that isn’t the sender’s');
  }
  const senderDigits = new Set(ctx.senderPhones.map(digits));
  for (const m of text.match(PHONE_RE) ?? []) {
    const d = digits(m);
    if (d.length < 10 || senderDigits.has(d)) continue;
    found.add('a phone number that isn’t the sender’s');
  }
  const lower = text.toLowerCase();
  for (const name of ctx.others.names) {
    const n = name.toLowerCase();
    if (n.length < 5) continue;
    const i = lower.indexOf(n);
    if (i !== -1 && !/[a-z]/.test(lower[i - 1] ?? ' ') && !/[a-z]/.test(lower[i + n.length] ?? ' ')) {
      found.add('another person’s name');
      break;
    }
  }
  return [...found];
}

/** The single gate. Anything not explicitly allowed here is refused. */
export function checkAgentRequest(request: { kind: string } & Record<string, unknown>, ctx: PolicyContext): PolicyDecision {
  if (ctx.killSwitches.inboxAgentOff) return refuse('The inbox agent is switched off');
  const sender = normaliseEmail(ctx.email.from.email);
  const req = request as AgentRequest;

  switch (req.kind) {
    case 'label': {
      if (!Array.isArray(req.labels) || req.labels.length === 0) return refuse('No label given');
      const bad = req.labels.filter((l) => !(AGENT_LABELS as readonly string[]).includes(l));
      return bad.length ? refuse(`Only the agent’s own CRM labels are allowed (tried ${bad.length} other)`) : allow();
    }

    case 'draft_reply': {
      if (typeof req.to !== 'string' || normaliseEmail(req.to) !== sender) return refuse('Drafts can only be addressed to the person who wrote in');
      if (typeof req.text !== 'string' || !req.text.trim() || req.text.length > 4000) return refuse('Draft is empty or too long');
      return allow(findOtherPeople(req.text, ctx));
    }

    case 'send_template_reply': {
      if (typeof req.to !== 'string' || normaliseEmail(req.to) !== sender) return refuse('Replies can only go to the person who wrote in');
      const c = ctx.classification;
      const topic = c.routineTopic;
      if (ctx.backlog) return refuse('It arrived while the agent was off, so a reply now would be late');
      if (ctx.suspicious || c.instructionsDetected) return refuse('The email looks like it’s trying to instruct the agent');
      if (c.category !== 'routine' || !topic) return refuse('Only routine questions can be answered automatically');
      if (ctx.inbox.routineModes[topic] !== 'auto') return refuse('That kind of question is set to “draft for me”');
      if (c.confidence < ctx.inbox.confidenceThreshold) return refuse(`Only ${Math.round(c.confidence * 100)}% sure (needs ${Math.round(ctx.inbox.confidenceThreshold * 100)}%)`);
      const answer = ctx.answers.find((a) => a.id === req.answerTemplateId);
      if (!answer || answer.category !== topic || !answer.approvedAt) return refuse('No approved answer for this kind of question');
      if (isAutomatedSender(ctx.email)) return refuse('The sender is an automated address or mailing list');
      if (ctx.senderSuppressed) return refuse('The sender is on the do-not-contact list');
      if (ctx.threadAutoReplied) return refuse('Already auto-replied in this conversation');
      if (ctx.autoRepliesToSenderToday >= AUTO_REPLIES_PER_SENDER_PER_DAY) return refuse('Already auto-replied to them several times today');
      if (ctx.now.getTime() - Date.parse(ctx.email.receivedAt) > AUTO_REPLY_MAX_AGE_MS) return refuse('The email is more than 2 hours old');
      const leaks = findOtherPeople(String(req.text ?? ''), ctx);
      if (leaks.length) return refuse(`The reply mentions ${leaks.join(' and ')}`);
      return allow();
    }

    case 'create_contact':
      return typeof req.email === 'string' && normaliseEmail(req.email) === sender ? allow() : refuse('Only the sender can be added as a contact');

    case 'create_task':
      if (req.contactId !== undefined && req.contactId !== ctx.senderContactId) return refuse('Tasks can only be about the sender');
      return typeof req.title === 'string' && req.title.trim() && req.title.length <= 200 ? allow() : refuse('Task text missing or too long');

    case 'add_note':
      if (req.contactId !== ctx.senderContactId) return refuse('Notes can only be added to the sender’s record');
      return typeof req.text === 'string' && req.text.length <= 2000 ? allow() : refuse('Note too long');

    case 'set_follow_up': {
      if (req.contactId !== ctx.senderContactId) return refuse('Follow-up dates can only be set on the sender’s record');
      const t = Date.parse(String(req.date));
      if (Number.isNaN(t) || t < ctx.now.getTime() - 86_400_000 || t > ctx.now.getTime() + 366 * 86_400_000) return refuse('Follow-up date is out of range');
      return allow();
    }

    case 'notify_owner':
      return typeof req.text === 'string' && req.text.length <= 300 ? allow() : refuse('Alert text too long');

    default:
      return refuse(`The agent isn’t allowed to “${String((request as { kind: unknown }).kind).slice(0, 40)}”`);
  }
}
