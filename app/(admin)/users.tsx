/**
 * app/(admin)/users.tsx
 * OpusHunter — Admin User Management
 * 2026-06-29 (rebuilt)
 *
 * Role changes go through ONE path only: supabase.rpc('force_set_role', {...}).
 * This is a SECURITY DEFINER function (see migration_complete.sql) that:
 *   1. Verifies the CALLER is an admin (re-checked server-side every time)
 *   2. Validates the target role value
 *   3. Updates the row directly, bypassing RLS entirely
 *
 * This is the most reliable role-change path available — it cannot be
 * affected by RLS policy edge cases, client-side caching, or stale reads,
 * because it runs as a single atomic server-side transaction.
 *
 * After a successful mutation we:
 *   - Optimistically patch the local list immediately (instant UI feedback)
 *   - Invalidate the query so the next fetch confirms the server state
 *   - Show a success banner with the new role explicitly named
 */

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
    Search, Shield, Trash2, User,
    CheckCircle2, AlertCircle, Mail, X,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';
import { C, ROLE_CFG } from '../../lib/theme';
import { AppHeader } from '../../components/layout/AppHeader';


type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type RoleType = 'member' | 'premium' | 'admin';
const ROLES: RoleType[] = ['member', 'premium', 'admin'];
const DEFAULT_ROLE: RoleType = 'member';

function getInitials(name: string | null, email: string): string {
    const str = name || email;
    const parts = str.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return str.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return '—'; }
}

