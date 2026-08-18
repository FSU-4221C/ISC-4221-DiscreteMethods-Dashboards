/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m6-computational-geometry.js — every interactive demo on the M6 page
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access, works from a file:// URL.

   WHAT IS IN HERE
     A small exact-arithmetic-free geometry core (vectors, orientation, hull,
     triangulation, quadrature), then eight demo specs handed to the shared
     runtime in ../demo.js. The runtime builds the labelled controls, the
     figure/table toggle, the aria-live summary and the playback machinery;
     this file only says WHAT to compute and HOW to say it in words.

   WHY NOTHING IS FETCHED
     `Dashboard/assets/data/m6/` does not exist: the build pipeline shipped no
     precomputed traces for this module. Every trace below is therefore
     computed in the browser, deterministically. Nothing here calls
     Math.random() without a seed control, and nothing reads the clock, so a
     student can quote a run in office hours and get the same numbers back.

   SOURCES FOR THE MATHS
     P1_CG / P2_CG / P3_CG (the module's three decks), Lab 12, Lab 13 and
     Final Exam Question 1. Worked examples reuse the source's own numbers —
     p1 = (2,0), p2 = (5,4) from the final; the triangle (4,1), (8,3), (0,9)
     from P2 frame 8; the triangle (4,0), (3,4), (0,1) from
     triangle_contains_test and Lab 12 Problem 1; the five-vertex polygon from
     Final Question 1(e); the precision-4 constants from P3 frame 35.
   ========================================================================== */

const { createDemo, svgEl, seededRandom, formatNumber } = window.Demo;
/* ==========================================================================
   0. Colour and text style — tokens only, never a literal colour
   ========================================================================== */

const C = {
  s1: 'var(--fsu-series-1)',
  s2: 'var(--fsu-series-2)',
  s3: 'var(--fsu-series-3)',
  s4: 'var(--fsu-series-4)',
  s5: 'var(--fsu-series-5)',
  s6: 'var(--fsu-series-6)',
  axis: 'var(--fsu-chart-axis)',
  grid: 'var(--fsu-chart-gridline)',
  body: 'var(--fsu-color-body)',
  caption: 'var(--fsu-color-caption)',
  surface: 'var(--fsu-surface)'
};

const TEXT = 'font-family: var(--fsu-font-sans); font-size: var(--fsu-text-small); ' +
             'paint-order: stroke fill; stroke: var(--fsu-surface); stroke-width: 3px; ' +
             'stroke-linejoin: round;';

/* ==========================================================================
   1. Vector and geometry core
   Exported so it can be exercised from Node without a DOM (see the guard at
   the very bottom of this file).
   ========================================================================== */

const EPS = 1e-9;

const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  mul: (a, k) => [a[0] * k, a[1] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  cross: (a, b) => a[0] * b[1] - a[1] * b[0],
  norm: (a) => Math.hypot(a[0], a[1]),
  /* Rotate 90 degrees counter-clockwise: the slides' nv = [-v(2), +v(1)]. */
  perp: (a) => [-a[1], a[0]]
};

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Signed area of triangle abc. Positive when a, b, c are counter-clockwise. */
function signedArea(a, b, c) {
  return 0.5 * ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
}

/** The slides' line_side: dot product of the CCW normal of p2-p1 with p-p1. */
function lineSide(p1, p2, p) {
  return V.dot(V.perp(V.sub(p2, p1)), V.sub(p, p1));
}

/** True when p is inside the CLOSED triangle abc (boundary counts). */
function inTriangleClosed(a, b, c, p) {
  const tri = signedArea(a, b, c) >= 0 ? [a, b, c] : [a, c, b];
  return lineSide(tri[0], tri[1], p) >= -1e-9 &&
         lineSide(tri[1], tri[2], p) >= -1e-9 &&
         lineSide(tri[2], tri[0], p) >= -1e-9;
}

/** Nearest point on segment ab to p, together with the clamped parameter s. */
function nearestOnSegment(a, b, p) {
  const v = V.sub(b, a);
  const vv = V.dot(v, v);
  const raw = vv < EPS ? 0 : V.dot(V.sub(p, a), v) / vv;
  const s = Math.min(1, Math.max(0, raw));
  return { point: V.add(a, V.mul(v, s)), s, raw };
}

/** Distance from p to triangle abc, plus which feature is nearest. */
function triangleDistance(a, b, c, p) {
  if (inTriangleClosed(a, b, c, p)) {
    return { distance: 0, feature: 'inside the triangle', point: p.slice() };
  }
  const edges = [['AB', a, b], ['BC', b, c], ['CA', c, a]];
  let best = null;
  edges.forEach(([name, u, w]) => {
    const near = nearestOnSegment(u, w, p);
    const d = dist(p, near.point);
    if (!best || d < best.distance - 1e-12) {
      let feature;
      if (near.s <= 1e-9) feature = `vertex ${name[0]}`;
      else if (near.s >= 1 - 1e-9) feature = `vertex ${name[1]}`;
      else feature = `a point on side ${name}`;
      best = { distance: d, feature, point: near.point, edge: name, s: near.s };
    }
  });
  return best;
}

/** Shoelace area of a polygon given as an array of [x, y]. Signed. */
function polygonSignedArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

/** Interior angles of a triangle, in degrees, in the order A, B, C. */
function triangleAngles(a, b, c) {
  const ab = dist(a, b);
  const bc = dist(b, c);
  const ca = dist(c, a);
  const ang = (adj1, adj2, opp) => {
    const cosine = (adj1 * adj1 + adj2 * adj2 - opp * opp) / (2 * adj1 * adj2);
    return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
  };
  return { alpha: ang(ab, ca, bc), beta: ang(ab, bc, ca), gamma: ang(bc, ca, ab), ab, bc, ca };
}

/** Smallest interior angle of a triangle, in degrees. */
function minAngle(a, b, c) {
  const g = triangleAngles(a, b, c);
  return Math.min(g.alpha, g.beta, g.gamma);
}

/* --- Gift wrapping (Jarvis march) ----------------------------------------
   Returns the hull as indices into `pts`, counter-clockwise, starting at the
   leftmost point (ties broken by the lowest y) — exactly the start rule on
   P3 frame 9. */
function convexHull(pts) {
  const n = pts.length;
  if (n < 3) return pts.map((_, i) => i);

  let start = 0;
  for (let i = 1; i < n; i += 1) {
    if (pts[i][0] < pts[start][0] ||
        (pts[i][0] === pts[start][0] && pts[i][1] < pts[start][1])) start = i;
  }

  const hull = [start];
  let cur = start;
  let guard = 0;

  do {
    let next = (cur + 1) % n;
    for (let cand = 0; cand < n; cand += 1) {
      if (cand === cur || cand === next) continue;
      const cr = V.cross(V.sub(pts[next], pts[cur]), V.sub(pts[cand], pts[cur]));
      if (cr < -EPS ||
          (Math.abs(cr) <= EPS && dist(pts[cur], pts[cand]) > dist(pts[cur], pts[next]))) {
        next = cand;
      }
    }
    cur = next;
    if (cur !== start) hull.push(cur);
    guard += 1;
  } while (cur !== start && guard <= n + 2);

  return hull;
}

/** Order a triangle's indices so its vertices run counter-clockwise. */
function ccw(pts, tri) {
  return signedArea(pts[tri[0]], pts[tri[1]], pts[tri[2]]) >= 0
    ? tri.slice()
    : [tri[0], tri[2], tri[1]];
}

/** In-circle test. abc must be counter-clockwise. > 0 means d is inside. */
function inCircle(a, b, c, d) {
  const ax = a[0] - d[0], ay = a[1] - d[1];
  const bx = b[0] - d[0], by = b[1] - d[1];
  const cx = c[0] - d[0], cy = c[1] - d[1];
  return (ax * ax + ay * ay) * (bx * cy - by * cx)
       - (bx * bx + by * by) * (ax * cy - ay * cx)
       + (cx * cx + cy * cy) * (ax * by - ay * bx);
}

/**
 * A valid but arbitrary triangulation of the whole point set: fan the convex
 * hull from its first vertex, then push each interior point into whichever
 * triangle holds it, splitting that triangle into three.
 */
function seedTriangulation(pts) {
  const hull = convexHull(pts);
  const tris = [];
  for (let i = 1; i < hull.length - 1; i += 1) {
    tris.push(ccw(pts, [hull[0], hull[i], hull[i + 1]]));
  }

  const onHull = new Set(hull);
  for (let i = 0; i < pts.length; i += 1) {
    if (onHull.has(i)) continue;
    let host = -1;
    for (let t = 0; t < tris.length; t += 1) {
      const [x, y, z] = tris[t];
      if (inTriangleClosed(pts[x], pts[y], pts[z], pts[i])) { host = t; break; }
    }
    if (host === -1) continue;
    const [x, y, z] = tris[host];
    tris.splice(host, 1, ccw(pts, [x, y, i]), ccw(pts, [y, z, i]), ccw(pts, [z, x, i]));
  }

  return { tris, hull };
}

function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

/** Find one edge that fails the in-circle test and can legally be flipped. */
function findFlip(pts, tris) {
  const map = new Map();
  tris.forEach((t, ti) => {
    for (let e = 0; e < 3; e += 1) {
      const key = edgeKey(t[e], t[(e + 1) % 3]);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ti);
    }
  });

  for (const [key, owners] of map) {
    if (owners.length !== 2) continue;
    const [i, j] = owners;
    const [a, b] = key.split('|').map(Number);
    const c = tris[i].find((v) => v !== a && v !== b);
    const d = tris[j].find((v) => v !== a && v !== b);
    if (c === undefined || d === undefined) continue;

    if (inCircle(pts[tris[i][0]], pts[tris[i][1]], pts[tris[i][2]], pts[d]) <= 1e-12) continue;

    /* The quadrilateral a-c-b-d must be convex, or the flip would produce
       overlapping triangles. a and b have to fall on opposite sides of cd. */
    const sa = V.cross(V.sub(pts[d], pts[c]), V.sub(pts[a], pts[c]));
    const sb = V.cross(V.sub(pts[d], pts[c]), V.sub(pts[b], pts[c]));
    if (Math.abs(sa) < 1e-9 || Math.abs(sb) < 1e-9 || Math.sign(sa) === Math.sign(sb)) continue;

    return {
      i: Math.min(i, j),
      j: Math.max(i, j),
      removed: [a, b],
      added: [c, d],
      t1: ccw(pts, [a, c, d]),
      t2: ccw(pts, [b, c, d])
    };
  }
  return null;
}

/**
 * Lawson's flip algorithm. Repeatedly replace the diagonal of any two
 * triangles that fail the empty-circumcircle test. Each flip cannot decrease
 * the smallest angle, so the loop terminates at the Delaunay triangulation.
 */
function delaunayByFlips(pts, options = {}) {
  const keepStates = options.keepStates !== false;
  const maxFlips = options.maxFlips || 5000;
  const seeded = seedTriangulation(pts);
  const tris = seeded.tris.map((t) => t.slice());

  const states = keepStates ? [tris.map((t) => t.slice())] : [];
  const flips = [];

  for (let k = 0; k < maxFlips; k += 1) {
    const flip = findFlip(pts, tris);
    if (!flip) break;
    tris.splice(flip.j, 1);
    tris.splice(flip.i, 1, flip.t1, flip.t2);
    flips.push(flip);
    if (keepStates) states.push(tris.map((t) => t.slice()));
  }

  return { tris, flips, states, hull: seeded.hull, initial: seeded.tris };
}

/** Smallest angle over every triangle of a triangulation, in degrees. */
function triangulationMinAngle(pts, tris) {
  return tris.reduce(
    (acc, t) => Math.min(acc, minAngle(pts[t[0]], pts[t[1]], pts[t[2]])),
    Infinity
  );
}

/* ==========================================================================
   2. Plotting helpers — every colour is a token, every label is real <text>
   ========================================================================== */

function newPlot(bounds, options = {}) {
  const w = options.width || 360;
  const h = options.height || 260;
  const pad = options.pad === undefined ? 26 : options.pad;
  const [xMin, xMax, yMin, yMax] = bounds;
  const dx = (xMax - xMin) || 1;
  const dy = (yMax - yMin) || 1;
  const k = Math.min((w - 2 * pad) / dx, (h - 2 * pad) / dy);
  const usedW = k * dx;
  const usedH = k * dy;
  const ox = pad + ((w - 2 * pad) - usedW) / 2;
  const oy = pad + ((h - 2 * pad) - usedH) / 2;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: 'xMidYMid meet',
    style: 'width: 100%; height: auto;'
  });

  return {
    svg,
    k,
    X: (v) => ox + (v - xMin) * k,
    Y: (v) => oy + usedH - (v - yMin) * k,
    box: { ox, oy, usedW, usedH },
    bounds: { xMin, xMax, yMin, yMax },
    add(node) { svg.appendChild(node); return node; }
  };
}

function frame(plot, xLabel, yLabel) {
  const { ox, oy, usedW, usedH } = plot.box;
  plot.add(svgEl('rect', {
    x: ox, y: oy, width: usedW, height: usedH,
    style: `fill: none; stroke: ${C.grid}; stroke-width: 1;`
  }));
  const tick = (x, y, text, anchor) => plot.add(svgEl('text', {
    x, y, 'text-anchor': anchor,
    style: `${TEXT} fill: ${C.caption};`,
    text
  }));
  tick(ox, oy + usedH + 15, String(plot.bounds.xMin), 'start');
  tick(ox + usedW, oy + usedH + 15, String(plot.bounds.xMax), 'end');
  tick(ox - 5, oy + usedH, String(plot.bounds.yMin), 'end');
  tick(ox - 5, oy + 10, String(plot.bounds.yMax), 'end');
  if (xLabel) tick(ox + usedW / 2, oy + usedH + 15, xLabel, 'middle');
  if (yLabel) tick(ox + usedW / 2, oy - 8, yLabel, 'middle');
  return plot;
}

