/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   cross-greedy-gallery.js
   Demos for cross-cutting/greedy-gallery.html
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access, no hex values.

   Two demos:
     demo-greedy-coin-change  the M1 greedy change-making trace, step by step, with
                       an exact dynamic-programming optimum for comparison
     demo-greedy-gap   the same comparison run over every amount up to a
                       limit, so one counterexample becomes a pattern

   The default case is the counterexample from M1 topic 1.3.4: 30 cents with
   denominations 1c, 10c and 25c. Greedy takes 6 coins; 3 will do.
   ========================================================================== */

const { createDemo, svgEl, formatNumber } = window.Demo;
/* ==========================================================================
   1. The two algorithms
   ========================================================================== */

const SYSTEMS = {
  nonickel: { label: 'No nickel: 1c, 10c, 25c — the M1 counterexample', coins: [1, 10, 25] },
  us: { label: 'United States: 1c, 5c, 10c, 25c', coins: [1, 5, 10, 25] },
  odd: { label: 'A made-up system: 1c, 3c, 4c', coins: [1, 3, 4] },
  powers: { label: 'Powers of two: 1c, 2c, 4c, 8c, 16c, 32c', coins: [1, 2, 4, 8, 16, 32] }
};

/**
 * Greedy change: repeatedly take the largest coin that still fits.
 * Returns the trace, one entry per coin taken.
 */
function greedyTrace(amount, coins) {
  const sorted = [...coins].sort((a, b) => b - a);
  const steps = [];
  let remaining = amount;

  for (const coin of sorted) {
    while (remaining >= coin) {
      steps.push({ coin, before: remaining, after: remaining - coin, used: steps.length + 1 });
      remaining -= coin;
    }
  }

  return { steps, remaining, solved: remaining === 0 };
}

/**
 * The exact minimum, by dynamic programming over every amount up to `amount`.
 * This is not greedy: it reconsiders every choice, which is exactly why it
 * costs more and always wins.
 */
function optimalChange(amount, coins) {
  const INFINITY = Number.MAX_SAFE_INTEGER;
  const best = new Array(amount + 1).fill(INFINITY);
  const choice = new Array(amount + 1).fill(-1);
  best[0] = 0;

  for (let a = 1; a <= amount; a += 1) {
    for (const coin of coins) {
      if (coin <= a && best[a - coin] !== INFINITY && best[a - coin] + 1 < best[a]) {
        best[a] = best[a - coin] + 1;
        choice[a] = coin;
      }
    }
  }

  if (best[amount] === INFINITY) return { count: null, coins: [], table: best };

  const used = [];
  let a = amount;
  while (a > 0) {
    used.push(choice[a]);
    a -= choice[a];
  }
  used.sort((x, y) => y - x);
  return { count: best[amount], coins: used, table: best };
}

