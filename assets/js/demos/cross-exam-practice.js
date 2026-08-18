/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   cross-exam-practice.js
   Demos for cross-cutting/exam-practice.html
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access, no hex values.

   Two demos:
     demo-practice-picker    filter the thirteen problem types by paper,
                             module and answer style
     demo-dijkstra-midterm   the midterm road-network graph, stepped through,
                             with the C-to-E weight exposed so parts (a) and
                             (b) of that problem can both be checked

   The graph is given in the page as an edge list and an adjacency matrix, so
   the whole problem is answerable without this demo. The demo is a check on
   your own working, not the source of the data.
   ========================================================================== */

const { createDemo, svgEl, formatNumber } = window.Demo;
/* ==========================================================================
   1. The thirteen problem types
   ========================================================================== */

const TYPES = [
  {
    number: 1, name: 'Sorting traces', paper: 'midterm', module: 'M1', marks: 20,
    style: 'trace', topics: '1.1.2, 1.1.3, 1.4.6',
    asks: 'explain both algorithms, give best and worst cases, trace two passes'
  },
  {
    number: 2, name: 'PMF, CDF, mean, variance', paper: 'midterm', module: 'M2', marks: 20,
    style: 'calculation', topics: '2.3.1, 2.3.2, 2.3.4, 2.3.5, 2.3.6, 2.3.8',
    asks: 'verify a PMF, build the CDF, compute the mean and the variance'
  },
  {
    number: 3, name: 'Counting the operation of interest', paper: 'midterm', module: 'M1', marks: 20,
    style: 'calculation', topics: '1.4.3, 1.4.4, 1.4.5',
    asks: 'name the operation, give the exact count, give the Big-O class'
  },
  {
    number: 4, name: 'Conditional probability', paper: 'midterm', module: 'M2', marks: 20,
    style: 'calculation', topics: '2.1.7, 2.1.10',
    asks: 'apply the multiplication rule, then the law of total probability'
  },
  {
    number: 5, name: 'Dijkstra, and re-running it', paper: 'midterm', module: 'M3', marks: 20,
    style: 'trace', topics: '3.5.3, 3.5.5, 3.5.6, 3.5.8',
    asks: 'trace the algorithm, then redo it after one edge weight changes'
  },
  {
    number: 6, name: 'Monte Carlo integration', paper: 'midterm', module: 'M2', marks: 20,
    style: 'calculation', topics: '2.5.1, 2.5.2, 2.5.4',
    asks: 'integrate analytically, then write pseudocode for the estimate'
  },
  {
    number: 7, name: 'Lines, s coordinate, distance', paper: 'final', module: 'M6', marks: 20,
    style: 'calculation', topics: '6.1.2, 6.1.3, 6.1.4, 6.1.7, 6.1.8',
    asks: 'parametric form, projection by dot product, closest point, distance'
  },
  {
    number: 8, name: 'Polygon triangulation by ear clipping', paper: 'final', module: 'M6', marks: 5,
    style: 'explanation', topics: '6.3.4, 6.3.5, 6.3.6',
    asks: 'state the algorithm and apply it to a named polygon'
  },
  {
    number: 9, name: "Impurity, gain, Hunt's choice", paper: 'final', module: 'M5', marks: 25,
    style: 'calculation', topics: '5.6.3, 5.6.5, 5.6.6, 5.6.7, 5.6.8, 5.6.9',
    asks: 'root impurity, split tables, child impurities, gain, greedy choice'
  },
  {
    number: 10, name: 'Single-linkage clustering and the dendrogram', paper: 'final', module: 'M5', marks: 25,
    style: 'trace', topics: '5.3.1, 5.3.2, 5.3.5, 5.3.6',
    asks: 'merge repeatedly, rebuild the matrix each time, give the heights'
  },
  {
    number: 11, name: 'Median filter', paper: 'final', module: 'M4', marks: 10,
    style: 'calculation', topics: '4.4.1, 4.4.5, 4.4.6',
    asks: 'sort each nine-pixel window and take the fifth value'
  },
  {
    number: 12, name: 'Sobel edge detection', paper: 'final', module: 'M4', marks: 10,
    style: 'calculation', topics: '4.4.1, 4.5.1, 4.5.3',
    asks: 'apply a 3 by 3 kernel by hand and show at least two pixels'
  },
  {
    number: 13, name: 'Dilation and erosion', paper: 'final', module: 'M4', marks: 10,
    style: 'calculation', topics: '4.6.9, 4.6.10, 4.6.11',
    asks: 'apply a cross structuring element, then describe what each operation does'
  }
];

