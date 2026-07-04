/**
 * components/features/configure/ExperienceLevelPicker.tsx
 * OpusHunter — Real, Persisted Experience-Level Multi-Select
 * 2026-07-04 — Ported from the orphaned components/configure/ tree (see
 * README §9 — that split was never wired to any route, this piece of it
 * was correct and salvaged rather than deleted). Writes to
 * automation_rules.experience_levels — an existing real column your
 * database.types.ts already declares, previously never actually written
 * per-rule (only as global, non-persisted EngineTab UI state).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { EXPERIENCE_LEVELS, EXPERIENCE_COLORS } from '../features/configure/constants';

interface ExperienceLevelPickerProps {
    value: string[];
    onChange: (levels: string[]) => void;
}

export function ExperienceLevelPicker({ value, onChange }: ExperienceLevelPickerProps) {
    const toggle = (lvl: string) => {
        onChange(value.includes(lvl) ? value.filter((v) => v !== lvl) : [...value, lvl]);
    };

    return (
        <View>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                EXPERIENCE LEVEL <Text style={{ color: C.sub, fontWeight: '500' }}>(optional — leave empty for any)</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXPERIENCE_LEVELS.map((lvl: string) => {
                    const color = EXPERIENCE_COLORS[lvl];
                    const active = value.includes(lvl);
                    return (
                        <TouchableOpacity
                            key={lvl}
                            onPress={() => toggle(lvl)}
                            activeOpacity={0.8}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 5,
                                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                                borderWidth: 1,
                                borderColor: active ? `${color}55` : C.border,
                                backgroundColor: active ? `${color}12` : 'rgba(255,255,255,0.03)',
                            }}
                        >
                            {active && <Check size={11} color={color} />}
                            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? color : C.sub }}>{lvl}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}