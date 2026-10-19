/**
 * The exact shape an automation (and a segment filter) may have. Anything saved from the UI or a
 * callable is parsed against this first, so a malformed or tampered payload is refused with a
 * clear message rather than stored. Unknown fields are stripped.
 */
import { z } from 'zod/v4';
import { APP_TRIGGER_EVENTS, DATE_FIELDS, SUBSCRIPTION_TRIGGER_EVENTS, type Automation } from '../model/automation';
import { INBOX_CATEGORIES } from '../model/inbox';
import { OPERATORS, type ConditionGroup } from '../model/segment';
import { FIELD_BY_ID } from '../segments/fields';

const id = z.string().min(1).max(80);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const condition = z.object({
  field: z.string().refine((f) => FIELD_BY_ID.has(f), 'unknown field'),
  op: z.enum(OPERATORS),
  value: z.union([z.string().max(200), z.number(), z.boolean(), z.array(z.string().max(200)).max(50)]).optional(),
});

export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    match: z.enum(['all', 'any']),
    conditions: z.array(z.union([conditionGroupSchema, condition])).max(30),
  }),
);

const trigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('app_event'), event: z.enum(APP_TRIGGER_EVENTS), days: z.number().int().min(1).max(365).optional() }),
  z.object({ type: z.literal('subscription_event'), event: z.enum(SUBSCRIPTION_TRIGGER_EVENTS) }),
  z.object({ type: z.literal('date_field'), field: z.enum(DATE_FIELDS), offsetDays: z.number().int().min(-365).max(365), atTime: hhmm.optional() }),
  z.object({ type: z.literal('segment_joined'), segmentId: id }),
  z.object({ type: z.literal('pipeline_stage_changed'), pipelineId: id, stageId: id.optional() }),
  z.object({ type: z.literal('pipeline_no_reply'), pipelineId: id, days: z.number().int().min(1).max(90) }),
  z.object({ type: z.literal('inbound_email_category'), category: z.enum(INBOX_CATEGORIES) }),
  z.object({
    type: z.literal('schedule'),
    every: z.enum(['week', 'month']),
    weekday: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    time: hhmm,
    segmentId: id.optional(),
  }),
]);

const action = z.object({
  type: z.enum(['send_email', 'send_push', 'create_task', 'notify_owner', 'change_stage', 'add_tag', 'create_draft']),
  templateId: id.optional(),
  text: z.string().max(200).optional(),
  tag: z.string().max(40).optional(),
  pipelineId: id.optional(),
  stageId: id.optional(),
  expiresAfterHours: z.number().int().min(1).max(720).optional(),
});

const step = z.discriminatedUnion('kind', [
  z.object({
    id,
    kind: z.literal('wait'),
    days: z.number().int().min(0).max(365).optional(),
    hours: z.number().int().min(0).max(23).optional(),
    untilWeekday: z.number().int().min(0).max(6).optional(),
    untilTime: hhmm.optional(),
  }),
  z.object({ id, kind: z.literal('action'), action, onlyIf: conditionGroupSchema.optional() }),
]);

/** The editable parts of an automation. Server-owned fields (stats, version, on/off) are filled in by saveAutomation. */
export const editableAutomationSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500),
  trigger,
  conditions: conditionGroupSchema,
  steps: z.array(step).min(1).max(20),
  goal: z.object({ label: z.string().max(80), condition: conditionGroupSchema, withinDays: z.number().int().min(1).max(365) }).optional(),
  exitWhen: conditionGroupSchema,
  reEntry: z.union([z.object({ mode: z.literal('once') }), z.object({ mode: z.literal('every'), days: z.number().int().min(1).max(365) })]),
});

export type EditableAutomation = Pick<Automation, 'id' | 'name' | 'description' | 'trigger' | 'conditions' | 'steps' | 'goal' | 'exitWhen' | 'reEntry'>;

/** Parse, or a list of plain problems. */
export function parseEditableAutomation(input: unknown): { ok: true; value: EditableAutomation } | { ok: false; problems: string[] } {
  const r = editableAutomationSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data as EditableAutomation };
  return { ok: false, problems: r.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || 'automation'}: ${i.message}`) };
}
