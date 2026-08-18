/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m2-probability.js — every interactive demo on m2-probability.html
   ==========================================================================

   ISC 4221C (2026). Vanilla ES module, no dependencies, no network access.
   Imports only from ../demo.js, which supplies the accessible widget runtime:
   labelled controls, the Figure / Table / Both toggle, the aria-live summary,
   the playback bar, and the CSV export.

   THIRTEEN DEMOS, in page order

     demo-event-venn            2.1.9   two-set Venn with a TRUE lens area
     demo-bayes-testing         2.1.10  natural-frequency disease testing   [NEW]
     demo-lcg-lab               2.2.7   LCG, runs test, lag-1 scatter
     demo-discrete-rv           2.3.5   PMF -> CDF -> mean -> variance
     demo-distribution-gallery  2.3.11  named continuous / discrete families
     demo-clt-dice              2.4.2   histograms of sample means, n = 1..50
     demo-mc-pi                 2.5.3   integration by darts, with a CI
     demo-mc-integration        2.5.4   Monte Carlo versus equispaced, 1-D
     demo-curse-dimension       2.5.8   unit d-ball; grid cost versus MC cost
     demo-mc-optimization       2.5.10  random search with zoom (Lab 06)     [NEW]
     demo-random-walk           2.6.2   2-D walk, diffusion cloud, GBM
     demo-dispersion            2.6.5   RK4 advection + Brownian diffusion   [NEW]
     demo-secretary             2.6.7   look-then-leap and the 37% rule

   DATA PROVENANCE
   Dashboard/assets/data/ held no precomputed M2 trace when this page was
   built, so every number on this page is computed in the browser instead.
   Every demo that samples anything is driven by seededRandom() from demo.js
   (mulberry32) through a visible, editable seed control, so a run is exactly
   reproducible from the settings shown on screen. Nothing reads the clock.

   COLOUR
   No literal colour appears in this file. Series colours are pulled from the
   token custom properties through S(n); every series ALSO carries a distinct
   marker shape or dash pattern and a direct text label, so nothing depends on
   colour perception (WCAG 1.4.1).
   ========================================================================== */

const { createDemo, svgEl, seededRandom, formatNumber } = window.Demo;
/* ==========================================================================
   0. Tokens, maths helpers, and a very small chart kit
   ========================================================================== */

const INK = 'var(--fsu-color-body)';
const QUIET = 'var(--fsu-color-caption)';
const AXIS = 'var(--fsu-chart-axis)';
const GRID = 'var(--fsu-chart-gridline)';
const SURFACE = 'var(--fsu-surface)';
const TEXT_SM = 'var(--fsu-text-small)';
const TEXT_MD = 'var(--fsu-text-body)';
const BOLD = 'var(--fsu-weight-bold)';

/** Series colour n (1-6), in the order the palette prescribes. */
const S = (n) => `var(--fsu-series-${((n - 1) % 6) + 1})`;

const f = formatNumber;

/** Thousands separators without Intl locale surprises. */
function group(n) {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function sum(a) { let t = 0; for (let i = 0; i < a.length; i++) t += a[i]; return t; }

function mean(a) { return a.length ? sum(a) / a.length : 0; }

function variance(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  let t = 0;
  for (let i = 0; i < a.length; i++) t += (a[i] - m) * (a[i] - m);
  return t / a.length;
}

/** Log-gamma (Lanczos, g = 7). Used for the named distribution densities. */
function lgamma(z) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  const zz = z - 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (zz + i);
  const t = zz + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Abramowitz & Stegun 7.1.26. Max absolute error 1.5e-7 — plenty here. */
function erf(x) {
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

function normPdf(x, mu, sd) {
  const z = (x - mu) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** Standard normal draw (Box-Muller) from a uniform generator. */
function gauss(rnd) {
  let u = rnd();
  if (u < 1e-12) u = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Human-friendly tick positions inside [lo, hi]. */
function ticks(lo, hi, count) {
  const span = (hi - lo) || 1;
  const raw = span / (count || 5);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Number(v.toPrecision(12)));
  }
  return out;
}

/** An SVG <text> node. Size and colour always come from tokens. */
function txt(x, y, value, o) {
  const opt = o || {};
  return svgEl('text', {
    x, y,
    'text-anchor': opt.anchor || 'middle',
    style: 'font-size: ' + (opt.size || TEXT_SM) +
           '; fill: ' + (opt.fill || INK) +
           '; font-weight: ' + (opt.weight || 'var(--fsu-weight-regular)') + ';',
    text: value
  });
}

/**
 * A tiny linear-scale chart kit. Returns an object exposing the SVG root, the
 * two scale functions, and helpers that append into a drawing layer.
 */
function chart(o) {
  const W = o.width || 620;
  const H = o.height || 340;
  const m = Object.assign({ top: 24, right: 26, bottom: 56, left: 74 }, o.margin || {});
  const x0 = o.x[0], x1 = o.x[1], y0 = o.y[0], y1 = o.y[1];
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + W + ' ' + H,
    style: 'font-family: var(--fsu-font-sans);'
  });
  const back = svgEl('g');
  const front = svgEl('g');
  svg.appendChild(back);
  svg.appendChild(front);

  const sx = (v) => m.left + ((v - x0) / ((x1 - x0) || 1)) * iw;
  const sy = (v) => m.top + ih - ((v - y0) / ((y1 - y0) || 1)) * ih;

  const api = {
    svg, sx, sy, W, H, m, iw, ih,
    add(node) { front.appendChild(node); return node; },
    behind(node) { back.appendChild(node); return node; },

    axes(cfg) {
      const c = cfg || {};
      const xt = c.xTicks || ticks(x0, x1, 6);
      const yt = c.yTicks || ticks(y0, y1, 5);
      const fx = c.fx || ((v) => String(v));
      const fy = c.fy || ((v) => String(v));

      yt.forEach((v) => {
        if (v < y0 - 1e-9 || v > y1 + 1e-9) return;
        api.behind(svgEl('line', {
          x1: m.left, x2: m.left + iw, y1: sy(v), y2: sy(v),
          style: 'stroke: ' + GRID + '; stroke-width: 1;'
        }));
        api.behind(txt(m.left - 8, sy(v) + 4, fy(v), { anchor: 'end', fill: QUIET }));
      });

      xt.forEach((v) => {
        if (v < x0 - 1e-9 || v > x1 + 1e-9) return;
        api.behind(svgEl('line', {
          x1: sx(v), x2: sx(v), y1: m.top + ih, y2: m.top + ih + 5,
          style: 'stroke: ' + AXIS + '; stroke-width: 1;'
        }));
        api.behind(txt(sx(v), m.top + ih + 20, fx(v), { fill: QUIET }));
      });

      api.behind(svgEl('line', {
        x1: m.left, x2: m.left + iw, y1: m.top + ih, y2: m.top + ih,
        style: 'stroke: ' + AXIS + '; stroke-width: 1.5;'
      }));
      api.behind(svgEl('line', {
        x1: m.left, x2: m.left, y1: m.top, y2: m.top + ih,
        style: 'stroke: ' + AXIS + '; stroke-width: 1.5;'
      }));

      if (c.xLabel) {
        api.behind(txt(m.left + iw / 2, H - 10, c.xLabel, { size: TEXT_MD }));
      }
      if (c.yLabel) {
        const t = txt(0, 0, c.yLabel, { size: TEXT_MD });
        t.setAttribute('transform', 'translate(16,' + (m.top + ih / 2) + ') rotate(-90)');
        api.behind(t);
      }
      return api;
    },

    /** A polyline through data-space points, dashed or solid. */
    line(points, o2) {
      const opt = o2 || {};
      const d = points.map((p, i) => (i ? 'L' : 'M') + sx(p[0]) + ' ' + sy(p[1])).join(' ');
      return api.add(svgEl('path', {
        d,
        style: 'fill: none; stroke: ' + (opt.stroke || S(1)) +
               '; stroke-width: ' + (opt.width || 2) +
               '; stroke-dasharray: ' + (opt.dash || 'none') + ';'
      }));
    },

    /** Markers whose SHAPE differs per series, so colour is never alone. */
    mark(x, y, shape, o2) {
      const opt = o2 || {};
      const cx = sx(x), cy = sy(y), r = opt.r || 4;
      const style = 'fill: ' + (opt.fill || 'none') +
                    '; stroke: ' + (opt.stroke || S(1)) +
                    '; stroke-width: ' + (opt.width || 1.6) + ';';
      if (shape === 'circle') return api.add(svgEl('circle', { cx, cy, r, style }));
      if (shape === 'square') {
        return api.add(svgEl('rect', { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, style }));
      }
      if (shape === 'cross') {
        return api.add(svgEl('path', {
          d: 'M' + (cx - r) + ' ' + (cy - r) + 'L' + (cx + r) + ' ' + (cy + r) +
             'M' + (cx - r) + ' ' + (cy + r) + 'L' + (cx + r) + ' ' + (cy - r),
          style: 'fill: none; stroke: ' + (opt.stroke || S(1)) + '; stroke-width: ' + (opt.width || 1.6) + ';'
        }));
      }
      if (shape === 'star') {
        let d = '';
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? r * 0.45 : r * 1.25;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)) + ' ' + (cy + rr * Math.sin(a));
        }
        return api.add(svgEl('path', { d: d + 'Z', style }));
      }
      if (shape === 'triangle') {
        return api.add(svgEl('path', {
          d: 'M' + cx + ' ' + (cy - r * 1.2) + 'L' + (cx + r * 1.1) + ' ' + (cy + r * 0.9) +
             'L' + (cx - r * 1.1) + ' ' + (cy + r * 0.9) + 'Z',
          style
        }));
      }
      return api.add(svgEl('circle', { cx, cy, r, style }));
    },

    /** A vertical bar from the y-axis floor. */
    bar(xLeft, xRight, value, o2) {
      const opt = o2 || {};
      const yTop = sy(value);
      const yBase = sy(Math.max(y0, 0));
      return api.add(svgEl('rect', {
        x: sx(xLeft), y: Math.min(yTop, yBase),
        width: Math.max(1, sx(xRight) - sx(xLeft)),
        height: Math.max(1, Math.abs(yBase - yTop)),
        style: 'fill: ' + (opt.fill || S(1)) +
               '; stroke: ' + (opt.stroke || SURFACE) + '; stroke-width: 1;'
      }));
    },

    /** A direct text label placed at a data point — the legend replacement. */
    label(x, y, value, o2) {
      const opt = o2 || {};
      return api.add(txt(sx(x) + (opt.dx || 0), sy(y) + (opt.dy || 0), value, {
        anchor: opt.anchor || 'start',
        fill: opt.fill || INK,
        weight: opt.weight || BOLD,
        size: opt.size || TEXT_SM
      }));
    },

    text(px, py, value, o2) { return api.add(txt(px, py, value, o2)); }
  };

  return api;
}

/* ==========================================================================
   1. demo-event-venn — 2.1.9 Venn-diagram reasoning
   --------------------------------------------------------------------------
   The 2025 app drew the two circles at a FIXED separation of 0.8(r_A + r_B),
   so the overlap in the picture had nothing to do with p(A and B). Here the
   separation is solved by bisection so the lens area really is p(A and B).
   ========================================================================== */

function lensArea(r1, r2, d) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) * Math.min(r1, r2);
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a + b - c;
}

function solveSeparation(r1, r2, target) {
  if (target <= 0) return r1 + r2;
  let lo = Math.abs(r1 - r2), hi = r1 + r2;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (lensArea(r1, r2, mid) > target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

createDemo('#demo-event-venn-mount', {
  id: 'demo-event-venn',
  title: 'Event relationships explorer',
  description: 'Set p(A), p(B) and p(A and B), then read every derived quantity: ' +
               'the union, the three disjoint regions, both conditional probabilities, ' +
               'and whether the events come out independent or mutually exclusive.',
  headingLevel: 4,

  controls: [
    { type: 'range', name: 'pA', label: 'Probability of A, p(A)', min: 0, max: 1, step: 0.01, value: 0.4,
      valueText: (v) => Number(v).toFixed(2) },
    { type: 'range', name: 'pB', label: 'Probability of B, p(B)', min: 0, max: 1, step: 0.01, value: 0.3,
      valueText: (v) => Number(v).toFixed(2) },
    { type: 'range', name: 'pAB', label: 'Probability of both, p(A and B)', min: 0, max: 1, step: 0.01, value: 0.1,
      valueText: (v) => Number(v).toFixed(2),
      help: 'The intersection cannot exceed either single probability, and cannot be smaller ' +
            'than p(A) + p(B) − 1. Values outside that window are pulled back to the nearest ' +
            'legal one and the summary says so.' }
  ],

  compute(v) {
    const pA = clamp(Number(v.pA), 0, 1);
    const pB = clamp(Number(v.pB), 0, 1);
    const lowest = Math.max(0, pA + pB - 1);
    const highest = Math.min(pA, pB);
    const asked = clamp(Number(v.pAB), 0, 1);
    const pAB = clamp(asked, lowest, highest);
    const adjusted = Math.abs(asked - pAB) > 1e-9;

    const union = pA + pB - pAB;
    const aOnly = pA - pAB;
    const bOnly = pB - pAB;
    const neither = 1 - union;
    const aGivenB = pB > 0 ? pAB / pB : null;
    const bGivenA = pA > 0 ? pAB / pA : null;
    const product = pA * pB;
    const independent = Math.abs(pAB - product) < 5e-3 && pA > 0 && pB > 0;
    const exclusive = pAB < 1e-9 && pA > 0 && pB > 0;

    return { pA, pB, pAB, asked, adjusted, lowest, highest, union, aOnly, bOnly,
             neither, aGivenB, bGivenA, product, independent, exclusive };
  },

  figure(model) {
    const W = 620, H = 330;
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'font-family: var(--fsu-font-sans);' });

    svg.appendChild(svgEl('rect', {
      x: 14, y: 30, width: W - 28, height: H - 74, rx: 8,
      style: 'fill: none; stroke: ' + AXIS + '; stroke-width: 2;'
    }));
    svg.appendChild(txt(24, 24, 'Sample space Ω, total probability 1', { anchor: 'start', fill: QUIET }));

    const maxR = 96;
    const rA = maxR * Math.sqrt(Math.max(model.pA, 1e-4));
    const rB = maxR * Math.sqrt(Math.max(model.pB, 1e-4));
    const targetLens = Math.PI * maxR * maxR * model.pAB;
    const d = solveSeparation(rA, rB, targetLens);
    const cy = 30 + (H - 74) / 2;
    const cx = W / 2;
    const ax = cx - d / 2, bx = cx + d / 2;

    svg.appendChild(svgEl('circle', {
      cx: ax, cy, r: rA,
      style: 'fill: none; stroke: ' + S(1) + '; stroke-width: 3;'
    }));
    svg.appendChild(svgEl('circle', {
      cx: bx, cy, r: rB,
      style: 'fill: none; stroke: ' + S(5) + '; stroke-width: 3; stroke-dasharray: 8 5;'
    }));

    svg.appendChild(txt(ax - rA * 0.55, cy - rA - 8, 'A (solid outline)', { fill: INK, weight: BOLD }));
    svg.appendChild(txt(bx + rB * 0.55, cy + rB + 20, 'B (dashed outline)', { fill: INK, weight: BOLD }));

    svg.appendChild(txt(ax - Math.max(20, rA * 0.45), cy, 'A only ' + f(model.aOnly, 2), { fill: INK }));
    svg.appendChild(txt(bx + Math.max(20, rB * 0.45), cy, 'B only ' + f(model.bOnly, 2), { fill: INK }));
    svg.appendChild(txt(cx, cy + (model.pAB > 0 ? -rA * 0.05 : -rA - 30),
      'both ' + f(model.pAB, 2), { fill: INK, weight: BOLD }));
    svg.appendChild(txt(W - 28, H - 56, 'neither ' + f(model.neither, 2), { anchor: 'end', fill: INK }));

    return svg;
  },

  figureAlt(model) {
    const rel = model.exclusive ? 'the circles do not touch, so the events are mutually exclusive'
      : model.independent ? 'the circles overlap by exactly p(A) times p(B), the signature of independence'
      : 'the circles overlap';
    return 'Two-set Venn diagram drawn to area: A covers ' + f(model.pA, 2) +
      ', B covers ' + f(model.pB, 2) + ', and ' + rel + ' in a lens of area ' + f(model.pAB, 2) +
      '. The union is ' + f(model.union, 2) + ' and ' + f(model.neither, 2) +
      ' of the sample space lies outside both circles.';
  },

  table(model) {
    const na = '—';
    return {
      caption: 'Every quantity derived from p(A) = ' + f(model.pA, 2) + ', p(B) = ' +
               f(model.pB, 2) + ' and p(A and B) = ' + f(model.pAB, 2),
      rowHeader: true,
      columns: [
        { label: 'Quantity' },
        { label: 'Value', numeric: true },
        { label: 'Rule used' }
      ],
      rows: [
        { cells: ['p(A)', f(model.pA, 3), 'given'] },
        { cells: ['p(B)', f(model.pB, 3), 'given'] },
        { cells: ['p(A and B)', f(model.pAB, 3), 'given (intersection)'] },
        { cells: ['p(A or B)', f(model.union, 3), 'p(A) + p(B) − p(A and B)'], current: true },
        { cells: ['p(A but not B)', f(model.aOnly, 3), 'p(A) − p(A and B)'] },
        { cells: ['p(B but not A)', f(model.bOnly, 3), 'p(B) − p(A and B)'] },
        { cells: ['p(neither)', f(model.neither, 3), '1 − p(A or B), the complement rule'] },
        { cells: ['p(A given B)', model.aGivenB === null ? na : f(model.aGivenB, 3), 'p(A and B) / p(B)'] },
        { cells: ['p(B given A)', model.bGivenA === null ? na : f(model.bGivenA, 3), 'p(A and B) / p(A)'] },
        { cells: ['p(A) × p(B)', f(model.product, 3), 'what the intersection would be if A and B were independent'] }
      ]
    };
  },

  summary(model) {
    const lines = [];
    if (model.adjusted) {
      lines.push('p(A and B) was set to ' + f(model.asked, 2) + ', which is impossible for these marginals. ' +
        'It has been pulled to ' + f(model.pAB, 2) + ', the nearest legal value in the range ' +
        f(model.lowest, 2) + ' to ' + f(model.highest, 2) + '.');
    }
    lines.push('p(A or B) = ' + f(model.pA, 2) + ' + ' + f(model.pB, 2) + ' − ' + f(model.pAB, 2) +
      ' = ' + f(model.union, 2) + '. The overlap is subtracted once because it was counted twice.');
    if (model.pA === 0 || model.pB === 0) {
      lines.push('One of the events has probability zero, so it never happens and no conditional ' +
        'probability given it is defined — dividing by p(A) or p(B) would be dividing by zero.');
    } else if (model.exclusive) {
      lines.push('The events are mutually exclusive: p(A and B) is zero, so the addition rule collapses to p(A) + p(B).');
    } else if (model.independent) {
      lines.push('The events are independent: p(A and B) = ' + f(model.pAB, 3) +
        ' matches p(A) × p(B) = ' + f(model.product, 3) + ', so knowing A tells you nothing about B.');
    } else {
      lines.push('The events are dependent: p(A and B) = ' + f(model.pAB, 3) +
        ' but p(A) × p(B) = ' + f(model.product, 3) + '. Knowing B changes the chance of A from ' +
        f(model.pA, 3) + ' to ' + (model.aGivenB === null ? 'undefined' : f(model.aGivenB, 3)) + '.');
    }
    return lines;
  }
});

