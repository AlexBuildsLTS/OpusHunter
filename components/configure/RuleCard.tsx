/**
 * components/configure/RuleCard.tsx
 * OpusHunter — Search Rule Row
 * 2026-07-03 — New file (extracted from the old monolithic configure.tsx).
 * Now also displays experience level / remote preference / salary badges
 * when set, so the real, persisted state is visible, not hidden in a modal.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { Tag, MapPin, Briefcase, FileText, Edit3, Trash2, BarChart2, DollarSign } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { GlassCard } from '../ui/GlassCard';
import { WORK_TYPE_LABELS, type AutomationRule } from './types';

interface RuleCardProps {
    rule: AutomationRule;
    onEdit: (rule: AutomationRule) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, active: boolean) => void;
}

export function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
    const hasExtras = (rule.experience_levels?.length ?? 0) > 0 || rule.remote_preference !== 'any' || rule.salary_min;

    return (
        <Animated.View layout={Layout.springify().damping(20)} entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}>
            <GlassCard tint={rule.is_active ? 'cyan' : 'default'} padding="sm" className="flex-row items-center gap-3">
                <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: rule.is_active ? C.cyan : 'transparent' }} />
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Tag size={12} color={C.cyan} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: 'row' }}>
                            {rule.keywords.map((kw) => (
                                <View key={kw} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1, borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}0A` }}>
                                    <Text style={{ fontSize: 10, color: C.cyan, fontWeight: '700' }}>{kw}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
                        <MapPin size={12} color={C.purple} />
                        <Text style={{ fontSize: 11, color: C.sub }}>{rule.location}</Text>
                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.sub }} />
                        <Briefcase size={12} color={C.purple} />
                        <Text style={{ fontSize: 11, color: C.sub }}>{rule.work_types.map((wt) => WORK_TYPE_LABELS[wt] ?? wt).join(', ')}</Text>
                    </View>

                    {hasExtras && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                            {(rule.experience_levels ?? []).map((lvl) => (
                                <View key={lvl} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${C.amber}10` }}>
                                    <BarChart2 size={9} color={C.amber} />
                                    <Text style={{ fontSize: 9, color: C.amber, fontWeight: '700' }}>{lvl}</Text>
                                </View>
                            ))}
                            {rule.remote_preference !== 'any' && (
                                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${C.green}10` }}>
                                    <Text style={{ fontSize: 9, color: C.green, fontWeight: '700' }}>{rule.remote_preference.replace('_', ' ').toUpperCase()}</Text>
                                </View>
                            )}
                            {rule.salary_min && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${C.pink}10` }}>
                                    <DollarSign size={9} color={C.pink} />
                                    <Text style={{ fontSize: 9, color: C.pink, fontWeight: '700' }}>{Math.round(rule.salary_min / 1000)}k+</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {rule.base_cover_letter.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <FileText size={12} color={C.dim} />
                            <Text style={{ fontSize: 10, color: C.dim, flex: 1 }} numberOfLines={1}>{rule.base_cover_letter.substring(0, 55)}…</Text>
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
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