import { type Task } from '../core';
import { AlarmClock, CalendarClock, Check, CheckCircle2, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../router';
import { fullName } from '../components/crm';
import { Button, Card, CardHeader, Empty, Pill, Tabs, cx, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { overdue } from '../data/derive';
import { DAY, relative, shortDate } from '../data/format';
import { useBackend } from '../data/useBackend';
import { TaskSheet } from './ContactDetail';

type Who = 'mine' | 'everyone';
type When = 'overdue' | 'today' | 'week' | 'later' | 'done';

export function TasksScreen() {
  const b = useBackend();
  const now = b.state.now;
  const [who, setWho] = useState<Who>('mine');
  const [when, setWhen] = useState<When>('overdue');
  const [adding, setAdding] = useState(false);
  const rows = overdue(b);

  const all = b.state.world.tasks.filter((t) => !t.ownerOnly || b.admin.role === 'owner').filter((t) => who === 'everyone' || t.assigneeId === b.admin.id || !t.assigneeId);
  const nowMs = Date.parse(now);
  const endOfToday = (() => {
    const d = new Date(now);
    d.setUTCHours(23, 0, 0, 0);
    return d.getTime();
  })();
  const bucket = (t: Task): When => {
    if (t.status === 'done') return 'done';
    const due = t.dueAt ? Date.parse(t.dueAt) : Infinity;
    if (due < nowMs - 60_000 && due < endOfToday - DAY) return 'overdue';
    if (due <= endOfToday) return due < nowMs ? 'overdue' : 'today';
    if (due <= nowMs + 7 * DAY) return 'week';
    return 'later';
  };
  const counts = { overdue: 0, today: 0, week: 0, later: 0, done: 0 } as Record<When, number>;
  for (const t of all) counts[bucket(t)] += 1;
  const shown = all.filter((t) => bucket(t) === when).sort((a, z) => (when === 'done' ? (z.completedAt ?? '').localeCompare(a.completedAt ?? '') : (a.dueAt ?? '9').localeCompare(z.dueAt ?? '9')));

  return (
    <div className="space-y-5">
      <CrmHeader
        title="Overdue & tasks"
        subtitle="Every relationship past its follow-up date, and everything on your list."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
            Add task
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Overdue follow-ups" hint="Contacts and pipeline cards whose follow-up date has passed" icon={<CalendarClock size={17} className="text-crm-warn" />} right={<Pill tone={rows.length ? 'warn' : 'good'}>{rows.length}</Pill>} />
          <div className="divide-y divide-crm-line">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-3 px-5 py-3">
                <Link to={r.contact ? `/crm/contacts/${r.contact.id}` : `/crm/pipelines/${r.item?.pipelineId}`} className="min-w-0 flex-1 hover:text-crm-accent-ink">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="truncate text-xs text-crm-ink-3">
                    {r.sub}
                    {r.contact && r.kind === 'item' ? ` · ${fullName(r.contact)}` : ''}
                  </div>
                </Link>
                <Pill tone={r.daysOverdue > 3 ? 'bad' : 'warn'}>{r.daysOverdue === 0 ? 'Today' : `${r.daysOverdue}d`}</Pill>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Done: clear the follow-up date"
                    onClick={() => {
                      if (r.item) b.setItemFollowUp(r.item.id, undefined);
                      else if (r.contact) b.setFollowUp(r.contact.id, undefined);
                      toast('Follow-up cleared');
                    }}
                    aria-label="Mark followed up"
                  >
                    <Check size={15} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Snooze 3 days"
                    onClick={() => {
                      const iso = new Date(Date.parse(now) + 3 * DAY).toISOString();
                      if (r.item) b.setItemFollowUp(r.item.id, iso);
                      else if (r.contact) b.setFollowUp(r.contact.id, iso);
                      toast('Snoozed for 3 days');
                    }}
                    aria-label="Snooze 3 days"
                  >
                    <AlarmClock size={15} />
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <Empty icon={<CheckCircle2 size={26} />} title="Nothing overdue" />}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Tasks"
            right={<Tabs<Who> value={who} onChange={setWho} items={[{ value: 'mine', label: 'Mine' }, { value: 'everyone', label: 'Everyone' }]} />}
          />
          <div className="border-b border-crm-line px-4 py-2">
            <Tabs<When>
              value={when}
              onChange={setWhen}
              items={[
                { value: 'overdue', label: 'Overdue', count: counts.overdue },
                { value: 'today', label: 'Today', count: counts.today },
                { value: 'week', label: 'This week', count: counts.week },
                { value: 'later', label: 'Later', count: counts.later },
                { value: 'done', label: 'Done', count: counts.done },
              ]}
            />
          </div>
          <div className="divide-y divide-crm-line">
            {shown.map((t) => {
              const c = t.contactId ? b.contact(t.contactId) : undefined;
              const assignee = b.state.world.admins.find((a) => a.id === t.assigneeId);
              return (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                  <button
                    onClick={() => {
                      b.completeTask(t.id, t.status !== 'done');
                      toast(t.status === 'done' ? 'Reopened' : 'Done');
                    }}
                    className={cx('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border', t.status === 'done' ? 'border-crm-good bg-crm-good/20 text-crm-good' : 'border-crm-line-strong hover:border-crm-accent')}
                    aria-label={t.status === 'done' ? 'Reopen' : 'Mark done'}
                  >
                    {t.status === 'done' && <Check size={13} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cx('text-sm', t.status === 'done' && 'text-crm-ink-3 line-through')}>{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-crm-ink-3">
                      {t.dueAt && <span className={bucket(t) === 'overdue' ? 'text-crm-bad' : ''}>{t.status === 'done' ? `Done ${relative(t.completedAt, now)}` : `Due ${shortDate(t.dueAt, now)}`}</span>}
                      {c && (
                        <Link to={`/crm/contacts/${c.id}`} className="hover:text-crm-ink">
                          {fullName(c)}
                        </Link>
                      )}
                      {who === 'everyone' && assignee && <span>for {assignee.name.split(' ')[0]}</span>}
                      {t.source !== 'manual' && <Pill tone="accent">{{ automation: 'Automation', follow_up_rule: 'Follow-up rule', inbox_agent: 'Inbox agent', brief: 'Weekly brief', manual: '' }[t.source]}</Pill>}
                    </div>
                  </div>
                  {t.status !== 'done' && (
                    <Button size="sm" variant="ghost" onClick={() => b.snoozeTask(t.id, 1)} title="Snooze until tomorrow" aria-label="Snooze until tomorrow">
                      <RotateCcw size={14} />
                    </Button>
                  )}
                </div>
              );
            })}
            {shown.length === 0 && <Empty title="Nothing here" />}
          </div>
        </Card>
      </div>
      <TaskSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
