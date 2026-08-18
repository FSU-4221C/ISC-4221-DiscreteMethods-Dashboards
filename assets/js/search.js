/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   search.js — client-side search over the generated index
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module. No dependencies,
   no network access, no fetch — the index is imported as a module so the
   whole thing works from a file:// URL.

   THE PATTERN, AND WHY IT IS NOT A COMBOBOX
     Results are real <a> elements in a real <ul>. Not a listbox, not
     aria-activedescendant, not role="option".

     A combobox would have to reimplement, correctly, everything a link
     already does: Enter, Ctrl/Cmd-click, middle-click, the context menu,
     "open in new tab", and the browser's own visited styling. Every one of
     those is a real thing students do. The APG combobox pattern exists for
     inputs that fill a form field; this input navigates to a page. So: real
     links, native semantics, and arrow keys layered on top as a convenience.

     What we owe the user instead is announcement. The result count goes to a
     polite live region that exists in the DOM from page load — a live region
     created at the same time as its content announces nothing (4.1.3).

   KEYBOARD
     Type            filter live (rendered immediately, announced on settle)
     Down / Up       move between the input and the results
     Home / End      first / last result   (while in the results)
     Escape          in results: back to the input
                     in the input: clear the query
     Enter           submit; identical to just typing, kept so the form is a
                     real form and so ?q= deep links work

   ZERO RESULTS
     Never a blank panel. A named empty state with the query echoed back and
     three things to try, plus links to the module list.

   MARKUP CONTRACT — see AUTHORING-CONTRACT.md §7.
     [data-search]                       the root, one per instance
       [data-search-input]               <input type="search"> with a <label for>
       [data-search-status]              role="status" aria-live="polite"
       [data-search-results]             <ul>
       [data-search-limit="8"]           optional, on the root; default 25
   ========================================================================== */

const { searchIndex } = window.SearchIndex;
const DEFAULT_LIMIT = 25;
const ANNOUNCE_DELAY = 300;   // ms after the last keystroke

/* ==========================================================================
   1. Normalising and matching
   ========================================================================== */

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip combining accents
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "3-5-5", "3.5.5" and "topic 3.5.5" all mean the same thing to a student.
 * Turn any of them into "3.5.5" so a number query matches `entry.number`.
 */
function asTopicNumber(query) {
  const cleaned = query.replace(/^topic\s+/i, '').trim();
  if (!/^[0-9]+([.\-_][0-9]+)*$/.test(cleaned)) return null;
  return cleaned.replace(/[\-_]/g, '.');
}

/** Every searchable string of an entry, pre-joined, lowercased once. */
const haystacks = new WeakMap();

function haystackFor(entry) {
  let cached = haystacks.get(entry);
  if (cached) return cached;
  cached = {
    title: normalise(entry.title),
    number: normalise(entry.number),
    module: normalise(`${entry.module} ${entry.moduleTitle}`),
    summary: normalise(entry.summary),
    keywords: (entry.keywords || []).map(normalise)
  };
  haystacks.set(entry, cached);
  return cached;
}

/** Tie-breaker only: never large enough to outrank a real text match. */
const KIND_WEIGHT = { topic: 12, demo: 10, section: 8, module: 6, thread: 4, page: 2 };

/**
 * Score one entry against one search term.
 * @returns {number} 0 means "this term does not match at all"
 */
function scoreTerm(entry, term) {
  const hay = haystackFor(entry);
  let score = 0;

  const asNumber = asTopicNumber(term);
  if (asNumber) {
    if (hay.number === asNumber) score += 1000;
    else if (hay.number.startsWith(asNumber + '.')) score += 700;
    else if (hay.number.startsWith(asNumber)) score += 400;
  }

  if (hay.title === term) score += 600;
  else if (hay.title.startsWith(term)) score += 380;
  else if (hay.title.includes(term)) score += 220;

  hay.keywords.forEach((keyword) => {
    if (keyword === term) score += 200;
    else if (keyword.startsWith(term)) score += 140;
    else if (keyword.includes(term)) score += 90;
  });

  if (hay.summary.includes(term)) score += 60;
  if (hay.module.includes(term)) score += 40;

  return score;
}

/**
 * Rank the whole index against a query.
 * Multi-word queries are AND: every term must match something, which is what
 * people expect from "dijkstra midterm".
 *
 * @param {string} rawQuery
 * @param {Array} index
 * @returns {Array<{entry: object, score: number}>}
 */
