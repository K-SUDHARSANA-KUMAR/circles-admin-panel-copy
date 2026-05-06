import { formatWithLeadingZero } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';

interface OutletProduct {
  productName: string;
  quantity: number;
  case: string;
  unit: string;
  price: number;
}

export const createColumns = () => [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(row.index + 1),
  },
  {
    accessorKey: 'productName',
    header: 'Product Name',
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
  },
  {
    accessorKey: 'case',
    header: 'Case',
  },
  {
    accessorKey: 'unit',
    header: 'Unit',
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => `₹${row.getValue('price')}`,
  },
] as ColumnDef<OutletProduct>[];
