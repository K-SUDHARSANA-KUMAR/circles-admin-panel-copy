/** Date and number formatting for the UI. Everything shows in Gus's time zone, British style. */
const TZ = 'Europe/London';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });
const dShort = fmt({ day: 'numeric', month: 'short' });
const dWithYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const dWeekday = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const dLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const tShort = fmt({ hour: '2-digit', minute: '2-digit' });

export const DAY = 86_400_000;

export function shortDate(iso?: string, now?: string): string {
  if (!iso) return '—';
  const sameYear = now ? new Date(iso).getUTCFullYear() === new Date(now).getUTCFullYear() : true;
  return (sameYear ? dShort : dWithYear).format(new Date(iso));
}
export const weekdayDate = (iso?: string) => (iso ? dWeekday.format(new Date(iso)) : '—');
export const longDate = (iso?: string) => (iso ? dLong.format(new Date(iso)) : '—');
export const time = (iso?: string) => (iso ? tShort.format(new Date(iso)) : '');
export const dateTime = (iso?: string) => (iso ? `${dWeekday.format(new Date(iso))}, ${tShort.format(new Date(iso))}` : '—');

/** "just now", "3 hours ago", "yesterday", "5 days ago", "in 2 days", "12 Sept". */
export function relative(iso: string | undefined, now: string): string {
  if (!iso) return '—';
  const diff = Date.parse(now) - Date.parse(iso);
  const abs = Math.abs(diff);
  const future = diff < 0;
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / DAY);
  if (mins < 2) return 'just now';
  if (mins < 60) return future ? `in ${mins} min` : `${mins} min ago`;
  if (hours < 24) return future ? `in ${hours} hour${hours === 1 ? '' : 's'}` : `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return future ? 'tomorrow' : 'yesterday';
  if (days < 30) return future ? `in ${days} days` : `${days} days ago`;
  return shortDate(iso, now);
}

/** Whole days from now until iso (negative = in the past). */
export const daysUntil = (iso: string, now: string) => Math.floor((Date.parse(iso) - Date.parse(now)) / DAY);

export const num = (n: number) => new Intl.NumberFormat('en-GB').format(n);
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);

export const initials = (first: string, last?: string) => `${first.charAt(0)}${last?.charAt(0) ?? ''}`.toUpperCase();
export const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;
