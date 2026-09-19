import { BlurView } from "expo-blur";
import { ReactNode, memo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeContext";

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

function GlassCard({ children, style, intensity = 50 }: GlassCardProps) {
  const { themeMode } = useTheme();

  const isNight = themeMode === "night";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isNight
            ? "rgba(255,255,255,0.055)"
            : "rgba(255,255,255,0.52)",

          borderColor: isNight
            ? "rgba(255,255,255,0.15)"
            : "rgba(255,255,255,0.82)",

          shadowColor: isNight ? "#000000" : "#64748B",

          shadowOpacity: isNight ? 0.24 : 0.1,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={isNight ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isNight
              ? "rgba(255,255,255,0.035)"
              : "rgba(255,255,255,0.18)",
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.topReflection,
          {
            backgroundColor: isNight
              ? "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.42)",
          },
        ]}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

export default memo(GlassCard);

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",

    shadowRadius: 18,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 4,
  },

  topReflection: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
  },

  content: {
    width: "100%",
    zIndex: 2,
  },
});
