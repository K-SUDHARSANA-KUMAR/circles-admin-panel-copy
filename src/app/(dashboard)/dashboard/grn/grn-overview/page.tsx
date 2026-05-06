'use client';

import { createColumns } from '@/components/data-tables/grn/grn-overview/columns';
import { DataTable } from '@/components/ui/data-table';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';



const tableData = [
  {
    date: '25 May, 2025',
    productName: 'Naga Atta',
    noOfTons: 10,
    status: 'Partially',
    returnQuantity: 1,
  },
  {
    date: '25 May, 2025',
    productName: 'Naga Atta',
    noOfTons: 5,
    status: 'Delivered',
    returnQuantity: 0, 
  },
];

export default function GrnOverviewPage() {
  const breadcrumb = getBreadcrumbData('grnOverview', 'create');
  
  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader {...breadcrumb} />



      <div className="rounded-lg bg-white p-4 space-y-4">
        <div className="mb-4 flex gap-4">
          <div className="bg-background flex-1 rounded-lg p-2 text-lg font-medium text-center">
            Total Order: 10
          </div>
          <div className="bg-background flex-1 rounded-lg p-2 text-lg font-medium text-center">
            Returned: 3
          </div>
          <div className="bg-background flex-1 rounded-lg p-2 text-lg font-medium text-center">
            Undelivered: 2
          </div>
          <div className="bg-background flex-1 rounded-lg p-2 text-lg font-medium text-center">
            Delivered: 5
          </div>
        </div>
        <DataTable columns={createColumns()} data={tableData} 
            tableId="grn-overview-table"
         />
        <div className="bg-background flex items-center justify-between rounded-lg p-2 text-lg font-medium">
          <div className="flex-1 flex justify-center">
            <span className="mx-2">Total this</span>
            <span className="border-l border-neutral-300 h-6 mx-2"></span>
            <span className="mx-2">15</span>
          </div>
          <span className="text-base font-semibold">01</span>
        </div>
      </div>
    </section>
  );
}
