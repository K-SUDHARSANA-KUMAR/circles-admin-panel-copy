'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NavKeys from '@/constants/navkeys';
import { formatUk, RANGE_LABELS, rangeParams, type Range } from '@/lib/uk-month';
import {
  fetchCollaboratorMembers,
  type CollaboratorMember,
  type CollaboratorSummary,
} from '@/services/collaborators.service';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  active: 'In the app',
  onboarding: 'Signing up',
  setup: 'Signing up',
  waitlisted: 'Waitlist',
  suspended: 'Suspended',
  banned: 'Banned',
};

function PayingBadge({ member }: { member: CollaboratorMember }) {
  if (member.paying) {
    return (
      <span className="font-semibold text-emerald-400">
        Paying{member.subscriptionPlan ? ` · ${member.subscriptionPlan}` : ''}
      </span>
    );
  }
  return <span className="text-zinc-500">Not paying</span>;
}

/** The people who signed up with one collaborator code, in the page's period. */
export function CollaboratorMembersDialog({
  collaborator,
  range,
  onClose,
}: {
  collaborator: CollaboratorSummary | null;
  range: Range;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CollaboratorMember[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may update the table (fast paging can overlap).
  const requestRef = useRef(0);
  const id = collaborator?.id;

  const load = useCallback(async () => {
    if (!id) return;
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCollaboratorMembers(id, {
        page,
        limit: PAGE_SIZE,
        ...rangeParams(range),
      });
      if (request !== requestRef.current) return;
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      if (request !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load the sign-ups');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [id, page, range]);

  useEffect(() => {
    setPage(1);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Dialog open={!!collaborator} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {collaborator?.name} · {collaborator?.code}
          </DialogTitle>
          <DialogDescription>
            People who signed up with this code · {RANGE_LABELS[range]} · {total} in total
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-zinc-500 text-xs">
            <IconRefresh size={18} className="animate-spin text-purple-400" />
            Loading...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-xs text-red-400">
            {error}
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-xs text-zinc-500">
            Nobody has signed up with this code in this period.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-[#18181b] bg-[#0c0c0e]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#18181b] bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Signed up (UK time)</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Membership</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b] text-xs">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`${NavKeys.Users}?id=${m.id}`}
                        className="font-semibold text-white hover:text-purple-300"
                      >
                        {m.name || `User ${m.id}`}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{formatUk(m.signedUpAt)}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {STATUS_LABELS[m.status] ?? m.status}
                    </td>
                    <td className="py-3 px-4">
                      <PayingBadge member={m} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 text-xs text-zinc-400">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
