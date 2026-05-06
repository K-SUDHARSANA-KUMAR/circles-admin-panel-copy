'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatWithLeadingZero } from '@/lib/utils';

export interface SchemeProductRow {
  sNo: string;
  brand: string;
  category: string;
  subCategory: string;
  product: string;
  type: string;
  min: string;
  max: string;
  onDelete?: (index: number) => void;
  onChange?: (field: string, value: string, index: number) => void;
  index?: number;
}

interface ColumnOptions {
  brands: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; value: string }>;
  subCategories: Array<{ label: string; value: string }>;
  products: Array<{ label: string; value: string }>;
  types: Array<{ label: string; value: string }>;
}

export const createSchemeProductColumns = (
  options: ColumnOptions
): ColumnDef<SchemeProductRow>[] => [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(row.index + 1),
  },
  {
    accessorKey: 'brand',
    header: 'Brand',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <Input
          value={rowData.brand}
          placeholder="Enter brand"
          onChange={(e) =>
            rowData.onChange?.('brand', e.target.value, rowData.index || 0)
          }
          className="min-w-[120px]"
        />
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <div className="min-w-[150px]">
          <Select
            value={rowData.category}
            onValueChange={(value: string) =>
              rowData.onChange?.('category', value, rowData.index || 0)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {options.categories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    accessorKey: 'subCategory',
    header: 'Sub Category',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <div className="min-w-[150px]">
          <Select
            value={rowData.subCategory}
            onValueChange={(value: string) =>
              rowData.onChange?.('subCategory', value, rowData.index || 0)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Sub Category" />
            </SelectTrigger>
            <SelectContent>
              {options.subCategories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    accessorKey: 'product',
    header: 'Product',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <div className="min-w-[150px]">
          <Select
            value={rowData.product}
            onValueChange={(value: string) =>
              rowData.onChange?.('product', value, rowData.index || 0)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              {options.products.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <div className="min-w-[120px]">
          <Select
            value={rowData.type}
            onValueChange={(value: string) =>
              rowData.onChange?.('type', value, rowData.index || 0)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {options.types.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    accessorKey: 'min',
    header: 'Min',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <Input
          value={rowData.min}
          placeholder="Min"
          type="number"
          onChange={(e) =>
            rowData.onChange?.('min', e.target.value, rowData.index || 0)
          }
          className="min-w-[80px]"
        />
      );
    },
  },
  {
    accessorKey: 'max',
    header: 'Max',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <Input
          value={rowData.max}
          placeholder="Max"
          type="number"
          onChange={(e) =>
            rowData.onChange?.('max', e.target.value, rowData.index || 0)
          }
          className="min-w-[80px]"
        />
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const rowData = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => rowData.onDelete?.(rowData.index || 0)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
