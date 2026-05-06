'use client';

import { useUsers } from '@/features/user-managment/users/hooks/useUsers';
import { DEFAULT_DEPTH_TOKEN, DEPTH_TOKENS } from '../_constants/user-hierarchy';
import type { DepthToken } from '../_types/user-hierarchy';

export const getDepthToken = (depth: number): DepthToken => {
  return DEPTH_TOKENS[depth] || DEFAULT_DEPTH_TOKEN;
};

export const useTopLevelUsers = (searchQuery: string) => {
  const params = searchQuery
    ? { search: searchQuery, nonPaginated: 'true' as const }
    : {
        reportingTo: '' as const,
        limit: 50,
        skip: 0,
        nonPaginated: 'true' as const,
      };

  const { users } = useUsers(params);
  const items = users.data?.data?.items ?? [];

  return { users, items };
};

export const useReportingUsers = (reportingTo: string) => {
  const { users } = useUsers({
    reportingTo,
    limit: 50,
    skip: 0,
    nonPaginated: 'true',
  });
  const items = users.data?.data?.items ?? [];

  return { users, items };
};


