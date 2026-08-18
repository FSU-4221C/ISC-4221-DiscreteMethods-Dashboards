/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m5-data-mining.js — the interactive demos for M5, Data Mining
   ==========================================================================

   ISC 4221C (2026). Vanilla ES module, no dependencies, no network access.
   Every number on this page is computed here, in the browser, from the exact
   datasets the course uses:

     - the five-point distance matrix of final-exam Question 3
     - the six tutorial points A-F, and a fifteen-point three-blob set
     - the ten-record loan-default training set
     - the fourteen-record play-tennis training set
     - the six-record tumour set of final-exam Question 2

   Nothing is precomputed and shipped as a trace: the pipeline never produced
   an assets/data/m5/ directory, so all six demos derive their traces at run
   time from the tables that are printed on the page. That is deliberate — a
   student who disagrees with a number can re-derive it on paper from the same
   table the code reads.

   Colour comes only from the tokens in assets/css/fsu-tokens.css, referenced
   as var(--fsu-series-N) inside the generated SVG. No hex anywhere.
   ========================================================================== */

const { createDemo, svgEl, seededRandom, formatNumber } = window.Demo;
/* ==========================================================================
   0. Shared helpers
   ========================================================================== */

const SERIES = [
  'var(--fsu-series-1)',
  'var(--fsu-series-2)',
  'var(--fsu-series-3)',
  'var(--fsu-series-4)',
  'var(--fsu-series-5)',
  'var(--fsu-series-6)'
];

const INK = 'currentColor';
const STRONG = 'var(--fsu-color-strong)';
const SURFACE = 'var(--fsu-surface)';

/** Marker shape per series index, so colour is never the only cue. */
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'plus'];

function seriesColour(i) { return SERIES[i % SERIES.length]; }

function txt(x, y, content, opts = {}) {
  return svgEl('text', Object.assign({
    x, y, fill: INK, 'font-size': 12
  }, opts), [String(content)]);
}

/** A shape marker centred at (x, y). Shape is chosen by index, not by colour. */
function marker(index, x, y, r, fill) {
  const shape = SHAPES[index % SHAPES.length];
  switch (shape) {
    case 'square':
      return svgEl('rect', { x: x - r, y: y - r, width: 2 * r, height: 2 * r, fill });
    case 'triangle':
      return svgEl('polygon', {
        points: `${x},${y - r * 1.15} ${x - r},${y + r * 0.8} ${x + r},${y + r * 0.8}`, fill
      });
    case 'diamond':
      return svgEl('polygon', {
        points: `${x},${y - r * 1.2} ${x + r * 1.2},${y} ${x},${y + r * 1.2} ${x - r * 1.2},${y}`, fill
      });
    case 'cross':
      return svgEl('path', {
        d: `M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`,
        stroke: fill, 'stroke-width': Math.max(2, r * 0.7), fill: 'none'
      });
    case 'plus':
      return svgEl('path', {
        d: `M${x} ${y - r * 1.2} L${x} ${y + r * 1.2} M${x - r * 1.2} ${y} L${x + r * 1.2} ${y}`,
        stroke: fill, 'stroke-width': Math.max(2, r * 0.7), fill: 'none'
      });
    default:
      return svgEl('circle', { cx: x, cy: y, r, fill });
  }
}

const SHAPE_WORDS = ['round', 'square', 'triangular', 'diamond', 'cross-shaped', 'plus-shaped'];

function shapeWord(i) { return SHAPE_WORDS[i % SHAPE_WORDS.length]; }

/* --- impurity measures (5.6.8) ------------------------------------------- */

/**
 * @param {number[]} counts records per class at this node
 * @param {'gini'|'entropy'|'error'} measure
 * @returns {number} impurity, 0 when the node is pure
 */
function impurity(counts, measure) {
  const n = counts.reduce((s, c) => s + c, 0);
  if (n === 0) return 0;
  const p = counts.map((c) => c / n);
  if (measure === 'gini') return 1 - p.reduce((s, q) => s + q * q, 0);
  if (measure === 'error') return 1 - Math.max(...p);
  return -p.reduce((s, q) => (q > 0 ? s + q * Math.log2(q) : s), 0);
}

const MEASURE_NAME = { gini: 'Gini', entropy: 'entropy', error: 'classification error' };

/* --- geometry ------------------------------------------------------------ */

function dist2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += (a[i] - b[i]) * (a[i] - b[i]);
  return s;
}
function dist(a, b) { return Math.sqrt(dist2(a, b)); }

/* ==========================================================================
   1. Datasets
   ========================================================================== */

/* Final-exam Question 3: five objects given only by pairwise distances. */
const EXAM_LABELS = ['x1', 'x2', 'x3', 'x4', 'x5'];
const EXAM_D = [
  [0, 3, 8, 6, 9],
  [3, 0, 5, 7, 7],
  [8, 5, 0, 2, 5],
  [6, 7, 2, 0, 4],
  [9, 7, 5, 4, 0]
];

/* Tutorial practice problem P2: six points, k = 2. */
const TUTORIAL_POINTS = {
  name: 'Tutorial points A to F',
  labels: ['A', 'B', 'C', 'D', 'E', 'F'],
  coords: [[1, 1], [2, 1], [1, 2], [5, 4], [6, 4], [5, 5]]
};

/* Fifteen points in three visible blobs. Coordinates are fixed and printed in
   the data table, so a run is reproducible without a seed. */
const BLOB_POINTS = {
  name: 'Three blobs, fifteen points',
  labels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15'],
  coords: [
    [0.5, 1.0], [1.0, 0.5], [1.5, 1.2], [0.8, 1.8], [1.4, 0.8],
    [4.6, 1.2], [5.2, 1.0], [5.6, 1.9], [4.9, 2.1], [5.4, 1.5],
    [2.6, 4.8], [3.2, 5.4], [3.6, 4.6], [2.8, 5.6], [3.4, 5.0]
  ]
};

/* --- classification datasets --------------------------------------------- */

/* The 10-record loan-default training set (5.6.6). */
const LOAN = {
  key: 'loan',
  name: 'Loan default, ten records',
  classes: ['No default', 'Default'],
  rows: [
    { home: 'yes', marital: 'single',   income: 125, cls: 0 },
    { home: 'no',  marital: 'married',  income: 100, cls: 0 },
    { home: 'no',  marital: 'single',   income: 70,  cls: 0 },
    { home: 'yes', marital: 'married',  income: 120, cls: 0 },
    { home: 'no',  marital: 'divorced', income: 95,  cls: 1 },
    { home: 'no',  marital: 'married',  income: 60,  cls: 0 },
    { home: 'yes', marital: 'divorced', income: 220, cls: 0 },
    { home: 'no',  marital: 'single',   income: 85,  cls: 1 },
    { home: 'no',  marital: 'married',  income: 75,  cls: 0 },
    { home: 'no',  marital: 'single',   income: 90,  cls: 1 }
  ],
  attributes: [
    { name: 'Home owner', values: ['yes', 'no'], of: (r) => r.home },
    {
      name: 'Marital status',
      values: ['single', 'married', 'divorced'],
      of: (r) => r.marital,
      binaryValue: 'married',
      binaryLabels: ['married', 'not married']
    },
    {
      name: 'Annual income',
      values: ['< 80K', '≥ 80K'],
      of: (r) => (r.income < 80 ? '< 80K' : '≥ 80K')
    }
  ]
};

/* The 14-record play-tennis training set (5.6.9), with the course's bins. */
const TENNIS = {
  key: 'tennis',
  name: 'Play tennis, fourteen records',
  classes: ['Play', "Don't Play"],
  rows: [
    { outlook: 'sunny',    temp: 85, hum: 85, windy: 'false', cls: 1 },
    { outlook: 'sunny',    temp: 80, hum: 90, windy: 'true',  cls: 1 },
    { outlook: 'overcast', temp: 83, hum: 78, windy: 'false', cls: 0 },
    { outlook: 'rain',     temp: 70, hum: 96, windy: 'false', cls: 0 },
    { outlook: 'rain',     temp: 68, hum: 80, windy: 'false', cls: 0 },
    { outlook: 'rain',     temp: 65, hum: 70, windy: 'true',  cls: 1 },
    { outlook: 'overcast', temp: 64, hum: 65, windy: 'true',  cls: 0 },
    { outlook: 'sunny',    temp: 72, hum: 95, windy: 'false', cls: 1 },
    { outlook: 'sunny',    temp: 69, hum: 70, windy: 'false', cls: 0 },
    { outlook: 'rain',     temp: 75, hum: 80, windy: 'false', cls: 0 },
    { outlook: 'sunny',    temp: 75, hum: 70, windy: 'true',  cls: 0 },
    { outlook: 'overcast', temp: 72, hum: 90, windy: 'true',  cls: 0 },
    { outlook: 'overcast', temp: 81, hum: 75, windy: 'false', cls: 0 },
    { outlook: 'rain',     temp: 71, hum: 80, windy: 'true',  cls: 1 }
  ],
  attributes: [
    { name: 'Outlook', values: ['sunny', 'overcast', 'rain'], of: (r) => r.outlook },
    {
      name: 'Temperature',
      values: ['cool', 'mild', 'hot'],
      of: (r) => (r.temp < 70 ? 'cool' : (r.temp < 80 ? 'mild' : 'hot'))
    },
    {
      name: 'Humidity',
      values: ['low', 'medium', 'high'],
      of: (r) => (r.hum < 75 ? 'low' : (r.hum < 90 ? 'medium' : 'high'))
    },
    { name: 'Windy', values: ['true', 'false'], of: (r) => r.windy }
  ]
};

/* Final-exam Question 2: six tumour records. */
const TUMOUR = {
  key: 'tumour',
  name: 'Tumour, final-exam Q2',
  classes: ['Malignant', 'Benign'],
  rows: [
    { size: 6, density: 'High', cls: 0 },
    { size: 3, density: 'Low',  cls: 1 },
    { size: 7, density: 'High', cls: 0 },
    { size: 2, density: 'Low',  cls: 1 },
    { size: 8, density: 'Low',  cls: 0 },
    { size: 4, density: 'High', cls: 1 }
  ],
  attributes: [
    { name: 'Size', values: ['< 5 cm', '≥ 5 cm'], of: (r) => (r.size < 5 ? '< 5 cm' : '≥ 5 cm') },
    { name: 'Density', values: ['High', 'Low'], of: (r) => r.density }
  ]
};

