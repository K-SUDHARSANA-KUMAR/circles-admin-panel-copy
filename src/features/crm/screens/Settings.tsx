import { GRANT_LABELS, GRANTS, type AiSettings, type Grant, type SendingSettings } from '../core';
import { Bot, FileClock, Gauge, KeyRound, Plug, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from '../router';
import { Button, Card, CardHeader, Field, Pill, Select, Tabs, Toggle, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { dateTime, relative } from '../data/format';
import { CONSENT_FILES } from '../data/consentWording';
import { useBackend } from '../data/useBackend';

type Section = 'sending' | 'consent' | 'team' | 'ai' | 'integrations' | 'problems' | 'audit' | 'data';

const consentFiles = CONSENT_FILES;

export function SettingsScreen() {
  const { section = 'sending' } = useParams();
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <CrmHeader title="Settings" subtitle="Everything is in plain English and every change is recorded: who, what and when." />
      <Tabs<Section>
        value={section as Section}
        onChange={(s) => navigate(`/crm/settings/${s}`)}
        items={[
          { value: 'sending', label: 'Sending rules' },
          { value: 'consent', label: 'Consent wording' },
          { value: 'team', label: 'Team access' },
          { value: 'ai', label: 'AI' },
          { value: 'integrations', label: 'Connections' },
          { value: 'problems', label: 'Problems' },
          { value: 'audit', label: 'Audit log' },
          { value: 'data', label: 'Data requests' },
        ]}
      />
      {section === 'sending' && <SendingSection />}
      {section === 'consent' && <ConsentSection />}
      {section === 'team' && <TeamSection />}
      {section === 'ai' && <AiSection />}
      {section === 'integrations' && <IntegrationsSection />}
      {section === 'problems' && <ProblemsSection />}
      {section === 'audit' && <AuditSection />}
      {section === 'data' && <DataSection />}
    </div>
  );
}

function SendingSection() {
  const b = useBackend();
  const [s, setS] = useState<SendingSettings>(b.state.sending);
  const dirty = JSON.stringify(s) !== JSON.stringify(b.state.sending);
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title="How often" icon={<Gauge size={16} className="text-crm-accent" />} hint="Marketing only. Service messages like payment problems don’t count." />
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            No more than
            <input type="number" className="input w-20" value={s.frequencyCap.email.max} onChange={(e) => setS({ ...s, frequencyCap: { ...s.frequencyCap, email: { ...s.frequencyCap.email, max: num(e.target.value) } } })} aria-label="Emails" />
            marketing emails per person every
            <input type="number" className="input w-20" value={s.frequencyCap.email.windowDays} onChange={(e) => setS({ ...s, frequencyCap: { ...s.frequencyCap, email: { ...s.frequencyCap.email, windowDays: num(e.target.value) } } })} aria-label="Days" />
            days
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            No more than
            <input type="number" className="input w-20" value={s.frequencyCap.push.max} onChange={(e) => setS({ ...s, frequencyCap: { ...s.frequencyCap, push: { ...s.frequencyCap.push, max: num(e.target.value) } } })} aria-label="Pushes" />
            marketing notifications every
            <input type="number" className="input w-20" value={s.frequencyCap.push.windowDays} onChange={(e) => setS({ ...s, frequencyCap: { ...s.frequencyCap, push: { ...s.frequencyCap.push, windowDays: num(e.target.value) } } })} aria-label="Days" />
            days
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            If someone’s hit the limit, wait up to
            <input type="number" className="input w-20" value={s.frequencyCap.maxDeferDays} onChange={(e) => setS({ ...s, frequencyCap: { ...s.frequencyCap, maxDeferDays: num(e.target.value) } })} aria-label="Days to wait" />
            days for a free slot, then skip it.
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Quiet hours" hint="In each person’s own time zone" />
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Nothing sends between
            <input type="time" className="input w-32" value={s.quietHours.start} onChange={(e) => setS({ ...s, quietHours: { ...s.quietHours, start: e.target.value } })} aria-label="From" />
            and
            <input type="time" className="input w-32" value={s.quietHours.end} onChange={(e) => setS({ ...s, quietHours: { ...s.quietHours, end: e.target.value } })} aria-label="Until" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Spread held messages over
            <input type="number" className="input w-20" value={s.quietHours.spreadMinutes} onChange={(e) => setS({ ...s, quietHours: { ...s.quietHours, spreadMinutes: num(e.target.value) } })} aria-label="Minutes" />
            minutes afterwards
          </div>
          <Field label="If we don’t know someone’s time zone, use">
            <Select value={s.defaultTimezone} onChange={(v) => setS({ ...s, defaultTimezone: v })} options={['Europe/London', 'Europe/Dublin', 'Europe/Paris', 'America/New_York'].map((z) => ({ value: z, label: z.replace('_', ' ') }))} />
          </Field>
          <p className="text-xs text-crm-ink-3">The only exception: a service email replying to something the person did in the last {s.quietHours.contactActionGraceMinutes} minutes, like “application received”.</p>
        </div>
      </Card>
      <div className="xl:col-span-2">
        <Button
          variant="primary"
          disabled={!dirty || !b.can('settings.write')}
          onClick={async () => {
            try {
              await b.updateSending(s);
              toast('Sending rules saved');
            } catch (e) {
              toast(e instanceof Error ? e.message.replace('Settings rejected: ', '') : 'Couldn’t save', 'warn');
            }
          }}
        >
          Save sending rules
        </Button>
      </div>
    </div>
  );
}

