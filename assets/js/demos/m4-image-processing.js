/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m4-image-processing.js — the interactive demos for M4, Image Processing
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Plain ES module, no dependencies,
   no network access, no build step. Imports only from ../demo.js.

   TEN DEMOS, in page order:
     demo-pgm-feep             4.2.3  PGM file reader
     demo-run-length           4.2.4  Run-length encoder
     demo-histogram-stretch    4.3.3  Histogram and contrast stretch
     demo-kmeans-quantize      4.3.5  K-means quantization step-through
     demo-convolution-window   4.4.1  Convolution window step-through
     demo-gaussian-kernel      4.4.10 Gaussian kernel builder
     demo-noise-filters        4.4.7  Noise and filter laboratory
     demo-edge-detect          4.5.3  Edge detector
     demo-components-two-pass  4.6.3  Two-pass labelling step-through
     demo-morphology           4.6.11 Morphology explorer

   WHERE THE DATA COMES FROM

   No trace files are loaded. Everything below is either a literal from the
   course sources (the FEEP array, the final-exam matrices) or is computed
   here from a fixed formula, so the page has nothing to fetch and every
   number is reproducible from this file alone. The one demo that samples
   randomly (demo-noise-filters) exposes its seed as a control and uses the
   seeded PRNG from demo.js, never Math.random().

   COLOUR

   Every fill and stroke below is a var(--fsu-*) token. There is no hex
   literal anywhere in this file, and no meaning is carried by colour alone:
   every grid cell prints its own value as real <text>, the current cell also
   gets a thick outline and a corner wedge, and the live summary says in words
   what changed.

   SVG SIZES

   Numbers like `font-size: 12` inside an <svg> are viewBox user units, i.e.
   geometry that scales with the figure. They are not CSS type sizes and are
   not a substitute for the type tokens, which govern the page text.
   ========================================================================== */

const { createDemo, svgEl, formatNumber, seededRandom } = window.Demo;
/* ==========================================================================
   1. Course data
   ========================================================================== */

/** The FEEP image, P1 frame 16: 7 rows x 24 columns, values 0 to MAXINT = 15. */
const FEEP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 3, 3, 3, 0, 0, 7, 7, 7, 7, 0, 0, 11, 11, 11, 11, 0, 0, 15, 15, 15, 15, 0],
  [0, 3, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 15, 0, 0, 15, 0],
  [0, 3, 3, 3, 0, 0, 0, 7, 7, 7, 0, 0, 0, 11, 11, 11, 0, 0, 0, 15, 15, 15, 15, 0],
  [0, 3, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0],
  [0, 3, 0, 0, 0, 0, 0, 7, 7, 7, 7, 0, 0, 11, 11, 11, 11, 0, 0, 15, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

/** Final exam Q4: a 4 x 5 unsigned 4-bit image with salt-and-pepper damage. */
const EXAM_GRAY = [
  [3, 4, 3, 5, 4],
  [2, 0, 4, 15, 3],
  [3, 3, 14, 2, 4],
  [4, 5, 2, 4, 5]
];

/** Final exam Q4: the 4 x 5 binary image used for dilation and erosion. */
const EXAM_BIN = [
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0]
];

/**
 * A 12 x 12 synthetic grayscale test image, built from a fixed formula so the
 * page needs no data file and every printed number is reproducible.
 *
 *   value = 18 + round(34x/11) + round(20y/11)
 *           + 14 inside the rectangle x in [3,6], y in [4,8]
 *           + 22 inside the disc of radius 2.2 about (8.5, 3.5)
 *
 * The result runs from 18 to 80 — dark and low in contrast, which is what
 * makes it a fair stand-in for the lecture's `snap.pgm`.
 */
const TEST_W = 12;
const TEST_H = 12;

function buildTestImage() {
  const img = [];
  for (let y = 0; y < TEST_H; y += 1) {
    const row = [];
    for (let x = 0; x < TEST_W; x += 1) {
      let v = 18 + Math.round((34 * x) / 11) + Math.round((20 * y) / 11);
      if (x >= 3 && x <= 6 && y >= 4 && y <= 8) v += 14;
      const dx = x - 8.5;
      const dy = y - 3.5;
      if (dx * dx + dy * dy < 2.2 * 2.2) v += 22;
      row.push(v);
    }
    img.push(row);
  }
  return img;
}

const TEST_IMAGE = buildTestImage();

/** The 3 x 3 kernels of topic 4.4.11, plus the two Sobel operators of 4.5.3. */
const KERNELS = {
  identity:  { label: 'Identity (copies the image)',      k: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], sum: 1 },
  box:       { label: 'Box blur, every weight 1/9',       k: null, sum: 1 },
  gaussian:  { label: 'Gaussian blur, sigma = 1',         k: null, sum: 1 },
  sharpen:   { label: 'Sharpen',                          k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], sum: 1 },
  laplacian: { label: 'Laplacian (second derivative)',    k: [[0, -1, 0], [-1, 4, -1], [0, -1, 0]], sum: 0 },
  emboss:    { label: 'Emboss',                           k: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], sum: 1 },
  sobelx:    { label: 'Sobel X (vertical edges)',         k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], sum: 0 },
  sobely:    { label: 'Sobel Y (horizontal edges)',       k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], sum: 0 }
};

const PREWITT_X = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
const PREWITT_Y = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];

/** Binary patterns for the connected-components demo. */
const COMPONENT_PATTERNS = {
  comb: {
    label: 'Comb and blocks (default)',
    grid: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0, 1, 0, 0],
      [0, 1, 0, 1, 0, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  },
  stair: {
    label: 'Diagonal staircases (4 against 8 connectivity)',
    grid: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0, 1, 0],
      [0, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 0]
    ]
  },
  ring: {
    label: 'Ring with a separate core',
    grid: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 0, 1, 0],
      [0, 1, 0, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  }
};

/** Binary patterns for the morphology demo. */
function blockWithSpecks() {
  const g = Array.from({ length: 9 }, () => new Array(9).fill(0));
  for (let i = 1; i <= 5; i += 1) for (let j = 1; j <= 5; j += 1) g[i][j] = 1;
  g[0][8] = 1; g[7][0] = 1; g[7][4] = 1; g[8][8] = 1;
  return g;
}

function blockWithHole() {
  const g = Array.from({ length: 9 }, () => new Array(9).fill(0));
  for (let i = 1; i <= 7; i += 1) for (let j = 1; j <= 7; j += 1) g[i][j] = 1;
  g[4][4] = 0;
  return g;
}

const MORPH_PATTERNS = {
  exam:   { label: 'Final-exam 4 by 5 T-shape (default)', grid: EXAM_BIN },
  specks: { label: 'Block with four isolated specks, 9 by 9', grid: blockWithSpecks() },
  hole:   { label: 'Block with a one-pixel hole, 9 by 9', grid: blockWithHole() }
};

const STRUCTURING_ELEMENTS = {
  cross:  { label: 'Cross, 3 by 3 (the exam’s)', offsets: [[-1, 0], [0, -1], [0, 0], [0, 1], [1, 0]] },
  square: { label: 'Square, 3 by 3', offsets: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]] }
};

/* ==========================================================================
   2. Pure numerical helpers
   ========================================================================== */

function cloneGrid(g) { return g.map((r) => r.slice()); }

function flatten(g) { return g.reduce((acc, r) => acc.concat(r), []); }

function gridMin(g) { return Math.min(...flatten(g)); }
function gridMax(g) { return Math.max(...flatten(g)); }

function gridMean(g) {
  const f = flatten(g);
  return f.reduce((a, b) => a + b, 0) / f.length;
}

function gridStd(g) {
  const f = flatten(g);
  const m = f.reduce((a, b) => a + b, 0) / f.length;
  return Math.sqrt(f.reduce((a, b) => a + (b - m) * (b - m), 0) / f.length);
}

function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

/** Gaussian kernel of size n and standard deviation sigma, normalised to sum 1. */
function gaussianKernel(n, sigma) {
  const c = (n - 1) / 2;
  const raw = [];
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const row = [];
    for (let j = 0; j < n; j += 1) {
      const w = Math.exp(-(((i - c) * (i - c) + (j - c) * (j - c)) / (2 * sigma * sigma)));
      row.push(w);
      total += w;
    }
    raw.push(row);
  }
  return { kernel: raw.map((r) => r.map((w) => w / total)), rawTotal: total };
}

function boxKernel(n) {
  const w = 1 / (n * n);
  return Array.from({ length: n }, () => new Array(n).fill(w));
}

/** Convolve one pixel. Returns { value, terms:[{dr,dc,pixel,weight,product}] }. */
function convolveAt(img, r, c, kernel) {
  const n = kernel.length;
  const half = (n - 1) / 2;
  const terms = [];
  let sum = 0;
  for (let a = -half; a <= half; a += 1) {
    for (let b = -half; b <= half; b += 1) {
      const pixel = img[r + a][c + b];
      const weight = kernel[a + half][b + half];
      const product = pixel * weight;
      sum += product;
      terms.push({ dr: a, dc: b, pixel, weight, product });
    }
  }
  return { value: sum, terms };
}

/** Convolve the whole interior; the border is copied through unchanged. */
function convolveGrid(img, kernel) {
  const half = (kernel.length - 1) / 2;
  const out = cloneGrid(img);
  for (let r = half; r < img.length - half; r += 1) {
    for (let c = half; c < img[0].length - half; c += 1) {
      out[r][c] = convolveAt(img, r, c, kernel).value;
    }
  }
  return out;
}

const NEIGHBOUR_NAMES = {
  '-1,-1': 'above left', '-1,0': 'above', '-1,1': 'above right',
  '0,-1': 'left', '0,0': 'centre', '0,1': 'right',
  '1,-1': 'below left', '1,0': 'below', '1,1': 'below right'
};

function neighbourName(dr, dc) {
  return NEIGHBOUR_NAMES[`${dr},${dc}`] || `row ${dr >= 0 ? '+' : ''}${dr}, column ${dc >= 0 ? '+' : ''}${dc}`;
}

/* ==========================================================================
   3. SVG building blocks

   Every grid cell prints its own value as real <text>. The "current" cell is
   marked three ways at once — a thick outline, a filled corner wedge, and a
   sentence in the live summary — so nothing depends on colour (1.4.1).
   ========================================================================== */

const TOKEN = {
  surface: 'var(--fsu-surface)',
  border: 'var(--fsu-border)',
  borderStrong: 'var(--fsu-border-strong)',
  text: 'var(--fsu-color-strong)',
  caption: 'var(--fsu-color-caption)',
  body: 'var(--fsu-color-body)',
  accent: 'var(--fsu-focus-ring-color)',
  s1: 'var(--fsu-series-1)',
  s2: 'var(--fsu-series-2)',
  s3: 'var(--fsu-series-3)',
  s5: 'var(--fsu-series-5)'
};

/**
 * Build a labelled grid of numbers as an SVG <g>.
 *
 * @param {Array<Array<number|string>>} rows
 * @param {object} opts
 *   x, y        translation of the group
 *   cell        cell size in user units
 *   title       a caption drawn above the grid
 *   fmt         value formatter
 *   current     'r,c' key of the cell to mark as current
 *   probe       Set of 'r,c' keys to outline with a dashed border
 *   dim         Set of 'r,c' keys to draw with the caption colour (still legible)
 * @returns {{node: SVGElement, width: number, height: number}}
 */
function numberGrid(rows, opts = {}) {
  const cell = opts.cell || 26;
  const headW = 30;
  const headH = 18;
  const titleH = opts.title ? 18 : 0;
  const R = rows.length;
  const C = rows[0].length;
  const fmt = opts.fmt || ((v) => (v === null || v === undefined ? '' : String(v)));
  const current = opts.current || null;
  const probe = opts.probe || null;

  const g = svgEl('g', { transform: `translate(${opts.x || 0} ${opts.y || 0})` });

  if (opts.title) {
    g.appendChild(svgEl('text', {
      x: 0, y: 12, 'font-size': 13, fill: TOKEN.body, text: opts.title
    }));
  }

  const x0 = headW;
  const y0 = titleH + headH;

  for (let j = 0; j < C; j += 1) {
    g.appendChild(svgEl('text', {
      x: x0 + j * cell + cell / 2, y: titleH + 13,
      'font-size': 10, 'text-anchor': 'middle', fill: TOKEN.caption,
      text: `c${j + 1}`
    }));
  }

  for (let i = 0; i < R; i += 1) {
    g.appendChild(svgEl('text', {
      x: headW - 5, y: y0 + i * cell + cell / 2 + 4,
      'font-size': 10, 'text-anchor': 'end', fill: TOKEN.caption,
      text: `r${i + 1}`
    }));

    for (let j = 0; j < C; j += 1) {
      const key = `${i},${j}`;
      const cx = x0 + j * cell;
      const cy = y0 + i * cell;
      const isCurrent = current === key;
      const inProbe = probe ? probe.has(key) : false;

      g.appendChild(svgEl('rect', {
        x: cx, y: cy, width: cell, height: cell,
        fill: TOKEN.surface,
        stroke: isCurrent ? TOKEN.accent : (inProbe ? TOKEN.s1 : TOKEN.border),
        'stroke-width': isCurrent ? 3 : (inProbe ? 2 : 1),
        'stroke-dasharray': inProbe && !isCurrent ? '4 3' : null
      }));

      if (isCurrent) {
        // A filled corner wedge: a second, non-colour cue for "this one".
        g.appendChild(svgEl('path', {
          d: `M${cx} ${cy} L${cx + 8} ${cy} L${cx} ${cy + 8} Z`,
          fill: TOKEN.accent
        }));
      }

      g.appendChild(svgEl('text', {
        x: cx + cell / 2, y: cy + cell / 2 + 4,
        'font-size': cell >= 24 ? 12 : 10,
        'text-anchor': 'middle',
        'font-weight': isCurrent ? '700' : '400',
        fill: TOKEN.text,
        text: fmt(rows[i][j], i, j)
      }));
    }
  }

  return { node: g, width: headW + C * cell + 4, height: titleH + headH + R * cell + 4 };
}

