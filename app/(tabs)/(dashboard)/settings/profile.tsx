import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Input } from "../../../../components/ui/Input";
import { Button } from "../../../../components/ui/Button";
import { Chip } from "../../../../components/ui/Chip";
import { useAuthStore } from "../../../../stores/authStore";
import { supabase } from "../../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, shadows } from "../../../../constants/theme";
import * as ImagePicker from "expo-image-picker";
import {
  User,
  Briefcase,
  MapPin,
  Sparkles,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Coins,
  ShieldCheck,
  Check,
  Camera,
  UploadCloud,
} from "lucide-react-native";
import type { Database } from "../../../../types/database.types";
import type { SeniorityLevel, WorkType } from "../../../../types/app.types";

type UserContext = Database["public"]["Tables"]["user_context"]["Row"];

const ALL_SENIORITIES: SeniorityLevel[] = [
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
  "director",
  "vp",
  "c_level",
];

const WORK_TYPES: WorkType[] = ["remote", "hybrid", "onsite", "flexible"];

const PRESET_COUNTRIES = [
  "Sweden",
  "Germany",
  "United Kingdom",
  "Netherlands",
  "Denmark",
  "Norway",
  "Finland",
];

const PRESET_SWEDISH_CITIES = [
  "Stockholm",
  "Gothenburg",
  "Malmö",
  "Uppsala",
  "Lund",
  "Linköping",
];

type BioTone = "formal" | "executive" | "technical" | "modern";

