import { isSafeInternalPath } from "./notificationLinks";

// Remembers the page a shopper was on when we asked them to sign up,
// so after signing up (or confirming their email in another tab and
// logging in) they land back on that page.
const KEY = "mm_return_to";

export function rememberReturnTo(path) {
  if (!isSafeInternalPath(path)) return;
  try {
    localStorage.setItem(KEY, path);
  } catch {
    /* storage blocked: the router state still carries it */
  }
}

export function takeReturnTo(preferred) {
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const choice = isSafeInternalPath(preferred) ? preferred : stored;
  return isSafeInternalPath(choice) ? choice : null;
}