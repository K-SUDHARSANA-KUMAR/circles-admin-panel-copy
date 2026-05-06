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
      <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
        {row.getValue('groupCode')}
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {row.getValue('description') || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'warehouse',
    header: 'Warehouses',
    cell: ({ row }) => {
      const warehouse = row.getValue('warehouse') as Array<{ warehouseId: string }> | undefined;
      const count = warehouse?.length || 0;
      return (
        <div className="text-sm">
          {count > 0 ? (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {count} warehouse{count !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-gray-400">No warehouses</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'productMappings',
    header: 'Products',
    cell: ({ row }) => {
      const productMappings = row.getValue('productMappings') as Array<{ productId: string }> | undefined;
      const count = productMappings?.length || 0;
      return (
        <div className="text-sm">
          {count > 0 ? (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              {count} product{count !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-gray-400">No products</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {new Date(row.getValue('createdAt')).toLocaleDateString()}
      </div>
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
                  className={`border-b border-neutral-200 ${action.showWarning ? 'focus:bg-red-100' : ''}`}
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