const STYLE_LABEL = {
  calculation: 'a calculation',
  trace: 'a trace',
  explanation: 'an explanation'
};

createDemo('#demo-practice-picker-mount', {
  id: 'demo-practice-picker',
  title: 'Practice set builder',
  description:
    'Filter the thirteen problem types by paper, by module, or by the kind of answer they want. ' +
    'Each match is a heading further down this page, under the name shown in the table.',
  headingLevel: 4,

  controls: [
    {
      type: 'select',
      name: 'paper',
      label: 'Paper',
      value: 'all',
      options: [
        { value: 'all', label: 'Both papers' },
        { value: 'midterm', label: 'Midterm only' },
        { value: 'final', label: 'Final only' }
      ]
    },
    {
      type: 'select',
      name: 'module',
      label: 'Module',
      value: 'all',
      options: [
        { value: 'all', label: 'All modules' },
        { value: 'M1', label: 'M1 — Algorithm Design & Analysis' },
        { value: 'M2', label: 'M2 — Probability & Random Processes' },
        { value: 'M3', label: 'M3 — Graphs' },
        { value: 'M4', label: 'M4 — Image Processing' },
        { value: 'M5', label: 'M5 — Data Mining' },
        { value: 'M6', label: 'M6 — Computational Geometry' }
      ],
      help: 'M0 and M7 are assessed on neither paper, so they are not listed.'
    },
    {
      type: 'select',
      name: 'style',
      label: 'Kind of answer',
      value: 'all',
      options: [
        { value: 'all', label: 'Any kind' },
        { value: 'calculation', label: 'A calculation' },
        { value: 'trace', label: 'A step-by-step trace' },
        { value: 'explanation', label: 'A written explanation' }
      ]
    },
    {
      type: 'number',
      name: 'minMarks',
      label: 'Worth at least this many marks',
      min: 0,
      max: 25,
      step: 5,
      value: 0
    }
  ],

  compute(values) {
    const matches = TYPES.filter((t) =>
      (values.paper === 'all' || t.paper === values.paper) &&
      (values.module === 'all' || t.module === values.module) &&
      (values.style === 'all' || t.style === values.style) &&
      t.marks >= Number(values.minMarks));

    return {
      matches,
      totalMarks: matches.reduce((sum, t) => sum + t.marks, 0),
      filters: {
        paper: values.paper,
        module: values.module,
        style: values.style,
        minMarks: Number(values.minMarks)
      }
    };
  },

  table(model) {
    if (model.matches.length === 0) {
      return {
        caption: 'No problem type matches the current filters',
        columns: [{ label: 'Result' }],
        rows: [['Nothing matches. Widen one of the four filters above.']]
      };
    }

    return {
      caption: `${model.matches.length} of ${TYPES.length} problem types match the current filters, ` +
        `worth ${model.totalMarks} marks in total`,
      rowHeader: true,
      columns: [
        { label: 'Type' },
        { label: 'Paper' },
        { label: 'Module' },
        { label: 'Marks', numeric: true },
        { label: 'Answer is' },
        { label: 'Topics assessed' },
        { label: 'What it asks for' }
      ],
      rows: model.matches.map((t) => ({
        cells: [
          `${t.number} · ${t.name}`,
          t.paper === 'midterm' ? 'Midterm' : 'Final',
          t.module,
          t.marks,
          STYLE_LABEL[t.style],
          t.topics,
          t.asks
        ]
      }))
    };
  },

  summary(model) {
    if (model.matches.length === 0) {
      return [
        'No problem type matches all four filters at once. Set one of them back to its widest ' +
        'setting — most often it is the mark threshold that is too high.'
      ];
    }

    const names = model.matches.map((t) => `${t.number} ${t.name}`).join('; ');
    const byModule = model.matches.reduce((acc, t) => {
      acc[t.module] = (acc[t.module] || 0) + 1;
      return acc;
    }, {});
    const spread = Object.keys(byModule).sort().map((m) => `${byModule[m]} from ${m}`).join(', ');

    return [
      `${model.matches.length} problem type${model.matches.length === 1 ? '' : 's'} match, ` +
      `worth ${model.totalMarks} marks in total: ${spread}.`,
      `They are: ${names}.`,
      'Each one is a heading further down this page, with its data as real tables and a worked ' +
      'solution you can reveal.'
    ];
  }
});

