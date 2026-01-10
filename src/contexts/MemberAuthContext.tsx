import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  user: User | null;
  session: Session | null;
  loading: boolean;
  member: MemberData | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberData | null>(null);

  const fetchMemberData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("auth_user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error("Error fetching member:", error);
        return null;
      }

      if (data) {
        setMember(data as MemberData);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching member data:", error);
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            await fetchMemberData(session.user.id);
          }, 0);
        } else {
          setMember(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchMemberData(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.user) {
      const memberData = await fetchMemberData(data.user.id);
      if (!memberData) {
        await supabase.auth.signOut();
        return { error: new Error("No member account found. Please contact your gym administrator.") };
      }
      if (memberData.is_blocked) {
        await supabase.auth.signOut();
        return { error: new Error("Your account has been blocked. Please contact your gym.") };
      }
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMember(null);
  };

  const refreshMember = async () => {
    if (user) {
      await fetchMemberData(user.id);
    }
  };

  const value = {
    user,
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
