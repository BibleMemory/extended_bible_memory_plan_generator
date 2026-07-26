// Input form for the Bible memory plan widget: book/date/verses/days
// inputs, defaults, the >160-verse beginner callout, and submit handling.
// No frameworks — plain DOM.

import { BOOKS, getBook, totalVerses } from '../data/bible-books.js';

const DEFAULT_BOOK_NAME = 'Ephesians';
const DEFAULT_VERSES_PER_DAY = 1;
const DEFAULT_DAYS_PER_WEEK = 6;
const CALLOUT_VERSE_THRESHOLD = 160;

const CALLOUT_TEXT =
  'If you are new to extended scripture memorization, we suggest starting with a ' +
  'book between 90 and 160 verses long — for example, Ephesians, ' +
  'Philippians, Colossians, James, or 1 Peter.';

/** Format a Date as YYYY-MM-DD using LOCAL date components (for <input type="date">). */
function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a "YYYY-MM-DD" string as a LOCAL date (never UTC — see PLAN.md). */
function parseLocalDateInput(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function clampInt(value, min, max, fallback) {
  let n = parseInt(value, 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) n = fallback;
  if (min !== undefined && n < min) n = min;
  if (max !== undefined && n > max) n = max;
  return n;
}

/**
 * Render the input form into `container` and wire up its events.
 * Calls `onGenerate({ book, startDate, versesPerDay, daysPerWeek, chapter })`
 * on submit. `initial` (optional, from a shared link) prefills the fields:
 * { book, chapter, startDateStr, versesPerDay, daysPerWeek }.
 */
export function buildForm(container, onGenerate, initial = null) {
  const form = document.createElement('form');
  form.className = 'bmp-form';

  // Book field
  const bookField = document.createElement('div');
  bookField.className = 'bmp-field';
  const bookLabel = document.createElement('label');
  bookLabel.textContent = 'Book of the Bible';
  const bookSelect = document.createElement('select');
  bookSelect.className = 'bmp-book';
  for (const book of BOOKS) {
    const option = document.createElement('option');
    option.value = book.name;
    option.textContent = book.name;
    if (book.name === DEFAULT_BOOK_NAME) option.selected = true;
    bookSelect.appendChild(option);
  }
  bookLabel.appendChild(bookSelect);
  bookField.appendChild(bookLabel);

  // Chapter field — options depend on the selected book
  const chapterField = document.createElement('div');
  chapterField.className = 'bmp-field';
  const chapterLabel = document.createElement('label');
  chapterLabel.textContent = 'Chapter';
  const chapterSelect = document.createElement('select');
  chapterSelect.className = 'bmp-chapter';

  function populateChapters() {
    const book = getBook(bookSelect.value);
    const count = book ? book.chapters.length : 0;
    chapterSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All';
    chapterSelect.appendChild(allOption);
    for (let ch = 1; ch <= count; ch++) {
      const option = document.createElement('option');
      option.value = String(ch);
      option.textContent = String(ch);
      chapterSelect.appendChild(option);
    }
    chapterSelect.value = 'all';
  }

  populateChapters();
  chapterLabel.appendChild(chapterSelect);
  chapterField.appendChild(chapterLabel);

  // Start date field
  const dateField = document.createElement('div');
  dateField.className = 'bmp-field';
  const dateLabel = document.createElement('label');
  dateLabel.textContent = 'Start date';
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'bmp-start';
  dateInput.value = toDateInputValue(new Date());
  dateLabel.appendChild(dateInput);
  dateField.appendChild(dateLabel);

  // Verses per day field
  const vpdField = document.createElement('div');
  vpdField.className = 'bmp-field';
  const vpdLabel = document.createElement('label');
  vpdLabel.textContent = 'Verses per day';
  const vpdInput = document.createElement('input');
  vpdInput.type = 'number';
  vpdInput.min = '1';
  vpdInput.step = '1';
  vpdInput.className = 'bmp-vpd';
  vpdInput.value = String(DEFAULT_VERSES_PER_DAY);
  vpdLabel.appendChild(vpdInput);
  vpdField.appendChild(vpdLabel);

  // Days per week field
  const dpwField = document.createElement('div');
  dpwField.className = 'bmp-field';
  const dpwLabel = document.createElement('label');
  dpwLabel.textContent = 'Days per week';
  const dpwInput = document.createElement('select');
  dpwInput.className = 'bmp-dpw';
  for (let days = 5; days <= 7; days++) {
    const option = document.createElement('option');
    option.value = String(days);
    option.textContent = String(days);
    if (days === DEFAULT_DAYS_PER_WEEK) option.selected = true;
    dpwInput.appendChild(option);
  }
  dpwLabel.appendChild(dpwInput);
  dpwField.appendChild(dpwLabel);

  const generateButton = document.createElement('button');
  generateButton.type = 'submit';
  generateButton.className = 'bmp-generate';
  generateButton.textContent = 'Generate plan';

  form.appendChild(bookField);
  form.appendChild(chapterField);
  form.appendChild(dateField);
  form.appendChild(vpdField);
  form.appendChild(dpwField);
  form.appendChild(generateButton);

  // Beginner callout
  const callout = document.createElement('div');
  callout.className = 'bmp-callout';
  callout.textContent = CALLOUT_TEXT;
  callout.hidden = true;

  function selectedChapter() {
    return chapterSelect.value === 'all' ? null : parseInt(chapterSelect.value, 10);
  }

  function updateCallout() {
    const book = getBook(bookSelect.value);
    const chapter = selectedChapter();
    // The advisory reflects what will actually be memorized: the whole
    // book, or just the selected chapter's verses.
    const verses = !book
      ? 0
      : chapter === null
        ? totalVerses(book)
        : book.chapters[chapter - 1];
    callout.hidden = !(verses > CALLOUT_VERSE_THRESHOLD);
  }

  bookSelect.addEventListener('change', () => {
    populateChapters();
    updateCallout();
  });
  chapterSelect.addEventListener('change', updateCallout);

  if (initial) {
    bookSelect.value = initial.book.name;
    populateChapters();
    chapterSelect.value = initial.chapter === null ? 'all' : String(initial.chapter);
    if (initial.startDateStr) dateInput.value = initial.startDateStr;
    vpdInput.value = String(initial.versesPerDay);
    dpwInput.value = String(initial.daysPerWeek);
  }
  updateCallout();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const book = getBook(bookSelect.value) || getBook(DEFAULT_BOOK_NAME);
    const startDate = dateInput.value
      ? parseLocalDateInput(dateInput.value)
      : new Date();
    const versesPerDay = clampInt(vpdInput.value, 1, undefined, DEFAULT_VERSES_PER_DAY);
    const daysPerWeek = clampInt(dpwInput.value, 5, 7, DEFAULT_DAYS_PER_WEEK);
    const chapter = selectedChapter();

    onGenerate({ book, startDate, versesPerDay, daysPerWeek, chapter });
  });

  container.appendChild(form);
  container.appendChild(callout);

  return { form, callout, bookSelect, chapterSelect, dateInput, vpdInput, dpwInput, generateButton };
}
