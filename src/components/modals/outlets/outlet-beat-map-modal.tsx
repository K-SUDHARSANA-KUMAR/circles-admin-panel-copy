'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle } from 'react-leaflet';
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
import { CheckboxMultiSelect } from '@/components/shared/checkbox-multiselect';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import { useUsers } from '@/features/user-managment/users/hooks/useUsers';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useAppSelector } from '@/store/hooks';
import { Checkbox } from '@/components/ui/checkbox';
import { BeatSelectionModal } from '@/components/modals/beat-selection-modal';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';
import { UserTypeEnum } from '@/constants/enums/user.enums';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { SearchInput } from '@/components/ui/search-input';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OutletBeatMapModalProps {
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

// Vibrant colors for different beats
const BEAT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52C0F5',
  '#FF8C94', '#00D9FF', '#A7FF83', '#FF6AC1', '#FFD93D',
  '#6BCF7F', '#FF7979', '#4A90E2', '#FF9F43', '#1ABC9C',
];

const UNASSIGNED_COLOR = '#9CA3AF'; // Grey for unassigned outlets

// Vibrant colors for Sales Representatives
const SR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FECA57', // Yellow
  '#FF9FF3', // Pink
  '#54A0FF', // Light Blue
  '#5F27CD', // Purple
  '#00D2D3', // Cyan
  '#FF9F43', // Orange
  '#10AC84', // Dark Green
  '#EE5A24', // Dark Orange
];

// Custom hook to fit map bounds to show all markers
const useMapBoundsFit = (waypoints: [number, number][], shouldFit: boolean) => {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length === 0 || !shouldFit) return;

    const coordinates = waypoints.map(([lat, lng]) => ({ lat, lng }));
    fitMapBounds(map, coordinates, {
      padding: [50, 50],
      maxZoom: 15,
      minZoom: 10,
      animate: true
    });
  }, [map, waypoints, shouldFit]);
};

// Component that uses the bounds fitting hook
const MapBoundsFitter = ({ waypoints, shouldFit }: { waypoints: [number, number][]; shouldFit: boolean }) => {
  useMapBoundsFit(waypoints, shouldFit);
  return null;
};

// Box selection component
interface BoxSelectorProps {
  onBoxSelect: (bounds: L.LatLngBounds) => void;
  isEnabled: boolean;
}

const BoxSelector: React.FC<BoxSelectorProps> = ({ onBoxSelect, isEnabled }) => {
  const map = useMap();
  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<L.LatLng | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!map || !isEnabled) return;

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      // Only start drawing on left click and if Ctrl/Cmd key is pressed
      if (e.originalEvent.button === 0 && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
        setIsDrawing(true);
        setStartPoint(e.latlng);
        setEndPoint(e.latlng);
        map.dragging.disable();
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (isDrawing && startPoint) {
        setEndPoint(e.latlng);
      }
    };

    const handleMouseUp = (e: L.LeafletMouseEvent) => {
      if (isDrawing && startPoint && endPoint) {
        const bounds = L.latLngBounds(startPoint, endPoint);
        onBoxSelect(bounds);
        setIsDrawing(false);
        setStartPoint(null);
        setEndPoint(null);
        map.dragging.enable();
      }
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.dragging.enable();
    };
  }, [map, isEnabled, isDrawing, startPoint, endPoint, onBoxSelect]);

  // Draw selection rectangle
  if (isDrawing && startPoint && endPoint) {
    const bounds = L.latLngBounds(startPoint, endPoint);
    return (
      <Rectangle
        bounds={bounds}
        pathOptions={{
          color: '#3b82f6',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          dashArray: '5, 5',
        }}
      />
    );
  }

  return null;
};

