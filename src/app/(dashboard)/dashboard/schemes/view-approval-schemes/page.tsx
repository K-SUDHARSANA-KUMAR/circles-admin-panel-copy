'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useScheme } from '@/features/dashboard/schemes/hooks/useSchemes';
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
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import {
  useGetApprovals,
  useProcessApproval,
} from '@/features/common/hooks/useApprovals';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store/hooks';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

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
      <DialogContent className="max-h-[80vh] w-[90vw] max-w-[800px] overflow-hidden">
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
        <div className="flex max-h-[calc(80vh-120px)] flex-wrap gap-2 overflow-y-auto p-2">
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

export interface ApprovalLevel {
  level: number;
  roleId: string;
  approvalStatus:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'changes_required'
    | 'suspended';
  roleName?: string;
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
  remarks?: string;
}

export interface ApprovalHistory {
  action: string;
  status: string;
  remarks: string;
}

export interface ApprovalData {
  _id: string;
  entityType: string;
  entityId: string;
  currentLevel: number;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'changes_required'
    | 'suspended';
  approvals: ApprovalLevel[];
  history?: ApprovalHistory[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Core required props for API calls
  entityId: string;
  entityType: string;
  approverId: string;
  approverRoleId: string;
  // Optional props
  entityName?: string;
  status?: string;
  onSuccess?: () => void; // Callback for successful approval/rejection
  // Legacy props for backward compatibility (deprecated)
  approvalData?: ApprovalData;
  onApprove?: (reason?: string) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onChangesRequired?: (reason: string) => Promise<void>;
  isLoading?: boolean;
  currentUserId?: string;
  currentUserRoleId?: string;
}

// Reusable Approval Item Component
const ApprovalItem = ({
  approval,
  isHistory = false,
}: {
  approval: ApprovalLevel | ApprovalHistory;
  isHistory?: boolean;
}) => {
  const status =
    'approvalStatus' in approval ? approval.approvalStatus : approval.status;
  const level = 'level' in approval ? approval.level : 'History';
  const roleName = 'roleName' in approval ? approval.roleName : 'System';
  const roleId = 'roleId' in approval ? approval.roleId : '';

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border-2 bg-white p-3 shadow-sm ${getBorderColor(status)}`}
    >
      <div className="mt-0.5 flex-shrink-0">{getStatusIcon(status)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <div className="text-sm font-medium text-gray-900">
            {isHistory
              ? `Level ${level} - ${'approvedBy' in approval ? approval.approvedBy : 'System'}`
              : `Level ${level} - ${roleName || `Role ${roleId}`}`}
          </div>
          <div
            className={`text-xs font-medium capitalize ${getStatusColor(status)}`}
          >
            {status.replace('_', ' ')}
          </div>
        </div>

        {/* Approver and time on the same row */}
        {'approvedBy' in approval && approval.approvedBy && (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {isHistory ? roleName : approval.approvedBy}
            </div>
            {'approvedAt' in approval && approval.approvedAt && (
              <div className="text-xs text-gray-600">
                {new Date(approval.approvedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {'remarks' in approval && approval.remarks && (
          <div className="mt-1 text-xs break-words text-gray-600">
            Reason: {approval.remarks}
          </div>
        )}
      </div>
    </div>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getBorderColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'border-green-500';
    case 'rejected':
      return 'border-red-500';
    case 'changes_required':
      return 'border-yellow-500';
    case 'pending':
      return 'border-gray-300';
    default:
      return 'border-gray-300';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'text-green-600';
    case 'rejected':
      return 'text-red-600';
    case 'changes_required':
      return 'text-yellow-600';
    case 'pending':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    case 'changes_required':
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Changes Required
        </Badge>
      );
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const SchemeApprovalPage = ({
  open,
  onOpenChange,
  onSuccess,
  approvalData,
  onApprove,
  onReject,
  // onChangesRequired,
  isLoading = false,
  currentUserId,
  currentUserRoleId,
}: ApprovalModalProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);

  const mode = searchParams.get('mode');
  const schemeId = searchParams.get('schemeId');
  const entityId = searchParams.get('schemeId') || '';
  const entityType = 'schemes';
  const approverId = user?.userId || '';
  const approverRoleId = user?.roleId || '';
  const isEditMode = mode === 'view' && schemeId;
  const breadcrumb = getBreadcrumbData(
    'schemes',
    isEditMode ? 'view' : 'create'
  );

  // API hooks
  const {
    data: schemeData,
    isLoading: isLoadingScheme,
    error: schemeError,
  } = useScheme(schemeId || '');

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
        validFrom: actualData.validFrom
          ? actualData.validFrom.split('T')[0]
          : '',
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

  // Use the approval API hooks
  const processApprovalMutation = useProcessApproval();

  // Fetch approval data using common hook
  const { data: fetchedApprovalData, isLoading: approvalLoading } =
    useGetApprovals(
      {
        entityId,
        entityType,
        approverId,
        approverRoleId,
      },
      open && !!entityId // Only fetch when modal is open and entityId is provided
    );

  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const finalApprovalData = fetchedApprovalData?.data?.[0] || approvalData;
  const finalLoading = approvalLoading || isLoading;

  console.log(fetchedApprovalData, 'finfetchedApprovalDataalApprovalData');
  console.log(finalLoading, 'finalLoading');
  // Use the provided user info or fallback to legacy props
  const finalApproverId = approverId || currentUserId;
  const finalApproverRoleId = approverRoleId || currentUserRoleId;

  // Approve handler
  const handleApprove = async () => {
    if (!canTakeAction) return;

    try {
      // If custom onApprove handler is provided, use it (legacy support)
      if (onApprove) {
        await onApprove(reason);
      } else {
        // Use the built-in API call with provided props
        await processApprovalMutation.mutateAsync({
          entityId,
          entityType,
          approvalStatus: 'approved',
          remarks: reason || 'Approved by user',
          approverId: finalApproverId!,
          roleId: finalApproverRoleId!,
        });
        toast.success('Successfully approved!');
      }
      setReason('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to approve: ${errorMessage}`);
    }
  };

  const handleReject = async () => {
    if (!canTakeAction) return;

    if (!reason.trim()) {
      setReasonError(true);
      toast.error('Please provide a reason for rejection');
      return;
    }

    setReasonError(false);
    try {
      // If custom onReject handler is provided, use it (legacy support)
      if (onReject) {
        await onReject(reason);
      } else {
        // Use the built-in API call with provided props
        await processApprovalMutation.mutateAsync({
          entityId,
          entityType,
          approvalStatus: 'rejected',
          remarks: reason,
          approverId: finalApproverId!,
          roleId: finalApproverRoleId!,
        });
        toast.success('Successfully rejected!');
      }
      setReason('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to reject: ${errorMessage}`);
    }
  };

  // Check if current user is the approver for the pending level
  const isCurrentApprover = finalApprovalData?.approvals?.some(
    (approval: ApprovalLevel) =>
      approval.roleId === finalApproverRoleId &&
      approval.approvalStatus === 'pending'
  );

  // Check if any approval is suspended
  const isSuspended = finalApprovalData?.approvals?.some(
    (approval: ApprovalLevel) => approval.approvalStatus === 'suspended'
  );

  // Determine if actions should be disabled
  const isActionDisabled = !isCurrentApprover || isSuspended;

  // Only show action buttons if user can take action
  // Either custom handlers are provided OR we have the required data for built-in API calls
  const canTakeAction =
    !isActionDisabled &&
    ((onApprove && onReject) ||
      (entityId && entityType && finalApproverId && finalApproverRoleId));

  // Show action buttons if:
  // 1. User can take action AND current level is 2 or higher
  const shouldShowActionButtons = canTakeAction;

  const ApprovalStatusSkeleton = () => (
    <div className="space-y-3">
      <Skeleton className="h-6 w-32" />
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );

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
      <BreadcrumbHeader {...breadcrumb} />
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
              <div className="mt-1 min-h-[100px] rounded-md border bg-gray-50 p-2">
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
              <div className="mt-1 flex min-h-[40px] flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.warehouseIds.length > 0 ? (
                  <>
                    {formData.applicableTo.warehouseIds
                      .slice(0, 3)
                      .map((id) => {
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
                            items: formData.applicableTo.warehouseIds.map(
                              (id) => ({
                                id,
                                name:
                                  warehouses.data?.data?.items?.find(
                                    (w: any) => w.warehouseId === id
                                  )?.warehouseName || id,
                              })
                            ),
                          })
                        }
                      >
                        +{formData.applicableTo.warehouseIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    No warehouses selected
                  </div>
                )}
              </div>
            </div>

            {/* Outlets */}
            <div>
              <Label>Outlets</Label>
              <div className="mt-1 flex min-h-[40px] flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
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
                            items: formData.applicableTo.outletIds.map(
                              (id) => ({
                                id,
                                name:
                                  outlets.data?.data?.items?.find(
                                    (o: any) => o.outletId === id
                                  )?.outletName || id,
                              })
                            ),
                          })
                        }
                      >
                        +{formData.applicableTo.outletIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    No outlets selected
                  </div>
                )}
              </div>
            </div>

            {/* Brands */}
            <div>
              <Label>Brands</Label>
              <div className="mt-1 flex min-h-[40px] flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.brandIds.length > 0 ? (
                  <>
                    {formData.applicableTo.brandIds.slice(0, 3).map((id) => {
                      const brand = brands.data?.find(
                        (b: any) => b.brandId === id
                      );
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
                              name:
                                brands.data?.find((b: any) => b.brandId === id)
                                  ?.brandName || id,
                            })),
                          })
                        }
                      >
                        +{formData.applicableTo.brandIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    No brands selected
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            <div>
              <Label>Categories</Label>
              <div className="mt-1 flex min-h-[40px] flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.categoryIds.length > 0 ? (
                  <>
                    {formData.applicableTo.categoryIds.slice(0, 3).map((id) => {
                      const category = categories.data?.find(
                        (c: any) => c.categoryId === id
                      );
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
                            items: formData.applicableTo.categoryIds.map(
                              (id) => ({
                                id,
                                name:
                                  categories.data?.find(
                                    (c: any) => c.categoryId === id
                                  )?.categoryName || id,
                              })
                            ),
                          })
                        }
                      >
                        +{formData.applicableTo.categoryIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    No categories selected
                  </div>
                )}
              </div>
            </div>

            {/* Subcategories */}
            <div>
              <Label>Subcategories</Label>
              <div className="mt-1 flex min-h-[40px] flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
                {formData.applicableTo.subcategoryIds.length > 0 ? (
                  <>
                    {formData.applicableTo.subcategoryIds
                      .slice(0, 3)
                      .map((id) => {
                        const subcategory = subcategories.data?.find(
                          (s: any) => s.subcategoryId === id
                        );
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
                            items: formData.applicableTo.subcategoryIds.map(
                              (id) => ({
                                id,
                                name:
                                  subcategories.data?.find(
                                    (s: any) => s.subcategoryId === id
                                  )?.subcategoryName || id,
                              })
                            ),
                          })
                        }
                      >
                        +{formData.applicableTo.subcategoryIds.length - 3} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    No subcategories selected
                  </div>
                )}
              </div>
            </div>

            {/* Products */}
            <div>
              <Label>Products</Label>
              <div className="mt-1 flex min-h-[40px] flex-wrap gap-2 rounded-md border bg-gray-50 p-2">
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
                  <div className="text-muted-foreground">
                    No products selected
                  </div>
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
                <Badge variant="secondary">
                  Priority: {condition.priority}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Schemes For</Label>
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
                        {condition.criteria?.criteria?.map(
                          (criteria: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-md border bg-gray-50 p-2"
                            >
                              {criteria.productId && (
                                <div className="flex items-center justify-between">
                                  <span>
                                    {products.data?.data?.items?.find(
                                      (p: any) =>
                                        p.productId === criteria.productId
                                    )?.productName || criteria.productId}
                                  </span>
                                  <Badge>
                                    Min Qty: {criteria.minValue || 0}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          )
                        )}
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
                          <Label>Max Reward for {condition.conditionType}</Label>
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

      {/* Scheme Approval Details */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Approval Details
        </div>
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 space-y-4">
          {/* Approval Status Overview */}
          {finalLoading ? (
            <ApprovalStatusSkeleton />
          ) : (
            <div className="mb-4 space-y-3">
              <div className="rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    Current Level - {finalApprovalData?.currentLevel || 0}
                  </span>
                  {finalApprovalData?.status &&
                    getStatusBadge(finalApprovalData.status)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content - Only Pending Approvers */}
        <div className="min-h-0 flex-1 bg-gray-100">
          <ScrollArea className="h-[50vh] w-full pr-4">
            <div className="p-4">
              {/* History Section */}
              {finalApprovalData?.history &&
                finalApprovalData.history.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <h3 className="border-b border-gray-200 pb-2 text-base font-semibold text-gray-900">
                      Approval History
                    </h3>
                    <div className="space-y-3">
                      {finalApprovalData.history.map(
                        (historyItem: ApprovalHistory, index: number) => (
                          <ApprovalItem
                            key={`history-${index}`}
                            approval={historyItem}
                            isHistory={true}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Pending Approvers Section */}
              <div className="space-y-3">
                <h3 className="border-b border-gray-200 pb-2 text-base font-semibold text-gray-900">
                  Current Pending Approvers
                </h3>
                <div className="space-y-3">
                  {finalApprovalData?.approvals
                    ?.filter(
                      (approval: ApprovalLevel) =>
                        approval.approvalStatus === 'pending'
                    )
                    ?.map((approval: ApprovalLevel, index: number) => (
                      <ApprovalItem
                        key={`pending-${index}`}
                        approval={approval}
                        isHistory={false}
                      />
                    ))}
                  {!finalApprovalData?.approvals?.filter(
                    (approval: ApprovalLevel) =>
                      approval.approvalStatus === 'pending'
                  )?.length && (
                    <div className="py-8 text-center text-gray-500">
                      <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm">No pending approvers</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="flex-shrink-0 space-y-4">
          {/* Action Section - Hide when current level is 1 (unless level 1 is optional) */}
          {shouldShowActionButtons &&
            (finalLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loading text="Preparing actions..." />
              </div>
            ) : (
              <div className="space-y-1">
                <label htmlFor="reason" className="text-xs font-medium">
                  Remarks <span className="text-gray-500">(required for Reject and Changes Required)</span>
                </label>
                <Input
                  id="reason"
                  placeholder="Enter your reason..."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError(false);
                  }}
                  className={reasonError ? 'border-red-500' : ''}
                />
                {reasonError && (
                  <p className="text-xs text-red-500">
                    Remarks are required for Rejected and Changes Required actions.
                  </p>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={processApprovalMutation.isPending || finalLoading}
        >
          Close
        </Button>
        {shouldShowActionButtons && !finalLoading && (
          <>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processApprovalMutation.isPending || finalLoading}
            >
              Reject
            </Button>
            {/* <Button
              variant="outline"
              onClick={handleChangesRequired}
              disabled={processApprovalMutation.isPending || finalLoading}
              style={{
                backgroundColor: '#EAB308',
                color: 'white',
                borderColor: '#EAB308',
              }}
              className="hover:border-yellow-600 hover:bg-yellow-600"
            >
              Changes Required
            </Button> */}
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={processApprovalMutation.isPending || finalLoading}
            >
              Approve
            </Button>
          </>
        )}
      </div>

      {/* Add ViewMoreModal */}
      <ViewMoreModal
        isOpen={viewMoreModal.isOpen}
        onClose={() => setViewMoreModal((prev) => ({ ...prev, isOpen: false }))}
        title={viewMoreModal.title}
        items={viewMoreModal.items}
      />
    </section>
  );
};

export default SchemeApprovalPage;
