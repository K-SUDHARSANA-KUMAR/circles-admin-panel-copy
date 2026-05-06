import { apiEndPoint } from '@/features/apiEndPoint';
import axios from 'axios';

const { WAREHOUSE_ENDPOINT } = apiEndPoint;

export interface WarehouseAddress {
  streetAddress: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
}

export interface Warehouse {
  id?: string;
  _id?: string;
  warehouseId?: string;
  warehouseName: string;
  divisionId?: string;
  divisionName?: string;
  channelId?: string;
  channelName?: string;
  zoneId?: string;
  zoneName?: string;
  subZoneId?: string;
  subZoneName?: string;
  warehouseTypeId?: string;
  warehouseTypeName?: string;
  address: WarehouseAddress;
  isDeleted?: boolean;
}

export const warehousesApi = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    filter?: string;
    deleted?: boolean;
    divisionId?: string | string[];
    channelId?: string | string[];
    zoneId?: string | string[];
    subZoneId?: string | string[];
    warehouseTypeId?: string | string[];
    warehouseIds?: string[];
    search?: string;
    nonPaginated?: boolean;
    pincode?: string;
    userId?: string;
  }) => {
    // Build query parameters properly for arrays
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.filter) queryParams.append('filter', params.filter);
    if (params?.deleted !== undefined) queryParams.append('deleted', params.deleted.toString());
    
    // Handle division filter
    if (params?.divisionId) {
      if (Array.isArray(params.divisionId)) {
        queryParams.append('divisionId', JSON.stringify(params.divisionId));
      } else {
        queryParams.append('divisionId', params.divisionId);
      }
    }
    
    // Handle stringified array parameters
    if (params?.channelId) {
      if (Array.isArray(params.channelId)) {
        queryParams.append('channelId', JSON.stringify(params.channelId));
      } else {
        queryParams.append('channelId', params.channelId);
      }
    }
    
    // Handle zone filter
    if (params?.zoneId) {
      if (Array.isArray(params.zoneId)) {
        queryParams.append('zoneId', JSON.stringify(params.zoneId));
      } else {
        queryParams.append('zoneId', params.zoneId);
      }
    }
    
    // Handle subzone filter
    if (params?.subZoneId) {
      if (Array.isArray(params.subZoneId)) {
        queryParams.append('subZoneId', JSON.stringify(params.subZoneId));
      } else {
        queryParams.append('subZoneId', params.subZoneId);
      }
    }
    
    if (params?.warehouseTypeId) {
      if (Array.isArray(params.warehouseTypeId)) {
        queryParams.append('warehouseTypeId', JSON.stringify(params.warehouseTypeId));
      } else {
        queryParams.append('warehouseTypeId', params.warehouseTypeId);
      }
    }

    // Handle warehouseIds as array
    if (params?.warehouseIds && Array.isArray(params.warehouseIds)) {
      queryParams.append('warehouseId', JSON.stringify(params.warehouseIds));
    }
    
    // Handle search parameter
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    
    // Handle pincode parameter
    if (params?.pincode) {
      queryParams.append('pincode', params.pincode);
      console.log('Warehouse API called with pincode:', params.pincode);
    }

    // Handle userId parameter
    if (params?.userId) {
      queryParams.append('userId', params.userId);
    }
    
    // Handle nonPaginated parameter
    if (params?.nonPaginated) {
      queryParams.append('nonPaginated', 'true');
    }
    
    const url = `${WAREHOUSE_ENDPOINT}?${queryParams.toString()}`;
    console.log('Warehouse API URL:', url);
    const response = await axios.get(url);
    return response.data;
  },

  getById: async (warehouseId: string) => {
    const response = await axios.get(`${WAREHOUSE_ENDPOINT}/${warehouseId}`);
    return response.data;
  },

  create: async (data: Warehouse, userId?: string) => {
    let url = WAREHOUSE_ENDPOINT;
    if (userId) {
      const queryParams = new URLSearchParams();
      queryParams.append('userId', userId);
      url = `${WAREHOUSE_ENDPOINT}?${queryParams.toString()}`;
    }
    const response = await axios.post(url, data);
    return response.data;
  },

  update: async (warehouseId: string, data: Partial<Warehouse>) => {
    const response = await axios.patch(
      `${WAREHOUSE_ENDPOINT}/${warehouseId}`,
      data
    );
    return response.data;
  },

  delete: async (warehouseId: string) => {
    const response = await axios.delete(`${WAREHOUSE_ENDPOINT}/${warehouseId}`);
    return response.data;
  },

  findByIds: async (warehouseIds: string[]) => {
    const response = await axios.post(`${WAREHOUSE_ENDPOINT}/by-ids`, {
      warehouseIds,
    });
    return response.data;
  },
};
