import { type Draft } from '../core';
import { AlertTriangle, ArrowRight, BellRing, CalendarClock, Check, CheckCircle2, Copy, CreditCard, FileText, Inbox, Mail, Sparkles, Undo2, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from '../router';
import { CategoryPill, fullName } from '../components/crm';
import { StatTile } from '../components/StatTile';
import { Button, Card, CardHeader, Empty, Pill, Sheet, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { myOpenTasks, overdue, segmentMembers, weekLabels, weeklyCounts } from '../data/derive';
import { DAY, relative, shortDate } from '../data/format';
import { useBackend } from '../data/useBackend';

function greeting(iso: string) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/London' }).format(new Date(iso)));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Evening';
}

export function TodayScreen() {
  const b = useBackend();
  const s = b.state;
  const w = s.world;
  const owner = b.admin.role === 'owner';
  const contacts = b.visibleContacts();
  const now = s.now;

  const stats = useMemo(() => {
    const funnelPeople = contacts.filter((c) => c.lifecycle);
    const newProspects = weeklyCounts(funnelPeople.map((c) => c.createdAt), now);
    const thisWeek = newProspects.at(-1) ?? 0;
    const lastWeek = newProspects.at(-2) ?? 0;
    const endingSoon = segmentMembers(b, 'seg_free_ending_7');
    const paying = contacts.filter((c) => ['active', 'cancelled_active', 'billing_issue'].includes(c.signals.subscription?.status ?? ''));
    const payingTrend = Array.from({ length: 8 }, (_, i) => {
      const at = Date.parse(now) - (7 - i) * 7 * DAY;
      return paying.filter((c) => Date.parse(c.signals.freePeriod?.endsAt ?? c.createdAt) <= at).length;
    });
    return { newProspects, thisWeek, lastWeek, endingSoon, paying, payingTrend };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.version]);

  const tasks = myOpenTasks(b).filter((t) => !t.assigneeId || t.assigneeId === b.admin.id);
  const dueTasks = tasks.filter((t) => t.dueAt && Date.parse(t.dueAt) <= Date.parse(now) + DAY);
  const overdueRows = overdue(b);
  const alerts = owner ? w.alerts.filter((a) => !a.acknowledgedAt) : [];
  const waiting = owner ? w.inbox.filter((m) => m.status === 'waiting_for_you') : [];
  const lastSeen = s.lastSeenAt[b.admin.id] ?? now;
  const problems = s.problems.filter((p) => !p.resolvedAt).length;
  const [openDraft, setOpenDraft] = useState<Draft | null>(null);

  const since = useMemo(() => {
    const entries = w.timeline.filter((e) => e.at > lastSeen && e.at <= now && !e.actor.startsWith(`admin:${b.admin.id}`) && (owner || !e.ownerOnly));
    const count = (pred: (summary: string) => boolean) => entries.filter((e) => pred(e.summary)).length;
    return {
      total: entries.length,
      lines: [
        { n: count((x) => x.startsWith('Signed up')), label: 'signed up' },
        { n: count((x) => x.startsWith('Started signing up')), label: 'started signing up and stopped' },
        { n: count((x) => x.startsWith('Applied')), label: 'applied' },
        { n: count((x) => x.startsWith('Left their email on the website')), label: 'signed up on the website' },
        { n: count((x) => x === 'Verified'), label: 'verified' },
        { n: count((x) => x.startsWith('Became a')), label: 'became Members' },
        { n: count((x) => x.startsWith('Came to')), label: 'came to an event' },
        { n: count((x) => x.startsWith('Registered for')), label: 'registered for an event' },
        { n: count((x) => x.startsWith('Email sent') || x.startsWith('Push sent')), label: 'messages sent by automations' },
        { n: count((x) => x.startsWith('Billing issue')), label: 'payment problems' },
        { n: count((x) => x.startsWith('Cancelled')), label: 'cancelled' },
        { n: count((x) => x.startsWith('Free months ended')), label: 'moved to Guest' },
        { n: count((x) => x === 'Now at risk'), label: 'became at risk' },
        { n: count((x) => x.startsWith('Follow-up task created')), label: 'follow-up tasks created' },
        { n: count((x) => x.startsWith('Unsubscribed')), label: 'unsubscribed' },
      ].filter((l) => l.n > 0),
      agent: owner ? w.inbox.filter((m) => m.receivedAt > lastSeen).length : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.version, lastSeen]);

  const brief = s.briefs.weekly[0];

  return (
    <div className="space-y-6">
      <CrmHeader
        title={`${greeting(now)}, ${b.admin.name.split(' ')[0]}`}
        subtitle={owner ? 'Here’s what needs you, and what happened while you were away.' : 'Your tasks and follow-ups for today.'}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="New prospects"
          hint="this week"
          value={stats.thisWeek}
          trend={stats.newProspects}
          trendLabels={weekLabels(now)}
          delta={stats.lastWeek ? (stats.thisWeek - stats.lastWeek) / stats.lastWeek : null}
          deltaLabel=" vs last week"
          to="/crm/audience/funnel"
        />
        <StatTile label="Free months ending" hint="next 7 days" value={stats.endingSoon.length} to="/crm/segments/seg_free_ending_7" footer="People to convert this week" />
        <StatTile label="Paying members" hint="incl. founding" value={stats.paying.length} trend={stats.payingTrend} trendLabels={weekLabels(now)} to="/crm/audience/funnel" footer={`${segmentMembers(b, 'seg_at_risk').length} at risk`} />
        <StatTile label="Overdue follow-ups" hint="relationships" value={overdueRows.length} to="/crm/tasks" upIsGood={false} footer={overdueRows[0] ? `Oldest: ${overdueRows[0].title}` : 'All caught up'} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs you" icon={<BellRing size={17} className="text-crm-accent" />} hint="Most urgent first" />
            <div className="divide-y divide-crm-line">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  {a.kind === 'billing_issue' ? (
                    <CreditCard size={18} className="mt-0.5 shrink-0 text-crm-warn" />
                  ) : a.kind === 'automation' ? (
                    <Workflow size={18} className="mt-0.5 shrink-0 text-crm-accent" />
                  ) : (
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-crm-bad" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      <Pill tone={a.kind === 'billing_issue' || a.kind === 'system' ? 'warn' : a.kind === 'automation' ? 'accent' : 'bad'}>
                        {a.kind === 'billing_issue' ? 'Payment problem' : a.kind === 'automation' ? 'Automation' : a.kind === 'system' ? 'Inbox agent' : 'Urgent'}
                      </Pill>
                    </div>
                    <div className="mt-0.5 text-[13px] text-crm-ink-3">
                      {a.body} · {relative(a.createdAt, now)}
                      {a.smsSentAt && ' · texted you'}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {a.messageId && (
                      <Link to={`/crm/inbox?m=${a.messageId}`}>
                        <Button size="sm" variant="ghost">
                          Open
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" icon={<Check size={14} />} onClick={() => b.acknowledgeAlert(a.id)} aria-label="Mark as dealt with">
                      <span className="hidden sm:inline">Done</span>
                    </Button>
                  </div>
                </div>
              ))}
              {waiting.length > 0 && (
                <Link to="/crm/inbox" className="flex items-center gap-3 px-5 py-3.5 hover:bg-crm-hover">
                  <Inbox size={18} className="shrink-0 text-crm-accent" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{waiting.length} emails waiting for you</span>
                    <span className="text-crm-ink-3"> · drafts are ready in Gmail for {waiting.filter((m) => m.category !== 'urgent').length}</span>
                  </div>
                  <ArrowRight size={16} className="text-crm-ink-3" />
                </Link>
              )}
              {dueTasks.map((t) => {
                const c = t.contactId ? b.contact(t.contactId) : undefined;
                const late = t.dueAt && Date.parse(t.dueAt) < Date.parse(now);
                const draft = t.link?.kind === 'gmail_draft' ? s.drafts.find((d) => d.id === t.link!.id && d.status === 'open') : undefined;
                return (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <button
                      onClick={() => {
                        b.completeTask(t.id);
                        toast('Task done', 'good');
                      }}
                      className="flex size-5 shrink-0 items-center justify-center rounded-md border border-crm-line-strong hover:border-crm-accent"
                      aria-label={`Mark “${t.title}” done`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{t.title}</div>
                      <div className="text-xs text-crm-ink-3">
                        {late ? <span className="text-crm-bad">Overdue</span> : 'Due today'}
                        {c && (
                          <>
                            {' · '}
                            <Link className="hover:text-crm-ink" to={`/crm/contacts/${c.id}`}>
                              {fullName(c)}
                            </Link>
                          </>
                        )}
                        {t.source !== 'manual' && ` · from ${t.source.replace(/_/g, ' ')}`}
                      </div>
                    </div>
                    {draft && (
                      <Button size="sm" variant="ghost" icon={<FileText size={14} />} onClick={() => setOpenDraft(draft)}>
                        Open draft
                      </Button>
                    )}
                  </div>
                );
              })}
              {owner && problems > 0 && (
                <Link to="/crm/settings/problems" className="flex items-center gap-3 px-5 py-3.5 hover:bg-crm-hover">
                  <AlertTriangle size={18} className="shrink-0 text-crm-warn" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">
                      {problems} problem{problems === 1 ? '' : 's'} to look at
                    </span>
                    <span className="text-crm-ink-3"> · something didn’t send or kept failing</span>
                  </div>
                  <ArrowRight size={16} className="text-crm-ink-3" />
                </Link>
              )}
              {alerts.length === 0 && waiting.length === 0 && dueTasks.length === 0 && problems === 0 && <Empty icon={<CheckCircle2 size={26} />} title="Nothing needs you right now" />}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Overdue follow-ups"
              icon={<CalendarClock size={17} className="text-crm-warn" />}
              right={
                <Link to="/crm/tasks" className="text-sm text-crm-accent-ink hover:underline">
                  See all {overdueRows.length}
                </Link>
              }
            />
            <div className="divide-y divide-crm-line">
              {overdueRows.slice(0, 6).map((r) => (
                <Link key={r.key} to={r.contact ? `/crm/contacts/${r.contact.id}` : `/crm/pipelines/${r.item?.pipelineId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-crm-hover">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.title}</div>
                    <div className="truncate text-xs text-crm-ink-3">{r.sub}</div>
                  </div>
                  <Pill tone={r.daysOverdue > 3 ? 'bad' : 'warn'}>{r.daysOverdue === 0 ? 'Due today' : `${r.daysOverdue}d overdue`}</Pill>
                </Link>
              ))}
              {overdueRows.length === 0 && <Empty title="All caught up" />}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Since you last looked"
              hint={`${relative(lastSeen, now)}`}
              icon={<Undo2 size={17} className="text-crm-ink-3" />}
              right={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    b.markSeen();
                    toast('Marked as seen');
                  }}
                >
                  Mark as seen
                </Button>
              }
            />
            <div className="space-y-2.5 px-5 py-4">
              {since.lines.length === 0 && since.agent === 0 && <div className="text-sm text-crm-ink-3">Nothing new yet.</div>}
              {since.lines.map((l) => (
                <div key={l.label} className="flex items-baseline gap-3 text-sm">
                  <span className="w-8 text-right text-lg font-semibold tabular-nums">{l.n}</span>
                  <span className="text-crm-ink-2">{l.label}</span>
                </div>
              ))}
              {owner && since.agent > 0 && (
                <Link to="/crm/inbox" className="flex items-baseline gap-3 text-sm hover:text-crm-ink">
                  <span className="w-8 text-right text-lg font-semibold tabular-nums">{since.agent}</span>
                  <span className="text-crm-ink-2">emails sorted by the inbox agent</span>
                </Link>
              )}
            </div>
            {owner && (
              <div className="border-t border-crm-line px-5 py-3">
                <div className="mb-2 text-xs text-crm-ink-3">Latest emails</div>
                <div className="space-y-2">
                  {w.inbox
                    .filter((m) => m.category !== 'noise')
                    .sort((a, c) => c.receivedAt.localeCompare(a.receivedAt))
                    .slice(0, 4)
                    .map((m) => (
                      <Link key={m.id} to={`/crm/inbox?m=${m.id}`} className="flex items-center gap-2 text-sm hover:text-crm-ink">
                        <CategoryPill category={m.category} />
                        <span className="truncate text-crm-ink-2">
                          {m.from.name}: {m.subject}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </Card>

          {owner && brief && (
            <Card>
              <CardHeader
                title="This week’s brief"
                hint={`Week of ${shortDate(`${brief.weekOf}T12:00:00Z`)} · ${brief.writtenBy === 'ai' ? 'written up by the AI from your CRM data' : 'from your CRM data'}`}
                icon={<Sparkles size={17} className="text-crm-accent" />}
              />
              <div className="space-y-4 px-5 py-4 text-sm leading-relaxed">
                <div>
                  <div className="label-caps mb-2">Who to contact</div>
                  <ul className="space-y-1.5">
                    {brief.contactThisWeek.map((x) => {
                      const c = b.contact(x.contactId);
                      return c ? (
                        <li key={x.contactId} className="flex gap-2">
                          <span className="text-crm-ink-3">•</span>
                          <span>
                            <Link to={`/crm/contacts/${c.id}`} className="font-medium text-crm-ink hover:text-crm-accent-ink">
                              {fullName(c)}
                            </Link>
                            <span className="text-crm-ink-2">: {x.reason}</span>
                          </span>
                        </li>
                      ) : null;
                    })}
                    {brief.contactThisWeek.length === 0 && <li className="text-crm-ink-3">No one stands out this week.</li>}
                  </ul>
                </div>
                {brief.segmentMoves.length > 0 && (
                  <div>
                    <div className="label-caps mb-2">Growing or slipping</div>
                    <ul className="space-y-1 text-crm-ink-2">
                      {brief.segmentMoves.map((m) => (
                        <li key={m.segmentId}>
                          •{' '}
                          <Link to={`/crm/segments/${m.segmentId}`} className="hover:text-crm-ink">
                            {m.name}
                          </Link>
                          : {m.from} → {m.to}{' '}
                          <span className={m.to > m.from ? 'text-crm-good' : 'text-crm-bad'}>
                            ({m.to > m.from ? '+' : ''}
                            {m.to - m.from})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="label-caps mb-2">This week against last</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(brief.conversion.thisWeek).map(([k, n]) => (
                      <div key={k} className="rounded-xl border border-crm-line p-2.5">
                        <div className="text-lg font-semibold tabular-nums">{n}</div>
                        <div className="text-[11px] text-crm-ink-3">
                          {k} · last week {brief.conversion.lastWeek[k] ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {brief.partnerFollowUpsDue.length > 0 && (
                  <div>
                    <div className="label-caps mb-2">Partner follow-ups due</div>
                    <ul className="space-y-1 text-crm-ink-2">
                      {brief.partnerFollowUpsDue.slice(0, 5).map((p) => (
                        <li key={p.itemId}>
                          • {p.title} · {relative(p.dueAt, now)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <details className="rounded-xl border border-crm-line px-3 py-2">
                  <summary className="cursor-pointer text-xs text-crm-ink-3">The email you got</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-crm-ink-2">{brief.text}</pre>
                </details>
                <p className="text-xs text-crm-ink-3">
                  <Mail size={12} className="mr-1 inline" />
                  Emailed to you at 08:00 on Mondays. The facts always come from the data; the AI only writes them up.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      <DraftSheet draft={openDraft} onClose={() => setOpenDraft(null)} />
    </div>
  );
}

/** An email drafted for Gus (e.g. the investor update). Production: it's a Gmail draft, opened in Gmail. */
function DraftSheet({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const b = useBackend();
  if (!draft) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      title={draft.subject}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={async () => {
              await b.discardDraft(draft.id);
              onClose();
              toast('Draft discarded', 'warn');
            }}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            icon={<Copy size={14} />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.text}`);
                toast('Copied. In the real CRM this is already a draft in your Gmail.');
              } catch {
                toast('Couldn’t copy here. In the real CRM this is already a draft in your Gmail.', 'warn');
              }
            }}
          >
            Copy
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-crm-ink-3">Drafted for you to edit. It never sends itself. In the real CRM it’s saved as a draft in your Gmail, ready to edit and send.</p>
      <pre className="whitespace-pre-wrap rounded-2xl border border-crm-line bg-crm-panel p-4 font-sans text-[14px] leading-relaxed text-crm-ink">{draft.text}</pre>
    </Sheet>
  );
}