function marker(shape, cx, cy, size, style) {
  const s = size;
  switch (shape) {
    case 'square':
      return svgEl('rect', { x: cx - s, y: cy - s, width: 2 * s, height: 2 * s, style });
    case 'diamond':
      return svgEl('polygon', {
        points: `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`, style
      });
    case 'triangle':
      return svgEl('polygon', {
        points: `${cx},${cy - s} ${cx + s},${cy + s * 0.85} ${cx - s},${cy + s * 0.85}`, style
      });
    case 'cross':
      return svgEl('path', {
        d: `M${cx - s},${cy - s}L${cx + s},${cy + s}M${cx - s},${cy + s}L${cx + s},${cy - s}`,
        style
      });
    case 'ring':
      return svgEl('circle', { cx, cy, r: s, style });
    default:
      return svgEl('circle', { cx, cy, r: s, style });
  }
}

function textAt(x, y, text, extra = '', anchor = 'middle') {
  return svgEl('text', {
    x, y, 'text-anchor': anchor,
    style: `${TEXT} fill: ${C.body}; ${extra}`,
    text
  });
}

function line(x1, y1, x2, y2, style) {
  return svgEl('line', { x1, y1, x2, y2, style });
}

function polyline(points, style, close) {
  const attr = points.map((p) => `${p[0]},${p[1]}`).join(' ');
  return svgEl(close ? 'polygon' : 'polyline', { points: attr, style });
}

const fmt = (v, d = 3) => formatNumber(v, d);
const pt = (p, d = 2) => `(${fmt(p[0], d)}, ${fmt(p[1], d)})`;

function boundsOf(points, margin = 1) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [
    Math.min(...xs) - margin, Math.max(...xs) + margin,
    Math.min(...ys) - margin, Math.max(...ys) + margin
  ];
}

/* ==========================================================================
   3. Demo — the s and t coordinates of a point against a line   (6.1)
   ========================================================================== */

const LINE_P1 = [2, 0];
const LINE_P2 = [5, 4];

function lineModel(values, state) {
  /* All three points come from stage state so a drag survives the recompute
     it triggers. LINE_P1 / LINE_P2 remain the DEFAULTS, which is what Reset
     restores — the exam data is where the reader starts, not where they are
     stuck. */
  const q = (state && state.q) || [1, 1];
  const p1 = (state && state.p1) || LINE_P1;
  const p2 = (state && state.p2) || LINE_P2;
  const v = V.sub(p2, p1);
  const r = V.sub(q, p1);
  const vv = V.dot(v, v);
  const rv = V.dot(r, v);
  const len = Math.sqrt(vv);
  /* Guard the degenerate case rather than letting it produce NaN. A NaN
     never throws: it reaches lineTo(NaN, NaN), the canvas silently declines
     to draw, and the reader gets a blank panel and a clean console. */
  const degenerate = len < 1e-9;
  const s = degenerate ? 0 : rv / vv;
  const foot = degenerate ? p1.slice() : V.add(p1, V.mul(v, s));
  const w = degenerate ? [0, 0] : V.mul(V.perp(v), 1 / len);
  const t = V.dot(w, r);
  const d = dist(q, foot);

  const stages = [
    {
      name: 'Direction vector v',
      value: pt(v),
      how: 'v = p₂ − p₁',
      note: `length ‖v‖ = ${fmt(len, 3)}`
    },
    {
      name: 'Offset vector r',
      value: pt(r),
      how: 'r = q − p₁',
      note: `length ‖r‖ = ${fmt(V.norm(r), 3)}`
    },
    {
      name: 's coordinate',
      value: fmt(s, 4),
      how: 's = (r · v) / (v · v)',
      note: `r · v = ${fmt(rv, 3)}, v · v = ${fmt(vv, 3)}`
    },
    {
      name: 'Nearest point p(s)',
      value: pt(foot),
      how: 'p(s) = p₁ + s v',
      note: s < 0 ? 'behind p₁' : (s > 1 ? 'beyond p₂' : 'between p₁ and p₂')
    },
    {
      name: 't coordinate',
      value: fmt(t, 4),
      how: 't = w · r with w = (−v_y, v_x) / ‖v‖',
      note: `w = ${pt(w, 3)}`
    },
    {
      name: 'Distance from q to the line',
      value: fmt(d, 4),
      how: 'distance = |t| = ‖q − p(s)‖',
      note: Math.abs(Math.abs(t) - d) < 1e-9 ? 'the two routes agree' : 'check the arithmetic'
    }
  ];

  return { q, p1, p2, v, r, s, foot, len, w, t, d, vv, rv, stages,
           state, onLine: !degenerate && Math.abs(t) < 1e-9 };
}

const LINE_STEP_TEXT = [
  (m) => `Set up. The direction vector is v = p₂ − p₁ = ${pt(m.v)}, with length ${fmt(m.len, 3)}. ` +
         'Every point on the line is p(s) = p₁ + s v.',
  (m) => `Offset. r = q − p₁ = ${pt(m.r)} points from p₁ out to q. Nothing about the line is used yet.`,
  (m) => `Projection. s = (r · v) / (v · v) = ${fmt(m.rv, 3)} / ${fmt(m.vv, 3)} = ${fmt(m.s, 4)}. ` +
         (m.s < 0 ? 'A negative s puts the nearest point behind p₁.'
                  : m.s > 1 ? 'An s above 1 puts the nearest point beyond p₂.'
                            : 'An s between 0 and 1 puts the nearest point on the segment p₁p₂.'),
  (m) => `Foot of the perpendicular. p(s) = p₁ + ${fmt(m.s, 4)} v = ${pt(m.foot)}. ` +
         'This is the point of the line closest to q.',
  (m) => `Perpendicular coordinate. Rotating v gives w = ${pt(m.w, 3)}, and t = w · r = ${fmt(m.t, 4)}. ` +
         (Math.abs(m.t) < 1e-9 ? 'A zero t means q is on the line.'
                               : m.t > 0 ? 'A positive t puts q to the left of the line as it runs from p₁ to p₂.'
                                         : 'A negative t puts q to the right of the line as it runs from p₁ to p₂.'),
  (m) => `Check. |t| = ${fmt(Math.abs(m.t), 4)} and ‖q − p(s)‖ = ${fmt(m.d, 4)}. ` +
         'The perpendicular coordinate and the straight-line distance are the same number.'
];

function lineFigure(model, ctx) {
  const step = ctx.step;
  const all = [LINE_P1, LINE_P2, model.q, model.foot];
  const plot = frame(newPlot(boundsOf(all, 1.5)), 'x', null);
  const { X, Y } = plot;

  /* the line, drawn well past both defining points */
  const far1 = V.add(LINE_P1, V.mul(model.v, -0.8));
  const far2 = V.add(LINE_P1, V.mul(model.v, 1.9));
  plot.add(line(X(far1[0]), Y(far1[1]), X(far2[0]), Y(far2[1]),
    `stroke: ${C.s1}; stroke-width: 2;`));

  if (step >= 0) {
    plot.add(line(X(LINE_P1[0]), Y(LINE_P1[1]), X(LINE_P2[0]), Y(LINE_P2[1]),
      `stroke: ${C.s1}; stroke-width: 5; stroke-linecap: round;`));
  }

  if (step >= 1) {
    plot.add(line(X(LINE_P1[0]), Y(LINE_P1[1]), X(model.q[0]), Y(model.q[1]),
      `stroke: ${C.s3}; stroke-width: 2; stroke-dasharray: 2 3;`));
  }

  if (step >= 3) {
    plot.add(marker('triangle', X(model.foot[0]), Y(model.foot[1]), 6,
      `fill: ${C.s5}; stroke: ${C.surface}; stroke-width: 1.5;`));
    plot.add(textAt(X(model.foot[0]), Y(model.foot[1]) - 10, `p(s) ${pt(model.foot)}`));
  }

  if (step >= 4) {
    plot.add(line(X(model.foot[0]), Y(model.foot[1]), X(model.q[0]), Y(model.q[1]),
      `stroke: ${C.s6}; stroke-width: 3; stroke-dasharray: 6 4;`));
  }

  [[LINE_P1, 'p₁', 'circle'], [LINE_P2, 'p₂', 'square']].forEach(([p, name, shape]) => {
    plot.add(marker(shape, X(p[0]), Y(p[1]), 5, `fill: ${C.s1};`));
    plot.add(textAt(X(p[0]), Y(p[1]) + 18, `${name} ${pt(p, 0)}`));
  });

  plot.add(marker('diamond', X(model.q[0]), Y(model.q[1]), 6, `fill: ${C.s3};`));
  plot.add(textAt(X(model.q[0]), Y(model.q[1]) - 11, `q ${pt(model.q, 2)}`));

  return plot.svg;
}

/* ==========================================================================
   4. Demo — triangle properties and the region codes   (6.2)
   ========================================================================== */

const TRIANGLES = {
  slides: { label: 'A (4, 1), B (8, 3), C (0, 9) — the slides’ worked example',
            verts: [[4, 1], [8, 3], [0, 9]] },
  contains: { label: 'A (4, 0), B (3, 4), C (0, 1) — the triangle_contains test',
              verts: [[4, 0], [3, 4], [0, 1]] },
  lab12: { label: 'A (1, 2), B (5, 3), C (4, 7) — Lab 12 Problem 3',
           verts: [[1, 2], [5, 3], [4, 7]] }
};

function triangleModel(values, state) {
  /* The preset select seeds the vertices; the handles own them afterwards.
     `state.preset` records which preset the current vertices came from, so
     re-selecting the same preset does not silently undo a drag, while
     choosing a DIFFERENT one loads it. Without that record the demo either
     forgets every drag on each recompute or can never load a preset twice. */
  const wanted = values.tri || 'slides';
  if (state && state.preset !== wanted) {
    state.preset = wanted;
    state.verts = (TRIANGLES[wanted] || TRIANGLES.slides).verts.map((v) => v.slice());
  }
  const base = (state && state.verts) || TRIANGLES.slides.verts;
  const clockwise = Boolean(values.clockwise);
  const [A, B, C] = clockwise ? [base[0], base[2], base[1]] : base;
  const p = (state && state.p) || [6, 7];

  const g = triangleAngles(A, B, C);
  const signed = signedArea(A, B, C);
  const centroid = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];

  const sides = [['AB', A, B], ['BC', B, C], ['CA', C, A]];
  const raw = sides.map(([, u, w]) => lineSide(u, w, p));
  const bits = raw.map((value) => (value >= 0 ? 1 : 0));
  const code = bits.join('');
  const inside = bits.every((b) => b === 1);
  const near = triangleDistance(A, B, C, p);

  const codeMeaning = inside
    ? 'inside the triangle, or on its boundary'
    : bits.filter((b) => b === 0).length === 1
      ? `outside, facing side ${sides[bits.indexOf(0)][0]}`
      : `outside, beyond vertex ${['C', 'A', 'B'][bits.indexOf(1)]}`;

  return {
    A, B, C, p, clockwise, g, signed, area: Math.abs(signed), centroid,
    raw, bits, code, inside, near, codeMeaning, sides, state,
    /* A triangle dragged flat has zero area and no orientation. Say so
       rather than reporting "clockwise" for a straight line. */
    degenerate: Math.abs(signed) < 1e-9,
    orientation: Math.abs(signed) < 1e-9 ? 'degenerate — the three points are collinear'
               : signed > 0 ? 'counter-clockwise' : 'clockwise'
  };
}

function triangleFigure(model) {
  const plot = frame(newPlot(boundsOf([model.A, model.B, model.C, model.p], 1.5)), 'x', null);
  const { X, Y } = plot;

  plot.add(polyline([model.A, model.B, model.C].map((v) => [X(v[0]), Y(v[1])]),
    `fill: none; stroke: ${C.s1}; stroke-width: 2.5;`, true));

  [[model.A, 'A'], [model.B, 'B'], [model.C, 'C']].forEach(([v, name], i) => {
    plot.add(marker(['circle', 'square', 'triangle'][i], X(v[0]), Y(v[1]), 5, `fill: ${C.s1};`));
    plot.add(textAt(X(v[0]), Y(v[1]) - 10, `${name} ${pt(v, 0)}`));
  });

  plot.add(marker('cross', X(model.centroid[0]), Y(model.centroid[1]), 6,
    `stroke: ${C.s3}; stroke-width: 2.5; fill: none;`));
  plot.add(textAt(X(model.centroid[0]) + 4, Y(model.centroid[1]) + 16, 'centroid', '', 'start'));

  if (!model.inside) {
    plot.add(line(X(model.p[0]), Y(model.p[1]), X(model.near.point[0]), Y(model.near.point[1]),
      `stroke: ${C.s6}; stroke-width: 3; stroke-dasharray: 6 4;`));
    plot.add(marker('ring', X(model.near.point[0]), Y(model.near.point[1]), 4,
      `fill: none; stroke: ${C.s6}; stroke-width: 2;`));
  }

  plot.add(marker('diamond', X(model.p[0]), Y(model.p[1]), 6, `fill: ${C.s5};`));
  plot.add(textAt(X(model.p[0]), Y(model.p[1]) + 18, `P ${pt(model.p, 1)} · ${model.code}`));

  return plot.svg;
}

/* ==========================================================================
   5. Demo — three ways to sample a triangle at random   (6.2.8, 6.5.5)
   ========================================================================== */

