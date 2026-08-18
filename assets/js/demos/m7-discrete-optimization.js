/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m7-discrete-optimization.js — every demo on the M7 page
   ==========================================================================

   ISC 4221C (2026). Vanilla ES module, no dependencies, no network access.

   FIVE DEMOS
     demo-lp-geometry        two-variable LP: feasible region + vertex walk   (7.3.1-7.3.6)
     demo-slack-explorer     slack values at a point you choose               (7.4.1-7.4.3)
     demo-basic-solutions    enumerate every basic solution, test feasibility (7.4.5-7.4.9)
     demo-simplex-tableau    tableau step-through with entering/departing     (7.5.3-7.5.10)
     demo-brute-force-cost   how the number of linear systems grows           (7.5.1)

   NO PRECOMPUTED TRACES
     `assets/data/m7/` does not exist — the asset pipeline has not produced
     traces for this module. Everything below is therefore computed in the
     browser, deterministically: exact rational arithmetic, no floating-point
     accumulation in the tableau, no Math.random() anywhere, and no control
     that is not a pure input to compute(). Re-running a preset always gives
     the same numbers, which is the property a student needs when asking about
     a particular run in office hours. Every result here was cross-checked
     against the worked examples in the slides before shipping.

   COLOUR IN THE FIGURES
     Only tokens that flip with the theme are used for strokes and text
     (--fsu-color-body, --fsu-color-heading, --fsu-border-strong, --fsu-surface,
     --fsu-surface-warm). A raw garnet line is invisible on the dark canvas and
     a raw gold line is invisible on the light one, so neither is used.
     Nothing is encoded by colour alone: every series carries a dash pattern, a
     marker shape, and a direct text label, and the same numbers are in the
     table beside the figure.
   ========================================================================== */

const { createDemo, svgEl } = window.Demo;
/* ==========================================================================
   0. Exact rational arithmetic

   The simplex tableau is full of thirds and fifths. Doing it in floating
   point makes 0.30000000000000004 appear in a table a student is meant to
   compare against a hand calculation, and makes the "is this entry zero?"
   test a matter of tolerance. Rationals remove both problems.
   ========================================================================== */

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

/** A rational number as { n, d } with d > 0 and gcd(|n|, d) = 1. */
function fr(n, d = 1) {
  if (d === 0) throw new Error('rational with zero denominator');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** Turn a decimal literal such as 1.5 into an exact rational. */
function frOf(value) {
  if (typeof value === 'object') return value;
  if (Number.isInteger(value)) return fr(value, 1);
  const text = String(value);
  const places = (text.split('.')[1] || '').length;
  const scale = Math.pow(10, places);
  return fr(Math.round(value * scale), scale);
}

const frAdd = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const frSub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const frMul = (a, b) => fr(a.n * b.n, a.d * b.d);
const frDiv = (a, b) => fr(a.n * b.d, a.d * b.n);
const frNeg = (a) => fr(-a.n, a.d);
const frIsZero = (a) => a.n === 0;
const frSign = (a) => Math.sign(a.n);
const frCmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
const frNum = (a) => a.n / a.d;

/**
 * Render a rational the way the slides do: an exact decimal when the
 * denominator is a product of 2s and 5s (so 3/5 prints as 0.6 and 5/4 as
 * 1.25), and a fraction otherwise (50/7 stays 50/7). Never 0.6000000001.
 */
function frText(a) {
  if (a.n === 0) return '0';
  let d = a.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  if (d === 1) {
    const value = a.n / a.d;
    return String(Number(value.toFixed(6)));
  }
  return `${a.n}/${a.d}`;
}

/** Plain decimal formatting for the non-rational demos. */
function num(value, places = 3) {
  if (!Number.isFinite(value)) return String(value);
  return String(Number(value.toFixed(places)));
}

/* ==========================================================================
   1. Small SVG helpers

   Every figure is built from these so the five demos look like one product.
   ========================================================================== */

const FONT_SMALL = 'var(--fsu-text-small)';
const INK = 'var(--fsu-color-body)';
const INK_STRONG = 'var(--fsu-color-strong)';
const ACCENT = 'var(--fsu-color-heading)';
const RULE = 'var(--fsu-border-strong)';
const CANVAS = 'var(--fsu-surface)';
const WARM = 'var(--fsu-surface-warm)';

function svgRoot(width, height) {
  return svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet'
  });
}

function text(x, y, content, options = {}) {
  const style = [
    `fill:${options.fill || INK}`,
    `font-size:${options.size || FONT_SMALL}`,
    options.weight ? `font-weight:${options.weight}` : null
  ].filter(Boolean).join(';');
  return svgEl('text', {
    x, y,
    'text-anchor': options.anchor || 'start',
    style
  }, [String(content)]);
}

function line(x1, y1, x2, y2, options = {}) {
  const style = [
    `stroke:${options.stroke || RULE}`,
    `stroke-width:${options.width || 1}`,
    options.dash ? `stroke-dasharray:${options.dash}` : null,
    'fill:none'
  ].filter(Boolean).join(';');
  return svgEl('line', { x1, y1, x2, y2, style });
}

function rect(x, y, w, h, options = {}) {
  const style = [
    `fill:${options.fill || 'none'}`,
    `stroke:${options.stroke || 'none'}`,
    `stroke-width:${options.width || 1}`,
    options.dash ? `stroke-dasharray:${options.dash}` : null
  ].join(';');
  return svgEl('rect', { x, y, width: Math.max(0, w), height: Math.max(0, h), style });
}

function circle(cx, cy, r, options = {}) {
  const style = [
    `fill:${options.fill || CANVAS}`,
    `stroke:${options.stroke || ACCENT}`,
    `stroke-width:${options.width || 2}`
  ].join(';');
  return svgEl('circle', { cx, cy, r, style });
}

/** Four dash patterns, so a series is identifiable without colour. */
const DASHES = ['', '7 4', '2 3', '10 3 2 3', '1 3', '12 4'];

/* ==========================================================================
   2. demo-lp-geometry — two unknowns, drawn (7.3.1-7.3.6)
   ========================================================================== */

const EPS = 1e-9;

/* Constraints are stored as a*x + b*y <= rhs after normalisation; `shown` is
   the inequality the way the slides write it. */
const GEOMETRY_PRESETS = {
  unitsquare: {
    label: 'Unit square — max x + 2y (§7.3.1)',
    objective: 'x + 2y',
    c: [1, 2],
    box: [1.6, 1.6],
    axes: ['x', 'y'],
    constraints: [
      { a: 1, b: 0, rhs: 1, shown: 'x ≤ 1' },
      { a: 0, b: 1, rhs: 1, shown: 'y ≤ 1' },
      { a: 1, b: 1, rhs: 1.5, shown: 'x + y ≤ 1.5' }
    ],
    note: 'The feasible region is the unit square with its top-right corner cut off.'
  },
  redundant: {
    label: 'Redundant constraint — max 2x + 3y (§7.3.3)',
    objective: '2x + 3y',
    c: [2, 3],
    box: [4.5, 4.5],
    axes: ['x', 'y'],
    constraints: [
      { a: 3, b: 1, rhs: 6, shown: '3x + y ≤ 6' },
      { a: 1, b: 1, rhs: 4, shown: 'x + y ≤ 4' },
      { a: 1, b: 2, rhs: 6, shown: 'x + 2y ≤ 6' }
    ],
    note: 'x + y ≤ 4 never touches the region, so it is redundant.'
  },
  empty: {
    label: 'Empty feasible set — max 2x + 5y (§7.3.4)',
    objective: '2x + 5y',
    c: [2, 5],
    box: [5, 5],
    axes: ['x', 'y'],
    constraints: [
      { a: -2, b: -3, rhs: -12, shown: '−2x − 3y ≤ −12, i.e. 2x + 3y ≥ 12' },
      { a: 3, b: 4, rhs: 12, shown: '3x + 4y ≤ 12' }
    ],
    note: 'The two half-planes do not overlap anywhere in the first quadrant.'
  },
  unbounded: {
    label: 'Unbounded region — x + 4y (§7.3.5)',
    objective: 'x + 4y',
    c: [1, 4],
    box: [10, 10],
    axes: ['x', 'y'],
    constraints: [
      { a: 1, b: -1, rhs: 1, shown: 'x − y ≤ 1' },
      { a: -2, b: -1, rhs: -8, shown: '−2x − y ≤ −8, i.e. 2x + y ≥ 8' }
    ],
    note: 'The region opens upward forever; the plot box cuts it off at y = 10.'
  },
  nonunique: {
    label: 'Many optima — max 3x₁ + 2x₂ (§7.3.6)',
    objective: '3x₁ + 2x₂',
    c: [3, 2],
    box: [6, 6],
    axes: ['x₁', 'x₂'],
    constraints: [
      { a: 1, b: 1, rhs: 5, shown: 'x₁ + x₂ ≤ 5' },
      { a: 3, b: 2, rhs: 12, shown: '3x₁ + 2x₂ ≤ 12' }
    ],
    note: 'The objective is the left-hand side of the second constraint, so a whole edge is optimal.'
  },
  lab14a: {
    label: 'Lab 14 problem A — max 4x₁ + 3x₂',
    objective: '4x₁ + 3x₂',
    c: [4, 3],
    box: [11, 9],
    axes: ['x₁', 'x₂'],
    constraints: [
      { a: 2, b: 3, rhs: 18, shown: '2x₁ + 3x₂ ≤ 18' },
      { a: 4, b: 5, rhs: 40, shown: '4x₁ + 5x₂ ≤ 40' }
    ],
    note: 'The second constraint is redundant: the two lines meet at (15, −4), outside the first quadrant.'
  }
};

