/**
 * components/features/configure/RuleFormModal.tsx
 * OpusHunter — Create/Edit Automation Rule Modal
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx
 * 2026-07-04 — Real Location autocomplete replaces the plain text field
 *   (was letting people type "Remote, Onsite, Hybrid" into a location box,
 *   which is a work-mode value, not a place — RemotePreferencePicker below
 *   is the actual control for that now).
 * 2026-07-04 — Added the missing "Generate with AI" button for the base
 *   cover letter, using the rule's own toggled criteria (keywords,
 *   location, work types, experience, remote preference) via the new
 *   generate-rule-template edge function. Previously this was a blank
 *   textarea with zero assistance despite the modal already holding every
 *   input Gemini needs to draft a real starting point.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, ActivityIndicator, Modal, Switch, KeyboardAvoidingView,
} from 'react-native';
import { X, Check, Sparkles } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { C } from '../../../lib/theme';
import { st } from './styles';
import { WORK_TYPE_OPTIONS, WORK_TYPE_LABELS } from './constants';
import type { RuleFormState } from './types';
import { ExperienceLevelPicker } from '../../configure/ExperienceLevelPicker';
import { RemotePreferencePicker } from '../../configure/RemotePreferencePicker';
import { SalaryMinPicker } from '../../configure/SalaryMinPicker';
import { LocationAutocomplete } from './LocationAutocomplete';

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

    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const handleGenerateTemplate = useCallback(async () => {
        setGenerating(true);
        setGenerateError(null);
        try {
            const { data, error } = await supabase.functions.invoke('generate-rule-template', {
                body: {
                    keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
                    location: form.location,
                    work_types: form.work_types,
                    experience_levels: form.experience_levels,
                    remote_preference: form.remote_preference,
                },
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);
            setForm((f) => ({ ...f, base_cover_letter: data.draft }));
        } catch (e) {
            setGenerateError(e instanceof Error ? e.message : 'Could not generate a draft.');
        } finally {
            setGenerating(false);
        }
    }, [form.keywords, form.location, form.work_types, form.experience_levels, form.remote_preference]);

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
                                <Text style={st.fieldLabel}>LOCATIONS</Text>
                                <LocationAutocomplete
                                    selected={form.location ? form.location.split(',').map((s) => s.trim()).filter(Boolean) : []}
                                    onChange={(locations) => setForm((f) => ({ ...f, location: locations.join(', ') }))}
                                />
                                <Text style={{ color: C.dim, fontSize: 11, marginTop: 6, lineHeight: 15 }}>
                                    Add as many cities or whole countries as you want. Work mode (remote/hybrid/
                                    on-site) is set separately below — it no longer needs to be typed in here.
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

                            <ExperienceLevelPicker
                                value={form.experience_levels}
                                onChange={(experience_levels: string[]) => setForm((f) => ({ ...f, experience_levels }))}
                            />

                            <RemotePreferencePicker
                                value={form.remote_preference}
                                onChange={(remote_preference: string) => setForm((f) => ({ ...f, remote_preference }))}
                            />

                            <SalaryMinPicker
                                value={form.salary_min}
                                onChange={(salary_min: number | null) => setForm((f) => ({ ...f, salary_min }))}
                            />

                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={st.fieldLabel}>
                                        BASE COVER LETTER{' '}
                                        <Text style={{ color: C.sub, fontWeight: '500' }}>(AI personalises per job)</Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={handleGenerateTemplate}
                                        disabled={generating || !form.keywords.trim()}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 6,
                                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                                            backgroundColor: `${C.cyan}14`, borderWidth: 1, borderColor: `${C.cyan}30`,
                                            opacity: !form.keywords.trim() ? 0.4 : 1,
                                        }}
                                    >
                                        {generating
                                            ? <ActivityIndicator size="small" color={C.cyan} />
                                            : <Sparkles size={12} color={C.cyan} />}
                                        <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '800' }}>
                                            {generating ? 'Generating…' : 'Generate with AI'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {generateError && (
                                    <Text style={{ color: C.pink, fontSize: 11, marginBottom: 6 }}>{generateError}</Text>
                                )}
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
                                disabled={saving || !form.keywords.trim() || (form.remote_preference !== 'remote' && !form.location.trim())}
                                style={[st.saveBtn, (!form.keywords.trim() || (form.remote_preference !== 'remote' && !form.location.trim())) && { opacity: 0.45 }]}
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