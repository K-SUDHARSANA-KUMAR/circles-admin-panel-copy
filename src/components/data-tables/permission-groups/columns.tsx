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
import { Switch } from '@/components/ui/switch';
import { Action } from '../util/types';
import { camelCaseToReadable } from '@/utils/string-utils';

export interface PermissionGroup {
  permissionGroupId: string;
  name: string;
  permissions: string[];
  isActive: boolean;
  description: string;
  userType?: string;
  onToggleActive?: (value: boolean) => void;
  toggleLoading?: boolean;
}

export const createColumns = (getActionsForRow: (item: any) => Action[]):
  ColumnDef<PermissionGroup>[] => {
  return [
    {
      accessorKey: 'name',
      header: 'Group Name',
    },
    {
      accessorKey: 'userType',
      header: 'User Type',
      cell: ({ row }) => camelCaseToReadable(row.getValue('userType')) || '-',
    },
    {
      id: 'permissionCount',
      header: 'Permission Count',
      cell: ({ row }) => row.original.permissions.length,
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
              {actions.map((action, index) => {
                return (
                  <DropdownMenuItem
                    variant={action.showWarning ? 'destructive' : 'default'}
                    key={row.original.permissionGroupId + action.title}
                    className={`border-b border-neutral-200 ${index === actions.length - 1 ? 'border-b-0' : ''}`}
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
  ]
};
