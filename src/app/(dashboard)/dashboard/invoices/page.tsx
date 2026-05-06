'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { createColumns } from '@/components/data-tables/invoices/columns';
import { Action } from '@/components/data-tables/util/types';
import GenericPageError from '@/components/shared/generic-page-error';
import PageHeader from '@/components/shared/page-header';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { InvoiceStatusEnum } from '@/constants/enums/invoice.enums';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { useInvoices } from '@/features/dashboard/invoices/hooks/useInvoices';
import { useAppSelector } from '@/store/hooks';
import { PaginationState } from '@tanstack/react-table';
import { DownloadIcon, SendIcon, EyeIcon, FileTextIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const InvoicesPage = () => {
  return (
    // <RequirePermission module="invoices">
    <InvoicesContent />
    // </RequirePermission>
  );
};

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outletId = searchParams.get('outletId');
  const orderId = searchParams.get('orderId');

  const [search, setSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(
    null
  );

  const { user } = useAppSelector((state) => state.auth);
  const invoicePermission = useOptimizedPermissionChecker();

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [invoiceStatus, search]);

  const { invoices, downloadInvoice, sendInvoice } = useInvoices({
    ...(outletId && { outletId }),
    ...(orderId && { orderId }),
    ...(search && { search }),
    ...(invoiceStatus && { invoiceStatus: invoiceStatus }),
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  });

  const handleDownload = async (invoice: any) => {
    try {
      setDownloadingInvoiceId(invoice.invoiceId);
      const blob = await downloadInvoice.mutateAsync(invoice.invoiceId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNo}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleSend = async (invoice: any) => {
    try {
      await sendInvoice.mutateAsync(invoice.invoiceId);
      toast.success('Invoice sent successfully');
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send invoice');
    }
  };

  const handleView = (invoice: any) => {
    // Navigate to invoice details page
    router.push(`/dashboard/invoices/${invoice.invoiceId}`);
  };

  const handleViewAllInvoices = () => {
    // Navigate to all invoices view
    router.push(NavKeys.Invoices);
  };

  const handleViewLogs = (invoice: any) => {
    router.push(`/logs?service=invoice&module=invoices&metaTags.invoiceId=${invoice.invoiceId}`);
  };

  const getActionsForInvoice = useCallback(
    (invoice: any): Action[] => {
      const actions: Action[] = [];

      actions.push({
        title: 'Logs',
        handleAction: () => handleViewLogs(invoice),
      });

      return actions;
    },
    []
  );

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  // Get page title based on context
  const getPageTitle = () => {
    if (outletId) return 'Outlet Invoices';
    if (orderId) return 'Order Invoices';
    return 'Invoices';
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title={getPageTitle()} />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <div>
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="w-full md:w-[35%]">
              <SearchInput
                placeholder="Search Invoices"
                staticPrefix="Search by"
                rotatingWords={['Invoice No', 'Outlet Name', 'Order ID']}
                className="w-full"
                value={search}
                onChange={setSearch}
              />
            </div>
            <div className="flex items-center gap-2">

            </div>
          </div>

          {/* Invoice Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Status */}
              <StatusDropdown
                value={invoiceStatus}
                onChange={setInvoiceStatus}
                statusEnum={InvoiceStatusEnum}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {invoices.error ? (
          <GenericPageError
            title="Invoices"
            errorText="Error loading invoices. Please try again."
            inline={true}
          />
        ) : (
          <DataTable
            columns={createColumns(
              getActionsForInvoice,
              pagination.pageIndex,
              pagination.pageSize,
              undefined,
              handleDownload,
              downloadingInvoiceId
            )}
            data={invoices.data?.data?.items || []}
            pageCount={invoices.data?.data?.totalPages}
            totalItems={invoices.data?.data?.totalItems}
            onPaginationChange={handlePaginationChange}
            manualPagination={true}
            initialPagination={pagination}
            isLoading={invoices.isLoading}
            loadingText="Loading invoices..."
            tableId="invoices-table"
          />
        )}
      </div>
    </section>
  );
}

export default InvoicesPage;
