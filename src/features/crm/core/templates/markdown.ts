/**
 * Templates are kept as readable Markdown files in templates/emails/, so anyone can read and
 * edit the copy. This parses one into a Template. The prototype loads them in the browser; the
 * Firebase seed script loads them with fs and writes them to Firestore.
 */
import type { Purpose } from '../model/consent';
import { PURPOSES } from '../model/consent';
import type { MessageClass } from '../model/message';
import { MESSAGE_CLASSES } from '../model/message';
import type { Template, TemplateVariable } from '../model/template';

export class TemplateParseError extends Error {
  constructor(file: string, problem: string) {
    super(`${file}: ${problem}`);
    this.name = 'TemplateParseError';
  }
}

export function parseTemplateMarkdown(text: string, file = 'template', meta: { updatedAt?: string } = {}): Template {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!match) throw new TemplateParseError(file, 'missing front matter');
  const fields = new Map<string, string>();
  for (const line of (match[1] ?? '').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) fields.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  const get = (key: string) => fields.get(key) || undefined;
  const id = get('id');
  const name = get('name');
  const channel = get('channel');
  const cls = get('class');
  if (!id || !name) throw new TemplateParseError(file, 'id and name are required');
  if (channel !== 'email' && channel !== 'push') throw new TemplateParseError(file, 'channel must be email or push');
  if (!cls || !(MESSAGE_CLASSES as readonly string[]).includes(cls)) throw new TemplateParseError(file, 'class must be transactional, marketing or business');
  const purpose = get('purpose');
  if (purpose && !(PURPOSES as readonly string[]).includes(purpose)) throw new TemplateParseError(file, `unknown purpose ${purpose}`);
  if (cls === 'marketing' && !purpose) throw new TemplateParseError(file, 'marketing templates need a purpose');

  const fallbacks: Partial<Record<TemplateVariable, string>> = {};
  for (const pair of (get('fallbacks') ?? '').split(',')) {
    const [k, v] = pair.split('=').map((s) => s.trim());
    if (k && v) fallbacks[k as TemplateVariable] = v;
  }
  const body = (match[2] ?? '').trim();
  const layout = get('layout') === 'branded' ? 'branded' : 'plain';
  const template: Template = {
    id,
    name,
    channel,
    messageClass: cls as MessageClass,
    layout,
    fallbacks,
    version: Number(get('version') ?? 1),
    updatedAt: meta.updatedAt ?? '2026-10-06T00:00:00.000Z',
    updatedBy: 'system:prebuilt',
  };
  const description = get('description');
  if (description) template.description = description;
  if (purpose) template.purpose = purpose as Purpose;
  if (channel === 'email') {
    const subject = get('subject');
    if (!subject) throw new TemplateParseError(file, 'email templates need a subject');
    template.subject = subject;
    const preheader = get('preheader');
    if (preheader) template.preheader = preheader;
    template.body = body;
  } else {
    const title = get('push_title');
    const pushBody = get('push_body');
    if (!title || !pushBody) throw new TemplateParseError(file, 'push templates need push_title and push_body');
    template.pushTitle = title;
    template.pushBody = pushBody;
  }
  return template;
}

export function serialiseTemplateMarkdown(t: Template): string {
  const lines = [`id: ${t.id}`, `name: ${t.name}`];
  if (t.description) lines.push(`description: ${t.description}`);
  lines.push(`channel: ${t.channel}`, `class: ${t.messageClass}`);
  if (t.purpose) lines.push(`purpose: ${t.purpose}`);
  lines.push(`layout: ${t.layout}`);
  if (t.subject) lines.push(`subject: ${t.subject}`);
  if (t.preheader) lines.push(`preheader: ${t.preheader}`);
  if (t.pushTitle) lines.push(`push_title: ${t.pushTitle}`);
  if (t.pushBody) lines.push(`push_body: ${t.pushBody}`);
  const fb = Object.entries(t.fallbacks).map(([k, v]) => `${k}=${v}`).join(', ');
  if (fb) lines.push(`fallbacks: ${fb}`);
  return `---\n${lines.join('\n')}\n---\n${t.body ? `\n${t.body}\n` : ''}`;
}
