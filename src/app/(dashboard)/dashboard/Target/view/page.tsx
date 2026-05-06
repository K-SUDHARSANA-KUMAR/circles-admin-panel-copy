"use client";

import BreadcrumbHeader from "@/components/breadcrumb/breadcrumb";
import { getBreadcrumbData } from "@/constants/breadcrumb-config";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import NavKeys from "@/constants/navkeys";
import { useTargetById } from "@/features/dashboard/targets/hooks/useTargets";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Loading from "@/components/ui/loading";
import GenericPageLoading from "@/components/shared/generic-page-loading";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

export default function TargetViewPage() {
  const breadcrumb = getBreadcrumbData("target", "view");
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  
  const { data: targetData, isLoading: targetLoading } = useTargetById(targetId || '');
  
  // Target metrics
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [targetTons, setTargetTons] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState("draft");

  // Applicable To state
  const [applicableWarehouses, setApplicableWarehouses] = useState<any[]>([]);
  const [applicableProducts, setApplicableProducts] = useState<any[]>([]);
  const [applicableBrands, setApplicableBrands] = useState<any[]>([]);
  const [applicableCategories, setApplicableCategories] = useState<any[]>([]);
  const [applicableSubcategories, setApplicableSubcategories] = useState<any[]>([]);
  const [applicableOutlets, setApplicableOutlets] = useState<any[]>([]);
  const [applicableUsers, setApplicableUsers] = useState<any[]>([]);
  const [applicableDivisions, setApplicableDivisions] = useState<any[]>([]);
  const [applicableZones, setApplicableZones] = useState<any[]>([]);
  const [applicableSubzones, setApplicableSubzones] = useState<any[]>([]);
  const [applicableChannels, setApplicableChannels] = useState<any[]>([]);

  // Target progress calculations
  const targetAmountValue = parseFloat(targetAmount) || 0;
  const targetTonsValue = parseFloat(targetTons) || 0;
  const actualAmountValue = targetData?.actual?.amount || targetData?.actualAmount || 0;
  const actualTonsValue = targetData?.actual?.kgs || targetData?.actualKgs || 0;
  
  const amountProgress = targetAmountValue > 0 ? Math.min((actualAmountValue / targetAmountValue) * 100, 100) : 0;
  const tonsProgress = targetTonsValue > 0 ? Math.min((actualTonsValue / targetTonsValue) * 100, 100) : 0;

  // Calculate remaining values
  const remainingAmount = Math.max(targetAmountValue - actualAmountValue, 0);
  const remainingTons = Math.max(targetTonsValue - actualTonsValue, 0);

  useEffect(() => {
    console.log('Target View - targetData:', targetData);
    console.log('Target View - targetLoading:', targetLoading);
    console.log('Target View - targetId:', targetId);
    
    if (targetData) {
      const target = targetData;
      console.log('Target View - target object:', target);
      
      // Set basic fields
      setName(target.targetName || "");
      setDescription(target.description || "");
      setTargetAmount(target.target?.amount?.toString() || "");
      setTargetTons(target.target?.kgs?.toString() || "");
      setStatus(target.status || "draft");
      
      // Set dates
      if (target.startDate) setStartDate(new Date(target.startDate));
      if (target.endDate) setEndDate(new Date(target.endDate));
      
      // Set applicable data - check different possible structures
      console.log('Target View - applicableTo:', target.applicableTo);
      console.log('Target View - warehouseId:', target.warehouseId);
      console.log('Target View - productId:', target.productId);
      
      // Handle different data structures
      setApplicableWarehouses(target.applicableTo?.warehouses || target.warehouseId || []);
      setApplicableProducts(target.applicableTo?.products || target.productId || []);
      setApplicableBrands(target.applicableTo?.brands || target.brandId || []);
      setApplicableCategories(target.applicableTo?.categories || target.categoryId || []);
      setApplicableSubcategories(target.applicableTo?.subcategories || target.subCategoryId || []);
      setApplicableOutlets(target.applicableTo?.outlets || target.outletId || []);
      setApplicableUsers(target.applicableTo?.users || target.userId || []);
      setApplicableDivisions(target.applicableTo?.divisions || target.divisionId || []);
      setApplicableZones(target.applicableTo?.zones || target.zoneId || []);
      setApplicableSubzones(target.applicableTo?.subzones || target.subZoneId || []);
      setApplicableChannels(target.applicableTo?.channels || target.channelId || []);
    }
  }, [targetData, targetLoading, targetId]);

  if (targetLoading) {
    return <GenericPageLoading />;
  }

  if (!targetData) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
          <BreadcrumbHeader {...breadcrumb} />
        </div>
        <div className="rounded-lg bg-white p-4">
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Target not found</h3>
              <p className="text-gray-500">The target you're looking for doesn't exist.</p>
              <Button asChild className="mt-4">
                <Link href={NavKeys.Target}>Back to Targets</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
            <Input 
              placeholder="Enter" 
              value={name} 
              disabled={true}
              className="bg-gray-50"
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
                className="pl-7 bg-gray-50"
                disabled={true}
              />
            </div>
          </div>

          <div className="md:col-span-1 md:row-span-3 flex flex-col justify-between">
            <Label className="block text-sm font-medium">Description</Label>
            <Textarea 
              placeholder="Enter" 
              rows={4} 
              className="h-full bg-gray-50"
              value={description}
              disabled={true}
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
                className="pr-14 bg-gray-50"
                disabled={true}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">kgs</span>
            </div>
          </div>

          <div>
            <Label className="w-full text-sm font-medium">Status</Label>
            <Select value={status} disabled={true}>
              <SelectTrigger className="w-full bg-gray-50">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium">Start Date</Label>
            <DatePicker 
              date={startDate} 
              onSelect={() => {}} // No-op for read-only
              disabled={true}
              disablePastDates={false}
            />
          </div>

          <div>
            <Label className="block text-sm font-medium">End Date</Label>
            <DatePicker 
              date={endDate} 
              onSelect={() => {}} // No-op for read-only
              disabled={true}
              disablePastDates={false}
            />
          </div>
        </div>
      </div>

      {/* Applicable To Section */}
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
              className="bg-gray-50 cursor-default"
            />
                  </div>

          {/* Brands */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Brands</div>
            <Input
              readOnly
              placeholder="Select brands..."
              value={applicableBrands.length > 0 ? `${applicableBrands.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
                </div>

          {/* Categories */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Categories</div>
            <Input
              readOnly
              placeholder="Select categories..."
              value={applicableCategories.length > 0 ? `${applicableCategories.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
            </div>

          {/* Subcategories */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Subcategories</div>
            <Input
              readOnly
              placeholder="Select subcategories..."
              value={applicableSubcategories.length > 0 ? `${applicableSubcategories.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Products */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Products</div>
            <Input
              readOnly
              placeholder="Select products..."
              value={applicableProducts.length > 0 ? `${applicableProducts.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Outlets */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Outlets</div>
            <Input
              readOnly
              placeholder="Select outlets..."
              value={applicableOutlets.length > 0 ? `${applicableOutlets.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Users */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Users</div>
            <Input
              readOnly
              placeholder="Select users..."
              value={applicableUsers.length > 0 ? `${applicableUsers.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Divisions */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Divisions</div>
            <Input
              readOnly
              placeholder="Select divisions..."
              value={applicableDivisions.length > 0 ? `${applicableDivisions.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Zones */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Zones</div>
            <Input
              readOnly
              placeholder="Select zones..."
              value={applicableZones.length > 0 ? `${applicableZones.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Subzones */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Subzones</div>
            <Input
              readOnly
              placeholder="Select subzones..."
              value={applicableSubzones.length > 0 ? `${applicableSubzones.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Channels</div>
            <Input
              readOnly
              placeholder="Select channels..."
              value={applicableChannels.length > 0 ? `${applicableChannels.length} selected` : ''}
              className="bg-gray-50 cursor-default"
            />
          </div>
        </div>
      </div>

      {/* Target Progress Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="bg-gray-50 mb-6 rounded-lg p-3 text-lg font-semibold text-gray-800">
          Target Progress
        </div>
        
        <div className="space-y-8">
          {/* Progress Circles Row */}
          <div className="flex justify-center items-center space-x-16">
            {/* KG Progress Circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-3">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  {/* Progress circle */}
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeDasharray={`${tonsProgress}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {Math.round(tonsProgress)}%
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">KG Progress</p>
                  </div>

            {/* Amount Progress Circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-3">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  {/* Progress circle */}
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeDasharray={`${amountProgress}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {Math.round(amountProgress)}%
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">Amount Progress</p>
            </div>
          </div>

          {/* Summary Cards Row */}
          <div className="flex justify-center items-center space-x-6">
            {/* Target KG Card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 min-w-[160px] text-center shadow-sm">
              <div className="text-green-600 font-semibold text-sm mb-2">Target KG</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {targetTonsValue}
              </div>
              <div className="text-sm text-gray-500">
                vs {actualTonsValue} achieved
              </div>
            </div>

            {/* Target Value Card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 min-w-[160px] text-center shadow-sm">
              <div className="text-green-600 font-semibold text-sm mb-2">Target Value</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">
                ₹{targetAmountValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                vs ₹{actualAmountValue.toLocaleString()} achieved
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Overview Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="bg-gray-50 mb-6 rounded-lg p-3 text-lg font-semibold text-gray-800">
          Target Overview
        </div>
        
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Target Weight Overview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 text-center">Target Weight Overview</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex">
                {/* Y-axis labels - vertical on left */}
                <div className="flex flex-col justify-between h-48 text-xs text-gray-500 mr-4">
                  <span>50k</span>
                  <span>40k</span>
                  <span>30k</span>
                  <span>20k</span>
                  <span>10k</span>
                  <span>0k</span>
                </div>
                
                {/* Chart container */}
                <div className="flex-1 flex items-end justify-center space-x-8 h-48">
                  {/* Target Bar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-red-500 rounded-t" style={{ height: `${(targetTonsValue / 50000) * 180}px` }}></div>
                    <span className="text-xs font-medium text-gray-700 mt-2">Target</span>
                    <span className="text-xs text-gray-600">{(targetTonsValue / 1000).toFixed(0)}k kg</span>
                  </div>

                  {/* Achieved Bar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-green-500 rounded-t" style={{ height: `${(actualTonsValue / 50000) * 180}px` }}></div>
                    <span className="text-xs font-medium text-gray-700 mt-2">Achieved</span>
                    <span className="text-xs text-gray-600">{(actualTonsValue / 1000).toFixed(0)}k kg</span>
                  </div>

                  {/* Remaining Bar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-blue-500 rounded-t" style={{ height: `${(remainingTons / 50000) * 180}px` }}></div>
                    <span className="text-xs font-medium text-gray-700 mt-2">Remaining</span>
                    <span className="text-xs text-gray-600">{(remainingTons / 1000).toFixed(0)}k kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Target Amount Overview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 text-center">Target Amount Overview</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex">
                {/* Y-axis labels - vertical on left */}
                <div className="flex flex-col justify-between h-48 text-xs text-gray-500 mr-4">
                  <span>50k</span>
                  <span>40k</span>
                  <span>30k</span>
                  <span>20k</span>
                  <span>10k</span>
                  <span>0k</span>
                </div>
                
                {/* Chart container */}
                <div className="flex-1 flex items-end justify-center space-x-8 h-48">
                  {/* Target Bar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-red-500 rounded-t" style={{ height: `${(targetAmountValue / 50000) * 180}px` }}></div>
                    <span className="text-xs font-medium text-gray-700 mt-2">Target</span>
                    <span className="text-xs text-gray-600">₹{(targetAmountValue / 1000).toFixed(0)}k</span>
                  </div>

                  {/* Achieved Bar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-green-500 rounded-t" style={{ height: `${(actualAmountValue / 50000) * 180}px` }}></div>
                    <span className="text-xs font-medium text-gray-700 mt-2">Achieved</span>
                    <span className="text-xs text-gray-600">₹{(actualAmountValue / 1000).toFixed(0)}k</span>
                  </div>

                  {/* Remaining Bar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-blue-500 rounded-t" style={{ height: `${(remainingAmount / 50000) * 180}px` }}></div>
                    <span className="text-xs font-medium text-gray-700 mt-2">Remaining</span>
                    <span className="text-xs text-gray-600">₹{(remainingAmount / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={NavKeys.Target}>Back to Targets</Link>
        </Button>
      </div>
    </section>
  );
}