"use client"

import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Action } from "../util/types"

export type MasterGroup = {
  groupId: string
  groupName: string
  displayName: string
}

export const createColumns = (getActionsForRow: (item: any) => Action[]):
  ColumnDef<MasterGroup>[] => {
  return [
    {
      id: "serialNumber",
      header: "S.No",
      cell: ({ row }) => {
        const index = row.index;
        return index < 9 ? `0${index + 1}` : `${index + 1}`;
      },
    },
    {
      accessorKey: "groupName",
      header: "Group Name",
    },
    {
      accessorKey: "displayName",
      header: "Display Name",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const actions = getActionsForRow(item);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map(action => {
                return <DropdownMenuItem
                  key={row.original.groupId + action.title}
                  className={`border-b border-neutral-200 ${action.showWarning ? 'focus:bg-red-100' : ''}`}
                  onClick={() => action.handleAction?.(item)}
                >
                  <div className='flex gap-2 items-center'>
                    <span>{action.icon}</span>
                    <span>{action.title}</span>
                  </div>
                </DropdownMenuItem>
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ]
};