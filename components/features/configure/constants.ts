/**
 * components/features/configure/constants.ts
 * OpusHunter — Configure feature shared constants
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx (was a single 1240-line
 * route file — see ConfigureScreen.tsx's header comment for the full split).
 *
 * SetupWizard.tsx now imports LOCATION_PRESETS / WORK_TYPE_OPTIONS /
 * WORK_TYPE_LABELS / EXPERIENCE_LEVELS / EXPERIENCE_COLORS from here instead
 * of keeping its own copy — one source of truth for both screens.
 */

import { C } from '../../../lib/theme';

export const LOCATION_PRESETS = [
    'London', 'New York', 'Berlin', 'Amsterdam',
    'Paris', 'Toronto', 'Sydney', 'Singapore', 'Dubai',
    'San Francisco', 'Austin', 'Dublin', 'Warsaw', 'Barcelona',
];

export const WORK_TYPE_OPTIONS = ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERNSHIP', 'TEMPORARY'];

export const WORK_TYPE_LABELS: { [key: string]: string } = {
    FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract',
    INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
};

export const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Director'];

export const EXPERIENCE_COLORS: { [key: string]: string } = {
    Entry: C.green, Mid: C.cyan, Senior: C.purple, Lead: C.amber, Director: C.pink,
};

export const REMOTE_OPTIONS = [
    { key: 'remote', label: 'Remote Only' },
    { key: 'hybrid', label: 'Hybrid' },
    { key: 'onsite', label: 'On-site' },
    { key: 'any', label: 'Any' },
] as const;

export const JOB_BOARDS = [
    { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
    { key: 'indeed', label: 'Indeed', color: '#2557A7' },
    { key: 'glassdoor', label: 'Glassdoor', color: '#0CAA41' },
    { key: 'jsearch', label: 'JSearch API', color: C.cyan },
    { key: 'remoteok', label: 'RemoteOK', color: '#FF4742' },
    { key: 'weworkremotely', label: 'WWR', color: C.purple },
];

export const SALARY_RANGES = ['Any', '$50k+', '$75k+', '$100k+', '$125k+', '$150k+', '$200k+'];

export function parseKeywords(raw: string): string[] {
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
}