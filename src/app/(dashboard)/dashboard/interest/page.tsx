'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconPlus,
  IconX,
  IconSearch,
  IconTags,
  IconFolderPlus,
  IconChevronRight,
  IconRefresh,
  IconPencil,
  IconTrash,
  IconArrowLeft,
  IconCheck,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  type GroupColor,
  type InterestGroup,
  type DeletedGroup,
  type DeletedSubInterest,
  type DeletedInterestsResponse,
  fetchInterestGroups,
  fetchInterestsBySearch,
  fetchInterestGroupById,
  createInterestGroup,
  createSubInterest,
  updateInterestGroup,
  updateSubInterest,
  softDeleteInterests,
  fetchDeletedInterests,
} from '@/services/interest.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ListingPageContainer,
  ListingSectionHeader,
  ListingToolbar,
  ListingErrorPanel,
  listingStyles,
} from '@/components/shared/listing-page';

interface GroupStyle {
  border: string;
  text: string;
  bg: string;
  badge: GroupColor;
  glow: string;
}

// ─── Highlight matched text ───────────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-amber-400/20 text-amber-300 font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GroupSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[56px] rounded-xl border border-white/5 bg-white/[0.02] animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterestsPage() {
  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Tab state: 'active' for normal interest management, 'deleted' for viewing soft-deleted records
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    type: 'group' | 'subInterest';
    id: string;
    name: string;
    tagIds?: string[];
  } | null>(null);
  const [editName, setEditName] = useState('');

  // Multi-selection of sub-interests under the currently selected group
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  // Controls whether selection mode (checkboxes) is active for sub-interests
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // Soft-deleted data state
  const [deletedData, setDeletedData] = useState<DeletedInterestsResponse | null>(null);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Modal state for confirming group, individual, or multi-select soft delete
  const [deleteModal, setDeleteModal] = useState<{
    type: 'group' | 'single-interest' | 'multiple-interests';
    groupId: string;
    groupName: string;
    interestIds?: string[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch active groups ─────────────────────────────────────────────────────

  const loadGroups = useCallback(async (searchVal = '') => {
    setLoading(true);
    setError(null);
    try {
      if (searchVal.trim()) {
        // Dual backend search: by group name AND by interest name in parallel
        const [groupsByName, interestMatches] = await Promise.all([
          fetchInterestGroups(searchVal),
          fetchInterestsBySearch(searchVal),
        ]);

        // Collect group IDs already found by group-name search
        const foundGroupIds = new Set(groupsByName.map((g) => g.id));

        // Find unique parent group IDs from interest matches not already included
        const missingParentIds = [
          ...new Set(
            interestMatches
              .map((i) => i.interestGroupId)
              .filter((id) => id && !foundGroupIds.has(id))
          ),
        ];

        // Fetch missing parent groups concurrently
        const parentGroups = (
          await Promise.all(missingParentIds.map((id) => fetchInterestGroupById(id)))
        ).filter((g): g is InterestGroup => g !== null);

        const mergedGroups = [...groupsByName, ...parentGroups];
        setGroups(mergedGroups);

        // Auto-select when search narrows result to a single group
        if (mergedGroups.length === 1) {
          setActiveGroupId(mergedGroups[0].id);
        } else if (mergedGroups.length === 0) {
          setActiveGroupId(null);
        }
      } else {
        // No search — fetch all groups and keep active selection if valid
        const data = await fetchInterestGroups('');
        setGroups(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load interests. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups(debouncedSearch);
  }, [debouncedSearch, loadGroups]);

  // ── Fetch soft-deleted records ──────────────────────────────────────────────

  const loadDeleted = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const data = await fetchDeletedInterests();
      setDeletedData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load deleted interests.';
      toast.error(msg);
    } finally {
      setLoadingDeleted(false);
    }
  }, []);

  // When switching to the 'deleted' tab, load soft-deleted records from backend
  const handleSwitchTab = (tab: 'active' | 'deleted') => {
    setActiveTab(tab);
    if (tab === 'deleted') {
      loadDeleted();
    }
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await createInterestGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreating(false);
      toast.success('Interest group created successfully.');
      await loadGroups(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    const target = editTarget;
    setEditTarget(null);
    try {
      if (target.type === 'group') {
        await updateInterestGroup(target.id, editName.trim(), target.tagIds ?? []);
      } else {
        await updateSubInterest(target.id, editName.trim());
      }
      toast.success('Updated successfully.');
      await loadGroups(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item.';
      toast.error(msg);
    }
  };

  const handleSubInputChange = (groupId: string, val: string) => {
    setSubInputs((prev) => ({ ...prev, [groupId]: val }));
  };

  const handleAddSubInterest = async (groupId: string) => {
    const val = subInputs[groupId]?.trim();
    if (!val) return;
    try {
      await createSubInterest(val, groupId);
      setSubInputs((prev) => ({ ...prev, [groupId]: '' }));
      toast.success('Sub-interest added successfully.');
      await loadGroups(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add sub-interest.';
      toast.error(msg);
    }
  };

  // ── Soft-delete execution handler ───────────────────────────────────────────

  // Executes the soft-delete PATCH API for groups, single interests, or multiple interests.
  // Maintains UI state consistency: only updates UI upon confirmed API success, keeping items visible on failure.
  const handleExecuteDelete = async () => {
    if (!deleteModal) return;
    const target = deleteModal;
    setDeleting(true);

    try {
      // For group soft-delete: send only interestGroupId (do NOT send interestIds).
      // For sub-interests: send interestGroupId and the array of interestIds.
      const payload: { interestGroupId: string; interestIds?: string[] } = {
        interestGroupId: target.groupId,
      };
      if (target.interestIds && target.interestIds.length > 0) {
        payload.interestIds = target.interestIds;
      }

      const res = await softDeleteInterests(payload);
      toast.success(res.message || 'Soft-deleted successfully.');
      setDeleteModal(null);

      if (target.type === 'group') {
        // Remove the soft-deleted group from the active group list
        setGroups((prev) => prev.filter((g) => g.id !== target.groupId));
        if (activeGroupId === target.groupId) {
          setActiveGroupId(null);
        }
      } else {
        // Remove soft-deleted sub-interests from the active group's subInterests array
        const deletedSet = new Set(target.interestIds);
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== target.groupId) return g;
            return {
              ...g,
              subInterests: g.subInterests.filter((sub) => !deletedSet.has(sub.id)),
            };
          })
        );
        // Clear selection for the deleted sub-interests and exit delete mode
        setSelectedInterestIds((prev) => prev.filter((id) => !deletedSet.has(id)));
        setIsDeleteMode(false);
      }

      // If deleted records are cached or the Deleted Interests tab is active, refresh deleted data
      if (deletedData || activeTab === 'deleted') {
        loadDeleted();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to soft-delete.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Group deleted sub-interests by parent group name for clear display in Section B
  const groupedDeletedSubInterests = useMemo(() => {
    if (!deletedData?.deletedSubInterests) return {};
    const map: Record<string, DeletedSubInterest[]> = {};
    for (const item of deletedData.deletedSubInterests) {
      const key = item.groupName || 'Unassigned Group';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [deletedData]);

  // Filter deleted data if search query is provided
  const filteredDeletedGroups = useMemo(() => {
    if (!deletedData?.deletedGroups) return [];
    if (!debouncedSearch.trim()) return deletedData.deletedGroups;
    const q = debouncedSearch.toLowerCase();
    return deletedData.deletedGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        g.subInterests.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [deletedData, debouncedSearch]);

  const filteredDeletedSubInterestsGrouped = useMemo(() => {
    if (!debouncedSearch.trim()) return groupedDeletedSubInterests;
    const q = debouncedSearch.toLowerCase();
    const filtered: Record<string, DeletedSubInterest[]> = {};
    for (const [groupName, items] of Object.entries(groupedDeletedSubInterests)) {
      const matchingItems = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q) || groupName.toLowerCase().includes(q)
      );
      if (matchingItems.length > 0) {
        filtered[groupName] = matchingItems;
      }
    }
    return filtered;
  }, [groupedDeletedSubInterests, debouncedSearch]);

  // ── Color map ──────────────────────────────────────────────────────────────

  const getStyle = (color: GroupColor, isOpen: boolean): GroupStyle => {
    const map: Record<GroupColor, GroupStyle> = {
      blue: {
        border: isOpen ? 'border-blue-500/30' : 'border-blue-500/10 hover:border-blue-500/25',
        text: 'text-blue-400',
        bg: 'bg-blue-500/5',
        badge: 'blue' as const,
        glow: isOpen ? 'glow-blue/15' : 'hover:glow-blue/5',
      },
      emerald: {
        border: isOpen ? 'border-emerald-500/30' : 'border-emerald-500/10 hover:border-emerald-500/25',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/5',
        badge: 'emerald' as const,
        glow: isOpen ? 'glow-emerald/15' : 'hover:glow-emerald/5',
      },
      violet: {
        border: isOpen ? 'border-violet-500/30' : 'border-violet-500/10 hover:border-violet-500/25',
        text: 'text-violet-400',
        bg: 'bg-violet-500/5',
        badge: 'violet' as const,
        glow: isOpen ? 'glow-violet/15' : 'hover:glow-violet/5',
      },
      warning: {
        border: isOpen ? 'border-amber-500/30' : 'border-amber-500/10 hover:border-amber-500/25',
        text: 'text-amber-400',
        bg: 'bg-amber-500/5',
        badge: 'warning' as const,
        glow: isOpen ? 'glow-amber/15' : 'hover:glow-amber/5',
      },
      success: {
        border: isOpen ? 'border-green-500/30' : 'border-green-500/10 hover:border-green-500/25',
        text: 'text-green-400',
        bg: 'bg-green-500/5',
        badge: 'success' as const,
        glow: isOpen ? 'glow-green/15' : 'hover:glow-green/5',
      },
      destructive: {
        border: isOpen ? 'border-red-500/30' : 'border-red-500/10 hover:border-red-500/25',
        text: 'text-red-400',
        bg: 'bg-red-500/5',
        badge: 'destructive' as const,
        glow: isOpen ? 'glow-red/15' : 'hover:glow-red/5',
      },
    };
    return map[color] ?? map.blue;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <ListingPageContainer>
      <ListingSectionHeader
        icon={IconTags}
        title="Interest Management"
        subtitle={
          activeTab === 'active'
            ? `${groups.length} interest groups configured`
            : `${deletedData?.deletedGroups.length ?? 0} deleted groups, ${deletedData?.deletedSubInterests.length ?? 0} deleted interests`
        }
      />

      <ListingToolbar
        countLabel={
          activeTab === 'active'
            ? `${groups.length} Groups`
            : `${deletedData?.deletedGroups.length ?? 0} Groups / ${deletedData?.deletedSubInterests.length ?? 0} Interests`
        }
        showCount={activeTab === 'active' ? !loading : !loadingDeleted}
        searchPlaceholder={activeTab === 'active' ? 'Search groups or interests...' : 'Search deleted items...'}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => (activeTab === 'active' ? loadGroups(searchQuery) : loadDeleted())}
        refreshDisabled={activeTab === 'active' ? loading : loadingDeleted}
        refreshLoading={activeTab === 'active' ? loading : loadingDeleted}
        primaryAction={
          <div className="flex items-center gap-2">
            {/* Tab switcher: Active Groups vs Deleted Interests */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handleSwitchTab('active')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'active'
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Active Groups
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('deleted')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'deleted'
                    ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <IconTrash size={13} />
                Deleted Interests
              </button>
            </div>

            {/* New Group button (visible in active mode) */}
            {activeTab === 'active' && (
              <Button
                onClick={() => setIsCreating(!isCreating)}
                className={listingStyles.primaryButton}
              >
                {isCreating ? <IconX size={14} /> : <IconFolderPlus size={14} />}
                <span>{isCreating ? 'Cancel' : 'New Group'}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* ── ACTIVE TAB VIEW ───────────────────────────────────────────── */}
      {activeTab === 'active' && (
        <>
          {/* Create group panel */}
          {isCreating && (
            <div className="flex items-end gap-3 bg-[#09090b] border border-primary/20 p-4 rounded-xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Group Name</label>
                <Input
                  placeholder="e.g. Sports & Outdoors, Music & Beats..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                  }}
                  className="h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 rounded-lg"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || creating}
                className="h-9 px-5 text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/90"
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && <GroupSkeleton />}

          {/* Error */}
          {!loading && error && (
            <ListingErrorPanel title="Failed to load interests" message={error} onRetry={loadGroups} />
          )}

          {/* Empty state */}
          {!loading && !error && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <IconTags size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">{searchQuery ? 'No matching interests found' : 'No interest groups yet'}</p>
              <p className="text-xs text-muted-foreground">{searchQuery ? 'Try a different search term.' : 'Create a new group to get started.'}</p>
            </div>
          )}

          {/* Two-column layout */}
          {!loading && !error && groups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
              {/* ── LEFT: Group list with Delete button ──────────────────── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex-1 flex items-center justify-center gap-2 h-9 text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl"
                  >
                    <IconFolderPlus size={14} />
                    New Group
                  </Button>
                  <Button
                    onClick={() => handleSwitchTab('deleted')}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-bold border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-red-400 hover:border-red-500/30 rounded-xl"
                  >
                    <IconTrash size={14} />
                    Deleted
                  </Button>
                </div>

                {groups.map((group) => {
                  const isActive = activeGroupId === group.id;
                  const style = getStyle(group.color, isActive);
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        setActiveGroupId(isActive ? null : group.id);
                        setSelectedInterestIds([]);
                        setIsDeleteMode(false);
                      }}
                      className={`group/item flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200 border select-none ${
                        isActive
                          ? 'bg-primary/10 border-primary/30 shadow-sm shadow-primary/10'
                          : 'bg-[#09090b] border-[#18181b] hover:border-zinc-700 hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}>
                          <IconTags size={14} />
                        </div>
                        <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                          {group.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                          {group.subInterests.length}
                        </span>
                        <IconChevronRight
                          size={14}
                          className={`transition-transform duration-200 ${isActive ? 'rotate-90 text-primary' : 'text-zinc-600'}`}
                        />
                        {/* Soft-delete group button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({
                              type: 'group',
                              groupId: group.id,
                              groupName: group.name,
                            });
                          }}
                          className="p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={`Delete group "${group.name}"`}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── RIGHT: Selected group detail panel ───────────────────── */}
              {activeGroup ? (
                <div className="bg-[#09090b] border border-[#18181b] rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
                  {/* Group Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 ${
                          getStyle(activeGroup.color, true).bg
                        } ${getStyle(activeGroup.color, true).text}`}
                      >
                        <IconTags size={22} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{activeGroup.name}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Manage interests shown to users who identify with the {activeGroup.name} persona.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditTarget({
                            type: 'group',
                            id: activeGroup.id,
                            name: activeGroup.name,
                            tagIds: activeGroup.subInterests.map((s) => s.id),
                          });
                          setEditName(activeGroup.name);
                        }}
                        className="h-8 px-3 text-xs font-semibold border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg gap-1.5"
                      >
                        <IconPencil size={13} /> Edit Group
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteModal({
                            type: 'group',
                            groupId: activeGroup.id,
                            groupName: activeGroup.name,
                          })
                        }
                        className="h-8 px-3 text-xs font-semibold border border-red-500/20 bg-red-500/5 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-lg gap-1.5"
                      >
                        <IconTrash size={13} /> Delete Group
                      </Button>
                    </div>
                  </div>

                  {/* Add Sub-Interest Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Add Interest</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add interest (e.g., Naruto, Fitness...)"
                        value={subInputs[activeGroup.id] || ''}
                        onChange={(e) => handleSubInputChange(activeGroup.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSubInterest(activeGroup.id);
                        }}
                        className="flex-1 h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 rounded-lg"
                      />
                      <Button
                        onClick={() => handleAddSubInterest(activeGroup.id)}
                        className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 gap-1.5 rounded-lg"
                      >
                        <IconPlus size={14} /> Add
                      </Button>

                      {/* Delete mode toggle near Add button */}
                      {!isDeleteMode ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsDeleteMode(true);
                            setSelectedInterestIds([]);
                          }}
                          disabled={activeGroup.subInterests.length === 0}
                          className="h-9 px-3.5 text-xs font-bold border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1.5 rounded-lg"
                          title="Select multiple interests to delete"
                        >
                          <IconTrash size={14} /> Delete
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={selectedInterestIds.length === 0}
                            onClick={() => {
                              if (selectedInterestIds.length > 0) {
                                setDeleteModal({
                                  type: 'multiple-interests',
                                  groupId: activeGroup.id,
                                  groupName: activeGroup.name,
                                  interestIds: selectedInterestIds,
                                });
                              }
                            }}
                            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-lg bg-red-600 hover:bg-red-700"
                          >
                            <IconTrash size={14} />
                            Delete ({selectedInterestIds.length})
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setIsDeleteMode(false);
                              setSelectedInterestIds([]);
                            }}
                            className="h-9 px-2.5 text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 rounded-lg"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub-Interests Tags */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Interests</span>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          {activeGroup.subInterests.length} Total
                        </span>
                        {isDeleteMode && (
                          <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            Select interests to delete
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[48px]">
                      {activeGroup.subInterests.length > 0 ? (
                        activeGroup.subInterests.map((sub) => {
                          const isSelected = selectedInterestIds.includes(sub.id);
                          return (
                            <span
                              key={sub.id}
                              onClick={() => {
                                // In delete mode, clicking anywhere on the tag toggles selection
                                if (isDeleteMode) {
                                  setSelectedInterestIds((prev) =>
                                    isSelected ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                                  );
                                }
                              }}
                              className={`group/tag inline-flex items-center gap-1.5 border text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                                isDeleteMode
                                  ? isSelected
                                    ? 'bg-red-500/15 border-red-500/40 text-red-300 cursor-pointer'
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-red-500/30 cursor-pointer'
                                  : debouncedSearch.trim() && sub.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                                  ? 'bg-zinc-900 border-amber-400 text-zinc-300'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                              }`}
                            >
                              {/* Selection checkbox only appears in delete mode */}
                              {isDeleteMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setSelectedInterestIds((prev) =>
                                      isSelected ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                                    );
                                  }}
                                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-red-500 focus:ring-0 cursor-pointer"
                                />
                              )}

                              <HighlightText text={sub.name} query={debouncedSearch} />

                              {/* In normal (old) style: show hover edit and single delete buttons */}
                              {!isDeleteMode && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditTarget({ type: 'subInterest', id: sub.id, name: sub.name });
                                      setEditName(sub.name);
                                    }}
                                    className="opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-opacity text-zinc-400 hover:text-primary ml-0.5"
                                    aria-label={`Edit ${sub.name}`}
                                  >
                                    <IconPencil size={11} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteModal({
                                        type: 'single-interest',
                                        groupId: activeGroup.id,
                                        groupName: activeGroup.name,
                                        interestIds: [sub.id],
                                      });
                                    }}
                                    className="opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-opacity text-zinc-400 hover:text-red-400"
                                    aria-label={`Delete ${sub.name}`}
                                  >
                                    <IconTrash size={11} />
                                  </button>
                                </>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-zinc-600 italic py-2">No sub-interests added yet. Add one above.</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] rounded-xl py-20 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <IconTags size={22} className="text-zinc-600" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-400">Select a group</p>
                  <p className="text-xs text-zinc-600">Click any group on the left to manage its interests.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── DELETED INTERESTS TAB VIEW ─────────────────────────────────── */}
      {activeTab === 'deleted' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-[#09090b] border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <IconTrash size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Soft-Deleted Records</h3>
                <p className="text-xs text-zinc-500">
                  These records have deleted_at timestamps and do not appear in the active group listing.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwitchTab('active')}
              className="border-zinc-800 text-xs font-semibold gap-1.5"
            >
              <IconArrowLeft size={14} /> Back to Active Groups
            </Button>
          </div>

          {loadingDeleted ? (
            <GroupSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section A: Deleted Entire Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <IconTrash size={16} className="text-red-400" />
                    Deleted Groups
                  </h4>
                  <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-[10px]">
                    {filteredDeletedGroups.length}
                  </Badge>
                </div>

                {filteredDeletedGroups.length > 0 ? (
                  <div className="space-y-3">
                    {filteredDeletedGroups.map((grp) => (
                      <div
                        key={grp.id}
                        className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-white">{grp.name}</span>
                            <span className="text-[11px] text-zinc-500 ml-2 font-mono">({grp.slug})</span>
                          </div>
                          <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            {grp.deletedAt ? new Date(grp.deletedAt).toLocaleString() : 'Deleted'}
                          </span>
                        </div>

                        {grp.subInterests && grp.subInterests.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {grp.subInterests.map((sub) => (
                              <span
                                key={sub.id}
                                className="text-[11px] bg-zinc-900 text-zinc-400 px-2.5 py-1 rounded-md border border-zinc-800/80"
                              >
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-600 italic">No sub-interests in this group.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#09090b] border border-zinc-900 rounded-xl">
                    <p className="text-xs text-zinc-500 italic">No deleted groups found.</p>
                  </div>
                )}
              </div>

              {/* Section B: Deleted Individual Interests */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <IconTags size={16} className="text-amber-400" />
                    Deleted Interests
                  </h4>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]">
                    {Object.values(filteredDeletedSubInterestsGrouped).reduce((acc, curr) => acc + curr.length, 0)}
                  </Badge>
                </div>

                {Object.keys(filteredDeletedSubInterestsGrouped).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(filteredDeletedSubInterestsGrouped).map(([groupName, items]) => (
                      <div
                        key={groupName}
                        className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-zinc-200">{groupName}</span>
                          <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {items.length} sub-interest{items.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-2 text-xs bg-zinc-900 text-zinc-300 px-2.5 py-1.5 rounded-lg border border-zinc-800"
                            >
                              <span>{item.name}</span>
                              <span className="text-[9px] text-zinc-500">
                                {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#09090b] border border-zinc-900 rounded-xl">
                    <p className="text-xs text-zinc-500 italic">No deleted individual interests found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <IconPencil size={18} />
              <span className="text-sm font-bold">Edit {editTarget.type === 'group' ? 'Interest Group' : 'Sub-Interest'}</span>
            </div>
            <p className="text-xs text-zinc-400">
              Editing <strong className="text-white">"{editTarget.name}"</strong>
            </p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmEdit();
              }}
              className="h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200"
              placeholder="New name..."
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setEditTarget(null)}
                className="h-8 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmEdit} disabled={!editName.trim()} className="h-8 text-xs font-bold px-4">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Soft Delete Confirmation Modal ────────────────────────────── */}
      {/* Implements exact confirmation text requested for groups, individual interests, and batch selection */}
      {deleteModal && (
        <AlertDialog open={!!deleteModal} onOpenChange={(open) => !open && !deleting && setDeleteModal(null)}>
          <AlertDialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-200 sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-base font-bold flex items-center gap-2">
                <IconTrash className="text-red-400" size={18} />
                Confirm Soft Delete
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 text-xs">
                {deleteModal.type === 'group' &&
                  'Deleting this group will also delete all active interests inside this group. Are you sure?'}
                {deleteModal.type === 'single-interest' &&
                  'Are you sure you want to delete this interest?'}
                {deleteModal.type === 'multiple-interests' &&
                  'Are you sure you want to delete the selected interests?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel
                disabled={deleting}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={handleExecuteDelete}
                className="bg-red-600 text-white hover:bg-red-700 font-semibold"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ListingPageContainer>
  );
}
