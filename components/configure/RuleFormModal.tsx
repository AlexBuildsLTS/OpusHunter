/**
 * components/configure/RuleFormModal.tsx
 * OpusHunter — Create/Edit Search Rule
 * 2026-07-03 — New file. Every field here maps to a real automation_rules
 * column — Experience Level / Remote Preference / Minimum Salary are now
 * inside the actual rule form (and persisted), not a separate fake tab.
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Modal, Switch, KeyboardAvoidingView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { KeywordTagInput } from '../ui/KeywordTagInput';
import { LocationInput } from '../ui/LocationInput';
import { ExperienceLevelPicker } from './ExperienceLevelPicker';
import { RemotePreferencePicker } from './RemotePreferencePicker';
import { SalaryMinPicker } from './SalaryMinPicker';
import { WORK_TYPE_OPTIONS, WORK_TYPE_LABELS, type RuleFormState } from './types';

interface RuleFormModalProps {
    visible: boolean;
    initial: RuleFormState;
    isEditing: boolean;
    onClose: () => void;
    onSave: (form: RuleFormState) => void;
    saving: boolean;
}

export function RuleFormModal({ visible, initial, isEditing, onClose, onSave, saving }: RuleFormModalProps) {
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
            <View style={st.overlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
                    <View style={st.card}>
                        <View style={st.header}>
                            <Text style={st.title}>{isEditing ? 'Edit Rule' : 'New Search Rule'}</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={20} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
                            <View>
                                <Text style={st.label}>KEYWORDS</Text>
                                <KeywordTagInput value={form.keywords} onChange={(tags) => setForm((f) => ({ ...f, keywords: tags }))} />
                            </View>

                            <View>
                                <Text style={st.label}>LOCATION</Text>
                                <LocationInput value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
                                <Text style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>
                                    Any city or country, worldwide — searches globally, not just US listings.
                                </Text>
                            </View>

                            <View>
                                <Text style={st.label}>WORK TYPES</Text>
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
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? C.cyan : C.sub }}>{WORK_TYPE_LABELS[wt]}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <ExperienceLevelPicker
                                value={form.experience_levels}
                                onChange={(levels) => setForm((f) => ({ ...f, experience_levels: levels }))}
                            />

                            <RemotePreferencePicker
                                value={form.remote_preference}
                                onChange={(v) => setForm((f) => ({ ...f, remote_preference: v }))}
                            />

                            <SalaryMinPicker
                                value={form.salary_min}
                                onChange={(v) => setForm((f) => ({ ...f, salary_min: v }))}
                            />

                            <View>
                                <Text style={st.label}>BASE COVER LETTER <Text style={{ color: C.sub, fontWeight: '500' }}>(AI personalises per job)</Text></Text>
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
                                <Text style={{ fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 15 }}>
                                    Use [COMPANY], [ROLE], [NAME] — Gemini replaces them automatically.
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                                <View>
                                    <Text style={st.label}>ACTIVE</Text>
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

                        <View style={st.footer}>
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

const st = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(4,6,8,0.75)', justifyContent: 'flex-end' },
    card: { backgroundColor: C.core, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.borderCyan, maxHeight: '92%', overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    title: { fontSize: 16, fontWeight: '800', color: C.text },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    saveBtn: { height: 52, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    label: { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.borderCyan,
        borderRadius: 12, padding: 14, color: C.text, fontSize: 14,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },
});