/* ==========================================================================
   2. demo-bayes-testing — 2.1.10 Bayes-style disease testing        [NEW]
   --------------------------------------------------------------------------
   Lab 05 Q2 defaults: prevalence 1%, sensitivity 95%, specificity 95%.
   Answer 0.1610. The step-through follows the natural-frequency argument,
   which is the presentation students actually get right.
   ========================================================================== */

createDemo('#demo-bayes-testing-mount', {
  id: 'demo-bayes-testing',
  title: 'Disease testing with Bayes’ theorem',
  description: 'A 95% accurate test for a disease that 1 in 100 people have. Work through the ' +
               'natural-frequency argument one step at a time and watch the false positives ' +
               'swamp the true ones.',
  headingLevel: 4,

  controls: [
    { type: 'range', name: 'prevalence', label: 'Disease prevalence', min: 0.1, max: 25, step: 0.1, value: 1,
      unit: '%', valueText: (v) => Number(v).toFixed(1) + ' percent of the population' },
    { type: 'range', name: 'sensitivity', label: 'Sensitivity: positives among people who have it', min: 50, max: 100, step: 0.5, value: 95,
      unit: '%', valueText: (v) => Number(v).toFixed(1) + ' percent' },
    { type: 'range', name: 'specificity', label: 'Specificity: negatives among people who do not', min: 50, max: 100, step: 0.5, value: 95,
      unit: '%', valueText: (v) => Number(v).toFixed(1) + ' percent',
      help: 'The false-positive rate is 100% minus the specificity. Lab 05 states the test as ' +
            '"95% accurate", meaning sensitivity 95% and false positives 5%.' },
    { type: 'select', name: 'population', label: 'Imaginary population size',
      options: [
        { value: '1000', label: '1,000 people' },
        { value: '10000', label: '10,000 people' },
        { value: '100000', label: '100,000 people' }
      ], value: '10000' }
  ],

  compute(v) {
    const pop = Number(v.population);
    const prev = Number(v.prevalence) / 100;
    const sens = Number(v.sensitivity) / 100;
    const spec = Number(v.specificity) / 100;

    const withD = pop * prev;
    const withoutD = pop - withD;
    const tp = withD * sens;
    const fn = withD - tp;
    const fp = withoutD * (1 - spec);
    const tn = withoutD - fp;
    const positives = tp + fp;
    const negatives = tn + fn;
    const posterior = positives > 0 ? tp / positives : 0;
    const npv = negatives > 0 ? tn / negatives : 0;

    return { pop, prev, sens, spec, withD, withoutD, tp, fn, fp, tn,
             positives, negatives, posterior, npv };
  },

  steps: {
    count: () => 4,
    label: (m, i) => {
      if (i === 0) {
        return 'Start with ' + group(m.pop) + ' imaginary people. Nothing has been measured yet; ' +
               'the only thing known is the prevalence.';
      }
      if (i === 1) {
        return 'Split by disease status: ' + group(m.withD) + ' have the disease and ' +
               group(m.withoutD) + ' do not. This split is the base rate, and it is the number ' +
               'people forget.';
      }
      if (i === 2) {
        return 'Apply the test to both groups: it catches ' + group(m.tp) + ' of the ' + group(m.withD) +
               ' true cases, and wrongly flags ' + group(m.fp) + ' of the ' + group(m.withoutD) +
               ' healthy people.';
      }
      return 'Keep only the ' + group(m.positives) + ' positive results. ' + group(m.tp) +
             ' of them are real, so p(disease given a positive test) = ' + f(m.posterior, 4) + '.';
    }
  },

  figure(model, ctx) {
    const W = 620, H = 320;
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'font-family: var(--fsu-font-sans);' });
    const left = 24, right = W - 24, top = 40;
    const full = right - left;
    const step = ctx.step;

    const band = (y, x, w, label, series, dashed) => {
      svg.appendChild(svgEl('rect', {
        x, y, width: Math.max(2, w), height: 44, rx: 4,
        style: 'fill: none; stroke: ' + series + '; stroke-width: 3;' +
               (dashed ? ' stroke-dasharray: 7 4;' : '')
      }));
      svg.appendChild(txt(x + 8, y + 27, label, { anchor: 'start', fill: INK }));
    };

    svg.appendChild(txt(left, 22, 'Row 1: everyone. Later rows split the same ' + group(model.pop) + ' people.',
      { anchor: 'start', fill: QUIET }));

    band(top, left, full, group(model.pop) + ' people', S(3), false);

    if (step >= 1) {
      const wD = Math.max(6, (model.withD / model.pop) * full);
      band(top + 62, left, wD, group(model.withD) + ' have it', S(1), false);
      band(top + 62, left + wD, full - wD, group(model.withoutD) + ' do not', S(5), true);
    }

    if (step >= 2) {
      const wTP = Math.max(3, (model.tp / model.pop) * full);
      const wFN = Math.max(1, (model.fn / model.pop) * full);
      const wFP = Math.max(3, (model.fp / model.pop) * full);
      band(top + 124, left, wTP, group(model.tp) + ' true positive', S(1), false);
      band(top + 124, left + wTP, wFN, '', S(2), false);
      band(top + 124, left + wTP + wFN, wFP, group(model.fp) + ' false positive', S(5), true);
      svg.appendChild(txt(left, top + 190, 'Row 3 splits each group by test result. The narrow band after the ' +
        'true positives is the ' + group(model.fn) + ' missed cases.', { anchor: 'start', fill: QUIET }));
    }

    if (step >= 3) {
      const wTP = Math.max(6, (model.tp / model.positives) * full);
      band(top + 216, left, wTP, group(model.tp) + ' really ill', S(1), false);
      band(top + 216, left + wTP, full - wTP, group(model.fp) + ' healthy but positive', S(5), true);
      svg.appendChild(txt(left, top + 210, 'Row 4: the ' + group(model.positives) +
        ' positive results, rescaled to the full width.', { anchor: 'start', fill: QUIET }));
    }

    return svg;
  },

  figureAlt(model, ctx) {
    if (ctx.step === 0) {
      return 'One full-width band representing ' + group(model.pop) + ' people, not yet split.';
    }
    if (ctx.step === 1) {
      return 'The population band is split in proportion: a short segment of ' + group(model.withD) +
        ' people with the disease and a long segment of ' + group(model.withoutD) + ' without it.';
    }
    if (ctx.step === 2) {
      return 'A third band shows test results at true scale: ' + group(model.tp) + ' true positives, ' +
        group(model.fn) + ' missed cases, and ' + group(model.fp) +
        ' false positives, which is ' + f(model.fp / Math.max(model.tp, 1e-9), 1) +
        ' times as many as the true positives.';
    }
    return 'The positive results are rescaled to the full width: ' + group(model.tp) + ' of the ' +
      group(model.positives) + ' positives are genuine, so genuine cases fill ' +
      f(model.posterior * 100, 1) + ' percent of the band.';
  },

  table(model, ctx) {
    const rows = [
      { cells: ['Has the disease', group(model.tp), group(model.fn), group(model.withD)],
        current: ctx.step >= 1 && ctx.step <= 2 },
      { cells: ['Does not have it', group(model.fp), group(model.tn), group(model.withoutD)] },
      { cells: ['Total', group(model.positives), group(model.negatives), group(model.pop)],
        current: ctx.step === 3 }
    ];
    return {
      caption: 'Contingency table for ' + group(model.pop) + ' people at prevalence ' +
               f(model.prev * 100, 1) + '%, sensitivity ' + f(model.sens * 100, 1) +
               '% and specificity ' + f(model.spec * 100, 1) + '%',
      rowHeader: true,
      columns: [
        { label: 'Group' },
        { label: 'Test positive', numeric: true },
        { label: 'Test negative', numeric: true },
        { label: 'Row total', numeric: true }
      ],
      rows
    };
  },

  summary(model) {
    return [
      'p(disease | positive test) = ' + f(model.sens, 3) + ' × ' + f(model.prev, 4) + ' ÷ ' +
        f(model.positives / model.pop, 5) + ' = ' + f(model.posterior, 4) + ', that is ' +
        f(model.posterior * 100, 1) + ' percent.',
      'For every genuine case the test finds, it produces ' +
        f(model.fp / Math.max(model.tp, 1e-9), 2) + ' false alarms, because the healthy group is ' +
        f(model.withoutD / Math.max(model.withD, 1e-9), 1) + ' times larger to begin with.',
      'A negative result is far more informative here: p(no disease | negative test) = ' +
        f(model.npv, 4) + '.'
    ];
  }
});

/* ==========================================================================
   3. demo-lcg-lab — 2.2.3, 2.2.6, 2.2.7 Random number generator laboratory
   ========================================================================== */

/**
 * (a * b) mod m without ever exceeding Number.MAX_SAFE_INTEGER. Doubling is
 * exact in binary floating point, so the shift-and-add loop is exact too.
 */
function mulmod(a, b, m) {
  if (a * b <= Number.MAX_SAFE_INTEGER) return (a * b) % m;
  let result = 0;
  let x = a % m;
  let y = b;
  while (y > 0) {
    if (y % 2 === 1) result = (result + x) % m;
    x = (x * 2) % m;
    y = Math.floor(y / 2);
  }
  return result;
}

function lcgSequence(a, c, m, seed, n) {
  const raw = [];
  const seen = new Map();
  let x = ((Math.round(seed) % m) + m) % m;
  let period = null;
  for (let i = 0; i < n; i++) {
    if (period === null && seen.has(x)) period = i - seen.get(x);
    if (period === null) seen.set(x, i);
    raw.push(x);
    x = (mulmod(a, x, m) + (c % m)) % m;
  }
  return { raw, u: raw.map((v) => v / m), period };
}

function runsTest(u) {
  const n = u.length;
  const sorted = u.slice().sort((p, q) => p - q);
  const med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const bits = u.map((v) => (v > med ? 1 : 0));
  let runs = 1;
  for (let i = 1; i < n; i++) if (bits[i] !== bits[i - 1]) runs += 1;
  const n1 = sum(bits), n2 = n - n1;
  if (n1 === 0 || n2 === 0) return { runs, expected: 1, z: 0, median: med, n1, n2 };
  const expected = (2 * n1 * n2) / (n1 + n2) + 1;
  const varR = (2 * n1 * n2 * (2 * n1 * n2 - n1 - n2)) /
               ((n1 + n2) * (n1 + n2) * (n1 + n2 - 1));
  const z = varR > 0 ? (runs - expected) / Math.sqrt(varR) : 0;
  return { runs, expected, z, median: med, n1, n2 };
}

function lag1Correlation(u) {
  const a = u.slice(0, -1), b = u.slice(1);
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) * (a[i] - ma);
    db += (b[i] - mb) * (b[i] - mb);
  }
  const r = da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
  return { r, z: r * Math.sqrt(a.length) };
}

