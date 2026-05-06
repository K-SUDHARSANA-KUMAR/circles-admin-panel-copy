
export interface Product {
  productId: string;
  quantity: number;
  price: number;
  productName?: string;
  mrp?: number;
  skuCode?: string;
  uom?: string;
  pictureUrl?: string;
}

export interface CreateOrderRequest {
  outletId: string;
  warehouseId: string;
  orderDate: string;
  userId: string;
  products: {
    productId: string;
    quantity: number;
  }[];
  includeSchemes?: string[];
  excludeSchemes?: string[];
  appliedSchemes?: Array<{
    schemeId: string;
    schemeName: string;
    conditionType: string;
    priority: number;
    rewardType: string;
    rewardValue: number;
    rewardAmount: number;
    freeProducts?: Array<{
      productId: string;
      quantity: number;
    }>;
    discountedProducts?: Array<{
      productId: string;
      discountType: string;
      discountValue: number;
    }>;
    appliedQuantity: number;
    totalDiscount: number;
    description: string;
  }>;
}

export interface UpdateOrderStatusRequest {
  orderStatus: string;
  collectorId?: string;
}

export interface UpdateOrderRequest {
  orderId: string;
  userId: string;
  outletId: string;
  orderDate: string;
  orderStatus: string;
  products: Array<{
    productId: string;
    quantity: number;
    productName?: string;
    mrp?: number;
    price?: number;
    brandId?: string;
    categoryId?: string;
    subcategoryId?: string;
  }>;
  warehouseId: string;
}

export interface Order {
  _id: string;
  outletId: string;
  orderDate: string;
  orderStatus: string;
  products: Product[];
  orderValue: number;
  warehouseId: string;
  orderId: string;
  userName?: string;
  itemTotalAmount?: number;
  totalDiscountAmount?: number;
  totalOrderAmount?: number;
  appliedSchemes?: Array<{
    schemeId: string;
    schemeName: string;
    conditionType: string;
    priority: number;
    rewardType: string;
    rewardValue: number;
    rewardAmount: number;
    freeProducts: Array<{
      productId: string;
      quantity: number;
    }>;
    appliedQuantity: number;
    totalDiscount: number;
    description: string;
  }>;
  createdAt: string;
  updatedAt: string;
  warehouseDetails?: {
    _id: string;
    warehouseId: string;
    warehouseName: string;
    channelId?: string;
    divisionId?: string;
    zoneId?: string;
    subZoneId?: string;
    warehouseTypeId?: string;
    address?: {
      location: {
        type: string;
        coordinates: number[];
      };
      streetAddress: string;
    };
    mappings?: Array<{
      pincode: string;
    }>;
    isDeleted?: boolean;
    shortCode?: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
  };
  outletDetails?: {
    _id: string;
    outletId: string;
    outletName: string;
    outletCode?: string;
    phoneNumber: string;
    email?: string | null;
    ownerName?: string;
    outletImageUrl: string | null;
    outletStatus: string;
    outletAddress: {
      location: {
        type: string;
        coordinates: number[];
      };
      streetAddress: string;
    };
    isDeleted: boolean;
    warehouseId: string;
    verificationDocuments: any[];
    createdAt: string;
    updatedAt: string;
    __v: number;
    businessTypeId: string;
    mappings: {
      warehouseId: string;
      warehouseName: string;
    }[];
    businessType: {
      businessTypeName: string;
    };
    pincodeDetails: {
      cityName: string;
      stateName: string;
      districtName: string;
    };
  };
}

export interface OrdersResponse {
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: Order[];
    products: any;
  };
  orderStatus: number;
  errors: null;
}

export interface UseOrdersParams {
  skip?: number;
  limit?: number;
  search?: string;
  orderStatus?: string;
  warehouseId?: string | string[];
  fromDate?: string;
  toDate?: string;
  userId?: string | string[];
  orderId?: string;
  outletType?: string;
}

// Reward calculation types
export interface RewardCalculationRequest {
  warehouseId: string;
  outletId: string;
  products: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    brandId: string;
    categoryId: string;
    subcategoryId: string;
  }>;
  includeSchemes?: string[];
  excludeSchemes?: string[];
}

export interface FreeProduct {
  productId: string;
  quantity: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
}

export interface AppliedScheme {
  schemeId: string;
  schemeName: string;
  conditionType: string;
  priority: number;
  rewardType: string;
  rewardValue: number;
  rewardAmount: number;
  freeProducts: FreeProduct[];
  appliedQuantity: number;
  totalDiscount: number;
  description: string;
}

export interface RewardCalculationSummary {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  totalValueAfterDiscount: number;
  schemesApplied: number;
  freeProducts: FreeProduct[];
  discountValue: number;
}

export interface RewardCalculationResponse {
  totalDiscount: number;
  totalRewardAmount: number;
  appliedSchemes: AppliedScheme[];
  summary: RewardCalculationSummary;
}