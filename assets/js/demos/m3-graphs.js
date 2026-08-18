/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m3-graphs.js — every interactive demo on m3-graphs.html
   ==========================================================================

   ISC 4221C (2026). Vanilla ES module, no dependencies, no network access.
   Works from a file:// URL when the browser allows module scripts; when it
   does not, the in-mount fallback tables in the page carry the numbers.

   All twelve demos here are pure JavaScript recomputations of the traces in
   the M3 slide decks (P1–P4). No precomputed trace file is loaded: the
   pipeline had not produced assets/data/m3/*.json when this page was written,
   so every trace is recomputed deterministically in the browser instead.
   The numbers were checked line by line against the source traces:

     Dijkstra, 6-node example  slides P3 f29  (T8)  final Dist(F) = 41
     Kruskal, 10-node example  slides P4 f8   (T10) MST length   = 48
     next_perm, order 4        slides P4 f21  (T11)
     TSP nearest neighbour     slides P4 f29  (T12) 21/21/23/21/21
     TSP brute force           slides P4 f25        best ACBED   = 19
     DFS on the museum graph   slides P3 (commented block, T9)
     Counting walks on SIMPLE  slides P2 f27        A·v1 = [1,2,1,1,0]

   NOTHING in this file hardcodes a colour or a font size. Every visual
   property comes from a token in assets/css/fsu-tokens.css.
   ========================================================================== */

const { createDemo, svgEl, seededRandom } = window.Demo;
/* ==========================================================================
   1. The running examples, as data
   ========================================================================== */

