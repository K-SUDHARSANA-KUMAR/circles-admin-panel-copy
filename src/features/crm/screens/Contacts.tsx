import { CONTACT_TYPE_LABELS, CONTACT_TYPES, LIFECYCLE_LABELS, LIFECYCLE_STAGES, ORGANISATION_KIND_LABELS, type Contact, type ContactType, type LifecycleStage } from '../core';
import { Building2, Search, Tag, Upload, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from '../router';
import { ContactName, StageBadge, TypeChips } from '../components/crm';
import { Button, Card, Empty, Field, Pill, Select, Sheet, Tabs, cx, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { relative, shortDate } from '../data/format';
import { useBackend } from '../data/useBackend';
import { ImportSheet } from './ImportSheet';
import { DuplicatesButton, MatchQueueBanner } from './ContactTools';

type View = 'people' | 'organisations';
type Sort = 'updated' | 'name' | 'followup';

export function ContactsScreen() {
  const b = useBackend();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) ?? 'people';
  const setView = (v: View) => setParams(v === 'people' ? {} : { view: v });
  return (
    <div className="space-y-5">
      <CrmHeader
        title="Contacts"
        subtitle="Everyone, app user or not: one record per person."
        actions={
          view === 'people' && (
            <>
              <DuplicatesButton />
              <ImportButton />
            </>
          )
        }
      />
      <MatchQueueBanner />
      <Tabs<View>
        value={view}
        onChange={setView}
        items={[
          { value: 'people', label: 'People', count: b.visibleContacts().filter((c) => !c.mergedInto).length },
          { value: 'organisations', label: 'Organisations', count: b.state.world.organisations.filter((o) => !o.ownerOnly || b.admin.role === 'owner').length },
        ]}
      />
      {view === 'people' ? <People /> : <Organisations />}
    </div>
  );
}

function ImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon={<Upload size={16} />} onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <ImportSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function People() {
  const b = useBackend();
  const now = b.state.now;
  const [q, setQ] = useState('');
  const [type, setType] = useState<ContactType | 'all'>('all');
  const [stage, setStage] = useState<LifecycleStage | 'all'>('all');
  const [owner, setOwner] = useState('all');
  const [sort, setSort] = useState<Sort>('updated');
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagging, setTagging] = useState(false);
  const orgs = b.state.world.organisations;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = b.visibleContacts().filter((c) => !c.mergedInto);
    if (type !== 'all') list = list.filter((c) => c.types.includes(type));
    if (stage !== 'all') list = list.filter((c) => c.lifecycle?.stage === stage);
    if (owner !== 'all') list = list.filter((c) => c.ownerId === owner);
    if (needle) {
      list = list.filter((c) => {
        const org = c.orgIds.map((id) => orgs.find((o) => o.id === id)?.name ?? '').join(' ');
        return `${c.name.first} ${c.name.last ?? ''} ${c.emails.map((e) => e.address).join(' ')} ${org} ${c.tags.join(' ')} ${c.signals.city ?? ''} ${c.jobTitle ?? ''}`.toLowerCase().includes(needle);
      });
    }
    const by: Record<Sort, (a: Contact, z: Contact) => number> = {
      updated: (a, z) => z.updatedAt.localeCompare(a.updatedAt),
      name: (a, z) => `${a.name.first} ${a.name.last}`.localeCompare(`${z.name.first} ${z.name.last}`),
      followup: (a, z) => (a.nextFollowUpAt ?? '9').localeCompare(z.nextFollowUpAt ?? '9'),
    };
    return list.sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.version, q, type, stage, owner, sort]);

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-ink-3" />
          <input className="input pl-9" placeholder="Search name, email, organisation, tag, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search contacts" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <Select<ContactType | 'all'> ariaLabel="Type" value={type} onChange={setType} options={[{ value: 'all', label: 'All types' }, ...CONTACT_TYPES.filter((t) => b.admin.role === 'owner' || t !== 'Investor').map((t) => ({ value: t, label: CONTACT_TYPE_LABELS[t] }))]} className="lg:w-40" />
          <Select<LifecycleStage | 'all'> ariaLabel="Stage" value={stage} onChange={setStage} options={[{ value: 'all', label: 'All stages' }, ...LIFECYCLE_STAGES.map((s) => ({ value: s, label: LIFECYCLE_LABELS[s] }))]} className="lg:w-44" />
          <Select ariaLabel="Owner" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'Any owner' }, ...b.state.world.admins.map((a) => ({ value: a.id, label: a.name }))]} className="lg:w-36" />
          <Select<Sort> ariaLabel="Sort" value={sort} onChange={setSort} options={[{ value: 'updated', label: 'Recently updated' }, { value: 'name', label: 'Name' }, { value: 'followup', label: 'Next follow-up' }]} className="lg:w-44" />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="card flex flex-wrap items-center gap-2 border-crm-accent/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" icon={<Tag size={14} />} onClick={() => setTagging(true)}>
            Add tag
          </Button>
          <Select
            ariaLabel="Assign owner"
            value=""
            onChange={(v) => {
              if (!v) return;
              for (const id of selected) b.setOwner(id, v);
              toast(`Assigned ${selected.size} to ${b.state.world.admins.find((a) => a.id === v)?.name}`);
              setSelected(new Set());
            }}
            options={[{ value: '', label: 'Assign owner…' }, ...b.state.world.admins.map((a) => ({ value: a.id, label: a.name }))]}
            className="h-8 w-44 text-[13px]"
          />
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="text-[13px] text-crm-ink-3">{rows.length.toLocaleString('en-GB')} people</div>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-crm-line text-xs text-crm-ink-3">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all shown"
                  className="accent-accent"
                  checked={selected.size > 0 && rows.slice(0, limit).every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.slice(0, limit).map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Status</th>
              <th className="hidden py-3 font-medium xl:table-cell">Organisation / city</th>
              <th className="py-3 font-medium">Owner</th>
              <th className="py-3 font-medium">Next follow-up</th>
              <th className="py-3 pr-4 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-crm-line">
            {rows.slice(0, limit).map((c) => {
              const org = c.orgIds[0] ? orgs.find((o) => o.id === c.orgIds[0]) : undefined;
              const overdue = c.nextFollowUpAt && c.nextFollowUpAt < now;
              return (
                <tr key={c.id} className={cx('hover:bg-crm-hover/60', selected.has(c.id) && 'bg-crm-accent/5')}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" className="accent-accent" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.name.first}`} />
                  </td>
                  <td className="max-w-[260px] py-2.5">
                    <ContactName contact={c} sub={c.emails[0]?.address} />
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <StageBadge contact={c} />
                      <TypeChips types={c.types} />
                    </div>
                  </td>
                  <td className="hidden py-2.5 text-crm-ink-2 xl:table-cell">{org ? <Link to={`/crm/organisations/${org.id}`} className="hover:text-crm-ink">{org.name}</Link> : (c.signals.city ?? '—')}</td>
                  <td className="py-2.5 text-crm-ink-2">{b.state.world.admins.find((a) => a.id === c.ownerId)?.name.split(' ')[0] ?? '—'}</td>
                  <td className={cx('py-2.5', overdue ? 'text-crm-bad' : 'text-crm-ink-2')}>{c.nextFollowUpAt ? shortDate(c.nextFollowUpAt, now) : '—'}</td>
                  <td className="py-2.5 pr-4 text-crm-ink-3">{relative(c.updatedAt, now)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty icon={<Users size={26} />} title="No one matches">Try a different search or filter.</Empty>}
      </Card>

      {/* Phone cards */}
      <div className="space-y-2 md:hidden">
        {rows.slice(0, limit).map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <ContactName contact={c} sub={c.jobTitle ?? c.signals.city ?? c.emails[0]?.address} />
            </div>
            <StageBadge contact={c} />
          </div>
        ))}
      </div>

      {rows.length > limit && (
        <div className="flex justify-center">
          <Button onClick={() => setLimit((l) => l + 100)}>Show more ({rows.length - limit} left)</Button>
        </div>
      )}

      <TagSheet
        open={tagging}
        onClose={() => setTagging(false)}
        onSave={(tag) => {
          for (const id of selected) {
            const c = b.contact(id);
            if (c && !c.tags.includes(tag)) b.setTags(id, [...c.tags, tag]);
          }
          toast(`Tagged ${selected.size} people “${tag}”`);
          setSelected(new Set());
          setTagging(false);
        }}
      />
    </div>
  );
}

export function TagSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (tag: string) => void }) {
  const [tag, setTag] = useState('');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a tag"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!tag.trim()} onClick={() => onSave(tag.trim().toLowerCase())}>
            Add tag
          </Button>
        </>
      }
    >
      <Field label="Tag" hint="e.g. founding host, padel, press list">
        <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} autoFocus />
      </Field>
    </Sheet>
  );
}

function Organisations() {
  const b = useBackend();
  const [q, setQ] = useState('');
  const orgs = b.state.world.organisations
    .filter((o) => !o.ownerOnly || b.admin.role === 'owner')
    .filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, z) => a.name.localeCompare(z.name));
  const contacts = b.visibleContacts();
  const items = b.state.world.pipelineItems;
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-ink-3" />
        <input className="input pl-9" placeholder="Search organisations…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orgs.map((o) => {
          const people = contacts.filter((c) => c.orgIds.includes(o.id));
          const open = items.filter((i) => i.orgId === o.id);
          return (
            <Link key={o.id} to={`/crm/organisations/${o.id}`} className="card flex items-start gap-3 p-4 hover:bg-crm-hover">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-crm-line-strong bg-crm-raised text-crm-ink-2">
                <Building2 size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{o.name}</span>
                  {o.tags.includes('key partner') && <Pill tone="accent">Key partner</Pill>}
                </div>
                <div className="text-xs text-crm-ink-3">
                  {ORGANISATION_KIND_LABELS[o.kind]} · {o.city} · {people.length} {people.length === 1 ? 'person' : 'people'}
                  {open.length > 0 && ` · ${open.length} in pipelines`}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
