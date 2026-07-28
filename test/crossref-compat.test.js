// Compatibility harness: ports the validation pipeline from Crossway's
// crossref.js (sanitize_ref / get_ranges / validate_ref, with its ESV
// chapter lengths) and runs every reference string the widget renders
// through it, proving the strings we emit are ones the real tool links.

import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/lib/schedule.js';
import { rowToCells } from '../src/ui/render.js';
import { getBookAbbrev } from '../src/data/book-abbrevs.js';

// --- ported from crossref.js (ESV verse counts, NOT our KJV data) -------
const BOOK_LENGTHS = {
  ephesians: [23, 22, 21, 32, 33, 24],
  philemon: [25],
  psalms: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6],
  // The tool's ESV count: chapter 13 has 13 verses (KJV has 14 — see the
  // edge-case test at the bottom).
  '2 corinthians': [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 13],
};

function sanitize_ref(ref) {
  ref = ref.replace(/ /g, '').replace(/[‐‑‒–—―-]/g, '-');
  return ref.replace(/\./g, ':').toLowerCase();
}

// get_book equivalent: our abbrevs sanitize to forms in crossref's map.
const ABBREV_TO_BOOK = {
  eph: 'ephesians',
  philem: 'philemon',
  ps: 'psalms',
  '2cor': '2 corinthians',
};
function get_book(ref) {
  ref = ref.replace(':', '');
  const book_part = ref.substring(0, ref.search(/\w\d/) + 1);
  return ABBREV_TO_BOOK[book_part];
}

function normalize_single_chapter_ref(ref) {
  const semi_parts = ref.split(';');
  if (semi_parts[0].indexOf(':') === -1) {
    const number_start = semi_parts[0].search(/[\w\s]\d/) + 1;
    semi_parts[0] =
      semi_parts[0].slice(0, number_start) + '1:' + semi_parts[0].slice(number_start);
  }
  return semi_parts.join(';');
}

function normalize_commas(range_part) {
  const parts = range_part.split(',');
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].indexOf(':') !== -1) continue;
    if (parts[0].indexOf(':') === -1) {
      if (parts[i].indexOf('-') === -1) parts[i] = parts[i] + ':1';
    } else {
      parts[i] = parts[0].split(':')[0].split('-')[0] + ':' + parts[i];
    }
  }
  return parts.join(';');
}

function get_ranges(ref) {
  ref = ref.slice(1);
  let range_part = ref.slice(ref.search(/\d/));
  range_part = normalize_commas(range_part);
  let semi_parts = range_part.split(/;/g);
  range_part = semi_parts[0];
  semi_parts = semi_parts.slice(1);

  let ranges = [];
  const dash_parts = range_part.split('-');
  const start_parts = dash_parts[0].split(':');
  ranges.push(dash_parts[0] + (start_parts.length === 2 ? '' : ':1'));
  if (dash_parts.length === 2) {
    const end_parts = dash_parts[1].split(':');
    const has_verse = end_parts.length === 2;
    if (start_parts.length === 2) {
      ranges.push((has_verse ? '' : start_parts[0] + ':') + dash_parts[1]);
    } else {
      ranges.push(dash_parts[1] + (has_verse ? '' : ':1'));
    }
  }
  for (let i = 0; i < semi_parts.length; i++) {
    if (semi_parts[i].split('-')[0].indexOf(':') === -1) {
      if (range_part.indexOf(':') === -1) {
        semi_parts[i] = semi_parts[i] + ':' + 1;
      }
    }
    ranges = ranges.concat(get_ranges('Book' + semi_parts[i]));
  }
  return ranges;
}

function validate_ref(ref) {
  ref = sanitize_ref(ref);
  const book = get_book(ref);
  if (!book) return false;
  if (BOOK_LENGTHS[book].length === 1) ref = normalize_single_chapter_ref(ref);
  const ranges = get_ranges(ref);
  for (let i = 0; i < ranges.length; i++) {
    let chapter = ranges[i].split(':')[0];
    let verse = ranges[i].split(':')[1];
    if (chapter.match(/[a-e]/g)) return false;
    if (chapter.indexOf('ff') !== -1) return false;
    chapter = parseInt(chapter, 10);
    verse = parseInt(verse, 10);
    if (chapter === 0 || verse === 0) return false;
    if (chapter > BOOK_LENGTHS[book].length) return false;
    if (verse > BOOK_LENGTHS[book][chapter - 1]) return false;
  }
  return true;
}
// --- end of port --------------------------------------------------------

function allRefs(book, opts = {}) {
  const plan = generateSchedule({ book, startDate: new Date(2026, 0, 1), ...opts });
  const abbrev = getBookAbbrev(book.name);
  const refs = [];
  for (const row of plan.rows) {
    const cells = rowToCells(row);
    if (cells.off) continue;
    for (const text of [cells.today, cells.previous, cells.review]) {
      if (text !== 'N/A') refs.push(`${abbrev} ${text}`);
    }
  }
  return refs;
}

const EPHESIANS = { name: 'Ephesians', chapters: [23, 22, 21, 32, 33, 24] };
const PHILEMON = { name: 'Philemon', chapters: [25] };
const PSALMS_HEAD = { name: 'Psalms', chapters: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18] };
const CORINTHIANS_2_KJV = {
  name: '2 Corinthians',
  chapters: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14], // KJV: ch13 has 14
};

describe('crossref.js compatibility (ported validator)', () => {
  it('accepts every reference in a whole-book Ephesians plan', () => {
    const refs = allRefs(EPHESIANS, { versesPerDay: 1, daysPerWeek: 6 });
    expect(refs.length).toBeGreaterThan(400);
    for (const ref of refs) expect(validate_ref(ref), ref).toBe(true);
  });

  it('accepts single-chapter plans and multi-verse ranges', () => {
    for (const ref of allRefs(EPHESIANS, { chapter: 3, versesPerDay: 2 })) {
      expect(validate_ref(ref), ref).toBe(true);
    }
    for (const ref of allRefs(PHILEMON, { versesPerDay: 3 })) {
      expect(validate_ref(ref), ref).toBe(true);
    }
    for (const ref of allRefs(PSALMS_HEAD, { versesPerDay: 4 })) {
      expect(validate_ref(ref), ref).toBe(true);
    }
  });

  it('documents the known ESV/KJV edge: 2 Cor. 13:14 refs stay unlinked', () => {
    const refs = allRefs(CORINTHIANS_2_KJV, { versesPerDay: 1, daysPerWeek: 7 });
    const invalid = refs.filter((r) => !validate_ref(r));
    // Only the refs touching KJV-only verse 13:14 fail — today, previous,
    // and the cumulative reviews that end there.
    expect(invalid.every((r) => r.endsWith('13:14'))).toBe(true);
    expect(invalid.length).toBeLessThanOrEqual(3);
    expect(invalid.length).toBeGreaterThan(0);
  });
});
