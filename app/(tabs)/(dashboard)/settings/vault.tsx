import React, { useState } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { DocumentUploader } from "./DocumentUploader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { colors, radius } from "../../../../constants/theme";
import {
  FileText,
  Award,
  Trash2,
  Star,
  Upload,
  Plus,
} from "lucide-react-native";
import type { Database } from "../../../../types/database.types";

type ResumeDoc = Database["public"]["Tables"]["resume_documents"]["Row"];
type Cert = Database["public"]["Tables"]["certifications"]["Row"];

export default function VaultScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState<false | "cv" | "cert">(
    false,
  );

  // Fetch CVs and Certifications in parallel
  const { data: resumes, isLoading: loadingCVs } = useQuery({
    queryKey: ["resumes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("resume_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as ResumeDoc[];
    },
  });

  const { data: certs, isLoading: loadingCerts } = useQuery({
    queryKey: ["certs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as Cert[];
    },
  });

  // Set Primary CV
  const setPrimary = async (id: string) => {
    if (!user) return;
    await supabase
      .from("resume_documents")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    await supabase
      .from("resume_documents")
      .update({ is_primary: true })
      .eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["resumes", user.id] });
  };

  // Delete Document
  const deleteDoc = async (
    type: "resume" | "cert",
    id: string,
    path: string,
  ) => {
    if (!user) return;
    const bucket = type === "resume" ? "resumes" : "certifications";
    await supabase.storage.from(bucket).remove([path]);
    await supabase
      .from(type === "resume" ? "resume_documents" : "certifications")
      .delete()
      .eq("id", id);
    queryClient.invalidateQueries({
      queryKey: [type === "resume" ? "resumes" : "certs", user.id],
    });
  };

  const primaryCV = resumes?.find((r) => r.is_primary) || resumes?.[0];
  const otherCVs = resumes?.filter((r) => r.id !== primaryCV?.id) || [];

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" color="primary">
          Vault
        </Typography>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => setShowUploader("cv")}
          style={styles.uploadBtn}
        >
          <Upload size={16} color={colors.accent.cyan} /> Upload CV
        </Button>
      </View>

      <FlatList
        data={[]}
        ListHeaderComponent={
          <>
            {/* Primary CV Section */}
            <View style={styles.section}>
              <Typography
                variant="caption"
                color="secondary"
                style={styles.sectionLabel}
              >
                PRIMARY CV
              </Typography>
              {loadingCVs ? (
                <Card style={styles.emptyCard}>
                  <Typography color="secondary">Loading CV...</Typography>
                </Card>
              ) : primaryCV ? (
                <Card variant="elevated" style={styles.docCard}>
                  <View style={styles.docRow}>
                    <View style={styles.iconWrap}>
                      <FileText size={24} color={colors.accent.cyan} />
                    </View>
                    <View style={styles.docInfo}>
                      <Typography
                        variant="bodySm"
                        weight="semiBold"
                        color="primary"
                        numberOfLines={1}
                      >
                        {primaryCV.file_name}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        {Math.round(primaryCV.file_size_kb || 0)} KB ·{" "}
                        {primaryCV.extraction_status}
                      </Typography>
                    </View>
                    <Pressable
                      onPress={() =>
                        deleteDoc(
                          "resume",
                          primaryCV.id,
                          primaryCV.storage_path,
                        )
                      }
                      hitSlop={8}
                    >
                      <Trash2 size={18} color={colors.accent.red} />
                    </Pressable>
                  </View>
                </Card>
              ) : (
                <Card style={styles.emptyCard}>
                  <Typography color="dim" textAlign="center">
                    No CV uploaded yet. Upload your primary CV to start
                    applying.
                  </Typography>
                </Card>
              )}
            </View>

            {/* Other CVs Section */}
            {otherCVs.length > 0 && (
              <View style={styles.section}>
                <Typography
                  variant="caption"
                  color="secondary"
                  style={styles.sectionLabel}
                >
                  OTHER CVS
                </Typography>
                {otherCVs.map((cv) => (
                  <Card key={cv.id} style={styles.docCard}>
                    <View style={styles.docRow}>
                      <View style={styles.iconWrap}>
                        <FileText size={20} color={colors.text.secondary} />
                      </View>
                      <View style={styles.docInfo}>
                        <Typography
                          variant="bodySm"
                          weight="medium"
                          color="primary"
                          numberOfLines={1}
                        >
                          {cv.file_name}
                        </Typography>
                      </View>
                      <Pressable onPress={() => setPrimary(cv.id)} hitSlop={8}>
                        <Star size={18} color={colors.accent.amber} />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          deleteDoc("resume", cv.id, cv.storage_path)
                        }
                        hitSlop={8}
                      >
                        <Trash2 size={18} color={colors.accent.red} />
                      </Pressable>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Certifications Section (MULTIPLE Uploads Supported) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Typography
                  variant="caption"
                  color="secondary"
                  style={styles.sectionLabel}
                >
                  CERTIFICATIONS
                </Typography>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowUploader("cert")}
                  style={styles.uploadBtnSm}
                >
                  <Plus size={14} color={colors.accent.cyan} /> Add
                </Button>
              </View>
              {loadingCerts ? (
                <Card style={styles.emptyCard}>
                  <Typography color="secondary">
                    Loading Certifications...
                  </Typography>
                </Card>
              ) : certs && certs.length > 0 ? (
                <View style={styles.certGrid}>
                  {certs.map((cert) => (
                    <Card key={cert.id} style={styles.certCard}>
                      <View style={styles.certHeader}>
                        <Award size={20} color={colors.accent.blue} />
                        <Pressable
                          onPress={() =>
                            deleteDoc("cert", cert.id, cert.storage_path)
                          }
                          hitSlop={8}
                        >
                          <Trash2 size={16} color={colors.accent.red} />
                        </Pressable>
                      </View>
                      <Typography
                        variant="bodySm"
                        weight="semiBold"
                        color="primary"
                        numberOfLines={1}
                      >
                        {cert.cert_name || cert.file_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                      >
                        {cert.cert_issuer}
                      </Typography>
                    </Card>
                  ))}
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Typography color="dim" textAlign="center">
                    No certifications uploaded. Add them to boost your profile.
                  </Typography>
                </Card>
              )}
            </View>
          </>
        }
        keyExtractor={(item, index) => `vault-${index}`}
        renderItem={null}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      />

      <DocumentUploader
        visible={showUploader !== false}
        type={showUploader || "cv"}
        onClose={() => setShowUploader(false)}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  uploadBtn: { flexDirection: "row", gap: 4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: { marginBottom: 8 },
  uploadBtnSm: { paddingVertical: 4, paddingHorizontal: 8 },
  docCard: { padding: 12, marginBottom: 8 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(0,210,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: { flex: 1 },
  emptyCard: { padding: 20, alignItems: "center" },
  certGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  certCard: { width: "48%", padding: 12 },
  certHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
});
