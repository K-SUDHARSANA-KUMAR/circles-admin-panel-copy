import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockAuditApi } from '../api/stockaudit';
import { StockAuditResponse } from '../types/product.types';


export const useStockaudit = () => {
  const queryClient = useQueryClient();

  const fetchByOutletId = (outletId: string, enabled = true) =>
    useQuery<StockAuditResponse>({
      queryKey: ['stockaudit', outletId],
      queryFn: () => stockAuditApi.fetchByOutletId(outletId),
      enabled: !!outletId && enabled,
    });

  const createStockAudit = useMutation({
    mutationFn: stockAuditApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockaudit'] });
    },
  });

  const updateStockAudit = useMutation({
    mutationFn: ({ stockAuditId, data }: { stockAuditId: string; data: any }) =>
      stockAuditApi.update(stockAuditId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockaudit'] });
    },
  });

  return {
    fetchByOutletId,
    createStockAudit,
    updateStockAudit,
  };
};
