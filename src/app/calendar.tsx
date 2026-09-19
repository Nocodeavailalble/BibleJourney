import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";
import { useTheme } from "../theme/ThemeContext";

const COMPLETED_DAYS_KEY = "completedDays";
const CHAPTER_PROGRESS_KEY = "chapterProgress";
const START_DATE_KEY = "startDate";
const ANNOUNCED_LONGEST_STREAK_KEY = "historyAnnouncedLongestStreak";
const ANNOUNCED_MILESTONE_KEY = "historyAnnouncedMilestone";
const ANNOUNCED_ACHIEVEMENT_KEY = "historyAnnouncedAchievement";
const RECOVERED_READING_COUNT_KEY = "recoveredReadingCount";
const RECOVERY_TRACKING_KEY = "recoveryTrackingCompletedDays";

const CHAPTER_ICON_COLOR = "#3B82F6";
const DAYS_ICON_COLOR = "#22C55E";
const CURRENT_STREAK_ICON_COLOR = "#F97316";
const LONGEST_STREAK_ICON_COLOR = "#8B5CF6";

type ChapterProgress = Record<string, boolean>;

type DayState = "future" | "today" | "completed" | "missed" | "unavailable";

type CalendarCell = {
  date: Date | null;
  dayOfMonth: number | null;
  dayNumber: number | null;
  state: DayState;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STREAK_MILESTONES: number[] = [];
for (let milestone = 7; milestone < 365; milestone += 7) {
  STREAK_MILESTONES.push(milestone);
}
STREAK_MILESTONES.push(365);

type Achievement = {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type CelebrationItem = {
  kind: "milestone" | "achievement";
  label: string;
  title: string;
};

type CelebrationState = {
  title: string;
  subtitle: string;
  items: CelebrationItem[];
} | null;

const BIBLE_BOOK_CHAPTERS: Record<string, number> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
};

const OLD_TESTAMENT_BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
];

const NEW_TESTAMENT_BOOKS = [
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function getCompletedBibleChapters(
  chapterProgress: ChapterProgress,
  books: string[],
): number {
  return books.reduce((total, book) => {
    const chapterCount = BIBLE_BOOK_CHAPTERS[book] ?? 0;
    let completed = 0;

    for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
      if (chapterProgress[`${book}:${chapter}`] === true) {
        completed += 1;
      }
    }

    return total + completed;
  }, 0);
}

function isBookComplete(
  chapterProgress: ChapterProgress,
  book: string,
): boolean {
  const chapterCount = BIBLE_BOOK_CHAPTERS[book] ?? 0;

  if (chapterCount === 0) return false;

  for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
    if (chapterProgress[`${book}:${chapter}`] !== true) {
      return false;
    }
  }

  return true;
}

function getBibleAchievementDefinitions(): Achievement[] {
  return [
    {
      id: "old-testament-begun",
      title: "Old Testament Begun",
      description: "Complete your first Old Testament reading.",
      detail: "Your journey through the Old Testament has begun.",
      icon: "book-open-page-variant",
    },
    {
      id: "new-testament-begun",
      title: "New Testament Begun",
      description: "Reach the New Testament.",
      detail:
        "You have reached the New Testament and continued your journey through Scripture.",
      icon: "book-open-page-variant",
    },
    {
      id: "genesis-complete",
      title: "Genesis Complete",
      description: "Finish Genesis.",
      detail: "All 50 chapters of Genesis have been completed.",
      icon: "book-check",
    },
    {
      id: "gospels-complete",
      title: "Gospels Complete",
      description: "Finish Matthew–John.",
      detail:
        "You have completed the four Gospels: Matthew, Mark, Luke, and John.",
      icon: "foot-print",
    },
    {
      id: "psalms-complete",
      title: "Psalms Complete",
      description: "Finish Psalms.",
      detail: "All 150 Psalms have been completed.",
      icon: "music-note",
    },
    {
      id: "proverbs-complete",
      title: "Proverbs Complete",
      description: "Finish Proverbs.",
      detail: "All 31 chapters of Proverbs have been completed.",
      icon: "lightbulb-outline",
    },
    {
      id: "new-testament-complete",
      title: "New Testament Complete",
      description: "Finish the New Testament.",
      detail:
        "All 27 books and 260 chapters of the New Testament have been completed.",
      icon: "thumb-up-outline",
    },
    {
      id: "whole-bible-complete",
      title: "Whole Bible Complete",
      description: "Complete the entire 365-day plan.",
      detail: "The complete one-year Bible reading journey has been finished.",
      icon: "trophy",
    },
    {
      id: "back-on-track",
      title: "Back on Track",
      description: "Complete a missed reading.",
      detail: "You returned to a missed reading and continued your journey.",
      icon: "backup-restore",
    },
    {
      id: "comeback",
      title: "Comeback",
      description: "Recover 3 missed readings.",
      detail: "Three missed readings have been recovered. Keep moving forward.",
      icon: "refresh",
    },
    {
      id: "faithful-again",
      title: "Faithful Again",
      description: "Recover 7 missed readings.",
      detail:
        "Seven missed readings have been recovered through continued faithfulness.",
      icon: "restore",
    },
  ];
}

const ACHIEVEMENTS = getBibleAchievementDefinitions();

function getCurrentStreakMilestone(streak: number): number {
  if (streak <= 0) return 7;
  if (streak >= 365) return 365;
  return Math.max(7, Math.floor(streak / 7) * 7);
}

function getNextMilestone(streak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (streak < milestone) return milestone;
  }
  return null;
}

