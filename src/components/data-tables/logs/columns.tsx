import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { format } from 'date-fns';

export function getLogColumns({ onViewLog }: { onViewLog: (log: any) => void }): ColumnDef<any>[] {
  return [
    {
        header: 'S No',
        accessorFn: (_, index) => index+1,
        cell: ({row}) => (
          <span className="text-sm text-foreground">{row.index + 1}</span>
        ),
        size: 80,
    },

    {
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.title || '-'}
          </span>
        ),
    },

    {
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.description || '-'}
          </span>
        ),
    },

    {
        header: 'Date & Time',
        accessorKey: 'dateTime',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.createdAt
              ? format(new Date(row.original.createdAt), 'dd MMM yyyy, hh:mm a')
              : row.original.dateTime || '-'}
          </span>
        ),
    },

    {
        header: 'By Admin',
        accessorKey: 'performedBy',
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.performedBy || '-'}
          </span>
        ),
    },

    {
        header: 'Status',
        accessorKey: 'actionType',
        cell: ({ row }) => renderStatusBadge(row.original.actionType || 'created', StatusType.AUDIT),
    },
    {
        header: 'Action',
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewLog(row.original.fullLog)}
            className="text-sm"
          >
            Details
          </Button>
        ),
        size: 120,
      },
];
}