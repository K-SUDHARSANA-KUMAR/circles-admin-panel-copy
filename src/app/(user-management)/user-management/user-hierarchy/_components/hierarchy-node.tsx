'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IconUser, IconUserStar } from '@tabler/icons-react';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { getDepthToken, useReportingUsers } from '../_hooks/useUserHierarchy';

type HierarchyNodeProps = {
  userId: string;
  name: string;
  roleName: string;
  depth: number;
  empCode?: string; 
};

export const HierarchyNode: React.FC<HierarchyNodeProps> = ({
  userId,
  name,
  roleName,
  depth,
  empCode,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const token = getDepthToken(depth);

  const handleToggleExpand = () => setIsExpanded((prev) => !prev);

  const handleBadgeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    window.location.href = `/user-management/users/create-user?mode=view&userId=${id}`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggleExpand}
        className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left transition-colors hover:bg-gray-50 cursor-pointer"
        aria-expanded={isExpanded}
        aria-label={`Toggle reports for ${name}`}
      >
        <div className="flex h-6 w-6 items-center justify-center">
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-300 ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            }`}
          />
        </div>

        <div className={`rounded-lg p-2 ${token.bg}`}>
          {depth <= 1 ? (
            <IconUserStar className={`h-4 w-4 ${token.icon}`} />
          ) : (
            <IconUser className={`h-4 w-4 ${token.icon}`} />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {/* Name + empCode/userId badge */}
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-foreground">{name}</span>

                {(empCode || userId) && (
                  <Badge
                    variant="secondary"
                    className="text-sm text-neutral-600 cursor-pointer hover:bg-neutral-100"
                    onClick={(e) => handleBadgeClick(e, userId)}
                  >
                    {empCode || userId}
                  </Badge>
                )}
              </div>

              <Badge variant="secondary" className="text-sm text-neutral-600">
                {roleName || '—'}
              </Badge>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && <ChildBranch reportingTo={userId} depth={depth + 1} />}
    </div>
  );
};

type ChildBranchProps = { reportingTo: string; depth: number };

const ChildBranch: React.FC<ChildBranchProps> = ({ reportingTo, depth }) => {
  const { users, items, managerInfo } = useReportingUsers(reportingTo);

  if (users.isLoading) {
    return (
      <div className="w-full">
        <Loading iconClassName="w-6 h-6" className="text-sm" text="Loading Reporting Users" />
      </div>
    );
  }

  if (users.isError) {
    return (
      <div className="w-full">
        <GenericError text="Failed to load reporting users." />
      </div>
    );
  }

 
  if (depth === 0 && managerInfo) {
    return (
      <div className="mt-2">
        <div className="space-y-2">
          <HierarchyNode
            key={managerInfo.managerUserId}
            userId={managerInfo.managerUserId}
            name={managerInfo.managerName}
            roleName={managerInfo.managerRoleName || ''}
            depth={0}
            empCode={
              managerInfo.managerEmployeeCode ||
              managerInfo.employeeCode ||
              managerInfo.empCode
            }
          />

          {/* Render manager’s direct reports */}
          {items.length > 0 && (
            <div className={`mt-2 ml-4 border-l-2 ${getDepthToken(0).border} pl-4`}>
              <div className="space-y-2">
                {items.map((user: any) => (
                  <HierarchyNode
                    key={user.userId}
                    userId={user.userId}
                    name={user.name}
                    roleName={user.roleName || ''}
                    depth={1}
                    empCode={user.employeeCode || user.empCode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    const token = getDepthToken(Math.max(depth - 1, 0));
    return (
      <div className={`mt-2 ${depth > 0 ? `ml-4 border-l-2 ${token.border} pl-4` : ''}`}>
        <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
          No Reporting Users
        </div>
      </div>
    );
  }

  // Normal branch rendering
  return (
    <div className={`mt-2 ${depth > 0 ? `ml-4 border-l-2 ${getDepthToken(Math.max(depth - 1, 0)).border} pl-4` : ''}`}>
      <div className="space-y-2">
        {items.map((user: any) => (
          <HierarchyNode
            key={user.userId}
            userId={user.userId}
            name={user.name}
            roleName={user.roleName || ''}
            depth={depth}
            empCode={user.employeeCode || user.empCode}
          />
        ))}
      </div>
    </div>
  );
};

export default HierarchyNode;