/** Wrap one or more groups in an <svg> with the right viewBox. */
function svgWrap(children, width, height) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`,
    width: '100%',
    preserveAspectRatio: 'xMinYMin meet'
  });
  children.forEach((c) => svg.appendChild(c));
  return svg;
}

/**
 * A grouped bar chart. Series 1 is drawn solid, series 2 outlined with a dashed
 * stroke, so the two are distinguishable without colour; every bar also carries
 * its value as text.
 */
function barChart(opts) {
  const {
    categories, series, width = 620, height = 250,
    axisLabel = '', valueFmt = (v) => String(Math.round(v)), maxValue = null
  } = opts;

  const left = 46;
  const bottom = 46;
  const top = 26;
  const plotW = width - left - 12;
  const plotH = height - top - bottom;
  const max = maxValue !== null ? maxValue
    : Math.max(1, ...series.map((s) => Math.max(...s.values)));

  const g = svgEl('g', {});

  g.appendChild(svgEl('path', {
    d: `M${left} ${top} V${top + plotH} H${left + plotW}`,
    stroke: TOKEN.borderStrong, 'stroke-width': 1.5, fill: 'none'
  }));

  [0, 0.5, 1].forEach((f) => {
    const y = top + plotH - f * plotH;
    g.appendChild(svgEl('text', {
      x: left - 6, y: y + 4, 'font-size': 10, 'text-anchor': 'end',
      fill: TOKEN.caption, text: valueFmt(f * max)
    }));
  });

  const groupW = plotW / categories.length;
  const barW = Math.max(4, (groupW - 8) / series.length);

  categories.forEach((cat, i) => {
    const gx = left + i * groupW + 4;
    series.forEach((s, k) => {
      const v = s.values[i];
      const h = max === 0 ? 0 : Math.max(0, (v / max) * plotH);
      const x = gx + k * barW;
      const y = top + plotH - h;
      g.appendChild(svgEl('rect', {
        x, y, width: barW - 2, height: h,
        fill: k === 0 ? TOKEN.s1 : 'none',
        stroke: k === 0 ? TOKEN.s1 : TOKEN.s3,
        'stroke-width': k === 0 ? 1 : 2,
        'stroke-dasharray': k === 0 ? null : '5 3'
      }));
      if (categories.length <= 10) {
        g.appendChild(svgEl('text', {
          x: x + (barW - 2) / 2, y: y - 4, 'font-size': 10,
          'text-anchor': 'middle', fill: TOKEN.body, text: valueFmt(v)
        }));
      }
    });
    g.appendChild(svgEl('text', {
      x: gx + (groupW - 8) / 2, y: top + plotH + 15, 'font-size': 10,
      'text-anchor': 'middle', fill: TOKEN.caption, text: cat
    }));
  });

  series.forEach((s, k) => {
    const lx = left + k * 190;
    const ly = height - 12;
    g.appendChild(svgEl('rect', {
      x: lx, y: ly - 9, width: 16, height: 10,
      fill: k === 0 ? TOKEN.s1 : 'none',
      stroke: k === 0 ? TOKEN.s1 : TOKEN.s3,
      'stroke-width': k === 0 ? 1 : 2,
      'stroke-dasharray': k === 0 ? null : '5 3'
    }));
    g.appendChild(svgEl('text', {
      x: lx + 22, y: ly, 'font-size': 11, fill: TOKEN.body,
      text: `${s.label} (${k === 0 ? 'solid' : 'dashed outline'})`
    }));
  });

  if (axisLabel) {
    g.appendChild(svgEl('text', {
      x: left, y: 14, 'font-size': 11, fill: TOKEN.caption, text: axisLabel
    }));
  }

  return svgWrap([g], width, height);
}

/* ==========================================================================
   4.2.3 — PGM file reader
   ========================================================================== */

createDemo('#demo-pgm-feep-mount', {
  id: 'demo-pgm-feep',
  title: 'PGM file reader',
  description:
    'The FEEP image from the slides, read as a Portable Gray Map. Change the declared ' +
    'maximum value with and without rescaling the data, and take the negative — the two ' +
    'exercises set on slide P1:18.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'maxint', label: 'Declared maximum value (MAXINT)',
      options: [
        { value: '15', label: '15 — as the file ships (4-bit)' },
        { value: '31', label: '31 — the slide’s exercise (5-bit)' },
        { value: '255', label: '255 — standard 8-bit gray' }
      ],
      value: '15',
      help: 'MAXINT is line 4 of the header. On its own it changes how every stored value is interpreted, not the values themselves.'
    },
    {
      type: 'checkbox', name: 'rescale',
      label: 'Rescale the pixel data to the new maximum',
      value: false,
      help: 'Off answers the exercise: raise MAXINT and leave the data alone, and the picture goes dark. On keeps the appearance by scaling every value.'
    },
    {
      type: 'checkbox', name: 'negative',
      label: 'Show the negative (MAXINT minus each value)',
      value: false,
      help: 'The second exercise on the same slide. This is the same operation as reverse video in topic 4.5.6.'
    }
  ],

  compute(values) {
    const maxint = Number(values.maxint);
    const rescale = Boolean(values.rescale);
    const negative = Boolean(values.negative);

    const data = FEEP.map((row) => row.map((v) => {
      let out = rescale ? Math.round((v * maxint) / 15) : v;
      if (out > maxint) out = maxint;
      if (negative) out = maxint - out;
      return out;
    }));

    const levels = Array.from(new Set(flatten(data))).sort((a, b) => a - b);
    const bits = Math.max(1, Math.ceil(Math.log2(maxint + 1)));
    const meanShade = gridMean(data) / maxint;

    return {
      data, maxint, rescale, negative, levels, bits, meanShade,
      width: 24, height: 7, count: 168,
      brightest: gridMax(data), darkest: gridMin(data)
    };
  },

  figure(model) {
    const { node, width, height } = numberGrid(model.data, {
      cell: 22, title: `FEEP as stored: 7 rows of 24, MAXINT ${model.maxint}`
    });
    return svgWrap([node], width, height);
  },

  figureAlt(model) {
    const shape = model.negative
      ? 'the four letters are now dark on a light ground'
      : 'the four letters F, E, E and P read left to right in brightening shades on a dark ground';
    return `The 7 by 24 FEEP array with MAXINT ${model.maxint}: values run from ` +
      `${model.darkest} to ${model.brightest} using ${model.levels.length} distinct levels, and ${shape}. ` +
      `Mean shade is ${formatNumber(model.meanShade, 3)} out of 1.0.`;
  },

  table(model) {
    const cols = [{ label: 'Row' }];
    for (let j = 1; j <= 24; j += 1) cols.push({ label: `c${j}`, numeric: true });
    return {
      caption: `FEEP pixel data with MAXINT ${model.maxint}` +
        (model.rescale ? ', rescaled' : ', data unchanged') +
        (model.negative ? ', shown as a negative' : ''),
      rowHeader: true,
      columns: cols,
      rows: model.data.map((row, i) => ({ cells: [`r${i + 1}`].concat(row) }))
    };
  },

  summary(model) {
    const header = `Header: magic number P2, width 24, height 7, maximum value ${model.maxint}, ` +
      `then ${model.count} data values.`;

    const depth = `${model.levels.length} distinct gray levels are in use (${model.levels.join(', ')}), ` +
      `and a declared maximum of ${model.maxint} needs ${model.bits} bits per pixel, ` +
      `so the file is ${model.count * model.bits} bits, or ${Math.ceil((model.count * model.bits) / 8)} bytes, of pixel data.`;

    let effect;
    if (model.negative && model.rescale) {
      effect = `Rescaled to the new maximum and then negated: white and black have swapped, and the mean shade is ${formatNumber(model.meanShade, 3)}.`;
    } else if (model.negative) {
      effect = `Negated with MAXINT minus each value. The background, which was 0, is now ${model.maxint}, so the letters are dark on light.`;
    } else if (model.rescale) {
      effect = `Rescaled: every value was multiplied by ${model.maxint} divided by 15, so the picture looks the same as the original but uses the wider range. Mean shade ${formatNumber(model.meanShade, 3)}.`;
    } else if (model.maxint === 15) {
      effect = 'This is the file exactly as the slides print it.';
    } else {
      effect = `MAXINT was raised to ${model.maxint} but the data was left alone, so the brightest pixel is only ` +
        `${formatNumber(model.brightest / model.maxint, 3)} of full white instead of 1.0 — the whole image has gone darker. ` +
        'That is the answer to the slide’s first exercise.';
    }

    return [header, depth, effect];
  }
});

/* ==========================================================================
   4.2.4 — Run-length encoder
   ========================================================================== */

function runLengthEncode(seq) {
  const runs = [];
  seq.forEach((v, i) => {
    const last = runs[runs.length - 1];
    if (last && last.value === v) {
      last.count += 1;
      last.end = i;
    } else {
      runs.push({ value: v, count: 1, start: i, end: i });
    }
  });
  return runs;
}

createDemo('#demo-run-length-mount', {
  id: 'demo-run-length',
  title: 'Run-length encoder',
  description:
    'Encode a row of the FEEP image, or the whole image, as value-and-count pairs. ' +
    'Step through the runs one at a time and watch the saving accumulate — or fail to.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'source', label: 'What to encode',
      options: [
        { value: 'first3', label: 'The first three rows — the slide’s example' },
        { value: 'r1', label: 'Row 1 (all background)' },
        { value: 'r2', label: 'Row 2 (the tops of the four letters)' },
        { value: 'r3', label: 'Row 3 (the worst row)' },
        { value: 'r4', label: 'Row 4' },
        { value: 'r5', label: 'Row 5' },
        { value: 'r6', label: 'Row 6' },
        { value: 'r7', label: 'Row 7 (all background)' },
        { value: 'all', label: 'The whole 7 by 24 image' },
        { value: 'alt', label: 'An alternating row, 0 15 0 15 … (the worst case)' }
      ],
      value: 'first3',
      help: 'Encoding runs along the rows in order, exactly as the data is stored in the file.'
    }
  ],

  compute(values) {
    // The slides encode ROW BY ROW: a run never spans a row boundary, which is
    // why their three-row example needs 42 numbers and not 38. Keep that.
    let sourceRows;
    let label;
    switch (values.source) {
      case 'all':
        sourceRows = FEEP.map((r) => r.slice()); label = 'the whole image, row by row'; break;
      case 'first3':
        sourceRows = FEEP.slice(0, 3).map((r) => r.slice()); label = 'the first three rows'; break;
      case 'alt':
        sourceRows = [Array.from({ length: 24 }, (unused, i) => (i % 2 === 0 ? 0 : 15))];
        label = 'an alternating row'; break;
      default: {
        const idx = Number(values.source.slice(1)) - 1;
        sourceRows = [FEEP[idx].slice()]; label = `row ${idx + 1}`;
      }
    }

    const seq = sourceRows.reduce((a, r) => a.concat(r), []);
    const runs = [];
    let offset = 0;
    sourceRows.forEach((row, rowIndex) => {
      runLengthEncode(row).forEach((run) => {
        runs.push({
          value: run.value,
          count: run.count,
          start: run.start + offset,
          end: run.end + offset,
          row: rowIndex + 1
        });
      });
      offset += row.length;
    });

    const encoded = runs.length * 2;
    return {
      seq, runs, label, rowCount: sourceRows.length,
      raw: seq.length,
      encoded,
      saving: seq.length - encoded,
      percent: ((seq.length - encoded) / seq.length) * 100
    };
  },

  steps: {
    count: (model) => model.runs.length,
    label: (model, i) => {
      const run = model.runs[i];
      const done = model.runs.slice(0, i + 1).length * 2;
      const covered = model.runs.slice(0, i + 1).reduce((a, r) => a + r.count, 0);
      const where = model.rowCount > 1 ? ` in row ${run.row}` : '';
      return `Run ${i + 1}: the value ${run.value} repeats ${run.count} time${run.count === 1 ? '' : 's'}` +
        `${where}, covering positions ${run.start + 1} to ${run.end + 1}. It is written as the pair ` +
        `(${run.value}, ${run.count}), so ${covered} raw values have become ${done} numbers so far.`;
    }
  },

  figure(model, ctx) {
    const width = 620;
    const rowH = 34;
    const height = 30 + rowH * 2 + 24;
    const g = svgEl('g', {});
    const scale = (width - 20) / model.raw;

    g.appendChild(svgEl('text', { x: 0, y: 12, 'font-size': 12, fill: TOKEN.body,
      text: `${model.raw} raw values, drawn to scale` }));

    model.seq.forEach((v, i) => {
      g.appendChild(svgEl('rect', {
        x: 10 + i * scale, y: 18, width: Math.max(1, scale - 0.5), height: 16,
        fill: 'none', stroke: TOKEN.border, 'stroke-width': 0.75
      }));
    });

    g.appendChild(svgEl('text', { x: 0, y: 58, 'font-size': 12, fill: TOKEN.body,
      text: `${model.runs.length} runs; the current run is outlined thickly and labelled` }));

    model.runs.forEach((run, i) => {
      const x = 10 + run.start * scale;
      const w = Math.max(1.5, run.count * scale - 0.5);
      const isCurrent = i === ctx.step;
      g.appendChild(svgEl('rect', {
        x, y: 64, width: w, height: 22,
        fill: isCurrent ? TOKEN.s2 : 'none',
        stroke: isCurrent ? TOKEN.accent : TOKEN.s1,
        'stroke-width': isCurrent ? 3 : 1.25
      }));
      if (w > 26) {
        g.appendChild(svgEl('text', {
          x: x + w / 2, y: 79, 'font-size': 10, 'text-anchor': 'middle',
          fill: TOKEN.text, text: `${run.value}×${run.count}`
        }));
      }
    });

    const cur = model.runs[ctx.step];
    g.appendChild(svgEl('text', {
      x: 0, y: height - 6, 'font-size': 11, fill: TOKEN.body,
      text: `Current run ${ctx.step + 1} of ${model.runs.length}: value ${cur.value}, count ${cur.count}`
    }));

    return svgWrap([g], width, height);
  },

  figureAlt(model, ctx) {
    const cur = model.runs[ctx.step];
    return `Run ${ctx.step + 1} of ${model.runs.length} covers positions ${cur.start + 1} to ${cur.end + 1} ` +
      `of ${model.raw}, all holding the value ${cur.value}; it is ` +
      `${cur.count === 1 ? 'the shortest possible run, one pixel' : `${cur.count} pixels long`} ` +
      `and replaces ${cur.count} numbers with 2.`;
  },

  table(model, ctx) {
    return {
      caption: `Run-length encoding of ${model.label}: ${model.runs.length} runs, ` +
        `${model.encoded} numbers in place of ${model.raw}`,
      rowHeader: true,
      columns: [
        { label: 'Run' },
        { label: 'Row', numeric: true },
        { label: 'Value', numeric: true },
        { label: 'Count', numeric: true },
        { label: 'First position', numeric: true },
        { label: 'Last position', numeric: true },
        { label: 'Numbers used so far', numeric: true }
      ],
      rows: model.runs.map((run, i) => ({
        cells: [i + 1, run.row, run.value, run.count, run.start + 1, run.end + 1, (i + 1) * 2],
        current: i === ctx.step
      }))
    };
  },

  summary(model) {
    const verdict = model.saving > 0
      ? `That saves ${model.saving} numbers, about ${formatNumber(model.percent, 1)} per cent.`
      : model.saving === 0
        ? 'That is exactly break-even: the encoding is the same size as the original.'
        : `That is ${-model.saving} numbers larger than the original — a loss of ` +
          `${formatNumber(-model.percent, 1)} per cent. Run-length encoding is a bet on structure, and here it loses.`;

    return [
      `Encoding ${model.label}: ${model.raw} raw values become ${model.runs.length} runs, ` +
        `written as ${model.encoded} numbers. ${verdict}`,
      `The longest run is ${Math.max(...model.runs.map((r) => r.count))} pixels and the shortest is ` +
        `${Math.min(...model.runs.map((r) => r.count))}. A run of length 1 costs two numbers instead of one, ` +
        'so every isolated pixel makes the file bigger.',
      model.rowCount > 1
        ? `Runs are not allowed to cross a row boundary, so each of the ${model.rowCount} rows is encoded ` +
          'separately. Letting them run on would save a few more numbers, at the cost of a format in which ' +
          'you can no longer find the start of row seven without decoding the first six.'
        : 'A single row is encoded on its own, which is how the format keeps every row independently addressable.'
    ];
  }
});

/* ==========================================================================
   4.3.3 — Histogram and contrast stretch
   ========================================================================== */

function histogram(grid, binCount) {
  const bins = new Array(binCount).fill(0);
  const w = 256 / binCount;
  flatten(grid).forEach((v) => {
    const idx = Math.min(binCount - 1, Math.floor(v / w));
    bins[idx] += 1;
  });
  return bins;
}

createDemo('#demo-histogram-stretch-mount', {
  id: 'demo-histogram-stretch',
  title: 'Histogram and contrast stretch',
  description:
    'A dark, low-contrast 12 by 12 test image. Watch the histogram move as you stretch it, ' +
    'and compare a proper linear stretch with the lecture’s "double the darks, clip the lights" ' +
    'experiment, which throws information away.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'bins', label: 'Number of histogram bins',
      options: [
        { value: '4', label: '4 bins of 64 levels' },
        { value: '8', label: '8 bins of 32 levels' },
        { value: '16', label: '16 bins of 16 levels' },
        { value: '32', label: '32 bins of 8 levels' }
      ],
      value: '8',
      help: 'Bin count is a presentation choice. The pixels do not change; only the shape you see does.'
    },
    {
      type: 'range', name: 'outMin', label: 'Stretch to: lowest output value',
      min: 0, max: 255, step: 5, value: 0, unit: 'gray levels',
      valueText: (v) => `${v} on the 0 to 255 gray scale`
    },
    {
      type: 'range', name: 'outMax', label: 'Stretch to: highest output value',
      min: 0, max: 255, step: 5, value: 255, unit: 'gray levels',
      valueText: (v) => `${v} on the 0 to 255 gray scale`,
      help: 'Setting this below the lowest output value inverts the image, which is a legitimate, if surprising, linear map.'
    },
    {
      type: 'checkbox', name: 'experiment',
      label: 'Use the lecture’s Experiment 1 instead (double values below 128, set the rest to 255)',
      value: false,
      help: 'Experiment 1 is a stretch plus a clip. Turn it on and watch a spike appear at the top of the histogram: those pixels are now all the same and cannot be told apart again.'
    }
  ],

  compute(values) {
    const binCount = Number(values.bins);
    const outMin = Number(values.outMin);
    const outMax = Number(values.outMax);
    const experiment = Boolean(values.experiment);

    const before = TEST_IMAGE;
    const a = gridMin(before);
    const b = gridMax(before);

    let after;
    let clipped = 0;
    if (experiment) {
      after = before.map((row) => row.map((v) => {
        if (v >= 128) { clipped += 1; return 255; }
        return clamp255(2 * v);
      }));
    } else if (b > a) {
      after = before.map((row) => row.map(
        (v) => clamp255(Math.round(((v - a) / (b - a)) * (outMax - outMin) + outMin))
      ));
    } else {
      after = cloneGrid(before);
    }

    const binsBefore = histogram(before, binCount);
    const binsAfter = histogram(after, binCount);
    const usedBefore = new Set(flatten(before)).size;
    const usedAfter = new Set(flatten(after)).size;

    return {
      before, after, binCount, binsBefore, binsAfter, experiment, clipped,
      outMin, outMax,
      statsBefore: { min: a, max: b, mean: gridMean(before), std: gridStd(before) },
      statsAfter: {
        min: gridMin(after), max: gridMax(after),
        mean: gridMean(after), std: gridStd(after)
      },
      usedBefore, usedAfter
    };
  },

  figure(model) {
    const w = 256 / model.binCount;
    const categories = model.binsBefore.map((unused, i) => `${Math.round(i * w)}`);
    return barChart({
      categories,
      series: [
        { label: 'Before', values: model.binsBefore },
        { label: 'After', values: model.binsAfter }
      ],
      axisLabel: 'Pixel count (vertical) against gray value at the start of each bin (horizontal)',
      width: 620, height: 260,
      valueFmt: (v) => String(Math.round(v))
    });
  },

  figureAlt(model) {
    const bw = 256 / model.binCount;
    const topBefore = model.binsBefore.indexOf(Math.max(...model.binsBefore));
    const topAfter = model.binsAfter.indexOf(Math.max(...model.binsAfter));
    const emptyBefore = model.binsBefore.filter((v) => v === 0).length;
    const emptyAfter = model.binsAfter.filter((v) => v === 0).length;
    const clipNote = model.experiment
      ? ` The clip has piled ${model.clipped} pixels onto the single value 255.`
      : '';
    return `Before, the 144 pixels occupy ${model.binCount - emptyBefore} of ${model.binCount} bins, ` +
      `peaking in the bin that starts at ${Math.round(topBefore * bw)} with ${model.binsBefore[topBefore]} pixels, ` +
      `and nothing above ${model.statsBefore.max}. After, they occupy ${model.binCount - emptyAfter} bins, ` +
      `peaking in the bin that starts at ${Math.round(topAfter * bw)} with ${model.binsAfter[topAfter]} pixels, ` +
      `and the range now runs ${model.statsAfter.min} to ${model.statsAfter.max}.${clipNote}`;
  },

  table(model) {
    const w = 256 / model.binCount;
    const rows = model.binsBefore.map((count, i) => ({
      cells: [
        `${Math.round(i * w)} to ${Math.round((i + 1) * w) - 1}`,
        count,
        model.binsAfter[i]
      ]
    }));
    rows.push({ cells: ['Minimum value', model.statsBefore.min, model.statsAfter.min] });
    rows.push({ cells: ['Maximum value', model.statsBefore.max, model.statsAfter.max] });
    rows.push({ cells: ['Mean', formatNumber(model.statsBefore.mean, 2), formatNumber(model.statsAfter.mean, 2)] });
    rows.push({ cells: ['Standard deviation', formatNumber(model.statsBefore.std, 2), formatNumber(model.statsAfter.std, 2)] });
    rows.push({ cells: ['Distinct values in use', model.usedBefore, model.usedAfter] });

    return {
      caption: `Histogram of the 144 pixels in ${model.binCount} bins, before and after ` +
        (model.experiment ? 'Experiment 1' : `stretching to the range ${model.outMin} to ${model.outMax}`),
      rowHeader: true,
      columns: [
        { label: 'Bin (gray values)' },
        { label: 'Pixels before', numeric: true },
        { label: 'Pixels after', numeric: true }
      ],
      rows
    };
  },

  summary(model) {
    const lines = [];
    lines.push(
      `Before: the image uses only ${model.statsBefore.min} to ${model.statsBefore.max} of the available ` +
      `0 to 255, which is ${formatNumber(((model.statsBefore.max - model.statsBefore.min) / 255) * 100, 1)} per cent ` +
      `of the range, with mean ${formatNumber(model.statsBefore.mean, 2)} and standard deviation ` +
      `${formatNumber(model.statsBefore.std, 2)}. That is a dark, low-contrast image.`
    );

    if (model.experiment) {
      lines.push(
        `Experiment 1 doubled every value below 128 and forced the other ${model.clipped} to 255. ` +
        `The spread grew — standard deviation is now ${formatNumber(model.statsAfter.std, 2)} — but the number of ` +
        `distinct values fell from ${model.usedBefore} to ${model.usedAfter}, because the clipped pixels are now ` +
        'all identical. That information cannot be recovered.'
      );
    } else {
      lines.push(
        `After a linear stretch onto ${model.outMin} to ${model.outMax}: mean ` +
        `${formatNumber(model.statsAfter.mean, 2)}, standard deviation ${formatNumber(model.statsAfter.std, 2)}, ` +
        `and ${model.usedAfter} distinct values against ${model.usedBefore} before.`
      );
      lines.push(
        model.usedAfter >= model.usedBefore
          ? 'No two pixels that differed before are equal now, so nothing was lost: a stretch reveals information, it does not add or destroy any.'
          : `Rounding has merged some values: ${model.usedBefore - model.usedAfter} distinct shades were lost. ` +
            'A stretch onto a narrower range than the original always costs you some.'
      );
    }
    return lines;
  }
});

/* ==========================================================================
   4.3.5 — K-means quantization step-through
   ========================================================================== */

function runKMeans(vals, k, init, seed, maxIters) {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);

  let centres;
  if (init === 'random') {
    const rand = seededRandom(seed);
    const picked = [];
    let guard = 0;
    while (picked.length < k && guard < 500) {
      const v = vals[Math.floor(rand() * vals.length)];
      if (!picked.includes(v)) picked.push(v);
      guard += 1;
    }
    while (picked.length < k) picked.push(lo + ((hi - lo) * picked.length) / k);
    centres = picked.sort((a, b) => a - b);
  } else {
    centres = Array.from({ length: k }, (unused, i) => lo + ((i + 0.5) * (hi - lo)) / k);
  }

  const history = [];
  for (let it = 0; it < maxIters; it += 1) {
    const groups = Array.from({ length: k }, () => []);
    vals.forEach((v) => {
      let best = 0;
      let bestD = Math.abs(v - centres[0]);
      for (let j = 1; j < k; j += 1) {
        const d = Math.abs(v - centres[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      groups[best].push(v);
    });

    let inertia = 0;
    groups.forEach((g, j) => g.forEach((v) => { inertia += (v - centres[j]) * (v - centres[j]); }));

    const next = groups.map((g, j) => (g.length
      ? g.reduce((a, b) => a + b, 0) / g.length
      : centres[j]));
    const moved = next.reduce((a, c, j) => a + Math.abs(c - centres[j]), 0);

    history.push({
      iteration: it + 1,
      centres: centres.slice(),
      counts: groups.map((g) => g.length),
      ranges: groups.map((g) => (g.length ? [Math.min(...g), Math.max(...g)] : null)),
      inertia,
      moved
    });

    centres = next;
    if (moved < 1e-9) break;
  }
  return history;
}

createDemo('#demo-kmeans-quantize-mount', {
  id: 'demo-kmeans-quantize',
  title: 'K-means quantization step-through',
  description:
    'The 144 gray values of the test image, clustered into k representative shades. ' +
    'Step through the assignment and update rounds and watch the total squared error fall ' +
    'until no pixel changes cluster.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'k', label: 'Number of representative shades, k',
      min: 2, max: 8, step: 1, value: 3, unit: 'clusters',
      valueText: (v) => `${v} representative shades`,
      help: 'The lecture uses k = 3 and k = 10 on the casablanca still. Lower k means a smaller file and a flatter picture.'
    },
    {
      type: 'select', name: 'init', label: 'How the centres start',
      options: [
        { value: 'spread', label: 'Evenly spread across the data range' },
        { value: 'random', label: 'At k randomly chosen pixel values (seeded)' }
      ],
      value: 'spread',
      help: 'The lecture initialises at random. Evenly spread is deterministic, so the numbers below are the same for everyone.'
    },
    {
      type: 'seed', name: 'seed', label: 'Random seed (used only for the random start)',
      value: 42,
      help: 'Change the seed to see that a different start can converge to a different answer with a different final error.'
    }
  ],

  compute(values) {
    const vals = flatten(TEST_IMAGE);
    const history = runKMeans(vals, Number(values.k), values.init, Number(values.seed), 20);
    const last = history[history.length - 1];
    const converged = last.moved < 1e-9;
    return { vals, k: Number(values.k), history, converged, init: values.init };
  },

  steps: {
    count: (model) => model.history.length,
    label: (model, i) => {
      const h = model.history[i];
      const prev = i > 0 ? model.history[i - 1] : null;
      const changed = prev
        ? h.counts.reduce((a, c, j) => a + Math.abs(c - prev.counts[j]), 0) / 2
        : null;
      const inertiaNote = prev
        ? `Total squared error fell from ${formatNumber(prev.inertia, 1)} to ${formatNumber(h.inertia, 1)}.`
        : `Total squared error at this first assignment is ${formatNumber(h.inertia, 1)}.`;
      const moveNote = h.moved < 1e-9
        ? 'No centre moved, so the algorithm has converged and this is the final answer.'
        : `The centres then moved a total of ${formatNumber(h.moved, 3)} gray levels.`;
      const changeNote = changed === null
        ? ''
        : ` About ${changed} pixel${changed === 1 ? '' : 's'} changed cluster since the previous round.`;
      return `Iteration ${h.iteration}: every pixel was assigned to its nearest centre, ` +
        `giving group sizes ${h.counts.join(', ')}.${changeNote} ${inertiaNote} ${moveNote}`;
    }
  },

  figure(model, ctx) {
    const h = model.history[ctx.step];
    const width = 620;
    const height = 200;
    const left = 20;
    const plotW = width - 40;
    const axisY = 120;
    const g = svgEl('g', {});

    g.appendChild(svgEl('text', { x: 0, y: 14, 'font-size': 12, fill: TOKEN.body,
      text: `Gray scale 0 to 255, with the ${model.k} centres at iteration ${h.iteration}` }));

    g.appendChild(svgEl('path', {
      d: `M${left} ${axisY} H${left + plotW}`, stroke: TOKEN.borderStrong, 'stroke-width': 1.5, fill: 'none'
    }));
    [0, 64, 128, 192, 255].forEach((v) => {
      const x = left + (v / 255) * plotW;
      g.appendChild(svgEl('path', { d: `M${x} ${axisY} v6`, stroke: TOKEN.borderStrong, 'stroke-width': 1 }));
      g.appendChild(svgEl('text', { x, y: axisY + 20, 'font-size': 10, 'text-anchor': 'middle',
        fill: TOKEN.caption, text: String(v) }));
    });

    // Cluster extents drawn as bars above the axis, each directly labelled.
    const maxCount = Math.max(...h.counts, 1);
    h.ranges.forEach((range, j) => {
      if (!range) return;
      const x0 = left + (range[0] / 255) * plotW;
      const x1 = left + (range[1] / 255) * plotW;
      const barH = 6 + (h.counts[j] / maxCount) * 50;
      g.appendChild(svgEl('rect', {
        x: x0, y: axisY - barH, width: Math.max(2, x1 - x0), height: barH,
        fill: 'none', stroke: TOKEN.s1, 'stroke-width': 1.5,
        'stroke-dasharray': j % 2 === 1 ? '5 3' : null
      }));
      g.appendChild(svgEl('text', {
        x: (x0 + x1) / 2, y: axisY - barH - 4, 'font-size': 10, 'text-anchor': 'middle',
        fill: TOKEN.body, text: `#${j + 1}: ${h.counts[j]} px`
      }));
    });

    h.centres.forEach((c, j) => {
      const x = left + (c / 255) * plotW;
      g.appendChild(svgEl('path', {
        d: `M${x} ${axisY + 30} l-6 12 h12 Z`, fill: TOKEN.accent
      }));
      g.appendChild(svgEl('text', {
        x, y: axisY + 58, 'font-size': 10, 'text-anchor': 'middle', fill: TOKEN.text,
        text: `c${j + 1}=${formatNumber(c, 1)}`
      }));
    });

    return svgWrap([g], width, height);
  },

  figureAlt(model, ctx) {
    const h = model.history[ctx.step];
    const list = h.centres.map((c, j) => `centre ${j + 1} at ${formatNumber(c, 1)} holding ${h.counts[j]} pixels`);
    return `At iteration ${h.iteration} the ${model.k} centres sit on the 0 to 255 scale as follows: ` +
      `${list.join('; ')}. Total squared error ${formatNumber(h.inertia, 1)}.`;
  },

  table(model, ctx) {
    const h = model.history[ctx.step];
    const rows = h.centres.map((c, j) => ({
      cells: [
        `Cluster ${j + 1}`,
        formatNumber(c, 2),
        h.counts[j],
        h.ranges[j] ? `${h.ranges[j][0]} to ${h.ranges[j][1]}` : 'empty',
        formatNumber(h.counts[j] ? (h.counts[j] / model.vals.length) * 100 : 0, 1)
      ]
    }));
    rows.push({
      cells: ['All clusters', '—', model.vals.length, `${Math.min(...model.vals)} to ${Math.max(...model.vals)}`, '100.0'],
      current: true
    });
    return {
      caption: `K-means iteration ${h.iteration} of ${model.history.length}: centre positions at the ` +
        `start of the round, the pixels assigned to each, and the total squared error ${formatNumber(h.inertia, 1)}`,
      rowHeader: true,
      columns: [
        { label: 'Cluster' },
        { label: 'Centre', unit: 'gray level', numeric: true },
        { label: 'Pixels', numeric: true },
        { label: 'Value range' },
        { label: 'Share', unit: '%', numeric: true }
      ],
      rows
    };
  },

  summary(model, ctx) {
    const h = model.history[ctx.step];
    const last = model.history[model.history.length - 1];
    const lines = [];

    lines.push(
      `k = ${model.k} on 144 gray values. Iteration ${h.iteration} of ${model.history.length}: ` +
      `centres at ${h.centres.map((c) => formatNumber(c, 2)).join(', ')}, holding ` +
      `${h.counts.join(', ')} pixels respectively.`
    );

    lines.push(
      model.converged
        ? `The run converged after ${model.history.length} iterations with a final total squared error of ` +
          `${formatNumber(last.inertia, 1)}. Convergence means no pixel changed cluster after the last update.`
        : `The run had not converged after ${model.history.length} iterations; the centres were still moving by ` +
          `${formatNumber(last.moved, 3)} gray levels.`
    );

    lines.push(
      `Storing ${model.k} representative shades instead of ${new Set(model.vals).size} distinct ones means ` +
      `each pixel needs ${Math.max(1, Math.ceil(Math.log2(model.k)))} bits instead of 8 — about ` +
      `${formatNumber((1 - Math.max(1, Math.ceil(Math.log2(model.k))) / 8) * 100, 0)} per cent less data, ` +
      'at the cost of everything the discarded shades were showing.'
    );

    return lines;
  }
});

