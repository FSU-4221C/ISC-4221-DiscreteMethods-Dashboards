/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   demo.js — the shared widget runtime for every interactive demo
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. A classic script publishing the
   global `Demo` — NOT an ES module, because Chrome and Firefox refuse a
   module script from a file:// address and the dashboard has to work when
   somebody opens the folder. No dependencies, no network access.

   ---------------------------------------------------------------------------
   WHY THIS FILE EXISTS

   The 2025 dashboards shipped 34 Plotly figures with zero text alternatives,
   54 controls with zero programmatic labels, and no focus indicator anywhere.
   Not because anybody decided against accessibility — because the accessible
   thing was extra work and the inaccessible thing was the default.

   So this runtime inverts the defaults. An author declares WHAT the demo
   computes; the runtime builds the labelled controls, the keyboard handling,
   the live summary, the data table and the play/pause/step machinery. And it
   refuses to render at all if the text equivalents are missing:

     table()      REQUIRED, always. No table, no demo.
     summary()    REQUIRED, always. No summary, no demo.
     figureAlt()  REQUIRED whenever figure() is declared.

   A missing one is not a warning in the console that nobody reads. It
   replaces the demo with a red panel that says which function is missing and
   which WCAG criterion it fails. You cannot ship past it without noticing.

   ---------------------------------------------------------------------------
   THE SPEC OBJECT

   createDemo(target, {
     id:            'dijkstra-trace',      // required, unique on the page
     title:         'Dijkstra step-through',
     description:   'Fix the nearest unfixed node, relax its neighbours…',
     headingLevel:  4,                     // default 4 (a topic uses h3)
     caption:       'optional static figcaption',

     controls: [ …see CONTROL TYPES… ],

     compute(values, stageState)  -> model          REQUIRED
     figure(model, ctx)           -> SVGElement     optional
     stage: { … }                 canvas + drag handles; see §6.4a of
                                  AUTHORING-CONTRACT.md. Mutually exclusive
                                  with figure().
     figureAlt(model, ctx)        -> string         REQUIRED if figure() or stage
     table(model, ctx)            -> table model    REQUIRED
     summary(model, ctx)          -> string|string[] REQUIRED

   LAYOUT. The toolbar and the controls share the right rail beside the
   figure; the readout, the table and the explanation are full width beneath
   it. There is NO figure/table view toggle — both are always rendered and
   always visible.

     steps: {                                       optional; enables playback
       count(model)               -> integer >= 1
       label(model, i)            -> string
     }
   })

   ctx = { step, stepCount, values, view, reducedMotion, playing, el }

   `compute` is called when a control changes. `figure`, `table`, `summary`
   are called on every render, including every step, and are handed the step
   index through ctx. Keep them pure.

   ---------------------------------------------------------------------------
   CONTROL TYPES  (every one of them requires `label`)

     { type:'range',    name, label, min, max, step, value, unit, help,
                        valueText(v) }        -> slider + paired number input
     { type:'number',   name, label, min, max, step, value, unit, help }
     { type:'select',   name, label, options:[{value,label}], value, help }
     { type:'checkbox', name, label, value:false, help }
     { type:'radio',    name, label, options:[{value,label}], value, help }
     { type:'seed',     name, label, value:42, help }   -> number + "New seed"
     { type:'button',   name, label, action(api), help }

   A range ALWAYS gets a paired number input. Sliders alone are miserable
   with a screen reader and impossible with a tremor, and the pair costs the
   author nothing because the runtime builds it.

   ---------------------------------------------------------------------------
   THE TABLE MODEL returned by table()

     {
       caption: 'Dijkstra working table after step 4',      // required
       columns: [ { label:'Node', unit:'', numeric:false },
                  { label:'Distance', unit:'km', numeric:true } ],
       rows:    [ { cells:['A', 0], current:true }, ['B', 40], … ],
       rowHeader: true      // first cell of each row becomes <th scope="row">
     }

   A row is either a bare array of cells or an object { cells, current }.
   `current:true` marks the row aria-current="step", bolds it, gives it an
   inline-start rail, AND inserts a visually-hidden "Current step." — four
   cues, none of them colour alone (1.4.1).

   ---------------------------------------------------------------------------
   MOTION

   Autoplay NEVER starts on its own. There is no option to make it. 2.2.2
   Pause, Stop, Hide is satisfied structurally rather than by convention.

   While playback is running the live region drops to aria-live="off" so a
   screen reader is not narrated at once per second; it returns to "polite"
   the moment playback stops, and the final state is announced once. That is
   the honest reading of 4.1.3: announce results, not every frame.

   prefers-reduced-motion is read at construction and re-read on change. When
   it is set, `ctx.reducedMotion` is true, `data-reduced-motion="true"` lands
   on the root so author CSS can branch, and the default playback interval is
   slowed. Playback stays available — the user asked for less motion, not for
   fewer features.
   ========================================================================== */

/* ==========================================================================
   0. Small DOM helpers, exported for demo authors
   ========================================================================== */

/* The SVG namespace. This is an XML namespace IDENTIFIER, not a URL — nothing
   is ever fetched from it, and `createElementNS` will not accept anything else.
   It is the only "http://" string anywhere in the dashboard; if an offline
   audit greps for external requests, this is the one expected hit. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an HTML element.
 * @param {string} tag
 * @param {object} [attrs] attributes; `class`, `text`, `html` are special-cased
 *                         (`html` is deliberately NOT supported — see below)
 * @param {Array<Node|string>} [children]
 */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

/**
 * Create an SVG element. Use this rather than innerHTML: a demo that builds
 * markup from a string has to escape every label it renders, and sooner or
 * later one of them contains an ampersand.
 */
function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

function applyAttrs(node, attrs) {
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'text') { node.textContent = String(value); return; }
    if (key === 'class' || key === 'className') { node.setAttribute('class', value); return; }
    if (key === 'dataset') {
      Object.entries(value).forEach(([k, v]) => { node.dataset[k] = v; });
      return;
    }
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
      return;
    }
    node.setAttribute(key, value === true ? '' : String(value));
  });
}

function appendAll(node, children) {
  const list = Array.isArray(children) ? children : [children];
  list.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
}

/**
 * Deterministic PRNG (mulberry32). Every demo that samples anything must use
 * a visible, editable seed so a result can be reproduced and discussed in
 * class — the 2025 apps reseeded from the clock and nobody could compare
 * anything with anybody.
 * @param {number} seed
 * @returns {() => number} uniform in [0, 1)
 */
function seededRandom(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed-decimal formatting that never shows "-0" and never shows "3.1400000004". */
function formatNumber(value, decimals = 3) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  const fixed = value.toFixed(decimals);
  return fixed === `-${(0).toFixed(decimals)}` ? (0).toFixed(decimals) : fixed;
}

