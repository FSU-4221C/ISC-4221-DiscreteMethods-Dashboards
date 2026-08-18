/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   nav.js — navigation behaviour for the ISC 4221C (2026) dashboard
   ==========================================================================

   Vanilla ES module. No dependencies, no network access.

   RESPONSIBILITIES
     1. Primary nav: the Law 2 module strip — edge fades, scroll the current
        item into view, wheel-to-horizontal. No disclosure; see below.
     2. Sidebar module nav: collapse behind a labelled toggle on narrow
        viewports, plus current-topic highlighting driven by scroll position.
     3. Mark the current page in the primary nav with aria-current="page".
     4. Coverage legend: Escape dismisses a hover/focus definition (1.4.13).
     5. Keyboard: Escape closes an open disclosure and returns focus to its
        trigger. Everything else uses native link behaviour on purpose.

   THINGS THIS FILE DELIBERATELY DOES NOT DO
     - No roving tabindex on the nav. These are links to pages and to
       anchors, not a tablist. The ARIA Authoring Practices tab pattern would
       be a lie about what they are, and would remove Tab access to each item.
     - No focus movement on scroll. Current-section highlighting changes
       aria-current only; moving focus while somebody is reading is a
       2.4.3 / 3.2.5 failure and is genuinely disorienting.
     - No smooth-scroll override. The CSS does it, and only when the user has
       not asked for reduced motion.

   PROGRESSIVE ENHANCEMENT
     Both toggles ship `hidden` in the markup and are revealed here. With
     scripting off, both navs are simply always expanded — which is usable.
     A collapsed nav with a dead toggle is not.
   ========================================================================== */

const COLLAPSE_QUERY_SIDEBAR = '(max-width: 64rem)';

/* ==========================================================================
   1. Disclosure helper — used by both navs
   ========================================================================== */

/**
 * Wire a button + region pair as a disclosure.
 * The button must already have aria-controls pointing at the region's id.
 *
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} region
 * @param {object} options
 * @param {string} options.labelOpen    visible label when the region is open
 * @param {string} options.labelClosed  visible label when the region is closed
 * @param {MediaQueryList} options.media  collapse only while this matches
 */
function wireDisclosure(button, region, options) {
  if (!button || !region) return null;

  const { labelOpen, labelClosed, media } = options;
  const labelTarget = button.querySelector('[data-nav-label]') || button;

  // The user's collapsed/expanded choice, which only means anything while the
  // viewport is narrow enough for the disclosure to exist at all.
  let userWantsOpen = false;

  /**
   * Derive the rendered state rather than storing it.
   *
   * Storing it is how a nav ends up permanently hidden on a desktop: the
   * collapse state gets set once at load, a `change` event on the media query
   * is missed (they are missed — device emulation, zoom, and OS text-size
   * changes all resize the viewport without reliably firing one), and the list
   * stays `hidden` forever at 1280px with its toggle button invisible.
   *
   * Deriving it means every repaint is self-correcting.
   */
  function paint() {
    const collapsible = media.matches;
    const expanded = collapsible ? userWantsOpen : true;

    button.hidden = !collapsible;
    button.setAttribute('aria-expanded', String(expanded));
    labelTarget.textContent = expanded ? labelOpen : labelClosed;

    // `hidden`, not a CSS class, so the collapsed region leaves the tab order
    // as well as the page. A panel that stays tabbable while closed is the
    // classic 2.4.3 Focus Order defect. dashboard.css carries the matching
    // `[hidden] { display: none !important }` so a component `display` rule
    // cannot quietly override the attribute.
    region.hidden = !expanded;
  }

  function setOpen(next) {
    userWantsOpen = next;
    paint();
  }

  button.addEventListener('click', () => setOpen(!userWantsOpen));

  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && userWantsOpen && media.matches) {
      setOpen(false);
    }
  });

  region.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !media.matches || !userWantsOpen) return;
    setOpen(false);
    button.focus();   // focus returns to the trigger, never to <body>
  });

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', paint);
  } else if (typeof media.addListener === 'function') {
    media.addListener(paint);   // Safari < 14
  }

  // Belt and braces: a resize listener, so a missed media-query event
  // self-heals instead of stranding the nav.
  //
  // paint() is called synchronously here, NOT inside requestAnimationFrame.
  // rAF does not run in a page that is not compositing — a background tab, a
  // hidden pane, a headless run — and a nav that is stuck `hidden` at 1280px
  // is not something to defer to a frame that may never arrive. It is five
  // attribute writes; there is nothing to throttle.
  window.addEventListener('resize', paint);

  paint();

  return { setOpen, isOpen: () => media.matches && userWantsOpen };
}

