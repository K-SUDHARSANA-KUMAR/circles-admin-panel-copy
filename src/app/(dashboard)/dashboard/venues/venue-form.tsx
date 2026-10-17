'use client';

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconUpload, IconMapPin, IconX, IconInfoCircle, IconCheck, IconEdit, IconBuilding, IconBeer } from "@tabler/icons-react";
import { DetailPageContainer, DetailPageHeader, detailStyles, listingStyles } from "@/components/shared/listing-page";
import { useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type City } from "@/services/cities.service";
import { fetchCountries, type Country } from "@/services/countries.service";
import { createVenue, updateVenue, fetchVenueCategories, createVenueCategory, type VenueCategory, type PerkPeriod } from "@/services/venue.service";
import { fetchAllInterests, type InterestOption } from "@/services/interest.service";
import { toast } from "sonner";
import { useFileUpload } from "@/features/common/hooks/useFileUpload";
import { InfiniteScrollCitySelect } from "@/components/ui/infinite-scroll-city-select";
import dynamic from "next/dynamic";
import { VenuePerkActivity } from "./venue-perk-activity";

/** Highest per-member redeem limit the API accepts. */
const PERK_LIMIT_MAX = 100;

// Dynamically import map components to avoid SSR/window undefined issues
const LocationPickerModal = dynamic(
  () => import("@/components/modals/location-picker-modal").then((m) => m.LocationPickerModal),
  { ssr: false }
);

const MapComponent = dynamic(
  () => import("@/components/modals/map-component"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex items-center justify-center bg-muted/20 rounded-xl border border-border/50">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Loading map preview...
        </span>
      </div>
    ),
  }
);

export interface Venue {
  id?: string;
  name: string;
  image: string | null;
  imageFile?: File | null;
  location?: string;
  addressLine1: string;
  city: string;
  cityId?: string;
  region: string;
  area?: string;
  subCategory?: string;
  categorySlug?: string;
  country?: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  interests: string[];
  description: string;
  capacity?: number;
  status?: string;
  manager?: string;
  isFeature?: boolean;
  isPartner?: boolean;
  isVisible?: boolean;
  coverImageS3FileName?: string;
  perkImage?: string | null;
  perkImageFile?: File | null;
  perkImageS3FileName?: string | null;
  perkEnabled?: boolean;
  perkTitle?: string;
  perkSubtitle?: string;
  perkLimit?: number | null;
  perkPeriod?: PerkPeriod | null;
  createdAt?: string;
  updatedAt?: string;
  popularity?: number;
  popularityScore?: number;
}

interface VenueFormProps {
  initialData?: Venue;
  mode: 'create' | 'edit' | 'view';
}

