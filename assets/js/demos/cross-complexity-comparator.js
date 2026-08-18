/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   cross-complexity-comparator.js
   Demos for cross-cutting/complexity-comparator.html
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access. Every colour and every size comes from a token; nothing
   here contains a hex value.

   Two demos:
     demo-complexity-comparator  nine algorithms from M1, M3 and M5, plotted
                                 on log-log axes with a full data table
     demo-growth-crossover         the M1 "50n + 21 versus n² + 10n + 5"
                                 comparison, stepped through by n

   Sources for every count are named in the reference table on the page. Four
   are derived on an M1/M3/M5 slide; the rest follow from the pseudocode of
   the named topic.
   ========================================================================== */

const { createDemo, svgEl, formatNumber } = window.Demo;
/* ==========================================================================
   0. Number and time formatting
   ========================================================================== */

/** n! as a float. Returns Infinity above about n = 170, which is honest. */
function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

/**
 * Format an operation count for a table cell.
 * Small counts stay as integers with thousands separators; large ones become
 * "4.11 x 10^33" rather than an unreadable 34-digit string.
 */
function formatCount(value) {
  if (!Number.isFinite(value)) return 'too large to represent';
  if (value < 1e6) return Math.round(value).toLocaleString('en-US');
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);
  return `${formatNumber(mantissa, 2)} × 10^${exponent}`;
}

/** The same number, spelled out for the live region. */
function speakCount(value) {
  if (!Number.isFinite(value)) return 'a number too large to represent';
  if (value < 1e6) return `${Math.round(value).toLocaleString('en-US')} operations`;
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);
  return `about ${formatNumber(mantissa, 2)} times ten to the power ${exponent} operations`;
}

const TIME_UNITS = [
  { limit: 60, divisor: 1, one: 'second', many: 'seconds' },
  { limit: 3600, divisor: 60, one: 'minute', many: 'minutes' },
  { limit: 86400, divisor: 3600, one: 'hour', many: 'hours' },
  { limit: 604800, divisor: 86400, one: 'day', many: 'days' },
  { limit: 2628000, divisor: 604800, one: 'week', many: 'weeks' },
  { limit: 31536000, divisor: 2628000, one: 'month', many: 'months' }
];

/** Seconds to the largest sensible unit. Mirrors the M1 scaling figure. */
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return 'longer than any unit can express';
  if (seconds < 1) return `${formatNumber(seconds * 1000, 3)} milliseconds`;
  for (const unit of TIME_UNITS) {
    if (seconds < unit.limit) {
      const v = seconds / unit.divisor;
      return `${formatNumber(v, v < 10 ? 1 : 0)} ${v === 1 ? unit.one : unit.many}`;
    }
  }
  const years = seconds / 31536000;
  if (years < 1e6) return `${formatNumber(years, years < 10 ? 1 : 0)} years`;
  return `${formatCount(years)} years`;
}

/* ==========================================================================
   1. The nine algorithms
   ========================================================================== */

