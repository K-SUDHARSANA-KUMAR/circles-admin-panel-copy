'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical, Download, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatWithLeadingZero } from '@/lib/utils';
import { Action } from '../util/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface Invoice {
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

interface MasterRecordMaps {
  [key: string]: Record<string, any>;
}

export const createColumns = (
  getActionsForRow: (item: any) => Action[],
  currentPage: number = 0,
  pageSize: number = 10,
  recordMaps?: MasterRecordMaps,
  onDownload?: (invoice: Invoice) => void,
  downloadingInvoiceId?: string | null
): ColumnDef<Invoice>[] => {
  return [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'invoiceNo',
      header: 'Invoice No',
    },
    {
      accessorKey: 'outletName',
      header: 'Outlet Name',
    },
    {
      accessorKey: 'orderId',
      header: 'Order ID',
    },
    {
      accessorKey: 'invoiceDate',
      header: 'Invoice Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('invoiceDate'));
        return format(date, 'dd/MM/yyyy');
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('dueDate'));
        return format(date, 'dd/MM/yyyy');
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => {
        const amount = Number(row.getValue('totalAmount'));
        const fixed = amount.toFixed(2);
        const formatted = fixed.endsWith('.00')
          ? `₹${fixed.slice(0, -3)}`
          : `₹${fixed}`;
        return formatted;
      },
    },
    {
      accessorKey: 'invoiceStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('invoiceStatus') as string;
        return renderStatusBadge(status, StatusType.INVOICE);
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const actions = getActionsForRow(row.original);
        const invoice = row.original;

        return (
          <div className="flex items-center gap-2">
            {onDownload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => onDownload(invoice)}
                    tabIndex={0}
                    aria-label="Download invoice"
                  >
                    {downloadingInvoiceId === invoice.invoiceId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Download Invoice
                </TooltipContent>
              </Tooltip>
            )}
            {actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={action.handleAction}
                      className="cursor-pointer"
                    >
                      {action.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];
};
