/**
 * app/(admin)/api-keys.tsx
 * OpusHunter — Admin API Key Management
 *
 * Manages the api_keys table (admin-only RLS).
 * Providers: 'rapidapi' | 'gemini'
 * Keys are masked in the list — shown only during creation.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    Platform, StyleSheet, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Plus, Trash2, X, Eye, EyeOff, CheckCircle2, AlertCircle, Key, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';


type Provider = 'rapidapi' | 'gemini';

interface ApiKeyRow {
    id: string;
    provider: string;
    label: string | null;
    is_active: boolean;
    last_used: string | null;
    created_at: string;
}

function maskKey(key: string): string {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

export default function ApiKeysScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Provider>('rapidapi');
    const [addModalVisible, setAddModal] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newProvider, setNewProvider] = useState<Provider>('rapidapi');
    const [showKey, setShowKey] = useState(false);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        if (banner) { const t = setTimeout(() => setBanner(null), 3500); return () => clearTimeout(t); }
    }, [banner]);

    const { data: keys = [], isLoading } = useQuery<ApiKeyRow[]>({
        queryKey: ['admin_api_keys', activeTab],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('api_keys')
                .select('id, provider, label, is_active, last_used, created_at')
                .eq('provider', activeTab)
                .order('created_at', { ascending: false });
            if (error) throw new Error(error.message);
            return (data ?? []) as ApiKeyRow[];
        },
    });

    const addMutation = useMutation({
        mutationFn: async () => {
            if (!newKey.trim()) throw new Error('API key is required.');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');
            const { error } = await supabase.from('api_keys').insert({
                provider: newProvider,
                api_key: newKey.trim(),
                label: newLabel.trim() || null,
                is_active: true,
                created_by: user.id,
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_api_keys'] });
            setAddModal(false);
            setNewKey(''); setNewLabel(''); setShowKey(false);
            setBanner({ ok: true, text: 'Key added successfully.' });
        },
        onError: (e: Error) => setBanner({ ok: false, text: e.message }),
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase.from('api_keys').update({ is_active: active }).eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_api_keys'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('api_keys').delete().eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_api_keys'] });
            setDeleteConfirm(null);
            setBanner({ ok: true, text: 'Key deleted.' });
        },
        onError: (e: Error) => setBanner({ ok: false, text: e.message }),
    });

    const TABS: { key: Provider; label: string; color: string }[] = [
        { key: 'rapidapi', label: 'RapidAPI (JSearch)', color: C.cyan },
        { key: 'gemini', label: 'Gemini AI', color: C.purple },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Back */}
                <View style={s.topRow}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={16} color={C.cyan} />
                        <Text style={s.backText}>Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setNewProvider(activeTab); setAddModal(true); }} style={s.addBtn} activeOpacity={0.8}>
                        <Plus size={16} color="#000" />
                        <Text style={s.addBtnText}>Add Key</Text>
                    </TouchableOpacity>
                </View>

                <Text style={s.title}>API Key Management</Text>
                <Text style={s.sub}>Keys are masked after creation. Service role only can read raw values.</Text>

                {/* Banner */}
                {banner && (
                    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                        style={[s.banner, { borderColor: banner.ok ? `${C.cyan}30` : `${C.pink}30`, backgroundColor: banner.ok ? `${C.cyan}08` : `${C.pink}08` }]}>
                        {banner.ok ? <CheckCircle2 size={14} color={C.cyan} /> : <AlertCircle size={14} color={C.pink} />}
                        <Text style={[s.bannerText, { color: banner.ok ? C.cyan : C.pink }]}>{banner.text}</Text>
                    </Animated.View>
                )}

                {/* Provider tabs */}
                <View style={s.tabs}>
                    {TABS.map(tab => (
                        <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}
                            style={[s.tab, activeTab === tab.key && { borderColor: `${tab.color}50`, backgroundColor: `${tab.color}0D` }]}
                            activeOpacity={0.7}>
                            <Text style={[s.tabText, { color: activeTab === tab.key ? tab.color : C.sub }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Key list */}
                {isLoading ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={C.cyan} /></View>
                ) : keys.length === 0 ? (
                    <View style={s.emptyState}>
                        <Key size={28} color={`${C.purple}60`} />
                        <Text style={s.emptyTitle}>No keys yet</Text>
                        <Text style={s.emptySub}>Add a fallback {activeTab === 'rapidapi' ? 'RapidAPI' : 'Gemini'} key. The scraper will rotate through them on rate limit.</Text>
                    </View>
                ) : (
                    <View style={{ gap: 10, marginTop: 4 }}>
                        {keys.map((key: any) => (
                            <Animated.View key={key.id} entering={FadeInDown.springify()} style={s.keyCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.keyLabel}>{key.label ?? `${key.provider} key`}</Text>
                                    <Text style={s.keyMasked}>••••••••••••••••••••••••••••••••</Text>
                                    <View style={s.keyMeta}>
                                        {key.last_used && <Text style={s.keyMetaText}>Last used: {new Date(key.last_used).toLocaleDateString()}</Text>}
                                        <Text style={s.keyMetaText}>Added: {new Date(key.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                <View style={s.keyActions}>
                                    <Switch
                                        value={key.is_active}
                                        onValueChange={(v) => toggleMutation.mutate({ id: key.id, active: v })}
                                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.cyan}50` }}
                                        thumbColor={key.is_active ? C.cyan : 'rgba(255,255,255,0.3)'}
                                        style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                                    />
                                    <TouchableOpacity onPress={() => setDeleteConfirm(key.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Trash2 size={15} color={C.pink} />
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* ── Add Key Modal ── */}
            <Modal visible={addModalVisible} animationType="slide" transparent statusBarTranslucent>
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Add API Key</Text>
                            <TouchableOpacity onPress={() => { setAddModal(false); setNewKey(''); setNewLabel(''); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <X size={18} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
                            {/* Provider selector */}
                            <View>
                                <Text style={s.fieldLabel}>PROVIDER</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                                    {(['rapidapi', 'gemini'] as const).map(p => {
                                        const isRapidAPI = p === 'rapidapi';
                                        return (
                                            <TouchableOpacity key={p} onPress={() => setNewProvider(p)}
                                                style={[s.providerChip, newProvider === p && { borderColor: `${C.cyan}55`, backgroundColor: `${C.cyan}10` }]}>
                                                <Text style={[s.providerChipText, { color: newProvider === p ? C.cyan : C.sub }]}>
                                                    {isRapidAPI ? 'RapidAPI' : 'Gemini'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Label */}
                            <View>
                                <Text style={s.fieldLabel}>LABEL <Text style={s.fieldOptional}>(optional)</Text></Text>
                                <TextInput style={s.input} placeholder="e.g. Backup key 1" placeholderTextColor="#3D4A55"
                                    value={newLabel} onChangeText={setNewLabel} autoCorrect={false}
                                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})} />
                            </View>

                            {/* API Key */}
                            <View>
                                <Text style={s.fieldLabel}>API KEY</Text>
                                <View style={s.keyInputRow}>
                                    <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]}
                                        placeholder="Paste your API key here"
                                        placeholderTextColor="#3D4A55"
                                        value={newKey}
                                        onChangeText={setNewKey}
                                        secureTextEntry={!showKey}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                                    />
                                    <TouchableOpacity onPress={() => setShowKey(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        {showKey ? <EyeOff size={16} color={C.sub} /> : <Eye size={16} color={C.sub} />}
                                    </TouchableOpacity>
                                </View>
                                <Text style={s.keyWarning}>⚠ This key is stored encrypted in Supabase and readable only via service role.</Text>
                            </View>
                        </ScrollView>

                        <View style={s.modalFooter}>
                            <TouchableOpacity
                                onPress={() => addMutation.mutate()}
                                disabled={addMutation.isPending || !newKey.trim()}
                                style={[s.saveBtn, (!newKey.trim() || addMutation.isPending) && { opacity: 0.5 }]}
                                activeOpacity={0.8}>
                                {addMutation.isPending
                                    ? <ActivityIndicator color="#000" />
                                    : <Text style={s.saveBtnText}>Add Key</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Delete confirm ── */}
            <Modal visible={!!deleteConfirm} transparent animationType="fade">
                <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
                    <View style={[s.modalCard, { maxHeight: 220, borderRadius: 20 }]}>
                        <View style={{ padding: 24 }}>
                            <Text style={[s.modalTitle, { marginBottom: 8 }]}>Delete Key?</Text>
                            <Text style={{ color: C.sub, fontSize: 13, lineHeight: 20 }}>This cannot be undone. If this was the only active key for this provider, scraping will fall back to the env secret.</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                <TouchableOpacity onPress={() => setDeleteConfirm(null)} style={[s.confirmBtn, { borderColor: C.border }]}>
                                    <Text style={[s.confirmBtnText, { color: C.sub }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
                                    disabled={deleteMutation.isPending}
                                    style={[s.confirmBtn, { borderColor: `${C.pink}50`, backgroundColor: `${C.pink}12` }]}>
                                    {deleteMutation.isPending
                                        ? <ActivityIndicator size="small" color={C.pink} />
                                        : <Text style={[s.confirmBtnText, { color: C.pink }]}>Delete</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    scroll: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 40 : 56, paddingHorizontal: 20, paddingBottom: 100, maxWidth: 680, width: '100%', alignSelf: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    backText: { fontSize: 13, color: C.cyan, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.cyan },
    addBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },
    title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
    sub: { fontSize: 12, color: C.sub, lineHeight: 18, marginBottom: 20 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    tabText: { fontSize: 12, fontWeight: '700' },
    keyCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(11,24,34,0.8)', gap: 12 },
    keyLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
    keyMasked: { fontSize: 12, color: C.sub, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }) },
    keyMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
    keyMetaText: { fontSize: 10, color: 'rgba(216,228,236,0.3)' },
    keyActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },
    emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.sub },
    emptySub: { fontSize: 12, color: `${C.sub}80`, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
    // modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: C.core, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.borderCyan, maxHeight: '88%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    saveBtn: { height: 52, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    fieldLabel: { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    fieldOptional: { color: C.sub, fontWeight: '500' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.borderCyan, borderRadius: 12, padding: 14, color: C.text, fontSize: 14 },
    keyInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.borderCyan, borderRadius: 12, paddingRight: 14, gap: 4 },
    keyWarning: { fontSize: 11, color: C.amber, marginTop: 6, lineHeight: 16 },
    providerChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    providerChipText: { fontSize: 12, fontWeight: '700' },
    confirmBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    confirmBtnText: { fontSize: 13, fontWeight: '700' },
});