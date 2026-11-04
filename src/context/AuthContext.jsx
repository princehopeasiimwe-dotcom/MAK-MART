import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

  // Which user the profile/vendor/provider state currently belongs to,
  // and a counter so a slow, older load can never overwrite a newer one.
  const loadedUserIdRef = useRef(null);
  const loadSeqRef = useRef(0);

  const clearProfile = () => {
    loadedUserIdRef.current = null;
    setProfile(null);
    setVendor(null);
    setServiceProvider(null);
    setIsAdmin(false);
  };

  const loadProfile = useCallback(async (userId) => {
    const seq = ++loadSeqRef.current;

    if (!userId) {
      clearProfile();
      return;
    }

    try {
      // Look up everything this account owns in parallel. Vendor and provider
      // rows are checked for EVERY user, not only when profile.role says so:
      // one account can be a shopper, a vendor and a service provider at once,
      // and the single "role" label can't describe that (or drifts out of sync).
      const [profileRes, adminRes, vendorRes, providerRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("admins").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("vendors").select("*").eq("owner_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("service_providers").select("*").eq("owner_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);

      if (seq !== loadSeqRef.current) return; // a newer load took over

      setProfile(profileRes.data || null);
      setIsAdmin(Boolean(adminRes.data));
      setVendor(vendorRes.data || null);
      setServiceProvider(providerRes.data || null);
      loadedUserIdRef.current = userId;
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      console.error("Could not load account details", err);
    }
  }, []);

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
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);

      const nextUserId = currentSession?.user?.id || null;

      if (!nextUserId) {
        loadSeqRef.current++;
        clearProfile();
        setLoading(false);
        return;
      }

      // Same person, just a token refresh: nothing to reload.
      if (loadedUserIdRef.current === nextUserId) {
        setLoading(false);
        return;
      }

      // A different person just signed in. Hold the "loading" state until
      // their profile, vendor and provider rows are in. Without this the
      // route guard briefly saw "signed in but no role yet" and bounced
      // vendors and providers to the home page straight after login.
      setLoading(true);

      // Never await Supabase calls inside this callback (it can deadlock the
      // auth client), so the load is deferred to the next tick.
      setTimeout(async () => {
        await loadProfile(nextUserId);
        if (mounted) setLoading(false);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = {
    user,
    session,
    profile,
    vendor,
    serviceProvider,
    loading,

    isAuthenticated: Boolean(user),

    // Based on what the account actually owns, with the role label as a fallback.
    isVendor: Boolean(vendor) || profile?.role === "vendor",
    isServiceProvider: Boolean(serviceProvider) || profile?.role === "service_provider",
    isAdmin,

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
      clearProfile();
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