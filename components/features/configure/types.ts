/**
 * components/features/configure/types.ts
 * OpusHunter — Configure feature shared types
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx
 */

export interface EngineConfig {
    id?: string;
    user_id?: string;
    locations: string[];
    workTypes: string[];
    experienceLevels: string[];
    remotePreference: string;
    jobBoards: string[];
    salaryMin: string;
    activeRulesOnly: boolean;
    autoApply: boolean;
    skipApplied: boolean;
    created_at?: string;
    updated_at?: string;
}

export const DEFAULT_ENGINE: EngineConfig = {
    locations: ['Remote'],
    workTypes: ['FULLTIME'],
    experienceLevels: ['Mid', 'Senior'],
    remotePreference: 'any',
    jobBoards: ['jsearch', 'linkedin'],
    salaryMin: 'Any',
    activeRulesOnly: true,
    autoApply: false,
    skipApplied: true,
};

export interface AutomationRule {
    id: string;
    keywords: string[];
    location: string;
    work_types: string[];
    base_cover_letter: string;
    is_active: boolean | null;
    created_at: string;
}

export interface RuleFormState {
    keywords: string;
    location: string;
    work_types: string[];
    base_cover_letter: string;
    is_active: boolean;
}

export const DEFAULT_FORM: RuleFormState = {
    keywords: '',
    location: 'Remote',
    work_types: ['FULLTIME'],
    base_cover_letter: '',
    is_active: true,
};

export type TabKey = 'engine' | 'rules';