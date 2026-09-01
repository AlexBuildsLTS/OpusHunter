/**
 * app/(tabs)/(dashboard)/rules.tsx
 * OpusHunter — Hunter Targeting & Scraping Rules
 *
 * Dedicated control room for job scraping targets:
 * - Target Roles & Keywords (with quick additions & tags)
 * - Geographic Scope (Sweden, EU, Cities, Radius)
 * - Work Types (Remote, Hybrid, On-site)
 * - Seniority Levels (Multi-select with Open to All toggle)
 * - Negative Keywords / Blacklist (excluders)
 * - Active Data Feeds (JSearch, Adzuna, LinkedIn)
 * - Auto-Scout trigger & Live Test Scrape
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  SlidersHorizontal,
  Target,
  MapPin,
  Briefcase,
  Layers,
  ShieldBan,
  Radio,
  Play,
  Save,
  Plus,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Globe2,
} from "lucide-react-native";
import { Card } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { useAuthStore } from "../../../stores/authStore";
import { supabase } from "../../../lib/supabase";
import { C } from "../../../lib/theme";

const POPULAR_ROLES = [
  "Frontend Engineer",
  "Fullstack Developer",
  "React Native Developer",
  "Backend Engineer",
  "TypeScript Architect",
  "Mobile Engineer",
  "DevOps Engineer",
  "Software Engineer",
];

const PRESET_CITIES = [
  "Stockholm",
  "Gothenburg",
  "Malmö",
  "Uppsala",
  "Berlin",
  "Amsterdam",
  "London",
  "Remote EU",
];

const WORK_TYPES = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

const SENIORITY_LEVELS = [
  { id: "junior", label: "Junior (0-2y)" },
  { id: "mid", label: "Mid-Level (2-5y)" },
  { id: "senior", label: "Senior (5-8y)" },
  { id: "lead", label: "Lead / Staff (8y+)" },
];

export default function ScrapingRulesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const { profile, user, refreshProfile } = useAuthStore();

  // Targeting state
  const [keywords, setKeywords] = useState<string[]>([
    "React Native",
    "TypeScript",
    "Fullstack",
  ]);
  const [newKeyword, setNewKeyword] = useState("");

  const [cities, setCities] = useState<string[]>(["Stockholm", "Gothenburg"]);
  const [newCity, setNewCity] = useState("");

  const [countries, setCountries] = useState<string[]>(["Sweden"]);
  const [radiusKm, setRadiusKm] = useState<number>(50);

  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([
    "remote",
    "hybrid",
  ]);

  const [selectedSeniority, setSelectedSeniority] = useState<string[]>([
    "mid",
    "senior",
  ]);

  const [negativeKeywords, setNegativeKeywords] = useState<string[]>([
    "Wordpress",
    "PHP",
    "Unpaid",
    "Sales",
  ]);
  const [newNegative, setNewNegative] = useState("");

  // Feed Sources
  const [enableJSearch, setEnableJSearch] = useState(true);
  const [enableAdzuna, setEnableAdzuna] = useState(true);
  const [enableLinkedIn, setEnableLinkedIn] = useState(true);
  const [datePosted, setDatePosted] = useState<string>("7d");
  const [autoScout, setAutoScout] = useState(true);

  // Status state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingScrape, setTestingScrape] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load from existing profile
  useEffect(() => {
    if (profile) {
      if (profile.target_roles && profile.target_roles.length > 0) {
        setKeywords(profile.target_roles);
      }
      if (profile.target_cities && profile.target_cities.length > 0) {
        setCities(profile.target_cities);
      }
      if (profile.target_countries && profile.target_countries.length > 0) {
        setCountries(profile.target_countries);
      }
      if (profile.location_radius_km) {
        setRadiusKm(profile.location_radius_km);
      }
      if (
        profile.work_type_preferences &&
        profile.work_type_preferences.length > 0
      ) {
        setSelectedWorkTypes(profile.work_type_preferences);
      }
      if (profile.seniority_level) {
        setSelectedSeniority([profile.seniority_level]);
      }
    }
  }, [profile]);

  // Keyword helpers
  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((item) => item !== kw));
  };

  // City helpers
  const handleAddCity = () => {
    const trimmed = newCity.trim();
    if (trimmed && !cities.includes(trimmed)) {
      setCities([...cities, trimmed]);
      setNewCity("");
    }
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter((item) => item !== city));
  };

  // Negative helpers
  const handleAddNegative = () => {
    const trimmed = newNegative.trim();
    if (trimmed && !negativeKeywords.includes(trimmed)) {
      setNegativeKeywords([...negativeKeywords, trimmed]);
      setNewNegative("");
    }
  };

  const handleRemoveNegative = (kw: string) => {
    setNegativeKeywords(negativeKeywords.filter((item) => item !== kw));
  };

  // Seniority helpers
  const toggleSeniority = (id: string) => {
    if (selectedSeniority.includes(id)) {
      setSelectedSeniority(selectedSeniority.filter((s) => s !== id));
    } else {
      setSelectedSeniority([...selectedSeniority, id]);
    }
  };

  const toggleAllSeniority = () => {
    if (selectedSeniority.length === SENIORITY_LEVELS.length) {
      setSelectedSeniority([]);
    } else {
      setSelectedSeniority(SENIORITY_LEVELS.map((s) => s.id));
    }
  };

  // Work Type helpers
  const toggleWorkType = (id: string) => {
    if (selectedWorkTypes.includes(id)) {
      setSelectedWorkTypes(selectedWorkTypes.filter((w) => w !== id));
    } else {
      setSelectedWorkTypes([...selectedWorkTypes, id]);
    }
  };

  // Save rules to Supabase profile
  const handleSaveRules = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const primarySeniority = selectedSeniority[0] || null;

      const { error } = await supabase
        .from("profiles")
        .update({
          target_roles: keywords,
          target_cities: cities,
          target_countries: countries,
          location_radius_km: radiusKm,
          work_type_preferences: selectedWorkTypes as any,
          seniority_level: primarySeniority as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Failed to save scraping rules:", err);
      setScrapeResult({
        success: false,
        message: err.message || "Failed to update rules in profile",
      });
    } finally {
      setSaving(false);
    }
  };

  // Run a test scrape
  const handleRunTestScrape = async () => {
    if (!user) return;
    setTestingScrape(true);
    setScrapeResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-jobs", {
        body: {
          userId: user.id,
          searchParams: {
            keywords,
            cities,
            countries,
            radiusKm,
            workTypes: selectedWorkTypes,
            datePosted,
            enableSources: {
              jsearch: enableJSearch,
              adzuna: enableAdzuna,
              linkedin: enableLinkedIn,
            },
          },
        },
      });

      if (error) throw error;

      const count = data?.scraped || data?.jobs?.length || data?.count || 0;
      setScrapeResult({
        success: true,
        message: `Scrape completed successfully! Discovered and analyzed ${count} jobs matching your criteria.`,
      });
    } catch (err: any) {
      console.error("Scrape test execution error:", err);
      setScrapeResult({
        success: false,
        message:
          err.message ||
          "Scraper call failed. Verify network or API key settings in Vault.",
      });
    } finally {
      setTestingScrape(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER ────────────────────────────────────────────── */}
      <View style={styles.headerArea}>
        <View style={styles.headerBadge}>
          <SlidersHorizontal size={14} color={C.cyan} />
          <Text style={styles.headerBadgeText}>HUNTER TARGETING RULES</Text>
        </View>
        <Text style={styles.title}>Scraping & Discovery Rules</Text>
        <Text style={styles.subtitle}>
          Define exact search criteria, geographic boundaries, seniority levels,
          and feed adapters so the automated Hunter engine knows exactly what
          opportunities to capture.
        </Text>
      </View>

      {/* ── STATUS BANNERS ──────────────────────────────────────── */}
      {saveSuccess && (
        <Animated.View entering={FadeIn} style={styles.successBanner}>
          <CheckCircle2 size={18} color="#10B981" />
          <Text style={styles.bannerText}>
            Targeting rules successfully updated and synced across all engines.
          </Text>
        </Animated.View>
      )}

      {scrapeResult && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.bannerCommon,
            scrapeResult.success ? styles.successBanner : styles.errorBanner,
          ]}
        >
          {scrapeResult.success ? (
            <CheckCircle2 size={18} color="#10B981" />
          ) : (
            <AlertCircle size={18} color="#EF4444" />
          )}
          <Text
            style={[
              styles.bannerText,
              { color: scrapeResult.success ? "#10B981" : "#EF4444" },
            ]}
          >
            {scrapeResult.message}
          </Text>
        </Animated.View>
      )}

      {/* ── GRID / SECTIONS ────────────────────────────────────── */}
      <View style={[styles.gridContainer, isDesktop && styles.gridDesktop]}>
        {/* CARD 1: TARGET ROLES & KEYWORDS */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.gridColumn}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Target size={20} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Target Roles & Keywords</Text>
                <Text style={styles.cardSub}>
                  Core job titles and technology stacks the scraper queries.
                </Text>
              </View>
            </View>

            {/* Chips */}
            <View style={styles.chipRow}>
              {keywords.map((kw) => (
                <View key={kw} style={styles.chip}>
                  <Text style={styles.chipText}>{kw}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveKeyword(kw)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={C.sub} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Input to add */}
            <View style={styles.inputActionRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rust, Cloud Architect, Next.js..."
                placeholderTextColor="#64748B"
                value={newKeyword}
                onChangeText={setNewKeyword}
                onSubmitEditing={handleAddKeyword}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddKeyword}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#050811" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Quick add suggestions */}
            <View style={styles.popularRow}>
              <Text style={styles.popularLabel}>Quick Add:</Text>
              <View style={styles.popularChips}>
                {POPULAR_ROLES.slice(0, 4).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={styles.quickAddChip}
                    onPress={() => {
                      if (!keywords.includes(role)) {
                        setKeywords([...keywords, role]);
                      }
                    }}
                  >
                    <Text style={styles.quickAddText}>+ {role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* CARD 2: GEOGRAPHIC SCOPE & RADIUS */}
        <Animated.View
          entering={FadeInDown.delay(150)}
          style={styles.gridColumn}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <MapPin size={20} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Geographic Scope & Cities</Text>
                <Text style={styles.cardSub}>
                  Specific metropolitan hubs, Sweden focus, and search radius.
                </Text>
              </View>
            </View>

            {/* Cities chips */}
            <View style={styles.chipRow}>
              {cities.map((city) => (
                <View key={city} style={styles.chip}>
                  <Text style={styles.chipText}>{city}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveCity(city)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={C.sub} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Add City Input */}
            <View style={styles.inputActionRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Add city or region..."
                placeholderTextColor="#64748B"
                value={newCity}
                onChangeText={setNewCity}
                onSubmitEditing={handleAddCity}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCity}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#050811" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Radius selector */}
            <View style={styles.radiusContainer}>
              <Text style={styles.sectionSmallLabel}>
                Commute / Search Radius:{" "}
                <Text style={{ color: C.cyan }}>{radiusKm} km</Text>
              </Text>
              <View style={styles.radiusButtonsRow}>
                {[25, 50, 100, 200].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRadiusKm(r)}
                    style={[
                      styles.radiusBtn,
                      radiusKm === r && styles.radiusBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusBtnText,
                        radiusKm === r && styles.radiusBtnTextActive,
                      ]}
                    >
                      {r} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* CARD 3: WORK TYPES & SENIORITY */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.gridColumn}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Briefcase size={20} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Work Types & Seniority</Text>
                <Text style={styles.cardSub}>
                  Select all workplace environments and experience levels you
                  qualify for.
                </Text>
              </View>
            </View>

            {/* Work Types */}
            <Text style={styles.sectionSmallLabel}>WORKPLACE MODEL</Text>
            <View style={styles.toggleRow}>
              {WORK_TYPES.map((wt) => {
                const active = selectedWorkTypes.includes(wt.id);
                return (
                  <TouchableOpacity
                    key={wt.id}
                    onPress={() => toggleWorkType(wt.id)}
                    style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                  >
                    {active && (
                      <Check
                        size={14}
                        color={C.cyan}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.toggleBtnText,
                        active && styles.toggleBtnTextActive,
                      ]}
                    >
                      {wt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seniority */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              <Text style={styles.sectionSmallLabel}>
                TARGET SENIORITY LEVELS
              </Text>
              <TouchableOpacity
                onPress={toggleAllSeniority}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={{ fontSize: 12, color: C.cyan, fontWeight: "600" }}
                >
                  {selectedSeniority.length === SENIORITY_LEVELS.length
                    ? "Clear All"
                    : "Select All / Open to Any"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.seniorityGrid}>
              {SENIORITY_LEVELS.map((level) => {
                const active = selectedSeniority.includes(level.id);
                return (
                  <TouchableOpacity
                    key={level.id}
                    onPress={() => toggleSeniority(level.id)}
                    style={[styles.levelCard, active && styles.levelCardActive]}
                  >
                    <View
                      style={[styles.checkbox, active && styles.checkboxActive]}
                    >
                      {active && <Check size={12} color="#050811" />}
                    </View>
                    <Text
                      style={[
                        styles.levelText,
                        active && styles.levelTextActive,
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* CARD 4: EXCLUSION BLACKLIST */}
        <Animated.View
          entering={FadeInDown.delay(250)}
          style={styles.gridColumn}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                ]}
              >
                <ShieldBan size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Negative Keywords & Blacklist
                </Text>
                <Text style={styles.cardSub}>
                  Immediately drops listings containing these words from your
                  feed.
                </Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              {negativeKeywords.map((kw) => (
                <View key={kw} style={[styles.chip, styles.chipNegative]}>
                  <Text style={[styles.chipText, { color: "#FCA5A5" }]}>
                    {kw}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveNegative(kw)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.inputActionRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sales, Cold Calling, Intern..."
                placeholderTextColor="#64748B"
                value={newNegative}
                onChangeText={setNewNegative}
                onSubmitEditing={handleAddNegative}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: "#EF4444" }]}
                onPress={handleAddNegative}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={[styles.addButtonText, { color: "#FFFFFF" }]}>
                  Drop
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>

        {/* CARD 5: ACTIVE SCRAPING FEEDS & ADAPTERS */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.gridColumn}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Radio size={20} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Feed Adapters & Sources</Text>
                <Text style={styles.cardSub}>
                  Configure which search sources the OpusHunter engine scrapes
                  from.
                </Text>
              </View>
            </View>

            {/* JSearch */}
            <View style={styles.feedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedTitle}>
                  JSearch Engine (Google / RapidAPI)
                </Text>
                <Text style={styles.feedDesc}>
                  Deep search aggregator covering LinkedIn, Indeed, Glassdoor &
                  company portals.
                </Text>
              </View>
              <Switch
                value={enableJSearch}
                onValueChange={setEnableJSearch}
                trackColor={{ false: "#1E293B", true: C.cyan }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Adzuna */}
            <View style={styles.feedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedTitle}>Adzuna EU Engine</Text>
                <Text style={styles.feedDesc}>
                  Direct European and Nordic job feed with salary prediction
                  index.
                </Text>
              </View>
              <Switch
                value={enableAdzuna}
                onValueChange={setEnableAdzuna}
                trackColor={{ false: "#1E293B", true: C.cyan }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* LinkedIn RapidAPI */}
            <View style={styles.feedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedTitle}>LinkedIn Live Crawler</Text>
                <Text style={styles.feedDesc}>
                  Live posted opportunities from corporate LinkedIn profiles
                  across Sweden & Europe.
                </Text>
              </View>
              <Switch
                value={enableLinkedIn}
                onValueChange={setEnableLinkedIn}
                trackColor={{ false: "#1E293B", true: C.cyan }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Date Posted window */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionSmallLabel}>
                LISTING RECENCY WINDOW
              </Text>
              <View style={styles.radiusButtonsRow}>
                {[
                  { id: "24h", label: "Past 24h" },
                  { id: "3d", label: "Past 3 Days" },
                  { id: "7d", label: "Past Week" },
                  { id: "all", label: "All Active" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setDatePosted(item.id)}
                    style={[
                      styles.radiusBtn,
                      datePosted === item.id && styles.radiusBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusBtnText,
                        datePosted === item.id && styles.radiusBtnTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* CARD 6: AUTOMATION & TEST EXECUTION */}
        <Animated.View
          entering={FadeInDown.delay(350)}
          style={styles.gridColumn}
        >
          <Card style={[styles.card, { borderColor: `${C.cyan}44` }]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Sparkles size={20} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Automated Scout & Live Test
                </Text>
                <Text style={styles.cardSub}>
                  Test your rules right now against live job networks.
                </Text>
              </View>
            </View>

            <View style={styles.feedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedTitle}>Background Auto-Scout</Text>
                <Text style={styles.feedDesc}>
                  Runs periodic scraping and alerts you when high-score matches
                  drop.
                </Text>
              </View>
              <Switch
                value={autoScout}
                onValueChange={setAutoScout}
                trackColor={{ false: "#1E293B", true: C.cyan }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.actionCardButtons}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleRunTestScrape}
                disabled={testingScrape}
                activeOpacity={0.8}
              >
                {testingScrape ? (
                  <ActivityIndicator size="small" color="#050811" />
                ) : (
                  <>
                    <Play size={16} color="#050811" />
                    <Text style={styles.testButtonText}>
                      Run Immediate Test Scrape
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>
      </View>

      {/* ── FLOATING / BOTTOM SAVE BAR ────────────────────────── */}
      <View style={styles.bottomSaveBar}>
        <View style={styles.bottomSaveInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saveBarTitle}>Ready to apply rules?</Text>
            <Text style={styles.saveBarDesc}>
              Changes will update your targeting profile and feed filters
              immediately.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primarySaveButton}
            onPress={handleSaveRules}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#050811" />
            ) : (
              <>
                <Save size={18} color="#050811" />
                <Text style={styles.primarySaveText}>Save Targeting Rules</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
  },
  headerArea: {
    marginBottom: 24,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.cyan,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: C.sub,
    lineHeight: 20,
    maxWidth: 760,
  },
  bannerCommon: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: 16,
    gap: 12,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 40,
  },
  gridDesktop: {
    marginHorizontal: -8,
  },
  gridColumn: {
    width: "100%",
    minWidth: 320,
    flexGrow: 1,
    flexBasis: "48%",
  },
  card: {
    padding: 20,
    backgroundColor: "rgba(11, 17, 33, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: C.sub,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
    minHeight: 34,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  chipNegative: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.cyan,
  },
  inputActionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cyan,
    borderRadius: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#050811",
  },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  popularLabel: {
    fontSize: 12,
    color: C.sub,
    fontWeight: "500",
  },
  popularChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  quickAddChip: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  quickAddText: {
    fontSize: 11,
    color: C.sub,
  },
  sectionSmallLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.sub,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  radiusContainer: {
    marginTop: 10,
  },
  radiusButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    alignItems: "center",
  },
  radiusBtnActive: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderColor: C.cyan,
  },
  radiusBtnText: {
    fontSize: 12,
    color: C.sub,
    fontWeight: "600",
  },
  radiusBtnTextActive: {
    color: C.cyan,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderColor: C.cyan,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.sub,
  },
  toggleBtnTextActive: {
    color: C.cyan,
  },
  seniorityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  levelCard: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    gap: 10,
  },
  levelCardActive: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderColor: C.cyan,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: C.cyan,
    borderColor: C.cyan,
  },
  levelText: {
    fontSize: 12,
    color: C.sub,
    fontWeight: "500",
  },
  levelTextActive: {
    color: C.text,
    fontWeight: "600",
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    gap: 12,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 2,
  },
  feedDesc: {
    fontSize: 11,
    color: C.sub,
    lineHeight: 15,
  },
  actionCardButtons: {
    marginTop: 18,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cyan,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#050811",
  },
  bottomSaveBar: {
    marginTop: 8,
    marginBottom: 40,
    backgroundColor: "rgba(11, 17, 33, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    borderRadius: 16,
    padding: 16,
  },
  bottomSaveInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  saveBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  saveBarDesc: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
  },
  primarySaveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cyan,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    gap: 8,
  },
  primarySaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#050811",
  },
});
