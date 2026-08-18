# `Dashboard/tools/` — the offline asset pipeline

Python is a **build tool here, never a runtime**. These scripts run on your
machine, write static SVG and JSON into `Dashboard/assets/`, and stop. The
browser never sees Python, never fetches anything, and works with the Wi-Fi off
(`AUTHORING-CONTRACT.md` rules 7 and 9).

```
python3 Dashboard/tools/build.py            # regenerate everything
python3 Dashboard/tools/build.py --check    # regenerate, then audit; exits non-zero on a defect
```

Run `--check` before you commit. It is the gate.

---

## 1. Requirements

**Python 3.10 or newer. Nothing else.** No numpy, no matplotlib, no pip install,
no network.

That is a deliberate constraint, not an accident of what happened to be
installed. Eight people are building eight pages; a pipeline that needs a
working scientific Python stack is a pipeline that half of them cannot run, and
an asset nobody can regenerate is an asset that rots. `svgkit.py` writes SVG
directly from the standard library, which is also less code than configuring
matplotlib not to convert every axis label into a `<path>` — see §7.

Two things are used **when present** and reported as skipped when they are not:

| Tool | Used for | If missing |
|---|---|---|
| `node` | cross-checking the Python PRNG against `assets/js/demo.js` | `--check` prints `SKIPPED (node not installed)` and says so in the summary |
| `rsvg-convert` | eyeballing a figure as a PNG during development | nothing; it is not part of the build |

A check that silently passes because its tool was missing is worse than no
check, because somebody will later cite it as evidence. So they are always
reported.

---

## 2. What is here

| File | What it is |
|---|---|
| `build.py` | **Runs everything.** Idempotent, reports what it wrote, audits with `--check`. |
| `generate_figures.py` | Writes accessible SVG figures to `assets/figures/m<N>/`. |
| `generate_traces.py` | Writes precomputed algorithm traces to `assets/data/m<N>/`. |
| `generate_datasets.py` | Writes the demos' input data to `assets/data/m<N>/`. |
| `fsu_palette.py` | The palette. Matches `standards/color-palette.md` and re-measures every published ratio. |
| `svgkit.py` | The SVG writer. Enforces the accessibility rules mechanically. |
| `algorithms.py` | Every course algorithm, once. Both the figures and the traces read from here. |
| `serve.py` | The local dev server. Not part of the build. |

Each of the five modules runs standalone as its own self-test:

```
python3 Dashboard/tools/fsu_palette.py     # re-measures every documented contrast ratio
python3 Dashboard/tools/svgkit.py          # checks the SVG writer refuses a figure with no table
python3 Dashboard/tools/algorithms.py      # re-derives every trace and asserts its invariants
```

---

## 3. What it produces

```
assets/
  figures/
    m1/  big-o-growth.svg               <- the figure
         big-o-growth.table.html        <- its non-visual equivalent, paste-ready
         …
  data/
    m1/  selection-sort-trace.json      <- a step-by-step algorithm trace
         inputs.json                    <- the data the demos start from
    …
```

24 figures (48 files, always in pairs), 23 traces, 8 datasets.

**A figure and its `.table.html` ship together.** `svgkit.Figure.render()` will
not produce the SVG at all if `figure.table(...)` was never called: a figure
with no data table is defect #1 on the list of things that get a page sent back
(`AUTHORING-CONTRACT.md` §12), and this is the one place it can be made
impossible rather than merely forbidden.

### Using a figure on a page

**Inline the SVG.** Do not use `<img src="…svg">`.

Inline SVG keeps its text as real text (WCAG 1.4.5), lets `fsu-tokens.css` theme
it, and lets the `<title>` and `<desc>` do their job. An `<img>` discards all
three: the browser ignores the internal `<title>`, the CSS custom properties are
out of scope, and you are back to a single `alt` string for a figure that needs
a table.

The `.table.html` file is the markup to paste beside it. It is already in the
shape §6.2 of the authoring contract asks for — `role="region"`, `tabindex="0"`,
a `<caption>`, `scope` on every header.

### Using a trace in a demo

Every trace has the same envelope, and its fields map one-for-one onto the demo
spec in `assets/js/demo.js`:

| Trace field | `demo.js` |
|---|---|
| `columns`, `steps[i].rows`, `rowHeader` | `table(model, ctx)` |
| `steps[i].label` | `steps.label(model, i)` |
| `stepCount` | `steps.count(model)` |
| `summary`, `steps[i].state` | `summary(model, ctx)` |
| `alt.first`, `alt.last`, `steps[i].state` | `figureAlt(model, ctx)` |

So a demo that ships a trace does not reimplement the algorithm in JavaScript,
and therefore cannot drift from the figure or the table.

**Load it with a static `import`, never `fetch()`.** `fetch()` on a `file://`
origin fails, and it is a network request besides. Either paste the JSON into a
`.js` module as an export, or `import trace from '…json' with { type: 'json' }`
where support allows.

