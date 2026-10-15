'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SidebarTrigger } from '../ui/sidebar';
import { useAppSelector } from '@/store/hooks';
import Link from 'next/link';

const routeMap: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard/overview': {
    title: 'Dashboard Overview',
    subtitle: 'Real-time operational KPIs, active user distributions, and booking analytics.',
  },
  '/dashboard/venues': {
    title: 'Venues',
    subtitle: 'Manage event spaces, locations, and coordinator assignments.',
  },
  '/dashboard/events': {
    title: 'Events',
    subtitle: 'Admin events pinned to the top of All Moments in the app.',
  },
  '/dashboard/cities': {
    title: 'Cities',
    subtitle: 'Configure and monitor operational city destinations.',
  },
  '/dashboard/interest': {
    title: 'Interests',
    subtitle: 'Check user interests, preferences, and categorical mappings.',
  },
  '/dashboard/profile': {
    title: 'My Profile',
    subtitle: 'Configure your administrator profile and security credentials.',
  },
  '/user-management/users': {
    title: 'Users',
    subtitle: 'View and manage system customers, check operational statuses, and view reliability metrics.',
  },
  '/user-management/verification': {
    title: 'Verification Users',
    subtitle: 'Verify customer documents, identities, and background checks.',
  },
  '/reports': {
    title: 'Reports & Analytics',
    subtitle: 'Generate spreadsheets, export booking CSVs, and examine platform statistics.',
  },
  '/admin-users': {
    title: 'Admin Users',
    subtitle: 'Manage administrative roles, access controls, and panel permissions.',
  },
};

const getHeaderInfo = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  
  // Custom title override
  let title = '';
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  
  if (normalizedPath === '/dashboard/overview') {
    title = 'Overview';
  } else if (routeMap[normalizedPath]) {
    title = routeMap[normalizedPath].title;
  } else if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    title = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
    if (title.length <= 4 && /\d/.test(title)) {
      title = `Details: ${title}`;
    }
  } else {
    title = 'Admin Console';
  }

  // Format breadcrumbs dynamically: Circles Admin > Dashboard > Overview
  const formattedSegments = segments.map(segment => {
    if (segment.toLowerCase() === 'user-management') return 'User Management';
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });

  const subtitle = ['The Circles Club Admin', ...formattedSegments].join(' > ');
  
  return { title, subtitle };
};

const segmentLabelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  venues: 'Venues',
  events: 'Events',
  cities: 'Cities',
  interest: 'Interests',
  profile: 'Profile',
  'user-management': 'User Management',
  users: 'Users',
  verification: 'Verification',
  reports: 'Reports',
  'admin-users': 'Admin Users',
  create: 'Create',
};

const PageHeader = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const headerInfo = getHeaderInfo(pathname);
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const segments = pathname.split('/').filter(Boolean);
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const detailId = searchParams.get('id');
  // A specific record (venue, waitlist applicant) is opened via ?id= on its list route
  // rather than its own path segment, so detect it off the query param.
  const isVenueDetail = normalizedPath === '/dashboard/venues' && !!detailId;
  const isWaitlistDetail = normalizedPath === '/user-management/waitlist' && !!detailId;
  const hasDetailChild = isVenueDetail || isWaitlistDetail;

  useEffect(() => {
    if (isVenueDetail) {
      import('@/services/venue.service').then(({ fetchVenueById }) => {
        fetchVenueById(detailId!)
          .then((venue) => {
            if (venue && venue.name) {
              setDynamicTitle(venue.name);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch venue name for header:", err);
          });
      });
    } else if (isWaitlistDetail) {
      import('@/services/user.service').then(({ fetchCustomerById }) => {
        fetchCustomerById(detailId!)
          .then((customer) => {
            const name = [customer?.name, customer?.lastName].filter(Boolean).join(' ').trim();
            setDynamicTitle(name || 'Unnamed User');
          })
          .catch((err) => {
            console.error("Failed to fetch user name for header:", err);
          });
      });
    } else {
      setDynamicTitle(null);
    }
  }, [isVenueDetail, isWaitlistDetail, detailId]);

  // Heading stays static (e.g. "Venues"); the record's name only appears as a breadcrumb child.
  const displayTitle = headerInfo.title;
  let displaySubtitle = headerInfo.subtitle;

  // Globally remove any auto-generated breadcrumbs starting with "The Circles Club Admin" or "Circles Admin"
  if (displaySubtitle && (displaySubtitle.startsWith("Circles Admin") || displaySubtitle.startsWith("The Circles Club Admin"))) {
    displaySubtitle = undefined;
  }
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between h-20">
      {/* Left: title & subtitle */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-none">
            {displayTitle}
          </h1>
          {displaySubtitle && (
            <p className="text-xs text-[#9CA3AF] mt-1 font-normal leading-none font-sans">
              {displaySubtitle}
            </p>
          )}
          {segments.length > 0 && (() => {
            // "dashboard" is a real parent only for "Overview" (Dashboard > Overview).
            // For sibling top-level sections routed under /dashboard/* (venues, cities, ...),
            // it's not a true parent, so drop it from the breadcrumb chain.
            const crumbIndexes = segments
              .map((_, index) => index)
              .filter((index) => !(segments[index] === 'dashboard' && segments[1] !== 'overview'));

            type Crumb = { key: string; label: string };
            const crumbs: Crumb[] = crumbIndexes.map((index) => {
              const segment = segments[index];
              const fullPath = '/' + segments.slice(0, index + 1).join('/');
              let label = segmentLabelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
              if (segment.length > 20 && !segmentLabelMap[segment]) {
                label = 'Details';
              }
              return { key: fullPath, label };
            });

            // Append the clicked record as its own child crumb, e.g. Venues > SB Pub
            // or User Management > Waitlist > Jane Doe.
            if (hasDetailChild && dynamicTitle) {
              crumbs.push({ key: `${normalizedPath}?id=${detailId}`, label: dynamicTitle });
            }

            // A single crumb just repeats the page heading with no real hierarchy to show.
            if (crumbs.length < 2) return null;

            return (
              <nav className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-medium font-sans">
                {crumbs.map((crumb, i) => {
                  const isLast = i === crumbs.length - 1;

                  return (
                    <React.Fragment key={crumb.key}>
                      {i > 0 && <span className="text-[#555555] select-none">&gt;</span>}
                      {isLast ? (
                        <span className="text-[#BF6DFF] font-semibold">{crumb.label}</span>
                      ) : (
                        <span>{crumb.label}</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            );
          })()}
        </div>
      </div>

      {/* Right: User profile chip */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 bg-transparent hover:opacity-85 transition-opacity cursor-pointer py-1"
        >
          <div className="flex flex-col text-right justify-center">
            <span className="text-xs font-semibold text-white leading-none">
              {user?.name || 'Irfans'}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium leading-none mt-1">
              {user?.roleName || 'Super Admin'}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0 border border-primary/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'I'}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default PageHeader;