const ALGORITHMS = [
  {
    key: 'binary',
    name: 'Binary search, worst case',
    short: 'Binary search',
    module: 'M1',
    topic: '1.2.2',
    operation: 'comparisons',
    formula: 'floor(log2 n) + 1',
    growth: 'O(log n)',
    meaning: 'n is the length of the sorted list',
    count: (n) => Math.floor(Math.log2(Math.max(1, n))) + 1
  },
  {
    key: 'sequential',
    name: 'Sequential search, worst case',
    short: 'Sequential search',
    module: 'M1',
    topic: '1.1.4',
    operation: 'comparisons',
    formula: 'n',
    growth: 'O(n)',
    meaning: 'n is the length of the list',
    count: (n) => n
  },
  {
    key: 'selection',
    name: 'Selection sort',
    short: 'Selection sort',
    module: 'M1',
    topic: '1.1.2',
    operation: 'comparisons',
    formula: 'n^2 / 2 - n / 2',
    growth: 'O(n^2)',
    meaning: 'n is the length of the list',
    count: (n) => (n * n) / 2 - n / 2
  },
  {
    key: 'bubble',
    name: 'Bubble sort, worst case',
    short: 'Bubble sort',
    module: 'M1',
    topic: '1.1.3',
    operation: 'comparisons',
    formula: 'n(n - 1) / 2',
    growth: 'O(n^2)',
    meaning: 'n is the length of the list',
    count: (n) => (n * (n - 1)) / 2
  },
  {
    key: 'agglomerative',
    name: 'Agglomerative clustering, first distance matrix',
    short: 'Agglomerative',
    module: 'M5',
    topic: '5.3.1',
    operation: 'pairwise distances',
    formula: 'n(n - 1) / 2',
    growth: 'O(n^2)',
    meaning: 'n is the number of records',
    count: (n) => (n * (n - 1)) / 2
  },
  {
    key: 'dijkstra',
    name: "Dijkstra, scanning for the minimum",
    short: 'Dijkstra',
    module: 'M3',
    topic: '3.5.5',
    operation: 'distance comparisons',
    formula: 'n^2',
    growth: 'O(n^2)',
    meaning: 'n is the number of nodes',
    count: (n) => n * n
  },
  {
    key: 'lloyd',
    name: "Lloyd's method (k-means)",
    short: "Lloyd's method",
    module: 'M5',
    topic: '5.4.7',
    operation: 'distance evaluations',
    formula: 'k x n x iterations',
    growth: 'O(k n i)',
    meaning: 'n is the number of records',
    count: (n, values) => values.clusters * n * values.iterations
  },
  {
    key: 'kruskal',
    name: 'Kruskal on a complete graph',
    short: 'Kruskal',
    module: 'M3',
    topic: '3.6.4',
    operation: 'edge comparisons and cycle checks',
    formula: 'm ceil(log2 m) + m, with m = n(n - 1) / 2',
    growth: 'O(m log m)',
    meaning: 'n is the number of nodes, m the number of edges',
    count: (n) => {
      const m = (n * (n - 1)) / 2;
      if (m < 2) return m;
      return m * Math.ceil(Math.log2(m)) + m;
    }
  },
  {
    key: 'tsp',
    name: 'Travelling salesman, brute force',
    short: 'TSP brute force',
    module: 'M3',
    topic: '3.6.12',
    operation: 'tours evaluated',
    formula: '(n - 1)! / 2',
    growth: 'O(n!)',
    meaning: 'n is the number of cities',
    count: (n) => (n < 3 ? 1 : factorial(n - 1) / 2)
  }
];

/* Six series tokens, cycled. Colour is never the only encoding: every series
   also carries a dash pattern, an end marker shape, and a direct text label. */
const SERIES_TOKEN = [
  'var(--fsu-series-1)', 'var(--fsu-series-2)', 'var(--fsu-series-3)',
  'var(--fsu-series-4)', 'var(--fsu-series-5)', 'var(--fsu-series-6)'
];

const DASH = [
  'none', '7 4', '2 3', '11 4 2 4', '1 5', '9 3 2 3 2 3', '15 5', '4 4 1 4', '3 3 9 3'
];

const MARKER = ['circle', 'square', 'triangle', 'diamond', 'plus', 'circle', 'square', 'triangle', 'diamond'];

function markerNode(shape, x, y, style) {
  const r = 5;
  switch (shape) {
    case 'square':
      return svgEl('rect', { x: x - r, y: y - r, width: r * 2, height: r * 2, style });
    case 'triangle':
      return svgEl('polygon', { points: `${x},${y - r - 1} ${x + r},${y + r} ${x - r},${y + r}`, style });
    case 'diamond':
      return svgEl('polygon', { points: `${x},${y - r - 1} ${x + r},${y} ${x},${y + r + 1} ${x - r},${y}`, style });
    case 'plus':
      return svgEl('path', {
        d: `M ${x - r} ${y} L ${x + r} ${y} M ${x} ${y - r} L ${x} ${y + r}`,
        style: `${style};stroke-width:3`
      });
    default:
      return svgEl('circle', { cx: x, cy: y, r, style });
  }
}

const MARKER_WORD = {
  circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond', plus: 'cross'
};

/* ==========================================================================
   2. Demo 1 — the comparator
   ========================================================================== */