/* ==========================================================================
   4.4.1 — Convolution window step-through
   ========================================================================== */

function resolveKernel(name, size) {
  if (name === 'box') return { kernel: boxKernel(size), size, note: null };
  if (name === 'gaussian') return { kernel: gaussianKernel(size, 1).kernel, size, note: null };
  if (size !== 3) {
    return {
      kernel: KERNELS[name].k,
      size: 3,
      note: `The ${KERNELS[name].label} kernel is defined at 3 by 3 only, so the window size was ` +
        'held at 3. Only the box and Gaussian kernels generalise to larger windows.'
    };
  }
  return { kernel: KERNELS[name].k, size: 3, note: null };
}

createDemo('#demo-convolution-window-mount', {
  id: 'demo-convolution-window',
  title: 'Convolution window step-through',
  description:
    'Slide a kernel across an image one pixel at a time and watch the nine multiplications and ' +
    'the sum that produce each output value. Every filter in section 4.4 and 4.5 is this same loop ' +
    'with different numbers in the kernel.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'kernel', label: 'Kernel',
      options: [
        { value: 'box', label: 'Box blur — every weight equal' },
        { value: 'identity', label: 'Identity — copies the image' },
        { value: 'gaussian', label: 'Gaussian blur, sigma = 1' },
        { value: 'sharpen', label: 'Sharpen' },
        { value: 'laplacian', label: 'Laplacian — second derivative' },
        { value: 'emboss', label: 'Emboss' },
        { value: 'sobelx', label: 'Sobel X — vertical edges' },
        { value: 'sobely', label: 'Sobel Y — horizontal edges' }
      ],
      value: 'box',
      help: 'A kernel summing to 1 preserves brightness. A kernel summing to 0 measures a difference and gives 0 on any flat region.'
    },
    {
      type: 'select', name: 'size', label: 'Window size',
      options: [
        { value: '3', label: '3 by 3 — nine values' },
        { value: '5', label: '5 by 5 — twenty-five values (box and Gaussian only)' },
        { value: '7', label: '7 by 7 — forty-nine values (box and Gaussian only)' }
      ],
      value: '3'
    },
    {
      type: 'select', name: 'image', label: 'Image',
      options: [
        { value: 'test', label: '12 by 12 test image' },
        { value: 'exam', label: 'Final-exam 4 by 5 matrix' }
      ],
      value: 'test'
    }
  ],

  compute(values) {
    const img = values.image === 'exam' ? EXAM_GRAY : TEST_IMAGE;
    const { kernel, size, note } = resolveKernel(values.kernel, Number(values.size));
    const half = (size - 1) / 2;

    const positions = [];
    for (let r = half; r < img.length - half; r += 1) {
      for (let c = half; c < img[0].length - half; c += 1) positions.push([r, c]);
    }
    if (positions.length === 0) {
      return { img, kernel, size, note, positions: [], out: cloneGrid(img), empty: true, kernelName: values.kernel };
    }

    const out = convolveGrid(img, kernel);
    const kernelSum = kernel.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);

    return {
      img, kernel, size, half, note, positions, out, empty: false,
      kernelSum, kernelName: values.kernel,
      kernelLabel: KERNELS[values.kernel].label,
      outMin: Math.min(...positions.map(([r, c]) => out[r][c])),
      outMax: Math.max(...positions.map(([r, c]) => out[r][c]))
    };
  },

  steps: {
    count: (model) => Math.max(1, model.positions.length),
    label: (model, i) => {
      if (model.empty) return 'The window is larger than the image, so there is nothing to compute.';
      const [r, c] = model.positions[i];
      const { value, terms } = convolveAt(model.img, r, c, model.kernel);
      const biggest = terms.slice().sort((a, b) => Math.abs(b.product) - Math.abs(a.product))[0];
      return `Row ${r + 1}, column ${c + 1}: the window is centred on the value ${model.img[r][c]}. ` +
        `The ${terms.length} products sum to ${formatNumber(value, 2)}, so the output pixel is ` +
        `${formatNumber(value, 2)}, a change of ${formatNumber(value - model.img[r][c], 2)}. ` +
        `The largest single contribution is ${formatNumber(biggest.product, 2)}, from the ` +
        `${neighbourName(biggest.dr, biggest.dc)} value ${biggest.pixel}.`;
    }
  },

  figure(model, ctx) {
    if (model.empty) {
      return svgWrap([svgEl('text', {
        x: 4, y: 20, 'font-size': 13, fill: TOKEN.body,
        text: 'No interior pixel has a full window at this size.'
      })], 400, 40);
    }
    const [r, c] = model.positions[ctx.step];
    const probe = new Set();
    for (let a = -model.half; a <= model.half; a += 1) {
      for (let b = -model.half; b <= model.half; b += 1) probe.add(`${r + a},${c + b}`);
    }

    const cell = model.img[0].length > 8 ? 24 : 30;
    const inGrid = numberGrid(model.img, {
      x: 0, y: 0, cell, title: 'Input image — the window is outlined, the centre is marked',
      current: `${r},${c}`, probe
    });
    const outGrid = numberGrid(model.out, {
      x: 0, y: inGrid.height + 16, cell,
      title: 'Output image — border pixels are copied through unchanged',
      current: `${r},${c}`,
      fmt: (v) => (Number.isInteger(v) ? String(v) : formatNumber(v, 1))
    });

    return svgWrap(
      [inGrid.node, outGrid.node],
      Math.max(inGrid.width, outGrid.width),
      inGrid.height + 16 + outGrid.height
    );
  },

  figureAlt(model, ctx) {
    if (model.empty) return 'The chosen window is larger than the image, so no output can be computed.';
    const [r, c] = model.positions[ctx.step];
    const { value } = convolveAt(model.img, r, c, model.kernel);
    return `Step ${ctx.step + 1} of ${model.positions.length}. The ${model.size} by ${model.size} window sits on ` +
      `row ${r + 1}, column ${c + 1}, whose input value is ${model.img[r][c]}. The ${model.kernelLabel} kernel ` +
      `turns it into ${formatNumber(value, 2)} in the output grid below.`;
  },

  table(model, ctx) {
    if (model.empty) {
      return {
        caption: 'No window fits in this image at the chosen size',
        columns: [{ label: 'Note' }],
        rows: [['Choose a smaller window or a larger image.']]
      };
    }
    const [r, c] = model.positions[ctx.step];
    const { value, terms } = convolveAt(model.img, r, c, model.kernel);
    const rows = terms.map((t) => ({
      cells: [
        `${neighbourName(t.dr, t.dc)} (r${r + t.dr + 1}, c${c + t.dc + 1})`,
        t.pixel,
        formatNumber(t.weight, 4),
        formatNumber(t.product, 3)
      ],
      current: t.dr === 0 && t.dc === 0
    }));
    rows.push({
      cells: ['Sum', '—', formatNumber(model.kernelSum, 4), formatNumber(value, 3)]
    });

    return {
      caption: `Convolution at row ${r + 1}, column ${c + 1} with the ${model.kernelLabel} kernel: ` +
        `${terms.length} products summing to ${formatNumber(value, 3)}`,
      rowHeader: true,
      columns: [
        { label: 'Window cell' },
        { label: 'Image value', numeric: true },
        { label: 'Kernel weight', numeric: true },
        { label: 'Product', numeric: true }
      ],
      rows
    };
  },

  summary(model, ctx) {
    if (model.empty) return 'The window is larger than the image; choose a smaller window.';
    const [r, c] = model.positions[ctx.step];
    const { value } = convolveAt(model.img, r, c, model.kernel);
    const lines = [];

    lines.push(
      `Output at row ${r + 1}, column ${c + 1} is ${formatNumber(value, 2)}, from an input of ${model.img[r][c]}.`
    );

    lines.push(
      Math.abs(model.kernelSum - 1) < 1e-9
        ? `This kernel sums to 1, so it preserves brightness: on a perfectly flat patch the output would equal the input.`
        : Math.abs(model.kernelSum) < 1e-9
          ? 'This kernel sums to 0, so it measures a difference: on a perfectly flat patch the output would be 0, whatever the shade.'
          : `This kernel sums to ${formatNumber(model.kernelSum, 4)}, so it scales the overall brightness by that factor.`
    );

    lines.push(
      `Across the ${model.positions.length} interior pixels the output runs from ` +
      `${formatNumber(model.outMin, 2)} to ${formatNumber(model.outMax, 2)}.` +
      (model.outMin < 0 || model.outMax > 255
        ? ' Some of those values fall outside 0 to 255, so converting straight back to uint8 would clip them — rescale instead, as in topic 4.1.6.'
        : ' Every value is inside 0 to 255, so no rescaling is needed.')
    );

    if (model.note) lines.push(model.note);
    return lines;
  }
});

