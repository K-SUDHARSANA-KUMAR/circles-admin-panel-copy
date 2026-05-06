export interface Target {
  _id: string;
  targetName?: string;
  target: {
    amount?: number;
    kgs?: number;
  };
  actual?: {
    amount?: number;
    kgs?: number;
  };
  startDate?: string;
  endDate?: string;
  userId?: string | string[];
  warehouseId?: string[];
  outletId?: string[];
  productId?: string[];
  brandId?: string[];
  categoryId?: string[];
  subCategoryId?: string[];
  divisionId?: string[];
  channelId?: string[];
  zoneId?: string[];
  subZoneId?: string[];
  status?: string;
  isDeleted?: boolean;
  targetId?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  // Additional fields for display
  targetAmount?: number;
  targetKgs?: number;
  actualAmount?: number;
  actualKgs?: number;
  name?: string; // For display purposes
  id?: string; // For compatibility with existing components
}

export interface CreateTargetPayload {
  targetName: string;
  userId?: string[];
  warehouseId?: string[];
  outletId?: string[];
  productId?: string[];
  brandId?: string[];
  categoryId?: string[];
  subCategoryId?: string[];
  divisionId?: string[];
  channelId?: string[];
  zoneId?: string[];
  subZoneId?: string[];
  target: {
    amount: number;
    kgs: number;
  };
  startDate: string;
  endDate: string;
  description?: string;
  status?: string;
}

export interface UpdateTargetRequest {
  targetName?: string;
  userId?: string | string[];
  warehouseId?: string[];
  outletId?: string[];
  productId?: string[];
  brandId?: string[];
  categoryId?: string[];
  subCategoryId?: string[];
  divisionId?: string[];
  channelId?: string[];
  zoneId?: string[];
  subZoneId?: string[];
  target?: {
    amount?: number;
    kgs?: number;
  };
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface TargetsResponse {
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: Target[];
  };
  status: number;
  errors: null;
}

export interface UseTargetsParams {
  skip?: number;
  limit?: number;
  search?: string;
  warehouseId?: string | string[];
  fromDate?: string;
  toDate?: string;
  userId?: string;
  targetName?: string;
}