const GRAPHS = {

  /* The SIMPLE graph — P1 f11. Node positions are the GRF coordinates of
     P1 f21, rescaled: (2,1) (1,0) (0,2) (3,3) (3,0). */
  simple: {
    id: 'simple',
    label: 'SIMPLE — 5 nodes, 4 edges',
    nodes: ['A', 'B', 'C', 'D', 'E'],
    pos: { A: [260, 210], B: [160, 290], C: [60, 130], D: [360, 50], E: [360, 290] },
    edges: [['A', 'B'], ['A', 'C'], ['B', 'C'], ['C', 'D']],
    viewBox: '0 0 430 350',
    weighted: false,
    grf: { A: [2, 1], B: [1, 0], C: [0, 2], D: [3, 3], E: [3, 0] }
  },

  /* The disconnected example — P2 f10. Edge D–F follows the figure, not the
     starter code (which wrote 'EF'); see slides-M3 note B. */
  disconnected: {
    id: 'disconnected',
    label: 'DISCONNECTED — 8 nodes, 3 components',
    nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    pos: {
      A: [60, 80], D: [180, 80], F: [60, 200], E: [180, 200],
      B: [300, 80], C: [300, 200], H: [410, 140], G: [410, 280]
    },
    edges: [['A', 'D'], ['A', 'F'], ['D', 'F'], ['D', 'E'], ['B', 'C'], ['C', 'H']],
    viewBox: '0 0 470 340',
    weighted: false
  },

  /* Königsberg — P1 f3. A multigraph: A–B twice, A–C twice. */
  konigsberg: {
    id: 'konigsberg',
    label: 'KÖNIGSBERG — 4 landmasses, 7 bridges',
    nodes: ['A', 'B', 'C', 'D'],
    pos: { A: [220, 170], B: [220, 300], C: [220, 40], D: [400, 170] },
    edges: [['A', 'B'], ['A', 'B'], ['A', 'C'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['C', 'D']],
    viewBox: '0 0 470 350',
    weighted: false
  },

  /* The museum / maze graph — P3 f7. 18 rooms in a 3 by 6 grid; 17 doorways;
     it is a tree. The DFS trace from Q is T9. */
  museum: {
    id: 'museum',
    label: 'MUSEUM — 18 rooms, 17 doorways (a tree)',
    nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
    pos: {
      A: [50, 60], B: [130, 60], C: [210, 60], D: [290, 60], E: [370, 60], F: [450, 60],
      G: [50, 150], H: [130, 150], I: [210, 150], J: [290, 150], K: [370, 150], L: [450, 150],
      M: [50, 240], N: [130, 240], O: [210, 240], P: [290, 240], Q: [370, 240], R: [450, 240]
    },
    edges: [
      ['A', 'G'], ['G', 'M'], ['M', 'N'], ['N', 'H'], ['H', 'B'], ['B', 'C'],
      ['H', 'I'], ['I', 'J'], ['I', 'O'], ['O', 'P'], ['P', 'Q'], ['Q', 'K'],
      ['K', 'E'], ['E', 'D'], ['E', 'F'], ['K', 'L'], ['L', 'R']
    ],
    viewBox: '0 0 500 300',
    weighted: false
  },

  /* The Lab 07 maze graph. Eight decision points; node 1 is the entrance and
     node 2 the exit; the red overlay in mazer.png is a tree. */
  maze07: {
    id: 'maze07',
    label: 'LAB 07 MAZE — 8 decision points, 7 corridors',
    nodes: ['1', '2', '3', '4', '5', '6', '7', '8'],
    pos: {
      1: [60, 60], 4: [170, 130], 6: [60, 220], 3: [290, 130],
      2: [410, 130], 5: [290, 260], 8: [200, 350], 7: [380, 350]
    },
    edges: [['3', '5'], ['3', '4'], ['3', '2'], ['5', '8'], ['5', '7'], ['4', '1'], ['4', '6']],
    viewBox: '0 0 470 390',
    weighted: false
  },

  /* The 10-city weighted graph — P3 f11 / P4 f7. Spine of P3 and P4. */
  wtgraph: {
    id: 'wtgraph',
    label: 'WTGRAPH — 10 cities, 17 weighted edges',
    nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    pos: {
      A: [60, 45], B: [200, 32], C: [335, 62], D: [270, 150], I: [335, 250],
      F: [60, 165], E: [170, 210], G: [58, 285], H: [200, 320], J: [318, 352]
    },
    edges: [
      ['A', 'B', 3], ['A', 'F', 2], ['B', 'C', 17], ['B', 'D', 16], ['C', 'D', 8],
      ['C', 'I', 18], ['D', 'E', 11], ['D', 'I', 4], ['E', 'F', 1], ['E', 'G', 6],
      ['E', 'H', 5], ['E', 'I', 10], ['F', 'G', 7], ['G', 'H', 15], ['H', 'I', 12],
      ['H', 'J', 13], ['I', 'J', 9]
    ],
    viewBox: '0 0 400 400',
    weighted: true,
    unit: 'units'
  },

  /* The 6-node Dijkstra example — P3 f22. */
  dijkstraex: {
    id: 'dijkstraex',
    label: "DIJKSTRAEX — 6 nodes, the slides' Dijkstra example",
    nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
    pos: { A: [50, 190], B: [180, 110], C: [120, 280], D: [420, 300], E: [410, 80], F: [290, 150] },
    edges: [
      ['A', 'B', 40], ['A', 'C', 15], ['B', 'C', 20], ['C', 'D', 100],
      ['B', 'D', 10], ['B', 'E', 25], ['B', 'F', 6], ['E', 'F', 8]
    ],
    viewBox: '0 0 470 350',
    weighted: true,
    unit: 'units'
  },

  /* The midterm road network — Midterm Problem 5. Weights are minutes. */
  roads: {
    id: 'roads',
    label: 'ROADS — the midterm road network, 6 cities',
    nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
    pos: { A: [60, 60], B: [200, 120], C: [80, 245], D: [330, 75], E: [250, 250], F: [415, 200] },
    edges: [
      ['A', 'B', 4], ['A', 'C', 7], ['B', 'C', 1], ['B', 'D', 5],
      ['C', 'E', 3], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 4]
    ],
    viewBox: '0 0 475 310',
    weighted: true,
    unit: 'min'
  },

  /* The Lab 08 example graph. Its README states a total of 42; the true
     minimum spanning tree weighs 41. */
  lab08: {
    id: 'lab08',
    label: 'LAB 08 — 9 vertices, 13 weighted edges',
    nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    pos: {
      A: [50, 180], B: [140, 85], C: [250, 85], D: [360, 85], E: [435, 180],
      F: [360, 275], G: [250, 275], H: [140, 275], I: [250, 180]
    },
    edges: [
      ['A', 'B', 4], ['A', 'H', 8], ['B', 'H', 11], ['B', 'C', 8], ['H', 'I', 7],
      ['G', 'H', 1], ['G', 'I', 6], ['F', 'G', 2], ['C', 'F', 4], ['C', 'D', 7],
      ['D', 'F', 14], ['D', 'E', 9], ['E', 'F', 10]
    ],
    viewBox: '0 0 490 360',
    weighted: true,
    unit: 'units'
  },

  /* A deliberately disconnected weighted graph, for Kruskal's edge case. */
  twoparts: {
    id: 'twoparts',
    label: 'TWO PARTS — 6 nodes in 2 disconnected pieces',
    nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
    pos: { A: [70, 80], B: [200, 80], C: [135, 210], D: [330, 80], E: [450, 80], F: [390, 210] },
    edges: [['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['D', 'E', 3], ['D', 'F', 5]],
    viewBox: '0 0 500 270',
    weighted: true,
    unit: 'units'
  },

  /* The 5-city complete graph for the TSP — P4 f24. */
  tsp5: {
    id: 'tsp5',
    label: 'TSP5 — 5 cities, every pair joined',
    nodes: ['A', 'B', 'C', 'D', 'E'],
    pos: { A: [230, 50], B: [354, 140], C: [306, 285], D: [154, 285], E: [106, 140] },
    edges: [
      ['A', 'B', 3], ['A', 'C', 4], ['A', 'D', 2], ['A', 'E', 7], ['B', 'C', 4],
      ['B', 'D', 6], ['B', 'E', 3], ['C', 'D', 5], ['C', 'E', 8], ['D', 'E', 6]
    ],
    viewBox: '0 0 470 345',
    weighted: true,
    unit: 'units'
  },

  /* Pen-and-paper puzzles for the Eulerian-path rule — P1 f27. */
  envelope: {
    id: 'envelope',
    label: 'ENVELOPE — the classic pen puzzle',
    nodes: ['P', 'Q', 'R', 'S', 'T'],
    pos: { P: [70, 280], Q: [330, 280], R: [330, 130], S: [70, 130], T: [200, 45] },
    edges: [
      ['P', 'Q'], ['Q', 'R'], ['R', 'S'], ['S', 'P'],
      ['P', 'R'], ['Q', 'S'], ['S', 'T'], ['R', 'T']
    ],
    viewBox: '0 0 400 330',
    weighted: false
  },

  crossedsquare: {
    id: 'crossedsquare',
    label: 'CROSSED SQUARE — square plus both diagonals',
    nodes: ['P', 'Q', 'R', 'S'],
    pos: { P: [70, 280], Q: [330, 280], R: [330, 60], S: [70, 60] },
    edges: [['P', 'Q'], ['Q', 'R'], ['R', 'S'], ['S', 'P'], ['P', 'R'], ['Q', 'S']],
    viewBox: '0 0 400 340',
    weighted: false
  }
};

const INF = Infinity;
const INF_TEXT = '∞';

/* --- small accessors ------------------------------------------------------ */

function edgeRecords(graph) {
  return graph.edges.map((e, i) => ({ i, u: e[0], v: e[1], w: e.length > 2 ? e[2] : 1 }));
}

/** node -> sorted array of { node, w, i }. Multigraph duplicates are kept. */
function adjacency(graph) {
  const adj = {};
  graph.nodes.forEach((n) => { adj[n] = []; });
  edgeRecords(graph).forEach(({ i, u, v, w }) => {
    adj[u].push({ node: v, w, i });
    adj[v].push({ node: u, w, i });
  });
  graph.nodes.forEach((n) => adj[n].sort((a, b) => (a.node < b.node ? -1 : a.node > b.node ? 1 : a.i - b.i)));
  return adj;
}

function degrees(graph) {
  const adj = adjacency(graph);
  const out = {};
  graph.nodes.forEach((n) => { out[n] = adj[n].length; });
  return out;
}

function nodeOptions(graph) {
  return graph.nodes.map((n) => ({ value: n, label: `Node ${n}` }));
}

function graphOptions(ids) {
  return ids.map((id) => ({ value: id, label: GRAPHS[id].label }));
}

function joinList(items, conjunction) {
  const list = items.map(String);
  if (list.length === 0) return 'none';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} ${conjunction || 'and'} ${list[list.length - 1]}`;
}

function unitOf(graph) {
  return graph.unit || 'units';
}

/** "1 unit", not "1 units". Screen readers read every one of these aloud. */
function amount(value, graph) {
  const unit = unitOf(graph);
  if (unit === 'units' && Number(value) === 1) return '1 unit';
  return `${value} ${unit}`;
}

/* ==========================================================================
   2. Drawing. Colour is never the only encoding: every state also changes the
      stroke width, the dash pattern, or adds a word under the node.
   ========================================================================== */

const NODE_R = 18;

const EDGE_STYLE = {
  plain:      { stroke: 'var(--fsu-chart-axis)',  width: 2,   dash: null },
  faded:      { stroke: 'var(--fsu-chart-gridline)', width: 1.5, dash: null },
  chosen:     { stroke: 'var(--fsu-series-1)',    width: 7,   dash: null },
  alternate:  { stroke: 'var(--fsu-series-5)',    width: 5,   dash: '14 6' },
  considered: { stroke: 'var(--fsu-series-3)',    width: 5,   dash: '2 5' },
  rejected:   { stroke: 'var(--fsu-series-4)',    width: 4,   dash: '10 6' }
};

const NODE_STYLE = {
  plain:   { fill: 'var(--fsu-surface)',   stroke: 'var(--fsu-chart-axis)',    width: 2, dash: null, text: 'var(--fsu-color-body)' },
  current: { fill: 'var(--fsu-series-1)',  stroke: 'var(--fsu-color-heading)', width: 4, dash: null, text: 'var(--fsu-on-brand)' },
  done:    { fill: 'var(--fsu-series-2)',  stroke: 'var(--fsu-chart-axis)',    width: 3, dash: null, text: 'var(--fsu-on-gold)' },
  frontier:{ fill: 'var(--fsu-surface)',   stroke: 'var(--fsu-series-1)',      width: 4, dash: '5 4', text: 'var(--fsu-color-body)' }
};

function textStyle(opts) {
  const size = opts.size || 'var(--fsu-text-small)';
  const weight = opts.weight || 'var(--fsu-weight-medium)';
  const fill = opts.fill || 'var(--fsu-color-body)';
  return `font-family: var(--fsu-font-sans); font-size: ${size}; font-weight: ${weight}; fill: ${fill};`;
}

function svgText(x, y, value, opts = {}) {
  return svgEl('text', {
    x, y,
    'text-anchor': opts.anchor || 'middle',
    'dominant-baseline': opts.baseline || 'middle',
    style: textStyle(opts),
    text: String(value)
  });
}

/** A label with a plate behind it so it stays readable where it crosses a line. */
function plateLabel(x, y, value, opts = {}) {
  const text = String(value);
  const w = Math.max(20, text.length * 10 + 8);
  const g = svgEl('g', {});
  g.appendChild(svgEl('rect', {
    x: x - w / 2, y: y - 11, width: w, height: 22, rx: 6,
    style: 'fill: var(--fsu-surface); stroke: var(--fsu-chart-gridline); stroke-width: 1;'
  }));
  g.appendChild(svgText(x, y, text, opts));
  return g;
}

/**
 * Draw a graph.
 * opts.edgeState(edgeRecord)  -> key of EDGE_STYLE
 * opts.edgeLabel(edgeRecord)  -> string or null (defaults to the weight)
 * opts.nodeState(node)        -> key of NODE_STYLE
 * opts.nodeNote(node)         -> short string drawn under the node
 */
function drawGraph(graph, opts = {}) {
  const edgeState = opts.edgeState || (() => 'plain');
  const nodeState = opts.nodeState || (() => 'plain');
  const nodeNote = opts.nodeNote || (() => '');
  const edgeLabel = opts.edgeLabel || ((e) => (graph.weighted ? String(e.w) : null));

  const svg = svgEl('svg', { viewBox: graph.viewBox });
  const edgeLayer = svgEl('g', {});
  const labelLayer = svgEl('g', {});
  const nodeLayer = svgEl('g', {});

  /* Parallel edges (Königsberg) get a curve so both are visible. */
  const pairCount = {};
  const pairSeen = {};
  const records = edgeRecords(graph);
  records.forEach(({ u, v }) => {
    const key = u < v ? `${u}|${v}` : `${v}|${u}`;
    pairCount[key] = (pairCount[key] || 0) + 1;
  });

  records.forEach((rec) => {
    const key = rec.u < rec.v ? `${rec.u}|${rec.v}` : `${rec.v}|${rec.u}`;
    const total = pairCount[key];
    const seen = (pairSeen[key] = (pairSeen[key] || 0) + 1);
    const bow = total > 1 ? (seen - (total + 1) / 2) * 60 : 0;

    const [x1, y1] = graph.pos[rec.u];
    const [x2, y2] = graph.pos[rec.v];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * bow;
    const cy = my + (dx / len) * bow;

    const style = EDGE_STYLE[edgeState(rec)] || EDGE_STYLE.plain;
    edgeLayer.appendChild(svgEl('path', {
      d: bow === 0 ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
      style: `fill: none; stroke: ${style.stroke}; stroke-width: ${style.width}; stroke-linecap: round;` +
             (style.dash ? ` stroke-dasharray: ${style.dash};` : '')
    }));

    const label = edgeLabel(rec);
    if (label !== null && label !== undefined && label !== '') {
      const lx = bow === 0 ? x1 + (x2 - x1) * 0.42 : (mx + cx) / 2;
      const ly = bow === 0 ? y1 + (y2 - y1) * 0.42 : (my + cy) / 2;
      labelLayer.appendChild(plateLabel(lx, ly, label, { fill: 'var(--fsu-color-caption)' }));
    }
  });

  graph.nodes.forEach((n) => {
    const [x, y] = graph.pos[n];
    const style = NODE_STYLE[nodeState(n)] || NODE_STYLE.plain;
    nodeLayer.appendChild(svgEl('circle', {
      cx: x, cy: y, r: NODE_R,
      style: `fill: ${style.fill}; stroke: ${style.stroke}; stroke-width: ${style.width};` +
             (style.dash ? ` stroke-dasharray: ${style.dash};` : '')
    }));
    nodeLayer.appendChild(svgText(x, y, n, { fill: style.text, weight: 'var(--fsu-weight-bold)' }));
    const note = nodeNote(n);
    if (note) {
      // A plate, not bare text: a node caption often lands on top of an edge,
      // and a line running through the letters makes the number unreadable.
      nodeLayer.appendChild(plateLabel(x, y + NODE_R + 14, note, { fill: 'var(--fsu-color-caption)' }));
    }
  });

  svg.appendChild(edgeLayer);
  svg.appendChild(labelLayer);
  svg.appendChild(nodeLayer);
  return svg;
}

/* ==========================================================================
   3. Algorithms. Every one is a pure function of its arguments.
   ========================================================================== */

/** Eulerian-path test, exactly the five-step procedure of P1 f27. */
function eulerCheck(graph) {
  const deg = degrees(graph);
  const rows = graph.nodes.map((n) => ({ node: n, degree: deg[n], odd: deg[n] % 2 === 1 }));
  let odd = 0;
  rows.forEach((r) => { r.oddSoFar = (odd += r.odd ? 1 : 0); });
  const verdict = odd === 0
    ? 'circuit'
    : odd === 2 ? 'path' : 'impossible';
  return { rows, odd, verdict, isolated: graph.nodes.filter((n) => deg[n] === 0) };
}

/** The Connection Algorithm of P2 f12, and its modified form of P2 f21. */
function connectionAlgorithm(graph, source, target, componentsMode) {
  const adj = adjacency(graph);
  const set = {};
  const component = {};
  graph.nodes.forEach((n) => { set[n] = 'untouched'; component[n] = null; });

  const steps = [];
  const push = (description, current, extra) => steps.push(Object.assign({
    description, current, set: { ...set }, component: { ...component }
  }, extra || {}));

  const firstIn = (name) => graph.nodes.find((n) => set[n] === name) || null;

  if (!componentsMode) {
    set[source] = 'new';
    push(`Initialise: new = {${source}}, used is empty, every other node is untouched.`, source, { outcome: 'running' });

    let guard = 0;
    while (guard++ < 500) {
      const s = firstIn('new');
      if (!s) {
        push('The new set is empty, so the algorithm fails: there is no path.', null, { outcome: 'failed' });
        break;
      }
      set[s] = 'used';
      const discovered = [];
      let found = false;
      adj[s].forEach(({ node: t }) => {
        if (found) return;
        if (t === target) { found = true; return; }
        if (set[t] === 'untouched') { set[t] = 'new'; discovered.push(t); }
      });
      if (found) {
        push(`Take ${s} out of new and into used. Scanning its edges reaches the target ${target}, so a path exists.`,
          s, { outcome: 'succeeded', discovered });
        break;
      }
      push(`Take ${s} out of new and into used; ` +
           (discovered.length
             ? `its edges move ${joinList(discovered)} from untouched into new.`
             : 'none of its neighbours were untouched, so new does not grow.'),
        s, { outcome: 'running', discovered });
    }
    return { steps, mode: 'path' };
  }

  let c = 0;
  push('Initialise: used and new are empty, every node is untouched, component count c = 0.', null, { outcome: 'running', c });
  let guard = 0;
  while (guard++ < 500) {
    const seed = firstIn('untouched');
    if (!seed) {
      push(`No untouched nodes remain. The graph has ${c} connected component${c === 1 ? '' : 's'}.`, null, { outcome: 'done', c });
      break;
    }
    set[seed] = 'new';
    c += 1;
    push(`Untouched is not empty, so start component ${c} from node ${seed}.`, seed, { outcome: 'running', c });

    let inner = 0;
    while (inner++ < 500) {
      const s = firstIn('new');
      if (!s) break;
      const discovered = [];
      adj[s].forEach(({ node: t }) => {
        if (set[t] === 'untouched') { set[t] = 'new'; discovered.push(t); }
      });
      component[s] = c;
      set[s] = 'used';
      push(`Component ${c}: node ${s} joins used` +
           (discovered.length ? ` and pulls ${joinList(discovered)} into new.` : '; it had no untouched neighbours.'),
        s, { outcome: 'running', c, discovered });
    }
  }
  return { steps, mode: 'components' };
}

/* --- adjacency matrix powers, P2 f28 -------------------------------------- */

function adjacencyMatrix(graph) {
  const idx = {};
  graph.nodes.forEach((n, i) => { idx[n] = i; });
  const N = graph.nodes.length;
  const A = Array.from({ length: N }, () => new Array(N).fill(0));
  edgeRecords(graph).forEach(({ u, v }) => {
    A[idx[u]][idx[v]] += 1;
    A[idx[v]][idx[u]] += 1;
  });
  return A;
}

function matMul(A, B) {
  const N = A.length;
  const C = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i += 1) {
    for (let k = 0; k < N; k += 1) {
      if (A[i][k] === 0) continue;
      for (let j = 0; j < N; j += 1) C[i][j] += A[i][k] * B[k][j];
    }
  }
  return C;
}

function matPowers(A, kMax) {
  const out = [A];
  for (let k = 2; k <= kMax; k += 1) out.push(matMul(out[out.length - 1], A));
  return out;
}

/** Every simple path (no repeated node) from `from` to `to`, in DFS order. */
function simplePaths(graph, from, to, cap) {
  const adj = adjacency(graph);
  const found = [];
  const seen = new Set([from]);
  const stackNodes = [from];
  let total = 0;

  function walk(node, length) {
    if (node === to) {
      total += 1;
      if (found.length < cap) found.push({ nodes: stackNodes.slice(), length });
      return;
    }
    for (let i = 0; i < adj[node].length; i += 1) {
      const { node: next, w } = adj[node][i];
      if (seen.has(next)) continue;
      seen.add(next);
      stackNodes.push(next);
      walk(next, length + w);
      stackNodes.pop();
      seen.delete(next);
    }
  }

  if (from !== to) walk(from, 0);
  return { paths: found, total };
}

/* --- traversal, P3 f8 (DFS) and the tutorial's BFS ------------------------- */

function traverse(graph, start, algorithm) {
  const adj = adjacency(graph);
  const visited = [];
  const seen = new Set();
  const container = [start];
  const inContainer = new Set([start]);
  const dist = { [start]: 0 };
  const steps = [];

  let guard = 0;
  while (container.length > 0 && guard++ < 2000) {
    const current = algorithm === 'bfs' ? container.shift() : container.pop();
    inContainer.delete(current);
    if (seen.has(current)) continue;
    seen.add(current);
    visited.push(current);

    const pushed = [];
    adj[current].forEach(({ node: nb }) => {
      if (seen.has(nb) || inContainer.has(nb)) return;
      container.push(nb);
      inContainer.add(nb);
      pushed.push(nb);
      if (dist[nb] === undefined) dist[nb] = dist[current] + 1;
    });

    steps.push({
      current,
      container: container.slice(),
      visited: visited.slice(),
      pushed,
      depth: dist[current]
    });
  }

  return { steps, visited, dist, unreached: graph.nodes.filter((n) => !seen.has(n)) };
}

/* --- Dijkstra, P3 f27 ------------------------------------------------------ */

function dijkstra(graph, source, target) {
  const adj = adjacency(graph);
  const dist = {};
  const prev = {};
  const connected = {};
  graph.nodes.forEach((n) => { dist[n] = INF; prev[n] = null; connected[n] = false; });
  dist[source] = 0;

  const steps = [{
    description: `Initialise: Dist(${source}) = 0, every other Dist is infinity, and nothing is connected yet.`,
    p: null, dist: { ...dist }, connected: { ...connected }, prev: { ...prev }, relaxed: []
  }];

  let guard = 0;
  while (guard++ < 500) {
    let p = null;
    graph.nodes.forEach((n) => {
      if (connected[n] || dist[n] === INF) return;
      if (p === null || dist[n] < dist[p]) p = n;
    });
    if (p === null) {
      steps.push({
        description: 'No unconnected node has a finite distance left, so the algorithm stops.',
        p: null, dist: { ...dist }, connected: { ...connected }, prev: { ...prev }, relaxed: [], halted: true
      });
      break;
    }

    connected[p] = true;
    const relaxed = [];
    adj[p].forEach(({ node: x, w }) => {
      if (connected[x]) return;
      const candidate = dist[p] + w;
      if (candidate < dist[x]) {
        relaxed.push({ node: x, from: dist[x], to: candidate, via: w });
        dist[x] = candidate;
        prev[x] = p;
      }
    });

    steps.push({
      description: `Connect ${p} at distance ${dist[p]}` +
        (relaxed.length
          ? `; relaxing its edges lowers ${joinList(relaxed.map((r) => `${r.node} from ${r.from === INF ? 'infinity' : r.from} to ${r.to}`))}.`
          : '; no neighbour distance improves.'),
      p, dist: { ...dist }, connected: { ...connected }, prev: { ...prev }, relaxed
    });

    if (target && p === target) break;
    if (graph.nodes.every((n) => connected[n] || dist[n] === INF)) break;
  }

  return { steps, dist, prev, connected };
}

function pathTo(prev, source, node) {
  const out = [];
  let cur = node;
  let guard = 0;
  while (cur && guard++ < 200) {
    out.unshift(cur);
    if (cur === source) return out;
    cur = prev[cur];
  }
  return null;
}

/* --- Kruskal with a real union-find, P4 f9 / f10 --------------------------- */

function makeUnionFind(nodes) {
  const parent = {};
  const rank = {};
  nodes.forEach((n) => { parent[n] = n; rank[n] = 0; });
  function find(x) {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    let cur = x;
    while (parent[cur] !== cur) { const next = parent[cur]; parent[cur] = root; cur = next; }
    return root;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[rb] < rank[ra]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra] += 1; }
    return true;
  }
  return { find, union, parent };
}

function kruskal(graph) {
  const sorted = edgeRecords(graph).slice().sort((a, b) => (
    a.w - b.w || (a.u < b.u ? -1 : a.u > b.u ? 1 : 0) || (a.v < b.v ? -1 : 1)
  ));
  const uf = makeUnionFind(graph.nodes);
  const tree = [];
  const steps = [];
  const stepByEdge = {};
  let total = 0;

  /* The pseudocode of P4 f9 stops the moment the tree holds N - 1 edges, so
     the trace never lists the edges after that. On a disconnected graph the
     loop simply runs out of edges instead, and what comes back is a forest. */
  for (let i = 0; i < sorted.length; i += 1) {
    const edge = sorted[i];
    const ru = uf.find(edge.u);
    const rv = uf.find(edge.v);
    const added = ru !== rv;
    if (added) {
      uf.union(edge.u, edge.v);
      tree.push(edge);
      total += edge.w;
    }
    stepByEdge[edge.i] = steps.length;
    steps.push({
      index: steps.length,
      edge,
      added,
      rootU: ru,
      rootV: rv,
      tree: tree.slice(),
      total,
      description: added
        ? `Add ${edge.u}${edge.v} at length ${edge.w}: ${edge.u} sits in set ${ru} and ${edge.v} in set ${rv}, so the two pieces merge. Running total ${total}.`
        : `Reject ${edge.u}${edge.v} at length ${edge.w}: both ends already sit in set ${ru}, so it would close a cycle. Running total stays ${total}.`
    });
    if (tree.length === graph.nodes.length - 1) break;
  }

  const components = new Set(graph.nodes.map((n) => uf.find(n))).size;
  return { sorted, steps, stepByEdge, tree, total, components };
}

/* --- permutations, P4 f19 (random) and P4 f20 (next) ----------------------- */

function nextPermutation(p) {
  const n = p.length;
  let I = -1;
  for (let i = n - 2; i >= 0; i -= 1) { if (p[i] < p[i + 1]) { I = i; break; } }
  if (I === -1) return null;
  let J = -1;
  for (let j = n - 1; j > I; j -= 1) { if (p[I] < p[j]) { J = j; break; } }
  const swapped = p.slice();
  const tmp = swapped[I];
  swapped[I] = swapped[J];
  swapped[J] = tmp;
  const head = swapped.slice(0, I + 1);
  const tail = swapped.slice(I + 1).reverse();
  return { perm: head.concat(tail), afterSwap: swapped, I: I + 1, J: J + 1 };
}

function allPermutations(n) {
  let p = Array.from({ length: n }, (_, i) => i + 1);
  const out = [{ perm: p.slice(), I: null, J: null, afterSwap: null }];
  let guard = 0;
  while (guard++ < 5000) {
    const next = nextPermutation(p);
    if (!next) break;
    out.push({ perm: next.perm.slice(), I: next.I, J: next.J, afterSwap: next.afterSwap.slice() });
    p = next.perm;
  }
  return out;
}

function randomPermutation(n, seed) {
  const rand = seededRandom(seed);
  const p = Array.from({ length: n }, (_, i) => i + 1);
  const steps = [{ I: null, J: null, perm: p.slice(), description: `Initialise P to 1 through ${n}.` }];
  for (let I = n; I >= 2; I -= 1) {
    const J = Math.floor(rand() * I) + 1;
    const tmp = p[I - 1];
    p[I - 1] = p[J - 1];
    p[J - 1] = tmp;
    steps.push({
      I, J, perm: p.slice(),
      description: J === I
        ? `I = ${I}: the random J came out as ${J}, so P(${I}) swaps with itself and nothing moves. P is now ${p.join(' ')}.`
        : `I = ${I}: swap P(${I}) with P(${J}). P is now ${p.join(' ')}.`
    });
  }
  return steps;
}

/* --- TSP ------------------------------------------------------------------- */

function distanceTable(graph) {
  const d = {};
  graph.nodes.forEach((u) => { d[u] = {}; graph.nodes.forEach((v) => { d[u][v] = u === v ? 0 : INF; }); });
  edgeRecords(graph).forEach(({ u, v, w }) => { d[u][v] = w; d[v][u] = w; });
  return d;
}

function tourLength(order, d) {
  let total = 0;
  for (let i = 0; i < order.length; i += 1) {
    const a = order[i];
    const b = order[(i + 1) % order.length];
    total += d[a][b];
  }
  return total;
}

function bruteForceTours(graph, start, collapse) {
  const d = distanceTable(graph);
  const others = graph.nodes.filter((n) => n !== start);
  const perms = allPermutations(others.length).map((entry) => entry.perm.map((i) => others[i - 1]));
  const tours = [];
  let best = null;
  perms.forEach((rest) => {
    if (collapse && rest.length > 1 && rest[0] > rest[rest.length - 1]) return;
    const order = [start].concat(rest);
    const length = tourLength(order, d);
    const improved = best === null || length < best;
    if (improved) best = length;
    tours.push({ order, length, bestSoFar: best, improved });
  });
  return { tours, best, totalPermutations: perms.length };
}

function nearestNeighbourTour(graph, start) {
  const d = distanceTable(graph);
  const remaining = new Set(graph.nodes.filter((n) => n !== start));
  const order = [start];
  const legs = [];
  let cur = start;
  let total = 0;
  while (remaining.size > 0) {
    let best = null;
    remaining.forEach((n) => {
      if (best === null || d[cur][n] < d[cur][best] || (d[cur][n] === d[cur][best] && n < best)) best = n;
    });
    legs.push({ from: cur, to: best, w: d[cur][best] });
    total += d[cur][best];
    order.push(best);
    remaining.delete(best);
    cur = best;
  }
  legs.push({ from: cur, to: start, w: d[cur][start], home: true });
  total += d[cur][start];
  return { order, legs, total };
}

function twoOpt(graph, order) {
  const d = distanceTable(graph);
  const moves = [];
  let best = order.slice();
  let bestLength = tourLength(best, d);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 100) {
    improved = false;
    for (let i = 1; i < best.length - 1 && !improved; i += 1) {
      for (let j = i + 1; j < best.length && !improved; j += 1) {
        const candidate = best.slice(0, i)
          .concat(best.slice(i, j + 1).reverse())
          .concat(best.slice(j + 1));
        const length = tourLength(candidate, d);
        if (length < bestLength - 1e-9) {
          moves.push({ from: best.slice(), to: candidate.slice(), i, j, before: bestLength, after: length });
          best = candidate;
          bestLength = length;
          improved = true;
        }
      }
    }
  }
  return { moves, order: best, length: bestLength };
}

/* ==========================================================================
   4. Demo 1 — Eulerian path checker (topics 3.1.1, 3.1.5, 3.1.6)
   ========================================================================== */

createDemo('#demo-euler-check-mount', {
  id: 'demo-euler-check',
  title: 'Eulerian path checker',
  description: "Euler's rule, applied one node at a time: count the edges at each node, "
    + 'count how many of those counts are odd, and read off the verdict.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Figure to test',
      options: graphOptions(['konigsberg', 'envelope', 'crossedsquare', 'simple']),
      value: 'konigsberg',
      help: 'Königsberg is the 1735 puzzle. The envelope and the crossed square are two of the pen-and-paper figures on the slides.'
    }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    return Object.assign({ graph }, eulerCheck(graph));
  },

  steps: {
    count: (m) => m.rows.length + 1,
    label: (m, i) => {
      if (i >= m.rows.length) {
        return m.verdict === 'circuit'
          ? `No node has an odd degree, so the figure can be drawn in one stroke that ends where it started.`
          : m.verdict === 'path'
            ? `Exactly 2 nodes have an odd degree, so the figure can be drawn in one stroke, starting at one odd node and finishing at the other.`
            : `${m.odd} nodes have an odd degree. Because that is neither 0 nor 2, the figure cannot be drawn without lifting the pen.`;
      }
      const r = m.rows[i];
      return `Node ${r.node} has degree ${r.degree}, which is ${r.odd ? 'odd' : 'even'}. `
        + `The running count of odd-degree nodes is now ${r.oddSoFar}.`;
    }
  },

  figure(model, ctx) {
    const done = Math.min(ctx.step, model.rows.length);
    const currentNode = ctx.step < model.rows.length ? model.rows[ctx.step].node : null;
    return drawGraph(model.graph, {
      nodeState: (n) => {
        if (n === currentNode) return 'current';
        const i = model.graph.nodes.indexOf(n);
        return i < done ? 'done' : 'plain';
      },
      nodeNote: (n) => {
        const i = model.graph.nodes.indexOf(n);
        if (i > Math.min(ctx.step, model.rows.length - 1)) return '';
        return `${model.rows[i].degree} · ${model.rows[i].odd ? 'odd' : 'even'}`;
      },
      edgeLabel: () => null
    });
  },

  figureAlt(model, ctx) {
    const name = model.graph.label.split(' — ')[0];
    if (ctx.step >= model.rows.length) {
      return `${name}, all degrees counted: ${model.odd} of ${model.rows.length} nodes have an odd degree, so `
        + (model.verdict === 'impossible'
          ? 'no Eulerian path exists.'
          : model.verdict === 'circuit'
            ? 'an Eulerian circuit exists.'
            : 'an Eulerian path exists between the two odd nodes.');
    }
    const r = model.rows[ctx.step];
    return `${name}: node ${r.node} is highlighted and has degree ${r.degree}, an ${r.odd ? 'odd' : 'even'} number. `
      + (ctx.step === 0
        ? 'It is the first node counted, so the running odd count is now ' + r.oddSoFar + '.'
        : `${ctx.step} node${ctx.step === 1 ? '' : 's'} were already counted; the running odd count is now ${r.oddSoFar}.`);
  },

  table(model, ctx) {
    const done = Math.min(ctx.step, model.rows.length);
    const seen = Math.min(ctx.step, model.rows.length - 1);
    return {
      caption: `Degree of every node, after ${done} of ${model.rows.length} nodes have been counted`,
      rowHeader: true,
      columns: [
        { label: 'Node' },
        { label: 'Degree', numeric: true },
        { label: 'Even or odd' },
        { label: 'Odd-degree nodes so far', numeric: true }
      ],
      rows: model.rows.map((r, i) => ({
        cells: [
          r.node,
          i <= seen ? r.degree : '—',
          i <= seen ? (r.odd ? 'odd' : 'even') : 'not counted yet',
          i <= seen ? r.oddSoFar : '—'
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const lines = [];
    const name = model.graph.label.split(' — ')[0];
    if (ctx.step < model.rows.length) {
      const left = model.rows.length - ctx.step - 1;
      lines.push(left === 0
        ? 'That was the last node. Take one more step for the verdict.'
        : `${left} node${left === 1 ? '' : 's'} still to count: ${joinList(model.rows.slice(ctx.step + 1).map((x) => x.node))}.`);
    } else {
      lines.push(`${name} has ${model.odd} odd-degree node${model.odd === 1 ? '' : 's'} out of ${model.rows.length}.`);
      lines.push(model.verdict === 'circuit'
        ? 'Because that count is 0, an Eulerian circuit exists: start anywhere, use every edge once, and finish where you started.'
        : model.verdict === 'path'
          ? `Because that count is 2, an Eulerian path exists: start at ${joinList(model.rows.filter((r) => r.odd).map((r) => r.node))} and finish at the other one.`
          : `Because that count is neither 0 nor 2, no Eulerian path exists. This is exactly Euler's 1735 answer for the seven bridges of Königsberg.`);
    }
    if (model.isolated.length) {
      lines.push(`Node${model.isolated.length === 1 ? '' : 's'} ${joinList(model.isolated)} ha${model.isolated.length === 1 ? 's' : 've'} degree 0 and no edges to trace, so the rule is applied to the part of the figure that has edges.`);
    }
    return lines;
  }
});

