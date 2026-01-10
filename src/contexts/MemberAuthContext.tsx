import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  member: MemberData | null;
  signIn: (email: string, pin: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
  refreshMember: () => Promise<void>;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

const STORAGE_KEY = "muscledesk_member_session";

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MemberSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberData | null>(null);

  const fetchMemberData = async (memberId: string) => {
    try {
      // Use service role via edge function to fetch member data
      const { data, error } = await supabase.functions.invoke("member-auth", {
        body: { action: "get-member", member_id: memberId }
      });

      if (error) {
        console.error("Error fetching member:", error);
        return null;
      }

      if (data?.member) {
        setMember(data.member as MemberData);
        return data.member;
      }
      return null;
    } catch (error) {
      console.error("Error fetching member data:", error);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing session on mount
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as MemberSession;
        const expiresAt = new Date(parsed.expires_at);
        
        if (expiresAt > new Date()) {
          setSession(parsed);
          fetchMemberData(parsed.member_id);
        } else {
          // Session expired
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, pin: string) => {
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
  };

  const refreshMember = async () => {
    if (session) {
      await fetchMemberData(session.member_id);
    }
  };

  const value = {
    session,
    loading,
    member,
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
