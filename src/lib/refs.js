// Verse-reference math: formatting single refs and ranges, and locating a ref
// from a flat 0-based verse index within a book's chapters.
//
// A "ref" is a plain object { chapter, verse }, both 1-based.

const EN_DASH = '–'; // – (U+2013), not a hyphen-minus

/**
 * Format a single verse reference as "chapter:verse", e.g. { chapter: 3, verse: 16 } → "3:16".
 */
export function formatRef(ref) {
  return `${ref.chapter}:${ref.verse}`;
}

/**
 * Format a range between two refs (inclusive), matching Appendix 2's notation:
 *   - identical refs collapse to a single reference: "1:5"
 *   - same-chapter ranges collapse the chapter on the right: "1:1–13"
 *   - cross-chapter ranges spell out both full references: "1:1–2:1"
 */
export function formatRange(start, end) {
  if (start.chapter === end.chapter && start.verse === end.verse) {
    return formatRef(start);
  }
  if (start.chapter === end.chapter) {
    return `${start.chapter}:${start.verse}${EN_DASH}${end.verse}`;
  }
  return `${formatRef(start)}${EN_DASH}${formatRef(end)}`;
}

/**
 * Given a book's per-chapter verse counts and a 0-based verse index into the
 * whole book (flattening every chapter end to end), return the 1-based
 * { chapter, verse } ref at that position.
 *
 * e.g. chapters = [23, 22, ...], i = 0 → {chapter: 1, verse: 1}
 *      chapters = [23, 22, ...], i = 23 → {chapter: 2, verse: 1}  (chapter 1 used indices 0..22)
 */
export function refFromIndex(chapters, i) {
  let remaining = i;
  for (let c = 0; c < chapters.length; c++) {
    const count = chapters[c];
    if (remaining < count) {
      return { chapter: c + 1, verse: remaining + 1 };
    }
    remaining -= count;
  }
  throw new RangeError(`verse index ${i} is out of range for this book`);
}
