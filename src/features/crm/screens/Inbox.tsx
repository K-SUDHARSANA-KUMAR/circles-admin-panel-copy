import { INBOX_CATEGORIES, INBOX_CATEGORY_LABELS, ROUTINE_TOPICS, type AgentAction, type AnswerTemplate, type InboxCategory, type InboxMessage, type InboxRule, type InboxSettings } from '../core';
import { AlertTriangle, Bot, CheckCircle2, FileText, ListChecks, Mail, MessageSquare, PenLine, RotateCcw, ShieldAlert, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from '../router';
import { CategoryPill, fullName } from '../components/crm';
import { Button, Card, CardHeader, Empty, Field, Pill, Select, Sheet, Tabs, Toggle, cx, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { dateTime, relative } from '../data/format';
import { useBackend } from '../data/useBackend';

type Tab = 'messages' | 'rules' | 'log' | 'digest';

export const WHAT_IT_DOES: Record<InboxCategory, string> = {
  urgent: 'Texted you, labelled it and added a task',
  needs_me: 'Saved a draft reply in Gmail and added a task',
  routine: 'Saved a draft reply in Gmail',
  fyi: 'Labelled it',
  noise: 'Labelled it (never deleted or archived)',
};

function whatItDid(m: InboxMessage): string {
  if (m.status === 'queued') return 'Waiting: the agent was off when it arrived';
  if (m.autoReplied) return 'Sent your approved answer automatically';
  if (m.suspicious && m.category !== 'urgent') return m.draftId ? 'Flagged for you, drafted a reply, no auto-reply' : 'Flagged for you. No auto-reply.';
  return WHAT_IT_DOES[m.category];
}

export function InboxScreen() {
  const { tab = 'messages' } = useParams();
  const navigate = useNavigate();
  const b = useBackend();
  const waiting = b.state.world.inbox.filter((m) => m.status === 'waiting_for_you').length;
  const queued = b.state.world.inbox.filter((m) => m.status === 'queued').length;
  return (
    <div className="space-y-5">
      <CrmHeader title="Inbox" subtitle="Your Gmail, sorted. The agent drafts and labels; you decide what gets sent." />
      {b.state.killSwitches.inboxAgentOff && (
        <div className="rounded-2xl border border-crm-warn/40 bg-crm-warn/10 px-4 py-3 text-sm text-crm-warn">
          The inbox agent is off. It isn’t reading, labelling or drafting anything. {queued > 0 && `${queued} email${queued === 1 ? '' : 's'} will be sorted when you switch it back on (no automatic replies to those).`}
        </div>
      )}
      <Tabs<Tab>
        value={tab as Tab}
        onChange={(t) => navigate(`/crm/inbox/${t}`)}
        items={[
          { value: 'messages', label: 'Emails', count: waiting },
          { value: 'rules', label: 'Rules & answers' },
          { value: 'log', label: 'What the agent did' },
          { value: 'digest', label: 'Daily digest' },
        ]}
      />
      {tab === 'messages' && <Messages />}
      {tab === 'rules' && <Rules />}
      {tab === 'log' && <ActivityLog />}
      {tab === 'digest' && <Digest />}
    </div>
  );
}

function Messages() {
  const b = useBackend();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<InboxCategory | 'all' | 'waiting'>('waiting');
  const all = [...b.state.world.inbox].sort((a, z) => z.receivedAt.localeCompare(a.receivedAt));
  const sorted = all.filter((m) => m.status !== 'queued');
  const shown = all.filter((m) => (filter === 'all' ? true : filter === 'waiting' ? m.status === 'waiting_for_you' || m.status === 'queued' : m.category === filter && m.status !== 'queued'));
  const openId = params.get('m');
  const open = openId ? b.state.world.inbox.find((m) => m.id === openId) : undefined;
  return (
    <>
      <Tabs<InboxCategory | 'all' | 'waiting'>
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'waiting', label: 'Waiting for you', count: all.filter((m) => m.status === 'waiting_for_you' || m.status === 'queued').length },
          ...INBOX_CATEGORIES.map((c) => ({ value: c, label: INBOX_CATEGORY_LABELS[c], count: sorted.filter((m) => m.category === c).length })),
          { value: 'all', label: 'All', count: all.length },
        ]}
      />
      <Card>
        <div className="divide-y divide-crm-line">
          {shown.map((m) =>
            m.status === 'queued' ? (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 text-sm text-crm-ink-3">
                <Pill tone="warn">Not sorted yet</Pill>
                An email arrived while the agent was off · {relative(m.receivedAt, b.state.now)}
              </div>
            ) : (
              <button key={m.id} type="button" onClick={() => setParams({ m: m.id })} className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-crm-hover">
                <div className="w-[88px] shrink-0 pt-0.5">
                  <CategoryPill category={m.category} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx('text-sm', m.status === 'waiting_for_you' ? 'font-semibold' : 'font-medium text-crm-ink-2')}>{m.from.name || m.from.email}</span>
                    {m.suspicious && (
                      <Pill tone="bad" icon={<ShieldAlert size={11} />}>
                        Suspicious
                      </Pill>
                    )}
                    {m.autoReplied && <Pill tone="good">Answered</Pill>}
                    {m.deadline && <Pill tone="warn">Deadline {relative(m.deadline, b.state.now)}</Pill>}
                    <span className="ml-auto text-xs text-crm-ink-3">{relative(m.receivedAt, b.state.now)}</span>
                  </div>
                  <div className="truncate text-sm text-crm-ink">{m.subject}</div>
                  <div className="truncate text-[13px] text-crm-ink-3">{m.summary}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-crm-ink-3">
                    <Bot size={12} />
                    {whatItDid(m)}
                  </div>
                </div>
              </button>
            ),
          )}
          {shown.length === 0 && <Empty icon={<CheckCircle2 size={26} />} title="Nothing here" />}
        </div>
      </Card>
      {open && open.status !== 'queued' && <MessageSheet m={open} onClose={() => setParams({})} />}
    </>
  );
}

