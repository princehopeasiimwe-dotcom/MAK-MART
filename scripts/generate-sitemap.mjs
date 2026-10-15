// Runs automatically before "npm run build" (see "prebuild" in package.json).
// Writes public/sitemap.xml and public/robots.txt.
//  - Static pages are always included.
//  - Products, vendors, services, providers and events are added from
//    Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY are set.
//    Row-level security means only public, approved items are returned.
// It never fails the build: on any problem it falls back to static pages.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Minimal .env reader for local builds (hosting dashboards set real env vars).
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SITE_URL = (
  process.env.VITE_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  "https://mak-mart-vcy2.vercel.app"
).replace(/\/+$/, "");

const SB_URL = (process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const SB_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const staticPaths = [
  ["/", "daily", "1.0"],
  ["/marketplace/products", "daily", "0.9"],
  ["/marketplace/vendors", "weekly", "0.7"],
  ["/services", "weekly", "0.8"],
  ["/marketplace/events", "weekly", "0.7"],
  ["/signup", "monthly", "0.4"],
  ["/vendor/signup", "monthly", "0.5"],
  ["/provider/signup", "monthly", "0.5"],
];

const tables = [
  ["products", "/marketplace/products/", "0.8"],
  ["vendors", "/marketplace/vendors/", "0.6"],
  ["services", "/services/", "0.7"],
  ["service_providers", "/providers/", "0.5"],
  ["events", "/marketplace/events/", "0.6"],
];

async function fetchRows(table, columns) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?select=${columns}&limit=1000`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

// Some tables have no updated_at column, so fall back to just the id.
async function fetchIds(table) {
  try {
    return await fetchRows(table, "id,updated_at");
  } catch {
    return fetchRows(table, "id");
  }
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const entries = staticPaths.map(([p, freq, prio]) => ({ loc: SITE_URL + p, freq, prio }));

if (SB_URL && SB_KEY) {
  for (const [table, prefix, prio] of tables) {
    try {
      const rows = await fetchIds(table);
      for (const r of rows) {
        entries.push({
          loc: SITE_URL + prefix + r.id,
          lastmod: r.updated_at ? String(r.updated_at).slice(0, 10) : undefined,
          freq: "weekly",
          prio,
        });
      }
      console.log(`sitemap: +${rows.length} from ${table}`);
    } catch (err) {
      console.warn(`sitemap: skipped ${table} (${err.message})`);
    }
  }
} else {
  console.warn("sitemap: Supabase env vars not set, writing static pages only.");
}

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map(
      (e) =>
        `  <url>\n    <loc>${esc(e.loc)}</loc>\n` +
        (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
        `    <changefreq>${e.freq}</changefreq>\n    <priority>${e.prio}</priority>\n  </url>`
    )
    .join("\n") +
  `\n</urlset>\n`;

const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /vendor/
Disallow: /provider/
Allow: /vendor/signup
Allow: /provider/signup
Disallow: /login
Disallow: /account
Disallow: /cart
Disallow: /update-password
Disallow: /reset-password

Sitemap: ${SITE_URL}/sitemap.xml
`;

writeFileSync("public/sitemap.xml", xml);
writeFileSync("public/robots.txt", robots);
console.log(`sitemap: wrote ${entries.length} URLs for ${SITE_URL}`);