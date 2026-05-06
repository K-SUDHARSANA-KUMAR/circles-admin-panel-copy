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
  invoiceStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoicePdfs: string[];
  invoiceId: string;
  createdAt: string;
  updatedAt: string;
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

export interface UseInvoicesParams {
  outletId?: string;
  orderId?: string;
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
}
