/**
 * app/(tabs)/configure.tsx
 * OpusHunter — Engine Configuration + Search Rules
 * 2026-07-01 — Complete overhaul with tabbed Engine/Rules interface
 *
 * Engine Tab:
 *   - Location chips (multi-select: Remote, London, New York, Berlin, etc.)
 *   - Work type toggles (Full-time, Part-time, Contract, Internship, Temporary)
 *   - Experience level (Entry, Mid, Senior, Lead, Director)
 *   - Remote preference (Remote only / Hybrid / On-site / Any)
 *   - Salary range toggle
 *   - Job boards to scrape (LinkedIn, Indeed, Glassdoor, etc.)
 *
 * Rules Tab:
 *   - Existing automation_rules CRUD (keywords + location + work types + cover letter)
 */

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Modal, Switch,
    KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp, Layout, FadeIn } from 'react-native-reanimated';
import {
    Plus, Trash2, Edit3, Zap, CheckCircle2, AlertCircle, X,
    Tag, MapPin, Briefcase, FileText, Settings2, Globe,
    DollarSign, BarChart2, Building2, Check, Navigation
} from 'lucide-react-native';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { supabase } from '../../lib/supabase';
import { SwipeableJobCard, type JobData } from '../../components/pipeline/SwipeableJobCard';
import { JobDetailModal } from '../../components/pipeline/JobDetailModal';
import { useEdgeScraper } from '../../hooks/useEdgeScraper';
import type { Job } from '../../types/app.types';
import { C } from '../../lib/theme';
import { GlassCard } from '../../components/ui/GlassCard';




// ── Engine Config Types ───────────────────────────────────────────────────────

const LOCATION_PRESETS = [
    'London', 'New York', 'Berlin', 'Amsterdam',
    'Paris', 'Toronto', 'Sydney', 'Singapore', 'Dubai',
    'San Francisco', 'Austin', 'Dublin', 'Warsaw', 'Barcelona',
];

const WORK_TYPE_OPTIONS = ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERNSHIP', 'TEMPORARY'];
const WORK_TYPE_LABELS: { [key: string]: string } = {
    FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract',
    INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
};

const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Director'];
const EXPERIENCE_COLORS: { [key: string]: string } = {
    Entry: C.green, Mid: C.cyan, Senior: C.purple, Lead: C.amber, Director: C.pink,
};

const REMOTE_OPTIONS = [
    { key: 'remote', label: 'Remote Only', icon: Globe },
    { key: 'hybrid', label: 'Hybrid', icon: Building2 },
    { key: 'onsite', label: 'On-site', icon: Building2 },
    { key: 'any', label: 'Any', icon: MapPin },
];

