import { useState, useEffect, useCallback } from "react";

/**
 * Hook to detect online/offline status with debouncing
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // User came back online
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

const OFFLINE_CACHE_KEY = "muscledesk_offline_member_data";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedMemberData {
  id: string;
  member_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  plan_name: string | null;
  status: "active" | "expiring_soon" | "expired" | "blocked";
  start_date: string;
  expiry_date: string;
  qr_token: string;
  total_visits: number;
  last_visit_at: string | null;
  is_blocked: boolean;
  avatar_url: string | null;
  gym_id: string;
  cached_at: number;
}

/**
 * Hook to cache and retrieve member data for offline use
 */
export function useOfflineMemberData() {
  const [cachedData, setCachedData] = useState<CachedMemberData | null>(null);

  // Load cached data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CachedMemberData;
        // Check if cache is still valid (not expired)
        if (Date.now() - parsed.cached_at < CACHE_EXPIRY_MS) {
          setCachedData(parsed);
        } else {
          // Clear expired cache
          localStorage.removeItem(OFFLINE_CACHE_KEY);
        }
      }
    } catch (e) {
      console.error("Error loading offline cache:", e);
    }
  }, []);

  // Save member data to cache
  const cacheMemberData = useCallback((memberData: Omit<CachedMemberData, "cached_at">) => {
    try {
      const dataWithTimestamp: CachedMemberData = {
        ...memberData,
        cached_at: Date.now(),
      };
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(dataWithTimestamp));
      setCachedData(dataWithTimestamp);
    } catch (e) {
      console.error("Error caching member data:", e);
    }
  }, []);

  // Clear cached data (on logout)
  const clearCache = useCallback(() => {
    localStorage.removeItem(OFFLINE_CACHE_KEY);
    setCachedData(null);
  }, []);

  // Get time since last cache
  const getCacheAge = useCallback(() => {
    if (!cachedData) return null;
    const ageMs = Date.now() - cachedData.cached_at;
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }, [cachedData]);

  return {
    cachedData,
    cacheMemberData,
    clearCache,
    getCacheAge,
    hasCachedData: !!cachedData,
  };
}
