import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Copy,
  ExternalLink,
  FileText,
  Phone,
  UserRound,
} from "lucide-react-native";
import { SafeAreaWrapper } from "../../components/shared/SafeAreaWrapper";
import { Card } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Typography } from "../../components/ui/Typography";
import { colors } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../components/ui/Toast";
import type { Database } from "../../types/database.types";

type Job = Database["public"]["Tables"]["job_vault"]["Row"];

export default function ApplicationPreparationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { showToast } = useToast();
  const [confirmExternalOpen, setConfirmExternalOpen] = React.useState(false);
  const [confirmProviderSubmitOpen, setConfirmProviderSubmitOpen] =
    React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: job, isLoading, error: jobError } = useQuery({
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
        .select("id,title,body,updated_at")
        .eq("job_id", id!)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ["application-preparation-certifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("id,file_name,cert_name,cert_issuer,cert_tags")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const missingFields = [
    !profile?.first_name && "first name",
    !profile?.last_name && "last name",
    !(profile?.application_email || profile?.email) && "application email",
    !primaryResume && "primary CV",
  ].filter(Boolean) as string[];

  const resumeIsReady =
    !!primaryResume &&
    ["complete", "completed", "extracted"].includes(
      primaryResume.extraction_status?.toLowerCase() || "",
    );

  if (isLoading || !job) {
    return (
      <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.center}>
          <Typography color="secondary">
            {jobError
              ? "This listing could not be loaded. Return to Pipeline and open it again."
              : "Loading application preparation..."}
          </Typography>
        </View>
      </SafeAreaWrapper>
    );
  }

  const openEmployerApplication = async () => {
    setConfirmExternalOpen(false);
    const targetUrl = job.url || job.source_url;
    if (targetUrl) await Linking.openURL(targetUrl);
  };

  const submitSupportedApplication = async () => {
    if (!id || !job || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "submit-application",
        {
          body: {
            jobId: id,
            confirmation: true,
            submissionRequestId: crypto.randomUUID(),
          },
        },
      );
      if (error) throw error;
      if (!data?.success) {
        throw new Error(
          data?.message ||
            "The provider did not accept the application. Nothing was marked as sent.",
        );
      }
      showToast(
        "Application accepted by Greenhouse. The provider returned a confirmation.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Application was not sent. Nothing was marked as submitted.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <FileText
              size={17}
              color={
                profile?.application_email
                  ? colors.accent.green
                  : colors.text.dim
              }
            />
            <Typography color="secondary">
              {profile?.application_email || "Application email uses login email"}
            </Typography>
          </View>
          <View style={styles.row}>
            <FileText
              size={17}
              color={resumeIsReady ? colors.accent.green : colors.accent.amber}
            />
            <Typography color="secondary">
              {primaryResume
                ? `${primaryResume.file_name} (${resumeIsReady ? "CV context ready" : "CV context still processing"})`
                : "Add a primary CV before applying"}
            </Typography>
          </View>
          <View style={styles.row}>
            <Award
              size={17}
              color={
                certifications.length
                  ? colors.accent.green
                  : colors.text.dim
              }
            />
            <Typography color="secondary">
              {certifications.length
                ? `${certifications.length} credential${certifications.length === 1 ? "" : "s"} ready for tailored materials`
                : "No certifications added (optional)"}
            </Typography>
          </View>
        </Card>

        <Button
          variant="primary"
          disabled={missingFields.length > 0}
          onPress={() =>
            router.push(
              (coverLetter
                ? `/cover-letter/${coverLetter.id}`
                : `/job/${job.id}`) as any,
            )
          }
        >
          {coverLetter ? "Review cover letter and fields" : "Generate cover letter"}
        </Button>

        {coverLetter && (
          <Button
            variant="secondary"
            onPress={async () => {
              await Clipboard.setStringAsync(coverLetter.body);
              showToast("Cover letter copied. Paste it into the employer form.", "success");
            }}
          >
            <Copy size={16} color={colors.accent.cyan} />
            Copy reviewed cover letter
          </Button>
        )}

        <Card style={styles.nextStepCard}>
          <Typography variant="bodySm" weight="bold" color="primary">
            Next step: candidate-controlled application
          </Typography>
          <Typography variant="caption" color="secondary">
            OpusHunter prepares the reviewed CV, contact details, and cover
            letter. It does not silently submit forms or claim universal
            browser automation. The employer page opens only after you confirm.
          </Typography>
          <Button
            variant="secondary"
            disabled={missingFields.length > 0 || !(job.url || job.source_url)}
            onPress={() => setConfirmExternalOpen(true)}
          >
            <ExternalLink size={16} color={colors.accent.cyan} />
            Open employer application
          </Button>
          {(job.url || job.source_url || "").includes("greenhouse.io") && (
            <Button
              variant="primary"
              disabled={missingFields.length > 0 || !resumeIsReady || isSubmitting}
              onPress={() => setConfirmProviderSubmitOpen(true)}
            >
              Submit through Greenhouse
            </Button>
          )}
          {(job.url || job.source_url || "").includes("lever.co") && (
            <Typography variant="caption" color="dim">
              Lever direct submission requires an employer-authorized Lever
              integration. This listing will open manually; it is never marked
              sent without a real provider response.
            </Typography>
          )}
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the original job application link"
          onPress={() => {
            const targetUrl = job.url || job.source_url;
            if (targetUrl) Linking.openURL(targetUrl);
          }}
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
      <Modal
        visible={confirmExternalOpen}
        onClose={() => setConfirmExternalOpen(false)}
        title="Open employer application?"
      >
        <Typography variant="bodySm" color="secondary">
          Your primary CV and reviewed application details are ready. The
          employer website will open in a new browser view; OpusHunter will not
          submit anything automatically.
        </Typography>
        <View style={styles.confirmActions}>
          <Button
            variant="ghost"
            onPress={() => setConfirmExternalOpen(false)}
            style={styles.confirmButton}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={openEmployerApplication}
            style={styles.confirmButton}
          >
            Continue
          </Button>
        </View>
      </Modal>
      <Modal
        visible={confirmProviderSubmitOpen}
        onClose={() => setConfirmProviderSubmitOpen(false)}
        title="Confirm Greenhouse submission"
      >
        <Typography variant="bodySm" color="secondary">
          This sends your primary CV, profile contact details, and the reviewed
          cover letter to Greenhouse for this listing. Greenhouse must return
          an accepted response before OpusHunter marks it as submitted.
        </Typography>
        <View style={styles.confirmActions}>
          <Button
            variant="ghost"
            onPress={() => setConfirmProviderSubmitOpen(false)}
            style={styles.confirmButton}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={isSubmitting}
            onPress={() => {
              setConfirmProviderSubmitOpen(false);
              void submitSupportedApplication();
            }}
            style={styles.confirmButton}
          >
            {isSubmitting ? "Submitting..." : "Confirm and submit"}
          </Button>
        </View>
      </Modal>
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
  nextStepCard: { padding: 18, gap: 10 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  confirmButton: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
