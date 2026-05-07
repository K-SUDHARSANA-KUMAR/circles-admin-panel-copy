'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQueries } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import { fitMapBounds, calculateMapCenter, calculateZoomLevel } from '@/utils/map-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pjpApi } from '@/features/dashboard/pjp/api/pjp';
import { VisitOrderResponse } from '@/features/dashboard/pjp/hooks/usePjp';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { AVAILABLE_DAYS, DAY_COLORS } from '@/constants/commons';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapRoutePlanProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routePlanId: string;
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

const createDayIcon = (day: number, index?: number) => {
  const color = DAY_COLORS[day as keyof typeof DAY_COLORS] || '#6b7280';
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 25px;
      height: 25px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${index}</div>`,
    className: 'custom-day-marker',
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5],
  });
};

const RoutingMachine = ({ waypoints, color }: { waypoints: [number, number][]; color: string }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) return;

    const routingControl = (L.Routing.control as any)({
      waypoints: waypoints.map((point) => L.latLng(point[0], point[1])),
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: () => null,
      missingRouteTolerance: 0,
      show: false,
      lineOptions: {
        styles: [{ color, weight: 4, opacity: 0.7 }],
      },
      fitSelectedRoutes: false,
      collapsible: false,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving'
      }),
    }).addTo(map);

    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        console.log('Control already removed');
      }
    };
  }, [waypoints, color]);

  return null;
};

const MapRoutePlan = ({
  open,
  onOpenChange,
  routePlanId,
}: MapRoutePlanProps) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [mapKey, setMapKey] = useState(0);

  const dayQueries = useQueries({
    queries: AVAILABLE_DAYS.map((day) => ({
      queryKey: ['ov-by-day', routePlanId, day.toString()],
      queryFn: () => pjpApi.getOVByDay(routePlanId, day.toString(), undefined, undefined, undefined, undefined, undefined, undefined, 'auto'),
      enabled: open && selectedDay === day && !!routePlanId,
    })),
  });

  const dayQueryMap = AVAILABLE_DAYS.reduce(
    (acc, day, index) => {
      acc[day] = dayQueries[index];
      return acc;
    },
    {} as Record<number, (typeof dayQueries)[0]>
  );

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
  };

  const selectedDayQuery = dayQueryMap[selectedDay];
  
  // Handle the actual API response structure
  let filteredOutlets: any[] = [];
  if (selectedDayQuery?.data) {
    const responseData = selectedDayQuery.data as any;
    // Based on the actual API response: data.data.items
    if (responseData.data && responseData.data.items && Array.isArray(responseData.data.items)) {
      filteredOutlets = responseData.data.items;
    } else {
      // Fallback for different structures
      if (responseData.items && Array.isArray(responseData.items)) {
        filteredOutlets = responseData.items;
      } else if (Array.isArray(responseData)) {
        filteredOutlets = responseData;
      } else {
        // If none of the expected structures match, log for debugging
        console.warn('Unexpected API response structure for day', selectedDay, ':', responseData);
        console.warn('Response type:', typeof responseData);
        console.warn('Response keys:', Object.keys(responseData || {}));
        filteredOutlets = [];
      }
    }
  }

  const getMapCenter = (): [number, number] => {
    const coordinates = getWaypoints().map(([lat, lng]) => ({ lat, lng }));
    return calculateMapCenter(coordinates);
  };

  // Get waypoints for bounds calculation
  const getWaypoints = (): [number, number][] => {
    if (!Array.isArray(filteredOutlets) || filteredOutlets.length === 0) {
      return [];
    }

    return filteredOutlets
      .filter(outlet => 
        outlet && 
        outlet.location && 
        Array.isArray(outlet.location.coordinates) && 
        outlet.location.coordinates.length >= 2
      )
      .filter(outlet => {
        const lat = outlet.location.coordinates[1];
        const lng = outlet.location.coordinates[0];
        return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
      })
      .map((outlet) => [
        outlet.location.coordinates[1],
        outlet.location.coordinates[0],
      ]);
  };

  useEffect(() => {
    if (open) {
      setMapKey((prev) => prev + 1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedDay(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Route Plan Map</DialogTitle>
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
          {/* Left Sidebar - Day Filter */}
          <div className="w-50 flex-shrink-0 overflow-y-auto border-r bg-gray-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Select Day</h3>
                <div className="mb-3 flex flex-col gap-2">
                  {AVAILABLE_DAYS.map((day) => {
                    const isSelected = selectedDay === day;
                    const dayQueryData = dayQueryMap[day];
                    const isLoading = dayQueryData?.isLoading && isSelected;
                    const hasError = dayQueryData?.error && isSelected;
                    // Get the correct data structure for day count
                    let dayData: any[] = [];
                    if (dayQueryData?.data) {
                      const responseData = dayQueryData.data as any;
                      if (responseData.data && responseData.data.items && Array.isArray(responseData.data.items)) {
                        dayData = responseData.data.items;
                      } else if (responseData.items && Array.isArray(responseData.items)) {
                        dayData = responseData.items;
                      } else if (Array.isArray(responseData)) {
                        dayData = responseData;
                      }
                    }

                    return (
                      <Button
                        key={day}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDayClick(day)}
                        disabled={isLoading}
                        className="w-full justify-start"
                        style={{
                          backgroundColor: isSelected
                            ? DAY_COLORS[day as keyof typeof DAY_COLORS]
                            : undefined,
                          borderColor:
                            DAY_COLORS[day as keyof typeof DAY_COLORS],
                        }}
                      >
                        <div className="flex w-full items-center gap-2">
                          <div
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                DAY_COLORS[day as keyof typeof DAY_COLORS],
                            }}
                          />
                          <span className="flex-1 text-left">Day {day}</span>
                          {isLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : hasError ? (
                            <span className="text-xs text-red-500">Error</span>
                          ) : isSelected ? (
                            <Badge variant="secondary" className="ml-auto">
                              {dayData.length}
                            </Badge>
                          ) : null}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Map */}
          <div className="flex flex-1 flex-col">
            {selectedDayQuery?.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loading text={`Loading Day ${selectedDay}`} />
              </div>
            ) : selectedDayQuery?.error ? (
              <div className="flex h-full items-center justify-center">
                <GenericError
                  text={`Error loading Day ${selectedDay} data. Please try again.`}
                />
              </div>
            ) : (
              <div className="flex-1">
                
                <MapContainer
                  key={mapKey}
                  center={getMapCenter()}
                  zoom={calculateZoomLevel(getWaypoints().map(([lat, lng]) => ({ lat, lng })))}
                  style={{ height: '100%', width: '100%' }}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapBoundsFitter waypoints={getWaypoints()} />

                  <RoutingMachine
                    waypoints={(Array.isArray(filteredOutlets) ? filteredOutlets : [])
                      .filter(outlet => 
                        outlet && 
                        outlet.location && 
                        Array.isArray(outlet.location.coordinates) && 
                        outlet.location.coordinates.length >= 2
                      )
                      .filter(outlet => {
                        const lat = outlet.location.coordinates[1];
                        const lng = outlet.location.coordinates[0];
                        return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
                      })
                      .sort((a, b) => (a.index || 0) - (b.index || 0))
                      .map((outlet) => [
                        outlet.location.coordinates[1],
                        outlet.location.coordinates[0],
                      ])}
                    color={DAY_COLORS[selectedDay as keyof typeof DAY_COLORS]}
                  />

                  {(Array.isArray(filteredOutlets) ? filteredOutlets : []).map((outlet) => {
                    // Skip outlets without valid location data
                    if (!outlet || !outlet.location || !Array.isArray(outlet.location.coordinates) || outlet.location.coordinates.length < 2) {
                      return null;
                    }
                    
                    // Ensure coordinates are valid numbers
                    const lat = outlet.location.coordinates[1];
                    const lng = outlet.location.coordinates[0];
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                      console.warn('Invalid coordinates for outlet:', outlet);
                      return null;
                    }
                    
                    return (
                      <Marker
                        key={outlet._id || outlet.outletId || Math.random()}
                        position={[lat, lng]}
                        icon={createDayIcon(selectedDay, outlet.index)}
                      >
                        <Popup>
                          <div className="font-inter flex flex-col justify-center gap-1">
                            <div className="text-base font-semibold">
                              {outlet.outletName || 'Unknown Outlet'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Day {selectedDay}
                            </div>
                            <div className="text-sm text-gray-600">
                              Status:{' '}
                              <span className="capitalize">{outlet.status || 'Unknown'}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Sales Person: {outlet.userInfo?.name || 'Unknown'}
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

export default MapRoutePlan;
