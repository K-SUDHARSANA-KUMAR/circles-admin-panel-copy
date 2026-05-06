import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Action } from '../util/types';
import { Trash2 } from 'lucide-react';

export interface PricingGroup {
  id?: string;
  groupId?: string;
  _id?: string;
  groupName: string;
  groupCode: string;
  description?: string;
  warehouse?: Array<{ warehouseId: string }>;
  productMappings?: Array<{ productId: string }>;
  productCount?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export const createPricingGroupColumns = (
  getActionsForPermissions: (pricingGroup: PricingGroup) => Action[],
  pageIndex: number,
  pageSize: number
): ColumnDef<PricingGroup>[] => [
  {
    accessorKey: 'groupName',
    header: 'Name',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('groupName')}</div>
    ),
  },
  {
    accessorKey: 'groupCode',
    header: 'Group Code',
    cell: ({ row }) => (
      <div className="text-sm font-mono">
        {row.getValue('groupCode')}
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div>
        {row.getValue('description') || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'productCount',
    header: 'Products',
    cell: ({ row }) => {
      const pricingGroup = row.original;
      // Use productCount from API if available, otherwise fallback to productMappings length
      const count = pricingGroup.productCount ?? pricingGroup.productMappings?.length;
      return (
        <div className="text-sm text-left">
          {count && count > 0 ? (
            <span className="text-gray-900">
              {count}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'warehouse',
    header: 'Warehouses',
    cell: ({ row }) => {
      const warehouse = row.getValue('warehouse') as Array<{ warehouseId: string }> | undefined;
      const count = warehouse?.length;
      return (
        <div className="text-sm text-left">
          {count && count > 0 ? (
            <span className="text-gray-900">
              {count}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => (
      new Date(row.getValue('createdAt')).toLocaleDateString()
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const pricingGroup = row.original;
      const actions = getActionsForPermissions(pricingGroup);
      
      return actions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => {
              return (
                <DropdownMenuItem
                  key={( pricingGroup.groupId ) + action.title}
                  className={` ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                  onClick={() => action.handleAction?.(pricingGroup)}
                >
                  <div className="flex items-center gap-2">
                    <span>{action.icon}</span>
                    <span>{action.title}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null;
    },
  },
];
