/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   cross-delaunay-thread.js
   Demo for cross-cutting/delaunay-thread.html
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access, no hex values.

   M6 defines the Delaunay triangulation by exhaustion:

     consider every triangulation T of the point set; let theta(T) be the
     smallest angle appearing in any of its triangles. T* is Delaunay when
     theta(T) <= theta(T*) for every T.

   That definition is usually shown and never carried out, because "every
   triangulation" is a large set. For points in convex position it is exactly
   the Catalan numbers — 5, 14, 42, 132 for 5 to 8 points — which is small
   enough to enumerate honestly in a browser. So this demo does the thing the
   definition says: it builds every triangulation, measures every angle, ranks
   them, and lets you walk from the worst to the best. The last step is the
   Delaunay triangulation.
   ========================================================================== */

const { createDemo, svgEl, seededRandom, formatNumber } = window.Demo;
/* ==========================================================================
   1. Geometry
   ========================================================================== */

/**
 * Points in convex position on an ellipse.
 *
 * An ellipse, not a circle: points on a circle are cocircular, every
 * triangulation of them is Delaunay, and the demo would have nothing to show.
 */
function convexPoints(n, seed) {
  const rand = seededRandom(seed);
  const angles = [];
  for (let i = 0; i < n; i += 1) {
    angles.push((2 * Math.PI * i) / n + (rand() - 0.5) * (Math.PI / n));
  }
  angles.sort((a, b) => a - b);
  return angles.map((theta) => [
    5 + 4.4 * Math.cos(theta),
    5 + 2.9 * Math.sin(theta)
  ]);
}

function length(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

function triangleArea(p, q, r) {
  return Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2;
}

/** The three interior angles in degrees, in vertex order p, q, r. */
function triangleAngles(p, q, r) {
  const a = length(q, r);   // opposite p
  const b = length(p, r);   // opposite q
  const c = length(p, q);   // opposite r
  const clamp = (v) => Math.min(1, Math.max(-1, v));
  const toDeg = 180 / Math.PI;
  return [
    Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))) * toDeg,
    Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c))) * toDeg,
    Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b))) * toDeg
  ];
}

/**
 * Every triangulation of a convex polygon with vertices 0..n-1, in order.
 * Count is the Catalan number C(n-2): 5, 14, 42, 132 for n = 5, 6, 7, 8.
 */
function everyTriangulation(n) {
  const cache = new Map();

  function rec(i, j) {
    const key = `${i}:${j}`;
    if (cache.has(key)) return cache.get(key);
    if (j - i < 2) return [[]];

    const out = [];
    for (let k = i + 1; k < j; k += 1) {
      rec(i, k).forEach((left) => {
        rec(k, j).forEach((right) => {
          out.push([[i, k, j], ...left, ...right]);
        });
      });
    }
    cache.set(key, out);
    return out;
  }

  return rec(0, n - 1);
}

/* ==========================================================================
   2. Drawing
   ========================================================================== */

const AXIS_STYLE = 'stroke:var(--fsu-chart-axis);fill:none;stroke-width:2';
const GRID_STYLE = 'stroke:var(--fsu-chart-gridline);fill:none;stroke-width:1';
const TICK_STYLE = 'fill:var(--fsu-color-caption);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
const LABEL_STYLE = 'fill:var(--fsu-color-body);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';

/* ==========================================================================
   3. The demo
   ========================================================================== */

