import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { C } from '../../lib/theme';

interface ProcessingLoaderProps {
  size?: number;
  color?: string;
  onPress?: () => void;
}

export const ProcessingLoader = ({
  size = 100,
  color = C.cyan,
  onPress,
}: ProcessingLoaderProps) => {
  // Shared values for the animations
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  // 2. Interactive Press Animations
  const handlePressIn = () => {
    // Shrink slightly when pressed down
    scale.value = withSpring(0.85, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    // Bounce slightly larger, then settle back to normal size (1)
    scale.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );

    // Trigger the optional onPress callback if provided
    if (onPress) onPress();
  };

  // Combine both rotation and scale into one animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: size, height: size }}
      >
        <Animated.View style={[animatedStyle, { flex: 1, pointerEvents: 'none' }]}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
              {/* OpusHunter Signature Neon Gradient */}
              <LinearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} />
                <Stop offset="100%" stopColor={C.purple} />
              </LinearGradient>
            </Defs>
            <Circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#neonGlow)"
              strokeWidth="8"
              strokeDasharray="60 180"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  );
};
