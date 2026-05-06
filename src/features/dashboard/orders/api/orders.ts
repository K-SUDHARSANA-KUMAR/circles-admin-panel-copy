import { apiEndPoint } from "@/features/apiEndPoint";
import { CreateOrderRequest, Order, OrdersResponse, UpdateOrderRequest, UpdateOrderStatusRequest, UseOrdersParams, RewardCalculationRequest, RewardCalculationResponse } from "../types/order.types";
import customAxios from "@/lib/axios";

const { ORDERS_ENDPOINT, SCHEMES_CALCULATE_REWARD_ENDPOINT } = apiEndPoint;

export const ordersApi = {
  getAll: async (params?: UseOrdersParams): Promise<OrdersResponse> => {
    const finalParams = { ...params };
    if (params && Array.isArray(params.warehouseId)) {
      if (params.warehouseId.length === 0) {
        delete finalParams.warehouseId;
      } else {
        finalParams.warehouseId = JSON.stringify(params.warehouseId);
      }
    }
    if (params && Array.isArray(params.userId)) {
      if (params.userId.length === 0) {
        delete finalParams.userId;
      } else {
        finalParams.userId = JSON.stringify(params.userId);
      }
    }
    const response = await customAxios.get(ORDERS_ENDPOINT + '/orders', { params: finalParams });
    return response.data;
  },

  getOrderById: async (
    orderId: string,
    params?: UseOrdersParams
  ): Promise<Order> => {
    const response = await customAxios.get(ORDERS_ENDPOINT + `/orders/${orderId}`, {
      params,
    });
    return response.data.data;
  },

  create: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await customAxios.post(ORDERS_ENDPOINT + '/orders', data);
    return response.data;
  },

  updateOrderStatus: async (
    orderId: string,
    data: UpdateOrderStatusRequest
  ): Promise<Order> => {
    const headers: Record<string, string> = {};
    headers['user-current-view'] = "admin";
    const response = await customAxios.patch(
      ORDERS_ENDPOINT + `/orders/${orderId}/status`,
      data,
      {
        headers,
      }
    );
    return response.data;
  },

  updateOrder: async (
    orderId: string,
    data: UpdateOrderRequest
  ): Promise<Order> => {
    const headers: Record<string, string> = {};
    headers['user-current-view'] = "admin";
    const response = await customAxios.put(
      ORDERS_ENDPOINT + `/orders/${orderId}`,
      data,
      {
        headers,
      }
    );
    // API response: { statusCode, ..., data: { ...order } }
    return response.data.data || response.data;
  },

  calculateReward: async (
    data: RewardCalculationRequest
  ): Promise<RewardCalculationResponse> => {
    const response = await customAxios.post(
      SCHEMES_CALCULATE_REWARD_ENDPOINT + '/calculate',
      data
    );
    return response.data.data;
  },
};