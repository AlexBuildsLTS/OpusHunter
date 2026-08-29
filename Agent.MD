# CONTINUE.md — OpusHunter Engineering State & Plan

**Status as of this document:** Grounded in `total_structure.sql`, `total_data.sql`, and
`database.types.ts` generated 2026-08-28, plus a full read of the repository export
(`repomix-output.xml`) and Supabase dashboard screenshots supplied in-chat.

**Rule for this file:** every claim below is either (a) quoted/derived directly from a file
you uploaded, or (b) explicitly marked `[RECOMMENDATION]` / `[NEEDS VERIFICATION]`. Nothing
in here is invented. If a future agent (human or AI) edits this project, the same rule
applies to edits made to this document — no speculative "should probably exist" content
gets written as fact.

---

- **`[RECOMMENDATION] A — Adopt migrations properly.`** Every change starts with
  `supabase migration new <name>`, gets written as SQL, applied with
  `supabase db push --linked`, and only then does `gen types` get run. Dashboard SQL editor
  becomes read-only/query-only, never DDL. This is the only way an AI agent's mental model of
  your schema and your live DB never diverge.

---

begins with you running the three commands you just ran (`gen types`, `db dump` structure,
`db dump --data-only`) and pasting fresh output before any schema work happens. Slower, more
error-prone, but matches how you actually work today.

Given you're mid-project with real user data in production, **B now, A once things stabilize**
is the realistic path. Either way: @supabase/migrations/total_structure.sql and supabase/migrations/total_data.sql , everythign is there, @types/database.types.ts is generated WITH THE LATEST, NO SQL HAS BEEN RUN, I ALWAYS EVERY TIME A SQL HAS BEEN RUN I GENERATE ISNTNTLY, A NEW ONE. 0 edge ufnctionss work, but start ALL LOF IT DHOUDL WORK THE ROUTIJNG , the imrpesssive UI/UX, aniamtions, yo uwill implement for exmaple even fadein or just call it fade and have several aniamtiosn for that, and so on, engagign , modern professional is what this whole proejct should be in every detail i expect, in proper order, since, NOTHING MATERS, IF ONE CANTR EVEN TESEST OR SEE ANYTHING. NO MOC IS ALLOWED NO MOCK IS ALLOWED NO MOLOCK IS ALLOWED, THAT MEANS ILLEGAL. And Every, single file ,shgould have short cocnise comments, thats accurate, for each fucntion, when i show it to someoe with 15+ eyars of experience, if they say one tiny thing is wrogn or could be improved, therre wil lbe problems.

---

## 1. Verified, root-caused bugs (fix these, in this order)

### 1.1 — Three deployed Edge Functions have no source code anywhere in this project

Your Supabase dashboard (Edge Functions list) shows **10 deployed functions**. Your repository
— checked across the live `app/` tree _and_ both stale snapshots under
`.kilo/worktrees/opushunter/` and `.kilo/worktrees/pinnate-power/` — contains source for only
**7**:

| Deployed                 | Source in repo? |
| ------------------------ | --------------- |
| `auto-apply`             | ✅              |
| `extract-context`        | ✅              |
| `generate-cover-letter`  | ✅              |
| `geo-autocomplete`       | ✅              |
| `save-api-key`           | ✅              |
| `score-cover-letter`     | ✅              |
| `scrape-jobs`            | ✅              |
| `generate-rule-template` | ❌ nowhere      |
| `link-gmail-account`     | ❌ nowhere      |
| `search-cities`          | ❌ nowhere      |

These three were deployed straight from a local machine via `supabase functions deploy` at
some point and the source was never committed (or was later deleted locally). You cannot fix,
review, or safely redeploy them because there is nothing to edit. Your dashboard log
(screenshot) shows exactly the kind of failure this produces:

```
worker boot error: Uncaught SyntaxError: The requested module '../_shared/supabaseAdmin.ts'
does not provide an export named 'createAdminClient'
```

