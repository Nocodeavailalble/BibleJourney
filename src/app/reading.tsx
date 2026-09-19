import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
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
const CHAPTER_PROGRESS_KEY = "chapterProgress";
const TOTAL_DAYS = 365;

const BOOKS = [
  ["Genesis", 50],
  ["Exodus", 40],
  ["Leviticus", 27],
  ["Numbers", 36],
  ["Deuteronomy", 34],
  ["Joshua", 24],
  ["Judges", 21],
  ["Ruth", 4],
  ["1 Samuel", 31],
  ["2 Samuel", 24],
  ["1 Kings", 22],
  ["2 Kings", 25],
  ["1 Chronicles", 29],
  ["2 Chronicles", 36],
  ["Ezra", 10],
  ["Nehemiah", 13],
  ["Esther", 10],
  ["Job", 42],
  ["Psalms", 150],
  ["Proverbs", 31],
  ["Ecclesiastes", 12],
  ["Song of Solomon", 8],
  ["Isaiah", 66],
  ["Jeremiah", 52],
  ["Lamentations", 5],
  ["Ezekiel", 48],
  ["Daniel", 12],
  ["Hosea", 14],
  ["Joel", 3],
  ["Amos", 9],
  ["Obadiah", 1],
  ["Jonah", 4],
  ["Micah", 7],
  ["Nahum", 3],
  ["Habakkuk", 3],
  ["Zephaniah", 3],
  ["Haggai", 2],
  ["Zechariah", 14],
  ["Malachi", 4],
  ["Matthew", 28],
  ["Mark", 16],
  ["Luke", 24],
  ["John", 21],
  ["Acts", 28],
  ["Romans", 16],
  ["1 Corinthians", 16],
  ["2 Corinthians", 13],
  ["Galatians", 6],
  ["Ephesians", 6],
  ["Philippians", 4],
  ["Colossians", 4],
  ["1 Thessalonians", 5],
  ["2 Thessalonians", 3],
  ["1 Timothy", 6],
  ["2 Timothy", 4],
  ["Titus", 3],
  ["Philemon", 1],
  ["Hebrews", 13],
  ["James", 5],
  ["1 Peter", 5],
  ["2 Peter", 3],
  ["1 John", 5],
  ["2 John", 1],
  ["3 John", 1],
  ["Jude", 1],
  ["Revelation", 22],
] as const;

type ChapterProgress = Record<string, boolean>;

const BOOK_NAMES = BOOKS.map(([name]) => name);

const BOOK_INDEX: Record<string, number> = {};
const BOOK_CHAPTER_COUNT: Record<string, number> = {};
const BOOK_START_INDEX: Record<string, number> = {};

let runningIndex = 1;

for (let i = 0; i < BOOKS.length; i += 1) {
  const [name, chapters] = BOOKS[i];

  BOOK_INDEX[name] = i;
  BOOK_CHAPTER_COUNT[name] = chapters;
  BOOK_START_INDEX[name] = runningIndex;

  runningIndex += chapters;
}

const BOOK_PATTERN = BOOK_NAMES.slice()
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function chapterKey(book: string, chapter: number) {
  return `${book}:${chapter}`;
}

function getGlobalChapterIndex(book: string, chapter: number) {
  const bookIndex = BOOK_START_INDEX[book];

  if (!bookIndex) {
    return null;
  }

  if (chapter < 1 || chapter > BOOK_CHAPTER_COUNT[book]) {
    return null;
  }

  return bookIndex + chapter - 1;
}

function getChapterAtGlobalIndex(index: number) {
  for (const [book, chapters] of BOOKS) {
    const start = BOOK_START_INDEX[book];

    const end = start + chapters - 1;

    if (index >= start && index <= end) {
      return {
        book,
        chapter: index - start + 1,
      };
    }
  }

  return null;
}

