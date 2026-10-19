/**
 * The inbox agent: what happens to each new email.
 *
 *   1. If "Inbox agent off" is on, it's only noted (queued) and nothing else happens.
 *   2. The email is prepared as untrusted data: hidden text removed, instruction-like text flagged.
 *   3. It's linked to the sender's contact, or a new contact is made (no marketing consent).
 *   4. Gus's rules run, then the fast model classifies it (only the visible text and a few facts
 *      about the sender). A malformed answer means "Needs me". Rules and a close deadline combine
 *      with the AI's view (rules.ts).
 *   5. The code (not the AI) picks the fixed actions for that category. Each passes the policy
 *      check first. Refusals are logged.
 *   6. Everything is logged with its reasoning, and on the sender's timeline (summary only).
 *
 * Every step is keyed on the Gmail message id, so a repeated Pub/Sub delivery or a retry never
 * labels, drafts, texts or replies twice.
 */
import type { CoreDeps } from '../deps';
import { normaliseEmail, emailDomain, makeEmailAddress } from '../contacts/addressKind';
import { suppressedScopesFor } from '../consent/suppression';
import { reportProblem } from '../audit/problems';
import { recordReply } from '../pipelines/followUps';
import { isClosed, type Contact } from '../model/contact';
import { INBOX_CATEGORY_LABELS, type AgentAction, type AgentActionKind, type Classification, type InboxCategory, type InboxMessage } from '../model/inbox';
import { fillVariables } from '../templates/render';
import { parseClassification, parseDraft } from './aiOutput';
import { notifyOwner } from './alerts';
import { checkAgentRequest, isAutomatedSender, type AgentRequest, type PolicyContext } from './policy';
import { applyRules, combineCategory } from './rules';
import { prepareEmail } from './untrusted';

const LABEL: Record<InboxCategory, string> = { urgent: 'CRM/Urgent', needs_me: 'CRM/Needs me', routine: 'CRM/Routine', fyi: 'CRM/FYI', noise: 'CRM/Noise' };
const DAY = 86_400_000;

export type HandleOutcome =
  | { status: 'handled'; message: InboxMessage; actions: AgentAction[] }
  | { status: 'queued' | 'duplicate' | 'not_found' };

function senderSummary(c: Contact | undefined, orgName: string | undefined, pipelines: string[]) {
  if (!c) return undefined;
  return { firstName: c.name.first, types: c.types, ...(c.lifecycle ? { stage: c.lifecycle.stage } : {}), ...(orgName ? { organisation: orgName } : {}), inPipelines: pipelines };
}

