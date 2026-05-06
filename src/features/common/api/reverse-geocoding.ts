import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const { MAP_PROVIDERS_ENDPOINT } = apiEndPoint;

export interface ReverseGeocodingResponse {
  address: string;
  lat: number;
  long: number;
}

export interface ReverseGeocodingParams {
  lat: number;
  lng: number;
}

export const reverseGeocodingApi = {
  getAddressFromCoordinates: async (params: ReverseGeocodingParams) => {
    const response = await customAxios.get(`${MAP_PROVIDERS_ENDPOINT}/locate-address`, {
      params: {
        lat: params.lat,
        long: params.lng,
      },
    });
    return response.data.data;
  },
};