---

## 4. Adding a figure

1. Write a function in `generate_figures.py` that returns a `svgkit.Figure`:

```python
def fig_my_thing() -> Figure:
    f = Figure(
        slug="my-thing",          # -> assets/figures/m3/my-thing.svg
        module="m3",
        width=740, height=440,
        topics=("3.5.5", "3.5.6"),          # ids from COURSE_TOPIC_MAP.md
        title="The shortest A-to-F path totals 165 km, not the 180 the direct route costs.",
        desc="…the long description: what is plotted, the trend, the number that matters…",
        caption="Figure 3.5.1. The worked example used throughout this section.",
    )
    f.heading(24, 30, "Shortest path from A to F")
    f.panel(24, 52, 690, 300)                # the fixed white plot panel
    # …draw…
    f.table(
        [Column("From"), Column("To"), Column("Weight", unit="km", numeric=True)],
        [["A", "B", 40], ["A", "C", 15]],
        caption="Edge list: six nodes, nine edges, weights in kilometres",
    )
    return f
```

2. Register it in `FIGURE_BUILDERS` at the bottom of the file.
3. `python3 tools/build.py --check`.

### The rules the code enforces for you

`Figure.render()` raises rather than writing a bad file when:

- there is no data table
- `title`, `desc` or `caption` is empty
- `title` and `caption` are the same string — the caption *labels*, the title
  states the *finding*
- the title contains "image of", "graph showing", "see figure", "as shown
  above", or "picture of" (`alt-text-style-guide.md` §5)
- a table row is not the same width as the header
- a raw colour literal reached the drawing outside a `var(--fsu-…)` fallback
- **a text node runs off the edge of the viewBox**
- **two text nodes overlap**

The last two are estimated, not measured — there is no browser in the build. The
estimate was calibrated against Chrome rendering all 343 text nodes in this
pipeline: the ratio of rendered width to `font-size × characters` had a median
of 0.47 and a maximum of 0.59 for the sans stack, and a flat 0.60 for the mono
stack. Overflow uses 0.55/0.61 (pessimistic: never under-reports). Collision
uses 0.50/0.60 (realistic: does not chase phantoms).

They matter because both failures are invisible in code review and obvious to a
student. SVG does not wrap text and does not report an overlap; a caption that
runs off the right edge is simply gone, while the `<desc>` still claims it is
there.

### The rules only a human can check

- Does the `title` state what the figure **means**, or just what it shows?
  "Weighted graph with nodes A to F" is a description of a drawing. "The
  shortest A-to-F path totals 165 km" is the information.
- Are the numbers in the table the numbers in the drawing? They will be if both
  read from `algorithms.py`, which is why they should.
- Is the `desc` different from the `title` and from every other figure's?

### Drawing rules

- **Never type a colour.** `pal.token('garnet')`, or a `pal.Series`. Typing a
  hex is caught, but only after the fact.
- **Never type a font size.** `kit.FS_TITLE`, `FS_LABEL`, `FS_BODY`, `FS_TICK`,
  `FS_SMALL`.
- **Never carry meaning in colour alone** (WCAG 1.4.1). Every series in this
  pipeline carries a dash pattern, a marker shape *and* a directly-drawn label.
  Every highlighted edge is thick and solid against thin and dashed. Every
  cluster is a different marker shape. If you cannot describe the figure without
  naming a colour, the figure is the defect.
- **Wrap prose with `f.wrapped(...)` or `f.note(...)`,** never a bare
  `kit.text()`. Consecutive `wrapped` calls at the same x stack automatically,
  so re-wording a caption can never drop it on top of the next one.

---

## 5. Adding a trace

```python
def m3_my_algorithm() -> dict:
    steps = alg.my_algorithm_steps(alg.CAMPUS_GRAPH, "A")
    return trace(
        id="my-algorithm",
        module="M3",
        topics=["3.5.5"],
        title="…",
        seed=alg.SEED,                       # or omit if nothing is random
        determinism="mulberry32 seeded 4221, the same stream as demo.js",
        input={…the exact problem instance…},
        columns=[column("Node"), column("Distance", unit="km", numeric=True)],
        steps=steps,
        summary={…the numbers the closing text needs…},
        alt_first="…what step 1 establishes…",
        alt_last="…what the final state IS…",
    )
```

Register it in `TRACES`. The algorithm itself goes in `algorithms.py`, not in
the generator — the figures read from there too, and that is what stops the SVG
and the table disagreeing.

**Every step label states the delta.** `generate_traces.py` fails the build on
two steps with the same description, because that is the defect
`alt-text-style-guide.md` §4a exists to prevent: the same sentence describing
steps 2 and 3 tells a screen-reader user that nothing happened.

Good: *"Step 3: C is fixed at 15 and relaxes B down from 40 to 35."*
Not: *"Step 3."*

---

## 6. Determinism

Nothing in this pipeline reads the clock, the environment, or `random`.

