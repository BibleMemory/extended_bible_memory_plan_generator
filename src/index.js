// Widget bootstrap: finds every [data-bible-memory-plan] host element and
// mounts the form + plan-rendering widget into it. No frameworks, zero
// runtime dependencies.

import { buildForm } from './ui/form.js';
import { renderPlan } from './ui/render.js';
import { generateSchedule } from './lib/schedule.js';
import { readShareParams, writeShareParams, formatDateParam } from './lib/share.js';

const MOUNTED_ATTR = 'data-bmp-mounted';

function mount(host) {
  if (host.hasAttribute(MOUNTED_ATTR)) return; // idempotent
  host.setAttribute(MOUNTED_ATTR, 'true');

  const widget = document.createElement('div');
  widget.className = 'bmp-widget';

  const planSection = document.createElement('section');
  planSection.className = 'bmp-plan';
  planSection.hidden = true;

  let lastOptions = { versesPerDay: 1, daysPerWeek: 6 };

  // A shared link carries the full selection; if one is present, prefill
  // the form and generate immediately so the visitor lands on the plan.
  const initial = readShareParams(window.location.search);

  const { form } = buildForm(widget, ({ book, startDate, versesPerDay, daysPerWeek, chapter }) => {
    lastOptions = { versesPerDay, daysPerWeek };
    const plan = generateSchedule({ book, startDate, versesPerDay, daysPerWeek, chapter });
    renderPlan(widget, plan, lastOptions);

    // Reflect the selection in the URL (replace, not push, so Back still
    // leaves the page) — this is what makes the link shareable.
    try {
      const search = writeShareParams(window.location.search, {
        bookName: book.name,
        chapter,
        startDateStr: formatDateParam(startDate),
        versesPerDay,
        daysPerWeek,
      });
      window.history.replaceState(null, '', window.location.pathname + search + window.location.hash);
    } catch {
      // Sandboxed frames can forbid history access; sharing is then
      // unavailable but the widget still works.
    }
  }, initial);

  widget.appendChild(planSection);
  host.appendChild(widget);

  if (initial) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }
}

function mountAll() {
  const hosts = document.querySelectorAll('[data-bible-memory-plan]');
  for (const host of hosts) {
    mount(host);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
}

export { mount, mountAll };
