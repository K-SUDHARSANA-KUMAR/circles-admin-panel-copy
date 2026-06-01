'use client';

import React from 'react';
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

  const subtitle = ['Circles Admin', ...formattedSegments].join(' > ');
  
  return { title, subtitle };
};

const PageHeader = () => {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);
  const headerInfo = getHeaderInfo(pathname);
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between h-20">
      {/* Left: title & subtitle */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex flex-col">
          <h1 className="font-serif text-[32px] font-normal tracking-wide text-white m-0 leading-none">
            {headerInfo.title}
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-2 font-normal leading-none">
            {headerInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Notifications, User profile chip */}
      <div className="flex items-center gap-4">
        {/* Notifications and profile */}
        <div className="flex items-center gap-3">
          <SpringBoard />

          {/* Vertical Separator */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* User profile chip */}
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
      </div>
    </header>
  );
};

export default PageHeader;