/* ==========================================================================
   5. Demo 2 — the five representations (topics 3.2.1–3.2.7)
   ========================================================================== */

createDemo('#demo-representations-mount', {
  id: 'demo-representations',
  title: 'One graph, five representations',
  description: 'Pick a graph and a representation. The same graph is rewritten as an edge list, '
    + 'an adjacency matrix, an adjacency structure, an incidence matrix or a GRF file, '
    + 'and the storage cost of each is reported in words.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['simple', 'disconnected', 'konigsberg', 'wtgraph']),
      value: 'simple'
    },
    {
      type: 'select', name: 'rep', label: 'Representation',
      options: [
        { value: 'edges', label: 'Edge list' },
        { value: 'matrix', label: 'Adjacency matrix' },
        { value: 'structure', label: 'Adjacency structure (adjacency list)' },
        { value: 'incidence', label: 'Incidence matrix' },
        { value: 'grf', label: 'GRF file' }
      ],
      value: 'edges',
      help: 'The GRF format only exists for graphs that carry drawing coordinates.'
    }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const records = edgeRecords(graph);
    const adj = adjacency(graph);
    const N = graph.nodes.length;
    const M = records.length;
    return {
      graph, records, adj, N, M,
      matrix: adjacencyMatrix(graph),
      deg: degrees(graph),
      rep: values.rep,
      costs: {
        matrix: N * N,
        edges: 2 * M,
        structure: N + 2 * M,
        incidence: M * N
      }
    };
  },

  figure(model) {
    return drawGraph(model.graph, {
      nodeNote: (n) => `deg ${model.deg[n]}`,
      edgeLabel: (e) => (model.graph.weighted ? String(e.w) : null)
    });
  },

  figureAlt(model) {
    const isolated = model.graph.nodes.filter((n) => model.deg[n] === 0);
    const names = {
      edges: 'edge list', matrix: 'adjacency matrix', structure: 'adjacency structure',
      incidence: 'incidence matrix', grf: 'GRF file'
    };
    return `${model.graph.label.split(' — ')[0]}: ${model.N} nodes and ${model.M} edges, each node labelled with its degree`
      + (isolated.length ? `; ${joinList(isolated)} ha${isolated.length === 1 ? 's' : 've'} no edges at all` : '')
      + `. The table beside it holds the same graph as an ${names[model.rep]}.`;
  },

  table(model) {
    const g = model.graph;
    if (model.rep === 'edges') {
      return {
        caption: `${g.label.split(' — ')[0]} as an edge list: ${model.M} rows, one per edge`,
        rowHeader: true,
        columns: [{ label: 'Edge' }, { label: 'From' }, { label: 'To' }]
          .concat(g.weighted ? [{ label: 'Weight', unit: unitOf(g), numeric: true }] : []),
        rows: model.records.map((e) => ({
          cells: [`${e.i + 1}`, e.u, e.v].concat(g.weighted ? [e.w] : [])
        }))
      };
    }

    if (model.rep === 'matrix') {
      return {
        caption: `${g.label.split(' — ')[0]} as an adjacency matrix: ${model.N} by ${model.N}, entry 1 where two nodes are joined`,
        rowHeader: true,
        columns: [{ label: 'Row node' }].concat(g.nodes.map((n) => ({ label: n, numeric: true }))),
        rows: g.nodes.map((n, i) => ({ cells: [n].concat(model.matrix[i]) }))
      };
    }

    if (model.rep === 'structure') {
      return {
        caption: `${g.label.split(' — ')[0]} as an adjacency structure: one sublist of neighbours per node`,
        rowHeader: true,
        columns: [{ label: 'Node' }, { label: 'Sublist of neighbours' }, { label: 'Length of the sublist', numeric: true }],
        rows: g.nodes.map((n) => ({
          cells: [n, model.adj[n].length ? model.adj[n].map((a) => a.node).join(', ') : 'empty set', model.adj[n].length]
        }))
      };
    }

    if (model.rep === 'incidence') {
      return {
        caption: `${g.label.split(' — ')[0]} as an incidence matrix: ${model.M} rows of edges by ${model.N} columns of nodes`,
        rowHeader: true,
        columns: [{ label: 'Edge' }].concat(g.nodes.map((n) => ({ label: n, numeric: true }))),
        rows: model.records.map((e) => ({
          cells: [`${e.u}${e.v}`].concat(g.nodes.map((n) => (n === e.u || n === e.v ? 1 : 0)))
        }))
      };
    }

    const grf = g.grf;
    return {
      caption: grf
        ? `${g.label.split(' — ')[0]} as a GRF file: one line per node, index, x, y, then its neighbours`
        : `${g.label.split(' — ')[0]} as a GRF file, using the drawing coordinates of the figure`,
      rowHeader: true,
      columns: [
        { label: 'Node index i', numeric: true }, { label: 'Label' },
        { label: 'x', numeric: true }, { label: 'y', numeric: true }, { label: 'Neighbours n1 … nk' }
      ],
      rows: g.nodes.map((n, i) => {
        const coords = grf ? grf[n] : [Math.round(g.pos[n][0] / 10) / 10, Math.round(g.pos[n][1] / 10) / 10];
        const nb = model.adj[n].map((a) => g.nodes.indexOf(a.node) + 1);
        return { cells: [i + 1, n, coords[0], coords[1], nb.length ? nb.join(' ') : '(none)'] };
      })
    };
  },

  summary(model) {
    const g = model.graph;
    const c = model.costs;
    const lines = [
      `${g.label.split(' — ')[0]} has N = ${model.N} nodes and M = ${model.M} edges.`,
      `Storage: adjacency matrix ${c.matrix} entries (N squared), edge list ${c.edges} entries (2M), `
        + `adjacency structure about ${c.structure} entries (N + 2M), incidence matrix ${c.incidence} entries (M times N).`
    ];
    if (model.rep === 'edges') {
      const isolated = g.nodes.filter((n) => model.deg[n] === 0);
      lines.push(isolated.length
        ? `Watch what the edge list loses: ${joinList(isolated)} appear${isolated.length === 1 ? 's' : ''} nowhere in it, because an edge list can only name nodes that have an edge.`
        : 'Every node in this graph has at least one edge, so nothing is lost by the edge list here.');
    }
    if (model.rep === 'matrix') {
      const ones = model.matrix.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
      lines.push(`The matrix holds ${c.matrix} entries but only ${ones} of them are non-zero — that is what "sparse" means, `
        + `and it is why the ${model.M}-row edge list carries the same information in less space.`);
    }
    if (model.rep === 'structure') {
      lines.push('Neighbour lookup is the fast operation here: reading the sublist of a node costs about as much as its degree, '
        + 'while the adjacency matrix would scan a whole row of N entries.');
    }
    if (model.rep === 'incidence') {
      lines.push('Rows describe edges and columns describe nodes, following the convention in the slides. '
        + 'Every row has exactly two ones, because every edge touches exactly two nodes.');
    }
    if (model.rep === 'grf') {
      lines.push('GRF exists for drawing, not for computing: it is the adjacency structure with x and y coordinates bolted on, '
        + 'so a program can lay the picture out the same way twice.');
    }
    return lines;
  }
});

