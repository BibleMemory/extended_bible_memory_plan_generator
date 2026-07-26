// Lays a generated plan out as a paginated US-Letter PDF using the minimal
// writer in pdf.js. Pagination is computed here, so the table headings
// repeat on every page by construction — independent of any browser's
// print engine (this is the Safari fix).
//
// Input is display-ready data (title/subtitle strings and rowToCells()
// output), so this module stays free of both the DOM and schedule logic.

import { createPdf } from './pdf.js';

const PAGE = { width: 612, height: 792 }; // US Letter, points
const MARGIN = 54; // 0.75"

const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 11;
const HEAD_SIZE = 10;
const HEAD_SUB_SIZE = 8;
const BODY_SIZE = 10;
const FOLIO_SIZE = 10;

const ROW_HEIGHT = 17;
const ROW_BASELINE = 12; // text baseline below the row's top
const HEAD_SUB_DROP = 11; // "(10 times)" line below the heading baseline
const HEAD_RULE_DROP = 6; // header rule below the sub line
const HEAD_TO_ROWS = 4; // gap between header rule and first row
const FOLIO_Y = 30;
const BOTTOM_LIMIT = MARGIN; // rows must end above this

// Column widths sum to the content width (504pt); each cell is centered
// on its column, matching the print stylesheet. The first column holds
// the per-day checkbox and has no heading.
const COL_WIDTHS = [24, 52, 82, 108, 108, 130];
const CHECKBOX_SIZE = 9;

const HEADINGS = [
  { main: '' },
  { main: 'Day #' },
  { main: 'Date' },
  { main: "Today's verse", sub: '(10 times)' },
  { main: 'Previous verse', sub: '(10 times)' },
  { main: 'Cumulative review', sub: '(1 time)' },
];

function columnCenters() {
  const centers = [];
  let x = MARGIN;
  for (const w of COL_WIDTHS) {
    centers.push(x + w / 2);
    x += w;
  }
  return centers;
}

/**
 * Build the PDF for a plan.
 *
 * @param {{title: string, subtitle: string, estimates?: string[], rows: ReturnType<rowToCells>[]}} data
 * @returns {{bytes: Uint8Array, filename: string, pageCount: number}}
 */
export function buildPlanPdf({ title, subtitle, estimates = [], rows }) {
  const doc = createPdf({ pageWidth: PAGE.width, pageHeight: PAGE.height });
  const centers = columnCenters();
  const left = MARGIN;
  const right = PAGE.width - MARGIN;
  const centerX = PAGE.width / 2;

  // "Day off" is centered across the three verse columns.
  const offSpanCenter =
    left + COL_WIDTHS[0] + COL_WIDTHS[1] + COL_WIDTHS[2] +
    (COL_WIDTHS[3] + COL_WIDTHS[4] + COL_WIDTHS[5]) / 2;

  let page = null;
  let pageCount = 0;
  let y = 0; // top of the next row to draw

  function drawHeader(headTop) {
    page.hline(left, right, headTop + 6, 1);
    for (const [i, h] of HEADINGS.entries()) {
      if (!h.main) continue; // checkbox column has no heading
      page.textCentered(h.main, centers[i], headTop - HEAD_SIZE, 'F2', HEAD_SIZE);
      if (h.sub) {
        page.textCentered(h.sub, centers[i], headTop - HEAD_SIZE - HEAD_SUB_DROP, 'F1', HEAD_SUB_SIZE);
      }
    }
    const ruleY = headTop - HEAD_SIZE - HEAD_SUB_DROP - HEAD_RULE_DROP;
    page.hline(left, right, ruleY, 1);
    return ruleY - HEAD_TO_ROWS;
  }

  function startPage() {
    page = doc.addPage();
    pageCount += 1;
    let headTop;
    if (pageCount === 1) {
      const titleY = PAGE.height - MARGIN - TITLE_SIZE;
      page.textCentered(title, centerX, titleY, 'F1', TITLE_SIZE);
      page.textCentered(subtitle, centerX, titleY - 20, 'F3', SUBTITLE_SIZE);
      // Extra half-line above the estimates, mirroring the on-screen gap
      // between the subtitle and these lines.
      let y2 = titleY - 20 - 8;
      for (const line of estimates) {
        y2 -= 16;
        page.textCentered(line, centerX, y2, 'F3', SUBTITLE_SIZE);
      }
      headTop = y2 - 28;
    } else {
      headTop = PAGE.height - MARGIN;
    }
    y = drawHeader(headTop);
    page.textCentered(String(pageCount), centerX, FOLIO_Y, 'F1', FOLIO_SIZE);
  }

  startPage();

  for (const row of rows) {
    if (y - ROW_HEIGHT < BOTTOM_LIMIT) startPage();
    const baseline = y - ROW_BASELINE;
    if (row.off) {
      page.textCentered(String(row.day), centers[1], baseline, 'F3', BODY_SIZE);
      page.textCentered(row.date, centers[2], baseline, 'F3', BODY_SIZE);
      page.textCentered('Day off', offSpanCenter, baseline, 'F3', BODY_SIZE);
    } else {
      page.rect(centers[0] - CHECKBOX_SIZE / 2, baseline - 1, CHECKBOX_SIZE, CHECKBOX_SIZE, 0.8);
      page.textCentered(String(row.day), centers[1], baseline, 'F1', BODY_SIZE);
      page.textCentered(row.date, centers[2], baseline, 'F1', BODY_SIZE);
      page.textCentered(row.today, centers[3], baseline, 'F1', BODY_SIZE);
      page.textCentered(row.previous, centers[4], baseline, 'F1', BODY_SIZE);
      page.textCentered(row.review, centers[5], baseline, 'F1', BODY_SIZE);
    }
    y -= ROW_HEIGHT;
    page.hline(left, right, y, 0.4, 0.6);
  }

  return {
    bytes: doc.finish(),
    filename: `${title.replace(/\s+/g, '-')}.pdf`,
    pageCount,
  };
}
