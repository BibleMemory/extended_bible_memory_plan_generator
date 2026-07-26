# Build Plan: Bible Memory Plan Generator for Ghost 6

A plan for building, with Claude Code, a Ghost (v6) blog plug-in that generates
book-of-the-Bible memorization plans in the style of Appendix 2 of *How to
Memorize Scripture for Life* ("Ephesians Memorization Plan").

---

## 1. Goal

A visitor to a Ghost blog opens a page, picks a book of the Bible and a few
options, clicks **Generate**, and gets a full day-by-day memorization schedule
that looks great on screen and prints cleanly — with table headings repeated on
every printed page.

### Inputs (form)

| Field | Control | Default |
|---|---|---|
| Book of the Bible | `<select>` — all 66 books, standard English Bible order | **Ephesians** |
| Chapter | `<select>` — "All" + 1..N for the selected book; repopulated on book change. A single chapter scopes the plan to that chapter and titles it "Book N Memorization Plan" | **All** |
| Start date | date picker | today's date |
| Verses per day | number input (min 1) | **1** |
| Days per week | select (5–7) | **6** |

### Beginner callout

If the selected book has **more than 160 verses**, display a callout above the
generated plan:

> If you are new to Scripture memorization, we suggest starting with a book
> between 90 and 160 verses long (for example, Ephesians, Philippians,
> Colossians, James, or 1 Peter).

The callout is advisory only — the plan still generates.

---

## 2. Output specification (derived from Appendix 2, pp. 51–57)

The generated plan reproduces the Appendix 2 layout:

### Title

`{Book} Memorization Plan` — e.g., "Ephesians Memorization Plan", as a large
centered heading.

### Table

Five columns, with the repetition instructions inside the headings:

| Day # | Date | Today's verse (10 times) | Previous verse (10 times) | Cummulative review (1 time) |
|---|---|---|---|---|
| 1 | Jan. 1 | 1:1 | N/A | N/A |
| 2 | Jan. 2 | 1:2 | 1:1 | 1:1–2 |
| 7 | Jan. 7 | *Day off* (spans remaining columns) | | |
| 8 | Jan. 8 | 1:7 | 1:6 | 1:1–7 |

Rules the generator must follow (all observed in the PDF):

1. **Day-off rows count.** Days off get a Day # and a date; the row shows
   "Day off" spanning the three verse columns. With days-per-week = 6, every
   7th day from the start date is off; generally, each 7-day cycle from the
   start date has *d* work days followed by *(7 − d)* off days.
2. **Previous verse skips days off.** The day after a day off reviews the last
   *work* day's verse (Day 8's previous verse is Day 6's 1:6).
3. **Cumulative review notation.** Within one chapter the range collapses the
   chapter on the right side: `1:1–13`. Once the range crosses a chapter
   boundary it shows the full second reference: `1:1–2:1`, `1:1–6:24`.
4. **First day(s)** show `N/A` for previous verse / cumulative review when
   there is nothing yet to review.
5. **Dates** are formatted like the book: abbreviated month + day
   (`Jan. 1`, `Feb. 12`, `Mar. 5`). Include the year in the title or a
   subtitle line (the appendix omits it; we know the real start date).
6. **Verses per day > 1**: "Today's verse" becomes a range (e.g. `1:1–2`),
   "Previous verse" is the previous work day's range, and the cumulative
   review runs from `1:1` through the end of **today's** range inclusive —
   the published table shows day 2 (today `1:2`) reviewing `1:1–2`. Ranges
   never split awkwardly — the last day simply takes however many verses
   remain.
7. The plan ends on the day the last verse of the book is assigned (no
   trailing day-off rows).

### Presentation

- **Screen:** clean typographic table matching the book's feel — centered
  column groups, hairline rules under the header and between rows, generous
  whitespace. Must look good inside any Ghost theme (style-scoped, no leakage
  in or out).
- **Print:** `@media print` stylesheet; proper `<table><thead>` semantics so
  browsers repeat the headings on every page (`thead { display:
  table-header-group; }`), `tr { break-inside: avoid; }`, form controls and
  buttons hidden, black-on-white output. A visible **Print** button triggers
  `window.print()`.

---

## 3. Ghost 6 integration approach

Ghost has no server-side plugin API — "apps" were removed years ago. The
correct delivery for Ghost 6 is a **self-contained client-side widget**: one
JS file + one CSS file with zero dependencies, no build step required at the
blog, no server component (the versification data is static and ships inside
the bundle).

Two supported installation paths, same bundle:

1. **HTML card (recommended, theme-independent).** The blog owner creates a
   Ghost page, adds an HTML card containing a `<div
   data-bible-memory-plan></div>` plus `<script>`/`<link>` tags pointing at the
   bundle (self-hosted on the Ghost instance via the theme's `assets/`, or any
   static host). Works on Ghost(Pro) and self-hosted alike.
2. **Theme page template (optional).** A `page-memory-plan.hbs` custom
   template for owners comfortable editing their theme; drops the same widget
   into a full-width page.

