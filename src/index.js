// Widget bootstrap: finds every [data-bible-memory-plan] host element and
// mounts the form + plan-rendering widget into it. No frameworks, zero
// runtime dependencies.

import { buildForm } from './ui/form.js';
import { renderPlan } from './ui/render.js';
import { generateSchedule } from './lib/schedule.js';

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

  buildForm(widget, ({ book, startDate, versesPerDay, daysPerWeek, chapter }) => {
    lastOptions = { versesPerDay, daysPerWeek };
    const plan = generateSchedule({ book, startDate, versesPerDay, daysPerWeek, chapter });
    renderPlan(widget, plan, lastOptions);
  });

  widget.appendChild(planSection);
  host.appendChild(widget);
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