export const VenueForm = ({ initialData, mode }: VenueFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uploadFile } = useFileUpload();
  const venueIdFromUrl = searchParams.get("id");

  // Determine if we are in edit mode based on URL or initial mode
  const isEditFromUrl = searchParams.get("edit") === "true";
  const currentMode = mode === "create" ? "create" : (isEditFromUrl ? "edit" : "view");
  const isViewing = currentMode === "view";
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const perkInputRef = useRef<HTMLInputElement>(null);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [saving, setSaving] = useState(false);

  // Venue categories come from the backend table (not a hardcoded list), with a
  // provision to add a new one inline.
  const [categories, setCategories] = useState<VenueCategory[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    fetchVenueCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Existing interests catalog — mapped onto the venue (stored as interest ids,
  // matching how user profiles store their interests).
  const [allInterests, setAllInterests] = useState<InterestOption[]>([]);
  useEffect(() => {
    fetchAllInterests().then(setAllInterests).catch(() => setAllInterests([]));
  }, []);

  const interestLabel = (id: string) =>
    allInterests.find((i) => i.id === id)?.name || id;

  const addInterestId = (id: string) => {
    if (!id) return;
    setFormData((prev) =>
      (prev.interests || []).includes(id)
        ? prev
        : { ...prev, interests: [...(prev.interests || []), id] },
    );
  };

  /*
  const handleAddCategory = async () => {
    const label = (typeof window !== "undefined"
      ? window.prompt("New category name")
      : "")?.trim();
    if (!label) return;
    setAddingCategory(true);
    try {
      const created = await createVenueCategory(label);
      setCategories((prev) =>
        prev.some((c) => c.slug === created.slug) ? prev : [...prev, created],
      );
      setFormData((prev) => ({ ...prev, categorySlug: created.slug }));
      toast.success(`Added category: ${created.label}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };
  */

  // Map state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [formData, setFormData] = useState<Venue>({
    id: initialData?.id || "",
    name: initialData?.name || "",
    image: initialData?.image || null,
    imageFile: null,
    addressLine1: initialData?.addressLine1 || "",
    city: initialData?.city || "",
    cityId: initialData?.cityId || "",
    region: initialData?.region || "",
    area: initialData?.area || "",
    subCategory: initialData?.subCategory || "",
    categorySlug: initialData?.categorySlug || "",
    country: initialData?.country || "",
    postalCode: initialData?.postalCode || "",
    latitude: initialData?.latitude || "",
    longitude: initialData?.longitude || "",
    interests: initialData?.interests || [],
    description: initialData?.description || "",
    isFeature: initialData?.isFeature || false,
    isPartner: initialData?.isPartner || false,
    isVisible: initialData?.isVisible !== undefined ? initialData.isVisible : true,
    coverImageS3FileName: initialData?.coverImageS3FileName || "",
    perkImage: initialData?.perkImage || null,
    perkImageFile: null as File | null,
    perkImageS3FileName: initialData?.perkImageS3FileName || null,
    perkEnabled: initialData?.perkEnabled !== false,
    perkTitle: initialData?.perkTitle || "",
    perkSubtitle: initialData?.perkSubtitle || "",
  });

  // Redeem limit inputs. Empty = no limit set, so the perk cannot be redeemed yet.
  const [perkLimitText, setPerkLimitText] = useState(
    initialData?.perkLimit ? String(initialData.perkLimit) : "",
  );
  const [perkPeriodInput, setPerkPeriodInput] = useState<PerkPeriod | "">(
    initialData?.perkPeriod || "",
  );


  // Check if coordinates are valid numbers and not zero
  const latNum = parseFloat(formData.latitude);
  const lngNum = parseFloat(formData.longitude);
  const hasValidCoordinates = !isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0;
  const mapCoords = hasValidCoordinates ? { lat: latNum, lng: lngNum } : undefined;

  const handleLocationSelect = (coordinates: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: String(coordinates.lat),
      longitude: String(coordinates.lng),
    }));
  };

  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        let allCountries: Country[] = [];
        let skip = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          const data = await fetchCountries({ limit, skip });
          allCountries = [...allCountries, ...data];
          const totalItems = (data as any).totalItems ?? data.length;
          if (data.length < limit || allCountries.length >= totalItems) {
            hasMore = false;
          } else {
            skip += limit;
          }
        }
        setCountries(allCountries);
      } catch (err: any) {
        console.error("Failed to load countries:", err);
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, []);

  // Resolve the selected country's ID for the city dropdown
  const selectedCountryId = React.useMemo(() => {
    if (!formData.country || countries.length === 0) return undefined;
    const country = countries.find(c => c.code?.toUpperCase() === formData.country!.toUpperCase());
    if (!country) return undefined;
    return String(country.countryId ?? country.country_id ?? country.id);
  }, [formData.country, countries]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (field: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ 
        ...prev, 
        image: previewUrl,
        imageFile: file 
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const removeImage = () => {
    if (formData.image && typeof formData.image === 'string' && formData.image.startsWith('blob:')) {
      URL.revokeObjectURL(formData.image);
    }
    setFormData((prev) => ({ ...prev, image: null, imageFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Perk artwork — the same upload path as the cover, kept separate because the
  // perk image is what the mobile map draws in place of the venue's photo.
  const handlePerkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Perk image must be an image file");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      perkImage: URL.createObjectURL(file),
      perkImageFile: file,
    }));
  };

  const removePerkImage = () => {
    if (typeof formData.perkImage === "string" && formData.perkImage.startsWith("blob:")) {
      URL.revokeObjectURL(formData.perkImage);
    }
    setFormData((prev) => ({ ...prev, perkImage: null, perkImageFile: null }));
    if (perkInputRef.current) perkInputRef.current.value = "";
  };

  const removeInterest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      interests: (prev.interests || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Venue Name is required");
      return;
    }
    if (!formData.cityId) {
      toast.error("City is required. Please select a city.");
      return;
    }
    if (!formData.addressLine1.trim()) {
      toast.error("Address Line 1 is required");
      return;
    }
    const perkLimit = perkLimitText.trim() ? Number(perkLimitText.trim()) : null;
    const perkPeriod = perkPeriodInput || null;
    if (
      perkLimit !== null &&
      (!Number.isInteger(perkLimit) || perkLimit < 1 || perkLimit > PERK_LIMIT_MAX)
    ) {
      toast.error(`Redeem limit must be a whole number from 1 to ${PERK_LIMIT_MAX}`);
      return;
    }
    if ((perkLimit === null) !== (perkPeriod === null)) {
      toast.error("Set both the redeem limit and how often it resets, or leave both empty");
      return;
    }

    setSaving(true);
    try {
      let coverImageS3FileName = formData.image ? (formData.coverImageS3FileName || "") : "";
      if (formData.imageFile) {
        // Upload image to S3 first
        coverImageS3FileName = await uploadFile.mutateAsync({
          file: formData.imageFile,
          folder: "venuesimages",
        });
      }

      // Clearing the image is how a deal ends: null wipes metadata.perkImageS3FileName.
      let perkImageS3FileName: string | null = formData.perkImage
        ? formData.perkImageS3FileName || null
        : null;
      if (formData.perkImageFile) {
        perkImageS3FileName = await uploadFile.mutateAsync({
          file: formData.perkImageFile,
          folder: "venueperkimages",
        });
      }

      const payload = {
        name: formData.name.trim(),
        cityId: formData.cityId,
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        addressLine1: formData.addressLine1.trim(),
        region: formData.region.trim(),
        area: formData.area?.trim() || undefined,
        categorySlug: formData.categorySlug?.trim() || undefined,
        postalCode: formData.postalCode?.trim() || undefined,
        interests: formData.interests || [],
        // sub-category is now captured via mapped interests (removed as a field)
        country: formData.country || "IN",
        isVisible: formData.isVisible !== false,
        coverImageS3FileName: coverImageS3FileName,
        perkImageS3FileName,
        perkEnabled: formData.perkEnabled !== false,
        // Blank means "use the app's own wording", so send null rather than "".
        perkTitle: formData.perkTitle?.trim() || null,
        perkSubtitle: formData.perkSubtitle?.trim() || null,
        // Both null = no limit set, so the app shows the perk but cannot redeem it.
        perkLimit,
        perkPeriod,
        description: formData.description.trim(),
      };

      if (currentMode === "edit") {
        if (!formData.id) throw new Error("Venue ID is missing for update");
        await updateVenue(formData.id, payload);
        toast.success(`Successfully updated venue: ${formData.name}`);
      } else {
        await createVenue(payload);
        toast.success(`Successfully created venue: ${formData.name}`);
      }
      
      router.push("/dashboard/venues");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save venue");
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isViewing
    ? formData.name || "Venue Details"
    : currentMode === "edit"
      ? "Edit Venue"
      : "Create New Venue";

  const pageSubtitle = isViewing
    ? "Viewing detailed information about this venue"
    : currentMode === "edit"
      ? "Update existing venue information"
      : "Add a new destination to your circle";

  const handleBackToVenues = () => router.push("/dashboard/venues");


  return (
    <DetailPageContainer className="max-w-[1600px]">
      <DetailPageHeader
        icon={IconBuilding}
        title={pageTitle}
        subtitle={pageSubtitle}
        onBack={handleBackToVenues}
        backLabel="Back to Venues"
        trailing={
          isViewing ? (
            <Button
              variant="outline"
              onClick={() => {
                const id = formData.id || venueIdFromUrl;
                if (!id) return;
                router.push(`/dashboard/venues?id=${id}&edit=true`);
              }}
              className={`${detailStyles.outlineButton} flex items-center gap-1.5`}
            >
              <IconEdit size={14} className="text-[#d8b4fe]" />
              Edit Venue
            </Button>
          ) : (
            <>
              {currentMode === "edit" && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const id = formData.id || venueIdFromUrl;
                    if (!id) {
                      handleBackToVenues();
                      return;
                    }
                    router.push(`/dashboard/venues?id=${id}`);
                  }}
                  className="h-8 px-4 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`${listingStyles.primaryButton} disabled:opacity-70`}
              >
                {saving ? (
                  <span className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                ) : (
                  <IconCheck size={20} />
                )}
                {saving ? "Saving..." : currentMode === 'edit' ? "Update Venue" : "Save Venue"}
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image & Interests */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-6 flex flex-col gap-4">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconUpload size={18} className="text-primary" />
              Venue Image
            </Label>
            
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleImageChange}
            />
            
            {formData.image ? (
              <div className="relative group rounded-2xl overflow-hidden border border-border/50 aspect-video bg-muted/50 shadow-2xl">
                <img 
                  src={formData.image as string} 
                  alt="Venue preview" 
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                  <h4 className="text-white font-bold text-xl drop-shadow-lg truncate">
                    {formData.name || "Unnamed Venue"}
                  </h4>
                </div>

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {!isViewing && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="gap-2 rounded-full px-6"
                      onClick={removeImage}
                    >
                      <IconX size={18} />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : !isViewing ? (
              <div 
                className="relative border-2 border-dashed border-border/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all aspect-video overflow-hidden shadow-inner bg-muted/20"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <IconUpload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1 text-balance">High-quality landscape images work best</p>
                </div>
                
                {formData.name && (
                  <div className="absolute top-4 left-4 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 backdrop-blur-md">
                    <span className="text-xs font-bold text-primary tracking-wider uppercase">{formData.name}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative border border-border/50 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 bg-muted/20 aspect-video overflow-hidden shadow-inner">
                <IconUpload size={48} className="text-muted-foreground/30" />
                <span className="text-base text-muted-foreground/50 font-medium">No image provided</span>
                
                {formData.name && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-muted/40 backdrop-blur-xl border-t border-border/50 text-center">
                    <h4 className="text-foreground/90 font-bold text-xl tracking-tight">
                      {formData.name}
                    </h4>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Perk artwork — its presence is the perk. The mobile map swaps the
              venue's pin for this image and shows it to members only. */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconBeer size={18} className="text-primary" />
              Venue Perk
            </Label>
            <p className="text-xs text-muted-foreground -mt-2">
              Brand mark shown on the members&apos; map. Square PNG, transparent
              background.
            </p>

            {/* Perk headline and subtitle — configurable with or without artwork */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perkTitle" className="text-sm font-semibold">Headline</Label>
                <Input
                  id="perkTitle"
                  name="perkTitle"
                  value={formData.perkTitle || ""}
                  onChange={handleInputChange}
                  disabled={isViewing}
                  maxLength={60}
                  placeholder="Free perk for members"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perkSubtitle" className="text-sm font-semibold">Subtitle</Label>
                <Input
                  id="perkSubtitle"
                  name="perkSubtitle"
                  value={formData.perkSubtitle || ""}
                  onChange={handleInputChange}
                  disabled={isViewing}
                  maxLength={160}
                  placeholder="Show your membership to claim it."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Shown on the venue screen in the app. Leave blank to use the
                app&apos;s default wording.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/20 border border-border/50 p-4">
              <div>
                <p className="text-sm font-bold">Perk live</p>
                <p className="text-xs text-muted-foreground">
                  Turn off to pause the deal without deleting the perk details.
                </p>
              </div>
              <Switch
                checked={formData.perkEnabled !== false}
                disabled={isViewing}
                onCheckedChange={(c) => handleSwitchChange("perkEnabled", c)}
              />
            </div>

            {/* Per-member redeem limit. Counted per venue, per UK calendar period. */}
            <div className="flex flex-col gap-3 rounded-2xl bg-muted/20 border border-border/50 p-4">
              <div>
                <p className="text-sm font-bold">Redeem limit</p>
                <p className="text-xs text-muted-foreground">
                  How many times one member can redeem this perk here, e.g. 2 per
                  month. Leave both empty while the deal is not agreed: members see
                  the perk but cannot redeem it.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="perkLimit" className="text-sm font-semibold">Times per member</Label>
                  <Input
                    id="perkLimit"
                    name="perkLimit"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={PERK_LIMIT_MAX}
                    step={1}
                    value={perkLimitText}
                    onChange={(e) => setPerkLimitText(e.target.value)}
                    disabled={isViewing}
                    placeholder="Not set"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-semibold">Resets every</Label>
                  <Select
                    value={perkPeriodInput || "none"}
                    disabled={isViewing}
                    onValueChange={(v) => setPerkPeriodInput(v === "none" ? "" : (v as PerkPeriod))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="day">Day (midnight)</SelectItem>
                      <SelectItem value="week">Week (Monday)</SelectItem>
                      <SelectItem value="month">Month (the 1st)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Resets on UK time. A change applies to the next redeem.
              </p>
            </div>

            <input
              type="file"
              ref={perkInputRef}
              className="hidden"
              accept="image/*"
              onChange={handlePerkImageChange}
            />

            {formData.perkImage ? (
              <div className="relative group rounded-2xl overflow-hidden border border-border/50 aspect-square max-w-[220px] bg-muted/50 shadow-xl flex items-center justify-center">
                <img
                  src={
                    typeof formData.perkImage === "string" &&
                    !formData.perkImage.startsWith("http") &&
                    !formData.perkImage.startsWith("blob:")
                      ? `https://d2jialh2zz1lcb.cloudfront.net/${formData.perkImage.replace(/^\/+/, "")}`
                      : (formData.perkImage as string)
                  }
                  alt="Venue perk"
                  className="w-full h-full object-contain p-4"
                />
                {!isViewing && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 rounded-full px-6"
                      onClick={removePerkImage}
                    >
                      <IconX size={18} />
                      Remove artwork
                    </Button>
                  </div>
                )}
              </div>
            ) : !isViewing ? (
              <div
                className="border-2 border-dashed border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all aspect-square max-w-[220px] bg-muted/20 shadow-inner"
                onClick={() => perkInputRef.current?.click()}
              >
                <div className="bg-primary/10 p-4 rounded-full text-primary">
                  <IconBeer size={28} />
                </div>
                <p className="text-sm font-semibold text-center">Add perk image</p>
                <p className="text-xs text-muted-foreground text-center">Square PNG, transparent</p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 aspect-square max-w-[220px] bg-muted/20 shadow-inner">
                <IconBeer size={40} className="text-muted-foreground/30" />
                <span className="text-sm text-muted-foreground/50 font-medium">No perk artwork</span>
              </div>
            )}
          </div>

          {/* Commented out as it is not needed in creating the venue */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconInfoCircle size={18} className="text-primary" />
              Mapped Interests
            </Label>
            <p className="text-xs text-muted-foreground -mt-2">
              Map this venue to interests so it surfaces to users who share them.
            </p>
            
            <div className="flex flex-wrap gap-2 min-h-[100px] p-4 rounded-2xl bg-muted/20 border border-border/50 content-start shadow-inner">
              {formData.interests.length > 0 ? (
                formData.interests.map((slug: string, index: number) => (
                  <span
                    key={slug}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl border border-primary/20 animate-in zoom-in duration-300"
                  >
                    {interestLabel(slug)}
                    {!isViewing && (
                      <button
                        type="button"
                        onClick={() => removeInterest(index)}
                        className="hover:text-destructive transition-colors"
                      >
                        <IconX size={14} />
                      </button>
                    )}
                  </span>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-muted-foreground/50 py-4">
                  <p className="text-sm italic">No interests mapped yet</p>
                </div>
              )}
            </div>

            {!isViewing && (
              <select
                value=""
                onChange={(e) => {
                  addInterestId(e.target.value);
                  e.target.value = "";
                }}
                className="flex h-11 w-full rounded-xl border border-border/50 bg-[#171717] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
              >
                <option value="" className="bg-[#171717]">Map an interest…</option>
                {allInterests
                  .filter((i) => !(formData.interests || []).includes(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id} className="bg-[#171717] text-white">
                      {i.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
          <div className="glass-card p-6 flex flex-col gap-6">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconInfoCircle size={18} className="text-primary" />
              Venue Settings
            </Label>
            
             <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 shadow-inner">
                <div>
                  <Label htmlFor="isVisible" className="font-bold text-base cursor-pointer">Visibility</Label>
                  <p className="text-sm text-muted-foreground">Allow users to see and book this venue</p>
                </div>
                <Switch
                  id="isVisible"
                  checked={formData.isVisible}
                  onCheckedChange={(c) => handleSwitchChange("isVisible", c)}
                  disabled={isViewing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Basic Info & Location */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-card p-8 flex flex-col gap-6">
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name" className="text-base font-bold">Venue Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="e.g. Grand Ballroom" 
                  value={formData.name}
                  onChange={handleInputChange}
                  readOnly={isViewing}
                  className="h-12 text-lg rounded-xl"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="description" className="text-base font-bold">Reviews</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Summary / review of the venue — its vibe, features, and what stands out..."
                  value={formData.description}
                  onChange={handleInputChange}
                  readOnly={isViewing}
                  className="min-h-32 text-base rounded-xl resize-none"
                />
              </div>
            </div>

            <div className="grid gap-6 mt-4 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2">
                <IconMapPin className="text-primary" size={20} />
                <h3 className="text-xl font-bold">Location Details</h3>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="addressLine1" className="font-bold">Address Line 1</Label>
                <Input 
                  id="addressLine1" 
                  name="addressLine1" 
                  placeholder="123 Business Way" 
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  readOnly={isViewing}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="cityId" className="font-bold">City <span className="text-destructive">*</span></Label>
                  {isViewing ? (
                    <Input 
                      id="city" 
                      value={formData.city || "Not Specified"}
                      readOnly
                      className="rounded-xl h-11"
                    />
                  ) : (
                    <InfiniteScrollCitySelect
                      countryId={selectedCountryId}
                      value={formData.cityId || undefined}
                      displayValue={formData.city || undefined}
                      placeholder="Select operational city..."
                      onValueChange={(cityId, cityName, countryCode) => {
                        setFormData(prev => ({
                          ...prev,
                          cityId,
                          city: cityName,
                          country: countryCode || prev.country,
                        }));
                      }}
                    />
                  )}
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="country" className="font-bold">Country</Label>
                  {isViewing ? (
                    <Input 
                      id="country" 
                      value={countries.find(c => c.code === formData.country)?.name || formData.country || "Not Specified"}
                      readOnly
                      className="rounded-xl h-11"
                    />
                  ) : (
                    <Select
                      value={formData.country || undefined}
                      onValueChange={(val) => {
                        setFormData(prev => ({
                          ...prev,
                          country: val,
                          cityId: '',
                          city: '',
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full h-11 rounded-xl bg-[#171717] border-border/50">
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => {
                          const idValue = c.countryId ?? c.country_id ?? c.id;
                          if (idValue === undefined || idValue === null) return null;
                          const cid = String(idValue);
                          const code = c.code;
                          if (!code) return null;
                          return (
                            <SelectItem key={cid} value={code}>
                              {c.name} ({code})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="region" className="font-bold">Region</Label>
                  <Input
                    id="region"
                    name="region"
                    placeholder="Central London"
                    value={formData.region}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="area" className="font-bold">Area / Neighbourhood</Label>
                  <Input
                    id="area"
                    name="area"
                    placeholder="Mayfair"
                    value={formData.area || ""}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="postalCode" className="font-bold">Postal Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    placeholder="W1K 2RX"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="categorySlug" className="font-bold">Category</Label>
                    {/* {!isViewing && (
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={addingCategory}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {addingCategory ? "Adding…" : "+ Add category"}
                      </button>
                    )} */}
                  </div>
                  {isViewing ? (
                    <Input
                      id="categorySlug"
                      value={
                        categories.find((o) => o.slug === formData.categorySlug)?.label ||
                        formData.categorySlug ||
                        "Not Specified"
                      }
                      readOnly
                      className="rounded-xl h-11"
                    />
                  ) : (
                    <select
                      id="categorySlug"
                      name="categorySlug"
                      value={formData.categorySlug || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, categorySlug: e.target.value }))
                      }
                      className="flex h-11 w-full rounded-xl border border-border/50 bg-[#171717] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" className="bg-[#171717]">Select category...</option>
                      {categories.map((o) => (
                        <option key={o.slug} value={o.slug} className="bg-[#171717] text-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="latitude" className="font-bold">Latitude</Label>
                  <Input 
                    id="latitude" 
                    name="latitude" 
                    placeholder="19.0760" 
                    value={formData.latitude}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="longitude" className="font-bold">Longitude</Label>
                  <Input 
                    id="longitude" 
                    name="longitude" 
                    placeholder="72.8777" 
                    value={formData.longitude}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              {/* Map Preview and Location Picker Trigger */}
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold flex items-center gap-1.5">
                    <IconMapPin size={18} className="text-primary" />
                    Map Location
                  </Label>
                  {!isViewing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMapModalOpen(true)}
                      className="gap-1.5 text-xs border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5 rounded-xl px-4 py-2"
                    >
                      <IconMapPin size={14} />
                      Pin on Map
                    </Button>
                  )}
                </div>

                {hasValidCoordinates ? (
                  <div className="h-64 w-full rounded-2xl overflow-hidden border border-border/50 relative z-0 shadow-inner">
                    <MapComponent
                      initialCoordinates={mapCoords}
                      selectedCoordinates={mapCoords}
                      readOnly={true}
                      onLocationSelect={() => {}}
                    />
                  </div>
                ) : (
                  <div className="h-64 w-full rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2.5 bg-muted/10 text-muted-foreground p-6 text-center">
                    <div className="bg-primary/10 p-3 rounded-full text-primary">
                      <IconMapPin size={24} />
                    </div>
                    <div className="max-w-xs">
                      <p className="font-semibold text-foreground text-sm">No Map Pin Set</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Define coordinates above or click below to search and pinpoint this venue on OpenStreetMap.</p>
                    </div>
                    {!isViewing && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsMapModalOpen(true)}
                        className="mt-1.5 rounded-xl px-4"
                      >
                        Set Location Pin
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Who redeemed the perk here, and screenshots taken of the badge. */}
      {currentMode !== "create" && formData.id && (
        <VenuePerkActivity venueId={formData.id} />
      )}

      {/* Location Picker Modal */}
      {!isViewing && (
        <LocationPickerModal
          open={isMapModalOpen}
          onOpenChange={setIsMapModalOpen}
          onLocationSelect={handleLocationSelect}
          initialCoordinates={mapCoords}
        />
      )}
    </DetailPageContainer>
  );
};
