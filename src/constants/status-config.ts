import { StatusVariant } from '@/components/ui/badge';
import { OrderStatus, ReturnOrderStatus } from './enums/orders.enums';
import { RoutePlannerApprovalStatus, VisitOrderStatus } from './enums/pjp.enums';
import { OutletStatusEnum } from './enums/outlet.enums';
import { UserStatus } from './enums/users.enums';
import { StatusType } from '@/utils/badge-utils';
import { ApprovalStatusEnum, SchemeStatusEnum } from './enums/scheme.enums';
import { InvoiceStatusEnum } from './enums/invoice.enums';
import { ProductStatus } from './enums/product.enums';

export interface StatusConfig {
  variant: StatusVariant;
  label?: string;
}

export const USER_STATUS_CONFIG: Record<string, StatusConfig> = {
  [UserStatus.ACTIVE]: {
    variant: 'success',
    label: 'Active',
  },
  [UserStatus.INACTIVE]: {
    variant: 'warning',
    label: 'Inactive',
  },
  [UserStatus.TERMINATED]: {
    variant: 'destructive',
    label: 'Terminated',
  },
};

export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  [OrderStatus.PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
  [OrderStatus.CONFIRMED]: {
    variant: 'success',
    label: 'Confirmed',
  },
  [OrderStatus.CANCELLED]: {
    variant: 'destructive',
    label: 'Cancelled',
  },
  [OrderStatus.DISPATCHED]: {
    variant: 'outline',
    label: 'Dispatched',
  },
  [OrderStatus.DELIVERED]: {
    variant: 'success',
    label: 'Delivered',
  },
};

export const RETURN_ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  [ReturnOrderStatus.BOOKED]: {
    variant: 'blue',
    label: 'Booked',
  },
  [ReturnOrderStatus.COLLECTED]: {
    variant: 'success',
    label: 'Collected',
  },
  [ReturnOrderStatus.RECEIVED]: {
    variant: 'emerald',
    label: 'Received',
  },
  [ReturnOrderStatus.CANCELLED]: {
    variant: 'destructive',
    label: 'Cancelled',
  },
};

export const OUTLET_STATUS_CONFIG: Record<string, StatusConfig> = {
  [OutletStatusEnum.PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
  [OutletStatusEnum.ACTIVE]: {
    variant: 'success',
    label: 'Active',
  },
  [OutletStatusEnum.INACTIVE]: {
    variant: 'destructive',
    label: 'Inactive',
  },
  [OutletStatusEnum.SUSPENDED]: {
    variant: 'destructive',
    label: 'Suspended',
  },
  // For PJP History "Visited Status" column: ensure 'visited' renders in green
  visited: {
    variant: 'success',
    label: 'Visited',
  },
  // For PJP History "Visit Status" column: ensure 'In Progress' renders in blue
  inprogress: {
    variant: 'blue',
    label: 'In Progress',
  },
};

export const VISIT_ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  [VisitOrderStatus.PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
  [VisitOrderStatus.IN_PROGRESS]: {
    variant: 'blue',
    label: 'In Progress',
  },
  [VisitOrderStatus.VISITED]: {
    variant: 'success',
    label: 'Visited',
  },
  [VisitOrderStatus.CANCELLED]: {
    variant: 'destructive',
    label: 'Cancelled',
  },
  [VisitOrderStatus.UN_ASSIGNED]: {
    variant: 'destructive',
    label: 'UnAssigned',
  },
  // Fallbacks for normalized keys to ensure consistent rendering
  // Normalized version (after removing spaces/dashes/underscores)
  'inprogress': {
    variant: 'blue',
    label: 'In Progress',
  },
};

export const VERIFICATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  verified: {
    variant: 'success',
    label: 'Verified',
  },
  unverified: {
    variant: 'destructive',
    label: 'Unverified',
  },
  invalid: {
    variant: 'destructive',
    label: 'Invalid',
  },
  pending: {
    variant: 'warning',
    label: 'Pending',
  },
};

