'use client';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { MasterRecordSelect } from '@/components/shared/master-record-select';

type Props = {
  form: any;
  disabled?: boolean;
};

export const OutletAccountsInfoSection = ({ form, disabled = false }: Props) => {
  return (
    <div className="rounded-lg bg-card p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
        Outlet Accounts Informations
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="outletAccounts.paymentTermsId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Terms</FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="paymentTerms"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Payment Terms"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outletAccounts.salesDistrictId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sales District</FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="salesDistrict"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Sales District"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outletAccounts.regionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region</FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="region"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Region"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outletAccounts.incotermsId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incoterms</FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="incoterms"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Incoterms"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outletAccounts.priceGroupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Group</FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="priceGroup"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Price Group"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default OutletAccountsInfoSection;

