'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatWithLeadingZero } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface OrderDetail {
  productId: string;
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
  productDiscount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  onEdit?: () => void;
  onDiscountChange?: (productId: string, discount: { type: 'percentage' | 'fixed'; value: number } | null) => void;
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
    cell: ({ row }) => {
      const productName = row.getValue('productName') as string;
      const isDiscountedProduct = row.original.isDiscountedProduct;
      const isFreeProduct = row.original.isFreeProduct;

      return (
        <div className="flex items-center gap-2">
          <span>{productName}</span>
          {isDiscountedProduct && !isFreeProduct && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              Discounted Product
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'mrp',
    header: 'MRP',
    cell: ({ row }) => {
      const mrp = row.getValue('mrp') as number;
      const isDiscountedProduct = row.original.isDiscountedProduct;
      const isFreeProduct = row.original.isFreeProduct;

      // For product-level discounts, MRP should be 0
      if (isDiscountedProduct && !isFreeProduct && ((row.original as any).addedFromSchemeId || (row.original as any).discountedBySchemeId)) {
        return `₹0`;
      }

      return `₹${mrp}`;
    },
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
  // {
  //   id: 'discount',
  //   header: 'Discount',
  //   cell: ({ row }) => {
  //     const productDiscount = row.original.productDiscount;
  //     const onDiscountChange = row.original.onDiscountChange;
  //     const productId = row.original.productId;

  //     if (row.original.isFreeProduct) {
  //       return <Badge variant="secondary" className="bg-green-100 text-green-800">Free</Badge>;
  //     }

  //     return (
  //       <div className="flex items-center gap-2 min-w-[140px]">
  //         <Select
  //           value={productDiscount?.type || ''}
  //           onValueChange={(type: 'percentage' | 'fixed') => {
  //             if (onDiscountChange) {
  //               onDiscountChange(productId, {
  //                 type,
  //                 value: productDiscount?.value || 0
  //               });
  //             }
  //           }}
  //         >
  //           <SelectTrigger className="h-8 text-xs w-20">
  //             <SelectValue placeholder="Type" />
  //           </SelectTrigger>
  //           <SelectContent>
  //             <SelectItem value="percentage">Percentage</SelectItem>
  //             <SelectItem value="fixed">Amount</SelectItem>
  //           </SelectContent>
  //         </Select>
  //         <Input
  //           type="number"
  //           placeholder={productDiscount?.type === 'percentage' ? '0%' : '₹0'}
  //           value={productDiscount?.value || ''}
  //           onChange={(e) => {
  //             const value = parseFloat(e.target.value) || 0;
  //             if (onDiscountChange && productDiscount?.type) {
  //               onDiscountChange(productId, {
  //                 type: productDiscount.type,
  //                 value
  //               });
  //             }
  //           }}
  //           onFocus={(e) => {
  //             // Select all text when focused for easy editing
  //             e.target.select();
  //           }}
  //           onKeyDown={(e) => {
  //             // Allow only numbers, decimal point, and control keys
  //             if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
  //               e.preventDefault();
  //             }
  //           }}
  //           className="h-8 w-20 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  //           min="0"
  //           max={productDiscount?.type === 'percentage' ? 100 : undefined}
  //           step={productDiscount?.type === 'percentage' ? 0.1 : 1}
  //           autoComplete="off"
  //         />
  //       </div>
  //     );
  //   },
  // },
  {
    id: 'total',
    header: 'Total',
    cell: ({ row }) => {
      const price = row.getValue('price') as number;
      const quantity = row.getValue('quantity') as number;
      const isFreeProduct = row.original.isFreeProduct;
      const isDiscountedProduct = row.original.isDiscountedProduct;
      const productDiscount = row.original.productDiscount;
      const finalPrice = (row.original as any).finalPrice; // finalPrice for product-level discounts

      // If it's a free product with discount, show the calculated total
      if (isFreeProduct && isDiscountedProduct) {
        const total = price * quantity;
        return `₹${total.toFixed(2)}`;
      }

      // If it's a completely free product, show Free badge
      if (isFreeProduct) {
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Free</Badge>;
      }

      // For product-level discounts (added from scheme or applied to existing product)
      if (isDiscountedProduct && !isFreeProduct && ((row.original as any).addedFromSchemeId || (row.original as any).discountedBySchemeId)) {
        // finalPrice from API is already the TOTAL for the quantity in cart, not per unit
        // So we use it directly without multiplying by quantity
        if (finalPrice !== undefined && finalPrice > 0) {
          return `₹${finalPrice.toLocaleString()}`;
        }
        // Fallback: if finalPrice is not set, calculate it from unitPrice and discount
        // Calculate per-unit final price, then multiply by quantity
        const unitPrice = price; // price should be unitPrice for discounted products
        const discountValue = productDiscount?.value || 0;
        let calculatedFinalPricePerUnit = unitPrice;
        if (productDiscount?.type === 'percentage') {
          calculatedFinalPricePerUnit = unitPrice - (unitPrice * discountValue / 100);
        } else if (productDiscount?.type === 'fixed') {
          calculatedFinalPricePerUnit = Math.max(0, unitPrice - discountValue);
        }
        const total = calculatedFinalPricePerUnit * quantity;
        return `₹${total.toLocaleString()}`;
      }

      // Calculate base total
      const baseTotal = price * quantity;

      // Apply product discount if exists
      let discountAmount = 0;
      if (productDiscount) {
        if (productDiscount.type === 'percentage') {
          discountAmount = (baseTotal * productDiscount.value) / 100;
        } else {
          discountAmount = Math.min(productDiscount.value, baseTotal);
        }
      }

      const finalTotal = baseTotal - discountAmount;
      return `₹${finalTotal.toLocaleString()}`;
    },
  },
];
