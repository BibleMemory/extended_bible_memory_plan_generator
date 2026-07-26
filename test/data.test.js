import { describe, it, expect } from 'vitest';
import { BOOKS, getBook, totalVerses } from '../src/data/bible-books.js';

describe('BOOKS structure', () => {
  it('has exactly 66 books', () => {
    expect(BOOKS.length).toBe(66);
  });

  it('starts with Genesis and ends with Revelation', () => {
    expect(BOOKS[0].name).toBe('Genesis');
    expect(BOOKS[65].name).toBe('Revelation');
  });

  it('has Ephesians as the 49th book (index 48)', () => {
    expect(BOOKS[48].name).toBe('Ephesians');
  });

  it('uses standard English book names', () => {
    const names = BOOKS.map((b) => b.name);
    expect(names).toContain('Song of Solomon');
    expect(names).toContain('1 Samuel');
    expect(names).toContain('2 Corinthians');
    expect(names).toContain('Revelation');
    expect(names).not.toContain('Revelations');
  });
});

describe('getBook', () => {
  it('returns the book object by name', () => {
    const book = getBook('Ephesians');
    expect(book).toBeDefined();
    expect(book.name).toBe('Ephesians');
  });

  it('returns undefined for an unknown name', () => {
    expect(getBook('Not A Book')).toBeUndefined();
  });
});

describe('totalVerses', () => {
  it('sums the chapters of a book', () => {
    expect(totalVerses({ chapters: [1, 2, 3] })).toBe(6);
  });
});

describe('Ephesians versification', () => {
  it('has the exact KJV chapter/verse layout', () => {
    const book = getBook('Ephesians');
    expect(book.chapters).toEqual([23, 22, 21, 32, 33, 24]);
    expect(totalVerses(book)).toBe(155);
  });
});

describe('whole-Bible checksum', () => {
  it('totals exactly 31,102 verses across all 66 books', () => {
    const grandTotal = BOOKS.reduce((sum, book) => sum + totalVerses(book), 0);
    expect(grandTotal).toBe(31102);
  });

  it('Old Testament (books 1-39) totals 23,145 verses', () => {
    const otTotal = BOOKS.slice(0, 39).reduce((sum, book) => sum + totalVerses(book), 0);
    expect(otTotal).toBe(23145);
  });

  it('New Testament (books 40-66) totals 7,957 verses', () => {
    const ntTotal = BOOKS.slice(39, 66).reduce((sum, book) => sum + totalVerses(book), 0);
    expect(ntTotal).toBe(7957);
  });
});

describe('spot checks', () => {
  const cases = [
    ['Genesis', 50, 1533],
    ['Psalms', 150, 2461],
    ['Matthew', 28, 1071],
    ['John', 21, 879],
    ['Romans', 16, 433],
    ['Revelation', 22, 404],
    ['Obadiah', 1, 21],
    ['Philemon', 1, 25],
    ['2 John', 1, 13],
    ['3 John', 1, 14],
    ['Jude', 1, 25],
  ];

  for (const [name, chapterCount, verseCount] of cases) {
    it(`${name} has ${chapterCount} chapters and ${verseCount} verses`, () => {
      const book = getBook(name);
      expect(book.chapters.length).toBe(chapterCount);
      expect(totalVerses(book)).toBe(verseCount);
    });
  }

  it('Psalm 117 has 2 verses', () => {
    const psalms = getBook('Psalms');
    expect(psalms.chapters[116]).toBe(2);
  });

  it('Psalm 119 has 176 verses', () => {
    const psalms = getBook('Psalms');
    expect(psalms.chapters[118]).toBe(176);
  });
});
