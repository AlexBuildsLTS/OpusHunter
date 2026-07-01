/**
 * app/(tabs)/vault.tsx
 * OpusHunter — Secure Document Vault
 * P3-06: Full rebuild using useCVVault hook
 *
 * Features:
 *   - CV upload card (shows current CV path if already uploaded)
 *   - Replace/update CV
 *   - Certifications section: list from DB, upload more, delete
 *   - File type badges, size, upload date
 *   - useCVVault hook — zero inline upload logic
 *   - Mobile + desktop adaptive
 */

import React, { useCallback } from 'react';
import {
  View, Text, Image, Pressable, Platform, ScrollView,
  StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeIn, FadeOutUp } from 'react-native-reanimated';
import {
  Upload, FileText, Trash2, CheckCircle2, AlertCircle,
  RefreshCw, Shield, Plus, File,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { usePipelineStore } from '../../store/usePipelineStore';


import { useCVVault } from '../../hooks/useCVVault';
import { C } from '../../lib/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(kb: number | null): string {
  if (!kb) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function fileTypeLabel(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'DOCX';
  return mimeType.split('/')[1]?.toUpperCase() ?? 'FILE';
}

function AmbientBg() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 100% 100%, rgba(0,180,210,0.07) 0%, transparent 65%)' }} />
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 35% at 0% 0%, rgba(90,40,160,0.06) 0%, transparent 60%)' }} />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

function StatusBanner({ message, ok }: { message: string; ok: boolean }) {
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.banner,
        { borderColor: ok ? `${C.cyan}30` : `${C.pink}30`, backgroundColor: ok ? `${C.cyan}08` : `${C.pink}08` },
      ]}
    >
      {ok
        ? <CheckCircle2 size={15} color={C.cyan} />
        : <AlertCircle size={15} color={C.pink} />}
      <Text style={[styles.bannerText, { color: ok ? C.cyan : C.pink }]}>{message}</Text>
    </Animated.View>
  );
}

// ── Certification Row ─────────────────────────────────────────────────────────

