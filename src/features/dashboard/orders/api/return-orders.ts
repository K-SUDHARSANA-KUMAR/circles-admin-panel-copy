import axios from "axios";

const ORDERS_ENDPOINT = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || '';

export interface ReturnOrderProduct {
  productId: string;
  productName: string;
  mrp: number;
  quantity: number;
  price: number;
  originalOrderId: string;
  returnReason: string;
}

export interface ReturnOrder {
  _id: string;
  orderId: string;
  userId: string;
  outletId: string;
  returnDate: string;
  returnReason: string;
  products: ReturnOrderProduct[];
  returnOrderStatus: string;
  returnId: string;
  createdAt: string;
  updatedAt: string;
  outletDetails?: {
    _id: string;
    outletId: string;
    outletName: string;
    phoneNumber: string;
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
    businessTypeId: string;
    mappings: {
      warehouseId: string;
      warehouseName: string;
    }[];
    channelId: string;
    approvers: {
      level: number;
      mandatory: boolean;
      roleId: string;
      approvedStatus: string;
    }[];
    businessType: {
      businessTypeName: string;
    };
    pincodeDetails: {
      cityName: string | null;
      stateName: string | null;
      districtName: string | null;
    };
  };
}

export interface ReturnOrdersResponse {
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: ReturnOrder[];
  };
  returnOrderStatus: number;
  errors: null;
}

export interface UseReturnOrdersParams {
  skip?: number;
  limit?: number;
  search?: string;
  returnOrderStatus?: string;
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
}

export const returnOrdersApi = {
  getAll: async (params?: UseReturnOrdersParams): Promise<ReturnOrdersResponse> => {
    const response = await axios.get(ORDERS_ENDPOINT + '/return-orders', { params });
    return response.data;
  },
  getReturnOrderById: async (
    returnId: string,
    params?: UseReturnOrdersParams
  ): Promise<ReturnOrder> => {
    const response = await axios.get(ORDERS_ENDPOINT + `/return-orders/${returnId}`, {
      params,
    });
    return response.data.data;
  },
}; 