/**
 * components/onboarding/SetupWizard.tsx
 * OpusHunter — First-Run Setup Wizard
 * 2026-07-03 — NEW
 * 2026-07-03 (later same day) — Now imports LOCATION_PRESETS /
 * WORK_TYPE_OPTIONS / WORK_TYPE_LABELS / EXPERIENCE_LEVELS /
 * EXPERIENCE_COLORS from components/features/configure/constants.ts
 * instead of keeping a second copy — that duplication was flagged the same
 * day this file was written and is fixed now, one message later, not left
 * to drift.
 *
 * WHERE THIS FITS: `components/features/configure/ConfigureScreen.tsx`
 * (moved there from app/(tabs)/configure.tsx — see that file's header) is
 * wired to render this component instead of the empty Rules-tab state when
 * `rules.length === 0`. Someone who just confirmed their email lands on a
 * guided 5-step flow instead of a blank list. This wraps the SAME
 * `automation_rules` insert the existing "New Rule" modal does, and folds
 * in CV/certification upload (previously only reachable from a separate
 * Vault screen) so setup is genuinely one flow, once.
 *
 * SCOPE, STATED PLAINLY: this creates ONE automation_rules row and
 * uploads CV + certifications via the existing useCVVault hook — it does
 * not touch job_vault, scraping, or auto-apply. After finishing, the
 * person lands on the existing Configure screen where they can add more
 * rules ("Java Fullstack", "React/Node", etc — multi-rule support) exactly
 * as they could before.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
    Sparkles, MapPin, Briefcase, DollarSign, CheckCircle2,
    ArrowRight, ArrowLeft, Upload, X, Award, Wand2,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/ui/GlassCard';
import { useCVVault } from '../../hooks/useCVVault';
import { C } from '../../lib/theme';
import {
    WORK_TYPE_OPTIONS, WORK_TYPE_LABELS, EXPERIENCE_LEVELS, EXPERIENCE_COLORS,
} from '../features/configure/constants';
import { LocationAutocomplete } from '../features/configure/LocationAutocomplete';

// ── Wizard-only option set — work-mode framing differs slightly from the
// Engine tab's REMOTE_OPTIONS (this is 4 short chip labels for a first-run
// step, not the full settings list), so this one stays local.
const REMOTE_MODES = [
    { key: 'remote', label: 'Remote' },
    { key: 'hybrid', label: 'Hybrid' },
    { key: 'onsite', label: 'On-site' },
    { key: 'any', label: 'Any' },
] as const;

const STEP_TITLES = [
    'What are you looking for?',
    'Where can you work?',
    'Experience & salary',
    'CV & certifications',
    'Review & activate',
];

// ── Small building blocks ───────────────────────────────────────────────────

function Chip({
    label, active, onPress, color = C.cyan,
}: { label: string; active: boolean; onPress: () => void; color?: string }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? color : C.border,
                backgroundColor: active ? `${color}18` : 'rgba(255,255,255,0.02)',
            }}
        >
            <Text style={{ color: active ? color : C.sub, fontWeight: '700', fontSize: 13 }}>{label}</Text>
        </TouchableOpacity>
    );
}

function StepDots({ step, total }: { step: number; total: number }) {
    return (
        <View className="flex-row items-center justify-center gap-2 mb-6">
            {Array.from({ length: total }).map((_, i) => (
                <View
                    key={i}
                    style={{
                        width: i === step ? 22 : 7, height: 7, borderRadius: 4,
                        backgroundColor: i <= step ? C.cyan : C.border,
                    }}
                />
            ))}
        </View>
    );
}

// ── Wizard ───────────────────────────────────────────────────────────────────

interface SetupWizardProps {
    onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1
    const [role, setRole] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordDraft, setKeywordDraft] = useState('');

    // Step 2
    const [locations, setLocations] = useState<string[]>(['Remote']);
    const [remoteMode, setRemoteMode] = useState<typeof REMOTE_MODES[number]['key']>('any');
    const [workTypes, setWorkTypes] = useState<string[]>(['FULLTIME']);

    // Step 3
    const [experienceLevels, setExperienceLevels] = useState<string[]>(['Mid', 'Senior']);
    const [salaryMin, setSalaryMin] = useState('');

    // Step 4 — CV / certifications
    const { uploadState, uploadCV, uploadCertification } = useCVVault();

    // Step 5
    const [coverLetterVoice, setCoverLetterVoice] = useState<'formal' | 'direct' | 'enthusiastic' | null>(null);
    const [coverLetterDraft, setCoverLetterDraft] = useState('');

    const toggleInArray = (arr: string[], value: string) =>
        arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

    const addKeyword = useCallback(() => {
        const val = keywordDraft.trim();
        if (val && !keywords.includes(val)) setKeywords((k) => [...k, val]);
        setKeywordDraft('');
    }, [keywordDraft, keywords]);

    const canAdvance = useMemo(() => {
        switch (step) {
            case 0: return role.trim().length > 0 || keywords.length > 0;
            case 1: return locations.length > 0;
            case 2: return true;
            case 3: return true; // CV upload is encouraged, not force-gated — a person can add it from Vault later
            case 4: return true;
            default: return true;
        }
    }, [step, role, keywords, locations]);

    const starterTemplates: Record<'formal' | 'direct' | 'enthusiastic', string> = useMemo(() => {
        const roleLabel = role.trim() || keywords[0] || 'this role';
        // Ensure starterTemplates are always available, even if role/keywords are empty
        if (!role.trim() && keywords.length === 0) {
            return {
                formal: `Dear Hiring Team,\n\nI am writing to express my interest in a software engineering position at [COMPANY]. With a strong background in various technologies, I am confident I can contribute meaningfully to your team.\n\nI would welcome the opportunity to discuss how my experience aligns with your needs.\n\nSincerely,\n[NAME]`,
                direct: `Hi [COMPANY] team,\n\nI'm looking for a software engineering role. I work with various technologies and I'm looking for my next opportunity to build things that matter.\n\nHappy to walk through my background whenever's useful.\n\n[NAME]`,
                enthusiastic: `Hello!\n\nI just saw an opening at [COMPANY] and had to reach out — this looks like exactly the kind of role I've been hoping to find. I bring hands-on experience in various technologies and I'd love the chance to bring that energy to your team.\n\nLooking forward to hearing from you!\n\n[NAME]`,
            };
        }

        // If role or keywords are present, generate more specific templates

        if (!role.trim() && keywords.length === 0) {
            return {
                formal: `Dear Hiring Team,\n\nI am writing to express my interest in a software engineering position at [COMPANY]. With a strong background in various technologies, I am confident I can contribute meaningfully to your team.\n\nI would welcome the opportunity to discuss how my experience aligns with your needs.\n\nSincerely,\n[NAME]`,
                direct: `Hi [COMPANY] team,\n\nI'm looking for a software engineering role. I work with various technologies and I'm looking for my next opportunity to build things that matter.\n\nHappy to walk through my background whenever's useful.\n\n[NAME]`,
                enthusiastic: `Hello!\n\nI just saw an opening at [COMPANY] and had to reach out — this looks like exactly the kind of role I've been hoping to find. I bring hands-on experience in various technologies and I'd love the chance to bring that energy to your team.\n\nLooking forward to hearing from you!\n\n[NAME]`,
            };
        }

        const baseRole = role.trim();
        const primaryKeyword = keywords.length > 0 ? keywords[0] : '';
        const targetRole = baseRole || primaryKeyword || 'Software Engineer';

        return {
            formal: `Dear Hiring Team,\n\nI am writing to express my keen interest in the ${targetRole} position at [COMPANY]. With a robust background in ${baseRole ? ` and ` : ''}${keywords.slice(0, 2).join(', ')}${keywords.length > 2 ? ', etc.' : ''}, I am confident in my ability to contribute significantly to your team's success.\n\nMy experience aligns well with the requirements for this role, and I am eager to discuss how my skills can benefit your organization. Thank you for your time and consideration.\n\nSincerely,\n[NAME]`,
            direct: `Hi [COMPANY] team,\n\nI'm reaching out regarding the  role. My background includes ${baseRole ? ` and ` : ''}${keywords.slice(0, 2).join(', ')}${keywords.length > 2 ? ', etc.' : ''}, and I'm looking for a challenging opportunity where I can make an immediate impact.\n\nLet me know if my profile seems like a good fit for what you're building. Happy to connect.\n\n[NAME]`,
            enthusiastic: `Hello!\n\nI was so excited to see the  opening at [COMPANY]! This role perfectly aligns with my passion for ${baseRole || primaryKeyword || 'innovative technology'} and my expertise in ${keywords.slice(0, 2).join(', ')}${keywords.length > 2 ? ', etc.' : ''}. I thrive in dynamic environments and am eager to bring my energy and skills to your team.\n\nI'm genuinely enthusiastic about the possibility of contributing to [COMPANY]'s mission and would love to chat more!\n\n[NAME]`,
        };
    }, [role, keywords]);





    const handleSelectVoice = (voice: 'formal' | 'direct' | 'enthusiastic') => {
        setCoverLetterVoice(voice);
        setCoverLetterDraft(starterTemplates[voice]);
    };

    const handleActivate = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');

            const finalKeywords = keywords.length > 0 ? keywords : role.trim() ? [role.trim()] : [];
            const finalLocation = locations.join(', ') || 'Remote';

            const { error: insertError } = await supabase.from('automation_rules').insert({
                user_id: user.id,
                keywords: finalKeywords,
                location: finalLocation,
                work_types: workTypes,
                experience_levels: experienceLevels,
                remote_preference: remoteMode,
                salary_min: salaryMin.trim() ? Number(salaryMin.trim()) : null,
                base_cover_letter: coverLetterDraft.trim() || starterTemplates.formal,
                is_active: true,
            });

            if (insertError) throw new Error(insertError.message);
            onComplete();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not activate your search — try again.');
        } finally {
            setSaving(false);
        }
    }, [keywords, role, locations, workTypes, experienceLevels, remoteMode, salaryMin, coverLetterDraft, starterTemplates, onComplete]);

    return (
        <View className="items-center justify-center flex-1 px-4 py-10">
            <View style={{ width: '100%', maxWidth: 640 }}>
                <View className="items-center mb-2">
                    <View
                        style={{
                            width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: `${C.cyan}18`, borderWidth: 1, borderColor: `${C.cyan}30`, marginBottom: 14,
                        }}
                    >
                        <Sparkles size={24} color={C.cyan} strokeWidth={2.2} />
                    </View>
                    <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
                        Let's set up your search
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 13, textAlign: 'center', marginTop: 4, maxWidth: 380 }}>
                        Two minutes, once. You can change every one of these any time from Configure.
                    </Text>
                </View>

                <StepDots step={step} total={5} />

                <GlassCard tint="frost" padding="lg" glow>
                    <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 16 }}>
                        {STEP_TITLES[step]}
                    </Text>

                    <Animated.View key={step} entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
                        {step === 0 && (
                            <View style={{ gap: 14 }}>
                                <View>
                                    <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>ROLE TITLE</Text>
                                    <TextInput
                                        value={role}
                                        onChangeText={setRole}
                                        placeholder="e.g. Java Fullstack Developer"
                                        placeholderTextColor={C.dim}
                                        style={{
                                            color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border,
                                            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)',
                                        }}
                                    />
                                </View>
                                <View>
                                    <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                                        SKILLS / KEYWORDS
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TextInput
                                            value={keywordDraft}
                                            onChangeText={setKeywordDraft}
                                            onSubmitEditing={addKeyword}
                                            placeholder="Type a skill, press enter — React, TypeScript, Java..."
                                            placeholderTextColor={C.dim}
                                            style={{
                                                flex: 1, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border,
                                                borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: 'rgba(255,255,255,0.02)',
                                            }}
                                        />
                                        <TouchableOpacity
                                            onPress={addKeyword}
                                            style={{ paddingHorizontal: 16, borderRadius: 14, backgroundColor: `${C.cyan}20`, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Text style={{ color: C.cyan, fontWeight: '800' }}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2 mt-3">
                                        {keywords.map((k) => (
                                            <View
                                                key={k}
                                                className="flex-row items-center gap-1.5"
                                                style={{ backgroundColor: `${C.cyan}14`, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
                                            >
                                                <Text style={{ color: C.cyan, fontSize: 12, fontWeight: '700' }}>{k}</Text>
                                                <TouchableOpacity onPress={() => setKeywords((prev) => prev.filter((x) => x !== k))}>
                                                    <X size={12} color={C.cyan} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {step === 1 && (
                            <View style={{ gap: 16 }}>
                                <View>
                                    <View className="flex-row items-center gap-1.5 mb-2">
                                        <MapPin size={13} color={C.sub} />
                                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700' }}>LOCATIONS</Text>
                                    </View>
                                    <LocationAutocomplete selected={locations} onChange={setLocations} />
                                </View>

                                <View>
                                    <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>WORK MODE</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {REMOTE_MODES.map((m) => (
                                            <Chip key={m.key} label={m.label} active={remoteMode === m.key} onPress={() => setRemoteMode(m.key)} />
                                        ))}
                                    </View>
                                    {remoteMode !== 'remote' && (
                                        <Text style={{ color: C.dim, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                                            Hybrid/on-site roles only make sense near where you actually are — double-check the
                                            locations above match somewhere you can realistically work in person.
                                        </Text>
                                    )}
                                </View>

                                <View>
                                    <View className="flex-row items-center gap-1.5 mb-2">
                                        <Briefcase size={13} color={C.sub} />
                                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700' }}>EMPLOYMENT TYPE</Text>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2">
                                        {WORK_TYPE_OPTIONS.map((wt) => (
                                            <Chip
                                                key={wt}
                                                label={WORK_TYPE_LABELS[wt]}
                                                active={workTypes.includes(wt)}
                                                onPress={() => setWorkTypes((prev) => toggleInArray(prev, wt))}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {step === 2 && (
                            <View style={{ gap: 16 }}>
                                <View>
                                    <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>EXPERIENCE LEVEL</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {EXPERIENCE_LEVELS.map((lvl) => (
                                            <Chip
                                                key={lvl}
                                                label={lvl}
                                                color={EXPERIENCE_COLORS[lvl]}
                                                active={experienceLevels.includes(lvl)}
                                                onPress={() => setExperienceLevels((prev) => toggleInArray(prev, lvl))}
                                            />
                                        ))}
                                    </View>
                                </View>
                                <View>
                                    <View className="flex-row items-center gap-1.5 mb-2">
                                        <DollarSign size={13} color={C.sub} />
                                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700' }}>MINIMUM SALARY (OPTIONAL)</Text>
                                    </View>
                                    <TextInput
                                        value={salaryMin}
                                        onChangeText={setSalaryMin}
                                        placeholder="e.g. 45000"
                                        keyboardType="numeric"
                                        placeholderTextColor={C.dim}
                                        style={{
                                            color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border,
                                            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)',
                                        }}
                                    />
                                </View>
                            </View>
                        )}

                        {step === 3 && (
                            <View style={{ gap: 12 }}>
                                <Text style={{ color: C.dim, fontSize: 12, lineHeight: 17, marginBottom: 4 }}>
                                    Your CV is used for every cover letter Gemini generates. Add certifications too — as many
                                    as you have, one at a time.
                                </Text>
                                <TouchableOpacity
                                    onPress={uploadCV}
                                    disabled={uploadState.status === 'uploading'}
                                    className="flex-row items-center justify-center gap-2"
                                    style={{
                                        borderWidth: 1, borderColor: `${C.cyan}30`, borderRadius: 14, paddingVertical: 14,
                                        backgroundColor: `${C.cyan}10`,
                                    }}
                                >
                                    {uploadState.status === 'uploading' ? (
                                        <ActivityIndicator size="small" color={C.cyan} />
                                    ) : (
                                        <Upload size={16} color={C.cyan} />
                                    )}
                                    <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 14 }}>
                                        {uploadState.path ? 'Replace CV' : 'Upload your CV'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={uploadCertification}
                                    disabled={uploadState.status === 'uploading'}
                                    className="flex-row items-center justify-center gap-2"
                                    style={{
                                        borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 14,
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                    }}
                                >
                                    <Award size={16} color={C.sub} />
                                    <Text style={{ color: C.sub, fontWeight: '700', fontSize: 14 }}>Add a certification</Text>
                                </TouchableOpacity>

                                {uploadState.message ? (
                                    <Text style={{ color: uploadState.status === 'error' ? C.pink : C.green, fontSize: 12 }}>
                                        {uploadState.message}
                                    </Text>
                                ) : null}

                                <Text style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>
                                    Skip this for now if you want — Vault is always reachable later, this just saves a trip.
                                </Text>
                            </View>
                        )}

                        {step === 4 && (
                            <View style={{ gap: 16 }}>
                                <View>
                                    <View className="flex-row items-center gap-1.5 mb-2">
                                        <Wand2 size={13} color={C.sub} />
                                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700' }}>
                                            COVER LETTER STARTER — PICK A VOICE
                                        </Text>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2">
                                        {(['formal', 'direct', 'enthusiastic'] as const).map((v) => (
                                            <Chip key={v} label={v[0].toUpperCase() + v.slice(1)} active={coverLetterVoice === v} onPress={() => handleSelectVoice(v)} />
                                        ))}
                                    </View>
                                </View>

                                {coverLetterVoice && (
                                    <View>
                                        <TextInput
                                            value={coverLetterDraft}
                                            onChangeText={setCoverLetterDraft}
                                            multiline
                                            numberOfLines={8}
                                            textAlignVertical="top"
                                            style={{
                                                color: C.text, fontSize: 13, lineHeight: 19, borderWidth: 1, borderColor: C.border,
                                                borderRadius: 14, padding: 14, backgroundColor: 'rgba(255,255,255,0.02)', minHeight: 160,
                                            }}
                                        />
                                        <Text style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
                                            This is your base template — every application still gets a job-specific rewrite from
                                            Gemini on top of it, this just sets the starting tone.
                                        </Text>
                                    </View>
                                )}

                                <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginTop: 4 }}>
                                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
                                        Ready to activate
                                    </Text>
                                    <SummaryLine label="Role" value={role || keywords.join(', ') || '—'} />
                                    <SummaryLine label="Locations" value={locations.join(', ') || '—'} />
                                    <SummaryLine label="Work mode" value={REMOTE_MODES.find((m) => m.key === remoteMode)?.label ?? '—'} />
                                    <SummaryLine label="Experience" value={experienceLevels.join(', ') || '—'} />
                                    {error && <Text style={{ color: C.pink, fontSize: 12, marginTop: 8 }}>{error}</Text>}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                </GlassCard>

                <View className="flex-row items-center justify-between mt-5">
                    <TouchableOpacity
                        onPress={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        className="flex-row items-center gap-1.5"
                        style={{ opacity: step === 0 ? 0.35 : 1, paddingVertical: 10, paddingHorizontal: 4 }}
                    >
                        <ArrowLeft size={15} color={C.sub} />
                        <Text style={{ color: C.sub, fontWeight: '700', fontSize: 13 }}>Back</Text>
                    </TouchableOpacity>

                    {step < 4 ? (
                        <TouchableOpacity
                            onPress={() => canAdvance && setStep((s) => Math.min(4, s + 1))}
                            disabled={!canAdvance}
                            className="flex-row items-center gap-2"
                            style={{
                                backgroundColor: canAdvance ? C.cyan : C.border, borderRadius: 999,
                                paddingVertical: 12, paddingHorizontal: 22, opacity: canAdvance ? 1 : 0.5,
                            }}
                        >
                            <Text style={{ color: '#0C0D1D', fontWeight: '800', fontSize: 14 }}>Continue</Text>
                            <ArrowRight size={15} color="#0C0D1D" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleActivate}
                            disabled={saving}
                            className="flex-row items-center gap-2"
                            style={{ backgroundColor: C.green, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 22, opacity: saving ? 0.7 : 1 }}
                        >
                            {saving ? <ActivityIndicator size="small" color="#0C0D1D" /> : <CheckCircle2 size={16} color="#0C0D1D" />}
                            <Text style={{ color: '#0C0D1D', fontWeight: '800', fontSize: 14 }}>
                                {saving ? 'Activating…' : 'Start hunting'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row justify-between py-1.5">
            <Text style={{ color: C.dim, fontSize: 12 }}>{label}</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', maxWidth: '65%', textAlign: 'right' }}>
                {value}
            </Text>
        </View>
    );
}