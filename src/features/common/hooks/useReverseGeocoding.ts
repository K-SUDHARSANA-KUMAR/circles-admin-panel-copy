import { useQuery } from '@tanstack/react-query';
import { reverseGeocodingApi, ReverseGeocodingParams } from '../api/reverse-geocoding';

export const useReverseGeocoding = (params: ReverseGeocodingParams | null) => {
  const reverseGeocodingQuery = useQuery({
    queryKey: ['reverse-geocoding', params?.lat, params?.lng],
    queryFn: () => reverseGeocodingApi.getAddressFromCoordinates(params!),
    enabled: !!params?.lat && !!params?.lng,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    address: reverseGeocodingQuery.data?.address || '',
    pincode: reverseGeocodingQuery.data?.pincode || '',
    isLoading: reverseGeocodingQuery.isLoading,
    error: reverseGeocodingQuery.error,
    isSuccess: reverseGeocodingQuery.isSuccess,
  };
};
