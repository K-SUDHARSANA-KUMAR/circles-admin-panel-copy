'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  IconPlus,
  IconRefresh,
  IconAlertCircle,
  IconTag,
  IconX,
} from '@tabler/icons-react';
import { Switch } from '@/components/ui/switch';
import { ListingToolbar, listingStyles } from '@/components/shared/listing-page';
import {
  fetchVenueCategories,
  createVenueCategory,
  setVenueCategoryActive,
  type VenueCategory,
} from '@/services/venue.service';
import { toast } from 'sonner';

/**
 * Venue categories management — rendered inside the "Categories" tab on the
 * venues page (mirrors the Cities/Countries tab layout).
 */
export const VenueCategoriesSection = () => {
  const [categories, setCategories] = useState<VenueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchVenueCategories(true));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load categories.';
      setError(msg);
      toast.error('Failed to load venue categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) {
      toast.warning('Please enter a category name');
      return;
    }
    setSaving(true);
    try {
      const created = await createVenueCategory(label);
      setCategories((prev) =>
        prev.some((c) => c.slug === created.slug) ? prev : [...prev, created],
      );
      toast.success(`Successfully added category: ${created.label}`);
      setNewLabel('');
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save category.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: VenueCategory) => {
    const next = !(cat.isActive ?? true);
    setTogglingId(cat.id);
    try {
      await setVenueCategoryActive(cat.id, next);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: next } : c)),
      );
      toast.success(`${cat.label} is now ${next ? 'Active' : 'Inactive'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update category.';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = categories.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    return q ? c.label.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) : true;
  });

  return (
    <>
      <ListingToolbar
        countLabel={`${categories.length} Categories`}
        showCount={!loading}
        searchPlaceholder="Search by category name or slug..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={load}
        refreshDisabled={loading}
        refreshLoading={loading}
        primaryAction={
          <Button onClick={() => setIsModalOpen(true)} className={listingStyles.primaryButton}>
            <IconPlus size={14} />
            <span>Add Category</span>
          </Button>
        }
      />

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-8 rounded-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Failed to load categories</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5">{error}</p>
          </div>
          <Button
            onClick={load}
            variant="outline"
            size="sm"
            className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <IconRefresh size={12} />
            Try Again
          </Button>
        </div>
      ) : (
        <div className="bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-350">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#18181b]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[40%]">
                    Category
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[30%]">
                    Slug
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[15%]">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[15%]">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b]/60">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Loading categories...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconTag size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No categories found</p>
                        <p className="text-[11px] text-zinc-600">Try modifying your search or add a new category</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat) => {
                    const active = cat.isActive ?? true;
                    return (
                    <tr key={cat.id} className="group hover:bg-[#0c0c0e] transition-colors duration-200">
                      <td className="py-5 px-12 text-sm font-semibold text-white">{cat.label}</td>
                      <td className="py-5 px-12 text-sm font-mono text-zinc-400">{cat.slug}</td>
                      <td className="py-5 px-12">
                        {active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 text-[11px] font-semibold select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-12 text-right">
                        <div className="flex items-center justify-end">
                          <Switch
                            checked={active}
                            disabled={togglingId === cat.id}
                            onCheckedChange={() => handleToggle(cat)}
                          />
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconTag size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">Add New Category</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    Configure a new venue category
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  autoFocus
                  placeholder="e.g. Rooftop Bar"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !newLabel.trim()}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </>
  );
};

export default VenueCategoriesSection;
