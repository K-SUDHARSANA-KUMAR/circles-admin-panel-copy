import type { IsoDateTime, TemplateId } from './common';
import type { Purpose } from './consent';
import type { Channel, MessageClass } from './message';

export const TEMPLATE_VARIABLES = [
  { id: 'first_name', label: 'First name', example: 'Robin' },
  { id: 'inviter_name', label: 'Who invited them', example: 'Sam' },
  { id: 'trial_end_date', label: 'Free months end', example: 'Thursday 14 January' },
  { id: 'friends_count', label: 'Number of friends', example: '4' },
  { id: 'event_name', label: 'Event name', example: 'Thursday at The Lamb' },
  { id: 'event_date', label: 'Event date', example: 'Thursday 8 October' },
  { id: 'event_link', label: 'Event link (Luma)', example: 'https://lu.ma/circles-thursday' },
  { id: 'venue_name', label: 'Venue', example: 'The Lamb' },
  { id: 'city', label: 'City', example: 'London' },
  { id: 'paywall_link', label: 'Upgrade link (opens the app paywall)', example: 'https://thecirclesclub.com/app/paywall' },
  { id: 'app_link', label: 'Open the app', example: 'https://thecirclesclub.com/app' },
  { id: 'membership_link', label: 'Membership screen in the app (end of free months)', example: 'https://thecirclesclub.com/app/membership' },
  { id: 'signup_link', label: 'Finish signing up', example: 'https://thecirclesclub.com/app/signup' },
  { id: 'web_join_link', label: 'Join on the web (off until a web checkout is set up)', example: 'https://thecirclesclub.com/join' },
  { id: 'org_name', label: 'Organisation', example: 'The Lamb' },
  { id: 'sender_first_name', label: 'Your first name', example: 'Gus' },
  { id: 'month', label: 'Month (investor update)', example: 'September 2026' },
  { id: 'numbers', label: 'Key numbers (investor update)', example: 'App users: 212 (18 new in September)' },
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]['id'];

export interface Template {
  id: TemplateId;
  name: string;
  description?: string;
  channel: Channel;
  messageClass: MessageClass;
  purpose?: Purpose;
  layout: 'branded' | 'plain';
  /** Email fields. */
  subject?: string;
  preheader?: string;
  /** Body with {variables}. Blank line = new paragraph. */
  body?: string;
  /** Push fields. */
  pushTitle?: string;
  pushBody?: string;
  /** What to use when a variable is empty, e.g. { first_name: "there" }. Missing + no fallback = not sent. */
  fallbacks: Partial<Record<TemplateVariable, string>>;
  version: number;
  updatedAt: IsoDateTime;
  updatedBy: string;
}

export interface TemplateVersion extends Template {
  /** Who saved this version and a one-line note. */
  note?: string;
}

/** Approved answers the inbox agent may send as auto-replies (only for categories set to auto). */
export interface AnswerTemplate {
  id: string;
  /** Routine category this answers, e.g. "membership_question". */
  category: string;
  name: string;
  /** Short description of the questions it answers, given to the classifier. */
  answers: string;
  body: string;
  approvedBy: string;
  approvedAt: IsoDateTime;
  version: number;
}
