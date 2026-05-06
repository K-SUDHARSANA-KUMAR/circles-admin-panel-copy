'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Edit, Trash2, Play, Pause } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

export interface PJPConfigTableData {
  _id: string;
  pjpConfigId: string;
  warehouseName: string;
  planFrequency: string;
  includeSundays: boolean;
  totalWorkingHoursInMins: number;
  breakHoursInMins: number;
  maxTravelDistancePerDay: number;
  optimizationRadius: number;
  outletActivityDurationInMins: number;
  MaxOutletCountPerDay: number;
  workingDays: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createColumns = (
  actions: string[]
): ColumnDef<PJPConfigTableData>[] => [
  {
    accessorKey: 'warehouseName',
    header: 'Warehouse ID',
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">{row.getValue('warehouseName') || 'N/A'}</div>
    ),
  },
  {
    accessorKey: 'planFrequency',
    header: 'Plan Frequency',
    cell: ({ row }) => {
      const frequency = row.getValue('planFrequency') as string;
      return (
        <Badge variant="secondary" className="capitalize">
          {frequency || 'N/A'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'totalWorkingHoursInMins',
    header: 'Working Hours',
    cell: ({ row }) => {
      const totalMins = row.getValue('totalWorkingHoursInMins') as number;
      if (!totalMins) return <div className="text-sm">N/A</div>;
      
      const hours = Math.floor(totalMins / 60);
      const minutes = totalMins % 60;
      return (
        <div className="text-sm">
          {hours}h {minutes}m
        </div>
      );
    },
  },
  {
    accessorKey: 'MaxOutletCountPerDay',
    header: 'Max Outlets/Day',
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('MaxOutletCountPerDay') || 'N/A'}</div>
    ),
  },
  {
    accessorKey: 'maxTravelDistancePerDay',
    header: 'Max Travel (km)',
    cell: ({ row }) => {
      const distance = row.getValue('maxTravelDistancePerDay') as number;
      return (
        <div className="text-sm">{distance || 'N/A'} {distance ? 'km' : ''}</div>
      );
    },
  },
  {
    accessorKey: 'workingDays',
    header: 'Working Days',
    cell: ({ row }) => {
      const days = row.getValue('workingDays') as number;
      return (
        <div className="text-sm">{days || 'N/A'} {days ? 'days' : ''}</div>
      );
    },
  },
  {
    accessorKey: 'includeSundays',
    header: 'Include Sundays',
    cell: ({ row }) => {
      const includeSundays = row.getValue('includeSundays') as boolean;
      return (
        <Badge variant={includeSundays ? 'success' : 'destructive'}>
          {includeSundays ? 'Yes' : 'No'}
        </Badge>
      );
    },
  },


  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const config = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
           
            
            {actions.includes('edit') && (
              <DropdownMenuItem onClick={() => handleEdit(config)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            
            {actions.includes('delete') && (
              <DropdownMenuItem 
                onClick={() => handleDelete(config)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Action handlers - these will be passed from the parent component
let handleView: (config: PJPConfigTableData) => void;
let handleEdit: (config: PJPConfigTableData) => void;
let handleDelete: (config: PJPConfigTableData) => void;
let handleActivate: (config: PJPConfigTableData) => void;
let handleDeactivate: (config: PJPConfigTableData) => void;

export const setActionHandlers = (handlers: {
  onView?: (config: PJPConfigTableData) => void;
  onEdit?: (config: PJPConfigTableData) => void;
  onDelete?: (config: PJPConfigTableData) => void;
  onActivate?: (config: PJPConfigTableData) => void;
  onDeactivate?: (config: PJPConfigTableData) => void;
}) => {
  if (handlers.onView) handleView = handlers.onView;
  if (handlers.onEdit) handleEdit = handlers.onEdit;
  if (handlers.onDelete) handleDelete = handlers.onDelete;
  if (handlers.onActivate) handleActivate = handlers.onActivate;
  if (handlers.onDeactivate) handleDeactivate = handlers.onDeactivate;
}; 