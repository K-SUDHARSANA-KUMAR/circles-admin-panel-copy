'use client';

import React, { useState } from 'react';
import {
  IconMessageReport,
  IconSearch,
  IconRefresh,
  IconTrash,
  IconEye,
  IconUser,
  IconMail,
  IconPhone,
  IconAlertCircle,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconBan,
  IconCircleCheck,
  IconCircleX,
  IconArrowLeft,
  IconPhoto,
  IconMessage,
  IconCalendar,
  IconShield,
  IconNotes,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingPagination,
  ListingStatusBadge,
  ListingEmptyRow,
  DetailPageHeader,
  DetailPageContainer,
  detailStyles,
  listingStyles,
} from '@/components/shared/listing-page';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface ReportMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface Report {
  id: string;
  reportedDate: string;
  reason: string;
  status: 'Pending' | 'Resolved' | 'Rejected';
  conversationId: string;
  notes?: string;
  reporter: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    joinedDate: string;
  };
  reportedUser: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    status: 'Active' | 'Blocked';
    reliabilityScore: number;
  };
  evidence: {
    messages: ReportMessage[];
    images?: string[];
  };
}

// ─── INITIAL MOCK DATA ──────────────────────────────────────────────────────
const INITIAL_REPORTS: Report[] = [
  {
    id: 'REP-001',
    reportedDate: '2026-06-29T10:30:00Z',
    reason: 'Abusive language and personal insults in private chat',
    status: 'Pending',
    conversationId: 'CONV-9021',
    reporter: {
      id: 'usr-8041',
      name: 'Sarah Jenkins',
      email: 'sjenkins@gmail.com',
      phone: '+1 (555) 019-2834',
      joinedDate: '2025-03-12',
    },
    reportedUser: {
      id: 'usr-2930',
      name: 'John Miller',
      email: 'jmiller99@yahoo.com',
      phone: '+1 (555) 014-9988',
      status: 'Active',
      reliabilityScore: 68,
    },
    evidence: {
      messages: [
        {
          id: 'msg-1',
          senderId: 'usr-2930',
          senderName: 'John Miller',
          text: 'Hey, are you going to the party tonight?',
          timestamp: '2026-06-29T10:15:00Z',
        },
        {
          id: 'msg-2',
          senderId: 'usr-8041',
          senderName: 'Sarah Jenkins',
          text: 'No, I have other plans. Sorry!',
          timestamp: '2026-06-29T10:17:00Z',
        },
        {
          id: 'msg-3',
          senderId: 'usr-2930',
          senderName: 'John Miller',
          text: 'You are always so stuck up. Honestly, nobody likes you anyway, you absolute idiot.',
          timestamp: '2026-06-29T10:18:00Z',
        },
        {
          id: 'msg-4',
          senderId: 'usr-2930',
          senderName: 'John Miller',
          text: 'Don\'t bother showing your face in our circle meetings anymore.',
          timestamp: '2026-06-29T10:19:00Z',
        },
      ],
    },
  },
  {
    id: 'REP-002',
    reportedDate: '2026-06-28T14:15:00Z',
    reason: 'Spamming promotional links and pyramid schemes',
    status: 'Pending',
    conversationId: 'CONV-3841',
    reporter: {
      id: 'usr-4122',
      name: 'Emily Blunt',
      email: 'emily.b@outlook.com',
      phone: '+1 (555) 017-4829',
      joinedDate: '2024-11-05',
    },
    reportedUser: {
      id: 'usr-7734',
      name: 'Marcus Vance',
      email: 'marcusvance_crypto@gmail.com',
      phone: '+1 (555) 012-3490',
      status: 'Active',
      reliabilityScore: 45,
    },
    evidence: {
      messages: [
        {
          id: 'msg-5',
          senderId: 'usr-7734',
          senderName: 'Marcus Vance',
          text: '🚀 HUGE OPPORTUNITY! Make $5000/week working from home. Zero risk! Check out my link now: https://circle-passive-income-scam.com',
          timestamp: '2026-06-28T14:02:00Z',
        },
        {
          id: 'msg-6',
          senderId: 'usr-7734',
          senderName: 'Marcus Vance',
          text: 'Register today and get 20% cashback when you recruit three friends. Dm me for info.',
          timestamp: '2026-06-28T14:03:00Z',
        },
      ],
    },
  },
  {
    id: 'REP-003',
    reportedDate: '2026-06-27T09:45:00Z',
    reason: 'Offensive profile picture containing inappropriate content',
    status: 'Pending',
    conversationId: 'CONV-1022',
    reporter: {
      id: 'usr-0091',
      name: 'David Miller',
      email: 'david.miller@gmail.com',
      phone: '+1 (555) 016-8349',
      joinedDate: '2025-01-20',
    },
    reportedUser: {
      id: 'usr-8394',
      name: 'Jessica Alba',
      email: 'jalba.personal@gmail.com',
      phone: '+1 (555) 015-7733',
      status: 'Active',
      reliabilityScore: 92,
    },
    evidence: {
      messages: [],
      images: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      ],
    },
  },
  {
    id: 'REP-004',
    reportedDate: '2026-06-25T16:20:00Z',
    reason: 'Financial fraud & requesting bank transfers',
    status: 'Resolved',
    conversationId: 'CONV-5928',
    notes: 'Investigated conversation history. User was found offering false services for cash transfers. Account warned and suspended for 30 days.',
    reporter: {
      id: 'usr-3341',
      name: 'Michael Faraday',
      email: 'faraday.m@gmail.com',
      phone: '+1 (555) 011-5522',
      joinedDate: '2024-05-18',
    },
    reportedUser: {
      id: 'usr-9281',
      name: 'Thomas Edison',
      email: 'edison.innovations@gmail.com',
      phone: '+1 (555) 018-8833',
      status: 'Blocked',
      reliabilityScore: 12,
    },
    evidence: {
      messages: [
        {
          id: 'msg-7',
          senderId: 'usr-9281',
          senderName: 'Thomas Edison',
          text: 'Send me $200 via Venmo right now and I will add you to the premium investing channel.',
          timestamp: '2026-06-25T16:05:00Z',
        },
        {
          id: 'msg-8',
          senderId: 'usr-3341',
          senderName: 'Michael Faraday',
          text: 'Are you sure this is verified by the app?',
          timestamp: '2026-06-25T16:08:00Z',
        },
        {
          id: 'msg-9',
          senderId: 'usr-9281',
          senderName: 'Thomas Edison',
          text: 'Yes, absolutely. Do not tell the admins. Send it now or the offer expires.',
          timestamp: '2026-06-25T16:09:00Z',
        },
      ],
    },
  },
  {
    id: 'REP-005',
    reportedDate: '2026-06-24T11:10:00Z',
    reason: 'Accidental report or misunderstanding',
    status: 'Rejected',
    conversationId: 'CONV-8834',
    notes: 'Reviewed reported text. The messages were friendly banter. Reporter confirmed it was a mis-click.',
    reporter: {
      id: 'usr-1200',
      name: 'Ada Lovelace',
      email: 'ada.love@gmail.com',
      phone: '+1 (555) 019-9111',
      joinedDate: '2023-09-12',
    },
    reportedUser: {
      id: 'usr-0099',
      name: 'Charles Babbage',
      email: 'charles.diff@gmail.com',
      phone: '+1 (555) 013-4400',
      status: 'Active',
      reliabilityScore: 98,
    },
    evidence: {
      messages: [
        {
          id: 'msg-10',
          senderId: 'usr-0099',
          senderName: 'Charles Babbage',
          text: 'Haha, you think you can beat me in chess? In your dreams!',
          timestamp: '2026-06-24T10:50:00Z',
        },
        {
          id: 'msg-11',
          senderId: 'usr-1200',
          senderName: 'Ada Lovelace',
          text: 'Challenge accepted! Checkmate in 5 moves.',
          timestamp: '2026-06-24T10:55:00Z',
        },
      ],
    },
  },
  {
    id: 'REP-006',
    reportedDate: '2026-06-23T18:30:00Z',
    reason: 'Suspicious profile description with no evidence provided',
    status: 'Pending',
    conversationId: 'CONV-4491',
    reporter: {
      id: 'usr-8012',
      name: 'Tony Stark',
      email: 'stark@starkindustries.com',
      phone: '+1 (555) 300-3000',
      joinedDate: '2023-05-02',
    },
    reportedUser: {
      id: 'usr-9902',
      name: 'Justin Hammer',
      email: 'hammer@hammertech.com',
      phone: '+1 (555) 440-2020',
      status: 'Active',
      reliabilityScore: 50,
    },
    evidence: {
      messages: [],
    },
  },
];

