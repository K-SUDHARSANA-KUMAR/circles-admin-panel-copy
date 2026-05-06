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

interface Scheme {
  _id: string;
  schemeId: string;
  schemeName: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  validFrom: string;
  validTo: string;
  maxRewardPerInvoice: number;
  isExclusive: boolean;
  applicableTo: {
    warehouseIds: string[];
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

const getApprovalStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getConditionTypeLabel = (conditionType: string) => {
  switch (conditionType) {
    case 'combo':
      return 'Combo';
    case 'assorted':
      return 'Assorted';
    case 'invoice':
      return 'Invoice';
    case 'lineItem':
      return 'Line Item';
    case 'prorated':
      return 'Prorated';
    default:
      return conditionType;
  }
};

const getRewardTypeLabel = (rewardType: string) => {
  switch (rewardType) {
    case 'freeProduct':
      return 'Free Product';
    case 'discountPercent':
      return 'Discount %';
    case 'discountFixed':
      return 'Fixed Discount';
    case 'cashback':
      return 'Cashback';
    case 'loyaltyPoints':
      return 'Loyalty Points';
    default:
      return rewardType;
  }
};

export const columns: ColumnDef<Scheme>[] = [
  {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(row.index + 1),
  },
  {
    accessorKey: 'schemeName',
    header: 'Scheme Name',
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
      return getStatusBadge(status);
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
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
          <DropdownMenuItem
            className="border-b border-neutral-200"
            onClick={() => row.original.onViewApprovals?.()}
          >
            Approvals
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