const CHECKBOX_CONTROLS = ALGORITHMS.map((algorithm) => ({
  type: 'checkbox',
  name: `show_${algorithm.key}`,
  label: `${algorithm.name} — ${algorithm.module}`,
  // Every algorithm starts ticked except brute-force TSP: its curve is 30
  // orders of magnitude above the rest, so leaving it on by default would
  // squash the other eight into the bottom of the plot on first sight.
  value: algorithm.key !== 'tsp',
  help: algorithm.key === 'tsp'
    ? 'Tick this to see how far above everything else it sits — the vertical axis has to stretch by about 30 decades to fit it.'
    : undefined
}));

createDemo('#demo-complexity-comparator-mount', {
  id: 'demo-complexity-comparator',
  title: 'Complexity comparator',
  description:
    'Tick the algorithms you want, set the problem size, and read the cost. The chart uses ' +
    'logarithmic axes so curves many orders of magnitude apart still fit; the table gives the ' +
    'exact numbers at the problem size you chose.',
  headingLevel: 4,

  controls: [
    {
      type: 'range',
      name: 'n',
      label: 'Problem size n',
      min: 2,
      max: 60,
      step: 1,
      value: 32,
      valueText: (v) => `${v} items, nodes or records`,
      help: 'What n counts differs by module: list entries in M1, nodes in M3, records in M5.'
    },
    {
      type: 'number',
      name: 'clusters',
      label: 'Clusters k, for Lloyd’s method only',
      min: 2,
      max: 20,
      step: 1,
      value: 4
    },
    {
      type: 'number',
      name: 'iterations',
      label: 'Iterations, for Lloyd’s method only',
      min: 1,
      max: 100,
      step: 1,
      value: 10
    },
    {
      type: 'select',
      name: 'perOp',
      label: 'Time for one operation',
      value: '1',
      options: [
        { value: '1', label: 'One second (as in the M1 scaling figure)' },
        { value: '0.000001', label: 'One microsecond' },
        { value: '0.000000001', label: 'One nanosecond' }
      ],
      help: 'The M1 scaling figure assumes one second per operation, which is why its curves reach years.'
    },
    ...CHECKBOX_CONTROLS
  ],

  compute(values) {
    const n = Math.max(2, Math.round(values.n));
    const perOp = Number(values.perOp);

    const selected = ALGORITHMS
      .map((algorithm, index) => ({ algorithm, index }))
      .filter(({ algorithm }) => Boolean(values[`show_${algorithm.key}`]));

    const rows = selected.map(({ algorithm, index }) => {
      const operations = algorithm.count(n, { clusters: values.clusters, iterations: values.iterations });
      return {
        key: algorithm.key,
        name: algorithm.name,
        short: algorithm.short,
        module: algorithm.module,
        topic: algorithm.topic,
        operation: algorithm.operation,
        formula: algorithm.formula,
        growth: algorithm.growth,
        meaning: algorithm.meaning,
        operations,
        seconds: operations * perOp,
        style: `stroke:${SERIES_TOKEN[index % SERIES_TOKEN.length]};fill:${SERIES_TOKEN[index % SERIES_TOKEN.length]}`,
        dash: DASH[index % DASH.length],
        marker: MARKER[index % MARKER.length],
        // The curve, sampled at every integer problem size up to n.
        curve: (() => {
          const points = [];
          for (let i = 2; i <= n; i += 1) {
            points.push([i, Math.max(1, algorithm.count(i, {
              clusters: values.clusters, iterations: values.iterations
            }))]);
          }
          return points;
        })()
      };
    });

    rows.sort((a, b) => a.operations - b.operations);

    return {
      n,
      perOp,
      clusters: values.clusters,
      iterations: values.iterations,
      rows,
      cheapest: rows[0] || null,
      dearest: rows[rows.length - 1] || null,
      moduleCounts: rows.reduce((acc, row) => {
        acc[row.module] = (acc[row.module] || 0) + 1;
        return acc;
      }, {})
    };
  },

  figure(model) {
    const W = 680;
    const H = 420;
    const left = 66;
    const right = 152;
    const top = 18;
    const bottom = 52;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      width: '100%',
      style: 'max-inline-size:100%;block-size:auto'
    });

    const axisStyle = 'stroke:var(--fsu-chart-axis);fill:none;stroke-width:2';
    const gridStyle = 'stroke:var(--fsu-chart-gridline);fill:none;stroke-width:1';
    const textStyle = 'fill:var(--fsu-color-caption);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
    const labelStyle = 'fill:var(--fsu-color-body);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';

    if (model.rows.length === 0) {
      svg.appendChild(svgEl('text', {
        x: W / 2, y: H / 2, 'text-anchor': 'middle', style: labelStyle,
        text: 'No algorithm is selected. Tick at least one above.'
      }));
      return svg;
    }

    const maxLog = Math.max(1, Math.ceil(Math.log10(
      model.rows.reduce((best, row) => Math.max(best, row.operations), 1)
    )));
    const minLogN = Math.log10(2);
    const maxLogN = Math.log10(model.n);
    const spanN = Math.max(0.0001, maxLogN - minLogN);

    const px = (n) => left + ((Math.log10(n) - minLogN) / spanN) * (W - left - right);
    const py = (count) => (H - bottom) - (Math.log10(Math.max(1, count)) / maxLog) * (H - bottom - top);

    /* --- gridlines and y ticks (decades) ---
       With brute-force TSP selected the axis can span thirty-odd decades, so
       label every kth decade rather than every one; unlabelled gridlines
       would just be noise. */
    const decadeStride = Math.max(1, Math.ceil(maxLog / 8));
    for (let decade = 0; decade <= maxLog; decade += decadeStride) {
      const y = py(Math.pow(10, decade));
      svg.appendChild(svgEl('line', { x1: left, y1: y, x2: W - right, y2: y, style: gridStyle }));
      svg.appendChild(svgEl('text', {
        x: left - 8, y: y + 4, 'text-anchor': 'end', style: textStyle,
        text: decade === 0 ? '1' : `10^${decade}`
      }));
    }

    /* --- x ticks at powers of two --- */
    for (let power = 1; Math.pow(2, power) <= model.n; power += 1) {
      const value = Math.pow(2, power);
      const x = px(value);
      svg.appendChild(svgEl('line', { x1: x, y1: top, x2: x, y2: H - bottom, style: gridStyle }));
      svg.appendChild(svgEl('text', {
        x, y: H - bottom + 20, 'text-anchor': 'middle', style: textStyle, text: String(value)
      }));
    }

    svg.appendChild(svgEl('line', { x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, style: axisStyle }));
    svg.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: H - bottom, style: axisStyle }));

    svg.appendChild(svgEl('text', {
      x: left + (W - left - right) / 2, y: H - 12, 'text-anchor': 'middle', style: textStyle,
      text: 'Problem size n (logarithmic)'
    }));
    svg.appendChild(svgEl('text', {
      x: 14, y: top + (H - bottom - top) / 2, 'text-anchor': 'middle', style: textStyle,
      transform: `rotate(-90 14 ${top + (H - bottom - top) / 2})`,
      text: 'Operations (logarithmic)'
    }));

    /* --- one polyline per selected algorithm, plus an end marker and a
           direct text label. Colour, dash, shape and words all agree. --- */
    const endpoints = [];

    model.rows.forEach((row) => {
      const points = row.curve.map(([n, count]) => `${formatNumber(px(n), 1)},${formatNumber(py(count), 1)}`).join(' ');
      svg.appendChild(svgEl('polyline', {
        points,
        style: `${row.style};fill:none;stroke-width:2.5`,
        'stroke-dasharray': row.dash === 'none' ? null : row.dash
      }));

      const endX = px(model.n);
      const endY = py(row.operations);
      svg.appendChild(markerNode(row.marker, endX, endY, `${row.style};stroke-width:1.5`));
      endpoints.push({ row, x: endX, y: endY });
    });

    /* Push overlapping labels apart so every series keeps a readable name,
       then pull the whole stack back inside the plot if it has run off the
       bottom. A clipped label is the same defect as no label. */
    endpoints.sort((a, b) => a.y - b.y);
    const gap = 16;
    let lastY = -Infinity;
    endpoints.forEach((point) => {
      point.labelY = Math.max(point.y, lastY + gap);
      lastY = point.labelY;
    });
    const overflow = lastY - (H - bottom);
    if (overflow > 0) {
      const shift = Math.min(overflow, endpoints[0].labelY - (top + 8));
      endpoints.forEach((point) => { point.labelY -= shift; });
    }
    endpoints.forEach((point) => {
      svg.appendChild(svgEl('text', {
        x: point.x + 10, y: point.labelY + 4, style: labelStyle, text: shortLabel(point.row)
      }));
    });

    return svg;
  },

  figureAlt(model) {
    if (model.rows.length === 0) {
      return 'The chart is empty because no algorithm is selected.';
    }
    const cheap = model.cheapest;
    const dear = model.dearest;
    const orders = Math.round(Math.log10(Math.max(1, dear.operations)) - Math.log10(Math.max(1, cheap.operations)));
    return `Log-log plot of operations against problem size, from n equals 2 to n equals ${model.n}, ` +
      `for ${model.rows.length} algorithm${model.rows.length === 1 ? '' : 's'}. ` +
      `At n equals ${model.n} the cheapest curve is ${cheap.name} at ${speakCount(cheap.operations)} and the ` +
      `highest is ${dear.name} at ${speakCount(dear.operations)} — a spread of about ${orders} orders of magnitude. ` +
      'Every curve carries a dash pattern, an end marker and a printed name, so no series is told apart by colour alone.';
  },

  table(model) {
    return {
      caption: `Operation counts at n = ${model.n}, k = ${model.clusters}, ` +
        `${model.iterations} iterations, ordered from cheapest to dearest`,
      rowHeader: true,
      columns: [
        { label: 'Algorithm' },
        { label: 'Module and topic' },
        { label: 'Counted operation' },
        { label: 'Exact count' },
        { label: `Operations at n = ${model.n}`, numeric: true },
        { label: 'Class' },
        { label: 'Elapsed time' },
        { label: 'Line style in the chart' }
      ],
      rows: model.rows.map((row) => ({
        cells: [
          row.name,
          `${row.module} ${row.topic}`,
          row.operation,
          row.formula,
          formatCount(row.operations),
          row.growth,
          formatTime(row.seconds),
          `${row.dash === 'none' ? 'solid' : 'dashed'} line, ${MARKER_WORD[row.marker]} marker`
        ]
      }))
    };
  },

  summary(model) {
    if (model.rows.length === 0) {
      return ['No algorithm is selected, so there is nothing to compare. Tick at least one of the nine boxes above.'];
    }

    const cheap = model.cheapest;
    const dear = model.dearest;
    const modules = Object.keys(model.moduleCounts).sort()
      .map((m) => `${model.moduleCounts[m]} from ${m}`)
      .join(', ');

    const lines = [
      `${model.rows.length} of ${ALGORITHMS.length} algorithms selected: ${modules}.`,
      `At problem size ${model.n}, the cheapest is ${cheap.name} at ${speakCount(cheap.operations)}; ` +
      `the most expensive is ${dear.name} at ${speakCount(dear.operations)}.`,
      `At the chosen rate, that is ${formatTime(cheap.seconds)} against ${formatTime(dear.seconds)}.`
    ];

    if (cheap.operations > 0 && Number.isFinite(dear.operations)) {
      const ratio = dear.operations / cheap.operations;
      lines.push(`The dearest costs ${formatCount(ratio)} times as many operations as the cheapest.`);
    }

    return lines;
  }
});