function search(rawQuery, index = searchIndex) {
  const query = normalise(rawQuery);
  if (query === '') return [];

  const terms = query.split(' ').filter(Boolean);

  const hits = [];
  index.forEach((entry) => {
    let total = 0;
    for (const term of terms) {
      const termScore = scoreTerm(entry, term);
      if (termScore === 0) return;   // AND: one miss disqualifies the entry
      total += termScore;
    }
    hits.push({ entry, score: total + (KIND_WEIGHT[entry.kind] || 0) });
  });

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable, meaningful tie-break: course order, then title.
    const byNumber = String(a.entry.number).localeCompare(String(b.entry.number), 'en', { numeric: true });
    if (byNumber !== 0) return byNumber;
    return a.entry.title.localeCompare(b.entry.title, 'en');
  });

  return hits;
}

/* ==========================================================================
   2. Rendering

   Built with createElement/createTextNode rather than innerHTML. The query
   goes straight into <mark> elements, and building nodes means there is no
   escaping step to get wrong — not a hypothetical, since the query can
   contain "<" the moment somebody searches for "O(n) < O(n^2)".
   ========================================================================== */

/**
 * Wrap every occurrence of `term` in `text` with a <mark>.
 * @returns {DocumentFragment}
 */
function highlight(text, terms) {
  const fragment = document.createDocumentFragment();
  const source = String(text);

  if (terms.length === 0) {
    fragment.appendChild(document.createTextNode(source));
    return fragment;
  }

  const lower = source.toLowerCase();
  const ranges = [];

  terms.forEach((term) => {
    if (!term) return;
    let from = 0;
    for (;;) {
      const at = lower.indexOf(term, from);
      if (at === -1) break;
      ranges.push([at, at + term.length]);
      from = at + term.length;
    }
  });

  if (ranges.length === 0) {
    fragment.appendChild(document.createTextNode(source));
    return fragment;
  }

  ranges.sort((a, b) => a[0] - b[0]);

  // Merge overlaps so "dij" + "dijkstra" does not produce nested marks.
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i += 1) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) {
      last[1] = Math.max(last[1], ranges[i][1]);
    } else {
      merged.push(ranges[i]);
    }
  }

  let cursor = 0;
  merged.forEach(([start, end]) => {
    if (start > cursor) {
      fragment.appendChild(document.createTextNode(source.slice(cursor, start)));
    }
    const mark = document.createElement('mark');
    mark.textContent = source.slice(start, end);
    fragment.appendChild(mark);
    cursor = end;
  });

  if (cursor < source.length) {
    fragment.appendChild(document.createTextNode(source.slice(cursor)));
  }

  return fragment;
}

function kindNoun(entry) {
  switch (entry.kind) {
    case 'topic':   return `Topic ${entry.number}`;
    case 'section': return `Section ${entry.number}`;
    case 'module':  return 'Module';
    case 'demo':    return 'Interactive demo';
    case 'thread':  return 'Cross-cutting thread';
    default:        return 'Page';
  }
}

function renderResult(entry, terms, base) {
  const li = document.createElement('li');

  const link = document.createElement('a');
  link.className = 'search__result';
  /* The index stores root-relative urls, which is the only stable thing for it
     to store. A page one level down (cross-cutting/) declares its depth with
     data-search-base, and every result is resolved through it — otherwise a
     result opened from a thread page resolves to
     cross-cutting/m3-graphs.html and 404s. An absolute url is left alone. */
  link.href = /^(?:[a-z]+:|\/)/i.test(entry.url) ? entry.url : (base || '') + entry.url;
  link.setAttribute('data-search-result', '');

  const title = document.createElement('span');
  title.className = 'search__result-title';
  title.appendChild(highlight(entry.title, terms));

  // The path gives the link its purpose in context (2.4.4). It is real text,
  // inside the link's accessible name, not a title= tooltip.
  const path = document.createElement('span');
  path.className = 'search__result-path';
  const where = entry.module
    ? `${kindNoun(entry)} · ${entry.module} ${entry.moduleTitle}`
    : kindNoun(entry);
  path.textContent = where;

  const summary = document.createElement('span');
  summary.className = 'search__result-summary';
  summary.appendChild(highlight(entry.summary, terms));

  link.append(title, path, summary);

  // An entry that leaves the dashboard says so, in text.
  if (/\.md$/i.test(entry.url) || /^https?:/i.test(entry.url)) {
    const note = document.createElement('span');
    note.className = 'search__result-path';
    note.textContent = 'Opens outside the dashboard';
    link.appendChild(note);
  }

  li.appendChild(link);
  return li;
}

