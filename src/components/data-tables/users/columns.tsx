'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatWithLeadingZero } from '@/lib/utils';
import { Action } from '../util/types';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

export interface User {
  _id: string;
  name: string;
  userType: string;
  roleId: string;
  roleName?: string;
  reportingDivisionName?: string;
  departmentName?: string;
  status?: string;
  warehouse?: Array<{ warehouseId: string }>;
  mappings?: Array<{ warehouseId: string }>;
}

interface MasterRecordMaps {
  roleMap: Record<string, { roleName: string }>;
}

export const createColumns = (
  recordMaps: MasterRecordMaps,
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
) => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'employeeCode',
      header: 'Employee Code',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'userType',
      header: 'User Type',
    },
    {
      accessorKey: 'roleName',
      header: 'Role',
      cell: ({ row }) => {
        return row.original.roleName || 'N/A';
      },
    },
    {
      accessorKey: 'reportingDivisionName',
      header: 'Reporting Division',
      cell: ({ row }) => {
        return row.original.reportingDivisionName || 'N/A';
      },
    },
    {
      accessorKey: 'departmentName',
      header: 'Department',
      cell: ({ row }) => {
        return row.original.departmentName || 'N/A';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status?.toLowerCase();
        return renderStatusBadge(status || '', StatusType.USER_STATUS);
      },
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => {
        const mappings = row.original.mappings;
        return mappings?.length || 0;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const actions = getActionsForRow(item);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => {
                const href = action.href?.(item);
                
                if (href) {
                  return (
                    <DropdownMenuItem
                      key={row.original._id + action.title}
                      className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''} ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                      asChild
                    >
                      <a
                        href={href}
                        className="flex items-center gap-2 w-full"
                        onClick={(e) => {
                          // Handle left click normally
                          if (e.button === 0) {
                            action.handleAction?.(item);
                          }
                        }}
                        onAuxClick={(e) => {
                          // Handle middle click and right click
                          if (e.button === 1 || e.button === 2) {
                            e.preventDefault();
                            window.open(href, '_blank');
                          }
                        }}
                      >
                        <span>{action.icon}</span>
                        <span>{action.title}</span>
                      </a>
                    </DropdownMenuItem>
                  );
                }
                
                return (
                  <DropdownMenuItem
                    key={row.original._id + action.title}
                    className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''} ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                    onClick={() => action.handleAction?.(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{action.icon}</span>
                      <span>{action.title}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ] as ColumnDef<User>[];
};
