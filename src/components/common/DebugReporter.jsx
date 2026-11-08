import { useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import { installDebugReporter } from "../../lib/debugLog";

// Renders nothing. Hooks the browser's error events once someone is signed in.
function DebugReporter() {
  const { user } = useAuth();

  useEffect(() => {
    installDebugReporter(user?.id || null);
  }, [user?.id]);

  return null;
}

export default DebugReporter;
