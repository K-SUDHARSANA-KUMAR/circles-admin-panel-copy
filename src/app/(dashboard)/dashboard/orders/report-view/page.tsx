'use client';

import { createColumns } from '@/components/data-tables/orders/report-view/columns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Textarea } from '@/components/ui/textarea';
import NavKeys from '@/constants/navkeys';
import { ArrowLeftIcon, Home } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const reportViewMock = [
  {
    productName: 'Naga Rawa',
    quantity: 10,
    unit: 'kg',
    returnValue: 500,
    expiryDate: '2024-07-01',
    reason: 'Damaged packaging',
    onViewLogs: () => alert('Logs clicked'),
  },
  {
    productName: 'Naga Atta',
    quantity: 5,
    unit: 'kg',
    returnValue: 250,
    expiryDate: '2024-08-15',
    reason: 'Expired',
    onViewLogs: () => alert('Logs clicked'),
  },
];

const ReportViewPage = () => {
  const [remarks, setRemarks] = useState('');

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={NavKeys.DashboardOrders}
                className="flex items-center gap-1"
              >
                <Home className="h-3 w-3" /> Orders
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Report View</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={NavKeys.DashboardOrders}
              className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">Report View</h1>
              <p className="text-sm text-neutral-500">
                View report details here
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Report Information
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-base font-normal mb-1">Outlet Name</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>Sk Stores</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Sales Person Name</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>Stand Alone</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Warehouse</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>Trichy</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Return Applied On</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>25 May, 2025</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-4 space-y-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Product Information
        </div>
        <DataTable columns={createColumns()} data={reportViewMock} tableId="report-view-table" />
      </div>

      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-base font-normal mb-1">Remarks</label>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Enter remarks"
              rows={4}
              className="bg-card"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="destructive" asChild>
          <Link href={NavKeys.DashboardOrders}>Reject</Link>
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => {}}
        >
          Approve
        </Button>
      </div>
    </section>
  );
};

export default ReportViewPage;
