import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";

export default function ScreenBackground({
  children,
}: {
  children?: ReactNode;
}) {
  const { themeMode } = useTheme();

  const isNight = themeMode === "night";

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: isNight ? "#080B18" : "#E8EEF7",
        },
      ]}
    >
      {/* MAIN BACKGROUND */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isNight ? "#0D1223" : "#EEF2F7",
          },
        ]}
      />

      {/* TOP TONE */}
      <View
        pointerEvents="none"
        style={[
          styles.topTone,
          {
            backgroundColor: isNight
              ? "rgba(67,83,174,0.20)"
              : "rgba(139,176,229,0.24)",
          },
        ]}
      />

      {/* TOP VIOLET TONE */}
      <View
        pointerEvents="none"
        style={[
          styles.topViolet,
          {
            backgroundColor: isNight
              ? "rgba(112,77,172,0.15)"
              : "rgba(183,163,227,0.16)",
          },
        ]}
      />

      {/* MIDDLE COOL TONE */}
      <View
        pointerEvents="none"
        style={[
          styles.middleTone,
          {
            backgroundColor: isNight
              ? "rgba(43,72,150,0.14)"
              : "rgba(158,188,229,0.16)",
          },
        ]}
      />

      {/* MIDDLE WARM TONE */}
      <View
        pointerEvents="none"
        style={[
          styles.middleWarm,
          {
            backgroundColor: isNight
              ? "rgba(126,72,145,0.10)"
              : "rgba(215,184,165,0.12)",
          },
        ]}
      />

      {/* LOWER TONE */}
      <View
        pointerEvents="none"
        style={[
          styles.bottomTone,
          {
            backgroundColor: isNight
              ? "rgba(128,62,115,0.10)"
              : "rgba(225,177,151,0.14)",
          },
        ]}
      />

      {/* SOFT OVERLAY */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isNight
              ? "rgba(2,4,10,0.12)"
              : "rgba(255,255,255,0.12)",
          },
        ]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },

  /*
   * These are broad, heavily overlapping fields.
   * They are deliberately oversized so their edges
   * stay outside the visible screen as much as possible.
   */

  topTone: {
    position: "absolute",
    width: "150%",
    height: "48%",
    top: "-16%",
    left: "-25%",
    borderRadius: 220,
    transform: [
      {
        rotate: "-8deg",
      },
    ],
  },

  topViolet: {
    position: "absolute",
    width: "105%",
    height: "36%",
    top: "2%",
    right: "-28%",
    borderRadius: 200,
    transform: [
      {
        rotate: "10deg",
      },
    ],
  },

  middleTone: {
    position: "absolute",
    width: "125%",
    height: "54%",
    top: "20%",
    left: "-42%",
    borderRadius: 240,
    transform: [
      {
        rotate: "7deg",
      },
    ],
  },

  middleWarm: {
    position: "absolute",
    width: "110%",
    height: "48%",
    top: "37%",
    right: "-38%",
    borderRadius: 220,
    transform: [
      {
        rotate: "-9deg",
      },
    ],
  },

  bottomTone: {
    position: "absolute",
    width: "150%",
    height: "42%",
    bottom: "-17%",
    left: "-28%",
    borderRadius: 220,
    transform: [
      {
        rotate: "5deg",
      },
    ],
  },
});