const DATASETS = { loan: LOAN, tennis: TENNIS, tumour: TUMOUR };

/**
 * Partition a list of record indices by one attribute.
 * @param {object} ds     dataset
 * @param {object} attr   attribute descriptor
 * @param {number[]} idx  record indices at this node
 * @param {boolean} binary group nominal attributes two ways where declared
 */
function partition(ds, attr, idx, binary) {
  const useBinary = binary && attr.binaryValue;
  const values = useBinary ? attr.binaryLabels : attr.values;
  const bucketOf = (r) => {
    const v = attr.of(r);
    if (!useBinary) return v;
    return v === attr.binaryValue ? attr.binaryLabels[0] : attr.binaryLabels[1];
  };

  const groups = values.map((v) => ({ value: v, idx: [], counts: ds.classes.map(() => 0) }));
  const byValue = new Map(groups.map((g) => [g.value, g]));

  idx.forEach((i) => {
    const g = byValue.get(bucketOf(ds.rows[i]));
    if (!g) return;
    g.idx.push(i);
    g.counts[ds.rows[i].cls] += 1;
  });

  return groups.filter((g) => g.idx.length > 0 || !useBinary);
}

function classCounts(ds, idx) {
  const counts = ds.classes.map(() => 0);
  idx.forEach((i) => { counts[ds.rows[i].cls] += 1; });
  return counts;
}

/** Gain of one attribute at a node. Returns everything the table needs. */
function gainOf(ds, attr, idx, measure, binary) {
  const parentCounts = classCounts(ds, idx);
  const parentImp = impurity(parentCounts, measure);
  const groups = partition(ds, attr, idx, binary).map((g) => {
    const imp = impurity(g.counts, measure);
    return {
      value: g.value,
      idx: g.idx,
      counts: g.counts,
      n: g.idx.length,
      impurity: imp,
      weight: idx.length ? g.idx.length / idx.length : 0,
      contribution: idx.length ? (g.idx.length / idx.length) * imp : 0
    };
  });
  const weighted = groups.reduce((s, g) => s + g.contribution, 0);
  return {
    attribute: attr.name,
    parentCounts,
    parentImpurity: parentImp,
    groups,
    weighted,
    gain: parentImp - weighted
  };
}

/* ==========================================================================
   2. Demo — agglomerative linkage step-through  (5.3.1 to 5.3.6)
   ========================================================================== */

function linkageDistance(members, other, method) {
  const vals = [];
  members.forEach((i) => other.forEach((j) => vals.push(EXAM_D[i][j])));
  if (method === 'single') return Math.min(...vals);
  if (method === 'complete') return Math.max(...vals);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function clusterLabel(members) {
  const names = members.map((i) => EXAM_LABELS[i]);
  return names.length === 1 ? names[0] : `{${names.join(', ')}}`;
}

createDemo('#demo-linkage-trace-mount', {
  id: 'demo-linkage-trace',
  title: 'Agglomerative linkage step-through',
  description:
    'Merge the two closest clusters, recompute the distance matrix, repeat. The dataset is the ' +
    'five-point distance matrix of final-exam Question 3, and every number is recomputed from it.',
  headingLevel: 4,
  caption: 'Dendrogram of the five exam points. Leaf order is fixed so the three linkage criteria can be compared.',

  controls: [
    {
      type: 'select',
      name: 'method',
      label: 'Linkage criterion',
      options: [
        { value: 'single', label: 'Single — nearest neighbour (minimum)' },
        { value: 'complete', label: 'Complete — farthest neighbour (maximum)' },
        { value: 'average', label: 'Average — mean over all cross pairs' }
      ],
      value: 'single',
      help: 'Changing the criterion re-runs the algorithm from the first merge.'
    },
    {
      type: 'range',
      name: 'cut',
      label: 'Cut height',
      min: 0, max: 10, step: 0.5, value: 4.5,
      valueText: (v) => `${v} distance units`,
      help: 'A horizontal cut at this height. The number of clusters it produces is reported below.'
    }
  ],

  compute(values) {
    const method = values.method;
    const n = EXAM_LABELS.length;

    // clusters: {id, members}
    let clusters = EXAM_LABELS.map((_, i) => ({ id: i, members: [i] }));
    const merges = [];
    const states = [];

    const snapshot = (merge) => {
      const list = clusters.map((c) => ({ id: c.id, members: c.members.slice(), label: clusterLabel(c.members) }));
      const matrix = list.map((a) => list.map((b) => (
        a.id === b.id ? 0 : linkageDistance(a.members, b.members, method)
      )));
      states.push({ clusters: list, matrix, merge });
    };

    snapshot(null);

    let nextId = n;
    while (clusters.length > 1) {
      let best = null;
      for (let a = 0; a < clusters.length; a += 1) {
        for (let b = a + 1; b < clusters.length; b += 1) {
          const d = linkageDistance(clusters[a].members, clusters[b].members, method);
          if (!best || d < best.d - 1e-12) best = { a, b, d };
        }
      }
      const ca = clusters[best.a];
      const cb = clusters[best.b];
      const merged = {
        id: nextId,
        members: ca.members.concat(cb.members).sort((x, y) => x - y)
      };
      merges.push({
        aId: ca.id, bId: cb.id, newId: nextId,
        aLabel: clusterLabel(ca.members), bLabel: clusterLabel(cb.members),
        height: best.d, members: merged.members.slice()
      });
      nextId += 1;
      clusters = clusters.filter((c) => c !== ca && c !== cb).concat([merged]);
      snapshot(merges[merges.length - 1]);
    }

    // leaf order from the completed tree, so leaves never move between steps
    const childrenOf = {};
    merges.forEach((m) => { childrenOf[m.newId] = [m.aId, m.bId]; });
    const order = [];
    (function walk(id) {
      if (id < n) { order.push(id); return; }
      childrenOf[id].forEach(walk);
    })(merges.length ? merges[merges.length - 1].newId : 0);

    const leafSlot = {};
    order.forEach((leaf, slot) => { leafSlot[leaf] = slot; });

    const maxHeight = merges.reduce((m, x) => Math.max(m, x.height), 1);
    const cut = Number(values.cut);
    const clustersAtCut = n - merges.filter((m) => m.height <= cut + 1e-12).length;

    return { method, n, states, merges, order, leafSlot, maxHeight, cut, clustersAtCut };
  },

  steps: {
    count: (m) => m.states.length,
    label: (m, i) => {
      const s = m.states[i];
      if (!s.merge) {
        return `Setup: every object is its own cluster, so there are ${m.n} clusters and the ` +
               `smallest entry of the distance matrix is ${formatNumber(smallestOffDiagonal(s.matrix), 3)}.`;
      }
      const left = m.n - i;
      return `Merged ${s.merge.aLabel} with ${s.merge.bLabel} at height ` +
             `${formatNumber(s.merge.height, 3)}; ${left} cluster${left === 1 ? '' : 's'} remain, and the ` +
             `distances from the new cluster were recomputed with the ${m.method} rule.`;
    }
  },

  figure(model, ctx) {
    const W = 520;
    const H = 320;
    const left = 56;
    const right = 500;
    const base = 250;
    const top = 40;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

    const n = model.n;
    const span = (right - left) / (n - 1);
    const scale = (h) => base - (h / (model.maxHeight * 1.12)) * (base - top);

    // y axis with ticks, so the height is readable and not implied by shape alone
    svg.appendChild(svgEl('line', { x1: left - 22, y1: top, x2: left - 22, y2: base, stroke: INK, 'stroke-width': 1.5 }));
    const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((t) => t <= model.maxHeight * 1.12);
    ticks.forEach((t) => {
      const y = scale(t);
      svg.appendChild(svgEl('line', { x1: left - 27, y1: y, x2: left - 22, y2: y, stroke: INK, 'stroke-width': 1.5 }));
      svg.appendChild(txt(left - 32, y + 4, t, { 'text-anchor': 'end' }));
    });
    svg.appendChild(txt(16, 150, 'Merge height', {
      'text-anchor': 'middle', transform: 'rotate(-90 16 150)'
    }));

    // position of each cluster id
    const pos = {};
    model.order.forEach((leaf, slot) => { pos[leaf] = { x: left + slot * span, y: base }; });

    // leaves
    model.order.forEach((leaf, slot) => {
      const x = left + slot * span;
      svg.appendChild(svgEl('line', { x1: x, y1: base, x2: x, y2: base + 8, stroke: INK, 'stroke-width': 1.5 }));
      svg.appendChild(txt(x, base + 26, EXAM_LABELS[leaf], { 'text-anchor': 'middle', 'font-size': 14 }));
    });

    // cut line
    const cutY = scale(model.cut);
    if (model.cut <= model.maxHeight * 1.12) {
      svg.appendChild(svgEl('line', {
        x1: left - 22, y1: cutY, x2: right + 12, y2: cutY,
        stroke: STRONG, 'stroke-width': 2, 'stroke-dasharray': '4 5'
      }));
      svg.appendChild(txt(right + 14, cutY - 6, `cut ${model.cut}`, { 'text-anchor': 'end' }));
    }

    // merges completed so far
    const done = ctx.step;
    for (let k = 0; k < done; k += 1) {
      const m = model.merges[k];
      const a = pos[m.aId];
      const b = pos[m.bId];
      const y = scale(m.height);
      const colour = seriesColour(k);
      svg.appendChild(svgEl('path', {
        d: `M${a.x} ${a.y} L${a.x} ${y} L${b.x} ${y} L${b.x} ${b.y}`,
        stroke: colour, 'stroke-width': k === done - 1 ? 4 : 2.5, fill: 'none'
      }));
      const mx = (a.x + b.x) / 2;
      pos[m.newId] = { x: mx, y };
      svg.appendChild(svgEl('rect', {
        x: mx - 17, y: y - 15, width: 34, height: 15, fill: SURFACE
      }));
      svg.appendChild(txt(mx, y - 4, formatNumber(m.height, m.height % 1 === 0 ? 0 : 2), {
        'text-anchor': 'middle', 'font-size': 12
      }));
      if (k === done - 1) {
        svg.appendChild(txt(mx, y - 20, 'newest merge', { 'text-anchor': 'middle', 'font-size': 11 }));
      }
    }

    svg.appendChild(txt(left - 30, H - 8,
      'Each bracket is one merge; its printed number is the height at which it happened.',
      { 'font-size': 11 }));

    return svg;
  },

  figureAlt(model, ctx) {
    const s = model.states[ctx.step];
    const names = { single: 'single', complete: 'complete', average: 'average' };
    if (!s.merge) {
      return `${names[model.method]} linkage, before any merge: five separate leaves x1 to x5 sit on ` +
             `the baseline, no brackets are drawn yet, and the cut line at height ${model.cut} ` +
             `crosses all five, giving five clusters.`;
    }
    return `${names[model.method]} linkage, after ${ctx.step} of ${model.merges.length} merges: the newest ` +
           `bracket joins ${s.merge.aLabel} to ${s.merge.bLabel} at height ` +
           `${formatNumber(s.merge.height, 2)}, the tallest bracket so far is ` +
           `${formatNumber(Math.max(...model.merges.slice(0, ctx.step).map((m) => m.height)), 2)}, and a cut ` +
           `at ${model.cut} across the finished dendrogram would leave ${model.clustersAtCut} ` +
           `cluster${model.clustersAtCut === 1 ? '' : 's'}.`;
  },

  table(model, ctx) {
    const s = model.states[ctx.step];
    const labels = s.clusters.map((c) => c.label);
    const newest = s.merge ? s.merge.newId : null;

    return {
      caption: `Distance matrix after ${ctx.step} of ${model.merges.length} merges, ${model.method} linkage ` +
               `(${s.clusters.length} cluster${s.clusters.length === 1 ? '' : 's'} remaining)`,
      rowHeader: true,
      columns: [{ label: 'Cluster' }].concat(labels.map((l) => ({ label: l, numeric: true }))),
      rows: s.clusters.map((c, i) => ({
        cells: [c.label].concat(s.matrix[i].map((v, j) => (
          i === j ? '0' : formatNumber(v, v % 1 === 0 ? 0 : 3)
        ))),
        current: c.id === newest
      }))
    };
  },

  summary(model, ctx) {
    const s = model.states[ctx.step];
    const lines = [];

    if (s.clusters.length > 1) {
      const min = smallestOffDiagonal(s.matrix);
      const pair = smallestPair(s);
      lines.push(
        `The smallest distance in the current matrix is ${formatNumber(min, min % 1 === 0 ? 0 : 3)}, ` +
        `between ${pair[0]} and ${pair[1]}. Those two merge next.`
      );
    } else {
      lines.push('One cluster remains, so the algorithm has finished.');
    }

    lines.push(
      `Cutting the dendrogram at height ${model.cut} gives ${model.clustersAtCut} ` +
      `cluster${model.clustersAtCut === 1 ? '' : 's'}: ${clustersAtHeight(model).join('; ')}.`
    );

    if (ctx.step === model.states.length - 1) {
      lines.push(
        `Merge heights in order: ${model.merges.map((m) => formatNumber(m.height, m.height % 1 === 0 ? 0 : 2)).join(', ')}. ` +
        'They never decrease, which is why a dendrogram can be read at any cut height.'
      );
    }
    return lines;
  }
});

function smallestOffDiagonal(matrix) {
  let min = Infinity;
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = i + 1; j < matrix.length; j += 1) min = Math.min(min, matrix[i][j]);
  }
  return Number.isFinite(min) ? min : 0;
}

