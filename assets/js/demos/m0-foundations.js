/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   m0-foundations.js — the interactive demos on m0-foundations.html
   ==========================================================================

   ISC 4221C (2026) accessible dashboard. Vanilla ES module, no dependencies,
   no network access, no build step. Loaded with <script type="module">.

   FIVE DEMOS, one per topic that COURSE_TOPIC_MAP.md marks as having no
   interactive coverage today:

     demo-git-local-remote   0.2  clone / commit / push, local vs remote
     demo-github-flow        0.3  the GitHub flow end to end
     demo-recursion-myrec    0.8  the Lab 02 `myrec` call stack
     demo-numpy-add2and3     0.10 the Lab 02 `add2and3` row/column slice
     demo-matplotlib-charts  0.11 the same numbers as a line plot and a bar plot

   NO PRECOMPUTED TRACES ARE USED. `Dashboard/assets/data/` does not exist
   yet, so every trace on this page is computed in the browser instead —
   deterministically, from the control values alone, with `seededRandom()`
   for the one demo that samples anything. Nothing here reads the clock,
   calls `Math.random()`, or touches the DOM inside `compute()`.

   COLOUR: every colour is a token from fsu-tokens.css, applied through an
   inline `style` so `var()` actually resolves. Presentation attributes such
   as `fill="var(--x)"` are NOT reliably resolved by browsers; `style="fill:
   var(--x)"` is. There is no hex value anywhere in this file.

   No meaning is ever carried by colour alone: every highlighted element in
   every figure also carries a word ("now", "×2", "A[1, :]"), a shape, or a
   dash pattern, and the same information is repeated in the data table and
   in the aria-live summary that demo.js renders for us.
   ========================================================================== */

const { createDemo, svgEl, seededRandom } = window.Demo;
/* ==========================================================================
   Shared drawing helpers
   ========================================================================== */

