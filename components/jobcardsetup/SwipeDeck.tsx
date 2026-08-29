import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS
} from "react-native-reanimated";
import { 
  Gesture, 
  GestureDetector, 
  GestureHandlerRootView 
} from "react-native-gesture-handler";
import { Typography } from "../ui/Typography";
import { Card } from "../ui/GlassCard";
import { colors } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeDeckProps {
  jobs: any[];
  onSwipeRight: (job: any) => void;
  onSwipeLeft: (job: any) => void;
  onSwipeUp: (job: any) => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({
  jobs,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const currentJob = jobs[currentIndex];

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` },
    ],
  }));

  const nextCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    setCurrentIndex((prev) => (prev + 1) % jobs.length);
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (event.translationX > 0) {
          runOnJS(onSwipeRight)(currentJob);
        } else {
          runOnJS(onSwipeLeft)(currentJob);
        }
        translateX.value = withSpring(event.translationX > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH, {}, () => {
          runOnJS(nextCard)();
        });
      } else if (event.translationY < -SWIPE_THRESHOLD) {
        runOnJS(onSwipeUp)(currentJob);
        translateY.value = withSpring(-SCREEN_WIDTH, {}, () => {
          runOnJS(nextCard)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  if (!currentJob) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <Card style={styles.cardInner}>
            <Typography variant="h3" weight="bold" color="primary">
              {currentJob.title}
            </Typography>
            <Typography variant="body" color="secondary" style={{ marginTop: 4 }}>
              {currentJob.company}
            </Typography>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Typography variant="caption" color="accent">
                  {currentJob.location || "Remote"}
                </Typography>
              </View>
              {currentJob.salary && (
                <View style={styles.badge}>
                  <Typography variant="caption" color="accent">
                    {currentJob.salary}
                  </Typography>
                </View>
              )}
            </View>
          </Card>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardInner: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-end",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: `${colors.accent.cyan}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
