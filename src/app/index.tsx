import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";
import { readingPlan } from "../constants/readingPlan";
import { useTheme } from "../theme/ThemeContext";

const COMPLETED_DAYS_KEY = "completedDays";
const START_DATE_KEY = "startDate";

const TOTAL_DAYS = 365;
const TOTAL_BIBLE_CHAPTERS = 1189;

const READING_BIBLE_URL =
  "https://newsletters.lsm.org/having-this-ministry/issues/Sep2021-005/reading-bible.html";

const HYMNAL_URL = "https://www.hymnal.net/en/home";

const RECOVERY_VERSION_URL = "https://text.recoveryversion.bible/";

const EMANNA_URL = "https://www.emanna.com/";

const LSM_URL = "https://www.lsm.org/";

/*
 * Premium icon system
 *
 * Bible       → blue
 * Fire        → orange
 * Calendar    → sky blue
 * Achievement → lime/gold
 */
const HOME_ICON_COLORS = {
  bible: "#3578C8",
  fire: "#F69833",
  calendar: "#419BF9",
  trophy: "#C8CF2D",
} as const;

/* =========================================================
   DATE / PROGRESS HELPERS
   ========================================================= */

function parseDate(value: string | null) {
  if (!value) return null;

  const parts = value.split("-");

  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function dayDiff(from: Date, to: Date) {
  const start = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  ).getTime();

  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();

  return Math.floor((end - start) / 86400000);
}

function getCurrentDay(startDate: string | null) {
  const parsed = parseDate(startDate);

  if (!parsed) return 1;

  return Math.min(TOTAL_DAYS, Math.max(1, dayDiff(parsed, new Date()) + 1));
}

function chapterCount(reference: string) {
  const matches = reference.match(/(\d+)(?:\s*[–-]\s*(\d+))?/g);

  if (!matches) return 0;

  return matches.reduce((total, item) => {
    const parts = item.split(/[–-]/);

    const first = Number(parts[0]);

    if (parts.length === 1) {
      return total + 1;
    }

    const last = Number(parts[1]);

    return total + Math.max(1, last - first + 1);
  }, 0);
}

