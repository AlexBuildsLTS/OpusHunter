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
  const [refinedDocument, setRefinedDocument] = useState<ResumeDoc | null>(
    null,
  );
  const [refinementReview, setRefinementReview] = useState<{
    improvements: string[];
    warnings: string[];
    designAssessment: string[];
    atsRisks: string[];
    atsChecks: Record<string, boolean>;
  }>({
    improvements: [],
    warnings: [],
    designAssessment: [],
    atsRisks: [],
    atsChecks: {},
  });
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
    const documentToDelete = resumeDocs.find((doc) => doc.id === id);
    if (documentToDelete?.is_primary) {
      showToast("Choose another resume as primary before deleting this one.", "error");
      return;
    }
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
      setRefinedDocument(null);
      setRefinedSourceName(doc.file_name);
      setRefinementReview({
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        designAssessment: Array.isArray(data.designAssessment)
          ? data.designAssessment
          : [],
        atsRisks: Array.isArray(data.atsRisks) ? data.atsRisks : [],
        atsChecks: data.atsChecks && typeof data.atsChecks === "object"
          ? data.atsChecks
          : {},
      });
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
      const headings = /^(NAME|CONTACT|PROFESSIONAL SUMMARY|SUMMARY|PROFILE|PROFIL|SAMMANFATTNING|SKILLS|KOMPETENSER|EXPERIENCE|ARBETSLIVSERFARENHET|WORK EXPERIENCE|EDUCATION|UTBILDNING|CERTIFICATIONS|CERTIFIERINGAR|PROJECTS|PROJEKT)$/i;
      const html = `<!doctype html>
        <html><head><meta charset="utf-8"><style>
          @page { margin: 17mm 18mm; }
          body { font-family: system-ui, sans-serif; color: #17202a; font-size: 10.5pt; line-height: 1.42; }
          h1 { font-size: 22pt; margin: 0 0 4px; color: #0f172a; }
          h2 { font-size: 11pt; color: #0f6f82; border-bottom: 1px solid #c8d4d9; padding-bottom: 4px; margin: 18px 0 7px; letter-spacing: .3px; }
          p { white-space: pre-wrap; margin: 0 0 5px; }
          ul { margin: 3px 0 7px 18px; padding: 0; }
          li { margin: 0 0 3px; }
          .contact { color: #41515a; margin-bottom: 14px; }
        </style></head><body>
        ${refinedText
          .split(/\n{2,}/)
          .map((section) => {
            const lines = section.split("\n");
            const heading = lines[0]?.trim() || "";
            const isHeading = headings.test(heading);
            const bodyLines = isHeading ? lines.slice(1) : lines;
            const isContact = /^(CONTACT|KONTAKT)$/i.test(heading);
            const bullets = bodyLines.filter((line) => /^\s*[-•*]\s+/.test(line));
            const body = bullets.length === bodyLines.length && bullets.length > 0
              ? `<ul>${bullets.map((line) => `<li>${escapeHtml(line.replace(/^\s*[-•*]\s+/, ""))}</li>`).join("")}</ul>`
              : `<p>${escapeHtml(bodyLines.join("\n"))}</p>`;
            return `${isHeading ? (heading === "NAME" ? `<h1>${escapeHtml(heading)}</h1>` : `<h2>${escapeHtml(heading)}</h2>`) : ""}<div class="${isContact ? "contact" : ""}">${body}</div>`;
          })
          .join("")}
        </body></html>`;

      const baseName = (refinedSourceName || "resume").replace(
        /\.[^.]+$/,
        "",
      );
      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank", "noopener,noreferrer");
        if (!printWindow) {
          throw new Error(
            "The browser blocked the CV export window. Allow pop-ups for this site and try again.",
          );
        }
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.addEventListener("load", () => printWindow.print(), {
          once: true,
        });
        showToast(
          "The improved CV is ready. Choose “Save to PDF” in the print dialog.",
          "success",
        );
        return;
      }

      const result = await Print.printToFileAsync({ html });
      const pdfPath = `${user.id}/ai-improved-${crypto.randomUUID()}.pdf`;
      const pdfBlob = await (await fetch(result.uri)).blob();
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(pdfPath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: refinedDocument, error: insertError } = await supabase
        .from("resume_documents")
        .insert({
          user_id: user.id,
          storage_path: pdfPath,
          file_name: `${baseName} — AI-improved ATS.pdf`,
          file_type: "application/pdf",
          file_size_kb: Math.max(1, Math.round(pdfBlob.size / 1024)),
          is_primary: false,
          extraction_status: "complete",
          label: `AI-improved from ${refinedSourceName || "resume"}`,
        })
        .select("*")
        .single();
      if (insertError) {
        await supabase.storage.from("resumes").remove([pdfPath]);
        throw insertError;
      }
      setRefinedDocumentId(refinedDocument.id);
      setRefinedDocument(refinedDocument as ResumeDoc);
      await queryClient.invalidateQueries({
        queryKey: ["resume-documents", user.id],
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share AI-improved ATS resume PDF",
        });
      } else {
        await Linking.openURL(result.uri);
      }
      showToast(
        "AI-improved ATS PDF created. Your original CV remains unchanged.",
        "success",
      );
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
              cover letters. Use the sparkle action on an original CV to
              create a separate AI-improved, ATS-friendly PDF. Your upload is
              never overwritten.
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
                  const isAiImproved =
                    /ai-improved|refined/i.test(
                      `${doc.file_name} ${doc.label || ""}`,
                    );
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
                              label={
                                isAiImproved
                                  ? "IMPROVED CV READY"
                                  : "CV CONTEXT READY"
                              }
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
                        {!isAiImproved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => handleRefineResume(doc)}
                            loading={isExtracting}
                            disabled={isExtracting}
                            style={styles.actionIconBtn}
                            accessibilityLabel={`Improve ${doc.file_name} with AI`}
                          >
                            <Sparkles size={16} color={colors.accent.cyan} />
                          </Button>
                        )}

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
                      <View style={styles.documentTitleRow}>
                        <Typography
                          variant="bodySm"
                          weight="bold"
                          color="primary"
                          numberOfLines={2}
                        >
                          {c.cert_name || c.file_name}
                        </Typography>
                        {(c.cert_name || c.cert_issuer || c.cert_tags?.length) && (
                          <Badge
                            label="CREDENTIAL DETAILS READY"
                            variant="green"
                            size="sm"
                          />
                        )}
                      </View>
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
        title="AI-improved CV review"
        maxWidth={680}
        scrollable
      >
        <View style={styles.refinedModalContent}>
          <Typography variant="caption" color="secondary">
          This is an improved ATS-friendly version of{" "}
          {refinedSourceName || "your CV"}. The original uploaded CV is
          unchanged. Review the content and design trade-offs before
          exporting this separate PDF or choosing it for applications.
          </Typography>
          <View style={styles.reviewSummary}>
            <Typography variant="bodySm" weight="bold" color="primary">
              What the AI changed
            </Typography>
            {refinementReview.improvements.length > 0 ? (
              refinementReview.improvements.map((item, index) => (
                <Typography key={`${item}-${index}`} variant="caption" color="secondary">
                  • {item}
                </Typography>
              ))
            ) : (
              <Typography variant="caption" color="dim">
                Structure and wording were improved only where supported by the source.
              </Typography>
            )}
            {refinementReview.warnings.map((item, index) => (
              <Typography key={`warning-${item}-${index}`} variant="caption" color="secondary">
                ⚠ {item}
              </Typography>
            ))}
            {refinementReview.designAssessment.map((item, index) => (
              <Typography key={`design-${item}-${index}`} variant="caption" color="secondary">
                Design: {item}
              </Typography>
            ))}
            {refinementReview.atsRisks.map((item, index) => (
              <Typography key={`risk-${item}-${index}`} variant="caption" color="secondary">
                ATS risk: {item}
              </Typography>
            ))}
            <Typography variant="caption" color="dim">
              ATS checks: {Object.entries(refinementReview.atsChecks)
                .filter(([, passed]) => passed)
                .map(([name]) => name.replace(/_/g, " "))
                .join(" · ") || "review required"}
            </Typography>
          </View>
          <ScrollView
            style={[styles.refinedTextBox, isCompact && styles.compactRefinedTextBox]}
            contentContainerStyle={styles.refinedTextContent}
            showsVerticalScrollIndicator
          >
            <Typography variant="caption" color="primary">
              {refinedText}
            </Typography>
          </ScrollView>
          <View
            style={[
              styles.refinedActions,
              isCompact && styles.compactRefinedActions,
            ]}
          >
            {refinedDocument && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleOpenDocument(refinedDocument)}
                style={styles.refinedAction}
              >
                Open AI-improved PDF
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onPress={exportRefinedResume}
              disabled={isExportingRefined}
              style={styles.refinedAction}
            >
              {isExportingRefined
                ? "Preparing improved PDF..."
                : "Export improved PDF"}
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
              Use improved PDF
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
  documentTitleRow: {
    alignItems: "center",
    columnGap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
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
  reviewSummary: {
    gap: 5,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.22)",
    backgroundColor: "rgba(6, 182, 212, 0.06)",
  },
  refinedTextBox: {
    maxHeight: 420,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: colors.surface.border,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  compactRefinedTextBox: {
    maxHeight: 260,
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
  compactRefinedActions: {
    flexDirection: "column",
    rowGap: 10,
  },
  refinedAction: {
    flex: 1,
    minHeight: 44,
  },
});
