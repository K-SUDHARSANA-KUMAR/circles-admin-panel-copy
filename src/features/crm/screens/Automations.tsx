import { AutomationValidationError, PermissionDeniedError, summariseAutomation, type Automation, type AutomationCategory, type SummaryContext } from '../core';
import { Lock, Workflow } from 'lucide-react';
import { Link } from '../router';
import { Card, Pill, Toggle, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { CrmRequestError, type Backend } from '../data/backend';
import { useBackend } from '../data/useBackend';

export const CATEGORY_LABELS: Record<AutomationCategory, string> = {
  onboarding: 'Getting started',
  conversion: 'Turning guests into members',
  events: 'Events',
  retention: 'Keeping people active',
  service: 'Service messages',
  partners: 'Partners',
  investors: 'Investors',
};

export function summaryContext(b: Backend): SummaryContext {
  return {
    templateName: (id) => b.state.templates.find((t) => t.id === id)?.name,
    templatePurpose: (id) => {
      const t = b.state.templates.find((x) => x.id === id);
      return t ? { messageClass: t.messageClass, ...(t.purpose ? { purpose: t.purpose } : {}) } : undefined;
    },
    segmentName: (id) => b.state.world.segments.find((s) => s.id === id)?.name,
    pipelineName: (id) => b.state.world.pipelines.find((p) => p.id === id)?.name,
    stageName: (pid, sid) => b.state.world.pipelines.find((p) => p.id === pid)?.stages.find((s) => s.id === sid)?.name,
  };
}

/** Switch on or off, explaining in plain English if it can't be switched on. */
export async function toggleAutomation(b: Backend, a: Automation, on: boolean): Promise<boolean> {
  try {
    await b.setAutomationEnabled(a.id, on);
    toast(on ? `${a.name} is on. It only acts on things that happen from now.` : `${a.name} is off. Anyone part-way through stops at their next step.`, on ? 'good' : 'warn');
    return true;
  } catch (e) {
    if (e instanceof AutomationValidationError) toast(`Can’t switch it on yet: ${e.problems.join(' ')}`, 'warn');
    else if (e instanceof PermissionDeniedError || (e instanceof CrmRequestError && e.status === 403)) toast('You don’t have access to switch this on or off', 'warn');
    else if (e instanceof CrmRequestError) toast(e.status === 422 ? `Can’t switch it on yet: ${e.message}` : e.message, 'warn');
    else throw e;
    return false;
  }
}

/** People currently part-way through. */
export const inProgress = (b: Backend, id: string) => b.state.runs.filter((r) => r.automationId === id && (r.status === 'active' || r.status === 'waiting')).length;

export function AutomationsScreen() {
  const b = useBackend();
  const canEdit = b.can('automations.write');
  const visible = b.state.automations.filter((a) => a.category !== 'investors' || b.can('pipelines.investors'));
  const groups = (Object.keys(CATEGORY_LABELS) as AutomationCategory[]).map((cat) => ({ cat, items: visible.filter((a) => a.category === cat) })).filter((g) => g.items.length);
  const on = visible.filter((a) => a.enabled).length;
  return (
    <div className="space-y-6">
      <CrmHeader title="Automations" subtitle={`${on} of ${visible.length} switched on. Everything starts off until you’ve reviewed it.`} />
      {b.state.killSwitches.pauseAllSending && (
        <div className="rounded-2xl border border-crm-warn/40 bg-crm-warn/10 px-4 py-3 text-sm text-crm-warn">
          Pause all sending is on. Automations are holding everyone where they are. When you resume they carry on, and any marketing that would be more than 2 days late is skipped rather than sent late.
        </div>
      )}
      {groups.map((g) => (
        <section key={g.cat}>
          <h3 className="label-caps mb-3">{CATEGORY_LABELS[g.cat]}</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {g.items.map((a) => (
              <AutomationCard key={a.id} a={a} canEdit={canEdit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AutomationCard({ a, canEdit }: { a: Automation; canEdit: boolean }) {
  const b = useBackend();
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-crm-accent/30 bg-crm-accent/10 text-crm-accent">
          <Workflow size={17} />
        </span>
        <Link to={`/crm/automations/${a.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium hover:text-crm-accent-ink">{a.name}</span>
            {a.draftOnly && <Pill icon={<Lock size={11} />}>Draft only</Pill>}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-crm-ink-2">{summariseAutomation(a, summaryContext(b))}</p>
        </Link>
        <Toggle
          checked={a.enabled}
          disabled={!canEdit}
          label={`${a.name} on`}
          onChange={(v) => void toggleAutomation(b, a, v)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-crm-line pt-3 text-xs text-crm-ink-3">
        <span>
          <span className="text-crm-ink">{inProgress(b, a.id)}</span> in it now
        </span>
        <span>
          <span className="text-crm-ink">{a.stats.entered}</span> started
        </span>
        <span>
          <span className="text-crm-ink">{a.stats.sent}</span> sent
        </span>
        <span>
          <span className="text-crm-ink">{a.stats.clicked}</span> clicked
        </span>
        {a.goal && (
          <span>
            <span className="text-crm-ink">{a.stats.converted}</span> {a.goal.label.toLowerCase()}
          </span>
        )}
        <span>
          <span className="text-crm-ink">{a.stats.blocked}</span> held back by the rules
        </span>
      </div>
    </Card>
  );
}