/* ==========================================================================
   4.4.10 — Gaussian kernel builder
   ========================================================================== */

createDemo('#demo-gaussian-kernel-mount', {
  id: 'demo-gaussian-kernel',
  title: 'Gaussian kernel builder',
  description:
    'Evaluate the Gaussian at every cell of an n by n window and normalise so the weights sum to 1. ' +
    'At n = 3 and sigma = 1 the result is exactly the kernel printed on the lecture slide.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'n', label: 'Neighbourhood size, n',
      options: [
        { value: '3', label: '3 by 3' },
        { value: '5', label: '5 by 5' },
        { value: '7', label: '7 by 7' }
      ],
      value: '3',
      help: 'Always odd, so that there is a single centre cell for the window to sit on.'
    },
    {
      type: 'range', name: 'sigma', label: 'Standard deviation, sigma',
      min: 0.5, max: 3, step: 0.1, value: 1, unit: 'pixels',
      valueText: (v) => `sigma equals ${v} pixels`,
      help: 'Small sigma trusts the centre pixel; large sigma gives the neighbours more say, and the kernel tends towards a plain box filter.'
    },
    {
      type: 'checkbox', name: 'raw',
      label: 'Show the unnormalised weights instead',
      value: false,
      help: 'Turn this on to see what the kernel looks like before dividing by the total — and what it would do to the brightness of the image if you forgot.'
    }
  ],

  compute(values) {
    const n = Number(values.n);
    const sigma = Number(values.sigma);
    const { kernel, rawTotal } = gaussianKernel(n, sigma);
    const raw = kernel.map((row) => row.map((w) => w * rawTotal));
    const shown = values.raw ? raw : kernel;
    const c = (n - 1) / 2;
    const flat = flatten(kernel);
    return {
      n, sigma, kernel, raw, shown, rawTotal, showingRaw: Boolean(values.raw),
      centre: kernel[c][c],
      edge: n > 1 ? kernel[c - 1] === undefined ? null : kernel[c - 1][c] : null,
      corner: kernel[0][0],
      sum: flat.reduce((a, b) => a + b, 0),
      ratio: kernel[c][c] / kernel[0][0]
    };
  },

  figure(model) {
    const cell = model.n === 3 ? 62 : (model.n === 5 ? 52 : 44);
    const { node, width, height } = numberGrid(model.shown, {
      cell,
      title: model.showingRaw
        ? `Unnormalised weights, n = ${model.n}, sigma = ${formatNumber(model.sigma, 1)}`
        : `Normalised kernel, n = ${model.n}, sigma = ${formatNumber(model.sigma, 1)}`,
      current: `${(model.n - 1) / 2},${(model.n - 1) / 2}`,
      fmt: (v) => formatNumber(v, 4)
    });
    return svgWrap([node], width, height);
  },

  figureAlt(model) {
    return `A ${model.n} by ${model.n} grid of ${model.showingRaw ? 'unnormalised' : 'normalised'} Gaussian ` +
      `weights at sigma ${formatNumber(model.sigma, 1)}. The marked centre cell holds ` +
      `${formatNumber(model.showingRaw ? model.rawTotal * model.centre : model.centre, 4)} and the corner holds ` +
      `${formatNumber(model.showingRaw ? model.rawTotal * model.corner : model.corner, 4)}, ` +
      `a ratio of ${formatNumber(model.ratio, 1)} to 1, and the weights fall away smoothly in every direction.`;
  },

  table(model) {
    const c = (model.n - 1) / 2;
    const cols = [{ label: 'Row' }];
    for (let j = 0; j < model.n; j += 1) {
      cols.push({ label: `Column ${j - c >= 0 ? '+' : ''}${j - c}`, numeric: true });
    }
    const rows = model.shown.map((row, i) => ({
      cells: [`Row ${i - c >= 0 ? '+' : ''}${i - c}`].concat(row.map((w) => formatNumber(w, 4))),
      current: i === c
    }));
    rows.push({
      cells: ['Column sums'].concat(
        model.shown[0].map((unused, j) => formatNumber(model.shown.reduce((a, r) => a + r[j], 0), 4))
      )
    });
    return {
      caption: `${model.showingRaw ? 'Unnormalised' : 'Normalised'} ${model.n} by ${model.n} Gaussian kernel ` +
        `coefficients for sigma = ${formatNumber(model.sigma, 1)}`,
      rowHeader: true,
      columns: cols,
      rows
    };
  },

  summary(model) {
    const lines = [];
    lines.push(
      `n = ${model.n}, sigma = ${formatNumber(model.sigma, 1)}. The normalised weights sum to ` +
      `${formatNumber(model.sum, 4)}; the centre carries ${formatNumber(model.centre * 100, 2)} per cent of the ` +
      `total and each corner carries ${formatNumber(model.corner * 100, 2)} per cent.`
    );
    lines.push(
      `Before normalisation the same weights sum to ${formatNumber(model.rawTotal, 4)}. Applying them without ` +
      `dividing by that total would multiply every pixel by about ${formatNumber(model.rawTotal, 1)} and saturate ` +
      'the image to white — this is the step the lecture code makes and the rendered slide hides.'
    );
    lines.push(
      model.ratio > 3
        ? `The centre outweighs a corner by ${formatNumber(model.ratio, 1)} to 1, so the original pixel dominates its own new value: sharp, but only mild smoothing.`
        : `The centre outweighs a corner by only ${formatNumber(model.ratio, 1)} to 1, so this kernel is close to a plain box filter — every neighbour counts almost the same, and edges will blur.`
    );
    if (model.n === 3 && Math.abs(model.sigma - 1) < 1e-9) {
      lines.push('These nine numbers — 0.0751, 0.1238, 0.0751 / 0.1238, 0.2042, 0.1238 / 0.0751, 0.1238, 0.0751 — are exactly the ones printed on lecture slide P2:28.');
    }
    return lines;
  }
});