const MILESTONE_CHARACTERS: string[] = [
  "Adam",
  "Noah",
  "Abraham",
  "Sarah",
  "Isaac",
  "Jacob",
  "Joseph",
  "Moses",
  "Aaron",
  "Joshua",
  "Rahab",
  "Deborah",
  "Ruth",
  "Samuel",
  "David",
  "Solomon",
  "Elijah",
  "Elisha",
  "Isaiah",
  "Jeremiah",
  "Ezekiel",
  "Daniel",
  "Esther",
  "Ezra",
  "Nehemiah",
  "Job",
  "Jonah",
  "John the Baptist",
  "Mary",
  "Joseph",
  "Peter",
  "Andrew",
  "James",
  "John",
  "Matthew",
  "Thomas",
  "Paul",
  "Barnabas",
  "Stephen",
  "Philip",
  "Timothy",
  "Titus",
  "Luke",
  "Mark",
  "Priscilla",
  "Aquila",
  "Lydia",
  "Silas",
  "Apollos",
  "Phoebe",
  "Lazarus",
  "Martha",
  "Mary Magdalene",
  "Jesus",
];

function getMilestoneCharacter(milestone: number): string {
  const index = Math.max(0, Math.floor(milestone / 7) - 1);
  return (
    MILESTONE_CHARACTERS[index] ??
    MILESTONE_CHARACTERS[MILESTONE_CHARACTERS.length - 1]
  );
}

function getMilestoneIcon(
  finished: boolean,
): keyof typeof MaterialCommunityIcons.glyphMap {
  return finished ? "check-circle" : "lock-outline";
}

function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function startOfDay(date: Date): Date {
  return createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function differenceInDays(from: Date, to: Date): number {
  const first = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());

  const second = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());

  return Math.round((second - first) / (1000 * 60 * 60 * 24));
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return createLocalDate(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
}

function calculateCurrentStreak(
  completedDays: number[],
  todayDayNumber: number,
): number {
  const completed = new Set(completedDays);

  if (todayDayNumber <= 0) {
    return 0;
  }

  let cursor = completed.has(todayDayNumber)
    ? todayDayNumber
    : todayDayNumber - 1;

  let streak = 0;

  while (cursor >= 1 && completed.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }

  return streak;
}

