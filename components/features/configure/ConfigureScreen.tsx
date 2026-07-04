/**
 * components/features/configure/ConfigureScreen.tsx
 * OpusHunter — Configure Screen (Engine + Rules)
 * 2026-07-03 — SPLIT from app/(tabs)/configure.tsx, which had grown to
 * 1240 lines / 54KB as a single route file. Expo Router route files should
 * stay thin; this is the actual screen implementation now:
 *
 *   app/(tabs)/configure.tsx           ← thin route file, renders this
 *   components/features/configure/
 *     ConfigureScreen.tsx              ← this file (state + data layer)
 *     EngineTab.tsx                    ← ToggleChip, SectionHeader, EngineTab
 *     RulesTab.tsx                     ← RuleCard, RulesTab
 *     RuleFormModal.tsx                ← create/edit modal
 *     constants.ts                     ← LOCATION_PRESETS etc — SHARED with
 *                                         SetupWizard.tsx now, no more
 *                                         duplicate copies of the same lists
 *     types.ts                         ← EngineConfig, AutomationRule, RuleFormState
 *     styles.ts                        ← StyleSheet, includes the tabBar /
 *                                         tabScroll / outer-padding fix for
 *                                         the "stretched, no top space" bug
 *
 * WHAT ELSE CHANGED (behavior, not just file boundaries):
 *   - Dropped two unused imports that were dead weight on every load:
 *     `SwipeableJobCard`/`JobData` and `JobDetailModal` — neither was
 *     referenced anywhere in the original 1240 lines.
 *   - First-run gate: when `rules.length === 0` and the query has finished
 *     loading, this now renders <SetupWizard/> instead of the empty Rules
 *     tab state. Returning users (rules.length > 0) see the exact same
 *     Engine/Rules screen as before — nothing removed for them.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Modal, Text, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Zap, Tag, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useEdgeScraper } from '../../../hooks/useEdgeScraper';
import { C } from '../../../lib/theme';
import { SetupWizard } from '../../onboarding/SetupWizard';
import { st } from './styles';
import { parseKeywords } from './constants';
import type { AutomationRule, RuleFormState, EngineConfig, TabKey } from './types';
import { DEFAULT_FORM, DEFAULT_ENGINE } from './types';
import { EngineTab } from './EngineTab';
import { RulesTab } from './RulesTab';
import { RuleFormModal } from './RuleFormModal';

export function ConfigureScreen() {
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
            experience_levels: editingRule.experience_levels,
            remote_preference: editingRule.remote_preference,
            salary_min: editingRule.salary_min,
            is_active: editingRule.is_active ?? true,
        }
        : DEFAULT_FORM;

    const activeRulesCount = rules.filter((r: AutomationRule) => r.is_active).length;

    const TABS: { key: TabKey; label: string; icon: any }[] = [
        { key: 'engine', label: 'Engine', icon: Zap },
        { key: 'rules', label: `Rules ${rules.length > 0 ? `(${rules.length})` : ''}`, icon: Tag },
    ];

    // ── First-run gate ───────────────────────────────────────────────────────
    if (!isLoading && rules.length === 0 && !modalVisible) {
        return (
            <View style={st.screenWrapper}>
                <SetupWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ['automation_rules'] })} />
            </View>
        );
    }

    return (
        <View style={st.screenWrapper}>
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()}
                    exiting={FadeOutUp.duration(200)}
                    style={[
                        st.banner,
                        {
                            borderColor: banner.type === 'success' ? `${C.cyan}35` : `${C.pink}35`,
                            backgroundColor: banner.type === 'success' ? `${C.cyan}0A` : `${C.pink}0A`,
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