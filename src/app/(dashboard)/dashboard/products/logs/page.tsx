'use client';

import { useSearchParams } from 'next/navigation';
import { DynamicLogsComponent } from '@/components/logs';
import { productsLogsConfig } from '@/components/logs/configs/logs-configs';

const ProductsLogsPage = () => {
  return <ProductsLogsContent />;
};

function ProductsLogsContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  
  const config = {
    ...productsLogsConfig,
    entityId: productId || undefined,
  };

  return <DynamicLogsComponent config={config} enabled={!!productId} />;
}

export default ProductsLogsPage;
