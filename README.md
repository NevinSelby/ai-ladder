# AI Ladder

A daily practice app for forward deployed engineers, solutions architects and AI engineers.

Devmaxx-shaped daily loop: one short session, spaced repetition, XP, streaks, a career ladder,
but aimed at what these roles are actually assessed on. FDE interviews and FDE work are scored on
**methodology, not recall**: the signature decomposition round has the lowest pass rate of any stage
and requires almost no code. So multiple choice is the warm-up here, not the product.

GCP-primary. AWS and Azure exist in the taxonomy as locked `coming_soon` nodes.

---

## Run it

```bash
npm install
npx expo start --go
```

Open **Expo Go** on your phone and connect to the LAN URL it prints. No Xcode required.

```bash
npm run check          # typecheck + content gate + logic tests
npm run validate:content
npm run test:logic
npm run db:generate    # regenerate Drizzle migrations after editing src/db/schema.ts
```

Supabase is optional, the app is fully playable offline from the bundled seed bank.
Copy `.env.example` to `.env.local` to enable sync and the model-graded modes.

---

## The website

The same codebase ships as a web app. Everything works: sessions, the local
database, streaks, progress, sync.

```bash
npm run build:web      # static site into ./dist
npx serve dist         # or any static server
```

**How web differs from the phone.** `expo-sqlite` cannot back the browser build:
its web path reaches SQLite through a worker with a synchronous bridge, and that
bridge times out (`Sync operation timeout` inside `openDatabaseSync`) even on a
cross-origin-isolated page with SharedArrayBuffer available. Drizzle's expo
driver is synchronous end to end, so there is no async escape hatch either.

`src/db/client.web.tsx` replaces it with **sql.js**: SQLite compiled to
WebAssembly, running on the main thread, needing no worker and no special
headers. The database lives in memory and is snapshotted to IndexedDB whenever
SQLite reports writes, so a refresh keeps your progress. The same migration
bundle runs on both platforms. `public/sql-wasm-browser.wasm` is fetched at
runtime, which is why it lives in `public/` rather than the bundle.

`app.json` sets `web.output: "single"`. Static prerendering would run every
route in Node, where IndexedDB, localStorage and wasm do not exist, and the
build fails on the first `AsyncStorage` read.

### The freshness pipeline

`pipeline/ingest.mjs` pulls vendor release feeds (GCP release notes, Vertex
release notes, AWS What's New, Azure updates) into `source_documents`, deduped
by content hash so a re-run is free. It calls no model, which is why it runs
today: only the later triage and generation stages need an Anthropic key.

It is scheduled by `.github/workflows/ingest.yml` rather than Render, because
Render cron jobs require a paid plan. Set one repository secret to enable it:
Settings, Secrets and variables, Actions, `DATABASE_URL`, holding the Supabase
direct connection string. Then run it once by hand from the Actions tab to
confirm.

Still to deploy, both blocked on an `ANTHROPIC_API_KEY`:

- `supabase/functions/generate` triage, generate, critique, publish gate
- `supabase/functions/staleness` matches published items against newer sources
  and quarantines the ones a release note has invalidated

### Deploying to Render

`render.yaml` is a complete blueprint: static site, `npm run build:web`,
publish `./dist`, SPA rewrite so a refresh on `/progress` does not 404, and a
`Content-Type: application/wasm` header so `WebAssembly.instantiate` accepts
the sql.js payload.

1. Push this repository to GitHub or GitLab.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` is detected
   automatically, so there is nothing to configure by hand.
3. Set the two build-time variables in the Render dashboard (declared with
   `sync: false`, so Render prompts for them and they never enter the repo):
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   `EXPO_PUBLIC_*` values are inlined at build time, so a deploy without them
   ships a site that cannot sync.
4. Deploy. Later pushes to the default branch redeploy automatically.

The anon key is a publishable key and is meant to be visible in client code;
row-level security is what protects the data.

---

## What's built

| | |
|---|---|
| **Daily Drill** | MCQ, multi-select, matching and ordering. Instant explanations with tappable source links. |
| **Content** | 165 items over 93 taxonomy nodes; every live node covered. |
| **Scheduling** | FSRS-4.5, scheduled per *concept* rather than per question. |
| **Progression** | Five craft meters, eight career levels, streaks, combo multiplier, session-size goals. |
| **The Board** | Four campaign accounts with health and expectations bars (read-only for now). |
| **Supabase** | Full schema + RLS written, not yet applied to a live project. |

### Five meters, gated on the weakest

Depth · Platform · AI Craft · Client · Scope.

Your level is capped by your **lowest** meter, not your total XP. You cannot grind multiple choice
to Principal Architect while never sitting in a simulated room with an angry CTO, which is the
failure mode of every other practice app, and the exact skill split the real interview loop screens
for. The Progress screen shows a "shadow level" naming what your best meter *would* have bought you.

### Not built yet

Decompose, The Room, Trade-off Arena, Napkin Math, Incident, Blueprint, Eval Lab and Discovery
Budget. Scenarios for the first three are **written and validated**; what's missing is the runner
and, for the judgment modes, the rubric grader behind them. The Practice screen shows them locked
rather than hiding them.

---

## Layout

```
shared/            Contract shared by the app and (later) the Supabase edge functions
  content.ts         zod schema per game mode, the generator's target too
  taxonomy.ts        93 concept nodes across 7 branches
  srs.ts             FSRS-4.5
  progression.ts     meters, levels, XP, combo, goals
  scoring.ts         deterministic scoring (runs on-device)
src/
  app/               expo-router screens
  content/seed/      hand-authored item bank
  data/              repositories over the local DB
  db/                Drizzle schema + migrations
  features/          per-mode UI
  theme/             design tokens
supabase/migrations/ Postgres schema + RLS
scripts/             content gate and logic tests
```

`src/db/schema.ts` is a **cache plus outbox**: content is pulled down and disposable; anything you
produce is written locally first and flushed upstream later, so a drill works in airplane mode.

## Content rules

Enforced by `npm run validate:content`, which is also the publish gate generated content will face:

- every item cites at least one taxonomy node, and the node must be `live`
- every item carries at least one source citation; ungrounded content cannot publish
- every MCQ distractor carries a `whyWrong`; an option nobody can justify teaches nothing
- multi-select items cannot have every option correct

The validator also prints which live nodes have no content yet. That list is the content
generator's first target.

## Why the freshness pipeline matters

At Cloud Next '26 Vertex AI was rebranded to the **Gemini Enterprise Agent Platform**, and Vertex
roadmap now ships through it. A hand-authored bank drifts. Verified live sources for the generator:

- GCP release notes: `https://docs.cloud.google.com/feeds/gcp-release-notes.xml`
- `bigquery-public-data.google_cloud_release_notes.release_notes`
- Cloud Billing Catalog / Pricing API, for Napkin Math answers computed against current SKU prices