function satisfiesAll(point, constraints) {
  if (point[0] < -EPS || point[1] < -EPS) return false;
  return constraints.every((k) => k.a * point[0] + k.b * point[1] <= k.rhs + 1e-7);
}

function clipHalfPlane(poly, a, b, rhs) {
  if (poly.length === 0) return poly;
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const P = poly[i];
    const Q = poly[(i + 1) % poly.length];
    const fp = a * P[0] + b * P[1] - rhs;
    const fq = a * Q[0] + b * Q[1] - rhs;
    if (fp <= EPS) out.push(P);
    if ((fp > EPS && fq < -EPS) || (fp < -EPS && fq > EPS)) {
      const t = fp / (fp - fq);
      out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
    }
  }
  return out;
}

function orderByAngle(points) {
  if (points.length < 3) return points.slice();
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.slice().sort((p, q) =>
    Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
}

function geometryModel(values) {
  const preset = GEOMETRY_PRESETS[values.problem];
  const sense = values.sense;
  const [xmax, ymax] = preset.box;

  /* Every boundary line, including the two axes. */
  const lines = preset.constraints
    .map((k) => ({ a: k.a, b: k.b, c: k.rhs }))
    .concat([{ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }]);

  const vertices = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const L = lines[i];
      const M = lines[j];
      const det = L.a * M.b - M.a * L.b;
      if (Math.abs(det) < EPS) continue;
      const x = (L.c * M.b - M.c * L.b) / det;
      const y = (L.a * M.c - M.a * L.c) / det;
      if (!satisfiesAll([x, y], preset.constraints)) continue;
      if (vertices.some((v) => Math.abs(v[0] - x) < 1e-7 && Math.abs(v[1] - y) < 1e-7)) continue;
      vertices.push([x, y]);
    }
  }

  const ordered = orderByAngle(vertices);
  const value = (p) => preset.c[0] * p[0] + preset.c[1] * p[1];

  /* The drawn region: the plot box cut down by every constraint. */
  let region = [[0, 0], [xmax, 0], [xmax, ymax], [0, ymax]];
  preset.constraints.forEach((k) => { region = clipHalfPlane(region, k.a, k.b, k.rhs); });

  /* Unbounded in the chosen direction? The best value over the CLIPPED region
     beats the best over the true vertices only when the optimum has run off
     the edge of the plot box, which is exactly what unboundedness looks like. */
  let unbounded = false;
  if (ordered.length > 0 && region.length > 0) {
    const bestTrue = sense === 'max'
      ? Math.max(...ordered.map(value))
      : Math.min(...ordered.map(value));
    const bestClip = sense === 'max'
      ? Math.max(...region.map(value))
      : Math.min(...region.map(value));
    unbounded = sense === 'max' ? bestClip > bestTrue + 1e-6 : bestClip < bestTrue - 1e-6;
  }

  /* Walk the vertices, keeping a running best. */
  let bestIndex = -1;
  const walk = ordered.map((p, i) => {
    const z = value(p);
    const better = bestIndex < 0 ||
      (sense === 'max' ? z > value(ordered[bestIndex]) + 1e-9 : z < value(ordered[bestIndex]) - 1e-9);
    if (better) bestIndex = i;
    return { point: p, z, bestSoFar: bestIndex, isNewBest: better };
  });

  /* Ties matter here: §7.3.6 is entirely about the case where more than one
     corner attains the optimum. */
  const bestValue = walk.length ? value(ordered[walk[walk.length - 1].bestSoFar]) : null;
  const optimalIndices = walk
    .map((stop, i) => (Math.abs(stop.z - bestValue) < 1e-9 ? i : -1))
    .filter((i) => i >= 0);

  return {
    preset, sense, xmax, ymax, region,
    vertices: ordered, walk, value,
    unbounded, bestValue, optimalIndices,
    optimalIndex: walk.length ? walk[walk.length - 1].bestSoFar : -1,
    empty: ordered.length === 0
  };
}

