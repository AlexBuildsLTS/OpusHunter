import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
    style?: StyleProp<ViewStyle>;
    scaleDownTo?: number;
    activeOpacity?: number;
    springConfig?: any;
}

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

const DEFAULT_SPRING_CONFIG = {
    mass: 0.5,
    overshootClamping: true,
};

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
    children,
    style,
    scaleDownTo = 0.95,
    activeOpacity = 0.8,
    springConfig = DEFAULT_SPRING_CONFIG,
    onPressIn,
    onPressOut,
    ...props
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = (e: any) => {
        'worklet';
        scale.value = withSpring(scaleDownTo, { ...DEFAULT_SPRING_CONFIG, ...springConfig });
        opacity.value = withTiming(activeOpacity, { duration: 100 });
        onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
        'worklet';
        scale.value = withSpring(1, { ...DEFAULT_SPRING_CONFIG, ...springConfig });
        opacity.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
    };

    return (
        <AnimatedPress
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, animatedStyle]}
        >
            {children}
        </AnimatedPress>
    );
};
