'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatWithLeadingZero } from '@/lib/utils';
import { Action } from '../util/types';

interface PjpRecord {
  id: string;
  routePlanId: string;
  salesPerson: string;
  noOfDays: number;
  noOfOutlets: number;
  travelTime: string;
  totalTravelTimeHours?: number;
  planType: string;
  visitPeriodFormatted: string;
  businessTypeId?: string;
  totalTravelKms?: number;
  createdAt: string;
  updatedAt: string;
  todayPresent?: boolean;
  warehouseName?: string;
}

interface MasterRecordMaps {
  // businessTypeMap removed as Business Type column is no longer needed
}

export const createColumns = (
  recordMaps?: MasterRecordMaps,
  getActionsForRow?: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10,
): ColumnDef<PjpRecord>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'routePlanId',
      header: 'Plan ID',
      cell: ({ row }) => {
        const planId = row.getValue('routePlanId') as string;
        return <div>{planId || '-'}</div>;
      },
    },
    {
      accessorKey: 'warehouseName',
      header: 'Warehouse',
      cell: ({ row }) => row.getValue('warehouseName') || '-',
    },
    {
      accessorKey: 'salesPerson',
      header: 'Sales Person',
    },
    {
      accessorKey: 'noOfDays',
      header: 'No of Days',
    },
    {
      accessorKey: 'noOfOutlets',
      header: 'No of Outlets',
    },
    {
      accessorKey: 'totalTravelTimeHours',
      header: 'Travel Time',
      cell: ({ row }) => {
        const hours = row.getValue('totalTravelTimeHours') as number | undefined;
        return hours ? `${hours.toFixed(2)} hrs` : '-';
      },
    },
    {
      accessorKey: 'totalTravelKms',
      header: 'Travel Distance',
      cell: ({ row }) => {
        const kms = row.getValue('totalTravelKms') as number | undefined;
        return kms ? `${kms.toFixed(2)} km` : '-';
      },
    },
    {
      accessorKey: 'planType',
      header: 'Plan Type',
    },
    {
      accessorKey: 'visitPeriodFormatted',
      header: 'Visit Period',
    },
    {
      accessorKey: 'todayPresent',
      header: 'Today Present',
      cell: ({ row }) => (row.getValue('todayPresent') ? 'Yes' : 'No'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const actions = getActionsForRow ? getActionsForRow(item) : [];
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
                      key={row.original.id + action.title}
                      variant={action.showWarning ? 'destructive' : 'default'}
                      className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
                      asChild
                    >
                      <Link
                        href={href}
                        className="flex items-center gap-2 w-full"
                        onClick={() => {
                          action.handleAction?.(item);
                        }}
                      >
                        <span>{action.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={row.original.id + action.title}
                    variant={action.showWarning ? 'destructive' : 'default'}
                    className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
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
  ];
};
