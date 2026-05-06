import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { productsApi } from '@/features/dashboard/products/api/products';
import { Button } from '@/components/ui/button';
import { ProductMultiSelectModal } from '@/components/modals/product-multiselect-modal';
import { DataTable } from '@/components/ui/data-table';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface ProductMultiSelectSectionProps {
  selectedProductIds: string[];
  onChange: (ids: string[]) => void;
  currentPrices?: Record<string, number>; // Map of productId to currentPrice
  onCurrentPriceChange?: (productId: string, price: number) => void;
  onCurrentPricesChange?: (prices: Record<string, number>) => void; // Batch update callback
  brandId?: string;
  categoryId?: string;
  subcategoryId?: string;
  disabled?: boolean;
  hidePaginationAndFilters?: boolean; // Hide both filters and pagination
  hideFilters?: boolean; // Hide only filters, keep pagination
  hidePagination?: boolean; // Hide only pagination, keep filters  
  maxSelection?: number; // Maximum number of products that can be selected
  showValidationErrors?: boolean; // Show validation errors for empty prices
  // New prop for pricing group products data
  pricingGroupProducts?: {
    data?: {
      totalItems: number;
      totalPages: number;
      skip: number;
      limit: number;
      items: any[];
    };
    isLoading?: boolean;
    error?: any;
  };
}

const DEFAULT_PAGE_SIZE = 10;

// Memoized price input component to prevent re-renders and focus loss
const PriceInput = memo<{
  productId: string;
  value: number | string;
  onChange: (productId: string, price: number) => void;
  disabled?: boolean;
  showValidationErrors?: boolean;
}>(({ productId, value, onChange, disabled, showValidationErrors = false }) => {
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

  // Check if field is empty or invalid
  const isEmpty = !localValue || localValue === '' || localValue === '0';
  const hasError = showValidationErrors && isEmpty;

  return (
    <div className="relative">
      <Input
        type="number"
        placeholder="Enter price *"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-24 ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
        min="0"
        step="0.01"
        disabled={disabled}
      />
      {hasError && (
        <div className="absolute -bottom-5 left-0 text-xs text-red-500">
          Required
        </div>
      )}
    </div>
  );
});

PriceInput.displayName = 'PriceInput';

export const ProductMultiSelectSection: React.FC<
  ProductMultiSelectSectionProps
