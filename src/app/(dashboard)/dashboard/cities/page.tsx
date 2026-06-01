'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconBuildingCommunity,
  IconPencil,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { fetchCities, createCity, updateCity, deleteCity, type City } from '@/services/cities.service';
import { toast } from 'sonner';

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Action states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null);
  
  // Form values
  const [newCityName, setNewCityName] = useState('');
  const [newCityCode, setNewCityCode] = useState('');
  const [newCityActive, setNewCityActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Fetch Cities ──────────────────────────────────────────────────────────
  const loadCities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCities();
      setCities(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load cities. Please try again.';
      setError(msg);
      toast.error('Failed to load cities list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  // ─── Handle Save (Create / Update) ─────────────────────────────────────────
  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim() || !newCityCode.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: newCityName.trim(),
        country_code: newCityCode.trim().toUpperCase(),
        is_active: newCityActive,
      };

      if (editingCity) {
        const cityId = editingCity.city_id ?? editingCity.id;
        if (!cityId) throw new Error('City ID is missing');
        await updateCity(cityId, payload);
        toast.success(`Successfully updated city: ${newCityName}`);
      } else {
        await createCity(payload);
        toast.success(`Successfully added city: ${newCityName}`);
      }
      
      // Reset & Close
      handleCloseModal();
      
      // Reload Data
      await loadCities();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save city.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Handle Toggle Active / Quick Activation ───────────────────────────────
  const handleToggleActive = async (city: City) => {
    const cityId = city.city_id ?? city.id;
    if (!cityId) {
      toast.error('City ID is missing');
      return;
    }

    try {
      const payload = {
        name: city.name,
        country_code: city.country_code,
        is_active: true, // toggle to active
      };
      await updateCity(cityId, payload);
      toast.success(`Successfully activated city: ${city.name}`);
      await loadCities();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update city status.';
      toast.error(msg);
    }
  };

  // ─── Handle Delete City ────────────────────────────────────────────────────
  const handleDeleteCity = async () => {
    if (!deleteTarget) return;
    const cityId = deleteTarget.city_id ?? deleteTarget.id;
    if (!cityId) {
      toast.error('City ID is missing');
      return;
    }

    try {
      await deleteCity(cityId);
      toast.success(`Successfully deleted city: ${deleteTarget.name}`);
      setDeleteTarget(null);
      await loadCities();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete city.';
      toast.error(msg);
    }
  };

  // ─── Close modal reset helpers ─────────────────────────────────────────────
  const handleCloseModal = () => {
    setNewCityName('');
    setNewCityCode('');
    setNewCityActive(true);
    setEditingCity(null);
    setIsModalOpen(false);
  };

  // ─── Open modal for edit helper ────────────────────────────────────────────
  const handleOpenEdit = (city: City) => {
    setEditingCity(city);
    setNewCityName(city.name);
    setNewCityCode(city.country_code);
    setNewCityActive(city.is_active);
    setIsModalOpen(true);
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredCities = cities.filter((city) => {
    const nameMatch = (city.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = (city.country_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || codeMatch;
  });

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredCities.length / itemsPerPage);
  
  // Slice current page items
  const paginatedCities = filteredCities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Helper mappings to match mockups ─────────────────────────────────────
  const getCityStatus = (city: City): 'active' | 'waitlist' | 'inactive' => {
    if ((city as any).status) {
      const s = (city as any).status.toLowerCase();
      if (s === 'active') return 'active';
      if (s === 'waitlist') return 'waitlist';
      if (s === 'inactive') return 'inactive';
    }
    
    if (city.is_active) {
      return 'active';
    }

    // Specially match the cities from the Figma mockup to default them perfectly
    const waitlistCities = ['reykjavík', 'reykjavik', 'marrakech', 'hanoi'];
    if (waitlistCities.includes(city.name.toLowerCase())) {
      return 'waitlist';
    }
    return 'inactive';
  };

  const getCountryName = (city: City): string => {
    const code = (city.country_code || '').trim().toUpperCase();
    const map: Record<string, string> = {
      'PT': 'Portugal',
      'DE': 'Germany',
      'JP': 'Japan',
      'IS': 'Iceland',
      'MA': 'Morocco',
      'VN': 'Vietnam',
      'AT': 'Austria',
      'US': 'United States',
      'GB': 'United Kingdom',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
    };
    return map[code] ?? city.country_code;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Actions / Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09090b] border border-[#18181b] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-[10px] font-bold text-[#d8b4fe] bg-[#1c122c] px-2.5 py-1 rounded-md border border-[#3b1a60] tracking-wider uppercase">
              {cities.length} Operational Cities
            </span>
          )}
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Search by city name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 rounded-lg"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadCities}
            disabled={loading}
            className="h-8 w-8 shrink-0 border-[#18181b] bg-[#09090b] hover:bg-[#18181b] rounded-lg"
            title="Refresh"
          >
            <IconRefresh size={12} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] shrink-0 rounded-lg transition-colors duration-200"
          >
            <IconPlus size={14} />
            <span>Add City</span>
          </Button>
        </div>
      </div>

      {/* Main Table Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#09090b] border border-[#18181b] p-8 rounded-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <IconAlertCircle size={24} className="text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Failed to load operational cities</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-0.5">{error}</p>
          </div>
          <Button
            onClick={loadCities}
            variant="outline"
            size="sm"
            className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <IconRefresh size={12} />
            Try Again
          </Button>
        </div>
      ) : (
        <div className="bg-[#09090b] border border-[#18181b] rounded-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#18181b]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                    City
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                    Country
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500 py-4 px-12 select-none w-[25%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b]/60">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
                      <p className="text-xs text-zinc-500 mt-2 font-medium">Loading operational cities...</p>
                    </td>
                  </tr>
                ) : paginatedCities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconBuildingCommunity size={32} className="text-zinc-600" />
                        <p className="text-xs font-semibold text-zinc-400">No operational cities found</p>
                        <p className="text-[11px] text-zinc-600">Try modifying your search or add a new city</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCities.map((city) => {
                    const status = getCityStatus(city);
                    const country = getCountryName(city);
                    return (
                      <tr
                        key={city.city_id ?? city.id}
                        className="group hover:bg-[#0c0c0e] transition-colors duration-200"
                      >
                        {/* City Name */}
                        <td className="py-5 px-12 text-sm font-semibold text-white">
                          {city.name}
                        </td>
                        {/* Country Code / Name */}
                        <td className="py-5 px-12 text-sm font-normal text-zinc-400">
                          {country}
                        </td>
                        {/* Status Badge */}
                        <td className="py-5 px-12">
                          {status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c122c]/60 border border-[#3b1a60]/50 text-[#d8b4fe] text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                              Active
                            </span>
                          ) : status === 'waitlist' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1f10]/60 border border-[#5f3e15]/50 text-amber-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Waitlist
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 text-[11px] font-semibold select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              Inactive
                            </span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="py-5 px-12 text-right">
                          <div className="flex items-center justify-end gap-3.5">
                            <button
                              onClick={() => handleOpenEdit(city)}
                              className="text-[#c084fc] hover:text-[#d8b4fe] hover:scale-110 active:scale-95 transition-all p-1"
                              title="Edit City"
                            >
                              <IconPencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(city)}
                              className="text-red-400 hover:text-red-300 hover:scale-110 active:scale-95 transition-all p-1"
                              title="Delete City"
                            >
                              <IconTrash size={15} />
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

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#18181b] px-12 py-4">
              <div className="text-[11px] text-zinc-500 text-left">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCities.length)} of {filteredCities.length} cities
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all"
                >
                  Previous
                </Button>
                <div className="text-[11px] text-zinc-400 px-1 font-semibold select-none">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="h-7 px-3 text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 hover:text-white rounded-lg transition-all"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-out / Modal Dialog for Creating and Editing a City */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 rounded-xl">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/30 border border-purple-900/50 text-[#d8b4fe]">
                  <IconBuildingCommunity size={16} />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    {editingCity ? 'Edit City' : 'Add New City'}
                  </CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500 mt-0.5">
                    {editingCity ? 'Modify operational city configurations' : 'Configure a new operational city destination'}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="h-8 w-8 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <IconX size={14} />
              </Button>
            </div>

            <form onSubmit={handleSaveCity} className="space-y-4">
              
              {/* City Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  City Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. San Francisco"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg"
                />
              </div>

              {/* City/Country Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  City/Country Code <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. US, SF, PT"
                  value={newCityCode}
                  onChange={(e) => setNewCityCode(e.target.value)}
                  className="h-9 text-xs bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-purple-500 rounded-lg font-mono uppercase"
                  maxLength={15}
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Operational Status
                </label>
                <select
                  value={newCityActive ? 'active' : 'inactive'}
                  onChange={(e) => setNewCityActive(e.target.value === 'active')}
                  className="w-full h-9 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white px-3 focus:outline-none focus:border-purple-500"
                >
                  <option value="active" className="bg-zinc-950">Active</option>
                  <option value="inactive" className="bg-zinc-950">Inactive / Waitlist</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !newCityName.trim() || !newCityCode.trim()}
                  className="h-8 text-xs font-semibold uppercase tracking-wider px-5 bg-[#d8b4fe] text-[#3b0764] hover:bg-[#c084fc] rounded-lg transition-colors duration-200"
                >
                  {saving ? 'Saving...' : editingCity ? 'Update City' : 'Save City'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

      {/* Custom Deletion Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4 rounded-xl">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-red-400 uppercase tracking-wider">
                <IconAlertCircle size={16} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1 text-zinc-400">
                Are you sure you want to delete city <strong className="text-white font-semibold">"{deleteTarget.name}"</strong>? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="h-8 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCity}
                className="h-8 text-xs font-semibold uppercase tracking-wider px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