/* ==========================================================================
   1. Validation — the part that makes the contract enforceable
   ========================================================================== */

const REQUIRED_MESSAGES = {
  compute:
    'compute(values) is missing. The runtime has nothing to render.',
  table:
    'table(model, ctx) is missing. Every demo needs a real data table — ' +
    'it is the non-visual equivalent of the figure (WCAG 1.1.1 Non-text Content). ' +
    'A figure with no table conveys nothing to a screen-reader user.',
  summary:
    'summary(model, ctx) is missing. Every demo needs a text summary that is ' +
    'updated in an aria-live region when the demo changes (WCAG 4.1.3 Status ' +
    'Messages, 1.1.1 Non-text Content).',
  figureAlt:
    'figure() is declared but figureAlt(model, ctx) is not. The runtime writes ' +
    'the alt onto the figure for you, but it cannot invent the words ' +
    '(WCAG 1.1.1 Non-text Content).'
};

function validateSpec(spec) {
  const problems = [];

  if (!spec || typeof spec !== 'object') {
    return ['createDemo() was called without a spec object.'];
  }
  if (!spec.id) problems.push('id is missing. It has to be unique on the page — every generated element id derives from it.');
  if (!spec.title) problems.push('title is missing.');
  if (typeof spec.compute !== 'function') problems.push(REQUIRED_MESSAGES.compute);
  if (typeof spec.table !== 'function') problems.push(REQUIRED_MESSAGES.table);
  if (typeof spec.summary !== 'function') problems.push(REQUIRED_MESSAGES.summary);
  if (typeof spec.figure === 'function' && typeof spec.figureAlt !== 'function') {
    problems.push(REQUIRED_MESSAGES.figureAlt);
  }
  if (spec.stage) {
    if (typeof spec.figureAlt !== 'function') problems.push(REQUIRED_MESSAGES.figureAlt);
    if (typeof spec.stage.draw !== 'function') {
      problems.push('stage.draw(g, model, ctx) is missing. A stage with nothing to draw is a blank canvas.');
    }
    if (typeof spec.figure === 'function') {
      problems.push(
        'This demo declares both figure() and stage. Pick one — two renderers ' +
        'writing to the same figure slot will fight over it.'
      );
    }
    if (spec.stage.handles &&
        !Array.isArray(spec.stage.handles) &&
        typeof spec.stage.handles !== 'function') {
      problems.push(
        'stage.handles must be an array of handle descriptors, or a function ' +
        'of the model returning one (for a figure whose point count the reader controls).'
      );
    }
    if (!spec.stage.grab) {
      problems.push(
        'stage.grab is missing. It is the three-word phrase naming the gesture ' +
        '("drag the points"), shown in the figure header and used as the ' +
        'canvas accessible name. Without it a reader has no way to discover ' +
        'that the picture can be touched at all — which is the single most ' +
        'common reason an interactive is never interacted with.'
      );
    }
  }

  (spec.controls || []).forEach((control, i) => {
    const where = `controls[${i}]`;
    if (!control || typeof control !== 'object') {
      problems.push(`${where} is not an object.`);
      return;
    }
    if (!control.name) problems.push(`${where} has no name.`);
    if (!control.label) {
      problems.push(
        `${where} ("${control.name || '?'}") has no label. Every control must be ` +
        'programmatically labelled (WCAG 1.3.1, 3.3.2, 4.1.2). A placeholder is not a label.'
      );
    }
    if ((control.type === 'select' || control.type === 'radio') &&
        (!Array.isArray(control.options) || control.options.length === 0)) {
      problems.push(`${where} ("${control.name}") is a ${control.type} with no options.`);
    }
    if (control.type === 'button' && typeof control.action !== 'function') {
      problems.push(`${where} ("${control.name}") is a button with no action().`);
    }
  });

  if (spec.steps) {
    if (typeof spec.steps.count !== 'function') {
      problems.push('steps.count(model) is missing.');
    }
    if (typeof spec.steps.label !== 'function') {
      problems.push(
        'steps.label(model, i) is missing. A step-through with no per-step text ' +
        'announces nothing — the whole point of the trace is the delta at each step.'
      );
    }
  }

  return problems;
}

function renderSpecError(mount, title, problems) {
  const box = el('div', { class: 'demo__error', role: 'alert' }, [
    el('p', {}, [
      el('strong', { text: 'This demo did not load.' }),
      ` ${title ? `“${title}”` : 'A demo'} is missing something the accessibility contract requires.`
    ]),
    el('ul', {}, problems.map((problem) => el('li', { text: problem }))),
    el('p', { text: 'See Dashboard/AUTHORING-CONTRACT.md §6.' })
  ]);
  mount.replaceChildren(box);
  console.error(`[demo.js] ${title || '(untitled demo)'}:\n - ` + problems.join('\n - '));
}

/* ==========================================================================
   2. Controls
   ========================================================================== */

function controlDefault(control) {
  if ('value' in control) return control.value;
  switch (control.type) {
    case 'checkbox': return false;
    case 'range':
    case 'number':   return Number(control.min) || 0;
    case 'seed':     return 1;
    case 'select':
    case 'radio':    return control.options[0].value;
    default:         return null;
  }
}

function coerce(control, raw) {
  switch (control.type) {
    case 'range':
    case 'number':
    case 'seed': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : controlDefault(control);
    }
    case 'checkbox':
      return Boolean(raw);
    default:
      return raw;
  }
}

function valueTextFor(control, value) {
  if (typeof control.valueText === 'function') return String(control.valueText(value));
  if (control.unit) return `${value} ${control.unit}`;
  return String(value);
}

/**
 * Build one control. Returns { node, read(), write(v), focusable }.
 */
