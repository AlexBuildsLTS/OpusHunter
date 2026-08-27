/**
 * app/(tabs)/configure.tsx
 * OpusHunter — Master Configuration Engine
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  ActivityIndicator,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
} from "react-native-reanimated";
import {
  Zap,
  Tag,
  CheckCircle2,
  AlertCircle,
  Plus,
  MapPin,
  Briefcase,
  Globe,
  DollarSign,
  X,
  Check,
  Navigation,
  Sparkles,
  Edit3,
  Trash2,
} from "lucide-react-native";

import { supabase } from "../../lib/supabase";
import { useEdgeScraper } from "../../hooks/useEdgeScraper";
import { theme, C } from "../../lib/theme";

import {
  WORK_TYPE_OPTIONS,
  WORK_TYPE_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_COLORS,
} from "../../lib/jobPreferences";
import { GlassCard } from "../../components/ui/GlassCard";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { KeywordTagInput } from "../../components/ui/KeywordTagInput";
import { PageContainer } from "../../components/layout/PageContainer";
import { SetupWizard } from "../../components/onboarding/SetupWizard";
import { LocationAutocomplete } from "../../components/shared/LocationAutocomplete";

export interface AutomationRule {
  id: string;
  keywords: string[];
  location: string;
  work_types: string[];
  experience_levels: string[];
  remote_preference: string;
  salary_min: number | null;
  base_cover_letter: string;
  is_active: boolean | null;
  created_at: string;
  user_id?: string;
  latitude: number | null;
  longitude: number | null;
  max_distance_km: number | null;
}

export interface RuleFormState {
  keywords: string[];
  location: string;
  work_types: string[];
  experience_levels: string[];
  remote_preference: string;
  salary_min: number | null;
  base_cover_letter: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  max_distance_km: number | null;
}

export interface EngineConfig {
  locations: string[];
  workTypes: string[];
  experienceLevels: string[];
  remotePreference: string;
  jobBoards: string[];
  salaryMin: string;
  activeRulesOnly: boolean;
  autoApply: boolean;
  skipApplied: boolean;
}

const DEFAULT_FORM: RuleFormState = {
  keywords: [],
  location: "",
  work_types: ["FULLTIME"],
  experience_levels: [],
  remote_preference: "any",
  salary_min: null,
  base_cover_letter: "",
  is_active: true,
  latitude: null,
  longitude: null,
  max_distance_km: null,
};

const DEFAULT_ENGINE: EngineConfig = {
  locations: [],
  workTypes: ["FULLTIME"],
  experienceLevels: ["Mid", "Senior"],
  remotePreference: "any",
  jobBoards: ["jsearch", "linkedin"],
  salaryMin: "Any",
  activeRulesOnly: true,
  autoApply: false,
  skipApplied: true,
};

const REMOTE_OPTIONS = [
  { key: "remote", label: "Remote Only" },
  { key: "hybrid", label: "Hybrid" },
  { key: "onsite", label: "On-site" },
  { key: "any", label: "Any" },
];

const SALARY_STEPS: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "$50k+", value: 50000 },
  { label: "$75k+", value: 75000 },
  { label: "$100k+", value: 100000 },
  { label: "$125k+", value: 125000 },
  { label: "$150k+", value: 150000 },
  { label: "$200k+", value: 200000 },
];

const DISTANCE_STEPS: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
  { label: "200 km", value: 200 },
];

const JOB_BOARDS = [
  { key: "linkedin", label: "LinkedIn", color: "#0077B5" },
  { key: "indeed", label: "Indeed", color: "#003A9B" },
  { key: "glassdoor", label: "Glassdoor", color: "#0CAA41" },
  { key: "jsearch", label: "JSearch Edge", color: C.purple },
];

const ToggleChip = ({
  label,
  active,
  color = C.cyan,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) => (
  <AnimatedPressable
    onPress={onPress}
    scaleDownTo={0.94}
    style={[
      st.chip,
      active
        ? { borderColor: `${color}55`, backgroundColor: `${color}15` }
        : { borderColor: C.border, backgroundColor: "rgba(255,255,255,0.02)" },
    ]}
  >
    {active && <Check size={12} color={color} />}
    <Text style={[st.chipText, { color: active ? color : C.sub }]}>
      {label}
    </Text>
  </AnimatedPressable>
);

const SectionHeader = ({
  icon: Icon,
  title,
  sub,
}: {
  icon: any;
  title: string;
  sub?: string;
}) => (
  <View style={st.sectionHeader}>
    <View
      style={[
        st.sectionIconBox,
        { backgroundColor: `${C.cyan}10`, borderColor: `${C.cyan}20` },
      ]}
    >
      <Icon size={18} color={C.cyan} />
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={st.sectionTitle}>{title}</Text>
      {sub && <Text style={st.sectionSub}>{sub}</Text>}
    </View>
  </View>
);

const SectionCard = ({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) => (
  <Animated.View
    entering={FadeInDown.delay(delay).springify()}
    style={{ marginBottom: 20 }}
  >
    <GlassCard tint="frost" padding="lg" hoverable>
      {children}
    </GlassCard>
  </Animated.View>
);

function EngineTab({
  config,
  setConfig,
  onScrape,
  isScraping,
  activeRulesCount,
}: {
  config: EngineConfig;
  setConfig: (c: EngineConfig) => void;
  onScrape: () => void;
  isScraping: boolean;
  activeRulesCount: number;
}) {
  const toggle = (key: keyof EngineConfig, val: string) => {
    const arr = config[key] as string[];
    setConfig({
      ...config,
      [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={st.tabScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={FadeInDown.delay(60).springify()}
        style={{ marginBottom: 20 }}
      >
        <GlassCard tint="cyan" padding="lg" glow hoverable>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <View style={st.enginePulseIcon}>
                <Zap size={22} color={C.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.engineTitle}>Engine Ready</Text>
                <Text style={st.engineSub}>
                  {activeRulesCount > 0
                    ? `${activeRulesCount} active rule${activeRulesCount === 1 ? "" : "s"} · merging all sources`
                    : "Add at least one rule below to enable RUN"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onScrape}
              disabled={isScraping || activeRulesCount === 0}
              style={[
                st.runBtn,
                (isScraping || activeRulesCount === 0) && { opacity: 0.4 },
              ]}
              activeOpacity={0.8}
            >
              {isScraping ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={st.runBtnText}>RUN SCRAPE</Text>
              )}
            </TouchableOpacity>
          </View>
        </GlassCard>
      </Animated.View>

      <SectionCard delay={100}>
        <SectionHeader
          icon={MapPin}
          title="Search Locations"
          sub="Real cities, regions, or countries only — work mode is set separately below"
        />
        <LocationAutocomplete
          selected={config.locations}
          onChange={(locs: string[]) =>
            setConfig({ ...config, locations: locs })
          }
        />
      </SectionCard>

      <SectionCard delay={140}>
        <SectionHeader
          icon={Briefcase}
          title="Contract Structures"
          sub="Filter by employment agreement type"
        />
        <View style={st.chipGrid}>
          {WORK_TYPE_OPTIONS.map((wt: string) => (
            <ToggleChip
              key={wt}
              label={WORK_TYPE_LABELS[wt]}
              active={config.workTypes.includes(wt)}
              color={C.purple}
              onPress={() => toggle("workTypes", wt)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard delay={180}>
        <SectionHeader
          icon={Tag}
          title="Seniority Targets"
          sub="Multi-select — scraper searches all selected"
        />
        <View style={st.chipGrid}>
          {EXPERIENCE_LEVELS.map((lvl: string) => (
            <ToggleChip
              key={lvl}
              label={lvl}
              active={config.experienceLevels.includes(lvl)}
              color={EXPERIENCE_COLORS[lvl]}
              onPress={() => toggle("experienceLevels", lvl)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard delay={220}>
        <SectionHeader
          icon={Globe}
          title="Work Modality"
          sub="Remote, hybrid, or on-site — the ONLY place work arrangement is set"
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {REMOTE_OPTIONS.map(({ key, label }) => {
            const active = config.remotePreference === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setConfig({ ...config, remotePreference: key })}
                style={[
                  st.remoteBtn,
                  active
                    ? {
                        borderColor: `${C.cyan}50`,
                        backgroundColor: `${C.cyan}15`,
                      }
                    : {
                        borderColor: C.border,
                        backgroundColor: "rgba(255,255,255,0.04)",
                      },
                ]}
                activeOpacity={0.8}
              >
                {active && <View style={st.remoteDot} />}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? C.cyan : C.sub,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard delay={260}>
        <SectionHeader
          icon={DollarSign}
          title="Compensation Floor"
          sub="Bypass roles below financial threshold"
        />
        <View style={st.chipGrid}>
          {SALARY_STEPS.map(({ label, value }) => (
            <ToggleChip
              key={label}
              label={label}
              active={
                config.salaryMin === (value === null ? "Any" : String(value))
              }
              color={C.amber}
              onPress={() =>
                setConfig({
                  ...config,
                  salaryMin: value === null ? "Any" : String(value),
                })
              }
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard delay={300}>
        <SectionHeader
          icon={Globe}
          title="Intelligence Sources"
          sub="Active aggregators and board connections"
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {JOB_BOARDS.map((board) => {
            const active = config.jobBoards.includes(board.key);
            return (
              <TouchableOpacity
                key={board.key}
                onPress={() => toggle("jobBoards", board.key)}
                style={[
                  st.boardCard,
                  active
                    ? {
                        borderColor: `${board.color}60`,
                        backgroundColor: `${board.color}15`,
                      }
                    : {
                        borderColor: C.border,
                        backgroundColor: "rgba(255,255,255,0.03)",
                      },
                ]}
                activeOpacity={0.8}
              >
                {active && (
                  <View
                    style={[st.boardCheck, { backgroundColor: board.color }]}
                  >
                    <Check size={10} color="#FFF" strokeWidth={3} />
                  </View>
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: active ? board.color : C.sub,
                  }}
                >
                  {board.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text
          style={{ color: C.dim, fontSize: 10, marginTop: 10, lineHeight: 14 }}
        >
          Note: scrape-jobs currently queries JSearch, which itself aggregates
          LinkedIn, Indeed, and Glassdoor listings — these toggles reflect
          source coverage, not separate direct API integrations per board.
        </Text>
      </SectionCard>
    </ScrollView>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: AutomationRule;
  onEdit: (r: AutomationRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <Animated.View
      layout={Layout.springify().damping(20)}
      entering={FadeInDown.springify()}
      exiting={FadeOutUp.duration(200)}
      style={[
        st.ruleCard,
        {
          borderColor: rule.is_active ? `${C.cyan}30` : C.border,
          backgroundColor: rule.is_active
            ? "rgba(8,16,24,0.8)"
            : "rgba(8,16,24,0.4)",
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {rule.keywords.map((kw) => (
            <View key={kw} style={st.kwChip}>
              <Text style={st.kwChipText}>{kw}</Text>
            </View>
          ))}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {rule.location ? (
            <View style={st.ruleMetaBadge}>
              <MapPin size={10} color={C.purple} />
              <Text style={st.ruleMetaText}>{rule.location}</Text>
            </View>
          ) : null}
          <View style={st.ruleMetaBadge}>
            <Briefcase size={10} color={C.amber} />
            <Text style={st.ruleMetaText}>
              {rule.work_types
                .map((wt) => WORK_TYPE_LABELS[wt] ?? wt)
                .join(", ")}
            </Text>
          </View>
          {!!rule.experience_levels?.length && (
            <View style={st.ruleMetaBadge}>
              <Tag size={10} color={C.cyan} />
              <Text style={st.ruleMetaText}>
                {rule.experience_levels.join(", ")}
              </Text>
            </View>
          )}
          {rule.remote_preference && rule.remote_preference !== "any" && (
            <View style={st.ruleMetaBadge}>
              <Globe size={10} color={C.green} />
              <Text style={st.ruleMetaText}>{rule.remote_preference}</Text>
            </View>
          )}
          {!!rule.salary_min && (
            <View style={st.ruleMetaBadge}>
              <DollarSign size={10} color={C.green} />
              <Text style={st.ruleMetaText}>
                ${(rule.salary_min / 1000).toFixed(0)}k+
              </Text>
            </View>
          )}
          {!!rule.max_distance_km && (
            <View style={st.ruleMetaBadge}>
              <Navigation size={10} color={C.cyan} />
              <Text style={st.ruleMetaText}>
                {rule.max_distance_km}km radius
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Switch
          value={rule.is_active ?? false}
          onValueChange={(v) => onToggle(rule.id, v)}
          trackColor={{ false: "rgba(255,255,255,0.08)", true: `${C.cyan}50` }}
          thumbColor={rule.is_active ? C.cyan : "rgba(255,255,255,0.25)"}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity
          onPress={() => onEdit(rule)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Edit3 size={18} color={C.cyan} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(rule.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color={C.pink} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function RulesTab({
  rules,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: {
  rules: AutomationRule[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (r: AutomationRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 60,
        }}
      >
        <ActivityIndicator color={C.cyan} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={st.tabScroll}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{ color: C.dim, fontSize: 11, marginBottom: 14, lineHeight: 16 }}
      >
        Every rule with its toggle ON is used the next time you tap INITIALIZE —
        not just one at a time. Toggle any rule off to pause it without deleting
        it.
      </Text>
      {rules.map((rule, idx) => (
        <Animated.View
          key={rule.id}
          entering={FadeInDown.delay(idx * 50).springify()}
          style={{ marginBottom: 16 }}
        >
          <RuleCard
            rule={rule}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        </Animated.View>
      ))}
      <TouchableOpacity
        onPress={onAdd}
        style={st.addRuleBtn}
        activeOpacity={0.8}
      >
        <Plus size={18} color={C.cyan} />
        <Text
          style={{
            color: C.cyan,
            fontSize: 14,
            fontWeight: "800",
            marginLeft: 8,
          }}
        >
          ADD NEW RULE
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function RuleFormModal({
  visible,
  initial,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  initial: RuleFormState;
  onClose: () => void;
  onSave: (form: RuleFormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<RuleFormState>(initial);
  useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, initial]);

  const toggleWorkType = (wt: string) => {
    setForm((f) => ({
      ...f,
      work_types: f.work_types.includes(wt)
        ? f.work_types.filter((w) => w !== wt)
        : [...f.work_types, wt],
    }));
  };
  const toggleExperience = (lvl: string) => {
    setForm((f) => ({
      ...f,
      experience_levels: f.experience_levels.includes(lvl)
        ? f.experience_levels.filter((v) => v !== lvl)
        : [...f.experience_levels, lvl],
    }));
  };

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerateTemplate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-rule-template",
        {
          body: {
            keywords: form.keywords,
            location: form.location,
            work_types: form.work_types,
            experience_levels: form.experience_levels,
            remote_preference: form.remote_preference,
          },
        },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setForm((f) => ({ ...f, base_cover_letter: data.draft }));
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "Could not generate a draft.",
      );
    } finally {
      setGenerating(false);
    }
  }, [
    form.keywords,
    form.location,
    form.work_types,
    form.experience_levels,
    form.remote_preference,
  ]);

  const canSave =
    form.keywords.length > 0 &&
    (form.remote_preference === "remote" || form.location.trim().length > 0);

  const showDistancePicker = form.remote_preference !== "remote";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View style={st.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}
        >
          <View style={st.modalCard}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>
                {initial.keywords.length > 0 ? "Edit Rule" : "New Search Rule"}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={C.sub} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, gap: 18 }}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <Text style={st.fieldLabel}>
                  KEYWORDS{" "}
                  <Text style={st.fieldLabelSub}>(role titles and skills)</Text>
                </Text>
                <KeywordTagInput
                  value={form.keywords}
                  onChange={(tags: string[]) =>
                    setForm((f) => ({ ...f, keywords: tags }))
                  }
                />
              </View>

              <View>
                <Text style={st.fieldLabel}>WORK ARRANGEMENT</Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {REMOTE_OPTIONS.map(({ key, label }) => {
                    const active = form.remote_preference === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() =>
                          setForm((f) => ({ ...f, remote_preference: key }))
                        }
                        activeOpacity={0.8}
                        style={[
                          st.remoteBtn,
                          active
                            ? {
                                borderColor: `${C.cyan}50`,
                                backgroundColor: `${C.cyan}15`,
                              }
                            : {
                                borderColor: C.border,
                                backgroundColor: "rgba(255,255,255,0.04)",
                              },
                        ]}
                      >
                        {active && <View style={st.remoteDot} />}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: active ? C.cyan : C.sub,
                          }}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {form.remote_preference !== "remote" && (
                <View>
                  <Text style={st.fieldLabel}>LOCATIONS</Text>
                  <LocationAutocomplete
                    selected={
                      form.location
                        ? form.location
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : []
                    }
                    onChange={(locations: string[]) =>
                      setForm((f) => ({ ...f, location: locations.join(", ") }))
                    }
                    onPrimaryCoordsChange={(coords: any) =>
                      setForm((f) => ({
                        ...f,
                        latitude: coords?.latitude ?? null,
                        longitude: coords?.longitude ?? null,
                      }))
                    }
                  />
                  <Text style={st.fieldHint}>
                    Real cities or whole countries only — required since this
                    rule isn't Remote Only. The first location is the origin for
                    the commute-distance filter below.
                  </Text>
                </View>
              )}

              <View>
                <Text style={st.fieldLabel}>WORK TYPES</Text>
                <View style={[st.chipGrid, { marginTop: 6 }]}>
                  {WORK_TYPE_OPTIONS.map((wt: string) => (
                    <ToggleChip
                      key={wt}
                      label={WORK_TYPE_LABELS[wt]}
                      active={form.work_types.includes(wt)}
                      onPress={() => toggleWorkType(wt)}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={st.fieldLabel}>
                  EXPERIENCE LEVEL{" "}
                  <Text style={st.fieldLabelSub}>
                    (optional — leave empty for any)
                  </Text>
                </Text>
                <View style={[st.chipGrid, { marginTop: 6 }]}>
                  {EXPERIENCE_LEVELS.map((lvl: string) => (
                    <ToggleChip
                      key={lvl}
                      label={lvl}
                      active={form.experience_levels.includes(lvl)}
                      color={EXPERIENCE_COLORS[lvl]}
                      onPress={() => toggleExperience(lvl)}
                    />
                  ))}
                </View>
              </View>

              {showDistancePicker && (
                <View>
                  <Text style={st.fieldLabel}>
                    MAX COMMUTE DISTANCE{" "}
                    <Text style={st.fieldLabelSub}>(optional)</Text>
                  </Text>
                  <View style={[st.chipGrid, { marginTop: 6 }]}>
                    {DISTANCE_STEPS.map(({ label, value }) => (
                      <ToggleChip
                        key={label}
                        label={label}
                        active={form.max_distance_km === value}
                        onPress={() =>
                          setForm((f) => ({ ...f, max_distance_km: value }))
                        }
                      />
                    ))}
                  </View>
                  {form.max_distance_km != null && form.latitude == null && (
                    <Text style={[st.fieldHint, { color: C.amber }]}>
                      Pick your first location from the dropdown (not just
                      typed) so distance can actually be measured — otherwise
                      this limit won't filter anything.
                    </Text>
                  )}
                </View>
              )}

              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={st.fieldLabel}>
                    BASE COVER LETTER{" "}
                    <Text style={st.fieldLabelSub}>
                      ( BASED ON APPLICATION )
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={handleGenerateTemplate}
                    disabled={generating || form.keywords.length === 0}
                    style={[
                      st.generateBtn,
                      form.keywords.length === 0 && { opacity: 0.4 },
                    ]}
                  >
                    {generating ? (
                      <ActivityIndicator size="small" color={C.cyan} />
                    ) : (
                      <Sparkles size={12} color={C.cyan} />
                    )}
                    <Text
                      style={{ color: C.cyan, fontSize: 11, fontWeight: "800" }}
                    >
                      {generating ? "Generating…" : "Generate with AI"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {generateError && (
                  <Text
                    style={{ color: C.pink, fontSize: 11, marginBottom: 6 }}
                  >
                    {generateError}
                  </Text>
                )}
                <TextInput
                  style={[st.textInput, { minHeight: 130, paddingTop: 14 }]}
                  placeholder={
                    "Dear Hiring Manager,\n\nI am writing to express my interest in..."
                  }
                  placeholderTextColor={C.dim}
                  value={form.base_cover_letter}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, base_cover_letter: v }))
                  }
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoCorrect={false}
                  {...(Platform.OS === "web"
                    ? ({ outlineStyle: "none" } as any)
                    : {})}
                />
                <Text style={st.fieldHint}>
                  Use [COMPANY], [ROLE], [NAME] — Gemini replaces them
                  automatically.
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 4,
                }}
              >
                <View>
                  <Text style={st.fieldLabel}>ACTIVE</Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>
                    Scraper uses every rule with this ON, all at once
                  </Text>
                </View>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, is_active: v }))
                  }
                  trackColor={{
                    false: "rgba(255,255,255,0.08)",
                    true: `${C.cyan}50`,
                  }}
                  thumbColor={
                    form.is_active ? C.cyan : "rgba(255,255,255,0.25)"
                  }
                />
              </View>
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity
                onPress={() => onSave(form)}
                disabled={saving || !canSave}
                style={[st.saveBtn, (!canSave || saving) && { opacity: 0.45 }]}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={st.saveBtnText}>Save Rule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function ConfigureScreen() {
  const queryClient = useQueryClient();
  const { triggerScrape, isLoading: isScraping } = useEdgeScraper();
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"engine" | "rules">("engine");
  const [engineConfig, setEngineConfig] =
    useState<EngineConfig>(DEFAULT_ENGINE);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (scrapeSuccess)
      setBanner({
        type: "success",
        text: "Scrape complete — pipeline updated.",
      });
    if (scrapeError) setBanner({ type: "error", text: scrapeError });
  }, [scrapeSuccess, scrapeError]);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AutomationRule[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: RuleFormState) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      const payload = {
        user_id: user.id,
        keywords: form.keywords,
        location: form.location.trim(),
        work_types: form.work_types,
        experience_levels: form.experience_levels,
        remote_preference: form.remote_preference,
        salary_min: form.salary_min,
        base_cover_letter: form.base_cover_letter.trim(),
        is_active: form.is_active,
        latitude: form.latitude,
        longitude: form.longitude,
        max_distance_km: form.max_distance_km,
      };
      if (editingRule) {
        const { error } = await supabase
          .from("automation_rules")
          .update(payload as any)
          .eq("id", editingRule.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("automation_rules")
          .insert(payload as any);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] });
      setModalVisible(false);
      setEditingRule(null);
      setBanner({
        type: "success",
        text: editingRule ? "Rule updated." : "Rule created.",
      });
    },
    onError: (e: Error) => setBanner({ type: "error", text: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] });
      setDeleteConfirm(null);
      setBanner({ type: "success", text: "Rule deleted." });
    },
    onError: (e: Error) => setBanner({ type: "error", text: e.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("automation_rules")
        .update({ is_active: active } as any)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["automation_rules"] }),
  });

  const openCreate = useCallback(() => {
    setEditingRule(null);
    setModalVisible(true);
  }, []);
  const openEdit = useCallback((rule: AutomationRule) => {
    setEditingRule(rule);
    setModalVisible(true);
  }, []);

  const formInitial: RuleFormState = useMemo(
    () =>
      editingRule
        ? {
            keywords: editingRule.keywords,
            location: editingRule.location,
            work_types: editingRule.work_types,
            experience_levels: editingRule.experience_levels ?? [],
            remote_preference: editingRule.remote_preference ?? "any",
            salary_min: editingRule.salary_min,
            base_cover_letter: editingRule.base_cover_letter,
            is_active: editingRule.is_active ?? true,
            latitude: editingRule.latitude ?? null,
            longitude: editingRule.longitude ?? null,
            max_distance_km: editingRule.max_distance_km ?? null,
          }
        : DEFAULT_FORM,
    [editingRule],
  );

  const activeRulesCount = useMemo(
    () => rules.filter((r) => r.is_active).length,
    [rules],
  );

  if (!isLoading && rules.length === 0 && !modalVisible) {
    return (
      <PageContainer>
        <SetupWizard
          onComplete={() =>
            queryClient.invalidateQueries({ queryKey: ["automation_rules"] })
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={st.screenWrapper}>
        {banner && (
          <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOutUp.duration(200)}
            style={[
              st.banner,
              {
                borderColor:
                  banner.type === "success" ? `${C.cyan}40` : `${C.pink}40`,
                backgroundColor:
                  banner.type === "success" ? `${C.cyan}10` : `${C.pink}10`,
              },
            ]}
          >
            {banner.type === "success" ? (
              <CheckCircle2 size={16} color={C.cyan} />
            ) : (
              <AlertCircle size={16} color={C.pink} />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: banner.type === "success" ? C.cyan : C.pink,
                marginLeft: 10,
              }}
            >
              {banner.text}
            </Text>
          </Animated.View>
        )}

        <View style={st.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab("engine")}
            style={[
              st.tabBtn,
              activeTab === "engine" && {
                backgroundColor: `${C.cyan}15`,
                borderColor: `${C.cyan}40`,
              },
            ]}
            activeOpacity={0.7}
          >
            <Zap size={14} color={activeTab === "engine" ? C.cyan : C.sub} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: activeTab === "engine" ? C.cyan : C.sub,
                marginLeft: 6,
              }}
            >
              Engine Control
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("rules")}
            style={[
              st.tabBtn,
              activeTab === "rules" && {
                backgroundColor: `${C.cyan}15`,
                borderColor: `${C.cyan}40`,
              },
            ]}
            activeOpacity={0.7}
          >
            <Tag size={14} color={activeTab === "rules" ? C.cyan : C.sub} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: activeTab === "rules" ? C.cyan : C.sub,
                marginLeft: 6,
              }}
            >
              Search Rules ({rules.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {activeTab === "engine" ? (
            <EngineTab
              config={engineConfig}
              setConfig={setEngineConfig}
              onScrape={triggerScrape}
              isScraping={isScraping}
              activeRulesCount={activeRulesCount}
            />
          ) : (
            <RulesTab
              rules={rules}
              isLoading={isLoading}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={(id) => setDeleteConfirm(id)}
              onToggle={(id, active) => toggleMutation.mutate({ id, active })}
            />
          )}
        </View>

        <RuleFormModal
          visible={modalVisible}
          initial={formInitial}
          onClose={() => {
            setModalVisible(false);
            setEditingRule(null);
          }}
          onSave={(form) => saveMutation.mutate(form)}
          saving={saveMutation.isPending}
        />

        <Modal visible={!!deleteConfirm} transparent animationType="fade">
          <View style={st.modalOverlay}>
            <View style={st.confirmCard}>
              <Text style={st.confirmTitle}>Delete Rule?</Text>
              <Text style={st.confirmBody}>
                This cannot be undone. Jobs already scraped will remain.
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => setDeleteConfirm(null)}
                  style={[st.confirmBtn, { borderColor: C.border }]}
                >
                  <Text style={[st.confirmBtnText, { color: C.sub }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    deleteConfirm && deleteMutation.mutate(deleteConfirm)
                  }
                  disabled={deleteMutation.isPending}
                  style={[
                    st.confirmBtn,
                    {
                      borderColor: `${C.pink}50`,
                      backgroundColor: `${C.pink}12`,
                    },
                  ]}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator color={C.pink} size="small" />
                  ) : (
                    <Text style={[st.confirmBtnText, { color: C.pink }]}>
                      Delete
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </PageContainer>
  );
}

const st = StyleSheet.create({
  screenWrapper: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  tabBar: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    marginBottom: 20,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
    backgroundColor: C.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabScroll: {
    paddingTop: 8,
    paddingBottom: 120,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center" as any,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 0.5,
  },
  sectionSub: { fontSize: 11, color: C.sub, marginTop: 2, lineHeight: 16 },
  enginePulseIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${C.cyan}15`,
    borderWidth: 1,
    borderColor: `${C.cyan}40`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  engineTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: C.text,
    letterSpacing: 0.5,
  },
  engineSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  runBtn: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  runBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 2,
  },
  remoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  remoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cyan,
    marginRight: 10,
  },
  boardCard: {
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  boardCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ruleCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  kwChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${C.cyan}10`,
    borderWidth: 1,
    borderColor: `${C.cyan}25`,
  },
  kwChipText: { fontSize: 11, fontWeight: "700", color: C.cyan },
  ruleMetaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: C.border,
  },
  ruleMetaText: { fontSize: 11, fontWeight: "600", color: C.sub },
  addRuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: `${C.cyan}50`,
    backgroundColor: `${C.cyan}05`,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "rgba(8,16,24,0.97)",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: C.border },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: C.cyan,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldLabelSub: {
    color: C.sub,
    fontWeight: "500",
    textTransform: "none",
    letterSpacing: 0,
  },
  fieldHint: { fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 14 },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.text,
    fontSize: 14,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: `${C.cyan}14`,
    borderWidth: 1,
    borderColor: `${C.cyan}30`,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: C.cyan,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: "#000" },
  confirmCard: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "rgba(8,16,24,0.97)",
    borderWidth: 1,
    borderColor: `${C.pink}40`,
    borderRadius: 20,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  confirmBody: { fontSize: 14, color: C.sub, lineHeight: 20 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700" },
});
