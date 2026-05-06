'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import {
  calculateMapCenter,
  fitMapBounds,
  calculateZoomLevel,
} from '@/utils/map-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CalendarIcon,
  MapPin,
  Users,
  Search,
  Route,
  Loader2,
  Store,
  User,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { Warehouse } from '@/features/warehouse-managment/api/warehouses';
import { useQuery } from '@tanstack/react-query';
import { pjpApi } from '@/features/dashboard/pjp/api/pjp';
import {
  RoutePlansResponse,
  VisitOrderResponse,
} from '@/features/dashboard/pjp/types/pjp.types';
import UserAssignmentModal from './user-assignment-modal';
import { IconHeartQuestion, IconQuestionMark } from '@tabler/icons-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const KELLY_99_COLORS = [
  '#F2F3F4',
  '#222222',
  '#F3C300',
  '#875692',
  '#F38400',
  '#A1CAF1',
  '#BE0032',
  '#C2B280',
  '#848482',
  '#008856',
  '#E68FAC',
  '#0067A5',
  '#F99379',
  '#604E97',
  '#F6A600',
  '#B3446C',
  '#DCD300',
  '#882D17',
  '#8DB600',
  '#654522',
  '#E25822',
  '#2B3D26',
  '#F2F3F4',
  '#222222',
  '#F3C300',
  '#875692',
  '#F38400',
  '#A1CAF1',
  '#BE0032',
  '#C2B280',
  '#848482',
  '#008856',
  '#E68FAC',
  '#0067A5',
  '#F99379',
  '#604E97',
  '#F6A600',
  '#B3446C',
  '#DCD300',
  '#882D17',
  '#8DB600',
  '#654522',
  '#E25822',
  '#2B3D26',
  '#83CAFF',
  '#D62D20',
  '#FFA4FA',
  '#999999',
  '#CBB3A0',
  '#0D4F8C',
  '#C4C31C',
  '#80482B',
  '#A47800',
  '#77312F',
  '#7A9A01',
  '#968AE8',
  '#BB3385',
  '#9E3D22',
  '#F8681F',
  '#39B54A',
  '#AE1441',
  '#E6842A',
  '#C89BCC',
  '#6DD3C0',
  '#C19AAD',
  '#ADB9C7',
  '#C4A34C',
  '#A0A1FF',
  '#8AA2CD',
  '#2E8B57',
  '#B7B3FF',
  '#72A0C1',
  '#1E90FF',
  '#FFB347',
  '#7B68EE',
  '#20B2AA',
  '#DDA0DD',
  '#98FB98',
  '#F0E68C',
  '#87CEEB',
  '#DEB887',
  '#CD5C5C',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#D2B4DE',
  '#AED6F1',
  '#A3E4D7',
  '#F9E79F',
  '#FADBD8',
  '#D5DBDB',
  '#FCF3CF',
  '#EBDEF0',
  '#EAF2F8',
  '#E8F8F5',
];

const getUserColor = (userId: string, index?: number) => {
  if (typeof index === 'number') {
    const colorIndex = (index % (KELLY_99_COLORS.length - 2)) + 2;
    return KELLY_99_COLORS[colorIndex];
  }

  // Fallback to hash-based color for consistency
  const hash = userId.split('').reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0);
    return acc & acc;
  }, 0);
  const colorIndex = (Math.abs(hash) % (KELLY_99_COLORS.length - 2)) + 2;
  return KELLY_99_COLORS[colorIndex];
};

