/**
 * components/features/configure/styles.ts
 * OpusHunter — Configure feature shared StyleSheet
 * 2026-07-03 — Extracted from app/(tabs)/configure.tsx
 *
 * FIX (stretch / no-top-space bug, from screenshot):
 *   `tabBar` had `marginHorizontal: 0` and no top spacing, so on web it sat
 *   flush against the very top of the content pane, edge-to-edge across the
 *   full viewport width. `tabScroll` had no `paddingTop` and no width cap —
 *   there was actually an unused `scrollDesktop: { maxWidth: 1100 }` style
 *   already sitting in this file that nothing ever referenced, which is
 *   exactly why desktop content stretched full-bleed. Both are now capped
 *   at 1100px and centered, with real top padding, and the dead
 *   `scrollDesktop` style is gone (folded into `tabScroll` itself instead of
 *   left as an orphan).
 */

import { StyleSheet, Platform } from 'react-native';
import { C } from '../../../lib/theme';

export const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },

    screenWrapper: { flex: 1, backgroundColor: 'transparent', paddingTop: 24, paddingHorizontal: 24 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    greeting: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    headerSub: { fontSize: 13, color: C.sub, marginTop: 3 },

    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
        maxWidth: 600, width: '100%', alignSelf: 'center' as any,
    },
    bannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

    // FIX: capped width + centered, was edge-to-edge with marginHorizontal: 0.
    tabBar: {
        flexDirection: 'row', marginBottom: 14,
        backgroundColor: `${C.text}07`,
        borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 3, gap: 3,
        maxWidth: 600, width: '100%', alignSelf: 'center' as any,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
        borderColor: 'transparent',
    },
    tabBtnActive: {
        borderColor: `${C.cyan}28`,
        backgroundColor: `${C.cyan}0C`,
    },
    tabBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

    // FIX: paddingTop added (was 0 — content started flush under the tab
    // bar with zero gap) + width cap so cards don't stretch full-viewport.
    tabScroll: {
        paddingTop: 8,
        paddingBottom: 120,
        maxWidth: 1100, width: '100%', alignSelf: 'center' as any,
        gap: 0,
    },

    scraperCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderRadius: 18, borderWidth: 1,
        borderColor: `${C.cyan}28`, backgroundColor: `${C.cyan}07`,
        marginBottom: 20, gap: 14,
    },
    scraperCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    scraperPulse: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: `${C.cyan}12`, borderWidth: 1, borderColor: `${C.cyan}30`,
        alignItems: 'center', justifyContent: 'center',
    },
    scraperTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    scraperSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    scrapeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
        borderWidth: 1, borderColor: `${C.cyan}30`,
        backgroundColor: `${C.cyan}08`,
    },
    scrapeBtnText: { fontSize: 10, fontWeight: '800', color: C.cyan, letterSpacing: 1.5 },

    section: {
        marginBottom: 16,
        borderRadius: 18, borderWidth: 1, borderColor: C.border,
        backgroundColor: 'rgba(20,14,32,0.68)',
        padding: 16,
        maxWidth: 600, width: '100%', alignSelf: 'center' as any,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionIconBox: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: `${C.cyan}10`, borderWidth: 1, borderColor: `${C.cyan}20`,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
    },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
    sectionSub: { fontSize: 11, color: C.sub, marginTop: 2, lineHeight: 16 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 10, borderWidth: 1,
    },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipText: { fontSize: 12, fontWeight: '700' },
    chipTextSmall: { fontSize: 10 },

    customLocRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    customLocInput: {
        flex: 1, height: 42, borderRadius: 10, borderWidth: 1,
        borderColor: C.borderCyan, backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 12, color: C.text, fontSize: 13,
    },
    customLocBtn: {
        width: 42, height: 42, borderRadius: 10,
        backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center',
    },

    remoteRow: {
        flexDirection: 'row', gap: 8, flexWrap: 'wrap',
        justifyContent: 'center', alignItems: 'center',
    },
    remoteBtn: {
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    remoteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan },
    remoteBtnText: { fontSize: 12, fontWeight: '700' },

    salaryRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8,
        justifyContent: 'center', alignItems: 'center',
    },

    boardGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    boardCard: {
        flex: 1, minWidth: '30%', aspectRatio: 1.2,
        borderRadius: 14, borderWidth: 1, padding: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    boardCheck: {
        position: 'absolute', top: 8, right: 8,
        width: 18, height: 18, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
    },
    boardLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    toggleLabel: { fontSize: 13, fontWeight: '700', color: C.text },
    toggleSub: { fontSize: 11, color: C.sub, marginTop: 2 },

    ruleCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 13, borderRadius: 16, borderWidth: 1,
        backgroundColor: C.colors.card, overflow: 'hidden', gap: 11,
    },
    ruleActiveLine: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.sub },
    ruleMeta: { fontSize: 11, color: C.sub },
    ruleMetaSub: { fontSize: 10, color: C.dim, flex: 1 },
    ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 13, flexShrink: 0 },
    kwChip: {
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
        borderWidth: 1, borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}0A`,
    },
    kwChipText: { fontSize: 10, color: C.cyan, fontWeight: '700' },

    emptyState: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 32 },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 1, borderColor: `${C.purple}40`,
        alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptyBody: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12,
        borderWidth: 1, borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0D`,
    },
    emptyAddText: { color: C.cyan, fontSize: 13, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: C.core,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderColor: C.borderCyan,
        maxHeight: '92%', overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    saveBtn: { height: 52, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    fieldLabel: {
        fontSize: 9, fontWeight: '900', color: C.cyan,
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: C.borderCyan,
        borderRadius: 12, padding: 14,
        color: C.text, fontSize: 14,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },

    confirmCard: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.core, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 28, borderWidth: 1, borderColor: C.pink,
    },
    confirmTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
    confirmBody: { fontSize: 13, color: C.sub, lineHeight: 20 },
    confirmBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    confirmBtnText: { fontSize: 14, fontWeight: '700' },
});