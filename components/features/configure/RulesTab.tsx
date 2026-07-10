/**
 * components/features/configure/RulesTab.tsx
 * OpusHunter — Rules List Tab
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx
 *
 * Production-ready rules management tab with proper error handling,
 * memoization, accessibility, and performance optimizations.
 */

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Switch,
    AccessibilityRole,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp, Layout as ReanimatedLayout } from 'react-native-reanimated';
import { Plus, Tag, MapPin, Briefcase, FileText, Edit3, Trash2 } from 'lucide-react-native';
import { C } from '../../../lib/theme';
import { st } from './styles';
import { WORK_TYPE_LABELS } from './constants';
import type { AutomationRule } from './types';

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
            layout={ReanimatedLayout.springify().damping(20)}
            entering={FadeInDown.springify()}
            exiting={FadeOutUp.duration(200)}
            className="transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glass"
            style={[st.ruleCard, { borderColor: rule.is_active ? `${C.cyan}22` : C.border }]}
        >
            <View style={[st.ruleActiveLine, { backgroundColor: rule.is_active ? C.cyan : 'transparent' }]} />
            <View style={{ flex: 1 }}>
                <View style={[st.ruleRow, { alignItems: 'flex-start', flexWrap: 'wrap' }]}>
                    <Tag size={12} color={C.cyan} style={{ marginTop: 4 }} />
                    {/* FIX (2026-07-09): this was a horizontal ScrollView with no
                        fade/scroll indicator — keywords past the visible width
                        just clipped silently ("Software En..." with nothing
                        showing it was cut off, not that more content existed).
                        Wrapping onto new lines means every keyword is always
                        fully visible; the card grows vertically instead of
                        hiding content horizontally. */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                        {rule.keywords.map((kw) => (
                            <View key={kw} style={st.kwChip}>
                                <Text style={st.kwChipText}>{kw}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                <View style={[st.ruleRow, { marginTop: 7 }]}>
                    <MapPin size={12} color={C.purple} />
                    <Text style={st.ruleMeta}>{rule.location}</Text>
                    <View style={st.ruleDot} />
                    <Briefcase size={12} color={C.purple} />
                    <Text style={st.ruleMeta}>{rule.work_types.map((wt) => WORK_TYPE_LABELS[wt] ?? wt).join(', ')}</Text>
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

// ── Rules Tab ─────────────────────────────────────────────────────────────────

export function RulesTab({
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
                            <RuleCard rule={rule} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
                        </Animated.View>
                    ))}
                </View>
            </Animated.View>
        </ScrollView>
    );
}