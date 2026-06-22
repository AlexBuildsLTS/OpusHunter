import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';

const C = {
    cyan: '#00D4FF',
    purple: '#7B5EA7',
    pink: '#E8436A',
    text: '#D8E4EC',
    sub: 'rgba(216,228,236,0.45)',
    card: '#0B1822',
    border: 'rgba(120,200,240,0.09)',
};

const SWIPE_THRESHOLD = 80;
const scoreColor = (s: number) =>
    s >= 85 ? C.cyan : s >= 65 ? C.purple : s >= 45 ? '#F59E0B' : C.pink;

export interface JobData {
    id: string;
    title: string;
    company: string;
    salary?: string | null;
    location?: string | null;
    match_score?: number | null;
    description?: string | null;
    tech_stack?: string[] | null;
}

interface Props {
    job: JobData;
    onSwipeRight: (job: JobData) => void;
    onSwipeLeft: (job: JobData) => void;
}

export function SwipeableJobCard({ job, onSwipeRight, onSwipeLeft }: Props) {
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    const pan = Gesture.Pan()
        .activeOffsetX([-8, 8])
        .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY * 0.25; })
        .onEnd((e) => {
            const goRight = e.translationX > SWIPE_THRESHOLD || (e.velocityX > 800 && e.translationX > 20);
            const goLeft = e.translationX < -SWIPE_THRESHOLD || (e.velocityX < -800 && e.translationX < -20);
            if (goRight) {
                tx.value = withSpring(650, { velocity: e.velocityX, damping: 15 });
                runOnJS(onSwipeRight)(job);
            } else if (goLeft) {
                tx.value = withSpring(-650, { velocity: e.velocityX, damping: 15 });
                runOnJS(onSwipeLeft)(job);
            } else {
                tx.value = withSpring(0, { damping: 18, stiffness: 200 });
                ty.value = withSpring(0, { damping: 18, stiffness: 200 });
            }
        });

    const cardAnim = useAnimatedStyle(() => ({
        transform: [
            { translateX: tx.value },
            { translateY: ty.value },
            { rotate: `${interpolate(tx.value, [-200, 0, 200], [-10, 0, 10], Extrapolation.CLAMP)}deg` },
        ],
    }));

    const applyAnim = useAnimatedStyle(() => ({
        opacity: interpolate(tx.value, [20, 80], [0, 1], Extrapolation.CLAMP),
        transform: [{ scale: interpolate(tx.value, [20, 80], [0.8, 1], Extrapolation.CLAMP) }],
    }));

    const passAnim = useAnimatedStyle(() => ({
        opacity: interpolate(tx.value, [-20, -80], [0, 1], Extrapolation.CLAMP),
        transform: [{ scale: interpolate(tx.value, [-20, -80], [0.8, 1], Extrapolation.CLAMP) }],
    }));

    const score = job.match_score ?? 0;
    const sc = scoreColor(score);
    const stack = job.tech_stack ?? [];

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[s.wrapper, cardAnim]}>

                {/* APPLY stamp */}
                <Animated.View pointerEvents="none" style={[s.applyStamp, applyAnim]}>
                    <Text style={[s.stampText, { color: C.cyan, borderColor: C.cyan }]}>APPLY</Text>
                </Animated.View>

                {/* PASS stamp */}
                <Animated.View pointerEvents="none" style={[s.passStamp, passAnim]}>
                    <Text style={[s.stampText, { color: C.pink, borderColor: C.pink }]}>PASS</Text>
                </Animated.View>

                {/* Header */}
                <View style={s.headerRow}>
                    <View style={{ flex: 1, marginRight: 14 }}>
                        <Text style={s.title} numberOfLines={2}>{job.title}</Text>
                        <Text style={s.company} numberOfLines={1}>{job.company}</Text>
                    </View>
                    <View style={[s.badge, { borderColor: sc, backgroundColor: `${sc}14` }]}>
                        <Text style={[s.badgeNum, { color: sc }]}>{score}</Text>
                        <Text style={[s.badgeSub, { color: sc }]}>MATCH</Text>
                    </View>
                </View>

                {/* Meta */}
                <View style={s.metaRow}>
                    {job.location ? <Text style={s.meta}>📍 {job.location}</Text> : null}
                    {job.salary ? <Text style={[s.meta, { color: C.pink, fontWeight: '700' }]}>{job.salary}</Text> : null}
                </View>

                <View style={s.divider} />

                {/* Description */}
                <Text style={s.desc} numberOfLines={Platform.OS === 'web' ? 7 : 5}>
                    {job.description ?? 'No description available.'}
                </Text>

                {/* Tech chips */}
                {stack.length > 0 && (
                    <View style={s.chips}>
                        {stack.slice(0, 6).map((tag) => (
                            <View key={tag} style={s.chip}>
                                <Text style={s.chipText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Footer */}
                <View style={s.footer}>
                    <Text style={[s.footerLabel, { color: C.pink }]}>← PASS</Text>
                    <View style={s.footerDot} />
                    <Text style={[s.footerLabel, { color: C.cyan }]}>APPLY →</Text>
                </View>

            </Animated.View>
        </GestureDetector>
    );
}

const s = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: C.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: C.border,
        padding: 24,
        overflow: 'hidden',
        ...(Platform.OS === 'ios' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 30,
        } : {}),
    },
    applyStamp: { position: 'absolute', top: 26, left: 18, zIndex: 10, transform: [{ rotate: '-12deg' }] },
    passStamp: { position: 'absolute', top: 26, right: 18, zIndex: 10, transform: [{ rotate: '12deg' }] },
    stampText: {
        fontSize: 24, fontWeight: '900', letterSpacing: 3,
        borderWidth: 3, borderRadius: 6,
        paddingHorizontal: 10, paddingVertical: 2,
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    title: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 28 },
    company: { fontSize: 14, fontWeight: '600', color: C.sub, marginTop: 4 },
    badge: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    badgeNum: { fontSize: 16, fontWeight: '900', lineHeight: 18 },
    badgeSub: { fontSize: 7, fontWeight: '700', letterSpacing: 1, opacity: 0.8 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    meta: { fontSize: 12, color: C.sub, fontWeight: '500' },
    divider: { height: 1, backgroundColor: 'rgba(120,200,240,0.07)', marginBottom: 14 },
    desc: { fontSize: 14, lineHeight: 22, color: C.sub, flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: `${C.purple}45`, backgroundColor: `${C.purple}10` },
    chipText: { fontSize: 10, color: C.purple, fontWeight: '700', letterSpacing: 0.5 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(120,200,240,0.07)' },
    footerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2.5 },
    footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(216,228,236,0.15)' },
});


