'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { createColumns } from '@/components/data-tables/orders/return-order-details/columns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { DataTable } from '@/components/ui/data-table';
import { useReturnOrders } from '@/features/dashboard/orders/hooks/useReturnOrders';
import { ArrowLeftIcon, Home } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { format } from 'date-fns';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import GenericPageError from '@/components/shared/generic-page-error';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const ReturnOrderDetailsPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.SALES_RETURN}>
      <ReturnOrderDetailsContent />
    </RequirePermission>
  );
};

const ReturnOrderDetailsContent = () => {
  const searchParams = useSearchParams();
  const returnId = searchParams.get('returnId');
  const { returnOrder } = useReturnOrders({ enabled: false });
  const returnOrderQuery = returnOrder(returnId || '', {});

  const HeaderSection = (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href={NavKeys.Orders}
              className="flex items-center gap-1"
            >
              <Home className="h-3 w-3" /> Orders
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={NavKeys.SalesReturn}
              className="flex items-center gap-1"
            >
              Sales Return
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Return Order Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={NavKeys.SalesReturn}
            className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">Return Order Details</h1>
            <p className="text-sm text-neutral-500">
              {returnOrderQuery.isLoading
                ? 'Loading return order details...'
                : returnOrderQuery.error
                ? 'Failed to load return order details'
                : 'View return order details and products'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const returnOrderData = returnOrderQuery.data;

  return (
    <section className="w-full space-y-6">
      {HeaderSection}

      {returnOrderQuery.isLoading && (
        <GenericPageLoading
          inline={true}
          loadingText="Loading return order details..."
          className="rounded-lg bg-white"
        />
      )}

      {returnOrderQuery.error && (
        <GenericPageError
          inline={true}
          errorText="Error loading return order details. Please try again."
          className="rounded-lg bg-white"
        />
      )}

      {returnOrderData && (
        <>
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Return Order Information
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-1">
                <Label>Return ID</Label>
                <div>{returnOrderData?.returnId || 'N/A'}</div>
              </div>

              <div className="space-y-1">
                <Label>Order ID</Label>
                <div>{returnOrderData?.orderId || 'N/A'}</div>
              </div>

              <div className="space-y-1">
                <Label>Return Date</Label>
                <div>
                  {returnOrderData?.returnDate
                    ? format(new Date(returnOrderData.returnDate), 'dd/MM/yyyy')
                    : 'N/A'}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Return Status</Label>
                <div>
                  {renderStatusBadge(
                    returnOrderData?.returnOrderStatus || '',
                    StatusType.ORDER
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Return Reason</Label>
                <div>
  {returnOrderData?.products?.[0]?.returnReason || 'N/A'}
</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg bg-white p-4">
            <div className="bg-background mb-2 flex items-center rounded-lg p-2">
              <span className="text-lg font-medium">Return Products</span>
            </div>
            <DataTable
              columns={createColumns()}
              data={returnOrderData?.products || []}
            tableId="return-order-details-table"

            />
            <div className="mt-2 flex items-center justify-end">
              <div className="w-full">
                <div
                  className="bg-background flex w-full justify-end rounded-lg"
                  style={{ height: 40, padding: '10px 16px' }}
                >
                  <span className="font-semibold">
                    Total Return Value: ₹{' '}
                    {(returnOrderData?.products || [])
                      .reduce(
                        (total: number, product: any) => total + product.price,
                        0
                      )
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ReturnOrderDetailsPage;
