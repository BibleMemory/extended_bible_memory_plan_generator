# Bible Memory Plan Generator

A self-contained JavaScript widget that generates personalized day-by-day Bible memorization plans for Ghost blogs. Pick a book, start date, and pace — get a full schedule formatted like the appendix in *How to Memorize Scripture for Life*, with print styling that repeats table headings on every page.

## Features

- **66 books** of the Bible (KJV versification)
- **Customizable inputs:** book selection, start date, verses/day (1+), days/week (1–7)
- **Smart scheduling:** automatic day-off rows, cumulative verse review notation, previous-verse tracking
- **Print-ready:** printing outputs only the plan (title and table) — surrounding page content is hidden — with repeating table headings on every page and clean black-on-white output. Headings repeat in Chrome, Edge, and Firefox; Safari prints them only once (a WebKit print limitation). Print-only-the-plan requires a browser with CSS `:has()` (all modern browsers); older browsers print the full page.
- **Beginner callout:** advisory for books over 160 verses
- **Zero dependencies:** single JS file, ships in browsers instantly
- **Ghost-compatible:** works in HTML cards and as an optional theme template
- **MIT licensed**

## Demo

Visit the live demo at [https://biblememory.github.io/extended_bible_memory_plan_generator/](https://biblememory.github.io/extended_bible_memory_plan_generator/) to test the widget and see the print layout.

## Installation

### Path A: Ghost HTML Card (Recommended)

Works on Ghost(Pro) and self-hosted; no theme changes needed.

1. **Create or open a Ghost page** where you want the widget.
2. **Add an HTML card** and paste this snippet:

```html
<div data-bible-memory-plan></div>
<script src="https://cdn.jsdelivr.net/gh/BibleMemory/extended_bible_memory_plan_generator@1/dist/bible-memory-plan.min.js" defer></script>
```

3. **Publish the page.** The widget loads and mounts automatically.

#### Version ranges vs. pinned versions

The URL above uses the `@1` range: jsDelivr resolves it to the newest `1.x` release tag, so bug fixes arrive without editing the snippet, while a future breaking `2.0` would not be picked up automatically. New releases can take up to 12 hours to propagate through the CDN cache.

To pin an exact release instead — so the published page never changes until you edit it:

1. Visit [GitHub Releases](https://github.com/BibleMemory/extended_bible_memory_plan_generator/releases) and pick the tag you want (e.g., `v1.0.1`).
2. Replace `@1` in the script URL with that tag, e.g., `@v1.0.1`.
3. Save the page. Upgrade later by editing the tag in the snippet.

### Path B: Ghost Theme Custom Page Template (Optional)

For theme integrators or users comfortable editing theme files:

1. **Copy** `ghost/page-memory-plan.hbs` into the root of your theme, alongside `default.hbs` (do not overwrite `default.hbs` — this template extends it).
2. **In Ghost Admin,** create a page whose slug is `memory-plan`; Ghost applies `page-{slug}.hbs` to it automatically. (If you would rather pick the template from the dropdown in page settings, rename the file to `custom-memory-plan.hbs` — only `custom-*.hbs` templates appear in that picker.)
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

`demo/index.html` loads the widget from `src/` via native ES modules, so the server must be rooted at the repo (not at `demo/`):

```bash
npx http-server .
```

Then visit `http://localhost:8080/demo/index.html` to interact with the widget during development.

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

MIT. Copyright 2026 BibleMemory.

See `LICENSE` for full text.

---

**Questions?** Check the [GitHub issues](https://github.com/BibleMemory/extended_bible_memory_plan_generator/issues) or open a new one.
