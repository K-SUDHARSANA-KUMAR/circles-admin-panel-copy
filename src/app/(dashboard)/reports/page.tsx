'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingTableWrapper,
  ListingTableHead,
  ListingTh,
  ListingTableBody,
  ListingStatusBadge,
  ListingPagination,
  ListingLoadingRow,
  ListingEmptyRow,
  ListingErrorPanel,
  DetailPageContainer,
  DetailPageHeader,
} from '@/components/shared/listing-page';
import {
  IconFileSpreadsheet,
  IconUser,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconClock,
  IconNotebook,
  IconMessage,
  IconShield,
  IconNotes,
  IconBan,
  IconCircleCheck,
  IconCircleX,
  IconMail,
  IconPhone,
  IconCalendar,
  IconMessageReport,
  IconLoader,
} from '@tabler/icons-react';
import {
  fetchReports,
  fetchReportById,
  updateReportStatus,
  type Report,
} from '@/services/report.service';
import { toast } from 'sonner';

const ChatImage = ({ src }: { src: string }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <div 
        onClick={() => window.open(src, '_blank')}
        className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-zinc-500 w-[240px] h-[130px] my-1 text-center select-none cursor-pointer hover:bg-zinc-900/60 transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        <IconAlertCircle size={20} className="text-zinc-650 shrink-0" />
        <span className="text-[10px] font-bold text-zinc-400">Media Link Expired</span>
        <span className="text-[9px] text-zinc-500 underline decoration-zinc-600">Click to view in new tab</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Chat attachment"
      className="max-w-[240px] max-h-[180px] rounded-lg object-cover cursor-pointer border border-zinc-700/50 my-1 hover:scale-[1.01] transition-transform duration-200"
      onClick={() => window.open(src, '_blank')}
      onError={() => setHasError(true)}
    />
  );
};