/* ==========================================================================
   4.4.7 — Noise and filter laboratory
   ========================================================================== */

function addNoise(img, kind, level, seed) {
  if (kind === 'none' || level === 0) return { noisy: cloneGrid(img), corrupted: 0 };
  const rand = seededRandom(seed);
  const out = cloneGrid(img);
  let corrupted = 0;
  for (let y = 0; y < img.length; y += 1) {
    for (let x = 0; x < img[0].length; x += 1) {
      if (kind === 'sp') {
        const r = rand();
        if (r < level / 200) { out[y][x] = 0; corrupted += 1; }
        else if (r > 1 - level / 200) { out[y][x] = 255; corrupted += 1; }
      } else {
        const u1 = Math.max(rand(), 1e-12);
        const u2 = rand();
        const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const v = clamp255(Math.round(img[y][x] + gauss * level));
        if (v !== img[y][x]) corrupted += 1;
        out[y][x] = v;
      }
    }
  }
  return { noisy: out, corrupted };
}

function applyFilter(img, kind, size, sigma, sigmaR) {
  const r = (size - 1) / 2;
  const out = cloneGrid(img);
  if (kind === 'none') return out;

  for (let y = r; y < img.length - r; y += 1) {
    for (let x = r; x < img[0].length - r; x += 1) {
      if (kind === 'median') {
        const vals = [];
        for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) vals.push(img[y + dy][x + dx]);
        vals.sort((a, b) => a - b);
        out[y][x] = vals[(vals.length - 1) / 2];
      } else if (kind === 'mean') {
        let s = 0;
        for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) s += img[y + dy][x + dx];
        out[y][x] = Math.round(s / (size * size));
      } else if (kind === 'gauss') {
        let num = 0;
        let den = 0;
        for (let dy = -r; dy <= r; dy += 1) {
          for (let dx = -r; dx <= r; dx += 1) {
            const w = Math.exp(-((dx * dx + dy * dy) / (2 * sigma * sigma)));
            num += w * img[y + dy][x + dx];
            den += w;
          }
        }
        out[y][x] = Math.round(num / den);
      } else if (kind === 'bilateral') {
        const centre = img[y][x];
        let num = 0;
        let den = 0;
        for (let dy = -r; dy <= r; dy += 1) {
          for (let dx = -r; dx <= r; dx += 1) {
            const p = img[y + dy][x + dx];
            const w = Math.exp(-((dx * dx + dy * dy) / (2 * sigma * sigma)))
              * Math.exp(-(((p - centre) * (p - centre)) / (2 * sigmaR * sigmaR)));
            num += w * p;
            den += w;
          }
        }
        out[y][x] = Math.round(num / den);
      }
    }
  }
  return out;
}

function mseInterior(a, b, r) {
  let s = 0;
  let n = 0;
  for (let y = r; y < a.length - r; y += 1) {
    for (let x = r; x < a[0].length - r; x += 1) {
      const d = a[y][x] - b[y][x];
      s += d * d;
      n += 1;
    }
  }
  return { mse: n ? s / n : 0, n };
}

function psnr(mse) {
  if (mse <= 0) return Infinity;
  return 20 * Math.log10(255 / Math.sqrt(mse));
}

const FILTER_LABELS = {
  none: 'None (the noisy image)',
  median: 'Median',
  mean: 'Mean (box)',
  gauss: 'Gaussian',
  bilateral: 'Bilateral'
};

