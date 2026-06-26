/**
 * components/pipeline/JobDetailModal.tsx
 * OpusHunter — Job Detail & Cover Letter Preview Modal
 *
 * Shown when user taps the card (not swipes).
 * Lets them:
 *   - Read the full job description
 *   - See / edit the AI-generated cover letter before applying
 *   - Confirm apply → triggers swipe right action
 *   - Pass → triggers swipe left
 *
 * Works on web, iOS, Android.
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import {
    View, Text, Modal, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Platform, StyleSheet,
    KeyboardAvoidingView, Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import {
    X, Briefcase, MapPin, DollarSign, Zap,
    FileText, Edit3, CheckCircle2, AlertCircle,
    ExternalLink, ThumbsDown, Send,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { JobData } from './SwipeableJobCard';

// ── Theme ─────────────────────────────────────────────────────────────────────

const C = {
    cyan: '#00D4FF',
    purple: '#7B5EA7',
    pink: '#E8436A',
    green: '#00C67D',
    amber: '#F59E0B',
    bg: '#050C12',
    card: '#0B1822',
    border: 'rgba(120,200,240,0.09)',
    text: '#D8E4EC',
    sub: 'rgba(216,228,236,0.45)',
};

// ── Score colour ──────────────────────────────────────────────────────────────

const scoreColor = (s: number) =>
    s >= 85 ? C.cyan : s >= 65 ? C.purple : s >= 45 ? C.amber : C.pink;

// ── Props ─────────────────────────────────────────────────────────────────────

interface JobDetailModalProps {
    visible: boolean;
    job: JobData | null;
    onClose: () => void;
    onConfirmApply: (job: JobData, editedCoverLetter: string) => void;
    onConfirmPass: (job: JobData) => void;
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type ModalTab = 'details' | 'cover_letter';

// ── Main component ────────────────────────────────────────────────────────────

export const JobDetailModal = memo(({
    visible,
    job,
    onClose,
    onConfirmApply,
    onConfirmPass,
}: JobDetailModalProps) => {
    const [tab, setTab] = useState<ModalTab>('details');
    const [coverLetter, setCoverLetter] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    // Reset state when modal opens with a new job
    useEffect(() => {
        if (visible && job) {
            setTab('details');
            setCoverLetter('');
            setIsEditing(false);
            setGenError(null);
            setIsApplying(false);
        }
    }, [visible, job?.id]);

    // Auto-generate cover letter when tab switches to cover_letter
    useEffect(() => {
        if (tab === 'cover_letter' && job && !coverLetter && !isGenerating) {
            generateCoverLetter();
        }
    }, [tab, job?.id]);

    const generateCoverLetter = useCallback(async () => {
        if (!job) return;
        setIsGenerating(true);
        setGenError(null);

        try {
            const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
                body: { job_id: job.id, preview: true },
            });

            if (error) throw new Error(error.message);
            setCoverLetter(data?.cover_letter ?? '');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to generate cover letter.';
            setGenError(msg);
            // Set a placeholder so user can still edit
            setCoverLetter(
                `Dear Hiring Team at ${job.company},\n\nI am excited to apply for the ${job.title} position.\n\n[Edit this cover letter to personalise it]\n\nBest regards`
            );
        } finally {
            setIsGenerating(false);
        }
    }, [job]);

    const handleApply = useCallback(async () => {
        if (!job) return;
        setIsApplying(true);
        // Small delay so user sees the confirming state
        await new Promise((r) => setTimeout(r, 300));
        onConfirmApply(job, coverLetter);
        onClose();
    }, [job, coverLetter, onConfirmApply, onClose]);

    const handlePass = useCallback(() => {
        if (!job) return;
        onConfirmPass(job);
        onClose();
    }, [job, onConfirmPass, onClose]);

    const openApplyUrl = useCallback(() => {
        if (!job?.source_url) return;
        if (Platform.OS === 'web') {
            window.open(job.source_url, '_blank');
        }
    }, [job]);

    if (!job) return null;

    const score = job.match_score ?? 0;
    const sc = scoreColor(score);
    const stack = job.tech_stack ?? [];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                pointerEvents="box-none"
            >
                <Animated.View
                    entering={FadeInDown.springify().damping(22)}
                    exiting={FadeOutDown.duration(200)}
                    style={styles.sheet}
                >
                    {/* ── Handle bar ── */}
                    <View style={styles.handle} />

                    {/* ── Header ── */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                            <Text style={styles.company}>{job.company}</Text>
                        </View>
                        <View style={[styles.scoreBadge, { borderColor: sc, backgroundColor: `${sc}14` }]}>
                            <Text style={[styles.scoreNum, { color: sc }]}>{score}</Text>
                            <Text style={[styles.scoreSub, { color: sc }]}>MATCH</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.closeBtn}
                        >
                            <X size={18} color={C.sub} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Meta row ── */}
                    <View style={styles.metaRow}>
                        {job.location ? (
                            <View style={styles.metaItem}>
                                <MapPin size={12} color={C.sub} />
                                <Text style={styles.metaText}>{job.location}</Text>
                            </View>
                        ) : null}
                        {job.salary ? (
                            <View style={styles.metaItem}>
                                <DollarSign size={12} color={C.pink} />
                                <Text style={[styles.metaText, { color: C.pink, fontWeight: '700' }]}>{job.salary}</Text>
                            </View>
                        ) : null}
                        {job.source_url ? (
                            <TouchableOpacity onPress={openApplyUrl} style={styles.metaItem}>
                                <ExternalLink size={12} color={C.cyan} />
                                <Text style={[styles.metaText, { color: C.cyan }]}>View Post</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* ── Tabs ── */}
                    <View style={styles.tabs}>
                        {(['details', 'cover_letter'] as ModalTab[]).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setTab(t)}
                                style={[styles.tab, tab === t && styles.tabActive]}
                                activeOpacity={0.7}
                            >
                                {t === 'details'
                                    ? <Briefcase size={14} color={tab === t ? C.cyan : C.sub} />
                                    : <FileText size={14} color={tab === t ? C.cyan : C.sub} />}
                                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                                    {t === 'details' ? 'Details' : 'Cover Letter'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Content ── */}
                    <View style={{ flex: 1 }}>
                        {tab === 'details' ? (
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Tech stack */}
                                {stack.length > 0 && (
                                    <View style={{ marginBottom: 18 }}>
                                        <Text style={styles.sectionLabel}>TECH STACK</Text>
                                        <View style={styles.chips}>
                                            {stack.map((tag) => (
                                                <View key={tag} style={styles.chip}>
                                                    <Text style={styles.chipText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Description */}
                                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                                <Text style={styles.description}>
                                    {job.description ?? 'No description available.'}
                                </Text>
                            </ScrollView>
                        ) : (
                            <View style={{ flex: 1 }}>
                                {/* Generation state */}
                                {isGenerating ? (
                                    <View style={styles.generatingState}>
                                        <ActivityIndicator color={C.purple} size="large" />
                                        <Text style={styles.generatingText}>
                                            Generating personalised cover letter…
                                        </Text>
                                        <Text style={styles.generatingSub}>Gemini Flash is reading the JD</Text>
                                    </View>
                                ) : (
                                    <>
                                        {/* Toolbar */}
                                        <View style={styles.clToolbar}>
                                            <View style={styles.clStatusRow}>
                                                {genError
                                                    ? <><AlertCircle size={13} color={C.amber} /><Text style={[styles.clStatus, { color: C.amber }]}>Template used · edit below</Text></>
                                                    : <><CheckCircle2 size={13} color={C.green} /><Text style={[styles.clStatus, { color: C.green }]}>AI generated</Text></>}
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    onPress={generateCoverLetter}
                                                    style={styles.clToolBtn}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Zap size={13} color={C.purple} />
                                                    <Text style={[styles.clToolBtnText, { color: C.purple }]}>Regenerate</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setIsEditing((v) => !v)}
                                                    style={[styles.clToolBtn, isEditing && { borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}0D` }]}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Edit3 size={13} color={isEditing ? C.cyan : C.sub} />
                                                    <Text style={[styles.clToolBtnText, { color: isEditing ? C.cyan : C.sub }]}>
                                                        {isEditing ? 'Done' : 'Edit'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Letter body */}
                                        <ScrollView
                                            style={{ flex: 1 }}
                                            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                                            showsVerticalScrollIndicator={false}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {isEditing ? (
                                                <TextInput
                                                    style={styles.clEditor}
                                                    value={coverLetter}
                                                    onChangeText={setCoverLetter}
                                                    multiline
                                                    textAlignVertical="top"
                                                    autoCorrect={false}
                                                    scrollEnabled={false}
                                                    autoFocus
                                                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                                                />
                                            ) : (
                                                <Text style={styles.clBody}>{coverLetter}</Text>
                                            )}
                                        </ScrollView>
                                    </>
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Action buttons ── */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={handlePass}
                            style={styles.passBtn}
                            activeOpacity={0.75}
                        >
                            <ThumbsDown size={16} color={C.pink} />
                            <Text style={styles.passBtnText}>Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                if (tab === 'details' && !coverLetter) {
                                    setTab('cover_letter');
                                } else {
                                    handleApply();
                                }
                            }}
                            disabled={isApplying || isGenerating}
                            style={[styles.applyBtn, (isApplying || isGenerating) && { opacity: 0.65 }]}
                            activeOpacity={0.8}
                        >
                            {isApplying ? (
                                <ActivityIndicator color="#000" size="small" />
                            ) : (
                                <>
                                    <Send size={16} color="#000" />
                                    <Text style={styles.applyBtnText}>
                                        {tab === 'details' && !coverLetter
                                            ? 'Review Cover Letter'
                                            : 'Confirm & Apply'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

JobDetailModal.displayName = 'JobDetailModal';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: C.bg,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: 'rgba(120,200,240,0.1)',
        maxHeight: '92%',
        minHeight: '60%',
        overflow: 'hidden',
    },
    handle: {
        width: 36, height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 10,
        gap: 10,
    },
    jobTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 26 },
    company: { fontSize: 13, fontWeight: '600', color: C.sub, marginTop: 3 },
    scoreBadge: {
        width: 52, height: 52, borderRadius: 26,
        borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    scoreNum: { fontSize: 15, fontWeight: '900', lineHeight: 17 },
    scoreSub: { fontSize: 7, fontWeight: '700', letterSpacing: 0.8, opacity: 0.8 },
    closeBtn: {
        padding: 4, flexShrink: 0,
    },

    // ── Meta ──
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, color: C.sub, fontWeight: '500' },

    // ── Tabs ──
    tabs: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(120,200,240,0.07)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(120,200,240,0.07)',
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, paddingVertical: 12,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: C.cyan },
    tabText: { fontSize: 13, fontWeight: '600', color: C.sub },
    tabTextActive: { color: C.cyan, fontWeight: '700' },

    // ── Detail content ──
    scrollContent: { padding: 20, paddingBottom: 8 },
    sectionLabel: {
        fontSize: 9, fontWeight: '900', color: C.cyan,
        letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
        borderWidth: 1, borderColor: `${C.purple}45`, backgroundColor: `${C.purple}10`,
    },
    chipText: { fontSize: 10, color: C.purple, fontWeight: '700', letterSpacing: 0.5 },
    description: { fontSize: 14, lineHeight: 22, color: C.sub },

    // ── Cover letter ──
    generatingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    generatingText: { fontSize: 14, fontWeight: '700', color: C.text },
    generatingSub: { fontSize: 12, color: C.sub },
    clToolbar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(120,200,240,0.07)',
    },
    clStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    clStatus: { fontSize: 11, fontWeight: '600' },
    clToolBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(120,200,240,0.12)',
    },
    clToolBtnText: { fontSize: 11, fontWeight: '700' },
    clBody: { fontSize: 14, lineHeight: 22, color: C.text },
    clEditor: {
        fontSize: 14, lineHeight: 22, color: C.text,
        minHeight: 300,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: `${C.cyan}25`,
        borderRadius: 12, padding: 14,
    },

    // ── Actions ──
    actions: {
        flexDirection: 'row', gap: 12,
        padding: 16,
        borderTopWidth: 1, borderTopColor: 'rgba(120,200,240,0.07)',
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    passBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, height: 52, borderRadius: 14,
        borderWidth: 1, borderColor: `${C.pink}40`, backgroundColor: `${C.pink}0D`,
    },
    passBtnText: { color: C.pink, fontSize: 14, fontWeight: '700' },
    applyBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, height: 52, borderRadius: 14,
        backgroundColor: C.cyan,
    },
    applyBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});