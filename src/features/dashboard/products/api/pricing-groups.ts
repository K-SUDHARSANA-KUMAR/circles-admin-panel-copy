import { apiEndPoint } from '@/features/apiEndPoint';
import axios from 'axios';
import { BulkUpdatePricingGroupProductsPayload, BulkUpdatePricingGroupProductsResponse, CreatePricingGroupPayload, FetchPricingGroupProductsParams, PricingGroupProductsResponse, PricingGroupResponse, PricingGroupsResponse, UpdatePricingGroupPayload, UsePricingGroupsParams } from '../types/product.types';
import customAxios from '@/lib/axios';

const { PRICING_GROUPS_ENDPOINT, PRICING_GROUP_PRODUCTS_ENDPOINT } =
  apiEndPoint;



export const pricingGroupsApi = {
  getAll: async (
    params?: UsePricingGroupsParams
  ): Promise<PricingGroupsResponse> => {
    const finalParams = { ...params };

    // Handle warehouseId - if it's an array, stringify it
    if (params && params.warehouseId) {
      if (Array.isArray(params.warehouseId)) {
        if (params.warehouseId.length === 0) {
          delete finalParams.warehouseId;
        } else {
          finalParams.warehouseId = JSON.stringify(params.warehouseId);
        }
      }
    }

    const response = await customAxios.get(PRICING_GROUPS_ENDPOINT, { params: finalParams });
    return response.data;
  },

  getById: async (pricingGroupId: string): Promise<PricingGroupResponse> => {
    const response = await customAxios.get(
      `${PRICING_GROUPS_ENDPOINT}/${pricingGroupId}`
    );
    return response.data;
  },

  create: async (
    data: CreatePricingGroupPayload
  ): Promise<PricingGroupResponse> => {
    console.log(
      'Pricing Groups API - Sending payload:',
      JSON.stringify(data, null, 2)
    );
    const response = await customAxios.post(PRICING_GROUPS_ENDPOINT, data);
    return response.data;
  },

  update: async (
    pricingGroupId: string,
    data: UpdatePricingGroupPayload
  ): Promise<PricingGroupResponse> => {
    const response = await customAxios.patch(
      `${PRICING_GROUPS_ENDPOINT}/${pricingGroupId}`,
      data
    );
    return response.data;
  },

  delete: async (pricingGroupId: string): Promise<void> => {
    const response = await customAxios.delete(
      `${PRICING_GROUPS_ENDPOINT}/${pricingGroupId}`
    );
    return response.data;
  },

  fetchProductsByFilter: async (
    params: FetchPricingGroupProductsParams
  ): Promise<PricingGroupProductsResponse> => {
    const response = await customAxios.post(
      `${PRICING_GROUP_PRODUCTS_ENDPOINT}/fetch-by-filter`,
      params
    );
    return response.data;
  },

  bulkUpdateProductPrices: async (
    data: BulkUpdatePricingGroupProductsPayload
  ): Promise<BulkUpdatePricingGroupProductsResponse> => {
    console.log(
      'Bulk Update Pricing Group Products API - Sending payload:',
      JSON.stringify(data, null, 2)
    );
    const response = await customAxios.put(
      `${PRICING_GROUP_PRODUCTS_ENDPOINT}/bulk`,
      data
    );
    return response.data;
  },
};
