/**
 * components/features/configure/RemotePreferencePicker.tsx
 * OpusHunter — Real, Persisted Work-Arrangement Filter
 * 2026-07-04 — Ported from the orphaned components/configure/ tree (see
 * README §9). Writes to automation_rules.remote_preference — a real
 * column, previously only reachable as non-persisted global EngineTab state.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../../lib/theme';
import { REMOTE_OPTIONS } from './constants';

interface RemotePreferencePickerProps {
    value: string;
    onChange: (v: string) => void;
}

export function RemotePreferencePicker({ value, onChange }: RemotePreferencePickerProps) {
    return (
        <View>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                WORK ARRANGEMENT
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REMOTE_OPTIONS.map(({ key, label }) => {
                    const active = value === key;
                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => onChange(key)}
                            activeOpacity={0.8}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10,
                                borderWidth: 1,
                                borderColor: active ? `${C.cyan}50` : C.border,
                                backgroundColor: active ? `${C.cyan}15` : 'rgba(255,255,255,0.04)',
                            }}
                        >
                            {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan }} />}
                            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? C.cyan : C.sub }}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}