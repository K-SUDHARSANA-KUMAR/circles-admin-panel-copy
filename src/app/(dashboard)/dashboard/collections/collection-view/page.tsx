'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import NavKeys from '@/constants/navkeys';
import { ArrowLeftIcon, Home } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CollectionView } from '@/components/data-display/collections/collection-view';

const CollectionViewPage = () => {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const invoiceId = searchParams.get('invoiceId');

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={NavKeys.Collections}
                className="flex items-center gap-1"
              >
                <Home className="h-3 w-3" /> Collections
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Collection View</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
       
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={NavKeys.Collections}
              className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">Collection View</h1>
            </div>
          </div>
        </div>
      </div>

      <CollectionView />
    </section>
  );
};

export default CollectionViewPage;
