/**
 * Hashing and signing with Web Crypto, available in Node 20+, Cloud Functions and browsers.
 *
 * TODO-SECURITY: secrets passed in here (suppression pepper, unsubscribe signing key) must come
 * from Secret Manager in production, be at least 32 random bytes, and differ per environment.
 * Rotating the suppression pepper invalidates every existing suppression hash, so rotate the
 * unsubscribe key freely but treat the pepper as long-lived (or re-hash on rotation).
 */
import type { Hasher, Signer } from './ports';

const encoder = new TextEncoder();

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('Web Crypto is not available in this runtime');
  return c.subtle;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(buffer: ArrayBuffer): string {
  let binary = '';
  for (const b of new Uint8Array(buffer)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlEncodeString(value: string): string {
  return toBase64Url(encoder.encode(value).buffer as ArrayBuffer);
}

export function base64UrlDecodeString(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await subtle().digest('SHA-256', encoder.encode(value)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 16) throw new Error('HMAC secret is too short');
  return subtle().importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Keyed hash for suppression entries: the same identifier always gives the same hash. */
export function createHmacHasher(secret: string): Hasher {
  const keyPromise = hmacKey(secret);
  return {
    async hash(value: string) {
      const key = await keyPromise;
      return toHex(await subtle().sign('HMAC', key, encoder.encode(value)));
    },
  };
}

export function createHmacSigner(secret: string): Signer {
  const keyPromise = hmacKey(secret);
  return {
    async sign(payload: string) {
      const key = await keyPromise;
      return toBase64Url(await subtle().sign('HMAC', key, encoder.encode(payload)));
    },
    async verify(payload: string, signature: string) {
      const key = await keyPromise;
      const expected = toBase64Url(await subtle().sign('HMAC', key, encoder.encode(payload)));
      // Constant-time comparison.
      if (expected.length !== signature.length) return false;
      let diff = 0;
      for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
      return diff === 0;
    },
  };
}
