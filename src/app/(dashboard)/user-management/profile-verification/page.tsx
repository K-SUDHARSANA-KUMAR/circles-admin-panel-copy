'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchProfileUsersGetAll, verifyProfileImage, ProfileVerificationUser } from '@/services/user.service';
import { fetchCities } from '@/services/cities.service';
import { 
  IconRefresh, 
  IconUser, 
  IconShieldCheck,
  IconUserCheck,
  IconX,
  IconLoader,
  IconCheck,
  IconBan,
  IconPhone,
  IconMapPin,
  IconAward,
  IconAlertCircle,
} from '@tabler/icons-react';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingErrorPanel,
  ListingPagination,
  listingStyles,
} from '@/components/shared/listing-page';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ProfileVerificationPage() {
  const [users, setUsers] = useState<ProfileVerificationUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal and verification states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState<ProfileVerificationUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [cityMap, setCityMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCities() {
      try {
        const cities = await fetchCities();
        const mapping: Record<string, string> = {};
        cities.forEach(city => {
          const id = city.cityId || city.city_id || city.id;
          if (id) {
            mapping[id] = city.name;
          }
        });
        setCityMap(mapping);
      } catch (err) {
        console.error('Failed to load cities list:', err);
      }
    }
    loadCities();
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 500);


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

  const prevSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    // If search query changed, reset page to 1
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      if (page !== 1) {
        setPage(1);
        return; // Skip loading on this render to let page reset first
      }
    }
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

    const docImage = verifyingUser.verificationImages?.find(img => img.type === 'profile') || 
                     verifyingUser.verificationImages?.find(img => img.type === 'selfie') || 
                     verifyingUser.verificationImages?.[0];
    const imageId = docImage?.id;
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

  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (score >= 50) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconShieldCheck}
        title="Profile Verification"
        subtitle={`${total} profiles pending approval`}
      />

      <ListingToolbar
        countLabel={`${total} Pending Approvals`}
        showCount={!loading}
        searchPlaceholder="Search by name or phone no..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        refreshDisabled={loading}
        refreshLoading={loading}
      />

      {error ? (
        <ListingErrorPanel
          title="Failed to load profiles"
          message={error}
          onRetry={handleRefresh}
        />
      ) : (
        <div className={listingStyles.tableWrapper}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#18181b]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[18%]">
                    Name
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[13%]">
                    Phone No
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
                    Status
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
                    City
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
                    Country
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
                    Referral Code
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[10%]">
                    Medium
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[9%]">
                    Score
                  </th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-3 px-6 select-none w-[5%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Loading profile approvals...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconUser size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No pending profile verification requests</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const displayName = user.name ? `${user.name} ${user.lastName || ''}`.trim() : 'Unnamed User';
                    const profilePictureUrl = user.profilePictureUrl;
                    const cityId = (user as any).cityId || (user as any).city_id;
                    const cityName = (cityId && cityMap[cityId]) || (user as any).city?.name || (user as any).city || cityId;
                    const country = (user as any).country;
                    const code = (user as any).referralCode;
                    const medium = (user as any).referralMedium;
                    const score = (user as any).reliabilityScore !== undefined ? (user as any).reliabilityScore : 100;
                    const status = (user.status || 'pending').toLowerCase();

                    return (
                      <tr
                        key={user.id}
                        className="group hover:bg-[#0c0c0e] transition-colors duration-200"
                      >
                        {/* Name */}
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-purple-950/20 text-[#d8b4fe] border border-purple-900/40 overflow-hidden">
                              {profilePictureUrl ? (
                                <img 
                                  src={profilePictureUrl} 
                                  alt={displayName} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                user.name ? user.name.charAt(0).toUpperCase() : 'U'
                              )}
                            </div>
                            <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                              {displayName}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-6">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconPhone size={12} className="shrink-0 text-zinc-600" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-6">
                          {status === 'verified' || status === 'approved' || status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                              Verified
                            </span>
                          ) : status === 'rejected' || status === 'declined' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/20 border border-red-900/30 text-rose-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* City */}
                        <td className="py-3 px-6">
                          {cityName ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <IconMapPin size={12} className="shrink-0 text-zinc-600" />
                              <span className="truncate max-w-[120px]">{cityName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Country */}
                        <td className="py-3 px-6">
                          {country ? (
                            <span className="text-xs text-zinc-400">{country}</span>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Referral Code */}
                        <td className="py-3 px-6">
                          {code ? (
                            <code className="text-xs font-mono font-bold text-white bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                              {code}
                            </code>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Referral Medium */}
                        <td className="py-3 px-6">
                          {medium ? (
                            <span className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 select-none">
                              {medium}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600 select-none">—</span>
                          )}
                        </td>

                        {/* Reliability Score */}
                        <td className="py-3 px-6">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md border ${getScoreStyle(score)} select-none`}>
                            <IconAward size={12} className="shrink-0" />
                            <span>{score}%</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleOpenVerify(user)}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                              title="Review Verification"
                            >
                              <IconUserCheck size={20} className="cursor-pointer" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <ListingPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={limit}
              itemLabel="profiles"
              onPrevious={() => setPage((prev) => prev - 1)}
              onNext={() => setPage((prev) => prev + 1)}
              onItemsPerPageChange={(val) => {
                setLimit(val);
                setPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* Verification Modal */}
      {isModalOpen && verifyingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <Card className="w-full max-w-4xl border-white/10 bg-zinc-950/95 p-6 shadow-2xl rounded-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconShieldCheck size={20} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Identity Verification
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-1">
                    Compare the selfie and submitted verification documents
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={16} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-4">
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 flex items-center gap-4">
                 {verifyingUser.profilePictureUrl ? (
                    <img 
                      src={verifyingUser.profilePictureUrl} 
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-900/40"
                    />
                 ) : (
                   <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-purple-950/20 text-[#d8b4fe] border-2 border-purple-900/40">
                     {verifyingUser.name ? verifyingUser.name.charAt(0).toUpperCase() : 'U'}
                   </div>
                 )}
                 <div>
                   <h4 className="text-sm font-bold text-white">
                     {verifyingUser.name ? `${verifyingUser.name} ${verifyingUser.lastName || ''}`.trim() : 'Unnamed User'}
                   </h4>
                   <p className="text-xs text-zinc-500">{verifyingUser.email}</p>
                 </div>
              </div>

              {(() => {
                const selfieImg = verifyingUser.verificationImages?.find(img => img.type === 'selfie') || 
                                  (verifyingUser.selfieImageUrl ? { url: verifyingUser.selfieImageUrl } : null);
                const docImg = verifyingUser.verificationImages?.find(img => img.type === 'profile') || 
                               verifyingUser.verificationImages?.[0];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800/80 pb-2">Selfie Image</h3>
                      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
                        {selfieImg?.url ? (
                          <img 
                            src={selfieImg.url} 
                            alt="Selfie" 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="text-center text-zinc-600 flex flex-col items-center gap-2">
                            <IconUser size={32} className="opacity-20" />
                            <span className="text-xs font-medium">No selfie provided</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800/80 pb-2">Verification Document</h3>
                      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden">
                        {docImg?.url ? (
                          <img 
                            src={docImg.url} 
                            alt="Verification Document" 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="text-center text-zinc-600 flex flex-col items-center gap-2">
                            <IconAlertCircle size={32} className="opacity-20" />
                            <span className="text-xs font-medium">No document provided</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="h-9 text-xs font-semibold uppercase tracking-wider border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => handleVerifyAction('reject')}
                className="h-9 text-xs font-semibold uppercase tracking-wider px-6 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-colors flex items-center gap-2 rounded-lg"
              >
                {saving ? <IconLoader size={14} className="animate-spin" /> : <IconBan size={14} />}
                <span>Reject</span>
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => handleVerifyAction('approve')}
                className="h-9 text-xs font-semibold uppercase tracking-wider px-6 bg-[#d8b4fe]/20 text-[#d8b4fe] hover:bg-[#c084fc] hover:text-[#3b0764] border border-[#3b1a60]/30 transition-colors flex items-center gap-2 rounded-lg"
              >
                {saving ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                <span>Approve</span>
              </Button>
            </div>

          </Card>
        </div>
      )}

    </ListingPageContainer>
  );
}
