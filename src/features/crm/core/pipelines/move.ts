/** Moving a card between stages. Returns the trigger signal for "A pipeline card changes stage" automations. */
import { assertCan, type AdminUser } from '../access/permissions';
import type { CoreDeps } from '../deps';
import type { TriggerSignal } from '../events/ingest';

export class PipelineMoveError extends Error {}

export async function movePipelineItem(
  deps: Pick<CoreDeps, 'clock' | 'ids' | 'pipelines' | 'pipelineItems' | 'timeline'>,
  admin: AdminUser,
  itemId: string,
  stageId: string,
): Promise<TriggerSignal | undefined> {
  assertCan(admin, 'pipelines.write');
  const item = await deps.pipelineItems.get(itemId);
  if (!item) throw new PipelineMoveError('Card not found');
  if (item.ownerOnly) assertCan(admin, 'pipelines.investors');
  const pipeline = await deps.pipelines.get(item.pipelineId);
  const stage = pipeline?.stages.find((s) => s.id === stageId);
  if (!pipeline || !stage) throw new PipelineMoveError('Unknown stage');
  if (item.stageId === stage.id) return undefined;
  const now = deps.clock.now().toISOString();
  await deps.pipelineItems.save({ ...item, stageId: stage.id, stageChangedAt: now, updatedAt: now });
  if (!item.contactId) return undefined;
  await deps.timeline.append({ id: deps.ids.next('tl'), contactId: item.contactId, kind: 'system', summary: `Moved to ${stage.name} in ${pipeline.name}`, at: now, actor: `admin:${admin.id}`, ownerOnly: item.ownerOnly });
  return { kind: 'pipeline_stage_changed', contactId: item.contactId, pipelineId: pipeline.id, stageId: stage.id, itemId: item.id, occasion: `stage:${item.id}:${stage.id}:${now}`, at: now };
}