> = ({
  selectedProductIds,
  onChange,
  currentPrices = {},
  onCurrentPriceChange,
  onCurrentPricesChange,
  brandId,
  categoryId,
  subcategoryId,
  disabled,
  hidePaginationAndFilters = false,
  hideFilters = false,
  hidePagination = false,
  showValidationErrors = false,
  maxSelection,
  pricingGroupProducts,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingSelectedProductIds, setPendingSelectedProductIds] =
      useState<string[]>(selectedProductIds);
    // Simplified state for current prices
    const [localCurrentPrices, setLocalCurrentPrices] = useState<Record<string, number>>(() => ({ ...currentPrices }));
    const [pendingCurrentPrices, setPendingCurrentPrices] = useState<Record<string, number>>(() => ({ ...currentPrices }));

    // Initialize pendingSelectedProductIds only when modal is not open
    useEffect(() => {
      if (!isModalOpen) {
        setPendingSelectedProductIds(selectedProductIds);
      }
    }, [selectedProductIds, isModalOpen]);

    // Sync local prices with currentPrices prop - only when actually different
    useEffect(() => {
      const hasChanges = Object.keys(currentPrices).some(key => localCurrentPrices[key] !== currentPrices[key]) ||
        Object.keys(localCurrentPrices).some(key => !currentPrices.hasOwnProperty(key));
      if (hasChanges) {
        setLocalCurrentPrices({ ...currentPrices });
      }
    }, [currentPrices, localCurrentPrices]);

    // Reset pendingCurrentPrices when modal opens
    useEffect(() => {
      if (isModalOpen) {
        setPendingCurrentPrices({ ...localCurrentPrices });
      }
    }, [isModalOpen, localCurrentPrices]);


    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

    // Reset pagination when filters change or when selected products change
    useEffect(() => {
      setPageIndex(0);
    }, [selectedBrandId, selectedCategoryId, selectedSubcategoryId, selectedProductIds.length]);

    // Determine if filters should be hidden
    const shouldHideFilters = hidePaginationAndFilters || hideFilters;
    // Determine if pagination should be hidden  
    const shouldHidePagination = hidePaginationAndFilters || hidePagination;

    // Fetch master records for brands, categories, and subcategories
    const { records: brandRecords } = useMasterRecords(
      'brand',
      undefined,
      1,
      1000,
      true
    );
    const { records: categoryRecords } = useMasterRecords(
      'category',
      undefined,
      1,
      1000,
      true
    );
    const { records: subcategoryRecords } = useMasterRecords(
      'subcategory',
      undefined,
      1,
      1000,
      true
    );

    // Create lookup maps for displaying names
    const brandLookup = useMemo(() => {
      const lookup: Record<string, string> = {};
      if (brandRecords?.data) {
        brandRecords.data.forEach((record: { brandId: string; brandName?: string; name?: string }) => {
          lookup[record.brandId] =
            record.brandName || record.name || record.brandId;
        });
      }
      return lookup;
    }, [brandRecords?.data]);

    const categoryLookup = useMemo(() => {
      const lookup: Record<string, string> = {};
      if (categoryRecords?.data) {
        categoryRecords.data.forEach((record: { categoryId: string; categoryName?: string; name?: string }) => {
          lookup[record.categoryId] =
            record.categoryName || record.name || record.categoryId;
        });
      }
      return lookup;
    }, [categoryRecords?.data]);

    const subcategoryLookup = useMemo(() => {
      const lookup: Record<string, string> = {};
      if (subcategoryRecords?.data) {
        subcategoryRecords.data.forEach((record: { subcategoryId: string; subcategoryName?: string; name?: string }) => {
          lookup[record.subcategoryId] =
            record.subcategoryName || record.name || record.subcategoryId;
        });
      }
      return lookup;
    }, [subcategoryRecords?.data]);

    // Use pricing group products data if available, otherwise fetch products by IDs
    const selectedProductsQuery = useQuery({
      queryKey: ['selected-products', selectedProductIds],
      queryFn: async () => {
        if (selectedProductIds.length === 0) {
          return { data: { items: [] } };
        }

        // If pricing group products data is available, use it
        if (pricingGroupProducts?.data?.items) {
          const filteredProducts = pricingGroupProducts.data.items.filter((product: any) =>
            selectedProductIds.includes(product.productId || product._id || product.id)
          );
          return { data: { items: filteredProducts } };
        }

        try {
          // Since there's no findByIds method in products API, we'll use getAll with filters
          const response = await productsApi.getAll({
            nonPaginated: true,
          });

          // Filter the products to only include selected ones
          if (response?.data?.items) {
            const filteredProducts = response.data.items.filter((product: any) =>
              selectedProductIds.includes(product.productId || product._id || product.id)
            );
            return { data: { items: filteredProducts } };
          }

          return { data: { items: [] } };
        } catch (error) {
          console.error('Error fetching products by IDs:', error);
          throw error;
        }
      },
      enabled: selectedProductIds.length > 0 && !pricingGroupProducts?.data?.items,
      retry: 1,
    });

    // Use pricing group products data if available, otherwise use query result
    let items: any[] = [];

    if (pricingGroupProducts?.data?.items) {
      // If we have pricing group products data, use it and filter by selected IDs
      items = pricingGroupProducts.data.items.filter((product: any) =>
        selectedProductIds.includes(product.productId || product._id || product.id)
      );
    } else if (selectedProductsQuery.data?.data?.items) {
      // If we have query results, use them and filter by selected IDs
      items = selectedProductsQuery.data.data.items.filter((product: any) =>
        selectedProductIds.includes(product.productId || product._id || product.id)
      );
    }

    // If shouldHideFilters is false (edit mode), we need to ensure all selected products are shown
    // even if they're not in the pricing group products data yet
    if (shouldHideFilters && selectedProductIds.length > 0 && items.length < selectedProductIds.length) {
      // Create placeholder items for selected products that don't exist in the data yet
      const missingProductIds = selectedProductIds.filter(selectedId =>
        !items.some((item: any) => (item.productId || item._id || item.id) === selectedId)
      );

      const placeholderItems = missingProductIds.map(productId => ({
        productId: productId,
        productName: `Product ${productId} (Loading...)`,
        skuCode: '-',
        brandId: '-',
        categoryId: '-',
        mrp: 0,
        _isPlaceholder: true
      }));

      items = [...items, ...placeholderItems];
    }

    // Fetch product information for selected products that don't have complete data
    const incompleteProductIds = items
      .filter(item => item._isPlaceholder || !item.productName || item.productName.includes('Loading...'))
      .map(item => item.productId || item._id || item.id);

    const selectedProductsInfoQuery = useQuery({
      queryKey: ['selected-products-info', incompleteProductIds],
      queryFn: async () => {
        if (incompleteProductIds.length === 0) {
          return { data: { items: [] } };
        }

        try {
          // Fetch products by IDs to get complete information
          const response = await productsApi.getAll({
            nonPaginated: true,
          });

          // Filter the products to only include the ones we need
          if (response?.data?.items) {
            const filteredProducts = response.data.items.filter((product: any) =>
              incompleteProductIds.includes(product.productId || product._id || product.id)
            );
            return { data: { items: filteredProducts } };
          }

          return { data: { items: [] } };
        } catch (error) {
          console.error('Error fetching product information:', error);
          throw error;
        }
      },
      enabled: incompleteProductIds.length > 0 && !isModalOpen,
      retry: 1,
    });

    // Merge the fetched product information with existing items
    if (selectedProductsInfoQuery.data?.data?.items) {
      const fetchedProducts = selectedProductsInfoQuery.data.data.items;

      // Replace placeholder items with actual product data
      items = items.map(item => {
        if (item._isPlaceholder || !item.productName || item.productName.includes('Loading...')) {
          const fetchedProduct = fetchedProducts.find((p: any) =>
            (p.productId || p._id || p.id) === (item.productId || item._id || item.id)
          );
          if (fetchedProduct) {
            return {
              ...fetchedProduct,
              _isPlaceholder: false
            };
          }
        }
        return item;
      });
    }
    const isLoading = pricingGroupProducts?.isLoading || selectedProductsQuery.isLoading || selectedProductsInfoQuery.isLoading;
    const error = pricingGroupProducts?.error || selectedProductsQuery.error || selectedProductsInfoQuery.error;

    // Debug: Log the items being displayed
    console.log('ProductMultiSelectSection - Items:', items);
    console.log('ProductMultiSelectSection - Selected Product IDs:', selectedProductIds);
    console.log('ProductMultiSelectSection - Pricing Group Products Data:', pricingGroupProducts?.data);

    // Filtering logic for viewing purpose only
    let filteredItems = items;
    if (selectedBrandId) {
      filteredItems = filteredItems.filter((p: any) => p.brandId === selectedBrandId);
    }
    if (selectedCategoryId) {
      filteredItems = filteredItems.filter((p: any) => p.categoryId === selectedCategoryId);
    }
    if (selectedSubcategoryId) {
      filteredItems = filteredItems.filter((p: any) => p.subcategoryId === selectedSubcategoryId);
    }

    // Simplified price change handler
    const handlePriceChangeForTable = useCallback((productId: string, price: number) => {
      console.log('Price change for table:', productId, price);
      // Update local state immediately
      setLocalCurrentPrices(prev => {
        if (prev[productId] === price) return prev;
        return { ...prev, [productId]: price };
      });
      // Notify parent immediately
      onCurrentPriceChange?.(productId, price);
    }, [onCurrentPriceChange]);

    // Table columns - memoized to prevent re-creation on every render
    const columns = useMemo(() => [
      {
        id: 'sno',
        header: 'S.No',
        cell: ({ row }: any) =>
          shouldHidePagination
            ? row.index + 1
            : pageIndex * pageSize + row.index + 1,
      },
      {
        id: 'productImage',
        header: 'Image',
        cell: ({ row }: any) => {
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
        accessorKey: 'productName',
        header: 'Product Name',
        cell: ({ row }: any) =>
          row.original._isPlaceholder ? '' : row.original.productName,
      },
      {
        accessorKey: 'skuCode',
        header: 'SKU Code',
        cell: ({ row }: any) =>
          row.original._isPlaceholder ? '' : row.original.skuCode,
      },
      {
        accessorKey: 'brandId',
        header: 'Brand',
        cell: ({ row }: any) => {
          const brandId = row.original.brandId;
          return brandLookup[brandId] || brandId || '-';
        },
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }: any) => {
          const categoryId = row.original.categoryId;
          return categoryLookup[categoryId] || categoryId || '-';
        },
      },
      {
        accessorKey: 'mrp',
        header: 'MRP',
        cell: ({ row }: any) => {
          const mrp = row.original.mrp;
          return mrp ? `₹${mrp}` : '-';
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: any) => {
          const status = row.original.status;
          if (!status) return '-';
          return renderStatusBadge(status, StatusType.PRODUCT);
        },
      },
      {
        accessorKey: 'currentPrice',
        header: 'Group Price',
        cell: ({ row }: any) => {
          const productId = row.original.productId || row.original._id || row.original.id;
          const pricingGroup = row.original.pricingGroup;

          // Get current price from various sources (priority: localCurrentPrices > currentPrices > pricingGroup)
          let currentPrice: number | string = localCurrentPrices[productId] ?? '';

          // If we have pricing group data with price and no local price, use pricing group price
          if (!currentPrice && pricingGroup && Array.isArray(pricingGroup) && pricingGroup.length > 0) {
            const priceInfo = pricingGroup[0]; // Get the first pricing group info
            currentPrice = priceInfo.price || '';
          }

          return (
            <PriceInput
              productId={productId}
              value={currentPrice}
              onChange={handlePriceChangeForTable}
              disabled={disabled}
              showValidationErrors={showValidationErrors}
            />
          );
        },
      },
    ], [brandLookup, categoryLookup, pageIndex, pageSize, shouldHidePagination, handlePriceChangeForTable, disabled, localCurrentPrices]);

    // Paginate products for table (only if pagination is not hidden)
    const paginatedProducts = shouldHidePagination ? filteredItems : filteredItems.slice(
      pageIndex * pageSize,
      (pageIndex + 1) * pageSize
    );

    // Table pagination handler
    const handlePaginationChange = ({ pageIndex: newPageIndex, pageSize: newPageSize }: { pageIndex: number; pageSize?: number }) => {
      setPageIndex(newPageIndex);
      if (newPageSize && newPageSize !== pageSize) {
        setPageSize(newPageSize);
      }
    };

    return (
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Map Products
        </div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {items.length > 0
              ? `Selected products: ${items.length}`
              : 'No products selected'}
          </div>
          <Button
            type="button"
            onClick={() => {
              console.log('Button clicked - Opening modal with selectedProductIds:', selectedProductIds);
              setPendingSelectedProductIds([...selectedProductIds]);
              setPendingCurrentPrices({ ...localCurrentPrices });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2"
            disabled={disabled || selectedProductsQuery.isLoading}
          >
            {selectedProductsQuery.isLoading
              ? 'Loading Products...'
              : items.length > 0
                ? 'Update Products'
                : 'Add Products'}
          </Button>
        </div>

        {/* Filters Section */}
        {!shouldHideFilters && (
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Brand
              </label>
              <MasterRecordDropdown
                masterName="brand"
                value={selectedBrandId}
                onChange={setSelectedBrandId}
                placeholder="Select brand"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Category
              </label>
              <MasterRecordDropdown
                masterName="category"
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                placeholder="Select category"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Subcategory
              </label>
              <MasterRecordDropdown
                masterName="subcategory"
                value={selectedSubcategoryId}
                onChange={setSelectedSubcategoryId}
                placeholder="Select subcategory"
                className="w-full"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loading text="Loading selected products..." />
          </div>
        ) : error ? (
          <div className="flex h-32 items-center justify-center">
            <GenericError
              text={typeof error === 'string' ? error : error?.message || 'Error'}
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            No products found for selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {shouldHideFilters
                ? 'Mapped Products'
                : 'Selected Products'}
            </div>
            <DataTable
              columns={columns}
              data={paginatedProducts}
              pageCount={Math.ceil(filteredItems.length / pageSize)}
              totalItems={filteredItems.length}
              onPaginationChange={
                shouldHidePagination
                  ? undefined
                  : handlePaginationChange
              }
              manualPagination={!shouldHidePagination}
              initialPagination={
                shouldHidePagination
                  ? undefined
                  : { pageIndex, pageSize }
              }
              isLoading={isLoading}
              hidePagination={shouldHidePagination}
              tableId="product-section-table"
            />
          </div>
        )}

        {/* Modal for product selection */}
        <ProductMultiSelectModal
          open={isModalOpen}
          selectedProductIds={pendingSelectedProductIds}
          onChange={(newIds) => {
            setPendingSelectedProductIds(newIds);
          }}
          currentPrices={pendingCurrentPrices}
          onCurrentPriceChange={(productId: string, price: number) => {
            setPendingCurrentPrices(prev => {
              if (prev[productId] === price) return prev;
              return { ...prev, [productId]: price };
            });
          }}
          onCancel={() => setIsModalOpen(false)}
          onConfirm={() => {
            console.log('Modal confirmed - Selected Product IDs:', pendingSelectedProductIds);
            onChange(pendingSelectedProductIds);
            setLocalCurrentPrices({ ...pendingCurrentPrices });
            if (onCurrentPricesChange) {
              onCurrentPricesChange(pendingCurrentPrices);
            } else if (onCurrentPriceChange) {
              Object.entries(pendingCurrentPrices).forEach(([productId, price]) => {
                onCurrentPriceChange(productId, price);
              });
            }
            setIsModalOpen(false);
          }}
          maxSelection={maxSelection}
        />
      </div>
    );
  };
