import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { claimsApi } from '../api/claims';
import { CreateClaimPayload } from '../types/claim.types';

export const useClaims = () => {
  const queryClient = useQueryClient();
  
  const claims = useQuery({
    queryKey: ['claims'],
    queryFn: claimsApi.getAll,
  });

  const createClaim = useMutation({
    mutationFn: (payload: CreateClaimPayload) => claimsApi.create(payload),
    onSuccess: () => {
      // Invalidate and refetch claims after successful creation
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });

  return { claims, createClaim };
};
