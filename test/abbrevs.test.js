import { describe, it, expect } from 'vitest';
import { BOOKS } from '../src/data/bible-books.js';
import { BOOK_ABBREVS, getBookAbbrev } from '../src/data/book-abbrevs.js';

// The forms crossref.js's BOOK_NAME_MAP accepts for each of our books,
// transcribed from the tool's source (sanitized form: lowercase, spaces and
// periods stripped — matching its sanitize_ref/get_book pipeline).
const CROSSREF_ACCEPTED = {
  Genesis: 'gen', Exodus: 'ex', Leviticus: 'lev', Numbers: 'num',
  Deuteronomy: 'deut', Joshua: 'josh', Judges: 'judg', Ruth: 'ruth',
  '1 Samuel': '1sam', '2 Samuel': '2sam', '1 Kings': '1kgs', '2 Kings': '2kgs',
  '1 Chronicles': '1chron', '2 Chronicles': '2chron', Ezra: 'ezra',
  Nehemiah: 'neh', Esther: 'est', Job: 'job', Psalms: 'ps', Proverbs: 'prov',
  Ecclesiastes: 'eccl', 'Song of Solomon': 'songofsol', Isaiah: 'isa',
  Jeremiah: 'jer', Lamentations: 'lam', Ezekiel: 'ezek', Daniel: 'dan',
  Hosea: 'hos', Joel: 'joel', Amos: 'amos', Obadiah: 'obad', Jonah: 'jonah',
  Micah: 'mic', Nahum: 'nah', Habakkuk: 'hab', Zephaniah: 'zeph',
  Haggai: 'hag', Zechariah: 'zech', Malachi: 'mal', Matthew: 'matt',
  Mark: 'mark', Luke: 'luke', John: 'john', Acts: 'acts', Romans: 'rom',
  '1 Corinthians': '1cor', '2 Corinthians': '2cor', Galatians: 'gal',
  Ephesians: 'eph', Philippians: 'phil', Colossians: 'col',
  '1 Thessalonians': '1thess', '2 Thessalonians': '2thess',
  '1 Timothy': '1tim', '2 Timothy': '2tim', Titus: 'titus',
  Philemon: 'philem', Hebrews: 'heb', James: 'james', '1 Peter': '1pet',
  '2 Peter': '2pet', '1 John': '1john', '2 John': '2john', '3 John': '3john',
  Jude: 'jude', Revelation: 'rev',
};

function sanitizeLikeCrossref(abbrev) {
  return abbrev.toLowerCase().replace(/[ .]/g, '');
}

describe('book abbreviations', () => {
  it('covers all 66 books, no strays', () => {
    const names = BOOKS.map((b) => b.name);
    expect(names.every((n) => n in BOOK_ABBREVS)).toBe(true);
    expect(Object.keys(BOOK_ABBREVS).length).toBe(66);
  });

  it('every abbreviation sanitizes to a form crossref.js accepts', () => {
    for (const book of BOOKS) {
      expect(sanitizeLikeCrossref(getBookAbbrev(book.name))).toBe(
        CROSSREF_ACCEPTED[book.name]
      );
    }
  });

  it('spot checks', () => {
    expect(getBookAbbrev('Ephesians')).toBe('Eph.');
    expect(getBookAbbrev('Psalms')).toBe('Ps.');
    expect(getBookAbbrev('1 Peter')).toBe('1 Pet.');
    expect(getBookAbbrev('Song of Solomon')).toBe('Song of Sol.');
    expect(getBookAbbrev('Unknown Book')).toBe('Unknown Book');
  });
});
