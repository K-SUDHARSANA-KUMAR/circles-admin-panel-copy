import { ORGANISATION_KIND_LABELS } from '../core';
import { ArrowLeft, Building2, CalendarDays, Globe } from 'lucide-react';
import { Link, useParams } from '../router';
import { ContactName, StageBadge, TypeChips } from '../components/crm';
import { Card, CardHeader, Empty, KeyValue, Pill } from '../components/ui';
import { relative, shortDate } from '../data/format';
import { useBackend } from '../data/useBackend';

export function OrganisationDetail() {
  const { id } = useParams();
  const b = useBackend();
  const org = b.state.world.organisations.find((o) => o.id === id);
  if (!org || (org.ownerOnly && b.admin.role !== 'owner')) {
    return (
      <Card>
        <Empty icon={<Building2 size={28} />} title="Organisation not found" />
      </Card>
    );
  }
  const now = b.state.now;
  const people = b.visibleContacts().filter((c) => c.orgIds.includes(org.id));
  const items = b.state.world.pipelineItems.filter((i) => i.orgId === org.id && (!i.ownerOnly || b.admin.role === 'owner'));
  const events = b.state.world.lumaEvents.filter((e) => e.venueOrgId === org.id).sort((a, z) => z.startsAt.localeCompare(a.startsAt));
  const peopleIds = new Set(people.map((p) => p.id));
  const timeline = b.state.world.timeline.filter((e) => peopleIds.has(e.contactId) && (e.kind === 'email_in' || e.kind === 'email_out' || e.kind === 'note')).sort((a, z) => z.at.localeCompare(a.at)).slice(0, 12);
  return (
    <div className="space-y-5">
      <Link to="/crm/contacts?view=organisations" className="inline-flex items-center gap-1.5 text-sm text-crm-ink-2 hover:text-crm-ink">
        <ArrowLeft size={16} /> Organisations
      </Link>
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-crm-line-strong bg-crm-raised text-crm-ink-2">
          <Building2 size={24} />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{org.name}</h2>
            <Pill>{ORGANISATION_KIND_LABELS[org.kind]}</Pill>
            {org.tags.map((t) => (
              <Pill key={t} tone="accent">
                {t}
              </Pill>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-crm-ink-3">
            <span>{org.city}</span>
            {org.website && (
              <span className="inline-flex items-center gap-1">
                <Globe size={13} /> {org.domains.join(', ')}
              </span>
            )}
            {org.venueId && <span>Linked to Venue tracking</span>}
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title={`People (${people.length})`} />
          <div className="divide-y divide-crm-line">
            {people.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <ContactName contact={c} sub={c.jobTitle} />
                </div>
                <StageBadge contact={c} />
                <TypeChips types={c.types} />
              </div>
            ))}
            {people.length === 0 && <Empty title="Nobody linked yet" />}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="In pipelines" />
            <div className="divide-y divide-crm-line">
              {items.map((i) => {
                const p = b.state.world.pipelines.find((x) => x.id === i.pipelineId)!;
                return (
                  <Link key={i.id} to={`/crm/pipelines/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-crm-hover">
                    <span className="truncate">{i.title}</span>
                    <Pill tone="accent">{p.stages.find((s) => s.id === i.stageId)?.name}</Pill>
                  </Link>
                );
              })}
              {items.length === 0 && <Empty title="Not in any pipeline" />}
            </div>
          </Card>
          {events.length > 0 && (
            <Card>
              <CardHeader title="Events held here" icon={<CalendarDays size={16} className="text-crm-ink-3" />} />
              <div className="divide-y divide-crm-line">
                {events.map((e) => (
                  <div key={e.id} className="flex justify-between gap-3 px-5 py-2.5 text-sm">
                    <span>{e.name}</span>
                    <span className="text-crm-ink-3">
                      {shortDate(e.startsAt, now)} · {b.state.world.registrations.filter((r) => r.lumaEventId === e.id && r.checkedInAt).length} came
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Recent conversation" />
            <div className="divide-y divide-crm-line px-5">
              {timeline.map((e) => (
                <KeyValue key={e.id} label={relative(e.at, now)}>
                  {e.summary}
                </KeyValue>
              ))}
              {timeline.length === 0 && <div className="py-4 text-sm text-crm-ink-3">No emails or notes yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

