import {
  APP_TRIGGER_EVENTS,
  BLOCK_REASONS,
  describeOnlyIf,
  evaluateGroup,
  DATE_FIELDS,
  EXIT_REASON_LABELS,
  INBOX_CATEGORIES,
  AutomationValidationError,
  OWNER_RUN,
  INBOX_CATEGORY_LABELS,
  membersOf,
  renderTemplate,
  SUBSCRIPTION_TRIGGER_EVENTS,
  summariseAutomation,
  variablesFor,
  type ActionType,
  type Automation,
  type AutomationRun,
  type AutomationStep,
  type Contact,
  type GateDecision,
  type Trigger,
} from '../core';
import { ArrowDown, ArrowLeft, ArrowUp, Clock, Eye, History, Lock, Plus, Send, Target, Trash2, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from '../router';
import { fullName } from '../components/crm';
import { Button, Card, CardHeader, Empty, Field, Pill, Select, Sheet, Toggle, cx, toast } from '../components/ui';
import { dateTime, relative } from '../data/format';
import { useBackend } from '../data/useBackend';
import { CrmRequestError } from '../data/backend';
import { inProgress, summaryContext, toggleAutomation } from './Automations';
import { GroupEditor } from './SegmentEditor';

const APP_EVENT_LABELS: Record<string, string> = {
  'signup.dropped_off': 'Someone stops part-way through signing up',
  'application.submitted': 'Someone applies',
  'application.waiting': 'An application is still waiting',
  verified: 'Someone is verified',
  'friend.first_added': 'Someone adds their first friend',
  'plan.first_created': 'Someone makes their first plan',
  'plan.first_completed_with_friends': 'Someone completes a first plan with friends',
  'event.checked_in': 'Someone checks in at an event',
  inactive: 'Someone hasn’t used the app for a while',
};
const SUB_EVENT_LABELS: Record<string, string> = {
  'free_period.started': 'Free months start',
  subscribed: 'Someone becomes a paying Member',
  cancelled: 'A Member cancels',
  billing_issue: 'A payment fails',
  expired: 'A membership expires',
};
const DATE_LABELS: Record<string, string> = { freePeriodEndsAt: 'Free months end', subscriptionExpiresAt: 'Membership renews', nextFollowUpAt: 'Follow-up date', lastActiveAt: 'Last used the app' };
const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'Send an email',
  send_push: 'Send a push notification',
  create_task: 'Create a task for you',
  notify_owner: 'Notify you',
  change_stage: 'Move them to a pipeline stage',
  add_tag: 'Add a tag',
  create_draft: 'Draft an email for you to edit',
};
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function triggerKey(t: Trigger): string {
  if (t.type === 'app_event') return `app:${t.event}`;
  if (t.type === 'subscription_event') return `sub:${t.event}`;
  return t.type;
}