const ChatPdf = ({ src }: { src: string }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const localUrl = URL.createObjectURL(pdfBlob);
      window.open(localUrl, '_blank');
    } catch (err) {
      console.error('Error loading PDF securely via Blob:', err);
      // Fallback: direct window.open if CORS or network block occurs
      window.open(src, '_blank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-3 px-3 py-2.5 my-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 disabled:opacity-75 disabled:cursor-wait transition-all hover:scale-[1.01] active:scale-[0.99] group/pdf cursor-pointer max-w-[280px] w-full text-left"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-950/30 border border-rose-900/40">
        {loading ? (
          <IconLoader size={18} className="text-rose-400 animate-spin" />
        ) : (
          <IconFileSpreadsheet size={18} className="text-rose-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-zinc-200 truncate">PDF Document</p>
        <p className="text-[9px] text-zinc-500 group-hover/pdf:text-zinc-400 transition-colors">
          {loading ? 'Opening securely...' : 'Tap to view securely'}
        </p>
      </div>
    </button>
  );
};

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailId = searchParams.get('id');

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'REJECTED'>('ALL');

  // Detail view states
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Ref for the chat container to scroll it locally
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat history to the bottom when detail panel finishes loading
  useEffect(() => {
    if (selectedReport && selectedReport.messages && selectedReport.messages.length > 0) {
      // Small timeout to allow DOM to render
      const timer = setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [selectedReport]);

  // Load all reports
  const loadReports = useCallback(async (pageNum = currentPage, status = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchReports({
        page: pageNum,
        limit: itemsPerPage,
        status: status === 'ALL' ? undefined : status,
      });
      setReports(response.items);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      const msg = err.message || 'Failed to load reports';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    loadReports(currentPage, statusFilter);
  }, [currentPage, statusFilter, loadReports]);

  const prevFilterRef = useRef(statusFilter);
  useEffect(() => {
    if (prevFilterRef.current !== statusFilter) {
      prevFilterRef.current = statusFilter;
      setCurrentPage(1);
    }
  }, [statusFilter]);

  // Load selected report details
  const loadReportDetails = async (id: string) => {
    setSelectedReportId(id);
    setLoadingDetail(true);
    setAdminNotes('');
    try {
      const report = await fetchReportById(id);
      setSelectedReport(report);
      if (report.adminNotes) setAdminNotes(report.adminNotes);
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve report details');
      setSelectedReportId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (detailId) {
      loadReportDetails(detailId);
    } else {
      setSelectedReportId(null);
      setSelectedReport(null);
    }
  }, [detailId]);

  const handleUpdateStatus = async (status: 'RESOLVED' | 'REJECTED' | 'RESOLVED_BLOCK') => {
    if (!selectedReportId) return;
    setActionLoading(true);
    try {
      const updated = await updateReportStatus(selectedReportId, {
        status,
        adminNotes: adminNotes.trim() || undefined,
      });
      setSelectedReport(updated);
      toast.success(`Report ${status.toLowerCase().replace('_', ' ')} successfully`);
      loadReports(currentPage, statusFilter);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update report status');
    } finally {
      setActionLoading(false);
    }
  };

  const mapStatusToVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'pending';
      case 'RESOLVED': return 'active';
      case 'REJECTED': return 'rejected';
      default: return 'inactive';
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getStatusBadge = (status: string) => {
    if (status === 'PENDING') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/30 border border-amber-900/40 text-amber-400 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Pending
      </span>
    );
    if (status === 'RESOLVED') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Resolved
      </span>
    );
    if (status === 'REJECTED') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950/30 border border-red-900/40 text-rose-400 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Rejected
      </span>
    );
    return null;
  };

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (selectedReportId) {
    return (
      <DetailPageContainer className="pb-12 animate-in fade-in duration-300">
        <DetailPageHeader
          icon={IconMessageReport}
          title={selectedReport ? `Report Details — ${selectedReport.id.slice(0, 8).toUpperCase()}` : 'Report Details'}
          subtitle={selectedReport ? `Filed on ${formatDate(selectedReport.createdAt)}` : 'Loading...'}
          onBack={() => {
            setSelectedReportId(null);
            setSelectedReport(null);
            router.push('/reports');
          }}
          backLabel="Back to Reports List"
          trailing={
            selectedReport ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Status:</span>
                {getStatusBadge(selectedReport.status)}
              </div>
            ) : undefined
          }
        />

        {loadingDetail || !selectedReport ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-800 border-t-[#d8b4fe]" />
            <p className="text-xs text-zinc-500 font-medium">Retrieving report details...</p>
          </div>
        ) : (
          <>
            {/* ── Top 3 Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

              {/* Card 1: Report Summary */}
              <Card className="border-[#18181b] bg-[#09090b] shadow-xl flex flex-col justify-between">
                <div>
                  <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                    <IconNotes size={16} className="text-[#d8b4fe]" />
                    <div>
                      <CardTitle className="text-xs font-bold text-white">Report Summary</CardTitle>
                      <CardDescription className="text-[9px] text-zinc-500 mt-0.5">
                        Complaint classification and timeline
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3.5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                        Reason Category
                      </span>
                      <span className="font-bold text-[#d8b4fe] text-xs px-2.5 py-1 bg-[#1c122c]/40 border border-[#3b1a60]/30 rounded-md">
                        {selectedReport.reasonCode}
                      </span>
                    </div>
                    {selectedReport.reasonText && (
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                          User Description
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed italic">
                          "{selectedReport.reasonText}"
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 border-t border-[#18181b]/60 pt-3">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                          Date Filed
                        </span>
                        <span className="text-[11px] text-zinc-300 block mt-0.5 font-mono">
                          {formatDate(selectedReport.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Admin notes display (read-only if resolved/rejected) */}
                {selectedReport.adminNotes && (
                  <div className="p-5 border-t border-[#18181b]/60 bg-zinc-950/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Admin Notes
                    </span>
                    <div className="text-[11px] text-zinc-400 italic">
                      "{selectedReport.adminNotes}"
                    </div>
                  </div>
                )}
              </Card>

              {/* Card 2: Reporter Profile */}
              <Card className="border-[#18181b] bg-[#09090b] shadow-xl">
                <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <IconUser size={12} className="text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-white">Reporter Profile</CardTitle>
                    <CardDescription className="text-[9px] text-zinc-500 mt-0.5">
                      Complaining party details
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #18181b, #27272a)' }}
                    >
                      {selectedReport.reporter?.profilePhoto ? (
                        <img src={selectedReport.reporter.profilePhoto} alt="reporter" className="w-full h-full object-cover" />
                      ) : (
                        (selectedReport.reporter?.firstName?.charAt(0) ?? 'R').toUpperCase()
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {selectedReport.reporter?.firstName
                          ? `${selectedReport.reporter.firstName} ${selectedReport.reporter.lastName ?? ''}`.trim()
                          : 'Unknown Reporter'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-[#18181b]/60 pt-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconMail size={12} className="text-zinc-600 shrink-0" />
                      <span className="truncate">{selectedReport.reporter?.email ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconPhone size={12} className="text-zinc-600 shrink-0" />
                      <span>{selectedReport.reporter?.phone ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconCalendar size={12} className="text-zinc-600 shrink-0" />
                      <span>
                        Joined {selectedReport.reporter?.createdAt
                          ? new Date(selectedReport.reporter.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Reported User Profile */}
              <Card className="border-[#18181b] bg-[#09090b] shadow-xl">
                <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <IconShield size={12} className="text-[#d8b4fe]" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-white">Reported User Profile</CardTitle>
                    <CardDescription className="text-[9px] text-zinc-500 mt-0.5">
                      Subject of complaint and history
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#d8b4fe] shrink-0 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #2d124d, #09090b)', border: '1px solid #3b1a60' }}
                      >
                        {selectedReport.reportedUser?.profilePhoto ? (
                          <img src={selectedReport.reportedUser.profilePhoto} alt="reported" className="w-full h-full object-cover" />
                        ) : (
                          (selectedReport.reportedUser?.firstName?.charAt(0) ?? 'U').toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {selectedReport.reportedUser?.firstName
                            ? `${selectedReport.reportedUser.firstName} ${selectedReport.reportedUser.lastName ?? ''}`.trim()
                            : 'Unknown User'}
                        </span>
                      </div>
                    </div>
                    <div>
                      {selectedReport.reportedUser?.status === 'blocked' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/20 border border-red-900/30 text-rose-400 text-[10px] font-semibold">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/20 border border-cyan-900/30 text-cyan-400 text-[10px] font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#18181b]/60 pt-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconMail size={12} className="text-zinc-600 shrink-0" />
                      <span className="truncate">{selectedReport.reportedUser?.email ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconPhone size={12} className="text-zinc-600 shrink-0" />
                      <span>{selectedReport.reportedUser?.phone ?? '—'}</span>
                    </div>
                  </div>

                  {/* Reliability Score */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">Reliability Score</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        (selectedReport.reportedUser?.reliabilityScore ?? 80) >= 80
                          ? 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-[10px] font-semibold'
                          : (selectedReport.reportedUser?.reliabilityScore ?? 80) >= 50
                          ? 'bg-amber-950/30 border border-amber-900/40 text-amber-400 text-[10px] font-semibold'
                          : 'bg-red-950/30 border border-red-900/40 text-rose-400 text-[10px] font-semibold'
                      }`}>
                        {selectedReport.reportedUser?.reliabilityScore ?? 80}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (selectedReport.reportedUser?.reliabilityScore ?? 80) >= 80
                            ? 'bg-emerald-500'
                            : (selectedReport.reportedUser?.reliabilityScore ?? 80) >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${selectedReport.reportedUser?.reliabilityScore ?? 80}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Evidence Log (full width) ── */}
            <Card className="border-[#18181b] bg-[#09090b] shadow-xl mt-6">
              <CardHeader className="border-b border-[#18181b] py-4 px-6 flex flex-row items-center gap-2">
                <IconMessage size={16} className="text-[#d8b4fe]" />
                <div>
                  <CardTitle className="text-sm font-bold text-white">Evidence Log</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Messages and media sent prior to report submittal
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {!selectedReport.messages || selectedReport.messages.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                    <IconMessage size={28} className="text-zinc-600" />
                    <p className="text-xs font-semibold text-zinc-400">No Chat History Attached</p>
                    <p className="text-[10px] text-zinc-600 max-w-[280px]">
                      No conversation logs were submitted with this report.
                    </p>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Recent Chat Log
                    </span>
                    <div ref={chatContainerRef} className="border border-zinc-800 bg-[#060608] rounded-xl p-4 space-y-3 max-h-[480px] overflow-y-auto">
                      {selectedReport.messages.slice(-20).map((msg) => {
                        const isReporter = msg.senderId === selectedReport.reporter?.id;
                        const displayName = msg.senderName || (isReporter
                          ? `${selectedReport.reporter?.firstName ?? 'Reporter'} ${selectedReport.reporter?.lastName ?? ''}`.trim()
                          : `${selectedReport.reportedUser?.firstName ?? 'Reported User'} ${selectedReport.reportedUser?.lastName ?? ''}`.trim());
                        return (
                          <div
                            key={msg.messageId}
                            className={`flex flex-col max-w-[75%] ${isReporter ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              <span className="text-[10px] font-semibold text-zinc-400">{displayName}</span>
                              <span className="text-[9px] text-zinc-600">
                                ({isReporter ? 'Reporter' : 'Reported'})
                              </span>
                            </div>
                            <div
                              className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${isReporter
                                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm'
                                  : 'bg-[#1c122c] border border-[#3b1a60]/30 text-zinc-100 rounded-tr-sm'
                                }`}
                            >
                              {(() => {
                                const textLower = (msg.text || '').toLowerCase();
                                const urlPath = textLower.split('?')[0];
                                const isVideo = msg.messageType === 'video' || /\.(mp4|mov|webm|avi)$/i.test(urlPath);
                                const isPdf = msg.messageType === 'pdf' || (msg.messageType === 'file' && /\.pdf$/i.test(urlPath)) || /\.pdf$/i.test(urlPath);
                                const isImage = msg.messageType === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(urlPath);

                                if (isImage) {
                                  return (
                                    <ChatImage src={msg.text} />
                                  );
                                }
                                if (isVideo) {
                                  return (
                                    <div className="my-1 flex items-center justify-center w-[240px] h-[180px] bg-black/60 rounded-lg border border-zinc-800/80 overflow-hidden">
                                      <video
                                        src={msg.text}
                                        controls
                                        preload="metadata"
                                        className="w-full h-full object-contain"
                                      >
                                        Your browser does not support the video tag.
                                      </video>
                                    </div>
                                  );
                                }
                                if (isPdf) {
                                  return (
                                    <ChatPdf src={msg.text} />
                                  );
                                }
                                if (msg.messageType === 'url') {
                                  return (
                                    <a
                                      href={msg.text}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline text-purple-300 hover:text-purple-200 break-all"
                                    >
                                      {msg.text}
                                    </a>
                                  );
                                }
                                return msg.text;
                              })()}
                            </div>
                            <span className="text-[9px] text-zinc-600 mt-1 px-1">
                              {formatDate(msg.timestamp)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Admin Notes & Action Panel (below Evidence Log) ── */}
            <Card className="border-[#18181b] bg-[#09090b] shadow-xl mt-6">
              <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                <IconNotebook size={16} className="text-[#d8b4fe]" />
                <div>
                  <CardTitle className="text-xs font-bold text-white">Admin Notes & Actions</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Record verification findings and finalize report status
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {selectedReport.status === 'PENDING' ? (
                  <>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Record verification findings, context details, or rejection reasons..."
                      className="bg-zinc-900 border-zinc-800 text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-[#d8b4fe] min-h-[80px] max-h-[120px] resize-none w-full"
                      disabled={actionLoading}
                    />

                    {/* Action Buttons */}
                    <div className="border-t border-[#18181b] pt-4 flex justify-end items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus('REJECTED')}
                        disabled={actionLoading}
                        className="h-9 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white px-5 rounded-lg flex items-center gap-1.5 transition-all duration-200"
                      >
                        <IconCircleX size={14} />
                        Reject Report
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        disabled={actionLoading}
                        className="h-9 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-[#3b1a60]/50 text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300 px-5 rounded-lg flex items-center gap-1.5 transition-all duration-200"
                      >
                        <IconCircleCheck size={14} />
                        Resolve Report
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus('RESOLVED_BLOCK')}
                        disabled={actionLoading}
                        className="h-9 text-xs font-bold uppercase tracking-wider bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 px-5 rounded-lg flex items-center gap-1.5 transition-all duration-200"
                      >
                        <IconBan size={14} />
                        Resolve & Block User
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-lg">
                    <IconAlertCircle size={14} className="text-zinc-500" />
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Workflow closed — status is <strong>{selectedReport.status.toLowerCase()}</strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </DetailPageContainer>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <ListingPageContainer className="font-sans">
      <ListingSectionHeader
        icon={IconAlertCircle}
        title="User Reports & Moderation"
        subtitle={`${totalItems} reports filed by users`}
      />

      <ListingToolbar
        countLabel={`${totalItems} Reports`}
        showCount={!loading}
        onRefresh={() => loadReports()}
        refreshDisabled={loading}
        refreshLoading={loading}
        leadingActions={
          <div className="flex bg-[#030303] border border-[#18181b] p-1 rounded-xl">
            {(['ALL', 'PENDING', 'RESOLVED', 'REJECTED'] as const).map((tab) => {
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${isActive
                      ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        }
      />

      <ListingTableWrapper
        footer={
          <ListingPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemLabel="reports"
            onFirst={() => setCurrentPage(1)}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            onLast={() => setCurrentPage(totalPages)}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        }
      >
        <ListingTableHead>
          <ListingTh>Reporter</ListingTh>
          <ListingTh>Reported User</ListingTh>
          <ListingTh>Reason Category</ListingTh>
          <ListingTh>Filed Date</ListingTh>
          <ListingTh>Status</ListingTh>
          <ListingTh align="right">Actions</ListingTh>
        </ListingTableHead>

        <ListingTableBody>
          {loading ? (
            <ListingLoadingRow colSpan={6} message="Retrieving user moderation reports..." />
          ) : error ? (
            <tr>
              <td colSpan={6} className="p-8">
                <ListingErrorPanel title="Unable to Load Reports" message={error} onRetry={() => loadReports()} />
              </td>
            </tr>
          ) : reports.length === 0 ? (
            <ListingEmptyRow
              colSpan={6}
              icon={IconFileSpreadsheet}
              title="No Reports Found"
              description="No reports match the active status filter criteria."
            />
          ) : (
            reports.map((report) => (
              <tr
                key={report.id}
                onClick={() => loadReportDetails(report.id)}
                className="group hover:bg-[#0c0c0e] transition-colors duration-200 cursor-pointer border-b border-[#18181b]/40"
              >
                {/* Reporter */}
                <td className="py-4 px-12 text-sm font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 overflow-hidden">
                      {report.reporter?.profilePhoto
                        ? <img src={report.reporter.profilePhoto} alt="reporter" className="h-full w-full object-cover" />
                        : <IconUser size={14} />}
                    </div>
                    <p className="text-zinc-200">
                      {report.reporter?.firstName
                        ? `${report.reporter.firstName} ${report.reporter.lastName || ''}`.trim()
                        : 'Unknown User'}
                    </p>
                  </div>
                </td>

                {/* Reported User */}
                <td className="py-4 px-12 text-sm font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-950/40 border border-red-900/30 text-rose-400 overflow-hidden">
                      {report.reportedUser?.profilePhoto
                        ? <img src={report.reportedUser.profilePhoto} alt="reported" className="h-full w-full object-cover" />
                        : <IconUser size={14} />}
                    </div>
                    <p className="text-rose-200">
                      {report.reportedUser?.firstName
                        ? `${report.reportedUser.firstName} ${report.reportedUser.lastName || ''}`.trim()
                        : 'Unknown User'}
                    </p>
                  </div>
                </td>

                {/* Reason */}
                <td className="py-4 px-12 text-sm text-zinc-300">
                  <span className="font-bold text-zinc-400 text-xs px-2 py-1 bg-zinc-900 border border-zinc-850 rounded-md">
                    {report.reasonCode}
                  </span>
                </td>

                {/* Filed Date */}
                <td className="py-4 px-12 text-sm text-zinc-400 font-mono">
                  {new Date(report.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>

                {/* Status */}
                <td className="py-4 px-12 text-sm">
                  <ListingStatusBadge variant={mapStatusToVariant(report.status)} label={report.status} />
                </td>

                {/* Action */}
                <td className="py-4 px-12 text-right text-sm">
                  <Button
                    variant="link"
                    className="text-xs font-bold text-[#d8b4fe] hover:text-[#c084fc] p-0 h-auto"
                    onClick={(e) => { e.stopPropagation(); loadReportDetails(report.id); }}
                  >
                    View & Action
                  </Button>
                </td>
              </tr>
            ))
          )}
        </ListingTableBody>
      </ListingTableWrapper>
    </ListingPageContainer>
  );
}