const SAMPLE_TRI = [[4, 0], [3, 4], [0, 1]];
const SAMPLE_TRI_AREA = Math.abs(signedArea(SAMPLE_TRI[0], SAMPLE_TRI[1], SAMPLE_TRI[2]));
const SAMPLE_EXACT_X2 = 46.25; /* Lab 12 Problem 2: exact value of the integral of x squared */

const SAMPLERS = {
  alg1: {
    label: 'Algorithm 1 — normalise three uniform numbers',
    marker: 'circle',
    draw: (rng) => {
      const r1 = rng(), r2 = rng(), r3 = rng();
      const sum = r1 + r2 + r3 || 1;
      return [r1 / sum, r2 / sum, r3 / sum];
    }
  },
  alg2: {
    label: 'Algorithm 2 — fold the square onto the triangle',
    marker: 'square',
    draw: (rng) => {
      let r1 = rng(), r2 = rng();
      if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
      return [1 - r1 - r2, r1, r2];
    }
  },
  alg3slides: {
    label: 'Algorithm 3 as taught in the slides — square root of r₁',
    marker: 'triangle',
    draw: (rng) => {
      const r1 = rng(), r2 = rng();
      const root = Math.sqrt(r1);
      return [1 - root, root * r2, root * (1 - r2)];
    }
  },
  alg3lab: {
    label: 'Algorithm 3 as printed in Lab 12 — square root of r₂ as well',
    marker: 'diamond',
    draw: (rng) => {
      const r1 = rng(), r2 = rng();
      const root = Math.sqrt(r1);
      return [1 - root, root * Math.sqrt(r2), root * (1 - Math.sqrt(r2))];
    }
  }
};

function samplerModel(values) {
  const spec = SAMPLERS[values.algorithm] || SAMPLERS.alg2;
  const n = Math.max(20, Math.round(Number(values.n)));
  const rng = seededRandom(Number(values.seed));
  const [A, B, C] = SAMPLE_TRI;

  const points = [];
  const regions = [0, 0, 0, 0]; /* corner A, corner B, corner C, middle */
  let sumA = 0, sumB = 0, sumG = 0, sumX2 = 0;

  for (let i = 0; i < n; i += 1) {
    const [al, be, ga] = spec.draw(rng);
    const x = al * A[0] + be * B[0] + ga * C[0];
    const y = al * A[1] + be * B[1] + ga * C[1];
    points.push([x, y]);
    sumA += al; sumB += be; sumG += ga; sumX2 += x * x;
    if (al > 0.5) regions[0] += 1;
    else if (be > 0.5) regions[1] += 1;
    else if (ga > 0.5) regions[2] += 1;
    else regions[3] += 1;
  }

  const estimate = SAMPLE_TRI_AREA * (sumX2 / n);

  return {
    spec, n, points, regions, seed: Number(values.seed),
    meanAlpha: sumA / n, meanBeta: sumB / n, meanGamma: sumG / n,
    estimate,
    relError: (100 * (estimate - SAMPLE_EXACT_X2)) / SAMPLE_EXACT_X2
  };
}

function samplerFigure(model) {
  const [A, B, C] = SAMPLE_TRI;
  const plot = frame(newPlot(boundsOf([A, B, C], 0.6)), 'x', null);
  const { X, Y } = plot;

  const mid = (u, w) => [(u[0] + w[0]) / 2, (u[1] + w[1]) / 2];
  const mAB = mid(A, B), mBC = mid(B, C), mCA = mid(C, A);

  plot.add(polyline([A, B, C].map((v) => [X(v[0]), Y(v[1])]),
    `fill: none; stroke: ${C.s1}; stroke-width: 2.5;`, true));

  [[mAB, mBC], [mBC, mCA], [mCA, mAB]].forEach(([u, w]) => {
    plot.add(line(X(u[0]), Y(u[1]), X(w[0]), Y(w[1]),
      `stroke: ${C.s3}; stroke-width: 1.5; stroke-dasharray: 5 3;`));
  });

  const stride = Math.max(1, Math.ceil(model.points.length / 600));
  for (let i = 0; i < model.points.length; i += stride) {
    const p = model.points[i];
    plot.add(marker(model.spec.marker, X(p[0]), Y(p[1]), 1.8, `fill: ${C.s5};`));
  }

  [[A, 'A'], [B, 'B'], [C, 'C']].forEach(([v, name]) => {
    plot.add(textAt(X(v[0]), Y(v[1]) - 9, name));
  });
  plot.add(textAt(X((A[0] + B[0] + C[0]) / 3), Y((A[1] + B[1] + C[1]) / 3) + 5, 'middle'));

  return plot.svg;
}

/* ==========================================================================
   6. Demo — ear clipping   (6.3)
   ========================================================================== */

const POLYGONS = {
  exam: {
    label: 'Five vertices, one notch — Final Exam Question 1(e)',
    verts: [[0, 0], [5, 0], [5, 5], [2, 2], [0, 5]]
  },
  square: {
    label: 'Unit square 1→2→3→4 — the linked-list example on P2 frame 36',
    verts: [[0, 0], [1, 0], [1, 1], [0, 1]]
  },
  comb: {
    label: 'Twelve vertices, two notches — a “snake” with teeth',
    verts: [[0, 0], [6, 0], [6, 4], [5, 4], [5, 2], [4, 2],
            [4, 4], [3, 4], [3, 2], [2, 2], [2, 4], [0, 4]]
  }
};

function earClipTrace(rawVerts) {
  const verts = polygonSignedArea(rawVerts) >= 0 ? rawVerts.slice() : rawVerts.slice().reverse();
  const n = verts.length;

  const nodes = verts.map((p, i) => ({
    label: i + 1, x: p[0], y: p[1],
    prev: (i + n - 1) % n, next: (i + 1) % n,
    alive: true, ear: 0
  }));

  const isEar = (ci) => {
    const b = nodes[ci].prev;
    const d = nodes[ci].next;
    const B = verts[b], Cv = verts[ci], D = verts[d];
    if (signedArea(B, Cv, D) <= 1e-9) return { ear: false, why: 'reflex' };
    for (let k = 0; k < n; k += 1) {
      if (!nodes[k].alive || k === b || k === ci || k === d) continue;
      if (inTriangleClosed(B, Cv, D, verts[k])) {
        return { ear: false, why: `blocked by vertex ${nodes[k].label}` };
      }
    }
    return { ear: true, why: 'clear' };
  };

  const snapshot = () => nodes.map((v, idx) => ({
    label: v.label, x: v.x, y: v.y,
    prev: v.alive ? nodes[v.prev].label : 0,
    index: v.alive ? v.label : 0,
    next: v.alive ? nodes[v.next].label : 0,
    ear: v.alive && isEar(idx).ear ? 1 : 0,
    alive: v.alive
  }));

  const steps = [];
  const diagonals = [];
  const triangles = [];
  let remaining = n;
  let cur = 0;
  let guard = 0;

  steps.push({
    kind: 'setup',
    candidate: null,
    remaining,
    diagonals: [],
    triangles: [],
    table: snapshot(),
    text: `Set up. The polygon has ${n} vertices, listed counter-clockwise and stored as a ` +
          `linked list: every vertex records the vertex before it and the vertex after it. ` +
          `A polygon of ${n} vertices needs ${n - 3} diagonals and yields ${n - 2} triangles.`
  });

  while (remaining > 3 && guard < 12 * n) {
    guard += 1;
    if (!nodes[cur].alive) { cur = (cur + 1) % n; continue; }

    const b = nodes[cur].prev;
    const d = nodes[cur].next;
    const verdict = isEar(cur);

    if (verdict.ear) {
      diagonals.push([nodes[b].label, nodes[d].label]);
      triangles.push([nodes[b].label, nodes[cur].label, nodes[d].label]);
      nodes[cur].alive = false;
      nodes[b].next = d;
      nodes[d].prev = b;
      remaining -= 1;
      steps.push({
        kind: 'clip',
        candidate: [nodes[b].label, nodes[cur].label, nodes[d].label],
        removedLabel: nodes[cur].label,
        remaining,
        diagonals: diagonals.map((x) => x.slice()),
        triangles: triangles.map((x) => x.slice()),
        table: snapshot(),
        text: `Vertex ${nodes[cur].label} is an ear: triangle ` +
              `${nodes[b].label}-${nodes[cur].label}-${nodes[d].label} turns counter-clockwise and ` +
              `no other vertex falls inside it. Clip it — add diagonal ` +
              `${nodes[b].label}–${nodes[d].label}, and set ${nodes[b].label}.next to ` +
              `${nodes[d].label} and ${nodes[d].label}.prev to ${nodes[b].label}. ` +
              `${remaining} vertices remain.`
      });
      cur = d;
    } else {
      steps.push({
        kind: 'reject',
        candidate: [nodes[b].label, nodes[cur].label, nodes[d].label],
        remaining,
        diagonals: diagonals.map((x) => x.slice()),
        triangles: triangles.map((x) => x.slice()),
        table: snapshot(),
        text: `Vertex ${nodes[cur].label} is not an ear: ` +
              (verdict.why === 'reflex'
                ? `triangle ${nodes[b].label}-${nodes[cur].label}-${nodes[d].label} turns clockwise, ` +
                  `so vertex ${nodes[cur].label} is reflex and the diagonal would leave the polygon.`
                : `the triangle is convex but is ${verdict.why}, so the diagonal ` +
                  `${nodes[b].label}–${nodes[d].label} would cut across the interior.`) +
              ' Move on to the next vertex.'
      });
      cur = nodes[cur].next;
    }
  }

  const last = nodes.filter((v) => v.alive).map((v) => v.label);
  triangles.push(last.slice(0, 3));
  steps.push({
    kind: 'final',
    candidate: last.slice(0, 3),
    remaining: 3,
    diagonals: diagonals.map((x) => x.slice()),
    triangles: triangles.map((x) => x.slice()),
    table: snapshot(),
    text: `Three vertices are left — ${last.join(', ')} — and they are the last ear. ` +
          `The triangulation is complete: ${diagonals.length} diagonals and ` +
          `${triangles.length} triangles.`
  });

  return { verts, nodes, steps, diagonals, triangles, n };
}

function earModel(values) {
  const preset = POLYGONS[values.polygon] || POLYGONS.exam;
  const trace = earClipTrace(preset.verts);
  const byLabel = new Map(trace.verts.map((p, i) => [i + 1, p]));
  const totalArea = Math.abs(polygonSignedArea(trace.verts));
  return { preset, ...trace, byLabel, totalArea };
}

function earFigure(model, ctx) {
  const step = model.steps[ctx.step];
  const plot = frame(newPlot(boundsOf(model.verts, 0.8)), 'x', null);
  const { X, Y } = plot;

  plot.add(polyline(model.verts.map((v) => [X(v[0]), Y(v[1])]),
    `fill: none; stroke: ${C.s1}; stroke-width: 2.5;`, true));

  step.diagonals.forEach(([a, b]) => {
    const u = model.byLabel.get(a);
    const w = model.byLabel.get(b);
    plot.add(line(X(u[0]), Y(u[1]), X(w[0]), Y(w[1]),
      `stroke: ${C.s3}; stroke-width: 2; stroke-dasharray: 7 4;`));
  });

  if (step.candidate) {
    const tri = step.candidate.map((l) => model.byLabel.get(l));
    const dash = step.kind === 'reject' ? 'stroke-dasharray: 2 4;' : '';
    plot.add(polyline(tri.map((v) => [X(v[0]), Y(v[1])]),
      `fill: none; stroke: ${C.s5}; stroke-width: 4; ${dash}`, true));
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
    const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const word = step.kind === 'reject' ? 'not an ear'
               : step.kind === 'final' ? 'last ear' : 'ear';
    plot.add(textAt(X(cx), Y(cy), word));
  }

  step.table.forEach((row) => {
    plot.add(marker(row.alive ? 'circle' : 'ring', X(row.x), Y(row.y), 4.5,
      row.alive ? `fill: ${C.s1};` : `fill: ${C.surface}; stroke: ${C.caption}; stroke-width: 1.5;`));
    plot.add(textAt(X(row.x), Y(row.y) - 9, String(row.label)));
  });

  return plot.svg;
}

/* ==========================================================================
   7. Demo — gift wrapping the convex hull   (6.4)
   ========================================================================== */

const HULL_SETS = {
  five: {
    label: 'Five points A to E — the walkthrough on P3 frames 11 to 16',
    points: [[1, 3], [4, 6], [3, 1], [4, 3.5], [7, 4]],
    names: ['A', 'B', 'C', 'D', 'E']
  },
  random: { label: 'A seeded random cloud', points: null, names: null }
};

function hullPointSet(values, state) {
  /* The cloud is regenerated only when the reader asks for a different one —
     a different preset, a different count, a different seed. Otherwise the
     dragged positions are returned unchanged. Without that key the points
     would snap back to their generated positions on every recompute, which
     is to say: dragging would appear not to work. */
  const key = `${values.pointset}|${values.n}|${values.seed}`;
  if (state && state.key === key && state.points) {
    return { points: state.points, names: state.names };
  }

  let points;
  let names;
  if (values.pointset === 'five') {
    points = HULL_SETS.five.points.map((p) => p.slice());
    names = HULL_SETS.five.names.slice();
  } else {
    const n = Math.max(5, Math.round(Number(values.n)));
    const rng = seededRandom(Number(values.seed));
    points = [];
    names = [];
    for (let i = 0; i < n; i += 1) {
      points.push([Math.round(rng() * 900) / 100, Math.round(rng() * 600) / 100]);
      names.push(`P${i + 1}`);
    }
  }
  if (state) { state.key = key; state.points = points; state.names = names; }
  return { points, names };
}

