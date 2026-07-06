/**
 * components/features/configure/constants.ts
 * OpusHunter — Configure feature shared constants
 * 2026-07-03 — Removed JOB_BOARDS. It listed LinkedIn/Indeed/Glassdoor/
 * RemoteOK/WeWorkRemotely as toggleable sources, but only JSearch
 * (RapidAPI) is integrated anywhere in scrape-jobs — there is no
 * board-specific scraper for any of the others. Toggling them implied a
 * capability that doesn't exist.
 */

import { C } from '../../../lib/theme';

export const LOCATION_PRESETS = ['Sweden', 'United States', 'United Kingdom', 'Germany', 'Netherlands', 'France', 'Canada', 'Australia', 'Singapore', 'Dubai',
    'London', 'New York', 'Berlin', 'Amsterdam',
    'Paris', 'Toronto', 'Sydney', 'Singapore', 'Dubai',
    'San Francisco', 'Austin', 'Dublin', 'Warsaw', 'Barcelona',
];

export const LOCATION_OPTIONS = [
    { key: 'sweden', label: 'Sweden' },
    { key: 'united_states', label: 'United States' },
    { key: 'united_kingdom', label: 'United Kingdom' },
    { key: 'germany', label: 'Germany' },
    { key: 'netherlands', label: 'Netherlands' },
    { key: 'france', label: 'France' },
    { key: 'canada', label: 'Canada' },
    { key: 'australia', label: 'Australia' },
    { key: 'singapore', label: 'Singapore' },
    { key: 'dubai', label: 'Dubai' },
] as const;

export const CITIES_BY_COUNTRY: { [key: string]: string[] } = {
    sweden: ['Stockholm', 'Gothenburg', 'Malmö'],
    united_states: ['New York', 'San Francisco', 'Austin', 'Chicago', 'Seattle'],
    united_kingdom: ['London', 'Manchester', 'Edinburgh'],
    germany: ['Berlin', 'Munich', 'Hamburg'],
    netherlands: ['Amsterdam', 'Rotterdam', 'Utrecht'],
    france: ['Paris', 'Lyon', 'Marseille'],
    canada: ['Toronto', 'Vancouver', 'Montreal'],
    australia: ['Sydney', 'Melbourne', 'Brisbane'],
    singapore: ['Singapore'],
    dubai: ['Dubai'],
};

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
    { key: 'linkedin', label: 'LinkedIn', color: C.cyan },
    { key: 'indeed', label: 'Indeed', color: C.purple },
    { key: 'glassdoor', label: 'Glassdoor', color: C.green },
    { key: 'jsearch', label: 'JSearch API', color: C.cyan },
    { key: 'remoteok', label: 'RemoteOK', color: C.pink },
    { key: 'weworkremotely', label: 'WWR', color: C.amber },
];

export const SALARY_RANGES = ['Any', '50000', '75000', '100000', '125000', '150000', '200000'];
export const SALARY_RANGE_LABELS: { [key: string]: string } = {
    Any: 'Any', '50000': '$50k+', '75000': '$75k+', '100000': '$100k+',
    '125000': '$125k+', '150000': '$150k+', '200000': '$200k+',
};

export function parseKeywords(raw: string): string[] {
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
}