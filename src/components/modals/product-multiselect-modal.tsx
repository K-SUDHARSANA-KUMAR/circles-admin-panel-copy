import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { productsApi } from '@/features/dashboard/products/api/products';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';

interface ProductMultiSelectModalProps {
  open: boolean;
  selectedProductIds: string[];
  onChange: (ids: string[]) => void;
  currentPrices?: Record<string, number>; // Map of productId to currentPrice
  onCurrentPriceChange?: (productId: string, price: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  maxSelection?: number; // Maximum number of products that can be selected
}

const DEFAULT_MAX_SELECTION = Infinity; // No limit on product selection

// Memoized price input component to prevent re-renders
const ModalPriceInput = memo<{
  productId: string;
  value: number | string;
  onChange: (productId: string, price: number) => void;
}>(({ productId, value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when external value changes
  useEffect(() => {
      setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    const price = parseFloat(localValue as string) || 0;
    onChange(productId, price);
  }, [productId, localValue, onChange]);

  return (
    <Input
      type="number"
      placeholder="Enter price"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-24"
      min="0"
      step="0.01"
    />
  );
});

ModalPriceInput.displayName = 'ModalPriceInput';

export const ProductMultiSelectModal: React.FC<ProductMultiSelectModalProps> = ({
  open,
  selectedProductIds,
  onChange,
  currentPrices = {},
  onCurrentPriceChange,
  onConfirm,
  onCancel,
  loading = false,
  maxSelection = DEFAULT_MAX_SELECTION,
}) => {
  // State for pagination and filters
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [search, setSearch] = useState('');

  // Fetch master records for filters
  const { records: brandRecords } = useMasterRecords('brand', undefined, 1, 1000, true);
  const { records: categoryRecords } = useMasterRecords('category', undefined, 1, 1000, true);
  const { records: subcategoryRecords } = useMasterRecords('subcategory', undefined, 1, 1000, true);

  // Create stable lookup maps
  const brandLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    if (brandRecords?.data) {
      brandRecords.data.forEach((record: any) => {
        lookup[record.brandId] = record.brandName || record.name || record.brandId;
      });
    }
    return lookup;
  }, [brandRecords?.data]);

