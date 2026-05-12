import customAxios from '@/lib/axios';
import { Invoice, InvoicesResponse, UseInvoicesParams } from '../types/invoice.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || '';

export const invoicesApi = {
  getAll: async (params?: UseInvoicesParams): Promise<InvoicesResponse> => {
    const response = await customAxios.get(`${API_BASE_URL}/invoices`, {
      params: {
        outletId: params?.outletId,
        orderId: params?.orderId,
        skip: params?.skip,
        limit: params?.limit,
        search: params?.search,
        invoiceStatus: params?.invoiceStatus,
      },
    });
    
    return response.data;
  },

  getById: async (invoiceId: string): Promise<Invoice> => {
    const response = await customAxios.get(`${API_BASE_URL}/invoices/${invoiceId}`);
    
    return response.data;
  },

  updateStatus: async (invoiceId: string, status: string): Promise<Invoice> => {
    const response = await customAxios.put(`${API_BASE_URL}/invoices/${invoiceId}/status`, {
      status,
    });
    
    return response.data;
  },

  download: async (invoiceId: string): Promise<Blob> => {
    const response = await customAxios.get(`${API_BASE_URL}/invoices/download/${invoiceId}`, {
      responseType: 'blob',
    });
    
    return response.data;
  },

  send: async (invoiceId: string): Promise<Invoice> => {
    const response = await customAxios.post(`${API_BASE_URL}/invoices/${invoiceId}/send`);
    
    return response.data;
  },
};
