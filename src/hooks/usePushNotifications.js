import { useCallback, useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  isInstalledApp,
  isIos,
  isPushSupported,
  isSubscribedForUser,
  pushConfigured,
} from "../lib/push";

// status: "hidden" | "needs-install" | "blocked" | "off" | "on"
function usePushNotifications(userId) {
  const [status, setStatus] = useState("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!userId || !pushConfigured) {
      setStatus("hidden");
      return;
    }

    // iPhones only allow notifications for apps added to the Home Screen.
    if (isIos() && !isInstalledApp()) {
      setStatus("needs-install");
      return;
    }

    if (!isPushSupported()) {
      setStatus("hidden");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }

    try {
      setStatus((await isSubscribedForUser()) ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const enable = async () => {
    setBusy(true);
    setError("");

    try {
      await enablePush();
      setStatus("on");
    } catch (err) {
      setError(err.message || "Could not turn on phone alerts.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError("");

    try {
      await disablePush();
      setStatus("off");
    } catch (err) {
      setError(err.message || "Could not turn off phone alerts.");
    } finally {
      setBusy(false);
    }
  };

  return { status, busy, error, enable, disable };
}

export default usePushNotifications;