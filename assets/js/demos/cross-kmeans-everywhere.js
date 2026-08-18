/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   cross-kmeans-everywhere.js
   Demo for cross-cutting/kmeans-everywhere.html
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access. No hex value appears anywhere in this file; every colour
   comes from a token in fsu-tokens.css.

   ONE Lloyd loop, three settings. The `setting` control changes only what a
   data point means:

     quantization  a pixel's grey level, 0-255            (M4 topics 4.3.4-4.3.5)
     clustering    a record in two dimensions             (M5 topic 5.4.2)
     cvt           a sample of a square region            (M5 topics 5.5.4-5.5.7)

   assign(), move() and the stopping test below are shared by all three. That
   is the entire claim the page makes, expressed as code.
   ========================================================================== */

const { createDemo, svgEl, seededRandom, formatNumber } = window.Demo;
/* ==========================================================================
   1. Data — deterministic, from the seed control
   ========================================================================== */

const SETTINGS = {
  quantization: {
    label: 'M4 — colour quantization',
    dims: 1,
    pointNoun: 'grey level',
    pointNounPlural: 'grey levels',
    centreNoun: 'shade',
    axis: 'Grey level (0 = black, 255 = white)',
    bounds: [[0, 255]],
    unit: '',
    build(rand) {
      const points = [];
      [30, 120, 210].forEach((base) => {
        for (let i = 0; i < 16; i += 1) {
          points.push([Math.round(Math.min(255, Math.max(0, base + (rand() - 0.5) * 46)))]);
        }
      });
      return points;
    }
  },
  clustering: {
    label: 'M5 — clustering records',
    dims: 2,
    pointNoun: 'record',
    pointNounPlural: 'records',
    centreNoun: 'centre',
    axis: 'Attribute 1',
    axis2: 'Attribute 2',
    bounds: [[0, 10], [0, 10]],
    unit: '',
    build(rand) {
      const points = [];
      [[2, 2], [8, 2], [3, 8], [7, 8]].forEach(([cx, cy]) => {
        for (let i = 0; i < 12; i += 1) {
          points.push([
            Math.min(10, Math.max(0, cx + (rand() - 0.5) * 2.4)),
            Math.min(10, Math.max(0, cy + (rand() - 0.5) * 2.4))
          ]);
        }
      });
      return points;
    }
  },
  cvt: {
    label: 'M5 §5.5 and M6 — centroidal Voronoi tessellation',
    dims: 2,
    pointNoun: 'sample of the region',
    pointNounPlural: 'samples of the region',
    centreNoun: 'generator',
    axis: 'x across the region',
    axis2: 'y up the region',
    bounds: [[0, 10], [0, 10]],
    unit: '',
    build(rand) {
      const points = [];
      for (let i = 0; i < 160; i += 1) points.push([rand() * 10, rand() * 10]);
      return points;
    }
  }
};

/* ==========================================================================
   2. The shared Lloyd loop
   ========================================================================== */

function distance(a, b) {
  let sum = 0;
  for (let d = 0; d < a.length; d += 1) sum += (a[d] - b[d]) * (a[d] - b[d]);
  return Math.sqrt(sum);
}

function initialCentres(points, k, strategy, rand, bounds) {
  if (strategy === 'random') {
    const out = [];
    for (let j = 0; j < k; j += 1) {
      out.push(bounds.map(([lo, hi]) => lo + rand() * (hi - lo)));
    }
    return out;
  }
  if (strategy === 'first') {
    return points.slice(0, k).map((p) => p.slice());
  }
  // 'spread': evenly spaced records, which is the usual classroom default
  const out = [];
  for (let j = 0; j < k; j += 1) {
    out.push(points[Math.floor((j * points.length) / k)].slice());
  }
  return out;
}

/**
 * Run Lloyd's method and record every iteration.
 * Pure: same arguments always give the same trace.
 */
