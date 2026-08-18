/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m1-algorithm-design.js — every interactive demo on m1-algorithm-design.html
   ==========================================================================

   ISC 4221C (2026). Vanilla ES module, no dependencies, no network access.

   All fourteen demos on this page compute their own traces in the browser.
   The pipeline shipped no precomputed traces under assets/data/m1/, so every
   model here is derived deterministically from the control values: the sorts
   and searches are exact, the two random demos (protein generation, amino-acid
   counting) draw from `seededRandom` with a visible, editable seed, and
   nothing reads the clock. Re-entering the same control values always
   reproduces the same numbers, which is the whole point of the seed control.

   Worked examples, arrays and coefficients are the ones taught in the module:
     [17, 31, 6, 4]                 selection sort, lecture P1
     [49, 61, 19, 12]               bubble sort, lecture P1
     [1, 4, 7, 9, 17, 31, 33], 17   binary search, lecture P2
     41c with 1/5/10/25             greedy change, lecture P2
     W_A = 50n + 21, W_B = n^2 + 10n + 5   cost comparison, lecture P2
     seven Florida stores, R = 6371 km     Lab 03
     64 codons, 3 stop codons              Lab 04

   Colour comes only from the tokens in assets/css/fsu-tokens.css, and no
   series is ever distinguished by colour alone: every chart also carries a
   direct text label, a marker glyph, or a dash pattern.
   ========================================================================== */

const { createDemo, svgEl, seededRandom, formatNumber } = window.Demo;
/* ==========================================================================
   0. Formatting and small numeric helpers
   ========================================================================== */

const SERIES = [
  'var(--fsu-series-1)',
  'var(--fsu-series-2)',
  'var(--fsu-series-3)',
  'var(--fsu-series-4)',
  'var(--fsu-series-5)',
  'var(--fsu-series-6)'
];

/* Dash patterns, so a line is identifiable in greyscale and in Windows High
   Contrast Mode. Index 0 is solid. */
const DASHES = ['', '9 5', '3 4', '13 4 3 4', '1 6', '16 4'];

/* Marker glyphs, so a series is identifiable without colour or dash. */
const GLYPHS = ['●', '■', '▲', '◆', '✚', '✖'];

const INK = 'var(--fsu-color-strong)';
const BODY = 'var(--fsu-color-body)';
const RULE = 'var(--fsu-border-strong)';

/** Thousands separators without depending on the user's locale. */
function fmtInt(value) {
  if (!Number.isFinite(value)) return String(value);
  const negative = value < 0;
  const digits = String(Math.round(Math.abs(value)));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return (negative ? '-' : '') + out;
}

/** Big numbers become scientific notation rather than 3000-digit integers. */
function fmtBig(value) {
  if (!Number.isFinite(value)) return 'too large to write';
  if (Math.abs(value) >= 1e15) {
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);
    return `${formatNumber(mantissa, 1)} × 10^${exponent}`;
  }
  if (Number.isInteger(value)) return fmtInt(value);
  return formatNumber(value, 1);
}

function fmtArray(values) {
  return `[${values.join(', ')}]`;
}

function plural(count, one, many) {
  return count === 1 ? one : many;
}

/* ==========================================================================
   1. Chart helpers
   --------------------------------------------------------------------------
   Font sizes here are user-space lengths inside the viewBox — geometry in the
   drawing's own coordinate system, not CSS type. The SVG itself is sized in
   CSS by dashboard.css (.demo__figure svg { inline-size: 100% }), so the whole
   drawing scales with the page and with browser zoom.
   ========================================================================== */

const W = 660;
const H = 320;

function chart(width = W, height = H) {
  return svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet'
  });
}

function txt(x, y, text, options = {}) {
  return svgEl('text', {
    x,
    y,
    'font-size': options.size || 13,
    'font-weight': options.weight || null,
    'text-anchor': options.anchor || null,
    style: `fill: ${options.fill || BODY}`,
    text
  });
}

function line(x1, y1, x2, y2, options = {}) {
  return svgEl('line', {
    x1, y1, x2, y2,
    style: `stroke: ${options.stroke || RULE}; stroke-width: ${options.width || 1}` +
           (options.dash ? `; stroke-dasharray: ${options.dash}` : '')
  });
}

function box(x, y, width, height, options = {}) {
  return svgEl('rect', {
    x, y, width: Math.max(0, width), height: Math.max(0, height),
    rx: options.rx || 0,
    style: `fill: ${options.fill || 'none'}; stroke: ${options.stroke || 'none'}; ` +
           `stroke-width: ${options.width || 1}`
  });
}

/**
 * A vertical bar chart with a value printed on every bar and a category label
 * under every bar. `marks` maps a bar index to { glyph, note }; a marked bar
 * gets a heavy outline AND the glyph AND the note in text, so the mark never
 * depends on colour.
 */
function barChart(spec) {
  const {
    values, labels, marks = {}, maxValue, yLabel = '', xLabel = '',
    decimals = 0, seriesIndex = 0
  } = spec;

  const svg = chart();
  const padL = 58;
  const padR = 18;
  const padT = 34;
  const padB = 64;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseline = padT + plotH;
  const n = Math.max(1, values.length);
  const max = maxValue !== undefined
    ? maxValue
    : Math.max(1, ...values.map((v) => (Number.isFinite(v) ? v : 0)));
  const slot = plotW / n;
  const barW = Math.max(3, Math.min(56, slot * 0.68));
  const showLabels = n <= 34;      // category label under each bar
  const showValues = n <= 22;      // the value printed on top of each bar
  const labelSize = n > 20 ? 10 : 12;

  svg.appendChild(line(padL, padT - 10, padL, baseline, { stroke: RULE, width: 2 }));
  svg.appendChild(line(padL, baseline, padL + plotW, baseline, { stroke: RULE, width: 2 }));

  if (yLabel) svg.appendChild(txt(4, padT - 18, yLabel, { size: 13, weight: 700, fill: INK }));
  if (xLabel) svg.appendChild(txt(padL, H - 8, xLabel, { size: 13, fill: BODY }));

  svg.appendChild(txt(padL - 8, baseline + 4, '0', { size: 12, anchor: 'end' }));
  svg.appendChild(txt(padL - 8, padT + 4, fmtBig(max), { size: 12, anchor: 'end' }));

  values.forEach((value, i) => {
    const safe = Number.isFinite(value) ? value : 0;
    const height = max > 0 ? (Math.max(0, safe) / max) * plotH : 0;
    const x = padL + i * slot + (slot - barW) / 2;
    const y = baseline - height;
    const mark = marks[i];

    svg.appendChild(box(x, y, barW, height, {
      fill: mark ? SERIES[1] : SERIES[seriesIndex],
      stroke: mark ? INK : RULE,
      width: mark ? 3 : 1
    }));

    if (showValues) {
      svg.appendChild(txt(x + barW / 2, y - 6,
        decimals > 0 ? formatNumber(safe, decimals) : fmtInt(safe),
        { size: labelSize, anchor: 'middle', fill: INK }));
    }
    if (showLabels) {
      svg.appendChild(txt(x + barW / 2, baseline + 17, String(labels[i]),
        { size: labelSize, anchor: 'middle' }));
    }
    if (mark && showLabels) {
      svg.appendChild(txt(x + barW / 2, y - (showValues ? 21 : 8), mark.glyph || '▼',
        { size: 14, anchor: 'middle', fill: INK }));
      if (mark.note) {
        svg.appendChild(txt(x + barW / 2, baseline + 34, mark.note,
          { size: labelSize - 1, anchor: 'middle', fill: INK, weight: 700 }));
      }
    }
  });

  return svg;
}

/**
 * Side-by-side bars: one group per category, one bar per series. Each bar
 * carries its series glyph above it and each series is named in a legend.
 */
function groupedBarChart(spec) {
  const { categories, series, yLabel = '', decimals = 0 } = spec;
  const svg = chart(W, 360);
  const padL = 58;
  const padR = 18;
  const padT = 34;
  const padB = 96;
  const plotW = W - padL - padR;
  const plotH = 360 - padT - padB;
  const baseline = padT + plotH;

  const all = series.flatMap((s) => s.values.filter(Number.isFinite));
  const max = Math.max(1, ...all);
  const slot = plotW / Math.max(1, categories.length);
  const barW = Math.max(3, (slot * 0.74) / series.length);

  svg.appendChild(line(padL, padT - 10, padL, baseline, { stroke: RULE, width: 2 }));
  svg.appendChild(line(padL, baseline, padL + plotW, baseline, { stroke: RULE, width: 2 }));
  if (yLabel) svg.appendChild(txt(4, padT - 18, yLabel, { size: 13, weight: 700, fill: INK }));
  svg.appendChild(txt(padL - 8, baseline + 4, '0', { size: 12, anchor: 'end' }));
  svg.appendChild(txt(padL - 8, padT + 4, fmtBig(max), { size: 12, anchor: 'end' }));

  categories.forEach((category, c) => {
    const groupX = padL + c * slot + (slot - barW * series.length) / 2;

    series.forEach((s, k) => {
      const value = s.values[c];
      if (!Number.isFinite(value)) {
        svg.appendChild(txt(groupX + k * barW + barW / 2, baseline - 6, '—',
          { size: 13, anchor: 'middle', fill: INK }));
        return;
      }
      const height = (value / max) * plotH;
      const x = groupX + k * barW;
      svg.appendChild(box(x, baseline - height, barW - 2, height, {
        fill: SERIES[k % SERIES.length], stroke: RULE, width: 1
      }));
      svg.appendChild(txt(x + barW / 2, baseline - height - 6, GLYPHS[k % GLYPHS.length],
        { size: 11, anchor: 'middle', fill: INK }));
      svg.appendChild(txt(x + barW / 2, baseline - height - 19,
        decimals > 0 ? formatNumber(value, decimals) : fmtInt(value),
        { size: 11, anchor: 'middle', fill: INK }));
    });

    String(category).split('\n').forEach((piece, li) => {
      svg.appendChild(txt(padL + c * slot + slot / 2, baseline + 18 + li * 14, piece,
        { size: 12, anchor: 'middle' }));
    });
  });

  series.forEach((s, k) => {
    const y = 360 - 34 + k * 15;
    svg.appendChild(txt(padL, y, `${GLYPHS[k % GLYPHS.length]} ${s.label}`,
      { size: 12, fill: INK }));
  });

  return svg;
}

/**
 * A line chart. Each series gets its own dash pattern, a glyph at its final
 * point, and a direct text label beside that point — three non-colour cues.
 */
