/**
 * components/features/configure/LocationAutocomplete.tsx
 * OpusHunter — Worldwide City Autocomplete
 * 2026-07-03 — NEW
 *
 * Replaces the hardcoded 14-city preset chip list (London/New York/Berlin/
 * ...) in both SetupWizard and, going forward, EngineTab's location
 * section. This is genuinely worldwide — every keystroke queries GeoDB
 * Cities API (via supabase/functions/search-cities) across every city on
 * Wikidata, not a fixed list — and offers a "Use my location" button that
 * asks device/browser permission and defaults to nearby cities, largest
 * first, using expo-location (cross-platform: web browser geolocation +
 * native iOS/Android).
 *
 * Selected cities are stored as `"City, Country"` strings, same shape the
 * rest of the app (automation_rules.location, EngineConfig.locations)
 * already expects — no schema or downstream-consumer changes needed.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { MapPin, X, Navigation, Search } from 'lucide-react-native';
import { C } from '../../../lib/theme';
import { useCitySearch, type CityResult } from '../../../hooks/useCitySearch';

function formatCity(c: CityResult): string {
    return c.region && c.region !== c.city ? `${c.city}, ${c.region}, ${c.country}` : `${c.city}, ${c.country}`;
}

export function LocationAutocomplete({
    selected, onChange,
}: {
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const { results, loading, search, requestNearby, permissionDenied } = useCitySearch();
    const [locating, setLocating] = useState(false);
    const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { search(query); }, [query, search]);

    const addCity = useCallback((label: string) => {
        if (!selected.includes(label)) onChange([...selected, label]);
        setQuery('');
    }, [selected, onChange]);

    const removeCity = useCallback((label: string) => {
        onChange(selected.filter((c) => c !== label));
    }, [selected, onChange]);

    const handleUseLocation = useCallback(async () => {
        setLocating(true);
        const nearby = await requestNearby();
        setLocating(false);
        if (nearby.length > 0) {
            addCity(formatCity(nearby[0]));
        }
    }, [requestNearby, addCity]);

    // Delay closing the dropdown on blur so a tap on a result registers first.
    const handleBlur = () => {
        blurTimeout.current = setTimeout(() => setFocused(false), 150);
    };
    const handleFocus = () => {
        if (blurTimeout.current) clearTimeout(blurTimeout.current);
        setFocused(true);
    };

    const showDropdown = focused && query.trim().length >= 2;

    return (
        <View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, position: 'relative' }}>
                    <View
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            borderWidth: 1, borderColor: focused ? `${C.cyan}60` : C.border,
                            borderRadius: 14, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <Search size={14} color={C.dim} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder="Search any city worldwide — Stockholm, Austin, Lagos..."
                            placeholderTextColor={C.dim}
                            style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 12 }}
                            {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                        />
                        {loading && <ActivityIndicator size="small" color={C.cyan} />}
                    </View>

                    {showDropdown && (
                        <View
                            style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                                backgroundColor: C.core, borderWidth: 1, borderColor: C.borderCyan,
                                borderRadius: 14, overflow: 'hidden', zIndex: 50, maxHeight: 260,
                                ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.5)' } as any) : {}),
                            }}
                        >
                            {results.length === 0 && !loading ? (
                                <Text style={{ color: C.dim, fontSize: 12, padding: 14 }}>
                                    No matches yet — keep typing.
                                </Text>
                            ) : (
                                results.map((c) => (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => addCity(formatCity(c))}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 8,
                                            paddingHorizontal: 14, paddingVertical: 11,
                                            borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
                                        }}
                                    >
                                        <MapPin size={13} color={C.purple} />
                                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{c.city}</Text>
                                        <Text style={{ color: C.dim, fontSize: 12 }}>
                                            {c.region && c.region !== c.city ? `${c.region}, ` : ''}{c.country}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={handleUseLocation}
                    disabled={locating}
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 14, borderRadius: 14,
                        borderWidth: 1, borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}0D`,
                    }}
                >
                    {locating ? <ActivityIndicator size="small" color={C.cyan} /> : <Navigation size={14} color={C.cyan} />}
                    <Text style={{ color: C.cyan, fontSize: 12, fontWeight: '700' }}>Use my location</Text>
                </TouchableOpacity>
            </View>

            {permissionDenied && (
                <Text style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
                    Location permission wasn't granted — search by typing instead, that always works.
                </Text>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {selected.length === 0 ? (
                    <Text style={{ color: C.dim, fontSize: 12 }}>No locations added yet.</Text>
                ) : (
                    selected.map((loc) => (
                        <TouchableOpacity
                            key={loc}
                            onPress={() => removeCity(loc)}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                                borderWidth: 1, borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0A`,
                            }}
                        >
                            <Text style={{ color: C.cyan, fontSize: 12, fontWeight: '700' }}>{loc}</Text>
                            <X size={10} color={C.cyan} />
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </View>
    );
}