function tallyCoins(list) {
  const counts = new Map();
  list.forEach((coin) => counts.set(coin, (counts.get(coin) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([coin, n]) => `${n} × ${coin}c`)
    .join(' + ');
}

/* ==========================================================================
   2. Drawing helpers
   ========================================================================== */

const SERIES_TOKEN = [
  'var(--fsu-series-1)', 'var(--fsu-series-2)', 'var(--fsu-series-3)',
  'var(--fsu-series-4)', 'var(--fsu-series-5)', 'var(--fsu-series-6)'
];
const AXIS_STYLE = 'stroke:var(--fsu-chart-axis);fill:none;stroke-width:2';
const GRID_STYLE = 'stroke:var(--fsu-chart-gridline);fill:none;stroke-width:1';
const TICK_STYLE = 'fill:var(--fsu-color-caption);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';
const LABEL_STYLE = 'fill:var(--fsu-color-body);font-size:var(--fsu-text-small);font-family:var(--fsu-font-sans)';

/** One coin, drawn as a ring with its value written inside as real text. */
function coinNode(value, x, y, index, dimmed) {
  const group = svgEl('g');
  const token = SERIES_TOKEN[index % SERIES_TOKEN.length];
  group.appendChild(svgEl('circle', {
    cx: x, cy: y, r: 15,
    style: `stroke:${token};fill:none;stroke-width:${dimmed ? 1.5 : 3}`,
    'stroke-dasharray': dimmed ? '3 3' : null
  }));
  group.appendChild(svgEl('text', {
    x, y: y + 5, 'text-anchor': 'middle',
    style: LABEL_STYLE, text: String(value)
  }));
  return group;
}

/* ==========================================================================
   3. Demo 1 — the greedy trace against the optimum
   ========================================================================== */

createDemo('#demo-greedy-coin-change-mount', {
  id: 'demo-greedy-coin-change',
  title: 'Coin change: greedy against optimal',
  description:
    'Greedy takes the largest coin that fits and never looks back. The exact method reconsiders ' +
    'every choice. Step through the greedy run and compare the two totals at the end.',
  headingLevel: 4,

  controls: [
    {
      type: 'select',
      name: 'system',
      label: 'Denomination system',
      value: 'nonickel',
      options: Object.entries(SYSTEMS).map(([value, s]) => ({ value, label: s.label })),
      help: 'Greedy is optimal for some systems and not for others. The system, not the amount, is what decides.'
    },
    {
      type: 'range',
      name: 'amount',
      label: 'Amount to make, in cents',
      min: 1,
      max: 99,
      step: 1,
      value: 30,
      valueText: (v) => `${v} cents`,
      help: 'Try 30 with the no-nickel system, then 41 with the United States system.'
    }
  ],

  compute(values) {
    const system = SYSTEMS[values.system] || SYSTEMS.nonickel;
    const amount = Math.max(1, Math.round(values.amount));

    const greedy = greedyTrace(amount, system.coins);
    const optimal = optimalChange(amount, system.coins);

    const greedyCount = greedy.solved ? greedy.steps.length : null;
    const extra = (greedyCount !== null && optimal.count !== null)
      ? greedyCount - optimal.count
      : null;

    return {
      systemKey: values.system,
      system,
      amount,
      greedy,
      optimal,
      greedyCount,
      extra,
      matches: extra === 0
    };
  },

  steps: {
    count: (model) => Math.max(1, model.greedy.steps.length),
    label: (model, i) => {
      const step = model.greedy.steps[i];
      if (!step) return 'This amount cannot be made from these denominations at all.';
      const left = step.after === 0
        ? 'nothing is left, so greedy stops here'
        : `${step.after}c is left`;
      // The runtime already announces "Step n of m", so this states only the
      // delta: which coin was taken and what it left behind.
      return `The largest coin that fits into ${step.before}c is ${step.coin}c, ` +
        `so greedy takes it and never reconsiders. After that, ${left}. ` +
        `Coins used so far: ${step.used}.`;
    }
  },

  figure(model, ctx) {
    const W = 660;
    const rowY = [70, 170];
    const H = 220;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`, width: '100%',
      style: 'max-inline-size:100%;block-size:auto'
    });

    // Index a coin by its denomination so 10c always draws the same way in
    // both rows. The value is written inside every ring, so colour is a
    // convenience here and never the thing that identifies a coin.
    const denominations = [...model.system.coins].sort((a, b) => b - a);

    const drawRow = (title, coins, y, revealUpTo) => {
      svg.appendChild(svgEl('text', { x: 8, y: y - 30, style: LABEL_STYLE, text: title }));
      if (coins.length === 0) {
        svg.appendChild(svgEl('text', { x: 8, y, style: LABEL_STYLE, text: 'no solution exists' }));
        return;
      }
      const spacing = Math.min(38, (W - 40) / Math.max(1, coins.length));
      coins.forEach((coin, i) => {
        const x = 24 + i * spacing + 15;
        const dimmed = revealUpTo !== null && i > revealUpTo;
        svg.appendChild(coinNode(coin, x, y, Math.max(0, denominations.indexOf(coin)), dimmed));
      });
    };

    drawRow(
      `Greedy: ${model.greedyCount === null ? 'no solution' : `${model.greedyCount} coins`} ` +
      `(solid rings are taken so far, dashed rings are still to come)`,
      model.greedy.steps.map((s) => s.coin),
      rowY[0],
      ctx.step
    );

    drawRow(
      `Optimal: ${model.optimal.count === null ? 'no solution' : `${model.optimal.count} coins`}`,
      model.optimal.coins,
      rowY[1],
      null
    );

    svg.appendChild(svgEl('line', { x1: 8, y1: 120, x2: W - 8, y2: 120, style: GRID_STYLE }));

    return svg;
  },

  figureAlt(model, ctx) {
    const step = model.greedy.steps[ctx.step];
    const top = model.greedy.steps.map((s) => `${s.coin}c`).join(', ');
    const bottom = model.optimal.coins.map((c) => `${c}c`).join(', ');

    if (!step) {
      return `No combination of ${model.system.coins.join('c, ')}c makes ${model.amount}c, so both rows are empty.`;
    }

    return `Two rows of coins for ${model.amount} cents. The upper row is the greedy answer — ${top} — ` +
      `with the first ${ctx.step + 1} of ${model.greedy.steps.length} drawn as solid rings and the rest dashed. ` +
      `The lower row is the exact optimum — ${bottom}. ` +
      (model.matches
        ? 'Both rows hold the same number of coins here.'
        : `The greedy row holds ${model.extra} more coin${model.extra === 1 ? '' : 's'} than the optimal row.`);
  },

  table(model, ctx) {
    if (model.greedy.steps.length === 0) {
      return {
        caption: `No combination of ${model.system.coins.join('c, ')}c makes ${model.amount}c`,
        columns: [{ label: 'Result' }],
        rows: [['This amount cannot be made from this denomination system.']]
      };
    }

    return {
      caption: `Greedy trace for ${model.amount}c with ${model.system.label}. ` +
        `Greedy uses ${model.greedyCount} coins; the exact optimum uses ${model.optimal.count}. ` +
        `Step ${ctx.step + 1} of ${ctx.stepCount} is marked.`,
      rowHeader: true,
      columns: [
        { label: 'Step', numeric: true },
        { label: 'Coin taken', unit: 'c', numeric: true },
        { label: 'Amount before', unit: 'c', numeric: true },
        { label: 'Amount after', unit: 'c', numeric: true },
        { label: 'Coins used', numeric: true }
      ],
      rows: model.greedy.steps.map((step, i) => ({
        cells: [i + 1, step.coin, step.before, step.after, step.used],
        current: i === ctx.step
      }))
    };
  },

  summary(model) {
    if (model.greedyCount === null) {
      return [`${model.amount}c cannot be made from ${model.system.label}.`];
    }

    const lines = [
      `Greedy answer: ${tallyCoins(model.greedy.steps.map((s) => s.coin))}, ` +
      `which is ${model.greedyCount} coin${model.greedyCount === 1 ? '' : 's'}.`,
      `Exact optimum: ${tallyCoins(model.optimal.coins)}, ` +
      `which is ${model.optimal.count} coin${model.optimal.count === 1 ? '' : 's'}.`
    ];

    lines.push(
      model.matches
        ? 'Verdict: greedy matched the optimum for this amount. That is not a proof — try another amount.'
        : `Verdict: greedy lost. It used ${model.extra} more coin${model.extra === 1 ? '' : 's'} than necessary, ` +
          'because its first choice was locally best and permanently wrong.'
    );

    return lines;
  }
});

/* ==========================================================================
   4. Demo 2 — the survey
   ========================================================================== */

createDemo('#demo-greedy-gap-mount', {
  id: 'demo-greedy-gap',
  title: 'Greedy gap survey',
  description:
    'Runs greedy and the exact optimum on every amount from 1 up to the limit, and lists every ' +
    'amount where they disagree. A single counterexample is a curiosity; a pattern is a property ' +
    'of the denomination system.',
  headingLevel: 4,

  controls: [
    {
      type: 'select',
      name: 'system',
      label: 'Denomination system',
      value: 'nonickel',
      options: Object.entries(SYSTEMS).map(([value, s]) => ({ value, label: s.label }))
    },
    {
      type: 'range',
      name: 'limit',
      label: 'Survey amounts from 1 cent up to',
      min: 10,
      max: 120,
      step: 5,
      value: 60,
      valueText: (v) => `${v} cents`
    },
    {
      type: 'checkbox',
      name: 'onlyGaps',
      label: 'List only the amounts where greedy loses',
      value: true,
      help: 'Untick to see every amount, including the ones where greedy is already optimal.'
    }
  ],

  compute(values) {
    const system = SYSTEMS[values.system] || SYSTEMS.nonickel;
    const limit = Math.max(10, Math.round(values.limit));
    const optimal = optimalChange(limit, system.coins);

    const rows = [];
    let worst = null;
    let gapCount = 0;

    for (let amount = 1; amount <= limit; amount += 1) {
      const greedy = greedyTrace(amount, system.coins);
      if (!greedy.solved) continue;
      const best = optimal.table[amount];
      const extra = greedy.steps.length - best;
      if (extra > 0) {
        gapCount += 1;
        if (!worst || extra > worst.extra) worst = { amount, greedy: greedy.steps.length, best, extra };
      }
      rows.push({ amount, greedy: greedy.steps.length, best, extra });
    }

    const shown = values.onlyGaps ? rows.filter((r) => r.extra > 0) : rows;

    return {
      system, limit, rows, shown, gapCount, worst,
      onlyGaps: Boolean(values.onlyGaps),
      maxExtra: rows.reduce((best, r) => Math.max(best, r.extra), 0)
    };
  },

  figure(model) {
    const W = 660;
    const H = 300;
    const left = 52;
    const right = 20;
    const top = 20;
    const bottom = 52;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`, width: '100%',
      style: 'max-inline-size:100%;block-size:auto'
    });

    const maxExtra = Math.max(1, model.maxExtra);
    const px = (a) => left + ((a - 1) / Math.max(1, model.limit - 1)) * (W - left - right);
    const py = (v) => (H - bottom) - (v / maxExtra) * (H - bottom - top);

    for (let v = 0; v <= maxExtra; v += 1) {
      svg.appendChild(svgEl('line', { x1: left, y1: py(v), x2: W - right, y2: py(v), style: GRID_STYLE }));
      svg.appendChild(svgEl('text', { x: left - 8, y: py(v) + 4, 'text-anchor': 'end', style: TICK_STYLE, text: String(v) }));
    }

    const barWidth = Math.max(2, (W - left - right) / model.limit - 1);
    model.rows.forEach((row) => {
      if (row.extra <= 0) return;
      svg.appendChild(svgEl('rect', {
        x: px(row.amount) - barWidth / 2,
        y: py(row.extra),
        width: barWidth,
        height: (H - bottom) - py(row.extra),
        style: 'fill:var(--fsu-series-1);stroke:var(--fsu-series-1)'
      }));
    });

    svg.appendChild(svgEl('line', { x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, style: AXIS_STYLE }));
    svg.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: H - bottom, style: AXIS_STYLE }));

    const stride = model.limit <= 60 ? 10 : 20;
    for (let a = 0; a <= model.limit; a += stride) {
      if (a === 0) continue;
      svg.appendChild(svgEl('text', { x: px(a), y: H - bottom + 20, 'text-anchor': 'middle', style: TICK_STYLE, text: String(a) }));
    }

    svg.appendChild(svgEl('text', {
      x: left + (W - left - right) / 2, y: H - 12, 'text-anchor': 'middle',
      style: TICK_STYLE, text: 'Amount in cents'
    }));
    svg.appendChild(svgEl('text', {
      x: 14, y: top + (H - bottom - top) / 2, 'text-anchor': 'middle',
      transform: `rotate(-90 14 ${top + (H - bottom - top) / 2})`,
      style: TICK_STYLE, text: 'Extra coins greedy used'
    }));

    if (model.gapCount === 0) {
      svg.appendChild(svgEl('text', {
        x: left + (W - left - right) / 2, y: top + (H - bottom - top) / 2,
        'text-anchor': 'middle', style: LABEL_STYLE,
        text: 'No bars: greedy is optimal at every amount in this range.'
      }));
    }

    return svg;
  },

  figureAlt(model) {
    if (model.gapCount === 0) {
      return `A bar chart of extra coins against amount, from 1 to ${model.limit} cents, with no bars at all: ` +
        `greedy matches the exact optimum at every amount for the system ${model.system.coins.join('c, ')}c.`;
    }
    return `A bar chart of extra coins against amount, from 1 to ${model.limit} cents. ` +
      `${model.gapCount} amounts have a bar, meaning greedy used more coins than necessary there. ` +
      `The tallest bar is at ${model.worst.amount} cents, where greedy used ${model.worst.greedy} coins ` +
      `against an optimum of ${model.worst.best} — ${model.worst.extra} extra. ` +
      'The bars come in runs, not at isolated amounts.';
  },

  table(model) {
    return {
      caption: model.onlyGaps
        ? `The ${model.shown.length} amounts between 1c and ${model.limit}c where greedy is not optimal, ` +
          `with denominations ${model.system.coins.join('c, ')}c`
        : `Every amount from 1c to ${model.limit}c with denominations ${model.system.coins.join('c, ')}c`,
      rowHeader: true,
      columns: [
        { label: 'Amount', unit: 'c', numeric: true },
        { label: 'Greedy coins', numeric: true },
        { label: 'Optimal coins', numeric: true },
        { label: 'Extra coins', numeric: true },
        { label: 'Verdict' }
      ],
      rows: model.shown.length === 0
        ? [['—', '—', '—', '—', 'Greedy is optimal at every amount in this range']]
        : model.shown.map((row) => ({
          cells: [row.amount, row.greedy, row.best, row.extra, row.extra > 0 ? 'greedy loses' : 'greedy matches'],
          current: model.worst ? row.amount === model.worst.amount : false
        }))
    };
  },

  summary(model) {
    if (model.gapCount === 0) {
      return [
        `Denominations ${model.system.coins.join('c, ')}c: greedy matches the exact optimum at all ` +
        `${model.rows.length} amounts from 1c to ${model.limit}c.`,
        'That is evidence, not proof. The systems where greedy always works are called canonical, and ' +
        'the United States system is one of them.'
      ];
    }

    const percent = (model.gapCount / model.rows.length) * 100;
    return [
      `Denominations ${model.system.coins.join('c, ')}c: greedy loses at ${model.gapCount} of the ` +
      `${model.rows.length} amounts up to ${model.limit}c — ${formatNumber(percent, 1)} per cent of them.`,
      `The worst case in this range is ${model.worst.amount}c, where greedy uses ${model.worst.greedy} coins ` +
      `against an optimum of ${model.worst.best}.`,
      'Switch the denomination system to the United States set and the failures disappear entirely: ' +
      'this is a property of the coins, not of the amounts.'
    ];
  }
});

})(window);