// Clean warehouse icon
const createWarehouseIcon = () =>
  L.divIcon({
    html: `<div style="
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 3px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  </div>`,
    className: 'warehouse-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createUserLocationIcon = (userId: string, index?: number) => {
  const color = getUserColor(userId, index);
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
     🧑🏼‍💼
    </div>`,
    className: 'user-location-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createOutletIcon = (
  userId: string,
  index?: number,
  userIndex?: number
) => {
  const color = getUserColor(userId, userIndex);
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 12px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    ">${index || ''}</div>`,
    className: 'outlet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createUnassignedOutletIcon = (isSelected: boolean = false) => {
  return L.divIcon({
    html: `<div style="
      background: #6B7280;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid ${isSelected ? '#FFD700' : 'white'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${isSelected ? '#FFD700' : 'white'};
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      cursor: pointer;
    ">?</div>`,
    className: 'unassigned-outlet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface RoutingComponentProps {
  outlets: OutletWithDate[];
  userIndexMap: Map<string, number>;
  showRoutes: boolean;
  setIsRoutingLoading: (loading: boolean) => void;
  setPendingRoutesCount: (count: number) => void;
  uniqueUsers: Array<{
    userId: string;
    userName: string;
    userCode: string;
    coordinates?: [number, number];
    totalOutlets: number;
    warehouseId: string;
  }>;
}

const RoutingComponent = ({
  outlets,
  userIndexMap,
  showRoutes,
  setIsRoutingLoading,
  setPendingRoutesCount,
  uniqueUsers,
}: RoutingComponentProps) => {
  const map = useMap();
  const pendingRoutesRef = useRef(0);

  useEffect(() => {
    if (!showRoutes) return;

    const routingControls: L.Routing.Control[] = [];
    pendingRoutesRef.current = 0;

    setIsRoutingLoading(true);

    // Group outlets by user and date
    const userRoutes = new Map<string, Map<string, OutletWithDate[]>>();

    outlets.forEach((outlet) => {
      if (!userRoutes.has(outlet.userId)) {
        userRoutes.set(outlet.userId, new Map());
      }
      const userDateMap = userRoutes.get(outlet.userId)!;

      if (!userDateMap.has(outlet.visitDate)) {
        userDateMap.set(outlet.visitDate, []);
      }
      userDateMap.get(outlet.visitDate)!.push(outlet);
    });

    // Collect all routing operations first
    const routingOperations: Array<{
      routingControl: L.Routing.Control;
      delay: number;
    }> = [];

    userRoutes.forEach((dateMap, userId) => {
      const userIndex = userIndexMap.get(userId) || 0;
      const userColor = getUserColor(userId, userIndex);
      
      // Get user's location coordinates
      const user = uniqueUsers.find((u) => u.userId === userId);
      const userLocation = user?.coordinates;

      dateMap.forEach((userOutlets, visitDate) => {
        if (userOutlets.length > 0) {
          // Sort outlets by their index to maintain visit order
          const sortedOutlets = [...userOutlets].sort(
            (a, b) => a.index - b.index
          );

          // Create waypoints from outlet coordinates
          const outletWaypoints = sortedOutlets.map((outlet) =>
            L.latLng(outlet.coordinates[1], outlet.coordinates[0])
          );

          // Add user location as start and end points if available
          let waypoints = outletWaypoints;
          if (userLocation && userLocation.length === 2) {
            const userLatLng = L.latLng(userLocation[1], userLocation[0]);
            waypoints = [userLatLng, ...outletWaypoints, userLatLng];
          }

          if (waypoints.length > 1) {
            pendingRoutesRef.current++;

            const routingControl = L.Routing.control({
              waypoints,
              routeWhileDragging: false,
              addWaypoints: false,
              plan: L.Routing.plan(waypoints, {
                createMarker: function () {
                  return false;
                },
                routeWhileDragging: false,
                addWaypoints: false,
              }),
              lineOptions: {
                styles: [
                  {
                    color: userColor,
                    weight: 6,
                    opacity: 1.0,
                  },
                ],
                extendToWaypoints: true,
                missingRouteTolerance: 10,
              },
              router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving',
                timeout: 30000,
              }),
              show: false,
              autoRoute: false, // Set to false to control when routing starts
              fitSelectedRoutes: false,
            });

            routingControl.on('routesfound', () => {
              pendingRoutesRef.current--;
              setPendingRoutesCount(pendingRoutesRef.current);
              if (pendingRoutesRef.current === 0) {
                setIsRoutingLoading(false);
              }
            });

            routingControl.on('routingerror', () => {
              pendingRoutesRef.current--;
              setPendingRoutesCount(pendingRoutesRef.current);
              if (pendingRoutesRef.current === 0) {
                setIsRoutingLoading(false);
              }
            });

            routingControl.addTo(map);
            routingControls.push(routingControl);

            // delay
            routingOperations.push({
              routingControl,
              delay: routingOperations.length * 1500,
            });
          }
        }
      });
    });

    routingOperations.forEach(({ routingControl, delay }) => {
      setTimeout(() => {
        routingControl.route();
      }, delay);
    });

    setPendingRoutesCount(pendingRoutesRef.current);

    if (pendingRoutesRef.current === 0) {
      setIsRoutingLoading(false);
    }

    return () => {
      setIsRoutingLoading(false);
      routingControls.forEach((control) => {
        try {
          map.removeControl(control);
        } catch {}
      });
    };
  }, [
    map,
    outlets,
    userIndexMap,
    showRoutes,
    setIsRoutingLoading,
    setPendingRoutesCount,
    uniqueUsers,
  ]);

  return null;
};

// Custom hook for modal-specific PJP data
const useModalPjpData = (warehouseIds?: string[], isModalOpen?: boolean) => {
  return useQuery<RoutePlansResponse>({
    queryKey: ['modal-route-plans', warehouseIds],
    queryFn: async () => {
      const response = await pjpApi.getAll(
        0, // skip
        10, // limit
        undefined, // search
        warehouseIds,
        'auto', // routePlanMode
        undefined, // divisionId
        undefined, // channelId
        undefined, // zoneId
        undefined, // subZoneId
        undefined, // salesPersonId
        true // nonPaginated - set to true
      );

      return response;
    },
    enabled: !!warehouseIds && warehouseIds.length > 0 && !!isModalOpen,
  });
};

interface WarehouseMapViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWarehouseIds?: string[];
}

interface UserWithDate {
  userId: string;
  userName: string;
  userCode: string;
  visitDate: string;
  routePlanId: string;
  planType: string;
  status: string;
  totalOutlets: number;
  totalDays: number;
}

interface OutletWithDate {
  outletId: string;
  outletName: string;
  visitDate: string;
  userId: string;
  userName: string;
  userCode: string;
  routePlanId: string;
  warehouseId: string;
  coordinates: [number, number]; // [lng, lat]
  index: number;
}

const MapBoundsFitter = ({
  warehouses,
  outlets,
  unassignedOutlets,
  showUnassigned,
  selectedSalesPerson,
  uniqueUsers,
}: {
  warehouses: Warehouse[];
  outlets: OutletWithDate[];
  unassignedOutlets?: Array<{
    outletId: string;
    outletName: string;
    coordinates: [number, number];
    warehouseId: string;
    visitDate: string;
    visitOrderId: string;
  }>;
  showUnassigned?: boolean;
  selectedSalesPerson?: string | null;
  uniqueUsers?: Array<{
    userId: string;
    userName: string;
    userCode: string;
    coordinates?: [number, number];
    totalOutlets: number;
    warehouseId: string;
  }>;
}) => {
  const map = useMap();

  useEffect(() => {
    const coordinates: { lat: number; lng: number }[] = [];

    // Add warehouse coordinates
    warehouses
      .filter((warehouse) => warehouse.address?.location?.coordinates)
      .forEach((warehouse) => {
        coordinates.push({
          lat: warehouse.address.location.coordinates[1],
          lng: warehouse.address.location.coordinates[0],
        });
      });

    // Add outlet coordinates
    outlets.forEach((outlet) => {
      coordinates.push({
        lat: outlet.coordinates[1],
        lng: outlet.coordinates[0],
      });
    });

    // Add user coordinates if a specific user is selected
    if (selectedSalesPerson && uniqueUsers) {
      const selectedUser = uniqueUsers.find(
        (user) => user.userId === selectedSalesPerson
      );
      if (selectedUser?.coordinates) {
        coordinates.push({
          lat: selectedUser.coordinates[1],
          lng: selectedUser.coordinates[0],
        });
      }
    }

    // Add unassigned outlet coordinates if showing unassigned
    if (showUnassigned && unassignedOutlets) {
      unassignedOutlets.forEach((outlet) => {
        coordinates.push({
          lat: outlet.coordinates[1],
          lng: outlet.coordinates[0],
        });
      });
    }

    if (coordinates.length > 0) {
      fitMapBounds(map, coordinates, { padding: [20, 20], maxZoom: 22 });
    }
  }, [
    map,
    warehouses,
    outlets,
    unassignedOutlets,
    showUnassigned,
    selectedSalesPerson,
    uniqueUsers,
  ]);

  return null;
};