/* ==========================================================================
   2. Primary nav
   ========================================================================== */

/**
 * The primary nav has NO disclosure any more.
 *
 * Law 2 (design-system.md §6.3) answers narrow viewports by scrolling the
 * strip, not by hiding it. Running both mechanisms means the same nav has two
 * different narrow-screen behaviours depending on which one wins the media
 * query, and the strip is the better of the two: every module stays one Tab
 * away instead of two, and nothing has to be opened before it can be read.
 *
 * The <button class="nav-toggle"> is still in the markup on all fifteen
 * pages. It ships `hidden` and nothing un-hides it, so it is inert rather
 * than broken — a visible control that does nothing is the worse failure.
 * initNavStrip() below is what handles narrow viewports now.
 *
 * The SIDEBAR nav keeps its disclosure (initModuleNav). That one is a list of
 * fifty topics, not nine pages, and collapsing it is genuinely useful.
 */
function initPrimaryNav() {
  const nav = document.querySelector('.primary-nav');
  const list = nav && nav.querySelector('.primary-nav__list');
  if (!list) return;
  if (!list.id) list.id = 'primary-nav-list';

  // Whatever a previous version left behind: the list is never hidden now.
  list.hidden = false;

  const toggle = document.querySelector('.nav-toggle');
  if (toggle) toggle.hidden = true;
}

/* ==========================================================================
   2b. LAW 2 — the module strip

   design-system.md §6.3. The strip is `flex-wrap: nowrap` and
   `justify-content: safe center`, so it never wraps and never clips its first
   item. Three behaviours make that survivable as the item count grows, and all
   three are enhancements: with scripting off the strip is still a plain
   scrollable row, which works.

     1. Edge fades, but only on the side that actually has more to show. A
        fade that is always on is a lie about scrollable content.
     2. The current page is scrolled into view on load. Landing on M7 with the
        strip scrolled to M0 is the failure this prevents.
     3. Vertical wheel maps to horizontal scroll while the pointer is over the
        strip — but only when the strip is genuinely overflowing, so a page
        scroll is never swallowed by a row that had nowhere to go.
   ========================================================================== */

function initNavStrip() {
  const nav = document.querySelector('.primary-nav');
  const list = nav && nav.querySelector('.primary-nav__list');
  if (!nav || !list) return;

  function paintOverflow() {
    // 1px of slack: sub-pixel layout makes an exactly-fitting row report a
    // scrollWidth one larger than its clientWidth, which would light a fade
    // on a strip that cannot move.
    const overflowing = list.scrollWidth - list.clientWidth > 1;
    nav.classList.toggle('is-scrollable', overflowing);

    if (!overflowing) {
      nav.classList.remove('has-overflow-start', 'has-overflow-end');
      return;
    }

    const max = list.scrollWidth - list.clientWidth;
    // Math.abs so this is correct in a right-to-left writing mode, where
    // scrollLeft runs negative.
    const pos = Math.abs(list.scrollLeft);
    nav.classList.toggle('has-overflow-start', pos > 1);
    nav.classList.toggle('has-overflow-end', pos < max - 1);
  }

  function scrollCurrentIntoView() {
    const current = list.querySelector('[aria-current="page"]');
    if (!current) return;
    if (list.scrollWidth - list.clientWidth <= 1) return;

    // Centre the current item without scrolling the PAGE. scrollIntoView()
    // would do both, and moving the page on load is disorienting and can
    // strand a fragment target (2.4.11).
    const target =
      current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
    list.scrollLeft = Math.max(0, target);
  }

  list.addEventListener('scroll', paintOverflow, { passive: true });
  window.addEventListener('resize', paintOverflow);

  list.addEventListener(
    'wheel',
    (event) => {
      if (event.deltaX !== 0) return;                       // already horizontal
      if (list.scrollWidth - list.clientWidth <= 1) return;  // nothing to scroll

      const max = list.scrollWidth - list.clientWidth;
      const pos = Math.abs(list.scrollLeft);
      // At either end, let the event through so the page scrolls instead of
      // the gesture dying against a wall.
      if ((event.deltaY < 0 && pos <= 0) || (event.deltaY > 0 && pos >= max)) {
        return;
      }

      event.preventDefault();
      list.scrollLeft += event.deltaY;
    },
    { passive: false }
  );

  paintOverflow();
  scrollCurrentIntoView();
  paintOverflow();
}

