import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { Typography } from "../ui/Typography";
import { Card } from "../ui/GlassCard";
import { colors } from "../../constants/theme";

interface RateLimitBannerProps {
  limited: boolean;
  nextAvailableAt?: Date | null;
  onRefresh: () => void;
}

export const RateLimitBanner: React.FC<RateLimitBannerProps> = ({
  limited,
  nextAvailableAt,
  onRefresh,
}) => {
  if (!limited) return null;

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <AlertCircle size={20} color={colors.accent.red} />
        <View style={styles.textContainer}>
          <Typography variant="bodySm" weight="bold" color="primary">
            Rate Limit Reached
          </Typography>
          <Typography variant="caption" color="secondary">
            Next search available at: {nextAvailableAt?.toLocaleTimeString() || "soon"}
          </Typography>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          accessibilityRole="button"
          accessibilityLabel="Refresh rate limit status"
        >
          <RefreshCw size={16} color={colors.accent.cyan} />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 12,
    borderColor: `${colors.accent.red}30`,
    borderWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: `${colors.accent.cyan}10`,
  },
});
