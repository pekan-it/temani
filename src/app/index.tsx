import { Redirect } from "expo-router";

import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/context/auth-context";

/**
 * Root entry gate. This is the first screen Expo Router opens at "/", so it must
 * never render real content — it only decides where to send the user:
 *   - still resolving the session  → loading spinner
 *   - no session / no profile      → login
 *   - signed in with a profile     → dashboard
 *
 * `RootRedirect` in _layout.tsx also guards against deep links into protected
 * routes; this gate handles the cold-start "/" case explicitly.
 */
export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)/dashboard" />;
}
