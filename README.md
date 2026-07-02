# Snip — Backend

Tiny URL shortener API. Single-file Bun server, zero npm dependencies, in-memory store.

## Requirements

- [Bun](https://bun.sh) ≥ 1.0

## Start

```sh
bun run start
# or directly:
bun run server.js
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | see below | Origin used in `shortUrl` values |
| `RAILWAY_PUBLIC_DOMAIN` | — | Auto-set by Railway; used as `BASE_URL` when `BASE_URL` is not set |
| `PUBLIC_DIR` | — | When set, serve static files from this directory (`/` → `index.html`); a matching file takes precedence over a short code |

`BASE_URL` resolution order:
1. `BASE_URL` env var
2. `https://$RAILWAY_PUBLIC_DOMAIN` if that var is present
3. `http://localhost:$PORT`

## API

### Create a short link

```
POST /api/links
Content-Type: application/json

{ "url": "https://example.com/some/long/path" }
```

**201 Created**
```json
{
  "code": "aB3xYz",
  "url": "https://example.com/some/long/path",
  "shortUrl": "https://snip.example.com/aB3xYz",
  "hits": 0,
  "createdAt": "2026-07-02T12:00:00.000Z"
}
```

Returns **400** on invalid JSON or a non-`http(s)` URL.

### List all links

```
GET /api/links
```

**200 OK** — array of link objects (same shape as above).

### Follow a short link

```
GET /:code
```

**302** redirect to the original URL (hit counter incremented).  
**404** if the code is unknown.

---

All endpoints emit open CORS headers and respond to `OPTIONS` preflight requests.