/* ==========================================================================
   6. Demo 3 — the connection algorithm (topics 3.3.6, 3.3.7, 3.3.8)
   ========================================================================== */

createDemo('#demo-connection-algorithm-mount', {
  id: 'demo-connection-algorithm',
  title: 'The connection algorithm, set by set',
  description: 'Three sets — used, new and untouched — and one rule: take a node out of new, '
    + 'put it in used, and move any untouched neighbour into new. Switch on component mode to run '
    + 'the modified version that labels every component instead of stopping at a target.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['disconnected', 'simple', 'maze07']),
      value: 'disconnected'
    },
    { type: 'select', name: 'source', label: 'Start node A', options: nodeOptions(GRAPHS.disconnected), value: 'A' },
    { type: 'select', name: 'target', label: 'Target node B', options: nodeOptions(GRAPHS.disconnected), value: 'E' },
    {
      type: 'checkbox', name: 'components', value: false,
      label: 'Component mode: run the modified algorithm over the whole graph',
      help: 'The modified algorithm drops the "if you reach B you have succeeded" line, so it keeps going until every node is labelled.'
    }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const source = graph.nodes.includes(values.source) ? values.source : graph.nodes[0];
    const target = graph.nodes.includes(values.target) ? values.target : graph.nodes[graph.nodes.length - 1];
    const run = connectionAlgorithm(graph, source, target, values.components);
    return { graph, source, target, componentsMode: Boolean(values.components), run };
  },

  steps: {
    count: (m) => m.run.steps.length,
    label: (m, i) => m.run.steps[i].description
  },

  figure(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    return drawGraph(model.graph, {
      nodeState: (n) => {
        if (n === step.current) return 'current';
        if (step.set[n] === 'used') return 'done';
        if (step.set[n] === 'new') return 'frontier';
        return 'plain';
      },
      nodeNote: (n) => (model.componentsMode && step.component[n]
        ? `${step.set[n]} · c${step.component[n]}`
        : step.set[n]),
      edgeState: (e) => ((step.set[e.u] === 'used' && step.set[e.v] !== 'untouched')
        || (step.set[e.v] === 'used' && step.set[e.u] !== 'untouched') ? 'chosen' : 'plain'),
      edgeLabel: () => null
    });
  },

  figureAlt(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const count = (name) => model.graph.nodes.filter((n) => step.set[n] === name).length;
    return `Step ${ctx.step + 1} of ${model.run.steps.length}: `
      + (step.current ? `node ${step.current} is the one being processed. ` : 'no node is being processed. ')
      + `used holds ${count('used')} node${count('used') === 1 ? '' : 's'}, `
      + `new holds ${count('new')}, and untouched holds ${count('untouched')}.`;
  },

  table(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const columns = [{ label: 'Node' }, { label: 'used', numeric: true }, { label: 'new', numeric: true }, { label: 'untouched', numeric: true }];
    if (model.componentsMode) columns.push({ label: 'Component' });
    return {
      caption: `The three sets as bit vectors, after step ${ctx.step + 1} of ${model.run.steps.length}`
        + (model.componentsMode ? ', with the component label assigned so far' : ''),
      rowHeader: true,
      columns,
      rows: model.graph.nodes.map((n) => ({
        cells: [
          n,
          step.set[n] === 'used' ? 1 : 0,
          step.set[n] === 'new' ? 1 : 0,
          step.set[n] === 'untouched' ? 1 : 0
        ].concat(model.componentsMode ? [step.component[n] === null ? '—' : `component ${step.component[n]}`] : []),
        current: n === step.current
      }))
    };
  },

  summary(model, ctx) {
    // demo.js already prints the step label above this; do not repeat it.
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const lines = [];
    const used = model.graph.nodes.filter((n) => step.set[n] === 'used');
    const fresh = model.graph.nodes.filter((n) => step.set[n] === 'new');
    lines.push(`used = {${used.join(', ') || 'empty'}}; new = {${fresh.join(', ') || 'empty'}}.`);
    if (!model.componentsMode) {
      if (step.outcome === 'succeeded') {
        lines.push(`A path exists from ${model.source} to ${model.target}. Note what the algorithm has NOT told you: `
          + 'it answers "is there a path", and you need the predecessor of each node to print the path itself.');
      } else if (step.outcome === 'failed') {
        lines.push(`No path exists from ${model.source} to ${model.target}: new emptied out first. `
          + 'That failure is useful — it means the two nodes sit in different components.');
      }
    } else if (step.outcome === 'done') {
      lines.push(`Every node now carries a component label, so the graph has ${step.c} connected component${step.c === 1 ? '' : 's'}.`);
    }
    return lines;
  }
});

