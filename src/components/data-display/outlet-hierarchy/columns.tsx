import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface OutletHierarchyRow {
  sno: number;
  _id: string;
  hierarchyId: string;
  channelName: string;
  context: string;
}

export const createOutletHierarchyColumns = (
  onUpdate: (row: OutletHierarchyRow) => void,
  onDelete: (row: OutletHierarchyRow) => void,
  onViewLogs: (row: OutletHierarchyRow) => void
): ColumnDef<OutletHierarchyRow>[] => [
  {
    header: 'S.No',
    accessorKey: 'sno',
    cell: info => info.row.index + 1,
    size: 60,
  },
  {
    header: 'Hierarchy ID',
    accessorKey: 'hierarchyId',
  },
  {
    header: 'Channel Name',
    accessorKey: 'channelName',
  },
  {
    header: 'Context',
    accessorKey: 'context',
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
