import { type Pipeline, type PipelineItem, type PipelineStage } from '../core';
import { ArrowDown, ArrowUp, CalendarClock, CheckSquare, GripVertical, Lock, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from '../router';
import { fullName } from '../components/crm';
import { Button, Field, Pill, Select, Sheet, Tabs, Toggle, cx, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { gbp, relative, shortDate } from '../data/format';
import { useBackend } from '../data/useBackend';
import { TaskSheet } from './ContactDetail';

export function followUpSummary(p: Pipeline): string {
  const f = p.followUp;
  if (!f.enabled) return 'No automatic follow-ups for this pipeline.';
  const action =
    f.action === 'send_template' && f.autoSendApproved
      ? `send a follow-up email from the “${f.templateId}” template (at most ${f.maxFollowUps})`
      : 'create a task for the owner';
  return `If there’s no reply ${f.noReplyDays} days after the last email, ${action}. Stops as soon as they reply.`;
}

export function PipelinesScreen() {
  const b = useBackend();
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const pipelines = b.visiblePipelines();
  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0]!;
  const items = b.state.world.pipelineItems.filter((i) => i.pipelineId === pipeline.id);
  const [mobileStage, setMobileStage] = useState(pipeline.stages[0]!.id);
  const [openItem, setOpenItem] = useState<PipelineItem | null>(null);
  const [editingStages, setEditingStages] = useState(false);
  const [editingRule, setEditingRule] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const stages = [...pipeline.stages].sort((a, z) => a.order - z.order);

  return (
    <div className="space-y-5">
      <CrmHeader
        title="Pipelines"
        subtitle="Every partnership, investor, press and creator conversation, kept moving."
        actions={
          <>
            <Button icon={<Settings2 size={15} />} onClick={() => setEditingRule(true)}>
              Follow-up rule
            </Button>
            <Button icon={<Pencil size={15} />} onClick={() => setEditingStages(true)}>
              Edit stages
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
              Add card
            </Button>
          </>
        }
      />
      <Tabs<string>
        value={pipeline.id}
        onChange={(id) => navigate(`/crm/pipelines/${id}`)}
        items={pipelines.map((p) => ({
          value: p.id,
          label: (
            <span className="inline-flex items-center gap-1.5">
              {p.ownerOnly && <Lock size={13} />}
              {p.name}
            </span>
          ),
          count: b.state.world.pipelineItems.filter((i) => i.pipelineId === p.id && !p.stages.find((s) => s.id === i.stageId)?.outcome).length,
        }))}
      />

      <div className="card flex items-start gap-3 px-4 py-3 text-sm">
        <CalendarClock size={17} className="mt-0.5 shrink-0 text-crm-accent" />
        <div className="flex-1 text-crm-ink-2">
          <span className="text-crm-ink">Follow-ups: </span>
          {followUpSummary(pipeline)}
          {pipeline.ownerOnly && <span className="text-crm-ink-3"> Only you can see this pipeline.</span>}
        </div>
        <button className="shrink-0 text-crm-accent-ink hover:underline" onClick={() => setEditingRule(true)}>
          Change
        </button>
      </div>

      {/* Phone: one stage at a time */}
      <div className="md:hidden">
        <Tabs<string>
          value={mobileStage}
          onChange={setMobileStage}
          items={stages.map((s) => ({ value: s.id, label: s.name, count: items.filter((i) => i.stageId === s.id).length }))}
        />
        <div className="mt-3 space-y-2">
          {items
            .filter((i) => i.stageId === mobileStage)
            .map((i) => (
              <ItemCard key={i.id} item={i} onOpen={() => setOpenItem(i)} />
            ))}
          {items.filter((i) => i.stageId === mobileStage).length === 0 && <div className="py-8 text-center text-sm text-crm-ink-3">Nothing in this stage</div>}
        </div>
      </div>

      {/* Desktop: kanban */}
      <div className="hidden gap-3 overflow-x-auto pb-4 md:flex">
        {stages.map((stage) => {
          const col = items.filter((i) => i.stageId === stage.id);
          const value = col.reduce((sum, i) => sum + (i.valueGbp ?? 0), 0);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.id);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) {
                  b.moveItem(dragId, stage.id);
                  toast(`Moved to ${stage.name}`);
                }
                setDragId(null);
                setOverStage(null);
              }}
              className={cx('flex w-[290px] shrink-0 flex-col rounded-2xl border bg-crm-panel p-2 transition-colors', overStage === stage.id ? 'border-crm-accent/60 bg-crm-accent/[0.04]' : 'border-crm-line')}
            >
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {stage.name}
                  <span className="rounded-full bg-crm-raised px-1.5 text-xs font-normal text-crm-ink-3">{col.length}</span>
                  {stage.outcome === 'won' && <Pill tone="good">Won</Pill>}
                  {stage.outcome === 'lost' && <Pill>Closed</Pill>}
                </div>
                {value > 0 && <span className="text-xs text-crm-ink-3">{gbp(value)}</span>}
              </div>
              <div className="flex min-h-[80px] flex-1 flex-col gap-2">
                {col.map((i) => (
                  <ItemCard key={i.id} item={i} onOpen={() => setOpenItem(i)} draggable onDragStart={() => setDragId(i.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {openItem && <ItemSheet item={b.state.world.pipelineItems.find((i) => i.id === openItem.id) ?? openItem} pipeline={pipeline} onClose={() => setOpenItem(null)} />}
      <StagesSheet open={editingStages} onClose={() => setEditingStages(false)} pipeline={pipeline} />
      <RuleSheet open={editingRule} onClose={() => setEditingRule(false)} pipeline={pipeline} />
      <AddItemSheet open={adding} onClose={() => setAdding(false)} pipeline={pipeline} />
    </div>
  );
}

function ItemCard({ item, onOpen, draggable, onDragStart }: { item: PipelineItem; onOpen: () => void; draggable?: boolean; onDragStart?: () => void }) {
  const b = useBackend();
  const now = b.state.now;
  const contact = item.contactId ? b.contact(item.contactId) : undefined;
  const org = item.orgId ? b.state.world.organisations.find((o) => o.id === item.orgId) : undefined;
  const replied = item.lastReplyAt && (!item.lastOutboundAt || item.lastReplyAt > item.lastOutboundAt);
  const overdue = item.nextFollowUpAt && item.nextFollowUpAt < now;
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      onClick={onOpen}
      className="group w-full rounded-xl border border-crm-line bg-crm-card p-3 text-left transition-colors hover:border-crm-line-strong hover:bg-crm-hover"
    >
      <div className="flex items-start gap-2">
        {draggable && <GripVertical size={14} className="mt-0.5 shrink-0 text-crm-ink-3 opacity-0 group-hover:opacity-100" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug">{item.title}</div>
          <div className="mt-0.5 truncate text-xs text-crm-ink-3">{[contact && fullName(contact), org?.name].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {item.valueGbp ? <Pill>{gbp(item.valueGbp)}</Pill> : null}
        {item.nextFollowUpAt && (
          <Pill tone={overdue ? 'bad' : 'neutral'} icon={<CalendarClock size={11} />}>
            {overdue ? `${relative(item.nextFollowUpAt, now).replace(' ago', '')} overdue` : shortDate(item.nextFollowUpAt, now)}
          </Pill>
        )}
        {item.lastOutboundAt && (replied ? <Pill tone="good">Replied</Pill> : <span className="text-[11px] text-crm-ink-3">Emailed {relative(item.lastOutboundAt, now)}, no reply</span>)}
      </div>
    </button>
  );
}

function ItemSheet({ item, pipeline, onClose }: { item: PipelineItem; pipeline: Pipeline; onClose: () => void }) {
  const b = useBackend();
  const contact = item.contactId ? b.contact(item.contactId) : undefined;
  const org = item.orgId ? b.state.world.organisations.find((o) => o.id === item.orgId) : undefined;
  const [tasking, setTasking] = useState(false);
  const stages = [...pipeline.stages].sort((a, z) => a.order - z.order);
  return (
    <Sheet open onClose={onClose} title={item.title}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {contact && (
            <Link className="text-crm-accent-ink hover:underline" to={`/crm/contacts/${contact.id}`}>
              {fullName(contact)}
            </Link>
          )}
          {org && (
            <Link className="text-crm-ink-2 hover:text-crm-ink" to={`/crm/organisations/${org.id}`}>
              {org.name}
            </Link>
          )}
        </div>
        <Field label="Stage">
          <Select
            value={item.stageId}
            onChange={(v) => {
              b.moveItem(item.id, v);
              toast(`Moved to ${stages.find((s) => s.id === v)?.name}`);
            }}
            options={stages.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
        <Field label="Next follow-up">
          <input
            type="date"
            className="input"
            value={item.nextFollowUpAt?.slice(0, 10) ?? ''}
            onChange={(e) => b.setItemFollowUp(item.id, e.target.value ? new Date(`${e.target.value}T09:00:00Z`).toISOString() : undefined)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="card p-3">
            <div className="text-xs text-crm-ink-3">Last email from you</div>
            <div className="mt-0.5">{item.lastOutboundAt ? relative(item.lastOutboundAt, b.state.now) : '—'}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-crm-ink-3">Last reply</div>
            <div className="mt-0.5">{item.lastReplyAt ? relative(item.lastReplyAt, b.state.now) : 'None yet'}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<CheckSquare size={15} />} onClick={() => setTasking(true)}>
            Add a task
          </Button>
          {contact && (
            <>
              <Button
                variant="ghost"
                onClick={async () => {
                  await b.recordOutbound(contact.id);
                  toast('Logged. The no-reply clock starts now.');
                }}
              >
                I just emailed them
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await b.recordReply(contact.id);
                  toast('Logged. Follow-ups stop until you email them again.');
                }}
              >
                They replied
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-crm-ink-3">Once Gmail is connected, emails to and from them are logged automatically.</p>
      </div>
      <TaskSheet open={tasking} onClose={() => setTasking(false)} {...(contact ? { contact } : {})} pipelineItemId={item.id} />
    </Sheet>
  );
}

function StagesSheet({ open, onClose, pipeline }: { open: boolean; onClose: () => void; pipeline: Pipeline }) {
  const b = useBackend();
  const [stages, setStages] = useState<PipelineStage[]>(() => [...pipeline.stages].sort((a, z) => a.order - z.order));
  const [lastId, setLastId] = useState(pipeline.id);
  if (lastId !== pipeline.id) {
    setLastId(pipeline.id);
    setStages([...pipeline.stages].sort((a, z) => a.order - z.order));
  }
  const used = (id: string) => b.state.world.pipelineItems.some((i) => i.pipelineId === pipeline.id && i.stageId === id);
  const move = (i: number, d: -1 | 1) =>
    setStages((s) => {
      const next = [...s];
      const [x] = next.splice(i, 1);
      next.splice(i + d, 0, x!);
      return next.map((st, order) => ({ ...st, order }));
    });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Stages in ${pipeline.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={stages.some((s) => !s.name.trim())}
            onClick={async () => {
              await b.savePipeline({ ...pipeline, stages });
              toast('Stages saved');
              onClose();
            }}
          >
            Save stages
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <input className="input" value={s.name} onChange={(e) => setStages((all) => all.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))} aria-label={`Stage ${i + 1} name`} />
            <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
              <ArrowUp size={14} />
            </Button>
            <Button size="sm" variant="ghost" disabled={i === stages.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
              <ArrowDown size={14} />
            </Button>
            <Button size="sm" variant="ghost" disabled={used(s.id)} title={used(s.id) ? 'Move the cards out first' : 'Remove'} onClick={() => setStages((all) => all.filter((x) => x.id !== s.id))} aria-label="Remove stage">
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setStages((s) => [...s, { id: `stage-${Date.now()}`, name: 'New stage', order: s.length }])}>
          Add a stage
        </Button>
        <p className="pt-2 text-xs text-crm-ink-3">Renaming a stage keeps every card in it. A stage with cards in it can’t be removed until they’re moved.</p>
      </div>
    </Sheet>
  );
}

function RuleSheet({ open, onClose, pipeline }: { open: boolean; onClose: () => void; pipeline: Pipeline }) {
  const b = useBackend();
  const [rule, setRule] = useState(pipeline.followUp);
  const [lastId, setLastId] = useState(pipeline.id);
  if (lastId !== pipeline.id) {
    setLastId(pipeline.id);
    setRule(pipeline.followUp);
  }
  const owner = b.can('settings.write');
  const businessTemplates = b.state.templates.filter((t) => t.messageClass === 'business' && t.id !== 'investor-update');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Follow-ups for ${pipeline.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              await b.savePipeline({ ...pipeline, followUp: rule });
              toast('Follow-up rule saved');
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Follow up automatically when they don’t reply</span>
          <Toggle checked={rule.enabled} onChange={(v) => setRule({ ...rule, enabled: v })} label="Follow-ups on" />
        </div>
        <Field label="Wait this many days after your last email">
          <input type="number" min={1} max={30} className="input w-28" value={rule.noReplyDays} onChange={(e) => setRule({ ...rule, noReplyDays: Number(e.target.value) || 1 })} />
        </Field>
        <Field label="Then">
          <Select<'create_task' | 'send_template'>
            value={rule.action}
            onChange={(v) => setRule({ ...rule, action: v })}
            options={[
              { value: 'create_task', label: 'Create a task for the owner (recommended)' },
              { value: 'send_template', label: 'Send a follow-up email from a template' },
            ]}
          />
        </Field>
        {rule.action === 'send_template' && (
          <div className="space-y-4 rounded-2xl border border-crm-line p-4">
            <Field label="Template">
              <Select value={rule.templateId ?? ''} onChange={(v) => setRule({ ...rule, templateId: v })} options={[{ value: '', label: 'Choose…' }, ...businessTemplates.map((t) => ({ value: t.id, label: t.name }))]} />
            </Field>
            <Field label="At most this many follow-ups">
              <input type="number" min={1} max={3} className="input w-28" value={rule.maxFollowUps} onChange={(e) => setRule({ ...rule, maxFollowUps: Number(e.target.value) || 1 })} />
            </Field>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <div>Allow it to send without me</div>
                <div className="text-xs text-crm-ink-3">{owner ? 'Off means you get a task with the draft instead.' : 'Only Gus can switch this on.'}</div>
              </div>
              <Toggle checked={rule.autoSendApproved} disabled={!owner} onChange={(v) => setRule({ ...rule, autoSendApproved: v })} label="Allow auto-send" />
            </div>
          </div>
        )}
        <div className="rounded-xl bg-crm-raised px-3 py-2.5 text-sm text-crm-ink-2">{followUpSummary({ ...pipeline, followUp: rule })}</div>
      </div>
    </Sheet>
  );
}

function AddItemSheet({ open, onClose, pipeline }: { open: boolean; onClose: () => void; pipeline: Pipeline }) {
  const b = useBackend();
  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const options = b
    .visibleContacts()
    .filter((c) => !c.lifecycle || c.types.some((t) => ['VenuePartner', 'BrandPartner', 'Investor', 'Press', 'Creator', 'Other'].includes(t)))
    .sort((a, z) => a.name.first.localeCompare(z.name.first));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Add to ${pipeline.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            onClick={() => {
              const c = contactId ? b.contact(contactId) : undefined;
              b.addItem({ pipelineId: pipeline.id, stageId: [...pipeline.stages].sort((a, z) => a.order - z.order)[0]!.id, title: title.trim(), ...(c ? { contactId: c.id } : {}), ...(c?.orgIds[0] ? { orgId: c.orgIds[0] } : {}) });
              setTitle('');
              toast('Card added');
              onClose();
            }}
          >
            Add card
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="What is it?">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Halfmoon Social: Thursday evenings" autoFocus />
        </Field>
        <Field label="Who’s it with?">
          <Select value={contactId} onChange={setContactId} options={[{ value: '', label: 'Nobody yet' }, ...options.map((c) => ({ value: c.id, label: `${fullName(c)}${c.jobTitle ? ` (${c.jobTitle})` : ''}` }))]} />
        </Field>
      </div>
    </Sheet>
  );
}
