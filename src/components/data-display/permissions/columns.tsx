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
import { Switch } from '@/components/ui/switch';
import { Action } from '../util/types';

export interface Permission {
  _id: string;
  permissionId: string;
  name: string;
  description: string;
  code: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  onToggleActive?: (value: boolean) => void;
  toggleLoading?: boolean; // add loading prop
}

export const createColumns = (getActionsForRow: (item: any) => Action[], currentPage: number = 0,
pageSize: number = 10):
  ColumnDef<Permission>[] => {
  return [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
  },
  {
    accessorKey: 'name',
    header: 'Permission Name',
  },
  {
    accessorKey: 'code',
    header: 'Code',
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-[120px]">
        <Switch
          checked={row.original.isActive}
          onCheckedChange={row.original.onToggleActive}
          disabled={row.original.toggleLoading}
        />
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'Action',
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
            {actions.map(action => {
              return <DropdownMenuItem
              key={row.original.permissionId + action.title}
                className={`border-b border-neutral-200 ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                onClick={() => action.handleAction?.(item)}
              >
                <div className='flex gap-2 items-center'>
                  <span>{action.icon}</span>
                  <span>{action.title}</span>
                </div>
              </DropdownMenuItem>
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]};
