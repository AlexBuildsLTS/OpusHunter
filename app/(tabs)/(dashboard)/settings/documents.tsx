import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { DocumentUploader } from "./DocumentUploader";
import { Modal } from "../../../../components/ui/Modal";
import { useToast } from "../../../../components/ui/Toast";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
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
  const { width } = useWindowDimensions();
  const { showToast } = useToast();
  const isCompact = width < 560;
  const [showUploader, setShowUploader] = useState<
    false | "cv" | "certification"
  >(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [refinedDocumentId, setRefinedDocumentId] = useState<string | null>(
    null,
  );
  const [refinedSourceName, setRefinedSourceName] = useState<string | null>(
    null,
  );
  const [isExportingRefined, setIsExportingRefined] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "document"; id: string; path: string; name: string }
    | { kind: "certification"; id: string; name: string }
    | null
  >(null);

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
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([path]);
      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from("resume_documents")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
    } catch (err: any) {
      showToast(err.message || "Failed to remove document", "error");
    }
  };

  const handleSetPrimaryDoc = async (id: string) => {
    try {
      const { error: clearError } = await supabase
        .from("resume_documents")
        .update({ is_primary: false })
        .eq("user_id", user!.id);
      if (clearError) throw clearError;

      const { error: setError } = await supabase
        .from("resume_documents")
        .update({ is_primary: true })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (setError) throw setError;

      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
      return true;
    } catch (err: any) {
      showToast(err.message || "Failed to set primary resume", "error");
      return false;
    }
  };

  const handleOpenDocument = async (doc: ResumeDoc) => {
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .createSignedUrl(doc.storage_path, 300);
      if (error || !data?.signedUrl) {
        throw error || new Error("Could not create a secure document link.");
      }

      if (Platform.OS === "web") {
        await Linking.openURL(data.signedUrl);
        return;
      }

      if (FileSystem.documentDirectory && (await Sharing.isAvailableAsync())) {
        const localUri = `${FileSystem.documentDirectory}${doc.file_name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        )}`;
        const download = await FileSystem.downloadAsync(
          data.signedUrl,
          localUri,
        );
        await Sharing.shareAsync(download.uri, {
          mimeType: doc.file_type || "application/octet-stream",
          dialogTitle: `Open ${doc.file_name}`,
        });
        return;
      }

      await Linking.openURL(data.signedUrl);
    } catch (err: any) {
      showToast(err.message || "The document could not be opened.", "error");
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("certifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
    } catch (err: any) {
      showToast(err.message || "Failed to remove certification", "error");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const deletion = pendingDelete;
    setPendingDelete(null);
    if (deletion.kind === "document") {
      await handleDeleteDoc(deletion.id, deletion.path);
    } else {
      await handleDeleteCert(deletion.id);
    }
  };

  const handleRefineResume = async (doc: ResumeDoc) => {
    setProcessingId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke("refine-resume", {
        body: { documentId: doc.id },
      });
      if (error) throw error;
      if (!data?.refinedText) {
        throw new Error("The refinement service returned no reviewable draft.");
      }
      setRefinedText(data.refinedText);
      setRefinedDocumentId(null);
      setRefinedSourceName(doc.file_name);
      await queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
    } catch (err: any) {
      showToast(err.message || "No refined draft was created.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const escapeHtml = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character] || character,
    );

  const exportRefinedResume = async () => {
    if (!refinedText || !user) return;
    setIsExportingRefined(true);
    try {
      const html = `<!doctype html>
        <html><head><meta charset="utf-8"><style>
          @page { margin: 18mm 16mm; }
          body { font-family: Arial, sans-serif; color: #17202a; font-size: 10.5pt; line-height: 1.45; }
          h1, h2 { margin: 0 0 8px; }
          h1 { font-size: 20pt; }
          h2 { font-size: 11pt; color: #087f9b; border-bottom: 1px solid #b7c7ce; padding-bottom: 3px; margin-top: 18px; }
          p { white-space: pre-wrap; margin: 0 0 5px; }
        </style></head><body>
        ${refinedText
          .split(/\n{2,}/)
          .map((section) => {
            const lines = section.split("\n");
            const heading = lines[0]?.trim() || "";
            const isHeading = /^(NAME|PROFESSIONAL SUMMARY|SKILLS|EXPERIENCE|EDUCATION|CERTIFICATIONS|PROJECTS|CONTACT)$/i.test(heading);
            return `${isHeading ? `<h2>${escapeHtml(heading)}</h2>` : ""}<p>${escapeHtml(isHeading ? lines.slice(1).join("\n") : section)}</p>`;
          })
          .join("")}
        </body></html>`;

      const result = await Print.printToFileAsync({ html });
      const pdfPath = `${user.id}/refined-${crypto.randomUUID()}.pdf`;
      const pdfBlob = await (await fetch(result.uri)).blob();
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(pdfPath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const baseName = (refinedSourceName || "resume").replace(
        /\.[^.]+$/,
        "",
      );
      const { data: refinedDocument, error: insertError } = await supabase
        .from("resume_documents")
        .insert({
          user_id: user.id,
          storage_path: pdfPath,
          file_name: `${baseName} — refined.pdf`,
          file_type: "application/pdf",
          file_size_kb: Math.max(1, Math.round(pdfBlob.size / 1024)),
          is_primary: false,
          extraction_status: "complete",
          label: `Refined from ${refinedSourceName || "resume"}`,
        })
        .select("*")
        .single();
      if (insertError) {
        await supabase.storage.from("resumes").remove([pdfPath]);
        throw insertError;
      }
      setRefinedDocumentId(refinedDocument.id);
      await queryClient.invalidateQueries({
        queryKey: ["resume-documents", user.id],
      });

      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = result.uri;
        link.download = `${baseName} - refined.pdf`;
        link.click();
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share refined resume PDF",
        });
      } else {
        await Linking.openURL(result.uri);
      }
      showToast("Formatted PDF created. Your original CV remains unchanged.", "success");
    } catch (err: any) {
      showToast(err.message || "The refined PDF could not be created.", "error");
    } finally {
      setIsExportingRefined(false);
    }
  };

  const primaryCount = resumeDocs.filter((d) => d.is_primary).length;

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isCompact && styles.compactScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.centeredContainer,
            isCompact && styles.compactCenteredContainer,
          ]}
        >
          {/* Header */}
          <View style={[styles.header, isCompact && styles.compactHeader]}>
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
            <View
              style={[
                styles.badgeShield,
                isCompact && styles.compactBadgeShield,
              ]}
            >
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
          <View style={[styles.metricsRow, isCompact && styles.compactMetricsRow]}>
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
          <Card
            variant="elevated"
            style={[styles.cardSection, isCompact && styles.compactCardSection]}
          >
            <View style={[styles.cardHeader, isCompact && styles.compactCardHeader]}>
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
                style={styles.inlineButton}
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
              <View>
                {resumeDocs.map((doc) => {
                  const isPending =
                    (doc as any).extraction_status === "pending";
                  const isExtracted =
                    (doc as any).extraction_status === "completed" ||
                    (doc as any).extraction_status === "extracted" ||
                    (doc as any).extraction_status === "complete";
                  const isExtracting = processingId === doc.id;

                  return (
                    <View
                      key={doc.id}
                      style={[
                        styles.docItem,
                        isCompact && styles.compactDocItem,
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            columnGap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            variant="bodySm"
                            weight="bold"
                            color="primary"
                            numberOfLines={2}
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

                      <View style={styles.actionRow}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() =>
                            handleRefineResume(doc)
                          }
                          loading={isExtracting}
                          disabled={isExtracting}
                          style={styles.actionIconBtn}
                          accessibilityLabel={`Create a reviewable refined draft from ${doc.file_name}`}
                        >
                          <Sparkles size={16} color={colors.accent.cyan} />
                        </Button>

                        <Pressable
                          onPress={() => handleOpenDocument(doc)}
                          style={styles.actionIconBtn}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Open or download ${doc.file_name}`}
                        >
                          <FileText size={16} color={colors.text.secondary} />
                        </Pressable>

                        {doc.is_primary ? (
                          <View style={styles.primarySwitch}>
                            <View style={styles.primarySwitchDot} />
                            <Typography
                              variant="caption"
                              weight="bold"
                              style={{ color: colors.accent.green }}
                            >
                              IN USE
                            </Typography>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleSetPrimaryDoc(doc.id)}
                            style={styles.useVersionButton}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={`Use ${doc.file_name} for applications`}
                          >
                            <Star size={14} color={colors.accent.cyan} />
                            <Typography
                              variant="caption"
                              weight="bold"
                              style={{ color: colors.accent.cyan }}
                            >
                              USE
                            </Typography>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() =>
                            setPendingDelete({
                              kind: "document",
                              id: doc.id,
                              path: doc.storage_path,
                              name: doc.file_name,
                            })
                          }
                          style={styles.actionIconBtn}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${doc.file_name}`}
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
                style={styles.inlineButton}
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
              <View>
                {certs.map((c) => (
                  <View
                    key={c.id}
                    style={[
                      styles.docItem,
                      isCompact && styles.compactDocItem,
                    ]}
                  >
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
                      onPress={() =>
                        setPendingDelete({
                          kind: "certification",
                          id: c.id,
                          name: c.cert_name || c.file_name,
                        })
                      }
                      style={styles.actionIconBtn}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${c.cert_name || c.file_name}`}
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

      <Modal
        visible={!!refinedText}
        onClose={() => setRefinedText(null)}
        title="Refined resume draft"
        maxWidth={680}
      >
        <View style={styles.refinedModalContent}>
          <Typography variant="caption" color="secondary">
            Draft created from {refinedSourceName || "your resume"}. Your
            original file remains unchanged. Review every line before making
            this version primary.
          </Typography>
          <ScrollView
            style={styles.refinedTextBox}
            contentContainerStyle={styles.refinedTextContent}
            showsVerticalScrollIndicator
          >
            <Typography variant="caption" color="primary">
              {refinedText}
            </Typography>
          </ScrollView>
          <View style={styles.refinedActions}>
            <Button
              variant="secondary"
              size="sm"
              onPress={exportRefinedResume}
              disabled={isExportingRefined}
              style={styles.refinedAction}
            >
              {isExportingRefined ? "Creating PDF..." : "Export PDF"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => setRefinedText(null)}
              style={styles.refinedAction}
            >
              Keep as draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={async () => {
                if (!refinedDocumentId) {
                  showToast("Export the refined PDF before making it primary.", "error");
                  return;
                }
                if (await handleSetPrimaryDoc(refinedDocumentId)) {
                  setRefinedText(null);
                }
              }}
              style={styles.refinedAction}
            >
              Make primary
            </Button>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete stored document"
      >
        <Typography variant="bodySm" color="secondary">
          Delete {pendingDelete?.name}? This cannot be undone.
        </Typography>
        <View style={styles.confirmActions}>
          <Button variant="ghost" onPress={() => setPendingDelete(null)} style={styles.confirmButton}>
            Cancel
          </Button>
          <Button variant="destructive" onPress={confirmDelete} style={styles.confirmButton}>
            Delete
          </Button>
        </View>
      </Modal>
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
  compactScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  centeredContainer: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },
  compactCenteredContainer: {
    maxWidth: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
    columnGap: 12,
  },
  compactHeader: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  headerSubtitle: {
    marginTop: 4,
  },
  badgeShield: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderColor: "rgba(6, 182, 212, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  compactBadgeShield: {
    alignSelf: "flex-start",
  },
  metricsRow: {
    flexDirection: "row",
    marginHorizontal: 0,
    columnGap: 12,
    marginBottom: 20,
  },
  compactMetricsRow: {
    columnGap: 8,
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
  compactCardSection: {
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  compactCardHeader: {
    alignItems: "flex-start",
    flexWrap: "wrap",
    rowGap: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
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
  compactDocItem: {
    alignItems: "flex-start",
    flexDirection: "column",
    rowGap: 10,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    columnGap: 8,
    minHeight: 44,
  },
  inlineButton: {
    flexDirection: "row",
  },
  actionIconBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    padding: 8,
  },
  primarySwitch: {
    alignItems: "center",
    flexDirection: "row",
    columnGap: 5,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  primarySwitchDot: {
    backgroundColor: colors.accent.green,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  useVersionButton: {
    alignItems: "center",
    borderColor: `${colors.accent.cyan}66`,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    columnGap: 4,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 9,
  },
  refinedModalContent: {
    rowGap: 14,
  },
  refinedTextBox: {
    maxHeight: 420,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: colors.surface.border,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  refinedTextContent: {
    padding: 14,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  confirmButton: {
    flex: 1,
  },
  refinedActions: {
    flexDirection: "row",
    columnGap: 10,
  },
  refinedAction: {
    flex: 1,
    minHeight: 44,
  },
});
