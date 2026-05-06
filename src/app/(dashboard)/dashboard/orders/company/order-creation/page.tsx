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
import { ArrowLeftIcon, Home, Plus, PlusIcon, Store, Edit, FileTextIcon } from 'lucide-react';
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
  const isViewEditMode = mode === 'view-edit' && orderId;
  const breadcrumb = getBreadcrumbData(
    'order',
    isViewEditMode ? 'edit' : 'create'
  );
  const { warehouses } = useWarehouse();
  const { createOrder, order, updateOrderStatus, updateOrder, calculateReward } = useOrders();
  const orderQuery = order(orderId || '', {});
  const dispatch = useAppDispatch();

  const userId = useAppSelector((state) => state.auth.user?.userId);
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
  const [isCalculatingRewards, setIsCalculatingRewards] = useState(false);
  const [freeProductIds, setFreeProductIds] = useState<string[]>([]);

  // State to store fetched product details
  const [fetchedProductDetails, setFetchedProductDetails] = useState<Record<string, any>>({});

  // Location filter states
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [selectedSubZoneIds, setSelectedSubZoneIds] = useState<string[]>([]);

  // Ref to track if we've already initialized the order to prevent duplicate API calls
  const initializedOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isViewEditMode && orderQuery.data) {
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
        isFreeProduct: product.isFreeProduct || false,
      }));

      setOrderProducts(formattedProducts);

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
        calculateRewardsForProducts(formattedProducts, true); // isEditMode = true
      }
    } else {
      // Clear location filters when not in view-edit mode or when creating new order
      setSelectedDivisionIds([]);
      setSelectedChannelIds([]);
      setSelectedZoneIds([]);
      setSelectedSubZoneIds([]);
      // Reset the ref when not in edit mode
      initializedOrderIdRef.current = null;
    }
  }, [isViewEditMode, orderQuery.data, orderId]);

  // Fetch product details for free products
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (freeProductIds.length > 0) {
        const productDetails: Record<string, any> = {};

        // Fetch each free product individually
        for (const productId of freeProductIds) {
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
  }, [freeProductIds]);

  // Update order products when product details are fetched
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
    // Clear calculated rewards when warehouse changes
    setCalculatedRewards(null);
  };

  // Location filter handlers with hierarchical clearing
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

    // Recalculate rewards when outlet changes (only in create mode)
    if (selectedWarehouse && orderProducts.length > 0 && !isViewEditMode) {
      calculateRewardsForProducts(orderProducts, false);
    }
  };

  const handleOpenOutletSelector = () => {
    if (!selectedWarehouse) {
      toast.error('Please select a warehouse first');
      return;
    }
    setIsOutletSelectorOpen(true);
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
    };

    createOrder.mutate(orderPayload, {
      onSuccess: (response) => {
        toast.success(
          isViewEditMode
            ? 'Order updated successfully!'
            : 'Order placed successfully!'
        );
        router.push(NavKeys.Company);
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message ||
          (isViewEditMode
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
        data: { orderStatus: OrderStatus.CONFIRMED, collectorId: userId },
      },
      {
        onSuccess: () => {
          toast.success('Order confirmed successfully!');
          router.push(NavKeys.Company);
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
        data: { orderStatus: OrderStatus.DELIVERED, collectorId: userId },
      },
      {
        onSuccess: () => {
          toast.success('Order marked as delivered!');
          router.push(NavKeys.Company);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message || 'Failed to mark as delivered'
          );
        },
      }
    );
  };

  const handleViewInvoices = () => {
    if (!orderId) {
      toast.error('Order ID is required');
      return;
    }
    router.push(`${NavKeys.Invoices}?orderId=${orderId}`);
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
          router.push(NavKeys.Company);
        },
      }
    );
  };

  // Unified handler for product changes (add/update/remove) via modal
  const handleProductChange = async (products: any[]) => {
    if (isViewEditMode && orderId) {
      // In edit mode, only update local state - don't call API automatically
      setOrderProducts(products);
    } else {
      // Creation mode: update local state and calculate rewards
      setOrderProducts(products);

      // Automatically calculate rewards when products are updated
      if (selectedWarehouse && selectedOutlet && products.length > 0) {
        await calculateRewardsForProducts(products, false);
      }
    }
  };

  // Handler for updating order when user clicks Update Order button
  const handleUpdateOrder = () => {
    if (!isViewEditMode || !orderId) {
      toast.error('Order ID is required');
      return;
    }

    if (!userId) {
      toast.error('User authentication required');
      return;
    }

    // Construct payload for PUT update
    const orderPayload = {
      orderId: orderId,
      userId: userId,
      outletId: selectedOutlet,
      warehouseId: selectedWarehouse,
      orderDate: orderQuery.data?.orderDate || new Date().toISOString(),
      orderStatus: orderQuery.data?.orderStatus || 'pending',
      products: orderProducts
        .filter((product) => !product.isFreeProduct) // Exclude free products from API call
        .map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          productName: product.productName,
          mrp: product.mrp,
          price: product.price,
          brandId: product.brandId,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          capacity: product.capacity,
          skuCode: product.skuCode,
          uom: product.uom,
          pictureUrl: product.pictureUrl,
        })),
    };

    updateOrder.mutate(
      { orderId, data: orderPayload },
      {
        onSuccess: (response) => {
          // Repopulate orderProducts and other order data from response
          const updatedOrder = response;
          setOrderProducts(
            updatedOrder.products.map((product: any) => ({
              productId: product.productId,
              productName: product.productName,
              quantity: product.quantity,
              mrp: product.mrp,
              price: product.price,
              capacity: product.capacity,
              skuCode: product.skuCode || '',
              uom: product.uom || '',
              pictureUrl: product.pictureUrl || '',
              isFreeProduct: product.isFreeProduct || false,
            }))
          );
          toast.success('Order updated successfully!');
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message || 'Failed to update order'
          );
        },
      }
    );
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

  // Calculate rewards for given products and add free products to order
  const calculateRewardsForProducts = async (products: any[], isEditMode: boolean = false) => {
    if (!selectedWarehouse || !selectedOutlet || products.length === 0) {
      return;
    }

    try {
      // Filter out free products and discounted products from schemes before sending to API
      // Only send manually added products (non-free and non-discounted from schemes)
      const nonFreeAndNonDiscountedProducts = products.filter((product) => {
        // Exclude free products
        if (product.isFreeProduct) {
          return false;
        }
        // Exclude discounted products that were added from schemes
        const isDiscountedFromScheme = product.isDiscountedProduct &&
          ((product as any).addedFromSchemeId || (product as any).discountedBySchemeId);
        if (isDiscountedFromScheme) {
          return false;
        }
        return true;
      });

      const rewardData = {
        warehouseId: selectedWarehouse,
        outletId: selectedOutlet,
        products: nonFreeAndNonDiscountedProducts.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          unitPrice: product.price || product.mrp || 0,
          brandId: product.brandId || '',
          categoryId: product.categoryId || '',
          subcategoryId: product.subcategoryId || '',
        })),
      };

      const response = await calculateReward.mutateAsync(rewardData);

      // In edit mode, only use response to show available schemes, don't update calculatedRewards
      // (we use order data's appliedSchemes instead)
      if (!isEditMode) {
        setCalculatedRewards(response);
      }

      // In edit mode, don't reapply schemes - they're already applied in the order
      // Just show available schemes and return early
      if (isEditMode) {
        return;
      }

      // Remove existing free products first
      const nonFreeProducts = products.filter(p => !p.isFreeProduct);

      // Add free products and apply discounted products to the order list if there are applied schemes
      if (response.appliedSchemes && response.appliedSchemes.length > 0) {
        const freeProducts: any[] = [];
        const newFreeProductIds: string[] = [];
        const updatedProducts = [...nonFreeProducts];

        response.appliedSchemes.forEach((scheme: any) => {
          // Handle free products
          if (scheme.freeProducts && scheme.freeProducts.length > 0) {
            scheme.freeProducts.forEach((freeProduct: any) => {
              // Free products should always be separate entries, even if the same product
              // already exists in the order. This allows users to manually add the same product
              // as a new entry without it being merged with the free product.

              // Check if this is a discounted product or completely free
              const isDiscounted = freeProduct.discountType && freeProduct.discountValue;

              // Always add free product as a separate entry
              freeProducts.push({
                productId: freeProduct.productId,
                productName: `Free: ${freeProduct.productId}`, // Will be updated with actual name
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

          // Handle discounted products from productDiscount reward type
          if (scheme.rewardType === 'productDiscount' && scheme.discountedProducts && scheme.discountedProducts.length > 0) {
            scheme.discountedProducts.forEach((discountedProduct: any) => {
              // Find the product in the order that matches the discounted product
              const productIndex = updatedProducts.findIndex(
                (p) => p.productId === discountedProduct.productId
              );

              // Check if the existing product was manually added (not from a scheme)
              const existingProduct = productIndex !== -1 ? updatedProducts[productIndex] : null;
              const isManuallyAdded = existingProduct &&
                !existingProduct.isFreeProduct &&
                !existingProduct.isDiscountedProduct &&
                !(existingProduct as any).addedFromSchemeId &&
                !(existingProduct as any).discountedBySchemeId;

              // Check if a discounted product entry already exists for this scheme/product combination
              const existingDiscountedEntryIndex = updatedProducts.findIndex(
                (p) => p.productId === discountedProduct.productId &&
                  p.isDiscountedProduct &&
                  ((p as any).addedFromSchemeId === scheme.schemeId || (p as any).discountedBySchemeId === scheme.schemeId)
              );

              // If product exists and was manually added, don't modify it - add a new discounted entry instead
              // This ensures manually added products remain separate from scheme-discounted products
              if (isManuallyAdded) {
                // Check if we've already added a discounted entry for this scheme/product
                if (existingDiscountedEntryIndex === -1) {
                  // Product was manually added, so add a NEW discounted entry instead of modifying the existing one
                  const unitPrice = discountedProduct.unitPrice ?? 0;
                  const finalPrice = discountedProduct.finalPrice ?? 0;

                  updatedProducts.push({
                    productId: discountedProduct.productId,
                    productName: existingProduct.productName || `Loading... ${discountedProduct.productId}`,
                    quantity: discountedProduct.quantity || 1,
                    mrp: 0, // MRP is always 0 for product-level discounts
                    price: unitPrice, // Price is unitPrice (before discount)
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
                    addedFromSchemeId: scheme.schemeId, // Track which scheme added this product
                    finalPrice: finalPrice, // Store finalPrice for total calculation
                  });
                } else {
                  // Update existing discounted entry with new quantity/price from API
                  const existingDiscountedEntry = updatedProducts[existingDiscountedEntryIndex];
                  updatedProducts[existingDiscountedEntryIndex] = {
                    ...existingDiscountedEntry,
                    quantity: discountedProduct.quantity || existingDiscountedEntry.quantity,
                    finalPrice: discountedProduct.finalPrice ?? existingDiscountedEntry.finalPrice,
                    price: discountedProduct.unitPrice ?? existingDiscountedEntry.price,
                  };
                }
              } else if (productIndex !== -1) {
                // Product exists but was already from a scheme
                // Check if it's the same scheme - if so, update it; if not, check for existing discounted entry
                const product = updatedProducts[productIndex];
                const isSameScheme = (product as any).discountedBySchemeId === scheme.schemeId ||
                  (product as any).addedFromSchemeId === scheme.schemeId;

                if (isSameScheme) {
                  // Same scheme, update the existing product
                  const discountType = discountedProduct.type === 'discountPercent' ? 'percentage' : 'fixed';
                  const discountValue = discountedProduct.value || 0;

                  // Update the product with discount information
                  updatedProducts[productIndex] = {
                    ...product,
                    isDiscountedProduct: true,
                    productDiscount: {
                      type: discountType,
                      value: discountValue,
                    },
                    discountedBySchemeId: scheme.schemeId, // Track which scheme applied this discount
                    finalPrice: discountedProduct.finalPrice, // Store finalPrice for total calculation
                    quantity: discountedProduct.quantity || product.quantity,
                  };
                } else if (existingDiscountedEntryIndex !== -1) {
                  // Different scheme but discounted entry already exists for this scheme, update it
                  const existingDiscountedEntry = updatedProducts[existingDiscountedEntryIndex];
                  updatedProducts[existingDiscountedEntryIndex] = {
                    ...existingDiscountedEntry,
                    quantity: discountedProduct.quantity || existingDiscountedEntry.quantity,
                    finalPrice: discountedProduct.finalPrice ?? existingDiscountedEntry.finalPrice,
                    price: discountedProduct.unitPrice ?? existingDiscountedEntry.price,
                  };
                } else {
                  // Different scheme and no discounted entry exists, add new discounted entry
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
                // Product not in cart, automatically add it to cart with discount
                // But first check if we've already added a discounted entry for this scheme/product
                if (existingDiscountedEntryIndex === -1) {
                  const unitPrice = discountedProduct.unitPrice ?? 0;
                  const finalPrice = discountedProduct.finalPrice ?? 0;

                  updatedProducts.push({
                    productId: discountedProduct.productId,
                    productName: `Loading... ${discountedProduct.productId}`, // Placeholder, will be updated
                    quantity: discountedProduct.quantity || 1,
                    mrp: 0, // MRP is always 0 for product-level discounts
                    price: unitPrice, // Price is unitPrice (before discount)
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
                    addedFromSchemeId: scheme.schemeId, // Track which scheme added this product
                    finalPrice: finalPrice, // Store finalPrice for total calculation
                  });
                } else {
                  // Update existing discounted entry with new quantity/price from API
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
          }
        });

        // Update the order products with free products and discounted products
        if (freeProducts.length > 0) {
          setOrderProducts([...updatedProducts, ...freeProducts]);
          setFreeProductIds(newFreeProductIds);
        } else {
          // No free products, just use updated products with discounts
          setOrderProducts(updatedProducts);
          setFreeProductIds([]);
        }

        // Only show toast in create mode, not in edit mode
        if (!isEditMode && response.appliedSchemes.length > 0) {
          toast.success(`Applied ${response.appliedSchemes.length} scheme(s) with rewards!`);
        }
      } else {
        // No applied schemes, remove all free products
        setOrderProducts(nonFreeProducts);
        setFreeProductIds([]);
      }
    } catch (error: any) {
      console.error('Failed to calculate rewards:', error);
      // Don't show error toast for automatic calculation
    }
  };

  // Manual reward calculation (keeping the original function for manual trigger)
  const handleCalculateRewards = async () => {
    if (!selectedWarehouse || !selectedOutlet || orderProducts.length === 0) {
      toast.error('Please select warehouse, outlet and add products first');
      return;
    }

    setIsCalculatingRewards(true);

    try {
      await calculateRewardsForProducts(orderProducts, !!isViewEditMode);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to calculate rewards'
      );
    } finally {
      setIsCalculatingRewards(false);
    }
  };

  // Handle product discount changes
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

  // Calculate item total (including product discounts)
  const calculateItemTotal = () => {
    return orderProducts
      .filter((product) => !product.isFreeProduct)
      .reduce((total, product) => {
        const price = product.price ?? product.mrp ?? 0;
        const quantity = product.quantity ?? 1;
        const baseTotal = price * quantity;

        // Apply product discount if exists
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

  // Calculate custom discount amount
  const calculateCustomDiscountAmount = () => {
    if (!appliedCustomDiscount) return 0;

    const itemTotal = calculateItemTotal();

    if (appliedCustomDiscount.type === 'percentage') {
      return (itemTotal * appliedCustomDiscount.value) / 100;
    } else {
      return Math.min(appliedCustomDiscount.value, itemTotal);
    }
  };

  // Calculate final total
  const calculateFinalTotal = () => {
    const itemTotal = calculateItemTotal();
    const customDiscountAmount = calculateCustomDiscountAmount();
    const rewardDiscountAmount = calculatedRewards?.totalDiscount || 0;
    return Math.max(0, itemTotal - customDiscountAmount - rewardDiscountAmount);
  };

  if (isViewEditMode && orderQuery.isLoading) {
    return (
      <section className="w-full space-y-6">
        <BreadcrumbHeader {...breadcrumb} />
        <div className="flex h-64 items-center justify-center rounded-lg bg-white">
          <Loading text="Loading order details..." />
        </div>
      </section>
    );
  }

  if (isViewEditMode && orderQuery.error) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={NavKeys.Company}
                  className="flex items-center gap-1"
                >
                  <Home className="h-3 w-3" /> Company Orders
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

  // Show loading overlay in edit mode while updating or refetching order
  if (isViewEditMode && (updateOrder.isPending || orderQuery.isFetching)) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={NavKeys.Company}
                  className="flex items-center gap-1"
                >
                  <Home className="h-3 w-3" /> Company Orders
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
  // ...existing code...
  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader {...breadcrumb} />

      {!isViewEditMode && (
        <div className="rounded-lg bg-white p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Order Details
          </div>

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
                  disabled={!!isViewEditMode}
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
                  disabled={!!isViewEditMode}
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
                  disabled={!!isViewEditMode}
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
                  disabled={!!isViewEditMode}
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
                  onChange={isViewEditMode ? undefined : handleWarehouseChange}
                  placeholder={
                    warehouses.isLoading
                      ? 'Loading warehouses...'
                      : 'Select warehouse'
                  }
                  className="w-full"
                  disabled={!!isViewEditMode}
                  userId={userId}
                />
              </div>

              <div className="space-y-2">
                <Label>Outlet</Label>
                <Button
                  variant="white"
                  onClick={
                    isViewEditMode
                      ? undefined
                      : selectedWarehouse
                        ? handleOpenOutletSelector
                        : undefined
                  }
                  className={`w-full justify-start text-left font-normal ${selectedOutletName ? '' : 'text-muted-foreground'
                    } ${!selectedWarehouse && !isViewEditMode ? 'cursor-not-allowed opacity-50' : ''}`}
                  disabled={!!isViewEditMode || !selectedWarehouse}
                >
                  {selectedOutletName ||
                    (selectedWarehouse
                      ? 'Select outlet'
                      : 'Select warehouse first')}
                </Button>
              </div>
            </div>

            {/* Outlet Selection */}
          </div>
        </div>
      )}

      {/* Selected Outlet Information */}
      {((selectedOutlet && selectedOutletName) || (isViewEditMode && orderQuery.data?.outletDetails)) && (
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
                {isViewEditMode && orderQuery.data?.outletDetails?.outletName
                  ? orderQuery.data.outletDetails.outletName
                  : selectedOutletName || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Outlet Code
              </Label>
              <div className="font-medium">
                {isViewEditMode && orderQuery.data?.outletDetails?.outletCode
                  ? orderQuery.data.outletDetails.outletCode
                  : 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Owner Name
              </Label>
              <div className="font-medium">
                {isViewEditMode && orderQuery.data?.outletDetails?.ownerName
                  ? orderQuery.data.outletDetails.ownerName
                  : selectedOutletDetails?.ownerName || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Phone Number
              </Label>
              <div className="font-medium">
                {isViewEditMode && orderQuery.data?.outletDetails?.phoneNumber
                  ? orderQuery.data.outletDetails.phoneNumber
                  : selectedOutletDetails?.ownerPhoneNumber || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <Label className=" font-medium text-gray-600">
                Email
              </Label>
              <div className="font-medium">
                {isViewEditMode && orderQuery.data?.outletDetails?.email
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
                  isViewEditMode && orderQuery.data?.outletDetails?.outletStatus
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
                {isViewEditMode && orderQuery.data?.warehouseDetails?.warehouseName
                  ? orderQuery.data.warehouseDetails.warehouseName
                  : warehouses.data?.data?.items?.find(
                    (w) => w.warehouseId === selectedWarehouse
                  )?.warehouseName || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-lg bg-white p-4">
        <div className="bg-background mb-2 flex items-center rounded-lg p-2">
          <span className="text-lg font-medium">Product List</span>
        </div>

        {!selectedOutlet && !isViewEditMode ? (
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
          <DataTable
            columns={createColumns()}
            data={orderProducts.map((product) => ({
              ...product,
              onDiscountChange: handleProductDiscountChange,
            }))}
            hidePagination={true}
            tableId="order-creation-table"
          />
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(!isViewEditMode ||
              (isViewEditMode &&
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

        {isViewEditMode && orderQuery.data ? (
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
            {calculatedRewards && calculatedRewards.totalDiscount > 0 && (
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
                <span className="text-gray-600">
                  Custom Discount ({appliedCustomDiscount.value}
                  {appliedCustomDiscount.type === 'percentage' ? '%' : '₹'}):
                </span>
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
            {isViewEditMode && selectedOutletStatus === 'pending' && (
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

        {/* Custom Discount Button */}
        {!isViewEditMode && (
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



      <div className="flex justify-end gap-2">
        {!isViewEditMode && (
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={NavKeys.Company}>Cancel</Link>
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

        {isViewEditMode &&
          orderQuery.data?.orderStatus === OrderStatus.PENDING && (
            <div className="flex flex-row items-center gap-2">
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
                variant="secondary"
                className="flex items-center gap-2"
                onClick={handleUpdateOrder}
                disabled={updateOrder.isPending || updateOrderStatus.isPending}
              >
                {updateOrder.isPending ? 'Updating Order...' : 'Update Order'}
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
            outletType="distributor-outlet"
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