/* ==========================================================================
   7. Demo 4 — counting walks and counting paths (topics 3.3.9, 3.3.10)
   ========================================================================== */

createDemo('#demo-walk-counter-mount', {
  id: 'demo-walk-counter',
  title: 'Counting walks with matrix powers, and counting paths by hand',
  description: 'Raise the adjacency matrix to the power k and every entry counts the walks of length k. '
    + 'Switch to path mode and the same graph is searched for paths instead — which the matrix trick cannot do.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['simple', 'disconnected', 'konigsberg']),
      value: 'simple'
    },
    {
      type: 'radio', name: 'mode', label: 'What to count',
      options: [
        { value: 'walks', label: 'Walks of length k (matrix power)' },
        { value: 'paths', label: 'Paths, no node repeated (search)' }
      ],
      value: 'walks'
    },
    { type: 'select', name: 'from', label: 'From node', options: nodeOptions(GRAPHS.simple), value: 'A' },
    { type: 'select', name: 'to', label: 'To node', options: nodeOptions(GRAPHS.simple), value: 'D' },
    {
      type: 'range', name: 'kmax', label: 'Highest power of A to compute',
      min: 2, max: 6, step: 1, value: 4, unit: 'steps',
      valueText: (v) => `${v} steps`,
      help: 'In walk mode the playback runs k from 1 up to this value.'
    }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const from = graph.nodes.includes(values.from) ? values.from : graph.nodes[0];
    const to = graph.nodes.includes(values.to) ? values.to : graph.nodes[graph.nodes.length - 1];
    const A = adjacencyMatrix(graph);
    const kmax = Math.max(2, Math.min(6, Number(values.kmax) || 4));
    const powers = matPowers(A, kmax);
    const { paths, total } = simplePaths(graph, from, to, 40);
    const pairs = new Set(edgeRecords(graph).map((e) => [e.u, e.v].sort().join('|')));
    return {
      graph, from, to, mode: values.mode, kmax, powers, A,
      paths, totalPaths: total,
      parallel: pairs.size < graph.edges.length,
      index: graph.nodes.reduce((acc, n, i) => Object.assign(acc, { [n]: i }), {})
    };
  },

  steps: {
    count: (m) => (m.mode === 'walks' ? m.kmax : Math.max(1, m.paths.length)),
    label: (m, i) => {
      if (m.mode === 'walks') {
        const k = i + 1;
        const row = m.powers[i][m.index[m.from]];
        const hit = row[m.index[m.to]];
        return `A to the power ${k}. There ${hit === 1 ? 'is' : 'are'} ${hit} walk${hit === 1 ? '' : 's'} `
          + `of length ${k} from ${m.from} to ${m.to}, and ${row.reduce((a, b) => a + b, 0)} walks of length ${k} leaving ${m.from} in total.`;
      }
      if (m.paths.length === 0) return `There is no path from ${m.from} to ${m.to} at all: they sit in different components.`;
      const p = m.paths[i];
      return `Path ${i + 1} of ${m.totalPaths}: ${p.nodes.join('-')}, using ${p.nodes.length - 1} edge${p.nodes.length === 2 ? '' : 's'}`
        + (m.graph.weighted ? ` for a total length of ${p.length}.` : '.');
    }
  },

  figure(model, ctx) {
    if (model.mode === 'walks') {
      const k = ctx.step + 1;
      const row = model.powers[ctx.step][model.index[model.from]];
      return drawGraph(model.graph, {
        nodeState: (n) => (n === model.from ? 'current' : row[model.index[n]] > 0 ? 'done' : 'plain'),
        nodeNote: (n) => `${row[model.index[n]]} in ${k}`,
        edgeLabel: () => null
      });
    }
    const p = model.paths[Math.min(ctx.step, Math.max(0, model.paths.length - 1))];
    const onPath = new Set();
    if (p) {
      for (let i = 0; i < p.nodes.length - 1; i += 1) {
        onPath.add([p.nodes[i], p.nodes[i + 1]].sort().join('|'));
      }
    }
    return drawGraph(model.graph, {
      nodeState: (n) => {
        if (!p) return 'plain';
        if (n === model.from || n === model.to) return 'current';
        return p.nodes.includes(n) ? 'done' : 'plain';
      },
      nodeNote: (n) => {
        if (!p) return '';
        const i = p.nodes.indexOf(n);
        return i === -1 ? '' : `visit ${i + 1}`;
      },
      edgeState: (e) => (onPath.has([e.u, e.v].sort().join('|')) ? 'chosen' : 'faded'),
      edgeLabel: () => null
    });
  },

  figureAlt(model, ctx) {
    if (model.mode === 'walks') {
      const k = ctx.step + 1;
      const row = model.powers[ctx.step][model.index[model.from]];
      const reachable = model.graph.nodes.filter((n) => row[model.index[n]] > 0);
      return `Walks of length ${k} leaving ${model.from}: ${reachable.length} of ${model.graph.nodes.length} nodes are reachable `
        + `(${joinList(reachable)}), and ${row[model.index[model.to]]} of those walks end at ${model.to}.`;
    }
    if (model.paths.length === 0) {
      return `${model.graph.label.split(' — ')[0]}: no path joins ${model.from} to ${model.to}, so no edge is highlighted.`;
    }
    const p = model.paths[Math.min(ctx.step, model.paths.length - 1)];
    return `Path ${Math.min(ctx.step, model.paths.length - 1) + 1} of ${model.totalPaths} drawn as a thick line: `
      + `${p.nodes.join(' then ')}, ${p.nodes.length - 1} edges.`;
  },

  table(model, ctx) {
    if (model.mode === 'walks') {
      const k = ctx.step + 1;
      const P = model.powers[ctx.step];
      return {
        caption: `A to the power ${k}: entry in row i and column j counts the walks of length ${k} from node i to node j`,
        rowHeader: true,
        columns: [{ label: 'From \\ to' }].concat(model.graph.nodes.map((n) => ({ label: n, numeric: true }))),
        rows: model.graph.nodes.map((n, i) => ({ cells: [n].concat(P[i]), current: n === model.from }))
      };
    }
    return {
      caption: `Every path from ${model.from} to ${model.to} with no node repeated`
        + (model.totalPaths > model.paths.length ? ` (first ${model.paths.length} of ${model.totalPaths})` : ` (${model.totalPaths} in total)`),
      rowHeader: true,
      columns: [
        { label: 'Path' }, { label: 'Nodes in visit order' },
        { label: 'Edges used', numeric: true }
      ].concat(model.graph.weighted ? [{ label: 'Length', unit: unitOf(model.graph), numeric: true }] : []),
      rows: model.paths.length === 0
        ? [{ cells: ['—', 'no path exists', 0].concat(model.graph.weighted ? ['—'] : []) }]
        : model.paths.map((p, i) => ({
          cells: [`${i + 1}`, p.nodes.join('-'), p.nodes.length - 1]
            .concat(model.graph.weighted ? [p.length] : []),
          current: i === ctx.step
        }))
    };
  },

  summary(model, ctx) {
    if (model.mode === 'walks') {
      const k = ctx.step + 1;
      const P = model.powers[ctx.step];
      const hit = P[model.index[model.from]][model.index[model.to]];
      const zeros = P.reduce((count, row) => count + row.filter((v) => v === 0).length, 0);
      const reachable = model.graph.nodes.filter((n, i) => P[model.index[model.from]][i] > 0);
      const lines = [
        `${reachable.length} of ${model.graph.nodes.length} nodes can be reached from ${model.from} in exactly ${k} step${k === 1 ? '' : 's'}: ${joinList(reachable)}.`,
        'A walk may reuse an edge and revisit a node, which is why these counts grow so fast.'
      ];
      if (k === model.graph.nodes.length - 1) {
        lines.push(zeros === 0
          ? `Every entry of A to the power N minus 1 is non-zero, which the slides give as the test for a connected graph.`
          : `${zeros} entries of A to the power N minus 1 are still zero, so this graph is not connected. `
            + 'Be careful with that test though: a connected graph can also have zeros here, so the honest version sums the powers A to the 0 through A to the N minus 1.');
      }
      return lines;
    }
    const lines = [
      model.totalPaths === 0
        ? `There is no path from ${model.from} to ${model.to}.`
        : `There ${model.totalPaths === 1 ? 'is' : 'are'} ${model.totalPaths} path${model.totalPaths === 1 ? '' : 's'} from ${model.from} to ${model.to} with no node repeated.`
    ];
    if (model.paths.length) {
      const p = model.paths[Math.min(ctx.step, model.paths.length - 1)];
      lines.push(`Showing ${p.nodes.join('-')}, which uses ${p.nodes.length - 1} edge${p.nodes.length === 2 ? '' : 's'}`
        + (model.graph.weighted ? ` and measures ${amount(p.length, model.graph)}.` : '.'));
    }
    lines.push('The matrix trick counts walks, not paths. Paths have to be searched for, and the search is guaranteed to stop '
      + `because no path can use more than N minus 1 = ${model.graph.nodes.length - 1} edges.`);
    if (model.parallel) {
      lines.push('This graph has parallel edges, so the same list of nodes can appear twice: two bridges between the same pair '
        + 'of landmasses are two different paths, even though they read the same.');
    }
    return lines;
  }
});

/* ==========================================================================
   8. Demo 5 — DFS and BFS (topics 3.4.1–3.4.7, and 3.2.9 through the maze)
   ========================================================================== */

