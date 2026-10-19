import {
  describeGroup,
  FIELD_BY_ID,
  FIELDS,
  isGroup,
  membersOf,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  type Condition,
  type ConditionGroup,
  type Operator,
  type Segment,
} from '../core';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '../router';
import { Button, Card, CardHeader, Field, Pill, cx, toast } from '../components/ui';
import { num } from '../data/format';
import { useBackend } from '../data/useBackend';
import { PeopleList } from './Audience';

const GROUPS = [...new Set(FIELDS.map((f) => f.group))];

function defaultCondition(): Condition {
  return { field: 'lifecycle.stage', op: 'is', value: 'Guest' };
}

function defaultValue(fieldId: string, op: Operator): Condition['value'] {
  const f = FIELD_BY_ID.get(fieldId);
  if (['is_set', 'is_not_set', 'is_true', 'is_false'].includes(op)) return undefined;
  if (['in_last_days', 'more_than_days_ago', 'in_next_days'].includes(op)) return 7;
  if (f?.type === 'number') return 1;
  if (op === 'is_any_of' || op === 'is_none_of') return f?.options?.[0] ? [f.options[0].value] : [];
  return f?.options?.[0]?.value ?? '';
}

/** One condition row, written to read as a sentence: [field] [operator] [value]. */
export function ConditionRow({ condition, onChange, onRemove }: { condition: Condition; onChange: (c: Condition) => void; onRemove: () => void }) {
  const field = FIELD_BY_ID.get(condition.field);
  const ops = field ? OPERATORS_BY_TYPE[field.type] : [];
  const v = condition.value;
  const needsValue = !['is_set', 'is_not_set', 'is_true', 'is_false'].includes(condition.op);
  const isDays = ['in_last_days', 'more_than_days_ago', 'in_next_days'].includes(condition.op);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-crm-line bg-crm-raised/50 p-2 sm:flex-row sm:items-center">
      <select
        aria-label="Field"
        className="input sm:w-56"
        value={condition.field}
        onChange={(e) => {
          const nf = FIELD_BY_ID.get(e.target.value)!;
          const op = OPERATORS_BY_TYPE[nf.type][0]!;
          onChange({ field: nf.id, op, value: defaultValue(nf.id, op) });
        }}
      >
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {FIELDS.filter((f) => f.group === g).map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select aria-label="Operator" className="input sm:w-44" value={condition.op} onChange={(e) => onChange({ ...condition, op: e.target.value as Operator, value: defaultValue(condition.field, e.target.value as Operator) })}>
        {ops.map((o) => (
          <option key={o} value={o}>
            {o === 'more_than_days_ago' ? 'more than … days ago' : OPERATOR_LABELS[o]}
          </option>
        ))}
      </select>
      {needsValue && (
        <div className="flex flex-1 items-center gap-2">
          {isDays || field?.type === 'number' ? (
            <>
              <input aria-label="Value" type="number" min={0} className="input w-24" value={Number(v ?? 0)} onChange={(e) => onChange({ ...condition, value: Number(e.target.value) })} />
              {isDays && <span className="text-sm text-crm-ink-3">days{condition.op === 'more_than_days_ago' ? ' ago' : ''}</span>}
            </>
          ) : field?.options && (condition.op === 'is_any_of' || condition.op === 'is_none_of') ? (
            <div className="flex flex-wrap gap-1.5">
              {field.options.map((o) => {
                const list = Array.isArray(v) ? v : [];
                const on = list.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange({ ...condition, value: on ? list.filter((x) => x !== o.value) : [...list, o.value] })}
                    className={cx('h-8 rounded-full border px-3 text-xs', on ? 'border-crm-accent bg-crm-accent/15 text-crm-accent-ink' : 'border-crm-line-strong text-crm-ink-2 hover:text-crm-ink')}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ) : field?.options ? (
            <select aria-label="Value" className="input" value={String(v ?? '')} onChange={(e) => onChange({ ...condition, value: e.target.value })}>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input aria-label="Value" className="input" value={String(v ?? '')} placeholder={field?.type === 'list' ? 'e.g. tennis' : 'e.g. London'} onChange={(e) => onChange({ ...condition, value: e.target.value })} />
          )}
        </div>
      )}
      <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove condition" className="self-end sm:self-auto">
        <X size={15} />
      </Button>
    </div>
  );
}

/** A group of conditions, with one level of nested "any of" groups. */
export function GroupEditor({ group, onChange, nested }: { group: ConditionGroup; onChange: (g: ConditionGroup) => void; nested?: boolean }) {
  const set = (i: number, c: Condition | ConditionGroup) => onChange({ ...group, conditions: group.conditions.map((x, j) => (j === i ? c : x)) });
  const remove = (i: number) => onChange({ ...group, conditions: group.conditions.filter((_, j) => j !== i) });
  return (
    <div className={cx('space-y-2', nested && 'rounded-2xl border border-dashed border-crm-line-strong p-3')}>
      <div className="flex items-center gap-2 text-sm text-crm-ink-2">
        <span>{nested ? 'Any of these' : 'People who match'}</span>
        <select aria-label="Match" className="h-8 rounded-lg border border-crm-line-strong bg-crm-raised px-2 text-sm text-crm-ink" value={group.match} onChange={(e) => onChange({ ...group, match: e.target.value as 'all' | 'any' })}>
          <option value="all">all</option>
          <option value="any">any</option>
        </select>
        <span>of:</span>
      </div>
      {group.conditions.map((c, i) =>
        isGroup(c) ? (
          <div key={i} className="relative">
            <GroupEditor group={c} onChange={(g) => set(i, g)} nested />
            <button className="absolute right-2 top-2 rounded p-1 text-crm-ink-3 hover:text-crm-ink" onClick={() => remove(i)} aria-label="Remove group">
              <X size={14} />
            </button>
          </div>
        ) : (
          <ConditionRow key={i} condition={c} onChange={(nc) => set(i, nc)} onRemove={() => remove(i)} />
        ),
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Plus size={14} />} onClick={() => onChange({ ...group, conditions: [...group.conditions, defaultCondition()] })}>
          Add condition
        </Button>
        {!nested && (
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => onChange({ ...group, conditions: [...group.conditions, { match: 'any', conditions: [defaultCondition()] }] })}>
            Add an “any of” group
          </Button>
        )}
      </div>
    </div>
  );
}

export function SegmentEditor() {
  const { id = 'new' } = useParams();
  const b = useBackend();
  const navigate = useNavigate();
  const existing = b.state.world.segments.find((s) => s.id === id);
  const [draft, setDraft] = useState<Segment>(
    () =>
      existing ?? {
        id: `seg_${b.nextId('s')}`,
        name: '',
        filter: { match: 'all', conditions: [defaultCondition()] },
        pinned: true,
        countHistory: [],
        createdBy: b.admin.id,
        createdAt: b.state.now,
        updatedAt: b.state.now,
      },
  );
  const canEdit = b.can('segments.write');
  const members = useMemo(() => membersOf(b.visibleContacts(), draft.filter, new Date(b.state.now)), [draft.filter, b.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const usedBy = b.state.automations.filter((a) => 'segmentId' in a.trigger && a.trigger.segmentId === draft.id);

  return (
    <div className="space-y-5">
      <Link to="/crm/audience/segments" className="inline-flex items-center gap-1.5 text-sm text-crm-ink-2 hover:text-crm-ink">
        <ArrowLeft size={16} /> Segments
      </Link>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title={existing ? 'Edit segment' : 'New segment'} hint="Updates live. Automations can use it as soon as it’s saved." />
          <div className="space-y-5 p-5">
            <Field label="Name">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Guests who came to an event" disabled={!canEdit} />
            </Field>
            <GroupEditor group={draft.filter} onChange={(filter) => setDraft({ ...draft, filter })} />
            <div className="rounded-xl bg-crm-raised px-3 py-2.5 text-sm text-crm-ink-2">
              <span className="text-crm-ink">In plain English: </span>
              {describeGroup(draft.filter)}.
            </div>
            {usedBy.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {usedBy.map((a) => (
                  <Pill key={a.id} tone="accent">
                    Used by {a.name}
                  </Pill>
                ))}
              </div>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={!draft.name.trim()}
                  onClick={async () => {
                    await b.saveSegment(draft);
                    toast('Segment saved');
                    navigate('/crm/audience/segments');
                  }}
                >
                  Save segment
                </Button>
                {existing && usedBy.length === 0 && (
                  <Button
                    variant="danger"
                    icon={<Trash2 size={14} />}
                    onClick={() => {
                      b.deleteSegment(existing.id);
                      toast('Segment deleted', 'warn');
                      navigate('/crm/audience/segments');
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title={`${num(members.length)} people`} hint="Right now" />
          <PeopleList people={members} />
        </Card>
      </div>
    </div>
  );
}
