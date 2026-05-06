export enum ApprovalHierarchyType {
  CLAIM_APPROVALS = 'claimApprovals',
  OUTLET_APPROVALS = 'outletApprovals',
  SCHEME_APPROVALS = 'schemeApprovals',
  MANUAL_PJP_APPROVALS = 'manualPjpApprovals',
}

export const APPROVAL_HIERARCHY_TYPES = [
  { 
    value: ApprovalHierarchyType.CLAIM_APPROVALS, 
    label: 'Claim Approvals',
    path: 'claim-approvals'
  },
  { 
    value: ApprovalHierarchyType.OUTLET_APPROVALS, 
    label: 'Outlet Approvals',
    path: 'outlet-approvals'
  },
  { 
    value: ApprovalHierarchyType.SCHEME_APPROVALS, 
    label: 'Scheme Approvals',
    path: 'scheme-approvals'
  },
  { 
    value: ApprovalHierarchyType.MANUAL_PJP_APPROVALS, 
    label: 'Manual PJP Approvals',
    path: 'manual-pjp-approvals'
  },
];

