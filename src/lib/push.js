import { supabase } from "./supabase";

// Public key for phone notifications (safe to expose). Without it the
// "Turn on phone alerts" option simply stays hidden.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export const pushConfigured = Boolean(VAPID_PUBLIC_KEY);

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIos() {
  if (typeof navigator === "undefined") return false;

  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isInstalledApp() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

async function getRegistration() {
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);

  if (!registration) {
    throw new Error(
      "The app isn't ready for notifications yet. Reload the page and try again."
    );
  }

  return registration;
}

async function getExistingSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();

  return registration ? registration.pushManager.getSubscription() : null;
}

// Is THIS phone/browser subscribed for the signed-in account?
export async function isSubscribedForUser() {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  const subscription = await getExistingSubscription();
  if (!subscription) return false;

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function enablePush() {
  if (!pushConfigured) {
    throw new Error("Phone notifications are not set up yet.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      "Notifications are blocked. Allow them for MAK MART in your phone or browser settings."
    );
  }

  const registration = await getRegistration();

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();

  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth_key: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });

  if (error) throw error;

  return true;
}

export async function disablePush() {
  if (!isPushSupported()) return;

  const subscription = await getExistingSubscription();
  if (!subscription) return;

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", subscription.endpoint);

  await subscription.unsubscribe();
}