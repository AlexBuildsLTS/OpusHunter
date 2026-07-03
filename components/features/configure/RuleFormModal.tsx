/**
 * components/features/configure/RuleFormModal.tsx
 * OpusHunter — Create/Edit Automation Rule Modal
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, ActivityIndicator, Modal, Switch, KeyboardAvoidingView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { C } from '../../../lib/theme';
import { st } from './styles';
import { WORK_TYPE_OPTIONS, WORK_TYPE_LABELS } from './constants';
import type { RuleFormState } from './types';

export function RuleFormModal({
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