const replySubject = (subject: string) => (/^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim()}`);

/** Handle one new email by its Gmail id. Safe to call more than once for the same id. */
export async function handleInboundEmail(deps: CoreDeps, messageId: string, options: { backlog?: boolean } = {}): Promise<HandleOutcome> {
  const now = deps.clock.now();
  const at = now.toISOString();
  const killSwitches = await deps.killSwitches.read();
  const existing = await deps.inbox.get(messageId);
  if (existing && existing.status !== 'queued') return { status: 'duplicate' };

  if (killSwitches.inboxAgentOff) {
    if (!existing) {
      await deps.inbox.save({
        id: messageId,
        threadId: '',
        from: { name: '', email: '' },
        subject: '',
        receivedAt: at,
        category: 'needs_me',
        confidence: 0,
        summary: 'Arrived while the agent was off',
        reasons: [],
        suspicious: false,
        suspiciousSignals: [],
        status: 'queued',
        labels: [],
      });
    }
    return { status: 'queued' };
  }

  const email = await deps.mailbox.getMessage(messageId);
  if (!email) return { status: 'not_found' };

  const [inboxSettings, aiSettings] = await Promise.all([deps.settings.getInbox(), deps.settings.getAi()]);
  const prepared = prepareEmail({ subject: email.subject, text: email.text, ...(email.html ? { html: email.html } : {}) });
  const fromEmail = normaliseEmail(email.from.email);
  const automated = isAutomatedSender(email);

  // ---- Who is it from?
  const organisations = await deps.organisations.list();
  const pipelineItems = await deps.pipelineItems.list();
  let sender = (await deps.contacts.findByEmail(fromEmail)).find((c) => !c.mergedInto);
  const domain = emailDomain(fromEmail);
  const org = sender?.orgIds[0] ? organisations.find((o) => o.id === sender!.orgIds[0]) : organisations.find((o) => o.domains.includes(domain));
  const pipelines = await deps.pipelines.list();
  const senderPipelines = sender ? pipelineItems.filter((i) => i.contactId === sender!.id).map((i) => pipelines.find((p) => p.id === i.pipelineId)?.name ?? i.pipelineId) : [];

  // ---- Rules, then the AI.
  const rules = applyRules(inboxSettings.rules, { fromEmail, subject: email.subject, body: prepared.visible, ...(sender ? { sender } : {}), organisations, pipelineItems });
  let classification: Classification;
  let aiOk = false;
  if (aiSettings.enabled) {
    try {
      const raw = await deps.ai.classify(
        {
          from: email.from,
          subject: email.subject,
          body: prepared.visible,
          receivedAt: email.receivedAt,
          today: at.slice(0, 10),
          ...(sender ? { sender: senderSummary(sender, org?.name, senderPipelines)! } : {}),
        },
        aiSettings,
      );
      const parsed = parseClassification(raw);
      classification = parsed.value;
      aiOk = parsed.ok;
    } catch (e) {
      deps.logger.warn('inbox.ai_error', { messageId, error: e instanceof Error ? e.name : 'unknown' });
      classification = parseClassification(undefined).value;
      await reportProblem(deps, { id: `ai_${at.slice(0, 13)}`, area: 'inbox', message: 'The AI didn’t answer, so emails were left as “Needs me” without drafts. They’re all still in your inbox.' });
    }
  } else {
    classification = { category: 'needs_me', confidence: 0, summary: email.subject.slice(0, 160), reason: 'AI is switched off: sorted by your rules only', instructionsDetected: false };
  }
  const deadlineMs = classification.deadline ? Date.parse(classification.deadline.length === 10 ? `${classification.deadline}T17:00:00Z` : classification.deadline) : NaN;
  const deadlineSoon = !Number.isNaN(deadlineMs) && deadlineMs >= now.getTime() - DAY && deadlineMs <= now.getTime() + inboxSettings.deadlineHours * 3_600_000;
  const category = combineCategory(classification.category, rules, deadlineSoon);
  const suspicious = prepared.suspicious || classification.instructionsDetected;
  const signals = [...prepared.signals, ...(classification.instructionsDetected && !prepared.suspicious ? ['The AI noticed instructions aimed at it'] : [])];

  // ---- Policy context. Other people's identifiers are used only to catch them in drafts.
  const contacts = await deps.contacts.list();
  const others = contacts.filter((c) => c.id !== sender?.id && !c.mergedInto);
  const senderSuppressed = sender ? (await suppressedScopesFor(sender, deps)).includes('all') : false;
  const recent = await deps.inbox.listSince(new Date(now.getTime() - DAY).toISOString());
  const ctx: PolicyContext = {
    email,
    ...(sender ? { senderContactId: sender.id } : {}),
    suspicious,
    classification: { ...classification, category },
    inbox: inboxSettings,
    killSwitches,
    answers: await deps.answers.list(),
    others: {
      names: others.filter((c) => c.name.last).map((c) => `${c.name.first} ${c.name.last}`),
      emails: new Set(others.flatMap((c) => c.emails.map((e) => e.normalised))),
      phones: new Set(others.flatMap((c) => c.phones.map((p) => p.e164))),
    },
    senderPhones: sender?.phones.map((p) => p.e164) ?? [],
    ownDomains: [emailDomain(deps.config.senders.replyTo), emailDomain(deps.config.senders.transactionalFrom), emailDomain(deps.config.senders.marketingFrom)].filter(Boolean),
    now,
    threadAutoReplied: recent.some((m) => m.threadId === email.threadId && m.autoReplied),
    autoRepliesToSenderToday: recent.filter((m) => normaliseEmail(m.from.email) === fromEmail && m.autoReplied).length,
    senderSuppressed,
    backlog: !!options.backlog,
  };

  const actions: AgentAction[] = [];
  const log = async (kind: AgentActionKind, description: string, reasoning: string, extra: Partial<AgentAction> = {}) => {
    const a: AgentAction = { id: `act_${messageId}_${kind}_${actions.length}`, messageId, kind, description, reasoning, at, undoable: false, ...extra };
    if (!(await deps.agentLog.get(a.id))) await deps.agentLog.append(a);
    actions.push(a);
    return a;
  };
  /** Every action goes through here: policy first, then do it, then log it. */
  const attempt = async (request: AgentRequest, why: string, run: (flags: string[]) => Promise<Partial<AgentAction> & { description: string }>) => {
    const decision = checkAgentRequest(request, ctx);
    if (!decision.allowed) {
      await log('blocked', `Didn’t ${request.kind.replace(/_/g, ' ')}`, why, { refusedBecause: decision.reason });
      deps.logger.info('inbox.blocked', { messageId, kind: request.kind, reason: decision.reason });
      return undefined;
    }
    const done = await run(decision.flags);
    const kind = request.kind as AgentActionKind;
    return log(kind, done.description, why, done);
  };

  const reasons = [...rules.reasons, ...(aiOk ? [`AI: ${classification.reason}`] : [classification.reason]), ...(deadlineSoon ? [`Deadline ${classification.deadline}`] : [])];
  await log('classify', `Sorted as ${INBOX_CATEGORY_LABELS[category]}${suspicious ? ', flagged as suspicious' : ''}`, reasons.join(' · '), { undoable: false });

  // ---- New contact for a new (human) sender. No consent of any kind.
  if (!sender && !automated) {
    await attempt({ kind: 'create_contact', email: fromEmail }, 'First email from this person', async () => {
      const [first, ...rest] = (email.from.name || fromEmail.split('@')[0]!).trim().split(/\s+/);
      const c: Contact = {
        id: deps.ids.next('c'),
        name: { first: first ?? 'Unknown', ...(rest.length ? { last: rest.join(' ') } : {}) },
        emails: [makeEmailAddress(fromEmail, true)],
        phones: [],
        types: ['Other'],
        lifecycle: null,
        orgIds: org ? [org.id] : [],
        treatAsIndividual: false,
        tags: [],
        source: { channel: 'inbound_email', detail: 'Emailed Gus', capturedAt: email.receivedAt },
        timezone: 'Europe/London',
        consent: {},
        signals: {},
        segmentIds: [],
        ownerOnly: false,
        createdAt: at,
        updatedAt: at,
      };
      await deps.contacts.save(c);
      sender = c;
      ctx.senderContactId = c.id;
      return { description: `Added ${c.name.first} as a new contact (no marketing consent)`, undoable: true, target: { kind: 'contact', id: c.id } };
    });
  }

  // ---- Labels (never delete, archive or move).
  const labels = [LABEL[category], ...(suspicious ? ['CRM/Suspicious'] : [])];
  await attempt({ kind: 'label', labels }, `Sorted as ${INBOX_CATEGORY_LABELS[category]}`, async () => {
    await deps.mailbox.addLabels(messageId, labels);
    return { description: `Labelled ${labels.join(', ')}`, undoable: true, target: { kind: 'label', id: messageId, before: labels.join('|') } };
  });

  const message: InboxMessage = {
    id: messageId,
    threadId: email.threadId,
    from: email.from,
    ...(sender ? { contactId: sender.id } : {}),
    subject: email.subject.slice(0, 300),
    receivedAt: email.receivedAt,
    category,
    ...(category === 'routine' && classification.routineTopic ? { routineTopic: classification.routineTopic } : {}),
    confidence: classification.confidence,
    summary: classification.summary,
    ...(classification.suggestedNextStep ? { suggestedNextStep: classification.suggestedNextStep } : {}),
    ...(!Number.isNaN(deadlineMs) ? { deadline: new Date(deadlineMs).toISOString() } : {}),
    reasons,
    suspicious,
    suspiciousSignals: signals,
    status: category === 'fyi' || category === 'noise' ? 'handled' : 'waiting_for_you',
    labels,
  };

  const senderId = sender?.id;
  const who = sender?.name.first ?? email.from.name ?? fromEmail;

  // ---- Urgent: text Gus, plus a task.
  if (category === 'urgent') {
    // Texts come from a name ("CirclesCRM"), so they can't be replied to: each links to the email.
    const link = deps.config.dashboardUrl ? ` ${deps.config.dashboardUrl.replace(/\/$/, '')}/#/crm/inbox/messages?m=${encodeURIComponent(messageId)}` : '';
    const text = `${`${email.from.name || fromEmail}: ${classification.summary}${classification.suggestedNextStep ? `. Next: ${classification.suggestedNextStep}` : ''}`.slice(0, 300 - link.length)}${link}`;
    await attempt({ kind: 'notify_owner', text, urgent: true }, 'Urgent', async () => {
      const alert = await notifyOwner(deps, {
        id: `alert_${messageId}`,
        kind: 'urgent_email',
        title: `${email.from.name || fromEmail}: ${email.subject}`.slice(0, 120),
        body: classification.summary,
        ...(senderId ? { contactId: senderId } : {}),
        messageId,
        text,
        sms: !options.backlog,
      });
      message.alertId = alert.id;
      return { description: alert.smsSentAt ? 'Texted you about it' : 'Added an urgent alert on Today', undoable: true, target: { kind: 'alert', id: alert.id } };
    });
  }

  // ---- Urgent and Needs me: a task (the email's own ask, or "Reply to…").
  if (category === 'urgent' || category === 'needs_me') {
    const title = (classification.task ? `${who}: ${classification.task}` : `Reply to ${who}: ${email.subject}`).slice(0, 200);
    await attempt({ kind: 'create_task', ...(senderId ? { contactId: senderId } : {}), title }, 'Needs your reply or decision', async () => {
      const id = `task_${messageId}`;
      if (!(await deps.tasks.get(id))) {
        await deps.tasks.save({
          id,
          title,
          dueAt: !Number.isNaN(deadlineMs) && deadlineMs > now.getTime() ? new Date(deadlineMs).toISOString() : at,
          ...(senderId ? { contactId: senderId } : {}),
          source: 'inbox_agent',
          status: 'open',
          link: { kind: 'gmail_message', id: messageId },
          createdBy: 'system:inbox-agent',
          createdAt: at,
          ownerOnly: sender?.ownerOnly ?? false,
        });
      }
      message.taskId = id;
      return { description: `Added a task: ${title}`, undoable: true, target: { kind: 'task', id } };
    });
  }

  // ---- Follow-up date the email implies (sender only).
  if (senderId && classification.followUpDate && (category === 'urgent' || category === 'needs_me')) {
    const before = sender?.nextFollowUpAt;
    const date = `${classification.followUpDate.slice(0, 10)}T09:00:00.000Z`;
    await attempt({ kind: 'set_follow_up', contactId: senderId, date }, 'The email implies a follow-up date', async () => {
      const c = await deps.contacts.get(senderId);
      if (c) await deps.contacts.save({ ...c, nextFollowUpAt: date, updatedAt: at });
      return { description: `Set a follow-up for ${classification.followUpDate}`, undoable: true, target: { kind: 'follow_up', id: senderId, ...(before ? { before } : {}) } };
    });
  }

  // ---- Replies: Needs me → draft. Routine → approved answer (auto only if every condition holds) or draft.
  const firstName = sender?.name.first ?? (email.from.name.split(/\s+/)[0] || 'there');
  const answer = category === 'routine' && classification.routineTopic ? ctx.answers.find((a) => a.category === classification.routineTopic && a.approvedAt) : undefined;
  let replied = false;
  if (category === 'routine' && answer && inboxSettings.routineModes[classification.routineTopic!] === 'auto') {
    const text = fillVariables(answer.body, { first_name: firstName }, { first_name: 'there' }).text;
    const sent = await attempt({ kind: 'send_template_reply', to: fromEmail, text, answerTemplateId: answer.id }, `Routine question with an approved answer, ${Math.round(classification.confidence * 100)}% sure`, async () => {
      const id = await deps.mailbox.sendReply({ threadId: email.threadId, to: fromEmail, subject: replySubject(email.subject), text, ...(email.headers.messageId ? { inReplyTo: email.headers.messageId } : {}), idempotencyKey: `autoreply_${messageId}` });
      await deps.mailbox.addLabels(messageId, ['CRM/Auto-replied']);
      return { description: `Sent your approved answer “${answer.name}”`, undoable: false, target: { kind: 'reply', id } };
    });
    if (sent) {
      replied = true;
      message.autoReplied = true;
      message.status = 'handled';
      message.labels = [...message.labels, 'CRM/Auto-replied'];
    } else {
      message.autoReplyBlockedBecause = actions.at(-1)?.refusedBecause ?? 'Not allowed';
    }
  }

  const wantsDraft = !replied && (category === 'needs_me' || category === 'routine') && !automated;
  if (wantsDraft) {
    let text: string | undefined;
    if (aiSettings.enabled) {
      try {
        const answers = ctx.answers.filter((a) => a.approvedAt && a.category === classification.routineTopic).map((a) => ({ id: a.id, name: a.name, body: a.body }));
        text = parseDraft(
          await deps.ai.draftReply(
            {
              from: email.from,
              subject: email.subject,
              body: prepared.visible,
              ...(sender
                ? { sender: { firstName: sender.name.first, ...(sender.lifecycle ? { stage: sender.lifecycle.stage } : {}), ...(sender.signals.city ? { city: sender.signals.city } : {}), ...(sender.signals.freePeriod ? { freeMonthsEnd: sender.signals.freePeriod.endsAt.slice(0, 10) } : {}) } }
                : {}),
              answers,
              voice: aiSettings.voice,
            },
            aiSettings,
          ),
        );
      } catch (e) {
        deps.logger.warn('inbox.draft_error', { messageId, error: e instanceof Error ? e.name : 'unknown' });
      }
    }
    if (!text && answer) text = fillVariables(answer.body, { first_name: firstName }, { first_name: 'there' }).text;
    if (text) {
      const draftText = text;
      await attempt({ kind: 'draft_reply', to: fromEmail, text: draftText }, category === 'routine' ? 'Routine question: a draft for you to check' : 'Needs your reply', async (flags) => {
        const draftId = `dr_${messageId}`;
        let draft = await deps.drafts.get(draftId);
        if (!draft) {
          const gmailDraftId = await deps.mailbox.createDraft({ threadId: email.threadId, to: fromEmail, subject: replySubject(email.subject), text: draftText, ...(email.headers.messageId ? { inReplyTo: email.headers.messageId } : {}) });
          draft = { id: draftId, source: 'inbox_agent', ...(senderId ? { contactId: senderId } : {}), to: fromEmail, subject: replySubject(email.subject), text: draftText, status: 'open', gmailDraftId, ownerOnly: true, createdAt: at };
          await deps.drafts.save(draft);
        }
        message.draftId = draftId;
        if (flags.length) message.draftFlagged = flags;
        return { description: flags.length ? `Saved a draft reply in Gmail, flagged: it mentions ${flags.join(' and ')}` : 'Saved a draft reply in Gmail', undoable: true, target: { kind: 'draft', id: draftId } };
      });
    }
  }

  // ---- A reply stops follow-ups with them (pipeline rules and "no reply" automations).
  if (sender && !automated) await recordReply(deps, sender.id, email.receivedAt);

  // ---- Timeline (summary only, never the email itself).
  if (sender) {
    await deps.timeline.append({
      id: `tl_in_${messageId}`,
      contactId: sender.id,
      kind: 'email_in',
      summary: `Emailed: ${email.subject.slice(0, 120)} (${INBOX_CATEGORY_LABELS[category]})`,
      at: email.receivedAt,
      actor: 'system:inbox-agent',
      ref: { kind: 'gmail_message', id: messageId },
      ownerOnly: sender.ownerOnly || isClosed(sender),
    });
  }

  await deps.inbox.save(message);
  deps.logger.info('inbox.handled', { messageId, category, suspicious, actions: actions.length });
  return { status: 'handled', message, actions };
}

