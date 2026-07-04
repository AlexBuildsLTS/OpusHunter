/**
 * components/features/configure/SalaryMinPicker.tsx
 * OpusHunter — Real, Persisted Minimum-Salary Filter
 * 2026-07-04 — Ported from the orphaned components/configure/ tree (see
 * README §9). Writes to automation_rules.salary_min — a real column,
 * previously only reachable as non-persisted global EngineTab state.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../lib/theme';

const SALARY_STEPS: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: '$50k+', value: 50000 },
    { label: '$75k+', value: 75000 },
    { label: '$100k+', value: 100000 },
    { label: '$125k+', value: 125000 },
    { label: '$150k+', value: 150000 },
    { label: '$200k+', value: 200000 },
];

interface SalaryMinPickerProps {
    value: number | null;
    onChange: (v: number | null) => void;
}

export function SalaryMinPicker({ value, onChange }: SalaryMinPickerProps) {
    return (
        <View>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                MINIMUM SALARY <Text style={{ color: C.sub, fontWeight: '500' }}>(USD/year)</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SALARY_STEPS.map(({ label, value: v }) => {
                    const active = value === v;
                    return (
                        <TouchableOpacity
                            key={label}
                            onPress={() => onChange(v)}
                            activeOpacity={0.8}
                            style={{
                                paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
                                borderWidth: 1,
                                borderColor: active ? `${C.amber}55` : C.border,
                                backgroundColor: active ? `${C.amber}14` : 'rgba(255,255,255,0.03)',
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? C.amber : C.sub }}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}