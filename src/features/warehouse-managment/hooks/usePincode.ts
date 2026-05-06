import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pincode, pincodesApi } from '../api/pincodes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setPincodes,
  setPincodeLoading,
  setPincodeError,
} from '@/store/slices/warehouseSlice';

export const usePincode = (pincodeId?: string) => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { pincodes, isLoading, error } = useAppSelector(
    (state) => state.pincode
  );

  const pincodesQuery = useQuery({
    queryKey: ['pincodes'],
    queryFn: async () => {
      dispatch(setPincodeLoading(true));
      try {
        const response = await pincodesApi.getAll();
        console.log(response,'cehck');
        dispatch(setPincodes(response.data.items));
        return response;
      } catch (error: any) {
        dispatch(setPincodeError(error.message));
        throw error;
      }
    },
    enabled: pincodes.length === 0, // Only fetch if Redux store is empty
  });

  const pincodeById = useQuery({
    queryKey: ['pincode-by-id', pincodeId],
    queryFn: ({ queryKey }) => pincodesApi.getById(queryKey[1] as string),
    enabled: !!pincodeId,
  });

  const createPincode = useMutation({
    mutationFn: pincodesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
    },
  });

  const updatePincode = useMutation({
    mutationFn: ({
      pincodeId,
      data,
    }: {
      pincodeId: string;
      data: Partial<Pincode>;
    }) => pincodesApi.update(pincodeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
    },
  });

  const deletePincode = useMutation({
    mutationFn: pincodesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
    },
  });

  const getUnmappedPincodes = useMutation({
    mutationFn: ({
      pincodes,
      skip,
      limit,
      channelId,
      stateId,
      districtId,
      search,
      signal,
    }: {
      pincodes: string[];
      skip?: number;
      limit?: number;
      channelId?: string;
      stateId?: string;
      districtId?: string;
      search?: string;
      signal?: AbortSignal;
    }) =>
      pincodesApi.getUnmappedPincodes(pincodes, {
        skip,
        limit,
        channelId,
        stateId,
        districtId,
        search,
      }, signal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincodes'] });
    },
  });

  return {
    pincodes: {
      data: { data: { items: pincodes } },
      isLoading: isLoading || pincodesQuery.isLoading,
      error: error || pincodesQuery.error,
    },
    pincodeById,
    createPincode,
    updatePincode,
    deletePincode,
    getUnmappedPincodes,
  };
};