function TriggerEditor({ trigger, onChange }: { trigger: Trigger; onChange: (t: Trigger) => void }) {
  const b = useBackend();
  const segments = b.state.world.segments;
  const pipelines = b.visiblePipelines();
  const options = [
    ...APP_TRIGGER_EVENTS.map((e) => ({ value: `app:${e}`, label: `In the app: ${APP_EVENT_LABELS[e]}` })),
    ...SUBSCRIPTION_TRIGGER_EVENTS.map((e) => ({ value: `sub:${e}`, label: `Membership: ${SUB_EVENT_LABELS[e]}` })),
    { value: 'date_field', label: 'A date: before or after a date on their record' },
    { value: 'segment_joined', label: 'Someone joins a segment' },
    { value: 'pipeline_stage_changed', label: 'A pipeline card changes stage' },
    { value: 'pipeline_no_reply', label: 'No reply in a pipeline' },
    { value: 'inbound_email_category', label: 'An email comes in of a certain kind' },
    { value: 'schedule', label: 'On a schedule (weekly or monthly)' },
  ];
  const change = (key: string) => {
    if (key.startsWith('app:')) onChange({ type: 'app_event', event: key.slice(4) as Trigger extends { event: infer E } ? E : never, ...(key === 'app:inactive' ? { days: 21 } : {}) } as Trigger);
    else if (key.startsWith('sub:')) onChange({ type: 'subscription_event', event: key.slice(4) } as Trigger);
    else if (key === 'date_field') onChange({ type: 'date_field', field: 'freePeriodEndsAt', offsetDays: -7, atTime: '10:00' });
    else if (key === 'segment_joined') onChange({ type: 'segment_joined', segmentId: segments[0]!.id });
    else if (key === 'pipeline_stage_changed') onChange({ type: 'pipeline_stage_changed', pipelineId: pipelines[0]!.id });
    else if (key === 'pipeline_no_reply') onChange({ type: 'pipeline_no_reply', pipelineId: pipelines[0]!.id, days: 4 });
    else if (key === 'inbound_email_category') onChange({ type: 'inbound_email_category', category: 'needs_me' });
    else onChange({ type: 'schedule', every: 'week', weekday: 2, time: '10:00' });
  };
  return (
    <div className="space-y-3">
      <Select value={triggerKey(trigger)} onChange={change} options={options} ariaLabel="When" />
      {trigger.type === 'app_event' && trigger.event === 'inactive' && (
        <Field label="Days without opening the app">
          <input type="number" min={1} className="input w-28" value={trigger.days ?? 21} onChange={(e) => onChange({ ...trigger, days: Number(e.target.value) || 1 })} />
        </Field>
      )}
      {trigger.type === 'date_field' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date">
            <Select value={trigger.field} onChange={(v) => onChange({ ...trigger, field: v })} options={DATE_FIELDS.map((f) => ({ value: f, label: DATE_LABELS[f] ?? f }))} />
          </Field>
          <Field label="Days (minus = before)">
            <input type="number" className="input" value={trigger.offsetDays} onChange={(e) => onChange({ ...trigger, offsetDays: Number(e.target.value) })} />
          </Field>
          <Field label="At">
            <input type="time" className="input" value={trigger.atTime ?? '10:00'} onChange={(e) => onChange({ ...trigger, atTime: e.target.value })} />
          </Field>
        </div>
      )}
      {trigger.type === 'segment_joined' && <Select value={trigger.segmentId} onChange={(v) => onChange({ ...trigger, segmentId: v })} options={segments.map((s) => ({ value: s.id, label: s.name }))} ariaLabel="Segment" />}
      {(trigger.type === 'pipeline_stage_changed' || trigger.type === 'pipeline_no_reply') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select value={trigger.pipelineId} onChange={(v) => onChange({ ...trigger, pipelineId: v })} options={pipelines.map((p) => ({ value: p.id, label: p.name }))} ariaLabel="Pipeline" />
          {trigger.type === 'pipeline_no_reply' ? (
            <input type="number" min={1} className="input" value={trigger.days} onChange={(e) => onChange({ ...trigger, days: Number(e.target.value) || 1 })} aria-label="Days without a reply" />
          ) : (
            <Select
              value={trigger.stageId ?? ''}
              onChange={(v) => onChange(v ? { ...trigger, stageId: v } : { type: 'pipeline_stage_changed', pipelineId: trigger.pipelineId })}
              options={[{ value: '', label: 'Any stage' }, ...(pipelines.find((p) => p.id === trigger.pipelineId)?.stages.map((s) => ({ value: s.id, label: s.name })) ?? [])]}
              ariaLabel="Stage"
            />
          )}
        </div>
      )}
      {trigger.type === 'inbound_email_category' && (
        <Select value={trigger.category} onChange={(v) => onChange({ ...trigger, category: v })} options={INBOX_CATEGORIES.map((c) => ({ value: c, label: INBOX_CATEGORY_LABELS[c] }))} ariaLabel="Email category" />
      )}
      {trigger.type === 'schedule' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select<'week' | 'month'> value={trigger.every} onChange={(v) => onChange({ ...trigger, every: v })} options={[{ value: 'week', label: 'Every week' }, { value: 'month', label: 'Every month' }]} ariaLabel="How often" />
          {trigger.every === 'week' ? (
            <Select value={String(trigger.weekday ?? 2)} onChange={(v) => onChange({ ...trigger, weekday: Number(v) })} options={WEEKDAYS.map((d, i) => ({ value: String(i), label: `on ${d}` }))} ariaLabel="Day" />
          ) : (
            <input type="number" min={1} max={28} className="input" value={trigger.dayOfMonth ?? 1} onChange={(e) => onChange({ ...trigger, dayOfMonth: Number(e.target.value) || 1 })} aria-label="Day of month" />
          )}
          <input type="time" className="input" value={trigger.time} onChange={(e) => onChange({ ...trigger, time: e.target.value })} aria-label="Time" />
          <Select
            value={trigger.segmentId ?? ''}
            onChange={(v) => onChange(v ? { ...trigger, segmentId: v } : (({ segmentId: _s, ...rest }) => rest)(trigger))}
            options={[{ value: '', label: 'No audience (just me)' }, ...segments.map((s) => ({ value: s.id, label: `for ${s.name}` }))]}
            ariaLabel="Audience"
          />
        </div>
      )}
    </div>
  );
}

