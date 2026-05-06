'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Loading from '@/components/ui/loading';
import { WarehouseMultiSelectSection } from '@/components/sections/warehouses-multiselect-section';
import { ProductMultiSelectSection } from '@/components/sections/products-multiselect-section';
import { Save } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePricingGroups } from '@/features/dashboard/products/hooks/usePricingGroups';
import { toast } from 'sonner';
import NavKeys from '@/constants/navkeys';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const EditPricingGroupPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.CUSTOMER_GROUP} action={MENU_RIGHTS.EDIT}>
      <EditPricingGroupContent />
    </RequirePermission>
  );
};

const EditPricingGroupContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pricingGroupId = searchParams.get('pricingGroupId');
  const { getPricingGroup, updatePricingGroup, getPricingGroupProducts, bulkUpdateProductPrices } = usePricingGroups();
  
  const breadcrumb = getBreadcrumbData('pricingGroup', 'edit');
  
  const [formData, setFormData] = useState({
    groupName: '',
    groupCode: '',
    description: '',
  });
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Debug: Log selectedProductIds changes
  useEffect(() => {
    console.log('Edit page - selectedProductIds changed:', selectedProductIds);
  }, [selectedProductIds]);

  // Debug: Log currentPrices changes
  useEffect(() => {
    console.log('Edit page - currentPrices changed:', currentPrices);
  }, [currentPrices]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const pricingGroupQuery = getPricingGroup(pricingGroupId!);

  // Fetch current products with pricing for this pricing group (used in background)
  const pricingGroupProducts = getPricingGroupProducts({
    groupIds: pricingGroupId ? [pricingGroupId] : []
  });

  // Debug: Log pricing group products data
  console.log('Pricing Group Products Query:', pricingGroupProducts);
  console.log('Pricing Group Products Data:', pricingGroupProducts.data);
  console.log('Selected Product IDs:', selectedProductIds);
  
  // Debug: Log product IDs from pricing group products
  if (pricingGroupProducts.data?.data?.items) {
    const productIdsFromProducts = pricingGroupProducts.data.data.items.map((product: any) => product.productId);
    console.log('Product IDs from pricing group products:', productIdsFromProducts);
  }



  useEffect(() => {
    if (pricingGroupQuery.data?.data) {
      setFormData({
        groupName: pricingGroupQuery.data.data.groupName,
        groupCode: pricingGroupQuery.data.data.groupCode,
        description: pricingGroupQuery.data.data.description || '',
      });
      // Set warehouse mappings if they exist
      if (pricingGroupQuery.data.data.warehouse) {
        setSelectedWarehouseIds(pricingGroupQuery.data.data.warehouse.map((mapping: any) => mapping.warehouseId));
      }
      // Set product mappings if they exist
      if (pricingGroupQuery.data.data.productMappings) {
        const productIds = pricingGroupQuery.data.data.productMappings.map((mapping: any) => mapping.productId);
        console.log('Setting selected product IDs from pricing group:', productIds);
        setSelectedProductIds(productIds);
      }
      setIsLoadingData(false);
    }
  }, [pricingGroupQuery.data]);

  const [hasInitializedProducts, setHasInitializedProducts] = useState(false);
  
  useEffect(() => {
    if (pricingGroupProducts.data?.data?.items && !hasInitializedProducts) {
      const productIdsFromProducts = pricingGroupProducts.data.data.items.map((product: any) => product.productId);
      console.log('Setting initial selected product IDs from pricing group products:', productIdsFromProducts);
      
      setSelectedProductIds(productIdsFromProducts);
      
      const initialPrices: Record<string, number> = {};
      pricingGroupProducts.data.data.items.forEach((product: any) => {
        if (product.pricingGroup && Array.isArray(product.pricingGroup) && product.pricingGroup.length > 0) {
          const priceInfo = product.pricingGroup[0];
          if (priceInfo.price) {
            initialPrices[product.productId] = priceInfo.price;
          }
        }
      });
      console.log('Setting initial prices from pricing group products:', initialPrices);
      setCurrentPrices(initialPrices);
      
      // Mark as initialized so we don't override user changes
      setHasInitializedProducts(true);
    }
  }, [pricingGroupProducts.data, hasInitializedProducts]);

  useEffect(() => {
    if (!pricingGroupId) {
      router.push(NavKeys.PriceGroup);
      return;
    }
  }, [pricingGroupId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate that all selected products have group prices
      const productsWithoutPrices = selectedProductIds.filter(productId => {
        const price = currentPrices[productId];
        return !price || price <= 0;
      });

      if (productsWithoutPrices.length > 0) {
        setShowValidationErrors(true);
        toast.error('Please enter group prices for all selected products');
        setIsLoading(false);
        return;
      }

      const payload = {
        ...formData,
        warehouse: selectedWarehouseIds.map(id => ({ warehouseId: id })),
        productMappings: selectedProductIds.map(id => ({ productId: id }))
      };
      
      console.log('Edit page - Sending payload:', JSON.stringify(payload, null, 2));
      await updatePricingGroup.mutateAsync({
        pricingGroupId: pricingGroupId!,
        data: payload
      });
      toast.success('Customer group updated successfully');
      
      // After updating the group, bulk update product prices with selected products and their prices
      if (selectedProductIds.length > 0) {
        // Use the current prices from the form instead of default price
        const products = selectedProductIds.map(productId => ({
          productId: productId,
          price: currentPrices[productId] || 100 // Use current price or default to 100
        }));

        const payload = {
          groupId: pricingGroupId!,
          products: products
        };

        console.log('Bulk updating product prices with current prices:', JSON.stringify(payload, null, 2));
        await bulkUpdateProductPrices.mutateAsync(payload);
        toast.success('Product prices updated successfully');
      }
      
      router.push(NavKeys.PriceGroup);
    } catch (error) {
      console.error('Error updating customer group:', error);
      toast.error('Failed to update customer group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(NavKeys.PriceGroup);
  };

  if (isLoadingData || pricingGroupQuery.isLoading) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="w-full rounded-lg bg-white p-6">
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading..." />
          </div>
        </div>
      </section>
    );
  }

  if (pricingGroupQuery.error) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="w-full rounded-lg bg-white p-6">
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-red-600">Failed to load pricing group</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      <div className="w-full rounded-lg bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="groupName" className="text-sm font-medium">
                Name *
              </label>
              <Input
                id="groupName"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                placeholder="Enter customer group name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="groupCode" className="text-sm font-medium">
                Group Code *
              </label>
              <Input
                id="groupCode"
                value={formData.groupCode}
                onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                placeholder="Enter group code"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>
          </div>

          {/* Warehouse Mapping Section */}
          <div className="space-y-4">
            <WarehouseMultiSelectSection
              selectedWarehouseIds={selectedWarehouseIds}
              onChange={setSelectedWarehouseIds}
              requirePincode={false}
              hideFilters={true}
              requireUserMapping={false}
            />
          </div>

          {/* Product Mapping Section */}
          <div className="space-y-4">
            <ProductMultiSelectSection
              selectedProductIds={selectedProductIds}
              onChange={setSelectedProductIds}
              currentPrices={currentPrices}
              onCurrentPriceChange={(productId: string, price: number) => {
                console.log('Edit page - Price change:', productId, price);
                setCurrentPrices(prev => ({ ...prev, [productId]: price }));
              }}
              onCurrentPricesChange={(prices: Record<string, number>) => {
                console.log('Edit page - Batch price change:', prices);
                setCurrentPrices(prices);
              }}
              hideFilters={true}
              maxSelection={Infinity}
              showValidationErrors={showValidationErrors}
              pricingGroupProducts={{
                data: pricingGroupProducts.data?.data,
                isLoading: pricingGroupProducts.isLoading,
                error: pricingGroupProducts.error
              }}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default EditPricingGroupPage;
