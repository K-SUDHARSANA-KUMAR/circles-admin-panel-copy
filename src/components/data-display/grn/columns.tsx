import { Button } from '@/components/ui/button';
import { formatWithLeadingZero } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';

interface Grn {
  id: string;
  date: string;
  outlet: string;
  invoiceNo: string;
  grnNo: string;
  order: string;
  quantity: number | string;
  packages: number | string;
  receivedPackages: number | string;
  status: string;
  onView?: () => void;
}

export const columns: ColumnDef<Grn>[] = [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(row.index + 1),
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'outlet',
    header: 'Outlet',
  },
  {
    accessorKey: 'invoiceNo',
    header: 'Invoice NO',
  },
  {
    accessorKey: 'grnNo',
    header: 'GRN NO',
  },
  {
    accessorKey: 'order',
    header: 'Order',
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
  },
  {
    accessorKey: 'packages',
    header: 'Packages',
  },
  {
    accessorKey: 'receivedPackages',
    header: 'Received Packages',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    id: 'action',
    header: 'Action',
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => row.original.onView?.()}
      >
        View
      </Button>
    ),
  },
];
