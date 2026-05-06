'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { formatWithLeadingZero } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface OrderDetail {
  productName: string;
  quantity: number;
  mrp: number;
  schemeApplied: string;
  case: string;
  unit: string;
  price: number;
  isFreeProduct?: boolean;
  isDiscountedProduct?: boolean;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  onEdit?: () => void;
}

export const createColumns = (): ColumnDef<OrderDetail>[] => [
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
    accessorKey: 'mrp',
    header: 'MRP',
    cell: ({ row }) => `₹${row.getValue('mrp')}`,
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const isFreeProduct = row.original.isFreeProduct;
      const isDiscountedProduct = row.original.isDiscountedProduct;

      if (isFreeProduct && isDiscountedProduct) {
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Discounted Product</Badge>;
      }

      if (isFreeProduct) {
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Free Product</Badge>;
      }

      return `₹${row.getValue('price')}`;
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => `${row.getValue('quantity')} QTY`,
  },
];