createDemo('#demo-lcg-lab-mount', {
  id: 'demo-lcg-lab',
  title: 'Linear congruential generator laboratory',
  description: 'Build a generator from a multiplier, an increment and a modulus, then look for the ' +
               'structure a histogram hides: plot each value against the next one, count the runs, ' +
               'and measure the lag-1 correlation.',
  headingLevel: 4,

  controls: [
    { type: 'number', name: 'a', label: 'Multiplier a', min: 1, max: 4294967295, step: 1, value: 5 },
    { type: 'number', name: 'c', label: 'Increment c', min: 0, max: 4294967295, step: 1, value: 1 },
    { type: 'select', name: 'm', label: 'Modulus m',
      options: [
        { value: '64', label: '64' },
        { value: '256', label: '256' },
        { value: '1000', label: '1,000' },
        { value: '2147483647', label: '2,147,483,647 (2³¹ − 1)' },
        { value: '2147483648', label: '2,147,483,648 (2³¹)' },
        { value: '4294967296', label: '4,294,967,296 (2³²)' }
      ], value: '2147483648' },
    { type: 'seed', name: 'seed', label: 'Seed n₀', value: 987654321,
      help: 'Same seed, same sequence — that is the whole point of a pseudo-random generator. ' +
            'A small seed with a large modulus is its own lesson: try 42 and watch the first ten ' +
            'outputs crawl up from zero before the generator gets going.' },
    { type: 'range', name: 'n', label: 'How many numbers to draw', min: 60, max: 2000, step: 20, value: 500,
      unit: 'values' },
    { type: 'select', name: 'tableView', label: 'Table shows',
      options: [
        { value: 'pairs', label: 'Consecutive pairs (the scatter, as numbers)' },
        { value: 'deciles', label: 'Decile counts (the uniformity check)' },
        { value: 'tests', label: 'Test statistics' }
      ], value: 'pairs' },
    { type: 'button', name: 'loadRandu', label: 'Load RANDU (a = 65539, m = 2³¹)',
      action: (api) => { api.setValue('a', 65539); api.setValue('c', 0); api.setValue('m', '2147483648'); } },
    { type: 'button', name: 'loadNr', label: 'Load Numerical Recipes LCG',
      action: (api) => { api.setValue('a', 1664525); api.setValue('c', 1013904223); api.setValue('m', '4294967296'); } },
    { type: 'button', name: 'loadBad', label: 'Load the short-period generator (a = 7, c = 3, m = 1000)',
      action: (api) => { api.setValue('a', 7); api.setValue('c', 3); api.setValue('m', '1000'); } }
  ],

  compute(v) {
    const a = clamp(Math.round(Number(v.a) || 1), 1, 4294967295);
    const c = clamp(Math.round(Number(v.c) || 0), 0, 4294967295);
    const m = Math.round(Number(v.m));
    const n = Math.round(Number(v.n));
    const seq = lcgSequence(a, c, m, Number(v.seed), n);
    const u = seq.u;

    const bins = new Array(10).fill(0);
    u.forEach((val) => { bins[Math.min(9, Math.floor(val * 10))] += 1; });
    const expected = n / 10;
    let chi = 0;
    bins.forEach((o) => { chi += ((o - expected) * (o - expected)) / expected; });

    const runs = runsTest(u);
    const corr = lag1Correlation(u);
    const distinct = new Set(seq.raw).size;
    const lattice = a <= 32 ? a : null;

    return { a, c, m, n, u, raw: seq.raw, period: seq.period, bins, expected, chi,
             runs, corr, distinct, lattice, tableView: v.tableView,
             mean: mean(u), sd: Math.sqrt(variance(u)) };
  },

  figure(model) {
    const c = chart({ width: 620, height: 380, x: [0, 1], y: [0, 1],
                      margin: { top: 24, right: 26, bottom: 56, left: 74 } });
    c.axes({
      xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1],
      fx: (v) => v.toFixed(1), fy: (v) => v.toFixed(1),
      xLabel: 'value u at step i', yLabel: 'value u at step i + 1'
    });
    const limit = Math.min(model.u.length - 1, 900);
    for (let i = 0; i < limit; i++) {
      c.mark(model.u[i], model.u[i + 1], 'circle', { r: 2.4, stroke: S(1), width: 1.2 });
    }
    return c.svg;
  },

  figureAlt(model) {
    const structure = model.lattice !== null
      ? 'the points do not fill the square: they lie on ' + model.lattice +
        ' parallel straight lines, which is exactly the multiplier a'
      : Math.abs(model.corr.r) > 0.2
        ? 'the points lean along a diagonal, so consecutive values are correlated'
        : 'the points fill the square without visible lines or gaps';
    return 'Lag-1 scatter of ' + Math.min(model.n - 1, 900) + ' consecutive pairs from the generator ' +
      'x ← (' + group(model.a) + ' x + ' + group(model.c) + ') mod ' + group(model.m) + ': ' +
      structure + '. Lag-1 correlation r = ' + f(model.corr.r, 4) + '.';
  },

  table(model) {
    if (model.tableView === 'deciles') {
      return {
        caption: 'Decile counts for ' + group(model.n) + ' values — a uniform generator puts about ' +
                 f(model.expected, 1) + ' in each',
        rowHeader: true,
        columns: [
          { label: 'Interval' },
          { label: 'Observed', numeric: true },
          { label: 'Expected', numeric: true },
          { label: 'Observed − expected', numeric: true }
        ],
        rows: model.bins.map((o, i) => ({
          cells: [(i / 10).toFixed(1) + ' to ' + ((i + 1) / 10).toFixed(1), o,
                  f(model.expected, 1), f(o - model.expected, 1)],
          current: Math.abs(o - model.expected) > 2.5 * Math.sqrt(model.expected)
        }))
      };
    }

    if (model.tableView === 'tests') {
      const verdict = (ok) => (ok ? 'no structure detected' : 'structure detected');
      return {
        caption: 'Test statistics for the generator a = ' + group(model.a) + ', c = ' + group(model.c) +
                 ', m = ' + group(model.m) + ' over ' + group(model.n) + ' values',
        rowHeader: true,
        columns: [{ label: 'Statistic' }, { label: 'Value', numeric: true }, { label: 'Reading' }],
        rows: [
          { cells: ['Sample mean', f(model.mean, 4), 'a uniform generator gives 0.5'] },
          { cells: ['Sample standard deviation', f(model.sd, 4), 'a uniform generator gives 0.2887'] },
          { cells: ['Chi-square over 10 bins', f(model.chi, 3),
                    'with 9 degrees of freedom, values above 16.92 are suspicious at the 5% level'] },
          { cells: ['Runs above and below the median', model.runs.runs,
                    'expected ' + f(model.runs.expected, 1)] },
          { cells: ['Runs-test z', f(model.runs.z, 3), verdict(Math.abs(model.runs.z) < 1.96)] },
          { cells: ['Lag-1 correlation r', f(model.corr.r, 4), verdict(Math.abs(model.corr.z) < 1.96)],
            current: Math.abs(model.corr.z) >= 1.96 },
          { cells: ['Distinct states visited', group(model.distinct),
                    'out of a maximum of ' + group(model.m)] },
          { cells: ['Detected period', model.period === null ? 'none within this run' : group(model.period),
                    'the sequence repeats after this many steps'] }
        ]
      };
    }

    const rows = [];
    for (let i = 0; i < Math.min(24, model.u.length - 1); i++) {
      rows.push({
        cells: [i, group(model.raw[i]), f(model.u[i], 5), f(model.u[i + 1], 5),
                Math.min(9, Math.floor(model.u[i] * 10))]
      });
    }
    return {
      caption: 'First 24 consecutive pairs of ' + group(model.n) + ' — the same numbers the scatter plots',
      rowHeader: true,
      columns: [
        { label: 'Step i', numeric: true },
        { label: 'State nᵢ', numeric: true },
        { label: 'uᵢ', numeric: true },
        { label: 'uᵢ₊₁', numeric: true },
        { label: 'Decile of uᵢ', numeric: true }
      ],
      rows
    };
  },

  summary(model) {
    const lines = [];
    lines.push('Generator: n ← (' + group(model.a) + ' n + ' + group(model.c) + ') mod ' +
      group(model.m) + ', started from seed ' + group(model.raw[0]) + '; each output is n divided by m.');
    if (model.lattice !== null) {
      lines.push('Because the multiplier is only ' + model.a + ', every pair of consecutive values sits on one of ' +
        model.a + ' parallel lines. A histogram of the values alone would call this generator uniform; the pair ' +
        'plot shows it is not random at all.');
    }
    lines.push('Runs test: ' + model.runs.runs + ' runs against ' + f(model.runs.expected, 1) +
      ' expected, z = ' + f(model.runs.z, 3) + '. ' +
      (Math.abs(model.runs.z) < 1.96 ? 'That is inside the plus or minus 1.96 band, so the runs test finds nothing wrong.'
        : 'That is outside the plus or minus 1.96 band, so the runs test rejects randomness.'));
    lines.push('Lag-1 correlation r = ' + f(model.corr.r, 4) + ' (z = ' + f(model.corr.z, 2) + '), and ' +
      (model.period === null ? 'no repeat appeared within ' + group(model.n) + ' draws.'
        : 'the sequence repeats every ' + group(model.period) + ' draws.'));
    return lines;
  }
});

/* ==========================================================================
   4. demo-discrete-rv — 2.3.1 to 2.3.9 PMF, CDF, mean, variance
   ========================================================================== */

const DISCRETE_SETS = {
  fair: {
    label: 'fair six-sided die',
    values: [1, 2, 3, 4, 5, 6],
    probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    note: 'The discrete uniform distribution from slide P2-07.'
  },
  biased: {
    label: 'Lab 05 biased die',
    values: [1, 2, 3, 4, 5, 6],
    probs: [0.05, 0.15, 0.30, 0.20, 0.15, 0.15],
    note: 'The biased die you sample in Lab 05, task 1.1.'
  },
  exam: {
    label: 'midterm Problem 2 random variable',
    values: [1, 2, 3, 4],
    probs: [0.15, 0.35, 0.25, 0.25],
    note: 'The PMF from Problem 2 of the Fall 2025 midterm.'
  },
  twodice: {
    label: 'sum of two fair dice',
    values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    probs: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((c) => c / 36),
    note: 'The running example from slide P1-10: X is the sum of two dice.'
  }
};

createDemo('#demo-discrete-rv-mount', {
  id: 'demo-discrete-rv',
  title: 'Discrete random variable workbench',
  description: 'Step through a PMF one outcome at a time and watch the CDF accumulate, the expected ' +
               'value build up term by term, and the variance follow from E[X²] − μ². ' +
               'Optionally sample the distribution and compare the empirical frequencies.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'dist', label: 'Distribution',
      options: [
        { value: 'fair', label: 'Fair six-sided die' },
        { value: 'biased', label: 'Biased die (Lab 05)' },
        { value: 'exam', label: 'Midterm Problem 2 PMF' },
        { value: 'twodice', label: 'Sum of two fair dice' }
      ], value: 'fair' },
    { type: 'range', name: 'draws', label: 'Simulated draws (0 shows the theory alone)',
      min: 0, max: 20000, step: 500, value: 0, unit: 'draws',
      help: 'Sampling uses the inverse-CDF method: draw u in [0,1), then take the first outcome ' +
            'whose cumulative probability reaches u. That is exactly what Lab 05 asks you to write.' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42 }
  ],

  compute(v) {
    const set = DISCRETE_SETS[v.dist] || DISCRETE_SETS.fair;
    const values = set.values;
    const probs = set.probs;
    const draws = Math.round(Number(v.draws));

    const cdf = [];
    let acc = 0;
    probs.forEach((p) => { acc += p; cdf.push(acc); });

    let mu = 0, ex2 = 0;
    values.forEach((x, i) => { mu += x * probs[i]; ex2 += x * x * probs[i]; });
    const varX = ex2 - mu * mu;

    let counts = null;
    if (draws > 0) {
      const rnd = seededRandom(Number(v.seed));
      counts = new Array(values.length).fill(0);
      for (let i = 0; i < draws; i++) {
        const u = rnd();
        let k = 0;
        while (k < cdf.length - 1 && u >= cdf[k]) k += 1;
        counts[k] += 1;
      }
    }

    return { key: v.dist, label: set.label, note: set.note, values, probs, cdf,
             mu, ex2, varX, sd: Math.sqrt(Math.max(varX, 0)), draws, counts,
             total: acc };
  },

  steps: {
    count: (m) => m.values.length,
    label: (m, i) => {
      const x = m.values[i];
      const p = m.probs[i];
      return 'Outcome x = ' + x + ' has p(x) = ' + f(p, 4) + '. The cumulative total reaches F(' + x +
        ') = ' + f(m.cdf[i], 4) + ', and this outcome contributes ' + f(x * p, 4) +
        ' to the expected value and ' + f(x * x * p, 4) + ' to E[X squared].';
    }
  },

  figure(model, ctx) {
    const xs = model.values;
    const lo = xs[0] - 0.75, hi = xs[xs.length - 1] + 0.75;
    const maxP = Math.max.apply(null, model.probs);
    const c = chart({ width: 640, height: 360, x: [lo, hi], y: [0, Math.max(maxP, 1) * 1.08],
                      margin: { top: 26, right: 30, bottom: 58, left: 78 } });
    c.axes({
      xTicks: xs, yTicks: ticks(0, 1, 5), fy: (v) => v.toFixed(1),
      xLabel: 'outcome x', yLabel: 'probability, and cumulative probability'
    });

    const w = xs.length > 8 ? 0.34 : 0.28;
    xs.forEach((x, i) => {
      c.bar(x - w, x + w, model.probs[i], {
        fill: i === ctx.step ? S(1) : S(4),
        stroke: i === ctx.step ? S(3) : SURFACE
      });
    });

    // CDF staircase, dashed and square-marked so it is not a colour twin.
    const pts = [[lo, 0]];
    xs.forEach((x, i) => {
      pts.push([x - w, i === 0 ? 0 : model.cdf[i - 1]]);
      pts.push([x - w, model.cdf[i]]);
      pts.push([x + w, model.cdf[i]]);
    });
    pts.push([hi, 1]);
    c.line(pts, { stroke: S(5), dash: '9 5', width: 2.4 });
    xs.forEach((x, i) => c.mark(x + w, model.cdf[i], 'square', { r: 3.4, stroke: S(5), fill: SURFACE }));

    c.label(lo, 1.0, 'F(x), dashed with squares', { dx: 6, dy: -8, fill: INK });
    c.label(xs[0] - w, maxP, 'p(x), solid bars', { dx: 2, dy: -10, fill: INK });

    if (model.counts) {
      xs.forEach((x, i) => {
        c.mark(x, model.counts[i] / model.draws, 'triangle', { r: 5, stroke: S(6), width: 2 });
      });
      c.label(xs[xs.length - 1], maxP * 0.55, 'sampled frequency, triangles', { dx: -140, dy: -6, fill: INK });
    }

    return c.svg;
  },

  figureAlt(model, ctx) {
    const x = model.values[ctx.step];
    return 'Bar chart of the ' + model.label + ' PMF with the dashed cumulative curve on the same axis. ' +
      'The bar at x = ' + x + ' is highlighted: p(' + x + ') = ' + f(model.probs[ctx.step], 4) +
      ' and F(' + x + ') = ' + f(model.cdf[ctx.step], 4) + '. ' +
      (model.counts
        ? 'Triangles mark the frequencies from ' + group(model.draws) + ' simulated draws.'
        : 'No sampled data is shown; the draws control is at zero.');
  },

  table(model, ctx) {
    const cols = [
      { label: 'x', numeric: true },
      { label: 'p(x)', numeric: true },
      { label: 'F(x)', numeric: true },
      { label: 'x × p(x)', numeric: true },
      { label: 'x² × p(x)', numeric: true }
    ];
    if (model.counts) cols.push({ label: 'sampled frequency', numeric: true });

    const rows = model.values.map((x, i) => {
      const cells = [x, f(model.probs[i], 4), f(model.cdf[i], 4),
                     f(x * model.probs[i], 4), f(x * x * model.probs[i], 4)];
      if (model.counts) cells.push(f(model.counts[i] / model.draws, 4));
      return { cells, current: i === ctx.step };
    });

    const totals = ['Total', f(model.total, 4), '—', f(model.mu, 4), f(model.ex2, 4)];
    if (model.counts) totals.push(f(1, 4));
    rows.push({ cells: totals });

    return {
      caption: 'PMF, CDF and the two moment sums for the ' + model.label +
               ', after step ' + (ctx.step + 1) + ' of ' + ctx.stepCount,
      rowHeader: true,
      columns: cols,
      rows
    };
  },

  summary(model) {
    const lines = [
      model.note,
      'Normalization: the probabilities add to ' + f(model.total, 4) + ', so this is a valid PMF.',
      'Expected value E[X] = ' + f(model.mu, 4) + '. E[X squared] = ' + f(model.ex2, 4) +
        ', so the variance is ' + f(model.ex2, 4) + ' − ' + f(model.mu, 4) + ' squared = ' +
        f(model.varX, 4) + ' and the standard deviation is ' + f(model.sd, 4) + '.'
    ];
    if (model.counts) {
      let worst = 0, at = 0;
      model.counts.forEach((cnt, i) => {
        const d = Math.abs(cnt / model.draws - model.probs[i]);
        if (d > worst) { worst = d; at = i; }
      });
      lines.push('Across ' + group(model.draws) + ' simulated draws the largest gap between the sampled ' +
        'frequency and the true probability is ' + f(worst, 4) + ', at x = ' + model.values[at] + '.');
    }
    return lines;
  }
});

/* ==========================================================================
   5. demo-distribution-gallery — 2.3.3, 2.3.10, 2.3.11 named families
   ========================================================================== */

