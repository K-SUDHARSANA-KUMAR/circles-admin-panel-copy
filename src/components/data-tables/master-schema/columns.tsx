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
import { Action } from '../util/types';
import { camelCaseToReadable } from '@/utils/string-utils';

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
}

interface Schema {
  name: string;
  displayName: string;
  fields: SchemaField[];
  groupId: string;
}

export const createColumns = (
  getActionsForRow: (item: any) => Action[]
): ColumnDef<Schema>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'displayName',
      header: 'Display Name',
    },
    {
      accessorKey: 'fields',
      header: 'Fields',
      cell: ({ row }) => {
        const fields = row.original.fields;
        return (
          <div>
            {fields.map((f, index) => (
              <span key={index}>
                {camelCaseToReadable(f.name)}
                {index < fields.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        );
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
                return (
                  <DropdownMenuItem
                    key={row.original.groupId + action.title}
                    variant={action.showWarning ? 'destructive' : 'default'}
                    className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
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
  ];
};