const createOutletIcon = (color: string, isSelected: boolean = false) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: ${isSelected ? '28px' : '24px'};
      height: ${isSelected ? '28px' : '24px'};
      border-radius: 50%;
      border: ${isSelected ? '4px' : '3px'} solid ${isSelected ? '#FFD700' : 'white'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      position: relative;
    "></div>`,
    className: 'custom-outlet-marker',
    iconSize: [isSelected ? 28 : 24, isSelected ? 28 : 24],
    iconAnchor: [isSelected ? 14 : 12, isSelected ? 14 : 12],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    html: `<div style="
      background-color: #2563eb;
      width: 20px;
      height: 20px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>`,
    className: 'custom-user-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createWarehouseIcon = () => {
  return L.divIcon({
    html: `<div style="
      background-color: #7C3AED;
      border: 3px solid #fff;
      color: #fff;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      z-index: 2000;
    ">
      W
    </div>`,
    className: 'custom-warehouse-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const OutletBeatMapModal = ({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  filters = {},
}: OutletBeatMapModalProps) => {
  // Fetch warehouse data only when modal is open
  const { warehouseById } = useWarehouse(warehouseId);
  const warehouseData = warehouseById.data?.data;
  const actualWarehouseName = warehouseData?.warehouseName || warehouseName || 'Warehouse';
  
  // Get warehouse coordinates from fetched data
  const getWarehouseCoords = () => {
    if (!warehouseData?.address?.location?.coordinates) return null;
    const coords = warehouseData.address.location.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      return coords;
    }
    return null;
  };
  
  const warehouseCoords = getWarehouseCoords();
  const [mapKey, setMapKey] = useState(0);
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([]);
  const [selectedOutletIds, setSelectedOutletIds] = useState<Set<string>>(new Set());
  const [beatModalOpen, setBeatModalOpen] = useState(false);
  const [selectedBeatForAssignment, setSelectedBeatForAssignment] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [shouldAutoFit, setShouldAutoFit] = useState(false);
  const [boxSelectionEnabled, setBoxSelectionEnabled] = useState(true);
  // SR sidebar is always visible now
  const [selectedSRIds, setSelectedSRIds] = useState<string[]>([]);
  const [selectedUserTypes, setSelectedUserTypes] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [hideOutlets, setHideOutlets] = useState(false);
  const [hideSalesPersons, setHideSalesPersons] = useState(false);
  const [selectedPjpDayIds, setSelectedPjpDayIds] = useState<string[]>([]);
  const [beatSearchTerm, setBeatSearchTerm] = useState<string>('');
  const [salesPersonSearchTerm, setSalesPersonSearchTerm] = useState<string>('');

  // Fetch outlets with nonPaginated=true and warehouseId
  const { outlets, bulkUpdateBeatDetails } = useOutlets({
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

  const { users } = useUsers({
    warehouseId: open && warehouseId ? [warehouseId] : undefined,
    status: 'active',
    nonPaginated: 'true',
  });

  const usersData = users.data?.data?.items || [];

  // Filter users based on selected filters and search term
  const filteredUsers = useMemo(() => {
    return usersData.filter((user: any) => {
      const matchesUserType = selectedUserTypes.length === 0 || selectedUserTypes.includes(user.userType);
      const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.roleId);
      
      // Search filter - check name, employee code, phone, email, role name
      const matchesSearch = !salesPersonSearchTerm || 
        (user.name || '').toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        (user.employeeCode || '').toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        (user.phoneNumber || '').toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(salesPersonSearchTerm.toLowerCase()) ||
        (user.roleName || '').toLowerCase().includes(salesPersonSearchTerm.toLowerCase());
      
      return matchesUserType && matchesRole && matchesSearch;
    });
  }, [usersData, selectedUserTypes, selectedRoles, salesPersonSearchTerm]);

  // Get unique user types and roles for filter options
  const userTypeOptions = useMemo(() => {
    return [
      { value: UserTypeEnum.PERMANENTFIELD, label: 'Permanent Field' },
      { value: UserTypeEnum.PERMANENTNONFIELD, label: 'Permanent Non-Field' },
      { value: UserTypeEnum.TEMPORARY, label: 'Temporary' },
    ];
  }, []);

  const roleOptions = useMemo(() => {
    const roleMap = new Map();
    usersData.forEach((user: any) => {
      if (user.roleId && user.roleName) {
        roleMap.set(user.roleId, user.roleName);
      }
    });
    return Array.from(roleMap.entries()).map(([roleId, roleName]) => ({
      value: roleId,
      label: roleName,
    }));
  }, [usersData]);

  // Toggle SR selection
  const toggleSR = (srId: string) => {
    setSelectedSRIds(prev => 
      prev.includes(srId) 
        ? prev.filter(id => id !== srId)
        : [...prev, srId]
    );
    // Trigger map auto-fit when SR selection changes via checkbox
    setShouldAutoFit(true);
  };

  // Optional: Focus camera on a single SR quickly
  const handleFocusOnSR = (userId: string) => {
    setSelectedSRIds([userId]);
    setShouldAutoFit(true);
  };

  // Get SRs to display on map: all if none selected, only selected if some are selected
  const srsToShowOnMap = useMemo(() => {
    if (hideSalesPersons) {
      return [];
    }
    if (selectedSRIds.length === 0) {
      return filteredUsers;
    }
    return filteredUsers.filter((user: any) => selectedSRIds.includes(user.userId));
  }, [filteredUsers, selectedSRIds, hideSalesPersons]);

  const outletsData = outlets.data?.data?.items || [];

  // Filter outlets based on selected beats and day first, then group by beat
  const filteredOutletsForGrouping = useMemo(() => {
    let data = outletsData as any[];

    // PJP Day filter (by beatDetails.pjpDayId) - apply before grouping
    if (selectedPjpDayIds.length > 0) {
      data = data.filter((outlet: any) => {
        const pjpDayId = outlet.beatDetails?.pjpDayId;
        return pjpDayId && selectedPjpDayIds.includes(pjpDayId);
      });
    }

    return data;
  }, [outletsData, selectedPjpDayIds]);

  // Group outlets by beat (using filtered data for day)
  const { beatGroups, beatColorMap, unassignedOutlets } = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const colorMap: Record<string, string> = {};
    const unassigned: any[] = [];
    
    let colorIndex = 0;
    
    filteredOutletsForGrouping.forEach((outlet: any) => {
      const beatId = outlet.beatDetails?.beatId;
      
      if (!beatId) {
        unassigned.push(outlet);
      } else {
        if (!groups[beatId]) {
          groups[beatId] = [];
          colorMap[beatId] = BEAT_COLORS[colorIndex % BEAT_COLORS.length];
          colorIndex++;
        }
        groups[beatId].push(outlet);
      }
    });
    
    return { beatGroups: groups, beatColorMap: colorMap, unassignedOutlets: unassigned };
  }, [filteredOutletsForGrouping]);

  // Filter outlets based on selected beats
  const filteredOutlets = useMemo(() => {
    let data = outletsData as any[];

    // Beat filter
    if (selectedBeatIds.length > 0) {
      data = data.filter((outlet: any) => {
        const beatId = outlet.beatDetails?.beatId;
        if (!beatId && selectedBeatIds.includes('unassigned')) {
          return true;
        }
        return beatId && selectedBeatIds.includes(beatId);
      });
    }

    // PJP Day filter (by beatDetails.pjpDayId)
    if (selectedPjpDayIds.length > 0) {
      data = data.filter((outlet: any) => {
        const pjpDayId = outlet.beatDetails?.pjpDayId;
        return pjpDayId && selectedPjpDayIds.includes(pjpDayId);
      });
    }

    return data;
  }, [outletsData, selectedBeatIds, selectedPjpDayIds]);

  const getMapCenter = (): [number, number] => {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) {
      return [12.9716, 77.5946]; // Default to Bangalore coordinates
    }
    const coordinates = waypoints.map(([lat, lng]) => ({ lat, lng }));
    const center = calculateMapCenter(coordinates);
    
    if (!center || !Array.isArray(center) || center.length !== 2 || 
        typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
        isNaN(center[0]) || isNaN(center[1])) {
      return [12.9716, 77.5946];
    }
    
    return center;
  };

  // Get waypoints for bounds calculation (outlets + users + warehouse)
  const getWaypoints = (): [number, number][] => {
    const outletWaypoints: [number, number][] = [];
    const userWaypoints: [number, number][] = [];
    const warehouseWaypoint: [number, number][] = [];

    // Get outlet waypoints (only if outlets are not hidden)
    if (!hideOutlets && Array.isArray(filteredOutlets) && filteredOutlets.length > 0) {
      filteredOutlets
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
        .forEach((outlet) => {
          outletWaypoints.push([
            outlet.outletAddress.location.coordinates[1],
            outlet.outletAddress.location.coordinates[0],
          ]);
        });
    }

    // Get user waypoints for SRs to show on map
    if (Array.isArray(srsToShowOnMap) && srsToShowOnMap.length > 0) {
      srsToShowOnMap
        .filter(user => 
          user && 
          user.userAddress?.location && 
          Array.isArray(user.userAddress.location.coordinates) && 
          user.userAddress.location.coordinates.length >= 2
        )
        .filter(user => {
          const lat = user.userAddress.location.coordinates[1];
          const lng = user.userAddress.location.coordinates[0];
          return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
        })
        .forEach((user) => {
          userWaypoints.push([
            user.userAddress.location.coordinates[1],
            user.userAddress.location.coordinates[0],
          ]);
        });
    }

    // Add warehouse waypoint if available
    if (warehouseCoords && warehouseCoords.length === 2) {
      warehouseWaypoint.push([
        warehouseCoords[1],
        warehouseCoords[0],
      ]);
    }

    return [...outletWaypoints, ...userWaypoints, ...warehouseWaypoint];
  };

  useEffect(() => {
    if (open) {
      setMapKey((prev) => prev + 1);
      setSelectedOutletIds(new Set());
      setShouldAutoFit(true);
    }
  }, [open]);

  // Auto-fit when beat filters, SR selection, or outlet visibility changes
  useEffect(() => {
    if (open) {
      setShouldAutoFit(true);
    }
  }, [selectedBeatIds, selectedPjpDayIds, selectedSRIds, hideOutlets, hideSalesPersons, open]);

  // Reset auto-fit after it's applied
  useEffect(() => {
    if (shouldAutoFit) {
      const timer = setTimeout(() => {
        setShouldAutoFit(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoFit]);

  const handleToggleBeatFilter = (beatId: string) => {
    setSelectedBeatIds(prev => {
      if (prev.includes(beatId)) {
        return prev.filter(id => id !== beatId);
      }
      return [...prev, beatId];
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedOutletIds.size === filteredOutlets.length) {
      setSelectedOutletIds(new Set());
    } else {
      setSelectedOutletIds(new Set(filteredOutlets.map((o: any) => o.outletId)));
    }
  };

  const handleToggleOutlet = (outletId: string) => {
    setSelectedOutletIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outletId)) {
        newSet.delete(outletId);
      } else {
        newSet.add(outletId);
      }
      return newSet;
    });
  };

  const handleSelectBeatOutlets = (beatId: string) => {
    const beatOutlets = beatId === 'unassigned' 
      ? unassignedOutlets 
      : beatGroups[beatId] || [];
    
    const beatOutletIds = beatOutlets.map((o: any) => o.outletId);
    
    setSelectedOutletIds(prev => {
      const newSet = new Set(prev);
      const allSelected = beatOutletIds.every((id: string) => newSet.has(id));
      
      if (allSelected) {
        beatOutletIds.forEach((id: string) => newSet.delete(id));
      } else {
        beatOutletIds.forEach((id: string) => newSet.add(id));
      }
      
      return newSet;
    });
  };

  const handleAssignToBeat = () => {
    if (selectedOutletIds.size === 0) {
      toast.error('Please select at least one outlet');
      return;
    }
    setBeatModalOpen(true);
  };

  const handleBoxSelect = (bounds: L.LatLngBounds) => {
    const outletsInBox: string[] = [];
    
    filteredOutlets.forEach((outlet: any) => {
      if (!outlet || !outlet.outletAddress?.location || 
          !Array.isArray(outlet.outletAddress.location.coordinates) || 
          outlet.outletAddress.location.coordinates.length < 2) {
        return;
      }
      
      const lat = outlet.outletAddress.location.coordinates[1];
      const lng = outlet.outletAddress.location.coordinates[0];
      
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return;
      }
      
      const point = L.latLng(lat, lng);
      if (bounds.contains(point)) {
        outletsInBox.push(outlet.outletId);
      }
    });
    
    if (outletsInBox.length > 0) {
      setSelectedOutletIds(prev => {
        const newSet = new Set(prev);
        outletsInBox.forEach(id => newSet.add(id));
        return newSet;
      });
      toast.success(`Selected ${outletsInBox.length} outlet(s)`);
    }
  };

  const handleBeatAssignmentConfirm = async () => {
    if (!selectedBeatForAssignment || selectedOutletIds.size === 0) {
      toast.error('Please select a beat');
      return;
    }

    setIsAssigning(true);
    
    try {
      const updates = Array.from(selectedOutletIds).map(outletId => ({
        outletId,
        beatDetails: {
          beatId: selectedBeatForAssignment.beatId,
          beatName: selectedBeatForAssignment.beatName,
          beatPriority: selectedBeatForAssignment.beatPriority || 1,
        },
      }));

      await bulkUpdateBeatDetails.mutateAsync(updates);
      
      // Explicitly refetch outlets to update the map immediately
      await outlets.refetch();
      
      toast.success(`Successfully assigned ${selectedOutletIds.size} outlet(s) to ${selectedBeatForAssignment.beatName}`);
      setSelectedOutletIds(new Set());
      setSelectedBeatForAssignment(null);
      setBeatModalOpen(false);
    } catch (error) {
      console.error('Beat assignment error:', error);
      toast.error('Failed to assign outlets to beat');
    } finally {
      setIsAssigning(false);
    }
  };

  const getOutletColor = (outlet: any) => {
    const beatId = outlet.beatDetails?.beatId;
    return beatId ? (beatColorMap[beatId] || UNASSIGNED_COLOR) : UNASSIGNED_COLOR;
  };

  // Get vibrant color for SR based on user ID
  const getSRColor = (userId: string) => {
    const index = usersData.findIndex((user: any) => user.userId === userId);
    return SR_COLORS[index % SR_COLORS.length];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[98vw] w-[98vw] flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-lg">
                Outlet Beat Map - {actualWarehouseName}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Hold <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl</kbd> (or <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">⌘</kbd>) and drag to select multiple outlets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShouldAutoFit(true);
                }}
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fit to View
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Left Sidebar - Beat Filters and Selection */}
          <div className="w-72 flex-shrink-0 overflow-y-auto border-r bg-gray-50 p-4">
            <div className="space-y-4">
              {/* Visibility Controls */}
              <div className="rounded-md bg-card p-3">
                <h3 className="mb-2 font-semibold">Visibility</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hide-outlets"
                    checked={hideOutlets}
                    onCheckedChange={(checked) => setHideOutlets(checked as boolean)}
                  />
                  <Label htmlFor="hide-outlets" className="text-sm cursor-pointer">
                    Hide Outlets
                  </Label>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id="hide-srs"
                    checked={hideSalesPersons}
                    onCheckedChange={(checked) => setHideSalesPersons(checked as boolean)}
                  />
                  <Label htmlFor="hide-srs" className="text-sm cursor-pointer">
                    Hide Sales Persons
                  </Label>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="rounded-md bg-card p-3">
                <h3 className="mb-2 font-semibold">Selection</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Selected: {selectedOutletIds.size}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleSelectAll}
                      className="h-7 px-2 text-xs"
                    >
                      {selectedOutletIds.size === filteredOutlets.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  {selectedOutletIds.size > 0 && (
                    <Button
                      onClick={handleAssignToBeat}
                      className="w-full"
                      size="sm"
                    >
                      Assign to Beat
                    </Button>
                  )}
                </div>
              </div>

              {/* Day Filter */}
              <div className="rounded-md bg-card p-3">
                <h3 className="mb-2 font-semibold">Filter by Day</h3>
                <MasterRecordCheckboxMultiSelect
                  masterName="pjpDay"
                  value={selectedPjpDayIds}
                  onChange={(values) => {
                    setSelectedPjpDayIds(values);
                    setShouldAutoFit(true);
                  }}
                  placeholder="Select day"
                  displayName="day"
                  className="w-full"
                />
              </div>

              {/* Beat Filters */}
              <div>
                <h3 className="mb-2 font-semibold">Filter by Beat</h3>
                <div className="mb-2">
                  <SearchInput
                    placeholder="Search beats..."
                    value={beatSearchTerm}
                    onChange={setBeatSearchTerm}
                    className="w-full"
                  />
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {/* Unassigned Outlets */}
                    {unassignedOutlets.length > 0 && 
                     (!beatSearchTerm || 'unassigned'.toLowerCase().includes(beatSearchTerm.toLowerCase())) && (
                      <div className="rounded-md bg-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="filter-unassigned"
                              checked={selectedBeatIds.includes('unassigned')}
                              onCheckedChange={() => handleToggleBeatFilter('unassigned')}
                            />
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: UNASSIGNED_COLOR }}
                            />
                            <Label htmlFor="filter-unassigned" className="text-sm cursor-pointer">
                              Unassigned
                            </Label>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {unassignedOutlets.length} {unassignedOutlets.length === 1 ? 'outlet' : 'outlets'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectBeatOutlets('unassigned')}
                          className="w-full h-7 text-xs"
                        >
                          Select All
                        </Button>
                      </div>
                    )}

                    {/* Beat Groups */}
                    {Object.entries(beatGroups)
                      .filter(([beatId, beatOutlets]) => {
                        if (!beatSearchTerm) return true;
                        const firstOutlet = beatOutlets[0];
                        const beatName = firstOutlet?.beatDetails?.beatName || 'Unknown Beat';
                        return beatName.toLowerCase().includes(beatSearchTerm.toLowerCase());
                      })
                      .map(([beatId, beatOutlets]) => {
                        const firstOutlet = beatOutlets[0];
                        const beatName = firstOutlet?.beatDetails?.beatName || 'Unknown Beat';
                        const beatPriority = firstOutlet?.beatDetails?.beatPriority || '-';
                        
                        return (
                          <div key={beatId} className="rounded-md bg-card p-3">
                            <div className="flex flex-col  justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`filter-${beatId}`}
                                  checked={selectedBeatIds.includes(beatId)}
                                  onCheckedChange={() => handleToggleBeatFilter(beatId)}
                                />
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: beatColorMap[beatId] }}
                                />
                                <Label htmlFor={`filter-${beatId}`} className="text-sm cursor-pointer">
                                  {beatName}
                                </Label>
                              </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {beatOutlets.length} {beatOutlets.length === 1 ? 'outlet' : 'outlets'}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectBeatOutlets(beatId)}
                              className="w-full h-7 text-xs"
                            >
                              Select All
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>

            </div>
          </div>

          {/* Center - Map */}
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
            ) : filteredOutlets.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">No outlets found</p>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <MapContainer
                  key={mapKey}
                  center={getMapCenter()}
                  zoom={getWaypoints().length > 0 ? Math.max(10, calculateZoomLevel(getWaypoints().map(([lat, lng]) => ({ lat, lng })))) : 12}
                  style={{ height: '100%', width: '100%' }}
                  className="h-full w-full"
                  minZoom={8}
                  maxZoom={18}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapBoundsFitter waypoints={getWaypoints()} shouldFit={shouldAutoFit} />
                  <BoxSelector onBoxSelect={handleBoxSelect} isEnabled={boxSelectionEnabled} />

                  {/* Warehouse marker */}
                  {warehouseCoords && warehouseCoords.length === 2 && (
                    <Marker
                      position={[warehouseCoords[1], warehouseCoords[0]]}
                      icon={createWarehouseIcon()}
                    >
                      <Popup>
                        <div>
                          <strong>Warehouse</strong>
                          <br />
                          {actualWarehouseName}
                          <br />
                          Lat: {warehouseCoords[1]}, Lng: {warehouseCoords[0]}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Individual outlet markers */}
                  {!hideOutlets && filteredOutlets.map((outlet: any, index: number) => {
                    // ...existing code for outlet markers...
                    if (!outlet || !outlet.outletAddress?.location || !Array.isArray(outlet.outletAddress.location.coordinates) || outlet.outletAddress.location.coordinates.length < 2) {
                      return null;
                    }
                    const lat = outlet.outletAddress.location.coordinates[1];
                    const lng = outlet.outletAddress.location.coordinates[0];
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                      return null;
                    }
                    const isSelected = selectedOutletIds.has(outlet.outletId);
                    const color = getOutletColor(outlet);
                    return (
                      <Marker
                        key={outlet.outletId || index}
                        position={[lat, lng]}
                        icon={createOutletIcon(color, isSelected)}
                        eventHandlers={{
                          click: () => handleToggleOutlet(outlet.outletId),
                        }}
                      >
                        <Popup>
                          <div className="font-inter flex flex-col justify-center gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-base font-semibold">
                                {outlet.outletName || 'Unknown Outlet'}
                              </div>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleOutlet(outlet.outletId)}
                              />
                            </div>
                            <div className="text-sm text-gray-600">
                              Owner: {outlet.ownerName || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Phone: {outlet.phoneNumber || 'N/A'}
                            </div>
                            {outlet.beatDetails ? (
                              <>
                                <div className="text-sm text-gray-600">
                                  Beat: {outlet.beatDetails.beatName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Priority: {outlet.beatDetails.beatPriority}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-600 italic">
                                No beat assigned
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* User (SR) markers - show all when none selected, only selected when some are selected */}
                  {srsToShowOnMap.map((user: any, index: number) => {
                    // Skip users without valid location data
                    if (!user || !user.userAddress?.location || !Array.isArray(user.userAddress.location.coordinates) || user.userAddress.location.coordinates.length < 2) {
                      return null;
                    }
                    
                    // Ensure coordinates are valid numbers
                    const lat = user.userAddress.location.coordinates[1];
                    const lng = user.userAddress.location.coordinates[0];
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                      return null;
                    }
                    
                    const srColor = getSRColor(user.userId);
                    
                    return (
                      <Marker
                        key={`user-${user.userId || index}`}
                        position={[lat, lng]}
                        icon={L.divIcon({
                          html: `<div style="
                            background-color: ${srColor};
                            width: 24px;
                            height: 24px;
                            border: 3px solid white;
                            border-radius: 50%;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            color: white;
                            font-size: 12px;
                          ">
                            👤
                          </div>`,
                          className: 'custom-sr-marker',
                          iconSize: [24, 24],
                          iconAnchor: [12, 12],
                        })}
                      >
                        <Popup>
                          <div className="font-inter flex flex-col justify-center gap-1">
                            <div className="text-base font-semibold text-secondary">
                              👤 {user.name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Employee Code: {user.employeeCode || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Phone: {user.phoneNumber || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Email: {user.email || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Role: {user.roleName || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Status: {user.status || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">
                              User Type: {user.userType || 'N/A'}
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

          {/* Right Sidebar - Sales Representatives */}
          <div className="w-72 flex-shrink-0 overflow-y-auto border-l bg-gray-50 p-4 relative">
              <div className="space-y-4">
                {/* Filters */}
                <div className="rounded-md bg-card p-4 shadow-sm border">
                  <h3 className="mb-4 font-semibold text-sm">Filters</h3>
                  
                  {/* User Type Filter */}
                  <div className="mb-4">
                    <CheckboxMultiSelect
                      options={userTypeOptions}
                      value={selectedUserTypes}
                      onChange={setSelectedUserTypes}
                      placeholder="User Type"
                      displayName="user type"
                      className="w-full"
                      searchable={false}
                      showSelectAll={false}
                    />
                  </div>

                  {/* Role Filter */}
                  <div className="mb-4">
                    <CheckboxMultiSelect
                      options={roleOptions}
                      value={selectedRoles}
                      onChange={setSelectedRoles}
                      placeholder="Role"
                      displayName="role"
                      className="w-full"
                      searchable={false}
                      showSelectAll={false}
                    />
                  </div>

                </div>

                <div className="rounded-md bg-card p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Sales Representatives ({filteredUsers.length})</h3>
                    {filteredUsers.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedSRIds.length === filteredUsers.length) {
                            setSelectedSRIds([]);
                          } else {
                            setSelectedSRIds(filteredUsers.map((user: any) => user.userId));
                          }
                          setShouldAutoFit(true);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        {selectedSRIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                  </div>
                  <div className="mb-3">
                    <SearchInput
                      placeholder="Search sales persons..."
                      value={salesPersonSearchTerm}
                      onChange={setSalesPersonSearchTerm}
                      className="w-full"
                    />
                  </div>
                  {users.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loading text="Loading SRs..." />
                    </div>
                  ) : users.error ? (
                    <div className="text-center text-red-500 py-4">
                      Error loading SRs: {users.error.message}
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center text-gray-500 py-4">
                            No sales representatives found
                          </div>
                        ) : (
                          filteredUsers.map((user: any) => (
                        <div key={user.userId} className="rounded-md bg-card p-3 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`sr-${user.userId}`}
                                checked={selectedSRIds.includes(user.userId)}
                                onCheckedChange={() => toggleSR(user.userId)}
                              />
                              <div 
                                className="h-4 w-4 rounded-full border-2 border-white shadow-sm" 
                                style={{ backgroundColor: getSRColor(user.userId) }}
                              />
                              <Label htmlFor={`sr-${user.userId}`} className="text-sm cursor-pointer">
                                {user.name || 'Unknown User'}
                              </Label>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFocusOnSR(user.userId)}
                              className="h-7 px-2 text-xs"
                            >
                              Focus
                            </Button>
                          </div>
                          <div className="text-xs text-gray-600 ml-7 space-y-1">
                            <div>Phone: {user.phoneNumber || 'N/A'}</div>
                            <div>Role: {user.roleName || 'N/A'}</div>
                            <div>Code: {user.employeeCode || 'N/A'}</div>
                            <div>Status: {user.status || 'N/A'}</div>
                          </div>
                        </div>
                        ))
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
        </div>
      </DialogContent>

      <BeatSelectionModal
        open={beatModalOpen}
        selectedBeatId={selectedBeatForAssignment?.beatId || ''}
        onChange={(beatId, beatData) => {
          setSelectedBeatForAssignment(beatData);
        }}
        onConfirm={handleBeatAssignmentConfirm}
        onCancel={() => {
          setBeatModalOpen(false);
          setSelectedBeatForAssignment(null);
        }}
        initialSelectedOption={selectedBeatForAssignment}
        loading={isAssigning}
      />
    </Dialog>
  );
};

export default OutletBeatMapModal;

