'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  createSchemeDiscountColumns,
  type SchemeDiscountRow,
} from './scheme-discounts-columns';

interface SchemeDiscountsTableProps {
  brands: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; value: string }>;
  subCategories: Array<{ label: string; value: string }>;
  products: Array<{ label: string; value: string }>;
  types: Array<{ label: string; value: string }>;
  initialRows?: SchemeDiscountRow[];
  onChange?: (rows: SchemeDiscountRow[]) => void;
}

export function SchemeDiscountsTable({
  brands,
  categories,
  subCategories,
  products,
  types,
  initialRows = [],
  onChange,
}: SchemeDiscountsTableProps) {
  const [rows, setRows] = useState<SchemeDiscountRow[]>(
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
            discountType: '',
            discountValue: '',
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
    const newRow: SchemeDiscountRow = {
      sNo: '',
      brand: '',
      category: '',
      subCategory: '',
      product: '',
      type: '',
      discountType: '',
      discountValue: '',
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

  const columns = createSchemeDiscountColumns({
    brands,
    categories,
    subCategories,
    products,
    types,
  });

  return (
    <div className="space-y-4">
      <div>
        <DataTable
          columns={columns}
          data={enhancedRows}
          tableId="schemes-discounts-table"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleAddRow}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Discount
      </Button>
    </div>
  );
}