function ConsentSection() {
  const files = Object.entries(consentFiles)
    .filter(([p]) => !p.endsWith('README.md'))
    .map(([p, text]) => {
      const fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
      const get = (k: string) => new RegExp(`^${k}: (.*)$`, 'm').exec(fm)?.[1] ?? '';
      const quote = text
        .split('\n')
        .filter((l) => l.startsWith('>'))
        .map((l) => l.replace(/^>\s?/, ''))
        .join('\n')
        .trim();
      return { id: get('id') || p, shown: get('shown'), basis: get('basis'), quote };
    });
  return (
    <div className="space-y-3">
      <p className="text-sm text-crm-ink-2">The exact wording people see where we ask about emails. Each version is stored next to their choice, as evidence. To change wording, make a new version; never edit a live one.</p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {files.map((f) => (
          <Card key={f.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{f.id}</span>
              <Pill tone={f.basis.startsWith('soft') ? 'info' : 'good'}>{f.basis.startsWith('soft') ? 'Soft opt-in' : 'Consent'}</Pill>
            </div>
            <div className="mt-1 text-xs text-crm-ink-3">{f.shown}</div>
            {f.quote && <blockquote className="mt-3 whitespace-pre-line border-l-2 border-crm-accent/50 pl-3 text-sm text-crm-ink-2">{f.quote}</blockquote>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function TeamSection() {
  const b = useBackend();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Who can see what" icon={<Users size={16} className="text-crm-accent" />} hint="Only people you add here can open the CRM. Team members start with contacts, pipelines, tasks and templates. Switch on more per person." />
        <div className="divide-y divide-crm-line">
          {b.state.world.admins.map((a) => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-crm-ink-3">
                    {a.email}
                    {a.role === 'team' && !a.linked && ' · hasn’t opened the CRM yet'}
                  </div>
                </div>
                <Pill tone={a.role === 'owner' ? 'accent' : 'neutral'}>{a.role === 'owner' ? 'Owner: everything' : 'Team'}</Pill>
                {a.role === 'team' && b.can('team.manage') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await b.removeFromTeam(a.id);
                      toast(`${a.name.split(' ')[0]} can no longer open the CRM`);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {a.role === 'team' && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {GRANTS.map((g) => (
                    <label key={g} className="flex items-center justify-between gap-3 rounded-xl border border-crm-line px-3 py-2 text-sm">
                      <span>{GRANT_LABELS[g]}</span>
                      <Toggle
                        size="sm"
                        checked={a.grants.includes(g)}
                        disabled={!b.can('team.manage')}
                        label={GRANT_LABELS[g]}
                        onChange={async (v) => {
                          const grants: Grant[] = v ? [...a.grants, g] : a.grants.filter((x) => x !== g);
                          await b.setGrants(a.id, grants);
                          toast(`${a.name.split(' ')[0]}: ${v ? 'can now' : 'can no longer'} ${GRANT_LABELS[g].toLowerCase()}`);
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      {b.can('team.manage') && b.state.world.adminCandidates.length > 0 && (
        <Card>
          <CardHeader title="Other admins" icon={<Users size={16} className="text-crm-ink-3" />} hint="They can use the rest of the dashboard but can’t open the CRM until you add them." />
          <div className="divide-y divide-crm-line">
            {b.state.world.adminCandidates.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-crm-ink-3">{a.email}</div>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await b.addToTeam(a.id);
                    toast(`${a.name.split(' ')[0]} can now open the CRM (Team)`);
                  }}
                >
                  Add to the CRM
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-5 text-sm text-crm-ink-2">
        <div className="mb-1 flex items-center gap-2 font-medium text-crm-ink">
          <KeyRound size={15} /> Always yours, whatever you switch on
        </div>
        The investor pipeline and investor contacts, Pause all sending and the inbox agent switch, settings, the audit log, and exporting or erasing someone’s data.
      </Card>
    </div>
  );
}

const PROMPT_LABELS: Record<keyof AiSettings['prompts'], { title: string; hint: string }> = {
  classify: { title: 'Sorting emails', hint: 'How to tell urgent from routine. Runs on the fast model.' },
  draft: { title: 'Drafting replies', hint: 'What a draft may and mustn’t say. Your voice is below.' },
  brief: { title: 'Monday brief', hint: 'How to write up the facts the CRM works out.' },
  rule: { title: 'Understanding your rules', hint: 'Turns a plain-English rule into a precise one for you to confirm.' },
};

function AiSection() {
  const b = useBackend();
  const saved = b.state.aiSettings;
  const [draft, setDraft] = useState<AiSettings>(saved);
  const owner = b.can('settings.write');
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => {
    try {
      await b.saveAiSettings(draft);
      toast('Saved. The change is in the audit log.');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'warn');
    }
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Models" icon={<Bot size={16} className="text-crm-accent" />} hint="Anthropic Claude API" />
          <fieldset disabled={!owner} className="grid gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Use AI</div>
                <div className="text-xs text-crm-ink-3">Off: emails are sorted by your rules only (the rest are “Needs me”), no drafts are written, and the Monday brief is a plain list.</div>
              </div>
              <Toggle checked={draft.enabled} label="Use AI" onChange={(v) => setDraft({ ...draft, enabled: v })} />
            </div>
            <Field label="Sorting emails (fast)" hint="Around £6 a month at today’s volume">
              <Select value={draft.classifyModel} onChange={(v) => setDraft({ ...draft, classifyModel: v })} options={[{ value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (recommended)' }]} />
            </Field>
            <Field label="Drafts and the Monday brief (stronger)" hint="Opus: about £24 a month. Sonnet: about half that, drafts a little less like you.">
              <Select
                value={draft.draftModel}
                onChange={(v) => setDraft({ ...draft, draftModel: v })}
                options={[
                  { value: 'claude-opus-5-5', label: 'Claude Opus 5.5 (recommended)' },
                  { value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (cheaper)' },
                ]}
              />
            </Field>
          </fieldset>
        </Card>
        <Card>
          <CardHeader title="Your voice" hint="How drafts should sound" />
          <fieldset disabled={!owner} className="p-5">
            <textarea className="input min-h-[150px] py-2.5 leading-relaxed" value={draft.voice} onChange={(e) => setDraft({ ...draft, voice: e.target.value })} aria-label="Your voice" />
            <p className="mt-3 text-xs text-crm-ink-3">
              Every email reaches the AI marked as untrusted content to assess, never as instructions. Whatever it says, the code decides what can happen: it can only label, draft to the sender, add tasks and tell you. That part isn’t editable.
            </p>
          </fieldset>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="AI instructions"
          hint={`Version ${saved.promptVersion}. Every AI decision records which version it used.`}
          right={
            owner && (
              <div className="flex gap-2">
                {dirty && (
                  <Button size="sm" variant="ghost" onClick={() => setDraft(saved)}>
                    Discard
                  </Button>
                )}
                <Button size="sm" variant="primary" disabled={!dirty} onClick={save}>
                  Save
                </Button>
              </div>
            )
          }
        />
        <fieldset disabled={!owner} className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-2">
          {(Object.keys(PROMPT_LABELS) as (keyof AiSettings['prompts'])[]).map((k) => (
            <Field key={k} label={PROMPT_LABELS[k].title} hint={PROMPT_LABELS[k].hint}>
              <textarea className="input min-h-[220px] py-2.5 font-mono text-[12px] leading-relaxed" value={draft.prompts[k]} onChange={(e) => setDraft({ ...draft, prompts: { ...draft.prompts, [k]: e.target.value } })} />
            </Field>
          ))}
        </fieldset>
      </Card>
    </div>
  );
}

const AREA_LABELS = { sending: 'Sending', automations: 'Automations', inbox: 'Inbox agent', alerts: 'Texts to you', events: 'Events from the app', members: 'Members & events' } as const;

/** Things that went wrong, in plain English. Nothing personal is ever shown here. */
function ProblemsSection() {
  const b = useBackend();
  const open = b.state.problems.filter((p) => !p.resolvedAt);
  const done = b.state.problems.filter((p) => p.resolvedAt).slice(0, 10);
  const owner = b.can('settings.write');
  return (
    <Card className="max-w-3xl">
      <CardHeader title="Problems" hint="Anything that failed and needs a look: a message the provider refused, an automation that kept erroring, a text that didn’t go. Your developers get the same list." icon={<FileClock size={16} className="text-crm-warn" />} />
      <div className="divide-y divide-crm-line">
        {open.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-5 py-3">
            <Pill tone="warn">{AREA_LABELS[p.area]}</Pill>
            <div className="min-w-0 flex-1 text-sm">
              <div>{p.message}</div>
              <div className="text-xs text-crm-ink-3">{relative(p.at, b.state.now)}</div>
            </div>
            {owner && (
              <Button size="sm" variant="ghost" onClick={() => b.resolveProblem(p.id)}>
                Dealt with
              </Button>
            )}
          </div>
        ))}
        {open.length === 0 && <div className="px-5 py-6 text-sm text-crm-ink-3">No problems. Everything that should have gone out has gone out.</div>}
        {done.map((p) => (
          <div key={p.id} className="px-5 py-2.5 text-sm text-crm-ink-3 line-through">
            {p.message}
          </div>
        ))}
      </div>
    </Card>
  );
}

function IntegrationsSection() {
  const b = useBackend();
  const i = b.state.integrations;
  const rows: [string, string, boolean, string][] = [
    ['Database', 'Where the CRM lives (user-service, Postgres)', true, 'Connected'],
    ['Resend', 'Sending email from mail. and notify.thecirclesclub.com', i.email, 'Not connected: emails fail and show in Problems'],
    ['Firebase Cloud Messaging', 'Push notifications', i.push, 'Off: pushes are logged, not sent'],
    ['Gmail', 'Your inbox, for the inbox agent', i.gmail, 'Not connected'],
    ['Twilio', 'Urgent texts to your phone', i.sms, 'Not connected'],
    ['Claude API', 'Sorting, drafts, briefs', i.claude, 'Off: rules only, no drafts'],
    ['Scheduled jobs', 'Nightly job and the automation tick', i.scheduler, 'Off'],
    ['RevenueCat, Luma, Framer', 'Subscriptions, events, website sign-ups', false, 'Not connected yet'],
  ];
  return (
    <Card>
      <CardHeader title="Connections" icon={<Plug size={16} className="text-crm-accent" />} hint="Your developers switch each one on in user-service once its account is set up." />
      <div className="divide-y divide-crm-line">
        {rows.map(([name, what, on, offLabel]) => (
          <div key={name} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs text-crm-ink-3">{what}</div>
            </div>
            <Pill tone={on ? 'good' : 'warn'}>{on ? 'Connected' : offLabel}</Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditSection() {
  const b = useBackend();
  const entries = b.state.audit;
  const who = (actor: string) => b.state.world.admins.find((a) => `admin:${a.id}` === actor)?.name ?? actor;
  return (
    <Card>
      <CardHeader title="Audit log" icon={<ScrollText size={16} className="text-crm-accent" />} hint="Every settings change: who, what and when. It can’t be edited or deleted." />
      <div className="divide-y divide-crm-line">
        {entries.length === 0 && <div className="px-5 py-6 text-sm text-crm-ink-3">Nothing yet. Change a setting, flip a switch or edit a template and it appears here.</div>}
        {entries.map((e) => (
          <div key={e.id} className="px-5 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{who(e.actor)}</span>
              <span className="text-crm-ink-2">{e.action.replace(/\./g, ' › ')}</span>
              <span className="ml-auto text-xs text-crm-ink-3" title={dateTime(e.at)}>
                {relative(e.at, b.state.now)}
              </span>
            </div>
            {e.changedPaths && e.changedPaths.length > 0 && <div className="mt-0.5 text-xs text-crm-ink-3">Changed: {e.changedPaths.join(', ')}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DataSection() {
  const b = useBackend();
  const requests = b.state.audit.filter((e) => e.action === 'data.export' || e.action === 'data.erase');
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5 text-sm text-crm-ink-2">
        <div className="mb-2 flex items-center gap-2 font-medium text-crm-ink">
          <ShieldCheck size={16} className="text-crm-good" /> When someone asks for their data, or to be forgotten
        </div>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Open their contact page.</li>
          <li>Scroll to Details and press “Export their data”. You get one file with everything the CRM holds on them.</li>
          <li>Or press “Erase” to delete it all. A one-way hash of their email and phone stays on the suppression list so they’re never re-added to marketing.</li>
          <li>Their app account and your Gmail are separate. Delete those too if they asked.</li>
        </ol>
      </Card>
      <Card>
        <CardHeader title="Requests handled" icon={<FileClock size={16} className="text-crm-ink-3" />} />
        <div className="divide-y divide-crm-line">
          {requests.length === 0 && <div className="px-5 py-6 text-sm text-crm-ink-3">None yet.</div>}
          {requests.map((e) => (
            <div key={e.id} className="px-5 py-3 text-sm">
              {e.action === 'data.export' ? 'Export' : 'Erasure'} · <span className="text-crm-ink-3">{relative(e.at, b.state.now)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
