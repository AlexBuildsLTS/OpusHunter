/**
 * components/features/configure/types.ts
 * OpusHunter — Configure feature shared types
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx
 */

export enum RemotePreference {
    ANY = 'any',
    REMOTE = 'remote',
    ONSITE = 'onsite',
    HYBRID = 'hybrid',
}

export enum WorkType {
    FULLTIME = 'FULLTIME',
    PARTTIME = 'PARTTIME',
    CONTRACT = 'CONTRACT',
    TEMP = 'TEMP',
    INTERNSHIP = 'INTERNSHIP',
}

export enum ExperienceLevel {
    ENTRY = 'Entry',
    MID = 'Mid',
    SENIOR = 'Senior',
    LEAD = 'Lead',
    EXECUTIVE = 'Executive',
}

export enum JobBoard {
    JSEARCH = 'jsearch',
    LINKEDIN = 'linkedin',
    INDEED = 'indeed',
    GLASSDOOR = 'glassdoor',
}

// Main interfaces
export interface EngineConfig {
    /** Unique identifier for the engine configuration */
    id?: string;
    /** Foreign key reference to user */
    user_id?: string;
    /** Target job locations */
    locations: string[];
    /** Preferred work types */
    workTypes: string[];
    /** Required experience levels */
    experienceLevels: string[];
    /** Remote work preference */
    remotePreference: string;
    /** Job boards to search */
    jobBoards: string[];
    /** Minimum salary (string for flexibility: "Any", "$50000", etc.) */
    salaryMin: string;
    /** Only apply to active rules */
    activeRulesOnly: boolean;
    /** Automatically apply to matching jobs */
    autoApply: boolean;
    /** Skip jobs already applied to */
    skipApplied: boolean;
    /** Timestamp when created */
    created_at?: string;
    /** Timestamp when last updated */
    updated_at?: string;
}

export const DEFAULT_ENGINE: EngineConfig = {
    locations: ['Remote'],
    workTypes: [WorkType.FULLTIME],
    experienceLevels: [ExperienceLevel.MID, ExperienceLevel.SENIOR],
    remotePreference: RemotePreference.ANY,
    jobBoards: [JobBoard.JSEARCH, JobBoard.LINKEDIN],
    salaryMin: 'Any',
    activeRulesOnly: true,
    autoApply: false,
    skipApplied: true,
};

export interface AutomationRule {
    /** Unique identifier */
    id: string;
    /** Search keywords */
    keywords: string[];
    /** Job location filter */
    location: string;
    /** Work type filters */
    work_types: string[];
    /** Experience level requirements */
    experience_levels: string[];
    /** Remote work preference */
    remote_preference: string;
    /** Minimum salary requirement */
    salary_min: number | null;
    /** Cover letter template */
    base_cover_letter: string;
    /** Whether rule is active */
    is_active: boolean | null;
    /** Timestamp when created */
    created_at: string;
    /** Timestamp when last updated */
    updated_at?: string;
    /** Foreign key reference to user */
    user_id?: string;
}

export interface RuleFormState {
    /** Comma-separated keywords */
    keywords: string;
    /** Job location */
    location: string;
    /** Selected work types */
    work_types: string[];
    /** Selected experience levels */
    experience_levels: string[];
    /** Remote preference setting */
    remote_preference: string;
    /** Minimum salary in numeric format */
    salary_min: number | null;
    /** Cover letter template */
    base_cover_letter: string;
    /** Rule activation status */
    is_active: boolean;
}

export const DEFAULT_FORM: RuleFormState = {
    keywords: '',
    location: 'Remote',
    work_types: [WorkType.FULLTIME],
    experience_levels: [],
    remote_preference: RemotePreference.ANY,
    salary_min: null,
    base_cover_letter: '',
    is_active: true,
};


export interface AutomationRule {
    id: string;
    keywords: string[];
    location: string;
    work_types: string[];
    experience_levels: string[];
    remote_preference: string;
    salary_min: number | null;
    base_cover_letter: string;
    is_active: boolean | null;
    created_at: string;
    user_id?: string;
}

export interface RuleFormState {
    keywords: string;
    location: string;
    work_types: string[];
    experience_levels: string[];
    remote_preference: string;
    salary_min: number | null;
    base_cover_letter: string;
    is_active: boolean;
}


// Tab navigation types
export type TabKey = 'engine' | 'rules';

// Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}