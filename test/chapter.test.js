import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/lib/schedule.js';

const EPHESIANS = { name: 'Ephesians', chapters: [23, 22, 21, 32, 33, 24] };
const PSALMS_STUB = { name: 'Psalms', chapters: [6, 12, 8, 8, 12, 10] }; // shape-only stub

describe('generateSchedule — single-chapter plans', () => {
  it('chapter: null is identical to omitting chapter (whole book)', () => {
    const wholeBook = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 6,
    });
    const explicitNull = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 6,
      chapter: null,
    });
    expect(explicitNull).toEqual(wholeBook);
  });

  it('titles a chapter plan "<Book> <chapter> Memorization Plan"', () => {
    const result = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      chapter: 1,
    });
    expect(result.title).toBe('Ephesians 1 Memorization Plan');
  });

  it('covers exactly the selected chapter (Ephesians 1: 23 verses)', () => {
    const result = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 6,
      chapter: 1,
    });
    expect(result.totalVerses).toBe(23);
    const workRows = result.rows.filter((r) => !r.off);
    expect(workRows.length).toBe(23);
    expect(workRows[0].today).toBe('1:1');
    expect(workRows[22].today).toBe('1:23');
  });

  it('uses real chapter numbers in refs for a middle chapter (Ephesians 3)', () => {
    const result = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 6,
      chapter: 3,
    });
    expect(result.title).toBe('Ephesians 3 Memorization Plan');
    expect(result.totalVerses).toBe(21);
    const workRows = result.rows.filter((r) => !r.off);
    expect(workRows[0].today).toBe('3:1');
    expect(workRows[0].previous).toBe('N/A');
    expect(workRows[0].review).toBe('N/A');
    expect(workRows[1].today).toBe('3:2');
    expect(workRows[1].previous).toBe('3:1');
    expect(workRows[1].review).toBe('3:1–2');
    expect(workRows[20].today).toBe('3:21');
    expect(workRows[20].review).toBe('3:1–21');
  });

  it('cumulative review starts at the chapter start, not 1:1', () => {
    const result = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 2,
      daysPerWeek: 6,
      chapter: 6,
    });
    const workRows = result.rows.filter((r) => !r.off);
    expect(workRows[0].today).toBe('6:1–2');
    expect(workRows[1].review).toBe('6:1–4');
  });

  it('bases the warning flag on the chapter verse count, not the book', () => {
    // Whole-book Ephesians is under the threshold; a long stub chapter is not.
    const longChapterBook = { name: 'Stub', chapters: [200, 5] };
    const chapterPlan = generateSchedule({
      book: longChapterBook,
      startDate: new Date(2023, 0, 1),
      chapter: 2,
    });
    expect(chapterPlan.warning).toBe(false);
    const wholePlan = generateSchedule({
      book: longChapterBook,
      startDate: new Date(2023, 0, 1),
    });
    expect(wholePlan.warning).toBe(true);
    const bigChapterPlan = generateSchedule({
      book: longChapterBook,
      startDate: new Date(2023, 0, 1),
      chapter: 1,
    });
    expect(bigChapterPlan.warning).toBe(true);
  });

  it('rejects out-of-range or non-integer chapters', () => {
    const base = { book: PSALMS_STUB, startDate: new Date(2023, 0, 1) };
    expect(() => generateSchedule({ ...base, chapter: 0 })).toThrow(TypeError);
    expect(() => generateSchedule({ ...base, chapter: 7 })).toThrow(TypeError);
    expect(() => generateSchedule({ ...base, chapter: 1.5 })).toThrow(TypeError);
    expect(() => generateSchedule({ ...base, chapter: '2' })).toThrow(TypeError);
  });
});
