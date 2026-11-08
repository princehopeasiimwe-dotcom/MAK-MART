// Moves every picture that is still stored in Supabase Storage over to
// Cloudflare R2, and points the database at the new address.
//
//   node scripts/migrate-images-to-r2.mjs              DRY RUN: only lists what would move
//   node scripts/migrate-images-to-r2.mjs --apply      copy to R2 + update the database
//   node scripts/migrate-images-to-r2.mjs --rollback   put the old addresses back
//   node scripts/migrate-images-to-r2.mjs --delete-old delete the originals from Supabase
//                                                      (only ones this script already moved)
//
// Safe by design:
//  * Nothing changes unless you pass --apply.
//  * Pictures are COPIED first. The originals stay in Supabase until you run --delete-old.
//  * Every change is written to scripts/image-migration-manifest.json, so --rollback works.
//  * You can run --apply again and again; pictures already moved are skipped.
//
// Run it on YOUR computer. It needs these in the terminal (never put them in the repo):
//   SUPABASE_URL                 https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    Supabase > Project Settings > API > service_role (secret!)
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
//   R2_PUBLIC_URL                e.g. https://pub-xxxx.r2.dev  (or your custom domain)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const ROLLBACK = args.has("--rollback");
const DELETE_OLD = args.has("--delete-old");

