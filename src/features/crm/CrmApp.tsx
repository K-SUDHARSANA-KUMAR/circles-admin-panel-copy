'use client';

/**
 * The CRM tab inside the admin dashboard. Checks the CRM is switched on, loads the snapshot for
 * the signed-in admin, then shows the prototype's screens (routes as in its App.tsx).
 */
import { CheckCircle2, PlugZap, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Card, cx, registerToast, toast, type Tone } from './components/ui';
import { backend, crmGet, CrmRequestError, type CrmIntegrations, type CrmStatus } from './data/backend';
import { useBackend } from './data/useBackend';
import { matchCrmPath, Navigate, OutletContext, useLocation } from './router';
import { AudienceScreen } from './screens/Audience';
import { AutomationDetail } from './screens/AutomationDetail';
import { AutomationsScreen } from './screens/Automations';
import { ContactDetail } from './screens/ContactDetail';
import { ContactsScreen } from './screens/Contacts';
import { InboxScreen } from './screens/Inbox';
import { OrganisationDetail } from './screens/OrganisationDetail';
import { PipelinesScreen } from './screens/Pipelines';
import { SegmentEditor } from './screens/SegmentEditor';
import { SettingsScreen } from './screens/Settings';
import { TasksScreen } from './screens/Tasks';
import { TemplateEditor } from './screens/TemplateEditor';
import { TemplatesScreen } from './screens/Templates';
import { TodayScreen } from './screens/Today';
import { CrmLayout } from './shell/CrmLayout';

function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string; tone: Tone }[]>([]);
  useEffect(() => {
    registerToast((msg, tone = 'good') => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, msg, tone }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
    });
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border px-4 py-3 text-sm shadow-2xl',
            t.tone === 'warn' || t.tone === 'bad' ? 'border-crm-warn/40 bg-[#1c1608] text-crm-warn' : 'border-crm-good/30 bg-[#08180f] text-crm-good',
          )}
        >
          {t.tone === 'warn' || t.tone === 'bad' ? <TriangleAlert size={16} /> : <CheckCircle2 size={16} />}
          <span className="text-crm-ink">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/** The screen for a '/crm/...' path, as in the prototype's route table. */
function screenFor(path: string): ReactNode {
  const [, , section, sub] = path.split('/');
  switch (section) {
    case 'today':
      return <TodayScreen />;
    case 'contacts':
      return sub ? <ContactDetail /> : <ContactsScreen />;
    case 'organisations':
      return sub ? <OrganisationDetail /> : <Navigate to="/crm/contacts" replace />;
    case 'pipelines':
      return <PipelinesScreen />;
    case 'tasks':
      return <TasksScreen />;
    case 'audience':
      return <AudienceScreen />;
    case 'segments':
      return sub ? <SegmentEditor /> : <Navigate to="/crm/audience" replace />;
    case 'automations':
      return sub ? <AutomationDetail /> : <AutomationsScreen />;
    case 'templates':
      return sub ? <TemplateEditor /> : <TemplatesScreen />;
    case 'inbox':
      return <InboxScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <Navigate to="/crm/today" replace />;
  }
}

/** What isn't connected yet, so nobody thinks emails are going out. */
function ConnectionsBanner({ integrations }: { integrations: CrmIntegrations }) {
  const off = [
    !integrations.email && 'Email (Resend): emails fail and show in Settings → Problems',
    !integrations.gmail && 'Gmail: the inbox agent has no mailbox to read',
    !integrations.sms && 'Texts (Twilio): urgent alerts are not texted',
    !integrations.push && 'Push (FCM): pushes are logged, not sent',
    !integrations.claude && 'Claude: inbox sorting is rules only, no drafts',
    !integrations.scheduler && 'Scheduled jobs: the nightly job and automation tick are not running',
  ].filter(Boolean) as string[];
  if (!off.length) return null;
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-8">
      <div className="card flex items-start gap-3 border-crm-info/40 px-4 py-3 text-sm">
        <PlugZap size={18} className="mt-0.5 shrink-0 text-crm-info" />
        <div>
          <div className="font-medium">Not connected yet</div>
          <ul className="mt-1 list-disc pl-4 text-crm-ink-2">
            {off.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-6">
      <Card className="max-w-xl p-6">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-2 text-sm text-crm-ink-2">{body}</p>
      </Card>
    </div>
  );
}

function LoadedCrm() {
  const b = useBackend();
  const { pathname } = useLocation();
  if (pathname === '/crm' || pathname === '/crm/') return <Navigate to="/crm/today" replace />;
  const screen = screenFor(pathname);
  // Remount detail screens when the id in the path changes, as the prototype's router did.
  const key = Object.values(matchCrmPath(pathname)).join('/') || pathname;
  return (
    <>
      <ConnectionsBanner integrations={b.state.integrations} />
      <OutletContext.Provider value={<div key={key}>{screen}</div>}>
        <CrmLayout />
      </OutletContext.Provider>
    </>
  );
}

type Phase = { kind: 'loading' } | { kind: 'off'; reason: string } | { kind: 'error'; title: string; body: string } | { kind: 'ready' };

export function CrmApp() {
  const [phase, setPhase] = useState<Phase>(backend.ready ? { kind: 'ready' } : { kind: 'loading' });

  useEffect(() => {
    if (backend.ready) return;
    let live = true;
    (async () => {
      try {
        const status = await crmGet<CrmStatus>('status');
        if (!status.ready) {
          if (live) setPhase({ kind: 'off', reason: status.reason ?? '' });
          return;
        }
        await backend.init();
        if (live) setPhase({ kind: 'ready' });
      } catch (e) {
        if (!live) return;
        const status = e instanceof CrmRequestError ? e.status : undefined;
        const message = e instanceof Error ? e.message : String(e);
        if (status === 401) setPhase({ kind: 'error', title: 'You need your own admin sign-in', body: `${message}. Sign out and sign in again with your admin account.` });
        else if (status === 403) setPhase({ kind: 'error', title: 'You don’t have CRM access', body: message });
        else if (status === 503) setPhase({ kind: 'off', reason: message });
        else setPhase({ kind: 'error', title: 'Could not load the CRM', body: message });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Actions the screens fire without waiting still tell the admin when the server says no.
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof CrmRequestError) {
        event.preventDefault();
        toast(event.reason.message, 'warn');
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  return (
    <div className="crm-root -m-6 min-h-full bg-crm-canvas text-crm-ink">
      {phase.kind === 'loading' && <div className="p-12 text-center text-sm text-crm-ink-2">Loading the CRM…</div>}
      {phase.kind === 'off' && <Message title="The CRM is switched off" body={phase.reason || 'Your developers switch it on in user-service (CRM_ENABLED).'} />}
      {phase.kind === 'error' && <Message title={phase.title} body={phase.body} />}
      {phase.kind === 'ready' && <LoadedCrm />}
      <Toaster />
    </div>
  );
}
