/**
 * components/pipeline/GenerateCoverLetterButton.tsx
 * OpusHunter — Per-Job Cover Letter Generation
 * 2026-07-02
 *
 * Wires the previously-orphaned `generate-cover-letter` edge function (BYOK
 * → pool → env Gemini cascade already implemented server-side) to an actual
 * UI entry point. Drop into SwipeableJobCard or JobDetailModal:
 *
 *   <GenerateCoverLetterButton jobId={job.id} jobTitle={job.title} company={job.company} />
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { FileText, Copy, Check, X, Sparkles } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';
import { GlassCard } from '../ui/GlassCard';

interface GenerateCoverLetterButtonProps {
    jobId: string;
    jobTitle: string;
    company: string;
    /** Compact icon-only variant for tight card layouts (e.g. SwipeableJobCard). */
    compact?: boolean;
}

export function GenerateCoverLetterButton({ jobId, jobTitle, company, compact }: GenerateCoverLetterButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [letter, setLetter] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generate = useCallback(async () => {
        setOpen(true);
        setLoading(true);
        setError(null);
        setLetter(null);
        try {
            const { data, error: fnError } = await supabase.functions.invoke('generate-cover-letter', {
                body: { job_id: jobId, preview: true },
            });
            if (fnError) throw fnError;
            setLetter((data as any)?.cover_letter ?? '');
        } catch (e: any) {
            setError(e?.message ?? 'Generation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    const copy = useCallback(async () => {
        if (!letter) return;
        await Clipboard.setStringAsync(letter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [letter]);

    return (
        <>
            <TouchableOpacity
                onPress={generate}
                activeOpacity={0.8}
                className={compact
                    ? 'w-9 h-9 rounded-full items-center justify-center border border-brand-cyan/30'
                    : 'flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-cyan/30'}
                style={{ backgroundColor: `${C.cyan}12` }}
            >
                <FileText size={compact ? 15 : 14} color={C.cyan} />
                {!compact && <Text className="text-[11px] font-black uppercase tracking-wider" style={{ color: C.cyan }}>Cover Letter</Text>}
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(4,8,6,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <GlassCard hoverable={false} tint="cyan" style={{ width: '100%', maxWidth: 520, maxHeight: '80%' }}>
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center gap-2">
                                <Sparkles size={16} color={C.cyan} />
                                <Text className="text-[13px] font-extrabold" style={{ color: C.text }} numberOfLines={1}>
                                    {jobTitle} @ {company}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                                <X size={18} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        {loading && (
                            <View className="items-center py-16 gap-3">
                                <ActivityIndicator color={C.cyan} size="large" />
                                <Text className="text-[11px] uppercase tracking-widest" style={{ color: C.sub }}>Tailoring your letter…</Text>
                            </View>
                        )}

                        {error && !loading && (
                            <View className="items-center py-10 gap-2">
                                <Text className="text-[12px] text-center" style={{ color: C.pink }}>{error}</Text>
                                <TouchableOpacity onPress={generate} className="mt-2 px-4 py-2 rounded-xl" style={{ backgroundColor: `${C.cyan}20` }}>
                                    <Text className="text-[11px] font-bold" style={{ color: C.cyan }}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {letter && !loading && (
                            <>
                                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                                    <Text selectable className="text-[13px] leading-6" style={{ color: C.text }}>{letter}</Text>
                                </ScrollView>
                                <TouchableOpacity
                                    onPress={copy}
                                    activeOpacity={0.85}
                                    className="flex-row items-center justify-center gap-2 mt-4 rounded-xl"
                                    style={{ backgroundColor: C.cyan, height: 48 }}
                                >
                                    {copied ? <Check size={16} color="#020507" /> : <Copy size={16} color="#020507" />}
                                    <Text className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#020507' }}>
                                        {copied ? 'Copied' : 'Copy to clipboard'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </GlassCard>
                </View>
            </Modal>
        </>
    );
}