'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useReverseGeocoding } from '@/features/common/hooks/useReverseGeocoding';
import { toast } from 'sonner';

const MapComponent = dynamic(() => import('@/components/modals/map-component'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (coordinates: { lat: number; lng: number }, address?: string, pincode?: string) => void;
  initialCoordinates?: { lat: number; lng: number };
}

export function LocationPickerModal({
  open,
  onOpenChange,
  onLocationSelect,
  initialCoordinates,
}: LocationPickerModalProps) {
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(initialCoordinates || null);
  const [coordinatesInput, setCoordinatesInput] = useState<string>('');
  const [googleMapsLink, setGoogleMapsLink] = useState<string>('');

  const { address, pincode, isLoading: isAddressLoading, error: addressError } = useReverseGeocoding(
    selectedCoordinates
  );

  useEffect(() => {
    if (initialCoordinates) {
      setSelectedCoordinates(initialCoordinates);
    }
  }, [initialCoordinates]);

  const handleLocationSelect = (coordinates: { lat: number; lng: number }) => {
    console.log('LocationPickerModal: Location selected:', coordinates);
    setSelectedCoordinates(coordinates);
    // Update coordinates input field
    setCoordinatesInput(`${coordinates.lat}, ${coordinates.lng}`);
    // Generate Google Maps link when location is selected
    const mapsLink = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    setGoogleMapsLink(mapsLink);
  };

  const handleCoordinatesInput = (value: string) => {
    setCoordinatesInput(value);
    
    // Try to parse coordinates from input
    // Supports formats: "lat,lng", "lat, lng", "lat lng"
    const cleaned = value.trim();
    const patterns = [
      /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/, // "lat,lng" or "lat, lng"
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/, // "lat lng"
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        // Validate coordinates
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setSelectedCoordinates({ lat, lng });
          // Update coordinates input with proper format
          setCoordinatesInput(`${lat}, ${lng}`);
          // Generate Google Maps link
          const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
          setGoogleMapsLink(mapsLink);
          toast.success('Coordinates applied to map');
          return;
        } else {
          toast.error('Invalid coordinates. Lat: -90 to 90, Lng: -180 to 180');
          return;
        }
      }
    }
    
    // If no pattern matched and input is not empty, show error
    if (cleaned) {
      toast.error('Invalid format. Use: "lat, lng" (e.g., "10.3659, 78.0196")');
    }
  };

  const handleGoogleMapsLinkInput = (value: string) => {
    setGoogleMapsLink(value);
    
    // Try to extract coordinates from Google Maps link
    const cleaned = value.trim();
    if (!cleaned) return;
    
    // Pattern for Google Maps links with coordinates
    const patterns = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/, // @lat,lng format
      /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // q=lat,lng format
      /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/, // !3dlat!4dlng format
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        // Validate coordinates
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setSelectedCoordinates({ lat, lng });
          // Update coordinates input with proper format
          setCoordinatesInput(`${lat}, ${lng}`);
          toast.success('Google Maps link applied to map');
          return;
        }
      }
    }
    
    // If no pattern matched and input is not empty, show error
    if (cleaned && !cleaned.includes('google.com/maps')) {
      toast.error('Invalid Google Maps link format');
    }
  };

  const handleCancel = () => {
    setSelectedCoordinates(initialCoordinates || null);
    setCoordinatesInput('');
    setGoogleMapsLink('');
    onOpenChange(false);
  };

  const handleConfirmPin = () => {
    if (selectedCoordinates) {
      // Only update the coordinates in parent and close modal
      onLocationSelect(selectedCoordinates);
      onOpenChange(false);
      toast.success('Pin location updated');
    } else {
      toast.error('Please select a location first');
    }
  };

  const handleConfirmAll = () => {
    if (selectedCoordinates) {
      // Update both coordinates and address in parent and close modal
      onLocationSelect(selectedCoordinates, address, pincode);
      onOpenChange(false);
      toast.success('Pin and address updated');
    } else {
      toast.error('Please select a location first');
    }
  };

  // Clear input when modal opens
  useEffect(() => {
    if (open) {
      setCoordinatesInput('');
      setGoogleMapsLink('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-freshleaf/10 w-fit rounded-full p-2">
                <MapPin className="text-freshleaf h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Pin Location</div>
              <div className="text-sm font-normal text-zinc-500">
                Click on the map to select the warehouse location
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 w-full h-full">
          {/* Input Fields Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Location Link Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Location Link
              </label>
              <Input
                type="text"
                placeholder="Paste location link here..."
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleGoogleMapsLinkInput(googleMapsLink);
                  }
                }}
                onBlur={() => handleGoogleMapsLinkInput(googleMapsLink)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Paste a location link to automatically set the location
              </p>
            </div>

            {/* Coordinates Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enter Coordinates
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="e.g., 10.3659, 78.0196"
                  value={coordinatesInput}
                  onChange={(e) => setCoordinatesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCoordinatesInput(coordinatesInput);
                    }
                  }}
                  className="w-full"
                />
                <Button
                  type="button"
                  onClick={() => handleCoordinatesInput(coordinatesInput)}
                  disabled={!coordinatesInput.trim()}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <MapPin className="h-4 w-4" />
                  Apply
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Format: latitude, longitude (e.g., 10.3659, 78.0196)
              </p>
            </div>
          </div>

          <div className="h-[35vh] w-full rounded-lg overflow-hidden border relative">
            <MapComponent
              onLocationSelect={handleLocationSelect}
              initialCoordinates={initialCoordinates}
              selectedCoordinates={selectedCoordinates}
              readOnly={false}
            />
          </div>

          {selectedCoordinates && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="space-y-2">
                <div className="text-sm text-green-700">
                  <span className="font-medium">Coordinates:</span> {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                </div>
                {isAddressLoading ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading address...</span>
                  </div>
                ) : addressError ? (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Address:</span> Unable to fetch address
                  </div>
                ) : address ? (
                  <div className="text-sm text-green-700">
                    <div>
                      <span className="font-medium">Address:</span> {address}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end flex-wrap gap-2 pt-4 pb-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleConfirmPin}
              disabled={!selectedCoordinates}
              className="flex items-center gap-2 border-freshleaf text-freshleaf hover:bg-freshleaf/10"
            >
              <MapPin className="h-4 w-4" />
              Confirm Pin
            </Button>
            <Button 
              variant="default" 
              onClick={handleConfirmAll}
              disabled={!selectedCoordinates || isAddressLoading}
              className="flex items-center gap-2 bg-freshleaf hover:bg-freshleaf/90"
            >
              {isAddressLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Confirm Pin with Address
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 