function hullModel(values, state) {
  const { points, names } = hullPointSet(values, state);
  const n = points.length;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const box = { xMin: Math.min(...xs), xMax: Math.max(...xs), yMin: Math.min(...ys), yMax: Math.max(...ys) };
  box.area = (box.xMax - box.xMin) * (box.yMax - box.yMin);

  let start = 0;
  for (let i = 1; i < n; i += 1) {
    if (points[i][0] < points[start][0] ||
        (points[i][0] === points[start][0] && points[i][1] < points[start][1])) start = i;
  }

  const steps = [{
    kind: 'start',
    hull: [start],
    from: start,
    chosen: null,
    candidates: [],
    text: `Start. The leftmost point is ${names[start]} at ${pt(points[start], 2)}; ties go to the ` +
          `lower point. It has to be on the hull, because nothing lies to its left. The dashed ` +
          `rectangle is the axis-aligned bounding box, ${fmt(box.xMax - box.xMin, 2)} wide by ` +
          `${fmt(box.yMax - box.yMin, 2)} tall.`
  }];

  const hull = [start];
  let cur = start;
  let guard = 0;

  do {
    guard += 1;
    const candidates = [];
    let chosen = -1;
    for (let cand = 0; cand < n; cand += 1) {
      if (cand === cur) continue;
      let right = 0;
      for (let k = 0; k < n; k += 1) {
        if (k === cur || k === cand) continue;
        if (V.cross(V.sub(points[cand], points[cur]), V.sub(points[k], points[cur])) < -1e-9) right += 1;
      }
      candidates.push({ index: cand, right });
      if (right === 0 && chosen === -1) chosen = cand;
    }
    if (chosen === -1) chosen = candidates[0].index;

    const rejected = candidates.filter((c) => c.right > 0).length;
    const isClose = chosen === start;
    hull.push(chosen);

    steps.push({
      kind: isClose ? 'close' : 'edge',
      hull: hull.slice(),
      from: cur,
      chosen,
      candidates,
      text: (isClose
        ? `Close the hull. From ${names[cur]} the only edge with every point on its left runs back to ` +
          `the start, ${names[chosen]}.`
        : `Wrap from ${names[cur]}. Of the ${candidates.length} candidate edges, ${rejected} have at ` +
          `least one point on their right and are rejected. Edge ${names[cur]}–${names[chosen]} has ` +
          `none, so ${names[chosen]} is the next hull vertex.`)
    });

    cur = chosen;
  } while (cur !== start && guard <= n + 2);

  hull.pop(); /* the closing repeat of the start vertex */
  const hullPts = hull.map((i) => points[i]);
  const hullArea = Math.abs(polygonSignedArea(hullPts));
  let perimeter = 0;
  for (let i = 0; i < hullPts.length; i += 1) {
    perimeter += dist(hullPts[i], hullPts[(i + 1) % hullPts.length]);
  }

  return { points, names, n, box, start, steps, hull, hullArea, perimeter, state };
}

function hullFigure(model, ctx) {
  const step = model.steps[ctx.step];
  const plot = frame(newPlot(boundsOf(model.points, 0.8)), 'x', null);
  const { X, Y } = plot;
  const { box } = model;

  plot.add(svgEl('rect', {
    x: X(box.xMin), y: Y(box.yMax),
    width: X(box.xMax) - X(box.xMin), height: Y(box.yMin) - Y(box.yMax),
    style: `fill: none; stroke: ${C.s4}; stroke-width: 2; stroke-dasharray: 6 4;`
  }));

  if (step.kind !== 'start') {
    step.candidates.forEach((cand) => {
      if (cand.index === step.chosen) return;
      const w = model.points[cand.index];
      plot.add(line(X(model.points[step.from][0]), Y(model.points[step.from][1]), X(w[0]), Y(w[1]),
        `stroke: ${C.grid}; stroke-width: 1; stroke-dasharray: 2 3;`));
    });
  }

  for (let i = 0; i + 1 < step.hull.length; i += 1) {
    const u = model.points[step.hull[i]];
    const w = model.points[step.hull[i + 1]];
    plot.add(line(X(u[0]), Y(u[1]), X(w[0]), Y(w[1]),
      `stroke: ${C.s1}; stroke-width: 4; stroke-linecap: round;`));
  }

  model.points.forEach((p, i) => {
    const onHull = step.hull.includes(i);
    plot.add(marker(onHull ? 'square' : 'circle', X(p[0]), Y(p[1]), onHull ? 5 : 3.5,
      onHull ? `fill: ${C.s1};` : `fill: ${C.surface}; stroke: ${C.s3}; stroke-width: 2;`));
    if (model.n <= 14) plot.add(textAt(X(p[0]), Y(p[1]) - 9, model.names[i]));
  });

  return plot.svg;
}

/* ==========================================================================
   8. Demo — Delaunay by edge flips   (6.5.1 to 6.5.3)
   ========================================================================== */

const FIXED_NINE = [
  [0.5, 0.5], [4.0, 0.2], [7.5, 1.0], [8.5, 4.5], [5.5, 5.8],
  [2.0, 5.2], [0.2, 3.0], [3.2, 2.6], [5.6, 3.3]
];

function delaunayPoints(values) {
  if (values.pointset === 'fixed') return FIXED_NINE.map((p) => p.slice());
  const n = Math.max(6, Math.round(Number(values.n)));
  const rng = seededRandom(Number(values.seed));
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    pts.push([Math.round(rng() * 900) / 100, Math.round(rng() * 600) / 100]);
  }
  return pts;
}

function delaunayModel(values) {
  const pts = delaunayPoints(values);
  const run = delaunayByFlips(pts, { keepStates: true });
  const angles = run.states.map((tris) => triangulationMinAngle(pts, tris));
  return { pts, ...run, angles, hullSize: run.hull.length };
}

function delaunayFigure(model, ctx) {
  const tris = model.states[ctx.step];
  const flip = ctx.step > 0 ? model.flips[ctx.step - 1] : null;
  const plot = frame(newPlot(boundsOf(model.pts, 0.7)), 'x', null);
  const { X, Y } = plot;

  tris.forEach((t) => {
    plot.add(polyline(t.map((i) => [X(model.pts[i][0]), Y(model.pts[i][1])]),
      `fill: none; stroke: ${C.s1}; stroke-width: 1.5;`, true));
  });

  if (flip) {
    const [a, b] = flip.removed;
    const [c, d] = flip.added;
    plot.add(line(X(model.pts[a][0]), Y(model.pts[a][1]), X(model.pts[b][0]), Y(model.pts[b][1]),
      `stroke: ${C.s4}; stroke-width: 3; stroke-dasharray: 4 4;`));
    plot.add(line(X(model.pts[c][0]), Y(model.pts[c][1]), X(model.pts[d][0]), Y(model.pts[d][1]),
      `stroke: ${C.s3}; stroke-width: 4;`));
  }

  model.pts.forEach((p, i) => {
    const onHull = model.hull.includes(i);
    plot.add(marker(onHull ? 'square' : 'circle', X(p[0]), Y(p[1]), 4, `fill: ${C.s1};`));
    plot.add(textAt(X(p[0]), Y(p[1]) - 8, String(i + 1)));
  });

  return plot.svg;
}

/* ==========================================================================
   9. Demo — quadrature over a triangle   (6.5.5 to 6.5.9)
   ========================================================================== */

/* P3 frame 35. Transcribed to the digit from the deck. */
const P4 = {
  a: 0.816847572980459,
  b: 0.091576213509771,
  c: 0.108103018168070,
  d: 0.445948490915965,
  u: 0.109951743655322,
  v: 0.223381589678011
};

const RULES = {
  precision1: {
    label: 'Precision 1 — the 3-point vertex rule',
    points: [[1, 0, 1 / 3], [0, 1, 1 / 3], [0, 0, 1 / 3]],
    exactTo: 1
  },
  centroid: {
    label: 'Precision 1 — the 1-point centroid rule',
    points: [[1 / 3, 1 / 3, 1]],
    exactTo: 1
  },
  precision4: {
    label: 'Precision 4 — the 6-point rule',
    points: [
      [P4.a, P4.b, P4.u], [P4.b, P4.a, P4.u], [P4.b, P4.b, P4.u],
      [P4.c, P4.d, P4.v], [P4.d, P4.c, P4.v], [P4.d, P4.d, P4.v]
    ],
    exactTo: 4
  }
};

const QUAD_FUNCTIONS = {
  one: { label: 'f(x, y) = 1 — this integral is the area', f: () => 1, degree: 0 },
  x: { label: 'f(x, y) = x', f: (x) => x, degree: 1 },
  x2: { label: 'f(x, y) = x²', f: (x) => x * x, degree: 2 },
  x2y2: { label: 'f(x, y) = x² y²', f: (x, y) => x * x * y * y, degree: 4 },
  smooth: {
    label: 'f(x, y) = exp(x / 4) · sin(y / 2) — not a polynomial',
    f: (x, y) => Math.exp(x / 4) * Math.sin(y / 2),
    degree: Infinity
  }
};

const QUAD_TRIANGLES = {
  unit: { label: 'T01, the unit triangle A (1, 0), B (0, 1), C (0, 0)',
          verts: [[1, 0], [0, 1], [0, 0]] },
  tabc: { label: 'TABC = A (4, 0), B (3, 4), C (0, 1)', verts: [[4, 0], [3, 4], [0, 1]] },
  lab12: { label: 'Lab 12 triangle A (0, 1), B (3, 0), C (2, 5)', verts: [[0, 1], [3, 0], [2, 5]] }
};

/** The linear map of P3 frame 38: (X, Y) = A x + B y + C (1 − x − y). */
function mapToTriangle(A, B, Cv, x, y) {
  const w = 1 - x - y;
  return [A[0] * x + B[0] * y + Cv[0] * w, A[1] * x + B[1] * y + Cv[1] * w];
}

/** Reference value: the precision-4 rule on a uniformly refined mesh. */
function referenceIntegral(A, B, Cv, f, depth = 4) {
  const rule = RULES.precision4.points;
  let total = 0;
  const recurse = (a, b, c, level) => {
    if (level === 0) {
      const area = Math.abs(signedArea(a, b, c));
      let sum = 0;
      rule.forEach(([x, y, w]) => {
        const p = mapToTriangle(a, b, c, x, y);
        sum += w * f(p[0], p[1]);
      });
      total += area * sum;
      return;
    }
    const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
    const ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
    recurse(a, ab, ca, level - 1);
    recurse(ab, b, bc, level - 1);
    recurse(ca, bc, c, level - 1);
    recurse(ab, bc, ca, level - 1);
  };
  recurse(A, B, Cv, depth);
  return total;
}

function quadModel(values) {
  const rule = RULES[values.rule] || RULES.precision1;
  const fn = QUAD_FUNCTIONS[values.fn] || QUAD_FUNCTIONS.x2;
  const tri = QUAD_TRIANGLES[values.triangle] || QUAD_TRIANGLES.unit;
  const [A, B, Cv] = tri.verts;
  const area = Math.abs(signedArea(A, B, Cv));

  let running = 0;
  const rows = rule.points.map(([x, y, w], i) => {
    const mapped = mapToTriangle(A, B, Cv, x, y);
    const value = fn.f(mapped[0], mapped[1]);
    running += w * value;
    return { i: i + 1, x, y, w, X: mapped[0], Y: mapped[1], value, contribution: w * value, running };
  });

  const estimate = area * running;
  const reference = referenceIntegral(A, B, Cv, fn.f, 4);
  const absError = Math.abs(estimate - reference);
  const relError = Math.abs(reference) > 1e-12 ? (100 * absError) / Math.abs(reference) : 0;
  const shouldBeExact = fn.degree <= rule.exactTo;

  return { rule, fn, tri, A, B, C: Cv, area, rows, estimate, reference, absError, relError, shouldBeExact };
}

function quadFigure(model, ctx) {
  const plot = frame(newPlot(boundsOf([model.A, model.B, model.C], 0.5)), 'x', null);
  const { X, Y } = plot;

  plot.add(polyline([model.A, model.B, model.C].map((v) => [X(v[0]), Y(v[1])]),
    `fill: none; stroke: ${C.s1}; stroke-width: 2.5;`, true));

  [[model.A, 'A'], [model.B, 'B'], [model.C, 'C']].forEach(([v, name], i) => {
    plot.add(marker(['circle', 'square', 'triangle'][i], X(v[0]), Y(v[1]), 5, `fill: ${C.s1};`));
    plot.add(textAt(X(v[0]), Y(v[1]) - 10, `${name} ${pt(v, 0)}`));
  });

  model.rows.forEach((row, i) => {
    const current = i === ctx.step;
    plot.add(marker(current ? 'diamond' : 'circle', X(row.X), Y(row.Y), current ? 7 : 4,
      current ? `fill: ${C.s5}; stroke: ${C.surface}; stroke-width: 1.5;` : `fill: ${C.s3};`));
    plot.add(textAt(X(row.X) + 10, Y(row.Y) + 4, String(row.i), '', 'start'));
  });

  return plot.svg;
}

/* ==========================================================================
   10. Demo — a field from scattered sensors   (6.5.10 to 6.5.12)
   ========================================================================== */

const OMEGA = { xMin: 0, xMax: 10, yMin: 0, yMax: 6 };
const OMEGA_AREA = (OMEGA.xMax - OMEGA.xMin) * (OMEGA.yMax - OMEGA.yMin);

/* Lab 13's pollutant field, transcribed from the handout. */
function sensorField(x, y) {
  return 20 * Math.exp(-(((x - 5) ** 2) + ((y - 3) ** 2)) / 3)
       + 4 * Math.sin(1.5 * x)
       + 3 * Math.cos(2 * y);
}

