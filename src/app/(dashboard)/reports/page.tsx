'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
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
} from '@/components/shared/listing-page';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  IconFileSpreadsheet,
  IconUser,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconClock,
  IconNotebook,
  IconTrash,
} from '@tabler/icons-react';
import {
  fetchReports,
  fetchReportById,
  updateReportStatus,
  type Report,
} from '@/services/report.service';
import { toast } from 'sonner';

export default function ReportsPage() {
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

  // Detail panel / action states
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  // Load reports when page or filter changes
  useEffect(() => {
    loadReports(currentPage, statusFilter);
  }, [currentPage, statusFilter, loadReports]);

  // Reset pagination to page 1 on filter change
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
      if (report.adminNotes) {
        setAdminNotes(report.adminNotes);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve report details');
      setSelectedReportId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Perform status update action (RESOLVED, REJECTED, or RESOLVED_BLOCK)
  const handleUpdateStatus = async (status: 'RESOLVED' | 'REJECTED' | 'RESOLVED_BLOCK') => {
    if (!selectedReportId) return;
    setActionLoading(true);
    try {
      const updated = await updateReportStatus(selectedReportId, {
        status,
        adminNotes: adminNotes.trim() || undefined,
      });
      setSelectedReport(updated);
      toast.success(`Report status updated to ${status.toLowerCase()} successfully`);
      // Reload lists
      loadReports(currentPage, statusFilter);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update report status');
    } finally {
      setActionLoading(false);
    }
  };

  // Status mapping to UI status badges
  const mapStatusToVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'RESOLVED':
        return 'active';
      case 'REJECTED':
        return 'rejected';
      default:
        return 'inactive';
    }
  };

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
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    isActive
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

      {/* Reports Table Listing */}
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
                {/* Reporter Column */}
                <td className="py-4 px-12 text-sm font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                      {report.reporter?.profilePhoto ? (
                        <img
                          src={report.reporter.profilePhoto}
                          alt="reporter"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <IconUser size={14} />
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-200">
                        {report.reporter?.firstName
                          ? `${report.reporter.firstName} ${report.reporter.lastName || ''}`.trim()
                          : 'Unknown User'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">{report.reporter?.id}</p>
                    </div>
                  </div>
                </td>

                {/* Reported User Column */}
                <td className="py-4 px-12 text-sm font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-950/40 border border-red-900/30 text-rose-400">
                      {report.reportedUser?.profilePhoto ? (
                        <img
                          src={report.reportedUser.profilePhoto}
                          alt="reported"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <IconUser size={14} />
                      )}
                    </div>
                    <div>
                      <p className="text-rose-200">
                        {report.reportedUser?.firstName
                          ? `${report.reportedUser.firstName} ${report.reportedUser.lastName || ''}`.trim()
                          : 'Unknown User'}
                      </p>
                      <p className="text-[10px] text-rose-500/80 font-mono">{report.reportedUser?.id}</p>
                    </div>
                  </div>
                </td>

                {/* Reason Category Column */}
                <td className="py-4 px-12 text-sm text-zinc-300">
                  <span className="font-bold text-zinc-400 text-xs px-2 py-1 bg-zinc-900 border border-zinc-850 rounded-md">
                    {report.reasonCode}
                  </span>
                </td>

                {/* Filed Date Column */}
                <td className="py-4 px-12 text-sm text-zinc-400 font-mono">
                  {new Date(report.createdAt).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>

                {/* Status Column */}
                <td className="py-4 px-12 text-sm">
                  <ListingStatusBadge
                    variant={mapStatusToVariant(report.status)}
                    label={report.status}
                  />
                </td>

                {/* Actions Column */}
                <td className="py-4 px-12 text-right text-sm">
                  <Button
                    variant="link"
                    className="text-xs font-bold text-[#d8b4fe] hover:text-[#c084fc] p-0 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadReportDetails(report.id);
                    }}
                  >
                    View & Action
                  </Button>
                </td>
              </tr>
            ))
          )}
        </ListingTableBody>
      </ListingTableWrapper>

      {/* Report Detail Modal */}
      <Dialog open={selectedReportId !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedReportId(null);
          setSelectedReport(null);
        }
      }}>
        <DialogContent className="bg-[#09090b] border border-[#18181b] text-white p-6 max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b border-[#18181b] pb-4">
            <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
              <IconAlertCircle className="text-[#d8b4fe]" size={18} />
              Review Report Details
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Review user profiles, reason details, and take action.
            </DialogDescription>
          </DialogHeader>

          {loadingDetail || !selectedReport ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 flex-1">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-[#d8b4fe]" />
              <p className="text-xs text-zinc-500 font-medium">Retrieving report timeline...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 overflow-y-auto pr-2 flex-1 min-h-0">
              {/* Left Column: Details */}
              <div className="space-y-6">
                {/* Status Header */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current Status</span>
                  <ListingStatusBadge
                    variant={mapStatusToVariant(selectedReport.status)}
                    label={selectedReport.status}
                  />
                </div>

                {/* Profiles Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Parties Involved</h4>
                  
                  {/* Reporter */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-zinc-850 flex items-center justify-center text-zinc-400">
                        {selectedReport.reporter?.profilePhoto ? (
                          <img
                            src={selectedReport.reporter.profilePhoto}
                            alt="reporter"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <IconUser size={14} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">
                          {selectedReport.reporter?.firstName
                            ? `${selectedReport.reporter.firstName} ${selectedReport.reporter.lastName || ''}`.trim()
                            : 'Reporter'}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-500">ID: {selectedReport.reporter?.id}</p>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                      Reporter
                    </span>
                  </div>

                  {/* Reported User */}
                  <div className="bg-rose-950/10 border border-rose-900/20 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-rose-950/30 flex items-center justify-center text-rose-400">
                        {selectedReport.reportedUser?.profilePhoto ? (
                          <img
                            src={selectedReport.reportedUser.profilePhoto}
                            alt="reported"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <IconUser size={14} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-rose-200">
                          {selectedReport.reportedUser?.firstName
                            ? `${selectedReport.reportedUser.firstName} ${selectedReport.reportedUser.lastName || ''}`.trim()
                            : 'Reported User'}
                        </p>
                        <p className="text-[9px] font-mono text-rose-500/80">ID: {selectedReport.reportedUser?.id}</p>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/30 border border-rose-900/30 px-2 py-0.5 rounded">
                      Reported
                    </span>
                  </div>
                </div>

                {/* Reason Description */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Complaint Details</h4>
                  <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-lg space-y-3">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Reason Category</span>
                      <span className="font-bold text-zinc-200 text-xs px-2.5 py-1 bg-zinc-950 border border-zinc-900 rounded-md">
                        {selectedReport.reasonCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Explanation / Proof</span>
                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        {selectedReport.reasonText ? `"${selectedReport.reasonText}"` : 'No additional text description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <IconClock size={11} />
                      <span>
                        Filed {new Date(selectedReport.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions and Notes */}
              <div className="space-y-6 flex flex-col justify-between h-full">
                {/* Admin Action Notes */}
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Admin Notes</h4>
                    {selectedReport.status !== 'PENDING' && (
                      <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                        <IconNotebook size={10} /> Read-only
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Record verification findings, context details, or rejection reasons here..."
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-[#d8b4fe] flex-1 min-h-[120px] resize-none"
                    disabled={selectedReport.status !== 'PENDING' || actionLoading}
                  />
                </div>

                {/* Action Buttons */}
                {selectedReport.status === 'PENDING' ? (
                  <div className="space-y-3 pt-4 border-t border-[#18181b]">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus('REJECTED')}
                        disabled={actionLoading}
                        variant="outline"
                        className="border-red-950 bg-red-950/20 text-rose-200 hover:bg-red-900 hover:text-white flex items-center justify-center gap-1.5 h-9 text-xs font-bold uppercase tracking-wider"
                      >
                        <IconX size={14} />
                        Reject Report
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        disabled={actionLoading}
                        className="bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] flex items-center justify-center gap-1.5 h-9 text-xs font-bold uppercase tracking-wider"
                      >
                        <IconCheck size={14} />
                        Resolve Report
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleUpdateStatus('RESOLVED_BLOCK')}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full border-red-700 bg-red-900/30 text-red-200 hover:bg-red-800 hover:text-white flex items-center justify-center gap-1.5 h-9 text-xs font-bold uppercase tracking-wider"
                    >
                      <IconTrash size={14} />
                      Resolve &amp; Block User
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-[#18181b] text-center text-xs text-zinc-500 font-medium">
                    This report has already been processed.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ListingPageContainer>
  );
}