function lloyd(points, centres, maxIterations, tolerance) {
  let current = centres.map((c) => c.slice());
  const trace = [];

  for (let t = 0; t < maxIterations; t += 1) {
    /* --- Step 2: assign every point to its nearest centre ---------------- */
    const labels = points.map((p) => {
      let best = 0;
      let bestD = Infinity;
      current.forEach((c, j) => {
        const d = distance(p, c);
        if (d < bestD) { bestD = d; best = j; }
      });
      return best;
    });

    const sizes = current.map(() => 0);
    let energy = 0;
    points.forEach((p, i) => {
      sizes[labels[i]] += 1;
      const d = distance(p, current[labels[i]]);
      energy += 0.5 * d * d;
    });

    const variance = current.map((c, j) => {
      if (sizes[j] === 0) return 0;
      let sum = 0;
      points.forEach((p, i) => {
        if (labels[i] !== j) return;
        const d = distance(p, c);
        sum += d * d;
      });
      return sum / sizes[j];
    });

    /* --- Step 3: move every centre to the mean of what it owns ----------- */
    const next = current.map((c, j) => {
      if (sizes[j] === 0) return c.slice();     // an empty cluster keeps its centre
      const mean = c.map(() => 0);
      points.forEach((p, i) => {
        if (labels[i] !== j) return;
        for (let d = 0; d < p.length; d += 1) mean[d] += p[d];
      });
      return mean.map((v) => v / sizes[j]);
    });

    const moves = current.map((c, j) => distance(c, next[j]));
    const movement = moves.reduce((best, m) => Math.max(best, m), 0);

    trace.push({
      iteration: t,
      centres: current.map((c) => c.slice()),
      nextCentres: next.map((c) => c.slice()),
      labels,
      sizes,
      variance,
      moves,
      movement,
      energy,
      converged: movement <= tolerance
    });

    if (movement <= tolerance) break;
    current = next;
  }

  return trace;
}

/* ==========================================================================
   3. Drawing helpers — shape, not colour, carries cluster membership
   ========================================================================== */

const SERIES_TOKEN = [
  'var(--fsu-series-1)', 'var(--fsu-series-2)', 'var(--fsu-series-3)',
  'var(--fsu-series-4)', 'var(--fsu-series-5)', 'var(--fsu-series-6)'
];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'plus', 'chevron'];
const SHAPE_WORD = {
  circle: 'circle', square: 'square', triangle: 'triangle',
  diamond: 'diamond', plus: 'cross', chevron: 'chevron'
};

function shapeNode(shape, x, y, r, style) {
  switch (shape) {
    case 'square':
      return svgEl('rect', { x: x - r, y: y - r, width: r * 2, height: r * 2, style });
    case 'triangle':
      return svgEl('polygon', { points: `${x},${y - r - 1} ${x + r},${y + r} ${x - r},${y + r}`, style });
    case 'diamond':
      return svgEl('polygon', { points: `${x},${y - r - 1} ${x + r},${y} ${x},${y + r + 1} ${x - r},${y}`, style });
    case 'plus':
      return svgEl('path', { d: `M ${x - r} ${y} L ${x + r} ${y} M ${x} ${y - r} L ${x} ${y + r}`, style: `${style};stroke-width:2.5` });
    case 'chevron':
      return svgEl('path', { d: `M ${x - r} ${y + r} L ${x} ${y - r} L ${x + r} ${y + r}`, style: `${style};fill:none;stroke-width:2.5` });
    default:
      return svgEl('circle', { cx: x, cy: y, r, style });
  }
}

const AXIS_STYLE = 'stroke:var(--fsu-chart-axis);fill:none;stroke-width:2';
const GRID_STYLE = 'stroke:var(--fsu-chart-gridline);fill:none;stroke-width:1';
const TICK_STYLE = 'fill:var(--fsu-color-caption);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
const LABEL_STYLE = 'fill:var(--fsu-color-body);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
const CENTRE_STYLE = 'stroke:var(--fsu-color-strong);fill:none;stroke-width:2.5';

/* ==========================================================================
   4. The demo
   ========================================================================== */

