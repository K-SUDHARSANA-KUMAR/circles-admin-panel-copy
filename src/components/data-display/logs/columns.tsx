import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';

export function getLogColumns({ onViewLog }: { onViewLog: (log: any) => void }): ColumnDef<any>[] {
  return [
    {
        header: 'S.No',
        accessorFn: (_, index) => index+1,
        cell: ({row}) => row.index + 1
    },

    {
        header: 'Date and Time',
        accessorKey: 'dateTime'
    },

    {
        header: 'Performed By',
        accessorKey: 'performedBy'
    },

    {
        header: 'Action Type',
        accessorKey: 'actionType'
    },
    {
        header: 'Action',
        cell: ({ row }) => (
          <Button
            variant="secondary" className="text-sm"
            onClick={() => onViewLog(row.original.fullLog)}
          >
            See log Details
          </Button>
        ),
      },
];
}