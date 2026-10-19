import { describeGroup, interestClusters, membersOf, rankConnectors, type ConditionGroup, type Contact } from '../core';
import { Crown, Filter, Plus, Sparkles, Tag, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '../router';
import { BarRow, FunnelChart, Sparkline } from '../components/charts';
import { ContactName, StageBadge } from '../components/crm';
import { Button, Card, CardHeader, Empty, Field, Pill, Select, Sheet, Tabs, cx, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { funnel, segmentTrend, weekLabels } from '../data/derive';
import { num, pct } from '../data/format';
import { useBackend } from '../data/useBackend';

type Tab = 'funnel' | 'segments' | 'connectors' | 'clusters';

export function AudienceScreen() {
  const { tab = 'funnel' } = useParams();
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <CrmHeader title="Audience" subtitle="Who’s converting, who’s stuck, and who brings people in." />
      <Tabs<Tab>
        value={tab as Tab}
        onChange={(t) => navigate(`/crm/audience/${t}`)}
        items={[
          { value: 'funnel', label: 'Funnel' },
          { value: 'segments', label: 'Segments' },
          { value: 'connectors', label: 'Connectors' },
          { value: 'clusters', label: 'Interest clusters' },
        ]}
      />
      {tab === 'funnel' && <FunnelTab />}
      {tab === 'segments' && <SegmentsTab />}
      {tab === 'connectors' && <ConnectorsTab />}
      {tab === 'clusters' && <ClustersTab />}
    </div>
  );
}

/** A filter that matches (approximately) the people who stopped at each step, so they can be saved as a segment. */
const STUCK_FILTERS: Record<string, { name: string; filter: ConditionGroup }> = {
  prospect: { name: 'Prospects who haven’t signed up', filter: { match: 'all', conditions: [{ field: 'lifecycle.stage', op: 'is', value: 'Prospect' }] } },
  signed_up: { name: 'Signed up, waiting for verification', filter: { match: 'all', conditions: [{ field: 'lifecycle.stage', op: 'is', value: 'Applicant' }] } },
  verified: {
    name: 'Verified but not active',
    filter: {
      match: 'all',
      conditions: [
        { field: 'lifecycle.stage', op: 'is_any_of', value: ['Verified', 'Trial', 'Guest'] },
        { match: 'any', conditions: [{ field: 'signals.friendsCount', op: 'lt', value: 1 }, { field: 'signals.lastActiveAt', op: 'more_than_days_ago', value: 14 }] },
      ],
    },
  },
  trial: {
    name: 'Active, not paying yet',
    filter: {
      match: 'all',
      conditions: [
        { field: 'lifecycle.stage', op: 'is_any_of', value: ['Trial', 'Guest'] },
        { field: 'signals.friendsCount', op: 'gte', value: 1 },
        { field: 'signals.lastActiveAt', op: 'in_last_days', value: 14 },
      ],
    },
  },
};

function FunnelTab() {
  const b = useBackend();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'all' | '30' | '90'>('all');
  const [selected, setSelected] = useState('verified');
  const steps = useMemo(() => funnel(b, period === 'all' ? undefined : Number(period)), [b.version, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = steps.find((s) => s.id === selected);
  const first = steps[0]?.count ?? 0;
  const last = steps.at(-1)?.count ?? 0;
  const stuckSeg = STUCK_FILTERS[selected === 'active' ? 'trial' : selected];

  const saveSegment = async () => {
    if (!stuckSeg) return;
    const id = `seg_${b.nextId('s')}`;
    await b.saveSegment({ id, name: stuckSeg.name, filter: stuckSeg.filter, pinned: true, countHistory: [], createdBy: b.admin.id, createdAt: b.state.now, updatedAt: b.state.now });
    toast('Saved as a segment. Automations can use it now.');
    navigate(`/crm/segments/${id}`);
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader
          title="Conversion funnel"
          hint={`${pct(first ? last / first : 0, 1)} of prospects become Members · Active = friends on Circles and used it in the last ${b.state.settings.activeDays} days`}
          right={
            <Select<'all' | '30' | '90'>
              ariaLabel="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'all', label: 'All time' },
                { value: '90', label: 'Joined in the last 90 days' },
                { value: '30', label: 'Joined in the last 30 days' },
              ]}
              className="h-9 w-56 text-[13px]"
            />
          }
        />
        <div className="p-3 sm:p-4">
          <FunnelChart steps={steps.map((s) => ({ ...s, stuck: s.stuck.length }))} onStepClick={setSelected} selected={selected} />
        </div>
      </Card>
      <Card>
        <CardHeader
          title={step ? `Stopped at “${step.label}”` : 'People'}
          hint={step ? `${num(step.stuck.length)} reached this step but not the next` : ''}
          right={
            stuckSeg && step && step.stuck.length > 0 && b.can('segments.write') ? (
              <Button size="sm" icon={<Filter size={14} />} onClick={saveSegment}>
                Save as segment
              </Button>
            ) : undefined
          }
        />
        <PeopleList people={step?.stuck ?? []} />
      </Card>
    </div>
  );
}

export function PeopleList({ people, limit = 40 }: { people: Contact[]; limit?: number }) {
  const [show, setShow] = useState(limit);
  if (people.length === 0) return <Empty icon={<Users size={26} />} title="Nobody here" />;
  return (
    <div>
      <div className="divide-y divide-crm-line">
        {people.slice(0, show).map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <ContactName contact={c} sub={[c.signals.city, c.emails[0]?.address].filter(Boolean).join(' · ')} />
            </div>
            <StageBadge contact={c} />
          </div>
        ))}
      </div>
      {people.length > show && (
        <div className="border-t border-crm-line p-3 text-center">
          <Button size="sm" variant="ghost" onClick={() => setShow((s) => s + 100)}>
            Show {Math.min(100, people.length - show)} more
          </Button>
        </div>
      )}
    </div>
  );
}

