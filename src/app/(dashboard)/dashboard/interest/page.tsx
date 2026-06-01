'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconPlus,
  IconTrash,
  IconX,
  IconSearch,
  IconTags,
  IconFolderPlus,
  IconChevronRight,
  IconRefresh,
  IconAlertCircle,
  IconPencil,
} from '@tabler/icons-react';
import {
  type GroupColor,
  type InterestGroup,
  COLOR_CYCLE,
  fetchInterestGroups,
  createInterestGroup,
  deleteInterestGroup,
  createSubInterest,
  deleteSubInterest,
  updateInterestGroup,
  updateSubInterest,
} from '@/services/interest.service';


interface GroupStyle {
  border: string;
  text: string;
  bg: string;
  badge: GroupColor;
  glow: string;
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
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<GroupColor>('blue');
  const [newSubGroupName, setNewSubGroupName] = useState(''); 
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'group' | 'subInterest';
    id: string;
    name: string;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<{
    type: 'group' | 'subInterest';
    id: string;
    name: string;
    tagIds?: string[];
  } | null>(null);
  const [editName, setEditName] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInterestGroups();
      setGroups(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load interests. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await createInterestGroup(newGroupName.trim());
      setNewGroupName('');
      setNewSubGroupName('');
      setIsCreating(false);
      await loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group.';
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      if (target.type === 'group') {
        await deleteInterestGroup(target.id);
        if (activeGroupId === target.id) setActiveGroupId(null);
      } else {
        await deleteSubInterest(target.id);
      }
      await loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete item.';
      alert(msg);
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
      await loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item.';
      alert(msg);
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
      await loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add sub-interest.';
      alert(msg);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filteredGroups = groups.filter((group) => {
    const matchesGroup = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSub = group.subInterests.some((sub) =>
      sub.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesGroup || matchesSub;
  });

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
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 space-y-5">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09090b] border border-[#18181b] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-normal text-white">Interest Management</h2>
          {!loading && (
            <span className="text-[10px] font-bold text-[#d8b4fe] bg-[#1c122c] px-2.5 py-1 rounded-md border border-[#3b1a60] tracking-wider uppercase">
              {groups.length} Groups
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 w-48 rounded-lg"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadGroups}
            disabled={loading}
            className="h-8 w-8 shrink-0 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400"
            title="Refresh"
          >
            <IconRefresh size={13} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold bg-[#d8b4fe] hover:bg-[#c084fc] text-[#3b0764] rounded-lg border-none"
          >
            {isCreating ? <IconX size={14} /> : <IconFolderPlus size={14} />}
            <span>{isCreating ? 'Cancel' : 'New Group'}</span>
          </Button>
        </div>
      </div>

      {/* ── Create panel ───────────────────────────────────────────────── */}
      {isCreating && (
        <div className="flex items-end gap-3 bg-[#09090b] border border-primary/20 p-4 rounded-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Group Name</label>
            <Input
              placeholder="e.g. Sports & Outdoors, Music & Beats..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); }}
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

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && <GroupSkeleton />}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={28} className="text-destructive" />
          </div>
          <p className="text-sm font-semibold text-foreground">Failed to load interests</p>
          <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
          <Button onClick={loadGroups} variant="outline" className="gap-2 text-xs font-bold uppercase tracking-wider">
            <IconRefresh size={14} /> Try Again
          </Button>
        </div>
      )}

      {/* ── Empty ─────────────────────────────────────────────────────── */}
      {!loading && !error && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <IconTags size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">{searchQuery ? 'No matching interests found' : 'No interest groups yet'}</p>
          <p className="text-xs text-muted-foreground">{searchQuery ? 'Try a different search term.' : 'Create a new group to get started.'}</p>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      {!loading && !error && filteredGroups.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

          {/* ── LEFT: Group list ──────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            {/* Search inside list */}
            <Button
              onClick={() => setIsCreating(!isCreating)}
              className="w-full flex items-center justify-center gap-2 h-9 text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl mb-1"
            >
              <IconFolderPlus size={14} />
              New Group
            </Button>

            {filteredGroups.map((group) => {
              const isActive = activeGroupId === group.id;
              const style = getStyle(group.color, isActive);
              return (
                <div
                  key={group.id}
                  onClick={() => setActiveGroupId(isActive ? null : group.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 border select-none ${
                    isActive
                      ? 'bg-primary/10 border-primary/30 shadow-sm shadow-primary/10'
                      : 'bg-[#09090b] border-[#18181b] hover:border-zinc-700 hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}>
                      <IconTags size={14} />
                    </div>
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                      {group.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {group.subInterests.length}
                    </span>
                    <IconChevronRight
                      size={14}
                      className={`transition-transform duration-200 ${isActive ? 'rotate-90 text-primary' : 'text-zinc-600'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── RIGHT: Detail panel ───────────────────────────────────── */}
          {activeGroup ? (
            <div className="bg-[#09090b] border border-[#18181b] rounded-xl p-6 space-y-6 animate-in fade-in duration-300">
              {/* Group Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 ${getStyle(activeGroup.color, true).bg} ${getStyle(activeGroup.color, true).text}`}>
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
                      setEditTarget({ type: 'group', id: activeGroup.id, name: activeGroup.name, tagIds: activeGroup.subInterests.map(s => s.id) });
                      setEditName(activeGroup.name);
                    }}
                    className="h-8 px-3 text-xs font-semibold border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg gap-1.5"
                  >
                    <IconPencil size={13} /> Edit Group
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget({ type: 'group', id: activeGroup.id, name: activeGroup.name })}
                    className="h-8 w-8 border border-zinc-800 bg-zinc-900/60 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg"
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              </div>

              {/* Add Interest Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Add Interest</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add interest (e.g., Naruto, Fitness...)"
                    value={subInputs[activeGroup.id] || ''}
                    onChange={(e) => handleSubInputChange(activeGroup.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubInterest(activeGroup.id); }}
                    className="flex-1 h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 rounded-lg"
                  />
                  <Button
                    onClick={() => handleAddSubInterest(activeGroup.id)}
                    className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 gap-1.5 rounded-lg"
                  >
                    <IconPlus size={14} /> Add
                  </Button>
                </div>
              </div>

              {/* Active Interests Tags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Interests</span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {activeGroup.subInterests.length} Total
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[48px]">
                  {activeGroup.subInterests.length > 0 ? (
                    activeGroup.subInterests.map((sub) => (
                      <span
                        key={sub.id}
                        className="group/tag inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg hover:border-zinc-700 transition-all"
                      >
                        {sub.name}
                        <button
                          type="button"
                          onClick={() => { setEditTarget({ type: 'subInterest', id: sub.id, name: sub.name }); setEditName(sub.name); }}
                          className="opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-opacity text-zinc-400 hover:text-primary"
                        >
                          <IconPencil size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'subInterest', id: sub.id, name: sub.name })}
                          className="opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-opacity text-zinc-400 hover:text-red-400"
                        >
                          <IconX size={11} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-600 italic py-2">No sub-interests added yet. Add one above.</span>
                  )}
                </div>
              </div>

              {/* Footer metadata */}
              <div className="flex items-center gap-8 pt-4 border-t border-[#18181b]">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Created By</p>
                  <p className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary">
                      {activeGroup.name[0]}
                    </span>
                    Admin
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Last Updated</p>
                  <p className="text-xs text-zinc-300 font-medium">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
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

      {/* ── Delete Modal ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertCircle size={18} />
              <span className="text-sm font-bold">Confirm Deletion</span>
            </div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete {deleteTarget.type === 'group' ? 'interest group' : 'sub-interest'}{' '}
              <strong className="text-white">"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-8 text-xs font-bold text-zinc-400 hover:text-white">Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="h-8 text-xs font-bold px-4">Confirm</Button>
            </div>
          </div>
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
            <p className="text-xs text-zinc-400">Editing <strong className="text-white">"{editTarget.name}"</strong></p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit(); }}
              className="h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200"
              placeholder="New name..."
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditTarget(null)} className="h-8 text-xs font-bold text-zinc-400 hover:text-white">Cancel</Button>
              <Button onClick={handleConfirmEdit} disabled={!editName.trim()} className="h-8 text-xs font-bold px-4">Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