/* ==========================================================================
   2c. Coverage legend — 1.4.13 Content on Hover or Focus

   The CSS reveals each definition on :hover and :focus-within, and makes it
   hoverable and persistent by construction (the popover is a child of the
   item, so there is no gap to cross and leaving it is what closes it).

   The third requirement, DISMISSIBLE, cannot be done in CSS: Escape has to
   close the popover without moving the pointer or the focus. That is all this
   does. The flag is cleared as soon as the pointer or focus leaves, so the
   next hover works normally.
   ========================================================================== */

function initCoverageLegend() {
  const items = document.querySelectorAll('.coverage-legend__item');
  if (items.length === 0) return;

  items.forEach((item) => {
    const clear = () => item.removeAttribute('data-dismissed');

    // Cleared on ENTRY as well as on exit. Clearing only on exit looks
    // sufficient and is not: press Escape, then scroll the item out from
    // under the pointer without a mouseleave ever firing, and the definition
    // stays dismissed for the rest of the page's life. Clearing on entry
    // means the next hover always works, whatever happened before it.
    item.addEventListener('mouseenter', clear);
    item.addEventListener('mouseleave', clear);
    item.addEventListener('focusin', clear);
    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget)) clear();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    items.forEach((item) => {
      if (item.matches(':hover') || item.contains(document.activeElement)) {
        item.setAttribute('data-dismissed', '');
      }
    });
  });
}

/* ==========================================================================
   3. Current page marker

   Compares the last path segment, so it works from a file:// path, from a
   static host, and from a directory URL that resolves to index.html.
   ========================================================================== */

function currentFileName() {
  const path = window.location.pathname;
  const last = path.substring(path.lastIndexOf('/') + 1);
  return last === '' ? 'index.html' : last;
}

function initCurrentPage() {
  const here = currentFileName();

  document.querySelectorAll('.primary-nav__link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const target = href.split('#')[0].split('/').pop() || 'index.html';

    if (target === here) {
      link.setAttribute('aria-current', 'page');
      // aria-current alone is invisible and the gold underline alone is
      // colour-and-shape only. The markup should already carry a
      // .visually-hidden "Current page" span; add one if the author forgot.
      if (!link.querySelector('[data-current-note]')) {
        const note = document.createElement('span');
        note.className = 'visually-hidden';
        note.setAttribute('data-current-note', '');
        note.textContent = ' (current page)';
        link.appendChild(note);
      }
    } else {
      link.removeAttribute('aria-current');
      const note = link.querySelector('[data-current-note]');
      if (note) note.remove();
    }
  });
}

/* ==========================================================================
   3a. The secondary header — modules as dropdowns

   Every module is on the strip at once; its sections live behind a menu rather
   than on the strip. The previous header put nine module links, the wordmark
   and the theme switch on one line, which meant the labels had to shorten to
   "M0 … M7" to fit and a reader could not see where a page sat in the course.

   The identifiers say `chapter`; the reader-facing words say "module". That is
   not an oversight to tidy: `.module-nav` is already the sidebar "On this
   page" navigation, so reusing the name here would collide.

   The menu contents come from window.NAV_MAP, generated from the pages by
   tools/generate_nav_map.py, so a renamed section cannot leave a stale entry
   behind.

   Interaction rules, and the reason for each:

   - ONE menu open at a time. Opening a second closes the first, so the strip
     never becomes a wall of overlapping panels.
   - Hover opens it, but only after the pointer has stayed for 120ms, and it
     stays open for 240ms after the pointer leaves. Both delays exist because
     the menu hangs BELOW its button: without them, moving the mouse across
     the strip flickers eight panels in sequence, and moving down into a menu
     crosses a gap and closes the thing you were reaching for (1.4.13
     Content on Hover or Focus — the content must be hoverable).
   - Click toggles, which is what a touch device sends and what a keyboard
     user gets from Enter or Space.
   - Escape closes and returns focus to the button (1.4.13 Dismissable).
   - Focus leaving the item closes it, so Tab out does not leave a panel
     hanging over the page.
   - The menu is `hidden` when closed, not just visually gone: a menu that is
     merely off-screen still puts every one of its links in the tab order,
     which would put ~40 stops between the header and the page.
   ========================================================================== */

