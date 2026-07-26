# Bible Memory Plan Generator

A self-contained JavaScript widget that generates personalized day-by-day Bible memorization plans for Ghost blogs. Pick a book, start date, and pace — get a full schedule formatted like the appendix in *How to Memorize Scripture for Life*, with print styling that repeats table headings on every page.

## Features

- **66 books** of the Bible (KJV versification)
- **Customizable inputs:** book selection, start date, verses/day (1+), days/week (1–7)
- **Smart scheduling:** automatic day-off rows, cumulative verse review notation, previous-verse tracking
- **Print-ready:** repeating table headings on every printed page, clean black-on-white output
- **Beginner callout:** advisory for books over 160 verses
- **Zero dependencies:** single JS file, ships in browsers instantly
- **Ghost-compatible:** works in HTML cards and as an optional theme template
- **MIT licensed**

## Demo

Visit the live demo at [https://jeeves-and-company.github.io/ghost_bible_memory_plan_generator/](https://jeeves-and-company.github.io/ghost_bible_memory_plan_generator/) to test the widget and see the print layout.

## Installation

### Path A: Ghost HTML Card (Recommended)

Works on Ghost(Pro) and self-hosted; no theme changes needed.

1. **Create or open a Ghost page** where you want the widget.
2. **Add an HTML card** and paste this snippet:

```html
<div data-bible-memory-plan></div>
<script src="https://cdn.jsdelivr.net/gh/Jeeves-and-Company/ghost_bible_memory_plan_generator@v1.0.0/dist/bible-memory-plan.min.js" defer></script>
```

3. **Publish the page.** The widget loads and mounts automatically.

#### Updating the version

The URL above pins the bundle to release `v1.0.0`. To upgrade to a newer release:

1. Visit [GitHub Releases](https://github.com/Jeeves-and-Company/ghost_bible_memory_plan_generator/releases) and find the tag you want (e.g., `v1.1.0`).
2. Replace `@v1.0.0` in the script URL with the new version tag, e.g., `@v1.1.0`.
3. Save the page. Browsers will download the new bundle on next visit.

Pinned version tags mean published blog pages never break if we push new code; you upgrade by editing the snippet.

### Path B: Ghost Theme Custom Page Template (Optional)

For theme integrators or users comfortable editing theme files:

1. **Copy** `ghost/page-memory-plan.hbs` into your theme's template directory (e.g., `mytheme/default.hbs`).
2. **In Ghost Admin,** create or edit a page and select "Memory Plan" from the template picker in page settings.
3. **Choose your asset path:**
   - **CDN (recommended):** Edit the `.hbs` file to uncomment the jsDelivr line. No manual files needed.
   - **Self-hosted:** Copy `dist/bible-memory-plan.min.js` to `theme/assets/built/`, then uncomment the `{{asset}}` line in the template.

## Local Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

Generates `dist/bible-memory-plan.min.js` (minified, CSS injected) and `dist/bible-memory-plan.css` (concatenated stylesheets).

### Test

```bash
npm test
```

Runs the full test suite, including the golden test that reproduces Appendix 2 of *How to Memorize Scripture for Life* (Ephesians, Jan 1 start, 1 verse/day, 6 days/week — must match exactly).

### Live demo

Open `demo/index.html` in a web server:

```bash
npx http-server demo
```

Then visit `http://localhost:8080/index.html` to interact with the widget during development.

## Data Notes

### Versification

The widget uses **KJV (King James Version) versification**, the de facto standard for Bible memory work and adopted by most major translations (ESV, NASB, etc.). Each book's chapter structure and verse counts are hardcoded from `src/data/bible-books.js`.

Spot checks and the full test suite verify:
- Ephesians: 155 verses (6 chapters)
- Psalms: 2,461 verses (longest book)
- Philemon, 2 John, 3 John, Obadiah: 25, 13, 14, 21 verses (smallest)

### 66-Book Canon

Standard Protestant Bible order: Genesis through Revelation.

## Architecture

```
src/
├── index.js              widget bootstrap
├── lib/
│   ├── schedule.js       core schedule generator (pure functions)
│   └── refs.js           verse-reference math and notation
├── ui/
│   ├── form.js           input form with defaults & validation
│   └── render.js         plan table rendering
├── data/
│   └── bible-books.js    66 books, versification
└── styles/
    ├── screen.css        on-screen styles (scoped to .bmp-widget)
    └── print.css         @media print with table-header-group & break-inside

dist/
├── bible-memory-plan.min.js    IIFE bundle (CSS injected, minified)
└── bible-memory-plan.css       optional separate stylesheet

test/                    vitest suite + golden fixture
```

The widget finds any `[data-bible-memory-plan]` element and mounts idempotently, so the same snippet can appear multiple times on a page without conflict.

## License

MIT. Copyright 2026 Jeeves and Company.

See `LICENSE` for full text.

---

**Questions?** Check the [GitHub issues](https://github.com/Jeeves-and-Company/ghost_bible_memory_plan_generator/issues) or open a new one.
