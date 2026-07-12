/**
 * components/shared/LocationAutocomplete.tsx
 * Worldwide city/country search via the search-cities edge function (GeoDB,
 * BYOK key cascade). Single real implementation — SetupWizard and
 * ConfigureScreen both import this, not their own copies.
 *
 * FIXED: dropdown results and the selected-chips row below it could render
 * on top of each other on web (absolute-positioned dropdown, normal-flow
 * chips underneath, no reliable stacking guarantee across platforms).
 * Chips are now hidden while the dropdown is open — they reappear the
 * instant it closes, and the two can never occupy the same space again.
 */
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { MapPin, Navigation, Search, X, Plus } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { useCitySearch, type CityResult } from '../../hooks/useCitySearch';

type Coords = { latitude: number | null; longitude: number | null };

interface Props {
    selected: string[];
    onChange: (locations: string[]) => void;
    /** Coordinates of whichever location is first in the list, whenever that
     *  changes. null when unknown (typed freehand, or removed with nothing
     *  confirmed to replace it) — callers should clear stored lat/lng then,
     *  not leave a stale value describing a different place. Optional. */
    onPrimaryCoordsChange?: (coords: Coords | null) => void;
}

export function LocationAutocomplete({ selected, onChange, onPrimaryCoordsChange }: Props) {
    const [query, setQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const { results, loading, error, search, requestNearby, permissionDenied } = useCitySearch();
    // Label → coordinates, populated only as results are actually selected
    // this session. Never guessed; only what's confirmed.
    const coordsByLabel = useRef<Map<string, Coords>>(new Map());

    const labelFor = (place: CityResult) =>
        place.type === 'country'
            ? place.country
            : [place.city, place.region, place.country].filter(Boolean).join(', ');

    const handleTextChange = (text: string) => {
        setQuery(text);
        setShowDropdown(true);
        search(text);
    };

    const addLocation = (label: string, coords: Coords | null = null) => {
        const trimmed = label.trim();
        if (!trimmed || selected.includes(trimmed)) {
            setQuery('');
            setShowDropdown(false);
            return;
        }
        if (coords) coordsByLabel.current.set(trimmed, coords);
        const wasEmpty = selected.length === 0;
        onChange([...selected, trimmed]);
        if (wasEmpty) onPrimaryCoordsChange?.(coords);
        setQuery('');
        setShowDropdown(false);
    };

    const removeLocation = (loc: string) => {
        const wasPrimary = selected[0] === loc;
        const next = selected.filter((l) => l !== loc);
        onChange(next);
        if (wasPrimary) {
            const newPrimary = next[0];
            onPrimaryCoordsChange?.(newPrimary ? coordsByLabel.current.get(newPrimary) ?? null : null);
        }
    };

    const handleUseMyLocation = async () => {
        const nearby = await requestNearby();
        if (nearby.length > 0) {
            const place = nearby[0];
            addLocation(labelFor(place), { latitude: place.latitude, longitude: place.longitude });
        }
    };

    return (
        <View style={{ zIndex: 100 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, position: 'relative', zIndex: 100 }}>
                    <View style={st.inputRow}>
                        <Search size={16} color={C.dim} />
                        <TextInput
                            style={st.inputText}
                            value={query}
                            onChangeText={handleTextChange}
                            onSubmitEditing={() => query.trim() && addLocation(query)}
                            onFocus={() => { if (query.length >= 2) setShowDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            placeholder="City or country — Sweden, Stockholm, Austin, Lagos"
                            placeholderTextColor={C.dim}
                            returnKeyType="done"
                            {...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})}
                        />
                        {loading ? (
                            <ActivityIndicator size="small" color={C.cyan} />
                        ) : query.length > 0 ? (
                            <TouchableOpacity onPress={() => handleTextChange('')}>
                                <X size={16} color={C.sub} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {showDropdown && results.length > 0 && (
                        <View style={st.dropdown}>
                            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                                {results.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={st.dropdownItem}
                                        onPress={() => addLocation(labelFor(item), { latitude: item.latitude, longitude: item.longitude })}
                                    >
                                        <MapPin size={14} color={item.type === 'country' ? C.cyan : C.purple} />
                                        <Text style={{ color: C.text, fontSize: 13, flex: 1, marginLeft: 10 }} numberOfLines={1}>
                                            {labelFor(item)}
                                        </Text>
                                        {item.population != null && (
                                            <Text style={{ color: C.dim, fontSize: 10 }}>
                                                {(item.population / 1_000_000).toFixed(1)}M
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {showDropdown && !loading && query.length >= 2 && results.length === 0 && !error && (
                        <View style={st.dropdown}>
                            <Text style={{ color: C.dim, fontSize: 12, padding: 14 }}>No matches yet — keep typing.</Text>
                        </View>
                    )}

                    {showDropdown && error && (
                        <View style={st.dropdown}>
                            <Text style={{ color: C.pink, fontSize: 12, padding: 14 }}>{error}</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => query.trim() && addLocation(query)}
                    disabled={!query.trim()}
                    style={[st.addBtn, { backgroundColor: query.trim() ? C.cyan : 'rgba(255,255,255,0.05)' }]}
                >
                    <Plus size={20} color={query.trim() ? '#000' : C.sub} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleUseMyLocation} disabled={loading} style={st.gpsBtn} activeOpacity={0.8}>
                    <Navigation size={16} color={C.cyan} />
                </TouchableOpacity>
            </View>

            {permissionDenied && (
                <Text style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
                    Location permission declined — search by typing instead.
                </Text>
            )}

            {/* Hidden while the dropdown is open — see file header for why. */}
            {!showDropdown && selected.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {selected.map((loc, idx) => (
                        <TouchableOpacity
                            key={loc}
                            onPress={() => removeLocation(loc)}
                            style={[st.chip, { borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}10` }]}
                        >
                            <Text style={{ color: C.cyan, fontSize: 12, fontWeight: '700' }}>
                                {loc}{idx === 0 ? '  ·  primary' : ''}
                            </Text>
                            <X size={12} color={C.cyan} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const st = StyleSheet.create({
    inputRow: {
        flex: 1, flexDirection: 'row', alignItems: 'center', height: 50,
        backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.border,
        borderRadius: 14, paddingHorizontal: 14, gap: 10,
    },
    inputText: { flex: 1, color: C.text, fontSize: 15, height: '100%' },
    dropdown: {
        position: 'absolute', top: 58, left: 0, right: 0, backgroundColor: C.core,
        borderWidth: 1, borderColor: C.borderCyan, borderRadius: 14, overflow: 'hidden', zIndex: 100,
        ...(Platform.OS === 'web' ? { boxShadow: '0 12px 32px rgba(0,0,0,0.5)' } as any : {}),
    },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    addBtn: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    gpsBtn: { height: 50, paddingHorizontal: 16, borderRadius: 14, backgroundColor: `${C.cyan}10`, borderWidth: 1, borderColor: `${C.cyan}30`, alignItems: 'center', justifyContent: 'center' },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 6 },
});