const FAMILIES = {
  exponential: {
    label: 'Exponential', kind: 'continuous', paramName: 'rate λ', param: [0.1, 3, 0.1, 0.5],
    support: (p) => [0, 8 / p],
    pdf: (x, p) => (x < 0 ? 0 : p * Math.exp(-p * x)),
    stats: (p) => ({ mean: 1 / p, variance: 1 / (p * p) }),
    words: (p) => 'Waiting time until the next event when events arrive at a constant average rate ' +
      f(p, 2) + ' per unit time. Density λ e^(−λ x); mean 1/λ = ' + f(1 / p, 3) + '.'
  },
  normal: {
    label: 'Normal', kind: 'continuous', paramName: 'standard deviation σ', param: [0.2, 3, 0.1, 1],
    support: (p) => [-4 * p, 4 * p],
    pdf: (x, p) => normPdf(x, 0, p),
    stats: (p) => ({ mean: 0, variance: p * p }),
    words: (p) => 'The bell curve with mean 0 and standard deviation ' + f(p, 2) +
      '. It is the limit the Central Limit Theorem points at.'
  },
  lognormal: {
    label: 'Log-normal', kind: 'continuous', paramName: 'log standard deviation σ', param: [0.1, 2, 0.05, 1],
    support: (p) => [0.001, Math.exp(3 * p) * 2],
    pdf: (x, p) => (x <= 0 ? 0 : normPdf(Math.log(x), 0, p) / x),
    stats: (p) => ({ mean: Math.exp(p * p / 2), variance: (Math.exp(p * p) - 1) * Math.exp(p * p) }),
    words: (p) => 'The distribution of a quantity whose logarithm is normal, with log standard ' +
      'deviation ' + f(p, 2) + '. It is the stationary shape behind geometric Brownian motion.'
  },
  gamma: {
    label: 'Gamma', kind: 'continuous', paramName: 'shape k (scale fixed at 1)', param: [0.5, 8, 0.5, 2],
    support: (p) => [0.001, p + 6 * Math.sqrt(p)],
    pdf: (x, p) => (x <= 0 ? 0 : Math.exp((p - 1) * Math.log(x) - x - lgamma(p))),
    stats: (p) => ({ mean: p, variance: p }),
    words: (p) => 'Waiting time until the ' + f(p, 1) + 'th event of a Poisson process. ' +
      'With shape 1 it is the exponential distribution.'
  },
  beta: {
    label: 'Beta', kind: 'continuous', paramName: 'first shape a (second shape fixed at 5)', param: [0.5, 8, 0.5, 2],
    support: () => [0.001, 0.999],
    pdf: (x, p) => {
      const b = 5;
      if (x <= 0 || x >= 1) return 0;
      const lb = lgamma(p) + lgamma(b) - lgamma(p + b);
      return Math.exp((p - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lb);
    },
    stats: (p) => ({ mean: p / (p + 5), variance: (p * 5) / ((p + 5) * (p + 5) * (p + 6)) }),
    words: (p) => 'A distribution on the interval 0 to 1, so it is the natural prior for a ' +
      'probability. Shapes a = ' + f(p, 1) + ' and b = 5.'
  },
  chisq: {
    label: 'Chi-square', kind: 'continuous', paramName: 'degrees of freedom', param: [1, 12, 1, 3],
    support: (p) => [0.001, p + 6 * Math.sqrt(2 * p)],
    pdf: (x, p) => (x <= 0 ? 0 : Math.exp((p / 2 - 1) * Math.log(x) - x / 2 - (p / 2) * Math.LN2 - lgamma(p / 2))),
    stats: (p) => ({ mean: p, variance: 2 * p }),
    words: (p) => 'The sum of ' + p + ' squared standard normal variables. It is the reference ' +
      'distribution behind the chi-square goodness-of-fit test used on generators in 2.2.6.'
  },
  binomial: {
    label: 'Binomial', kind: 'discrete', paramName: 'success probability p (10 trials)', param: [0.05, 0.95, 0.05, 0.5],
    support: () => [0, 10],
    pmf: (k, p) => Math.exp(lgamma(11) - lgamma(k + 1) - lgamma(11 - k) +
      k * Math.log(p) + (10 - k) * Math.log(1 - p)),
    stats: (p) => ({ mean: 10 * p, variance: 10 * p * (1 - p) }),
    words: (p) => 'The number of successes in 10 independent trials, each succeeding with ' +
      'probability ' + f(p, 2) + '. Ten coin flips is the p = 0.5 case.'
  },
  poisson: {
    label: 'Poisson', kind: 'discrete', paramName: 'mean λ', param: [0.5, 15, 0.5, 5],
    support: (p) => [0, Math.ceil(p + 5 * Math.sqrt(p))],
    pmf: (k, p) => Math.exp(-p + k * Math.log(p) - lgamma(k + 1)),
    stats: (p) => ({ mean: p, variance: p }),
    words: (p) => 'The number of events in a fixed window when they arrive independently at an ' +
      'average of ' + f(p, 1) + ' per window. Its mean and its variance are the same number.'
  }
};

createDemo('#demo-distribution-gallery-mount', {
  id: 'demo-distribution-gallery',
  title: 'Named distribution gallery',
  description: 'The eight families the tutorial and the 2025 Central Limit Theorem app used. ' +
               'Each one shows its density or mass function, its cumulative curve, and the mean ' +
               'and variance you would quote in an exam.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'family', label: 'Distribution family',
      options: Object.keys(FAMILIES).map((k) => ({ value: k, label: FAMILIES[k].label })),
      value: 'exponential' },
    { type: 'range', name: 'param', label: 'Distribution parameter', min: 0.05, max: 15, step: 0.05, value: 0.5,
      help: 'What this parameter means depends on the family, and the summary always names it: ' +
            'exponential rate λ; normal σ with mean 0; log-normal log-σ; gamma shape k; ' +
            'beta first shape a; chi-square degrees of freedom; binomial success probability over ' +
            '10 trials; Poisson mean λ.' },
    { type: 'checkbox', name: 'showCdf', label: 'Also draw the cumulative distribution function', value: true }
  ],

  compute(v) {
    const fam = FAMILIES[v.family] || FAMILIES.exponential;
    const range = fam.param;
    const p = clamp(Number(v.param), range[0], range[1]);
    const outside = Math.abs(p - Number(v.param)) > 1e-9;

    const grid = [];
    if (fam.kind === 'discrete') {
      const s = fam.support(p);
      for (let k = Math.round(s[0]); k <= Math.round(s[1]); k++) grid.push({ x: k, y: fam.pmf(k, p) });
      let acc = 0;
      grid.forEach((g) => { acc += g.y; g.cdf = acc; });
    } else {
      const s = fam.support(p);
      const n = 240;
      const h = (s[1] - s[0]) / n;
      let acc = 0;
      for (let i = 0; i <= n; i++) {
        const x = s[0] + i * h;
        const y = fam.pdf(x, p);
        if (i > 0) acc += ((y + grid[i - 1].y) / 2) * h;
        grid.push({ x, y, cdf: acc });
      }
    }

    const st = fam.stats(p);
    return { key: v.family, label: fam.label, kind: fam.kind, paramName: fam.paramName,
             param: p, outside, grid, stats: st, words: fam.words(p),
             showCdf: Boolean(v.showCdf), range };
  },

  figure(model) {
    const xs = model.grid.map((g) => g.x);
    const ys = model.grid.map((g) => g.y);
    const yMax = Math.max.apply(null, ys) * 1.1 || 1;
    const c = chart({ width: 640, height: 360,
                      x: [xs[0], xs[xs.length - 1]], y: [0, yMax],
                      margin: { top: 26, right: 34, bottom: 58, left: 82 } });
    c.axes({
      xLabel: model.kind === 'discrete' ? 'outcome k' : 'value x',
      yLabel: model.kind === 'discrete' ? 'probability p(k)' : 'density p(x)',
      fy: (v) => v.toFixed(2)
    });

    if (model.kind === 'discrete') {
      model.grid.forEach((g) => c.bar(g.x - 0.36, g.x + 0.36, g.y, { fill: S(1) }));
    } else {
      c.line(model.grid.map((g) => [g.x, g.y]), { stroke: S(1), width: 2.6 });
    }
    c.label(xs[0], yMax * 0.96, model.label + (model.kind === 'discrete' ? ' mass, bars' : ' density, solid line'),
      { dx: 8, fill: INK });

    if (model.showCdf) {
      c.line(model.grid.map((g) => [g.x, g.cdf * yMax]), { stroke: S(5), width: 2.2, dash: '9 5' });
      c.label(xs[Math.floor(xs.length * 0.55)], yMax * 0.86, 'cumulative, dashed (right scale 0 to 1)',
        { dx: -30, fill: INK });
    }
    return c.svg;
  },

  figureAlt(model) {
    const peak = model.grid.reduce((best, g) => (g.y > best.y ? g : best), model.grid[0]);
    return model.label + ' with ' + model.paramName + ' = ' + f(model.param, 2) + ': the ' +
      (model.kind === 'discrete' ? 'mass' : 'density') + ' peaks at ' + f(peak.x, 3) +
      ', the mean sits at ' + f(model.stats.mean, 3) + ', and the variance is ' +
      f(model.stats.variance, 3) + '.' +
      (model.showCdf ? ' The dashed cumulative curve rises from 0 to 1 across the same range.' : '');
  },

  table(model) {
    const step = Math.max(1, Math.ceil(model.grid.length / 20));
    const rows = [];
    for (let i = 0; i < model.grid.length; i += step) {
      const g = model.grid[i];
      rows.push({ cells: [f(g.x, 3), f(g.y, 5), f(g.cdf, 4)] });
    }
    return {
      caption: model.label + ' with ' + model.paramName + ' = ' + f(model.param, 2) +
               ' — sampled at ' + rows.length + ' points across its plotted range',
      rowHeader: true,
      columns: [
        { label: model.kind === 'discrete' ? 'k' : 'x', numeric: true },
        { label: model.kind === 'discrete' ? 'p(k)' : 'density p(x)', numeric: true },
        { label: 'cumulative F', numeric: true }
      ],
      rows
    };
  },

  summary(model) {
    const lines = [model.words];
    lines.push('Mean = ' + f(model.stats.mean, 4) + ', variance = ' + f(model.stats.variance, 4) +
      ', standard deviation = ' + f(Math.sqrt(model.stats.variance), 4) + '.');
    if (model.kind === 'continuous') {
      lines.push('Cumulative values are obtained by trapezoidal integration of the density on the ' +
        'plotted grid, so the last row of the table is 1 up to rounding.');
    }
    if (model.outside) {
      lines.push('The parameter was clamped to ' + f(model.param, 2) + ', the nearest value this ' +
        'family allows (' + f(model.range[0], 2) + ' to ' + f(model.range[1], 2) + ').');
    }
    return lines;
  }
});

/* ==========================================================================
   6. demo-clt-dice — 2.4.1 to 2.4.4 Central Limit Theorem
   ========================================================================== */

const PARENTS = {
  die: {
    label: 'fair six-sided die', mu: 3.5, sigma2: 105 / 36, range: [0.5, 6.5],
    draw: (rnd) => 1 + Math.floor(rnd() * 6)
  },
  biased: {
    label: 'Lab 05 biased die', mu: 3.7, sigma2: 2.01, range: [0.5, 6.5],
    draw: (rnd) => {
      const u = rnd();
      const cdf = [0.05, 0.20, 0.50, 0.70, 0.85, 1.0];
      let k = 0;
      while (k < 5 && u >= cdf[k]) k += 1;
      return k + 1;
    }
  },
  coin: {
    label: 'fair coin scored 0 or 1', mu: 0.5, sigma2: 0.25, range: [0, 1],
    draw: (rnd) => (rnd() < 0.5 ? 0 : 1)
  },
  uniform: {
    label: 'uniform on 0 to 1', mu: 0.5, sigma2: 1 / 12, range: [0, 1],
    draw: (rnd) => rnd()
  },
  exponential: {
    label: 'exponential with rate 0.5', mu: 2, sigma2: 4, range: [0, 10],
    draw: (rnd) => -Math.log(1 - rnd()) / 0.5
  }
};

const CLT_N = [1, 2, 5, 10, 20, 50];