function smallestPair(state) {
  let best = null;
  for (let i = 0; i < state.matrix.length; i += 1) {
    for (let j = i + 1; j < state.matrix.length; j += 1) {
      if (!best || state.matrix[i][j] < best.d) best = { i, j, d: state.matrix[i][j] };
    }
  }
  return best ? [state.clusters[best.i].label, state.clusters[best.j].label] : ['—', '—'];
}

function clustersAtHeight(model) {
  const n = model.n;
  const parent = {};
  const members = {};
  EXAM_LABELS.forEach((_, i) => { members[i] = [i]; });
  const alive = new Set(EXAM_LABELS.map((_, i) => i));
  model.merges.forEach((m) => {
    if (m.height > model.cut + 1e-12) return;
    members[m.newId] = m.members.slice();
    alive.delete(m.aId);
    alive.delete(m.bId);
    alive.add(m.newId);
    parent[m.aId] = m.newId;
    parent[m.bId] = m.newId;
  });
  return Array.from(alive).map((id) => clusterLabel(members[id]));
}

/* ==========================================================================
   3. Demo — k-means / Lloyd's method step-through  (5.4.3 to 5.4.6)
   ========================================================================== */

function initialCentres(points, k, strategy, seed) {
  const coords = points.coords;
  if (strategy === 'first') return coords.slice(0, k).map((p) => p.slice());

  if (strategy === 'spread') {
    const chosen = [coords[0].slice()];
    while (chosen.length < k) {
      let best = null;
      coords.forEach((p) => {
        const d = Math.min(...chosen.map((c) => dist2(p, c)));
        if (!best || d > best.d) best = { p, d };
      });
      chosen.push(best.p.slice());
    }
    return chosen;
  }

  const rnd = seededRandom(seed);
  const idx = coords.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  return idx.slice(0, k).map((i) => coords[i].slice());
}

function assignToCentres(coords, centres) {
  return coords.map((p) => {
    let best = 0;
    let bd = Infinity;
    centres.forEach((c, j) => {
      const d = dist2(p, c);
      if (d < bd - 1e-12) { bd = d; best = j; }
    });
    return best;
  });
}

function updateCentres(coords, assign, centres, k) {
  const sums = Array.from({ length: k }, () => [0, 0]);
  const counts = new Array(k).fill(0);
  coords.forEach((p, i) => {
    sums[assign[i]][0] += p[0];
    sums[assign[i]][1] += p[1];
    counts[assign[i]] += 1;
  });
  return centres.map((c, j) => (
    counts[j] === 0 ? c.slice() : [sums[j][0] / counts[j], sums[j][1] / counts[j]]
  ));
}

function sse(coords, assign, centres) {
  return coords.reduce((s, p, i) => s + dist2(p, centres[assign[i]]), 0);
}

function clusterVariance(coords, assign, centres, k) {
  let total = 0;
  for (let j = 0; j < k; j += 1) {
    const members = coords.filter((_, i) => assign[i] === j);
    if (members.length === 0) continue;
    total += members.reduce((s, p) => s + dist2(p, centres[j]), 0) / members.length;
  }
  return total;
}

