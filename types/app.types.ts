/**
 * types/app.types.ts
 * OpusHunter — Shared Application & Domain Types
 *
 * FULLY SYNCHRONIZED WITH SUPABASE (total_structure.sql & database.types.ts)
 *
 * Rules, Job Vault, Profiles, Cover Letters, Applications, and Enums
 * derive directly from the verified database schema to guarantee zero type drift.
 */



import type { Database, Tables, Enums } from "./database.types";

// ─── RE-EXPORT CORE DATABASE TYPES ──────────────────────────────────────────
export type { Database, Tables, Enums };

// ─── DATABASE ENUMS (Single Source of Truth) ────────────────────────────────
export type VaultJobStatus = Enums<"job_status">; // 'pending' | 'approved' | 'rejected' | 'applied'
export const VAULT_JOB_STATUSES: VaultJobStatus[] = [
  "pending",
  "approved",
  "rejected",
  "applied",
];

export type ApplicationStatus = Enums<"application_status_enum">; // 'discovered' | 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "discovered",
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export type WorkType = Enums<"work_type_enum">; // 'remote' | 'hybrid' | 'onsite' | 'flexible'
export const WORK_TYPES: WorkType[] = [
  "remote",
  "hybrid",
  "onsite",
  "flexible",
];

export type SeniorityLevel = Enums<"seniority_level_enum">; // 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'director' | 'vp' | 'c_level'
export const SENIORITY_LEVELS: SeniorityLevel[] = [
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
  "director",
  "vp",
  "c_level",
];

export type JobSource = Enums<"job_source_enum">; // 'jsearch' | 'adzuna' | 'linkedin' | 'indeed' | 'custom'
export const JOB_SOURCES: JobSource[] = [
  "jsearch",
  "adzuna",
  "linkedin",
  "indeed",
  "custom",
];

export type CoverLetterStrategy = Enums<"cover_letter_strategy_enum">; // 'mirror_matching' | 'achievement_amplification' | 'insider_narrative'
export type ApiProvider = Enums<"api_provider_enum"> | "linkedin"; // 'gemini' | 'rapidapi' | 'geodb' | 'adzuna' | 'openai' | 'anthropic' | 'linkedin'
export type UserRole = Enums<"user_role">; // 'member' | 'premium' | 'admin'

// ─── DATABASE TABLE ROW TYPES ───────────────────────────────────────────────
export type JobVaultRow = Tables<"job_vault">;
export type AutomationRuleRow = Tables<"automation_rules">;
export type ProfileRow = Tables<"profiles">;
export type JobApplicationRow = Tables<"job_applications">;
export type CoverLetterRow = Tables<"cover_letters">;
export type CertificationRow = Tables<"certifications">;
export type ResumeDocumentRow = Tables<"resume_documents">;
export type UserContextRow = Tables<"user_context">;
export type UserApiKeyRow = Tables<"user_api_keys">;
export type SystemApiKeyRow = Tables<"system_api_keys">;
export type ApiKeyUsageLogRow = Tables<"api_key_usage_logs">;
export type ScrapeRateLimitRow = Tables<"scrape_rate_limits">;
export type ConnectedEmailAccountRow = Tables<"connected_email_accounts">;
export type InterviewPrepRow = Tables<"interview_preps">;

// ─── SYNCHRONIZED DOMAIN INTERFACES ─────────────────────────────────────────

/**
 * Job Interface
 * Matches job_vault table structure with optional runtime status field
 * for swipe-deck and triage pipeline compatibility.
 */
export interface Job {
  id: string;
  user_id?: string;
  title: string;
  company: string;
  company_logo_url?: string | null;
  description: string | null;
  salary: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  location: string | null;
  country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_remote?: boolean;
  work_type?: WorkType | null;
  match_score: number | null;
  tech_stack: string[];
  source?: JobSource;
  source_url: string;
  url?: string;
  dedup_hash?: string;
  posted_at?: string | null;
  scraped_at?: string;
  created_at?: string;
  /** UI / Triage state */
  status?: VaultJobStatus;
}

/**
 * AutomationRule Interface (RULES)
 * 100% synchronized with public.automation_rules table in Supabase.
 */
export interface AutomationRule {
  id: string;
  user_id: string;
  keywords: string[];
  work_types: string[];
  experience_levels: string[];
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  max_distance_km?: number | null;
  remote_preference: string;
  salary_min?: number | null;
  base_cover_letter: string;
  is_active: boolean | null;
  created_at: string;
}

/**
 * Profile Interface
 * 100% synchronized with public.profiles table in Supabase.
 */
export interface Profile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null; // Virtual helper (first_name + last_name)
  avatar_url?: string | null;
  bio?: string | null;
  professional_title?: string | null;
  years_experience?: number | null;
  seniority_level?: SeniorityLevel | null;
  target_roles?: string[];
  work_type_preferences?: WorkType[];
  target_cities?: string[];
  target_countries?: string[];
  location_radius_km?: number;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  languages?: string[];
  role?: UserRole;
  country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  max_daily_applications?: number;
  profile_complete?: boolean;
  last_scrape_time?: string | null;
  gmail_linked_email?: string | null;
  cv_storage_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * JobApplication Interface
 * 100% synchronized with public.job_applications table in Supabase.
 */
export interface JobApplication {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  cover_letter_used: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * CoverLetter Interface
 * 100% synchronized with public.cover_letters table in Supabase.
 */
export interface CoverLetter {
  id: string;
  user_id: string;
  job_id?: string | null;
  title: string;
  body: string;
  company?: string | null;
  job_title?: string | null;
  tone?: string;
  strategy_used?: CoverLetterStrategy | null;
  ats_score?: number | null;
  specificity_score?: number | null;
  filler_phrase_count?: number;
  tokens_used?: number | null;
  generation_duration_ms?: number | null;
  user_edited?: boolean;
  is_default: boolean;
  automation_rule_id?: string | null;
  generated_by: string;
  alternative_versions?: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Certification Interface
 * 100% synchronized with public.certifications table in Supabase.
 */
export interface Certification {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size_kb: number | null;
  storage_path: string;
  cert_name?: string | null;
  cert_issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  uploaded_at: string;
}

/**
 * ResumeDocument Interface
 * 100% synchronized with public.resume_documents table in Supabase.
 */
export interface ResumeDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size_kb: number | null;
  storage_path: string;
  is_primary: boolean;
  raw_text: string | null;
  extraction_status: string;
  uploaded_at: string;
}

// ─── PIPELINE & UI STATE ────────────────────────────────────────────────────

export interface PipelineMetrics {
  matches: number;
  pending: number;
  interviews: number;
}

export interface CVUploadState {
  status: "idle" | "picking" | "uploading" | "success" | "error";
  message: string;
  path: string | null;
}

// ─── SCRAPER ENGINE & AUTOMATION PAYLOADS ───────────────────────────────────

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

export interface EdgeFnError {
  error: string;
}

export interface GenerateCoverLetterResponse {
  cover_letter: string;
  cover_letter_id: string | null;
  generated_by: string;
  strategy_used?: CoverLetterStrategy;
}
