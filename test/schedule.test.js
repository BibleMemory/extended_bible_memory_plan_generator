import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/lib/schedule.js';

const EPHESIANS = { name: 'Ephesians', chapters: [23, 22, 21, 32, 33, 24] };

/** Assert a Date matches a given local month (0-based) and day-of-month. */
function expectDate(date, month, dayOfMonth) {
  expect(date.getMonth()).toBe(month);
  expect(date.getDate()).toBe(dayOfMonth);
}

describe('generateSchedule — Ephesians golden checkpoint (Appendix 2)', () => {
  const result = generateSchedule({
    book: EPHESIANS,
    startDate: new Date(2023, 0, 1),
    versesPerDay: 1,
    daysPerWeek: 6,
  });

  it('has the right overall shape', () => {
    expect(result.title).toBe('Ephesians Memorization Plan');
    expect(result.totalDays).toBe(180);
    expect(result.rows.length).toBe(180);
    expect(result.warning).toBe(false);
    expect(result.totalVerses).toBe(155);
  });

  it('has off days exactly where day % 7 === 0, and day 180 is a work day', () => {
    for (const row of result.rows) {
      if (row.day % 7 === 0) {
        expect(row.off).toBe(true);
      } else {
        expect(row.off).toBe(false);
      }
    }
    const day180 = result.rows[179];
    expect(day180.day).toBe(180);
    expect(day180.off).toBe(false);
  });

  it.each([
    [1, 0, 1, '1:1', 'N/A', 'N/A'],
    [2, 0, 2, '1:2', '1:1', '1:1–2'],
    [6, 0, 6, '1:6', '1:5', '1:1–6'],
    [8, 0, 8, '1:7', '1:6', '1:1–7'], // previous skips the day-7 off row
    [13, 0, 13, '1:12', '1:11', '1:1–12'],
    [15, 0, 15, '1:13', '1:12', '1:1–13'],
    [27, 0, 27, '2:1', '1:23', '1:1–2:1'], // cross-chapter review notation
    [29, 0, 29, '2:2', '2:1', '1:1–2:2'],
    [53, 1, 22, '3:1', '2:22', '1:1–3:1'],
    [78, 2, 19, '4:1', '3:21', '1:1–4:1'],
    [115, 3, 25, '5:1', '4:32', '1:1–5:1'],
    [153, 5, 2, '6:1', '5:33', '1:1–6:1'],
    [180, 5, 29, '6:24', '6:23', '1:1–6:24'],
  ])('day %i', (day, month, dayOfMonth, today, previous, review) => {
    const row = result.rows[day - 1];
    expect(row.day).toBe(day);
    expectDate(row.date, month, dayOfMonth);
    expect(row.today).toBe(today);
    expect(row.previous).toBe(previous);
    expect(row.review).toBe(review);
  });
});

describe('generateSchedule — input validation', () => {
  it('throws TypeError for a missing/invalid book', () => {
    expect(() =>
      generateSchedule({ book: null, startDate: new Date(2023, 0, 1) })
    ).toThrow(TypeError);
    expect(() =>
      generateSchedule({ book: { name: 'X', chapters: [] }, startDate: new Date(2023, 0, 1) })
    ).toThrow(TypeError);
    expect(() =>
      generateSchedule({
        book: { name: 'X', chapters: [1, 0, 3] },
        startDate: new Date(2023, 0, 1),
      })
    ).toThrow(TypeError);
  });

  it('throws TypeError for an invalid startDate', () => {
    expect(() =>
      generateSchedule({ book: EPHESIANS, startDate: new Date('not a date') })
    ).toThrow(TypeError);
    expect(() => generateSchedule({ book: EPHESIANS, startDate: '2023-01-01' })).toThrow(
      TypeError
    );
  });

  it('throws TypeError for invalid versesPerDay', () => {
    expect(() =>
      generateSchedule({ book: EPHESIANS, startDate: new Date(2023, 0, 1), versesPerDay: 0 })
    ).toThrow(TypeError);
    expect(() =>
      generateSchedule({ book: EPHESIANS, startDate: new Date(2023, 0, 1), versesPerDay: 1.5 })
    ).toThrow(TypeError);
  });

  it('throws TypeError for invalid daysPerWeek', () => {
    expect(() =>
      generateSchedule({ book: EPHESIANS, startDate: new Date(2023, 0, 1), daysPerWeek: 0 })
    ).toThrow(TypeError);
    expect(() =>
      generateSchedule({ book: EPHESIANS, startDate: new Date(2023, 0, 1), daysPerWeek: 8 })
    ).toThrow(TypeError);
  });
});

