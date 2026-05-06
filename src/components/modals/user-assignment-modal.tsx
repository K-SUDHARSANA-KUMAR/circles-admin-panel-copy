import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { Input } from '@/components/ui/input';
import { Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/features/user-managment/users/api/users';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { formatWithLeadingZero } from '@/lib/utils';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface UserOption {
  userId: string;
  name: string;
  employeeCode?: string;
  phoneNumber?: string;
  userType?: string;
  roleName?: string;
}

interface UserAssignmentModalProps {
  open: boolean;
  selectedUserId?: string;
  onChange: (userId: string | undefined, userData?: UserOption) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  initialSelectedOption?: UserOption;
  warehouseIds?: string[]; // Add warehouse filtering
  modalTitle?: string; // Custom title for the modal
  selectedOutletCount?: number; // Number of outlets being assigned
}

export const UserAssignmentModal: React.FC<UserAssignmentModalProps> = ({
  open,
  selectedUserId,
  onChange,
  onConfirm,
  onCancel,
  loading = false,
  initialSelectedOption,
  warehouseIds,
  modalTitle = 'Select User for Assignment', // Default title
  selectedOutletCount = 0,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');

  // Debug logging when modal opens
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setSearch('');
      setSelectedDivisionId(''); // Reset division filter when modal opens
    }
  }, [open]);

  // Reset page index when selectedDivisionId changes
  const lastKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentKey = JSON.stringify({
      selectedDivisionId,
    });
    if (lastKeyRef.current !== currentKey) {
      lastKeyRef.current = currentKey;
      setPageIndex(0);
    }
  }, [selectedDivisionId]);

  const initialPagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPageIndex(0); // Reset to first page
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setPageIndex(0); // Reset to first page when division changes
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find((user: any) => 
      (user.userId || user._id || user.id) === userId
    );
    
    if (selectedUser) {
      const userData: UserOption = {
        userId: userId,
        name: selectedUser.name,
        employeeCode: selectedUser.employeeCode,
        phoneNumber: selectedUser.phoneNumber,
        userType: selectedUser.userType,
        roleName: selectedUser.roleName,
      };
      onChange(userId, userData);
    } else {
      onChange(userId);
    }
  };

  // Use React Query to fetch users
  const usersQuery = useQuery({
    queryKey: [
      'modal-user-assignment',
      {
        skip: pageIndex * pageSize,
        limit: pageSize,
        reportingDivisionId: selectedDivisionId || undefined,
        search: search || undefined,
        status: 'active', // Only show active users
        warehouseIds: warehouseIds || undefined, // Added warehouseIds to queryKey
      },
    ],
    queryFn: async () => {
      const filters = {
        skip: pageIndex * pageSize,
        limit: pageSize,
        reportingDivisionId: selectedDivisionId || undefined,
        search: search || undefined,
        status: 'active',
        warehouseId: warehouseIds || undefined, // Added warehouseId to filters
      };
      return await usersApi.getAll(filters);
    },
    enabled: open,
  });

  // Log when users are fetched
  useEffect(() => {
    if (usersQuery.data?.data?.items) {
      console.log(
        'Modal: Fetched users for assignment:',
        usersQuery.data.data.items.length,
        'items'
      );
    }
  }, [usersQuery.data?.data?.items]);

  const users = usersQuery.data?.data?.items || [];
  const isLoading = usersQuery.isLoading || loading;
  const error = usersQuery.error;
  const totalItems = usersQuery.data?.data?.totalItems || 0;

  // Table columns with radio selection for single select
  const columns = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }: any) =>
        formatWithLeadingZero(pageIndex * pageSize + row.index + 1),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'select',
      header: 'Select',
      cell: ({ row }: any) => {
        const userId = row.original.userId || row.original._id || row.original.id;

        if (!userId) {
          console.warn('Modal: No user ID found for row:', row.original);
          return null;
        }

        const isSelected = selectedUserId === userId;

        return (
          <input
            type="radio"
            name="user-assignment"
            checked={isSelected}
            onChange={() => {
              if (isSelected) {
                // Deselect if already selected
                onChange(undefined);
              } else {
                // Select this user
                handleUserSelect(userId);
              }
            }}
            className="h-4 w-4 accent-freshleaf"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'employeeCode',
      header: 'Employee Code',
      cell: ({ row }: any) => {
        return row.original.employeeCode || '-';
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: any) => {
        const name = row.original.name || '-';
        return (
          <div className="flex items-center gap-2">
            <span>{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'userType',
      header: 'User Type',
      cell: ({ row }: any) => {
        const userType = row.original.userType;
        if (!userType) return '-';
        
        // Format user type for display
        const formattedType = userType
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/^./, (s: string) => s.toUpperCase());
        
        return formattedType;
      },
    },
    {
      accessorKey: 'roleName',
      header: 'Role',
      cell: ({ row }: any) => {
        return row.original.roleName || '-';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status?.toLowerCase();
        return renderStatusBadge(status || '', StatusType.USER_STATUS);
      },
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Phone Number',
      cell: ({ row }: any) => {
        const phoneNumber = row.original.phoneNumber;
        if (!phoneNumber) return '-';
        
        // Format phone number (remove +91 prefix if present)
        const formattedPhone = phoneNumber.startsWith('+91') 
          ? phoneNumber.slice(3) 
          : phoneNumber;
        
        return `+91 ${formattedPhone}`;
      },
    },
  ];

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    
    // First check if it's the initial selected option
    if (initialSelectedOption && initialSelectedOption.userId === selectedUserId) {
      return initialSelectedOption;
    }
    
    // Then check in the current page data
    return users.find((user: any) => 
      (user.userId || user._id || user.id) === selectedUserId
    );
  }, [selectedUserId, users, initialSelectedOption]);

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {modalTitle}
            {selectedOutletCount > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({selectedOutletCount} outlet{selectedOutletCount !== 1 ? 's' : ''} selected)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          {/* Filters Section */}
          <div className="flex-shrink-0 space-y-4">
            {/* Filters Row */}
            <div className="flex gap-4">
              {/* Reporting Division Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Filter by Reporting Division
                </label>
                <MasterRecordSelect
                  masterName="reportingDivision"
                  value={selectedDivisionId}
                  onChange={handleDivisionChange}
                  placeholder="All reporting divisions"
                  className="w-full"
                />
              </div>
              
              {/* Search Bar */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Section - Flexible Height */}
          <div className="mt-4 min-h-0 flex-1">
            {isLoading || loading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading users..." />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text={
                    typeof error === 'string'
                      ? error
                      : error?.message || 'Error loading users'
                  }
                />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <DataTable
                  columns={columns}
                  data={users}
                  pageCount={Math.ceil(totalItems / pageSize)}
                  totalItems={totalItems}
                  onPaginationChange={({
                    pageIndex: newPageIndex,
                    pageSize: newPageSize,
                  }) => {
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize);
                      setPageIndex(0); // Reset to first page when page size changes
                    } else {
                      setPageIndex(newPageIndex);
                    }
                  }}
                  manualPagination={true}
                  initialPagination={initialPagination}
                  isLoading={isLoading}
                  tableId="user-assignment-table"
                  isDownload={false}
                  isColumnDisplay={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions - Fixed at Bottom */}
        <div className="bg-background flex justify-between items-center border-t px-6 py-4">
          <div className="text-sm text-gray-600">
            {selectedUser ? (
              <span>
                Selected: <span className="font-medium">{selectedUser.name}</span>
                {selectedUser.employeeCode && (
                  <span className="text-gray-500 ml-2">({selectedUser.employeeCode})</span>
                )}
              </span>
            ) : (
              <span>No user selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log(
                  'Modal: Confirming user assignment with user ID:',
                  selectedUserId
                );
                onConfirm();
              }}
              disabled={!selectedUserId}
            >
              Assign to User
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserAssignmentModal;