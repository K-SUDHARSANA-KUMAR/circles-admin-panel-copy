// components/breadcrumb/breadcrumb-header.tsx
'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ArrowLeftIcon, Home } from 'lucide-react';
import Link from 'next/link';

type BreadcrumbHeaderProps = {
  homeHref: string;
  homeLabel: string;
  backHref: string;
  pageTitle: string;
  subtitle: string;
  currentPage: string;
  actions?: React.ReactNode;
};

const BreadcrumbHeader = ({
  homeHref,
  homeLabel,
  backHref,
  pageTitle,
  subtitle,
  currentPage,
  actions,
}: BreadcrumbHeaderProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card p-4 w-full max-w-full overflow-x-hidden">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href={homeHref}
              className="flex items-center gap-1"
            >
              <Home className="h-3 w-3" /> {homeLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentPage}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default BreadcrumbHeader;