const RoleBadge = ({ role }: { role: string }) => {
    const color = ROLE_CFG[role as RoleType]?.color ?? C.purple;
    return (
        <View style={[s.roleBadge, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
            <Text style={[s.roleBadgeText, { color }]}>{role.toUpperCase()}</Text>
        </View>
    );
};

// ── Modify Identity Sheet ───────────────────────────────────────────────────────

function ModifyIdentitySheet({
    user: u, onClose, onRoleChange, onPurge, updating, purging, currentAdminId,
}: {
    user: ProfileRow; onClose: () => void;
    onRoleChange: (email: string, role: RoleType) => void;
    onPurge: (id: string) => void;
    updating: boolean; purging: boolean;
    currentAdminId: string | undefined;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isSelf = u.id === currentAdminId;

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={s.sheetOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                <Animated.View entering={FadeInDown.springify()} style={s.sheet}>
                    <View style={s.sheetIconWrap}>
                        <Shield size={28} color={C.cyan} />
                    </View>
                    <Text style={s.sheetTitle}>MODIFY IDENTITY</Text>
                    <Text style={s.sheetEmail}>{u.email}</Text>

                    <Text style={s.sheetSectionLabel}>SYSTEM ROLE</Text>
                    <View style={s.roleGrid}>
                        {ROLES.map((role) => {
                            const color = ROLE_CFG[role].color;
                            const current = (u.role ?? 'member') === role;
                            return (
                                <TouchableOpacity
                                    key={role}
                                    onPress={() => !current && onRoleChange(u.email, role)}
                                    disabled={current || updating}
                                    style={[
                                        s.roleBtn,
                                        current
                                            ? { borderColor: `${color}70`, backgroundColor: `${color}1A` }
                                            : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' },
                                    ]}
                                    activeOpacity={0.75}
                                >
                                    {updating && current
                                        ? <ActivityIndicator size="small" color={color} />
                                        : (
                                            <>
                                                <Text style={[s.roleBtnText, { color: current ? color : C.sub }]}>{role.toUpperCase()}</Text>
                                                {current && <CheckCircle2 size={12} color={color} style={{ marginLeft: 4 }} />}
                                            </>
                                        )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {isSelf && (
                        <Text style={s.selfWarning}>
                            ⚠ You are editing your own account. Demoting yourself from admin will revoke this panel's access immediately.
                        </Text>
                    )}

                    <View style={s.sheetDivider} />

                    {!confirmDelete ? (
                        <TouchableOpacity onPress={() => setConfirmDelete(true)} style={s.deleteBtn} activeOpacity={0.75}>
                            <Trash2 size={14} color={C.pink} />
                            <Text style={s.deleteBtnText}>Delete Account & All Data</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={s.confirmBox}>
                            <Text style={s.confirmText}>Permanently delete this account? This cannot be undone.</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                <TouchableOpacity onPress={() => setConfirmDelete(false)} style={[s.confirmBtn, { borderColor: C.border }]}>
                                    <Text style={{ color: C.sub, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { onPurge(u.id); setConfirmDelete(false); }}
                                    disabled={purging || isSelf}
                                    style={[s.confirmBtn, { borderColor: C.pink, backgroundColor: `${C.pink}15`, flex: 1, opacity: isSelf ? 0.4 : 1 }]}
                                >
                                    {purging ? <ActivityIndicator size="small" color={C.pink} /> : <Text style={{ color: C.pink, fontWeight: '700', fontSize: 13 }}>Delete Forever</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>CLOSE PANEL</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminUsersScreen() {
    const router = useRouter();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<ProfileRow | null>(null);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | undefined>();

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id));
    }, []);

    const showBanner = (ok: boolean, text: string) => {
        setBanner({ ok, text });
        setTimeout(() => setBanner(null), 3500);
    };

    // ── Fetch all profiles ───────────────────────────────────────────────────
    const { data: profiles = [], isLoading, isError, refetch } = useQuery<ProfileRow[]>({
        queryKey: ['admin_profiles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(error.message);
            return data ?? [];
        },
        staleTime: 15_000,
    });

    // ── Role update — bulletproof RPC path ──────────────────────────────────
    const updateRoleMutation = useMutation({
        mutationFn: async ({ email, role }: { email: string; role: RoleType }) => {
            const { error } = await supabase.rpc('force_set_role', {
                target_email: email,
                target_role: role,
            });
            if (error) throw new Error(error.message);
            return { email, role };
        },
        onMutate: async ({ email, role }) => {
            // Optimistic update — instant UI feedback, server confirms on refetch
            await qc.cancelQueries({ queryKey: ['admin_profiles'] });
            const prev = qc.getQueryData<ProfileRow[]>(['admin_profiles']);
            qc.setQueryData<ProfileRow[]>(['admin_profiles'], (old: ProfileRow[] | undefined) =>
                old?.map((p: ProfileRow) => (p.email === email ? { ...p, role } : p)) ?? []
            );
            return { prev };
        },
        onSuccess: (_, { email, role }) => {
            qc.invalidateQueries({ queryKey: ['admin_profiles'] });
            if (selected?.email === email) {
                setSelected((prev) => prev ? { ...prev, role } : prev);
            }
            showBanner(true, `Role updated to ${role.toUpperCase()}.`);
        },
        onError: (err: Error, _vars, ctx) => {
            // Roll back optimistic update on failure
            if (ctx?.prev) qc.setQueryData(['admin_profiles'], ctx.prev);
            showBanner(false, err.message);
        },
    });

    // ── Purge user ────────────────────────────────────────────────────────────
    const purgeMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase.rpc('admin_delete_user', { target_id: userId });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin_profiles'] });
            setSelected(null);
            showBanner(true, 'User deleted.');
        },
        onError: (err: Error) => showBanner(false, err.message),
    });

    const filtered = profiles.filter((p: ProfileRow) => {
        const q = search.toLowerCase();
        return p.email.toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q);
    });

    const adminCount = profiles.filter((p: ProfileRow) => p.role === 'admin').length;
    const premiumCount = profiles.filter((p: ProfileRow) => p.role === 'premium').length;
    const memberCount = profiles.filter((p: ProfileRow) => (p.role ?? 'member') === 'member').length;

    return (
        <View style={s.root}>
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                    style={[s.banner, { backgroundColor: banner.ok ? `${C.green}15` : `${C.pink}15`, borderColor: banner.ok ? `${C.green}40` : `${C.pink}40` }]}
                >
                    {banner.ok ? <CheckCircle2 size={15} color={C.green} /> : <AlertCircle size={15} color={C.pink} />}
                    <Text style={[s.bannerText, { color: banner.ok ? C.green : C.pink }]}>{banner.text}</Text>
                </Animated.View>
            )}

            <AppHeader title="User Management" subtitle={`${profiles.length} total accounts`} />

            {profiles.length > 0 && (
                <View style={s.statsRow}>
                    {[
                        { label: 'Admins', count: adminCount, color: C.pink },
                        { label: 'Premium', count: premiumCount, color: C.amber },
                        { label: 'Members', count: memberCount, color: C.purple },
                    ].map(({ label, count, color }) => (
                        <View key={label} style={[s.statChip, { borderColor: `${color}25`, backgroundColor: `${color}0A` }]}>
                            <Text style={[s.statCount, { color }]}>{count}</Text>
                            <Text style={[s.statLabel, { color: `${color}80` }]}>{label}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={s.searchWrap}>
                <Search size={15} color={C.sub} />
                <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by email or name…"
                    placeholderTextColor={C.sub}
                    autoCapitalize="none"
                    autoCorrect={false}
                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <X size={15} color={C.sub} />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View style={s.center}>
                    <ActivityIndicator color={C.cyan} />
                    <Text style={[s.emptyText, { marginTop: 12 }]}>Loading users…</Text>
                </View>
            ) : isError ? (
                <View style={s.center}>
                    <AlertCircle size={32} color={C.pink} />
                    <Text style={s.emptyText}>Failed to load users.</Text>
                    <Text style={[s.emptyText, { fontSize: 11, marginTop: 4, color: C.sub }]}>
                        Check that migration_complete.sql has been run in Supabase SQL Editor.
                    </Text>
                    <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
                        <Text style={{ color: C.cyan, fontSize: 13, fontWeight: '600' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : filtered.length === 0 ? (
                <View style={s.center}>
                    <User size={32} color={C.sub} />
                    <Text style={s.emptyText}>{search ? 'No users match that search.' : 'No users yet.'}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {filtered.map((user: ProfileRow, i: number) => {
                        const initials = getInitials(user.full_name, user.email);
                        const roleColor = ROLE_CFG[(user.role ?? 'member') as RoleType]?.color ?? C.purple;
                        return (
                            <Animated.View key={user.id} entering={FadeInDown.delay(i * 30).springify()}>
                                <TouchableOpacity onPress={() => setSelected(user)} style={s.userRow} activeOpacity={0.7}>
                                    <View style={[s.avatar, { borderColor: `${roleColor}40` }]}>
                                        <Text style={[s.avatarText, { color: roleColor }]}>{initials}</Text>
                                    </View>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={s.userName} numberOfLines={1}>{user.full_name || 'No name set'}</Text>
                                        <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
                                    </View>
                                    <RoleBadge role={user.role ?? 'member'} />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {selected && (
                <ModifyIdentitySheet
                    user={selected}
                    onClose={() => setSelected(null)}
                    onRoleChange={(email, role) => updateRoleMutation.mutate({ email, role })}
                    onPurge={(id) => purgeMutation.mutate(id)}
                    updating={updateRoleMutation.isPending}
                    purging={purgeMutation.isPending}
                    currentAdminId={currentUserId}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    banner: {
        position: 'absolute', top: 56, left: 16, right: 16, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingHorizontal: 20, paddingBottom: 16,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${C.cyan}10`, borderWidth: 1, borderColor: `${C.cyan}25`,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: C.sub, marginTop: 1 },
    headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    headerBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

    statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
    statChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    statCount: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 12,
        backgroundColor: 'rgba(8,16,24,0.9)', borderRadius: 14, borderWidth: 1, borderColor: C.border,
        paddingHorizontal: 14, paddingVertical: 11,
    },
    searchInput: { flex: 1, fontSize: 14, color: C.text },

    list: { paddingHorizontal: 20, gap: 6 },
    userRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(8,16,24,0.7)', borderRadius: 14, borderWidth: 1, borderColor: C.border,
        paddingHorizontal: 14, paddingVertical: 12,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1 },
    avatarText: { fontSize: 14, fontWeight: '800' },
    userName: { fontSize: 14, fontWeight: '600', color: C.text },
    userEmail: { fontSize: 11, color: C.sub },

    roleBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 40 },
    emptyText: { fontSize: 14, color: C.sub, textAlign: 'center' },
    retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: `${C.cyan}35` },

    /* Modify Identity sheet */
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(2,5,7,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    sheet: {
        width: '100%', maxWidth: 360, backgroundColor: 'rgba(8,16,24,0.97)',
        borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 28, alignItems: 'center',
    },
    sheetIconWrap: {
        width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: `${C.cyan}40`,
        backgroundColor: `${C.cyan}10`, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: 2 },
    sheetEmail: { fontSize: 12, color: C.sub, marginTop: 4, marginBottom: 20 },
    sheetSectionLabel: { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 1.5, alignSelf: 'flex-start', marginBottom: 10 },

    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
    roleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        flexBasis: '47%', flexGrow: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    },
    roleBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    selfWarning: { fontSize: 10, color: C.amber, marginTop: 12, textAlign: 'center', lineHeight: 15 },

    sheetDivider: { height: 1, backgroundColor: C.border, width: '100%', marginVertical: 18 },

    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
    deleteBtnText: { fontSize: 13, fontWeight: '700', color: C.pink },

    confirmBox: { width: '100%' },
    confirmText: { fontSize: 12, color: C.sub, lineHeight: 18 },
    confirmBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});