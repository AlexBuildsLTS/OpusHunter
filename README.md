<div align="center">
  <img src="assets/icon.png" width="120" alt="OpusHunter Logo" />
  <h1>OpusHunter 🎯</h1>
  <p><strong>Autonomous Job Hunting & AI Application Engine</strong></p>
  <p>
    OpusHunter is a cross-platform, automated job application engine and secure document vault built with React Native (Expo), Supabase, and Google Gemini AI. It runs seamlessly on iOS, Android, and Web, combining sleek glassmorphic UI with cutting-edge backend automation to find jobs, score them against your profile, and generate highly personalized cover letters instantly.
  </p>
</div>

---

## ✨ Features

- **🌐 Cross-Platform Excellence**: A truly adaptive UI. Desktop web users get a beautiful hovering transparent sidebar, while mobile users get an immersive, rounded floating bottom tab bar with haptic feedback.
- **🤖 Automated Job Scraping**: Define your rules (Keywords, Locations, Experience Levels) and the OpusHunter Edge Engine will continuously scour the internet for matching jobs.
- **🧠 Gemini AI Intelligence**: Scraped jobs are passed to Google Gemini 3.1 Flash, which reads the job description and your Base CV, scores the match (0-100%), and flags key skills.
- **⚡ 1-Click Cover Letters**: Generate hyper-personalized, context-aware cover letters for any job in your pipeline with a single tap using Gemini.
- **🔒 Secure Vault**: Upload your Base CV and certifications to a highly secure Supabase Storage bucket protected by Row Level Security (RLS).
- **🔑 Bring Your Own Key (BYOK)**: Supports both global admin API keys and individual user API keys for RapidAPI and Gemini.

---

## 🏗 Architecture & Tech Stack

OpusHunter is built for speed, security, and aesthetics.

- **Frontend**: React Native, Expo Router, NativeWind (Tailwind CSS v4)
- **State Management**: React Query (data fetching), Zustand (global state)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Processing**: Google Gemini API (`gemini-3.1-flash`)
- **Animations**: `react-native-reanimated`, Lucide React Native icons

---

## ⚙️ How the Engine Works

The core of OpusHunter relies on **Supabase Edge Functions** to execute jobs securely in the cloud.

### 1. The Scraping Pipeline

Users configure their "Rules" in the Configure tab. The Edge Engine uses **RapidAPI** to fetch real-time job listings from global job boards (LinkedIn, Indeed, Glassdoor). The scraper automatically deduplicates jobs and inserts them into your pipeline.

### 2. The AI Matchmaker

Once a new job enters the pipeline, the `generate-cover-letter` Edge Function pulls the user's Base CV from the Vault and the job description. Gemini evaluates the semantic overlap, scoring the job and highlighting missing skills.

### 3. Application Execution

When the user reviews a job in their Dashboard, they can tap "Generate Cover Letter". Gemini instantly writes a highly tailored response, which the user can copy or export to apply.

---

## 🔑 API Integration Guide

To run OpusHunter, you need two API keys. These can be configured globally in your Supabase project `.env` file, or users can add their own personal keys in the app (`Settings > API Keys`).

### 1. RapidAPI (Job Scraping)

OpusHunter currently uses the **JSearch API** on RapidAPI to aggregate jobs.

- **How to get it**: Register at [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QG1q/api/jsearch) and subscribe to the basic tier.
- **Extensibility & Free Alternatives**: You can easily modify the Edge Functions to use other free/cheap APIs. Great alternatives to implement include:
  - **Adzuna API** (Great free tier for UK/US jobs)
  - **Jooble API**
  - **The Muse API**
  - **Reed API**

### 2. Google Gemini (AI Intelligence)

Used for the heavy semantic processing, matching, and cover letter writing.

- **How to get it**: Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
- **Why Gemini?**: We use `gemini 3.1 flash` because of its massive context window (perfect for reading long CVs and Job Descriptions simultaneously) and blazing fast response times.

---

## 🔑 API Integration Guide

To run OpusHunter, you need two API keys. These can be configured globally in your Supabase project `.env` file, or users can add their own personal keys in the app (`Settings > API Keys`).

