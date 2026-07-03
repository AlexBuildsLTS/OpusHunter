/**
 * components/configure/types.ts
 * OpusHunter — Shared Configure Screen Types
 * 2026-07-03 — New. Extracted so every configure/* component imports one
 * source of truth instead of redeclaring these shapes per-file.
 *
 * Matches automation_rules exactly, post-migration (see SQL in this turn):
 * experience_levels/remote_preference/salary_min are now real columns, not
 * decorative local state — every field here is written to and read from
 * Supabase, nothing is client-only.
 */

export interface AutomationRule {
    id: string;
    keywords: string[];
    location: string;
    work_types: string[];
    experience_levels: string[];
    remote_preference: 'remote_only' | 'hybrid' | 'onsite' | 'any';
    salary_min: number | null;
    base_cover_letter: string;
    is_active: boolean | null;
    created_at: string;
}

export interface RuleFormState {
    keywords: string[];
    location: string;
    work_types: string[];
    experience_levels: string[];
    remote_preference: 'remote_only' | 'hybrid' | 'onsite' | 'any';
    salary_min: number | null;
    base_cover_letter: string;
    is_active: boolean;
}

export const DEFAULT_FORM: RuleFormState = {
    keywords: [],
    location: 'Remote',
    work_types: ['FULLTIME'],
    experience_levels: [],
    remote_preference: 'any',
    salary_min: null,
    base_cover_letter: '',
    is_active: true,
};

export const WORK_TYPE_OPTIONS = ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERNSHIP', 'TEMPORARY'] as const;
export const WORK_TYPE_LABELS: Record<string, string> = {
    FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract',
    INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
};

export const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Director'] as const;

export const REMOTE_OPTIONS: Array<{ key: RuleFormState['remote_preference']; label: string }> = [
    { key: 'remote_only', label: 'Remote Only' },
    { key: 'hybrid', label: 'Hybrid' },
    { key: 'onsite', label: 'On-site' },
    { key: 'any', label: 'Any' },
];

export const SALARY_STEPS = [
    { label: 'Any', value: null },
    { label: '$50k+', value: 50000 },
    { label: '$75k+', value: 75000 },
    { label: '$100k+', value: 100000 },
    { label: '$125k+', value: 125000 },
    { label: '$150k+', value: 150000 },
    { label: '$200k+', value: 200000 },
] as const;

export function ruleToForm(rule: AutomationRule): RuleFormState {
    return {
        keywords: rule.keywords,
        location: rule.location,
        work_types: rule.work_types,
        experience_levels: rule.experience_levels ?? [],
        remote_preference: rule.remote_preference ?? 'any',
        salary_min: rule.salary_min ?? null,
        base_cover_letter: rule.base_cover_letter,
        is_active: rule.is_active ?? true,
    };
}