function ActionRow({ a, compact = false }: { a: AgentAction; compact?: boolean }) {
  const b = useBackend();
  const undo = async () => {
    const r = await b.undoAgentAction(a.id);
    if (r.undone) toast(r.description, 'good');
    else toast(r.reason, 'warn');
  };
  const blocked = a.kind === 'blocked';
  return (
    <div className={cx('flex items-start gap-3', compact ? 'py-2' : 'px-5 py-3')}>
      <span className={cx('mt-0.5 shrink-0', blocked ? 'text-crm-bad' : 'text-crm-ink-3')}>{blocked ? <ShieldCheck size={15} /> : <Bot size={15} />}</span>
      <div className="min-w-0 flex-1 text-sm">
        <div className={cx(a.undoneAt && 'text-crm-ink-3 line-through')}>{a.description}</div>
        {blocked && a.refusedBecause && <div className="text-xs text-crm-bad">Refused: {a.refusedBecause}</div>}
        <div className="text-xs text-crm-ink-3">
          {a.reasoning}
          {!compact && ` · ${relative(a.at, b.state.now)}`}
          {a.undoneAt && ' · undone'}
        </div>
      </div>
      {!a.undoneAt && a.undoable && (
        <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={undo}>
          Undo
        </Button>
      )}
      {!a.undoneAt && a.kind === 'send_template_reply' && (
        <Button size="sm" variant="ghost" icon={<PenLine size={13} />} onClick={undo}>
          Draft a correction
        </Button>
      )}
    </div>
  );
}

