'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parse } from 'date-fns';
import { MoreVertical, ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAd, getAllAds, updateAd } from '@/lib/adsApi';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { Advertisement } from '@/features/dashboard/advertisement/types/advertisement.types';
import { masterRecordsApi } from '@/features/master-managment/api/master-records';
import { MasterRecord } from '@/features/master-managment/types/master.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdvertisementViewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get('date');

  // UI only (no persistence)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDate, setFormDate] = useState('');
  // Store the selected advertisement type ID (from master records)
  const [formAdTypeId, setFormAdTypeId] = useState('');
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Master types fetched from MDM (preferred)
  const [masterAdTypes, setMasterAdTypes] = useState<{ id: string; name: string }[]>([]);
  // Optional: additional master data can be loaded here if needed
  // Derived types map from existing ads (fallback)
  const derivedAdTypes = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of ads) {
      if (a.advertisementTypeId && (a.advertisementType || '')) {
        map.set(a.advertisementTypeId, a.advertisementType as string);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [ads]);

  // (removed budget limit helpers)

  // Final list prefers master records; falls back to derived from ads
  const adTypes = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of masterAdTypes) map.set(t.id, t.name);
    for (const t of derivedAdTypes) if (!map.has(t.id)) map.set(t.id, t.name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [masterAdTypes, derivedAdTypes]);

  // Normalized lookup map for advertisement type name by ID (handles case/format)
  const adTypeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of adTypes) {
      const key = String(t.id);
      m.set(key, t.name);
      m.set(key.toLowerCase(), t.name);
    }
    return m;
  }, [adTypes]);

  useEffect(() => {
    // Default to all dates when query param is missing
    if (!date) router.replace('/dashboard/advertisement/view?date=all');
  }, [date, router]);

  // Load master advertisement types from MDM if configured
  useEffect(() => {
    const loadMasterTypes = async () => {
      try {
        // Default schema name must match your MDM: 'advertisementType'
        const masterName = process.env.NEXT_PUBLIC_ADVERTISEMENT_MASTER_NAME || 'advertisementType';
        // If MDM base URL is not configured, skip silently (fallback will be used)
        if (!process.env.NEXT_PUBLIC_MDM_SERVICE_URL) return;
        const res = await masterRecordsApi.getAll(masterName, 0, 1000, true);
        const items = res.items || [];
        const pickName = (r: MasterRecord): string | undefined =>
          (r as any).advertisementTypeName || (r as any).advertisementType || (r as any).name || (r as any).title || undefined;
        // Prefer business key `advertisementTypeId`, then `id`, then Mongo `_id`
        const pickId = (r: MasterRecord): string | undefined =>
          (r as any).advertisementTypeId || (r as any).id || (r as any)._id || undefined;
        const mapped = items
          .map((r) => {
            const id = pickId(r);
            const name = pickName(r);
            if (!id || !name) return null;
            return { id: String(id), name: String(name) };
          })
          .filter(Boolean) as { id: string; name: string }[];
        setMasterAdTypes(mapped);
        // Limits mapping removed (reverting budget UI logic)
      } catch (e) {
        // Swallow errors: we will rely on fallback derivedAdTypes
        console.warn('Failed to load master advertisement types. Falling back to derived list.');
      }
    };
    loadMasterTypes();
  }, []);

  const dateLabel = useMemo(() => {
    if (!date || date === 'all') return 'All Dates';
    const parsed = parse(date, 'yyyy-MM-dd', new Date());
    return format(parsed, 'do MMMM, yyyy');
  }, [date]);

  // (reverted budget limit resolver and over-limit memo)

  // Load ads and optionally filter by selected date
  // Normalize advertisementDate which could be ISO (e.g., 2025-09-01T00:00:00.000Z) or plain yyyy-MM-dd
  const list: Advertisement[] = useMemo(() => {
    if (!date || date === 'all') return [...ads].sort((a, b) => String(b.advertisementDate).localeCompare(String(a.advertisementDate)));
    return ads
      .filter((a) => {
        const src = a.advertisementDate || '';
        const day = src.includes('T') ? src.split('T')[0] : src;
        return day === date;
      })
      .sort((a, b) => String(b.advertisementDate).localeCompare(String(a.advertisementDate)));
  }, [ads, date]);

  const loadAds = async () => {
    try {
      setLoading(true);
      setError(null);
      const all = await getAllAds();
      setAds(all);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const openCreate = () => {
    // Require a specific day to be selected in the calendar/page route
    if (!date || date === 'all') {
      setError('Please select a specific date from the calendar to add data.');
      return;
    }
    setFormTitle('');
    setFormBudget('');
    setFormAdTypeId('');
    // Use the selected route date
    setFormDate(date);
    setIsCreateOpen(true);
  };

  const openEdit = (id: string) => {
    // id here should be advertisementId (business id), not Mongo _id
    setEditId(id);
    const current = ads.find((a) => a.advertisementId === id);
    setFormTitle(current?.notes ?? '');
    setFormBudget(current?.budget != null ? String(current.budget) : '');
    setFormAdTypeId(current?.advertisementTypeId ?? '');
    const src = current?.advertisementDate || '';
    const day = src.includes('T') ? src.split('T')[0] : src;
    setFormDate(day || format(new Date(), 'yyyy-MM-dd'));
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    if (!formDate) {
      setError('Date is required');
      return;
    }
    const payload = {
      notes: formTitle.trim(),
      budget: Number(formBudget) || 0,
      advertisementDate: formDate,
      advertisementTypeId: formAdTypeId,
    };
    if (!formAdTypeId || !payload.notes || !(payload.budget > 0)) {
      setError('Advertisement type is required (select a valid type), notes are required, and budget must be greater than 0');
      return;
    }
    // (reverted: no budget limit blocking in UI)
    try {
      setLoading(true);
      setError(null);
      await createAd(payload);
      setIsCreateOpen(false);
      await loadAds();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create advertisement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    const payload = {
      notes: formTitle.trim(),
      budget: Number(formBudget) || 0,
      advertisementTypeId: formAdTypeId || undefined,
    };
    if (!formAdTypeId || !payload.notes || !(payload.budget > 0)) {
      setError('Advertisement type is required (select a valid type), notes are required, and budget must be greater than 0');
      return;
    }
    // (removed budget limit enforcement)
    try {
      setLoading(true);
      setError(null);
      await updateAd(editId, payload);
      setIsEditOpen(false);
      await loadAds();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update advertisement');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Advertisement>[] = useMemo(
    () => [
      {
        id: 'advertisementType',
        header: 'Advertisement Type',
        accessorKey: 'advertisementTypeId',
        cell: ({ row }) => {
          const item = row.original;
          const key = String(item.advertisementTypeId || '');
          const label = adTypeNameById.get(key) || adTypeNameById.get(key.toLowerCase()) || item.advertisementType || '-';
          return <span>{label}</span>;
        },
      },
      {
        id: 'notes',
        header: 'Notes',
        accessorKey: 'notes',
      },
      {
        id: 'budget',
        header: 'Budget',
        accessorKey: 'budget',
        cell: ({ row }) => <span>{row.original.budget}</span>,
      },
      {
        id: 'actions',
        header: () => <div className="flex justify-end">Actions</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(item.advertisementId)}>Edit</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [adTypeNameById]
  );

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Advertisement" />

      {/* Back navigation (match Outlet/Breadcrumb style) */}
      <div className="flex items-center justify-start">
        <Link
          href={NavKeys.Advertisement}
          className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="w-full rounded-lg bg-white p-6">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">View Advertisements</h1>
            <div className="text-muted-foreground text-sm">{dateLabel}</div>
          </div>
          <Button onClick={openCreate} disabled={loading}>
            Add Data
          </Button>
        </div>
        {loading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Loading…
          </div>
        ) : (
          <DataTable
            tableId="advertisement_view"
            columns={columns}
            data={list}
          />
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[80vh] w-full max-w-[910px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Advertisement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="adv-type">Advertisement Type</Label>
              <Select value={formAdTypeId} onValueChange={setFormAdTypeId}>
                <SelectTrigger id="adv-type" className="w-full">
                  <SelectValue placeholder="Select advertisement type" />
                </SelectTrigger>
                <SelectContent>
                  {adTypes.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">No types found. Please create types in Master Records.</div>
                  ) : (
                    adTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Date is inferred from the selected calendar date (route). Hidden in Create. */}
            <div className="grid gap-2">
              <Label htmlFor="adv-title">Notes</Label>
              <Input id="adv-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adv-budget">Budget</Label>
              <Input
                id="adv-budget"
                type="number"
                step="0.01"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleCreate} disabled={loading || !formAdTypeId || !formTitle.trim() || !(Number(formBudget) > 0)}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[80vh] w-full max-w-[910px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Advertisement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-adv-type">Advertisement Type</Label>
              <Select value={formAdTypeId} onValueChange={setFormAdTypeId}>
                <SelectTrigger id="edit-adv-type" className="w-full">
                  <SelectValue placeholder="Select advertisement type" />
                </SelectTrigger>
                <SelectContent>
                  {adTypes.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">No types found. Please create types in Master Records.</div>
                  ) : (
                    adTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Date is selected via calendar; hidden in Edit as well. */}
            <div className="grid gap-2">
              <Label htmlFor="edit-adv-title">Notes</Label>
              <Input id="edit-adv-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-adv-budget">Budget</Label>
              <Input
                id="edit-adv-budget"
                type="number"
                step="0.01"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={loading || !formAdTypeId || !formTitle.trim() || !(Number(formBudget) > 0)}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
