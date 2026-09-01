/**
 * app/(tabs)/pipeline.tsx
 * OpusHunter — Pipeline (Kanban) Screen (Refined).
 * Fetches real job applications from Supabase, joins with job_vault for job details.
 * Renders a clean Kanban board with drag-and-drop.
 */

import { View, StyleSheet } from "react-native";
import { SafeAreaWrapper } from "../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../components/ui/Typography";
import { KanbanBoard } from "../../../components/jobcardsetup/KanbanBoard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import React from "react";

export default function PipelineScreen() {
  const { user } = useAuthStore();

  // Fetch applications with job details (joins job_vault)
  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("job_applications")
        .select("*, job_vault(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" color="primary">
          Pipeline
        </Typography>
      </View>

      <KanbanBoard applications={applications || []} isLoading={isLoading} />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
});
