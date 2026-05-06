import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTargets, getTargetById, createTarget, updateTarget, updateTargetStatus, deleteTarget } from '../api/targets';
import { CreateTargetPayload } from '../types/target.types';

export const useTargets = (skip: number = 0, limit: number = 10) => {
  const queryClient = useQueryClient();

  // Get token from localStorage
  const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  };

  const targets = useQuery({
    queryKey: ['targets', skip, limit],
    queryFn: () => getTargets(getToken(), skip, limit),
    select: (response) => {
      // Handle the actual API response structure: { data: { items: [...], totalItems: 10, totalPages: 1 } }
      if (response.data?.data) {
        return {
          items: response.data.data.items || [],
          totalItems: response.data.data.totalItems || 0,
          totalPages: response.data.data.totalPages || 0,
          skip: response.data.data.skip || 0,
          limit: response.data.data.limit || 10,
        };
      }
      // Fallback for other response shapes
      if (Array.isArray(response.data)) {
        return {
          items: response.data,
          totalItems: response.data.length,
          totalPages: 1,
          skip: 0,
          limit: response.data.length,
        };
      }
      return {
        items: [],
        totalItems: 0,
        totalPages: 0,
        skip: 0,
        limit: 10,
      };
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: (data: CreateTargetPayload) => createTarget(data, getToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTarget(id, data, getToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });

  const updateTargetStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTargetStatus(id, status, getToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (id: string) => deleteTarget(id, getToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });

  return {
    targets,
    createTarget: createTargetMutation,
    updateTarget: updateTargetMutation,
    updateTargetStatus: updateTargetStatusMutation,
    deleteTarget: deleteTargetMutation,
  };
};

export const useTargetById = (id: string) => {
  const getToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  };

  return useQuery({
    queryKey: ['target', id],
    queryFn: () => getTargetById(id, getToken()),
    enabled: !!id,
    select: (response) => response.data?.data || response.data,
  });
};
