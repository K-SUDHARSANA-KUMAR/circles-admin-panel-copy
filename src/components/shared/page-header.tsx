'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '../ui/sidebar';
import SpringBoard from '@/components/shared/spring-board';
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
  '/user-management/reviews': {
    title: 'Reviews',
    subtitle: 'Moderate user reviews, ratings, and customer feedback.',
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
  if (routeMap[pathname]) return routeMap[pathname];

  // Dynamic segments fallback
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return { title: 'Admin Console' };

  const lastSegment = segments[segments.length - 1];
  let title = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  if (title.length <= 4 && /\d/.test(title)) {
    title = `Details: ${title}`;
  }
  
  return {
    title: title.replace(/-/g, ' '),
    subtitle: `Circles Admin / ${segments.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')).join(' / ')}`,
  };
};

const segmentLabelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  venues: 'Venues',
  cities: 'Cities',
  interest: 'Interests',
  profile: 'Profile',
  'user-management': 'User Management',
  users: 'Users',
  verification: 'Verification',
  reviews: 'Reviews',
  reports: 'Reports',
  'admin-users': 'Admin Users',
  create: 'Create',
};

const getSegmentLink = (segment: string, fullPath: string) => {
  if (segment === 'dashboard') return '/dashboard/overview';
  return fullPath;
};

const PageHeader = () => {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);
  const headerInfo = getHeaderInfo(pathname);
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const segments = pathname.split('/').filter(Boolean);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (
      segments.length === 3 &&
      segments[0] === 'dashboard' &&
      segments[1] === 'venues' &&
      segments[2] !== 'create'
    ) {
      const venueId = segments[2];
      import('@/services/venue.service').then(({ fetchVenueById }) => {
        fetchVenueById(venueId)
          .then((venue) => {
            if (venue && venue.name) {
              setDynamicTitle(venue.name);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch venue name for header:", err);
          });
      });
    } else {
      setDynamicTitle(null);
    }
  }, [pathname]);

  let displayTitle = headerInfo.title;
  let displaySubtitle = headerInfo.subtitle;

  if (dynamicTitle) {
    displayTitle = dynamicTitle;
  }

  // Globally remove any auto-generated breadcrumbs starting with "Circles Admin"
  if (displaySubtitle && displaySubtitle.startsWith("Circles Admin")) {
    displaySubtitle = undefined;
  }
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#333333] bg-[#171717]/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
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
          {segments.length > 0 && (
            <nav className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-medium font-sans">
              <Link href="/dashboard/overview" className="hover:text-white transition-colors">
                Console
              </Link>
              {segments.map((segment, index) => {
                const fullPath = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;
                
                // Determine label
                let label = segmentLabelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
                if (isLast && dynamicTitle) {
                  label = dynamicTitle;
                } else if (segment.length > 20 && !segmentLabelMap[segment]) {
                  label = 'Details';
                }

                // Custom link for dashboard
                const link = getSegmentLink(segment, fullPath);

                return (
                  <React.Fragment key={fullPath}>
                    <span className="text-[#555555] select-none">&gt;</span>
                    {isLast ? (
                      <span className="text-[#BF6DFF] font-semibold">{label}</span>
                    ) : (
                      <Link href={link} className="hover:text-white transition-colors">
                        {label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Right: Notifications, User profile chip */}
      <div className="flex items-center gap-4">
        {/* Notifications and profile */}
        <div className="flex items-center gap-3">
          <SpringBoard />

          {/* User profile chip */}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 bg-[#222222] border border-[#333333] hover:border-[#BF6DFF]/50 p-1 pr-3 rounded-full transition-all cursor-pointer h-[36px]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#BF6DFF]/20 text-[#BF6DFF] font-semibold text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col text-left justify-center pr-1">
              <span className="text-[11px] font-medium text-white leading-none">
                {user?.name || 'Admin'}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
