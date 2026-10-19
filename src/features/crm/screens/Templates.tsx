import { PermissionDeniedError, PURPOSE_LABELS, TemplateValidationError, type MessageClass } from '../core';
import { Mail, Plus, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from '../router';
import { Button, Field, Pill, Select, Sheet, toast } from '../components/ui';
import { CrmHeader } from '../shell/CrmLayout';
import { relative } from '../data/format';
import { useBackend } from '../data/useBackend';

const CLASS_SECTIONS: { cls: MessageClass; title: string; hint: string }[] = [
  { cls: 'marketing', title: 'Marketing', hint: 'Only sent to people who’ve agreed (or have a soft opt-in). Every one has a one-click unsubscribe.' },
  { cls: 'transactional', title: 'Service messages', hint: 'Account, application, payment and booking messages. No marketing allowed in them.' },
  { cls: 'business', title: 'Business outreach', hint: 'Partners, press and investors at company addresses. An opt-out line is added to every one.' },
];

export function TemplatesScreen() {
  const b = useBackend();
  const templates = b.state.templates.filter((t) => t.id !== 'investor-update' || b.can('pipelines.investors'));
  return (
    <div className="space-y-6">
      <CrmHeader
        title="Templates"
        subtitle="Every email and notification the CRM can send. Edit the wording any time, no code."
        actions={b.can('templates.write') && <NewTemplateButton />}
      />
      {CLASS_SECTIONS.map((sec) => {
        const items = templates.filter((t) => t.messageClass === sec.cls);
        if (!items.length) return null;
        return (
          <section key={sec.cls}>
            <h3 className="label-caps">{sec.title}</h3>
            <p className="mb-3 mt-1 text-[13px] text-crm-ink-3">{sec.hint}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {items.map((t) => {
                const usedBy = b.state.automations.filter((a) => a.steps.some((s) => s.kind === 'action' && s.action.templateId === t.id));
                return (
                  <Link key={t.id} to={`/crm/templates/${t.id}`} className="card flex flex-col p-4 hover:border-crm-line-strong hover:bg-[#0e0e11]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-crm-ink-3">{t.channel === 'push' ? <Smartphone size={17} /> : <Mail size={17} />}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{t.name}</div>
                        <div className="mt-0.5 truncate text-[13px] text-crm-ink-2">{t.channel === 'push' ? t.pushTitle : t.subject}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.channel === 'email' && <Pill>{t.layout === 'plain' ? 'Plain, from you' : 'Branded'}</Pill>}
                      {t.purpose && <Pill tone="accent">{PURPOSE_LABELS[t.purpose]}</Pill>}
                      {usedBy.slice(0, 2).map((a) => (
                        <Pill key={a.id} tone="info">
                          {a.name}
                        </Pill>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-crm-ink-3">
                      Version {t.version} · edited {relative(t.updatedAt, b.state.now)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NewTemplateButton() {
  const b = useBackend();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'email' | 'push'>('email');
  const [cls, setCls] = useState<MessageClass>('marketing');
  const owner = b.admin.role === 'owner';
  return (
    <>
      <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
        New template
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New template"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  const id = await b.createTemplate(name.trim(), channel, cls);
                  setOpen(false);
                  setName('');
                  toast('Created. Write the wording, then save.');
                  navigate(`/crm/templates/${id}`);
                } catch (e) {
                  if (e instanceof TemplateValidationError) toast(e.problems.join(' '), 'warn');
                  else if (e instanceof PermissionDeniedError) toast('Only Gus can create service messages.', 'warn');
                  else throw e;
                }
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name (only you see this)">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer party invite" autoFocus />
          </Field>
          <Field label="Email or push notification?">
            <Select<'email' | 'push'>
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'push', label: 'Push notification' },
              ]}
            />
          </Field>
          <Field label="Kind of message">
            <Select<MessageClass>
              value={cls}
              onChange={setCls}
              options={[
                { value: 'marketing', label: 'Marketing (needs consent)' },
                { value: 'business', label: 'Business outreach (partners, press, investors)' },
                ...(owner ? [{ value: 'transactional' as const, label: 'Service message (account, payment, booking)' }] : []),
              ]}
            />
          </Field>
          <p className="text-[13px] text-crm-ink-3">It starts as a short note from you in the plain layout. You can change the layout, wording and variables next.</p>
        </div>
      </Sheet>
    </>
  );
}
