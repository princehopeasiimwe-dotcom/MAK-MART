import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { disablePush } from "../lib/push";

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
      .select("id, full_name, phone, avatar_url, role, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    setProfile(profileRow || null);

    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    setIsAdmin(Boolean(adminRow));

    // Every signed-in account can own a store and/or a services profile,
    // whatever its role label says, so we look both records up by owner.
    const [{ data: vendorRow }, { data: providerRow }] = await Promise.all([
      supabase.from("vendors").select("*").eq("owner_id", userId).maybeSingle(),
      supabase.from("service_providers").select("*").eq("owner_id", userId).maybeSingle(),
    ]);

    setVendor(vendorRow || null);
    setServiceProvider(providerRow || null);
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

  // Where "My dashboard" goes. Everybody who is signed in has one:
  // shoppers land on the same menu a vendor sees and can open a store or
  // offer a service from there.
  const dashboardPath = isAdmin
    ? "/admin/dashboard"
    : !vendor && serviceProvider
    ? "/provider/dashboard"
    : "/vendor/dashboard";

  const value = {
    user,
    session,
    profile,
    vendor,
    serviceProvider,
    loading,

    isAuthenticated: Boolean(user),

    // "is a vendor" means owning a store (or being labelled one), so people
    // who added a store to an existing account are recognised straight away.
    isVendor: Boolean(vendor) || profile?.role === "vendor",
    isServiceProvider: Boolean(serviceProvider) || profile?.role === "service_provider",
    isAdmin,
    dashboardPath,

    refreshProfile: async () => {
      if (user?.id) {
        await loadProfile(user.id);
      }
    },

    signOut: async () => {
      // a shared phone must not keep receiving this account's alerts
      await disablePush().catch(() => {});

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