/**
 * app/(tabs)/configure.tsx
 * OpusHunter — Search Rules + Scraper Control
 * 2026-07-02 — Friendlier setup pass
 *
 * WHAT CHANGED:
 *   - Keywords: free-text "comma-separated" field replaced with
 *     KeywordTagInput (tap-to-add chips + custom entry). Same string[]
 *     shape the DB (automation_rules.keywords) and scrape-jobs already
 *     expect — zero backend change.
 *   - Location: plain text field replaced with LocationInput — worldwide
 *     city autocomplete (OpenStreetMap, free, no key) plus a "Use mine"
 *     button (expo-location) for one-tap accuracy on any platform
 *     (web/iOS/Android). Still just writes a string to
 *     automation_rules.location, same as before.
 *   - "Run Scraper" renamed to "Launch Search" / button "RUN" → "SEARCH" —
 *     product-facing language, not internal engineering language.
 *   - Only real, wired fields are here: automation_rules
 *     (keywords / location / work_types / base_cover_letter) is what
 *     scrape-jobs genuinely reads. No mock toggles.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Modal, Switch,
    KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import {
    Plus, Trash2, Edit3, Zap, CheckCircle2, AlertCircle, X,
    Tag, MapPin, Briefcase, FileText, Check, RefreshCw, Sparkles, ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useEdgeScraper } from '../../hooks/useEdgeScraper';
import { C } from '../../lib/theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { KeywordTagInput } from '../../components/ui/KeywordTagInput';
import { LocationInput } from '../../components/ui/LocationInput';

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
    keywords: string[];
    location: string;
    work_types: string[];
    base_cover_letter: string;
    is_active: boolean;
}

const DEFAULT_FORM: RuleFormState = {
    keywords: [],
    location: 'Remote',
    work_types: ['FULLTIME'],
    base_cover_letter: '',
    is_active: true,
};

const WORK_TYPE_OPTIONS = ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERNSHIP', 'TEMPORARY'];
const WORK_TYPE_LABELS: { [key: string]: string } = {
    FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract',
    INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
};

// ── Key-source badge — shows exactly which credential tier served the scrape ──

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
    byok: { label: 'YOUR KEY', color: C.green },
    pool: { label: 'SYSTEM POOL', color: C.cyan },
    env: { label: 'SYSTEM DEFAULT', color: C.purple },
};

function KeySourceBadge({ source }: { source?: string }) {
    if (!source || source.startsWith('failed')) {
        return (
            <View style={[st.sourceBadge, { borderColor: `${C.pink}40`, backgroundColor: `${C.pink}12` }]}>
                <Text style={[st.sourceBadgeText, { color: C.pink }]}>FAILED</Text>
            </View>
        );
    }
    const cfg = SOURCE_LABEL[source] ?? { label: source.toUpperCase(), color: C.sub };
    return (
        <View style={[st.sourceBadge, { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}12` }]}>
            <Text style={[st.sourceBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
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
        <Animated.View layout={Layout.springify().damping(20)} entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}>
            <GlassCard tint={rule.is_active ? 'cyan' : 'default'} padding="sm" className="flex-row items-center gap-3">
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
                        <Text style={st.ruleMeta}>{rule.work_types.map((wt) => WORK_TYPE_LABELS[wt] ?? wt).join(', ')}</Text>
                    </View>
                    {rule.base_cover_letter.length > 0 && (
                        <View style={[st.ruleRow, { marginTop: 5 }]}>
                            <FileText size={12} color={C.dim} />
                            <Text style={st.ruleMetaSub} numberOfLines={1}>{rule.base_cover_letter.substring(0, 55)}…</Text>
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
            </GlassCard>
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
            work_types: f.work_types.includes(wt) ? f.work_types.filter((w) => w !== wt) : [...f.work_types, wt],
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={st.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
                    <View style={st.modalCard}>
                        <View style={st.modalHeader}>
                            <Text style={st.modalTitle}>{initial.keywords.length > 0 ? 'Edit Rule' : 'New Search Rule'}</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
                            <View>
                                <Text style={st.fieldLabel}>KEYWORDS</Text>
                                <KeywordTagInput
                                    value={form.keywords}
                                    onChange={(tags) => setForm((f) => ({ ...f, keywords: tags }))}
                                />
                            </View>

                            <View>
                                <Text style={st.fieldLabel}>LOCATION</Text>
                                <LocationInput
                                    value={form.location}
                                    onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                                />
                                <Text style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>
                                    Any city or country works, worldwide — the scraper searches globally, not just US listings.
                                </Text>
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
                                                style={[st.chip, active ? { borderColor: `${C.cyan}55`, backgroundColor: `${C.cyan}10` } : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' }]}
                                            >
                                                {active && <Check size={11} color={C.cyan} />}
                                                <Text style={[st.chipText, { color: active ? C.cyan : C.sub }]}>{WORK_TYPE_LABELS[wt]}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View>
                                <Text style={st.fieldLabel}>BASE COVER LETTER <Text style={{ color: C.sub, fontWeight: '500' }}>(AI personalises per job)</Text></Text>
                                <TextInputBaseCoverLetter form={form} setForm={setForm} />
                                <Text style={{ fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 15 }}>
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
                                disabled={saving || form.keywords.length === 0 || !form.location.trim()}
                                style={[st.saveBtn, (form.keywords.length === 0 || !form.location.trim()) && { opacity: 0.45 }]}
                                activeOpacity={0.8}
                            >
                                {saving ? <ActivityIndicator color="#000" /> : <Text style={st.saveBtnText}>Save Rule</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// Small local wrapper only so the big modal function above stays readable —
// identical TextInput behavior to before, just isolated.
import { TextInput } from 'react-native';
function TextInputBaseCoverLetter({ form, setForm }: { form: RuleFormState; setForm: React.Dispatch<React.SetStateAction<RuleFormState>> }) {
    return (
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
            {...(Platform.OS === "web" ? ({ outlineStyle: 'none' } as any) : {})}
        />
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ConfigureScreen() {
    const queryClient = useQueryClient();
    const { triggerScrape, isLoading: isScraping, isSuccess: scrapeSuccess, error: scrapeError, lastResult } = useEdgeScraper();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (banner) {
            const t = setTimeout(() => setBanner(null), 4500);
            return () => clearTimeout(t);
        }
    }, [banner]);

    useEffect(() => {
        if (scrapeSuccess) setBanner({ type: 'success', text: (lastResult as any)?.message ?? 'Search complete — pipeline updated.' });
        if (scrapeError) setBanner({ type: 'error', text: scrapeError });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrapeSuccess, scrapeError]);

    const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
        queryKey: ['automation_rules'],
        queryFn: async () => {
            const { data, error } = await supabase.from('automation_rules').select('*').order('created_at', { ascending: false });
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
                keywords: form.keywords,
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
            keywords: editingRule.keywords,
            location: editingRule.location,
            work_types: editingRule.work_types,
            base_cover_letter: editingRule.base_cover_letter,
            is_active: editingRule.is_active ?? true,
        }
        : DEFAULT_FORM;

    const activeRulesCount = rules.filter((r) => r.is_active).length;
    const summary: Array<{ rule: string; fetched: number; new: number; key_source?: string }> = (lastResult as any)?.summary ?? [];

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    { padding: 20, paddingBottom: 120 },
                    Platform.OS === 'web' && { maxWidth: 1100, width: '100%', alignSelf: 'center' as any },
                ]}
            >


                {banner && (
                    <Animated.View
                        entering={FadeInDown.springify()}
                        exiting={FadeOutUp.duration(200)}
                        style={[st.banner, { borderColor: banner.type === 'success' ? `${C.cyan}35` : `${C.pink}35`, backgroundColor: banner.type === 'success' ? `${C.cyan}0A` : `${C.pink}0A` }]}
                    >
                        {banner.type === 'success' ? <CheckCircle2 size={15} color={C.cyan} /> : <AlertCircle size={15} color={C.pink} />}
                        <Text style={[st.bannerText, { color: banner.type === 'success' ? C.cyan : C.pink }]}>{banner.text}</Text>
                    </Animated.View>
                )}

                {/* ── Launch Search hero ── */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={{ marginBottom: 20 }}>
                    <GlassCard tint="cyan" glow padding="md">
                        <View className="flex-row items-center gap-3.5">
                            <View style={st.scraperPulse}>
                                {isScraping ? <ActivityIndicator color={C.cyan} /> : <Zap size={20} color={C.cyan} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={st.scraperTitle}>Launch Search</Text>
                                <Text style={st.scraperSub}>
                                    {activeRulesCount > 0
                                        ? `Searching with ${activeRulesCount} active rule${activeRulesCount === 1 ? '' : 's'}`
                                        : 'No active rules — add one below first'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => triggerScrape()}
                                disabled={isScraping || activeRulesCount === 0}
                                style={[st.scrapeBtn, (isScraping || activeRulesCount === 0) && { opacity: 0.4 }]}
                                activeOpacity={0.85}
                            >
                                {isScraping ? <RefreshCw size={13} color="#000" /> : <Text style={st.scrapeBtnText}>SEARCH</Text>}
                            </TouchableOpacity>
                        </View>

                        {summary.length > 0 && (
                            <View style={{ marginTop: 16, gap: 8 }}>
                                <View style={{ height: 1, backgroundColor: C.border, marginBottom: 4 }} />
                                {summary.map((s, i) => (
                                    <View key={i} style={st.summaryRow}>
                                        <Text style={st.summaryRuleText} numberOfLines={1}>{s.rule}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={st.summaryCountText}>
                                                {s.key_source?.startsWith('failed') ? '—' : `${s.new} new / ${s.fetched} found`}
                                            </Text>
                                            <KeySourceBadge source={s.key_source} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </GlassCard>
                </Animated.View>

                {/* ── Rules list ── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Tag size={13} color={C.cyan} />
                        <Text style={st.listHeaderText}>SEARCH RULES {rules.length > 0 ? `(${rules.length})` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={openCreate} style={st.addBtn} activeOpacity={0.85}>
                        <Plus size={13} color={C.cyan} />
                        <Text style={st.addBtnText}>New Rule</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                        <ActivityIndicator color={C.cyan} />
                    </View>
                ) : rules.length === 0 ? (
                    <Animated.View entering={FadeInDown.springify()}>
                        <GlassCard tint="purple" padding="lg" className="items-center">
                            <View style={st.emptyIcon}>
                                <Sparkles size={24} color={C.purple} />
                            </View>
                            <Text style={st.emptyTitle}>No Rules Yet</Text>
                            <Text style={st.emptyBody}>
                                Rules power the search — each one defines keywords, location, and work types for automated job hunting, worldwide. Add your first one to get started.
                            </Text>
                            <TouchableOpacity onPress={openCreate} style={st.emptyAddBtn} activeOpacity={0.85}>
                                <Plus size={14} color={C.cyan} />
                                <Text style={st.emptyAddText}>Add First Rule</Text>
                                <ChevronRight size={14} color={C.cyan} />
                            </TouchableOpacity>
                        </GlassCard>
                    </Animated.View>
                ) : (
                    <View style={{ gap: 11 }}>
                        {rules.map((rule) => (
                            <RuleCard key={rule.id} rule={rule} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)} onToggle={(id, active) => toggleMutation.mutate({ id, active })} />
                        ))}
                    </View>
                )}
            </ScrollView>

            <RuleFormModal
                visible={modalVisible}
                initial={formInitial}
                onClose={() => { setModalVisible(false); setEditingRule(null); }}
                onSave={(form) => saveMutation.mutate(form)}
                saving={saveMutation.isPending}
            />

            <Modal visible={!!deleteConfirm} transparent animationType="fade">
                <View style={st.modalOverlay}>
                    <View style={st.confirmCard}>
                        <Text style={st.confirmTitle}>Delete Rule?</Text>
                        <Text style={st.confirmBody}>This cannot be undone. Jobs already scraped will remain.</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                            <TouchableOpacity onPress={() => setDeleteConfirm(null)} style={[st.confirmBtn, { borderColor: C.border }]}>
                                <Text style={[st.confirmBtnText, { color: C.sub }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
                                disabled={deleteMutation.isPending}
                                style={[st.confirmBtn, { borderColor: `${C.pink}50`, backgroundColor: `${C.pink}12` }]}
                            >
                                {deleteMutation.isPending ? <ActivityIndicator color={C.pink} size="small" /> : <Text style={[st.confirmBtnText, { color: C.pink }]}>Delete</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    bannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

    scraperPulse: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: `${C.cyan}12`, borderWidth: 1, borderColor: `${C.cyan}30`,
        alignItems: 'center', justifyContent: 'center',
    },
    scraperTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    scraperSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    scrapeBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: C.cyan, minWidth: 62, alignItems: 'center' },
    scrapeBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    summaryRuleText: { fontSize: 11, color: C.sub, flex: 1 },
    summaryCountText: { fontSize: 11, fontWeight: '700', color: C.text },
    sourceBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    sourceBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

    listHeaderText: { fontSize: 11, fontWeight: '900', color: C.text, letterSpacing: 1.5 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: `${C.cyan}35`, backgroundColor: `${C.cyan}0C` },
    addBtnText: { fontSize: 11, fontWeight: '800', color: C.cyan },

    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
    chipText: { fontSize: 12, fontWeight: '700' },

    ruleActiveLine: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.sub },
    ruleMeta: { fontSize: 11, color: C.sub },
    ruleMetaSub: { fontSize: 10, color: C.dim, flex: 1 },
    ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 13, flexShrink: 0 },
    kwChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1, borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}0A` },
    kwChipText: { fontSize: 10, color: C.cyan, fontWeight: '700' },

    emptyIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: `${C.purple}40`, backgroundColor: `${C.purple}10`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptyBody: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0D` },
    emptyAddText: { color: C.cyan, fontSize: 13, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(4,6,8,0.75)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: C.core, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.borderCyan, maxHeight: '92%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    saveBtn: { height: 52, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    fieldLabel: { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.borderCyan,
        borderRadius: 12, padding: 14, color: C.text, fontSize: 14,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },

    confirmCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.core, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, borderWidth: 1, borderColor: C.borderError },
    confirmTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
    confirmBody: { fontSize: 13, color: C.sub, lineHeight: 20 },
    confirmBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    confirmBtnText: { fontSize: 14, fontWeight: '700' },
});