createDemo('#demo-clt-dice-mount', {
  id: 'demo-clt-dice',
  title: 'Central Limit Theorem laboratory',
  description: 'Average n draws from a parent distribution, repeat that thousands of times, and ' +
               'plot the histogram of the averages. Step from n = 1 to n = 50 and watch a shape ' +
               'that is nothing like a bell turn into one.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'parent', label: 'Parent distribution X',
      options: [
        { value: 'die', label: 'Fair six-sided die (the slides’ example)' },
        { value: 'biased', label: 'Biased die from Lab 05' },
        { value: 'coin', label: 'Fair coin scored 0 or 1' },
        { value: 'uniform', label: 'Uniform on 0 to 1' },
        { value: 'exponential', label: 'Exponential with rate 0.5 (very skewed)' }
      ], value: 'die' },
    { type: 'range', name: 'trials', label: 'How many averages to simulate', min: 500, max: 20000, step: 500,
      value: 4000, unit: 'averages',
      help: 'The slides used 10,000 simulations. More averages make the histogram smoother; they ' +
            'do not make it narrower — only a larger n does that.' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42 }
  ],

  compute(v) {
    const parent = PARENTS[v.parent] || PARENTS.die;
    const trials = Math.round(Number(v.trials));
    const bins = 24;
    const lo = parent.range[0], hi = parent.range[1];
    const width = (hi - lo) / bins;

    const stages = CLT_N.map((n) => {
      const rnd = seededRandom(Number(v.seed) + n * 7919);
      const counts = new Array(bins).fill(0);
      const means = [];
      for (let t = 0; t < trials; t++) {
        let acc = 0;
        for (let k = 0; k < n; k++) acc += parent.draw(rnd);
        const z = acc / n;
        means.push(z);
        const b = Math.floor((z - lo) / width);
        if (b >= 0 && b < bins) counts[b] += 1;
      }
      return { n, counts, mean: mean(means), variance: variance(means),
               theory: parent.sigma2 / n };
    });

    return { parentKey: v.parent, parent, trials, bins, lo, hi, width, stages };
  },

  steps: {
    count: () => CLT_N.length,
    label: (m, i) => {
      const s = m.stages[i];
      const prev = i > 0 ? m.stages[i - 1] : null;
      const shape = i === 0 ? 'This is the parent distribution itself, unaveraged.'
        : i === 1 ? 'Averaging just two draws already produces a triangular peak at the centre.'
        : i < 4 ? 'The histogram is visibly bell-shaped now.'
        : 'The histogram is indistinguishable from a normal curve at this resolution.';
      return 'n = ' + s.n + ' draws per average. ' + shape + ' Variance of the averages fell to ' +
        f(s.variance, 4) + (prev ? ', down from ' + f(prev.variance, 4) : '') +
        '; the Central Limit Theorem predicts σ² over n = ' + f(s.theory, 4) + '.';
    }
  },

  figure(model, ctx) {
    const st = model.stages[ctx.step];
    const maxC = Math.max.apply(null, st.counts) || 1;
    const c = chart({ width: 640, height: 360, x: [model.lo, model.hi], y: [0, maxC * 1.12],
                      margin: { top: 26, right: 30, bottom: 58, left: 84 } });
    c.axes({
      xLabel: 'average of ' + st.n + ' draw' + (st.n === 1 ? '' : 's'),
      yLabel: 'how many of the ' + group(model.trials) + ' averages',
      fy: (v) => group(v)
    });

    for (let b = 0; b < model.bins; b++) {
      const x0 = model.lo + b * model.width;
      c.bar(x0, x0 + model.width, st.counts[b], { fill: S(1) });
    }

    const sd = Math.sqrt(model.parent.sigma2 / st.n);
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const x = model.lo + (i / 120) * (model.hi - model.lo);
      pts.push([x, normPdf(x, model.parent.mu, sd) * model.trials * model.width]);
    }
    c.line(pts, { stroke: S(5), width: 2.6, dash: '10 5' });
    c.label(model.lo, maxC * 1.04, 'normal curve with mean ' + f(model.parent.mu, 2) +
      ' and standard deviation ' + f(sd, 3) + ' (dashed)', { dx: 8, fill: INK });

    return c.svg;
  },

  figureAlt(model, ctx) {
    const st = model.stages[ctx.step];
    const peak = st.counts.indexOf(Math.max.apply(null, st.counts));
    return 'Histogram of ' + group(model.trials) + ' averages of ' + st.n + ' draw' +
      (st.n === 1 ? '' : 's') + ' from the ' + model.parent.label + ', on a fixed axis from ' +
      f(model.lo, 1) + ' to ' + f(model.hi, 1) + '. The tallest bin is ' +
      f(model.lo + peak * model.width, 2) + ' to ' + f(model.lo + (peak + 1) * model.width, 2) +
      ', the spread has standard deviation ' + f(Math.sqrt(st.variance), 3) +
      ', and the dashed normal curve with standard deviation ' +
      f(Math.sqrt(model.parent.sigma2 / st.n), 3) + ' lies ' +
      (st.n >= 5 ? 'almost exactly on top of the bars' : 'noticeably away from the bars') + '.';
  },

  table(model, ctx) {
    return {
      caption: 'Mean and variance of the average of n draws from the ' + model.parent.label +
               ', over ' + group(model.trials) + ' simulations each',
      rowHeader: true,
      columns: [
        { label: 'n', numeric: true },
        { label: 'simulated mean μ(Z)', numeric: true },
        { label: 'simulated variance σ²(Z)', numeric: true },
        { label: 'predicted σ²(X) / n', numeric: true },
        { label: 'ratio simulated / predicted', numeric: true }
      ],
      rows: model.stages.map((s, i) => ({
        cells: [s.n, f(s.mean, 4), f(s.variance, 4), f(s.theory, 4), f(s.variance / s.theory, 3)],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const st = model.stages[ctx.step];
    return [
      'Parent distribution: ' + model.parent.label + ', with mean ' + f(model.parent.mu, 4) +
        ' and variance ' + f(model.parent.sigma2, 4) + '.',
      'At n = ' + st.n + ' the simulated averages have mean ' + f(st.mean, 4) +
        ' — the same as the parent, whatever n is — and variance ' + f(st.variance, 4) +
        ' against the predicted ' + f(st.theory, 4) + '.',
      'That is the theorem in one line: the mean does not move, the variance divides by n, and the ' +
        'shape goes normal no matter what the parent looked like.'
    ];
  }
});

/* ==========================================================================
   7. demo-mc-pi — 2.5.3, 2.5.6, 2.5.9 Monte Carlo pi with a confidence interval
   ========================================================================== */

const Z_FOR = { '90': 1.645, '95': 1.96, '99': 2.576 };

createDemo('#demo-mc-pi-mount', {
  id: 'demo-mc-pi',
  title: 'Estimating π by throwing darts',
  description: 'Throw darts at a square, count how many land inside the inscribed circle, and turn ' +
               'that fraction into an estimate of π. Step through ten batches to watch the ' +
               'estimate settle and the confidence interval shrink.',
  headingLevel: 4,

  controls: [
    { type: 'range', name: 'points', label: 'Total number of darts', min: 200, max: 20000, step: 200,
      value: 2000, unit: 'darts' },
    { type: 'select', name: 'confidence', label: 'Confidence level',
      options: [
        { value: '90', label: '90 percent (z = 1.645)' },
        { value: '95', label: '95 percent (z = 1.96)' },
        { value: '99', label: '99 percent (z = 2.576)' }
      ], value: '95' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42,
      help: 'The whole run is regenerated from this seed, so two people with the same seed see the ' +
            'same darts in the same order.' }
  ],

  compute(v) {
    const total = Math.round(Number(v.points));
    const z = Z_FOR[String(v.confidence)] || 1.96;
    const rnd = seededRandom(Number(v.seed));

    const xs = new Float64Array(total);
    const ys = new Float64Array(total);
    const inside = new Uint8Array(total);
    let count = 0;
    for (let i = 0; i < total; i++) {
      const x = 2 * rnd() - 1;
      const y = 2 * rnd() - 1;
      xs[i] = x; ys[i] = y;
      const hit = x * x + y * y <= 1 ? 1 : 0;
      inside[i] = hit;
      count += hit;
    }

    const batches = [];
    for (let b = 1; b <= 10; b++) {
      const n = Math.max(1, Math.round((total * b) / 10));
      let c = 0;
      for (let i = 0; i < n; i++) c += inside[i];
      const phat = c / n;
      const est = 4 * phat;
      const se = Math.sqrt(Math.max(phat * (1 - phat), 0) / n);
      batches.push({
        n, insideCount: c, estimate: est, error: Math.abs(Math.PI - est),
        lo: 4 * (phat - z * se), hi: 4 * (phat + z * se),
        contains: 4 * (phat - z * se) <= Math.PI && Math.PI <= 4 * (phat + z * se)
      });
    }

    const stride = Math.max(1, Math.ceil(total / 900));
    return { total, z, level: String(v.confidence), xs, ys, inside, count, batches, stride };
  },

  steps: {
    count: (m) => m.batches.length,
    label: (m, i) => {
      const b = m.batches[i];
      const prev = i > 0 ? m.batches[i - 1] : null;
      return 'After ' + group(b.n) + ' darts, ' + group(b.insideCount) + ' have landed inside the circle, ' +
        'so π is estimated as 4 × ' + group(b.insideCount) + ' / ' + group(b.n) + ' = ' +
        f(b.estimate, 5) + '. The error is ' + f(b.error, 5) +
        (prev ? ', against ' + f(prev.error, 5) + ' one batch ago' : '') +
        ' and the interval half-width has fallen to ' + f((b.hi - b.lo) / 2, 5) + '.';
    }
  },

  figure(model, ctx) {
    const b = model.batches[ctx.step];
    const c = chart({ width: 420, height: 420, x: [-1.08, 1.08], y: [-1.08, 1.08],
                      margin: { top: 24, right: 24, bottom: 52, left: 62 } });
    c.axes({ xTicks: [-1, -0.5, 0, 0.5, 1], yTicks: [-1, -0.5, 0, 0.5, 1],
             fx: (v) => v.toFixed(1), fy: (v) => v.toFixed(1),
             xLabel: 'x', yLabel: 'y' });

    c.add(svgEl('rect', {
      x: c.sx(-1), y: c.sy(1), width: c.sx(1) - c.sx(-1), height: c.sy(-1) - c.sy(1),
      style: 'fill: none; stroke: ' + AXIS + '; stroke-width: 2; stroke-dasharray: 6 4;'
    }));
    c.add(svgEl('ellipse', {
      cx: c.sx(0), cy: c.sy(0), rx: (c.sx(1) - c.sx(-1)) / 2, ry: (c.sy(-1) - c.sy(1)) / 2,
      style: 'fill: none; stroke: ' + INK + '; stroke-width: 2;'
    }));

    for (let i = 0; i < b.n; i += model.stride) {
      if (model.inside[i]) c.mark(model.xs[i], model.ys[i], 'circle', { r: 2.2, fill: S(1), stroke: S(1), width: 0.8 });
      else c.mark(model.xs[i], model.ys[i], 'cross', { r: 2.6, stroke: S(5), width: 1.2 });
    }
    return c.svg;
  },

  figureAlt(model, ctx) {
    const b = model.batches[ctx.step];
    const shown = Math.ceil(b.n / model.stride);
    return 'Square from minus 1 to 1 with the unit circle drawn on it. Of the first ' + group(b.n) +
      ' darts, ' + group(b.insideCount) + ' landed inside the circle (filled dots) and ' +
      group(b.n - b.insideCount) + ' outside (crosses), giving an estimate of π = ' +
      f(b.estimate, 5) + '. The plot draws every ' + model.stride + (model.stride === 1 ? 'st' : 'th') +
      ' dart, ' + group(shown) + ' markers in all; the estimate uses every dart.';
  },

  table(model, ctx) {
    return {
      caption: 'Cumulative π estimate after each of ten batches, with the ' + model.level +
               ' percent confidence interval',
      rowHeader: true,
      columns: [
        { label: 'Darts so far', numeric: true },
        { label: 'Inside the circle', numeric: true },
        { label: 'Estimate of π', numeric: true },
        { label: 'Absolute error', numeric: true },
        { label: 'Interval lower', numeric: true },
        { label: 'Interval upper', numeric: true },
        { label: 'Interval contains π' }
      ],
      rows: model.batches.map((b, i) => ({
        cells: [group(b.n), group(b.insideCount), f(b.estimate, 5), f(b.error, 5),
                f(b.lo, 5), f(b.hi, 5), b.contains ? 'yes' : 'no'],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const b = model.batches[ctx.step];
    const first = model.batches[0];
    return [
      'Estimate π ≈ 4 × (darts inside) / (darts thrown) = ' + f(b.estimate, 5) +
        ', against the true value 3.14159. The absolute error is ' + f(b.error, 5) + '.',
      'The ' + model.level + ' percent interval runs from ' + f(b.lo, 5) + ' to ' + f(b.hi, 5) +
        ', and π ' + (b.contains ? 'is inside it' : 'is outside it — that happens for about ' +
        (100 - Number(model.level)) + ' percent of runs, which is exactly what the level means') + '.',
      'Between the first batch and this one the sample grew ' + f(b.n / first.n, 1) +
        ' times and the interval half-width shrank ' + f(((first.hi - first.lo) / (b.hi - b.lo)), 2) +
        ' times — close to the square root of the sample growth, because the error falls as ' +
        'one over the square root of n.'
    ];
  }
});

/* ==========================================================================
   8. demo-mc-integration — 2.5.2, 2.5.4, 2.5.6, 2.5.7 in one dimension
   ========================================================================== */

const INTEGRANDS = {
  xsinx: {
    label: 'x sin x on 0 to π', a: 0, b: Math.PI, exact: Math.PI,
    f: (x) => x * Math.sin(x), text: 'f(x) = x sin x, exact value π'
  },
  midterm: {
    label: 'cos x + sin 3x on 0 to π/2', a: 0, b: Math.PI / 2, exact: 4 / 3,
    f: (x) => Math.cos(x) + Math.sin(3 * x), text: 'f(x) = cos x + sin 3x, exact value 4/3'
  },
  quarter: {
    label: '√(1 − x²) on 0 to 1', a: 0, b: 1, exact: Math.PI / 4,
    f: (x) => Math.sqrt(Math.max(0, 1 - x * x)), text: 'f(x) = square root of (1 − x squared), exact value π/4'
  },
  square: {
    label: 'x² on 0 to 1', a: 0, b: 1, exact: 1 / 3,
    f: (x) => x * x, text: 'f(x) = x squared, exact value 1/3'
  }
};

const MC_NS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200];

createDemo('#demo-mc-integration-mount', {
  id: 'demo-mc-integration',
  title: 'Monte Carlo versus equispaced integration',
  description: 'The same integral, estimated two ways: an equispaced midpoint rule and random ' +
               'sampling. Step through ten sample sizes and read the two error laws straight off ' +
               'the log-log plot.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'fn', label: 'Integrand',
      options: Object.keys(INTEGRANDS).map((k) => ({ value: k, label: INTEGRANDS[k].label })),
      value: 'xsinx' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42,
      help: 'Monte Carlo error is itself random. Change the seed and the noisy series moves; the ' +
            'equispaced series does not move at all, because it uses no randomness.' }
  ],

  compute(v) {
    const g = INTEGRANDS[v.fn] || INTEGRANDS.xsinx;
    const span = g.b - g.a;

    const rows = MC_NS.map((n) => {
      const rnd = seededRandom(Number(v.seed) + n);
      let acc = 0, acc2 = 0;
      for (let i = 0; i < n; i++) {
        const x = g.a + span * rnd();
        const y = g.f(x);
        acc += y; acc2 += y * y;
      }
      const fbar = acc / n;
      const mcEst = span * fbar;
      const sigmaF = Math.sqrt(Math.max(acc2 / n - fbar * fbar, 0));

      let eq = 0;
      const h = span / n;
      for (let i = 0; i < n; i++) eq += g.f(g.a + (i + 0.5) * h);
      const eqEst = h * eq;

      return {
        n, fbar, mcEst, mcError: Math.abs(g.exact - mcEst),
        predicted: (span * sigmaF) / Math.sqrt(n),
        eqEst, eqError: Math.abs(g.exact - eqEst), sigmaF
      };
    });

    return { key: v.fn, g, span, rows };
  },

  steps: {
    count: (m) => m.rows.length,
    label: (m, i) => {
      const r = m.rows[i];
      const prev = i > 0 ? m.rows[i - 1] : null;
      const base = 'With n = ' + group(r.n) + ' points, the Monte Carlo estimate is ' + f(r.mcEst, 6) +
        ' (error ' + f(r.mcError, 6) + ') and the equispaced midpoint rule gives ' + f(r.eqEst, 6) +
        ' (error ' + f(r.eqError, 6) + ').';
      if (!prev) return base + ' This is the starting point of the sweep.';
      return base + ' Doubling n cut the equispaced error by a factor of ' +
        f(prev.eqError / Math.max(r.eqError, 1e-15), 1) + ' and the Monte Carlo error by ' +
        f(prev.mcError / Math.max(r.mcError, 1e-15), 1) + '.';
    }
  },

  figure(model, ctx) {
    const lg = (v) => Math.log10(Math.max(v, 1e-14));
    const allErrors = model.rows.flatMap((r) => [r.mcError, r.eqError]);
    const yLo = Math.floor(lg(Math.min.apply(null, allErrors.filter((e) => e > 0))) - 0.4);
    const yHi = Math.ceil(lg(Math.max.apply(null, allErrors)) + 0.3);

    const c = chart({ width: 640, height: 380, x: [2, 4.8], y: [yLo, yHi],
                      margin: { top: 26, right: 34, bottom: 58, left: 86 } });
    c.axes({
      xTicks: [2, 2.5, 3, 3.5, 4, 4.5],
      yTicks: ticks(yLo, yHi, 6),
      fx: (v) => '10^' + v.toFixed(1),
      fy: (v) => '10^' + v.toFixed(0),
      xLabel: 'number of points n (logarithmic)',
      yLabel: 'absolute error (logarithmic)'
    });

    c.line(model.rows.map((r) => [lg(r.n), lg(r.eqError)]), { stroke: S(5), width: 2.4, dash: '10 5' });
    model.rows.forEach((r, i) => c.mark(lg(r.n), lg(r.eqError), 'square',
      { r: i === ctx.step ? 6 : 3.4, stroke: S(5), fill: SURFACE, width: 2 }));

    c.line(model.rows.map((r) => [lg(r.n), lg(r.mcError)]), { stroke: S(1), width: 2.4 });
    model.rows.forEach((r, i) => c.mark(lg(r.n), lg(r.mcError), 'circle',
      { r: i === ctx.step ? 6 : 3.4, stroke: S(1), fill: SURFACE, width: 2 }));

    const ref0 = lg(model.rows[0].mcError);
    c.line([[2, ref0], [4.8, ref0 - 0.5 * 2.8]], { stroke: S(3), width: 1.6, dash: '3 4' });

    c.label(2, yHi, 'equispaced midpoint: dashed line, squares', { dx: 6, dy: 14, fill: INK });
    c.label(2, yHi, 'Monte Carlo: solid line, circles', { dx: 6, dy: 32, fill: INK });
    c.label(2, yHi, 'reference slope −1/2: dotted', { dx: 6, dy: 50, fill: INK });

    return c.svg;
  },

  figureAlt(model, ctx) {
    const r = model.rows[ctx.step];
    const last = model.rows[model.rows.length - 1];
    const first = model.rows[0];
    const eqSlope = (Math.log10(last.eqError) - Math.log10(first.eqError)) /
                    (Math.log10(last.n) - Math.log10(first.n));
    const mcSlope = (Math.log10(last.mcError) - Math.log10(first.mcError)) /
                    (Math.log10(last.n) - Math.log10(first.n));
    return 'Log-log plot of absolute error against the number of points for ' + model.g.label +
      '. The equispaced series falls along a straight line of slope ' + f(eqSlope, 2) +
      '; the Monte Carlo series is noisy but trends at slope ' + f(mcSlope, 2) +
      ', close to the theoretical minus one half. The highlighted point is n = ' + group(r.n) +
      ', where the equispaced error is ' + f(r.eqError, 6) + ' and the Monte Carlo error is ' +
      f(r.mcError, 6) + '.';
  },

  table(model, ctx) {
    return {
      caption: 'Estimates and errors for ' + model.g.text + ', by number of points',
      rowHeader: true,
      columns: [
        { label: 'n', numeric: true },
        { label: 'Monte Carlo estimate', numeric: true },
        { label: 'Monte Carlo error', numeric: true },
        { label: 'Predicted error (b−a)σ(f)/√n', numeric: true },
        { label: 'Equispaced estimate', numeric: true },
        { label: 'Equispaced error', numeric: true }
      ],
      rows: model.rows.map((r, i) => ({
        cells: [group(r.n), f(r.mcEst, 6), f(r.mcError, 6), f(r.predicted, 6),
                f(r.eqEst, 6), f(r.eqError, 6)],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const r = model.rows[ctx.step];
    return [
      'The identity behind the method: the integral equals the average height of f times the width ' +
        'of the interval. Here the average of ' + group(r.n) + ' sampled heights is ' + f(r.fbar, 5) +
        ' and the interval is ' + f(model.span, 5) + ' wide, so the estimate is ' + f(r.mcEst, 6) + '.',
      'The error formula (b − a) σ(f) over the square root of n predicts ' + f(r.predicted, 6) +
        '; the error actually observed is ' + f(r.mcError, 6) + '.',
      'In one dimension the equispaced rule wins easily — its error falls like 1/n, not like one ' +
        'over the square root of n. That is exactly why the slides say Monte Carlo is almost always a ' +
        'bad idea for 1-D integrals, and why it becomes the only option in high dimensions.'
    ];
  }
});

/* ==========================================================================
   9. demo-curse-dimension — 2.5.5, 2.5.8
   ========================================================================== */

function ballVolume(d) { return Math.exp((d / 2) * Math.log(Math.PI) - lgamma(d / 2 + 1)); }

createDemo('#demo-curse-dimension-mount', {
  id: 'demo-curse-dimension',
  title: 'The curse of dimensionality',
  description: 'Estimate the volume of the unit ball in d dimensions by darts, and compare the cost ' +
               'with a product grid at the same resolution per axis. Monte Carlo cost stays flat; ' +
               'grid cost explodes.',
  headingLevel: 4,

  controls: [
    { type: 'range', name: 'samples', label: 'Monte Carlo samples per dimension count', min: 1000, max: 50000,
      step: 1000, value: 10000, unit: 'samples' },
    { type: 'range', name: 'perAxis', label: 'Grid points per axis', min: 3, max: 20, step: 1, value: 10,
      unit: 'points per axis',
      help: 'A grid with this many points along each of d axes needs that number raised to the power d ' +
            'function evaluations. Ten points per axis in ten dimensions is ten billion.' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42 }
  ],

  compute(v) {
    const n = Math.round(Number(v.samples));
    const perAxis = Math.round(Number(v.perAxis));
    const rows = [];
    for (let d = 1; d <= 10; d++) {
      const rnd = seededRandom(Number(v.seed) + d * 104729);
      let inside = 0;
      for (let i = 0; i < n; i++) {
        let r2 = 0;
        for (let k = 0; k < d; k++) { const x = 2 * rnd() - 1; r2 += x * x; }
        if (r2 <= 1) inside += 1;
      }
      const domain = Math.pow(2, d);
      const est = domain * (inside / n);
      const exact = ballVolume(d);
      rows.push({
        d, inside, est, exact, error: Math.abs(exact - est),
        relative: Math.abs(exact - est) / exact,
        gridPoints: Math.pow(perAxis, d), mcPoints: n
      });
    }
    return { n, perAxis, rows };
  },

  steps: {
    count: (m) => m.rows.length,
    label: (m, i) => {
      const r = m.rows[i];
      return 'In ' + r.d + ' dimension' + (r.d === 1 ? '' : 's') + ', ' + group(r.inside) + ' of ' +
        group(r.mcPoints) + ' darts land inside the unit ball, giving a volume estimate of ' +
        f(r.est, 5) + ' against the exact ' + f(r.exact, 5) + ' (relative error ' +
        f(r.relative * 100, 2) + ' percent). A grid at ' + m.perAxis + ' points per axis would need ' +
        group(r.gridPoints) + ' evaluations for the same job.';
    }
  },

  figure(model, ctx) {
    const lg = (v) => Math.log10(Math.max(v, 1));
    const yHi = Math.ceil(lg(model.rows[9].gridPoints)) + 0.5;
    const c = chart({ width: 640, height: 360, x: [0.4, 10.6], y: [0, yHi],
                      margin: { top: 26, right: 30, bottom: 58, left: 92 } });
    c.axes({
      xTicks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      yTicks: ticks(0, yHi, 6), fy: (v) => '10^' + v.toFixed(0),
      xLabel: 'dimension d', yLabel: 'function evaluations needed (logarithmic)'
    });

    model.rows.forEach((r, i) => {
      c.bar(r.d - 0.34, r.d + 0.02, lg(r.gridPoints), { fill: i === ctx.step ? S(1) : S(4) });
    });
    c.line(model.rows.map((r) => [r.d, lg(r.mcPoints)]), { stroke: S(5), width: 2.6, dash: '9 5' });
    model.rows.forEach((r) => c.mark(r.d, lg(r.mcPoints), 'circle', { r: 3.6, stroke: S(5), fill: SURFACE }));

    c.label(0.6, yHi * 0.96, 'grid at ' + model.perAxis + ' points per axis: bars', { dx: 4, fill: INK });
    c.label(0.6, yHi * 0.88, 'Monte Carlo, fixed at ' + group(model.n) + ': dashed line with circles',
      { dx: 4, fill: INK });

    return c.svg;
  },

  figureAlt(model, ctx) {
    const r = model.rows[ctx.step];
    const last = model.rows[9];
    return 'Bars show the number of grid evaluations needed in each dimension from 1 to 10, on a ' +
      'logarithmic scale; the dashed line shows the fixed Monte Carlo budget of ' + group(model.n) +
      ' samples. The bars climb by a constant factor of ' + model.perAxis +
      ' per dimension, reaching ' + group(last.gridPoints) + ' at d = 10, while the dashed line is flat. ' +
      'Dimension ' + r.d + ' is highlighted: grid ' + group(r.gridPoints) + ' evaluations against ' +
      group(r.mcPoints) + ' Monte Carlo samples.';
  },

  table(model, ctx) {
    return {
      caption: 'Volume of the unit ball in d dimensions by Monte Carlo with ' + group(model.n) +
               ' samples, and the cost of a ' + model.perAxis + '-point-per-axis grid',
      rowHeader: true,
      columns: [
        { label: 'd', numeric: true },
        { label: 'Exact volume', numeric: true },
        { label: 'Monte Carlo estimate', numeric: true },
        { label: 'Relative error (%)', numeric: true },
        { label: 'Monte Carlo evaluations', numeric: true },
        { label: 'Grid evaluations', numeric: true }
      ],
      rows: model.rows.map((r, i) => ({
        cells: [r.d, f(r.exact, 5), f(r.est, 5), f(r.relative * 100, 2),
                group(r.mcPoints), group(r.gridPoints)],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const r = model.rows[ctx.step];
    const errs = model.rows.slice(1).map((row) => row.relative * 100);
    return [
      'Monte Carlo error goes as one over the square root of n, whatever d is. From d = 2 to d = 10 the ' +
        'relative error here runs between ' + f(Math.min.apply(null, errs), 2) + ' and ' +
        f(Math.max.apply(null, errs), 2) + ' percent, with no trend against dimension, even though the ' +
        'geometry changes completely. (d = 1 is exact: every dart in the interval is inside the ball.)',
      'A systematic quadrature rule with 1-D convergence p costs n to the power minus p over d in ' +
        'd dimensions. At d = ' + r.d + ' the grid needs ' + group(r.gridPoints) +
        ' evaluations to keep the same resolution per axis, against ' + group(r.mcPoints) +
        ' for Monte Carlo — a ratio of ' + f(r.gridPoints / r.mcPoints, 2) + '.',
      'The unit ball also gets strange: its volume peaks at d = 5 and then falls towards zero, so in ' +
        'high dimensions almost none of the cube is inside the ball.'
    ];
  }
});

/* ==========================================================================
   10. demo-mc-optimization — 2.5.10, 2.5.11 random search with zoom [NEW]
   --------------------------------------------------------------------------
   Lab 06 leaves delta undefined. It is pinned here: each zoom keeps the best
   point found so far and shrinks the bracket to a quarter of its width, using
   half as many samples as the previous stage.
   ========================================================================== */

const LAB6 = {
  f1: {
    label: 'f₁(x) = |cos(πx)| on [0, 1]', a: 0, b: 1,
    f: (x) => Math.abs(Math.cos(Math.PI * x))
  },
  f2: {
    label: 'f₂(x) = cos x + 5cos(1.6x) − 2cos(2x) + 5cos(4.5x) + 7cos(9x) on [2, 7]',
    a: 2, b: 7,
    f: (x) => Math.cos(x) + 5 * Math.cos(1.6 * x) - 2 * Math.cos(2 * x) +
              5 * Math.cos(4.5 * x) + 7 * Math.cos(9 * x)
  },
  f3: {
    label: 'f₃(x), a sum of three sech-squared bumps on [0, 1]', a: 0, b: 1,
    f: (x) => {
      const sech = (z) => 1 / Math.cosh(z);
      return -Math.pow(sech(10 * (x - 0.2)), 2) + Math.pow(sech(100 * (x - 0.4)), 2) +
             Math.pow(sech(1000 * (x - 0.6)), 2);
    }
  }
};

/** Reference minimum by dense deterministic scan — used only for the error column. */
function referenceMin(g) {
  const n = 200000;
  let bx = g.a, by = g.f(g.a);
  for (let i = 1; i <= n; i++) {
    const x = g.a + ((g.b - g.a) * i) / n;
    const y = g.f(x);
    if (y < by) { by = y; bx = x; }
  }
  return { x: bx, y: by };
}

const LAB6_REF = {
  f1: referenceMin(LAB6.f1),
  f2: referenceMin(LAB6.f2),
  f3: referenceMin(LAB6.f3)
};

createDemo('#demo-mc-optimization-mount', {
  id: 'demo-mc-optimization',
  title: 'Monte Carlo minimisation with zoom',
  description: 'Lab 06’s find_min_mc, then find_min_mc_wzoom. Scatter points across the whole ' +
               'interval, keep the lowest, shrink the bracket around it, and repeat. Each step of the ' +
               'playback is one zoom stage.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'fn', label: 'Function to minimise',
      options: Object.keys(LAB6).map((k) => ({ value: k, label: LAB6[k].label })), value: 'f1' },
    { type: 'range', name: 'n', label: 'Samples in the first stage', min: 25, max: 1600, step: 25,
      value: 200, unit: 'points' },
    { type: 'range', name: 'nzoom', label: 'Number of zoom stages', min: 0, max: 6, step: 1, value: 3,
      unit: 'zooms',
      help: 'With zero zooms this is exactly the plain random search of Lab 06 task 2. Each extra ' +
            'stage keeps the best point so far, shrinks the bracket to a quarter of its width, and ' +
            'uses half as many samples as the stage before.' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 56789,
      help: 'Lab 06 mandates seed 56789 so everybody’s numbers agree.' }
  ],

  compute(v) {
    const g = LAB6[v.fn] || LAB6.f1;
    const ref = LAB6_REF[v.fn] || LAB6_REF.f1;
    const nzoom = Math.round(Number(v.nzoom));
    const rnd = seededRandom(Number(v.seed));

    let lo = g.a, hi = g.b;
    let bestX = null, bestY = Infinity;
    let evals = 0;
    const stages = [];

    for (let s = 0; s <= nzoom; s++) {
      const count = Math.max(8, Math.round(Number(v.n) / Math.pow(2, s)));
      const pts = [];
      for (let i = 0; i < count; i++) {
        const x = lo + (hi - lo) * rnd();
        const y = g.f(x);
        pts.push([x, y]);
        evals += 1;
        if (y < bestY) { bestY = y; bestX = x; }
      }
      stages.push({
        index: s, lo, hi, count, evals, bestX, bestY,
        width: hi - lo,
        error: Math.abs(bestX - ref.x),
        points: pts.slice(0, 260)
      });
      const half = (hi - lo) / 8;
      lo = Math.max(g.a, bestX - half);
      hi = Math.min(g.b, bestX + half);
      if (hi - lo < 1e-12) { hi = lo + 1e-12; }
    }

    const curve = [];
    for (let i = 0; i <= 600; i++) {
      const x = g.a + ((g.b - g.a) * i) / 600;
      curve.push([x, g.f(x)]);
    }

    return { key: v.fn, g, ref, stages, curve, nzoom, n: Math.round(Number(v.n)) };
  },

  steps: {
    count: (m) => m.stages.length,
    label: (m, i) => {
      const s = m.stages[i];
      const prev = i > 0 ? m.stages[i - 1] : null;
      if (i === 0) {
        return 'Stage 1: ' + group(s.count) + ' random points across the whole interval [' +
          f(s.lo, 4) + ', ' + f(s.hi, 4) + ']. The lowest of them is at x = ' + f(s.bestX, 5) +
          ' with f = ' + f(s.bestY, 5) + '.';
      }
      return 'Stage ' + (i + 1) + ': the bracket has shrunk to [' + f(s.lo, 5) + ', ' + f(s.hi, 5) +
        '], a width of ' + f(s.width, 6) + ', and ' + group(s.count) + ' more points were drawn inside it. ' +
        'The best location moved from ' + f(prev.bestX, 5) + ' to ' + f(s.bestX, 5) +
        ' and the distance to the true minimum fell from ' + f(prev.error, 6) + ' to ' + f(s.error, 6) + '.';
    }
  },

  figure(model, ctx) {
    const s = model.stages[ctx.step];
    const ys = model.curve.map((p) => p[1]);
    const yLo = Math.min.apply(null, ys), yHi = Math.max.apply(null, ys);
    const pad = (yHi - yLo) * 0.12 || 1;
    const c = chart({ width: 640, height: 360, x: [model.g.a, model.g.b], y: [yLo - pad, yHi + pad],
                      margin: { top: 26, right: 30, bottom: 58, left: 82 } });
    c.axes({ xLabel: 'x', yLabel: 'f(x)', fy: (v) => f(v, 1) });

    c.line(model.curve, { stroke: S(5), width: 2 });

    c.add(svgEl('rect', {
      x: c.sx(s.lo), y: c.sy(yHi + pad),
      width: Math.max(2, c.sx(s.hi) - c.sx(s.lo)),
      height: c.sy(yLo - pad) - c.sy(yHi + pad),
      style: 'fill: none; stroke: ' + S(3) + '; stroke-width: 2.5; stroke-dasharray: 7 4;'
    }));

    s.points.forEach((p) => c.mark(p[0], p[1], 'circle', { r: 2.2, stroke: S(1), width: 1 }));
    c.mark(s.bestX, s.bestY, 'star', { r: 7, stroke: S(1), fill: S(1), width: 2 });
    c.mark(model.ref.x, model.ref.y, 'triangle', { r: 6, stroke: S(6), width: 2.4 });

    c.label(model.g.a, yHi + pad * 0.4, 'current bracket: dashed rectangle', { dx: 6, fill: INK });
    c.label(model.g.a, yHi - pad * 0.4, 'best so far: filled star · true minimum: triangle',
      { dx: 6, fill: INK });

    return c.svg;
  },

  figureAlt(model, ctx) {
    const s = model.stages[ctx.step];
    return 'Curve of ' + model.g.label + ' with the search bracket drawn as a dashed rectangle from ' +
      f(s.lo, 4) + ' to ' + f(s.hi, 4) + '. ' + group(Math.min(s.count, 260)) +
      ' sample points are scattered inside it, the filled star marks the best point found so far at x = ' +
      f(s.bestX, 5) + ', f = ' + f(s.bestY, 5) + ', and the triangle marks the true minimum at x = ' +
      f(model.ref.x, 5) + '. The gap between star and triangle is ' + f(s.error, 6) + '.';
  },

  table(model, ctx) {
    return {
      caption: 'Zoom schedule for ' + model.g.label +
               ' — bracket, sample count, and the error in the location of the minimum',
      rowHeader: true,
      columns: [
        { label: 'Stage', numeric: true },
        { label: 'Bracket left', numeric: true },
        { label: 'Bracket right', numeric: true },
        { label: 'Points this stage', numeric: true },
        { label: 'Evaluations so far', numeric: true },
        { label: 'Best x', numeric: true },
        { label: 'Best f(x)', numeric: true },
        { label: 'Error in x', numeric: true }
      ],
      rows: model.stages.map((s, i) => ({
        cells: [s.index + 1, f(s.lo, 5), f(s.hi, 5), group(s.count), group(s.evals),
                f(s.bestX, 6), f(s.bestY, 6), f(s.error, 6)],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const s = model.stages[ctx.step];
    const plain = model.stages[0];
    const lines = [
      'The true global minimum of this function is at x = ' + f(model.ref.x, 6) + ' with f = ' +
        f(model.ref.y, 6) + ', found by a dense deterministic scan of 200,001 points — that scan ' +
        'is the yardstick, not part of the algorithm.',
      'After ' + (ctx.step + 1) + ' stage' + (ctx.step ? 's' : '') + ' and ' + group(s.evals) +
        ' function evaluations, random search reports x = ' + f(s.bestX, 6) + ', f = ' + f(s.bestY, 6) +
        ', an error of ' + f(s.error, 6) + ' in the location.'
    ];
    if (ctx.step > 0) {
      lines.push('Plain random search with the same first stage spent ' + group(plain.evals) +
        ' evaluations for an error of ' + f(plain.error, 6) + '. Zooming has bought a factor of ' +
        f(plain.error / Math.max(s.error, 1e-12), 1) + ' in accuracy for ' +
        f(s.evals / plain.evals, 2) + ' times the cost.');
    }
    if (model.key === 'f3') {
      lines.push('Watch this one fail. The third bump of f₃ is about 0.002 wide, so a uniform ' +
        'sample almost never lands on it, and once the bracket has locked onto the wrong dip no ' +
        'amount of zooming recovers. Zooming is a refinement, not a guarantee of convergence.');
    }
    return lines;
  }
});

/* ==========================================================================
   11. demo-random-walk — 2.6.1 to 2.6.4
   ========================================================================== */

createDemo('#demo-random-walk-mount', {
  id: 'demo-random-walk',
  title: 'Random walks, diffusion and stock prices',
  description: 'One engine, three readings of it: a single 2-D walk, a cloud of particles spreading ' +
               'from a point, and a price path under geometric Brownian motion. Step through time and ' +
               'check the square-root-of-t law as it happens.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'mode', label: 'What to simulate',
      options: [
        { value: 'walk', label: '2-D random walk paths' },
        { value: 'diffusion', label: 'Diffusing cloud of particles' },
        { value: 'gbm', label: 'Geometric Brownian motion (stock price)' }
      ], value: 'walk' },
    { type: 'range', name: 'steps', label: 'Number of steps', min: 50, max: 1000, step: 50, value: 400,
      unit: 'steps' },
    { type: 'range', name: 'sigma', label: 'Volatility σ', min: 0.1, max: 2, step: 0.1, value: 1 },
    { type: 'range', name: 'mu', label: 'Drift μ', min: -0.2, max: 0.2, step: 0.01, value: 0,
      help: 'Drift is a constant push added to every step. With zero drift the walk has no preferred ' +
            'direction and the mean displacement stays near zero however long you wait.' },
    { type: 'range', name: 'particles', label: 'Number of particles', min: 1, max: 60, step: 1, value: 24,
      help: 'The displacement statistics are averaged over these particles, so a handful of particles ' +
            'gives a noisy check of the square-root law and thirty or more gives a convincing one.' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42 }
  ],

  compute(v) {
    const mode = v.mode;
    const nSteps = Math.round(Number(v.steps));
    const sigma = Number(v.sigma);
    const mu = Number(v.mu);
    const nPart = mode === 'gbm' ? 1 : Math.round(Number(v.particles));
    const dt = 0.05;
    const rnd = seededRandom(Number(v.seed));

    const paths = [];
    for (let p = 0; p < nPart; p++) {
      const xs = [0], ys = [0], price = [100];
      for (let i = 1; i <= nSteps; i++) {
        if (mode === 'gbm') {
          const dW = gauss(rnd) * Math.sqrt(dt);
          const prev = price[i - 1];
          price.push(Math.max(0.01, prev + prev * (mu * dt + sigma * dW)));
          xs.push(i * dt); ys.push(price[i]);
        } else {
          xs.push(xs[i - 1] + mu * dt + sigma * Math.sqrt(dt) * gauss(rnd));
          ys.push(ys[i - 1] + mu * dt + sigma * Math.sqrt(dt) * gauss(rnd));
        }
      }
      paths.push({ xs, ys, price });
    }

    const checkpoints = [];
    for (let k = 1; k <= 10; k++) {
      const i = Math.round((nSteps * k) / 10);
      const t = i * dt;
      if (mode === 'gbm') {
        const s = paths[0].price[i];
        checkpoints.push({ i, t, price: s, ret: (s / 100 - 1) * 100,
                           expected: 100 * Math.exp(mu * t) });
      } else {
        const dists = paths.map((p) => Math.sqrt(p.xs[i] * p.xs[i] + p.ys[i] * p.ys[i]));
        const rms = Math.sqrt(mean(dists.map((d) => d * d)));
        checkpoints.push({ i, t, meanDist: mean(dists), rms,
                           theory: sigma * Math.sqrt(2 * t),
                           spread: Math.sqrt(variance(paths.map((p) => p.xs[i]))) });
      }
    }

    return { mode, nSteps, sigma, mu, nPart, dt, paths, checkpoints };
  },

  steps: {
    count: (m) => m.checkpoints.length,
    label: (m, i) => {
      const c = m.checkpoints[i];
      if (m.mode === 'gbm') {
        return 'At t = ' + f(c.t, 2) + ' (' + group(c.i) + ' steps) the price is ' + f(c.price, 2) +
          ', a return of ' + f(c.ret, 2) + ' percent. The deterministic drift alone would give ' +
          f(c.expected, 2) + '; the difference is the volatility.';
      }
      const prev = i > 0 ? m.checkpoints[i - 1] : null;
      return 'At t = ' + f(c.t, 2) + ' (' + group(c.i) + ' steps) the root-mean-square displacement is ' +
        f(c.rms, 3) + ' against the theoretical σ √(2t) = ' + f(c.theory, 3) + '.' +
        (prev ? ' Time has grown ' + f(c.t / prev.t, 2) + ' times and the displacement ' +
          f(c.rms / Math.max(prev.rms, 1e-9), 2) + ' times — distance follows the square root of time, not time.' : '');
    }
  },

  figure(model, ctx) {
    const cp = model.checkpoints[ctx.step];
    const upto = cp.i;

    if (model.mode === 'gbm') {
      const prices = model.paths[0].price.slice(0, upto + 1);
      const lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
      const pad = (hi - lo) * 0.1 || 1;
      const c = chart({ width: 640, height: 340, x: [0, model.nSteps * model.dt], y: [lo - pad, hi + pad],
                        margin: { top: 26, right: 30, bottom: 58, left: 86 } });
      c.axes({ xLabel: 'time t', yLabel: 'price', fy: (v) => f(v, 0) });
      c.line(prices.map((p, i) => [i * model.dt, p]), { stroke: S(1), width: 2 });
      c.mark(0, 100, 'circle', { r: 5, stroke: S(3), fill: SURFACE, width: 2 });
      c.mark(upto * model.dt, prices[prices.length - 1], 'star', { r: 7, stroke: S(1), fill: S(1) });
      c.label(0, hi, 'start: open circle · now: filled star', { dx: 8, dy: -6, fill: INK });
      return c.svg;
    }

    let ext = 0.5;
    model.paths.forEach((p) => {
      for (let i = 0; i <= upto; i++) {
        ext = Math.max(ext, Math.abs(p.xs[i]), Math.abs(p.ys[i]));
      }
    });
    ext *= 1.12;

    const c = chart({ width: 460, height: 460, x: [-ext, ext], y: [-ext, ext],
                      margin: { top: 24, right: 24, bottom: 56, left: 74 } });
    c.axes({ xLabel: 'x displacement', yLabel: 'y displacement', fx: (v) => f(v, 1), fy: (v) => f(v, 1) });

    const stride = Math.max(1, Math.ceil(upto / 400));
    model.paths.forEach((p, k) => {
      if (model.mode === 'walk') {
        const pts = [];
        for (let i = 0; i <= upto; i += stride) pts.push([p.xs[i], p.ys[i]]);
        pts.push([p.xs[upto], p.ys[upto]]);
        c.line(pts, { stroke: S((k % 3) + 1), width: 1.4, dash: k % 3 === 1 ? '5 3' : (k % 3 === 2 ? '2 3' : 'none') });
      }
      c.mark(p.xs[upto], p.ys[upto], 'star', { r: 5, stroke: S(1), fill: S(1), width: 1.4 });
    });
    c.mark(0, 0, 'circle', { r: 6, stroke: S(3), fill: SURFACE, width: 2.4 });

    const ring = cp.theory;
    if (ring > 0 && ring < ext) {
      c.add(svgEl('ellipse', {
        cx: c.sx(0), cy: c.sy(0),
        rx: Math.abs(c.sx(ring) - c.sx(0)), ry: Math.abs(c.sy(ring) - c.sy(0)),
        style: 'fill: none; stroke: ' + S(5) + '; stroke-width: 2; stroke-dasharray: 8 5;'
      }));
    }
    c.label(-ext, ext, 'origin: open circle · current position: star · dashed ring: σ√(2t)',
      { dx: 4, dy: 14, fill: INK, size: TEXT_SM });

    return c.svg;
  },

  figureAlt(model, ctx) {
    const cp = model.checkpoints[ctx.step];
    if (model.mode === 'gbm') {
      return 'Price path from 100 over ' + group(cp.i) + ' steps to time ' + f(cp.t, 2) +
        ', ending at ' + f(cp.price, 2) + '. The path has no trend you could extrapolate; each ' +
        'increment is proportional to the current price times a fresh normal draw.';
    }
    return (model.mode === 'walk' ? model.nPart + ' random-walk path' + (model.nPart === 1 ? '' : 's')
      : 'A cloud of ' + model.nPart + ' particles') + ' after ' + group(cp.i) + ' steps, at time ' +
      f(cp.t, 2) + '. The root-mean-square distance from the origin is ' + f(cp.rms, 3) +
      ' and the dashed reference ring sits at the theoretical σ √(2t) = ' + f(cp.theory, 3) +
      '. The mean distance is ' + f(cp.meanDist, 3) + '.';
  },

  table(model, ctx) {
    if (model.mode === 'gbm') {
      return {
        caption: 'Price at ten checkpoints, drift μ = ' + f(model.mu, 2) + ', volatility σ = ' +
                 f(model.sigma, 1) + ', starting price 100',
        rowHeader: true,
        columns: [
          { label: 'Steps', numeric: true },
          { label: 'Time t', numeric: true },
          { label: 'Price', numeric: true },
          { label: 'Return (%)', numeric: true },
          { label: 'Drift-only price', numeric: true }
        ],
        rows: model.checkpoints.map((c, i) => ({
          cells: [group(c.i), f(c.t, 2), f(c.price, 3), f(c.ret, 2), f(c.expected, 3)],
          current: i === ctx.step
        }))
      };
    }
    return {
      caption: 'Displacement of ' + model.nPart + ' particle' + (model.nPart === 1 ? '' : 's') +
               ' at ten checkpoints, volatility σ = ' + f(model.sigma, 1) +
               ', drift μ = ' + f(model.mu, 2),
      rowHeader: true,
      columns: [
        { label: 'Steps', numeric: true },
        { label: 'Time t', numeric: true },
        { label: 'Mean distance from start', numeric: true },
        { label: 'Root-mean-square distance', numeric: true },
        { label: 'Theory σ√(2t)', numeric: true },
        { label: 'Standard deviation of x', numeric: true }
      ],
      rows: model.checkpoints.map((c, i) => ({
        cells: [group(c.i), f(c.t, 2), f(c.meanDist, 4), f(c.rms, 4), f(c.theory, 4), f(c.spread, 4)],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const cp = model.checkpoints[ctx.step];
    if (model.mode === 'gbm') {
      return [
        'Geometric Brownian motion updates the price by S ← S + S(μ Δt + σ ΔW), so the ' +
          'increment scales with the price itself. That is why prices cannot go negative and why ' +
          'percentage returns, not dollar changes, are the natural unit.',
        'At time ' + f(cp.t, 2) + ' the simulated price is ' + f(cp.price, 2) + ' against ' +
          f(cp.expected, 2) + ' for the drift alone. The gap is the accumulated noise.',
        'The same engine drives the pollen grain and the share price; only the interpretation of the ' +
          'increment changes.'
      ];
    }
    const first = model.checkpoints[0];
    return [
      'Each step adds an independent normal displacement to both coordinates, so the variance of the ' +
        'position grows linearly with time and the distance grows with the square root of time.',
      'At time ' + f(cp.t, 2) + ' the root-mean-square displacement is ' + f(cp.rms, 3) +
        ' against the theoretical ' + f(cp.theory, 3) + ' — a ratio of ' +
        f(cp.rms / Math.max(cp.theory, 1e-9), 3) + '. Averaged over only ' + model.nPart +
        ' particle' + (model.nPart === 1 ? '' : 's') + ', that ratio itself has a sampling ' +
        'uncertainty of roughly ' + f(1 / Math.sqrt(2 * model.nPart), 2) +
        ', so raise the particle count before deciding the theory is wrong.',
      'Since the first checkpoint, time has grown ' + f(cp.t / first.t, 1) + ' times and the ' +
        'displacement only ' + f(cp.rms / Math.max(first.rms, 1e-9), 1) +
        ' times. Doubling the distance a drop of ink has spread takes four times as long.'
    ];
  }
});

/* ==========================================================================
   12. demo-dispersion — 2.6.5 pollutant dispersion               [NEW]
   --------------------------------------------------------------------------
   Lab 06's optional Q4 needs a reanalysis wind file. The dashboard is offline,
   so the wind field here is an ANALYTIC one, stated in the summary. The
   numerics are the ones the lab asks for: RK4 advection plus a Brownian
   displacement with standard deviation sqrt(2 D dt).
   ========================================================================== */

function windField(x, y, speed) {
  const u = speed * (1 + 0.35 * Math.sin((Math.PI * y) / 60));
  const v = 0.45 * speed * Math.sin((Math.PI * x) / 90) * Math.cos((Math.PI * y) / 60);
  return [u, v];
}

function rk4Step(x, y, dt, speed) {
  const k1 = windField(x, y, speed);
  const k2 = windField(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1], speed);
  const k3 = windField(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1], speed);
  const k4 = windField(x + dt * k3[0], y + dt * k3[1], speed);
  return [
    x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
  ];
}

createDemo('#demo-dispersion-mount', {
  id: 'demo-dispersion',
  title: 'Pollutant dispersion: advection plus diffusion',
  description: 'Release a cloud of particles at a point source and move each one with a fourth-order ' +
               'Runge-Kutta step through a wind field, plus an independent random kick. The plume is ' +
               'carried by the wind and spread by the randomness.',
  headingLevel: 4,

  controls: [
    { type: 'range', name: 'particles', label: 'Particles released', min: 20, max: 400, step: 20,
      value: 200, unit: 'particles' },
    { type: 'range', name: 'speed', label: 'Wind speed scale', min: 0, max: 3, step: 0.1, value: 1.2,
      unit: 'km per hour',
      help: 'Set this to zero to switch the wind off and watch pure diffusion — the plume then ' +
            'stays centred on the source and only spreads.' },
    { type: 'range', name: 'diffusion', label: 'Diffusion coefficient D', min: 0, max: 2, step: 0.05,
      value: 0.4, unit: 'square km per hour' },
    { type: 'range', name: 'hours', label: 'Hours to simulate', min: 4, max: 40, step: 2, value: 20,
      unit: 'hours' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 42 }
  ],

  compute(v) {
    const nPart = Math.round(Number(v.particles));
    const speed = Number(v.speed);
    const D = Number(v.diffusion);
    const hours = Math.round(Number(v.hours));
    const dt = 0.5;
    const perHour = 2;
    const rnd = seededRandom(Number(v.seed));

    const px = new Float64Array(nPart);
    const py = new Float64Array(nPart);
    const frames = [];
    const stats = [];

    const sd = Math.sqrt(2 * D * dt);

    for (let h = 0; h <= hours; h++) {
      if (h > 0) {
        for (let k = 0; k < perHour; k++) {
          for (let i = 0; i < nPart; i++) {
            const moved = rk4Step(px[i], py[i], dt, speed);
            px[i] = moved[0] + sd * gauss(rnd);
            py[i] = moved[1] + sd * gauss(rnd);
          }
        }
      }
      const cx = mean(Array.from(px));
      const cy = mean(Array.from(py));
      let d2 = 0, beyond = 0;
      for (let i = 0; i < nPart; i++) {
        const r2 = px[i] * px[i] + py[i] * py[i];
        d2 += r2;
        if (Math.sqrt(r2) > 20) beyond += 1;
      }
      const spread = Math.sqrt(mean(Array.from(px).map((x, i) =>
        (x - cx) * (x - cx) + (py[i] - cy) * (py[i] - cy))));
      frames.push({ x: Float64Array.from(px), y: Float64Array.from(py) });
      stats.push({
        h, cx, cy, meanDist: Math.sqrt(d2 / nPart), spread, beyond,
        theorySpread: Math.sqrt(4 * D * h) || 0
      });
    }

    return { nPart, speed, D, hours, dt, frames, stats };
  },

  steps: {
    count: (m) => m.stats.length,
    label: (m, i) => {
      const s = m.stats[i];
      if (i === 0) return 'Hour 0: all ' + group(m.nPart) + ' particles sit on the source at the origin.';
      const prev = m.stats[i - 1];
      return 'Hour ' + s.h + ': the plume centre has reached (' + f(s.cx, 2) + ', ' + f(s.cy, 2) +
        ') kilometres, having moved ' + f(Math.hypot(s.cx - prev.cx, s.cy - prev.cy), 2) +
        ' km this hour. The cloud radius is now ' + f(s.spread, 2) + ' km against the pure-diffusion ' +
        'prediction of ' + f(s.theorySpread, 2) + ' km, and ' + group(s.beyond) + ' particles are past ' +
        'the 20 km ring.';
    }
  },

  figure(model, ctx) {
    const fr = model.frames[ctx.step];
    let ext = 8;
    for (let i = 0; i < fr.x.length; i++) {
      ext = Math.max(ext, Math.abs(fr.x[i]) + 3, Math.abs(fr.y[i]) + 3);
    }
    const c = chart({ width: 520, height: 440, x: [-ext * 0.35, ext], y: [-ext * 0.65, ext * 0.65],
                      margin: { top: 26, right: 28, bottom: 56, left: 78 } });
    c.axes({ xLabel: 'kilometres east of the source', yLabel: 'kilometres north',
             fx: (v) => f(v, 0), fy: (v) => f(v, 0) });

    // Wind arrows. Decorative: every number they encode is in the table.
    for (let gx = -1; gx <= 4; gx++) {
      for (let gy = -2; gy <= 2; gy++) {
        const x = (gx * ext) / 4, y = (gy * ext) / 4;
        const w = windField(x, y, model.speed);
        const mag = Math.hypot(w[0], w[1]) || 1;
        const len = ext * 0.08;
        c.behind(svgEl('path', {
          d: 'M' + c.sx(x) + ' ' + c.sy(y) + 'L' + c.sx(x + (w[0] / mag) * len) + ' ' +
             c.sy(y + (w[1] / mag) * len),
          style: 'stroke: ' + GRID + '; stroke-width: 1.4; fill: none;',
          'aria-hidden': 'true'
        }));
      }
    }

    c.add(svgEl('ellipse', {
      cx: c.sx(0), cy: c.sy(0),
      rx: Math.abs(c.sx(20) - c.sx(0)), ry: Math.abs(c.sy(20) - c.sy(0)),
      style: 'fill: none; stroke: ' + S(3) + '; stroke-width: 2; stroke-dasharray: 8 5;'
    }));

    for (let i = 0; i < fr.x.length; i++) {
      c.mark(fr.x[i], fr.y[i], 'circle', { r: 2.2, stroke: S(1), width: 1 });
    }
    const s = model.stats[ctx.step];
    c.mark(s.cx, s.cy, 'star', { r: 8, stroke: S(5), fill: S(5), width: 2 });
    c.mark(0, 0, 'square', { r: 5, stroke: S(3), fill: SURFACE, width: 2.4 });

    c.label(-ext * 0.34, ext * 0.6, 'source: square · particles: dots · plume centre: star',
      { dx: 2, fill: INK });
    c.label(-ext * 0.34, ext * 0.52, 'dashed ring: 20 km from the source', { dx: 2, fill: INK });

    return c.svg;
  },

  figureAlt(model, ctx) {
    const s = model.stats[ctx.step];
    if (ctx.step === 0) {
      return 'All ' + group(model.nPart) + ' particles are stacked on the source at the origin; ' +
        'the 20 kilometre ring is empty.';
    }
    return 'Plan view at hour ' + s.h + '. The plume centre has moved to ' + f(s.cx, 1) +
      ' km east and ' + f(s.cy, 1) + ' km north of the source, the cloud has a root-mean-square ' +
      'radius of ' + f(s.spread, 1) + ' km, and ' + group(s.beyond) + ' of ' + group(model.nPart) +
      ' particles have crossed the 20 kilometre ring.';
  },

  table(model, ctx) {
    return {
      caption: 'Plume statistics hour by hour, ' + group(model.nPart) + ' particles, wind scale ' +
               f(model.speed, 1) + ' km/h, diffusion coefficient ' + f(model.D, 2) + ' km²/h',
      rowHeader: true,
      columns: [
        { label: 'Hour', numeric: true },
        { label: 'Centre east', unit: 'km', numeric: true },
        { label: 'Centre north', unit: 'km', numeric: true },
        { label: 'Mean distance from source', unit: 'km', numeric: true },
        { label: 'Cloud radius', unit: 'km', numeric: true },
        { label: 'Diffusion-only radius √(4Dt)', unit: 'km', numeric: true },
        { label: 'Particles past 20 km', numeric: true }
      ],
      rows: model.stats.map((s, i) => ({
        cells: [s.h, f(s.cx, 2), f(s.cy, 2), f(s.meanDist, 2), f(s.spread, 2),
                f(s.theorySpread, 2), group(s.beyond)],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const s = model.stats[ctx.step];
    return [
      'The particle equation is dX/dt = V(X, t) + W(t): a deterministic wind V advects each particle, ' +
        'and an independent random kick W diffuses it. The advection is integrated with a fourth-order ' +
        'Runge-Kutta step and the kick has standard deviation the square root of 2 D Δt, exactly as ' +
        'Lab 06 specifies.',
      'The wind field here is analytic, not reanalysis data, because the dashboard makes no network ' +
        'requests: u = ' + f(model.speed, 1) + '(1 + 0.35 sin(πy/60)) and v = ' +
        f(0.45 * model.speed, 2) + ' sin(πx/90) cos(πy/60).',
      'At hour ' + s.h + ' the centre of mass sits ' + f(Math.hypot(s.cx, s.cy), 2) +
        ' km from the source — that displacement is the wind’s doing — while the cloud ' +
        'radius of ' + f(s.spread, 2) + ' km is the diffusion’s. Advection moves the plume; ' +
        'diffusion only widens it.'
    ];
  }
});

/* ==========================================================================
   13. demo-secretary — 2.6.6, 2.6.7, 2.6.8
   ========================================================================== */

function shuffled(n, rnd) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function runSecretary(order, lookCount) {
  const n = order.length;
  let best = 0;
  for (let i = 0; i < lookCount; i++) best = Math.max(best, order[i]);
  for (let i = lookCount; i < n; i++) {
    if (order[i] > best) {
      return { hiredAt: i, hiredScore: order[i], benchmark: best, forced: false, inspected: i + 1 };
    }
  }
  return { hiredAt: n - 1, hiredScore: order[n - 1], benchmark: best, forced: true, inspected: n };
}

createDemo('#demo-secretary-mount', {
  id: 'demo-secretary',
  title: 'The secretary problem and the 37% rule',
  description: 'Interview applicants in a random order, decide immediately, never look back. Trace a ' +
               'single hiring run applicant by applicant, or sweep the look fraction and average over ' +
               'many runs to find where the rule actually peaks.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'view', label: 'What to show',
      options: [
        { value: 'single', label: 'One run, applicant by applicant' },
        { value: 'sweep', label: 'Sweep the look fraction, averaged over many runs' }
      ], value: 'single' },
    { type: 'range', name: 'applicants', label: 'Number of applicants N', min: 10, max: 100, step: 5,
      value: 100, unit: 'applicants' },
    { type: 'range', name: 'lookPct', label: 'Look phase, as a percentage of the pool', min: 0, max: 95,
      step: 1, value: 37, unit: '%',
      valueText: (v) => v + ' percent of the applicants are interviewed and rejected on principle' },
    { type: 'range', name: 'runs', label: 'Runs to average over (sweep view)', min: 50, max: 2000,
      step: 50, value: 400, unit: 'runs' },
    { type: 'range', name: 'topPct', label: 'Count a hire as good if it is in the top', min: 5, max: 50,
      step: 5, value: 20, unit: '%' },
    { type: 'seed', name: 'seed', label: 'Seed', value: 7,
      help: 'Try seed 42: on that run the strongest applicant walks in during the look phase, so the ' +
            'benchmark can never be beaten and the last applicant has to be accepted. That failure ' +
            'happens on roughly one run in three.' }
  ],

  compute(v) {
    const n = Math.round(Number(v.applicants));
    const lookPct = Math.round(Number(v.lookPct));
    const runs = Math.round(Number(v.runs));
    const topPct = Math.round(Number(v.topPct));
    const rnd = seededRandom(Number(v.seed));

    if (v.view === 'single') {
      const order = shuffled(n, rnd);
      const lookCount = Math.floor((n * lookPct) / 100);
      const outcome = runSecretary(order, lookCount);
      const timeline = [];
      let best = 0;
      for (let i = 0; i < outcome.inspected; i++) {
        const inLook = i < lookCount;
        if (inLook) best = Math.max(best, order[i]);
        timeline.push({
          i, score: order[i], phase: inLook ? 'look' : 'leap', benchmark: best,
          hired: i === outcome.hiredAt
        });
      }
      return { view: 'single', n, lookPct, lookCount, order, outcome, timeline, topPct,
               threshold: n - Math.floor((n * topPct) / 100) + 1 };
    }

    const fractions = [];
    for (let p = 0; p <= 95; p += 5) fractions.push(p);
    const goodCut = n - Math.floor((n * topPct) / 100) + 1;
    const sweep = fractions.map((p) => {
      const lookCount = Math.floor((n * p) / 100);
      let bestHits = 0, goodHits = 0, forced = 0, inspected = 0, rankSum = 0;
      for (let r = 0; r < runs; r++) {
        const order = shuffled(n, rnd);
        const o = runSecretary(order, lookCount);
        if (o.hiredScore === n) bestHits += 1;
        if (o.hiredScore >= goodCut) goodHits += 1;
        if (o.forced && o.hiredScore !== n) forced += 1;
        inspected += o.inspected;
        rankSum += n - o.hiredScore + 1;
      }
      return {
        p, lookCount,
        best: bestHits / runs, good: goodHits / runs, fail: forced / runs,
        inspected: inspected / runs, rank: rankSum / runs
      };
    });
    let bestRow = sweep[0];
    sweep.forEach((s) => { if (s.best > bestRow.best) bestRow = s; });
    let goodRow = sweep[0];
    sweep.forEach((s) => { if (s.good > goodRow.good) goodRow = s; });

    return { view: 'sweep', n, lookPct, runs, topPct, sweep, bestRow, goodRow, goodCut };
  },

  steps: {
    count: (m) => (m.view === 'single' ? m.timeline.length : m.sweep.length),
    label: (m, i) => {
      if (m.view === 'single') {
        const t = m.timeline[i];
        if (t.phase === 'look') {
          return 'Applicant ' + (t.i + 1) + ' scores ' + t.score + ' and is rejected on principle: ' +
            'this is still the look phase, which ends after applicant ' + m.lookCount +
            '. The best seen so far is ' + t.benchmark + '.';
        }
        if (t.hired) {
          return 'Applicant ' + (t.i + 1) + ' scores ' + t.score + ', which beats the benchmark ' +
            t.benchmark + '. Hired, and the search stops. The best applicant in the whole pool scored ' +
            m.n + ', so this ' + (t.score === m.n ? 'is the best possible hire.' : 'is not the best one.');
        }
        return 'Applicant ' + (t.i + 1) + ' scores ' + t.score + ', below the benchmark ' + t.benchmark +
          ', so they are rejected and the search continues.';
      }
      const s = m.sweep[i];
      return 'Looking at ' + s.p + ' percent of the pool (' + s.lookCount + ' applicants): the best ' +
        'applicant is hired ' + f(s.best * 100, 1) + ' percent of the time, a top-' + m.topPct +
        '-percent applicant ' + f(s.good * 100, 1) + ' percent of the time, the search ends with no ' +
        'acceptable candidate ' + f(s.fail * 100, 1) + ' percent of the time, and it takes ' +
        f(s.inspected, 1) + ' interviews on average.';
    }
  },

  figure(model, ctx) {
    if (model.view === 'single') {
      const upto = ctx.step;
      const c = chart({ width: 660, height: 350, x: [0, model.n + 1], y: [0, model.n + 2],
                        margin: { top: 26, right: 30, bottom: 58, left: 80 } });
      c.axes({ xLabel: 'interview order', yLabel: 'score (higher is better)',
               fx: (v) => f(v, 0), fy: (v) => f(v, 0) });

      const lx = model.lookCount + 0.5;
      c.behind(svgEl('line', {
        x1: c.sx(lx), x2: c.sx(lx), y1: c.sy(model.n + 2), y2: c.sy(0),
        style: 'stroke: ' + S(3) + '; stroke-width: 2.5; stroke-dasharray: 8 4;'
      }));

      for (let i = 0; i <= upto; i++) {
        const t = model.timeline[i];
        if (t.hired) c.mark(t.i + 1, t.score, 'star', { r: 8, stroke: S(1), fill: S(1), width: 2 });
        else if (t.phase === 'look') c.mark(t.i + 1, t.score, 'circle', { r: 3.4, stroke: S(5), width: 1.6 });
        else c.mark(t.i + 1, t.score, 'cross', { r: 3.6, stroke: S(3), width: 1.6 });
      }

      const bench = model.timeline[Math.min(upto, model.timeline.length - 1)].benchmark;
      if (bench > 0) {
        c.line([[0, bench], [model.n + 1, bench]], { stroke: S(1), width: 2, dash: '4 4' });
        c.label(model.n + 1, bench, 'benchmark ' + bench, { dx: -110, dy: -8, fill: INK });
      }
      c.label(0.5, model.n + 1.6, 'look phase ends at the vertical dashed line', { dx: 4, fill: INK });
      c.label(0.5, model.n * 0.92, 'look: circles · rejected in leap: crosses · hired: star',
        { dx: 4, fill: INK });
      return c.svg;
    }

    const c = chart({ width: 660, height: 360, x: [0, 95], y: [0, 1],
                      margin: { top: 26, right: 40, bottom: 58, left: 84 } });
    c.axes({ xTicks: [0, 20, 37, 40, 60, 80, 95], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1],
             fx: (v) => f(v, 0) + '%', fy: (v) => v.toFixed(1),
             xLabel: 'look phase, percentage of the pool', yLabel: 'probability' });

    c.behind(svgEl('line', {
      x1: c.sx(36.79), x2: c.sx(36.79), y1: c.sy(1), y2: c.sy(0),
      style: 'stroke: ' + AXIS + '; stroke-width: 2; stroke-dasharray: 3 4;'
    }));

    c.line(model.sweep.map((s) => [s.p, s.best]), { stroke: S(1), width: 2.6 });
    model.sweep.forEach((s, i) => c.mark(s.p, s.best, 'circle',
      { r: i === ctx.step ? 6 : 3.2, stroke: S(1), fill: SURFACE, width: 1.8 }));

    c.line(model.sweep.map((s) => [s.p, s.good]), { stroke: S(5), width: 2.6, dash: '9 5' });
    model.sweep.forEach((s, i) => c.mark(s.p, s.good, 'square',
      { r: i === ctx.step ? 6 : 3.2, stroke: S(5), fill: SURFACE, width: 1.8 }));

    c.line(model.sweep.map((s) => [s.p, s.fail]), { stroke: S(3), width: 2.2, dash: '2 4' });
    model.sweep.forEach((s, i) => c.mark(s.p, s.fail, 'triangle',
      { r: i === ctx.step ? 6 : 3.2, stroke: S(3), width: 1.8 }));

    c.label(0, 0.98, 'hires the very best: solid, circles', { dx: 4, fill: INK });
    c.label(0, 0.92, 'hires the top ' + model.topPct + '%: dashed, squares', { dx: 4, fill: INK });
    c.label(0, 0.86, 'ends with nobody acceptable: dotted, triangles', { dx: 4, fill: INK });
    c.label(36.79, 0.04, '1/e = 36.8%', { dx: 4, fill: INK });
    return c.svg;
  },

  figureAlt(model, ctx) {
    if (model.view === 'single') {
      const t = model.timeline[ctx.step];
      return 'Scores against interview order for one run with ' + model.n + ' applicants and a ' +
        model.lookPct + ' percent look phase ending at applicant ' + model.lookCount +
        '. Interviews up to number ' + (t.i + 1) + ' are drawn; the current applicant scores ' +
        t.score + ' against a benchmark of ' + t.benchmark + ', and is ' +
        (t.hired ? 'hired' : t.phase === 'look' ? 'in the look phase, so rejected automatically' :
          'rejected for scoring below the benchmark') + '.';
    }
    const s = model.sweep[ctx.step];
    return 'Three curves against the look fraction. The chance of hiring the very best applicant rises ' +
      'to a peak of ' + f(model.bestRow.best * 100, 1) + ' percent at a look phase of ' + model.bestRow.p +
      ' percent, close to the theoretical 36.8 percent. The chance of hiring anyone in the top ' +
      model.topPct + ' percent peaks earlier, at ' + model.goodRow.p +
      ' percent. The failure curve climbs steadily from zero. The highlighted point is a look phase of ' +
      s.p + ' percent, where the three values are ' + f(s.best, 3) + ', ' + f(s.good, 3) + ' and ' +
      f(s.fail, 3) + '.';
  },

  table(model, ctx) {
    if (model.view === 'single') {
      const rows = model.timeline.slice(0, ctx.step + 1).map((t) => ({
        cells: [t.i + 1, t.score, t.phase === 'look' ? 'look' : 'leap', t.benchmark || '—',
                t.hired ? 'hired' : 'rejected'],
        current: t.i === ctx.step
      }));
      return {
        caption: 'Interview log for one run: N = ' + model.n + ', look phase ' + model.lookPct +
                 ' percent (' + model.lookCount + ' applicants), through interview ' + (ctx.step + 1),
        rowHeader: true,
        columns: [
          { label: 'Interview', numeric: true },
          { label: 'Score', numeric: true },
          { label: 'Phase' },
          { label: 'Benchmark so far', numeric: true },
          { label: 'Decision' }
        ],
        rows
      };
    }
    return {
      caption: 'Look fraction swept from 0 to 95 percent, each averaged over ' + group(model.runs) +
               ' independent runs with N = ' + model.n,
      rowHeader: true,
      columns: [
        { label: 'Look phase', unit: '%', numeric: true },
        { label: 'Applicants looked at', numeric: true },
        { label: 'Hires the very best', numeric: true },
        { label: 'Hires the top ' + model.topPct + '%', numeric: true },
        { label: 'Ends with nobody', numeric: true },
        { label: 'Interviews used', numeric: true },
        { label: 'Mean rank hired (1 is best)', numeric: true }
      ],
      rows: model.sweep.map((s, i) => ({
        cells: [s.p, s.lookCount, f(s.best, 3), f(s.good, 3), f(s.fail, 3),
                f(s.inspected, 1), f(s.rank, 2)],
        current: i === ctx.step
      }))
    };
  },

  summary(model) {
    if (model.view === 'single') {
      const o = model.outcome;
      return [
        'Rules: applicants arrive in a random order, you can rank whoever you have already seen, and a ' +
          'rejection is final. The look-then-leap strategy rejects the first ' + model.lookCount +
          ' applicants on principle, records the best score among them, and hires the first later ' +
          'applicant who beats it.',
        'This run hired applicant ' + (o.hiredAt + 1) + ', who scored ' + o.hiredScore + ' out of ' +
          model.n + ' after ' + o.inspected + ' interviews.' +
          (o.forced ? ' Nobody beat the benchmark, so the last applicant had to be accepted — that is the ' +
            'failure mode of the rule.' : ''),
        (o.hiredScore === model.n ? 'That is the best applicant in the pool.'
          : o.hiredScore >= model.threshold
            ? 'That is not the best applicant, but it is inside the top ' + model.topPct + ' percent.'
            : 'That is outside the top ' + model.topPct + ' percent — this strategy misses about ' +
              'two runs in three when the target is the single best.')
      ];
    }
    return [
      'Over ' + group(model.runs) + ' runs per point, the look fraction that most often lands the very ' +
        'best applicant is ' + model.bestRow.p + ' percent, hitting ' + f(model.bestRow.best * 100, 1) +
        ' percent — both close to the theoretical 1/e, which is 36.8 percent, hit 36.8 percent of the time.',
      'If the goal is relaxed from "the best" to "the top ' + model.topPct + ' percent", the best look ' +
        'fraction drops to ' + model.goodRow.p + ' percent and the success rate rises to ' +
        f(model.goodRow.good * 100, 1) + ' percent, using only ' + f(model.goodRow.inspected, 1) +
        ' interviews instead of ' + f(model.bestRow.inspected, 1) + '.',
      'That is the practical lesson from the slides: aim for great rather than perfect, and both the ' +
        'work and the risk of ending up with nobody fall sharply.'
    ];
  }
});

})(window);
