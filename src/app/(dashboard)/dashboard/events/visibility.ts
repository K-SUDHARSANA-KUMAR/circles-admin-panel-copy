const MINUTE = 60_000;

/** 90 → "1 h 30 min", 1500 → "1 d 1 h". */
export function formatGap(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return [d && `${d} d`, h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ') || '0 min';
}

/**
 * When the app stops showing the card, said relative to the event, to the minute.
 * Empty visibleUntil means the event end — the same rule the backend applies.
 */
export function describeVisibility(startsAt?: Date, endsAt?: Date, visibleUntil?: Date): string | null {
  if (!startsAt || !endsAt) return null;
  if (!visibleUntil) return 'Users see this card until the event ends.';

  const fromStart = Math.round((visibleUntil.getTime() - startsAt.getTime()) / MINUTE);
  const fromEnd = Math.round((visibleUntil.getTime() - endsAt.getTime()) / MINUTE);
  const until = (when: string) => `Users see this card until ${when}.`;

  if (fromStart < 0) return until(`${formatGap(-fromStart)} before the event starts`);
  if (fromStart === 0) return until('the event starts');
  if (fromEnd < 0) return until(`${formatGap(fromStart)} after the event starts`);
  if (fromEnd === 0) return until('the event ends');
  return until(`${formatGap(fromEnd)} after the event ends`);
}

/** Member early access, said relative to the event start: when everyone else can join. */
export function describeEarlyAccess(startsAt?: Date, generalAccessAt?: Date): string | null {
  if (!startsAt || !generalAccessAt) return null;
  const fromStart = Math.round((generalAccessAt.getTime() - startsAt.getTime()) / MINUTE);
  const opens =
    fromStart < 0
      ? `${formatGap(-fromStart)} before the event starts`
      : fromStart === 0
        ? 'when the event starts'
        : `${formatGap(fromStart)} after the event starts`;
  return `Members can join as soon as it is published. Everyone else can join from ${opens}.`;
}
