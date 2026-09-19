export type ReadingDay = {
  day: number;
  title: string;
  reference: string;
};

type BibleBook = {
  name: string;
  chapters: number;
};

const bibleBooks: BibleBook[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];

const TOTAL_DAYS = 365;

const totalChapters = bibleBooks.reduce(
  (total, book) => total + book.chapters,
  0,
);

function getChapterLocation(chapterNumber: number) {
  let remaining = chapterNumber;

  for (const book of bibleBooks) {
    if (remaining <= book.chapters) {
      return {
        book: book.name,
        chapter: remaining,
      };
    }

    remaining -= book.chapters;
  }

  throw new Error(
    `Chapter ${chapterNumber} is outside the Bible reading range.`,
  );
}

function createReference(startChapter: number, endChapter: number): string {
  const start = getChapterLocation(startChapter);
  const end = getChapterLocation(endChapter);

  if (start.book === end.book && start.chapter === end.chapter) {
    return `${start.book} ${start.chapter}`;
  }

  if (start.book === end.book) {
    return `${start.book} ${start.chapter}-${end.chapter}`;
  }

  return `${start.book} ${start.chapter}-${end.book} ${end.chapter}`;
}

function generateReadingPlan(): ReadingDay[] {
  const plan: ReadingDay[] = [];

  for (let day = 1; day <= TOTAL_DAYS; day++) {
    /*
     * Distribute all 1,189 Bible chapters across 365 days
     * while keeping the books in strict canonical order.
     *
     * This gives:
     * Day 1   = Genesis 1-3
     * Day 2   = Genesis 4-6
     * Day 3   = Genesis 7-9
     * Day 4   = Genesis 10-13
     *
     * and ends with:
     * Day 365 = Revelation 19-22
     */
    const startChapter =
      Math.floor(((day - 1) * totalChapters) / TOTAL_DAYS) + 1;

    const endChapter = Math.floor((day * totalChapters) / TOTAL_DAYS);

    plan.push({
      day,
      title: "Daily Reading",
      reference: createReference(startChapter, endChapter),
    });
  }

  return plan;
}

export const readingPlan: ReadingDay[] = generateReadingPlan();

export default readingPlan;
