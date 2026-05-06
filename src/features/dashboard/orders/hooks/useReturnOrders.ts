import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReturnOrder,
  returnOrdersApi,
  ReturnOrdersResponse,
  UseReturnOrdersParams,
} from '../api/return-orders';

export const useReturnOrders = (
  params?: UseReturnOrdersParams & { enabled?: boolean }
) => {
  const queryClient = useQueryClient();

  const allReturnOrders = useQuery<ReturnOrdersResponse>({
    queryKey: ['return-orders', params],
    queryFn: () => returnOrdersApi.getAll(params),
    enabled: params?.enabled !== false,
  });

  const returnOrder = (
    returnId: string,
    returnParams?: UseReturnOrdersParams
  ) => {
    return useQuery<ReturnOrder>({
      queryKey: ['return-order', returnId, returnParams],
      queryFn: () => returnOrdersApi.getReturnOrderById(returnId, returnParams),
      enabled: !!returnId,
    });
  };

  return {
    allReturnOrders,
    returnOrder,
  };
}; 