function parseReference(reference: string) {
  const normalized = reference
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const result: {
    book: string;
    chapter: number;
    key: string;
  }[] = [];

  if (!normalized) {
    return result;
  }

  /*
   * First handle the cross-book form:
   *
   * Genesis 49-Exodus 2
   * Malachi 4-Matthew 2
   */
  const crossBookRegex = new RegExp(
    `^(${BOOK_PATTERN})\\s+(\\d+)\\s*-\\s*(${BOOK_PATTERN})\\s+(\\d+)$`,
    "i",
  );

  const crossMatch = normalized.match(crossBookRegex);

  if (crossMatch) {
    const startBook = BOOK_NAMES.find(
      (name) => name.toLowerCase() === crossMatch[1].toLowerCase(),
    );

    const endBook = BOOK_NAMES.find(
      (name) => name.toLowerCase() === crossMatch[3].toLowerCase(),
    );

    const startChapter = Number(crossMatch[2]);

    const endChapter = Number(crossMatch[4]);

    if (startBook && endBook) {
      const startIndex = getGlobalChapterIndex(startBook, startChapter);

      const endIndex = getGlobalChapterIndex(endBook, endChapter);

      if (startIndex !== null && endIndex !== null && startIndex <= endIndex) {
        for (let index = startIndex; index <= endIndex; index += 1) {
          const location = getChapterAtGlobalIndex(index);

          if (!location) {
            continue;
          }

          result.push({
            book: location.book,
            chapter: location.chapter,
            key: chapterKey(location.book, location.chapter),
          });
        }
      }
    }

    return result;
  }

  /*
   * Single-book reference:
   *
   * Genesis 1-3
   * Psalms 1
   * John 3,5,7
   */
  const singleBookRegex = new RegExp(`^(${BOOK_PATTERN})\\s+(.+)$`, "i");

  const singleMatch = normalized.match(singleBookRegex);

  if (!singleMatch) {
    return result;
  }

  const book = BOOK_NAMES.find(
    (name) => name.toLowerCase() === singleMatch[1].toLowerCase(),
  );

  if (!book) {
    return result;
  }

  const chapterText = singleMatch[2].replace(/,/g, " ").trim();

  const tokens = chapterText.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);

      const end = Number(rangeMatch[2]);

      const safeStart = Math.max(1, start);

      const safeEnd = Math.min(end, BOOK_CHAPTER_COUNT[book]);

      if (safeStart <= safeEnd) {
        for (let chapter = safeStart; chapter <= safeEnd; chapter += 1) {
          result.push({
            book,
            chapter,
            key: chapterKey(book, chapter),
          });
        }
      }

      continue;
    }

    const chapter = Number(token);

    if (
      Number.isInteger(chapter) &&
      chapter >= 1 &&
      chapter <= BOOK_CHAPTER_COUNT[book]
    ) {
      result.push({
        book,
        chapter,
        key: chapterKey(book, chapter),
      });
    }
  }

  return Array.from(new Map(result.map((item) => [item.key, item])).values());
}

function ChapterTab({
  chapter,
  book,
  completed,
  fontColor,
  secondary,
  surface,
  strongSurface,
  onPress,
}: {
  chapter: number;
  book: string;
  completed: boolean;
  fontColor: string;
  secondary: string;
  surface: string;
  strongSurface: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!completed) {
      return;
    }

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.985,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [completed, scale]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chapterTab,
          {
            backgroundColor: completed ? fontColor : surface,
            borderColor: completed ? fontColor : "rgba(128,128,128,0.18)",
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <View style={styles.chapterLeft}>
          <View
            style={[
              styles.chapterNumberTab,
              {
                backgroundColor: completed
                  ? "rgba(255,255,255,0.16)"
                  : strongSurface,
              },
            ]}
          >
            <Text
              style={[
                styles.chapterNumber,
                {
                  color: completed ? "#FFFFFF" : fontColor,
                },
              ]}
            >
              {chapter}
            </Text>
          </View>

          <View style={styles.chapterTextArea}>
            <Text
              style={[
                styles.chapterTitle,
                {
                  color: completed ? "#FFFFFF" : fontColor,
                },
              ]}
            >
              {book} {chapter}
            </Text>

            <Text
              style={[
                styles.chapterSubtitle,
                {
                  color: completed ? "rgba(255,255,255,0.62)" : secondary,
                },
              ]}
            >
              Chapter {chapter}
            </Text>
          </View>
        </View>

        <MaterialCommunityIcons
          name={completed ? "check-circle" : "chevron-right"}
          size={22}
          color={completed ? "#FFFFFF" : secondary}
        />
      </Pressable>
    </Animated.View>
  );
}

