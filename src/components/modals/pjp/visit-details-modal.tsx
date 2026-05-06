'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconBuildingStore } from '@tabler/icons-react';
import { DAY_COLORS } from '@/constants/commons';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VisitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitData: {
    visitDate: string;
    visitOrderId: string;
    checkedIn?: string;
    checkedOut?: string;
    status?: string;
    visitOrderStatus?: string;
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
    punches?: Array<{
      type: "IN" | "OUT";
      punchTime: string;
      userId: string;
      location?: {
        type: "Point";
        coordinates: [number, number];
      };
    }>;
    outletName: string;
    userInfo: {
      name: string;
    };
  } | null;
}

export function VisitDetailsModal({
  open,
  onOpenChange,
  visitData,
}: VisitDetailsModalProps) {
  if (!visitData) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy - hh:mm a');
  };

  const getCheckInTime = () => {
    if (!visitData?.punches) return null;
    const checkIn = visitData.punches.find((punch) => punch.type === 'IN');
    return checkIn ? checkIn.punchTime : null;
  };

  const getCheckOutTime = () => {
    if (!visitData?.punches) return null;
    const checkOut = visitData.punches.find((punch) => punch.type === 'OUT');
    return checkOut ? checkOut.punchTime : null;
  };

  const createOutletIcon = () => {
    return L.divIcon({
      html: `<div style="
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #3b82f6;
        background-color: white;
        border-radius: 50%;
        border: 2px solid #3b82f6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      </div>`,
      className: 'custom-outlet-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  const createPunchIcon = (type: 'IN' | 'OUT') => {
    const color = type === 'IN' ? '#22c55e' : '#ef4444';
    return L.divIcon({
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      className: 'custom-punch-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Visit Details - {visitData?.outletName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div>
            <label className="text-sm font-medium text-gray-600">
              Visit Date
            </label>
            <p className="text-base font-medium text-gray-900">
              {visitData?.visitDate ? formatDate(visitData?.visitDate) : 'N/A'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              Visit Order ID
            </label>
            <p className="font-mono text-base font-medium text-gray-900">
              {visitData.visitOrderId}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              Sales Person
            </label>
            <p className="text-base font-medium text-gray-900">
              {visitData?.userInfo?.name}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              Outlet Name
            </label>
            <p className="text-base font-medium text-gray-900">
              {visitData?.outletName}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              Checked In
            </label>
            <p className="text-base font-medium text-gray-900">
              {getCheckInTime()
                ? formatDateTime(getCheckInTime() || '')
                : '-'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              Checked Out
            </label>
            <p className="text-base font-medium text-gray-900">
              {getCheckOutTime()
                ? formatDateTime(getCheckOutTime() || '')
                : '-'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              Status
            </label>
            <div className="mt-1">
              {renderStatusBadge(
                visitData?.visitOrderStatus || visitData?.status || 'Pending',
                StatusType.ORDER
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              No Order Reason
            </label>
            <p className="text-base font-medium text-gray-900">
              {(visitData as any)?.noOrderReasonName || '-'}
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Location Details</h3>
          <div className="h-64 w-full rounded-lg border">
            <MapContainer
              center={visitData?.location?.coordinates ? [visitData.location.coordinates[1], visitData.location.coordinates[0]] : [28.6139, 77.209]}
              zoom={15}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Outlet */}
              {visitData?.location?.coordinates && (
                <Marker
                  position={[visitData.location.coordinates[1], visitData.location.coordinates[0]]}
                  icon={createOutletIcon()}
                >
                  <Popup>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600 mb-1">
                        {visitData.outletName || 'Outlet'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Outlet Location
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Punches */}
              {visitData?.punches?.map((punch, index) => {
                console.log('=== PUNCH DEBUG ===');
                console.log('Full punch object:', JSON.stringify(punch, null, 2));
                console.log('Punch type:', punch.type);
                console.log('Punch time:', punch.punchTime);
                console.log('Punch location object:', punch.location);
                console.log('Punch coordinates:', punch.location?.coordinates);
                console.log('Punch coordinates type:', typeof punch.location?.coordinates);
                console.log('Punch coordinates is array:', Array.isArray(punch.location?.coordinates));
                console.log('Punch coordinates length:', punch.location?.coordinates?.length);
                let coordinates = null;
                if (punch.location?.coordinates && Array.isArray(punch.location.coordinates) && punch.location.coordinates.length >= 2) {
                  coordinates = punch.location.coordinates;
                  console.log('Using method 1 - direct coordinates:', coordinates);
                }
                else if (punch.location && typeof punch.location === 'object') {
                  const possibleCoords = [
                    punch.location.coordinates,
                    punch.location.coordinates[1] && punch.location.coordinates[0] ? [punch.location.coordinates[0], punch.location.coordinates[1]] : null,
                    punch.location.coordinates[1] && punch.location.coordinates[0] ? [punch.location.coordinates[1], punch.location.coordinates[0]] : null,
                  ].filter(Boolean);

                  if (possibleCoords.length > 0) {
                    coordinates = possibleCoords[0];
                    console.log('Using method 2 - found coordinates:', coordinates);
                  }
                }

                if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
                  const [lng, lat] = coordinates;
                  console.log('Creating marker for punch:', punch.type, 'at:', lat, lng);

                  const punchTime = punch.punchTime ? format(new Date(punch.punchTime), 'dd/MM/yyyy HH:mm:ss') : 'N/A';

                  return (
                    <Marker
                      key={`punch-${index}-${punch.type}`}
                      position={[lat, lng]}
                      icon={createPunchIcon(punch.type)}
                    >
                      <Popup>
                        <div className="text-center">
                          <div className={`font-semibold mb-1 ${punch.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                            {punch.type === 'IN' ? 'Check-in' : 'Check-out'}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {punchTime}
                          </div>
                          <div className="text-xs text-gray-500">
                            Location Pin
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }

                console.log('No valid coordinates found for punch:', punch.type);
                console.log('Available punch properties:', Object.keys(punch));
                return null;
              })}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="mt-3 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
              </div>
              <span>Outlet Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span>Check-in Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span>Check-out Location</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