createDemo('#demo-lloyd-everywhere-mount', {
  id: 'demo-lloyd-everywhere',
  title: "Lloyd's method in three settings",
  description:
    'The assign step, the move step and the stopping test are the same code in all three settings. ' +
    'Only the meaning of a data point changes. Step through the iterations and watch the energy fall.',
  headingLevel: 4,

  controls: [
    {
      type: 'select',
      name: 'setting',
      label: 'Setting',
      value: 'clustering',
      options: [
        { value: 'clustering', label: 'M5 — clustering 48 records' },
        { value: 'quantization', label: 'M4 — quantizing 48 grey levels' },
        { value: 'cvt', label: 'M5 §5.5 and M6 — CVT from 160 samples of a square' }
      ],
      help: 'Changing the setting changes only what a data point means. The algorithm does not change.'
    },
    {
      type: 'range',
      name: 'k',
      label: 'Number of centres k',
      min: 2,
      max: 6,
      step: 1,
      value: 3,
      valueText: (v) => `${v} centres`,
      help: 'The data has four natural groups in the clustering setting and three in the quantization setting.'
    },
    {
      type: 'select',
      name: 'init',
      label: 'Initialisation strategy',
      value: 'spread',
      options: [
        { value: 'spread', label: 'Evenly spaced data points' },
        { value: 'first', label: 'The first k data points' },
        { value: 'random', label: 'Random positions in the bounding box' }
      ],
      help: 'k-means converges from any start, but not always to the same answer. This is topic 5.4.6.'
    },
    {
      type: 'seed',
      name: 'seed',
      label: 'Random seed',
      value: 42,
      help: 'The seed fixes both the data and any random start, so a result can be reproduced and discussed.'
    }
  ],

  compute(values) {
    const setting = SETTINGS[values.setting] || SETTINGS.clustering;
    const k = Math.min(6, Math.max(2, Math.round(values.k)));

    const dataRand = seededRandom(Number(values.seed) || 1);
    const points = setting.build(dataRand);

    const initRand = seededRandom((Number(values.seed) || 1) + 977);
    const centres = initialCentres(points, k, values.init, initRand, setting.bounds);

    const tolerance = setting.dims === 1 ? 0.5 : 0.01;
    const trace = lloyd(points, centres, 24, tolerance);

    return {
      settingKey: values.setting,
      setting,
      k,
      points,
      trace,
      tolerance,
      finalEnergy: trace[trace.length - 1].energy,
      converged: trace[trace.length - 1].converged
    };
  },

  steps: {
    count: (model) => model.trace.length,
    label: (model, i) => {
      const s = model.trace[i];
      const noun = model.setting.pointNoun;
      const moved = s.moves
        .map((m, j) => ({ j, m }))
        .sort((a, b) => b.m - a.m)[0];

      if (i === 0) {
        return `Iteration 1 assigns every ${noun} to its nearest ${model.setting.centreNoun}. ` +
          `The energy of that first assignment is ${formatNumber(s.energy, 1)}. ` +
          `Moving each ${model.setting.centreNoun} to the mean of what it owns shifts ` +
          `${model.setting.centreNoun} c${moved.j + 1} furthest, by ${formatNumber(moved.m, 2)}.`;
      }

      const previous = model.trace[i - 1];
      const drop = previous.energy - s.energy;
      const changed = s.labels.reduce((n, label, idx) => n + (label === previous.labels[idx] ? 0 : 1), 0);

      if (s.converged) {
        return `Iteration ${i + 1}: ${changed} ${changed === 1 ? noun : model.setting.pointNounPlural} ` +
          `changed hands and the energy fell by ${formatNumber(drop, 1)} to ${formatNumber(s.energy, 1)}. ` +
          `No ${model.setting.centreNoun} now moves more than the tolerance, so the loop stops here.`;
      }

      return `Iteration ${i + 1}: ${changed} ${changed === 1 ? noun : model.setting.pointNounPlural} ` +
        `changed hands and the energy fell by ${formatNumber(drop, 1)} to ${formatNumber(s.energy, 1)}. ` +
        `The largest move this time is ${model.setting.centreNoun} c${moved.j + 1}, by ${formatNumber(moved.m, 2)}.`;
    }
  },

  figure(model, ctx) {
    const state = model.trace[ctx.step];
    return model.setting.dims === 1
      ? figureOneDimension(model, state)
      : figureTwoDimensions(model, state);
  },

  figureAlt(model, ctx) {
    const state = model.trace[ctx.step];
    const biggest = state.sizes.reduce((best, size, j) => (size > state.sizes[best] ? j : best), 0);
    const emptyCount = state.sizes.filter((s) => s === 0).length;

    const where = model.setting.dims === 1
      ? `${model.k} rows, one per shade, of ${model.points.length} grey levels laid out along a 0 to 255 axis`
      : `a scatter of ${model.points.length} ${model.setting.pointNounPlural} across a ten by ten region, ` +
        `each drawn with its cluster's own marker shape`;

    return `Iteration ${ctx.step + 1} of ${ctx.stepCount}: ${where}. ` +
      `Centre c${biggest + 1} owns the most, ${state.sizes[biggest]} of ${model.points.length}. ` +
      (emptyCount > 0 ? `${emptyCount} centre${emptyCount === 1 ? ' owns' : 's own'} nothing at this iteration. ` : '') +
      `The energy is ${formatNumber(state.energy, 1)} and the largest centre movement about to happen is ` +
      `${formatNumber(state.movement, 2)}.`;
  },

  table(model, ctx) {
    const state = model.trace[ctx.step];
    const biggestMove = state.moves.reduce((best, m, j) => (m > state.moves[best] ? j : best), 0);
    const twoD = model.setting.dims === 2;

    return {
      caption: `${model.setting.centreNoun === 'shade' ? 'Shades' : 'Centres'} after the assign step of ` +
        `iteration ${ctx.step + 1} of ${ctx.stepCount}, in the ${model.setting.label} setting`,
      rowHeader: true,
      columns: [
        { label: model.setting.centreNoun === 'shade' ? 'Shade' : 'Centre' },
        { label: 'Marker shape' },
        { label: twoD ? 'Position (x, y)' : 'Grey level' },
        { label: `${model.setting.pointNounPlural} owned`, numeric: true },
        { label: 'Within-cluster variance', numeric: true },
        { label: 'Moves next by', numeric: true }
      ],
      rows: state.centres.map((c, j) => ({
        cells: [
          `c${j + 1}`,
          SHAPE_WORD[SHAPES[j % SHAPES.length]],
          twoD ? `(${formatNumber(c[0], 2)}, ${formatNumber(c[1], 2)})` : formatNumber(c[0], 1),
          state.sizes[j],
          formatNumber(state.variance[j], 2),
          formatNumber(state.moves[j], 3)
        ],
        current: j === biggestMove
      }))
    };
  },

  summary(model, ctx) {
    const state = model.trace[ctx.step];
    const lines = [];

    lines.push(
      `Setting: ${model.setting.label}. Here a data point is one ${model.setting.pointNoun}, ` +
      `and the ${model.k} things the algorithm moves are called ${model.setting.centreNoun}s. ` +
      'The loop itself is unchanged in all three settings.'
    );

    lines.push(
      `Energy at this iteration: ${formatNumber(state.energy, 1)}. ` +
      `Largest centre movement about to happen: ${formatNumber(state.movement, 3)}, ` +
      `against a tolerance of ${model.tolerance}.`
    );

    if (ctx.step === ctx.stepCount - 1) {
      lines.push(
        model.converged
          ? `Converged after ${model.trace.length} iterations, at energy ${formatNumber(model.finalEnergy, 1)}. ` +
            'Run it again with a different seed or a different initialisation and compare this number: ' +
            'a different answer with a higher energy is a local minimum, which is topic 5.4.6.'
          : `Stopped at the iteration limit of ${model.trace.length} without meeting the tolerance. ` +
            'That is the safety net every implementation needs.'
      );
    }

    const empty = state.sizes.filter((s) => s === 0).length;
    if (empty > 0) {
      lines.push(`${empty} centre${empty === 1 ? '' : 's'} owns nothing at this iteration and therefore does not move.`);
    }

    return lines;
  }
});

