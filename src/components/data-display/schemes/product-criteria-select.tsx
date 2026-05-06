'use client';

import { useMemo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';

interface ProductCriteriaSelectProps {
  criteria: {
    brandId: string;
    categoryId: string;
    subcategoryId: string;
    productId: string;
  };
  productOptions: { value: string; label: string }[];
  products: any;
  pricingGroupProducts?: any; // Pricing group products data (when warehouses are selected)
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
  criteriaIndex?: number | string; // Index or unique ID to create unique keys for isolation
}

const ProductCriteriaSelect: React.FC<ProductCriteriaSelectProps> = ({
  criteria,
  productOptions,
  products,
  pricingGroupProducts,
  onChange,
  disabled = false,
  criteriaIndex = 0,
}) => {
  // Memoize filtered product options based on hierarchy
  const filteredProductOptions = useMemo(() => {
    if (!criteria.subcategoryId && !criteria.categoryId && !criteria.brandId) {
      return productOptions;
    }

    // Combine both pricing group products and regular products for filtering
    const allProducts = [
      ...(pricingGroupProducts?.data?.data?.items || []),
      ...(products?.data?.data?.items || []),
    ];

    return productOptions.filter((option) => {
      // Find product in either pricing group products or regular products
      const product = allProducts.find((p: any) => p.productId === option.value);
      if (!product) return false;

      const matchesBrand = !criteria.brandId || product.brandId === criteria.brandId;
      const matchesCategory = !criteria.categoryId || product.categoryId === criteria.categoryId;
      const matchesSubcategory = !criteria.subcategoryId || product.subcategoryId === criteria.subcategoryId;

      return matchesBrand && matchesCategory && matchesSubcategory;
    });
  }, [productOptions, products, pricingGroupProducts, criteria.brandId, criteria.categoryId, criteria.subcategoryId]);

  // Memoize onChange handlers to prevent unnecessary re-renders
  const handleBrandChange = useCallback((value: string) => {
    onChange('brandId', value);
  }, [onChange]);

  const handleCategoryChange = useCallback((value: string) => {
    onChange('categoryId', value);
  }, [onChange]);

  const handleSubcategoryChange = useCallback((value: string) => {
    onChange('subcategoryId', value);
  }, [onChange]);

  const handleProductChange = useCallback((value: string) => {
    onChange('productId', value);
  }, [onChange]);

  // Memoize filters to prevent unnecessary re-renders
  const categoryFilters = useMemo(() =>
    criteria.brandId ? { brandId: [criteria.brandId] } : undefined,
    [criteria.brandId]
  );

  const subcategoryFilters = useMemo(() =>
    criteria.categoryId ? { categoryId: [criteria.categoryId] } : undefined,
    [criteria.categoryId]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div>
        <Label className="mb-2">Brand</Label>
        <MasterRecordDropdown
          masterName="brand"
          value={criteria.brandId || ''}
          onChange={handleBrandChange}
          placeholder="Select Brand"
          disabled={disabled}
          instanceKey={`brand_${criteriaIndex}`}
        />
      </div>
      <div>
        <Label className="mb-2">Category</Label>
        <MasterRecordDropdown
          masterName="category"
          value={criteria.categoryId || ''}
          onChange={handleCategoryChange}
          placeholder="Select Category"
          disabled={!criteria.brandId || disabled}
          filters={categoryFilters}
          instanceKey={`category_${criteriaIndex}`}
        />
      </div>
      <div>
        <Label className="mb-2">Subcategory</Label>
        <MasterRecordDropdown
          masterName="subcategory"
          value={criteria.subcategoryId || ''}
          onChange={handleSubcategoryChange}
          placeholder="Select Subcategory"
          disabled={!criteria.categoryId || disabled}
          filters={subcategoryFilters}
          instanceKey={`subcategory_${criteriaIndex}`}
        />
      </div>
      <div>
        <Label className="mb-2">Product</Label>
        <SearchableSelect
          options={filteredProductOptions}
          value={criteria.productId || ''}
          onValueChange={handleProductChange}
          placeholder="Select Product"
          searchPlaceholder="Search products..."
          disabled={!criteria.subcategoryId || disabled}
        />
      </div>
    </div>
  );
};

export default ProductCriteriaSelect;