createDemo('#demo-kmeans-lloyd-mount', {
  id: 'demo-kmeans-lloyd',
  title: "k-means step-through (Lloyd's method)",
  description:
    'Assign every record to its nearest centre, then move every centre to the average of its cluster. ' +
    'Each step is one half of one iteration, so you can see that both halves reduce the energy.',
  headingLevel: 4,
  caption: 'Records and centres in the plane. Marker shape encodes the cluster; each point is also labelled with its cluster number.',

  controls: [
    {
      type: 'select',
      name: 'dataset',
      label: 'Dataset',
      options: [
        { value: 'tutorial', label: 'Tutorial points A to F (6 records)' },
        { value: 'blobs', label: 'Three blobs (15 records)' }
      ],
      value: 'tutorial'
    },
    {
      type: 'range',
      name: 'k',
      label: 'Number of clusters, k',
      min: 2, max: 5, step: 1, value: 2,
      valueText: (v) => `${v} clusters`,
      help: 'k is an input to the algorithm, never an output. Compare runs using the total cluster variance.'
    },
    {
      type: 'select',
      name: 'init',
      label: 'Initialization strategy',
      options: [
        { value: 'first', label: 'First k records in the table' },
        { value: 'spread', label: 'Farthest-first — spread the centres out' },
        { value: 'random', label: 'Random records, from the seed below' }
      ],
      value: 'first'
    },
    {
      type: 'seed',
      name: 'seed',
      label: 'Random seed',
      value: 42,
      help: 'Only used by the random strategy. The same seed always gives the same run.'
    }
  ],

  compute(values) {
    const points = values.dataset === 'blobs' ? BLOB_POINTS : TUTORIAL_POINTS;
    const coords = points.coords;
    const k = Math.min(Math.max(2, Math.round(values.k)), coords.length);

    let centres = initialCentres(points, k, values.init, values.seed);
    const states = [{
      phase: 'init', iter: 0,
      centres: centres.map((c) => c.slice()),
      assign: null, sse: null, variance: null, moved: null, changed: null
    }];

    let assign = null;
    let converged = false;
    let iterations = 0;

    for (let iter = 1; iter <= 12; iter += 1) {
      const newAssign = assignToCentres(coords, centres);
      const changedIdx = newAssign.map((a, i) => (assign === null ? true : a !== assign[i]));
      const changed = changedIdx.filter(Boolean).length;

      states.push({
        phase: 'assign', iter,
        centres: centres.map((c) => c.slice()),
        assign: newAssign.slice(),
        sse: sse(coords, newAssign, centres),
        variance: clusterVariance(coords, newAssign, centres, k),
        moved: null, changed, changedIdx
      });

      const newCentres = updateCentres(coords, newAssign, centres, k);
      const moved = Math.max(...centres.map((c, j) => dist(c, newCentres[j])));

      states.push({
        phase: 'update', iter,
        centres: newCentres.map((c) => c.slice()),
        assign: newAssign.slice(),
        sse: sse(coords, newAssign, newCentres),
        variance: clusterVariance(coords, newAssign, newCentres, k),
        moved, changed: null
      });

      assign = newAssign;
      centres = newCentres;
      iterations = iter;
      if (moved <= 1e-9) { converged = true; break; }
    }

    return { points, coords, labels: points.labels, k, states, converged, iterations };
  },

  steps: {
    count: (m) => m.states.length,
    label: (m, i) => {
      const s = m.states[i];
      if (s.phase === 'init') {
        return `Step 1 of Lloyd's method, initialization: ${m.k} centres are placed at ` +
               `${s.centres.map((c) => `(${formatNumber(c[0], 2)}, ${formatNumber(c[1], 2)})`).join(', ')}. ` +
               'No record has been assigned yet.';
      }
      if (s.phase === 'assign') {
        return `Iteration ${s.iter}, assignment step: ${s.changed} of ${m.coords.length} records changed cluster; ` +
               `the sum of squared distances is now ${formatNumber(s.sse, 3)}.`;
      }
      return `Iteration ${s.iter}, update step: the centres moved, the largest move being ` +
             `${formatNumber(s.moved, 4)}; the sum of squared distances fell to ${formatNumber(s.sse, 3)}.`;
    }
  },

  figure(model, ctx) {
    const s = model.states[ctx.step];
    const W = 520;
    const H = 340;
    const pad = 46;

    const xs = model.coords.map((p) => p[0]).concat(s.centres.map((c) => c[0]));
    const ys = model.coords.map((p) => p[1]).concat(s.centres.map((c) => c[1]));
    const minX = Math.min(...xs) - 0.6;
    const maxX = Math.max(...xs) + 0.6;
    const minY = Math.min(...ys) - 0.6;
    const maxY = Math.max(...ys) + 0.6;

    const sx = (x) => pad + ((x - minX) / (maxX - minX)) * (W - pad - 20);
    const sy = (y) => (H - pad) - ((y - minY) / (maxY - minY)) * (H - pad - 30);

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

    svg.appendChild(svgEl('line', { x1: pad - 12, y1: H - pad + 12, x2: W - 12, y2: H - pad + 12, stroke: INK, 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('line', { x1: pad - 12, y1: 14, x2: pad - 12, y2: H - pad + 12, stroke: INK, 'stroke-width': 1.2 }));
    svg.appendChild(txt(W - 12, H - pad + 30, 'x', { 'text-anchor': 'end' }));
    svg.appendChild(txt(pad - 18, 14, 'y', { 'text-anchor': 'end' }));

    model.coords.forEach((p, i) => {
      const cluster = s.assign ? s.assign[i] : null;
      const colour = cluster === null ? INK : seriesColour(cluster);
      const g = marker(cluster === null ? 0 : cluster, sx(p[0]), sy(p[1]), 6, colour);
      svg.appendChild(g);
      svg.appendChild(txt(sx(p[0]) + 9, sy(p[1]) - 7,
        cluster === null ? model.labels[i] : `${model.labels[i]}→${cluster + 1}`,
        { 'font-size': 11 }));
    });

    s.centres.forEach((c, j) => {
      svg.appendChild(svgEl('circle', {
        cx: sx(c[0]), cy: sy(c[1]), r: 12, fill: 'none',
        stroke: seriesColour(j), 'stroke-width': 3.5
      }));
      svg.appendChild(svgEl('path', {
        d: `M${sx(c[0]) - 6} ${sy(c[1])} L${sx(c[0]) + 6} ${sy(c[1])} M${sx(c[0])} ${sy(c[1]) - 6} L${sx(c[0])} ${sy(c[1]) + 6}`,
        stroke: STRONG, 'stroke-width': 2
      }));
      svg.appendChild(txt(sx(c[0]) + 15, sy(c[1]) + 16, `c${j + 1}`, { 'font-size': 13 }));
    });

    svg.appendChild(txt(pad - 12, H - 6,
      'Rings marked with a cross are the centres. Each record is labelled with the cluster it joined.',
      { 'font-size': 11 }));

    return svg;
  },

  figureAlt(model, ctx) {
    const s = model.states[ctx.step];
    if (s.phase === 'init') {
      return `Initialization: ${model.coords.length} records are drawn unassigned, and ${model.k} centre rings ` +
             `sit at ${s.centres.map((c) => `(${formatNumber(c[0], 2)}, ${formatNumber(c[1], 2)})`).join(' and ')}. ` +
             'No record carries a cluster number yet.';
    }
    const sizes = countPerCluster(s.assign, model.k);
    if (s.phase === 'assign') {
      return `Iteration ${s.iter}, after assignment: the clusters hold ${sizes.join(', ')} records; ` +
             `${s.changed} record${s.changed === 1 ? '' : 's'} changed marker shape this step, and the centres ` +
             'have not moved yet.';
    }
    return `Iteration ${s.iter}, after the update: the centres jumped to ` +
           `${s.centres.map((c) => `(${formatNumber(c[0], 2)}, ${formatNumber(c[1], 2)})`).join(' and ')}, ` +
           `the largest move being ${formatNumber(s.moved, 3)}; cluster sizes are unchanged at ${sizes.join(', ')}.`;
  },

  table(model, ctx) {
    const s = model.states[ctx.step];
    return {
      caption: s.phase === 'init'
        ? `${model.points.name}: the ${model.coords.length} records and the ${model.k} initial centres, before any assignment`
        : `${model.points.name}: assignment and distances at iteration ${s.iter}, ${s.phase} step`,
      rowHeader: true,
      columns: [
        { label: 'Record' },
        { label: 'x', numeric: true },
        { label: 'y', numeric: true },
        { label: 'Cluster' },
        { label: 'Its centre' },
        { label: 'Distance to centre', numeric: true }
      ],
      rows: model.coords.map((p, i) => {
        const cluster = s.assign ? s.assign[i] : null;
        const c = cluster === null ? null : s.centres[cluster];
        return {
          cells: [
            model.labels[i],
            formatNumber(p[0], 2),
            formatNumber(p[1], 2),
            cluster === null ? 'not yet assigned' : `${cluster + 1} (${shapeWord(cluster)} marker)`,
            c === null ? '—' : `(${formatNumber(c[0], 3)}, ${formatNumber(c[1], 3)})`,
            c === null ? '—' : formatNumber(dist(p, c), 3)
          ],
          current: Boolean(s.phase === 'assign' && s.changedIdx && s.changedIdx[i])
        };
      }).concat(s.centres.map((c, j) => ({
        cells: [
          `Centre c${j + 1}`,
          formatNumber(c[0], 3),
          formatNumber(c[1], 3),
          `${j + 1} (${shapeWord(j)} marker)`,
          'this row is the centre itself',
          s.assign ? `${countPerCluster(s.assign, model.k)[j]} records in this cluster` : 'no records assigned yet'
        ],
        current: false
      })))
    };
  },

  summary(model, ctx) {
    const s = model.states[ctx.step];
    const lines = [];

    if (s.phase === 'init') {
      lines.push(`No energy yet: the ${model.k} centres have been placed but nothing has been assigned.`);
    } else {
      lines.push(
        `Sum of squared distances: ${formatNumber(s.sse, 3)}. ` +
        `The k-means energy, which carries a factor of one half, is ${formatNumber(s.sse / 2, 3)}. ` +
        `Total discrete cluster variance: ${formatNumber(s.variance, 3)}.`
      );
    }

    if (s.phase === 'assign' && ctx.step > 1) {
      const prev = model.states[ctx.step - 1];
      if (prev.sse !== null) {
        lines.push(
          `The assignment step reduced the sum of squared distances from ${formatNumber(prev.sse, 3)} ` +
          `to ${formatNumber(s.sse, 3)} — reassigning a record to a nearer centre can only reduce it.`
        );
      }
    }
    if (s.phase === 'update') {
      const prev = model.states[ctx.step - 1];
      lines.push(
        `The update step reduced it from ${formatNumber(prev.sse, 3)} to ${formatNumber(s.sse, 3)} — ` +
        'the average is the unique minimiser of the squared distance, which is the lemma of 5.4.1.'
      );
      if (s.moved <= 1e-9) {
        lines.push(
          `No centre moved, so the algorithm has converged after ${s.iter} iteration${s.iter === 1 ? '' : 's'}. ` +
          `Final total cluster variance: ${formatNumber(s.variance, 3)}. Try another initialization ` +
          'and compare this number: a smaller value is a better clustering.'
        );
      }
    }

    if (ctx.step === model.states.length - 1 && !model.converged) {
      lines.push('The iteration limit of 12 was reached before the centres stopped moving.');
    }

    return lines;
  }
});

function countPerCluster(assign, k) {
  const counts = new Array(k).fill(0);
  if (!assign) return counts;
  assign.forEach((a) => { counts[a] += 1; });
  return counts;
}

/* ==========================================================================
   4. Demo — Voronoi by sampling, and Lloyd's iteration to a CVT  (5.5.2, 5.5.6)
   ========================================================================== */

/* Fixed default generator positions, printed in the page's fallback table so
   the demo and the static content agree without a precomputed asset.
   Deliberately lopsided — four generators crowded into the lower left and one
   alone in the top right — so that Lloyd's iteration visibly has work to do
   and the cells start as wildly unequal as topic 5.5.5 describes. */
const DEFAULT_GENERATORS = [
  [0.15, 0.15], [0.30, 0.22], [0.22, 0.38],
  [0.52, 0.26], [0.78, 0.82], [0.40, 0.62]
];

createDemo('#demo-voronoi-cvt-mount', {
  id: 'demo-voronoi-cvt',
  title: 'Voronoi by sampling, and Lloyd’s iteration to a CVT',
  description:
    'Pixel-ize the unit square, give every pixel to its nearest generator, then move each generator ' +
    'to the centre of mass of the pixels it owns. Step it and the tessellation becomes centroidal.',
  headingLevel: 4,
  caption: 'The sampled unit square. Each region carries its generator number as text, so the regions are readable without colour.',

  controls: [
    {
      type: 'range',
      name: 'generators',
      label: 'Number of generators',
      min: 3, max: 6, step: 1, value: 5,
      valueText: (v) => `${v} generators`
    },
    {
      type: 'select',
      name: 'resolution',
      label: 'Sampling resolution, M by M pixels',
      options: [
        { value: '12', label: '12 by 12 — 144 samples, coarse staircases' },
        { value: '16', label: '16 by 16 — 256 samples' },
        { value: '24', label: '24 by 24 — 576 samples' },
        { value: '32', label: '32 by 32 — 1024 samples, nearly straight walls' }
      ],
      value: '24',
      help: 'Cost grows as M squared. Accuracy of the cell boundaries grows with it.'
    },
    {
      type: 'select',
      name: 'placement',
      label: 'Initial generator placement',
      options: [
        { value: 'fixed', label: 'Fixed pattern printed in the table below' },
        { value: 'random', label: 'Random, from the seed below' }
      ],
      value: 'fixed'
    },
    {
      type: 'seed',
      name: 'seed',
      label: 'Random seed',
      value: 7,
      help: 'Only used by the random placement.'
    },
    {
      type: 'select',
      name: 'density',
      label: 'Density function',
      options: [
        { value: 'uniform', label: 'Uniform — every pixel weighs 1' },
        { value: 'left', label: 'Left-heavy — weight 1 + 3(1 − x)' }
      ],
      value: 'uniform',
      help: 'A non-uniform density makes CVT cells small where the density is high.'
    }
  ],

  compute(values) {
    const M = Number(values.resolution);
    const k = Math.min(Math.max(3, Math.round(values.generators)), 6);

    let gens;
    if (values.placement === 'random') {
      const rnd = seededRandom(values.seed);
      gens = Array.from({ length: k }, () => [rnd(), rnd()]);
    } else {
      gens = DEFAULT_GENERATORS.slice(0, k).map((g) => g.slice());
    }

    // pixel centres, using the course's index map
    const pixels = [];
    for (let I = 1; I <= M; I += 1) {
      for (let J = 1; J <= M; J += 1) {
        const X = (J - 1) / (M - 1);
        const Y = (M - I) / (M - 1);
        const w = values.density === 'left' ? 1 + 3 * (1 - X) : 1;
        pixels.push({ I, J, X, Y, w });
      }
    }

    const states = [];
    const ITER = 8;

    for (let it = 0; it <= ITER; it += 1) {
      const owner = new Array(pixels.length).fill(0);
      const sumW = new Array(k).fill(0);
      const sumX = new Array(k).fill(0);
      const sumY = new Array(k).fill(0);
      const count = new Array(k).fill(0);
      let energy = 0;

      pixels.forEach((px, idx) => {
        let best = 0;
        let bd = Infinity;
        for (let j = 0; j < k; j += 1) {
          const d = (px.X - gens[j][0]) ** 2 + (px.Y - gens[j][1]) ** 2;
          if (d < bd - 1e-15) { bd = d; best = j; }
        }
        owner[idx] = best;
        count[best] += 1;
        sumW[best] += px.w;
        sumX[best] += px.w * px.X;
        sumY[best] += px.w * px.Y;
        energy += px.w * bd;
      });

      const newGens = gens.map((g, j) => (
        sumW[j] === 0 ? g.slice() : [sumX[j] / sumW[j], sumY[j] / sumW[j]]
      ));
      const moved = Math.max(...gens.map((g, j) => dist(g, newGens[j])));

      states.push({
        iteration: it,
        gens: gens.map((g) => g.slice()),
        centres: newGens.map((g) => g.slice()),
        owner,
        count: count.slice(),
        mass: sumW.slice(),
        energy,
        moved
      });

      gens = newGens;
    }

    return { M, k, pixels, states, density: values.density };
  },

  steps: {
    count: (m) => m.states.length,
    label: (m, i) => {
      const s = m.states[i];
      if (i === 0) {
        return `Iteration 0: the ${m.k} generators are where you put them, so this is an ordinary ` +
               `Voronoi diagram. The largest cell holds ${Math.max(...s.count)} of ${m.pixels.length} pixels ` +
               `and the smallest holds ${Math.min(...s.count)}.`;
      }
      const prev = m.states[i - 1];
      return `Iteration ${s.iteration}: every generator moved to the centre of mass of its cell, the largest ` +
             `move being ${formatNumber(prev.moved, 4)}; the energy fell from ${formatNumber(prev.energy, 4)} ` +
             `to ${formatNumber(s.energy, 4)} and the largest-to-smallest cell ratio is now ` +
             `${formatNumber(Math.max(...s.count) / Math.max(1, Math.min(...s.count)), 2)} to 1.`;
    }
  },

  figure(model, ctx) {
    const s = model.states[ctx.step];
    const M = model.M;
    const size = 380;
    const pad = 30;
    const cell = size / M;
    const svg = svgEl('svg', { viewBox: `0 0 ${size + pad * 2} ${size + pad * 2 + 26}` });

    const gx = (x) => pad + x * size;
    const gy = (y) => pad + (1 - y) * size;

    model.pixels.forEach((px, idx) => {
      svg.appendChild(svgEl('rect', {
        x: pad + (px.J - 1) * cell,
        y: pad + (px.I - 1) * cell,
        width: cell + 0.5,
        height: cell + 0.5,
        fill: seriesColour(s.owner[idx]),
        'fill-opacity': 0.75,
        'shape-rendering': 'crispEdges'
      }));
    });

    svg.appendChild(svgEl('rect', {
      x: pad, y: pad, width: size, height: size, fill: 'none', stroke: INK, 'stroke-width': 1.5
    }));

    s.gens.forEach((g, j) => {
      const x = gx(g[0]);
      const y = gy(g[1]);
      svg.appendChild(svgEl('rect', { x: x - 12, y: y - 12, width: 24, height: 24, fill: SURFACE, 'fill-opacity': 0.9, rx: 3 }));
      svg.appendChild(marker(j, x, y, 6, seriesColour(j)));
      svg.appendChild(txt(x, y - 14, `z${j + 1}`, { 'text-anchor': 'middle', 'font-size': 13 }));
    });

    if (ctx.step < model.states.length - 1) {
      s.centres.forEach((c, j) => {
        svg.appendChild(svgEl('circle', {
          cx: gx(c[0]), cy: gy(c[1]), r: 6, fill: 'none', stroke: STRONG,
          'stroke-width': 2, 'stroke-dasharray': '3 2'
        }));
      });
    }

    svg.appendChild(txt(pad, size + pad * 2 + 14,
      `${M} by ${M} sampling. Filled markers labelled z1 to z${model.k} are the generators; ` +
      'dashed rings are the centres of mass they will move to next.',
      { 'font-size': 11 }));
    svg.appendChild(txt(pad, pad - 10, 'Unit square, x to the right, y upward', { 'font-size': 11 }));

    return svg;
  },

  figureAlt(model, ctx) {
    const s = model.states[ctx.step];
    const largest = Math.max(...s.count);
    const smallest = Math.min(...s.count);
    const ratio = formatNumber(largest / Math.max(1, smallest), 2);
    if (ctx.step === 0) {
      return `Ordinary Voronoi diagram at ${model.M} by ${model.M} sampling: the ${model.k} regions are visibly ` +
             `unequal, the largest holding ${largest} pixels and the smallest ${smallest}, a ratio of ${ratio} to 1, ` +
             `every dashed centre-of-mass ring sits away from its generator, and the energy is ` +
             `${formatNumber(s.energy, 4)}.`;
    }
    const prev = model.states[ctx.step - 1];
    return `After ${s.iteration} Lloyd iteration${s.iteration === 1 ? '' : 's'}: the largest cell now holds ` +
           `${largest} pixels and the smallest ${smallest}, a ratio of ${ratio} to 1 (it was ` +
           `${formatNumber(Math.max(...prev.count) / Math.max(1, Math.min(...prev.count)), 2)} to 1 a step ago), ` +
           `the energy is ${formatNumber(s.energy, 4)}, and the furthest a generator still sits from its own ` +
           `centre of mass is ${formatNumber(s.moved, 5)}.`;
  },

  table(model, ctx) {
    const s = model.states[ctx.step];
    const total = model.pixels.length;
    return {
      caption: `Generators and cell sizes at iteration ${s.iteration} of ${model.states.length - 1}, ` +
               `${model.M} by ${model.M} sampling (${total} pixels, ${model.density === 'left' ? 'left-heavy' : 'uniform'} density)`,
      rowHeader: true,
      columns: [
        { label: 'Generator' },
        { label: 'x', numeric: true },
        { label: 'y', numeric: true },
        { label: 'Pixels owned', numeric: true },
        { label: 'Share', unit: '%', numeric: true },
        { label: 'Centre of mass' },
        { label: 'Distance to it', numeric: true }
      ],
      rows: s.gens.map((g, j) => ({
        cells: [
          `z${j + 1} (${shapeWord(j)} marker)`,
          formatNumber(g[0], 4),
          formatNumber(g[1], 4),
          s.count[j],
          formatNumber((s.count[j] / total) * 100, 1),
          `(${formatNumber(s.centres[j][0], 4)}, ${formatNumber(s.centres[j][1], 4)})`,
          formatNumber(dist(g, s.centres[j]), 4)
        ],
        current: dist(g, s.centres[j]) === s.moved
      }))
    };
  },

  summary(model, ctx) {
    const s = model.states[ctx.step];
    const lines = [];
    const largest = Math.max(...s.count);
    const smallest = Math.min(...s.count);

    lines.push(
      `Energy ${formatNumber(s.energy, 4)}. Largest cell ${largest} pixels, smallest ${smallest}, ` +
      `a ratio of ${formatNumber(largest / Math.max(1, smallest), 2)} to 1.`
    );
    lines.push(
      `The largest distance from a generator to its own centre of mass is ${formatNumber(s.moved, 5)}. ` +
      'A centroidal Voronoi tessellation is exactly the case where that number is zero.'
    );
    if (ctx.step === 0) {
      lines.push(
        'At iteration 0 this is an ordinary Voronoi diagram: the generators are wherever they were placed ' +
        'and the dashed rings show how far off-centre each one is.'
      );
    }
    if (model.density === 'left') {
      lines.push(
        'With the left-heavy density, cells on the left carry more mass per pixel, so a converged ' +
        'tessellation gives them fewer pixels — equal mass, not equal area.'
      );
    }
    return lines;
  }
});

/* ==========================================================================
   5. Demo — the three impurity measures against p1  (5.6.8)
   ========================================================================== */

createDemo('#demo-impurity-curve-mount', {
  id: 'demo-impurity-curve',
  title: 'Impurity measures against the class share',
  description:
    'Gini, classification error and entropy for a two-class node, as the share of class 1 runs from 0 to 1. ' +
    'All three vanish at a pure node and peak at an even split.',
  headingLevel: 4,
  caption: 'Three curves over p1. Each is labelled directly on the plot and drawn with its own dash pattern.',

  controls: [
    {
      type: 'range',
      name: 'p1',
      label: 'Share of class 1 at the node, p₁',
      min: 0, max: 1, step: 0.01, value: 0.5,
      valueText: (v) => `${formatNumber(Number(v) * 100, 0)} per cent of records in class 1`,
      help: 'p₂ is whatever is left over, because the two shares must add to 1.'
    }
  ],

  compute(values) {
    const p1 = Math.min(1, Math.max(0, Number(values.p1)));
    const at = (p) => ({
      p,
      gini: impurity([p, 1 - p], 'gini'),
      error: impurity([p, 1 - p], 'error'),
      entropy: impurity([p, 1 - p], 'entropy')
    });

    const grid = [];
    for (let i = 0; i <= 100; i += 1) grid.push(at(i / 100));

    const rows = [];
    for (let i = 0; i <= 20; i += 1) rows.push(at(i / 20));
    const current = at(p1);
    if (!rows.some((r) => Math.abs(r.p - p1) < 1e-9)) {
      rows.push(current);
      rows.sort((a, b) => a.p - b.p);
    }

    return { p1, grid, rows, current };
  },

  figure(model) {
    const W = 520;
    const H = 320;
    const left = 60;
    const right = 430;
    const bottom = 250;
    const top = 30;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

    const sx = (p) => left + p * (right - left);
    const sy = (v) => bottom - (v / 1.1) * (bottom - top);

    svg.appendChild(svgEl('line', { x1: left, y1: bottom, x2: right + 10, y2: bottom, stroke: INK, 'stroke-width': 1.4 }));
    svg.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: bottom, stroke: INK, 'stroke-width': 1.4 }));

    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      svg.appendChild(svgEl('line', { x1: sx(p), y1: bottom, x2: sx(p), y2: bottom + 5, stroke: INK, 'stroke-width': 1.4 }));
      svg.appendChild(txt(sx(p), bottom + 20, formatNumber(p, 2), { 'text-anchor': 'middle' }));
    });
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      svg.appendChild(svgEl('line', { x1: left - 5, y1: sy(v), x2: left, y2: sy(v), stroke: INK, 'stroke-width': 1.4 }));
      svg.appendChild(txt(left - 9, sy(v) + 4, formatNumber(v, 2), { 'text-anchor': 'end' }));
    });
    svg.appendChild(txt((left + right) / 2, bottom + 40, 'p₁, the share of class 1', { 'text-anchor': 'middle' }));
    svg.appendChild(txt(18, 150, 'Impurity', { 'text-anchor': 'middle', transform: 'rotate(-90 18 150)' }));

    const series = [
      { key: 'entropy', label: 'entropy', dash: null, colour: seriesColour(0) },
      { key: 'gini', label: 'Gini', dash: '9 5', colour: seriesColour(1) },
      { key: 'error', label: 'class. error', dash: '2 4', colour: seriesColour(4) }
    ];

    series.forEach((s) => {
      const pts = model.grid.map((g) => `${sx(g.p)},${sy(g[s.key])}`).join(' ');
      svg.appendChild(svgEl('polyline', {
        points: pts, fill: 'none', stroke: s.colour, 'stroke-width': 3,
        'stroke-dasharray': s.dash
      }));
      // Direct label on the curve at p1 = 0.75, where the three are well separated,
      // so the series can be told apart without reading the colours.
      const anchor = model.grid[75];
      svg.appendChild(svgEl('circle', { cx: sx(anchor.p), cy: sy(anchor[s.key]), r: 3.5, fill: s.colour }));
      svg.appendChild(txt(sx(anchor.p) + 8, sy(anchor[s.key]) - 6, s.label, { 'font-size': 13 }));
    });

    // the marker at the current p1
    svg.appendChild(svgEl('line', {
      x1: sx(model.p1), y1: top, x2: sx(model.p1), y2: bottom,
      stroke: STRONG, 'stroke-width': 2, 'stroke-dasharray': '5 4'
    }));
    series.forEach((s, i) => {
      svg.appendChild(marker(i === 0 ? 0 : (i === 1 ? 1 : 4), sx(model.p1), sy(model.current[s.key]), 6, s.colour));
    });
    svg.appendChild(txt(sx(model.p1), top - 8, `p₁ = ${formatNumber(model.p1, 2)}`, {
      'text-anchor': model.p1 > 0.8 ? 'end' : 'middle', 'font-size': 13
    }));

    svg.appendChild(txt(left, H - 6,
      'Entropy is solid, Gini is long-dashed, classification error is dotted; each is also labelled at the right.',
      { 'font-size': 11 }));

    return svg;
  },

  figureAlt(model) {
    return `At p₁ = ${formatNumber(model.p1, 2)} the entropy is ${formatNumber(model.current.entropy, 4)}, ` +
           `the Gini index is ${formatNumber(model.current.gini, 4)} and the classification error is ` +
           `${formatNumber(model.current.error, 4)}; entropy is the tallest of the three everywhere between ` +
           '0 and 1 and is the only one that reaches 1.';
  },

  table(model) {
    return {
      caption: `The three impurity measures against p₁, sampled every 0.05, with the current value ` +
               `p₁ = ${formatNumber(model.p1, 2)} marked`,
      rowHeader: true,
      columns: [
        { label: 'p₁', numeric: true },
        { label: 'p₂', numeric: true },
        { label: 'Gini', numeric: true },
        { label: 'Classification error', numeric: true },
        { label: 'Entropy', numeric: true }
      ],
      rows: model.rows.map((r) => ({
        cells: [
          formatNumber(r.p, 2),
          formatNumber(1 - r.p, 2),
          formatNumber(r.gini, 4),
          formatNumber(r.error, 4),
          formatNumber(r.entropy, 4)
        ],
        current: Math.abs(r.p - model.p1) < 1e-9
      }))
    };
  },

  summary(model) {
    const c = model.current;
    const lines = [
      `With ${formatNumber(model.p1 * 100, 0)} per cent of the records in class 1: ` +
      `Gini ${formatNumber(c.gini, 4)}, classification error ${formatNumber(c.error, 4)}, ` +
      `entropy ${formatNumber(c.entropy, 4)}.`
    ];

    if (model.p1 === 0 || model.p1 === 1) {
      lines.push('The node is pure, so all three measures are exactly zero and Hunt’s algorithm would make it a leaf.');
    } else if (Math.abs(model.p1 - 0.5) < 1e-9) {
      lines.push('This is the least homogeneous a two-class node can be, so every measure is at its maximum: 0.5, 0.5 and 1.');
    } else {
      const bigger = model.p1 > 0.5 ? 1 : 2;
      lines.push(
        `Predicting the majority class (class ${bigger}) would be right ` +
        `${formatNumber(Math.max(model.p1, 1 - model.p1) * 100, 0)} per cent of the time — which is what ` +
        'the classification error measures, one minus that share.'
      );
    }
    return lines;
  }
});

