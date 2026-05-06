import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const { PRODUCTS_ENDPOINT, SYNC_SERVICE_URL } = apiEndPoint;
const PRICING_GROUP_PRODUCTS_ENDPOINT = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL + '/pricing-group-products';

export const productsApi = {
  getAll: async (params?: {
    warehouseId?: string | string[];
    brandId?: string | string[];
    categoryId?: string | string[];
    subcategoryId?: string | string[];
    status?: string;
    search?: string;
    skip?: number;
    limit?: number;
    nonPaginated?: boolean;
  }) => {
    const finalParams = { ...params };

    // Handle warehouseId - if it's an array, stringify it; if it's already a string, pass it through
    if (params && params.warehouseId) {
      if (Array.isArray(params.warehouseId)) {
        if (params.warehouseId.length === 0) {
          delete finalParams.warehouseId;
        } else {
          finalParams.warehouseId = JSON.stringify(params.warehouseId);
        }
      }
    }

    // Handle array parameters by JSON stringifying them
    if (params && Array.isArray(params.brandId)) {
      if (params.brandId.length === 0) {
        delete finalParams.brandId;
      } else {
        finalParams.brandId = JSON.stringify(params.brandId);
      }
    }

    if (params && Array.isArray(params.categoryId)) {
      if (params.categoryId.length === 0) {
        delete finalParams.categoryId;
      } else {
        finalParams.categoryId = JSON.stringify(params.categoryId);
      }
    }

    if (params && Array.isArray(params.subcategoryId)) {
      if (params.subcategoryId.length === 0) {
        delete finalParams.subcategoryId;
      } else {
        finalParams.subcategoryId = JSON.stringify(params.subcategoryId);
      }
    }

    const response = await customAxios.get(PRODUCTS_ENDPOINT, { params: finalParams });
    return response.data;
  },

  getById: async (productId: string) => {
    const response = await customAxios.get(`${PRODUCTS_ENDPOINT}/${productId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await customAxios.post(PRODUCTS_ENDPOINT, data);
    return response.data;
  },

  update: async (productId: string, data: any) => {
    const response = await customAxios.patch(
      `${PRODUCTS_ENDPOINT}/${productId}`,
      data
    );
    return response.data;
  },

  delete: async (productId: string) => {
    const response = await customAxios.delete(`${PRODUCTS_ENDPOINT}/${productId}`);
    return response.data;
  },

  assignWarehousesToProduct: async (
    productId: string,
    warehouseIds: { warehouseId: string }[]
  ) => {
    const url = `${PRODUCTS_ENDPOINT}/${productId}/warehouses`;
    const payload = { warehouses: warehouseIds };
    const response = await customAxios.patch(url, payload);
    return response.data;
  },

  // New API for fetching pricing group products by warehouse filter
  getPricingGroupProducts: async (
    warehouseIds: string[],
    skip?: number,
    limit?: number,
    search?: string
  ) => {
    const url = `${PRICING_GROUP_PRODUCTS_ENDPOINT}/fetch-by-filter`;
    const payload: any = { warehouseIds };
    if (skip !== undefined) payload.skip = skip;
    if (limit !== undefined) payload.limit = limit;
    if (search) payload.search = search;
    const response = await customAxios.post(url, payload);
    return response.data;
  },

  // Sync SAP products
  syncSapProducts: async () => {
    if (!SYNC_SERVICE_URL) {
      throw new Error('Sync service URL is not configured');
    }
    const url = `${SYNC_SERVICE_URL}/sap/sync-sap-products`;
    const response = await customAxios.post(url);
    return response.data;
  },

}; 