function MessageSheet({ m, onClose }: { m: InboxMessage; onClose: () => void }) {
  const b = useBackend();
  const contact = m.contactId ? b.contact(m.contactId) : undefined;
  const email = b.state.mailbox.messages[m.id];
  const draft = m.draftId ? b.state.drafts.find((d) => d.id === m.draftId) : undefined;
  const reply = b.state.mailbox.sent.find((s) => s.key === `autoreply_${m.id}`);
  const step = (a: AgentAction) => Number(a.id.slice(a.id.lastIndexOf('_') + 1)) || 0;
  const actions = b.state.agentActions.filter((a) => a.messageId === m.id).sort((x, y) => step(x) - step(y));
  const canSeeContent = b.can('email.content.read');
  return (
    <Sheet
      open
      onClose={onClose}
      title={m.subject}
      wide
      footer={
        <>
          {m.status !== 'done' && (
            <Button
              variant="primary"
              onClick={() => {
                void b.setMessageStatus(m.id, 'done');
                toast('Marked as dealt with');
                onClose();
              }}
            >
              Mark as dealt with
            </Button>
          )}
          <Button onClick={() => toast('Gmail isn’t connected yet, so the email can’t be opened from here.', 'warn')} icon={<Mail size={15} />}>
            Open in Gmail
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CategoryPill category={m.category} />
          <span className="text-crm-ink-2">
            From {m.from.name} &lt;{m.from.email}&gt; · {dateTime(m.receivedAt)}
          </span>
        </div>
        {m.suspicious && (
          <div className="flex gap-2 rounded-xl border border-crm-bad/40 bg-crm-bad/10 p-3 text-sm text-crm-ink-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-crm-bad" />
            <div>
              <span className="font-medium text-crm-bad">This email tries to give the agent instructions.</span> The agent ignored them: it can only label, draft to the sender, add tasks and tell you, and it never auto-replies to an email like this.
              <ul className="mt-1.5 list-disc pl-4 text-xs text-crm-ink-3">
                {m.suspiciousSignals.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="card p-3 text-sm">
            <div className="text-xs text-crm-ink-3">In one line</div>
            <div className="mt-0.5">{m.summary}</div>
            {m.suggestedNextStep && <div className="mt-1 text-xs text-crm-ink-3">Next: {m.suggestedNextStep}</div>}
          </div>
          <div className="card p-3 text-sm">
            <div className="text-xs text-crm-ink-3">Why {INBOX_CATEGORY_LABELS[m.category]}</div>
            <div className="mt-0.5 text-[13px] text-crm-ink-2">{m.reasons.join(' · ')}</div>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-crm-ink-3">Linked to: </span>
          {contact ? (
            <Link to={`/crm/contacts/${contact.id}`} className="text-crm-accent-ink hover:underline" onClick={onClose}>
              {fullName(contact)}
            </Link>
          ) : (
            <span className="text-crm-ink-2">no contact (an automated sender)</span>
          )}
        </div>

        {reply && (
          <div className="rounded-2xl border border-crm-good/40 bg-crm-good/5 p-4">
            <div className="mb-1 text-xs text-crm-ink-3">Sent automatically to {reply.to} (your approved answer)</div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-crm-ink-2">{reply.text}</pre>
          </div>
        )}
        {draft && (
          <div className="rounded-2xl border border-crm-accent/40 bg-crm-accent/[0.06] p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-crm-ink-3">
              Draft reply in your Gmail, to {draft.to}
              {draft.status !== 'open' && <Pill>{draft.status}</Pill>}
            </div>
            {m.draftFlagged && (
              <div className="mb-2 text-xs text-crm-bad">
                Check before sending: it mentions {m.draftFlagged.join(' and ')}. It would never be sent automatically.
              </div>
            )}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-crm-ink">{draft.text}</pre>
          </div>
        )}
        {m.autoReplyBlockedBecause && <div className="text-xs text-crm-ink-3">Not answered automatically: {m.autoReplyBlockedBecause}</div>}

        <div>
          <div className="label-caps mb-1">What the agent did</div>
          <div className="divide-y divide-crm-line">
            {actions.map((a) => (
              <ActionRow key={a.id} a={a} compact />
            ))}
          </div>
        </div>

        <div>
          <div className="label-caps mb-2">The email</div>
          {canSeeContent && email ? (
            <pre className="whitespace-pre-wrap rounded-2xl border border-crm-line bg-crm-raised p-4 font-sans text-sm leading-relaxed text-crm-ink-2">{email.text}</pre>
          ) : (
            <div className="rounded-xl border border-crm-line p-3 text-sm text-crm-ink-3">You can see the summary but not the email itself. Gus can switch that on for you.</div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Rules() {
  const b = useBackend();
  const s = b.state.inboxSettings;
  const owner = b.can('inbox.rules.write');
  const [text, setText] = useState('');
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<Pick<InboxRule, 'match' | 'category' | 'understood'>>();
  const save = async (next: InboxSettings, msg: string) => {
    try {
      await b.saveInboxSettings(next);
      toast(msg);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'warn');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="Rules and the urgent list" hint="Rules run first. An urgent rule always wins; a noise rule can quieten an email, but never one that looks urgent." icon={<ListChecks size={16} className="text-crm-accent" />} />
          <div className="border-b border-crm-line p-5">
            <Field label="Add a rule in plain English" hint="e.g. anything from @birley.com is urgent · newsletters from “Growthly” are noise">
              <div className="flex gap-2">
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="anything from @birley.com is urgent" disabled={!owner} />
                <Button
                  disabled={!owner || !text.trim() || checking}
                  onClick={async () => {
                    setChecking(true);
                    const u = await b.understandRule(text);
                    setChecking(false);
                    if (!u) toast('I didn’t understand that. Try “anything from @company.com is urgent”.', 'warn');
                    setPending(u);
                  }}
                >
                  {checking ? 'Checking…' : 'Check'}
                </Button>
              </div>
            </Field>
            {pending && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-crm-accent/40 bg-crm-accent/10 p-3 text-sm">
                <span className="flex-1">
                  I understood: <span className="font-medium">{pending.understood}</span>
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    await save({ ...s, rules: [...s.rules, { ...pending, id: `r_${Date.now()}`, text: text.trim(), enabled: true, createdAt: b.state.now }] }, 'Rule added. It runs exactly as shown.');
                    setPending(undefined);
                    setText('');
                  }}
                >
                  That’s right, add it
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPending(undefined)}>
                  No
                </Button>
              </div>
            )}
          </div>
          <div className="divide-y divide-crm-line">
            {s.rules.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{r.understood}</div>
                  <div className="text-xs text-crm-ink-3">“{r.text}”</div>
                </div>
                <CategoryPill category={r.category} />
                <Toggle size="sm" checked={r.enabled} disabled={!owner} label={`Rule ${r.text}`} onChange={(v) => save({ ...s, rules: s.rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) }, v ? 'Rule on' : 'Rule off')} />
                {owner && (
                  <button className="rounded p-1 text-crm-ink-3 hover:text-crm-bad" aria-label="Delete rule" onClick={() => save({ ...s, rules: s.rules.filter((x) => x.id !== r.id) }, 'Rule removed')}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Answers />
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader title="Routine emails" hint="Drafts by default. Auto-reply only where you switch it on." icon={<MessageSquare size={16} className="text-crm-accent" />} />
          <div className="space-y-1 p-5">
            {ROUTINE_TOPICS.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm">{t.label}</span>
                <Select<'draft' | 'auto'>
                  value={s.routineModes[t.id]}
                  onChange={(v) => save({ ...s, routineModes: { ...s.routineModes, [t.id]: v } }, v === 'auto' ? `${t.label}: auto-reply on (approved answer only)` : `${t.label}: drafts only`)}
                  options={[
                    { value: 'draft', label: 'Draft for me' },
                    { value: 'auto', label: 'Auto-reply' },
                  ]}
                  className={cx('h-9 w-40 text-[13px]', !owner && 'pointer-events-none opacity-60')}
                />
              </div>
            ))}
            <div className="pt-3">
              <Field label={`Only auto-reply when it’s at least ${Math.round(s.confidenceThreshold * 100)}% sure`}>
                <input type="range" min={0.7} max={0.99} step={0.01} value={s.confidenceThreshold} disabled={!owner} onChange={(e) => save({ ...s, confidenceThreshold: Number(e.target.value) }, 'Threshold updated')} className="w-full accent-[var(--color-crm-accent)]" />
              </Field>
            </div>
            <p className="pt-1 text-xs text-crm-ink-3">
              An auto-reply is always your approved answer, word for word (only the first name filled in), to the person who wrote in, once per conversation, within 2 hours, and never to an email that looks suspicious or comes from a mailing list.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Urgent alerts" icon={<AlertTriangle size={16} className="text-crm-bad" />} />
          <div className="grid gap-4 p-5">
            <Field label="Text urgent emails to" hint="Full number with country code. At most 10 texts an hour.">
              <input className="input" placeholder="+447700900123" defaultValue={s.alertPhone ?? ''} disabled={!owner} onBlur={(e) => e.target.value !== (s.alertPhone ?? '') && save({ ...s, ...(e.target.value ? { alertPhone: e.target.value.replace(/\s/g, '') } : {}) }, 'Number saved')} />
            </Field>
            <Field label="Treat a deadline as urgent if it’s within">
              <Select value={String(s.deadlineHours)} onChange={(v) => save({ ...s, deadlineHours: Number(v) }, 'Updated')} options={[24, 48, 72].map((h) => ({ value: String(h), label: `${h} hours` }))} />
            </Field>
            <Field label="Daily digest at">
              <input type="time" className="input w-32" value={s.dailyDigestTime} disabled={!owner} onChange={(e) => save({ ...s, dailyDigestTime: e.target.value }, 'Digest time updated')} />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Answers() {
  const b = useBackend();
  const owner = b.can('inbox.rules.write');
  const [editing, setEditing] = useState<AnswerTemplate | null>(null);
  const topic = (id: string) => ROUTINE_TOPICS.find((t) => t.id === id)?.label ?? id;
  return (
    <Card>
      <CardHeader title="Approved answers" hint="The only wording the agent may ever send by itself. Editing an answer withdraws approval until you approve it again." icon={<ShieldCheck size={16} className="text-crm-accent" />} />
      <div className="divide-y divide-crm-line">
        {b.state.answers.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm">{a.name}</div>
              <div className="text-xs text-crm-ink-3">
                {topic(a.category)} · version {a.version}
              </div>
            </div>
            {a.approvedAt ? <Pill tone="good">Approved</Pill> : <Pill tone="warn">Not approved</Pill>}
            {owner && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                {a.approvedAt ? 'Edit' : 'Review'}
              </Button>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <Sheet
          open
          onClose={() => setEditing(null)}
          title={editing.name}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await b.saveAnswer(editing, false);
                    toast('Saved, not approved: it will only be used for drafts.', 'warn');
                    setEditing(null);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : String(e), 'warn');
                  }
                }}
              >
                Save without approving
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    await b.saveAnswer(editing, true);
                    toast('Approved. It can be sent automatically where you’ve switched auto-reply on.');
                    setEditing(null);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : String(e), 'warn');
                  }
                }}
              >
                Approve
              </Button>
            </>
          }
        >
          <Field label="The answer" hint="Only {first_name} can be filled in, so an answer can never include anyone else’s details.">
            <textarea className="input min-h-[260px] py-2.5 leading-relaxed" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          </Field>
        </Sheet>
      )}
    </Card>
  );
}

