/**
 * Hook to fetch a form by ID.
 */
export const useFormById = (id: string, enabled: boolean = true) => {
	return useQuery({
		queryKey: ['form', id],
		queryFn: () => formsApi.getById(id),
		enabled: !!id && enabled,
	});
};

/**
 * Hook to update a form schema by ID.
 */
export const useUpdateForm = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => formsApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] });
		},
	});
};

/**
 * Hook to delete a form schema by ID.
 */
export const useDeleteForm = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => formsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] });
		},
	});
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '../api/forms';

/**
 * Hook to fetch all forms with custom query params string.
 * @param paramsString Query params string (e.g., '?skip=0&limit=10')
 */
export const useForms = (paramsString: string = '') => {
	return useQuery({
		queryKey: ['forms', paramsString],
		queryFn: () => formsApi.getAll(paramsString),
	});
};

/**
 * Hook to create a new form schema.
 */
export const useCreateForm = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: any) => formsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] });
		},
	});
};
