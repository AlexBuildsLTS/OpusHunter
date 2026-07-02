/**
 * components/ui/LocationInput.tsx
 * OpusHunter — Location Field with Autocomplete + Geolocation
 * 2026-07-02
 *
 * Any city on earth, typed OR detected. No paid geocoding key needed —
 * uses OpenStreetMap Nominatim (free, no key, rate-limit friendly at
 * this volume). "Use my location" uses expo-location (already a
 * dependency) and reverse-geocodes to "City, Country".
 *
 * Drop-in replacement for a plain location TextInput:
 *   <LocationInput value={form.location} onChange={(v) => setForm(f => ({ ...f, location: v }))} />
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { MapPin, Navigation, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { C } from '../../lib/theme';

interface Suggestion {
    id: string;
    label: string;
}

interface LocationInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

export function LocationInput({ value, onChange, placeholder = 'City, country, or "Remote"' }: LocationInputProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [searching, setSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const [focused, setFocused] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (q.trim().length < 2) { setSuggestions([]); return; }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&featureType=city&q=${encodeURIComponent(q)}`,
                    { headers: { 'Accept-Language': 'en' } },
                );
                const data = await res.json();
                setSuggestions(
                    (data as any[]).map((d, i) => ({
                        id: `${d.place_id ?? i}`,
                        label: [d.address?.city || d.address?.town || d.address?.village || d.name, d.address?.state, d.address?.country]
                            .filter(Boolean)
                            .join(', '),
                    })).filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i),
                );
            } catch {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    }, []);

    const useMyLocation = useCallback(async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
                { headers: { 'Accept-Language': 'en' } },
            );
            const d = await res.json();
            const label = [d.address?.city || d.address?.town || d.address?.village, d.address?.country].filter(Boolean).join(', ');
            if (label) { onChange(label); setSuggestions([]); }
        } catch {
            // Silently no-op — user can still type manually.
        } finally {
            setLocating(false);
        }
    }, [onChange]);

    return (
        <View>
            <View
                className="flex-row items-center gap-2 px-4 border rounded-2xl"
                style={{ backgroundColor: 'rgba(4,12,20,0.75)', borderColor: focused ? `${C.cyan}50` : C.border, height: 52 }}
            >
                <MapPin size={16} color={C.sub} />
                <TextInput
                    value={value}
                    onChangeText={(t) => { onChange(t); search(t); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 150)}
                    placeholder={placeholder}
                    placeholderTextColor={C.dim}
                    style={{ flex: 1, fontSize: 13, color: C.text, ...webNoOutline }}
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={() => { onChange(''); setSuggestions([]); }} hitSlop={8}>
                        <X size={14} color={C.sub} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={useMyLocation}
                    disabled={locating}
                    className="flex-row items-center gap-1.5 pl-2 border-l"
                    style={{ borderColor: C.border }}
                >
                    {locating ? <ActivityIndicator size="small" color={C.cyan} /> : <Navigation size={14} color={C.cyan} />}
                    <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.cyan }}>
                        {locating ? '' : 'Use mine'}
                    </Text>
                </TouchableOpacity>
            </View>

            {focused && (suggestions.length > 0 || searching) && (
                <View className="mt-2 overflow-hidden border rounded-2xl" style={{ backgroundColor: 'rgba(8,16,24,0.96)', borderColor: C.border }}>
                    {searching && suggestions.length === 0 && (
                        <View className="items-center py-4"><ActivityIndicator size="small" color={C.cyan} /></View>
                    )}
                    {suggestions.map((s) => (
                        <TouchableOpacity
                            key={s.id}
                            onPress={() => { onChange(s.label); setSuggestions([]); }}
                            className="flex-row items-center gap-2 px-4 py-3 border-b active:bg-white/5"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                        >
                            <MapPin size={13} color={C.sub} />
                            <Text className="text-[12px]" style={{ color: C.text }} numberOfLines={1}>{s.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}