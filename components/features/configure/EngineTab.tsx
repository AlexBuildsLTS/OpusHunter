/**
 * components/features/configure/EngineTab.tsx
 * OpusHunter — Engine Configuration Tab
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx (logic unchanged,
 * only the file boundary moved — see ConfigureScreen.tsx for the full
 * split rationale).
 */

import React, { useCallback, useState, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Switch, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
    Plus, Zap, Check, MapPin, Briefcase, Globe, DollarSign, BarChart2, Settings2, X,
} from 'lucide-react-native';
import { AnimatedPressable } from '../../ui/AnimatedPressable';
import { C } from '../../../lib/theme';
import { st } from './styles';
import {
    WORK_TYPE_OPTIONS, WORK_TYPE_LABELS, EXPERIENCE_LEVELS, EXPERIENCE_COLORS,
    REMOTE_OPTIONS, JOB_BOARDS, SALARY_RANGES,
} from './constants';
import type { EngineConfig } from './types';

// ── Toggle Chip ───────────────────────────────────────────────────────────────

export const ToggleChip = memo(({
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

export const SectionHeader = memo(({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) => (
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

export function EngineTab({
    config, setConfig, onScrape, isScraping, activeRulesCount,
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
                                {active && <View style={st.remoteDot} />}
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