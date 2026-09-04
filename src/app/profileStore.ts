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