const here = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(here, "image-migration-manifest.json");

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. See the notes at the top of this file.`);
    process.exit(1);
  }
  return v;
};

const SUPABASE_URL = need("SUPABASE_URL").replace(/\/+$/, "");
const supabase = createClient(SUPABASE_URL, need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// Every place a picture address is saved: [table, column]. Tables or columns that
// don't exist in your database are skipped automatically.
const TARGETS = [
  ["product_images", "image_url"],
  ["services", "image_url"],
  ["events", "image_url"],
  ["vendors", "logo_url"],
  ["vendors", "cover_image_url"],
  ["service_providers", "profile_image_url"],
  ["service_providers", "logo_url"],
  ["profiles", "avatar_url"],
  ["categories", "image_url"],
  ["service_categories", "image_url"],
  ["sponsors", "logo_url"],
];

const FOLDER_FOR_BUCKET = {
  "product-images": "products",
  "event-images": "events",
  "vendor-images": "vendors",
};

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
  : { moved: [] };
const save = () => fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

// ---------------------------------------------------------------- rollback
if (ROLLBACK) {
  let n = 0;
  for (const m of manifest.moved) {
    if (m.rolledBack) continue;
    const { error } = await supabase.from(m.table).update({ [m.column]: m.oldUrl }).eq("id", m.id);
    if (error) console.warn(`  could not restore ${m.table}.${m.column} ${m.id}: ${error.message}`);
    else { m.rolledBack = true; n++; }
  }
  save();
  console.log(`Restored ${n} address(es). (Copies in R2 were left alone.)`);
  process.exit(0);
}

// ------------------------------------------------------------- delete-old
if (DELETE_OLD) {
  const byBucket = new Map();
  for (const m of manifest.moved) {
    if (m.rolledBack || m.oldDeleted) continue;
    const list = byBucket.get(m.bucket) || [];
    list.push(m);
    byBucket.set(m.bucket, list);
  }
  for (const [bucket, items] of byBucket) {
    // An original can be shared by several rows; only delete it when nothing
    // in the database points at the old Supabase address any more.
    const stillUsed = new Set();
    for (const [table, column] of TARGETS) {
      const { data, error } = await supabase.from(table).select(column).like(column, `${PUBLIC_PREFIX}${bucket}/%`);
      if (!error) (data || []).forEach((r) => stillUsed.add(r[column]));
    }
    const removable = items.filter((m) => !stillUsed.has(m.oldUrl));
    const paths = [...new Set(removable.map((m) => m.objectPath))];
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) console.warn(`  delete failed in ${bucket}: ${error.message}`);
    }
    removable.forEach((m) => (m.oldDeleted = true));
    console.log(`${bucket}: removed ${paths.length} original file(s) from Supabase.`);
  }
  save();
  process.exit(0);
}

// ------------------------------------------------------------------ copy
const R2_PUBLIC_URL = need("R2_PUBLIC_URL").replace(/\/+$/, "");
const BUCKET = need("R2_BUCKET_NAME");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${need("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY") },
});

const clean = (s) => s.replace(/[^A-Za-z0-9._-]/g, "_");

function r2KeyFor(bucket, objectPath) {
  const folder = FOLDER_FOR_BUCKET[bucket] || "temp";
  const parts = objectPath.split("/").map(clean);
  // <user id>/<file>  ->  <folder>/<user id>/<file>   (same shape the app uses for new uploads)
  if (parts.length === 2) return `${folder}/${parts[0]}/${parts[1]}`;
  return `${folder}/legacy/${parts.join("_")}`;
}

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

const copied = new Map(); // old url -> new url (same picture used by several rows)
let found = 0, moved = 0, failed = 0, bytes = 0;

console.log(APPLY ? "APPLYING changes.\n" : "DRY RUN: nothing will be changed. Add --apply to do it.\n");

for (const [table, column] of TARGETS) {
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .like(column, `${PUBLIC_PREFIX}%`)
      .order("id")
      .range(from, from + 499);

    if (error) {
      // the table or column isn't in this database: skip it
      console.log(`- ${table}.${column}: skipped (${error.message})`);
      break;
    }
    if (!data.length) break;

    let okInPage = 0;
    for (const row of data) {
      const oldUrl = row[column];
      const rest = decodeURIComponent(oldUrl.slice(PUBLIC_PREFIX.length).split("?")[0]);
      const slash = rest.indexOf("/");
      const bucket = rest.slice(0, slash);
      const objectPath = rest.slice(slash + 1);
      const key = r2KeyFor(bucket, objectPath);
      const newUrl = `${R2_PUBLIC_URL}/${key}`;
      found++;

      if (!APPLY) {
        console.log(`  ${table}.${column} ${row.id}\n      ${oldUrl}\n   -> ${newUrl}`);
        continue;
      }

      try {
        if (!copied.has(oldUrl)) {
          if (!(await existsInR2(key))) {
            const res = await fetch(oldUrl);
            if (!res.ok) throw new Error(`download failed (${res.status})`);
            const body = Buffer.from(await res.arrayBuffer());
            await s3.send(new PutObjectCommand({
              Bucket: BUCKET,
              Key: key,
              Body: body,
              ContentType: res.headers.get("content-type") || "image/jpeg",
              CacheControl: "public, max-age=31536000, immutable",
            }));
            bytes += body.length;
          }
          copied.set(oldUrl, newUrl);
        }

        const { error: updateError } = await supabase.from(table).update({ [column]: newUrl }).eq("id", row.id);
        if (updateError) throw new Error(updateError.message);

        manifest.moved.push({ table, column, id: row.id, bucket, objectPath, oldUrl, newUrl });
        save();
        moved++;
        okInPage++;
        console.log(`  moved ${table}.${column} ${row.id}`);
      } catch (err) {
        failed++;
        console.warn(`  FAILED ${table}.${column} ${row.id}: ${err.message}`);
      }
    }

    // rows we just changed no longer match the filter, so stay on the first page when applying;
    // if nothing on the page could be moved, stop instead of retrying forever
    if (APPLY) {
      if (okInPage === 0) break;
      from -= 500;
    } else if (data.length < 500) break;
  }
}

console.log(`\nPictures still on Supabase: ${found}`);
if (APPLY) {
  console.log(`Moved: ${moved}   Failed: ${failed}   Copied: ${(bytes / 1048576).toFixed(1)} MB`);
  console.log("Check the site, then run with --delete-old to remove the originals from Supabase.");
}
