/**
 * app/(auth)/profile-setup.tsx
 * OpusHunter — 5-Step Mandatory Profile Wizard (Refined).
 * Collects all career preferences for the scraper and AI.
 * Animated step transitions with sleek progress bar. Saves to Supabase profiles table.
 */

import { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { SafeAreaWrapper } from "../../components/shared/SafeAreaWrapper";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Typography } from "../../components/ui/Typography";
import { Card } from "../../components/ui/GlassCard";
import { Chip } from "../../components/ui/Chip";
import { colors, radius } from "../../constants/theme";
import { Check, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Database } from "../../types/database.types";

type SeniorityLevel = Database["public"]["Enums"]["seniority_level_enum"];

const SENIORITY: SeniorityLevel[] = [
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
  "director",
  "vp",
  "c_level",
];
const WORK_TYPES = ["remote", "hybrid", "onsite", "flexible"];
const RADIUS_OPTIONS = [25, 50, 75, 100];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    professional_title: string;
    years_experience: string;
    seniority_level: SeniorityLevel;
    target_roles: string[];
    work_type_preferences: string[];
    target_cities: string[];
    target_countries: string[];
    location_radius_km: number;
    salary_min: string;
    salary_max: string;
    salary_currency: string;
  }>({
    professional_title: "",
    years_experience: "0",
    seniority_level: "mid",
    target_roles: [] as string[],
    work_type_preferences: ["remote"] as string[],
    target_cities: [] as string[],
    target_countries: ["Sweden"] as string[],
    location_radius_km: 50,
    salary_min: "",
    salary_max: "",
    salary_currency: "SEK",
  });

  const totalSteps = 5;

  const goNext = () => {
    if (step < totalSteps - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (loading) return;
    if (!profile) {
      setError("No profile found. Please sign in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          professional_title: formData.professional_title,
          years_experience: parseInt(formData.years_experience) || 0,
          seniority_level: formData.seniority_level,
          target_roles: formData.target_roles,
          work_type_preferences: formData.work_type_preferences as (
            "remote" | "hybrid" | "onsite" | "flexible"
          )[],
          target_cities: formData.target_cities,
          target_countries: formData.target_countries,
          location_radius_km: formData.location_radius_km,
          salary_min: formData.salary_min
            ? parseInt(formData.salary_min)
            : null,
          salary_max: formData.salary_max
            ? parseInt(formData.salary_max)
            : null,
          salary_currency: formData.salary_currency,
          profile_complete: true,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      const { data: newProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      setProfile(newProfile);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      router.replace("/(tabs)/" as any);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (loading) return;
    if (profile) {
      try {
        await supabase
          .from("profiles")
          .update({ profile_complete: true })
          .eq("id", profile.id);
      } catch {}
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.replace("/(tabs)/" as any);
  };

  const toggleArrayItem = (
    field: "target_roles" | "work_type_preferences" | "target_cities",
    value: string,
  ) => {
    setFormData((prev) => {
      const current = prev[field];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.step}>
            <Typography
              variant="h2"
              weight="bold"
              color="primary"
              style={styles.stepTitle}
            >
              Professional Identity
            </Typography>
            <Input
              label="Professional Title"
              value={formData.professional_title}
              onChangeText={(text) =>
                setFormData({ ...formData, professional_title: text })
              }
              placeholder="e.g., Senior Frontend Engineer"
            />
            <Input
              label="Years of Experience"
              value={formData.years_experience}
              onChangeText={(text) =>
                setFormData({ ...formData, years_experience: text })
              }
              placeholder="e.g., 5"
              keyboardType="numeric"
            />
            <Typography
              variant="caption"
              color="secondary"
              style={styles.subLabel}
            >
              SENIORITY LEVEL
            </Typography>
            <View style={styles.chipContainer}>
              {SENIORITY.map((level) => (
                <Chip
                  key={level}
                  label={level}
                  selected={formData.seniority_level === level}
                  onPress={() =>
                    setFormData({ ...formData, seniority_level: level })
                  }
                />
              ))}
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.step}>
            <Typography
              variant="h2"
              weight="bold"
              color="primary"
              style={styles.stepTitle}
            >
              Target Roles & Work Type
            </Typography>
            <Input
              label="Target Roles (comma separated)"
              value={formData.target_roles.join(", ")}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  target_roles: text
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Frontend, Backend, Fullstack..."
            />
            <Typography
              variant="caption"
              color="secondary"
              style={styles.subLabel}
            >
              WORK TYPES
            </Typography>
            <View style={styles.chipContainer}>
              {WORK_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  selected={formData.work_type_preferences.includes(type)}
                  onPress={() => toggleArrayItem("work_type_preferences", type)}
                />
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.step}>
            <Typography
              variant="h2"
              weight="bold"
              color="primary"
              style={styles.stepTitle}
            >
              Location & Geography
            </Typography>
            <Input
              label="Target Cities (comma separated)"
              value={formData.target_cities.join(", ")}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  target_cities: text
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Stockholm, Gothenburg, Malmö..."
            />
            <Input
              label="Target Countries (comma separated)"
              value={formData.target_countries.join(", ")}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  target_countries: text
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Sweden, Germany, UK..."
            />
            <Typography
              variant="caption"
              color="secondary"
              style={styles.subLabel}
            >
              RADIUS (KM)
            </Typography>
            <View style={styles.chipContainer}>
              {RADIUS_OPTIONS.map((r) => (
                <Chip
                  key={r}
                  label={`${r} km`}
                  selected={formData.location_radius_km === r}
                  onPress={() =>
                    setFormData({ ...formData, location_radius_km: r })
                  }
                />
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.step}>
            <Typography
              variant="h2"
              weight="bold"
              color="primary"
              style={styles.stepTitle}
            >
              Salary Expectations
            </Typography>
            <View style={styles.row}>
              <Input
                label="Min"
                value={formData.salary_min}
                onChangeText={(text) =>
                  setFormData({ ...formData, salary_min: text })
                }
                placeholder="45000"
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="Max"
                value={formData.salary_max}
                onChangeText={(text) =>
                  setFormData({ ...formData, salary_max: text })
                }
                placeholder="65000"
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>
            <Typography
              variant="caption"
              color="secondary"
              style={styles.subLabel}
            >
              CURRENCY
            </Typography>
            <View style={styles.chipContainer}>
              {["SEK", "EUR", "USD", "GBP"].map((currency) => (
                <Chip
                  key={currency}
                  label={currency}
                  selected={formData.salary_currency === currency}
                  onPress={() =>
                    setFormData({ ...formData, salary_currency: currency })
                  }
                />
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.step}>
            <Typography
              variant="h2"
              weight="bold"
              color="primary"
              style={styles.stepTitle}
            >
              Review & Complete
            </Typography>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Title</Text>
                <Text style={styles.summaryValue}>
                  {formData.professional_title || "N/A"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Experience</Text>
                <Text style={styles.summaryValue}>
                  {formData.years_experience} years
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Roles</Text>
                <Text style={styles.summaryValue}>
                  {formData.target_roles.join(", ") || "N/A"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Work Types</Text>
                <Text style={styles.summaryValue}>
                  {formData.work_type_preferences.join(", ")}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cities</Text>
                <Text style={styles.summaryValue}>
                  {formData.target_cities.join(", ") || "N/A"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Countries</Text>
                <Text style={styles.summaryValue}>
                  {formData.target_countries.join(", ")}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Radius</Text>
                <Text style={styles.summaryValue}>
                  {formData.location_radius_km} km
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Salary</Text>
                <Text style={styles.summaryValue}>
                  {formData.salary_min
                    ? `${formData.salary_min} - ${formData.salary_max} ${formData.salary_currency}`
                    : "Not specified"}
                </Text>
              </View>
            </Card>
          </View>
        );
    }
  };

  return (
    <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <Pressable
          onPress={goBack}
          disabled={step === 0}
          hitSlop={8}
          style={[styles.backButton, step === 0 && styles.backButtonDisabled]}
        >
          <ChevronLeft
            size={24}
            color={step === 0 ? colors.text.dim : colors.text.primary}
          />
        </Pressable>
        <Typography variant="caption" color="secondary">
          STEP {step + 1} OF {totalSteps}
        </Typography>
        <Pressable onPress={handleSkip} hitSlop={8}>
          <Typography variant="caption" color="accent">
            Skip Setup
          </Typography>
        </Pressable>
      </View>

      <View
        style={[styles.progressTrack, isDesktop && styles.progressTrackDesktop]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / totalSteps) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={step}
          entering={FadeInDown.duration(300).easing(Easing.out(Easing.quad))}
          style={styles.content}
        >
          {stepContent()}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <Button
            onPress={goNext}
            loading={loading}
            style={styles.nextButton}
            haptic={false}
          >
            {step === totalSteps - 1 ? "Complete Profile" : "Continue"}
            {step === totalSteps - 1 ? (
              <Check size={18} color={colors.text.inverse} />
            ) : (
              <ChevronRight size={18} color={colors.text.inverse} />
            )}
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  backButtonDisabled: { opacity: 0.4 },
  headerDesktop: {
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.surface.border,
    marginHorizontal: 24,
    borderRadius: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressTrackDesktop: {
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  scrollDesktop: {
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  content: { flex: 1 },
  step: { paddingTop: 8 },
  stepTitle: { marginBottom: 24 },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  subLabel: { marginTop: 12, marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  summaryCard: { padding: 16, marginBottom: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  summaryLabel: { color: colors.text.dim, fontSize: 14, fontWeight: "600" },
  summaryValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  errorBox: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.accent.red, fontSize: 13 },
  nextButton: { marginTop: 16 },
});