function renderEmpty(query) {
  const li = document.createElement('li');
  const box = document.createElement('div');
  box.className = 'search__empty';

  const heading = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = 'No results';
  heading.appendChild(strong);
  heading.appendChild(document.createTextNode(` for “${query}”.`));

  const list = document.createElement('ul');
  [
    'Try a topic number on its own, such as 3.5.5 or 5.6.',
    'Try one word instead of a phrase — “dendrogram” rather than “how to read a dendrogram”.',
    'Try the lecturer’s wording, such as “edge-length matrix” or “look-then-leap”.'
  ].forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  });

  const fallback = document.createElement('p');
  fallback.appendChild(document.createTextNode('Or browse the eight modules from the '));
  const homeLink = document.createElement('a');
  homeLink.href = 'index.html#modules';
  homeLink.textContent = 'course map on the home page';
  fallback.appendChild(homeLink);
  fallback.appendChild(document.createTextNode('.'));

  box.append(heading, list, fallback);
  li.appendChild(box);
  return li;
}

/* ==========================================================================
   3. One search instance
   ========================================================================== */

function initInstance(root) {
  const input = root.querySelector('[data-search-input]');
  const status = root.querySelector('[data-search-status]');
  const results = root.querySelector('[data-search-results]');

  if (!input || !status || !results) {
    // Fail loudly in the console rather than silently shipping a dead box.
    console.error('[search.js] A [data-search] block is missing one of ' +
      '[data-search-input], [data-search-status] or [data-search-results].', root);
    return;
  }

  const limit = Number(root.getAttribute('data-search-limit')) || DEFAULT_LIMIT;
  const base = root.getAttribute('data-search-base') || '';
  const form = root.querySelector('form');

  // The "search needs JavaScript" note is in the page, not in a <noscript>,
  // and is removed here once the box is actually wired up. <noscript> covers
  // scripting-disabled but NOT a module script that failed to load, which is
  // what happens when this file is opened from a file:// URL in Chrome or
  // Firefox. Removing it on success covers both cases honestly.
  root.querySelectorAll('.search__nojs').forEach((note) => note.remove());

  let announceTimer = null;

  function resultLinks() {
    return Array.from(results.querySelectorAll('[data-search-result]'));
  }

  function announce(text) {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      status.textContent = text;
    }, ANNOUNCE_DELAY);
  }

  function render() {
    const raw = input.value;
    const query = raw.trim();
    const terms = normalise(query).split(' ').filter(Boolean);

    results.replaceChildren();

    if (query === '') {
      window.clearTimeout(announceTimer);
      status.textContent = '';
      return;
    }

    const hits = search(query);

    if (hits.length === 0) {
      results.appendChild(renderEmpty(query));
      announce(`No results for ${query}. Three suggestions are listed below the search box.`);
      return;
    }

    const shown = hits.slice(0, limit);
    const fragment = document.createDocumentFragment();
    shown.forEach(({ entry }) => fragment.appendChild(renderResult(entry, terms, base)));
    results.appendChild(fragment);

    const plural = hits.length === 1 ? 'result' : 'results';
    const capped = hits.length > shown.length
      ? ` Showing the first ${shown.length}.`
      : '';
    announce(`${hits.length} ${plural} for ${query}.${capped}`);
  }

  /* --- events ----------------------------------------------------------- */

  // Render immediately so the page never feels laggy; the ANNOUNCE_DELAY
  // above is what stops a screen reader narrating every keystroke.
  input.addEventListener('input', render);

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      render();
      const first = resultLinks()[0];
      if (first) first.focus();
    });
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      const first = resultLinks()[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === 'Escape' && input.value !== '') {
      event.preventDefault();
      input.value = '';
      render();
    }
  });

  results.addEventListener('keydown', (event) => {
    const links = resultLinks();
    if (links.length === 0) return;
    const at = links.indexOf(document.activeElement);
    if (at === -1) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (at + 1 < links.length) links[at + 1].focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (at === 0) input.focus();
        else links[at - 1].focus();
        break;
      case 'Home':
        event.preventDefault();
        links[0].focus();
        break;
      case 'End':
        event.preventDefault();
        links[links.length - 1].focus();
        break;
      case 'Escape':
        event.preventDefault();
        input.focus();
        break;
      default:
        break;
    }
  });

  // Following a result that points at this same page: browsers do not
  // reliably move focus for a same-document fragment, so do it explicitly.
  results.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('[data-search-result]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    window.requestAnimationFrame(() => target.focus());
  });

  /* --- ?q= deep link ---------------------------------------------------- */
  const params = new URLSearchParams(window.location.search);
  const initial = params.get('q');
  if (initial && input.value === '') {
    input.value = initial;
    render();
  }
}

/* ==========================================================================
   4. Init
   ========================================================================== */

function initSearch() {
  document.querySelectorAll('[data-search]').forEach(initInstance);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearch, { once: true });
} else {
  initSearch();
}

global.Search = { search, initSearch };
})(window);