### 1. RapidAPI (Job Scraping)

OpusHunter currently uses the **JSearch API** on RapidAPI to aggregate jobs.

- **How to get it**: Register at [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QG1q/api/jsearch) and subscribe to the basic tier.
- **Extensibility & Free Alternatives**: You can easily modify the Edge Functions to use other free/cheap APIs. Great alternatives to implement include:
  - **Adzuna API** (Great free tier for UK/US jobs)
  - **Jooble API**
  - **The Muse API**
  - **Reed API**

### 2. Google Gemini (AI Intelligence)

Used for the heavy semantic processing, matching, and cover letter writing.

- **How to get it**: Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
- **Why Gemini?**: We use `gemini 3.1 flash` because of its massive context window (perfect for reading long CVs and Job Descriptions simultaneously) and blazing fast response times.

---

## 🛠 Future Improvements & Roadmap

OpusHunter is powerful, but there is always room to grow. Here are the planned improvements for contributors:

1. **Auto-Apply Scripts**: Implement a Puppeteer or Playwright engine inside a Docker container (or via specialized APIs) to automatically click "Easy Apply" on LinkedIn and submit the AI-generated cover letter without user intervention.
2. **Multi-CV Support**: Allow users to upload multiple base CVs (e.g., one for Frontend, one for Backend) and have the AI dynamically select the best one to use for each job.
3. **Analytics Dashboard**: Add a beautiful chart view tracking jobs scraped, applications sent, and interview conversion rates

---

# OpusHunter

### Autonomous Job-Hunting & AI Application Engine

**One-line pitch:** OpusHunter turns a single CV and a five-minute setup into a running pipeline that finds matching jobs across the web, writes a genuinely personalized cover letter for each one with Gemini, and — where the employer's ATS allows it — submits the application for real, without the person doing it by hand fifty times a day.

---

## 1. The Problem

Job hunting at volume is a numbers game with a broken interface. A candidate applying to 30–50 roles a week is, in practice, doing the same five actions over and over: find a listing, read it, decide if it fits, write a cover letter that isn't generic, and submit. Every existing "auto-apply" product either (a) fakes the last step — records that you "applied" and just opens a tab — or (b) automates against a private API it was never actually granted access to. OpusHunter is built to not do either of those things: every claim in this document about what happens automatically is backed by code that actually does it, and every place that isn't true yet is labeled as such below, not glossed over.

---

## 2. Platform

One codebase, three real targets:

| Target      | Delivery                                          |
| ----------- | ------------------------------------------------- |
| **Web**     | Static export via Expo Router, deployed on Vercel |
| **Android** | Native APK / Play Store build via EAS             |
| **iOS**     | Native IPA / App Store build via EAS              |

Layout, navigation, and interaction patterns adapt per platform at the component level (desktop gets a persistent sidebar + `Slot`-based content pane; mobile gets a floating bottom tab bar) rather than shipping three separate UIs — one design system, one codebase, platform-aware rendering.

---

## 3. Feature Set

### 3.1 Onboarding — Setup Wizard

A five-step guided flow triggered automatically the first time a person has zero automation rules, so the empty state is never a blank screen:

1. **Role & keywords** — free text + tag-style keyword entry.
2. **Location & work mode** — worldwide city search (not a fixed list — see 3.2), plus Remote / Hybrid / On-site / Any.
3. **Experience & salary** — multi-select seniority band, optional salary floor.
4. **CV & certifications** — upload directly inside the flow (same storage path Vault uses — nothing duplicated).
5. **Cover letter voice & review** — pick Formal / Direct / Enthusiastic, get a real starter draft seeded with the person's own keywords, edit inline, then activate.

Completing the wizard creates the first automation rule and lands the person on the full Configure screen, where they can add more rules — "Java Fullstack," "React/Node," "DevOps" — each running in parallel with its own keywords, location, and cover-letter voice.

### 3.2 Worldwide Location Search

Not a hardcoded city list. Every keystroke queries a real geocoding API (GeoDB Cities, proxied through a dedicated edge function) across every populated place, worldwide. A one-tap "Use my location" option requests device/browser geolocation permission and defaults the search to the person's actual nearby cities, largest-population first — works identically on web, iOS, and Android through one cross-platform location API. Declining permission never blocks anything; typed search always works.

