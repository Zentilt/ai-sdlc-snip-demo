import { join } from "path";

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000");
const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

// ── In-memory store ───────────────────────────────────────────────────────────
/** @type {Map<string, {code:string,url:string,shortUrl:string,hits:number,createdAt:string}>} */
const links = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += BASE62[Math.floor(Math.random() * 62)];
  }
  return code;
}

function uniqueCode() {
  let code;
  do { code = randomCode(); } while (links.has(code));
  return code;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Serve a static file from PUBLIC_DIR; returns null if not found.
// A leading ".." in the relative path is rejected to prevent traversal.
async function tryStatic(pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (!rel || rel.split("/").some((p) => p === "..")) return null;
  const file = Bun.file(join(PUBLIC_DIR, rel));
  return (await file.exists()) ? new Response(file, { headers: { ...CORS } }) : null;
}

// ── Server ────────────────────────────────────────────────────────────────────
Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method.toUpperCase();

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links  ─  create a short link
    if (pathname === "/api/links" && method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const raw = body?.url;
      let parsed;
      try { parsed = new URL(raw); } catch { /* fall through */ }

      if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
        return json({ error: "url must be a valid http or https URL" }, 400);
      }

      const code = uniqueCode();
      const link = {
        code,
        url: raw,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return json(link, 201);
    }

    // GET /api/links  ─  list all links
    if (pathname === "/api/links" && method === "GET") {
      return json([...links.values()]);
    }

    // Static files win over same-named short codes
    if (PUBLIC_DIR) {
      const staticRes = await tryStatic(pathname);
      if (staticRes) return staticRes;
    }

    // GET /:code  ─  redirect (exactly 6 base62 chars)
    const code = pathname.slice(1);
    if (method === "GET" && /^[A-Za-z0-9]{6}$/.test(code)) {
      const link = links.get(code);
      if (!link) return json({ error: "Not found" }, 404);
      link.hits++;
      return new Response(null, {
        status: 302,
        headers: { Location: link.url, ...CORS },
      });
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip listening on port ${PORT}  —  ${BASE_URL}`);
