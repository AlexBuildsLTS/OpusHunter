/**
 * components/charts/DonutChart.tsx
 * OpusHunter — Real SVG Donut Chart
 * 2026-07-02
 *
 * Pure react-native-svg (already in package.json — no new dependency),
 * renders real data passed in via props. Works identically on web and
 * native since it's SVG, not a web-only <canvas>/<div> chart.
 */

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { C } from '../../lib/theme';

export interface DonutSlice {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    data: DonutSlice[];
    size?: number;
    strokeWidth?: number;
    centerLabel?: string;
    centerValue?: string | number;
}

export function DonutChart({ data, size = 140, strokeWidth = 16, centerLabel, centerValue }: DonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let cumulativeOffset = 0;

    return (
        <View style={{ alignItems: 'center' }}>
            <View style={{ width: size, height: size }}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <G transform={`rotate(-90 ${center} ${center})`}>
                        {/* Track */}
                        <Circle cx={center} cy={center} r={radius} stroke={C.border} strokeWidth={strokeWidth} fill="none" />
                        {total > 0 && data.map((slice, i) => {
                            const fraction = slice.value / total;
                            const dashLength = fraction * circumference;
                            const gap = circumference - dashLength;
                            const offset = -cumulativeOffset;
                            cumulativeOffset += dashLength;
                            if (slice.value <= 0) return null;
                            return (
                                <Circle
                                    key={slice.label + i}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    stroke={slice.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${dashLength} ${gap}`}
                                    strokeDashoffset={offset}
                                    strokeLinecap="butt"
                                    fill="none"
                                />
                            );
                        })}
                    </G>
                </Svg>
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>{centerValue ?? total}</Text>
                    {centerLabel && (
                        <Text style={{ color: C.sub, fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
                            {centerLabel}
                        </Text>
                    )}
                </View>
            </View>

            <View style={{ marginTop: 14, gap: 6, width: '100%' }}>
                {data.map((slice) => (
                    <View key={slice.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: slice.color }} />
                        <Text style={{ flex: 1, color: C.sub, fontSize: 11 }}>{slice.label}</Text>
                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>
                            {slice.value}{total > 0 ? ` (${Math.round((slice.value / total) * 100)}%)` : ''}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}