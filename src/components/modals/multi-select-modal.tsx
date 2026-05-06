'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { PaginationState } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import { useBrands, useCategories, useSubcategories } from '@/features/master-managment/hooks/useMasterRecords';
import { useProducts, usePricingGroupProducts } from '@/features/dashboard/products/hooks/useProducts';

export interface Option {
  label: string;
  value: string;
}

interface MultiSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  options: Option[];
  value: Option[];
  onChange: (value: Option[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  maxSelections?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  onPaginationChange?: (pagination: PaginationState) => void;
  manualPagination?: boolean;
  initialPagination?: PaginationState;
  nonPaginated?: boolean;
  dataType?: 'outlets' | 'brands' | 'categories' | 'subcategories' | 'products';
  outletWarehouseIds?: string[];
  filters?: Record<string, string[]>;
}

export const MultiSelectModal = ({
  open,
  onOpenChange,
  title,
  description,
  options = [],
  value = [],
  onChange,
  placeholder = "Search and select items...",
  isLoading = false,
  disabled = false,
  maxSelections,
  pageSize = 10,
  totalItems = 0,
  totalPages = 0,
  onPaginationChange,
  manualPagination = false,
  initialPagination = { pageIndex: 0, pageSize: 10 },
  nonPaginated = false,
  dataType,
  outletWarehouseIds = [],
  filters,
}: MultiSelectModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(value);
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [initialSort, setInitialSort] = useState(false); // Only enable special sort during active search

  // Dynamic data sources
  const isOutletData = dataType === 'outlets';
  const isBrandData = dataType === 'brands';
  const isCategoryData = dataType === 'categories';
  const isSubcategoryData = dataType === 'subcategories';
  const isProductData = dataType === 'products';

  const outletsQuery = useOutlets(
    isOutletData
      ? {
        search: searchTerm,
        enabled: open && outletWarehouseIds.length > 0,
        nonPaginated: true,
        warehouseId:
          outletWarehouseIds.length > 0
            ? JSON.stringify(outletWarehouseIds)
            : undefined,
      }
      : { enabled: false }
  ).outlets;

  const brandsQuery = useBrands(
    undefined,
    isBrandData && filters ? filters : undefined
  );

  const categoriesQuery = useCategories(
    undefined,
    isCategoryData && filters ? filters : undefined
  );

  const subcategoriesQuery = useSubcategories(
    undefined,
    isSubcategoryData && filters ? filters : undefined
  );

  // Use pricing group products API when warehouseIds are available, otherwise use regular products API
  const hasWarehouseFilter = filters?.warehouseId && (
    Array.isArray(filters.warehouseId) ? filters.warehouseId.length > 0 : true
  );
  
  const warehouseIds = hasWarehouseFilter 
    ? (Array.isArray(filters.warehouseId) ? filters.warehouseId : [filters.warehouseId])
    : [];

  const pricingGroupProductsQuery = usePricingGroupProducts({
    warehouseIds: warehouseIds,
    enabled: isProductData && open && hasWarehouseFilter,
    skip: isProductData && hasWarehouseFilter ? pagination.pageIndex * pagination.pageSize : undefined,
    limit: isProductData && hasWarehouseFilter ? pagination.pageSize : undefined,
    search: isProductData && hasWarehouseFilter && searchTerm ? searchTerm : undefined,
  });

  const productsQuery = useProducts(
    isProductData && !hasWarehouseFilter ? {
      enabled: open,
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
      search: searchTerm,
      ...(filters?.brandId && filters.brandId.length > 0 && { brandId: filters.brandId }),
      ...(filters?.categoryId && filters.categoryId.length > 0 && { categoryId: filters.categoryId }),
      ...(filters?.subcategoryId && filters.subcategoryId.length > 0 && { subcategoryId: filters.subcategoryId }),
    } : { enabled: false }
  );

  // Use pricing group products if available, otherwise use regular products
  const activeProductsQuery = hasWarehouseFilter ? pricingGroupProductsQuery : productsQuery;

  const runtimeOptions: Option[] = isOutletData
    ? (outletsQuery.data?.data?.items || []).map((outlet: any) => ({
      label: `${outlet.outletName} (${outlet.outletId})`,
      value: outlet.outletId,
    }))
    : isBrandData
      ? (brandsQuery.records.data || []).map((brand: any) => ({
        label: brand.brandName,
        value: brand.brandId,
      }))
      : isCategoryData
        ? (categoriesQuery.records.data || []).map((category: any) => ({
          label: category.categoryName,
          value: category.categoryId,
        }))
        : isSubcategoryData
          ? (subcategoriesQuery.records.data || []).map((subcategory: any) => ({
            label: subcategory.subcategoryName || subcategory.subcategoryname,
            value: subcategory.subcategoryId,
          }))
    : isProductData
    ? // Use pricing group products if available, otherwise use regular products
      hasWarehouseFilter
        ? (pricingGroupProductsQuery.data?.data?.items || []).map((product: any) => ({
            label: `${product.productName} (${product.skuCode})`,
            value: product.productId,
          }))
        : (productsQuery.products.data?.data?.items && productsQuery.products.data.data.items.length > 0)
          ? (productsQuery.products.data.data.items || []).map((product: any) => ({
              label: `${product.productName} (${product.skuCode})`,
              value: product.productId,
            }))
          : options.length > 0 
            ? options 
            : []
    : options;

  const runtimeIsLoading = isOutletData
    ? !!outletsQuery.isLoading
    : isBrandData
      ? !!brandsQuery.records.isLoading
      : isCategoryData
        ? !!categoriesQuery.records.isLoading
        : isSubcategoryData
          ? !!subcategoriesQuery.records.isLoading
          : isProductData
            ? (hasWarehouseFilter ? !!pricingGroupProductsQuery.isLoading : !!productsQuery.products.isLoading)
            : isLoading;

  useEffect(() => {
    setSelectedOptions(value);
    // Do not reorder on open; preserve original list order
    if (open) {
      setInitialSort(false);
    }
  }, [value, open]);

  useEffect(() => {
    setPagination(initialPagination);
  }, [initialPagination]);

  // Reset pagination when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    // Only enable special sort when actively searching
    setInitialSort(!!searchTerm);
  }, [searchTerm]);

  // For products with server-side pagination, don't filter client-side - API handles search
  // For other data types, filter client-side
  const filteredOptions = isProductData
    ? runtimeOptions // API already filtered, no client-side filtering needed
    : (runtimeOptions || []).filter(option =>
        (option?.label ?? '').toString().toLowerCase().includes((searchTerm ?? '').toString().toLowerCase())
      );

  // Separate selected and unselected options
  const selectedValues = new Set((selectedOptions || []).map(opt => opt.value));

  const selectedFilteredOptions = filteredOptions.filter(option => selectedValues.has(option.value));
  const unselectedFilteredOptions = filteredOptions.filter(option => !selectedValues.has(option.value));

  // Only sort with selected items first when search is active
  // Otherwise, maintain the original order to prevent jumping
  const sortedOptions = initialSort
    ? [...selectedFilteredOptions, ...unselectedFilteredOptions]
    : filteredOptions;

  // Server-side pagination for products, frontend pagination for other data types
  const startIndex = pagination.pageIndex * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const paginatedOptions = isProductData
    ? runtimeOptions // Use API response directly for products (server-side paginated)
    : (sortedOptions || []).slice(startIndex, endIndex); // Frontend pagination for other data

  const handleItemSelect = (itemValue: string, isSelected: boolean) => {
    if (disabled) return;
    const option = (runtimeOptions || []).find(opt => opt.value === itemValue);
    if (!option) return;

    if (maxSelections && !isSelected && selectedOptions.length >= maxSelections) {
      return; // Don't allow more selections than max
    }

    // Disable initial sort after first interaction to prevent jumping
    setInitialSort(false);

    setSelectedOptions(prev =>
      isSelected
        ? [...prev, option]
        : prev.filter(opt => opt.value !== itemValue)
    );
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (disabled) return;
    if (maxSelections && isSelected && sortedOptions.length > maxSelections) {
      return; // Don't allow selecting all if it exceeds max
    }

    setSelectedOptions(prev => {
      const currentSelectedValues = prev.map(opt => opt.value);
      const newSelected = isSelected
        ? [...prev, ...sortedOptions.filter(opt => !currentSelectedValues.includes(opt.value))]
        : prev.filter(opt => !sortedOptions.some(filteredOpt => filteredOpt.value === opt.value));
      return newSelected;
    });
  };

  const handleConfirm = () => {
    if (disabled) {
      onOpenChange(false);
      setSearchTerm('');
      setInitialSort(true);
      return;
    }
    onChange?.(selectedOptions);

    onOpenChange(false);
    setSearchTerm('');
    setInitialSort(false); // Keep original order for next open
  };

  const handleCancel = () => {
    setSelectedOptions(value || []); // Reset to original value

    setSearchTerm('');
    setInitialSort(false); // Keep original order on cancel
    onOpenChange(false);
  };

  const removeSelection = (optionToRemove: Option) => {
    setSelectedOptions(prev => prev.filter(option => option.value !== optionToRemove.value));
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
    onPaginationChange?.(newPagination);
  };

  // Create columns for the DataTable
  const columns: ColumnDef<Option>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={sortedOptions.length > 0 && sortedOptions.every(option =>
            selectedOptions.some(selected => selected.value === option.value)
          )}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
          disabled={disabled}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedOptions.some(selected => selected.value === row.original.value)}
          onCheckedChange={(checked) => handleItemSelect(row.original.value, !!checked)}
          aria-label="Select row"
          disabled={disabled}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => {
        // Find the original index in sortedOptions
        const originalIndex = sortedOptions.findIndex(option => option.value === row.original.value);
        return formatWithLeadingZero(originalIndex + 1);
      },
    },
    {
      accessorKey: 'label',
      header: 'Name',
      cell: ({ row }) => {
        const isSelected = selectedOptions.some(selected => selected.value === row.original.value);
        return (
          <div
            className={`font-medium cursor-pointer hover:text-primary transition-colors flex items-center gap-2 ${isSelected ? 'text-primary' : ''
              }`}
            onClick={() => handleItemSelect(row.original.value, !isSelected)}
          >
            {row.original.label}
          </div>
        );
      },
    },
    // ID Column - Commented out as per requirement
    // Uncomment this column if you need to show IDs in the modal
    // {
    //   accessorKey: 'value',
    //   header: 'ID',
    //   cell: ({ row }) => {
    //     const isSelected = selectedOptions.some(selected => selected.value === row.original.value);
    //     return (
    //       <div 
    //         className={`cursor-pointer hover:text-primary transition-colors ${
    //           isSelected ? 'text-primary' : 'text-muted-foreground'
    //         }`}
    //         onClick={() => handleItemSelect(row.original.value, !isSelected)}
    //       >
    //         {row.original.value}
    //       </div>
    //     );
    //   },
    // },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="text-lg font-medium">{title}</div>
              {description && (
                <div className="text-sm font-normal text-zinc-500">
                  {description}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          {/* Search Input */}
          <SearchInput
            placeholder={placeholder}
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-full flex-shrink-0"
          />

          {/* No Results Message */}
          {searchTerm && sortedOptions.length === 0 && (
            <div className="flex items-center justify-center text-sm text-muted-foreground mt-4 mb-4 py-8">
              <div className="text-center">
                <p className="font-medium">No items found</p>
                <p>Try adjusting your search term</p>
              </div>
            </div>
          )}

          {/* DataTable */}
          <div className="flex-1 min-h-0 mt-2">
            <div className="h-full overflow-auto border rounded-md [&_tr]:cursor-pointer [&_tr:hover]:bg-muted/50 [&_tr]:transition-colors">
              <DataTable
                columns={columns}
                data={paginatedOptions}
                pageCount={isProductData
                  ? (hasWarehouseFilter 
                      ? pricingGroupProductsQuery.data?.data?.totalPages || 0
                      : productsQuery.products.data?.data?.totalPages || 0)
                  : Math.ceil(sortedOptions.length / pagination.pageSize)
                }
                totalItems={isProductData
                  ? (hasWarehouseFilter 
                      ? pricingGroupProductsQuery.data?.data?.totalItems || 0
                      : productsQuery.products.data?.data?.totalItems || 0)
                  : sortedOptions.length
                }
                onPaginationChange={handlePaginationChange}
                manualPagination={true}
                initialPagination={pagination}
                isLoading={runtimeIsLoading}
                loadingText="Loading options..."
                tableId="multiselect-modal-table"
                isColumnDisplay={false}
                isDownload={false}
              />
            </div>
          </div>
        </div>

        {/* Modal Actions - Fixed at Bottom */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {disabled ? 'Close' : 'Confirm Selection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 