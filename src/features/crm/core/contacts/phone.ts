/**
 * Phone numbers to international format (+447700900123), UK by default. Deliberately simple and
 * dependency-free; it errs towards returning undefined rather than guessing.
 * TODO: swap for libphonenumber-js if members outside the UK become common.
 */
export function normalisePhone(raw: string | undefined, defaultCountry: 'GB' = 'GB'): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim().replace(/[\s().-]/g, '');
  if (!s) return undefined;
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return undefined;
    // UK numbers written as +44 0…: drop the trunk zero.
    if (digits.startsWith('440')) return `+44${digits.slice(3)}`;
    return `+${digits}`;
  }
  const digits = s.replace(/\D/g, '');
  if (defaultCountry === 'GB') {
    if (digits.startsWith('44') && digits.length >= 12) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 11) return `+44${digits.slice(1)}`;
    if (digits.startsWith('7') && digits.length === 10) return `+44${digits}`;
  }
  return undefined;
}
