'use client';

import { createColumns } from '@/components/data-tables/grn/outlet-view/columns';
import { DataTable } from '@/components/ui/data-table';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';

const orderDetails = {
  outletId: '1234567',
  outletName: 'Sk Stores',
  invoiceId: 'INV001',
  orderQuantity: '12',
  package: '02',
  receivedPackage: '02',
  receivedDate: '25 May, 2025',
  grnNo: 'GRN001',
};

const productMock = [
  {
    productName: 'Naga Maida',
    quantity: 50,
    case: '5',
    unit: '10',
    price: 300,
  },
];

const OutletViewPage = () => {
  const breadcrumb = getBreadcrumbData('grnOutletView', 'create');
  
  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader {...breadcrumb} />

      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Order Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-base font-normal mb-1">Outlet ID</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.outletId}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Outlet Name</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.outletName}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Invoice ID</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.invoiceId}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Order Quantity</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.orderQuantity}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Package</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.package}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Received Package</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.receivedPackage}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">Received Date</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.receivedDate}</div>
          </div>
          <div>
            <label className="block text-base font-normal mb-1">GRN NO</label>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{orderDetails.grnNo}</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-4 space-y-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Product Information
        </div>
        <DataTable columns={createColumns()} data={productMock}
            tableId="outlet-view-table"
            />
        <div className="bg-background flex justify-between items-center rounded-lg p-2 text-lg font-medium">
          <span></span>
          <span className="text-base font-semibold">Order Value: 3000</span>
        </div>
      </div>
    </section>
  );
};

export default OutletViewPage;
