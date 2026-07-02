# Snip — URL Shortener

Tiny URL shortener: one Bun API server, one Angular web app, one Node CLI.
Each layer lives on its own **orphan branch** in this repo and is mounted as a
**git submodule** here on `main`.

| Layer | Submodule | Branch | Stack |
|-------|-----------|--------|-------|
| API server | `backend/` | `backend` | Bun · single-file · in-memory store · zero npm deps |
| Web app | `frontend/` | `frontend` | Angular 19 · standalone components · signals |
| CLI | `cli/` | `cli` | Node ≥ 18 · CommonJS · zero npm deps |

---

## Architecture

The backend exposes a small REST API. Both clients — the Angular app running in a
browser and the Node CLI running in a terminal — speak to the same API and share
nothing else. Each client can be swapped, replaced, or deployed independently.

```
browser  ──  Angular 19  ──┐
                            ├──  POST/GET  http://localhost:3000/api/links
terminal ──  Node CLI    ──┘
                                  GET  http://localhost:3000/:code  (302 redirect)
```

---

## API contract

| Method | Path | Request body | Success | Error |
|--------|------|-------------|---------|-------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` | `400 { error }` — invalid JSON or non-http(s) URL |
| `GET` | `/api/links` | — | `200 [ …link objects ]` | — |
| `GET` | `/:code` | — | `302 Location: <originalUrl>` · increments `hits` | `404 { error }` — unknown code |
| `OPTIONS` | `*` | — | `204` · CORS preflight headers | — |

Codes are 6 random base-62 characters (`[A-Za-z0-9]`).
`shortUrl` is `$BASE_URL/<code>` where `BASE_URL` defaults to `http://localhost:$PORT`.

All responses include open CORS headers (`Access-Control-Allow-Origin: *`).

---

## Repository layout

```
snip-demo/                ← superproject  (branch: main)
├── .gitmodules
├── README.md
├── backend/              ← submodule → branch: backend
│   ├── server.js         single-file Bun server (zero deps)
│   ├── package.json      name: snip-backend  start: bun run server.js
│   └── README.md
├── frontend/             ← submodule → branch: frontend
│   ├── angular.json
│   ├── design.md         design-token reference
│   └── src/app/
│       ├── app.component.{ts,html,css}
│       ├── app.config.ts
│       └── link.service.ts
└── cli/                  ← submodule → branch: cli
    ├── cli.js            Node CommonJS CLI (zero deps)
    ├── package.json      name: snip-cli  bin: snip → cli.js
    ├── snip              sh wrapper
    ├── snip.cmd          cmd.exe wrapper
    └── snip.ps1          PowerShell wrapper
```

---

## Getting started

### 1 — Clone with submodules

```sh
git clone --recurse-submodules https://github.com/Zentilt/ai-sdlc-snip-demo.git
cd ai-sdlc-snip-demo
```

> **Plain `git clone` leaves `backend/`, `frontend/`, and `cli/` empty.**
> Recover an existing clone with:
> ```sh
> git submodule update --init --recursive
> ```

### 2 — Start the backend

Requires [Bun](https://bun.sh) ≥ 1.0.

```sh
cd backend
bun run start
# Snip listening on port 3000  —  http://localhost:3000
```

| Env var | Default | Description |
|---------|---------|-------------|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | `http://localhost:PORT` | Origin used in `shortUrl` values |
| `RAILWAY_PUBLIC_DOMAIN` | — | Fallback for `BASE_URL` on Railway |
| `PUBLIC_DIR` | — | Serve static files from this directory |

### 3 — Open the web app

Requires Node ≥ 18.

```sh
cd frontend
npm install
npx ng serve         # → http://localhost:4200
```

Start the backend first; the Angular app calls `http://localhost:3000` directly.

Build for production:

```sh
npx ng build         # output: dist/snip-frontend/browser/
```

### 4 — Use the CLI

Requires Node ≥ 18.

```sh
cd cli
node cli.js add https://example.com/some/long/path
# https://localhost:3000/aB3xYz

node cli.js ls
# CODE    HITS  URL
# ------  ----  ---
# aB3xYz     1  https://example.com/some/long/path

node cli.js open aB3xYz
# Opening https://example.com/some/long/path
```

Install globally:

```sh
npm install -g .     # then use: snip add / snip ls / snip open
chmod +x snip        # (macOS / Linux only, first time)
```

Set `SNIP_API=https://your-host` to point at a remote backend.

---

## Submodule update workflow

Each submodule directory is a normal git repo on its own branch. Work inside it as
usual, then bump the superproject's commit pointer.

### Push a change in a layer

```sh
cd backend           # enter the submodule
# …make edits…
git add server.js
git commit -m "fix: handle empty request body"
git push             # pushes to origin/backend
cd ..
```

### Update the superproject pointer

```sh
# Fast-forward one submodule to the HEAD of its tracking branch:
git submodule update --remote backend
git add backend
git commit -m "chore: bump backend pointer"
git push

# Or update all submodules at once:
git submodule update --remote
git add .
git commit -m "chore: bump all submodule pointers"
git push
```

> `git submodule update --remote` fetches the remote and moves the recorded commit
> to the branch's current HEAD. Without `--remote`, `git submodule update` checks
> out the commit already recorded in the superproject (useful for reproducible builds).
