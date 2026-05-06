import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllAds, createAd, updateAd, deleteAd } from '@/features/dashboard/advertisement/api/advertisements';
import { Advertisement } from '../types/advertisement.types';

export const useAdvertisements = () => {
  const queryClient = useQueryClient();

  const advertisements = useQuery<Advertisement[]>({
    queryKey: ['advertisements'],
    queryFn: getAllAds,
  });

  const createAdvertisement = useMutation({
    mutationFn: createAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
    },
  });

  const updateAdvertisement = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<Advertisement, 'title' | 'budget' | 'advertisementDate'>> }) =>
      updateAd(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
    },
  });

  const deleteAdvertisement = useMutation({
    mutationFn: deleteAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
    },
  });

  return {
    advertisements,
    createAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
  };
};
