import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MemberSession {
  token: string;
  member_id: string;
  gym_id: string;
  full_name: string;
  email: string;
  expires_at: string;
}

interface MemberData {
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
}

interface MemberAuthContextType {
  session: MemberSession | null;
  loading: boolean;
  memberLoading: boolean;
  member: MemberData | null;
  isOffline: boolean;
  signIn: (email: string, pin: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
  refreshMember: () => Promise<void>;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

const STORAGE_KEY = "muscledesk_member_session";
const OFFLINE_MEMBER_KEY = "muscledesk_offline_member";

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MemberSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [member, setMember] = useState<MemberData | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Cache member data for offline use
  const cacheMemberData = useCallback((memberData: MemberData) => {
    try {
      localStorage.setItem(OFFLINE_MEMBER_KEY, JSON.stringify({
        ...memberData,
        cached_at: Date.now()
      }));
    } catch (e) {
      console.error("Error caching member data:", e);
    }
  }, []);

  // Load cached member data for offline use
  const loadCachedMember = useCallback(() => {
    try {
      const cached = localStorage.getItem(OFFLINE_MEMBER_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cache valid for 7 days
        if (Date.now() - parsed.cached_at < 7 * 24 * 60 * 60 * 1000) {
          return parsed as MemberData;
        }
      }
    } catch (e) {
      console.error("Error loading cached member:", e);
    }
    return null;
  }, []);

  const fetchMemberData = useCallback(async (memberId: string) => {
    setMemberLoading(true);
    
    // If offline, try to use cached data
    if (!navigator.onLine) {
      const cached = loadCachedMember();
      if (cached && cached.id === memberId) {
        setMember(cached);
        setMemberLoading(false);
        return cached;
      }
      setMemberLoading(false);
      return null;
    }

    try {
      // Use service role via edge function to fetch member data
      const { data, error } = await supabase.functions.invoke("member-auth", {
        body: { action: "get-member", member_id: memberId }
      });

      if (error) {
        console.error("Error fetching member:", error);
        // Fallback to cached data on error
        const cached = loadCachedMember();
        if (cached && cached.id === memberId) {
          setMember(cached);
          setMemberLoading(false);
          return cached;
        }
        setMemberLoading(false);
        return null;
      }

      if (data?.member) {
        const memberData = data.member as MemberData;
        setMember(memberData);
        // Cache the data for offline use
        cacheMemberData(memberData);
        setMemberLoading(false);
        return memberData;
      }
      setMemberLoading(false);
      return null;
    } catch (error) {
      console.error("Error fetching member data:", error);
      // Fallback to cached data on error
      const cached = loadCachedMember();
      if (cached && cached.id === memberId) {
        setMember(cached);
        setMemberLoading(false);
        return cached;
      }
      setMemberLoading(false);
      return null;
    }
  }, [loadCachedMember, cacheMemberData]);

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Refresh data when coming back online
      if (session) {
        fetchMemberData(session.member_id);
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [session]);

  useEffect(() => {
    let isMounted = true;
    
    const initSession = async () => {
      // Check for existing session on mount
      const storedSession = localStorage.getItem(STORAGE_KEY);
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession) as MemberSession;
          const expiresAt = new Date(parsed.expires_at);
          
          if (expiresAt > new Date()) {
            if (isMounted) {
              setSession(parsed);
            }
            
            // If offline, load cached data immediately
            if (!navigator.onLine) {
              const cached = loadCachedMember();
              if (cached && isMounted) {
                setMember(cached);
              }
            } else {
              // Await the fetch to ensure member data is loaded before setting loading to false
              await fetchMemberData(parsed.member_id);
            }
          } else {
            // Session expired
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    
    initSession();
    
    return () => {
      isMounted = false;
    };
  }, [fetchMemberData, loadCachedMember]);

  const signIn = async (email: string, pin: string) => {
    if (!navigator.onLine) {
      return { error: new Error("You're offline. Please connect to the internet to sign in.") };
    }

    try {
      const { data, error } = await supabase.functions.invoke("member-auth", {
        body: { action: "login", email, pin }
      });

      if (error) {
        return { error: new Error("Authentication failed. Please try again.") };
      }

      if (!data.success) {
        return { error: new Error(data.error || "Invalid email or PIN") };
      }

      const memberSession: MemberSession = data.session;
      setSession(memberSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memberSession));
      
      // Fetch full member data
      await fetchMemberData(memberSession.member_id);

      return { error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: new Error("Authentication failed. Please try again.") };
    }
  };

  const signOut = () => {
    setSession(null);
    setMember(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OFFLINE_MEMBER_KEY);
  };

  const refreshMember = async () => {
    if (session) {
      await fetchMemberData(session.member_id);
    }
  };

  const value = {
    session,
    loading,
    memberLoading,
    member,
    isOffline,
    signIn,
    signOut,
    refreshMember,
  };

  return <MemberAuthContext.Provider value={value}>{children}</MemberAuthContext.Provider>;
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (context === undefined) {
    throw new Error("useMemberAuth must be used within a MemberAuthProvider");
  }
  return context;
}
