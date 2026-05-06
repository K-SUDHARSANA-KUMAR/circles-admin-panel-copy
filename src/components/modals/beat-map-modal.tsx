'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateMapCenter, fitMapBounds, calculateZoomLevel } from '@/utils/map-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BeatMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beatId: string;
}

// Custom hook to fit map bounds to show all markers
function useMapBoundsFit(waypoints: [number, number][]) {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length === 0) return;

    const coordinates = waypoints.map(([lat, lng]) => ({ lat, lng }));
    fitMapBounds(map, coordinates, {
      padding: [20, 20],
      maxZoom: 15,
      animate: true
    });
  }, [map, waypoints]);
}

// Component that uses the bounds fitting hook
function MapBoundsFitter({ waypoints }: { waypoints: [number, number][] }) {
  useMapBoundsFit(waypoints);
  return null;
}

const createBeatIcon = (beatPriority: number) => {
  return L.divIcon({
    html: `<div style="
      background-color: #22c55e;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
    ">${beatPriority}</div>`,
    className: 'custom-beat-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const BeatMapModal = ({
  open,
  onOpenChange,
  beatId,
}: BeatMapModalProps) => {
  const [mapKey, setMapKey] = useState(0);

  // Fetch outlets with nonPaginated=true and beatId
  const { outlets } = useOutlets({
    beatId,
    nonPaginated: true,
    isBeat: true,
    enabled: open && !!beatId,
  });

  const getMapCenter = (): [number, number] => {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) {
      // Default center if no waypoints
      return [12.9716, 77.5946]; // Default to Bangalore coordinates
    }
    const coordinates = waypoints.map(([lat, lng]) => ({ lat, lng }));
    const center = calculateMapCenter(coordinates);
    
    // Validate center coordinates
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number' || 
        isNaN(center.lat) || isNaN(center.lng)) {
      return [12.9716, 77.5946]; // Default to Bangalore coordinates
    }
    
    return [center.lat, center.lng];
  };

  // Get waypoints for bounds calculation
  const getWaypoints = (): [number, number][] => {
    const outletsData = outlets.data?.data?.items || [];
    
    if (!Array.isArray(outletsData) || outletsData.length === 0) {
      return [];
    }

    return outletsData
      .filter(outlet => 
        outlet && 
        outlet.outletAddress?.location && 
        Array.isArray(outlet.outletAddress.location.coordinates) && 
        outlet.outletAddress.location.coordinates.length >= 2
      )
      .filter(outlet => {
        const lat = outlet.outletAddress.location.coordinates[1];
        const lng = outlet.outletAddress.location.coordinates[0];
        return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
      })
      .map((outlet) => [
        outlet.outletAddress.location.coordinates[1],
        outlet.outletAddress.location.coordinates[0],
      ]);
  };

  useEffect(() => {
    if (open) {
      setMapKey((prev) => prev + 1);
    }
  }, [open]);

  const outletsData = outlets.data?.data?.items || [];
  const beatData = outletsData.length > 0 ? outletsData[0]?.beatDetails : null;
  const beatPriority = beatData?.beatPriority || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Beat Map - {beatData?.beatName || 'Beat'}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapKey(prev => prev + 1)}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fit to View
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Left Sidebar - Beat Info */}
          <div className="w-60 flex-shrink-0 overflow-y-auto border-r bg-gray-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Beat Information</h3>
                <div className="space-y-2">
                  <div className="rounded-md bg-white p-3">
                    <div className="text-sm text-gray-600">Beat Name</div>
                    <div className="font-semibold">{beatData?.beatName || 'Unknown'}</div>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <div className="text-sm text-gray-600">Beat Priority</div>
                    <div className="font-semibold">{beatPriority}</div>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <div className="text-sm text-gray-600">Total Outlets</div>
                    <div className="font-semibold">{outletsData.length}</div>
                  </div>
                </div>
              </div>
              
              {outletsData.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Outlets in Beat</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {outletsData.map((outlet, index) => (
                      <div key={outlet.outletId || index} className="rounded-md bg-white p-2 text-xs">
                        <div className="font-medium">{outlet.outletName}</div>
                        <div className="text-gray-500">{outlet.ownerName}</div>
                        <div className="text-gray-500">{outlet.phoneNumber}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Map */}
          <div className="flex flex-1 flex-col">
            {outlets.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text="Loading beat outlets..." />
              </div>
            ) : outlets.error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text="Error loading beat outlets. Please try again."
                />
              </div>
            ) : (
              <div className="flex-1">
                <MapContainer
                  key={mapKey}
                  center={getMapCenter()}
                  zoom={getWaypoints().length > 0 ? calculateZoomLevel(getWaypoints().map(([lat, lng]) => ({ lat, lng }))) : 10}
                  style={{ height: '100%', width: '100%' }}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapBoundsFitter waypoints={getWaypoints()} />

                  {/* Group outlets by location and show beat priority marker */}
                  {getWaypoints().length > 0 && (() => {
                    // Calculate center of all outlets for beat marker
                    const coordinates = getWaypoints().map(([lat, lng]) => ({ lat, lng }));
                    const center = calculateMapCenter(coordinates);
                    
                    // Validate center coordinates before rendering marker
                    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number' || 
                        isNaN(center.lat) || isNaN(center.lng)) {
                      return null;
                    }
                    
                    return (
                      <Marker
                        position={[center.lat, center.lng]}
                        icon={createBeatIcon(beatPriority)}
                      >
                        <Popup>
                          <div className="font-poppins flex flex-col justify-center gap-1">
                            <div className="text-base font-semibold">
                              {beatData?.beatName || 'Beat'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Priority: {beatPriority}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Outlets: {outletsData.length}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })()}

                  {/* Individual outlet markers */}
                  {outletsData.map((outlet, index) => {
                    // Skip outlets without valid location data
                    if (!outlet || !outlet.outletAddress?.location || !Array.isArray(outlet.outletAddress.location.coordinates) || outlet.outletAddress.location.coordinates.length < 2) {
                      return null;
                    }
                    
                    // Ensure coordinates are valid numbers
                    const lat = outlet.outletAddress.location.coordinates[1];
                    const lng = outlet.outletAddress.location.coordinates[0];
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                      console.warn('Invalid coordinates for outlet:', outlet);
                      return null;
                    }
                    
                    // Get the individual outlet's beat priority
                    const outletBeatPriority = outlet.beatDetails?.beatPriority || 1;
                    
                    return (
                      <Marker
                        key={outlet.outletId || index}
                        position={[lat, lng]}
                        icon={createBeatIcon(outletBeatPriority)}
                      >
                        <Popup>
                          <div className="font-poppins flex flex-col justify-center gap-1">
                            <div className="text-base font-semibold">
                              {outlet.outletName || 'Unknown Outlet'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Owner: {outlet.ownerName || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Phone: {outlet.phoneNumber || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Status: <span className="capitalize">{outlet.outletStatus || 'Unknown'}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Beat Priority: {outletBeatPriority}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BeatMapModal;