function getCurrentStreak(completedDays: number[], currentDay: number) {
  const completed = new Set(completedDays);

  let streak = 0;

  for (let day = Math.min(currentDay, TOTAL_DAYS); day >= 1; day -= 1) {
    if (!completed.has(day)) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getLongestStreak(completedDays: number[]) {
  const sorted = [...new Set(completedDays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= TOTAL_DAYS)
    .sort((a, b) => a - b);

  let longest = 0;
  let running = 0;
  let previous = -999;

  for (const day of sorted) {
    running = day === previous + 1 ? running + 1 : 1;

    longest = Math.max(longest, running);

    previous = day;
  }

  return longest;
}

function getWeekDays(currentDay: number) {
  const weekStart = Math.floor((currentDay - 1) / 7) * 7 + 1;

  return Array.from({ length: 7 }, (_, index) =>
    Math.min(weekStart + index, TOTAL_DAYS),
  );
}

function getDayLabel(index: number) {
  return ["M", "T", "W", "T", "F", "S", "S"][index];
}

/* =========================================================
   ANIMATED PROGRESS BAR
   ========================================================= */

function AnimatedProgressBar({
  progress,
  color,
  trackColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedValue, progress]);

  const width = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.progressTrack,
        {
          backgroundColor: trackColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          {
            width,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({
  value,
  label,
  icon,
  fontColor,
  iconColor,
  secondary,
  background,
}: {
  value: number;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  fontColor: string;
  iconColor: string;
  secondary: string;
  background: string;
}) {
  return (
    <GlassCard intensity={68} style={styles.statCard}>
      <View style={styles.statContent}>
        <View style={styles.statTextArea}>
          <Text
            style={[
              styles.statValue,
              {
                color: fontColor,
              },
            ]}
          >
            {value}
          </Text>

          <Text
            style={[
              styles.statLabel,
              {
                color: secondary,
              },
            ]}
          >
            {label}
          </Text>
        </View>

        <View
          style={[
            styles.statIcon,
            {
              backgroundColor: background,
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={23} color={iconColor} />
        </View>
      </View>
    </GlassCard>
  );
}

/* =========================================================
   HOME SCREEN
   ========================================================= */

export default function HomeScreen() {
  const { fontColor, themeMode } = useTheme();

  const isNight = themeMode === "night";

  const secondary = isNight ? "rgba(255,255,255,0.58)" : "rgba(24,24,24,0.58)";

  const muted = isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)";

  const softSurface = isNight
    ? "rgba(255,255,255,0.07)"
    : "rgba(24,24,24,0.055)";

  const strongSurface = isNight
    ? "rgba(255,255,255,0.12)"
    : "rgba(24,24,24,0.08)";

  const progressTrack = isNight
    ? "rgba(255,255,255,0.09)"
    : "rgba(24,24,24,0.09)";

  const [completedDays, setCompletedDays] = useState<number[]>([]);

  const [startDate, setStartDate] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, []),
  );

  async function loadData() {
    try {
      const [savedCompleted, savedStartDate] = await Promise.all([
        AsyncStorage.getItem(COMPLETED_DAYS_KEY),
        AsyncStorage.getItem(START_DATE_KEY),
      ]);

      if (savedCompleted) {
        try {
          const parsed = JSON.parse(savedCompleted);

          if (Array.isArray(parsed)) {
            const cleaned = [
              ...new Set(
                parsed
                  .map(Number)
                  .filter(
                    (day) =>
                      Number.isInteger(day) && day >= 1 && day <= TOTAL_DAYS,
                  ),
              ),
            ].sort((a, b) => a - b);

            setCompletedDays(cleaned);
          } else {
            setCompletedDays([]);
          }
        } catch {
          setCompletedDays([]);
        }
      } else {
        setCompletedDays([]);
      }

      setStartDate(savedStartDate);
    } catch (error) {
      console.log("Error loading home data:", error);
    }
  }

  const currentDay = useMemo(() => getCurrentDay(startDate), [startDate]);

  const todayReading =
    readingPlan.find((item) => item.day === currentDay) ?? readingPlan[0];

  const todayComplete = completedDays.includes(currentDay);

  const completedCount = completedDays.length;

  const chaptersRead = completedDays.reduce((total, day) => {
    const reading = readingPlan.find((item) => item.day === day);

    return total + chapterCount(reading?.reference ?? "");
  }, 0);

  const currentStreak = getCurrentStreak(completedDays, currentDay);

  const longestStreak = getLongestStreak(completedDays);

  const overallProgress = completedCount / TOTAL_DAYS;

  const weekDays = getWeekDays(currentDay);

  const completedThisWeek = weekDays.filter((day) =>
    completedDays.includes(day),
  ).length;

  const weekProgress = completedThisWeek / weekDays.length;

  const weekStart = weekDays[0];

  const weekEnd = weekDays[weekDays.length - 1];

  const missedDays = useMemo(() => {
    if (currentDay <= 1) {
      return [];
    }

    const completed = new Set(completedDays);

    return Array.from(
      {
        length: currentDay - 1,
      },
      (_, index) => index + 1,
    ).filter((day) => !completed.has(day));
  }, [completedDays, currentDay]);

  const nextMissedDay = missedDays[0] ?? null;

  const nextMissedReading =
    nextMissedDay === null
      ? null
      : (readingPlan.find((item) => item.day === nextMissedDay) ?? null);

  function openReading(day: number) {
    router.push({
      pathname: "/reading",
      params: {
        day: day.toString(),
      },
    });
  }

  async function openWeb(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      console.log("Could not open:", url);
    }
  }

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);

              await loadData();

              setRefreshing(false);
            }}
            tintColor={fontColor}
            colors={[fontColor]}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <View style={styles.header}>
          <Text
            style={[
              styles.appLabel,
              {
                color: secondary,
              },
            ]}
          >
            BIBLE JOURNEY
          </Text>

          <Text
            style={[
              styles.greeting,
              {
                color: fontColor,
              },
            ]}
          >
            {greeting}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: secondary,
              },
            ]}
          >
            Stay in the Word, day by day.
          </Text>
        </View>

        {/* =================================================
            TODAY'S READING
            ================================================= */}

        <GlassCard intensity={isNight ? 82 : 76} style={styles.todayCard}>
          <View style={styles.todayTop}>
            <View
              style={[
                styles.todayIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.bible}14`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={26}
                color={HOME_ICON_COLORS.bible}
              />
            </View>

            <View style={styles.todayStatus}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: todayComplete ? fontColor : secondary,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: secondary,
                  },
                ]}
              >
                {todayComplete ? "FINISHED TODAY" : "TODAY'S READING"}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.todayDay,
              {
                color: secondary,
              },
            ]}
          >
            DAY {currentDay}
          </Text>

          <Text
            style={[
              styles.todayReference,
              {
                color: fontColor,
              },
            ]}
          >
            {todayReading?.reference ?? "Today's reading"}
          </Text>

          <Text
            style={[
              styles.todayMeta,
              {
                color: secondary,
              },
            ]}
          >
            {chapterCount(todayReading?.reference ?? "")}{" "}
            {chapterCount(todayReading?.reference ?? "") === 1
              ? "chapter"
              : "chapters"}{" "}
            to read today
          </Text>

          <Pressable
            onPress={() => openReading(currentDay)}
            style={({ pressed }) => [
              styles.todayButton,
              {
                backgroundColor: fontColor,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.todayButtonText,
                {
                  color: isNight ? "#090B14" : "#FFFFFF",
                },
              ]}
            >
              {todayComplete ? "Review Today's Reading" : "Read Today"}
            </Text>

            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={isNight ? "#090B14" : "#FFFFFF"}
            />
          </Pressable>
        </GlassCard>

        {/* =================================================
            MISSED READING
            ================================================= */}

        {missedDays.length > 0 && (
          <GlassCard intensity={72} style={styles.missedCard}>
            <View style={styles.missedHeader}>
              <View
                style={[
                  styles.missedIcon,
                  {
                    backgroundColor: `${HOME_ICON_COLORS.calendar}12`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="book-alert-outline"
                  size={23}
                  color={HOME_ICON_COLORS.calendar}
                />
              </View>

              <View style={styles.missedTextArea}>
                <Text
                  style={[
                    styles.missedTitle,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  Missed Reading
                </Text>

                <Text
                  style={[
                    styles.missedDescription,
                    {
                      color: secondary,
                    },
                  ]}
                >
                  You have missed {missedDays.length} reading day
                  {missedDays.length === 1 ? "" : "s"}. Pick up where you left
                  off at your own pace.
                </Text>

                {nextMissedReading && (
                  <Text
                    style={[
                      styles.missedReference,
                      {
                        color: muted,
                      },
                    ]}
                  >
                    Next missed: Day {nextMissedDay} ·{" "}
                    {nextMissedReading.reference}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.missedButtons}>
              <Pressable
                onPress={() => {
                  if (nextMissedDay !== null) {
                    openReading(nextMissedDay);
                  }
                }}
                style={({ pressed }) => [
                  styles.missedPrimaryButton,
                  {
                    backgroundColor: fontColor,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.missedPrimaryText,
                    {
                      color: isNight ? "#090B14" : "#FFFFFF",
                    },
                  ]}
                >
                  Catch Up Today
                </Text>

                <MaterialCommunityIcons
                  name="arrow-right"
                  size={19}
                  color={isNight ? "#090B14" : "#FFFFFF"}
                />
              </Pressable>

              <Pressable
                onPress={() => openReading(currentDay)}
                style={({ pressed }) => [
                  styles.missedSecondaryButton,
                  {
                    backgroundColor: softSurface,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.missedSecondaryText,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  Resume Plan
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {/* =================================================
            CURRENT STREAK
            ================================================= */}

        <GlassCard intensity={72} style={styles.streakCard}>
          <View style={styles.streakContent}>
            <View style={styles.streakTextArea}>
              <Text
                style={[
                  styles.smallLabel,
                  {
                    color: secondary,
                  },
                ]}
              >
                CURRENT STREAK
              </Text>

              <View style={styles.streakNumberRow}>
                <Text
                  style={[
                    styles.streakNumber,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  {currentStreak}
                </Text>

                <Text
                  style={[
                    styles.streakDays,
                    {
                      color: secondary,
                    },
                  ]}
                >
                  {currentStreak === 1 ? "day" : "days"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.largeFeatureIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.fire}14`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="fire"
                size={29}
                color={HOME_ICON_COLORS.fire}
              />
            </View>
          </View>
        </GlassCard>

        {/* =================================================
            THIS WEEK
            ================================================= */}

        <GlassCard intensity={70} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                This Week
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Days {weekStart}–{weekEnd}
              </Text>
            </View>

            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.calendar}12`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-week-outline"
                size={21}
                color={HOME_ICON_COLORS.calendar}
              />
            </View>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day, index) => {
              const complete = completedDays.includes(day);

              const today = day === currentDay;

              const future = day > currentDay;

              return (
                <Pressable
                  key={day}
                  disabled={future}
                  onPress={() => openReading(day)}
                  style={[
                    styles.weekItem,
                    {
                      opacity: future ? 0.35 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.weekLabel,
                      {
                        color: muted,
                      },
                    ]}
                  >
                    {getDayLabel(index)}
                  </Text>

                  <View
                    style={[
                      styles.weekCircle,
                      {
                        backgroundColor: complete
                          ? fontColor
                          : today
                            ? strongSurface
                            : softSurface,
                        borderColor: today ? fontColor : "transparent",
                        borderWidth: today ? 1 : 0,
                      },
                    ]}
                  >
                    {complete ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={isNight ? "#090B14" : "#FFFFFF"}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.weekNumber,
                          {
                            color: secondary,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <AnimatedProgressBar
            progress={weekProgress}
            color={fontColor}
            trackColor={progressTrack}
          />

          <View style={styles.weekFooter}>
            <Text
              style={[
                styles.progressMeta,
                {
                  color: secondary,
                },
              ]}
            >
              {completedThisWeek} of {weekDays.length} days completed
            </Text>

            <Text
              style={[
                styles.progressPercent,
                {
                  color: fontColor,
                },
              ]}
            >
              {Math.round(weekProgress * 100)}%
            </Text>
          </View>
        </GlassCard>

        {/* =================================================
            OVERALL PROGRESS
            ================================================= */}

        <GlassCard intensity={70} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Overall Progress
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                {completedCount} of {TOTAL_DAYS} reading days
              </Text>
            </View>

            <View
              style={[
                styles.progressIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.trophy}12`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chart-donut"
                size={22}
                color={HOME_ICON_COLORS.trophy}
              />
            </View>
          </View>

          <Text
            style={[
              styles.overallPercent,
              {
                color: fontColor,
              },
            ]}
          >
            {Math.round(overallProgress * 100)}%
          </Text>

          <AnimatedProgressBar
            progress={overallProgress}
            color={fontColor}
            trackColor={progressTrack}
          />

          <View style={styles.progressFooter}>
            <View style={styles.progressStat}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={16}
                color={HOME_ICON_COLORS.bible}
              />

              <Text
                style={[
                  styles.progressMeta,
                  {
                    color: secondary,
                  },
                ]}
              >
                {chaptersRead} / {TOTAL_BIBLE_CHAPTERS} chapters
              </Text>
            </View>

            <View style={styles.progressStat}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={16}
                color={HOME_ICON_COLORS.trophy}
              />

              <Text
                style={[
                  styles.progressMeta,
                  {
                    color: secondary,
                  },
                ]}
              >
                Best: {longestStreak}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* =================================================
            YOUR JOURNEY
            ================================================= */}

        <View style={styles.sectionHeading}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: fontColor,
              },
            ]}
          >
            Your Journey
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: secondary,
              },
            ]}
          >
            Your progress through the Word
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            value={chaptersRead}
            label="Chapters Read"
            icon="book-open-variant"
            iconColor={HOME_ICON_COLORS.bible}
            fontColor={fontColor}
            secondary={secondary}
            background={`${HOME_ICON_COLORS.bible}12`}
          />

          <StatCard
            value={completedCount}
            label="Days Completed"
            icon="calendar-check-outline"
            iconColor={HOME_ICON_COLORS.calendar}
            fontColor={fontColor}
            secondary={secondary}
            background={`${HOME_ICON_COLORS.calendar}12`}
          />

          <StatCard
            value={currentStreak}
            label="Current Streak"
            icon="fire"
            iconColor={HOME_ICON_COLORS.fire}
            fontColor={fontColor}
            secondary={secondary}
            background={`${HOME_ICON_COLORS.fire}12`}
          />

          <StatCard
            value={longestStreak}
            label="Longest Streak"
            icon="trophy-outline"
            iconColor={HOME_ICON_COLORS.trophy}
            fontColor={fontColor}
            secondary={secondary}
            background={`${HOME_ICON_COLORS.trophy}12`}
          />
        </View>

        {/* =================================================
            ENCOURAGEMENT
            ================================================= */}

        <GlassCard intensity={68} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Encouragement
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Let the Word dwell in you richly.
              </Text>
            </View>

            <View
              style={[
                styles.simpleIcon,
                {
                  backgroundColor: softSurface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="heart-outline"
                size={20}
                color={fontColor}
              />
            </View>
          </View>

          <Text
            style={[
              styles.quote,
              {
                color: secondary,
              },
            ]}
          >
            &quot;Your word is a lamp to my feet and a light to my path.&quot;
          </Text>

          <Text
            style={[
              styles.referenceText,
              {
                color: muted,
              },
            ]}
          >
            Psalm 119:105
          </Text>

          <View style={styles.divider} />

          <Text
            style={[
              styles.quote,
              {
                color: secondary,
              },
            ]}
          >
            &quot;All Scripture is God-breathed and profitable for teaching, for
            conviction, for correction, for instruction in righteousness, that
            the man of God may be complete, fully equipped for every good
            work.&quot;
          </Text>

          <Text
            style={[
              styles.referenceText,
              {
                color: muted,
              },
            ]}
          >
            2 Tim. 3:16-17
          </Text>

          <View style={styles.divider} />

          <Text
            style={[
              styles.quote,
              {
                color: secondary,
              },
            ]}
          >
            &quot;Let the word of Christ dwell in you richly in all wisdom,
            teaching and admonishing one another with psalms and hymns and
            spiritual songs.&quot;
          </Text>

          <Text
            style={[
              styles.referenceText,
              {
                color: muted,
              },
            ]}
          >
            Col. 3:16
          </Text>

          <View style={styles.divider} />

          <Text
            style={[
              styles.quote,
              {
                color: secondary,
              },
            ]}
          >
            &quot;For the word of God is living and operative and sharper than
            any two-edged sword.&quot;
          </Text>

          <Text
            style={[
              styles.referenceText,
              {
                color: muted,
              },
            ]}
          >
            Heb. 4:12
          </Text>

          <View style={styles.divider} />

          {/* =================================================
              READING THE BIBLE
              ================================================= */}

          <Pressable
            onPress={() => void openWeb(READING_BIBLE_URL)}
            style={[
              styles.webCard,
              {
                backgroundColor: softSurface,
              },
            ]}
          >
            <View
              style={[
                styles.webIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.bible}12`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={20}
                color={HOME_ICON_COLORS.bible}
              />
            </View>

            <View style={styles.webText}>
              <Text
                style={[
                  styles.webTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Reading the Bible
              </Text>

              <Text
                style={[
                  styles.webDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Read more about the importance of spending time in God's Word.
              </Text>

              <Text
                style={[
                  styles.webLink,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Open webpage
              </Text>
            </View>

            <View style={styles.externalIcon}>
              <MaterialCommunityIcons
                name="arrow-up-right"
                size={18}
                color={secondary}
              />
            </View>
          </Pressable>

          {/* =================================================
              HYMNAL.NET
              ================================================= */}

          <Pressable
            onPress={() => void openWeb(HYMNAL_URL)}
            style={[
              styles.webCard,
              styles.hymnal,
              {
                backgroundColor: softSurface,
              },
            ]}
          >
            <View
              style={[
                styles.webIcon,
                {
                  backgroundColor: strongSurface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="music-note-outline"
                size={20}
                color={fontColor}
              />
            </View>

            <View style={styles.webText}>
              <Text
                style={[
                  styles.webTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Hymnal.net
              </Text>

              <Text
                style={[
                  styles.webDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Explore hymns, hymnal resources, and songs for the Christian
                life.
              </Text>

              <Text
                style={[
                  styles.webLink,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Open Hymnal.net
              </Text>
            </View>

            <View style={styles.externalIcon}>
              <MaterialCommunityIcons
                name="arrow-up-right"
                size={18}
                color={secondary}
              />
            </View>
          </Pressable>

          {/* =================================================
              RECOVERY VERSION
              ================================================= */}

          <Pressable
            onPress={() => void openWeb(RECOVERY_VERSION_URL)}
            style={[
              styles.webCard,
              styles.hymnal,
              {
                backgroundColor: softSurface,
              },
            ]}
          >
            <View
              style={[
                styles.webIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.bible}12`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="book-outline"
                size={21}
                color={HOME_ICON_COLORS.bible}
              />
            </View>

            <View style={styles.webText}>
              <Text
                style={[
                  styles.webTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Recovery Version Bible
              </Text>

              <Text
                style={[
                  styles.webDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Read the Recovery Version Bible online.
              </Text>

              <Text
                style={[
                  styles.webLink,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Open Recovery Version
              </Text>
            </View>

            <View style={styles.externalIcon}>
              <MaterialCommunityIcons
                name="arrow-up-right"
                size={18}
                color={secondary}
              />
            </View>
          </Pressable>

          {/* =================================================
              EMANNA
              ================================================= */}

          <Pressable
            onPress={() => void openWeb(EMANNA_URL)}
            style={[
              styles.webCard,
              styles.hymnal,
              {
                backgroundColor: softSurface,
              },
            ]}
          >
            <View
              style={[
                styles.webIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.calendar}12`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="food-apple-outline"
                size={20}
                color={HOME_ICON_COLORS.calendar}
              />
            </View>

            <View style={styles.webText}>
              <Text
                style={[
                  styles.webTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                eManna
              </Text>

              <Text
                style={[
                  styles.webDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Enjoy daily spiritual nourishment from God's Word.
              </Text>

              <Text
                style={[
                  styles.webLink,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Open eManna
              </Text>
            </View>

            <View style={styles.externalIcon}>
              <MaterialCommunityIcons
                name="arrow-up-right"
                size={18}
                color={secondary}
              />
            </View>
          </Pressable>

          {/* =================================================
              LIVING STREAM MINISTRY
              ================================================= */}

          <Pressable
            onPress={() => void openWeb(LSM_URL)}
            style={[
              styles.webCard,
              styles.hymnal,
              {
                backgroundColor: softSurface,
              },
            ]}
          >
            <View
              style={[
                styles.webIcon,
                {
                  backgroundColor: `${HOME_ICON_COLORS.trophy}12`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="library-outline"
                size={21}
                color={HOME_ICON_COLORS.trophy}
              />
            </View>

            <View style={styles.webText}>
              <Text
                style={[
                  styles.webTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Living Stream Ministry
              </Text>

              <Text
                style={[
                  styles.webDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                Explore Christian ministry resources and publications.
              </Text>

              <Text
                style={[
                  styles.webLink,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Open LSM.org
              </Text>
            </View>

            <View style={styles.externalIcon}>
              <MaterialCommunityIcons
                name="arrow-up-right"
                size={18}
                color={secondary}
              />
            </View>
          </Pressable>
        </GlassCard>

        {/* =================================================
            FOOTER
            ================================================= */}

        <Text
          style={[
            styles.footer,
            {
              color: muted,
            },
          ]}
        >
          Eat, Digest and Assimilate Christ!
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 125,
  },

  /* =======================================================
     HEADER
     ======================================================= */

  header: {
    marginBottom: 20,
  },

  appLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 2.6,
    marginBottom: 7,
  },

  greeting: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    letterSpacing: 0.05,
    marginTop: 5,
  },

  /* =======================================================
     TODAY'S READING
     ======================================================= */

  todayCard: {
    padding: 20,
    borderRadius: 28,
  },

  todayTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  todayIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  todayStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  todayDay: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 27,
  },

  todayReference: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -0.9,
    marginTop: 6,
  },

  todayMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.05,
    marginTop: 7,
    marginBottom: 24,
  },

  todayButton: {
    minHeight: 55,
    borderRadius: 17,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  todayButtonText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  /* =======================================================
     MISSED READING
     ======================================================= */

  missedCard: {
    marginTop: 10,
    padding: 17,
    borderRadius: 23,
  },

  missedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  missedIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },

  missedTextArea: {
    flex: 1,
    minWidth: 0,
  },

  missedTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: -0.15,
  },

  missedDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    marginTop: 4,
  },

  missedReference: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginTop: 5,
  },

  missedButtons: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },

  missedPrimaryButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  missedPrimaryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },

  missedSecondaryButton: {
    flex: 0.9,
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  missedSecondaryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },

  /* =======================================================
     CURRENT STREAK
     ======================================================= */

  streakCard: {
    marginTop: 10,
    padding: 17,
    borderRadius: 23,
  },

  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  streakTextArea: {
    flex: 1,
    minWidth: 0,
  },

  smallLabel: {
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  streakNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 3,
  },

  streakNumber: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  streakDays: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  largeFeatureIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  /* =======================================================
     GENERAL CARDS
     ======================================================= */

  card: {
    marginTop: 10,
    padding: 18,
    borderRadius: 23,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  cardDescription: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    letterSpacing: 0.05,
    marginTop: 3,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  simpleIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  /* =======================================================
     WEEK
     ======================================================= */

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  weekItem: {
    alignItems: "center",
  },

  weekLabel: {
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 7,
  },

  weekCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  weekNumber: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },

  /* =======================================================
     PROGRESS
     ======================================================= */

  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 17,
  },

  progressFill: {
    height: "100%",
    borderRadius: 99,
  },

  weekFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },

  progressMeta: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
    letterSpacing: 0.05,
  },

  progressPercent: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  overallPercent: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 17,
  },

  progressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },

  progressStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  /* =======================================================
     YOUR JOURNEY
     ======================================================= */

  sectionHeading: {
    marginTop: 27,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.45,
  },

  sectionSubtitle: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },

  statCard: {
    width: "48.3%",
    minHeight: 112,
    borderRadius: 20,
    padding: 14,
  },

  statContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statTextArea: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingRight: 6,
  },

  statValue: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  statLabel: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.05,
    marginTop: 3,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* =======================================================
     ENCOURAGEMENT
     ======================================================= */

  quote: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "500",
    letterSpacing: 0.05,
    marginTop: 12,
  },

  referenceText: {
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.25,
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.13)",
    marginTop: 16,
  },

  /* =======================================================
     WEB RESOURCES
     ======================================================= */

  webCard: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  hymnal: {
    marginTop: 10,
  },

  webIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  webText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  webTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  webDescription: {
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 3,
  },

  webLink: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 0.1,
    marginTop: 5,
  },

  externalIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     FOOTER
     ======================================================= */

  footer: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 18,
    paddingHorizontal: 28,
  },
});
