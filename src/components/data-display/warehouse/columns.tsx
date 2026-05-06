'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatWithLeadingZero } from '@/lib/utils';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
  shortCode?: string;
  divisionId?: string;
  divisionName?: string;
  channelId?: string;
  channelName?: string;
  zoneId?: string;
  zoneName?: string;
  subZoneId?: string;
  subZoneName?: string;
  warehouseTypeId?: string;
  warehouseTypeName?: string;
  address: {
    streetAddress: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
  };
  onEdit?: () => void;
  onViewLogs?: () => void;
}

interface MasterRecordMaps {
  division: Record<string, MasterRecord>;
  channel: Record<string, MasterRecord>;
  zone: Record<string, MasterRecord>;
  subZone: Record<string, MasterRecord>;
  warehouseType: Record<string, MasterRecord>;
}

export const columns = (
  recordMaps?: MasterRecordMaps,
  currentPage: number = 0,
  pageSize: number = 10
): ColumnDef<Warehouse>[] => [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
    },
    {
      accessorKey: 'shortCode',
      header: 'Short Code',
      cell: ({ row }) => row.original.shortCode || '-',
    },
    {
      accessorKey: 'warehouseName',
      header: 'Warehouse Name',
    },
    {
      id: 'divisionId',
      header: 'Division',
      cell: ({ row }) => {
        const divisionId = row.original.divisionId;
        const divisionName = row.original.divisionName;

        // First try to get from record maps, then fallback to divisionName, then divisionId
        const mappedDivisionName = divisionId && recordMaps?.division?.[divisionId]?.divisionName;
        return mappedDivisionName || divisionName || divisionId || 'N/A';
      },
    },
    {
      id: 'channelId',
      header: 'Channel',
      cell: ({ row }) => {
        const channelId = row.original.channelId;
        const channelName = row.original.channelName;

        // First try to get from record maps, then fallback to channelName, then channelId
        const mappedChannelName = channelId && recordMaps?.channel?.[channelId]?.channelName;
        return mappedChannelName || channelName || channelId || 'N/A';
      },
    },
    {
      id: 'zoneId',
      header: 'Zone',
      cell: ({ row }) => {
        const zoneId = row.original.zoneId;
        const zoneName = row.original.zoneName;

        // First try to get from record maps, then fallback to zoneName, then zoneId
        const mappedZoneName = zoneId && recordMaps?.zone?.[zoneId]?.zoneName;
        return mappedZoneName || zoneName || zoneId || 'N/A';
      },
    },
    {
      id: 'subZoneId',
      header: 'Subzone',
      cell: ({ row }) => {
        // Handle both subZoneId and subzoneId field name variations
        const subZoneId = (row.original as any).subZoneId || (row.original as any).subzoneId;
        const subZoneName = row.original.subZoneName || (row.original as any).subzonename || (row.original as any).subZoneName;

        if (!subZoneId) {
          return 'N/A';
        }

        // Try to get from record maps - the map is keyed by the ID value
        const record = recordMaps?.subZone?.[subZoneId];
        if (record) {
          // Try different field name variations for the name
          const mappedSubZoneName =
            record.subZoneName ||
            (record as any).subzonename ||
            (record as any).subZoneName ||
            (record as any).name;

          if (mappedSubZoneName) {
            return mappedSubZoneName;
          }
        }

        // Fallback to subZoneName from warehouse data, then ID
        return subZoneName || subZoneId || 'N/A';
      },
    },
    {
      id: 'warehouseTypeId',
      header: 'Warehouse Type',
      cell: ({ row }) => {
        // Handle field name variations
        const warehouseTypeId =
          (row.original as any).warehouseTypeId ||
          (row.original as any).warehousetypeId ||
          (row.original as any).warehouseTypeid;
        const warehouseTypeName =
          row.original.warehouseTypeName ||
          (row.original as any).warehousetypeName ||
          (row.original as any).warehouseTypename;

        if (!warehouseTypeId) {
          return 'N/A';
        }

        // Try to get from record maps - the map is keyed by the ID value
        const record = recordMaps?.warehouseType?.[warehouseTypeId];
        if (record) {
          // Try different field name variations for the name
          const mappedWarehouseTypeName =
            record.warehouseTypeName ||
            (record as any).warehousetypeName ||
            (record as any).warehouseTypename ||
            (record as any).name;

          if (mappedWarehouseTypeName) {
            return mappedWarehouseTypeName;
          }
        }

        // Fallback to warehouseTypeName from warehouse data, then ID
        return warehouseTypeName || warehouseTypeId || 'N/A';
      },
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const address = row.getValue('address') as {
          streetAddress: string;
          location: string;
        };
        const fullAddress = `${address.streetAddress}`;
        const truncatedAddress =
          fullAddress.length > 30
            ? fullAddress.substring(0, 30) + '...'
            : fullAddress;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">{truncatedAddress}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{fullAddress}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="border-b border-neutral-200"
                onClick={() => row.original.onEdit?.()}
              >
                View & Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="border-b border-neutral-200"
                onClick={() => row.original.onViewLogs?.()}
              >
                Logs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

interface Pincode {
  _id: string;
  pincode: number;
  cityName: string;
  districtName: string;
  stateName: string;
  onEdit?: () => void;
  onViewLogs?: () => void;
}

export const pincodeColumns: ColumnDef<Pincode>[] = [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(row.index + 1),
  },
  {
    accessorKey: 'pincode',
    header: 'Pincode',
  },
  {
    accessorKey: 'cityName',
    header: 'City Name',
  },
  {
    accessorKey: 'districtName',
    header: 'District Name',
  },
  {
    accessorKey: 'stateName',
    header: 'State Name',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="border-b border-neutral-200"
              onClick={() => row.original.onEdit?.()}
            >
              View & Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="border-b border-neutral-200"
              onClick={() => row.original.onViewLogs?.()}
            >
              Logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export type { Warehouse, Pincode };
