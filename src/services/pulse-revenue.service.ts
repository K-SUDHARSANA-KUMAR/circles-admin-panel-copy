import customAxios from '@/lib/axios';
import { PULSE_URL } from '@/services/pulse.service';

// ─── Types (mirror user-service PulseRevenueResponseDto) ─────────────────────

/** Rates are fractions (0.25 = 25%), like the rest of Pulse. */
export interface ResolvedAssumption {
  saved: number;
  /** Measured from the last complete months; null until there is data. */
  actual: number | null;
  /** How many trials / members / new payers the actual is based on. */
  sample: number;
  useActual: boolean;
  used: number;
  source: 'actual' | 'assumption';
}

export interface PlanPrice {
  saved: number | null;
  actual: number | null;
  used: number | null;
  source: 'actual' | 'assumption' | 'missing';
}

export interface RevenueAssumptions {
  trialToPaid: ResolvedAssumption;
  monthlyChurn: ResolvedAssumption;
  annualShare: ResolvedAssumption;
  storeFee: number;
  usdToGbp: number;
  monthlyPrice: PlanPrice;
  annualPrice: PlanPrice;
  trialsPerMonth: number;
  trailingMonths: number;
}

export interface RevenueMonth {
  month: string;
  kind: 'actual' | 'forecast';
  partial: boolean;
  monthlyMembers: number;
  annualMembers: number;
  newMonthly: number;
  newAnnual: number;
  churnedMonthly: number;
  mrrGross: number;
  arrGross: number;
  arrNet: number;
  arrChange: number | null;
  eventsRevenue: number | null;
}

export interface RevenueProjection {
  months: number;
  endMonth: string;
  arrGrossNow: number;
  arrNetNow: number;
  arrGrossEnd: number;
  arrNetEnd: number;
  arrGrowth: number | null;
  revenueGross: number;
  revenueNet: number;
}

export interface PulseRevenue {
  currency: 'GBP';
  generatedAt: string;
  assumptions: RevenueAssumptions;
  months: RevenueMonth[];
  projection: RevenueProjection;
  notes: string[];
}

export interface RevenueAssumptionsUpdate {
  trialToPaid?: number;
  monthlyChurn?: number;
  annualShare?: number;
  storeFee?: number;
  usdToGbp?: number;
  monthlyPriceGbp?: number | null;
  annualPriceGbp?: number | null;
  useActualTrialToPaid?: boolean;
  useActualChurn?: boolean;
  useActualAnnualShare?: boolean;
}

// ─── Calls ───────────────────────────────────────────────────────────────────

const REVENUE_URL = `${PULSE_URL}/revenue`;

/** The gateway may wrap the body as `{ result: { data } }` or `{ data }`. */
interface Wrapped<T> {
  data?: T & { data?: T; result?: { data?: T } };
}

const unwrap = <T,>(res: Wrapped<T>): T =>
  (res.data?.result?.data ?? res.data?.data ?? res.data) as T;

const message = (err: unknown, fallback: string): string => {
  const e = err as {
    message?: string;
    response?: { data?: { message?: string; result?: { message?: string } } };
  };
  return (
    e?.response?.data?.result?.message ||
    e?.response?.data?.message ||
    e?.message ||
    fallback
  );
};

export async function fetchPulseRevenue(): Promise<PulseRevenue> {
  try {
    return unwrap<PulseRevenue>(await customAxios.get(REVENUE_URL));
  } catch (err: unknown) {
    throw new Error(message(err, 'Failed to load revenue'));
  }
}

/** Saves the assumptions; the response is the recomputed page. */
export async function savePulseRevenueAssumptions(
  update: RevenueAssumptionsUpdate,
): Promise<PulseRevenue> {
  try {
    return unwrap<PulseRevenue>(
      await customAxios.put(`${REVENUE_URL}/assumptions`, update),
    );
  } catch (err: unknown) {
    throw new Error(message(err, 'Failed to save assumptions'));
  }
}

export async function savePulseEventsRevenue(
  month: string,
  amount: number,
): Promise<void> {
  try {
    await customAxios.put(`${REVENUE_URL}/events/${month}`, { amount });
  } catch (err: unknown) {
    throw new Error(message(err, `Failed to save events revenue for ${month}`));
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export const fmtGbp = (v: number | null) =>
  v == null
    ? '—'
    : `£${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

export const fmtGbp2 = (v: number | null) =>
  v == null
    ? '—'
    : `£${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Forecast members are fractional; one decimal is enough to read the trend. */
export const fmtMembers = (v: number) =>
  Number.isInteger(v) ? v.toLocaleString('en-GB') : v.toFixed(1);

export const fmtChange = (v: number | null) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
