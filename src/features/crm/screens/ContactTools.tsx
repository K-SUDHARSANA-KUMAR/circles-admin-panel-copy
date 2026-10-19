/** Possible duplicates (review and merge), and Luma guests that need matching to a person. */
import { possibleDuplicates, type Contact } from '../core';
import { Copy, GitMerge, Ticket } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from '../router';
import { StageBadge, fullName } from '../components/crm';
import { Button, Empty, Pill, Sheet, cx, toast } from '../components/ui';
import { relative, shortDate } from '../data/format';
import { useBackend } from '../data/useBackend';

function Summary({ c, selected, onSelect }: { c: Contact; selected: boolean; onSelect: () => void }) {
  const b = useBackend();
  return (
    <button type="button" onClick={onSelect} className={cx('card w-full p-3 text-left', selected ? 'ring-2 ring-crm-accent' : 'hover:bg-crm-hover')}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{fullName(c)}</span>
        <StageBadge contact={c} />
      </div>
      <div className="mt-1 space-y-0.5 text-xs text-crm-ink-3">
        {c.emails.map((e) => (
          <div key={e.address}>{e.address}</div>
        ))}
        <div>
          {c.source.detail ?? c.source.channel} · {shortDate(c.createdAt, b.state.now)}
        </div>
        {c.appUserId && <div className="text-crm-accent-ink">App account</div>}
      </div>
      {selected && <div className="mt-2 text-xs text-crm-accent-ink">Keep this one</div>}
    </button>
  );
}

export function DuplicatesButton() {
  const b = useBackend();
  const [open, setOpen] = useState(false);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const pairs = useMemo(() => possibleDuplicates(b.visibleContacts()), [b.version]); // eslint-disable-line react-hooks/exhaustive-deps
  if (pairs.length === 0) return null;
  return (
    <>
      <Button icon={<Copy size={15} />} onClick={() => setOpen(true)}>
        Possible duplicates <Pill tone="warn">{pairs.length}</Pill>
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Possible duplicates" wide>
        <p className="mb-4 text-sm text-crm-ink-2">These look like the same person. Pick the record to keep and merge: everything from the other one moves across (emails, timeline, consent, tasks, events). Two different app accounts are never suggested.</p>
        <div className="space-y-5">
          {pairs.map((p) => {
            const key = `${p.a.id}|${p.b.id}`;
            const keepId = keep[key] ?? (p.a.appUserId ? p.a.id : p.b.appUserId ? p.b.id : p.a.id);
            return (
              <div key={key} className="rounded-2xl border border-crm-line p-3">
                <div className="mb-2 text-xs text-crm-ink-3">{p.reason}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Summary c={p.a} selected={keepId === p.a.id} onSelect={() => setKeep({ ...keep, [key]: p.a.id })} />
                  <Summary c={p.b} selected={keepId === p.b.id} onSelect={() => setKeep({ ...keep, [key]: p.b.id })} />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<GitMerge size={14} />}
                    onClick={async () => {
                      try {
                        const merged = await b.merge(keepId, keepId === p.a.id ? p.b.id : p.a.id);
                        toast(`Merged into ${fullName(merged)}`);
                      } catch (e) {
                        toast(e instanceof Error ? e.message : 'Couldn’t merge', 'warn');
                      }
                    }}
                  >
                    Merge
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

export function MatchQueueBanner() {
  const b = useBackend();
  const [open, setOpen] = useState(false);
  const items = b.state.matchQueue.filter((m) => !m.resolvedAt);
  if (items.length === 0) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="card flex w-full items-center gap-3 border-crm-warn/40 px-4 py-3 text-left text-sm hover:bg-crm-hover">
        <Ticket size={17} className="text-crm-warn" />
        <span className="flex-1">
          {items.length} Luma {items.length === 1 ? 'guest needs' : 'guests need'} matching to a person
        </span>
        <span className="text-crm-accent-ink">Review</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Luma guests to match">
        <div className="space-y-4">
          {items.map((m) => {
            const ev = b.state.world.lumaEvents.find((e) => e.id === m.lumaEventId);
            return (
              <div key={m.id} className="rounded-2xl border border-crm-line p-4">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-crm-ink-3">
                  {m.email ?? m.phone ?? 'No email'} · registered for {ev?.name ?? 'an event'} · {relative(m.createdAt, b.state.now)}
                </div>
                <div className="mt-3 text-[13px] text-crm-ink-2">Is this…</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.suggestions.map((id) => {
                    const c = b.contact(id);
                    if (!c) return null;
                    return (
                      <Button
                        key={id}
                        size="sm"
                        onClick={async () => {
                          await b.resolveMatch(m.id, id);
                          toast(`Linked to ${fullName(c)}. Their Luma email is remembered for next time.`);
                        }}
                      >
                        {fullName(c)} ({c.emails[0]?.address ?? 'no email'})
                      </Button>
                    );
                  })}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await b.resolveMatch(m.id, 'new');
                      toast('Added as a new person');
                    }}
                  >
                    Someone new
                  </Button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <Empty title="All matched" />}
          <p className="text-xs text-crm-ink-3">
            The CRM matches by email, then phone, then the person who tapped Register in the app just before. It only asks you when it isn’t sure. <Link to="/crm/contacts" className="underline" onClick={() => setOpen(false)}>Contacts</Link>
          </p>
        </div>
      </Sheet>
    </>
  );
}