function buildControl(demo, control) {
  const base = `${demo.spec.id}-${control.name}`;
  const helpId = control.help ? `${base}-help` : null;

  const wrapper = el('div', { class: 'control' });
  const help = control.help ? el('p', { class: 'control__help', id: helpId, text: control.help }) : null;

  const describedBy = helpId || null;

  switch (control.type) {

    /* --- range: slider + paired number input, one shared name ----------- */
    case 'range': {
      const rangeId = `${base}-range`;
      const numberId = `${base}-number`;

      const label = el('label', { class: 'control__label', for: rangeId, text: control.label });

      const range = el('input', {
        type: 'range',
        class: 'control__range',
        id: rangeId,
        min: control.min,
        max: control.max,
        step: control.step === undefined ? 1 : control.step,
        'aria-describedby': describedBy
      });

      // The number input carries the SAME visible words in its accessible
      // name (2.5.3 Label in Name) with a disambiguating suffix.
      const numberLabel = el('label', {
        class: 'visually-hidden',
        for: numberId,
        text: `${control.label} — exact value`
      });
      const number = el('input', {
        type: 'number',
        class: 'control__number',
        id: numberId,
        min: control.min,
        max: control.max,
        step: control.step === undefined ? 1 : control.step,
        'aria-describedby': describedBy
      });

      const row = el('div', { class: 'control__row' }, [range, numberLabel, number]);
      wrapper.append(label, row);
      if (help) wrapper.appendChild(help);

      const write = (value) => {
        range.value = String(value);
        number.value = String(value);
        // aria-valuetext gives the MEANINGFUL value: "8 colours", not "8".
        range.setAttribute('aria-valuetext', valueTextFor(control, value));
      };

      range.addEventListener('input', () => {
        number.value = range.value;
        range.setAttribute('aria-valuetext', valueTextFor(control, range.value));
        demo.onControlInput(control.name, coerce(control, range.value));
      });

      number.addEventListener('change', () => {
        const clamped = Math.min(Number(control.max), Math.max(Number(control.min), Number(number.value)));
        write(clamped);
        demo.onControlInput(control.name, coerce(control, clamped));
      });

      return { node: wrapper, write, read: () => coerce(control, range.value) };
    }

    /* --- number --------------------------------------------------------- */
    case 'number': {
      const id = `${base}-number`;
      const label = el('label', { class: 'control__label', for: id, text: control.label });
      const input = el('input', {
        type: 'number',
        id,
        min: control.min,
        max: control.max,
        step: control.step === undefined ? 1 : control.step,
        'aria-describedby': describedBy
      });
      wrapper.append(label, input);
      if (help) wrapper.appendChild(help);

      input.addEventListener('change', () => demo.onControlInput(control.name, coerce(control, input.value)));

      return { node: wrapper, write: (v) => { input.value = String(v); }, read: () => coerce(control, input.value) };
    }

    /* --- select --------------------------------------------------------- */
    case 'select': {
      const id = `${base}-select`;
      const label = el('label', { class: 'control__label', for: id, text: control.label });
      const select = el('select', { id, 'aria-describedby': describedBy },
        control.options.map((option) => el('option', { value: option.value, text: option.label })));
      wrapper.append(label, select);
      if (help) wrapper.appendChild(help);

      select.addEventListener('change', () => demo.onControlInput(control.name, select.value, true));

      return { node: wrapper, write: (v) => { select.value = String(v); }, read: () => select.value };
    }

    /* --- checkbox ------------------------------------------------------- */
    case 'checkbox': {
      const id = `${base}-checkbox`;
      const input = el('input', { type: 'checkbox', id, 'aria-describedby': describedBy });
      const label = el('label', { class: 'control__label', for: id, text: control.label });
      const row = el('div', { class: 'control__row' }, [input, label]);
      wrapper.append(row);
      if (help) wrapper.appendChild(help);

      input.addEventListener('change', () => demo.onControlInput(control.name, input.checked, true));

      return { node: wrapper, write: (v) => { input.checked = Boolean(v); }, read: () => input.checked };
    }

    /* --- radio group ---------------------------------------------------- */
    case 'radio': {
      const fieldset = el('fieldset', { class: 'control', 'aria-describedby': describedBy });
      const legend = el('legend', { class: 'control__label', text: control.label });
      fieldset.appendChild(legend);

      const inputs = [];
      control.options.forEach((option, i) => {
        const id = `${base}-radio-${i}`;
        const input = el('input', { type: 'radio', id, name: `${base}-radio`, value: option.value });
        const label = el('label', { for: id, text: option.label });
        fieldset.appendChild(el('div', { class: 'control__row' }, [input, label]));
        input.addEventListener('change', () => {
          if (input.checked) demo.onControlInput(control.name, input.value, true);
        });
        inputs.push(input);
      });

      if (help) fieldset.appendChild(help);

      return {
        node: fieldset,
        write: (v) => inputs.forEach((input) => { input.checked = input.value === String(v); }),
        read: () => (inputs.find((input) => input.checked) || inputs[0]).value
      };
    }

    /* --- seed: number + "New seed" -------------------------------------- */
    case 'seed': {
      const id = `${base}-seed`;
      const label = el('label', { class: 'control__label', for: id, text: control.label });
      const input = el('input', { type: 'number', class: 'control__number', id, min: 0, step: 1, 'aria-describedby': describedBy });
      const button = el('button', {
        type: 'button',
        class: 'btn btn--small btn--ghost',
        text: 'New seed'
      });
      const row = el('div', { class: 'control__row' }, [input, button]);
      wrapper.append(label, row);
      if (help) wrapper.appendChild(help);

      input.addEventListener('change', () => demo.onControlInput(control.name, coerce(control, input.value), true));
      button.addEventListener('click', () => {
        const next = Math.floor(Math.random() * 100000);
        input.value = String(next);
        demo.onControlInput(control.name, next, true);
      });

      return { node: wrapper, write: (v) => { input.value = String(v); }, read: () => coerce(control, input.value) };
    }

    /* --- action button --------------------------------------------------- */
    case 'button': {
      const button = el('button', {
        type: 'button',
        class: 'btn btn--small',
        text: control.label,
        'aria-describedby': describedBy
      });
      wrapper.appendChild(button);
      if (help) wrapper.appendChild(help);

      button.addEventListener('click', () => {
        control.action(demo.api);
        demo.recompute(true);
      });

      return { node: wrapper, write: () => {}, read: () => null };
    }

    default:
      return {
        node: el('p', { class: 'field-error', text: `Unknown control type "${control.type}".` }),
        write: () => {},
        read: () => null
      };
  }
}

/* ==========================================================================
   3. Table rendering
   ========================================================================== */

function normaliseRow(row) {
  if (Array.isArray(row)) return { cells: row, current: false };
  return { cells: row.cells || [], current: Boolean(row.current) };
}

function buildTable(model, demoId) {
  const columns = Array.isArray(model.columns) ? model.columns : [];
  const rows = Array.isArray(model.rows) ? model.rows.map(normaliseRow) : [];

  const table = el('table', { class: 'data-table', id: `${demoId}-table` });

  table.appendChild(el('caption', { text: model.caption || 'Data behind the figure' }));

  const headRow = el('tr');
  columns.forEach((column) => {
    const text = column.unit ? `${column.label} (${column.unit})` : column.label;
    headRow.appendChild(el('th', {
      scope: 'col',
      class: column.numeric ? 'is-numeric' : null,
      text
    }));
  });
  table.appendChild(el('thead', {}, [headRow]));

  const body = el('tbody');

  if (rows.length === 0) {
    body.appendChild(el('tr', {}, [
      el('td', {
        colspan: Math.max(1, columns.length),
        text: 'No rows for the current settings.'
      })
    ]));
  }

  rows.forEach((row) => {
    const tr = el('tr', row.current ? { 'aria-current': 'step' } : {});

    row.cells.forEach((cell, i) => {
      const column = columns[i] || {};
      const isRowHeader = model.rowHeader && i === 0;
      const tag = isRowHeader ? 'th' : 'td';
      const node = el(tag, {
        scope: isRowHeader ? 'row' : null,
        class: column.numeric ? 'is-numeric' : null
      });

      // Colour and weight are not enough on their own: the current row also
      // says so in words, for anybody reading the table linearly (1.4.1).
      if (row.current && i === 0) {
        node.appendChild(el('span', { class: 'visually-hidden', text: 'Current step. ' }));
      }
      node.appendChild(document.createTextNode(cell === null || cell === undefined ? '' : String(cell)));
      tr.appendChild(node);
    });

    body.appendChild(tr);
  });

  table.appendChild(body);
  return table;
}

