/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   theme.js — light / dark / system theme control
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access.

   WHAT IT DOES
     Writes `data-theme="light" | "dark"` on <html>, or removes the attribute
     entirely for "system". fsu-tokens.css §3 does the rest: the media block
     and the attribute block are byte-identical, so an explicit choice beats
     the OS preference in both directions.

   WHY THREE VALUES AND NOT A TOGGLE
     "System" has to stay reachable. A two-state button cannot express it
     honestly — aria-pressed is a boolean, and a tri-state button whose label
     you have to press twice to understand is a 4.1.2 Name/Role/Value problem
     dressed up as a design decision. So the control is a radio group: three
     inputs, one legend, native keyboard behaviour (arrow keys move between
     radios, Tab enters and leaves the group), nothing to reimplement.

   PROGRESSIVE ENHANCEMENT
     The markup ships the <fieldset class="theme-switch" hidden>. This module
     removes `hidden`. With scripting off the control never appears, because a
     control that does nothing is worse than no control at all.

   FLASH OF WRONG THEME
     ES modules are deferred, so this file runs after first paint. If a user
     has chosen dark but the OS is light, they would see a light flash. The
     fix is the four-line inline bootstrap in <head> — see
     AUTHORING-CONTRACT.md §3.2. It is required on every page, and this module
     is written to agree with whatever that bootstrap already applied.

   STORAGE
     localStorage['isc4221c.theme'] = 'light' | 'dark' | 'system'
     Every access is wrapped: localStorage throws in Safari private mode and
     on some file:// origins, and a theme control is not worth a broken page.
   ========================================================================== */

const STORAGE_KEY = 'isc4221c.theme';
const VALID = ['system', 'light', 'dark'];
const DEFAULT = 'system';

/** Same key the inline <head> bootstrap uses. Exported so a page can reuse it. */
const themeStorageKey = STORAGE_KEY;

/* --- storage, defensively ------------------------------------------------ */

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return VALID.includes(value) ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function writeStored(value) {
  try {
    if (value === DEFAULT) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    /* Private mode, disabled storage, or a file:// origin that refuses it.
       The choice still applies for this page load; it just will not persist. */
  }
}

/* --- applying ------------------------------------------------------------ */

/**
 * Apply a theme preference to the document.
 * @param {'system'|'light'|'dark'} value
 */
function applyTheme(value) {
  const theme = VALID.includes(value) ? value : DEFAULT;
  const root = document.documentElement;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }

  return theme;
}

/** The theme currently stored (not necessarily the one being rendered). */
function getTheme() {
  return readStored();
}

/** The theme actually being rendered right now, resolving "system". */
function getResolvedTheme() {
  const stored = readStored();
  if (stored !== 'system') return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Set and persist a theme preference.
 * @param {'system'|'light'|'dark'} value
 */
function setTheme(value) {
  const theme = applyTheme(value);
  writeStored(theme);
  syncControls(theme);
  announce(theme);
  return theme;
}

/* --- the control --------------------------------------------------------- */

function controls() {
  return Array.from(document.querySelectorAll('.theme-switch__input'));
}

function syncControls(theme) {
  controls().forEach((input) => {
    input.checked = input.value === theme;
  });
}

/* One polite live region, created once, reused. It exists in the DOM before
   any text is written into it — a live region created together with its
   content announces nothing (4.1.3 Status Messages). */
let liveRegion = null;

function ensureLiveRegion() {
  if (liveRegion && liveRegion.isConnected) return liveRegion;
  liveRegion = document.getElementById('theme-status');
  if (!liveRegion) {
    liveRegion = document.createElement('p');
    liveRegion.id = 'theme-status';
    liveRegion.className = 'visually-hidden';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

function announce(theme) {
  const region = ensureLiveRegion();
  const wording = {
    system: 'Colour theme set to follow the system setting.',
    light: 'Colour theme set to light.',
    dark: 'Colour theme set to dark.'
  };
  region.textContent = wording[theme] || '';
}

/* --- init ---------------------------------------------------------------- */

let initialised = false;

/**
 * Wire up every .theme-switch on the page. Safe to call more than once.
 * Called automatically on DOMContentLoaded; exported for pages that build
 * their header late.
 */
function initTheme() {
  const stored = readStored();
  applyTheme(stored);

  const inputs = controls();
  if (inputs.length === 0) return;

  // Reveal the control now that it does something.
  document.querySelectorAll('.theme-switch').forEach((group) => {
    group.hidden = false;
  });

  syncControls(stored);
  ensureLiveRegion();

  if (!initialised) {
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement &&
          target.classList.contains('theme-switch__input')) {
        setTheme(target.value);
      }
    });

    // Follow the OS while the preference is "system". Nothing is announced
    // here: the user did not do anything, and an unprompted announcement in
    // the middle of reading is hostile.
    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (readStored() === 'system') applyTheme('system');
      };
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onChange);
      } else if (typeof media.addListener === 'function') {
        media.addListener(onChange);   // Safari < 14
      }
    }

    // A choice made in another tab applies here too.
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStored();
      applyTheme(next);
      syncControls(next);
    });

    initialised = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme, { once: true });
} else {
  initTheme();
}

global.Theme = { themeStorageKey, applyTheme, getTheme, getResolvedTheme, setTheme, initTheme };
})(window);
