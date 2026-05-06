'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ImageIcon } from 'lucide-react';
import noSelfie from '@/assets/svgs/no-selfie.svg';
import { getCloudFrontUrl } from '@/utils/common-utils';
import 'leaflet/dist/leaflet.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AttendancePunch {
  type: 'IN' | 'OUT';
  punchTime: string;
  location: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  selfieImage?: {
    s3Filename: string;
  };
  zingStatus: number;
}

interface AttendanceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  attendancePunches: AttendancePunch[];
}

export default function AttendanceDetailsModal({
  isOpen,
  onClose,
  selectedDate,
  attendancePunches,
}: AttendanceDetailsModalProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    28.6139, 77.209,
  ]);
  const [mapZoom, setMapZoom] = useState(13);

  const createCustomIcon = (type: 'IN' | 'OUT') => {
    const color = type === 'IN' ? '#22c55e' : '#ef4444';
    const bgColor = type === 'IN' ? '#dcfce7' : '#fee2e2';

    return L.divIcon({
      html: `
        <div style="
          background-color: ${bgColor};
          border: 2px solid ${color};
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 10px;
          color: ${color};
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          ${type}
        </div>
      `,
      className: 'custom-attendance-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  useEffect(() => {
    if (attendancePunches.length > 0) {
      const lats = attendancePunches.map(
        (punch) => punch.location.coordinates[1]
      );
      const lngs = attendancePunches.map(
        (punch) => punch.location.coordinates[0]
      );

      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      setMapCenter([centerLat, centerLng]);
      const latSpread = Math.max(...lats) - Math.min(...lats);
      const lngSpread = Math.max(...lngs) - Math.min(...lngs);
      const maxSpread = Math.max(latSpread, lngSpread);

      if (maxSpread < 0.01) setMapZoom(16);
      else if (maxSpread < 0.1) setMapZoom(14);
      else if (maxSpread < 1) setMapZoom(12);
      else setMapZoom(10);
    }
  }, [attendancePunches]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Activity Overview -{' '}
            {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
          </DialogTitle>
        </DialogHeader>

        {attendancePunches && attendancePunches.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column - Attendance Records and Map */}
            <div className="col-span-2 space-y-6">
              {/* Attendance Table */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">Punch Records</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Punch Type</TableHead>
                      <TableHead>Punch Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendancePunches.map((punch, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              punch.type === 'IN'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {punch.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(punch.punchTime),
                            'dd/MM/yyyy hh:mm:ss a'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Map Section */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">Punch Locations</h3>
                <div className="overflow-hidden rounded-lg border">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '390px', width: '100%' }}
                    className="rounded-lg"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {attendancePunches.map((punch, index) => {
                      const [lng, lat] = punch.location.coordinates;
                      return (
                        <Marker
                          key={index}
                          position={[lat, lng]}
                          icon={createCustomIcon(punch.type)}
                        >
                          <Popup>
                            <div className="min-w-[200px] p-2">
                              <div className="mb-2 flex items-center gap-2">
                                <span
                                  className={`rounded px-2 py-1 text-xs font-semibold ${
                                    punch.type === 'IN'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  PUNCH {punch.type}
                                </span>
                              </div>
                              <div className="mb-1">
                                <strong>Time:</strong>{' '}
                                {format(
                                  new Date(punch.punchTime),
                                  'dd/MM/yyyy hh:mm:ss a'
                                )}
                              </div>
                              <div>
                                <strong>Coordinates:</strong> {lat.toFixed(6)},{' '}
                                {lng.toFixed(6)}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* Map Legend */}
               
              </div>
            </div>

            {/* Right Column - Punch Selfies */}
            <div className="flex h-full flex-col">
              <div className="flex h-full flex-col">
                <h3 className="mb-3 text-lg font-semibold">Punch Selfies</h3>
                <div className="flex flex-1 flex-col gap-4">
                  {/* Punch In Selfie */}
                  {(() => {
                    const punchIn = attendancePunches.find(
                      (punch) => punch.type === 'IN'
                    );
                    return (
                      <div className="flex flex-1 flex-col">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">
                          Punch In
                        </h4>
                        <div
                          className="relative flex min-h-[250px] w-full flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                          style={
                            punchIn?.selfieImage?.s3Filename
                              ? {
                                  backgroundImage: `url(${getCloudFrontUrl(punchIn.selfieImage.s3Filename)})`,
                                  backgroundSize: 'contain',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                }
                              : {}
                          }
                        >
                          {!punchIn?.selfieImage?.s3Filename && (
                            <div className="flex flex-col items-center gap-2 text-center opacity-20">
                              <img
                                src={noSelfie.src}
                                alt="No Selfie Available"
                                className="h-auto w-35"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Punch Out Selfie */}
                  {(() => {
                    const punchOut = attendancePunches.find(
                      (punch) => punch.type === 'OUT'
                    );
                    return (
                      <div className="flex flex-1 flex-col">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">
                          Punch Out
                        </h4>
                        <div
                          className="relative flex min-h-[250px] w-full flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                          style={
                            punchOut?.selfieImage?.s3Filename
                              ? {
                                  backgroundImage: `url(${getCloudFrontUrl(punchOut.selfieImage.s3Filename)})`,
                                  backgroundSize: 'contain',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                }
                              : {}
                          }
                        >
                          {!punchOut?.selfieImage?.s3Filename && (
                            <div className="flex flex-col items-center gap-2 text-center opacity-20">
                              <img
                                src={noSelfie.src}
                                alt="No Selfie Available"
                                className="h-auto w-35"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
