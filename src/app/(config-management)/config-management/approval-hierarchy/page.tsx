'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  createApprovalHierarchyColumns,
  ApprovalHierarchyRow,
} from '@/components/data-tables/approval-hierarchy/columns';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useHierarchies } from '@/features/config-management/approval-hierarchy/hooks/useApprovalHierarchy';
import { useApprovalHierarchy } from '@/features/config-management/approval-hierarchy/hooks/useApprovalHierarchy';
import { DeleteConfirmationModal } from '@/components/modals/delete-confirmation-modal';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { PaginationState } from '@tanstack/react-table';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { RequirePermission } from '@/components/auth/require-permission';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { APPROVAL_HIERARCHY_TYPES } from '@/constants/enums/approval-hierarchy.enums';
import { useSearchParams } from 'next/navigation';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';

const INITIAL_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: 10,
};

const HIERARCHY_TYPES = APPROVAL_HIERARCHY_TYPES;

// Function to map type parameter to context name for API
const getContextNameFromType = (type: string | null): string | undefined => {
  switch (type) {
    case 'claim-approval-hierarchy':
      return 'claimApprovals';
    case 'outlet-approval-hierarchy':
      return 'outletApprovals';
    case 'scheme-approval-hierarchy':
      return 'schemeApprovals';
    case 'manual-pjp-approval-hierarchy':
      return 'manualPjpApprovals';
    default:
      return 'claimApprovals'; // Default to claim approvals
  }
};

const ApprovalHierarchyPage = () => {
  const searchParams = useSearchParams();
  const typeFromQuery = searchParams.get('type');
  // Use type parameter directly as module name, fallback to claim-approval-hierarchy
  const permissionModule = typeFromQuery || PERMISSIONS.CLAIM_APPROVAL_HIERARCHY;
  
  return (
    <RequirePermission module={permissionModule}>
      <ApprovalHierarchyTable />
    </RequirePermission>
  );
};