const WarehouseMapViewModal = ({
  open,
  onOpenChange,
  selectedWarehouseIds = [],
}: WarehouseMapViewModalProps) => {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null
  );
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string | null>(
    null
  );
  const [showRoutes, setShowRoutes] = useState(false);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [pendingRoutesCount, setPendingRoutesCount] = useState(0);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [selectedUnassignedOutlets, setSelectedUnassignedOutlets] = useState<
    Set<string>
  >(new Set());
  const [userSelectionModalOpen, setUserSelectionModalOpen] = useState(false);
  const [selectedUserForAssignment, setSelectedUserForAssignment] =
    useState<any>(null);
  const [salesPersonsSectionOpen, setSalesPersonsSectionOpen] = useState(false);
  const [outletsSectionOpen, setOutletsSectionOpen] = useState(false);
  const [unassignedOutletsSectionOpen, setUnassignedOutletsSectionOpen] =
    useState(false);

  // Fetch warehouses
  const { warehousesQuery } = useWarehouse(undefined, {
    warehouseIds:
      selectedWarehouseIds.length > 0 ? selectedWarehouseIds : undefined,
    nonPaginated: true,
  });

  // Fetch PJP data for selected warehouses using modal-specific hook
  const routePlans = useModalPjpData(
    selectedWarehouseIds.length > 0 ? selectedWarehouseIds : undefined,
    open
  );

  // Fetch unassigned outlets using a direct query when needed
  const unassignedQuery = useQuery<VisitOrderResponse>({
    queryKey: [
      'unassigned-outlets',
      selectedWarehouseIds,
      showUnassigned,
      selectedDateRange,
    ],
    queryFn: async () => {
      // API appears to take a single date; when a range is selected, fetch all and filter client-side
      const visitDate = selectedDateRange?.from && !selectedDateRange?.to
        ? format(selectedDateRange.from, 'yyyy-MM-dd')
        : selectedDateRange?.from && selectedDateRange?.to
          ? undefined
          : selectedDateRange?.from
            ? format(selectedDateRange.from, 'yyyy-MM-dd')
            : undefined;
      const response = await pjpApi.getPjpHistory(
        undefined, // skip
        undefined, // limit
        undefined, // userId
        JSON.stringify(selectedWarehouseIds), // warehouseId as JSON array string
        undefined, // channelId
        'unassigned', // status
        undefined, // divisionId
        undefined, // zoneId
        undefined, // subZoneId
        true, // nonPaginated
        visitDate // visitDate parameter
      );
      return response;
    },
    enabled: showUnassigned && selectedWarehouseIds.length > 0 && open,
  });

  const warehouses = useMemo(
    () => warehousesQuery?.data?.data?.items || [],
    [warehousesQuery?.data?.data?.items]
  );
  const pjpData = useMemo(() => {
    const items = routePlans?.data?.data?.items;
    if (!items) return [] as any[];
    return Array.isArray(items) ? items : Object.values(items);
  }, [routePlans?.data?.data?.items]);

  // Create user index mapping for consistent colors
  const userIndexMap = useMemo(() => {
    const uniqueUserIds = new Set<string>();
    pjpData.forEach((routePlan: any) => {
      if (routePlan.userId) {
        uniqueUserIds.add(routePlan.userId);
      }
    });
    const userMap = new Map<string, number>();
    Array.from(uniqueUserIds).forEach((userId, index) => {
      userMap.set(userId, index);
    });
    return userMap;
  }, [pjpData]);

  // Process users with date information and location
  const usersWithDates = useMemo(() => {
    const userMap = new Map<string, UserWithDate[]>();

    if (!Array.isArray(pjpData)) {
      return userMap;
    }

    pjpData.forEach((routePlan: any) => {
      if (routePlan.journeyPlan && Array.isArray(routePlan.journeyPlan)) {
        routePlan.journeyPlan.forEach((day: any) => {
          if (day.visitDate && day.outlets) {
            const userInfo: UserWithDate = {
              userId: routePlan.userId,
              userName:
                routePlan.userInfo?.name || routePlan.userName || 'Unknown',
              userCode: routePlan.userInfo?.employeeCode || 'N/A',
              visitDate: format(new Date(day.visitDate), 'yyyy-MM-dd'), // Convert to consistent format
              routePlanId: routePlan.routePlanId,
              planType: routePlan.planType || 'Auto',
              status: routePlan.status || 'Active',
              totalOutlets: day.outlets.length,
              totalDays: routePlan.journeyPlan.length,
            };

            const warehouseIdEntry = routePlan.warehouseId?.[0];
            const warehouseId =
              typeof warehouseIdEntry === 'string'
                ? warehouseIdEntry
                : warehouseIdEntry?.warehouseId;
            if (warehouseId) {
              if (!userMap.has(warehouseId)) {
                userMap.set(warehouseId, []);
              }
              userMap.get(warehouseId)!.push(userInfo);
            }
          }
        });
      }
    });

    return userMap;
  }, [pjpData]);

  // Get unique users with their locations
  const uniqueUsers = useMemo(() => {
    const userSet = new Set<string>();
    const users: Array<{
      userId: string;
      userName: string;
      userCode: string;
      coordinates?: [number, number];
      totalOutlets: number;
      warehouseId: string;
    }> = [];

    if (!Array.isArray(pjpData)) {
      return users;
    }

    pjpData.forEach((routePlan: any) => {
      if (!userSet.has(routePlan.userId)) {
        userSet.add(routePlan.userId);

        // Calculate total outlets for this user
        let totalOutlets = 0;
        if (routePlan.journeyPlan && Array.isArray(routePlan.journeyPlan)) {
          routePlan.journeyPlan.forEach((day: any) => {
            if (day.outlets) {
              totalOutlets += day.outlets.length;
            }
          });
        }

        users.push({
          userId: routePlan.userId,
          userName: routePlan.userInfo?.name || routePlan.userName || 'Unknown',
          userCode: routePlan.userInfo?.employeeCode || 'N/A',
          coordinates: routePlan.userInfo?.userAddress?.location?.coordinates,
          totalOutlets,
          warehouseId:
            typeof routePlan.warehouseId?.[0] === 'string'
              ? routePlan.warehouseId?.[0]
              : routePlan.warehouseId?.[0]?.warehouseId || '',
        });
      }
    });

    return users;
  }, [pjpData]);

  // Process outlets with date information
  const outletsWithDates = useMemo(() => {
    const outletList: OutletWithDate[] = [];

    if (!Array.isArray(pjpData)) {
      return outletList;
    }

    pjpData.forEach((routePlan: any) => {
      if (routePlan.journeyPlan && Array.isArray(routePlan.journeyPlan)) {
        routePlan.journeyPlan.forEach((day: any) => {
          if (day.visitDate && day.outlets && Array.isArray(day.outlets)) {
            day.outlets.forEach((outlet: any, index: number) => {
              if (outlet.outletId && outlet.location?.coordinates) {
                const outletInfo: OutletWithDate = {
                  outletId: outlet.outletId,
                  outletName: outlet.outletName || 'Unknown Outlet',
                  visitDate: format(new Date(day.visitDate), 'yyyy-MM-dd'), // Convert to consistent format
                  userId: routePlan.userId,
                  userName:
                    routePlan.userInfo?.name || routePlan.userName || 'Unknown',
                  userCode: routePlan.userInfo?.employeeCode || 'N/A',
                  routePlanId: routePlan.routePlanId,
                  warehouseId:
                    typeof routePlan.warehouseId?.[0] === 'string'
                      ? routePlan.warehouseId?.[0]
                      : routePlan.warehouseId?.[0]?.warehouseId || '',
                  coordinates: outlet.location.coordinates,
                  index: outlet.index || index + 1,
                };
                outletList.push(outletInfo);
              }
            });
          }
        });
      }
    });

    return outletList;
  }, [pjpData]);

  // Process unassigned outlets
  const unassignedOutlets = useMemo(() => {
    const unassignedList: Array<{
      outletId: string;
      outletName: string;
      coordinates: [number, number];
      warehouseId: string;
      visitDate: string;
      visitOrderId: string;
    }> = [];

    if (unassignedQuery.data?.data?.items) {
      const unassignedItems = unassignedQuery.data.data.items;

      // Handle both array and object formats
      const itemsArray = Array.isArray(unassignedItems)
        ? unassignedItems
        : Object.values(unassignedItems);

      itemsArray.forEach((item: any) => {
        if (item.location?.coordinates && item.visitOrderId) {
          unassignedList.push({
            outletId: item.outletId,
            outletName: item.outletName,
            coordinates: item.location.coordinates,
            warehouseId: item.warehouseId,
            visitDate: item.visitDate
              ? format(new Date(item.visitDate), 'yyyy-MM-dd')
              : '',
            visitOrderId: item.visitOrderId,
          });
        }
      });
    }

    // Filter by selected date range client-side when range is chosen
    if (selectedDateRange && selectedDateRange.from) {
      const from = new Date(
        selectedDateRange.from.getFullYear(),
        selectedDateRange.from.getMonth(),
        selectedDateRange.from.getDate()
      );
      const toBase = selectedDateRange.to || selectedDateRange.from;
      const to = new Date(toBase.getFullYear(), toBase.getMonth(), toBase.getDate());
      return unassignedList.filter((o) => {
        if (!o.visitDate) return false;
        const d = new Date(o.visitDate);
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return dateOnly >= from && dateOnly <= to;
      });
    }

    return unassignedList;
  }, [unassignedQuery.data, selectedDateRange]);

  // Filter warehouses based on search term
  const filteredWarehouses = useMemo(() => {
    if (!searchTerm) return warehouses;
    return warehouses.filter(
      (warehouse: Warehouse) =>
        warehouse.warehouseName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        warehouse.divisionName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        warehouse.channelName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [warehouses, searchTerm]);

  // Filter outlets based on selected warehouses, date, and sales person
  const filteredOutlets = useMemo(() => {
    let filtered = outletsWithDates;
    const isDateWithinRange = (dateStr: string, range?: DateRange) => {
      if (!range || !range.from) return true;
      const date = new Date(dateStr);
      const from = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
      const toBase = range.to || range.from;
      const to = new Date(toBase.getFullYear(), toBase.getMonth(), toBase.getDate());
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return d >= from && d <= to;
    };

    // Filter by selected warehouses
    if (selectedWarehouseIds.length > 0) {
      filtered = filtered.filter((outlet) =>
        selectedWarehouseIds.includes(outlet.warehouseId)
      );
    }

    // Filter by selected date range
    filtered = filtered.filter((outlet) => isDateWithinRange(outlet.visitDate, selectedDateRange));

    // Filter by selected sales person
    if (selectedSalesPerson) {
      filtered = filtered.filter(
        (outlet) => outlet.userId === selectedSalesPerson
      );
    }

    return filtered;
  }, [
    outletsWithDates,
    selectedWarehouseIds,
    selectedDateRange,
    selectedSalesPerson,
  ]);

  // Get users for selected warehouse and selected date range
  const getUsersForWarehouse = (warehouseId: string) => {
    const users = usersWithDates.get(warehouseId) || [];
    if (!selectedDateRange || !selectedDateRange.from) return users;
    const from = new Date(
      selectedDateRange.from.getFullYear(),
      selectedDateRange.from.getMonth(),
      selectedDateRange.from.getDate()
    );
    const toBase = selectedDateRange.to || selectedDateRange.from;
    const to = new Date(toBase.getFullYear(), toBase.getMonth(), toBase.getDate());
    return users.filter((user) => {
      const d = new Date(user.visitDate);
      const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dateOnly >= from && dateOnly <= to;
    });
  };

  // Handle unassigned outlet selection - use visitOrderId for tracking
  const handleUnassignedOutletClick = (visitOrderId: string) => {
    setSelectedUnassignedOutlets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(visitOrderId)) {
        newSet.delete(visitOrderId);
      } else {
        newSet.add(visitOrderId);
      }
      return newSet;
    });
  };

  // Handle assign user action
  const handleAssignUser = () => {
    if (selectedUnassignedOutlets.size === 0) {
      return;
    }
    setUserSelectionModalOpen(true);
  };

  // Handle user assignment confirmation
  const handleUserAssignmentConfirm = async () => {
    if (!selectedUserForAssignment || selectedUnassignedOutlets.size === 0) {
      return;
    }

    try {
      // Format the visit date
      const visitDate = selectedDateRange?.from
        ? format(selectedDateRange.from, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');

      // Construct the payload
      const payload = {
        visitOrderId: Array.from(selectedUnassignedOutlets),
        userId: selectedUserForAssignment.userId as string,
        routePlanId: (selectedUserForAssignment as any)?.routePlanId || '',
        visitDate: visitDate,
      };

      console.log('Assigning outlets with payload:', payload);

      // Call the API
      await pjpApi.assignOutletsToUser(payload);

      // Success notification
      toast.success(
        `Successfully assigned ${selectedUnassignedOutlets.size} outlets to ${selectedUserForAssignment.name || 'user'}`
      );

      // Refresh the unassigned outlets query to update the map
      await unassignedQuery.refetch();

      // Close modal and reset state
      setUserSelectionModalOpen(false);
      setSelectedUserForAssignment(null);
      setSelectedUnassignedOutlets(new Set());
    } catch (error: any) {
      console.error('Failed to assign outlets:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to assign outlets to user'
      );
    }
  };

  // Handle user assignment cancel
  const handleUserAssignmentCancel = () => {
    setUserSelectionModalOpen(false);
    setSelectedUserForAssignment(null);
  };

  // Calculate map center and zoom
  const mapCenter = useMemo(() => {
    const coordinates: { lat: number; lng: number }[] = [];

    // Add warehouse coordinates
    filteredWarehouses
      .filter(
        (warehouse: Warehouse) => warehouse.address?.location?.coordinates
      )
      .forEach((warehouse: Warehouse) => {
        coordinates.push({
          lat: warehouse.address.location.coordinates[1],
          lng: warehouse.address.location.coordinates[0],
        });
      });

    // Add outlet coordinates
    filteredOutlets.forEach((outlet) => {
      coordinates.push({
        lat: outlet.coordinates[1],
        lng: outlet.coordinates[0],
      });
    });

    // Add selected user coordinates if a specific user is selected
    if (selectedSalesPerson) {
      const selectedUser = uniqueUsers.find(
        (user) => user.userId === selectedSalesPerson
      );
      if (selectedUser?.coordinates) {
        coordinates.push({
          lat: selectedUser.coordinates[1],
          lng: selectedUser.coordinates[0],
        });
      }
    }

    // Add unassigned outlet coordinates if showing unassigned
    if (showUnassigned) {
      unassignedOutlets.forEach((outlet) => {
        coordinates.push({
          lat: outlet.coordinates[1],
          lng: outlet.coordinates[0],
        });
      });
    }

    return calculateMapCenter(coordinates);
  }, [
    filteredWarehouses,
    filteredOutlets,
    showUnassigned,
    unassignedOutlets,
    selectedSalesPerson,
    uniqueUsers,
  ]);

  const zoomLevel = useMemo(() => {
    const coordinates: { lat: number; lng: number }[] = [];

    // Add warehouse coordinates
    filteredWarehouses
      .filter(
        (warehouse: Warehouse) => warehouse.address?.location?.coordinates
      )
      .forEach((warehouse: Warehouse) => {
        coordinates.push({
          lat: warehouse.address.location.coordinates[1],
          lng: warehouse.address.location.coordinates[0],
        });
      });

    // Add outlet coordinates
    filteredOutlets.forEach((outlet) => {
      coordinates.push({
        lat: outlet.coordinates[1],
        lng: outlet.coordinates[0],
      });
    });

    // Add selected user coordinates if a specific user is selected
    if (selectedSalesPerson) {
      const selectedUser = uniqueUsers.find(
        (user) => user.userId === selectedSalesPerson
      );
      if (selectedUser?.coordinates) {
        coordinates.push({
          lat: selectedUser.coordinates[1],
          lng: selectedUser.coordinates[0],
        });
      }
    }

    // Add unassigned outlet coordinates if showing unassigned
    if (showUnassigned) {
      unassignedOutlets.forEach((outlet) => {
        coordinates.push({
          lat: outlet.coordinates[1],
          lng: outlet.coordinates[0],
        });
      });
    }

    return calculateZoomLevel(coordinates);
  }, [
    filteredWarehouses,
    filteredOutlets,
    showUnassigned,
    unassignedOutlets,
    selectedSalesPerson,
    uniqueUsers,
  ]);

  const handleWarehouseClick = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedWarehouse(null);
    setSelectedSalesPerson(null);
    setSearchTerm('');
    setSelectedDateRange(undefined);
    setSelectedUnassignedOutlets(new Set()); // Reset selected outlets
    setShowUnassigned(false); // Reset unassigned view
  };

  if (warehousesQuery?.isLoading || routePlans?.isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[90vh] max-w-7xl">
          <div className="flex h-full items-center justify-center">
            <Loading text="Loading warehouses and route plans..." />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (warehousesQuery?.error || routePlans?.error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[90vh] max-w-7xl">
          <div className="flex h-full items-center justify-center">
            <GenericError text="Failed to load data. Please try again." />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show message if no warehouses are selected
  if (selectedWarehouseIds.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[90vh] max-w-7xl">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MapPin className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">
                No Warehouses Selected
              </h3>
              <p className="text-gray-500">
                Please select warehouses from the filters to view them on the
                map.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[90vh] max-w-[90vw] flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            Warehouse Map View
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Enhanced Left Sidebar */}
          <div className="flex h-full w-96 flex-col border-r bg-gradient-to-b from-gray-50 to-white shadow-sm">
            <div className="flex-shrink-0 border-b bg-white p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    placeholder="Search users and outlets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-gray-200 pl-10 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start border-gray-200 text-left font-normal',
                        !selectedDateRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDateRange?.from && selectedDateRange?.to
                        ? `${format(selectedDateRange.from, 'PPP')} - ${format(selectedDateRange.to, 'PPP')}`
                        : selectedDateRange?.from
                          ? `${format(selectedDateRange.from, 'PPP')}`
                          : 'All dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="range"
                      selected={selectedDateRange as any}
                      onSelect={setSelectedDateRange as any}
                      defaultToToday={true}
                      preventDeselection={true}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={showRoutes ? 'default' : 'outline'}
                    onClick={() => setShowRoutes(!showRoutes)}
                    className="w-full"
                    size="sm"
                    disabled={isRoutingLoading}
                  >
                    {isRoutingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Route className="h-4 w-4" />
                    )}
                    {isRoutingLoading
                      ? `${pendingRoutesCount} remaining`
                      : showRoutes
                        ? 'Hide Routes'
                        : 'Show Routes'}
                  </Button>

                  <Button
                    variant={showUnassigned ? 'default' : 'outline'}
                    onClick={() => setShowUnassigned(!showUnassigned)}
                    className="w-full"
                    size="sm"
                    disabled={unassignedQuery.isLoading}
                  >
                    {unassignedQuery.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    {unassignedQuery.isLoading
                      ? 'Loading...'
                      : showUnassigned
                        ? 'Hide Unassigned'
                        : 'Show Unassigned'}
                  </Button>
                </div>

                {showUnassigned && unassignedOutlets.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (
                          selectedUnassignedOutlets.size ===
                          unassignedOutlets.length
                        ) {
                          // Deselect all
                          setSelectedUnassignedOutlets(new Set());
                        } else {
                          // Select all
                          setSelectedUnassignedOutlets(
                            new Set(
                              unassignedOutlets.map((o) => o.visitOrderId)
                            )
                          );
                        }
                      }}
                      className="w-full"
                      size="sm"
                    >
                      {selectedUnassignedOutlets.size ===
                      unassignedOutlets.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>

                    {selectedUnassignedOutlets.size > 0 && (
                      <Button
                        variant="secondary"
                        onClick={handleAssignUser}
                        className="w-full"
                        size="sm"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Assign User ({selectedUnassignedOutlets.size} selected)
                      </Button>
                    )}
                  </div>
                )}

                {showUnassigned && unassignedOutlets.length > 0 && (
                  <div className="mt-2 rounded-lg bg-gray-50 p-2">
                    <div className="flex w-full items-center justify-between gap-2 text-sm text-gray-600">
                      <span>
                        {unassignedOutlets.length} unassigned outlets found
                      </span>
                      {selectedUnassignedOutlets.size > 0 && (
                        <span className="ml-2 rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                          {selectedUnassignedOutlets.size} selected
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  <Collapsible
                    open={salesPersonsSectionOpen}
                    onOpenChange={setSalesPersonsSectionOpen}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="mb-3 flex items-center gap-2 rounded-t-lg transition-colors hover:bg-gray-50">
                        <div className="rounded-lg bg-blue-100 p-1.5">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-semibold text-gray-800">
                            Sales Persons
                          </h3>
                          <p className="text-xs text-gray-500">
                            {uniqueUsers.length} active users
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            salesPersonsSectionOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="h-52">
                        <div className="space-y-2 pr-4">
                          {uniqueUsers
                            .filter(
                              (user) =>
                                !searchTerm ||
                                user.userName
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase()) ||
                                user.userCode
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase())
                            )
                            .map((user) => {
                              const userIndex =
                                userIndexMap.get(user.userId) || 0;
                              // Use outletsWithDates instead of filteredOutlets to show correct counts
                              const userOutlets = outletsWithDates.filter(
                                (outlet) => {
                                  // Filter by user
                                  if (outlet.userId !== user.userId)
                                    return false;

                                  // Filter by selected warehouses
                                  if (
                                    selectedWarehouseIds.length > 0 &&
                                    !selectedWarehouseIds.includes(
                                      outlet.warehouseId
                                    )
                                  ) {
                                    return false;
                                  }

                                  // Filter by selected date range
                                  if (selectedDateRange && selectedDateRange.from) {
                                    const from = new Date(
                                      selectedDateRange.from.getFullYear(),
                                      selectedDateRange.from.getMonth(),
                                      selectedDateRange.from.getDate()
                                    );
                                    const toBase = selectedDateRange.to || selectedDateRange.from;
                                    const to = new Date(
                                      toBase.getFullYear(),
                                      toBase.getMonth(),
                                      toBase.getDate()
                                    );
                                    const d = new Date(outlet.visitDate);
                                    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    if (!(dateOnly >= from && dateOnly <= to)) return false;
                                  }

                                  return true;
                                }
                              );

                              return (
                                <Card
                                  key={user.userId}
                                  className={`cursor-pointer rounded-l-none rounded-r-md border-l-4 p-0 shadow-none transition-all hover:shadow-md ${
                                    selectedSalesPerson === user.userId
                                      ? 'bg-freshleaf/10'
                                      : ''
                                  }`}
                                  style={{
                                    borderLeftColor: getUserColor(
                                      user.userId,
                                      userIndex
                                    ),
                                  }}
                                  onClick={() => {
                                    setSelectedSalesPerson(
                                      selectedSalesPerson === user.userId
                                        ? null
                                        : user.userId
                                    );
                                  }}
                                >
                                  <CardContent className="p-3">
                                    <div className="mb-2 flex items-start gap-2">
                                      <div
                                        className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full shadow-sm"
                                        style={{
                                          backgroundColor: getUserColor(
                                            user.userId,
                                            userIndex
                                          ),
                                        }}
                                      />
                                      <div className="flex w-full items-center justify-between">
                                        <div className="truncate text-xs font-semibold text-gray-800">
                                          {user.userName}
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
                                        >
                                          {userOutlets.length}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Enhanced Outlets Section */}
                  <Collapsible
                    open={outletsSectionOpen}
                    onOpenChange={setOutletsSectionOpen}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="mb-3 flex items-center gap-2 rounded-t-lg transition-colors hover:bg-gray-50">
                        <div className="rounded-lg bg-green-100 p-1.5">
                          <Store className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-semibold text-gray-800">
                            Outlets
                          </h3>
                          <p className="text-xs text-gray-500">
                            {filteredOutlets.length} scheduled visits
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            outletsSectionOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2 pr-4">
                          {filteredOutlets
                            .filter(
                              (outlet) =>
                                !searchTerm ||
                                outlet.outletName
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase()) ||
                                outlet.userName
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase())
                            )
                            .map((outlet) => {
                              const userIndex =
                                userIndexMap.get(outlet.userId) || 0;

                              return (
                                <Card
                                  key={`${outlet.outletId}-${outlet.visitDate}-${outlet.userId}`}
                                  className="rounded-l-none rounded-r-md border-l-4 p-0 shadow-none"
                                  style={{
                                    borderLeftColor: getUserColor(
                                      outlet.userId,
                                      userIndex
                                    ),
                                  }}
                                >
                                  <CardContent className="p-3">
                                    <div className="mb-2 flex items-start gap-2">
                                      <div
                                        className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full shadow-sm"
                                        style={{
                                          backgroundColor: getUserColor(
                                            outlet.userId,
                                            userIndex
                                          ),
                                        }}
                                      />
                                      <div className="flex w-full items-center justify-between">
                                        <div className="truncate text-xs font-semibold text-gray-800">
                                          {outlet.outletName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          #{outlet.index}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between space-y-1 text-xs text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <span className="truncate">
                                          {outlet.userName}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span>
                                          {format(
                                            new Date(outlet.visitDate),
                                            'MMM dd'
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Unassigned Outlets Section */}
                  {showUnassigned && (
                    <Collapsible
                      open={unassignedOutletsSectionOpen}
                      onOpenChange={setUnassignedOutletsSectionOpen}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="mb-3 flex items-center gap-2 transition-colors hover:bg-gray-50">
                          <div className="rounded-lg bg-gray-100 p-1.5">
                            <Store className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="text-sm font-semibold text-gray-800">
                              Unassigned Outlets
                            </h3>
                            <p className="text-xs text-gray-500">
                              {unassignedOutlets.length} outlets need assignment
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform ${
                              unassignedOutletsSectionOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-2 pr-4">
                            {unassignedOutlets
                              .filter(
                                (outlet) =>
                                  !searchTerm ||
                                  outlet.outletName
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()) ||
                                  outlet.outletId
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase())
                              )
                              .map((outlet) => {
                                const isSelected =
                                  selectedUnassignedOutlets.has(
                                    outlet.visitOrderId
                                  );

                                return (
                                  <Card
                                    key={outlet.visitOrderId}
                                    className={`cursor-pointer rounded-l-none rounded-r-md border-l-4 p-0 shadow-none transition-all hover:shadow-md ${
                                      isSelected
                                        ? 'border-l-yellow-500 bg-yellow-50'
                                        : 'border-l-gray-400'
                                    }`}
                                    onClick={() =>
                                      handleUnassignedOutletClick(
                                        outlet.visitOrderId
                                      )
                                    }
                                  >
                                    <CardContent className="p-3">
                                      <div className="mb-2 flex items-start gap-2">
                                        <div
                                          className={`mt-0.5 h-3 w-3 flex-shrink-0 rounded-full shadow-sm ${
                                            isSelected
                                              ? 'bg-yellow-500'
                                              : 'bg-gray-400'
                                          }`}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-xs font-semibold text-gray-800">
                                            {outlet.outletName}
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <div className="flex-shrink-0 text-yellow-600">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            {unassignedOutlets.filter(
                              (outlet) =>
                                !searchTerm ||
                                outlet.outletName
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase()) ||
                                outlet.outletId
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase())
                            ).length === 0 && (
                              <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
                                <Store className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">
                                  {searchTerm
                                    ? 'No unassigned outlets match your search'
                                    : 'No unassigned outlets found'}
                                </p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Enhanced Map Container */}
          <div className="flex flex-1 flex-col bg-gray-50">
            <div className="relative h-full">
              <MapContainer
                center={mapCenter}
                zoom={zoomLevel}
                minZoom={2}
                maxZoom={20}
                style={{ height: '100%', width: '100%' }}
                className="h-full w-full overflow-hidden rounded-r-lg"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBoundsFitter
                  warehouses={filteredWarehouses}
                  outlets={filteredOutlets}
                  unassignedOutlets={unassignedOutlets}
                  showUnassigned={showUnassigned}
                  selectedSalesPerson={selectedSalesPerson}
                  uniqueUsers={uniqueUsers}
                />

                <RoutingComponent
                  outlets={filteredOutlets}
                  userIndexMap={userIndexMap}
                  showRoutes={showRoutes}
                  setIsRoutingLoading={setIsRoutingLoading}
                  setPendingRoutesCount={setPendingRoutesCount}
                  uniqueUsers={uniqueUsers}
                />

                {filteredWarehouses.map((warehouse: Warehouse) => {
                  if (!warehouse.address?.location?.coordinates) return null;

                  const [lng, lat] = warehouse.address.location.coordinates;
                  const users = getUsersForWarehouse(
                    warehouse._id || warehouse.id || ''
                  );

                  return (
                    <Marker
                      key={warehouse._id || warehouse.id}
                      position={[lat, lng]}
                      icon={createWarehouseIcon()}
                      eventHandlers={{
                        click: () => handleWarehouseClick(warehouse),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[250px]">
                          <h3 className="mb-2 text-sm font-semibold">
                            {warehouse.warehouseName}
                          </h3>
                          <div className="mb-3 space-y-1 text-xs text-gray-600">
                            {warehouse.divisionName && (
                              <div>Division: {warehouse.divisionName}</div>
                            )}
                            {warehouse.channelName && (
                              <div>Channel: {warehouse.channelName}</div>
                            )}
                            {warehouse.zoneName && (
                              <div>Zone: {warehouse.zoneName}</div>
                            )}
                          </div>

                          <div className="border-t pt-2">
                            <div className="mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">
                                Users ({users.length})
                              </span>
                            </div>

                            {users.length > 0 ? (
                              <div className="max-h-32 space-y-1 overflow-y-auto">
                                {users.map((user: UserWithDate, index: number) => {
                                  const userColor = getUserColor(user.userId);
                                  return (
                                    <div
                                      key={index}
                                      className="rounded bg-gray-50 p-2 text-xs"
                                    >
                                      <div className="mb-1 flex items-center gap-2">
                                        <div
                                          className="h-2 w-2 flex-shrink-0 rounded-full"
                                          style={{ backgroundColor: userColor }}
                                        />
                                        <div className="font-medium">
                                          {user.userName}
                                        </div>
                                      </div>
                                      <div className="text-gray-500">
                                        Code: {user.userCode} | Outlets:{' '}
                                        {user.totalOutlets}
                                      </div>
                                      <div className="text-gray-500">
                                        Plan: {user.planType} | Status:{' '}
                                        {user.status}
                                      </div>
                                      <div className="text-gray-500">
                                        Date:{' '}
                                        {format(
                                          new Date(user.visitDate),
                                          'MMM dd, yyyy'
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 italic">
                                No users scheduled for this date
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Outlet Markers */}
                {filteredOutlets.map((outlet) => {
                  const userIndex = userIndexMap.get(outlet.userId) || 0;

                  return (
                    <Marker
                      key={`${outlet.outletId}-${outlet.visitDate}-${outlet.userId}`}
                      position={[outlet.coordinates[1], outlet.coordinates[0]]}
                      icon={createOutletIcon(
                        outlet.userId,
                        outlet.index,
                        userIndex
                      )}
                    >
                      <Popup>
                        <div className="min-w-[250px]">
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className="h-3 w-3 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor: getUserColor(
                                  outlet.userId,
                                  userIndexMap.get(outlet.userId)
                                ),
                              }}
                            />
                            <h3 className="text-sm font-semibold">
                              {outlet.outletName}
                            </h3>
                          </div>
                          <div className="mb-3 space-y-1 text-xs text-gray-600">
                            <div>Outlet ID: {outlet.outletId}</div>
                            <div>Visit Order: #{outlet.index}</div>
                            <div>
                              Visit Date:{' '}
                              {format(new Date(outlet.visitDate), 'PPP')}
                            </div>
                          </div>

                          <div className="border-t pt-2">
                            <div className="mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">
                                Assigned User
                              </span>
                            </div>

                            <div className="rounded bg-gray-50 p-2 text-xs">
                              <div className="font-medium">
                                {outlet.userName}
                              </div>
                              <div className="text-gray-500">
                                Code: {outlet.userCode}
                              </div>
                              <div className="text-gray-500">
                                Route Plan: {outlet.routePlanId}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* User Location Markers */}
                {uniqueUsers
                  .filter(
                    (user) => user.coordinates && user.coordinates.length === 2
                  )
                  .filter(
                    (user) =>
                      !selectedSalesPerson ||
                      user.userId === selectedSalesPerson
                  )
                  .map((user) => {
                    const userIndex = userIndexMap.get(user.userId) || 0;
                    const userOutlets = filteredOutlets.filter(
                      (outlet) => outlet.userId === user.userId
                    );

                    return (
                      <Marker
                        key={`user-${user.userId}`}
                        position={[user.coordinates![1], user.coordinates![0]]}
                        icon={createUserLocationIcon(user.userId, userIndex)}
                      >
                        <Popup>
                          <div className="min-w-[250px]">
                            <div className="mb-2 flex items-center gap-2">
                              <div
                                className="h-3 w-3 flex-shrink-0 rounded-full"
                                style={{
                                  backgroundColor: getUserColor(
                                    user.userId,
                                    userIndex
                                  ),
                                }}
                              />
                              <h3 className="text-sm font-semibold">
                                {user.userName}
                              </h3>
                            </div>
                            <div className="mb-3 space-y-1 text-xs text-gray-600">
                              <div>Employee Code: {user.userCode}</div>
                              <div>Total Outlets: {userOutlets.length}</div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                {/* Unassigned Outlet Markers */}
                {showUnassigned &&
                  unassignedOutlets.map((outlet) => {
                    const isSelected = selectedUnassignedOutlets.has(
                      outlet.visitOrderId
                    );
                    return (
                      <Marker
                        key={`unassigned-${outlet.visitOrderId}`}
                        position={[
                          outlet.coordinates[1],
                          outlet.coordinates[0],
                        ]}
                        icon={createUnassignedOutletIcon(isSelected)}
                        eventHandlers={{
                          click: () =>
                            handleUnassignedOutletClick(outlet.visitOrderId),
                        }}
                      >
                        <Popup>
                          <div>
                            <span className="text-sm font-semibold">
                              {outlet.outletName}
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </MapContainer>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* User Assignment Modal */}
      <UserAssignmentModal
        open={userSelectionModalOpen}
        selectedUserId={selectedUserForAssignment?.userId}
        onChange={(userId, userData) => setSelectedUserForAssignment(userData)}
        onConfirm={handleUserAssignmentConfirm}
        onCancel={handleUserAssignmentCancel}
        warehouseIds={selectedWarehouseIds}
        modalTitle="Assign Outlets to User"
        selectedOutletCount={selectedUnassignedOutlets.size}
      />
    </Dialog>
  );
};

export default WarehouseMapViewModal;
