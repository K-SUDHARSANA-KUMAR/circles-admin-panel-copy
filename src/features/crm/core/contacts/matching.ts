/**
 * Matching people: exact matches (same email or phone) are the same person; near-matches are
 * suggested for a human to merge, never merged automatically.
 */
import type { Contact } from '../model/contact';
import { emailDomain, normaliseEmail } from './addressKind';

/** gmail.com and googlemail.com ignore dots and +tags. Other providers are left alone. */
export function canonicalEmail(address: string): string {
  const e = normaliseEmail(address);
  const at = e.lastIndexOf('@');
  if (at < 0) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '').replace(/\+.*$/, '');
  else local = local.replace(/\+.*$/, '');
  return `${local}@${domain}`;
}

export function isValidEmail(address: string): boolean {
  return /^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$/i.test(address.trim()) && emailDomain(address).length > 3;
}

const fullName = (c: Pick<Contact, 'name'>) => `${c.name.first} ${c.name.last ?? ''}`.trim().toLowerCase();

export interface DuplicatePair {
  a: Contact;
  b: Contact;
  reason: string;
}

/** Likely duplicates for a person to review. Two app accounts are never suggested as one person. */
export function possibleDuplicates(contacts: readonly Contact[]): DuplicatePair[] {
  const live = contacts.filter((c) => !c.mergedInto);
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();
  const add = (a: Contact, b: Contact, reason: string) => {
    if (a.id === b.id) return;
    if (a.appUserId && b.appUserId && a.appUserId !== b.appUserId) return;
    const key = [a.id, b.id].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ a, b, reason });
  };
  const byCanonical = new Map<string, Contact[]>();
  const byName = new Map<string, Contact[]>();
  for (const c of live) {
    for (const e of c.emails) {
      const k = canonicalEmail(e.address);
      byCanonical.set(k, [...(byCanonical.get(k) ?? []), c]);
    }
    const n = fullName(c);
    if (n.includes(' ')) byName.set(n, [...(byName.get(n) ?? []), c]);
  }
  for (const group of byCanonical.values()) {
    for (let i = 1; i < group.length; i++) add(group[0]!, group[i]!, 'Same email address, written differently');
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        const sameOrg = a.orgIds.some((o) => b.orgIds.includes(o));
        const phoneTail = (c: Contact) => c.phones.map((p) => p.e164.slice(-6));
        const samePhoneTail = phoneTail(a).some((t) => phoneTail(b).includes(t));
        const sameDomain = a.emails.some((e) => b.emails.some((f) => emailDomain(e.address) === emailDomain(f.address) && e.kind === 'business'));
        if (sameOrg || samePhoneTail || sameDomain) add(a, b, sameOrg ? 'Same name, same organisation' : samePhoneTail ? 'Same name, similar phone number' : 'Same name, same company email domain');
        else add(a, b, 'Same name');
      }
    }
  }
  return pairs;
}
