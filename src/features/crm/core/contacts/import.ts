/**
 * CSV import with de-duplication on email and phone.
 *
 * Two steps, so a person always sees what will happen before anything changes:
 *   planImport()  → new people, updates to existing ones, duplicates inside the file, skipped rows
 *   applyImport() → writes it, with an import record and a timeline line on everyone touched
 *
 * Existing values are never overwritten, only filled in. Consent is only recorded when the Owner
 * declares the evidence for the list (wording, date) and the row says yes; everyone else is
 * imported with no marketing. Suppressed people stay suppressed (the send gate checks hashes).
 */
import { assertCan, can, type AdminUser } from '../access/permissions';
import { recordConsent } from '../consent/consentService';
import type { CoreDeps } from '../deps';
import { CONTACT_TYPES, type Contact, type ContactType } from '../model/contact';
import { PURPOSES } from '../model/consent';
import type { ImportRecord } from '../model/events';
import type { Organisation } from '../model/organisation';
import { classifyEmailKind, normaliseEmail } from './addressKind';
import { isValidEmail } from './matching';
import { normalisePhone } from './phone';

export const IMPORT_FIELDS = ['first_name', 'last_name', 'full_name', 'email', 'phone', 'organisation', 'job_title', 'city', 'tags', 'type', 'consent', 'ignore'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  organisation: 'Organisation',
  job_title: 'Job title',
  city: 'City',
  tags: 'Tags (comma-separated)',
  type: 'Type (e.g. Press, Investor)',
  consent: 'Agreed to emails? (yes/no)',
  ignore: 'Don’t import',
};

const GUESSES: [RegExp, ImportField][] = [
  [/^(first|given|fore)\s*_?name$|^first$/i, 'first_name'],
  [/^(last|sur|family)\s*_?name$|^last$|^surname$/i, 'last_name'],
  [/^(full\s*)?name$|^contact$/i, 'full_name'],
  [/e-?mail/i, 'email'],
  [/phone|mobile|tel/i, 'phone'],
  [/company|organi[sz]ation|^org$|venue|brand|fund|publication|outlet/i, 'organisation'],
  [/title|role|position|job/i, 'job_title'],
  [/city|town|location/i, 'city'],
  [/tag|label/i, 'tags'],
  [/^type$|category|relationship/i, 'type'],
  [/consent|opt.?in|marketing|subscribed|agreed/i, 'consent'],
];

export function guessMapping(headers: readonly string[]): ImportField[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const hit = GUESSES.find(([re, f]) => re.test(h.trim()) && !used.has(f));
    const field = hit?.[1] ?? 'ignore';
    if (field !== 'ignore') used.add(field);
    return field;
  });
}

export interface ConsentEvidence {
  /** e.g. "paper-v1" or "old-newsletter-2025". */
  wordingVersion: string;
  /** When they agreed (the list's date). */
  capturedAt: string;
  /** Plain words: where the list came from and what they agreed to. */
  description: string;
}

export interface ImportOptions {
  fileName: string;
  /** Where this list came from, shown on each person's record. */
  sourceDetail: string;
  defaultType: ContactType;
  tags: string[];
  /** Only the Owner can declare this. Without it, nobody gets marketing consent from the import. */
  consentEvidence?: ConsentEvidence;
}

export interface ImportRow {
  rowNumber: number;
  first: string;
  last: string;
  email?: string;
  phone?: string;
  organisation?: string;
  jobTitle?: string;
  city?: string;
  tags: string[];
  types: ContactType[];
  consentYes: boolean;
}

export interface ImportPlan {
  create: ImportRow[];
  update: { row: ImportRow; contactId: string; fills: string[] }[];
  duplicatesInFile: { row: ImportRow; sameAsRow: number }[];
  skipped: { rowNumber: number; reason: string }[];
  consentGrants: number;
}

const YES = /^(y|yes|true|1|x|✓|agreed|opted in|subscribed)$/i;

