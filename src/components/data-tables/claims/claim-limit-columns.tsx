'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import StatusBadge from '@/components/ui/badge';

export interface ClaimLimit {
  id: string;
  band: string;
  claimType: string;
  subType: string;
  limit: number;
  claimLimit: number;
  aiScore: number;
  billRequired: boolean;
}

export const createClaimLimitColumns = (
  onEdit: (item: ClaimLimit) => void,
  onDelete: (item: ClaimLimit) => void
): ColumnDef<ClaimLimit>[] => [
  {
    accessorKey: 'band',
    header: 'Band',
  },
  {
    accessorKey: 'claimType',
    header: 'Claim Type',
  },
  {
    accessorKey: 'subType',
    header: 'Sub Type',
  },
  {
    accessorKey: 'limit',
    header: 'Limit',
    cell: ({ row }) => `₹${row.original.limit.toLocaleString()}`,
  },
  {
    accessorKey: 'claimLimit',
    header: 'Claim Limit',
    cell: ({ row }) => `₹${row.original.claimLimit.toLocaleString()}`,
  },
  {
    accessorKey: 'aiScore',
    header: 'AI Score',
    cell: ({ row }) => `${row.original.aiScore}%`,
  },
  {
  accessorKey: 'billRequired',
  header: 'Bill Required',
  cell: ({ row }) => {
    const isRequired = row.original.billRequired;

    return (
      <StatusBadge
        value={isRequired ? 'Yes' : 'No'}
        variant={isRequired ? 'success' : 'destructive'}
      />
    );
  },
},
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => onEdit(row.original)}
            className="hover:bg-gray-50 cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(row.original)}
            className="hover:bg-gray-50 cursor-pointer text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
