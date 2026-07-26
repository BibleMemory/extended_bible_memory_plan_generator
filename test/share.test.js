import { describe, it, expect } from 'vitest';
import { readShareParams, writeShareParams, formatDateParam } from '../src/lib/share.js';

describe('readShareParams', () => {
  it('returns null with no bmp-book or an unknown book', () => {
    expect(readShareParams('')).toBeNull();
    expect(readShareParams('?foo=bar')).toBeNull();
    expect(readShareParams('?bmp-book=Hezekiah')).toBeNull();
  });

  it('reads a full valid selection', () => {
    const sel = readShareParams(
      '?bmp-book=Ephesians&bmp-chapter=3&bmp-start=2026-07-26&bmp-vpd=2&bmp-dpw=5'
    );
    expect(sel.book.name).toBe('Ephesians');
    expect(sel.chapter).toBe(3);
    expect(sel.startDateStr).toBe('2026-07-26');
    expect(sel.versesPerDay).toBe(2);
    expect(sel.daysPerWeek).toBe(5);
  });

  it('handles book names that need URL encoding', () => {
    const sel = readShareParams('?bmp-book=1%20Peter');
    expect(sel.book.name).toBe('1 Peter');
  });

  it('falls back to All for missing, "all", or invalid chapters', () => {
    const base = '?bmp-book=Ephesians';
    expect(readShareParams(base).chapter).toBeNull();
    expect(readShareParams(`${base}&bmp-chapter=all`).chapter).toBeNull();
    expect(readShareParams(`${base}&bmp-chapter=0`).chapter).toBeNull();
    expect(readShareParams(`${base}&bmp-chapter=7`).chapter).toBeNull(); // Ephesians has 6
    expect(readShareParams(`${base}&bmp-chapter=2.5`).chapter).toBeNull();
    expect(readShareParams(`${base}&bmp-chapter=x`).chapter).toBeNull();
  });

  it('falls back to null (today) for missing or invalid dates', () => {
    const base = '?bmp-book=Ephesians';
    expect(readShareParams(base).startDateStr).toBeNull();
    expect(readShareParams(`${base}&bmp-start=2026-02-30`).startDateStr).toBeNull();
    expect(readShareParams(`${base}&bmp-start=yesterday`).startDateStr).toBeNull();
    expect(readShareParams(`${base}&bmp-start=2026-13-01`).startDateStr).toBeNull();
  });

  it('falls back to default pace for invalid verses/days values', () => {
    const base = '?bmp-book=Ephesians';
    expect(readShareParams(`${base}&bmp-vpd=0`).versesPerDay).toBe(1);
    expect(readShareParams(`${base}&bmp-vpd=x`).versesPerDay).toBe(1);
    expect(readShareParams(`${base}&bmp-dpw=4`).daysPerWeek).toBe(6);
    expect(readShareParams(`${base}&bmp-dpw=8`).daysPerWeek).toBe(6);
    expect(readShareParams(`${base}&bmp-dpw=x`).daysPerWeek).toBe(6);
  });
});

describe('writeShareParams', () => {
  const selection = {
    bookName: 'Ephesians',
    chapter: 3,
    startDateStr: '2026-07-26',
    versesPerDay: 1,
    daysPerWeek: 6,
  };

  it('writes all five parameters', () => {
    const search = writeShareParams('', selection);
    const p = new URLSearchParams(search);
    expect(p.get('bmp-book')).toBe('Ephesians');
    expect(p.get('bmp-chapter')).toBe('3');
    expect(p.get('bmp-start')).toBe('2026-07-26');
    expect(p.get('bmp-vpd')).toBe('1');
    expect(p.get('bmp-dpw')).toBe('6');
  });

  it('writes "all" for a whole-book selection', () => {
    const search = writeShareParams('', { ...selection, chapter: null });
    expect(new URLSearchParams(search).get('bmp-chapter')).toBe('all');
  });

  it('preserves foreign parameters and overwrites stale bmp ones', () => {
    const search = writeShareParams('?utm_source=x&bmp-book=Psalms&bmp-chapter=90', selection);
    const p = new URLSearchParams(search);
    expect(p.get('utm_source')).toBe('x');
    expect(p.get('bmp-book')).toBe('Ephesians');
    expect(p.get('bmp-chapter')).toBe('3');
  });

  it('round-trips through readShareParams', () => {
    const sel = readShareParams(writeShareParams('', selection));
    expect(sel.book.name).toBe('Ephesians');
    expect(sel.chapter).toBe(3);
    expect(sel.startDateStr).toBe('2026-07-26');
    expect(sel.versesPerDay).toBe(1);
    expect(sel.daysPerWeek).toBe(6);
  });
});

describe('formatDateParam', () => {
  it('formats local date components zero-padded', () => {
    expect(formatDateParam(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateParam(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
