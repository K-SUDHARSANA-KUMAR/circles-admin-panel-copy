"use client";

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';

const MapComponent = dynamic(() => import('@/components/modals/map-component'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

type Props = {
  form: any;
  isPincodeLoading: boolean;
  selectedCoordinates: { lat: number; lng: number } | null;
  setIsLocationModalOpen: (open: boolean) => void;
  onSameAsBillingChange?: (isSame: boolean) => void;
  onBillingFieldsChange?: (fields: string[]) => void;
  isSameAsBilling?: boolean;
  setIsSameAsBilling?: (checked: boolean) => void;
  disabled?: boolean;
};

export const AddressSection = ({ form, isPincodeLoading, selectedCoordinates, setIsLocationModalOpen, onSameAsBillingChange , onBillingFieldsChange, isSameAsBilling: externalIsSameAsBilling, setIsSameAsBilling: externalSetIsSameAsBilling, disabled}: Props) => {
  const [internalIsSameAsBilling, setInternalIsSameAsBilling] = useState(true);
  
  // Use external state if provided, otherwise use internal state
  const isSameAsBilling = externalIsSameAsBilling !== undefined ? externalIsSameAsBilling : internalIsSameAsBilling;
  const setIsSameAsBilling = externalSetIsSameAsBilling || setInternalIsSameAsBilling;

  const handleSameAsBillingChange = (checked: boolean) => {
    setIsSameAsBilling(checked);
    onSameAsBillingChange?.(checked);
    
    if (checked) {
      // Copy shipping address to billing address
      const shippingData = {
        streetAddress: form.getValues('outletAddress.streetAddress'),
        pincode: form.getValues('pincode'),
        area: form.getValues('area'),
        district: form.getValues('district'),
        state: form.getValues('state'),
        location: form.getValues('outletAddress.location'),
      };
      form.setValue('billingAddress', shippingData);
    }
  };
  const handleBillingFieldsChange = (fields: string[]) => {
    onBillingFieldsChange?.(fields);
  };

  // Copy shipping address to billing address on component mount (since checkbox is checked by default)
  useEffect(() => {
    if (isSameAsBilling) {
      const shippingData = {
        streetAddress: form.getValues('outletAddress.streetAddress'),
        pincode: form.getValues('pincode'),
        area: form.getValues('area'),
        district: form.getValues('district'),
        state: form.getValues('state'),
        location: form.getValues('outletAddress.location'),
      };
      form.setValue('billingAddress', shippingData);
    }
  }, [isSameAsBilling, form]);

  // Live-sync shipping -> billing when "same as" is enabled
  useEffect(() => {
    if (!isSameAsBilling) return;
    const subscription = form.watch((value: any, { name }: { name?: string }) => {
      if (!isSameAsBilling) return;
      const fieldsToSync = new Set([
        'outletAddress.streetAddress',
        'pincode',
        'area',
        'district',
        'state',
        'outletAddress.location',
      ]);
      if (!name || !fieldsToSync.has(name)) return;

      const shippingData = {
        streetAddress: value?.outletAddress?.streetAddress ?? form.getValues('outletAddress.streetAddress'),
        pincode: value?.pincode ?? form.getValues('pincode'),
        area: value?.area ?? form.getValues('area'),
        district: value?.district ?? form.getValues('district'),
        state: value?.state ?? form.getValues('state'),
        location: value?.outletAddress?.location ?? form.getValues('outletAddress.location'),
      };
      form.setValue('billingAddress', shippingData);
    });
    return () => subscription.unsubscribe();
  }, [form, isSameAsBilling]);

  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">Shipping Address</div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="outletAddress.streetAddress"
              render={({ field }) => (
                <FormItem className="gap-0">
                  <div className="flex items-center justify-between mb-1">
                    <FormLabel isRequired>
                      Shipping Address
                    </FormLabel>
                    <button
                      type="button"
                      className="bg-freshleaf/20 text-freshleaf hover:bg-freshleaf/30 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setIsLocationModalOpen(true)}
                      disabled={disabled}
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      Pin Location
                    </button>
                  </div>
                  <FormControl>
                    <Input placeholder="Enter shipping address" {...field} disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                  {!selectedCoordinates && (
                    <p className="text-destructive text-sm mt-1">Please select a location on the map</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Pincode <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter Pincode"
                      {...field}
                      disabled={disabled}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        target.value = target.value.replace(/\D/g, '').slice(0, 6);
                        field.onChange(target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel isRequired>
                    Area
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={isPincodeLoading ? 'Please Wait...' : 'Area will be auto-filled'}
                      value={isPincodeLoading ? 'Please Wait...' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="district"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel isRequired>District</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={isPincodeLoading ? 'Please Wait...' : 'District will be auto-filled'}
                      value={isPincodeLoading ? 'Please Wait...' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel isRequired>
                    State
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={isPincodeLoading ? 'Please Wait...' : 'State will be auto-filled'}
                      value={isPincodeLoading ? 'Please Wait...' : field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Same as Billing Address Checkbox */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sameAsBilling"
                checked={isSameAsBilling}
                onCheckedChange={handleSameAsBillingChange}
                disabled={disabled}
              />
              <label
                htmlFor="sameAsBilling"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Billing address is same as shipping address
              </label>
            </div>
          </div>
        </div>

        <div className="h-64 w-full lg:w-[46%] z-25 rounded-lg overflow-hidden border relative page-map-container">
          {selectedCoordinates ? (
            <MapComponent onLocationSelect={() => {}} initialCoordinates={selectedCoordinates} selectedCoordinates={selectedCoordinates} readOnly={true} />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No location selected</p>
                <p className="text-xs text-gray-400">Click "Pin Location" to select coordinates</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    
  );
};

 