// The app's own logger. It NEVER makes a network request.
//
//  development : prints to the browser console as usual.
//  production  : prints nothing (the build also strips console.* entirely, see
//                vite.config.js). The last few messages are kept in memory in
//                this browser tab only, so you can still look at them yourself.
//
// Use logger.error("...") instead of console.error("...") in new code.

const IS_DEV = import.meta.env.DEV;
const MAX_KEPT = 100;
const kept = [];

function keep(level, args) {
  kept.push({
    level,
    at: new Date().toISOString(),
    text: args
      .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : safe(a)))
      .join(" ")
      .slice(0, 500),
  });
  if (kept.length > MAX_KEPT) kept.shift();
}

function safe(value) {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function make(level) {
  return (...args) => {
    keep(level, args);
    if (IS_DEV) console[level === "debug" ? "log" : level](...args);
  };
}

export const logger = {
  debug: make("debug"),
  info: make("info"),
  warn: make("warn"),
  error: make("error"),
  // the messages kept in this tab (newest last). Never leaves the browser.
  recent: () => kept.slice(),
};

// Keeps uncaught errors in the same in-memory list. Local only: no network.
export function installLocalErrorCapture() {
  if (typeof window === "undefined" || window.__makmartLocalCapture) return;
  window.__makmartLocalCapture = true;

  window.addEventListener("error", (e) => keep("error", [e.message || "Script error"]));
  window.addEventListener("unhandledrejection", (e) =>
    keep("error", [e.reason?.message || String(e.reason || "Unhandled promise rejection")])
  );
}
