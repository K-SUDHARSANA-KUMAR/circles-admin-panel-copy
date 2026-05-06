'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatWithLeadingZero } from '@/lib/utils';
import { MasterRecord } from '@/features/master-managment/types/master.types';

export const createPincodeColumns = (
  pageIndex: number,
  pageSize: number,
  selectedPincodes: string[],
  onPincodeSelect: (pincode?: string, isSelected?: boolean) => void
): ColumnDef<MasterRecord>[] => [
  {
    id: 'select',
    header: ({ table }) => {
      const currentPagePincodes = table.getRowModel().rows.map(row => String(row.original.pincode));
      const allCurrentPageSelected = currentPagePincodes.every(pincode => selectedPincodes.includes(pincode));
      const someCurrentPageSelected = currentPagePincodes.some(pincode => selectedPincodes.includes(pincode));
      
      return (
        <Checkbox
          checked={allCurrentPageSelected}
          onCheckedChange={(value) => {
            currentPagePincodes.forEach(pincode => {
              onPincodeSelect(pincode, !!value);
            });
          }}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={selectedPincodes.includes(String(row.original.pincode))}
        onCheckedChange={(value) =>
          onPincodeSelect(String(row.original.pincode), !!value)
        }
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(pageIndex * pageSize + row.index + 1),
  },
  {
    id: 'pincode',
    accessorKey: 'pincode',
    header: 'Pincode',
    cell: ({ row }) => {
      const pincode = row.getValue('pincode') as number;
      return <span className="font-medium">{pincode}</span>;
    },
  },
  {
    id: 'area',
    accessorKey: 'area',
    header: 'Area',
  },
  {
    id: 'districtName',
    accessorKey: 'districtName',
    header: 'District',
  },
  {
    id: 'stateName',
    accessorKey: 'stateName',
    header: 'State',
  },
];
