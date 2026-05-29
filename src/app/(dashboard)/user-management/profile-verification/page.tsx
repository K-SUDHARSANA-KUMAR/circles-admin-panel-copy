'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchProfileUsersGetAll, verifyProfileImage, type ProfileVerificationUser, type VerificationImage } from '@/services/user.service';
import { 
  IconSearch, 
  IconRefresh, 
  IconAlertCircle, 
  IconUser, 
  IconMail, 
  IconShieldCheck,
  IconX,
  IconLoader,
  IconCheck,
  IconBan
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

// ─── Table Loading Skeleton ──────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i} className="hover:bg-transparent border-border/40">
          <TableCell className="py-4 w-[80px]">
            <div className="h-4 w-8 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            </div>
          </TableCell>
          <TableCell className="py-4">
            <div className="h-4 w-40 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-6 w-20 rounded-full bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4 text-right pr-6">
            <div className="h-8 w-24 ml-auto rounded bg-white/5 animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileVerificationPage() {
  const [users, setUsers] = useState<ProfileVerificationUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal and verification states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState<ProfileVerificationUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadUsers = useCallback(async (searchVal = '', currentPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * limit;
      const response = await fetchProfileUsersGetAll({ search: searchVal, limit, skip });
      setUsers(response.users);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users.';
      setError(msg);
      toast.error('Failed to load profile verification users');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    // Reset to page 1 on new search
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadUsers(debouncedSearch, page);
  }, [debouncedSearch, page, loadUsers]);

  const handleRefresh = () => {
    loadUsers(searchQuery, page);
  };

  const handleOpenVerify = (user: ProfileVerificationUser) => {
    setVerifyingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setVerifyingUser(null);
    setIsModalOpen(false);
  };

  const handleVerifyAction = async (action: 'approve' | 'reject') => {
    if (!verifyingUser) return;

    const imageId = verifyingUser.verificationImages?.[0]?.id;
    if (!imageId) {
      toast.error('No verification image found for this user.');
      return;
    }

    setSaving(true);
    try {
      const isApproved = action === 'approve';
      await verifyProfileImage(verifyingUser.id, imageId, isApproved);
      
      const displayName = verifyingUser.name ? `${verifyingUser.name} ${verifyingUser.lastName || ''}`.trim() : 'User';
      toast.success(`Successfully ${action === 'approve' ? 'approved' : 'rejected'} ${displayName}'s profile`);
      
      handleCloseModal();
      await loadUsers(debouncedSearch, page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify profile.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = status ? status.toLowerCase() : 'pending';
    if (s === 'verified') {
      return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    }
    if (s === 'rejected') {
      return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
    }
    return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.2)' };
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 font-sans space-y-6 p-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase">
            {total} Pending Approvals
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="h-9 w-9 shrink-0 border-[#333333] hover:bg-[#333333]"
            title="Refresh List"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      <div className="bg-[#222222] border border-[#333333] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#333333] bg-[#171717] font-sans">
              <TableHead className="w-[80px] text-white font-bold text-[13px] py-3">S.No</TableHead>
              <TableHead className="text-white font-bold text-[13px] py-3">User</TableHead>
              <TableHead className="text-white font-bold text-[13px] py-3">Email</TableHead>
              <TableHead className="text-white font-bold text-[13px] py-3">Verification Status</TableHead>
              <TableHead className="text-right text-white font-bold text-[13px] px-6 py-3">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 py-8 animate-in fade-in duration-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
                      <IconAlertCircle size={24} className="text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Failed to load profiles</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
                    </div>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      className="gap-2 text-xs font-bold uppercase tracking-wider border-[#333333] hover:bg-[#333333]"
                    >
                      <IconRefresh size={12} />
                      Try Again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-8 animate-in fade-in duration-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#171717] border border-[#333333]">
                      <IconShieldCheck size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {searchQuery ? 'No matching profiles found' : 'All caught up!'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? 'Try refining your search terms.' : 'There are no pending profile verifications.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => {
                const statusStyle = getStatusStyle(user.profileVerificationStatus);
                const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed User';
                
                return (
                  <TableRow
                    key={user.id || index}
                    className="group border-b border-[#333333] hover:bg-white/5 transition-colors font-sans"
                  >
                    <TableCell className="text-xs font-bold text-muted-foreground/50 group-hover:text-primary transition-colors">
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.profilePictureUrl ? (
                           <img 
                            src={user.profilePictureUrl} 
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover border border-[#333333]"
                           />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 bg-primary/20 text-primary border border-primary/30 transition-transform group-hover:scale-105">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors truncate max-w-[200px]">
                          {displayName}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IconMail size={12} className="shrink-0 text-muted-foreground/60" />
                        <span className="truncate max-w-[240px]">{user.email}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: statusStyle.border,
                        }}
                      >
                        {user.profileVerificationStatus || 'Pending'}
                      </span>
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 px-4 font-medium text-xs rounded-md bg-[#171717] hover:bg-[#333333] border border-[#333333] hover:border-primary/50 text-primary transition-colors flex items-center gap-1.5 ml-auto"
                        onClick={() => handleOpenVerify(user)}
                        title="Profile Verify"
                      >
                        <IconShieldCheck size={14} />
                        <span>Profile Verify</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
        <div className="text-xs text-muted-foreground">
          Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="text-xs h-8 border-[#333333] hover:bg-[#333333] text-foreground"
          >
            Previous
          </Button>
          <div className="text-xs font-medium text-white px-2">
            Page {page} of {Math.max(1, Math.ceil(total / limit))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
            disabled={page === Math.ceil(total / limit) || total === 0 || loading}
            className="text-xs h-8 border-[#333333] hover:bg-[#333333] text-foreground"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Verification Modal */}
      {isModalOpen && verifyingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <Card className="w-full max-w-4xl border-[#333333] bg-[#222222] p-6 shadow-2xl rounded-lg animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-[#333333] pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <IconShieldCheck size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">
                    Identity Verification
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Compare the selfie and submitted verification documents
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="h-8 w-8 text-muted-foreground hover:text-white rounded-lg"
              >
                <IconX size={20} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-4">
              <div className="bg-[#171717] border border-[#333333] rounded-lg p-4 flex items-center gap-4">
                 {verifyingUser.profilePictureUrl ? (
                    <img 
                      src={verifyingUser.profilePictureUrl} 
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
                    />
                 ) : (
                   <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white bg-primary/20 text-primary border-2 border-primary/30">
                     {verifyingUser.name ? verifyingUser.name.charAt(0).toUpperCase() : 'U'}
                   </div>
                 )}
                 <div>
                   <h4 className="text-sm font-bold text-white">
                     {verifyingUser.name ? `${verifyingUser.name} ${verifyingUser.lastName || ''}`.trim() : 'Unnamed User'}
                   </h4>
                   <p className="text-xs text-muted-foreground">{verifyingUser.email}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333333] pb-2">Selfie Image</h3>
                  <div className="bg-[#171717] border border-[#333333] rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
                    {verifyingUser.selfieImageUrl ? (
                      <img 
                        src={verifyingUser.selfieImageUrl} 
                        alt="Selfie" 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                        <IconUser size={32} className="opacity-20" />
                        <span className="text-xs font-medium">No selfie provided</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333333] pb-2">Verification Document</h3>
                  <div className="bg-[#171717] border border-[#333333] rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
                    {verifyingUser.verificationImages && verifyingUser.verificationImages.length > 0 ? (
                      <img 
                        src={verifyingUser.verificationImages[0].url} 
                        alt="Verification Document" 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                        <IconAlertCircle size={32} className="opacity-20" />
                        <span className="text-xs font-medium">No document provided</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#333333] mt-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="h-10 text-xs font-bold uppercase tracking-wider border-[#333333] text-foreground hover:bg-[#333333]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => handleVerifyAction('reject')}
                className="h-10 text-xs font-bold uppercase tracking-wider px-6 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-colors flex items-center gap-2"
              >
                {saving ? <IconLoader size={14} className="animate-spin" /> : <IconBan size={14} />}
                <span>Reject</span>
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => handleVerifyAction('approve')}
                className="h-10 text-xs font-bold uppercase tracking-wider px-6 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-colors flex items-center gap-2"
              >
                {saving ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                <span>Approve</span>
              </Button>
            </div>

          </Card>
        </div>
      )}

    </div>
  );
}
