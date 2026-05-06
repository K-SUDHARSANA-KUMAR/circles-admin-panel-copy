'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  createSchemeProductColumns,
  type SchemeProductRow,
} from './scheme-products-columns';

interface SchemeProductsTableProps {
  brands: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; value: string }>;
  subCategories: Array<{ label: string; value: string }>;
  products: Array<{ label: string; value: string }>;
  types: Array<{ label: string; value: string }>;
  initialRows?: SchemeProductRow[];
  onChange?: (rows: SchemeProductRow[]) => void;
}

export function SchemeProductsTable({
  brands,
  categories,
  subCategories,
  products,
  types,
  initialRows = [],
  onChange,
}: SchemeProductsTableProps) {
  const [rows, setRows] = useState<SchemeProductRow[]>(
    initialRows.length > 0
      ? initialRows
      : [
          {
            sNo: '',
            brand: '',
            category: '',
            subCategory: '',
            product: '',
            type: '',
            min: '',
            max: '',
          },
        ]
  );

  const handleChange = (field: string, value: string, index: number) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    };
    setRows(updatedRows);
    onChange?.(updatedRows);
  };

  const handleDeleteRow = (indexToDelete: number) => {
    if (rows.length > 1) {
      const updatedRows = rows.filter((_, i) => i !== indexToDelete);
      setRows(updatedRows);
      onChange?.(updatedRows);
    }
  };

  const handleAddRow = () => {
    const newRow: SchemeProductRow = {
      sNo: '',
      brand: '',
      category: '',
      subCategory: '',
      product: '',
      type: '',
      min: '',
      max: '',
    };
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    onChange?.(updatedRows);
  };

  const enhancedRows = rows.map((row, index) => ({
    ...row,
    index,
    onChange: handleChange,
    onDelete: handleDeleteRow,
  }));

  const columns = createSchemeProductColumns({
    brands,
    categories,
    subCategories,
    products,
    types,
  });

  return (
    <div className="space-y-4">
      <div>
        <DataTable columns={columns} data={enhancedRows}
            tableId="schems-products-table"
         />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleAddRow}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Product
      </Button>
    </div>
  );
}
