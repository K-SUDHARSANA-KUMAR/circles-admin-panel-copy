import L from 'leaflet';

/**
 * Calculate the center point from an array of coordinates
 */
export const calculateMapCenter = (coordinates: { lat: number; lng: number }[]): [number, number] => {
  if (!coordinates || coordinates.length === 0) {
    return [10.3865296, 78.0052919]; // Default coordinates
  }

  const validCoords = coordinates.filter(coord => 
    typeof coord.lat === 'number' && 
    typeof coord.lng === 'number' && 
    !isNaN(coord.lat) && 
    !isNaN(coord.lng)
  );

  if (validCoords.length === 0) {
    return [10.3865296, 78.0052919];
  }

  const centerLat = validCoords.reduce((sum, coord) => sum + coord.lat, 0) / validCoords.length;
  const centerLng = validCoords.reduce((sum, coord) => sum + coord.lng, 0) / validCoords.length;

  return [centerLat, centerLng];
};

/**
 * Fit map bounds to show all coordinates with padding
 */
export const fitMapBounds = (
  map: L.Map, 
  coordinates: { lat: number; lng: number }[],
  options: {
    padding?: [number, number];
    maxZoom?: number;
    minZoom?: number;
    animate?: boolean;
  } = {}
) => {
  if (!map || coordinates.length === 0) return;

  const {
    padding = [20, 20],
    maxZoom = 15,
    minZoom = 10,
    animate = true
  } = options;

  const validCoords = coordinates.filter(coord => 
    typeof coord.lat === 'number' && 
    typeof coord.lng === 'number' && 
    !isNaN(coord.lat) && 
    !isNaN(coord.lng)
  );

  if (validCoords.length === 0) return;

  const bounds = L.latLngBounds(validCoords.map(coord => [coord.lat, coord.lng]));
  
  // First fit the bounds
  map.fitBounds(bounds, {
    padding,
    maxZoom,
    animate
  });
  
  // Then ensure we're not zoomed out too much
  if (map.getZoom() < minZoom) {
    map.setZoom(minZoom, { animate });
  }
};

/**
 * Calculate appropriate zoom level based on number of coordinates
 */
export const calculateZoomLevel = (coordinates: { lat: number; lng: number }[]): number => {
  if (!coordinates || coordinates.length === 0) {
    return 13; // Default zoom for single point
  }

  if (coordinates.length === 1) {
    return 13; // Zoom in for single point
  }

  if (coordinates.length <= 5) {
    return 12; // Medium-high zoom for few points
  }

  if (coordinates.length <= 20) {
    return 11; // Medium zoom for moderate points
  }

  return 10; // Minimum zoom for many points (prevents too much zoom out)
};

/**
 * Validate coordinates
 */
export const isValidCoordinate = (coord: { lat: number; lng: number }): boolean => {
  return (
    coord &&
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}; 