/* ==========================================================================
   6. Demo — impurity and gain calculator  (5.6.7 to 5.6.10)
   ========================================================================== */

createDemo('#demo-impurity-gain-mount', {
  id: 'demo-impurity-gain',
  title: 'Impurity and gain calculator',
  description:
    'Compute the gain of every candidate split at the root of a real training set. Step through the ' +
    'attributes to see the child breakdown that produced each number.',
  headingLevel: 4,
  caption: 'Gain of each attribute. The bar for the attribute currently being stepped through is outlined and labelled "current".',

  controls: [
    {
      type: 'select',
      name: 'dataset',
      label: 'Training set',
      options: [
        { value: 'loan', label: 'Loan default — 10 records, 3 attributes' },
        { value: 'tennis', label: 'Play tennis — 14 records, 4 attributes' },
        { value: 'tumour', label: 'Tumour, final-exam Q2 — 6 records, 2 attributes' }
      ],
      value: 'tennis'
    },
    {
      type: 'select',
      name: 'measure',
      label: 'Impurity measure',
      options: [
        { value: 'entropy', label: 'Entropy — the gain is then called information gain' },
        { value: 'gini', label: 'Gini index' },
        { value: 'error', label: 'Classification error — used by final-exam Q2' }
      ],
      value: 'entropy'
    },
    {
      type: 'checkbox',
      name: 'binary',
      label: 'Force a two-way split on marital status (married versus not married)',
      value: false,
      help: 'A nominal attribute with three values can be split three ways or as a two-way grouping. ' +
            'Only marital status declares a grouping, so this has no effect on the other datasets.'
    }
  ],

  compute(values) {
    const ds = DATASETS[values.dataset] || TENNIS;
    const idx = ds.rows.map((_, i) => i);
    const results = ds.attributes.map((attr) => gainOf(ds, attr, idx, values.measure, values.binary));
    const best = results.reduce((b, r) => (r.gain > b.gain + 1e-12 ? r : b), results[0]);
    return {
      ds,
      measure: values.measure,
      binary: values.binary,
      parentCounts: classCounts(ds, idx),
      parentImpurity: impurity(classCounts(ds, idx), values.measure),
      results,
      best,
      maxGain: Math.max(...results.map((r) => r.gain), 1e-6)
    };
  },

  steps: {
    count: (m) => m.results.length,
    label: (m, i) => {
      const r = m.results[i];
      const isBest = r.attribute === m.best.attribute;
      return `Attribute ${i + 1} of ${m.results.length}, ${r.attribute}: it makes ${r.groups.length} ` +
             `child node${r.groups.length === 1 ? '' : 's'}, whose weighted ${MEASURE_NAME[m.measure]} is ` +
             `${formatNumber(r.weighted, 4)}, so the gain is ${formatNumber(r.gain, 4)}` +
             (isBest ? ' — the largest so far, so this is the attribute Hunt’s algorithm would pick.' : '.');
    }
  },

  figure(model, ctx) {
    const rows = model.results;
    const W = 520;
    const rowH = 44;
    const H = 60 + rows.length * rowH;
    const left = 150;
    const right = 430;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

    svg.appendChild(txt(left, 22, `Gain, using ${MEASURE_NAME[model.measure]}`, { 'font-size': 13 }));
    svg.appendChild(svgEl('line', { x1: left, y1: 30, x2: left, y2: H - 26, stroke: INK, 'stroke-width': 1.4 }));

    rows.forEach((r, i) => {
      const y = 44 + i * rowH;
      const w = Math.max(2, (r.gain / model.maxGain) * (right - left));
      const isCurrent = i === ctx.step;
      svg.appendChild(svgEl('rect', {
        x: left, y, width: w, height: 22,
        fill: seriesColour(i), 'fill-opacity': 0.75,
        stroke: isCurrent ? STRONG : 'none', 'stroke-width': isCurrent ? 3 : 0
      }));
      svg.appendChild(txt(left - 8, y + 16, r.attribute, { 'text-anchor': 'end', 'font-size': 13 }));
      svg.appendChild(txt(left + w + 8, y + 16, formatNumber(r.gain, 4), { 'font-size': 13 }));
      if (isCurrent) svg.appendChild(txt(left + 6, y - 4, 'current', { 'font-size': 11 }));
      if (r.attribute === model.best.attribute) {
        svg.appendChild(txt(left + w + 62, y + 16, 'best', { 'font-size': 12 }));
      }
    });

    svg.appendChild(txt(left, H - 8,
      `Parent ${MEASURE_NAME[model.measure]} = ${formatNumber(model.parentImpurity, 4)}; a longer bar is a better split.`,
      { 'font-size': 11 }));

    return svg;
  },

  figureAlt(model, ctx) {
    const r = model.results[ctx.step];
    const ranked = model.results.slice().sort((a, b) => b.gain - a.gain);
    const rank = ranked.findIndex((x) => x.attribute === r.attribute) + 1;
    return `Bar chart of ${model.results.length} attribute gains under ${MEASURE_NAME[model.measure]}; the outlined bar ` +
           `is ${r.attribute} at ${formatNumber(r.gain, 4)}, which ranks ${rank} of ${model.results.length}. ` +
           `The longest bar is ${model.best.attribute} at ${formatNumber(model.best.gain, 4)}.`;
  },

  table(model, ctx) {
    const r = model.results[ctx.step];
    const cls = model.ds.classes;
    const rows = r.groups.map((g) => ({
      cells: [
        String(g.value),
        g.n,
        `${g.counts[0]} / ${g.counts[1]}`,
        formatNumber(g.impurity, 4),
        formatNumber(g.weight, 4),
        formatNumber(g.contribution, 4),
        g.impurity === 0 ? 'pure — becomes a leaf' : 'mixed — would be split again'
      ],
      current: false
    }));

    rows.push({
      cells: [
        'Parent (all records)',
        model.ds.rows.length,
        `${model.parentCounts[0]} / ${model.parentCounts[1]}`,
        formatNumber(model.parentImpurity, 4),
        '1.0000',
        formatNumber(r.weighted, 4),
        `gain = ${formatNumber(model.parentImpurity, 4)} − ${formatNumber(r.weighted, 4)} = ${formatNumber(r.gain, 4)}`
      ],
      current: true
    });

    return {
      caption: `Splitting ${model.ds.name} on ${r.attribute}, measured with ${MEASURE_NAME[model.measure]}. ` +
               `Class counts are given as ${cls[0]} / ${cls[1]}`,
      rowHeader: true,
      columns: [
        { label: 'Child node' },
        { label: 'Records', numeric: true },
        { label: `${cls[0]} / ${cls[1]}` },
        { label: 'Impurity', numeric: true },
        { label: 'Weight Nⱼ/N', numeric: true },
        { label: 'Weighted contribution', numeric: true },
        { label: 'Status' }
      ],
      rows
    };
  },

  summary(model, ctx) {
    const r = model.results[ctx.step];
    const lines = [];

    lines.push(
      `Parent node: ${model.ds.rows.length} records, ${model.parentCounts[0]} ${model.ds.classes[0]} and ` +
      `${model.parentCounts[1]} ${model.ds.classes[1]}, so its ${MEASURE_NAME[model.measure]} is ` +
      `${formatNumber(model.parentImpurity, 4)}.`
    );

    lines.push(
      `Splitting on ${r.attribute} gives ${r.groups.length} children with weighted impurity ` +
      `${formatNumber(r.weighted, 4)}, so the gain is ${formatNumber(model.parentImpurity, 4)} − ` +
      `${formatNumber(r.weighted, 4)} = ${formatNumber(r.gain, 4)}.`
    );

    const pure = r.groups.filter((g) => g.impurity === 0 && g.n > 0);
    if (pure.length > 0) {
      lines.push(
        `${pure.length} of the ${r.groups.length} children ${pure.length === 1 ? 'is' : 'are'} already pure ` +
        `(${pure.map((g) => g.value).join(', ')}), so ${pure.length === 1 ? 'it becomes a leaf' : 'they become leaves'} immediately.`
      );
    }

    if (r.attribute === model.best.attribute) {
      lines.push(`This is the largest gain of the ${model.results.length} candidates, so it wins the root split.`);
    } else {
      lines.push(
        `${model.best.attribute} does better, at ${formatNumber(model.best.gain, 4)} — a difference of ` +
        `${formatNumber(model.best.gain - r.gain, 4)}.`
      );
    }

    if (model.measure === 'error' && model.ds.key === 'tumour') {
      lines.push(
        'This is final-exam Question 2 with its own impurity measure: parts (b) and (c) are the child ' +
        'impurities in the table, part (d) is the gain, and part (e) is whichever attribute has the larger one.'
      );
    }
    return lines;
  }
});

