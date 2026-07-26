// Pure Bible-memorization schedule generator (Appendix 2 layout from
// "How to Memorize Scripture for Life"). No DOM, no I/O.

import { formatRange, refFromIndex } from './refs.js';

const WARNING_VERSE_THRESHOLD = 160;

/**
 * Add `days` calendar days to `date`, using local year/month/day components
 * so month and year rollovers (and leap days) are handled by native Date
 * normalization rather than manual arithmetic.
 */
function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function validateInputs({ book, startDate, versesPerDay, daysPerWeek, chapter }) {
  if (!book || typeof book !== 'object' || typeof book.name !== 'string' || !book.name) {
    throw new TypeError('book must be an object with a non-empty string `name`');
  }
  if (
    !Array.isArray(book.chapters) ||
    book.chapters.length === 0 ||
    !book.chapters.every((n) => Number.isInteger(n) && n > 0)
  ) {
    throw new TypeError('book.chapters must be a non-empty array of positive integers');
  }
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new TypeError('startDate must be a valid Date');
  }
  if (!Number.isInteger(versesPerDay) || versesPerDay < 1) {
    throw new TypeError('versesPerDay must be an integer >= 1');
  }
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    throw new TypeError('daysPerWeek must be an integer between 1 and 7');
  }
  if (
    chapter !== null &&
    (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters.length)
  ) {
    throw new TypeError(
      `chapter must be null or an integer between 1 and ${book.chapters.length}`
    );
  }
}

/**
 * Generate a day-by-day memorization schedule for a book of the Bible, or
 * for a single chapter of it when `chapter` is given (1-based; null = whole
 * book).
 *
 * @param {{book: {name: string, chapters: number[]}, startDate: Date, versesPerDay?: number, daysPerWeek?: number, chapter?: number|null}} opts
 * @returns {{title: string, rows: object[], totalDays: number, totalVerses: number, warning: boolean}}
 */
export function generateSchedule({ book, startDate, versesPerDay = 1, daysPerWeek = 6, chapter = null }) {
  validateInputs({ book, startDate, versesPerDay, daysPerWeek, chapter });

  const { chapters } = book;
  // For a single-chapter plan, verse indices are offset to the chapter's
  // start so refFromIndex still yields real chapter:verse references, and
  // the cumulative review starts at that chapter's first verse.
  const baseIndex =
    chapter === null ? 0 : chapters.slice(0, chapter - 1).reduce((sum, n) => sum + n, 0);
  const totalVerses = chapter === null
    ? chapters.reduce((sum, n) => sum + n, 0)
    : chapters[chapter - 1];
  const reviewStart = chapter === null ? { chapter: 1, verse: 1 } : { chapter, verse: 1 };
  const warning = totalVerses > WARNING_VERSE_THRESHOLD;

  const rows = [];

  // Text of the previous WORK day's "today" range — null until the first
  // work day has happened. "Previous" skips off days by construction: it's
  // only updated when we push a work-day row.
  let previousToday = null;

  let verseIndex = 0; // 0-based index of the next verse to assign
  let day = 0; // 1-based sequential day number, off days included

  while (verseIndex < totalVerses) {
    day += 1;
    const dayInCycle = (day - 1) % 7; // position within the repeating 7-day cycle
    const isWorkDay = dayInCycle < daysPerWeek;
    const date = addDays(startDate, day - 1);

    if (!isWorkDay) {
      rows.push({ day, date, off: true, today: null, previous: null, review: null });
      continue;
    }

    const startIdx = verseIndex;
    const endIdx = Math.min(verseIndex + versesPerDay, totalVerses) - 1; // last day may take fewer verses
    const todayStart = refFromIndex(chapters, baseIndex + startIdx);
    const todayEnd = refFromIndex(chapters, baseIndex + endIdx);
    const today = formatRange(todayStart, todayEnd);

    const isFirstWorkDay = previousToday === null;
    const previous = isFirstWorkDay ? 'N/A' : previousToday;
    // Cumulative review runs from 1:1 through TODAY's last verse (inclusive
    // of what was just learned), not just through yesterday's. Verified
    // against the published Appendix 2 table: day 2 is today "1:2" / review
    // "1:1–2", day 8 is today "1:7" / review "1:1–7" — both end at today's
    // verse, not the previous work day's.
    const review = isFirstWorkDay ? 'N/A' : formatRange(reviewStart, todayEnd);

    rows.push({ day, date, off: false, today, previous, review });

    previousToday = today;
    verseIndex = endIdx + 1;
  }

  return {
    title: chapter === null
      ? `${book.name} Memorization Plan`
      : `${book.name} ${chapter} Memorization Plan`,
    rows,
    totalDays: rows.length,
    totalVerses,
    warning,
  };
}
