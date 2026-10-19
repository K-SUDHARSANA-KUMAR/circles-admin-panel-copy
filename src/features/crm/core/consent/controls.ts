/**
 * Kill switches and sending rules: Owner-only, audited, validated.
 */
import { z } from 'zod/v4';
import { assertCan, type AdminUser } from '../access/permissions';
import { recordAudit } from '../audit/audit';
import type { CoreDeps } from '../deps';
import type { KillSwitches, SendingSettings } from '../model/settings';
import { isValidTimeZone } from '../sending/timezone';

type ControlDeps = Pick<CoreDeps, 'clock' | 'ids' | 'audit' | 'killSwitches' | 'settings' | 'logger'>;

/**
 * Flip Pause all sending or Inbox agent off. Takes effect on the very next send or agent action,
 * because both read the switches fresh every time.
 */
export async function setKillSwitches(
  deps: ControlDeps,
  admin: AdminUser,
  patch: Partial<Pick<KillSwitches, 'pauseAllSending' | 'inboxAgentOff'>>,
): Promise<KillSwitches> {
  assertCan(admin, 'killSwitch.write');
  const before = await deps.killSwitches.read();
  const after: KillSwitches = {
    pauseAllSending: patch.pauseAllSending ?? before.pauseAllSending,
    inboxAgentOff: patch.inboxAgentOff ?? before.inboxAgentOff,
    updatedAt: deps.clock.now().toISOString(),
    updatedBy: admin.id,
  };
  await deps.killSwitches.write(after);
  await recordAudit(deps, {
    actor: `admin:${admin.id}`,
    action: 'killSwitches.update',
    target: 'crmSettings/killSwitches',
    before: { pauseAllSending: before.pauseAllSending, inboxAgentOff: before.inboxAgentOff },
    after: { pauseAllSending: after.pauseAllSending, inboxAgentOff: after.inboxAgentOff },
  });
  deps.logger.warn('killSwitches.changed', { adminId: admin.id, pauseAllSending: after.pauseAllSending, inboxAgentOff: after.inboxAgentOff });
  return after;
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, e.g. 21:00');

export const sendingSettingsSchema = z.object({
  frequencyCap: z.object({
    email: z.object({ max: z.number().int().min(0).max(14), windowDays: z.number().int().min(1).max(31) }),
    push: z.object({ max: z.number().int().min(0).max(14), windowDays: z.number().int().min(1).max(31) }),
    maxDeferDays: z.number().int().min(0).max(14),
  }),
  quietHours: z.object({
    start: hhmm,
    end: hhmm,
    spreadMinutes: z.number().int().min(0).max(180),
    contactActionGraceMinutes: z.number().int().min(0).max(30),
  }),
  defaultTimezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  testRecipients: z.array(z.email()).max(10),
});

export class SettingsValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`Settings rejected: ${problems.join('; ')}`);
    this.name = 'SettingsValidationError';
  }
}

export async function updateSendingSettings(deps: ControlDeps, admin: AdminUser, next: SendingSettings): Promise<SendingSettings> {
  assertCan(admin, 'settings.write');
  const parsed = sendingSettingsSchema.safeParse(next);
  if (!parsed.success) {
    throw new SettingsValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  const before = await deps.settings.getSending();
  await deps.settings.saveSending(parsed.data);
  await recordAudit(deps, { actor: `admin:${admin.id}`, action: 'settings.sending.update', target: 'crmSettings/sending', before, after: parsed.data });
  return parsed.data;
}
