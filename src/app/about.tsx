import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";
import { useTheme } from "../theme/ThemeContext";

const APP_VERSION = "1.0.0";

export default function AboutScreen() {
  const { fontColor, themeMode } = useTheme();
  const isNight = themeMode === "night";
  const secondary = isNight ? "rgba(255,255,255,0.64)" : "rgba(24,24,24,0.62)";
  const muted = isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)";

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={10}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={fontColor}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: fontColor }]}>About</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.heroIcon, { backgroundColor: `${fontColor}16` }]}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={38}
            color={fontColor}
          />
        </View>

        <Text style={[styles.appTitle, { color: fontColor }]}>
          Bible Journey
        </Text>

        <Text style={[styles.tagline, { color: secondary }]}>
          An app to help the brothers and sisters in the Lord to develop the
          daily habit of reading the Word and completing the Bible in one year.
        </Text>

        <GlassCard intensity={45} style={styles.card}>
          <View style={styles.infoRow}>
            <View
              style={[styles.infoIcon, { backgroundColor: `${fontColor}12` }]}
            >
              <MaterialCommunityIcons
                name="tag-outline"
                size={21}
                color={fontColor}
              />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: secondary }]}>
                VERSION
              </Text>
              <Text style={[styles.infoValue, { color: fontColor }]}>
                {APP_VERSION}
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard intensity={45} style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: fontColor }]}>
              About Bible Journey
            </Text>
          </View>
          <Text style={[styles.body, { color: secondary }]}>
            Bible Journey is designed to help us come to the Word day by day,
            build a consistent habit of reading, and complete the Bible in one
            year.
          </Text>
        </GlassCard>

        <Text style={[styles.footer, { color: muted }]}>
          Eat, Digest and Assimilate Christ!
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  appTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  body: {
    fontSize: 12,
    lineHeight: 19,
  },
  footer: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 26,
  },
});
