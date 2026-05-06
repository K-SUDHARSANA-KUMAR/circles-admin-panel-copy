'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';

interface ReturnOrderProduct {
  productId: string;
  productName: string;
  mrp: number;
  quantity: number;
  price: number;
  originalOrderId: string;
  returnReason: string;
}

export const createColumns = (): ColumnDef<ReturnOrderProduct>[] => [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(row.index + 1),
  },
  {
    accessorKey: 'productName',
    header: 'Product Name',
    cell: ({ row }) => row.getValue('productName') || 'N/A',
  },
  {
    accessorKey: 'mrp',
    header: 'MRP',
    cell: ({ row }) => `₹${row.getValue('mrp') || 'N/A'}`,
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => `${row.getValue('quantity')} QTY`,
  },
  {
    accessorKey: 'price',
    header: 'Total Price',
    cell: ({ row }) => `₹${row.getValue('price')}`,
  }
]; 