'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  createOutletHierarchyColumns,
  OutletHierarchyRow,
} from '@/components/data-tables/outlet-hierarchy/columns';
import { DataTable } from '@/components/ui/data-table';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { PlusIcon } from 'lucide-react';
import { useHierarchies } from '@/features/config-management/approval-hierarchy/hooks/useApprovalHierarchy';
import { useApprovalHierarchy } from '@/features/config-management/approval-hierarchy/hooks/useApprovalHierarchy';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { PaginationState } from '@tanstack/react-table';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { RequirePermission } from '@/components/auth/require-permission';

const OutletConfigPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.OUTLET_CONFIG} action={MENU_RIGHTS.VIEW}>
      <OutletConfigTable />
    </RequirePermission>
  );
};

const OutletConfigTable = () => {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Support backend pagination and optional channelId filter
  const { data, isLoading, isError } = useHierarchies(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageSize,
    'outletApprovals',
    selectedChannel ? [selectedChannel] : undefined
  );

  type OutletHierarchyApiItem = {
    _id: string;
    hierarchyId: string;
    context: string;
    metaTagFields: {
      channelId: string;
      channelName: string;
    };
    // Add other fields as needed
  };

  const items = useMemo(
    () => (data?.data?.items as OutletHierarchyApiItem[]) || [],
    [data]
  );
  const totalPages = data?.data?.totalPages || 0;
  const totalItems = data?.data?.totalItems || 0;

  const tableData: OutletHierarchyRow[] = useMemo(() => {
    return items.map((item, idx: number) => ({
      sno: idx + 1 + pagination.pageIndex * pagination.pageSize,
      _id: item._id,
      hierarchyId: item.hierarchyId,
      channelName: item.metaTagFields?.channelName || '',
      context: item.context,
    }));
  }, [items, pagination]);

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const handleUpdate = (row: OutletHierarchyRow) => {
    router.push(
      `${NavKeys.OutletConfigCreation}?hierarchyId=${row.hierarchyId}&mode=edit`
    );
  };

  const { deleteHierarchy } = useApprovalHierarchy();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<OutletHierarchyRow | null>(null);

  const handleDelete = (row: OutletHierarchyRow) => {
    setDeleteRow(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteRow) {
      try {
        await deleteHierarchy.mutateAsync(deleteRow.hierarchyId);
        setDeleteModalOpen(false);
        setDeleteRow(null);
      } catch (error) {
        // Optionally handle error (e.g., show toast)
      }
    }
  };

  const handleViewLogs = (row: OutletHierarchyRow) => {
    alert('View logs for: ' + row.hierarchyId);
  };

  const columns = createOutletHierarchyColumns(
    handleUpdate,
    handleDelete,
    handleViewLogs
  );

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Outlet Config Hierarchy" />

      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <div className="mb-4 flex flex-col items-center justify-between gap-2 md:flex-row">
          <div className="flex gap-2">
            <MasterRecordDropdown
              masterName="channel"
              value={selectedChannel}
              onChange={setSelectedChannel}
              placeholder="Select Channel"
            />
          </div>
          <Button onClick={() => router.push(NavKeys.OutletConfigCreation)}>
            <PlusIcon className="h-5 w-5" />
            Add New Config
          </Button>
        </div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading outlet configs..." />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading outlet configs. Please try again." />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <EmptyState text="No outlet configs found." />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tableData}
            pageCount={totalPages}
            totalItems={totalItems}
            manualPagination={true}
            initialPagination={pagination}
            onPaginationChange={handlePaginationChange}
            isLoading={isLoading}
            loadingText="Loading outlet configs..."
            tableId="outlet-config-table"
          />
        )}
      </div>
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setDeleteRow(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Outlet Config?"
        description="Are you sure you want to delete this outlet config? This action cannot be undone."
        isLoading={deleteHierarchy.isPending}
      />
    </section>
  );
};

export default OutletConfigPage;
