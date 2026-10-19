/**
 * Creating and editing templates. Every save is checked, versioned (so a send can always be traced
 * to the exact wording) and audited.
 *
 * Changing what kind of message a template is (marketing, service, business) or its consent
 * purpose decides who it can reach, so only the Owner can do that, or create a new service message.
 */
import { z } from 'zod/v4';
import { assertCan, type AdminUser } from '../access/permissions';
import { recordAudit } from '../audit/audit';
import { findMarketingContent } from '../consent/marketingContent';
import type { CoreDeps } from '../deps';
import { PURPOSES } from '../model/consent';
import { MESSAGE_CLASSES } from '../model/message';
import { TEMPLATE_VARIABLES, type Template, type TemplateVariable } from '../model/template';

export class TemplateValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join(' '));
    this.name = 'TemplateValidationError';
  }
}

const KNOWN = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.id));

const editableTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,59}$/, 'use lower-case letters, numbers and dashes'),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).optional(),
  channel: z.enum(['email', 'push']),
  messageClass: z.enum(MESSAGE_CLASSES),
  purpose: z.enum(PURPOSES).optional(),
  layout: z.enum(['branded', 'plain']),
  subject: z.string().max(150).optional(),
  preheader: z.string().max(150).optional(),
  body: z.string().max(10_000).optional(),
  pushTitle: z.string().max(65).optional(),
  pushBody: z.string().max(240).optional(),
  fallbacks: z.record(z.string(), z.string().max(60)),
});

/** Every reason this template couldn't be saved, in plain English. */
export function templateProblems(t: Template): string[] {
  const p: string[] = [];
  if (t.channel === 'email') {
    if (!t.subject?.trim()) p.push('Add a subject line.');
    if (!t.body?.trim()) p.push('Write the email.');
  } else {
    if (!t.pushTitle?.trim()) p.push('Add a notification title.');
    if (!t.pushBody?.trim()) p.push('Write the notification.');
  }
  if (t.messageClass === 'marketing' && !t.purpose) p.push('Choose what it’s for (the consent it needs).');
  const text = [t.subject, t.preheader, t.body, t.pushTitle, t.pushBody].filter(Boolean).join('\n');
  const unknown = [...new Set([...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!).filter((v) => !KNOWN.has(v)))];
  if (unknown.length) p.push(`Unknown variable${unknown.length > 1 ? 's' : ''}: ${unknown.map((u) => `{${u}}`).join(', ')}.`);
  for (const k of Object.keys(t.fallbacks)) if (!KNOWN.has(k)) p.push(`Fallback for unknown variable {${k}}.`);
  if (t.messageClass === 'transactional') {
    // TODO-SECURITY: a word-and-link heuristic, not a guarantee. Owner review of service templates still matters.
    const findings = findMarketingContent({ texts: [t.subject, t.preheader, t.body, t.pushTitle, t.pushBody] });
    if (findings.length) p.push(`Service messages can’t include marketing (found: ${findings.map((f) => f.match).join(', ')}).`);
  }
  return p;
}

export async function saveTemplate(deps: Pick<CoreDeps, 'clock' | 'ids' | 'audit' | 'templates'>, admin: AdminUser, edited: Template, note: string): Promise<Template> {
  assertCan(admin, 'templates.write');
  const parsed = editableTemplateSchema.safeParse(edited);
  if (!parsed.success) throw new TemplateValidationError(parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || 'template'}: ${i.message}`));
  const before = await deps.templates.get(parsed.data.id);
  if (parsed.data.id === 'investor-update' || before?.id === 'investor-update') assertCan(admin, 'pipelines.investors');
  if (before && before.channel !== parsed.data.channel) throw new TemplateValidationError(['A template can’t change between email and push. Make a new one instead.']);
  if (before && (before.messageClass !== parsed.data.messageClass || before.purpose !== parsed.data.purpose)) assertCan(admin, 'settings.write');
  // New service messages reach people who've unsubscribed from marketing, so only the Owner creates them.
  if (!before && parsed.data.messageClass === 'transactional') assertCan(admin, 'settings.write');

  const { description, purpose, subject, preheader, body, pushTitle, pushBody, ...rest } = parsed.data;
  const optional = { description, purpose, subject, preheader, body, pushTitle, pushBody };
  const now = deps.clock.now().toISOString();
  const next: Template = {
    ...rest,
    ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined && v !== '')),
    fallbacks: rest.fallbacks as Partial<Record<TemplateVariable, string>>,
    version: (before?.version ?? 0) + 1,
    updatedAt: now,
    updatedBy: admin.id,
  };
  const problems = templateProblems(next);
  if (problems.length) throw new TemplateValidationError(problems);
  await deps.templates.save(next);
  await deps.templates.addVersion({ ...next, note: note.trim().slice(0, 200) || (before ? 'Edited' : 'Created') });
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: before ? 'template.update' : 'template.create', target: `crmTemplates/${next.id}`, ...(before ? { before } : {}), after: next });
  return next;
}

/** A starting point for a new template: a short note from Gus, plain layout. */
export function starterTemplate(input: { id: string; name: string; channel: 'email' | 'push'; messageClass: Template['messageClass'] }, now: string, adminId: string): Template {
  const base = { id: input.id, name: input.name, channel: input.channel, messageClass: input.messageClass, layout: 'plain' as const, fallbacks: { first_name: 'there' }, version: 0, updatedAt: now, updatedBy: adminId };
  const purpose = input.messageClass === 'marketing' ? { purpose: 'marketing' as const } : {};
  return input.channel === 'email'
    ? { ...base, ...purpose, subject: input.name, body: 'Hi {first_name},\n\nWrite your message here.\n\nGus' }
    : { ...base, ...purpose, pushTitle: input.name, pushBody: 'Write your notification here.' };
}

/** A unique, readable id from the name, e.g. "Summer party invite" → "summer-party-invite". */
export function templateIdFrom(name: string, taken: ReadonlySet<string>): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'template';
  let id = slug.length >= 3 ? slug : `${slug}-new`;
  for (let i = 2; taken.has(id); i++) id = `${slug}-${i}`;
  return id;
}