/* ==========================================================================
   5. Figures
   ========================================================================== */

function figureTwoDimensions(model, state) {
  const W = 620;
  const H = 460;
  const left = 56;
  const right = 24;
  const top = 20;
  const bottom = 52;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, width: '100%',
    style: 'max-inline-size:100%;block-size:auto'
  });

  const px = (x) => left + (x / 10) * (W - left - right);
  const py = (y) => (H - bottom) - (y / 10) * (H - bottom - top);

  for (let v = 0; v <= 10; v += 2) {
    svg.appendChild(svgEl('line', { x1: px(v), y1: top, x2: px(v), y2: H - bottom, style: GRID_STYLE }));
    svg.appendChild(svgEl('line', { x1: left, y1: py(v), x2: W - right, y2: py(v), style: GRID_STYLE }));
    svg.appendChild(svgEl('text', { x: px(v), y: H - bottom + 20, 'text-anchor': 'middle', style: TICK_STYLE, text: String(v) }));
    svg.appendChild(svgEl('text', { x: left - 8, y: py(v) + 4, 'text-anchor': 'end', style: TICK_STYLE, text: String(v) }));
  }

  svg.appendChild(svgEl('line', { x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, style: AXIS_STYLE }));
  svg.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: H - bottom, style: AXIS_STYLE }));

  svg.appendChild(svgEl('text', {
    x: left + (W - left - right) / 2, y: H - 12, 'text-anchor': 'middle',
    style: TICK_STYLE, text: model.setting.axis
  }));
  svg.appendChild(svgEl('text', {
    x: 14, y: top + (H - bottom - top) / 2, 'text-anchor': 'middle',
    transform: `rotate(-90 14 ${top + (H - bottom - top) / 2})`,
    style: TICK_STYLE, text: model.setting.axis2
  }));

  model.points.forEach((p, i) => {
    const j = state.labels[i];
    const token = SERIES_TOKEN[j % SERIES_TOKEN.length];
    svg.appendChild(shapeNode(SHAPES[j % SHAPES.length], px(p[0]), py(p[1]), 4,
      `fill:${token};stroke:${token}`));
  });

  state.centres.forEach((c, j) => {
    const x = px(c[0]);
    const y = py(c[1]);
    svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 10, style: CENTRE_STYLE }));
    svg.appendChild(svgEl('path', { d: `M ${x - 6} ${y} L ${x + 6} ${y} M ${x} ${y - 6} L ${x} ${y + 6}`, style: CENTRE_STYLE }));
    svg.appendChild(svgEl('text', { x: x + 13, y: y - 8, style: LABEL_STYLE, text: `c${j + 1}` }));
  });

  return svg;
}

