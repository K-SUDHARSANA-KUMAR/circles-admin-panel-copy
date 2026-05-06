import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ClaimHierarchyRow = {
  sno: number;
  claimHierarchyId: string;
  claimTypeId: string;
  claimTypeName?: string;
  roleId?: string;
  roleName?: string;
};

export const createClaimHierarchyColumns = (
  onUpdate: (row: ClaimHierarchyRow) => void,
  onDelete: (row: ClaimHierarchyRow) => void,
  onViewLogs: (row: ClaimHierarchyRow) => void
): ColumnDef<ClaimHierarchyRow>[] => [
  {
    header: 'S.No',
    accessorKey: 'sno',
    cell: info => info.row.index + 1,
    size: 60,
  },
  {
    header: 'Claim Hierarchy ID',
    accessorKey: 'claimHierarchyId',
  },
  {
    header: 'Role Name',
    accessorKey: 'roleName',
  },
  {
    header: 'Claim Type Name',
    accessorKey: 'claimTypeName',
  },
  {
    header: 'Claim Type ID',
    accessorKey: 'claimTypeId',
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: ({ row }) => {
      const data = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUpdate(data)}>
              Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(data)}>
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewLogs(data)}>
              View Logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 100,
  },
];