createDemo('#demo-noise-filters-mount', {
  id: 'demo-noise-filters',
  title: 'Noise and filter laboratory',
  description:
    'Damage the test image with one of the two noise models, then clean it with each of the four ' +
    'filters and compare the error. The whole lesson of 4.4.7 is that the ranking flips when the ' +
    'noise model changes.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'noise', label: 'Noise model',
      options: [
        { value: 'sp', label: 'Salt and pepper — a few pixels forced to 0 or 255' },
        { value: 'gauss', label: 'Gaussian — every pixel slightly wrong' },
        { value: 'none', label: 'None — the clean image' }
      ],
      value: 'sp'
    },
    {
      type: 'range', name: 'level', label: 'Noise level',
      min: 0, max: 100, step: 5, value: 20,
      valueText: (v) => `${v}: for salt and pepper, ${v} per cent of pixels corrupted; for Gaussian, a standard deviation of ${v} gray levels`,
      help: 'For salt and pepper this is the percentage of pixels corrupted. For Gaussian it is the standard deviation of the error added to every pixel.'
    },
    {
      type: 'seed', name: 'seed', label: 'Random seed',
      value: 42,
      help: 'Every run is reproducible. Quote the seed if you want somebody else to see the same numbers.'
    },
    {
      type: 'select', name: 'filter', label: 'Filter applied',
      options: [
        { value: 'median', label: 'Median — the middle of the sorted window' },
        { value: 'mean', label: 'Mean (box) — the plain average' },
        { value: 'gauss', label: 'Gaussian — a weighted average' },
        { value: 'bilateral', label: 'Bilateral — weighted by distance and by value' },
        { value: 'none', label: 'None — leave the noise alone' }
      ],
      value: 'median'
    },
    {
      type: 'select', name: 'size', label: 'Window size',
      options: [
        { value: '3', label: '3 by 3' },
        { value: '5', label: '5 by 5' }
      ],
      value: '3',
      help: 'A larger window removes more noise, costs more work, and blurs more.'
    },
    {
      type: 'range', name: 'sigma', label: 'Gaussian filter sigma',
      min: 0.5, max: 3, step: 0.1, value: 1, unit: 'pixels',
      valueText: (v) => `sigma equals ${v} pixels`,
      help: 'Used by the Gaussian filter, and as the spatial term of the bilateral filter.'
    },
    {
      type: 'range', name: 'sigmaR', label: 'Bilateral range sigma',
      min: 5, max: 100, step: 5, value: 30, unit: 'gray levels',
      valueText: (v) => `${v} gray levels`,
      help: 'How different in value a neighbour may be before the bilateral filter ignores it. Large values make it behave like a plain Gaussian filter.'
    }
  ],

  compute(values) {
    const size = Number(values.size);
    const r = (size - 1) / 2;
    const sigma = Number(values.sigma);
    const sigmaR = Number(values.sigmaR);
    const clean = TEST_IMAGE;
    const { noisy, corrupted } = addNoise(clean, values.noise, Number(values.level), Number(values.seed));

    const results = ['none', 'median', 'mean', 'gauss', 'bilateral'].map((kind) => {
      const filtered = applyFilter(noisy, kind, size, sigma, sigmaR);
      const { mse, n } = mseInterior(clean, filtered, r);
      return { kind, label: FILTER_LABELS[kind], filtered, mse, psnr: psnr(mse), n };
    });

    const chosen = results.find((x) => x.kind === values.filter) || results[0];
    const best = results.slice(1).reduce((a, b) => (b.mse < a.mse ? b : a));
    const worst = results.slice(1).reduce((a, b) => (b.mse > a.mse ? b : a));

    return {
      clean, noisy, corrupted, results, chosen, best, worst,
      size, sigma, sigmaR, r,
      noiseKind: values.noise, level: Number(values.level), seed: Number(values.seed),
      interior: results[0].n
    };
  },

  figure(model) {
    const width = 620;
    const height = 250;
    const left = 130;
    const top = 34;
    const plotW = width - left - 60;
    const plotH = height - top - 30;
    const g = svgEl('g', {});

    const logOf = (v) => Math.log10(v + 1);
    const maxLog = Math.max(...model.results.map((x) => logOf(x.mse)), 1);

    g.appendChild(svgEl('text', {
      x: 0, y: 14, 'font-size': 12, fill: TOKEN.body,
      text: 'Mean squared error by filter — bar length is logarithmic, the number is the actual error'
    }));

    const rowH = plotH / model.results.length;
    model.results.forEach((res, i) => {
      const y = top + i * rowH + 4;
      const w = Math.max(2, (logOf(res.mse) / maxLog) * plotW);
      const isChosen = res.kind === model.chosen.kind;
      g.appendChild(svgEl('rect', {
        x: left, y, width: w, height: rowH - 12,
        fill: isChosen ? TOKEN.s1 : 'none',
        stroke: isChosen ? TOKEN.accent : TOKEN.s3,
        'stroke-width': isChosen ? 3 : 1.5,
        'stroke-dasharray': isChosen ? null : '5 3'
      }));
      g.appendChild(svgEl('text', {
        x: left - 8, y: y + rowH / 2 - 2, 'font-size': 11, 'text-anchor': 'end',
        'font-weight': isChosen ? '700' : '400', fill: TOKEN.text,
        text: res.label.split(' (')[0] + (isChosen ? ' ◀' : '')
      }));
      g.appendChild(svgEl('text', {
        x: left + w + 6, y: y + rowH / 2 - 2, 'font-size': 11, fill: TOKEN.body,
        text: formatNumber(res.mse, 1)
      }));
    });

    return svgWrap([g], width, height);
  },

  figureAlt(model) {
    const ranked = model.results.slice(1).slice().sort((a, b) => a.mse - b.mse);
    return `With ${model.noiseKind === 'none' ? 'no noise added' : model.noiseKind === 'sp'
      ? `salt-and-pepper noise at ${model.level} per cent` : `Gaussian noise of standard deviation ${model.level}`}, ` +
      `the filters rank ${ranked.map((x) => `${x.label.split(' (')[0]} ${formatNumber(x.mse, 1)}`).join(', then ')}, ` +
      `against ${formatNumber(model.results[0].mse, 1)} for leaving the noise alone. ` +
      `The currently selected filter, ${model.chosen.label.split(' (')[0]}, is marked.`;
  },

  table(model) {
    return {
      caption: `Error over the ${model.interior} interior pixels after ` +
        `${model.noiseKind === 'none' ? 'no noise' : model.noiseKind === 'sp'
          ? `salt-and-pepper noise at ${model.level} per cent` : `Gaussian noise of standard deviation ${model.level}`}` +
        `, seed ${model.seed}, window ${model.size} by ${model.size}. Lower error is better.`,
      rowHeader: true,
      columns: [
        { label: 'Filter' },
        { label: 'MSE', numeric: true },
        { label: 'PSNR', unit: 'dB', numeric: true },
        { label: 'Verdict' }
      ],
      rows: model.results.map((res) => ({
        cells: [
          res.label,
          formatNumber(res.mse, 2),
          Number.isFinite(res.psnr) ? formatNumber(res.psnr, 2) : 'no error',
          res.kind === 'none' ? 'Baseline'
            : res.kind === model.best.kind ? 'Best of the four'
              : res.kind === model.worst.kind ? 'Worst of the four'
                : res.mse < model.results[0].mse ? 'An improvement' : 'Worse than doing nothing'
        ],
        current: res.kind === model.chosen.kind
      }))
    };
  },

  summary(model) {
    const lines = [];

    lines.push(
      model.noiseKind === 'none'
        ? 'No noise was added, so any error you see is the filter itself blurring a clean image — a useful baseline for how much detail each filter costs.'
        : model.noiseKind === 'sp'
          ? `Salt-and-pepper at ${model.level} per cent with seed ${model.seed} corrupted ${model.corrupted} of 144 pixels, ` +
            `forcing each of them to 0 or 255. Error before filtering: MSE ${formatNumber(model.results[0].mse, 2)}, ` +
            `PSNR ${formatNumber(model.results[0].psnr, 2)} decibels.`
          : `Gaussian noise of standard deviation ${model.level} with seed ${model.seed} changed ${model.corrupted} of 144 pixels ` +
            `by a small amount each. Error before filtering: MSE ${formatNumber(model.results[0].mse, 2)}, ` +
            `PSNR ${formatNumber(model.results[0].psnr, 2)} decibels.`
    );

    lines.push(
      `The selected ${model.chosen.label.split(' (')[0]} filter at ${model.size} by ${model.size} leaves ` +
      `MSE ${formatNumber(model.chosen.mse, 2)} and PSNR ` +
      `${Number.isFinite(model.chosen.psnr) ? `${formatNumber(model.chosen.psnr, 2)} decibels` : 'a perfect match'}.`
    );

    if (model.noiseKind !== 'none') {
      const factor = model.worst.mse / Math.max(model.best.mse, 1e-9);
      lines.push(
        `Best of the four here is ${model.best.label.split(' (')[0]} at ${formatNumber(model.best.mse, 2)}; ` +
        `worst is ${model.worst.label.split(' (')[0]} at ${formatNumber(model.worst.mse, 2)}, ` +
        `a factor of ${formatNumber(factor, 1)} between them. ` +
        (model.noiseKind === 'sp'
          ? 'Against impulse noise the median wins because it discards the outlier outright, while every averaging filter mixes it in.'
          : 'Against Gaussian grain the averaging filters win, because averaging many small independent errors cancels them.')
      );
    }

    return lines;
  }
});

/* ==========================================================================
   4.5.3 — Edge detector
   ========================================================================== */

const EDGE_METHODS = {
  news:      { label: 'E statistic (NEWS), the lecture’s detector' },
  sobelx:    { label: 'Sobel X — responds to vertical edges' },
  sobely:    { label: 'Sobel Y — the exam’s kernel, responds to horizontal edges' },
  sobel:     { label: 'Sobel combined — square root of Gx² plus Gy²' },
  prewittx:  { label: 'Prewitt X' },
  prewitty:  { label: 'Prewitt Y' },
  prewitt:   { label: 'Prewitt combined' },
  laplacian: { label: 'Laplacian — second derivative' },
  canny:     { label: 'Canny — smooth, gradient, thin, hysteresis' }
};

function edgeResponses(img, method) {
  const R = img.length;
  const C = img[0].length;
  const out = [];
  for (let r = 1; r < R - 1; r += 1) {
    for (let c = 1; c < C - 1; c += 1) {
      let gx = null;
      let gy = null;
      let mag;
      let detail;

      if (method === 'news') {
        gx = img[r][c + 1] - img[r][c - 1];
        gy = img[r + 1][c] - img[r - 1][c];
        mag = Math.abs(gx) + Math.abs(gy);
        detail = `|${img[r][c + 1]} minus ${img[r][c - 1]}| plus |${img[r + 1][c]} minus ${img[r - 1][c]}|`;
      } else if (method === 'laplacian') {
        mag = Math.abs(convolveAt(img, r, c, KERNELS.laplacian.k).value);
        detail = 'four neighbours minus four times the centre, absolute value';
      } else {
        const kx = method.startsWith('prewitt') ? PREWITT_X : KERNELS.sobelx.k;
        const ky = method.startsWith('prewitt') ? PREWITT_Y : KERNELS.sobely.k;
        gx = convolveAt(img, r, c, kx).value;
        gy = convolveAt(img, r, c, ky).value;
        if (method === 'sobelx' || method === 'prewittx') mag = Math.abs(gx);
        else if (method === 'sobely' || method === 'prewitty') mag = Math.abs(gy);
        else mag = Math.sqrt(gx * gx + gy * gy);
        detail = `Gx ${gx}, Gy ${gy}`;
      }

      out.push({ r, c, gx, gy, mag, detail });
    }
  }
  return out;
}

