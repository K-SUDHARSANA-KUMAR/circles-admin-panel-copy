import type { AuditEntry } from '../model/audit';
import type { AuditLog, Clock, IdGenerator } from '../ports';

/** Dotted paths whose values differ between two plain objects. */
export function changedPaths(before: unknown, after: unknown, prefix = ''): string[] {
  if (Object.is(before, after)) return [];
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (isObj(before) && isObj(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((k) => changedPaths(before[k], after[k], prefix ? `${prefix}.${k}` : k));
  }
  if (Array.isArray(before) && Array.isArray(after) && JSON.stringify(before) === JSON.stringify(after)) return [];
  return [prefix || '(root)'];
}

export async function recordAudit(
  deps: { audit: AuditLog; clock: Clock; ids: IdGenerator },
  input: { actor: string; action: string; target: string; before?: unknown; after?: unknown },
): Promise<AuditEntry> {
  const entry: AuditEntry = {
    id: deps.ids.next('aud'),
    actor: input.actor,
    action: input.action,
    target: input.target,
    ...(input.before !== undefined ? { before: input.before } : {}),
    ...(input.after !== undefined ? { after: input.after } : {}),
    changedPaths: changedPaths(input.before, input.after),
    at: deps.clock.now().toISOString(),
  };
  await deps.audit.append(entry);
  return entry;
}
