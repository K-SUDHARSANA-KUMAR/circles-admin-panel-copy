import type { AnswerTemplate } from '../model/template';

/**
 * Standard answers for routine questions, in Gus's voice. They ship NOT approved: the agent only
 * uses them for drafts until Gus approves each one in Inbox → Rules, and only sends one
 * automatically if he also sets that kind of question to "Auto-reply". Editing the wording
 * withdraws approval. Only {first_name} may be used, so an answer can never contain anyone else's
 * details.
 */
export const DEFAULT_ANSWER_TEMPLATES: AnswerTemplate[] = [
  {
    id: 'ans_membership',
    category: 'membership_question',
    name: 'Membership: what you get, and cancelling',
    answers: 'Prices, Member vs Guest, what’s included, how to cancel',
    body: `Hi {first_name},

Thanks for asking. Your first three months are free. After that you can stay on as a Member, or carry on free as a Guest.

Members get priority access to events and cheaper tickets, can bring a +1 (they’ll need the app), can go Incognito, see everyone at a Live Moment (Guests see two), and can redeem partner perks like NOAM.

You can change or cancel any time. On iPhone that’s in Settings → Apple ID → Subscriptions; on Android it’s in Google Play → Subscriptions.

Gus`,
    approvedBy: '',
    approvedAt: '',
    version: 1,
  },
  {
    id: 'ans_how_to',
    category: 'how_to',
    name: 'How-tos: where the guides are',
    answers: 'How to add friends, make a plan, edit a profile, change settings',
    body: `Hi {first_name},

Good question. There are short guides in the app under Profile → Help: adding friends, making a plan, and editing your profile and photo.

If that doesn’t sort it, just reply here and I’ll help.

Gus`,
    approvedBy: '',
    approvedAt: '',
    version: 1,
  },
  {
    id: 'ans_events',
    category: 'event_details',
    name: 'Events: where, when, bringing someone',
    answers: 'Where and when this week’s evening is, bringing a friend',
    body: `Hi {first_name},

This week’s members’ evening is on the Events tab in the app, with the venue, time and a link to register. Members can bring a +1, as long as they have the app too.

See you there,
Gus`,
    approvedBy: '',
    approvedAt: '',
    version: 1,
  },
  {
    id: 'ans_application',
    category: 'applicant_status',
    name: 'Applications: what happens next',
    answers: 'Where an application is, how long it takes',
    body: `Hi {first_name},

Thanks for applying. We look at every application ourselves, and it usually takes a few days. You’ll get a notification and an email as soon as there’s news, and there’s nothing else you need to do.

Gus`,
    approvedBy: '',
    approvedAt: '',
    version: 1,
  },
];