/** Simplified Canny: Gaussian smooth, Sobel, non-maximum suppression, hysteresis. */
function cannyEdges(img, low) {
  const high = low * 2;
  const smooth = convolveGrid(img, gaussianKernel(3, 1).kernel);
  const R = img.length;
  const C = img[0].length;
  const mag = Array.from({ length: R }, () => new Array(C).fill(0));
  const dir = Array.from({ length: R }, () => new Array(C).fill(0));

  for (let r = 1; r < R - 1; r += 1) {
    for (let c = 1; c < C - 1; c += 1) {
      const gx = convolveAt(smooth, r, c, KERNELS.sobelx.k).value;
      const gy = convolveAt(smooth, r, c, KERNELS.sobely.k).value;
      mag[r][c] = Math.sqrt(gx * gx + gy * gy);
      let angle = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (angle < 0) angle += 180;
      dir[r][c] = angle < 22.5 || angle >= 157.5 ? 0
        : angle < 67.5 ? 45 : angle < 112.5 ? 90 : 135;
    }
  }

  const OFFSETS = { 0: [[0, -1], [0, 1]], 45: [[-1, 1], [1, -1]], 90: [[-1, 0], [1, 0]], 135: [[-1, -1], [1, 1]] };
  const thin = Array.from({ length: R }, () => new Array(C).fill(0));
  for (let r = 1; r < R - 1; r += 1) {
    for (let c = 1; c < C - 1; c += 1) {
      const [p, q] = OFFSETS[dir[r][c]];
      const a = mag[r + p[0]] && mag[r + p[0]][c + p[1]] !== undefined ? mag[r + p[0]][c + p[1]] : 0;
      const b = mag[r + q[0]] && mag[r + q[0]][c + q[1]] !== undefined ? mag[r + q[0]][c + q[1]] : 0;
      thin[r][c] = mag[r][c] >= a && mag[r][c] >= b ? mag[r][c] : 0;
    }
  }

  const strong = Array.from({ length: R }, () => new Array(C).fill(0));
  const weak = [];
  for (let r = 1; r < R - 1; r += 1) {
    for (let c = 1; c < C - 1; c += 1) {
      if (thin[r][c] > high) strong[r][c] = 1;
      else if (thin[r][c] > low) weak.push([r, c]);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    weak.forEach(([r, c]) => {
      if (strong[r][c]) return;
      for (let a = -1; a <= 1; a += 1) {
        for (let b = -1; b <= 1; b += 1) {
          if (strong[r + a] && strong[r + a][c + b]) { strong[r][c] = 1; changed = true; return; }
        }
      }
    });
  }

  return { mag, thin, strong, smooth };
}

createDemo('#demo-edge-detect-mount', {
  id: 'demo-edge-detect',
  title: 'Edge detector',
  description:
    'Compute an edge strength at every interior pixel, then threshold it into a yes-or-no edge map. ' +
    'Step through the pixels to see the arithmetic the final exam asks you to show.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'image', label: 'Image',
      options: [
        { value: 'exam', label: 'Final-exam 4 by 5 matrix — six interior pixels' },
        { value: 'test', label: '12 by 12 test image — one hundred interior pixels' }
      ],
      value: 'exam'
    },
    {
      type: 'select', name: 'method', label: 'Method',
      options: Object.keys(EDGE_METHODS).map((k) => ({ value: k, label: EDGE_METHODS[k].label })),
      value: 'sobely',
      help: 'Sobel Y is the kernel printed on the final exam. The exam calls it "vertical edge detection", but the matrix given differences the rows above and below, so it responds to horizontal edges.'
    },
    {
      type: 'range', name: 'threshold', label: 'Threshold',
      min: 0, max: 255, step: 1, value: 10, unit: 'gray levels',
      valueText: (v) => `${v} gray levels of edge strength`,
      help: 'A pixel is called an edge when its strength is strictly greater than this. For Canny this is the low threshold and twice it is the high one.'
    },
    {
      type: 'checkbox', name: 'reverse', label: 'Reverse video (swap black and white in the edge map)',
      value: false,
      help: 'The eye reads small black details on white better than the other way round, which is why the lecture shows both.'
    }
  ],

  compute(values) {
    const img = values.image === 'exam' ? EXAM_GRAY : TEST_IMAGE;
    const threshold = Number(values.threshold);
    const method = values.method;
    const reverse = Boolean(values.reverse);

    const responses = edgeResponses(img, method === 'canny' ? 'sobel' : method);
    let canny = null;
    if (method === 'canny') canny = cannyEdges(img, threshold);

    const edges = responses.map((res) => {
      const isEdge = method === 'canny'
        ? Boolean(canny.strong[res.r][res.c])
        : res.mag > threshold;
      return { ...res, isEdge };
    });

    const map = cloneGrid(img).map((row) => row.map(() => (reverse ? 255 : 0)));
    edges.forEach((e) => { map[e.r][e.c] = e.isEdge ? (reverse ? 0 : 255) : (reverse ? 255 : 0); });

    const edgeCount = edges.filter((e) => e.isEdge).length;
    const strengths = edges.filter((e) => e.isEdge).map((e) => e.mag);

    return {
      img, map, edges, method, threshold, reverse, canny,
      methodLabel: EDGE_METHODS[method].label,
      edgeCount,
      density: edges.length ? (edgeCount / edges.length) * 100 : 0,
      meanStrength: strengths.length ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 0,
      maxStrength: edges.length ? Math.max(...edges.map((e) => e.mag)) : 0
    };
  },

  steps: {
    count: (model) => Math.max(1, model.edges.length),
    label: (model, i) => {
      const e = model.edges[i];
      if (!e) return 'This image has no interior pixel.';
      const verdict = e.isEdge
        ? `above the threshold of ${model.threshold}, so this pixel is marked as an edge`
        : `not above the threshold of ${model.threshold}, so this pixel is not an edge`;
      return `Row ${e.r + 1}, column ${e.c + 1}: ${e.detail}, giving an edge strength of ` +
        `${formatNumber(e.mag, 2)} — ${verdict}.`;
    }
  },

  figure(model, ctx) {
    const e = model.edges[ctx.step];
    const cell = model.img[0].length > 8 ? 24 : 34;
    const cur = e ? `${e.r},${e.c}` : null;
    const probe = new Set();
    if (e) {
      for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) probe.add(`${e.r + a},${e.c + b}`);
    }

    const inGrid = numberGrid(model.img, {
      x: 0, y: 0, cell, title: 'Input image — the 3 by 3 window is outlined',
      current: cur, probe
    });
    const mapGrid = numberGrid(model.map, {
      x: 0, y: inGrid.height + 16, cell,
      title: `Edge map after thresholding at ${model.threshold}` +
        (model.reverse ? ' (reverse video: 0 marks an edge)' : ' (255 marks an edge)'),
      current: cur
    });
    return svgWrap([inGrid.node, mapGrid.node],
      Math.max(inGrid.width, mapGrid.width), inGrid.height + 16 + mapGrid.height);
  },

  figureAlt(model, ctx) {
    const e = model.edges[ctx.step];
    if (!e) return 'The image has no interior pixel, so there is nothing to measure.';
    return `Step ${ctx.step + 1} of ${model.edges.length}. At row ${e.r + 1}, column ${e.c + 1} the ` +
      `${model.methodLabel} gives an edge strength of ${formatNumber(e.mag, 2)}, which is ` +
      `${e.isEdge ? 'above' : 'not above'} the threshold of ${model.threshold}. ` +
      `Across the whole image ${model.edgeCount} of ${model.edges.length} interior pixels are marked as edges.`;
  },

  table(model, ctx) {
    const rows = model.edges.map((e, i) => ({
      cells: [
        `row ${e.r + 1}, col ${e.c + 1}`,
        e.gx === null ? '—' : formatNumber(e.gx, 2),
        e.gy === null ? '—' : formatNumber(e.gy, 2),
        formatNumber(e.mag, 2),
        e.isEdge ? 'Yes — edge' : 'No'
      ],
      current: i === ctx.step
    }));
    rows.push({
      cells: ['Whole image', '—', '—', formatNumber(model.maxStrength, 2),
        `${model.edgeCount} of ${model.edges.length} pixels, ${formatNumber(model.density, 1)} per cent`]
    });
    return {
      caption: `${model.methodLabel} on every interior pixel, thresholded at ${model.threshold}`,
      rowHeader: true,
      columns: [
        { label: 'Pixel' },
        { label: 'Gx', numeric: true },
        { label: 'Gy', numeric: true },
        { label: 'Edge strength', numeric: true },
        { label: 'Above threshold?' }
      ],
      rows
    };
  },

  summary(model, ctx) {
    const e = model.edges[ctx.step];
    const lines = [];

    if (e) {
      lines.push(
        `At row ${e.r + 1}, column ${e.c + 1}: ${e.detail}. Edge strength ${formatNumber(e.mag, 2)}, ` +
        `threshold ${model.threshold}, verdict ${e.isEdge ? 'edge' : 'not an edge'}.`
      );
    }

    lines.push(
      `${model.methodLabel}: ${model.edgeCount} of ${model.edges.length} interior pixels are marked as edges, ` +
      `an edge density of ${formatNumber(model.density, 1)} per cent. The strongest response anywhere is ` +
      `${formatNumber(model.maxStrength, 2)}` +
      (model.edgeCount
        ? `, and the mean strength over the marked pixels is ${formatNumber(model.meanStrength, 2)}.`
        : ', and nothing survives the threshold.')
    );

    if (model.method === 'canny') {
      lines.push(
        `Canny used ${model.threshold} as the low threshold and ${model.threshold * 2} as the high one: ` +
        'a pixel above the high threshold is always an edge, and a pixel between the two is an edge only if ' +
        'it connects to a strong one. Non-maximum suppression has already thinned the ridge to one pixel wide.'
      );
    } else if (model.method === 'sobely') {
      lines.push(
        'This is the kernel printed on the final exam. It differences the row above against the row below, ' +
        'weighting the middle column double, so a horizontal boundary gives a large value and a vertical one gives zero.'
      );
    } else if (model.method === 'news') {
      lines.push(
        'The E statistic uses only two neighbours per direction and no smoothing, so it is the cheapest ' +
        'detector here and the most easily fooled by a single noisy pixel.'
      );
    }

    if (model.reverse) {
      lines.push('Reverse video is on, so in the edge map 0 marks an edge and 255 marks background — the numbers are inverted, the decisions are not.');
    }

    return lines;
  }
});

/* ==========================================================================
   4.6.3 — Two-pass labelling step-through
   ========================================================================== */

function twoPassLabel(grid, connectivity) {
  const R = grid.length;
  const C = grid[0].length;
  const labels = Array.from({ length: R }, () => new Array(C).fill(0));
  const parent = new Map();
  const log = [];
  const merges = [];
  let next = 0;

  const find = (x) => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    let walk = x;
    while (parent.get(walk) !== walk) {
      const up = parent.get(walk);
      parent.set(walk, root);
      walk = up;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    if (ra < rb) parent.set(rb, ra); else parent.set(ra, rb);
    return true;
  };

  const offsets = connectivity === 8
    ? [[-1, -1], [-1, 0], [-1, 1], [0, -1]]
    : [[-1, 0], [0, -1]];

  for (let i = 0; i < R; i += 1) {
    for (let j = 0; j < C; j += 1) {
      if (grid[i][j] === 0) continue;

      const found = [];
      offsets.forEach(([di, dj]) => {
        const ii = i + di;
        const jj = j + dj;
        if (ii >= 0 && ii < R && jj >= 0 && jj < C && labels[ii][jj] !== 0) {
          found.push({ label: labels[ii][jj], di, dj });
        }
      });

      let assigned;
      let kase;
      const recorded = [];

      if (found.length === 0) {
        next += 1;
        parent.set(next, next);
        assigned = next;
        kase = 'Case 1: new component';
      } else {
        const min = Math.min(...found.map((f) => f.label));
        assigned = min;
        const distinct = Array.from(new Set(found.map((f) => f.label)));
        if (distinct.length === 1) {
          kase = 'Case 2: continue a component';
        } else {
          kase = 'Case 3: merge — two labels touch';
          distinct.forEach((l) => {
            if (l !== min && union(min, l)) {
              recorded.push([l, min]);
              merges.push([l, min]);
            }
          });
        }
      }

      labels[i][j] = assigned;
      log.push({
        i, j, kase, assigned,
        neighbours: found.map((f) => ({ label: f.label, name: neighbourName(f.di, f.dj) })),
        recorded
      });
    }
  }

  const roots = Array.from(new Set(Array.from(parent.keys()).map(find))).sort((a, b) => a - b);
  const rename = new Map();
  roots.forEach((r, idx) => rename.set(r, idx + 1));

  const equivalence = Array.from(parent.keys()).sort((a, b) => a - b).map((l) => ({
    label: l,
    root: find(l),
    final: rename.get(find(l))
  }));

  const final = labels.map((row) => row.map((l) => (l === 0 ? 0 : rename.get(find(l)))));
  const sizes = new Map();
  final.forEach((row) => row.forEach((v) => { if (v) sizes.set(v, (sizes.get(v) || 0) + 1); }));

  return { labels, final, log, merges, equivalence, provisional: next, components: roots.length, sizes };
}

