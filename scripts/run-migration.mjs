// Runs every supabase/migrations/*.sql file (in filename order) against
// SUPABASE_DB_URL, skipping ones already recorded in public._migrations.
// Usage: npm run migrate
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

// Load .env.local without adding a dependency — just parse KEY=VALUE lines.
function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
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

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl || dbUrl.includes("[YOUR-PASSWORD]")) {
  console.error("SUPABASE_DB_URL is missing or still has the [YOUR-PASSWORD] placeholder in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  // Bootstrap the tracking table itself if this is a totally fresh DB
  // (0001_schema.sql also creates it, but this guards a re-run before 0001 exists).
  await client.query(`create table if not exists public._migrations (
    filename text primary key, applied_at timestamptz not null default now()
  )`);

  const applied = new Set(
    (await client.query("select filename from public._migrations")).rows.map(r => r.filename),
  );

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`apply ${file} ...`);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public._migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`  ok`);
    } catch (err) {
      await client.query("rollback");
      console.error(`  FAILED: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
