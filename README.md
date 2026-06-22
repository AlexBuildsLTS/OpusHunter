# ⚡ OpusHunter — Automated Career Orchestration Engine

OpusHunter is a high-throughput, cross-platform job aggregation and automated application engine. Engineered with a strict "systems-first" architecture, it bypasses manual UI interactions by piping scraped market data directly into a Supabase-backed Tinder-style evaluation queue.

Approved jobs trigger stateless Deno Edge Functions that autonomously dispatch customized applications and PDF resumes, tracking the entire lifecycle in a secure PostgreSQL vault.

---

## 🏗 System Architecture

### Phase 1: High-Velocity Aggregation Pipeline

OpusHunter circumvents client-side CORS and proxy limitations by executing targeted market sweeps strictly on the Edge. Strict 30-second `AbortSignals` prevent hanging requests during third-party API degradation.

```mermaid
sequenceDiagram
    autonumber
    participant Client as OpusHunter UI
    participant Edge as Deno Edge (fetch-leads)
    participant API as RapidAPI (JSearch/LinkedIn)
    participant DB as Supabase PostgreSQL

    Client->>Edge: Dispatch {keywords, location}
    activate Edge
    Edge->>API: Query Market (AbortSignal: 30s)
    API-->>Edge: Return JSON Payload
    Edge->>DB: Bulk Upsert to `job_vault`
    deactivate Edge
    DB-->>Client: Invalidates TanStack Query Cache
    Client->>Client: Liquid Neon UI updates (FadeInDown)
```

### Phase 2: Dual-Platform CV Vault (Memory-Safe Uploads)

Mobile environments frequently OOM (Out Of Memory) when blindly serializing large PDF buffers. OpusHunter explicitly bifurcates the execution path, treating Web deployments and compiled APKs as distinct environments.

```mermaid
graph TD
    A[User Selects PDF] --> B{"Platform.OS === 'web'?"}
    B -->|Yes| C[Browser Blob / FormData]
    B -->|No| D[expo-file-system]
    D --> E[Read as Base64]
    E --> F[Decode to Uint8Array Chunk]
    C --> G[Supabase Storage cv_payloads]
    F --> G
    G --> H[Update profiles Table RLS]
```

### Phase 3: The Application Routing Engine

Global UI state is hoisted strictly via Zustand, while server state syncs via TanStack Query v5. The UI remains fully non-blocking during swipe gestures.

```mermaid
sequenceDiagram
    participant User
    participant Zustand as Local State
    participant Edge as Deno Edge (apply-job)
    participant External as Employer Inbox
    participant DB as Supabase PostgreSQL

    User->>Zustand: Swipe Right (Approve)
    Zustand->>Zustand: Optimistic UI Update
    Zustand->>Edge: Invoke application execution
    activate Edge
    Edge->>DB: Fetch user CV from `cv_payloads`
    Edge->>External: Dispatch Email API + Attachments
    Edge->>DB: Update `delivery_status` = 'submitted'
    deactivate Edge
    DB-->>Zustand: Background Sync Confirmation
```

## 🛡 Strategic Technical Moats

### 1. Zero-Hoisted Component State

To maintain 120fps fluid interactions on mid-tier Android devices, `useState` is heavily restricted.

- **Zustand** orchestrates the global UI shell, active modal overlays, and swipe-gesture states.
- **TanStack Query v5** manages the async server state, caching job lists, and handling optimistic updates upon swipe execution.

### 2. ACID-Compliant Row-Level Security

The engine operates on a multi-tenant architecture secured at the Postgres level. The `job_vault` table and `cv_payloads` storage bucket strictly enforce `auth.uid() = user_id`, guaranteeing that scraped pipelines and binary assets are mathematically isolated.

### 3. Liquid Neon Visual Engine

The UI completely rejects standard backdrop-blur native properties, which are notorious for causing GPU overdraw and layout thrashing in Expo. Instead, depth is simulated via precise opacity layering (`bg-[#0A0A0F]/95`) and reanimated with `withSpring` physics, delivering a high-fidelity "Liquid Neon" aesthetic at zero performance cost.
