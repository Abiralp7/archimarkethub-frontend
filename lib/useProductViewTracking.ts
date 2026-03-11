import { useEffect, useRef } from 'react';
import api from './apiClient';

/**
 * Hook to track product views after user spends 30+ seconds on the page
 * Prevents duplicate tracking within same session
 */
export function useProductViewTracking(productId: string) {
  const trackingRef = useRef<{
    startTime: number;
    tracked: boolean;
    timeout: NodeJS.Timeout | null;
  }>({
    startTime: Date.now(),
    tracked: false,
    timeout: null,
  });

  useEffect(() => {
    if (!productId) return;

    const tracking = trackingRef.current;
    tracking.startTime = Date.now();

    // Set up timeout for 30 seconds
    tracking.timeout = setTimeout(async () => {
      if (tracking.tracked) return;

      try {
        tracking.tracked = true;
        await api.post('/analytics/event', {
          eventType: 'product:view',
          entityId: productId,
          metadata: {
            timeSpent: Math.round((Date.now() - tracking.startTime) / 1000),
          },
        });
      } catch (error) {
        console.error('Failed to track product view:', error);
        // Don't mark as tracked if request fails, allow retry
        tracking.tracked = false;
      }
    }, 30000); // 30 seconds

    return () => {
      if (tracking.timeout) {
        clearTimeout(tracking.timeout);
      }
    };
  }, [productId]);
}
