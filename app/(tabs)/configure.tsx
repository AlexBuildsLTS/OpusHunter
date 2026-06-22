/**
 * app/(tabs)/configure.tsx
 * OpusHunter — Search Rule Configuration
 * P3-05: Keyword / Location / Work-type rule management
 *
 * Features:
 *   - List user's automation_rules from Supabase
 *   - Add / Edit / Delete rules
 *   - Each rule: keywords[], location, work_types[], base_cover_letter, is_active toggle
 *   - "Run Scraper" button that fires useEdgeScraper with the merged rules
 *   - Fully mobile + desktop adaptive
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Modal, Switch,
    KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { Plus, Trash2, Edit3, Zap, CheckCircle2, AlertCircle, X, Tag, MapPin, Briefcase, FileText } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useEdgeScraper } from '../../hooks/useEdgeScraper';

// ── Theme ─────────────────────────────────────────────────────────────────────

const C = {
    cyan: '#00D4FF',
    purple: '#7B5EA7',
    pink: '#E8436A',
    green: '#00C67D',
    bg: '#0A1419',
    card: '#0B1822',
    border: 'rgba(120,200,240,0.09)',
    text: '#D8E4EC',
    sub: 'rgba(216,228,236,0.45)',
};

const WORK_TYPE_OPTIONS = ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERNSHIP', 'TEMPORARY'];

// ── Types ─────────────────────────────────────────────────────────────────────

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
    keywords: string;        // comma-separated string for the input
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseKeywords(raw: string): string[] {
    return raw.split(',').map((k) => k.trim()).filter(Boolean);
}

function AmbientBg() {
    if (Platform.OS !== 'web') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 90% 10%, rgba(123,94,167,0.07) 0%, transparent 65%)' }} />
        </View>
    );
}

// ── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({
    rule,
    onEdit,
    onDelete,
    onToggle,
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
            style={[
                styles.ruleCard,
                { borderColor: rule.is_active ? `${C.cyan}20` : `${C.border}` },
            ]}
        >
            {/* Active indicator */}
            <View style={[styles.ruleActiveLine, { backgroundColor: rule.is_active ? C.cyan : 'transparent' }]} />

            <View style={{ flex: 1 }}>
                {/* Keywords row */}
                <View style={styles.ruleRow}>
                    <Tag size={13} color={C.cyan} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: 'row' }}>
                        {rule.keywords.map((kw) => (
                            <View key={kw} style={styles.kwChip}>
                                <Text style={styles.kwChipText}>{kw}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Location */}
                <View style={[styles.ruleRow, { marginTop: 8 }]}>
                    <MapPin size={13} color={C.purple} />
                    <Text style={styles.ruleMeta}>{rule.location}</Text>
                    <View style={styles.ruleDot} />
                    <Briefcase size={13} color={C.purple} />
                    <Text style={styles.ruleMeta}>{rule.work_types.join(', ')}</Text>
                </View>

                {/* Cover letter preview */}
                {rule.base_cover_letter.length > 0 && (
                    <View style={[styles.ruleRow, { marginTop: 6 }]}>
                        <FileText size={13} color={C.sub} />
                        <Text style={styles.ruleMetaSub} numberOfLines={1}>
                            {rule.base_cover_letter.substring(0, 60)}…
                        </Text>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.ruleActions}>
                <Switch
                    value={rule.is_active ?? false}
                    onValueChange={(v) => onToggle(rule.id, v)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.cyan}50` }}
                    thumbColor={rule.is_active ? C.cyan : 'rgba(255,255,255,0.3)'}
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
    visible,
    initial,
    onClose,
    onSave,
    saving,
}: {
    visible: boolean;
    initial: RuleFormState;
    onClose: () => void;
    onSave: (form: RuleFormState) => void;
    saving: boolean;
}) {
    const [form, setForm] = useState<RuleFormState>(initial);

    useEffect(() => {
        if (visible) setForm(initial);
    }, [visible, initial]);

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
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}
                >
                    <View style={styles.modalCard}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {initial.keywords ? 'Edit Rule' : 'New Search Rule'}
                            </Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
                            {/* Keywords */}
                            <View>
                                <Text style={styles.fieldLabel}>KEYWORDS <Text style={styles.fieldHint}>(comma-separated)</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="React Native, TypeScript, Expo..."
                                    placeholderTextColor="#3D4A55"
                                    value={form.keywords}
                                    onChangeText={(v) => setForm((f) => ({ ...f, keywords: v }))}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Location */}
                            <View>
                                <Text style={styles.fieldLabel}>LOCATION</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Remote, London, New York..."
                                    placeholderTextColor="#3D4A55"
                                    value={form.location}
                                    onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Work types */}
                            <View>
                                <Text style={styles.fieldLabel}>WORK TYPES</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                    {WORK_TYPE_OPTIONS.map((wt) => {
                                        const active = form.work_types.includes(wt);
                                        return (
                                            <TouchableOpacity
                                                key={wt}
                                                onPress={() => toggleWorkType(wt)}
                                                style={[
                                                    styles.wtChip,
                                                    active
                                                        ? { borderColor: `${C.cyan}55`, backgroundColor: `${C.cyan}10` }
                                                        : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' },
                                                ]}
                                            >
                                                <Text style={[styles.wtChipText, { color: active ? C.cyan : C.sub }]}>{wt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Base cover letter */}
                            <View>
                                <Text style={styles.fieldLabel}>
                                    BASE COVER LETTER <Text style={styles.fieldHint}>(AI will personalise per job)</Text>
                                </Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    placeholder={`Dear Hiring Team,\n\nI am excited to apply for this role...`}
                                    placeholderTextColor="#3D4A55"
                                    value={form.base_cover_letter}
                                    onChangeText={(v) => setForm((f) => ({ ...f, base_cover_letter: v }))}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    autoCorrect={false}
                                />
                                <Text style={styles.fieldHintBlock}>
                                    Use [COMPANY], [ROLE], [NAME] as placeholders — Gemini replaces them automatically.
                                </Text>
                            </View>

                            {/* Active toggle */}
                            <View style={styles.activeRow}>
                                <View>
                                    <Text style={styles.fieldLabel}>ACTIVE</Text>
                                    <Text style={styles.ruleMeta}>Scraper uses all active rules</Text>
                                </View>
                                <Switch
                                    value={form.is_active}
                                    onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.cyan}50` }}
                                    thumbColor={form.is_active ? C.cyan : 'rgba(255,255,255,0.3)'}
                                />
                            </View>
                        </ScrollView>

                        {/* Save button */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                onPress={() => onSave(form)}
                                disabled={saving || !form.keywords.trim() || !form.location.trim()}
                                style={[
                                    styles.saveBtn,
                                    (!form.keywords.trim() || !form.location.trim()) && { opacity: 0.5 },
                                ]}
                                activeOpacity={0.8}
                            >
                                {saving
                                    ? <ActivityIndicator color="#000" />
                                    : <Text style={styles.saveBtnText}>Save Rule</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ConfigureScreen() {
    const queryClient = useQueryClient();
    const { triggerScrape, isLoading: isScraping, isSuccess: scrapeSuccess, error: scrapeError } = useEdgeScraper();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Auto-dismiss banner
    useEffect(() => {
        if (banner) {
            const t = setTimeout(() => setBanner(null), 4000);
            return () => clearTimeout(t);
        }
    }, [banner]);

    // Scrape feedback
    useEffect(() => {
        if (scrapeSuccess) setBanner({ type: 'success', text: 'Scrape complete. Pipeline updated.' });
        if (scrapeError) setBanner({ type: 'error', text: scrapeError });
    }, [scrapeSuccess, scrapeError]);

    // ── Load rules ────────────────────────────────────────────────────────────
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

    // ── Save (create or update) ───────────────────────────────────────────────
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
                const { error } = await supabase
                    .from('automation_rules')
                    .update(payload)
                    .eq('id', editingRule.id);
                if (error) throw new Error(error.message);
            } else {
                const { error } = await supabase
                    .from('automation_rules')
                    .insert(payload);
                if (error) throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
            setModalVisible(false);
            setEditingRule(null);
            setBanner({ type: 'success', text: editingRule ? 'Rule updated.' : 'Rule created.' });
        },
        onError: (e: Error) => {
            setBanner({ type: 'error', text: e.message });
        },
    });

    // ── Delete ────────────────────────────────────────────────────────────────
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

    // ── Toggle active ─────────────────────────────────────────────────────────
    const toggleMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase
                .from('automation_rules')
                .update({ is_active: active })
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation_rules'] }),
    });

    // ── Open modal ────────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingRule(null);
        setModalVisible(true);
    };

    const openEdit = (rule: AutomationRule) => {
        setEditingRule(rule);
        setModalVisible(true);
    };

    const formInitial: RuleFormState = editingRule
        ? {
            keywords: editingRule.keywords.join(', '),
            location: editingRule.location,
            work_types: editingRule.work_types,
            base_cover_letter: editingRule.base_cover_letter,
            is_active: editingRule.is_active ?? true,
        }
        : DEFAULT_FORM;

    const activeRulesCount = rules.filter((r) => r.is_active).length;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <AmbientBg />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.header}>
                    <View>
                        <Text style={styles.pageTitle}>Search Rules</Text>
                        <Text style={styles.pageSub}>
                            {activeRulesCount > 0
                                ? `${activeRulesCount} active rule${activeRulesCount > 1 ? 's' : ''} · scraper merges all`
                                : 'No active rules — add one below'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={openCreate} style={styles.addBtn} activeOpacity={0.8}>
                        <Plus size={18} color="#000" />
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Status banner ── */}
                {banner && (
                    <Animated.View
                        entering={FadeInDown.springify()}
                        exiting={FadeOutUp.duration(200)}
                        style={[
                            styles.banner,
                            {
                                borderColor: banner.type === 'success' ? `${C.cyan}35` : `${C.pink}35`,
                                backgroundColor: banner.type === 'success' ? `${C.cyan}0A` : `${C.pink}0A`,
                            },
                        ]}
                    >
                        {banner.type === 'success'
                            ? <CheckCircle2 size={15} color={C.cyan} />
                            : <AlertCircle size={15} color={C.pink} />}
                        <Text style={[styles.bannerText, { color: banner.type === 'success' ? C.cyan : C.pink }]}>
                            {banner.text}
                        </Text>
                    </Animated.View>
                )}

                {/* ── Scraper CTA ── */}
                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.scraperCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.scraperTitle}>Run Scraper Now</Text>
                        <Text style={styles.scraperSub}>
                            Fetches jobs from JSearch using your {activeRulesCount} active rule{activeRulesCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => triggerScrape()}
                        disabled={isScraping || activeRulesCount === 0}
                        style={[styles.scrapeBtn, (isScraping || activeRulesCount === 0) && { opacity: 0.5 }]}
                        activeOpacity={0.8}
                    >
                        {isScraping
                            ? <ActivityIndicator color={C.cyan} size="small" />
                            : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Zap size={14} color={C.cyan} />
                                    <Text style={styles.scrapeBtnText}>Scrape</Text>
                                </View>
                            )}
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Rules list ── */}
                {isLoading ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator color={C.cyan} />
                    </View>
                ) : rules.length === 0 ? (
                    <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Tag size={24} color={C.purple} />
                        </View>
                        <Text style={styles.emptyTitle}>No Rules Yet</Text>
                        <Text style={styles.emptyBody}>
                            Add your first search rule — keywords, location, work types, and a base cover letter.
                        </Text>
                        <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn} activeOpacity={0.8}>
                            <Plus size={14} color={C.cyan} />
                            <Text style={styles.emptyAddText}>Add First Rule</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <View style={{ gap: 12, marginTop: 8 }}>
                        {rules.map((rule) => (
                            <RuleCard
                                key={rule.id}
                                rule={rule}
                                onEdit={openEdit}
                                onDelete={(id) => setDeleteConfirm(id)}
                                onToggle={(id, active) => toggleMutation.mutate({ id, active })}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

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
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>Delete Rule?</Text>
                        <Text style={styles.confirmBody}>This cannot be undone. Jobs already scraped will remain.</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                            <TouchableOpacity
                                onPress={() => setDeleteConfirm(null)}
                                style={[styles.confirmBtn, { borderColor: C.border }]}
                            >
                                <Text style={[styles.confirmBtnText, { color: C.sub }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
                                disabled={deleteMutation.isPending}
                                style={[styles.confirmBtn, { borderColor: `${C.pink}50`, backgroundColor: `${C.pink}12` }]}
                            >
                                {deleteMutation.isPending
                                    ? <ActivityIndicator color={C.pink} size="small" />
                                    : <Text style={[styles.confirmBtnText, { color: C.pink }]}>Delete</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'web' ? 32 : 52,
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    pageTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    pageSub: { fontSize: 12, color: C.sub, marginTop: 3 },
    addBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center',
    },

    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    scraperCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderRadius: 16, borderWidth: 1,
        borderColor: `${C.cyan}20`, backgroundColor: `${C.cyan}07`,
        marginBottom: 24, gap: 12,
    },
    scraperTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    scraperSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    scrapeBtn: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}10`,
        minWidth: 80, alignItems: 'center',
    },
    scrapeBtnText: { color: C.cyan, fontSize: 12, fontWeight: '800', letterSpacing: 1 },

    ruleCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, borderRadius: 16, borderWidth: 1,
        backgroundColor: 'rgba(11,24,34,0.9)',
        overflow: 'hidden', gap: 12,
    },
    ruleActiveLine: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.sub },
    ruleMeta: { fontSize: 12, color: C.sub },
    ruleMetaSub: { fontSize: 11, color: 'rgba(216,228,236,0.28)', flex: 1 },
    ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 },

    kwChip: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
        borderWidth: 1, borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}0A`,
    },
    kwChipText: { fontSize: 11, color: C.cyan, fontWeight: '600' },

    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: {
        width: 68, height: 68, borderRadius: 34,
        borderWidth: 1, borderColor: `${C.purple}40`,
        backgroundColor: `${C.purple}10`,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptyBody: { fontSize: 13, color: C.sub, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, marginBottom: 24 },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0D`,
    },
    emptyAddText: { color: C.cyan, fontSize: 13, fontWeight: '700' },

    // ── Modal ──
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end', padding: 0,
    },
    modalCard: {
        backgroundColor: '#0B1520',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderColor: 'rgba(120,200,240,0.1)',
        maxHeight: '92%',
        overflow: 'hidden',
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
    fieldHint: { color: C.sub, fontWeight: '500' },
    fieldHintBlock: { fontSize: 11, color: C.sub, marginTop: 6, lineHeight: 16 },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: 'rgba(120,200,240,0.1)',
        borderRadius: 12, padding: 14,
        color: C.text, fontSize: 14,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },
    textArea: { minHeight: 140, paddingTop: 14 },

    wtChip: {
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1,
    },
    wtChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    activeRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 4,
    },

    // ── Delete confirm ──
    confirmCard: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#0B1520', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 28, borderWidth: 1, borderColor: 'rgba(232,67,106,0.15)',
    },
    confirmTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
    confirmBody: { fontSize: 13, color: C.sub, lineHeight: 20 },
    confirmBtn: {
        flex: 1, height: 48, borderRadius: 12,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    confirmBtnText: { fontSize: 14, fontWeight: '700' },
});