const CHAPTER_OPEN_DELAY = 120;
const CHAPTER_CLOSE_DELAY = 240;

function initChapterNav() {
  const nav = document.querySelector('.chapter-nav');
  if (!nav) return;

  const map = window.NAV_MAP || null;
  const here = currentFileName();
  let openItem = null;
  let openTimer = null;
  let closeTimer = null;

  /* NAV_MAP stores paths relative to the dashboard root, because that is the
     only stable thing to store. The pages under cross-cutting/ are one level
     down, so every href out of the map needs a prefix there — without it a
     menu link from a thread page pointed at
     `cross-cutting/m5-data-mining.html`, which does not exist.

     The prefix is read off the markup rather than sniffed from the URL:
     rebuild_header.py already wrote the correct one into
     `data-chapter-file`, so there is one source of truth and it is the same
     one the buttons use. */
  const base = (function () {
    const probe = nav.querySelector('.chapter-nav__button[data-chapter-file]');
    const file = probe && probe.getAttribute('data-chapter-file');
    if (!file) return '';
    const cut = file.lastIndexOf('/');
    return cut === -1 ? '' : file.slice(0, cut + 1);
  }());

  /** A root-relative path from NAV_MAP, resolved for this page's depth. */
  function href(path) {
    return base + path;
  }

  /* --- build the menus ------------------------------------------------- */

  function link(href, label, sub, current) {
    const a = document.createElement('a');
    a.className = 'chapter-menu__link';
    a.href = href;
    const strong = document.createElement('span');
    strong.className = 'chapter-menu__label';
    strong.textContent = label;
    a.appendChild(strong);
    if (sub) {
      const small = document.createElement('span');
      small.className = 'chapter-menu__meta';
      small.textContent = sub;
      a.appendChild(small);
    }
    if (current) {
      a.setAttribute('aria-current', 'true');
      const note = document.createElement('span');
      note.className = 'visually-hidden';
      note.textContent = ' (this page)';
      a.appendChild(note);
    }
    return a;
  }

  function fillChapter(item, chapter) {
    const menu = item.querySelector('.chapter-nav__menu');
    if (!menu) return;
    const onThisPage = chapter.file.split('/').pop() === here;

    const head = document.createElement('p');
    head.className = 'chapter-menu__title';
    head.textContent = chapter.name;
    menu.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'chapter-menu__list';

    /* The module page itself, first. A reader who wants the whole module
       should not have to guess that one of the sections is the way in. */
    const top = document.createElement('li');
    top.appendChild(link(
      href(chapter.file),
      onThisPage ? 'Top of this module' : 'Open the module',
      null,
      false
    ));
    list.appendChild(top);

    chapter.sections.forEach((section) => {
      const li = document.createElement('li');
      /* An in-page anchor when we are already on the chapter, a cross-page
         one otherwise. Same href shape either way, so a middle-click opens
         the right thing in both cases. */
      const target = (onThisPage ? '' : href(chapter.file)) + '#' + section.id;
      const label = section.number ? section.number + '  ' + section.title : section.title;
      li.appendChild(link(target, label, section.topics + ' topics', false));
      list.appendChild(li);
    });

    menu.appendChild(list);
  }

  function fillThreads(item, threads) {
    const menu = item.querySelector('.chapter-nav__menu');
    if (!menu) return;
    const head = document.createElement('p');
    head.className = 'chapter-menu__title';
    head.textContent = 'Cross-cutting threads';
    menu.appendChild(head);
    const list = document.createElement('ul');
    list.className = 'chapter-menu__list';
    threads.forEach((thread) => {
      const li = document.createElement('li');
      const file = thread.file.split('/').pop();
      /* A thread page linking to a sibling thread must not repeat the
         directory: from cross-cutting/, `cross-cutting/greedy-gallery.html`
         resolves to cross-cutting/cross-cutting/greedy-gallery.html. */
      const target = base === '' ? thread.file : file;
      li.appendChild(link(target, thread.title, null, file === here));
      list.appendChild(li);
    });
    menu.appendChild(list);
  }

  if (map) {
    map.chapters.forEach((chapter) => {
      const slug = chapter.file.split('-')[0];
      const item = nav.querySelector('[data-chapter="' + slug + '"]');
      if (item) fillChapter(item, chapter);
    });
    const threadItem = nav.querySelector('[data-chapter="threads"]');
    if (threadItem && map.threads && map.threads.length) fillThreads(threadItem, map.threads);
  }

  /* A button whose menu is empty (nav-map.js missing, or a chapter with no
     groups) must not present itself as a menu. Turn it into a plain link to
     the chapter so navigation still works. */
  nav.querySelectorAll('.chapter-nav__item[data-chapter]').forEach((item) => {
    const menu = item.querySelector('.chapter-nav__menu');
    const button = item.querySelector('.chapter-nav__button');
    if (!menu || !button || menu.childElementCount > 0) return;
    const file = button.getAttribute('data-chapter-file');
    if (!file) { button.hidden = true; return; }
    const a = document.createElement('a');
    a.className = 'chapter-nav__link';
    a.href = file;
    a.textContent = button.textContent.trim();
    button.replaceWith(a);
    menu.remove();
  });

  /* --- mark the chapter this page belongs to --------------------------- */

  nav.querySelectorAll('.chapter-nav__item[data-chapter]').forEach((item) => {
    const button = item.querySelector('.chapter-nav__button, .chapter-nav__link');
    if (!button) return;
    const file = button.getAttribute('data-chapter-file') || button.getAttribute('href') || '';
    const target = file.split('#')[0].split('/').pop();
    if (target && target === here) {
      item.setAttribute('data-current', 'true');
      button.setAttribute('aria-current', 'page');
      const note = document.createElement('span');
      note.className = 'visually-hidden';
      note.textContent = ' (current module)';
      button.appendChild(note);
    }
  });

  /* --- open / close ---------------------------------------------------- */

  function close(item, refocus) {
    if (!item) return;
    const button = item.querySelector('.chapter-nav__button');
    const menu = item.querySelector('.chapter-nav__menu');
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    item.removeAttribute('data-open');
    if (openItem === item) openItem = null;
    if (refocus) button.focus();
  }

  function open(item) {
    const button = item.querySelector('.chapter-nav__button');
    const menu = item.querySelector('.chapter-nav__menu');
    if (!button || !menu) return;
    if (openItem && openItem !== item) close(openItem, false);
    button.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    item.setAttribute('data-open', 'true');
    openItem = item;
    placeMenu(item);
  }

  /* Position the panel.

     The menu is `position: fixed`, because the strip sets overflow-x for
     narrow screens and an overflow ancestor clips absolutely-positioned
     descendants — the panel was rendering with zero visible height, cut off at
     the bottom of the strip. Fixed escapes the clip, at the cost of having to
     place it by hand against the button's rect.

     Placement rules:
       - hang from the button's bottom edge
       - align to the button's inline-start edge, unless that runs the panel
         off the viewport, in which case align its END to the button's end
       - never closer than 8px to either edge
     Recomputed on scroll and resize, because a fixed element does not move
     with the sticky strip on its own. */
  const MENU_GAP = 8;

  function placeMenu(item) {
    const button = item.querySelector('.chapter-nav__button');
    const menu = item.querySelector('.chapter-nav__menu');
    if (!button || !menu || menu.hidden) return;

    const b = button.getBoundingClientRect();
    menu.style.top = Math.round(b.bottom) + 'px';

    /* Measure the panel where it will not be clamped, then decide. */
    menu.style.left = '0px';
    const width = menu.getBoundingClientRect().width;

    let left = b.left;
    const maxLeft = window.innerWidth - width - MENU_GAP;
    if (left > maxLeft) left = Math.max(MENU_GAP, b.right - width);
    if (left > maxLeft) left = Math.max(MENU_GAP, maxLeft);
    if (left < MENU_GAP) left = MENU_GAP;
    menu.style.left = Math.round(left) + 'px';

    /* A panel taller than the space under the strip scrolls internally rather
       than running off the bottom of the window. */
    const room = window.innerHeight - b.bottom - MENU_GAP;
    menu.style.maxHeight = Math.max(160, Math.round(room)) + 'px';
  }

  function cancelTimers() {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
  }

  nav.querySelectorAll('.chapter-nav__item[data-chapter]').forEach((item) => {
    const button = item.querySelector('.chapter-nav__button');
    const menu = item.querySelector('.chapter-nav__menu');
    if (!button || !menu) return;

    button.addEventListener('click', () => {
      cancelTimers();
      if (item.getAttribute('data-open') === 'true') close(item, false);
      else open(item);
    });

    item.addEventListener('mouseenter', () => {
      cancelTimers();
      openTimer = window.setTimeout(() => open(item), CHAPTER_OPEN_DELAY);
    });

    item.addEventListener('mouseleave', () => {
      cancelTimers();
      closeTimer = window.setTimeout(() => close(item, false), CHAPTER_CLOSE_DELAY);
    });

    /* Focus entering by keyboard opens; focus leaving the whole item closes.
       `focusout` fires before focus lands, so the check is deferred a tick. */
    item.addEventListener('focusin', () => { cancelTimers(); open(item); });
    item.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!item.contains(document.activeElement)) close(item, false);
      }, 0);
    });

    menu.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(item, true);
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && item.getAttribute('data-open') === 'true') {
        event.preventDefault();
        close(item, false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(item);
        const first = menu.querySelector('.chapter-menu__link');
        if (first) first.focus();
      }
    });
  });

  /* A click anywhere else closes. Uses pointerdown so the menu is gone before
     the click lands on whatever is underneath. */
  document.addEventListener('pointerdown', (event) => {
    if (openItem && !openItem.contains(event.target)) close(openItem, false);
  });

  /* A fixed panel does not travel with the button, so anything that moves the
     button has to reposition it. Passive listeners: this only ever reads
     layout and writes two inline styles. */
  const reposition = () => { if (openItem) placeMenu(openItem); };
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, { passive: true });
  const strip = nav.querySelector('.chapter-nav__list');
  if (strip) strip.addEventListener('scroll', reposition, { passive: true });
}

