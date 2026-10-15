'use client';

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconCalendarEvent, IconEdit, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailPageContainer, DetailPageHeader, detailStyles, listingStyles } from "@/components/shared/listing-page";
import { useFileUpload } from "@/features/common/hooks/useFileUpload";
import { fetchVenues, type Venue } from "@/services/venue.service";
import {
  createAdminEvent,
  deleteAdminEvent,
  updateAdminEvent,
  type AdminEvent,
  type AdminEventAudience,
  type AdminEventPayload,
} from "@/services/admin-event.service";
import { describeEarlyAccess, describeVisibility } from "./visibility";

type Mode = "create" | "edit" | "view";

const toDate = (iso: string | null | undefined) => (iso ? new Date(iso) : undefined);

export function EventForm({ initialData, mode }: { initialData?: AdminEvent; mode: Mode }) {
  const router = useRouter();
  const isViewing = mode === "view";
  const { uploadFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [venueId, setVenueId] = useState(initialData?.venue?.id ?? "");
  const [locationName, setLocationName] = useState(initialData?.locationName ?? "");
  const [startsAt, setStartsAt] = useState(toDate(initialData?.startsAt));
  const [endsAt, setEndsAt] = useState(toDate(initialData?.endsAt));
  const [visibleUntil, setVisibleUntil] = useState(toDate(initialData?.visibleUntil));
  const [lumaUrl, setLumaUrl] = useState(initialData?.lumaUrl ?? "");
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false);
  const [audience, setAudience] = useState<AdminEventAudience>(initialData?.audience ?? "everyone");
  const [earlyAccess, setEarlyAccess] = useState(!!initialData?.generalAccessAt);
  const [generalAccessAt, setGeneralAccessAt] = useState(toDate(initialData?.generalAccessAt));
  const [coverKey, setCoverKey] = useState<string | null>(initialData?.coverImageS3FileName ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.coverImageUrl ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVenues({ page: 1, limit: 100 })
      .then(setVenues)
      .catch(() => toast.error("Could not load venues"));
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setCoverFile(null);
    setCoverKey(null);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Early access only applies when everyone can join; members-only is already members-first.
  const hasEarlyAccess = audience === "everyone" && earlyAccess;

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!startsAt || !endsAt) return toast.error("Start and end time are required");
    if (endsAt <= startsAt) return toast.error("End time must be after start time");
    if (!/^https:\/\/\S+$/i.test(lumaUrl.trim())) return toast.error("Luma link must be a https:// URL");
    if (hasEarlyAccess && !generalAccessAt) return toast.error("Pick when the event opens to everyone");
    if (hasEarlyAccess && generalAccessAt && generalAccessAt >= endsAt) {
      return toast.error("Opening to everyone must be before the event ends");
    }

    setSaving(true);
    try {
      const coverImageS3FileName = coverFile
        ? await uploadFile.mutateAsync({ file: coverFile, folder: "eventimages" })
        : coverKey;

      const payload: AdminEventPayload = {
        title: title.trim(),
        description: description.trim() || null,
        venueId: venueId || null,
        locationName: locationName.trim() || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        visibleUntil: visibleUntil?.toISOString() ?? null,
        coverImageS3FileName,
        lumaUrl: lumaUrl.trim(),
        isPublished,
        audience,
        generalAccessAt: hasEarlyAccess && generalAccessAt ? generalAccessAt.toISOString() : null,
      };

      if (mode === "edit" && initialData) {
        await updateAdminEvent(initialData.id, payload);
        toast.success(`Updated event: ${payload.title}`);
      } else {
        await createAdminEvent(payload);
        toast.success(`Created event: ${payload.title}`);
      }
      router.push("/dashboard/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !window.confirm(`Delete "${initialData.title}"? It disappears from the app.`)) return;
    try {
      await deleteAdminEvent(initialData.id);
      toast.success("Event deleted");
      router.push("/dashboard/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  const visibilityText = describeVisibility(startsAt, endsAt, visibleUntil);
  const earlyAccessText = hasEarlyAccess ? describeEarlyAccess(startsAt, generalAccessAt) : null;
  const hideAt = visibleUntil ?? endsAt;
  const alreadyHidden = !!hideAt && hideAt <= new Date();

  // The saved venue stays selectable even if it is past the first 100 venues loaded.
  const venueOptions = [
    { value: "", label: "No venue" },
    ...(initialData?.venue && !venues.some((v) => v.id === initialData.venue?.id)
      ? [{ value: initialData.venue.id, label: initialData.venue.name }]
      : []),
    ...venues.filter((v) => v.id).map((v) => ({ value: v.id!, label: v.name })),
  ];

  const pageTitle = isViewing ? initialData?.title || "Event Details" : mode === "edit" ? "Edit Event" : "Create Event";

  return (
    <DetailPageContainer className="max-w-[1200px]">
      <DetailPageHeader
        icon={IconCalendarEvent}
        title={pageTitle}
        subtitle="Pinned to the top of All Moments in the app. Tickets are sold on Luma."
        onBack={() => router.push("/dashboard/events")}
        backLabel="Back to Events"
        trailing={
          isViewing ? (
            <>
              <Button
                variant="outline"
                onClick={handleDelete}
                className={`${detailStyles.outlineButton} flex items-center gap-1.5`}
              >
                <IconTrash size={14} className="text-rose-400" />
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/events?id=${initialData?.id}&edit=true`)}
                className={`${detailStyles.outlineButton} flex items-center gap-1.5`}
              >
                <IconEdit size={14} className="text-[#d8b4fe]" />
                Edit
              </Button>
            </>
          ) : (
            <Button onClick={handleSave} disabled={saving} className={listingStyles.primaryButton}>
              {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Event"}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col gap-4">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconUpload size={18} className="text-primary" />
              Cover Image
            </Label>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            {coverPreview ? (
              <div className="relative group rounded-2xl overflow-hidden border border-border/50 aspect-video bg-muted/50">
                <img src={coverPreview} alt="Event cover" className="w-full h-full object-cover" />
                {!isViewing && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="sm" className="gap-2 rounded-full px-6" onClick={removeImage}>
                      <IconX size={18} />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`border-2 border-dashed border-border/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 aspect-video bg-muted/20 ${isViewing ? "" : "cursor-pointer hover:border-primary/50"}`}
                onClick={() => !isViewing && fileInputRef.current?.click()}
              >
                <IconUpload size={32} className="text-primary" />
                <p className="text-sm text-muted-foreground">{isViewing ? "No image" : "Click to upload"}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-6 flex items-center justify-between">
            <div>
              <Label htmlFor="isPublished" className="font-bold text-base cursor-pointer">Published</Label>
              <p className="text-sm text-muted-foreground">Show this event in the app</p>
            </div>
            <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} disabled={isViewing} />
          </div>

          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="grid gap-3">
              <Label className="font-bold text-base">Who can join</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as AdminEventAudience)} disabled={isViewing}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-[#171717] border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="members_only">Members only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {audience === "everyone"
                  ? "Everyone sees the card and can join."
                  : "Everyone sees the card. Guests must become members to join."}
              </p>
            </div>

            {audience === "everyone" && (
              <>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <Label htmlFor="earlyAccess" className="font-bold text-base cursor-pointer">Member early access</Label>
                    <p className="text-sm text-muted-foreground">Members can join before everyone else</p>
                  </div>
                  <Switch id="earlyAccess" checked={earlyAccess} onCheckedChange={setEarlyAccess} disabled={isViewing} />
                </div>
                {earlyAccess && (
                  <div className="grid gap-3">
                    <Label className="font-bold">Opens to everyone at</Label>
                    <DateTimePicker
                      value={generalAccessAt}
                      onChange={setGeneralAccessAt}
                      placeholder="Pick when guests can join"
                      disabled={isViewing}
                    />
                    {earlyAccessText && (
                      <p className="text-sm text-[#d8b4fe] bg-[#1c122c]/60 border border-[#3b1a60]/50 rounded-lg px-3 py-2">
                        {earlyAccessText}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 glass-card p-8 flex flex-col gap-6">
          <div className="grid gap-3">
            <Label htmlFor="title" className="text-base font-bold">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} readOnly={isViewing} maxLength={120} className="h-12 text-lg rounded-xl" placeholder="e.g. Circles Launch Night" />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="description" className="text-base font-bold">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} readOnly={isViewing} maxLength={2000} className="min-h-28 rounded-xl resize-none" />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="venueId" className="font-bold">Venue</Label>
              <SearchableSelect
                options={venueOptions}
                value={venueId}
                onValueChange={setVenueId}
                placeholder="Select venue..."
                searchPlaceholder="Search venues..."
                emptyMessage="No venues found."
                disabled={isViewing}
                className="h-11 rounded-xl bg-[#171717] border-border/50 hover:bg-[#222]"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="locationName" className="font-bold">Location name</Label>
              <Input id="locationName" value={locationName} onChange={(e) => setLocationName(e.target.value)} readOnly={isViewing} maxLength={255} placeholder="Used when no venue is picked" className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label className="font-bold">Starts</Label>
              <DateTimePicker value={startsAt} onChange={setStartsAt} placeholder="Pick start" disabled={isViewing} />
            </div>
            <div className="grid gap-3">
              <Label className="font-bold">Ends</Label>
              <DateTimePicker value={endsAt} onChange={setEndsAt} placeholder="Pick end" disabled={isViewing} />
            </div>
          </div>

          <div className="grid gap-3">
            <Label className="font-bold">Visible in app until</Label>
            <DateTimePicker
              value={visibleUntil}
              onChange={setVisibleUntil}
              placeholder="When the event ends (default)"
              disabled={isViewing}
              clearable
            />
            {visibilityText && (
              <p className="text-sm text-[#d8b4fe] bg-[#1c122c]/60 border border-[#3b1a60]/50 rounded-lg px-3 py-2">
                {visibilityText}
              </p>
            )}
            {alreadyHidden && (
              <p className="text-xs text-amber-400">That time has passed, so the card is not shown in the app.</p>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="lumaUrl" className="font-bold">Luma link</Label>
            <Input id="lumaUrl" value={lumaUrl} onChange={(e) => setLumaUrl(e.target.value)} readOnly={isViewing} placeholder="https://lu.ma/..." className="h-11 rounded-xl" />
          </div>
        </div>
      </div>
    </DetailPageContainer>
  );
}
