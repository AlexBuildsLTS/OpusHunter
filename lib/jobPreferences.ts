/**
 * lib/jobPreferences.ts
 * Shared work-type / experience-level constants — used by SetupWizard and
 * ConfigureScreen so there's exactly one copy, not two drifting apart.
 */
import { C } from './theme';

export const WORK_TYPE_OPTIONS = ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERNSHIP'];

export const WORK_TYPE_LABELS: Record<string, string> = {
    FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract', INTERNSHIP: 'Internship',
};

export const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Director'];

export const EXPERIENCE_COLORS: Record<string, string> = {
    Entry: C.green, Mid: C.cyan, Senior: C.purple, Lead: C.amber, Director: C.pink,
};