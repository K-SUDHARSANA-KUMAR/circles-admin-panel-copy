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

interface OutletMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  warehouseName?: string;
  filters?: {
    divisionId?: string[];
    channelId?: string[];
    zoneId?: string[];
    subZoneId?: string[];
    businessTypeId?: string;
    outletStatus?: string[];
    search?: string;
  };
}

// Custom hook to fit map bounds to show all markers
const useMapBoundsFit = (waypoints: [number, number][]) => {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length === 0) return;

    const coordinates = waypoints.map(([lat, lng]) => ({ lat, lng }));
    fitMapBounds(map, coordinates, {
      padding: [50, 50],
      maxZoom: 15,
      animate: true
    });
  }, [map, waypoints]);
};

// Component that uses the bounds fitting hook
const MapBoundsFitter = ({ waypoints }: { waypoints: [number, number][] }) => {
  useMapBoundsFit(waypoints);
  return null;
};

const createOutletIcon = (status: string) => {
  const statusColors: Record<string, string> = {
    active: '#22c55e',
    inactive: '#ef4444',
    pending: '#f59e0b',
    suspended: '#6b7280',
  };
  
  const color = statusColors[status?.toLowerCase()] || '#3b82f6';
  
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    className: 'custom-outlet-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const OutletMapModal = ({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  filters = {},
}: OutletMapModalProps) => {
  const [mapKey, setMapKey] = useState(0);

  // Fetch outlets with nonPaginated=true and warehouseId
  const { outlets } = useOutlets({
    warehouseId: JSON.stringify([warehouseId]),
    ...(filters.divisionId && filters.divisionId.length > 0 && {
      divisionId: JSON.stringify(filters.divisionId),
    }),
    ...(filters.channelId && filters.channelId.length > 0 && {
      channelId: JSON.stringify(filters.channelId),
    }),
    ...(filters.zoneId && filters.zoneId.length > 0 && {
      zoneId: JSON.stringify(filters.zoneId),
    }),
    ...(filters.subZoneId && filters.subZoneId.length > 0 && {
      subZoneId: JSON.stringify(filters.subZoneId),
    }),
    ...(filters.businessTypeId && { businessTypeId: filters.businessTypeId }),
    ...(filters.outletStatus && filters.outletStatus.length > 0 && {
      outletStatus: JSON.stringify(filters.outletStatus),
    }),
    ...(filters.search && { search: filters.search }),
    nonPaginated: true,
    enabled: open && !!warehouseId,
  });

  const getMapCenter = (): [number, number] => {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) {
      return [12.9716, 77.5946]; // Default to Bangalore coordinates
    }
    const coordinates = waypoints.map(([lat, lng]) => ({ lat, lng }));
    const center = calculateMapCenter(coordinates);
    
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number' || 
        isNaN(center.lat) || isNaN(center.lng)) {
      return [12.9716, 77.5946];
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
  
  // Group outlets by status for the sidebar
  const outletsByStatus = outletsData.reduce((acc: Record<string, number>, outlet) => {
    const status = outlet.outletStatus?.toLowerCase() || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Outlet Map - {warehouseName || 'Warehouse'}
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
          {/* Left Sidebar - Warehouse Info */}
          <div className="w-60 flex-shrink-0 overflow-y-auto border-r bg-gray-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Warehouse Information</h3>
                <div className="space-y-2">
                  <div className="rounded-md bg-card p-3">
                    <div className="text-sm text-gray-600">Warehouse</div>
                    <div className="font-semibold">{warehouseName || 'Unknown'}</div>
                  </div>
                  <div className="rounded-md bg-card p-3">
                    <div className="text-sm text-gray-600">Total Outlets</div>
                    <div className="font-semibold">{outletsData.length}</div>
                  </div>
                </div>
              </div>
              
              {Object.keys(outletsByStatus).length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Outlets by Status</h3>
                  <div className="space-y-2">
                    {Object.entries(outletsByStatus).map(([status, count]) => (
                      <div key={status} className="rounded-md bg-card p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: 
                                  status === 'active' ? '#22c55e' :
                                  status === 'inactive' ? '#ef4444' :
                                  status === 'pending' ? '#f59e0b' :
                                  status === 'suspended' ? '#6b7280' :
                                  '#3b82f6'
                              }}
                            />
                            <span className="text-sm capitalize">{status}</span>
                          </div>
                          <span className="font-semibold">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {outletsData.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Outlets List</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {outletsData.map((outlet, index) => (
                      <div key={outlet.outletId || index} className="rounded-md bg-card p-2 text-xs">
                        <div className="font-medium">{outlet.outletName}</div>
                        <div className="text-gray-500">{outlet.ownerName}</div>
                        <div className="text-gray-500">{outlet.phoneNumber}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div 
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: 
                                outlet.outletStatus?.toLowerCase() === 'active' ? '#22c55e' :
                                outlet.outletStatus?.toLowerCase() === 'inactive' ? '#ef4444' :
                                outlet.outletStatus?.toLowerCase() === 'pending' ? '#f59e0b' :
                                outlet.outletStatus?.toLowerCase() === 'suspended' ? '#6b7280' :
                                '#3b82f6'
                            }}
                          />
                          <span className="capitalize text-gray-500">{outlet.outletStatus}</span>
                        </div>
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
                <Loading text="Loading outlets..." />
              </div>
            ) : outlets.error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text="Error loading outlets. Please try again."
                />
              </div>
            ) : outletsData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">No outlets found for this warehouse</p>
                </div>
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
                    
                    return (
                      <Marker
                        key={outlet.outletId || index}
                        position={[lat, lng]}
                        icon={createOutletIcon(outlet.outletStatus)}
                      >
                        <Popup>
                          <div className="font-inter flex flex-col justify-center gap-1">
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
                            {outlet.outletAddress?.address && (
                              <div className="text-sm text-gray-600">
                                Address: {outlet.outletAddress.address}
                              </div>
                            )}
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

export default OutletMapModal;