const ApprovalHierarchyTable = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromQuery = searchParams.get('type');
  // Use type parameter directly as module name, fallback to claim-approval-hierarchy
  const permissionModule = typeFromQuery || PERMISSIONS.CLAIM_APPROVAL_HIERARCHY;
  const permission = useOptimizedPermissionChecker();
  
  // Get the type from query params, default to first tab (Claim Approvals)
  const [selectedHierarchyType, setSelectedHierarchyType] = useState(typeFromQuery || PERMISSIONS.CLAIM_APPROVAL_HIERARCHY);
  const [pagination, setPagination] = useState<PaginationState>(INITIAL_PAGINATION);

  // Get the label for the selected hierarchy type
  const selectedTypeLabel = useMemo(() => {
    const found = HIERARCHY_TYPES.find((t) => t.value === selectedHierarchyType);
    return found ? found.label : '';
  }, [selectedHierarchyType]);

  // Redirect to first tab if no type is specified
  useEffect(() => {
    if (!typeFromQuery) {
      router.replace(`${NavKeys.ApprovalHierarchy}?type=${PERMISSIONS.CLAIM_APPROVAL_HIERARCHY}`);
      return;
    }
    setSelectedHierarchyType(typeFromQuery);
  }, [typeFromQuery, router]);

  // Send contextName to API for backend filtering
  const contextName = getContextNameFromType(selectedHierarchyType);
  
  const { data, isLoading, isError } = useHierarchies(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageSize,
    contextName,
    undefined
  );

  // Fetch division master data only
  const { records: divisionRecords } = useMasterRecords('division', undefined, 1, 1000, true);
  // Fetch payment mode master data
  const { records: paymentModeRecords } = useMasterRecords('paymentMode', undefined, 1, 1000, true);
  // Create division lookup map
  const divisionMap = useMemo(() => {
    const map = new Map<string, string>();
    console.log('🔍 Division Records:', divisionRecords);
    if (divisionRecords?.data) {
      console.log('📊 Division Data:', divisionRecords.data);
      divisionRecords.data.forEach((division: any) => {
        console.log('🏢 Individual Division:', division);
        const id = division.divisionId || division.id;
        const name = division.divisionName || division.divisionname;
        console.log(`📝 Division ID: ${id}, Name: ${name}`);
        if (id && name) {
          map.set(id, name);
        }
      });
    }
    console.log('🗺️ Final Division Map:', Array.from(map.entries()));
    return map;
  }, [divisionRecords?.data]);
  
  // Create payment mode lookup map
  const paymentModeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (paymentModeRecords?.data) {
      paymentModeRecords.data.forEach((paymentMode: any) => {
        const id = paymentMode.paymentModeId || paymentMode.id;
        const name = paymentMode.paymentModeName || paymentMode.paymentmodename;
        if (id && name) {
          map.set(id, name);
        }
      });
    }
    return map;
  }, [paymentModeRecords?.data]);

  type ApprovalHierarchyApiItem = {
    _id: string;
    hierarchyId?: string;
    context: string;
    metaTagFields: Record<string, any>;
    approvers: Array<{
      level: number;
      mandatory: boolean;
      roleId: string;
      roleName: string;
    }>;
    // Add other fields as needed
  };

  const items = useMemo(
    () => (data?.data?.items as ApprovalHierarchyApiItem[]) || [],
    [data]
  );
  const totalPages = data?.data?.totalPages || 0;
  const totalItems = data?.data?.totalItems || 0;

  const tableData: ApprovalHierarchyRow[] = useMemo(() => {
    console.log('📋 API Items:', items);
    const mappedData = items.map((item, idx: number) => {
      console.log(`📄 Item ${idx}:`, item);
      console.log('🏷️ MetaTagFields:', item.metaTagFields);
      return {
        sno: idx + 1 + pagination.pageIndex * pagination.pageSize,
        _id: item._id,
        hierarchyId: (item as any).hierarchyId || (item as any)?.metaTagFields?.hierarchyId || '',
        context: item.context,
        metaTagFields: item.metaTagFields,
        approversCount: item.approvers?.length || 0,
      };
    });
    console.log('📊 Final Table Data:', mappedData);
    return mappedData;
  }, [items, pagination]);

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  const handleUpdate = useCallback((row: ApprovalHierarchyRow) => {
    const typeParam = selectedHierarchyType !== 'all' ? `&type=${selectedHierarchyType}` : '';
    if (!row.hierarchyId) {
      toast.error('Hierarchy ID not found for this row');
      return;
    }
    router.push(
      `${NavKeys.ApprovalHierarchy}/create?hierarchyId=${row.hierarchyId}&mode=edit${typeParam}`
    );
  }, [router, selectedHierarchyType]);

  const { deleteHierarchy } = useApprovalHierarchy();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ApprovalHierarchyRow | null>(null);

  const handleDelete = useCallback((row: ApprovalHierarchyRow) => {
    setDeleteRow(row);
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteRow?.hierarchyId) {
      try {
        await deleteHierarchy.mutateAsync(deleteRow.hierarchyId);
        toast.success('Deleted successfully');
        setDeleteModalOpen(false);
        setDeleteRow(null);
      } catch (error: any) {
        console.error('Failed to delete approval hierarchy:', error);
        const errorMessage = error?.response?.data?.message || 'Failed to delete approval hierarchy';
        toast.error(errorMessage);
      }
    } else {
      toast.error('Hierarchy ID not found for this row');
    }
  }, [deleteRow, deleteHierarchy]);

  const handleViewLogs = useCallback((row: ApprovalHierarchyRow) => {
    alert('View logs for: ' + row._id);
  }, []);

  const handleCreateNew = useCallback(() => {
    const typeParam = selectedHierarchyType !== 'all' ? `?type=${selectedHierarchyType}` : '';
    router.push(`${NavKeys.ApprovalHierarchy}/create${typeParam}`);
  }, [router, selectedHierarchyType]);

  const columns = useMemo(() => createApprovalHierarchyColumns(
    contextName,
    handleUpdate,
    handleDelete,
    handleViewLogs,
    permission.has(permissionModule, MENU_RIGHTS.EDIT),
    permission.has(permissionModule, MENU_RIGHTS.DELETE),
    permission.has(permissionModule, MENU_RIGHTS.LOG),
    divisionMap,
    paymentModeMap
  ), [contextName, handleUpdate, handleDelete, handleViewLogs, permission, permissionModule, divisionMap, paymentModeMap]);

  return (
    <section className="w-full space-y-6">
      <PageHeader title={`Approval Hierarchy${selectedTypeLabel ? ` - ${selectedTypeLabel}` : ''}`} />

      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <div className="mb-4 flex flex-col items-center justify-between gap-2 md:flex-row">
          <div className="flex gap-2">
            {/* Filter removed - now handled by sidebar navigation */}
          </div>
          {permission.has(permissionModule, MENU_RIGHTS.CREATE) && (
            <Button onClick={handleCreateNew}>
              <PlusIcon className="h-5 w-5" />
              Add New Hierarchy
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading approval hierarchies..." />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading approval hierarchies. Please try again." />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <EmptyState text="No approval hierarchies found." />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tableData}
            pageCount={totalPages}
            totalItems={totalItems}
            manualPagination={true}
            initialPagination={INITIAL_PAGINATION}
            onPaginationChange={handlePaginationChange}
            isLoading={isLoading}
            loadingText="Loading approval hierarchies..."
            tableId="approval-hierarchy-table"
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
        title="Delete Approval Hierarchy?"
        description="Are you sure you want to delete this approval hierarchy? This action cannot be undone."
        isLoading={deleteHierarchy.isPending}
      />
    </section>
  );
};

export default ApprovalHierarchyPage;
