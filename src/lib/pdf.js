// Minimal PDF writer: just enough of PDF 1.4 to set text in the standard
// Times faces and draw horizontal rules — no compression, no embedded
// fonts, no DOM. Pure functions so it can be unit-tested byte-for-byte.
//
// Coordinates follow PDF convention: origin at the BOTTOM-left of the
// page, y increasing upward. Callers working top-down should convert.

// Font resource names, mapped to the standard 14 faces we use.
export const FONTS = {
  roman: { res: 'F1', base: 'Times-Roman' },
  bold: { res: 'F2', base: 'Times-Bold' },
  italic: { res: 'F3', base: 'Times-Italic' },
};

// Character widths in 1/1000 em for the printable ASCII range (32–126),
// from the Adobe core-font metrics. Index = charCode - 32.
/* eslint-disable no-multi-spaces */
const WIDTHS_ROMAN = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444,
  921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722,
  556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500,
  333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500,
  500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541,
];
const WIDTHS_BOLD = [
  250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500,
  930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778,
  611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333, 278, 333, 581, 500,
  333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500,
  556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520,
];
const WIDTHS_ITALIC = [
  250, 333, 420, 500, 500, 833, 778, 214, 333, 333, 500, 675, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 675, 675, 675, 500,
  920, 611, 611, 667, 722, 611, 611, 722, 722, 333, 444, 667, 556, 833, 667, 722,
  611, 722, 611, 500, 556, 722, 611, 833, 611, 556, 556, 389, 278, 389, 422, 500,
  333, 500, 500, 444, 500, 444, 278, 500, 500, 278, 278, 444, 278, 722, 500, 500,
  500, 500, 389, 389, 278, 500, 444, 667, 444, 444, 389, 400, 275, 400, 541,
];
/* eslint-enable no-multi-spaces */

const WIDTHS = {
  F1: WIDTHS_ROMAN,
  F2: WIDTHS_BOLD,
  F3: WIDTHS_ITALIC,
};

// Non-ASCII characters the widget's text can contain, mapped to their
// WinAnsi code points (widths are the same 500/250 in all three faces).
const WINANSI_EXTRAS = {
  '–': { code: 0x96, width: 500 }, // en dash — used in verse ranges
  '·': { code: 0xb7, width: 250 }, // middle dot — used in the subtitle
};

/**
 * Width of `text` in points when set in `font` ('F1'|'F2'|'F3') at `size`.
 */
export function textWidth(text, font, size) {
  const widths = WIDTHS[font];
  let units = 0;
  for (const ch of text) {
    const extra = WINANSI_EXTRAS[ch];
    if (extra) {
      units += extra.width;
      continue;
    }
    const code = ch.charCodeAt(0);
    units += code >= 32 && code <= 126 ? widths[code - 32] : 500;
  }
  return (units * size) / 1000;
}

/** Encode a JS string as a WinAnsi PDF literal string (with escapes). */
function pdfString(text) {
  let out = '';
  for (const ch of text) {
    const extra = WINANSI_EXTRAS[ch];
    const code = extra ? extra.code : ch.charCodeAt(0);
    if (code === 0x5c || code === 0x28 || code === 0x29) {
      out += `\\${String.fromCharCode(code)}`;
    } else if (code >= 32 && code <= 126) {
      out += String.fromCharCode(code);
    } else {
      out += `\\${code.toString(8).padStart(3, '0')}`;
    }
  }
  return out;
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/**
 * Create a PDF document. Returns { addPage, finish }:
 *   addPage() → page with drawing methods (all coordinates bottom-left origin):
 *     text(str, x, y, font, size)         left-aligned at x
 *     textCentered(str, cx, y, font, size) centered on cx
 *     textRight(str, rx, y, font, size)    right edge at rx
 *     hline(x1, x2, y, lineWidth, gray)    horizontal rule (gray 0=black..1=white)
 *     rect(x, y, w, h, lineWidth, gray)    stroked rectangle (x,y = bottom-left)
 *   finish() → Uint8Array of the complete file.
 */
export function createPdf({ pageWidth, pageHeight }) {
  const pages = []; // each: array of content-stream fragments

  function addPage() {
    const ops = [];
    pages.push(ops);
    const page = {
      text(str, x, y, font, size) {
        ops.push(
          `BT /${font} ${fmt(size)} Tf ${fmt(x)} ${fmt(y)} Td (${pdfString(str)}) Tj ET`
        );
        return page;
      },
      textCentered(str, cx, y, font, size) {
        return page.text(str, cx - textWidth(str, font, size) / 2, y, font, size);
      },
      textRight(str, rx, y, font, size) {
        return page.text(str, rx - textWidth(str, font, size), y, font, size);
      },
      hline(x1, x2, y, lineWidth, gray = 0) {
        ops.push(
          `${fmt(gray)} G ${fmt(lineWidth)} w ${fmt(x1)} ${fmt(y)} m ${fmt(x2)} ${fmt(y)} l S`
        );
        return page;
      },
      rect(x, y, w, h, lineWidth, gray = 0) {
        ops.push(
          `${fmt(gray)} G ${fmt(lineWidth)} w ${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re S`
        );
        return page;
      },
    };
    return page;
  }

  function finish() {
    // Object layout: 1 Catalog, 2 Pages, 3-5 the three fonts, then for each
    // page: page object followed by its content stream.
    const objects = [];
    const pageObjNums = pages.map((_, i) => 6 + i * 2);

    objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    objects.push(
      `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums
        .map((n) => `${n} 0 R`)
        .join(' ')}] /Count ${pages.length} >>\nendobj\n`
    );
    for (const [i, key] of ['roman', 'bold', 'italic'].entries()) {
      const { res, base } = FONTS[key];
      objects.push(
        `${3 + i} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${base} ` +
          `/Encoding /WinAnsiEncoding /Name /${res} >>\nendobj\n`
      );
    }

    const resources =
      '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >>';
    for (const [i, ops] of pages.entries()) {
      const pageNum = pageObjNums[i];
      const stream = ops.join('\n');
      objects.push(
        `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R ` +
          `/MediaBox [0 0 ${fmt(pageWidth)} ${fmt(pageHeight)}] ${resources} ` +
          `/Contents ${pageNum + 1} 0 R >>\nendobj\n`
      );
      objects.push(
        `${pageNum + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
      );
    }

    let body = '%PDF-1.4\n%âãÏÓ\n';
    const offsets = [];
    for (const obj of objects) {
      offsets.push(body.length);
      body += obj;
    }
    const xrefStart = body.length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    body +=
      xref +
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`;

    // Every character in `body` is in [0, 255] by construction (WinAnsi
    // escapes above); encode 1:1 to bytes.
    const bytes = new Uint8Array(body.length);
    for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 0xff;
    return bytes;
  }

  return { addPage, finish };
}
