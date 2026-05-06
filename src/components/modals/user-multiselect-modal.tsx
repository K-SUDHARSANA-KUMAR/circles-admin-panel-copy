'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { PaginationState } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';

export interface UserOption {
  userId: string;
  name: string;
  employeeCode: string;
  userType: string;
  roleId: string;
  status: string;
}

interface UserMultiSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  users: UserOption[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  maxSelections?: number;
  pageSize?: number;
  nonPaginated?: boolean;
}

export const UserMultiSelectModal = ({
  open,
  onOpenChange,
  title,
  description,
  users = [],
  selectedUserIds = [],
  onChange,
  placeholder = "Search and select users...",
  isLoading = false,
  disabled = false,
  maxSelections,
  pageSize = 10,
  nonPaginated = false,
}: UserMultiSelectModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const [initialSort, setInitialSort] = useState(true);

  // Get role mappings from Redux store
  const recordMaps = useAppSelector((state) => state.masterRecords.recordMaps);

  useEffect(() => {
    if (open) {
      setInitialSort(true);
    }
  }, [open]);

  // Reset pagination when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    if (searchTerm) {
      setInitialSort(true);
    }
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.roleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Separate selected and unselected users
  const selectedUserSet = new Set(selectedUserIds);
  const selectedFilteredUsers = filteredUsers.filter(user => selectedUserSet.has(user.userId));
  const unselectedFilteredUsers = filteredUsers.filter(user => !selectedUserSet.has(user.userId));

  // Sort with selected items first when modal is initially opened or search is active
  const sortedUsers = initialSort || searchTerm
    ? [...selectedFilteredUsers, ...unselectedFilteredUsers]
    : filteredUsers;

  // Frontend pagination
  const startIndex = pagination.pageIndex * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const handleUserSelect = (userId: string, isSelected: boolean) => {
    if (disabled) return; // Don't allow selection when disabled

    if (maxSelections && !isSelected && selectedUserIds.length >= maxSelections) {
      return;
    }

    if (initialSort) {
      setInitialSort(false);
    }

    if (isSelected) {
      onChange([...selectedUserIds, userId]);
    } else {
      onChange(selectedUserIds.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (disabled) return; // Don't allow selection when disabled

    if (maxSelections && isSelected && sortedUsers.length > maxSelections) {
      return;
    }

    if (isSelected) {
      const currentPageUserIds = paginatedUsers.map(user => user.userId);
      const newSelectedIds = [...new Set([...selectedUserIds, ...currentPageUserIds])];
      onChange(newSelectedIds);
    } else {
      const currentPageUserIds = paginatedUsers.map(user => user.userId);
      onChange(selectedUserIds.filter(id => !currentPageUserIds.includes(id)));
    }
  };

  const handleConfirm = () => {
    onOpenChange(false);
    setSearchTerm('');
    setInitialSort(true);
  };

  const handleCancel = () => {
    setSearchTerm('');
    setInitialSort(true);
    onOpenChange(false);
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  // Check if all current page users are selected
  const allCurrentPageSelected = paginatedUsers.length > 0 &&
    paginatedUsers.every(user => selectedUserIds.includes(user.userId));

  // Create columns for the DataTable
  const columns: ColumnDef<UserOption>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allCurrentPageSelected}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
          disabled={disabled}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedUserIds.includes(row.original.userId)}
          onCheckedChange={(checked) => handleUserSelect(row.original.userId, !!checked)}
          aria-label="Select row"
          disabled={disabled}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        const originalIndex = sortedUsers.findIndex(user => user.userId === row.original.userId);
        return formatWithLeadingZero(originalIndex + 1);
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const isSelected = selectedUserIds.includes(row.original.userId);
        return (
          <div
            className={`font-medium transition-colors flex items-center gap-2 ${isSelected ? 'text-primary' : ''
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-primary'}`}
            onClick={() => !disabled && handleUserSelect(row.original.userId, !isSelected)}
          >
            {row.original.name}
            {isSelected && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Selected
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'employeeCode',
      header: 'Employee Code',
      cell: ({ row }) => {
        const isSelected = selectedUserIds.includes(row.original.userId);
        return (
          <div
            className={`transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-primary'}`}
            onClick={() => !disabled && handleUserSelect(row.original.userId, !isSelected)}
          >
            {row.original.employeeCode}
          </div>
        );
      },
    },
    {
      accessorKey: 'userType',
      header: 'User Type',
      cell: ({ row }) => {
        const isSelected = selectedUserIds.includes(row.original.userId);
        return (
          <div
            className={`transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-primary'}`}
            onClick={() => !disabled && handleUserSelect(row.original.userId, !isSelected)}
          >
            {row.original.userType}
          </div>
        );
      },
    },
    {
      accessorKey: 'roleId',
      header: 'Role',
      cell: ({ row }) => {
        const isSelected = selectedUserIds.includes(row.original.userId);
        const roleId = row.original.roleId;

        // Get role name from roleId using recordMaps
        let roleName = 'N/A';
        if (recordMaps.role && recordMaps.role[roleId]) {
          roleName = String(
            recordMaps.role[roleId].roleName ||
            recordMaps.role[roleId].role_name ||
            recordMaps.role[roleId].name ||
            roleId
          );
        }

        return (
          <div
            className={`transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-primary'}`}
            onClick={() => !disabled && handleUserSelect(row.original.userId, !isSelected)}
          >
            {roleName}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isSelected = selectedUserIds.includes(row.original.userId);
        return (
          <div
            className={`transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-primary'}`}
            onClick={() => !disabled && handleUserSelect(row.original.userId, !isSelected)}
          >
            {row.original.status}
          </div>
        );
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-medium">{title}</div>
              {description && (
                <div className="text-sm font-normal text-zinc-500">
                  {description}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          {/* Search Input */}
          <SearchInput
            placeholder={placeholder}
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-full flex-shrink-0"
          />

          {/* Search Results Summary */}
          {sortedUsers.length > 0 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2 mb-2">
              <span>
                {selectedFilteredUsers.length > 0 && (
                  <span className="text-primary font-medium">
                    {selectedFilteredUsers.length} selected
                    {unselectedFilteredUsers.length > 0 && <span className="text-muted-foreground"> • </span>}
                  </span>
                )}
                {unselectedFilteredUsers.length > 0 && (
                  <span>{unselectedFilteredUsers.length} available</span>
                )}
              </span>
              <span>{sortedUsers.length} total</span>
            </div>
          ) : searchTerm && (
            <div className="flex items-center justify-center text-sm text-muted-foreground mt-4 mb-4 py-8">
              <div className="text-center">
                <p className="font-medium">No users found</p>
                <p>Try adjusting your search term</p>
              </div>
            </div>
          )}

          {/* DataTable */}
          <div className="flex-1 min-h-0 mt-2">
            <div className="h-full overflow-auto border rounded-md [&_tr]:cursor-pointer [&_tr:hover]:bg-muted/50 [&_tr]:transition-colors">
              <DataTable
                columns={columns}
                data={paginatedUsers}
                pageCount={Math.ceil(sortedUsers.length / pagination.pageSize)}
                totalItems={sortedUsers.length}
                onPaginationChange={handlePaginationChange}
                manualPagination={true}
                initialPagination={pagination}
                isLoading={isLoading}
                loadingText="Loading users..."
                tableId="user-multiselect-modal-table"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions - Fixed at Bottom */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || disabled}
          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