/* ==========================================================================
   3b. Figure scale — a drawing may not be blown up past its design size

   A width cap alone does not fix an oversized figure, because how big a figure
   LOOKS depends on its viewBox, not on its width. Two figures both capped at
   608px render at 1.3x and 2.1x if their viewBoxes are 470 and 290 units — and
   at 2.1x an 11px label is 23px, a node is the size of a thumbnail, and two
   words fill a third of the panel. The figure does not gain detail as it
   grows; it just shouts.

   CSS cannot read a viewBox, so the ceiling has to be applied here: no drawing
   is scaled past MAX_SCALE times the width it was drawn at. Everything narrower
   than that still fills its container, so nothing shrinks on a small screen —
   this only ever removes upscaling.

   Applied to static figures on load and on resize, and re-applied by demo.js
   after every figure render, because a re-render replaces the node.
   ========================================================================== */

const MAX_FIGURE_SCALE = 1.25;

/** Cap one <svg> at MAX_FIGURE_SCALE x its viewBox width. */
function capFigure(svg) {
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return;
  const box = svg.getAttribute('viewBox');
  if (!box) return;
  const parts = box.trim().split(/[\s,]+/);
  const units = parseFloat(parts[2]);
  if (!isFinite(units) || units <= 0) return;
  svg.style.maxInlineSize = Math.round(units * MAX_FIGURE_SCALE) + 'px';
  /* An svg with a max-inline-size and no margin sits flush left in a wider
     stage, which reads as a layout bug rather than a deliberate size. */
  svg.style.marginInline = 'auto';
}

