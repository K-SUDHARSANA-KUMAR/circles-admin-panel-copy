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
import { format } from 'date-fns';
import { camelCaseToReadable } from '@/utils/string-utils';

interface Configuration {
  configId: string;
  context: string;
  attribName: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export const createColumns = (
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
      accessorKey: 'context',
      header: 'Context',
    },
    {
      accessorKey: 'attribName',
      header: 'Attribute Name',
      cell: ({ row }) => {
        return camelCaseToReadable(row.getValue('attribName'));
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }) => {
        const date = new Date(row.getValue('updatedAt'));
        return format(date, 'dd/MM/yyyy HH:mm a');
      },
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
                    key={row.original.configId + action.title}
                    className={`${index !== actions.length - 1 ? 'border-b border-neutral-200' : ''} ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                    onClick={() => action.handleAction?.(item)}
                  >
                    <div className="flex items-center gap-2">
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
  ] as ColumnDef<Configuration>[];
};
