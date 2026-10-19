'use client';

/**
 * The few react-router names the CRM screens use (they were written for the prototype's
 * HashRouter), implemented without react-router so the screens didn't need rewriting.
 *
 * The panel is a static export (next.config.ts `output: 'export'`), so there's one page,
 * /dashboard/crm/, and the CRM's own path lives in the hash: /dashboard/crm/#/crm/contacts/c_1.
 * Refreshing or sharing any CRM link works without a server route.
 */
import { createContext, useContext, useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
};
const readHash = () => window.location.hash.replace(/^#/, '') || '/crm';

/** '/crm/contacts?view=orgs' -> { pathname: '/crm/contacts', search: '?view=orgs' }. */
function split(path: string) {
  const i = path.indexOf('?');
  return i === -1 ? { pathname: path, search: '' } : { pathname: path.slice(0, i), search: path.slice(i) };
}

export function useLocation() {
  const { pathname, search } = split(useSyncExternalStore(subscribe, readHash, () => '/crm'));
  return { pathname, search, hash: '' };
}

/** The prototype's route table (App.tsx), for useParams. */
const ROUTES: string[] = [
  '/crm/contacts/:id',
  '/crm/organisations/:id',
  '/crm/pipelines/:pipelineId',
  '/crm/audience/:tab',
  '/crm/segments/:id',
  '/crm/automations/:id',
  '/crm/templates/:id',
  '/crm/inbox/:tab',
  '/crm/settings/:section',
];

export function matchCrmPath(path: string): Record<string, string> {
  const parts = path.split('/').filter(Boolean);
  for (const pattern of ROUTES) {
    const p = pattern.split('/').filter(Boolean);
    if (p.length !== parts.length) continue;
    const params: Record<string, string> = {};
    if (p.every((seg, i) => (seg.startsWith(':') ? ((params[seg.slice(1)] = decodeURIComponent(parts[i]!)), true) : seg === parts[i]))) return params;
  }
  return {};
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return matchCrmPath(useLocation().pathname) as T;
}

function go(to: string, replace = false) {
  const url = `${window.location.pathname}${window.location.search}#${to}`;
  if (replace) {
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
  window.scrollTo(0, 0);
}

export function useNavigate() {
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') window.history.go(to);
    else go(to, options?.replace);
  };
}

type ParamsInit = Record<string, string> | URLSearchParams;

export function useSearchParams(): [URLSearchParams, (next: ParamsInit) => void] {
  const { pathname, search } = useLocation();
  const set = (next: ParamsInit) => {
    const qs = new URLSearchParams(next as Record<string, string>).toString();
    // Opening or closing a sheet shouldn't add a history step or jump the page.
    const url = `${window.location.pathname}${window.location.search}#${pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  return [new URLSearchParams(search), set];
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; children?: ReactNode };

export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={`#${to}`}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey) window.scrollTo(0, 0);
      }}
      {...rest}
    />
  );
}

type NavLinkProps = Omit<LinkProps, 'className'> & { className?: string | ((s: { isActive: boolean }) => string) };

export function NavLink({ to, className, ...rest }: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(`${to}/`);
  return <Link to={to} className={typeof className === 'function' ? className({ isActive }) : className} {...rest} />;
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  useEffect(() => {
    go(to, replace);
  }, [to, replace]);
  return null;
}

/** CrmLayout renders the current screen through <Outlet />; CrmApp provides it. */
export const OutletContext = createContext<ReactNode>(null);

export function Outlet() {
  return <>{useContext(OutletContext)}</>;
}
