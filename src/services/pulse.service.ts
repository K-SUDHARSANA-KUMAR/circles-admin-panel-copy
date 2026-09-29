import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The 12 raw inputs an editor types. Every KPI is derived from these. */
export interface PulseInputs {
  totalUsers: number;
  newUsers: number;
  activatedUsers: number;
  invitedUsers: number;
  mau: number;
  fullMembers: number;
  freeEnded: number;
  freeConverted: number;
  marketingSpend: number;
  newCustomers: number;
  arpm: number;
  avgLifetimeMonths: number;
}

/** Ratios are fractions (0.711), not percentages. Null means "no denominator". */
export interface PulseKpis {
  totalUsers: number;
  newUsers: number;
  activationRate: number | null;
  inviteShare: number | null;
  mauPct: number | null;
  fullMembers: number;
  membersPctUsers: number | null;
  freeToMember: number | null;
  cac: number | null;
  ltv: number | null;
  ltvCacRatio: number | null;
}

export interface PulseEntry extends PulseInputs {
  id: string;
  month: string;
  isExample: boolean;
  locked: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  kpis: PulseKpis;
}

export interface PulseEntryWithPrevious extends PulseEntry {
  previous: PulseEntry | null;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (apiEndPoint.CITIES_ENDPOINT as string).replace('/cities', '');
export const PULSE_URL = `${BASE_URL}/user-service/admin/pulse`;

const unwrap = (res: any) => res.data?.result?.data ?? res.data?.data ?? res.data;

const message = (err: any, fallback: string) =>
  err?.response?.data?.result?.message ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

// ─── Calls ───────────────────────────────────────────────────────────────────

export async function fetchPulseEntries(): Promise<PulseEntry[]> {
  try {
    const res = await customAxios.get(`${PULSE_URL}/entries`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    throw new Error(message(err, 'Failed to load Pulse entries'));
  }
}

export async function fetchPulseEntry(
  month: string,
): Promise<PulseEntryWithPrevious> {
  try {
    const res = await customAxios.get(`${PULSE_URL}/entries/${month}`);
    return unwrap(res);
  } catch (err: any) {
    throw new Error(message(err, `Failed to load ${month}`));
  }
}

/** Create or update. The backend upserts on month. */
export async function savePulseEntry(
  month: string,
  inputs: PulseInputs & { isExample?: boolean; locked?: boolean },
): Promise<PulseEntry> {
  try {
    const res = await customAxios.put(`${PULSE_URL}/entries/${month}`, inputs);
    return unwrap(res);
  } catch (err: any) {
    throw new Error(message(err, `Failed to save ${month}`));
  }
}

export type PulseFieldSource = 'auto' | 'manual';

export interface PulseAutofillDraft {
  month: string;
  inputs: PulseInputs;
  sources: Record<keyof PulseInputs, PulseFieldSource>;
  notes: string[];
}

/** Computes a month from our own data. Returns a draft — nothing is saved. */
export async function autofillPulseDraft(
  month: string,
): Promise<PulseAutofillDraft> {
  try {
    const res = await customAxios.post(`${PULSE_URL}/entries/${month}/autofill`);
    return unwrap(res);
  } catch (err: any) {
    throw new Error(message(err, `Could not compute ${month} from our data`));
  }
}

/** Same computation, saved. Values an editor typed by hand are kept. */
export async function autofillAndSavePulse(month: string): Promise<PulseEntry> {
  try {
    const res = await customAxios.post(
      `${PULSE_URL}/entries/${month}/autofill/save`,
    );
    return unwrap(res);
  } catch (err: any) {
    throw new Error(message(err, `Could not sync ${month}`));
  }
}

export async function deletePulseEntry(month: string): Promise<void> {
  try {
    await customAxios.delete(`${PULSE_URL}/entries/${month}`);
  } catch (err: any) {
    throw new Error(message(err, `Failed to delete ${month}`));
  }
}

/**
 * Downloads the export. Goes through customAxios so the admin auth header is
 * attached — a plain anchor href would hit the endpoint unauthenticated.
 */
export async function downloadPulseExport(
  format: 'csv' | 'xlsx',
): Promise<void> {
  try {
    const res = await customAxios.get(`${PULSE_URL}/export?format=${format}`, {
      responseType: 'blob',
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `circles-pulse-${stamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick: Safari cancels the download if the URL dies first.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err: any) {
    throw new Error(message(err, 'Failed to export Pulse data'));
  }
}

// ─── Formatting (shared by cards, ledger and tooltips) ───────────────────────

export const fmtInt = (v: number | null) =>
  v == null ? '—' : v.toLocaleString();

export const fmtPct = (v: number | null) =>
  v == null ? '—' : `${(v * 100).toFixed(1)}%`;

export const fmtMoney = (v: number | null) =>
  v == null ? '—' : `$${Math.round(v).toLocaleString()}`;

export const fmtRatio = (v: number | null) =>
  v == null ? '—' : `${v.toFixed(1)}×`;

export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const monthLabelShort = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
};

/** ≥3× healthy, 1–3× neutral, <1× unhealthy. Matches the backend bands. */
export const ltvCacBand = (
  ratio: number | null,
): 'healthy' | 'neutral' | 'unhealthy' | 'unknown' => {
  if (ratio == null) return 'unknown';
  if (ratio >= 3) return 'healthy';
  if (ratio >= 1) return 'neutral';
  return 'unhealthy';
};
