import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [serviceProvider, setServiceProvider] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      setVendor(null);
      setServiceProvider(null);
      setIsAdmin(false);
      return;
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setProfile(profileRow || null);

    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    setIsAdmin(Boolean(adminRow));

    if (profileRow?.role === "vendor") {
      const { data: vendorRow } = await supabase
        .from("vendors")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();

      setVendor(vendorRow || null);
    } else {
      setVendor(null);
    }

    if (profileRow?.role === "service_provider") {
      const { data: providerRow } = await supabase
        .from("service_providers")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();

      setServiceProvider(providerRow || null);
    } else {
      setServiceProvider(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setVendor(null);
          setServiceProvider(null);
          setIsAdmin(false);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    profile,
    vendor,
    serviceProvider,
    loading,

    isAuthenticated: Boolean(user),

    isVendor: profile?.role === "vendor",
    isServiceProvider: profile?.role === "service_provider",
    isAdmin,

    refreshProfile: async () => {
      if (user?.id) {
        await loadProfile(user.id);
      }
    },

    signOut: async () => {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      setSession(null);
      setProfile(null);
      setVendor(null);
      setServiceProvider(null);
      setIsAdmin(false);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext must be used inside AuthProvider"
    );
  }

  return context;
}

export default AuthContext;
