# Phraortes — AI study assistant

Phraortes solves math, physics and chemistry step by step, then builds **interactive graphs, 3D molecules, circuits, simulations and a virtual chemistry lab** right inside the answer. It also runs Python, researches with sources, plans multi-step missions and quizzes you on a schedule. It runs in the browser, installs like an app, and keeps your chats on your own device.

**Live app:** https://novamind-official.github.io/
**Landing site:** https://novamind-official.github.io/Phraortes/
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
| `periodic` / `molecule` / `balance` | 118 elements, rotatable 3D molecules, equation balancer |
| `stats` / `probability` / `optics` | Statistics, Monte Carlo and dice, lenses and mirrors |
| `quiz` / `flashcards` | Practice questions and flip cards |
| `playground` | Sandboxed HTML/CSS/JS editor with preview and console |
| `lab` **new** | Virtual chemistry lab: foam volcano, Mg + acid, elephant toothpaste, titration, alkali metal. Add reagents and watch it react, then "Explain it" |
| `ask` **new** | Questions the AI asks you: choice, multi, number, open, scale. Used for clarifying, practice and discussion |
| `exam` **new** | Timed mini exam with scoring and a report |
| `sketch` **new** | Draw an answer on a canvas and send it back |
| `plan` **new** | Mission board: a goal broken into steps the AI works through one by one or all at once |
| `act` **new** | Phone actions: calendar event (.ics with alarm), iOS Shortcut, mail, SMS, call, map, share |
| `board` **new** | Research board: claims linked to sources with credibility and evidence level |
| `deck` **new** | Spaced-repetition cards (Leitner boxes, Again / Hard / Good / Easy) that schedule your next review |
| `map` **new** | Knowledge map of a topic; mark nodes known or unsure and ask to go deeper |
| Python computer | Runs real Python in the browser (Pyodide) with files and self-fixing errors |

### Study tools
- **Photo Solve** — photograph a problem, get it read and solved. Up to 4 images per message.
- **Files and PDFs** — upload a PDF; scanned PDFs have their first pages attached as images.
- **Deep research** — many sources read, claims checked, ending in a research board.
- **Life memory and reminders** — remembers what you ask it to and reminds you (see limits below).
- **Exam Mode** and a global "Quiz me" strip under explanations.
- **Math and chemistry typesetting** — KaTeX with mhchem (`\ce{...}`).
- **Look-ups** — web search, read a page, weather, crypto price, calculator.

### Plans and cores
- Free plan: limited messages per period, Prime core
- Cores: Prime (fast, free) · Intellect · Apex · Sovereign
- Paid plans, larger uploads and the Aura voice assistant (top plan). Payment is USDT on BEP-20.

### Privacy
Chats are stored in your browser, not on our servers. Code you run stays in a sandbox.

### Known limits
- Reminders fire only while the app is open, or as notifications for the installed (home-screen) app on iOS.
- The Python computer loads Pyodide from a CDN. If that CDN is blocked on your network, it will not start.
- The lab uses a simplified chemical model, good for understanding, not for lab safety decisions.

---

## Project files

All app files live in the **same folder** (GitHub web upload on iPhone cannot create folders). `phraortes.html` is uploaded as `index.html`.

| File | Purpose |
|---|---|
| `phraortes.html` | The whole app (UI, chat, tools, Photo Solve, Exam Mode) |
| `artifacts.js` | Core interactive blocks (graph, sim, circuit, molecule, …) |
| `pylab.js` | Python computer |
| `coach.js` | `ask`, `exam`, `sketch` and the "Quiz me" strip |
| `agent.js` | `plan` and `act` |
| `lab.js` | Virtual chemistry lab |
| `docs.js` | PDF and image handling |
| `research.js` | Research board |
| `learn.js` | `deck` and `map` |
| `security.js` | Markdown + math rendering and sanitising |
| `payment.js` | Plans / licence |
| `sw.js` | Offline cache. **Bump `VERSION` on every release** and list new files in `SHELL` |
| `katex.min.js` / `katex.min.css` / `mhchem.min.js` | Math and chemistry typesetting |
| `marked.umd.js` / `purify.min.js` | Markdown parser and HTML sanitiser |

### Releasing an update
1. Upload the changed files (replace the old ones).
2. Make sure `sw.js` has a new `VERSION` (current: `phraortes-v2-58`) and that every new file is in `SHELL`.
3. Open the site, close it fully and reopen it so the new version loads.

## Backend
A Cloudflare Worker (`phraortes-api`) sits between the app and the model provider (OpenRouter). Settings that matter:
- `FREE_MSG_LIMIT` and `FREE_RESET_SECONDS` — free-plan quota (per IP, fixed window)
- Allowed origins — **add any new domain here before switching to it**

## Landing site
A separate static English site in `/Phraortes/`: home (a 3D ring of tools you can turn), features, tools, how it works, compare, pricing (four 3D plan medals), learn (a knowledge map that fills in as you scroll), changelog and lesson pages. Files are flat, next to `index.html`.

| Page files | Notes |
|---|---|
| `index.html`, `hero3d.js`, `hero3d.css` | Home and the WebGL hero. No library, falls back to a static view without WebGL or with reduced motion |
| `pricing.html`, `pricing3d.js`, `pricing3d.css` | Pricing |
| `learn.html`, `learnmap.js`, `learnmap.css` | Learn |
| `ap-shell.css`, `ap.css`, `ap-nav.js`, `ap.js` | Shared nav, footer and styles |

Some live demos load `artifacts.js` from the app, so **upload the app files first, then the site files**.

## Moving to a custom domain (plan)
1. Buy the domain, add it to the Worker's allowed origins.
2. Add the migration banner and chat/licence transfer (browser storage is tied to the old address).
3. Keep the old GitHub address alive for several months with a redirect page.
4. Update canonical URLs and `sitemap.xml`, and tell people in-app, on the landing site, Reddit and Telegram.

## Status
Indexed on Google. Marketing in progress: Reddit, Instagram, short promo video.
