import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useServiceWorkerUpdate() {
  const checkForUpdates = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update().catch(console.error);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('Service Worker updated, refreshing...');
        
        // Show toast and reload after a short delay
        toast.info('App updated! Refreshing...', {
          duration: 2000,
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check for updates on visibility change (when app comes to foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for updates on initial load
    checkForUpdates();

    // Also check periodically (every 5 minutes)
    const intervalId = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [checkForUpdates]);

  return { checkForUpdates };
}
