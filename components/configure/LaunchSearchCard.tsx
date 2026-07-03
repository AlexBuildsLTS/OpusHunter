/**
 * components/configure/LaunchSearchCard.tsx
 * OpusHunter — Launch Search Hero + Per-Rule Result Summary
 * 2026-07-03 — New file. Replaces the fake Engine tab's "Engine Ready"
 * card. Same real triggerScrape() call as before, plus the key-source
 * badges showing exactly which credential tier served each rule.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Zap, RefreshCw } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { GlassCard } from '../ui/GlassCard';

const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
    byok: { label: 'YOUR KEY', color: C.green },
    pool: { label: 'SYSTEM POOL', color: C.cyan },
    env: { label: 'SYSTEM DEFAULT', color: C.purple },
};

function KeySourceBadge({ source }: { source?: string }) {
    if (!source || source.startsWith('failed')) {
        return (
            <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: `${C.pink}40`, backgroundColor: `${C.pink}12` }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: C.pink, letterSpacing: 0.5 }}>FAILED</Text>
            </View>
        );
    }
    const cfg = SOURCE_LABEL[source] ?? { label: source.toUpperCase(), color: C.sub };
    return (
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}12` }}>
            <Text style={{ fontSize: 8, fontWeight: '900', color: cfg.color, letterSpacing: 0.5 }}>{cfg.label}</Text>
        </View>
    );
}

interface LaunchSearchCardProps {
    activeRulesCount: number;
    isScraping: boolean;
    onLaunch: () => void;
    summary: Array<{ rule: string; fetched: number; new: number; key_source?: string }>;
}

export function LaunchSearchCard({ activeRulesCount, isScraping, onLaunch, summary }: LaunchSearchCardProps) {
    return (
        <GlassCard tint="cyan" glow padding="md">
            <View className="flex-row items-center gap-3.5">
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: `${C.cyan}12`, borderWidth: 1, borderColor: `${C.cyan}30`, alignItems: 'center', justifyContent: 'center' }}>
                    {isScraping ? <ActivityIndicator color={C.cyan} /> : <Zap size={20} color={C.cyan} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>Launch Search</Text>
                    <Text style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                        {activeRulesCount > 0 ? `Searching with ${activeRulesCount} active rule${activeRulesCount === 1 ? '' : 's'}` : 'No active rules — add one below first'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onLaunch}
                    disabled={isScraping || activeRulesCount === 0}
                    style={{
                        paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
                        backgroundColor: C.cyan, minWidth: 62, alignItems: 'center',
                        opacity: (isScraping || activeRulesCount === 0) ? 0.4 : 1,
                    }}
                    activeOpacity={0.85}
                >
                    {isScraping ? <RefreshCw size={13} color="#000" /> : <Text style={{ color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>SEARCH</Text>}
                </TouchableOpacity>
            </View>

            {summary.length > 0 && (
                <View style={{ marginTop: 16, gap: 8 }}>
                    <View style={{ height: 1, backgroundColor: C.border, marginBottom: 4 }} />
                    {summary.map((s, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <Text style={{ fontSize: 11, color: C.sub, flex: 1 }} numberOfLines={1}>{s.rule}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }}>
                                    {s.key_source?.startsWith('failed') ? '—' : `${s.new} new / ${s.fetched} found`}
                                </Text>
                                <KeySourceBadge source={s.key_source} />
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </GlassCard>
    );
}