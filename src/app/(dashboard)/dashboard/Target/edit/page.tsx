"use client";

import BreadcrumbHeader from "@/components/breadcrumb/breadcrumb";
import { getBreadcrumbData } from "@/constants/breadcrumb-config";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import NavKeys from "@/constants/navkeys";
import { MultiSelectModal, Option } from "@/components/modals/multi-select-modal";
import { UserMultiSelectModal, UserOption } from "@/components/modals/user-multiselect-modal";
import { useWarehouse } from "@/features/warehouse-managment/hooks/useWarehouse";
import { useProducts } from "@/features/dashboard/products/hooks/useProducts";
import { useOutlets } from "@/features/dashboard/outlets/hooks/useOutlets";
import { useBrands, useCategories, useSubcategories, useMasterRecords } from "@/features/master-managment/hooks/useMasterRecords";
import { useUsers } from "@/features/user-managment/users/hooks/useUsers";
import { useTargets, useTargetById } from "@/features/dashboard/targets/hooks/useTargets";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Loading from "@/components/ui/loading";
import GenericPageLoading from "@/components/shared/generic-page-loading";
import { Label } from "@/components/ui/label";

export default function TargetEditPage() {
  const breadcrumb = getBreadcrumbData("target", "edit");
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  
  const { updateTarget, updateTargetStatus } = useTargets();
  const { data: targetData, isLoading: targetLoading } = useTargetById(targetId || '');
  
  // Target metrics
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [targetTons, setTargetTons] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState("draft");
  const [formError, setFormError] = useState<string>("");
  const [applicableError, setApplicableError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Applicable To state
  const [applicableWarehouses, setApplicableWarehouses] = useState<Option[]>([]);
  const [applicableProducts, setApplicableProducts] = useState<Option[]>([]);
  const [applicableBrands, setApplicableBrands] = useState<Option[]>([]);
  const [applicableCategories, setApplicableCategories] = useState<Option[]>([]);
  const [applicableSubcategories, setApplicableSubcategories] = useState<Option[]>([]);
  const [applicableOutlets, setApplicableOutlets] = useState<Option[]>([]);
  const [applicableUsers, setApplicableUsers] = useState<Option[]>([]);
  const [applicableDivisions, setApplicableDivisions] = useState<Option[]>([]);
  const [applicableZones, setApplicableZones] = useState<Option[]>([]);
  const [applicableSubzones, setApplicableSubzones] = useState<Option[]>([]);
  const [applicableChannels, setApplicableChannels] = useState<Option[]>([]);

  // Applicable To modal
  type ApplicableType = 'warehouses' | 'products' | 'brands' | 'categories' | 'subcategories' | 'outlets' | 'divisions' | 'zones' | 'subzones' | 'channels';
  const [applicableModalOpen, setApplicableModalOpen] = useState(false);
  const [applicableModalType, setApplicableModalType] = useState<ApplicableType | null>(null);
  
  // Separate modal for users
  const [userModalOpen, setUserModalOpen] = useState(false);
  const emptyOptions = useMemo<Option[]>(() => [], []);
  const modalPagination = useMemo(() => ({ pageIndex: 0, pageSize: 10 }), []);

  // Fetch options using existing hooks
  const { warehouses } = useWarehouse(undefined, { nonPaginated: true });
  const { products } = useProducts({ enabled: true, nonPaginated: true });
  const { outlets } = useOutlets({ enabled: true, nonPaginated: true });
  const { records: brands } = useBrands();
  const { records: categories } = useCategories();
  const { records: subcategories } = useSubcategories();
  
  // Fetch new fields
  const { users } = useUsers({ nonPaginated: 'true' });
  const { records: divisions } = useMasterRecords('division', undefined, 0, 1000, true);
  const { records: zones } = useMasterRecords('zone', undefined, 0, 1000, true);
  const { records: subzones } = useMasterRecords('subZone', undefined, 0, 1000, true);
  const { records: channels } = useMasterRecords('channel', undefined, 0, 1000, true);

  const warehouseOptions = useMemo<Option[]>(() => {
    const items = warehouses.data?.data?.items || [];
    return items.map((w: any) => ({ label: w.warehouseName, value: w.warehouseId }));
  }, [warehouses.data?.data?.items]);

  const productOptions = useMemo<Option[]>(() => {
    const items = products.data?.data?.items || [];
    return items.map((p: any) => ({ label: `${p.productName} (${p.skuCode})`, value: p.productId }));
  }, [products.data?.data?.items]);

  const outletOptions = useMemo<Option[]>(() => {
    const items = outlets.data?.data?.items || [];
    return items.map((o: any) => ({ label: `${o.outletName} (${o.outletId})`, value: o.outletId }));
  }, [outlets.data?.data?.items]);

  const brandOptions = useMemo<Option[]>(() => {
    const items = brands.data || [];
    return items.map((brand: any) => ({
      label: brand.brandName,
      value: brand.brandId,
    }));
  }, [brands.data]);

  const categoryOptions = useMemo<Option[]>(() => {
    const items = categories.data || [];
    return items.map((category: any) => ({
      label: category.categoryName,
      value: category.categoryId,
    }));
  }, [categories.data]);

  const subcategoryOptions = useMemo<Option[]>(() => {
    const items = subcategories.data || [];
    return items.map((subcategory: any) => ({
      label: subcategory.subcategoryName || subcategory.subcategoryname,
      value: subcategory.subcategoryId,
    }));
  }, [subcategories.data]);

  const userOptions = useMemo<UserOption[]>(() => {
    const items = users.data?.data?.items || [];
    return items.map((user: any) => {
      // Get warehouse IDs from mappings
      const warehouseIds = user.mappings?.map((mapping: any) => mapping.warehouseId).join(', ') || 'No Warehouse';
      
      return {
        userId: user.userId,
        name: user.name,
        employeeCode: user.employeeCode,
        userType: user.userType,
        roleId: user.roleId,
        status: user.status,
        warehouseIds: warehouseIds,
      };
    });
  }, [users.data?.data?.items]);

  const divisionOptions = useMemo<Option[]>(() => {
    const items = divisions.data || [];
    console.log('Division data:', items); // Debug log
    return items.map((division: any) => {
      console.log('Individual division:', division); // Debug log
      return {
        label: division.divisionName || division.name || 'Unknown',
        value: division.divisionId || division.id || division._id || 'unknown',
      };
    });
  }, [divisions.data]);

  const zoneOptions = useMemo<Option[]>(() => {
    const items = zones.data || [];
    console.log('Zone data:', items); // Debug log
    return items.map((zone: any) => {
      console.log('Individual zone:', zone); // Debug log
      return {
        label: zone.zoneName || zone.name || 'Unknown',
        value: zone.zoneId || zone.id || zone._id || 'unknown',
      };
    });
  }, [zones.data]);

  const subzoneOptions = useMemo<Option[]>(() => {
    const items = subzones.data || [];
    console.log('Subzone data:', items); // Debug log
    return items.map((subzone: any) => {
      console.log('Individual subzone:', subzone); // Debug log
      return {
        label: subzone.subZoneName || subzone.name || 'Unknown',
        value: subzone.subZoneId || subzone.id || subzone._id || 'unknown',
      };
    });
  }, [subzones.data]);

  const channelOptions = useMemo<Option[]>(() => {
    const items = channels.data || [];
    console.log('Channel data:', items); // Debug log
    return items.map((channel: any) => {
      console.log('Individual channel:', channel); // Debug log
      return {
        label: channel.channelName || channel.name || 'Unknown',
        value: channel.channelId || channel.id || channel._id || 'unknown',
      };
    });
  }, [channels.data]);

  // Redirect if no target ID provided
  useEffect(() => {
    if (!targetId) {
      router.push(NavKeys.Target);
    }
  }, [targetId, router]);

  // Load target data
  useEffect(() => {
    if (targetData) {
      setName(targetData.targetName || '');
      setStatus(targetData.status || 'draft');
      setTargetAmount(targetData.target?.amount?.toString() || '');
      setTargetTons(targetData.target?.kgs?.toString() || '');
      setDescription(targetData.description || '');
      
      // Parse dates
      if (targetData.startDate) {
        setStartDate(new Date(targetData.startDate));
      }
      if (targetData.endDate) {
        setEndDate(new Date(targetData.endDate));
      }
      
      // Set applicable selections using raw data to avoid infinite loops
      setApplicableWarehouses(
        (targetData.warehouseId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableProducts(
        (targetData.productId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableBrands(
        (targetData.brandId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableCategories(
        (targetData.categoryId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableSubcategories(
        (targetData.subCategoryId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableOutlets(
        (targetData.outletId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableUsers(
        (targetData.userId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableDivisions(
        (targetData.divisionId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableZones(
        (targetData.zoneId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableSubzones(
        (targetData.subZoneId || []).map((id: string) => ({ label: id, value: id }))
      );
      setApplicableChannels(
        (targetData.channelId || []).map((id: string) => ({ label: id, value: id }))
      );
      
      setIsLoading(false);
    }
  }, [targetData]);

  // Determine field editability based on ORIGINAL status from database, not current form status
  const originalStatus = targetData?.status || 'draft';
  const isDraftStatus = originalStatus === 'draft';
  const isActiveStatus = originalStatus === 'active';
  const isInactiveStatus = originalStatus === 'inactive';
  
  // When draft: all fields editable
  // When active: only status editable (can only change to inactive), all other fields disabled
  // When inactive: only status editable (can change to active or draft), all other fields disabled
  const isNameEditable = isDraftStatus; // Only editable in draft
  const isStatusEditable = true; // Always editable
  const areTargetFieldsEditable = isDraftStatus; // Amount, tons, dates, description - only editable in draft
  const areApplicableFieldsEditable = isDraftStatus; // Applicable to fields - only editable in draft
  const areApplicableFieldsVisible = isDraftStatus || isActiveStatus || isInactiveStatus; // Visible in draft, active, and inactive

  if (!targetId) {
    return null; // Will redirect
  }

  if (isLoading || targetLoading) {
    return (
        <GenericPageLoading showSpringBoard={false} title="Target" loadingText="Target data is loading..." />
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      {/* Target Information */}
      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Target Information
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Row 1: Name, Target Amount, Target Weight */}
          <div>
            <Label className="block text-sm font-medium">Name</Label>
            <Input 
              placeholder="Enter" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              disabled={!isNameEditable}
            />
          </div>

          <div>
            <Label className="block text-sm font-medium">Target Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
              <Input
                placeholder="Enter amount"
                type="number"
                min={0}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pl-7"
                disabled={!areTargetFieldsEditable}
              />
            </div>
          </div>

          <div className="md:col-span-1 md:row-span-3 flex flex-col justify-between">
            <Label className="block text-sm font-medium">Description</Label>
            <Textarea 
              placeholder="Enter" 
              rows={4} 
              className="h-full"
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              disabled={!areTargetFieldsEditable}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Target Weight</label>
            <div className="relative">
              <Input
                placeholder="Enter weight in kgs"
                type="number"
                min={0}
                value={targetTons}
                onChange={(e) => setTargetTons(e.target.value)}
                className="pr-14"
                disabled={!areTargetFieldsEditable}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">kgs</span>
            </div>
          </div>

          

          <div>
            <Label className="w-full text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={!isStatusEditable}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {isDraftStatus && (
                  <SelectItem value="draft">Draft</SelectItem>
                )}
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium">Start Date</Label>
            <DatePicker 
              date={startDate} 
              onSelect={setStartDate}
              disabled={!areTargetFieldsEditable}
              disablePastDates={true}
            />
          </div>

          <div>
            <Label className="block text-sm font-medium">End Date</Label>
            <DatePicker 
              date={endDate} 
              onSelect={setEndDate}
              disabled={!areTargetFieldsEditable}
              disablePastDates={true}
            />
          </div>

          {formError && (
            <div className="md:col-span-3 mt-2 text-sm text-red-600">{formError}</div>
          )}
        </div>
      </div>

      {/* Applicable To - only editable for draft */}
      {areApplicableFieldsVisible && (
        <div className="rounded-lg bg-card p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Applicable To <span className="text-red-500">*</span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Warehouses */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Warehouses</div>
            <Input
              readOnly
              placeholder="Select warehouses..."
              value={applicableWarehouses.length > 0 ? `${applicableWarehouses.length} selected` : ''}
              onClick={() => {
                setApplicableModalType('warehouses');
                setApplicableModalOpen(true);
              }}
              className="cursor-pointer"
            />
            </div>
            {/* Brands */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Brands</div>
              <Input
                readOnly
                placeholder="Select brands..."
                value={applicableBrands.length > 0 ? `${applicableBrands.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('brands');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Categories */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Categories</div>
              <Input
                readOnly
                placeholder="Select categories..."
                value={applicableCategories.length > 0 ? `${applicableCategories.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('categories');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Subcategories */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Subcategories</div>
              <Input
                readOnly
                placeholder="Select subcategories..."
                value={applicableSubcategories.length > 0 ? `${applicableSubcategories.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('subcategories');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Products */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Products</div>
              <Input
                readOnly
                placeholder="Select products..."
                value={applicableProducts.length > 0 ? `${applicableProducts.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('products');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Outlets */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Outlets</div>
              <Input
                readOnly
                placeholder="Select outlets..."
                value={applicableOutlets.length > 0 ? `${applicableOutlets.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('outlets');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Users */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Users</div>
              <Input
                readOnly
                placeholder="Select users..."
                value={applicableUsers.length > 0 ? `${applicableUsers.length} selected` : ''}
                onClick={() => {
                  setUserModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Divisions */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Divisions</div>
              <Input
                readOnly
                placeholder="Select divisions..."
                value={applicableDivisions.length > 0 ? `${applicableDivisions.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('divisions');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Zones */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Zones</div>
              <Input
                readOnly
                placeholder="Select zones..."
                value={applicableZones.length > 0 ? `${applicableZones.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('zones');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Subzones */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Subzones</div>
              <Input
                readOnly
                placeholder="Select subzones..."
                value={applicableSubzones.length > 0 ? `${applicableSubzones.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('subzones');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
            {/* Channels */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Channels</div>
              <Input
                readOnly
                placeholder="Select channels..."
                value={applicableChannels.length > 0 ? `${applicableChannels.length} selected` : ''}
                onClick={() => {
                  setApplicableModalType('channels');
                  setApplicableModalOpen(true);
                }}
                className="cursor-pointer"
              />
            </div>
          </div>
          {applicableError && (
            <div className="mt-4 text-sm text-red-600">{applicableError}</div>
          )}
        </div>
      )}

      {/* Single Applicable To Modal */}
      <MultiSelectModal
        open={applicableModalOpen}
        onOpenChange={(open) => {
          setApplicableModalOpen(open);
          if (!open) setApplicableModalType(null);
        }}
        title={
          applicableModalType === 'warehouses' ? 'Select Warehouses' :
          applicableModalType === 'products' ? 'Select Products' :
          applicableModalType === 'brands' ? 'Select Brands' :
          applicableModalType === 'categories' ? 'Select Categories' :
          applicableModalType === 'subcategories' ? 'Select Sub Categories' :
          applicableModalType === 'outlets' ? 'Select Outlets' :
          applicableModalType === 'divisions' ? 'Select Divisions' :
          applicableModalType === 'zones' ? 'Select Zones' :
          applicableModalType === 'subzones' ? 'Select Subzones' :
          applicableModalType === 'channels' ? 'Select Channels' : 'Select'
        }
        description={
          applicableModalType ? `Choose ${applicableModalType} for this target` : ''
        }
        options={
          applicableModalType === 'warehouses' ? warehouseOptions :
          applicableModalType === 'products' ? productOptions :
          applicableModalType === 'brands' ? brandOptions :
          applicableModalType === 'categories' ? categoryOptions :
          applicableModalType === 'subcategories' ? subcategoryOptions :
          applicableModalType === 'outlets' ? outletOptions :
          applicableModalType === 'divisions' ? divisionOptions :
          applicableModalType === 'zones' ? zoneOptions :
          applicableModalType === 'subzones' ? subzoneOptions :
          applicableModalType === 'channels' ? channelOptions : emptyOptions
        }
        value={
          applicableModalType === 'warehouses' ? applicableWarehouses :
          applicableModalType === 'products' ? applicableProducts :
          applicableModalType === 'brands' ? applicableBrands :
          applicableModalType === 'categories' ? applicableCategories :
          applicableModalType === 'subcategories' ? applicableSubcategories :
          applicableModalType === 'outlets' ? applicableOutlets :
          applicableModalType === 'divisions' ? applicableDivisions :
          applicableModalType === 'zones' ? applicableZones :
          applicableModalType === 'subzones' ? applicableSubzones :
          applicableModalType === 'channels' ? applicableChannels : emptyOptions
        }
        onChange={(val) => {
          if (applicableModalType === 'warehouses') setApplicableWarehouses(val);
          else if (applicableModalType === 'products') setApplicableProducts(val);
          else if (applicableModalType === 'brands') setApplicableBrands(val);
          else if (applicableModalType === 'categories') setApplicableCategories(val);
          else if (applicableModalType === 'subcategories') setApplicableSubcategories(val);
          else if (applicableModalType === 'outlets') setApplicableOutlets(val);
          else if (applicableModalType === 'divisions') setApplicableDivisions(val);
          else if (applicableModalType === 'zones') setApplicableZones(val);
          else if (applicableModalType === 'subzones') setApplicableSubzones(val);
          else if (applicableModalType === 'channels') setApplicableChannels(val);
        }}
        nonPaginated
        initialPagination={modalPagination}
        disabled={!areApplicableFieldsEditable}
      />

      {/* User MultiSelect Modal */}
      <UserMultiSelectModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        title="Select Users"
        description="Choose users for this target"
        users={userOptions}
        selectedUserIds={applicableUsers.map(u => u.value)}
        onChange={(userIds) => {
          const selectedUsers = userOptions.filter(user => userIds.includes(user.userId));
          setApplicableUsers(selectedUsers.map(user => ({ label: user.name, value: user.userId })));
        }}
        placeholder="Search users by name, employee code, user type, role, status, or warehouse..."
        disabled={!areApplicableFieldsEditable}
        nonPaginated
      />

      {/* Actions */}
      {areTargetFieldsEditable && (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href={NavKeys.Target}>Cancel</Link>
        </Button>
        <Button
          type="button"
          className="bg-primary text-white hover:bg-primary/90"
          disabled={updateTarget.isPending}
          onClick={async () => {
            // Always validate name
            if (!name.trim()) {
              setFormError('Target name is required.');
              return;
            }
            
            // If status is draft, validate all fields
            if (isDraftStatus) {
              const amountNum = Number(targetAmount);
              const tonsNum = Number(targetTons);
              const hasAmount = !!targetAmount && !isNaN(amountNum) && amountNum > 0;
              const hasTons = !!targetTons && !isNaN(tonsNum) && tonsNum > 0;
              
              if (!hasAmount && !hasTons) {
                setFormError('Provide either Target Amount or Target Weight (kgs).');
                return;
              }
              if (!startDate || !endDate) {
                setFormError('Start Date and End Date are required.');
                return;
              }
              
              // Check if at least one Applicable To field is selected
              const hasApplicableSelection = 
                applicableWarehouses.length > 0 ||
                applicableProducts.length > 0 ||
                applicableBrands.length > 0 ||
                applicableCategories.length > 0 ||
                applicableSubcategories.length > 0 ||
                applicableOutlets.length > 0 ||
                applicableUsers.length > 0 ||
                applicableDivisions.length > 0 ||
                applicableZones.length > 0 ||
                applicableSubzones.length > 0 ||
                applicableChannels.length > 0;
                
              if (!hasApplicableSelection) {
                setApplicableError('Please select at least one field from the Applicable To section. Any one field (User, Zone, Subzone, Channel, Division, Warehouse, Product, Outlet, Category, Subcategory, or Brand) is mandatory, others are optional.');
                return;
              } else {
                setApplicableError('');
              }
            } else {
              // Clear any existing applicable error for non-draft status
              setApplicableError('');
            }
            
            setFormError('');
            
            // Build update payload - always include all fields to satisfy API validation
            const amountNum = Number(targetAmount);
            const tonsNum = Number(targetTons);
            const hasAmount = !!targetAmount && !isNaN(amountNum) && amountNum > 0;
            const hasTons = !!targetTons && !isNaN(tonsNum) && tonsNum > 0;
            
            const fmt = (d?: Date) => {
              if (!d) return undefined;
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}T00:00:00.000Z`;
            };

            // Build selective payload - only include fields that are being updated
            const updatePayload: any = {
              targetId: targetId, // Include targetId to satisfy API validation
              targetName: name.trim(),
            };

            // Only include applicable fields if the target is currently in draft status
            // This allows updating draft targets with all fields including status change
            if (isDraftStatus) {
              // Only include fields that have actual values (non-empty arrays)
              const userIds = (applicableUsers || []).map(o => o.value);
              const warehouseIds = (applicableWarehouses || []).map(o => o.value);
              const outletIds = (applicableOutlets || []).map(o => o.value);
              const productIds = (applicableProducts || []).map(o => o.value);
              const brandIds = (applicableBrands || []).map(o => o.value);
              const categoryIds = (applicableCategories || []).map(o => o.value);
              const subCategoryIds = (applicableSubcategories || []).map(o => o.value);
              const divisionIds = (applicableDivisions || []).map(o => o.value);
              const channelIds = (applicableChannels || []).map(o => o.value);
              const zoneIds = (applicableZones || []).map(o => o.value);
              const subZoneIds = (applicableSubzones || []).map(o => o.value);

              // Only add fields that have values
              if (userIds.length > 0) updatePayload.userId = userIds;
              if (warehouseIds.length > 0) updatePayload.warehouseId = warehouseIds;
              if (outletIds.length > 0) updatePayload.outletId = outletIds;
              if (productIds.length > 0) updatePayload.productId = productIds;
              if (brandIds.length > 0) updatePayload.brandId = brandIds;
              if (categoryIds.length > 0) updatePayload.categoryId = categoryIds;
              if (subCategoryIds.length > 0) updatePayload.subCategoryId = subCategoryIds;
              if (divisionIds.length > 0) updatePayload.divisionId = divisionIds;
              if (channelIds.length > 0) updatePayload.channelId = channelIds;
              if (zoneIds.length > 0) updatePayload.zoneId = zoneIds;
              if (subZoneIds.length > 0) updatePayload.subZoneId = subZoneIds;

              updatePayload.target = {
                amount: hasAmount ? amountNum : 0,
                kgs: hasTons ? tonsNum : 0,
              };
              updatePayload.startDate = fmt(startDate);
              updatePayload.endDate = fmt(endDate);
              if (description) updatePayload.description = description;

              // Ensure at least one field has a value to avoid API validation error
              const hasAnySelection = 
                userIds.length > 0 ||
                warehouseIds.length > 0 ||
                outletIds.length > 0 ||
                productIds.length > 0 ||
                brandIds.length > 0 ||
                categoryIds.length > 0 ||
                subCategoryIds.length > 0 ||
                divisionIds.length > 0 ||
                channelIds.length > 0 ||
                zoneIds.length > 0 ||
                subZoneIds.length > 0;

              if (!hasAnySelection) {
                // Add a dummy entry to avoid API validation error
                updatePayload.userId = ['dummy-user-id'];
              }
            }

            try {
              console.debug('Updating target with payload:', updatePayload);
              
              toast.loading('Updating target...', { id: 'update-target' });
              
              // If status is changing, update status first using PATCH
              if (status !== originalStatus) {
                console.debug(`Status changing from ${originalStatus} to ${status} - using PATCH`);
                try {
                  await updateTargetStatus.mutateAsync({ id: targetId, status });
                  console.debug(`Status updated successfully via PATCH: ${originalStatus} → ${status}`);
                } catch (statusErr) {
                  console.error('Status update via PATCH failed:', statusErr);
                  console.warn('Falling back to PUT request with status in payload');
                  // If PATCH fails, include status in PUT payload as fallback
                  updatePayload.status = status;
                }
              }
              
              // Update target fields using PUT
              await updateTarget.mutateAsync({ id: targetId, data: updatePayload });
              toast.success('Target updated successfully!', { id: 'update-target' });
              
              // Wait a bit to ensure the toast is visible before navigation
              await new Promise((resolve) => setTimeout(resolve, 500));
              router.push(NavKeys.Target);
            } catch (err) {
              const anyErr: any = err;
              const status = anyErr?.response?.status;
              const data = anyErr?.response?.data;
              console.error('Failed to update target', status, data || anyErr?.message || anyErr);
              
              let msg = 'Unknown error';
              if (data) {
                if (typeof data === 'string') {
                  msg = data;
                } else if (data.message) {
                  msg = data.message;
                } else if (data.data?.message) {
                  msg = data.data.message;
                } else {
                  msg = JSON.stringify(data);
                }
              } else if (anyErr?.message) {
                msg = anyErr.message;
              }
              
              toast.error(`Failed to update target: ${msg}`, { id: 'update-target' });
            }
          }}
        >
          {updateTarget.isPending ? 'Updating...' : 'Update'}
        </Button>
      </div>
      )}
    </section>
  );
}