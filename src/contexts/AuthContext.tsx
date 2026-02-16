import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, isAdmin: false, profile: null, loading: true, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [rolesRes, profileRes, subRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*, levels(*)").eq("user_id", user.id).single(),
        supabase.from("subscriptions").select("status").eq("user_id", user.id).single(),
      ]);

      // If user is blocked, sign them out immediately
      if (subRes.data?.status === "blocked") {
        await supabase.auth.signOut();
        return;
      }

      setIsAdmin(rolesRes.data?.some((r: any) => r.role === "admin") ?? false);
      setProfile(profileRes.data);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
