/**
 * components/ui/KeywordTagInput.tsx
 * OpusHunter — Clickable Keyword Tags
 * 2026-08-20 — Fixed: pasted comma-separated lists no longer become one tag
 *
 * WHAT CHANGED AND WHY:
 *   CONFIRMED BUG (screenshot evidence, `/configure`): `addTag()` took the
 *   raw text input and pushed it into the tags array with only a `.trim()`
 *   — no delimiter splitting. Paste a comma-separated skill list (something
 *   every job seeker naturally does — copying a "Skills" line straight out
 *   of their CV) and the *entire pasted string* became a single tag:
 *   `", Java, Javascript, Typescript, React, Node, Expo, Maven, ..."` as one
 *   array element. Downstream, `scrape-jobs/index.ts` does
 *   `primaryKeyword = rule.keywords[0]` — so that one garbled tag became the
 *   literal search query sent to JSearch, which explains malformed/empty
 *   scrape results far better than a network issue does.
 *
 *   Fix: `addTag()` now splits on commas AND newlines (paste-from-CV
 *   friendly), trims and dedupes each piece, and adds them all in one
 *   `onChange` call. Typing a single word with no delimiter behaves
 *   exactly as before — this only changes multi-value paste behavior.
 *
 * 2026-07-06 — Expanded from a fixed 16-item chip list to a ~120-entry job
 * title/skill taxonomy with LIVE type-ahead filtering (unchanged this pass).
 *
 * This is a curated static list, not a live external API — there is no
 * RapidAPI "job titles" endpoint currently wired into this app. If job-title
 * taxonomy coverage needs to grow beyond this list, that's a data change to
 * JOB_TITLE_TAXONOMY below, not a new backend dependency.
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { Plus, X, Search } from "lucide-react-native";
import { C } from "../../lib/theme";

// ── Default tap-chips shown when the input is empty ───────────────────────────
const SUGGESTED = [
  "React",
  "React Native",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "Frontend",
  "Backend",
  "Full Stack",
  "DevOps",
  "Product Manager",
  "UX Designer",
  "Data Analyst",
  "Software Engineer",
  "Mobile Developer",
  "Remote",
];

// ── Broader taxonomy searched once the person starts typing ──────────────────
// Grouped by discipline purely for readability here — rendered as a flat
// list. Deliberately includes compound titles (seniority + stack + role)
// since that's how people actually search ("Junior Java Developer", not
// just "Java").
const JOB_TITLE_TAXONOMY = [
  // Software engineering — general
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Software Engineer",
  "Principal Engineer",
  "Junior Software Engineer",
  "Software Developer",
  "Applications Developer",
  "Systems Engineer",
  "Platform Engineer",

  // Java
  "Java Developer",
  "Junior Java Developer",
  "Senior Java Developer",
  "Java Backend Developer",
  "Full Stack Java Developer",
  "Java Software Engineer",
  "Java Spring Developer",
  "Java Microservices Engineer",

  // Full stack / frontend / backend
  "Full Stack Developer",
  "Full Stack Engineer",
  "Frontend Developer",
  "Frontend Engineer",
  "Backend Developer",
  "Backend Engineer",
  "React Developer",
  "React Native Developer",
  "Vue Developer",
  "Angular Developer",
  "Node.js Developer",
  "Python Developer",
  "Django Developer",
  "PHP Developer",
  "Ruby on Rails Developer",
  "Go Developer",
  "Rust Developer",
  ".NET Developer",
  "C# Developer",
  "C++ Developer",

  // Mobile
  "Mobile Developer",
  "iOS Developer",
  "Android Developer",
  "React Native Engineer",
  "Flutter Developer",
  "Swift Developer",
  "Kotlin Developer",

  // Data / ML
  "Data Analyst",
  "Data Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "ML Engineer",
  "AI Engineer",
  "Analytics Engineer",
  "Business Intelligence Analyst",
  "Data Architect",

  // DevOps / infra / cloud
  "DevOps Engineer",
  "Site Reliability Engineer",
  "SRE",
  "Cloud Engineer",
  "Infrastructure Engineer",
  "Platform Reliability Engineer",
  "AWS Engineer",
  "Kubernetes Engineer",
  "Security Engineer",
  "Cybersecurity Analyst",

  // QA
  "QA Engineer",
  "QA Automation Engineer",
  "Test Engineer",
  "SDET",

  // Product / design
  "Product Manager",
  "Senior Product Manager",
  "Associate Product Manager",
  "Technical Product Manager",
  "Product Owner",
  "UX Designer",
  "UI Designer",
  "Product Designer",
  "UX Researcher",
  "Design Lead",

  // Management / leadership
  "Engineering Manager",
  "Technical Lead",
  "Tech Lead",
  "CTO",
  "VP of Engineering",
  "Director of Engineering",
  "Head of Product",

  // Other common searches
  "Solutions Architect",
  "Technical Writer",
  "Scrum Master",
  "Project Manager",
  "Business Analyst",
  "Sales Engineer",
  "Customer Success Engineer",
  "Support Engineer",
  "IT Support Specialist",
  "Network Engineer",
  "Database Administrator",
  "ERP Consultant",
  "Salesforce Developer",
  "WordPress Developer",
  "Shopify Developer",
  "Blockchain Developer",
  "Game Developer",
  "Unity Developer",
];

interface KeywordTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function KeywordTagInput({ value, onChange }: KeywordTagInputProps) {
  const [custom, setCustom] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = useCallback(
    (tag: string) => {
      onChange(
        value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag],
      );
    },
    [value, onChange],
  );

  /**
   * Splits raw input on commas and newlines — handles both a single typed
   * word ("Java" → ["Java"]) and a pasted list
   * ("Java, TypeScript, React" → ["Java", "TypeScript", "React"]).
   * Dedupes against existing tags and against itself, drops empty pieces
   * left behind by leading/trailing/double commas.
   */
  const addTag = useCallback(
    (raw: string) => {
      const pieces = raw
        .split(/[,\n]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (pieces.length === 0) {
        setCustom("");
        return;
      }
      const seen = new Set(value);
      const additions: string[] = [];
      for (const p of pieces) {
        if (!seen.has(p)) {
          seen.add(p);
          additions.push(p);
        }
      }
      if (additions.length > 0) onChange([...value, ...additions]);
      setCustom("");
    },
    [value, onChange],
  );

  const addCustom = useCallback(() => addTag(custom), [custom, addTag]);

  const remove = useCallback(
    (tag: string) => onChange(value.filter((t) => t !== tag)),
    [value, onChange],
  );

  // ── Live filtered suggestions — prefix matches first, then substring ────
  // Only meaningful for single-word/phrase typing, not multi-value paste —
  // if the field contains a comma the person is pasting a list, not
  // looking for taxonomy suggestions, so the dropdown stays hidden.
  const filteredSuggestions = useMemo(() => {
    const q = custom.trim().toLowerCase();
    if (q.length < 2 || custom.includes(",") || custom.includes("\n"))
      return [];

    const prefix: string[] = [];
    const contains: string[] = [];
    for (const title of JOB_TITLE_TAXONOMY) {
      if (value.includes(title)) continue;
      const lower = title.toLowerCase();
      if (lower.startsWith(q)) prefix.push(title);
      else if (lower.includes(q)) contains.push(title);
    }
    return [...prefix, ...contains].slice(0, 8);
  }, [custom, value]);

  const showDropdown =
    focused && custom.trim().length >= 2 && filteredSuggestions.length > 0;

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setFocused(false), 150);
  };
  const handleFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setFocused(true);
  };

  return (
    <View>
      {value.length > 0 && (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {value.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => remove(tag)}
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
              style={{
                backgroundColor: `${C.cyan}18`,
                borderColor: `${C.cyan}45`,
              }}
            >
              <Text className="text-[11px] font-bold" style={{ color: C.cyan }}>
                {tag}
              </Text>
              <X size={11} color={C.cyan} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ position: "relative" }}>
        <View
          className="flex-row items-center gap-2 rounded-2xl border px-4"
          style={{
            backgroundColor: "rgba(4,12,20,0.7)",
            borderColor: focused ? `${C.cyan}60` : C.border,
            height: 46,
          }}
        >
          <Search size={13} color={C.dim} />
          <TextInput
            value={custom}
            onChangeText={setCustom}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={addCustom}
            placeholder="Type a role or skill, or paste a comma-separated list…"
            placeholderTextColor={C.dim}
            style={{
              flex: 1,
              fontSize: 13,
              color: C.text,
              ...(Platform.OS === "web"
                ? ({ outlineStyle: "none" } as any)
                : {}),
            }}
          />
          <TouchableOpacity
            onPress={addCustom}
            disabled={!custom.trim()}
            hitSlop={8}
          >
            <Plus size={16} color={custom.trim() ? C.cyan : C.dim} />
          </TouchableOpacity>
        </View>

        {showDropdown && (
          <View
            style={{
              position: "absolute",
              top: 50,
              left: 0,
              right: 0,
              zIndex: 20,
              backgroundColor: "#0D0918",
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 14,
              maxHeight: 220,
              overflow: "hidden",
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredSuggestions.map((title) => (
                <TouchableOpacity
                  key={title}
                  onPress={() => addTag(title)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 13 }}>{title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {!showDropdown && (
        <>
          <Text
            className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: C.sub }}
          >
            Popular
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SUGGESTED.filter((s) => !value.includes(s)).map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggle(tag)}
                className="flex-row items-center gap-1 rounded-full border border-white/10 px-3 py-1.5"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <Plus size={11} color={C.sub} />
                <Text className="text-[11px]" style={{ color: C.sub }}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
