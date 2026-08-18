'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchVenueAttendees,
  VenueAttendee,
} from '@/services/venue.service';
import {
  IconUserCheck,
  IconRefresh,
  IconCalendar,
  IconMapPin,
  IconUser,
} from '@tabler/icons-react';

interface VenueAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string | null;
  venueName: string;
}

export function VenueAttendeesModal({
  isOpen,
  onClose,
  venueId,
  venueName,
}: VenueAttendeesModalProps) {
  const [attendees, setAttendees] = useState<VenueAttendee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen || !venueId) return;

    async function loadAttendees() {
      setLoading(true);
      try {
        const res = await fetchVenueAttendees(venueId!, page, 20);
        setAttendees(res.items);
        setTotal(res.total);
      } catch (err) {
        console.error('Failed to load attendees:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAttendees();
  }, [isOpen, venueId, page]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#09090b] border border-[#18181b] text-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-[#18181b] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300">
                <IconUserCheck size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Venue Check-In History
                </DialogTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  <span className="text-purple-300 font-semibold">{venueName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/50">
                {total} Total Attendees
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500">
              <IconRefresh size={28} className="animate-spin text-purple-400" />
              <p className="text-xs">Fetching check-in logs...</p>
            </div>
          ) : attendees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-600">
                <IconUserCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-300">No Check-Ins Yet</p>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                  No users have checked in at this venue for a Live Moment yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#18181b] bg-[#0c0c0e]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#18181b] bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Live Moment</th>
                    <th className="py-3 px-4">Checked-In At</th>
                    <th className="py-3 px-4 text-right">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181b] text-xs">
                  {attendees.map((item) => {
                    const formattedTime = item.checkedInAt
                      ? new Date(item.checkedInAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '—';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {item.profilePhoto ? (
                              <img
                                src={item.profilePhoto}
                                alt={item.userName}
                                className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-300">
                                <IconUser size={16} />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white">
                                {item.userName}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <p className="text-zinc-300 font-medium line-clamp-1">
                            {item.momentText || 'Live Moment'}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <IconCalendar size={13} className="text-zinc-500" />
                            <span>{formattedTime}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                            <IconMapPin size={11} />
                            {item.distanceMeters != null
                              ? `${item.distanceMeters}m`
                              : '0m'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
