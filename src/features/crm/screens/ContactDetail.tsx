import {
  CONTACT_TYPE_LABELS,
  PURPOSE_LABELS,
  PURPOSES,
  renderTemplate,
  variablesFor,
  type AppProfile,
  type Contact,
  type SubscriptionInfo,
  type SuppressionScope,
  type Template,
  type TimelineEntry,
} from '../core';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckSquare,
  Download,
  ExternalLink,
  Mail,
  MessageSquare,
  RadioTower,
  Send,
  ShieldCheck,
  Smartphone,
  StickyNote,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '../router';
import { ConsentBadge, ConsentLine, StageBadge, TypeChips, fullName } from '../components/crm';
import { Avatar, Button, Card, CardHeader, Empty, Field, KeyValue, Pill, Select, Sheet, Tabs, cx, toast } from '../components/ui';
import { DAY, dateTime, longDate, relative, shortDate } from '../data/format';
import { fetchLiveData } from '../data/backend';
import { useBackend } from '../data/useBackend';
import { TagSheet } from './Contacts';

/**
 * Whether they're on the suppression list. The list holds keyed hashes made with a server-side
 * secret, so the browser can't check it. TODO(devs): return it from GET contacts/:id/live.
 */
function useSuppression(_contact: Contact | undefined): SuppressionScope | undefined {
  return undefined;
}

/** Their live app profile and subscription, read from the app's own records on the server. */
function useLiveData(contact: Contact | undefined) {
  const [live, setLive] = useState<{ profile: AppProfile | null; subscription: SubscriptionInfo | null } | null>(null);
  useEffect(() => {
    let current = true;
    setLive(null);
    if (!contact || (!contact.appUserId && !contact.revenueCatId)) return;
    fetchLiveData(contact.id)
      .then((r) => current && setLive(r))
      .catch(() => current && setLive({ profile: null, subscription: null }));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id, contact?.appUserId, contact?.revenueCatId]);
  return live;
}

type TimelineFilter = 'all' | 'email' | 'app' | 'membership' | 'events' | 'notes' | 'consent';
const FILTER_KINDS: Record<TimelineFilter, TimelineEntry['kind'][] | null> = {
  all: null,
  email: ['email_in', 'email_out', 'push_out'],
  app: ['app_milestone'],
  membership: ['subscription'],
  events: ['event'],
  notes: ['note', 'task'],
  consent: ['consent'],
};

const KIND_ICON: Partial<Record<TimelineEntry['kind'], typeof Mail>> = {
  email_in: Mail,
  email_out: Send,
  push_out: Smartphone,
  note: StickyNote,
  task: CheckSquare,
  consent: ShieldCheck,
  event: CalendarClock,
  subscription: RadioTower,
};

