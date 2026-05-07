'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import { fitMapBounds, calculateMapCenter, calculateZoomLevel } from '@/utils/map-utils';
import { getColorByIndex } from '@/constants/colors.constant';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { RoutePlan } from '@/features/dashboard/pjp/types/pjp.types';

interface MapRoutePlanSalesViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routePlan: RoutePlan | null;
  salesPersonCoordinates: [number, number] | null;
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

const createDateIcon = (color: string, index?: number) => {
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
      font-size: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${index}</div>`,
    className: 'custom-date-marker',
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

const createSalesPersonIcon = () => {
  return L.divIcon({
    html: `<div style="
      background-color: #1d4ed8;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    ">🧑‍💼</div>`,
    className: 'custom-salesperson-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const MapRoutePlanSalesView = ({
  open,
  onOpenChange,
  routePlan,
  salesPersonCoordinates,
}: MapRoutePlanSalesViewProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const ALL = '__ALL__';

  // Process route plan data to get unique dates
  const availableDates = useMemo(() => {
    if (!routePlan?.journeyPlan) return [];
    
    const dates = routePlan.journeyPlan
      .filter(dayPlan => dayPlan.visitDate && dayPlan.outlets?.length > 0)
      .map(dayPlan => dayPlan.visitDate!)
      .filter((date, index, self) => self.indexOf(date) === index) // Remove duplicates
      .sort();
    
    return dates;
  }, [routePlan]);

  const dateToColor = useMemo(() => {
    const map = new Map<string, string>();
    availableDates.forEach((date, idx) => {
      map.set(date, getColorByIndex(idx));
    });
    return map;
  }, [availableDates]);

  // Get outlets for selected date
  const selectedDateOutlets = useMemo(() => {
    if (!selectedDate || !routePlan?.journeyPlan) return [];
    if (selectedDate === ALL) return [];
    const dayPlan = routePlan.journeyPlan.find(dp => dp.visitDate === selectedDate);
    return dayPlan?.outlets || [];
  }, [selectedDate, routePlan]);

  const allDateOutlets = useMemo(() => {
    if (!routePlan?.journeyPlan) {
      return [] as { date: string; outlets: any[] }[];
    }

    return availableDates.map((date) => ({
      date,
      outlets: routePlan.journeyPlan.find((dp) => dp.visitDate === date)?.outlets || [],
    }));
  }, [routePlan, availableDates]);

  const extractValidCoordinates = (outlets: any[]): [number, number][] => {
    if (!Array.isArray(outlets)) {
      return [];
    }

    return outlets
      .filter(
        (outlet) =>
          outlet &&
          outlet.location &&
          Array.isArray(outlet.location.coordinates) &&
          outlet.location.coordinates.length >= 2
      )
      .filter((outlet) => {
        const lat = outlet.location.coordinates[1];
        const lng = outlet.location.coordinates[0];
        return (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng)
        );
      })
      .map(
        (outlet) =>
          [
            outlet.location.coordinates[1],
            outlet.location.coordinates[0],
          ] as [number, number]
      );
  };

  // Get waypoints for bounds calculation
  const salesPersonPosition = useMemo(() => {
    if (
      !Array.isArray(salesPersonCoordinates) ||
      salesPersonCoordinates.length < 2
    ) {
      return null;
    }

    const [latitude, longitude] = salesPersonCoordinates;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return null;
    }

    return [latitude, longitude] as [number, number];
  }, [salesPersonCoordinates]);

  const getWaypoints = (): [number, number][] => {
    const appendSalesPersonPosition = (points: [number, number][]) => {
      if (salesPersonPosition) {
        return [...points, salesPersonPosition];
      }
      return points;
    };

    if (selectedDate === ALL) {
      const all = allDateOutlets.flatMap(({ outlets }) => outlets || []);
      const waypoints = extractValidCoordinates(all);

      return appendSalesPersonPosition(waypoints);
    }

    if (!Array.isArray(selectedDateOutlets) || selectedDateOutlets.length === 0) {
      return appendSalesPersonPosition([]);
    }

    const waypoints = extractValidCoordinates(selectedDateOutlets);

    return appendSalesPersonPosition(waypoints);
  };

  const getMapCenter = (): [number, number] => {
    const coordinates = getWaypoints().map(([lat, lng]) => ({ lat, lng }));
    return calculateMapCenter(coordinates);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const getDateColor = (date: string) => {
    return dateToColor.get(date) || getColorByIndex(0);
  };

  useEffect(() => {
    if (open && availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [open, availableDates, selectedDate]);

  useEffect(() => {
    if (open) {
      setMapKey((prev) => prev + 1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedDate(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Route Plan Map - Sales View</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapKey(prev => prev + 1)}
              className="flex items-center gap-2 mr-10"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fit to View
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Left Sidebar - Date Filter */}
          <div className="w-60 flex-shrink-0 overflow-y-auto border-r bg-gray-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Select Date</h3>
                <div className="mb-3 flex flex-col gap-2">
                  <Button
                    key="ALL"
                    variant={selectedDate === ALL ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateClick(ALL)}
                    className="w-full justify-start"
                  >
                    <div className="flex w-full items-center gap-2">
                      <div className="h-3 w-3 flex-shrink-0 rounded-full bg-gray-800" />
                      <span className="flex-1 text-left text-xs">All</span>
                    </div>
                  </Button>
                  {availableDates.map((date) => {
                    const isSelected = selectedDate === date;
                    const dayPlan = routePlan?.journeyPlan?.find(dp => dp.visitDate === date);
                    const outletCount = dayPlan?.outlets?.length || 0;
                    const dateColor = getDateColor(date);

                    return (
                      <Button
                        key={date}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDateClick(date)}
                        className="w-full justify-start"
                        style={{
                          backgroundColor: isSelected ? dateColor : undefined,
                          borderColor: dateColor,
                        }}
                      >
                        <div className="flex w-full items-center gap-2">
                          <div
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: dateColor }}
                          />
                          <span className="flex-1 text-left text-xs">
                            {format(new Date(date), 'MMM dd, yyyy')}
                          </span>
                          <Badge variant="secondary" className="ml-auto">
                            {outletCount}
                          </Badge>
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
            {!selectedDate ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">Select a date to view the route</p>
                </div>
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

                  {salesPersonPosition ? (
                    <Marker
                      position={salesPersonPosition}
                      icon={createSalesPersonIcon()}
                    >
                      <Popup>
                        <div className="font-inter flex flex-col gap-1">
                          <div className="text-base font-semibold">
                            {routePlan?.userInfo?.name || 'Sales Person'}
                          </div>
                          <div className="text-sm text-gray-600">Sales Person Location</div>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {selectedDate !== ALL ? (
                    <RoutingMachine
                      waypoints={selectedDateOutlets
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
                      color={getDateColor(selectedDate)}
                    />
                  ) : (
                    null
                  )}

                  {selectedDate !== ALL && selectedDateOutlets.map((outlet) => {
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
                        key={outlet.outletId}
                        position={[lat, lng]}
                        icon={createDateIcon(getDateColor(selectedDate), outlet.index)}
                      >
                        <Popup>
                          <div className="font-inter flex flex-col justify-center gap-1">
                            <div className="text-base font-semibold">
                              {outlet.outletName || 'Unknown Outlet'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(selectedDate), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-gray-600">
                              Visit Order: {outlet.index || 0}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {selectedDate === ALL && allDateOutlets.flatMap(({ date, outlets }) => {
                    const color = getDateColor(date);
                    return (outlets || []).map((outlet: any) => {
                      if (!outlet || !outlet.location || !Array.isArray(outlet.location.coordinates) || outlet.location.coordinates.length < 2) {
                        return null;
                      }
                      const lat = outlet.location.coordinates[1];
                      const lng = outlet.location.coordinates[0];
                      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                        return null;
                      }
                      return (
                        <Marker
                          key={`${date}-${outlet.outletId}`}
                          position={[lat, lng]}
                          icon={createDateIcon(color, outlet.index)}
                        >
                          <Popup>
                            <div className="font-inter flex flex-col justify-center gap-1">
                              <div className="text-base font-semibold">{outlet.outletName || 'Unknown Outlet'}</div>
                              <div className="text-sm text-gray-600">{format(new Date(date), 'MMM dd, yyyy')}</div>
                              <div className="text-sm text-gray-600">Visit Order: {outlet.index || 0}</div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    });
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

export default MapRoutePlanSalesView;