function tableToCsv(model) {
  const columns = Array.isArray(model.columns) ? model.columns : [];
  const rows = Array.isArray(model.rows) ? model.rows.map(normaliseRow) : [];

  const quote = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [];
  lines.push(columns.map((c) => quote(c.unit ? `${c.label} (${c.unit})` : c.label)).join(','));
  rows.forEach((row) => lines.push(row.cells.map(quote).join(',')));
  return lines.join('\n');
}

/* ==========================================================================
   4. The Demo class
   ========================================================================== */

/** Deep copy of a plain-data state tree (numbers, strings, arrays, objects).
    structuredClone is not used: it throws on a function, and a spec author
    putting a helper on the state object should get a working demo and a
    console warning, not a dead panel. */
function cloneState(value) {
  if (value === null || value === undefined) return {};
  if (Array.isArray(value)) return value.map(cloneState);
  if (typeof value === 'object') {
    const out = {};
    for (const k in value) out[k] = cloneState(value[k]);
    return out;
  }
  return value;
}

const SPEEDS = [
  { value: '2000', label: 'Slow (1 step every 2 seconds)' },
  { value: '1000', label: 'Normal (1 step per second)' },
  { value: '500',  label: 'Fast (2 steps per second)' }
];

class Demo {
  constructor(mount, spec) {
    this.mount = mount;
    this.spec = spec;
    this.uid = spec.id;

    this.reducedMotionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false, addEventListener: null };
    this.reducedMotion = Boolean(this.reducedMotionQuery.matches);

    this.values = {};
    this.controlsByName = new Map();
    this.step = 0;
    this.stepCount = 1;
    this.playing = false;
    this.timer = null;
    /* Retained in ctx for spec compatibility: some figure() and summary()
       implementations branch on it. It is now a constant. */
    this.view = 'both';
    this.announceTimer = null;
    this.model = null;

    this.frame = 0;

    /* Persistent, handle-owned state. Deep-copied from the spec so two mounts
       of the same demo on one page cannot share (and corrupt) one object. */
    this.stageState = cloneState(spec.stage && spec.stage.state);

    // Arrow functions only. A getter named `values` on this object would read
    // `this.values` off the API object itself, not off the Demo — a bug that
    // looks like it works right up until it silently returns undefined.
    this.api = {
      getValues: () => ({ ...this.values }),
      getValue: (name) => this.values[name],
      setValue: (name, value) => this.setValue(name, value),
      getModel: () => this.model,
      getStep: () => this.step,
      recompute: () => this.recompute(true),
      goToStep: (i) => this.goToStep(i),
      next: () => this.goToStep(this.step + 1),
      previous: () => this.goToStep(this.step - 1),
      play: () => this.play(),
      pause: () => this.pause(),
      root: null
    };