  const categoryLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    if (categoryRecords?.data) {
      categoryRecords.data.forEach((record: any) => {
        lookup[record.categoryId] = record.categoryName || record.name || record.categoryId;
      });
    }
    return lookup;
  }, [categoryRecords?.data]);

  const subcategoryLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    if (subcategoryRecords?.data) {
      subcategoryRecords.data.forEach((record: any) => {
        lookup[record.subcategoryId] = record.subcategoryName || record.name || record.subcategoryId;
      });
    }
    return lookup;
  }, [subcategoryRecords?.data]);

  // Reset filters ONLY when modal opens, not when selections change
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setSelectedBrandId('');
      setSelectedCategoryId('');
      setSelectedSubcategoryId('');
      setSearch('');
    }
  }, [open]); // Only depend on open, not selectedProductIds

  // Memoize pagination object
  const initialPagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  // Fetch products query - DOES NOT depend on selectedProductIds
  const productsQuery = useQuery({
    queryKey: [
      'products-modal',
      pageIndex,
      pageSize,
      selectedBrandId,
      selectedCategoryId,
      selectedSubcategoryId,
      search,
    ],
    queryFn: async () => {
      const params: any = {
        skip: pageIndex * pageSize,
        limit: pageSize,
      };
      if (selectedBrandId) params.brandId = selectedBrandId;
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      if (selectedSubcategoryId) params.subcategoryId = selectedSubcategoryId;
      if (search) params.search = search;
      return await productsApi.getAll(params);
    },
    enabled: open,
  });

  // Stable products data
  const products = useMemo(() => {
    return productsQuery.data?.data?.items || [];
  }, [productsQuery.data?.data?.items]);

  const totalItems = productsQuery.data?.data?.totalItems || 0;
  const totalPages = productsQuery.data?.data?.totalPages || 0;

  // Separate query for selected product info (only runs when needed and optimized)
  const selectedProductsInfoQuery = useQuery({
    queryKey: ['modal-selected-products-info', selectedProductIds],
    queryFn: async () => {
      if (selectedProductIds.length === 0) {
        return { data: { items: [] } };
      }
      try {
        const response = await productsApi.getAll({ nonPaginated: true });
        if (response?.data?.items) {
          const filteredProducts = response.data.items.filter((product: any) => 
            selectedProductIds.includes(product.productId || product._id || product.id)
          );
          return { data: { items: filteredProducts } };
        }
        return { data: { items: [] } };
      } catch (error) {
        console.error('Error fetching selected product information:', error);
        throw error;
      }
    },
    enabled: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache product info
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });

  const selectedProductsInfo = useMemo(() => 
    selectedProductsInfoQuery.data?.data?.items || [], 
    [selectedProductsInfoQuery.data?.data?.items]
  );

  // Stable derived values
  const currentPageProductIds = useMemo(() => 
    products.map((product: any) => 
      product.productId || product._id || product.id
    ).filter(Boolean), 
    [products]
  );

  const allCurrentPageSelected = useMemo(() => 
    currentPageProductIds.length > 0 &&
    currentPageProductIds.every((productId: string) => selectedProductIds.includes(productId)), 
    [currentPageProductIds, selectedProductIds]
  );

  const isSelectionLimitReached = useMemo(() => 
    selectedProductIds.length >= maxSelection, 
    [selectedProductIds.length, maxSelection]
  );

  // Stable event handlers
  const handleSelectAllCurrentPage = useCallback((checked: boolean) => {
    if (checked) {
      const newProductsToAdd = currentPageProductIds.filter(
        (productId: string) => !selectedProductIds.includes(productId)
      );
      if (selectedProductIds.length + newProductsToAdd.length <= maxSelection) {
        onChange([...selectedProductIds, ...newProductsToAdd]);
      }
    } else {
      const newSelectedIds = selectedProductIds.filter(
        (productId: string) => !currentPageProductIds.includes(productId)
      );
      onChange(newSelectedIds);
    }
  }, [selectedProductIds, currentPageProductIds, onChange, maxSelection]);

  const handleProductSelection = useCallback((productId: string, checked: boolean) => {
    if (checked) {
      if (selectedProductIds.length < maxSelection) {
        onChange([...selectedProductIds, productId]);
      }
    } else {
      onChange(selectedProductIds.filter((id) => id !== productId));
    }
  }, [selectedProductIds, onChange, maxSelection]);

  const handlePriceChange = useCallback((productId: string, price: number) => {
    onCurrentPriceChange?.(productId, price);
  }, [onCurrentPriceChange]);

  const handlePaginationChange = useCallback(({ pageIndex: newPageIndex, pageSize: newPageSize }: { pageIndex: number; pageSize?: number }) => {
    setPageIndex(newPageIndex);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
  }, [pageSize]);

  // Stable columns definition
  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allCurrentPageSelected}
          onCheckedChange={handleSelectAllCurrentPage}
          aria-label="Select all"
          disabled={isSelectionLimitReached && !allCurrentPageSelected}
        />
      ),
      cell: ({ row }: any) => {
        const productId = row.original.productId || row.original._id || row.original.id;
        if (!productId) return null;
        const isSelected = selectedProductIds.includes(productId);
        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleProductSelection(productId, !!checked)}
            aria-label="Select row"
            disabled={isSelectionLimitReached && !isSelected}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'productName',
      accessorKey: 'productName',
      header: 'Product Name',
      cell: ({ row }: any) => (
        <div className="font-medium">{row.getValue('productName')}</div>
      ),
    },
    {
      id: 'skuCode',
      accessorKey: 'skuCode',
      header: 'SKU Code',
      cell: ({ row }: any) => (
        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
          {row.getValue('skuCode')}
        </div>
      ),
    },
    {
      id: 'brandId',
      accessorKey: 'brandId',
      header: 'Brand',
      cell: ({ row }: any) => {
        const brandId = row.getValue('brandId');
        return brandLookup[brandId] || brandId || '-';
      },
    },
    {
      id: 'categoryId',
      accessorKey: 'categoryId',
      header: 'Category',
      cell: ({ row }: any) => {
        const categoryId = row.getValue('categoryId');
        return categoryLookup[categoryId] || categoryId || '-';
      },
    },
    {
      id: 'mrp',
      accessorKey: 'mrp',
      header: 'MRP',
      cell: ({ row }: any) => {
        const mrp = row.getValue('mrp');
        return mrp ? `₹${mrp}` : '-';
      },
    },
    {
      id: 'currentPrice',
      accessorKey: 'currentPrice',
      header: 'Current Price',
      cell: ({ row }: any) => {
        const productId = row.original.productId || row.original._id || row.original.id;
        const currentPrice = currentPrices[productId] || '';
        return (
          <ModalPriceInput
            productId={productId}
            value={currentPrice}
            onChange={handlePriceChange}
          />
        );
      },
    },
  ], [
    allCurrentPageSelected,
    handleSelectAllCurrentPage,
    isSelectionLimitReached,
    selectedProductIds,
    handleProductSelection,
    brandLookup,
    categoryLookup,
    currentPrices,
    handlePriceChange,
  ]);

  const isLoading = productsQuery.isLoading;
  const error = productsQuery.error;

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Select Products</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          {/* Filters Section */}
          <div className="flex-shrink-0 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Brand</label>
                <MasterRecordSelect
                  masterName="brand"
                  value={selectedBrandId}
                  onChange={setSelectedBrandId}
                  placeholder="Select brand"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
                <MasterRecordSelect
                  masterName="category"
                  value={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                  placeholder="Select category"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Subcategory</label>
                <MasterRecordSelect
                  masterName="subcategory"
                  value={selectedSubcategoryId}
                  onChange={setSelectedSubcategoryId}
                  placeholder="Select subcategory"
                />
              </div>
            </div>

            {/* Selection Status */}
            <div className="text-sm text-gray-600">
              {selectedProductIds.length > 0
                ? `${selectedProductIds.length} product(s) selected`
                : 'No products selected'}
              {isSelectionLimitReached && (
                <span className="ml-2 text-orange-600 font-medium">
                  (Maximum {maxSelection} products allowed)
                </span>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="mt-4 min-h-0 flex-1">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading products..." />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError text={typeof error === 'string' ? error : error?.message || 'Error'} />
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                No products found for selected filters.
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <DataTable
                  columns={columns}
                  data={products}
                  pageCount={totalPages}
                  totalItems={totalItems}
                  onPaginationChange={handlePaginationChange}
                  manualPagination
                  initialPagination={initialPagination}
                  isLoading={isLoading}
                  tableId="product-multiselect-modal-table"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-background flex justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading || selectedProductIds.length === 0}
            title={selectedProductIds.length === 0 ? "Please select at least one product" : ""}
          >
            {loading ? 'Confirming...' : `Confirm Selection (${selectedProductIds.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
