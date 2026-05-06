import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import {
  ProductsResponse,
  UsePricingGroupProductsParams,
  UseProductsParams,
} from '../types/product.types';

export const useProducts = (params?: UseProductsParams) => {
  const queryClient = useQueryClient();

  const products = useQuery<ProductsResponse>({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params),
    enabled: params?.enabled !== false,
  });

  const getProduct = (productId: string) => {
    return useQuery({
      queryKey: ['product', productId],
      queryFn: () => productsApi.getById(productId),
      enabled: !!productId,
    });
  };

  const createProduct = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: any }) =>
      productsApi.update(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const assignWarehousesToProduct = useMutation({
    mutationFn: ({
      productId,
      warehouseIds,
    }: {
      productId: string;
      warehouseIds: { warehouseId: string }[];
    }) => productsApi.assignWarehousesToProduct(productId, warehouseIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });

  const syncSapProducts = useMutation({
    mutationFn: productsApi.syncSapProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    products,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    assignWarehousesToProduct,
    syncSapProducts,
  };
};

// New hook for pricing group products
export const usePricingGroupProducts = (
  params: UsePricingGroupProductsParams
) => {
  return useQuery({
    queryKey: ['pricing-group-products', params.warehouseIds, params.skip, params.limit, params.search],
    queryFn: () => productsApi.getPricingGroupProducts(
      params.warehouseIds,
      params.skip,
      params.limit,
      params.search
    ),
    enabled: params?.enabled !== false && params.warehouseIds.length > 0,
  });
};