/* ==========================================================================
   2. Dijkstra on the midterm road network
   ========================================================================== */

const CITIES = ['A', 'B', 'C', 'D', 'E', 'F'];

/* Layout for the drawing only. The graph itself is the edge list below, and
   the page states it as a table, so nothing here is needed to answer the
   question. */
const LAYOUT = {
  A: [1, 5], B: [3.5, 7.6], C: [3.5, 2.4],
  D: [6.5, 7.6], E: [6.5, 2.4], F: [9, 5]
};

function edgeList(weightCE) {
  return [
    ['A', 'B', 4],
    ['A', 'C', 7],
    ['B', 'C', 1],
    ['B', 'D', 5],
    ['C', 'E', weightCE],
    ['D', 'E', 2],
    ['D', 'F', 6],
    ['E', 'F', 4]
  ];
}

function neighboursOf(edges, city) {
  const out = [];
  edges.forEach(([u, v, w]) => {
    if (u === city) out.push([v, w]);
    else if (v === city) out.push([u, w]);
  });
  return out;
}

/** Dijkstra from A, recording one step per node fixed, plus the initial state. */
function dijkstra(edges, source) {
  const dist = {};
  const prev = {};
  const fixed = {};
  CITIES.forEach((c) => { dist[c] = Infinity; prev[c] = null; fixed[c] = false; });
  dist[source] = 0;

  const steps = [{
    fixedNow: null,
    relaxations: [],
    dist: { ...dist },
    prev: { ...prev },
    fixed: { ...fixed },
    note: 'Initialise: the source is at 0 and every other city is at infinity. Nothing is fixed yet.'
  }];

  for (let round = 0; round < CITIES.length; round += 1) {
    let best = null;
    CITIES.forEach((c) => {
      if (fixed[c] || dist[c] === Infinity) return;
      if (best === null || dist[c] < dist[best]) best = c;
    });
    if (best === null) break;

    fixed[best] = true;

    const relaxations = [];
    neighboursOf(edges, best).forEach(([other, weight]) => {
      if (fixed[other]) return;
      const candidate = dist[best] + weight;
      if (candidate < dist[other]) {
        relaxations.push({
          city: other,
          from: dist[other],
          to: candidate,
          via: best,
          weight
        });
        dist[other] = candidate;
        prev[other] = best;
      } else {
        relaxations.push({
          city: other,
          from: dist[other],
          to: dist[other],
          rejected: candidate,
          via: best,
          weight
        });
      }
    });

    steps.push({
      fixedNow: best,
      relaxations,
      dist: { ...dist },
      prev: { ...prev },
      fixed: { ...fixed },
      note: ''
    });
  }

  return steps;
}

function pathTo(prev, city) {
  const out = [];
  let at = city;
  while (at) {
    out.unshift(at);
    at = prev[at];
  }
  return out;
}

const AXIS_STYLE = 'stroke:var(--fsu-chart-axis);fill:none;stroke-width:2';
const LABEL_STYLE = 'fill:var(--fsu-color-body);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
// Roads not on a best-known route: a measured text colour rather than a
// series token, so they stay legible on the dark canvas as well as the
// light one. The distinction is carried by weight and dash, not hue.
const EDGE_STYLE = 'stroke:var(--fsu-color-caption);fill:none;stroke-width:1.75';
const TREE_STYLE = 'stroke:var(--fsu-series-1);fill:none;stroke-width:4';