function SegmentsTab() {
  const b = useBackend();
  const now = new Date(b.state.now);
  const contacts = b.visibleContacts();
  const labels = weekLabels(b.state.now);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-crm-ink-2">Segments update live. Automations can trigger when someone joins one.</p>
        {b.can('segments.write') && (
          <Link to="/crm/segments/new">
            <Button variant="primary" icon={<Plus size={15} />}>
              New segment
            </Button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {b.state.world.segments.map((seg) => {
          const members = membersOf(contacts, seg.filter, now);
          const trend = segmentTrend(b, seg.id);
          const prev = trend.at(-2) ?? 0;
          const change = members.length - prev;
          const usedBy = b.state.automations.filter((a) => (a.trigger.type === 'segment_joined' || a.trigger.type === 'schedule') && 'segmentId' in a.trigger && a.trigger.segmentId === seg.id);
          return (
            <Link key={seg.id} to={`/crm/segments/${seg.id}`} className="card flex flex-col p-5 hover:border-crm-line-strong hover:bg-[#0e0e11]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{seg.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-crm-ink-3">{describeGroup(seg.filter)}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums">{num(members.length)}</div>
                  <div className={cx('inline-flex items-center gap-1 text-xs', change > 0 ? 'text-crm-good' : change < 0 ? 'text-crm-bad' : 'text-crm-ink-3')}>
                    {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : null}
                    {change === 0 ? 'no change' : `${change > 0 ? '+' : ''}${change} this week`}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Sparkline values={trend} labels={labels} height={36} />
              </div>
              {usedBy.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {usedBy.map((a) => (
                    <Pill key={a.id} tone="accent">
                      Used by {a.name}
                    </Pill>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorsTab() {
  const b = useBackend();
  const weights = b.state.settings.connectorWeights;
  const rows = useMemo(() => rankConnectors(b.visibleContacts(), weights), [b.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = rows[0]?.score ?? 1;
  const [editing, setEditing] = useState(false);
  const toggleHost = (c: Contact) => {
    const has = c.tags.includes('founding host');
    b.setTags(c.id, has ? c.tags.filter((t) => t !== 'founding host') : [...c.tags, 'founding host']);
    toast(has ? `${c.name.first} is no longer a Founding Host` : `${c.name.first} tagged as a Founding Host`);
  };
  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.8fr_1fr]">
      <Card>
        <CardHeader
          title="Connectors"
          hint="Ranked by people they brought in, how many are still active, and plans completed with friends"
          icon={<Crown size={17} className="text-crm-warn" />}
          right={b.can('settings.write') ? <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>How it’s scored</Button> : undefined}
        />
        <div className="hidden grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem_5.5rem_7.5rem] gap-3 border-b border-crm-line px-5 py-2 text-xs text-crm-ink-3 md:grid">
          <span>#</span>
          <span>Person</span>
          <span className="text-right">Brought in</span>
          <span className="text-right">Still active</span>
          <span className="text-right">Plans w/ friends</span>
          <span />
        </div>
        <div className="divide-y divide-crm-line">
          {rows.slice(0, 30).map((r) => (
            <div key={r.contact.id} className="grid grid-cols-[2.2rem_1fr_auto] items-center gap-3 px-5 py-2.5 md:grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem_5.5rem_7.5rem]">
              <span className={cx('text-sm font-semibold tabular-nums', r.rank <= 3 ? 'text-crm-warn' : 'text-crm-ink-3')}>{r.rank}</span>
              <div className="min-w-0">
                <ContactName contact={r.contact} sub={<span className="md:hidden">{r.invited} brought in · {r.invitedActive} active</span>} />
                <div className="mt-1.5 hidden h-1.5 rounded-r-[4px] bg-crm-accent/70 md:block" style={{ width: `${Math.max(3, (r.score / max) * 100)}%` }} title={`Score ${r.score.toFixed(1)}`} />
              </div>
              <span className="hidden text-right text-sm tabular-nums md:block">{r.invited}</span>
              <span className="hidden text-right text-sm tabular-nums md:block">{r.invitedActive}</span>
              <span className="hidden text-right text-sm tabular-nums md:block">{r.plansWithFriends}</span>
              <div className="flex justify-end">
                <button onClick={() => toggleHost(r.contact)} className={cx('rounded-full border px-2.5 py-1 text-xs', r.contact.tags.includes('founding host') ? 'border-crm-warn/40 bg-crm-warn/10 text-crm-warn' : 'border-crm-line-strong text-crm-ink-3 hover:text-crm-ink')}>
                  {r.contact.tags.includes('founding host') ? '★ Founding Host' : 'Make host'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="What this tells you" icon={<Sparkles size={16} className="text-crm-accent" />} />
        <div className="space-y-3 px-5 py-4 text-sm text-crm-ink-2">
          <p>
            Your top {Math.min(5, rows.length)} connectors brought in <span className="text-crm-ink">{rows.slice(0, 5).reduce((s, r) => s + r.invited, 0)}</span> of the{' '}
            <span className="text-crm-ink">{rows.reduce((s, r) => s + r.invited, 0)}</span> people who joined through an invite.
          </p>
          <p>These are the people to look after: first to hear about new things, invited to host a Thursday, and asked who else should be on Circles.</p>
          <p className="text-xs text-crm-ink-3">
            Score = {weights.activeInvitee} × people still active + {weights.invitee} × people brought in + {weights.planWithFriends} × plans with friends.
          </p>
        </div>
      </Card>
      <WeightsSheet open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function WeightsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const b = useBackend();
  const [w, setW] = useState(b.state.settings.connectorWeights);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="How Connectors are scored"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              await b.saveSettings({ connectorWeights: w });
              toast('Scoring updated');
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Points for each person they brought in who’s still active">
          <input type="number" step="0.5" min={0} className="input w-28" value={w.activeInvitee} onChange={(e) => setW({ ...w, activeInvitee: Number(e.target.value) })} />
        </Field>
        <Field label="Points for each person they brought in">
          <input type="number" step="0.5" min={0} className="input w-28" value={w.invitee} onChange={(e) => setW({ ...w, invitee: Number(e.target.value) })} />
        </Field>
        <Field label="Points for each plan completed with friends">
          <input type="number" step="0.5" min={0} className="input w-28" value={w.planWithFriends} onChange={(e) => setW({ ...w, planWithFriends: Number(e.target.value) })} />
        </Field>
      </div>
    </Sheet>
  );
}

function ClustersTab() {
  const b = useBackend();
  const navigate = useNavigate();
  const [city, setCity] = useState('London');
  const threshold = b.state.settings.eventReadyAt;
  const clusters = useMemo(() => interestClusters(b.visibleContacts(), new Date(b.state.now), { eventReadyAt: threshold }), [b.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const cities = [...new Set(clusters.map((c) => c.city))].sort();
  const shown = clusters.filter((c) => city === 'all' || c.city === city).slice(0, 24);
  const max = Math.max(1, ...shown.map((c) => c.active));
  const [open, setOpen] = useState<(typeof clusters)[number] | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-crm-ink-2">
          Interest groups on the app. A group is <span className="text-crm-ink">event-ready</span> when {threshold}+ people in it used the app in the last 30 days.
        </p>
        <div className="flex gap-2">
          <Select ariaLabel="City" value={city} onChange={setCity} options={[{ value: 'all', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]} className="h-9 w-44 text-[13px]" />
          {b.can('settings.write') && (
            <Select
              ariaLabel="Event-ready threshold"
              value={String(threshold)}
              onChange={(v) => b.saveSettings({ eventReadyAt: Number(v) })}
              options={[6, 8, 10, 12, 15, 20].map((n) => ({ value: String(n), label: `Event-ready at ${n}` }))}
              className="h-9 w-44 text-[13px]"
            />
          )}
        </div>
      </div>
      <Card className="p-3">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          {shown.map((c) => (
            <BarRow
              key={c.id}
              value={c.active}
              max={max}
              emphasis={c.eventReady}
              label={
                <span className="flex items-center gap-2">
                  <span className="capitalize">{c.interest}</span>
                  <span className="text-crm-ink-3">· {c.city}</span>
                  {c.eventReady && <Pill tone="good">Event-ready</Pill>}
                </span>
              }
              sub={`${c.active} active · ${c.people.length} total · ${c.members} members`}
              tooltip={`${c.interest} in ${c.city}: ${c.active} active of ${c.people.length}`}
              onClick={() => setOpen(c)}
            />
          ))}
        </div>
      </Card>
      <p className="text-xs text-crm-ink-3">Built to plug into the Interest development module: it reads the same interests, and publishes these clusters for it to show.</p>
      <Sheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `${open.interest} in ${open.city}` : ''}
        footer={
          open && b.can('segments.write') ? (
            <Button
              icon={<Tag size={14} />}
              onClick={async () => {
                const id = `seg_${b.nextId('s')}`;
                await b.saveSegment({
                  id,
                  name: `${open.interest[0]!.toUpperCase()}${open.interest.slice(1)} in ${open.city}`,
                  filter: { match: 'all', conditions: [{ field: 'signals.interests', op: 'includes', value: open.interest }, { field: 'signals.city', op: 'is', value: open.city }] },
                  pinned: false,
                  countHistory: [],
                  createdBy: b.admin.id,
                  createdAt: b.state.now,
                  updatedAt: b.state.now,
                });
                toast('Segment created');
                navigate(`/crm/segments/${id}`);
              }}
            >
              Make a segment
            </Button>
          ) : undefined
        }
      >
        {open && (
          <div className="-mx-5 -my-4">
            <PeopleList people={[...open.people].sort((a, z) => (z.signals.lastActiveAt ?? '').localeCompare(a.signals.lastActiveAt ?? ''))} />
          </div>
        )}
      </Sheet>
    </div>
  );
}

