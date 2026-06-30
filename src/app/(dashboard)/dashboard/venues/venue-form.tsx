'use client';

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconUpload, IconMapPin, IconX, IconInfoCircle, IconCheck, IconEdit, IconBuilding } from "@tabler/icons-react";
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
import { fetchCities, type City } from "@/services/cities.service";
import { fetchCountries, type Country } from "@/services/countries.service";
import { createVenue, updateVenue } from "@/services/venue.service";
import { toast } from "sonner";
import { useFileUpload } from "@/features/common/hooks/useFileUpload";
import dynamic from "next/dynamic";

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
  
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [saving, setSaving] = useState(false);

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
  });

  const [interestInput, setInterestInput] = useState("");

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
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const data = await fetchCities();
        setCities(data);
      } catch (err: any) {
        console.error("Failed to load cities:", err);
      } finally {
        setLoadingCities(false);
      }
    };
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
    loadCities();
    loadCountries();
  }, []);

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

  const addInterest = () => {
    const trimmedInput = interestInput.trim();
    if (trimmedInput && !formData.interests.includes(trimmedInput)) {
      setFormData(prev => ({
        ...prev,
        interests: [...(prev.interests || []), trimmedInput]
      }));
      setInterestInput("");
    }
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

      const payload = {
        name: formData.name.trim(),
        cityId: formData.cityId,
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        addressLine1: formData.addressLine1.trim(),
        region: formData.region.trim(),
        country: formData.country || "IN",
        isVisible: formData.isVisible !== false,
        coverImageS3FileName: coverImageS3FileName,
        isPartner: formData.isPartner || false,
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

          {/* Commented out as it is not needed in creating the venue */}
          {/* 
          <div className="glass-card p-6 flex flex-col gap-4">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconInfoCircle size={18} className="text-primary" />
              Interests & Attributes
            </Label>
            
            <div className="flex flex-wrap gap-2 min-h-[100px] p-4 rounded-2xl bg-muted/20 border border-border/50 content-start shadow-inner">
              {formData.interests.length > 0 ? (
                formData.interests.map((interest: string, index: number) => (
                  <span 
                    key={index} 
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl border border-primary/20 animate-in zoom-in duration-300"
                  >
                    {interest}
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
                  <p className="text-sm italic">No interests tagged yet</p>
                </div>
              )}
            </div>

            {!isViewing && (
              <div className="flex gap-2">
                <Input 
                  placeholder="Type an interest..." 
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                  className="rounded-xl"
                />
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={addInterest}
                  className="rounded-xl px-6"
                >
                  Add
                </Button>
              </div>
            )}
          </div>
          */}
          <div className="glass-card p-6 flex flex-col gap-6">
            <Label className="text-base font-bold flex items-center gap-2">
              <IconInfoCircle size={18} className="text-primary" />
              Venue Settings
            </Label>
            
             <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 shadow-inner">
                <div>
                  <Label htmlFor="isFeature" className="font-bold text-base cursor-pointer">Featured Venue</Label>
                  <p className="text-sm text-muted-foreground">Display this venue prominently on the main page</p>
                </div>
                <Switch
                  id="isFeature"
                  checked={formData.isFeature}
                  onCheckedChange={(c) => handleSwitchChange("isFeature", c)}
                  disabled={isViewing}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 shadow-inner">
                <div>
                  <Label htmlFor="isPartner" className="font-bold text-base cursor-pointer">Partner Venue</Label>
                  <p className="text-sm text-muted-foreground">Mark this venue as an official partner</p>
                </div>
                <Switch
                  id="isPartner"
                  checked={formData.isPartner}
                  onCheckedChange={(c) => handleSwitchChange("isPartner", c)}
                  disabled={isViewing}
                />
              </div>

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
                <Label htmlFor="description" className="text-base font-bold">Venue Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Provide a detailed description of the venue, its features, and history..." 
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
                    <Select
                      value={formData.cityId || undefined}
                      onValueChange={(selectedId) => {
                        const selectedCity = cities.find(c => String(c.cityId ?? c.city_id ?? c.id) === selectedId);
                        setFormData(prev => ({
                          ...prev,
                          cityId: selectedId,
                          city: selectedCity ? selectedCity.name : "",
                          country: selectedCity?.country?.code || selectedCity?.country_code || prev.country
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full h-11 rounded-xl bg-[#171717] border-border/50">
                        <SelectValue placeholder="Select operational city..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => {
                          const idValue = c.cityId ?? c.city_id ?? c.id;
                          if (idValue === undefined || idValue === null) return null;
                          const cid = String(idValue);
                          const countryCode = c.country?.code ?? c.country_code ?? "";
                          return (
                            <SelectItem key={cid} value={cid}>
                              {c.name} {countryCode ? `(${countryCode})` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
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