function lineChart(spec) {
  const {
    series, xMin, xMax, yMin = 0, yMax, xLabel = '', yLabel = '',
    logY = false, marker = null, decimals = 0
  } = spec;

  const svg = chart(W, 340);
  const padL = 66;
  const padR = 96;
  const padT = 30;
  const padB = 60;
  const plotW = W - padL - padR;
  const plotH = 340 - padT - padB;
  const baseline = padT + plotH;

  const allY = series.flatMap((s) => s.points.map((p) => p[1])).filter(Number.isFinite);
  const top = yMax !== undefined ? yMax : Math.max(1, ...allY);
  const bottom = logY ? Math.max(0.5, Math.min(...allY.filter((v) => v > 0), 1)) : yMin;

  const sx = (x) => padL + ((x - xMin) / Math.max(1e-9, xMax - xMin)) * plotW;
  const sy = (y) => {
    if (!Number.isFinite(y)) return padT;
    if (logY) {
      const lo = Math.log10(bottom);
      const hi = Math.log10(Math.max(top, bottom * 10));
      const v = Math.log10(Math.max(y, bottom));
      return baseline - ((v - lo) / Math.max(1e-9, hi - lo)) * plotH;
    }
    return baseline - ((Math.max(y, bottom) - bottom) / Math.max(1e-9, top - bottom)) * plotH;
  };

  svg.appendChild(line(padL, padT - 8, padL, baseline, { stroke: RULE, width: 2 }));
  svg.appendChild(line(padL, baseline, padL + plotW, baseline, { stroke: RULE, width: 2 }));

  if (yLabel) svg.appendChild(txt(4, padT - 14, yLabel, { size: 13, weight: 700, fill: INK }));
  if (xLabel) svg.appendChild(txt(padL, 340 - 8, xLabel, { size: 13, fill: BODY }));

  [xMin, Math.round((xMin + xMax) / 2), xMax].forEach((tick) => {
    svg.appendChild(txt(sx(tick), baseline + 18, fmtInt(tick), { size: 12, anchor: 'middle' }));
  });
  svg.appendChild(txt(padL - 8, baseline + 4, logY ? fmtBig(bottom) : fmtBig(bottom),
    { size: 12, anchor: 'end' }));
  svg.appendChild(txt(padL - 8, padT + 4, fmtBig(top), { size: 12, anchor: 'end' }));
  if (logY) {
    svg.appendChild(txt(padL - 8, (padT + baseline) / 2 + 4,
      fmtBig(Math.pow(10, (Math.log10(bottom) + Math.log10(top)) / 2)),
      { size: 12, anchor: 'end' }));
  }

  series.forEach((s, k) => {
    const points = s.points
      .filter((p) => Number.isFinite(p[1]))
      .map((p) => `${formatNumber(sx(p[0]), 1)},${formatNumber(sy(p[1]), 1)}`)
      .join(' ');
    if (!points) return;

    svg.appendChild(svgEl('polyline', {
      points,
      style: `fill: none; stroke: ${SERIES[k % SERIES.length]}; stroke-width: 3` +
             (DASHES[k % DASHES.length] ? `; stroke-dasharray: ${DASHES[k % DASHES.length]}` : '')
    }));

    const last = s.points.filter((p) => Number.isFinite(p[1])).slice(-1)[0];
    if (last) {
      svg.appendChild(txt(sx(last[0]) + 6, sy(last[1]) + 4,
        `${GLYPHS[k % GLYPHS.length]} ${s.label}`, { size: 12, fill: INK }));
    }
  });

  if (marker) {
    svg.appendChild(line(sx(marker.x), padT - 8, sx(marker.x), baseline,
      { stroke: INK, width: 2, dash: '6 5' }));
    svg.appendChild(txt(sx(marker.x), padT - 12, marker.label,
      { size: 12, anchor: 'middle', weight: 700, fill: INK }));
  }

  return svg;
}

/* ==========================================================================
   2. Algorithms, all deterministic
   ========================================================================== */

function selectionSortSteps(input) {
  const a = input.slice();
  const n = a.length;
  const steps = [{
    array: a.slice(),
    fixed: 0,
    comparisons: 0,
    total: 0,
    swap: null,
    minLoc: null,
    description: `Start. The array is ${fmtArray(a)} and no position is final yet.`
  }];

  let total = 0;
  for (let i = 0; i < n - 1; i += 1) {
    let minLoc = i;
    let comparisons = 0;
    for (let j = i + 1; j < n; j += 1) {
      comparisons += 1;
      if (a[j] < a[minLoc]) minLoc = j;
    }
    total += comparisons;
    const smallest = a[minLoc];
    const displaced = a[i];
    const swapped = minLoc !== i;
    if (swapped) {
      const hold = a[i];
      a[i] = a[minLoc];
      a[minLoc] = hold;
    }
    steps.push({
      array: a.slice(),
      fixed: i + 1,
      comparisons,
      total,
      swap: swapped ? [i, minLoc] : null,
      minLoc,
      description: swapped
        ? `Pass ${i + 1}: ${comparisons} ${plural(comparisons, 'comparison', 'comparisons')} ` +
          `find ${smallest} as the smallest value from position ${i + 1} onwards, so it swaps ` +
          `with ${displaced}. Position ${i + 1} is now final.`
        : `Pass ${i + 1}: ${comparisons} ${plural(comparisons, 'comparison', 'comparisons')} ` +
          `confirm ${displaced} is already the smallest value from position ${i + 1} onwards, ` +
          `so no swap is needed. Position ${i + 1} is now final.`
    });
  }

  const last = steps[steps.length - 1];
  if (steps.length > 1) {
    last.fixed = n;
    last.description += ` The last position follows by elimination, so the array is sorted: ${fmtArray(a)}.`;
  }
  return { steps, sorted: a, comparisons: total };
}

function bubbleSortSteps(input, shorten) {
  const a = input.slice();
  const n = a.length;
  const steps = [{
    array: a.slice(),
    sweep: 0,
    comparisons: 0,
    swaps: 0,
    total: 0,
    totalSwaps: 0,
    settled: 0,
    stopped: false,
    description: `Start. The array is ${fmtArray(a)} and no sweep has run yet.`
  }];

  let total = 0;
  let totalSwaps = 0;
  for (let pass = 0; pass < n - 1; pass += 1) {
    const bound = shorten ? n - 1 - pass : n - 1;
    let comparisons = 0;
    let swaps = 0;
    for (let j = 0; j < bound; j += 1) {
      comparisons += 1;
      if (a[j] > a[j + 1]) {
        const hold = a[j];
        a[j] = a[j + 1];
        a[j + 1] = hold;
        swaps += 1;
      }
    }
    total += comparisons;
    totalSwaps += swaps;
    const stopped = swaps === 0;
    steps.push({
      array: a.slice(),
      sweep: pass + 1,
      comparisons,
      swaps,
      total,
      totalSwaps,
      settled: shorten ? pass + 1 : 0,
      stopped,
      description: stopped
        ? `Sweep ${pass + 1}: ${comparisons} ${plural(comparisons, 'comparison', 'comparisons')} ` +
          `and no swaps at all, so the rule stops here. The array is sorted: ${fmtArray(a)}.`
        : `Sweep ${pass + 1}: ${comparisons} ${plural(comparisons, 'comparison', 'comparisons')} ` +
          `and ${swaps} ${plural(swaps, 'swap', 'swaps')}. The array is now ${fmtArray(a)}; ` +
          `the largest unsettled value has reached position ${shorten ? n - pass : n}.`
    });
    if (stopped) break;
  }

  return { steps, sorted: a, comparisons: total, swaps: totalSwaps };
}

function sequentialSearchSteps(list, key) {
  const steps = [];
  for (let i = 0; i < list.length; i += 1) {
    const hit = list[i] === key;
    steps.push({
      index: i,
      value: list[i],
      hit,
      comparisons: i + 1,
      description: hit
        ? `Comparison ${i + 1}: position ${i + 1} holds ${list[i]}, which equals the key ${key}. ` +
          `Stop — the answer is position ${i + 1}, found in ${i + 1} ` +
          `${plural(i + 1, 'comparison', 'comparisons')}.`
        : `Comparison ${i + 1}: position ${i + 1} holds ${list[i]}, which is not the key ${key}. ` +
          `Move to position ${i + 2}.`
    });
    if (hit) return { steps, foundAt: i, comparisons: i + 1 };
  }
  if (steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    lastStep.description = `Comparison ${list.length}: position ${list.length} holds ` +
      `${list[list.length - 1]}, which is not the key ${key}. The list is exhausted, so the ` +
      `key is absent — ${list.length} comparisons for nothing.`;
  }
  return { steps, foundAt: -1, comparisons: list.length };
}

function binarySearchSteps(list, key) {
  const steps = [];
  let low = 0;
  let high = list.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = list[mid];
    const window = high - low + 1;
    let outcome;
    let description;
    if (value === key) {
      outcome = 'Found';
      description = `Comparison ${steps.length + 1}: the middle of the remaining ${window} ` +
        `${plural(window, 'entry', 'entries')} is position ${mid + 1}, holding ${value}, ` +
        `which equals the key ${key}. Found in ${steps.length + 1} ` +
        `${plural(steps.length + 1, 'comparison', 'comparisons')}.`;
    } else if (value < key) {
      outcome = 'Key is larger — search right';
      description = `Comparison ${steps.length + 1}: the middle of the remaining ${window} ` +
        `${plural(window, 'entry', 'entries')} is position ${mid + 1}, holding ${value}. ` +
        `The key ${key} is larger, so the whole left half is discarded — ` +
        `${mid - low + 1} ${plural(mid - low + 1, 'entry', 'entries')} eliminated in one step.`;
    } else {
      outcome = 'Key is smaller — search left';
      description = `Comparison ${steps.length + 1}: the middle of the remaining ${window} ` +
        `${plural(window, 'entry', 'entries')} is position ${mid + 1}, holding ${value}. ` +
        `The key ${key} is smaller, so the whole right half is discarded — ` +
        `${high - mid + 1} ${plural(high - mid + 1, 'entry', 'entries')} eliminated in one step.`;
    }

    steps.push({ low, mid, high, value, outcome, description, window });
    if (value === key) return { steps, foundAt: mid, comparisons: steps.length };
    if (value < key) low = mid + 1; else high = mid - 1;
  }

  if (steps.length > 0) {
    steps[steps.length - 1].description +=
      ' Nothing is left to search, so the key is absent.';
  }
  return { steps, foundAt: -1, comparisons: steps.length };
}

/** Average comparisons for a successful binary search over all n keys. */
function binaryAverage(n) {
  if (n < 1) return 0;
  let total = 0;
  const walk = (lo, hi, depth) => {
    if (lo > hi) return;
    const mid = Math.floor((lo + hi) / 2);
    total += depth;
    walk(lo, mid - 1, depth + 1);
    walk(mid + 1, hi, depth + 1);
  };
  walk(0, n - 1, 1);
  return total / n;
}

function squaringSteps(exponent) {
  const bits = Math.max(1, Math.floor(exponent)).toString(2);
  const steps = [{
    exponent: 1,
    multiplications: 0,
    kind: 'start',
    description: `Start with π to the power 1 — that is just π, and it costs no multiplications.`
  }];
  let reached = 1;
  let count = 0;

  for (let i = 1; i < bits.length; i += 1) {
    const before = reached;
    reached *= 2;
    count += 1;
    steps.push({
      exponent: reached,
      multiplications: count,
      kind: 'square',
      description: `Square: π^${reached} = π^${before} × π^${before}. That is one multiplication ` +
        `and it doubles the exponent from ${before} to ${reached}. ${count} in total so far.`
    });
    if (bits[i] === '1') {
      const beforeMul = reached;
      reached += 1;
      count += 1;
      steps.push({
        exponent: reached,
        multiplications: count,
        kind: 'multiply',
        description: `Multiply by π: π^${reached} = π^${beforeMul} × π. The exponent is odd here, ` +
          `so one extra multiplication is needed. ${count} in total so far.`
      });
    }
  }

  return { steps, multiplications: count, bruteForce: Math.max(0, Math.floor(exponent) - 1) };
}

function greedyChange(amount, coins) {
  const sorted = coins.slice().sort((a, b) => b - a);
  const counts = new Map(sorted.map((c) => [c, 0]));
  let remaining = amount;
  const trace = [];
  sorted.forEach((coin) => {
    const take = Math.floor(remaining / coin);
    if (take > 0) {
      counts.set(coin, take);
      trace.push({ coin, take, before: remaining, after: remaining - take * coin });
      remaining -= take * coin;
    }
  });
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return { counts, total, remaining, trace, solved: remaining === 0 };
}

function optimalChange(amount, coins) {
  const best = new Array(amount + 1).fill(Infinity);
  const used = new Array(amount + 1).fill(-1);
  best[0] = 0;
  for (let value = 1; value <= amount; value += 1) {
    coins.forEach((coin) => {
      if (coin <= value && best[value - coin] + 1 < best[value]) {
        best[value] = best[value - coin] + 1;
        used[value] = coin;
      }
    });
  }
  const counts = new Map(coins.slice().sort((a, b) => b - a).map((c) => [c, 0]));
  if (!Number.isFinite(best[amount])) return { counts, total: 0, solved: false };
  let value = amount;
  while (value > 0) {
    const coin = used[value];
    counts.set(coin, (counts.get(coin) || 0) + 1);
    value -= coin;
  }
  return { counts, total: best[amount], solved: true };
}

/* --- Lab 03: the seven stores and the Haversine distance ------------------ */

const STORES = [
  { id: 'store#1', city: 'Tallahassee', lat: 30.4550, lon: 84.2533 },
  { id: 'store#2', city: 'Gainesville', lat: 29.6520, lon: 82.3250 },
  { id: 'store#3', city: 'Miami', lat: 25.7753, lon: 80.2089 },
  { id: 'store#4', city: 'Jacksonville', lat: 30.3369, lon: 81.6614 },
  { id: 'store#5', city: 'Tampa', lat: 27.9681, lon: 82.4764 },
  { id: 'store#6', city: 'Orlando', lat: 28.4158, lon: 81.2989 },
  { id: 'store#7', city: 'Hialeah', lat: 25.8606, lon: 80.2939 }
];