/**
 * When the agent is switched back on: handle everything that arrived while it was off. They're
 * classified, labelled and drafted as normal, never auto-replied (it would be late), and instead of
 * a text per urgent email Gus gets one summary text.
 */
export async function processBacklog(deps: CoreDeps): Promise<{ handled: number; urgent: number }> {
  if ((await deps.killSwitches.read()).inboxAgentOff) return { handled: 0, urgent: 0 };
  let handled = 0;
  let urgent = 0;
  for (const m of await deps.inbox.listQueued()) {
    const r = await handleInboundEmail(deps, m.id, { backlog: true });
    if (r.status === 'handled') {
      handled += 1;
      if (r.message.category === 'urgent') urgent += 1;
    }
  }
  if (urgent > 0) {
    const now = deps.clock.now().toISOString();
    await notifyOwner(deps, {
      id: `alert_backlog_${now.slice(0, 16)}`,
      kind: 'system',
      title: 'Inbox agent back on',
      body: `${urgent} urgent email${urgent === 1 ? '' : 's'} arrived while it was off.`,
      text: `Circles: ${urgent} urgent email${urgent === 1 ? '' : 's'} arrived while the inbox agent was off. See Today.`,
      sms: true,
    });
  }
  return { handled, urgent };
}

/** Category of the target, for the activity log's undo buttons. */
export type { AgentRequest };
