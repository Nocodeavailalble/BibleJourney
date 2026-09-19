import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";
import { readingPlan } from "../constants/readingPlan";
import { useTheme } from "../theme/ThemeContext";

const CHAPTER_PROGRESS_KEY = "chapterProgress";

const SOT_IMAGE = require("../../assets/SOT.png");
const NOT_IMAGE = require("../../assets/NOT.png");

type ChapterProgress = Record<string, boolean>;

type BibleBook = {
  name: string;
  chapters: number;
};

type BibleGroup = {
  title: string;
  books: BibleBook[];
};

type Testament = {
  title: "Old Testament" | "New Testament";
  subtitle: string;
  groups: BibleGroup[];
};

/* -------------------------------------------------------------------------- */
/* OLD TESTAMENT                                                             */
/* -------------------------------------------------------------------------- */

const OLD_TESTAMENT: Testament = {
  title: "Old Testament",
  subtitle: "39 books",

  groups: [
    {
      title: "Pentateuch",
      books: [
        {
          name: "Genesis",
          chapters: 50,
        },
        {
          name: "Exodus",
          chapters: 40,
        },
        {
          name: "Leviticus",
          chapters: 27,
        },
        {
          name: "Numbers",
          chapters: 36,
        },
        {
          name: "Deuteronomy",
          chapters: 34,
        },
      ],
    },

    {
      title: "History",
      books: [
        {
          name: "Joshua",
          chapters: 24,
        },
        {
          name: "Judges",
          chapters: 21,
        },
        {
          name: "Ruth",
          chapters: 4,
        },
        {
          name: "1 Samuel",
          chapters: 31,
        },
        {
          name: "2 Samuel",
          chapters: 24,
        },
        {
          name: "1 Kings",
          chapters: 22,
        },
        {
          name: "2 Kings",
          chapters: 25,
        },
        {
          name: "1 Chronicles",
          chapters: 29,
        },
        {
          name: "2 Chronicles",
          chapters: 36,
        },
        {
          name: "Ezra",
          chapters: 10,
        },
        {
          name: "Nehemiah",
          chapters: 13,
        },
        {
          name: "Esther",
          chapters: 10,
        },
      ],
    },

    {
      title: "Psalms",
      books: [
        {
          name: "Job",
          chapters: 42,
        },
        {
          name: "Psalms",
          chapters: 150,
        },
        {
          name: "Proverbs",
          chapters: 31,
        },
        {
          name: "Ecclesiastes",
          chapters: 12,
        },
        {
          name: "Song of Solomon",
          chapters: 8,
        },
        {
          name: "Lamentations",
          chapters: 5,
        },
      ],
    },

    {
      title: "Books of the Prophets: Before the Captivity",
      books: [
        {
          name: "Obadiah",
          chapters: 1,
        },
        {
          name: "Joel",
          chapters: 3,
        },
        {
          name: "Jonah",
          chapters: 4,
        },
        {
          name: "Amos",
          chapters: 9,
        },
        {
          name: "Hosea",
          chapters: 14,
        },
        {
          name: "Isaiah",
          chapters: 66,
        },
        {
          name: "Micah",
          chapters: 7,
        },
        {
          name: "Nahum",
          chapters: 3,
        },
        {
          name: "Zephaniah",
          chapters: 3,
        },
        {
          name: "Jeremiah",
          chapters: 52,
        },
        {
          name: "Habakkuk",
          chapters: 3,
        },
      ],
    },

    {
      title: "Books of the Prophets: During the Captivity",
      books: [
        {
          name: "Daniel",
          chapters: 12,
        },
        {
          name: "Ezekiel",
          chapters: 48,
        },
      ],
    },

    {
      title: "Books of the Prophets: After the Captivity",
      books: [
        {
          name: "Haggai",
          chapters: 2,
        },
        {
          name: "Zechariah",
          chapters: 14,
        },
        {
          name: "Malachi",
          chapters: 4,
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* NEW TESTAMENT                                                             */
/* -------------------------------------------------------------------------- */

const NEW_TESTAMENT: Testament = {
  title: "New Testament",
  subtitle: "27 books",

  groups: [
    {
      title: "Four Gospels",
      books: [
        {
          name: "Matthew",
          chapters: 28,
        },
        {
          name: "Mark",
          chapters: 16,
        },
        {
          name: "Luke",
          chapters: 24,
        },
        {
          name: "John",
          chapters: 21,
        },
      ],
    },

    {
      title: "Acts of the Apostles",
      books: [
        {
          name: "Acts",
          chapters: 28,
        },
      ],
    },

    {
      title: "Epistles",
      books: [
        {
          name: "Romans",
          chapters: 16,
        },
        {
          name: "1 Corinthians",
          chapters: 16,
        },
        {
          name: "2 Corinthians",
          chapters: 13,
        },
        {
          name: "Galatians",
          chapters: 6,
        },
        {
          name: "Ephesians",
          chapters: 6,
        },
        {
          name: "Philippians",
          chapters: 4,
        },
        {
          name: "Colossians",
          chapters: 4,
        },
        {
          name: "1 Thessalonians",
          chapters: 5,
        },
        {
          name: "2 Thessalonians",
          chapters: 3,
        },
        {
          name: "1 Timothy",
          chapters: 6,
        },
        {
          name: "2 Timothy",
          chapters: 4,
        },
        {
          name: "Titus",
          chapters: 3,
        },
        {
          name: "Philemon",
          chapters: 1,
        },
        {
          name: "Hebrews",
          chapters: 13,
        },
        {
          name: "James",
          chapters: 5,
        },
        {
          name: "1 Peter",
          chapters: 5,
        },
        {
          name: "2 Peter",
          chapters: 3,
        },
        {
          name: "1 John",
          chapters: 5,
        },
        {
          name: "2 John",
          chapters: 1,
        },
        {
          name: "3 John",
          chapters: 1,
        },
        {
          name: "Jude",
          chapters: 1,
        },
      ],
    },

    {
      title: "Book of Prophecy",
      books: [
        {
          name: "Revelation",
          chapters: 22,
        },
      ],
    },
  ],
};

const TESTAMENTS: Testament[] = [OLD_TESTAMENT, NEW_TESTAMENT];

/* -------------------------------------------------------------------------- */
/* ALL BOOKS                                                                  */
/* -------------------------------------------------------------------------- */

const ALL_BOOKS: BibleBook[] = [
  ...OLD_TESTAMENT.groups.flatMap((group) => group.books),
  ...NEW_TESTAMENT.groups.flatMap((group) => group.books),
];

const BOOK_NAMES = ALL_BOOKS.map((book) => book.name);

/* -------------------------------------------------------------------------- */
/* GLOBAL CHAPTER MAP                                                        */
/* -------------------------------------------------------------------------- */

const BOOK_START_INDEX: Record<string, number> = {};

let runningIndex = 1;

for (const book of ALL_BOOKS) {
  BOOK_START_INDEX[book.name] = runningIndex;

  runningIndex += book.chapters;
}

const BOOK_PATTERN = BOOK_NAMES.slice()
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function chapterKey(book: string, chapter: number): string {
  return `${book}:${chapter}`;
}

function getBook(name: string) {
  return ALL_BOOKS.find(
    (book) => book.name.toLowerCase() === name.toLowerCase(),
  );
}

function getGlobalChapterIndex(bookName: string, chapter: number) {
  const book = getBook(bookName);

  if (!book) {
    return null;
  }

  if (chapter < 1 || chapter > book.chapters) {
    return null;
  }

  return BOOK_START_INDEX[book.name] + chapter - 1;
}

function getChapterAtGlobalIndex(index: number) {
  for (const book of ALL_BOOKS) {
    const start = BOOK_START_INDEX[book.name];

    const end = start + book.chapters - 1;

    if (index >= start && index <= end) {
      return {
        book: book.name,
        chapter: index - start + 1,
      };
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* READING PLAN PARSER                                                       */
/* -------------------------------------------------------------------------- */

function parseSingleBookChapters(book: BibleBook, text: string): string[] {
  const result: string[] = [];

  const tokens = text.replace(/,/g, " ").split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);

    if (range) {
      const start = Number(range[1]);

      const end = Number(range[2]);

      const safeStart = Math.max(1, start);

      const safeEnd = Math.min(end, book.chapters);

      for (let chapter = safeStart; chapter <= safeEnd; chapter += 1) {
        result.push(chapterKey(book.name, chapter));
      }

      continue;
    }

    const chapter = Number(token);

    if (Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters) {
      result.push(chapterKey(book.name, chapter));
    }
  }

  return result;
}

function parseReadingReference(reference: string): string[] {
  const normalized = reference
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  /* Cross-book range */
  const crossRegex = new RegExp(
    `^(${BOOK_PATTERN})\\s+(\\d+)\\s*-\\s*(${BOOK_PATTERN})\\s+(\\d+)$`,
    "i",
  );

  const crossMatch = normalized.match(crossRegex);

  if (crossMatch) {
    const startBook = getBook(crossMatch[1]);

    const endBook = getBook(crossMatch[3]);

    if (!startBook || !endBook) {
      return [];
    }

    const startIndex = getGlobalChapterIndex(
      startBook.name,
      Number(crossMatch[2]),
    );

    const endIndex = getGlobalChapterIndex(endBook.name, Number(crossMatch[4]));

    if (startIndex === null || endIndex === null || startIndex > endIndex) {
      return [];
    }

    const result: string[] = [];

    for (let index = startIndex; index <= endIndex; index += 1) {
      const location = getChapterAtGlobalIndex(index);

      if (!location) {
        continue;
      }

      result.push(chapterKey(location.book, location.chapter));
    }

    return Array.from(new Set(result));
  }

  /* Single-book range */
  const singleRegex = new RegExp(`^(${BOOK_PATTERN})\\s+(.+)$`, "i");

  const singleMatch = normalized.match(singleRegex);

  if (!singleMatch) {
    return [];
  }

  const book = getBook(singleMatch[1]);

  if (!book) {
    return [];
  }

  return Array.from(new Set(parseSingleBookChapters(book, singleMatch[2])));
}

/* -------------------------------------------------------------------------- */
/* CHAPTER TO READING DAY                                                    */
/* -------------------------------------------------------------------------- */

const CHAPTER_DAY_MAP: Record<string, number> = {};

for (const planDay of readingPlan) {
  const keys = parseReadingReference(planDay.reference);

  for (const key of keys) {
    CHAPTER_DAY_MAP[key] = planDay.day;
  }
}

/* -------------------------------------------------------------------------- */
/* PROGRESS NORMALIZATION                                                     */
/* -------------------------------------------------------------------------- */

function normalizeProgress(value: unknown): ChapterProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;

  const result: ChapterProgress = {};

  /* Current flat format */
  for (const [key, item] of Object.entries(source)) {
    if (key.includes(":") && typeof item === "boolean") {
      result[key] = item;
    }
  }

  /* Legacy nested format */
  if (Object.keys(result).length === 0) {
    for (const item of Object.values(source)) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        continue;
      }

      for (const [key, completed] of Object.entries(
        item as Record<string, unknown>,
      )) {
        if (typeof completed === "boolean") {
          result[key] = completed;
        }
      }
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* BIBLE SUBJECTS                                                            */
/* -------------------------------------------------------------------------- */

type BibleSubject = {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const BIBLE_SUBJECTS: BibleSubject[] = [
  {
    title: "God",
    description: "Who God is, His nature, attributes, and work.",
    icon: "weather-sunny",
  },
  {
    title: "Christ",
    description:
      "The person, life, work, death, resurrection, and glory of Christ.",
    icon: "cross",
  },
  {
    title: "Holy Spirit",
    description:
      "The person and work of the Spirit in God's economy and in believers.",
    icon: "weather-windy",
  },
  {
    title: "Salvation",
    description: "God's salvation and its experience in the believer.",
    icon: "lifebuoy",
  },
  {
    title: "Faith",
    description: "Believing in God and living by faith.",
    icon: "shield-check-outline",
  },
  {
    title: "Prayer",
    description: "Coming to God, fellowship with Him, and prayerful living.",
    icon: "hands-pray",
  },
  {
    title: "The Word of God",
    description: "Scripture, God's speaking, and receiving the Word.",
    icon: "book-open-page-variant",
  },
  {
    title: "Church",
    description: "The church, its nature, function, and corporate life.",
    icon: "account-group-outline",
  },
  {
    title: "Kingdom of God",
    description: "The kingdom, its reality, coming, and administration.",
    icon: "crown-outline",
  },
  {
    title: "Christian Living",
    description: "Daily living, conduct, character, and walking before God.",
    icon: "walk",
  },
  {
    title: "Love",
    description: "God's love and the believer's love toward God and others.",
    icon: "heart-outline",
  },
  {
    title: "Sin & Repentance",
    description: "Sin, confession, repentance, forgiveness, and restoration.",
    icon: "backup-restore",
  },
  {
    title: "Wisdom",
    description: "Godly wisdom, understanding, and practical living.",
    icon: "lightbulb-outline",
  },
  {
    title: "Worship & Praise",
    description: "Worship, praise, thanksgiving, and honoring God.",
    icon: "music-note-outline",
  },
  {
    title: "Suffering & Trials",
    description: "Endurance, testing, discipline, and God's care in trials.",
    icon: "weather-lightning",
  },
  {
    title: "Hope & Eternal Life",
    description: "Hope in God, resurrection, and eternal life.",
    icon: "infinity",
  },
  {
    title: "Prophecy",
    description: "Biblical prophecy, God's purpose, and things to come.",
    icon: "eye-outline",
  },
  {
    title: "God's People",
    description:
      "God's people, Israel, believers, and their relationship with Him.",
    icon: "account-multiple-outline",
  },
  {
    title: "Spiritual Growth",
    description:
      "Growth in life, maturity, transformation, and spiritual experience.",
    icon: "sprout-outline",
  },
  {
    title: "Christian Service",
    description:
      "Serving God, the church, and others according to God's purpose.",
    icon: "hand-heart-outline",
  },
];

/* -------------------------------------------------------------------------- */
/* BOOK GROUP                                                                */
/* -------------------------------------------------------------------------- */

function BookGroup({
  group,
  fontColor,
  secondaryColor,
  mutedColor,
  surfaceColor,
  getCompletedForBook,
  onSelectBook,
}: {
  group: BibleGroup;
  fontColor: string;
  secondaryColor: string;
  mutedColor: string;
  surfaceColor: string;
  getCompletedForBook: (book: BibleBook) => number;
  onSelectBook: (book: BibleBook) => void;
}) {
  if (group.books.length === 0) {
    return null;
  }

  return (
    <View style={styles.groupBlock}>
      <View style={styles.groupHeader}>
        <View
          style={[
            styles.groupMarker,
            {
              backgroundColor: fontColor,
            },
          ]}
        />

        <Text
          style={[
            styles.groupTitle,
            {
              color: fontColor,
            },
          ]}
        >
          {group.title}
        </Text>

        <Text
          style={[
            styles.groupCount,
            {
              color: secondaryColor,
            },
          ]}
        >
          {group.books.length}
        </Text>
      </View>

      <GlassCard intensity={48} style={styles.booksCard}>
        {group.books.map((book) => {
          const completed = getCompletedForBook(book);

          const percent =
            book.chapters > 0
              ? Math.round((completed / book.chapters) * 100)
              : 0;

          const fullyCompleted = completed === book.chapters;

          return (
            <Pressable
              key={book.name}
              onPress={() => onSelectBook(book)}
              style={({ pressed }) => [
                styles.bookRow,
                {
                  opacity: pressed ? 0.68 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.bookIcon,
                  {
                    backgroundColor: fontColor + "18",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="book-open-outline"
                  size={20}
                  color={fontColor}
                />
              </View>

              <View style={styles.bookTextWrap}>
                <Text
                  style={[
                    styles.bookName,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  {book.name}
                </Text>

                <Text
                  style={[
                    styles.bookMeta,
                    {
                      color: secondaryColor,
                    },
                  ]}
                >
                  {completed} / {book.chapters} chapters
                </Text>

                <View
                  style={[
                    styles.bookProgressTrack,
                    {
                      backgroundColor: surfaceColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.bookProgressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: fontColor,
                      },
                    ]}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.bookProgressPill,
                  {
                    backgroundColor: fullyCompleted ? fontColor : surfaceColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bookProgressText,
                    {
                      color: fullyCompleted ? "#FFFFFF" : secondaryColor,
                    },
                  ]}
                >
                  {percent}%
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={mutedColor}
              />
            </Pressable>
          );
        })}
      </GlassCard>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN SCREEN                                                                */
/* -------------------------------------------------------------------------- */

export default function BibleScreen() {
  const { fontColor, themeMode } = useTheme();

  const isNight = themeMode === "night";

  const secondaryColor = isNight
    ? "rgba(255,255,255,0.58)"
    : "rgba(24,24,24,0.58)";

  const mutedColor = isNight ? "rgba(255,255,255,0.42)" : "rgba(24,24,24,0.42)";

  const surfaceColor = isNight
    ? "rgba(255,255,255,0.065)"
    : "rgba(24,24,24,0.055)";

  const [chapterProgress, setChapterProgress] = useState<ChapterProgress>({});

  const [search, setSearch] = useState("");

  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const [subjectsExpanded, setSubjectsExpanded] = useState(false);

  const [subjectImage, setSubjectImage] = useState<"SOT" | "NOT" | null>(null);

  const [subjectImageScale, setSubjectImageScale] = useState(1);

  const loadProgress = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CHAPTER_PROGRESS_KEY);

      if (!saved) {
        setChapterProgress({});
        return;
      }

      const parsed = JSON.parse(saved);

      const normalized = normalizeProgress(parsed);

      setChapterProgress(normalized);

      const normalizedString = JSON.stringify(normalized);

      if (normalizedString !== saved) {
        await AsyncStorage.setItem(CHAPTER_PROGRESS_KEY, normalizedString);
      }
    } catch (error) {
      console.log("Error loading Bible progress:", error);

      setChapterProgress({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress]),
  );

  const getCompletedForBook = useCallback(
    (book: BibleBook) => {
      let completed = 0;

      for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
        const key = chapterKey(book.name, chapter);

        if (chapterProgress[key] === true) {
          completed += 1;
        }
      }

      return completed;
    },
    [chapterProgress],
  );

  const totalBibleChapters = ALL_BOOKS.reduce(
    (total, book) => total + book.chapters,
    0,
  );

  const completedBibleChapters = ALL_BOOKS.reduce(
    (total, book) => total + getCompletedForBook(book),
    0,
  );

  const overallPercent =
    totalBibleChapters > 0
      ? Math.round((completedBibleChapters / totalBibleChapters) * 100)
      : 0;

  const filteredTestaments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return TESTAMENTS;
    }

    return TESTAMENTS.map((testament) => ({
      ...testament,
      groups: testament.groups
        .map((group) => ({
          ...group,
          books: group.books.filter((book) =>
            book.name.toLowerCase().includes(query),
          ),
        }))
        .filter((group) => group.books.length > 0),
    })).filter((testament) => testament.groups.length > 0);
  }, [search]);

  const selectedBookCompleted = selectedBook
    ? getCompletedForBook(selectedBook)
    : 0;

  function openChapter(book: BibleBook, chapter: number) {
    const key = chapterKey(book.name, chapter);

    const day = CHAPTER_DAY_MAP[key];

    if (day === undefined) {
      return;
    }

    router.push({
      pathname: "/reading",
      params: {
        day: day.toString(),
      },
    });
  }

  function renderChapterGrid() {
    if (!selectedBook) {
      return null;
    }

    const percent =
      selectedBook.chapters > 0
        ? Math.round((selectedBookCompleted / selectedBook.chapters) * 100)
        : 0;

    return (
      <>
        <View style={styles.selectedBookHeader}>
          <Pressable
            onPress={() => setSelectedBook(null)}
            style={({ pressed }) => [
              styles.backRow,
              {
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={fontColor}
            />

            <Text
              style={[
                styles.backText,
                {
                  color: secondaryColor,
                },
              ]}
            >
              Books
            </Text>
          </Pressable>

          <GlassCard intensity={50} style={styles.selectedBookCard}>
            <View style={styles.selectedBookTitleRow}>
              <View
                style={[
                  styles.selectedBookIcon,
                  {
                    backgroundColor: fontColor + "18",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="book-open-page-variant"
                  size={22}
                  color={fontColor}
                />
              </View>

              <View style={styles.selectedBookTitleWrap}>
                <Text
                  style={[
                    styles.selectedBookTitle,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  {selectedBook.name}
                </Text>

                <Text
                  style={[
                    styles.selectedBookSubtitle,
                    {
                      color: secondaryColor,
                    },
                  ]}
                >
                  {selectedBookCompleted} / {selectedBook.chapters} chapters
                </Text>
              </View>

              <Text
                style={[
                  styles.selectedBookPercent,
                  {
                    color: fontColor,
                  },
                ]}
              >
                {percent}%
              </Text>
            </View>

            <View style={styles.selectedBookTrack}>
              <View
                style={[
                  styles.selectedBookFill,
                  {
                    width: `${percent}%`,
                    backgroundColor: fontColor,
                  },
                ]}
              />
            </View>
          </GlassCard>
        </View>

        <GlassCard intensity={isNight ? 50 : 46} style={styles.chapterCard}>
          <View style={styles.chapterGrid}>
            {Array.from(
              {
                length: selectedBook.chapters,
              },
              (_, index) => {
                const chapter = index + 1;

                const key = chapterKey(selectedBook.name, chapter);

                const completed = chapterProgress[key] === true;

                const hasReadingDay = CHAPTER_DAY_MAP[key] !== undefined;

                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (hasReadingDay) {
                        openChapter(selectedBook, chapter);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.chapterButton,
                      {
                        backgroundColor: completed
                          ? fontColor
                          : isNight
                            ? "rgba(255,255,255,0.055)"
                            : "rgba(24,24,24,0.045)",

                        borderColor: completed
                          ? fontColor
                          : isNight
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(24,24,24,0.10)",

                        opacity: hasReadingDay ? (pressed ? 0.68 : 1) : 0.45,
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
                  </Pressable>
                );
              },
            )}
          </View>
        </GlassCard>
      </>
    );
  }

  if (selectedBook) {
    return (
      <ScreenBackground>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 125,
            },
          ]}
        >
          {renderChapterGrid()}
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 125,
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text
            style={[
              styles.appLabel,
              {
                color: secondaryColor,
              },
            ]}
          >
            BIBLE
          </Text>

          <View style={styles.titleRow}>
            <View>
              <Text
                style={[
                  styles.title,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Books
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: secondaryColor,
                  },
                ]}
              >
                The 66 books of the Bible
              </Text>
            </View>

            <View
              style={[
                styles.bookCountBadge,
                {
                  backgroundColor: surfaceColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.bookCountNumber,
                  {
                    color: fontColor,
                  },
                ]}
              >
                66
              </Text>

              <Text
                style={[
                  styles.bookCountLabel,
                  {
                    color: secondaryColor,
                  },
                ]}
              >
                BOOKS
              </Text>
            </View>
          </View>
        </View>

        {/* OVERALL PROGRESS */}
        <GlassCard intensity={54} style={styles.overallCard}>
          <View style={styles.overallHeader}>
            <View style={styles.overallIcon}>
              <MaterialCommunityIcons
                name="book-check-outline"
                size={23}
                color={fontColor}
              />
            </View>

            <View style={styles.overallTextWrap}>
              <Text
                style={[
                  styles.overallTitle,
                  {
                    color: fontColor,
                  },
                ]}
              >
                Bible Progress
              </Text>

              <Text
                style={[
                  styles.overallSubtitle,
                  {
                    color: secondaryColor,
                  },
                ]}
              >
                {completedBibleChapters} of {totalBibleChapters} chapters
                completed
              </Text>
            </View>

            <Text
              style={[
                styles.overallPercent,
                {
                  color: fontColor,
                },
              ]}
            >
              {overallPercent}%
            </Text>
          </View>

          <View style={styles.overallTrack}>
            <View
              style={[
                styles.overallFill,
                {
                  width: `${overallPercent}%`,
                  backgroundColor: fontColor,
                },
              ]}
            />
          </View>
        </GlassCard>

        {/* BIBLE SUBJECTS */}
        <GlassCard intensity={52} style={styles.subjectsCard}>
          <Pressable
            onPress={() => setSubjectsExpanded((value) => !value)}
            style={({ pressed }) => [
              styles.subjectsHeader,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.subjectsHeaderLeft}>
              <View
                style={[
                  styles.subjectsIcon,
                  { backgroundColor: fontColor + "18" },
                ]}
              >
                <MaterialCommunityIcons
                  name="book-search-outline"
                  size={22}
                  color={fontColor}
                />
              </View>

              <View style={styles.subjectsTextWrap}>
                <Text style={[styles.subjectsTitle, { color: fontColor }]}>
                  Memorize the Subjects of the Bible!
                </Text>
              </View>
            </View>

            <MaterialCommunityIcons
              name={subjectsExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={mutedColor}
            />
          </Pressable>

          {subjectsExpanded && (
            <View style={styles.subjectsList}>
              <Pressable
                onPress={() => {
                  setSubjectImageScale(1);
                  setSubjectImage("SOT");
                }}
                style={({ pressed }) => [
                  styles.subjectTab,
                  {
                    backgroundColor: isNight
                      ? "rgba(255,255,255,0.055)"
                      : "rgba(24,24,24,0.045)",
                    borderColor: isNight
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(24,24,24,0.09)",
                    opacity: pressed ? 0.68 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.subjectTabIcon,
                    { backgroundColor: fontColor + "18" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="book-open-outline"
                    size={21}
                    color={fontColor}
                  />
                </View>

                <Text style={[styles.subjectTabText, { color: fontColor }]}>
                  The Subject of the Books in the Old Testament
                </Text>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={21}
                  color={mutedColor}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  setSubjectImageScale(1);
                  setSubjectImage("NOT");
                }}
                style={({ pressed }) => [
                  styles.subjectTab,
                  {
                    backgroundColor: isNight
                      ? "rgba(255,255,255,0.055)"
                      : "rgba(24,24,24,0.045)",
                    borderColor: isNight
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(24,24,24,0.09)",
                    opacity: pressed ? 0.68 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.subjectTabIcon,
                    { backgroundColor: fontColor + "18" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="book-open-page-variant"
                    size={21}
                    color={fontColor}
                  />
                </View>

                <Text style={[styles.subjectTabText, { color: fontColor }]}>
                  The Subject of the Books in the New Testament
                </Text>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={21}
                  color={mutedColor}
                />
              </Pressable>
            </View>
          )}
        </GlassCard>

        <Modal
          visible={subjectImage !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSubjectImage(null)}
        >
          <View style={styles.subjectViewer}>
            <View style={styles.subjectViewerTop}>
              <Text style={styles.subjectViewerTitle}>
                {subjectImage === "SOT"
                  ? "Old Testament Subjects"
                  : "New Testament Subjects"}
              </Text>

              <Pressable
                onPress={() => setSubjectImage(null)}
                style={styles.subjectViewerClose}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={25}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.subjectImageScroll}
              contentContainerStyle={styles.subjectImageContent}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={subjectImage === "SOT" ? SOT_IMAGE : NOT_IMAGE}
                style={[
                  styles.subjectImage,
                  { transform: [{ scale: subjectImageScale }] },
                ]}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.subjectZoomControls}>
              <Pressable
                onPress={() =>
                  setSubjectImageScale((value) => Math.max(1, value - 0.25))
                }
                style={styles.subjectZoomButton}
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={24}
                  color="#FFFFFF"
                />
              </Pressable>

              <Text style={styles.subjectZoomText}>
                {Math.round(subjectImageScale * 100)}%
              </Text>

              <Pressable
                onPress={() =>
                  setSubjectImageScale((value) => Math.min(4, value + 0.25))
                }
                style={styles.subjectZoomButton}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={() => setSubjectImageScale(1)}
                style={styles.subjectResetButton}
              >
                <MaterialCommunityIcons
                  name="restore"
                  size={21}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* SEARCH */}
        <GlassCard intensity={50} style={styles.searchCard}>
          <View style={styles.searchInner}>
            <View style={styles.searchIconBox}>
              <MaterialCommunityIcons
                name="magnify"
                size={21}
                color={secondaryColor}
              />
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search Bible Book"
              placeholderTextColor={mutedColor}
              style={[
                styles.searchInput,
                {
                  color: fontColor,
                },
              ]}
              textAlignVertical="center"
              returnKeyType="search"
              autoCapitalize="words"
              autoCorrect={false}
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={10}
                style={styles.clearSearch}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={19}
                  color={mutedColor}
                />
              </Pressable>
            )}
          </View>
        </GlassCard>

        {/* TESTAMENTS */}
        {filteredTestaments.map((testament) => (
          <View key={testament.title} style={styles.testamentBlock}>
            <View style={styles.testamentHeader}>
              <View style={styles.testamentTitleWrap}>
                <Text
                  style={[
                    styles.testamentTitle,
                    {
                      color: fontColor,
                    },
                  ]}
                >
                  {testament.title}
                </Text>

                <Text
                  style={[
                    styles.testamentSubtitle,
                    {
                      color: secondaryColor,
                    },
                  ]}
                >
                  {testament.subtitle}
                </Text>
              </View>

              <MaterialCommunityIcons
                name={
                  testament.title === "Old Testament"
                    ? "book-open-outline"
                    : "book-open-page-variant"
                }
                size={24}
                color={mutedColor}
              />
            </View>

            {testament.groups.map((group) => (
              <BookGroup
                key={group.title}
                group={group}
                fontColor={fontColor}
                secondaryColor={secondaryColor}
                mutedColor={mutedColor}
                surfaceColor={surfaceColor}
                getCompletedForBook={getCompletedForBook}
                onSelectBook={setSelectedBook}
              />
            ))}
          </View>
        ))}

        {filteredTestaments.length === 0 && (
          <GlassCard intensity={50} style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="book-search-outline"
              size={29}
              color={mutedColor}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: fontColor,
                },
              ]}
            >
              No books found
            </Text>

            <Text
              style={[
                styles.emptySubtitle,
                {
                  color: secondaryColor,
                },
              ]}
            >
              Try another book name.
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 26,
  },

  header: {
    marginBottom: 17,
  },

  appLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.4,
    marginBottom: 7,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  bookCountBadge: {
    width: 51,
    height: 51,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  bookCountNumber: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 20,
  },

  bookCountLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 1,
  },

  overallCard: {
    padding: 15,
    borderRadius: 21,
    marginBottom: 10,
  },

  overallHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  overallIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(128,128,128,0.08)",
  },

  overallTextWrap: {
    flex: 1,
  },

  overallTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  overallSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  overallPercent: {
    fontSize: 15,
    fontWeight: "800",
  },

  overallTrack: {
    width: "100%",
    height: 7,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 13,
    backgroundColor: "rgba(128,128,128,0.10)",
  },

  overallFill: {
    height: "100%",
    borderRadius: 99,
  },

  subjectsCard: {
    borderRadius: 22,
    padding: 8,
    marginBottom: 10,
  },

  subjectsHeader: {
    minHeight: 62,
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  subjectsHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  subjectsIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  subjectsTextWrap: {
    flex: 1,
    paddingRight: 8,
  },

  subjectsTitle: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },

  subjectsList: {
    marginTop: 5,
    paddingHorizontal: 5,
    gap: 9,
  },

  subjectTab: {
    minHeight: 76,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  subjectTabIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  subjectTabText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    paddingRight: 7,
  },

  subjectViewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },

  subjectViewerTop: {
    height: 68,
    paddingHorizontal: 18,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  subjectViewerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    paddingRight: 10,
  },

  subjectViewerClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  subjectImageScroll: {
    flex: 1,
  },

  subjectImageContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  subjectImage: {
    width: 350,
    height: 600,
  },

  subjectZoomControls: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  subjectZoomButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },

  subjectZoomText: {
    minWidth: 52,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  subjectResetButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  searchCard: {
    height: 55,
    borderRadius: 18,
    paddingHorizontal: 13,
    marginBottom: 23,
    justifyContent: "center",
  },

  searchInner: {
    height: 43,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },

  searchIconBox: {
    width: 30,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    height: 43,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 6,
    margin: 0,
    fontSize: 14,
    fontWeight: "500",
    includeFontPadding: false,
  },

  clearSearch: {
    width: 30,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  testamentBlock: {
    marginBottom: 15,
  },

  testamentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 2,
  },

  testamentTitleWrap: {
    flex: 1,
  },

  testamentTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  testamentSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },

  groupBlock: {
    marginBottom: 15,
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    paddingHorizontal: 2,
  },

  groupMarker: {
    width: 4,
    height: 17,
    borderRadius: 4,
    marginRight: 8,
  },

  groupTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.1,
  },

  groupCount: {
    fontSize: 10,
    fontWeight: "700",
    marginRight: 3,
  },

  booksCard: {
    borderRadius: 21,
    padding: 7,
  },

  bookRow: {
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  bookIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  bookTextWrap: {
    flex: 1,
    paddingRight: 7,
  },

  bookName: {
    fontSize: 13,
    fontWeight: "800",
  },

  bookMeta: {
    fontSize: 10,
    marginTop: 2,
  },

  bookProgressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 7,
  },

  bookProgressFill: {
    height: "100%",
    borderRadius: 99,
  },

  bookProgressPill: {
    minWidth: 47,
    minHeight: 29,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  bookProgressText: {
    fontSize: 9,
    fontWeight: "800",
  },

  selectedBookHeader: {
    marginBottom: 14,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 10,
  },

  backText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  selectedBookCard: {
    padding: 14,
    borderRadius: 21,
  },

  selectedBookTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  selectedBookIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  selectedBookTitleWrap: {
    flex: 1,
  },

  selectedBookTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  selectedBookSubtitle: {
    fontSize: 10,
    marginTop: 3,
  },

  selectedBookPercent: {
    fontSize: 14,
    fontWeight: "800",
  },

  selectedBookTrack: {
    height: 6,
    width: "100%",
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 12,
    backgroundColor: "rgba(128,128,128,0.10)",
  },

  selectedBookFill: {
    height: "100%",
    borderRadius: 99,
  },

  chapterCard: {
    borderRadius: 23,
    padding: 14,
  },

  chapterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    rowGap: 10,
  },

  chapterButton: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    margin: 0,
  },

  chapterNumber: {
    width: "100%",
    height: "100%",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    padding: 0,
    margin: 0,
  },

  emptyCard: {
    minHeight: 150,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 9,
  },

  emptySubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
});
