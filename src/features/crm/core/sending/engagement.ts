/**
 * Opens and clicks reported by the email provider's webhook. Updates the send record and, the first
 * time, the automation's stats. Opens are inflated by Apple Mail Privacy Protection, so the UI
 * points people at clicks and the goal instead.
 */
import type { CoreDeps } from '../deps';

export async function recordEmailEngagement(deps: Pick<CoreDeps, 'sendLog' | 'automations' | 'clock'>, sendId: string, kind: 'opened' | 'clicked'): Promise<void> {
  const record = await deps.sendLog.get(sendId);
  if (!record) return;
  const firstOpen = !record.opened;
  const firstClick = kind === 'clicked' && !record.clicked;
  if (!firstOpen && !firstClick) return;
  await deps.sendLog.update(sendId, { opened: true, ...(kind === 'clicked' ? { clicked: true } : {}), updatedAt: deps.clock.now().toISOString() });
  if (record.automationId) {
    const delta = { ...(firstOpen ? { opened: 1 } : {}), ...(firstClick ? { clicked: 1 } : {}) };
    await deps.automations.bumpStats(record.automationId, delta);
  }
}
