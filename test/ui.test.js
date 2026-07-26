// DOM-free unit tests for src/ui/render.js's pure helpers. jsdom is not
// installed in this project, so we only test the logic that doesn't touch
// the DOM: date formatting and the row -> cell-data transform.

import { describe, it, expect } from 'vitest';
import { formatPlanDate, formatLongDate, rowToCells } from '../src/ui/render.js';

describe('formatPlanDate', () => {
  it.each([
    [0, 1, 'Jan. 1'],
    [1, 12, 'Feb. 12'],
    [2, 5, 'Mar. 5'],
    [3, 30, 'Apr. 30'],
    [4, 15, 'May 15'], // no period after May
    [5, 29, 'Jun. 29'],
    [6, 4, 'Jul. 4'],
    [7, 31, 'Aug. 31'],
    [8, 1, 'Sep. 1'],
    [9, 31, 'Oct. 31'],
    [10, 11, 'Nov. 11'],
    [11, 25, 'Dec. 25'],
  ])('formats month index %i correctly', (month, day, expected) => {
    expect(formatPlanDate(new Date(2026, month, day))).toBe(expected);
  });
});

describe('formatLongDate', () => {
  it.each([
    [0, 1, 2026, 'January 1, 2026'],
    [1, 12, 2026, 'February 12, 2026'],
    [2, 5, 2026, 'March 5, 2026'],
    [3, 30, 2026, 'April 30, 2026'],
    [4, 15, 2026, 'May 15, 2026'],
    [5, 29, 2026, 'June 29, 2026'],
    [6, 4, 2026, 'July 4, 2026'],
    [7, 31, 2026, 'August 31, 2026'],
    [8, 1, 2026, 'September 1, 2026'],
    [9, 31, 2026, 'October 31, 2026'],
    [10, 11, 2026, 'November 11, 2026'],
    [11, 25, 2026, 'December 25, 2026'],
  ])('formats month index %i correctly', (month, day, year, expected) => {
    expect(formatLongDate(new Date(year, month, day))).toBe(expected);
  });

  it('includes the year even when it differs from the current year', () => {
    expect(formatLongDate(new Date(2023, 0, 1))).toBe('January 1, 2023');
  });
});

describe('rowToCells', () => {
  it('shapes a work-day row with all five columns', () => {
    const row = {
      day: 1,
      date: new Date(2023, 0, 1),
      off: false,
      today: '1:1',
      previous: 'N/A',
      review: 'N/A',
    };
    expect(rowToCells(row)).toEqual({
      off: false,
      day: 1,
      date: 'Jan. 1',
      today: '1:1',
      previous: 'N/A',
      review: 'N/A',
    });
  });

  it('shapes a work-day row with real previous/review data', () => {
    const row = {
      day: 8,
      date: new Date(2023, 0, 8),
      off: false,
      today: '1:7',
      previous: '1:6',
      review: '1:1–7',
    };
    expect(rowToCells(row)).toEqual({
      off: false,
      day: 8,
      date: 'Jan. 8',
      today: '1:7',
      previous: '1:6',
      review: '1:1–7',
    });
  });

  it('shapes an off-day row with no verse-column data', () => {
    const row = {
      day: 7,
      date: new Date(2023, 0, 7),
      off: true,
      today: null,
      previous: null,
      review: null,
    };
    expect(rowToCells(row)).toEqual({
      off: true,
      day: 7,
      date: 'Jan. 7',
    });
  });

  it('off-day cell shape has no today/previous/review keys', () => {
    const row = { day: 14, date: new Date(2023, 0, 14), off: true, today: null, previous: null, review: null };
    const cells = rowToCells(row);
    expect('today' in cells).toBe(false);
    expect('previous' in cells).toBe(false);
    expect('review' in cells).toBe(false);
  });
});
