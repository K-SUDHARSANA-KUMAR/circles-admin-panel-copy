'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUpdateScheme, useScheme } from '@/features/dashboard/schemes/hooks/useSchemes';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useProducts } from '@/features/dashboard/products/hooks/useProducts';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import {
  useBrands,
  useCategories,
  useSubcategories,
} from '@/features/master-managment/hooks/useMasterRecords';
import {
  ApprovalStatusEnum,
  SchemeStatusEnum,
} from '@/constants/enums/scheme.enums';
import NavKeys from '@/constants/navkeys';

const ViewMoreModal = ({
  isOpen,
  onClose,
  title,
  items,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: { id: string; name: string }[];
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[80vh] overflow-hidden max-w-[800px] w-[90vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="mt-4">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 p-2 overflow-y-auto max-h-[calc(80vh-120px)]">
          {filteredItems.map((item) => (
            <Badge key={item.id} variant="secondary">
              {item.name}
            </Badge>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SchemeCreatePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const schemeId = searchParams.get('schemeId');

  const {
    data: schemeData,
    isLoading: isLoadingScheme,
    error: schemeError,
  } = useScheme(schemeId || '');
  const updateSchemeMutation = useUpdateScheme();

  // Products hook with dynamic filtering
  const { products } = useProducts({
    enabled: true,
    nonPaginated: true,
    // Don't filter products in the main query anymore, let the modal handle it
  });
  const { outlets } = useOutlets({
    enabled: true,
    nonPaginated: true, // Keep non-paginated for now until we fix the modal
  });
  const { records: brands } = useBrands();
  const { records: categories } = useCategories();
  const { records: subcategories } = useSubcategories();

  // Warehouse hook with pagination
  const { warehouses } = useWarehouse(undefined, {
    nonPaginated: true, // Keep non-paginated for now until we fix the modal
  });

  const today = new Date();

  // Calculate 3 months later
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);

  // Simplified form state - just for displaying data
  const [formData, setFormData] = useState({
    schemeCode: '',
    schemeName: '',
    description: '',
    validFrom: '',
    validTo: '',
    maxRewardPerInvoice: 1,
    applicableTo: {
      warehouseIds: [] as string[],
      productIds: [] as string[],
      brandIds: [] as string[],
      categoryIds: [] as string[],
      subcategoryIds: [] as string[],
      outletIds: [] as string[],
    },
    conditions: [] as any[],
    status: SchemeStatusEnum.DRAFT,
    approvalStatus: ApprovalStatusEnum.PENDING,
  });

  // Load scheme data
  useEffect(() => {
    if (schemeData) {
      const actualData = (schemeData as any).data || schemeData;
      setFormData({
        schemeCode: actualData.code || '',
        schemeName: actualData.schemeName || '',
        description: actualData.description || '',
        validFrom: actualData.validFrom ? actualData.validFrom.split('T')[0] : '',
        validTo: actualData.validTo ? actualData.validTo.split('T')[0] : '',
        maxRewardPerInvoice: actualData.maxRewardPerInvoice || 1,
        applicableTo: {
          warehouseIds: actualData.applicableTo?.warehouseIds || [],
          productIds: actualData.applicableTo?.productIds || [],
          brandIds: actualData.applicableTo?.brandIds || [],
          categoryIds: actualData.applicableTo?.categoryIds || [],
          subcategoryIds: actualData.applicableTo?.subcategoryIds || [],
          outletIds: actualData.applicableTo?.outletIds || [],
        },
        conditions: actualData.conditions || [],
        status: actualData.status?.toUpperCase() || SchemeStatusEnum.DRAFT,
        approvalStatus: actualData.approvalStatus || ApprovalStatusEnum.PENDING,
      });
    }
  }, [schemeData]);

  // Approve handler
  const handleApprove = async () => {
    try {
      toast.loading('Approving...', { id: 'approve-action' });
      const actualData = (schemeData as any)?.data || schemeData;
      const id = actualData?.schemeId || schemeId;
      if (id) {
        await updateSchemeMutation.mutateAsync({
          id,
          data: {
            status: SchemeStatusEnum.ACTIVE,
          },
        });
      }
      toast.success('Scheme approved', { id: 'approve-action' });
      router.push(NavKeys.DashboardSchemes);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve', { id: 'approve-action' });
    }
  };

  // Reject handler
  const handleReject = async () => {
    try {
      toast.loading('Rejecting...', { id: 'reject-action' });
      const actualData = (schemeData as any)?.data || schemeData;
      const id = actualData?.schemeId || schemeId;
      if (id) {
        await updateSchemeMutation.mutateAsync({
          id,
          data: {
            status: SchemeStatusEnum.REJECTED,
          },
        });
      }
      toast.success('Scheme rejected', { id: 'reject-action' });
      router.push(NavKeys.DashboardSchemes);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject', { id: 'reject-action' });
    }
  };

  // Add state for view more modal
  const [viewMoreModal, setViewMoreModal] = useState<{
    isOpen: boolean;
    title: string;
    items: { id: string; name: string }[];
  }>({
    isOpen: false,
    title: '',
    items: [],
  });

  if (isLoadingScheme) {
    return <Loading text="Loading scheme details..." />;
  }

  if (schemeError) {
    return <GenericError text="Failed to load scheme details" />;
  }

  return (
    <section className="h-full w-full space-y-6 overflow-y-auto">
      {/* <BreadcrumbHeader {...getBreadcrumbData('schemes', 'view')} /> */}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Basic Information - Left Column */}
        <div className="rounded-lg bg-white p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Basic Information
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Scheme Name</Label>
              <div className="mt-1 rounded-md border bg-gray-50 p-2">
                {formData.schemeName}
              </div>
            </div>
            <div>
              <Label>Max Reward Per Invoice</Label>
              <div className="mt-1 rounded-md border bg-gray-50 p-2">
                {formData.maxRewardPerInvoice}
              </div>
            </div>
            <div>
              <Label>Valid From</Label>
              <div className="mt-1 rounded-md border bg-gray-50 p-2">
                {formData.validFrom}
              </div>
            </div>
            <div>
              <Label>Valid To</Label>
              <div className="mt-1 rounded-md border bg-gray-50 p-2">
                {formData.validTo}
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1 rounded-md border bg-gray-50 p-2">
                {formData.status}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <div className="mt-1 rounded-md border bg-gray-50 p-2 min-h-[100px]">
                {formData.description}
              </div>
            </div>
          </div>
        </div>

        {/* Applicable To - Right Column */}
        <div className="rounded-lg bg-white p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Applicable To
          </div>
          <div className="space-y-4">
            {/* Warehouses */}
            <div>
              <Label>Warehouses</Label>
              <div className="mt-1 flex flex-wrap gap-2 min-h-[40px] rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.warehouseIds.length > 0 ? (
                  <>
                    {formData.applicableTo.warehouseIds.slice(0, 3).map((id) => {
                      const warehouse = warehouses.data?.data?.items?.find(
                        (w: any) => w.warehouseId === id
                      );
                      return (
                        <Badge key={id} variant="secondary">
                          {warehouse?.warehouseName || id}
                        </Badge>
                      );
                    })}
                    {formData.applicableTo.warehouseIds.length > 3 && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setViewMoreModal({
                            isOpen: true,
                            title: 'Warehouses',
                            items: formData.applicableTo.warehouseIds.map((id) => ({
                              id,
                              name:
                                warehouses.data?.data?.items?.find(
                                  (w: any) => w.warehouseId === id
                                )?.warehouseName || id,
                            })),
                          })
                        }
                      >
                        +{formData.applicableTo.warehouseIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">No warehouses selected</div>
                )}
              </div>
            </div>

            {/* Outlets */}
            <div>
              <Label>Outlets</Label>
              <div className="mt-1 flex flex-wrap gap-2 min-h-[40px] rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.outletIds.length > 0 ? (
                  <>
                    {formData.applicableTo.outletIds.slice(0, 3).map((id) => {
                      const outlet = outlets.data?.data?.items?.find(
                        (o: any) => o.outletId === id
                      );
                      return (
                        <Badge key={id} variant="secondary">
                          {outlet?.outletName || id}
                        </Badge>
                      );
                    })}
                    {formData.applicableTo.outletIds.length > 3 && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setViewMoreModal({
                            isOpen: true,
                            title: 'Outlets',
                            items: formData.applicableTo.outletIds.map((id) => ({
                              id,
                              name:
                                outlets.data?.data?.items?.find(
                                  (o: any) => o.outletId === id
                                )?.outletName || id,
                            })),
                          })
                        }
                      >
                        +{formData.applicableTo.outletIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">No outlets selected</div>
                )}
              </div>
            </div>

            {/* Brands */}
            <div>
              <Label>Brands</Label>
              <div className="mt-1 flex flex-wrap gap-2 min-h-[40px] rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.brandIds.length > 0 ? (
                  <>
                    {formData.applicableTo.brandIds.slice(0, 3).map((id) => {
                      const brand = brands.data?.find((b: any) => b.brandId === id);
                      return (
                        <Badge key={id} variant="secondary">
                          {brand?.brandName || id}
                        </Badge>
                      );
                    })}
                    {formData.applicableTo.brandIds.length > 3 && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setViewMoreModal({
                            isOpen: true,
                            title: 'Brands',
                            items: formData.applicableTo.brandIds.map((id) => ({
                              id,
                              name: brands.data?.find((b: any) => b.brandId === id)?.brandName || id,
                            })),
                          })
                        }
                      >
                        +{formData.applicableTo.brandIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">No brands selected</div>
                )}
              </div>
            </div>

            {/* Categories */}
            <div>
              <Label>Categories</Label>
              <div className="mt-1 flex flex-wrap gap-2 min-h-[40px] rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.categoryIds.length > 0 ? (
                  <>
                    {formData.applicableTo.categoryIds.slice(0, 3).map((id) => {
                      const category = categories.data?.find((c: any) => c.categoryId === id);
                      return (
                        <Badge key={id} variant="secondary">
                          {category?.categoryName || id}
                        </Badge>
                      );
                    })}
                    {formData.applicableTo.categoryIds.length > 3 && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setViewMoreModal({
                            isOpen: true,
                            title: 'Categories',
                            items: formData.applicableTo.categoryIds.map((id) => ({
                              id,
                              name: categories.data?.find((c: any) => c.categoryId === id)?.categoryName || id,
                            })),
                          })
                        }
                      >
                        +{formData.applicableTo.categoryIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">No categories selected</div>
                )}
              </div>
            </div>

            {/* Subcategories */}
            <div>
              <Label>Subcategories</Label>
              <div className="mt-1 flex flex-wrap gap-2 min-h-[40px] rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.subcategoryIds.length > 0 ? (
                  <>
                    {formData.applicableTo.subcategoryIds.slice(0, 3).map((id) => {
                      const subcategory = subcategories.data?.find((s: any) => s.subcategoryId === id);
                      return (
                        <Badge key={id} variant="secondary">
                          {subcategory?.subcategoryName || id}
                        </Badge>
                      );
                    })}
                    {formData.applicableTo.subcategoryIds.length > 3 && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setViewMoreModal({
                            isOpen: true,
                            title: 'Subcategories',
                            items: formData.applicableTo.subcategoryIds.map((id) => ({
                              id,
                              name: subcategories.data?.find((s: any) => s.subcategoryId === id)?.subcategoryName || id,
                            })),
                          })
                        }
                      >
                        +{formData.applicableTo.subcategoryIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">No subcategories selected</div>
                )}
              </div>
            </div>

            {/* Products */}
            <div>
              <Label>Products</Label>
              <div className="mt-1 flex flex-wrap gap-2 min-h-[40px] rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.productIds.length > 0 ? (
                  formData.applicableTo.productIds.map((id) => {
                    const product = products.data?.data?.items?.find(
                      (p: any) => p.productId === id
                    );
                    return (
                      <Badge key={id} variant="secondary">
                        {product?.productName || id}
                      </Badge>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground">No products selected</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheme Details / Conditions */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Scheme Details
        </div>
        <div className="space-y-6">
          {formData.conditions.map((condition, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">Condition {index + 1}</h3>
                <Badge variant="secondary">Priority: {condition.priority}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Condition Type</Label>
                  <div className="mt-1 rounded-md border bg-gray-50 p-2">
                    {condition.conditionType}
                  </div>
                </div>

                {/* Invoice Condition */}
                {condition.conditionType === 'invoice' && (
                  <>
                    <div>
                      <Label>Minimum Invoice Value</Label>
                      <div className="mt-1 rounded-md border bg-gray-50 p-2">
                        ₹{condition.criteria?.minValue || 0}
                      </div>
                    </div>
                    {condition.criteria?.hasMaxValue && (
                      <div>
                        <Label>Maximum Invoice Value</Label>
                        <div className="mt-1 rounded-md border bg-gray-50 p-2">
                          ₹{condition.criteria?.maxValue}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Combo Condition */}
                {condition.conditionType === 'combo' && (
                  <>
                    <div>
                      <Label>Match Type</Label>
                      <div className="mt-1 rounded-md border bg-gray-50 p-2">
                        {condition.criteria?.matchType || 'All'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Products Required</Label>
                      <div className="mt-2 space-y-2">
                        {condition.criteria?.criteria?.map((criteria: any, idx: number) => (
                          <div key={idx} className="rounded-md border bg-gray-50 p-2">
                            {criteria.productId && (
                              <div className="flex items-center justify-between">
                                <span>
                                  {products.data?.data?.items?.find(
                                    (p: any) => p.productId === criteria.productId
                                  )?.productName || criteria.productId}
                                </span>
                                <Badge>Min Qty: {criteria.minValue || 0}</Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Reward Information */}
                <div className="md:col-span-2">
                  <Label>Reward</Label>
                  <div className="mt-2 rounded-md border bg-gray-50 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label>Type</Label>
                        <div className="mt-1 font-medium">
                          {condition.reward?.type}
                        </div>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <div className="mt-1 font-medium">
                          {condition.reward?.type === 'discountPercent'
                            ? `${condition.reward.value}%`
                            : condition.reward?.type === 'discountFixed'
                              ? `₹${condition.reward.value}`
                              : condition.reward?.type === 'freeProduct'
                                ? 'Free Product'
                                : condition.reward?.value}
                        </div>
                      </div>
                      {condition.reward?.maxRewardAmount && (
                        <div>
                          <Label>Max Reward</Label>
                          <div className="mt-1 font-medium">
                            ₹{condition.reward.maxRewardAmount}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Link href={NavKeys.DashboardSchemes}>
          <Button type="button" variant="outline">
            Back
          </Button>
        </Link>
        <Button
          type="button"
          variant="destructive"
          onClick={handleReject}
          disabled={updateSchemeMutation.isPending}
        >
          Reject
        </Button>
        <Button
          type="button"
          onClick={handleApprove}
          disabled={updateSchemeMutation.isPending}
        >
          Approve
        </Button>
      </div>

      {/* Add ViewMoreModal */}
      <ViewMoreModal
        isOpen={viewMoreModal.isOpen}
        onClose={() =>
          setViewMoreModal((prev) => ({ ...prev, isOpen: false }))
        }
        title={viewMoreModal.title}
        items={viewMoreModal.items}
      />
    </section>
  );
};

export default SchemeCreatePage;
