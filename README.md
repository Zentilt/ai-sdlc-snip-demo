# Snip CLI

Zero-dependency Node.js CLI for the [Snip](../backend) URL shortener.
Requires Node ≥ 18 (built-in `fetch`).

## Install

```sh
npm install -g .
```

Or run without installing:

```sh
node cli.js <command>
```

## Commands

```
snip add <url>    POST /api/links — print the returned short link
snip ls           GET  /api/links — print an aligned code / hits / URL table
snip open <code>  Follow the redirect and open the URL in your OS browser
snip help         Show this help
```

### Examples

```sh
snip add https://example.com/some/very/long/path
# https://localhost:3000/aB3xYz

snip ls
# CODE    HITS  URL
# ------  ----  ---
# aB3xYz     3  https://example.com/some/very/long/path

snip open aB3xYz
# Opening https://example.com/some/very/long/path
```

## Configuration

| Variable   | Default                 | Description          |
|------------|-------------------------|----------------------|
| `SNIP_API` | `http://localhost:3000` | Backend base URL     |

```sh
SNIP_API=https://snip.example.com snip ls
```

## Wrappers

| File        | Platform            |
|-------------|---------------------|
| `snip`      | macOS / Linux (sh)  |
| `snip.cmd`  | Windows (cmd.exe)   |
| `snip.ps1`  | Windows PowerShell  |

Make the shell wrapper executable after cloning:

```sh
chmod +x snip
```

## Error handling

All errors print to **stderr** and exit with code **1**:

- invalid / missing arguments
- unknown short code (404)
- backend unreachable (network error)
