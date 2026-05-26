'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconMapPin,
  IconX,
  IconBuildingCommunity,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { fetchCities, createCity, updateCity, deleteCity, type City } from '@/services/cities.service';
import { toast } from 'sonner';

// ─── Table Loading Skeleton ──────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i} className="hover:bg-transparent border-border/40">
          <TableCell className="py-4">
            <div className="h-4 w-8 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-5 w-40 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-4 w-12 rounded bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4">
            <div className="h-6 w-16 rounded-full bg-white/5 animate-pulse" />
          </TableCell>
          <TableCell className="py-4 text-right">
            <div className="h-7 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

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

  return (
    <div className="flex flex-col p-4 gap-5 w-full max-w-[1400px] mx-auto animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-glow">Cities</h1>
            {!loading && (
              <div className="hidden sm:inline-flex text-[10px] font-bold text-white/70 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 tracking-widest uppercase">
                {cities.length} Total Cities
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs font-medium">
            Manage operational cities and region configurations
          </p>
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by city name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadCities}
            disabled={loading}
            className="h-9 w-9 shrink-0"
            title="Refresh"
          >
            <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 shadow-xl shadow-primary/20 text-xs font-bold uppercase tracking-wider ml-auto sm:ml-0"
          >
            <IconPlus size={16} />
            <span>Add City</span>
          </Button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="glass-card overflow-hidden shadow-2xl border-primary/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50 bg-muted/30">
              <TableHead className="w-[100px] text-white font-bold text-[14px]">
                S.No
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                City Name
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                City Code
              </TableHead>
              <TableHead className="text-white font-bold text-[14px]">
                Status
              </TableHead>
              <TableHead className="text-right text-white font-bold text-[14px] px-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                      <IconAlertCircle size={24} className="text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Failed to load operational cities</p>
                      <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto mt-0.5">{error}</p>
                    </div>
                    <Button
                      onClick={loadCities}
                      variant="outline"
                      size="sm"
                      className="mt-1 gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8"
                    >
                      <IconRefresh size={12} />
                      Try Again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCities.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                      <IconMapPin size={20} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {searchQuery ? 'No matching cities found' : 'No operational cities yet'}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        {searchQuery ? 'Try a different search query' : 'Configure your first city location to get started'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCities.map((city, index) => (
                <TableRow
                  key={city.city_id || city.id || index}
                  className="group border-border/40 hover:bg-primary/5 smooth-transition"
                >
                  <TableCell className="text-xs font-extrabold text-foreground/40 group-hover:text-primary transition-colors">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-bold text-foreground/90 group-hover:text-primary transition-colors text-sm">
                    {city.name}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium text-foreground/75">
                    {city.country_code}
                  </TableCell>
                  <TableCell>
                    {city.is_active ? (
                      <Badge
                        variant="success"
                        className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-emerald-500/10 border-emerald-500/10"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-red-500/10 border-red-500/10"
                      >
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-4">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 px-3 font-bold text-[10px] uppercase tracking-wider rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(city);
                        }}
                      >
                        <IconPencil size={12} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(city);
                        }}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Slide-out / Modal Dialog for Creating and Editing a City */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950/95 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <IconBuildingCommunity size={18} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    {editingCity ? 'Edit City' : 'Add New City'}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    {editingCity ? 'Modify operational city configurations' : 'Configure a new operational city destination'}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="h-8 w-8 text-muted-foreground hover:text-white rounded-lg"
              >
                <IconX size={16} />
              </Button>
            </div>

            <form onSubmit={handleSaveCity} className="space-y-4">
              
              {/* City Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  City Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. San Francisco"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              {/* City/Country Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  City/Country Code <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. US, SF"
                  value={newCityCode}
                  onChange={(e) => setNewCityCode(e.target.value)}
                  className="h-9 text-xs bg-white/5 border-white/10 focus:border-primary/50 font-mono uppercase"
                  maxLength={5}
                />
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-white">Active Status</span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Determines if city is visible and operational
                  </span>
                </div>
                <Switch
                  checked={newCityActive}
                  onCheckedChange={setNewCityActive}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !newCityName.trim() || !newCityCode.trim()}
                  className="h-9 text-xs font-bold uppercase tracking-wider px-5 shadow-xl shadow-primary/20"
                >
                  {saving ? 'Saving...' : editingCity ? 'Update City' : 'Save City'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

      {/* Gorgeous Custom Deletion Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-white/10 bg-zinc-950/95 p-5 shadow-2xl space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <IconAlertCircle size={18} />
                <span>Confirm Deletion</span>
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Are you sure you want to delete city <strong className="text-white font-semibold">"{deleteTarget.name}"</strong>? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCity}
                className="h-8 text-xs font-bold uppercase tracking-wider px-4"
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
