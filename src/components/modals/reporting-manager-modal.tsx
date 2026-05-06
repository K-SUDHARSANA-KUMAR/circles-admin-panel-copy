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
import { Label } from '@/components/ui/label';
import { Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/features/user-managment/users/api/users';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { MasterRecordMultiSelect } from '@/components/shared/master-record-multi-select';
import { CheckboxMultiSelect } from '@/components/shared/checkbox-multiselect';
import { formatWithLeadingZero } from '@/lib/utils';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';

interface ReportingManagerOption {
  userId: string;
  name: string;
  employeeCode?: string;
  phoneNumber?: string;
}

interface ReportingManagerModalProps {
  open: boolean;
  selectedManagerId?: string;
  onChange: (managerId: string | undefined, managerData?: ReportingManagerOption) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  initialSelectedOption?: ReportingManagerOption;
  warehouseIds?: string[]; // Add warehouse filtering
  modalTitle?: string; // Custom title for the modal
  showWarehouseFilter?: boolean; // Enable warehouse filtering UI
  onWarehouseFilterChange?: (warehouseIds: string[]) => void; // Callback for warehouse filter changes
}

export const ReportingManagerModal: React.FC<ReportingManagerModalProps> = ({
  open,
  selectedManagerId,
  onChange,
  onConfirm,
  onCancel,
  loading = false,
  initialSelectedOption,
  warehouseIds,
  modalTitle = 'Select Reporting Manager', // Default title
  showWarehouseFilter = false, // Default to false
  onWarehouseFilterChange,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(''); // reporting division (unchanged)
  const [selectedBusinessDivisionId, setSelectedBusinessDivisionId] = useState<string>(''); // Division filter
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>(warehouseIds || []);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedSubZoneId, setSelectedSubZoneId] = useState<string>('');

  // Fetch warehouses for the multiselect
  const { warehouses } = useWarehouse(undefined, { nonPaginated: true });
  
  const warehouseOptions = useMemo(() => {
    if (!warehouses?.data?.data?.items) return [];
    return warehouses.data.data.items.map((warehouse: any) => ({
      value: warehouse.warehouseId || warehouse._id || '',
      label: warehouse.warehouseName,
    }));
  }, [warehouses?.data?.data?.items]);

  // Debug logging when modal opens
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setSearch('');
      setSelectedDivisionId('');
      setSelectedBusinessDivisionId('');
      setSelectedWarehouseIds(warehouseIds || []); // Initialize with prop value
      setSelectedChannelId('');
      setSelectedZoneId('');
      setSelectedSubZoneId('');
    }
  }, [open, warehouseIds]);

  // Reset page index when selectedDivisionId or selectedWarehouseIds changes
  const lastKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentKey = JSON.stringify({
      selectedDivisionId,
      selectedBusinessDivisionId,
      selectedWarehouseIds,
      selectedChannelId,
      selectedZoneId,
      selectedSubZoneId,
    });
    if (lastKeyRef.current !== currentKey) {
      lastKeyRef.current = currentKey;
      setPageIndex(0);
    }
  }, [selectedDivisionId, selectedBusinessDivisionId, selectedWarehouseIds, selectedChannelId, selectedZoneId, selectedSubZoneId]);

  const initialPagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPageIndex(0); // Reset to first page
  };

  const handleReportingDivisionChange = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setPageIndex(0);
  };
  const handleDivisionChange = (divisionId: string) => {
    setSelectedBusinessDivisionId(divisionId);
    setSelectedChannelId('');
    setSelectedZoneId('');
    setSelectedSubZoneId('');
    setPageIndex(0);
  };

  const handleWarehouseFilterChange = (warehouseIds: string[]) => {
    setSelectedWarehouseIds(warehouseIds);
    setPageIndex(0); // Reset to first page when warehouse filter changes
    onWarehouseFilterChange?.(warehouseIds); // Notify parent component
  };

  const handleChannelChange = (id: string) => {
    setSelectedChannelId(id);
    setSelectedZoneId('');
    setSelectedSubZoneId('');
    setPageIndex(0);
  };

  const handleZoneChange = (id: string) => {
    setSelectedZoneId(id);
    setSelectedSubZoneId('');
    setPageIndex(0);
  };

  const handleSubZoneChange = (id: string) => {
    setSelectedSubZoneId(id);
    setPageIndex(0);
  };

  const handleManagerSelect = (userId: string) => {
    const selectedUser = users.find((user: any) => 
      (user.userId || user._id || user.id) === userId
    );
    
    if (selectedUser) {
      const managerData: ReportingManagerOption = {
        userId: userId,
        name: selectedUser.name,
        employeeCode: selectedUser.employeeCode,
        phoneNumber: selectedUser.phoneNumber,
      };
      onChange(userId, managerData);
    } else {
      onChange(userId);
    }
  };

  // Use React Query to fetch users
  const usersQuery = useQuery({
    queryKey: [
      'modal-reporting-managers',
      {
        skip: pageIndex * pageSize,
        limit: pageSize,
        reportingDivisionId: selectedDivisionId || undefined,
        divisionId: selectedBusinessDivisionId || undefined,
        channelId: selectedChannelId || undefined,
        zoneId: selectedZoneId || undefined,
        subZoneId: selectedSubZoneId || undefined,
        search: search || undefined,
        status: 'active', // Only show active users
        warehouseIds: selectedWarehouseIds.length > 0 ? selectedWarehouseIds : undefined, // Use selected warehouse IDs
      },
    ],
    queryFn: async () => {
      const filters = {
        skip: pageIndex * pageSize,
        limit: pageSize,
        reportingDivisionId: selectedDivisionId || undefined,
        divisionId: selectedBusinessDivisionId || undefined,
        channelId: selectedChannelId || undefined,
        zoneId: selectedZoneId || undefined,
        subZoneId: selectedSubZoneId || undefined,
        search: search || undefined,
        status: 'active',
        warehouseId: selectedWarehouseIds.length > 0 ? selectedWarehouseIds : undefined, // Use selected warehouse IDs
      };
      return await usersApi.getAll(filters);
    },
    enabled: open,
  });

  // Log when users are fetched
  useEffect(() => {
    if (usersQuery.data?.data?.items) {
      console.log(
        'Modal: Fetched reporting managers:',
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

        const isSelected = selectedManagerId === userId;

        return (
          <input
            type="radio"
            name="reporting-manager"
            checked={isSelected}
            onChange={() => {
              if (isSelected) {
                // Deselect if already selected
                onChange(undefined);
              } else {
                // Select this user
                handleManagerSelect(userId);
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
            <span>{name}</span>
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

  const selectedManager = useMemo(() => {
    if (!selectedManagerId) return null;
    
    // First check if it's the initial selected option
    if (initialSelectedOption && initialSelectedOption.userId === selectedManagerId) {
      return initialSelectedOption;
    }
    
    // Then check in the current page data
    return users.find((user: any) => 
      (user.userId || user._id || user.id) === selectedManagerId
    );
  }, [selectedManagerId, users, initialSelectedOption]);

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          {/* Filters Section */}
          <div className="flex-shrink-0 space-y-4">
            {/* First Row: Warehouse + Search */}
            <div className="flex gap-4">
              {/* Warehouse Filter - Only show if enabled */}
              {showWarehouseFilter && (
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    Filter by Warehouse
                  </Label>
                  <CheckboxMultiSelect
                    options={warehouseOptions}
                    value={selectedWarehouseIds}
                    onChange={handleWarehouseFilterChange}
                    placeholder="All warehouses"
                    displayName="warehouse"
                    className="w-full"
                  />
                </div>
              )}

              {/* Reporting Division */}
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-1 block">
                 Filter by Reporting Division
                </Label>
                <MasterRecordSelect
                  masterName="reportingDivision"
                  value={selectedDivisionId}
                  onChange={handleReportingDivisionChange}
                  placeholder="All reporting divisions"
                  className="w-full"
                />
              </div>

              {/* Search Bar */}
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-1 block">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search reporting managers..."
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Second Row: Division, Channel, Zone, Sub Zone */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Division Filter */}
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-1 block"> Filter by Division</Label>
                <MasterRecordSelect
                  masterName="division"
                  value={selectedBusinessDivisionId}
                  onChange={handleDivisionChange}
                  placeholder="All divisions"
                  className="w-full"
                />
              </div>

              {/* Channel Filter - shown only when Division selected */}
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Filter by Channel</Label>
                <MasterRecordSelect
                  masterName="channel"
                  value={selectedChannelId}
                  onChange={handleChannelChange}
                  placeholder="All channels"
                  className="w-full"
                  filters={selectedBusinessDivisionId ? { divisionId: selectedBusinessDivisionId } : undefined}
                />
              </div>

              {/* Zone Filter - shown only when Channel selected */}
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Filter by Zone</Label>
                <MasterRecordSelect
                  masterName="zone"
                  value={selectedZoneId}
                  onChange={handleZoneChange}
                  placeholder="All zones"
                  className="w-full"
                  filters={selectedChannelId ? { channelId: selectedChannelId } : undefined}
                />
              </div>

              {/* Sub Zone Filter - shown only when Zone selected */}
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-1 block">Filter by Sub Zone</Label>
                <MasterRecordSelect
                  masterName="subZone"
                  value={selectedSubZoneId}
                  onChange={handleSubZoneChange}
                  placeholder="All sub zones"
                  className="w-full"
                  filters={selectedZoneId ? { zoneId: selectedZoneId } : undefined}
                />
              </div>
            </div>
          </div>

          {/* Table Section - Flexible Height */}
          <div className="mt-4 min-h-0 flex-1">
            {isLoading || loading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading Users..." />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text={
                    typeof error === 'string'
                      ? error
                      : error?.message || 'Error loading Users'
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
                  tableId="reporting-manager-multiselect-table"
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
            {selectedManager ? (
              <span>
                Selected: <span className="font-medium">{selectedManager.name}</span>
              </span>
            ) : (
              <span>No User selected</span>
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
                  'Modal: Confirming selection with manager ID:',
                  selectedManagerId
                );
                onConfirm();
              }}
              disabled={!selectedManagerId}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportingManagerModal;
