'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatWithLeadingZero } from '@/lib/utils';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { Action } from '../util/types';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface Product {
  _id: string;
  skuCode: string;
  productName: string;
  brand: string;
  category: string;
  subCategory: string;
  warehouse: string;
  productImages?: Array<{ productS3Filename: string }>;
  mappings?: Array<{ warehouseId: string }>;
}

interface MasterRecordMaps {
  brandMap: Record<string, MasterRecord>;
  categoryMap: Record<string, MasterRecord>;
  subcategoryMap: Record<string, MasterRecord>;
}

export const createColumns = (
  recordMaps: MasterRecordMaps,
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<Product>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        const serialNo = formatWithLeadingZero(
          currentPage * pageSize + row.index + 1
        );
        console.log('Row:', row.index); // original row data
        console.log('Serial No:', serialNo);
        return serialNo;
      },
    },
    {
      id: 'productImage',
      header: 'Image',
      cell: ({ row }) => {
        const productImages = row.original.productImages;
        const firstImage = productImages && productImages.length > 0 
          ? productImages[0].productS3Filename 
          : null;
        
        if (firstImage) {
          return (
            <div className="flex items-center justify-center">
              <img
                src={getCloudFrontUrl(firstImage)}
                alt="Product"
                className="h-12 w-12 rounded-md object-contain"
                onError={(e) => {
                  // Fallback to a placeholder if image fails to load
                  e.currentTarget.src = '/placeholder-product.png';
                }}
              />
            </div>
          );
        }
        
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100">
            <span className="text-xs text-gray-500">No Image</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'skuCode',
      header: 'SKU Code',
    },
    {
      accessorKey: 'productName',
      header: 'Product Name',
    },
    {
      accessorKey: 'brandId',
      header: 'Brand',
      cell: ({ row }) => {
        const brandId = row.getValue('brandId') as string;
        return recordMaps?.brandMap?.[brandId]?.brandName || brandId;
      },
    },
    {
      accessorKey: 'categoryId',
      header: 'Category',
      cell: ({ row }) => {
        const categoryId = row.getValue('categoryId') as string;
        return (
          recordMaps?.categoryMap?.[categoryId]?.categoryName || categoryId
        );
      },
    },
    {
      accessorKey: 'subcategoryId',
      header: 'Sub Category',
      cell: ({ row }) => {
        const subcategoryId = row.getValue('subcategoryId') as string;
        return (
          recordMaps?.subcategoryMap?.[subcategoryId]?.subcategoryName ||
          subcategoryId
        );
      },
    },
    {
      accessorKey: 'mappings',
      header: 'Warehouse',
      cell: ({ row }) => {
        const mappings = row.getValue('mappings');
        const count = Array.isArray(mappings) ? mappings.length : 0;
        return formatWithLeadingZero(count);
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const actions = getActionsForRow(item);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) => {
                return (
                  <DropdownMenuItem
                    key={row.original.skuCode + action.title}
                    className={`border-b border-neutral-200 ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                    onClick={() => action.handleAction?.(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{action.icon}</span>
                      <span>{action.title}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ] as ColumnDef<Product>[];
};
