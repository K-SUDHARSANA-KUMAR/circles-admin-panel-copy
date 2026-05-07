'use client';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlusIcon, RefreshCw, MoreVertical, Eye, Pencil, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import GenericError from '@/components/ui/generic-error';
import { createColumns } from '@/components/data-tables/users/columns';
import { useUsers, useSyncHr } from '@/features/user-managment/users/hooks/useUsers';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { toast } from 'sonner';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setSelectedValue } from '@/store/slices/masterRecordsSlice';
import { UserStatusEnum, UserTypeEnum } from '@/constants/enums/user.enums';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { SearchInput } from '@/components/ui/search-input';
import {
  LocationFilters,
  LocationFilters as LocationFiltersType,
} from '@/components/shared/location-filters';
import { PaginationState } from '@tanstack/react-table';
import CommonSelect from '@/components/dropdown/selectDropdown';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';

const statusOptions = [
  { value: 'all', label: 'Select Status' },
  { value: UserStatusEnum.ACTIVE, label: 'Active' },
  { value: UserStatusEnum.INACTIVE, label: 'Inactive' },
  { value: UserStatusEnum.TERMINATED, label: 'Terminated' },
];

const userTypeOptions = [
  { value: 'all', label: 'Select User Type' },
  { value: UserTypeEnum.PERMANENTFIELD, label: 'Permanent Field' },
  { value: UserTypeEnum.PERMANENTNONFIELD, label: 'Permanent Non Field' },
  { value: UserTypeEnum.TEMPORARY, label: 'Temporary' },
];

const UsersPage = () => {
  return (
    <RequirePermission module="users">
      <UserListContent />
    </RequirePermission>
  );
};

