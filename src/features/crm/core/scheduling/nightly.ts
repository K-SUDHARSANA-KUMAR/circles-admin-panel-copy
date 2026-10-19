/**
 * Everything that runs once a night, in order. Each part is idempotent on its own; the sweep
 * claims "sweep:<date>" so a doubled scheduler run doesn't repeat it.
 *
 *   1. The daily sweep (lifecycle over time, segments, follow-up rules).
 *   2. Automations triggered by what the sweep found (e.g. joined a segment).
 *   3. Date, inactivity, no-reply and schedule triggers for the next day.
 *   4. Conversions for automations whose goal window is still open.
 *
 * The frequent tick (processDueRuns) then sends whatever comes due.
 */
import { checkGoals, enterFromSignals, planTimedEntries } from '../automations/engine';
import type { CoreDeps } from '../deps';
import { runDailySweep, type SweepResult } from './sweep';

export interface NightlyResult {
  sweep: SweepResult;
  enteredFromSweep: number;
  planned: number;
  conversions: number;
}

export async function runNightly(deps: CoreDeps, options: { force?: boolean } = {}): Promise<NightlyResult> {
  const sweep = await runDailySweep(deps, options);
  if (!sweep.ran) return { sweep, enteredFromSweep: 0, planned: 0, conversions: 0 };
  const fromSweep = await enterFromSignals(deps, sweep.triggers);
  const planned = await planTimedEntries(deps);
  const conversions = await checkGoals(deps);
  deps.logger.info('nightly.ran', { enteredFromSweep: fromSweep.entered.length, planned: planned.entered.length, conversions });
  return { sweep, enteredFromSweep: fromSweep.entered.length, planned: planned.entered.length, conversions };
}
