'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WarehouseMultiSelectSection } from '@/components/sections/warehouses-multiselect-section';
import { ProductMultiSelectSection } from '@/components/sections/products-multiselect-section';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePricingGroups } from '@/features/dashboard/products/hooks/usePricingGroups';
import { toast } from 'sonner';
import NavKeys from '@/constants/navkeys';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const CreatePricingGroupPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.CUSTOMER_GROUP} action={MENU_RIGHTS.CREATE}>
      <CreatePricingGroupContent />
    </RequirePermission>
  );
};

const CreatePricingGroupContent = () => {
  const router = useRouter();
  const { createPricingGroup, getPricingGroupProducts, bulkUpdateProductPrices } = usePricingGroups();
  
  const breadcrumb = getBreadcrumbData('pricingGroup', 'create');
  const [formData, setFormData] = useState({
    groupName: '',
    groupCode: '',
    description: '',
  });
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Example: How to fetch products with pricing for a specific pricing group
  // const pricingGroupProducts = getPricingGroupProducts({
  //   groupIds: ['tDwFWgWp0PNzMdHnidxZ4'], // Replace with actual group ID
  //   warehouseIds: ['PsaPgwOnxaK63x8W'] // Optional: filter by warehouse IDs
  // });
  
  // Example: Fetch products for a single group (send groupId alone)
  // const singleGroupProducts = getPricingGroupProducts({
  //   groupIds: ['your-group-id-here']
  // });

  // Function to bulk update product prices after creating a pricing group
  const handleBulkUpdatePrices = async (groupId: string) => {
    if (selectedProductIds.length === 0) {
      console.log('No products selected for pricing update');
      return;
    }

    try {
      // Create products array with actual prices from the form
      const products = selectedProductIds.map(productId => ({
        productId: productId,
        price: productPrices[productId] || 0 // Use actual price from form or 0 as default
      }));

      const payload = {
        groupId: groupId,
        products: products
      };

      console.log('Bulk updating product prices:', JSON.stringify(payload, null, 2));
      await bulkUpdateProductPrices.mutateAsync(payload);
      toast.success('Product prices updated successfully');
    } catch (error) {
      console.error('Error updating product prices:', error);
      toast.error('Failed to update product prices');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate that all selected products have group prices
      const productsWithoutPrices = selectedProductIds.filter(productId => {
        const price = productPrices[productId];
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
      console.log('Create page - Sending payload:', JSON.stringify(payload, null, 2));
      const result = await createPricingGroup.mutateAsync(payload);
      toast.success('Customer group created successfully');
      
      // After creating the group, bulk update product prices with selected products
      if (result.data.groupId && selectedProductIds.length > 0) {
        await handleBulkUpdatePrices(result.data.groupId);
      }
      
      router.push(NavKeys.PriceGroup);
    } catch (error) {
      console.error('Error creating customer group:', error);
      toast.error('Failed to create customer group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(NavKeys.PriceGroup);
  };

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
              currentPrices={productPrices}
              onCurrentPriceChange={(productId: string, price: number) => {
                setProductPrices(prev => ({ ...prev, [productId]: price }));
              }}
              onCurrentPricesChange={setProductPrices}
              hideFilters={true}
              maxSelection={Infinity}
              showValidationErrors={showValidationErrors}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Creating...' : 'Create Customer Group'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default CreatePricingGroupPage;