describe('generateSchedule — daysPerWeek = 7 (no off days)', () => {
  const THIRD_JOHN = { name: '3 John', chapters: [14] };

  it('produces zero off rows and one row per verse', () => {
    const result = generateSchedule({
      book: THIRD_JOHN,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 7,
    });
    expect(result.rows.length).toBe(14);
    expect(result.rows.every((r) => r.off === false)).toBe(true);
    expect(result.rows[13].today).toBe('1:14');
  });
});

describe('generateSchedule — versesPerDay = 5, 3 John, daysPerWeek = 7', () => {
  // 14 verses / 5 per day -> 3 rows (5, 5, 4 remaining).
  // Note: review runs through TODAY's last verse (see schedule.js comment),
  // matching the golden Ephesians fixture's semantics, so review on day 2 is
  // "1:1–10" (through today's 1:10), not "1:1–5" (through the previous day).
  const result = generateSchedule({
    book: { name: '3 John', chapters: [14] },
    startDate: new Date(2023, 0, 1),
    versesPerDay: 5,
    daysPerWeek: 7,
  });

  it('has 3 rows', () => {
    expect(result.rows.length).toBe(3);
  });

  it.each([
    [0, '1:1–5', 'N/A', 'N/A'],
    [1, '1:6–10', '1:1–5', '1:1–10'],
    [2, '1:11–14', '1:6–10', '1:1–14'],
  ])('row %i', (index, today, previous, review) => {
    const row = result.rows[index];
    expect(row.today).toBe(today);
    expect(row.previous).toBe(previous);
    expect(row.review).toBe(review);
  });
});

describe('generateSchedule — versesPerDay = 2 crossing a chapter boundary', () => {
  it('formats a range spanning chapters 1 and 2 of Ephesians', () => {
    const result = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 2,
      daysPerWeek: 7,
    });
    // Chapter 1 has 23 verses (odd), so verse 23 (1:23) pairs with 2:1 on day 12.
    const day12 = result.rows[11];
    expect(day12.today).toBe('1:23–2:1');
  });
});

describe('generateSchedule — daysPerWeek = 1', () => {
  it('has 1 work day followed by 6 off days per cycle', () => {
    const result = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 1,
    });
    // Work days are 1, 8, 15, 22, ... (every 7th day starting day 1).
    for (const row of result.rows) {
      const isExpectedWorkDay = (row.day - 1) % 7 === 0;
      expect(row.off).toBe(!isExpectedWorkDay);
    }
    // 155 verses at 1/day => 155 work days => last work day is day 1 + 7*154 = 1079.
    const lastWorkDayNumber = 1 + 7 * (155 - 1);
    expect(result.totalDays).toBe(lastWorkDayNumber);
    expect(result.rows[result.rows.length - 1].today).toBe('6:24');

    // Spot check dates: day 1 = Jan 1, day 8 = Jan 8 (next work day).
    expectDate(result.rows[0].date, 0, 1);
    expectDate(result.rows[7].date, 0, 8);
  });
});

describe('generateSchedule — the >160-verse warning threshold', () => {
  it('is false for exactly 160 verses', () => {
    const book = { name: 'Synthetic160', chapters: [160] };
    const result = generateSchedule({ book, startDate: new Date(2023, 0, 1) });
    expect(result.totalVerses).toBe(160);
    expect(result.warning).toBe(false);
  });

  it('is true for 161 verses', () => {
    const book = { name: 'Synthetic161', chapters: [161] };
    const result = generateSchedule({ book, startDate: new Date(2023, 0, 1) });
    expect(result.totalVerses).toBe(161);
    expect(result.warning).toBe(true);
  });
});

describe('generateSchedule — year boundary', () => {
  it('rolls dates from December into January of the next year', () => {
    const book = { name: 'Synthetic', chapters: [10] };
    const result = generateSchedule({
      book,
      startDate: new Date(2023, 11, 30), // Dec 30, 2023
      versesPerDay: 1,
      daysPerWeek: 7,
    });
    expect(result.rows[0].date.getFullYear()).toBe(2023);
    expectDate(result.rows[0].date, 11, 30); // Dec 30
    expectDate(result.rows[1].date, 11, 31); // Dec 31
    expect(result.rows[2].date.getFullYear()).toBe(2024);
    expectDate(result.rows[2].date, 0, 1); // Jan 1, 2024
  });
});

describe('generateSchedule — leap year', () => {
  it('hits Feb 29 in a plan spanning February 2024', () => {
    const book = { name: 'Synthetic', chapters: [70] }; // enough days to reach Feb 29
    const result = generateSchedule({
      book,
      startDate: new Date(2024, 0, 1), // Jan 1, 2024 (leap year)
      versesPerDay: 1,
      daysPerWeek: 7,
    });
    // Day 60 = Jan 1 + 59 days = Feb 29, 2024 (Jan has 31 days: 31 + 29 = 60).
    const feb29Row = result.rows[59];
    expect(feb29Row.date.getFullYear()).toBe(2024);
    expectDate(feb29Row.date, 1, 29);
  });
});