let referenceOverOmega = null;
function omegaReference() {
  if (referenceOverOmega !== null) return referenceOverOmega;
  const nx = 300, ny = 180;
  const hx = (OMEGA.xMax - OMEGA.xMin) / nx;
  const hy = (OMEGA.yMax - OMEGA.yMin) / ny;
  let sum = 0;
  for (let i = 0; i < nx; i += 1) {
    const x = OMEGA.xMin + (i + 0.5) * hx;
    for (let j = 0; j < ny; j += 1) {
      sum += sensorField(x, OMEGA.yMin + (j + 0.5) * hy);
    }
  }
  referenceOverOmega = sum * hx * hy;
  return referenceOverOmega;
}

function fieldModel(values) {
  const n = Math.max(30, Math.round(Number(values.sensors)));
  const rng = seededRandom(Number(values.seed));
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    pts.push([
      OMEGA.xMin + rng() * (OMEGA.xMax - OMEGA.xMin),
      OMEGA.yMin + rng() * (OMEGA.yMax - OMEGA.yMin)
    ]);
  }

  const readings = pts.map((p) => sensorField(p[0], p[1]));
  const run = delaunayByFlips(pts, { keepStates: false });
  const tris = run.tris;

  const cells = tris.map((t, index) => {
    const [i, j, k] = t;
    const a = pts[i], b = pts[j], c = pts[k];
    const area = Math.abs(signedArea(a, b, c));
    const det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    const f0 = readings[i], f1 = readings[j], f2 = readings[k];
    const gx = Math.abs(det) < 1e-12 ? 0 : ((f1 - f0) * (c[1] - a[1]) - (f2 - f0) * (b[1] - a[1])) / det;
    const gy = Math.abs(det) < 1e-12 ? 0 : ((f2 - f0) * (b[0] - a[0]) - (f1 - f0) * (c[0] - a[0])) / det;
    const centroid = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
    return {
      index: index + 1, tri: t, area, centroid,
      gradient: Math.hypot(gx, gy),
      vertexMean: (f0 + f1 + f2) / 3,
      centroidValue: sensorField(centroid[0], centroid[1]),
      minAngle: minAngle(a, b, c)
    };
  });

  const hullPts = run.hull.map((i) => pts[i]);
  const hullArea = Math.abs(polygonSignedArea(hullPts));
  const meshArea = cells.reduce((acc, c) => acc + c.area, 0);
  const centroidRule = cells.reduce((acc, c) => acc + c.area * c.centroidValue, 0);
  const vertexRule = cells.reduce((acc, c) => acc + c.area * c.vertexMean, 0);
  const reference = omegaReference();
  const worstAngle = cells.reduce((acc, c) => Math.min(acc, c.minAngle), Infinity);
  const slivers = cells.filter((c) => c.minAngle < 30).length;

  const key = values.quantity === 'area' ? 'area'
            : values.quantity === 'field' ? 'vertexMean' : 'gradient';
  const ranked = cells.slice().sort((p, q) => q[key] - p[key]);

  return {
    pts, readings, cells, hull: run.hull, hullPts, hullArea, meshArea,
    centroidRule, vertexRule, reference, worstAngle, slivers, ranked, key, n,
    coverage: (100 * hullArea) / OMEGA_AREA,
    centroidError: (100 * (centroidRule - reference)) / reference,
    vertexError: (100 * (vertexRule - reference)) / reference,
    quantityLabel: values.quantity === 'area' ? 'triangle area'
                 : values.quantity === 'field' ? 'mean sensor reading'
                 : 'gradient magnitude'
  };
}

function fieldFigure(model) {
  const plot = frame(newPlot([OMEGA.xMin - 0.4, OMEGA.xMax + 0.4, OMEGA.yMin - 0.4, OMEGA.yMax + 0.4],
    { width: 380, height: 260 }), 'x', null);
  const { X, Y } = plot;

  plot.add(svgEl('rect', {
    x: X(OMEGA.xMin), y: Y(OMEGA.yMax),
    width: X(OMEGA.xMax) - X(OMEGA.xMin), height: Y(OMEGA.yMin) - Y(OMEGA.yMax),
    style: `fill: none; stroke: ${C.s4}; stroke-width: 2.5; stroke-dasharray: 7 4;`
  }));

  model.cells.forEach((cell) => {
    plot.add(polyline(cell.tri.map((i) => [X(model.pts[i][0]), Y(model.pts[i][1])]),
      `fill: none; stroke: ${C.grid}; stroke-width: 0.8;`, true));
  });

  plot.add(polyline(model.hullPts.map((p) => [X(p[0]), Y(p[1])]),
    `fill: none; stroke: ${C.s1}; stroke-width: 2.5;`, true));

  model.ranked.slice(0, 3).forEach((cell, rank) => {
    plot.add(polyline(cell.tri.map((i) => [X(model.pts[i][0]), Y(model.pts[i][1])]),
      `fill: none; stroke: ${C.s5}; stroke-width: 3;`, true));
    plot.add(textAt(X(cell.centroid[0]), Y(cell.centroid[1]) + 4, `#${rank + 1}`));
  });

  model.pts.forEach((p) => {
    plot.add(marker('circle', X(p[0]), Y(p[1]), 1.8, `fill: ${C.s3};`));
  });

  return plot.svg;
}

/* ==========================================================================
   11. Mount everything
   ========================================================================== */

