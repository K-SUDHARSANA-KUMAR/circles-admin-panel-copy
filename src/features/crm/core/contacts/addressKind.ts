import type { Contact, EmailAddress } from '../model/contact';

/**
 * Personal email providers. An address on one of these is always treated as an individual
 * for consent purposes, even if the person is a partner, investor or journalist.
 * Extend in Settings if needed; the list errs towards "personal".
 */
export const PERSONAL_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'live.co.uk',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'aol.com',
  'aol.co.uk',
  'btinternet.com',
  'sky.com',
  'virginmedia.com',
  'talktalk.net',
  'ntlworld.com',
  'blueyonder.co.uk',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
  'gmx.co.uk',
  'mail.com',
  'zoho.com',
  'fastmail.com',
  'hey.com',
  'tutanota.com',
  'yandex.com',
]);

export function normaliseEmail(address: string): string {
  return address.trim().toLowerCase();
}

export function emailDomain(address: string): string {
  const at = address.lastIndexOf('@');
  return at === -1 ? '' : normaliseEmail(address.slice(at + 1));
}

export function classifyEmailKind(address: string, extraPersonalDomains: Iterable<string> = []): EmailAddress['kind'] {
  const domain = emailDomain(address);
  if (!domain) return 'personal';
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return 'personal';
  for (const d of extraPersonalDomains) if (normaliseEmail(d) === domain) return 'personal';
  return 'business';
}

export function makeEmailAddress(address: string, primary = false): EmailAddress {
  return { address: address.trim(), normalised: normaliseEmail(address), kind: classifyEmailKind(address), primary };
}

/**
 * Business outreach (no consent needed, opt-out honoured) is only allowed to a corporate
 * address of someone linked to an organisation who isn't flagged as a sole trader.
 * Everyone else is an individual, and needs consent or a soft opt-in for anything promotional.
 */
export function isBusinessRecipient(contact: Contact, email: EmailAddress | undefined): boolean {
  if (!email) return false;
  if (contact.treatAsIndividual) return false;
  if (contact.orgIds.length === 0) return false;
  return email.kind === 'business';
}
