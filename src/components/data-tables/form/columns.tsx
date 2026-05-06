import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Form = {
  id: string;
  name: string;
  formId: string;
  createdAt?: string;
};

export const columns = (
  pageIndex: number,
  pageSize: number,
  handleEdit: (formId: string) => void,
  handleDownload: (formId: string) => void
): ColumnDef<Form>[] => {
  const baseColumns: ColumnDef<Form>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) => pageIndex * pageSize + row.index + 1,
    },
    {
      accessorKey: 'displayName',
      header: 'Form Name',
    },
    // Optionally, add createdAt if you have it in the future
  ];

  baseColumns.push({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const item = row.original;
      const actions = [
        {
          title: 'Edit',
          handleAction: handleEdit,
        },
        {
          title: 'Download',
          handleAction: handleDownload,
        },
      ];

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[150px] p-1">
            {actions.map((action, index) => (
              <DropdownMenuItem
                key={action.title}
                onClick={() => action.handleAction(item.formId)}
                className={`
                  cursor-pointer rounded-md px-2 py-1.5 text-sm transition-colors
                  hover:bg-muted
                  ${index !== actions.length - 1 ? 'border-b border-neutral-200' : ''}
                `}
              >
                {action.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });


  return baseColumns;
};