const EARTH_RADIUS_KM = 6371.0;

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const p1 = lat1 * toRad;
  const p2 = lat2 * toRad;
  const dp = (lat2 - lat1) * toRad;
  const dl = (lon2 - lon1) * toRad;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* --- Lab 04: the codon table --------------------------------------------- */

const CODON_TABLE = [
  { name: 'Isoleucine', slc: 'I', codons: ['ATT', 'ATC', 'ATA'] },
  { name: 'Leucine', slc: 'L', codons: ['CTT', 'CTC', 'CTA', 'CTG', 'TTA', 'TTG'] },
  { name: 'Valine', slc: 'V', codons: ['GTT', 'GTC', 'GTA', 'GTG'] },
  { name: 'Phenylalanine', slc: 'F', codons: ['TTT', 'TTC'] },
  { name: 'Methionine', slc: 'M', codons: ['ATG'] },
  { name: 'Cysteine', slc: 'C', codons: ['TGT', 'TGC'] },
  { name: 'Alanine', slc: 'A', codons: ['GCT', 'GCC', 'GCA', 'GCG'] },
  { name: 'Glycine', slc: 'G', codons: ['GGT', 'GGC', 'GGA', 'GGG'] },
  { name: 'Proline', slc: 'P', codons: ['CCT', 'CCC', 'CCA', 'CCG'] },
  { name: 'Threonine', slc: 'T', codons: ['ACT', 'ACC', 'ACA', 'ACG'] },
  { name: 'Serine', slc: 'S', codons: ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'] },
  { name: 'Tyrosine', slc: 'Y', codons: ['TAT', 'TAC'] },
  { name: 'Tryptophan', slc: 'W', codons: ['TGG'] },
  { name: 'Glutamine', slc: 'Q', codons: ['CAA', 'CAG'] },
  { name: 'Asparagine', slc: 'N', codons: ['AAT', 'AAC'] },
  { name: 'Histidine', slc: 'H', codons: ['CAT', 'CAC'] },
  { name: 'Glutamic acid', slc: 'E', codons: ['GAA', 'GAG'] },
  { name: 'Aspartic acid', slc: 'D', codons: ['GAT', 'GAC'] },
  { name: 'Lysine', slc: 'K', codons: ['AAA', 'AAG'] },
  { name: 'Arginine', slc: 'R', codons: ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'] },
  { name: 'Stop codons', slc: '—', codons: ['TAA', 'TAG', 'TGA'] }
];

const STOP_CODONS = ['TAA', 'TAG', 'TGA'];
const BASES = ['A', 'G', 'C', 'T'];   // 1 = A, 2 = G, 3 = C, 4 = T, as Lab 04 specifies

/**
 * Lab 04's generator, with rejection sampling: draw three integers in 1..4,
 * read off the codon, discard it if it is a stop codon, otherwise keep it.
 */
function generateProtein(aminoAcids, seed) {
  const random = seededRandom(seed);
  const codons = [];
  let draws = 0;
  let rejected = 0;
  let guard = 0;

  while (codons.length < aminoAcids && guard < aminoAcids * 200 + 500) {
    guard += 1;
    const codon =
      BASES[Math.floor(random() * 4)] +
      BASES[Math.floor(random() * 4)] +
      BASES[Math.floor(random() * 4)];
    draws += 1;
    if (STOP_CODONS.includes(codon)) { rejected += 1; continue; }
    codons.push(codon);
  }

  return { codons, protein: codons.join(''), draws, rejected };
}

function countAminoAcid(codons, name) {
  const entry = CODON_TABLE.find((row) => row.name === name);
  if (!entry) return { total: 0, perCodon: new Map() };
  const perCodon = new Map(entry.codons.map((c) => [c, 0]));
  codons.forEach((codon) => {
    if (perCodon.has(codon)) perCodon.set(codon, perCodon.get(codon) + 1);
  });
  const total = Array.from(perCodon.values()).reduce((a, b) => a + b, 0);
  return { total, perCodon, codons: entry.codons };
}

/* ==========================================================================
   3. 1.1.2 — Selection sort step-through
   ========================================================================== */

const SORT_PRESETS = {
  lecture: [17, 31, 6, 4],
  midterm: [7, 3, 9, 4, 2, 10],
  bubble: [49, 61, 19, 12],
  sorted: [2, 4, 6, 8, 10, 12],
  reversed: [12, 10, 8, 6, 4, 2]
};

function arrayFromControls(values) {
  if (values.preset !== 'random') return SORT_PRESETS[values.preset].slice();
  const random = seededRandom(values.seed);
  const size = Math.max(3, Math.min(14, Math.round(values.size)));
  return Array.from({ length: size }, () => 1 + Math.floor(random() * 99));
}

createDemo('#demo-selection-sort-mount', {
  id: 'demo-selection-sort',
  title: 'Selection sort step-through',
  description:
    'One step per pass of the outer loop. Watch the sorted prefix grow from the left, and ' +
    'watch the comparison count grow by one less every pass.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'preset', label: 'Array to sort', value: 'lecture',
      options: [
        { value: 'lecture', label: 'Lecture example — 17, 31, 6, 4' },
        { value: 'midterm', label: 'Midterm example — 7, 3, 9, 4, 2, 10' },
        { value: 'sorted', label: 'Already sorted — 2, 4, 6, 8, 10, 12' },
        { value: 'reversed', label: 'Reverse sorted — 12, 10, 8, 6, 4, 2' },
        { value: 'random', label: 'Random array (uses the size and seed below)' }
      ],
      help: 'The first two are the arrays worked in the lecture and on the midterm.'
    },
    {
      type: 'range', name: 'size', label: 'Random array size', min: 3, max: 14, step: 1, value: 8,
      unit: 'items', valueText: (v) => `${v} items`,
      help: 'Only used when the array above is set to “Random array”.'
    },
    {
      type: 'seed', name: 'seed', label: 'Random seed', value: 4221,
      help: 'The same seed always builds the same random array, so you can quote a run in office hours.'
    }
  ],

  compute(values) {
    const input = arrayFromControls(values);
    const run = selectionSortSteps(input);
    return { input, ...run };
  },

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => model.steps[i].description
  },

  figure(model, ctx) {
    const step = model.steps[ctx.step];
    const marks = {};
    if (step.swap) {
      marks[step.swap[0]] = { glyph: '▼', note: 'swapped' };
      marks[step.swap[1]] = { glyph: '▼', note: 'swapped' };
    }
    return barChart({
      values: step.array,
      labels: step.array.map((_, i) => (i < step.fixed ? `${i + 1}✓` : `${i + 1}`)),
      marks,
      yLabel: 'Value',
      xLabel: 'Position — a tick means the position is final'
    });
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    if (ctx.step === 0) {
      return `Bar chart of the starting array ${fmtArray(step.array)}. No position is final yet ` +
             `and no comparison has been made.`;
    }
    return `Bar chart after pass ${step.sweep || ctx.step}: the array is now ` +
           `${fmtArray(step.array)}, the first ${step.fixed} of ${model.input.length} positions ` +
           `are final, and ${step.total} comparisons have been made in total.`;
  },

  table(model, ctx) {
    const step = model.steps[ctx.step];
    return {
      caption: `Selection sort on ${fmtArray(model.input)} — array state after step ` +
               `${ctx.step + 1} of ${ctx.stepCount}`,
      rowHeader: true,
      columns: [
        { label: 'Position' },
        { label: 'Value', numeric: true },
        { label: 'Status' }
      ],
      rows: step.array.map((value, i) => ({
        cells: [i + 1, value, i < step.fixed ? 'Final' : 'Still to be sorted'],
        current: Boolean(step.swap && (i === step.swap[0] || i === step.swap[1]))
      }))
    };
  },

  summary(model, ctx) {
    const step = model.steps[ctx.step];
    const n = model.input.length;
    const exact = (n * n) / 2 - n / 2;
    return [
      `${step.fixed} of ${n} positions are final. ${step.total} of ${exact} comparisons made.`,
      ctx.step === ctx.stepCount - 1
        ? `Finished: ${fmtArray(model.sorted)}. Selection sort always makes exactly ` +
          `n²/2 − n/2 = ${exact} comparisons on ${n} items, whatever the array contained.`
        : `The next pass will make ${n - step.fixed - 1} ` +
          `${plural(n - step.fixed - 1, 'comparison', 'comparisons')} — one fewer than this one.`
    ];
  }
});

/* ==========================================================================
   4. 1.1.3 — Bubble sort step-through
   ========================================================================== */

