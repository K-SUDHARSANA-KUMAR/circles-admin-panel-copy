import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api/invoices';
import {
  Invoice,
  InvoicesResponse,
  UseInvoicesParams,
} from '../types/invoice.types';

export const useInvoices = (params?: UseInvoicesParams) => {
  const queryClient = useQueryClient();

  const invoices = useQuery<InvoicesResponse>({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.getAll(params),
    enabled: true,
  });

  const getInvoice = (invoiceId: string) => {
    return useQuery<Invoice>({
      queryKey: ['invoice', invoiceId],
      queryFn: () => invoicesApi.getById(invoiceId),
      enabled: !!invoiceId,
    });
  };

  const updateInvoiceStatus = useMutation({
    mutationFn: ({
      invoiceId,
      status,
    }: {
      invoiceId: string;
      status: string;
    }) => invoicesApi.updateStatus(invoiceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
    },
  });

  const downloadInvoice = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.download(invoiceId),
  });

  const sendInvoice = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.send(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
    },
  });

  return {
    invoices,
    getInvoice,
    updateInvoiceStatus,
    downloadInvoice,
    sendInvoice,
  };
};