function CertificationRow({
  cert,
  onDelete,
  deleting,
}: {
  cert: { id: string; file_name: string; file_type: string; file_size_kb: number | null; uploaded_at: string; storage_path: string };
  onDelete: (path: string, id: string) => void;
  deleting: boolean;
}) {
  return (
    <View style={styles.certRow}>
      <View style={styles.certIconBox}>
        <File size={18} color={C.purple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.certName} numberOfLines={1}>{cert.file_name}</Text>
        <View style={styles.certMeta}>
          <View style={styles.certTypeBadge}>
            <Text style={styles.certTypeText}>{fileTypeLabel(cert.file_type)}</Text>
          </View>
          {cert.file_size_kb && (
            <Text style={styles.certMetaText}>{formatFileSize(cert.file_size_kb)}</Text>
          )}
          <Text style={styles.certMetaText}>{formatDate(cert.uploaded_at)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(cert.storage_path, cert.id)}
        disabled={deleting}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ opacity: deleting ? 0.5 : 1 }}
      >
        {deleting
          ? <ActivityIndicator size="small" color={C.pink} />
          : <Trash2 size={16} color={C.pink} />}
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function VaultScreen() {
  const { currentCV, hasCVUploaded } = usePipelineStore();
  const queryClient = useQueryClient();
  const { uploadState, uploadCV, uploadCertification, deleteCertification, reset } = useCVVault();

  const isWorking = uploadState.status === 'picking' || uploadState.status === 'uploading';
  const showBanner = uploadState.status === 'success' || uploadState.status === 'error';

  // ── Load certifications ───────────────────────────────────────────────────
  const { data: certs = [], isLoading: certsLoading, refetch: refetchCerts } = useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('certifications')
        .select('id, file_name, file_type, file_size_kb, uploaded_at, storage_path')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Load profile for CV path
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile_cv'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('cv_storage_path, full_name, email')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const handleDeleteCert = useCallback(async (storagePath: string, id: string) => {
    await deleteCertification(storagePath, id);
    queryClient.invalidateQueries({ queryKey: ['certifications'] });
  }, [deleteCertification, queryClient]);

  const handleUploadCV = useCallback(async () => {
    reset();
    await uploadCV();
    refetchProfile();
  }, [uploadCV, reset, refetchProfile]);

  const handleUploadCert = useCallback(async () => {
    reset();
    await uploadCertification();
    queryClient.invalidateQueries({ queryKey: ['certifications'] });
  }, [uploadCertification, reset, queryClient]);

  const cvPath = profile?.cv_storage_path ?? currentCV;
  const cvFileName = cvPath ? cvPath.split('/').pop() ?? 'CV Document' : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AmbientBg />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { refetchCerts(); refetchProfile(); }}
            tintColor={C.cyan}
            colors={[C.cyan]}
          />
        }
      >
        {/* Global Navbar */}

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 24, height: 24, borderRadius: 6 }}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Secure Vault</Text>
            <Text style={styles.pageSub}>Your CV and documents are encrypted at rest.</Text>
          </View>
          <View style={styles.shieldBadge}>
            <Shield size={14} color={C.green} />
          </View>
        </Animated.View>

        {/* ── Status banner ── */}
        {showBanner && (
          <StatusBanner
            message={uploadState.message}
            ok={uploadState.status === 'success'}
          />
        )}

        {/* ── CV Section ── */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <SectionHeader
            title="Base CV"
            sub="Used by the auto-apply engine for every application"
          />

          {cvFileName ? (
            /* ── CV uploaded — show card ── */
            <View style={styles.cvCard}>
              <View style={styles.cvIconBox}>
                <FileText size={26} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cvFileName} numberOfLines={1}>{cvFileName}</Text>
                <View style={styles.cvMeta}>
                  <View style={[styles.certTypeBadge, { borderColor: `${C.cyan}40`, backgroundColor: `${C.cyan}0A` }]}>
                    <Text style={[styles.certTypeText, { color: C.cyan }]}>PDF</Text>
                  </View>
                  <CheckCircle2 size={12} color={C.green} />
                  <Text style={[styles.certMetaText, { color: C.green }]}>Active in pipeline</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleUploadCV}
                disabled={isWorking}
                style={[styles.replaceBtn, isWorking && { opacity: 0.5 }]}
                activeOpacity={0.7}
              >
                {isWorking && uploadState.status === 'uploading'
                  ? <ActivityIndicator size="small" color={C.purple} />
                  : <RefreshCw size={14} color={C.purple} />}
                <Text style={styles.replaceBtnText}>Replace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── No CV yet — upload zone ── */
            <Pressable
              onPress={handleUploadCV}
              disabled={isWorking}
              style={({ pressed }) => [
                styles.uploadZone,
                pressed && { borderColor: `${C.purple}80`, backgroundColor: `${C.purple}0E` },
                isWorking && { opacity: 0.65 },
              ]}
            >
              {isWorking ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <ActivityIndicator size="large" color={C.cyan} />
                  <Text style={styles.uploadingText}>{uploadState.message || 'Working…'}</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 14 }}>
                  <View style={styles.uploadIconBox}>
                    <Upload size={26} color={C.purple} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Your CV</Text>
                  <Text style={styles.uploadSub}>PDF, DOC, DOCX · Max 10 MB</Text>
                  <View style={styles.uploadBtn}>
                    <Text style={styles.uploadBtnText}>Select File</Text>
                  </View>
                </View>
              )}
            </Pressable>
          )}
        </Animated.View>

        {/* ── Certifications Section ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginTop: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={styles.sectionTitle}>Certifications</Text>
              <Text style={styles.sectionSub}>Portfolios, certificates, references</Text>
            </View>
            <TouchableOpacity
              onPress={handleUploadCert}
              disabled={isWorking}
              style={[styles.addCertBtn, isWorking && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              <Plus size={16} color={C.cyan} />
              <Text style={styles.addCertText}>Upload</Text>
            </TouchableOpacity>
          </View>

          {certsLoading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <ActivityIndicator color={C.purple} />
            </View>
          ) : certs.length === 0 ? (
            <View style={styles.emptyCerts}>
              <File size={28} color={`${C.purple}60`} />
              <Text style={styles.emptyCertsText}>No certifications yet</Text>
              <Text style={styles.emptyCertsSub}>
                Upload portfolios, cover letters, reference letters, or certificates.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {certs.map((cert: any, i: number) => (
                <CertificationRow
                  key={cert.id}
                  cert={cert}
                  onDelete={handleDeleteCert}
                  deleting={isWorking}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* ── Vault info footer ── */}
        <Animated.View entering={FadeIn.delay(400)} style={styles.vaultFooter}>
          <Shield size={12} color={`${C.green}80`} />
          <Text style={styles.vaultFooterText}>
            All files encrypted in Supabase Storage with RLS — only you can access them.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'web' ? 32 : 52,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  logoImg: { width: 36, height: 36, borderRadius: 9 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  pageSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  shieldBadge: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: `${C.green}30`,
    backgroundColor: `${C.green}0A`,
    alignItems: 'center', justifyContent: 'center',
  },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 13, borderRadius: 12, borderWidth: 1, marginBottom: 18,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  sectionSub: { fontSize: 12, color: C.sub, marginTop: 3 },

  // ── CV uploaded card ──
  cvCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1,
    borderColor: `${C.cyan}20`, backgroundColor: `${C.cyan}06`,
  },
  cvIconBox: {
    width: 52, height: 52, borderRadius: 14,
    borderWidth: 1, borderColor: `${C.cyan}25`,
    backgroundColor: `${C.cyan}0D`,
    alignItems: 'center', justifyContent: 'center',
  },
  cvFileName: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  cvMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replaceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: `${C.purple}40`, backgroundColor: `${C.purple}0D`,
  },
  replaceBtnText: { fontSize: 12, color: C.purple, fontWeight: '700' },

  // ── Upload zone ──
  uploadZone: {
    borderRadius: 22, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: `${C.purple}45`,
    backgroundColor: `${C.purple}06`,
    padding: 40, alignItems: 'center',
  },
  uploadIconBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: `${C.purple}14`,
    borderWidth: 1, borderColor: `${C.purple}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  uploadSub: { fontSize: 12, color: C.sub },
  uploadBtn: {
    paddingHorizontal: 28, paddingVertical: 11, borderRadius: 100,
    borderWidth: 1, borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}0D`,
  },
  uploadBtnText: { color: C.cyan, fontWeight: '700', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  uploadingText: { color: C.cyan, fontWeight: '600', fontSize: 13 },

  // ── Add certification ──
  addCertBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: `${C.cyan}35`, backgroundColor: `${C.cyan}08`,
  },
  addCertText: { color: C.cyan, fontSize: 13, fontWeight: '700' },

  // ── Certification row ──
  certRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.card,
  },
  certIconBox: {
    width: 40, height: 40, borderRadius: 11,
    borderWidth: 1, borderColor: `${C.purple}25`,
    backgroundColor: `${C.purple}0D`,
    alignItems: 'center', justifyContent: 'center',
  },
  certName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 5 },
  certMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  certTypeBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    borderWidth: 1, borderColor: `${C.purple}35`, backgroundColor: `${C.purple}0A`,
  },
  certTypeText: { fontSize: 9, fontWeight: '900', color: C.purple, letterSpacing: 1, textTransform: 'uppercase' },
  certMetaText: { fontSize: 11, color: C.sub },

  // ── Empty certs ──
  emptyCerts: {
    alignItems: 'center', paddingVertical: 36,
    gap: 8,
  },
  emptyCertsText: { fontSize: 14, fontWeight: '700', color: C.sub },
  emptyCertsSub: { fontSize: 12, color: `${C.sub}80`, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },

  // ── Footer ──
  vaultFooter: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 36, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  vaultFooterText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 16 },
});