createDemo('#demo-bubble-sort-mount', {
  id: 'demo-bubble-sort',
  title: 'Bubble sort step-through',
  description:
    'One step per sweep. Compare the two sweep styles: the lecture sweeps the whole array ' +
    'every time, the usual optimisation stops one place earlier each sweep.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'preset', label: 'Array to sort', value: 'bubble',
      options: [
        { value: 'bubble', label: 'Lecture example — 49, 61, 19, 12' },
        { value: 'midterm', label: 'Midterm example — 7, 3, 9, 4, 2, 10' },
        { value: 'sorted', label: 'Already sorted — 2, 4, 6, 8, 10, 12 (best case)' },
        { value: 'reversed', label: 'Reverse sorted — 12, 10, 8, 6, 4, 2 (worst case)' },
        { value: 'random', label: 'Random array (uses the size and seed below)' }
      ]
    },
    {
      type: 'radio', name: 'style', label: 'Sweep style', value: 'full',
      options: [
        { value: 'full', label: 'Full sweep — compare every neighbouring pair, as in the lecture' },
        { value: 'short', label: 'Shortened sweep — skip the settled tail' }
      ],
      help: 'Both stop as soon as a sweep makes no swaps. Only the number of comparisons differs.'
    },
    {
      type: 'range', name: 'size', label: 'Random array size', min: 3, max: 14, step: 1, value: 8,
      unit: 'items', valueText: (v) => `${v} items`,
      help: 'Only used when the array above is set to “Random array”.'
    },
    { type: 'seed', name: 'seed', label: 'Random seed', value: 4221 }
  ],

  compute(values) {
    const input = arrayFromControls(values);
    const run = bubbleSortSteps(input, values.style === 'short');
    return { input, shorten: values.style === 'short', ...run };
  },

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => model.steps[i].description
  },

  figure(model, ctx) {
    const step = model.steps[ctx.step];
    const n = step.array.length;
    const marks = {};
    if (step.sweep > 0 && model.shorten) {
      for (let i = n - step.settled; i < n; i += 1) marks[i] = { glyph: '✓', note: 'settled' };
    }
    return barChart({
      values: step.array,
      labels: step.array.map((_, i) => String(i + 1)),
      marks,
      yLabel: 'Value',
      xLabel: 'Position'
    });
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    if (ctx.step === 0) {
      return `Bar chart of the starting array ${fmtArray(step.array)}, before any sweep.`;
    }
    return `Bar chart after sweep ${step.sweep}: the array is ${fmtArray(step.array)} following ` +
           `${step.swaps} ${plural(step.swaps, 'swap', 'swaps')} in this sweep and ` +
           `${step.total} comparisons so far.` +
           (step.stopped ? ' No swaps were made, so the algorithm has stopped.' : '');
  },

  table(model, ctx) {
    return {
      caption: `Bubble sort on ${fmtArray(model.input)} with ` +
               `${model.shorten ? 'shortened' : 'full'} sweeps — one row per sweep, ` +
               `showing step ${ctx.step + 1} of ${ctx.stepCount}`,
      rowHeader: true,
      columns: [
        { label: 'Sweep' },
        { label: 'Array after the sweep' },
        { label: 'Comparisons', numeric: true },
        { label: 'Swaps', numeric: true },
        { label: 'Comparisons so far', numeric: true }
      ],
      rows: model.steps.map((step, i) => ({
        cells: [
          i === 0 ? 'Start' : `Sweep ${step.sweep}`,
          fmtArray(step.array),
          step.comparisons,
          i === 0 ? 0 : step.swaps,
          step.total
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const step = model.steps[ctx.step];
    const n = model.input.length;
    const worst = model.shorten ? (n * (n - 1)) / 2 : (n - 1) * (n - 1);
    return [
      `${step.total} comparisons and ${step.totalSwaps || 0} swaps so far, over ` +
      `${step.sweep} ${plural(step.sweep, 'sweep', 'sweeps')}.`,
      ctx.step === ctx.stepCount - 1
        ? `Finished in ${model.comparisons} comparisons. The worst case for this sweep style on ` +
          `${n} items is ${worst}; the best case is ${n - 1}, reached when the array arrives ` +
          `already sorted.`
        : `The worst case for this sweep style on ${n} items is ${worst} comparisons.`
    ];
  }
});

/* ==========================================================================
   5. 1.1.4 — Sequential search step-through
   ========================================================================== */

function searchList(values) {
  const size = Math.max(4, Math.min(30, Math.round(values.size)));
  const random = seededRandom(values.seed);
  const list = Array.from({ length: size }, () => 2 + Math.floor(random() * 98));
  let position;
  if (values.keyPosition === 'first') position = 0;
  else if (values.keyPosition === 'middle') position = Math.floor((size - 1) / 2);
  else if (values.keyPosition === 'last') position = size - 1;
  else position = -1;

  const key = position >= 0 ? list[position] : 1;   // 1 never appears: values start at 2
  return { list, key, position };
}

createDemo('#demo-sequential-search-mount', {
  id: 'demo-sequential-search',
  title: 'Sequential search step-through',
  description:
    'One step per comparison. Move the key to the front, the middle, the end, or out of the ' +
    'list altogether, and watch the comparison count change while the algorithm does not.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'size', label: 'List length', min: 4, max: 30, step: 1, value: 12,
      unit: 'items', valueText: (v) => `${v} items`
    },
    {
      type: 'select', name: 'keyPosition', label: 'Where the search key sits', value: 'middle',
      options: [
        { value: 'first', label: 'First position — the best case' },
        { value: 'middle', label: 'Middle of the list' },
        { value: 'last', label: 'Last position — a worst case' },
        { value: 'absent', label: 'Not in the list at all — the other worst case' }
      ],
      help: 'Sequential search needs no sortedness, so the list is left unsorted on purpose.'
    },
    { type: 'seed', name: 'seed', label: 'Random seed', value: 17 }
  ],

  compute(values) {
    const built = searchList(values);
    const run = sequentialSearchSteps(built.list, built.key);
    return { ...built, ...run, size: built.list.length };
  },

  steps: {
    count: (model) => Math.max(1, model.steps.length),
    label: (model, i) => (model.steps[i] ? model.steps[i].description : 'No comparisons to make.')
  },

  figure(model, ctx) {
    const step = model.steps[ctx.step];
    const marks = {};
    if (step) {
      marks[step.index] = { glyph: step.hit ? '★' : '▼', note: step.hit ? 'match' : 'looking' };
    }
    return barChart({
      values: model.list,
      labels: model.list.map((_, i) => String(i + 1)),
      marks,
      yLabel: 'Value',
      xLabel: 'Position — the marked bar is the one being compared'
    });
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    if (!step) return 'The list is empty, so there is nothing to search.';
    return `Bar chart of the ${model.size}-item list. Comparison ${ctx.step + 1} is at position ` +
           `${step.index + 1}, which holds ${step.value}; the key is ${model.key}, so this ` +
           `${step.hit ? 'is a match and the search stops' : 'is not a match and the search continues'}.`;
  },

  table(model, ctx) {
    return {
      caption: `Sequential search for ${model.key} in a ${model.size}-item list — one row per ` +
               `comparison, showing step ${ctx.step + 1} of ${ctx.stepCount}`,
      rowHeader: true,
      columns: [
        { label: 'Comparison', numeric: true },
        { label: 'Position', numeric: true },
        { label: 'Value there', numeric: true },
        { label: 'Equals the key?' }
      ],
      rows: model.steps.map((step, i) => ({
        cells: [i + 1, step.index + 1, step.value, step.hit ? 'Yes — stop' : 'No — continue'],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const n = model.size;
    const lines = [
      `${ctx.step + 1} of ${model.comparisons} comparisons made. Sequential search does the same ` +
      `thing every time; only the input decides when it stops.`
    ];
    lines.push(
      model.foundAt >= 0
        ? `The key ${model.key} is at position ${model.foundAt + 1}, so this run costs ` +
          `${model.comparisons} of the ${n} comparisons available.`
        : `The key ${model.key} is not in the list, so this run costs the full ${n} comparisons — ` +
          `the worst case.`
    );
    lines.push(
      `On ${n} items: best case 1 comparison, worst case ${n}, average ${formatNumber((n + 1) / 2, 1)} ` +
      `when the key is present and every position is equally likely.`
    );
    return lines;
  }
});

/* ==========================================================================
   6. 1.2.2 — Binary search step-through
   ========================================================================== */

createDemo('#demo-binary-search-mount', {
  id: 'demo-binary-search',
  title: 'Binary search step-through',
  description:
    'One step per comparison on a sorted array. Each comparison throws away half of what is ' +
    'left, so the count grows like the logarithm of the length, not the length.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'preset', label: 'Array to search', value: 'lecture',
      options: [
        { value: 'lecture', label: 'Lecture example — 1, 4, 7, 9, 17, 31, 33' },
        { value: 'even', label: 'Even numbers — 2, 4, 6, … up to the length below' },
        { value: 'random', label: 'Sorted random array (uses the length and seed below)' }
      ]
    },
    {
      type: 'range', name: 'size', label: 'Array length', min: 4, max: 32, step: 1, value: 16,
      unit: 'items', valueText: (v) => `${v} items`,
      help: 'Ignored for the lecture example, which always has seven entries.'
    },
    {
      type: 'number', name: 'target', label: 'Search key', min: 1, max: 200, step: 1, value: 17,
      help: 'A key that is not in the array shows the worst case: the interval shrinks to nothing.'
    },
    { type: 'seed', name: 'seed', label: 'Random seed', value: 9 }
  ],

  compute(values) {
    let list;
    if (values.preset === 'lecture') {
      list = [1, 4, 7, 9, 17, 31, 33];
    } else if (values.preset === 'even') {
      list = Array.from({ length: Math.round(values.size) }, (_, i) => (i + 1) * 2);
    } else {
      const random = seededRandom(values.seed);
      const set = new Set();
      while (set.size < Math.round(values.size)) set.add(1 + Math.floor(random() * 120));
      list = Array.from(set).sort((a, b) => a - b);
    }
    const key = Math.round(values.target);
    const run = binarySearchSteps(list, key);
    const sequential = sequentialSearchSteps(list, key);
    return { list, key, ...run, sequentialComparisons: sequential.comparisons };
  },

  steps: {
    count: (model) => Math.max(1, model.steps.length),
    label: (model, i) => (model.steps[i] ? model.steps[i].description : 'Nothing to search.')
  },

  figure(model, ctx) {
    const step = model.steps[ctx.step];
    const marks = {};
    if (step) {
      marks[step.mid] = {
        glyph: step.outcome === 'Found' ? '★' : '▼',
        note: step.outcome === 'Found' ? 'match' : 'middle'
      };
      marks[step.low] = marks[step.low] || { glyph: '▶', note: 'low' };
      marks[step.high] = marks[step.high] || { glyph: '◀', note: 'high' };
    }
    return barChart({
      values: model.list,
      labels: model.list.map((_, i) => String(i + 1)),
      marks,
      yLabel: 'Value',
      xLabel: 'Position — low, middle and high of the interval still in play are marked'
    });
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    if (!step) return 'The array is empty, so there is nothing to search.';
    return `Bar chart of the ${model.list.length}-entry sorted array. At comparison ` +
           `${ctx.step + 1} the interval still in play runs from position ${step.low + 1} to ` +
           `position ${step.high + 1}, that is ${step.window} entries; its middle, position ` +
           `${step.mid + 1}, holds ${step.value}. ${step.outcome}.`;
  },

  table(model, ctx) {
    return {
      caption: `Binary search for ${model.key} in a ${model.list.length}-entry sorted array — ` +
               `one row per comparison, showing step ${ctx.step + 1} of ${ctx.stepCount}`,
      rowHeader: true,
      columns: [
        { label: 'Comparison', numeric: true },
        { label: 'Low', numeric: true },
        { label: 'Middle', numeric: true },
        { label: 'High', numeric: true },
        { label: 'Value at the middle', numeric: true },
        { label: 'Outcome' }
      ],
      rows: model.steps.map((step, i) => ({
        cells: [i + 1, step.low + 1, step.mid + 1, step.high + 1, step.value, step.outcome],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const n = model.list.length;
    const worst = Math.floor(Math.log2(Math.max(1, n))) + 1;
    return [
      model.foundAt >= 0
        ? `The key ${model.key} is at position ${model.foundAt + 1}, found in ${model.comparisons} ` +
          `${plural(model.comparisons, 'comparison', 'comparisons')}.`
        : `The key ${model.key} is not in the array; that took ${model.comparisons} ` +
          `${plural(model.comparisons, 'comparison', 'comparisons')} to establish.`,
      `Sequential search on the same array and the same key would need ` +
      `${model.sequentialComparisons} ${plural(model.sequentialComparisons, 'comparison', 'comparisons')}.`,
      `On ${n} sorted entries binary search never needs more than ${worst} comparisons, because ` +
      `each one halves what is left. Step ${ctx.step + 1} of ${ctx.stepCount}.`
    ];
  }
});

/* ==========================================================================
   7. 1.3.1 — Exponentiation by squaring
   ========================================================================== */

createDemo('#demo-power-squaring-mount', {
  id: 'demo-power-squaring',
  title: 'Exponentiation by squaring',
  description:
    'The lecture computes π to the eighth power in three multiplications instead of seven. ' +
    'Step through the chain for any exponent and watch the two counts diverge.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'exponent', label: 'Exponent k in π to the power k',
      min: 2, max: 128, step: 1, value: 8,
      valueText: (v) => `π to the power ${v}`,
      help: 'Powers of two need only squarings; odd exponents need one extra multiplication each.'
    }
  ],

  compute(values) {
    const k = Math.max(2, Math.round(values.exponent));
    const run = squaringSteps(k);
    const points = [];
    for (let e = 2; e <= 128; e += 1) {
      points.push([e, squaringSteps(e).multiplications]);
    }
    return {
      k,
      ...run,
      curveSquaring: points,
      curveBrute: Array.from({ length: 127 }, (_, i) => [i + 2, i + 1])
    };
  },

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => model.steps[i].description
  },

  figure(model) {
    return lineChart({
      series: [
        { label: 'Brute force, k − 1', points: model.curveBrute },
        { label: 'Squaring', points: model.curveSquaring }
      ],
      xMin: 2,
      xMax: 128,
      yMax: 127,
      xLabel: 'Exponent k',
      yLabel: 'Multiplications',
      marker: { x: model.k, label: `k = ${model.k}` }
    });
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    return `Line chart of multiplications against exponent. Brute force is the straight line ` +
           `k − 1; squaring is the much flatter staircase. At the marked exponent ` +
           `k = ${model.k}, brute force needs ${model.bruteForce} multiplications and squaring ` +
           `needs ${model.multiplications}. The trace is at step ${ctx.step + 1}, having reached ` +
           `π to the power ${step.exponent} using ${step.multiplications} multiplications.`;
  },

  table(model, ctx) {
    return {
      caption: `Squaring chain for π to the power ${model.k} — one row per multiplication, ` +
               `showing step ${ctx.step + 1} of ${ctx.stepCount}`,
      rowHeader: true,
      columns: [
        { label: 'Step' },
        { label: 'Operation' },
        { label: 'Exponent reached', numeric: true },
        { label: 'Multiplications so far', numeric: true }
      ],
      rows: model.steps.map((step, i) => ({
        cells: [
          i === 0 ? 'Start' : `Step ${i}`,
          step.kind === 'start' ? 'π itself' : (step.kind === 'square' ? 'Square the previous value' : 'Multiply by π'),
          step.exponent,
          step.multiplications
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const saved = model.bruteForce - model.multiplications;
    return [
      `π to the power ${model.k}: brute force needs ${model.bruteForce} multiplications, ` +
      `squaring needs ${model.multiplications} — ${saved} fewer.`,
      `The squaring count grows like the logarithm of k, so doubling the exponent adds about one ` +
      `multiplication while brute force doubles its count.`,
      `Step ${ctx.step + 1} of ${ctx.stepCount}: the chain has reached π to the power ` +
      `${model.steps[ctx.step].exponent}.`
    ];
  }
});

/* ==========================================================================
   8. 1.3.3 — Greedy coin change
   ========================================================================== */

const COIN_SYSTEMS = {
  us: { label: 'US: 1, 5, 10, 25', coins: [1, 5, 10, 25] },
  with20: { label: 'With a 20c coin: 1, 5, 10, 20, 25', coins: [1, 5, 10, 20, 25] },
  no5: { label: 'No 5c coin: 1, 10, 25', coins: [1, 10, 25] },
  sparse: { label: 'Sparse: 1, 3, 4', coins: [1, 3, 4] }
};

createDemo('#demo-coin-change-mount', {
  id: 'demo-coin-change',
  title: 'Greedy coin change against the optimal answer',
  description:
    'Greedy takes the largest coin that fits and never reconsiders. The optimal answer is ' +
    'computed exactly. For a canonical system they agree; change the system and watch them part.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'amount', label: 'Amount to make change for',
      min: 1, max: 100, step: 1, value: 41, unit: 'cents',
      valueText: (v) => `${v} cents`
    },
    {
      type: 'select', name: 'system', label: 'Coin system', value: 'us',
      options: Object.entries(COIN_SYSTEMS).map(([value, entry]) => ({ value, label: entry.label })),
      help: 'The US system is canonical, so greedy is always optimal on it. The others are not.'
    }
  ],

  compute(values) {
    const system = COIN_SYSTEMS[values.system] || COIN_SYSTEMS.us;
    const amount = Math.max(1, Math.round(values.amount));
    const greedy = greedyChange(amount, system.coins);
    const optimal = optimalChange(amount, system.coins);
    return {
      amount,
      system,
      greedy,
      optimal,
      matches: greedy.total === optimal.total,
      excess: greedy.total - optimal.total
    };
  },

  figure(model) {
    return groupedBarChart({
      categories: model.system.coins
        .slice()
        .sort((a, b) => b - a)
        .map((coin) => `${coin}c`)
        .concat(['Total\ncoins']),
      series: [
        {
          label: 'Greedy',
          values: model.system.coins.slice().sort((a, b) => b - a)
            .map((coin) => model.greedy.counts.get(coin) || 0)
            .concat([model.greedy.total])
        },
        {
          label: 'Optimal',
          values: model.system.coins.slice().sort((a, b) => b - a)
            .map((coin) => model.optimal.counts.get(coin) || 0)
            .concat([model.optimal.total])
        }
      ],
      yLabel: 'Coins used'
    });
  },

  figureAlt(model) {
    return `Grouped bar chart of coins used, greedy against optimal, for ${model.amount} cents ` +
           `with denominations ${model.system.coins.join(', ')}. Greedy uses ` +
           `${model.greedy.total} coins and the optimal answer uses ${model.optimal.total}. ` +
           (model.matches
             ? 'The two agree, so greedy is optimal here.'
             : `Greedy is ${model.excess} ${plural(model.excess, 'coin', 'coins')} worse than optimal.`);
  },

  table(model) {
    const coins = model.system.coins.slice().sort((a, b) => b - a);
    const rows = coins.map((coin) => ({
      cells: [
        `${coin}c`,
        model.greedy.counts.get(coin) || 0,
        model.optimal.counts.get(coin) || 0,
        (model.greedy.counts.get(coin) || 0) - (model.optimal.counts.get(coin) || 0)
      ],
      current: (model.greedy.counts.get(coin) || 0) !== (model.optimal.counts.get(coin) || 0)
    }));
    rows.push({
      cells: ['Total coins', model.greedy.total, model.optimal.total, model.excess],
      current: !model.matches
    });
    return {
      caption: `Coins used to make ${model.amount} cents from denominations ` +
               `${model.system.coins.join(', ')}: greedy against the optimal answer`,
      rowHeader: true,
      columns: [
        { label: 'Denomination' },
        { label: 'Greedy uses', numeric: true },
        { label: 'Optimal uses', numeric: true },
        { label: 'Difference', numeric: true }
      ],
      rows
    };
  },

  summary(model) {
    const greedyList = model.system.coins.slice().sort((a, b) => b - a)
      .filter((coin) => (model.greedy.counts.get(coin) || 0) > 0)
      .map((coin) => `${model.greedy.counts.get(coin)} × ${coin}c`)
      .join(' + ');
    const optimalList = model.system.coins.slice().sort((a, b) => b - a)
      .filter((coin) => (model.optimal.counts.get(coin) || 0) > 0)
      .map((coin) => `${model.optimal.counts.get(coin)} × ${coin}c`)
      .join(' + ');

    return [
      `Greedy: ${greedyList || 'nothing'} — ${model.greedy.total} ` +
      `${plural(model.greedy.total, 'coin', 'coins')}.`,
      `Optimal: ${optimalList || 'nothing'} — ${model.optimal.total} ` +
      `${plural(model.optimal.total, 'coin', 'coins')}.`,
      model.matches
        ? `Verdict: greedy succeeded. It found an optimal answer for ${model.amount} cents in ` +
          `this coin system.`
        : `Verdict: greedy failed. It used ${model.excess} ` +
          `${plural(model.excess, 'coin', 'coins')} more than necessary, because its first ` +
          `choice — the largest coin that fits — cannot be taken back.`
    ];
  }
});

/* ==========================================================================
   9. 1.3.5 — Strategy picker
   ========================================================================== */

const STRATEGY_RULES = [
  {
    type: 'sorting',
    condition: (v) => v.size < 50,
    label: 'Sorting · fewer than 50 items',
    pick: 'Insertion sort — decrease and conquer',
    reason: 'Below about 50 items the constant factors dominate the growth rate, and insertion ' +
            'sort has the cheapest inner loop of the simple sorts.'
  },
  {
    type: 'sorting',
    condition: (v) => v.character === 'nearly',
    label: 'Sorting · data is nearly sorted',
    pick: 'Bubble sort — brute force, but with an early exit',
    reason: 'A nearly-sorted array needs almost no swaps, so the no-swap stopping rule fires ' +
            'after one or two sweeps. Its best case is O(n).'
  },
  {
    type: 'sorting',
    condition: (v) => v.memory === true,
    label: 'Sorting · memory is tight',
    pick: 'Selection sort — brute force, in place',
    reason: 'It sorts in place and performs at most n − 1 swaps, the fewest writes of any of ' +
            'the simple sorts. It pays for that in comparisons, which are always n(n−1)/2.'
  },
  {
    type: 'sorting',
    condition: (v) => v.character === 'duplicates',
    label: 'Sorting · many duplicate keys',
    pick: 'Quicksort with three-way partitioning — divide and conquer',
    reason: 'Three-way partitioning groups equal keys in one pass, so runs of duplicates cost ' +
            'nothing extra instead of degrading the partition.'
  },
  {
    type: 'sorting',
    condition: (v) => v.size > 10000,
    label: 'Sorting · more than 10,000 items',
    pick: 'Mergesort — divide and conquer',
    reason: 'O(n log n) is guaranteed rather than merely typical, which matters once a bad case ' +
            'would cost hours instead of seconds.'
  },
  {
    type: 'sorting',
    condition: () => true,
    label: 'Sorting · anything else',
    pick: 'Quicksort — divide and conquer',
    reason: 'The general-purpose default: O(n log n) on average and a small constant factor.'
  },
  {
    type: 'searching',
    condition: (v) => v.status === 'sorted',
    label: 'Searching · the data is already sorted',
    pick: 'Binary search — decrease and conquer',
    reason: 'Sortedness is the precondition binary search needs, and it is already paid for. ' +
            'Each comparison halves the interval, so the cost is O(log n).'
  },
  {
    type: 'searching',
    condition: (v) => v.frequency === 'frequent',
    label: 'Searching · unsorted, but searched often',
    pick: 'Sort once, then binary search — transform and conquer',
    reason: 'The sort costs O(n log n) once; every later query then costs O(log n) instead of ' +
            'O(n). The transform pays for itself after roughly log n queries.'
  },
  {
    type: 'searching',
    condition: () => true,
    label: 'Searching · unsorted, searched once',
    pick: 'Sequential search — brute force',
    reason: 'One O(n) scan beats an O(n log n) sort you will never reuse. Sequential search has ' +
            'no precondition at all.'
  },
  {
    type: 'optimization',
    condition: (v) => v.nature === 'works',
    label: 'Optimization · the greedy choice is provably safe',
    pick: 'Greedy',
    reason: 'When the greedy-choice property holds, the locally best step is globally safe and ' +
            'the algorithm is both the simplest and the fastest option.'
  },
  {
    type: 'optimization',
    condition: (v) => v.nature === 'fails',
    label: 'Optimization · the greedy choice is known to fail',
    pick: 'Dynamic programming, or branch and bound',
    reason: 'A known counterexample rules greedy out. Dynamic programming reconsiders earlier ' +
            'choices, which is exactly what greedy refuses to do.'
  },
  {
    type: 'optimization',
    condition: () => true,
    label: 'Optimization · unknown',
    pick: 'Try greedy first, then check it against an exact method on small instances',
    reason: 'Greedy is cheap to write. Run it beside an exact method on instances small enough ' +
            'to solve both ways; a single disagreement is a counterexample.'
  }
];

function wrapText(text, perLine) {
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > perLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

createDemo('#demo-strategy-picker-mount', {
  id: 'demo-strategy-picker',
  title: 'Which strategy fits this problem?',
  description:
    'Rule-based, not computed: the rules are read top down and the first one that matches wins. ' +
    'The table shows every rule and which of them matched, so you can see why.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'type', label: 'Problem type', value: 'sorting',
      options: [
        { value: 'sorting', label: 'Sorting' },
        { value: 'searching', label: 'Searching' },
        { value: 'optimization', label: 'Optimization' }
      ]
    },
    {
      type: 'select', name: 'size', label: 'Problem size', value: '1000',
      options: [
        { value: '10', label: '10 items' },
        { value: '100', label: '100 items' },
        { value: '1000', label: '1,000 items' },
        { value: '10000', label: '10,000 items' },
        { value: '100000', label: '100,000 items' },
        { value: '1000000', label: '1,000,000 items' }
      ],
      help: 'Used by the sorting rules.'
    },
    {
      type: 'select', name: 'character', label: 'What the data looks like', value: 'random',
      options: [
        { value: 'random', label: 'Random order' },
        { value: 'nearly', label: 'Nearly sorted already' },
        { value: 'reversed', label: 'Sorted in reverse' },
        { value: 'duplicates', label: 'Many duplicate keys' }
      ],
      help: 'Used by the sorting rules.'
    },
    {
      type: 'checkbox', name: 'memory', label: 'Memory is tight — sort in place', value: false,
      help: 'Used by the sorting rules.'
    },
    {
      type: 'select', name: 'status', label: 'Is the data sorted?', value: 'unsorted',
      options: [
        { value: 'unsorted', label: 'Unsorted' },
        { value: 'sorted', label: 'Sorted' }
      ],
      help: 'Used by the searching rules.'
    },
    {
      type: 'select', name: 'frequency', label: 'How often will you search it?', value: 'one-time',
      options: [
        { value: 'one-time', label: 'Once' },
        { value: 'frequent', label: 'Many times' }
      ],
      help: 'Used by the searching rules.'
    },
    {
      type: 'select', name: 'nature', label: 'Does the greedy choice work?', value: 'unknown',
      options: [
        { value: 'works', label: 'Yes — it is provably safe' },
        { value: 'fails', label: 'No — there is a counterexample' },
        { value: 'unknown', label: 'Unknown' }
      ],
      help: 'Used by the optimization rules.'
    }
  ],

  compute(values) {
    const context = {
      size: Number(values.size),
      character: values.character,
      memory: values.memory === true,
      status: values.status,
      frequency: values.frequency,
      nature: values.nature
    };
    const applicable = STRATEGY_RULES.filter((rule) => rule.type === values.type);
    let winner = null;
    const evaluated = applicable.map((rule) => {
      const matched = rule.condition(context);
      const isWinner = matched && winner === null;
      if (isWinner) winner = rule;
      return { rule, matched, isWinner };
    });
    return { type: values.type, context, evaluated, winner: winner || applicable[applicable.length - 1] };
  },

  figure(model) {
    const svg = chart(W, 240);
    const stages = [
      { title: 'Problem type', body: model.type.charAt(0).toUpperCase() + model.type.slice(1) },
      { title: 'First rule that matched', body: model.winner.label },
      { title: 'Recommendation', body: model.winner.pick }
    ];

    stages.forEach((stage, i) => {
      const x = 12 + i * 216;
      svg.appendChild(box(x, 40, 196, 150, {
        fill: 'var(--fsu-surface-warm)', stroke: RULE, width: 2, rx: 8
      }));
      svg.appendChild(txt(x + 12, 66, stage.title, { size: 13, weight: 700, fill: INK }));
      wrapText(stage.body, 24).slice(0, 6).forEach((piece, li) => {
        svg.appendChild(txt(x + 12, 90 + li * 17, piece, { size: 13, fill: BODY }));
      });
      if (i < stages.length - 1) {
        svg.appendChild(line(x + 198, 115, x + 214, 115, { stroke: INK, width: 3 }));
        svg.appendChild(txt(x + 206, 108, '▶', { size: 13, anchor: 'middle', fill: INK }));
      }
    });

    svg.appendChild(txt(12, 24, 'Rules are read top down; the first match wins.',
      { size: 13, weight: 700, fill: INK }));

    return svg;
  },

  figureAlt(model) {
    return `Three-stage flow: the problem type is ${model.type}; the first rule that matched is ` +
           `“${model.winner.label}”; the recommendation is ${model.winner.pick}.`;
  },

  table(model) {
    return {
      caption: `Strategy rules for a ${model.type} problem, read top down — the first matching ` +
               `row wins`,
      rowHeader: true,
      columns: [
        { label: 'Rule' },
        { label: 'Matches your settings?' },
        { label: 'Recommendation if it wins' }
      ],
      rows: model.evaluated.map((entry) => ({
        cells: [
          entry.rule.label,
          entry.isWinner ? 'Yes — and it is the first match, so it wins'
            : (entry.matched ? 'Yes, but an earlier rule already won' : 'No'),
          entry.rule.pick
        ],
        current: entry.isWinner
      }))
    };
  },

  summary(model) {
    return [
      `Recommendation: ${model.winner.pick}.`,
      `Why: ${model.winner.reason}`,
      'These are heuristics, not theorems. They are a starting point for a decision you still ' +
      'have to justify with a cost argument.'
    ];
  }
});

/* ==========================================================================
   10. 1.4.3 — Operation counter
   ========================================================================== */

const SNIPPETS = {
  total: {
    label: 'Code 1 — running total: for i in range(n): total += i',
    operation: 'The addition total += i',
    formula: 'n',
    count: (n) => n,
    klass: 'O(n)'
  },
  nested: {
    label: 'Code 2 — nested loops with a guard: if i == j',
    operation: 'The test i == j',
    formula: 'n²',
    count: (n) => n * n,
    klass: 'O(n²)'
  },
  doubling: {
    label: 'Code 3 — doubling loop: while i < n: i *= 2',
    operation: 'The print inside the loop',
    formula: 'ceiling of log base 2 of n',
    count: (n) => (n <= 1 ? 0 : Math.ceil(Math.log2(n))),
    klass: 'O(log n)'
  },
  triangular: {
    label: 'Code 4 — triangular loop: for j in range(i)',
    operation: 'The print inside the inner loop',
    formula: 'n(n − 1)/2',
    count: (n) => (n * (n - 1)) / 2,
    klass: 'O(n²)'
  },
  constant: {
    label: 'Straight-line arithmetic: three assignments, then return',
    operation: 'Each assignment',
    formula: '3',
    count: () => 3,
    klass: 'O(1)'
  },
  step2: {
    label: 'Loop with step 2: for i in range(0, n, 2)',
    operation: 'The print inside the loop',
    formula: 'ceiling of n / 2',
    count: (n) => Math.ceil(n / 2),
    klass: 'O(n)'
  }
};

createDemo('#demo-operation-counter-mount', {
  id: 'demo-operation-counter',
  title: 'Count the operations',
  description:
    'The midterm asks for the exact count, not just the class. Pick a snippet, pick an n, and ' +
    'compare the exact count against the reference line n.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'snippet', label: 'Snippet', value: 'nested',
      options: Object.entries(SNIPPETS).map(([value, entry]) => ({ value, label: entry.label }))
    },
    {
      type: 'range', name: 'n', label: 'Input size n', min: 1, max: 64, step: 1, value: 16,
      valueText: (v) => `n equals ${v}`
    }
  ],

  compute(values) {
    const snippet = SNIPPETS[values.snippet] || SNIPPETS.nested;
    const n = Math.max(1, Math.round(values.n));
    const grid = [1, 2, 4, 8, 16, 32, 64];
    if (!grid.includes(n)) grid.push(n);
    grid.sort((a, b) => a - b);

    const curve = [];
    const reference = [];
    for (let x = 1; x <= 64; x += 1) {
      curve.push([x, snippet.count(x)]);
      reference.push([x, x]);
    }

    return { snippet, n, grid, curve, reference, value: snippet.count(n) };
  },

  figure(model) {
    return lineChart({
      series: [
        { label: 'This snippet', points: model.curve },
        { label: 'Reference: n', points: model.reference }
      ],
      xMin: 1,
      xMax: 64,
      yMax: Math.max(64, model.snippet.count(64)),
      xLabel: 'Input size n',
      yLabel: 'Times the operation runs',
      marker: { x: model.n, label: `n = ${model.n}` }
    });
  },

  figureAlt(model) {
    return `Line chart of operation count against input size for ${model.snippet.label}. ` +
           `At the marked size n = ${model.n} the operation runs ${fmtBig(model.value)} times, ` +
           `against ${model.n} for the linear reference line. The exact count is ` +
           `${model.snippet.formula}, which is ${model.snippet.klass}.`;
  },

  table(model) {
    return {
      caption: `${model.snippet.label} — exact operation count at a range of input sizes`,
      rowHeader: true,
      columns: [
        { label: 'Input size n', numeric: true },
        { label: 'Times the operation runs', numeric: true },
        { label: 'Reference: n', numeric: true },
        { label: 'Ratio to n', numeric: true }
      ],
      rows: model.grid.map((x) => ({
        cells: [
          x,
          fmtBig(model.snippet.count(x)),
          x,
          formatNumber(model.snippet.count(x) / x, 2)
        ],
        current: x === model.n
      }))
    };
  },

  summary(model) {
    return [
      `Operation of interest: ${model.snippet.operation}.`,
      `Exact count: ${model.snippet.formula}. At n = ${model.n} that is ` +
      `${fmtBig(model.value)} ${plural(model.value, 'execution', 'executions')}.`,
      `Complexity class: ${model.snippet.klass}. Doubling n from ${model.n} to ${model.n * 2} ` +
      `changes the count from ${fmtBig(model.value)} to ` +
      `${fmtBig(model.snippet.count(model.n * 2))}.`
    ];
  }
});

/* ==========================================================================
   11. 1.4.5 — Big-O complexity explorer
   ========================================================================== */

const CLASSES = [
  { key: 'constant', label: 'O(1)', fn: () => 1 },
  { key: 'log', label: 'O(log n)', fn: (n) => Math.log2(Math.max(1, n)) },
  { key: 'linear', label: 'O(n)', fn: (n) => n },
  { key: 'linearithmic', label: 'O(n log n)', fn: (n) => n * Math.log2(Math.max(2, n)) },
  { key: 'quadratic', label: 'O(n²)', fn: (n) => n * n },
  { key: 'exponential', label: 'O(2ⁿ)', fn: (n) => (n > 1000 ? Infinity : Math.pow(2, n)) }
];

createDemo('#demo-big-o-explorer-mount', {
  id: 'demo-big-o-explorer',
  title: 'Big-O complexity explorer',
  description:
    'Tick the classes you want to compare and set the largest input size. On a linear axis the ' +
    'exponential curve leaves the plot almost immediately — that is the point, not a bug.',
  headingLevel: 4,

  controls: [
    { type: 'checkbox', name: 'constant', label: 'Show O(1), constant', value: false },
    { type: 'checkbox', name: 'log', label: 'Show O(log n), logarithmic', value: false },
    { type: 'checkbox', name: 'linear', label: 'Show O(n), linear', value: true },
    { type: 'checkbox', name: 'linearithmic', label: 'Show O(n log n), linearithmic', value: false },
    { type: 'checkbox', name: 'quadratic', label: 'Show O(n²), quadratic', value: true },
    { type: 'checkbox', name: 'exponential', label: 'Show O(2ⁿ), exponential', value: false },
    {
      type: 'range', name: 'maxN', label: 'Largest input size to plot',
      min: 10, max: 1000, step: 10, value: 100,
      valueText: (v) => `up to n equals ${v}`
    },
    {
      type: 'checkbox', name: 'logScale', label: 'Use a logarithmic vertical axis', value: false,
      help: 'A log axis makes every class visible at once; a linear axis shows how brutal the gap is.'
    }
  ],

  compute(values) {
    const chosen = CLASSES.filter((entry) => values[entry.key] === true);
    const maxN = Math.max(10, Math.round(values.maxN));
    const stepSize = Math.max(1, Math.round(maxN / 60));

    const series = chosen.map((entry) => {
      const points = [];
      for (let n = 1; n <= maxN; n += stepSize) {
        const value = entry.fn(n);
        points.push([n, Number.isFinite(value) && value < 1e18 ? value : NaN]);
      }
      return { label: entry.label, points };
    });

    const grid = [10, 100, 1000, 10000];
    return { chosen, series, maxN, grid, logScale: values.logScale === true };
  },

  figure(model) {
    if (model.chosen.length === 0) {
      const svg = chart(W, 200);
      svg.appendChild(txt(20, 100, 'No complexity class is selected. Tick at least one above.',
        { size: 15, weight: 700, fill: INK }));
      return svg;
    }
    const finite = model.series.flatMap((s) => s.points.map((p) => p[1])).filter(Number.isFinite);
    return lineChart({
      series: model.series,
      xMin: 1,
      xMax: model.maxN,
      yMax: Math.max(1, ...finite),
      logY: model.logScale,
      xLabel: 'Input size n',
      yLabel: 'Operations'
    });
  },

  figureAlt(model) {
    if (model.chosen.length === 0) {
      return 'No complexity class is selected, so the chart is empty.';
    }
    const names = model.chosen.map((c) => c.label).join(', ');
    const biggest = model.chosen[model.chosen.length - 1];
    return `Line chart on a ${model.logScale ? 'logarithmic' : 'linear'} vertical axis comparing ` +
           `${names} for n from 1 to ${model.maxN}. At n = ${model.maxN} the steepest selected ` +
           `class, ${biggest.label}, needs ${fmtBig(biggest.fn(model.maxN))} operations while ` +
           `the shallowest, ${model.chosen[0].label}, needs ` +
           `${fmtBig(model.chosen[0].fn(model.maxN))}.`;
  },

  table(model) {
    if (model.chosen.length === 0) {
      return {
        caption: 'No complexity class is selected',
        rowHeader: true,
        columns: [{ label: 'Input size n', numeric: true }, { label: 'Operations' }],
        rows: model.grid.map((n) => ({ cells: [n, 'Tick a class above to fill this column'] }))
      };
    }
    return {
      caption: `Operations required by ${model.chosen.map((c) => c.label).join(', ')} at four ` +
               `input sizes`,
      rowHeader: true,
      columns: [{ label: 'Input size n', numeric: true }]
        .concat(model.chosen.map((entry) => ({ label: entry.label, numeric: true }))),
      rows: model.grid.map((n) => ({
        cells: [fmtInt(n)].concat(model.chosen.map((entry) => fmtBig(entry.fn(n)))),
        current: n === 1000
      }))
    };
  },

  summary(model) {
    if (model.chosen.length === 0) {
      return 'Nothing is selected. Tick at least one complexity class to compare.';
    }
    const at = model.maxN;
    const lines = model.chosen.map((entry) =>
      `${entry.label} needs ${fmtBig(entry.fn(at))} operations at n = ${at}.`);
    lines.push(
      'The ordering never changes for large n: 1 < log n < n < n log n < n² < 2ⁿ. Only where the ' +
      'curves cross depends on the constants.'
    );
    return lines;
  }
});

/* ==========================================================================
   12. 1.4.6 — Best case against worst case
   ========================================================================== */

createDemo('#demo-best-worst-mount', {
  id: 'demo-best-worst',
  title: 'Best case against worst case',
  description:
    'Same n, different inputs. Selection sort is a flat line — its best case equals its worst. ' +
    'Everything else on this chart has a gap, and the gap is what the midterm asks about.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'n', label: 'Problem size n', min: 2, max: 64, step: 1, value: 16,
      valueText: (v) => `n equals ${v}`
    }
  ],

  compute(values) {
    const n = Math.max(2, Math.round(values.n));
    const quadratic = (n * (n - 1)) / 2;
    const rows = [
      {
        name: 'Sequential search',
        best: 1,
        average: (n + 1) / 2,
        worst: n,
        bestInput: 'The key is the first element',
        worstInput: 'The key is last, or absent',
        klass: 'O(1) best, O(n) worst'
      },
      {
        name: 'Binary search',
        best: 1,
        average: binaryAverage(n),
        worst: Math.floor(Math.log2(n)) + 1,
        bestInput: 'The key is the middle element',
        worstInput: 'The key is at an end, or absent',
        klass: 'O(1) best, O(log n) worst'
      },
      {
        name: 'Selection sort',
        best: quadratic,
        average: quadratic,
        worst: quadratic,
        bestInput: 'Any input — there is no early exit',
        worstInput: 'Any input — there is no early exit',
        klass: 'O(n²) always'
      },
      {
        name: 'Bubble sort, shortened sweeps',
        best: n - 1,
        average: NaN,
        worst: quadratic,
        bestInput: 'Already sorted — one sweep, no swaps',
        worstInput: 'Sorted in reverse',
        klass: 'O(n) best, O(n²) worst'
      },
      {
        name: 'Bubble sort, full sweeps',
        best: n - 1,
        average: NaN,
        worst: (n - 1) * (n - 1),
        bestInput: 'Already sorted — one sweep, no swaps',
        worstInput: 'Sorted in reverse',
        klass: 'O(n) best, O(n²) worst'
      }
    ];
    return { n, rows };
  },

  figure(model) {
    return groupedBarChart({
      categories: model.rows.map((row) => row.name.replace(', ', ',\n')),
      series: [
        { label: 'Best case', values: model.rows.map((row) => row.best) },
        { label: 'Worst case', values: model.rows.map((row) => row.worst) }
      ],
      yLabel: `Comparisons at n = ${model.n}`
    });
  },

  figureAlt(model) {
    const seq = model.rows[0];
    const sel = model.rows[2];
    const bub = model.rows[3];
    return `Grouped bar chart of best-case and worst-case comparisons at n = ${model.n}. ` +
           `Sequential search runs from ${seq.best} to ${seq.worst}; selection sort is flat at ` +
           `${sel.worst} in both cases; bubble sort with shortened sweeps runs from ${bub.best} ` +
           `to ${bub.worst}. Only selection sort has no gap.`;
  },

  table(model) {
    return {
      caption: `Best, average and worst-case comparisons at n = ${model.n}. An em dash means ` +
               `the average is not defined without stating a distribution over inputs.`,
      rowHeader: true,
      columns: [
        { label: 'Algorithm' },
        { label: 'Best', numeric: true },
        { label: 'Average', numeric: true },
        { label: 'Worst', numeric: true },
        { label: 'Input causing the best case' },
        { label: 'Input causing the worst case' }
      ],
      rows: model.rows.map((row) => ({
        cells: [
          row.name,
          fmtBig(row.best),
          Number.isFinite(row.average) ? formatNumber(row.average, 2) : '—',
          fmtBig(row.worst),
          row.bestInput,
          row.worstInput
        ],
        current: row.name === 'Selection sort'
      }))
    };
  },

  summary(model) {
    const sel = model.rows[2];
    const bub = model.rows[3];
    return [
      `At n = ${model.n}, selection sort makes ${sel.worst} comparisons whatever the array ` +
      `contains — best case and worst case are the same number.`,
      `Bubble sort with shortened sweeps ranges from ${bub.best} comparisons on an already-sorted ` +
      `array to ${bub.worst} on a reversed one, a factor of ` +
      `${formatNumber(bub.worst / Math.max(1, bub.best), 1)}.`,
      'Both are O(n²) in the worst case. The difference is entirely in the best case, and it ' +
      'comes from bubble sort having a stopping rule that selection sort does not.'
    ];
  }
});

/* ==========================================================================
   13. 1.4.7 — Cost crossover
   ========================================================================== */

createDemo('#demo-cost-crossover-mount', {
  id: 'demo-cost-crossover',
  title: 'Where the cheaper algorithm changes',
  description:
    'The lecture’s two cost functions, with the coefficients under your control. A linear ' +
    'algorithm always wins eventually; the question is only how large n has to get.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'aSlope', label: 'Algorithm A: coefficient of n',
      min: 5, max: 200, step: 1, value: 50,
      valueText: (v) => `${v} times n`
    },
    {
      type: 'range', name: 'aConst', label: 'Algorithm A: constant term',
      min: 0, max: 200, step: 1, value: 21
    },
    {
      type: 'range', name: 'bLinear', label: 'Algorithm B: coefficient of n',
      min: 0, max: 100, step: 1, value: 10,
      help: 'Algorithm B is n² + this × n + 5. The n² term is fixed, because that is what makes B quadratic.'
    },
    {
      type: 'range', name: 'maxN', label: 'Largest n to plot', min: 20, max: 500, step: 10, value: 120,
      valueText: (v) => `up to n equals ${v}`
    }
  ],

  compute(values) {
    const a1 = Math.round(values.aSlope);
    const a0 = Math.round(values.aConst);
    const b1 = Math.round(values.bLinear);
    const b0 = 5;
    const maxN = Math.max(20, Math.round(values.maxN));

    const costA = (n) => a1 * n + a0;
    const costB = (n) => n * n + b1 * n + b0;

    let crossover = null;
    for (let n = 1; n <= 100000; n += 1) {
      if (costB(n) > costA(n)) { crossover = n; break; }
    }

    const seriesA = [];
    const seriesB = [];
    const stepSize = Math.max(1, Math.round(maxN / 60));
    for (let n = 1; n <= maxN; n += stepSize) {
      seriesA.push([n, costA(n)]);
      seriesB.push([n, costB(n)]);
    }

    const grid = [];
    [10, 25, 50, 100, 250, 500, 1000].forEach((n) => grid.push(n));
    if (crossover) {
      [crossover - 1, crossover].forEach((n) => { if (n >= 1 && !grid.includes(n)) grid.push(n); });
    }
    grid.sort((x, y) => x - y);

    return { a1, a0, b1, b0, maxN, costA, costB, crossover, seriesA, seriesB, grid };
  },

  figure(model) {
    return lineChart({
      series: [
        { label: `A = ${model.a1}n + ${model.a0}`, points: model.seriesA },
        { label: `B = n² + ${model.b1}n + ${model.b0}`, points: model.seriesB }
      ],
      xMin: 1,
      xMax: model.maxN,
      yMax: Math.max(model.costA(model.maxN), model.costB(model.maxN)),
      xLabel: 'Problem size n',
      yLabel: 'Operations',
      marker: model.crossover && model.crossover <= model.maxN
        ? { x: model.crossover, label: `crossover at n = ${model.crossover}` }
        : null
    });
  },

  figureAlt(model) {
    const at = model.maxN;
    return `Line chart of two cost functions against problem size. The straight line is ` +
           `A = ${model.a1}n + ${model.a0}; the upward-bending curve is ` +
           `B = n² + ${model.b1}n + ${model.b0}. ` +
           (model.crossover
             ? `B is cheaper below n = ${model.crossover} and A is cheaper from n = ${model.crossover} onwards. `
             : 'A is cheaper at every size shown. ') +
           `At n = ${at}, A costs ${fmtInt(model.costA(at))} operations and B costs ` +
           `${fmtInt(model.costB(at))}.`;
  },

  table(model) {
    return {
      caption: `Cost of A = ${model.a1}n + ${model.a0} against B = n² + ${model.b1}n + ` +
               `${model.b0}, either side of the crossover`,
      rowHeader: true,
      columns: [
        { label: 'Problem size n', numeric: true },
        { label: 'Algorithm A', numeric: true },
        { label: 'Algorithm B', numeric: true },
        { label: 'Cheaper' }
      ],
      rows: model.grid.map((n) => ({
        cells: [
          fmtInt(n),
          fmtInt(model.costA(n)),
          fmtInt(model.costB(n)),
          model.costB(n) === model.costA(n) ? 'Equal'
            : (model.costB(n) < model.costA(n) ? 'B, the quadratic one' : 'A, the linear one')
        ],
        current: model.crossover !== null && n === model.crossover
      }))
    };
  },

  summary(model) {
    const lines = [];
    if (model.crossover) {
      lines.push(
        `The crossover is at n = ${model.crossover}: below it the quadratic algorithm B is ` +
        `cheaper, from there on the linear algorithm A is cheaper and stays cheaper for ever.`
      );
    } else {
      lines.push('Algorithm A is cheaper at every size — there is no crossover in the range searched.');
    }
    lines.push(
      `At n = 1,000, A costs ${fmtInt(model.costA(1000))} operations and B costs ` +
      `${fmtInt(model.costB(1000))} — a factor of ` +
      `${formatNumber(model.costB(1000) / model.costA(1000), 1)}.`
    );
    lines.push(
      'Making A slower with a bigger coefficient only pushes the crossover right; it never ' +
      'removes it, because a linear function eventually loses to no quadratic one.'
    );
    return lines;
  }
});

