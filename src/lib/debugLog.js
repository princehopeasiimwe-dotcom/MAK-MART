import { supabase } from "./supabase";

// Live debug feed that costs nothing and stores nothing.
//
// Errors from people's browsers are BROADCAST over a private Supabase Realtime
// channel. Nothing is written to a table or to Supabase's log storage, and the
// admin page (/admin/debug) shows them as they happen. Only admins are allowed
// to listen (migration 025); any signed-in user may send.
//
// Zero overhead until something actually goes wrong: the channel is only joined
// the first time an error is reported.

export const DEBUG_TOPIC = "debug-logs";

const MAX_PER_MINUTE = 10;      // flood protection
const DEDUPE_MS = 60_000;       // the same message is sent once a minute at most
const BACKOFF_MS = 5 * 60_000;  // if sending is refused, stop trying for 5 minutes

let channelReady = null;
let blockedUntil = 0;
const recent = new Map();
let sentTimes = [];
let installed = false;
let currentUserId = null;

// never ship anything that looks like a secret
const scrub = (text) =>
  String(text ?? "")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "[token]")
    .replace(/(apikey|api_key|key|token|secret|password|authorization)=([^&\s"']+)/gi, "$1=[hidden]");

function joinChannel() {
  if (!channelReady) {
    const channel = supabase.channel(DEBUG_TOPIC, { config: { private: true } });
    channelReady = new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve(channel);
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          resolve(null);
          channelReady = null;
          supabase.removeChannel(channel);
        }
      });
    });
  }
  return channelReady;
}

export async function reportLog(level, message, extra) {
  try {
    if (!currentUserId || Date.now() < blockedUntil) return;

    const text = scrub(message).slice(0, 500);
    if (!text) return;

    const key = `${level}:${text}`;
    const now = Date.now();
    if (recent.has(key) && now - recent.get(key) < DEDUPE_MS) return;
    recent.set(key, now);
    if (recent.size > 200) recent.clear();

    sentTimes = sentTimes.filter((t) => now - t < 60_000);
    if (sentTimes.length >= MAX_PER_MINUTE) return;
    sentTimes.push(now);

    const channel = await joinChannel();
    if (!channel) {
      blockedUntil = Date.now() + BACKOFF_MS;
      return;
    }

    await channel.send({
      type: "broadcast",
      event: "log",
      payload: {
        level,
        message: text,
        extra: extra ? scrub(typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 1500) : undefined,
        page: window.location.pathname,
        user: currentUserId.slice(0, 8),
        agent: navigator.userAgent.slice(0, 120),
        at: new Date().toISOString(),
      },
    });
  } catch {
    // the debug feed must never break the app
  }
}

// Starts listening for errors in this browser. Safe to call more than once.
export function installDebugReporter(userId) {
  currentUserId = userId || null;
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportLog("error", event.message || "Script error", event.filename ? `${event.filename}:${event.lineno}` : "");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportLog("error", reason?.message || String(reason || "Unhandled promise rejection"), reason?.stack?.split("\n").slice(0, 3).join(" | "));
  });

  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    reportLog(
      "error",
      args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : safeJson(a))).join(" ")
    );
  };
}

function safeJson(value) {
  try { return JSON.stringify(value); } catch { return String(value); }
}
