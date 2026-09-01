import React, { useState } from "react";
import { View, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { DocumentUploader } from "./DocumentUploader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { colors, radius, shadows } from "../../../../constants/theme";
import {
  FileText,
  Award,
  Trash2,
  Star,
  Upload,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  ShieldCheck,
} from "lucide-react-native";
import type { Database } from "../../../../types/database.types";

type ResumeDoc = Database["public"]["Tables"]["resume_documents"]["Row"];
type Cert = Database["public"]["Tables"]["certifications"]["Row"];

export default function DocumentsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState<
    false | "cv" | "certification"
  >(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Queries
  const { data: resumeDocs = [], isLoading: loadingResumes } = useQuery({
    queryKey: ["resume-documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resume_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false })
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ResumeDoc[];
    },
  });

  const { data: certs = [], isLoading: loadingCerts } = useQuery({
    queryKey: ["certifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Cert[];
    },
  });

  const handleDeleteDoc = async (id: string, path: string) => {
    try {
      await supabase.storage.from("resumes").remove([path]);
      await supabase.from("resume_documents").delete().eq("id", id);
      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
    } catch (err: any) {
      Alert.alert("Delete Error", err.message || "Failed to remove document");
    }
  };

  const handleSetPrimaryDoc = async (id: string) => {
    try {
      await supabase
        .from("resume_documents")
        .update({ is_primary: false })
        .eq("user_id", user!.id);
      await supabase
        .from("resume_documents")
        .update({ is_primary: true })
        .eq("id", id);
      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to set primary resume");
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await supabase.from("certifications").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
    } catch (err: any) {
      Alert.alert(
        "Delete Error",
        err.message || "Failed to remove certification",
      );
    }
  };

  const handleTriggerExtract = async (docId: string, storagePath: string) => {
    setProcessingId(docId);
    try {
      const { error } = await supabase.functions.invoke("extract-context", {
        body: { documentId: docId, storagePath },
      });
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["user_context", user?.id],
      });
      Alert.alert("Success", "AI skill extraction re-analyzed successfully.");
    } catch (err: any) {
      Alert.alert(
        "Extraction Error",
        err.message || "Failed to extract context.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const primaryCount = resumeDocs.filter((d) => d.is_primary).length;

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centeredContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Typography variant="h2" weight="bold" color="primary">
                Document Vault & Resumes
              </Typography>
              <Typography
                variant="caption"
                color="secondary"
                style={styles.headerSubtitle}
              >
                Encrypted CV storage, AI skill extraction, and verifiable
                credentials.
              </Typography>
            </View>
            <View style={styles.badgeShield}>
              <ShieldCheck size={14} color={colors.accent.cyan} />
              <Typography
                variant="caption"
                weight="bold"
                style={{ color: colors.accent.cyan }}
              >
                AES-256 ENCRYPTED
              </Typography>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Typography variant="h3" weight="bold" color="primary">
                {resumeDocs.length}
              </Typography>
              <Typography variant="caption" color="dim">
                Active Resumes
              </Typography>
            </View>
            <View style={styles.metricCard}>
              <Typography variant="h3" weight="bold" color="primary">
                {certs.length}
              </Typography>
              <Typography variant="caption" color="dim">
                Certifications
              </Typography>
            </View>
            <View style={styles.metricCard}>
              <Typography
                variant="h3"
                weight="bold"
                style={{
                  color:
                    primaryCount > 0
                      ? colors.accent.green
                      : colors.accent.red,
                }}
              >
                {primaryCount > 0 ? "Ready" : "Action Needed"}
              </Typography>
              <Typography variant="caption" color="dim">
                Primary Match
              </Typography>
            </View>
          </View>

          {/* 1. Resumes & CV Documents */}
          <Card variant="elevated" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <FileText size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  RESUMES & CURRICULUM VITAE
                </Typography>
              </View>
              <Button
                variant="primary"
                size="sm"
                onPress={() => setShowUploader("cv")}
                style={{ flexDirection: "row", gap: 6 }}
              >
                <Upload size={14} color={colors.text.inverse} />
                Upload CV
              </Button>
            </View>

            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 16 }}
            >
              Upload PDF or DOCX resumes. The primary resume is automatically
              referenced by OpusHunter when scoring jobs and drafting tailored
              cover letters.
            </Typography>

            {resumeDocs.length === 0 ? (
              <View style={styles.emptyBox}>
                <FileCode size={32} color={colors.text.dim} />
                <Typography
                  variant="bodySm"
                  color="secondary"
                  weight="medium"
                  style={{ marginTop: 8 }}
                >
                  No resumes uploaded yet.
                </Typography>
                <Typography
                  variant="caption"
                  color="dim"
                  style={{ textAlign: "center", marginTop: 4 }}
                >
                  Upload a PDF to automatically index skills and generate
                  tailored applications.
                </Typography>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {resumeDocs.map((doc) => {
                  const isPending =
                    (doc as any).extraction_status === "pending";
                  const isExtracted =
                    (doc as any).extraction_status === "completed" ||
                    (doc as any).extraction_status === "extracted";
                  const isExtracting = processingId === doc.id;

                  return (
                    <View key={doc.id} style={styles.docItem}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            variant="bodySm"
                            weight="bold"
                            color="primary"
                          >
                            {doc.file_name}
                          </Typography>
                          {doc.is_primary && (
                            <Badge label="PRIMARY" variant="cyan" size="sm" />
                          )}
                          {isPending && (
                            <Badge
                              label="EXTRACTING"
                              variant="amber"
                              size="sm"
                            />
                          )}
                          {isExtracted && (
                            <Badge
                              label="AI INDEXED"
                              variant="green"
                              size="sm"
                            />
                          )}
                        </View>
                        <Typography
                          variant="caption"
                          color="dim"
                          style={{ marginTop: 4 }}
                        >
                          {Math.round(doc.file_size_kb || 0)} KB · Uploaded{" "}
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </Typography>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() =>
                            handleTriggerExtract(doc.id, doc.storage_path)
                          }
                          loading={isExtracting}
                          disabled={isExtracting}
                          style={styles.actionIconBtn}
                        >
                          <Sparkles size={16} color={colors.accent.cyan} />
                        </Button>

                        {!doc.is_primary && (
                          <Pressable
                            onPress={() => handleSetPrimaryDoc(doc.id)}
                            style={styles.actionIconBtn}
                            hitSlop={8}
                          >
                            <Star size={16} color={colors.text.dim} />
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() =>
                            handleDeleteDoc(doc.id, doc.storage_path)
                          }
                          style={styles.actionIconBtn}
                          hitSlop={8}
                        >
                          <Trash2 size={16} color={colors.accent.red} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* 2. Professional Certifications */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Award size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  PROFESSIONAL CERTIFICATIONS
                </Typography>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setShowUploader("certification")}
                style={{ flexDirection: "row", gap: 4 }}
              >
                <Plus size={14} color={colors.accent.cyan} />
                Add Cert
              </Button>
            </View>

            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 16 }}
            >
              Add credentials (AWS, GCP, CKA, CISSP, Scrum) to strengthen ATS
              score ranking and match requirements.
            </Typography>

            {certs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Award size={32} color={colors.text.dim} />
                <Typography
                  variant="bodySm"
                  color="secondary"
                  weight="medium"
                  style={{ marginTop: 8 }}
                >
                  No certifications registered.
                </Typography>
                <Typography
                  variant="caption"
                  color="dim"
                  style={{ textAlign: "center", marginTop: 4 }}
                >
                  Add your credentials to automatically boost candidate ranking
                  score.
                </Typography>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {certs.map((c) => (
                  <View key={c.id} style={styles.docItem}>
                    <View style={{ flex: 1 }}>
                      <Typography
                        variant="bodySm"
                        weight="bold"
                        color="primary"
                      >
                        {c.cert_name || c.file_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="dim"
                        style={{ marginTop: 2 }}
                      >
                        {c.cert_issuer ? `${c.cert_issuer} · ` : ""}Uploaded{" "}
                        {new Date(c.uploaded_at).toLocaleDateString()}
                      </Typography>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteCert(c.id)}
                      style={styles.actionIconBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={colors.accent.red} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Upload Modal Drawer */}
      <DocumentUploader
        visible={showUploader !== false}
        type={showUploader || "cv"}
        onClose={() => setShowUploader(false)}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
    alignItems: "center",
  },
  centeredContainer: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 12,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  badgeShield: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderColor: "rgba(6, 182, 212, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    alignItems: "center",
  },
  cardSection: {
    padding: 20,
    marginBottom: 20,
    borderRadius: radius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTag: {
    letterSpacing: 0.8,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  docItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  actionIconBtn: {
    padding: 6,
  },
});
