'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { collectionsApi, Collection } from '@/features/dashboard/collections/api/collections';
import { useInvoicesByIds } from '@/features/dashboard/collections/hooks/useCollections';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface CollectionViewProps {
  className?: string;
}

export const CollectionView = ({ className }: CollectionViewProps) => {
  const [collection, setCollection] = useState<Collection | null>(null);
  
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');

  const hasFetchedCollectionRef = useRef(false);

  useEffect(() => {
    const fetchCollectionDetails = async () => {
      if (!paymentId) return;
      if (hasFetchedCollectionRef.current) return;
      hasFetchedCollectionRef.current = true;
      const data = await collectionsApi.getExpandedDetails(paymentId);
      setCollection(data);
    };

    fetchCollectionDetails();
  }, [paymentId]);

  // Fetch invoices using React Query hook
  const invoiceIds = collection?.invoices ? undefined : collection?.invoiceIds;
  const { data: fetchedInvoices, isLoading: isLoadingInvoices } = useInvoicesByIds(invoiceIds);
  // Determine which invoice data to use
  const invoice = collection?.invoices || fetchedInvoices || null;
  


  // Define columns for the invoice details table
  const invoiceColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'sno',
      header: 'S.No',
      cell: ({ row }) => row.index + 1,
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
        const date = row.getValue('invoiceDate') as string;
        return date ? format(new Date(date), 'dd MMM yyyy') : 'N/A';
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = row.getValue('dueDate') as string;
        return date ? format(new Date(date), 'dd MMM yyyy') : 'N/A';
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => {
        const amount = row.getValue('totalAmount') as number;
        return amount ? `₹${amount.toLocaleString()}` : 'N/A';
      },
    },
    {
      accessorKey: 'invoiceStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('invoiceStatus') as string;
        return (
          <Badge 
            variant={status === 'completed' ? 'default' : 'secondary'}
            className={status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
          >
            {status || 'N/A'}
          </Badge>
        );
      },
    },
  ];


  // Prepare data for DataTable
  const invoiceTableData = invoice ? (Array.isArray(invoice) ? invoice : [invoice]) : [];
  


  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Payment Details */}
      <div className="rounded-lg bg-white p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
          <p className="text-sm text-gray-500 mt-1">Payment information and status</p>
        </div>
        
        {collection ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="space-y-4">
                {/* Payment ID */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Payment ID</span>
                  <span className="text-sm font-mono text-gray-900">{collection.paymentId || 'N/A'}</span>
                </div>

                {/* Payment Date */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Payment Date</span>
                  <span className="text-sm text-gray-900">
                    {collection.paymentDate ? format(new Date(collection.paymentDate), 'dd MMM yyyy, HH:mm') : 'N/A'}
                  </span>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Amount</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {collection.currency} {collection.amount?.toLocaleString() || 'N/A'}
                  </span>
                </div>

                {/* Payment Mode */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Payment Mode</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 ${
                      collection.paymentMode === 'cash' ? 'bg-green-50 text-green-700 border-green-200' :
                      collection.paymentMode === 'handover' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {collection.paymentMode === 'handover' ? 'HANDOVER' : collection.paymentMode || 'N/A'}
                  </Badge>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Status</span>
                  <Badge 
                    className={`text-xs px-2 py-1 ${
                      collection.status === 'completed' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : collection.status === 'failed'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    {collection.status || 'N/A'}
                  </Badge>
                </div>

                {/* Total Refund Amount */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Total Refund Amount</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {collection.currency} {collection.totalRefundAmount?.toLocaleString() || '0'}
                  </span>
                </div>

                {/* Remarks */}
                {collection.remarks && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Remarks</span>
                    <span className="text-sm text-gray-900 text-right max-w-md">{collection.remarks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Details</h3>
            <p className="text-gray-500">No payment details available for this collection.</p>
          </div>
        )}
      </div>

      {/* Collection Flow */}
      <div className="rounded-lg bg-white p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Collection Flow</h2>
          <p className="text-sm text-gray-500 mt-1">Track the payment collection journey</p>
        </div>
        
        {collection?.collections && collection.collections.length > 0 ? (
          <div className="space-y-6">
            {collection.collections.map((item, index) => (
              <div key={index} className="relative">
                {/* Connection Line */}
                {index < ((collection?.collections?.length ?? 0) - 1) && (
                  <div className="absolute left-6 top-16 w-0.5 h-8 bg-gray-300"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{item.seq}</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-1 ${
                            item.mode === 'cash' ? 'bg-green-50 text-green-700 border-green-200' :
                            item.mode === 'handover' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {item.mode === 'handover' ? 'HANDOVER' : item.mode}
                        </Badge>
                        <Badge 
                          className={`text-xs px-2 py-1 ${
                            item.status === 'completed' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(item.collectedAt), 'dd MMM yyyy, HH:mm')}
                      </div>
                    </div>
                    
                    {/* Transfer Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      {/* From */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600">From</span>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{item.from.name || item.from.id}</div>
                          {item.from.phoneNumber && (
                            <div className="text-sm text-gray-500">{item.from.phoneNumber}</div>
                          )}
                          {/* employeeCode is not present on 'from' type */}
                        </div>
                      </div>
                      
                      {/* To */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600">To</span>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{item.to.name || item.to.id}</div>
                          {item.to.phoneNumber && (
                            <div className="text-sm text-gray-500">{item.to.phoneNumber}</div>
                          )}
                          {(item.to as any).employeeCode && (
                            <div className="text-xs text-gray-400">Code: {item.to.employeeCode}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount and Remarks */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Amount: </span>
                          <span className="font-semibold text-gray-900">
                            {collection.currency} {item.amount}
                          </span>
                        </div>
                      </div>
                      {item.remarks && (
                        <div className="text-sm text-gray-600 max-w-md text-right">
                          <span className="text-gray-500">Note: </span>
                          {item.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Collection Flow</h3>
            <p className="text-gray-500">No collection flow data available for this payment.</p>
          </div>
        )}
      </div>

      {/* Invoice Details */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Invoice Details
        </div>
        {invoice && invoiceTableData.length > 0 ? (
          <DataTable
            columns={invoiceColumns}
            data={invoiceTableData}
            tableId="invoice-details-table"
          />
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoice Details</h3>
            <p className="text-gray-500">
              {collection?.invoiceIds && collection.invoiceIds.length > 0 
                ? `Found ${collection.invoiceIds.length} invoice(s) but unable to load details.`
                : 'No invoices associated with this payment.'
              }
            </p>
            {collection?.invoiceIds && collection.invoiceIds.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                <p>Invoice IDs: {collection.invoiceIds.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
