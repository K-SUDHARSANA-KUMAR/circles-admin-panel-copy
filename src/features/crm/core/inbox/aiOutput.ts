/**
 * Everything the AI returns is checked here before any of it is used. The AI only ever produces
 * data (a category, a summary, the text of a draft); it can't add actions, recipients or tools.
 * Anything that doesn't fit the shape is dropped: a broken classification becomes "Needs me", a
 * broken draft becomes no draft.
 */
import { z } from 'zod/v4';
import { INBOX_CATEGORIES, ROUTINE_TOPICS, type Classification, type InboxRule } from '../model/inbox';

const ROUTINE_IDS = ROUTINE_TOPICS.map((t) => t.id) as [string, ...string[]];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/);

/** Clip text the AI writes: one line, bounded, no control characters. */
const line = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim())
    .pipe(z.string().min(1).max(max * 2))
    .transform((s) => (s.length > max ? `${s.slice(0, max - 1)}…` : s));

const classificationSchema = z.object({
  category: z.enum(INBOX_CATEGORIES),
  routineTopic: z.enum(ROUTINE_IDS).nullish(),
  confidence: z.number().min(0).max(1),
  summary: line(160),
  suggestedNextStep: line(160).nullish(),
  deadline: date.nullish(),
  task: line(160).nullish(),
  followUpDate: date.nullish(),
  reason: line(300),
  instructionsDetected: z.boolean(),
});

export const FALLBACK_CLASSIFICATION: Classification = {
  category: 'needs_me',
  confidence: 0,
  summary: 'Couldn’t be sorted automatically',
  reason: 'The AI’s answer wasn’t in the expected shape, so it’s been left for you',
  instructionsDetected: false,
};

export function parseClassification(raw: unknown): { ok: true; value: Classification } | { ok: false; value: Classification } {
  const r = classificationSchema.safeParse(raw);
  if (!r.success) return { ok: false, value: FALLBACK_CLASSIFICATION };
  const d = r.data;
  const value: Classification = {
    category: d.category,
    confidence: d.confidence,
    summary: d.summary,
    reason: d.reason,
    instructionsDetected: d.instructionsDetected,
    ...(d.category === 'routine' && d.routineTopic ? { routineTopic: d.routineTopic as Classification['routineTopic'] & string } : {}),
    ...(d.suggestedNextStep ? { suggestedNextStep: d.suggestedNextStep } : {}),
    ...(d.deadline ? { deadline: d.deadline } : {}),
    ...(d.task ? { task: d.task } : {}),
    ...(d.followUpDate ? { followUpDate: d.followUpDate } : {}),
  };
  // "Routine" without a topic can't use an approved answer: leave it for Gus.
  if (value.category === 'routine' && !value.routineTopic) return { ok: true, value: { ...value, category: 'needs_me' } };
  return { ok: true, value };
}

const draftSchema = z.object({ text: z.string().min(1).max(4000) });

/** Only the text of a draft is taken from the AI: never a recipient, subject or attachment. */
export function parseDraft(raw: unknown): string | undefined {
  const r = draftSchema.safeParse(raw);
  return r.success ? r.data.text.replace(/\r\n/g, '\n').trim() : undefined;
}

const ruleSchema = z.object({
  kind: z.enum(['from_domain', 'from_email', 'organisation', 'pipeline', 'keywords']),
  value: z.string().min(1).max(200),
  category: z.enum(['urgent', 'needs_me', 'fyi', 'noise']),
  understood: z.string().max(200),
});

/** The AI's reading of a plain-English rule. Gus confirms it before it's saved. */
export function parseRule(raw: unknown, lookup: { orgId(name: string): string | undefined; pipelineId(name: string): string | undefined }): Pick<InboxRule, 'match' | 'category' | 'understood'> | undefined {
  const r = ruleSchema.safeParse(raw);
  if (!r.success || !r.data.understood.trim()) return undefined;
  const { kind, value, category, understood } = r.data;
  const v = value.trim().toLowerCase();
  switch (kind) {
    case 'from_domain':
      return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v.replace(/^@/, '')) ? { match: { kind, domain: v.replace(/^@/, '') }, category, understood } : undefined;
    case 'from_email':
      return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(v) ? { match: { kind, email: v }, category, understood } : undefined;
    case 'organisation': {
      const orgId = lookup.orgId(value);
      return orgId ? { match: { kind, orgId }, category, understood } : undefined;
    }
    case 'pipeline': {
      const pipelineId = lookup.pipelineId(value);
      return pipelineId ? { match: { kind, pipelineId }, category, understood } : undefined;
    }
    case 'keywords': {
      const any = value
        .split(/[,;|]/)
        .map((k) => k.trim())
        .filter((k) => k.length >= 3)
        .slice(0, 20);
      return any.length ? { match: { kind, any }, category, understood } : undefined;
    }
  }
}

export function parseBrief(raw: unknown): string | undefined {
  const r = z.object({ text: z.string().min(20).max(6000) }).safeParse(raw);
  return r.success ? r.data.text.trim() : undefined;
}
