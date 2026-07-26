import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/lib/schedule.js';
import { buildEstimateLines } from '../src/ui/render.js';

const EPHESIANS = { name: 'Ephesians', chapters: [23, 22, 21, 32, 33, 24] };

describe('completion estimates', () => {
  const plan = generateSchedule({
    book: EPHESIANS,
    startDate: new Date(2023, 0, 1),
    versesPerDay: 1,
    daysPerWeek: 6,
  });

  it('completionDate is the last row\'s date (day 180 → Jun 29 2023)', () => {
    expect(plan.completionDate.getTime()).toBe(
      plan.rows[plan.rows.length - 1].date.getTime()
    );
    expect(plan.completionDate.getFullYear()).toBe(2023);
    expect(plan.completionDate.getMonth()).toBe(5);
    expect(plan.completionDate.getDate()).toBe(29);
  });

  it('padded date allows 10% slippage (ceil(180·1.1)=198 days → Jul 17 2023)', () => {
    expect(plan.paddedCompletionDate.getFullYear()).toBe(2023);
    expect(plan.paddedCompletionDate.getMonth()).toBe(6);
    expect(plan.paddedCompletionDate.getDate()).toBe(17);
  });

  it('rounds padding up on non-integer results', () => {
    // 25-verse book, 1/day, 7/wk → 25 days; ceil(27.5)=28 → 3 extra days.
    const philemon = { name: 'Philemon', chapters: [25] };
    const p = generateSchedule({
      book: philemon,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 7,
    });
    expect(p.totalDays).toBe(25);
    expect(p.completionDate.getDate()).toBe(25); // Jan 25
    expect(p.paddedCompletionDate.getDate()).toBe(28); // Jan 28
  });

  it('formats the header lines exactly', () => {
    expect(buildEstimateLines(plan)).toEqual([
      'Estimated Completion Date (according to plan): June 29, 2023',
      'Estimated Completion Date (with 10% padding): July 17, 2023',
    ]);
  });
});
