import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders';
import {
  Order,
  OrdersResponse,
  UpdateOrderRequest,
  UpdateOrderStatusRequest,
  UseOrdersParams,
  RewardCalculationRequest,
  RewardCalculationResponse,
} from '../types/order.types';

export const useOrders = (params?: UseOrdersParams) => {
  const queryClient = useQueryClient();

  const allOrders = useQuery<OrdersResponse>({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.getAll(params),
  });

  const order = (orderId: string, orderParams?: UseOrdersParams) => {
    return useQuery<Order>({
      queryKey: ['order', orderId, orderParams],
      queryFn: () => ordersApi.getOrderById(orderId, orderParams),
      enabled: !!orderId,
    });
  };

  const createOrder = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderStatusRequest;
    }) => ordersApi.updateOrderStatus(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });

  const updateOrder = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderRequest;
    }) => ordersApi.updateOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });

  const calculateReward = useMutation({
    mutationFn: (data: RewardCalculationRequest) => ordersApi.calculateReward(data),
  });

  return {
    allOrders,
    order,
    createOrder,
    updateOrderStatus,
    updateOrder,
    calculateReward,
  };
};
