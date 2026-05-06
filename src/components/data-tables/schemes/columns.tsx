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
import { formatWithLeadingZero } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PERMISSIONS, MENU_RIGHTS } from '@/constants/permissions.constant';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface Scheme {
  _id: string;
  schemeId: string;
  schemeName: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'IN_REVIEW' | 'PENDING';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  validFrom: string;
  validTo: string;
  maxRewardPerInvoice: number;
  isExclusive: boolean;
  applicableTo: {
    warehouseIds: Array<{
      warehouseId: string;
      warehouseName: string;
    }>;
    outletIds: string[];
    productIds: string[];
    brandIds: string[];
    categoryIds: string[];
    subcategoryIds: string[];
  };
  conditions: Array<{
    conditionType: 'combo' | 'assorted' | 'invoice' | 'lineItem' | 'prorated';
    priority: number;
    criteria: any;
    reward: {
      type: 'freeProduct' | 'discountPercent' | 'discountFixed' | 'cashback' | 'loyaltyPoints';
      value?: number;
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
      maxRewardAmount?: number;
      maxApplications?: number;
    };
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  onEdit?: () => void;
  onViewLogs?: () => void;
  onStatusChange?: (status: 'DRAFT' | 'ACTIVE' | 'INACTIVE') => void;
  onViewApprovals?: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'DRAFT':
      return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
    case 'INACTIVE':
      return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const createColumns = (
  currentPage: number = 0,
  pageSize: number = 10,
  permission?: any
) => {
  return [
     {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
  },
  {
    accessorKey: 'schemeName',
    header: 'Scheme Name',
  },
  {
    id: 'warehouse',
    header: 'Warehouse',
    cell: ({ row }) => {
      const applicableTo = row.original.applicableTo;
      if (
        !applicableTo?.warehouseIds ||
        !Array.isArray(applicableTo.warehouseIds) ||
        applicableTo.warehouseIds.length === 0
      ) {
        return <span className="text-muted-foreground">-</span>;
      }

      const warehouseNames = applicableTo.warehouseIds
        .map((warehouse: any) => {
          if (warehouse && typeof warehouse === 'object') {
            if ('warehouseName' in warehouse && warehouse.warehouseName) {
              return String(warehouse.warehouseName).trim();
            }
            return '';
          }
          if (typeof warehouse === 'string') {
            return warehouse.trim();
          }
          return '';
        })
        .filter((name: string) => name && name.length > 0);

      if (warehouseNames.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      if (warehouseNames.length === 1) {
        return <span>{warehouseNames[0]}</span>;
      }

      const [firstWarehouseName, ...restWarehouses] = warehouseNames;
      const remainingCount = restWarehouses.length;

      return (
        <span>
          {firstWarehouseName}{' '}
          <span className="text-xs text-blue-600 font-medium">
            +{remainingCount} more
          </span>
        </span>
      );
    },
  },
  {
    accessorKey: 'validFrom',
    header: 'Valid From',
    cell: ({ row }) => {
      const date = row.getValue('validFrom') as string;
      return date ? format(new Date(date), 'dd/MM/yyyy') : '-';
    },
  },
  {
    accessorKey: 'validTo',
    header: 'Valid To',
    cell: ({ row }) => {
      const date = row.getValue('validTo') as string;
      return date ? format(new Date(date), 'dd/MM/yyyy') : '-';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return renderStatusBadge(status, StatusType.SCHEME);
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const actions = [];
      
      // Add View & Edit action if user has edit permission
      if (permission?.has(PERMISSIONS.SCHEMES, MENU_RIGHTS.EDIT)) {
        actions.push(
          <DropdownMenuItem
            key="edit"
            className="border-b border-neutral-200"
            onClick={() => row.original.onEdit?.()}
          >
            View & Edit
          </DropdownMenuItem>
        );
      }
      
      // Add Logs action if user has log permission
      if (permission?.has(PERMISSIONS.SCHEMES, MENU_RIGHTS.LOG)) {
        actions.push(
          <DropdownMenuItem
            key="logs"
            className="border-b border-neutral-200"
            onClick={() => row.original.onViewLogs?.()}
          >
            Logs
          </DropdownMenuItem>
        );
      }
      
      // Add Approvals action if user has view permission (approvals are viewable by all who can view schemes)
      if (permission?.has(PERMISSIONS.SCHEMES, MENU_RIGHTS.VIEW)) {
        actions.push(
          <DropdownMenuItem
            key="approvals"
            onClick={() => row.original.onViewApprovals?.()}
          >
            Approvals
          </DropdownMenuItem>
        );
      }

      // If no actions are available, don't show the dropdown
      if (actions.length === 0) {
        return null;
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ] as ColumnDef<Scheme>[];
};

