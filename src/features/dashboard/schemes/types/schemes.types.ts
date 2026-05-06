export interface Scheme {
  _id: string;
  schemeId: string;
  schemeName: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'IN_REVIEW' | 'PENDING';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  validFrom: string;
  validTo: string;
  maxRewardPerInvoice: number;
  isExclusive: boolean;
  applicableTo: {
    warehouseIds: string[];
    outletIds: string[];
    productIds: string[];
    brandIds: string[];
    categoryIds: string[];
    subcategoryIds: string[];
  };
  conditions: Array<{
    conditionType: 'combo' | 'assorted' | 'invoice' | 'lineItem' | 'prorated';
    priority: number;
    criteria: any;
    reward: {
      type:
      | 'freeProduct'
      | 'discountPercent'
      | 'discountFixed'
      | 'cashback'
      | 'loyaltyPoints';
      value?: number;
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
      maxRewardAmount?: number;
      maxApplications?: number;
    };
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemesResponse {
  data: {
    items: Scheme[];
    limit: number;
    skip: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CreateSchemePayload {
  schemeCode: string;
  schemeName: string;
  description: string;
  validFrom: string;
  validTo: string;
  maxRewardPerInvoice: number;
  isExclusive?: boolean;
  applicableTo: {
    warehouseIds: string[];
    outletIds: string[];
    productIds: string[];
    brandIds: string[];
    categoryIds: string[];
    subcategoryIds: string[];
  };
  conditions: Array<{
    conditionType: 'combo' | 'assorted' | 'invoice' | 'lineItem' | 'prorated';
    priority: number;
    criteria: any;
    reward: {
      type:
      | 'freeProduct'
      | 'discountPercent'
      | 'discountFixed'
      | 'cashback'
      | 'loyaltyPoints';
      value?: number;
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
      maxRewardAmount?: number;
      maxApplications?: number;
    };
  }>;
  createdBy: string;
  status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'IN_REVIEW' | 'REJECTED';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export type UpdateSchemePayload = Partial<CreateSchemePayload>;

export interface QuerySchemesParams {
  search?: string;
  skip?: number;
  enabled?: boolean;
  nonPaginated?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  schemeId?: string;
  schemeName?: string;
  status?: string;
  approvalStatus?: string;
  createdBy?: string;
  validFrom?: string;
  validTo?: string;
  approverId?: string;
  approverRoleId?: string;
  divisionId?: string;
  channelId?: string;
  zoneId?: string;
  subZoneId?: string;
  warehouseId?: string;
  outletTypeId?: string;
  businessTypeId?: string;
}
