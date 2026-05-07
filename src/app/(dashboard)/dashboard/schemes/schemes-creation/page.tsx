'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X, Info } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCreateScheme,
  useUpdateScheme,
  useScheme,
} from '@/features/dashboard/schemes/hooks/useSchemes';
import { PaginationState } from '@tanstack/react-table';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { generateCriteriaId } from '@/utils/id-utils';
import { Badge } from '@/components/ui/badge';
import { MultiSelectModal } from '@/components/modals/multi-select-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useProducts, usePricingGroupProducts } from '@/features/dashboard/products/hooks/useProducts';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import { useBrands, useCategories, useSubcategories, useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { ApprovalStatusEnum, SchemeStatusEnum } from '@/constants/enums/scheme.enums';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NavKeys from '@/constants/navkeys';
import ProductCriteriaSelect from '@/components/data-display/schemes/product-criteria-select';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';


const formatAggregationBasis = (basis?: string) => {
  if (basis === 'amount') {
    return 'Amount Based';
  }
  if (basis === 'quantity') {
    return 'Quantity Based';
  }
  return basis || 'Not specified';
};

const formatUom = (uom?: string) => {
  if (!uom) {
    return 'Not specified';
  }
  const labels: Record<string, string> = {
    pcs: 'PCS',
    kg: 'KG',
    bag: 'Bag',
    pockets: 'Pockets',
  };
  return labels[uom as keyof typeof labels] || uom;
};

// Format UOM with optional denominator (for reference)
const formatUomWithDenominator = (uom?: string, denominator?: number | string) => {
  const base = formatUom(uom);
  if (!denominator) return base;
  return `${base} (${denominator})`;
};

// Try to find a denominator for a given uom inside a product object
const findDenominatorForUomInProduct = (product: any, uom: string): number | null => {
  if (!product || !uom) return null;
  // Check unitPerCase entries
  if (Array.isArray(product.unitPerCase)) {
    for (const item of product.unitPerCase) {
      if (!item) continue;
      // match by auom only (user requested auom only)
      if (item.auom && String(item.auom).toLowerCase() === String(uom).toLowerCase()) {
        if (typeof item.denominator === 'number') return item.denominator;
        if (item.denominator) return Number(item.denominator) || null;
      }
    }
  }

  // check size or other fields that may contain denominator
  if (product.size && typeof product.size === 'object') {
    if (typeof product.size.denominator === 'number') return product.size.denominator;
    if (product.size.denominator) return Number(product.size.denominator) || null;
  }

  return null;
};

const SchemeCreatePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get('mode');
  const schemeId = searchParams.get('schemeId');
  const isEditMode = mode === 'edit' && schemeId;

  // Pagination state - defined before hooks
  const [productsPagination, setProductsPagination] = useState<PaginationState>(
    {
      pageIndex: 0,
      pageSize: 10,
    }
  );
  const [outletsPagination, setOutletsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [warehousesPagination, setWarehousesPagination] =
    useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  // API hooks
  const {
    data: schemeData,
    isLoading: isLoadingScheme,
    error: schemeError,
  } = useScheme(schemeId || '', {
    refetchOnMount: isEditMode ? 'always' : undefined,
  });
  const createSchemeMutation = useCreateScheme();
  const updateSchemeMutation = useUpdateScheme();

  const { records: brands } = useBrands();
  const { records: businessTypes } = useMasterRecords('businessType');
  // Fetch all channels (non-paginated / large page) so UI shows complete list
  const { records: channels } = useMasterRecords('channel', undefined, 0, 1000, true);
  const { records: uomRecords } = useMasterRecords(
    'unitOfMesaurement',
    undefined,
    0,
    200,
    true
  );

  // Modal state
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: 'products' | 'outlets' | 'channels' | 'warehouses' | 'brands' | 'categories' | 'subcategories' | 'businessTypes' | 'combo-products' | 'assorted-products' | 'lineitem-products' | 'prorated-products' | 'free-products' | 'conditions';
    title: string;
    description?: string;
    currentValue: { value: string; label: string }[];
    onConfirm: (value: { value: string; label: string }[]) => void;
    disabled?: boolean;
    conditionIndex?: number; // Track which condition is being edited
  }>({
    open: false,
    type: 'products',
    title: '',
    description: '',
    currentValue: [],
    onConfirm: () => { },
    disabled: false,
    conditionIndex: undefined,
  });

  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];

  // Calculate 3 months later
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);
  const formattedThreeMonthsLater = threeMonthsLater
    .toISOString()
    .split('T')[0];

  // Form state
  const [formData, setFormData] = useState({
    schemeName: '',
    description: '',
    validFrom: formattedToday,
    validTo: formattedThreeMonthsLater,
    maxRewardPerInvoice: 1,
    applicableTo: {
      warehouseIds: [] as string[],
      channelIds: [] as string[],
      productIds: [] as string[],
      brandIds: [] as string[],
      categoryIds: [] as string[],
      subcategoryIds: [] as string[],
      outletIds: [] as string[],
      businessTypeIds: [] as string[],
    },
    conditions: [] as any[],
    status: SchemeStatusEnum.DRAFT,
    approvalStatus: ApprovalStatusEnum.PENDING,
  });

  // Check if channel is selected
  const isChannelSelected = formData.applicableTo.channelIds.length > 0;
  const selectedChannelId = formData.applicableTo.channelIds[0];

  // Warehouse hook with pagination - filter by channel when selected
  const { warehouses } = useWarehouse(undefined, {
    nonPaginated: true,
    ...(isChannelSelected && selectedChannelId && {
      channelId: selectedChannelId,
    }),
  });

  // Dependent hooks that rely on formData
  const { records: categories } = useCategories(
    undefined,
    formData.applicableTo.brandIds.length > 0
      ? { brandId: formData.applicableTo.brandIds }
      : undefined
  );
  const { records: subcategories } = useSubcategories(
    undefined,
    formData.applicableTo.categoryIds.length > 0
      ? { categoryId: formData.applicableTo.categoryIds }
      : undefined
  );
  // Outlets - only load after warehouses are selected
  const { outlets } = useOutlets({
    enabled: formData.applicableTo.warehouseIds.length > 0,
    nonPaginated: true,
    // Server-side filtering for warehouses and business types
    ...(formData.applicableTo.warehouseIds.length > 0 && {
      warehouseId: JSON.stringify(formData.applicableTo.warehouseIds)
    }),
    ...(formData.applicableTo.channelIds.length > 0 && {
      channelIds: JSON.stringify(formData.applicableTo.channelIds)
    }),
    ...(formData.applicableTo.businessTypeIds.length > 0 && {
      businessTypeId: JSON.stringify(formData.applicableTo.businessTypeIds)
    })
  });

  // Products hook using pricing group products API - filters by selected warehouses
  // Must be called after formData is initialized
  // Only load products after warehouses are selected
  const pricingGroupProducts: any = usePricingGroupProducts({
    warehouseIds: formData.applicableTo.warehouseIds,
    enabled: formData.applicableTo.warehouseIds.length > 0,
  });

  // Keep regular products query for backward compatibility (used in modals)
  // Enable master products so product master data is available when warehouses are not selected
  const { products } = useProducts({
    nonPaginated: true,
  });

  // Convert outlets to options for MultiSelect
  // All filtering is now handled server-side via API
  const outletOptions = useMemo(() => {
    if (!outlets.data?.data?.items) return [];

    return outlets.data.data.items.map((outlet: any) => ({
      label: `${outlet.outletName} (${outlet.outletId})`,
      value: outlet.outletId,
    }));
  }, [outlets.data?.data?.items]);

  // Convert selected outlet IDs to options
  const selectedOutletOptions = useMemo(() => {
    return outletOptions.filter((option: { value: string; label: string }) =>
      formData.applicableTo.outletIds.includes(option.value)
    );
  }, [outletOptions, formData.applicableTo.outletIds]);

  // Form validation errors state
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scheme name suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Convert products to options for MultiSelect
  // Use pricing group products API which already filters by warehouses
  const productOptions = useMemo(() => {
    // Use pricing group products if warehouses are selected
    if (formData.applicableTo.warehouseIds.length > 0) {
      const items = pricingGroupProducts.data?.data?.items || [];
      return items.map((product: any) => ({
        label: `${product.productName} (${product.skuCode})`,
        value: product.productId,
      }));
    }

    // Fallback to master products when warehouses are not selected
    const masterItems = products.data?.data?.items || [];
    return masterItems.map((product: any) => ({
      label: `${product.productName} (${product.skuCode})`,
      value: product.productId,
    }));
  }, [pricingGroupProducts.data?.data?.items, formData.applicableTo.warehouseIds, products.data?.data?.items]);

  // Common UOM list (fallback)
  const COMMON_UOM_OPTIONS = [
    { value: 'pcs', label: 'PCS' },
    { value: 'kg', label: 'KG' },
    { value: 'bag', label: 'Bag' },
    { value: 'pockets', label: 'Pockets' },
  ];

  // Master UOM options from `unitOfMesaurement` master (used when no product is selected)
  const masterUomOptions = useMemo(() => {
    const rawData = (uomRecords as any)?.data as any;
    if (!rawData) {
      return COMMON_UOM_OPTIONS;
    }

    const extractedRecords = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.data)
          ? rawData.data
          : [];

    if (!extractedRecords || extractedRecords.length === 0) {
      return COMMON_UOM_OPTIONS;
    }

    const mapped: { value: string; label: string }[] = [];
    const seen = new Set<string>();

    extractedRecords.forEach((record: any) => {
      const name =
        record?.uomName ||
        record?.unitOfMesaurementName ||
        record?.name ||
        '';
      const code =
        record?.code ||
        record?.unitOfMesaurementCode ||
        record?.shortCode ||
        '';

      if (!name) {
        return;
      }

      const normalized = String(name).trim().toLowerCase();
      if (!normalized || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);

      const label =
        code && code !== name ? `${name} (${code})` : String(name);

      mapped.push({
        value: String(name),
        label,
      });
    });

    if (mapped.length === 0) {
      return COMMON_UOM_OPTIONS;
    }

    return mapped;
  }, [uomRecords?.data]);

  // Try to extract UOMs from a product object using common field names
  const extractUomsFromProduct = (product: any): string[] => {
    if (!product || typeof product !== 'object') return [];

    const found = new Set<string>();

    const pushVal = (v: any) => {
      if (!v && v !== 0) return;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) return;
        // Heuristic: ignore long opaque IDs (e.g. Mongo/UUID-like strings)
        if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return;
        found.add(trimmed);
      } else if (typeof v === 'number') {
        found.add(String(v));
      }
    };

    // Specifically extract baseUom/baseuom
    if (product.baseUom && typeof product.baseUom === 'string') {
      pushVal(product.baseUom);
    }
    if (product.baseuom && typeof product.baseuom === 'string') {
      pushVal(product.baseuom);
    }

    // Extract auom from unitPerCase array (prefer alternate UOM only)
    if (Array.isArray(product.unitPerCase)) {
      product.unitPerCase.forEach((item: any) => {
        if (item && item.auom && typeof item.auom === 'string') {
          pushVal(item.auom);
        }
      });
    }

    // Extract from size object if present
    if (product.size && typeof product.size === 'object') {
      if (typeof product.size.uom === 'string') {
        pushVal(product.size.uom);
      }
    }

    // Extract from nested unitOfMesaurement-like object if present
    const unitOfMesaurement =
      (product.unitOfMesaurement as any) ||
      (product.uomMaster as any) ||
      (product.uom as any);

    if (unitOfMesaurement && typeof unitOfMesaurement === 'object') {
      const name =
        unitOfMesaurement.uomName ||
        unitOfMesaurement.unitOfMesaurementName ||
        unitOfMesaurement.name ||
        '';
      const code =
        unitOfMesaurement.code ||
        unitOfMesaurement.unitOfMesaurementCode ||
        unitOfMesaurement.shortCode ||
        '';

      if (name) {
        pushVal(name);
      }
      if (code) {
        pushVal(code);
      }
    }

    const keysOfInterest = [
      'uom',
      'uoms',
      'uomList',
      'allowedUoms',
      'allowed_uoms',
      'uomMappings',
      'pack',
      'packSizes',
    ];

    const walk = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        for (const it of obj) {
          if (typeof it === 'string' || typeof it === 'number') pushVal(it);
          else walk(it);
        }
        return;
      }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        const lk = k.toLowerCase();
        if (keysOfInterest.some(sub => lk.includes(sub))) {
          if (Array.isArray(v)) {
            for (const item of v) {
              if (typeof item === 'string' || typeof item === 'number') pushVal(item);
              else if (item && (item.uom || item.value || item.code)) pushVal(item.uom || item.value || item.code);
            }
          } else if (typeof v === 'string' || typeof v === 'number') {
            pushVal(v);
          } else if (v && typeof v === 'object') {
            // object with fields
            if (v.uom) pushVal(v.uom);
            else if (v.value) pushVal(v.value);
            else walk(v);
          }
        } else {
          // continue walking for nested objects that may contain uom keys deeper
          if (v && typeof v === 'object') walk(v);
        }
      }
    };

    walk(product);

    return Array.from(found).filter(Boolean);
  };

  // Given product IDs, collect product-specific UOMs (union). Return common list if none found.
  const getUomOptionsForProductIds = (productIds: string[]) => {
    const allProducts = [
      ...(pricingGroupProducts.data?.data?.items || []),
      ...(products.data?.data?.items || []),
    ];
    const found = new Set<string>();
    productIds = (productIds || []).filter(Boolean);
    for (const id of productIds) {
      const p = allProducts.find((it: any) => it.productId === id || it.id === id || it._id === id);
      if (!p) continue;
      const uoms = extractUomsFromProduct(p);
      uoms.forEach(u => u && found.add(u));
    }
    if (found.size === 0) {
      if (masterUomOptions.length > 0) {
        return masterUomOptions;
      }
      return COMMON_UOM_OPTIONS;
    }
    // If a single product is in context, try to include denominator for reference
    const uomList = Array.from(found);
    if ((productIds || []).length === 1) {
      const singleId = productIds[0];
      const product = allProducts.find((it: any) => it.productId === singleId || it.id === singleId || it._id === singleId);
      return uomList.map(u => {
        const denom = findDenominatorForUomInProduct(product, u);
        return { value: u, label: formatUomWithDenominator(u, denom || undefined) };
      });
    }

    return uomList.map(u => ({ value: u, label: formatUom(u) }));
  };

  // Resolve productIds for different UI contexts (condition-level or criteria-level)
  const resolveProductIdsForContext = (condition: any, criteria?: any) => {
    // If criteria provided and has productId or productIds
    if (criteria) {
      if (criteria.productId) return [criteria.productId];
      if (Array.isArray(criteria.productIds) && criteria.productIds.length > 0) return criteria.productIds;
    }
    // If condition has nested criteria array, collect productIds from those
    if (condition?.criteria?.criteria && Array.isArray(condition.criteria.criteria)) {
      const ids: string[] = [];
      for (const c of condition.criteria.criteria) {
        if (c.productId) ids.push(c.productId);
        else if (Array.isArray(c.productIds)) ids.push(...c.productIds);
      }
      if (ids.length > 0) return ids;
    }
    // Fallback to global applicable products selected on the form
    return formData.applicableTo.productIds || [];
  };
  const getUomOptionsForContext = (condition: any, criteria?: any) => {
    const ids = resolveProductIdsForContext(condition, criteria);
    return getUomOptionsForProductIds(ids);
  };

  // Helper function to check if brand is Naga and get product's baseUom
  const getProductBaseUom = (criteria: any) => {
    if (!criteria.productId) return null;

    const allProducts = [
      ...(pricingGroupProducts.data?.data?.items || []),
      ...(products.data?.data?.items || []),
    ];
    const product = allProducts.find(
      (p: any) => p.productId === criteria.productId
    );
    return product?.baseUom || product?.baseuom || null;
  };

  // Get a display label for a UOM in a given context (includes denominator when available for single product)
  const getUomLabelForContext = (condition: any, criteria: any) => {
    const uom = criteria?.uom;
    if (!uom) return formatUom(uom);

    const ids = resolveProductIdsForContext(condition, criteria);
    if ((ids || []).length === 1) {
      const singleId = ids[0];
      const allProducts = [
        ...(pricingGroupProducts.data?.data?.items || []),
        ...(products.data?.data?.items || []),
      ];
      const product = allProducts.find((p: any) => p.productId === singleId || p.id === singleId || p._id === singleId);
      const denom = findDenominatorForUomInProduct(product, uom);
      return formatUomWithDenominator(uom, denom || undefined);
    }

    return formatUom(uom);
  };

  // Helper function to check if brand is Naga
  const isNagaBrand = (brandId: string) => {
    if (!brandId) return false;
    const brand = brands.data?.find((b: any) => b.brandId === brandId);
    return brand?.brandName?.toLowerCase() === 'naga';
  };


  // Convert selected product IDs to options
  const selectedProductOptions = useMemo(() => {
    return productOptions.filter((option: { value: string }) =>
      formData.applicableTo.productIds.includes(option.value)
    );
  }, [productOptions, formData.applicableTo.productIds]);

  // Convert warehouses to options for MultiSelect
  const warehouseOptions = useMemo(() => {
    if (!warehouses.data?.data?.items) return [];
    return warehouses.data.data.items.map((warehouse: any) => ({
      label: warehouse.warehouseName,
      value: warehouse.warehouseId,
    }));
  }, [warehouses.data?.data?.items]);

  // Convert selected warehouse IDs to options
  const selectedWarehouseOptions = useMemo(() => {
    return warehouseOptions.filter((option: { value: string; label: string }) =>
      formData.applicableTo.warehouseIds.includes(option.value)
    );
  }, [warehouseOptions, formData.applicableTo.warehouseIds]);

  const channelOptions = useMemo(() => {
    // channels may be returned as an array (`records`) or as a query object with `.data`/`.items`.
    const raw = Array.isArray(channels)
      ? channels
      : (channels as any)?.data || (channels as any)?.items || [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map((channel: any) => ({
      label: channel.channelName || channel.name || channel.channelId || String(channel),
      value: channel.channelId || channel.id || channel._id || String(channel.channelId || channel.id || channel._id || channel),
    }));
  }, [channels]);

  // Ensure selected channel appears in options even if not in the first page
  const channelOptionsWithSelected = useMemo(() => {
    const selectedId = formData.applicableTo.channelIds[0];
    if (!selectedId) return channelOptions;
    if (channelOptions.some((o: any) => o.value === selectedId)) return channelOptions;
    return [...channelOptions, { value: selectedId, label: selectedId }];
  }, [channelOptions, formData.applicableTo.channelIds]);
  const selectedChannelOptions = useMemo(() => {
    return channelOptions.filter((option: { value: string; label: string }) =>
      formData.applicableTo.channelIds.includes(option.value)
    );
  }, [channelOptions, formData.applicableTo.channelIds]);

  const businessTypeOptions = useMemo(() => {
    if (!businessTypes.data) return [];
    return businessTypes.data.map((bt: any) => ({
      label: bt.businessTypeName || bt.name,
      value: bt.businessTypeId || bt._id,
    }));
  }, [businessTypes.data]);

  const selectedBusinessTypeOptions = useMemo(() => {
    return businessTypeOptions.filter((option: { value: string; label: string }) =>
      formData.applicableTo.businessTypeIds.includes(option.value)
    );
  }, [businessTypeOptions, formData.applicableTo.businessTypeIds]);

  // Convert brands to options for MultiSelect
  const brandOptions = useMemo(() => {
    if (!brands.data) return [];
    return brands.data.map((brand: any) => ({
      label: brand.brandName,
      value: brand.brandId,
    }));
  }, [brands.data]);

  // Convert selected brand IDs to options
  const selectedBrandOptions = useMemo(() => {
    return brandOptions.filter((option: { value: string; label: string }) =>
      formData.applicableTo.brandIds.includes(option.value)
    );
  }, [brandOptions, formData.applicableTo.brandIds]);

  // Convert categories to options for MultiSelect
  const categoryOptions = useMemo(() => {
    if (!categories.data) return [];
    return categories.data.map((category: any) => ({
      label: category.categoryName,
      value: category.categoryId,
    }));
  }, [categories.data]);

  // Convert selected category IDs to options
  const selectedCategoryOptions = useMemo(() => {
    return categoryOptions.filter((option: { value: string; label: string }) =>
      formData.applicableTo.categoryIds.includes(option.value)
    );
  }, [categoryOptions, formData.applicableTo.categoryIds]);

  // Convert subcategories to options for MultiSelect
  const subcategoryOptions = useMemo(() => {
    if (!subcategories.data) return [];
    return subcategories.data.map((subcategory: any) => ({
      label: subcategory.subcategoryName || subcategory.subcategoryname,
      value: subcategory.subcategoryId,
    }));
  }, [subcategories.data]);

  // Convert selected subcategory IDs to options
  const selectedSubcategoryOptions = useMemo(() => {
    return subcategoryOptions.filter(
      (option: { value: string; label: string }) =>
        formData.applicableTo.subcategoryIds.includes(option.value)
    );
  }, [subcategoryOptions, formData.applicableTo.subcategoryIds]);

  // Helper function to get filtered product options based on brand, category, and subcategory
  const getFilteredProductOptions = useCallback(
    (
      selectedBrandId?: string,
      selectedCategoryId?: string,
      selectedSubcategoryId?: string
    ) => {
      if (!selectedSubcategoryId && !selectedCategoryId && !selectedBrandId)
        return productOptions;

      return productOptions.filter(
        (option: { value: string; label: string }) => {
          const product = products?.data?.data?.items?.find(
            (p: any) => p.productId === option.value
          );
          if (!product) return false;

          const matchesBrand =
            !selectedBrandId || product.brandId === selectedBrandId;
          const matchesCategory =
            !selectedCategoryId || product.categoryId === selectedCategoryId;
          const matchesSubcategory =
            !selectedSubcategoryId ||
            product.subcategoryId === selectedSubcategoryId;

          return matchesBrand && matchesCategory && matchesSubcategory;
        }
      );
    },
    [productOptions, products?.data?.data?.items]
  );



  // Generate scheme name suggestions based on form data
  const generateSchemeNameSuggestions = useMemo(() => {
    const suggestions: { name: string; reason: string }[] = [];

    // Get selected items
    const selectedBrands = brandOptions.filter((option) =>
      formData.applicableTo.brandIds.includes(option.value)
    );
    const selectedCategories = categoryOptions.filter((option) =>
      formData.applicableTo.categoryIds.includes(option.value)
    );
    const selectedProducts = productOptions.filter((option: any) =>
      formData.applicableTo.productIds.includes(option.value)
    );
    const selectedOutlets = outletOptions.filter((option) =>
      formData.applicableTo.outletIds.includes(option.value)
    );

    // Get condition types and their values
    const conditionTypes = formData.conditions.map(
      (condition) => condition.conditionType
    );
    const uniqueConditionTypes = [...new Set(conditionTypes)];

    // Get reward types and their values
    const rewardTypes = formData.conditions.map(
      (condition) => condition.reward?.type
    );
    const uniqueRewardTypes = [...new Set(rewardTypes)];

    // Generate dynamic suggestions based on actual values
    formData.conditions.forEach((condition, index) => {
      const conditionType = condition.conditionType;
      const reward = condition.reward;
      const criteria = condition.criteria;

      // Get condition value
      let conditionValue = '';
      if (conditionType === 'invoice') {
        conditionValue = criteria?.minValue ? `₹${criteria.minValue}` : '₹500';
      } else if (conditionType === 'combo') {
        const totalQty =
          criteria?.productIds?.reduce(
            (sum: number, product: any) => sum + (product.minQty || 0),
            0
          ) || 0;
        conditionValue = totalQty > 0 ? `${totalQty} items` : '5 items';
      } else if (conditionType === 'assorted') {
        conditionValue = criteria?.minValue
          ? `${criteria.minValue} units`
          : '10 units';
      } else if (conditionType === 'lineItem') {
        conditionValue = criteria?.minLineTotal
          ? `₹${criteria.minLineTotal}`
          : '₹100';
      } else if (conditionType === 'prorated') {
        conditionValue = criteria?.proratedPer
          ? `every ${criteria.proratedPer} units`
          : 'every 5 units';
      }

      // Get reward description
      let rewardDescription = '';
      if (reward?.type === 'discountPercent') {
        rewardDescription = `${reward.value || 5}% discount`;
      } else if (reward?.type === 'discountFixed') {
        rewardDescription = `₹${reward.value || 50} off`;
      } else if (reward?.type === 'freeProduct') {
        const productCount = reward.products?.length || 0;
        rewardDescription =
          productCount > 0
            ? `${productCount} free product${productCount > 1 ? 's' : ''}`
            : 'free product';
      }

      // Get max reward limit
      const maxReward = reward?.maxRewardAmount
        ? `upto ₹${reward.maxRewardAmount}`
        : '';

      // Generate suggestion based on condition type
      if (conditionType === 'invoice') {
        suggestions.push({
          name: `Order ${conditionValue} and get ${rewardDescription} ${maxReward}`.trim(),
          reason: `Based on invoice condition: minimum ${conditionValue} order value`,
        });
      } else if (conditionType === 'combo') {
        suggestions.push({
          name: `Buy ${conditionValue} and get ${rewardDescription} ${maxReward}`.trim(),
          reason: `Based on combo condition: purchase ${conditionValue}`,
        });
      } else if (conditionType === 'assorted') {
        suggestions.push({
          name: `Buy ${conditionValue} and get ${rewardDescription} ${maxReward}`.trim(),
          reason: `Based on assorted condition: aggregate ${conditionValue}`,
        });
      } else if (conditionType === 'lineItem') {
        suggestions.push({
          name: `Line item ${conditionValue} and get ${rewardDescription} ${maxReward}`.trim(),
          reason: `Based on line item condition: minimum ${conditionValue} per line`,
        });
      } else if (conditionType === 'prorated') {
        suggestions.push({
          name: `Buy ${conditionValue} and get ${rewardDescription} ${maxReward}`.trim(),
          reason: `Based on prorated condition: ${conditionValue}`,
        });
      }
    });

    // Brand-specific suggestions
    if (selectedBrands.length > 0) {
      const firstCondition = formData.conditions[0];
      if (firstCondition) {
        const reward = firstCondition.reward;
        const rewardDesc =
          reward?.type === 'discountPercent'
            ? `${reward.value || 5}% off`
            : reward?.type === 'discountFixed'
              ? `₹${reward.value || 50} off`
              : 'special offer';

        // Single brand - show brand name
        if (selectedBrands.length === 1) {
          suggestions.push({
            name: `${selectedBrands[0].label} - ${rewardDesc}`,
            reason: `Based on selected brand: ${selectedBrands[0].label}`,
          });
        }
        // Multiple brands - show generic term
        else if (selectedBrands.length <= 3) {
          const brandNames = selectedBrands
            .map((brand) => brand.label)
            .join(' & ');
          suggestions.push({
            name: `${brandNames} Bundle - ${rewardDesc}`,
            reason: `Based on ${selectedBrands.length} selected brands`,
          });
        } else {
          suggestions.push({
            name: `Multi-Brand Collection - ${rewardDesc}`,
            reason: `Based on ${selectedBrands.length} selected brands`,
          });
        }
      }
    }

    // Category-specific suggestions
    if (selectedCategories.length > 0) {
      const firstCondition = formData.conditions[0];
      if (firstCondition) {
        const reward = firstCondition.reward;
        const rewardDesc =
          reward?.type === 'discountPercent'
            ? `${reward.value || 5}% discount`
            : reward?.type === 'discountFixed'
              ? `₹${reward.value || 50} discount`
              : 'special offer';

        // Single category - show category name
        if (selectedCategories.length === 1) {
          suggestions.push({
            name: `${selectedCategories[0].label} Category - ${rewardDesc}`,
            reason: `Based on selected category: ${selectedCategories[0].label}`,
          });
        }
        // Multiple categories - show generic term
        else if (selectedCategories.length <= 3) {
          const categoryNames = selectedCategories
            .map((category) => category.label)
            .join(' & ');
          suggestions.push({
            name: `${categoryNames} Categories - ${rewardDesc}`,
            reason: `Based on ${selectedCategories.length} selected categories`,
          });
        } else {
          suggestions.push({
            name: `Multi-Category Collection - ${rewardDesc}`,
            reason: `Based on ${selectedCategories.length} selected categories`,
          });
        }
      }
    }

    // Product-specific suggestions
    if (selectedProducts.length > 0) {
      const firstCondition = formData.conditions[0];
      if (firstCondition) {
        const reward = firstCondition.reward;
        const rewardDesc =
          reward?.type === 'discountPercent'
            ? `${reward.value || 5}% off`
            : reward?.type === 'discountFixed'
              ? `₹${reward.value || 50} off`
              : 'special offer';

        // Single product - show product name
        if (selectedProducts.length === 1) {
          const productName = selectedProducts[0].label.split(' (')[0];
          suggestions.push({
            name: `${productName} - ${rewardDesc}`,
            reason: `Based on selected product: ${productName}`,
          });
        }
        // Multiple products - check category first, then brand
        else if (selectedProducts.length > 1) {
          // Check if products belong to same category
          const productCategories = selectedProducts
            .map((product: any) => {
              const productData = pricingGroupProducts.data?.data?.items?.find(
                (p: any) => p.productId === product.value
              );
              return productData?.categoryName || productData?.category;
            })
            .filter(Boolean);

          const uniqueCategories = [...new Set(productCategories)];

          if (uniqueCategories.length === 1) {
            // All products in same category
            suggestions.push({
              name: `${uniqueCategories[0]} Category - ${rewardDesc}`,
              reason: `Based on ${selectedProducts.length} products from ${uniqueCategories[0]} category`,
            });
          } else {
            // Check if products belong to same brand
            const productBrands = selectedProducts
              .map((product: any) => {
                const productData = pricingGroupProducts.data?.data?.items?.find(
                  (p: any) => p.productId === product.value
                );
                return productData?.brandName || productData?.brand;
              })
              .filter(Boolean);

            const uniqueBrands = [...new Set(productBrands)];

            if (uniqueBrands.length === 1) {
              // All products from same brand
              suggestions.push({
                name: `${uniqueBrands[0]} Brand - ${rewardDesc}`,
                reason: `Based on ${selectedProducts.length} products from ${uniqueBrands[0]} brand`,
              });
            } else {
              // Multiple categories and brands
              suggestions.push({
                name: `${selectedProducts.length} Product Bundle - ${rewardDesc}`,
                reason: `Based on ${selectedProducts.length} selected products from multiple categories/brands`,
              });
            }
          }
        }
      }
    }

    // Outlet-specific suggestions
    if (selectedOutlets.length > 0) {
      const firstCondition = formData.conditions[0];
      if (firstCondition) {
        const reward = firstCondition.reward;
        const rewardDesc =
          reward?.type === 'discountPercent'
            ? `${reward.value || 5}% exclusive offer`
            : reward?.type === 'discountFixed'
              ? `₹${reward.value || 50} exclusive offer`
              : 'exclusive offer';

        // Single outlet - show outlet name
        if (selectedOutlets.length === 1) {
          const outletName = selectedOutlets[0].label.split(' (')[0];
          suggestions.push({
            name: `${outletName} - ${rewardDesc}`,
            reason: `Based on selected outlet: ${outletName}`,
          });
        }
        // Multiple outlets - show generic term
        else if (selectedOutlets.length <= 3) {
          const outletNames = selectedOutlets
            .map((outlet) => outlet.label.split(' (')[0])
            .join(' & ');
          suggestions.push({
            name: `${outletNames} - ${rewardDesc}`,
            reason: `Based on ${selectedOutlets.length} selected outlets`,
          });
        } else {
          suggestions.push({
            name: `Multi-Outlet Network - ${rewardDesc}`,
            reason: `Based on ${selectedOutlets.length} selected outlets`,
          });
        }
      }
    }

    // Generic suggestions with actual values
    if (formData.conditions.length > 0) {
      const firstCondition = formData.conditions[0];
      const reward = firstCondition.reward;
      const criteria = firstCondition.criteria;

      if (
        firstCondition.conditionType === 'invoice' &&
        reward?.type === 'discountPercent'
      ) {
        const minValue = criteria?.minValue || 500;
        const discountPercent = reward.value || 5;
        const maxReward = reward.maxRewardAmount || 200;

        suggestions.push({
          name: `Order ₹${minValue} and get ${discountPercent}% offer upto ₹${maxReward}`,
          reason: 'Based on invoice condition with percentage discount',
        });
      }
    }

    // Seasonal suggestions with values
    const currentMonth = new Date().getMonth();
    const seasons = ['Winter', 'Spring', 'Summer', 'Fall'];
    const currentSeason = seasons[Math.floor(currentMonth / 3)];

    if (formData.conditions.length > 0) {
      const firstCondition = formData.conditions[0];
      const reward = firstCondition.reward;
      const rewardDesc =
        reward?.type === 'discountPercent'
          ? `${reward.value || 5}% off`
          : reward?.type === 'discountFixed'
            ? `₹${reward.value || 50} off`
            : 'special offer';

      suggestions.push({
        name: `${currentSeason} Special - ${rewardDesc}`,
        reason: `Based on current season: ${currentSeason}`,
      });
    }

    // Remove duplicates and limit to 5 suggestions
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) =>
        index === self.findIndex((s) => s.name === suggestion.name)
    );
    return uniqueSuggestions.slice(0, 5);
  }, [formData, brandOptions, categoryOptions, productOptions, outletOptions]);

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: {
    name: string;
    reason: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      schemeName: suggestion.name,
    }));
    setShowSuggestions(false);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Immediate status initialization for better UX
  useEffect(() => {
    if (isEditMode && !formData.status) {
      // Set a default status immediately to avoid UI lag
      setFormData((prev) => ({
        ...prev,
        status: SchemeStatusEnum.DRAFT,
      }));
    }
  }, [isEditMode, formData.status]);

  // Load scheme data for edit mode
  useEffect(() => {
    if (isEditMode && schemeData) {
      // Check if the data is wrapped in a data property
      const actualData = (schemeData as any).data || schemeData;

      const newFormData = {
        schemeName: actualData.schemeName || '',
        description: actualData.description || '',
        validFrom: actualData.validFrom
          ? actualData.validFrom.split('T')[0]
          : '',
        validTo: actualData.validTo ? actualData.validTo.split('T')[0] : '',
        maxRewardPerInvoice: actualData.maxRewardPerInvoice || 1,
        isExclusive: actualData.isExclusive || false,
        applicableTo: {
          warehouseIds: actualData.applicableTo?.warehouseIds || [],
          channelIds: actualData.applicableTo?.channelIds || [],
          productIds: actualData.applicableTo?.productIds || [],
          brandIds: actualData.applicableTo?.brandIds || [],
          categoryIds: actualData.applicableTo?.categoryIds || [],
          subcategoryIds: actualData.applicableTo?.subcategoryIds || [],
          outletIds: actualData.applicableTo?.outletIds || [],
          businessTypeIds: actualData.applicableTo?.businessTypeIds || [],
        },
        conditions: actualData.conditions || [],
        status: actualData.status
          ? actualData.status.toUpperCase()
          : SchemeStatusEnum.DRAFT,
        approvalStatus:
          (actualData.approvalStatus as ApprovalStatusEnum) ||
          ApprovalStatusEnum.PENDING,
      };

      setFormData(newFormData);
    }
  }, [isEditMode, schemeData]);

  // Precomputed status mapping and disabled state (optimized for performance)
  const statusMap = {
    [SchemeStatusEnum.IN_REVIEW]: SchemeStatusEnum.PENDING,
    [SchemeStatusEnum.PENDING]: SchemeStatusEnum.PENDING,
    [SchemeStatusEnum.ACTIVE]: SchemeStatusEnum.ACTIVE,
    [SchemeStatusEnum.INACTIVE]: SchemeStatusEnum.INACTIVE,
    [SchemeStatusEnum.DRAFT]: SchemeStatusEnum.PENDING,
  };

  const statusValue = statusMap[formData.status as keyof typeof statusMap] || formData.status;
  const isStatusDisabled = [SchemeStatusEnum.IN_REVIEW, SchemeStatusEnum.PENDING, SchemeStatusEnum.DRAFT].includes(formData.status);

  // Allow editing of all fields regardless of status
  const isFieldsDisabled = false;

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplicableToChange = (field: string, value: string[]) => {
    setFormData((prev) => ({
      ...prev,
      applicableTo: {
        ...prev.applicableTo,
        [field]: value,
      },
    }));

    // Clear applicableTo error if user selects any option
    if (value.length > 0 && formErrors.applicableTo) {
      setFormErrors((prev) => ({ ...prev, applicableTo: '' }));
    }
  };

  const handleProductSelection = (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const selectedProductIds = selectedOptions.map((option) => option.value);
    handleApplicableToChange('productIds', selectedProductIds);
  };

  const handleWarehouseSelection = (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const selectedWarehouseIds = selectedOptions.map((option) => option.value);
    handleApplicableToChange('warehouseIds', selectedWarehouseIds);
  };

  const handleBusinessTypeSelection = (selectedOptions: { value: string; label: string }[]) => {
    const selectedBusinessTypeIds = selectedOptions.map(option => option.value);
    handleApplicableToChange('businessTypeIds', selectedBusinessTypeIds);
  };

  const handleChannelSelection = (selectedOptions: { value: string; label: string }[]) => {
    const selectedChannelIds = selectedOptions.map(option => option.value);
    handleApplicableToChange('channelIds', selectedChannelIds);
  };

  const handleBrandSelection = (selectedOptions: { value: string; label: string }[]) => {
    const selectedBrandIds = selectedOptions.map(option => option.value);
    handleApplicableToChange('brandIds', selectedBrandIds);

    // Clear categories and subcategories when brands change
    handleApplicableToChange('categoryIds', []);
    handleApplicableToChange('subcategoryIds', []);
  };

  const handleCategorySelection = (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const selectedCategoryIds = selectedOptions.map((option) => option.value);
    handleApplicableToChange('categoryIds', selectedCategoryIds);

    // Clear subcategories when categories change
    handleApplicableToChange('subcategoryIds', []);
  };

  const handleSubcategorySelection = (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const selectedSubcategoryIds = selectedOptions.map(
      (option) => option.value
    );
    handleApplicableToChange('subcategoryIds', selectedSubcategoryIds);
  };

  const handleOutletSelection = (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const selectedOutletIds = selectedOptions.map((option) => option.value);
    handleApplicableToChange('outletIds', selectedOutletIds);
  };

  const openMultiSelectModal = (
    type: 'products' | 'outlets' | 'channels' | 'warehouses' | 'brands' | 'categories' | 'subcategories' | 'businessTypes' | 'combo-products' | 'assorted-products' | 'lineitem-products' | 'prorated-products' | 'free-products' | 'conditions',
    title: string,
    description: string,
    currentValue: { value: string; label: string }[],
    onConfirm: (value: { value: string; label: string }[]) => void,
    disabled: boolean = false,
    conditionIndex?: number
  ) => {
    setModalState({
      open: true,
      type,
      title,
      description,
      currentValue,
      onConfirm,
      disabled,
      conditionIndex,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  const addCondition = () => {
    const newCondition = {
      conditionType: 'invoice',
      priority: formData.conditions.length + 1,
      isProRated: true,
      criteria: {
        conditionBasis: 'amount',
        aggregationBasis: 'amount',
        hasMinValue: true,
        minValue: 100,
        hasMaxValue: false,
        maxValue: undefined,
      },
      reward: {
        type: 'discountPercent',
        value: 10,
        maxRewardAmount: 500,
      },
    };

    setFormData((prev) => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));

    // Clear conditions error if user adds a condition
    if (formErrors.conditions) {
      setFormErrors((prev) => ({ ...prev, conditions: '' }));
    }
  };

  const removeCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => {
        if (i === index) {
          const updatedCondition = { ...condition, [field]: value };

          // Initialize criteria structure when condition type changes
          if (field === 'conditionType') {
            if (value === 'lineItem') {
              updatedCondition.isProRated = false; // Line items are never prorated
              updatedCondition.criteria = {
                minLineTotal: 100,
                uom: 'pcs',
                filterBy: {
                  brandIds: [],
                  categoryIds: [],
                  subcategoryIds: [],
                  productIds: [],
                },
              };
            } else if (value === 'combo') {
              updatedCondition.criteria = {
                matchType: 'all',
                criteria: [],
              };
            } else if (value === 'assorted') {
              updatedCondition.criteria = {
                aggregationBasis: 'quantity',
                uom: 'pcs',
                hasMinValue: true,
                minValue: 100,
                hasMaxValue: false,
                criteria: [],
              };
            } else if (value === 'invoice') {
              updatedCondition.criteria = {
                conditionBasis: 'amount', // Invoice conditions default to amount-based
                aggregationBasis: 'amount',
                hasMinValue: true,
                minValue: 100,
                hasMaxValue: false,
                maxValue: undefined,
              };
            }
          }

          return updatedCondition;
        }
        return condition;
      }),
    }));
  };

  const updateConditionCriteria = useCallback(
    (index: number, field: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        conditions: prev.conditions.map((condition, i) =>
          i === index
            ? (() => {
              const nextCriteria = { ...condition.criteria };

              if (field === 'aggregationBasis') {
                nextCriteria.aggregationBasis = value;

                if (condition.conditionType === 'invoice') {
                  nextCriteria.conditionBasis = value;
                }

                if (value === 'quantity') {
                  nextCriteria.uom = nextCriteria.uom || 'pcs';
                } else if (value === 'weight') {
                  // When weight is selected, automatically set UOM to kg
                  nextCriteria.uom = 'kg';
                } else if ('uom' in nextCriteria) {
                  delete nextCriteria.uom;
                }
              } else if (field === 'criteria') {
                nextCriteria.criteria = value;
              } else if (field === 'uom') {
                if (
                  condition.conditionType === 'lineItem' ||
                  condition.criteria?.aggregationBasis === 'quantity' ||
                  condition.criteria?.aggregationBasis === 'weight'
                ) {
                  nextCriteria.uom = value;
                } else {
                  return condition;
                }
              } else {
                nextCriteria[field] = value;
              }

              return {
                ...condition,
                criteria: nextCriteria,
              };
            })()
            : condition
        ),
      }));
    },
    []
  );

  // Memoized handler for product criteria field changes
  const handleProductCriteriaChange = useCallback(
    (
      conditionIndex: number,
      criteriaIndex: number,
      field: string,
      value: string
    ) => {
      setFormData((prev) => {
        const updatedConditions = [...prev.conditions];
        const condition = updatedConditions[conditionIndex];
        const updatedCriteria = [...(condition.criteria.criteria || [])];
        const criteria = updatedCriteria[criteriaIndex];

        const updates: any = { [field]: value };

        // Reset dependent fields based on the changed field
        if (field === 'brandId') {
          updates.categoryId = '';
          updates.subcategoryId = '';
          updates.productId = '';
        } else if (field === 'categoryId') {
          updates.subcategoryId = '';
          updates.productId = '';
        } else if (field === 'subcategoryId') {
          updates.productId = '';
        }

        // Apply updates to get the new criteria state
        const newCriteria = { ...criteria, ...updates };

        // If product is selected and it's Naga brand with category/subcategory, set UOM from baseUom
        if (field === 'productId' && value && newCriteria.brandId) {
          const allProducts = [
            ...(pricingGroupProducts.data?.data?.items || []),
            ...(products.data?.data?.items || []),
          ];
          const product = allProducts.find(
            (p: any) => p.productId === value
          );

          // Check if brand is Naga
          const brand = brands.data?.find((b: any) => b.brandId === newCriteria.brandId);
          const isNaga = brand?.brandName?.toLowerCase() === 'naga';

          if (product && isNaga && newCriteria.categoryId && newCriteria.subcategoryId) {
            const baseUom = product.baseUom || product.baseuom;
            if (baseUom && condition.criteria?.aggregationBasis === 'quantity') {
              updates.uom = baseUom;
            }
          }
        }

        updatedCriteria[criteriaIndex] = { ...newCriteria, ...updates };
        updatedConditions[conditionIndex] = {
          ...condition,
          criteria: { ...condition.criteria, criteria: updatedCriteria },
        };

        return {
          ...prev,
          conditions: updatedConditions,
        };
      });
    },
    [pricingGroupProducts.data?.data?.items, products.data?.data?.items, brands.data]
  );

  const updateConditionReward = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) =>
        i === index
          ? {
            ...condition,
            reward: { ...condition.reward, [field]: value },
          }
          : condition
      ),
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Clear previous errors
    setFormErrors({});

    // Validate "Applicable To" - at least one field must be selected
    const applicableTo = formData.applicableTo;
    const hasApplicability =
      applicableTo.warehouseIds.length > 0 ||
      applicableTo.channelIds.length > 0 ||
      applicableTo.productIds.length > 0 ||
      applicableTo.brandIds.length > 0 ||
      applicableTo.categoryIds.length > 0 ||
      applicableTo.subcategoryIds.length > 0 ||
      applicableTo.outletIds.length > 0 ||
      applicableTo.businessTypeIds.length > 0;

    if (!hasApplicability) {
      toast.error('At least one field in "Applicable To" must be selected', {
        duration: 5000,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Helper function to filter out empty ID keys from criteria
      const filterEmptyIds = (criteria: any) => {
        const filtered = { ...criteria };

        // Remove empty ID keys
        if (!criteria.brandId || criteria.brandId === '') {
          delete filtered.brandId;
        }
        if (!criteria.categoryId || criteria.categoryId === '') {
          delete filtered.categoryId;
        }
        if (!criteria.subcategoryId || criteria.subcategoryId === '') {
          delete filtered.subcategoryId;
        }
        if (!criteria.productId || criteria.productId === '') {
          delete filtered.productId;
        }

        return filtered;
      };

      // Helper function to filter reward fields based on type
      const filterRewardFields = (reward: any) => {
        const filtered = { ...reward };

        // For freeProduct, remove value, maxRewardAmount, and any reward-level discount fields
        if (reward.type === 'freeProduct') {
          delete filtered.value;
          delete filtered.maxRewardAmount;
          delete filtered.discountType;
          delete filtered.discountValue;
        }

        // For productDiscount, remove value, maxRewardAmount, and any reward-level discount fields
        if (reward.type === 'productDiscount') {
          delete filtered.value;
          delete filtered.maxRewardAmount;
          delete filtered.discountType;
          delete filtered.discountValue;
        }

        return filtered;
      };

      // Process conditions to filter empty IDs and ensure combo conditions have matchType
      const processedConditions = formData.conditions.map((condition: any) => {
        let processedCondition = { ...condition };

        // Filter empty IDs from criteria array
        if (condition.criteria?.criteria) {
          processedCondition = {
            ...processedCondition,
            criteria: {
              ...condition.criteria,
              criteria: condition.criteria.criteria.map((criteria: any) =>
                filterEmptyIds(criteria)
              ),
            },
          };
        }

        // For prorated conditions, ensure hasMinValue/hasMaxValue fields are set for non-invoice conditions
        if (
          condition.isProRated &&
          condition.criteria &&
          condition.conditionType !== 'invoice'
        ) {
          const updatedCriteria = { ...condition.criteria };

          // For non-invoice conditions, set hasMinValue to true if minValue exists
          if (
            updatedCriteria.minValue !== undefined &&
            updatedCriteria.minValue !== null
          ) {
            updatedCriteria.hasMinValue = true;
          }
          if (
            updatedCriteria.maxValue !== undefined &&
            updatedCriteria.maxValue !== null &&
            updatedCriteria.maxValue > 0
          ) {
            updatedCriteria.hasMaxValue = true;
          }

          processedCondition = {
            ...processedCondition,
            criteria: updatedCriteria,
          };
        }

        // For assorted conditions, ensure we use aggregationBasis instead of conditionBasis
        if (condition.conditionType === 'assorted' && condition.criteria) {
          const updatedCriteria = { ...condition.criteria };

          // Remove conditionBasis if it exists and ensure aggregationBasis is present
          if (updatedCriteria.conditionBasis) {
            delete updatedCriteria.conditionBasis;
          }

          // Ensure aggregationBasis is set (default to 'quantity' if not present)
          if (!updatedCriteria.aggregationBasis) {
            updatedCriteria.aggregationBasis = 'quantity';
          }

          processedCondition = {
            ...processedCondition,
            criteria: updatedCriteria,
          };
        }

        // Filter reward fields based on type
        if (condition.reward) {
          processedCondition = {
            ...processedCondition,
            reward: filterRewardFields(condition.reward),
          };
        }

        // Note: isProRated is now allowed for fixed discount rewards
        // Only lineItem conditions should not have isProRated (handled in UI)

        // Ensure combo conditions have matchType (always include in payload)
        if (
          condition.conditionType === 'combo' &&
          (!condition.criteria || !condition.criteria.matchType)
        ) {
          processedCondition = {
            ...processedCondition,
            criteria: {
              ...processedCondition.criteria,
              matchType: 'all',
            },
          };
        }

        return processedCondition;
      });

      // Map status to API-expected lowercase values
      // API expects: active | inactive | pending | rejected | approved
      const statusMapToApi: Record<string, string> = {
        [SchemeStatusEnum.DRAFT]: 'pending',
        [SchemeStatusEnum.PENDING]: 'pending',
        [SchemeStatusEnum.IN_REVIEW]: 'pending',
        [SchemeStatusEnum.ACTIVE]: 'active',
        [SchemeStatusEnum.INACTIVE]: 'inactive',
      };

      const apiStatus = statusMapToApi[formData.status] || (formData.status || '').toString().toLowerCase();

      const schemePayload = {
        schemeName: formData.schemeName,
        description: formData.description,
        validFrom: new Date(formData.validFrom).toISOString(),
        validTo: new Date(formData.validTo).toISOString(),
        maxRewardPerInvoice: formData.maxRewardPerInvoice,
        applicableTo: formData.applicableTo,
        conditions: processedConditions,
        // API expects lowercase: active | inactive | pending | rejected | approved
        status: apiStatus as any,
        createdBy: 'Current User',
      };

      if (isEditMode) {
        toast.loading('Updating scheme...', { id: 'scheme-action' });
        const actualData = (schemeData as any).data || schemeData;
        await updateSchemeMutation.mutateAsync({
          id: actualData?.schemeId || schemeId!,
          data: schemePayload,
        });
        toast.success('Scheme updated successfully!', {
          id: 'scheme-action',
        });
      } else {
        toast.loading('Creating scheme...', { id: 'scheme-action' });
        await createSchemeMutation.mutateAsync(schemePayload as any);
        toast.success('Scheme created successfully!', {
          id: 'scheme-action',
        });
      }

      router.push(NavKeys.DashboardSchemes);
    } catch (error: any) {
      console.error('Submit error:', error);

      // Extract error message from API response
      let errorMessage = '';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} scheme. Please check your input and try again.`;
      }

      toast.error(errorMessage, {
        id: 'scheme-action',
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderConditionForm = (
    condition: any,
    index: number,
    isDisabled: boolean = false
  ) => {
    return (
      <div key={index} className="rounded-lg border-2 bg-card p-4">
        <div className="bg-background mb-4 flex items-center justify-between rounded-lg p-2 text-lg font-medium">
          <span>Condition {index + 1}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Priority: {condition.priority}</Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCondition(index)}
              className="text-destructive hover:text-destructive"
              disabled={isDisabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {/* Condition Type and Priority */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label className="mb-2">Condition Type</Label>
              <Select
                value={condition.conditionType}
                onValueChange={(value) =>
                  updateCondition(index, 'conditionType', value)
                }
                disabled={isDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select condition type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                  <SelectItem value="assorted">Assorted</SelectItem>
                  <SelectItem value="lineItem">Line Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2">Priority</Label>
              <Input
                className="border-[#E5E7EB] bg-card"
                type="number"
                value={condition.priority}
                onChange={(e) =>
                  updateCondition(index, 'priority', Number(e.target.value))
                }
                min="1"
                disabled={isDisabled}
              />
            </div>

            {/* Prorated Logic - Hide only for line item conditions */}
            <div className="md:col-span-2 lg:col-span-2 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {/* Hide isProRated only for line item conditions */}
              {condition.conditionType !== 'lineItem' && (
                <div className="flex items-center space-x-2 md:col-span-1">
                  <Checkbox
                    id={`prorated-${index}`}
                    checked={condition.isProRated || false}
                    onCheckedChange={(checked) =>
                      updateCondition(index, 'isProRated', checked)
                    }
                    disabled={isDisabled}
                  />
                  <Label htmlFor={`prorated-${index}`} className="mb-2">
                    Is ProRated
                  </Label>
                </div>
              )}
              {/* Match Type - Always show for combo conditions */}
              {condition.conditionType === 'combo' && (
                <div className="md:col-span-1">
                  <Label className="mb-2">Match Type</Label>
                  <Select
                    value={condition.criteria.matchType || 'all'}
                    onValueChange={(value) =>
                      updateConditionCriteria(index, 'matchType', value)
                    }
                    disabled={isDisabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select match type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Condition-specific criteria */}
          <div className="space-y-4">
            <Label className="mt-8 mb-4">Criteria</Label>
            {condition.conditionType === 'invoice' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <Label className="mb-2">Aggregation Basis</Label>
                    <Select
                      value={condition.criteria.aggregationBasis || 'amount'}
                      onValueChange={(value) =>
                        updateConditionCriteria(index, 'aggregationBasis', value)
                      }
                      disabled={isDisabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select aggregation basis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount Based</SelectItem>
                        <SelectItem value="weight">Weight Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2">Min Value</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`hasMinValue-invoice-${index}`}
                        checked={condition.criteria.hasMinValue || false}
                        onCheckedChange={(checked) =>
                          updateConditionCriteria(index, 'hasMinValue', checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="relative w-full">
                        {condition.criteria.aggregationBasis === 'amount' && (
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                            ₹
                          </span>
                        )}
                        <Input
                          className={`border-[#E5E7EB] bg-card ${condition.criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                          type="number"
                          placeholder="Min Value"
                          value={condition.criteria.minValue || ''}
                          onChange={(e) =>
                            updateConditionCriteria(
                              index,
                              'minValue',
                              Number(e.target.value)
                            )
                          }
                          disabled={!condition.criteria.hasMinValue || isDisabled}
                          aria-label="Minimum value"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2">Max Value</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`hasMaxValue-invoice-${index}`}
                        checked={condition.criteria.hasMaxValue || false}
                        onCheckedChange={(checked) =>
                          updateConditionCriteria(index, 'hasMaxValue', checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="relative w-full">
                        {condition.criteria.aggregationBasis === 'amount' && (
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                            ₹
                          </span>
                        )}
                        <Input
                          className={`border-[#E5E7EB] bg-card ${condition.criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                          type="number"
                          placeholder="Max Value"
                          value={condition.criteria.maxValue || ''}
                          onChange={(e) =>
                            updateConditionCriteria(
                              index,
                              'maxValue',
                              Number(e.target.value)
                            )
                          }
                          disabled={!condition.criteria.hasMaxValue || isDisabled}
                          aria-label="Maximum value"
                        />
                      </div>
                    </div>
                  </div>
                  {condition.criteria.aggregationBasis === 'quantity' && (
                    <div>
                      <Label className="mb-2">UOM</Label>
                      <Select
                        value={condition.criteria.uom || 'pcs'}
                        onValueChange={(value) =>
                          updateConditionCriteria(index, 'uom', value)
                        }
                        disabled={isDisabled}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label="Select unit of measurement"
                        >
                          <SelectValue placeholder="Select UOM" />
                        </SelectTrigger>
                        <SelectContent>
                          {getUomOptionsForContext(condition).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {condition.conditionType === 'combo' && (
              <div className="space-y-4">
                <div>
                  <Label className="mb-2">Product Criteria</Label>
                  <div className="space-y-4">
                    {(
                      (condition.conditionType !== 'invoice' &&
                        condition.criteria.criteria) ||
                      []
                    ).map((criteria: any, criteriaIndex: number) => (
                      <div
                        key={criteria._id || criteriaIndex}
                        className="space-y-4 rounded-md border p-4"
                      >
                        {/* ID Hierarchy Selection */}
                        <ProductCriteriaSelect
                          criteria={criteria}
                          productOptions={productOptions}
                          products={products}
                          pricingGroupProducts={pricingGroupProducts}
                          onChange={(field, value) =>
                            handleProductCriteriaChange(
                              index,
                              criteriaIndex,
                              field,
                              value
                            )
                          }
                          disabled={isDisabled}
                          criteriaIndex={criteria._id || criteriaIndex}
                        />

                        {/* Aggregation Basis and Values */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <div>
                            <Label className="mb-2">Aggregation Basis</Label>
                            <Select
                              value={criteria.aggregationBasis || 'quantity'}
                              onValueChange={(value) => {
                                const updatedCriteria = [
                                  ...(condition.criteria.criteria || []),
                                ];
                                const nextCriteria = {
                                  ...criteria,
                                  aggregationBasis: value,
                                } as any;

                                if (value === 'quantity') {
                                  // Check if it's Naga brand with product selected, use baseUom
                                  const brand = brands.data?.find((b: any) => b.brandId === criteria.brandId);
                                  const isNaga = brand?.brandName?.toLowerCase() === 'naga';

                                  if (isNaga && criteria.productId && criteria.categoryId && criteria.subcategoryId) {
                                    const allProducts = [
                                      ...(pricingGroupProducts.data?.data?.items || []),
                                      ...(products.data?.data?.items || []),
                                    ];
                                    const product = allProducts.find(
                                      (p: any) => p.productId === criteria.productId
                                    );
                                    const baseUom = product?.baseUom || product?.baseuom;
                                    nextCriteria.uom = baseUom || criteria.uom || 'pcs';
                                  } else {
                                    nextCriteria.uom = criteria.uom || 'pcs';
                                  }
                                } else if (value === 'weight') {
                                  // When weight is selected, automatically set UOM to kg
                                  nextCriteria.uom = 'kg';
                                } else if ('uom' in nextCriteria) {
                                  delete nextCriteria.uom;
                                }

                                updatedCriteria[criteriaIndex] = nextCriteria;
                                updateConditionCriteria(
                                  index,
                                  'criteria',
                                  updatedCriteria
                                );
                              }}
                              disabled={isDisabled}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select aggregation basis" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">
                                  Amount Based
                                </SelectItem>
                                <SelectItem value="quantity">
                                  Quantity Based
                                </SelectItem>
                                <SelectItem value="weight">
                                  Weight Based
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-2">Min Value</Label>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`hasMinValue-${index}-${criteriaIndex}`}
                                checked={criteria.hasMinValue || false}
                                onCheckedChange={(checked) => {
                                  const updatedCriteria = [
                                    ...(condition.criteria.criteria || []),
                                  ];
                                  updatedCriteria[criteriaIndex] = {
                                    ...criteria,
                                    hasMinValue: checked,
                                  };
                                  updateConditionCriteria(
                                    index,
                                    'criteria',
                                    updatedCriteria
                                  );
                                }}
                                disabled={isDisabled}
                              />
                              <div className="relative w-full">
                                {criteria.aggregationBasis === 'amount' && (
                                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                                    ₹
                                  </span>
                                )}
                                <Input
                                  className={`border-[#E5E7EB] bg-card ${criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                                  type="number"
                                  placeholder="Min Value"
                                  value={criteria.minValue || ''}
                                  onChange={(e) => {
                                    const updatedCriteria = [
                                      ...(condition.criteria.criteria || []),
                                    ];
                                    updatedCriteria[criteriaIndex] = {
                                      ...criteria,
                                      minValue: Number(e.target.value),
                                    };
                                    updateConditionCriteria(
                                      index,
                                      'criteria',
                                      updatedCriteria
                                    );
                                  }}
                                  disabled={!criteria.hasMinValue || isDisabled}
                                  aria-label="Minimum value"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="mb-2">Max Value</Label>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`hasMaxValue-${index}-${criteriaIndex}`}
                                checked={criteria.hasMaxValue || false}
                                onCheckedChange={(checked) => {
                                  const updatedCriteria = [
                                    ...(condition.criteria.criteria || []),
                                  ];
                                  updatedCriteria[criteriaIndex] = {
                                    ...criteria,
                                    hasMaxValue: checked,
                                  };
                                  updateConditionCriteria(
                                    index,
                                    'criteria',
                                    updatedCriteria
                                  );
                                }}
                                disabled={isDisabled}
                              />
                              <div className="relative w-full">
                                {criteria.aggregationBasis === 'amount' && (
                                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                                    ₹
                                  </span>
                                )}
                                <Input
                                  className={`border-[#E5E7EB] bg-card ${criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                                  type="number"
                                  placeholder="Max Value"
                                  value={criteria.maxValue || ''}
                                  onChange={(e) => {
                                    const updatedCriteria = [
                                      ...(condition.criteria.criteria || []),
                                    ];
                                    updatedCriteria[criteriaIndex] = {
                                      ...criteria,
                                      maxValue: Number(e.target.value),
                                    };
                                    updateConditionCriteria(
                                      index,
                                      'criteria',
                                      updatedCriteria
                                    );
                                  }}
                                  disabled={!criteria.hasMaxValue || isDisabled}
                                  aria-label="Maximum value"
                                />
                              </div>
                            </div>
                          </div>
                          {(criteria.aggregationBasis === 'quantity' || criteria.aggregationBasis === 'weight') && (
                            <div>
                              <Label className="mb-2">UOM</Label>
                              <Select
                                value={criteria.uom || (criteria.aggregationBasis === 'weight' ? 'kg' : getProductBaseUom(criteria) || 'pcs')}
                                onValueChange={(value) => {
                                  const updatedCriteria = [
                                    ...(condition.criteria.criteria || []),
                                  ];
                                  updatedCriteria[criteriaIndex] = {
                                    ...criteria,
                                    uom: value,
                                  };
                                  updateConditionCriteria(
                                    index,
                                    'criteria',
                                    updatedCriteria
                                  );
                                }}
                                disabled={isDisabled || criteria.aggregationBasis === 'weight'}
                              >
                                <SelectTrigger
                                  className="w-full"
                                  aria-label="Select unit of measurement"
                                >
                                  <SelectValue placeholder="Select UOM" />
                                </SelectTrigger>
                                <SelectContent>
                                  {criteria.aggregationBasis === 'weight' ? (
                                    <SelectItem value="kg">KG</SelectItem>
                                  ) : (
                                    getUomOptionsForContext(condition, criteria).map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Remove Button */}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedCriteria = (
                                condition.criteria.criteria || []
                              ).filter(
                                (_: any, i: number) => i !== criteriaIndex
                              );
                              updateConditionCriteria(
                                index,
                                'criteria',
                                updatedCriteria
                              );
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove Criteria
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedCriteria = [
                          ...(condition.criteria.criteria || []),
                          {
                            _id: generateCriteriaId(), // Unique stable ID
                            brandId: '',
                            categoryId: '',
                            subcategoryId: '',
                            productId: '',
                            aggregationBasis: 'quantity',
                            uom: 'pcs',
                            hasMinValue: true,
                            minValue: 0,
                            hasMaxValue: false,
                          },
                        ];
                        updateConditionCriteria(
                          index,
                          'criteria',
                          updatedCriteria
                        );
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product Criteria
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {condition.conditionType === 'assorted' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <Label className="mb-2">Aggregation Basis</Label>
                    <Select
                      value={condition.criteria.aggregationBasis || 'quantity'}
                      onValueChange={(value) =>
                        updateConditionCriteria(
                          index,
                          'aggregationBasis',
                          value
                        )
                      }
                      disabled={isDisabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select aggregation basis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount Based</SelectItem>
                        <SelectItem value="quantity">Quantity Based</SelectItem>
                        <SelectItem value="weight">Weight Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2">Min Value</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`hasMinValue-assorted-${index}`}
                        checked={condition.criteria.hasMinValue || false}
                        onCheckedChange={(checked) =>
                          updateConditionCriteria(index, 'hasMinValue', checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="relative w-full">
                        {condition.criteria.aggregationBasis === 'amount' && (
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                            ₹
                          </span>
                        )}
                        <Input
                          className={`border-[#E5E7EB] bg-card ${condition.criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                          type="number"
                          placeholder="Min Value"
                          value={condition.criteria.minValue || ''}
                          onChange={(e) =>
                            updateConditionCriteria(
                              index,
                              'minValue',
                              Number(e.target.value)
                            )
                          }
                          disabled={!condition.criteria.hasMinValue || isDisabled}
                          aria-label="Minimum value"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2">Max Value</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`hasMaxValue-assorted-${index}`}
                        checked={condition.criteria.hasMaxValue || false}
                        onCheckedChange={(checked) =>
                          updateConditionCriteria(index, 'hasMaxValue', checked)
                        }
                        disabled={isDisabled}
                      />
                      <div className="relative w-full">
                        {condition.criteria.aggregationBasis === 'amount' && (
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                            ₹
                          </span>
                        )}
                        <Input
                          className={`border-[#E5E7EB] bg-card ${condition.criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                          type="number"
                          placeholder="Max Value"
                          value={condition.criteria.maxValue || ''}
                          onChange={(e) =>
                            updateConditionCriteria(
                              index,
                              'maxValue',
                              Number(e.target.value)
                            )
                          }
                          disabled={!condition.criteria.hasMaxValue || isDisabled}
                          aria-label="Maximum value"
                        />
                      </div>
                    </div>
                  </div>
                  {condition.criteria.aggregationBasis === 'quantity' && (
                    <div>
                      <Label className="mb-2">UOM</Label>
                      <Select
                        value={condition.criteria.uom || 'pcs'}
                        onValueChange={(value) =>
                          updateConditionCriteria(index, 'uom', value)
                        }
                        disabled={isDisabled}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label="Select unit of measurement"
                        >
                          <SelectValue placeholder="Select UOM" />
                        </SelectTrigger>
                        <SelectContent>
                          {getUomOptionsForContext(condition).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Product Criteria</Label>
                  <div className="space-y-4">
                    {(condition.criteria.criteria || []).map(
                      (criteria: any, criteriaIndex: number) => (
                        <div
                          key={criteria._id || criteriaIndex}
                          className="space-y-4 rounded-md border p-4"
                        >
                          {/* ID Hierarchy Selection */}
                          <ProductCriteriaSelect
                            criteria={criteria}
                            productOptions={productOptions}
                            products={products}
                            pricingGroupProducts={pricingGroupProducts}
                            onChange={(field, value) =>
                              handleProductCriteriaChange(
                                index,
                                criteriaIndex,
                                field,
                                value
                              )
                            }
                            disabled={isDisabled}
                            criteriaIndex={criteria._id || criteriaIndex}
                          />

                          {/* Aggregation Basis and Values */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                              <Label className="mb-2">Aggregation Basis</Label>
                              <Select
                                value={criteria.aggregationBasis || 'quantity'}
                                onValueChange={(value) => {
                                  const updatedCriteria = [
                                    ...(condition.criteria.criteria || []),
                                  ];
                                  const nextCriteria = {
                                    ...criteria,
                                    aggregationBasis: value,
                                  } as any;

                                  if (value === 'quantity') {
                                    nextCriteria.uom = criteria.uom || 'pcs';
                                  } else if (value === 'weight') {
                                    // When weight is selected, automatically set UOM to kg
                                    nextCriteria.uom = 'kg';
                                  } else if ('uom' in nextCriteria) {
                                    delete nextCriteria.uom;
                                  }

                                  updatedCriteria[criteriaIndex] = nextCriteria;
                                  updateConditionCriteria(
                                    index,
                                    'criteria',
                                    updatedCriteria
                                  );
                                }}
                                disabled={isDisabled}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select aggregation basis" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="amount">
                                    Amount Based
                                  </SelectItem>
                                  <SelectItem value="quantity">
                                    Quantity Based
                                  </SelectItem>
                                  <SelectItem value="weight">
                                    Weight Based
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="mb-2">Min Value</Label>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`hasMinValue-assorted-${index}-${criteriaIndex}`}
                                  checked={criteria.hasMinValue || false}
                                  onCheckedChange={(checked) => {
                                    const updatedCriteria = [
                                      ...(condition.criteria.criteria || []),
                                    ];
                                    updatedCriteria[criteriaIndex] = {
                                      ...criteria,
                                      hasMinValue: checked,
                                    };
                                    updateConditionCriteria(
                                      index,
                                      'criteria',
                                      updatedCriteria
                                    );
                                  }}
                                />
                                <div className="relative w-full">
                                  {criteria.aggregationBasis === 'amount' && (
                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                                      ₹
                                    </span>
                                  )}
                                  <Input
                                    className={`border-[#E5E7EB] bg-card ${criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                                    type="number"
                                    placeholder="Min Value"
                                    value={criteria.minValue || ''}
                                    onChange={(e) => {
                                      const updatedCriteria = [
                                        ...(condition.criteria.criteria || []),
                                      ];
                                      updatedCriteria[criteriaIndex] = {
                                        ...criteria,
                                        minValue: Number(e.target.value),
                                      };
                                      updateConditionCriteria(
                                        index,
                                        'criteria',
                                        updatedCriteria
                                      );
                                    }}
                                    disabled={!criteria.hasMinValue || isDisabled}
                                    aria-label="Minimum value"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label className="mb-2">Max Value</Label>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`hasMaxValue-assorted-${index}-${criteriaIndex}`}
                                  checked={criteria.hasMaxValue || false}
                                  onCheckedChange={(checked) => {
                                    const updatedCriteria = [
                                      ...(condition.criteria.criteria || []),
                                    ];
                                    updatedCriteria[criteriaIndex] = {
                                      ...criteria,
                                      hasMaxValue: checked,
                                    };
                                    updateConditionCriteria(
                                      index,
                                      'criteria',
                                      updatedCriteria
                                    );
                                  }}
                                />
                                <div className="relative w-full">
                                  {criteria.aggregationBasis === 'amount' && (
                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transform text-sm text-gray-500">
                                      ₹
                                    </span>
                                  )}
                                  <Input
                                    className={`border-[#E5E7EB] bg-card ${criteria.aggregationBasis === 'amount' ? 'pl-6' : ''}`}
                                    type="number"
                                    placeholder="Max Value"
                                    value={criteria.maxValue || ''}
                                    onChange={(e) => {
                                      const updatedCriteria = [
                                        ...(condition.criteria.criteria || []),
                                      ];
                                      updatedCriteria[criteriaIndex] = {
                                        ...criteria,
                                        maxValue: Number(e.target.value),
                                      };
                                      updateConditionCriteria(
                                        index,
                                        'criteria',
                                        updatedCriteria
                                      );
                                    }}
                                    disabled={!criteria.hasMaxValue || isDisabled}
                                    aria-label="Maximum value"
                                  />
                                </div>
                              </div>
                            </div>
                            {(criteria.aggregationBasis === 'quantity' || criteria.aggregationBasis === 'weight') && (
                              <div>
                                <Label className="mb-2">UOM</Label>
                                <Select
                                  value={criteria.uom || (criteria.aggregationBasis === 'weight' ? 'kg' : 'pcs')}
                                  onValueChange={(value) => {
                                    const updatedCriteria = [
                                      ...(condition.criteria.criteria || []),
                                    ];
                                    updatedCriteria[criteriaIndex] = {
                                      ...criteria,
                                      uom: value,
                                    };
                                    updateConditionCriteria(
                                      index,
                                      'criteria',
                                      updatedCriteria
                                    );
                                  }}
                                  disabled={isDisabled || criteria.aggregationBasis === 'weight'}
                                >
                                  <SelectTrigger
                                    className="w-full"
                                    aria-label="Select unit of measurement"
                                  >
                                    <SelectValue placeholder="Select UOM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {criteria.aggregationBasis === 'weight' ? (
                                      <SelectItem value="kg">KG</SelectItem>
                                    ) : (
                                      getUomOptionsForContext(condition, criteria).map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Remove Button */}
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedCriteria = (
                                  condition.criteria.criteria || []
                                ).filter(
                                  (_: any, i: number) => i !== criteriaIndex
                                );
                                updateConditionCriteria(
                                  index,
                                  'criteria',
                                  updatedCriteria
                                );
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove Criteria
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedCriteria = [
                          ...(condition.criteria.criteria || []),
                          {
                            _id: generateCriteriaId(), // Unique stable ID
                            brandId: '',
                            categoryId: '',
                            subcategoryId: '',
                            productId: '',
                            aggregationBasis: 'quantity',
                            uom: 'pcs',
                            hasMinValue: true,
                            minValue: 0,
                            hasMaxValue: false,
                          },
                        ];
                        updateConditionCriteria(
                          index,
                          'criteria',
                          updatedCriteria
                        );
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product Criteria
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {condition.conditionType === 'lineItem' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <Label className="mb-2">Minimum Line Total</Label>
                    <Input
                      className="border-[#E5E7EB] bg-card"
                      type="number"
                      value={condition.criteria.minLineTotal || ''}
                      onChange={(e) =>
                        updateConditionCriteria(
                          index,
                          'minLineTotal',
                          Number(e.target.value)
                        )
                      }
                      placeholder="Enter minimum line total"
                      disabled={isDisabled}
                    />
                  </div>
                  <div>
                    <Label className="mb-2">UOM</Label>
                    <Select
                      value={condition.criteria.uom || 'pcs'}
                      onValueChange={(value) =>
                        updateConditionCriteria(index, 'uom', value)
                      }
                      disabled={isDisabled}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label="Select unit of measurement"
                      >
                        <SelectValue placeholder="Select UOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUomOptionsForContext(condition).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter By Section */}
                <div>
                  <Label className="mb-4">Filter By</Label>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label className="mb-2">Brands</Label>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            openMultiSelectModal(
                              'brands',
                              'Select Brands for Line Item Filter',
                              'Choose brands to filter line items',
                              brandOptions.filter((option) =>
                                condition.criteria.filterBy?.brandIds?.includes(
                                  option.value
                                )
                              ),
                              (selectedOptions) => {
                                const selectedBrandIds = selectedOptions.map(
                                  (option) => option.value
                                );
                                updateConditionCriteria(index, 'filterBy', {
                                  ...condition.criteria.filterBy,
                                  brandIds: selectedBrandIds,
                                  // Reset categories, subcategories and products when brands change
                                  categoryIds: [],
                                  subcategoryIds: [],
                                  productIds: [],
                                });
                              },
                              isDisabled,
                              index
                            )
                          }
                          className="w-full justify-start"
                          disabled={brands.isLoading}
                        >
                          {(condition.criteria.filterBy?.brandIds?.length ||
                            0) > 0
                            ? `${condition.criteria.filterBy.brandIds.length} brand(s) selected`
                            : 'Select brands...'}
                        </Button>
                        {condition.criteria.filterBy?.brandIds &&
                          condition.criteria.filterBy.brandIds.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {condition.criteria.filterBy.brandIds
                                .slice(0, 2)
                                .map((brandId: string) => {
                                  const brand = brandOptions.find(
                                    (option) => option.value === brandId
                                  );
                                  return brand ? (
                                    <Badge
                                      key={brandId}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {brand.label}
                                    </Badge>
                                  ) : null;
                                })}
                              {condition.criteria.filterBy.brandIds.length >
                                2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +
                                    {condition.criteria.filterBy.brandIds.length -
                                      2}{' '}
                                    more
                                  </Badge>
                                )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2">Categories</Label>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            openMultiSelectModal(
                              'categories',
                              'Select Categories for Line Item Filter',
                              'Choose categories to filter line items',
                              categoryOptions.filter((option) =>
                                condition.criteria.filterBy?.categoryIds?.includes(
                                  option.value
                                )
                              ),
                              (selectedOptions) => {
                                const selectedCategoryIds = selectedOptions.map(
                                  (option) => option.value
                                );
                                updateConditionCriteria(index, 'filterBy', {
                                  ...condition.criteria.filterBy,
                                  categoryIds: selectedCategoryIds,
                                  // Reset subcategories and products when categories change
                                  subcategoryIds: [],
                                  productIds: [],
                                });
                              },
                              isDisabled,
                              index
                            )
                          }
                          className="w-full justify-start"
                          disabled={
                            categories.isLoading ||
                            !condition.criteria.filterBy?.brandIds?.length
                          }
                        >
                          {(condition.criteria.filterBy?.categoryIds?.length ||
                            0) > 0
                            ? `${condition.criteria.filterBy.categoryIds.length} category(ies) selected`
                            : condition.criteria.filterBy?.brandIds?.length
                              ? 'Select categories...'
                              : 'Select brands first...'}
                        </Button>
                        {condition.criteria.filterBy?.categoryIds &&
                          condition.criteria.filterBy.categoryIds.length >
                          0 && (
                            <div className="flex flex-wrap gap-1">
                              {condition.criteria.filterBy.categoryIds
                                .slice(0, 2)
                                .map((categoryId: string) => {
                                  const category = categoryOptions.find(
                                    (option) => option.value === categoryId
                                  );
                                  return category ? (
                                    <Badge
                                      key={categoryId}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {category.label}
                                    </Badge>
                                  ) : null;
                                })}
                              {condition.criteria.filterBy.categoryIds.length >
                                2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +
                                    {condition.criteria.filterBy.categoryIds
                                      .length - 2}{' '}
                                    more
                                  </Badge>
                                )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2">Subcategories</Label>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            openMultiSelectModal(
                              'subcategories',
                              'Select Subcategories for Line Item Filter',
                              'Choose subcategories to filter line items',
                              subcategoryOptions.filter((option) =>
                                condition.criteria.filterBy?.subcategoryIds?.includes(
                                  option.value
                                )
                              ),
                              (selectedOptions) => {
                                const selectedSubcategoryIds =
                                  selectedOptions.map((option) => option.value);
                                updateConditionCriteria(index, 'filterBy', {
                                  ...condition.criteria.filterBy,
                                  subcategoryIds: selectedSubcategoryIds,
                                  // Reset products when subcategories change
                                  productIds: [],
                                });
                              },
                              isDisabled,
                              index
                            )
                          }
                          className="w-full justify-start"
                          disabled={
                            subcategories.isLoading ||
                            !condition.criteria.filterBy?.categoryIds?.length
                          }
                        >
                          {(condition.criteria.filterBy?.subcategoryIds
                            ?.length || 0) > 0
                            ? `${condition.criteria.filterBy.subcategoryIds.length} subcategory(ies) selected`
                            : condition.criteria.filterBy?.categoryIds?.length
                              ? 'Select subcategories...'
                              : 'Select categories first...'}
                        </Button>
                        {condition.criteria.filterBy?.subcategoryIds &&
                          condition.criteria.filterBy.subcategoryIds.length >
                          0 && (
                            <div className="flex flex-wrap gap-1">
                              {condition.criteria.filterBy.subcategoryIds
                                .slice(0, 2)
                                .map((subcategoryId: string) => {
                                  const subcategory = subcategoryOptions.find(
                                    (option) => option.value === subcategoryId
                                  );
                                  return subcategory ? (
                                    <Badge
                                      key={subcategoryId}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {subcategory.label}
                                    </Badge>
                                  ) : null;
                                })}
                              {condition.criteria.filterBy.subcategoryIds
                                .length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +
                                    {condition.criteria.filterBy.subcategoryIds
                                      .length - 2}{' '}
                                    more
                                  </Badge>
                                )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2">Products</Label>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            openMultiSelectModal(
                              'products',
                              'Select Products for Line Item Filter',
                              'Choose products to filter line items',
                              productOptions.filter((option: any) =>
                                condition.criteria.filterBy?.productIds?.includes(
                                  option.value
                                )
                              ),
                              (selectedOptions) => {
                                const selectedProductIds = selectedOptions.map(
                                  (option) => option.value
                                );
                                updateConditionCriteria(index, 'filterBy', {
                                  ...condition.criteria.filterBy,
                                  productIds: selectedProductIds,
                                });
                              },
                              isDisabled,
                              index
                            )
                          }
                          className="w-full justify-start"
                          disabled={pricingGroupProducts.isLoading}
                        >
                          {(condition.criteria.filterBy?.productIds?.length ||
                            0) > 0
                            ? `${condition.criteria.filterBy.productIds.length} product(s) selected`
                            : 'Select products...'}
                        </Button>
                        {condition.criteria.filterBy?.productIds &&
                          condition.criteria.filterBy.productIds.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {condition.criteria.filterBy.productIds
                                .slice(0, 2)
                                .map((productId: string) => {
                                  const product = productOptions.find(
                                    (option: any) => option.value === productId
                                  );
                                  return product ? (
                                    <Badge
                                      key={productId}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {product.label.split(' (')[0]}
                                    </Badge>
                                  ) : null;
                                })}
                              {condition.criteria.filterBy.productIds.length >
                                2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +
                                    {condition.criteria.filterBy.productIds
                                      .length - 2}{' '}
                                    more
                                  </Badge>
                                )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reward configuration */}
          <div className="space-y-4">
            <Label className="mt-8 mb-4">Reward</Label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label className="mb-2">Reward Type</Label>
                <Select
                  value={condition.reward.type || 'discountPercent'}
                  onValueChange={(value) =>
                    updateConditionReward(index, 'type', value)
                  }
                  disabled={isDisabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select reward type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discountPercent">
                      Discount Percentage
                    </SelectItem>
                    <SelectItem value="discountFixed">
                      Fixed Discount
                    </SelectItem>
                    <SelectItem value="freeProduct">Free Product</SelectItem>
                    <SelectItem value="productDiscount">Product Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {condition.reward.type !== 'freeProduct' && condition.reward.type !== 'productDiscount' && (
                <div>
                  <Label className="mb-2">Value</Label>
                  <Input
                    className="border-[#E5E7EB] bg-card"
                    type="number"
                    step="0.01"
                    value={condition.reward.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Check if value has more than 2 decimal places
                      if (value !== '' && value.includes('.')) {
                        const decimalPart = value.split('.')[1];
                        if (decimalPart && decimalPart.length > 2) {
                          return; // Don't update if more than 2 decimal places
                        }
                      }
                      updateConditionReward(index, 'value', value === '' ? '' : value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value !== '' && value !== '.') {
                        // Round to 2 decimal places
                        const numValue = parseFloat(value);
                        updateConditionReward(index, 'value', Math.round(numValue * 100) / 100);
                      }
                    }}
                    placeholder="Enter value"
                    disabled={isDisabled}
                  />
                </div>
              )}

              {condition.reward.type !== 'freeProduct' && condition.reward.type !== 'productDiscount' && (
                <div>
                  <Label className="mb-2">Max Reward Amount</Label>
                  <Input
                    className="border-[#E5E7EB] bg-card"
                    type="number"
                    value={condition.reward.maxRewardAmount || ''}
                    onChange={(e) =>
                      updateConditionReward(
                        index,
                        'maxRewardAmount',
                        Number(e.target.value)
                      )
                    }
                    placeholder="Enter max amount"
                    disabled={isDisabled}
                  />
                </div>
              )}
            </div>

            {condition.reward.type === 'freeProduct' && (
              <div>
                <Label className="mb-2">Free Products</Label>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Check if warehouses are selected before opening modal
                        if ((formData.applicableTo.warehouseIds?.length || 0) === 0) {
                          return;
                        }
                        const currentSelected = (
                          condition.reward.products || []
                        )
                          .map((p: any) => {
                            const option = productOptions.find(
                              (o: any) => o.value === p.productId
                            );
                            return option ? option : null;
                          })
                          .filter(Boolean) as {
                            value: string;
                            label: string;
                          }[];
                        openMultiSelectModal(
                          'free-products',
                          'Select Free Products',
                          'Choose one or more products to offer for free',
                          currentSelected,
                          (selectedOptions) => {
                            const existing = condition.reward.products || [];
                            const nextProducts = selectedOptions.map((opt) => {
                              const found = existing.find(
                                (p: any) => p.productId === opt.value
                              );
                              return {
                                productId: opt.value,
                                quantity: found?.quantity ?? 1,
                              };
                            });
                            updateConditionReward(
                              index,
                              'products',
                              nextProducts
                            );
                          },
                          isDisabled
                        );
                      }}
                      className="ml-auto"
                      disabled={
                        products.isLoading ||
                        isDisabled ||
                        (formData.applicableTo.warehouseIds?.length || 0) === 0
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products
                    </Button>
                  </div>
                  {(formData.applicableTo.warehouseIds?.length || 0) === 0 && (
                    <p className="text-muted-foreground text-xs">
                      Select at least one warehouse to choose products
                    </p>
                  )}
                  {(condition.reward.products || []).map(
                    (product: any, productIndex: number) => (
                      <div
                        key={productIndex}
                        className="space-y-3 rounded-md border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-sm">
                            <span className="font-medium">
                              {productOptions.find(
                                (o: any) => o.value === product.productId
                              )?.label || 'Product not found'}
                            </span>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-[10px]">Free</Badge>
                            </div>
                          </div>

                          <div className="w-32">
                            <Label className="mb-1 text-xs">Quantity</Label>
                            <Input
                              className="border-[#E5E7EB] bg-card"
                              type="number"
                              placeholder="Qty"
                              value={product.quantity || ''}
                              onChange={(e) => {
                                const updatedProducts = [
                                  ...(condition.reward.products || []),
                                ];
                                updatedProducts[productIndex] = {
                                  ...product,
                                  quantity: Number(e.target.value),
                                };
                                updateConditionReward(
                                  index,
                                  'products',
                                  updatedProducts
                                );
                              }}
                              disabled={isDisabled}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedProducts = (
                                condition.reward.products || []
                              ).filter((_: any, i: number) => i !== productIndex);
                              updateConditionReward(
                                index,
                                'products',
                                updatedProducts
                              );
                            }}
                            className="text-destructive hover:text-destructive"
                            disabled={isDisabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                  {/* Total Summary */}
                  <div className="bg-muted mt-4 flex justify-end gap-4 rounded-md p-3">
                    <div className="text-sm">
                      <span className="font-medium">Total Amount: </span>
                      <span className="text-muted-foreground">
                        ₹
                        {condition.reward.products
                          ?.reduce((total: number, product: any) => {
                            const selectedProduct =
                              pricingGroupProducts.data?.data?.items?.find(
                                (p: any) => p.productId === product.productId
                              );
                            // Pricing group products might have price in pricingGroup array
                            const price = selectedProduct?.pricingGroup?.[0]?.price || selectedProduct?.minimumPrice || 0;
                            return (
                              total +
                              price *
                              (product.quantity || 0)
                            );
                          }, 0)
                          .toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Total KG: </span>
                      <span className="text-muted-foreground">
                        {condition.reward.products
                          ?.reduce((total: number, product: any) => {
                            const selectedProduct =
                              pricingGroupProducts.data?.data?.items?.find(
                                (p: any) => p.productId === product.productId
                              );
                            return (
                              total +
                              (selectedProduct?.capacity || 0) *
                              (product.quantity || 0)
                            );
                          }, 0)
                          .toFixed(2) || '0.00'}{' '}
                        kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {condition.reward.type === 'productDiscount' && (
              <div>
                <Label className="mb-2">Discounted Products</Label>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Check if warehouses are selected before opening modal
                        if ((formData.applicableTo.warehouseIds?.length || 0) === 0) {
                          return;
                        }
                        const currentSelected = (
                          condition.reward.discountedProducts || []
                        )
                          .map((p: any) => {
                            const option = productOptions.find(
                              (o: any) => o.value === p.productId
                            );
                            return option ? option : null;
                          })
                          .filter(Boolean) as {
                            value: string;
                            label: string;
                          }[];
                        openMultiSelectModal(
                          'free-products',
                          'Select Products for Discount',
                          'Choose one or more products to apply discount',
                          currentSelected,
                          (selectedOptions) => {
                            const existing = condition.reward.discountedProducts || [];
                            const nextProducts = selectedOptions.map((opt) => {
                              const found = existing.find(
                                (p: any) => p.productId === opt.value
                              );
                              return {
                                productId: opt.value,
                                quantity: found?.quantity ?? 1,
                                type: found?.type || 'discountPercent',
                                value: found?.value ?? 0,
                              };
                            });
                            updateConditionReward(
                              index,
                              'discountedProducts',
                              nextProducts
                            );
                          },
                          isDisabled
                        );
                      }}
                      className="ml-auto"
                      disabled={
                        products.isLoading ||
                        isDisabled ||
                        (formData.applicableTo.warehouseIds?.length || 0) === 0
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products
                    </Button>
                  </div>
                  {(formData.applicableTo.warehouseIds?.length || 0) === 0 && (
                    <p className="text-muted-foreground text-xs">
                      Select at least one warehouse to choose products
                    </p>
                  )}
                  {(condition.reward.discountedProducts || []).map(
                    (product: any, productIndex: number) => (
                      <div
                        key={productIndex}
                        className="space-y-3 rounded-md border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-sm">
                            <span className="font-medium">
                              {productOptions.find(
                                (o: any) => o.value === product.productId
                              )?.label || 'Product not found'}
                            </span>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {product.type === 'discountPercent'
                                  ? `Discount: ${product.value ?? 0}%`
                                  : `Discount: ₹${product.value ?? 0}`}
                              </Badge>
                            </div>
                          </div>

                          <div className="w-32">
                            <Label className="mb-1 text-xs">Quantity</Label>
                            <Input
                              className="border-[#E5E7EB] bg-card"
                              type="number"
                              placeholder="Qty"
                              value={product.quantity || ''}
                              onChange={(e) => {
                                const updatedProducts = [
                                  ...(condition.reward.discountedProducts || []),
                                ];
                                updatedProducts[productIndex] = {
                                  ...product,
                                  quantity: Number(e.target.value),
                                };
                                updateConditionReward(
                                  index,
                                  'discountedProducts',
                                  updatedProducts
                                );
                              }}
                              disabled={isDisabled}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedProducts = (
                                condition.reward.discountedProducts || []
                              ).filter((_: any, i: number) => i !== productIndex);
                              updateConditionReward(
                                index,
                                'discountedProducts',
                                updatedProducts
                              );
                            }}
                            className="text-destructive hover:text-destructive"
                            disabled={isDisabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <Label className="mb-1 text-xs">Discount Type</Label>
                            <Select
                              value={product.type || 'discountPercent'}
                              onValueChange={(value) => {
                                const updatedProducts = [
                                  ...(condition.reward.discountedProducts || []),
                                ];
                                updatedProducts[productIndex] = {
                                  ...product,
                                  type: value,
                                };
                                updateConditionReward(
                                  index,
                                  'discountedProducts',
                                  updatedProducts
                                );
                              }}
                              disabled={isDisabled}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select discount type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="discountPercent">Percentage (%)</SelectItem>
                                <SelectItem value="discountFixed">Fixed Amount (₹)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-1 text-xs">Discount Value</Label>
                            <Input
                              className="border-[#E5E7EB] bg-card"
                              type="number"
                              step="0.01"
                              value={product.value ?? ''}
                              onChange={(e) => {
                                const updatedProducts = [
                                  ...(condition.reward.discountedProducts || []),
                                ];
                                updatedProducts[productIndex] = {
                                  ...product,
                                  value: e.target.value === '' ? 0 : Number(e.target.value),
                                };
                                updateConditionReward(
                                  index,
                                  'discountedProducts',
                                  updatedProducts
                                );
                              }}
                              placeholder="Enter discount value"
                              disabled={isDisabled}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isEditMode && isLoadingScheme && !formData.status) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Loading scheme data..." />
      </section>
    );
  }

  if (isEditMode && schemeError) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading scheme data. Please try again." />
      </section>
    );
  }

  if (isEditMode && !isLoadingScheme && !schemeData) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Scheme not found. Please check the URL and try again." />
      </section>
    );
  }

  return (
    <section className="h-full w-full space-y-6 overflow-y-auto">
      <BreadcrumbHeader
        {...getBreadcrumbData('schemes', isEditMode ? 'edit' : 'create')}
      />

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-lg bg-card p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Basic Information
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div className="relative">
              <Label className="mb-2">
                Scheme Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  className={`bg-card pr-10 ${formErrors.schemeName ? 'border-red-500 focus:border-red-500' : 'border-[#E5E7EB]'}`}
                  placeholder="Enter scheme name"
                  value={formData.schemeName}
                  disabled={isFieldsDisabled}
                  onChange={(e) => {
                    handleInputChange('schemeName', e.target.value);
                    if (formErrors.schemeName) {
                      setFormErrors((prev) => ({ ...prev, schemeName: '' }));
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 transform p-0"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  title="Get name suggestions"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </Button>
              </div>
              {formErrors.schemeName && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.schemeName}
                </p>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && generateSchemeNameSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-card shadow-lg"
                >
                  <div className="border-b border-gray-100 p-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Suggested Names
                    </p>
                    <p className="text-xs text-gray-500">
                      Based on your selections
                    </p>
                  </div>
                  {generateSchemeNameSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="flex flex-col">
                        <span className="truncate font-medium">
                          {suggestion.name}
                        </span>
                        <span className="truncate text-xs text-gray-500">
                          {suggestion.reason}
                        </span>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-gray-100 p-2">
                    <button
                      type="button"
                      className="w-full text-center text-xs text-gray-500 hover:text-muted-foreground"
                      onClick={() => setShowSuggestions(false)}
                    >
                      Close suggestions
                    </button>
                  </div>
                </div>
              )}

              {/* Suggestion hint */}
              {!showSuggestions && generateSchemeNameSuggestions.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  <p>
                    💡 Click the lightning icon for name suggestions based on
                    your selections
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {formData.applicableTo.brandIds.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formData.applicableTo.brandIds.length} brand(s)
                      </Badge>
                    )}
                    {formData.applicableTo.categoryIds.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formData.applicableTo.categoryIds.length} category(ies)
                      </Badge>
                    )}
                    {formData.applicableTo.productIds.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formData.applicableTo.productIds.length} product(s)
                      </Badge>
                    )}
                    {formData.conditions.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formData.conditions.length} condition(s)
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label className="mb-2">
                Max Reward Per Invoice <span className="text-red-500">*</span>
              </Label>
              <Input
                className={`bg-card ${formErrors.maxRewardPerInvoice ? 'border-red-500 focus:border-red-500' : 'border-[#E5E7EB]'}`}
                type="number"
                placeholder="Enter max reward"
                value={formData.maxRewardPerInvoice}
                disabled={isFieldsDisabled}
                onChange={(e) => {
                  handleInputChange(
                    'maxRewardPerInvoice',
                    Number(e.target.value)
                  );
                  if (formErrors.maxRewardPerInvoice) {
                    setFormErrors((prev) => ({
                      ...prev,
                      maxRewardPerInvoice: '',
                    }));
                  }
                }}
              />
              {formErrors.maxRewardPerInvoice && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.maxRewardPerInvoice}
                </p>
              )}
            </div>
            {isEditMode && (
              <div>
                <Label className="mb-2">Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={(value) => {
                    // Set the status directly since we only have ACTIVE and INACTIVE options
                    handleInputChange('status', value);
                  }}
                  disabled={isStatusDisabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING" disabled={true}>
                      Pending
                    </SelectItem>
                    <SelectItem value="ACTIVE" disabled={isStatusDisabled}>
                      Active
                    </SelectItem>
                    <SelectItem value="INACTIVE" disabled={isStatusDisabled}>
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isStatusDisabled && (
                  <p className="mt-1 text-sm text-gray-500">
                    Status cannot be changed while scheme is pending approval
                  </p>
                )}
              </div>
            )}
            <div>
              <Label className="mb-2">
                Valid From <span className="text-red-500">*</span>
              </Label>
              <Input
                className={`bg-card ${formErrors.validFrom ? 'border-red-500 focus:border-red-500' : 'border-[#E5E7EB]'}`}
                type="date"
                value={formData.validFrom}
                disabled={isFieldsDisabled}
                onChange={(e) => {
                  handleInputChange('validFrom', e.target.value);
                  if (formErrors.validFrom) {
                    setFormErrors((prev) => ({ ...prev, validFrom: '' }));
                  }
                }}
                max={formData.validTo || undefined}
              />
              {formErrors.validFrom && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.validFrom}
                </p>
              )}
            </div>
            <div>
              <Label className="mb-2">
                Valid To <span className="text-red-500">*</span>
              </Label>
              <Input
                className={`bg-card ${formErrors.validTo ? 'border-red-500 focus:border-red-500' : 'border-[#E5E7EB]'}`}
                type="date"
                value={formData.validTo}
                disabled={isFieldsDisabled}
                onChange={(e) => {
                  handleInputChange('validTo', e.target.value);
                  if (formErrors.validTo) {
                    setFormErrors((prev) => ({ ...prev, validTo: '' }));
                  }
                }}
                min={formData.validFrom || undefined}
              />
              {formErrors.validTo && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.validTo}
                </p>
              )}
            </div>
            <div className="flex h-full flex-col md:col-start-3 md:row-span-2 md:row-start-1">
              <Label className="mb-2">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                className={`min-h-[100px] flex-1 bg-card ${formErrors.description ? 'border-red-500 focus:border-red-500' : 'border-[#E5E7EB]'}`}
                placeholder="Enter scheme description"
                value={formData.description}
                disabled={isFieldsDisabled}
                onChange={(e) => {
                  handleInputChange('description', e.target.value);
                  if (formErrors.description) {
                    setFormErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Applicable To */}
        <div className="rounded-lg bg-card p-4">
          <div className="bg-background mb-4 flex items-center gap-2 rounded-lg p-2 text-lg font-medium">
            <span>Applicable To</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground h-4 w-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Any one field needs to be selected</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div>
              <Label className="mb-2">Channels</Label>
              <div className="space-y-2">
                <MasterRecordDropdown
                  masterName="channel"
                  value={formData.applicableTo.channelIds[0] || ''}
                  onChange={(value?: string) =>
                    handleApplicableToChange('channelIds', value ? [value] : [])
                  }
                  disabled={channels.isLoading || isFieldsDisabled}
                  placeholder="Select channel"
                  instanceKey="schemes_channels"
                />
                {formData.applicableTo.channelIds[0] && (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {channelOptionsWithSelected.find((o: any) => o.value === formData.applicableTo.channelIds[0])?.label || formData.applicableTo.channelIds[0]}
                    </Badge>
                  </div>
                )}
                {channels.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading channels...
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2">Warehouses</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openMultiSelectModal(
                      'warehouses',
                      'Select Warehouses',
                      'Choose warehouses that this scheme applies to',
                      selectedWarehouseOptions,
                      handleWarehouseSelection,
                      isFieldsDisabled
                    )
                  }
                  className="w-full justify-start"
                  disabled={warehouses.isLoading || !isChannelSelected || isFieldsDisabled}
                >
                  {selectedWarehouseOptions.length > 0
                    ? `${selectedWarehouseOptions.length} warehouse(s) selected`
                    : 'Select warehouses...'}
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose warehouses
                  </p>
                )}
                {selectedWarehouseOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedWarehouseOptions
                      .slice(0, 3)
                      .map((option: { value: string; label: string }) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.label}
                        </Badge>
                      ))}
                    {selectedWarehouseOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedWarehouseOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {warehouses.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading warehouses...
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2">Business Types</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openMultiSelectModal(
                    'businessTypes',
                    'Select Business Types',
                    'Choose business types to filter outlets',
                    selectedBusinessTypeOptions,
                    handleBusinessTypeSelection,
                    isFieldsDisabled
                  )}
                  className="w-full justify-start"
                  disabled={businessTypes.isLoading || !isChannelSelected || isFieldsDisabled}
                >
                  {selectedBusinessTypeOptions.length > 0
                    ? `${selectedBusinessTypeOptions.length} business type(s) selected`
                    : 'Select business types...'
                  }
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose business types
                  </p>
                )}
                {selectedBusinessTypeOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedBusinessTypeOptions.slice(0, 3).map((option: { value: string; label: string }) => (
                      <Badge key={option.value} variant="secondary" className="text-xs">
                        {option.label}
                      </Badge>
                    ))}
                    {selectedBusinessTypeOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedBusinessTypeOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {businessTypes.isLoading && (
                  <p className="text-sm text-muted-foreground">Loading business types...</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2">Outlets</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openMultiSelectModal(
                      'outlets',
                      'Select Outlets',
                      'Choose outlets that this scheme applies to',
                      selectedOutletOptions,
                      handleOutletSelection,
                      isFieldsDisabled
                    )
                  }
                  className="w-full justify-start"
                  disabled={
                    outlets.isLoading ||
                    !isChannelSelected ||
                    (formData.applicableTo.warehouseIds?.length || 0) === 0 ||
                    isFieldsDisabled
                  }
                >
                  {selectedOutletOptions.length > 0
                    ? `${selectedOutletOptions.length} outlet(s) selected`
                    : 'Select outlets...'}
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose outlets
                  </p>
                )}
                {isChannelSelected && (formData.applicableTo.warehouseIds?.length || 0) === 0 && (
                  <p className="text-muted-foreground text-xs">
                    Select at least one warehouse to choose outlets
                  </p>
                )}
                {selectedOutletOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedOutletOptions
                      .slice(0, 3)
                      .map((option: { value: string; label: string }) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.label}
                        </Badge>
                      ))}
                    {selectedOutletOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedOutletOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {outlets.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading outlets...
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2">Brands</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openMultiSelectModal(
                      'brands',
                      'Select Brands',
                      'Choose brands that this scheme applies to',
                      selectedBrandOptions,
                      handleBrandSelection,
                      isFieldsDisabled
                    )
                  }
                  className="w-full justify-start"
                  disabled={brands.isLoading || !isChannelSelected || isFieldsDisabled}
                >
                  {selectedBrandOptions.length > 0
                    ? `${selectedBrandOptions.length} brand(s) selected`
                    : 'Select brands...'}
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose brands
                  </p>
                )}
                {selectedBrandOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedBrandOptions
                      .slice(0, 3)
                      .map((option: { value: string; label: string }) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.label}
                        </Badge>
                      ))}
                    {selectedBrandOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedBrandOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {brands.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading brands...
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2">Categories</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (formData.applicableTo.brandIds.length === 0) {
                      return; // Don't open modal if no brands selected
                    }
                    openMultiSelectModal(
                      'categories',
                      'Select Categories',
                      'Choose categories from the selected brands that this scheme applies to',
                      selectedCategoryOptions,
                      handleCategorySelection,
                      isFieldsDisabled
                    );
                  }}
                  className="w-full justify-start"
                  disabled={
                    categories.isLoading ||
                    !isChannelSelected ||
                    formData.applicableTo.brandIds.length === 0 ||
                    isFieldsDisabled
                  }
                >
                  {selectedCategoryOptions.length > 0
                    ? `${selectedCategoryOptions.length} category(ies) selected`
                    : 'Select categories...'}
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose categories
                  </p>
                )}
                {isChannelSelected && formData.applicableTo.brandIds.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    Select brands first to enable category selection
                  </p>
                )}
                {selectedCategoryOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedCategoryOptions
                      .slice(0, 3)
                      .map((option: { value: string; label: string }) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.label}
                        </Badge>
                      ))}
                    {selectedCategoryOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedCategoryOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {categories.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading categories...
                  </p>
                )}
              </div>
            </div>

            {/* Products Row */}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">

            <div>
              <Label className="mb-2">Subcategories</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (formData.applicableTo.categoryIds.length === 0) {
                      return; // Don't open modal if no categories selected
                    }
                    openMultiSelectModal(
                      'subcategories',
                      'Select Subcategories',
                      'Choose subcategories from the selected categories that this scheme applies to',
                      selectedSubcategoryOptions,
                      handleSubcategorySelection,
                      isFieldsDisabled
                    );
                  }}
                  className="w-full justify-start"
                  disabled={
                    subcategories.isLoading ||
                    !isChannelSelected ||
                    formData.applicableTo.categoryIds.length === 0 ||
                    isFieldsDisabled
                  }
                >
                  {selectedSubcategoryOptions.length > 0
                    ? `${selectedSubcategoryOptions.length} subcategory(ies) selected`
                    : 'Select subcategories...'}
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose subcategories
                  </p>
                )}
                {isChannelSelected && formData.applicableTo.categoryIds.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    Select categories first to enable subcategory selection
                  </p>
                )}
                {selectedSubcategoryOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedSubcategoryOptions
                      .slice(0, 3)
                      .map((option: { value: string; label: string }) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.label}
                        </Badge>
                      ))}
                    {selectedSubcategoryOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedSubcategoryOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {subcategories.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading subcategories...
                  </p>
                )}
              </div>
            </div>
            <div >
              <Label className="mb-2">Products</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openMultiSelectModal(
                      'products',
                      'Select Products',
                      formData.applicableTo.brandIds.length > 0 ||
                        formData.applicableTo.categoryIds.length > 0 ||
                        formData.applicableTo.subcategoryIds.length > 0
                        ? 'Choose products from the selected brands, categories, and subcategories that this scheme applies to'
                        : 'Choose products that this scheme applies to',
                      selectedProductOptions,
                      handleProductSelection,
                      isFieldsDisabled
                    )
                  }
                  className="w-full justify-start"
                  disabled={
                    pricingGroupProducts.isLoading ||
                    !isChannelSelected ||
                    (formData.applicableTo.warehouseIds?.length || 0) === 0 ||
                    isFieldsDisabled
                  }
                >
                  {selectedProductOptions.length > 0
                    ? `${selectedProductOptions.length} product(s) selected`
                    : 'Select products...'}
                </Button>
                {!isChannelSelected && (
                  <p className="text-muted-foreground text-xs">
                    Select a channel first to choose products
                  </p>
                )}
                {isChannelSelected && (formData.applicableTo.warehouseIds?.length || 0) === 0 && (
                  <p className="text-muted-foreground text-xs">
                    Select at least one warehouse to choose products
                  </p>
                )}
                {(formData.applicableTo.warehouseIds?.length || 0) > 0 &&
                  (formData.applicableTo.brandIds.length > 0 ||
                    formData.applicableTo.categoryIds.length > 0 ||
                    formData.applicableTo.subcategoryIds.length > 0) && (
                    <p className="text-muted-foreground text-xs">
                      Products will be filtered by selected brands
                      {formData.applicableTo.categoryIds.length > 0 &&
                        ', categories'}
                      {formData.applicableTo.subcategoryIds.length > 0 &&
                        ', and subcategories'}
                    </p>
                  )}
                {selectedProductOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedProductOptions
                      .slice(0, 3)
                      .map((option: { value: string; label: string }) => (
                        <Badge
                          key={option.value}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.label}
                        </Badge>
                      ))}
                    {selectedProductOptions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedProductOptions.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {pricingGroupProducts.isLoading && (
                  <p className="text-muted-foreground text-sm">
                    Loading products...
                  </p>
                )}
              </div>
            </div>
          </div>


        </div>

        {/* Conditions */}
        <div className="rounded-lg bg-card p-4">
          <div className="bg-background mb-4 flex items-center justify-between rounded-lg p-2 text-lg font-medium">
            <span>
              Conditions & Rewards <span className="text-red-500">*</span>
            </span>
            <Button
              type="button"
              onClick={addCondition}
              variant="outline"
              size="sm"
              disabled={isFieldsDisabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Condition
            </Button>
          </div>
          {formErrors.conditions && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-600">
                {formErrors.conditions}
              </p>
            </div>
          )}
          <div className="space-y-4">
            {formData.conditions.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No conditions added yet. Click "Add Condition" to get started.
              </div>
            ) : (
              formData.conditions.map((condition, index) =>
                renderConditionForm(condition, index, isFieldsDisabled)
              )
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href={NavKeys.DashboardSchemes}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              createSchemeMutation.isPending ||
              updateSchemeMutation.isPending
            }
          >
            {isSubmitting ||
              createSchemeMutation.isPending ||
              updateSchemeMutation.isPending
              ? 'Saving...'
              : isEditMode
                ? 'Update Scheme'
                : 'Create Scheme'}
          </Button>
        </div>
      </form>

      {/* Multi-Select Modal */}
      <MultiSelectModal
        open={modalState.open}
        onOpenChange={closeModal}
        title={modalState.title}
        description={modalState.description}
        options={
          modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
            ? productOptions
            : modalState.type === 'outlets'
              ? outletOptions
              : modalState.type === 'warehouses'
                ? warehouseOptions
                : modalState.type === 'channels'
                  ? channelOptions
                  : modalState.type === 'businessTypes'
                    ? businessTypeOptions
                    : modalState.type === 'brands'
                      ? brandOptions
                      : modalState.type === 'categories'
                        ? categoryOptions
                        : modalState.type === 'subcategories'
                          ? subcategoryOptions
                          : []
        }
        value={modalState.currentValue}
        onChange={modalState.onConfirm}
        placeholder={
          modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
            ? 'Search products...'
            : modalState.type === 'outlets'
              ? 'Search outlets...'
              : modalState.type === 'warehouses'
                ? "Search warehouses..."
                : modalState.type === 'channels'
                  ? "Search channels..."
                  : modalState.type === 'businessTypes'
                    ? "Search business types..."
                    : modalState.type === 'brands'
                      ? 'Search brands...'
                      : modalState.type === 'categories'
                        ? 'Search categories...'
                        : modalState.type === 'subcategories'
                          ? 'Search subcategories...'
                          : 'Search...'
        }
        isLoading={
          modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
            ? pricingGroupProducts.isLoading
            : modalState.type === 'outlets'
              ? outlets.isLoading
              : modalState.type === 'warehouses'
                ? warehouses.isLoading
                : modalState.type === 'channels'
                  ? channels.isLoading
                  : modalState.type === 'businessTypes'
                    ? businessTypes.isLoading
                    : modalState.type === 'brands'
                      ? brands.isLoading
                      : modalState.type === 'categories'
                        ? categories.isLoading
                        : modalState.type === 'subcategories'
                          ? subcategories.isLoading
                          : false
        }
        pageSize={modalState.type === 'outlets' ? 100 : 10}
        totalItems={
          modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
            ? pricingGroupProducts.data?.data?.items?.length || 0
            : modalState.type === 'outlets'
              ? outletOptions.length
              : modalState.type === 'warehouses'
                ? warehouses.data?.data?.items?.length || 0
                : modalState.type === 'channels'
                  ? channelOptions.length
                  : modalState.type === 'businessTypes'
                    ? businessTypeOptions.length
                    : modalState.type === 'brands'
                      ? brands.data?.length || 0
                      : modalState.type === 'categories'
                        ? categories.data?.length || 0
                        : modalState.type === 'subcategories'
                          ? subcategories.data?.length || 0
                          : 0
        }
        totalPages={
          modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
            ? Math.ceil((pricingGroupProducts.data?.data?.items?.length || 0) / 10)
            : modalState.type === 'outlets'
              ? Math.ceil(outletOptions.length / 10)
              : modalState.type === 'warehouses'
                ? Math.ceil((warehouses.data?.data?.items?.length || 0) / 10)
                : modalState.type === 'businessTypes'
                  ? Math.ceil(businessTypeOptions.length / 10)
                  : modalState.type === 'channels'
                    ? Math.ceil(channelOptions.length / 10)
                    : modalState.type === 'brands'
                      ? Math.ceil((brands.data?.length || 0) / 10)
                      : modalState.type === 'categories'
                        ? Math.ceil((categories.data?.length || 0) / 10)
                        : modalState.type === 'subcategories'
                          ? Math.ceil((subcategories.data?.length || 0) / 10)
                          : 0
        }
        onPaginationChange={(pagination) => {
          if (
            modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
          ) {
            setProductsPagination(pagination);
          } else if (modalState.type === 'outlets') {
            setOutletsPagination(pagination);
          } else if (modalState.type === 'warehouses') {
            setWarehousesPagination(pagination);
          }
        }}
        initialPagination={
          modalState.type === 'products' ||
            modalState.type === 'combo-products' ||
            modalState.type === 'assorted-products' ||
            modalState.type === 'lineitem-products' ||
            modalState.type === 'prorated-products' ||
            modalState.type === 'free-products'
            ? productsPagination
            : modalState.type === 'outlets'
              ? outletsPagination
              : modalState.type === 'warehouses'
                ? warehousesPagination
                : { pageIndex: 0, pageSize: 10 }
        }
        nonPaginated={modalState.type === 'outlets' ? true : false}
        dataType={
          modalState.type === 'brands' ? 'brands' :
            modalState.type === 'categories' ? 'categories' :
              modalState.type === 'subcategories' ? 'subcategories' :
                modalState.type === 'products' ||
                  modalState.type === 'combo-products' ||
                  modalState.type === 'assorted-products' ||
                  modalState.type === 'lineitem-products' ||
                  modalState.type === 'prorated-products' ||
                  modalState.type === 'free-products' ? 'products' :
                  undefined
        }
        outletWarehouseIds={formData.applicableTo.warehouseIds}
        filters={
          modalState.type === 'categories'
            ? // Check if this is for a line item condition
            modalState.conditionIndex !== undefined
              ? formData.conditions[modalState.conditionIndex]?.criteria
                ?.filterBy?.brandIds?.length > 0
                ? {
                  brandId:
                    formData.conditions[modalState.conditionIndex].criteria
                      .filterBy.brandIds,
                }
                : undefined
              : formData.applicableTo.brandIds.length > 0
                ? { brandId: formData.applicableTo.brandIds }
                : undefined
            : modalState.type === 'subcategories'
              ? // Check if this is for a line item condition
              modalState.conditionIndex !== undefined
                ? formData.conditions[modalState.conditionIndex]?.criteria
                  ?.filterBy?.categoryIds?.length > 0
                  ? {
                    categoryId:
                      formData.conditions[modalState.conditionIndex].criteria
                        .filterBy.categoryIds,
                  }
                  : undefined
                : formData.applicableTo.categoryIds.length > 0
                  ? { categoryId: formData.applicableTo.categoryIds }
                  : undefined
              : modalState.type === 'products' ||
                modalState.type === 'combo-products' ||
                modalState.type === 'assorted-products' ||
                modalState.type === 'lineitem-products' ||
                modalState.type === 'prorated-products'
                ? // Check if this is for a line item condition
                modalState.conditionIndex !== undefined
                  ? {
                    ...(formData.conditions[modalState.conditionIndex]
                      ?.criteria?.filterBy?.brandIds?.length > 0 && {
                      brandId:
                        formData.conditions[modalState.conditionIndex]
                          .criteria.filterBy.brandIds,
                    }),
                    ...(formData.conditions[modalState.conditionIndex]
                      ?.criteria?.filterBy?.categoryIds?.length > 0 && {
                      categoryId:
                        formData.conditions[modalState.conditionIndex]
                          .criteria.filterBy.categoryIds,
                    }),
                    ...(formData.conditions[modalState.conditionIndex]
                      ?.criteria?.filterBy?.subcategoryIds?.length > 0 && {
                      subcategoryId:
                        formData.conditions[modalState.conditionIndex]
                          .criteria.filterBy.subcategoryIds,
                    }),
                  }
                  : {
                    ...(formData.applicableTo.warehouseIds.length > 0 && {
                      warehouseId: formData.applicableTo.warehouseIds,
                    }),
                    ...(formData.applicableTo.brandIds.length > 0 && {
                      brandId: formData.applicableTo.brandIds,
                    }),
                    ...(formData.applicableTo.categoryIds.length > 0 && {
                      categoryId: formData.applicableTo.categoryIds,
                    }),
                    ...(formData.applicableTo.subcategoryIds.length > 0 && {
                      subcategoryId: formData.applicableTo.subcategoryIds,
                    }),
                  }
                : modalState.type === 'free-products'
                  ? // For free products, filter by selected warehouses
                  {
                    ...(formData.applicableTo.warehouseIds.length > 0 && {
                      warehouseId: formData.applicableTo.warehouseIds,
                    }),
                  }
                  : undefined
        }
        disabled={modalState.disabled || false}
      />

      {/* Conditions Read-Only Modal */}
      {modalState.type === 'conditions' && (
        <Dialog
          open={modalState.open}
          onOpenChange={(open: boolean) =>
            setModalState((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col p-0">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-medium">{modalState.title}</div>
                  {modalState.description && (
                    <div className="text-sm font-normal text-zinc-500">
                      {modalState.description}
                    </div>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto px-6 py-4">
              {formData.conditions.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  No conditions added to this scheme.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="rounded-lg border-2 bg-card p-4"
                    >
                      <div className="bg-background mb-4 flex items-center justify-between rounded-lg p-2 text-lg font-medium">
                        <span>Condition {index + 1}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Condition Type
                          </Label>
                          <div className="mt-1 rounded border bg-gray-50 p-2">
                            {condition.conditionType || 'Not specified'}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Priority
                          </Label>
                          <div className="mt-1 rounded border bg-gray-50 p-2">
                            {condition.priority || 'Not specified'}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Is ProRated
                          </Label>
                          <div className="mt-1 rounded border bg-gray-50 p-2">
                            {condition.isProRated ? 'Yes' : 'No'}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Aggregation Basis
                          </Label>
                          <div className="mt-1 rounded border bg-gray-50 p-2">
                            {formatAggregationBasis(
                              condition.criteria?.aggregationBasis ||
                              condition.criteria?.conditionBasis
                            )}
                          </div>
                        </div>
                        {condition.criteria?.uom && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              UOM
                            </Label>
                            <div className="mt-1 rounded border bg-gray-50 p-2">
                              {getUomLabelForContext(condition, condition.criteria)}
                            </div>
                          </div>
                        )}

                        {condition.criteria?.hasMinValue && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Minimum Value
                            </Label>
                            <div className="mt-1 rounded border bg-gray-50 p-2">
                              {condition.criteria.minValue || 'Not specified'}
                            </div>
                          </div>
                        )}

                        {condition.criteria?.hasMaxValue && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Maximum Value
                            </Label>
                            <div className="mt-1 rounded border bg-gray-50 p-2">
                              {condition.criteria.maxValue || 'Not specified'}
                            </div>
                          </div>
                        )}

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Match Type
                          </Label>
                          <div className="mt-1 rounded border bg-gray-50 p-2">
                            {condition.criteria?.matchType || 'Not specified'}
                          </div>
                        </div>
                      </div>

                      {/* Rewards Section */}
                      {condition.rewards && condition.rewards.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Rewards
                          </Label>
                          <div className="mt-2 space-y-2">
                            {condition.rewards.map(
                              (reward: any, rewardIndex: number) => (
                                <div
                                  key={rewardIndex}
                                  className="rounded border bg-gray-50 p-3"
                                >
                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">
                                        Type:
                                      </span>
                                      <span className="ml-2">
                                        {reward.rewardType || 'Not specified'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">
                                        Value:
                                      </span>
                                      <span className="ml-2">
                                        {reward.rewardValue || 'Not specified'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-background flex justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setModalState((prev) => ({ ...prev, open: false }))
                }
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

export default SchemeCreatePage;