/** Turn a props object into an inline style string. */
function style(props) {
  return Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/* --------------------------------------------------------------------------
   THE FIGURE PALETTE, AND WHY IT IS NOT THE SERIES RAMP

   AUTHORING-CONTRACT.md §8 says chart series use --fsu-series-1 … -6 in order.
   That ramp is defined once, in :root, and is NOT re-declared for dark mode:
   --fsu-series-1 is FSU Garnet on both canvases. Garnet on Stadium Night is
   not a pairing color-palette.md measures, and it is far too dark to carry a
   thin line, a stroke, or a word on a dark background.

   So every mark that has to be *read* here uses a token that has a measured
   pairing on BOTH canvases:

     --fsu-color-heading  Garnet 9.21:1 on white   / FSU Gold 9.23:1 on Stadium Night
     --fsu-color-body     Slate 14.28:1 on white   / White 17.89:1 on Stadium Night
     --fsu-color-caption  Neutral +2S 7.44:1       / White 17.89:1
     --fsu-chart-axis     = --fsu-border-strong, 7.44:1 / 9.23:1

   --fsu-series-1 survives only as the FILL of a large shape that is also
   outlined in --fsu-color-heading, so the shape's boundary — the thing 1.4.11
   is about — is legible either way. This is flagged for the maintainers: the
   series ramp needs measured dark-mode values in color-palette.md.

   Two emphasis levels are needed in several figures, and they are never told
   apart by colour: EMPH is always solid, EMPH2 is always dashed, and both
   carry a text label.
   -------------------------------------------------------------------------- */

const INK = 'var(--fsu-color-body)';
const MUTED = 'var(--fsu-color-caption)';
const RULE = 'var(--fsu-chart-axis)';
/* Decorative chart gridlines ONLY. This token is below 3:1 on both canvases —
   fsu-tokens.css says so explicitly ("decorative only — no ratio claimed") —
   so nothing whose absence would change the reading may use it. Every value a
   gridline hints at is also printed as an axis tick and listed in the table. */
const GRID = 'var(--fsu-chart-gridline)';
const EMPH = 'var(--fsu-color-heading)';    /* primary emphasis — always solid */
const EMPH2 = 'var(--fsu-color-body)';      /* secondary emphasis — always dashed */
const FILL1 = 'var(--fsu-series-1)';        /* large filled areas, always outlined in EMPH */
const SURFACE = 'var(--fsu-surface)';

/** A text node with token-only styling. */
function text(x, y, content, opts = {}) {
  return svgEl('text', {
    x,
    y,
    'text-anchor': opts.anchor || 'start',
    style: style({
      'font-family': 'var(--fsu-font-sans)',
      'font-size': opts.size || 'var(--fsu-text-small)',
      'font-weight': opts.weight || 'var(--fsu-weight-regular)',
      fill: opts.fill || INK
    }),
    text: content
  });
}

function rect(x, y, w, h, opts = {}) {
  return svgEl('rect', {
    x, y, width: w, height: h,
    rx: opts.rx === undefined ? 4 : opts.rx,
    style: style({
      fill: opts.fill || 'none',
      stroke: opts.stroke || RULE,
      'stroke-width': opts.width || 1.5,
      'stroke-dasharray': opts.dash || null
    })
  });
}

function line(x1, y1, x2, y2, opts = {}) {
  return svgEl('line', {
    x1, y1, x2, y2,
    style: style({
      stroke: opts.stroke || RULE,
      'stroke-width': opts.width || 1.5,
      'stroke-dasharray': opts.dash || null,
      'stroke-linecap': 'round'
    })
  });
}

function circle(cx, cy, r, opts = {}) {
  return svgEl('circle', {
    cx, cy, r,
    style: style({
      fill: opts.fill || 'none',
      stroke: opts.stroke || RULE,
      'stroke-width': opts.width || 1.5,
      'stroke-dasharray': opts.dash || null
    })
  });
}

/** An arrow drawn as a line plus two short strokes — no marker defs, no ids. */
function arrow(x1, y1, x2, y2, opts = {}) {
  const g = svgEl('g');
  g.appendChild(line(x1, y1, x2, y2, opts));
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 9;
  [angle + 2.6, angle - 2.6].forEach((a) => {
    g.appendChild(line(x2, y2, x2 + len * Math.cos(a), y2 + len * Math.sin(a), opts));
  });
  return g;
}

/** The word "now", used everywhere so the current element is never colour-only. */
function nowTag(x, y, anchor) {
  return text(x, y, 'now', { anchor: anchor || 'start', weight: 'var(--fsu-weight-bold)', fill: EMPH });
}

/* No xmlns attribute: svgEl() builds the node with createElementNS, so the
   namespace is already correct. Writing it out by hand would put the only
   "http://" string in this file for an offline audit to trip over. */
function svgRoot(w, h) {
  return svgEl('svg', {
    viewBox: `0 0 ${w} ${h}`,
    style: style({ 'max-width': '100%' })
  });
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/* ==========================================================================
   0.2 — Clone, commit, push: what lives where
   ==========================================================================
   Lab 01: "Committing and pushing are how you can add the changes you made on
   your local machine to the remote repository in GitHub." The thing students
   get wrong is that a commit is purely local. This demo makes the gap between
   the two repositories visible, and counts it in words.
   ========================================================================== */

const REMOTE_START = 2;

const EDITS = [
  { file: 'README.md',        message: 'Added a README with information about our project' },
  { file: 'answers_module.py', message: 'Answered question 1: the myrec function' },
  { file: 'report.md',         message: 'Explained why myrec is correct' },
  { file: 'test_folder/f1.txt', message: 'Added the folder question 2 reads' }
];

function gitLocalRemoteModel(values) {
  const commits = Math.max(1, Math.min(4, Math.round(Number(values.commits) || 1)));
  const push = Boolean(values.push);

  const steps = [];
  let local = REMOTE_START;
  let remote = REMOTE_START;
  let dirty = 0;

  const record = (step) => {
    steps.push({ ...step, local, remote, dirty, ahead: local - remote });
  };

  record({
    action: 'Clone the repository',
    // Deliberately not the full URL: this string is read aloud in the live
    // region on every visit to step 1, and the exact command is already in
    // the code block in topic 0.1 immediately above this demo.
    command: 'git clone (the dashboards repository)',
    where: 'Your computer',
    focus: 'clone',
    delta: `The clone pulls down every version of every file GitHub holds — ${REMOTE_START} commits — ` +
           'so the two repositories start out identical.'
  });

  for (let i = 0; i < commits; i += 1) {
    const edit = EDITS[i % EDITS.length];

    dirty = 1;
    record({
      action: `Edit ${edit.file}`,
      command: `# open ${edit.file} in your editor and change it`,
      where: 'Your computer',
      focus: 'worktree',
      delta: `${edit.file} now has an uncommitted change. No commit exists yet, so nothing is saved anywhere ` +
             'that git can get back for you.'
    });

    dirty = 0;
    local += 1;
    record({
      action: `Commit ${i + 1} of ${commits}`,
      command: `git add ${edit.file}\ngit commit -m "${edit.message}"`,
      where: 'Your computer',
      focus: 'commit',
      delta: `The commit is a checkpoint in your local repository only. Local is now ${plural(local, 'commit', 'commits')}, ` +
             `GitHub is still on ${remote}, so you are ${plural(local - remote, 'commit', 'commits')} ahead.`
    });
  }

  if (push) {
    remote = local;
    record({
      action: 'Push to GitHub',
      command: 'git push',
      where: 'Your computer → GitHub',
      focus: 'push',
      delta: `The push copies the ${plural(local - REMOTE_START, 'new commit', 'new commits')} to GitHub. ` +
             'Both repositories hold the same history again, and your work is now somewhere other than your laptop.'
    });
  } else {
    record({
      action: 'Stop without pushing',
      command: '# no git push',
      where: 'Your computer',
      focus: 'gap',
      delta: `Nothing was pushed. GitHub still shows ${plural(remote, 'commit', 'commits')}; your ` +
             `${plural(local - remote, 'commit', 'commits')} exist only on this machine, and only on this machine.`
    });
  }

  return { steps, commits, push };
}

function gitLocalRemoteFigure(model, ctx) {
  const s = model.steps[ctx.step];
  const W = 720;
  const H = 260;
  const svg = svgRoot(W, H);

  // Two repositories.
  const boxes = [
    { x: 24,  label: 'Your computer', sub: 'local repository', count: s.local, focus: ['commit', 'worktree', 'clone'] },
    { x: 424, label: 'GitHub', sub: 'remote repository', count: s.remote, focus: ['push'] }
  ];

  boxes.forEach((b) => {
    const active = b.focus.includes(s.focus);
    svg.appendChild(rect(b.x, 28, 272, 108, {
      fill: SURFACE,
      stroke: active ? EMPH : RULE,
      width: active ? 3 : 1.5
    }));
    svg.appendChild(text(b.x + 14, 52, b.label, { weight: 'var(--fsu-weight-bold)' }));
    svg.appendChild(text(b.x + 14, 72, b.sub, { fill: MUTED }));
    svg.appendChild(text(b.x + 14, 124, `${plural(b.count, 'commit', 'commits')}`, { fill: MUTED }));

    // Commit history, drawn as a chain of labelled dots.
    for (let i = 0; i < b.count; i += 1) {
      const cx = b.x + 22 + i * 30;
      if (i > 0) svg.appendChild(line(cx - 30, 96, cx, 96, { stroke: RULE }));
      // Commits made since the clone get a thick solid ring; commits that came
      // down with the clone get a thin one. Never a colour difference alone.
      const isNew = i >= REMOTE_START;
      svg.appendChild(circle(cx, 96, 9, {
        fill: SURFACE,
        stroke: isNew ? EMPH : RULE,
        width: isNew ? 3 : 1.5
      }));
      svg.appendChild(text(cx, 100, String(i + 1), { anchor: 'middle', fill: INK }));
    }
  });

  // clone / pull arrow, remote -> local
  const cloneActive = s.focus === 'clone';
  svg.appendChild(arrow(420, 168, 300, 168, { stroke: cloneActive ? EMPH : RULE, width: cloneActive ? 3 : 1.5 }));
  svg.appendChild(text(360, 160, 'git clone', { anchor: 'middle', fill: cloneActive ? EMPH : MUTED }));
  if (cloneActive) svg.appendChild(nowTag(360, 186, 'middle'));

  // push arrow, local -> remote
  const pushActive = s.focus === 'push';
  svg.appendChild(arrow(300, 212, 420, 212, { stroke: pushActive ? EMPH : RULE, width: pushActive ? 3 : 1.5 }));
  svg.appendChild(text(360, 204, 'git push', { anchor: 'middle', fill: pushActive ? EMPH : MUTED }));
  if (pushActive) svg.appendChild(nowTag(360, 232, 'middle'));

  // The working tree: uncommitted edits sit outside the repository.
  const dirtyActive = s.focus === 'worktree';
  svg.appendChild(rect(24, 168, 240, 60, {
    fill: SURFACE,
    stroke: dirtyActive ? EMPH : RULE,
    width: dirtyActive ? 3 : 1.5,
    dash: '6 4'
  }));
  svg.appendChild(text(38, 190, 'Working tree (not committed)', { fill: MUTED }));
  svg.appendChild(text(38, 212, s.dirty === 1 ? '1 changed file' : 'no changes', {
    weight: 'var(--fsu-weight-bold)'
  }));
  if (dirtyActive) svg.appendChild(nowTag(254, 190, 'end'));
  if (s.focus === 'commit') svg.appendChild(nowTag(148, 148, 'middle'));
  if (s.focus === 'gap') svg.appendChild(text(360, 212, 'no push', { anchor: 'middle', weight: 'var(--fsu-weight-bold)', fill: EMPH }));

  return svg;
}

createDemo('#demo-git-local-remote-mount', {
  id: 'demo-git-local-remote',
  title: 'Clone, commit, push — what lives where',
  description:
    'A commit is a checkpoint in the repository on your own machine. Nothing reaches GitHub until you push. ' +
    'Step through and watch the two repositories drift apart, then come back together.',
  headingLevel: 4,
  caption: 'Local and remote repositories. A thick ring marks a commit you made; a thin ring marks one that came down with the clone.',

  controls: [
    {
      type: 'range', name: 'commits', label: 'Commits made before pushing',
      min: 1, max: 4, step: 1, value: 3, unit: 'commits',
      valueText: (v) => plural(Number(v), 'commit', 'commits'),
      help: 'Each commit is preceded by an edit, so the trace gains two steps per commit.'
    },
    {
      type: 'checkbox', name: 'push', label: 'Finish with git push', value: true,
      help: 'Clear this to see what the remote repository looks like when you forget.'
    }
  ],

  compute: gitLocalRemoteModel,

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => `${model.steps[i].action}. ${model.steps[i].delta}`
  },

  figure: gitLocalRemoteFigure,

  figureAlt(model, ctx) {
    const s = model.steps[ctx.step];
    const gap = s.ahead === 0
      ? 'the two repositories hold the same history'
      : `local is ${plural(s.ahead, 'commit', 'commits')} ahead of GitHub`;
    return `Step ${ctx.step + 1} of ${model.steps.length}, ${s.action}: local holds ${plural(s.local, 'commit', 'commits')}, ` +
           `GitHub holds ${plural(s.remote, 'commit', 'commits')}, ${s.dirty === 1 ? 'one file is edited but not committed' : 'the working tree is clean'}, and ${gap}.`;
  },

  table(model, ctx) {
    return {
      caption: `Clone, commit, push — the trace up to step ${ctx.step + 1} of ${model.steps.length}`,
      rowHeader: true,
      columns: [
        { label: 'Step', numeric: true },
        { label: 'Action' },
        { label: 'Runs on' },
        { label: 'Local commits', numeric: true },
        { label: 'GitHub commits', numeric: true },
        { label: 'Uncommitted files', numeric: true },
        { label: 'Local ahead by', numeric: true }
      ],
      rows: model.steps.map((s, i) => ({
        cells: [i + 1, s.action, s.where, s.local, s.remote, s.dirty, s.ahead],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const s = model.steps[ctx.step];
    const lines = [
      `Command for this step: ${s.command.replace(/\n/g, ', then ')}`,
      s.ahead === 0
        ? 'Local and GitHub agree: every commit you have made is also on the server.'
        : `Local is ${plural(s.ahead, 'commit', 'commits')} ahead of GitHub. Those commits exist on one computer only.`
    ];
    if (s.dirty === 1) {
      lines.push('There is an edit that has not been committed. git has no record of it yet, so it cannot give it back to you.');
    }
    return lines;
  }
});

/* ==========================================================================
   0.3 — The GitHub flow
   ==========================================================================
   Lab 01: "a lightweight workflow that allows you to experiment and
   collaborate on your projects easily, without the risk of losing your
   previous work."
   ========================================================================== */

function githubFlowModel(values) {
  const reviews = Math.max(0, Math.min(3, Math.round(Number(values.reviews) || 0)));
  const remove = Boolean(values.removeBranch);

  const steps = [];
  let main = 5;
  let branch = null;      // commits made ON the branch since it was cut
  let pr = 'none';

  const record = (step) => steps.push({ ...step, main, branch, pr });

  record({
    action: 'Start on main',
    where: 'GitHub',
    focus: 'main',
    delta: 'main is the default branch. Everything on it is meant to be working code, which is exactly why you do not experiment on it.'
  });

  branch = 0;
  record({
    action: 'Create a branch',
    where: 'Your computer',
    focus: 'branch',
    delta: 'The branch add-readme is cut from main. It starts as an exact copy, so nothing you do on it can affect main.'
  });

  branch = 1;
  record({
    action: 'Commit on the branch',
    where: 'Your computer',
    focus: 'branch-commit',
    delta: 'One commit lands on add-readme. main is untouched and still deployable.'
  });

  pr = 'open';
  record({
    action: 'Open a pull request',
    where: 'GitHub',
    focus: 'pr',
    delta: 'The pull request tells other people about the change and asks for their feedback. It is a conversation attached to a diff, not a merge.'
  });

  for (let i = 0; i < reviews; i += 1) {
    branch += 1;
    record({
      action: `Review round ${i + 1} of ${reviews}`,
      where: 'GitHub, then your computer',
      focus: 'review',
      delta: `A reviewer comments and you push a fix. The pull request updates itself, so the branch is now ${plural(branch, 'commit', 'commits')} ahead of main.`
    });
  }

  pr = 'merged';
  main += branch;
  record({
    action: 'Merge the pull request',
    where: 'GitHub',
    focus: 'merge',
    delta: `main absorbs all ${plural(branch, 'commit', 'commits')} at once and moves from ${main - branch} to ${main} commits.`
  });

  if (remove) {
    record({
      action: 'Delete the branch',
      where: 'GitHub',
      focus: 'delete',
      delta: 'The branch is deleted. Its commits are safe inside main, and the branch list stops filling up with finished work.'
    });
  }

  return { steps, reviews, remove };
}

function githubFlowFigure(model, ctx) {
  const s = model.steps[ctx.step];
  const W = 760;
  const H = 250;
  const svg = svgRoot(W, H);

  const mainY = 190;
  const branchY = 70;
  const deleted = s.focus === 'delete';

  // main line — solid, labelled.
  svg.appendChild(line(40, mainY, 720, mainY, { stroke: EMPH, width: 3 }));
  svg.appendChild(text(40, mainY + 30, 'main — solid line, the default branch', { fill: INK }));

  // branch line — dashed, labelled. Colour is never the only difference.
  if (!deleted) {
    svg.appendChild(line(220, branchY, 560, branchY, { stroke: EMPH2, width: 3, dash: '10 6' }));
    svg.appendChild(text(220, branchY - 24, 'add-readme — dashed line, your branch', { fill: INK }));
    svg.appendChild(line(180, mainY, 220, branchY, { stroke: EMPH2, width: 2, dash: '10 6' }));
    svg.appendChild(line(560, branchY, 620, mainY, { stroke: EMPH2, width: 2, dash: '10 6' }));
  } else {
    svg.appendChild(text(220, branchY, 'add-readme — deleted, its commits now live in main', { fill: MUTED }));
  }

  // Commits on main.
  const mainDots = Math.min(s.main, 9);
  for (let i = 0; i < mainDots; i += 1) {
    const cx = 60 + i * 26;
    svg.appendChild(circle(cx, mainY, 8, { fill: FILL1, stroke: EMPH, width: 2 }));
  }
  svg.appendChild(text(40, mainY - 18, `${plural(s.main, 'commit', 'commits')} on main`, { fill: MUTED }));

  // Commits on the branch.
  if (!deleted && s.branch !== null) {
    for (let i = 0; i < s.branch; i += 1) {
      const cx = 250 + i * 30;
      svg.appendChild(circle(cx, branchY, 8, { fill: SURFACE, stroke: EMPH2, width: 3, dash: '3 2' }));
      svg.appendChild(text(cx, branchY + 4, String(i + 1), { anchor: 'middle' }));
    }
    svg.appendChild(text(560, branchY + 26,
      s.branch === 0 ? 'no commits yet' : `${plural(s.branch, 'commit', 'commits')} ahead of main`,
      { anchor: 'end', fill: MUTED }));
  }

  // Pull request marker.
  if (s.pr !== 'none') {
    const label = s.pr === 'open' ? 'pull request: open' : 'pull request: merged';
    svg.appendChild(rect(300, 108, 200, 34, { fill: SURFACE, stroke: RULE, width: 2 }));
    svg.appendChild(text(400, 130, label, { anchor: 'middle', weight: 'var(--fsu-weight-bold)' }));
  }

  // "now" marker, positioned on whatever this step touches.
  const marks = {
    main: [90, mainY - 34],
    branch: [200, branchY + 34],
    'branch-commit': [250, branchY + 46],
    pr: [520, 130],
    review: [520, 130],
    merge: [640, mainY - 34],
    delete: [640, mainY - 34]
  };
  const at = marks[s.focus] || [90, mainY - 34];
  svg.appendChild(nowTag(at[0], at[1], 'middle'));

  return svg;
}

createDemo('#demo-github-flow-mount', {
  id: 'demo-github-flow',
  title: 'The GitHub flow, step by step',
  description:
    'Branch, commit, open a pull request, review, merge, delete the branch. Change how many review rounds ' +
    'the pull request goes through and watch where the commits actually sit.',
  headingLevel: 4,
  caption: 'main is drawn as a solid line, the branch as a dashed line one level above it.',

  controls: [
    {
      type: 'select', name: 'reviews', label: 'Review rounds before merging',
      options: [
        { value: '0', label: 'None — merged as opened' },
        { value: '1', label: 'One round' },
        { value: '2', label: 'Two rounds' },
        { value: '3', label: 'Three rounds' }
      ],
      value: '1',
      help: 'Each round is a reviewer comment plus a fix commit pushed to the same branch.'
    },
    {
      type: 'checkbox', name: 'removeBranch', label: 'Delete the branch after merging', value: true
    }
  ],

  compute: githubFlowModel,

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => `${model.steps[i].action}. ${model.steps[i].delta}`
  },

  figure: githubFlowFigure,

  figureAlt(model, ctx) {
    const s = model.steps[ctx.step];
    const branchText = s.branch === null
      ? 'no branch exists yet'
      : (s.focus === 'delete' ? 'the branch has been deleted' : `the branch holds ${plural(s.branch, 'commit', 'commits')} that main does not`);
    const prText = s.pr === 'none' ? 'no pull request is open' : `the pull request is ${s.pr}`;
    return `Step ${ctx.step + 1} of ${model.steps.length}, ${s.action}: main holds ${plural(s.main, 'commit', 'commits')}, ` +
           `${branchText}, and ${prText}.`;
  },

  table(model, ctx) {
    return {
      caption: `The GitHub flow with ${model.reviews === 0 ? 'no review rounds' : plural(model.reviews, 'review round', 'review rounds')} — step ${ctx.step + 1} of ${model.steps.length}`,
      rowHeader: true,
      columns: [
        { label: 'Step', numeric: true },
        { label: 'What happens' },
        { label: 'Where' },
        { label: 'Commits on main', numeric: true },
        { label: 'Commits on the branch', numeric: true },
        { label: 'Pull request' }
      ],
      rows: model.steps.map((s, i) => ({
        cells: [
          i + 1,
          s.action,
          s.where,
          s.main,
          s.branch === null ? 'no branch' : s.branch,
          s.pr === 'none' ? 'not opened' : s.pr
        ],
        current: i === ctx.step
      }))
    };
  },

  summary(model, ctx) {
    const s = model.steps[ctx.step];
    const lines = [];
    if (s.pr === 'open') {
      lines.push('While the pull request is open, main is unchanged. Anyone can still clone main and get working code.');
    }
    if (s.focus === 'merge') {
      lines.push('Merging is the only step in the whole flow that changes main.');
    }
    lines.push(model.remove
      ? 'This run finishes by deleting the branch. Deleting a merged branch never loses a commit.'
      : 'This run keeps the branch after merging, so it will stay in the branch list until somebody removes it.');
    return lines;
  }
});

/* ==========================================================================
   0.8 — Recursion: the Lab 02 `myrec` call stack
   ==========================================================================
   Lab 02 Q1: f(x) = 2x − f(x−1) for x > 0, f(0) = 0, and an exception for
   x < 0. The tests only ever assert even inputs (myrec(6) == 6,
   myrec(532) == 532), which invites the wrong reading f(x) = x. The closed
   form is f(x) = 2·ceil(x/2): equal to x when x is even, x + 1 when x is odd.
   The demo exists mainly to make that visible.
   ========================================================================== */

/** f(x) = 2*ceil(x/2), computed the long way so the trace matches the code. */
function myrecValues(x) {
  const values = [0];
  for (let k = 1; k <= x; k += 1) values[k] = 2 * k - values[k - 1];
  return values;
}

function myrecModel(values) {
  const x = Math.max(-1, Math.min(10, Math.round(Number(values.x))));

  if (x < 0) {
    return {
      x,
      raised: true,
      frames: [{ k: x, value: null, note: 'raise Exception("Input must be non-negative")', status: 'raises' }],
      steps: [{
        phase: 'raise',
        k: x,
        delta: `myrec(${x}) never recurses. The guard "if x < 0: raise" fires on the first line, ` +
               'so the function ends with an exception instead of a number.'
      }]
    };
  }

  const f = myrecValues(x);
  const frames = [];
  for (let k = x; k >= 0; k -= 1) {
    frames.push({ k, value: f[k], status: 'not called' });
  }

  const steps = [];
  // Descent: x, x-1, ..., 0
  for (let i = 0; i <= x; i += 1) {
    const k = x - i;
    steps.push({
      phase: 'call',
      k,
      depth: i,
      delta: k === 0
        ? `myrec(0) is the base case: it returns 0 without calling anything. The stack is ${plural(x + 1, 'frame', 'frames')} deep, which is as deep as it gets.`
        : `myrec(${k}) cannot finish yet — it needs myrec(${k - 1}) first, so it calls down and waits. Nothing has been computed.`
    });
  }
  // Unwind: 0, 1, ..., x
  for (let k = 0; k <= x; k += 1) {
    steps.push({
      phase: 'return',
      k,
      delta: k === 0
        ? 'myrec(0) hands 0 back to myrec(1). The stack starts unwinding.'
        : `myrec(${k}) returns 2 × ${k} − ${f[k - 1]} = ${f[k]}.`
    });
  }

  return { x, raised: false, f, frames, steps };
}

function myrecFrameState(model, stepIndex) {
  // Returns, for each frame (ordered x down to 0), its status at this step.
  if (model.raised) return model.frames.map((fr) => ({ ...fr, current: true }));

  const x = model.x;
  const isCallPhase = stepIndex <= x;
  const step = model.steps[stepIndex];

  return model.frames.map((fr) => {
    const k = fr.k;
    let status;
    if (isCallPhase) {
      const deepest = x - stepIndex;   // the frame currently being entered
      if (k > deepest) status = 'waiting';
      else if (k === deepest) status = (k === 0 ? 'base case' : 'called');
      else status = 'not called';
    } else {
      const returnedUpTo = step.k;     // frames 0..returnedUpTo have returned
      if (k <= returnedUpTo) status = 'returned';
      else status = 'waiting';
    }
    return {
      k,
      value: status === 'returned' || (status === 'base case') ? fr.value : null,
      status,
      current: k === step.k
    };
  });
}

function myrecFigure(model, ctx) {
  const frames = myrecFrameState(model, ctx.step);
  const rowH = 30;
  const W = 560;
  const H = frames.length * rowH + 56;
  const svg = svgRoot(W, H);

  svg.appendChild(text(12, 22, 'Call stack, deepest call at the bottom', { fill: MUTED }));

  frames.forEach((fr, i) => {
    const y = 36 + i * rowH;
    const indent = 12 + i * 16;
    const w = Math.max(150, 300 - i * 10);
    svg.appendChild(rect(indent, y, w, rowH - 6, {
      fill: SURFACE,
      stroke: fr.current ? EMPH : RULE,
      width: fr.current ? 3 : 1.5,
      dash: fr.status === 'not called' ? '4 4' : null
    }));
    svg.appendChild(text(indent + 10, y + 16, `myrec(${fr.k})`, {
      weight: fr.current ? 'var(--fsu-weight-bold)' : 'var(--fsu-weight-regular)'
    }));
    const right = indent + w + 10;
    const label = fr.status === 'returned' || fr.status === 'base case'
      ? `returns ${fr.value}`
      : fr.status;
    svg.appendChild(text(right, y + 16, label, { fill: MUTED }));
    if (fr.current) svg.appendChild(nowTag(right + 96, y + 16, 'start'));
  });

  return svg;
}

createDemo('#demo-recursion-myrec-mount', {
  id: 'demo-recursion-myrec',
  title: 'Recursion trace — the Lab 02 myrec function',
  description:
    'myrec calls itself all the way down to the base case before a single number comes back. ' +
    'Step through the descent and the unwind, and try an odd input.',
  headingLevel: 4,
  caption: 'One box per stack frame. Frames not yet entered are drawn with a dashed border.',

  controls: [
    {
      type: 'range', name: 'x', label: 'Input x',
      min: -1, max: 10, step: 1, value: 6,
      valueText: (v) => (Number(v) < 0 ? `${v} — the guard raises an exception` : String(v)),
      help: 'Set x to −1 to see the guard clause fire. Odd values are where the interesting answer lives.'
    }
  ],

  compute: myrecModel,

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => model.steps[i].delta
  },

  figure: myrecFigure,

  figureAlt(model, ctx) {
    if (model.raised) {
      return `myrec(${model.x}) raises an exception before recursing: the guard clause rejects negative input, so no stack frames are created.`;
    }
    const step = model.steps[ctx.step];
    const frames = myrecFrameState(model, ctx.step);
    const entered = frames.filter((fr) => fr.status !== 'not called').length;
    const returned = frames.filter((fr) => fr.status === 'returned').length;
    if (step.phase === 'call') {
      return `Step ${ctx.step + 1}: the stack grows to ${plural(entered, 'frame', 'frames')}, with myrec(${step.k}) at the bottom and nothing returned yet.`;
    }
    return `Step ${ctx.step + 1}: myrec(${step.k}) returns ${model.f[step.k]}, so ${plural(returned, 'frame has', 'frames have')} now returned and ${frames.length - returned} still waiting.`;
  },

  table(model, ctx) {
    if (model.raised) {
      return {
        caption: `myrec(${model.x}) — the guard clause, not a recursion`,
        rowHeader: true,
        columns: [{ label: 'Call' }, { label: 'x', numeric: true }, { label: 'Result' }, { label: 'Why' }],
        rows: [{
          cells: [`myrec(${model.x})`, model.x, 'raises Exception', 'x is negative, so the first if in the function body raises'],
          current: true
        }]
      };
    }

    const frames = myrecFrameState(model, ctx.step);
    return {
      caption: `myrec(${model.x}) call stack after step ${ctx.step + 1} of ${model.steps.length}`,
      rowHeader: true,
      columns: [
        { label: 'Frame' },
        { label: 'x', numeric: true },
        { label: 'Returns', numeric: true },
        { label: 'Computed as' },
        { label: 'Status' }
      ],
      rows: frames.map((fr) => ({
        cells: [
          `myrec(${fr.k})`,
          fr.k,
          fr.value === null ? 'not yet' : fr.value,
          fr.k === 0 ? 'base case, returns 0' : `2 × ${fr.k} − myrec(${fr.k - 1})`,
          fr.status
        ],
        current: fr.current
      }))
    };
  },

  summary(model, ctx) {
    if (model.raised) {
      return [
        'A guard clause is a check at the top of a function that rejects input the rest of the body cannot handle.',
        'The Lab 02 test asserts this with pytest.raises(Exception), and the autograder checks for exit code 1.'
      ];
    }
    const answer = model.f[model.x];
    const lines = [
      `myrec(${model.x}) returns ${answer}.`,
      model.x % 2 === 0
        ? `${model.x} is even, so the answer happens to equal x. That is a coincidence of even inputs, not the rule.`
        : `${model.x} is odd, so the answer is x + 1, not x. The closed form is f(x) = 2 × ceil(x / 2).`,
      `The recursion makes ${plural(model.x + 1, 'call', 'calls')} in total and reaches a stack depth of ${model.x + 1}.`
    ];
    if (ctx.step === model.steps.length - 1) {
      lines.push('The Lab 02 tests only assert even inputs — myrec(0), myrec(6), myrec(532) — which is why the odd-input behaviour is easy to miss.');
    }
    return lines;
  }
});

/* ==========================================================================
   0.10 — NumPy slicing: the Lab 02 `add2and3` function
   ==========================================================================
   return np.sum(matrix[1, :]) + np.sum(matrix[:, 2])
   The element at row 1, column 2 is in both slices and is therefore added
   twice. That is the whole point of the exercise, and it is invisible unless
   somebody says it out loud.
   ========================================================================== */

function add2and3Model(values) {
  const rows = Math.max(1, Math.min(6, Math.round(Number(values.rows) || 3)));
  const cols = Math.max(2, Math.min(7, Math.round(Number(values.cols) || 5)));
  const seed = Math.max(0, Math.round(Number(values.seed) || 0));

  const rand = seededRandom(seed);
  const matrix = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) row.push(Math.floor(rand() * 10));
    matrix.push(row);
  }

  const tooSmall = rows < 2 || cols < 3;

  if (tooSmall) {
    return {
      rows, cols, seed, matrix, tooSmall,
      steps: [{
        stage: 'guard',
        delta: `The shape is ${rows} by ${cols}. The guard "if matrix.shape[0] < 2 or matrix.shape[1] < 3" is true, ` +
               'so the function prints "Matrix too small." and returns 0 without touching a single element.'
      }]
    };
  }

  const rowSum = matrix[1].reduce((a, b) => a + b, 0);
  const colSum = matrix.reduce((a, r) => a + r[2], 0);
  const shared = matrix[1][2];

  return {
    rows, cols, seed, matrix, tooSmall,
    rowSum, colSum, shared, total: rowSum + colSum,
    steps: [
      {
        stage: 'row',
        delta: `np.sum(matrix[1, :]) takes the whole of row index 1 — the second row — which is ` +
               `${matrix[1].join(' + ')} = ${rowSum}.`
      },
      {
        stage: 'col',
        delta: `np.sum(matrix[:, 2]) takes the whole of column index 2 — the third column — which is ` +
               `${matrix.map((r) => r[2]).join(' + ')} = ${colSum}.`
      },
      {
        stage: 'total',
        delta: `The two sums are added: ${rowSum} + ${colSum} = ${rowSum + colSum}. The element at row 1, ` +
               `column 2 is ${shared}, and it is in both slices, so it is counted twice.`
      }
    ]
  };
}

function add2and3Figure(model, ctx) {
  const stage = model.steps[ctx.step].stage;
  const showRow = stage === 'row' || stage === 'total';
  const showCol = stage === 'col' || stage === 'total';

  const cw = 52;
  const ch = 38;
  const x0 = 76;
  const y0 = 60;
  const W = x0 + model.cols * cw + 130;
  const H = y0 + model.rows * ch + 40;
  const svg = svgRoot(W, H);

  // Column headers.
  for (let c = 0; c < model.cols; c += 1) {
    svg.appendChild(text(x0 + c * cw + cw / 2, y0 - 12, `col ${c}`, { anchor: 'middle', fill: MUTED }));
  }
  // Row headers and cells.
  for (let r = 0; r < model.rows; r += 1) {
    svg.appendChild(text(x0 - 12, y0 + r * ch + 24, `row ${r}`, { anchor: 'end', fill: MUTED }));
    for (let c = 0; c < model.cols; c += 1) {
      const x = x0 + c * cw;
      const y = y0 + r * ch;
      // --fsu-chart-axis, not --fsu-chart-gridline: these cell borders are how
      // you tell which number sits in which cell, so they are a graphical
      // object required to understand the content and need 3:1 (1.4.11).
      svg.appendChild(rect(x, y, cw - 4, ch - 4, { fill: SURFACE, stroke: RULE, width: 1, rx: 2 }));
      svg.appendChild(text(x + (cw - 4) / 2, y + 24, String(model.matrix[r][c]), { anchor: 'middle' }));
    }
  }

  if (model.tooSmall) {
    svg.appendChild(text(12, H - 12, 'Too small — the guard returns before any element is read.', {
      weight: 'var(--fsu-weight-bold)', fill: EMPH
    }));
    return svg;
  }

  // Row 1 outline — dashed, plus a text label.
  if (showRow) {
    svg.appendChild(rect(x0 - 6, y0 + ch - 6, model.cols * cw + 4, ch + 4, {
      stroke: EMPH, width: 3, dash: '8 5'
    }));
    svg.appendChild(text(x0 + model.cols * cw + 12, y0 + ch + 18, `A[1, :] = ${model.rowSum}  (dashed)`, {
      weight: 'var(--fsu-weight-bold)', fill: EMPH
    }));
  }
  // Column 2 outline — solid, plus a text label.
  if (showCol) {
    svg.appendChild(rect(x0 + 2 * cw - 6, y0 - 6, cw + 4, model.rows * ch + 4, {
      stroke: EMPH2, width: 3
    }));
    svg.appendChild(text(x0 + 2 * cw + cw / 2 - 2, y0 - 30, `A[:, 2] = ${model.colSum}  (solid)`, {
      anchor: 'middle', weight: 'var(--fsu-weight-bold)', fill: EMPH2
    }));
  }
  // The shared element.
  if (showRow && showCol) {
    svg.appendChild(text(x0 + 3 * cw - 10, y0 + ch + 13, '×2', {
      anchor: 'end', weight: 'var(--fsu-weight-bold)', fill: EMPH
    }));
    svg.appendChild(text(12, H - 12,
      `The cell marked ×2 holds ${model.shared} and is counted in both slices. Total ${model.total}.`,
      { weight: 'var(--fsu-weight-bold)' }));
  }

  return svg;
}

createDemo('#demo-numpy-add2and3-mount', {
  id: 'demo-numpy-add2and3',
  title: 'NumPy slicing — the Lab 02 add2and3 function',
  description:
    'add2and3 sums the second row and the third column of a matrix and adds the results. ' +
    'One element belongs to both slices. Change the shape and watch the guard clause fire.',
  headingLevel: 4,
  caption: 'A row index of 1 is the second row; a column index of 2 is the third column. Python counts from zero.',

  controls: [
    { type: 'range', name: 'rows', label: 'Rows in the matrix', min: 1, max: 6, step: 1, value: 3, unit: 'rows',
      valueText: (v) => plural(Number(v), 'row', 'rows'),
      help: 'Fewer than 2 rows trips the guard clause.' },
    { type: 'range', name: 'cols', label: 'Columns in the matrix', min: 2, max: 7, step: 1, value: 5, unit: 'columns',
      valueText: (v) => plural(Number(v), 'column', 'columns'),
      help: 'Fewer than 3 columns trips the guard clause.' },
    { type: 'seed', name: 'seed', label: 'Random seed for the matrix values', value: 42,
      help: 'The same seed always produces the same matrix, so you can quote this run in office hours.' }
  ],

  compute: add2and3Model,

  steps: {
    count: (model) => model.steps.length,
    label: (model, i) => model.steps[i].delta
  },

  figure: add2and3Figure,

  figureAlt(model, ctx) {
    if (model.tooSmall) {
      return `A ${model.rows} by ${model.cols} matrix of single digits. It is below the minimum shape, so add2and3 prints "Matrix too small." and returns 0 without reading any element.`;
    }
    const stage = model.steps[ctx.step].stage;
    if (stage === 'row') {
      return `Step 1: row index 1 of the ${model.rows} by ${model.cols} matrix is outlined with a dashed border; its ${model.cols} values sum to ${model.rowSum}.`;
    }
    if (stage === 'col') {
      return `Step 2: column index 2 is outlined with a solid border; its ${model.rows} values sum to ${model.colSum}.`;
    }
    return `Step 3: both slices are outlined and their overlapping cell is marked "times two"; ${model.rowSum} plus ${model.colSum} gives ${model.total}, with the value ${model.shared} counted twice.`;
  },

  table(model, ctx) {
    const stage = model.steps[ctx.step].stage;
    const columns = [{ label: 'Row' }];
    for (let c = 0; c < model.cols; c += 1) {
      const summed = !model.tooSmall && c === 2 && (stage === 'col' || stage === 'total');
      columns.push({ label: summed ? 'Col 2 (summed)' : `Col ${c}`, numeric: true });
    }
    return {
      caption: model.tooSmall
        ? `A ${model.rows} by ${model.cols} matrix from seed ${model.seed} — too small for add2and3`
        : `The ${model.rows} by ${model.cols} matrix from seed ${model.seed}, at step ${ctx.step + 1} of ${model.steps.length}`,
      rowHeader: true,
      columns,
      rows: model.matrix.map((row, r) => ({
        cells: [
          !model.tooSmall && r === 1 && (stage === 'row' || stage === 'total') ? 'Row 1 (summed)' : `Row ${r}`,
          ...row
        ],
        current: !model.tooSmall && r === 1 && (stage === 'row' || stage === 'total')
      }))
    };
  },

  summary(model) {
    if (model.tooSmall) {
      return [
        `The matrix is ${model.rows} by ${model.cols}. add2and3 prints "Matrix too small." and returns 0.`,
        'The Lab 02 handout says the matrix needs at least 3 rows and 4 columns, but the reference solution guards on at least 2 rows and 3 columns. Write your report against the behaviour you can test.'
      ];
    }
    return [
      `Second row, A[1, :], sums to ${model.rowSum}. Third column, A[:, 2], sums to ${model.colSum}. The function returns ${model.total}.`,
      `The element at row 1, column 2 is ${model.shared}, and it is inside both slices, so ${model.total} counts it twice.`,
      'This is the behaviour the reference solution has, so it is the behaviour the autograder expects.'
    ];
  }
});

/* ==========================================================================
   0.11 — Matplotlib: the same numbers, two chart types
   ==========================================================================
   From During_Class_Examples/GitGithub/myexamples.py: x = [1, 2, 3, 4, 5],
   y = [1, 4, 9, 16, 25], plotted with plt.plot and then with plt.bar.
   ========================================================================== */

function chartsModel(values) {
  const n = Math.max(3, Math.min(8, Math.round(Number(values.n) || 5)));
  const kind = values.kind === 'bar' ? 'bar' : 'line';
  const x = [];
  const y = [];
  for (let i = 1; i <= n; i += 1) { x.push(i); y.push(i * i); }
  return { n, kind, x, y, max: y[y.length - 1] };
}

function chartsFigure(model) {
  const W = 520;
  const H = 320;
  const svg = svgRoot(W, H);

  const left = 62;
  const right = W - 24;
  const top = 30;
  const bottom = H - 52;
  const plotW = right - left;
  const plotH = bottom - top;

  const sx = (v) => left + ((v - 0.5) / (model.n)) * plotW;
  const sy = (v) => bottom - (v / model.max) * plotH;

  // Gridlines and y ticks.
  [0, 0.5, 1].forEach((frac) => {
    const value = Math.round(model.max * frac);
    const yy = sy(value);
    svg.appendChild(line(left, yy, right, yy, { stroke: GRID, width: 1 }));
    svg.appendChild(text(left - 10, yy + 5, String(value), { anchor: 'end', fill: MUTED }));
  });

  // Axes.
  svg.appendChild(line(left, top, left, bottom, { stroke: RULE, width: 2 }));
  svg.appendChild(line(left, bottom, right, bottom, { stroke: RULE, width: 2 }));
  svg.appendChild(text(left - 52, top - 10, 'y', { fill: MUTED }));
  svg.appendChild(text(right, bottom + 40, 'x', { anchor: 'end', fill: MUTED }));

  // x ticks.
  model.x.forEach((v) => {
    svg.appendChild(text(sx(v), bottom + 20, String(v), { anchor: 'middle', fill: MUTED }));
  });

  if (model.kind === 'bar') {
    const bw = Math.min(46, (plotW / model.n) * 0.62);
    model.x.forEach((v, i) => {
      const h = bottom - sy(model.y[i]);
      svg.appendChild(svgEl('rect', {
        x: sx(v) - bw / 2, y: sy(model.y[i]), width: bw, height: Math.max(1, h), rx: 2,
        style: style({ fill: FILL1, stroke: EMPH, 'stroke-width': 2 })
      }));
      svg.appendChild(text(sx(v), sy(model.y[i]) - 8, String(model.y[i]), { anchor: 'middle' }));
    });
    svg.appendChild(text(left + 6, top + 2, 'bars: y = x squared', { weight: 'var(--fsu-weight-bold)' }));
  } else {
    const points = model.x.map((v, i) => `${sx(v)},${sy(model.y[i])}`).join(' ');
    svg.appendChild(svgEl('polyline', {
      points,
      style: style({ fill: 'none', stroke: EMPH, 'stroke-width': 3, 'stroke-linejoin': 'round' })
    }));
    model.x.forEach((v, i) => {
      svg.appendChild(circle(sx(v), sy(model.y[i]), 6, { fill: SURFACE, stroke: EMPH, width: 3 }));
      svg.appendChild(text(sx(v) + 10, sy(model.y[i]) - 8, String(model.y[i])));
    });
    svg.appendChild(text(left + 6, top + 2, 'line with circular markers: y = x squared', { weight: 'var(--fsu-weight-bold)' }));
  }

  return svg;
}

createDemo('#demo-matplotlib-charts-mount', {
  id: 'demo-matplotlib-charts',
  title: 'Line plot or bar plot — the same numbers',
  description:
    'plt.plot and plt.bar draw the same x and y. Switching chart type changes what the reader notices, ' +
    'not what the data says. The table below never changes shape.',
  headingLevel: 4,
  caption: 'x runs from 1, y is x squared — the arrays from the live-coding example in the git and GitHub class.',

  controls: [
    {
      type: 'radio', name: 'kind', label: 'Chart type',
      options: [
        { value: 'line', label: 'Line plot — plt.plot(x, y)' },
        { value: 'bar', label: 'Bar plot — plt.bar(x, y)' }
      ],
      value: 'line'
    },
    {
      type: 'range', name: 'n', label: 'Number of points', min: 3, max: 8, step: 1, value: 5, unit: 'points',
      valueText: (v) => plural(Number(v), 'point', 'points')
    }
  ],

  compute: chartsModel,

  figure: chartsFigure,

  figureAlt(model) {
    const shape = model.kind === 'bar'
      ? 'Vertical bars, one per x value, each labelled with its height'
      : 'A rising line with a circular marker at every point, each labelled with its value';
    return `${shape}. x runs 1 to ${model.n} along the horizontal axis and y is x squared on the vertical axis, ` +
           `rising from 1 to ${model.max}. The curve is convex: each step in x adds more to y than the step before.`;
  },

  table(model) {
    return {
      caption: `y = x squared for x = 1 to ${model.n}, drawn as a ${model.kind === 'bar' ? 'bar plot' : 'line plot'}`,
      rowHeader: true,
      columns: [
        { label: 'x', numeric: true },
        { label: 'y', numeric: true },
        { label: 'Increase on the previous y', numeric: true }
      ],
      rows: model.x.map((v, i) => ({
        cells: [v, model.y[i], i === 0 ? '—' : model.y[i] - model.y[i - 1]]
      }))
    };
  },

  summary(model) {
    return [
      `${plural(model.n, 'point', 'points')}: y goes from 1 to ${model.max}.`,
      `The gaps between consecutive y values are ${model.y.slice(1).map((v, i) => v - model.y[i]).join(', ')} — they grow by 2 every time, which is what makes the plot curve upwards.`,
      model.kind === 'bar'
        ? 'A bar plot invites you to compare heights, so it suits counts and categories.'
        : 'A line plot invites you to read a trend, so it suits a quantity that changes continuously along x.'
    ];
  }
});

})(window);