/* ==========================================================================
   14. 1.5.1 — Nearest stores, Lab 03
   ========================================================================== */

createDemo('#demo-store-distances-mount', {
  id: 'demo-store-distances',
  title: 'Nearest stores by selection sort',
  description:
    'Lab 03 end to end: Haversine distances from a caller to seven stores, then selection sort ' +
    'on the distances with the city names carried along. One step per pass.',
  headingLevel: 4,

  controls: [
    {
      type: 'select', name: 'origin', label: 'Where the caller is', value: 'Tallahassee',
      options: STORES.map((store) => ({ value: store.city, label: store.city }))
        .concat([{ value: 'custom', label: 'Somewhere else — use the coordinates below' }])
    },
    {
      type: 'number', name: 'lat', label: 'Caller latitude (degrees north)',
      min: 24, max: 32, step: 0.01, value: 30.4,
      help: 'Only used when the caller is set to “Somewhere else”.'
    },
    {
      type: 'number', name: 'lon', label: 'Caller longitude (degrees west, as a positive number)',
      min: 79, max: 88, step: 0.01, value: 83.8,
      help: 'Lab 03 stores west longitudes as positive numbers. Keep the convention consistent.'
    }
  ],

  compute(values) {
    let lat;
    let lon;
    let label;
    if (values.origin === 'custom') {
      lat = Number(values.lat);
      lon = Number(values.lon);
      label = `${formatNumber(lat, 2)} °N, ${formatNumber(lon, 2)} °W`;
    } else {
      const store = STORES.find((s) => s.city === values.origin) || STORES[0];
      lat = store.lat;
      lon = store.lon;
      label = store.city;
    }

    const distances = STORES.map((store) => ({
      city: store.city,
      id: store.id,
      km: Math.round(haversineKm(lat, lon, store.lat, store.lon) * 100) / 100
    }));

    /* Selection sort on the distances, carrying the names with them. */
    const order = distances.slice();
    const steps = [{
      order: order.slice(),
      fixed: 0,
      comparisons: 0,
      total: 0,
      description: `Start. Seven Haversine distances have been computed from ${label}; nothing ` +
                   `is sorted yet.`
    }];
    let total = 0;
    for (let i = 0; i < order.length - 1; i += 1) {
      let minLoc = i;
      let comparisons = 0;
      for (let j = i + 1; j < order.length; j += 1) {
        comparisons += 1;
        if (order[j].km < order[minLoc].km) minLoc = j;
      }
      total += comparisons;
      const chosen = order[minLoc];
      const displaced = order[i];
      const swapped = minLoc !== i;
      if (swapped) {
        const hold = order[i];
        order[i] = order[minLoc];
        order[minLoc] = hold;
      }
      steps.push({
        order: order.slice(),
        fixed: i + 1,
        comparisons,
        total,
        description: swapped
          ? `Pass ${i + 1}: ${comparisons} comparisons pick ${chosen.city} at ` +
            `${formatNumber(chosen.km, 2)} kilometres as the nearest store not yet ranked; it ` +
            `swaps into position ${i + 1}, displacing ${displaced.city}. Rank ${i + 1} is final.`
          : `Pass ${i + 1}: ${comparisons} comparisons confirm ${displaced.city} at ` +
            `${formatNumber(displaced.km, 2)} kilometres is already the nearest store not yet ` +
            `ranked, so no swap is needed. Rank ${i + 1} is final.`
      });
    }
    const last = steps[steps.length - 1];
    last.fixed = order.length;
    last.description += ` The furthest store follows by elimination, so the ranking is complete.`;

    return { label, lat, lon, steps, sorted: order, comparisons: total };
  },

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => model.steps[i].description
  },

  figure(model, ctx) {
    const step = model.steps[ctx.step];
    const marks = {};
    for (let i = 0; i < step.fixed; i += 1) marks[i] = { glyph: '✓', note: 'ranked' };
    return barChart({
      values: step.order.map((entry) => entry.km),
      labels: step.order.map((entry) => entry.city.slice(0, 4)),
      marks,
      decimals: 0,
      yLabel: 'Distance (km)',
      xLabel: 'Array position — a tick means the rank is final'
    });
  },

  figureAlt(model, ctx) {
    const step = model.steps[ctx.step];
    if (ctx.step === 0) {
      return `Bar chart of Haversine distances from ${model.label} to the seven stores, in file ` +
             `order, before sorting. The shortest is ` +
             `${formatNumber(Math.min(...step.order.map((e) => e.km)), 2)} kilometres.`;
    }
    return `Bar chart after pass ${ctx.step}: the first ${step.fixed} of 7 ranks are final. ` +
           `Rank ${step.fixed} is ${step.order[step.fixed - 1].city} at ` +
           `${formatNumber(step.order[step.fixed - 1].km, 2)} kilometres, and ${step.total} ` +
           `comparisons have been made.`;
  },

  table(model, ctx) {
    const step = model.steps[ctx.step];
    return {
      caption: `Stores in array order after step ${ctx.step + 1} of ${ctx.stepCount}, sorting by ` +
               `Haversine distance from ${model.label} with R = 6371 km`,
      rowHeader: true,
      columns: [
        { label: 'Array position', numeric: true },
        { label: 'Store' },
        { label: 'City' },
        { label: 'Distance', unit: 'km', numeric: true },
        { label: 'Status' }
      ],
      rows: step.order.map((entry, i) => ({
        cells: [
          i + 1,
          entry.id,
          entry.city,
          formatNumber(entry.km, 2),
          i < step.fixed ? 'Rank final' : 'Not yet ranked'
        ],
        current: i === step.fixed - 1 && ctx.step > 0
      }))
    };
  },

  summary(model, ctx) {
    const step = model.steps[ctx.step];
    const nearest = model.sorted[0];
    const second = model.sorted[1];
    return [
      `Caller at ${model.label}. ${step.fixed} of 7 ranks are final after ${step.total} ` +
      `${plural(step.total, 'comparison', 'comparisons')}.`,
      `The nearest store is ${nearest.id} in ${nearest.city}, ${formatNumber(nearest.km, 2)} ` +
      `kilometres away; the next is ${second.id} in ${second.city} at ` +
      `${formatNumber(second.km, 2)} kilometres.`,
      `Selection sort on 7 items always makes 21 comparisons. Computing the seven distances ` +
      `costs seven Haversine evaluations, so on this problem size the trigonometry, not the ` +
      `sort, is the expensive half.`
    ];
  }
});