createDemo('#demo-traversal-mount', {
  id: 'demo-traversal',
  title: 'Depth-first and breadth-first search, step by step',
  description: 'The same graph, the same start, one difference: DFS takes the last item off the stack '
    + 'and BFS takes the first item off the queue. Watch the visit order change.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['museum', 'maze07', 'simple', 'disconnected']),
      value: 'museum'
    },
    {
      type: 'radio', name: 'algorithm', label: 'Algorithm',
      options: [
        { value: 'dfs', label: 'Depth-first search — stack, last in first out' },
        { value: 'bfs', label: 'Breadth-first search — queue, first in first out' }
      ],
      value: 'dfs'
    },
    { type: 'select', name: 'start', label: 'Start node', options: nodeOptions(GRAPHS.museum), value: 'Q' }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const start = graph.nodes.includes(values.start) ? values.start : graph.nodes[0];
    const run = traverse(graph, start, values.algorithm);
    const other = traverse(graph, start, values.algorithm === 'dfs' ? 'bfs' : 'dfs');
    return { graph, start, algorithm: values.algorithm, run, other };
  },

  steps: {
    count: (m) => Math.max(1, m.run.steps.length),
    label: (m, i) => {
      const s = m.run.steps[i];
      const box = m.algorithm === 'dfs' ? 'stack' : 'queue';
      return `Visit ${s.current}` +
        (s.pushed.length
          ? `, then add ${joinList(s.pushed)} to the ${box}.`
          : `; it had no unvisited neighbours to add, so the ${box} shrinks.`) +
        ` The ${box} now holds ${s.container.length ? s.container.join(' ') : 'nothing'}.`;
    }
  },

  figure(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const order = {};
    step.visited.forEach((n, i) => { order[n] = i + 1; });
    const inBox = new Set(step.container);
    return drawGraph(model.graph, {
      nodeState: (n) => {
        if (n === step.current) return 'current';
        if (order[n]) return 'done';
        return inBox.has(n) ? 'frontier' : 'plain';
      },
      nodeNote: (n) => {
        if (order[n]) return `visit ${order[n]}`;
        return inBox.has(n) ? 'waiting' : '';
      },
      edgeState: (e) => (order[e.u] && order[e.v] ? 'chosen' : 'plain'),
      edgeLabel: () => null
    });
  },

  figureAlt(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const box = model.algorithm === 'dfs' ? 'stack' : 'queue';
    return `${model.algorithm === 'dfs' ? 'Depth-first' : 'Breadth-first'} search, step ${ctx.step + 1} of ${model.run.steps.length}: `
      + `${step.current} has just been visited, ${step.visited.length} of ${model.graph.nodes.length} nodes are now visited, `
      + `and the ${box} holds ${step.container.length ? step.container.join(', ') : 'nothing'}.`;
  },

  table(model, ctx) {
    const box = model.algorithm === 'dfs' ? 'Stack after this step' : 'Queue after this step';
    return {
      caption: `${model.algorithm === 'dfs' ? 'Depth-first' : 'Breadth-first'} search from ${model.start}: `
        + `visit order and container contents, step ${ctx.step + 1} of ${model.run.steps.length}`,
      rowHeader: true,
      columns: [
        { label: 'Step', numeric: true }, { label: 'Node visited' },
        { label: 'Added this step' }, { label: box },
        { label: 'Edges from the start', numeric: true }
      ],
      rows: model.run.steps.map((s, i) => ({
        cells: [
          i + 1, s.current,
          s.pushed.length ? s.pushed.join(' ') : 'none',
          s.container.length ? s.container.join(' ') : 'empty',
          s.depth
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const box = model.algorithm === 'dfs' ? 'stack (last in, first out)' : 'queue (first in, first out)';
    const lines = [
      `Visited so far: ${step.visited.join(', ')}.`,
      `The ${box} holds ${step.container.length ? step.container.join(', ') : 'nothing'}.`
    ];
    if (model.algorithm === 'bfs') {
      lines.push(`${step.current} sits ${step.depth} edge${step.depth === 1 ? '' : 's'} from ${model.start}. `
        + 'Breadth-first search finishes every node at distance k before it touches any node at distance k plus 1, '
        + 'which is why it finds the shortest route when every edge counts the same.');
    } else {
      lines.push('Depth-first search follows one branch to its end and only then backs up, so its visit order says nothing about distance.');
    }
    if (ctx.step === model.run.steps.length - 1) {
      lines.push(`Full order: ${model.run.visited.join(' → ')}. `
        + `The other algorithm on the same graph would visit ${model.other.visited.join(' → ')}.`);
      if (model.run.unreached.length) {
        lines.push(`${joinList(model.run.unreached)} ${model.run.unreached.length === 1 ? 'was' : 'were'} never reached: `
          + 'the graph is not connected, so the search has to be restarted from an unvisited node to find the rest.');
      }
    }
    return lines;
  }
});

/* ==========================================================================
   9. Demo 6 — brute-force shortest path (topics 3.4.4, 3.5.4)
   ========================================================================== */

createDemo('#demo-brute-force-paths-mount', {
  id: 'demo-brute-force-paths',
  title: 'Shortest path by brute force',
  description: 'Generate every path from A to B with a depth-first search, measure each one, '
    + 'and keep the shortest seen so far. Correct, and hopeless on anything bigger than this.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['dijkstraex', 'simple', 'wtgraph']),
      value: 'dijkstraex'
    },
    { type: 'select', name: 'from', label: 'From node', options: nodeOptions(GRAPHS.dijkstraex), value: 'A' },
    { type: 'select', name: 'to', label: 'To node', options: nodeOptions(GRAPHS.dijkstraex), value: 'F' }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const from = graph.nodes.includes(values.from) ? values.from : graph.nodes[0];
    const to = graph.nodes.includes(values.to) ? values.to : graph.nodes[graph.nodes.length - 1];
    const { paths, total } = simplePaths(graph, from, to, 60);
    let best = null;
    const rows = paths.map((p, i) => {
      const isBest = best === null || p.length < best;
      if (isBest) best = p.length;
      return { index: i, nodes: p.nodes, length: p.length, bestSoFar: best, improved: isBest };
    });
    const overallBest = rows.reduce((acc, r) => (acc === null || r.length < acc ? r.length : acc), null);
    return { graph, from, to, rows, total, capped: total > paths.length, overallBest };
  },

  steps: {
    count: (m) => Math.max(1, m.rows.length),
    label: (m, i) => {
      if (!m.rows.length) return `No path joins ${m.from} to ${m.to}.`;
      const r = m.rows[i];
      return `Path ${i + 1} of ${m.total}: ${r.nodes.join('-')} measures ${amount(r.length, m.graph)}` +
        (r.improved ? ` — a new shortest, beating everything seen before.` : `, which does not beat the best of ${r.bestSoFar}.`);
    }
  },

  figure(model, ctx) {
    const r = model.rows[Math.min(ctx.step, Math.max(0, model.rows.length - 1))];
    const onPath = new Set();
    if (r) for (let i = 0; i < r.nodes.length - 1; i += 1) onPath.add([r.nodes[i], r.nodes[i + 1]].sort().join('|'));
    return drawGraph(model.graph, {
      nodeState: (n) => {
        if (n === model.from || n === model.to) return 'current';
        return r && r.nodes.includes(n) ? 'done' : 'plain';
      },
      nodeNote: (n) => {
        if (!r) return '';
        const i = r.nodes.indexOf(n);
        return i === -1 ? '' : `step ${i}`;
      },
      edgeState: (e) => (onPath.has([e.u, e.v].sort().join('|')) ? 'chosen' : 'faded')
    });
  },

  figureAlt(model, ctx) {
    if (!model.rows.length) return `No path joins ${model.from} to ${model.to} in this graph, so nothing is drawn as a route.`;
    const r = model.rows[Math.min(ctx.step, model.rows.length - 1)];
    return `Candidate ${Math.min(ctx.step, model.rows.length - 1) + 1} of ${model.total} drawn as a thick route: `
      + `${r.nodes.join(' then ')}, total ${amount(r.length, model.graph)}. `
      + `Shortest found so far: ${amount(r.bestSoFar, model.graph)}.`;
  },

  table(model, ctx) {
    return {
      caption: `Every ${model.from}-to-${model.to} path generated in depth-first order`
        + (model.capped ? `, showing the first ${model.rows.length} of ${model.total}` : ` (${model.total} in total)`),
      rowHeader: true,
      columns: [
        { label: 'Candidate', numeric: true }, { label: 'Path' },
        { label: 'Edges', numeric: true },
        { label: 'Total length', unit: unitOf(model.graph), numeric: true },
        { label: 'Shortest so far', unit: unitOf(model.graph), numeric: true },
        { label: 'Verdict' }
      ],
      rows: model.rows.length
        ? model.rows.map((r, i) => ({
          cells: [i + 1, r.nodes.join('-'), r.nodes.length - 1, r.length, r.bestSoFar, r.improved ? 'new best' : 'no better'],
          current: i === ctx.step
        }))
        : [{ cells: ['—', 'no path exists', 0, '—', '—', '—'] }]
    };
  },

  summary(model, ctx) {
    if (!model.rows.length) return [`There is no path from ${model.from} to ${model.to}, so brute force returns infinity.`];
    const r = model.rows[Math.min(ctx.step, model.rows.length - 1)];
    const lines = [
      `Shortest found so far: ${amount(r.bestSoFar, model.graph)}, over ${Math.min(ctx.step, model.rows.length - 1) + 1} of ${model.total} candidates.`
    ];
    if (ctx.step >= model.rows.length - 1) {
      lines.push(`Brute force finishes at ${amount(model.overallBest, model.graph)} after examining ${model.total} paths. `
        + 'Dijkstra reaches the same answer without ever generating a single complete path.');
    }
    if (model.capped) {
      lines.push(`Only the first ${model.rows.length} of ${model.total} paths are listed, to keep the table readable — `
        + 'which is itself the argument against brute force.');
    }
    return lines;
  }
});

/* ==========================================================================
   10. Demo 7 — Dijkstra step-through (topics 3.5.5, 3.5.6, 3.5.7)
   ========================================================================== */

createDemo('#demo-dijkstra-trace-mount', {
  id: 'demo-dijkstra-trace',
  title: 'Dijkstra step-through',
  description: 'Connect the closest unconnected node, relax every edge leaving it, repeat. '
    + 'The working table is the same one the slides fill in by hand.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['dijkstraex', 'roads', 'wtgraph']),
      value: 'dijkstraex'
    },
    { type: 'select', name: 'source', label: 'Start node A', options: nodeOptions(GRAPHS.dijkstraex), value: 'A' },
    {
      type: 'select', name: 'target', label: 'Target node B',
      options: [{ value: 'all', label: 'All nodes — do not stop early' }].concat(nodeOptions(GRAPHS.dijkstraex)),
      value: 'F',
      help: 'Choosing "all nodes" drops step 6 of the algorithm, which is the only change needed to solve every destination at once.'
    }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const source = graph.nodes.includes(values.source) ? values.source : graph.nodes[0];
    const target = graph.nodes.includes(values.target) ? values.target : null;
    const run = dijkstra(graph, source, target);
    return { graph, source, target, run };
  },

  steps: {
    count: (m) => m.run.steps.length,
    label: (m, i) => m.run.steps[i].description
  },

  figure(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const treeEdges = new Set();
    model.graph.nodes.forEach((n) => {
      if (step.prev[n]) treeEdges.add([n, step.prev[n]].sort().join('|'));
    });
    const relaxedNodes = new Set(step.relaxed.map((r) => r.node));
    return drawGraph(model.graph, {
      nodeState: (n) => {
        if (n === step.p) return 'current';
        if (step.connected[n]) return 'done';
        return relaxedNodes.has(n) || step.dist[n] !== INF ? 'frontier' : 'plain';
      },
      nodeNote: (n) => (step.dist[n] === INF ? INF_TEXT : `d=${step.dist[n]}`),
      edgeState: (e) => (treeEdges.has([e.u, e.v].sort().join('|')) ? 'chosen' : 'plain')
    });
  },

  figureAlt(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const connected = model.graph.nodes.filter((n) => step.connected[n]);
    if (!step.p) {
      return `Dijkstra on ${model.graph.label.split(' — ')[0]}, before any node is connected: `
        + `Dist(${model.source}) is 0 and every other Dist is infinity.`;
    }
    return `Step ${ctx.step} of ${model.run.steps.length - 1}: ${step.p} is connected at distance ${step.dist[step.p]}. `
      + `${connected.length} of ${model.graph.nodes.length} nodes are now connected (${joinList(connected)}), `
      + (step.relaxed.length
        ? `and this step lowered ${joinList(step.relaxed.map((r) => `${r.node} to ${r.to}`))}.`
        : 'and no distance improved.');
  },

  table(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    return {
      caption: `Dijkstra working table from ${model.source}, after step ${ctx.step} of ${model.run.steps.length - 1}`,
      rowHeader: true,
      columns: [
        { label: 'Node' },
        { label: 'CONNECT', numeric: true },
        { label: 'Dist', unit: unitOf(model.graph), numeric: true },
        { label: 'Reached from' },
        { label: 'Shortest route so far' }
      ],
      rows: model.graph.nodes.map((n) => {
        const route = pathTo(step.prev, model.source, n);
        return {
          cells: [
            n,
            step.connected[n] ? 1 : 0,
            step.dist[n] === INF ? INF_TEXT : step.dist[n],
            step.prev[n] || '—',
            n === model.source ? 'start' : route ? route.join('-') : 'not reached yet'
          ],
          current: n === step.p
        };
      })
    };
  },

  summary(model, ctx) {
    // demo.js already prints the step label above this; do not repeat it.
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const lines = [];
    const connected = model.graph.nodes.filter((n) => step.connected[n]);
    lines.push(`${connected.length} of ${model.graph.nodes.length} nodes are connected`
      + (connected.length ? `: ${joinList(connected)}.` : '.'));
    if (ctx.step === model.run.steps.length - 1) {
      if (model.target) {
        const route = pathTo(model.run.prev, model.source, model.target);
        lines.push(model.run.dist[model.target] === INF
          ? `There is no route from ${model.source} to ${model.target}.`
          : `Shortest distance from ${model.source} to ${model.target}: ${amount(model.run.dist[model.target], model.graph)}, `
            + `along ${route.join('-')}.`);
      } else {
        lines.push('Every reachable node now carries its final distance: '
          + model.graph.nodes.map((n) => `${n} ${model.run.dist[n] === INF ? 'unreachable' : model.run.dist[n]}`).join(', ') + '.');
      }
      lines.push('Once a node is connected its distance never changes again. That is the greedy promise, and it holds only because no edge weight is negative.');
    }
    return lines;
  }
});

/* ==========================================================================
   11. Demo 8 — re-running Dijkstra after an edge change (topic 3.5.8)
   ========================================================================== */

