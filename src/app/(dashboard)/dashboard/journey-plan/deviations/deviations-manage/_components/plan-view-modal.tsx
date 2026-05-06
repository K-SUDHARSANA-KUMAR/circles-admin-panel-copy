'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useUsers } from '@/features/user-managment/users/hooks/useUsers';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import type { Outlet } from '@/features/dashboard/outlets/types/outlet.types';
import type { ApplicableToData } from '@/app/(dashboard)/dashboard/journey-plan/manual/manual-creation/_types';

interface PlanViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  outlets: Outlet[];
  applicableTo?: ApplicableToData;
  pjpVisitTypeId?: string;
  assignedActivityBeatIds?: string[];
}

export const PlanViewModal = ({
  open,
  onOpenChange,
  title,
  outlets,
  applicableTo,
  pjpVisitTypeId,
  assignedActivityBeatIds,
}: PlanViewModalProps) => {
  // Create columns for outlets table
  const outletColumns = useMemo<ColumnDef<Outlet>[]>(() => [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        return <span>{formatWithLeadingZero(row.index + 1)}</span>;
      },
    },
    {
      id: 'outletName',
      header: 'Outlet Name',
      accessorKey: 'outletName',
    },
  ], []);

  // Determine if we should fetch data
  const shouldFetchWarehouses = open && applicableTo?.warehouseIds && applicableTo.warehouseIds.length > 0;
  const shouldFetchBeats = open && applicableTo?.beatIds && applicableTo.beatIds.length > 0;
  const shouldFetchUsers = open && applicableTo?.userIds && applicableTo.userIds.length > 0;
  const shouldFetchPjpVisitType = open && !!pjpVisitTypeId;
  const shouldFetchAssignedActivityBeats = open && assignedActivityBeatIds && assignedActivityBeatIds.length > 0;
  
  // Fetch warehouses data - only when modal is open and warehouseIds exist
  const { warehouses: warehousesQuery } = useWarehouse(undefined, {
    warehouseIds: shouldFetchWarehouses ? applicableTo.warehouseIds : [],
    nonPaginated: true,
    enabled: shouldFetchWarehouses, // Only fetch when modal is open and warehouseIds exist
  });
  
  const warehousesData = useMemo(() => {
    if (!shouldFetchWarehouses) {
      return [];
    }
    return warehousesQuery.data?.data?.items || [];
  }, [warehousesQuery.data?.data?.items, shouldFetchWarehouses]);

  // Fetch beats data - only when modal is open and beatIds exist
  const { records: beatsQuery } = useMasterRecords(
    shouldFetchBeats ? 'beat' : '',
    undefined,
    0,
    1000,
    true
  );
  const beatsData = useMemo(() => {
    if (!shouldFetchBeats) {
      return [];
    }
    const allBeats = Array.isArray(beatsQuery?.data) ? beatsQuery.data : [];
    return allBeats.filter((beat: any) => {
      const beatId = beat.beatId || beat._id || beat.id;
      return applicableTo?.beatIds?.includes(String(beatId));
    });
  }, [beatsQuery?.data, applicableTo?.beatIds, shouldFetchBeats]);

  // Fetch users data - only when modal is open and userIds exist
  const { users: usersQuery } = useUsers({
    skip: 0,
    limit: 1000,
    nonPaginated: shouldFetchUsers ? 'true' : undefined,
    enabled: shouldFetchUsers, // Only fetch when modal is open and userIds exist
  });
  const usersData = useMemo(() => {
    if (!shouldFetchUsers) {
      return [];
    }
    const allUsers = usersQuery.data?.data?.items || [];
    return allUsers.filter((user: any) => {
      const userId = user.userId || user._id || user.id;
      return applicableTo?.userIds?.includes(String(userId));
    });
  }, [usersQuery.data?.data?.items, applicableTo?.userIds, shouldFetchUsers]);

  // Fetch assigned activity beats
  const { records: assignedActivityBeatsQuery } = useMasterRecords(
    shouldFetchAssignedActivityBeats ? 'beat' : '',
    undefined,
    0,
    1000,
    true
  );

  const assignedActivityBeatsData = useMemo(() => {
    if (!shouldFetchAssignedActivityBeats || !assignedActivityBeatIds) {
      return [];
    }
    const allBeats = Array.isArray(assignedActivityBeatsQuery?.data) ? assignedActivityBeatsQuery.data : [];
    return allBeats.filter((beat: any) => {
      const beatId = beat.beatId || beat._id || beat.id;
      return assignedActivityBeatIds.includes(String(beatId));
    });
  }, [assignedActivityBeatsQuery?.data, assignedActivityBeatIds, shouldFetchAssignedActivityBeats]);

  // Fetch PJP visit type data
  const { records: pjpVisitTypeQuery } = useMasterRecords(
    shouldFetchPjpVisitType ? 'pjpVisitType' : '',
    undefined,
    1,
    1000,
    true
  );

  const pjpVisitTypeData = useMemo(() => {
    if (!shouldFetchPjpVisitType || !pjpVisitTypeId) {
      return null;
    }
    const allTypes = Array.isArray(pjpVisitTypeQuery?.data) ? pjpVisitTypeQuery.data : [];
    return allTypes.find((type: any) => {
      const typeId = type.pjpVisitTypeId || type._id || type.id;
      return String(typeId) === String(pjpVisitTypeId);
    });
  }, [pjpVisitTypeQuery?.data, pjpVisitTypeId, shouldFetchPjpVisitType]);

  const pjpVisitTypeName = pjpVisitTypeData
    ? (pjpVisitTypeData.pjpVisitTypeName || pjpVisitTypeData.name || pjpVisitTypeData.code || '')
    : null;

  // Calculate overall loading state
  const isLoading = useMemo(() => {
    if (!open) return false;
    
    const warehousesLoading = shouldFetchWarehouses && warehousesQuery.isLoading;
    const beatsLoading = shouldFetchBeats && beatsQuery.isLoading;
    const usersLoading = shouldFetchUsers && usersQuery.isLoading;
    const pjpVisitTypeLoading = shouldFetchPjpVisitType && pjpVisitTypeQuery.isLoading;
    const assignedActivityBeatsLoading = shouldFetchAssignedActivityBeats && assignedActivityBeatsQuery.isLoading;
    
    return warehousesLoading || beatsLoading || usersLoading || pjpVisitTypeLoading || assignedActivityBeatsLoading;
  }, [
    open,
    shouldFetchWarehouses,
    shouldFetchBeats,
    shouldFetchUsers,
    shouldFetchPjpVisitType,
    shouldFetchAssignedActivityBeats,
    warehousesQuery.isLoading,
    beatsQuery.isLoading,
    usersQuery.isLoading,
    pjpVisitTypeQuery.isLoading,
    assignedActivityBeatsQuery.isLoading,
  ]);

  // Create columns for warehouses table
  const warehousesColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        return <span>{formatWithLeadingZero(row.index + 1)}</span>;
      },
    },
    {
      id: 'warehouseName',
      header: 'Warehouse Name',
      accessorKey: 'warehouseName',
    },
  ], []);

  // Create columns for beats table
  const beatsColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        return <span>{formatWithLeadingZero(row.index + 1)}</span>;
      },
    },
    {
      id: 'beatName',
      header: 'Beat Name',
      cell: ({ row }) => {
        return row.original.beatName || row.original.name || '-';
      },
    },
  ], []);

  // Create columns for sales persons table
  const salesPersonsColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        return <span>{formatWithLeadingZero(row.index + 1)}</span>;
      },
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
    },
    {
      id: 'employeeCode',
      header: 'Employee Code',
      cell: ({ row }) => {
        return <span className="text-gray-500">{row.original.employeeCode || '-'}</span>;
      },
    },
  ], []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <GenericPageLoading inline={true} loadingText="Loading plan data..." />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Outlets Section */}
            {outlets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Outlets ({outlets.length})</h3>
                <DataTable
                  columns={outletColumns}
                  data={outlets}
                  tableId={`${title.toLowerCase().replace(/\s+/g, '-')}-outlets-table`}
                  isDownload={false}
                  isColumnDisplay={false}
                  hidePagination={outlets.length <= 10}
                />
              </div>
            )}

            {/* Areas Section */}
            {applicableTo && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Assigned Areas</h3>
                
                {/* Warehouses Table */}
                {warehousesData.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-md font-medium">Warehouses ({warehousesData.length})</h4>
                    <DataTable
                      columns={warehousesColumns}
                      data={warehousesData}
                      tableId={`${title.toLowerCase().replace(/\s+/g, '-')}-warehouses-table`}
                      isDownload={false}
                      isColumnDisplay={false}
                      hidePagination={warehousesData.length <= 10}
                    />
                  </div>
                )}

                {/* Beats Table */}
                {beatsData.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-md font-medium">Beats ({beatsData.length})</h4>
                    <DataTable
                      columns={beatsColumns}
                      data={beatsData}
                      tableId={`${title.toLowerCase().replace(/\s+/g, '-')}-beats-table`}
                      isDownload={false}
                      isColumnDisplay={false}
                      hidePagination={beatsData.length <= 10}
                    />
                  </div>
                )}

                {/* Sales Persons Table */}
                {usersData.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-md font-medium">Sales Persons ({usersData.length})</h4>
                    <DataTable
                      columns={salesPersonsColumns}
                      data={usersData}
                      tableId={`${title.toLowerCase().replace(/\s+/g, '-')}-sales-persons-table`}
                      isDownload={false}
                      isColumnDisplay={false}
                      hidePagination={usersData.length <= 10}
                    />
                  </div>
                )}

                {warehousesData.length === 0 && 
                 beatsData.length === 0 && 
                 usersData.length === 0 && (
                  <p className="text-sm text-gray-400">No areas assigned</p>
                )}
              </div>
            )}

            {/* Assigned Activity Section */}
            {(pjpVisitTypeName || assignedActivityBeatsData.length > 0) && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Assigned Activity</h3>
                
                {/* Assigned Activity Beats Table */}
                {assignedActivityBeatsData.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-md font-medium">Beats ({assignedActivityBeatsData.length})</h4>
                    <DataTable
                      columns={beatsColumns}
                      data={assignedActivityBeatsData}
                      tableId={`${title.toLowerCase().replace(/\s+/g, '-')}-assigned-activity-beats-table`}
                      isDownload={false}
                      isColumnDisplay={false}
                      hidePagination={assignedActivityBeatsData.length <= 10}
                    />
                  </div>
                )}

                {/* PJP Visit Type */}
                {pjpVisitTypeName && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">PJP Visit Type:</span>
                      <span className="text-sm">{pjpVisitTypeName}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {outlets.length === 0 && 
             (!applicableTo || 
              (!applicableTo.warehouseIds?.length && 
               !applicableTo.beatIds?.length && 
               !applicableTo.userIds?.length)) &&
             !pjpVisitTypeName &&
             (!assignedActivityBeatIds || assignedActivityBeatIds.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                <p>No plan data available</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