const UserListContent = () => {
  const userPermission = usePermissionChecker('users');
  const hasUserCreatePermission = userPermission.has('create');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [locationFilters, setLocationFilters] = useState<LocationFiltersType>(
    {}
  );
  const [searchUserName, setSearchUserName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string | undefined>(
    undefined
  );
  const [selectedReportingDivision, setSelectedReportingDivision] = useState<string | undefined>(
    undefined
  );
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined
  );
  const [selectedUserType, setSelectedUserType] = useState<string | undefined>(
    undefined
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Clear role filter selection from Redux when component mounts to prevent persistence after navigation
  useEffect(() => {
    dispatch(setSelectedValue({ masterName: 'role', value: '' }));
    dispatch(setSelectedValue({ masterName: 'reportingDivision', value: '' }));
  }, [dispatch]);

  // Memoize the users query parameters to prevent infinite re-renders
  const usersParams = useMemo(() => {
    const params: any = {
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    };

    if (locationFilters.warehouseIds && locationFilters.warehouseIds.length > 0) {
      params.warehouseId = JSON.stringify(locationFilters.warehouseIds);
    }
    if (locationFilters.divisionId && locationFilters.divisionId.length > 0) {
      params.divisionId = JSON.stringify(locationFilters.divisionId);
    }
    if (locationFilters.channelId && locationFilters.channelId.length > 0) {
      params.channelId = JSON.stringify(locationFilters.channelId);
    }
    if (locationFilters.zoneId && locationFilters.zoneId.length > 0) {
      params.zoneId = JSON.stringify(locationFilters.zoneId);
    }
    if (locationFilters.subZoneId && locationFilters.subZoneId.length > 0) {
      params.subZoneId = JSON.stringify(locationFilters.subZoneId);
    }
    if (selectedRole) {
      params.roleId = selectedRole;
    }
    if (selectedReportingDivision) {
      params.reportingDivisionId = selectedReportingDivision;
    }
    if (selectedStatus && selectedStatus !== 'all') {
      params.status = selectedStatus;
    }
    if (selectedUserType && selectedUserType !== 'all') {
      params.userType = selectedUserType;
    }
    if (searchUserName) {
      params.search = searchUserName;
    }

    return params;
  }, [
    locationFilters.warehouseIds,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
    selectedRole,
    selectedStatus,
    selectedUserType,
    selectedReportingDivision,
    searchUserName,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const { users } = useUsers(usersParams);

  const { filteredItems, applyClientFilter } = useMemo(() => {
    const rawItems: any[] = users.data?.data?.items || [];
    const isUserTypeFilterActive = !!(selectedUserType && selectedUserType !== 'all');
    
    if (!isUserTypeFilterActive) {
      return { filteredItems: rawItems, applyClientFilter: false } as const;
    }

    const target = selectedUserType!.toLowerCase();
    const expectedFilteredItems = rawItems.filter((u) => (u.userType || '').toLowerCase() === target);
    const serverFilterWorking = rawItems.length === 0 || expectedFilteredItems.length === rawItems.length;
    
    if (serverFilterWorking) {
      return { filteredItems: rawItems, applyClientFilter: false } as const;
    } else {
      return { filteredItems: expectedFilteredItems, applyClientFilter: true } as const;
    }
  }, [users.data?.data?.items, selectedUserType]);

  // columns memoized later after getActionsForUser is declared

  // Sync HR hook and state
  const {
    data: syncHrData,
    isFetching: isSyncHrFetching,
    error: syncHrError,
    refetch: syncHrRefetch,
    isSuccess: isSyncHrSuccess,
  } = useSyncHr();
  const [syncHrMessage, setSyncHrMessage] = useState<string | null>(null);

  const handleSyncHr = async () => {
    setSyncHrMessage(null);
    toast.loading('Syncing HR...', { id: 'sync-hr' });
    try {
      const result = await syncHrRefetch();
      const changed = result.data?.data?.changedEmployees;
      if (changed !== undefined) {
        if (changed === 0) {
          setSyncHrMessage('Already Uptodate with Sync HR');
          toast.success('Already Uptodate with Sync HR', { id: 'sync-hr' });
        } else {
          setSyncHrMessage(`${changed} users updated successfully`);
          toast.success(`${changed} users updated successfully`, {
            id: 'sync-hr',
          });
        }
      } else {
        toast.error('Unexpected response from Sync HR', { id: 'sync-hr' });
      }
    } catch (err) {
      toast.error('Error syncing HR. Please try again.', { id: 'sync-hr' });
    }
  };

  const handleAddNew = () => {
    router.push(NavKeys.UserCreate);
  };


  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    selectedRole,
    selectedStatus,
    selectedUserType,
    selectedReportingDivision,
    searchUserName,
    locationFilters.divisionId,
    locationFilters.channelId,
    locationFilters.zoneId,
    locationFilters.subZoneId,
    locationFilters.warehouseIds,
  ]);

  const handleRefresh = () => {
    setSearchUserName('');
    users.refetch();
  };

  const getActionsForUser = useCallback(
    (user: any): Action[] => {
      const actions: Action[] = [];

      // Add View action for all users
      actions.push({
        title: 'View',
        icon: <Eye />,
        href: (user: any) => `${NavKeys.UserCreate}?mode=view&userId=${user.userId}`,
        handleAction: () => router.push(`${NavKeys.UserCreate}?mode=view&userId=${user.userId}`),
      });

      if (userPermission.has('edit')) {
        actions.push({
          title: 'Edit',
          icon: <Pencil />,
          href: (user: any) => `${NavKeys.UserCreate}?mode=edit&userId=${user.userId}`,
          handleAction: () => router.push(`${NavKeys.UserCreate}?mode=edit&userId=${user.userId}`),
        });
      }

      if (userPermission.has('log')) {
        actions.push({
          title: 'Logs',
          icon: <History />,
          href: (user: any) => `${NavKeys.Users}/logs?userId=${user.userId}`,
          handleAction: () => router.push(`${NavKeys.Users}/logs?userId=${user.userId}`),
        });
      }

      return actions;
    },
    [userPermission, router]
  );

  // Memoize columns so they aren't recreated on each render
  const columns = useMemo(
    () =>
      createColumns(
        { roleMap: {} },
        getActionsForUser,
        pagination.pageIndex,
        pagination.pageSize
      ),
    [getActionsForUser, pagination.pageIndex, pagination.pageSize]
  );

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Users " />

      <div className="w-full space-y-4 rounded-lg bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="w-full md:w-[30%]">
            <SearchInput
              placeholder="Search User"
              staticPrefix="Search by"
              rotatingWords={['EmployeeName', 'Employee Code', 'Phone Number']}
              className="w-full"
              value={searchUserName}
              onChange={setSearchUserName}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleSyncHr}
              disabled={isSyncHrFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isSyncHrFetching ? 'animate-spin' : ''}`}
              />
              Sync HR
            </Button>
            {hasUserCreatePermission && (
              <Button onClick={handleAddNew}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Temp User
              </Button>
            )}
          </div>
          {isSyncHrSuccess && syncHrMessage && (
            <div className="mt-2 font-medium text-primary">
              {syncHrMessage}
            </div>
          )}
        </div>
        {/* Location Filters */}
        <LocationFilters
          filters={locationFilters}
          onFiltersChange={setLocationFilters}
          showWarehouse={true}
          className="my-4 w-full"
        />

        <div className="grid grid-cols-5 gap-2">
          <CommonSelect
            value={selectedStatus}
            placeholder="Status"
            options={statusOptions}
            onChange={setSelectedStatus}
          />
          <CommonSelect
            value={selectedUserType}
            placeholder="User Type"
            options={userTypeOptions}
            onChange={setSelectedUserType}
          />
          <MasterRecordDropdown
            masterName="role"
            value={selectedRole}
            onChange={setSelectedRole}
            placeholder="Role"
            className="w-full gap-2"
          />
          <MasterRecordDropdown
            masterName="reportingDivision"
            value={selectedReportingDivision}
            onChange={setSelectedReportingDivision}
            placeholder="Reporting Division"
            className="w-full gap-2"
          />
        </div>

        {users.error ? (
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading users. Please try again." />
          </div>
        ) : (
          (() => {
            const clientTotal = filteredItems.length;
            const effectiveTotal = applyClientFilter
              ? clientTotal
              : users.data?.data?.totalItems || 0;
            const effectivePageCount = applyClientFilter
              ? Math.max(1, Math.ceil(clientTotal / pagination.pageSize))
              : users.data?.data?.totalPages || 0;

            return (
              <DataTable
                columns={columns}
                data={filteredItems}
                pageCount={effectivePageCount}
                totalItems={effectiveTotal}
                manualPagination={true}
                onPaginationChange={handlePaginationChange}
                initialPagination={pagination}
                isLoading={users.isLoading}
                loadingText="Loading users..."
                tableId="users-table"
              />
            );
          })()
        )}
      </div>
    </section>
  );
};

export default UsersPage;
