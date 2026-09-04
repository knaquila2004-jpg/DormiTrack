// One-time seed: creates the official Housing Director / Admin account as a
// real Supabase Auth user (never done from the frontend — uses the
// service-role key, which only ever runs from this local script).
// Usage: node scripts/bootstrap-admin.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const text = readFileSync(path.join(root, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exit(1);
}

const ADMIN_EMAIL = "knaquila2004@gmail.com";
const ADMIN_PASSWORD = "123456";

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  let userId;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: "admin",
      first_name: "Housing",
      last_name: "Director",
    },
  });

  if (createErr) {
    if (!/already.*registered/i.test(createErr.message)) {
      console.error("createUser failed:", createErr.message);
      process.exit(1);
    }
    console.log(`Auth user for ${ADMIN_EMAIL} already exists — looking it up.`);
    const { data: existing, error: lookupErr } = await admin
      .from("users")
      .select("id")
      .eq("email", ADMIN_EMAIL)
      .maybeSingle();
    if (lookupErr || !existing) {
      console.error("Could not resolve existing admin user id:", lookupErr?.message ?? "no row in public.users");
      process.exit(1);
    }
    userId = existing.id;
  } else {
    userId = created.user.id;
    console.log(`Created auth user ${ADMIN_EMAIL} (${userId}).`);
  }

  // handle_new_user() trigger inserts public.users automatically on create;
  // the admins role-row still needs a separate insert (same pattern every
  // signup wizard will follow for its own role table).
  const { error: profileErr } = await admin
    .from("admins")
    .upsert({ user_id: userId }, { onConflict: "user_id" });
  if (profileErr) {
    console.error("admins upsert failed:", profileErr.message);
    process.exit(1);
  }

  const { data: userRow, error: userRowErr } = await admin
    .from("users")
    .select("id, role, email, first_name, last_name")
    .eq("id", userId)
    .single();
  if (userRowErr) {
    console.error("Could not verify public.users row:", userRowErr.message);
    process.exit(1);
  }

  console.log("Admin account ready:");
  console.log(userRow);
  console.log(`\nLogin with username "admin" / password "${ADMIN_PASSWORD}" (maps to ${ADMIN_EMAIL}).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
