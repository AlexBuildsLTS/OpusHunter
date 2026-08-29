import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Input } from "../../../../components/ui/Input";
import { Button } from "../../../../components/ui/Button";
import { Chip } from "../../../../components/ui/Chip";
import { useAuthStore } from "../../../../stores/authStore";
import { supabase } from "../../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { colors } from "../../../../constants/theme";
import { MapPin, Sparkles, Save } from "lucide-react-native";
import type { Database } from "../../../../types/database.types";

type UserContext = Database["public"]["Tables"]["user_context"]["Row"];
type WorkType = Database["public"]["Enums"]["work_type_enum"];
type SeniorityLevel = Database["public"]["Enums"]["seniority_level_enum"];

const WORK_TYPES: WorkType[] = ["remote", "hybrid", "onsite", "flexible"];
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

export default function ProfileScreen() {
  const { profile, setProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [form, setForm] = useState({
    professional_title: profile?.professional_title || "",
    bio: profile?.bio || "",
    years_experience: String(profile?.years_experience || ""),
    seniority_level: (profile?.seniority_level || "mid") as SeniorityLevel,
    target_roles: profile?.target_roles || [],
    work_type_preferences: (profile?.work_type_preferences || ["remote"]) as WorkType[],
    target_cities: profile?.target_cities || [],
    target_countries: profile?.target_countries || ["Sweden"],
    location_radius_km: profile?.location_radius_km || 50,
    salary_min: String(profile?.salary_min || ""),
    salary_max: String(profile?.salary_max || ""),
    salary_currency: profile?.salary_currency || "SEK",
    languages: profile?.languages || [],
  });

  // Fetch AI Context
  const { data: userContext } = useQuery({
    queryKey: ["user-context", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from("user_context")
        .select("*")
        .eq("user_id", profile.id)
        .single();
      return data as UserContext | null;
    },
  });

  // GeoDB Location Search (Sweden priority)
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<string[]>([]);

  useEffect(() => {
    const searchCities = async () => {
      if (cityQuery.length < 2) {
        setCityResults([]);
        return;
      }
      const { data } = await supabase.functions.invoke("geo-autocomplete", {
        body: { query: cityQuery, countryCode: "SE" },
      });
      if (data?.cities) {
        setCityResults(data.cities.map((c: any) => c.name));
      }
    };
    const timer = setTimeout(searchCities, 300);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        professional_title: form.professional_title,
        bio: form.bio,
        years_experience: parseInt(form.years_experience) || 0,
        seniority_level: form.seniority_level,
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

    if (!error) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      setProfile(newProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

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
      const current = prev[field];
      const exists = current.includes(value as never);
      return {
        ...prev,
        [field]: exists
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" color="primary">
          Profile
        </Typography>
        <Button
          variant="primary"
          size="sm"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        >
          <Save size={16} color={colors.text.inverse} />{" "}
          {saved ? "Saved!" : "Save"}
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Extracted Context (Read-Only) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color={colors.accent.cyan} />
            <Typography
              variant="caption"
              color="secondary"
              style={styles.sectionLabel}
            >
              AI EXTRACTED CONTEXT
            </Typography>
          </View>
          <Card style={styles.contextCard}>
            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 8 }}
            >
              SKILLS
            </Typography>
            <View style={styles.chipRow}>
              {userContext?.extracted_skills?.slice(0, 10).map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  selected={false}
                  onPress={() => {}}
                />
              ))}
              {(!userContext || userContext.extracted_skills?.length === 0) && (
                <Typography variant="caption" color="dim">
                  Upload a CV to auto-extract skills.
                </Typography>
              )}
            </View>
            <Typography
              variant="caption"
              color="dim"
              style={{ marginTop: 12, marginBottom: 8 }}
            >
              KEY ACHIEVEMENTS
            </Typography>
            {userContext?.key_achievements?.slice(0, 3).map((ach, i) => (
              <View key={i} style={styles.achievementRow}>
                <View style={styles.achievementDot} />
                <Typography
                  variant="bodySm"
                  color="secondary"
                  numberOfLines={2}
                >
                  {ach}
                </Typography>
              </View>
            ))}
          </Card>
        </View>

        {/* Professional Details */}
        <View style={styles.section}>
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            PROFESSIONAL DETAILS
          </Typography>
          <Input
            label="Professional Title"
            value={form.professional_title}
            onChangeText={(t) => setForm({ ...form, professional_title: t })}
            placeholder="Senior Developer"
          />
          <Input
            label="Years of Experience"
            value={form.years_experience}
            onChangeText={(t) => setForm({ ...form, years_experience: t })}
            placeholder="5"
            keyboardType="numeric"
          />
          <Typography
            variant="caption"
            color="secondary"
            style={styles.subLabel}
          >
            SENIORITY LEVEL
          </Typography>
          <View style={styles.chipRow}>
            {SENIORITY.map((level) => (
              <Chip
                key={level}
                label={level}
                selected={form.seniority_level === level}
                onPress={() => setForm({ ...form, seniority_level: level })}
              />
            ))}
          </View>
          <Input
            label="Bio"
            value={form.bio}
            onChangeText={(t) => setForm({ ...form, bio: t })}
            placeholder="Short professional summary..."
          />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            TARGET ROLES
          </Typography>
          <Input
            label="Target Roles (comma separated)"
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
            placeholder="Frontend, Backend..."
          />
          <Typography
            variant="caption"
            color="secondary"
            style={styles.subLabel}
          >
            WORK TYPES
          </Typography>
          <View style={styles.chipRow}>
            {WORK_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                selected={form.work_type_preferences.includes(type)}
                onPress={() => toggleArrayItem("work_type_preferences", type)}
              />
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            LOCATION
          </Typography>
          <Input
            label="Add City (Sweden Priority)"
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder="Search city..."
            icon={<MapPin size={18} color={colors.text.dim} />}
          />
          {cityResults.length > 0 && (
            <Card style={styles.suggestionCard}>
              {cityResults.map((city) => (
                <Pressable
                  key={city}
                  onPress={() => {
                    toggleArrayItem("target_cities", city);
                    setCityQuery("");
                    setCityResults([]);
                  }}
                  style={styles.suggestionItem}
                >
                  <Typography variant="bodySm" color="secondary">
                    {city}
                  </Typography>
                </Pressable>
              ))}
            </Card>
          )}
          <View style={styles.chipRow}>
            {form.target_cities.map((city) => (
              <Chip
                key={city}
                label={city}
                selected
                onPress={() => toggleArrayItem("target_cities", city)}
              />
            ))}
          </View>
          <Typography
            variant="caption"
            color="secondary"
            style={styles.subLabel}
          >
            COUNTRIES
          </Typography>
          <View style={styles.chipRow}>
            {[
              "Sweden",
              "Germany",
              "UK",
              "Netherlands",
              "Denmark",
              "Norway",
            ].map((country) => (
              <Chip
                key={country}
                label={country}
                selected={form.target_countries.includes(country)}
                onPress={() => toggleArrayItem("target_countries", country)}
              />
            ))}
          </View>
        </View>

        {/* Salary */}
        <View style={styles.section}>
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            SALARY EXPECTATIONS
          </Typography>
          <View style={styles.row}>
            <Input
              label="Min"
              value={form.salary_min}
              onChangeText={(t) => setForm({ ...form, salary_min: t })}
              placeholder="45000"
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
            <Input
              label="Max"
              value={form.salary_max}
              onChangeText={(t) => setForm({ ...form, salary_max: t })}
              placeholder="65000"
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
            <Input
              label="Currency"
              value={form.salary_currency}
              onChangeText={(t) => setForm({ ...form, salary_currency: t })}
              placeholder="SEK"
              style={{ width: 80 }}
            />
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  saveBtn: { flexDirection: "row", gap: 4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: { marginBottom: 8 },
  subLabel: { marginTop: 12, marginBottom: 8 },
  contextCard: { padding: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  achievementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  achievementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.cyan,
  },
  row: { flexDirection: "row", gap: 12 },
  suggestionCard: { marginTop: 8, padding: 8 },
  suggestionItem: { paddingVertical: 8, paddingHorizontal: 12 },
});