export default function ReviewsPage() {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'resolve' | 'reject' | 'block' | null;
    reportId: string | null;
    notes: string;
  }>({
    isOpen: false,
    type: null,
    reportId: null,
    notes: '',
  });

  const handleRefresh = () => {
    toast.success('Reports list refreshed');
  };

  // Filter and Search logic
  const filteredReports = reports.filter((report) => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      report.id.toLowerCase().includes(query) ||
      report.reason.toLowerCase().includes(query) ||
      report.reporter.name.toLowerCase().includes(query) ||
      report.reportedUser.name.toLowerCase().includes(query);

    const matchStatus =
      statusFilter === 'all' || report.status.toLowerCase() === statusFilter.toLowerCase();

    return matchQuery && matchStatus;
  });

  // Paginated List
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Trigger Action
  const triggerAction = (type: 'resolve' | 'reject' | 'block', reportId: string) => {
    setActionModal({
      isOpen: true,
      type,
      reportId,
      notes: '',
    });
  };

  // Submit Action Modal
  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { type, reportId, notes } = actionModal;

    if (!reportId || !type) return;

    setReports((prevReports) =>
      prevReports.map((report) => {
        if (report.id !== reportId) return report;

        let updatedStatus: 'Resolved' | 'Rejected' = 'Resolved';
        let updatedReportedUserStatus = report.reportedUser.status;
        let updatedReliabilityScore = report.reportedUser.reliabilityScore;

        if (type === 'reject') {
          updatedStatus = 'Rejected';
        } else if (type === 'block') {
          updatedStatus = 'Resolved';
          updatedReportedUserStatus = 'Blocked';
          updatedReliabilityScore = Math.max(0, report.reportedUser.reliabilityScore - 40);
        } else if (type === 'resolve') {
          updatedStatus = 'Resolved';
          updatedReliabilityScore = Math.max(0, report.reportedUser.reliabilityScore - 15);
        }

        return {
          ...report,
          status: updatedStatus,
          notes: notes.trim() || undefined,
          reportedUser: {
            ...report.reportedUser,
            status: updatedReportedUserStatus,
            reliabilityScore: updatedReliabilityScore,
          },
        };
      })
    );

    const typeLabels = {
      resolve: 'Report marked as Resolved',
      reject: 'Report marked as Rejected',
      block: 'Report resolved and reported user Blocked',
    };

    toast.success(typeLabels[type]);
    setActionModal({ isOpen: false, type: null, reportId: null, notes: '' });
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
    if (score >= 50) return 'text-amber-400 bg-amber-950/20 border-amber-900/30';
    return 'text-rose-400 bg-rose-950/20 border-rose-900/30';
  };

  // STATUS DROPDOWN FILTER ELEMENT
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <div className="w-full">
      {/* ─── 1. DETAILS VIEW ─── */}
      {selectedReportId && selectedReport ? (
        <DetailPageContainer className="pb-12 animate-in fade-in duration-300">
          <DetailPageHeader
            icon={IconMessageReport}
            title={`Report Details — ${selectedReport.id}`}
            subtitle={`Created on ${formatDate(selectedReport.reportedDate)}`}
            onBack={() => setSelectedReportId(null)}
            backLabel="Back to Reports List"
            trailing={
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                  Status:
                </span>
                {selectedReport.status === 'Pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/30 border border-amber-900/40 text-amber-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Pending
                  </span>
                )}
                {selectedReport.status === 'Resolved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Resolved
                  </span>
                )}
                {selectedReport.status === 'Rejected' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950/30 border border-red-900/40 text-rose-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Rejected
                  </span>
                )}
              </div>
            }
          />

          {/* Top 3 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Card 1: Report Summary */}
            <Card className="border-[#18181b] bg-[#09090b] shadow-xl flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                  <IconNotes size={16} className="text-[#d8b4fe]" />
                  <div>
                    <CardTitle className="text-xs font-bold text-white">Report Summary</CardTitle>
                    <CardDescription className="text-[9px] text-zinc-500 mt-0.5">
                      Operational categorization and reference IDs
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                      Report Reason
                    </span>
                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      {selectedReport.reason}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-[#18181b]/60 pt-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                        Conversation ID
                      </span>
                      <code className="text-[10px] font-mono text-[#d8b4fe] bg-[#1c122c]/40 border border-[#3b1a60]/30 px-1.5 py-0.5 rounded">
                        {selectedReport.conversationId}
                      </code>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">
                        Date Reported
                      </span>
                      <span className="text-[11px] text-zinc-300 block mt-0.5">
                        {formatDate(selectedReport.reportedDate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {selectedReport.notes && (
                <div className="p-5 border-t border-[#18181b]/60 bg-zinc-950/30">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                    Admin Notes
                  </span>
                  <div className="text-[11px] text-zinc-400 italic">
                    "{selectedReport.notes}"
                  </div>
                </div>
              )}
            </Card>

            {/* Card 2: Reporter Profile */}
            <Card className="border-[#18181b] bg-[#09090b] shadow-xl flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                    <IconUser size={12} />
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
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-inner"
                      style={{ background: 'linear-gradient(135deg, #18181b, #27272a)' }}
                    >
                      {selectedReport.reporter.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {selectedReport.reporter.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ID: {selectedReport.reporter.id}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#18181b]/60 pt-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconMail size={12} className="text-zinc-600 shrink-0" />
                      <span className="truncate">{selectedReport.reporter.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconPhone size={12} className="text-zinc-600 shrink-0" />
                      <span>{selectedReport.reporter.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconCalendar size={12} className="text-zinc-600 shrink-0" />
                      <span>Joined {selectedReport.reporter.joinedDate}</span>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Card 3: Reported User Profile */}
            <Card className="border-[#18181b] bg-[#09090b] shadow-xl flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-[#18181b] py-3.5 px-5 flex flex-row items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
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
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-[#d8b4fe] shrink-0 shadow-md"
                        style={{
                          background: 'linear-gradient(135deg, #2d124d, #09090b)',
                          border: '1px solid #3b1a60',
                        }}
                      >
                        {selectedReport.reportedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {selectedReport.reportedUser.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ID: {selectedReport.reportedUser.id}
                        </span>
                      </div>
                    </div>
                    <div>
                      {selectedReport.reportedUser.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/20 border border-cyan-900/30 text-cyan-400 text-[10px] font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/20 border border-red-900/30 text-rose-400 text-[10px] font-semibold">
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#18181b]/60 pt-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconMail size={12} className="text-zinc-600 shrink-0" />
                      <span className="truncate">{selectedReport.reportedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconPhone size={12} className="text-zinc-600 shrink-0" />
                      <span>{selectedReport.reportedUser.phone}</span>
                    </div>
                  </div>

                  {/* Reliability Score */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">Reliability Score</span>
                      <span className={`px-1.5 py-0.5 rounded ${getReliabilityColor(selectedReport.reportedUser.reliabilityScore)}`}>
                        {selectedReport.reportedUser.reliabilityScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedReport.reportedUser.reliabilityScore >= 80
                            ? 'bg-emerald-500'
                            : selectedReport.reportedUser.reliabilityScore >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${selectedReport.reportedUser.reliabilityScore}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>

          {/* Bottom Card: Evidence Log Card (Full Width) */}
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
            <CardContent className="p-6 space-y-6">
              {selectedReport.evidence.messages.length === 0 &&
              (!selectedReport.evidence.images ||
                selectedReport.evidence.images.length === 0) ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                  <IconAlertCircle size={28} className="text-zinc-600" />
                  <p className="text-xs font-semibold text-zinc-400">No Evidence Found</p>
                  <p className="text-[10px] text-zinc-600 max-w-[280px]">
                    No logs or chat snapshots were submitted with this complaint.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedReport.evidence.messages.length > 0 ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Recent Chat Log
                      </span>
                      <div className="border border-zinc-800 bg-[#060608] rounded-xl p-4 space-y-3 max-h-[380px] overflow-y-auto">
                        {selectedReport.evidence.messages.map((msg) => {
                          const isReporter = msg.senderId === selectedReport.reporter.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col max-w-[80%] ${
                                isReporter ? 'mr-auto items-start' : 'ml-auto items-end'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-[10px] font-semibold text-zinc-400">
                                  {msg.senderName}
                                </span>
                                <span className="text-[9px] text-zinc-600">
                                  ({isReporter ? 'Reporter' : 'Reported'})
                                </span>
                              </div>
                              <div
                                className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                                  isReporter
                                    ? 'bg-zinc-900 border border-zinc-850 text-zinc-200 rounded-tl-sm'
                                    : 'bg-[#1c122c] border border-[#3b1a60]/30 text-zinc-100 rounded-tr-sm'
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[9px] text-zinc-600 mt-1 px-1">
                                {formatDate(msg.timestamp)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center py-10 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl">
                      <span className="text-xs text-zinc-600 font-medium">No chat message history attached</span>
                    </div>
                  )}
                </div>
              )}

              {/* Straight line horizontal buttons on the bottom right */}
              <div className="border-t border-[#18181b] pt-4 mt-6 flex justify-end items-center">
                {selectedReport.status !== 'Pending' ? (
                  <div className="flex items-center gap-2 p-2 bg-zinc-900/40 border border-zinc-850 rounded-lg">
                    <IconAlertCircle size={14} className="text-zinc-500" />
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Workflow closed — status is <strong>{selectedReport.status.toLowerCase()}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => triggerAction('reject', selectedReport.id)}
                      className="h-8 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white px-4 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-1.5"
                    >
                      <IconCircleX size={14} />
                      Reject Report
                    </Button>

                    <Button
                      type="button"
                      onClick={() => triggerAction('resolve', selectedReport.id)}
                      className="h-8 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-[#3b1a60]/50 text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300 px-4 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-1.5"
                    >
                      <IconCircleCheck size={14} />
                      Resolve Report
                    </Button>

                    <Button
                      type="button"
                      onClick={() => triggerAction('block', selectedReport.id)}
                      className="h-8 text-xs font-bold uppercase tracking-wider bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 px-4 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-1.5"
                    >
                      <IconBan size={14} />
                      Resolve & Block User
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </DetailPageContainer>
      ) : (
        /* ─── 2. LIST VIEW ─── */
        <ListingPageContainer className="animate-in fade-in duration-500">
          <ListingSectionHeader
            icon={IconMessageReport}
            title="User Reports Management"
            subtitle={`${reports.filter((r) => r.status === 'Pending').length} pending reports require operator review`}
          />

          <ListingToolbar
            countLabel={`${totalItems} Reports`}
            showCount={true}
            searchPlaceholder="Search by ID, reporter, or suspect..."
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            onRefresh={handleRefresh}
            filterAction={
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="h-8 px-3 text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 focus:outline-none transition-all cursor-pointer select-none font-semibold uppercase tracking-wider"
                  aria-label="Filter by Status"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          />

          <div className={listingStyles.tableWrapper}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#18181b] bg-zinc-950/40">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[8%]">
                      S.No
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[15%]">
                      Reported Date
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[18%]">
                      Reporter
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[18%]">
                      Reported User
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[23%]">
                      Report Reason
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
                      Status
                    </th>
                    <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[8%]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181b]/60">
                  {paginatedReports.length === 0 ? (
                    <ListingEmptyRow
                      colSpan={7}
                      icon={IconMessageReport}
                      title="No Reports Found"
                      description="No records matched your search query or filters."
                    />
                  ) : (
                    paginatedReports.map((report, index) => {
                      const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                      const statusLower = report.status.toLowerCase() as
                        | 'pending'
                        | 'resolved'
                        | 'rejected';

                      return (
                        <tr
                          key={report.id}
                          className="group hover:bg-[#0c0c0e]/80 transition-colors duration-200"
                        >
                          {/* S.No */}
                          <td className="py-3 px-6 text-xs text-zinc-400 font-mono font-medium">
                            {serialNumber}
                          </td>

                          {/* Reported Date */}
                          <td className="py-3 px-6 text-xs text-zinc-300">
                            {formatDate(report.reportedDate)}
                          </td>

                          {/* Reporter */}
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-zinc-300 shrink-0"
                                style={{ background: '#27272a' }}
                              >
                                {report.reporter.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">
                                {report.reporter.name}
                              </span>
                            </div>
                          </td>

                          {/* Reported User */}
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-[#d8b4fe] shrink-0"
                                style={{ background: '#1c122c', border: '1px solid #3b1a60' }}
                              >
                                {report.reportedUser.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">
                                {report.reportedUser.name}
                              </span>
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="py-3 px-6">
                            <span className="text-xs text-zinc-400 line-clamp-1 max-w-[240px]">
                              {report.reason}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-6">
                            <ListingStatusBadge variant={statusLower} label={report.status} />
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-6 text-right">
                            <button
                              onClick={() => setSelectedReportId(report.id)}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-105 active:scale-95 transition-all p-1 cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                              title="View Details"
                            >
                              <IconEye size={14} className="cursor-pointer" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <ListingPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                itemLabel="user reports"
                onFirst={() => setCurrentPage(1)}
                onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                onLast={() => setCurrentPage(totalPages)}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </ListingPageContainer>
      )}

      {/* ─── 3. ACTION SUBMIT DIALOG MODAL ─── */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    actionModal.type === 'reject'
                      ? 'bg-rose-950/30 border-rose-900/50 text-rose-400'
                      : actionModal.type === 'block'
                      ? 'bg-red-950/30 border-red-900/50 text-red-500'
                      : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                  }`}
                >
                  {actionModal.type === 'reject' ? (
                    <IconCircleX size={16} />
                  ) : actionModal.type === 'block' ? (
                    <IconBan size={16} />
                  ) : (
                    <IconCircleCheck size={16} />
                  )}
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    {actionModal.type === 'reject' && 'Reject User Report'}
                    {actionModal.type === 'resolve' && 'Resolve User Report'}
                    {actionModal.type === 'block' && 'Resolve Report & Block User'}
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    {actionModal.type === 'reject' && 'Set status to rejected. Add reasons below.'}
                    {actionModal.type === 'resolve' && 'Mark the issue as solved with admin notes.'}
                    {actionModal.type === 'block' &&
                      'Mark issue resolved and suspend the reported account.'}
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setActionModal({ isOpen: false, type: null, reportId: null, notes: '' })}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <Textarea
                  required
                  placeholder="Provide details on the action taken, warnings issued, or policy reasoning..."
                  value={actionModal.notes}
                  onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                  className="min-h-[100px] text-xs bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 rounded-lg focus:border-zinc-700 focus:ring-0 focus-visible:ring-0"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setActionModal({ isOpen: false, type: null, reportId: null, notes: '' })
                  }
                  className="h-8 text-[11px] font-bold uppercase tracking-wider border-zinc-850 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`h-8 text-[11px] font-bold uppercase tracking-wider rounded-lg px-4 ${
                    actionModal.type === 'reject'
                      ? 'bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-zinc-800 hover:text-rose-300'
                      : actionModal.type === 'block'
                      ? 'bg-red-900 text-white hover:bg-red-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  Confirm Action
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
