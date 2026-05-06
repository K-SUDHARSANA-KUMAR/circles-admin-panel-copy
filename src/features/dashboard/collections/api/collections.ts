import { apiEndPoint } from '@/features/apiEndPoint';
import customAxios from '@/lib/axios';

const { PAYMENT_SERVICE_URL } = apiEndPoint;

export interface CollectionItem {
  seq: number;
  from: {
    type: string;
    id: string;
    name?: string;
    ownerName?: string;
    phoneNumber?: string;
  };
  to: {
    type: string;
    id: string;
    name?: string;
    employeeCode?: string;
    phoneNumber?: string;
  };
  amount: number;
  mode: string;
  status: string;
  collectedAt: string;
  remarks: string;
}

export interface Invoice {
  _id: string;
  invoiceNo: string;
  orderType: string;
  orderId: string;
  outletId: string;
  outletName: string;
  invoiceDate: string;
  totalAmount: number;
  amountPaid: number;
  amountRefunded: number;
  balanceDue: number;
  dueDate: string;
  invoiceStatus: string;
  invoicePdfs: string[];
  invoiceId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Collection {
  _id: string;
  invoiceIds?: string[];
  invoices?: Invoice[]; // Invoice details if included in API response
  paymentDate: string;
  currency: string;
  amount: number;
  paymentMode: string;
  status: string;
  collections?: CollectionItem[];
  totalRefundAmount: number;
  remarks: string;
  paymentId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface CollectionsResponse {
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: Collection[];
  };
  status: number;
  errors: null | string;
}

export interface CollectionsFilters {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMode?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  divisionId?: string;
  zoneId?: string;
  subZoneId?: string;
}

export interface HandoverRequest {
  paymentIds: string[];
  userId: string;
  remarks: string;
}

export interface InvoicesResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: Invoice[];
  };
}

export const collectionsApi = {
  getAll: async (filters?: CollectionsFilters): Promise<CollectionsResponse> => {
    const queryParams = new URLSearchParams();

    if (filters?.skip !== undefined) {
      queryParams.append('skip', filters.skip.toString());
    }
    if (filters?.limit !== undefined) {
      queryParams.append('limit', filters.limit.toString());
    }
    if (filters?.search) {
      queryParams.append('search', filters.search);
    }
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    if (filters?.paymentMode) {
      queryParams.append('paymentMode', filters.paymentMode);
    }
    if (filters?.warehouseId) {
      queryParams.append('warehouseId', filters.warehouseId);
    }
    if (filters?.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    if (filters?.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }
    if (filters?.divisionId) {
      queryParams.append('divisionId', filters.divisionId);
    }
    if (filters?.zoneId) {
      queryParams.append('zoneId', filters.zoneId);
    }
    if (filters?.subZoneId) {
      queryParams.append('subZoneId', filters.subZoneId);
    }

    const url = `${PAYMENT_SERVICE_URL}/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await customAxios.get(url);
    return response.data;
  },

  getExpandedDetails: async (paymentId: string): Promise<Collection> => {
    const url = `${PAYMENT_SERVICE_URL}/payments/${paymentId}`;
    const response = await customAxios.get(url);
    return response.data.data;
  },

  getById: async (id: string): Promise<Collection> => {
    const url = `${PAYMENT_SERVICE_URL}/payments/${id}`;
    const response = await customAxios.get(url);
    return response.data.data;
  },

  update: async (id: string, data: Partial<Collection>): Promise<Collection> => {
    const url = `${PAYMENT_SERVICE_URL}/payments/${id}`;
    const response = await customAxios.put(url, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    const url = `${PAYMENT_SERVICE_URL}/payments/${id}`;
    await customAxios.delete(url);
  },

  handover: async (data: HandoverRequest): Promise<any> => {
    const url = `${PAYMENT_SERVICE_URL}/payments/handover`;
    const response = await customAxios.post(url, data);
    return response.data;
  },

  getInvoicesByIds: async (invoiceIds: string[]): Promise<Invoice[]> => {
    if (!invoiceIds || invoiceIds.length === 0) {
      return [];
    }
    const queryParams = new URLSearchParams();
    invoiceIds.forEach((id) => queryParams.append('invoiceId', id));
    const url = `${PAYMENT_SERVICE_URL}/invoices?${queryParams.toString()}`;
    const response = await customAxios.get<InvoicesResponse>(url);  
    return response.data?.data?.items || [];
  },
};
