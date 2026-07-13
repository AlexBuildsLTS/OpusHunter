/**
 * types/app.types.ts
 * OpusHunter — Shared Application Types
 * Updated: 2026-06-26
 *
 * FIX: Removed JobStatus = 'active' | 'expired' | 'filled'
 *      This was wrong — the DB enum is VaultJobStatus below.
 *      Any component importing JobStatus was getting a type error on every query.
 */

// ─── JOB VAULT ───────────────────────────────────────────────────────────────
// Matches DB enum exactly: "pending" | "approved" | "rejected" | "applied"

export const VAULT_JOB_STATUSES = ['pending', 'approved', 'rejected', 'applied'] as const;
export type VaultJobStatus = typeof VAULT_JOB_STATUSES[number];

// Status used for job_applications table (not DB enum — free text)
export const APPLICATION_STATUSES = [
    'pending_auto_apply',
    'applied',
    'passed',
    'interview',
    'rejected',
    'offer',
] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

export interface Job {
    id: string;
    title: string;
    company: string;
    description: string;
    salary: string | null;
    location: string | null;
    match_score: number | null;
    tech_stack: string[];
    status: VaultJobStatus;
    source_url: string;
    url?: string;
    created_at?: string;
}

// ─── JOB APPLICATION ─────────────────────────────────────────────────────────

export interface JobApplication {
    id: string;
    user_id: string;
    job_id: string;
    status: ApplicationStatus;
    cover_letter_used: string | null;
    applied_at: string | null;
    created_at: string;
    updated_at: string;
}

// ─── COVER LETTER ────────────────────────────────────────────────────────────

export interface CoverLetter {
    id: string;
    user_id: string;
    title: string;
    body: string;
    company: string | null;
    job_title: string | null;
    generated_by: 'gemini' | 'template' | 'template_fallback' | 'manual';
    is_default: boolean;
    automation_rule_id: string | null;
    created_at: string;
    updated_at: string;
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'premium' | 'member';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    cv_storage_path: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

// ─── AUTOMATION RULE ─────────────────────────────────────────────────────────

export interface AutomationRule {
    id: string;
    user_id: string;
    keywords: string[];
    location: string;
    work_types: string[];
    base_cover_letter: string;
    is_active: boolean | null;
    created_at: string;
}

// ─── CERTIFICATION ────────────────────────────────────────────────────────────

export interface Certification {
    id: string;
    user_id: string;
    file_name: string;
    file_type: string;
    file_size_kb: number | null;
    storage_path: string;
    uploaded_at: string;
}

// ─── PIPELINE STORE ──────────────────────────────────────────────────────────

export interface PipelineMetrics {
    matches: number;
    pending: number;
    interviews: number;
}

export interface CVUploadState {
    status: 'idle' | 'picking' | 'uploading' | 'success' | 'error';
    message: string;
    path: string | null;
}

// ─── SCRAPER ─────────────────────────────────────────────────────────────────

export interface ScrapeSummaryItem {
    rule: string;
    fetched: number;
    new: number;
}

export interface ScrapeResult {
    message: string;
    count: number;
    summary?: ScrapeSummaryItem[];
    rules_processed?: number;
    keywords?: string[];
    location?: string;
}

// ─── API RESPONSE HELPERS ─────────────────────────────────────────────────────

export interface EdgeFnError {
    error: string;
}

export interface GenerateCoverLetterResponse {
    cover_letter: string;
    cover_letter_id: string | null;
    generated_by: 'gemini' | 'template';
}