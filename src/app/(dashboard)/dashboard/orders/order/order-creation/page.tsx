'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { createColumns } from '@/components/data-tables/orders/order-details/columns';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { AddProductModal } from '@/components/modals/orders/add-product-modal';
import { OutletSelectorModal } from '@/components/modals/orders/outlet-selector-modal';
import { DiscountModal } from '@/components/modals/orders/discount-modal';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useOrders } from '@/features/dashboard/orders/hooks/useOrders';
import { ArrowLeftIcon, Home, Plus, PlusIcon, Store, Edit, FileTextIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedValue } from '@/store/slices/masterRecordsSlice';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { OrderStatus } from '@/constants/enums/orders.enums';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import NavKeys from '@/constants/navkeys';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const PlaceOrdersPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.ORDER} action={MENU_RIGHTS.CREATE}>
      <PlaceOrdersContent />
    </RequirePermission>
  );
};

const PlaceOrdersContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const orderId = searchParams.get('orderId');
  const editParam = searchParams.get('edit');
  const isViewMode = !!(mode === 'view' && orderId);
  const isViewEditMode = !!(mode === 'view-edit' && orderId);
  const [isEditing, setIsEditing] = useState(editParam === 'true');
  const breadcrumb = getBreadcrumbData(
    'order',
    isViewMode ? 'view' : isViewEditMode ? 'edit' : 'create'
  );
  const { warehouses } = useWarehouse();
  const { createOrder, order, updateOrderStatus, updateOrder, calculateReward } = useOrders();
  const orderQuery = order(orderId || '', {});
  const dispatch = useAppDispatch();

  const { userId, authUserName } = useAppSelector((state) => ({
    userId: state.auth.user?.userId,
    authUserName: state.auth.user?.name
  }));
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedOutletName, setSelectedOutletName] = useState('');
  const [selectedOutletStatus, setSelectedOutletStatus] = useState<
    'active' | 'inactive' | 'pending' | 'suspended' | null
  >(null);
  const [selectedOutletDetails, setSelectedOutletDetails] = useState<{
    ownerName?: string;
    ownerPhoneNumber?: string;
  } | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isOutletSelectorOpen, setIsOutletSelectorOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [appliedCustomDiscount, setAppliedCustomDiscount] = useState<{
    type: 'percentage' | 'fixed';
    value: number;
  } | null>(null);
  const [orderProducts, setOrderProducts] = useState<any[]>([]);
  const [initialTab, setInitialTab] = useState('products');
  const [calculatedRewards, setCalculatedRewards] = useState<any>(null);
  const [freeProductIds, setFreeProductIds] = useState<string[]>([]);

  const [availableDiscountedProducts, setAvailableDiscountedProducts] = useState<Array<{
    productId: string;
    quantity: number;
    type: 'discountPercent' | 'discountFixed';
    value: number;
    schemeId: string;
    schemeName: string;
    unitPrice?: number;
    finalPrice?: number;
    totalPrice?: number;
    discountAmount?: number;
  }>>([]);

  const [fetchedProductDetails, setFetchedProductDetails] = useState<Record<string, any>>({});

  const [availableSchemes, setAvailableSchemes] = useState<any[]>([]);
  const [includedSchemes, setIncludedSchemes] = useState<string[]>([]);
  const [excludedSchemes, setExcludedSchemes] = useState<string[]>([]);

  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [selectedSubZoneIds, setSelectedSubZoneIds] = useState<string[]>([]);

  const initializedOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if ((isViewMode || isViewEditMode) && orderQuery.data) {
      const orderData = orderQuery.data;

      // Prevent duplicate initialization for the same order
      if (initializedOrderIdRef.current === orderId) {
        return;
      }

      initializedOrderIdRef.current = orderId || null;

      setSelectedWarehouse(orderData.warehouseId || '');
      setSelectedOutlet(orderData.outletId || '');
      setSelectedOutletName(orderData.outletDetails?.outletName || '');
      setSelectedOutletStatus((orderData.outletDetails?.outletStatus as 'active' | 'inactive' | 'pending' | 'suspended') || null);
      setSelectedOutletDetails({
        ownerName: orderData.outletDetails?.outletName, // Using outlet name as owner name
        ownerPhoneNumber: orderData.outletDetails?.phoneNumber,
      });

      const formattedProducts = orderData.products.map((product: any) => ({
        productId: product.productId,
        productName: product.productName,
        quantity: product.quantity,
        mrp: product.mrp,
        price: product.price,
        finalPrice: product.finalPrice,
        capacity: product.capacity,
        skuCode: product.skuCode || '',
        uom: product.uom || '',
        pictureUrl: product.pictureUrl || '',
        productImages: product.productImages || [],
        brandId: product.brandId || '',
        categoryId: product.categoryId || '',
        subcategoryId: product.subcategoryId || '',
        isFreeProduct: product.isFreeProduct || false,
      }));

      setOrderProducts(formattedProducts);

      const initialIncludedSchemes = orderData.appliedSchemes?.map((s: any) => s.schemeId) || [];
      setIncludedSchemes(initialIncludedSchemes);

      // Use appliedSchemes from order data directly for calculatedRewards
      if (orderData.appliedSchemes && orderData.appliedSchemes.length > 0) {
        setCalculatedRewards({
          appliedSchemes: orderData.appliedSchemes,
          availableSchemes: [],
          totalDiscount: orderData.totalDiscountAmount || 0,
        });
      }

      // Trigger reward calculation for existing order ONLY to show available schemes (not to reapply)
      // Pass isEditMode=true to prevent reapplication of schemes
      if (orderData.warehouseId && orderData.outletId && formattedProducts.length > 0) {
        calculateRewardsForProducts(
          formattedProducts,
          initialIncludedSchemes,
          [],
          orderData.warehouseId,
          orderData.outletId,
          true // isEditMode = true
        );
      }
    } else if (!isViewMode && !isViewEditMode && !orderId) {
      // Clear location filters only when creating a new order
      setSelectedDivisionIds([]);
      setSelectedChannelIds([]);
      setSelectedZoneIds([]);
      setSelectedSubZoneIds([]);
      // Reset the ref when not in edit/view mode
      initializedOrderIdRef.current = null;
    }
  }, [isViewMode, isViewEditMode, orderQuery.data, orderId]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      const productIdsToFetch = new Set<string>();

      // Add free product IDs
      freeProductIds.forEach(id => productIdsToFetch.add(id));

      // Add available discounted product IDs
      availableDiscountedProducts.forEach(p => productIdsToFetch.add(p.productId));

      if (productIdsToFetch.size > 0) {
        const productDetails: Record<string, any> = { ...fetchedProductDetails };

        // Fetch each product individually (skip if already fetched)
        for (const productId of productIdsToFetch) {
          if (productDetails[productId]) continue;

          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/products/${productId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.data) {
                productDetails[productId] = data.data;
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch product details for ${productId}:`, error);
          }
        }

        setFetchedProductDetails(productDetails);
      }
    };

    fetchProductDetails();
  }, [freeProductIds, availableDiscountedProducts]);

  useEffect(() => {
    if (Object.keys(fetchedProductDetails).length > 0) {
      setOrderProducts(prevProducts =>
        prevProducts.map(product => {
          if (product.isFreeProduct && fetchedProductDetails[product.productId]) {
            const productDetail = fetchedProductDetails[product.productId];
            const mrp = productDetail.mrp || 0;

            // Calculate discounted price if discount info exists
            let calculatedPrice = 0;
            if (product.isDiscountedProduct && product.discountType && product.discountValue) {
              if (product.discountType === 'percent') {
                calculatedPrice = mrp - (mrp * product.discountValue / 100);
              } else if (product.discountType === 'fixed') {
                calculatedPrice = Math.max(0, mrp - product.discountValue);
              }
            }

            return {
              ...product,
              productName: productDetail.productName || productDetail.name || `Free: ${product.productId}`,
              capacity: productDetail.capacity || '',
              skuCode: productDetail.skuCode || '',
              uom: productDetail.uom || '',
              pictureUrl: productDetail.pictureUrl || productDetail.imageUrl || '',
              mrp: mrp,
              price: product.isDiscountedProduct ? calculatedPrice : 0,
            };
          }
          return product;
        })
      );
    }
  }, [fetchedProductDetails]);

  const handleWarehouseChange = (value: string | undefined) => {
    setSelectedWarehouse(value || '');
    // Clear calculated rewards and scheme selections when warehouse changes
    setCalculatedRewards(null);
    setAvailableSchemes([]);
    setIncludedSchemes([]);
    setExcludedSchemes([]);
  };

  const handleDivisionChange = (value: string[]) => {
    setSelectedDivisionIds(value);
    // Clear child selections when division changes
    setSelectedChannelIds([]);
    setSelectedZoneIds([]);
    setSelectedSubZoneIds([]);
    dispatch(setSelectedValue({ masterName: 'channel', value: '' }));
    dispatch(setSelectedValue({ masterName: 'zone', value: '' }));
    dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
  };

  const handleChannelChange = (value: string[]) => {
    setSelectedChannelIds(value);
    // Clear child selections when channel changes
    setSelectedZoneIds([]);
    setSelectedSubZoneIds([]);
    dispatch(setSelectedValue({ masterName: 'zone', value: '' }));
    dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
  };

  const handleZoneChange = (value: string[]) => {
    setSelectedZoneIds(value);
    // Clear child selections when zone changes
    setSelectedSubZoneIds([]);
    dispatch(setSelectedValue({ masterName: 'subZone', value: '' }));
  };

  const handleSubZoneChange = (value: string[]) => {
    setSelectedSubZoneIds(value);
  };

  const handleAddProduct = (initialTab: string = 'products') => {
    setInitialTab(initialTab);
    setIsAddProductModalOpen(true);
  };

  const handleOutletSelect = (outlet: {
    outletId: string;
    outletName: string;
    outletStatus: 'active' | 'inactive' | 'pending' | 'suspended';
    ownerName?: string;
    ownerPhoneNumber?: string;
  }) => {
    setSelectedOutlet(outlet.outletId);
    setSelectedOutletName(outlet.outletName);
    setSelectedOutletStatus(outlet.outletStatus);
    setSelectedOutletDetails({
      ownerName: outlet.outletName, // Using outlet name as owner name
      ownerPhoneNumber: outlet.ownerPhoneNumber,
    });

    // Clear scheme selections when outlet changes
    setCalculatedRewards(null);
    setAvailableSchemes([]);
    setIncludedSchemes([]);
    setExcludedSchemes([]);

    // Recalculate rewards when outlet changes (only in create mode)
    if (selectedWarehouse && orderProducts.length > 0 && !isViewEditMode && !isViewMode) {
      calculateRewardsForProducts(orderProducts, [], [], undefined, undefined, false);
    }
  };

  const handleOpenOutletSelector = () => {
    if (!selectedWarehouse) {
      toast.error('Please select a warehouse first');
      return;
    }
    setIsOutletSelectorOpen(true);
  };

  const buildOrderUpdatePayload = (products: any[]): any => {
    return {
      orderId: orderId,
      userId: userId,
      outletId: selectedOutlet,
      warehouseId: selectedWarehouse,
      orderDate: orderQuery.data?.orderDate || new Date().toISOString(),
      orderStatus: orderQuery.data?.orderStatus || OrderStatus.PENDING,
      products: products
        .filter((product) => !product.isFreeProduct)
        .map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          productName: product.productName,
          mrp: product.mrp,
          price: product.price,
          brandId: product.brandId,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
        })),
      ...(includedSchemes.length > 0 && { includeSchemes: includedSchemes }),
      ...(excludedSchemes.length > 0 && { excludeSchemes: excludedSchemes }),
      ...(calculatedRewards?.appliedSchemes && calculatedRewards.appliedSchemes.length > 0 && {
        appliedSchemes: calculatedRewards.appliedSchemes
      }),
    };
  };

  const handlePlaceOrder = () => {
    if (!selectedWarehouse) {
      toast.error('Please select a warehouse');
      return;
    }

    if (!selectedOutlet) {
      toast.error('Please select an outlet');
      return;
    }

    if (selectedOutletStatus === 'suspended') {
      toast.error(
        'Cannot place order for suspended outlet. Please select an active outlet.'
      );
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    const nonFreeProducts = orderProducts.filter((product) => !product.isFreeProduct);
    if (nonFreeProducts.length === 0) {
      toast.error('Please add at least one product to the order');
      return;
    }

    const orderPayload = {
      outletId: selectedOutlet,
      warehouseId: selectedWarehouse,
      orderDate: new Date().toISOString(),
      userId: userId,
      products: orderProducts
        .filter((product) => !product.isFreeProduct) // Exclude free products from API call
        .map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
        })),
      ...(includedSchemes.length > 0 && { includeSchemes: includedSchemes }),
      ...(excludedSchemes.length > 0 && { excludeSchemes: excludedSchemes }),
      ...(calculatedRewards?.appliedSchemes && calculatedRewards.appliedSchemes.length > 0 && {
        appliedSchemes: calculatedRewards.appliedSchemes
      }),
    };

    createOrder.mutate(orderPayload, {
      onSuccess: (response) => {
        toast.success(
          (isViewMode || isViewEditMode)
            ? 'Order updated successfully!'
            : 'Order placed successfully!'
        );
        router.push(NavKeys.DashboardOrders);
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message ||
          ((isViewMode || isViewEditMode)
            ? 'Failed to update order'
            : 'Failed to place order')
        );
      },
    });
  };

  const handleConfirmOrder = () => {
    if (!orderId) {
      toast.error('Order ID is required');
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    if (selectedOutletStatus === 'suspended') {
      toast.error(
        'Cannot confirm order for suspended outlet. Please contact support.'
      );
      return;
    }

    if (selectedOutletStatus === 'pending') {
      toast.error('Cannot confirm order for pending outlet. Please contact support.');
      return;
    }

    updateOrderStatus.mutate(
      {
        orderId: orderId,
        data: { orderStatus: OrderStatus.CONFIRMED },
      },
      {
        onSuccess: () => {
          toast.success('Order confirmed successfully!');
          router.push(NavKeys.DashboardOrders);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message || 'Failed to confirm order'
          );
        },
      }
    );
  };

  const handleDeliverOrder = () => {
    if (!orderId) {
      toast.error('Order ID is required');
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    updateOrderStatus.mutate(
      {
        orderId: orderId,
        data: { orderStatus: OrderStatus.DELIVERED },
      },
      {
        onSuccess: () => {
          toast.success('Order marked as delivered!');
          router.push(NavKeys.DashboardOrders);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message || 'Failed to mark as delivered'
          );
        },
      }
    );
  };

  const handleCancelOrder = () => {
    if (!orderId) {
      toast.error('Order ID is required');
      return;
    }
    updateOrderStatus.mutate(
      {
        orderId: orderId,
        data: { orderStatus: OrderStatus.CANCELLED },
      },
      {
        onSuccess: () => {
          toast.success('Order cancelled successfully!');
          router.push(NavKeys.DashboardOrders);
        },
      }
    );
  };

  const handleProductChange = async (products: any[]) => {
    if ((isViewMode || isViewEditMode) && orderId) {
      setOrderProducts(products);
    } else {
      setOrderProducts(products);
      if (selectedWarehouse && selectedOutlet && products.length > 0) {
        await calculateRewardsForProducts(products, includedSchemes, excludedSchemes, undefined, undefined, false);
      } else if (products.length === 0) {
        setCalculatedRewards(null);
        setAvailableSchemes([]);
        setIncludedSchemes([]);
        setExcludedSchemes([]);
      }
    }
  };

  const handleApplyDiscount = (discountData: {
    type: 'percentage' | 'fixed';
    value: number;
  }) => {
    setAppliedCustomDiscount(discountData);
    toast.success(
      `Custom discount applied: ${discountData.value}${discountData.type === 'percentage' ? '%' : '₹'}`
    );
  };

  const handleRemoveCustomDiscount = () => {
    setAppliedCustomDiscount(null);
    toast.success('Custom discount removed');
  };

  const calculateRewardsForProducts = async (
    products: any[],
    includeSchemes?: string[],
    excludeSchemes?: string[],
    overrideWarehouseId?: string,
    overrideOutletId?: string,
    isEditMode: boolean = false
  ) => {
    const targetWarehouseId = overrideWarehouseId || selectedWarehouse;
    const targetOutletId = overrideOutletId || selectedOutlet;

    if (!targetWarehouseId || !targetOutletId || products.length === 0) {
      return;
    }

    try {
      const nonFreeAndNonDiscountedProducts = products.filter((product) => {
        if (product.isFreeProduct) {
          return false;
        }
        const isDiscountedFromScheme =
          product.isDiscountedProduct &&
          ((product as any).addedFromSchemeId ||
            (product as any).discountedBySchemeId);
        if (isDiscountedFromScheme) {
          return false;
        }
        return true;
      });

      const rewardData = {
        warehouseId: targetWarehouseId,
        outletId: targetOutletId,
        products: nonFreeAndNonDiscountedProducts.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          unitPrice: product.price || product.mrp || 0,
          brandId: product.brandId || '',
          categoryId: product.categoryId || '',
          subcategoryId: product.subcategoryId || '',
        })),
        ...(includeSchemes && includeSchemes.length > 0 && { includeSchemes }),
        ...(excludeSchemes && excludeSchemes.length > 0 && { excludeSchemes }),
      };

      const response = await calculateReward.mutateAsync(rewardData);

      if (!isEditMode) {
        setCalculatedRewards(response);
      }

      const rewardsResponse = response;

      const availableSchemesFromApi = (response as any)?.availableSchemes || [];
      setAvailableSchemes(availableSchemesFromApi);

      if (isEditMode) {
        return;
      }

      const nonFreeProducts = products.filter(p => !p.isFreeProduct);

      const productsWithClearedDiscounts = nonFreeProducts.map(product => {
        if (product.isDiscountedProduct && (product.addedFromSchemeId || product.discountedBySchemeId)) {
          const stillHasDiscount = response.appliedSchemes?.some((scheme: any) =>
            scheme.discountedProducts?.some((dp: any) => dp.productId === product.productId)
          );

          if (!stillHasDiscount) {
            const { isDiscountedProduct, discountedBySchemeId, addedFromSchemeId, productDiscount, finalPrice, ...productWithoutDiscount } = product;
            return {
              ...productWithoutDiscount,
              mrp: product.price || 0,
              price: product.price || 0,
            };
          }
        }
        return product;
      });

      // Add free products and apply discounted products to the order list if there are applied schemes
      if (response.appliedSchemes && response.appliedSchemes.length > 0) {
        const freeProducts: any[] = [];
        const newFreeProductIds: string[] = [];
        const updatedProducts = [...productsWithClearedDiscounts];
        const allDiscountedProductsToFetch: string[] = [];

        response.appliedSchemes.forEach((scheme: any) => {
          if (scheme.freeProducts && scheme.freeProducts.length > 0) {
            scheme.freeProducts.forEach((freeProduct: any) => {
              const isDiscounted = freeProduct.discountType && freeProduct.discountValue;

              freeProducts.push({
                productId: freeProduct.productId,
                productName: `Free: ${freeProduct.productId}`,
                quantity: freeProduct.quantity,
                mrp: 0,
                price: 0,
                capacity: '',
                skuCode: '',
                uom: '',
                pictureUrl: '',
                isFreeProduct: true,
                isDiscountedProduct: isDiscounted,
                discountType: freeProduct.discountType,
                discountValue: freeProduct.discountValue,
              });
              newFreeProductIds.push(freeProduct.productId);
            });
          }

          if (scheme.rewardType === 'productDiscount' && scheme.discountedProducts && scheme.discountedProducts.length > 0) {
            scheme.discountedProducts.forEach((discountedProduct: any) => {
              const productIndex = updatedProducts.findIndex(
                (p) => p.productId === discountedProduct.productId
              );

              const existingProduct = productIndex !== -1 ? updatedProducts[productIndex] : null;
              const isManuallyAdded = existingProduct &&
                !existingProduct.isFreeProduct &&
                !existingProduct.isDiscountedProduct &&
                !(existingProduct as any).addedFromSchemeId &&
                !(existingProduct as any).discountedBySchemeId;

              const existingDiscountedEntryIndex = updatedProducts.findIndex(
                (p) => p.productId === discountedProduct.productId &&
                  p.isDiscountedProduct &&
                  ((p as any).addedFromSchemeId === scheme.schemeId || (p as any).discountedBySchemeId === scheme.schemeId)
              );

              if (isManuallyAdded) {
                if (existingDiscountedEntryIndex === -1) {
                  if (!allDiscountedProductsToFetch.includes(discountedProduct.productId)) {
                    allDiscountedProductsToFetch.push(discountedProduct.productId);
                  }

                  const unitPrice = discountedProduct.unitPrice ?? 0;
                  const finalPrice = discountedProduct.finalPrice ?? 0;

                  updatedProducts.push({
                    productId: discountedProduct.productId,
                    productName: existingProduct.productName || `Loading... ${discountedProduct.productId}`,
                    quantity: discountedProduct.quantity || 1,
                    mrp: 0,
                    price: unitPrice,
                    capacity: existingProduct.capacity || '',
                    skuCode: existingProduct.skuCode || '',
                    uom: existingProduct.uom || '',
                    pictureUrl: existingProduct.pictureUrl || '',
                    productImages: existingProduct.productImages || [],
                    brandId: existingProduct.brandId || '',
                    categoryId: existingProduct.categoryId || '',
                    subcategoryId: existingProduct.subcategoryId || '',
                    isDiscountedProduct: true,
                    productDiscount: {
                      type: discountedProduct.type === 'discountPercent' ? 'percentage' : 'fixed',
                      value: discountedProduct.value || 0,
                    },
                    addedFromSchemeId: scheme.schemeId,
                    finalPrice: finalPrice,
                  });
                } else {
                  const existingDiscountedEntry = updatedProducts[existingDiscountedEntryIndex];
                  updatedProducts[existingDiscountedEntryIndex] = {
                    ...existingDiscountedEntry,
                    quantity: discountedProduct.quantity || existingDiscountedEntry.quantity,
                    finalPrice: discountedProduct.finalPrice ?? existingDiscountedEntry.finalPrice,
                    price: discountedProduct.unitPrice ?? existingDiscountedEntry.price,
                  };
                }
              } else if (productIndex !== -1) {
                const product = updatedProducts[productIndex];
                const isSameScheme = (product as any).discountedBySchemeId === scheme.schemeId ||
                  (product as any).addedFromSchemeId === scheme.schemeId;

                if (isSameScheme) {
                  const discountType = discountedProduct.type === 'discountPercent' ? 'percentage' : 'fixed';
                  const discountValue = discountedProduct.value || 0;

                  const needsNameFetch = !product.productName ||
                    product.productName.includes('Loading...') ||
                    product.productName === product.productId;

                  if (needsNameFetch && !fetchedProductDetails[discountedProduct.productId]) {
                    if (!allDiscountedProductsToFetch.includes(discountedProduct.productId)) {
                      allDiscountedProductsToFetch.push(discountedProduct.productId);
                    }
                  }

                  let productNameUpdate: any = {};
                  if (needsNameFetch && fetchedProductDetails[discountedProduct.productId]) {
                    const productDetail = fetchedProductDetails[discountedProduct.productId];
                    productNameUpdate = {
                      productName: productDetail.productName || productDetail.name || discountedProduct.productId,
                      capacity: productDetail.capacity || product.capacity || '',
                      skuCode: productDetail.skuCode || product.skuCode || '',
                      uom: productDetail.uom || product.uom || '',
                      pictureUrl: productDetail.pictureUrl || productDetail.imageUrl || product.pictureUrl || '',
                      productImages: productDetail.productImages || product.productImages || [],
                      brandId: productDetail.brandId || product.brandId || '',
                      categoryId: productDetail.categoryId || product.categoryId || '',
                      subcategoryId: productDetail.subcategoryId || product.subcategoryId || '',
                    };
                  }

                  updatedProducts[productIndex] = {
                    ...product,
                    ...productNameUpdate,
                    mrp: 0,
                    price: discountedProduct.unitPrice || product.price,
                    isDiscountedProduct: true,
                    productDiscount: {
                      type: discountType,
                      value: discountValue,
                    },
                    discountedBySchemeId: scheme.schemeId,
                    finalPrice: discountedProduct.finalPrice,
                    quantity: discountedProduct.quantity || product.quantity,
                  };
                } else if (existingDiscountedEntryIndex !== -1) {
                  const existingDiscountedEntry = updatedProducts[existingDiscountedEntryIndex];
                  updatedProducts[existingDiscountedEntryIndex] = {
                    ...existingDiscountedEntry,
                    quantity: discountedProduct.quantity || existingDiscountedEntry.quantity,
                    finalPrice: discountedProduct.finalPrice ?? existingDiscountedEntry.finalPrice,
                    price: discountedProduct.unitPrice ?? existingDiscountedEntry.price,
                  };
                } else {
                  if (!allDiscountedProductsToFetch.includes(discountedProduct.productId)) {
                    allDiscountedProductsToFetch.push(discountedProduct.productId);
                  }

                  const unitPrice = discountedProduct.unitPrice ?? 0;
                  const finalPrice = discountedProduct.finalPrice ?? 0;

                  updatedProducts.push({
                    productId: discountedProduct.productId,
                    productName: product.productName || `Loading... ${discountedProduct.productId}`,
                    quantity: discountedProduct.quantity || 1,
                    mrp: 0,
                    price: unitPrice,
                    capacity: product.capacity || '',
                    skuCode: product.skuCode || '',
                    uom: product.uom || '',
                    pictureUrl: product.pictureUrl || '',
                    productImages: product.productImages || [],
                    brandId: product.brandId || '',
                    categoryId: product.categoryId || '',
                    subcategoryId: product.subcategoryId || '',
                    isDiscountedProduct: true,
                    productDiscount: {
                      type: discountedProduct.type === 'discountPercent' ? 'percentage' : 'fixed',
                      value: discountedProduct.value || 0,
                    },
                    addedFromSchemeId: scheme.schemeId,
                    finalPrice: finalPrice,
                  });
                }
              } else {
                if (existingDiscountedEntryIndex === -1) {
                  if (!allDiscountedProductsToFetch.includes(discountedProduct.productId)) {
                    allDiscountedProductsToFetch.push(discountedProduct.productId);
                  }

                  const discountedProductInfo = {
                    productId: discountedProduct.productId,
                    quantity: discountedProduct.quantity || 1,
                    type: discountedProduct.type === 'discountPercent' ? 'discountPercent' : 'discountFixed',
                    value: discountedProduct.value || 0,
                    schemeId: scheme.schemeId,
                    schemeName: scheme.schemeName,
                    unitPrice: discountedProduct.unitPrice,
                    finalPrice: discountedProduct.finalPrice,
                    totalPrice: discountedProduct.totalPrice,
                    discountAmount: discountedProduct.discountAmount,
                  };

                  const unitPrice = discountedProduct.unitPrice ?? 0;
                  const finalPrice = discountedProduct.finalPrice ?? 0;

                  updatedProducts.push({
                    productId: discountedProduct.productId,
                    productName: `Loading... ${discountedProduct.productId}`,
                    quantity: discountedProduct.quantity || 1,
                    mrp: 0,
                    price: unitPrice,
                    capacity: '',
                    skuCode: '',
                    uom: '',
                    pictureUrl: '',
                    productImages: [],
                    brandId: '',
                    categoryId: '',
                    subcategoryId: '',
                    isDiscountedProduct: true,
                    productDiscount: {
                      type: discountedProduct.type === 'discountPercent' ? 'percentage' : 'fixed',
                      value: discountedProduct.value || 0,
                    },
                    addedFromSchemeId: scheme.schemeId,
                    finalPrice: finalPrice,
                  });
                } else {
                  const existingDiscountedEntry = updatedProducts[existingDiscountedEntryIndex];
                  updatedProducts[existingDiscountedEntryIndex] = {
                    ...existingDiscountedEntry,
                    quantity: discountedProduct.quantity || existingDiscountedEntry.quantity,
                    finalPrice: discountedProduct.finalPrice ?? existingDiscountedEntry.finalPrice,
                    price: discountedProduct.unitPrice ?? existingDiscountedEntry.price,
                  };
                }
              }
            });

            setAvailableDiscountedProducts(prev =>
              prev.filter(p => p.schemeId !== scheme.schemeId)
            );
          } else {
            setAvailableDiscountedProducts(prev =>
              prev.filter(p => p.schemeId !== scheme.schemeId)
            );
          }
        });

        if (freeProducts.length > 0) {
          setOrderProducts([...updatedProducts, ...freeProducts]);
          setFreeProductIds(newFreeProductIds);
        } else {
          setOrderProducts(updatedProducts);
          setFreeProductIds([]);
        }

        if (allDiscountedProductsToFetch.length > 0) {
          const fetchPromises = allDiscountedProductsToFetch.map(async (productId) => {
            try {
              const productResponse = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/products/${productId}`);
              if (productResponse.ok) {
                const data = await productResponse.json();
                if (data.data) {
                  const productDetail = data.data;
                  setFetchedProductDetails(prev => ({
                    ...prev,
                    [productId]: productDetail,
                  }));

                  const scheme = (rewardsResponse as any)?.appliedSchemes?.find((s: any) =>
                    s.discountedProducts?.some((dp: any) => dp.productId === productId)
                  );
                  const discountedProduct = scheme?.discountedProducts?.find(
                    (dp: any) => dp.productId === productId
                  );

                  setOrderProducts(prevProducts =>
                    prevProducts.map(product => {
                      if (product.productId === productId &&
                        (product.addedFromSchemeId || product.discountedBySchemeId || product.isDiscountedProduct)) {
                        const unitPrice = discountedProduct?.unitPrice ?? product.price;
                        const finalPriceValue = discountedProduct?.finalPrice ?? (product as any).finalPrice;
                        const quantity = discountedProduct?.quantity ?? product.quantity;

                        return {
                          ...product,
                          productName: productDetail.productName || productDetail.name || productId,
                          capacity: productDetail.capacity || product.capacity || '',
                          skuCode: productDetail.skuCode || product.skuCode || '',
                          uom: productDetail.uom || product.uom || '',
                          pictureUrl: productDetail.pictureUrl || productDetail.imageUrl || product.pictureUrl || '',
                          productImages: productDetail.productImages || product.productImages || [],
                          brandId: productDetail.brandId || product.brandId || '',
                          categoryId: productDetail.categoryId || product.categoryId || '',
                          subcategoryId: productDetail.subcategoryId || product.subcategoryId || '',
                          mrp: 0,
                          price: unitPrice,
                          finalPrice: finalPriceValue,
                          quantity: quantity,
                          isDiscountedProduct: true,
                        };
                      }
                      return product;
                    })
                  );
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch product details for ${productId}:`, error);
            }
          });

          Promise.all(fetchPromises).catch(error => {
            console.error('Error fetching product details:', error);
          });
        }

        if (!isEditMode && response.appliedSchemes.length > 0) {
          toast.success(`Applied ${response.appliedSchemes.length} scheme(s) with rewards!`);
        }
      } else {
        const productsWithoutDiscounts = productsWithClearedDiscounts.map(product => {
          if (product.isDiscountedProduct) {
            const { isDiscountedProduct, discountedBySchemeId, addedFromSchemeId, productDiscount, finalPrice, ...productWithoutDiscount } = product;
            return {
              ...productWithoutDiscount,
              mrp: product.price || 0,
              price: product.price || 0,
            };
          }
          return product;
        });
        setOrderProducts(productsWithoutDiscounts);
        setFreeProductIds([]);
      }
    } catch (error: any) {
      console.error('Failed to calculate rewards:', error);
    }
  };

  const handleIncludeScheme = async (schemeId: string) => {
    if (includedSchemes.includes(schemeId)) {
      return;
    }

    const newIncludedSchemes = [...includedSchemes, schemeId];
    const newExcludedSchemes = excludedSchemes.filter(id => id !== schemeId);

    setIncludedSchemes(newIncludedSchemes);
    setExcludedSchemes(newExcludedSchemes);

    if (selectedWarehouse && selectedOutlet && orderProducts.length > 0) {
      const isEditMode = (isViewMode || isViewEditMode) && !!orderId;
      await calculateRewardsForProducts(orderProducts, newIncludedSchemes, newExcludedSchemes, undefined, undefined, isEditMode);
    }
  };

  const handleExcludeScheme = async (schemeId: string) => {
    const newExcludedSchemes = [...excludedSchemes, schemeId];
    const newIncludedSchemes = includedSchemes.filter(id => id !== schemeId);

    setExcludedSchemes(newExcludedSchemes);
    setIncludedSchemes(newIncludedSchemes);

    const productsWithRemovedDiscounts = orderProducts
      .filter(product => {
        if (product.addedFromSchemeId === schemeId) {
          return false;
        }
        return true;
      })
      .map(product => {
        if (product.discountedBySchemeId === schemeId) {
          const { discountedBySchemeId, isDiscountedProduct, productDiscount, ...productWithoutDiscount } = product;
          return productWithoutDiscount;
        }
        return product;
      });

    setOrderProducts(productsWithRemovedDiscounts);

    // Remove available discounted products for this scheme
    setAvailableDiscountedProducts(prev =>
      prev.filter(p => p.schemeId !== schemeId)
    );

    // Recalculate rewards with new scheme selection and updated products
    if (selectedWarehouse && selectedOutlet && productsWithRemovedDiscounts.length > 0) {
      const isEditMode = (isViewMode || isViewEditMode) && !!orderId;
      await calculateRewardsForProducts(productsWithRemovedDiscounts, newIncludedSchemes, newExcludedSchemes, undefined, undefined, isEditMode);
    } else if (productsWithRemovedDiscounts.length === 0) {
      // If no products left, clear rewards
      setCalculatedRewards(null);
      setAvailableSchemes([]);
      setAvailableDiscountedProducts([]);
    }
  };

  const handleProductDiscountChange = (
    productId: string,
    discount: { type: 'percentage' | 'fixed'; value: number } | null
  ) => {
    setOrderProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.productId === productId
          ? { ...product, productDiscount: discount }
          : product
      )
    );
  };

  const calculateItemTotal = () => {
    return orderProducts
      .filter((product) => !product.isFreeProduct)
      .reduce((total, product) => {
        if (product.isDiscountedProduct && (product.addedFromSchemeId || product.discountedBySchemeId)) {
          const finalPrice = (product as any).finalPrice;
          if (finalPrice !== undefined && finalPrice > 0) {
            return total + finalPrice;
          }
          const unitPrice = product.price ?? product.mrp ?? 0;
          const quantity = product.quantity ?? 1;
          const discountValue = product.productDiscount?.value || 0;
          let calculatedFinalPricePerUnit = unitPrice;
          if (product.productDiscount?.type === 'percentage') {
            calculatedFinalPricePerUnit = unitPrice - (unitPrice * discountValue / 100);
          } else if (product.productDiscount?.type === 'fixed') {
            calculatedFinalPricePerUnit = Math.max(0, unitPrice - discountValue);
          }
          return total + (calculatedFinalPricePerUnit * quantity);
        }

        const price = product.price ?? product.mrp ?? 0;
        const quantity = product.quantity ?? 1;
        const baseTotal = price * quantity;
        let discountAmount = 0;
        if (product.productDiscount) {
          if (product.productDiscount.type === 'percentage') {
            discountAmount = (baseTotal * product.productDiscount.value) / 100;
          } else {
            discountAmount = Math.min(product.productDiscount.value, baseTotal);
          }
        }

        return total + (baseTotal - discountAmount);
      }, 0);
  };

  const calculateCustomDiscountAmount = () => {
    if (!appliedCustomDiscount) return 0;

    const itemTotal = calculateItemTotal();

    if (appliedCustomDiscount.type === 'percentage') {
      return (itemTotal * appliedCustomDiscount.value) / 100;
    } else {
      return Math.min(appliedCustomDiscount.value, itemTotal);
    }
  };

  const hasProductLevelDiscounts = () => {
    if (!calculatedRewards?.appliedSchemes || calculatedRewards.appliedSchemes.length === 0) {
      return false;
    }

    const allProductLevelSchemes = calculatedRewards.appliedSchemes.every(
      (scheme: any) => scheme.rewardType === 'productDiscount'
    );

    if (!allProductLevelSchemes) {
      return false;
    }

    const discountedProductIds = new Set<string>();
    calculatedRewards.appliedSchemes.forEach((scheme: any) => {
      if (scheme.discountedProducts) {
        scheme.discountedProducts.forEach((dp: any) => {
          discountedProductIds.add(dp.productId);
        });
      }
    });

    const hasDiscountedProductsInCart = orderProducts.some(
      (product) =>
        !product.isFreeProduct &&
        discountedProductIds.has(product.productId) &&
        product.isDiscountedProduct &&
        (product.addedFromSchemeId || product.discountedBySchemeId)
    );

    return hasDiscountedProductsInCart;
  };

  const calculateFinalTotal = () => {
    const itemTotal = calculateItemTotal();
    const customDiscountAmount = calculateCustomDiscountAmount();

    const rewardDiscountAmount = hasProductLevelDiscounts()
      ? 0
      : (calculatedRewards?.totalDiscount || 0);

    return Math.max(0, itemTotal - customDiscountAmount - rewardDiscountAmount);
  };

  if ((isViewMode || isViewEditMode) && orderQuery.isLoading) {
    return (
      <section className="w-full space-y-6">
        <BreadcrumbHeader {...breadcrumb} />
        <div className="flex h-64 items-center justify-center rounded-lg bg-white">
          <Loading text="Loading order details..." />
        </div>
      </section>
    );
  }

  if ((isViewMode || isViewEditMode) && orderQuery.error) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={NavKeys.DashboardOrders}
                  className="flex items-center gap-1"
                >
                  <Home className="h-3 w-3" /> Orders
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Order Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={NavKeys.Orders}
                className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold">Order Details</h1>
                <p className="text-sm text-neutral-500">
                  Failed to load order details
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-64 items-center justify-center">
          <GenericError text="Error loading order details. Please try again." />
        </div>
      </section>
    );
  }

  if ((isViewMode || isViewEditMode) && orderQuery.isFetching) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={NavKeys.DashboardOrders}
                  className="flex items-center gap-1"
                >
                  <Home className="h-3 w-3" /> Orders
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Order Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={NavKeys.Orders}
                className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold">Order Details</h1>
                <p className="text-sm text-neutral-500">Updating order...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg bg-white">
          <Loading text="Updating order..." />
        </div>
      </section>
    );
  }

  const handleUpdateOrder = () => {
    if (!orderId) {
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    if (!selectedWarehouse) {
      toast.error('Please select a warehouse');
      return;
    }

    if (!selectedOutlet) {
      toast.error('Please select an outlet');
      return;
    }

    const nonFreeProducts = orderProducts.filter((product) => !product.isFreeProduct);
    if (nonFreeProducts.length === 0) {
      toast.error('Please add at least one product to the order');
      return;
    }

    const orderPayload = buildOrderUpdatePayload(orderProducts);

    updateOrder.mutate(
      { orderId, data: orderPayload },
      {
        onSuccess: () => {
          toast.success('Order updated successfully!');
          router.push(NavKeys.DashboardOrders);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message || 'Failed to update order'
          );
        },
      }
    );
  };

  const isReadOnly = (isViewMode || isViewEditMode) && !isEditing;

  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader
        {...breadcrumb}
        actions={
          (isViewMode || isViewEditMode) &&
            !isEditing &&
            orderQuery.data?.orderStatus !== OrderStatus.DELIVERED &&
            orderQuery.data?.orderStatus !== OrderStatus.CANCELLED &&
            orderQuery.data?.orderStatus !== OrderStatus.CONFIRMED ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </Button>
          ) : undefined
        }
      />

      {!isViewMode && !isViewEditMode && (
        <div className="rounded-lg bg-white p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Order Details
          </div>

          {(!(isViewMode || isViewEditMode)) ||
            ((isViewMode || isViewEditMode) &&
              orderQuery.data?.orderStatus === OrderStatus.PENDING) ? (
            <div className="space-y-4">
              {/* Location Filters */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">


                {/* Division */}
                <div className="space-y-2">
                  <Label>Division</Label>
                  <MasterRecordCheckboxMultiSelect
                    masterName="division"
                    value={selectedDivisionIds}
                    onChange={handleDivisionChange}
                    placeholder="Division"
                    className="w-full"
                    displayName="division"
                    disabled={isReadOnly}
                    userId={userId}
                  />
                </div>

                {/* Channel */}
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <MasterRecordCheckboxMultiSelect
                    masterName="channel"
                    value={selectedChannelIds}
                    onChange={handleChannelChange}
                    placeholder="Channel"
                    className="w-full"
                    displayName="channel"
                    disabled={isReadOnly}
                    filters={
                      selectedDivisionIds.length > 0
                        ? { divisionId: selectedDivisionIds }
                        : undefined
                    }
                    userId={userId}
                  />
                </div>

                {/* Zone */}
                <div className="space-y-2">
                  <Label>Zone</Label>
                  <MasterRecordCheckboxMultiSelect
                    masterName="zone"
                    value={selectedZoneIds}
                    onChange={handleZoneChange}
                    placeholder="Zone"
                    className="w-full"
                    displayName="zone"
                    disabled={isReadOnly}
                    filters={
                      selectedChannelIds.length > 0
                        ? { channelId: selectedChannelIds }
                        : undefined
                    }
                    userId={userId}
                  />
                </div>

                {/* Subzone */}
                <div className="space-y-2">
                  <Label>Subzone</Label>
                  <MasterRecordCheckboxMultiSelect
                    masterName="subZone"
                    value={selectedSubZoneIds}
                    onChange={handleSubZoneChange}
                    placeholder="Subzone"
                    className="w-full"
                    displayName="subzone"
                    disabled={isReadOnly}
                    filters={
                      selectedZoneIds.length > 0
                        ? { zoneId: selectedZoneIds }
                        : undefined
                    }
                    userId={userId}
                  />
                </div>

                {/* Warehouse */}
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <WarehouseDropdown
                    value={selectedWarehouse}
                    onChange={(isViewMode || isViewEditMode) ? undefined : handleWarehouseChange}
                    placeholder={
                      warehouses.isLoading
                        ? 'Loading warehouses...'
                        : 'Select warehouse'
                    }
                    className="w-full"
                    disabled={isReadOnly}
                    userId={userId}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Outlet</Label>
                  <Button
                    variant="white"
                    onClick={
                      isReadOnly
                        ? undefined
                        : selectedWarehouse
                          ? handleOpenOutletSelector
                          : undefined
                    }
                    className={`w-full justify-start text-left font-normal ${selectedOutletName ? '' : 'text-muted-foreground'
                      } ${!selectedWarehouse && !isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isReadOnly || !selectedWarehouse}
                  >
                    {selectedOutletName ||
                      (selectedWarehouse
                        ? 'Select outlet'
                        : 'Select warehouse first')}
                  </Button>
                </div>

                {/* Placed By */}
                <div className="space-y-2">
                  <Label>Placed By</Label>
                  <Input
                    value={orderQuery.data?.userName || '-'}
                    disabled={true}
                    className="w-full bg-gray-100"
                  />
                </div>
              </div>

              {/* Outlet Selection */}
            </div>
          ) : null}
        </div>
      )}

      {/* Selected Outlet Information */}
      {((selectedOutlet && selectedOutletName) || ((isViewMode || isViewEditMode) && orderQuery.data?.outletDetails)) && (
        <div className="rounded-lg bg-white p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Selected Outlet Information
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Outlet Name
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.outletDetails?.outletName
                  ? orderQuery.data.outletDetails.outletName
                  : selectedOutletName || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Outlet Code
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.outletDetails?.outletCode
                  ? orderQuery.data.outletDetails.outletCode
                  : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Owner Name
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.outletDetails?.ownerName
                  ? orderQuery.data.outletDetails.ownerName
                  : selectedOutletDetails?.ownerName || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Phone Number
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.outletDetails?.phoneNumber
                  ? orderQuery.data.outletDetails.phoneNumber
                  : selectedOutletDetails?.ownerPhoneNumber || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Email
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.outletDetails?.email
                  ? orderQuery.data.outletDetails.email
                  : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Outlet Status
              </Label>
              <div>
                {renderStatusBadge(
                  (isViewMode || isViewEditMode) && orderQuery.data?.outletDetails?.outletStatus
                    ? orderQuery.data.outletDetails.outletStatus
                    : selectedOutletStatus || '',
                  StatusType.OUTLET
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Warehouse
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.warehouseDetails?.warehouseName
                  ? orderQuery.data.warehouseDetails.warehouseName
                  : warehouses.data?.data?.items?.find(
                    (w) => w.warehouseId === selectedWarehouse
                  )?.warehouseName || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Placed By
              </Label>
              <div className="font-medium">
                {(isViewMode || isViewEditMode) && orderQuery.data?.userName
                  ? orderQuery.data.userName
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-lg bg-white p-4">
        <div className="bg-background mb-2 flex items-center rounded-lg p-2">
          <span className="text-lg font-medium">Product List</span>
        </div>

        {!selectedOutlet && !(isViewMode || isViewEditMode) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Outlet Selected
            </h3>
            <p className="mb-4 max-w-md text-sm text-gray-500">
              Please select a warehouse and outlet first to start adding
              products to your order.
            </p>
            <div className="flex flex-col gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${selectedWarehouse ? 'bg-green-500' : 'bg-gray-300'}`}
                ></span>
                <span className={selectedWarehouse ? 'text-green-600' : ''}>
                  {selectedWarehouse
                    ? 'Warehouse selected'
                    : 'Select warehouse'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${selectedOutlet ? 'bg-green-500' : 'bg-gray-300'}`}
                ></span>
                <span className={selectedOutlet ? 'text-green-600' : ''}>
                  {selectedOutlet ? 'Outlet selected' : 'Select outlet'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <DataTable
              columns={createColumns()}
              data={orderProducts.map((product) => ({
                ...product,
                onDiscountChange: handleProductDiscountChange,
              }))}
              hidePagination={true}
              tableId="order-creation-table"
            />
          </>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isReadOnly &&
              (!(isViewMode || isViewEditMode) ||
                ((isViewMode || isViewEditMode) &&
                  orderQuery.data?.orderStatus === OrderStatus.PENDING)) &&
              selectedOutlet &&
              selectedWarehouse && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddProduct('products')}
                    className="flex flex-row items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Product</span>
                  </Button>
                  {orderProducts.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddProduct('cart')}
                      className="flex flex-row items-center justify-center gap-2"
                    >
                      <Edit className="h-5 w-5" />
                      <span>Edit Orders</span>
                    </Button>
                  )}
                </>
              )}
          </div>
        </div>
      </div>

      {/* Bill Details Section */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Bill Details
        </div>

        {(isViewMode || isViewEditMode) && !isEditing && orderQuery.data ? (
          // Show actual bill details from API for existing orders
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Item Total:</span>
              <span className="font-medium">
                ₹{orderQuery.data.itemTotalAmount?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium text-green-600">
                -₹{orderQuery.data.totalDiscountAmount?.toLocaleString() || '0'}
              </span>
            </div>
            {orderQuery.data.appliedSchemes &&
              orderQuery.data.appliedSchemes.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Applied Schemes:</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {orderQuery.data.appliedSchemes.map(
                      (scheme: any, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-green-100 text-xs text-green-800"
                        >
                          {scheme.schemeName}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-semibold">Total Order Value:</span>
              <span className="text font-semibold text-black">
                ₹{orderQuery.data.totalOrderAmount?.toLocaleString() || '0'}
              </span>

            </div>

            {/* Warning message for pending outlet status - only show in edit mode */}
            {isViewEditMode && selectedOutletStatus === 'pending' && (
              <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-center gap-2">
                  <div className="text-yellow-600"></div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Cannot confirm order: Outlet status is pending. Please activate the outlet to proceed with order confirmation.
                  </p>
                </div>
              </div>
            )}

            {/* Applied Schemes */}
          </div>
        ) : (
          // Show calculated bill details for new orders
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Item Total:</span>
              <span className="font-medium">
                ₹{calculateItemTotal().toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium text-green-600">-₹0</span>
            </div>
            {calculatedRewards && calculatedRewards.totalDiscount > 0 && !hasProductLevelDiscounts() && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Scheme Discount:</span>
                <span className="font-medium text-green-600">
                  -₹{calculatedRewards.totalDiscount.toLocaleString()}
                </span>
              </div>
            )}
            {calculatedRewards && calculatedRewards.appliedSchemes && calculatedRewards.appliedSchemes.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Applied Schemes:</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {calculatedRewards.appliedSchemes.map((scheme: any, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-green-100 text-xs text-green-800"
                    >
                      {scheme.schemeName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {appliedCustomDiscount && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">
                    Custom Discount ({appliedCustomDiscount.value}
                    {appliedCustomDiscount.type === 'percentage' ? '%' : '₹'}):
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-700"
                    onClick={handleRemoveCustomDiscount}
                    title="Remove custom discount"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-medium text-green-600">
                  -₹{calculateCustomDiscountAmount().toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-semibold">Total Order Value:</span>
              <span className="text-lg font-bold text-black">
                ₹{calculateFinalTotal().toLocaleString()}
              </span>
            </div>

            {/* Warning message for pending outlet status - only show in edit mode */}
            {(isViewMode || isViewEditMode) && selectedOutletStatus === 'pending' && (
              <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-center gap-2">
                  <div className="text-yellow-600">⚠️</div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Cannot confirm order: Outlet status is pending. Please activate the outlet to proceed with order confirmation.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Discount and Calculate Rewards Buttons */}
        {!isReadOnly && (
          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex flex-row items-center justify-center gap-2"
              onClick={() => setIsDiscountModalOpen(true)}
            >
              <PlusIcon className="h-5 w-5" />
              <span>Custom Discount</span>
            </Button>
          </div>
        )}
      </div>

      {/* Applied Schemes Section */}
      {(() => {
        // Combine API-applied schemes and user-selected schemes
        const apiAppliedSchemes = calculatedRewards?.appliedSchemes || [];
        const apiAppliedSchemeIds = apiAppliedSchemes.map((s: any) => s.schemeId);
        const allAppliedSchemeIds = [...new Set([...includedSchemes, ...apiAppliedSchemeIds])];

        if (allAppliedSchemeIds.length === 0) return null;

        return (
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Applied Schemes
            </div>
            <div className="space-y-3">
              {allAppliedSchemeIds.map((schemeId) => {
                // Find scheme from API applied schemes or available schemes
                const scheme = apiAppliedSchemes.find((s: any) => s.schemeId === schemeId) ||
                  availableSchemes.find((s: any) => s.schemeId === schemeId);

                if (!scheme) return null;

                const isUserSelected = includedSchemes.includes(schemeId);

                return (
                  <div
                    key={schemeId}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-900">
                          {scheme.schemeName}
                        </span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Applied
                        </Badge>
                      </div>
                      {scheme.description && (
                        <p className="text-sm text-green-700 mt-1">
                          {scheme.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExcludeScheme(schemeId)}
                        className="flex items-center gap-1 text-red-600 hover:bg-red-50 border-red-200"
                        disabled={isReadOnly}
                      >
                        <span className="text-xs">✕</span>
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Available Schemes Section */}
      {(() => {
        // Get all applied scheme IDs
        const apiAppliedSchemeIds = calculatedRewards?.appliedSchemes?.map((s: any) => s.schemeId) || [];
        const allAppliedSchemeIds = new Set([...includedSchemes, ...apiAppliedSchemeIds]);

        // Only show schemes not already applied
        const availableSchemesToShow = availableSchemes.filter(
          (scheme: any) => !allAppliedSchemeIds.has(scheme.schemeId)
        );

        if (availableSchemesToShow.length === 0) return null;

        return (
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Available Schemes
            </div>
            <div className="mb-2 text-sm text-gray-600">
              You can apply multiple schemes to maximize your rewards. Click "Apply" on each scheme you want to use.
            </div>
            <div className="space-y-3">
              {availableSchemesToShow.map((scheme, index) => {
                const isExcluded = excludedSchemes.includes(scheme.schemeId);

                return (
                  <div
                    key={scheme.schemeId || index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {scheme.schemeName}
                        </span>
                        {isExcluded && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            Excluded
                          </Badge>
                        )}
                      </div>
                      {scheme.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {scheme.description}
                        </p>
                      )}
                      {scheme.reason && (
                        <p className="mt-1 text-sm text-gray-500">
                          {scheme.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleIncludeScheme(scheme.schemeId)}
                        className="flex items-center gap-1 text-green-600 hover:bg-green-50 border-green-200"
                        disabled={isReadOnly}
                      >
                        <span className="text-xs">✓</span>
                        Apply
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}



      <div className="flex justify-end gap-2">
        {!isViewMode && !isViewEditMode && (
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={NavKeys.DashboardOrders}>Cancel</Link>
            </Button>
            <Button
              type="button"
              className="flex items-center gap-2"
              onClick={handlePlaceOrder}
              disabled={
                createOrder.isPending || selectedOutletStatus === 'suspended'
              }
              title={
                selectedOutletStatus === 'suspended'
                  ? 'Cannot place order for suspended outlet'
                  : ''
              }
            >
              {createOrder.isPending ? 'Placing Order...' : 'Place Order'}
            </Button>
          </>
        )}

        {/* View mode with editing enabled - show Cancel, Cancel Order, and Confirm Order buttons */}
        {(isViewMode || isViewEditMode) && isEditing && (
          <div className="flex flex-row items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                if (orderQuery.data) {
                  orderQuery.refetch();
                }
              }}
            >
              Discard Changes
            </Button>
            {orderQuery.data?.orderStatus === OrderStatus.PENDING && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={updateOrderStatus.isPending || updateOrder.isPending}
                >
                  {updateOrderStatus.isPending
                    ? 'Cancelling Order...'
                    : 'Cancel Order'}
                </Button>
                <Button
                  type="button"
                  className="flex items-center gap-2"
                  onClick={handleConfirmOrder}
                  disabled={
                    updateOrderStatus.isPending ||
                    updateOrder.isPending ||
                    selectedOutletStatus === 'suspended' ||
                    selectedOutletStatus === 'pending'
                  }
                  title={
                    selectedOutletStatus === 'suspended'
                      ? 'Cannot confirm order for suspended outlet'
                      : selectedOutletStatus === 'pending'
                        ? 'Cannot confirm order for pending outlet. The outlet status should be active '
                        : ''
                  }
                >
                  {updateOrderStatus.isPending
                    ? 'Confirming Order...'
                    : 'Confirm Order'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={handleUpdateOrder}
                  disabled={updateOrder.isPending || updateOrderStatus.isPending}
                >
                  {updateOrder.isPending ? 'Updating Order...' : 'Update Order'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* View-edit mode - show Confirm and Cancel Order buttons */}
        {isViewEditMode &&
          !isEditing &&
          orderQuery.data?.orderStatus === OrderStatus.PENDING && (
            <div className="flex flex-row items-center gap-2">
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={updateOrderStatus.isPending}
              >
                {updateOrderStatus.isPending
                  ? 'Cancelling Order...'
                  : 'Cancel Order'}
              </Button>
              <Button
                type="button"
                className="flex items-center gap-2"
                onClick={handleConfirmOrder}
                disabled={
                  updateOrderStatus.isPending ||
                  selectedOutletStatus === 'suspended' ||
                  selectedOutletStatus === 'pending'
                }
                title={
                  selectedOutletStatus === 'suspended'
                    ? 'Cannot confirm order for suspended outlet'
                    : selectedOutletStatus === 'pending'
                      ? 'Cannot confirm order for pending outlet. The outlet status should be active '
                      : ''
                }
              >
                {updateOrderStatus.isPending
                  ? 'Confirming Order...'
                  : 'Confirm Order'}
              </Button>
            </div>
          )}

        {isViewEditMode &&
          orderQuery.data?.orderStatus === OrderStatus.CONFIRMED && (
            <div className="mb-4 flex flex-row items-center gap-2">
              <Button
                type="button"
                className="flex items-center gap-2"
                onClick={handleDeliverOrder}
                disabled={updateOrderStatus.isPending}
              >
                {updateOrderStatus.isPending
                  ? 'Marking as Delivered...'
                  : 'Delivered'}
              </Button>
            </div>
          )}

        {/* Invoice Actions - Show for all order statuses in edit mode */}
        {/* {isViewEditMode && orderId && (
          <div className="mb-4 flex flex-row items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleViewInvoices}
            >
              <FileTextIcon className="h-4 w-4" />
              View Invoices
            </Button>
          </div>
        )} */}
      </div>

      {(!isViewEditMode ||
        (isViewEditMode &&
          orderQuery.data?.orderStatus === OrderStatus.PENDING)) && (
          <AddProductModal
            open={isAddProductModalOpen}
            onOpenChange={setIsAddProductModalOpen}
            onProductsChange={handleProductChange}
            currentOrderProducts={orderProducts}
            initialTab={initialTab}
            warehouseId={selectedWarehouse}
          />
        )}

      {(!isViewEditMode ||
        (isViewEditMode &&
          orderQuery.data?.orderStatus === OrderStatus.PENDING)) && (
          <OutletSelectorModal
            open={isOutletSelectorOpen}
            onOpenChange={setIsOutletSelectorOpen}
            onOutletSelect={handleOutletSelect}
            selectedOutletId={selectedOutlet}
            warehouseId={selectedWarehouse}
            outletType="customer-outlet"
          />
        )}

      {/* Discount Modal */}
      <DiscountModal
        open={isDiscountModalOpen}
        onOpenChange={setIsDiscountModalOpen}
        onApplyDiscount={handleApplyDiscount}
      />
    </section>
  );
};

export default PlaceOrdersPage;