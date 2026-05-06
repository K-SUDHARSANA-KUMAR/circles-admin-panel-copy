import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesApi, Warehouse } from '../api/warehouses';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setWarehouses, setLoading, setError } from '@/store/slices/warehouseSlice';

export const useWarehouse = (warehouseId?: string, filters?: {
  divisionId?: string | string[];
  channelId?: string | string[];
  zoneId?: string | string[];
  subZoneId?: string | string[];
  warehouseTypeId?: string | string[];
  warehouseIds?: string[];
  search?: string;
  nonPaginated?: boolean;
  skip?: number;
  limit?: number;
  pincode?: string;
  userId?: string;
}) => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { warehouses, isLoading, error } = useAppSelector((state) => state.warehouse);

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', filters],
    queryFn: async () => {
      dispatch(setLoading(true));
      try {
        // Pass warehouseIds and other filters to getAll
        const response = await warehousesApi.getAll(filters);
        dispatch(setWarehouses(response.data.items));
        return response;
      } catch (error: any) {
        dispatch(setError(error.message));
        throw error;
      }
    },
    // Remove the enabled condition to allow refetching when filters change
  });

  const warehouseById = useQuery({
    queryKey: ['warehouse-by-id', warehouseId],
    queryFn: ({ queryKey }) => warehousesApi.getById(queryKey[1] as string),
    enabled: !!warehouseId,
  });

  const createWarehouse = useMutation({
    mutationFn: ({ data, userId }: { data: Warehouse; userId?: string }) => 
      warehousesApi.create(data, userId),
    onSuccess: () => {
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      // Also refetch the data to update Redux state
      warehousesQuery.refetch();
    },
  });

  const updateWarehouse = useMutation({
    mutationFn: ({
      warehouseId,
      data,
    }: {
      warehouseId: string;
      data: Partial<Warehouse>;
    }) => warehousesApi.update(warehouseId, data),
    onSuccess: () => {
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      // Also refetch the data to update Redux state
      warehousesQuery.refetch();
    },
  });

  const deleteWarehouse = useMutation({
    mutationFn: warehousesApi.delete,
    onSuccess: () => {
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      // Also refetch the data to update Redux state
      warehousesQuery.refetch();
    },
  });

  return {
    warehouses: {
      data: { data: { items: warehouses } },
      isLoading: isLoading || warehousesQuery.isLoading,
      error: error || warehousesQuery.error,
    },
    warehousesQuery, // Expose the query object for refetch functionality
    warehouseById,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  };
};
