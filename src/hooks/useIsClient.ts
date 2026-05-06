import { useEffect, useState } from 'react';

/**
 * Custom hook to detect if code is running on client side
 * Helps prevent hydration mismatches by ensuring certain operations
 * only run after hydration is complete
 */
export const useIsClient = (): boolean => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};
