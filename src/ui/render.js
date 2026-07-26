// Renders a generated schedule (from lib/schedule.js) into the widget's
// `.bmp-plan` section: title, subtitle, print button, and the semantic
// plan table. No DOM dependency in the pure helpers below, so they can be
// unit-tested without jsdom.

import { buildPlanPdf } from '../lib/plan-pdf.js';

const MONTH_ABBR = [
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
  'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format a Date as "Jan. 1" (abbreviated month + day; "May" has no period). */
export function formatPlanDate(date) {
  return `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`;
}

/** Format a Date as "Jan. 1, 2026" — used in the PDF, where there's room. */
export function formatPlanDateWithYear(date) {
  return `${formatPlanDate(date)}, ${date.getFullYear()}`;
}

/**
 * Indices of rows that start a new calendar year (row 0 excluded — the
 * subtitle already states the start year). The on-screen table inserts a
 * full-width year banner row before each so multi-year plans stay
 * unambiguous.
 */
export function yearBreakIndices(rows) {
  const breaks = new Set();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].date.getFullYear() !== rows[i - 1].date.getFullYear()) {
      breaks.add(i);
    }
  }
  return breaks;
}

/** Format a Date as "January 1, 2026". */
export function formatLongDate(date) {
  return `${MONTH_FULL[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Pure transform: a schedule row -> the data needed to render its <tr>,
 * with no DOM involved so it can be unit-tested directly.
 *
 * Work day -> { off: false, day, date, today, previous, review }
 * Off day  -> { off: true, day, date }
 */
export function rowToCells(row) {
  const date = formatPlanDate(row.date);
  if (row.off) {
    return { off: true, day: row.day, date };
  }
  return {
    off: false,
    day: row.day,
    date,
    today: row.today,
    previous: row.previous,
    review: row.review,
  };
}

function pluralize(n, singular, plural = `${singular}s`) {
  return n === 1 ? singular : plural;
}

function buildSubtitle(plan, { versesPerDay, daysPerWeek }) {
  const startDate = plan.rows.length > 0 ? plan.rows[0].date : new Date();
  const verseWord = pluralize(versesPerDay, 'verse');
  const dayWord = pluralize(daysPerWeek, 'day');
  return (
    `Starting ${formatLongDate(startDate)} · ${versesPerDay} ${verseWord} per day · ` +
    `${daysPerWeek} ${dayWord} per week`
  );
}

function th(text, subText) {
  const cell = document.createElement('th');
  cell.scope = 'col';
  cell.appendChild(document.createTextNode(subText ? `${text} ` : text));
  if (subText) {
    const sub = document.createElement('span');
    sub.className = 'bmp-th-sub';
    sub.textContent = subText;
    cell.appendChild(sub);
  }
  return cell;
}

function td(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function buildTable(plan) {
  const table = document.createElement('table');
  table.className = 'bmp-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(th('Day #'));
  headRow.appendChild(th('Date'));
  headRow.appendChild(th("Today's verse", '(10 times)'));
  headRow.appendChild(th('Previous verse', '(10 times)'));
  headRow.appendChild(th('Cumulative review', '(1 time)'));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const yearBreaks = yearBreakIndices(plan.rows);
  for (const [i, row] of plan.rows.entries()) {
    if (yearBreaks.has(i)) {
      const yearRow = document.createElement('tr');
      yearRow.className = 'bmp-year-row';
      const yearCell = document.createElement('td');
      yearCell.colSpan = 5;
      yearCell.textContent = String(row.date.getFullYear());
      yearRow.appendChild(yearCell);
      tbody.appendChild(yearRow);
    }
    const cells = rowToCells(row);
    const tr = document.createElement('tr');
    if (cells.off) {
      tr.className = 'bmp-off';
      tr.appendChild(td(String(cells.day)));
      tr.appendChild(td(cells.date));
      const offCell = document.createElement('td');
      offCell.colSpan = 3;
      offCell.textContent = 'Day off';
      tr.appendChild(offCell);
    } else {
      tr.appendChild(td(String(cells.day)));
      tr.appendChild(td(cells.date));
      tr.appendChild(td(cells.today));
      tr.appendChild(td(cells.previous));
      tr.appendChild(td(cells.review));
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  return table;
}

/**
 * Render `plan` (the output of generateSchedule) into `container`, which is
 * expected to be (or contain) the `.bmp-plan` section. Replaces any
 * previous render and un-hides the section.
 *
 * `options` = { versesPerDay, daysPerWeek } — needed for the subtitle line,
 * since the plan object itself doesn't carry the original form inputs.
 */
export function renderPlan(container, plan, options = {}) {
  const section = container.classList && container.classList.contains('bmp-plan')
    ? container
    : container.querySelector('.bmp-plan');

  if (!section) {
    throw new Error('renderPlan: container must be or contain a .bmp-plan section');
  }

  section.innerHTML = '';

  const title = document.createElement('h2');
  title.className = 'bmp-title';
  title.textContent = plan.title;

  const subtitle = document.createElement('p');
  subtitle.className = 'bmp-subtitle';
  subtitle.textContent = buildSubtitle(plan, options);

  const actions = document.createElement('div');
  actions.className = 'bmp-actions';

  // Client-generated PDF: pagination is ours, so table headings repeat on
  // every page even where the browser's print engine won't (WebKit, mobile).
  // This is the only offered action — browser printing still works via the
  // browser's own menu, but the PDF is the reliable path everywhere.
  const pdfButton = document.createElement('button');
  pdfButton.type = 'button';
  pdfButton.className = 'bmp-download';
  pdfButton.textContent = 'Download PDF';
  pdfButton.addEventListener('click', () => {
    const { bytes, filename } = buildPlanPdf({
      title: plan.title,
      subtitle: buildSubtitle(plan, options),
      rows: plan.rows.map((row) => ({
        ...rowToCells(row),
        date: formatPlanDateWithYear(row.date),
      })),
    });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  actions.appendChild(pdfButton);

  // The table scrolls horizontally inside this wrapper on narrow screens
  // instead of overflowing the plan card.
  const tableWrap = document.createElement('div');
  tableWrap.className = 'bmp-table-wrap';
  tableWrap.appendChild(buildTable(plan));

  section.appendChild(title);
  section.appendChild(subtitle);
  section.appendChild(actions);
  section.appendChild(tableWrap);

  section.hidden = false;

  return section;
}
