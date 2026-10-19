/**
 * The CRM tab: header, the "Pause all sending" bar (on every CRM page), and navigation —
 * tabs along the top on desktop, a bottom bar on the phone.
 */
import { type Capability } from '../core';
import {
  Bot,
  CalendarClock,
  CheckSquare,
  ContactRound,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Pause,
  Settings,
  Users,
  Workflow,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from '../router';
import { Pill, Sheet, Toggle, cx, toast } from '../components/ui';
import { dateTime } from '../data/format';
import { useBackend } from '../data/useBackend';

export interface CrmTab {
  to: string;
  label: string;
  icon: typeof Inbox;
  capability?: Capability;
  mobile?: boolean;
}

export const CRM_TABS: CrmTab[] = [
  { to: '/crm/today', label: 'Today', icon: LayoutDashboard, mobile: true },
  { to: '/crm/contacts', label: 'Contacts', icon: ContactRound, capability: 'contacts.read', mobile: true },
  { to: '/crm/pipelines', label: 'Pipelines', icon: KanbanSquare, capability: 'pipelines.read', mobile: true },
  { to: '/crm/tasks', label: 'Overdue & tasks', icon: CheckSquare, capability: 'tasks.read' },
  { to: '/crm/audience', label: 'Audience', icon: Users, capability: 'audience.read' },
  { to: '/crm/automations', label: 'Automations', icon: Workflow, capability: 'automations.read' },
  { to: '/crm/templates', label: 'Templates', icon: Mail, capability: 'templates.read' },
  { to: '/crm/inbox', label: 'Inbox', icon: Inbox, capability: 'inbox.read', mobile: true },
  { to: '/crm/settings', label: 'Settings', icon: Settings, capability: 'settings.read' },
];

function SendingBar() {
  const b = useBackend();
  const ks = b.state.killSwitches;
  const owner = b.can('killSwitch.write');
  const paused = ks.pauseAllSending;
  return (
    <div className={cx('card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-5', paused && 'border-crm-warn/50 bg-crm-warn/[0.06]')}>
      <div className="flex items-center gap-3">
        <span className={cx('flex size-10 items-center justify-center rounded-xl border', paused ? 'border-crm-warn/40 bg-crm-warn/10 text-crm-warn' : 'border-crm-accent/30 bg-crm-accent/10 text-crm-accent')}>
          {paused ? <Pause size={18} /> : <CalendarClock size={18} />}
        </span>
        <div className="min-w-0">
          <div className="label-caps">Pause all sending</div>
          <div className="text-[15px] font-semibold">{paused ? 'Paused: nothing is being sent' : 'Sending is on'}</div>
        </div>
        <Toggle
          checked={paused}
          disabled={!owner}
          label="Pause all sending"
          onChange={async (v) => {
            await b.setKillSwitches({ pauseAllSending: v });
            toast(v ? 'Paused. Nothing will be sent until you switch it back.' : 'Sending is back on', v ? 'warn' : 'good');
          }}
        />
      </div>
      <div className="hidden h-10 w-px bg-crm-line sm:block" />
      <div className="flex items-center gap-3">
        <Bot size={18} className="text-crm-ink-3" />
        <span className="text-sm text-crm-ink-2">Inbox agent</span>
        {ks.inboxAgentOff ? <Pill tone="warn">Off</Pill> : <Pill tone="good">{Object.values(b.state.inboxSettings.routineModes).includes('auto') ? 'On · some auto-replies' : 'On · drafts only'}</Pill>}
        <Toggle
          size="sm"
          checked={!ks.inboxAgentOff}
          disabled={!owner}
          label="Inbox agent on"
          onChange={async (v) => {
            const r = await b.setKillSwitches({ inboxAgentOff: !v });
            const n = r.caughtUp?.handled ?? 0;
            toast(
              v ? `Inbox agent back on.${n ? ` Sorted ${n} email${n === 1 ? '' : 's'} that arrived while it was off (no automatic replies to those).` : ''}` : 'Inbox agent off. It won’t read, label or draft anything until you switch it back on.',
              v ? 'good' : 'warn',
            );
          }}
        />
      </div>
      <div className="text-xs text-crm-ink-3 sm:ml-auto sm:text-right">
        {!owner && <div className="text-crm-ink-2">Only Gus can change these</div>}
        <div>Updated {dateTime(b.state.now)}</div>
      </div>
    </div>
  );
}

export function CrmHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
        {subtitle && <p className="mt-1 text-[15px] text-crm-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CrmLayout() {
  const b = useBackend();
  const [more, setMore] = useState(false);
  const location = useLocation();
  const tabs = CRM_TABS.filter((t) => !t.capability || b.can(t.capability));
  const mobileTabs = tabs.filter((t) => t.mobile);
  const moreTabs = tabs.filter((t) => !t.mobile);
  const moreActive = moreTabs.some((t) => location.pathname.startsWith(t.to));

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-5 sm:px-8 sm:pt-8 lg:pb-12">
      <SendingBar />

      <nav className="mt-5 hidden md:block" aria-label="CRM sections">
        <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-crm-line pb-px">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cx(
                  'relative inline-flex h-11 shrink-0 items-center gap-2 px-3.5 text-sm font-medium transition-colors',
                  isActive ? 'text-crm-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-crm-accent' : 'text-crm-ink-2 hover:text-crm-ink',
                )
              }
            >
              <t.icon size={16} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>

      {/* Phone bottom bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-crm-line bg-crm-panel/95 backdrop-blur md:hidden" aria-label="CRM sections">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileTabs.length + (moreTabs.length ? 1 : 0)}, minmax(0, 1fr))` }}>
          {mobileTabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2 text-[11px]', isActive ? 'text-crm-accent-ink' : 'text-crm-ink-3')}>
              <t.icon size={21} />
              {t.label}
            </NavLink>
          ))}
          {moreTabs.length > 0 && (
            <button type="button" onClick={() => setMore(true)} className={cx('flex flex-col items-center gap-1 py-2 text-[11px]', moreActive ? 'text-crm-accent-ink' : 'text-crm-ink-3')}>
              <MoreHorizontal size={21} />
              More
            </button>
          )}
        </div>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-2 gap-2">
          {moreTabs.map((t) => (
            <NavLink key={t.to} to={t.to} onClick={() => setMore(false)} className="card flex items-center gap-3 p-4 text-sm font-medium hover:bg-crm-hover">
              <t.icon size={18} className="text-crm-accent" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
