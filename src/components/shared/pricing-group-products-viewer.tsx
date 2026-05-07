'use client';

import { useState } from 'react';
import { usePricingGroups } from '@/features/dashboard/products/hooks/usePricingGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Loading from '@/components/ui/loading';
import { Search, Package, DollarSign, MapPin } from 'lucide-react';

interface PricingGroupProductsViewerProps {
  groupId?: string;
  warehouseIds?: string[];
}

export const PricingGroupProductsViewer = ({ 
  groupId, 
  warehouseIds 
}: PricingGroupProductsViewerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentGroupId, setCurrentGroupId] = useState(groupId || '');
  const [currentWarehouseIds, setCurrentWarehouseIds] = useState<string[]>(warehouseIds || []);

  const { getPricingGroupProducts } = usePricingGroups();
  
  const pricingGroupProducts = getPricingGroupProducts({
    groupIds: currentGroupId ? [currentGroupId] : [],
    warehouseIds: currentWarehouseIds.length > 0 ? currentWarehouseIds : undefined
  });

  const handleSearch = () => {
    if (currentGroupId) {
      // The query will automatically refetch when the parameters change
      console.log('Searching for products with groupId:', currentGroupId);
    }
  };

  const filteredProducts = pricingGroupProducts.data?.data?.items?.filter(product =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.skuCode.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!currentGroupId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pricing Group Products Viewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="groupId" className="text-sm font-medium">
                Enter Pricing Group ID
              </label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="groupId"
                  value={currentGroupId}
                  onChange={(e) => setCurrentGroupId(e.target.value)}
                  placeholder="e.g., tDwFWgWp0PNzMdHnidxZ4"
                />
                <Button onClick={handleSearch} disabled={!currentGroupId}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Products with Pricing - Group: {currentGroupId}
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button 
            variant="outline" 
            onClick={() => setCurrentGroupId('')}
          >
            Change Group
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pricingGroupProducts.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loading text="Loading products..." />
          </div>
        ) : pricingGroupProducts.error ? (
          <div className="text-center py-8 text-red-600">
            Error loading products: {pricingGroupProducts.error.message}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products found for this pricing group.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {pricingGroupProducts.data?.data?.totalItems} products
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card key={product._id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm line-clamp-2">
                            {product.productName}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            SKU: {product.skuCode}
                          </p>
                        </div>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {product.description}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <DollarSign className="h-3 w-3" />
                        <span>MRP: ₹{product.mrp}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Package className="h-3 w-3" />
                        <span>UOM: {product.uom}</span>
                      </div>
                      
                      {/* Pricing Group Information */}
                      {product.pricingGroup && product.pricingGroup.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-secondary">
                            Pricing Group Details:
                          </div>
                          {product.pricingGroup.map((pricing, index) => (
                            <div key={index} className="bg-secondary/10 p-2 rounded text-xs">
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin className="h-3 w-3" />
                                <span>Warehouse: {pricing.warehouseId}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>Price: ₹{pricing.price}</span>
                              </div>
                              <div className="mt-1 text-gray-600">
                                Applicable to {pricing.applicableTo.outletIds.length} outlets
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
