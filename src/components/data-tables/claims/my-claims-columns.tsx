'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'claimId',
    header: 'Claim ID',
  },
  {
    accessorKey: 'claimType',
    header: 'Claim Type',
  },
  {
    accessorKey: 'claimDate',
    header: 'Claim Date',
    cell: ({ row }) => {
      const date = new Date(row.original.claimDate);
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'totalAmount',
    header: 'Amount',
    cell: ({ row }) => `₹${row.original.totalAmount.toFixed(2)}`,
  },
  {
    accessorKey: 'aiScore',
    header: 'AI Score',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="border-b border-neutral-200"
              onClick={() => row.original.onViewClaim?.()}
            >
              View Claim
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