All schedule computation happens in the browser. No Ghost Admin API, no
Content API, no backend — which also means nothing breaks across Ghost minor
versions.

### Serving the bundle directly from this GitHub repo

Both the source (`src/`) and the built bundle (`dist/`) are committed, so the
repo is the only host needed. Raw `raw.githubusercontent.com` links **cannot**
be used in `<script>`/`<link>` tags (GitHub serves them as `text/plain` with
`nosniff`, so browsers refuse them). Instead:

1. **jsDelivr (primary).** jsDelivr serves public GitHub repos with correct
   MIME types and CDN caching. The HTML-card snippet references a
   release-tag-pinned URL:
   `https://cdn.jsdelivr.net/gh/BibleMemory/extended_bible_memory_plan_generator@1/dist/bible-memory-plan.min.js`
   Pinning to a tag means published blog pages never change out from under
   the owner; upgrading is editing the version in the snippet.
2. **GitHub Pages (alternative + live demo).** A GitHub Actions workflow
   publishes `dist/` plus a demo `index.html` to Pages. This provides a
   second stable URL with proper content types and a public demo page for
   testing the widget (including print output) without a Ghost install.

Requirement for both: the repo must be public. Each release is a git tag +
GitHub Release containing the rebuilt `dist/` files.

---

## 4. Architecture

```
extended_bible_memory_plan_generator/
├── PLAN.md                     ← this file
├── README.md                   ← install instructions (HTML card + theme template)
├── src/
│   ├── data/
│   │   └── bible-books.js      ← 66 books: name, order, chapters[] = verse counts (KJV versification)
│   ├── lib/
│   │   ├── schedule.js         ← pure schedule generator (input opts → row objects)
│   │   └── refs.js             ← verse-reference math: ranges, cumulative notation
│   ├── ui/
│   │   ├── form.js             ← input form, defaults, validation, >160-verse callout
│   │   └── render.js           ← plan table rendering (semantic <table>/<thead>)
│   ├── styles/
│   │   ├── screen.css
│   │   └── print.css
│   └── index.js                ← widget bootstrap: finds [data-bible-memory-plan], mounts
├── dist/
│   ├── bible-memory-plan.min.js   ← single-file IIFE bundle (CSS injected)
│   └── bible-memory-plan.css      ← optional separate stylesheet
├── ghost/
│   ├── html-card-snippet.html  ← copy-paste snippet for a Ghost HTML card
│   └── page-memory-plan.hbs    ← optional theme template
├── test/
│   ├── schedule.test.js        ← includes the full Appendix 2 golden test
│   ├── refs.test.js
│   └── data.test.js            ← verse-count integrity checks
└── package.json                ← dev-only tooling (esbuild, vitest); zero runtime deps
```

**Golden test:** the Appendix 2 table itself (Ephesians, start Jan 1,
1 verse/day, 6 days/week → 180 rows ending Day 180 / Jun. 29 / `6:24` /
`1:1–6:24`) is transcribed into a fixture and the generator's output must
match it row for row. This single test pins nearly every business rule.

**Data integrity:** Ephesians must total 155 verses (23+22+21+32+33+24);
whole-Bible totals and per-book spot checks (Psalms 2,461; Philemon 25;
Jude 25; John 879 …) guard the dataset.

---

## 5. Claude Code orchestration: coordinator + sub-agents

Run the build from Claude Code with a **coordinator** (the main session) that
plans, sequences, integrates, and reviews — delegating well-scoped work to
sub-agents defined in `.claude/agents/*.md` (model set in each agent's
frontmatter).

### Agent roster

| # | Agent | Model | Why this model | Responsibility |
|---|---|---|---|---|
| — | **Coordinator** (main session) | `claude-opus-5` | Cross-cutting judgment: sequencing, integration, resolving disagreements between agents, final review | Owns the task list, spawns agents, merges results, keeps the golden test authoritative |
| 1 | `bible-data` | `claude-sonnet-5` | Factual recall + care; cheap enough to run **twice independently** | Produce `src/data/bible-books.js`: 66 books, English order, per-chapter verse counts (KJV versification) |
| 2 | `bible-data-verifier` | `claude-sonnet-5` | Independent second pass catches single-model slips | Regenerate the dataset from scratch, diff against agent 1's output; coordinator adjudicates any mismatch |
| 3 | `schedule-engine` | `claude-sonnet-5` | Core algorithmic work with crisp spec + golden test to verify against | `lib/schedule.js` + `lib/refs.js` + their tests, including the full Appendix 2 golden fixture |
| 4 | `ui-builder` | `claude-sonnet-5` | Standard DOM/form work | `ui/form.js`, `ui/render.js`, `index.js`: form with defaults, validation, >160-verse callout, semantic table output |
| 5 | `style-print` | `claude-sonnet-5` | Print CSS is the subtlest visual requirement (repeating `<thead>`, page breaks) and deserves focused attention | `styles/screen.css` + `styles/print.css`, scoped to the widget; typography modeled on Appendix 2 |
| 6 | `ghost-packager` | `claude-haiku-4-5-20251001` | Mechanical: bundling config + copy-paste snippets | esbuild config, `dist/` bundle, `ghost/html-card-snippet.html`, `page-memory-plan.hbs`, README install docs |
| 7 | `qa-reviewer` | `claude-opus-5` | Adversarial review pays for a stronger model | Run tests; verify golden fixture; render in headless Chromium (screen + print-to-PDF via Playwright) and check headings repeat across printed pages; probe edge cases below |

