import { useCallback, useEffect, useState } from "react";

const KEY = "mak-mart-wishlist";
const EVENT = "mak-mart-wishlist-changed";

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// A simple saved-items list kept in this browser (no login needed).
function useWishlist() {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];

    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode): ignore, the heart just won't persist.
    }

    setIds(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const has = useCallback((id) => ids.includes(id), [ids]);

  return { ids, has, toggle };
}

export default useWishlist;