createDemo('#demo-dijkstra-edge-change-mount', {
  id: 'demo-dijkstra-edge-change',
  title: 'Change one edge, re-run Dijkstra',
  description: 'The midterm question in one control. Drag the C-to-E travel time and both the distance '
    + 'and the route are recomputed from scratch, beside the original answer.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'ce', label: 'Travel time on edge C to E',
      min: 1, max: 10, step: 1, value: 3, unit: 'min',
      valueText: (v) => `${v} minutes`,
      help: 'The midterm sets this to 3, then asks you to redo the work with it at 1.'
    },
    {
      type: 'select', name: 'target', label: 'Destination',
      options: [{ value: 'D', label: 'Node D' }, { value: 'F', label: 'Node F' }, { value: 'E', label: 'Node E' }],
      value: 'F'
    }
  ],

  compute(values) {
    const base = GRAPHS.roads;
    const ce = Math.max(1, Math.min(10, Number(values.ce) || 3));
    const changed = Object.assign({}, base, {
      edges: base.edges.map((e) => (e[0] === 'C' && e[1] === 'E' ? ['C', 'E', ce] : e.slice()))
    });
    const before = dijkstra(base, 'A', null);
    const after = dijkstra(changed, 'A', null);
    return {
      base, changed, ce, target: values.target,
      before, after,
      routeBefore: pathTo(before.prev, 'A', values.target),
      routeAfter: pathTo(after.prev, 'A', values.target)
    };
  },

  figure(model) {
    const beforeEdges = new Set();
    const afterEdges = new Set();
    (model.routeBefore || []).forEach((n, i, arr) => {
      if (i) beforeEdges.add([arr[i - 1], n].sort().join('|'));
    });
    (model.routeAfter || []).forEach((n, i, arr) => {
      if (i) afterEdges.add([arr[i - 1], n].sort().join('|'));
    });
    return drawGraph(model.changed, {
      nodeState: (n) => (n === 'A' || n === model.target ? 'current' : (model.routeAfter || []).includes(n) ? 'done' : 'plain'),
      nodeNote: (n) => `d=${model.after.dist[n]}`,
      edgeState: (e) => {
        const key = [e.u, e.v].sort().join('|');
        if (afterEdges.has(key)) return 'chosen';
        if (beforeEdges.has(key)) return 'alternate';
        return 'plain';
      }
    });
  },

  figureAlt(model) {
    const same = (model.routeBefore || []).join('-') === (model.routeAfter || []).join('-');
    return `Road network with C-to-E set to ${model.ce} minutes. The new shortest route from A to ${model.target} is drawn as a thick solid line: `
      + `${(model.routeAfter || []).join(' then ')}, ${model.after.dist[model.target]} minutes. `
      + (same
        ? 'The original route, at C-to-E equal to 3 minutes, used the same roads.'
        : `The original route, drawn as a dashed line, was ${(model.routeBefore || []).join(' then ')} at ${model.before.dist[model.target]} minutes.`);
  },

  table(model) {
    return {
      caption: `Shortest distance from A to every node, with C-to-E at 3 minutes (the original) and at ${model.ce} minutes (now)`,
      rowHeader: true,
      columns: [
        { label: 'Node' },
        { label: 'Original distance', unit: 'min', numeric: true },
        { label: 'New distance', unit: 'min', numeric: true },
        { label: 'Change', unit: 'min', numeric: true },
        { label: 'New route' }
      ],
      rows: model.base.nodes.map((n) => {
        const b = model.before.dist[n];
        const a = model.after.dist[n];
        const route = pathTo(model.after.prev, 'A', n);
        return {
          cells: [
            n,
            b === INF ? INF_TEXT : b,
            a === INF ? INF_TEXT : a,
            b === INF || a === INF ? '—' : a - b,
            n === 'A' ? 'start' : route ? route.join('-') : 'not reachable'
          ],
          current: n === model.target
        };
      })
    };
  },

  summary(model) {
    const b = model.before.dist[model.target];
    const a = model.after.dist[model.target];
    const routeB = (model.routeBefore || []).join('-');
    const routeA = (model.routeAfter || []).join('-');
    const lines = [
      model.ce === 3
        ? `C-to-E is still at its original 3 minutes, so nothing has moved yet: the shortest A-to-${model.target} distance is ${a} minutes.`
        : `With C-to-E at ${model.ce} minutes the shortest A-to-${model.target} distance is ${a} minutes; at the original 3 minutes it was ${b}.`,
      routeA === routeB
        ? `The route is unchanged: ${routeA}.`
        : `The route changes from ${routeB} to ${routeA}.`
    ];
    const moved = model.base.nodes.filter((n) => model.before.dist[n] !== model.after.dist[n]);
    if (model.ce !== 3) {
      lines.push(moved.length
        ? `Changing that one edge moved the distance to ${joinList(moved)}.`
        : 'Changing that edge moved no distance at all: it is not on any shortest route.');
    }
    lines.push('There is no shortcut here — Dijkstra has to be run again from step 1, because a single shorter edge can '
      + 'reorder which node is chosen next and therefore change every later relaxation.');
    return lines;
  }
});

/* ==========================================================================
   12. Demo 9 — Kruskal with union-find (topics 3.6.3–3.6.6)
   ========================================================================== */

createDemo('#demo-kruskal-mount', {
  id: 'demo-kruskal',
  title: 'Kruskal step-through with union-find',
  description: 'Sort the edges, then take each in turn: if its two ends are already in the same set '
    + 'it would close a cycle, so it is rejected. The set identifiers come from a real union-find.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'graph', label: 'Graph',
      options: graphOptions(['wtgraph', 'lab08', 'twoparts', 'tsp5']),
      value: 'wtgraph'
    }
  ],

  compute(values) {
    const graph = GRAPHS[values.graph];
    const run = kruskal(graph);
    return { graph, run, needed: graph.nodes.length - run.components };
  },

  steps: {
    count: (m) => m.run.steps.length,
    label: (m, i) => m.run.steps[i].description
  },

  figure(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const inTree = new Set(step.tree.map((e) => e.i));
    const rejected = new Set(model.run.steps.slice(0, ctx.step + 1).filter((s) => !s.added).map((s) => s.edge.i));
    return drawGraph(model.graph, {
      nodeState: (n) => (n === step.edge.u || n === step.edge.v ? 'current' : 'plain'),
      nodeNote: () => '',
      edgeState: (e) => {
        if (e.i === step.edge.i) return 'considered';
        if (inTree.has(e.i)) return 'chosen';
        if (rejected.has(e.i)) return 'rejected';
        return 'faded';
      }
    });
  },

  figureAlt(model, ctx) {
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    return `Step ${ctx.step + 1} of ${model.run.steps.length}: edge ${step.edge.u}${step.edge.v}, length ${step.edge.w}, is `
      + (step.added ? 'added to the tree' : 'rejected because it would close a cycle')
      + `. The tree now has ${step.tree.length} edge${step.tree.length === 1 ? '' : 's'} `
      + `(${step.tree.map((e) => `${e.u}${e.v}`).join(', ') || 'none'}) and totals ${amount(step.total, model.graph)}.`;
  },

  table(model, ctx) {
    return {
      caption: `All ${model.run.sorted.length} edges in length order; ${Math.min(ctx.step + 1, model.run.steps.length)} `
        + `of the ${model.run.steps.length} the algorithm looks at have been considered`,
      rowHeader: true,
      columns: [
        { label: 'Edge' },
        { label: 'Length', unit: unitOf(model.graph), numeric: true },
        { label: 'Set of first end' },
        { label: 'Set of second end' },
        { label: 'Action' },
        { label: 'Running total', unit: unitOf(model.graph), numeric: true }
      ],
      rows: model.run.sorted.map((edge) => {
        const at = model.run.stepByEdge[edge.i];
        if (at === undefined) {
          return { cells: [`${edge.u}${edge.v}`, edge.w, '—', '—', 'never reached — the tree was already complete', '—'] };
        }
        const s = model.run.steps[at];
        return {
          cells: at <= ctx.step
            ? [
              `${edge.u}${edge.v}`, edge.w, s.rootU, s.rootV,
              s.added ? 'added' : 'rejected — would close a cycle', s.total
            ]
            : [`${edge.u}${edge.v}`, edge.w, '—', '—', 'not considered yet', '—'],
          current: at === ctx.step
        };
      })
    };
  },

  summary(model, ctx) {
    // demo.js already prints the step label above this; do not repeat it.
    const step = model.run.steps[Math.min(ctx.step, model.run.steps.length - 1)];
    const lines = [];
    lines.push(`Tree so far: ${step.tree.map((e) => `${e.u}${e.v}`).join(' ') || 'empty'} — `
      + `${step.tree.length} of the ${model.needed} edges needed.`);
    if (ctx.step === model.run.steps.length - 1) {
      if (model.run.components === 1) {
        lines.push(`Finished: the minimum spanning tree uses ${model.run.tree.length} edges — exactly N minus 1 with N = ${model.graph.nodes.length} — `
          + `and totals ${amount(model.run.total, model.graph)}.`);
      } else {
        lines.push(`Finished, but the graph has ${model.run.components} components, so there is no spanning tree. `
          + `What Kruskal returns is a minimum spanning forest: ${model.run.tree.length} edges totalling ${amount(model.run.total, model.graph)}, `
          + `which is N minus the number of components.`);
      }
      if (model.graph.id === 'lab08') {
        lines.push('This is the Lab 08 example graph. Its README states a total of 42; the true minimum is 41, '
          + 'because the README takes HI at 7 where GI at 6 was still available.');
      }
    }
    return lines;
  }
});

/* ==========================================================================
   13. Demo 10 — permutations (topics 3.6.7–3.6.10)
   ========================================================================== */

