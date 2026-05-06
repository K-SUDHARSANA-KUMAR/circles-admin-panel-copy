'use client';

import StatusBadge from '@/components/ui/badge';
import { getStatusConfig } from '@/constants/status-config';

export enum StatusType {
  ORDER = 'order',
  RETURN_ORDER = 'returnOrder',
  OUTLET = 'outlet',
  VERIFICATION = 'verification',
  USER_STATUS = 'userStatus',
  ROUTE_PLANNER_APPROVAL_STATUS = 'routePlannerApprovalStatus',
  VISIT_ORDER = 'visitOrder',
  SCHEME = 'scheme',
  SCHEME_APPROVAL_STATUS = 'schemeApprovalStatus',
  INVOICE = 'invoice',
  PRODUCT = 'product',
  AUDIT = 'audit',
}

export function renderStatusBadge (status: string, type: StatusType) {
  const statusConfig = getStatusConfig(status, type);
  return <StatusBadge value={statusConfig.label || status} variant={statusConfig.variant} />;
}
