'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RequirePermission } from '@/components/auth/require-permission';
import { useConfigurations } from '@/features/config-management/configurations/hooks/useConfigurations';
import GenericError from '@/components/ui/generic-error';
import Loading from '@/components/ui/loading';
import { toast } from 'sonner';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import NavKeys from '@/constants/navkeys';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

export default function ConfigurationModificationPage() {
  return (
    <RequirePermission module={PERMISSIONS.CONFIGURATIONS} action={MENU_RIGHTS.EDIT}>
      <ConfigurationModificationContent />
    </RequirePermission>
  );
}

function ConfigurationModificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const context = searchParams.get('context');
  const configId = searchParams.get('configId');

  const breadcrumb = getBreadcrumbData('configuration', 'edit');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [configObjectName, setConfigObjectName] = useState<string>('');

  const { getConfiguration, updateConfiguration } = useConfigurations();
  const configurationData = getConfiguration(context || '');

  useEffect(() => {
    if (configurationData.data?.data) {
      const data = configurationData.data.data;
      const configKeys = Object.keys(data);

      if (configKeys.length > 0) {
        const objectName = configKeys[0];
        const configObject = data[objectName];

        setConfigObjectName(objectName);

        const initialFormData: Record<string, any> = {};
        Object.keys(configObject).forEach((key) => {
          const value = configObject[key];
          if (typeof value === 'string') {
            initialFormData[key] = value || '';
          } else if (typeof value === 'number') {
            initialFormData[key] = value || 0;
          } else if (typeof value === 'boolean') {
            initialFormData[key] = value || false;
          } else {
            initialFormData[key] = value;
          }
        });

        setFormData(initialFormData);
      }
    }
  }, [configurationData.data?.data]);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!configId) {
      toast.error('Config ID is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const updateData = {
        value: formData,
      };

      await updateConfiguration.mutateAsync({
        configId: configId,
        data: updateData,
      });

      toast.success('Configuration updated successfully');
      router.push(NavKeys.Configurations);
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast.error('Failed to update configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(NavKeys.Configurations);
  };

  if (!context || !configId) {
    return (
      <section className="w-full space-y-6">
        <BreadcrumbHeader {...breadcrumb} />
        <div className="w-full space-y-3 rounded-lg bg-card p-4">
          <GenericError text="Context and Config ID are required. Please select a configuration to edit." />
        </div>
      </section>
    );
  }

  if (configurationData.isLoading) {
    return (
      <section className="w-full space-y-6">
        <BreadcrumbHeader {...breadcrumb} />
        <div className="w-full space-y-3 rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading configuration..." />
          </div>
        </div>
      </section>
    );
  }

  if (configurationData.error) {
    return (
      <section className="w-full space-y-6">
        <BreadcrumbHeader {...breadcrumb} />
        <div className="w-full space-y-3 rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading configuration. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  if (!configurationData.data?.data || Object.keys(formData).length === 0) {
    return (
      <section className="w-full space-y-6">
        <BreadcrumbHeader {...breadcrumb} />
        <div className="w-full space-y-3 rounded-lg bg-card p-4">
          <GenericError text="No configuration data found for the provided context." />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader {...breadcrumb} />

      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Configuration Settings
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(formData).map((key) => {
              const value = formData[key];
              const fieldType = typeof value;

              return (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())}
                  </Label>

                  {fieldType === 'boolean' ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={value}
                        onCheckedChange={(checked) =>
                          handleInputChange(key, checked)
                        }
                      />
                      <span className="text-sm text-gray-600">
                        {value ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  ) : fieldType === 'number' ? (
                    <Input
                      type="number"
                      placeholder={`Enter ${key}`}
                      value={value}
                      onChange={(e) =>
                        handleInputChange(key, Number(e.target.value) || 0)
                      }
                    />
                  ) : (
                    <Input
                      type="text"
                      placeholder={`Enter ${key}`}
                      value={value}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Configuration'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
