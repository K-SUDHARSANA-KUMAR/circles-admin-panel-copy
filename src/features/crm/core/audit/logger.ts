/**
 * PII-safe logger. Every log line in the CRM goes through this, so personal data never reaches
 * Cloud Logging or analytics. Log contact ids, never names, emails, phones or message content.
 *
 * Two layers of protection:
 *   1. Fields with personal-data names are dropped to "[redacted]" whatever their value.
 *   2. Every remaining string is scanned, and anything shaped like an email address or phone
 *      number is masked.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

export type LogSink = (level: LogLevel, event: string, fields: Record<string, unknown>) => void;

const REDACTED_KEYS = new Set(
  [
    'email',
    'emails',
    'to',
    'from',
    'cc',
    'bcc',
    'replyto',
    'phone',
    'phones',
    'mobile',
    'name',
    'firstname',
    'lastname',
    'fullname',
    'displayname',
    'address',
    'subject',
    'body',
    'text',
    'html',
    'snippet',
    'content',
    'message',
    'note',
    'notes',
    'summary',
    'token',
    'tokens',
    'password',
    'secret',
    'apikey',
    'authorization',
    'ip',
  ].map((k) => k.toLowerCase()),
);

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// International or UK-style phone numbers: +447700900123, 07700 900123, (020) 7946 0958 …
// The lookbehind stops it matching digits inside ids like "snd_8f3a1234567890".
const PHONE_PATTERN = /(?<![\w.])(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)\d{3,4}[\s-]?\d{3,4}\b/g;

export function scrubString(value: string): string {
  return value.replace(EMAIL_PATTERN, '[email]').replace(PHONE_PATTERN, (m) => (m.replace(/\D/g, '').length >= 9 ? '[phone]' : m));
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    if (value instanceof Error) return { name: value.name, message: scrubString(value.message) };
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function createSafeLogger(sink: LogSink): Logger {
  const write = (level: LogLevel) => (event: string, fields: Record<string, unknown> = {}) => {
    sink(level, scrubString(event), redact(fields) as Record<string, unknown>);
  };
  return { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') };
}

/** Logger that writes structured JSON lines to the console (works with Cloud Logging). */
export function createConsoleLogger(minLevel: LogLevel = 'info'): Logger {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return createSafeLogger((level, event, fields) => {
    if (order.indexOf(level) < order.indexOf(minLevel)) return;
    const line = JSON.stringify({ severity: level.toUpperCase(), event, ...fields });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  });
}

export const silentLogger: Logger = createSafeLogger(() => undefined);