createDemo('#demo-dijkstra-midterm-mount', {
  id: 'demo-dijkstra-midterm',
  title: 'Dijkstra step-through on the road network',
  description:
    'The same six-city graph as the question above. Step through one node at a time and watch the ' +
    'working table fill in. Change the C to E travel time to 1 to answer part (b).',
  headingLevel: 4,

  controls: [
    {
      type: 'range',
      name: 'weightCE',
      label: 'Travel time on the C to E road',
      min: 1,
      max: 10,
      step: 1,
      value: 3,
      unit: 'minutes',
      valueText: (v) => `${v} minutes`,
      help: 'Part (a) of the question uses 3. Part (b) changes it to 1. Every other road is unchanged.'
    },
    {
      type: 'select',
      name: 'source',
      label: 'Start city',
      value: 'A',
      options: CITIES.map((c) => ({ value: c, label: c })),
      help: 'The exam question starts at A. Other starts are here so you can build your own practice.'
    },
    {
      type: 'select',
      name: 'target',
      label: 'Destination to report',
      value: 'D',
      options: CITIES.map((c) => ({ value: c, label: c })),
      help: 'Part (a) asks for A to D; part (b) asks for A to F.'
    }
  ],

  compute(values) {
    const weightCE = Math.max(1, Math.round(values.weightCE));
    const edges = edgeList(weightCE);
    const steps = dijkstra(edges, values.source);
    const final = steps[steps.length - 1];

    return {
      weightCE,
      source: values.source,
      target: values.target,
      edges,
      steps,
      final,
      finalDistance: final.dist[values.target],
      finalPath: pathTo(final.prev, values.target)
    };
  },

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => {
      const step = model.steps[i];
      if (step.fixedNow === null) {
        return `Initialise. ${model.source} is at 0 minutes and the other five cities are at infinity. ` +
          'No city is fixed yet.';
      }

      const improved = step.relaxations.filter((r) => r.to !== r.from);
      const rejected = step.relaxations.filter((r) => r.to === r.from);

      const parts = [
        `Fix ${step.fixedNow} at ${step.dist[step.fixedNow]} minutes — it is the closest city not yet fixed.`
      ];

      if (improved.length > 0) {
        parts.push('Relaxing its edges improves ' + improved
          .map((r) => `${r.city} from ${r.from === Infinity ? 'infinity' : r.from} to ${r.to}`)
          .join(', ') + '.');
      }
      if (rejected.length > 0) {
        parts.push(rejected
          .map((r) => `${r.city} stays at ${r.from} because going through ${r.via} would cost ${r.rejected}`)
          .join('; ') + '.');
      }
      if (improved.length === 0 && rejected.length === 0) {
        parts.push('It has no unfixed neighbours, so nothing changes.');
      }

      return parts.join(' ');
    }
  },

  figure(model, ctx) {
    const W = 620;
    const H = 400;
    const left = 30;
    const right = 30;
    const top = 24;
    const bottom = 24;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`, width: '100%',
      style: 'max-inline-size:100%;block-size:auto'
    });

    const px = (x) => left + (x / 10) * (W - left - right);
    const py = (y) => (H - bottom) - (y / 10) * (H - bottom - top);

    const step = model.steps[ctx.step];

    /* edges, with the weight written beside each as real text */
    model.edges.forEach(([u, v, w]) => {
      const a = LAYOUT[u];
      const b = LAYOUT[v];
      const onTree = step.prev[v] === u || step.prev[u] === v;
      svg.appendChild(svgEl('line', {
        x1: px(a[0]), y1: py(a[1]), x2: px(b[0]), y2: py(b[1]),
        style: onTree ? TREE_STYLE : EDGE_STYLE,
        'stroke-dasharray': onTree ? null : '6 4'
      }));
      svg.appendChild(svgEl('text', {
        x: (px(a[0]) + px(b[0])) / 2,
        y: (py(a[1]) + py(b[1])) / 2 - 6,
        'text-anchor': 'middle',
        style: LABEL_STYLE,
        text: String(w)
      }));
    });

    /* nodes: fixed cities are squares, unfixed are circles, and every one
       carries its name and its current distance as text */
    CITIES.forEach((city) => {
      const [x, y] = LAYOUT[city];
      const cx = px(x);
      const cy = py(y);
      const isFixed = step.fixed[city];
      const isCurrent = step.fixedNow === city;

      const shapeStyle = `fill:var(--fsu-surface);stroke:var(--fsu-color-strong);stroke-width:${isCurrent ? 4 : 2}`;
      if (isFixed) {
        svg.appendChild(svgEl('rect', { x: cx - 18, y: cy - 18, width: 36, height: 36, style: shapeStyle }));
      } else {
        svg.appendChild(svgEl('circle', { cx, cy, r: 18, style: shapeStyle }));
      }

      svg.appendChild(svgEl('text', {
        x: cx, y: cy + 5, 'text-anchor': 'middle', style: LABEL_STYLE, text: city
      }));
      svg.appendChild(svgEl('text', {
        x: cx, y: cy + 34, 'text-anchor': 'middle', style: LABEL_STYLE,
        text: step.dist[city] === Infinity ? '∞' : String(step.dist[city])
      }));
    });

    svg.appendChild(svgEl('text', {
      x: left, y: 16, style: LABEL_STYLE,
      text: 'Squares are fixed cities; circles are not yet fixed. The number under each city is its current best time.'
    }));

    return svg;
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    const fixedList = CITIES.filter((c) => step.fixed[c]);
    const distText = CITIES
      .map((c) => `${c} ${step.dist[c] === Infinity ? 'infinity' : step.dist[c]}`)
      .join(', ');

    if (step.fixedNow === null) {
      return `The six-city road network at the start. Every city is drawn as a circle, meaning none is ` +
        `fixed yet. Current best times: ${distText}.`;
    }

    return `Step ${ctx.step} of ${ctx.stepCount - 1}: ${step.fixedNow} has just been fixed at ` +
      `${step.dist[step.fixedNow]} minutes and is now drawn as a square with a heavy outline. ` +
      `${fixedList.length} of 6 cities are fixed: ${fixedList.join(', ')}. ` +
      `Current best times: ${distText}. ` +
      `Heavy solid roads are the ones currently on a best-known route; dashed roads are not.`;
  },

  table(model, ctx) {
    const step = model.steps[ctx.step];
    return {
      caption: `Dijkstra working table from ${model.source}, with the C to E road at ${model.weightCE} minutes. ` +
        `Step ${ctx.step} of ${ctx.stepCount - 1}` +
        (step.fixedNow ? `: ${step.fixedNow} has just been fixed.` : ': the initial state.'),
      rowHeader: true,
      columns: [
        { label: 'City' },
        { label: 'Best time from the start', unit: 'min', numeric: true },
        { label: 'Reached from' },
        { label: 'Status' },
        { label: 'Best route so far' }
      ],
      rows: CITIES.map((city) => ({
        cells: [
          city,
          step.dist[city] === Infinity ? '∞' : step.dist[city],
          step.prev[city] || '—',
          step.fixed[city] ? 'fixed' : 'not fixed',
          step.dist[city] === Infinity ? 'none yet' : pathTo(step.prev, city).join(' → ')
        ],
        current: city === step.fixedNow
      }))
    };
  },

  summary(model, ctx) {
    const step = model.steps[ctx.step];
    const lines = [];

    const fixedCount = CITIES.filter((c) => step.fixed[c]).length;
    lines.push(`${fixedCount} of ${CITIES.length} cities are fixed. ` +
      'A fixed city\'s distance can never change again — that is the greedy promise Dijkstra makes, ' +
      'and it holds only because no road has a negative travel time.');

    if (model.finalDistance === Infinity) {
      lines.push(`There is no route from ${model.source} to ${model.target} in this graph.`);
    } else if (step.fixed[model.target]) {
      lines.push(`${model.target} is fixed at ${model.finalDistance} minutes, by the route ` +
        `${model.finalPath.join(' → ')}. That is the answer to the question.`);
    } else {
      const current = step.dist[model.target];
      lines.push(`${model.target} is not fixed yet. Its best known time is ` +
        `${current === Infinity ? 'still infinity' : `${current} minutes, which may still improve`}.`);
    }

    if (model.weightCE !== 3) {
      lines.push(`The C to E road is set to ${model.weightCE} minutes rather than the original 3. ` +
        `At 1 minute — the change part (b) asks about — the A to F distance falls from 12 to 10 and ` +
        `the route itself is unchanged, which is the point of that part of the question.`);
    }

    lines.push(`Total edge weight on the graph: ` +
      `${formatNumber(model.edges.reduce((sum, e) => sum + e[2], 0), 0)} minutes across 8 roads.`);

    return lines;
  }
});

})(window);
