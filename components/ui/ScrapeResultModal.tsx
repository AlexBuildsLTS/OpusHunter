/**
 * components/ui/ScrapeResultModal.tsx
 * OpusHunter — Scrape Result Modal
 *
 * 2026-07-14 — NEW. Replaces the native window.alert()/Alert.alert() call
 * that used to fire when a scrape finished — a plain OS dialog box with no
 * theming, no dark mode, blocking on web, and inconsistent across
 * platforms. This renders in-theme (GlassCard, real colors, spring
 * entrance) and shows the actual per-rule breakdown the edge function
 * already returns (fetched / new / filtered-by-distance / which key
 * served the request) instead of just a flat message string — useful for
 * seeing exactly why "no new jobs" happened, not just that it did.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CheckCircle2, AlertTriangle, MapPin } from 'lucide-react-native';
import { C } from '../../lib/theme';
import type { ScrapeResult } from '../../hooks/useEdgeScraper';

export function ScrapeResultModal({
    result,
    onDismiss,
}: {
    result: ScrapeResult | null;
    onDismiss: () => void;
}) {
    if (!result) return null;
    const accent = result.ok ? C.cyan : C.pink;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
            <Animated.View entering={FadeIn.duration(180)} style={s.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />

                <Animated.View entering={FadeInDown.springify().damping(18)} style={s.card}>
                    <View style={[s.iconWrap, { backgroundColor: `${accent}14`, borderColor: `${accent}30` }]}>
                        {result.ok
                            ? <CheckCircle2 size={28} color={accent} />
                            : <AlertTriangle size={28} color={accent} />}
                    </View>

                    <Text style={s.title}>{result.title}</Text>
                    <Text style={s.message}>{result.message}</Text>

                    {!!result.summary?.length && (
                        <ScrollView style={s.summaryBox} showsVerticalScrollIndicator={false}>
                            {result.summary.map((row, i) => (
                                <View key={i} style={[s.summaryRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <MapPin size={11} color={C.sub} />
                                        <Text style={s.summaryRule} numberOfLines={1}>{row.rule}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                                        <Text style={s.summaryStat}>{row.fetched} fetched</Text>
                                        <Text style={[s.summaryStat, { color: C.cyan }]}>{row.new} new</Text>
                                        {!!row.filtered_by_distance && (
                                            <Text style={[s.summaryStat, { color: C.amber }]}>{row.filtered_by_distance} outside commute range</Text>
                                        )}
                                        {row.key_source && (
                                            <Text style={[s.summaryStat, { color: C.dim }]}>via {row.key_source}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <TouchableOpacity onPress={onDismiss} style={[s.btn, { backgroundColor: accent }]} activeOpacity={0.85}>
                        <Text style={s.btnText}>OK</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(2,5,7,0.78)',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)' } as any : {}),
    },
    card: {
        width: '100%', maxWidth: 420,
        backgroundColor: 'rgba(8,16,24,0.97)',
        borderWidth: 1, borderColor: C.border,
        borderRadius: 24, padding: 26, alignItems: 'center',
    },
    iconWrap: {
        width: 56, height: 56, borderRadius: 28, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    title: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
    message: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 19, marginBottom: 6 },
    summaryBox: { width: '100%', maxHeight: 180, marginTop: 12, marginBottom: 4 },
    summaryRow: { paddingVertical: 10 },
    summaryRule: { fontSize: 12, fontWeight: '700', color: C.text, flex: 1 },
    summaryStat: { fontSize: 11, color: C.sub, fontWeight: '600' },
    btn: { width: '100%', height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    btnText: { fontSize: 13, fontWeight: '800', color: '#000' },
});