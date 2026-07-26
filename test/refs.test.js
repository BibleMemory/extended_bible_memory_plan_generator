import { describe, it, expect } from 'vitest';
import { formatRef, formatRange, refFromIndex } from '../src/lib/refs.js';

describe('formatRef', () => {
  it('formats a simple reference', () => {
    expect(formatRef({ chapter: 3, verse: 16 })).toBe('3:16');
  });

  it('formats chapter 1 verse 1', () => {
    expect(formatRef({ chapter: 1, verse: 1 })).toBe('1:1');
  });
});

describe('formatRange', () => {
  it('collapses to a single reference when start equals end', () => {
    expect(formatRange({ chapter: 1, verse: 5 }, { chapter: 1, verse: 5 })).toBe('1:5');
  });

  it('collapses the chapter on the right for same-chapter ranges', () => {
    expect(formatRange({ chapter: 1, verse: 1 }, { chapter: 1, verse: 13 })).toBe('1:1–13');
  });

  it('spells out both refs for cross-chapter ranges', () => {
    expect(formatRange({ chapter: 1, verse: 1 }, { chapter: 2, verse: 1 })).toBe('1:1–2:1');
    expect(formatRange({ chapter: 1, verse: 1 }, { chapter: 6, verse: 24 })).toBe('1:1–6:24');
  });

  it('uses an actual en dash character, not a hyphen', () => {
    const result = formatRange({ chapter: 1, verse: 1 }, { chapter: 1, verse: 2 });
    expect(result).toContain('–');
    expect(result).not.toContain('-');
    expect(result.includes('–')).toBe(true);
  });
});

describe('refFromIndex', () => {
  const chapters = [23, 22, 21, 32, 33, 24]; // Ephesians

  it('returns the first verse of the first chapter for index 0', () => {
    expect(refFromIndex(chapters, 0)).toEqual({ chapter: 1, verse: 1 });
  });

  it('returns the last verse of chapter 1 at index 22', () => {
    expect(refFromIndex(chapters, 22)).toEqual({ chapter: 1, verse: 23 });
  });

  it('transitions to chapter 2 verse 1 at index 23', () => {
    expect(refFromIndex(chapters, 23)).toEqual({ chapter: 2, verse: 1 });
  });

  it('transitions to chapter 3 correctly (23 + 22 = 45)', () => {
    expect(refFromIndex(chapters, 45)).toEqual({ chapter: 3, verse: 1 });
    expect(refFromIndex(chapters, 44)).toEqual({ chapter: 2, verse: 22 });
  });

  it('returns the final verse of the book at the last index', () => {
    const total = chapters.reduce((a, b) => a + b, 0);
    expect(refFromIndex(chapters, total - 1)).toEqual({ chapter: 6, verse: 24 });
  });

  it('throws for an out-of-range index', () => {
    const total = chapters.reduce((a, b) => a + b, 0);
    expect(() => refFromIndex(chapters, total)).toThrow(RangeError);
  });
});
