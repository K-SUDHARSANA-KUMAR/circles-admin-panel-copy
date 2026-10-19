import {
  CONTACT_TYPE_LABELS,
  INBOX_CATEGORY_LABELS,
  LIFECYCLE_LABELS,
  PURPOSE_LABELS,
  type Contact,
  type ContactType,
  type InboxCategory,
  type LifecycleStage,
  type PurposeConsent,
} from '../core';
import { AlertTriangle, Ban, Check, Minus, ShieldCheck } from 'lucide-react';
import { Link } from '../router';
import { Avatar, Pill, type Tone } from './ui';

export const STAGE_TONE: Record<LifecycleStage, Tone> = {
  Prospect: 'neutral',
  Applicant: 'info',
  Verified: 'info',
  Trial: 'accent',
  Member: 'good',
  Guest: 'neutral',
  AtRisk: 'warn',
  Lapsed: 'bad',
};

export function StageBadge({ contact }: { contact: Pick<Contact, 'lifecycle'> }) {
  if (!contact.lifecycle) return null;
  const { stage, flags } = contact.lifecycle;
  if (flags.includes('closed')) return <Pill tone="bad">Closed</Pill>;
  if (flags.includes('not_approved')) return <Pill tone="bad">Not approved</Pill>;
  return <Pill tone={STAGE_TONE[stage]}>{LIFECYCLE_LABELS[stage].replace(' (free 3 months)', '')}</Pill>;
}

const TYPE_TONE: Partial<Record<ContactType, Tone>> = { Investor: 'warn', Press: 'info', VenuePartner: 'accent', BrandPartner: 'accent', Creator: 'accent' };

export function TypeChips({ types, skipLifecycle = true }: { types: ContactType[]; skipLifecycle?: boolean }) {
  const shown = skipLifecycle ? types.filter((t) => !['Prospect', 'Applicant', 'Trial', 'Member', 'Guest'].includes(t)) : types;
  return (
    <>
      {shown.map((t) => (
        <Pill key={t} tone={TYPE_TONE[t] ?? 'neutral'}>
          {CONTACT_TYPE_LABELS[t]}
        </Pill>
      ))}
    </>
  );
}

export function ContactName({ contact, sub }: { contact: Contact; sub?: React.ReactNode }) {
  const name = `${contact.name.first} ${contact.name.last ?? ''}`.trim();
  return (
    <Link to={`/crm/contacts/${contact.id}`} className="group flex min-w-0 items-center gap-3">
      <Avatar name={name} size={34} tone={contact.appUserId ? 'accent' : 'neutral'} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-crm-ink group-hover:text-crm-accent-ink">{name}</span>
        {sub && <span className="block truncate text-xs text-crm-ink-3">{sub}</span>}
      </span>
    </Link>
  );
}

export function ConsentBadge({ value }: { value: PurposeConsent | undefined }) {
  if (!value) return <Pill icon={<Minus size={12} />}>Not asked</Pill>;
  if (value.status === 'withdrawn') return <Pill tone="bad" icon={<Ban size={12} />}>Said no</Pill>;
  if (value.basis === 'soft_opt_in') return <Pill tone="info" icon={<Check size={12} />} title="Gave their email at signup and didn’t tick the opt-out">Soft opt-in</Pill>;
  return <Pill tone="good" icon={<ShieldCheck size={12} />}>Agreed</Pill>;
}

/** One line: what this person can be sent. */
export function ConsentLine({ contact, suppressedScope }: { contact: Contact; suppressedScope?: 'marketing' | 'all' }) {
  if (suppressedScope === 'all') return <Pill tone="bad" icon={<Ban size={12} />}>Nothing can be sent</Pill>;
  if (suppressedScope === 'marketing') return <Pill tone="warn" icon={<AlertTriangle size={12} />}>Unsubscribed: service emails only</Pill>;
  const granted = (['marketing', 'event_invites', 'product_updates'] as const).filter((p) => contact.consent.email?.[p]?.status === 'granted');
  if (granted.length === 0) return <Pill>No marketing</Pill>;
  if (granted.length === 3) return <Pill tone="good">All emails</Pill>;
  return <Pill tone="info">{granted.map((p) => PURPOSE_LABELS[p]).join(', ')}</Pill>;
}

export const CATEGORY_TONE: Record<InboxCategory, Tone> = { urgent: 'bad', needs_me: 'warn', routine: 'accent', fyi: 'info', noise: 'neutral' };
export function CategoryPill({ category }: { category: InboxCategory }) {
  return <Pill tone={CATEGORY_TONE[category]}>{INBOX_CATEGORY_LABELS[category]}</Pill>;
}

export function fullName(c: Pick<Contact, 'name'>) {
  return `${c.name.first} ${c.name.last ?? ''}`.trim();
}