/* ==========================================================================
   15. 1.5.2 — Protein generator, Lab 04
   ========================================================================== */

createDemo('#demo-protein-generator-mount', {
  id: 'demo-protein-generator',
  title: 'Random protein generator',
  description:
    'Lab 04 Problem 1, with rejection sampling made visible: draw a codon, throw it away if it ' +
    'is a stop codon, otherwise keep it. Change the seed to get a different protein.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'aminoAcids', label: 'Amino acids to generate (n)',
      min: 1, max: 60, step: 1, value: 40,
      valueText: (v) => `${v} amino acids, ${v * 3} characters`,
      help: 'The lab asks for a protein of 40 amino acids in the report.'
    },
    {
      type: 'seed', name: 'seed', label: 'Random seed', value: 4221,
      help: 'The same seed always produces the same protein, so you can quote this exact run.'
    }
  ],

  compute(values) {
    const n = Math.max(1, Math.round(values.aminoAcids));
    const run = generateProtein(n, values.seed);
    const baseCounts = { A: 0, C: 0, G: 0, T: 0 };
    run.protein.split('').forEach((base) => { baseCounts[base] += 1; });
    const stopsPresent = run.codons.filter((c) => STOP_CODONS.includes(c)).length;
    return { n, seed: values.seed, ...run, baseCounts, stopsPresent };
  },

  figure(model) {
    const order = ['A', 'C', 'G', 'T'];
    const expected = model.protein.length / 4;
    return barChart({
      values: order.map((base) => model.baseCounts[base]),
      labels: order,
      maxValue: Math.max(1, ...order.map((b) => model.baseCounts[b]), expected),
      yLabel: 'Times the base occurs',
      xLabel: 'Nucleotide — expected count is ' + formatNumber(expected, 1) + ' for each'
    });
  },

  figureAlt(model) {
    const order = ['A', 'C', 'G', 'T'];
    const parts = order.map((base) => `${base} ${model.baseCounts[base]}`).join(', ');
    return `Bar chart of nucleotide counts in the generated protein of ${model.protein.length} ` +
           `characters: ${parts}. Each base would appear ` +
           `${formatNumber(model.protein.length / 4, 1)} times if the draws were perfectly even; ` +
           `rejecting stop codons tilts the counts slightly away from T and A.`;
  },

  table(model) {
    return {
      caption: `The ${model.n} codons generated with seed ${model.seed}, in reading order`,
      rowHeader: true,
      columns: [
        { label: 'Amino-acid position', numeric: true },
        { label: 'Codon' },
        { label: 'Characters', numeric: true },
        { label: 'Amino acid it codes for' }
      ],
      rows: model.codons.map((codon, i) => {
        const entry = CODON_TABLE.find((row) => row.codons.includes(codon));
        return {
          cells: [i + 1, codon, `${i * 3 + 1}–${i * 3 + 3}`, entry ? entry.name : 'unknown'],
          current: false
        };
      })
    };
  },

  summary(model) {
    return [
      `Generated ${model.n} amino acids — a string of ${model.protein.length} characters.`,
      `The rejection loop made ${model.draws} draws to keep ${model.n} codons, throwing away ` +
      `${model.rejected} stop ${plural(model.rejected, 'codon', 'codons')}. The expected number ` +
      `of draws is ${formatNumber((model.n * 64) / 61, 1)}, since 3 of the 64 codons are rejected.`,
      model.stopsPresent === 0
        ? 'Verified: the codon-aligned reading frame contains no TAA, TAG or TGA, which is the ' +
          'constraint the lab states but does not test.'
        : `Warning: ${model.stopsPresent} stop codons survived — that is a bug, please report it.`,
      `First 30 characters: ${model.protein.slice(0, 30)}${model.protein.length > 30 ? '…' : ''}`
    ];
  }
});

