/**
 * components/charts/BarChart.tsx
 * OpusHunter — Real SVG Bar Chart
 * 2026-07-02
 *
 * Simple, real, responsive bar chart for time-series data (e.g. "applications
 * per day, last 7 days"). Pure react-native-svg — no new dependency.
 */

import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import { theme, C } from "../../lib/theme";
export interface BarPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarPoint[];
  height?: number;
  color?: string;
}

export function BarChart({
  data,
  height = 120,
  color = C.cyan,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 8;

  return (
    <View style={{ width: "100%" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height,
          gap: barGap,
        }}
      >
        {data.map((d, i) => {
          const barHeight = Math.max(3, (d.value / max) * (height - 20));
          return (
            <View key={d.label + i} style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  color: C.text,
                  fontSize: 10,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                {d.value > 0 ? d.value : ""}
              </Text>
              <Svg
                width="100%"
                height={barHeight}
                viewBox={`0 0 20 ${Math.max(barHeight, 3)}`}
                preserveAspectRatio="none"
              >
                <Rect
                  x={2}
                  y={0}
                  width={16}
                  height={Math.max(barHeight, 3)}
                  rx={4}
                  fill={d.value > 0 ? color : C.border}
                />
              </Svg>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: barGap, marginTop: 8 }}>
        {data.map((d, i) => (
          <Text
            key={d.label + i}
            style={{
              flex: 1,
              textAlign: "center",
              color: C.sub,
              fontSize: 9,
              fontWeight: "600",
            }}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
