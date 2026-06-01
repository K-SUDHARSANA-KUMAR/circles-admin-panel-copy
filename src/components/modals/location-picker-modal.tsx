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
import { MapPin, Loader2, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
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
  onLocationSelect: (coordinates: { lat: number; lng: number }) => void;
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
  // Nominatim Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);

  useEffect(() => {
    if (initialCoordinates) {
      setSelectedCoordinates(initialCoordinates);
    }
  }, [initialCoordinates]);

  const handleLocationSelect = (coordinates: { lat: number; lng: number }) => {
    console.log('LocationPickerModal: Location selected:', coordinates);
    setSelectedCoordinates(coordinates);
  };

  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute place search automatically when debounced search query changes
  useEffect(() => {
    const searchPlaces = async () => {
      const query = debouncedSearch.trim();
      if (!query || query === selectedPlaceName) {
        if (!query) setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
      } catch (err: any) {
        console.error('Failed to fetch place results from Nominatim:', err);
      } finally {
        setIsSearching(false);
      }
    };
    searchPlaces();
  }, [debouncedSearch, selectedPlaceName]);

  const handleSearchPlaces = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSelectedPlaceName(''); // Reset selected flag to force immediate query execution
    setDebouncedSearch(query);
  };

  const handleSelectSearchResult = (result: { lat: string; lon: string; display_name: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      handleLocationSelect({ lat, lng });
      setSelectedPlaceName(result.display_name);
      setSearchQuery(result.display_name);
      setSearchResults([]);
    }
  };

  const handleCancel = () => {
    setSelectedCoordinates(initialCoordinates || null);
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedPlaceName('');
    setSearchResults([]);
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

  // Clear input when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setDebouncedSearch('');
      setSelectedPlaceName('');
      setSearchResults([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-primary/10 w-fit rounded-full p-2">
                <MapPin className="text-primary h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Pin Location</div>
              <div className="text-sm font-normal text-zinc-500">
                Search place name or pinpoint directly on the map
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 w-full h-full relative">
          {/* Place Search Bar */}
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Search Place or Address
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Search for a city, landmark, or address (e.g. Mumbai, Maharashtra)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchPlaces();
                  }
                }}
                className="w-full h-11"
              />
              <Button
                type="button"
                onClick={handleSearchPlaces}
                disabled={isSearching || !searchQuery.trim()}
                className="flex items-center gap-1.5 h-11 px-6 shrink-0"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[1000] border border-border/80 rounded-xl bg-[#171717] shadow-2xl max-h-60 overflow-y-auto p-2 divide-y divide-zinc-800">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 text-sm transition-colors rounded-lg flex items-start gap-2.5 text-foreground hover:text-primary"
                  >
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="truncate">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-[45vh] w-full rounded-2xl overflow-hidden border border-border/50 relative z-10 shadow-lg">
            <MapComponent
              onLocationSelect={handleLocationSelect}
              initialCoordinates={initialCoordinates}
              selectedCoordinates={selectedCoordinates}
              readOnly={false}
            />
          </div>

          <DialogFooter className="flex justify-between items-center flex-wrap gap-4 pt-4 pb-2 z-10 relative border-t border-border/50">
            {selectedCoordinates ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5" />
                Lat: {selectedCoordinates.lat.toFixed(6)}, Lng: {selectedCoordinates.lng.toFixed(6)}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 font-medium">Click anywhere on the map to place a pin</div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={handleConfirmPin}
                disabled={!selectedCoordinates}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
              >
                <MapPin className="h-4 w-4" />
                Confirm Pin
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}