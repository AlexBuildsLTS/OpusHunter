/**
 * app/cover-letter/[id].tsx
 * OpusHunter — Cover Letter View/Edit/Compare Screen.
 * Displays AI-generated letter. Copy to clipboard. Apply Now opens URL.
 * (Auto-apply with CV/Certs will be integrated once auto-apply Edge Function is deployed.)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { colors, radius } from "../../../../constants/theme";
import {
  ArrowLeft,
  Copy,
  Share,
  Edit,
  RefreshCw,
  Check,
  Brain,
  Clock,
  ExternalLink,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { Database } from "types/database.types";


type CoverLetter = Database["public"]["Tables"]["cover_letters"]["Row"];

export default function CoverLetterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch Cover Letter
  const { data: letter, isLoading } = useQuery({
    queryKey: ["cover-letter", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const { data, error } = await supabase
        .from("cover_letters")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as CoverLetter;
    },
  });

  // Auto-save edits (debounced)
  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(async () => {
      if (editedBody !== letter?.body && editedBody.length > 0) {
        setSaving(true);
        await supabase
          .from("cover_letters")
          .update({ body: editedBody, user_edited: true })
          .eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["cover-letter", id] });
        setSaving(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [editedBody, editing]);

  const handleCopy = async () => {
    if (!letter) return;
    await Clipboard.setStringAsync(letter.body);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  };

  const handleShare = async () => {
    if (!letter) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(letter.body);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !letter) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke(
      "generate-cover-letter",
      {
        body: {
          userId: user.id,
          jobListingId: letter.job_id,
          strategy: letter.strategy_used,
        },
      },
    );
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["cover-letter", id] });
    }
    setSaving(false);
  };

  const handleApply = async () => {
    if (!letter || !letter.job_id) return;
    // Fetch job URL
    const { data: job } = await supabase
      .from("job_vault")
      .select("url")
      .eq("id", letter.job_id)
      .single();
    if (job?.url) {
      await Linking.openURL(job.url);
    } else {
      // Fallback: copy letter to clipboard
      await handleCopy();
    }
  };

  if (isLoading || !letter) {
    return (
      <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.loading}>
          <Typography color="secondary">Loading letter...</Typography>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Typography variant="h4" weight="semiBold" color="primary">
          Cover Letter
        </Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta Header */}
        <View style={styles.metaRow}>
          <View style={{ flex: 1 }}>
            <Typography variant="h3" weight="bold" color="primary">
              {letter.company}
            </Typography>
            <Typography variant="bodySm" color="secondary">
              {letter.job_title}
            </Typography>
          </View>
          <Badge
            variant={
              letter.strategy_used === "mirror_matching"
                ? "cyan"
                : letter.strategy_used === "achievement_amplification"
                  ? "green"
                  : "blue"
            }
            label={letter.strategy_used?.replace(/_/g, " ") || "Standard"}
            size="sm"
            dot
          />
        </View>

        {/* Scores + Metrics */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Typography variant="h4" weight="bold" color="primary">
                {letter.ats_score ?? "N/A"}
              </Typography>
              <Typography variant="caption" color="secondary">
                ATS Score
              </Typography>
            </View>
            <View style={styles.scoreItem}>
              <Typography variant="h4" weight="bold" color="primary">
                {letter.specificity_score ?? "N/A"}
              </Typography>
              <Typography variant="caption" color="secondary">
                Specificity
              </Typography>
            </View>
            <View style={styles.scoreItem}>
              <Brain size={20} color={colors.accent.cyan} />
              <Typography variant="caption" color="secondary">
                {letter.generated_by}
              </Typography>
            </View>
            <View style={styles.scoreItem}>
              <Clock size={20} color={colors.accent.cyan} />
              <Typography variant="caption" color="secondary">
                {Math.round((letter.generation_duration_ms || 0) / 1000)}s
              </Typography>
            </View>
          </View>
        </Card>

        {/* Letter Content */}
        <Card style={styles.letterCard}>
          {editing ? (
            <TextInput
              multiline
              value={editedBody}
              onChangeText={setEditedBody}
              style={styles.editor}
              autoFocus
            />
          ) : (
            <Typography
              variant="body"
              color="primary"
              style={{ lineHeight: 24 }}
            >
              {letter.body}
            </Typography>
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            variant="secondary"
            size="sm"
            onPress={handleCopy}
            style={styles.actionBtn}
          >
            <Copy size={16} color={colors.accent.cyan} /> Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={handleShare}
            style={styles.actionBtn}
          >
            <Share size={16} color={colors.accent.cyan} /> Share
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              setEditing(!editing);
              setEditedBody(letter.body);
            }}
            style={styles.actionBtn}
          >
            <Edit size={16} color={colors.accent.cyan} />{" "}
            {editing ? "Done" : "Edit"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={handleRegenerate}
            loading={saving}
            style={styles.actionBtn}
          >
            <RefreshCw size={16} color={colors.accent.cyan} /> Regenerate
          </Button>
        </View>

        {editing && saving && (
          <Typography variant="caption" color="dim" style={styles.savingText}>
            Saving changes...
          </Typography>
        )}

        {/* Apply Now */}
        <Button variant="primary" onPress={handleApply} style={styles.applyBtn}>
          <ExternalLink size={18} color={colors.text.inverse} /> Apply Now
        </Button>

        <Typography
          variant="caption"
          color="dim"
          textAlign="center"
          style={styles.hint}
        >
          Apply Now opens the job application URL. Your cover letter is ready to
          paste, and your CV & Certifications will be auto-attached once
          auto-apply is enabled.
        </Typography>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 140 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  scoreCard: { padding: 16, marginBottom: 16 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  scoreItem: { alignItems: "center", gap: 4, flex: 1 },
  letterCard: { padding: 20, marginBottom: 16 },
  editor: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 300,
    textAlignVertical: "top",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  actionBtn: { flex: 1, minWidth: "45%", paddingHorizontal: 8, gap: 4 },
  savingText: { textAlign: "center", marginBottom: 8 },
  applyBtn: { marginBottom: 8 },
  hint: { marginTop: 8 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
