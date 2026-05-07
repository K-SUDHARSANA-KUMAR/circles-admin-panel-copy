'use client';

import { useState, useEffect } from 'react';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  SlidersHorizontal,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from './empty-state';
import Loading from './loading';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV } from '@/utils/download-menu';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  totalItems?: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  manualPagination?: boolean;
  initialPagination?: PaginationState;
  isLoading?: boolean;
  isColumnDisplay?: boolean;
  isDownload?: boolean;
  loadingText?: string;
  hidePagination?: boolean;
  tableId: string; // <-- Add this prop
  getRowClassName?: (row: any) => string;
  onRowSelectionChange?: (selectedRows: TData[]) => void; // <-- Add row selection support
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalItems,
  onPaginationChange,
  manualPagination = false,
  initialPagination,
  isLoading = false,
  isColumnDisplay = true,
  isDownload = true,
  loadingText = 'Loading...',
  hidePagination = false,
  tableId,
  getRowClassName,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  if (!tableId) {
    throw new Error(
      'DataTable: "tableId" prop is required for column memory to work correctly.'
    );
  }

  // Warn if any column is missing an id (for debugging)
  useEffect(() => {
    const missingId = columns.filter((col: any) => !col.id);
    if (missingId.length > 0) {
       
      console.warn(
        'DataTable: Some columns are missing an "id" property. Column memory will not work correctly.',
        missingId
      );
    }
  }, [columns]);

  const [pagination, setPagination] = useState<PaginationState>(
    initialPagination || {
      pageIndex: 0,
      pageSize: 10,
    }
  );

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Initialize column visibility state with empty object to prevent hydration mismatch
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load column visibility from localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem(`datatable_columns_${tableId}`);
    if (stored) {
      try {
        setColumnVisibility(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing stored column visibility:', error);
      }
    }
    setIsHydrated(true);
  }, [tableId]);

  // Save column visibility to localStorage when it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(
        `datatable_columns_${tableId}`,
        JSON.stringify(columnVisibility)
      );
    }
  }, [columnVisibility, tableId, isHydrated]);

  // Sync with external pagination state
  useEffect(() => {
    if (initialPagination) {
      setPagination(initialPagination);
    }
  }, [initialPagination]);

  const handlePaginationChange = (
    updaterOrValue:
      | PaginationState
      | ((old: PaginationState) => PaginationState)
  ) => {
    const newPagination =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination)
        : updaterOrValue;
    setPagination(newPagination);
    if (onPaginationChange) {
      onPaginationChange(newPagination);
    }
  };

  const handleRowSelectionChange = (updater: any) => {
    const newSelection =
      typeof updater === 'function' ? updater(rowSelection) : updater;
    setRowSelection(newSelection);
    
    // Call the callback immediately when selection changes
    if (onRowSelectionChange) {
      // Use setTimeout to avoid infinite loops
      setTimeout(() => {
        const selectedRows = Object.keys(newSelection)
          .filter(key => newSelection[key])
          .map((key) => {
            // Find the row data from the current data array
            const rowIndex = parseInt(key);
            return data[rowIndex];
          })
          .filter(Boolean);
        onRowSelectionChange(selectedRows as TData[]);
      }, 0);
    }
  };

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount || Math.ceil(data.length / pagination.pageSize),
    state: {
      pagination,
      columnVisibility,
      rowSelection,
    },
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: !!onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: (manualPagination || hidePagination)
      ? undefined
      : getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination,
    getRowId: (row: any, index) => row.id || row.collectionId || index.toString(),
  });


  // Calculate display values for pagination info
  const startItem = pagination.pageIndex * pagination.pageSize + 1;
  const endItem = manualPagination
    ? Math.min(
        (pagination.pageIndex + 1) * pagination.pageSize,
        totalItems || 0
      )
    : Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length);
  const totalDisplayItems = manualPagination ? totalItems || 0 : data.length;

  return (
    <div className="space-y-6">
      {isLoading? (
        <div className="flex h-96 items-center justify-center rounded-lg">
          <Loading text={loadingText} />
        </div>
      ) : (
        <div className="space-y-2">

          <div className="flex justify-end">
            <div className="flex justify-end space-x-2">
              {/* Column Toggle Menu */}
              {isColumnDisplay && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="tertiary">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              )}

              
              {/* Download Menu */}
              {isDownload && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="tertiary">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    onClick={() =>
                      exportToCSV(
                        tableId,
                        table.getRowModel().rows.map((r) => r.original)
                      )
                    }
                  >
                    Export as CSV
                  </DropdownMenuCheckboxItem>
                  {/* Later: Add Excel/PDF support */}
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>
           
          </div>


          <Table className="rounded-lg">
            <TableHeader className="rounded-md">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow className="rounded-lg" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={getRowClassName ? getRowClassName(row) : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-80 text-center"
                  >
                    <EmptyState text="Wow! Such Empty" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {(totalDisplayItems > 0 || isLoading) && !hidePagination && (
        <div className="sticky bottom-0 flex items-center justify-between rounded-lg bg-neutral-100 px-2 px-4 py-2">
          <div className="flex-1 text-sm font-medium text-neutral-600">
            {isLoading
              ? 'Loading...'
              : `Showing ${startItem} to ${endItem} of ${totalDisplayItems} entries`}
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-neutral-600">
                Rows per page
              </p>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => {
                  const newPageSize = Number(value);
                  table.setPageSize(newPageSize);
                  // Call onPaginationChange with the new pageSize
                  if (onPaginationChange) {
                    onPaginationChange({
                      pageIndex: table.getState().pagination.pageIndex,
                      pageSize: newPageSize
                    });
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="h-8 w-[70px] bg-card hover:bg-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 30, 40, 50, 100, 200, 500, 1000, 2000].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-neutral-600">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2 text-neutral-600">
              <Button
                variant="tertiary"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage() || isLoading}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || isLoading}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex w-12 items-center justify-center text-sm font-medium text-neutral-600">
                {table.getState().pagination.pageIndex + 1}
              </div>
              <Button
                variant="tertiary"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || isLoading}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage() || isLoading}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
