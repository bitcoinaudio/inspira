import { useState, useEffect } from 'react';
import { samplePackerAPI } from '../utils/samplePackerAPI';

export function useGatewayStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkHealth = async () => {
      try {
        await samplePackerAPI.checkHealth();
        if (mounted) {
          setIsConnected(true);
          setLastChecked(new Date());
        }
      } catch (error) {
        if (mounted) {
          setIsConnected(false);
          setLastChecked(new Date());
        }
      }

      // Poll every 10 seconds
      if (mounted) {
        timeoutId = setTimeout(checkHealth, 10000);
      }
    };

    // Initial check
    checkHealth();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return { isConnected, lastChecked };
}
