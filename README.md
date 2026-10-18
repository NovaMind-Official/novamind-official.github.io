# Phraortes — AI study assistant

Phraortes solves math, physics and chemistry step by step, then builds **interactive graphs, 3D molecules, circuits, simulations, probability and optics labs** right inside the answer. It runs in the browser, installs like an app, and keeps your chats on your own device.

**Live app:** https://novamind-official.github.io/
**Built by:** Novamind AI

---

## What it can do

### Interactive blocks (appear inside the answer)
| Block | What you get |
|---|---|
| `solution` | Worked solution: given, find, numbered steps with typeset formulas, final answer |
| `graph` | Pan / pinch / tap plots, roots and intersections marked |
| `sim` | Projectile, pendulum, spring, wave, incline, RC circuit — live sliders |
| `circuit` | Series / parallel circuit solver with animated current |
| `periodic` | 118 elements, Bohr model, electron configuration |
| `molecule` | Rotatable 3D molecules |
| `balance` | Chemical equation balancer |
| `stats` | Mean, median, spread, histogram, box plot, regression |
| `probability` **new** | Dice, coin, Galton board, Monte Carlo π — roll thousands of trials, compare with theory |
| `optics` **new** | Lenses and mirrors, drag the object, live rays, image, magnification |
| `quiz` / `flashcards` | Practice questions and flip cards |
| `playground` | Sandboxed HTML/CSS/JS editor with preview and console (no network, cannot see chats) |

### Study tools
- **Photo Solve** — photograph a problem, get it read and solved
- **Exam Mode** — timed practice test, score, per-topic breakdown, "ask the tutor" on mistakes
- **Sources** — answers that really used web search show a small "N sources" pill; tap for the full list
- **Math & chemistry typesetting** — KaTeX with mhchem (`\ce{...}`)
- **Look-ups** — web search, read a page, weather, crypto price, calculator

### Plans and cores
- Free plan: **10 messages per 5 hours**
- Cores: Prime (fast, free) · Intellect · Apex · Sovereign
- Paid plans and the voice assistant (Aura) on the top plan

### Privacy
Chats are stored in your browser, not on our servers. Code you run stays in a sandbox with no network access.

---

## Project files

All files live in the **same folder** (GitHub web upload on iPhone cannot create folders).

| File | Purpose |
|---|---|
| `phraortes.html` | The whole app (UI, chat, tools, Photo Solve, Exam Mode) |
| `artifacts.js` | Interactive blocks (graph, sim, probability, optics, …) |
| `security.js` | Markdown + math rendering and sanitising |
| `payment.js` | Plans / licence |
| `sw.js` | Offline cache. **Bump `VERSION` on every release** and list new files in `SHELL` |
| `katex.min.js` / `katex.min.css` / `mhchem.min.js` | Math and chemistry typesetting |
| `marked.umd.js` / `purify.min.js` | Markdown parser and HTML sanitiser |

### Releasing an update
1. Upload the changed files (replace the old ones).
2. Make sure `sw.js` has a new `VERSION` (current line: `phraortes-v2-22`).
3. Open the site, close it fully and reopen it so the new version loads.

## Backend
A Cloudflare Worker (`phraortes-api`) sits between the app and the model provider. Settings that matter:
- `FREE_MSG_LIMIT = 10` and `FREE_RESET_SECONDS` — free-plan quota (per IP, fixed window)
- Allowed origins — **add any new domain here before switching to it**

## Landing site
A separate static English site (home, features, tools, how it works, pricing, learn). Its live demos load `artifacts.js` from the app, so **upload the app files first, then the site files**. Images are uploaded flat as `shot-*.jpg` next to `index.html`.
Landing URL: _(fill in once final)_

## Moving to a custom domain (plan)
1. Buy the domain, add it to the Worker's allowed origins.
2. Add the migration banner and chat/licence transfer (so users keep chats and plan — browser storage is tied to the old address).
3. Keep the old GitHub address alive for several months with a redirect page.
4. Update canonical URLs and `sitemap.xml`, and tell people in-app, on the landing site, Reddit and Telegram.

## Status
Indexed on Google. Marketing in progress: Reddit, Instagram, short promo video.
