'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/features/dashboard/products/hooks/useProducts';
import { useStockaudit } from '@/features/dashboard/products/hooks/useStockaudit';
import { ShoppingCart, Plus, Minus, LeafyGreenIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { Tabs as TabsStyled } from '@/components/ui/tabs-styled';
import { useRouter } from 'next/navigation';

interface ProductItem {
  _id: string;
  productId: string;
  productName: string;
  skuCode: string;
  description: string;
  hsnCode: string;
  pictureUrl: string;
  isActive: boolean;
  mrp: number;
  minimumPrice: number;
  gstPercentage: number;
  unitsPerCase: number;
  packageId: string;
  brandId: string;
  uom: string;
  capacity: number;
  categoryId: string;
  subcategoryId: string;
  warehouses: any[];
  createdAt: string;
  updatedAt: string;
  quantity: number;
}

interface OutletStockAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsChange: (products: ProductItem[]) => void;
  initialProducts?: any[];
  outletId: string; 
}

export const OutletStockAuditModal = ({
  open,
  onOpenChange,
  onProductsChange,
  initialProducts = [],
  outletId, 
}: OutletStockAuditModalProps) => {
    console.log('OutletStockAuditModal outletId:', outletId);
  const { products } = useProducts({ enabled: open, nonPaginated: true });
  const { fetchByOutletId, updateStockAudit, createStockAudit } = useStockaudit();
  const stockAuditQuery = fetchByOutletId(outletId, open && !!outletId);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [currentTab, setCurrentTab] = useState('products');
  const [stockAuditId, setStockAuditId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // Added isSaving state

  useEffect(() => {
    if (open && outletId) {
      // When modal opens, fetch stock audit and initialize quantities
      if (stockAuditQuery.data?.data) {
        const initialQuantities: Record<string, number> = {};
        stockAuditQuery.data.data.products.forEach((product: any) => {
          initialQuantities[product.productId] = product.currentStock;
        });
        setQuantities(initialQuantities);
        setStockAuditId(stockAuditQuery.data.data.stockAuditId);
      } else {
        setQuantities({});
        setStockAuditId(null);
      }
      setCurrentTab('products');
    } else {
      setSearchTerm('');
      setQuantities({});
      setCurrentTab('products');
      setStockAuditId(null);
    }
  }, [open, outletId, stockAuditQuery.data]);


  const filteredProducts =
    products.data?.data?.items?.filter(
      (product: ProductItem) =>
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.skuCode.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Products for "Current Audit" tab: all products with quantity > 0
  const getAuditProducts = () => {
    return filteredProducts
      .filter((product: ProductItem) => quantities[product.productId] > 0)
      .map((product: ProductItem) => ({
        ...product,
        quantity: quantities[product.productId],
      }));
  };

  const tabs = [
    {
      title: 'All Products',
      value: 'products',
    },
    {
      title: `Current Audit (${getAuditProducts().length})`,
      value: 'audit',
    },
  ];

  const handleQuantityChange = (productId: string, change: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change),
    }));
  };

  const handleSaveAudit = async () => {
    setIsSaving(true); // Start saving
    let selectedProducts: ProductItem[] = [];
    if (currentTab === 'products') {
      selectedProducts = filteredProducts
        .filter((product: ProductItem) => quantities[product.productId] > 0)
        .map((product: ProductItem) => ({
          ...product,
          quantity: quantities[product.productId],
        }));
    } else if (currentTab === 'audit') {
      selectedProducts = getAuditProducts();
    }

    const patchProducts = selectedProducts.map((product: ProductItem) => ({
      productId: product.productId,
      currentStock: product.quantity,
    }));

    if (stockAuditId) {
      await updateStockAudit.mutateAsync({
        stockAuditId,
        data: {
          outletId,
          products: patchProducts,
          isDeleted: false,
        },
      });
    } else {
      // If no stockAuditId, create a new stock audit
      await createStockAudit.mutateAsync({
        outletId,
        visitOrderId: '', // Provide visitOrderId if available, else empty string
        products: patchProducts,
      });
    }
    onProductsChange(selectedProducts);
    onOpenChange(false);
    setIsSaving(false); // End saving
  };

  const handleViewLogs = () => {
    if (stockAuditId) {
      router.push(
        `/logs?service=product&module=stock_audit&metaTags.stockAuditId=${stockAuditId}`
      );
    }
  };

  const getProductImageUrl = (product: ProductItem) => {
    if (product.pictureUrl) {
      return getCloudFrontUrl(product.pictureUrl);
    }
    return 'https://iili.io/FELDNUJ.png';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle>
              <div className="flex flex-col gap-1">
                <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                  <ShoppingCart className="text-freshleaf h-5 w-5" />
                </div>
                <div className="text-lg font-medium">Outlet Stock Audit</div>
                <div className="text-sm font-normal text-zinc-500">
                  Search and enter stock quantities for products
                </div>
              </div>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewLogs}
              disabled={!stockAuditId}
              className="ml-4"
            >
              View Logs
            </Button>
          </div>
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
              <div className="flex-shrink-0">
                <SearchInput
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                  className="w-full"
                />
              </div>

              <ScrollArea className="min-h-0 w-full flex-1">
                {products.isLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loading text="Loading products..." />
                  </div>
                ) : products.isError ? (
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
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  'hidden'
                                );
                              }}
                            />
                            <div
                              className={`text-sm text-neutral-200 ${product.pictureUrl ? 'hidden' : ''}`}
                            >
                              <LeafyGreenIcon className="h-10 w-10" />
                            </div>
                          </div>

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
                              <span className="text-lg font-semibold text-green-600">
                                ₹{product.mrp}
                              </span>
                              <span className="text-xs text-gray-500">
                                {product.capacity} {product.uom}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center overflow-x-auto gap-2">
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

          {currentTab === 'audit' && (
            <ScrollArea className="min-h-0 w-full flex-1">
              {getAuditProducts().length === 0 ? (
                <div className="flex h-[350px] items-center justify-center">
                  <EmptyState text="No products selected for audit yet." />
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  {getAuditProducts().map((product: ProductItem) => (
                    <Card key={product.productId} className="border shadow-none">
                      <CardContent className="flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.productName}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove(
                                'hidden'
                              );
                            }}
                          />
                          <div
                            className={`text-sm text-neutral-200 ${product.pictureUrl ? 'hidden' : ''}`}
                          >
                            <LeafyGreenIcon className="h-6 w-6" />
                          </div>
                        </div>
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
                            <span className="text-base font-semibold text-green-600">
                              ₹{product.mrp}
                            </span>
                            <span className="text-xs text-gray-500">
                              {product.capacity} {product.uom}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center overflow-x-auto gap-2">
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handleQuantityChange(product.productId, -1)}
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
                            onClick={() => handleQuantityChange(product.productId, 1)}
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
          )}
        </div>

        <DialogFooter className="flex flex-shrink-0 items-center justify-end gap-2">
          <Button
            onClick={handleSaveAudit}
            className="flex items-center gap-2"
            disabled={
              (currentTab === 'products' &&
                !filteredProducts.some((product: ProductItem) => quantities[product.productId] > 0)) ||
              (currentTab === 'audit' && getAuditProducts().length === 0)
            }
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <Loading className="h-4 w-4 text-white" text="" />
              </span>
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Save Audit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
