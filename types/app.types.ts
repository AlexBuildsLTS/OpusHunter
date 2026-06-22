/**
 * types/app.types.ts
 * OpusHunter — Shared Application Types
 *
 * Single source of truth for all domain types used across
 * components, hooks, store, and Edge Functions.
 * Never import from @supabase/supabase-js directly for domain types —
 * use these instead so the shape is controlled in one place.
 */

// ─── JOB ────────────────────────────────────────────────────────────────────

export type JobStatus = 'active' | 'expired' | 'filled';

export interface Job {
    id: string;
    title: string;
    company: string;
    description: string;
    salary: string | null;
    location: string;
    match_score: number | null;
    tech_stack: string[];
    status: JobStatus;
    source_url: string;
    created_at: string;
}

// ─── JOB VAULT (user-scoped saved jobs) ─────────────────────────────────────

export type VaultJobStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface VaultJob {
    id: string;
    user_id: string;
    external_job_id: string;
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    url: string;
    match_score: number | null;
    status: VaultJobStatus;
    created_at: string;
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    cv_storage_path: string | null;
    created_at: string;
    updated_at: string;
}

// ─── PIPELINE STORE ──────────────────────────────────────────────────────────

export interface PipelineMetrics {
    matches: number;
    pending: number;
    interviews: number;
}

// ─── CV VAULT ────────────────────────────────────────────────────────────────

export type CVUploadStatus =
    | 'idle'
    | 'picking'
    | 'uploading'
    | 'success'
    | 'error';

export interface CVUploadState {
    status: CVUploadStatus;
    message: string;
    path: string | null;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export type AuthMode = 'sign-in' | 'sign-up';
export type MessageType = 'error' | 'warning' | 'success';

export interface AuthMessage {
    type: MessageType;
    text: string;
}

// ─── EDGE FUNCTION RESPONSES ──────────────────────────────────────────────────

export interface ScrapeJobsResponse {
    message: string;
    count?: number;
}

export interface ScrapeJobsError {
    error: string;
}