const JOB_BOARDS = [
    { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
    { key: 'indeed', label: 'Indeed', color: '#2557A7' },
    { key: 'glassdoor', label: 'Glassdoor', color: '#0CAA41' },
    { key: 'jsearch', label: 'JSearch API', color: C.cyan },
    { key: 'remoteok', label: 'RemoteOK', color: '#FF4742' },
    { key: 'weworkremotely', label: 'WWR', color: C.purple },
];

const SALARY_RANGES = ['Any', '$50k+', '$75k+', '$100k+', '$125k+', '$150k+', '$200k+'];

interface EngineConfig {
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

const DEFAULT_ENGINE: EngineConfig = {
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





// ── Rule Types ────────────────────────────────────────────────────────────────

interface AutomationRule {
    id: string;
    keywords: string[];
    location: string;
    work_types: string[];
    base_cover_letter: string;
    is_active: boolean | null;
    created_at: string;
}

interface RuleFormState {
    keywords: string;
    location: string;
    work_types: string[];
    base_cover_letter: string;
    is_active: boolean;
}

const DEFAULT_FORM: RuleFormState = {
    keywords: '',
    location: 'Remote',
    work_types: ['FULLTIME'],
    base_cover_letter: '',
    is_active: true,
};

function parseKeywords(raw: string): string[] {
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
}


// ── Toggle Chip ───────────────────────────────────────────────────────────────

const ToggleChip = memo(({
    label, active, color = C.cyan, onPress, small = false,
}: {
    label: string; active: boolean; color?: string; onPress: () => void; small?: boolean;
}) => (
    <AnimatedPressable
        onPress={onPress}
        scaleDownTo={0.92}
        activeOpacity={0.75}
        style={[
            st.chip,
            small && st.chipSmall,
            active
                ? { borderColor: `${color}55`, backgroundColor: `${color}12` }
                : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.025)' },
        ]}
    >
        {active && <Check size={small ? 10 : 12} color={color} />}
        <Text style={[st.chipText, small && st.chipTextSmall, { color: active ? color : C.sub }]}>{label}</Text>
    </AnimatedPressable>
));
ToggleChip.displayName = 'ToggleChip';

// ── Section Header ────────────────────────────────────────────────────────────

const SectionHeader = memo(({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string; }) => (
    <View style={st.sectionHeader}>
        <View style={[st.sectionIconBox, { backgroundColor: `${C.cyan}10`, borderColor: `${C.cyan}10` }]}>
            <Icon size={16} color={C.cyan} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={st.sectionTitle}>{title}</Text>
            {sub && <Text style={st.sectionSub}>{sub}</Text>}
        </View>
    </View>
));
SectionHeader.displayName = 'SectionHeader';

// ── Engine Tab ────────────────────────────────────────────────────────────────

function EngineTab({
    config,
    setConfig,
    onScrape,
    isScraping,
    activeRulesCount,
}: {
    config: EngineConfig;
    setConfig: (c: EngineConfig) => void;
    onScrape: () => void;
    isScraping: boolean;
    activeRulesCount: number;
}) {
    const toggle = useCallback(<K extends keyof EngineConfig,>(key: K, val: string) => {
        setConfig({
            ...config,
            [key]: (config[key] as string[]).includes(val)
                ? (config[key] as string[]).filter((v) => v !== val)
                : [...(config[key] as string[]), val],
        });
    }, [config, setConfig]);

    const [customLoc, setCustomLoc] = useState('');

    const addCustomLocation = () => {
        const loc = customLoc.trim();
        if (loc && !config.locations.includes(loc)) {
            setConfig({ ...config, locations: [...config.locations, loc] });
        }
        setCustomLoc('');
    };

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={st.tabScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* ── Scraper CTA ── */}
            <Animated.View entering={FadeInDown.delay(60).springify()} style={[st.section, st.scraperCard]}>
                <View style={st.scraperCardLeft}>
                    <View style={st.scraperPulse}>
                        <Zap size={18} color={C.cyan} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={st.scraperTitle}>Engine Ready</Text>
                        <Text style={st.scraperSub}>
                            {activeRulesCount > 0
                                ? `${activeRulesCount} active rule${activeRulesCount > 1 ? 's' : ''} · merging all sources`
                                : 'Configure rules below then run'}
                        </Text>
                    </View>
                </View>
                <AnimatedPressable
                    onPress={onScrape}
                    disabled={isScraping || activeRulesCount === 0}
                    scaleDownTo={0.96}
                    style={[st.scrapeBtn, (isScraping || activeRulesCount === 0) && { opacity: 0.45 }]}
                    activeOpacity={0.8}
                >
                    {isScraping
                        ? <ActivityIndicator color="#000" size="small" />
                        : <Text style={st.scrapeBtnText}>RUN</Text>}
                </AnimatedPressable>
            </Animated.View>

            {/* ── Locations ── */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={st.section}>
                <SectionHeader icon={MapPin} title="Target Locations" sub="Enter cities or countries to target" />

                {/* Custom location input */}
                <View style={[st.customLocRow, { marginBottom: 16 }]}>
                    <TextInput
                        style={st.customLocInput}
                        placeholder="e.g. Sweden, London, New York..."
                        placeholderTextColor={C.dim}
                        value={customLoc}
                        onChangeText={setCustomLoc}
                        onSubmitEditing={addCustomLocation}
                        returnKeyType="done"
                        autoCorrect={false}
                        {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                    />
                    <TouchableOpacity
                        onPress={addCustomLocation}
                        style={st.customLocBtn}
                        activeOpacity={0.8}
                        disabled={!customLoc.trim()}
                    >
                        <Plus size={16} color={customLoc.trim() ? '#000' : C.sub} />
                    </TouchableOpacity>
                </View>

                {/* Selected locations */}
                {config.locations.length > 0 ? (
                    <View style={st.chipGrid}>
                        {config.locations.map((loc) => (
                            <TouchableOpacity
                                key={loc}
                                onPress={() => toggle('locations', loc)}
                                style={[st.chip, { borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0A` }]}
                            >
                                <Text style={[st.chipText, { color: C.cyan }]}>{loc}</Text>
                                <X size={10} color={C.cyan} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={{ paddingVertical: 12, alignItems: 'center', backgroundColor: '#0C0D1D', borderRadius: 12, borderWidth: 1, borderColor: '#333' }}>
                        <Text style={{ color: C.dim, fontSize: 12 }}>No locations added yet.</Text>
                    </View>
                )}
            </Animated.View>

            {/* ── Work Types ── */}
            <Animated.View entering={FadeInDown.delay(140).springify()} style={st.section}>
                <SectionHeader icon={Briefcase} title="Work Types" sub="Toggle all that match your search" />
                <View style={st.chipGrid}>
                    {WORK_TYPE_OPTIONS.map((wt) => (
                        <ToggleChip
                            key={wt}
                            label={WORK_TYPE_LABELS[wt]}
                            active={config.workTypes.includes(wt)}
                            color={C.purple}
                            onPress={() => toggle('workTypes', wt)}
                        />
                    ))}
                </View>
            </Animated.View>

            {/* ── Experience Level ── */}
            <Animated.View entering={FadeInDown.delay(180).springify()} style={st.section}>
                <SectionHeader icon={BarChart2} title="Experience Level" sub="Multi-select — scraper searches all selected" />
                <View style={st.chipGrid}>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                        <ToggleChip
                            key={lvl}
                            label={lvl}
                            active={config.experienceLevels.includes(lvl)}
                            color={EXPERIENCE_COLORS[lvl]}
                            onPress={() => toggle('experienceLevels', lvl)}
                        />
                    ))}
                </View>
            </Animated.View>

            {/* ── Remote Preference ── */}
            <Animated.View entering={FadeInDown.delay(220).springify()} style={st.section}>
                <SectionHeader icon={Globe} title="Remote Preference" sub="Filters job listings by work arrangement" />
                <View style={st.remoteRow}>
                    {REMOTE_OPTIONS.map(({ key, label }) => {
                        const active = config.remotePreference === key;
                        return (
                            <AnimatedPressable
                                key={key}
                                onPress={() => setConfig({ ...config, remotePreference: key })}
                                scaleDownTo={0.94}
                                style={[
                                    st.remoteBtn,
                                    active
                                        ? { borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}15` }
                                        : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.04)' },
                                ]}
                                activeOpacity={0.75}
                            >
                                {active && (
                                    <View style={st.remoteDot} />
                                )}
                                <Text style={[st.remoteBtnText, { color: active ? C.cyan : C.sub }]}>{label}</Text>
                            </AnimatedPressable>
                        );
                    })}
                </View>
            </Animated.View>

            {/* ── Minimum Salary ── */}
            <Animated.View entering={FadeInDown.delay(260).springify()} style={st.section}>
                <SectionHeader icon={DollarSign} title="Minimum Salary" sub="Filter out roles below this threshold" />
                <View style={st.salaryRow}>
                    {SALARY_RANGES.map((range) => (
                        <ToggleChip
                            key={range}
                            label={range}
                            active={config.salaryMin === range}
                            color={C.amber}
                            onPress={() => setConfig({ ...config, salaryMin: range })}
                        />
                    ))}
                </View>
            </Animated.View>

            {/* ── Job Boards ── */}
            <Animated.View entering={FadeInDown.delay(300).springify()} style={st.section}>
                <SectionHeader icon={Globe} title="Job Boards" sub="Sources the scraper will query" />
                <View style={st.boardGrid}>
                    {JOB_BOARDS.map((board) => {
                        const active = config.jobBoards.includes(board.key);
                        return (
                            <TouchableOpacity
                                key={board.key}
                                onPress={() => toggle('jobBoards', board.key)}
                                style={[
                                    st.boardCard,
                                    active
                                        ? { borderColor: `${board.color}60`, backgroundColor: `${board.color}15` }
                                        : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.04)' },
                                ]}
                                activeOpacity={0.8}
                            >
                                {active && (
                                    <View style={[st.boardCheck, { backgroundColor: board.color }]}>
                                        <Check size={9} color="#000" />
                                    </View>
                                )}
                                <Text style={[st.boardLabel, { color: active ? board.color : C.sub }]}>
                                    {board.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>

            {/* ── Behavior Toggles ── */}
            <Animated.View entering={FadeInDown.delay(340).springify()} style={st.section}>
                <SectionHeader icon={Settings2} title="Engine Behavior" />
                {[
                    { key: 'autoApply', label: 'Auto-Apply', sub: 'Submit applications automatically on match', color: C.pink },
                    { key: 'skipApplied', label: 'Skip Already Applied', sub: 'Never apply twice to the same job', color: C.cyan },
                    { key: 'activeRulesOnly', label: 'Active Rules Only', sub: 'Ignore disabled search rules', color: C.purple },
                ].map(({ key, label, sub, color }) => (
                    <View key={key} style={st.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={st.toggleLabel}>{label}</Text>
                            <Text style={st.toggleSub}>{sub}</Text>
                        </View>
                        <Switch
                            value={(config as any)[key] as boolean}
                            onValueChange={(v) => setConfig({ ...config, [key]: v })}
                            trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${color}50` }}
                            thumbColor={(config as any)[key] ? color : 'rgba(255,255,255,0.25)'}
                        />
                    </View>
                ))}
            </Animated.View>
        </ScrollView>
    );
}

// ── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({
    rule, onEdit, onDelete, onToggle,
}: {
    rule: AutomationRule;
    onEdit: (rule: AutomationRule) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, active: boolean) => void;
}) {
    return (
        <Animated.View
            layout={Layout.springify().damping(20)}
            entering={FadeInDown.springify()}
            exiting={FadeOutUp.duration(200)}
            style={[st.ruleCard, { borderColor: rule.is_active ? `${C.cyan}22` : C.border }]}
        >
            <View style={[st.ruleActiveLine, { backgroundColor: rule.is_active ? C.cyan : 'transparent' }]} />
            <View style={{ flex: 1 }}>
                <View style={st.ruleRow}>
                    <Tag size={12} color={C.cyan} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: 'row' }}>
                        {rule.keywords.map((kw) => (
                            <View key={kw} style={st.kwChip}>
                                <Text style={st.kwChipText}>{kw}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
                <View style={[st.ruleRow, { marginTop: 7 }]}>
                    <MapPin size={12} color={C.purple} />
                    <Text style={st.ruleMeta}>{rule.location}</Text>
                    <View style={st.ruleDot} />
                    <Briefcase size={12} color={C.purple} />
                    <Text style={st.ruleMeta}>{rule.work_types.map(wt => WORK_TYPE_LABELS[wt] ?? wt).join(', ')}</Text>
                </View>
                {rule.base_cover_letter.length > 0 && (
                    <View style={[st.ruleRow, { marginTop: 5 }]}>
                        <FileText size={12} color={C.dim} />
                        <Text style={st.ruleMetaSub} numberOfLines={1}>
                            {rule.base_cover_letter.substring(0, 55)}…
                        </Text>
                    </View>
                )}
            </View>
            <View style={st.ruleActions}>
                <Switch
                    value={rule.is_active ?? false}
                    onValueChange={(v) => onToggle(rule.id, v)}
                    trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${C.cyan}50` }}
                    thumbColor={rule.is_active ? C.cyan : 'rgba(255,255,255,0.25)'}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <TouchableOpacity onPress={() => onEdit(rule)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Edit3 size={16} color={C.purple} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(rule.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Trash2 size={16} color={C.pink} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

// ── Rule Form Modal ───────────────────────────────────────────────────────────

function RuleFormModal({
    visible, initial, onClose, onSave, saving,
}: {
    visible: boolean;
    initial: RuleFormState;
    onClose: () => void;
    onSave: (form: RuleFormState) => void;
    saving: boolean;
}) {
    const [form, setForm] = useState<RuleFormState>(initial);
    useEffect(() => { if (visible) setForm(initial); }, [visible, initial]);

    const toggleWorkType = (wt: string) => {
        setForm((f) => ({
            ...f,
            work_types: f.work_types.includes(wt)
                ? f.work_types.filter((w) => w !== wt)
                : [...f.work_types, wt],
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={st.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}
                >
                    <View style={st.modalCard}>
                        <View style={st.modalHeader}>
                            <Text style={st.modalTitle}>{initial.keywords ? 'Edit Rule' : 'New Search Rule'}</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
                            <View>
                                <Text style={st.fieldLabel}>KEYWORDS <Text style={{ color: C.sub, fontWeight: '500' }}>(comma-separated)</Text></Text>
                                <TextInput
                                    style={st.textInput}
                                    placeholder="React Native, TypeScript, Expo..."
                                    placeholderTextColor={C.dim}
                                    value={form.keywords}
                                    onChangeText={(v) => setForm((f) => ({ ...f, keywords: v }))}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                                />
                            </View>

                            <View>
                                <Text style={st.fieldLabel}>LOCATION</Text>
                                <TextInput
                                    style={st.textInput}
                                    placeholder="Remote, London, New York..."
                                    placeholderTextColor={C.dim}
                                    value={form.location}
                                    onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
                                    autoCorrect={false}
                                    {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                                />
                            </View>

                            <View>
                                <Text style={st.fieldLabel}>WORK TYPES</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                    {WORK_TYPE_OPTIONS.map((wt) => {
                                        const active = form.work_types.includes(wt);
                                        return (
                                            <TouchableOpacity
                                                key={wt}
                                                onPress={() => toggleWorkType(wt)}
                                                style={[
                                                    st.chip,
                                                    active
                                                        ? { borderColor: `${C.cyan}55`, backgroundColor: `${C.cyan}10` }
                                                        : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' },
                                                ]}
                                            >
                                                {active && <Check size={11} color={C.cyan} />}
                                                <Text style={[st.chipText, { color: active ? C.cyan : C.sub }]}>
                                                    {WORK_TYPE_LABELS[wt]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View>
                                <Text style={st.fieldLabel}>
                                    BASE COVER LETTER{' '}
                                    <Text style={{ color: C.sub, fontWeight: '500' }}>(AI personalises per job)</Text>
                                </Text>
                                <TextInput
                                    style={[st.textInput, { minHeight: 130, paddingTop: 14 }]}
                                    placeholder={`Dear Hiring Team,\n\nI am excited to apply for this role...`}
                                    placeholderTextColor={C.dim}
                                    value={form.base_cover_letter}
                                    onChangeText={(v) => setForm((f) => ({ ...f, base_cover_letter: v }))}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    autoCorrect={false}
                                    {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                                />
                                <Text style={{ fontSize: 10, color: C.dim, marginTop: 3, lineHeight: 12 }}>
                                    Use [COMPANY], [ROLE], [NAME] — Gemini replaces them automatically.
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                                <View>
                                    <Text style={st.fieldLabel}>ACTIVE</Text>
                                    <Text style={{ fontSize: 11, color: C.sub }}>Scraper uses all active rules</Text>
                                </View>
                                <Switch
                                    value={form.is_active}
                                    onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                                    trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${C.cyan}50` }}
                                    thumbColor={form.is_active ? C.cyan : 'rgba(255,255,255,0.25)'}
                                />
                            </View>
                        </ScrollView>

                        <View style={st.modalFooter}>
                            <TouchableOpacity
                                onPress={() => onSave(form)}
                                disabled={saving || !form.keywords.trim() || !form.location.trim()}
                                style={[st.saveBtn, (!form.keywords.trim() || !form.location.trim()) && { opacity: 0.45 }]}
                                activeOpacity={0.8}
                            >
                                {saving
                                    ? <ActivityIndicator color="#000" />
                                    : <Text style={st.saveBtnText}>Save Rule</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// ── Rules Tab ─────────────────────────────────────────────────────────────────

function RulesTab({
    rules, isLoading, onAdd, onEdit, onDelete, onToggle,
}: {
    rules: AutomationRule[];
    isLoading: boolean;
    onAdd: () => void;
    onEdit: (rule: AutomationRule) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, active: boolean) => void;
}) {
    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.cyan} />
            </View>
        );
    }

    if (rules.length === 0) {
        return (
            <ScrollView contentContainerStyle={st.tabScroll}>
                <Animated.View entering={FadeInDown.springify()} style={st.emptyState}>
                    <View style={st.emptyIcon}>
                        <Tag size={26} color={C.purple} />
                    </View>
                    <Text style={st.emptyTitle}>No Rules Yet</Text>
                    <Text style={st.emptyBody}>
                        Rules power the scraper — each rule defines keywords, location, and work types for automated job hunting.
                    </Text>
                    <TouchableOpacity onPress={onAdd} style={st.emptyAddBtn} activeOpacity={0.8}>
                        <Plus size={14} color={C.cyan} />
                        <Text style={st.emptyAddText}>Add First Rule</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={st.tabScroll}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.springify()} style={st.section}>
                <View style={{ gap: 11 }}>
                    {rules.map((rule, index) => (
                        <Animated.View
                            key={rule.id}
                            style={[st.section, { marginBottom: index === rules.length - 1 ? 0 : 16 }]}
                            entering={FadeInDown.delay(index * 50).springify()}
                        >
                            <RuleCard
                                rule={rule}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onToggle={onToggle}
                            />
                        </Animated.View>
                    ))}
                </View>
            </Animated.View>
        </ScrollView>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type TabKey = 'engine' | 'rules';

export default function ConfigureScreen() {
    const queryClient = useQueryClient();
    const { triggerScrape, isLoading: isScraping, isSuccess: scrapeSuccess, error: scrapeError } = useEdgeScraper();

    const [activeTab, setActiveTab] = useState<TabKey>('engine');
    const [engineConfig, setEngineConfig] = useState<EngineConfig>(DEFAULT_ENGINE);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (banner) {
            const t = setTimeout(() => setBanner(null), 4000);
            return () => clearTimeout(t);
        }
    }, [banner]);

    useEffect(() => {
        if (scrapeSuccess) setBanner({ type: 'success', text: 'Scrape complete — pipeline updated.' });
        if (scrapeError) setBanner({ type: 'error', text: scrapeError });
    }, [scrapeSuccess, scrapeError]);

    const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
        queryKey: ['automation_rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('automation_rules')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw new Error(error.message);
            return (data ?? []) as AutomationRule[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (form: RuleFormState) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');
            const payload = {
                user_id: user.id,
                keywords: parseKeywords(form.keywords),
                location: form.location.trim(),
                work_types: form.work_types,
                base_cover_letter: form.base_cover_letter.trim(),
                is_active: form.is_active,
            };
            if (editingRule) {
                const { error } = await supabase.from('automation_rules').update(payload).eq('id', editingRule.id);
                if (error) throw new Error(error.message);
            } else {
                const { error } = await supabase.from('automation_rules').insert(payload);
                if (error) throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
            setModalVisible(false);
            setEditingRule(null);
            setBanner({ type: 'success', text: editingRule ? 'Rule updated.' : 'Rule created.' });
        },
        onError: (e: Error) => setBanner({ type: 'error', text: e.message }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('automation_rules').delete().eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
            setDeleteConfirm(null);
            setBanner({ type: 'success', text: 'Rule deleted.' });
        },
        onError: (e: Error) => setBanner({ type: 'error', text: e.message }),
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase.from('automation_rules').update({ is_active: active }).eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation_rules'] }),
    });

    const openCreate = () => { setEditingRule(null); setModalVisible(true); };
    const openEdit = (rule: AutomationRule) => { setEditingRule(rule); setModalVisible(true); };

    const formInitial: RuleFormState = editingRule
        ? {
            keywords: editingRule.keywords.join(', '),
            location: editingRule.location,
            work_types: editingRule.work_types,
            base_cover_letter: editingRule.base_cover_letter,
            is_active: editingRule.is_active ?? true,
        }
        : DEFAULT_FORM;

    const activeRulesCount = rules.filter((r: AutomationRule) => r.is_active).length;

    const TABS: { key: TabKey; label: string; icon: any }[] = [
        { key: 'engine', label: 'Engine', icon: Zap },
        { key: 'rules', label: `Rules ${rules.length > 0 ? `(${rules.length})` : ''}`, icon: Tag },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>


            {/* ── Banner ── */}
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()}
                    exiting={FadeOutUp.duration(200)}
                    style={[
                        st.banner,
                        {
                            borderColor: banner.type === 'success' ? `${C.cyan}35` : `${C.pink}35`,
                            backgroundColor: banner.type === 'success' ? `${C.cyan}0A` : `${C.pink}0A`,
                            marginHorizontal: 20,
                        },
                    ]}
                >
                    {banner.type === 'success'
                        ? <CheckCircle2 size={15} color={C.cyan} />
                        : <AlertCircle size={15} color={C.pink} />}
                    <Text style={[st.bannerText, { color: banner.type === 'success' ? C.cyan : C.pink }]}>
                        {banner.text}
                    </Text>
                </Animated.View>
            )}

            {/* ── Tabs ── */}
            <View style={st.tabBar}>
                {TABS.map(({ key, label, icon: Icon }) => {
                    const active = activeTab === key;
                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => setActiveTab(key)}
                            style={[st.tabBtn, active && st.tabBtnActive]}
                            activeOpacity={0.75}
                        >
                            <Icon size={14} color={active ? C.cyan : C.sub} />
                            <Text style={[st.tabBtnText, { color: active ? C.cyan : C.sub }]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Tab content ── */}
            {activeTab === 'engine' ? (
                <EngineTab
                    config={engineConfig}
                    setConfig={setEngineConfig}
                    onScrape={triggerScrape}
                    isScraping={isScraping}
                    activeRulesCount={activeRulesCount}
                />
            ) : (
                <RulesTab
                    rules={rules}
                    isLoading={isLoading}
                    onAdd={openCreate}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onToggle={(id, active) => toggleMutation.mutate({ id, active })}
                />
            )}

            {/* ── Rule form modal ── */}
            <RuleFormModal
                visible={modalVisible}
                initial={formInitial}
                onClose={() => { setModalVisible(false); setEditingRule(null); }}
                onSave={(form) => saveMutation.mutate(form)}
                saving={saveMutation.isPending}
            />

            {/* ── Delete confirmation ── */}
            <Modal visible={!!deleteConfirm} transparent animationType="fade">
                <View style={st.modalOverlay}>
                    <View style={st.confirmCard}>
                        <Text style={st.confirmTitle}>Delete Rule?</Text>
                        <Text style={st.confirmBody}>This cannot be undone. Jobs already scraped will remain.</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                            <TouchableOpacity
                                onPress={() => setDeleteConfirm(null)}
                                style={[st.confirmBtn, { borderColor: C.border }]}
                            >
                                <Text style={[st.confirmBtnText, { color: C.sub }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
                                disabled={deleteMutation.isPending}
                                style={[st.confirmBtn, { borderColor: `${C.pink}50`, backgroundColor: `${C.pink}12` }]}
                            >
                                {deleteMutation.isPending
                                    ? <ActivityIndicator color={C.pink} size="small" />
                                    : <Text style={[st.confirmBtnText, { color: C.pink }]}>Delete</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
    scrollDesktop: { maxWidth: 1100, width: '100%', alignSelf: 'center' as any },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    greeting: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    headerSub: { fontSize: 13, color: C.sub, marginTop: 3 },
    scrapeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
        borderWidth: 1, borderColor: `${C.cyan}30`,
        backgroundColor: `${C.cyan}08`,
    },
    scrapeBtnText: { fontSize: 10, fontWeight: '800', color: C.cyan, letterSpacing: 1.5 },

    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    skeleton: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)' },

    batchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    batchTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    batchCount: { fontSize: 13, fontWeight: '700', color: C.sub },
    batchCurrent: { fontSize: 12, color: C.sub, marginTop: 8, fontStyle: 'italic' },

    progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%' as any, borderRadius: 2, backgroundColor: C.cyan },

    queueBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    },
    queueBtnText: { fontSize: 12, fontWeight: '700' },

    startEngineBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.cyan, borderRadius: 18, padding: 18, marginBottom: 24,
        ...(Platform.OS === 'web'
            ? ({ boxShadow: `0 0 24px ${C.cyan}55` } as any)
            : { shadowColor: C.cyan, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } }),
    },
    startEngineBtnTitle: { fontSize: 13, fontWeight: '900', color: '#000', letterSpacing: 1.5, marginBottom: 2 },
    startEngineBtnSub: { fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: '600' },

    deckSection: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
    sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sectionLinkText: { fontSize: 12, fontWeight: '700', color: C.cyan },

    deck: { height: 440, position: 'relative', alignItems: 'center' },
    cardLayer: { position: 'absolute', width: '100%', height: 400 },
    bgCard: { width: '100%', height: 400, borderRadius: 24, borderWidth: 1, borderColor: C.border },

    remainingBadge: {
        position: 'absolute', bottom: 0, alignSelf: 'center',
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        backgroundColor: 'rgba(8,16,24,0.8)', borderWidth: 1, borderColor: C.border,
    },
    remainingText: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 1 },

    emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
        borderWidth: 1, borderColor: `${C.cyan}35`, backgroundColor: `${C.cyan}08`,
    },

    center: { alignItems: 'center', paddingVertical: 40 },
    centerText: { fontSize: 14, color: C.sub },
    retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: `${C.cyan}35` },

    quickIcon: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
    quickSub: { fontSize: 12, color: C.sub },

    // Legacy configure-specific styles
    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
    },
    bannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

    tabBar: {
        flexDirection: 'row', marginHorizontal: 0, marginBottom: 14,
        backgroundColor: 'rgba(255,255,255,0.025)',
        borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 3, gap: 3,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
        borderColor: 'transparent',
    },
    tabBtnActive: {
        borderColor: `${C.cyan}28`,
        backgroundColor: `${C.cyan}0C`,
    },
    tabBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

    tabScroll: {
        paddingHorizontal: 20,
        paddingBottom: 120,
        gap: 0,
    },

    scraperCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderRadius: 18, borderWidth: 1,
        borderColor: `${C.cyan}28`, backgroundColor: `${C.cyan}07`,
        marginBottom: 20, gap: 14,
    },
    scraperCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    scraperPulse: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: `${C.cyan}12`, borderWidth: 1, borderColor: `${C.cyan}30`,
        alignItems: 'center', justifyContent: 'center',
    },
    scraperTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    scraperSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    scrapeBtnOld: {
        paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
        backgroundColor: C.cyan, minWidth: 62, alignItems: 'center',
    },
    scrapeBtnTextOld: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

    section: {
        marginBottom: 16,
        borderRadius: 18, borderWidth: 1, borderColor: C.border,
        padding: 16,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    sectionHeaderOld: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    sectionIconBox: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: `${C.cyan}10`, borderWidth: 1, borderColor: `${C.cyan}20`,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
    },
    sectionTitleOld: { fontSize: 13, fontWeight: '800', color: C.text },
    sectionSub: { fontSize: 11, color: C.sub, marginTop: 2, lineHeight: 16 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 10, borderWidth: 1,
    },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipText: { fontSize: 12, fontWeight: '700' },
    chipTextSmall: { fontSize: 10 },

    customLocRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    customLocInput: {
        flex: 1, height: 42, borderRadius: 10, borderWidth: 1,
        borderColor: C.borderCyan, backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 12, color: C.text, fontSize: 13,
    },
    customLocBtn: {
        width: 42, height: 42, borderRadius: 10,
        backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center',
    },

    remoteRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    remoteBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    remoteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan },
    remoteBtnText: { fontSize: 12, fontWeight: '700' },

    salaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },

    boardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boardCard: {
        flex: 1,
        minWidth: '30%',
        aspectRatio: 1.2,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boardCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boardLabel: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },

    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    toggleLabel: { fontSize: 13, fontWeight: '700', color: C.text },
    toggleSub: { fontSize: 11, color: C.sub, marginTop: 2 },

    ruleCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 13, borderRadius: 16, borderWidth: 1,
        backgroundColor: C.card, overflow: 'hidden', gap: 11,
    },
    ruleActiveLine: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.sub },
    ruleMeta: { fontSize: 11, color: C.sub },
    ruleMetaSub: { fontSize: 10, color: C.dim, flex: 1 },
    ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 13, flexShrink: 0 },
    kwChip: {
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
        borderWidth: 1, borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}0A`,
    },
    kwChipText: { fontSize: 10, color: C.cyan, fontWeight: '700' },

    emptyState: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 32 },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 1, borderColor: `${C.purple}40`,
        alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    },
    emptyStateTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptyBody: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12,
        borderWidth: 1, borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0D`,
    },
    emptyAddText: { color: C.cyan, fontSize: 13, fontWeight: '700' },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: C.core,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderColor: C.borderCyan,
        maxHeight: '92%', overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    modalFooter: {
        padding: 20, borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    saveBtn: {
        height: 52, borderRadius: 14,
        backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    fieldLabel: {
        fontSize: 9, fontWeight: '900', color: C.cyan,
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: C.borderCyan,
        borderRadius: 12, padding: 14,
        color: C.text, fontSize: 14,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },

    confirmCard: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.core, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 28, borderWidth: 1, borderColor: C.borderError,
    },
    confirmTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
    confirmBody: { fontSize: 13, color: C.sub, lineHeight: 20 },
    confirmBtn: {
        flex: 1, height: 48, borderRadius: 12,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    confirmBtnText: { fontSize: 14, fontWeight: '700' },
});