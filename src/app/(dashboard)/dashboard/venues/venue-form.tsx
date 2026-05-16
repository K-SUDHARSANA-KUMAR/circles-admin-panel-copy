'use client';

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconUpload, IconMapPin, IconX, IconInfoCircle, IconArrowLeft, IconCheck, IconEdit } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";

export interface Venue {
  id?: string;
  name: string;
  image: string | null;
  imageFile?: File | null;
  location?: string;
  addressLine1: string;
  city: string;
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
  createdAt?: string;
}

interface VenueFormProps {
  initialData?: Venue;
  mode: 'create' | 'edit' | 'view';
}

export const VenueForm = ({ initialData, mode }: VenueFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Determine if we are in edit mode based on URL or initial mode
  const isEditFromUrl = searchParams.get("edit") === "true";
  const currentMode = mode === "create" ? "create" : (isEditFromUrl ? "edit" : "view");
  const isViewing = currentMode === "view";
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Venue>({
    name: initialData?.name || "",
    image: initialData?.image || null,
    imageFile: null,
    addressLine1: initialData?.addressLine1 || "",
    city: initialData?.city || "",
    region: initialData?.region || "",
    country: initialData?.country || "",
    postalCode: initialData?.postalCode || "",
    latitude: initialData?.latitude || "",
    longitude: initialData?.longitude || "",
    interests: initialData?.interests || [],
    description: initialData?.description || "",
  });

  const [interestInput, setInterestInput] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleSave = () => {
    // In a real app, this would be an API call
    console.log("Saving venue data:", formData);
    router.push("/dashboard/venues");
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/dashboard/venues")}
            className="rounded-full hover:bg-primary/10 hover:text-primary transition-all"
          >
            <IconArrowLeft size={22} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-glow">
              {isViewing ? "Venue Details" : mode === 'edit' ? "Edit Venue" : "Create New Venue"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isViewing ? "Viewing detailed information about this venue" : currentMode === 'edit' ? "Update existing venue information" : "Add a new destination to your circle"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isViewing ? (
            <Button 
              variant="outline"
              onClick={() => router.push(`?edit=true`)}
              className="gap-2 px-6 h-11 text-base font-semibold border-primary/20 hover:border-primary/50 hover:bg-primary/5"
            >
              <IconEdit size={20} className="text-primary" />
              Edit Venue
            </Button>
          ) : (
            <>
              {currentMode === 'edit' && (
                <Button 
                  variant="ghost"
                  onClick={() => router.push('?')}
                  className="h-11 px-6 font-semibold"
                >
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSave}
                className="gap-2 px-8 h-11 text-base font-semibold shadow-lg shadow-primary/20"
              >
                <IconCheck size={20} />
                {currentMode === 'edit' ? "Update Venue" : "Save Venue"}
              </Button>
            </>
          )}
        </div>
      </div>

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
                <div className="flex items-center gap-2">
                  <IconInfoCircle className="text-primary" size={18} />
                  <Label htmlFor="description" className="text-base font-bold">About Venue</Label>
                </div>
                {isViewing ? (
                  <div className="p-6 rounded-2xl bg-muted/20 border border-border/50 text-base leading-relaxed text-foreground/80 shadow-inner">
                    {formData.description || "This venue doesn't have a description yet."}
                  </div>
                ) : (
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Describe the venue, its unique features, and the vibe..." 
                    className="min-h-[160px] resize-none rounded-2xl p-6 text-base"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                )}
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
                  <Label htmlFor="city" className="font-bold">City</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    placeholder="e.g. Mumbai" 
                    value={formData.city}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="region" className="font-bold">Region / State</Label>
                  <Input 
                    id="region" 
                    name="region" 
                    placeholder="e.g. Maharashtra" 
                    value={formData.region}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="postalCode" className="font-bold">Postal Code</Label>
                  <Input 
                    id="postalCode" 
                    name="postalCode" 
                    placeholder="400001" 
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    readOnly={isViewing}
                    className="rounded-xl h-11"
                  />
                </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