function shortLabel(row) {
  return row.short || row.name;
}

/* ==========================================================================
   3. Demo 2 — the crossover
   ========================================================================== */

createDemo('#demo-growth-crossover-mount', {
  id: 'demo-growth-crossover',
  title: 'Crossover explorer',
  description:
    'Algorithm A costs a constant times n, plus 21. Algorithm B costs n squared plus 10n plus 5. ' +
    'Step through the problem sizes and watch the cheaper of the two change hands, once, and stay changed.',
  headingLevel: 4,

  controls: [
    {
      type: 'range',
      name: 'slope',
      label: 'Linear cost constant in algorithm A',
      min: 10,
      max: 200,
      step: 5,
      value: 50,
      valueText: (v) => `${v}, so algorithm A costs ${v} n plus 21`,
      help: 'The M1 slide uses 50. Raising it moves the crossover to the right; it never removes it.'
    }
  ],

  compute(values) {
    const slope = Math.max(1, Math.round(values.slope));

    const costA = (n) => slope * n + 21;
    const costB = (n) => n * n + 10 * n + 5;

    // n^2 + 10n + 5 = slope*n + 21  ->  n^2 + (10 - slope)n - 16 = 0
    const b = 10 - slope;
    const crossing = (-b + Math.sqrt(b * b + 64)) / 2;

    const below = Math.max(2, Math.floor(crossing));
    const above = below + 1;

    const sizes = Array.from(new Set([2, 5, 10, 20, below, above, above * 2, 100, 200]))
      .filter((n) => n >= 2 && n <= 200)
      .sort((a, c) => a - c);

    const rows = sizes.map((n) => {
      const a = costA(n);
      const bb = costB(n);
      return {
        n,
        a,
        b: bb,
        cheaper: a === bb ? 'tied' : (a < bb ? 'A' : 'B'),
        gap: Math.abs(a - bb)
      };
    });

    return { slope, crossing, rows, costA, costB, maxN: 200 };
  },

  steps: {
    count: (model) => model.rows.length,
    label: (model, i) => {
      const row = model.rows[i];
      const previous = i > 0 ? model.rows[i - 1] : null;
      const swapped = previous && previous.cheaper !== row.cheaper;
      const base = `At n = ${row.n}, algorithm A costs ${row.a.toLocaleString('en-US')} operations and ` +
        `algorithm B costs ${row.b.toLocaleString('en-US')}.`;
      if (row.cheaper === 'tied') return `${base} They are exactly level here.`;
      if (swapped) {
        return `${base} Algorithm ${row.cheaper} is now the cheaper of the two, by ` +
          `${row.gap.toLocaleString('en-US')} operations — the lead changed hands since the previous size.`;
      }
      return `${base} Algorithm ${row.cheaper} is cheaper by ${row.gap.toLocaleString('en-US')} operations.`;
    }
  },

  figure(model, ctx) {
    const W = 640;
    const H = 380;
    const left = 74;
    const right = 96;
    const top = 18;
    const bottom = 52;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`, width: '100%',
      style: 'max-inline-size:100%;block-size:auto'
    });

    const axisStyle = 'stroke:var(--fsu-chart-axis);fill:none;stroke-width:2';
    const gridStyle = 'stroke:var(--fsu-chart-gridline);fill:none;stroke-width:1';
    const textStyle = 'fill:var(--fsu-color-caption);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
    const labelStyle = 'fill:var(--fsu-color-body);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';

    const maxCost = Math.max(model.costA(model.maxN), model.costB(model.maxN));
    const px = (n) => left + (n / model.maxN) * (W - left - right);
    const py = (c) => (H - bottom) - (c / maxCost) * (H - bottom - top);

    for (let i = 0; i <= 4; i += 1) {
      const value = (maxCost / 4) * i;
      const y = py(value);
      svg.appendChild(svgEl('line', { x1: left, y1: y, x2: W - right, y2: y, style: gridStyle }));
      svg.appendChild(svgEl('text', {
        x: left - 8, y: y + 4, 'text-anchor': 'end', style: textStyle,
        text: formatCount(value)
      }));
    }

    [0, 50, 100, 150, 200].forEach((n) => {
      const x = px(n);
      svg.appendChild(svgEl('text', { x, y: H - bottom + 20, 'text-anchor': 'middle', style: textStyle, text: String(n) }));
    });

    svg.appendChild(svgEl('line', { x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, style: axisStyle }));
    svg.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: H - bottom, style: axisStyle }));

    svg.appendChild(svgEl('text', {
      x: left + (W - left - right) / 2, y: H - 12, 'text-anchor': 'middle', style: textStyle,
      text: 'Problem size n'
    }));

    const line = (fn, style, dash) => {
      const points = [];
      for (let n = 0; n <= model.maxN; n += 2) points.push(`${formatNumber(px(n), 1)},${formatNumber(py(fn(n)), 1)}`);
      return svgEl('polyline', {
        points: points.join(' '),
        style: `${style};fill:none;stroke-width:2.5`,
        'stroke-dasharray': dash
      });
    };

    svg.appendChild(line(model.costA, 'stroke:var(--fsu-series-1)', null));
    svg.appendChild(line(model.costB, 'stroke:var(--fsu-series-3)', '7 4'));

    /* crossover marker: a ring plus a printed label, never colour alone */
    const cx = px(model.crossing);
    const cy = py(model.costA(model.crossing));
    svg.appendChild(svgEl('circle', {
      cx, cy, r: 8, style: 'stroke:var(--fsu-color-strong);fill:none;stroke-width:2.5'
    }));
    // Below and right of the crossing is the only empty quadrant of this plot,
    // so the label goes there rather than across the lines it describes.
    svg.appendChild(svgEl('text', {
      x: cx + 12, y: cy + 26, style: labelStyle, text: `crossover n = ${formatNumber(model.crossing, 1)}`
    }));

    /* the step marker */
    const row = model.rows[ctx.step];
    const stepX = px(row.n);
    svg.appendChild(svgEl('line', {
      x1: stepX, y1: top, x2: stepX, y2: H - bottom,
      style: 'stroke:var(--fsu-color-strong);stroke-width:2', 'stroke-dasharray': '3 3'
    }));
    svg.appendChild(svgEl('text', {
      x: stepX + 6, y: top + 14, style: labelStyle, text: `n = ${row.n}`
    }));

    svg.appendChild(svgEl('text', {
      x: W - right + 6, y: py(model.costA(model.maxN)) + 4, style: labelStyle, text: 'A, solid'
    }));
    svg.appendChild(svgEl('text', {
      x: W - right + 6, y: py(model.costB(model.maxN)) + 4, style: labelStyle, text: 'B, dashed'
    }));

    return svg;
  },

  figureAlt(model, ctx) {
    const row = model.rows[ctx.step];
    return `Cost against problem size for two algorithms up to n = 200. The solid line, algorithm A, ` +
      `rises in a straight line; the dashed line, algorithm B, curves upward and passes it at ` +
      `n = ${formatNumber(model.crossing, 1)}, marked with a ring. The step marker sits at n = ${row.n}, ` +
      `where A costs ${row.a.toLocaleString('en-US')} and B costs ${row.b.toLocaleString('en-US')}, ` +
      `so ${row.cheaper === 'tied' ? 'neither is cheaper' : `algorithm ${row.cheaper} is cheaper`}.`;
  },

  table(model, ctx) {
    return {
      caption: `Cost of both algorithms at nine problem sizes, with A = ${model.slope}n + 21 ` +
        `and B = n squared + 10n + 5. Step ${ctx.step + 1} of ${ctx.stepCount} is marked.`,
      rowHeader: true,
      columns: [
        { label: 'n', numeric: true },
        { label: `A: ${model.slope}n + 21`, numeric: true },
        { label: 'B: n² + 10n + 5', numeric: true },
        { label: 'Cheaper' },
        { label: 'Gap', numeric: true }
      ],
      rows: model.rows.map((row, i) => ({
        cells: [
          row.n,
          row.a.toLocaleString('en-US'),
          row.b.toLocaleString('en-US'),
          row.cheaper === 'tied' ? 'level' : `algorithm ${row.cheaper}`,
          row.gap.toLocaleString('en-US')
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const row = model.rows[ctx.step];
    return [
      `With the linear constant set to ${model.slope}, the two costs are equal at ` +
      `n = ${formatNumber(model.crossing, 2)}.`,
      `Below that size algorithm B is cheaper; above it algorithm A is cheaper, and the gap only widens.`,
      `At the marked size n = ${row.n} the gap is ${row.gap.toLocaleString('en-US')} operations in favour of ` +
      `${row.cheaper === 'tied' ? 'neither' : `algorithm ${row.cheaper}`}.`
    ];
  }
});

})(window);