Notes:

- Agents 1+2 and (3 in parallel with 5's first draft) can run concurrently;
  everything else is sequential enough that the coordinator just chains them.
- Sub-agent definitions live in `.claude/agents/<name>.md` with `model:` in
  the frontmatter, so the roster above is reproducible, not ad-hoc.

### Phase plan

**Phase 0 — Scaffold (coordinator).**
Repo layout, `package.json` (esbuild + vitest, dev-only), `.claude/agents/`
definitions, empty module stubs. Commit.

**Phase 1 — Data (agents 1 ∥ 2, then coordinator).**
Two independent versification datasets; coordinator diffs them and resolves
any discrepancy against known checksums (Ephesians 155, Bible-wide totals).
`data.test.js` locks the result. Commit.

**Phase 2 — Engine (agent 3).**
Pure functions: `generateSchedule({book, startDate, versesPerDay,
daysPerWeek}) → {title, rows[], totalDays, warning}` and the reference-range
formatter. Pin the generator to Appendix 2 via a golden checkpoint suite in
`test/schedule.test.js`: 13 exact rows transcribed from the published table
(days 1, 2, 6, 8, 13, 15, 27, 29, 53, 78, 115, 153, 180) plus structural
invariants (off-day pattern, 180-row total, title). Full row-for-row
verification of all 180 rows happens in Phase 6 against the live DOM and
print-to-PDF output. Commit only when green.

**Phase 3 — UI (agent 4, depends on 1–2).**
Form with the four inputs and defaults; on submit, render the plan table;
show the >160-verse callout when applicable; Print button. No frameworks —
vanilla DOM so the bundle stays dependency-free inside Ghost.

**Phase 4 — Styling (agent 5, overlaps Phase 3).**
Screen styles scoped under `.bmp-widget` (survive any Ghost theme);
`print.css` with `table-header-group` thead repetition, row
`break-inside: avoid`, hidden chrome, sensible margins.

**Phase 5 — Packaging (agent 6).**
Single-file IIFE bundle in `dist/` (committed to the repo), HTML-card snippet
using the jsDelivr tag-pinned URL, optional `.hbs` template, GitHub Pages
workflow (`.github/workflows/pages.yml`) publishing `dist/` + a demo page,
README with both install paths (Ghost(Pro)-compatible).

**Phase 6 — QA (agent 7, then coordinator).**
- `vitest` suite green, golden checkpoints exact.
- Playwright: load widget in headless Chromium, generate Ephesians plan,
  print-to-PDF, assert page count > 1 and headings present on pages 2+.
- Edge cases: Psalms (2,461 verses — longest), Obadiah/Philemon/2 John/3 John
  (single chapter / tiny), 3 John with 5 verses/day, 7 days/week (no off
  rows), 1 day/week, start dates crossing month and year boundaries, leap-day
  handling, >160-verse callout on/off threshold (exactly 160 vs 161).
- Coordinator does final code review, then tags v1.0.

### Milestones / commits

1. `scaffold: repo layout, tooling, agent definitions`
2. `data: verified 66-book versification dataset + tests`
3. `engine: schedule generator matching Appendix 2 golden fixture`
4. `ui: form, callout, and plan rendering`
5. `styles: screen + print (repeating table headings)`
6. `packaging: dist bundle + Ghost install paths + README`
7. `qa: print/PDF verification, edge cases, v1.0`

---

## 6. Acceptance criteria

- [ ] Ephesians / Jan 1 / 1 verse/day / 6 days/week reproduces Appendix 2
      exactly (180 rows, ends `6:24`, `1:1–6:24`).
- [ ] All four inputs present with specified defaults; book list is all 66
      books in standard English order.
- [ ] Callout appears for books over 160 verses, and only for them.
- [ ] Day-off rows numbered and dated; previous-verse logic skips them.
- [ ] Cumulative review uses collapsed same-chapter notation and full
      cross-chapter notation.
- [ ] Printed output repeats the table headings on every page (verified via
      print-to-PDF in QA, not just assumed).
- [ ] Widget renders correctly inside a stock Ghost 6 theme (Source) via an
      HTML card, with no style bleed either direction.
- [ ] Zero runtime dependencies; single `<script>` install.
- [ ] Bundle loads successfully from the jsDelivr URL for a tagged release
      (served from this GitHub repo — no separate hosting), and the GitHub
      Pages demo renders the widget.