function StepEditor({ step, onChange, draftOnly }: { step: AutomationStep; onChange: (s: AutomationStep) => void; draftOnly: boolean }) {
  const b = useBackend();
  if (step.kind === 'wait') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-crm-ink-2">Wait</span>
        <input type="number" min={0} className="input w-20" value={step.days ?? 0} onChange={(e) => onChange({ ...step, days: Number(e.target.value) })} aria-label="Days" />
        <span className="text-crm-ink-2">days</span>
        <input type="number" min={0} max={23} className="input w-20" value={step.hours ?? 0} onChange={(e) => onChange({ ...step, hours: Number(e.target.value) })} aria-label="Hours" />
        <span className="text-crm-ink-2">hours, then at</span>
        <input type="time" className="input w-32" value={step.untilTime ?? ''} onChange={(e) => onChange(e.target.value ? { ...step, untilTime: e.target.value } : (({ untilTime: _u, ...rest }) => rest)(step))} aria-label="At time" />
        <span className="text-xs text-crm-ink-3">(time optional)</span>
      </div>
    );
  }
  const a = step.action;
  const allowed: ActionType[] = draftOnly ? ['create_draft', 'create_task', 'notify_owner'] : (Object.keys(ACTION_LABELS) as ActionType[]);
  const templates = b.state.templates.filter((t) => (a.type === 'send_push' ? t.channel === 'push' : t.channel === 'email'));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select<ActionType> value={a.type} onChange={(v) => onChange({ ...step, action: { type: v } })} options={allowed.map((t) => ({ value: t, label: ACTION_LABELS[t] }))} ariaLabel="Do" />
        {(a.type === 'send_email' || a.type === 'send_push' || a.type === 'create_draft') && (
          <Select value={a.templateId ?? ''} onChange={(v) => onChange({ ...step, action: { ...a, templateId: v } })} options={[{ value: '', label: 'Choose a template…' }, ...templates.map((t) => ({ value: t.id, label: t.name }))]} ariaLabel="Template" />
        )}
        {(a.type === 'create_task' || a.type === 'notify_owner') && <input className="input" placeholder="What should it say?" value={a.text ?? ''} onChange={(e) => onChange({ ...step, action: { ...a, text: e.target.value } })} />}
        {a.type === 'add_tag' && <input className="input" placeholder="Tag" value={a.tag ?? ''} onChange={(e) => onChange({ ...step, action: { ...a, tag: e.target.value } })} />}
      </div>
      {a.templateId && (a.type === 'send_email' || a.type === 'send_push') && (
        <Link to={`/crm/templates/${a.templateId}`} className="text-xs text-crm-accent-ink hover:underline">
          Edit the wording
        </Link>
      )}
      {step.onlyIf ? (
        <div className="rounded-xl border border-crm-line p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-crm-ink-3">
            <span>Only do this if… (checked at the moment it runs)</span>
            <button className="hover:text-crm-ink" onClick={() => onChange((({ onlyIf: _o, ...rest }) => rest)(step))}>
              Remove condition
            </button>
          </div>
          <GroupEditor group={step.onlyIf} onChange={(g) => onChange({ ...step, onlyIf: g })} nested />
        </div>
      ) : (
        <button className="text-xs text-crm-ink-3 hover:text-crm-ink" onClick={() => onChange({ ...step, onlyIf: { match: 'all', conditions: [{ field: 'signals.friendsCount', op: 'lt', value: 1 }] } })}>
          + Only do this if…
        </button>
      )}
    </div>
  );
}