createDemo('#demo-lp-geometry-mount', {
  id: 'demo-lp-geometry',
  title: 'Two-variable LP explorer',
  description: 'Draw the feasible region, then walk its corners one at a time and ' +
               'watch the objective. Six presets cover every case the slides discuss: ' +
               'a bounded region, a redundant constraint, an empty feasible set, an ' +
               'unbounded region, a problem with many optima, and Lab 14 problem A.',
  headingLevel: 4,
  caption: 'Constraint lines are told apart by dash pattern and by the label on each line, ' +
           'not by colour. The corner under discussion carries a double ring.',

  controls: [
    {
      type: 'select', name: 'problem', label: 'Problem',
      value: 'unitsquare',
      options: Object.keys(GEOMETRY_PRESETS).map((key) => ({
        value: key, label: GEOMETRY_PRESETS[key].label
      })),
      help: 'Changing the problem restarts the corner walk at the first vertex.'
    },
    {
      type: 'radio', name: 'sense', label: 'Objective direction',
      value: 'max',
      options: [
        { value: 'max', label: 'Maximize' },
        { value: 'min', label: 'Minimize' }
      ],
      help: 'The unbounded preset has no maximum but does have a minimum, at (3, 2).'
    }
  ],

  compute: geometryModel,

  steps: {
    count: (model) => Math.max(1, model.walk.length),
    label: (model, i) => {
      if (model.empty) {
        return 'The constraints conflict, so the feasible set is empty and there is no corner to evaluate.';
      }
      const stop = model.walk[i];
      const [x, y] = stop.point;
      const best = model.walk[stop.bestSoFar];
      const head = `Corner ${i + 1} of ${model.walk.length} is (${num(x, 3)}, ${num(y, 3)}), ` +
                   `where ${model.preset.objective} = ${num(stop.z, 3)}.`;
      if (i === 0) return `${head} It is the first corner, so it is the best so far by default.`;
      if (stop.isNewBest) {
        return `${head} That beats every corner seen so far, so it becomes the new best.`;
      }
      return `${head} The best is still corner ${stop.bestSoFar + 1} at ${num(best.z, 3)}.`;
    }
  },

  figure(model, ctx) {
    const W = 460;
    const H = 300;
    const pad = { left: 46, right: 14, top: 16, bottom: 40 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const sx = (x) => pad.left + (x / model.xmax) * plotW;
    const sy = (y) => pad.top + plotH - (y / model.ymax) * plotH;

    const svg = svgRoot(W, H);

    /* Plot frame and axis ticks. */
    svg.appendChild(rect(pad.left, pad.top, plotW, plotH, { fill: CANVAS, stroke: RULE }));
    [0, model.xmax].forEach((v) => {
      svg.appendChild(text(sx(v), H - pad.bottom + 16, num(v, 2), { anchor: 'middle' }));
    });
    [0, model.ymax].forEach((v) => {
      svg.appendChild(text(pad.left - 6, sy(v) + 4, num(v, 2), { anchor: 'end' }));
    });
    svg.appendChild(text(pad.left + plotW / 2, H - 8, model.preset.axes[0], { anchor: 'middle', fill: INK_STRONG }));
    svg.appendChild(text(12, pad.top + 10, model.preset.axes[1], { fill: INK_STRONG }));

    /* The feasible region: outline plus a warm fill. The outline is what
       carries it — the fill is the same colour as the page on a dark canvas. */
    if (model.region.length > 2) {
      const points = model.region.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ');
      svg.appendChild(svgEl('polygon', {
        points,
        style: `fill:${WARM};stroke:${ACCENT};stroke-width:2.5`
      }));
      const cx = model.region.reduce((s, p) => s + sx(p[0]), 0) / model.region.length;
      const cy = model.region.reduce((s, p) => s + sy(p[1]), 0) / model.region.length;
      svg.appendChild(text(cx, cy, 'feasible', { anchor: 'middle', fill: INK_STRONG, weight: 700 }));
    } else {
      svg.appendChild(text(pad.left + plotW / 2, pad.top + plotH / 2,
        'no feasible points', { anchor: 'middle', fill: INK_STRONG, weight: 700 }));
    }

    /* One line per constraint, each with its own dash pattern and label. */
    model.preset.constraints.forEach((k, i) => {
      const pts = [];
      if (Math.abs(k.b) > EPS) {
        [[0, (k.rhs - k.a * 0) / k.b], [model.xmax, (k.rhs - k.a * model.xmax) / k.b]].forEach((p) => pts.push(p));
      } else {
        const x = k.rhs / k.a;
        pts.push([x, 0], [x, model.ymax]);
      }
      svg.appendChild(line(sx(pts[0][0]), sy(pts[0][1]), sx(pts[1][0]), sy(pts[1][1]), {
        stroke: INK, width: 1.5, dash: DASHES[i % DASHES.length]
      }));
      const midX = Math.min(model.xmax * 0.98, Math.max(0, (pts[0][0] + pts[1][0]) / 2));
      const midY = Math.min(model.ymax * 0.96, Math.max(0, (pts[0][1] + pts[1][1]) / 2));
      svg.appendChild(text(sx(midX) + 4, sy(midY) - 5, `C${i + 1}`, { fill: INK_STRONG, weight: 700 }));
    });

    /* Vertices. The current one gets a second ring and a triangle marker, so
       it is identifiable without relying on colour or size alone. */
    model.walk.forEach((stop, i) => {
      const cx = sx(stop.point[0]);
      const cy = sy(stop.point[1]);
      svg.appendChild(circle(cx, cy, 5, { stroke: ACCENT }));
      if (i === ctx.step) {
        svg.appendChild(circle(cx, cy, 9, { fill: 'none', stroke: ACCENT, width: 2 }));
        svg.appendChild(text(cx, cy - 14, '▲', { anchor: 'middle', fill: INK_STRONG }));
      }
      svg.appendChild(text(cx + 8, cy + 14, `V${i + 1}`, { fill: INK_STRONG }));
    });

    return svg;
  },

  figureAlt(model, ctx) {
    if (model.empty) {
      return `The two constraint lines bound half-planes that never overlap in the first ` +
             `quadrant, so nothing is shaded and no corner exists to mark.`;
    }
    const stop = model.walk[ctx.step];
    const best = model.walk[stop.bestSoFar];
    const shape = model.unbounded
      ? 'an unbounded region cut off by the edge of the plot'
      : `a region with ${model.walk.length} corners`;
    return `Step ${ctx.step + 1}: the double ring is on corner ${ctx.step + 1} of ` +
           `${model.walk.length}, at (${num(stop.point[0], 3)}, ${num(stop.point[1], 3)}), ` +
           `inside ${shape}; ${model.preset.objective} is ${num(stop.z, 3)} there, ` +
           `against ${num(best.z, 3)} at the best corner so far.`;
  },

  table(model, ctx) {
    const rows = model.walk.map((stop, i) => {
      const finished = ctx.step === model.walk.length - 1;
      let status;
      if (i > ctx.step) status = 'Not yet evaluated';
      else if (finished && model.optimalIndices.includes(i)) {
        if (model.unbounded) status = 'Best corner, but the region is unbounded';
        else if (model.optimalIndices.length > 1) status = `Optimal — tied at ${num(model.bestValue, 3)}`;
        else status = `Optimal — ${model.sense === 'max' ? 'largest' : 'smallest'} value`;
      } else if (!finished && i === model.walk[ctx.step].bestSoFar) status = 'Best so far';
      else status = 'Evaluated';
      return {
        cells: [`V${i + 1}`, num(stop.point[0], 3), num(stop.point[1], 3), num(stop.z, 3), status],
        current: i === ctx.step
      };
    });

    if (rows.length === 0) {
      rows.push({ cells: ['—', '—', '—', '—', 'No feasible points exist'], current: true });
    }

    /* The constraints are part of the data, not just of the picture. */
    model.preset.constraints.forEach((k, i) => {
      rows.push({ cells: [`C${i + 1}`, '—', '—', '—', `Constraint: ${k.shown}`], current: false });
    });

    return {
      caption: `${model.sense === 'max' ? 'Maximizing' : 'Minimizing'} ${model.preset.objective}: ` +
               `corner ${Math.min(ctx.step + 1, Math.max(1, model.walk.length))} of ` +
               `${Math.max(1, model.walk.length)} evaluated, and the constraint list below it`,
      rowHeader: true,
      columns: [
        { label: 'Corner' },
        { label: model.preset.axes[0], numeric: true },
        { label: model.preset.axes[1], numeric: true },
        { label: `Objective ${model.preset.objective}`, numeric: true },
        { label: 'Status' }
      ],
      rows
    };
  },

  summary(model, ctx) {
    const lines = [];
    const constraintList = model.preset.constraints.map((k, i) => `C${i + 1} ${k.shown}`).join('; ');
    lines.push(`Problem: ${model.sense === 'max' ? 'maximize' : 'minimize'} ` +
               `${model.preset.objective} subject to ${constraintList}, with both variables at least zero.`);

    if (model.empty) {
      lines.push('The feasible set is empty, so there is no feasible solution and therefore no optimal one. ' +
                 model.preset.note);
      return lines;
    }

    const stop = model.walk[ctx.step];
    const best = model.walk[stop.bestSoFar];
    lines.push(`Best of the ${ctx.step + 1} corners evaluated so far: corner ${stop.bestSoFar + 1} at ` +
               `(${num(model.walk[stop.bestSoFar].point[0], 3)}, ${num(model.walk[stop.bestSoFar].point[1], 3)}), ` +
               `where the objective is ${num(best.z, 3)}. ` +
               `${model.walk.length - ctx.step - 1} corners are still to come.`);

    if (ctx.step === model.walk.length - 1) {
      if (model.unbounded) {
        lines.push(`Every corner has now been evaluated, but the region is unbounded in the direction ` +
                   `that ${model.sense === 'max' ? 'increases' : 'decreases'} the objective, so there is ` +
                   `no optimal solution. Switch the direction to see the case that does have one.`);
      } else if (model.optimalIndices.length > 1) {
        const names = model.optimalIndices.map((i) => `corner ${i + 1}`).join(' and ');
        lines.push(`Every corner has now been evaluated. The optimum value ${num(model.bestValue, 3)} ` +
                   `is attained at ${names}, and at every point of the edge between them, so the ` +
                   `optimal solution is not unique.`);
      } else {
        lines.push(`Every corner has now been evaluated. The optimum is corner ${stop.bestSoFar + 1} ` +
                   `at (${num(model.walk[stop.bestSoFar].point[0], 3)}, ${num(model.walk[stop.bestSoFar].point[1], 3)}), ` +
                   `where the objective is ${num(best.z, 3)}.`);
      }
      lines.push(model.preset.note);
    }
    return lines;
  }
});

/* ==========================================================================
   3. demo-slack-explorer — what a slack variable measures (7.4.1-7.4.3)
   ========================================================================== */

createDemo('#demo-slack-explorer-mount', {
  id: 'demo-slack-explorer',
  title: 'Slack variable explorer',
  description: 'Move the point and watch the two slack variables of the running example. ' +
               'u and v are the unused parts of the two resources; a negative value means ' +
               'the constraint has been broken. Reverse the first constraint to see why a ' +
               '“greater than or equal” constraint subtracts its slack instead of adding it.',
  headingLevel: 4,
  caption: 'Bars run right from the zero line for non-negative values and left for negative ones; ' +
           'a negative bar is also dashed and labelled “negative”.',

  controls: [
    {
      type: 'range', name: 'x', label: 'x, the first variable',
      min: 0, max: 4, step: 0.1, value: 1,
      valueText: (v) => `x equals ${v}`,
      help: 'The horizontal coordinate of the point being tested.'
    },
    {
      type: 'range', name: 'y', label: 'y, the second variable',
      min: 0, max: 5, step: 0.1, value: 2,
      valueText: (v) => `y equals ${v}`,
      help: 'The vertical coordinate of the point being tested.'
    },
    {
      type: 'radio', name: 'form', label: 'First constraint',
      value: 'le',
      options: [
        { value: 'le', label: '2x + 2y ≤ 8 — add the slack (u = 8 − 2x − 2y)' },
        { value: 'ge', label: '2x + 2y ≥ 8 — subtract the slack (u = 2x + 2y − 8)' }
      ],
      help: 'The second constraint stays 5x + 3y ≤ 15 either way.'
    }
  ],

  compute(values) {
    const x = Number(values.x);
    const y = Number(values.y);
    const lhs1 = 2 * x + 2 * y;
    const lhs2 = 5 * x + 3 * y;
    const u = values.form === 'le' ? 8 - lhs1 : lhs1 - 8;
    const v = 15 - lhs2;
    const z = 120 * x + 100 * y;
    const vars = [
      { name: 'x', value: x, meaning: 'first decision variable' },
      { name: 'y', value: y, meaning: 'second decision variable' },
      {
        name: 'u',
        value: u,
        meaning: values.form === 'le'
          ? 'slack in 2x + 2y ≤ 8, i.e. 8 − 2x − 2y'
          : 'surplus in 2x + 2y ≥ 8, i.e. 2x + 2y − 8'
      },
      { name: 'v', value: v, meaning: 'slack in 5x + 3y ≤ 15, i.e. 15 − 5x − 3y' }
    ];
    const negatives = vars.filter((entry) => entry.value < -1e-9);
    const tight = vars.filter((entry) => (entry.name === 'u' || entry.name === 'v') && Math.abs(entry.value) < 1e-9);
    return { x, y, u, v, z, lhs1, lhs2, vars, negatives, tight, form: values.form };
  },

  figure(model) {
    const W = 460;
    const H = 230;
    const left = 40;
    const right = 20;
    const zero = left + 150;
    const span = W - right - zero;
    const maxAbs = Math.max(8, ...model.vars.map((entry) => Math.abs(entry.value)));
    const scale = span / maxAbs;
    const rowH = 40;

    const svg = svgRoot(W, H);
    svg.appendChild(line(zero, 14, zero, 14 + 4 * rowH, { stroke: RULE, width: 1.5 }));
    svg.appendChild(text(zero, H - 12, '0', { anchor: 'middle' }));
    svg.appendChild(text(zero + span / 2, 12, 'value', { anchor: 'middle', fill: INK_STRONG }));

    model.vars.forEach((entry, i) => {
      const y = 22 + i * rowH;
      const w = Math.abs(entry.value) * scale;
      const negative = entry.value < -1e-9;
      svg.appendChild(text(left - 24, y + 16, entry.name, { fill: INK_STRONG, weight: 700 }));
      svg.appendChild(rect(negative ? zero - w : zero, y, w, 20, {
        fill: negative ? 'none' : WARM,
        stroke: ACCENT,
        width: 2,
        dash: negative ? '5 3' : null
      }));
      svg.appendChild(text(negative ? zero - w - 6 : zero + w + 6, y + 15,
        negative ? `${num(entry.value, 2)} negative` : num(entry.value, 2),
        { anchor: negative ? 'end' : 'start', fill: INK_STRONG }));
    });

    return svg;
  },

  figureAlt(model) {
    const verdict = model.negatives.length === 0
      ? 'all four bars run to the right of the zero line, so the point is feasible'
      : `the ${model.negatives.map((entry) => entry.name).join(' and ')} bar runs left of the zero line, ` +
        'so the point is not feasible';
    return `Four bars, one per variable: x is ${num(model.x, 2)}, y is ${num(model.y, 2)}, ` +
           `u is ${num(model.u, 2)} and v is ${num(model.v, 2)}; ${verdict}.`;
  },

  table(model) {
    return {
      caption: `Variable values at (${num(model.x, 2)}, ${num(model.y, 2)}), with the first ` +
               `constraint written as ${model.form === 'le' ? '2x + 2y ≤ 8' : '2x + 2y ≥ 8'}`,
      rowHeader: true,
      columns: [
        { label: 'Variable' },
        { label: 'Value', numeric: true },
        { label: 'What it measures' },
        { label: 'Non-negative?' }
      ],
      rows: model.vars.map((entry) => ({
        cells: [
          entry.name,
          num(entry.value, 3),
          entry.meaning,
          entry.value < -1e-9 ? 'No — constraint broken' : (Math.abs(entry.value) < 1e-9 ? 'Yes, exactly zero — constraint tight' : 'Yes')
        ],
        current: entry.value < -1e-9
      }))
    };
  },

  summary(model) {
    const lines = [];
    lines.push(`At x = ${num(model.x, 2)} and y = ${num(model.y, 2)}: ` +
               `2x + 2y is ${num(model.lhs1, 2)} and 5x + 3y is ${num(model.lhs2, 2)}, ` +
               `so u = ${num(model.u, 2)} and v = ${num(model.v, 2)}.`);

    if (model.negatives.length > 0) {
      lines.push(`This point is not feasible: ${model.negatives.map((entry) => entry.name).join(' and ')} ` +
                 `is negative, which is the algebraic form of “that constraint is broken”.`);
    } else if (model.tight.length > 0) {
      lines.push(`This point is feasible, and ${model.tight.map((entry) => entry.name).join(' and ')} ` +
                 `is exactly zero — the corresponding resource is completely used up, so the point ` +
                 `sits on that constraint line. The objective 120x + 100y is ${num(model.z, 2)}.`);
    } else {
      lines.push(`This point is feasible with both resources partly unused, so it is in the interior ` +
                 `of the region and cannot be optimal. The objective 120x + 100y is ${num(model.z, 2)}.`);
    }

    if (model.form === 'ge') {
      lines.push('With the constraint reversed the slack is subtracted, so u measures how far the ' +
                 'left-hand side exceeds 8 rather than how much of the 8 is left.');
    }
    return lines;
  }
});

/* ==========================================================================
   4. demo-basic-solutions — the brute-force enumeration (7.4.5-7.4.9)
   ========================================================================== */

const BASIC_PRESETS = {
  running: {
    label: 'Running example — max 120x₁ + 100x₂ (§7.4.8)',
    sense: 'max',
    objective: '120x₁ + 100x₂',
    A: [[2, 2, 1, 0], [5, 3, 0, 1]],
    b: [8, 15],
    c: [120, 100, 0, 0],
    slackFrom: 2,
    note: 'Four of the six basic solutions are feasible, and they are the four corners of the picture.'
  },
  redundant: {
    label: 'Three constraints — max 2x₁ + 3x₂ (§7.3.3)',
    sense: 'max',
    objective: '2x₁ + 3x₂',
    A: [[3, 1, 1, 0, 0], [1, 1, 0, 1, 0], [1, 2, 0, 0, 1]],
    b: [6, 4, 6],
    c: [2, 3, 0, 0, 0],
    slackFrom: 2,
    note: 'Ten basic solutions, one per pair of constraint lines; only four of the ten intersections lie in the region.'
  },
  lab14a: {
    label: 'Lab 14 problem A — max 4x₁ + 3x₂',
    sense: 'max',
    objective: '4x₁ + 3x₂',
    A: [[2, 3, 1, 0], [4, 5, 0, 1]],
    b: [18, 40],
    c: [4, 3, 0, 0],
    slackFrom: 2,
    note: 'The optimum sits on an axis at (9, 0) with Z = 36, and the second constraint still has slack 4 there.'
  },
  lab14b: {
    label: 'Lab 14 problem B — min 2x₁ + 5x₂ + 3x₃',
    sense: 'min',
    objective: '2x₁ + 5x₂ + 3x₃',
    A: [[3, 4, 2, -1, 0], [5, 2, 4, 0, -1]],
    b: [30, 40],
    c: [2, 5, 3, 0, 0],
    slackFrom: 3,
    note: 'Both constraints are “greater than or equal”, so both slacks are subtracted and appear as −1 entries.'
  }
};

function combinations(items, k) {
  const out = [];
  const build = (start, chosen) => {
    if (chosen.length === k) { out.push(chosen.slice()); return; }
    for (let i = start; i < items.length; i += 1) {
      chosen.push(items[i]);
      build(i + 1, chosen);
      chosen.pop();
    }
  };
  build(0, []);
  return out;
}

/** Gauss-Jordan on exact rationals. Returns null when the basis is singular. */
function solveExact(matrix, rhs) {
  const m = matrix.length;
  const M = matrix.map((row, i) => row.map(frOf).concat([frOf(rhs[i])]));
  for (let col = 0; col < m; col += 1) {
    let pivot = -1;
    for (let r = col; r < m; r += 1) if (!frIsZero(M[r][col])) { pivot = r; break; }
    if (pivot < 0) return null;
    const tmp = M[col]; M[col] = M[pivot]; M[pivot] = tmp;
    const p = M[col][col];
    M[col] = M[col].map((value) => frDiv(value, p));
    for (let r = 0; r < m; r += 1) {
      if (r === col || frIsZero(M[r][col])) continue;
      const factor = M[r][col];
      M[r] = M[r].map((value, j) => frSub(value, frMul(factor, M[col][j])));
    }
  }
  return M.map((row) => row[m]);
}

function basicSolutionsModel(values) {
  const preset = BASIC_PRESETS[values.problem];
  const m = preset.A.length;
  const s = preset.A[0].length;
  const indices = [];
  for (let j = 0; j < s; j += 1) indices.push(j);

  const zeroSets = combinations(indices, s - m);
  let best = null;

  const candidates = zeroSets.map((zeroed, index) => {
    const keep = indices.filter((j) => !zeroed.includes(j));
    const basis = preset.A.map((row) => keep.map((j) => row[j]));
    const solved = solveExact(basis, preset.b);

    if (solved === null) {
      return { index, zeroed, keep, singular: true, x: null, feasible: false, z: null };
    }

    const x = new Array(s).fill(null).map(() => fr(0));
    keep.forEach((j, i) => { x[j] = solved[i]; });
    const feasible = x.every((value) => frSign(value) >= 0);
    let z = null;
    if (feasible) {
      z = x.reduce((sum, value, j) => frAdd(sum, frMul(value, frOf(preset.c[j]))), fr(0));
      const better = best === null ||
        (preset.sense === 'max' ? frCmp(z, best.z) > 0 : frCmp(z, best.z) < 0);
      if (better) best = { index, z, x };
    }
    return { index, zeroed, keep, singular: false, x, feasible, z, bestAfter: best ? best.index : null };
  });

  return { preset, m, s, candidates, best, zeroCount: s - m };
}

function varName(j) {
  const subs = '₀₁₂₃₄₅₆₇₈₉';
  const digits = String(j + 1).split('').map((d) => subs[Number(d)]).join('');
  return `x${digits}`;
}

createDemo('#demo-basic-solutions-mount', {
  id: 'demo-basic-solutions',
  title: 'Basic-solution enumerator',
  description: 'The brute-force LP method of §7.4.9, one candidate at a time. Each step sets ' +
               's − m variables to zero, solves the remaining square system exactly, checks that ' +
               'every component is non-negative, and keeps the best feasible objective seen so far.',
  headingLevel: 4,
  caption: 'One bar per candidate. A filled bar is a feasible basic solution and its height is the ' +
           'objective; a dashed stub marked ✗ is infeasible; a dotted stub marked ? has not been ' +
           'examined yet.',

  controls: [
    {
      type: 'select', name: 'problem', label: 'Problem',
      value: 'running',
      options: Object.keys(BASIC_PRESETS).map((key) => ({
        value: key, label: BASIC_PRESETS[key].label
      })),
      help: 'All four problems are already in slack form, so the constraints are equations.'
    }
  ],

  compute: basicSolutionsModel,

  steps: {
    count: (model) => model.candidates.length,
    label: (model, i) => {
      const candidate = model.candidates[i];
      const zeroed = candidate.zeroed.map(varName).join(' and ');
      if (candidate.singular) {
        return `Candidate ${i + 1}: setting ${zeroed} to zero leaves a singular basis, so this ` +
               `combination produces no basic solution at all.`;
      }
      const values = candidate.x.map((value, j) => `${varName(j)} = ${frText(value)}`).join(', ');
      if (!candidate.feasible) {
        const bad = candidate.x
          .map((value, j) => (frSign(value) < 0 ? varName(j) : null))
          .filter(Boolean).join(' and ');
        return `Candidate ${i + 1}: setting ${zeroed} to zero gives ${values}; ${bad} is negative, ` +
               `so this basic solution is discarded.`;
      }
      const objective = `${model.preset.objective} = ${frText(candidate.z)}`;
      const isBest = model.candidates[i].bestAfter === i;
      return `Candidate ${i + 1}: setting ${zeroed} to zero gives ${values}; every component is ` +
             `non-negative, so it is a basic feasible solution with ${objective}` +
             (isBest ? ' — the best found so far.' : '.');
    }
  },

  figure(model, ctx) {
    const W = 460;
    const H = 260;
    const pad = { left: 44, right: 12, top: 18, bottom: 46 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const base = pad.top + plotH;
    const slot = plotW / model.candidates.length;
    const barW = Math.max(8, slot * 0.55);

    const feasibleValues = model.candidates
      .filter((candidate) => candidate.feasible)
      .map((candidate) => Math.abs(frNum(candidate.z)));
    const top = Math.max(1, ...feasibleValues);

    const svg = svgRoot(W, H);
    svg.appendChild(line(pad.left, base, pad.left + plotW, base, { stroke: RULE, width: 1.5 }));
    svg.appendChild(text(pad.left - 6, base + 4, '0', { anchor: 'end' }));
    svg.appendChild(text(pad.left - 6, pad.top + 6, num(top, 2), { anchor: 'end' }));
    svg.appendChild(text(pad.left + plotW / 2, H - 8, 'candidate number', { anchor: 'middle', fill: INK_STRONG }));
    svg.appendChild(text(10, pad.top - 6, `|${model.preset.objective}|`, { fill: INK_STRONG }));

    model.candidates.forEach((candidate, i) => {
      const cx = pad.left + i * slot + slot / 2;
      const examined = i <= ctx.step;

      if (!examined) {
        svg.appendChild(rect(cx - barW / 2, base - 12, barW, 12,
          { fill: 'none', stroke: RULE, width: 1.5, dash: '1 3' }));
        svg.appendChild(text(cx, base - 16, '?', { anchor: 'middle', fill: INK }));
      } else if (candidate.feasible) {
        const h = (Math.abs(frNum(candidate.z)) / top) * plotH;
        svg.appendChild(rect(cx - barW / 2, base - h, barW, h,
          { fill: WARM, stroke: ACCENT, width: 2 }));
        svg.appendChild(text(cx, base - h - 6, frText(candidate.z), { anchor: 'middle', fill: INK_STRONG }));
      } else {
        svg.appendChild(rect(cx - barW / 2, base - 14, barW, 14,
          { fill: 'none', stroke: INK, width: 1.5, dash: '5 3' }));
        svg.appendChild(text(cx, base - 18, '✗', { anchor: 'middle', fill: INK_STRONG, weight: 700 }));
      }

      svg.appendChild(text(cx, base + 16, String(i + 1), { anchor: 'middle' }));
      if (i === ctx.step) {
        svg.appendChild(text(cx, base + 32, '▲', { anchor: 'middle', fill: INK_STRONG, weight: 700 }));
      }
    });

    return svg;
  },

  figureAlt(model, ctx) {
    const seen = model.candidates.slice(0, ctx.step + 1);
    const feasible = seen.filter((candidate) => candidate.feasible).length;
    const candidate = model.candidates[ctx.step];
    const state = candidate.singular ? 'a singular basis'
      : candidate.feasible ? `a feasible bar of height ${frText(candidate.z)}`
        : 'an infeasible stub marked with a cross';
    return `Step ${ctx.step + 1}: the marker under bar ${ctx.step + 1} of ${model.candidates.length} ` +
           `points at ${state}; ${feasible} of the ${ctx.step + 1} candidates examined so far are ` +
           `feasible, and ${model.candidates.length - ctx.step - 1} bars are still dotted placeholders.`;
  },

  table(model, ctx) {
    const columns = [{ label: 'Set to zero' }]
      .concat(model.candidates[0].x
        ? model.candidates[0].x.map((_, j) => ({ label: varName(j), numeric: true }))
        : [])
      .concat([{ label: 'Feasible?' }, { label: model.preset.objective, numeric: true }]);

    const rows = model.candidates.map((candidate, i) => {
      const zeroed = candidate.zeroed.map(varName).join(', ');
      let values;
      let verdict;
      let objective;

      if (i > ctx.step) {
        values = candidate.x ? candidate.x.map(() => '·') : [];
        verdict = 'Not yet examined';
        objective = '·';
      } else if (candidate.singular) {
        values = new Array(model.s).fill('—');
        verdict = 'Singular basis — no solution';
        objective = '—';
      } else {
        values = candidate.x.map(frText);
        verdict = candidate.feasible ? 'Feasible' : 'Not feasible';
        objective = candidate.feasible ? frText(candidate.z) : '—';
        if (candidate.feasible && model.best && model.best.index === i && ctx.step === model.candidates.length - 1) {
          verdict = model.preset.sense === 'max' ? 'Feasible — optimal (largest)' : 'Feasible — optimal (smallest)';
        }
      }

      return { cells: [zeroed].concat(values, [verdict, objective]), current: i === ctx.step };
    });

    return {
      caption: `All ${model.candidates.length} basic solutions of ${model.preset.label}: ` +
               `${model.zeroCount} of the ${model.s} variables set to zero each time, ` +
               `candidate ${ctx.step + 1} under examination`,
      rowHeader: true,
      columns,
      rows
    };
  },

  summary(model, ctx) {
    const lines = [];
    lines.push(`This problem has m = ${model.m} constraints and s = ${model.s} variables, so each ` +
               `basic solution sets s − m = ${model.zeroCount} variables to zero and there are ` +
               `${model.candidates.length} combinations to try.`);

    /* The runtime reads out "Step n of m" plus steps.label, which already
       carries this candidate's numbers, so the summary adds the running state
       rather than repeating them. */
    const candidate = model.candidates[ctx.step];
    if (candidate.singular) {
      lines.push(`A singular basis is not a failure of the method: those columns of A are linearly ` +
                 `dependent, so that choice of basic variables does not define a point at all.`);
    } else if (!candidate.feasible) {
      lines.push(`A negative component means the point is outside the feasible region, so the ` +
                 `objective is never evaluated there.`);
    }

    const seen = model.candidates.slice(0, ctx.step + 1);
    const feasibleCount = seen.filter((entry) => entry.feasible).length;
    const runningBest = seen.filter((entry) => entry.feasible).reduce((acc, entry) => {
      if (!acc) return entry;
      return (model.preset.sense === 'max' ? frCmp(entry.z, acc.z) > 0 : frCmp(entry.z, acc.z) < 0) ? entry : acc;
    }, null);

    if (runningBest) {
      lines.push(`${feasibleCount} of the ${ctx.step + 1} candidates examined so far are feasible, and ` +
                 `the best is candidate ${runningBest.index + 1} with ${frText(runningBest.z)}.`);
    } else {
      lines.push(`None of the ${ctx.step + 1} candidates examined so far is feasible.`);
    }

    if (ctx.step === model.candidates.length - 1 && model.best) {
      lines.push(`Enumeration complete. The optimal basic feasible solution is ` +
                 `(${model.best.x.map(frText).join(', ')}) with ${model.preset.objective} = ` +
                 `${frText(model.best.z)}. ${model.preset.note}`);
    }
    return lines;
  }
});

/* ==========================================================================
   5. demo-simplex-tableau — the tableau step-through (7.5.3-7.5.10)
   ========================================================================== */

const SIMPLEX_PRESETS = {
  running: {
    label: 'Running example — max 120x₁ + 100x₂',
    c: [120, 100],
    A: [[2, 2], [5, 3]],
    b: [8, 15],
    note: 'The optimum is (1.5, 2.5) with z = 430. Both decks print 420 in the final tableau; that cell is a typo.'
  },
  threevar: {
    label: 'Three variables — max 2x₁ + 3x₂ + 3x₃',
    c: [2, 3, 3],
    A: [[3, 2, 0], [-1, 1, 4], [2, -2, 5]],
    b: [60, 10, 50],
    note: 'The optimum is (8, 18, 0) with z = 70. The two pivoting rules reach it along different paths.'
  },
  unbounded: {
    label: 'Unbounded — max 2x₂ + x₃',
    c: [0, 2, 1],
    A: [[1, 1, -2], [-3, 1, 2]],
    b: [7, 3],
    note: 'After two pivots x₃ still wants to enter, but its whole column is negative, so nothing bounds it.'
  },
  practice: {
    label: 'Practice exercise — max x₁ + 2x₂',
    c: [1, 2],
    A: [[1, 1], [1, 0], [0, 1]],
    b: [1.5, 1, 1],
    note: 'This is the problem solved graphically in §7.3.1; the answer is (0.5, 1) with z = 2.5.'
  }
};

function snapshot(rows, objective, basis) {
  return {
    rows: rows.map((row) => row.slice()),
    objective: objective.slice(),
    basis: basis.slice()
  };
}

function simplexModel(values) {
  const preset = SIMPLEX_PRESETS[values.problem];
  const rule = values.rule;
  const m = preset.A.length;
  const n = preset.A[0].length;
  const s = n + m;

  /* Tableau rows: s coefficient columns, then the z column, then the RHS. */
  let rows = preset.A.map((row, i) => {
    const cells = row.map(frOf);
    for (let j = 0; j < m; j += 1) cells.push(fr(i === j ? 1 : 0));
    cells.push(fr(0));            // z column
    cells.push(frOf(preset.b[i]));
    return cells;
  });
  let objective = preset.c.map((value) => frNeg(frOf(value)));
  for (let j = 0; j < m; j += 1) objective.push(fr(0));
  objective.push(fr(1));          // z column
  objective.push(fr(0));          // objective value

  let basis = [];
  for (let i = 0; i < m; i += 1) basis.push(n + i);

  const solutionOf = () => {
    const x = new Array(s).fill(null).map(() => fr(0));
    basis.forEach((j, i) => { x[j] = rows[i][s + 1]; });
    return x;
  };

  const events = [];
  events.push({
    kind: 'init',
    tableau: snapshot(rows, objective, basis),
    x: solutionOf(),
    z: objective[s + 1],
    tableauNumber: 1,
    entering: null, leaving: null, ratios: null,
    description: `Initial tableau. Every right-hand side is non-negative, so setting the ` +
                 `${n} original variables to zero gives the basic feasible solution ` +
                 `(${solutionOf().map(frText).join(', ')}) with z = 0.`
  });

  let tableauNumber = 1;
  let outcome = 'optimal';

  for (let guard = 0; guard < 30; guard += 1) {
    const negatives = [];
    for (let j = 0; j < s; j += 1) if (frSign(objective[j]) < 0) negatives.push(j);

    if (negatives.length === 0) {
      events.push({
        kind: 'optimal',
        tableau: snapshot(rows, objective, basis),
        x: solutionOf(),
        z: objective[s + 1],
        tableauNumber,
        entering: null, leaving: null, ratios: null,
        description: `Optimality test on tableau ${tableauNumber}: the objective row has no negative ` +
                     `entry, so no variable can be increased to improve z. The solution ` +
                     `(${solutionOf().map(frText).join(', ')}) with z = ${frText(objective[s + 1])} is optimal.`
      });
      outcome = 'optimal';
      break;
    }

    let entering;
    if (rule === 'bland') {
      entering = negatives[0];
    } else {
      let bestValue = objective[negatives[0]];
      entering = negatives[0];
      negatives.forEach((j) => {
        if (frCmp(objective[j], bestValue) < 0) { bestValue = objective[j]; entering = j; }
      });
    }

    events.push({
      kind: 'enter',
      tableau: snapshot(rows, objective, basis),
      x: solutionOf(),
      z: objective[s + 1],
      tableauNumber,
      entering, leaving: null, ratios: null,
      description: rule === 'bland'
        ? `Entering variable on tableau ${tableauNumber}: by the smallest-subscript rule the first ` +
          `column with a negative objective entry is ${varName(entering)} at ` +
          `${frText(objective[entering])}, so ${varName(entering)} enters the basis.`
        : `Entering variable on tableau ${tableauNumber}: the most negative objective entry is ` +
          `${frText(objective[entering])} in the ${varName(entering)} column, so ${varName(entering)} ` +
          `enters the basis.`
    });

    const ratios = rows.map((row, i) => {
      const coefficient = row[entering];
      if (frSign(coefficient) <= 0) return null;
      return frDiv(row[s + 1], coefficient);
    });

    if (ratios.every((ratio) => ratio === null)) {
      events.push({
        kind: 'unbounded',
        tableau: snapshot(rows, objective, basis),
        x: solutionOf(),
        z: objective[s + 1],
        tableauNumber,
        entering, leaving: null, ratios,
        description: `No departing variable exists on tableau ${tableauNumber}: every entry of the ` +
                     `${varName(entering)} column is zero or negative, so nothing stops ` +
                     `${varName(entering)} from growing. The objective is unbounded and there is no ` +
                     `optimal solution.`
      });
      outcome = 'unbounded';
      break;
    }

    let leaving = -1;
    ratios.forEach((ratio, i) => {
      if (ratio === null) return;
      if (leaving < 0) { leaving = i; return; }
      const compare = frCmp(ratio, ratios[leaving]);
      if (compare < 0) leaving = i;
      else if (compare === 0 && rule === 'bland' && basis[i] < basis[leaving]) leaving = i;
    });

    const pivot = rows[leaving][entering];
    events.push({
      kind: 'depart',
      tableau: snapshot(rows, objective, basis),
      x: solutionOf(),
      z: objective[s + 1],
      tableauNumber,
      entering, leaving, ratios,
      description: `Departing variable on tableau ${tableauNumber}: the smallest positive ratio of ` +
                   `right-hand side to ${varName(entering)} coefficient is ${frText(ratios[leaving])} ` +
                   `in the ${varName(basis[leaving])} row, so ${varName(basis[leaving])} departs. ` +
                   `The pivot is ${frText(pivot)}.`
    });

    /* Pivot: scale the pivotal row, then clear the rest of the column. */
    const oldBasic = basis[leaving];
    rows[leaving] = rows[leaving].map((value) => frDiv(value, pivot));
    rows = rows.map((row, i) => {
      if (i === leaving || frIsZero(row[entering])) return row;
      const factor = row[entering];
      return row.map((value, j) => frSub(value, frMul(factor, rows[leaving][j])));
    });
    if (!frIsZero(objective[entering])) {
      const factor = objective[entering];
      objective = objective.map((value, j) => frSub(value, frMul(factor, rows[leaving][j])));
    }
    basis = basis.slice();
    basis[leaving] = entering;
    tableauNumber += 1;

    events.push({
      kind: 'pivot',
      tableau: snapshot(rows, objective, basis),
      x: solutionOf(),
      z: objective[s + 1],
      tableauNumber,
      entering: null, leaving: null, ratios: null,
      description: `Pivot done — tableau ${tableauNumber}. Row ${leaving + 1} was divided by ` +
                   `${frText(pivot)} and multiples of it cleared the rest of the ${varName(entering)} ` +
                   `column, so ${varName(entering)} replaced ${varName(oldBasic)} in the basis. The new ` +
                   `solution is (${solutionOf().map(frText).join(', ')}) with z = ${frText(objective[s + 1])}.`
    });
  }

  /* One point per tableau, for the objective-progress figure. */
  const progress = [];
  events.forEach((event) => {
    const last = progress[progress.length - 1];
    if (!last || last.tableauNumber !== event.tableauNumber) {
      progress.push({
        tableauNumber: event.tableauNumber,
        z: event.z,
        basis: event.tableau.basis.slice()
      });
    }
  });

  return { preset, rule, m, n, s, events, progress, outcome };
}

createDemo('#demo-simplex-tableau-mount', {
  id: 'demo-simplex-tableau',
  title: 'Simplex tableau step-through',
  description: 'Every step of the simplex method, separately: the initial tableau, then choose an ' +
               'entering variable, choose a departing variable, pivot, and test for optimality. ' +
               'The column headings and the basic-variable labels say in words which column and ' +
               'row are the pivotal ones at this step.',
  headingLevel: 4,
  caption: 'The line shows the objective at each tableau. It never decreases — that is the property ' +
           'the entering-variable rule is designed to guarantee.',

  controls: [
    {
      type: 'select', name: 'problem', label: 'Problem',
      value: 'running',
      options: Object.keys(SIMPLEX_PRESETS).map((key) => ({
        value: key, label: SIMPLEX_PRESETS[key].label
      })),
      help: 'Slack variables are added automatically, one per constraint.'
    },
    {
      type: 'radio', name: 'rule', label: 'Entering-variable rule',
      value: 'dantzig',
      options: [
        { value: 'dantzig', label: 'Most negative objective entry (Dantzig)' },
        { value: 'bland', label: 'Smallest subscript (Bland’s rule)' }
      ],
      help: 'Bland’s rule cannot cycle; Dantzig’s rule usually takes larger steps. On the ' +
            'three-variable problem the two take different routes to the same answer.'
    }
  ],

  compute: simplexModel,

  steps: {
    count: (model) => model.events.length,
    label: (model, i) => model.events[i].description
  },

  figure(model, ctx) {
    const W = 460;
    const H = 250;
    const pad = { left: 52, right: 16, top: 22, bottom: 46 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const base = pad.top + plotH;
    const current = model.events[ctx.step];

    const values = model.progress.map((point) => frNum(point.z));
    const top = Math.max(1, ...values.map(Math.abs));
    const count = model.progress.length;
    const px = (i) => pad.left + (count === 1 ? plotW / 2 : (i / (count - 1)) * plotW);
    const py = (v) => base - (Math.abs(v) / top) * plotH;

    const svg = svgRoot(W, H);
    svg.appendChild(line(pad.left, base, pad.left + plotW, base, { stroke: RULE, width: 1.5 }));
    svg.appendChild(line(pad.left, pad.top, pad.left, base, { stroke: RULE, width: 1.5 }));
    svg.appendChild(text(pad.left - 6, base + 4, '0', { anchor: 'end' }));
    svg.appendChild(text(pad.left - 6, pad.top + 6, num(top, 2), { anchor: 'end' }));
    svg.appendChild(text(pad.left + plotW / 2, H - 8, 'tableau number', { anchor: 'middle', fill: INK_STRONG }));
    svg.appendChild(text(10, pad.top - 8, 'objective z', { fill: INK_STRONG }));

    for (let i = 1; i < count; i += 1) {
      svg.appendChild(line(px(i - 1), py(values[i - 1]), px(i), py(values[i]),
        { stroke: ACCENT, width: 2 }));
    }

    model.progress.forEach((point, i) => {
      const x = px(i);
      const y = py(frNum(point.z));
      const isCurrent = point.tableauNumber === current.tableauNumber;
      svg.appendChild(circle(x, y, isCurrent ? 8 : 5, { stroke: ACCENT, width: 2 }));
      if (isCurrent) svg.appendChild(text(x, y - 16, '▲', { anchor: 'middle', fill: INK_STRONG }));
      svg.appendChild(text(x, y + (y < pad.top + 30 ? 22 : -14), frText(point.z),
        { anchor: 'middle', fill: INK_STRONG, weight: 700 }));
      svg.appendChild(text(x, base + 18, String(point.tableauNumber), { anchor: 'middle' }));
    });

    if (model.outcome === 'unbounded' && ctx.step === model.events.length - 1) {
      svg.appendChild(text(px(count - 1) + 10, py(values[count - 1]) - 26,
        'grows without limit', { anchor: 'end', fill: INK_STRONG, weight: 700 }));
    }

    return svg;
  },

  figureAlt(model, ctx) {
    const event = model.events[ctx.step];
    const point = model.progress.find((entry) => entry.tableauNumber === event.tableauNumber);
    const stageWords = {
      init: 'the starting vertex',
      enter: `choosing ${event.entering !== null ? varName(event.entering) : 'a variable'} to enter`,
      depart: `choosing ${event.leaving !== null ? varName(event.tableau.basis[event.leaving]) : 'a variable'} to depart`,
      pivot: 'the vertex reached by the pivot',
      optimal: 'the optimal vertex',
      unbounded: 'the vertex where the method stops'
    };
    return `Step ${ctx.step + 1} of ${model.events.length}: the marker sits on tableau ` +
           `${event.tableauNumber} of ${model.progress.length}, at z = ${frText(point.z)}, which is ` +
           `${stageWords[event.kind]}; the line so far runs ` +
           `${model.progress.map((entry) => frText(entry.z)).join(' then ')}.`;
  },

  table(model, ctx) {
    const event = model.events[ctx.step];
    const { rows, objective, basis } = event.tableau;
    const s = model.s;

    const columns = [{ label: 'Basic' }];
    for (let j = 0; j < s; j += 1) {
      columns.push({
        label: j === event.entering ? `${varName(j)} — entering` : varName(j),
        numeric: true
      });
    }
    columns.push({ label: 'z', numeric: true });
    columns.push({ label: 'RHS', numeric: true });
    columns.push({ label: 'Ratio RHS ÷ entering', numeric: true });

    const bodyRows = rows.map((row, i) => {
      const label = i === event.leaving
        ? `${varName(basis[i])} — departing`
        : varName(basis[i]);
      let ratio = '—';
      if (event.ratios) {
        ratio = event.ratios[i] === null ? 'not positive' : frText(event.ratios[i]);
      }
      return {
        cells: [label].concat(row.map(frText), [ratio]),
        current: i === event.leaving
      };
    });

    bodyRows.push({
      cells: ['Objective'].concat(objective.map(frText), ['—']),
      current: event.kind === 'enter'
    });

    return {
      caption: `${model.preset.label}, tableau ${event.tableauNumber}, ` +
               `step ${ctx.step + 1} of ${ctx.stepCount}` +
               (event.entering !== null ? `, pivotal column ${varName(event.entering)}` : '') +
               (event.leaving !== null ? `, pivotal row ${varName(basis[event.leaving])}` : ''),
      rowHeader: true,
      columns,
      rows: bodyRows
    };
  },

  /* The runtime already reads out "Step n of m" followed by steps.label, so
     the summary adds what comes next rather than repeating the step. */
  summary(model, ctx) {
    const event = model.events[ctx.step];
    const lines = [];

    const basicList = event.tableau.basis.map(varName).join(', ');
    lines.push(`Basic variables of tableau ${event.tableauNumber}: ${basicList}. Current solution ` +
               `(${event.x.map(frText).join(', ')}), objective z = ${frText(event.z)}.`);

    const next = {
      init: 'Next: look along the objective row for a negative entry, which marks a variable worth increasing.',
      enter: 'Next: the ratio column decides which row the entering variable takes over.',
      depart: 'Next: divide the pivotal row by the pivot, then clear the rest of that column.',
      pivot: 'Next: test the new objective row for negative entries.',
      optimal: '',
      unbounded: ''
    }[event.kind];
    if (next) lines.push(next);

    if (ctx.step === model.events.length - 1) {
      lines.push(model.outcome === 'unbounded'
        ? `The method has stopped without an optimal solution because the problem is unbounded. ${model.preset.note}`
        : `The method is finished after ${model.progress.length} tableaus using ` +
          `${model.rule === 'bland' ? 'Bland’s smallest-subscript rule' : 'Dantzig’s most-negative rule'}. ` +
          `${model.preset.note}`);
    }
    return lines;
  }
});

/* ==========================================================================
   6. demo-brute-force-cost — why simplex was invented (7.5.1)
   ========================================================================== */

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

/** Group digits so a 13-digit count is readable. Thin spaces, not commas. */
function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

createDemo('#demo-brute-force-cost-mount', {
  id: 'demo-brute-force-cost',
  title: 'Brute-force cost calculator',
  description: 'How many m by m linear systems the brute-force method of §7.4.9 has to solve, and ' +
               'how much arithmetic that is, as the problem grows. The slides quote two of these ' +
               'rows: 70 systems for 4 variables with 4 constraints, and 12 870 for 8 with 8.',
  headingLevel: 4,
  caption: 'Bar length is proportional to the base-10 logarithm of the work, because the raw numbers ' +
           'span twelve orders of magnitude. The exact count is printed on each bar.',

  controls: [
    {
      type: 'range', name: 'n', label: 'Original variables n',
      min: 1, max: 16, step: 1, value: 4,
      valueText: (v) => `${v} original variables`,
      help: 'The number of unknowns before slack variables are added.'
    },
    {
      type: 'range', name: 'm', label: 'Constraints m',
      min: 1, max: 12, step: 1, value: 4,
      valueText: (v) => `${v} constraints`,
      help: 'One slack variable is added per constraint, so the total variable count is n + m.'
    }
  ],

  compute(values) {
    const n = Math.round(Number(values.n));
    const m = Math.round(Number(values.m));

    const rows = [];
    for (let k = 1; k <= 12; k += 1) {
      const s = n + k;
      const systems = choose(s, k);
      rows.push({ m: k, s, systems, work: systems * Math.pow(k, 3), current: k === m });
    }

    const here = rows.find((row) => row.m === m);
    const first = rows[0];
    return {
      n, m, rows, here,
      growth: here.work / first.work,
      slideCase: { systems: choose(8, 4), bigSystems: choose(16, 8) }
    };
  },

  figure(model) {
    const W = 460;
    const H = 300;
    const pad = { left: 34, right: 14, top: 26, bottom: 30 };
    const plotW = W - pad.left - pad.right;
    const rowH = (H - pad.top - pad.bottom) / model.rows.length;
    const logs = model.rows.map((row) => Math.log10(Math.max(1, row.work)));
    const top = Math.max(1, ...logs);

    const svg = svgRoot(W, H);
    svg.appendChild(line(pad.left, pad.top - 4, pad.left, H - pad.bottom, { stroke: RULE, width: 1.5 }));
    svg.appendChild(text(pad.left, pad.top - 12, 'work, log scale — number on each bar is exact', { fill: INK_STRONG }));

    model.rows.forEach((row, i) => {
      const y = pad.top + i * rowH;
      const w = (logs[i] / top) * (plotW - 150);
      svg.appendChild(text(pad.left - 6, y + rowH * 0.65, `m=${row.m}`, { anchor: 'end' }));
      svg.appendChild(rect(pad.left, y + 2, w, rowH - 6, {
        fill: row.current ? WARM : 'none',
        stroke: row.current ? ACCENT : INK,
        width: row.current ? 2.5 : 1.2,
        dash: row.current ? null : '4 3'
      }));
      svg.appendChild(text(pad.left + w + 6, y + rowH * 0.65,
        `${group(row.systems)} systems`, { fill: INK_STRONG }));
      if (row.current) {
        svg.appendChild(text(pad.left + 4, y + rowH * 0.65, '▶', { fill: INK_STRONG, weight: 700 }));
      }
    });

    return svg;
  },

  figureAlt(model) {
    return `Twelve bars, one per constraint count from 1 to 12, growing steadily to the right on a ` +
           `logarithmic scale; the highlighted bar is m = ${model.m}, where ${model.n} original ` +
           `variables need ${group(model.here.systems)} systems of size ${model.m}, about ` +
           `${group(Math.round(model.growth))} times the work of the single-constraint case.`;
  },

  table(model) {
    return {
      caption: `Cost of the brute-force method with n = ${model.n} original variables, for every ` +
               `constraint count from 1 to 12`,
      rowHeader: true,
      columns: [
        { label: 'Constraints m' },
        { label: 'Total variables s = n + m', numeric: true },
        { label: 'Systems to solve, C(s, m)', numeric: true },
        { label: 'Size of each system', numeric: true },
        { label: 'Work ≈ systems × m³', numeric: true }
      ],
      rows: model.rows.map((row) => ({
        cells: [row.m, row.s, group(row.systems), `${row.m} × ${row.m}`, group(row.work)],
        current: row.current
      }))
    };
  },

  summary(model) {
    return [
      `With n = ${model.n} original variables and m = ${model.m} constraints there are ` +
      `s = ${model.here.s} variables in total, so the method solves C(${model.here.s}, ${model.m}) = ` +
      `${group(model.here.systems)} systems, each of size ${model.m} by ${model.m}.`,

      `At roughly m³ operations per solve that is about ${group(model.here.work)} units of work — ` +
      `${group(Math.round(model.growth))} times the one-constraint case in the first row of the table.`,

      `The two cases quoted in the slides are 8 variables in total with 4 constraints, giving ` +
      `${group(model.slideCase.systems)} systems, and 16 with 8, giving ` +
      `${group(model.slideCase.bigSystems)} — a factor of about 1500 more work once the cubic cost ` +
      `of each solve is included. Simplex exists because this curve is unusable.`
    ];
  }
});

})(window);
