'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collection } from '@/features/dashboard/collections/api/collections';
import { Action } from '@/components/data-tables/util/types';

// Helper function to check if an item was collected by the current user
const isItemCollectedByCurrentUser = (collection: Collection, currentUserId?: string): boolean => {
  if (!currentUserId || !collection.collections) {
    return false;
  }
  
  // Check if any collection has the current user as the "to" admin
  return collection.collections.some(collectionItem => 
    collectionItem.to.type === 'admin' && 
    collectionItem.to.id === currentUserId &&
    collectionItem.status === 'completed'
  );
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    case 'created':
      return <Badge className="bg-yellow-100 text-yellow-800">Created</Badge>;
    case 'initiated':
      return <Badge className="bg-blue-100 text-blue-800">Initiated</Badge>;
    case 'processing':
      return <Badge className="bg-orange-100 text-orange-800">Processing</Badge>;
    case 'captured':
      return <Badge className="bg-emerald-100 text-emerald-800">Captured</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'authorized':
      return <Badge className="bg-violet-100 text-violet-800">Authorized</Badge>;
    case 'refundInitiated':
      return <Badge className="bg-orange-100 text-orange-800">Refund Initiated</Badge>;
    case 'refundFailed':
      return <Badge className="bg-red-100 text-red-800">Refund Failed</Badge>;
    case 'refundProcessed':
      return <Badge className="bg-green-100 text-green-800">Refund Processed</Badge>;
    case 'partiallyRefunded':
      return <Badge className="bg-yellow-100 text-yellow-800">Partially Refunded</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};


export const createColumns = (currentUserId?: string, getActionsForRow?: (item: Collection) => Action[]): ColumnDef<Collection>[] => [
  {
    id: 'select',
    header: ({ table }) => {
      const isAllSelected = table.getIsAllPageRowsSelected();
      const hasUnselectableRows = table.getRowModel().rows.some(row => 
        isItemCollectedByCurrentUser(row.original, currentUserId)
      );
      
      return (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          disabled={hasUnselectableRows}
        />
      );
    },
    cell: ({ row }) => {
      const isCollected = isItemCollectedByCurrentUser(row.original, currentUserId);
      
      if (isCollected) {
        return (
          <div className="flex items-center justify-start">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-200">
              <Check className="h-3 w-3 text-green-600" />
            </div>
          </div>
        );
      }
      
      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: 'paymentDate',
    header: 'Payment Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('paymentDate'));
      return date.toLocaleDateString();
    },
  },
  {
    id: 'outletName',
    header: 'Outlet Name',
    cell: ({ row }) => {
      const collections = row.original.collections;
      if (!collections || collections.length === 0) {
        return <span className="text-gray-500">-</span>;
      }
      
      const firstCollection = collections[0];
      return firstCollection.from.name || '-';
    },
  },
  {
    accessorKey: 'paymentMode',
    header: 'Payment Mode',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number;
      const currency = row.original.currency;
      return `${currency} ${amount.toLocaleString()}`;
    },
  },
  {
    accessorKey: 'status',
    header: 'Payment Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return getPaymentStatusBadge(status);
    },
  },
  {
    id: 'collectedName',
    header: 'Collected By',
    cell: ({ row }) => {
      const collections = row.original.collections;
      if (!collections || collections.length === 0) {
        return <span className="text-gray-500">-</span>;
      }
      
      const lastCollection = collections[collections.length - 1];
      return lastCollection.to.name || '-';
    },
  },
  {
    id: 'collectedEmployeeCode',
    header: 'Employee Code',
    cell: ({ row }) => {
      const collections = row.original.collections;
      if (!collections || collections.length === 0) {
        return <span className="text-gray-500">-</span>;
      }
      
      const lastCollection = collections[collections.length - 1];
      return (lastCollection.to as any).employeeCode || '-';
    },
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
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
            {actions.map((action, index) => (
              <DropdownMenuItem
                key={row.original.paymentId + action.title}
                variant={action.showWarning ? 'destructive' : 'default'}
                className={`${index < actions.length - 1 ? 'border-b border-neutral-200' : ''}`}
                onClick={() => action.handleAction?.(item)}
              >
                <div className="flex items-center gap-2">
                  <span>{action.title}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Mock data removed - data will come from backend
