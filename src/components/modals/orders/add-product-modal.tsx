'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useProducts, usePricingGroupProducts } from '@/features/dashboard/products/hooks/useProducts';
import nagaBrandLogo from '@/assets/pngs/naga-brand.png';
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Ghost,
  LeafyGreenIcon,
  Trash2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';

interface ProductItem {
  _id: string;
  productId: string;
  productName: string;
  skuCode: string;
  description: string;
  hsnCode: string;
  pictureUrl: string | null;
  isActive: boolean;
  mrp: number;
  minimumPrice?: number;
  gstPercentage?: number;
  unitsPerCase?: number;
  packageId: string;
  brandId: string;
  uom: string;
  capacity?: number;
  categoryId: string;
  subcategoryId: string;
  warehouses?: any[];
  createdAt?: string;
  updatedAt?: string;
  productImages?: Array<{ productS3Filename: string }>;
  pricingGroup?: Array<{ price: number; warehouseId: string }>;
  // Fields from API response
  quantity?: number;
  price?: number;
  finalPrice?: number;
  isFreeProduct?: boolean;
}

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsChange: (products: ProductItem[]) => void;
  initialTab?: string;
  currentOrderProducts?: any[];
  warehouseId?: string;
}

export const AddProductModal = ({
  open,
  onOpenChange,
  onProductsChange,
  initialTab = 'products',
  currentOrderProducts = [],
  warehouseId,
}: AddProductModalProps) => {
  // Use the new pricing group products API when warehouseId is provided
  const pricingGroupProducts = usePricingGroupProducts({
    warehouseIds: warehouseId ? [warehouseId] : [],
    enabled: open && !!warehouseId
  });

  // Fallback to old products API when warehouseId is not provided
  const { products } = useProducts({ enabled: open && !warehouseId, nonPaginated: true });

  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [currentTab, setCurrentTab] = useState(initialTab);

  // Filter states
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setCurrentTab('products');
      // Clear filters when modal closes
      setSelectedBrand(undefined);
      setSelectedCategory(undefined);
      setSelectedSubcategory(undefined);
    } else {
      setCurrentTab(initialTab);
    }
  }, [open, initialTab]);

  // Clear subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory(undefined);
  }, [selectedCategory]);

  useEffect(() => {
    if (open) {
      const initialQuantities: Record<string, number> = {};

      // First, initialize quantities for all non-free and non-discounted products (manually added products)
      // This ensures manually added products show their correct quantity
      currentOrderProducts.forEach((product) => {
        // Skip free products and discounted products (from schemes)
        const isDiscountedFromScheme = product.isDiscountedProduct &&
          ((product as any).addedFromSchemeId || (product as any).discountedBySchemeId);

        if (!product.isFreeProduct && !isDiscountedFromScheme) {
          // If product already exists, sum the quantities (in case of duplicates)
          // Otherwise, set the quantity
          if (initialQuantities[product.productId]) {
            initialQuantities[product.productId] += product.quantity;
          } else {
            initialQuantities[product.productId] = product.quantity;
          }
        }
      });

      // For free products and discounted products from schemes, always set to 0
      // This ensures they don't show their scheme quantity and can be added as new products
      currentOrderProducts.forEach((product) => {
        const isDiscountedFromScheme = product.isDiscountedProduct &&
          ((product as any).addedFromSchemeId || (product as any).discountedBySchemeId);

        if (product.isFreeProduct || isDiscountedFromScheme) {
          // Always set to 0, even if there's a manually added product with the same productId
          // This allows the same product to be added as a new entry
          if (!initialQuantities[product.productId]) {
            initialQuantities[product.productId] = 0;
          }
        }
      });

      setQuantities(initialQuantities);
    }
  }, [open, currentOrderProducts]);

  // Get products from appropriate data source
  const allProducts = warehouseId
    ? pricingGroupProducts.data?.data?.items || []
    : products.data?.data?.items || [];

  const filteredProducts = allProducts.filter((product: ProductItem) => {
    // Search filter
    const matchesSearch =
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.skuCode.toLowerCase().includes(searchTerm.toLowerCase());

    // Brand filter
    const matchesBrand = !selectedBrand || product.brandId === selectedBrand;

    // Category filter
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;

    // Subcategory filter
    const matchesSubcategory = !selectedSubcategory || product.subcategoryId === selectedSubcategory;

    return matchesSearch && matchesBrand && matchesCategory && matchesSubcategory;
  });

  // Helper function to get the correct price for a product
  const getProductPrice = (product: ProductItem): number => {
    // For products from API response (order details), use finalPrice or price
    if (product.finalPrice !== undefined) {
      return product.finalPrice;
    }
    if (product.price !== undefined) {
      return product.price;
    }

    // For products from product catalog, use pricing group or mrp
    if (warehouseId && product.pricingGroup) {
      const warehousePrice = product.pricingGroup.find(pg => pg.warehouseId === warehouseId);
      return warehousePrice?.price || product.mrp;
    }
    return product.mrp;
  };

  // Helper function to get the correct image URL for a product
  const getProductImageUrl = (product: ProductItem): string => {
    if (product.productImages && product.productImages.length > 0) {
      const s3Filename = product.productImages[0].productS3Filename;
      return getCloudFrontUrl(s3Filename);
    }
    if (product.pictureUrl) {
      return getCloudFrontUrl(product.pictureUrl);
    }
    return nagaBrandLogo.src;
  };

  // Get all products that should be displayed in the cart tab
  // This includes current order products + newly selected products from the products tab
  const getCartProducts = () => {
    const cartProducts = [...currentOrderProducts];


    // Add newly selected products from the products tab that aren't already in currentOrderProducts
    allProducts.forEach((product: ProductItem) => {
      if (quantities[product.productId] > 0 &&
        !currentOrderProducts.find(p => p.productId === product.productId)) {
        cartProducts.push({
          ...product,
          quantity: quantities[product.productId],
          price: getProductPrice(product), // Use the correct price based on warehouse
        });
      }
    });

    return cartProducts;
  };

  const tabs = [
    {
      title: 'All Products',
      value: 'products',
    },
    {
      title: `Current Order (${getCartProducts().length})`,
      value: 'cart',
    },
  ];

  const handleQuantityChange = (productId: string, change: number) => {
    setQuantities((prev) => {
      const currentQuantity = prev[productId] ??
        (currentOrderProducts.find((p: any) => p.productId === productId)?.quantity ?? 0);
      const newQuantity = Math.max(0, currentQuantity + change);

      // If quantity reaches 0, explicitly set it to 0 (don't remove from state to allow user to see it)
      return {
        ...prev,
        [productId]: newQuantity,
      };
    });
  };

  const handleAddAllToOrder = () => {
    let selectedProducts: ProductItem[] = [];

    // Preserve all existing free products and discounted products from schemes
    const existingFreeProducts = currentOrderProducts.filter(
      (product: any) => {
        const isDiscountedFromScheme = product.isDiscountedProduct &&
          (product.addedFromSchemeId || product.discountedBySchemeId);
        return product.isFreeProduct || isDiscountedFromScheme;
      }
    );

    if (currentTab === 'products') {
      // Merge currentOrderProducts with allProducts, keeping all with quantity > 0
      const allSelected = allProducts
        .filter((product: ProductItem) => quantities[product.productId] > 0)
        .map((product: ProductItem) => ({
          ...product,
          quantity: quantities[product.productId],
          price: getProductPrice(product),
          isFreeProduct: false, // Ensure manually added products are not marked as free
        }));

      // Get products from currentOrderProducts that are not in allProducts and have quantity > 0
      // Exclude free products and discounted products from schemes as they are handled separately
      const otherCartProducts = currentOrderProducts
        .filter((product: any) => {
          const isDiscountedFromScheme = product.isDiscountedProduct &&
            (product.addedFromSchemeId || product.discountedBySchemeId);
          return !product.isFreeProduct &&
            !isDiscountedFromScheme &&
            !allProducts.find((p: ProductItem) => p.productId === product.productId) &&
            quantities[product.productId] > 0;
        })
        .map((product: any) => ({
          ...product,
          quantity: quantities[product.productId],
          price: product.price || product.mrp, // Use existing price or fallback to MRP for current order products
        }));

      // Combine: manually added/updated products + existing free products
      selectedProducts = [...allSelected, ...otherCartProducts, ...existingFreeProducts];
    } else if (currentTab === 'cart') {
      // Always use getCartProducts and filter by quantity > 0
      // But preserve free products and discounted products from schemes separately
      const cartProducts = getCartProducts();
      const nonFreeProducts = cartProducts
        .filter((product: any) => {
          const isDiscountedFromScheme = product.isDiscountedProduct &&
            (product.addedFromSchemeId || product.discountedBySchemeId);
          if (product.isFreeProduct || isDiscountedFromScheme) return false; // Free products and discounted from schemes handled separately
          const qty = quantities[product.productId] ?? product.quantity ?? 0;
          return qty > 0; // Only include products with quantity > 0
        })
        .map((product: ProductItem) => {
          const qty = quantities[product.productId] ?? product.quantity ?? 0;
          return {
            ...product,
            quantity: qty,
            price: product.price || getProductPrice(product),
          };
        });

      // Combine: manually updated products + existing free products
      selectedProducts = [...nonFreeProducts, ...existingFreeProducts];
    }

    onProductsChange(selectedProducts);
    onOpenChange(false);
  };

  const getTotalSelectedItems = () => {
    return Object.values(quantities).reduce(
      (total, quantity) => total + quantity,
      0
    );
  };

  const getSelectedProductsCount = () => {
    if (currentTab === 'products') {
      return Object.values(quantities).filter((quantity) => quantity > 0).length;
    } else if (currentTab === 'cart') {
      const cartProducts = getCartProducts();
      return cartProducts.filter(
        (product: any) => quantities[product.productId] > 0
      ).length;
    }
    return 0;
  };

  // Check if there are any quantity changes (including products set to 0)
  const hasQuantityChanges = () => {
    if (currentTab === 'cart') {
      const cartProducts = getCartProducts();
      // Check if any product has a quantity change (including set to 0)
      return cartProducts.some((product: any) => {
        const currentQty = quantities[product.productId];
        const originalQty = product.quantity ?? 0;
        // Return true if quantity has been changed (including set to 0)
        return currentQty !== undefined && currentQty !== originalQty;
      });
    }
    // For products tab, check if any quantity is set
    return Object.keys(quantities).length > 0 &&
      Object.values(quantities).some(qty => qty > 0);
  };

  const getButtonText = () => {
    const count = getTotalSelectedItems();
    if (currentTab === 'products') {
      const selectedProducts = allProducts.filter(
        (product: ProductItem) => quantities[product.productId] > 0
      );
      const newProducts = selectedProducts.filter(
        (product: ProductItem) =>
          !currentOrderProducts.find((p) => p.productId === product.productId)
      );
      const updatedProducts = selectedProducts.filter((product: ProductItem) =>
        currentOrderProducts.find((p) => p.productId === product.productId)
      );
      if (newProducts.length > 0 && updatedProducts.length > 0) {
        return `Add/Update ${count} Items`;
      } else if (updatedProducts.length > 0) {
        return `Update ${count} Items`;
      } else {
        return `Add ${count} Items to Order`;
      }
    } else if (currentTab === 'cart') {
      // Check if there are products with quantity 0 (to be removed)
      const cartProducts = getCartProducts();
      const hasRemovals = cartProducts.some((product: any) => {
        if (product.isFreeProduct) return false;
        const currentQty = quantities[product.productId];
        const originalQty = product.quantity ?? 0;
        return currentQty !== undefined && currentQty === 0 && originalQty > 0;
      });

      if (hasRemovals && count === 0) {
        return 'Update Order (Remove Items)';
      } else if (hasRemovals) {
        return `Update Order (${count} Items, Remove Others)`;
      } else {
        return `Update Order (${count} Items)`;
      }
    }
    return '';
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 space-y-4">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-primary/10 w-fit rounded-full p-2">
                <ShoppingCart className="text-primary h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Add Products</div>
              <div className="text-sm font-normal text-zinc-500">
                Select products to add to your order
              </div>
            </div>
          </DialogTitle>
          <TabsStyled
            tabs={tabs}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            containerClassName="w-full max-w-xs"
          />
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4">
          {currentTab === 'products' && (
            <>
              {/* Search Bar */}
              <div className="flex-shrink-0">
                <SearchInput
                  placeholder="Search Products"
                  rotatingWords={['Product Name', 'SKU Code']}
                  staticPrefix="Search by"
                  rotateDuration={2500}
                  value={searchTerm}
                  onChange={setSearchTerm}
                  className="w-full"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2 md:flex-row">
                <MasterRecordDropdown
                  masterName="brand"
                  value={selectedBrand}
                  onChange={setSelectedBrand}
                  placeholder="Brand"
                  className="w-full md:w-[calc(33.33%-0.5rem)]"
                />
                <MasterRecordDropdown
                  masterName="category"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  placeholder="Category"
                  className="w-full md:w-[calc(33.33%-0.5rem)]"
                />
                <MasterRecordDropdown
                  masterName="subcategory"
                  value={selectedSubcategory}
                  onChange={setSelectedSubcategory}
                  placeholder="Subcategory"
                  className="w-full md:w-[calc(33.33%-0.5rem)]"
                  filters={
                    selectedCategory ? { categoryId: selectedCategory } : undefined
                  }
                />
              </div>

              <ScrollArea className="min-h-0 w-full flex-1">
                {(warehouseId ? pricingGroupProducts.isLoading : products.isLoading) ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loading text="Loading products..." />
                  </div>
                ) : (warehouseId ? pricingGroupProducts.isError : products.isError) ? (
                  <div className="flex h-40 items-center justify-center">
                    <GenericError />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex h-40 items-center justify-center">
                    <EmptyState />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product: ProductItem) => (
                      <Card key={product._id} className="border shadow-none">
                        <CardContent className="space-y-3">
                          <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={getProductImageUrl(product)}
                              alt={product.productName}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = nagaBrandLogo.src;
                              }}
                            />
                          </div>

                          {/* Product Details */}
                          <div className="space-y-2">
                            <h3 className="line-clamp-2 text-sm font-medium">
                              {product.productName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {product.skuCode}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold text-primary">
                                ₹{getProductPrice(product)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {product.capacity} {product.uom}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-start overflow-x-auto gap-2">
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() =>
                                handleQuantityChange(product.productId, -1)
                              }
                              disabled={!quantities[product.productId]}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-20 text-center text-sm"
                              value={quantities[product.productId] || '0'}
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setQuantities(prev => ({
                                  ...prev,
                                  [product.productId]: val === '' ? 0 : Math.max(0, parseInt(val, 10)),
                                }));
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() =>
                                handleQuantityChange(product.productId, 1)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}

          {currentTab === 'cart' && (
            <ScrollArea className="min-h-0 w-full flex-1">
              {getCartProducts().length === 0 ? (
                <div className="flex h-[350px] items-center justify-center">
                  <EmptyState text="Your Order Cart is Empty, Add products from the Products Tab" />
                </div>
              ) : (
                <div className="space-y-4">
                  {getCartProducts().map((product: any) => (
                    <Card
                      key={product.productId}
                      className="border shadow-none"
                    >
                      <CardContent className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.productName}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              // Try fallback to direct S3 URL if CloudFront fails
                              if (product.productImages && product.productImages.length > 0) {
                                const s3Filename = product.productImages[0].productS3Filename;
                                if (s3Filename && !e.currentTarget.src.includes(s3Filename)) {
                                  e.currentTarget.src = s3Filename;
                                  return;
                                }
                              }
                              // Final fallback to default logo
                              e.currentTarget.src = nagaBrandLogo.src;
                            }}
                          />

                        </div>

                        {/* Product Details */}
                        <div className="flex-1 space-y-1">
                          <h3 className="line-clamp-1 text-base font-medium">
                            {product.productName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {product.skuCode}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.isFreeProduct && product.isDiscountedProduct ? (
                              <>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                  Discounted Product
                                </Badge>
                                <span className="text-base font-semibold text-primary">
                                  ₹{getProductPrice(product)}
                                </span>
                              </>
                            ) : product.isFreeProduct ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                Free Product
                              </Badge>
                            ) : (
                              <span className="text-base font-semibold text-primary">
                                ₹{getProductPrice(product)}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {product.capacity} {product.uom}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex flex-col">
                          {(() => {
                            const isDiscountedFromScheme = product.isDiscountedProduct &&
                              ((product as any).addedFromSchemeId || (product as any).discountedBySchemeId);

                            if (product.isFreeProduct || isDiscountedFromScheme) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="min-w-[2rem] text-center text-sm font-medium text-gray-500">
                                    {product.quantity}
                                  </span>
                                  {product.isFreeProduct && product.isDiscountedProduct ? (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                      Discounted Product
                                    </Badge>
                                  ) : product.isFreeProduct ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                      Free Product
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                      Discounted Product
                                    </Badge>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center justify-center overflow-x-auto gap-2">
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  onClick={() => {
                                    handleQuantityChange(product.productId, -1);
                                  }}
                                  disabled={
                                    (quantities[product.productId] ??
                                      (currentOrderProducts.find((p: any) => p.productId === product.productId)?.quantity ?? 0)) <= 0
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-20 text-center text-sm"
                                  value={
                                    quantities[product.productId] !== undefined
                                      ? String(quantities[product.productId])
                                      : String(product.quantity ?? 0)
                                  }
                                  onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setQuantities(prev => ({
                                      ...prev,
                                      [product.productId]: val === '' ? 0 : Math.max(0, parseInt(val, 10)),
                                    }));
                                  }}
                                  onBlur={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    const numVal = val === '' ? 0 : parseInt(val, 10);
                                    setQuantities(prev => ({
                                      ...prev,
                                      [product.productId]: numVal,
                                    }));
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                />
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  onClick={() =>
                                    handleQuantityChange(product.productId, 1)
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Total Price */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex flex-shrink-0 items-center justify-between gap-2">
          {currentTab === 'products' && getSelectedProductsCount() > 0 && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleAddAllToOrder}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {getButtonText()}
              </Button>
            </div>
          )}
          {currentTab === 'cart' && getCartProducts().length > 0 && (
            <div className="flex flex-col w-full items-end gap-2">
              <div className="font-semibold">
                Total: ₹
                {getCartProducts()
                  .filter(product => !product.isFreeProduct)
                  .reduce((total, product) => {
                    const qty = quantities[product.productId] ?? product.quantity ?? 0;
                    const price = product.price ?? getProductPrice(product) ?? 0;
                    return total + (price * qty);
                  }, 0)
                  .toLocaleString()}
              </div>
              {hasQuantityChanges() && (
                <Button
                  onClick={handleAddAllToOrder}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {getButtonText()}
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
