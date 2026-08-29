import React from "react";
import { View, StyleSheet } from "react-native";
import { Search, Plus } from "lucide-react-native";
import { Typography } from "../ui/Typography";
import { Button } from "../ui/Button";
import { colors } from "../../constants/theme";

interface EmptyStateProps {
  onRunSearch: () => void;
  hasScraped?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onRunSearch,
  hasScraped,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Search size={40} color={colors.text.dim} />
      </View>
      <Typography variant="h3" weight="bold" color="primary" style={styles.title}>
        No jobs found
      </Typography>
      <Typography variant="bodySm" color="secondary" style={styles.subtitle}>
        {hasScraped 
          ? "We couldn't find any new jobs matching your criteria."
          : "Start your first search to populate your pipeline."}
      </Typography>
      <Button 
        onPress={onRunSearch} 
        style={styles.button}
        variant="primary"
      >
        <Plus size={18} color="white" />
        <Typography variant="body" weight="bold" style={{ color: "white", marginLeft: 8 }}>
          Run Search
        </Typography>
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.text.dim}10`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
});
