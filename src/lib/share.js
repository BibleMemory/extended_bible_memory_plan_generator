// Shareable-link support: a plan is fully determined by five inputs, so a
// URL carrying them reproduces the exact same table. Parameters are
// prefixed "bmp-" so they can never collide with the host page's own
// query string (Ghost, analytics params, etc.).
//
// Pure string-in/string-out functions — no window/location access here —
// so everything is unit-testable; the bootstrap wires them to the real URL.

import { getBook } from '../data/bible-books.js';

const P_BOOK = 'bmp-book';
const P_CHAPTER = 'bmp-chapter';
const P_START = 'bmp-start';
const P_VPD = 'bmp-vpd';
const P_DPW = 'bmp-dpw';

/** Format a Date as the YYYY-MM-DD param value (local components). */
export function formatDateParam(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateParam(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const real =
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return real ? value : null;
}

/**
 * Read a plan selection from a query string (location.search). Returns null
 * unless a known book is named; individual invalid values fall back to
 * defaults (chapter → All, date → null meaning "today", pace → 1 & 6).
 *
 * @returns {null | {book: object, chapter: number|null, startDateStr: string|null, versesPerDay: number, daysPerWeek: number}}
 */
export function readShareParams(search) {
  const params = new URLSearchParams(search || '');
  const bookName = params.get(P_BOOK);
  if (!bookName) return null;
  const book = getBook(bookName);
  if (!book) return null;

  let chapter = null;
  const rawChapter = params.get(P_CHAPTER);
  if (rawChapter && rawChapter !== 'all') {
    const n = Number(rawChapter);
    if (Number.isInteger(n) && n >= 1 && n <= book.chapters.length) chapter = n;
  }

  const startDateStr = parseDateParam(params.get(P_START));

  const vpd = Number(params.get(P_VPD));
  const versesPerDay = Number.isInteger(vpd) && vpd >= 1 ? vpd : 1;

  const dpw = Number(params.get(P_DPW));
  const daysPerWeek = Number.isInteger(dpw) && dpw >= 5 && dpw <= 7 ? dpw : 6;

  return { book, chapter, startDateStr, versesPerDay, daysPerWeek };
}

/**
 * Merge a plan selection into an existing query string, preserving every
 * parameter that isn't ours. Returns the new query string with a leading
 * "?" (or "" if there are no parameters at all — cannot happen here since
 * we always set five).
 */
export function writeShareParams(search, { bookName, chapter, startDateStr, versesPerDay, daysPerWeek }) {
  const params = new URLSearchParams(search || '');
  params.set(P_BOOK, bookName);
  params.set(P_CHAPTER, chapter === null ? 'all' : String(chapter));
  params.set(P_START, startDateStr);
  params.set(P_VPD, String(versesPerDay));
  params.set(P_DPW, String(daysPerWeek));
  return `?${params.toString()}`;
}