function mountDemos() {

  /* ---- 6.1  s and t coordinates ---------------------------------------
     THE REFERENCE STAGE WIDGET. Every other converted demo follows this
     shape; read this one before writing another.

     The three questions the craft notes insist on answering before drawing
     anything:

       1. What is the one thing the reader should notice?
          That s and t are coordinates IN THE LINE'S FRAME. Move q parallel
          to the line and only s changes. Move it perpendicular and only t
          changes. Nothing about that is visible while q is driven by an x
          slider and a y slider, because those are the Cartesian frame — the
          exact frame the lesson is trying to replace.

       2. What can they change, and what stays fixed?
          All three points move. The line is not scenery: dragging p₂ makes
          s = 1 land somewhere else, which is the fastest way to see that s
          is a RELATIVE distance and not a length.

       3. What number proves it?
          |t| against ‖q − p(s)‖. Two routes to the same quantity, computed
          independently and printed to four decimals. They agree while the
          reader drags, or the maths is wrong.

     Why this is a stage rather than a figure: q has a position on screen.
     A slider says "this is a parameter"; a handle says "this is a thing".
     --------------------------------------------------------------------- */
  createDemo('#demo-line-parameter-mount', {
    id: 'demo-line-parameter',
    title: 'The s and t coordinates of a point',
    description:
      'The line runs through p₁ and p₂, the data from Final Exam Question 1. Drag q around the ' +
      'plane and watch s and t respond; drag p₁ or p₂ and watch the frame itself move under it.',
    headingLevel: 4,
    caption:
      'q, p₁ and p₂ are all draggable. The dashed offset r runs from p₁ to q; the heavy dashed ' +
      'segment is the perpendicular whose signed length is t.',

    /* Positions live in stage state, not in controls: a drag has to survive
       the recompute it triggers, and `values` is rebuilt every time. */
    stage: {
      grab: 'drag q, p₁ or p₂',
      aspect: 0.62,
      world: { x: [-5, 13], y: [-3.2, 8] },
      state: { q: [1, 1], p1: [2, 0], p2: [5, 4] },

      handles: [
        { label: 'q',  get: (m) => m.q,  set: (x, y, m) => { m.state.q = [x, y]; } },
        { label: 'p₁', get: (m) => m.p1, set: (x, y, m) => { m.state.p1 = [x, y]; },
          color: 'info' },
        { label: 'p₂', get: (m) => m.p2, set: (x, y, m) => { m.state.p2 = [x, y]; },
          color: 'info' }
      ],

      /* Back to front. Reordering this is the most common reason a figure
         looks muddy: grid, axes, reference geometry (dashed and dimmed),
         construction lines, the answer at full strength, then markers, then
         HUD text. Handles are drawn by the Stage on top of all of it. */
      draw(g, m, ctx) {
        const C = Gfx.C;
        const step = ctx.step;

        g.grid({ step: 1, color: C.lineSoft, majorColor: C.line });
        g.axes({ labels: ['x', 'y'] });

        /* The infinite line, dimmed — it is the setting, not the answer. */
        const far = 40;
        const u = V.mul(m.v, far / Math.max(m.len, 1e-9));
        g.line(V.sub(m.p1, u), V.add(m.p1, u),
               { color: Gfx.alpha(C.info, 0.45), width: 1, dash: [4, 4] });

        /* The segment p₁p₂ at full weight: s is measured against THIS. */
        g.line(m.p1, m.p2, { color: C.info, width: 2 });

        if (step >= 1) {
          g.arrow(m.p1, m.q, { color: Gfx.alpha(C.accent, 0.55), width: 1.4,
                               head: 8, dash: [3, 3] });
          g.text(V.mul(V.add(m.p1, m.q), 0.5), 'r', { dx: 6, dy: -6, box: true, color: C.accent });
        }

        if (step >= 3) {
          g.dot(m.foot, { r: 4.5, fill: C.ok });
          g.text(m.foot, g.w < 520 ? 'p(s)' : 'p(s), nearest point',
                 { dx: 8, dy: 14, box: true, color: C.ok });
        }

        if (step >= 4) {
          /* The right-angle tick. A perpendicular the reader has to take on
             trust is worth less than one that shows its own square. */
          const wUnit = V.mul(V.perp(m.v), 1 / Math.max(m.len, 1e-9));
          const vUnit = V.mul(m.v, 1 / Math.max(m.len, 1e-9));
          const k = 0.38 * (m.t >= 0 ? 1 : -1);
          const c0 = V.add(m.foot, V.mul(wUnit, k));
          const c1 = V.add(c0, V.mul(vUnit, 0.38));
          g.poly([V.add(m.foot, V.mul(vUnit, 0.38)), c1, c0],
                 { color: Gfx.alpha(C.ok, 0.8), width: 1 });
          g.line(m.foot, m.q, { color: C.accent, width: 2.4, dash: [6, 3] });
        }

        /* Degenerate states are the interesting part of the concept, and
           silence there reads as a broken widget. */
        if (m.len < 1e-6) {
          g.hud(10, 10, 'p₁ and p₂ coincide — the line has no direction and s is undefined',
                { color: C.warn });
          return;
        }
        if (m.onLine) g.hud(10, 10, 't = 0 — q is exactly on the line', { color: C.ok });
        else g.hud(10, 10, `s = ${fmt(m.s, 3)}   t = ${fmt(m.t, 3)}`, { color: C.s300 });

        /* Rung 5: the invariant, on screen, to four decimals. |t| and the
           straight-line distance are computed by different routes and must
           agree while the reader drags. */
        g.hud(10, -10, `|t| = ${fmt(Math.abs(m.t), 4)}    ‖q − p(s)‖ = ${fmt(m.d, 4)}`,
              { color: Math.abs(Math.abs(m.t) - m.d) < 1e-9 ? C.ok : C.warn });
      }
    },

    compute: lineModel,

    steps: {
      count: () => 6,
      label: (model, i) => LINE_STEP_TEXT[i](model)
    },

    figureAlt(model, ctx) {
      const head = `Step ${ctx.step + 1} of 6, with q at ${pt(model.q, 1)}, ` +
                   `p₁ at ${pt(model.p1, 1)} and p₂ at ${pt(model.p2, 1)}. `;
      if (model.len < 1e-6) return `${head}p₁ and p₂ coincide, so the line is undefined.`;
      switch (ctx.step) {
        case 0: return `${head}The segment from p₁ to p₂ is drawn heavy on the infinite line; ` +
                       `its direction vector is ${pt(model.v)}.`;
        case 1: return `${head}A dashed offset vector r = ${pt(model.r)} now joins p₁ to q.`;
        case 2: return `${head}The projection of r onto the line gives s = ${fmt(model.s, 3)}; ` +
                       'the figure is unchanged because s is a number, not yet a point.';
        case 3: return `${head}A round marker at ${pt(model.foot)} shows p(s), the point of the ` +
                       'line nearest q.';
        case 4: return `${head}A heavy dashed segment now joins p(s) to q at right angles to the line; ` +
                       `its signed length is t = ${fmt(model.t, 3)}.`;
        default: return `${head}The dashed perpendicular measures ${fmt(model.d, 3)}, which equals ` +
                        `the absolute value of t, ${fmt(Math.abs(model.t), 3)}.`;
      }
    },

    table(model, ctx) {
      return {
        caption: `Working for q = ${pt(model.q, 1)} against the line through p₁ ${pt(model.p1, 1)} and ` +
                 `p₂ ${pt(model.p2, 1)}, revealed to step ${ctx.step + 1} of 6`,
        rowHeader: true,
        columns: [
          { label: 'Quantity' },
          { label: 'Value' },
          { label: 'Formula' },
          { label: 'Note' }
        ],
        rows: model.stages.slice(0, ctx.step + 1).map((stage, i) => ({
          cells: [stage.name, stage.value, stage.how, stage.note],
          current: i === ctx.step
        }))
      };
    },

    summary(model) {
      if (model.len < 1e-6) {
        return ['p₁ and p₂ are on top of each other. The direction vector is zero, so there is no ' +
                'line to measure against and s is undefined. Drag them apart, or press Reset.'];
      }
      const where = model.s < 0 ? 'behind p₁'
                  : model.s > 1 ? 'beyond p₂'
                  : 'between p₁ and p₂';
      const side = Math.abs(model.t) < 1e-9 ? 'on the line'
                 : model.t > 0 ? 'to the left of the line as it runs from p₁ to p₂'
                               : 'to the right of the line as it runs from p₁ to p₂';
      return [
        `q = ${pt(model.q, 1)} has s = ${fmt(model.s, 4)} and t = ${fmt(model.t, 4)}.`,
        `Its nearest point on the line is p(s) = ${pt(model.foot)}, which sits ${where}.`,
        `q lies ${side}, at a distance of ${fmt(model.d, 4)}.`,
        's is a signed relative distance: s = 1 always lands on p₂, however far away p₂ is, ' +
        `which here is ${fmt(model.len, 3)} units.`
      ];
    }
  });

  /* ---- 6.2  triangle properties -------------------------------------- */
  createDemo('#demo-triangle-explorer-mount', {
    id: 'demo-triangle-explorer',
    title: 'Triangle properties and the region code of a point',
    description:
      'Every triangle quantity in this section from one set of coordinates: side lengths, angles, ' +
      'area, centroid, orientation, the three line_side signs that make up the region code, and ' +
      'the distance from a test point to the triangle.',
    headingLevel: 4,

    caption:
      'A, B, C and the test point P are all draggable. The dashed segment measures the distance ' +
      'from P to the triangle; it disappears when P is inside.',

    /* Four sliders became four handles. The region code is a statement about
       WHERE P is, so the reader has to be able to put it somewhere — sliding
       an x and then a y to get a point across a boundary is three seconds of
       arithmetic for something that should be one flick of the wrist. */
    controls: [
      { type: 'select', name: 'tri', label: 'Starting triangle', value: 'slides',
        options: Object.entries(TRIANGLES).map(([value, t]) => ({ value, label: t.label })),
        help: 'Loads a worked example. Dragging a vertex afterwards keeps your version.' },
      { type: 'checkbox', name: 'clockwise', label: 'List the vertices clockwise instead', value: false,
        help: 'Reversing the vertex order flips the sign of the area and inverts every region code. ' +
              'The region-code table only reads correctly for counter-clockwise vertices.' }
    ],

    stage: {
      grab: 'drag P or any vertex',
      aspect: 0.62,
      world: { x: [-4, 14], y: [-2.6, 8.6] },
      state: { preset: 'slides', verts: TRIANGLES.slides.verts.map((v) => v.slice()), p: [6, 7] },

      handles: [
        { label: 'P', get: (m) => m.p, set: (x, y, m) => { m.state.p = [x, y]; } },
        /* The handles index `state.verts`, NOT the model's A/B/C: the
           clockwise toggle swaps B and C in the model, and a handle that
           wrote back through that swap would move the wrong vertex the
           moment the toggle was on. */
        { label: 'v₁', color: 'info', get: (m) => m.state.verts[0],
          set: (x, y, m) => { m.state.verts[0] = [x, y]; } },
        { label: 'v₂', color: 'info', get: (m) => m.state.verts[1],
          set: (x, y, m) => { m.state.verts[1] = [x, y]; } },
        { label: 'v₃', color: 'info', get: (m) => m.state.verts[2],
          set: (x, y, m) => { m.state.verts[2] = [x, y]; } }
      ],

      draw(g, m) {
        const C = Gfx.C;
        g.grid({ step: 1, color: C.lineSoft, majorColor: C.line });
        g.axes({ labels: ['x', 'y'] });

        /* The triangle. Its fill carries a quantity — the region "inside" —
           so it earns one; at 0.13 alpha it tints without competing. Colour
           is never the only cue: the code and its meaning are in the HUD,
           the summary and the table. */
        const ok = m.inside && !m.degenerate;
        const body = m.degenerate ? C.warn : (ok ? C.ok : C.info);
        g.poly([m.A, m.B, m.C], { close: true, color: body, width: 1.8,
                                  fill: Gfx.alpha(body, 0.13) });

        /* Vertex names follow the CURRENT winding, which is the thing the
           clockwise toggle is about. */
        [[m.A, 'A'], [m.B, 'B'], [m.C, 'C']].forEach(([v, name]) => {
          g.text(v, name, { dx: 9, dy: -9, box: true, color: C.s300 });
        });

        if (!m.degenerate) {
          g.cross(m.centroid, { color: C.s400, r: 6, width: 1.2 });
          g.text(m.centroid, g.w < 520 ? 'G' : 'centroid',
                 { dx: 8, dy: 12, box: true, color: C.s400 });
        }

        /* The measured distance, only when there is one to measure. */
        if (!m.inside && m.near && m.near.point) {
          g.line(m.p, m.near.point, { color: C.accent, width: 2, dash: [5, 3] });
          g.dot(m.near.point, { r: 3.5, fill: C.accent });
        }

        if (m.degenerate) {
          g.hud(10, 10, 'the three vertices are collinear — zero area, no orientation',
                { color: C.warn });
        } else {
          g.hud(10, 10, `code ${m.code} — ${m.codeMeaning}`, { color: ok ? C.ok : C.s300 });
          g.hud(10, -10, `area ${fmt(m.area, 4)}   ${m.orientation}`
                + (m.inside ? '' : `   distance ${fmt(m.near.distance, 4)}`),
                { color: C.s400 });
        }
      }
    },

    compute: triangleModel,

    figureAlt(model) {
      if (model.degenerate) {
        return `The three vertices A ${pt(model.A, 1)}, B ${pt(model.B, 1)} and C ${pt(model.C, 1)} ` +
               'are collinear, so the triangle has collapsed to a line with zero area.';
      }
      return `Triangle A ${pt(model.A, 1)}, B ${pt(model.B, 1)}, C ${pt(model.C, 1)} with its ` +
             `centroid marked by a cross at ${pt(model.centroid)}. The test point P ${pt(model.p, 1)} ` +
             `has region code ${model.code} — ${model.codeMeaning} — and lies ` +
             (model.inside ? 'at distance zero from the triangle.'
                           : `${fmt(model.near.distance, 3)} from it, nearest ${model.near.feature}, ` +
                             'shown by the dashed segment.');
    },

    table(model) {
      const rows = [
        ['Side AB', fmt(model.g.ab, 4), 'Pythagoras on the coordinate differences'],
        ['Side BC', fmt(model.g.bc, 4), 'Pythagoras on the coordinate differences'],
        ['Side CA', fmt(model.g.ca, 4), 'Pythagoras on the coordinate differences'],
        ['Angle α at A', `${fmt(model.g.alpha, 3)}°`, 'Law of cosines'],
        ['Angle β at B', `${fmt(model.g.beta, 3)}°`, 'Law of cosines'],
        ['Angle γ at C', `${fmt(model.g.gamma, 3)}°`, `The three angles sum to ${fmt(model.g.alpha + model.g.beta + model.g.gamma, 1)}°`],
        ['Signed area', fmt(model.signed, 4), 'Half the cross product of AB and AC'],
        ['Area', fmt(model.area, 4), 'Absolute value of the signed area'],
        ['Orientation', model.orientation, 'Sign of the signed area'],
        ['Centroid', pt(model.centroid, 4), '(A + B + C) / 3'],
        ['line_side(A, B, P)', `${fmt(model.raw[0], 3)} → ${model.bits[0]}`, '1 when P is on or left of AB'],
        ['line_side(B, C, P)', `${fmt(model.raw[1], 3)} → ${model.bits[1]}`, '1 when P is on or left of BC'],
        ['line_side(C, A, P)', `${fmt(model.raw[2], 3)} → ${model.bits[2]}`, '1 when P is on or left of CA'],
        ['Region code', model.code, model.codeMeaning],
        ['Distance from P to the triangle', fmt(model.near.distance, 4), `Nearest feature: ${model.near.feature}`]
      ];
      return {
        caption: `Every quantity for triangle A ${pt(model.A, 0)}, B ${pt(model.B, 0)}, ` +
                 `C ${pt(model.C, 0)} and the test point P ${pt(model.p, 1)}`,
        rowHeader: true,
        columns: [{ label: 'Quantity' }, { label: 'Value' }, { label: 'How it is obtained' }],
        rows: rows.map((cells) => ({ cells, current: cells[0] === 'Region code' }))
      };
    },

    summary(model) {
      /* The reader can now drag a vertex onto the opposite side, so this is
         a state they will reach in the first ten seconds. Reporting an
         orientation for a line — or angles for a triangle that has none —
         would read as a bug in the arithmetic rather than a property of the
         shape they just made. */
      if (model.degenerate) {
        return [
          `A ${pt(model.A, 1)}, B ${pt(model.B, 1)} and C ${pt(model.C, 1)} are collinear, so this ` +
          'is not a triangle: the area is zero and there is no orientation to report.',
          'Every line_side test returns zero on a degenerate triangle, so the region code stops ' +
          'distinguishing inside from outside. Drag a vertex off the line, or press Reset.'
        ];
      }
      const lines = [
        `The triangle has area ${fmt(model.area, 4)}, centroid ${pt(model.centroid, 3)}, and its ` +
        `vertices as listed run ${model.orientation}.`,
        `Its angles are ${fmt(model.g.alpha, 2)}°, ${fmt(model.g.beta, 2)}° and ` +
        `${fmt(model.g.gamma, 2)}° at A, B and C.`,
        `P ${pt(model.p, 1)} has region code ${model.code}: ${model.codeMeaning}. ` +
        (model.inside ? 'The distance is zero.'
                      : `The distance to the triangle is ${fmt(model.near.distance, 4)}, measured to ` +
                        `${model.near.feature}.`)
      ];
      if (model.clockwise) {
        lines.push('Because the vertices are listed clockwise the signed area is negative and every ' +
                   'region code is inverted: 000 now means inside. This is why the convention is to ' +
                   'list vertices counter-clockwise.');
      }
      return lines;
    }
  });

  /* ---- 6.2.8  sampling a triangle ------------------------------------ */
  createDemo('#demo-triangle-sampler-mount', {
    id: 'demo-triangle-sampler',
    title: 'Three ways to sample a triangle at random',
    description:
      'All three algorithms produce barycentric weights α, β, γ that are non-negative and sum to 1, ' +
      'so every point lands inside the triangle (4, 0), (3, 4), (0, 1). Only some of them spread ' +
      'the points evenly. The table counts how many samples fall in each quarter of the triangle; ' +
      'a uniform sampler puts 25% in each.',
    headingLevel: 4,

    controls: [
      { type: 'select', name: 'algorithm', label: 'Sampling algorithm', value: 'alg2',
        options: Object.entries(SAMPLERS).map(([value, s]) => ({ value, label: s.label })) },
      { type: 'range', name: 'n', label: 'Number of sample points', min: 100, max: 4000, step: 100, value: 1000,
        valueText: (v) => `${v} points` },
      { type: 'seed', name: 'seed', label: 'Random seed', value: 42,
        help: 'The same seed always gives the same points, so two students can compare runs.' }
    ],

    compute: samplerModel,
    figure: samplerFigure,

    figureAlt(model) {
      const pct = model.regions.map((r) => Math.round((100 * r) / model.n));
      return `${model.n} sample points drawn by ${model.spec.label.toLowerCase()} inside the triangle ` +
             `(4, 0), (3, 4), (0, 1), which the dashed midlines cut into four equal quarters. ` +
             `The corner quarters at A, B and C hold ${pct[0]}%, ${pct[1]}% and ${pct[2]}% of the ` +
             `points and the middle quarter holds ${pct[3]}%; an even spread would put 25% in each.`;
    },

    table(model) {
      const share = (count) => `${fmt((100 * count) / model.n, 2)}%`;
      const rows = [
        ['Corner quarter at A (α > ½)', model.regions[0], share(model.regions[0]), '25%'],
        ['Corner quarter at B (β > ½)', model.regions[1], share(model.regions[1]), '25%'],
        ['Corner quarter at C (γ > ½)', model.regions[2], share(model.regions[2]), '25%'],
        ['Middle quarter (all weights ≤ ½)', model.regions[3], share(model.regions[3]), '25%'],
        ['Mean α', fmt(model.meanAlpha, 4), '—', '0.3333'],
        ['Mean β', fmt(model.meanBeta, 4), '—', '0.3333'],
        ['Mean γ', fmt(model.meanGamma, 4), '—', '0.3333'],
        ['Monte Carlo estimate of ∬ x² dA', fmt(model.estimate, 4), '—', String(SAMPLE_EXACT_X2)],
        ['Error against the exact integral', fmt(model.relError, 3), '%', '0%']
      ];
      return {
        caption: `${model.spec.label}: ${model.n} points on the triangle (4, 0), (3, 4), (0, 1) ` +
                 `with seed ${model.seed}, compared with what an even spread would give`,
        rowHeader: true,
        columns: [
          { label: 'Quantity' },
          { label: 'Count or value', numeric: true },
          { label: 'Share' },
          { label: 'Even spread would give' }
        ],
        rows: rows.map((cells) => ({ cells, current: false }))
      };
    },

    summary(model) {
      const pct = model.regions.map((r) => (100 * r) / model.n);
      const spread = Math.max(...pct) - Math.min(...pct);
      const verdict = spread < 4
        ? 'The four quarters hold nearly equal shares, so this sampler is spreading points evenly.'
        : pct[3] > 30
          ? 'The middle quarter is over-filled: this sampler pulls points toward the centroid.'
          : 'The quarters are unevenly filled, so this sampler is biased toward one part of the triangle.';
      return [
        `${model.spec.label}, ${model.n} points, area of the triangle ${SAMPLE_TRI_AREA}.`,
        `Quarter shares: ${pct.map((p) => `${fmt(p, 1)}%`).join(', ')} for the A, B, C and middle ` +
        `quarters. ${verdict}`,
        `The Monte Carlo estimate of the integral of x² over the triangle is ` +
        `${fmt(model.estimate, 4)} against the exact value ${SAMPLE_EXACT_X2}, an error of ` +
        `${fmt(model.relError, 2)}%. A biased sampler does not converge to the exact value however ` +
        'many points you draw.'
      ];
    }
  });

  /* ---- 6.3  ear clipping --------------------------------------------- */
  createDemo('#demo-ear-clipping-mount', {
    id: 'demo-ear-clipping',
    title: 'Ear clipping, step by step',
    description:
      'Walk the vertices, test each one for being an ear, and clip the first ear you find. The ' +
      'table is the linked list from the slides: prev, index, next, ear, x and y, with a clipped ' +
      'vertex zeroed out exactly as the slides show it.',
    headingLevel: 4,

    controls: [
      { type: 'select', name: 'polygon', label: 'Polygon', value: 'exam',
        options: Object.entries(POLYGONS).map(([value, p]) => ({ value, label: p.label })) }
    ],

    compute: earModel,

    steps: {
      count: (model) => model.steps.length,
      label: (model, i) => model.steps[i].text
    },

    figure: earFigure,

    figureAlt(model, ctx) {
      const step = model.steps[ctx.step];
      const head = `Step ${ctx.step + 1} of ${model.steps.length}. `;
      if (step.kind === 'setup') {
        return `${head}The polygon is drawn with all ${model.n} vertices filled and numbered, and no ` +
               'diagonals yet.';
      }
      const tri = step.candidate.join('-');
      const drawn = step.diagonals.length === 0 ? 'no diagonals are'
                  : step.diagonals.length === 1 ? '1 diagonal is'
                  : `${step.diagonals.length} diagonals are`;
      if (step.kind === 'reject') {
        return `${head}Triangle ${tri} is outlined with a dotted stroke and labelled “not an ear”; ` +
               `${drawn} drawn so far.`;
      }
      if (step.kind === 'final') {
        return `${head}The last three vertices, ${tri}, are outlined as the final ear. All ` +
               `${step.diagonals.length} diagonals are drawn and ${model.n - step.remaining} of the ` +
               `${model.n} vertices are shown hollow because they have been clipped.`;
      }
      return `${head}Triangle ${tri} is outlined solid and labelled “ear”; vertex ${step.removedLabel} ` +
             `is now hollow, and the new diagonal ${step.candidate[0]}–${step.candidate[2]} is dashed. ` +
             `${step.remaining} vertices remain in the polygon.`;
    },

    table(model, ctx) {
      const step = model.steps[ctx.step];
      const current = step.candidate ? step.candidate[1] : null;
      return {
        caption: `The polygon as a linked list at step ${ctx.step + 1} of ${model.steps.length}. ` +
                 `A clipped vertex has its prev, index and next set to 0, keeping its coordinates. ` +
                 `${step.remaining} vertices are still in the polygon.`,
        rowHeader: true,
        columns: [
          { label: 'Vertex' },
          { label: 'prev', numeric: true },
          { label: 'index', numeric: true },
          { label: 'next', numeric: true },
          { label: 'ear', numeric: true },
          { label: 'x', numeric: true },
          { label: 'y', numeric: true },
          { label: 'Status' }
        ],
        rows: step.table.map((row) => ({
          cells: [
            row.label, row.prev, row.index, row.next, row.ear,
            fmt(row.x, 1), fmt(row.y, 1),
            row.alive ? (row.ear ? 'in the polygon, is an ear' : 'in the polygon, not an ear') : 'clipped'
          ],
          current: row.label === current
        }))
      };
    },

    summary(model, ctx) {
      const step = model.steps[ctx.step];
      const area = step.triangles.reduce((acc, t) => {
        const [a, b, c] = t.map((l) => model.byLabel.get(l));
        return acc + Math.abs(signedArea(a, b, c));
      }, 0);
      return [
        `${step.remaining} of ${model.n} vertices are still in the polygon. ` +
        `${step.diagonals.length} of the ${model.n - 3} diagonals have been found and ` +
        `${step.triangles.length} of the ${model.n - 2} triangles are stored.`,
        step.diagonals.length
          ? `Diagonals so far: ${step.diagonals.map((d) => `${d[0]}–${d[1]}`).join(', ')}.`
          : 'No diagonal has been added yet.',
        `The triangles found so far cover an area of ${fmt(area, 3)}; the whole polygon has area ` +
        `${fmt(model.totalArea, 3)}. Once every ear is clipped the two agree, which is how the ` +
        'polygon area is computed from its triangulation.'
      ];
    }
  });

  /* ---- 6.4  gift wrapping -------------------------------------------- */
  createDemo('#demo-gift-wrapping-mount', {
    id: 'demo-gift-wrapping',
    title: 'Gift wrapping the convex hull',
    description:
      'Start at the leftmost point, then repeatedly take the edge that has every other point on ' +
      'its left. The table counts, for each candidate, how many points fall on the wrong side; ' +
      'the winner is the one with a count of zero.',
    headingLevel: 4,

    caption:
      'Every point is draggable. Pull one outward and it joins the hull; push a hull vertex inside ' +
      'its neighbours and it drops out.',

    controls: [
      { type: 'select', name: 'pointset', label: 'Point set', value: 'five',
        options: Object.entries(HULL_SETS).map(([value, s]) => ({ value, label: s.label })) },
      { type: 'range', name: 'n', label: 'Number of random points', min: 6, max: 20, step: 1, value: 12,
        valueText: (v) => `${v} points`,
        help: 'Only used when the point set is the seeded random cloud. Changing it draws a new cloud.' },
      { type: 'seed', name: 'seed', label: 'Random seed', value: 7 }
    ],

    stage: {
      grab: 'drag any point',
      aspect: 0.60,
      world: { x: [-0.8, 9.8], y: [-0.6, 6.6] },
      state: {},

      /* A FUNCTION, not an array: the point count is the reader's to choose,
         so the handle set is derived from the model on every recompute. */
      handles: (m) => m.points.map((_, i) => ({
        label: m.names[i],
        /* Hull membership is the answer this figure exists to show, so it is
           what the handle colour encodes. The name beside every point is the
           non-colour carrier, and the table lists membership per point. */
        color: m.hull.indexOf(i) === -1 ? 'info' : 'ok',
        get: (mm) => mm.points[i],
        set: (x, y, mm) => { mm.state.points[i] = [x, y]; }
      })),

      draw(g, m, ctx) {
        const C = Gfx.C;
        const step = m.steps[Math.min(ctx.step, m.steps.length - 1)];

        g.grid({ step: 1, color: C.lineSoft, majorColor: C.line });
        g.axes({ labels: ['x', 'y'] });

        /* The bounding box: reference geometry, so dashed and dimmed. */
        g.poly([[m.box.xMin, m.box.yMin], [m.box.xMax, m.box.yMin],
                [m.box.xMax, m.box.yMax], [m.box.xMin, m.box.yMax]],
               { close: true, color: Gfx.alpha(C.s400, 0.5), width: 1, dash: [4, 4] });

        /* Rejected candidate rays, then the chosen edge on top of them. The
           weight difference is what says "these were considered, that one
           won" without needing a second colour. */
        if (step.kind !== 'start' && step.candidates) {
          step.candidates.forEach((cand) => {
            if (cand.index === step.chosen) return;
            g.line(m.points[step.from], m.points[cand.index],
                   { color: Gfx.alpha(C.warn, 0.35), width: 1, dash: [2, 3] });
          });
        }

        /* The hull chain built so far, at full strength. */
        const chain = step.hull || [];
        for (let i = 0; i + 1 < chain.length; i += 1) {
          g.line(m.points[chain[i]], m.points[chain[i + 1]], { color: C.ok, width: 2.2 });
        }
        if (step.chosen !== null && step.chosen !== undefined) {
          g.line(m.points[step.from], m.points[step.chosen], { color: C.accent, width: 2.6 });
        }

        /* Points last, so nothing is drawn over them. The start vertex gets a
           square: shape, not colour, marks the one point that is special. */
        m.points.forEach((pnt, i) => {
          const onHull = m.hull.indexOf(i) !== -1;
          if (i === m.start) g.square(pnt, { r: 5, fill: C.ok, color: C.ok });
          else g.dot(pnt, { r: onHull ? 4.5 : 3.5, fill: onHull ? C.ok : C.info });
        });

        g.hud(10, 10, `hull: ${m.hull.length} of ${m.n} points`, { color: C.ok });
        g.hud(10, -10, `area ${fmt(m.hullArea, 3)}   perimeter ${fmt(m.perimeter, 3)}`,
              { color: C.s400 });
      }
    },

    compute: hullModel,

    steps: {
      count: (model) => model.steps.length,
      label: (model, i) => model.steps[i].text
    },

    figureAlt(model, ctx) {
      const step = model.steps[ctx.step];
      const head = `Step ${ctx.step + 1} of ${model.steps.length}. `;
      if (step.kind === 'start') {
        return `${head}${model.n} points inside a dashed axis-aligned bounding box; ` +
               `${model.names[model.start]} at the left edge is drawn as a filled square because it ` +
               'is the first hull vertex.';
      }
      const chain = step.hull.map((i) => model.names[i]).join(' to ');
      return `${head}Thin dashed rays fan out from ${model.names[step.from]} to every candidate; the ` +
             `edge to ${model.names[step.chosen]} is drawn heavy because no point lies on its right. ` +
             `The hull so far runs ${chain}.`;
    },

    table(model, ctx) {
      const step = model.steps[ctx.step];
      const rightBy = new Map(step.candidates.map((c) => [c.index, c.right]));
      return {
        caption: step.kind === 'start'
          ? `The ${model.n} points, with the leftmost one identified as the first hull vertex`
          : `Candidate edges from ${model.names[step.from]} at step ${ctx.step + 1} of ` +
            `${model.steps.length}. The chosen edge is the one with no points on its right.`,
        rowHeader: true,
        columns: [
          { label: 'Point' },
          { label: 'x', numeric: true },
          { label: 'y', numeric: true },
          { label: 'Points on the right of this edge', numeric: true },
          { label: 'Status' }
        ],
        rows: model.points.map((p, i) => {
          const right = rightBy.has(i) ? rightBy.get(i) : null;
          let status;
          if (step.kind === 'start') {
            status = i === model.start ? 'first hull vertex' : 'not tested yet';
          } else if (i === step.chosen) {
            status = 'chosen — next hull vertex';
          } else if (i === step.from) {
            status = 'the vertex we are wrapping from';
          } else if (right === null) {
            status = 'not a candidate';
          } else if (right > 0) {
            status = 'rejected';
          } else {
            status = 'passes, but not the first found';
          }
          return {
            cells: [model.names[i], fmt(p[0], 2), fmt(p[1], 2), right === null ? '—' : right, status],
            current: step.kind === 'start' ? i === model.start : i === step.chosen
          };
        })
      };
    },

    summary(model, ctx) {
      const step = model.steps[ctx.step];
      const chain = step.hull.map((i) => model.names[i]).join(', ');
      const lines = [
        `Hull vertices found so far, in counter-clockwise order: ${chain}.`
      ];
      if (ctx.step === model.steps.length - 1) {
        lines.push(
          `The finished hull has ${model.hull.length} vertices, a perimeter of ` +
          `${fmt(model.perimeter, 3)} and an area of ${fmt(model.hullArea, 3)}.`,
          `The axis-aligned bounding box has area ${fmt(model.box.area, 3)}, so the hull discards ` +
          `${fmt(100 * (1 - model.hullArea / model.box.area), 1)}% of the box as empty space. ` +
          `${model.n - model.hull.length} of the ${model.n} points are strictly inside and are never ` +
          'hull vertices.'
        );
      } else {
        lines.push(`${model.n} points in total; the bounding box has area ${fmt(model.box.area, 3)}.`);
      }
      return lines;
    }
  });

  /* ---- 6.5.1 to 6.5.3  Delaunay by flips ------------------------------ */
  createDemo('#demo-delaunay-flips-mount', {
    id: 'demo-delaunay-flips',
    title: 'From an arbitrary triangulation to the Delaunay one',
    description:
      'Step 1 is a perfectly valid triangulation built without any thought about shape. Each later ' +
      'step swaps the diagonal of two triangles whose circumcircle contains the opposite vertex. ' +
      'Watch the smallest angle in the whole mesh climb; it can never fall.',
    headingLevel: 4,

    controls: [
      { type: 'select', name: 'pointset', label: 'Point set', value: 'fixed',
        options: [
          { value: 'fixed', label: 'Nine fixed points — the worked example' },
          { value: 'random', label: 'A seeded random cloud' }
        ] },
      { type: 'range', name: 'n', label: 'Number of random points', min: 6, max: 18, step: 1, value: 12,
        valueText: (v) => `${v} points`,
        help: 'Only used when the point set is the seeded random cloud.' },
      { type: 'seed', name: 'seed', label: 'Random seed', value: 42 }
    ],

    compute: delaunayModel,

    steps: {
      count: (model) => model.states.length,
      label: (model, i) => {
        if (i === 0) {
          return `Start. The convex hull is fanned from one vertex and each interior point is pushed ` +
                 `into the triangle that holds it, giving ${model.states[0].length} triangles. The ` +
                 `smallest angle anywhere in this mesh is ${fmt(model.angles[0], 2)}°.`;
        }
        const flip = model.flips[i - 1];
        const before = model.angles[i - 1];
        const after = model.angles[i];
        const change = after > before + 1e-9
          ? `The smallest angle in the mesh rises from ${fmt(before, 2)}° to ${fmt(after, 2)}°.`
          : `The smallest angle in the mesh stays at ${fmt(after, 2)}°; this flip fixed a local ` +
            'sliver that was not the worst one.';
        return `Flip ${i}. Vertex ${flip.added[1] + 1} falls inside the circumcircle of the triangle ` +
               `on the other side of edge ${flip.removed[0] + 1}–${flip.removed[1] + 1}, so that edge ` +
               `is replaced by ${flip.added[0] + 1}–${flip.added[1] + 1}. ${change}`;
      }
    },

    figure: delaunayFigure,

    figureAlt(model, ctx) {
      const tris = model.states[ctx.step];
      if (ctx.step === 0) {
        return `The starting triangulation of ${model.pts.length} numbered points: ${tris.length} ` +
               `triangles, several of them long and thin, with a smallest angle of ` +
               `${fmt(model.angles[0], 2)}°.`;
      }
      const flip = model.flips[ctx.step - 1];
      return `After flip ${ctx.step} of ${model.flips.length}: the dashed line is the discarded edge ` +
             `${flip.removed[0] + 1}–${flip.removed[1] + 1} and the heavy line is its replacement ` +
             `${flip.added[0] + 1}–${flip.added[1] + 1}. The smallest angle in the mesh is now ` +
             `${fmt(model.angles[ctx.step], 2)}°.`;
    },

    table(model, ctx) {
      const tris = model.states[ctx.step];
      const flip = ctx.step > 0 ? model.flips[ctx.step - 1] : null;
      return {
        caption: `The ${tris.length} triangles after step ${ctx.step + 1} of ${model.states.length}. ` +
                 `The smallest angle over the whole mesh, θ(T), is ` +
                 `${fmt(model.angles[ctx.step], 3)} degrees.`,
        rowHeader: true,
        columns: [
          { label: 'Triangle' },
          { label: 'Vertices' },
          { label: 'Area', numeric: true },
          { label: 'Smallest angle', unit: 'degrees', numeric: true }
        ],
        rows: tris.map((t, i) => ({
          cells: [
            `T${i + 1}`,
            t.map((v) => v + 1).join(', '),
            fmt(Math.abs(signedArea(model.pts[t[0]], model.pts[t[1]], model.pts[t[2]])), 3),
            fmt(minAngle(model.pts[t[0]], model.pts[t[1]], model.pts[t[2]]), 2)
          ],
          current: Boolean(flip) && t.includes(flip.added[0]) && t.includes(flip.added[1])
        }))
      };
    },

    summary(model, ctx) {
      const done = ctx.step === model.states.length - 1;
      return [
        `${model.pts.length} points, ${model.hullSize} of them on the convex hull, giving ` +
        `${model.states[ctx.step].length} triangles. Euler's formula fixes that count at ` +
        `2n − 2 − h = ${2 * model.pts.length - 2 - model.hullSize}, whatever triangulation you use.`,
        `θ(T), the smallest angle anywhere in the mesh, started at ${fmt(model.angles[0], 3)}° and is ` +
        `now ${fmt(model.angles[ctx.step], 3)}°.`,
        done
          ? (model.flips.length === 0
              ? 'No edge failed the in-circle test, so the starting triangulation was already Delaunay.'
              : `After ${model.flips.length} flips no edge fails the in-circle test. This is the ` +
                'Delaunay triangulation: of every triangulation of these points, it has the largest ' +
                'smallest angle. Note that this does not promise there are no thin triangles — only ' +
                'that no rearrangement of these same points does better.')
          : `${model.flips.length - ctx.step} flips still to go.`
      ];
    }
  });

  /* ---- 6.5.5 to 6.5.9  quadrature ------------------------------------- */
  createDemo('#demo-triangle-quadrature-mount', {
    id: 'demo-triangle-quadrature',
    title: 'Quadrature over a triangle',
    description:
      'A quadrature rule is a short list of points and weights. Step through the points one at a ' +
      'time and watch the weighted sum build up, then compare the finished estimate against an ' +
      'accurate reference. A rule of precision p is exact for every polynomial of degree p or less.',
    headingLevel: 4,

    controls: [
      { type: 'select', name: 'rule', label: 'Quadrature rule', value: 'precision1',
        options: Object.entries(RULES).map(([value, r]) => ({ value, label: r.label })) },
      { type: 'select', name: 'fn', label: 'Function to integrate', value: 'x2',
        options: Object.entries(QUAD_FUNCTIONS).map(([value, f]) => ({ value, label: f.label })) },
      { type: 'select', name: 'triangle', label: 'Triangle', value: 'unit',
        options: Object.entries(QUAD_TRIANGLES).map(([value, t]) => ({ value, label: t.label })),
        help: 'The rule is always defined on the unit triangle T01 and carried to the chosen ' +
              'triangle by the linear map (X, Y) = Ax + By + C(1 − x − y).' }
    ],

    compute: quadModel,

    steps: {
      count: (model) => model.rows.length,
      label: (model, i) => {
        const row = model.rows[i];
        return `Point ${row.i} of ${model.rows.length}. On T01 it sits at ` +
               `(${fmt(row.x, 6)}, ${fmt(row.y, 6)}) and the linear map carries it to ` +
               `(${fmt(row.X, 4)}, ${fmt(row.Y, 4)}), where f is ${fmt(row.value, 6)}. ` +
               `Weight ${fmt(row.w, 6)} contributes ${fmt(row.contribution, 6)}, bringing the ` +
               `weighted sum to ${fmt(row.running, 6)}.`;
      }
    },

    figure: quadFigure,

    figureAlt(model, ctx) {
      const row = model.rows[ctx.step];
      return `The triangle A ${pt(model.A, 0)}, B ${pt(model.B, 0)}, C ${pt(model.C, 0)} with the ` +
             `${model.rows.length} quadrature points marked and numbered. Point ${row.i}, the ` +
             `current one, is drawn as a large diamond at ${pt([row.X, row.Y], 3)}.`;
    },

    table(model, ctx) {
      return {
        caption: `${model.rule.label} applied to ${model.fn.label} over the triangle of area ` +
                 `${fmt(model.area, 4)}. Estimate = area × Σ wᵢ f(Xᵢ, Yᵢ) = ${fmt(model.estimate, 6)}.`,
        rowHeader: true,
        columns: [
          { label: 'Point' },
          { label: 'x on T01', numeric: true },
          { label: 'y on T01', numeric: true },
          { label: 'X', numeric: true },
          { label: 'Y', numeric: true },
          { label: 'f(X, Y)', numeric: true },
          { label: 'Weight w', numeric: true },
          { label: 'w × f', numeric: true },
          { label: 'Running sum', numeric: true }
        ],
        rows: model.rows.map((row, i) => ({
          cells: [
            row.i, fmt(row.x, 6), fmt(row.y, 6), fmt(row.X, 4), fmt(row.Y, 4),
            fmt(row.value, 6), fmt(row.w, 6), fmt(row.contribution, 6), fmt(row.running, 6)
          ],
          current: i === ctx.step
        }))
      };
    },

    summary(model) {
      const verdict = model.shouldBeExact
        ? `This rule has precision ${model.rule.exactTo} and the function is a polynomial of degree ` +
          `${model.fn.degree}, so the estimate should be exact up to rounding — and it is, to ` +
          `${fmt(model.relError, 6)}%.`
        : model.fn.degree === Infinity
          ? `The function is not a polynomial, so no finite rule is exact for it; the error here is ` +
            `${fmt(model.relError, 4)}%.`
          : `The function has degree ${model.fn.degree}, above this rule's precision of ` +
            `${model.rule.exactTo}, so the rule is not exact: the error is ${fmt(model.relError, 4)}%.`;
      return [
        `Estimate ${fmt(model.estimate, 6)} against a reference of ${fmt(model.reference, 6)}, an ` +
        `absolute error of ${fmt(model.absError, 6)}.`,
        verdict,
        'The reference is the same precision-4 rule applied to 256 congruent sub-triangles, which ' +
        'is accurate enough to expose the error of any of the rules offered here.'
      ];
    }
  });

  /* ---- 6.5.10 to 6.5.12  a field from scattered sensors --------------- */
  createDemo('#demo-scattered-field-mount', {
    id: 'demo-scattered-field',
    title: 'A field, its gradient and its integral from scattered sensors',
    description:
      'Lab 13 in one place: drop sensors at random in the region Ω = [0, 10] × [0, 6], triangulate ' +
      'them, fit a linear function to each triangle, and integrate. The number that matters is at ' +
      'the bottom of the table — the mesh only covers the convex hull of the sensors, and the ' +
      'integral is short by exactly the part of Ω it misses.',
    headingLevel: 4,

    controls: [
      { type: 'range', name: 'sensors', label: 'Number of sensors', min: 40, max: 160, step: 20, value: 120,
        valueText: (v) => `${v} sensors` },
      { type: 'seed', name: 'seed', label: 'Random seed', value: 42 },
      { type: 'select', name: 'quantity', label: 'Quantity to highlight in the figure', value: 'gradient',
        options: [
          { value: 'gradient', label: 'Gradient magnitude — where the field changes fastest' },
          { value: 'field', label: 'Mean sensor reading' },
          { value: 'area', label: 'Triangle area' }
        ],
        help: 'The three triangles with the largest value are outlined heavily and numbered 1 to 3.' }
    ],

    compute: fieldModel,
    figure: fieldFigure,

    figureAlt(model) {
      return `${model.n} sensors triangulated into ${model.cells.length} triangles. The heavy ` +
             `outline is the convex hull of the sensors; the dashed rectangle is the region Ω, and ` +
             `the gap between them is the ${fmt(100 - model.coverage, 1)}% of Ω that carries no mesh. ` +
             `The three triangles with the largest ${model.quantityLabel} are outlined and numbered.`;
    },

    table(model) {
      const top = model.ranked[0];
      const rows = [
        ['Sensors placed', model.n, 'seeded, uniform in Ω'],
        ['Triangles in the mesh', model.cells.length, `2n − 2 − h with h = ${model.hull.length} hull vertices`],
        ['Convex-hull vertices', model.hull.length, 'gift wrapping'],
        ['Convex-hull area', fmt(model.hullArea, 3), 'shoelace formula'],
        ['Area of the region Ω', fmt(OMEGA_AREA, 3), '[0, 10] × [0, 6]'],
        ['Share of Ω covered by the mesh', `${fmt(model.coverage, 2)}%`, 'hull area ÷ Ω area'],
        ['Smallest angle anywhere in the mesh', `${fmt(model.worstAngle, 3)}°`, 'Delaunay maximises this'],
        ['Triangles with a smallest angle below 30°', `${fmt((100 * model.slivers) / model.cells.length, 1)}%`,
         'Delaunay does not remove slivers, it only does the best any triangulation of these points can'],
        [`Largest ${model.quantityLabel}`, fmt(top[model.key], 4), `triangle ${top.tri.map((i) => i + 1).join(', ')}`],
        ['Centroid-rule estimate of ∬ f dA', fmt(model.centroidRule, 3), 'Σ area × f(centroid), Lab 13 Problem 3(a)'],
        ['Vertex-average estimate of ∬ f dA', fmt(model.vertexRule, 3), 'Σ area × mean of the three sensor readings'],
        ['Reference value of ∬ f dA over Ω', fmt(model.reference, 3), 'midpoint rule on a 300 × 180 grid'],
        ['Centroid rule against the reference', `${fmt(model.centroidError, 2)}%`, 'negative means an under-estimate'],
        ['Vertex average against the reference', `${fmt(model.vertexError, 2)}%`, 'negative means an under-estimate']
      ];
      return {
        caption: `The sensor mesh and its integrals, ${model.n} sensors over Ω = [0, 10] × [0, 6]`,
        rowHeader: true,
        columns: [{ label: 'Quantity' }, { label: 'Value' }, { label: 'Where it comes from' }],
        rows: rows.map((cells) => ({
          cells,
          current: String(cells[0]).startsWith('Share of Ω') || String(cells[0]).startsWith('Centroid rule')
        }))
      };
    },

    summary(model) {
      return [
        `${model.n} sensors give ${model.cells.length} triangles covering ${fmt(model.coverage, 2)}% ` +
        `of Ω. The mesh stops at the convex hull, so ${fmt(100 - model.coverage, 2)}% of the region ` +
        'has no triangle over it at all.',
        `The centroid rule returns ${fmt(model.centroidRule, 3)} and the vertex average returns ` +
        `${fmt(model.vertexRule, 3)}, against a reference of ${fmt(model.reference, 3)} over the ` +
        `whole of Ω — errors of ${fmt(model.centroidError, 2)}% and ${fmt(model.vertexError, 2)}%. ` +
        'The two rules differ from each other by a few per cent, which is the quadrature error.',
        'The gap to the reference is a different animal. Both rules integrate over the mesh, and ' +
        'the mesh is not Ω: no refinement of the rule can recover a part of the region that carries ' +
        'no triangle. Adding four sensors at the corners of Ω would. This is the trap in Lab 13 — ' +
        'the shipped answer key reads a large error as "good approximation quality" and blames the ' +
        'quadrature rule rather than the domain.',
        `The smallest angle anywhere in the mesh is ${fmt(model.worstAngle, 3)}° and ` +
        `${fmt((100 * model.slivers) / model.cells.length, 1)}% of the triangles have a smallest ` +
        'angle below 30 degrees. Delaunay maximises the minimum angle across triangulations of these ' +
        'points; it does not promise well-shaped triangles.'
      ];
    }
  });
}

/* Mounting is guarded so the pure geometry above can be exercised from Node
   without a DOM. In a browser the guard is always true. */
if (typeof document !== 'undefined') mountDemos();

})(window);