export function ContactDetail() {
  const { id } = useParams();
  const b = useBackend();
  const navigate = useNavigate();
  const contact = id ? b.contact(id) : undefined;
  const suppression = useSuppression(contact);
  const live = useLiveData(contact);
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [tasking, setTasking] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  if (!contact || (contact.ownerOnly && b.admin.role !== 'owner')) {
    return (
      <Card>
        <Empty icon={<UserRound size={28} />} title="Contact not found">
          They may have been erased, or you may not have access.
        </Empty>
      </Card>
    );
  }
  const now = b.state.now;
  const w = b.state.world;
  const org = contact.orgIds[0] ? w.organisations.find((o) => o.id === contact.orgIds[0]) : undefined;
  const timeline = w.timeline
    .filter((e) => e.contactId === contact.id)
    .filter((e) => !FILTER_KINDS[filter] || FILTER_KINDS[filter]!.includes(e.kind))
    .sort((a, z) => z.at.localeCompare(a.at));
  const items = w.pipelineItems.filter((i) => i.contactId === contact.id && (!i.ownerOnly || b.admin.role === 'owner'));
  const tasks = w.tasks.filter((t) => t.contactId === contact.id && t.status === 'open');
  const profile = live?.profile ?? undefined;
  const sub = live?.subscription ?? undefined;
  const regs = w.registrations.filter((r) => r.contactId === contact.id);
  const owner = b.admin.role === 'owner';

  return (
    <div className="space-y-5">
      <Link to="/crm/contacts" className="inline-flex items-center gap-1.5 text-sm text-crm-ink-2 hover:text-crm-ink">
        <ArrowLeft size={16} /> Contacts
      </Link>

      {/* Header */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Avatar name={fullName(contact)} size={56} tone={contact.appUserId ? 'accent' : 'neutral'} />
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight">{fullName(contact)}</h2>
              <div className="mt-0.5 text-sm text-crm-ink-2">
                {contact.jobTitle}
                {contact.jobTitle && org && ' at '}
                {org && (
                  <Link to={`/crm/organisations/${org.id}`} className="text-crm-ink hover:text-crm-accent-ink">
                    {org.name}
                  </Link>
                )}
                {!contact.jobTitle && !org && (contact.signals.city ?? contact.emails[0]?.address)}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StageBadge contact={contact} />
                <TypeChips types={contact.types} skipLifecycle={!!contact.lifecycle} />
                {contact.signals.subscription?.tier === 'founding' && <Pill tone="good">Founding Member</Pill>}
                {contact.tags.map((t) => (
                  <Pill key={t}>#{t}</Pill>
                ))}
                <button onClick={() => setTagging(true)} className="h-6 rounded-full border border-dashed border-crm-line-strong px-2.5 text-xs text-crm-ink-3 hover:text-crm-ink">
                  + tag
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="primary" icon={<Send size={15} />} onClick={() => setSending(true)}>
              Send email
            </Button>
            <Button icon={<CheckSquare size={15} />} onClick={() => setTasking(true)}>
              Add task
            </Button>
            {contact.appUserId && (
              <Link to="/elsewhere/users">
                <Button icon={<ExternalLink size={15} />}>Open full profile</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-crm-line pt-4 sm:grid-cols-3">
          <Field label="Owner">
            <Select value={contact.ownerId ?? ''} onChange={(v) => b.setOwner(contact.id, v)} options={[{ value: '', label: 'Nobody' }, ...w.admins.map((a) => ({ value: a.id, label: a.name }))]} />
          </Field>
          <Field label="Next follow-up" hint={contact.nextFollowUpAt && contact.nextFollowUpAt < now ? <span className="text-crm-bad">Overdue</span> : undefined}>
            <input
              type="date"
              className="input"
              value={contact.nextFollowUpAt?.slice(0, 10) ?? ''}
              onChange={(e) => {
                b.setFollowUp(contact.id, e.target.value ? new Date(`${e.target.value}T09:00:00Z`).toISOString() : undefined);
                toast(e.target.value ? 'Follow-up date set' : 'Follow-up cleared');
              }}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-crm-ink-2">What we can send</span>
            <div className="flex h-10 items-center">
              <ConsentLine contact={contact} {...(suppression ? { suppressedScope: suppression } : {})} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Timeline */}
        <Card>
          <CardHeader title="Timeline" hint="Emails, app milestones, membership, events, notes, tasks and every automated action" />
          <div className="border-b border-crm-line px-5 py-3">
            <textarea className="textarea min-h-[72px]" placeholder={`Add a note about ${contact.name.first}…`} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="primary"
                disabled={!note.trim()}
                onClick={async () => {
                  await b.addNote(contact.id, note.trim());
                  setNote('');
                  toast('Note added');
                }}
              >
                Add note
              </Button>
            </div>
          </div>
          <div className="px-4 pt-3">
            <Tabs<TimelineFilter>
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: 'All' },
                { value: 'email', label: 'Emails' },
                { value: 'app', label: 'App' },
                { value: 'membership', label: 'Membership' },
                { value: 'events', label: 'Events' },
                { value: 'notes', label: 'Notes & tasks' },
                { value: 'consent', label: 'Consent' },
              ]}
            />
          </div>
          <ol className="relative px-5 py-4">
            {timeline.map((e) => {
              const Icon = KIND_ICON[e.kind] ?? RadioTower;
              const auto = e.actor.startsWith('system:automation') || e.actor.startsWith('system:inbox');
              return (
                <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-crm-line-strong bg-crm-raised text-crm-ink-2">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="text-crm-ink">{e.summary}</span>
                      {auto && <Pill tone="accent">Automated</Pill>}
                    </div>
                    {e.body && <div className="mt-1 whitespace-pre-line rounded-xl border border-crm-line bg-crm-raised px-3 py-2 text-sm text-crm-ink-2">{e.body}</div>}
                    <div className="mt-0.5 text-xs text-crm-ink-3" title={dateTime(e.at)}>
                      {relative(e.at, now)} · {describeActor(e.actor, b)}
                    </div>
                  </div>
                </li>
              );
            })}
            {timeline.length === 0 && <Empty title="Nothing here yet" />}
          </ol>
        </Card>

        <div className="space-y-5">
          {profile && (
            <Card>
              <CardHeader title="In the app" right={<Pill tone="info" title="Read from the app each time you open this page. Not stored in the CRM.">Live from the app</Pill>} />
              <div className="divide-y divide-crm-line px-5">
                <KeyValue label="Status">{profile.status === 'active' ? 'Active' : profile.status}</KeyValue>
                <KeyValue label="Joined">{shortDate(profile.joinedAt, now)}</KeyValue>
                {profile.verifiedAt && <KeyValue label="Verified">{shortDate(profile.verifiedAt, now)}</KeyValue>}
                <KeyValue label="Invited by">
                  {profile.invitedBy ? (
                    <InviterLink name={profile.invitedBy.name} appUserId={profile.invitedBy.appUserId} />
                  ) : (
                    'Applied directly'
                  )}
                </KeyValue>
                <KeyValue label="Friends">
                  {profile.friends.length}
                  {profile.friends.length > 0 && <span className="text-crm-ink-3"> · {profile.friends.slice(0, 3).map((f) => f.name.split(' ')[0]).join(', ')}{profile.friends.length > 3 ? '…' : ''}</span>}
                </KeyValue>
                <KeyValue label="Plans">
                  {contact.signals.plansCount ?? 0}
                  <span className="text-crm-ink-3"> · {contact.signals.plansWithFriendsCount ?? 0} with friends</span>
                </KeyValue>
                <KeyValue label="Events attended">{profile.eventsAttended.length}</KeyValue>
                <KeyValue label="Brought in">{contact.signals.invitedJoined ?? 0} people ({contact.signals.invitedActive ?? 0} still active)</KeyValue>
                <KeyValue label="Interests">{profile.interests.join(', ') || '—'}</KeyValue>
                <KeyValue label="City">{profile.city ?? '—'}</KeyValue>
                <KeyValue label="Last used the app">{relative(profile.lastActiveAt, now)}</KeyValue>
                <KeyValue label="Notifications">{profile.pushEnabled ? 'Allowed' : 'Not allowed'}</KeyValue>
              </div>
              {profile.plans.length > 0 && (
                <div className="border-t border-crm-line px-5 py-3">
                  <div className="mb-1.5 text-xs text-crm-ink-3">Recent plans</div>
                  {profile.plans.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex justify-between gap-2 py-0.5 text-sm">
                      <span className="truncate">{p.title}</span>
                      <span className="shrink-0 text-crm-ink-3">{p.withFriends ? `${p.withFriends} friends` : 'solo'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {sub && (
            <Card>
              <CardHeader title="Membership" right={<Pill tone="info" title="Read live from RevenueCat">Live from RevenueCat</Pill>} />
              <div className="divide-y divide-crm-line px-5">
                <KeyValue label="Status">
                  {{ free_period: 'Free 3 months', active: 'Paying', cancelled_active: 'Cancelled (active until it ends)', billing_issue: 'Payment problem', expired: 'Expired', none: 'Not a member' }[sub.status]}
                </KeyValue>
                {sub.tier && <KeyValue label="Tier">{sub.tier === 'founding' ? 'Founding Member' : 'Member'}</KeyValue>}
                {sub.freePeriod && (
                  <KeyValue label="Free months">
                    {shortDate(sub.freePeriod.startedAt, now)} → {shortDate(sub.freePeriod.endsAt, now)}
                    {sub.status === 'free_period' && <span className="text-crm-ink-3"> ({Math.max(0, Math.ceil((Date.parse(sub.freePeriod.endsAt) - Date.parse(now)) / DAY))} days left)</span>}
                  </KeyValue>
                )}
                {sub.store && <KeyValue label="Paid through">{sub.store === 'app_store' ? 'App Store' : 'Google Play'} · £{sub.priceGbp}/month</KeyValue>}
                {sub.expiresAt && <KeyValue label={sub.willRenew ? 'Renews' : 'Ends'}>{longDate(sub.expiresAt)}</KeyValue>}
              </div>
            </Card>
          )}

          <ConsentCard contact={contact} suppression={suppression} />

          {(items.length > 0 || tasks.length > 0) && (
            <Card>
              <CardHeader title="Pipelines and tasks" />
              <div className="divide-y divide-crm-line">
                {items.map((i) => {
                  const p = w.pipelines.find((x) => x.id === i.pipelineId)!;
                  return (
                    <Link key={i.id} to={`/crm/pipelines/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-crm-hover">
                      <span className="truncate">{i.title}</span>
                      <Pill tone="accent">
                        {p.name}: {p.stages.find((s) => s.id === i.stageId)?.name}
                      </Pill>
                    </Link>
                  );
                })}
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <button className="size-4 shrink-0 rounded border border-crm-line-strong hover:border-crm-accent" aria-label="Done" onClick={() => b.completeTask(t.id)} />
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.dueAt && <span className={cx('text-xs', t.dueAt < now ? 'text-crm-bad' : 'text-crm-ink-3')}>{shortDate(t.dueAt, now)}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {regs.length > 0 && (
            <Card>
              <CardHeader title="Events (Luma)" />
              <div className="divide-y divide-crm-line">
                {regs
                  .map((r) => ({ r, e: w.lumaEvents.find((e) => e.id === r.lumaEventId)! }))
                  .sort((a, z) => z.e.startsAt.localeCompare(a.e.startsAt))
                  .slice(0, 6)
                  .map(({ r, e }) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <span className="truncate">{e.name}</span>
                      <span className="shrink-0 text-xs text-crm-ink-3">
                        {shortDate(e.startsAt, now)} · {r.checkedInAt ? 'came' : e.startsAt > now ? 'registered' : 'didn’t come'}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {b.can('automations.read') && <ContactAutomations contactId={contact.id} />}

          <Card>
            <CardHeader title="Details" />
            <div className="divide-y divide-crm-line px-5">
              {contact.emails.map((e) => (
                <KeyValue key={e.address} label={e.kind === 'business' ? 'Work email' : 'Email'}>
                  <span className="break-all">{e.address}</span>
                </KeyValue>
              ))}
              {contact.phones.map((p) => (
                <KeyValue key={p.e164} label="Phone">
                  {p.e164}
                </KeyValue>
              ))}
              <KeyValue label="Types">{contact.types.map((t) => CONTACT_TYPE_LABELS[t]).join(', ')}</KeyValue>
              <KeyValue label="Came from">{contact.source.detail ?? contact.source.channel}</KeyValue>
              {contact.dropOff && <KeyValue label="Stopped at">{contact.dropOff.lastStep ?? contact.dropOff.point.replace(/_/g, ' ')}</KeyValue>}
              <KeyValue label="Time zone">{contact.timezone}</KeyValue>
              <KeyValue label="In the CRM since">{shortDate(contact.createdAt, now)}</KeyValue>
            </div>
            {owner && (
              <div className="flex flex-wrap gap-2 border-t border-crm-line px-5 py-4">
                <Button
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={async () => {
                    const data = await b.exportContact(contact.id);
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${contact.name.first}-${contact.name.last ?? ''}-data.json`.toLowerCase();
                    a.click();
                    URL.revokeObjectURL(url);
                    toast('Exported everything the CRM holds on them');
                  }}
                >
                  Export their data
                </Button>
                <Button
                  size="sm"
                  icon={<Ban size={14} />}
                  disabled={suppression === 'all'}
                  onClick={async () => {
                    await b.suppressContact(contact.id, 'do_not_contact');
                    toast('Marked “never contact”. Nothing will be sent to them.', 'warn');
                  }}
                >
                  Never contact
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmErase(true)}>
                  Erase
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <SendEmailSheet open={sending} onClose={() => setSending(false)} contact={contact} />
      <TaskSheet open={tasking} onClose={() => setTasking(false)} contact={contact} />
      <TagSheet
        open={tagging}
        onClose={() => setTagging(false)}
        onSave={(tag) => {
          b.setTags(contact.id, [...new Set([...contact.tags, tag])]);
          setTagging(false);
          toast(`Tagged “${tag}”`);
        }}
      />
      <Sheet
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        title={`Erase ${contact.name.first}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmErase(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await b.eraseContact(contact.id);
                setConfirmErase(false);
                toast('Erased. Only a one-way hash stays on the suppression list.', 'warn');
                navigate('/crm/contacts');
              }}
            >
              Erase everything
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-crm-ink-2">
          <p>This deletes everything the CRM holds on them: the record, consent history, timeline, messages sent, tasks and event registrations. It can’t be undone.</p>
          <p>A one-way hash of their email and phone stays on the suppression list so they’re never added to marketing again by mistake.</p>
          <p className="text-crm-ink-3">It doesn’t delete their app account or anything in your Gmail. Do those separately if they asked.</p>
        </div>
      </Sheet>
    </div>
  );
}

function InviterLink({ name, appUserId }: { name: string; appUserId: string }) {
  const b = useBackend();
  const inviter = b.state.world.contacts.find((c) => c.appUserId === appUserId);
  return inviter ? (
    <Link to={`/crm/contacts/${inviter.id}`} className="text-crm-accent-ink hover:underline">
      {name}
    </Link>
  ) : (
    <>{name}</>
  );
}

function describeActor(actor: string, b: ReturnType<typeof useBackend>) {
  if (actor.startsWith('admin:')) return b.state.world.admins.find((a) => a.id === actor.slice(6))?.name ?? 'Admin';
  if (actor.startsWith('contact:')) return 'them';
  const sys = actor.replace('system:', '');
  return { app: 'the app', luma: 'Luma', revenuecat: 'RevenueCat', consent: 'consent record', resend: 'email provider', framer: 'website form', 'send-service': 'CRM' }[sys] ?? (sys.startsWith('automation') ? 'automation' : sys);
}

function ConsentCard({ contact, suppression }: { contact: Contact; suppression: SuppressionScope | undefined }) {
  const b = useBackend();
  const ledger = b.state.world.consentLedger.filter((r) => r.contactId === contact.id).sort((a, z) => z.capturedAt.localeCompare(a.capturedAt));
  const [history, setHistory] = useState(false);
  return (
    <Card>
      <CardHeader title="Consent" hint="Checked again at the moment of every send" icon={<ShieldCheck size={16} className="text-crm-good" />} />
      {suppression && (
        <div className={cx('mx-5 mt-4 rounded-xl border px-3 py-2 text-sm', suppression === 'all' ? 'border-crm-bad/40 bg-crm-bad/10 text-crm-bad' : 'border-crm-warn/40 bg-crm-warn/10 text-crm-warn')}>
          {suppression === 'all' ? 'On the suppression list: nothing at all can be sent to them.' : 'Unsubscribed: only essential service emails (like a payment problem) can go.'}
        </div>
      )}
      <div className="px-5 py-3">
        <div className="mb-1 text-xs text-crm-ink-3">Email</div>
        {PURPOSES.map((p) => {
          const v = contact.consent.email?.[p];
          return (
            <div key={p} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span>{PURPOSE_LABELS[p]}</span>
              <span className="flex items-center gap-2">
                {v && <span className="hidden text-xs text-crm-ink-3 sm:inline">{v.source}{v.wordingVersion ? ` · ${v.wordingVersion}` : ''} · {shortDate(v.at)}</span>}
                <ConsentBadge value={v} />
              </span>
            </div>
          );
        })}
        <div className="mb-1 mt-3 text-xs text-crm-ink-3">Push notifications</div>
        <div className="flex items-center justify-between py-1.5 text-sm">
          <span>Allowed on their phone</span>
          {contact.signals.pushEnabled ? <Pill tone="good">Yes</Pill> : <Pill>No</Pill>}
        </div>
        {PURPOSES.filter((p) => contact.consent.push?.[p]?.status === 'withdrawn').map((p) => (
          <div key={p} className="flex items-center justify-between py-1.5 text-sm">
            <span>{PURPOSE_LABELS[p]}</span>
            <Pill tone="bad">Switched off in app</Pill>
          </div>
        ))}
      </div>
      {b.admin.role === 'owner' && (
        <div className="border-t border-crm-line px-5 py-3">
          <button className="text-sm text-crm-accent-ink hover:underline" onClick={() => setHistory((h) => !h)}>
            {history ? 'Hide' : 'Show'} full consent history ({ledger.length})
          </button>
          {history && (
            <ul className="mt-2 space-y-1.5 text-xs text-crm-ink-2">
              {ledger.map((r) => (
                <li key={r.id}>
                  <span className="text-crm-ink">{shortDate(r.capturedAt)}</span> · {r.channel} {PURPOSE_LABELS[r.purpose].toLowerCase()}: <span className={r.status === 'granted' ? 'text-crm-good' : 'text-crm-bad'}>{r.status}</span>
                  {r.basis ? ` (${r.basis.replace('_', ' ')})` : ''} · {r.source} · {r.method.replace(/_/g, ' ')}
                  {r.wordingVersion ? ` · ${r.wordingVersion}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export function SendEmailSheet({ open, onClose, contact }: { open: boolean; onClose: () => void; contact: Contact }) {
  const b = useBackend();
  const templates = b.state.templates.filter((t) => t.channel === 'email' && t.id !== 'investor-update');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const template: Template | undefined = templates.find((t) => t.id === templateId);
  const orgName = contact.orgIds[0] ? b.state.world.organisations.find((o) => o.id === contact.orgIds[0])?.name : undefined;
  const nextEvent = b.state.world.lumaEvents.filter((e) => e.startsAt > b.state.now && e.kind === 'members_evening').sort((a, z) => a.startsAt.localeCompare(z.startsAt))[0];
  const venue = nextEvent?.venueOrgId ? b.state.world.organisations.find((o) => o.id === nextEvent.venueOrgId)?.name : undefined;
  const rendered = useMemo(
    () =>
      template
        ? renderTemplate(
            template,
            variablesFor(contact, {
              ...(orgName ? { orgName } : {}),
              ...(nextEvent ? { event: { name: nextEvent.name, startsAt: nextEvent.startsAt, url: nextEvent.url, ...(venue ? { venueName: venue } : {}) } } : {}),
              campaign: template.id,
            }),
          )
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateId, contact.id],
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Email ${contact.name.first}`}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Send size={15} />}
            disabled={!template || !rendered?.email || rendered.missing.length > 0}
            onClick={async () => {
              if (!template || !rendered?.email) return;
              const result = await b.sendTemplate({
                contactId: contact.id,
                channel: 'email',
                messageClass: template.messageClass,
                ...(template.purpose ? { purpose: template.purpose } : {}),
                templateId: template.id,
                templateVersion: template.version,
                occasion: `manual-${b.nextId('o')}`,
                email: rendered.email,
              });
              if (result.status === 'sent') toast('Sent.');
              else if (result.status === 'deferred') toast(`Held until ${dateTime(result.until)} (${result.reason === 'quiet_hours' ? 'quiet hours' : 'weekly limit'}).`, 'warn');
              else if (result.status === 'blocked') toast(`Not sent: ${result.explanation}.`, 'warn');
              else toast(`Not sent (${result.status}).`, 'warn');
              onClose();
            }}
          >
            Send now
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Template">
          <Select value={templateId} onChange={setTemplateId} options={templates.map((t) => ({ value: t.id, label: t.name }))} />
        </Field>
        {template && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill tone={template.messageClass === 'transactional' ? 'info' : template.messageClass === 'business' ? 'neutral' : 'accent'}>
              {template.messageClass === 'transactional' ? 'Service message' : template.messageClass === 'business' ? 'Business outreach' : `Marketing: ${template.purpose ? PURPOSE_LABELS[template.purpose] : ''}`}
            </Pill>
            <Pill>{template.layout === 'plain' ? 'Plain, from Gus' : 'Branded'}</Pill>
          </div>
        )}
        {rendered?.missing.length ? (
          <div className="rounded-xl border border-crm-warn/40 bg-crm-warn/10 p-3 text-sm text-crm-warn">Can’t send: no value for {rendered.missing.map((m) => `{${m}}`).join(', ')} and no fallback set.</div>
        ) : null}
        {rendered?.email && (
          <div className="rounded-2xl border border-crm-line">
            <div className="border-b border-crm-line px-4 py-2.5 text-sm">
              <span className="text-crm-ink-3">Subject: </span>
              {rendered.email.subject}
            </div>
            <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-sm text-crm-ink-2">{rendered.email.text}</pre>
          </div>
        )}
        <p className="flex items-start gap-2 text-xs text-crm-ink-3">
          <MessageSquare size={14} className="mt-0.5 shrink-0" />
          This goes through the same checks as every automated send: consent for this purpose, unsubscribes, the weekly limit, quiet hours in their time zone, and Pause all sending.
        </p>
      </div>
    </Sheet>
  );
}

export function TaskSheet({ open, onClose, contact, pipelineItemId }: { open: boolean; onClose: () => void; contact?: Contact; pipelineItemId?: string }) {
  const b = useBackend();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(new Date(Date.parse(b.state.now) + DAY).toISOString().slice(0, 10));
  const [assignee, setAssignee] = useState(b.admin.id);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a task"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            onClick={() => {
              b.addTask({
                title: title.trim(),
                dueAt: new Date(`${due}T09:00:00Z`).toISOString(),
                assigneeId: assignee,
                ...(contact ? { contactId: contact.id } : {}),
                ...(pipelineItemId ? { pipelineItemId } : {}),
              });
              setTitle('');
              onClose();
              toast('Task added');
            }}
          >
            Add task
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="What needs doing?">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={contact ? `Call ${contact.name.first} about…` : 'Follow up about…'} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due">
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="For">
            <Select value={assignee} onChange={setAssignee} options={b.state.world.admins.map((a) => ({ value: a.id, label: a.name }))} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

/** The automations this person is in, or has been through, and where they are in each. */
function ContactAutomations({ contactId }: { contactId: string }) {
  const b = useBackend();
  const runs = b.state.runs.filter((r) => r.contactId === contactId).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).slice(0, 8);
  if (runs.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Automations" />
      <div className="divide-y divide-crm-line">
        {runs.map((r) => {
          const a = b.state.automations.find((x) => x.id === r.automationId);
          const live = r.status === 'active' || r.status === 'waiting';
          return (
            <Link key={r.id} to={`/crm/automations/${r.automationId}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-crm-hover">
              <span className="min-w-0">
                <span className="block truncate">{a?.name ?? r.automationId}</span>
                <span className="block truncate text-xs text-crm-ink-3">{r.history.at(-1)?.outcome}</span>
              </span>
              <Pill tone={live ? 'accent' : r.status === 'completed' ? 'good' : 'neutral'}>{live ? 'In progress' : r.status === 'completed' ? 'Finished' : 'Stopped'}</Pill>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