function initFigureScale() {
  const apply = () => document.querySelectorAll('svg[viewBox]').forEach(capFigure);
  apply();
  /* Nothing here depends on the viewport, but a figure inserted later (a demo
     mounting, a lazy figure) needs the same treatment; re-running on resize is
     the cheap way to catch anything missed without a MutationObserver. */
  window.addEventListener('resize', apply, { passive: true });
}

/* ==========================================================================
   4. Sidebar module nav + current-section highlighting
   ========================================================================== */

function initModuleNav() {
  const nav = document.querySelector('.module-nav');
  if (!nav) return;

  const toggle = nav.querySelector('.module-nav__toggle');
  const list = nav.querySelector('.module-nav__list');

  if (toggle && list) {
    if (!list.id) list.id = 'module-nav-list';
    toggle.setAttribute('aria-controls', list.id);
    wireDisclosure(toggle, list, {
      labelOpen: 'Hide module contents',
      labelClosed: 'Module contents',
      media: window.matchMedia(COLLAPSE_QUERY_SIDEBAR)
    });
  }

  initSectionSpy(nav);
}

/**
 * Mark the topic section nearest the top of the viewport as current.
 *
 * aria-current="true" (not "location") because the item is not a location in
 * a set of pages; it is the section being read. Only ONE item ever carries
 * it, which is what makes it useful to a screen-reader user browsing the nav.
 *
 * @param {HTMLElement} nav
 */
