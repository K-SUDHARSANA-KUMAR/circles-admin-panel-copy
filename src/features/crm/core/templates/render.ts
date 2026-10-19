/**
 * Rendering templates for a real person: fill {variables}, apply fallbacks, wrap in the branded or
 * plain layout, and collect every link (for the transactional-content check and click tracking).
 * If a variable is empty and has no fallback, the message is not sent.
 */
import type { Contact } from '../model/contact';
import type { RenderedEmail, RenderedPush } from '../model/message';
import type { Template, TemplateVariable } from '../model/template';

export interface LinkConfig {
  /** Universal link that opens the app's paywall (falls back to the stores). */
  paywallUrl: string;
  appUrl: string;
  /** Opens the app's membership screen: in the last week of the free months, the end-of-trial screen. */
  membershipUrl: string;
  signupUrl: string;
  /**
   * RevenueCat web checkout, for "Join on the web" in emails (never inside the app: store rules).
   * Unset = off: any template using {web_join_link} counts as missing and isn't sent.
   */
  webJoinUrl?: string;
}

export const DEFAULT_LINKS: LinkConfig = {
  paywallUrl: 'https://thecirclesclub.com/app/paywall',
  appUrl: 'https://thecirclesclub.com/app',
  membershipUrl: 'https://thecirclesclub.com/app/membership',
  signupUrl: 'https://thecirclesclub.com/app/signup',
};

export type Variables = Partial<Record<TemplateVariable, string>>;

export interface VariableContext {
  inviterName?: string;
  orgName?: string;
  event?: { name: string; startsAt: string; venueName?: string; url: string };
  month?: string;
  /** Pre-formatted lines for the investor update. */
  numbers?: string;
  links?: LinkConfig;
  /** Added to links as ?src=email&c=<campaign> so conversions can be attributed. */
  campaign?: string;
  timeZone?: string;
}

const longDate = (iso: string, timeZone = 'Europe/London') =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(new Date(iso));

const withCampaign = (url: string, campaign?: string) => (campaign ? `${url}${url.includes('?') ? '&' : '?'}src=email&c=${encodeURIComponent(campaign)}` : url);

export function variablesFor(contact: Contact | undefined, ctx: VariableContext = {}): Variables {
  const links = ctx.links ?? DEFAULT_LINKS;
  const tz = ctx.timeZone ?? contact?.timezone ?? 'Europe/London';
  const v: Variables = {
    paywall_link: withCampaign(links.paywallUrl, ctx.campaign),
    app_link: withCampaign(links.appUrl, ctx.campaign),
    membership_link: withCampaign(links.membershipUrl, ctx.campaign),
    signup_link: withCampaign(links.signupUrl, ctx.campaign),
    ...(links.webJoinUrl ? { web_join_link: withCampaign(links.webJoinUrl, ctx.campaign) } : {}),
    sender_first_name: 'Gus',
  };
  if (contact) {
    if (contact.name.first) v.first_name = contact.name.first;
    if (contact.signals.freePeriod?.endsAt) v.trial_end_date = longDate(contact.signals.freePeriod.endsAt, tz);
    if (contact.signals.friendsCount !== undefined) v.friends_count = String(contact.signals.friendsCount);
    if (contact.signals.city) v.city = contact.signals.city;
  }
  if (ctx.inviterName) v.inviter_name = ctx.inviterName;
  if (ctx.orgName) v.org_name = ctx.orgName;
  if (ctx.month) v.month = ctx.month;
  if (ctx.numbers) v.numbers = ctx.numbers;
  if (ctx.event) {
    v.event_name = ctx.event.name;
    v.event_date = longDate(ctx.event.startsAt, tz);
    v.event_link = ctx.event.url;
    if (ctx.event.venueName) v.venue_name = ctx.event.venueName;
  }
  return v;
}

export function fillVariables(text: string, vars: Variables, fallbacks: Template['fallbacks']): { text: string; missing: string[] } {
  const missing: string[] = [];
  const out = text.replace(/\{([a-z_]+)\}/g, (whole, name: string) => {
    const value = vars[name as TemplateVariable] ?? fallbacks[name as TemplateVariable];
    if (value === undefined || value === '') {
      missing.push(name);
      return whole;
    }
    return value;
  });
  return { text: out, missing: [...new Set(missing)] };
}

export function extractLinks(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>"')]+/g) ?? [])].map((u) => u.replace(/[.,;:]+$/, ''));
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text → simple HTML paragraphs, with bare links made clickable. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => {
      const lines = para.split('\n').map((line) => escapeHtml(line).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>'));
      const isList = lines.every((l) => /^(-|\d+\.)\s/.test(l));
      if (isList) {
        const ordered = /^\d+\./.test(lines[0] ?? '');
        const items = lines.map((l) => `<li>${l.replace(/^(-|\d+\.)\s/, '')}</li>`).join('');
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('\n');
}

/** The plain layout reads like a personal email: no images, no banner. */
export function plainLayout(bodyHtml: string, preheader = ''): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a"><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span><div style="max-width:560px">${bodyHtml}</div></body></html>`;
}

/** The branded Circles layout: dark header with the wordmark, violet accents. */
export function brandedLayout(bodyHtml: string, preheader = ''): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f2fb;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a"><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden"><tr><td style="background:#0b0b0d;padding:20px 28px;color:#ffffff;font:500 20px Georgia,'Times New Roman',serif;letter-spacing:.2px">The Circles Club</td></tr><tr><td style="padding:28px">${bodyHtml.replace(/<a /g, '<a style="color:#7c3aed" ')}</td></tr></table></td></tr></table></body></html>`;
}

export interface RenderResult {
  email?: RenderedEmail;
  push?: RenderedPush;
  /** Variables with no value and no fallback. If any, don't send. */
  missing: string[];
}

export function renderTemplate(template: Template, vars: Variables): RenderResult {
  if (template.channel === 'push') {
    const title = fillVariables(template.pushTitle ?? '', vars, template.fallbacks);
    const body = fillVariables(template.pushBody ?? '', vars, template.fallbacks);
    const link = vars.app_link;
    return { push: { title: title.text, body: body.text, ...(link ? { link } : {}) }, missing: [...new Set([...title.missing, ...body.missing])] };
  }
  const subject = fillVariables(template.subject ?? '', vars, template.fallbacks);
  const preheader = fillVariables(template.preheader ?? '', vars, template.fallbacks);
  const body = fillVariables(template.body ?? '', vars, template.fallbacks);
  const inner = textToHtml(body.text);
  const html = template.layout === 'branded' ? brandedLayout(inner, preheader.text) : plainLayout(inner, preheader.text);
  return {
    email: {
      subject: subject.text,
      ...(preheader.text ? { preheader: preheader.text } : {}),
      text: body.text,
      html,
      layout: template.layout,
      links: extractLinks(body.text),
    },
    missing: [...new Set([...subject.missing, ...preheader.missing, ...body.missing])],
  };
}
