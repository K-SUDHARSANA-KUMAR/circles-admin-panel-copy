'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PricingGroupProductsViewer } from '@/components/shared/pricing-group-products-viewer';
import { Button } from '@/components/ui/button';
import NavKeys from '@/constants/navkeys';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const ViewPricingGroupProductsPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.PRICING_GROUP} action={MENU_RIGHTS.VIEW}>
      <ViewPricingGroupProductsContent />
    </RequirePermission>
  );
};

const ViewPricingGroupProductsContent = () => {
  const router = useRouter();

  const handleBack = () => {
    router.push(NavKeys.PriceGroup);
  };

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customer Groups
        </Button>
        <div className="text-xl font-medium">View Customer Group Products</div>
      </div>

      <div className="w-full">
        <PricingGroupProductsViewer />
      </div>
    </section>
  );
};

export default ViewPricingGroupProductsPage;