function initSectionSpy(nav) {
  const links = Array.from(nav.querySelectorAll('.module-nav__link[href^="#"]'));
  if (links.length === 0) return;

  /** @type {Map<string, HTMLElement>} */
  const linkById = new Map();
  const targets = [];

  links.forEach((link) => {
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    const target = document.getElementById(id);
    if (!target) return;
    linkById.set(id, link);
    targets.push(target);
  });

  if (targets.length === 0) return;

  let currentId = null;

  function setCurrent(id) {
    if (id === currentId) return;
    currentId = id;
    linkById.forEach((link, linkId) => {
      if (linkId === id) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if (!('IntersectionObserver' in window)) {
    // No observer (very old engine): fall back to marking whatever the URL
    // fragment points at. Still correct, just not live.
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    if (fromHash && linkById.has(fromHash)) setCurrent(fromHash);
    window.addEventListener('hashchange', () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (linkById.has(id)) setCurrent(id);
    });
    return;
  }

  /** ids currently intersecting, in document order */
  const visible = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible.add(entry.target.id);
        } else {
          visible.delete(entry.target.id);
        }
      });

      // Pick the first visible target in document order, so scrolling down
      // through a long module walks the nav down in the same order.
      const first = targets.find((t) => visible.has(t.id));
      if (first) {
        setCurrent(first.id);
      }
      // If nothing is intersecting (a very tall section fills the viewport),
      // keep the previous value rather than clearing it — an empty nav state
      // is less useful than a slightly stale one.
    },
    {
      // Trigger when a section reaches the upper third of the viewport.
      rootMargin: '0px 0px -66% 0px',
      threshold: 0
    }
  );

  targets.forEach((t) => observer.observe(t));
}

/* ==========================================================================
   5. Back-to-top

   A link, not a button, and it points at #main so it lands on the skip-link
   target. Focus follows the link natively.
   ========================================================================== */

function initBackToTop() {
  document.querySelectorAll('[data-back-to-top]').forEach((link) => {
    link.addEventListener('click', () => {
      const main = document.getElementById('main');
      if (main) {
        // Native anchor navigation already scrolls; this makes sure focus
        // actually lands on <main tabindex="-1"> in every engine.
        window.requestAnimationFrame(() => main.focus());
      }
    });
  });
}

/* ==========================================================================
   6. Init
   ========================================================================== */

function initNav() {
  initPrimaryNav();
  // Current-page marking runs BEFORE the strip, because scrolling the current
  // item into view needs [aria-current="page"] to exist.
  initCurrentPage();
  initNavStrip();
  // The chapter strip builds its own current-page marking from NAV_MAP, so it
  // does not depend on initCurrentPage — but it must run after it, because
  // both write aria-current and the later writer should be the one that knows
  // about chapters.
  initChapterNav();
  initFigureScale();
  initCoverageLegend();
  initModuleNav();
  initBackToTop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNav, { once: true });
} else {
  initNav();
}

global.Nav = { initNav, initChapterNav, capFigure };
})(window);
