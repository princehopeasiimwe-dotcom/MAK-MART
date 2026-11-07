import { useEffect, useState } from "react";
import SettingsService from "../services/settingsService";

// Reads a "how many may one account have" setting. 0 means no limit.
// While loading (or if the setting can't be read) nothing is blocked in the UI;
// the database enforces the real limit either way.
export default function usePlatformLimit(key, fallback) {
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    SettingsService.getSetting(key)
      .then((value) => {
        const n = parseInt(value, 10);
        setLimit(Number.isFinite(n) && n > 0 ? n : value === "" ? fallback : 0);
      })
      .catch(() => setLimit(0));
  }, [key, fallback]);

  return limit;
}