function ActivityLog() {
  const b = useBackend();
  const [only, setOnly] = useState<'all' | 'blocked'>('all');
  const actions = [...b.state.agentActions].filter((a) => only === 'all' || a.kind === 'blocked').sort((x, y) => y.at.localeCompare(x.at) || y.id.localeCompare(x.id)).slice(0, 200);
  const subject = (id: string) => b.state.world.inbox.find((m) => m.id === id);
  return (
    <Card>
      <CardHeader
        title="Everything the agent did, and why"
        hint="With undo wherever it can be undone"
        icon={<Tag size={16} className="text-crm-accent" />}
        right={
          <Tabs<'all' | 'blocked'>
            value={only}
            onChange={setOnly}
            items={[
              { value: 'all', label: 'All' },
              { value: 'blocked', label: 'Refused', count: b.state.agentActions.filter((a) => a.kind === 'blocked').length },
            ]}
          />
        }
      />
      <div className="divide-y divide-crm-line">
        {actions.map((a, i) => {
          const m = subject(a.messageId);
          const first = i === 0 || actions[i - 1]!.messageId !== a.messageId;
          return (
            <div key={a.id}>
              {first && m && (
                <Link to={`/crm/inbox/messages?m=${m.id}`} className="block bg-crm-panel px-5 pt-3 text-xs text-crm-ink-3 hover:text-crm-ink">
                  {m.from.name || m.from.email}: “{m.subject}”
                </Link>
              )}
              <ActionRow a={a} />
            </div>
          );
        })}
        {actions.length === 0 && <Empty title="Nothing yet" />}
      </div>
    </Card>
  );
}

function Digest() {
  const b = useBackend();
  const digest = b.state.briefs.digests[0];
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Daily digest" hint={digest ? `Sent ${dateTime(digest.generatedAt)}. Emailed to you at ${b.state.inboxSettings.dailyDigestTime} and shown on Today.` : `Emailed to you at ${b.state.inboxSettings.dailyDigestTime} and shown on Today`} icon={<FileText size={16} className="text-crm-accent" />} />
      <div className="space-y-4 p-5 text-sm leading-relaxed">
        {digest ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-crm-ink-2">{digest.text}</pre> : <p className="text-crm-ink-3">The first digest goes out at {b.state.inboxSettings.dailyDigestTime}.</p>}
      </div>
    </Card>
  );
}