/* ==========================================================================
   7. Demo — Hunt's algorithm tree builder  (5.6.4 to 5.6.6, 5.6.11)
   ========================================================================== */

function majorityClass(ds, counts) {
  let best = 0;
  counts.forEach((c, i) => { if (c > counts[best]) best = i; });
  return ds.classes[best];
}

function buildHunt(ds, measure, binary, earlyStop) {
  const nodes = [];
  const root = {
    id: 0, depth: 0, parent: null, edge: '(root)',
    idx: ds.rows.map((_, i) => i), used: [], status: 'pending',
    attribute: null, gain: null, children: []
  };
  nodes.push(root);

  const states = [];
  const queue = [root];

  const snapshot = (note) => {
    states.push({
      note,
      nodes: nodes.map((n) => ({
        id: n.id, depth: n.depth, parent: n.parent, edge: n.edge,
        n: n.idx.length, counts: classCounts(ds, n.idx),
        impurity: impurity(classCounts(ds, n.idx), measure),
        status: n.status, attribute: n.attribute, gain: n.gain,
        children: n.children.slice(), label: n.label || null
      }))
    });
  };

  // decide the root's fate before the first snapshot so state 0 is a real tree
  snapshot(null);

  while (queue.length > 0) {
    const node = queue.shift();
    const counts = classCounts(ds, node.idx);
    const pure = counts.filter((c) => c > 0).length <= 1;
    const remaining = ds.attributes.filter((a) => node.used.indexOf(a.name) === -1);

    if (pure) {
      node.status = 'leaf';
      node.label = majorityClass(ds, counts);
      node.reason = 'all records share one class';
      snapshot({ nodeId: node.id, kind: 'pure' });
      continue;
    }
    if (remaining.length === 0) {
      node.status = 'leaf';
      node.label = majorityClass(ds, counts);
      node.reason = 'no attributes left, so the majority class is used';
      snapshot({ nodeId: node.id, kind: 'exhausted' });
      continue;
    }
    if (earlyStop && node.idx.length <= 2) {
      node.status = 'leaf';
      node.label = majorityClass(ds, counts);
      node.reason = 'early stopping: two records or fewer';
      snapshot({ nodeId: node.id, kind: 'early' });
      continue;
    }

    const scored = remaining.map((a) => gainOf(ds, a, node.idx, measure, binary));
    const best = scored.reduce((b, r) => (r.gain > b.gain + 1e-12 ? r : b), scored[0]);

    if (best.gain <= 1e-12) {
      node.status = 'leaf';
      node.label = majorityClass(ds, counts);
      node.reason = 'no split reduces the impurity, so the majority class is used';
      snapshot({ nodeId: node.id, kind: 'nogain' });
      continue;
    }

    node.status = 'internal';
    node.attribute = best.attribute;
    node.gain = best.gain;
    node.scored = scored;

    best.groups.filter((g) => g.n > 0).forEach((g) => {
      const child = {
        id: nodes.length, depth: node.depth + 1, parent: node.id, edge: String(g.value),
        idx: g.idx.slice(), used: node.used.concat([best.attribute]),
        status: 'pending', attribute: null, gain: null, children: []
      };
      nodes.push(child);
      node.children.push(child.id);
      queue.push(child);
    });

    snapshot({ nodeId: node.id, kind: 'split', attribute: best.attribute, gain: best.gain, scored });
  }

  return { nodes, states };
}

