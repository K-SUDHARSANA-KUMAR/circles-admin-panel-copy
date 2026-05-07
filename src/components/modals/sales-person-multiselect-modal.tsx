'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/features/user-managment/users/api/users';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';

interface SalesPersonOption {
  userId: string;
  name: string;
  employeeCode?: string;
  userType?: string;
  roleName?: string;
  phoneNumber?: string;
  status?: string;
}

interface SalesPersonMultiSelectModalProps {
  open: boolean;
  selectedUserIds: string[];
  onConfirm: (userIds: string[]) => void;
  onCancel: () => void;
  warehouseIds: string[];
  disabled?: boolean;
}

export const SalesPersonMultiSelectModal = ({
  open,
  selectedUserIds,
  onConfirm,
  onCancel,
  warehouseIds,
  disabled = false,
}: SalesPersonMultiSelectModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [localSelection, setLocalSelection] = useState<string[]>(selectedUserIds);

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setLocalSelection(selectedUserIds);
    }
  }, [open, selectedUserIds]);

  const skip = pagination.pageIndex * pagination.pageSize;

  const queryEnabled = open && warehouseIds.length > 0;
  type UsersQueryResponse = Awaited<ReturnType<typeof usersApi.getAll>>;

  const usersQuery = useQuery<UsersQueryResponse | null>({
    queryKey: [
      'manual-pjp-sales-persons',
      {
        skip,
        limit: pagination.pageSize,
        search: searchTerm || undefined,
        warehouseIds,
      },
    ],
    queryFn: async (): Promise<UsersQueryResponse | null> => {
      if (warehouseIds.length === 0) {
        return null;
      }
      return usersApi.getAll({
        skip,
        limit: pagination.pageSize,
        search: searchTerm || undefined,
        status: 'active',
        warehouseId: warehouseIds,
      });
    },
    enabled: queryEnabled,
  });

  const users = useMemo<SalesPersonOption[]>(() => {
    if (!usersQuery.data?.data?.items) {
      return [] as SalesPersonOption[];
    }

    return usersQuery.data.data.items.map((item: any) => ({
      userId: item.userId || item._id || item.id,
      name: item.name || 'Unknown',
      employeeCode: item.employeeCode,
      userType: item.userType,
      roleName: item.roleName,
      phoneNumber: item.phoneNumber,
      status: item.status,
    }));
  }, [usersQuery.data?.data?.items]);

  const totalItems = usersQuery.data?.data?.totalItems ?? users.length;
  const pageCount =
    pagination.pageSize > 0 ? Math.ceil(totalItems / pagination.pageSize) : 1;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  const toggleSelection = useCallback((userId: string, isSelected?: boolean) => {
    if (disabled) return;
    setLocalSelection((previous) => {
      if (!userId) {
        return previous;
      }
      const alreadySelected = previous.includes(userId);
      const shouldSelect =
        typeof isSelected === 'boolean' ? isSelected : !alreadySelected;
      if (!shouldSelect) {
        return previous.filter((id) => id !== userId);
      }
      if (alreadySelected) {
        return previous;
      }
      return [...previous, userId];
    });
  }, [disabled]);

  const handleSelectAll = (checked: boolean) => {
    const pageUserIds = users
      .map((user) => user.userId)
      .filter((userId): userId is string => Boolean(userId));

    if (!checked) {
      setLocalSelection((previous) =>
        previous.filter((userId) => !pageUserIds.includes(userId))
      );
      return;
    }

    setLocalSelection((previous) => {
      const uniqueIds = new Set(previous);
      pageUserIds.forEach((userId) => uniqueIds.add(userId));
      return Array.from(uniqueIds);
    });
  };

  const handlePaginationChange = (nextPagination: PaginationState) => {
    setPagination(nextPagination);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(new Set(localSelection)));
  };

  const columns = useMemo<ColumnDef<SalesPersonOption>[]>(() => {
    return [
      {
        id: 'select',
        header: () => {
          const pageUserIds = users
            .map((user) => user.userId)
            .filter((userId): userId is string => Boolean(userId));
          const allSelected =
            pageUserIds.length > 0 &&
            pageUserIds.every((userId) => localSelection.includes(userId));
          return (
            <Checkbox
              aria-label="Select all sales persons in current page"
              checked={allSelected}
              disabled={disabled}
              onCheckedChange={(value) => {
                if (disabled) return;
                handleSelectAll(Boolean(value));
              }}
            />
          );
        },
        cell: ({ row }) => {
          const userId = row.original.userId;
          const isSelected = localSelection.includes(userId);
          return (
            <Checkbox
              aria-label={`${
                isSelected ? 'Deselect' : 'Select'
              } sales person ${row.original.name}`}
              checked={isSelected}
              disabled={disabled}
              onCheckedChange={(value) => toggleSelection(userId, Boolean(value))}
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'sno',
        header: 'S.No',
        cell: ({ row }) =>
          formatWithLeadingZero(
            pagination.pageIndex * pagination.pageSize + row.index + 1
          ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const userId = row.original.userId;
          const isSelected = localSelection.includes(userId);
          return (
            <button
              type="button"
              className={`text-left transition-colors ${
                isSelected ? 'text-primary' : 'text-muted-foreground'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:text-primary'}`}
              onClick={() => toggleSelection(userId, !isSelected)}
              disabled={disabled}
            >
              {row.original.name}
            </button>
          );
        },
      },
      {
        accessorKey: 'employeeCode',
        header: 'Employee Code',
        cell: ({ row }) => row.original.employeeCode || '-',
      },
      {
        accessorKey: 'userType',
        header: 'User Type',
        cell: ({ row }) => row.original.userType || '-',
      },
      {
        accessorKey: 'roleName',
        header: 'Role',
        cell: ({ row }) => row.original.roleName || '-',
      },
      {
        accessorKey: 'phoneNumber',
        header: 'Phone Number',
        cell: ({ row }) => {
          const phone = row.original.phoneNumber;
          if (!phone) {
            return '-';
          }
          return phone.startsWith('+91') ? phone : `+91 ${phone}`;
        },
      },
    ];
  }, [pagination.pageIndex, pagination.pageSize, users, localSelection, toggleSelection]);

  const isLoading = usersQuery.isLoading || usersQuery.isFetching;
  const error = usersQuery.error;

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-5xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Assign Sales Persons</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-hidden px-6 py-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[260px] flex-1">
                <SearchInput
                  placeholder="Search sales persons..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full"
                />
              </div>
            </div>
            {warehouseIds.length === 0 ? (
              <div className="rounded-md border border-dashed border-muted-foreground bg-muted/30 p-4 text-sm text-muted-foreground">
                Select at least one warehouse to view the associated sales persons.
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-hidden rounded-lg border bg-card">
            {warehouseIds.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
                Sales person list will appear once warehouses are selected.
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading sales persons..." />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text={
                    typeof error === 'string'
                      ? error
                      : error?.message || 'Failed to load sales persons'
                  }
                />
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-auto">
                  <DataTable
                    columns={columns}
                    data={users}
                    tableId="manual-pjp-sales-person-table"
                    onPaginationChange={handlePaginationChange}
                    manualPagination={true}
                    initialPagination={pagination}
                    pageCount={pageCount}
                    totalItems={totalItems}
                    isDownload={false}
                    isColumnDisplay={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={onCancel} className="min-w-[120px]">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={warehouseIds.length === 0}
            className="min-w-[120px]"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalesPersonMultiSelectModal;

