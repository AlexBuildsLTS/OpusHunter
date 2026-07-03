/**
 * components/configure/SalaryMinPicker.tsx
 * OpusHunter — Real, Persisted Minimum-Salary Filter
 * 2026-07-03 — New. Replaces the fake local-only "Minimum Salary" section
 * — writes an actual integer to automation_rules.salary_min (real column).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../lib/theme';
import { SALARY_STEPS } from './types';

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