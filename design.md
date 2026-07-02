# Snip — Design System

Borrowed visual language from lovable.dev: dark-first, warm-glow hero, pill input as
centerpiece, generously rounded cards. Never reference lovable's branding.

---

## Color tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0a0b` | Page background |
| `--surface` | `#111115` | Card / input backgrounds |
| `--surface-hi` | `#1a1a20` | Raised surface (hover states, thead) |
| `--border` | `rgba(255,255,255,0.07)` | Subtle dividers, card outlines |
| `--border-focus` | `rgba(220,100,160,0.4)` | Focused input ring |
| `--text` | `#f0f0f3` | Primary body text |
| `--muted` | `#6e6e7e` | Secondary text, placeholders, labels |

## Accent gradient

```
--grad: linear-gradient(130deg, #ff6b6b 0%, #e0429b 55%, #ff8c42 100%)
```

Coral → rose → amber. Used on the hero headline (as gradient text fill),
the primary button background, and the focus glow.

## Background glow

```
--glow-hero: radial-gradient(ellipse 800px 500px at 50% -80px,
  rgba(224,66,155,0.16) 0%, rgba(255,107,107,0.07) 50%, transparent 70%)
```

Applied as a fixed pseudo-element behind the whole viewport so the warm light
bleeds naturally behind the hero and form. Intensity deliberately low (0.16 alpha).

## Font stack

```
'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif
```

Code values (short codes in the table) use:
```
'JetBrains Mono', 'Fira Code', ui-monospace, monospace
```

## Type scale

| Token | rem | px equiv | Usage |
|---|---|---|---|
| `--t-xs` | 0.6875 | 11 | Table headers, labels |
| `--t-sm` | 0.8125 | 13 | Body small, button text |
| `--t-base` | 0.9375 | 15 | Default body, input |
| `--t-lg` | 1.0625 | 17 | Tagline |
| `--t-hero` | 3.25 | 52 | H1 |

## Spacing scale

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 ·
`--sp-6` 24 · `--sp-8` 32 · `--sp-10` 40 · `--sp-12` 48 · `--sp-16` 64  (all px)

## Border radii

| Token | Value | Usage |
|---|---|---|
| `--r-sm` | 6px | Tiny chips |
| `--r-md` | 10px | Small surfaces |
| `--r-lg` | 14px | Notice banners |
| `--r-xl` | 20px | Links card |
| `--r-pill` | 9999px | Pill input, buttons |

## Shadows & glows

| Token | Value |
|---|---|
| `--shadow` | `0 1px 3px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.35)` |
| `--glow-btn` | `0 4px 24px rgba(224,66,155,0.45)` |

## Element mapping

| Snip element | Design treatment |
|---|---|
| **Page (`<main>`)** | Max-width 640 px, centered, `--sp-16` top padding |
| **H1 "✂ Snip"** | Hero headline, `--t-hero`, gradient text (`--grad`) |
| **Tagline `<p>`** | `--t-lg`, `--muted` color, sits below H1 |
| **URL `<form>`** | Pill container (`--r-pill`) on `--surface` with `--border`; input transparent inside; button uses `--grad` + `--glow-btn`; focus-within highlights border with `--border-focus` |
| **Error notice** | `--r-lg` banner, red-tinted bg/border (`rgba(239,68,68,…)`) |
| **Success notice** | `--r-lg` banner, green-tinted bg/border (`rgba(52,211,153,…)`), link color `#34d399` |
| **Links `<section>`** | Card: `--surface`, `--border`, `--r-xl`, `--shadow`; overflow hidden so rounded corners clip table edges |
| **Table** | No outer border; rows separated by `--border`; thead on `--surface-hi`; short-code `<a>` in `#a78bfa` monospace |
