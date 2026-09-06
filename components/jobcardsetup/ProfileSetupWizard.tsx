/**
 * components/jobcardsetup/ProfileSetupWizard.tsx
 * OpusHunter — 5-Step Visual Profile & Hunter Setup Wizard.
 * High-production glassmorphic cards, step badges, pro tips, real Supabase integration,
 * document uploader (CV & Certs), and AI Bio Generator.
 * Reusable in standalone onboarding (profile-setup) and dashboard (rules tab).
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Platform,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown, FadeIn, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { colors, radius } from "../../constants/theme";
import { C } from "../../constants/theme";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  FileText,
  Award,
  AlertCircle,
  Briefcase,
  Target,
  Radar,
  Lightbulb,
  ShieldCheck,
  Zap,
  Globe2,
  MapPin,
  Trash2,
  DollarSign,
  TrendingUp,
} from "lucide-react-native";
import type { Database } from "../../types/database.types";

type SeniorityLevel = Database["public"]["Enums"]["seniority_level_enum"];
type WorkType = Database["public"]["Enums"]["work_type_enum"];

const MAX_DOCUMENTS = 6;

const SENIORITY: { id: SeniorityLevel; label: string; desc: string }[] = [
  { id: "junior", label: "Junior", desc: "0 - 2 years hands-on" },
  { id: "mid", label: "Mid-Level", desc: "2 - 5 years proven" },
  { id: "senior", label: "Senior", desc: "5 - 8 years expertise" },
  { id: "lead", label: "Lead / Staff", desc: "8+ years architecture" },
  { id: "principal", label: "Principal", desc: "Org-wide technical lead" },
  { id: "director", label: "Director", desc: "Engineering leadership" },
  { id: "vp", label: "VP", desc: "Executive leadership" },
  { id: "c_level", label: "C-Level", desc: "CTO / Executive strategy" },
];

const WORK_TYPES: { id: WorkType; label: string; icon: string }[] = [
  { id: "remote", label: "Remote", icon: "🌐" },
  { id: "hybrid", label: "Hybrid", icon: "🏢" },
  { id: "onsite", label: "On-site", icon: "📍" },
  { id: "flexible", label: "Flexible", icon: "⚡" },
];

const RADIUS_OPTIONS = [25, 50, 75, 100, 200];

const SUGGESTED_ROLES = [
  "Java Fullstack Developer",
  "Backend Engineer",
  "React Native Architect",
  "Fullstack Engineer",
  "Frontend Developer",
  "DevOps Engineer",
  "TypeScript Specialist",
  "Cloud Solutions Architect",
];

const SUGGESTED_SKILLS = [
  "Java",
  "Spring Boot",
  "React",
  "React Native",
  "TypeScript",
  "PostgreSQL",
  "Docker",
  "AWS",
  "Kubernetes",
  "Node.js",
  "Python",
  "GraphQL",
  "REST APIs",
  "Microservices",
  "Tailwind CSS",
  "Git",
];

const SUGGESTED_LANGUAGES = [
  "English",
  "Swedish",
  "German",
  "Spanish",
  "French",
  "Danish",
  "Norwegian",
];

const SUGGESTED_CITIES = [
  "Stockholm",
  "Gothenburg",
  "Malmö",
  "Uppsala",
  "Lund",
  "Linköping",
  "Berlin",
  "Amsterdam",
  "London",
];

const SUGGESTED_COUNTRIES = [
  "Sweden",
  "Norway",
  "Denmark",
  "Germany",
  "United Kingdom",
  "Netherlands",
];

interface ProfileSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  initialStep?: number;
  isEmbedded?: boolean;
}

export function ProfileSetupWizard({
  onComplete,
  onCancel,
  initialStep = 0,
  isEmbedded = false,
}: ProfileSetupWizardProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user, profile, refreshProfile } = useAuthStore();

  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    application_email: profile?.application_email || profile?.email || user?.email || "",
    phone: profile?.phone || "",
    linkedin_url: profile?.linkedin_url || "",
    professional_title: profile?.professional_title || "",
    target_roles: profile?.target_roles || ([] as string[]),
    skills: [] as string[],
    education: "",
    education_degree: "",
    github_url: "",
    portfolio_url: "",
    bio: profile?.bio || "",
    years_experience: String(profile?.years_experience || "0"),
    seniority_level: (profile?.seniority_level || "mid") as SeniorityLevel,
    languages: profile?.languages || ["English"],
    work_type_preferences: (profile?.work_type_preferences || [
      "remote",
      "hybrid",
    ]) as WorkType[],
    target_cities: profile?.target_cities || (["Stockholm"] as string[]),
    target_countries: profile?.target_countries || (["Sweden"] as string[]),
    location_radius_km: profile?.location_radius_km || 50,
    salary_min: profile?.salary_min ? String(profile.salary_min) : "",
    salary_max: profile?.salary_max ? String(profile.salary_max) : "",
    salary_currency: profile?.salary_currency || "SEK",
    max_daily_applications: profile?.max_daily_applications || 30,
  });

  // Tag Inputs
  const [newRoleInput, setNewRoleInput] = useState("");
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newLangInput, setNewLangInput] = useState("");
  const [newCityInput, setNewCityInput] = useState("");
  const [newCountryInput, setNewCountryInput] = useState("");

  // Bio generation state
  const [bioTone, setBioTone] = useState<"executive" | "technical" | "modern">(
    "technical",
  );
  const [generatingBio, setGeneratingBio] = useState(false);

  // Documents state (CVs and Certifications)
  const [resumes, setResumes] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const totalSteps = 5;

  // Load existing user context & documents
  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: context } = await supabase
        .from("user_context")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (context) {
        setFormData((prev) => ({
          ...prev,
          phone: profile?.phone || prev.phone,
          application_email:
            profile?.application_email || profile?.email || user.email || prev.application_email,
          skills: context.extracted_skills?.length
            ? context.extracted_skills
            : prev.skills,
          bio: prev.bio || context.career_summary || "",
          education:
            Array.isArray(context.extracted_education) &&
            context.extracted_education.length > 0
              ? (context.extracted_education[0] as any)?.institution ||
                (context.extracted_education[0] as any)?.degree ||
                ""
              : prev.education,
          github_url:
            (context.skill_clusters as any)?.github_url || prev.github_url,
          portfolio_url:
            (context.skill_clusters as any)?.portfolio_url ||
            prev.portfolio_url,
        }));
      }

      const { data: resumeList } = await supabase
        .from("resume_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });
      if (resumeList) setResumes(resumeList);

      const { data: certList } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });
      if (certList) setCerts(certList);
    } catch (e) {
      console.warn("Error loading user context / documents:", e);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Sync profile props if updated — but ONLY the first time profile data
  // arrives, not on every reference change.
  //
  // ROOT CAUSE of "leave the tab, come back, everything's gone": Supabase's
  // client auto-refreshes the session when a browser tab regains focus. In
  // stores/authStore.ts, EVERY onAuthStateChange event (including that
  // routine focus-triggered refresh — not just real sign-ins) re-fetches
  // the profiles row and calls set({ profile }) with a brand-new object,
  // even when nothing changed server-side. This effect was keyed on
  // [profile], so each of those silent background refreshes re-ran it and
  // force-overwrote target_roles/target_cities/salary/etc. with whatever
  // was already saved in the DB — discarding anything typed but not yet
  // submitted. hasHydratedRef makes this run once, on first real profile
  // load, instead of every time the object reference changes.
  const hasHydratedFromProfileRef = useRef(false);

  useEffect(() => {
    if (profile && !hasHydratedFromProfileRef.current) {
      hasHydratedFromProfileRef.current = true;
      setFormData((prev) => ({
        ...prev,
        first_name: profile.first_name || prev.first_name,
        last_name: profile.last_name || prev.last_name,
        phone: profile.phone || prev.phone,
        application_email:
          profile.application_email || profile.email || user?.email || prev.application_email,
        linkedin_url: profile.linkedin_url || prev.linkedin_url,
        professional_title:
          profile.professional_title || prev.professional_title,
        target_roles:
          profile.target_roles?.length > 0
            ? profile.target_roles
            : prev.target_roles,
        seniority_level: profile.seniority_level || prev.seniority_level,
        target_cities:
          profile.target_cities?.length > 0
            ? profile.target_cities
            : prev.target_cities,
        target_countries:
          profile.target_countries?.length > 0
            ? profile.target_countries
            : prev.target_countries,
        location_radius_km:
          profile.location_radius_km || prev.location_radius_km,
        work_type_preferences: (profile.work_type_preferences?.length > 0
          ? profile.work_type_preferences
          : prev.work_type_preferences) as WorkType[],
        salary_min: profile.salary_min
          ? String(profile.salary_min)
          : prev.salary_min,
        salary_max: profile.salary_max
          ? String(profile.salary_max)
          : prev.salary_max,
        salary_currency: profile.salary_currency || prev.salary_currency,
        max_daily_applications:
          profile.max_daily_applications || prev.max_daily_applications,
      }));
    }
  }, [profile]);

  // Document upload handler (CV or Certification)
  const handleUploadDocument = async (type: "cv" | "certification") => {
    if (!user) return;
    const currentCount = resumes.length + certs.length;
    if (currentCount >= MAX_DOCUMENTS) {
      setError(
        `Maximum ${MAX_DOCUMENTS} documents reached. Please remove a file to upload another.`,
      );
      return;
    }

    setError(null);
    setUploadStatus(null);
    setUploadingDoc(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          type === "cv"
            ? [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]
            : ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploadingDoc(false);
        return;
      }

      const asset = result.assets[0];
      setUploadStatus(`Uploading ${asset.name}...`);

      const sanitizedName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const bucket = type === "cv" ? "resumes" : "certifications";
      const table = type === "cv" ? "resume_documents" : "certifications";
      const path = `${user.id}/${Date.now()}-${sanitizedName}`;

      const fileResponse = await fetch(asset.uri);
      const fileBlob = await fileResponse.blob();

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, fileBlob, {
          contentType: asset.mimeType || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const baseInsert = {
        user_id: user.id,
        storage_path: path,
        file_name: asset.name,
        file_type: asset.mimeType || "application/octet-stream",
        file_size_kb: Math.round((asset.size || 0) / 1024),
      };

      const { error: dbError } = await supabase.from(table).insert(
        type === "cv"
          ? ({
              ...baseInsert,
              is_primary: resumes.length === 0,
              extraction_status: "pending",
            } as any)
          : baseInsert,
      );

      if (dbError) throw dbError;

      if (type === "cv") {
        setUploadStatus("Extracting skills & context with AI...");
        try {
          await supabase.functions.invoke("extract-context", {
            body: { userId: user.id, documentPath: path, bucket: "resumes" },
          });
        } catch (extErr) {
          console.warn("AI extraction invocation error:", extErr);
        }
      }

      await loadUserData();
      setUploadStatus(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Document delete handler
  const handleDeleteDocument = async (
    type: "cv" | "certification",
    id: string,
    storagePath: string,
  ) => {
    if (!user) return;
    setError(null);
    try {
      const bucket = type === "cv" ? "resumes" : "certifications";
      const table = type === "cv" ? "resume_documents" : "certifications";

      await supabase.storage.from(bucket).remove([storagePath]);
      await supabase.from(table).delete().eq("id", id);
      await loadUserData();
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    }
  };

  // AI Bio Generator
  const handleGenerateBio = async () => {
    if (!user) return;
    setGeneratingBio(true);
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      const title = formData.professional_title.trim();
      if (!title) {
        throw new Error("Add a professional title before generating a bio.");
      }
      const years = formData.years_experience;
      const skillsList = formData.skills;
      const rolesList = formData.target_roles;

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
            target_roles: rolesList,
            skills: skillsList,
            education: formData.education,
          },
        },
      );

      if (error) throw error;
      if (data?.bio) {
        setFormData((prev) => ({ ...prev, bio: data.bio }));
      } else {
        throw new Error("No bio returned from AI model");
      }
    } catch (err: any) {
      console.warn("AI bio generation failed in wizard:", err);
      setError(err.message || "Failed to generate bio with AI");
    } finally {
      setGeneratingBio(false);
    }
  };

  // Step Validation & Navigation
  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 0) {
      if (!formData.first_name.trim()) {
        setError("First name is required.");
        return false;
      }
      if (!formData.last_name.trim()) {
        setError("Last name is required.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.application_email.trim())) {
        setError("Enter a valid application email address.");
        return false;
      }
      if (!formData.professional_title.trim()) {
        setError(
          "Primary target job title is required (e.g. Java Fullstack Developer).",
        );
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;

    if (step < totalSteps - 1) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    setError(null);
    if (step > 0) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (loading) return;
    if (!user) {
      setError("No session found. Please sign in again.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          application_email: formData.application_email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          linkedin_url: formData.linkedin_url.trim() || null,
          github_url: formData.github_url.trim() || null,
          portfolio_url: formData.portfolio_url.trim() || null,
          professional_title: formData.professional_title.trim(),
          bio: formData.bio.trim() || null,
          years_experience: parseInt(formData.years_experience) || 0,
          seniority_level: formData.seniority_level as any,
          target_roles: formData.target_roles,
          languages: formData.languages,
          work_type_preferences: formData.work_type_preferences as any,
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
          max_daily_applications: formData.max_daily_applications,
          profile_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Upsert user_context with rich skills, diploma, and portfolio links
      const educationPayload = formData.education.trim()
        ? [
            {
              institution: formData.education.trim(),
              degree:
                formData.education_degree.trim() ||
                formData.professional_title.trim(),
              year: new Date().getFullYear(),
            },
          ]
        : [];

      const { error: contextError } = await supabase
        .from("user_context")
        .upsert(
          {
            user_id: user.id,
            extracted_skills: formData.skills,
            extracted_education: educationPayload,
            career_summary: formData.bio.trim() || null,
            skill_clusters: {
              github_url: formData.github_url.trim() || null,
              portfolio_url: formData.portfolio_url.trim() || null,
            },
            tone_preference: bioTone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (contextError) {
        console.warn("user_context upsert warning:", contextError);
      }

      await refreshProfile();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  // Array manipulation helpers
  const addTag = (
    field:
      | "target_roles"
      | "skills"
      | "languages"
      | "target_cities"
      | "target_countries",
    value: string,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!formData[field].includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], trimmed],
      }));
    }
  };

  const removeTag = (
    field:
      | "target_roles"
      | "skills"
      | "languages"
      | "target_cities"
      | "target_countries",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
  };

  const toggleWorkType = (val: WorkType) => {
    setFormData((prev) => {
      const exists = prev.work_type_preferences.includes(val);
      return {
        ...prev,
        work_type_preferences: exists
          ? prev.work_type_preferences.filter((x) => x !== val)
          : [...prev.work_type_preferences, val],
      };
    });
  };

  // Step 0: Target Career & Core Identity
  const renderStep0 = () => {
    const totalDocs = resumes.length + certs.length;

    return (
      <View style={styles.stepCardContainer}>
        {/* Step Header Badge */}
        <View style={styles.stepBadgeRow}>
          <View style={styles.stepBadge}>
            <Radar size={13} color={colors.accent.cyan} />
            <Text style={styles.stepBadgeText}>
              STEP 01 • TARGET IDENTITY & STACK
            </Text>
          </View>
        </View>

        <Text style={styles.stepTitle}>Core Identity & Career Radar</Text>
        <Text style={styles.stepSubtitle}>
          Define your target title, core technical stack, education, and links.
          Our autonomous scraper tunes its queries directly from these
          parameters.
        </Text>

        {/* Pro Tip Box */}
        <View style={styles.proTipBox}>
          <View style={styles.proTipHeader}>
            <Lightbulb size={14} color={colors.accent.cyan} />
            <Text style={styles.proTipTag}>RADAR PRO TIP</Text>
          </View>
          <Text style={styles.proTipText}>
            Setting exact skills (e.g., Spring Boot, React Native) and target
            roles produces 3x higher ATS match relevance on auto-scrapes.
          </Text>
        </View>

        {/* FULL NAME */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>FULL NAME</Text>
          <View style={styles.badgeRequired}>
            <Text style={styles.badgeRequiredText}>REQUIRED</Text>
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={styles.fieldColumn}>
            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              style={styles.input}
              value={formData.first_name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, first_name: text }))
              }
              placeholder="e.g., Alex"
              placeholderTextColor={C.dim}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldColumn}>
            <Text style={styles.label}>LAST NAME</Text>
            <TextInput
              style={styles.input}
              value={formData.last_name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, last_name: text }))
              }
              placeholder="e.g., Lindqvist"
              placeholderTextColor={C.dim}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>APPLICATION CONTACT DETAILS</Text>
          <View style={styles.badgeOptional}>
            <Text style={styles.badgeOptionalText}>REVIEW BEFORE SENDING</Text>
          </View>
        </View>
        <Text style={styles.fieldHint}>
          These are the details included in applications. Your login email is
          shown from your authenticated account and cannot be accidentally
          replaced by an AI-generated placeholder.
        </Text>
        <View style={styles.contactCard}>
          <View style={styles.contactEmailRow}>
            <Text style={styles.contactLabel}>APPLICATION EMAIL</Text>
            <Text style={styles.contactEmail} numberOfLines={1}>
              Candidate-controlled
            </Text>
          </View>
          <TextInput
            style={styles.input}
            value={formData.application_email}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, application_email: text }))
            }
            placeholder="name@domain.com"
            placeholderTextColor={C.dim}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.fieldColumn}>
            <Text style={styles.label}>PHONE NUMBER (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, phone: text }))
              }
              placeholder="+46 70 123 45 67"
              placeholderTextColor={C.dim}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* TARGET JOB TITLE */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>PRIMARY TARGET JOB TITLE</Text>
          <View style={styles.badgeRequired}>
            <Text style={styles.badgeRequiredText}>REQUIRED</Text>
          </View>
        </View>
        <Text style={styles.fieldHint}>
          The anchor title for your active search card (e.g. Java Fullstack
          Developer).
        </Text>
        <TextInput
          style={styles.input}
          value={formData.professional_title}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, professional_title: text }))
          }
          placeholder="e.g., Java Fullstack Developer"
          placeholderTextColor={C.dim}
        />

        {/* TARGET ROLES & ALTERNATES */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>ALTERNATE TARGET TITLES</Text>
          <View style={styles.badgeOptional}>
            <Text style={styles.badgeOptionalText}>RECOMMENDED</Text>
          </View>
        </View>
        <Text style={styles.fieldHint}>
          Add multiple related roles you want the Hunter engine to sweep.
        </Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newRoleInput}
            onChangeText={setNewRoleInput}
            onSubmitEditing={() => {
              addTag("target_roles", newRoleInput);
              setNewRoleInput("");
            }}
            placeholder="Type role & press Add..."
            placeholderTextColor={C.dim}
          />
          <TouchableOpacity
            style={styles.addTagButton}
            onPress={() => {
              addTag("target_roles", newRoleInput);
              setNewRoleInput("");
            }}
            activeOpacity={0.8}
          >
            <Plus size={18} color={C.cyan} />
          </TouchableOpacity>
        </View>

        {/* Target roles list */}
        {formData.target_roles.length > 0 && (
          <View style={styles.chipContainer}>
            {formData.target_roles.map((role) => (
              <View key={role} style={styles.tagChip}>
                <Briefcase
                  size={12}
                  color={C.cyan}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.tagChipText}>{role}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => removeTag("target_roles", role)}
                  style={{ marginLeft: 6 }}
                >
                  <X size={14} color={C.sub} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Suggestions */}
        <View style={styles.suggestionsRow}>
          <Text style={styles.suggestionTitle}>Suggestions:</Text>
          {SUGGESTED_ROLES.filter((r) => !formData.target_roles.includes(r))
            .slice(0, 3)
            .map((r) => (
              <Pressable
                key={r}
                onPress={() => addTag("target_roles", r)}
                style={styles.suggestionPill}
              >
                <Text style={styles.suggestionPillText}>+ {r}</Text>
              </Pressable>
            ))}
        </View>

        {/* SKILLS & TECH STACK */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>SKILLS & TECH STACK</Text>
          <View style={styles.badgeRequired}>
            <Text style={styles.badgeRequiredText}>KEY FOR SCRAPER</Text>
          </View>
        </View>
        <Text style={styles.fieldHint}>
          Languages, frameworks, databases, and infrastructure.
        </Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newSkillInput}
            onChangeText={setNewSkillInput}
            onSubmitEditing={() => {
              addTag("skills", newSkillInput);
              setNewSkillInput("");
            }}
            placeholder="e.g., Java, Spring Boot, React, Docker..."
            placeholderTextColor={C.dim}
          />
          <TouchableOpacity
            style={styles.addTagButton}
            onPress={() => {
              addTag("skills", newSkillInput);
              setNewSkillInput("");
            }}
            activeOpacity={0.8}
          >
            <Plus size={18} color={C.cyan} />
          </TouchableOpacity>
        </View>

        {/* Skills list */}
        {formData.skills.length > 0 && (
          <View style={styles.chipContainer}>
            {formData.skills.map((skill) => (
              <View key={skill} style={styles.tagChipActive}>
                <Text style={styles.tagChipTextActive}>{skill}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => removeTag("skills", skill)}
                  style={{ marginLeft: 6 }}
                >
                  <X size={14} color={C.cyan} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Suggestions */}
        <View style={styles.suggestionsRow}>
          <Text style={styles.suggestionTitle}>Popular:</Text>
          {SUGGESTED_SKILLS.filter((s) => !formData.skills.includes(s))
            .slice(0, 6)
            .map((s) => (
              <Pressable
                key={s}
                onPress={() => addTag("skills", s)}
                style={styles.suggestionPill}
              >
                <Text style={styles.suggestionPillText}>+ {s}</Text>
              </Pressable>
            ))}
        </View>

        {/* EDUCATION & DIPLOMA */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>EDUCATION & DIPLOMA</Text>
          <View style={styles.badgeOptional}>
            <Text style={styles.badgeOptionalText}>OPTIONAL</Text>
          </View>
        </View>
        <TextInput
          style={styles.input}
          value={formData.education}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, education: text }))
          }
          placeholder="e.g., Java Fullstack Developer Diploma — Nackademin / KTH"
          placeholderTextColor={C.dim}
        />

        {/* GITHUB & PORTFOLIO */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>PORTFOLIO & GITHUB</Text>
          <View style={styles.badgeOptional}>
            <Text style={styles.badgeOptionalText}>OPTIONAL</Text>
          </View>
        </View>
        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>GITHUB PROFILE URL</Text>
            <TextInput
              style={styles.input}
              value={formData.github_url}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, github_url: text }))
              }
              placeholder="https://github.com/username"
              placeholderTextColor={C.dim}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PORTFOLIO / WEBSITE URL</Text>
            <TextInput
              style={styles.input}
              value={formData.portfolio_url}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, portfolio_url: text }))
              }
              placeholder="https://myportfolio.dev"
              placeholderTextColor={C.dim}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* BIO & AI GENERATOR */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>PROFESSIONAL BIO</Text>
          <View style={styles.badgeOptional}>
            <Text style={styles.badgeOptionalText}>AI-ASSISTED</Text>
          </View>
        </View>
        <View style={styles.bioHeaderRow}>
          <View style={styles.tonePills}>
            {(["executive", "technical", "modern"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setBioTone(t)}
                style={[
                  styles.tonePill,
                  bioTone === t && styles.tonePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tonePillText,
                    bioTone === t && { color: C.cyan },
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <TouchableOpacity
            style={styles.aiGenButton}
            onPress={handleGenerateBio}
            activeOpacity={0.8}
            disabled={generatingBio}
          >
            <Sparkles size={14} color="#000" />
            <Text style={styles.aiGenButtonText}>
              {generatingBio ? "Writing..." : "Generate with AI"}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.bio}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, bio: text }))
          }
          placeholder="Write a brief professional summary or click 'Generate with AI' to craft a tailored narrative based on your credentials..."
          placeholderTextColor={C.dim}
          multiline
          numberOfLines={4}
        />

        {/* DOCUMENT UPLOADS */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionHeader}>
            DOCUMENTS VAULT ({totalDocs}/{MAX_DOCUMENTS} MAX)
          </Text>
          <View style={styles.badgeOptional}>
            <Text style={styles.badgeOptionalText}>OPTIONAL</Text>
          </View>
        </View>
        <Text style={styles.fieldHint}>
          Upload CV/Resume (PDF/DOCX) and Certifications. AI automatically
          extracts career context.
        </Text>

        <View style={styles.uploadButtonsRow}>
          <TouchableOpacity
            style={[
              styles.uploadActionBtn,
              totalDocs >= MAX_DOCUMENTS && { opacity: 0.5 },
            ]}
            onPress={() => handleUploadDocument("cv")}
            disabled={uploadingDoc || totalDocs >= MAX_DOCUMENTS}
            activeOpacity={0.8}
          >
            <FileText size={16} color={C.cyan} />
            <Text style={styles.uploadActionBtnText}>Upload CV / Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.uploadActionBtn,
              totalDocs >= MAX_DOCUMENTS && { opacity: 0.5 },
            ]}
            onPress={() => handleUploadDocument("certification")}
            disabled={uploadingDoc || totalDocs >= MAX_DOCUMENTS}
            activeOpacity={0.8}
          >
            <Award size={16} color={C.cyan} />
            <Text style={styles.uploadActionBtnText}>Upload Certification</Text>
          </TouchableOpacity>
        </View>

        {uploadingDoc && (
          <View style={styles.uploadProgressBox}>
            <ActivityIndicator size="small" color={C.cyan} />
            <Text style={styles.uploadProgressText}>
              {uploadStatus || "Processing document..."}
            </Text>
          </View>
        )}

        {totalDocs > 0 && (
          <View style={styles.documentsCardList}>
            {resumes.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docRowLeft}>
                  <FileText size={18} color={C.cyan} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.file_name}
                    </Text>
                    <Text style={styles.docMeta}>
                      CV • {doc.file_size_kb || 0} KB •{" "}
                      {doc.extraction_status || "synced"}
                    </Text>
                  </View>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    handleDeleteDocument("cv", doc.id, doc.storage_path)
                  }
                  style={styles.deleteDocBtn}
                >
                  <Trash2 size={16} color={C.sub} />
                </Pressable>
              </View>
            ))}

            {certs.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docRowLeft}>
                  <Award size={18} color={C.cyan} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.file_name}
                    </Text>
                    <Text style={styles.docMeta}>
                      Certification • {doc.file_size_kb || 0} KB
                    </Text>
                  </View>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    handleDeleteDocument(
                      "certification",
                      doc.id,
                      doc.storage_path,
                    )
                  }
                  style={styles.deleteDocBtn}
                >
                  <Trash2 size={16} color={C.sub} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Step 1: Seniority & Languages
  const renderStep1 = () => (
    <View style={styles.stepCardContainer}>
      <View style={styles.stepBadgeRow}>
        <View style={styles.stepBadge}>
          <Target size={13} color={colors.accent.blue} />
          <Text style={styles.stepBadgeText}>
            STEP 02 • SENIORITY & LANGUAGES
          </Text>
        </View>
      </View>

      <Text style={styles.stepTitle}>Experience & Seniority</Text>
      <Text style={styles.stepSubtitle}>
        Establish your seniority tier and language capabilities for Nordic and
        European matching.
      </Text>

      <View style={styles.proTipBox}>
        <View style={styles.proTipHeader}>
          <Lightbulb size={14} color={colors.accent.cyan} />
          <Text style={styles.proTipTag}>MATCHING TIP</Text>
        </View>
        <Text style={styles.proTipText}>
          Locking your exact experience range prevents lower-tier junior or
          intern listings from clogging your radar.
        </Text>
      </View>

      <Text style={styles.label}>YEARS OF PROFESSIONAL EXPERIENCE</Text>
      <TextInput
        style={styles.input}
        value={formData.years_experience}
        onChangeText={(text) =>
          setFormData((prev) => ({ ...prev, years_experience: text }))
        }
        placeholder="e.g., 5"
        keyboardType="numeric"
        placeholderTextColor={C.dim}
      />

      <Text style={styles.label}>SENIORITY LEVEL</Text>
      <View style={styles.seniorityGrid}>
        {SENIORITY.map((item) => {
          const active = formData.seniority_level === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() =>
                setFormData((prev) => ({ ...prev, seniority_level: item.id }))
              }
              style={[
                styles.seniorityCard,
                active && styles.seniorityCardActive,
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.seniorityCardHeader}>
                <Text
                  style={[styles.seniorityTitle, active && { color: C.cyan }]}
                >
                  {item.label}
                </Text>
                {active && <Check size={14} color={C.cyan} />}
              </View>
              <Text style={styles.seniorityDesc}>{item.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>LANGUAGES SPOKEN</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={newLangInput}
          onChangeText={setNewLangInput}
          onSubmitEditing={() => {
            addTag("languages", newLangInput);
            setNewLangInput("");
          }}
          placeholder="Add language..."
          placeholderTextColor={C.dim}
        />
        <TouchableOpacity
          style={styles.addTagButton}
          onPress={() => {
            addTag("languages", newLangInput);
            setNewLangInput("");
          }}
          activeOpacity={0.8}
        >
          <Plus size={18} color={C.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipContainer}>
        {formData.languages.map((lang) => (
          <View key={lang} style={styles.tagChipActive}>
            <Text style={styles.tagChipTextActive}>{lang}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => removeTag("languages", lang)}
              style={{ marginLeft: 6 }}
            >
              <X size={14} color={C.cyan} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.suggestionsRow}>
        <Text style={styles.suggestionTitle}>Suggestions:</Text>
        {SUGGESTED_LANGUAGES.filter((l) => !formData.languages.includes(l)).map(
          (l) => (
            <Pressable
              key={l}
              onPress={() => addTag("languages", l)}
              style={styles.suggestionPill}
            >
              <Text style={styles.suggestionPillText}>+ {l}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );

  // Step 2: Location & Work Preferences
  const renderStep2 = () => (
    <View style={styles.stepCardContainer}>
      <View style={styles.stepBadgeRow}>
        <View style={styles.stepBadge}>
          <MapPin size={13} color={colors.accent.cyan} />
          <Text style={styles.stepBadgeText}>
            STEP 03 • GEOGRAPHY & COMMUTE
          </Text>
        </View>
      </View>

      <Text style={styles.stepTitle}>Work Models & Geographic Scope</Text>
      <Text style={styles.stepSubtitle}>
        Define where and how you want to work. The scraper prioritizes jobs
        matching these coordinates.
      </Text>

      <Text style={styles.label}>WORKPLACE MODEL (SELECT MULTIPLE)</Text>
      <View style={styles.workTypeGrid}>
        {WORK_TYPES.map((type) => {
          const active = formData.work_type_preferences.includes(type.id);
          return (
            <TouchableOpacity
              key={type.id}
              onPress={() => toggleWorkType(type.id)}
              style={[styles.workTypeCard, active && styles.workTypeCardActive]}
              activeOpacity={0.8}
            >
              <Text style={styles.workTypeIcon}>{type.icon}</Text>
              <Text style={[styles.workTypeLabel, active && { color: C.cyan }]}>
                {type.label}
              </Text>
              {active && (
                <Check
                  size={14}
                  color={C.cyan}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>TARGET CITIES</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={newCityInput}
          onChangeText={setNewCityInput}
          onSubmitEditing={() => {
            addTag("target_cities", newCityInput);
            setNewCityInput("");
          }}
          placeholder="e.g., Stockholm..."
          placeholderTextColor={C.dim}
        />
        <TouchableOpacity
          style={styles.addTagButton}
          onPress={() => {
            addTag("target_cities", newCityInput);
            setNewCityInput("");
          }}
          activeOpacity={0.8}
        >
          <Plus size={18} color={C.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipContainer}>
        {formData.target_cities.map((city) => (
          <View key={city} style={styles.tagChipActive}>
            <Text style={styles.tagChipTextActive}>{city}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => removeTag("target_cities", city)}
              style={{ marginLeft: 6 }}
            >
              <X size={14} color={C.cyan} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.suggestionsRow}>
        <Text style={styles.suggestionTitle}>Nordic hubs:</Text>
        {SUGGESTED_CITIES.filter(
          (c) => !formData.target_cities.includes(c),
        ).map((c) => (
          <Pressable
            key={c}
            onPress={() => addTag("target_cities", c)}
            style={styles.suggestionPill}
          >
            <Text style={styles.suggestionPillText}>+ {c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>TARGET COUNTRIES</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={newCountryInput}
          onChangeText={setNewCountryInput}
          onSubmitEditing={() => {
            addTag("target_countries", newCountryInput);
            setNewCountryInput("");
          }}
          placeholder="e.g., Sweden..."
          placeholderTextColor={C.dim}
        />
        <TouchableOpacity
          style={styles.addTagButton}
          onPress={() => {
            addTag("target_countries", newCountryInput);
            setNewCountryInput("");
          }}
          activeOpacity={0.8}
        >
          <Plus size={18} color={C.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipContainer}>
        {formData.target_countries.map((country) => (
          <View key={country} style={styles.tagChipActive}>
            <Text style={styles.tagChipTextActive}>{country}</Text>
            <Pressable
              hitSlop={8}
              onPress={() => removeTag("target_countries", country)}
              style={{ marginLeft: 6 }}
            >
              <X size={14} color={C.cyan} />
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>
        SEARCH RADIUS ({formData.location_radius_km} KM)
      </Text>
      <View style={styles.chipContainer}>
        {RADIUS_OPTIONS.map((r) => (
          <Pressable
            key={r}
            onPress={() =>
              setFormData((prev) => ({ ...prev, location_radius_km: r }))
            }
            style={[
              styles.chip,
              formData.location_radius_km === r && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                formData.location_radius_km === r && { color: C.cyan },
              ]}
            >
              {r} km
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Step 3: Salary & Throttling
  const renderStep3 = () => (
    <View style={styles.stepCardContainer}>
      <View style={styles.stepBadgeRow}>
        <View style={styles.stepBadge}>
          <DollarSign size={13} color={colors.accent.cyan} />
          <Text style={styles.stepBadgeText}>
            STEP 04 • COMPENSATION & THROTTLE
          </Text>
        </View>
      </View>

      <Text style={styles.stepTitle}>Compensation & Application Pace</Text>
      <Text style={styles.stepSubtitle}>
        Specify compensation floors and daily application dispatch quotas to
        prevent anti-spam rate limiting.
      </Text>

      <View style={styles.rowInputs}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>MINIMUM MONTHLY SALARY</Text>
          <TextInput
            style={styles.input}
            value={formData.salary_min}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, salary_min: text }))
            }
            placeholder="e.g., 48000"
            keyboardType="numeric"
            placeholderTextColor={C.dim}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>MAX EXPECTED SALARY</Text>
          <TextInput
            style={styles.input}
            value={formData.salary_max}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, salary_max: text }))
            }
            placeholder="e.g., 68000"
            keyboardType="numeric"
            placeholderTextColor={C.dim}
          />
        </View>
      </View>

      <Text style={styles.label}>CURRENCY</Text>
      <View style={styles.chipContainer}>
        {["SEK", "EUR", "USD", "GBP"].map((currency) => (
          <Pressable
            key={currency}
            onPress={() =>
              setFormData((prev) => ({ ...prev, salary_currency: currency }))
            }
            style={[
              styles.chip,
              formData.salary_currency === currency && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                formData.salary_currency === currency && { color: C.cyan },
              ]}
            >
              {currency}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 18 }]}>
        DAILY APPLICATION DISPATCH CAP
      </Text>
      <Text style={styles.fieldHint}>
        Maximum automated job applications sent per day on your behalf. Each
        scrape batch pulls a minimum of 30 job listings into your radar deck.
      </Text>
      <View style={styles.chipContainer}>
        {[30, 45, 60, 100].map((num) => (
          <Pressable
            key={num}
            onPress={() =>
              setFormData((prev) => ({ ...prev, max_daily_applications: num }))
            }
            style={[
              styles.chip,
              formData.max_daily_applications === num && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                formData.max_daily_applications === num && { color: C.cyan },
              ]}
            >
              {num} applications/day
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Step 4: Summary & Launch
  const renderStep4 = () => {
    const totalDocs = resumes.length + certs.length;

    return (
      <View style={styles.stepCardContainer}>
        <View style={styles.stepBadgeRow}>
          <View style={styles.stepBadge}>
            <Sparkles size={13} color={colors.accent.cyan} />
            <Text style={styles.stepBadgeText}>
              STEP 05 • REVIEW & GENERATE CARD
            </Text>
          </View>
        </View>

        <Text style={styles.stepTitle}>Review & Generate Active Hunt Box</Text>
        <Text style={styles.stepSubtitle}>
          Verify your configuration. Once saved, OpusHunter generates your
          active Search Card Box ready for 1-tap autonomous discovery.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Full Name</Text>
            <Text style={styles.summaryValue}>
              {`${formData.first_name} ${formData.last_name}`.trim() || "N/A"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Primary Target Title</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: C.cyan, fontWeight: "700" },
              ]}
            >
              {formData.professional_title || "N/A"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Target Roles</Text>
            <Text style={styles.summaryValue}>
              {formData.target_roles.length > 0
                ? formData.target_roles.join(", ")
                : formData.professional_title}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Core Skills ({formData.skills.length})
            </Text>
            <Text style={styles.summaryValue} numberOfLines={2}>
              {formData.skills.length > 0
                ? formData.skills.join(", ")
                : "None specified"}
            </Text>
          </View>

          {formData.education ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Education / Diploma</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {formData.education}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Uploaded Documents</Text>
            <Text style={styles.summaryValue}>
              {totalDocs} files ({resumes.length} CVs, {certs.length} Certs)
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Experience / Seniority</Text>
            <Text style={styles.summaryValue}>
              {formData.years_experience} yrs •{" "}
              {formData.seniority_level.replace("_", " ")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Work Types</Text>
            <Text style={styles.summaryValue}>
              {formData.work_type_preferences.join(", ")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cities & Countries</Text>
            <Text style={styles.summaryValue}>
              {formData.target_cities.join(", ")} (
              {formData.target_countries.join(", ")}) •{" "}
              {formData.location_radius_km}km radius
            </Text>
          </View>

          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Salary & Pace</Text>
            <Text style={styles.summaryValue}>
              {formData.salary_min
                ? `${formData.salary_min} - ${formData.salary_max || "+"} ${formData.salary_currency}`
                : "Open"}{" "}
              • {formData.max_daily_applications} apps/day
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const stepContent = () => {
    switch (step) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Wizard Navigation / Stepper */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          disabled={step === 0}
          hitSlop={8}
          style={[styles.backButton, step === 0 && { opacity: 0.3 }]}
        >
          <ChevronLeft size={20} color={step === 0 ? C.dim : C.text} />
          <Text style={[styles.backButtonText, step === 0 && { color: C.dim }]}>
            Previous
          </Text>
        </Pressable>

        <View style={styles.stepperIndicator}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                i === step && styles.stepDotActive,
                i < step && styles.stepDotCompleted,
              ]}
            />
          ))}
        </View>

        <Text style={styles.headerStepText}>
          {step + 1} / {totalSteps}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / totalSteps) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={step}
          entering={FadeInDown.duration(280).easing(Easing.out(Easing.quad))}
          style={styles.content}
        >
          {stepContent()}

          {error && (
            <View style={styles.errorBox}>
              <AlertCircle
                size={16}
                color={C.pink}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {step > 0 && (
              <TouchableOpacity
                onPress={goBack}
                style={styles.prevBtn}
                activeOpacity={0.8}
              >
                <ChevronLeft size={16} color="#FFFFFF" />
                <Text style={styles.prevBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={goNext}
              disabled={loading}
              style={[styles.nextButton, step === 0 && { flex: 1 }]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {step === totalSteps - 1
                      ? "SAVE & GENERATE ACTIVE CARD BOX"
                      : "CONTINUE TO NEXT STEP"}
                  </Text>
                  {step === totalSteps - 1 ? (
                    <Check size={18} color="#000" />
                  ) : (
                    <ChevronRight size={18} color="#000" />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  backButtonText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  stepperIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E293B",
  },
  stepDotActive: {
    width: 20,
    backgroundColor: colors.accent.cyan,
  },
  stepDotCompleted: {
    backgroundColor: "#10B981",
  },
  headerStepText: {
    color: C.cyan,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent.cyan,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 720,
  },
  stepCardContainer: {
    backgroundColor: "rgba(10, 15, 29, 0.75)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: { backdropFilter: "blur(16px)" } as any,
    }),
  },
  stepBadgeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    gap: 6,
  },
  stepBadgeText: {
    color: colors.accent.cyan,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 16,
  },
  proTipBox: {
    backgroundColor: "rgba(0, 242, 254, 0.05)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.2)",
    padding: 12,
    marginBottom: 20,
  },
  proTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  proTipTag: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent.cyan,
    letterSpacing: 1,
  },
  proTipText: {
    fontSize: 12,
    color: "#CBD5E1",
    lineHeight: 18,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.2,
  },
  badgeRequired: {
    backgroundColor: "rgba(0, 242, 254, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeRequiredText: {
    color: C.cyan,
    fontSize: 10,
    fontWeight: "800",
  },
  badgeOptional: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeOptionalText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
  },
  fieldHint: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    lineHeight: 16,
  },
  rowInputs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  fieldColumn: {
    flex: 1,
    minWidth: 220,
  },
  contactCard: {
    backgroundColor: "rgba(0, 210, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.18)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 4,
  },
  contactEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  contactLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  contactEmail: {
    flex: 1,
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 10,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  addTagButton: {
    backgroundColor: "rgba(0, 242, 254, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    borderRadius: radius.md,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  tagChipText: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "600",
  },
  tagChipActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  tagChipTextActive: {
    color: C.cyan,
    fontSize: 13,
    fontWeight: "600",
  },
  chip: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipActive: {
    backgroundColor: "rgba(0, 242, 254, 0.15)",
    borderColor: C.cyan,
  },
  chipText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  suggestionTitle: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },
  suggestionPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  suggestionPillText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  bioHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tonePills: {
    flexDirection: "row",
    gap: 6,
  },
  tonePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  tonePillActive: {
    backgroundColor: "rgba(0, 242, 254, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
  },
  tonePillText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  aiGenButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  aiGenButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#050811",
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  uploadActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  uploadProgressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  uploadProgressText: {
    fontSize: 12,
    color: C.cyan,
  },
  documentsCardList: {
    marginTop: 8,
    gap: 8,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.md,
    padding: 10,
  },
  docRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  docName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  docMeta: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  deleteDocBtn: {
    padding: 6,
  },
  seniorityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  seniorityCard: {
    width: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.md,
    padding: 12,
  },
  seniorityCardActive: {
    borderColor: C.cyan,
    backgroundColor: "rgba(0, 242, 254, 0.08)",
  },
  seniorityCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  seniorityTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  seniorityDesc: {
    color: "#64748B",
    fontSize: 11,
  },
  workTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  workTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  workTypeCardActive: {
    borderColor: C.cyan,
    backgroundColor: "rgba(0, 242, 254, 0.08)",
  },
  workTypeIcon: {
    fontSize: 16,
  },
  workTypeLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.25)",
    padding: 16,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    maxWidth: "60%",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: C.pink,
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  prevBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 6,
  },
  prevBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.cyan,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 0 20px rgba(0, 242, 254, 0.35)",
      } as any,
    }),
  },
  nextButtonText: {
    color: "#050811",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