function layoutTree(snapshotNodes) {
  const byId = new Map(snapshotNodes.map((n) => [n.id, n]));
  const leaves = [];
  const order = [];
  (function walk(id) {
    const n = byId.get(id);
    order.push(n);
    if (!n || n.children.length === 0) { leaves.push(n); return; }
    n.children.forEach(walk);
  })(0);

  const slot = new Map();
  leaves.forEach((n, i) => { slot.set(n.id, i); });

  const xOf = new Map();
  const compute = (n) => {
    if (n.children.length === 0) { xOf.set(n.id, slot.get(n.id)); return slot.get(n.id); }
    const kids = n.children.map((cid) => compute(byId.get(cid)));
    const x = kids.reduce((s, v) => s + v, 0) / kids.length;
    xOf.set(n.id, x);
    return x;
  };
  compute(byId.get(0));

  return { byId, leafCount: Math.max(1, leaves.length), xOf };
}

createDemo('#demo-hunt-tree-mount', {
  id: 'demo-hunt-tree',
  title: "Hunt's algorithm tree builder",
  description:
    'Expand one node per step. At each node the algorithm scores every unused attribute, takes the one ' +
    'with the largest gain, and turns any pure child into a leaf.',
  headingLevel: 4,
  caption: 'The tree so far. Solid boxes are decision nodes, dashed boxes are leaves; the node expanded this step is outlined.',

  controls: [
    {
      type: 'select',
      name: 'dataset',
      label: 'Training set',
      options: [
        { value: 'loan', label: 'Loan default — 10 records' },
        { value: 'tennis', label: 'Play tennis — 14 records' },
        { value: 'tumour', label: 'Tumour, final-exam Q2 — 6 records' }
      ],
      value: 'loan'
    },
    {
      type: 'select',
      name: 'measure',
      label: 'Impurity measure',
      options: [
        { value: 'gini', label: 'Gini index' },
        { value: 'entropy', label: 'Entropy — information gain' },
        { value: 'error', label: 'Classification error' }
      ],
      value: 'gini'
    },
    {
      type: 'checkbox',
      name: 'binary',
      label: 'Force a two-way split on marital status (married versus not married)',
      value: true
    },
    {
      type: 'checkbox',
      name: 'earlyStop',
      label: 'Stop early: make any node with two or fewer records a leaf',
      value: false,
      help: 'Early termination trades training accuracy for a model that generalises better — topic 5.6.11.'
    }
  ],

  compute(values) {
    const ds = DATASETS[values.dataset] || LOAN;
    const built = buildHunt(ds, values.measure, values.binary, values.earlyStop);
    return { ds, measure: values.measure, states: built.states, finalNodes: built.nodes };
  },

  steps: {
    count: (m) => m.states.length,
    label: (m, i) => {
      const s = m.states[i];
      if (!s.note) {
        const c = s.nodes[0].counts;
        return `Step 0, the root: all ${s.nodes[0].n} records, ${c[0]} ${m.ds.classes[0]} and ${c[1]} ` +
               `${m.ds.classes[1]}, with ${MEASURE_NAME[m.measure]} ${formatNumber(s.nodes[0].impurity, 4)}. ` +
               'Nothing has been split yet.';
      }
      const node = s.nodes.find((n) => n.id === s.note.nodeId);
      const where = node.parent === null ? 'the root' : `the "${node.edge}" node`;
      if (s.note.kind === 'split') {
        return `Expanded ${where}: ${s.note.attribute} had the largest gain, ${formatNumber(s.note.gain, 4)}, ` +
               `so ${node.children.length} child node${node.children.length === 1 ? '' : 's'} were created.`;
      }
      if (s.note.kind === 'pure') {
        return `${where.charAt(0).toUpperCase()}${where.slice(1)} became a leaf: all ${node.n} of its records are ` +
               `${node.label}, so its impurity is already 0.`;
      }
      if (s.note.kind === 'early') {
        return `${where.charAt(0).toUpperCase()}${where.slice(1)} became a leaf by early stopping: only ${node.n} ` +
               `records, labelled ${node.label} by majority.`;
      }
      if (s.note.kind === 'exhausted') {
        return `${where.charAt(0).toUpperCase()}${where.slice(1)} became a leaf: every attribute has already been ` +
               `used on this path, so the majority class ${node.label} is assigned.`;
      }
      return `${where.charAt(0).toUpperCase()}${where.slice(1)} became a leaf: no remaining split reduces the ` +
             `impurity, so the majority class ${node.label} is assigned.`;
    }
  },

  figure(model, ctx) {
    const s = model.states[ctx.step];
    const layout = layoutTree(s.nodes);
    const colW = 168;
    const rowH = 96;
    const maxDepth = Math.max(...s.nodes.map((n) => n.depth));
    const W = Math.max(520, layout.leafCount * colW + 40);
    const H = 60 + (maxDepth + 1) * rowH;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

    const px = (n) => 30 + (layout.xOf.get(n.id) + 0.5) * ((W - 60) / layout.leafCount);
    const py = (n) => 40 + n.depth * rowH;

    // edges first, so boxes sit on top
    s.nodes.forEach((n) => {
      if (n.parent === null) return;
      const p = layout.byId.get(n.parent);
      svg.appendChild(svgEl('line', {
        x1: px(p), y1: py(p) + 26, x2: px(n), y2: py(n) - 26,
        stroke: INK, 'stroke-width': 1.6
      }));
      svg.appendChild(svgEl('rect', {
        x: px(n) - 42, y: (py(p) + py(n)) / 2 - 10, width: 84, height: 17, fill: SURFACE, 'fill-opacity': 0.92, rx: 2
      }));
      svg.appendChild(txt(px(n), (py(p) + py(n)) / 2 + 3, n.edge, { 'text-anchor': 'middle', 'font-size': 11 }));
    });

    s.nodes.forEach((n, i) => {
      const isCurrent = s.note && s.note.nodeId === n.id;
      const leaf = n.status === 'leaf';
      svg.appendChild(svgEl('rect', {
        x: px(n) - 66, y: py(n) - 26, width: 132, height: 52, rx: 5,
        fill: SURFACE,
        stroke: leaf ? seriesColour(4) : seriesColour(0),
        'stroke-width': isCurrent ? 4 : 2,
        'stroke-dasharray': leaf ? '6 4' : null
      }));
      const title = leaf ? n.label : (n.attribute || `${MEASURE_NAME[model.measure]} ${formatNumber(n.impurity, 3)}`);
      svg.appendChild(txt(px(n), py(n) - 6, title, { 'text-anchor': 'middle', 'font-size': 13 }));
      svg.appendChild(txt(px(n), py(n) + 10, `n=${n.n}  (${n.counts[0]}/${n.counts[1]})`, {
        'text-anchor': 'middle', 'font-size': 11
      }));
      svg.appendChild(txt(px(n), py(n) + 22, leaf ? 'leaf' : (n.status === 'pending' ? 'not yet expanded' : 'decision'), {
        'text-anchor': 'middle', 'font-size': 10
      }));
    });

    svg.appendChild(txt(20, H - 10,
      `Counts are shown as ${model.ds.classes[0]} / ${model.ds.classes[1]}. ` +
      'Solid box: decision node. Dashed box: leaf.',
      { 'font-size': 11 }));

    return svg;
  },

  figureAlt(model, ctx) {
    const s = model.states[ctx.step];
    const leaves = s.nodes.filter((n) => n.status === 'leaf').length;
    const pending = s.nodes.filter((n) => n.status === 'pending').length;
    if (!s.note) {
      return `The tree is a single unexpanded root box holding all ${s.nodes[0].n} records, split ` +
             `${s.nodes[0].counts[0]} to ${s.nodes[0].counts[1]} between the two classes.`;
    }
    const node = s.nodes.find((n) => n.id === s.note.nodeId);
    if (s.note.kind === 'split') {
      return `A new level appeared below ${node.parent === null ? 'the root' : `the "${node.edge}" node`}: ` +
             `it now tests ${s.note.attribute} and has ${node.children.length} children. The tree has ` +
             `${s.nodes.length} nodes, ${leaves} of them leaves and ${pending} still to expand.`;
    }
    return `The "${node.edge}" box turned into a dashed leaf labelled ${node.label}. The tree has ` +
           `${s.nodes.length} nodes, ${leaves} of them leaves and ${pending} still to expand.`;
  },

  table(model, ctx) {
    const s = model.states[ctx.step];
    const cls = model.ds.classes;
    return {
      caption: `Every node of the tree after step ${ctx.step} of ${model.states.length - 1}, building on ` +
               `${model.ds.name} with ${MEASURE_NAME[model.measure]}`,
      rowHeader: true,
      columns: [
        { label: 'Node' },
        { label: 'Depth', numeric: true },
        { label: 'Reached by' },
        { label: 'Records', numeric: true },
        { label: `${cls[0]} / ${cls[1]}` },
        { label: 'Impurity', numeric: true },
        { label: 'Status' },
        { label: 'Split on / label' }
      ],
      rows: s.nodes.map((n) => ({
        cells: [
          `Node ${n.id}`,
          n.depth,
          n.parent === null ? 'root' : `node ${n.parent}, branch "${n.edge}"`,
          n.n,
          `${n.counts[0]} / ${n.counts[1]}`,
          formatNumber(n.impurity, 4),
          n.status === 'leaf' ? 'leaf' : (n.status === 'internal' ? 'decision node' : 'not yet expanded'),
          n.status === 'leaf' ? `predicts ${n.label}` : (n.attribute ? `${n.attribute} (gain ${formatNumber(n.gain, 4)})` : '—')
        ],
        current: Boolean(s.note && s.note.nodeId === n.id)
      }))
    };
  },

  summary(model, ctx) {
    const s = model.states[ctx.step];
    const lines = [];
    const leaves = s.nodes.filter((n) => n.status === 'leaf');
    const pending = s.nodes.filter((n) => n.status === 'pending');

    const internal = s.nodes.filter((n) => n.status === 'internal').length;
    lines.push(
      `${s.nodes.length} node${s.nodes.length === 1 ? '' : 's'} so far: ` +
      `${leaves.length} ${leaves.length === 1 ? 'leaf' : 'leaves'}, ` +
      `${internal} decision node${internal === 1 ? '' : 's'}, and ` +
      `${pending.length} still waiting to be expanded.`
    );

    if (s.note && s.note.kind === 'split' && s.note.scored) {
      const ranked = s.note.scored.slice().sort((a, b) => b.gain - a.gain);
      lines.push(
        'Gains considered at this node: ' +
        ranked.map((r) => `${r.attribute} ${formatNumber(r.gain, 4)}`).join(', ') +
        `. The greedy choice takes the first and never revisits it.`
      );
    }

    if (pending.length === 0) {
      const depth = Math.max(...s.nodes.map((n) => n.depth));
      lines.push(
        `The tree is finished: depth ${depth}, ${leaves.length} leaves, and every training record ends at ` +
        `exactly one of them. Rules: ${leaves.map((n) => describeRule(s, n)).join('; ')}.`
      );
    }
    return lines;
  }
});

function describeRule(state, leaf) {
  const byId = new Map(state.nodes.map((n) => [n.id, n]));
  const parts = [];
  let n = leaf;
  while (n && n.parent !== null) {
    const p = byId.get(n.parent);
    parts.unshift(`${p.attribute} = ${n.edge}`);
    n = p;
  }
  return `${parts.length ? parts.join(' and ') : 'no conditions'} → ${leaf.label}`;
}

})(window);
