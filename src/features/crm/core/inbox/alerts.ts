/**
 * Alerts for Gus: always on Today; urgent ones also texted to his phone.
 *
 *   - At most one text per alert (keyed on the alert id), and at most 10 texts an hour, so a flood
 *     of emails can't flood his phone. Anything over still shows on Today.
 *   - Urgent texts go at any time, unless Gus sets quiet hours for them in Inbox → Rules.
 *   - A text holds the sender's name and a one-line summary, never the email itself.
 */
import type { CoreDeps } from '../deps';
import type { Alert, AlertKind } from '../model/inbox';
import { checkQuietHours } from '../sending/quietHours';
import { reportProblem } from '../audit/problems';

const SMS_PER_HOUR = 10;

export interface NotifyInput {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  contactId?: string;
  messageId?: string;
  /** The text message, if one should go. */
  text: string;
  sms: boolean;
}

export async function notifyOwner(deps: Pick<CoreDeps, 'alerts' | 'sms' | 'settings' | 'processedEvents' | 'clock' | 'logger'> & Partial<Pick<CoreDeps, 'problems'>>, input: NotifyInput): Promise<Alert> {
  const now = deps.clock.now();
  let alert = await deps.alerts.get(input.id);
  if (!alert) {
    alert = {
      id: input.id,
      kind: input.kind,
      title: input.title,
      body: input.body,
      ...(input.contactId ? { contactId: input.contactId } : {}),
      ...(input.messageId ? { messageId: input.messageId } : {}),
      createdAt: now.toISOString(),
    };
    await deps.alerts.save(alert);
  }
  if (!input.sms || alert.smsSentAt) return alert;

  const settings = await deps.settings.getInbox();
  if (!settings.alertPhone) return alert;
  if (settings.alertQuietHours && checkQuietHours(now, 'Europe/London', { ...settings.alertQuietHours, spreadMinutes: 0, contactActionGraceMinutes: 0 }).quiet) return alert;
  if (!(await deps.processedEvents.claim(`sms:${alert.id}`, now.toISOString()))) return alert;
  const hour = now.toISOString().slice(0, 13);
  let slot = false;
  for (let i = 0; i < SMS_PER_HOUR && !slot; i++) slot = await deps.processedEvents.claim(`sms-slot:${hour}:${i}`, now.toISOString());
  if (!slot) {
    deps.logger.warn('alerts.sms_rate_limited', { alertId: alert.id });
    return alert;
  }
  try {
    await deps.sms.send(settings.alertPhone, input.text.slice(0, 320));
    alert = { ...alert, smsSentAt: now.toISOString() };
    await deps.alerts.save(alert);
  } catch (e) {
    deps.logger.error('alerts.sms_failed', { alertId: alert.id, error: e instanceof Error ? e.name : 'unknown' });
    await reportProblem(deps, { id: `sms_${alert.id}`, area: 'alerts', message: 'An urgent text to your phone didn’t send. The alert is on Today.', ref: { kind: 'alert', id: alert.id } });
  }
  return alert;
}
