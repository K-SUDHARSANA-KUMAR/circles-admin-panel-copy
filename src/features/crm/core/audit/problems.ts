/** Report a problem for Settings → Problems. Never throws: reporting must not break the work itself. */
import type { CoreDeps } from '../deps';
import type { Problem } from '../model/problem';

export async function reportProblem(deps: Partial<Pick<CoreDeps, 'problems' | 'logger'>> & Pick<CoreDeps, 'clock'>, p: Omit<Problem, 'at'>): Promise<void> {
  if (!deps.problems) return;
  try {
    await deps.problems.report({ ...p, at: deps.clock.now().toISOString() });
  } catch (e) {
    deps.logger?.error('problems.report_failed', { id: p.id, error: e instanceof Error ? e.name : 'unknown' });
  }
}
