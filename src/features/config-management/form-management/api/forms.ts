import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const { FORMS_ENDPOINT } = apiEndPoint;

export const formsApi = {
  /**
   * Get all forms with optional query params string (e.g., '?skip=0&limit=10')
   */
  getAll: async (params: string = '') => {
    // params should start with '?' if present
    const url = `${FORMS_ENDPOINT}${params}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  /**
   * Get a form by ID
   */
  getById: async (id: string) => {
    const url = `${FORMS_ENDPOINT}/get-by-id/${id}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  /**
   * Create a new form schema
   */
  create: async (data: any) => {
    const url = FORMS_ENDPOINT;
    const response = await customAxios.post(url, data);
    return response.data;
  },

  /**
   * Update a form schema by ID
   */
  update: async (id: string, data: any) => {
    const url = `${FORMS_ENDPOINT}/${id}`;
    const response = await customAxios.put(url, data);
    return response.data;
  },

  /**
   * Delete a form schema by ID
   */
  delete: async (id: string) => {
    const url = `${FORMS_ENDPOINT}/${id}`;
    const response = await customAxios.delete(url);
    return response.data;
  },
};