That's `search-cities` crashing on import. Confirmed cause: `_shared/supabaseAdmin.ts` in your
_current_ repo exports `getSupabaseAdmin` (named + default) — there has never been a
`createAdminClient` export in the version of that file you have now. The deployed
`search-cities` bundle was built against a different, older version of `supabaseAdmin.ts` that
no longer exists locally.

**Fix:** You have two real choices, no third option:

1. Rewrite `search-cities`, `link-gmail-account`, `generate-rule-template` from scratch against
   current `_shared/*` (I can do this once you tell me what each should actually do — see open
   questions in §6), or
2. `supabase functions delete` all three from production if they're not load-bearing for
   anything the app currently calls, and remove the dead UI paths that would call them.

Do not "fix" them by guessing at what the missing source used to do — that's exactly the kind
of fabrication you've said is unacceptable.

### 1.2 — `keyResolver.ts` fallback does not support your numbered-key convention

You described: add `GEMINI_API_KEY1`, `GEMINI_API_KEY2`, etc. as additional fallback keys, and
the system should rotate through them automatically. Current code
(`supabase/functions/_shared/keyResolver.ts`, Tier 3 / env fallback):

```ts
const envKeyNames = [
  `${normalizedProvider.toUpperCase()}_API_KEY`,
  `${normalizedProvider.toUpperCase()}_KEY`,
];
if (normalizedProvider === "gemini") {
  envKeyNames.push("GEMINI_API_KEY", "GOOGLE_API_KEY");
} else if (normalizedProvider === "rapidapi") {
  envKeyNames.push("RAPIDAPI_KEY", "RAPID_API_KEY", "JSEARCH_API_KEY");
} else if (normalizedProvider === "adzuna") {
  envKeyNames.push("ADZUNA_KEY", "ADZUNA_API_KEY");
}
```

This checks a fixed list of names. It never looks for `GEMINI_API_KEY1..N`. If you add one
today in Supabase Secrets, this function silently never reads it — not a bug that throws, a
bug that just quietly does nothing.

**`[RECOMMENDATION] Fix`** — replace the Tier-3 block with a numbered-suffix scan:

```ts
// Tier 3: Environment Variable Fallbacks — checks BASE name, then _1.._20 suffixes
const baseNames = [
  `${normalizedProvider.toUpperCase()}_API_KEY`,
  `${normalizedProvider.toUpperCase()}_KEY`,
];
for (const base of baseNames) {
  const unsuffixed = Deno.env.get(base);
  if (unsuffixed && !candidates.some((c) => c.key === unsuffixed)) {
    candidates.push({ key: unsuffixed, keyId: `env-${base}`, source: "env", provider: normalizedProvider });
  }
  for (let i = 1; i <= 20; i++) {
    const val = Deno.env.get(`${base}${i}`);
    if (!val) continue;
    if (candidates.some((c) => c.key === val)) continue;
    candidates.push({ key: val, keyId: `env-${base}${i}`, source: "env", provider: normalizedProvider });
  }
}
```

