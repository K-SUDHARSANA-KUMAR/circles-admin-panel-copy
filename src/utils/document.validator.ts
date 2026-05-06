// validators.ts
// Type-safe validators for Aadhaar (Verhoeff), Driving License, FSSAI, PAN, GSTIN.
// All array accesses are guarded to avoid "possibly undefined" errors in strict TS.

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/* ---------- Verhoeff tables (as const) ---------- */
const dTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
] as const;

const pTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
] as const;

/* ---------- helpers ---------- */
function toDigitsReversed(num: string): Digit[] {
  const out: Digit[] = [];
  for (let i = num.length - 1; i >= 0; i--) {
    const ch = num[i];
    if (ch === undefined) {
      // This case should not be reached due to the loop condition
      throw new Error("Unexpected undefined character");
    }
    const code = ch.charCodeAt(0) - 48; // '0' => 48
    if (code < 0 || code > 9) {
      throw new Error("Non-digit character while parsing digits");
    }
    out.push(code as Digit);
  }
  return out;
}

/* ---------- Verhoeff (safe) ---------- */
/**
 * Validates a numeric string using the Verhoeff algorithm.
 * Returns false for any non-digit input.
 */
export function verhoeffValidate(num: string): boolean {
  if (!/^\d+$/.test(num)) return false;

  let c: Digit = 0;
  try {
    const arr = toDigitsReversed(num);
    let i = 0;
    for (const val of arr) {
      const pRow = pTable[i % 8];
      if (!pRow) return false;

      const p = pRow[val];
      if (p === undefined) return false;

      const dRow = dTable[c];
      if (!dRow) return false;

      const newC = dRow[p];
      if (newC === undefined) return false;

      c = newC as Digit;
      i++;
    }
  } catch (e) {
    return false; // Catches non-digit errors from toDigitsReversed
  }

  return c === 0;
}

/* ---------- Aadhaar ---------- */
/**
 * Aadhaar: 12 digits, cannot start with 0 or 1, last digit is Verhoeff checksum.
 */
export function validateAadhaar(input: string): boolean {
  if (!input) return false;
  const clean = input.replace(/\s+/g, "");
  if (!/^[2-9]\d{11}$/.test(clean)) return false;
  return verhoeffValidate(clean);
}

/* ---------- Driving License ---------- */
/**
 * Checks basic DL format: 2 letters (state), 2 digits (RTO), 4 digits (year), 7 digits (unique)
 * Accepts both with/without separators.
 */
export function validateDrivingLicense(input: string): boolean {
  if (!input) return false;
  const clean = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(clean);
}

/* ---------- FSSAI ---------- */
export function validateFSSAI(input: string): boolean {
  if (!input) return false;
  const clean = input.replace(/\s+/g, "");
  return /^\d{14}$/.test(clean);
}

/* ---------- PAN ---------- */
export function validatePAN(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().toUpperCase();
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(clean);
}

/* ---------- GSTIN ---------- */
/**
 * GSTIN format check:
 * - 2-digit state code (01-37)
 * - 10-char PAN
 * - 1 entity char (alphanumeric)
 * - 'Z'
 * - 1 checksum char
 */
export function validateGSTIN(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().toUpperCase();
  return /^(0[1-9]|1\d|2\d|3[0-7])[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(clean);
}

/* ---------- default export ---------- */
export default {
  verhoeffValidate,
  validateAadhaar,
  validateDrivingLicense,
  validateFSSAI,
  validatePAN,
  validateGSTIN,
};