function toRow(values: readonly string[], mapping: readonly ImportField[], rowNumber: number, options: ImportOptions): ImportRow | { skip: string } {
  const get = (f: ImportField) => {
    const i = mapping.indexOf(f);
    return i >= 0 ? (values[i] ?? '').trim() : '';
  };
  let first = get('first_name');
  let last = get('last_name');
  const full = get('full_name');
  if (!first && full) {
    const parts = full.split(/\s+/);
    first = parts[0] ?? '';
    last = last || parts.slice(1).join(' ');
  }
  const rawEmail = get('email');
  const email = rawEmail ? normaliseEmail(rawEmail) : undefined;
  if (email && !isValidEmail(email)) return { skip: `Email “${rawEmail}” doesn’t look right` };
  const rawPhone = get('phone');
  const phone = rawPhone ? normalisePhone(rawPhone) : undefined;
  if (!email && !phone) return { skip: rawPhone ? `Phone “${rawPhone}” doesn’t look right and there’s no email` : 'No email or phone' };
  if (!first) first = email ? email.split('@')[0]!.split(/[._]/)[0]!.replace(/^./, (c) => c.toUpperCase()) : 'Unknown';
  const typeText = get('type').toLowerCase().replace(/\s+/g, '');
  const matchedType = CONTACT_TYPES.find((t) => t.toLowerCase() === typeText || t.toLowerCase() === `${typeText}partner`);
  const tags = [...options.tags, ...get('tags').split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean)];
  const row: ImportRow = {
    rowNumber,
    first,
    last,
    tags: [...new Set(tags)],
    types: [matchedType ?? options.defaultType],
    consentYes: YES.test(get('consent')),
  };
  if (email) row.email = email;
  if (phone) row.phone = phone;
  const org = get('organisation');
  if (org) row.organisation = org;
  const title = get('job_title');
  if (title) row.jobTitle = title;
  const city = get('city');
  if (city) row.city = city;
  return row;
}

export function planImport(rows: readonly (readonly string[])[], mapping: readonly ImportField[], existing: readonly Contact[], options: ImportOptions): ImportPlan {
  const plan: ImportPlan = { create: [], update: [], duplicatesInFile: [], skipped: [], consentGrants: 0 };
  const byEmail = new Map<string, Contact>();
  const byPhone = new Map<string, Contact>();
  for (const c of existing) {
    if (c.mergedInto) continue;
    for (const e of c.emails) byEmail.set(e.normalised, c);
    for (const p of c.phones) byPhone.set(p.e164, c);
  }
  const seenEmail = new Map<string, number>();
  const seenPhone = new Map<string, number>();
  rows.forEach((values, i) => {
    const rowNumber = i + 2; // row 1 is the header
    const parsed = toRow(values, mapping, rowNumber, options);
    if ('skip' in parsed) {
      plan.skipped.push({ rowNumber, reason: parsed.skip });
      return;
    }
    const dupOf = (parsed.email && seenEmail.get(parsed.email)) || (parsed.phone && seenPhone.get(parsed.phone));
    if (dupOf) {
      plan.duplicatesInFile.push({ row: parsed, sameAsRow: dupOf });
      return;
    }
    if (parsed.email) seenEmail.set(parsed.email, rowNumber);
    if (parsed.phone) seenPhone.set(parsed.phone, rowNumber);
    const match = (parsed.email && byEmail.get(parsed.email)) || (parsed.phone && byPhone.get(parsed.phone));
    const willGrant = !!options.consentEvidence && parsed.consentYes && !!parsed.email;
    if (willGrant) plan.consentGrants += 1;
    if (match) {
      const fills: string[] = [];
      if (parsed.email && !match.emails.some((e) => e.normalised === parsed.email)) fills.push('email');
      if (parsed.phone && !match.phones.some((p) => p.e164 === parsed.phone)) fills.push('phone');
      if (parsed.jobTitle && !match.jobTitle) fills.push('job title');
      if (parsed.city && !match.signals.city) fills.push('city');
      if (parsed.organisation && match.orgIds.length === 0) fills.push('organisation');
      if (parsed.tags.some((t) => !match.tags.includes(t))) fills.push('tags');
      if (parsed.types.some((t) => !match.types.includes(t))) fills.push('type');
      if (willGrant) fills.push('consent');
      plan.update.push({ row: parsed, contactId: match.id, fills });
    } else plan.create.push(parsed);
  });
  return plan;
}

type ImportDeps = Pick<CoreDeps, 'clock' | 'ids' | 'contacts' | 'organisations' | 'consentLedger' | 'suppression' | 'hasher' | 'timeline' | 'logger' | 'imports' | 'audit'>;

async function findOrCreateOrg(deps: ImportDeps, name: string, cache: Map<string, Organisation>, now: string, adminId: string): Promise<Organisation> {
  const key = name.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const org: Organisation = { id: deps.ids.next('org'), name: name.trim(), kind: 'other', domains: [], tags: [], ownerId: adminId, ownerOnly: false, createdAt: now, updatedAt: now };
  await deps.organisations.save(org);
  cache.set(key, org);
  return org;
}

