'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export interface Collection {
  id: string;
  outletName: string;
  date: string;
  paymentType: string;
  invoiceAmount: number;
  collectionAmount: number;
  collectorName: string;
  warehouse: string;
  status: string;
  collectedBy: string;
  collectedAdmin: string;
  onView?: () => void;
}

export const columns: ColumnDef<Collection>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: 'outletName',
    header: 'Outlet Name',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'paymentType',
    header: 'Payment Type',
  },
  {
    accessorKey: 'invoiceAmount',
    header: 'Invoice Amount',
    cell: ({ row }) => row.getValue('invoiceAmount'),
  },
  {
    accessorKey: 'collectionAmount',
    header: 'Collection Amount',
    cell: ({ row }) => row.getValue('collectionAmount'),
  },
  {
    accessorKey: 'collectorName',
    header: 'Collector Name',
  },
  {
    accessorKey: 'warehouse',
    header: 'Warehouse',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'collectedBy',
    header: 'Collected By',
  },
  {
    accessorKey: 'collectedAdmin',
    header: 'Collected Admin',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Button variant="default" onClick={() => row.original.onView?.()}>
        View
      </Button>
    ),
  },
];

export const mockData: Collection[] = [
  {
    id: '1',
    outletName: 'Sk Store',
    date: '25 May 2025',
    paymentType: 'Cash',
    invoiceAmount: 1000,
    collectionAmount: 1000,
    collectorName: 'Vishwa',
    warehouse: 'Chennai',
    status: 'Partially',
    collectedBy: 'Admin',
    collectedAdmin: 'Surya',
    onView: () => {},
  },
];
