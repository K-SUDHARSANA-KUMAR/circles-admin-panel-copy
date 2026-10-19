import type { CoreConfig } from '../config/defaults';
import type { MessageClass, RenderedEmail } from '../model/message';
import type { OutgoingEmail } from '../ports';
import { listUnsubscribeHeaders } from '../consent/unsubscribe';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Footer wording. Short and plain, in Gus's voice. Editable later through the template layer. */
export const FOOTERS: Record<Exclude<MessageClass, 'transactional'>, { text: (url: string) => string; html: (url: string) => string }> = {
  marketing: {
    text: (url) => `—\nThe Circles Club · Don't want these emails? Unsubscribe in one click: ${url}`,
    html: (url) =>
      `<p style="margin-top:32px;font-size:12px;color:#8a8a93">The Circles Club · Don't want these emails? <a href="${escapeHtml(url)}" style="color:#8a8a93">Unsubscribe in one click</a>.</p>`,
  },
  business: {
    text: (url) => `—\nIf you'd rather not hear from us, you can opt out here: ${url}`,
    html: (url) =>
      `<p style="margin-top:32px;font-size:12px;color:#8a8a93">If you'd rather not hear from us, you can <a href="${escapeHtml(url)}" style="color:#8a8a93">opt out here</a>.</p>`,
  },
};

export interface ComposeInput {
  sendId: string;
  messageClass: MessageClass;
  templateId: string;
  recipient: string;
  email: RenderedEmail;
  /** Required for marketing and business. */
  unsubscribeUrl?: string;
  config: Pick<CoreConfig, 'senders' | 'unsubscribeMailto'>;
}

/**
 * Turn a rendered email into what the provider sends: the right sender for the class and layout,
 * reply-to Gus's inbox, and — for marketing and business — the unsubscribe footer and headers.
 */
export function composeEmail(input: ComposeInput): OutgoingEmail {
  const { senders } = input.config;
  const from =
    input.messageClass === 'transactional'
      ? senders.transactionalFrom
      : input.email.layout === 'plain'
        ? senders.personalFrom
        : senders.marketingFrom;

  let text = input.email.text;
  let html = input.email.html;
  let headers: Record<string, string> = {};

  if (input.messageClass !== 'transactional') {
    if (!input.unsubscribeUrl) throw new Error(`A ${input.messageClass} email must have an unsubscribe link`);
    const footer = FOOTERS[input.messageClass];
    text = `${text.trimEnd()}\n\n${footer.text(input.unsubscribeUrl)}`;
    if (html) {
      html = html.includes('</body>') ? html.replace('</body>', `${footer.html(input.unsubscribeUrl)}</body>`) : `${html}${footer.html(input.unsubscribeUrl)}`;
    }
    headers = listUnsubscribeHeaders(input.config, input.unsubscribeUrl);
  }

  return {
    to: input.recipient,
    from,
    replyTo: senders.replyTo,
    subject: input.email.subject,
    text,
    ...(html ? { html } : {}),
    headers,
    idempotencyKey: input.sendId,
    tags: { send_id: input.sendId, template_id: input.templateId, class: input.messageClass },
  };
}
