// Real profile-photo upload for the signed-in user, shared across all 4 role
// profile screens (Admin/Student/Parent/Landlord). Reuses the existing public
// "boarding-house-media" bucket — its Storage RLS only checks that the first
// path segment is the uploader's own auth uid, so it works for any role, not
// just landlords (the name is a historical artifact of when it was added).
import { supabase } from "../lib/supabase";

export async function uploadProfilePhoto(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You're not signed in." };

  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${uid}/profile/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("boarding-house-media")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("boarding-house-media").getPublicUrl(path);
  // Same path every time (re-uploading replaces the same file), so append a cache-busting
  // query param — otherwise the browser/CDN can keep showing the old cached image even
  // though the underlying file changed.
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await supabase.from("users").update({ photo_url: url }).eq("id", uid);
  if (dbError) return { ok: false, error: dbError.message };
  return { ok: true, url };
}

export async function removeProfilePhoto(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You're not signed in." };
  const { error } = await supabase.from("users").update({ photo_url: null }).eq("id", uid);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Login history (0060) ─────────────────────────────────────────────────────
// Real, persisted record of a user's own successful sign-ins — currently
// surfaced by AdminProfile.tsx's "Login History" sheet, but written here
// (role-agnostic, shared) since it's recorded for every role's real login,
// not just the admin's own. See the migration for why this only ever
// records successes, and only a real device label + real timestamp (no
// fabricated location — this app has no IP-geolocation service).

export async function recordLogin(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { error } = await supabase.from("login_history").insert({
    user_id: uid, user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) console.error("recordLogin:", error.message);
}

export type LoginHistoryEntry = { id: string; device: string; occurredAt: string };

// Coarse, honest device label parsed from the browser's own real user agent
// string — not a fabricated "iPhone 15 Pro"-style guess, just what the
// device/browser combination actually was.
function labelDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  const os = /Windows/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "browser";
  return `${browser} – ${os}`;
}

export async function getMyLoginHistory(limit = 20): Promise<LoginHistoryEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("login_history").select("id, user_agent, occurred_at")
    .eq("user_id", uid).order("occurred_at", { ascending: false }).limit(limit);
  if (error) { console.error("getMyLoginHistory:", error.message); return []; }
  return (data ?? []).map(r => ({ id: r.id, device: labelDevice(r.user_agent), occurredAt: r.occurred_at }));
}
