import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "super_admin" | "gym_owner" | "staff";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  gymId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isGymOwner: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isNetworkFetchError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("failed to fetch") || message.includes("network") || message.includes("cors");
};

const recoverAuthNetworkState = async () => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (recoveryError) {
    console.error("Auth recovery failed:", recoveryError);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role and gym using setTimeout to avoid blocking
          setTimeout(async () => {
            await fetchUserRoleAndGym(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setGymId(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoleAndGym(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoleAndGym = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
        
        // Only fetch gym if user has a role
        if (roleData.role === "gym_owner") {
          const { data: gymData } = await supabase
            .from("gyms")
            .select("id")
            .eq("owner_id", userId)
            .is("deleted_at", null)
            .maybeSingle();

          if (gymData) {
            setGymId(gymData.id);
          }
        } else if (roleData.role === "staff") {
          // Staff: get gym from gym_staff table
          const { data: staffData } = await supabase
            .from("gym_staff")
            .select("gym_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (staffData) {
            setGymId(staffData.gym_id);
          }
        } else if (roleData.role === "super_admin") {
          // Super admin can access all - set gymId to first gym or null
          const { data: gymData } = await supabase
            .from("gyms")
            .select("id")
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();

          if (gymData) {
            setGymId(gymData.id);
          }
        }
      } else {
        // No role assigned yet - user needs to wait for SuperAdmin
        setRole(null);
        setGymId(null);
      }
    } catch (error) {
      console.error("Error fetching user role/gym:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const attemptSignIn = async () =>
      supabase.auth.signInWithPassword({
        email,
        password,
      });

    const retryWithRecovery = async () => {
      // quick retry
      await new Promise((resolve) => setTimeout(resolve, 800));
      const { error: retryError } = await attemptSignIn();
      if (!retryError || !isNetworkFetchError(retryError)) {
        return { error: retryError as Error | null };
      }

      // hard recovery retry
      await recoverAuthNetworkState();
      const { error: postRecoveryError } = await attemptSignIn();
      return { error: postRecoveryError as Error | null };
    };

    try {
      const { error } = await attemptSignIn();

      // IMPORTANT: Supabase may return network failures as `error` without throwing
      if (error && isNetworkFetchError(error)) {
        return await retryWithRecovery();
      }

      return { error: error as Error | null };
    } catch (error) {
      if (isNetworkFetchError(error)) {
        try {
          return await retryWithRecovery();
        } catch (finalError) {
          console.error("Sign-in failed after recovery:", finalError);
          return { error: finalError as Error };
        }
      }

      console.error("Unexpected sign-in error:", error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      console.error("Unexpected sign-up error:", error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setGymId(null);
  };

  const value = {
    user,
    session,
    loading,
    role,
    gymId,
    signIn,
    signUp,
    signOut,
    isSuperAdmin: role === "super_admin",
    isGymOwner: role === "gym_owner",
    isStaff: role === "staff",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

