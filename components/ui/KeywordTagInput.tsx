/**
 * components/ui/KeywordTagInput.tsx
 * OpusHunter — Clickable Keyword Tags
 * 2026-07-02
 *
 * Replaces the "React Native, TypeScript, Expo..." free-text field in
 * configure.tsx with tap-to-add chips: a curated starter set the user taps,
 * plus a small input for anything not listed. Still resolves to the same
 * string[] the form/DB already expects — zero backend change.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { C } from '../../lib/theme';

const SUGGESTED = [
    'React', 'React Native', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
    'Frontend', 'Backend', 'Full Stack', 'DevOps', 'Product Manager', 'UX Designer',
    'Data Analyst', 'Software Engineer', 'Mobile Developer', 'Remote',
];

interface KeywordTagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
}

export function KeywordTagInput({ value, onChange }: KeywordTagInputProps) {
    const [custom, setCustom] = useState('');

    const toggle = useCallback((tag: string) => {
        onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
    }, [value, onChange]);

    const addCustom = useCallback(() => {
        const t = custom.trim();
        if (t && !value.includes(t)) onChange([...value, t]);
        setCustom('');
    }, [custom, value, onChange]);

    const remove = useCallback((tag: string) => onChange(value.filter((t) => t !== tag)), [value, onChange]);

    const customTags = value.filter((t) => !SUGGESTED.includes(t));

    return (
        <View>
            {value.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-3">
                    {value.map((tag) => (
                        <TouchableOpacity
                            key={tag}
                            onPress={() => remove(tag)}
                            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
                            style={{ backgroundColor: `${C.cyan}18`, borderColor: `${C.cyan}45` }}
                        >
                            <Text className="text-[11px] font-bold" style={{ color: C.cyan }}>{tag}</Text>
                            <X size={11} color={C.cyan} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.sub }}>Tap to add</Text>
            <View className="flex-row flex-wrap gap-2">
                {SUGGESTED.filter((s) => !value.includes(s)).map((tag) => (
                    <TouchableOpacity
                        key={tag}
                        onPress={() => toggle(tag)}
                        className="flex-row items-center gap-1 px-3 py-1.5 rounded-full border border-white/10"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                        <Plus size={11} color={C.sub} />
                        <Text className="text-[11px]" style={{ color: C.sub }}>{tag}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View className="flex-row items-center gap-2 mt-3 px-4 border rounded-2xl" style={{ backgroundColor: 'rgba(4,12,20,0.7)', borderColor: C.border, height: 46 }}>
                <TextInput
                    value={custom}
                    onChangeText={setCustom}
                    onSubmitEditing={addCustom}
                    placeholder="Add your own role/skill…"
                    placeholderTextColor={C.dim}
                    style={{ flex: 1, fontSize: 13, color: C.text, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }}
                />
                <TouchableOpacity onPress={addCustom} disabled={!custom.trim()} hitSlop={8}>
                    <Plus size={16} color={custom.trim() ? C.cyan : C.dim} />
                </TouchableOpacity>
            </View>
        </View>
    );
}