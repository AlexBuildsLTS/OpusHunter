import React from 'react';
import { Dimensions, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { GlassCard } from '../ui/GlassCard';
import { LiquidNeonText } from '../ui/LiquidNeonText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface JobData {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  matchScore: number;
  description: string;
}

interface SwipeableJobCardProps {
  job: JobData;
  onSwipeRight: (job: JobData) => void;
  onSwipeLeft: (job: JobData) => void;
}

export function SwipeableJobCard({ job, onSwipeRight, onSwipeLeft }: SwipeableJobCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(onSwipeRight)(job);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(onSwipeLeft)(job);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width: '100%', position: 'absolute' }, animatedCardStyle]}>
        <GlassCard className="min-h-[500px] flex flex-col justify-between">
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <LiquidNeonText variant="cyan" className="flex-1 mr-4 text-3xl">
                {job.title}
              </LiquidNeonText>
              <View style={{ backgroundColor: '#8A2BE2', opacity: 0.2, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#8A2BE2' }}>
                <LiquidNeonText variant="purple" className="text-sm">
                  {job.matchScore}
                </LiquidNeonText>
                <Text style={{ color: '#A020F0', fontSize: 12 }}>% Match</Text>
              </View>
            </View>

            <LiquidNeonText variant="white" className="mb-2 text-xl">
              {job.company}
            </LiquidNeonText>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>{job.location}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>•</Text>
              <LiquidNeonText variant="pink" className="text-sm">
                {job.salary}
              </LiquidNeonText>
            </View>

            <Text style={{ fontSize: 16, lineHeight: 24, color: 'rgba(255, 255, 255, 0.8)' }} numberOfLines={6}>
              {job.description}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, marginTop: 32, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
            <Text style={{ color: '#FF007F', fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>Pass</Text>
            <Text style={{ color: '#00F0FF', fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>Apply</Text>
          </View>
        </GlassCard>
      </Animated.View>
    </GestureDetector>
  );
}