export async function applyImport(deps: ImportDeps, admin: AdminUser, plan: ImportPlan, options: ImportOptions): Promise<ImportRecord> {
  assertCan(admin, 'contacts.import');
  const declaring = !!options.consentEvidence;
  if (declaring) assertCan(admin, 'consent.declareImportEvidence');
  const now = deps.clock.now().toISOString();
  const importId = deps.ids.next('imp');
  const orgCache = new Map((await deps.organisations.list()).map((o) => [o.name.trim().toLowerCase(), o]));
  const investorTypes = new Set<ContactType>(['Investor']);
  let consentGranted = 0;

  const grant = async (contactId: string, row: ImportRow) => {
    if (!options.consentEvidence || !row.consentYes || !row.email) return;
    for (const purpose of PURPOSES) {
      await recordConsent(
        deps,
        {
          contactId,
          channel: 'email',
          purpose,
          status: 'granted',
          basis: 'consent',
          source: 'import',
          method: 'import_declared',
          wordingVersion: options.consentEvidence.wordingVersion,
          capturedAt: options.consentEvidence.capturedAt,
          recordedBy: admin.id,
          evidence: { importId, note: options.consentEvidence.description },
        },
        { mayDeclareImportEvidence: can(admin, 'consent.declareImportEvidence') },
      );
    }
    consentGranted += 1;
  };

  for (const row of plan.create) {
    const org = row.organisation ? await findOrCreateOrg(deps, row.organisation, orgCache, now, admin.id) : undefined;
    const id = deps.ids.next('c');
    const contact: Contact = {
      id,
      name: { first: row.first, last: row.last },
      emails: row.email ? [{ address: row.email, normalised: row.email, kind: classifyEmailKind(row.email), primary: true }] : [],
      phones: row.phone ? [{ e164: row.phone, primary: true }] : [],
      types: row.types,
      lifecycle: row.types.includes('Prospect') ? { stage: 'Prospect', since: now, flags: [] } : null,
      orgIds: org ? [org.id] : [],
      ...(row.jobTitle ? { jobTitle: row.jobTitle } : {}),
      treatAsIndividual: false,
      ownerId: admin.id,
      tags: row.tags,
      source: { channel: 'import', detail: options.sourceDetail, capturedAt: now },
      timezone: 'Europe/London',
      consent: {},
      signals: row.city ? { city: row.city } : {},
      segmentIds: [],
      ownerOnly: row.types.some((t) => investorTypes.has(t)),
      createdAt: now,
      updatedAt: now,
    };
    await deps.contacts.save(contact);
    await deps.timeline.append({ id: deps.ids.next('tl'), contactId: id, kind: 'system', summary: `Imported from “${options.fileName}” (${options.sourceDetail})`, at: now, actor: `admin:${admin.id}`, ownerOnly: contact.ownerOnly });
    await grant(id, row);
  }

  for (const u of plan.update) {
    const c = await deps.contacts.get(u.contactId);
    if (!c) continue;
    const r = u.row;
    const org = r.organisation && c.orgIds.length === 0 ? await findOrCreateOrg(deps, r.organisation, orgCache, now, admin.id) : undefined;
    const next: Contact = {
      ...c,
      emails: r.email && !c.emails.some((e) => e.normalised === r.email) ? [...c.emails, { address: r.email, normalised: r.email, kind: classifyEmailKind(r.email), primary: c.emails.length === 0 }] : c.emails,
      phones: r.phone && !c.phones.some((p) => p.e164 === r.phone) ? [...c.phones, { e164: r.phone, primary: c.phones.length === 0 }] : c.phones,
      ...(r.jobTitle && !c.jobTitle ? { jobTitle: r.jobTitle } : {}),
      orgIds: org ? [org.id] : c.orgIds,
      tags: [...new Set([...c.tags, ...r.tags])],
      types: [...new Set([...c.types, ...r.types.filter((t) => !['Prospect', 'Applicant', 'Trial', 'Member', 'Guest'].includes(t) || !c.lifecycle)])],
      signals: r.city && !c.signals.city ? { ...c.signals, city: r.city } : c.signals,
      ownerOnly: c.ownerOnly || r.types.some((t) => investorTypes.has(t)),
      updatedAt: now,
    };
    await deps.contacts.save(next);
    if (u.fills.length) await deps.timeline.append({ id: deps.ids.next('tl'), contactId: c.id, kind: 'system', summary: `Updated from import “${options.fileName}”: added ${u.fills.join(', ')}`, at: now, actor: `admin:${admin.id}`, ownerOnly: next.ownerOnly });
    await grant(c.id, r);
  }

  const record: ImportRecord = {
    id: importId,
    fileName: options.fileName,
    createdBy: admin.id,
    createdAt: now,
    rows: plan.create.length + plan.update.length + plan.duplicatesInFile.length + plan.skipped.length,
    created: plan.create.length,
    updated: plan.update.length,
    skipped: plan.skipped.length,
    duplicatesInFile: plan.duplicatesInFile.length,
    consentGranted,
    sourceDetail: options.sourceDetail,
    ...(options.consentEvidence ? { evidence: options.consentEvidence } : {}),
  };
  await deps.imports.append(record);
  deps.logger.info('import.applied', { importId, created: record.created, updated: record.updated, skipped: record.skipped, consentGranted });
  return record;
}
