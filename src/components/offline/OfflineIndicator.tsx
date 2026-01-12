import { useOnlineStatus } from "@/hooks/useOfflineSupport";
import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = "" }: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show "Back online" message briefly when reconnecting
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[200] animate-slide-down ${className}`}>
      {!isOnline ? (
        <div className="bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          <span>You're offline - showing cached data</span>
        </div>
      ) : (
        <div className="bg-emerald-500 text-emerald-950 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium">
          <Wifi className="h-4 w-4" />
          <span>Back online!</span>
        </div>
      )}
    </div>
  );
}

interface OfflineBadgeProps {
  cacheAge?: string | null;
}

export function OfflineBadge({ cacheAge }: OfflineBadgeProps) {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
      <WifiOff className="h-3 w-3" />
      <span>Offline{cacheAge ? ` • ${cacheAge}` : ""}</span>
    </div>
  );
}
