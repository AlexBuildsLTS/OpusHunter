import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Phone, UserRound } from "lucide-react-native";
import { SafeAreaWrapper } from "../../components/shared/SafeAreaWrapper";
import { Card } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Typography } from "../../components/ui/Typography";
import { colors } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import type { Database } from "../../types/database.types";

type Job = Database["public"]["Tables"]["job_vault"]["Row"];

export default function ApplicationPreparationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const { data: job, isLoading } = useQuery({
    queryKey: ["application-preparation-job", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_vault")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Job;
    },
  });

  const { data: primaryResume } = useQuery({
    queryKey: ["application-preparation-resume", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resume_documents")
        .select("id,file_name,extraction_status,is_primary")
        .eq("user_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: coverLetter } = useQuery({
    queryKey: ["application-preparation-cover-letter", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cover_letters")
        .select("id,title,updated_at")
        .eq("job_id", id!)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const missingFields = [
    !profile?.first_name && "first name",
    !profile?.last_name && "last name",
    !profile?.email && "email",
    !primaryResume && "primary CV",
  ].filter(Boolean) as string[];

  if (isLoading || !job) {
    return (
      <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.center}>
          <Typography color="secondary">Loading application preparation...</Typography>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="h2" weight="bold" color="primary">
          Prepare application
        </Typography>
        <Typography color="secondary" style={styles.subtitle}>
          Review your materials before choosing the fast path or opening the
          company website. Nothing is submitted automatically from this screen.
        </Typography>

        <Card style={styles.card}>
          <Typography variant="h3" weight="bold" color="primary">
            {job.title}
          </Typography>
          <Typography color="secondary">{job.company}</Typography>
          <Typography variant="caption" color="dim">
            {job.location || "Location not specified"}
          </Typography>
        </Card>

        <Card style={styles.card}>
          <Typography variant="bodySm" weight="bold" color="primary">
            Application readiness
          </Typography>
          <View style={styles.row}>
            <UserRound size={17} color={missingFields.length ? colors.accent.amber : colors.accent.green} />
            <Typography color="secondary">
              {missingFields.length
                ? `Missing: ${missingFields.join(", ")}`
                : `Identity: ${profile?.first_name} ${profile?.last_name}`}
            </Typography>
          </View>
          <View style={styles.row}>
            <FileText
              size={17}
              color={coverLetter ? colors.accent.green : colors.text.dim}
            />
            <Typography color="secondary">
              {coverLetter
                ? `Cover letter ready: ${coverLetter.title}`
                : "No saved cover letter yet (you can generate one first)"}
            </Typography>
          </View>
          <View style={styles.row}>
            <Phone size={17} color={profile?.phone ? colors.accent.green : colors.text.dim} />
            <Typography color="secondary">
              {profile?.phone || "Phone not provided (optional)"}
            </Typography>
          </View>
          <View style={styles.row}>
            <FileText size={17} color={primaryResume ? colors.accent.green : colors.accent.amber} />
            <Typography color="secondary">
              {primaryResume
                ? `${primaryResume.file_name} (${primaryResume.extraction_status})`
                : "Add a primary CV before applying"}
            </Typography>
          </View>
        </Card>

        <Button
          variant="primary"
          disabled={missingFields.length > 0}
          onPress={() => router.push(`/job/${job.id}` as any)}
        >
          Review CV, cover letter, and fields
        </Button>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the original job application link"
          onPress={() => Linking.openURL(job.url)}
          style={styles.linkButton}
        >
          <ExternalLink size={18} color={colors.accent.cyan} />
          <Typography color="accent" weight="semiBold">
            Open application link directly
          </Typography>
        </Pressable>
        <Typography variant="caption" color="dim" textAlign="center">
          Direct link access is preserved. Unsupported sites can be completed
          manually with your reviewed CV and cover letter.
        </Typography>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 20, gap: 16, paddingBottom: 80 },
  subtitle: { lineHeight: 21 },
  card: { padding: 18, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkButton: { minHeight: 48, borderWidth: 1, borderColor: colors.accent.cyan, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