createDemo('#demo-components-two-pass-mount', {
  id: 'demo-components-two-pass',
  title: 'Two-pass labelling step-through',
  description:
    'Raster-scan a binary image, hand out provisional labels from the already-visited neighbours, ' +
    'record every collision, then resolve the equivalence chains and renumber. Switching between ' +
    '4- and 8-connectivity changes the answer, and the demo says by how much.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'pattern', label: 'Binary image',
      options: Object.keys(COMPONENT_PATTERNS).map((k) => ({ value: k, label: COMPONENT_PATTERNS[k].label })),
      value: 'comb'
    },
    {
      type: 'radio', name: 'conn', label: 'Connectivity',
      options: [
        { value: '4', label: '4-connected — neighbours share an edge' },
        { value: '8', label: '8-connected — neighbours share an edge or a corner' }
      ],
      value: '4',
      help: 'In raster order the first pass can only consult already-visited neighbours: 2 of them under 4-connectivity, 4 under 8.'
    }
  ],

  compute(values) {
    const grid = COMPONENT_PATTERNS[values.pattern].grid;
    const conn = Number(values.conn);
    const run = twoPassLabel(grid, conn);
    const other = twoPassLabel(grid, conn === 4 ? 8 : 4);
    return {
      grid, conn, ...run,
      otherConn: conn === 4 ? 8 : 4,
      otherComponents: other.components,
      patternLabel: COMPONENT_PATTERNS[values.pattern].label,
      foreground: flatten(grid).filter((v) => v === 1).length
    };
  },

  steps: {
    count: (model) => model.log.length + 2,
    label: (model, i) => {
      if (i < model.log.length) {
        const e = model.log[i];
        const nb = e.neighbours.length
          ? `Its already-visited neighbours carry ${e.neighbours.map((n) => `${n.label} (${n.name})`).join(' and ')}.`
          : 'Neither already-visited neighbour is foreground.';
        const merge = e.recorded.length
          ? ` Recorded: label ${e.recorded.map(([a, b]) => `${a} is the same component as ${b}`).join(', ')}.`
          : '';
        return `Pass 1, pixel ${i + 1} of ${model.log.length}, at row ${e.i + 1}, column ${e.j + 1}. ` +
          `${nb} ${e.kase}, so it takes label ${e.assigned}.${merge}`;
      }
      if (i === model.log.length) {
        return `Resolution: the first pass used ${model.provisional} provisional labels and recorded ` +
          `${model.merges.length} collision${model.merges.length === 1 ? '' : 's'}. Following every chain to its ` +
          `smallest label leaves ${model.components} distinct root${model.components === 1 ? '' : 's'}, ` +
          `renumbered 1 to ${model.components}.`;
      }
      return `Pass 2: every pixel has been rewritten with its final label. The image contains ` +
        `${model.components} component${model.components === 1 ? '' : 's'}, of sizes ` +
        `${Array.from(model.sizes.values()).join(', ')} pixels.`;
    }
  },

  figure(model, ctx) {
    const step = ctx.step;
    let shown;
    let title;
    let current = null;

    if (step < model.log.length) {
      shown = model.grid.map((row) => row.map((v) => (v === 1 ? '?' : 0)));
      for (let k = 0; k <= step; k += 1) {
        const e = model.log[k];
        shown[e.i][e.j] = e.assigned;
      }
      const e = model.log[step];
      current = `${e.i},${e.j}`;
      title = `Pass 1 in progress — provisional labels; a question mark is a foreground pixel not yet reached`;
    } else if (step === model.log.length) {
      shown = model.labels;
      title = `All ${model.provisional} provisional labels, before resolution`;
    } else {
      shown = model.final;
      title = `Final labels, 1 to ${model.components}`;
    }

    const { node, width, height } = numberGrid(shown, { cell: 30, title, current });
    return svgWrap([node], width, height);
  },

  figureAlt(model, ctx) {
    const step = ctx.step;
    if (step < model.log.length) {
      const e = model.log[step];
      const used = new Set(model.log.slice(0, step + 1).map((x) => x.assigned)).size;
      return `Pass 1, step ${step + 1} of ${model.log.length}: the scan has reached row ${e.i + 1}, ` +
        `column ${e.j + 1} and given it label ${e.assigned}. ${used} distinct label` +
        `${used === 1 ? ' has' : 's have'} been used so far, and ` +
        `${model.log.length - step - 1} foreground pixel${model.log.length - step - 1 === 1 ? '' : 's'} remain unlabelled.`;
    }
    if (step === model.log.length) {
      return `The complete provisional labelling: ${model.provisional} labels across ` +
        `${model.foreground} foreground pixels, which is ${model.provisional - model.components} more than ` +
        'the number of components, because the first pass cannot see ahead.';
    }
    return `The final labelling: ${model.components} components numbered 1 to ${model.components}, ` +
      `of sizes ${Array.from(model.sizes.values()).join(', ')} pixels, on a background of 0.`;
  },

  table(model, ctx) {
    const step = ctx.step;

    if (step === model.log.length) {
      return {
        caption: `Equivalence table: ${model.provisional} provisional labels resolve to ` +
          `${model.components} components under ${model.conn}-connectivity`,
        rowHeader: true,
        columns: [
          { label: 'Provisional label', numeric: true },
          { label: 'Root after following the chain', numeric: true },
          { label: 'Final component', numeric: true },
          { label: 'Was it merged?' }
        ],
        rows: model.equivalence.map((e) => ({
          cells: [e.label, e.root, e.final, e.root === e.label ? 'No — it is its own root' : `Yes — into ${e.root}`],
          current: e.root !== e.label
        }))
      };
    }

    if (step > model.log.length) {
      return {
        caption: `Component sizes under ${model.conn}-connectivity`,
        rowHeader: true,
        columns: [
          { label: 'Component', numeric: true },
          { label: 'Pixels', numeric: true },
          { label: 'Share of the foreground', unit: '%', numeric: true }
        ],
        rows: Array.from(model.sizes.entries()).sort((a, b) => a[0] - b[0]).map(([id, size]) => ({
          cells: [id, size, formatNumber((size / model.foreground) * 100, 1)]
        }))
      };
    }

    return {
      caption: `Pass 1 decision log: every foreground pixel in raster order, under ` +
        `${model.conn}-connectivity`,
      rowHeader: true,
      columns: [
        { label: 'Pixel' },
        { label: 'Already-visited neighbours' },
        { label: 'Case' },
        { label: 'Label assigned', numeric: true },
        { label: 'Equivalence recorded' }
      ],
      rows: model.log.map((e, i) => ({
        cells: [
          `row ${e.i + 1}, col ${e.j + 1}`,
          e.neighbours.length ? e.neighbours.map((n) => `${n.label} ${n.name}`).join('; ') : 'none',
          e.kase,
          e.assigned,
          e.recorded.length ? e.recorded.map(([a, b]) => `${a} = ${b}`).join(', ') : '—'
        ],
        current: i === step
      }))
    };
  },

  summary(model, ctx) {
    const lines = [];
    lines.push(
      `${model.patternLabel}, ${model.conn}-connected: ${model.foreground} foreground pixels, ` +
      `${model.provisional} provisional labels in pass 1, ${model.merges.length} collision` +
      `${model.merges.length === 1 ? '' : 's'} recorded, ${model.components} component` +
      `${model.components === 1 ? '' : 's'} in the end, of sizes ` +
      `${Array.from(model.sizes.values()).join(', ')} pixels.`
    );

    if (ctx.step < model.log.length) {
      const done = ctx.step + 1;
      lines.push(`Pass 1 is ${formatNumber((done / model.log.length) * 100, 0)} per cent complete: ` +
        `${done} of ${model.log.length} foreground pixels labelled.`);
    }

    lines.push(
      model.components === model.otherComponents
        ? `Switching to ${model.otherConn}-connectivity would give the same count, ${model.otherComponents} components: ` +
          'this pattern has no diagonal-only contacts.'
        : `Switching to ${model.otherConn}-connectivity would give ${model.otherComponents} component` +
          `${model.otherComponents === 1 ? '' : 's'} instead of ${model.components}, because ` +
          `${model.conn === 4 ? 'pixels that touch only at a corner would then count as connected' : 'corner-only contacts would stop counting as connections'}. ` +
          'Neither answer is wrong; they answer different questions, so always state which rule you used.'
    );

    return lines;
  }
});

/* ==========================================================================
   4.6.11 — Morphology explorer
   ========================================================================== */

function dilateGrid(grid, offsets) {
  const R = grid.length;
  const C = grid[0].length;
  return grid.map((row, i) => row.map((unused, j) => (
    offsets.some(([a, b]) => {
      const ii = i + a;
      const jj = j + b;
      return ii >= 0 && ii < R && jj >= 0 && jj < C && grid[ii][jj] === 1;
    }) ? 1 : 0
  )));
}

function erodeGrid(grid, offsets) {
  const R = grid.length;
  const C = grid[0].length;
  return grid.map((row, i) => row.map((unused, j) => (
    offsets.every(([a, b]) => {
      const ii = i + a;
      const jj = j + b;
      return ii >= 0 && ii < R && jj >= 0 && jj < C && grid[ii][jj] === 1;
    }) ? 1 : 0
  )));
}

const MORPH_OPS = {
  dilate: { label: 'Dilation — A ⊕ B', stages: ['dilate'] },
  erode:  { label: 'Erosion — A ⊖ B', stages: ['erode'] },
  open:   { label: 'Opening — erode, then dilate', stages: ['erode', 'dilate'] },
  close:  { label: 'Closing — dilate, then erode', stages: ['dilate', 'erode'] }
};

createDemo('#demo-morphology-mount', {
  id: 'demo-morphology',
  title: 'Morphology explorer',
  description:
    'Place the structuring element on every position in turn. Dilation asks whether it touches the ' +
    'object anywhere; erosion asks whether it fits entirely inside. Opening and closing compose the ' +
    'two in the two possible orders, and the order is the whole difference.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'pattern', label: 'Binary image',
      options: Object.keys(MORPH_PATTERNS).map((k) => ({ value: k, label: MORPH_PATTERNS[k].label })),
      value: 'exam'
    },
    {
      type: 'select', name: 'op', label: 'Operation',
      options: Object.keys(MORPH_OPS).map((k) => ({ value: k, label: MORPH_OPS[k].label })),
      value: 'dilate'
    },
    {
      type: 'select', name: 'se', label: 'Structuring element',
      options: Object.keys(STRUCTURING_ELEMENTS).map((k) => ({ value: k, label: STRUCTURING_ELEMENTS[k].label })),
      value: 'cross',
      help: 'Both of these are symmetric, so reflecting them changes nothing — which is why the reflection in the textbook definition is easy to overlook.'
    }
  ],

  compute(values) {
    const input = MORPH_PATTERNS[values.pattern].grid;
    const offsets = STRUCTURING_ELEMENTS[values.se].offsets;
    const stages = MORPH_OPS[values.op].stages;

    let current = input;
    const stageResults = [];
    stages.forEach((s) => {
      current = s === 'dilate' ? dilateGrid(current, offsets) : erodeGrid(current, offsets);
      stageResults.push({ stage: s, grid: current });
    });

    const finalStage = stages[stages.length - 1];
    const finalInput = stages.length === 1 ? input : stageResults[0].grid;
    const output = stageResults[stageResults.length - 1].grid;

    const R = input.length;
    const C = input[0].length;
    const positions = [];
    for (let i = 0; i < R; i += 1) {
      for (let j = 0; j < C; j += 1) {
        const cells = offsets.map(([a, b]) => {
          const ii = i + a;
          const jj = j + b;
          const inside = ii >= 0 && ii < R && jj >= 0 && jj < C;
          return { a, b, i: ii, j: jj, inside, value: inside ? finalInput[ii][jj] : 0 };
        });
        const hits = cells.filter((c) => c.value === 1).length;
        positions.push({
          i, j, cells, hits,
          fits: hits === offsets.length,
          result: output[i][j]
        });
      }
    }

    const count = (g) => flatten(g).filter((v) => v === 1).length;

    return {
      input, finalInput, output, offsets, positions, stages, finalStage,
      opLabel: MORPH_OPS[values.op].label,
      op: values.op,
      seLabel: STRUCTURING_ELEMENTS[values.se].label,
      before: count(input),
      after: count(output),
      intermediate: stages.length > 1 ? count(stageResults[0].grid) : null,
      patternLabel: MORPH_PATTERNS[values.pattern].label,
      total: R * C
    };
  },

  steps: {
    count: (model) => model.positions.length,
    label: (model, i) => {
      const p = model.positions[i];
      const test = model.finalStage === 'dilate'
        ? `${p.hits} of the ${model.offsets.length} probe cells sit on a foreground pixel, so the intersection is ` +
          `${p.hits > 0 ? 'not empty and the output is 1' : 'empty and the output is 0'}`
        : `${p.hits} of the ${model.offsets.length} probe cells sit on a foreground pixel, so the probe ` +
          `${p.fits ? 'fits entirely inside and the output is 1' : 'does not fit and the output is 0'}`;
      const stageNote = model.stages.length > 1
        ? ` This is the ${model.finalStage === 'dilate' ? 'dilation' : 'erosion'} half of the ${model.op === 'open' ? 'opening' : 'closing'}, working on the intermediate result.`
        : '';
      return `Position row ${p.i + 1}, column ${p.j + 1}: ${test}.${stageNote}`;
    }
  },

  figure(model, ctx) {
    const p = model.positions[ctx.step];
    const probe = new Set();
    p.cells.forEach((c) => { if (c.inside) probe.add(`${c.i},${c.j}`); });

    const cell = model.input[0].length > 6 ? 26 : 34;
    const inTitle = model.stages.length > 1
      ? `Input to this stage (after the ${model.stages[0] === 'dilate' ? 'dilation' : 'erosion'}) — the probe is outlined`
      : 'Input image — the probe is outlined at the current position';
    const inGrid = numberGrid(model.finalInput, {
      x: 0, y: 0, cell, title: inTitle, current: `${p.i},${p.j}`, probe
    });
    const outGrid = numberGrid(model.output, {
      x: 0, y: inGrid.height + 16, cell,
      title: `Result of ${model.opLabel}`, current: `${p.i},${p.j}`
    });
    return svgWrap([inGrid.node, outGrid.node],
      Math.max(inGrid.width, outGrid.width), inGrid.height + 16 + outGrid.height);
  },

  figureAlt(model, ctx) {
    const p = model.positions[ctx.step];
    return `Step ${ctx.step + 1} of ${model.positions.length}. The ${model.seLabel} probe is placed on ` +
      `row ${p.i + 1}, column ${p.j + 1}, covering ${p.hits} foreground pixel${p.hits === 1 ? '' : 's'} ` +
      `out of ${model.offsets.length}, so the output there is ${p.result}. The finished result has ` +
      `${model.after} foreground pixels against ${model.before} in the original.`;
  },

  table(model, ctx) {
    return {
      caption: `${model.opLabel} with the ${model.seLabel} on the ${model.patternLabel}: one row per ` +
        `output position, ${model.positions.length} in all`,
      rowHeader: true,
      columns: [
        { label: 'Position' },
        { label: 'Probe cells on foreground', numeric: true },
        { label: 'Probe cells total', numeric: true },
        { label: 'Touches the object?' },
        { label: 'Fits inside?' },
        { label: 'Output', numeric: true }
      ],
      rows: model.positions.map((p, i) => ({
        cells: [
          `row ${p.i + 1}, col ${p.j + 1}`,
          p.hits,
          model.offsets.length,
          p.hits > 0 ? 'Yes' : 'No',
          p.fits ? 'Yes' : 'No',
          p.result
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model) {
    const lines = [];
    const change = model.after - model.before;

    lines.push(
      `${model.opLabel} with the ${model.seLabel} on the ${model.patternLabel}: the foreground goes from ` +
      `${model.before} pixels to ${model.after} out of ${model.total}` +
      (model.intermediate !== null ? `, by way of an intermediate result of ${model.intermediate}` : '') + '.'
    );

    if (model.op === 'dilate') {
      lines.push('Dilation grew the object outward by the size of the structuring element, filling small gaps and connecting nearby regions.');
    } else if (model.op === 'erode') {
      lines.push(model.after === 0
        ? 'Erosion removed the object entirely: there is nowhere the structuring element fits inside it, so the object is thinner than the probe everywhere.'
        : 'Erosion shrank the object inward by the size of the structuring element, removing thin features and anything the probe could not fit inside.');
    } else if (model.op === 'open') {
      lines.push(change === 0
        ? 'Opening left the foreground count unchanged: nothing in this image is thinner than the probe, so the erosion took only the outer layer and the dilation put it straight back.'
        : `Opening removed ${-change} pixel${-change === 1 ? '' : 's'} — the parts too thin for the probe to fit inside. Anything the erosion destroyed is gone for good, because the dilation has nothing left to grow from. This is the despeckle operation.`);
    } else {
      lines.push(change === 0
        ? 'Closing left the foreground count unchanged: there is no gap or hole small enough for the dilation to seal that the erosion cannot reopen.'
        : `Closing added ${change} pixel${change === 1 ? '' : 's'} — the holes and notches smaller than the probe, sealed by the dilation and not reopened by the erosion. This is the hole-fill operation.`);
    }

    lines.push(
      'Cells of the probe that hang off the edge of the image are treated as background, which is why ' +
      'erosion always clears a border of the image. Say which convention you used when you write this up.'
    );

    return lines;
  }
});

})(window);
