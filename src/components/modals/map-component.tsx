'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateMapCenter, fitMapBounds, calculateZoomLevel, isValidCoordinate } from '@/utils/map-utils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  onLocationSelect: (coordinates: { lat: number; lng: number }) => void;
  initialCoordinates?: { lat: number; lng: number };
  selectedCoordinates?: { lat: number; lng: number } | null;
  multipleCoordinates?: { lat: number; lng: number }[];
  readOnly?: boolean;
}

function MapClickHandler({ onLocationSelect, readOnly }: { onLocationSelect: (coordinates: { lat: number; lng: number }) => void; readOnly?: boolean }) {
  useMapEvents({
    click: (e) => {
      if (readOnly) return; // Don't handle clicks if read-only
      const { lat, lng } = e.latlng;
      console.log('Map clicked at:', { lat, lng });
      onLocationSelect({ lat, lng });
    },
  });
  return null;
}

function MapLoadDetector({ onLoad }: { onLoad: () => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      console.log('Map loaded successfully');
      onLoad();
    }
  }, [map, onLoad]);
  
  return null;
}

// Component to fit bounds when multiple coordinates are provided
function MapBoundsFitter({ coordinates }: { coordinates: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || coordinates.length === 0) return;

    fitMapBounds(map, coordinates, {
      padding: [20, 20],
      maxZoom: 15,
      animate: true
    });
  }, [map, coordinates]);

  return null;
}

// Component to center map on single coordinates
function MapCenterFitter({ coordinates }: { coordinates: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !coordinates) return;

    map.setView([coordinates.lat, coordinates.lng], map.getZoom(), {
      animate: true
    });
  }, [map, coordinates]);

  return null;
}

const MapComponent = ({
  onLocationSelect,
  initialCoordinates,
  selectedCoordinates,
  multipleCoordinates = [],
  readOnly = false,
}: MapComponentProps) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Stabilize allCoordinates to prevent excessive re-renders
  const allCoordinates = useMemo(() => {
    if (multipleCoordinates.length > 0) return multipleCoordinates;
    if (selectedCoordinates) return [selectedCoordinates];
    if (initialCoordinates) return [initialCoordinates];
    return [];
  }, [multipleCoordinates, selectedCoordinates, initialCoordinates]);

  const center = useMemo(() => calculateMapCenter(allCoordinates), [allCoordinates]);
  const zoomLevel = useMemo(() => calculateZoomLevel(allCoordinates), [allCoordinates]);
  const shouldFitBounds = multipleCoordinates.length > 0;
  
  const mapStyle = useMemo(() => ({ height: '100%', width: '100%', minHeight: '384px' }), []);
  const maxBounds = useMemo(() => [[-90, -180], [90, 180]] as L.LatLngBoundsExpression, []);

  useEffect(() => {
    if (selectedCoordinates) {
      setPosition([selectedCoordinates.lat, selectedCoordinates.lng]);
    } else if (initialCoordinates) {
      setPosition([initialCoordinates.lat, initialCoordinates.lng]);
    }
  }, [selectedCoordinates, initialCoordinates]);

  const handleLocationSelect = (coordinates: { lat: number; lng: number }) => {
    console.log('MapComponent: handleLocationSelect called with:', coordinates);
    setPosition([coordinates.lat, coordinates.lng]);
    onLocationSelect(coordinates);
  };

  return (
    <div className="relative w-full h-full">
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-gray-500">Loading map...</div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoomLevel}
        style={mapStyle}
        className={`rounded-lg ${!readOnly ? 'modal-map' : ''}`}
        dragging={!readOnly}
        zoomControl={!readOnly}
        scrollWheelZoom={!readOnly}
        doubleClickZoom={!readOnly}
        boxZoom={!readOnly}
        keyboard={!readOnly}
        touchZoom={!readOnly}
        attributionControl={false}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
      >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapClickHandler onLocationSelect={handleLocationSelect} readOnly={readOnly} />
      
      {/* Add a component to detect when map is loaded */}
      <MapLoadDetector onLoad={() => setIsMapLoaded(true)} />
      
      {/* Fit bounds if multiple coordinates are provided */}
      {shouldFitBounds && (
        <MapBoundsFitter coordinates={multipleCoordinates} />
      )}
      
      {/* Center map on single coordinates when they change */}
      {!shouldFitBounds && (
        <MapCenterFitter coordinates={selectedCoordinates || initialCoordinates || null} />
      )}
      
      {/* Show selected/initial position marker */}
      {position && (
        <Marker position={position} />
      )}

      {/* Show multiple coordinate markers */}
      {multipleCoordinates.map((coord, index) => (
        <Marker 
          key={`${coord.lat}-${coord.lng}-${index}`} 
          position={[coord.lat, coord.lng]}
          icon={L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })}
        />
      ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent; 