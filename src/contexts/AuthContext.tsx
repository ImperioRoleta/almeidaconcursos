/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isTeacher: boolean;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, isAdmin: false, isTeacher: false, profile: null, loading: true, signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async (userId: string) => {
      try {
        const [rolesRes, profileRes, subRes] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("profiles").select("*, levels(*)").eq("user_id", userId).maybeSingle(),
          supabase.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
        ]);

        if (!isMounted) return;

        if (subRes.data?.status === "blocked") {
          console.warn("User is blocked. Signing out.");
          await supabase.auth.signOut();
          return;
        }

        const roles = rolesRes.data?.map((r: any) => r.role) || [];
        setIsAdmin(roles.includes("admin"));
        setIsTeacher(roles.includes("teacher"));

        if (profileRes.data) {
          setProfile(profileRes.data);
        } else if (profileRes.error) {
          console.error("Error fetching profile:", profileRes.error.message);
        } else {
          console.warn("No profile found for user:", userId);
          // If no profile exists, create a basic one using metadata name if available
          const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

          const { data: newProfile } = await supabase.from("profiles").insert({
            user_id: userId,
            name: displayName
          }).select("*, levels(*)").maybeSingle();

          if (newProfile) setProfile(newProfile);
        }
      } catch (err) {
        console.error("Critical auth data fetch error:", err);
      }
    };

    // Set up listener FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid deadlocks with Supabase internals
          setTimeout(() => {
            if (isMounted) fetchUserData(newSession.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsTeacher(false);
          setProfile(null);
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        }
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isTeacher, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