createDemo('#demo-permutations-mount', {
  id: 'demo-permutations',
  title: 'Generating permutations',
  description: 'Two combinatorial tasks side by side: generate the next permutation in order, '
    + 'or sample one at random. Both are written the way the slides write them.',
  headingLevel: 4,

  controls: [
    {
      type: 'radio', name: 'mode', label: 'Task',
      options: [
        { value: 'next', label: 'Generate — walk through every permutation in order' },
        { value: 'random', label: 'Sample — one random permutation, Fisher and Yates' }
      ],
      value: 'next'
    },
    {
      type: 'range', name: 'n', label: 'Order N — how many items to permute',
      min: 3, max: 6, step: 1, value: 4, unit: 'items',
      valueText: (v) => `${v} items, giving ${[6, 24, 120, 720][v - 3]} permutations`
    },
    {
      type: 'seed', name: 'seed', label: 'Random seed', value: 42,
      help: 'Only used in sample mode. The same seed always gives the same permutation, so a result can be discussed in class.'
    }
  ],

  compute(values) {
    const n = Math.max(3, Math.min(6, Number(values.n) || 4));
    const factorial = [1, 1, 2, 6, 24, 120, 720][n];
    if (values.mode === 'random') {
      return { mode: 'random', n, factorial, steps: randomPermutation(n, values.seed), seed: values.seed };
    }
    return { mode: 'next', n, factorial, list: allPermutations(n) };
  },

  steps: {
    count: (m) => (m.mode === 'random' ? m.steps.length : m.list.length),
    label: (m, i) => {
      if (m.mode === 'random') return m.steps[i].description;
      const entry = m.list[i];
      if (i === 0) return `Permutation 1 of ${m.factorial}: the algorithm starts from P = ${entry.perm.join('')}.`;
      return `Permutation ${i + 1} of ${m.factorial}: I = ${entry.I} is the highest index with P(I) below its neighbour, `
        + `J = ${entry.J} is the highest index with P(J) above P(I). Swap them to get ${entry.afterSwap.join('')}, `
        + `then reverse everything after position ${entry.I} to get ${entry.perm.join('')}.`;
    }
  },

  figure(model, ctx) {
    const entry = model.mode === 'random'
      ? model.steps[Math.min(ctx.step, model.steps.length - 1)]
      : model.list[Math.min(ctx.step, model.list.length - 1)];
    const perm = entry.perm;
    const boxW = 62;
    const width = perm.length * boxW + 40;
    const svg = svgEl('svg', { viewBox: `0 0 ${width} 150` });

    perm.forEach((value, i) => {
      const x = 20 + i * boxW;
      const marked = model.mode === 'next'
        ? (i + 1 === entry.I || i + 1 === entry.J)
        : (i + 1 === entry.I || i + 1 === entry.J);
      const style = marked ? NODE_STYLE.current : NODE_STYLE.plain;
      svg.appendChild(svgEl('rect', {
        x, y: 40, width: boxW - 12, height: boxW - 12, rx: 8,
        style: `fill: ${style.fill}; stroke: ${style.stroke}; stroke-width: ${style.width};`
      }));
      svg.appendChild(svgText(x + (boxW - 12) / 2, 40 + (boxW - 12) / 2, value, {
        fill: style.text, weight: 'var(--fsu-weight-bold)'
      }));
      svg.appendChild(svgText(x + (boxW - 12) / 2, 22, `pos ${i + 1}`, { fill: 'var(--fsu-color-caption)' }));
      if (marked) {
        svg.appendChild(svgText(x + (boxW - 12) / 2, 118, i + 1 === entry.I ? 'I' : 'J', {
          fill: 'var(--fsu-color-heading)', weight: 'var(--fsu-weight-bold)'
        }));
      }
    });
    return svg;
  },

  figureAlt(model, ctx) {
    const entry = model.mode === 'random'
      ? model.steps[Math.min(ctx.step, model.steps.length - 1)]
      : model.list[Math.min(ctx.step, model.list.length - 1)];
    const positions = entry.I ? `Positions ${entry.I} and ${entry.J} are marked.` : 'No position is marked yet.';
    return `${model.mode === 'random' ? 'Sampling' : 'Generating'} step ${ctx.step + 1}: `
      + `P reads ${entry.perm.join(', ')}. ${positions}`;
  },

  table(model, ctx) {
    if (model.mode === 'random') {
      return {
        caption: `Fisher and Yates shuffle of 1 to ${model.n}, seed ${model.seed}`,
        rowHeader: true,
        columns: [
          { label: 'Step', numeric: true }, { label: 'I', numeric: true },
          { label: 'Random J', numeric: true }, { label: 'P after the swap' }
        ],
        rows: model.steps.map((s, i) => ({
          cells: [i, s.I === null ? '—' : s.I, s.J === null ? '—' : s.J, s.perm.join(' ')],
          current: i === ctx.step
        }))
      };
    }
    const window = 12;
    const start = Math.max(0, Math.min(ctx.step - 4, model.list.length - window));
    const slice = model.list.slice(start, start + window);
    return {
      caption: `Permutations of order ${model.n} in order, showing ranks ${start + 1} to ${start + slice.length} of ${model.factorial}`,
      rowHeader: true,
      columns: [
        { label: 'Rank', numeric: true }, { label: 'Permutation' },
        { label: 'I', numeric: true }, { label: 'J', numeric: true },
        { label: 'After the swap' }
      ],
      rows: slice.map((entry, i) => ({
        cells: [
          start + i + 1, entry.perm.join(''),
          entry.I === null ? '—' : entry.I,
          entry.J === null ? '—' : entry.J,
          entry.afterSwap ? entry.afterSwap.join('') : 'start of the list'
        ],
        current: start + i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    if (model.mode === 'random') {
      const s = model.steps[Math.min(ctx.step, model.steps.length - 1)];
      return [
        `P now reads ${s.perm.join(' ')}.`,
        `Each of the ${model.factorial} permutations of ${model.n} items is equally likely, and only ${model.n - 1} swaps are needed — `
          + 'which is why sampling is the practical task once N is too large to enumerate.'
      ];
    }
    const entry = model.list[Math.min(ctx.step, model.list.length - 1)];
    const lines = [];
    if (ctx.step === model.list.length - 1) {
      lines.push(`That is the last one: no index I has P(I) below the item after it, so the algorithm ends. `
        + `There are N factorial = ${model.factorial} permutations of ${model.n} items.`);
    } else {
      lines.push(`Enumerating them all costs N factorial = ${model.factorial} steps at N = ${model.n}. `
        + 'At N = 12 that is already 479 million.');
    }
    return lines;
  }
});

/* ==========================================================================
   14. Demo 11 — TSP by brute force (topics 3.6.11, 3.6.12)
   ========================================================================== */

createDemo('#demo-tsp-bruteforce-mount', {
  id: 'demo-tsp-bruteforce',
  title: 'The travelling salesman by brute force',
  description: 'Generate every itinerary with next-permutation, measure each round trip, keep the best. '
    + 'Exact, and the only thing stopping you using it on real problems is the factorial.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'start', label: 'Start and finish city', options: nodeOptions(GRAPHS.tsp5), value: 'A' },
    {
      type: 'checkbox', name: 'collapse', value: true,
      label: 'Skip itineraries that are only a reversal of one already seen',
      help: 'Every distinct round trip appears twice, once in each direction, so half the work is wasted.'
    }
  ],

  compute(values) {
    const graph = GRAPHS.tsp5;
    const run = bruteForceTours(graph, values.start, Boolean(values.collapse));
    const optimal = run.tours.filter((t) => t.length === run.best);
    return { graph, start: values.start, collapse: Boolean(values.collapse), run, optimal };
  },

  steps: {
    count: (m) => m.run.tours.length,
    label: (m, i) => {
      const t = m.run.tours[i];
      return `Itinerary ${i + 1} of ${m.run.tours.length}: ${t.order.join('')}${t.order[0]} measures ${t.length} units`
        + (t.improved ? ' — a new best.' : `, so the best stays at ${t.bestSoFar}.`);
    }
  },

  figure(model, ctx) {
    const t = model.run.tours[Math.min(ctx.step, model.run.tours.length - 1)];
    const tourEdges = new Set();
    t.order.forEach((n, i) => {
      const next = t.order[(i + 1) % t.order.length];
      tourEdges.add([n, next].sort().join('|'));
    });
    const position = {};
    t.order.forEach((n, i) => { position[n] = i + 1; });
    return drawGraph(model.graph, {
      nodeState: (n) => (n === model.start ? 'current' : 'done'),
      nodeNote: (n) => `stop ${position[n]}`,
      edgeState: (e) => (tourEdges.has([e.u, e.v].sort().join('|')) ? 'chosen' : 'faded')
    });
  },

  figureAlt(model, ctx) {
    const t = model.run.tours[Math.min(ctx.step, model.run.tours.length - 1)];
    return `Itinerary ${Math.min(ctx.step, model.run.tours.length - 1) + 1} of ${model.run.tours.length} drawn as a closed loop: `
      + `${t.order.join(' then ')} then back to ${model.start}, total ${t.length} units. `
      + `Best so far ${t.bestSoFar} units.`;
  },

  table(model, ctx) {
    return {
      caption: `Every itinerary starting and finishing at ${model.start}`
        + (model.collapse ? ', with reversals removed' : ', including both directions of each tour'),
      rowHeader: true,
      columns: [
        { label: 'Itinerary', numeric: true }, { label: 'Route' },
        { label: 'Length', unit: 'units', numeric: true },
        { label: 'Best so far', unit: 'units', numeric: true }, { label: 'Verdict' }
      ],
      rows: model.run.tours.map((t, i) => ({
        cells: [
          i + 1, `${t.order.join('-')}-${model.start}`, t.length, t.bestSoFar,
          t.improved ? 'new best' : 'no better'
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const t = model.run.tours[Math.min(ctx.step, model.run.tours.length - 1)];
    const lines = [
      `Best so far ${t.bestSoFar} units, over ${Math.min(ctx.step, model.run.tours.length - 1) + 1} of ${model.run.tours.length} itineraries.`
    ];
    if (ctx.step === model.run.tours.length - 1) {
      lines.push(`Brute force ends at ${model.run.best} units, on ${joinList(model.optimal.map((o) => `${o.order.join('')}${model.start}`))}.`);
      lines.push(`5 factorial is 120 routes, but they come in sets of 10 — 5 rotations times 2 directions — so there are only 12 genuinely different tours. `
        + `Fixing the start city cuts the 120 to ${model.run.totalPermutations}`
        + (model.collapse ? `, and dropping reversals cuts it again to ${model.run.tours.length}.` : '.'));
      lines.push('With 48 cities there would be about 1.24 times 10 to the 61 itineraries, which is why nobody brute-forces a real one.');
    }
    return lines;
  }
});

/* ==========================================================================
   15. Demo 12 — TSP heuristics and 2-opt (topics 3.6.13, 3.6.14)
   ========================================================================== */

createDemo('#demo-tsp-heuristic-mount', {
  id: 'demo-tsp-heuristic',
  title: 'Nearest neighbour, then improve the route',
  description: 'Build a route by always hopping to the nearest unvisited city, then try to improve it '
    + 'by uncrossing pairs of legs. Neither step guarantees the best answer.',
  headingLevel: 4,

  controls: [
    { type: 'select', name: 'start', label: 'Starting city', options: nodeOptions(GRAPHS.tsp5), value: 'A' },
    {
      type: 'checkbox', name: 'improve', value: false,
      label: 'Also apply the 2-opt improvement (uncross two legs)',
      help: 'A route that crosses itself can always be shortened when the distances obey the triangle inequality.'
    }
  ],

  compute(values) {
    const graph = GRAPHS.tsp5;
    const nn = nearestNeighbourTour(graph, values.start);
    const improvement = values.improve ? twoOpt(graph, nn.order) : { moves: [], order: nn.order, length: nn.total };
    const allStarts = graph.nodes.map((n) => {
      const r = nearestNeighbourTour(graph, n);
      return { start: n, route: r.order, total: r.total, legs: r.legs };
    });
    const brute = bruteForceTours(graph, values.start, true);
    return { graph, start: values.start, nn, improvement, allStarts, optimum: brute.best, improve: Boolean(values.improve) };
  },

  steps: {
    count: (m) => m.nn.legs.length + m.improvement.moves.length,
    label: (m, i) => {
      if (i < m.nn.legs.length) {
        const leg = m.nn.legs[i];
        return leg.home
          ? `Every city is visited, so return home from ${leg.from} to ${leg.to}, costing ${leg.w} units.`
          : `From ${leg.from} the nearest unvisited city is ${leg.to} at ${leg.w} units, so go there.`;
      }
      const move = m.improvement.moves[i - m.nn.legs.length];
      return `Improvement ${i - m.nn.legs.length + 1}: reversing the stretch from position ${move.i + 1} to ${move.j + 1} `
        + `turns ${move.from.join('')} into ${move.to.join('')} and cuts the round trip from ${move.before} to ${move.after} units.`;
    }
  },

  figure(model, ctx) {
    const legStep = Math.min(ctx.step, model.nn.legs.length - 1);
    let order = model.nn.order;
    let drawn = new Set();
    if (ctx.step < model.nn.legs.length) {
      model.nn.legs.slice(0, legStep + 1).forEach((leg) => drawn.add([leg.from, leg.to].sort().join('|')));
    } else {
      const move = model.improvement.moves[ctx.step - model.nn.legs.length];
      order = move.to;
      order.forEach((n, i) => drawn.add([n, order[(i + 1) % order.length]].sort().join('|')));
    }
    const position = {};
    order.forEach((n, i) => { position[n] = i + 1; });
    const visitedSoFar = ctx.step < model.nn.legs.length
      ? new Set(model.nn.order.slice(0, legStep + 2))
      : new Set(order);
    return drawGraph(model.graph, {
      nodeState: (n) => (n === model.start ? 'current' : visitedSoFar.has(n) ? 'done' : 'plain'),
      nodeNote: (n) => (visitedSoFar.has(n) ? `stop ${position[n]}` : 'not yet'),
      edgeState: (e) => (drawn.has([e.u, e.v].sort().join('|')) ? 'chosen' : 'faded')
    });
  },

  figureAlt(model, ctx) {
    if (ctx.step < model.nn.legs.length) {
      const leg = model.nn.legs[Math.min(ctx.step, model.nn.legs.length - 1)];
      const partial = model.nn.legs.slice(0, ctx.step + 1).reduce((s, l) => s + l.w, 0);
      return `Nearest-neighbour construction, leg ${ctx.step + 1} of ${model.nn.legs.length}: `
        + `${leg.from} to ${leg.to}, ${leg.w} units. The route so far measures ${partial} units.`;
    }
    const move = model.improvement.moves[ctx.step - model.nn.legs.length];
    return `Improvement pass: the loop is redrawn as ${move.to.join(' then ')} then home, `
      + `which is ${move.before - move.after} units shorter, at ${move.after} units.`;
  },

  table(model, ctx) {
    if (ctx.step < model.nn.legs.length) {
      let running = 0;
      return {
        caption: `Nearest-neighbour route from ${model.start}, leg by leg`,
        rowHeader: true,
        columns: [
          { label: 'Leg', numeric: true }, { label: 'From' }, { label: 'To' },
          { label: 'Length', unit: 'units', numeric: true },
          { label: 'Running total', unit: 'units', numeric: true }
        ],
        rows: model.nn.legs.map((leg, i) => {
          running += leg.w;
          return {
            cells: [i + 1, leg.from, leg.to, leg.w, running],
            current: i === ctx.step
          };
        })
      };
    }
    const moves = model.improvement.moves;
    return {
      caption: `Improvement moves applied to the nearest-neighbour route from ${model.start}`,
      rowHeader: true,
      columns: [
        { label: 'Move', numeric: true }, { label: 'Route before' }, { label: 'Route after' },
        { label: 'Length before', unit: 'units', numeric: true },
        { label: 'Length after', unit: 'units', numeric: true }
      ],
      rows: moves.length
        ? moves.map((m, i) => ({
          cells: [i + 1, m.from.join('-'), m.to.join('-'), m.before, m.after],
          current: i === ctx.step - model.nn.legs.length
        }))
        : [{ cells: ['—', model.nn.order.join('-'), 'no change', model.nn.total, model.nn.total] }]
    };
  },

  summary(model, ctx) {
    const lines = [];
    if (ctx.step < model.nn.legs.length) {
      const partial = model.nn.legs.slice(0, ctx.step + 1).reduce((s, l) => s + l.w, 0);
      lines.push(`Route so far: ${model.nn.order.slice(0, Math.min(ctx.step + 2, model.nn.order.length)).join('-')}, ${partial} units.`);
    } else {
      lines.push(`Improved route: ${model.improvement.order.join('-')}-${model.start}, ${model.improvement.length} units, `
        + `down from ${model.nn.total}.`);
    }
    lines.push(`Nearest neighbour from every start: ${model.allStarts.map((s) => `${s.start} gives ${s.total}`).join(', ')}. `
      + `The exact optimum is ${model.optimum} units, so the heuristic never finds it here — but it gets close, fast.`);
    if (model.improve && model.improvement.moves.length === 0) {
      lines.push('2-opt found nothing to uncross on this route, so it is already 2-optimal. That does not make it optimal.');
    }
    return lines;
  }
});

})(window);
