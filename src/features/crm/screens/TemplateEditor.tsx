import { findMarketingContent, investorNumbers, monthLabel, PermissionDeniedError, PURPOSE_LABELS, PURPOSES, renderTemplate, TEMPLATE_VARIABLES, TemplateValidationError, variablesFor, type Purpose, type Template } from '../core';
import { AlertTriangle, ArrowLeft, History, RotateCcw, Send } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from '../router';
import { fullName } from '../components/crm';
import { Button, Card, CardHeader, Empty, Field, Pill, Select, Sheet, Tabs, toast } from '../components/ui';
import { relative } from '../data/format';
import { useBackend } from '../data/useBackend';
import { CrmRequestError } from '../data/backend';

const KNOWN = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.id));

export function TemplateEditor() {
  const { id } = useParams();
  const b = useBackend();
  const saved = b.state.templates.find((t) => t.id === id);
  const [draft, setDraft] = useState<Template | undefined>(saved);
  const [previewId, setPreviewId] = useState('');
  const [view, setView] = useState<'email' | 'text'>('email');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const canEdit = b.can('templates.write');

  const contacts = useMemo(() => b.visibleContacts().filter((c) => c.appUserId && c.lifecycle?.stage !== 'Applicant').slice(0, 80), [b.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const contact = b.contact(previewId) ?? (draft?.messageClass === 'business' ? b.visibleContacts().find((c) => c.orgIds.length > 0) : contacts[0]);

  if (!saved || !draft) {
    return (
      <Card>
        <Empty title="Template not found" />
      </Card>
    );
  }
  const nextEvent = b.state.world.lumaEvents.filter((e) => e.startsAt > b.state.now).sort((x, y) => x.startsAt.localeCompare(y.startsAt))[0];
  const venue = nextEvent?.venueOrgId ? b.state.world.organisations.find((o) => o.id === nextEvent.venueOrgId)?.name : undefined;
  const org = contact?.orgIds[0] ? b.state.world.organisations.find((o) => o.id === contact.orgIds[0]) : undefined;
  const vars = variablesFor(contact, {
    campaign: draft.id,
    ...(org ? { orgName: org.name } : {}),
    ...(nextEvent ? { event: { name: nextEvent.name, startsAt: nextEvent.startsAt, url: nextEvent.url, ...(venue ? { venueName: venue } : {}) } } : {}),
    month: monthLabel(new Date(b.state.now)),
    ...(draft.body?.includes('{numbers}') ? { numbers: investorNumbers(b.state.world.contacts, new Date(b.state.now)) } : {}),
  });
  const result = renderTemplate(draft, vars);
  const allText = [draft.subject, draft.preheader, draft.body, draft.pushTitle, draft.pushBody].filter(Boolean).join('\n');
  const unknown = [...new Set([...allText.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!).filter((v) => !KNOWN.has(v)))];
  const marketingFindings = draft.messageClass === 'transactional' ? findMarketingContent({ texts: [draft.subject, draft.preheader, draft.body, draft.pushTitle, draft.pushBody] }) : [];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const history = b.state.templateHistory.filter((h) => h.templateId === saved.id);

  const insert = (variable: string) => {
    const el = bodyRef.current;
    const token = `{${variable}}`;
    if (!el || draft.channel !== 'email') {
      setDraft({ ...draft, ...(draft.channel === 'push' ? { pushBody: `${draft.pushBody ?? ''}${token}` } : { body: `${draft.body ?? ''}${token}` }) });
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const body = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
    setDraft({ ...draft, body });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-5">
      <Link to="/crm/templates" className="inline-flex items-center gap-1.5 text-sm text-crm-ink-2 hover:text-crm-ink">
        <ArrowLeft size={16} /> Templates
      </Link>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={draft.name}
            hint={`Version ${saved.version}${dirty ? ' · unsaved changes' : ''}`}
            right={
              canEdit && (
                <Button variant="primary" size="sm" disabled={!dirty || marketingFindings.length > 0 || unknown.length > 0} onClick={() => setSaving(true)}>
                  Save
                </Button>
              )
            }
          />
          <fieldset disabled={!canEdit} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Kind of message">
                <Select
                  value={draft.messageClass}
                  onChange={(v) => setDraft({ ...draft, messageClass: v, ...(v === 'marketing' && !draft.purpose ? { purpose: 'marketing' as Purpose } : {}) })}
                  options={[
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'transactional', label: 'Service message' },
                    { value: 'business', label: 'Business outreach' },
                  ]}
                />
              </Field>
              {draft.messageClass === 'marketing' && (
                <Field label="Purpose (consent needed)">
                  <Select<Purpose> value={draft.purpose ?? 'marketing'} onChange={(v) => setDraft({ ...draft, purpose: v })} options={PURPOSES.map((p) => ({ value: p, label: PURPOSE_LABELS[p] }))} />
                </Field>
              )}
              {draft.channel === 'email' && (
                <Field label="Layout">
                  <Select<'plain' | 'branded'>
                    value={draft.layout}
                    onChange={(v) => setDraft({ ...draft, layout: v })}
                    options={[
                      { value: 'plain', label: 'Plain, reads like you' },
                      { value: 'branded', label: 'Branded Circles' },
                    ]}
                  />
                </Field>
              )}
            </div>

            {draft.channel === 'email' ? (
              <>
                <Field label="Subject">
                  <input className="input" value={draft.subject ?? ''} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                </Field>
                <Field label="Preview text (shown after the subject in the inbox)">
                  <input className="input" value={draft.preheader ?? ''} onChange={(e) => setDraft({ ...draft, preheader: e.target.value })} />
                </Field>
                <Field label="Email">
                  <textarea ref={bodyRef} className="textarea min-h-[280px] font-[inherit]" value={draft.body ?? ''} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Notification title">
                  <input className="input" value={draft.pushTitle ?? ''} onChange={(e) => setDraft({ ...draft, pushTitle: e.target.value })} />
                </Field>
                <Field label="Notification text">
                  <textarea className="textarea min-h-[90px]" value={draft.pushBody ?? ''} onChange={(e) => setDraft({ ...draft, pushBody: e.target.value })} />
                </Field>
              </>
            )}

            <div>
              <div className="mb-1.5 text-[13px] font-medium text-crm-ink-2">Insert a detail (click to add it where your cursor is)</div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button key={v.id} type="button" onClick={() => insert(v.id)} className="h-7 rounded-full border border-crm-line-strong px-2.5 text-xs text-crm-ink-2 hover:border-crm-accent hover:text-crm-ink" title={`e.g. ${v.example}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="If someone’s first name is missing, say" hint="Leave blank and the message won’t send to anyone without a first name.">
              <input className="input w-48" value={draft.fallbacks.first_name ?? ''} onChange={(e) => setDraft({ ...draft, fallbacks: { ...draft.fallbacks, first_name: e.target.value } })} />
            </Field>

            {marketingFindings.length > 0 && (
              <div className="rounded-xl border border-crm-bad/40 bg-crm-bad/10 p-3 text-sm text-crm-bad">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle size={15} /> Service messages can’t include marketing
                </div>
                <div className="mt-1 text-crm-ink-2">Take out: {marketingFindings.map((f) => `“${f.match}”`).join(', ')}. Otherwise it would be blocked when it tries to send.</div>
              </div>
            )}
            {unknown.length > 0 && <div className="rounded-xl border border-crm-warn/40 bg-crm-warn/10 p-3 text-sm text-crm-warn">Unknown details: {unknown.map((u) => `{${u}}`).join(', ')}. Check the spelling.</div>}
          </fieldset>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Preview"
              right={draft.channel === 'email' && <Tabs<'email' | 'text'> value={view} onChange={setView} items={[{ value: 'email', label: 'Email' }, { value: 'text', label: 'Plain text' }]} />}
            />
            <div className="space-y-3 p-5">
              <Select value={contact?.id ?? ''} onChange={setPreviewId} options={(draft.messageClass === 'business' ? b.visibleContacts().filter((c) => c.orgIds.length) : contacts).slice(0, 80).map((c) => ({ value: c.id, label: `As ${fullName(c)}` }))} ariaLabel="Preview as" />
              {result.missing.length > 0 && <div className="text-xs text-crm-warn">No value for {result.missing.map((m) => `{${m}}`).join(', ')} for this person, so it wouldn’t send to them.</div>}
              {result.email &&
                (view === 'email' ? (
                  <>
                    <div className="text-sm">
                      <span className="text-crm-ink-3">Subject: </span>
                      {result.email.subject}
                    </div>
                    <iframe title="Email preview" sandbox="allow-same-origin" className="h-[520px] w-full rounded-xl border border-crm-line bg-white" srcDoc={result.email.html} />
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap rounded-xl border border-crm-line bg-crm-raised p-4 font-sans text-sm text-crm-ink-2">{result.email.text}</pre>
                ))}
              {result.push && (
                <div className="mx-auto max-w-xs rounded-[2rem] border-4 border-crm-line-strong bg-[#111] p-4">
                  <div className="rounded-2xl bg-crm-raised p-3">
                    <div className="text-[11px] text-crm-ink-3">THE CIRCLES CLUB · now</div>
                    <div className="mt-0.5 text-sm font-semibold">{result.push.title}</div>
                    <div className="text-sm text-crm-ink-2">{result.push.body}</div>
                  </div>
                </div>
              )}
              {result.email && draft.messageClass !== 'transactional' && <p className="text-xs text-crm-ink-3">The unsubscribe line and the one-click unsubscribe headers are added automatically when it sends.</p>}
              {result.email && (
                <Button
                  size="sm"
                  icon={<Send size={13} />}
                  onClick={async () => {
                    const r = await b.sendTest(draft, result.email!);
                    toast(r.status === 'sent' ? `Test sent to ${b.admin.email}.` : (r.reason ?? `Not sent (${r.status}).`), r.status === 'sent' ? 'good' : 'warn');
                  }}
                >
                  Send test to me
                </Button>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Versions" icon={<History size={16} className="text-crm-ink-3" />} />
            <div className="divide-y divide-crm-line">
              {history.map((h) => (
                <div key={`${h.version}-${h.savedAt}`} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div>
                      Version {h.version}: {h.note}
                    </div>
                    <div className="text-xs text-crm-ink-3">
                      {h.savedBy} · {relative(h.savedAt, b.state.now)}
                    </div>
                  </div>
                  {h.version !== saved.version && canEdit && (
                    <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => setDraft({ ...h.snapshot, version: saved.version })}>
                      Restore
                    </Button>
                  )}
                </div>
              ))}
              <div className="px-5 py-2.5 text-sm">
                <div>Version 1: written for you</div>
                <div className="text-xs text-crm-ink-3">from templates/emails/{saved.id}.md</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Sheet
        open={saving}
        onClose={() => setSaving(false)}
        title="Save this version"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaving(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  const next = await b.saveTemplate(draft, note.trim() || 'Edited');
                  setDraft(next);
                  setSaving(false);
                  setNote('');
                  toast(`Saved as version ${next.version}. Automations use it from now on.`);
                } catch (e) {
                  if (e instanceof TemplateValidationError) toast(`Not saved: ${e.problems.join(' ')}`, 'warn');
                  else if (e instanceof PermissionDeniedError || (e instanceof CrmRequestError && e.status === 403)) toast('Only Gus can change what kind of message this is, or what consent it needs.', 'warn');
                  else if (e instanceof CrmRequestError) toast(e.status === 422 ? `Not saved: ${e.message}` : e.message, 'warn');
                  else throw e;
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="What did you change? (for the history)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Shorter subject line" autoFocus />
        </Field>
        <div className="mt-3">
          <Pill tone="info">Emails already sent aren’t affected</Pill>
        </div>
      </Sheet>
    </div>
  );
}
