import type { ContactId, IsoDateTime } from './common';

/** Monday 08:00 weekly brief. Facts are computed by the CRM; the AI only writes them up. */
export interface WeeklyBrief {
  id: string;
  weekOf: string; // YYYY-MM-DD (Monday)
  generatedAt: IsoDateTime;
  /** The short write-up shown on Today and emailed to Gus. */
  text: string;
  contactThisWeek: { contactId: ContactId; reason: string }[];
  segmentMoves: { segmentId: string; name: string; from: number; to: number }[];
  conversion: { thisWeek: Record<string, number>; lastWeek: Record<string, number> };
  partnerFollowUpsDue: { itemId: string; title: string; dueAt: IsoDateTime }[];
  writtenBy: 'ai' | 'template';
}

export interface DailyDigest {
  id: string;
  date: string;
  generatedAt: IsoDateTime;
  text: string;
  counts: Record<string, number>;
}
