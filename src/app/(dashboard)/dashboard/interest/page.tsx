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
  type GroupStyle,
  COLOR_CYCLE,
  fetchInterestGroups,
  createInterestGroup,
  deleteInterestGroup,
  createSubInterest,
  deleteSubInterest,
  updateInterestGroup,
  updateSubInterest,
} from '@/services/interest.service';

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

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">

      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#222222] border border-[#333333] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 tracking-wider uppercase">
              {groups.length} Interest Groups
            </span>
          )}
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadGroups}
            disabled={loading}
            className="h-9 w-9 shrink-0 border-[#333333] hover:bg-[#333333]"
            title="Refresh"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wider shrink-0"
          >
            {isCreating ? <IconX size={16} /> : <IconPlus size={16} />}
            <span>{isCreating ? 'Cancel' : 'New Group'}</span>
          </Button>
        </div>
      </div>

      {/* Creation Panel */}
      {isCreating && (
        <Card className="border-primary/20 bg-primary/5 shadow-2xl p-5 animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <IconFolderPlus size={18} className="text-primary" />
              <span>Create New Interest Group</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Groups categorize and organize individual sub-interests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Group Name
              </label>
              <Input
                placeholder="e.g. Sports & Outdoors, Music & Beats..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Add sub-interest..."
                value={newSubGroupName}
                onChange={(e) => setNewSubGroupName(e.target.value)}
                // onKeyDown={(e) => {
                //   if (e.key === 'Enter') handleAddSubInterest();
                // }}
                className="h-8 text-xs bg-white/5 border-white/10"
              />
            </div>

            <div className="w-full md:w-56 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Theme Color
              </label>
              <div className="flex gap-2 items-center h-9">
                {COLOR_CYCLE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewGroupColor(c)}
                    className={`h-6 w-6 rounded-full border transition-all ${
                      newGroupColor === c
                        ? 'ring-2 ring-primary ring-offset-2 scale-110 border-white'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor:
                        c === 'blue' ? '#3b82f6' :
                        c === 'emerald' ? '#10b981' :
                        c === 'violet' ? '#8b5cf6' :
                        c === 'warning' ? '#f59e0b' :
                        c === 'success' ? '#22c55e' : '#ef4444',
                    }}
                  />
                ))}
              </div>
              
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || creating}
              className="h-9 w-full md:w-auto px-6 font-bold text-xs uppercase tracking-wider"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && <GroupSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-in fade-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={28} className="text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Failed to load interests</p>
            <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
          </div>
          <Button
            onClick={loadGroups}
            variant="outline"
            className="gap-2 text-xs font-bold uppercase tracking-wider"
          >
            <IconRefresh size={14} />
            Try Again
          </Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-in fade-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <IconTags size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {searchQuery ? 'No matching interests found' : 'No interest groups yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {searchQuery ? 'Try a different search term.' : 'Create a new group to get started.'}
          </p>
        </div>
      )}

      {/* Accordion List */}
      {!loading && !error && filteredGroups.length > 0 && (
        <div className="flex flex-col gap-3.5 w-full">
          {filteredGroups.map((group) => {
            const isOpen = activeGroupId === group.id;
            const style = getStyle(group.color, isOpen);

            return (
              <div
                key={group.id}
                className="overflow-hidden bg-transparent rounded-lg transition-all duration-300"
              >
                {/* Clickable Header Row */}
                <div
                  onClick={() => setActiveGroupId(isOpen ? null : group.id)}
                  className="flex flex-row items-center justify-between p-4 cursor-pointer bg-[#222222] border border-[#333333] hover:border-primary/40 rounded-lg transition-all select-none"
                >
                  <div className="flex items-center gap-3">
                    <IconChevronRight
                      size={16}
                      className={`text-muted-foreground transition-transform duration-300 ${
                        isOpen ? 'rotate-90 text-white' : 'text-muted-foreground/60'
                      }`}
                    />
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 ${style.bg} ${style.text}`}
                    >
                      <IconTags size={16} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {group.name}
                      </span>
                      <span className="inline-flex text-[9px] font-extrabold text-muted-foreground/70 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 tracking-wider uppercase w-fit">
                        {group.subInterests.length} Sub-Interests
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget({ type: 'group', id: group.id, name: group.name, tagIds: group.subInterests.map(s => s.id) });
                        setEditName(group.name);
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <IconPencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'group', id: group.id, name: group.name });
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>

                {/* Collapsible Content */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition:
                      'grid-template-rows 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-in-out',
                    opacity: isOpen ? 1 : 0,
                  }}
                  className={isOpen ? 'mt-2' : 'pointer-events-none'}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="p-4 flex flex-col gap-4 bg-[#222222] border border-[#333333] rounded-lg">
                      {/* Sub-Interests */}
                      <div className="flex flex-wrap gap-2 min-h-[36px]">
                        {group.subInterests.length > 0 ? (
                          group.subInterests.map((sub) => (
                            <Badge
                              key={sub.id}
                              variant={style.badge}
                              className="group/badge flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border-white/5 transition-all hover:scale-105 duration-200"
                            >
                              <span>{sub.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTarget({ type: 'subInterest', id: sub.id, name: sub.name });
                                  setEditName(sub.name);
                                }}
                                className="opacity-40 hover:opacity-100 transition-opacity rounded-full hover:bg-white/10 p-0.5"
                              >
                                <IconPencil size={9} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: 'subInterest', id: sub.id, name: sub.name });
                                }}
                                className="opacity-40 hover:opacity-100 transition-opacity rounded-full hover:bg-white/10 p-0.5"
                              >
                                <IconX size={10} />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic font-medium py-1.5">
                            No sub-interests added yet.
                          </span>
                        )}
                      </div>

                      {/* Add Sub-Interest Input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <Input
                          placeholder="Add sub-interest..."
                          value={subInputs[group.id] || ''}
                          onChange={(e) => handleSubInputChange(group.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubInterest(group.id);
                          }}
                          className="h-8 text-xs bg-white/5 border-white/10"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddSubInterest(group.id)}
                          className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <IconAlertCircle size={18} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Are you sure you want to delete {deleteTarget.type === 'group' ? 'interest group' : 'sub-interest'}{' '}
                <strong className="text-white font-semibold">"{deleteTarget.name}"</strong>? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="h-8 text-xs font-bold uppercase tracking-wider px-4"
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <IconPencil size={18} />
                <span>Edit {editTarget.type === 'group' ? 'Interest Group' : 'Sub-Interest'}</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Editing <strong className="text-white font-semibold">"{editTarget.name}"</strong>
              </CardDescription>
            </CardHeader>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit(); }}
              className="h-9 text-xs"
              placeholder="New name..."
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditTarget(null)} className="h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleConfirmEdit} disabled={!editName.trim()} className="h-8 text-xs font-bold uppercase tracking-wider px-4">
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