function usePreview(automation: Automation, contact: Contact | undefined) {
  const b = useBackend();
  const [decisions, setDecisions] = useState<Record<string, Verdict>>({});
  const rendered = useMemo(() => {
    if (!contact) return [];
    const nextEvent = b.state.world.lumaEvents.filter((e) => e.startsAt > b.state.now).sort((x, y) => x.startsAt.localeCompare(y.startsAt))[0];
    const venue = nextEvent?.venueOrgId ? b.state.world.organisations.find((o) => o.id === nextEvent.venueOrgId)?.name : undefined;
    return automation.steps.flatMap((s) => {
      if (s.kind !== 'action' || !s.action.templateId) return [];
      const t = b.state.templates.find((x) => x.id === s.action.templateId);
      if (!t) return [];
      const vars = variablesFor(contact, {
        campaign: automation.id,
        ...(contact.orgIds[0] ? { orgName: b.state.world.organisations.find((o) => o.id === contact.orgIds[0])?.name ?? '' } : {}),
        ...(nextEvent ? { event: { name: nextEvent.name, startsAt: nextEvent.startsAt, url: nextEvent.url, ...(venue ? { venueName: venue } : {}) } } : {}),
        month: new Date(b.state.now).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      });
      return [{ step: s, template: t, result: renderTemplate(t, vars) }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation, contact?.id, b.version]);
  useEffect(() => {
    if (!contact) return;
    let live = true;
    (async () => {
      const out: Record<string, Verdict> = {};
      for (const r of rendered) {
        if (r.step.kind !== 'action' || r.step.action.type === 'create_draft') continue;
        if (r.step.onlyIf && !evaluateGroup(contact, r.step.onlyIf, new Date(b.state.now))) {
          out[r.step.id] = { outcome: 'skip', why: describeOnlyIf(r.step.onlyIf) };
          continue;
        }
        // The consent/limit dry run (previewSend) needs the server's records and keys, so the
        // preview only shows the "Only if" check; the server decides at send time.
      }
      if (live) setDecisions(out);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);
  return { rendered, decisions };
}

type Verdict = GateDecision | { outcome: 'skip'; why: string };

function GateVerdict({ d }: { d: Verdict | undefined }) {
  if (!d) return null;
  if (d.outcome === 'skip') return <Pill>Skipped for them: only if {d.why}</Pill>;
  if (d.outcome === 'send') return <Pill tone="good">Would send · {d.basis.replace(/_/g, ' ')}</Pill>;
  if (d.outcome === 'defer') return <Pill tone="warn">Would wait until {dateTime(d.until.toISOString())} ({d.reason === 'quiet_hours' ? 'quiet hours' : 'weekly limit'})</Pill>;
  return <Pill tone="bad">Wouldn’t send: {BLOCK_REASONS[d.reason]}</Pill>;
}

export function AutomationDetail() {
  const { id } = useParams();
  const b = useBackend();
  const saved = b.state.automations.find((a) => a.id === id);
  const [draft, setDraft] = useState<Automation | undefined>(saved);
  const [previewId, setPreviewId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [change, setChange] = useState('');
  const canEdit = b.can('automations.write');

  const candidates = useMemo(() => {
    if (!draft) return [];
    const t = draft.trigger;
    const segId = (t.type === 'segment_joined' || t.type === 'schedule') && t.segmentId ? t.segmentId : undefined;
    const seg = segId ? b.state.world.segments.find((s) => s.id === segId) : undefined;
    const base = b.visibleContacts().filter((c) => c.appUserId || draft.category === 'partners');
    let pool = seg ? membersOf(base, seg.filter, new Date(b.state.now)) : membersOf(base, draft.conditions, new Date(b.state.now));
    // For date triggers, show people the date is still ahead for, soonest first.
    if (t.type === 'date_field' && t.field === 'freePeriodEndsAt') {
      pool = pool.filter((c) => (c.signals.freePeriod?.endsAt ?? '') > b.state.now).sort((x, y) => x.signals.freePeriod!.endsAt.localeCompare(y.signals.freePeriod!.endsAt));
    }
    return pool.slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, b.version]);
  const contact = b.contact(previewId) ?? candidates[0];
  const { rendered, decisions } = usePreview(draft ?? saved!, contact);

  if (!saved || !draft || (saved.category === 'investors' && !b.can('pipelines.investors'))) {
    return (
      <Card>
        <Empty title="Automation not found" />
      </Card>
    );
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const summary = summariseAutomation(draft, summaryContext(b));
  const history = b.state.automationHistory.filter((h) => h.automationId === saved.id);
  const setStep = (i: number, s: AutomationStep) => setDraft({ ...draft, steps: draft.steps.map((x, j) => (j === i ? s : x)) });
  const moveStep = (i: number, d: -1 | 1) => {
    const steps = [...draft.steps];
    const [x] = steps.splice(i, 1);
    steps.splice(i + d, 0, x!);
    setDraft({ ...draft, steps });
  };

  return (
    <div className="space-y-5">
      <Link to="/crm/automations" className="inline-flex items-center gap-1.5 text-sm text-crm-ink-2 hover:text-crm-ink">
        <ArrowLeft size={16} /> Automations
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{draft.name}</h2>
              {saved.draftOnly && <Pill icon={<Lock size={11} />}>Draft only: can never send</Pill>}
              <Pill tone={saved.enabled ? 'good' : 'neutral'}>{saved.enabled ? 'On' : 'Off'}</Pill>
            </div>
            <p className="mt-1 text-sm text-crm-ink-3">{draft.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-crm-ink-2">{saved.enabled ? 'Switched on' : 'Switched off'}</span>
            <Toggle
              checked={saved.enabled}
              disabled={!canEdit || dirty}
              label="Automation on"
              onChange={async (v) => {
                if (await toggleAutomation(b, saved, v)) setDraft({ ...draft, enabled: v });
              }}
            />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-crm-accent/30 bg-crm-accent/[0.07] px-4 py-3 text-[15px] leading-relaxed text-crm-ink">{summary}</div>
        {dirty && canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone="warn">Unsaved changes</Pill>
            <Button variant="primary" size="sm" onClick={() => setSaving(true)}>
              Save changes
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved)}>
              Discard
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className={cx('space-y-5', !canEdit && 'pointer-events-none opacity-90')}>
          <Card>
            <CardHeader title="When" icon={<Zap size={16} className="text-crm-accent" />} hint="What starts it" />
            <div className="p-5">
              <TriggerEditor trigger={draft.trigger} onChange={(trigger) => setDraft({ ...draft, trigger })} />
            </div>
          </Card>
          <Card>
            <CardHeader title="If" hint="Who it applies to. Checked when they start, and again before every step." />
            <div className="p-5">
              <GroupEditor group={draft.conditions} onChange={(conditions) => setDraft({ ...draft, conditions })} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Wait and Do" icon={<Clock size={16} className="text-crm-accent" />} hint="Every message still goes through consent, the weekly limit and quiet hours when it’s sent" />
            <div className="space-y-3 p-5">
              {draft.steps.map((s, i) => (
                <div key={s.id} className="rounded-2xl border border-crm-line bg-crm-panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="label-caps">
                      {i + 1}. {s.kind === 'wait' ? 'Wait' : 'Do'}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label="Move up">
                        <ArrowUp size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={i === draft.steps.length - 1} onClick={() => moveStep(i, 1)} aria-label="Move down">
                        <ArrowDown size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })} aria-label="Remove step">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <StepEditor step={s} onChange={(n) => setStep(i, n)} draftOnly={saved.draftOnly} />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setDraft({ ...draft, steps: [...draft.steps, { id: `w${Date.now()}`, kind: 'wait', days: 1 }] })}>
                  Add a wait
                </Button>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setDraft({ ...draft, steps: [...draft.steps, { id: `a${Date.now()}`, kind: 'action', action: { type: saved.draftOnly ? 'create_draft' : 'send_email' } }] })}>
                  Add an action
                </Button>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Goal, exit and repeats" icon={<Target size={16} className="text-crm-accent" />} />
            <div className="space-y-5 p-5">
              <Field label="Goal (for the conversion stats)">
                <input className="input" value={draft.goal?.label ?? ''} placeholder="e.g. Becomes a Member" onChange={(e) => setDraft({ ...draft, goal: { condition: draft.goal?.condition ?? { match: 'all', conditions: [] }, withinDays: draft.goal?.withinDays ?? 14, label: e.target.value } })} />
              </Field>
              {draft.goal && (
                <div className="space-y-2">
                  <GroupEditor group={draft.goal.condition} onChange={(condition) => setDraft({ ...draft, goal: { ...draft.goal!, condition } })} nested />
                  <div className="flex items-center gap-2 text-sm text-crm-ink-2">
                    within
                    <input type="number" min={1} className="input w-20" value={draft.goal.withinDays} onChange={(e) => setDraft({ ...draft, goal: { ...draft.goal!, withinDays: Number(e.target.value) || 1 } })} />
                    days of the first message
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 text-[13px] font-medium text-crm-ink-2">Stop early when (it always stops if they unsubscribe)</div>
                <GroupEditor group={draft.exitWhen} onChange={(exitWhen) => setDraft({ ...draft, exitWhen })} nested />
              </div>
              <Field label="Can someone go through it more than once?">
                <Select
                  value={draft.reEntry.mode === 'once' ? 'once' : String(draft.reEntry.days)}
                  onChange={(v) => setDraft({ ...draft, reEntry: v === 'once' ? { mode: 'once' } : { mode: 'every', days: Number(v) } })}
                  options={[
                    { value: 'once', label: 'Only ever once' },
                    ...[4, 6, 7, 14, 25, 30, 60, 90].map((d) => ({ value: String(d), label: `Again, but at most every ${d} days` })),
                  ]}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Preview with real data" icon={<Eye size={16} className="text-crm-accent" />} hint="Exactly what this person would get, and whether the rules would let it through right now" />
            <div className="space-y-4 p-5">
              <Select value={contact?.id ?? ''} onChange={setPreviewId} options={candidates.map((c) => ({ value: c.id, label: fullName(c) }))} ariaLabel="Preview for" />
              {rendered.length === 0 && <div className="text-sm text-crm-ink-3">This automation doesn’t send anything to the person.</div>}
              {rendered.map(({ step, template, result }) => (
                <div key={step.id} className="rounded-2xl border border-crm-line">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-crm-line px-4 py-2.5">
                    <span className="text-sm font-medium">{template.name}</span>
                    <GateVerdict d={decisions[step.id]} />
                  </div>
                  {result.missing.length > 0 && <div className="px-4 pt-3 text-xs text-crm-warn">Missing: {result.missing.map((m) => `{${m}}`).join(', ')}. It won’t send to this person.</div>}
                  {result.email && (
                    <div className="px-4 py-3">
                      <div className="text-sm">
                        <span className="text-crm-ink-3">Subject: </span>
                        {result.email.subject}
                      </div>
                      <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-crm-ink-2">{result.email.text}</pre>
                      <Button
                        size="sm"
                        className="mt-3"
                        icon={<Send size={13} />}
                        onClick={async () => {
                          const r = await b.sendTest(template, result.email!);
                          toast(r.status === 'sent' ? `Test sent to ${b.admin.email}.` : (r.reason ?? `Not sent (${r.status}).`), r.status === 'sent' ? 'good' : 'warn');
                        }}
                      >
                        Send test to me
                      </Button>
                    </div>
                  )}
                  {result.push && (
                    <div className="px-4 py-3">
                      <div className="rounded-xl border border-crm-line-strong bg-crm-raised p-3">
                        <div className="text-sm font-semibold">{result.push.title}</div>
                        <div className="text-sm text-crm-ink-2">{result.push.body}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="How it’s doing" />
            <div className="grid grid-cols-3 gap-px bg-crm-line sm:grid-cols-6">
              {[
                ['Started', saved.stats.entered],
                ['Sent', saved.stats.sent],
                ['Opened', saved.stats.opened],
                ['Clicked', saved.stats.clicked],
                [saved.goal?.label ?? 'Converted', saved.stats.converted],
                ['Held back', saved.stats.blocked],
              ].map(([label, n]) => (
                <div key={String(label)} className="bg-crm-card p-3">
                  <div className="text-xl font-semibold tabular-nums">{n}</div>
                  <div className="truncate text-[11px] text-crm-ink-3">{label}</div>
                </div>
              ))}
            </div>
            <p className="px-5 py-3 text-xs text-crm-ink-3">Opens are inflated by Apple Mail’s privacy feature, so clicks and the goal are the numbers to trust.</p>
          </Card>

          <PeopleInIt automationId={saved.id} />

          <Card>
            <CardHeader title="Edit history" icon={<History size={16} className="text-crm-ink-3" />} />
            <div className="divide-y divide-crm-line">
              {history.map((h, i) => (
                <div key={i} className="px-5 py-2.5 text-sm">
                  <div>{h.change}</div>
                  <div className="text-xs text-crm-ink-3">
                    {h.savedBy} · {relative(h.savedAt, b.state.now)} · version {h.version}
                  </div>
                </div>
              ))}
              <div className="px-5 py-2.5 text-sm">
                <div>Pre-built for you, switched off</div>
                <div className="text-xs text-crm-ink-3">version 1</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Sheet
        open={saving}
        onClose={() => setSaving(false)}
        title="Save changes"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaving(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await b.saveAutomation(draft, change.trim() || 'Edited');
                  setSaving(false);
                  setChange('');
                  toast('Saved. The change is in the edit history. Anyone part-way through carries on from the step they’re on.');
                } catch (e) {
                  if (e instanceof AutomationValidationError) toast(`Not saved: ${e.problems.join(' ')}`, 'warn');
                  else if (e instanceof CrmRequestError) toast(e.status === 422 ? `Not saved: ${e.message}` : e.message, 'warn');
                  else throw e;
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="What did you change? (for the history)">
          <input className="input" value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. Wait 2 days instead of 1" autoFocus />
        </Field>
        <p className="mt-3 text-sm text-crm-ink-2">{summary}</p>
      </Sheet>
    </div>
  );
}

function runStatus(run: AutomationRun): { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' | 'accent' } {
  if (run.status === 'active' || run.status === 'waiting') return { label: 'In progress', tone: 'accent' };
  if (run.status === 'completed') return { label: run.converted ? 'Finished · reached the goal' : 'Finished', tone: 'good' };
  if (run.status === 'failed') return { label: 'Failed', tone: 'bad' };
  return { label: run.exitReason ? EXIT_REASON_LABELS[run.exitReason].replace('Stopped: ', 'Stopped · ') : 'Stopped', tone: 'neutral' };
}

/** Everyone who has been through it recently, with what happened at each step. */
function PeopleInIt({ automationId }: { automationId: string }) {
  const b = useBackend();
  const runs = b.runsFor(automationId, 40);
  const now = inProgress(b, automationId);
  return (
    <Card>
      <CardHeader title="Who’s in it" icon={<Users size={16} className="text-crm-accent" />} hint={`${now} part-way through now. Tap someone to see each step.`} />
      {runs.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-crm-ink-3">No one yet. Once it’s on, people appear here as they start.</div>
      ) : (
        <div className="max-h-[420px] divide-y divide-crm-line overflow-y-auto">
          {runs.map((run) => {
            const c = run.contactId === OWNER_RUN ? undefined : b.contact(run.contactId);
            const st = runStatus(run);
            const last = run.history.at(-1);
            return (
              <details key={run.id} className="group px-5 py-2.5">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{run.contactId === OWNER_RUN ? 'You' : c ? fullName(c) : 'Erased contact'}</div>
                    <div className="truncate text-xs text-crm-ink-3">
                      {last?.outcome}
                      {(run.status === 'waiting' || run.status === 'active') && run.nextAt ? ` · next ${dateTime(run.nextAt)}` : ''}
                    </div>
                  </div>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </summary>
                <ol className="mt-2 space-y-1 border-l border-crm-line pl-3 text-xs text-crm-ink-2">
                  {run.history.map((h, i) => (
                    <li key={i}>
                      <span className="text-crm-ink-3">{dateTime(h.at)}</span> · {h.outcome}
                    </li>
                  ))}
                </ol>
                {c && (
                  <Link to={`/crm/contacts/${c.id}`} className="mt-2 inline-block text-xs text-crm-accent-ink hover:underline">
                    Open {c.name.first}’s record
                  </Link>
                )}
              </details>
            );
          })}
        </div>
      )}
    </Card>
  );
}