export default function ReadingScreen() {
  const params = useLocalSearchParams<{
    day?: string;
  }>();

  const day = Math.max(1, Math.min(TOTAL_DAYS, Number(params.day) || 1));

  const { fontColor, themeMode } = useTheme();

  const isNight = themeMode === "night";

  const secondary = isNight ? "rgba(255,255,255,0.58)" : "rgba(24,24,24,0.58)";

  const muted = isNight ? "rgba(255,255,255,0.40)" : "rgba(24,24,24,0.40)";

  const surface = isNight ? "rgba(255,255,255,0.07)" : "rgba(24,24,24,0.055)";

  const strongSurface = isNight
    ? "rgba(255,255,255,0.12)"
    : "rgba(24,24,24,0.09)";

  const readingDay = getReadingDay(day);

  const chapters = useMemo(
    () => parseReference(readingDay?.reference ?? ""),
    [readingDay?.reference],
  );

  const [chapterProgress, setChapterProgress] = useState<ChapterProgress>({});

  const [completedDays, setCompletedDays] = useState<number[]>([]);

  const [loaded, setLoaded] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const [savedChapterProgress, savedDays] = await Promise.all([
        AsyncStorage.getItem(CHAPTER_PROGRESS_KEY),
        AsyncStorage.getItem(COMPLETED_DAYS_KEY),
      ]);

      let chapterData: ChapterProgress = {};

      if (savedChapterProgress) {
        try {
          const parsed = JSON.parse(savedChapterProgress);

          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const source = parsed as Record<string, unknown>;

            /*
             * Reading uses the flat format:
             *
             * {
             *   "Genesis:49": true
             * }
             *
             * The conversion also accepts the old
             * nested format so old progress is retained.
             */
            let flat: ChapterProgress = {};

            let foundFlat = false;

            for (const [key, value] of Object.entries(source)) {
              if (key.includes(":") && typeof value === "boolean") {
                flat[key] = value;
                foundFlat = true;
              }
            }

            if (foundFlat) {
              chapterData = flat;
            } else {
              for (const value of Object.values(source)) {
                if (
                  !value ||
                  typeof value !== "object" ||
                  Array.isArray(value)
                ) {
                  continue;
                }

                for (const [key, completed] of Object.entries(
                  value as Record<string, unknown>,
                )) {
                  if (typeof completed === "boolean") {
                    flat[key] = completed;
                  }
                }
              }

              chapterData = flat;
            }
          }
        } catch {
          chapterData = {};
        }
      }

      let days: number[] = [];

      if (savedDays) {
        try {
          const parsed = JSON.parse(savedDays);

          if (Array.isArray(parsed)) {
            days = [
              ...new Set(
                parsed.map(Number).filter((item) => Number.isInteger(item)),
              ),
            ];
          }
        } catch {
          days = [];
        }
      }

      setChapterProgress(chapterData);

      setCompletedDays(days);

      setLoaded(true);
    } catch (error) {
      console.log("Error loading reading progress:", error);

      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  function isChapterComplete(key: string) {
    return chapterProgress[key] === true;
  }

  const completedChapterCount = chapters.filter((item) =>
    isChapterComplete(item.key),
  ).length;

  const totalChapters = chapters.length;

  const progress =
    totalChapters > 0 ? completedChapterCount / totalChapters : 0;

  const isComplete =
    loaded && totalChapters > 0 && completedChapterCount === totalChapters;

  const nextDay = day < TOTAL_DAYS ? day + 1 : null;

  const previousDay = day > 1 ? day - 1 : null;

  const milestoneMessage =
    isComplete && day === 7
      ? "One week in the Word. Keep going!"
      : isComplete && day === 30
        ? "Thirty days completed. Keep building the habit!"
        : isComplete && day === 100
          ? "One hundred days in the Word. What a milestone!"
          : null;

  async function saveChapterProgress(nextProgress: ChapterProgress) {
    setChapterProgress(nextProgress);

    try {
      await AsyncStorage.setItem(
        CHAPTER_PROGRESS_KEY,
        JSON.stringify(nextProgress),
      );
    } catch (error) {
      console.log("Error saving chapter progress:", error);
    }
  }

  async function updateCompletedDay(nextProgress: ChapterProgress) {
    const dayComplete =
      chapters.length > 0 &&
      chapters.every((chapter) => nextProgress[chapter.key] === true);

    let nextDays = [...completedDays];

    if (dayComplete) {
      if (!nextDays.includes(day)) {
        nextDays.push(day);
      }
    } else {
      nextDays = nextDays.filter((item) => item !== day);
    }

    nextDays.sort((a, b) => a - b);

    setCompletedDays(nextDays);

    try {
      await AsyncStorage.setItem(COMPLETED_DAYS_KEY, JSON.stringify(nextDays));
    } catch (error) {
      console.log("Error saving completed day:", error);
    }

    if (dayComplete) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.selectionAsync();
    }
  }

  async function toggleChapter(key: string) {
    const wasComplete = chapterProgress[key] === true;
    const nextProgress = {
      ...chapterProgress,
      [key]: !chapterProgress[key],
    };

    await saveChapterProgress(nextProgress);

    await updateCompletedDay(nextProgress);

    if (!wasComplete) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async function completeAll() {
    const wasComplete = isComplete;
    const nextProgress = {
      ...chapterProgress,
    };

    for (const chapter of chapters) {
      nextProgress[chapter.key] = true;
    }

    await saveChapterProgress(nextProgress);

    await updateCompletedDay(nextProgress);

    if (wasComplete) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  async function clearAll() {
    const hadProgress = chapters.some(
      (chapter) => chapterProgress[chapter.key] === true,
    );
    const nextProgress = {
      ...chapterProgress,
    };

    for (const chapter of chapters) {
      delete nextProgress[chapter.key];
    }

    await saveChapterProgress(nextProgress);

    await updateCompletedDay(nextProgress);

    if (hadProgress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function openAdjacentDay(targetDay: number) {
    router.replace({
      pathname: "/reading",
      params: {
        day: targetDay.toString(),
      },
    });
  }

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={12}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={fontColor}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text
              style={[
                styles.headerLabel,
                {
                  color: secondary,
                },
              ]}
            >
              BIBLE JOURNEY
            </Text>

            <Text
              style={[
                styles.headerTitle,
                {
                  color: fontColor,
                },
              ]}
            >
              Reading
            </Text>
          </View>

          <View
            style={[
              styles.dayPill,
              {
                backgroundColor: strongSurface,
              },
            ]}
          >
            <Text
              style={[
                styles.dayPillText,
                {
                  color: fontColor,
                },
              ]}
            >
              DAY {day}
            </Text>
          </View>
        </View>

        <GlassCard intensity={78} style={styles.readingCard}>
          <View style={styles.readingTop}>
            <View
              style={[
                styles.readingIcon,
                {
                  backgroundColor: strongSurface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={25}
                color={fontColor}
              />
            </View>

            <View style={styles.readingHeadingText}>
              <Text
                style={[
                  styles.readingDay,
                  {
                    color: secondary,
                  },
                ]}
              >
                DAY {day}
              </Text>

              <Text
                style={[
                  styles.reference,
                  {
                    color: fontColor,
                  },
                ]}
                numberOfLines={2}
              >
                {readingDay?.reference ?? "Reading"}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.referenceSubtext,
              {
                color: secondary,
              },
            ]}
          >
            {totalChapters} {totalChapters === 1 ? "chapter" : "chapters"} for
            today's reading
          </Text>
        </GlassCard>

        <GlassCard intensity={70} style={styles.card}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTextArea}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Reading Progress
              </Text>

              <Text
                style={[
                  styles.cardDescription,
                  {
                    color: secondary,
                  },
                ]}
              >
                {completedChapterCount} of {totalChapters} chapters completed
              </Text>
            </View>

            <View
              style={[
                styles.progressCircle,
                {
                  backgroundColor: strongSurface,
                },
              ]}
            >
              <Text
                style={[
                  styles.progressPercent,
                  {
                    color: fontColor,
                  },
                ]}
              >
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: fontColor,
                },
              ]}
            />
          </View>

          {isComplete && (
            <View
              style={[
                styles.completeBadge,
                {
                  backgroundColor: strongSurface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={17}
                color={fontColor}
              />

              <Text
                style={[
                  styles.completeBadgeText,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Reading completed
              </Text>
            </View>
          )}
        </GlassCard>

        {isComplete && (
          <GlassCard intensity={70} style={styles.celebrationCard}>
            <Text
              style={[
                styles.celebrationTitle,
                {
                  color: fontColor,
                },
              ]}
            >
              {milestoneMessage
                ? "Milestone reached"
                : "Today's reading is complete"}
            </Text>

            <Text
              style={[
                styles.celebrationMessage,
                {
                  color: secondary,
                },
              ]}
            >
              {milestoneMessage ??
                "Well done. You have finished all the chapters assigned for today."}
            </Text>
          </GlassCard>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: fontColor,
                },
              ]}
            >
              Chapters
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: secondary,
                },
              ]}
            >
              Tap each chapter after reading.
            </Text>
          </View>

          <View style={styles.controlRow}>
            <Pressable
              onPress={() => void completeAll()}
              style={[
                styles.controlButton,
                {
                  backgroundColor: strongSurface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="check-all"
                size={15}
                color={fontColor}
              />

              <Text
                style={[
                  styles.controlText,
                  {
                    color: fontColor,
                  },
                ]}
              >
                All
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void clearAll()}
              style={[
                styles.controlButton,
                {
                  backgroundColor: surface,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="restart"
                size={15}
                color={secondary}
              />

              <Text
                style={[
                  styles.controlText,
                  {
                    color: secondary,
                  },
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
        </View>

        <GlassCard intensity={66} style={styles.chapterCard}>
          {chapters.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="book-alert-outline"
                size={34}
                color={secondary}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                No chapters found
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color: secondary,
                  },
                ]}
              >
                The reading reference could not be parsed.
              </Text>
            </View>
          ) : (
            chapters.map((chapter) => (
              <ChapterTab
                key={chapter.key}
                chapter={chapter.chapter}
                book={chapter.book}
                completed={isChapterComplete(chapter.key)}
                fontColor={fontColor}
                secondary={secondary}
                surface={surface}
                strongSurface={strongSurface}
                onPress={() => void toggleChapter(chapter.key)}
              />
            ))
          )}
        </GlassCard>

        <View style={styles.navigationRow}>
          <Pressable
            disabled={previousDay === null}
            onPress={() => {
              if (previousDay !== null) {
                void Haptics.selectionAsync();
                openAdjacentDay(previousDay);
              }
            }}
            style={[
              styles.navigationButton,
              {
                opacity: previousDay === null ? 0.35 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={19}
              color={fontColor}
            />

            <View>
              <Text
                style={[
                  styles.navigationSmall,
                  {
                    color: muted,
                  },
                ]}
              >
                PREVIOUS
              </Text>

              <Text
                style={[
                  styles.navigationLabel,
                  {
                    color: fontColor,
                  },
                ]}
              >
                {previousDay ? `Day ${previousDay}` : "Beginning"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            disabled={nextDay === null}
            onPress={() => {
              if (nextDay !== null) {
                void Haptics.selectionAsync();
                openAdjacentDay(nextDay);
              }
            }}
            style={[
              styles.navigationButton,
              styles.navigationNext,
              {
                opacity: nextDay === null ? 0.35 : 1,
              },
            ]}
          >
            <View style={styles.navigationTextRight}>
              <Text
                style={[
                  styles.navigationSmall,
                  {
                    color: muted,
                  },
                ]}
              >
                NEXT
              </Text>

              <Text
                style={[
                  styles.navigationLabel,
                  {
                    color: fontColor,
                  },
                ]}
              >
                {nextDay ? `Day ${nextDay}` : "Complete"}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="arrow-right"
              size={19}
              color={fontColor}
            />
          </Pressable>
        </View>

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

function getReadingDay(day: number) {
  return readingPlan.find((item) => item.day === day) ?? null;
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 45,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  backButton: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 6,
  },

  headerLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.7,
  },

  headerTitle: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
    marginTop: 1,
  },

  dayPill: {
    minHeight: 31,
    paddingHorizontal: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  dayPillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  readingCard: {
    padding: 15,
    borderRadius: 21,
  },

  readingTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  readingIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  readingHeadingText: {
    flex: 1,
  },

  readingDay: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.7,
  },

  reference: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 2,
  },

  referenceSubtext: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },

  card: {
    marginTop: 9,
    padding: 15,
    borderRadius: 20,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  cardDescription: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },

  progressCircle: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  progressPercent: {
    fontSize: 12,
    fontWeight: "800",
  },

  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 13,
    backgroundColor: "rgba(128,128,128,0.11)",
  },

  progressFill: {
    height: "100%",
    borderRadius: 99,
  },

  completeBadge: {
    alignSelf: "flex-start",
    minHeight: 31,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 11,
  },

  completeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  celebrationCard: {
    marginTop: 9,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  celebrationTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  celebrationMessage: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
    textAlign: "center",
  },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  sectionHeaderText: {
    flex: 1,
    paddingRight: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  controlButton: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  controlText: {
    fontSize: 9,
    fontWeight: "800",
  },

  chapterCard: {
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderRadius: 20,
  },

  chapterTab: {
    width: "100%",
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 3,
  },

  chapterLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  chapterNumberTab: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  chapterNumber: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },

  chapterTextArea: {
    flex: 1,
    marginLeft: 10,
  },

  chapterTitle: {
    fontSize: 12,
    fontWeight: "800",
  },

  chapterSubtitle: {
    fontSize: 9,
    marginTop: 2,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 38,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 11,
  },

  emptyText: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  navigationRow: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 9,
  },

  navigationButton: {
    flex: 1,
    minHeight: 55,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(128,128,128,0.06)",
  },

  navigationNext: {
    justifyContent: "flex-end",
  },

  navigationTextRight: {
    alignItems: "flex-end",
  },

  navigationSmall: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  navigationLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },

  footer: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 15,
    paddingHorizontal: 20,
  },
});
