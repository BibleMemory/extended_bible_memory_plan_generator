import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../src/lib/schedule.js';
import { buildPlanPdf } from '../src/lib/plan-pdf.js';
import { createPdf, textWidth } from '../src/lib/pdf.js';
import { rowToCells, formatPlanDateWithYear } from '../src/ui/render.js';

/** Mirror the Download PDF handler: cells with year-inclusive dates. */
function pdfRows(plan) {
  return plan.rows.map((row) => ({
    ...rowToCells(row),
    date: formatPlanDateWithYear(row.date),
  }));
}

const EPHESIANS = { name: 'Ephesians', chapters: [23, 22, 21, 32, 33, 24] };

function latin1(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

function buildEphesiansPdf() {
  const plan = generateSchedule({
    book: EPHESIANS,
    startDate: new Date(2023, 0, 1),
    versesPerDay: 1,
    daysPerWeek: 6,
  });
  return buildPlanPdf({
    title: plan.title,
    subtitle: 'Starting January 1, 2023 · 1 verse per day · 6 days per week',
    rows: pdfRows(plan),
  });
}

describe('pdf.js writer', () => {
  it('produces a structurally valid file (header, xref offsets, EOF)', () => {
    const doc = createPdf({ pageWidth: 612, pageHeight: 792 });
    doc.addPage().text('Hello', 100, 700, 'F1', 12).hline(54, 558, 690, 1);
    const s = latin1(doc.finish());

    expect(s.startsWith('%PDF-1.4\n')).toBe(true);
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);

    // startxref points at the xref table.
    const startxref = Number(s.match(/startxref\n(\d+)\n%%EOF/)[1]);
    expect(s.slice(startxref, startxref + 4)).toBe('xref');

    // Every xref entry points at its "N 0 obj" header.
    const entries = [...s.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
    entries.forEach((offset, i) => {
      expect(s.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });

    // Stream /Length values are exact.
    for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = m.index + m[0].length;
      expect(s.slice(start + Number(m[1]), start + Number(m[1]) + 10)).toBe('\nendstream');
    }
  });

  it('escapes WinAnsi specials: en dash, middle dot, parens', () => {
    const doc = createPdf({ pageWidth: 612, pageHeight: 792 });
    doc.addPage().text('1:1–2 · (1 time)', 100, 700, 'F1', 12);
    const s = latin1(doc.finish());
    expect(s).toContain('(1:1\\2262 \\267 \\(1 time\\)) Tj');
  });

  it('measures text with per-font metrics', () => {
    // 'iii' is far narrower than 'WWW' in a proportional face.
    expect(textWidth('iii', 'F1', 10)).toBeLessThan(textWidth('WWW', 'F1', 10) / 2);
    // Bold runs wider than roman for the same string.
    expect(textWidth('Cumulative review', 'F2', 10)).toBeGreaterThan(
      textWidth('Cumulative review', 'F1', 10)
    );
  });
});

describe('buildPlanPdf — Ephesians plan', () => {
  const { bytes, filename, pageCount } = buildEphesiansPdf();
  const s = latin1(bytes);
  const streams = [...s.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => m[1]);

  it('reports a page count matching the page objects', () => {
    const pageObjects = [...s.matchAll(/\/Type \/Page /g)].length;
    expect(pageObjects).toBe(pageCount);
    expect(streams.length).toBe(pageCount);
    expect(s).toContain(`/Count ${pageCount}`);
  });

  it('derives the filename from the title', () => {
    expect(filename).toBe('Ephesians-Memorization-Plan.pdf');
  });

  it('repeats the table headings on EVERY page', () => {
    for (const stream of streams) {
      expect(stream).toContain('(Day #) Tj');
      expect(stream).toContain('(Date) Tj');
      expect(stream).toContain("(Today's verse) Tj");
      expect(stream).toContain('(Previous verse) Tj');
      expect(stream).toContain('(Cumulative review) Tj');
      expect(stream).toContain('(\\(10 times\\)) Tj');
      expect(stream).toContain('(\\(1 time\\)) Tj');
    }
  });

  it('puts the title and subtitle on page 1 only', () => {
    expect(streams[0]).toContain('(Ephesians Memorization Plan) Tj');
    for (const stream of streams.slice(1)) {
      expect(stream).not.toContain('(Ephesians Memorization Plan) Tj');
    }
    expect(streams[0]).toContain('1 verse per day');
  });

  it('numbers the pages 1..N', () => {
    streams.forEach((stream, i) => {
      expect(stream).toContain(`(${i + 1}) Tj`);
    });
  });

  it('contains all 180 rows exactly once across the document', () => {
    const all = streams.join('\n');
    expect(all).toContain('(N/A) Tj'); // day 1
    expect([...all.matchAll(/\(Day off\) Tj/g)].length).toBe(25);
    expect(all).toContain('(6:24) Tj'); // last verse
    expect(all).toContain('(1:1\\2266:24) Tj'); // final cumulative review, en dash
  });

  it('dates carry the year', () => {
    const all = streams.join('\n');
    expect(all).toContain('(Jan. 1, 2023) Tj'); // first row
    expect(all).toContain('(Jun. 29, 2023) Tj'); // day 180
    expect(all).not.toContain('(Jan. 1) Tj'); // no yearless dates
  });
});

describe('buildPlanPdf — other plans', () => {
  it('single-chapter plan carries the chapter title', () => {
    const plan = generateSchedule({
      book: EPHESIANS,
      startDate: new Date(2023, 0, 1),
      chapter: 3,
    });
    const { bytes, filename } = buildPlanPdf({
      title: plan.title,
      subtitle: 'x',
      rows: plan.rows.map(rowToCells),
    });
    expect(filename).toBe('Ephesians-3-Memorization-Plan.pdf');
    expect(latin1(bytes)).toContain('(Ephesians 3 Memorization Plan) Tj');
  });

  it('handles a large plan (many pages) without breaking structure', () => {
    // A 2,000-verse stub keeps the test fast while forcing ~60 pages.
    const bigBook = { name: 'Stub', chapters: Array(100).fill(20) };
    const plan = generateSchedule({
      book: bigBook,
      startDate: new Date(2023, 0, 1),
      versesPerDay: 1,
      daysPerWeek: 6,
    });
    const { bytes, pageCount } = buildPlanPdf({
      title: plan.title,
      subtitle: 'x',
      rows: plan.rows.map(rowToCells),
    });
    expect(pageCount).toBeGreaterThan(40);
    const s = latin1(bytes);
    const startxref = Number(s.match(/startxref\n(\d+)\n%%EOF/)[1]);
    expect(s.slice(startxref, startxref + 4)).toBe('xref');
    const streams = [...s.matchAll(/stream\n([\s\S]*?)\nendstream/g)];
    expect(streams.length).toBe(pageCount);
  });
});
