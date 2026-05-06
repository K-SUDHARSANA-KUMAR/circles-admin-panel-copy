"use client";

import BreadcrumbHeader from "@/components/breadcrumb/breadcrumb";
import { getBreadcrumbData } from "@/constants/breadcrumb-config";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
// Removed Select imports as Target Filters section is removed
import { DatePicker } from "@/components/ui/date-picker";
import { useMemo, useState } from "react";
import Link from "next/link";
import NavKeys from "@/constants/navkeys";
// Removed Dialog, TextInput alias, Checkbox, Table imports used only by Target Filters
import { MultiSelectModal, Option } from "@/components/modals/multi-select-modal";
import { UserMultiSelectModal, UserOption } from "@/components/modals/user-multiselect-modal";
import { useWarehouse } from "@/features/warehouse-managment/hooks/useWarehouse";
import { useProducts } from "@/features/dashboard/products/hooks/useProducts";
import { useOutlets } from "@/features/dashboard/outlets/hooks/useOutlets";
import { useBrands, useCategories, useSubcategories, useMasterRecords } from "@/features/master-managment/hooks/useMasterRecords";
import { useUsers } from "@/features/user-managment/users/hooks/useUsers";
import { useTargets } from "@/features/dashboard/targets/hooks/useTargets";
import { useActiveSchemes, useSchemes } from "@/features/dashboard/schemes/hooks/useSchemes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function TargetCreatePage() {
  const breadcrumb = getBreadcrumbData("target", "create");
  const router = useRouter();
  const { createTarget } = useTargets();
  
  console.log('Target Create Page - createTarget:', createTarget);
  // Target metrics
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [targetTons, setTargetTons] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [formError, setFormError] = useState<string>("");
  const [applicableError, setApplicableError] = useState<string>("");
  // Removed Division/Channel/Zone/Sub Zone selectors

  // Applicable To state (mirrors Schemes)
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

  // Applicable To modal (single reusable modal to prevent nested updates)
  type ApplicableType = 'warehouses' | 'products' | 'brands' | 'categories' | 'subcategories' | 'outlets' | 'divisions' | 'zones' | 'subzones' | 'channels';
  const [applicableModalOpen, setApplicableModalOpen] = useState(false);
  const [applicableModalType, setApplicableModalType] = useState<ApplicableType | null>(null);
  
  // Separate modal for users
  const [userModalOpen, setUserModalOpen] = useState(false);
  
  // Product breakup modal
  const [productBreakupModalOpen, setProductBreakupModalOpen] = useState(false);
  const [selectedBreakupRowId, setSelectedBreakupRowId] = useState<string | null>(null);
  const [selectedSchemeField, setSelectedSchemeField] = useState<'primary' | 'secondary' | null>(null);
  const emptyOptions = useMemo<Option[]>(() => [], []);
  const modalPagination = useMemo(() => ({ pageIndex: 0, pageSize: 10 }), []);

  // Breakup type: 'product' or 'scheme'
  const [breakupType, setBreakupType] = useState<'product' | 'scheme'>('product');

  // Fetch options using existing hooks (mirroring Schemes)
  const { warehouses } = useWarehouse(undefined, { nonPaginated: true });
  const { products } = useProducts({ enabled: true, nonPaginated: true });
  const { outlets } = useOutlets({ enabled: true, nonPaginated: true });
  const { records: brands } = useBrands();
  const { records: categories } = useCategories();
  // Fetch subcategories without filter (same as Schemes)
  const { records: subcategories } = useSubcategories();
  
  // Fetch new fields
  const { users } = useUsers({ nonPaginated: 'true' });
  const { records: divisions } = useMasterRecords('division', undefined, 0, 1000, true);
  const { records: zones } = useMasterRecords('zone', undefined, 0, 1000, true);
  const { records: subzones } = useMasterRecords('subZone', undefined, 0, 1000, true);
  const { records: channels } = useMasterRecords('channel', undefined, 0, 1000, true);

  // Individual Product Breakup state
  interface ProductBreakup {
    id: string;
    productId: string;
    value: string;
    weight: string;
  }
  const [productBreakups, setProductBreakups] = useState<ProductBreakup[]>([
    { id: '1', productId: '', value: '', weight: '' }
  ]);

  // Scheme breakup state: separate primary and secondary lists
  interface SchemeRow {
    id: string;
    schemeId: string;
    weight: string;
  }
  const [primarySchemeRows, setPrimarySchemeRows] = useState<SchemeRow[]>([
    { id: '1', schemeId: '', weight: '' }
  ]);
  const [secondarySchemeRows, setSecondarySchemeRows] = useState<SchemeRow[]>([
    { id: '1', schemeId: '', weight: '' }
  ]);

  // const { data: activeSchemesData } = useActiveSchemes();
  // API hooks
  const {
    data: activeSchemesData,
  } = useSchemes({
    status: 'active',
    skip: 0,
    limit: 50,
  });

  const schemeOptions = useMemo<Option[]>(() => {
    const items = activeSchemesData?.data?.items || [];
    return items.map((s: any) => ({ label: s.schemeName, value: s.schemeId }));
  }, [activeSchemesData]);

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

  // Handle product breakup changes
  const handleProductBreakupChange = (id: string, field: keyof ProductBreakup, value: string) => {
    setProductBreakups(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  // Add new product breakup row
  const addProductBreakupRow = () => {
    const newId = String(Math.max(...productBreakups.map(p => Number(p.id)), 0) + 1);
    setProductBreakups(prev => [
      ...prev,
      { id: newId, productId: '', value: '', weight: '' }
    ]);
  };

  // Remove product breakup row
  const removeProductBreakupRow = (id: string) => {
    setProductBreakups(prev => prev.filter(row => row.id !== id));
  };

  // Handle scheme breakup changes
  // Handlers for primary scheme rows
  const handlePrimarySchemeChange = (id: string, field: keyof SchemeRow, value: string) => {
    setPrimarySchemeRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const addPrimarySchemeRow = () => {
    const newId = String(Math.max(...primarySchemeRows.map(s => Number(s.id)), 0, ...secondarySchemeRows.map(s => Number(s.id))) + 1);
    setPrimarySchemeRows(prev => [...prev, { id: newId, schemeId: '', weight: '' }]);
  };
  const removePrimarySchemeRow = (id: string) => setPrimarySchemeRows(prev => prev.filter(r => r.id !== id));

  // Handlers for secondary scheme rows
  const handleSecondarySchemeChange = (id: string, field: keyof SchemeRow, value: string) => {
    setSecondarySchemeRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const addSecondarySchemeRow = () => {
    const newId = String(Math.max(...secondarySchemeRows.map(s => Number(s.id)), 0, ...primarySchemeRows.map(s => Number(s.id))) + 1);
    setSecondarySchemeRows(prev => [...prev, { id: newId, schemeId: '', weight: '' }]);
  };
  const removeSecondarySchemeRow = (id: string) => setSecondarySchemeRows(prev => prev.filter(r => r.id !== id));

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      {/* Target Information */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Target Information
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Row 1: Name, Target Amount, Target Weight */}
          <div>
            <Label className="block text-sm font-medium">Name</Label>
            <Input placeholder="Enter" value={name} onChange={(e) => setName(e.target.value)} />
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
              />
            </div>
          </div>

          {/* Description column spanning rows on the right */}
          <div className="md:col-span-1 md:row-span-3 flex flex-col justify-between">
            <Label className="block text-sm font-medium">Description</Label>
            <Textarea 
              placeholder="Enter" 
              rows={4} 
              className="h-full"
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label className="block text-sm font-medium">Target Weight</Label>
            <div className="relative">
              <Input
                placeholder="Enter weight in kgs"
                type="number"
                min={0}
                value={targetTons}
                onChange={(e) => setTargetTons(e.target.value)}
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">kgs</span>
            </div>
          </div>

          {/* Row 3: Start Date, End Date */}
          <div>
            <Label className="block text-sm font-medium">Start Date</Label>
            <DatePicker date={startDate} onSelect={setStartDate} disablePastDates={true} />
          </div>
          <div>
            <Label className="block text-sm font-medium">End Date</Label>
            <DatePicker date={endDate} onSelect={setEndDate} disablePastDates={true} />
          </div>

          {formError && (
            <div className="md:col-span-2 mt-2 text-sm text-red-600">{formError}</div>
          )}
        </div>
      </div>

      {/* Applicable To */}
      <div className="rounded-lg bg-white p-4">
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
              onClick={() => { setApplicableModalType('warehouses'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('warehouses'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('brands'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('brands'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('categories'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('categories'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('subcategories'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('subcategories'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('products'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('products'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('outlets'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('outlets'); setApplicableModalOpen(true); }}
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
              onClick={() => setUserModalOpen(true)}
              onPointerDown={() => setUserModalOpen(true)}
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
              onClick={() => { setApplicableModalType('divisions'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('divisions'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('zones'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('zones'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('subzones'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('subzones'); setApplicableModalOpen(true); }}
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
              onClick={() => { setApplicableModalType('channels'); setApplicableModalOpen(true); }}
              onPointerDown={() => { setApplicableModalType('channels'); setApplicableModalOpen(true); }}
              className="cursor-pointer"
            />
          </div>
        </div>
        {applicableError && (
          <div className="mt-4 text-sm text-red-600">{applicableError}</div>
        )}
      </div>

      {/* Breakup Type Selection */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Breakup Type
        </div>
        <div className="flex gap-6 items-center">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="breakupType"
              value="product"
              checked={breakupType === 'product'}
              onChange={() => setBreakupType('product')}
            />
            Product Based
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="breakupType"
              value="scheme"
              checked={breakupType === 'scheme'}
              onChange={() => setBreakupType('scheme')}
            />
            Scheme Based
          </label>
        </div>
      </div>

      {/* Individual Product Breakup (conditional) */}
      {breakupType === 'product' && (
        <div className="rounded-lg bg-white p-4">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            Individual Product Breakup
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/3">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/4">Value (₹)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/4">Weight (kgs)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/12">Action</th>
                </tr>
              </thead>
              <tbody>
                {productBreakups.map((row, index) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Input
                        readOnly
                        placeholder="Select product..."
                        value={
                          productOptions.find(p => p.value === row.productId)?.label || ''
                        }
                        onClick={() => {
                          setSelectedBreakupRowId(row.id);
                          setProductBreakupModalOpen(true);
                        }}
                        className="cursor-pointer w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        placeholder="Enter value"
                        value={row.value}
                        onChange={(e) => handleProductBreakupChange(row.id, 'value', e.target.value)}
                        min="0"
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        placeholder="Enter weight"
                        value={row.weight}
                        onChange={(e) => handleProductBreakupChange(row.id, 'weight', e.target.value)}
                        min="0"
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {productBreakups.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductBreakupRow(row.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={addProductBreakupRow}
              className="border-freshleaf text-freshleaf hover:bg-freshleaf/5"
            >
              + Add Product
            </Button>
          </div>
        </div>
      )}

      {/* Individual Scheme Breakup: Primary and Secondary sections */}
      {breakupType === 'scheme' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Primary Schemes
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-2/3">Scheme</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/4">Weight (kgs)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {primarySchemeRows.map(row => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Input
                          readOnly
                          placeholder="Select primary scheme..."
                          value={schemeOptions.find(s => s.value === row.schemeId)?.label || ''}
                          onClick={() => {
                            setSelectedBreakupRowId(row.id);
                            setSelectedSchemeField('primary');
                            setProductBreakupModalOpen(true);
                          }}
                          className="cursor-pointer w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          placeholder="Enter weight"
                          value={row.weight}
                          onChange={(e) => handlePrimarySchemeChange(row.id, 'weight', e.target.value)}
                          min="0"
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {primarySchemeRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrimarySchemeRow(row.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addPrimarySchemeRow}
                className="border-freshleaf text-freshleaf hover:bg-freshleaf/5"
              >
                + Add Primary Scheme
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Secondary Schemes
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-2/3">Scheme</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/4">Weight (kgs)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/12">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {secondarySchemeRows.map(row => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Input
                          readOnly
                          placeholder="Select secondary scheme..."
                          value={schemeOptions.find(s => s.value === row.schemeId)?.label || ''}
                          onClick={() => {
                            setSelectedBreakupRowId(row.id);
                            setSelectedSchemeField('secondary');
                            setProductBreakupModalOpen(true);
                          }}
                          className="cursor-pointer w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          placeholder="Enter weight"
                          value={row.weight}
                          onChange={(e) => handleSecondarySchemeChange(row.id, 'weight', e.target.value)}
                          min="0"
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {secondarySchemeRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSecondarySchemeRow(row.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addSecondarySchemeRow}
                className="border-freshleaf text-freshleaf hover:bg-freshleaf/5"
              >
                + Add Secondary Scheme
              </Button>
            </div>
          </div>
        </div>
      )}

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
        nonPaginated
      />

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
      />

      {/* Scheme Breakup Modal (for scheme selection) */}
      {/* Product Breakup Modal (for product selection) */}
      {breakupType === 'product' && (
        <MultiSelectModal
          open={productBreakupModalOpen}
          onOpenChange={(open) => {
            setProductBreakupModalOpen(open);
            if (!open) setSelectedBreakupRowId(null);
          }}
          title="Select Product"
          description="Choose a product for this breakup row"
          options={
            // Exclude products already chosen in other rows to prevent duplicates
            (() => {
              const selectedIds = productBreakups.map(p => p.productId).filter(Boolean);
              const currentId = selectedBreakupRowId ? productBreakups.find(p => p.id === selectedBreakupRowId)?.productId : undefined;
              return productOptions.filter(opt => !selectedIds.includes(opt.value) || opt.value === currentId);
            })()
          }
          value={selectedBreakupRowId ? [productBreakups.find(r => r.id === selectedBreakupRowId)?.productId || ''].filter(Boolean).map(id => ({ label: productOptions.find(p => p.value === id)?.label || '', value: id })) : []}
          onChange={(val) => {
            if (selectedBreakupRowId && val.length > 0) {
              handleProductBreakupChange(selectedBreakupRowId, 'productId', val[0].value);
              setProductBreakupModalOpen(false);
              setSelectedBreakupRowId(null);
            }
          }}
          nonPaginated
          initialPagination={modalPagination}
        />
      )}

      {breakupType === 'scheme' && (
        <MultiSelectModal
          open={productBreakupModalOpen}
          onOpenChange={(open) => {
            setProductBreakupModalOpen(open);
            if (!open) setSelectedBreakupRowId(null);
          }}
          title="Select Scheme"
          description="Choose a scheme for this breakup row"
          options={
            // Exclude schemes already chosen in other scheme rows (primary or secondary) to prevent duplicates
            (() => {
              const selectedSchemeIds = [...primarySchemeRows.map(s => s.schemeId), ...secondarySchemeRows.map(s => s.schemeId)].filter(Boolean);
              const currentSchemeId = selectedBreakupRowId
                ? (selectedSchemeField === 'secondary'
                    ? secondarySchemeRows.find(s => s.id === selectedBreakupRowId)?.schemeId
                    : primarySchemeRows.find(s => s.id === selectedBreakupRowId)?.schemeId)
                : undefined;
              return schemeOptions.filter(opt => !selectedSchemeIds.includes(opt.value) || opt.value === currentSchemeId);
            })()
          }
          value={selectedBreakupRowId ? [
            (() => {
              const row = selectedSchemeField === 'secondary'
                ? secondarySchemeRows.find(r => r.id === selectedBreakupRowId)
                : primarySchemeRows.find(r => r.id === selectedBreakupRowId);
              const id = row?.schemeId;
              return id || '';
            })()
          ].filter(Boolean).map(id => ({ label: schemeOptions.find(s => s.value === id)?.label || '', value: id })) : []}
          onChange={(val) => {
            if (selectedBreakupRowId && val.length > 0) {
              if (selectedSchemeField === 'secondary') {
                handleSecondarySchemeChange(selectedBreakupRowId, 'schemeId', val[0].value);
              } else {
                handlePrimarySchemeChange(selectedBreakupRowId, 'schemeId', val[0].value);
              }
              setProductBreakupModalOpen(false);
              setSelectedBreakupRowId(null);
              setSelectedSchemeField(null);
            }
          }}
          nonPaginated
          initialPagination={modalPagination}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href={NavKeys.Target}>Cancel</Link>
        </Button>
        <Button
          type="button"
          className="bg-freshleaf text-white hover:bg-freshleaf/90"
          disabled={createTarget.isPending}
          onClick={async () => {
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

            // Breakup validation
            if (breakupType === 'product') {
              if (hasAmount) {
                const breakupValueSum = productBreakups.reduce((sum, row) => {
                  const value = Number(row.value) || 0;
                  return sum + value;
                }, 0);
                if (breakupValueSum !== amountNum) {
                  setFormError(`Target Amount (₹${amountNum}) must equal the sum of individual product breakup values (₹${breakupValueSum}). Please ensure they match.`);
                  return;
                }
              }
              if (hasTons) {
                const breakupWeightSum = productBreakups.reduce((sum, row) => {
                  const weight = Number(row.weight) || 0;
                  return sum + weight;
                }, 0);
                if (breakupWeightSum !== tonsNum) {
                  setFormError(`Target Weight (${tonsNum} kgs) must equal the sum of individual product breakup weights (${breakupWeightSum} kgs). Please ensure they match.`);
                  return;
                }
              }
            } else if (breakupType === 'scheme') {
              if (hasTons) {
                const primarySum = primarySchemeRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
                const secondarySum = secondarySchemeRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
                const breakupWeightSum = primarySum + secondarySum;
                if (breakupWeightSum !== tonsNum) {
                  setFormError(`Target Weight (${tonsNum} kgs) must equal the sum of scheme breakup weights (${breakupWeightSum} kgs). Please ensure they match.`);
                  return;
                }
              }
              // No value check for scheme-based
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
            
            setFormError('');
            const fmt = (d?: Date) => {
              if (!d) return undefined;
              // Send date with explicit timezone to prevent backend conversion
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              // Add time component to prevent timezone conversion
              return `${year}-${month}-${day}T00:00:00.000Z`;
            };
            // Build payload and omit empty arrays / unset numeric fields
            const basePayload: any = {
              targetName: name,
              userId: (applicableUsers || []).map(o => o.value),
              warehouseId: (applicableWarehouses || []).map(o => o.value),
              outletId: (applicableOutlets || []).map(o => o.value),
              productId: (applicableProducts || []).map(o => o.value),
              brandId: (applicableBrands || []).map(o => o.value),
              categoryId: (applicableCategories || []).map(o => o.value),
              subCategoryId: (applicableSubcategories || []).map(o => o.value),
              divisionId: (applicableDivisions || []).map(o => o.value),
              channelId: (applicableChannels || []).map(o => o.value),
              zoneId: (applicableZones || []).map(o => o.value),
              subZoneId: (applicableSubzones || []).map(o => o.value),
              target: {
                amount: hasAmount ? amountNum : 0,
                kgs: hasTons ? tonsNum : 0,
              },
              startDate: fmt(startDate),
              endDate: fmt(endDate),
              description: description,
              status: 'draft', // Automatically set new targets to draft
            };

            // Ensure at least one field is present to avoid API validation error
            // If no fields are selected, add a dummy entry to the first available field
            const hasAnySelection = 
              basePayload.userId?.length > 0 ||
              basePayload.warehouseId?.length > 0 ||
              basePayload.outletId?.length > 0 ||
              basePayload.productId?.length > 0 ||
              basePayload.brandId?.length > 0 ||
              basePayload.categoryId?.length > 0 ||
              basePayload.subCategoryId?.length > 0 ||
              basePayload.divisionId?.length > 0 ||
              basePayload.channelId?.length > 0 ||
              basePayload.zoneId?.length > 0 ||
              basePayload.subZoneId?.length > 0;

            if (!hasAnySelection) {
              // Add a dummy entry to avoid API validation error
              basePayload.userId = ['dummy-user-id'];
            }

            // Remove empty arrays keys (but keep at least one field)
            ['userId','warehouseId','outletId','productId','brandId','categoryId','subCategoryId','divisionId','channelId','zoneId','subZoneId']
              .forEach((k) => {
                if (Array.isArray(basePayload[k]) && basePayload[k].length === 0) {
                  delete basePayload[k];
                }
              });

            // Target object is always required with amount and kgs fields

            const payload = basePayload;
            try {
              console.debug('Creating target with payload:', payload);
              console.debug('Start date being sent:', payload.startDate);
              console.debug('End date being sent:', payload.endDate);
              console.debug('Payload keys:', Object.keys(payload));
              console.debug('Target object:', payload.target);
              
              toast.loading('Creating target...', { id: 'create-target' });
              await createTarget.mutateAsync(payload as any);
              toast.success('Target created successfully!', { id: 'create-target' });
              
              // Wait a bit to ensure the toast is visible before navigation
              await new Promise((resolve) => setTimeout(resolve, 500));
              router.push(NavKeys.Target);
            } catch (err) {
              const anyErr: any = err;
              const status = anyErr?.response?.status;
              const data = anyErr?.response?.data;
              console.error('Failed to create target - Full error:', anyErr);
              console.error('Response status:', status);
              console.error('Response data:', data);
              console.error('Request payload was:', payload);
              
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
              
              toast.error(`Failed to create target: ${msg}`, { id: 'create-target' });
            }
          }}
        >
          {createTarget.isPending ? 'Creating...' : 'Create'}
        </Button>
      </div>
    </section>
  );
}