function figureOneDimension(model, state) {
  const W = 620;
  const rowHeight = 54;
  const top = 24;
  const bottom = 52;
  const H = top + model.k * rowHeight + bottom;
  const left = 60;
  const right = 24;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, width: '100%',
    style: 'max-inline-size:100%;block-size:auto'
  });

  const px = (v) => left + (v / 255) * (W - left - right);

  [0, 64, 128, 192, 255].forEach((v) => {
    svg.appendChild(svgEl('line', { x1: px(v), y1: top - 8, x2: px(v), y2: H - bottom, style: GRID_STYLE }));
    svg.appendChild(svgEl('text', { x: px(v), y: H - bottom + 20, 'text-anchor': 'middle', style: TICK_STYLE, text: String(v) }));
  });

  svg.appendChild(svgEl('line', { x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, style: AXIS_STYLE }));
  svg.appendChild(svgEl('text', {
    x: left + (W - left - right) / 2, y: H - 12, 'text-anchor': 'middle',
    style: TICK_STYLE, text: model.setting.axis
  }));

  state.centres.forEach((c, j) => {
    const y = top + j * rowHeight + rowHeight / 2;
    const token = SERIES_TOKEN[j % SERIES_TOKEN.length];

    svg.appendChild(svgEl('line', { x1: left, y1: y, x2: W - right, y2: y, style: GRID_STYLE }));
    svg.appendChild(svgEl('text', { x: 8, y: y + 4, style: LABEL_STYLE, text: `c${j + 1}` }));

    model.points.forEach((p, i) => {
      if (state.labels[i] !== j) return;
      svg.appendChild(shapeNode(SHAPES[j % SHAPES.length], px(p[0]), y, 4, `fill:${token};stroke:${token}`));
    });

    const x = px(c[0]);
    svg.appendChild(svgEl('line', { x1: x, y1: y - 18, x2: x, y2: y + 18, style: CENTRE_STYLE }));
    svg.appendChild(svgEl('text', { x: x + 6, y: y - 20, style: LABEL_STYLE, text: formatNumber(c[0], 0) }));
  });

  return svg;
}

})(window);
