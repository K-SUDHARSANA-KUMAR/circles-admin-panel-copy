"use client";

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    selectedBillingCoordinates: { lat: number; lng: number } | null;
    setIsBillingLocationModalOpen: (open: boolean) => void;
    visibleFields?: string[];
  };

export const BillingAddressSection = ({ 
  form, 
  isPincodeLoading, 
  selectedBillingCoordinates, 
  setIsBillingLocationModalOpen,
  visibleFields=["streetAddress", "pincode", "area", "district", "state", "location"]
}: Props) => {
  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">Billing Address</div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleFields.includes("streetAddress") && (
            <FormField
              control={form.control}
              name="billingAddress.streetAddress"
              render={({ field }) => (
                <FormItem className="gap-0">
                  <div className="flex items-center justify-between mb-1">
                    <FormLabel>
                      Billing Address
                    </FormLabel>
                    <button
                      type="button"
                      className="bg-freshleaf/20 text-freshleaf hover:bg-freshleaf/30 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs cursor-pointer"
                      onClick={() => setIsBillingLocationModalOpen(true)}
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      Pin Location
                    </button>
                  </div>
                  <FormControl>
                    <Input placeholder="Enter billing address" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {visibleFields.includes("pincode") && (
            <FormField
              control={form.control}
              name="billingAddress.pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Billing Pincode
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter Billing Pincode"
                      {...field}
                      value={field.value || ''}
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
            )}

            {visibleFields.includes("area") && (
            <FormField
              control={form.control}
              name="billingAddress.area"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Billing Area
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={isPincodeLoading ? 'Please Wait...' : 'Area will be auto-filled'}
                      value={isPincodeLoading ? 'Please Wait...' : (field.value || '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {visibleFields.includes("district") && (
            <FormField
              control={form.control}
              name="billingAddress.district"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing District</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={isPincodeLoading ? 'Please Wait...' : 'District will be auto-filled'}
                      value={isPincodeLoading ? 'Please Wait...' : (field.value || '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> 
            )}

            {visibleFields.includes("state") && (
            <FormField
              control={form.control}
              name="billingAddress.state"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Billing State
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      placeholder={isPincodeLoading ? 'Please Wait...' : 'State will be auto-filled'}
                      value={isPincodeLoading ? 'Please Wait...' : (field.value || '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}
          </div>
        </div>
        
        <div className="h-64 w-full lg:w-[46%] z-25 rounded-lg overflow-hidden border relative page-map-container">
          {selectedBillingCoordinates ? (
            <MapComponent 
              onLocationSelect={() => {}} 
              initialCoordinates={selectedBillingCoordinates} 
              selectedCoordinates={selectedBillingCoordinates} 
              readOnly={true} 
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No billing location selected</p>
              <p className="text-xs text-gray-400">Click "Pin Location" to select coordinates (optional)</p>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingAddressSection;