createDemo('#demo-delaunay-ranking-mount', {
  id: 'demo-delaunay-ranking',
  title: 'Every triangulation, ranked by its smallest angle',
  description:
    'The demo builds every triangulation of the point set, measures the smallest angle in each, ' +
    'and orders them worst first. Press Last, or the End key with the figure focused, to jump ' +
    'straight to the Delaunay triangulation.',
  headingLevel: 4,

  controls: [
    {
      type: 'range',
      name: 'n',
      label: 'Number of points',
      min: 5,
      max: 8,
      step: 1,
      value: 6,
      valueText: (v) => {
        const catalan = { 5: 5, 6: 14, 7: 42, 8: 132 };
        return `${v} points, giving ${catalan[v]} triangulations`;
      },
      help: 'The points sit on an ellipse, so they are in convex position and the triangulation count is a Catalan number.'
    },
    {
      type: 'seed',
      name: 'seed',
      label: 'Random seed for the point positions',
      value: 42,
      help: 'The seed fixes the point set exactly, so a result can be reproduced and discussed.'
    }
  ],

  compute(values) {
    const n = Math.min(8, Math.max(5, Math.round(values.n)));
    const points = convexPoints(n, Number(values.seed) || 1);

    const all = everyTriangulation(n).map((triangles) => {
      const measured = triangles.map(([i, j, k]) => {
        const angles = triangleAngles(points[i], points[j], points[k]);
        return {
          vertices: [i, j, k],
          angles,
          minAngle: Math.min(...angles),
          minAt: [i, j, k][angles.indexOf(Math.min(...angles))],
          area: triangleArea(points[i], points[j], points[k])
        };
      });
      const minAngle = measured.reduce((best, t) => Math.min(best, t.minAngle), Infinity);
      return { triangles: measured, minAngle };
    });

    all.sort((a, b) => a.minAngle - b.minAngle);

    return {
      n,
      points,
      all,
      count: all.length,
      worst: all[0],
      best: all[all.length - 1]
    };
  },

  steps: {
    count: (model) => model.count,
    label: (model, i) => {
      const t = model.all[i];
      const previous = i > 0 ? model.all[i - 1] : null;
      const gain = previous ? t.minAngle - previous.minAngle : 0;
      const worstTriangle = t.triangles.reduce((best, tri) => (tri.minAngle < best.minAngle ? tri : best), t.triangles[0]);
      const names = worstTriangle.vertices.map((v) => `P${v + 1}`).join(', ');

      if (i === 0) {
        return `Triangulation 1 of ${model.count}, the worst of them all. Its smallest angle is ` +
          `${formatNumber(t.minAngle, 1)} degrees, in the triangle on ${names}.`;
      }
      if (i === model.count - 1) {
        return `Triangulation ${i + 1} of ${model.count}, the best of them all — this is the Delaunay ` +
          `triangulation. Its smallest angle is ${formatNumber(t.minAngle, 1)} degrees, ` +
          `${formatNumber(gain, 1)} degrees better than the previous one and ` +
          `${formatNumber(t.minAngle - model.worst.minAngle, 1)} degrees better than the worst.`;
      }
      return `Triangulation ${i + 1} of ${model.count}. Its smallest angle is ` +
        `${formatNumber(t.minAngle, 1)} degrees, ${gain > 0.05 ? `${formatNumber(gain, 1)} degrees better than` : 'the same as'} ` +
        `the previous one, and it occurs in the triangle on ${names}.`;
    }
  },

  figure(model, ctx) {
    const W = 560;
    const H = 420;
    const left = 44;
    const right = 24;
    const top = 20;
    const bottom = 48;

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

    const state = model.all[ctx.step];
    const worstTriangle = state.triangles
      .reduce((best, tri) => (tri.minAngle < best.minAngle ? tri : best), state.triangles[0]);

    /* The triangle holding the smallest angle is filled with a hatch of its
       own edges drawn heavier, and it is named in the caption and the table —
       so it is identified by weight and by words, never by colour alone. */
    state.triangles.forEach((tri) => {
      const isWorst = tri === worstTriangle;
      const pts = tri.vertices
        .map((v) => `${formatNumber(px(model.points[v][0]), 1)},${formatNumber(py(model.points[v][1]), 1)}`)
        .join(' ');
      // The triangle holding the smallest angle is heavy and solid; the rest
      // are thin and dashed. Weight and dash carry the distinction, and the
      // table names the triangle, so nothing depends on colour (1.4.1). The
      // ordinary edges use a measured text colour rather than a series token
      // so they stay legible on both the light and the dark canvas.
      svg.appendChild(svgEl('polygon', {
        points: pts,
        style: isWorst
          ? 'fill:none;stroke:var(--fsu-series-1);stroke-width:4'
          : 'fill:none;stroke:var(--fsu-color-caption);stroke-width:1.75',
        'stroke-dasharray': isWorst ? null : '5 3'
      }));
    });

    /* The polygon boundary, drawn last so it stays legible. */
    const boundary = model.points
      .map((p) => `${formatNumber(px(p[0]), 1)},${formatNumber(py(p[1]), 1)}`)
      .join(' ');
    svg.appendChild(svgEl('polygon', {
      points: boundary,
      style: 'fill:none;stroke:var(--fsu-color-strong);stroke-width:2.5'
    }));

    model.points.forEach((p, i) => {
      svg.appendChild(svgEl('circle', {
        cx: px(p[0]), cy: py(p[1]), r: 5,
        style: 'fill:var(--fsu-color-strong);stroke:var(--fsu-color-strong)'
      }));
      const outX = p[0] > 5 ? 12 : -20;
      const outY = p[1] > 5 ? -10 : 18;
      svg.appendChild(svgEl('text', {
        x: px(p[0]) + outX, y: py(p[1]) + outY, style: LABEL_STYLE, text: `P${i + 1}`
      }));
    });

    return svg;
  },

  figureAlt(model, ctx) {
    const state = model.all[ctx.step];
    const worstTriangle = state.triangles
      .reduce((best, tri) => (tri.minAngle < best.minAngle ? tri : best), state.triangles[0]);
    const names = worstTriangle.vertices.map((v) => `P${v + 1}`).join(', ');
    const isDelaunay = ctx.step === model.count - 1;

    return `A convex polygon on ${model.n} labelled points, cut into ${model.n - 2} triangles by ` +
      `${model.n - 3} diagonals. This is arrangement ${ctx.step + 1} of ${model.count}, ordered from the ` +
      `worst smallest angle to the best. Its smallest angle is ${formatNumber(state.minAngle, 1)} degrees, ` +
      `in the heavily drawn triangle on ${names}. ` +
      (isDelaunay
        ? 'This is the last arrangement, so it is the Delaunay triangulation: no other arrangement of these points has a larger smallest angle.'
        : `The Delaunay triangulation, ${model.count - ctx.step - 1} step${model.count - ctx.step - 1 === 1 ? '' : 's'} further on, reaches ${formatNumber(model.best.minAngle, 1)} degrees.`);
  },

  table(model, ctx) {
    const state = model.all[ctx.step];
    const worstTriangle = state.triangles
      .reduce((best, tri) => (tri.minAngle < best.minAngle ? tri : best), state.triangles[0]);

    return {
      caption: `The ${model.n - 2} triangles of arrangement ${ctx.step + 1} of ${ctx.stepCount}, ` +
        `whose smallest angle is ${formatNumber(state.minAngle, 1)} degrees. ` +
        `The best possible for this point set is ${formatNumber(model.best.minAngle, 1)} degrees.`,
      rowHeader: true,
      columns: [
        { label: 'Triangle' },
        { label: 'Vertex coordinates' },
        { label: 'Area', numeric: true },
        { label: 'Angles', unit: 'degrees' },
        { label: 'Smallest angle', unit: 'degrees', numeric: true }
      ],
      rows: state.triangles.map((tri) => ({
        cells: [
          tri.vertices.map((v) => `P${v + 1}`).join(', '),
          tri.vertices.map((v) => `(${formatNumber(model.points[v][0], 2)}, ${formatNumber(model.points[v][1], 2)})`).join('; '),
          formatNumber(tri.area, 2),
          tri.angles.map((a) => formatNumber(a, 1)).join(', '),
          formatNumber(tri.minAngle, 1)
        ],
        current: tri === worstTriangle
      }))
    };
  },

  summary(model, ctx) {
    const state = model.all[ctx.step];
    const isDelaunay = ctx.step === model.count - 1;

    const lines = [
      `${model.n} points in convex position have exactly ${model.count} triangulations. ` +
      `All ${model.count} were built and measured; this is number ${ctx.step + 1}, counting from the worst.`,
      `Smallest angle here: ${formatNumber(state.minAngle, 1)} degrees. ` +
      `Worst possible: ${formatNumber(model.worst.minAngle, 1)} degrees. ` +
      `Best possible: ${formatNumber(model.best.minAngle, 1)} degrees.`
    ];

    if (isDelaunay) {
      lines.push(
        'This is the Delaunay triangulation, by the definition M6 gives: no other triangulation of ' +
        'these points has a larger smallest angle. It beats the worst arrangement by ' +
        `${formatNumber(model.best.minAngle - model.worst.minAngle, 1)} degrees.`
      );
    } else {
      lines.push(
        `Press Last, or the End key with the figure focused, to jump to the Delaunay triangulation ` +
        `and gain ${formatNumber(model.best.minAngle - state.minAngle, 1)} degrees.`
      );
    }

    lines.push(
      'Note what the definition does not promise: the best smallest angle can still be small. ' +
      'Delaunay maximises the minimum angle among triangulations of this point set, which is a much ' +
      'weaker statement than "no thin triangles".'
    );

    return lines;
  }
});

})(window);