This also needs a matching cooldown mechanism for env-sourced keys — right now `handle429()`
explicitly skips anything whose `keyId` starts with `env-` (`if (keyId && !keyId.startsWith("env-"))`),
meaning **env fallback keys never get throttled even after a real 429**, so a maxed-out
`GEMINI_API_KEY2` will be retried on every single request forever. `[NEEDS DECISION]`: either
track env-key cooldowns in-memory per function instance (resets on cold start, imperfect but
zero schema change), or add a `throttled_env_keys` table keyed by env-var-name so cooldowns
persist and are visible in the admin panel. Given you already have `system_api_keys` with a
working `throttled_until` column, the cleanest fix is actually to **stop using env vars as a
separate tier** and instead have your admin-panel "add fallback key" action insert a row into
`system_api_keys` (which already has priority ordering + throttling + admin visibility) instead
of a Vercel/Supabase secret. That gets you the numbered-key UX you want (just click "add
another key" in the admin panel) with zero new code — the plumbing already exists in
`admin_add_api_key()` (confirmed present in `total_structure.sql`). `.env` fallback stays as
the last-resort Tier 4 for true emergencies (all system keys throttled at once), unchanged.

### 1.3 — `app.types.ts` describes tables that don't exist

Confirmed already in prior message — full detail there. Action: **delete `app.types.ts`
entirely once §2's target structure is adopted.** There is no reason to hand-maintain a
parallel type file next to a generated one; every interface in it should instead be a
`Database["public"]["Tables"]["x"]["Row"]` alias. See §3.

### 1.4 — Duplicate/ambiguous CV storage buckets

Your Storage dashboard (screenshot) shows five buckets: `resumes` (1 policy, 10MB, pdf/docx),
`avatars` (public, 8 policies), `certifications` (1 policy, 20MB), `cv_payloads` (10 policies,
20MB, pdf/doc/docx), `cv_vault` (8 policies, unset/50MB, any mime type). Your `profiles`,
`resume_documents`, and `certifications` tables each store a `storage_path text` column but
nothing in the schema constrains _which bucket_ that path lives in.
`[NEEDS VERIFICATION FROM YOU]`: which of `resumes` / `cv_payloads` / `cv_vault` is the one
`resume_documents.storage_path` actually writes to today? Having three plausible CV buckets
with different size limits and policy counts is the storage-layer version of the same drift
problem as §0 — I can't tell you which is canonical without you checking which one
`DocumentUploader.tsx` currently uploads into, and the storage RLS policies themselves aren't
in `total_structure.sql` (that dump is `public` schema only — storage policies live in the
`storage` schema and need a separate `supabase db dump --schema storage` if you want them
documented here with the same rigor as everything else).

---

## 2. Verified current database schema (public schema, live, 2026-08-28)

**18 tables**, RLS enabled on all of them. Full column lists live in
`total_structure.sql` lines 704–1084 (already extracted into your repo, not reproduced in full
here to avoid this doc going stale the moment you run another migration — treat
`total_structure.sql` itself as the schema doc, this section is the _map_, not the source).

| Table                                         | Purpose (from your own `COMMENT ON TABLE`, where set)                                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                                    | "One row per user. Source of truth for identity, search prefs, role, and quotas."                                                                                                |
| `resume_documents`                            | "Uploaded CV files. Exactly one per user should have `is_primary = true`."                                                                                                       |
| `certifications`                              | "Uploaded certification files, unlimited per user, tagged for skill-matching."                                                                                                   |
| `user_context`                                | "Structured career knowledge graph built from CV/cert extraction. Cover letter generation reads from here."                                                                      |
| `job_vault`                                   | "Deduplicated job listings per user. `dedup_hash` prevents the same posting reappearing."                                                                                        |
| `job_applications`                            | "Tracks each job through the pipeline. Status drives the kanban columns."                                                                                                        |
| `cover_letters`                               | "Generated cover letters. `alternative_versions` stores the two non-winning strategies."                                                                                         |
| `interview_preps`                             | "AI-generated interview briefs per job, viewable once an application reaches interview status."                                                                                  |
| `automation_rules`                            | Saved search + auto-apply criteria. Defaults `location` to `'Stockholm, Sweden'` — see §5.                                                                                       |
| `connected_email_accounts`                    | "Gmail send-as accounts for dispatching application emails. Separate from Supabase Auth login."                                                                                  |
| `user_api_keys`                               | "BYOK keys. Service-Role only. Tried first in the key cascade."                                                                                                                  |
| `system_api_keys`                             | "Admin-managed fallback key pool. Cascade falls here when a user has no active key of their own." — this is the table §1.2 recommends routing your numbered fallback keys into.  |
| `api_key_usage_logs`                          | "Every key resolution attempt, success or fail. Powers the admin usage dashboard and cost tracking."                                                                             |
| `scrape_rate_limits`                          | "Guards free-tier scrape frequency. Premium users with their own RapidAPI key bypass this."                                                                                      |
| `usage_counters`                              | "Daily send counter, checked against `profiles.max_daily_applications` before auto-apply fires." — this is your member/premium/admin daily-cap mechanism, and it already exists. |
| `support_tickets` / `support_ticket_messages` | In-app support thread system.                                                                                                                                                    |

**Enums (11):** `ai_provider`, `api_provider_enum`, `application_status_enum`,
`cover_letter_strategy_enum`, `job_source_enum`, `job_status`, `key_source_enum`,
`seniority_level_enum`, `support_ticket_priority`, `support_ticket_status`, `user_role`,
`work_type_enum`. Note: the enum is `user_role`, not `user_role_enum` — another place
`app.types.ts` (which invents `UserRole` by hand) will fight the generated types.

**Functions of note (30 total, all in `total_structure.sql`):**

- `is_admin()` — used as the `USING`/`WITH CHECK` clause on every admin-only RLS policy. This is
  your actual admin-gate mechanism, already correctly wired.
- `resolve_key_pool(user_id, provider)` — a **Postgres function** returning `(key, source,
key_id)`. This overlaps with what `keyResolver.ts` does in the Edge Function layer. `[NEEDS
VERIFICATION]`: which one is actually load-bearing today — is `keyResolver.ts` calling this
  DB function, duplicating its logic, or is this function dead/legacy? If both exist and
  disagree, that's another drift source waiting to bite you.
- `check_and_increment_daily_applications(user_id)` — real, already implements the
  member/premium/admin daily cap you described. Confirm the numeric caps (10/5/unlimited or
  whatever you've set) match your intent before building UI around it.
- `admin_add_api_key`, `admin_delete_api_key`, `admin_set_api_key_active`,
  `admin_list_api_keys` — these are the correct, already-built primitives for the "admin adds a
  fallback key in the UI" feature. §1.2's recommendation uses these, it doesn't invent new ones.
- `handle_new_user()` — the signup trigger (successor to the old `create_profile_on_signup()`
  from the stale migration). Confirm this is the one wired to `auth.users` `AFTER INSERT`.
- `prevent_self_privilege_escalation()`, `protect_role_column()` — good, these exist so a member
  can't just `UPDATE profiles SET role = 'admin'` on their own row even though `own rows update`
  policy lets them update their profile generally. Worth confirming these triggers are actually
  attached (trigger list wasn't fully greppped in this pass) rather than defined-but-orphaned.

---

## 3. Target file structure

Comment format below matches what you asked for — every file gets a one-line purpose comment.
`[NEW]` = doesn't exist yet, `[KEEP]` = exists today, unchanged in role, `[MOVE]` = exists
today, relocate, `[DELETE]` = exists today, remove.

```
opushunter/
├── app/                                  # Expo Router — file-based routing, each file = one screen/route
│   ├── (auth)/
│   │   ├── _layout.tsx                   # [KEEP] Auth stack layout — redirects to (tabs) if session exists
│   │   ├── auth.tsx                      # [KEEP] Sign in / register / Google OAuth screen
│   │   ├── onboarding.tsx                # [KEEP] 4-slide value-prop carousel, Reanimated + PanResponder swipe — real code already, see §4
│   │   └── profile-setup.tsx             # [KEEP] Post-signup profile completion (maps to `profiles.profile_complete`)
│   ├── (tabs)/
│   │   ├── (dashboard)/
│   │   │   ├── admin/                    # Gated by is_admin() — mirror that gate in the route layout, not just the DB
│   │   │   │   ├── _layout.tsx           # [KEEP] Redirects non-admins out — verify this actually checks role, not just renders conditionally
│   │   │   │   ├── api-keys.tsx          # [KEEP] Wire to admin_list_api_keys/admin_add_api_key/admin_set_api_key_active — see §1.2
│   │   │   │   ├── index.tsx             # [KEEP] Admin dashboard home — get_admin_dashboard_stats() already exists server-side
│   │   │   │   └── users.tsx             # [KEEP] User management — admin_list_users(), force_set_role(), admin_delete_user() already exist
│   │   │   ├── configuration/
│   │   │   │   ├── cover-letter.tsx      # [KEEP] Base cover-letter voice/tone editor — feeds automation_rules.base_cover_letter
│   │   │   │   └── job.tsx               # [KEEP] Search criteria editor (keywords/location/work-type) — feeds automation_rules
│   │   │   ├── settings/
│   │   │   │   ├── index.tsx             # [KEEP] Settings hub
│   │   │   │   ├── profile.tsx           # [KEEP] Edit profile fields
│   │   │   │   └── vault.tsx             # [KEEP] CV/cert management — resolve bucket ambiguity from §1.4 before touching this
│   │   │   ├── _layout.tsx               # [KEEP] Dashboard shell (sidebar/tab bar composition)
│   │   │   └── index.tsx                 # [KEEP] Dashboard home / pipeline summary cards
│   │   ├── _layout.tsx                   # [KEEP] Root tab layout
│   │   ├── dashboard.tsx                 # [NEEDS VERIFICATION] duplicate of (dashboard)/index.tsx? confirm which one is the real route before I touch either
│   │   ├── index.tsx                     # [KEEP] Tab index redirect
│   │   ├── pipeline.tsx                  # [KEEP] Kanban board screen (KanbanBoard.tsx)
│   │   ├── profile.tsx                   # [NEEDS VERIFICATION] duplicate of (dashboard)/settings/profile.tsx? same concern
│   │   └── vault.tsx                     # [NEEDS VERIFICATION] duplicate of (dashboard)/settings/vault.tsx? same concern
│   ├── _layout.tsx                       # [KEEP] Root layout — theme provider, query client provider, font loading
│   ├── +not-found.tsx                    # [KEEP] 404 route
│   └── index.tsx                         # [KEEP] Entry redirect (auth check → onboarding/dashboard)
│
├── components/
│   ├── admin/                            # [KEEP] api-keys.tsx, usage-logs.tsx, users.tsx — admin-only UI, mirrors admin edge fns
│   ├── job/                              # [KEEP] EmptyDeck, JobCard, KanbanBoard, RateLimitBanner, SearchFilters, SwipeDeck
│   ├── shared/
│   │   ├── AnimatedBackground.tsx        # [KEEP] Real, 10KB, already implements ambient background motion — audit before rewriting, see §4
│   │   ├── FadeIn.tsx                    # [KEEP] Reusable entrance-animation wrapper
│   │   ├── NavBar.tsx / SidebarNav.tsx / TabBarNav.tsx  # [KEEP] Responsive nav — desktop sidebar / mobile tab bar split, driven by useAdaptiveLayout
│   │   └── SafeAreaWrapper.tsx / KeyboardAvoidingWrapper.tsx  # [KEEP] Cross-platform layout primitives
│   ├── ui/                               # [KEEP] Badge, Button, Chip, GlassCard, Input, LoadingOverlay, Modal, Skeleton, Toast, Typography — design-system primitives, already exist
│   └── vault/DocumentUploader.tsx        # [KEEP] CV/cert upload — this is the file that resolves §1.4's bucket ambiguity, read it first
│
├── constants/
│   ├── theme.ts                          # [KEEP] Colors/radius/shadows — cyan/blue/navy palette, already matches the aesthetic you're asking for
│   └── animations.ts                     # [KEEP] durations/easing curves — already real, already used by onboarding.tsx
│
├── hooks/
│   ├── useAdaptiveLayout.ts              # [KEEP] Desktop-vs-mobile breakpoint hook, drives sidebar/tab-bar split
│   ├── useGmail.ts                       # [KEEP] Gmail OAuth linking — target for §1.1's `link-gmail-account` rewrite
│   └── useJobs.ts                        # [KEEP] job_vault / job_applications query hooks
│
├── lib/
│   ├── supabase.ts                       # [KEEP] Client-side Supabase client (anon key only — never service role)
│   ├── secureStorage.ts                  # [KEEP] expo-secure-store wrapper for session persistence
│   ├── queryClient.ts                    # [KEEP] TanStack Query client config
│   ├── navConfig.ts                      # [KEEP] Route/nav metadata
│   └── utils.ts                          # [KEEP] Misc helpers
│
├── stores/                               # Zustand
│   ├── authStore.ts                      # [KEEP] Session/user state
│   ├── coverLetterStore.ts               # [KEEP] In-progress cover letter draft state
│   ├── jobStore.ts                       # [KEEP] job_vault list state
│   ├── uiStore.ts                        # [KEEP] Global UI state (modals/toasts)
│   └── usePipelineStore.ts               # [KEEP] Kanban pipeline state
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── supabaseAdmin.ts          # [KEEP] Exports getSupabaseAdmin() + verifyJwt() — see §1.1, this is the file the 3 orphan functions must be rewritten against
│   │   │   ├── keyResolver.ts            # [KEEP, NEEDS FIX] Triple-tier key cascade — apply §1.2 fix
│   │   │   ├── cors.ts / geo.ts / rateLimit.ts / ambient.d.ts  # [KEEP] Shared utilities
│   │   ├── auto-apply/                   # [KEEP]
│   │   ├── extract-context/              # [KEEP] CV/cert parsing → user_context
│   │   ├── generate-cover-letter/        # [KEEP]
│   │   ├── geo-autocomplete/             # [KEEP] — implicated in §5's Sweden/EU location bug, audit first
│   │   ├── save-api-key/                 # [KEEP] BYOK save endpoint
│   │   ├── score-cover-letter/           # [KEEP]
│   │   ├── scrape-jobs/                  # [KEEP]
│   │   ├── generate-rule-template/       # [REBUILD] source missing entirely, see §1.1
│   │   ├── link-gmail-account/           # [REBUILD] source missing entirely, see §1.1
│   │   └── search-cities/                # [REBUILD] source missing entirely, currently boot-crashing in prod, see §1.1
│   ├── migrations/                       # [PROCESS FIX NEEDED] see §0 — not currently the source of truth
│   └── config.toml                       # [KEEP]
│
├── types/
│   ├── database.types.ts                 # [KEEP] Generated, read-only, regenerate after every schema change — never hand-edit
│   └── app.types.ts                      # [DELETE] see §1.3 — replace all usages with Database["public"]["Tables"][...] aliases, see §3a below
│
├── .vscode/settings.json                 # [KEEP, MINOR FIX] see §7
├── app.json / package.json / tailwind.config.js  # [KEEP]
└── CONTINUE.md                           # [NEW] this file — keep it updated at the START of a session, not the end, so it's never the thing that's stale
```

### 3a. `app.types.ts` replacement pattern

Instead of hand-written interfaces, every screen/component should import row types straight
from the generated file:

```ts
// Before (app.types.ts — fictional shape)
import { Job } from '../types/app.types';

// After — always in sync because it's generated, never hand-maintained
import type { Database } from '../types/database.types';
type JobVaultRow = Database['public']['Tables']['job_vault']['Row'];
type ApplicationStatus = Database['public']['Enums']['application_status_enum'];
```

`[RECOMMENDATION]` Add one small hand-written file, `types/aliases.ts`, that does nothing but
re-export these with shorter names (`export type Job = Database['public']['Tables']['job_vault']['Row'];`).
That gives you the short import names you're used to from `app.types.ts` without ever letting
the _shape_ drift from the DB — the alias can't lie about what fields exist, TypeScript won't
let it.

---

## 4. Design system reality check

You said the current build looks "disgusting, no animation, broken in every single way." Based
on actual code inspection, that's **not because the animation/design system doesn't exist** —
`constants/theme.ts` (colors, radius, shadows), `constants/animations.ts` (durations, easing
curves), and `app/(auth)/onboarding.tsx` (real `react-native-reanimated` `withTiming` slide
transitions, `PanResponder` swipe gestures, `expo-haptics` feedback on slide change) are all
present and reasonably sophisticated. Your `tailwind.config.js` cyan/blue/navy glass-morphism
palette is also already exactly the aesthetic direction you're describing wanting.

What your screenshots actually show (the flat, unstyled `localhost:8081/auth` and
`opus-hunter.vercel.app/login` pages) is a **rendering/build problem**, not an absent-code
problem: either NativeWind isn't compiling Tailwind classes into that particular bundle,
`global.css` isn't being loaded on that route/platform, or the deployed Vercel build is stale
relative to your local source. `[NEEDS VERIFICATION]`: open browser dev tools on the broken
screen and check whether any `.css` is loading at all, and diff the deployed commit hash
against your latest local commit. This is a much smaller, much more mechanical fix than
"rebuild the whole design system," and treating it as the latter would waste real effort
redoing work that already exists and already works in `onboarding.tsx`.

The `opus-hunter.vercel.app/configure` screenshots (images 5–9 in this thread) **do** show the
theme rendering correctly — dark navy background, cyan accent, glass card, working step
indicator, skip-friendly copy ("Skip this for now if you want — Vault is always reachable
later"). That flow already has the "skip and finish later" affordance you asked for on the
CV/certifications step. So the design system works on `/configure` and fails on `/auth` and
`/login` — that's further evidence this is route-specific, not systemic.

---

## 5. The Sweden/EU geo bug — what's verifiable now

Screenshot 7 shows, live: typing "Swede" into the Configure location field produces
**"Failed to send a request to the Edge Function"** in red, directly under the input. That
function is `geo-autocomplete` (source exists, see §3) or possibly the missing `search-cities`
(source does not exist, see §1.1) — `[NEEDS VERIFICATION]`: which one does
`LocationAutocomplete.tsx` / the configure screen actually call? If it's `search-cities`, this
bug and §1.1 are the same bug, and rebuilding that function fixes both at once. If it's
`geo-autocomplete`, that function's source does exist and needs its own debugging — check its
Supabase function logs the same way you did for `search-cities` in screenshot 1.

Separately, `automation_rules.location` defaults to `'Stockholm, Sweden'` in the schema itself
— so the DB is already opinionated toward Sweden/EU by default, which is a reasonable starting
point but confirms the "only USA showed" symptom you described is an application-layer or
job-source-API filtering issue (e.g. Adzuna/RapidAPI/JSearch query parameters defaulting to a
US country code), not a database default problem. `[NEEDS VERIFICATION]`: check the country/geo
params being sent to Adzuna and RapidAPI inside `scrape-jobs/index.ts` and `_shared/geo.ts`.

---

## 6. Open questions / USE BEST JUDGEMENT , BEST PRACTICES, I NEED HELP , YOU WILL HAVE TO MAKE THE BEST DECISION, YOU WILL SEARCH INFIORMATION THE BEST OPTION IN 2026, AND ACCORDING TO THE BEST PRACTICES, AS IF YOUR WOKRING IN A HUGE BILLION DOLLAR ENTERPRISE ) answered before continuing (not stalling — these change what gets built)

1. Which of `resumes` / `cv_payloads` / `cv_vault` buckets is canonical for CVs? (§1.4)
2. What should `generate-rule-template`, `link-gmail-account`, and `search-cities` actually do,
   in your words? I can write correct replacements once I know intended behavior — writing them
   from a guess would be exactly the fabrication you've ruled out. (§1.1)
3. Is `resolve_key_pool()` (Postgres function) or `keyResolver.ts` (Edge Function) the one
   actually in use today? (§2)
4. `dashboard.tsx`/`profile.tsx`/`vault.tsx` at the tab root vs. the same-named files nested
   under `(dashboard)/` — which set is dead code? (§3, file tree)
5. Confirm: is `opushunter` (not `pinnate-power`) the worktree actually deployed to
   `opus-hunter.vercel.app`? Your last message didn't answer this directly.

---

## 7. Small, low-risk fixes worth doing immediately

- `.vscode/settings.json` — `"js/ts.tsdk.path"` is not a real VS Code setting key (the correct
  key is `"typescript.tsdk"`). As written, this line does nothing; TypeScript IntelliSense is
  falling back to whatever VS Code's bundled TS version is instead of your project's
  `~6.0.3`. One-line fix: `"typescript.tsdk": "node_modules/typescript/lib"`.
- Delete the empty `supabase/migrations/20260827214533_migration_test.sql` (§0).
- Delete `.kilo/worktrees/opushunter/` or `.kilo/worktrees/pinnate-power/` — whichever answers
  question 5 as "not the real one." Two full duplicate copies of the entire app sitting in
  version control is itself a drift risk (an editor or agent could edit the wrong copy).

---