Anything sampled comes from `algorithms.Mulberry32`, which is a **bit-exact port
of `seededRandom()` in `assets/js/demo.js`**. `build.py --check` proves it
through `node`: 256 draws across four seeds, compared exactly.

That matters more than it looks. A student who opens the k-means demo, types
seed 4221 and presses Play has to see the same iterations as the precomputed
trace, the shipped SVG and the alt text. If Python and JavaScript disagree in
the last bit, three artefacts that claim to describe one run describe three, and
the office-hours conversation is about the tooling instead of about k-means.

The seed is **4221** — the course number. It is written into every JSON file
under `seed`, with a sentence under `determinism` saying how to reproduce the
run.

---

## 7. Why the figures look the way they do

### Why not matplotlib

Its SVG backend converts text to `<path>` unless you fight it, which fails WCAG
1.4.5 outright: axis labels stop being text, stop being selectable, stop being
searchable, and stop reflowing at 400% zoom. It also has no notion of
`role="img"` or of a `<title>` first child. Writing the SVG directly is less
code than configuring matplotlib not to do those things.

### Why every figure paints its own white panel

The palette's contrast is not symmetric across themes. Measured on white, FSU
Garnet is 9.21:1 and FSU Gold is 1.94:1; on Stadium Night the order reverses.
`--fsu-series-1` … `--fsu-series-6` are the same six colours in both themes, so
a plot line that is safe in light mode is not automatically safe in dark mode.

Rather than guess, every figure draws its plot panel in `--fsu-white` — a raw
brand token, identical in both themes — and draws on it with foregrounds whose
ratio against white is published in `standards/color-palette.md`. The measured
ratios then hold whatever theme the page is in. The panel carries a visible
border so it does not float on a dark page.

The consequence, and it is deliberate: generated figures use **raw brand tokens
only** (`--fsu-garnet`, `--fsu-slate`, …), never the semantic tokens
(`--fsu-color-body`, `--fsu-surface`, …), because those flip with the theme and
would break that guarantee.

### Why there are two series orders

`color-palette.md` §5 fixes the draw order: Garnet, Gold, Plaza Brick, Gulf
Sands, Legacy Blue, Westcott Water. That is right for **filled areas**, where
the fill sits under a dark outline and a dark label — `pal.fill_series(i)`.

It is wrong for **thin lines and small markers on white**. The alt-text style
guide §7 says it plainly: FSU Gold on white is 1.94:1, "never as text or as a
line on white". Gulf Sands and Westcott Water are lighter still. WCAG 1.4.11
wants 3:1 for a meaningful graphic, so a gold trend line is not a style
preference, it is a defect.

`pal.line_series(i)` is §5's order with the fills-only colours removed and the
neutral ramp appended, so six line series still have six distinguishable strokes
that each clear 3:1 on white. Primaries still lead, so a chart with four or
fewer line series stays majority-primary. And in every case colour is a
*redundant* channel.

### Why `var(--fsu-garnet, #782f40)` and not a bare hex

A generated figure has two lives: inlined into a page, where `fsu-tokens.css` is
in scope and it re-themes with the dashboard; and opened on its own, where no
stylesheet is in scope at all. `var(--token, #fallback)` covers both. The
literal is written once, in `fsu_palette.py`, from `color-palette.md` — never
typed into a figure by hand. `build.py --check` fails on any hex that appears
outside such a fallback.

---

## 8. What `--check` audits

| Check | What it proves |
|---|---|
| determinism | builds twice, hashes both, fails if anything moved |
| prng | Python mulberry32 is bit-identical to `demo.js`'s, via `node` |
| svg | well-formed XML, `role="img"`, `<title>` first, `<desc>`, `viewBox`, real `<text>` |
| figure pairing | every `.svg` has its `.table.html` beside it |
| json | parses, carries the envelope, no NaN, no wrong-width rows |
| step labels | no two steps of a trace share a description |
| offline | no `http(s)` reference except the SVG XML namespace |
| colour | no raw hex outside a `var(--fsu-…, #…)` fallback |
| coverage | how many `COURSE_TOPIC_MAP.md` ids the assets reference — informational |

Coverage is informational on purpose. Whether every one of the 323 topics has a
**section** is the page authors' job; `tools/verify_topic_coverage.py` at the
repository root checks that.

---

## 9. Things that will bite you

- **`--check` ignores `--only`.** The determinism and coverage audits need the
  whole tree; auditing a third of it would report a third of the truth.
- **`build.py --clean` deletes `assets/figures/` and `assets/data/` entirely.**
  Everything in them is generated, so that is safe — but if you hand-edited a
  generated file, it is gone, which is the intended lesson.
- **`CurrentContent/` is read-only.** Nothing here writes to it, and nothing
  should. It is the 2025 source being replaced.
- **A generated file has a header comment naming its generator.** If you find
  yourself editing one, stop and edit the generator; your change will be
  overwritten by the next build and the review will not catch it.
