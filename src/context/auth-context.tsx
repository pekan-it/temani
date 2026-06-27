import { supabase } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { Session } from "@supabase/supabase-js";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("[Temani] Loading profile for user", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[Temani] Failed to load profile:", error.message);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    } catch (error) {
      console.error("[Temani] Unexpected profile loading error:", error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async () => {
      try {
        console.log("[Temani] Initial auth session check");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        if (session?.user?.id) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error("[Temani] Failed to initialize auth session:", error);
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    applySession();

    // Listen perubahan auth. Set loading=true selama profil diambil agar
    // RootRedirect tidak menavigasi di tengah window "session ada, profil
    // belum kebaca" (mis. tepat setelah login) — kalau tidak, login bisa salah
    // dianggap sebagai session tanpa profil dan dilempar balik ke login.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      console.log("[Temani] Auth state changed", _event);
      setSession(session);
      if (session?.user?.id) {
        setLoading(true);
        await fetchProfile(session.user.id);
        if (mounted) {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
