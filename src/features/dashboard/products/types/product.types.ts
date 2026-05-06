export interface PricingGroup {
  id?: string;
  groupId?: string;
  _id?: string;
  groupName: string;
  groupCode: string;
  description?: string;
  warehouse?: Array<{ warehouseId: string }>;
  applicableTo?: {
    outletIds?: Array<{ outletId: string }>;
  };
  productMappings?: Array<{ productId: string }>;
  productCount?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CreatePricingGroupPayload {
  groupName: string;
  groupCode: string;
  description?: string;
  warehouse?: Array<{ warehouseId: string }>;
  applicableTo?: {
    outletIds?: Array<{ outletId: string }>;
  };
  productMappings?: Array<{ productId: string }>;
}

export interface UpdatePricingGroupPayload {
  groupName?: string;
  groupCode?: string;
  description?: string;
  warehouse?: Array<{ warehouseId: string }>;
  applicableTo?: {
    outletIds?: Array<{ outletId: string }>;
  };
  productMappings?: Array<{ productId: string }>;
}

export interface PricingGroupsResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    items: PricingGroup[];
    totalPages: number;
    totalItems: number;
  };
}

export interface PricingGroupResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: PricingGroup;
}

export interface UsePricingGroupsParams {
  skip?: number;
  limit?: number;
  search?: string;
  nonPaginated?: boolean;
  warehouseId?: string | string[];
}

export interface PricingGroupProduct {
  _id: string;
  productName: string;
  skuCode: string;
  description: string;
  hsnCode: string;
  pictureUrl: string | null;
  isActive: boolean;
  mrp: number;
  packageId: string;
  brandId: string;
  uom: string;
  categoryId: string;
  subcategoryId: string;
  productId: string;
  productImages: Array<{
    productS3Filename: string;
  }>;
  pricingGroup: Array<{
    warehouseId: string;
    price: number;
    applicableTo: {
      outletIds: Array<{
        outletId: string;
      }>;
    };
  }>;
}

export interface PricingGroupProductsResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: PricingGroupProduct[];
  };
}

export interface FetchPricingGroupProductsParams {
  groupIds?: string[];
  warehouseIds?: string[];
  skip?: number;
  limit?: number;
  search?: string;
}

export interface PricingGroupProductPrice {
  productId: string;
  price: number;
}

export interface BulkUpdatePricingGroupProductsPayload {
  groupId: string;
  products: PricingGroupProductPrice[];
}

export interface BulkUpdatePricingGroupProductsResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: any;
}

export interface UseProductsParams {
  warehouseId?: string | string[];
  brandId?: string | string[];
  categoryId?: string | string[];
  subcategoryId?: string | string[];
  status?: string;
  search?: string;
  enabled?: boolean;
  nonPaginated?: boolean;
  skip?: number;
  limit?: number;
}

export interface UsePricingGroupProductsParams {
  warehouseIds: string[];
  enabled?: boolean;
  skip?: number;
  limit?: number;
  search?: string;
}

export interface ProductsResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: any[];
  };
}

export interface StockAuditResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    stockAuditId: string;
    outletId: string;
    products: { productId: string; currentStock: number }[];
  };
}