function calculateLongestStreak(completedDays: number[]): number {
  if (completedDays.length === 0) {
    return 0;
  }

  const sorted = [...new Set(completedDays)].sort((a, b) => a - b);

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function calculateWeeklyProgress(
  completedDays: number[],
  todayDayNumber: number,
): boolean[] {
  const completed = new Set(completedDays);

  const result: boolean[] = [];

  const startDay = Math.max(1, todayDayNumber - 6);

  for (let day = startDay; day <= todayDayNumber; day += 1) {
    result.push(completed.has(day));
  }

  while (result.length < 7) {
    result.unshift(false);
  }

  return result.slice(-7);
}

export default function CalendarScreen() {
  const { themeMode, fontColor } = useTheme();

  const isNight = themeMode === "night";
  const secondary = isNight ? "rgba(255,255,255,0.58)" : "rgba(24,24,24,0.58)";
  const muted = isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)";
  const border = isNight ? "rgba(255,255,255,0.13)" : "rgba(24,24,24,0.10)";

  const today = useMemo(() => startOfDay(new Date()), []);

  const [completedDays, setCompletedDays] = useState<number[]>([]);

  const [chapterProgress, setChapterProgress] = useState<ChapterProgress>({});

  const [startDate, setStartDate] = useState<Date | null>(null);

  const [viewDate, setViewDate] = useState<Date>(today);

  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  const [refreshing, setRefreshing] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationState>(null);
  const [announcementReady, setAnnouncementReady] = useState(false);
  const [announcedLongestStreak, setAnnouncedLongestStreak] = useState(0);
  const [announcedMilestone, setAnnouncedMilestone] = useState(0);
  const [announcedAchievement, setAnnouncedAchievement] = useState(0);
  const [recoveredReadingCount, setRecoveredReadingCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [
        savedCompleted,
        savedProgress,
        savedStartDate,
        savedAnnouncedLongest,
        savedAnnouncedMilestone,
        savedAnnouncedAchievement,
        savedRecoveredReadingCount,
        savedRecoveryTracking,
      ] = await Promise.all([
        AsyncStorage.getItem(COMPLETED_DAYS_KEY),
        AsyncStorage.getItem(CHAPTER_PROGRESS_KEY),
        AsyncStorage.getItem(START_DATE_KEY),
        AsyncStorage.getItem(ANNOUNCED_LONGEST_STREAK_KEY),
        AsyncStorage.getItem(ANNOUNCED_MILESTONE_KEY),
        AsyncStorage.getItem(ANNOUNCED_ACHIEVEMENT_KEY),
        AsyncStorage.getItem(RECOVERED_READING_COUNT_KEY),
        AsyncStorage.getItem(RECOVERY_TRACKING_KEY),
      ]);

      if (savedCompleted) {
        try {
          const parsed: unknown = JSON.parse(savedCompleted);

          if (Array.isArray(parsed)) {
            const validDays = parsed
              .map((value) => Number(value))
              .filter(
                (value) =>
                  Number.isInteger(value) && value >= 1 && value <= 365,
              );

            setCompletedDays(Array.from(new Set(validDays)));
          } else {
            setCompletedDays([]);
          }
        } catch {
          setCompletedDays([]);
        }
      } else {
        setCompletedDays([]);
      }

      const restoredRecovered = Math.max(
        0,
        Number(savedRecoveredReadingCount ?? "0"),
      );
      setRecoveredReadingCount(
        Number.isFinite(restoredRecovered) ? restoredRecovered : 0,
      );

      let previousTrackedDays: number[] | null = null;
      if (savedRecoveryTracking) {
        try {
          const parsedTracking: unknown = JSON.parse(savedRecoveryTracking);
          if (Array.isArray(parsedTracking)) {
            previousTrackedDays = parsedTracking
              .map((value) => Number(value))
              .filter(
                (value) =>
                  Number.isInteger(value) && value >= 1 && value <= 365,
              );
          }
        } catch {
          previousTrackedDays = null;
        }
      }

      const currentCompletedForTracking = Array.from(
        new Set(
          savedCompleted
            ? (() => {
                try {
                  const parsed: unknown = JSON.parse(savedCompleted);
                  return Array.isArray(parsed)
                    ? parsed
                        .map((value) => Number(value))
                        .filter(
                          (value) =>
                            Number.isInteger(value) &&
                            value >= 1 &&
                            value <= 365,
                        )
                    : [];
                } catch {
                  return [];
                }
              })()
            : [],
        ),
      );

      if (previousTrackedDays === null) {
        await AsyncStorage.setItem(
          RECOVERY_TRACKING_KEY,
          JSON.stringify(currentCompletedForTracking),
        );
      } else {
        const previousSet = new Set(previousTrackedDays);
        const newlyCompleted = currentCompletedForTracking.filter(
          (day) => !previousSet.has(day),
        );
        const recoveredNow = newlyCompleted.filter(
          (day) => day < loadedTodayDayNumber,
        ).length;

        if (recoveredNow > 0) {
          const nextRecovered =
            (Number.isFinite(restoredRecovered) ? restoredRecovered : 0) +
            recoveredNow;
          setRecoveredReadingCount(nextRecovered);
          await AsyncStorage.setItem(
            RECOVERED_READING_COUNT_KEY,
            `${nextRecovered}`,
          );
        }

        await AsyncStorage.setItem(
          RECOVERY_TRACKING_KEY,
          JSON.stringify(currentCompletedForTracking),
        );
      }

      if (savedProgress) {
        try {
          const parsed: unknown = JSON.parse(savedProgress);

          if (
            parsed !== null &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
          ) {
            const normalized: ChapterProgress = {};

            for (const [key, value] of Object.entries(parsed)) {
              if (value === true) {
                normalized[key] = true;
              }
            }

            setChapterProgress(normalized);
          } else {
            setChapterProgress({});
          }
        } catch {
          setChapterProgress({});
        }
      } else {
        setChapterProgress({});
      }

      const parsedStartDate = parseDate(savedStartDate);
      setStartDate(parsedStartDate);

      const loadedTodayDayNumber = parsedStartDate
        ? differenceInDays(parsedStartDate, today) + 1
        : 0;

      const restoredLongest = Math.max(0, Number(savedAnnouncedLongest ?? "0"));
      const restoredMilestone = Math.max(
        0,
        Number(savedAnnouncedMilestone ?? "0"),
      );
      const restoredAchievement = Math.max(
        0,
        Number(savedAnnouncedAchievement ?? "0"),
      );

      setAnnouncedLongestStreak(
        Number.isFinite(restoredLongest) ? restoredLongest : 0,
      );
      setAnnouncedMilestone(
        Number.isFinite(restoredMilestone) ? restoredMilestone : 0,
      );
      setAnnouncedAchievement(
        Number.isFinite(restoredAchievement) ? restoredAchievement : 0,
      );
      setAnnouncementReady(true);
    } catch (error) {
      setAnnouncementReady(false);
      console.log("Failed to load history data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  const todayDayNumber = useMemo(() => {
    if (!startDate) {
      return 0;
    }

    return differenceInDays(startDate, today) + 1;
  }, [startDate, today]);

  const completedSet = useMemo(() => new Set(completedDays), [completedDays]);

  const chaptersCompleted = useMemo(
    () => Object.values(chapterProgress).filter(Boolean).length,
    [chapterProgress],
  );

  const currentStreak = useMemo(
    () => calculateCurrentStreak(completedDays, todayDayNumber),
    [completedDays, todayDayNumber],
  );

  const longestStreak = useMemo(
    () => calculateLongestStreak(completedDays),
    [completedDays],
  );

  const achievementUnlockedMap = useMemo(() => {
    const oldTestamentCompleted = getCompletedBibleChapters(
      chapterProgress,
      OLD_TESTAMENT_BOOKS,
    );
    const newTestamentCompleted = getCompletedBibleChapters(
      chapterProgress,
      NEW_TESTAMENT_BOOKS,
    );
    const gospelCompleted = getCompletedBibleChapters(chapterProgress, [
      "Matthew",
      "Mark",
      "Luke",
      "John",
    ]);

    return {
      "old-testament-begun": oldTestamentCompleted > 0,
      "new-testament-begun": newTestamentCompleted > 0,
      "genesis-complete": isBookComplete(chapterProgress, "Genesis"),
      "gospels-complete": gospelCompleted === 89,
      "psalms-complete": isBookComplete(chapterProgress, "Psalms"),
      "proverbs-complete": isBookComplete(chapterProgress, "Proverbs"),
      "new-testament-complete": newTestamentCompleted === 260,
      "whole-bible-complete": chaptersCompleted === 1189,
      "back-on-track": recoveredReadingCount >= 1,
      comeback: recoveredReadingCount >= 3,
      "faithful-again": recoveredReadingCount >= 7,
    } as Record<string, boolean>;
  }, [chapterProgress, chaptersCompleted, recoveredReadingCount]);

  const unlockedAchievementList = useMemo(
    () =>
      ACHIEVEMENTS.filter(
        (achievement) => achievementUnlockedMap[achievement.id],
      ),
    [achievementUnlockedMap],
  );

  const unlockedAchievements = unlockedAchievementList.length;

  const nextAchievement = useMemo(
    () =>
      ACHIEVEMENTS.find(
        (achievement) => !achievementUnlockedMap[achievement.id],
      ) ?? null,
    [achievementUnlockedMap],
  );

  useEffect(() => {
    if (!announcementReady) {
      return;
    }

    if (unlockedAchievements <= announcedAchievement) {
      return;
    }

    const newlyVisible = unlockedAchievementList.slice(announcedAchievement);

    setCelebration({
      title:
        newlyVisible.length > 1
          ? "Achievements Unlocked!"
          : "Achievement Unlocked!",
      subtitle: "Your journey through Scripture has something to celebrate.",
      items: newlyVisible.slice(-8).map((achievement) => ({
        kind: "achievement" as const,
        label: "ACHIEVEMENT",
        title: achievement.title,
      })),
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void AsyncStorage.setItem(
      ANNOUNCED_ACHIEVEMENT_KEY,
      `${unlockedAchievements}`,
    );
    setAnnouncedAchievement(unlockedAchievements);
  }, [
    announcementReady,
    announcedAchievement,
    unlockedAchievements,
    unlockedAchievementList,
  ]);

  const currentMilestone = useMemo(
    () => getCurrentStreakMilestone(currentStreak),
    [currentStreak],
  );

  const nextMilestone = useMemo(
    () => getNextMilestone(currentStreak),
    [currentStreak],
  );

  const overallPercentage = useMemo(
    () => Math.min(100, Math.round((completedDays.length / 365) * 100)),
    [completedDays.length],
  );

  const weeklyProgress = useMemo(
    () => calculateWeeklyProgress(completedDays, todayDayNumber),
    [completedDays, todayDayNumber],
  );

  const missedDays = useMemo(() => {
    if (!startDate || todayDayNumber <= 0) {
      return 0;
    }

    let missed = 0;

    for (let day = 1; day <= todayDayNumber; day += 1) {
      if (!completedSet.has(day)) {
        missed += 1;
      }
    }

    return missed;
  }, [startDate, todayDayNumber, completedSet]);

  const monthCalendar = useMemo<CalendarCell[]>(() => {
    const year = viewDate.getFullYear();

    const month = viewDate.getMonth();

    const firstDate = createLocalDate(year, month, 1);

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const firstWeekday = firstDate.getDay();

    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({
        date: null,
        dayOfMonth: null,
        dayNumber: null,
        state: "unavailable",
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = createLocalDate(year, month, day);

      const dayNumber = startDate ? differenceInDays(startDate, date) + 1 : 0;

      let state: DayState;

      if (date > today) {
        state = "future";
      } else if (!startDate || dayNumber < 1) {
        state = "unavailable";
      } else if (completedSet.has(dayNumber)) {
        state = "completed";
      } else if (dateKey(date) === dateKey(today)) {
        state = "today";
      } else {
        state = "missed";
      }

      cells.push({
        date,
        dayOfMonth: day,
        dayNumber,
        state,
      });
    }

    const remainder = cells.length % 7;

    if (remainder !== 0) {
      for (let i = remainder; i < 7; i += 1) {
        cells.push({
          date: null,
          dayOfMonth: null,
          dayNumber: null,
          state: "unavailable",
        });
      }
    }

    return cells;
  }, [viewDate, startDate, today, completedSet]);

  const monthlyStats = useMemo(() => {
    if (!startDate) {
      return {
        completed: 0,
        missed: 0,
        total: 0,
        percentage: 0,
      };
    }

    const year = viewDate.getFullYear();

    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let completed = 0;
    let missed = 0;
    let total = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = createLocalDate(year, month, day);

      if (date > today) {
        continue;
      }

      const dayNumber = differenceInDays(startDate, date) + 1;

      if (dayNumber < 1) {
        continue;
      }

      total += 1;

      if (completedSet.has(dayNumber)) {
        completed += 1;
      } else {
        missed += 1;
      }
    }

    return {
      completed,
      missed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [startDate, viewDate, today, completedSet]);

  const selectedDayInfo = useMemo(() => {
    if (!selectedDate || !startDate) {
      return null;
    }

    const dayNumber = differenceInDays(startDate, selectedDate) + 1;

    if (dayNumber < 1) {
      return {
        dayNumber,
        state: "unavailable" as DayState,
      };
    }

    if (selectedDate > today) {
      return {
        dayNumber,
        state: "future" as DayState,
      };
    }

    if (completedSet.has(dayNumber)) {
      return {
        dayNumber,
        state: "completed" as DayState,
      };
    }

    if (dateKey(selectedDate) === dateKey(today)) {
      return {
        dayNumber,
        state: "today" as DayState,
      };
    }

    return {
      dayNumber,
      state: "missed" as DayState,
    };
  }, [selectedDate, startDate, today, completedSet]);

  const goToPreviousMonth = useCallback(() => {
    void Haptics.selectionAsync();
    setViewDate((current) =>
      createLocalDate(current.getFullYear(), current.getMonth() - 1, 1),
    );
  }, []);

  const goToNextMonth = useCallback(() => {
    void Haptics.selectionAsync();
    setViewDate((current) =>
      createLocalDate(current.getFullYear(), current.getMonth() + 1, 1),
    );
  }, []);

  const goToToday = useCallback(() => {
    void Haptics.selectionAsync();
    setViewDate(today);
    setSelectedDate(today);
  }, [today]);

  const openSelectedDay = useCallback(() => {
    if (
      !selectedDayInfo ||
      selectedDayInfo.state === "future" ||
      selectedDayInfo.state === "unavailable"
    ) {
      return;
    }

    void Haptics.selectionAsync();
    router.push({
      pathname: "/reading",
      params: {
        day: `${selectedDayInfo.dayNumber}`,
      },
    });
  }, [selectedDayInfo]);

  const monthYearText = `${
    MONTH_NAMES[viewDate.getMonth()]
  } ${viewDate.getFullYear()}`;

  const labelColor = isNight ? "rgba(255,255,255,0.55)" : "rgba(24,24,24,0.52)";

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: isNight ? "#090B14" : "#FFFFFF",
        },
      ]}
    >
      <ScreenBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={fontColor}
            colors={[fontColor]}
            progressBackgroundColor={isNight ? "#151827" : "#FFFFFF"}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: fontColor,
              },
            ]}
          >
            History
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: isNight
                  ? "rgba(255,255,255,0.62)"
                  : "rgba(24,24,24,0.58)",
              },
            ]}
          >
            Track your Bible reading journey
          </Text>
        </View>

        {/* STATISTICS */}
        <View style={styles.statsGrid}>
          {/* CHAPTERS */}
          <GlassCard intensity={45} style={styles.statCard}>
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
                  {chaptersCompleted}
                </Text>

                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: labelColor,
                    },
                  ]}
                >
                  Chapters
                </Text>
              </View>

              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: `${CHAPTER_ICON_COLOR}18`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="book-open-page-variant"
                  size={30}
                  color={CHAPTER_ICON_COLOR}
                />
              </View>
            </View>
          </GlassCard>

          {/* DAYS */}
          <GlassCard intensity={45} style={styles.statCard}>
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
                  {completedDays.length}
                </Text>

                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: labelColor,
                    },
                  ]}
                >
                  Days
                </Text>
              </View>

              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: `${DAYS_ICON_COLOR}18`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={30}
                  color={DAYS_ICON_COLOR}
                />
              </View>
            </View>
          </GlassCard>

          {/* CURRENT STREAK */}
          <GlassCard intensity={45} style={styles.statCard}>
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
                  {currentStreak}
                </Text>

                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: labelColor,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Current Streak
                </Text>
              </View>

              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: `${CURRENT_STREAK_ICON_COLOR}18`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="fire"
                  size={32}
                  color={CURRENT_STREAK_ICON_COLOR}
                />
              </View>
            </View>
          </GlassCard>

          {/* LONGEST STREAK */}
          <GlassCard intensity={45} style={styles.statCard}>
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
                  {longestStreak}
                </Text>

                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: labelColor,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Longest Streak
                </Text>
              </View>

              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: `${LONGEST_STREAK_ICON_COLOR}18`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={31}
                  color={LONGEST_STREAK_ICON_COLOR}
                />
              </View>
            </View>
          </GlassCard>
        </View>

        {/* ONE-YEAR PROGRESS */}
        <GlassCard intensity={45} style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(24,24,24,0.50)",
                  },
                ]}
              >
                ONE-YEAR PROGRESS
              </Text>

              <Text
                style={[
                  styles.progressValue,
                  {
                    color: fontColor,
                  },
                ]}
              >
                {overallPercentage}%
              </Text>
            </View>

            <View style={styles.progressRight}>
              <Text
                style={[
                  styles.progressDays,
                  {
                    color: fontColor,
                  },
                ]}
              >
                {completedDays.length}
                /365
              </Text>

              <Text
                style={[
                  styles.progressSmall,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.48)"
                      : "rgba(24,24,24,0.45)",
                  },
                ]}
              >
                days complete
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isNight
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(24,24,24,0.08)",
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: fontColor,
                  width: `${overallPercentage}%`,
                },
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text
              style={[
                styles.progressFooterText,
                {
                  color: isNight
                    ? "rgba(255,255,255,0.50)"
                    : "rgba(24,24,24,0.47)",
                },
              ]}
            >
              Missed days
            </Text>

            <Text
              style={[
                styles.progressFooterValue,
                {
                  color: fontColor,
                },
              ]}
            >
              {missedDays}
            </Text>
          </View>
        </GlassCard>

        {/* WEEKLY ACTIVITY */}
        <GlassCard intensity={45} style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <View>
              <Text
                style={[
                  styles.weeklyTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Weekly Activity
              </Text>

              <Text
                style={[
                  styles.weeklySubtitle,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.52)"
                      : "rgba(24,24,24,0.48)",
                  },
                ]}
              >
                Your last seven reading days
              </Text>
            </View>

            <Text
              style={[
                styles.weeklyPercent,
                {
                  color: fontColor,
                },
              ]}
            >
              {weeklyProgress.filter((value) => value === true).length}
              /7
            </Text>
          </View>

          <View style={styles.weekGrid}>
            {weeklyProgress.map((completed, index) => (
              <View key={`week-${index}`} style={styles.weekItem}>
                <View
                  style={[
                    styles.weekBarTrack,
                    {
                      backgroundColor: isNight
                        ? "rgba(255,255,255,0.09)"
                        : "rgba(24,24,24,0.07)",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.weekBarFill,
                      {
                        backgroundColor: fontColor,
                        height: completed ? "100%" : "18%",
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.weekDay,
                    {
                      color: isNight
                        ? "rgba(255,255,255,0.45)"
                        : "rgba(24,24,24,0.42)",
                    },
                  ]}
                >
                  {WEEKDAY_NAMES[(today.getDay() - (6 - index) + 7) % 7].charAt(
                    0,
                  )}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* STREAK MILESTONES */}
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            setShowMilestones(true);
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <GlassCard intensity={45} style={styles.milestoneCard}>
            <View style={styles.milestoneContent}>
              <View style={styles.milestoneTextArea}>
                <Text style={[styles.milestoneLabel, { color: labelColor }]}>
                  STREAK MILESTONE
                </Text>
                <Text style={[styles.milestoneTitle, { color: fontColor }]}>
                  {currentStreak > 0
                    ? `${getMilestoneCharacter(currentMilestone)} · ${currentMilestone} Days`
                    : `${getMilestoneCharacter(7)} · 7 Days`}
                </Text>
                <Text
                  style={[
                    styles.milestoneMessage,
                    {
                      color: isNight
                        ? "rgba(255,255,255,0.68)"
                        : "rgba(24,24,24,0.62)",
                    },
                  ]}
                >
                  {currentStreak > 0
                    ? `You have stayed in the Word for ${currentStreak} consecutive day${currentStreak === 1 ? "" : "s"}.`
                    : "Start reading today and build your first streak."}
                </Text>
                <Text style={[styles.milestoneNext, { color: muted }]}>
                  {nextMilestone
                    ? `Next: ${getMilestoneCharacter(nextMilestone)} · ${nextMilestone} days`
                    : "All streak milestones reached."}
                </Text>
              </View>
              <View
                style={[
                  styles.milestoneIcon,
                  { backgroundColor: `${fontColor}18` },
                ]}
              >
                <MaterialCommunityIcons
                  name={getMilestoneIcon(currentStreak >= currentMilestone)}
                  size={28}
                  color={currentStreak >= currentMilestone ? fontColor : muted}
                />
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {/* ACHIEVEMENTS */}
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            setShowAchievements(true);
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <GlassCard intensity={45} style={styles.achievementCard}>
            <View style={styles.achievementSummaryContent}>
              <View style={styles.achievementSummaryTextArea}>
                <Text style={[styles.achievementLabel, { color: labelColor }]}>
                  ACHIEVEMENTS
                </Text>
                <Text
                  style={[styles.achievementSummaryTitle, { color: fontColor }]}
                >
                  {unlockedAchievements} of {ACHIEVEMENTS.length} Unlocked
                </Text>
                <Text
                  style={[
                    styles.achievementSummaryMessage,
                    { color: secondary },
                  ]}
                >
                  {longestStreak > 0
                    ? `Your longest streak is ${longestStreak} day${longestStreak === 1 ? "" : "s"}.`
                    : "Start reading to unlock your first achievement."}
                </Text>
                <Text style={[styles.achievementNext, { color: muted }]}>
                  {nextAchievement
                    ? `Next achievement: ${nextAchievement.title}`
                    : "All achievements unlocked."}
                </Text>
              </View>
              <View
                style={[
                  styles.achievementSummaryIcon,
                  { backgroundColor: `${fontColor}18` },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    nextAchievement?.icon ??
                    unlockedAchievementList[unlockedAchievementList.length - 1]
                      ?.icon ??
                    "trophy-outline"
                  }
                  size={28}
                  color={nextAchievement ? fontColor : fontColor}
                />
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {/* MONTH SELECTOR */}
        <View style={styles.monthSelector}>
          <View style={styles.sideSlot}>
            <Pressable
              onPress={goToPreviousMonth}
              style={[
                styles.monthArrow,
                {
                  backgroundColor: isNight
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(255,255,255,0.52)",
                  borderColor: isNight
                    ? "rgba(255,255,255,0.13)"
                    : "rgba(255,255,255,0.76)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={23}
                color={fontColor}
              />
            </Pressable>
          </View>

          <View style={styles.centerMonth}>
            <Text
              style={[
                styles.monthTitle,
                {
                  color: fontColor,
                },
              ]}
            >
              {monthYearText}
            </Text>

            <Text
              style={[
                styles.monthSummary,
                {
                  color: isNight
                    ? "rgba(255,255,255,0.52)"
                    : "rgba(24,24,24,0.48)",
                },
              ]}
            >
              {monthlyStats.percentage}% completed
            </Text>
          </View>

          <View style={styles.sideSlot}>
            <Pressable
              onPress={goToNextMonth}
              style={[
                styles.monthArrow,
                {
                  backgroundColor: isNight
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(255,255,255,0.52)",
                  borderColor: isNight
                    ? "rgba(255,255,255,0.13)"
                    : "rgba(255,255,255,0.76)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={23}
                color={fontColor}
              />
            </Pressable>
          </View>
        </View>

        {/* TODAY BUTTON */}
        <Pressable
          onPress={goToToday}
          style={[
            styles.todayButton,
            {
              backgroundColor: isNight
                ? "rgba(255,255,255,0.07)"
                : "rgba(255,255,255,0.52)",
              borderColor: isNight
                ? "rgba(255,255,255,0.13)"
                : "rgba(255,255,255,0.76)",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-today"
            size={17}
            color={fontColor}
          />

          <Text
            style={[
              styles.todayButtonText,
              {
                color: fontColor,
              },
            ]}
          >
            Today
          </Text>
        </Pressable>

        {/* CALENDAR */}
        <GlassCard intensity={45} style={styles.calendarCard}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_NAMES.map((weekday) => (
              <View key={weekday} style={styles.weekdayCell}>
                <Text
                  style={[
                    styles.weekday,
                    {
                      color: isNight
                        ? "rgba(255,255,255,0.62)"
                        : "rgba(24,24,24,0.62)",
                    },
                  ]}
                >
                  {weekday}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {monthCalendar.map((calendarCell, index) => {
              if (!calendarCell.date) {
                return (
                  <View key={`empty-${index}`} style={styles.calendarCell} />
                );
              }

              const selected =
                selectedDate !== null &&
                dateKey(selectedDate) === dateKey(calendarCell.date);

              const completed = calendarCell.state === "completed";

              const isToday = calendarCell.state === "today";

              const isFuture = calendarCell.state === "future";

              return (
                <Pressable
                  key={dateKey(calendarCell.date)}
                  onPress={() => {
                    if (isFuture) {
                      return;
                    }

                    setSelectedDate(calendarCell.date);
                  }}
                  style={styles.calendarCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected &&
                        !completed && {
                          backgroundColor: isNight
                            ? "rgba(255,255,255,0.13)"
                            : "rgba(24,24,24,0.08)",
                        },
                      completed && {
                        backgroundColor: fontColor,
                      },
                      isToday && {
                        borderWidth: 2,
                        borderColor: fontColor,
                      },
                      isFuture && {
                        opacity: 0.4,
                      },
                    ]}
                  >
                    {completed ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.dayNumber,
                          {
                            color: isFuture
                              ? isNight
                                ? "rgba(255,255,255,0.48)"
                                : "rgba(24,24,24,0.48)"
                              : fontColor,
                          },
                        ]}
                      >
                        {calendarCell.dayOfMonth}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* LEGEND */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendCircle,
                  {
                    backgroundColor: fontColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={11}
                  color="#FFFFFF"
                />
              </View>

              <Text
                style={[
                  styles.legendText,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.52)"
                      : "rgba(24,24,24,0.52)",
                  },
                ]}
              >
                Completed
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendOutline,
                  {
                    borderColor: fontColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.legendText,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.52)"
                      : "rgba(24,24,24,0.52)",
                  },
                ]}
              >
                Today
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: isNight
                      ? "rgba(255,255,255,0.38)"
                      : "rgba(24,24,24,0.34)",
                  },
                ]}
              />

              <Text
                style={[
                  styles.legendText,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.52)"
                      : "rgba(24,24,24,0.52)",
                  },
                ]}
              >
                Missed
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* SELECTED DAY */}
        {selectedDate && selectedDayInfo && (
          <GlassCard intensity={45} style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <View>
                <Text
                  style={[
                    styles.selectedDate,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  {selectedDate.toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>

                <Text
                  style={[
                    styles.selectedDayLabel,
                    {
                      color: isNight
                        ? "rgba(255,255,255,0.54)"
                        : "rgba(24,24,24,0.48)",
                    },
                  ]}
                >
                  Reading Day {selectedDayInfo.dayNumber}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      selectedDayInfo.state === "completed"
                        ? fontColor
                        : isNight
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(24,24,24,0.06)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color:
                        selectedDayInfo.state === "completed"
                          ? "#FFFFFF"
                          : fontColor,
                    },
                  ]}
                >
                  {selectedDayInfo.state === "completed"
                    ? "Completed"
                    : selectedDayInfo.state === "missed"
                      ? "Missed"
                      : selectedDayInfo.state === "today"
                        ? "Today"
                        : "Future"}
                </Text>
              </View>
            </View>

            {selectedDayInfo.state !== "future" &&
              selectedDayInfo.state !== "unavailable" && (
                <Pressable
                  onPress={openSelectedDay}
                  style={[
                    styles.openReadingButton,
                    {
                      backgroundColor: fontColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="book-open-page-variant"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text style={styles.openReadingText}>
                    {selectedDayInfo.state === "missed"
                      ? "Catch Up"
                      : "Open Reading"}
                  </Text>
                </Pressable>
              )}

            {selectedDayInfo.state === "future" && (
              <Text
                style={[
                  styles.futureText,
                  {
                    color: isNight
                      ? "rgba(255,255,255,0.50)"
                      : "rgba(24,24,24,0.46)",
                  },
                ]}
              >
                Future reading days cannot be opened yet.
              </Text>
            )}
          </GlassCard>
        )}

        <Modal
          visible={celebration !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setCelebration(null)}
        >
          <View
            style={[
              styles.celebrationBackdrop,
              {
                backgroundColor: isNight
                  ? "rgba(0,0,0,0.74)"
                  : "rgba(20,25,40,0.40)",
              },
            ]}
          >
            <View
              style={[
                styles.celebrationCard,
                {
                  backgroundColor: isNight ? "#12192B" : "#F8FAFD",
                  borderColor: `${fontColor}35`,
                },
              ]}
            >
              <View style={styles.celebrationDecor}>
                <View
                  style={[
                    styles.celebrationDot,
                    { backgroundColor: `${fontColor}18` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="star-four-points"
                    size={18}
                    color={fontColor}
                  />
                </View>
                <View
                  style={[
                    styles.celebrationDot,
                    styles.celebrationDotLarge,
                    { backgroundColor: `${fontColor}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="trophy-outline"
                    size={25}
                    color={fontColor}
                  />
                </View>
                <View
                  style={[
                    styles.celebrationDot,
                    { backgroundColor: `${fontColor}18` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="star-four-points"
                    size={18}
                    color={fontColor}
                  />
                </View>
              </View>

              <Text style={[styles.celebrationEyebrow, { color: fontColor }]}>
                WELL DONE
              </Text>
              <Text style={[styles.celebrationTitle, { color: fontColor }]}>
                {celebration?.title}
              </Text>
              <Text style={[styles.celebrationSubtitle, { color: secondary }]}>
                {celebration?.subtitle}
              </Text>

              <View style={styles.celebrationItems}>
                {celebration?.items.map((item, index) => (
                  <View
                    key={`${item.kind}-${item.title}-${index}`}
                    style={[
                      styles.celebrationItem,
                      {
                        backgroundColor: isNight
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(24,24,24,0.045)",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.celebrationItemIcon,
                        { backgroundColor: `${fontColor}18` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          item.kind === "milestone"
                            ? "check-circle"
                            : "medal-outline"
                        }
                        size={21}
                        color={fontColor}
                      />
                    </View>
                    <View style={styles.celebrationItemBody}>
                      <Text
                        style={[styles.celebrationItemLabel, { color: muted }]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.celebrationItemTitle,
                          { color: fontColor },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setCelebration(null);
                }}
                style={[
                  styles.celebrationButton,
                  { backgroundColor: fontColor },
                ]}
              >
                <Text
                  style={[
                    styles.celebrationButtonText,
                    { color: isNight ? "#090B14" : "#FFFFFF" },
                  ]}
                >
                  Keep going
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.bottomSpace} />
        <Modal
          visible={showAchievements}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAchievements(false)}
        >
          <View
            style={[
              styles.modalBackdrop,
              {
                backgroundColor: isNight
                  ? "rgba(0,0,0,0.72)"
                  : "rgba(20,25,40,0.38)",
              },
            ]}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isNight ? "#121728" : "#F8FAFD",
                  borderColor: border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: fontColor }]}>
                    Achievements
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: muted }]}>
                    Your progress through the journey
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setShowAchievements(false);
                  }}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={muted}
                  />
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScroll}
              >
                {ACHIEVEMENTS.map((achievement) => {
                  const finished = Boolean(
                    achievementUnlockedMap[achievement.id],
                  );
                  return (
                    <View
                      key={`achievement-${achievement.id}`}
                      style={[
                        styles.modalAchievementRow,
                        { borderBottomColor: border },
                      ]}
                    >
                      <View
                        style={[
                          styles.modalAchievementIcon,
                          {
                            backgroundColor: finished
                              ? `${fontColor}18`
                              : isNight
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(24,24,24,0.05)",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={finished ? achievement.icon : "lock-outline"}
                          size={22}
                          color={finished ? fontColor : muted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.modalAchievementTitle,
                            { color: finished ? fontColor : muted },
                          ]}
                        >
                          {achievement.title}
                        </Text>
                        <Text
                          style={[
                            styles.modalAchievementState,
                            { color: secondary },
                          ]}
                        >
                          {finished ? "Unlocked" : "Locked"}
                        </Text>
                        <Text
                          style={[
                            styles.modalAchievementDetail,
                            { color: muted },
                          ]}
                        >
                          {achievement.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showMilestones}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMilestones(false)}
        >
          <View
            style={[
              styles.modalBackdrop,
              {
                backgroundColor: isNight
                  ? "rgba(0,0,0,0.72)"
                  : "rgba(20,25,40,0.38)",
              },
            ]}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isNight ? "#121728" : "#F8FAFD",
                  borderColor: border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: fontColor }]}>
                    Streak Milestones
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: muted }]}>
                    Every 7 days through 365
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setShowMilestones(false);
                  }}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={muted}
                  />
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScroll}
              >
                {STREAK_MILESTONES.map((milestone) => {
                  const finished = longestStreak >= milestone;
                  const current = currentStreak >= milestone;
                  return (
                    <View
                      key={`milestone-${milestone}`}
                      style={[
                        styles.modalMilestoneRow,
                        { borderBottomColor: border },
                      ]}
                    >
                      <View
                        style={[
                          styles.modalMilestoneIcon,
                          {
                            backgroundColor: finished
                              ? `${fontColor}18`
                              : isNight
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(24,24,24,0.05)",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getMilestoneIcon(finished)}
                          size={22}
                          color={finished ? fontColor : muted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.modalMilestoneTitle,
                            { color: finished ? fontColor : muted },
                          ]}
                        >
                          {getMilestoneCharacter(milestone)} · {milestone} Days
                        </Text>
                        <Text
                          style={[
                            styles.modalMilestoneState,
                            { color: secondary },
                          ]}
                        >
                          {current
                            ? "Current milestone"
                            : finished
                              ? "Completed"
                              : "Keep going"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },

  header: {
    paddingTop: 8,
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 5,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },

  /*
   * Compact statistic cards.
   * The entire content area is given a fixed height
   * so the number, label, and icon sit vertically
   * in the center instead of toward the top.
   */
  statCard: {
    width: "48.3%",
    minHeight: 112,
    borderRadius: 20,
    padding: 14,
  },

  statContent: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statTextArea: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingRight: 6,
  },

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },

  statValue: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "left",
  },

  statLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
    textAlign: "left",
  },

  progressCard: {
    borderRadius: 22,
    padding: 18,
    marginTop: 12,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  progressLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  progressValue: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },

  progressRight: {
    alignItems: "flex-end",
  },

  progressDays: {
    fontSize: 16,
    fontWeight: "800",
  },

  progressSmall: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 14,
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  progressFooterText: {
    fontSize: 11,
    fontWeight: "500",
  },

  progressFooterValue: {
    fontSize: 12,
    fontWeight: "800",
  },

  weeklyCard: {
    borderRadius: 22,
    padding: 18,
    marginTop: 12,
  },

  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  weeklyTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  weeklySubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  weeklyPercent: {
    fontSize: 18,
    fontWeight: "800",
  },

  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 110,
    marginTop: 16,
  },

  weekItem: {
    width: "11%",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  weekBarTrack: {
    width: 13,
    height: 72,
    borderRadius: 7,
    overflow: "hidden",
    justifyContent: "flex-end",
  },

  weekBarFill: {
    width: "100%",
    borderRadius: 7,
  },

  weekDay: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 8,
  },

  monthSelector: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  sideSlot: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },

  centerMonth: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  monthSummary: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  monthArrow: {
    width: 46,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  todayButton: {
    alignSelf: "center",
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 12,
  },

  todayButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },

  calendarCard: {
    borderRadius: 22,
    padding: 16,
  },

  weekdayRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 7,
  },

  weekdayCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
  },

  weekday: {
    fontSize: 10,
    fontWeight: "800",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },

  calendarCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircle: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    alignItems: "center",
    justifyContent: "center",
  },

  dayNumber: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 13,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  legendOutline: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },

  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 5.5,
  },

  legendText: {
    fontSize: 9,
    fontWeight: "600",
  },

  selectedCard: {
    borderRadius: 22,
    padding: 18,
    marginTop: 12,
  },

  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedDate: {
    fontSize: 18,
    fontWeight: "800",
  },

  selectedDayLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  statusPill: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },

  openReadingButton: {
    minHeight: 50,
    borderRadius: 16,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  openReadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  futureText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 14,
    textAlign: "center",
  },

  milestoneCard: { borderRadius: 22, padding: 16, marginTop: 12 },
  milestoneContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  milestoneTextArea: { flex: 1, minWidth: 0, paddingRight: 12 },
  milestoneLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  milestoneTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  milestoneMessage: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  milestoneNext: { fontSize: 10, fontWeight: "700", marginTop: 6 },
  milestoneIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  achievementCard: { borderRadius: 22, padding: 16, marginTop: 12 },
  achievementSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  achievementSummaryTextArea: { flex: 1, minWidth: 0, paddingRight: 12 },
  achievementLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  achievementSummaryTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  achievementSummaryMessage: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  achievementNext: { fontSize: 10, fontWeight: "700", marginTop: 6 },
  achievementSummaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalAchievementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  modalAchievementIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    flexShrink: 0,
  },
  modalAchievementTitle: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  modalAchievementState: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  modalAchievementDetail: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 3,
  },

  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 18 },
  modalCard: {
    maxHeight: "82%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 17,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 19, fontWeight: "800" },
  modalSubtitle: { fontSize: 10.5, fontWeight: "600", marginTop: 3 },
  modalScroll: { paddingBottom: 6 },
  modalMilestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  modalMilestoneIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  modalMilestoneTitle: { fontSize: 12.5, fontWeight: "800" },
  modalMilestoneState: { fontSize: 10, marginTop: 2 },

  celebrationBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  celebrationCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  celebrationDecor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 10,
  },
  celebrationDot: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationDotLarge: {
    width: 58,
    height: 58,
    borderRadius: 19,
  },
  celebrationEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  celebrationTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  celebrationSubtitle: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },
  celebrationItems: {
    marginTop: 16,
    gap: 8,
  },
  celebrationItem: {
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  celebrationItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  celebrationItemBody: {
    flex: 1,
    minWidth: 0,
  },
  celebrationItemLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  celebrationItemTitle: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  celebrationButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  celebrationButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 30,
  },
});