/* ==========================================================================
   16. 1.5.3 — Amino-acid counter, Lab 04
   ========================================================================== */

createDemo('#demo-amino-count-mount', {
  id: 'demo-amino-count',
  title: 'Amino-acid counter',
  description:
    'Lab 04 Problem 2: sequential search over the codon-aligned reading frame, counting every ' +
    'codon that codes for the chosen amino acid. Compare the observed count against what chance ' +
    'predicts.',
  headingLevel: 4,

  controls: [
    {
      type: 'range', name: 'aminoAcids', label: 'Protein length in amino acids',
      min: 10, max: 200, step: 5, value: 40,
      valueText: (v) => `${v} amino acids`
    },
    {
      type: 'select', name: 'target', label: 'Amino acid to count', value: 'Cysteine',
      options: CODON_TABLE.map((row) => ({
        value: row.name,
        label: `${row.name} — ${row.codons.length} ${plural(row.codons.length, 'codon', 'codons')}`
      })),
      help: 'The lab’s worked example is Cysteine, whose codons are TGT and TGC.'
    },
    {
      type: 'seed', name: 'seed', label: 'Random seed', value: 11,
      help: 'The default seed happens to give two Cysteines. Press “New seed” a few times and ' +
            'watch the count move around its expected value — that is sampling noise, not a bug.'
    }
  ],

  compute(values) {
    const n = Math.max(1, Math.round(values.aminoAcids));
    const run = generateProtein(n, values.seed);
    const counts = CODON_TABLE.map((row) => {
      const observed = run.codons.filter((codon) => row.codons.includes(codon)).length;
      const expected = row.name === 'Stop codons' ? 0 : (n * row.codons.length) / 61;
      return { ...row, observed, expected };
    });
    const target = counts.find((row) => row.name === values.target) || counts[0];
    const detail = countAminoAcid(run.codons, target.name);
    return { n, protein: run.protein, codons: run.codons, counts, target, detail };
  },

  figure(model) {
    return barChart({
      values: model.counts.map((row) => row.observed),
      labels: model.counts.map((row) => row.slc),
      marks: { [model.counts.indexOf(model.target)]: { glyph: '▼', note: model.target.slc } },
      yLabel: 'Times it occurs',
      xLabel: 'Amino acid, by single-letter code — the marked bar is the one selected'
    });
  },

  figureAlt(model) {
    const top = model.counts
      .filter((row) => row.name !== 'Stop codons')
      .slice()
      .sort((a, b) => b.observed - a.observed)[0];
    return `Bar chart of how often each amino acid occurs in a random protein of ${model.n} ` +
           `amino acids, labelled by single-letter code. The selected amino acid, ` +
           `${model.target.name}, occurs ${model.target.observed} ` +
           `${plural(model.target.observed, 'time', 'times')} against an expected ` +
           `${formatNumber(model.target.expected, 1)}. The most frequent is ${top.name} with ` +
           `${top.observed}.`;
  },

  table(model) {
    return {
      caption: `Amino-acid counts in a random protein of ${model.n} amino acids, read in the ` +
               `codon-aligned frame`,
      rowHeader: true,
      columns: [
        { label: 'Amino acid' },
        { label: 'Single-letter code' },
        { label: 'Codons' },
        { label: 'Observed', numeric: true },
        { label: 'Expected', numeric: true }
      ],
      rows: model.counts.map((row) => ({
        cells: [
          row.name,
          row.slc,
          row.codons.join(', '),
          row.observed,
          row.name === 'Stop codons' ? '0' : formatNumber(row.expected, 1)
        ],
        current: row.name === model.target.name
      }))
    };
  },

  summary(model) {
    const breakdown = Array.from(model.detail.perCodon.entries())
      .map(([codon, count]) => `${codon} ${count}`)
      .join(', ');
    return [
      `${model.target.name} occurs ${model.target.observed} ` +
      `${plural(model.target.observed, 'time', 'times')} in this protein of ${model.n} amino ` +
      `acids. Breakdown by codon: ${breakdown}.`,
      `Chance alone predicts ${formatNumber(model.target.expected, 1)}, because ` +
      `${model.target.codons.length} of the 61 coding codons name this amino acid.`,
      `The search examines ${model.n} codons and does at most ` +
      `${model.n * model.target.codons.length} comparisons — sequential search, O(n) in the ` +
      `length of the protein.`
    ];
  }
});

})(window);
