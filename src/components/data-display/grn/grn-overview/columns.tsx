import { formatWithLeadingZero } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';

interface GrnOverview {
  date: string;
  productName: string;
  noOfTons: number;
  status: string;
  returnQuantity: number;
  outletName?: string; 
}

export const createColumns = () => [
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
    accessorKey: 'productName',
    header: 'Product Name',
  },
  {
    accessorKey: 'noOfTons',
    header: 'No of Tons',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'returnQuantity',
    header: 'Return Quantity',
  },
] as ColumnDef<GrnOverview>[];