    this.build();
  }

  /* --- construction ---------------------------------------------------- */

  build() {
    const spec = this.spec;
    const root = el('div', {
      class: 'demo',
      id: `${this.uid}`,
      dataset: { demo: spec.id, reducedMotion: String(this.reducedMotion) }
    });
    this.root = root;
    this.api.root = root;

    /* header */
    const level = Math.min(6, Math.max(2, Number(spec.headingLevel) || 4));
    const header = el('div', { class: 'demo__header' }, [
      el(`h${level}`, { class: 'demo__title', id: `${this.uid}-title`, text: spec.title }),
      spec.description ? el('p', { class: 'demo__desc', text: spec.description }) : null
    ]);
    root.appendChild(header);
    root.setAttribute('role', 'group');
    root.setAttribute('aria-labelledby', `${this.uid}-title`);

    /* controls */
    if (Array.isArray(spec.controls) && spec.controls.length > 0) {
      const fieldset = el('fieldset', { class: 'demo__controls' }, [
        el('legend', { class: 'demo__controls-legend', text: `${spec.title} — settings` })
      ]);
      spec.controls.forEach((control) => {
        const built = buildControl(this, control);
        this.controlsByName.set(control.name, { control, built });
        this.values[control.name] = controlDefault(control);
        built.write(this.values[control.name]);
        fieldset.appendChild(built.node);
      });
      root.appendChild(fieldset);
    } else {
      // The stage takes the whole width when there is no control rail. CSS
      // also expresses this with :has(), but not every engine we have to work
      // in supports it, and the failure mode there is a dead 17rem column
      // beside the figure.
      root.classList.add('demo--no-controls');
    }

    /* toolbar: view toggle + copy data + reset */
    root.appendChild(this.buildToolbar());

    /* stage */
    this.stage = el('div', { class: 'demo__stage' });

    if (typeof spec.figure === 'function' || spec.stage) {
      this.figureEl = el('figure', {
        class: 'demo__figure',
        id: `${this.uid}-figure`,
        tabindex: spec.steps ? '0' : null,
        role: spec.steps ? 'group' : null,
        'aria-labelledby': spec.steps ? `${this.uid}-title` : null,
        'aria-describedby': spec.steps ? `${this.uid}-keys` : null,
        'aria-keyshortcuts': spec.steps ? 'ArrowRight ArrowLeft Home End' : null
      });

      /* The gesture, named. A reader who is not told the picture can be
         dragged mostly will not find out. This is the `badge` from the
         explorable-explainer shell: three words, always present on a stage
         demo, and the runtime refuses to build one without it. */
      if (spec.stage) {
        this.figureEl.appendChild(el('p', { class: 'demo__grab' }, [
          el('span', { class: 'demo__grab-icon', 'aria-hidden': 'true', text: '✥' }),
          el('span', { text: spec.stage.grab })
        ]));
      }

      this.figureBody = el('div', { class: 'demo__figure-body' });
      this.figureEl.appendChild(this.figureBody);
      if (spec.caption) {
        this.figureEl.appendChild(el('figcaption', { class: 'demo__figcaption', text: spec.caption }));
      }
      this.stage.appendChild(this.figureEl);

      if (spec.steps) {
        this.figureEl.addEventListener('keydown', (event) => this.onFigureKey(event));
      }
      if (spec.stage) this.buildGfxStage();
    }

    root.appendChild(this.stage);

    /* --- LAW 1: everything below the stage is full width ------------------
       design-system.md §6.2. The stage and the control rail share a row; the
       explain region spans both columns underneath it.

       The live summary used to live INSIDE .demo__stage, which put a
       paragraph of prose in a 17rem column beside the figure. Three sentences
       made that column taller than the picture, grid stretched the row to
       match, and the figure ended up as a short band next to a wall of text.
       Moving it here is the structural half of Law 1; the CSS cap on the
       control rail is the other half. */
    this.explain = el('div', { class: 'demo__explain' });

    /* the live summary — always present, figure or not */
    this.summaryBody = el('div', {
      id: `${this.uid}-summary`,
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    });
    this.explain.appendChild(el('div', { class: 'demo__summary' }, [
      el('p', { class: 'demo__summary-title', text: 'What this shows' }),
      this.summaryBody
    ]));

    /* step controls */
    if (spec.steps) {
      this.explain.appendChild(this.buildSteps());
      this.explain.appendChild(el('p', {
        class: 'demo__keys',
        id: `${this.uid}-keys`,
        text: 'With the figure focused: Right arrow next step, Left arrow previous step, ' +
              'Home first step, End last step. The Play button is one Tab away.'
      }));
    }

    /* the data table — always present */
    this.dataWrap = el('div', { class: 'demo__data' }, [
      el('p', { class: 'demo__data-title', id: `${this.uid}-data-title`, text: 'The numbers behind this' }),
      el('div', {
        class: 'table-scroll',
        role: 'region',
        tabindex: '0',
        'aria-labelledby': `${this.uid}-data-title`,
        id: `${this.uid}-table-wrap`
      })
    ]);
    this.tableHost = this.dataWrap.querySelector('.table-scroll');
    this.explain.appendChild(this.dataWrap);

    root.appendChild(this.explain);

    this.warnLayout();
    this.watchRailHeight();

    // The mount becomes the size container for the panel. Whether the control
    // rail can sit beside the stage depends on how wide the PANEL is, not how
    // wide the window is: a module page has a sidebar, so a 1280px viewport
    // leaves the panel about 650px, and a viewport media query cannot see
    // that. See dashboard.css §9.
    this.mount.classList.add('demo-mount');
    this.mount.replaceChildren(root);

    /* reduced-motion changes at runtime (OS setting toggled mid-session) */
    const onMotionChange = () => {
      this.reducedMotion = Boolean(this.reducedMotionQuery.matches);
      root.dataset.reducedMotion = String(this.reducedMotion);
      if (this.reducedMotion && this.playing) this.pause();
    };
    if (typeof this.reducedMotionQuery.addEventListener === 'function') {
      this.reducedMotionQuery.addEventListener('change', onMotionChange);
    } else if (typeof this.reducedMotionQuery.addListener === 'function') {
      this.reducedMotionQuery.addListener(onMotionChange);
    }

    this.recompute(false);
  }

  /**
   * Cap the control rail at the actual height of the stage beside it.
   *
   * The CSS caps it at --dash-stage-max, which is the tallest a stage is
   * ALLOWED to be. That stops the catastrophic case — a nine-control rail
   * turning a 429px figure into a 739px row — but a demo whose figure is
   * genuinely short still gets a rail that overhangs it by a little. Only the
   * real height fixes that, and only layout knows the real height.
   *
   * No feedback loop: the stage's height comes from its figure and it is
   * `align-content: start`, so shrinking the rail cannot grow the stage. The
   * guard below is belt and braces anyway.
   */
  watchRailHeight() {
    const stage = this.stage;
    const rail = this.root.querySelector('.demo__controls');
    if (!stage || !rail || typeof ResizeObserver !== 'function') return;

    let applying = false;

    const apply = () => {
      if (applying) return;
      applying = true;

      // Side by side? Compare offset tops rather than reading the grid, which
      // is what the container query actually resolves to. Stacked means the
      // cap is wrong — there is no stage beside it to be taller than.
      const sideBySide = Math.abs(stage.offsetTop - rail.offsetTop) < 4;
      rail.style.maxBlockSize = sideBySide ? `${stage.offsetHeight}px` : '';

      // Release the guard on the next frame, so the observer callback this
      // triggers is ignored but genuine later resizes are not.
      window.requestAnimationFrame(() => { applying = false; });
    };

    const observer = new ResizeObserver(apply);
    observer.observe(stage);
    observer.observe(rail);
    apply();
  }

  /**
   * Warn — never throw — when a demo breaks a Law 1 constraint.
   *
   * These are the limits in design-system.md §6.2. Every one of them is
   * invisible while you build a single widget and obvious once a page has
   * six. A console warning is the right severity: an author mid-edit should
   * get a note, not a blank panel where their demo was.
   */
  warnLayout() {
    const spec = this.spec;
    const name = spec.title || spec.id || '(untitled demo)';

    const controls = Array.isArray(spec.controls) ? spec.controls.length : 0;
    if (controls > 7) {
      console.warn(
        `[demo.js] ${name}: ${controls} controls in the rail (limit 7). ` +
        'design-system.md §6.2 — more than seven means the demo is doing two ' +
        'things. Split it, or put the second set behind a mode toggle.'
      );
    }

    if (spec.description && spec.description.length > 160) {
      console.warn(
        `[demo.js] ${name}: the description is ${spec.description.length} ` +
        'characters. It sits in the header above the stage; anything longer ' +
        'than a line belongs in the explain region below it (Law 1).'
      );
    }

    this.controlsByName.forEach(({ control }) => {
      if (control.help && control.help.length > 90) {
        console.warn(
          `[demo.js] ${name} / ${control.name}: control help is ` +
          `${control.help.length} characters. Help in the rail is a hint ` +
          'bound to one control, not an explanation — move it below the stage.'
        );
      }
    });
  }

  /* Two buttons. That is the whole toolbar.

     There used to be a third control here: a figure / table / both radio
     group. It is gone, deliberately and permanently. It offered a choice
     nobody was asking for in every one of eighty panels, and its "figure
     only" state moved the data table off-screen for sighted readers while
     keeping it for screen readers — which meant the page said different
     things depending on who was reading it. Both representations are now
     always rendered and always visible. Do not add it back. */
  buildToolbar() {
    const bar = el('div', { class: 'demo__toolbar' });

    const copy = el('button', { type: 'button', class: 'btn btn--small btn--ghost', text: 'Copy data as CSV' });
    copy.addEventListener('click', () => this.copyCsv());
    bar.appendChild(copy);

    /* Reset restores the controls AND the dragged positions. A stage demo
       needs it even with no controls declared, because the reader can always
       have pulled a point somewhere they cannot find their way back from. */
    if ((this.spec.controls && this.spec.controls.length > 0) || this.spec.stage) {
      const reset = el('button', { type: 'button', class: 'btn btn--small btn--ghost', text: 'Reset settings' });
      reset.addEventListener('click', () => this.reset());
      bar.appendChild(reset);
    }

    this.toolbarStatus = el('p', {
      class: 'visually-hidden',
      role: 'status',
      'aria-live': 'polite',
      id: `${this.uid}-toolbar-status`
    });
    bar.appendChild(this.toolbarStatus);

    return bar;
  }

  buildSteps() {
    const bar = el('div', { class: 'demo__steps', role: 'group', 'aria-label': `${this.spec.title} — playback` });

    this.stepCountEl = el('p', { class: 'demo__step-count', id: `${this.uid}-stepcount`, text: 'Step 1 of 1' });
    bar.appendChild(this.stepCountEl);

    const make = (label, handler) => {
      const button = el('button', { type: 'button', class: 'btn btn--small', text: label });
      button.addEventListener('click', handler);
      return button;
    };

    this.firstBtn = make('First', () => { this.pause(); this.goToStep(0); });
    this.prevBtn  = make('Previous', () => { this.pause(); this.goToStep(this.step - 1); });

    // One button, two states. The visible label AND aria-pressed both change,
    // so the state is never carried by styling alone (4.1.2, 1.4.1).
    this.playBtn = el('button', {
      type: 'button',
      class: 'btn btn--small btn--primary',
      text: 'Play',
      'aria-pressed': 'false'
    });
    this.playBtn.addEventListener('click', () => (this.playing ? this.pause() : this.play()));

    this.nextBtn = make('Next', () => { this.pause(); this.goToStep(this.step + 1); });
    this.lastBtn = make('Last', () => { this.pause(); this.goToStep(this.stepCount - 1); });

    bar.append(
      el('div', { class: 'btn-group' }, [this.firstBtn, this.prevBtn, this.playBtn, this.nextBtn, this.lastBtn])
    );

    const speedId = `${this.uid}-speed`;
    this.speedSelect = el('select', { id: speedId },
      SPEEDS.map((s) => el('option', { value: s.value, text: s.label })));
    this.speedSelect.value = '1000';
    this.speedSelect.addEventListener('change', () => {
      if (this.playing) { this.pause(); this.play(); }
    });

    bar.appendChild(el('div', { class: 'demo__step-speed' }, [
      el('label', { for: speedId, text: 'Speed' }),
      this.speedSelect
    ]));

    this.progressFill = el('div', { class: 'demo__progress-fill' });
    bar.appendChild(el('div', { class: 'demo__progress', 'aria-hidden': 'true' }, [this.progressFill]));

    return bar;
  }

  /* --- state ------------------------------------------------------------ */

  get ctx() {
    return {
      step: this.step,
      stepCount: this.stepCount,
      values: { ...this.values },
      view: this.view,
      reducedMotion: this.reducedMotion,
      playing: this.playing,
      el: this.root
    };
  }

  onControlInput(name, value, immediate = false) {
    this.values[name] = value;
    if (this.playing) this.pause();
    if (immediate) {
      this.recompute(true);
    } else {
      // Coalesce a slider drag into roughly one repaint per frame, but leave
      // the announcement to the settle timer inside renderSummary().
      //
      // setTimeout, not requestAnimationFrame: rAF does not run in a page that
      // is not compositing (background tab, hidden pane, headless run), and a
      // control change that never recomputes is a demo showing stale numbers
      // with no indication that it is stale.
      window.clearTimeout(this.frame);
      this.frame = window.setTimeout(() => this.recompute(true), 16);
    }
  }

  setValue(name, value) {
    const entry = this.controlsByName.get(name);
    this.values[name] = value;
    if (entry) entry.built.write(value);
    this.recompute(true);
  }

  reset() {
    (this.spec.controls || []).forEach((control) => {
      const value = controlDefault(control);
      this.values[control.name] = value;
      const entry = this.controlsByName.get(control.name);
      if (entry) entry.built.write(value);
    });
    /* Reset has to put the dragged points back too, or a reader who has
       pulled the figure into a corner has no way home. */
    this.stageState = cloneState(this.spec.stage && this.spec.stage.state);
    this.pause();
    this.step = 0;
    this.recompute(true);
    this.toolbarStatus.textContent = this.spec.stage
      ? 'Settings and positions reset to their defaults.'
      : 'Settings reset to their defaults.';
  }


  /* --- render ----------------------------------------------------------- */

  recompute(announce) {
    try {
      /* `stageState` is the second argument, and it is the reason dragging
         works at all. `values` come from the controls and are rebuilt on
         every recompute; anything a drag handle writes has to survive that,
         so it lives in a separate object the runtime owns and never
         replaces. A handle writes stageState, compute() reads it, and the
         model is derived from both — one source of truth, whether the reader
         moved a slider or moved a point. */
      this.model = this.spec.compute({ ...this.values }, this.stageState);
    } catch (error) {
      renderSpecError(this.mount, this.spec.title, [`compute() threw: ${error.message}`]);
      return;
    }

    this.stepCount = this.spec.steps
      ? Math.max(1, Math.floor(this.spec.steps.count(this.model)) || 1)
      : 1;

    if (this.step >= this.stepCount) this.step = this.stepCount - 1;
    if (this.step < 0) this.step = 0;

    this.render(announce);
  }

  render(announce) {
    this.renderFigure();
    this.renderTable();
    this.renderSteps();
    this.renderSummary(announce);
  }

  /* --- the canvas stage ------------------------------------------------
     A figure you can only look at is a claim; a figure you can drag is a
     check. `spec.figure` returns fresh SVG on every render, which is fine
     for a picture but cannot express "grab this thing and move it" — the
     node the reader is holding is destroyed on the next recompute.

     So a stage demo builds its canvas ONCE and keeps it. Recomputes call
     `invalidate()`; the canvas element itself never moves. Handles read and
     write the widget's own state through get/set, so dragging and the
     controls drive the same model and cannot disagree.
     --------------------------------------------------------------------- */

  buildGfxStage() {
    const cfg = this.spec.stage;

    if (typeof window.Gfx === 'undefined') {
      this.figureBody.replaceChildren(el('p', {
        class: 'field-error',
        text: 'This interactive needs assets/js/core/gfx.js, which did not load.'
      }));
      return;
    }

    const host = el('div', { class: 'demo__canvas' });
    this.figureBody.appendChild(host);

    this.gfx = new window.Gfx.Stage(host, {
      aspect: cfg.aspect != null ? cfg.aspect : 0.58,
      world: cfg.world,
      yUp: cfg.yUp !== false,
      bg: cfg.bg || 'ink900'
    });

    const canvas = this.gfx.canvas;
    canvas.className = 'demo__canvas-el';
    /* One tab stop for the whole figure, not one per handle — see the
       keyboard note in gfx.js. The accessible name carries the gesture so a
       screen-reader user learns the picture is operable at the moment they
       land on it, and `figureAlt` keeps it current as the state changes.
       syncHandles() sets the tab stop, because whether there is anything to
       operate can depend on the model. */

    this.syncHandles();

    /* Dragging changes state that `compute()` owns, so a drag has to go back
       through the same recompute path a slider uses. Announcements are
       suppressed mid-drag: an aria-live region updated on every pointermove
       produces a torrent nobody can follow (4.1.3). The pointerup below
       announces the settled value once. */
    this.gfx.onChange = () => this.recompute(false);
    canvas.addEventListener('pointerup', () => this.render(true));
    canvas.addEventListener('keyup', () => this.render(true));

    this.gfx.onDraw((ctx, stage) => {
      if (!this.model) return;
      try {
        cfg.draw(stage, this.model, this.ctx);
      } catch (error) {
        stage.hud(10, 10, `draw failed: ${error.message}`, { color: window.Gfx.C.warn });
      }
    });
  }

  /** Install the handle set on the stage.

      `stage.handles` may be an array — a fixed cast of named points — or a
      function of the model, for a figure whose point COUNT is itself under
      the reader's control (a hull over n points, a graph over n nodes). The
      function form is re-evaluated on every recompute, so adding a point
      adds a handle without the widget having to know how many there will be.

      Cheap to redo: a handle is four closures and no DOM. */
  syncHandles() {
    const cfg = this.spec.stage;
    /* build() runs before the first recompute, so on the way up there is no
       model yet. A static handle list does not need one; a derived list does,
       and renderFigure() will call back here as soon as there is one. */
    if (typeof cfg.handles === 'function' && !this.model) return;
    const list = typeof cfg.handles === 'function'
      ? (cfg.handles(this.model, this.ctx) || [])
      : (cfg.handles || []);

    /* Preserve which handle the keyboard had selected across a rebuild,
       matched by label — otherwise every recompute silently drops the
       reader's selection back to the first point. */
    const selectedLabel = this.gfx._kbHandle ? this.gfx._kbHandle.label : null;
    this.gfx.clearHandles();

    list.forEach((h) => {
      const installed = this.gfx.addHandle({
        get: () => h.get(this.model, this.ctx),
        set: (x, y) => { h.set(x, y, this.model, this.ctx); },
        constrain: h.constrain,
        hidden: h.hidden ? () => h.hidden(this.model, this.ctx) : null,
        /* A handle colour is a token KEY ('ok', 'info'), never a literal.
           Resolving it here means a spec author cannot smuggle a hex value
           into a figure, which is the one thing that makes seventy figures
           stop looking like one system. */
        color: window.Gfx.C[h.color] || window.Gfx.C.accent,
        label: h.label,
        labelAlign: h.labelAlign,
        r: h.r
      });
      if (selectedLabel !== null && h.label === selectedLabel) {
        this.gfx._kbHandle = installed;
      }
    });

    if (list.length) {
      this.gfx.canvas.tabIndex = 0;
      this.gfx.canvas.setAttribute('aria-keyshortcuts',
        'ArrowUp ArrowDown ArrowLeft ArrowRight Enter');
      this.gfx.onAnnounce = (msg) => this.announceNow(msg);
    }
  }

  /** Push a message straight into the live region, bypassing the debounce.
      Used for keyboard selection ("point B selected"), which has to be heard
      immediately and is not something `summary()` could know about. The next
      recompute writes the summary back over it, which is correct. */
  announceNow(message) {
    if (!this.summaryBody) return;
    window.clearTimeout(this.announceTimer);
    this.summaryBody.replaceChildren(el('p', { text: message }));
  }

  renderFigure() {
    if (!this.figureEl) return;

    /* A stage repaints; it is not rebuilt. */
    if (this.gfx) {
      if (typeof this.spec.stage.handles === 'function') this.syncHandles();
      const alt = String(this.spec.figureAlt(this.model, this.ctx) || '').trim();
      if (alt !== '') {
        this.gfx.canvas.setAttribute('role', 'img');
        this.gfx.canvas.setAttribute('aria-label',
          `${alt} ${this.spec.stage.grab}. Arrow keys move the selected point, Enter selects the next one.`);
        this.lastAlt = alt;
      }
      this.gfx.invalidate();
      return;
    }

    let node;
    try {
      node = this.spec.figure(this.model, this.ctx);
    } catch (error) {
      this.figureBody.replaceChildren(
        el('p', { class: 'field-error', text: `The figure could not be drawn: ${error.message}` })
      );
      return;
    }

    if (typeof node === 'string') {
      this.figureBody.replaceChildren(el('p', {
        class: 'field-error',
        text: 'figure() returned a string. Return a real element built with svgEl() — ' +
              'markup strings have to be escaped by hand and eventually are not.'
      }));
      return;
    }

    if (!node) {
      this.figureBody.replaceChildren();
      return;
    }

    const alt = String(this.spec.figureAlt(this.model, this.ctx) || '').trim();

    if (alt === '') {
      // An empty alt on an informative figure is the defect this whole
      // project exists to fix. Say so, visibly.
      this.figureBody.replaceChildren(el('p', {
        class: 'field-error',
        text: 'figureAlt() returned an empty string. An informative figure needs a description (WCAG 1.1.1).'
      }));
      return;
    }

    // The runtime writes the alt onto the figure. The author cannot forget it,
    // because figureAlt is validated at construction and again here.
    if (node instanceof SVGElement) {
      const titleId = `${this.uid}-fig-title`;
      const existing = node.querySelector('title[data-demo-alt]');
      if (existing) existing.remove();
      const title = svgEl('title', { id: titleId, 'data-demo-alt': '', text: alt });
      node.insertBefore(title, node.firstChild);
      node.setAttribute('role', 'img');
      node.setAttribute('aria-labelledby', titleId);
      node.setAttribute('focusable', 'false');
    } else {
      node.setAttribute('role', 'img');
      node.setAttribute('aria-label', alt);
    }

    this.lastAlt = alt;
    this.figureBody.replaceChildren(node);

    /* A re-render replaces the node, so the viewBox-relative size ceiling has
       to be re-applied. See initFigureScale() in nav.js for why a CSS width
       cap is not sufficient on its own. */
    if (window.Nav && window.Nav.capFigure) window.Nav.capFigure(node);
  }

  renderTable() {
    let model;
    try {
      model = this.spec.table(this.model, this.ctx);
    } catch (error) {
      this.tableHost.replaceChildren(
        el('p', { class: 'field-error', text: `The data table could not be built: ${error.message}` })
      );
      return;
    }

    if (!model || !Array.isArray(model.columns)) {
      this.tableHost.replaceChildren(el('p', {
        class: 'field-error',
        text: 'table() must return { caption, columns, rows }. Without columns there is no header row, ' +
              'and a table with no header row is unreadable with a screen reader (WCAG 1.3.1).'
      }));
      return;
    }

    this.lastTableModel = model;
    this.tableHost.replaceChildren(buildTable(model, this.uid));
  }

  renderSteps() {
    if (!this.spec.steps) return;

    const human = `Step ${this.step + 1} of ${this.stepCount}`;
    this.stepCountEl.textContent = human;

    const atFirst = this.step === 0;
    const atLast = this.step === this.stepCount - 1;

    // Disabled rather than removed: a control that vanishes changes the tab
    // order under the user's fingers.
    this.firstBtn.disabled = atFirst;
    this.prevBtn.disabled = atFirst;
    this.nextBtn.disabled = atLast;
    this.lastBtn.disabled = atLast;
    this.playBtn.disabled = this.stepCount < 2;

    const pct = this.stepCount < 2 ? 100 : (this.step / (this.stepCount - 1)) * 100;
    this.progressFill.style.width = `${pct}%`;
  }

  renderSummary(announce) {
    const lines = [];

    // When the figure is hidden, its alt comes with us — otherwise choosing
    // "Table" would silently drop a description.
    if (this.view === 'table' && this.lastAlt) lines.push(this.lastAlt);

    if (this.spec.steps) {
      let label = '';
      try {
        label = String(this.spec.steps.label(this.model, this.step) || '');
      } catch (error) {
        label = `Step ${this.step + 1} could not be described: ${error.message}`;
      }
      lines.push(`Step ${this.step + 1} of ${this.stepCount}. ${label}`);
    }

    let summary;
    try {
      summary = this.spec.summary(this.model, this.ctx);
    } catch (error) {
      summary = `The summary could not be produced: ${error.message}`;
    }

    if (Array.isArray(summary)) lines.push(...summary.map(String));
    else if (summary) lines.push(String(summary));

    if (lines.length === 0) {
      lines.push('This demo produced no summary text. That is a defect — report it.');
    }

    const paint = () => {
      this.summaryBody.replaceChildren(...lines.map((line) => el('p', { text: line })));
    };

    window.clearTimeout(this.announceTimer);

    if (announce === false || this.playing) {
      // Playback and first paint: write it without letting the live region
      // fire on every frame (see the MOTION note at the top of this file).
      paint();
    } else {
      // Settle for a moment so a slider drag produces one announcement, not
      // one per pixel.
      this.announceTimer = window.setTimeout(paint, 250);
    }
  }

  /* --- playback --------------------------------------------------------- */

  goToStep(index) {
    if (!this.spec.steps) return;
    const next = Math.min(this.stepCount - 1, Math.max(0, index));
    if (next === this.step) return;
    this.step = next;
    this.render(true);
  }

  play() {
    if (!this.spec.steps || this.playing || this.stepCount < 2) return;

    this.playing = true;
    this.playBtn.textContent = 'Pause';
    this.playBtn.setAttribute('aria-pressed', 'true');

    // Silence the live region for the duration. It is restored, and the final
    // state announced once, in pause().
    this.summaryBody.setAttribute('aria-live', 'off');

    const chosen = Number(this.speedSelect.value) || 1000;
    const interval = this.reducedMotion ? Math.max(chosen, 2000) : chosen;

    this.timer = window.setInterval(() => {
      if (this.step >= this.stepCount - 1) {
        this.pause();
        return;
      }
      this.step += 1;
      this.render(false);
    }, interval);
  }

  pause() {
    if (!this.spec.steps) return;
    window.clearInterval(this.timer);
    this.timer = null;

    if (!this.playing) return;
    this.playing = false;
    this.playBtn.textContent = 'Play';
    this.playBtn.setAttribute('aria-pressed', 'false');

    this.summaryBody.setAttribute('aria-live', 'polite');
    // Announce where playback stopped — once.
    this.renderSummary(true);
  }

  onFigureKey(event) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault(); this.pause(); this.goToStep(this.step + 1); break;
      case 'ArrowLeft':
        event.preventDefault(); this.pause(); this.goToStep(this.step - 1); break;
      case 'Home':
        event.preventDefault(); this.pause(); this.goToStep(0); break;
      case 'End':
        event.preventDefault(); this.pause(); this.goToStep(this.stepCount - 1); break;
      default:
        // Everything else, including Tab, is left alone. No keyboard trap.
        break;
    }
  }

  /* --- CSV -------------------------------------------------------------- */

  copyCsv() {
    if (!this.lastTableModel) return;
    const csv = tableToCsv(this.lastTableModel);

    const done = (ok) => {
      this.toolbarStatus.textContent = ok
        ? `Copied ${this.lastTableModel.rows.length} rows to the clipboard as CSV.`
        : 'Could not copy automatically. The table is on the page — select it and copy.';
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csv).then(() => done(true), () => this.copyCsvFallback(csv, done));
    } else {
      this.copyCsvFallback(csv, done);
    }
  }

  copyCsvFallback(csv, done) {
    // execCommand is deprecated but is the only thing that works on a
    // file:// origin in several browsers, which is exactly how a student
    // opens this dashboard from a USB stick.
    const area = el('textarea', { 'aria-hidden': 'true', tabindex: '-1', class: 'visually-hidden' });
    area.value = csv;
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    done(ok);
  }
}

/* ==========================================================================
   5. Public entry point
   ========================================================================== */

/**
 * Build an accessible demo inside `target`.
 *
 * @param {string|Element} target CSS selector or element to mount into
 * @param {object} spec see the header of this file
 * @returns {object|null} the demo API, or null if the spec was rejected
 */
function createDemo(target, spec) {
  const mount = typeof target === 'string' ? document.querySelector(target) : target;

  if (!mount) {
    console.error(`[demo.js] Mount point not found: ${target}`);
    return null;
  }

  const problems = validateSpec(spec);
  if (problems.length > 0) {
    renderSpecError(mount, spec && spec.title, problems);
    return null;
  }

  if (document.getElementById(spec.id)) {
    renderSpecError(mount, spec.title, [
      `id "${spec.id}" is already used on this page. Every generated element id ` +
      'derives from it, so duplicates break every label and describedby binding.'
    ]);
    return null;
  }

  const demo = new Demo(mount, spec);
  return demo.api;
}

global.Demo = { el, svgEl, seededRandom, formatNumber, createDemo };
})(window);