export const SCHEME_STATUS_CONFIG: Record<string, StatusConfig> = {
  [SchemeStatusEnum.ACTIVE]: {
    variant: 'success',
    label: 'Active',
  },
  [SchemeStatusEnum.IN_REVIEW]: {
    variant: 'warning',
    label: 'In Review',
  },
  [SchemeStatusEnum.PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
  [SchemeStatusEnum.DRAFT]: {
    variant: 'warning',
    label: 'Draft',
  },
  [SchemeStatusEnum.INACTIVE]: {
    variant: 'destructive',
    label: 'Inactive',
  },
  // Fallback for normalized keys
  'active': {
    variant: 'success',
    label: 'Active',
  },
  'inreview': {
    variant: 'warning',
    label: 'In Review',
  },
  'pending': {
    variant: 'warning',
    label: 'Pending',
  },
  'draft': {
    variant: 'warning',
    label: 'Draft',
  },
  'inactive': {
    variant: 'destructive',
    label: 'Inactive',
  },
};

export const SCHEME_APPROVAL_STATUS_CONFIG: Record<string, StatusConfig> = {
  [ApprovalStatusEnum.APPROVED]: {
    variant: 'success',
    label: 'Approved',
  },
  [ApprovalStatusEnum.PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
  [ApprovalStatusEnum.REJECTED]: {
    variant: 'destructive',
    label: 'Rejected',
  },
};

export const ROUTE_PLANNER_APPROVAL_STATUS_CONFIG: Record<string, StatusConfig> = {
  [RoutePlannerApprovalStatus.APPROVED]: {
    variant: 'success',
    label: 'Approved',
  },
  [RoutePlannerApprovalStatus.REJECTED]: {
    variant: 'destructive',
    label: 'Rejected',
  },
  [RoutePlannerApprovalStatus.PENDING]: {
    variant: 'warning',
    label: 'Pending',
  },
};

export const INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  [InvoiceStatusEnum.DRAFT]: {
    variant: 'warning',
    label: 'Draft',
  },
  [InvoiceStatusEnum.SENT]: {
    variant: 'blue',
    label: 'Sent',
  },
  [InvoiceStatusEnum.PAID]: {
    variant: 'success',
    label: 'Paid',
  },
  [InvoiceStatusEnum.OVERDUE]: {
    variant: 'destructive',
    label: 'Overdue',
  },
  [InvoiceStatusEnum.CANCELLED]: {
    variant: 'destructive',
    label: 'Cancelled',
  },
  [InvoiceStatusEnum.COMPLETED]: {
    variant: 'success',
    label: 'Completed',
  },
  [InvoiceStatusEnum.CREATED]: {
    variant: 'blue',
    label: 'Created',
  },
};

export const PRODUCT_STATUS_CONFIG: Record<string, StatusConfig> = {
  [ProductStatus.ACTIVE]: {
    variant: 'success',
    label: 'Active',
  },
  [ProductStatus.INACTIVE]: {
    variant: 'destructive',
    label: 'Inactive',
  },
  // Fallback for normalized keys
  'active': {
    variant: 'success',
    label: 'Active',
  },
  'inactive': {
    variant: 'destructive',
    label: 'Inactive',
  },
};

export const getStatusConfig = (
  status: string,
  configType: StatusType
): StatusConfig => {
  const configs = {
    order: ORDER_STATUS_CONFIG,
    returnOrder: RETURN_ORDER_STATUS_CONFIG,
    outlet: OUTLET_STATUS_CONFIG,
    verification: VERIFICATION_STATUS_CONFIG,
    userStatus: USER_STATUS_CONFIG,
    routePlannerApprovalStatus: ROUTE_PLANNER_APPROVAL_STATUS_CONFIG,
    visitOrder: VISIT_ORDER_STATUS_CONFIG,
    scheme: SCHEME_STATUS_CONFIG,
    schemeApprovalStatus: SCHEME_APPROVAL_STATUS_CONFIG,
    invoice: INVOICE_STATUS_CONFIG,
    product: PRODUCT_STATUS_CONFIG,
    audit: {
      create: { variant: 'success', label: 'Created' },
      created: { variant: 'success', label: 'Created' },
      update: { variant: 'warning', label: 'Updated' },
      updated: { variant: 'warning', label: 'Updated' },
      delete: { variant: 'destructive', label: 'Deleted' },
      deleted: { variant: 'destructive', label: 'Deleted' },
    } as Record<string, StatusConfig>,
  };

  const config = configs[configType];
  // Normalize: lowercase and strip spaces/underscores/dashes to match variants like
  // "CREATE", "C R E A T E", "create", "created", etc.
  const normalizedStatus = (status || '')
    .toString()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  return (
    config[normalizedStatus] || {
      variant: 'outline',
      label: status || 'Unknown',
    }
  );
}; 