export default function ProfileScreen() {
  const { profile, setProfile, user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form State
  const [form, setForm] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    avatar_url: profile?.avatar_url || "",
    professional_title: profile?.professional_title || "",
    bio: profile?.bio || "",
    years_experience:
      profile?.years_experience != null ? String(profile.years_experience) : "",
    seniority_levels: (profile?.seniority_level
      ? [profile.seniority_level as SeniorityLevel]
      : ["mid" as SeniorityLevel]) as SeniorityLevel[],
    target_roles: profile?.target_roles || ["Full Stack Developer"],
    work_type_preferences: (profile?.work_type_preferences || [
      "remote",
      "hybrid",
    ]) as WorkType[],
    target_cities: profile?.target_cities || ["Stockholm"],
    target_countries: profile?.target_countries || ["Sweden"],
    location_radius_km: profile?.location_radius_km || 50,
    salary_min: profile?.salary_min != null ? String(profile.salary_min) : "",
    salary_max: profile?.salary_max != null ? String(profile.salary_max) : "",
    salary_currency: profile?.salary_currency || "SEK",
    languages: profile?.languages || ["English", "Swedish"],
  });

  // Keep form in sync when profile updates
  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        professional_title: profile.professional_title || "",
        bio: profile.bio || "",
        years_experience:
          profile.years_experience != null
            ? String(profile.years_experience)
            : "",
        seniority_levels: profile.seniority_level
          ? [profile.seniority_level as SeniorityLevel]
          : ["mid"],
        target_roles: profile.target_roles || [],
        work_type_preferences: (profile.work_type_preferences || [
          "remote",
        ]) as WorkType[],
        target_cities: profile.target_cities || [],
        target_countries: profile.target_countries || ["Sweden"],
        location_radius_km: profile.location_radius_km || 50,
        salary_min:
          profile.salary_min != null ? String(profile.salary_min) : "",
        salary_max:
          profile.salary_max != null ? String(profile.salary_max) : "",
        salary_currency: profile.salary_currency || "SEK",
        languages: profile.languages || ["English"],
      });
    }
  }, [profile]);

  // AI Context query
  const { data: userContext } = useQuery({
    queryKey: ["user-context", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from("user_context")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      return (data as UserContext) || null;
    },
  });

  // AI Bio Generator with Tone Selection (Formal, Executive, Technical, Modern)
  const [bioTone, setBioTone] = useState<BioTone>("formal");
  const [generatingBio, setGeneratingBio] = useState(false);

  const handleGenerateBio = async () => {
    if (!user) {
      showToast({ message: "Please log in to generate bio", type: "error" });
      return;
    }
    setGeneratingBio(true);
    try {
      const fullName = [form.first_name, form.last_name]
        .filter(Boolean)
        .join(" ");
      const title =
        form.professional_title || "Software Engineering Professional";
      const years = form.years_experience || "established";
      const skills = userContext?.extracted_skills || [
        "Java",
        "Spring Boot",
        "TypeScript",
        "React Native",
        "PostgreSQL",
        "Deno",
        "Linux",
      ];
      const roles = form.target_roles || [title];

      const { data, error } = await supabase.functions.invoke(
        "extract-context",
        {
          body: {
            action: "generate_bio",
            userId: user.id,
            tone: bioTone,
            fullName,
            professional_title: title,
            years_experience: years,
            target_roles: roles,
            skills,
          },
        },
      );

      if (error) throw error;
      if (data?.bio) {
        setForm((prev) => ({ ...prev, bio: data.bio }));
        showToast({
          message: `AI Bio generated via ${data.modelUsed || "Gemini"}`,
          type: "success",
        });
      } else {
        throw new Error(data?.message || "No bio returned from AI model");
      }
    } catch (err: any) {
      console.warn("Real AI bio generation fallback error:", err);
      showToast({
        message: err.message || "Failed to generate bio with AI",
        type: "error",
      });
    } finally {
      setGeneratingBio(false);
    }
  };

  // Seniority Selection Helpers
  const isAllSenioritySelected =
    form.seniority_levels.length === ALL_SENIORITIES.length;

  const toggleSeniority = (level: SeniorityLevel) => {
    setForm((prev) => {
      const exists = prev.seniority_levels.includes(level);
      const updated = exists
        ? prev.seniority_levels.filter((item) => item !== level)
        : [...prev.seniority_levels, level];
      return {
        ...prev,
        seniority_levels: updated.length > 0 ? updated : [level],
      };
    });
  };

  const toggleSelectAllSeniority = () => {
    setForm((prev) => ({
      ...prev,
      seniority_levels: isAllSenioritySelected ? ["mid"] : [...ALL_SENIORITIES],
    }));
  };

  // GeoDB / City Search
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<string[]>([]);

  useEffect(() => {
    const searchCities = async () => {
      if (cityQuery.length < 2) {
        setCityResults([]);
        return;
      }
      try {
        const { data } = await supabase.functions.invoke("geo-autocomplete", {
          body: { query: cityQuery, countryCode: "SE" },
        });
        if (data?.cities) {
          setCityResults(data.cities.map((c: any) => c.name));
        }
      } catch (err) {
        console.warn("City autocomplete error", err);
      }
    };
    const timer = setTimeout(searchCities, 300);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  const toggleArrayItem = (
    field:
      | "target_roles"
      | "work_type_preferences"
      | "target_cities"
      | "target_countries"
      | "languages",
    value: string,
  ) => {
    setForm((prev) => {
      const current = prev[field] as string[];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      const primarySeniority = (form.seniority_levels[0] ||
        "mid") as Database["public"]["Enums"]["seniority_level_enum"];

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          professional_title: form.professional_title.trim() || null,
          bio: form.bio.trim() || null,
          years_experience: form.years_experience
            ? parseInt(form.years_experience)
            : null,
          seniority_level: primarySeniority,
          target_roles: form.target_roles,
          work_type_preferences: form.work_type_preferences,
          target_cities: form.target_cities,
          target_countries: form.target_countries,
          location_radius_km: form.location_radius_km,
          salary_min: form.salary_min ? parseInt(form.salary_min) : null,
          salary_max: form.salary_max ? parseInt(form.salary_max) : null,
          salary_currency: form.salary_currency,
          languages: form.languages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Re-fetch profile to update Zustand state
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .maybeSingle();

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Symmetrical Centered Box Wrapper */}
        <View style={styles.centeredContainer}>
          {/* Header Title */}
          <View style={styles.header}>
            <View>
              <Typography variant="h2" weight="bold" color="primary">
                Profile & Targeting
              </Typography>
              <Typography
                variant="caption"
                color="secondary"
                style={styles.headerSubtitle}
              >
                Manage your professional identity, candidate criteria, and AI
                generation context.
              </Typography>
            </View>
            <Button
              variant="primary"
              size="sm"
              onPress={handleSave}
              loading={saving}
              style={styles.headerSaveBtn}
            >
              <Save size={15} color={colors.text.inverse} />
              {saved ? "Saved!" : "Save"}
            </Button>
          </View>

          {/* Feedback Banner */}
          {saved && (
            <View style={styles.saveAlertSuccess}>
              <CheckCircle2 size={16} color={colors.accent.green} />
              <Typography
                variant="bodySm"
                weight="medium"
                style={{ color: colors.accent.green }}
              >
                Profile settings successfully saved and synced!
              </Typography>
            </View>
          )}

          {saveError && (
            <View style={styles.saveAlertError}>
              <AlertCircle size={16} color={colors.accent.red} />
              <Typography
                variant="bodySm"
                weight="medium"
                style={{ color: colors.accent.red }}
              >
                {saveError}
              </Typography>
            </View>
          )}

          {/* 1. Protected Unique Identity Card */}
          <Card variant="elevated" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Lock size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  ACCOUNT & UNIQUE IDENTITY
                </Typography>
              </View>
              <Badge label="Protected" variant="cyan" size="sm" />
            </View>

            <View style={styles.identityRow}>
              <View style={styles.identityItem}>
                <Typography variant="caption" color="dim">
                  UNIQUE EMAIL (LOGIN)
                </Typography>
                <View style={styles.protectedValueBox}>
                  <ShieldCheck size={14} color={colors.accent.green} />
                  <Typography
                    variant="bodySm"
                    weight="semiBold"
                    color="primary"
                    numberOfLines={1}
                  >
                    {profile?.email || user?.email || "No email on record"}
                  </Typography>
                </View>
              </View>

              <View style={styles.identityItem}>
                <Typography variant="caption" color="dim">
                  ACCOUNT ROLE & ID
                </Typography>
                <View style={styles.protectedValueBox}>
                  <Typography
                    variant="caption"
                    weight="semiBold"
                    style={{ color: colors.accent.cyan }}
                  >
                    {profile?.role?.toUpperCase() || "MEMBER"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="dim"
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    · {profile?.id?.slice(0, 8)}...
                  </Typography>
                </View>
              </View>
            </View>
            <Typography
              variant="caption"
              color="dim"
              style={styles.protectedNote}
            >
              Unique email and account identifiers are hardware/auth-sealed.
              Professional names and attributes below are freely customizable.
            </Typography>
          </Card>

          {/* 2. Personal & Professional Name Details */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <User size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  PROFESSIONAL IDENTITY
                </Typography>
              </View>
            </View>

            <View style={styles.gridTwoCols}>
              <View style={styles.gridCol}>
                <Input
                  label="First Name"
                  value={form.first_name}
                  onChangeText={(t) => setForm({ ...form, first_name: t })}
                  placeholder="e.g. Alex"
                />
              </View>
              <View style={styles.gridCol}>
                <Input
                  label="Last Name"
                  value={form.last_name}
                  onChangeText={(t) => setForm({ ...form, last_name: t })}
                  placeholder="e.g. Lindqvist"
                />
              </View>
            </View>

            <View style={styles.gridTwoCols}>
              <View style={styles.gridCol}>
                <Input
                  label="Professional Title"
                  value={form.professional_title}
                  onChangeText={(t) =>
                    setForm({ ...form, professional_title: t })
                  }
                  placeholder="e.g. Staff Full Stack Engineer"
                  icon={<Briefcase size={16} color={colors.text.dim} />}
                />
              </View>
              <View style={styles.gridCol}>
                <Input
                  label="Years of Experience"
                  value={form.years_experience}
                  onChangeText={(t) =>
                    setForm({ ...form, years_experience: t })
                  }
                  placeholder="e.g. 7"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </Card>

          {/* 3. Seniority Targeting (Multi-Select & Select All) */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Briefcase size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  SENIORITY TIERS (MULTI-SELECT)
                </Typography>
              </View>
              <Pressable
                onPress={toggleSelectAllSeniority}
                style={[
                  styles.selectAllBtn,
                  isAllSenioritySelected && styles.selectAllBtnActive,
                ]}
              >
                <Check
                  size={12}
                  color={
                    isAllSenioritySelected
                      ? colors.text.inverse
                      : colors.accent.cyan
                  }
                />
                <Typography
                  variant="caption"
                  weight="bold"
                  style={{
                    color: isAllSenioritySelected
                      ? colors.text.inverse
                      : colors.accent.cyan,
                  }}
                >
                  {isAllSenioritySelected
                    ? "Open to All Levels ✓"
                    : "Select All Levels"}
                </Typography>
              </Pressable>
            </View>

            <Typography
              variant="caption"
              color="secondary"
              style={{ marginBottom: 12 }}
            >
              Choose specific target seniorities or toggle all to allow the
              scraper to capture broad opportunities.
            </Typography>

            <View style={styles.chipGrid}>
              {ALL_SENIORITIES.map((level) => {
                const selected = form.seniority_levels.includes(level);
                return (
                  <Chip
                    key={level}
                    label={level.replace("_", "-").toUpperCase()}
                    selected={selected}
                    onPress={() => toggleSeniority(level)}
                  />
                );
              })}
            </View>
          </Card>

          {/* 4. AI Bio / About Section with Formal Tone */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Sparkles size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  PROFESSIONAL BIO & AI SYNTHESIS
                </Typography>
              </View>
            </View>

            {/* Tone Selector */}
            <View style={styles.toneSelectorContainer}>
              <Typography
                variant="caption"
                color="dim"
                style={{ marginBottom: 6 }}
              >
                AI GENERATION TONE:
              </Typography>
              <View style={styles.toneRow}>
                {(
                  [
                    { id: "formal", label: "Formal" },
                    { id: "executive", label: "Executive" },
                    { id: "technical", label: "Technical" },
                    { id: "modern", label: "Modern" },
                  ] as const
                ).map((t) => {
                  const active = bioTone === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setBioTone(t.id)}
                      style={[styles.toneBtn, active && styles.toneBtnActive]}
                    >
                      <Typography
                        variant="caption"
                        weight={active ? "bold" : "medium"}
                        style={{
                          color: active
                            ? colors.accent.cyan
                            : colors.text.secondary,
                        }}
                      >
                        {t.label}
                      </Typography>
                    </Pressable>
                  );
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleGenerateBio}
                  loading={generatingBio}
                  style={styles.generateBioBtn}
                >
                  <Sparkles size={14} color={colors.accent.cyan} /> Generate Bio
                </Button>
              </View>
            </View>

            <Input
              label="Professional Summary / Bio"
              value={form.bio}
              onChangeText={(t) => setForm({ ...form, bio: t })}
              placeholder="Detailed candidate summary or use the AI generator above..."
              multiline
              numberOfLines={4}
              style={styles.bioTextArea}
            />
          </Card>

          {/* 5. Target Roles & Work Types */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Globe size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  CAREER SCOPE & WORK MODES
                </Typography>
              </View>
            </View>

            <Input
              label="Target Roles (Comma-separated)"
              value={form.target_roles.join(", ")}
              onChangeText={(t) =>
                setForm({
                  ...form,
                  target_roles: t
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. Lead Engineer, Full Stack, Cloud Architect"
            />

            <Typography variant="caption" color="dim" style={styles.subHeading}>
              WORK TYPES
            </Typography>
            <View style={styles.chipGrid}>
              {WORK_TYPES.map((type) => {
                const isSelected = form.work_type_preferences.includes(type);
                return (
                  <Chip
                    key={type}
                    label={type.toUpperCase()}
                    selected={isSelected}
                    onPress={() =>
                      toggleArrayItem("work_type_preferences", type)
                    }
                  />
                );
              })}
            </View>
          </Card>

          {/* 6. Geographic Preferences (Sweden & European Scope) */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <MapPin size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  GEOGRAPHIC TARGETS (SWEDEN / EU)
                </Typography>
              </View>
            </View>

            <Input
              label="Add City via GeoDB"
              value={cityQuery}
              onChangeText={setCityQuery}
              placeholder="Search Swedish or European city..."
              icon={<MapPin size={16} color={colors.text.dim} />}
            />

            {cityResults.length > 0 && (
              <View style={styles.autocompleteResults}>
                {cityResults.map((city) => (
                  <Pressable
                    key={city}
                    onPress={() => {
                      toggleArrayItem("target_cities", city);
                      setCityQuery("");
                      setCityResults([]);
                    }}
                    style={styles.autocompleteItem}
                  >
                    <Typography variant="bodySm" color="primary">
                      {city}
                    </Typography>
                  </Pressable>
                ))}
              </View>
            )}

            <Typography variant="caption" color="dim" style={styles.subHeading}>
              SELECTED CITIES:
            </Typography>
            <View style={styles.chipGrid}>
              {form.target_cities.map((city) => (
                <Chip
                  key={city}
                  label={city}
                  selected
                  onPress={() => toggleArrayItem("target_cities", city)}
                />
              ))}
              {PRESET_SWEDISH_CITIES.filter(
                (c) => !form.target_cities.includes(c),
              ).map((city) => (
                <Chip
                  key={city}
                  label={`+ ${city}`}
                  selected={false}
                  onPress={() => toggleArrayItem("target_cities", city)}
                />
              ))}
            </View>

            <Typography variant="caption" color="dim" style={styles.subHeading}>
              TARGET COUNTRIES:
            </Typography>
            <View style={styles.chipGrid}>
              {PRESET_COUNTRIES.map((country) => (
                <Chip
                  key={country}
                  label={country}
                  selected={form.target_countries.includes(country)}
                  onPress={() => toggleArrayItem("target_countries", country)}
                />
              ))}
            </View>
          </Card>

          {/* 7. Compensation & Languages */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Coins size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  COMPENSATION & SPOKEN LANGUAGES
                </Typography>
              </View>
            </View>

            <View style={styles.gridThreeCols}>
              <View style={styles.gridCol}>
                <Input
                  label="Min Salary / Month"
                  value={form.salary_min}
                  onChangeText={(t) => setForm({ ...form, salary_min: t })}
                  placeholder="55000"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gridCol}>
                <Input
                  label="Target Max"
                  value={form.salary_max}
                  onChangeText={(t) => setForm({ ...form, salary_max: t })}
                  placeholder="85000"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 100 }}>
                <Input
                  label="Currency"
                  value={form.salary_currency}
                  onChangeText={(t) => setForm({ ...form, salary_currency: t })}
                  placeholder="SEK"
                />
              </View>
            </View>

            <Typography variant="caption" color="dim" style={styles.subHeading}>
              LANGUAGES (COMMA-SEPARATED)
            </Typography>
            <Input
              label="Languages"
              value={form.languages.join(", ")}
              onChangeText={(t) =>
                setForm({
                  ...form,
                  languages: t
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="English, Swedish..."
            />
          </Card>

          {/* 8. AI Extracted Context (Read-Only CV Ingestion) */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Sparkles size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  INGESTED CV CONTEXT (AUTO-EXTRACTED)
                </Typography>
              </View>
              <Badge label="From Vault" variant="default" size="sm" />
            </View>

            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 8 }}
            >
              EXTRACTED TOP SKILLS
            </Typography>
            <View style={styles.chipGrid}>
              {userContext?.extracted_skills?.slice(0, 12).map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  selected={false}
                  onPress={() => {}}
                />
              ))}
              {(!userContext || !userContext.extracted_skills?.length) && (
                <Typography variant="caption" color="dim">
                  Upload your CV in the Vault tab to automatically index
                  technical skills.
                </Typography>
              )}
            </View>
          </Card>

          {/* Prominent Bottom Save Action Bar */}
          <View style={styles.bottomActionBar}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleSave}
              loading={saving}
              style={styles.fullWidthSaveBtn}
            >
              <Save size={18} color={colors.text.inverse} />
              {saved ? "Profile Changes Saved! ✓" : "Save Profile Changes"}
            </Button>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  headerSaveBtn: {
    flexDirection: "row",
    gap: 6,
  },
  saveAlertSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${colors.accent.green}18`,
    borderColor: `${colors.accent.green}44`,
    borderWidth: 1,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  saveAlertError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${colors.accent.red}18`,
    borderColor: `${colors.accent.red}44`,
    borderWidth: 1,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTag: {
    letterSpacing: 0.8,
  },
  identityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  identityItem: {
    flex: 1,
    minWidth: 240,
    gap: 6,
  },
  protectedValueBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  protectedNote: {
    fontStyle: "italic",
    marginTop: 4,
  },
  gridTwoCols: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  gridThreeCols: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  gridCol: {
    flex: 1,
    minWidth: 220,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent.cyan,
    backgroundColor: "transparent",
  },
  selectAllBtnActive: {
    backgroundColor: colors.accent.cyan,
    borderColor: colors.accent.cyan,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toneSelectorContainer: {
    marginBottom: 14,
  },
  toneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  toneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  toneBtnActive: {
    backgroundColor: `${colors.accent.cyan}22`,
    borderColor: colors.accent.cyan,
  },
  generateBioBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: "auto",
  },
  bioTextArea: {
    minHeight: 180,
    paddingTop: 14,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  subHeading: {
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  autocompleteResults: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: radius.md,
    marginTop: -8,
    marginBottom: 12,
    padding: 6,
  },
  autocompleteItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  bottomActionBar: {
    marginTop: 8,
    marginBottom: 24,
    width: "100%",
  },
  fullWidthSaveBtn: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
});