### 3.3 Configure — The Automation Engine

Two tabs, one screen:

- **Engine** — global scraper behavior: target locations, work types, experience levels, remote preference, minimum salary, which job boards to query, and three behavior toggles (Auto-Apply, Skip Already Applied, Active Rules Only).
- **Rules** — the list of saved search rules, each independently toggleable, editable, and deletable, each carrying its own keyword set, location, work types, and base cover letter template that Gemini personalizes per job.

### 3.4 Secure Document Vault

CV and unlimited certifications, stored in Supabase Storage behind row-level security scoped to the owning user — no one else, including other authenticated users, can read another person's files at the database level, not just the UI level.

### 3.5 Gemini-Powered Cover Letters

Every application gets a cover letter generated from three real inputs: the person's actual CV text, the specific job description just scraped, and the rule's base template/voice — not a mail-merge of the same paragraph with the company name swapped in. Generation runs through a BYOK → shared pool → environment-key cascade, so the product works out of the box on a shared key and scales to bring-your-own-key without any code path changing.

### 3.6 Job Discovery

An edge function aggregates listings from multiple RapidAPI sources (JSearch's aggregation of LinkedIn/Indeed/Glassdoor, Active Jobs DB, and others) against the person's active rules, deduplicates, and scores each job against their CV before it ever reaches the pipeline.

### 3.7 Auto-Apply — Real Submission, Honestly Scoped

This is the feature most competitors fake. Here's exactly what OpusHunter does:

- For jobs hosted on **Greenhouse** or **Lever** (a large share of tech postings), a dedicated headless-browser service opens the employer's real public application page — the same form a human fills in — and submits it: name, email, phone, resume upload, and the Gemini-written cover letter. It gets back a real confirmation or a real, specific reason it couldn't (most commonly: a required custom screening question it doesn't yet know how to answer — it refuses to submit blank fields rather than send an incomplete application).
- For every other posting, the cover letter is generated and ready, and the person is hard-linked to the real apply page to finish in one click — this is labeled `manual` in the data model, not silently counted as "applied."
- Every attempt — successful, failed, or manual — is recorded with which ATS was detected, what happened, and why, so the pipeline view never lies about what actually got submitted.

**Honestly not yet covered:** Workable, Ashby, and fully custom company career-page forms. Each is real, separate engineering work, tracked explicitly rather than silently missing.

### 3.8 Gmail Integration

Google Sign-In (via Supabase Auth) optionally requests the Gmail send scope with offline access at login. If granted, the refresh token is captured and stored server-side in a table with **zero client-facing database access** — not even the owning user's own session can read it back directly; a security-definer function exposes only the connected email address for display. This is the credential the auto-apply pipeline will use for direct email-based sending as that capability comes online.

### 3.9 Admin Panel

Role-gated (`member` / `premium` / `admin`), server-verified via a `SECURITY DEFINER` Postgres function rather than a client-trusted flag — a person editing local storage cannot grant themselves admin. Covers user management and shared API-key pool administration for the BYOK cascade.

### 3.10 Cross-Platform Auth

Email/password and Google OAuth, both through Supabase Auth. Native and web use platform-appropriate flows (`expo-web-browser` session on native, full-page redirect on web) converging on the same session state.

---

## 4. Design System

A single token file (`lib/theme.ts`) is the source of truth for every color, spacing constant, and radius used across the app — no screen defines its own hex values. Visual language: a dark, glassmorphic "frosted obsidian" surface — translucent, blurred `GlassCard` panels over a slow-drifting ambient gradient background, a violet/cyan/emerald accent palette, restrained radii and shadow weight so density-heavy screens (admin, rules lists) don't read as bulky. Component-level dark mode only, by design — no light theme, consistent with the product's identity rather than a system-preference toggle.

---

## 5. Technical Architecture

**Client** — Expo SDK 56.0, Expo Router 56.2 (file-based routing, route groups for `(auth)`/`(tabs)`/`admin`), React 19.2, React Native 0.85, React Native Reanimated 4.3, NativeWind 4.2 on Tailwind CSS 3.4, TanStack Query 5 for server state, Zustand for local UI state.

**Backend** — Supabase: Postgres with row-level security on every table, Auth, Storage, and Deno-based Edge Functions for all server-side logic (scraping, cover-letter generation, auto-apply orchestration, city search, Gmail account linking). A shared `_shared/` module set (`supabaseAdmin`, `keyResolver`, `auth`, `cors`) keeps credential resolution and auth verification consistent across every function instead of each one reinventing it.

**Application Submission Service** — a standalone Node/Playwright service, deployed independently of Supabase (Deno Edge Functions cannot launch a browser), invoked over an authenticated HTTPS call from the `auto-apply` function specifically for the real Greenhouse/Lever submission path described in 3.7.

**Database migrations** — hand-written, idempotent SQL (`IF NOT EXISTS` / safe `ON CONFLICT` throughout), applied directly against the live project; `types/database.types.ts` is treated as generated output, never hand-edited.

---

## 6. Security Posture

- Row-level security enforced at the database layer on every user-owned table, not just filtered at the API layer.
- The Gmail refresh token table has no client-reachable policies at all — service-role-only, by design, not by oversight.
- Admin role is verified server-side via `SECURITY DEFINER` RPC on every privileged action, never trusted from client state.
- BYOK: a person's own Gemini/RapidAPI keys are used first when present, falling back to a shared pool and then an environment default — nobody's personal key is exposed to another user at any point in that cascade.

---

## 7. What This Is Not (Yet)

Stated plainly, on purpose:

- Not full coverage of every ATS on the market — Greenhouse and Lever today, by design, expanding incrementally.
- Not LinkedIn Easy-Apply automation — LinkedIn actively blocks this pattern of automation and building it would put a user's own account at risk; JSearch's aggregation already surfaces LinkedIn-sourced listings without that exposure.
- Not a guarantee of interviews — it is a guarantee that the mechanical, repetitive 90% of applying is handled correctly, honestly, and at volume.

## 8. Full Project Structure — Every File, What It Does

⚠ **One real conflict found while writing this, flagged rather than hidden:** this repo currently has **two parallel Configure-screen splits** (`components/configure/*`, built in one session, vs. `components/features/configure/*`, built in a different session — this document's author) and **two parallel location-autocomplete implementations** (`components/ui/LocationInput.tsx` using OpenStreetMap Nominatim, vs. `components/features/configure/LocationAutocomplete.tsx` using GeoDB Cities via RapidAPI). Neither pair was aware of the other. **Only one of each should exist.** This needs a deliberate pick-one-delete-the-other pass before either configure split ships — see §9.

```
opushunter/
├── app/                                  Expo Router — file path IS the route
│   ├── _layout.tsx                       Root Stack: mounts AmbientBackground, wires (auth)/(tabs)/admin, handles the
│   │                                      SIGNED_IN → Gmail-token-link handoff for the web OAuth redirect path
│   ├── index.tsx                         Root "/" — checks session, <Redirect> to /(auth)/login or /(tabs)/dashboard
│   ├── +not-found.tsx                    Catch-all 404 screen for unmatched routes
│   ├── (auth)/
│   │   ├── _layout.tsx                   Stack wrapper for the unauthenticated flow
│   │   └── login.tsx                     Email/password + Google OAuth (web full-redirect / native in-app browser),
│   │                                      requests Gmail send scope + offline access, hands tokens to link-gmail-account
│   ├── (tabs)/                           Authenticated app shell
│   │   ├── _layout.tsx                   Desktop: Sidebar + <Slot/> (single active screen, no stacking). Mobile:
│   │   │                                  floating bottom Tabs bar. One file, two render paths by viewport.
│   │   ├── dashboard.tsx                 Pipeline view — scraped jobs queue, swipe-to-decide, metrics
│   │   ├── vault.tsx                     CV + certifications manager
│   │   ├── configure.tsx                 Route file — renders whichever ConfigureScreen split wins §9
│   │   ├── profile.tsx                   Account info, admin-panel entry point for admin-role users
│   │   └── (settings)/                   ⚠ still the pre-rename group — see §9, causes the "/" collision
│   │       ├── _layout.tsx
│   │       ├── index.tsx                 Settings home
│   │       └── security.tsx              Password change, connected-account management
│   └── (admin)/                          ⚠ still the pre-rename group — see §9, causes the "/" collision
│       ├── _layout.tsx                   Server-verified role gate via is_admin() RPC, not a client flag
│       ├── index.tsx                     Admin dashboard
│       ├── users.tsx                     User list/role management
│       └── api-keys.tsx                  Shared BYOK-pool key administration
│
├── components/
│   ├── configure/                        ⚠ Split #1 of the Configure screen (see conflict note above)
│   │   ├── types.ts                      Shared shapes for this split, matches automation_rules post-migration
│   │   ├── RuleCard.tsx                  Rule row, now shows experience/remote/salary badges
│   │   ├── RuleFormModal.tsx             Create/edit rule modal
│   │   ├── LaunchSearchCard.tsx          Scrape-trigger hero card + per-rule key-source badges
│   │   ├── ExperienceLevelPicker.tsx     Persisted multi-select → automation_rules.experience_levels
│   │   ├── RemotePreferencePicker.tsx    Persisted single-select → automation_rules.remote_preference
│   │   └── SalaryMinPicker.tsx           Persisted numeric filter → automation_rules.salary_min
│   ├── features/configure/               ⚠ Split #2 of the Configure screen (see conflict note above)
│   │   ├── ConfigureScreen.tsx           Main screen — first-run gates to SetupWizard when rules.length === 0
│   │   ├── EngineTab.tsx                 Locations/work-types/experience/remote/salary/boards/behavior toggles
│   │   ├── RulesTab.tsx                  Rule list + RuleCard
│   │   ├── RuleFormModal.tsx             Create/edit rule modal
│   │   ├── LocationAutocomplete.tsx      Worldwide city search (GeoDB/RapidAPI) + geolocation default
│   │   ├── constants.ts                  LOCATION_PRESETS/WORK_TYPE_OPTIONS/EXPERIENCE_LEVELS — also imported by SetupWizard
│   │   ├── types.ts                      EngineConfig/AutomationRule/RuleFormState
│   │   └── styles.ts                     StyleSheet — includes the tabBar/tabScroll width-cap + top-padding fix
│   ├── onboarding/
│   │   └── SetupWizard.tsx               First-run 5-step guided setup (see §3.1), creates the first automation rule
│   ├── pipeline/
│   │   ├── SwipeableJobCard.tsx          Tap → JobDetailModal, swipe right → apply, swipe left → pass
│   │   └── JobDetailModal.tsx            Full job description + cover-letter preview before committing to apply
│   ├── layout/
│   │   ├── AdaptiveLayout.tsx            Exports `Sidebar` — the actual desktop nav, actively used by (tabs)/_layout
│   │   ├── AppHeader.tsx                 Unified screen header, pulls colors from lib/theme.ts (was hardcoded before)
│   │   └── PageContainer.tsx             Safe-area + max-width wrapper
│   ├── charts/
│   │   ├── BarChart.tsx                  Real SVG bar chart (react-native-svg, no extra dependency)
│   │   └── DonutChart.tsx                Real SVG donut chart, same library
│   └── ui/
│       ├── GlassCard.tsx                 The core design-system primitive — translucent blurred panel, tint variants
│       ├── AmbientBackground.tsx         Slow-drifting radial gradient mounted once in the root layout
│       ├── AnimatedPressable.tsx         Reanimated spring scale-down press wrapper used across buttons/chips
│       ├── LiquidNeonText.tsx            Neon-tinted text variant (cyan/purple/pink/white)
│       ├── ProfileDropdown.tsx           Header avatar menu → profile/settings/admin/sign-out
│       ├── KeywordTagInput.tsx           Tap-to-add keyword chips (replaces raw comma-separated text entry)
│       └── LocationInput.tsx             ⚠ Duplicate of features/configure/LocationAutocomplete.tsx — Nominatim-based
│
├── hooks/
│   ├── useCVVault.ts                     CV + certification upload/list/delete against Supabase Storage
│   ├── useEdgeScraper.ts                 Invokes scrape-jobs, tracks loading/success/error for the UI
│   └── useCitySearch.ts                  Debounced search-cities client + expo-location geolocation flow
│
├── store/
│   └── usePipelineStore.ts               Zustand store — job queue + pipeline metrics, pure state, zero Supabase calls
│
├── lib/
│   ├── supabase.ts                       Supabase client — AsyncStorage session persistence, web/native aware
│   ├── theme.ts                          THE single source of truth for every color/spacing/radius token (`C`)
│   ├── utils.ts                          `cn()` className joiner for NativeWind
│   └── queryClient.ts                    TanStack Query client — 5min staleTime, 2 retries, no refetch-on-focus
│
├── types/
│   ├── database.types.ts                 Generated from the live schema — READ-ONLY, never hand-edited (see §5)
│   └── app.types.ts                      Hand-written app-level types (Job, PipelineMetrics, etc.) — NOT DB-generated
│
├── supabase/
│   ├── config.toml                       Local Supabase CLI project config
│   ├── seed.sql                          Local-dev seed data
│   └── functions/
│       ├── _shared/
│       │   ├── supabaseAdmin.ts          Service-role client factory — used by every function that needs elevated access
│       │   ├── auth.ts                   verifyUser() — JWT verification shared by every function
│       │   ├── cors.ts                   getCorsHeaders() — one CORS policy, not five copies of it
│       │   └── keyResolver.ts            The BYOK → shared-pool → env cascade every AI/RapidAPI call goes through
│       ├── scrape-jobs/index.ts          Queries RapidAPI job sources against active rules, dedupes, inserts to job_vault
│       ├── generate-cover-letter/index.ts Gemini-personalized cover letter from CV text + job description
│       ├── auto-apply/index.ts           Orchestrates: generate letter → detect Greenhouse/Lever → call apply-service
│       │                                  for real submission, or return apply_url for manual completion
│       ├── link-gmail-account/index.ts   Persists the Gmail refresh token server-side, service-role-only table
│       └── search-cities/index.ts        Worldwide city autocomplete + nearby-by-coordinates, proxies GeoDB/RapidAPI
│
├── apply-service/                        Standalone Node/Playwright service — NOT deployed with Supabase
│   ├── src/server.ts                     POST /apply — auth'd via shared secret, dispatches to the matching filler
│   ├── src/types.ts                      ApplyRequest/ApplyOutcome/Candidate shapes
│   └── src/fillers/
│       ├── greenhouse.ts                 Fills + submits the real public Greenhouse hosted job form
│       └── lever.ts                      Fills + submits the real public Lever hosted job form
│
├── app.json                              Expo app config — bundle IDs, plugins, web output mode
├── package.json                          Dependencies — see §5 for exact pinned versions
├── tsconfig.json / babel.config.cjs / metro.config.cjs   Build toolchain config
├── tailwind.config.js / global.css / nativewind-env.d.ts  NativeWind/Tailwind token wiring
├── eslint.config.js / .prettierrc         Lint/format rules
└── vercel.json                            Web deployment config for the Vercel target
```

## 9. Immediate Structural To-Do (Before Any New Feature Work)

1. **Pick one Configure split, delete the other.** `components/configure/` writes real persisted columns (`experience_levels`/`remote_preference`/`salary_min`) that `components/features/configure/` still treats as local-only UI state — that's the more correct one to keep, but confirm before deleting either.
2. **Pick one location autocomplete, delete the other.** `LocationInput.tsx` (Nominatim, free, no key) vs. `LocationAutocomplete.tsx` (GeoDB/RapidAPI, uses your existing BYOK cascade) — genuine tradeoff, not just duplication: Nominatim has a strict "no heavy autocomplete" usage policy at scale, GeoDB costs RapidAPI quota. Worth a real decision, not a coin flip.
3. **Do the folder rename that's been outstanding for several sessions:** `git mv "app/(admin)" "app/admin"` and `git mv "app/(tabs)/(settings)" "app/(tabs)/settings"` — every file that references the new paths is already written and waiting on this.

<div align="center">
  <i>Engineered for the future of work. Stop hunting. Let OpusHunter do it for you.</i>
</div>
