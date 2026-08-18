#!/usr/bin/env python3
"""generate_figures.py — accessible static SVG figures for the dashboard.

    Run everything:   python3 Dashboard/tools/build.py
    Run just this:    python3 Dashboard/tools/generate_figures.py
    One module:       python3 Dashboard/tools/generate_figures.py --only m3
    List them:        python3 Dashboard/tools/generate_figures.py --list

Each figure writes two files into ``Dashboard/assets/figures/m<N>/``:

    <slug>.svg           the figure
    <slug>.table.html    its non-visual equivalent, paste-ready

They ship together. A figure without its table is the single defect this
project exists to fix (AUTHORING-CONTRACT §12.1), so ``svgkit.Figure.render()``
refuses to produce the SVG at all if ``table()`` was never called.

--------------------------------------------------------------------------
HOW TO ADD A FIGURE
--------------------------------------------------------------------------
1. Write a function returning a ``svgkit.Figure``. Give it a ``slug``, the
   module, the COURSE_TOPIC_MAP ids it serves, a ``title`` that states the
   FINDING, a ``desc`` long description, and a ``caption`` that is not the
   title reworded.
2. Draw with the helpers. Never type a colour: use ``pal.token(...)`` or a
   ``pal.Series``. Never type a font size: use the ``svgkit.FS_*`` constants.
3. Call ``figure.table(columns, rows)`` with the real numbers.
4. Register it in ``FIGURES`` at the bottom.
5. Run ``python3 tools/build.py`` and read what it says.

The rules the code enforces for you: ``role="img"``, ``<title>`` first, a
``<desc>``, no duplicate title/caption, no raw hex, and every table row the
same width as the header. The rules it cannot enforce, and which a human has
to check: that the title says what the figure MEANS, and that the numbers in
the table are the numbers in the drawing.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import algorithms as alg
import fsu_palette as pal
import svgkit as kit
from svgkit import Column, Figure, Scale

ROOT = Path(__file__).resolve().parent.parent
FIGURES = ROOT / "assets" / "figures"


# ===========================================================================
# M1 — Algorithm design and analysis
# ===========================================================================


def fig_big_o_growth() -> Figure:
    """Five growth curves on linear axes, up to n = 100."""
    f = Figure(
        slug="big-o-growth",
        module="m1",
        width=760,
        height=478,
        topics=("1.4.1", "1.4.2", "1.4.4", "1.4.5"),
        title=(
            "Up to n = 100 the five growth curves separate sharply: n squared reaches "
            "10,000 operations where n log n reaches 664 and n reaches 100."
        ),
        desc=(
            "Operation count against input size n from 1 to 100, on linear axes. Five "
            "series, each with its own dash pattern and a label drawn at the end of its "
            "curve: constant stays flat at 1; logarithmic reaches about 6.6; linear is a "
            "straight line to 100; linearithmic curves gently to 664; quadratic climbs "
            "steeply to 10,000 and is clipped by the top of the panel at n = 100. "
            "Exponential is omitted from this panel because 2 to the power 100 is about "
            "1.3 times 10 to the 30, which no shared axis can show; it appears in the "
            "log-log runtime figure instead."
        ),
        caption="Figure 1.4.1. Growth of five complexity classes on linear axes.",
    )

    left, right, top, bottom = 76, 640, 54, 348
    f.panel(left, top, right - left, bottom - top)
    f.heading(left, 30, "Operations against input size, linear axes")

    sx = Scale(0, 100, left, right)
    sy = Scale(0, 10000, bottom, top)
    f.axes(
        sx, sy,
        x_label="Input size n",
        y_label="Operations",
        x_ticks=[0, 20, 40, 60, 80, 100],
        y_ticks=[0, 2000, 4000, 6000, 8000, 10000],
    )

    shown = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)"]
    label_text = {
        "O(1)": "O(1) constant",
        "O(log n)": "O(log n)",
        "O(n)": "O(n) linear",
        "O(n log n)": "O(n log n)",
        "O(n^2)": "O(n²) quadratic",
    }
    #: Hand-placed so five end-labels do not collide. Nudging a label is the
    #: cost of not having a legend, and a direct label beats a legend every time
    #: for a screen-magnifier user who cannot see both at once.
    #: O(1), O(log n) and O(n) all end within three pixels of the axis on a
    #: 0-to-10,000 scale, so their end labels have to be pulled apart by hand or
    #: they print on top of each other.
    label_y = {"O(1)": 34, "O(log n)": 16, "O(n)": -2, "O(n log n)": -14, "O(n^2)": 4}

    for index, name in enumerate(shown):
        series = pal.line_series(index)
        points = []
        for n in range(1, 101):
            value = alg.complexity_value(name, n)
            points.append((sx(n), sy(min(value, 10000))))
        f.series_line(
            points,
            series,
            label=label_text[name],
            label_at=(right + 8, points[-1][1] + label_y[name]),
            markers_every=25,
        )

    f.add(
        f.wrapped(left, bottom + 62, "O(2ⁿ) is not drawn here: at n = 100 it is about 1.3 × 10³⁰, "
            "which no shared axis can show.", color=pal.LABEL_MUTED),
        f.wrapped(left, bottom + 82, "Each curve carries a dash pattern and a marker shape as well as a colour, and "
            "is labelled where it ends.", color=pal.LABEL_MUTED),
    )

    rows = []
    for n in (1, 10, 25, 50, 100):
        row = [n]
        for name in shown:
            value = alg.complexity_value(name, n)
            row.append(kit.fmt(value, 1))
        rows.append(row)
    f.table(
        [Column("Input size n", numeric=True)]
        + [Column(label_text[name].split(" ")[0], numeric=True) for name in shown],
        rows,
        caption=(
            "Operation counts for five complexity classes at n = 1, 10, 25, 50 and 100"
        ),
    )
    return f


def fig_runtime_scaling() -> Figure:
    """Log-log runtime with the minute/hour/day/year reference lines."""
    f = Figure(
        slug="runtime-scaling",
        module="m1",
        width=780,
        height=470,
        topics=("1.4.1", "1.4.2", "1.4.5"),
        title=(
            "At one operation per nanosecond and n = 1000, an O(n) job finishes in "
            "microseconds and O(n squared) in a millisecond, but O(2 to the n) passes a "
            "year before n reaches 60."
        ),
        desc=(
            "Log-log plot of runtime in seconds against input size n from 1 to 1000, "
            "assuming one operation per nanosecond. Six series, each dashed differently and "
            "labelled at its right-hand end: constant, logarithmic, linear, linearithmic, "
            "quadratic and exponential. Four horizontal dashed reference lines mark one "
            "second, one minute, one hour and one year. The five polynomial curves stay "
            "below one second across the whole range; the exponential curve crosses one "
            "second near n = 30, one hour near n = 42 and one year near n = 55, then leaves "
            "the panel."
        ),
        caption="Figure 1.4.2. Runtime on log-log axes at one nanosecond per operation.",
    )

    left, right, top, bottom = 84, 610, 56, 372
    f.panel(left, top, right - left, bottom - top)
    f.heading(left, 32, "Runtime at one operation per nanosecond, log-log axes")

    sx = Scale(1, 1000, left, right, log=True)
    sy = Scale(1e-9, 1e9, bottom, top, log=True)

    def y_fmt(value: float) -> str:
        exponent = round(math.log10(value))
        return f"10{_superscript(exponent)}"

    f.axes(
        sx, sy,
        x_label="Input size n",
        y_label="Seconds",
        x_ticks=[1, 10, 100, 1000],
        y_ticks=[1e-9, 1e-6, 1e-3, 1, 1e3, 1e6, 1e9],
        x_format=lambda v: f"{int(v)}",
        y_format=y_fmt,
    )

    # Reference lines. Dashed AND labelled in words, so the threshold is
    # readable without decoding a colour.
    for seconds, label in ((1, "one second"), (60, "one minute"),
                           (3600, "one hour"), (31_557_600, "one year")):
        py = sy(seconds)
        f.add(
            kit.line(left, py, right, py,
                     stroke=pal.token(pal.LABEL_MUTED), stroke_width=1.2,
                     stroke_dasharray="4 4"),
            kit.text(right - 4, py - 5, label, size=kit.FS_SMALL,
                     color=pal.LABEL_MUTED, anchor="end"),
        )

    label_text = {
        "O(1)": "O(1)",
        "O(log n)": "O(log n)",
        "O(n)": "O(n)",
        "O(n log n)": "O(n log n)",
        "O(n^2)": "O(n²)",
        "O(2^n)": "O(2ⁿ)",
    }
    #: O(1) is pinned to the bottom of the panel, where the x-axis tick labels
    #: live; 38 clears them.
    label_dy = {"O(1)": 38, "O(log n)": 4, "O(n)": 10, "O(n log n)": -2,
                "O(n^2)": 4, "O(2^n)": 4}

    for index, (name, _) in enumerate(alg.COMPLEXITY_CLASSES):
        series = pal.line_series(index)
        points = []
        for step in range(0, 121):
            n = 10 ** (step / 40)          # 1 .. 1000, evenly spaced in log n
            if n > 1000:
                break
            seconds = alg.complexity_value(name, n) * 1e-9
            if seconds <= 0 or seconds > 1e9:
                break
            points.append((sx(n), sy(max(seconds, 1e-9))))
        if len(points) < 2:
            continue
        f.series_line(
            points,
            series,
            label=label_text[name],
            label_at=(min(points[-1][0] + 8, right + 8), points[-1][1] + label_dy[name]),
            markers_every=30,
            width=2.2,
        )

    f.add(
        f.wrapped(left, bottom + 66, "The exponential curve stops where it leaves the panel — not where the problem "
            "stops being hard.", color=pal.LABEL_MUTED),
    )

    rows = []
    for n in (10, 30, 50, 100, 1000):
        row = [n]
        for name, _ in alg.COMPLEXITY_CLASSES:
            row.append(alg.human_duration(alg.complexity_value(name, n) * 1e-9))
        rows.append(row)
    f.table(
        [Column("Input size n", numeric=True)]
        + [Column(label_text[name]) for name, _ in alg.COMPLEXITY_CLASSES],
        rows,
        caption=(
            "Runtime at one operation per nanosecond, for each complexity class at "
            "n = 10, 30, 50, 100 and 1000"
        ),
    )
    return f


def _superscript(exponent: int) -> str:
    digits = {"-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³",
              "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸",
              "9": "⁹"}
    return "".join(digits[c] for c in str(exponent))


def fig_search_comparison() -> Figure:
    """Sequential against binary search: measured, not asserted."""
    array = sorted(alg.SORT_ARRAY)
    f = Figure(
        slug="search-comparison",
        module="m1",
        width=800,
        height=420,
        topics=("1.1.4", "1.2.2", "1.4.4", "1.4.5", "1.4.7"),
        title=(
            "Sequential search needs up to n comparisons and binary search up to "
            "log base 2 of n: at n = 1000 that is 1000 against 10."
        ),
        desc=(
            "Comparisons against array size n from 10 to 1000. Two series: sequential "
            "search, a solid rising straight line reaching 1000 comparisons at n = 1000; "
            "and binary search, a dashed line that is almost flat, reaching 10 at n = 1000. "
            "Both are labelled at their right-hand ends. The gap widens with n: at n = 100 "
            "it is 100 against 7, at n = 1000 it is 1000 against 10."
        ),
        caption="Figure 1.2.2. Worst-case comparison counts for the two search strategies.",
    )

    left, right, top, bottom = 82, 600, 54, 300
    f.panel(left, top, right - left, bottom - top)
    f.heading(left, 30, "Worst-case comparisons against array size")

    sx = Scale(10, 1000, left, right)
    sy = Scale(0, 1000, bottom, top)
    f.axes(sx, sy, x_label="Array size n", y_label="Comparisons",
           x_ticks=[10, 200, 400, 600, 800, 1000],
           y_ticks=[0, 250, 500, 750, 1000])

    sequential = pal.line_series(0)
    binary = pal.line_series(1)
    f.series_line(
        [(sx(n), sy(n)) for n in range(10, 1001, 10)],
        sequential,
        label="Sequential search, n",
        label_at=(right + 8, top + 6),
        markers_every=20,
    )
    f.series_line(
        [(sx(n), sy(math.log2(n))) for n in range(10, 1001, 10)],
        binary,
        label="Binary search, log₂ n",
        label_at=(right + 8, bottom - 4),
        markers_every=20,
    )

    f.add(
        f.wrapped(left, bottom + 62, "Binary search buys that with a precondition: the array has to be sorted "
                 "first, which costs O(n log n).", color=pal.LABEL_MUTED),
        f.wrapped(left, bottom + 82, "One-off search on unsorted data: sequential wins. Many searches: sort "
                 "once, then binary search every time.", color=pal.LABEL_MUTED),
    )

    rows = []
    for n in (10, 50, 100, 250, 500, 1000):
        rows.append([n, n, math.ceil(math.log2(n)), kit.fmt(n / math.ceil(math.log2(n)), 1)])
    f.table(
        [
            Column("Array size n", numeric=True),
            Column("Sequential, worst case", unit="comparisons", numeric=True),
            Column("Binary, worst case", unit="comparisons", numeric=True),
            Column("Ratio", numeric=True),
        ],
        rows,
        caption="Worst-case comparison counts and their ratio at six array sizes",
    )
    return f


def fig_selection_sort_trace() -> Figure:
    """Small multiples of the selection-sort array, one panel per pass."""
    steps = alg.selection_sort_steps(alg.SORT_ARRAY)
    n = len(alg.SORT_ARRAY)
    shown = [0, 1, 2, len(steps) - 1]

    f = Figure(
        slug="selection-sort-trace",
        module="m1",
        width=780,
        height=430,
        topics=("1.1.1", "1.1.2", "1.1.5", "1.4.3"),
        title=(
            "Selection sort places one value per pass: after pass 1 the smallest value is "
            "in position 0, and after all seven passes the array is ordered."
        ),
        desc=(
            "Four bar charts of the same eight-value array at passes 1, 2, 3 and 7. Bars "
            "are drawn left to right by index, height proportional to value, and every bar "
            "carries its value as a number above it. Bars already in their final position "
            "are drawn solid; bars still unsorted are drawn with a hatched outline, so "
            "sorted and unsorted are distinguishable without colour. Across the four panels "
            "the solid region grows from the left until it covers the whole array."
        ),
        caption="Figure 1.1.2. Selection sort at passes 1, 2, 3 and 7.",
    )
    f.heading(24, 30, "Selection sort: one value placed per pass")

    panel_w, panel_h = 176, 132
    gap = 14
    for panel, step_index in enumerate(shown):
        x0 = 24 + panel * (panel_w + gap)
        y0 = 74
        step = steps[step_index]
        array = step.state["array"]
        boundary = step.state["pivot"]
        f.panel(x0, y0, panel_w, panel_h)
        f.add(
            kit.text(x0, y0 - 10, f"After pass {step_index + 1}",
                     size=kit.FS_LABEL, color=pal.LABEL, weight=600),
        )
        bar_w = (panel_w - 16) / n
        for i, value in enumerate(array):
            height = (value / 100.0) * (panel_h - 24)
            bx = x0 + 8 + i * bar_w
            by = y0 + panel_h - 6 - height
            placed = i <= boundary
            f.add(
                kit.rect(
                    bx + 1, by, bar_w - 2, height,
                    fill=pal.token("garnet") if placed else pal.token(pal.PANEL),
                    stroke=pal.token("garnet"),
                    stroke_width=1.6,
                    stroke_dasharray=None if placed else "3 2",
                )
            )
            f.add(
                kit.text(bx + bar_w / 2, by - 4, str(value),
                         size=11.5, color=pal.LABEL, anchor="middle")
            )
        f.add(
            kit.text(x0 + panel_w / 2, y0 + panel_h + 20,
                     f"{boundary + 1} of {n} placed",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED, anchor="middle")
        )

    f.add(
        kit.text(24, 268, "Solid bar: in its final position.  Dashed outline: still unsorted.",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        kit.text(24, 288,
                 f"Selection sort always makes {n * (n - 1) // 2} comparisons on {n} values, "
                 "whatever order they arrive in.",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
    )

    rows = []
    for i, step in enumerate(steps):
        rows.append(
            [
                i + 1,
                ", ".join(str(v) for v in step.state["array"]),
                step.state["pivot"],
                "yes" if step.state["swapped"] else "no",
                step.state["comparisons"],
            ]
        )
    f.table(
        [
            Column("Pass", numeric=True),
            Column("Array after the pass"),
            Column("Position filled", numeric=True),
            Column("Swap needed"),
            Column("Comparisons so far", numeric=True),
        ],
        rows,
        caption="Selection sort on eight values: the array after every pass",
    )
    return f


# ===========================================================================
# M2 — Probability and random processes
# ===========================================================================


def fig_monte_carlo_pi() -> Figure:
    run = alg.monte_carlo_pi(500, seed=alg.SEED)
    f = Figure(
        slug="monte-carlo-pi-scatter",
        module="m2",
        width=760,
        height=496,
        topics=("2.5.1", "2.5.2", "2.5.3", "2.5.9"),
        title=(
            f"{run['inside']} of 500 random points fall inside the unit circle, so four "
            f"times the ratio estimates pi as {run['estimate']:.3f} — {run['error']:.3f} out."
        ),
        desc=(
            "Five hundred random points in the square from minus one to one on both axes, "
            "with the unit circle drawn on top. Points inside the circle are filled discs; "
            "points outside are open crosses, so membership is readable without colour. "
            f"{run['inside']} points are inside and {run['outside']} outside. The points "
            "fill the square evenly with no visible clustering or banding, which is what a "
            "usable generator looks like."
        ),
        caption="Figure 2.5.3. Five hundred Monte Carlo samples on the unit square.",
    )
    f.heading(24, 30, f"Monte Carlo estimate of pi from 500 points (seed {alg.SEED})")

    size = 320
    left, top = 60, 60
    f.panel(left, top, size, size)
    sx = Scale(-1, 1, left, left + size)
    sy = Scale(-1, 1, top + size, top)
    f.axes(sx, sy, x_label="x", y_label="y",
           x_ticks=[-1, -0.5, 0, 0.5, 1], y_ticks=[-1, -0.5, 0, 0.5, 1],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}", grid=False)

    # The circle: the boundary being tested, so it is a solid strong stroke.
    f.add(
        kit.circle(sx(0), sy(0), size / 2,
                   fill="none", stroke=pal.token("garnet"), stroke_width=2.4),
    )

    inside_series = pal.line_series(0)
    outside_series = pal.line_series(2)
    for x, y, hit in run["points"]:
        if hit:
            f.add(kit.circle(sx(x), sy(y), 2.6, fill=inside_series.color))
        else:
            f.add(
                kit.marker("cross", sx(x), sy(y), 3.2,
                           stroke=outside_series.color)
            )

    # Legend: shape first, word second. Colour is the third channel, not the first.
    lx, ly = left + size + 40, top + 26
    f.add(
        kit.circle(lx + 8, ly, 4.4, fill=inside_series.color),
        kit.text(lx + 22, ly + 5, f"inside the circle — {run['inside']} points",
                 size=kit.FS_SMALL, color=pal.LABEL),
        kit.marker("cross", lx + 8, ly + 26, 4.4, stroke=outside_series.color),
        kit.text(lx + 22, ly + 31, f"outside — {run['outside']} points",
                 size=kit.FS_SMALL, color=pal.LABEL),
    )

    lines = [
        f"ratio inside = {run['inside']} / 500 = {run['ratio']:.4f}",
        f"estimate = 4 × ratio = {run['estimate']:.4f}",
        f"true pi = {math.pi:.4f}",
        f"absolute error = {run['error']:.4f}",
        f"95% interval = {run['ci95'][0]:.3f} to {run['ci95'][1]:.3f}",
        f"pi is {'inside' if run['ciContainsPi'] else 'outside'} that interval",
    ]
    for i, entry in enumerate(lines):
        f.add(
            kit.text(lx, ly + 74 + i * 22, entry,
                     size=kit.FS_SMALL,
                     color=pal.LABEL_STRONG if i in (1, 5) else pal.LABEL,
                     weight=600 if i in (1, 5) else None,
                     mono=True)
        )

    f.add(
        f.wrapped(24, 448, "Membership is drawn as a filled disc against an open cross, not as two "
                 "colours; the 2025 estimator used red and blue fill alone.", color=pal.LABEL_MUTED),
    )

    rows = []
    for n in (50, 200, 1000, 5000):
        entry = alg.monte_carlo_pi(n, seed=alg.SEED)
        rows.append(
            [
                n,
                entry["inside"],
                n - entry["inside"],
                kit.fmt(entry["ratio"], 4),
                kit.fmt(entry["estimate"], 4),
                kit.fmt(entry["error"], 4),
            ]
        )
    f.table(
        [
            Column("Points", numeric=True),
            Column("Inside", numeric=True),
            Column("Outside", numeric=True),
            Column("Ratio inside", numeric=True),
            Column("Estimate of pi", numeric=True),
            Column("Absolute error", numeric=True),
        ],
        rows,
        caption=f"Monte Carlo pi at four sample sizes, all from seed {alg.SEED}",
    )
    return f


def fig_monte_carlo_error() -> Figure:
    series = alg.monte_carlo_convergence(
        [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000], seed=alg.SEED
    )
    f = Figure(
        slug="monte-carlo-error",
        module="m2",
        width=740,
        height=476,
        topics=("2.5.6", "2.5.7", "2.5.9"),
        title=(
            "Monte Carlo error falls as one over the square root of n: a thousandfold "
            "increase in samples buys only about a thirtyfold improvement."
        ),
        desc=(
            "Log-log plot of absolute error in the estimate of pi against sample size n "
            "from 50 to 50,000. The measured errors, drawn as a solid line with round "
            "markers, scatter around a dashed reference line of slope minus one half "
            "anchored at the first point. Individual runs bounce above and below the "
            "reference — the law describes the envelope, not any one run — but the overall "
            "descent matches its slope across three decades of n."
        ),
        caption="Figure 2.5.6. Error against sample size for Monte Carlo pi, log-log axes.",
    )

    left, right, top, bottom = 90, 590, 58, 336
    f.panel(left, top, right - left, bottom - top)
    f.heading(left, 32, "Absolute error against sample size, log-log axes")

    errors = [row["error"] for row in series] + [row["reference"] for row in series]
    lo = 10 ** math.floor(math.log10(min(e for e in errors if e > 0)))
    hi = 10 ** math.ceil(math.log10(max(errors)))
    sx = Scale(50, 50000, left, right, log=True)
    sy = Scale(lo, hi, bottom, top, log=True)

    f.axes(
        sx, sy,
        x_label="Sample size n",
        y_label="Absolute error in the estimate of pi",
        x_ticks=[100, 1000, 10000],
        y_ticks=[10 ** e for e in range(round(math.log10(lo)), round(math.log10(hi)) + 1)],
        x_format=lambda v: f"{int(v):,}",
        y_format=lambda v: f"10{_superscript(round(math.log10(v)))}",
    )

    measured = pal.line_series(0)
    reference = pal.line_series(1)
    f.series_line(
        [(sx(row["n"]), sy(max(row["error"], lo))) for row in series],
        measured,
        label="measured error",
        label_at=(right + 8, sy(max(series[-1]["error"], lo)) + 4),
        markers_every=1,
    )
    f.series_line(
        [(sx(row["n"]), sy(row["reference"])) for row in series],
        reference,
        label="1 / √n reference",
        label_at=(right + 8, sy(series[-1]["reference"]) + 4),
        markers_every=3,
        width=2.0,
    )

    f.add(
        f.wrapped(left, bottom + 66, "The reference line has slope minus one half and is anchored at n = 50. A "
                 "single run scatters around it; it is not a fit.", color=pal.LABEL_MUTED),
        f.wrapped(left, bottom + 86, "To halve the error you need four times the samples. That is the whole "
                 "economics of Monte Carlo.", color=pal.LABEL_MUTED),
    )

    f.table(
        [
            Column("Sample size n", numeric=True),
            Column("Estimate of pi", numeric=True),
            Column("Absolute error", numeric=True),
            Column("1 over root n reference", numeric=True),
        ],
        [
            [
                f"{row['n']:,}",
                kit.fmt(row["estimate"], 5),
                kit.fmt(row["error"], 5),
                kit.fmt(row["reference"], 5),
            ]
            for row in series
        ],
        caption=(
            "Monte Carlo pi error at ten sample sizes, against the one-over-root-n reference"
        ),
    )
    return f


def fig_clt() -> Figure:
    data = alg.clt_series("exponential", [1, 2, 5, 30], samples=3000, seed=alg.SEED)
    f = Figure(
        slug="clt-sampling-distribution",
        module="m2",
        width=800,
        height=460,
        topics=("2.4.1", "2.4.2", "2.4.3", "2.4.4"),
        title=(
            "Averaging an exponential parent turns a hard right skew into a symmetric bell: "
            f"skewness falls from {data['series'][0]['skewness']:.2f} at n = 1 to "
            f"{data['series'][-1]['skewness']:.2f} at n = 30."
        ),
        desc=(
            "Four histograms of the distribution of the sample mean, at sample sizes 1, 2, "
            "5 and 30, all drawn on the same horizontal axis. At n = 1 the histogram is the "
            "exponential parent itself: a tall bar at the left and a long tail to the right. "
            "At n = 2 the peak has moved right and the tail shortened. At n = 5 the shape is "
            "recognisably humped. At n = 30 it is symmetric and narrow. Each panel prints "
            "its observed spread beside the value predicted by sigma over the square root of "
            "n, and the two agree to within a few thousandths."
        ),
        caption="Figure 2.4.3. Sampling distribution of the mean at four sample sizes.",
    )
    f.heading(24, 30,
              "Distribution of the sample mean, exponential parent (3000 samples per panel)")

    panel_w, panel_h = 178, 150
    gap = 14
    max_count = max(max(entry["counts"]) for entry in data["series"])

    for index, entry in enumerate(data["series"]):
        x0 = 26 + index * (panel_w + gap)
        y0 = 76
        f.panel(x0, y0, panel_w, panel_h)
        f.add(
            kit.text(x0, y0 - 10, f"n = {entry['n']}",
                     size=kit.FS_LABEL, color=pal.LABEL, weight=700),
        )
        bar_w = (panel_w - 12) / len(entry["counts"])
        series = pal.fill_series(index)
        for i, count in enumerate(entry["counts"]):
            height = (count / max_count) * (panel_h - 16)
            bx = x0 + 6 + i * bar_w
            f.add(
                kit.rect(bx, y0 + panel_h - 6 - height, max(bar_w - 1, 1), height,
                         fill=series.color,
                         stroke=pal.token(pal.LABEL),
                         stroke_width=0.5)
            )
        # Mean marker: a labelled vertical rule, not a colour.
        mean_x = x0 + 6 + (
            (entry["observedMean"] - entry["binLow"]) / entry["binWidth"]
        ) * bar_w
        f.add(
            kit.line(mean_x, y0 + 6, mean_x, y0 + panel_h - 6,
                     stroke=pal.token(pal.LABEL_STRONG), stroke_width=1.6,
                     stroke_dasharray="5 3"),
            kit.text(x0 + panel_w / 2, y0 + panel_h + 20,
                     f"spread {entry['observedSd']:.3f}",
                     size=kit.FS_SMALL, color=pal.LABEL, anchor="middle"),
            kit.text(x0 + panel_w / 2, y0 + panel_h + 38,
                     f"predicted {entry['theoreticalSd']:.3f}",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED, anchor="middle"),
            kit.text(x0 + panel_w / 2, y0 + panel_h + 56,
                     f"skewness {entry['skewness']:.2f}",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED, anchor="middle"),
        )

    f.add(
        f.wrapped(26, 330, "All four panels share the same horizontal range, so the narrowing is real "
                 "and not an axis effect.", color=pal.LABEL_MUTED),
        f.wrapped(26, 350, "The dashed vertical rule in each panel is the observed mean of the sample "
                 "means; it barely moves.", color=pal.LABEL_MUTED),
        f.wrapped(26, 370, "The parent distribution is never normal. The means become normal anyway — "
                 "that is the theorem.", color=pal.LABEL, weight=600),
    )

    f.table(
        [
            Column("Sample size n", numeric=True),
            Column("Observed mean", numeric=True),
            Column("Predicted mean", numeric=True),
            Column("Observed spread", numeric=True),
            Column("Predicted spread", unit="sigma over root n", numeric=True),
            Column("Skewness", numeric=True),
        ],
        [
            [
                entry["n"],
                kit.fmt(entry["observedMean"], 4),
                kit.fmt(entry["theoreticalMean"], 4),
                kit.fmt(entry["observedSd"], 4),
                kit.fmt(entry["theoreticalSd"], 4),
                kit.fmt(entry["skewness"], 3),
            ]
            for entry in data["series"]
        ],
        caption=(
            "Observed against predicted mean, spread and skewness of the sample mean, "
            "exponential parent with population mean 1 and standard deviation 1"
        ),
    )
    return f


def fig_brownian() -> Figure:
    path = alg.brownian_path(steps=240, dt=0.05, drift=0.0, sigma=1.0, seed=alg.SEED)
    f = Figure(
        slug="brownian-path",
        module="m2",
        width=760,
        height=492,
        topics=("2.6.1", "2.6.2", "2.6.3", "2.6.8"),
        title=(
            f"After 240 independent steps the particle ends {path['displacement']:.2f} units "
            f"from where it started, against a root-mean-square prediction of "
            f"{path['rmsTheory']:.2f}."
        ),
        desc=(
            "A two-dimensional random walk of 240 steps traced as a continuous line from a "
            "square marker at the origin to a diamond marker at the end point. The path "
            "doubles back on itself repeatedly and has no preferred direction, because the "
            "drift is zero. A dashed circle of radius equal to the root-mean-square "
            "prediction is drawn around the origin for scale; the end point lies near it "
            "rather than on it, which is what a single realisation of a random process looks "
            "like."
        ),
        caption="Figure 2.6.1. One 240-step two-dimensional Brownian path.",
    )
    f.heading(24, 30, f"Two-dimensional Brownian motion, 240 steps (seed {alg.SEED})")

    size = 330
    left, top = 66, 62
    f.panel(left, top, size, size)

    span = max(
        max(abs(v) for v in path["x"]),
        max(abs(v) for v in path["y"]),
        path["rmsTheory"],
    ) * 1.12
    sx = Scale(-span, span, left, left + size)
    sy = Scale(-span, span, top + size, top)
    f.axes(sx, sy, x_label="x displacement", y_label="y displacement",
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}")

    # RMS circle: dashed and labelled, so it reads as a reference not a boundary.
    f.add(
        kit.circle(sx(0), sy(0), abs(sx(path["rmsTheory"]) - sx(0)),
                   fill="none", stroke=pal.token(pal.LABEL_MUTED),
                   stroke_width=1.4, stroke_dasharray="6 4"),
        kit.text(sx(0) + 4, sy(path["rmsTheory"]) - 6,
                 f"RMS prediction {path['rmsTheory']:.2f}",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
    )

    series = pal.line_series(0)
    f.add(
        kit.polyline(
            [(sx(x), sy(y)) for x, y in zip(path["x"], path["y"])],
            stroke=series.color, stroke_width=1.5,
            stroke_linejoin="round", stroke_linecap="round",
        )
    )

    f.add(
        kit.marker("square", sx(0), sy(0), 6.0, fill=pal.token(pal.LABEL_STRONG)),
        kit.text(sx(0) + 11, sy(0) + 4, "start (0, 0)",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
        kit.marker("diamond", sx(path["x"][-1]), sy(path["y"][-1]), 7.0,
                   fill=pal.token("garnet")),
        kit.text(sx(path["x"][-1]) + 11, sy(path["y"][-1]) + 4,
                 f"end ({path['x'][-1]:.2f}, {path['y'][-1]:.2f})",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
    )

    lines = [
        f"steps = {path['steps']},  dt = {path['dt']}",
        f"drift mu = {path['drift']},  volatility sigma = {path['sigma']}",
        f"elapsed time = {path['totalTime']:.1f}",
        "",
        f"final displacement  {path['displacement']:.3f}",
        f"RMS prediction      {path['rmsTheory']:.3f}",
        f"mean-distance theory {path['meanTheory']:.3f}",
        f"furthest reached    {path['maxRadius']:.3f}",
    ]
    for i, entry in enumerate(lines):
        if not entry:
            continue
        f.add(
            kit.text(left + size + 34, top + 30 + i * 21, entry,
                     size=kit.FS_SMALL, color=pal.LABEL, mono=True)
        )

    f.add(
        f.wrapped(24, 452, "Typical displacement grows as the square root of time, not linearly — four "
                 "times the steps, twice the distance.", color=pal.LABEL_MUTED),
    )

    rows = []
    for end in range(0, path["steps"] + 1, 40):
        t = end * path["dt"]
        rows.append(
            [
                end,
                kit.fmt(t, 2),
                kit.fmt(path["x"][end], 3),
                kit.fmt(path["y"][end], 3),
                kit.fmt(math.hypot(path["x"][end], path["y"][end]), 3),
                kit.fmt(path["sigma"] * math.sqrt(2 * t), 3) if t > 0 else "0",
            ]
        )
    f.table(
        [
            Column("Step", numeric=True),
            Column("Time", unit="units", numeric=True),
            Column("x", numeric=True),
            Column("y", numeric=True),
            Column("Distance from origin", numeric=True),
            Column("RMS prediction", numeric=True),
        ],
        rows,
        caption="Position and displacement every 40 steps along the path",
    )
    return f


def fig_prng_lattice() -> Figure:
    n = 400
    bad = alg.lcg_sequence(alg.BAD_LCG["a"], alg.BAD_LCG["c"], alg.BAD_LCG["m"],
                           alg.BAD_LCG["x0"], n)
    good = alg.lcg_sequence(alg.GOOD_LCG["a"], alg.GOOD_LCG["c"], alg.GOOD_LCG["m"],
                            alg.GOOD_LCG["x0"], n)
    bad_distinct = len(set(bad))
    f = Figure(
        slug="prng-lattice",
        module="m2",
        width=760,
        height=470,
        topics=("2.2.2", "2.2.3", "2.2.5", "2.2.6", "2.2.7"),
        title=(
            f"The lag-1 plot exposes a weak generator that summary statistics miss: its 400 "
            f"draws are only {bad_distinct} distinct values on 7 straight lines, while a "
            "well-chosen generator fills the square."
        ),
        desc=(
            "Two square scatter plots, each showing every value plotted against the value "
            "that follows it. On the left, the generator x becomes 7x plus 3 modulo 1000 "
            f"produces points that lie exactly on seven parallel straight lines, only "
            f"{bad_distinct} distinct positions in total, because the sequence cycles after "
            "20 values. On the right, the generator x becomes 1664525x plus 1013904223 "
            "modulo 2 to the 32 produces 400 points spread evenly across the square with no "
            "visible pattern. Both generators have a mean near one half and a similar "
            "spread; only this plot separates them."
        ),
        caption="Figure 2.2.3. Lag-1 scatter for a weak and a well-chosen generator.",
    )
    f.heading(24, 30, "Each value against the next: the plot that finds a bad generator")

    size = 280
    for panel, (values, heading, note) in enumerate(
        (
            (bad, "Weak: x ← (7x + 3) mod 1000",
             f"{bad_distinct} distinct values, cycles after 20"),
            (good, "Strong: x ← (1664525x + 1013904223) mod 2³²",
             f"{len(set(good))} distinct values in 400 draws"),
        )
    ):
        x0 = 60 + panel * (size + 96)
        y0 = 76
        f.panel(x0, y0, size, size)
        sx = Scale(0, 1, x0, x0 + size)
        sy = Scale(0, 1, y0 + size, y0)
        f.axes(sx, sy, x_label="value X at step i", y_label="value X at step i + 1",
               x_ticks=[0, 0.5, 1], y_ticks=[0, 0.5, 1],
               x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}", grid=False)
        f.add(
            kit.text(x0, y0 - 12, heading, size=kit.FS_LABEL,
                     color=pal.LABEL, weight=600),
        )
        series = pal.line_series(0 if panel == 0 else 2)
        for a, b in zip(values, values[1:]):
            f.add(kit.circle(sx(a), sy(b), 2.4, fill=series.color))
        f.add(
            kit.text(x0, y0 + size + 62, note,
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
        )

    f.add(
        f.wrapped(24, 442, "Both generators have a mean near 0.5 and a plausible spread. The mean "
                 "cannot tell them apart; the picture can.", color=pal.LABEL_MUTED),
    )

    def stats(values):
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
        return mean, math.sqrt(variance)

    bad_mean, bad_sd = stats(bad)
    good_mean, good_sd = stats(good)
    f.table(
        [
            Column("Generator"),
            Column("Multiplier a", numeric=True),
            Column("Increment c", numeric=True),
            Column("Modulus m", numeric=True),
            Column("Mean of 400 draws", numeric=True),
            Column("Standard deviation", numeric=True),
            Column("Distinct values", numeric=True),
            Column("Period", numeric=True),
        ],
        [
            ["weak", alg.BAD_LCG["a"], alg.BAD_LCG["c"], f"{alg.BAD_LCG['m']:,}",
             kit.fmt(bad_mean, 4), kit.fmt(bad_sd, 4), bad_distinct, 20],
            ["strong", f"{alg.GOOD_LCG['a']:,}", f"{alg.GOOD_LCG['c']:,}",
             f"{alg.GOOD_LCG['m']:,}", kit.fmt(good_mean, 4), kit.fmt(good_sd, 4),
             len(set(good)), f"{alg.GOOD_LCG['m']:,}"],
        ],
        caption=(
            "Parameters and measured behaviour of the two linear congruential generators"
        ),
    )
    return f


# ===========================================================================
# M3 — Graphs
# ===========================================================================


def _graph_geometry(graph: alg.Graph, left: float, top: float, width: float, height: float):
    def place(node: str) -> tuple[float, float]:
        px, py = graph.pos[node]
        return (left + px * width, top + py * height)

    return place


def _draw_graph(
    f: Figure,
    graph: alg.Graph,
    place,
    *,
    highlight_edges: set[frozenset] = frozenset(),
    highlight_label: str = "",
    node_notes: dict[str, str] | None = None,
    node_ring: set[str] = frozenset(),
    radius: float = 19.0,
    show_weights: bool = True,
) -> None:
    """Draw a graph: edges first, then weight chips, then nodes on top.

    Highlighted edges are THICK AND SOLID against thin dashed ordinary edges,
    so the distinction survives greyscale and colour vision deficiency — the
    2025 views used edge colour alone.
    """
    for u, v, w in graph.edges:
        x1, y1 = place(u)
        x2, y2 = place(v)
        key = frozenset((u, v))
        strong = key in highlight_edges
        f.add(
            kit.line(
                x1, y1, x2, y2,
                stroke=pal.token("garnet") if strong else pal.token(pal.LABEL_MUTED),
                stroke_width=5.0 if strong else 1.8,
                stroke_dasharray=None if strong else "6 4",
                stroke_linecap="round",
            )
        )

    if show_weights and graph.weighted:
        for u, v, w in graph.edges:
            x1, y1 = place(u)
            x2, y2 = place(v)
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            strong = frozenset((u, v)) in highlight_edges
            f.add(
                kit.rect(mx - 13, my - 11, 26, 22, rx=4,
                         fill=pal.token(pal.PANEL),
                         stroke=pal.token("garnet") if strong else pal.token(pal.LABEL_MUTED),
                         stroke_width=1.6 if strong else 1),
                kit.text(mx, my + 5, str(w), size=kit.FS_SMALL,
                         color=pal.LABEL_STRONG, anchor="middle",
                         weight=700 if strong else None),
            )

    for node in graph.nodes:
        cx, cy = place(node)
        ringed = node in node_ring
        if ringed:
            f.add(kit.circle(cx, cy, radius + 5, fill="none",
                             stroke=pal.token("garnet"), stroke_width=2.5))
        f.add(
            kit.circle(cx, cy, radius,
                       fill=pal.token("garnet") if ringed else pal.token(pal.PANEL),
                       stroke=pal.token("garnet"), stroke_width=2.4),
            kit.text(cx, cy + 6, node, size=kit.FS_LABEL,
                     color="white" if ringed else pal.LABEL_STRONG,
                     anchor="middle", weight=700),
        )
        if node_notes and node in node_notes:
            f.add(
                kit.text(cx, cy + radius + 19, node_notes[node],
                         size=kit.FS_SMALL, color=pal.LABEL, anchor="middle", weight=600)
            )

    if highlight_label:
        f.add(
            kit.line(24, f.height - 44, 60, f.height - 44,
                     stroke=pal.token("garnet"), stroke_width=5, stroke_linecap="round"),
            kit.text(68, f.height - 39, highlight_label,
                     size=kit.FS_SMALL, color=pal.LABEL, weight=600),
            kit.line(24, f.height - 22, 60, f.height - 22,
                     stroke=pal.token(pal.LABEL_MUTED), stroke_width=1.8,
                     stroke_dasharray="6 4", stroke_linecap="round"),
            kit.text(68, f.height - 17, "other edges, drawn thin and dashed",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        )


def fig_dijkstra_graph() -> Figure:
    graph = alg.CAMPUS_GRAPH
    path, length = alg.dijkstra_path(graph, "A", "F")
    final = alg.dijkstra_steps(graph, "A")[-1].state
    path_edges = {frozenset((path[i], path[i + 1])) for i in range(len(path) - 1)}
    direct = 4 + 5 + 6  # A-B-D-F, the route that looks shorter on the drawing

    f = Figure(
        slug="dijkstra-example-graph",
        module="m3",
        width=720,
        height=470,
        topics=("3.5.1", "3.5.2", "3.5.3", "3.5.5", "3.5.6", "3.5.7"),
        title=(
            f"The shortest route from A to F runs {' to '.join(path)} and totals {length} "
            f"kilometres — not the shorter-looking A, B, D, F, which costs {direct}."
        ),
        desc=(
            "A weighted undirected graph of six nodes, A to F, and nine edges. The shortest "
            f"path from A to F is drawn as a thick solid line through {', '.join(path)}; the "
            "other edges are thin and dashed. Every edge carries its weight in a small box "
            "at its midpoint, and every node carries its final Dijkstra distance beneath it. "
            "Hop count is not the deciding factor: the route through B and D takes the same "
            f"three hops but costs {direct} kilometres against {length}, because its first "
            "two edges are heavy."
        ),
        caption="Figure 3.5.1. The six-node campus graph, with the shortest A-to-F path marked.",
    )
    f.heading(24, 30, "Shortest path from A to F, with the final Dijkstra distances")

    f.panel(24, 52, 672, 330)
    place = _graph_geometry(graph, 74, 92, 570, 250)
    _draw_graph(
        f, graph, place,
        highlight_edges=path_edges,
        highlight_label=f"shortest path A to F, {length} km, drawn thick and solid",
        node_notes={n: f"d = {final['distances'][n]}" for n in graph.nodes},
        node_ring={"A", "F"},
    )
    f.add(
        f.wrapped(24, 404, "Ringed nodes are the source and the destination. Weights are kilometres.", color=pal.LABEL_MUTED),
    )

    rows = [[u, v, w, "on the shortest path" if frozenset((u, v)) in path_edges else "not used"]
            for u, v, w in graph.edges]
    f.table(
        [Column("From"), Column("To"), Column("Weight", unit="km", numeric=True),
         Column("Role in the A-to-F path")],
        rows,
        caption="Edge list for the six-node campus graph: nine edges, weights in kilometres",
    )
    return f


def fig_dijkstra_vs_kruskal() -> Figure:
    graph = alg.CAMPUS_GRAPH
    kruskal_final = alg.kruskal_steps(graph)[-1].state
    dijkstra_final = alg.dijkstra_steps(graph, "A")[-1].state
    mst_edges = {frozenset((u, v)) for u, v, _ in kruskal_final["mst"]}
    spt_edges = {
        frozenset((node, parent))
        for node, parent in dijkstra_final["previous"].items()
        if parent
    }
    spt_weight = sum(graph.weight(*tuple(e)) for e in spt_edges)

    f = Figure(
        slug="mst-vs-shortest-path-tree",
        module="m3",
        width=780,
        height=490,
        topics=("3.5.5", "3.5.9", "3.6.2", "3.6.3", "3.6.4"),
        title=(
            f"The minimum spanning tree ({kruskal_final['totalWeight']} km) and the "
            f"shortest-path tree from A ({spt_weight} km) are different trees on the same "
            "graph — greedy on total weight is not greedy on individual distance."
        ),
        desc=(
            "The same six-node graph drawn twice. On the left, Kruskal's minimum spanning "
            "tree: five thick solid edges totalling "
            f"{kruskal_final['totalWeight']} kilometres. On the right, the shortest-path "
            f"tree that Dijkstra builds from A: five thick solid edges totalling "
            f"{spt_weight} kilometres. In both panels the unused edges are thin and dashed. "
            "The two trees share some edges but not all: the spanning tree minimises the "
            "total length of the network, while the shortest-path tree minimises each "
            "individual distance from A and is therefore heavier overall."
        ),
        caption="Figure 3.6.3. Minimum spanning tree beside the shortest-path tree from A.",
    )
    f.heading(24, 30, "Two greedy algorithms, two different trees on one graph")

    for panel, (edges, heading, weight, note) in enumerate(
        (
            (mst_edges, "Kruskal: minimum spanning tree",
             kruskal_final["totalWeight"],
             "minimises the TOTAL length of the network"),
            (spt_edges, "Dijkstra: shortest-path tree from A",
             spt_weight,
             "minimises EACH distance from A"),
        )
    ):
        x0 = 24 + panel * 386
        f.panel(x0, 74, 362, 268)
        f.add(kit.text(x0, 64, heading, size=kit.FS_LABEL, color=pal.LABEL, weight=700))
        place = _graph_geometry(graph, x0 + 44, 106, 274, 208)
        _draw_graph(f, graph, place, highlight_edges=edges, radius=16)
        f.add(
            kit.text(x0, 366, f"total weight {weight} km",
                     size=kit.FS_LABEL, color=pal.LABEL_STRONG, weight=700),
            kit.text(x0, 386, note, size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        )

    f.add(
        kit.line(24, 424, 60, 424, stroke=pal.token("garnet"), stroke_width=5,
                 stroke_linecap="round"),
        kit.text(68, 429, "in the tree, drawn thick and solid",
                 size=kit.FS_SMALL, color=pal.LABEL, weight=600),
        kit.line(280, 424, 316, 424, stroke=pal.token(pal.LABEL_MUTED), stroke_width=1.8,
                 stroke_dasharray="6 4", stroke_linecap="round"),
        kit.text(324, 429, "not in the tree, drawn thin and dashed",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
    )

    rows = []
    for u, v, w in graph.edges:
        key = frozenset((u, v))
        rows.append([
            f"{u}-{v}", w,
            "yes" if key in mst_edges else "no",
            "yes" if key in spt_edges else "no",
        ])
    f.table(
        [Column("Edge"), Column("Weight", unit="km", numeric=True),
         Column("In the spanning tree"), Column("In the shortest-path tree")],
        rows,
        caption=(
            f"Which of the nine edges each tree uses. Spanning tree "
            f"{kruskal_final['totalWeight']} km; shortest-path tree {spt_weight} km"
        ),
    )
    return f


def fig_bfs_dfs() -> Figure:
    graph = alg.TRAVERSAL_GRAPH
    bfs = [s.state["current"] for s in alg.bfs_steps(graph, "A")]
    dfs = [s.state["current"] for s in alg.dfs_steps(graph, "A")]
    depths = alg.bfs_steps(graph, "A")[-1].state["depth"]

    f = Figure(
        slug="bfs-vs-dfs",
        module="m3",
        width=780,
        height=470,
        topics=("3.4.1", "3.4.5", "3.4.6", "3.4.7"),
        title=(
            f"On the same graph from the same start, breadth-first visits "
            f"{' '.join(bfs)} and depth-first visits {' '.join(dfs)} — a queue spreads out, "
            "a stack dives down."
        ),
        desc=(
            "The same seven-node graph drawn twice, with the visit order numbered on each "
            "node. On the left, breadth-first search from A numbers the nodes 1 to 7 in "
            "level order: A first, then both of its neighbours, then everything at distance "
            "two. On the right, depth-first search from A follows one branch to its end "
            "before backtracking, so a node three edges from A is visited before a node one "
            "edge from A. The graph, the start node and the neighbour ordering are identical "
            "in both panels; only the container differs."
        ),
        caption="Figure 3.4.7. Breadth-first and depth-first visit order on one graph.",
    )
    f.heading(24, 30, "Same graph, same start, different container")

    for panel, (order, heading, note) in enumerate(
        (
            (bfs, "Breadth-first: a queue, first in first out",
             "every node at distance 1 before any node at distance 2"),
            (dfs, "Depth-first: a stack, last in first out",
             "follows one branch to its end, then backtracks"),
        )
    ):
        x0 = 24 + panel * 386
        f.panel(x0, 76, 362, 264)
        f.add(kit.text(x0, 66, heading, size=kit.FS_LABEL, color=pal.LABEL, weight=700))
        place = _graph_geometry(graph, x0 + 40, 106, 282, 200)
        _draw_graph(f, graph, place,
                    node_notes={n: f"#{order.index(n) + 1}" for n in graph.nodes},
                    radius=16, show_weights=False)
        f.add(
            kit.text(x0, 366, "order: " + " → ".join(order),
                     size=kit.FS_LABEL, color=pal.LABEL_STRONG, weight=700),
            kit.text(x0, 386, note, size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        )

    f.add(
        f.wrapped(24, 424, "The number under each node is when it was visited, so the order is "
                 "readable directly off the drawing rather than from a colour.", color=pal.LABEL_MUTED),
        f.wrapped(24, 444, "Breadth-first order doubles as shortest-path distance in an unweighted "
                 "graph; depth-first order does not.", color=pal.LABEL_MUTED),
    )

    f.table(
        [Column("Node"), Column("Breadth-first visit", numeric=True),
         Column("Depth-first visit", numeric=True),
         Column("Edges from A", numeric=True), Column("Neighbours")],
        [
            [node, bfs.index(node) + 1, dfs.index(node) + 1, depths[node],
             ", ".join(graph.neighbours(node))]
            for node in graph.nodes
        ],
        caption=(
            "Visit position under each traversal, with each node's distance from A and its "
            "neighbour list"
        ),
    )
    return f


# ===========================================================================
# M4 — Image processing
# ===========================================================================


def fig_convolution_kernels() -> Figure:
    shown = ["box-blur", "gaussian", "sharpen", "laplacian", "sobel-x", "sobel-y"]
    f = Figure(
        slug="convolution-kernels",
        module="m4",
        width=780,
        height=622,
        topics=("4.4.1", "4.4.4", "4.4.9", "4.4.10", "4.4.11", "4.5.3"),
        title=(
            "A kernel's row sum predicts what it does: the three that sum to 1 preserve "
            "brightness and smooth, the three that sum to 0 cancel on flat regions and "
            "find change."
        ),
        desc=(
            "Six three-by-three kernels drawn as grids of nine cells, each cell printing its "
            "weight as a number. Box blur and Gaussian blur have all-positive weights summing "
            "to 1. Sharpen has a large positive centre with negative neighbours and sums to "
            "1. Laplacian, Sobel X and Sobel Y mix positive and negative weights and each "
            "sums to 0. Cells with a positive weight are outlined solid; cells with a "
            "negative weight are outlined with a dashed line and their number carries a "
            "minus sign, so sign is readable without colour. Beneath each grid is its sum "
            "and a one-line statement of the effect."
        ),
        caption="Figure 4.4.1. Six convolution kernels with their weights and row sums.",
    )
    f.heading(24, 30, "The kernels the course names, with every weight printed")

    cell = 46
    for index, key in enumerate(shown):
        spec = alg.KERNELS[key]
        col = index % 3
        row = index // 3
        x0 = 34 + col * 250
        y0 = 74 + row * 240
        f.add(
            kit.text(x0, y0 - 8, spec["label"], size=kit.FS_LABEL,
                     color=pal.LABEL, weight=700),
        )
        f.panel(x0, y0, cell * 3, cell * 3)
        total = 0.0
        for r in range(3):
            for c in range(3):
                value = spec["k"][r][c]
                total += value
                cx = x0 + c * cell
                cy = y0 + r * cell
                negative = value < -1e-12
                f.add(
                    kit.rect(cx, cy, cell, cell,
                             fill="none",
                             stroke=pal.token(pal.LABEL if abs(value) > 1e-12
                                              else pal.GRID),
                             stroke_width=1.6 if abs(value) > 1e-12 else 1,
                             stroke_dasharray="3 2" if negative else None),
                    kit.text(cx + cell / 2, cy + cell / 2 + 5,
                             _kernel_cell(value),
                             size=kit.FS_SMALL,
                             color=pal.LABEL_STRONG if abs(value) > 1e-12 else pal.LABEL_MUTED,
                             anchor="middle", weight=700 if abs(value) > 1e-12 else None,
                             mono=True),
                )
        sum_text = ("sums to 1: brightness preserved" if abs(total - 1) < 1e-9
                    else "sums to 0: flat regions vanish" if abs(total) < 1e-9
                    else f"sums to {total:g}")
        f.add(
            kit.text(x0, y0 + cell * 3 + 22, sum_text,
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
            # Wrapped to the column width, not truncated: a sentence cut at 52
            # characters reads as a bug, and SVG will not wrap it for us.
            f.wrapped(x0, y0 + cell * 3 + 42, spec["effect"], width=222),
        )

    f.add(
        f.wrapped(24, 588, "Dashed cell outline and a leading minus sign both mark a negative weight; "
                 "an empty cell is a weight of zero.", color=pal.LABEL_MUTED),
    )

    rows = []
    for key, spec in alg.KERNELS.items():
        flat = [v for row in spec["k"] for v in row]
        rows.append(
            [
                spec["label"],
                spec["topic"],
                ", ".join(_kernel_cell(v) for v in flat),
                kit.fmt(sum(flat), 3),
                spec["effect"],
            ]
        )
    f.table(
        [Column("Kernel"), Column("Topic"), Column("Weights, row by row"),
         Column("Sum", numeric=True), Column("What it does")],
        rows,
        caption="All nine kernels: their weights read row by row, their sum, and their effect",
    )
    return f


def _kernel_cell(value: float) -> str:
    if abs(value) < 1e-12:
        return "0"
    if abs(value - round(value)) < 1e-9:
        return f"{round(value):d}"
    if abs(value - 1 / 9) < 1e-9:
        return "1/9"
    return f"{value:.3f}".rstrip("0").rstrip(".")


def fig_convolution_worked() -> Figure:
    image = alg.SAMPLE_PATCH
    kernel = alg.KERNELS["sobel-x"]["k"]
    r, c = 3, 3
    steps = alg.convolution_worked_steps(image, kernel, [(r, c)])
    step = steps[0]

    f = Figure(
        slug="convolution-worked",
        module="m4",
        width=780,
        height=470,
        topics=("4.4.1", "4.4.10", "4.5.1", "4.5.3"),
        title=(
            f"Centred on the step edge at row {r}, column {c}, the Sobel X kernel's nine "
            f"products sum to {step.state['sum']:.0f} — a large response, because the "
            "neighbourhood changes from dark to bright across it."
        ),
        desc=(
            "A seven-by-seven grid of grey values with a three-by-three window outlined on "
            "the cell at row 3, column 3. Beside it, the Sobel X kernel and the nine "
            "products of overlapping pixel and weight, written out and summed. The left "
            "column of the window holds values of 10 and the right column holds values of "
            "200, so the negative left weights and the positive right weights do not cancel "
            f"and the sum is {step.state['sum']:.0f}. Away from the edge, where all nine "
            "neighbours are equal, the same kernel sums to zero."
        ),
        caption=(
            f"Figure 4.4.2. Sobel X applied to one pixel of a test patch, worked out in full."
        ),
    )
    f.heading(24, 30, "One convolution, arithmetic and all")

    cell = 38
    x0, y0 = 34, 76
    f.add(kit.text(x0, y0 - 10, "Input patch, 7 by 7 grey values",
                   size=kit.FS_LABEL, color=pal.LABEL, weight=600))
    f.panel(x0, y0, cell * 7, cell * 7)
    for rr in range(7):
        for cc in range(7):
            value = image[rr][cc]
            cx, cy = x0 + cc * cell, y0 + rr * cell
            f.add(
                kit.rect(cx, cy, cell, cell, fill="none",
                         stroke=pal.token(pal.GRID), stroke_width=1),
                kit.text(cx + cell / 2, cy + cell / 2 + 5, str(value),
                         size=kit.FS_SMALL, color=pal.LABEL, anchor="middle", mono=True),
            )
    # The window. Thick solid box + a label, so it is not a colour-only cue.
    f.add(
        kit.rect(x0 + (c - 1) * cell, y0 + (r - 1) * cell, cell * 3, cell * 3,
                 fill="none", stroke=pal.token("garnet"), stroke_width=3),
        # Below the grid, not above the window: at 38px per cell the caption
        # would otherwise sit directly on the pixel values it is pointing at.
        f.wrapped(x0, y0 + cell * 7 + 26,
                  f"The thick box is the window, centred on row {r}, column {c}.",
                  width=cell * 7, color=pal.LABEL, weight=600),
    )

    kx, ky = x0 + cell * 7 + 48, y0
    f.add(kit.text(kx, ky - 10, "Sobel X kernel", size=kit.FS_LABEL,
                   color=pal.LABEL, weight=600))
    f.panel(kx, ky, cell * 3, cell * 3)
    for rr in range(3):
        for cc in range(3):
            value = kernel[rr][cc]
            cx, cy = kx + cc * cell, ky + rr * cell
            f.add(
                kit.rect(cx, cy, cell, cell, fill="none",
                         stroke=pal.token(pal.LABEL if value else pal.GRID),
                         stroke_width=1.6 if value else 1,
                         stroke_dasharray="3 2" if value < 0 else None),
                kit.text(cx + cell / 2, cy + cell / 2 + 5, _kernel_cell(value),
                         size=kit.FS_SMALL, color=pal.LABEL_STRONG,
                         anchor="middle", weight=700, mono=True),
            )

    ty = ky + cell * 3 + 34
    f.add(kit.text(kx, ty, "Nine products", size=kit.FS_LABEL,
                   color=pal.LABEL, weight=600))
    terms = step.state["terms"]
    for i, (where, pixel, weight, product) in enumerate(terms):
        f.add(
            kit.text(kx, ty + 22 + i * 18,
                     f"{str(pixel):>4} × {_kernel_cell(weight):>3} = {product:>7g}",
                     size=kit.FS_SMALL, color=pal.LABEL, mono=True)
        )
    f.add(
        kit.line(kx, ty + 22 + len(terms) * 18 - 4, kx + 150,
                 ty + 22 + len(terms) * 18 - 4,
                 stroke=pal.token(pal.LABEL), stroke_width=1.4),
        kit.text(kx, ty + 40 + len(terms) * 18,
                 f"sum = {step.state['sum']:g}",
                 size=kit.FS_LABEL, color=pal.LABEL_STRONG, weight=700, mono=True),
    )

    f.add(
        f.wrapped(24, 448, "Sobel X weights sum to zero, so a flat neighbourhood always gives zero. "
                 "Only a left-to-right change survives.", color=pal.LABEL_MUTED),
    )

    rows = [[where, pixel, _kernel_cell(weight), kit.fmt(product, 2)]
            for where, pixel, weight, product in terms]
    rows.append(["sum of the nine products", "", "", kit.fmt(step.state["sum"], 2)])
    f.table(
        [Column("Neighbour, row and column"), Column("Pixel value", numeric=True),
         Column("Kernel weight", numeric=True), Column("Product", numeric=True)],
        rows,
        caption=f"Every term of the Sobel X convolution at row {r}, column {c}",
    )
    return f


# ===========================================================================
# M5 — Data mining
# ===========================================================================


def fig_kmeans_iterations() -> Figure:
    points = list(alg.KMEANS_POINTS)
    steps = alg.kmeans_steps(points, k=3, seed=alg.SEED)
    shown = list(range(min(4, len(steps))))

    f = Figure(
        slug="kmeans-iterations",
        module="m5",
        width=800,
        height=470,
        topics=("5.4.2", "5.4.3", "5.4.4", "5.4.5", "5.4.10"),
        title=(
            f"Lloyd's method settles in {len(steps)} iterations: the total squared distance "
            f"falls from {steps[0].state['inertia']:.1f} to {steps[-1].state['inertia']:.1f} "
            "and then stops changing."
        ),
        desc=(
            "Four scatter plots of the same eighteen points, one per iteration. Cluster "
            "membership is shown by marker shape — disc, square and triangle — as well as "
            "colour, and each centroid is drawn as a large open cross with its cluster number "
            "beside it. In the first panel the centroids sit where the random initialisation "
            "put them and the clusters cut across the three visible blobs. By the last panel "
            "each centroid sits at the middle of one blob and no point changes cluster, which "
            "is the stopping condition. The inertia printed under each panel falls and then "
            "levels off."
        ),
        caption="Figure 5.4.3. k-means on eighteen points, four iterations to convergence.",
    )
    f.heading(24, 30,
              f"k-means with k = 3, Forgy initialisation from seed {alg.SEED}")

    panel = 176
    shapes = ["circle", "square", "triangle"]
    for index, step_index in enumerate(shown):
        step = steps[step_index]
        x0 = 26 + index * (panel + 14)
        y0 = 78
        f.panel(x0, y0, panel, panel)
        f.add(kit.text(x0, y0 - 10, f"Iteration {step.state['iteration']}",
                       size=kit.FS_LABEL, color=pal.LABEL, weight=700))
        sx = Scale(-0.4, 8.6, x0 + 8, x0 + panel - 8)
        sy = Scale(-0.4, 8.6, y0 + panel - 8, y0 + 8)

        for i, p in enumerate(points):
            label = step.state["labels"][i]
            # line_series, not fill_series: these are small markers on white and
            # need 3:1 (WCAG 1.4.11), which Gold and Gulf Sands do not reach.
            series = pal.line_series(label)
            f.add(kit.marker(shapes[label], sx(p[0]), sy(p[1]), 3.8,
                             fill=series.color, stroke=series.color))
        for cluster, centre in enumerate(step.state["centroids"]):
            f.add(
                kit.marker("plus", sx(centre[0]), sy(centre[1]), 7.0,
                           stroke=pal.token(pal.LABEL_STRONG)),
                kit.circle(sx(centre[0]), sy(centre[1]), 8.5, fill="none",
                           stroke=pal.token(pal.LABEL_STRONG), stroke_width=1.6),
                kit.text(sx(centre[0]) + 12, sy(centre[1]) - 8, str(cluster + 1),
                         size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700),
            )
        f.add(
            kit.text(x0 + panel / 2, y0 + panel + 20,
                     f"inertia {step.state['inertia']:.1f}",
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG,
                     anchor="middle", weight=600),
            kit.text(x0 + panel / 2, y0 + panel + 38,
                     (f"{step.state['reassigned']} point"
                      f"{'' if step.state['reassigned'] == 1 else 's'} moved")
                     if step.state["iteration"] > 1 else "initial assignment",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED, anchor="middle"),
        )

    legend_y = 344
    for cluster in range(3):
        series = pal.line_series(cluster)
        f.add(
            kit.marker(shapes[cluster], 34 + cluster * 168, legend_y, 4.6,
                       fill=series.color, stroke=series.color),
            kit.text(46 + cluster * 168, legend_y + 5, f"cluster {cluster + 1}",
                     size=kit.FS_SMALL, color=pal.LABEL),
        )
    f.add(
        kit.marker("plus", 34 + 3 * 168, legend_y, 6.0, stroke=pal.token(pal.LABEL_STRONG)),
        kit.circle(34 + 3 * 168, legend_y, 8.0, fill="none",
                   stroke=pal.token(pal.LABEL_STRONG), stroke_width=1.5),
        kit.text(50 + 3 * 168, legend_y + 5, "centroid",
                 size=kit.FS_SMALL, color=pal.LABEL),
        f.wrapped(26, 380, "Cluster membership is a marker SHAPE as well as a colour; the 2025 "
                 "k-means view used colour alone.", color=pal.LABEL_MUTED),
        f.wrapped(26, 400, "Inertia can only fall. If a redraw ever shows it rising, the "
                 "implementation is wrong.", color=pal.LABEL_MUTED),
    )

    rows = []
    for step in steps:
        state = step.state
        rows.append(
            [
                state["iteration"],
                ", ".join(str(n) for n in state["counts"]),
                kit.fmt(state["inertia"], 3),
                kit.fmt(state["maxShift"], 4),
                state["reassigned"],
                "yes" if state["converged"] else "no",
            ]
        )
    f.table(
        [Column("Iteration", numeric=True), Column("Points per cluster"),
         Column("Inertia", numeric=True), Column("Largest centroid move", numeric=True),
         Column("Points reassigned", numeric=True), Column("Converged")],
        rows,
        caption="Cluster sizes, inertia and centroid movement at every k-means iteration",
    )
    return f


def _dendrogram_panel(
    f: Figure, method: str, x0: float, y0: float, width: float, height: float,
    cut: float | None = None,
) -> dict:
    points = list(alg.LINKAGE_POINTS)
    _, merges = alg.linkage_steps(points, method)
    layout = alg.dendrogram_layout(merges, len(points))
    f.panel(x0, y0, width, height)

    sx = Scale(-0.5, len(points) - 0.5, x0 + 26, x0 + width - 12)
    sy = Scale(0, layout["maxHeight"] * 1.08, y0 + height - 26, y0 + 12)

    for value in kit.nice_ticks(0, layout["maxHeight"] * 1.08, 4):
        py = sy(value)
        f.add(
            kit.line(x0 + 26, py, x0 + width - 12, py,
                     stroke=pal.token(pal.GRID), stroke_width=1),
            kit.text(x0 + 22, py + 4, f"{value:g}", size=11.5,
                     color=pal.LABEL_MUTED, anchor="end"),
        )

    coords = layout["coords"]
    series = pal.line_series(0)
    for merge in merges:
        lx, ly = coords[merge["left"]]
        rx, ry = coords[merge["right"]]
        h = merge["height"]
        f.add(
            kit.polyline(
                [(sx(lx), sy(ly)), (sx(lx), sy(h)), (sx(rx), sy(h)), (sx(rx), sy(ry))],
                stroke=series.color, stroke_width=1.9, stroke_linejoin="round",
            )
        )
    for position, leaf in enumerate(layout["order"]):
        f.add(
            kit.text(sx(position), y0 + height - 8, str(leaf + 1),
                     size=11.5, color=pal.LABEL, anchor="middle")
        )

    if cut is not None:
        # The rule only; its label goes under the panel. A caption printed
        # across the tree lands on whichever branches happen to be there.
        f.add(
            kit.line(x0 + 26, sy(cut), x0 + width - 12, sy(cut),
                     stroke=pal.token("garnet"), stroke_width=2,
                     stroke_dasharray="7 4")
        )
    return {"merges": merges, "layout": layout}


def fig_dendrograms() -> Figure:
    points = list(alg.LINKAGE_POINTS)
    results = {}
    for method in ("single", "complete", "average"):
        _, merges = alg.linkage_steps(points, method)
        results[method] = merges

    f = Figure(
        slug="linkage-dendrograms",
        module="m5",
        width=800,
        height=560,
        topics=("5.3.1", "5.3.2", "5.3.3", "5.3.4", "5.3.5", "5.3.6"),
        title=(
            "The same twelve points give three different trees: single linkage tops out at "
            f"{results['single'][-1]['height']:.2f}, average at "
            f"{results['average'][-1]['height']:.2f} and complete at "
            f"{results['complete'][-1]['height']:.2f}."
        ),
        desc=(
            "Three dendrograms of the same twelve points, one for each linkage rule, drawn "
            "on separate vertical scales. Leaf numbers run along the bottom of each tree. "
            "Single linkage merges at low heights throughout and produces a chained, "
            "lopsided tree. Complete linkage merges at the largest heights and produces a "
            "balanced tree. Average linkage sits between them. A dashed horizontal cut line "
            "on each tree shows how many clusters that height gives, and the count differs "
            "between the three rules at the same cut height — which is the point: the rule "
            "is a modelling choice, not a detail."
        ),
        caption="Figure 5.3.5. Single, complete and average linkage on one twelve-point set.",
    )
    f.heading(24, 30,
              "Three linkage rules on the twelve-point lecture-note example")

    cuts = {"single": 2.5, "complete": 2.5, "average": 2.5}
    headings = {
        "single": "Single linkage — nearest neighbour, d(A,B) = min",
        "complete": "Complete linkage — farthest neighbour, d(A,B) = max",
        "average": "Average linkage — the mean of all links",
    }
    for index, method in enumerate(("single", "complete", "average")):
        x0 = 24 + index * 258
        f.add(kit.text(x0, 66, headings[method].split(" — ")[0],
                       size=kit.FS_LABEL, color=pal.LABEL, weight=700))
        f.add(kit.text(x0, 84, headings[method].split(" — ")[1],
                       size=kit.FS_SMALL, color=pal.LABEL_MUTED))
        _dendrogram_panel(f, method, x0, 94, 246, 250, cut=cuts[method])
        groups = alg.cut_dendrogram(results[method], len(points), cuts[method])
        f.add(
            kit.text(x0, 368,
                     f"tallest merge {results[method][-1]['height']:.3f}",
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
            kit.text(x0, 388,
                     f"dashed rule = cut at 2.5 → {len(groups)} clusters",
                     size=kit.FS_SMALL, color=pal.LABEL, weight=600),
        )

    f.add(
        f.wrapped(24, 424, "The y axis is merge height: the distance at which two clusters joined. "
                 "Cutting the tree at a height gives the clusters at that resolution.", color=pal.LABEL_MUTED),
        f.wrapped(24, 444, "Single linkage chains: one bridging point can pull two otherwise distant "
                 "groups together. Complete linkage cannot.", color=pal.LABEL_MUTED),
        f.wrapped(24, 464, "Leaf numbers along the bottom are the point numbers in the table below, "
                 "not positions.", color=pal.LABEL_MUTED),
    )

    rows = []
    for i in range(len(points) - 1):
        rows.append(
            [
                i + 1,
                kit.fmt(results["single"][i]["height"], 3),
                kit.fmt(results["complete"][i]["height"], 3),
                kit.fmt(results["average"][i]["height"], 3),
            ]
        )
    f.table(
        [Column("Merge", numeric=True), Column("Single linkage height", numeric=True),
         Column("Complete linkage height", numeric=True),
         Column("Average linkage height", numeric=True)],
        rows,
        caption=(
            "Merge heights for the eleven merges under each linkage rule, on the same "
            "twelve points"
        ),
    )
    return f


def fig_linkage_points() -> Figure:
    points = list(alg.LINKAGE_POINTS)
    _, merges = alg.linkage_steps(points, "single")
    groups = alg.cut_dendrogram(merges, len(points), 2.5)

    f = Figure(
        slug="linkage-point-set",
        module="m5",
        width=680,
        height=496,
        topics=("5.2.1", "5.2.3", "5.3.1", "5.3.6"),
        title=(
            f"Cutting the single-linkage tree at 2.5 splits these twelve points into "
            f"{len(groups)} clusters: {'; '.join('{' + ', '.join(str(i + 1) for i in g) + '}' for g in groups)}."
        ),
        desc=(
            "Twelve points scattered across an eight-by-eight grid, each labelled with its "
            "number. Cluster membership at a cut height of 2.5 is shown by marker shape as "
            "well as colour, and a dashed outline is drawn round each cluster. The clusters "
            "correspond to visible groupings: a loose band across the lower left, a pair on "
            "the right, and a group at the top. Point 4 sits between two groups, which is "
            "why it is the point whose cluster changes when the linkage rule changes."
        ),
        caption="Figure 5.3.6. The twelve-point example, clustered at a cut height of 2.5.",
    )
    f.heading(24, 30, "The twelve-point lecture-note example")

    left, top, size = 68, 62, 330
    f.panel(left, top, size, size)
    sx = Scale(-0.6, 7.6, left, left + size)
    sy = Scale(-0.6, 8.6, top + size, top)
    f.axes(sx, sy, x_label="x", y_label="y",
           x_ticks=[0, 2, 4, 6], y_ticks=[0, 2, 4, 6, 8],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}")

    shapes = ["circle", "square", "triangle", "diamond", "cross", "plus"]
    for index, group in enumerate(groups):
        series = pal.line_series(index)
        for leaf in group:
            x, y = points[leaf]
            f.add(
                kit.marker(shapes[index % len(shapes)], sx(x), sy(y), 5.4,
                           fill=series.color, stroke=series.color),
                kit.text(sx(x) + 10, sy(y) - 7, str(leaf + 1),
                         size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700),
            )

    ly = top + 24
    for index, group in enumerate(groups):
        series = pal.line_series(index)
        f.add(
            kit.marker(shapes[index % len(shapes)], left + size + 34, ly + index * 26, 5.0,
                       fill=series.color, stroke=series.color),
            kit.text(left + size + 50, ly + index * 26 + 5,
                     "{" + ", ".join(str(i + 1) for i in group) + "}",
                     size=kit.FS_SMALL, color=pal.LABEL),
        )

    f.add(
        f.wrapped(24, 450, "Cluster membership is a marker shape as well as a colour, and every point "
                 "carries its number.", color=pal.LABEL_MUTED),
    )

    f.table(
        [Column("Point", numeric=True), Column("x", numeric=True), Column("y", numeric=True),
         Column("Cluster at cut height 2.5", numeric=True)],
        [
            [i + 1, kit.fmt(p[0], 0), kit.fmt(p[1], 0),
             next(g + 1 for g, group in enumerate(groups) if i in group)]
            for i, p in enumerate(points)
        ],
        caption=(
            "The twelve points with their coordinates and their single-linkage cluster at a "
            "cut height of 2.5"
        ),
    )
    return f


# ===========================================================================
# M6 — Computational geometry
# ===========================================================================


def fig_convex_hull() -> Figure:
    points = list(alg.GEOMETRY_POINTS)
    steps = alg.convex_hull_steps(points)
    hull = steps[-1].state["hull"]
    interior = [i for i in range(len(points)) if i not in hull]
    area = abs(alg.polygon_area([points[i] for i in hull]))
    box_area = (
        (max(p[0] for p in points) - min(p[0] for p in points))
        * (max(p[1] for p in points) - min(p[1] for p in points))
    )

    f = Figure(
        slug="convex-hull-giftwrap",
        module="m6",
        width=740,
        height=486,
        topics=("6.4.1", "6.4.2", "6.4.3", "6.2.5"),
        title=(
            f"Gift wrapping finds a {len(hull)}-sided hull round ten points, enclosing "
            f"{area:.1f} square units against the bounding box's {box_area:.1f} — the hull "
            "is the tighter description of the data."
        ),
        desc=(
            "Ten labelled points with their convex hull drawn as a closed solid polygon and "
            "the axis-aligned bounding box drawn as a dashed rectangle around it. The hull "
            f"has {len(hull)} vertices, each marked with a filled disc and numbered in the "
            "order gift wrapping found it, starting from the leftmost point and going "
            f"counter-clockwise. The {len(interior)} interior points are drawn as open "
            "crosses and are not numbered. The hull follows the outermost points closely, "
            "while the box leaves large empty corners."
        ),
        caption="Figure 6.4.3. The convex hull of ten points, with the gift-wrapping order.",
    )
    f.heading(24, 30, "Gift wrapping: pull the rope tight round the data")

    left, top, size = 66, 60, 340
    f.panel(left, top, size, size)
    sx = Scale(0.0, 6.2, left, left + size)
    sy = Scale(0.0, 6.0, top + size, top)
    f.axes(sx, sy, x_label="x", y_label="y",
           x_ticks=[0, 2, 4, 6], y_ticks=[0, 2, 4, 6],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}")

    # Bounding box, dashed: the thing the hull improves on.
    bx0 = min(p[0] for p in points)
    bx1 = max(p[0] for p in points)
    by0 = min(p[1] for p in points)
    by1 = max(p[1] for p in points)
    f.add(
        kit.rect(sx(bx0), sy(by1), sx(bx1) - sx(bx0), sy(by0) - sy(by1),
                 fill="none", stroke=pal.token(pal.LABEL_MUTED),
                 stroke_width=1.4, stroke_dasharray="6 4"),
        kit.text(sx(bx0) + 4, sy(by1) - 7, f"bounding box, area {box_area:.1f}",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
    )

    f.add(
        kit.polygon([(sx(points[i][0]), sy(points[i][1])) for i in hull],
                    fill="none", stroke=pal.token("garnet"), stroke_width=2.6,
                    stroke_linejoin="round")
    )
    for order, index in enumerate(hull):
        x, y = points[index]
        f.add(
            kit.circle(sx(x), sy(y), 5.6, fill=pal.token("garnet")),
            kit.text(sx(x) + 11, sy(y) - 8, f"P{index + 1} (#{order + 1})",
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700),
        )
    for index in interior:
        x, y = points[index]
        f.add(
            kit.marker("cross", sx(x), sy(y), 4.6,
                       stroke=pal.token(pal.LABEL_MUTED)),
            kit.text(sx(x) + 10, sy(y) - 7, f"P{index + 1}",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        )

    lx = left + size + 34
    for i, entry in enumerate([
        f"hull vertices    {len(hull)}",
        f"interior points  {len(interior)}",
        f"hull area        {area:.2f}",
        f"box area         {box_area:.2f}",
        f"hull / box       {area / box_area:.0%}",
        f"candidate tests  {sum(s.state['tested'] for s in steps)}",
        "cost             O(n × h)",
    ]):
        f.add(kit.text(lx, top + 40 + i * 24, entry, size=kit.FS_SMALL,
                       color=pal.LABEL, mono=True))

    f.add(
        kit.circle(30, 452, 5.6, fill=pal.token("garnet")),
        kit.text(44, 457, "on the hull, numbered in wrapping order",
                 size=kit.FS_SMALL, color=pal.LABEL, weight=600),
        kit.marker("cross", 330, 452, 4.6, stroke=pal.token(pal.LABEL_MUTED)),
        kit.text(344, 457, "strictly inside the hull",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
    )

    f.table(
        [Column("Point"), Column("x", numeric=True), Column("y", numeric=True),
         Column("On the hull"), Column("Wrapping order", numeric=True)],
        [
            [f"P{i + 1}", kit.fmt(p[0], 1), kit.fmt(p[1], 1),
             "yes" if i in hull else "no",
             hull.index(i) + 1 if i in hull else "—"]
            for i, p in enumerate(points)
        ],
        caption=(
            f"The ten points, which of them are hull vertices, and the order gift wrapping "
            f"found them"
        ),
    )
    return f


def fig_ear_clipping() -> Figure:
    polygon = list(alg.EAR_POLYGON)
    steps = alg.ear_clipping_steps(polygon)
    triangles = steps[-1].state["triangles"]
    rejections = sum(1 for s in steps if s.state["action"] == "rejected")
    reflex = alg.reflex_vertices(polygon)

    f = Figure(
        slug="ear-clipping",
        module="m6",
        width=760,
        height=536,
        topics=("6.3.3", "6.3.4", "6.3.5", "6.3.6", "6.3.7"),
        title=(
            f"Ear clipping cuts this eight-vertex polygon into {len(triangles)} triangles — "
            f"always n minus 2 — after rejecting {rejections} candidates that were reflex or "
            "contained another vertex."
        ),
        desc=(
            "An eight-vertex non-convex polygon with its boundary drawn solid and the six "
            "diagonals that ear clipping introduced drawn dashed, dividing it into six "
            "triangles. Each vertex is labelled V1 to V8. The reflex vertices, where the "
            "interior angle exceeds 180 degrees, are marked with an open square and can "
            "never be ears; the rest are marked with a filled disc. Each triangle carries "
            "the step number at which it was clipped, so the order of removal is readable "
            "from the drawing."
        ),
        caption="Figure 6.3.6. Ear clipping an eight-vertex polygon into six triangles.",
    )
    f.heading(24, 30, "Ear slicing: remove one ear at a time until three vertices remain")

    left, top, size = 66, 60, 340
    f.panel(left, top, size, size)
    sx = Scale(-0.6, 5.0, left, left + size)
    sy = Scale(-0.6, 5.2, top + size, top)
    f.axes(sx, sy, x_label="x", y_label="y",
           x_ticks=[0, 2, 4], y_ticks=[0, 2, 4],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}", grid=False)

    clip_order = {}
    number = 0
    for step in steps:
        if step.state["action"] in ("clipped", "final"):
            number += 1
            clip_order[tuple(sorted(step.state["triangle"]))] = number

    for triangle in triangles:
        key = tuple(sorted(triangle))
        corners = [(sx(polygon[i][0]), sy(polygon[i][1])) for i in triangle]
        f.add(
            kit.polygon(corners, fill="none",
                        stroke=pal.token(pal.LABEL_MUTED), stroke_width=1.4,
                        stroke_dasharray="5 3")
        )
        cx = sum(c[0] for c in corners) / 3
        cy = sum(c[1] for c in corners) / 3
        f.add(
            kit.text(cx, cy + 5, str(clip_order.get(key, "?")),
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED,
                     anchor="middle", weight=700)
        )

    f.add(
        kit.polygon([(sx(p[0]), sy(p[1])) for p in polygon],
                    fill="none", stroke=pal.token("garnet"), stroke_width=2.8,
                    stroke_linejoin="round")
    )
    for i, p in enumerate(polygon):
        is_reflex = i in reflex
        if is_reflex:
            f.add(kit.marker("square", sx(p[0]), sy(p[1]), 5.4,
                             fill=pal.token(pal.PANEL), stroke=pal.token("garnet")))
            f.add(kit.rect(sx(p[0]) - 5.4, sy(p[1]) - 5.4, 10.8, 10.8,
                           fill="none", stroke=pal.token("garnet"), stroke_width=2))
        else:
            f.add(kit.circle(sx(p[0]), sy(p[1]), 5.0, fill=pal.token("garnet")))
        f.add(
            kit.text(sx(p[0]) + 11, sy(p[1]) - 8, f"V{i + 1}",
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700)
        )

    lx = left + size + 34
    for i, entry in enumerate([
        f"vertices        {len(polygon)}",
        f"triangles       {len(triangles)}",
        f"expected n - 2  {len(polygon) - 2}",
        f"reflex vertices {len(reflex)}",
        f"rejected tests  {rejections}",
        f"polygon area    {abs(alg.polygon_area(polygon)):.2f}",
    ]):
        f.add(kit.text(lx, top + 40 + i * 24, entry, size=kit.FS_SMALL,
                       color=pal.LABEL, mono=True))

    f.add(
        kit.circle(30, 456, 5.0, fill=pal.token("garnet")),
        kit.text(44, 461, "convex vertex — can be an ear",
                 size=kit.FS_SMALL, color=pal.LABEL),
        kit.rect(300 - 5.4, 456 - 5.4, 10.8, 10.8, fill=pal.token(pal.PANEL),
                 stroke=pal.token("garnet"), stroke_width=2),
        kit.text(316, 461, "reflex vertex — never an ear",
                 size=kit.FS_SMALL, color=pal.LABEL),
        f.wrapped(24, 486, "The number inside each triangle is the step at which it was clipped. "
                 "Diagonals are dashed; the original boundary is solid.", color=pal.LABEL_MUTED),
    )

    rows = []
    for step in steps:
        rows.append([
            step.rows[0][0], step.rows[0][1], step.rows[0][2],
            step.rows[0][3], step.rows[0][4], step.rows[0][5],
        ])
    f.table(
        [Column("Test", numeric=True), Column("Vertex"), Column("Interior angle"),
         Column("Vertices inside the candidate"), Column("Decision"),
         Column("Candidate triangle")],
        rows,
        caption="Every ear test, in order, with the reason each candidate was accepted or rejected",
    )
    return f


def fig_voronoi_delaunay() -> Figure:
    points = list(alg.GEOMETRY_POINTS)
    bounds = (0.0, 0.0, 6.2, 6.0)
    cells = alg.voronoi_cells(points, bounds)
    triangles = alg.delaunay_triangulation(points)
    biggest = max(cells, key=lambda c: c["area"])

    f = Figure(
        slug="voronoi-delaunay",
        module="m6",
        width=800,
        height=500,
        topics=("5.5.1", "5.5.2", "5.5.3", "6.5.1", "6.5.2", "6.5.3"),
        title=(
            f"Ten generators give {len(cells)} Voronoi cells and {len(triangles)} Delaunay "
            f"triangles; generator P{biggest['site'] + 1} owns the largest cell at "
            f"{biggest['area']:.2f} square units because it is the most isolated."
        ),
        desc=(
            "Two panels showing the same ten generators. On the left, the Voronoi diagram: "
            "each generator is a filled disc labelled with its number, and the region of the "
            "plane closer to it than to any other is outlined as a polygon. On the right, "
            "the Delaunay triangulation: the same generators joined by straight edges "
            "wherever their Voronoi cells share a boundary. The two are duals — a shared "
            "Voronoi edge is exactly a Delaunay edge — so the right panel is the left one "
            "read the other way round. Cells near the middle of the point set are small; "
            "cells at the edge extend to the boundary of the region."
        ),
        caption="Figure 6.5.3. Voronoi cells and their Delaunay dual on ten generators.",
    )
    f.heading(24, 30, "Voronoi and Delaunay: the same information twice")

    size = 330
    for panel in (0, 1):
        x0 = 42 + panel * 386
        y0 = 74
        f.panel(x0, y0, size, size * (bounds[3] - bounds[1]) / (bounds[2] - bounds[0]))
        panel_h = size * (bounds[3] - bounds[1]) / (bounds[2] - bounds[0])
        sx = Scale(bounds[0], bounds[2], x0, x0 + size)
        sy = Scale(bounds[1], bounds[3], y0 + panel_h, y0)
        f.add(
            kit.text(x0, y0 - 12,
                     "Voronoi: nearest-generator regions" if panel == 0
                     else "Delaunay: the dual triangulation",
                     size=kit.FS_LABEL, color=pal.LABEL, weight=700)
        )

        if panel == 0:
            for cell in cells:
                f.add(
                    kit.polygon([(sx(x), sy(y)) for x, y in cell["polygon"]],
                                fill="none", stroke=pal.token("garnet"),
                                stroke_width=1.8)
                )
        else:
            drawn = set()
            for triangle in triangles:
                v = triangle["vertices"]
                for a, b in ((v[0], v[1]), (v[1], v[2]), (v[0], v[2])):
                    key = frozenset((a, b))
                    if key in drawn:
                        continue
                    drawn.add(key)
                    f.add(
                        kit.line(sx(points[a][0]), sy(points[a][1]),
                                 sx(points[b][0]), sy(points[b][1]),
                                 stroke=pal.token("plaza-brick"), stroke_width=1.8,
                                 stroke_dasharray="7 3")
                    )

        for i, p in enumerate(points):
            f.add(
                kit.circle(sx(p[0]), sy(p[1]), 5.0, fill=pal.token(pal.LABEL_STRONG)),
                kit.text(sx(p[0]) + 9, sy(p[1]) - 7, f"P{i + 1}",
                         size=11.5, color=pal.LABEL_STRONG, weight=700),
            )

    f.add(
        kit.line(30, 448, 66, 448, stroke=pal.token("garnet"), stroke_width=2),
        kit.text(74, 453, "Voronoi cell boundary, solid",
                 size=kit.FS_SMALL, color=pal.LABEL),
        kit.line(300, 448, 336, 448, stroke=pal.token("plaza-brick"),
                 stroke_width=2, stroke_dasharray="7 3"),
        kit.text(344, 453, "Delaunay edge, dashed",
                 size=kit.FS_SMALL, color=pal.LABEL),
        f.wrapped(24, 478, "Each Voronoi edge separates exactly the two generators joined by the "
                 "corresponding Delaunay edge. One diagram, two readings.", color=pal.LABEL_MUTED),
    )

    f.table(
        [Column("Generator"), Column("x", numeric=True), Column("y", numeric=True),
         Column("Cell area", numeric=True), Column("Cell corners", numeric=True),
         Column("Delaunay neighbours", numeric=True)],
        [
            [
                f"P{cell['site'] + 1}",
                kit.fmt(points[cell["site"]][0], 1),
                kit.fmt(points[cell["site"]][1], 1),
                kit.fmt(cell["area"], 3),
                cell["vertices"],
                len({
                    other
                    for t in triangles if cell["site"] in t["vertices"]
                    for other in t["vertices"] if other != cell["site"]
                }),
            ]
            for cell in cells
        ],
        caption=(
            "Each generator's Voronoi cell area and corner count, with its number of "
            "Delaunay neighbours"
        ),
    )
    return f


def fig_point_line_distance() -> Figure:
    a, b = (1.0, 1.0), (5.0, 3.0)
    probes = [(2.0, 4.0), (4.0, 1.2), (6.4, 4.6), (0.2, 2.2)]
    results = [alg.point_line_projection(p, a, b) for p in probes]

    f = Figure(
        slug="point-line-distance",
        module="m6",
        width=720,
        height=480,
        topics=("6.1.2", "6.1.3", "6.1.4", "6.1.5", "6.1.7", "6.1.8"),
        title=(
            "The parameter s locates the foot of the perpendicular along the line: s between "
            "0 and 1 lands on the segment, s below 0 lands before it, s above 1 lands past "
            "its end."
        ),
        desc=(
            "A line segment from A at (1, 1) to B at (5, 3), drawn solid and extended as a "
            "dashed ray in both directions. Four probe points are marked, each joined to the "
            "line by a dotted perpendicular ending in a small open square at the foot. Two "
            "feet land between A and B, one lands beyond B and one lands before A. Beside "
            "each probe point the value of s and the perpendicular distance are printed, so "
            "the sign of s and whether it exceeds 1 can be read directly."
        ),
        caption="Figure 6.1.4. The s coordinate and the perpendicular distance to a line.",
    )
    f.heading(24, 30, "Where a point projects onto a line, and how far away it is")

    left, top, size = 66, 62, 340
    f.panel(left, top, size, size * 0.78)
    panel_h = size * 0.78
    sx = Scale(-1.0, 7.4, left, left + size)
    sy = Scale(-0.4, 6.2, top + panel_h, top)
    f.axes(sx, sy, x_label="x", y_label="y",
           x_ticks=[0, 2, 4, 6], y_ticks=[0, 2, 4, 6],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}")

    dx, dy = b[0] - a[0], b[1] - a[1]
    ext_a = (a[0] - 0.7 * dx, a[1] - 0.7 * dy)
    ext_b = (b[0] + 0.7 * dx, b[1] + 0.7 * dy)
    f.add(
        kit.line(sx(ext_a[0]), sy(ext_a[1]), sx(ext_b[0]), sy(ext_b[1]),
                 stroke=pal.token(pal.LABEL_MUTED), stroke_width=1.4,
                 stroke_dasharray="7 4"),
        kit.line(sx(a[0]), sy(a[1]), sx(b[0]), sy(b[1]),
                 stroke=pal.token("garnet"), stroke_width=3, stroke_linecap="round"),
        kit.circle(sx(a[0]), sy(a[1]), 5.4, fill=pal.token("garnet")),
        kit.text(sx(a[0]) - 8, sy(a[1]) + 20, "A, s = 0",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700, anchor="middle"),
        kit.circle(sx(b[0]), sy(b[1]), 5.4, fill=pal.token("garnet")),
        kit.text(sx(b[0]) + 6, sy(b[1]) - 10, "B, s = 1",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700),
    )

    shapes = ["circle", "square", "triangle", "diamond"]
    for i, (p, result) in enumerate(zip(probes, results)):
        foot = result["foot"]
        f.add(
            kit.line(sx(p[0]), sy(p[1]), sx(foot[0]), sy(foot[1]),
                     stroke=pal.token(pal.LABEL), stroke_width=1.4,
                     stroke_dasharray="2 3"),
            kit.marker(shapes[i], sx(p[0]), sy(p[1]), 5.0,
                       fill=pal.token("plaza-brick"), stroke=pal.token("plaza-brick")),
            kit.rect(sx(foot[0]) - 3.4, sy(foot[1]) - 3.4, 6.8, 6.8,
                     fill=pal.token(pal.PANEL), stroke=pal.token(pal.LABEL),
                     stroke_width=1.4),
            kit.text(sx(p[0]) + 10, sy(p[1]) - 6,
                     f"Q{i + 1}: s = {result['s']:.2f}",
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
            kit.text(sx(p[0]) + 10, sy(p[1]) + 9,
                     f"distance {result['distance']:.2f}",
                     size=11.5, color=pal.LABEL_MUTED),
        )

    f.add(
        f.wrapped(24, 386, "Small open square: the foot of the perpendicular. Dotted line: the "
                 "perpendicular itself.", color=pal.LABEL_MUTED),
        kit.text(24, 410,
                 "s = (Q − A) · (B − A) / |B − A|²   "
                 "foot = A + s(B − A)   distance = |Q − foot|",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, mono=True, weight=600),
        f.wrapped(24, 434, "s is a ratio along the line, not a length. Multiply by |B − A| to get "
                 "a distance along it.", color=pal.LABEL_MUTED),
    )

    f.table(
        [Column("Point"), Column("x", numeric=True), Column("y", numeric=True),
         Column("s", numeric=True), Column("Foot x", numeric=True),
         Column("Foot y", numeric=True),
         Column("Perpendicular distance", numeric=True), Column("Where the foot lands")],
        [
            [
                f"Q{i + 1}", kit.fmt(p[0], 1), kit.fmt(p[1], 1),
                kit.fmt(result["s"], 3),
                kit.fmt(result["foot"][0], 3), kit.fmt(result["foot"][1], 3),
                kit.fmt(result["distance"], 3), result["where"],
            ]
            for i, (p, result) in enumerate(zip(probes, results))
        ],
        caption=(
            "Four probe points against the segment from A (1, 1) to B (5, 3): the parameter "
            "s, the foot of the perpendicular, and the distance"
        ),
    )
    return f


# ===========================================================================
# M7 — Discrete optimization
# ===========================================================================


def _clip_boundary(a1: float, a2: float, rhs: float,
                   x_lo: float, x_hi: float, y_lo: float, y_hi: float):
    """The segment of ``a1 x + a2 y = rhs`` that lies inside the plot box.

    Written out because the obvious shortcut is wrong in a way that looks
    plausible: evaluating y at the two x-limits and CLAMPING it into range does
    not clip the line, it TILTS it. 2x + y = 10 evaluated at x = 0 gives y = 10,
    clamped to 7, so the drawn line runs from (0, 7) to (5, 0) — a different
    constraint, drawn confidently, with the correct label attached to it.
    """
    points = []
    if a2 != 0:
        for x in (x_lo, x_hi):
            y = (rhs - a1 * x) / a2
            if y_lo - 1e-9 <= y <= y_hi + 1e-9:
                points.append((x, y))
    if a1 != 0:
        for y in (y_lo, y_hi):
            x = (rhs - a2 * y) / a1
            if x_lo - 1e-9 <= x <= x_hi + 1e-9:
                points.append((x, y))
    # De-duplicate the corner case where the line passes exactly through one.
    unique = []
    for p in points:
        if not any(abs(p[0] - q[0]) < 1e-9 and abs(p[1] - q[1]) < 1e-9 for q in unique):
            unique.append(p)
    return unique[:2] if len(unique) >= 2 else None


def _constraint_text(a1: float, a2: float, rhs: float) -> str:
    """"2x + y = 10", not "2x + 1y = 10" — a coefficient of 1 is never written."""

    def term(coefficient: float, name: str) -> str:
        if coefficient == 1:
            return name
        if coefficient == -1:
            return f"-{name}"
        return f"{coefficient:g}{name}"

    return f"{term(a1, 'x')} + {term(a2, 'y')} = {rhs:g}"


def fig_lp_feasible_region() -> Figure:
    problem = alg.LP_FURNITURE
    vertices = alg.lp_vertices(problem)
    best = vertices[0]

    f = Figure(
        slug="lp-feasible-region",
        module="m7",
        width=740,
        height=520,
        topics=("7.2.4", "7.2.5", "7.3.1", "7.3.2", "7.4.6", "7.4.9"),
        title=(
            f"The optimum sits at the corner ({best['x']:g}, {best['y']:g}) where the two "
            f"constraints cross, worth {best['z']:g} — the best of the four feasible corners."
        ),
        desc=(
            "The feasible region of a two-variable linear program, drawn as a shaded "
            "quadrilateral bounded by the x and y axes and the two constraint lines "
            "2x + y = 10 and x + y = 6. Each constraint boundary is drawn with its own dash "
            "pattern and labelled with its equation. The four corners of the region are "
            "marked with filled discs and each is labelled with its coordinates and its "
            "objective value: (0, 0) is worth 0, (5, 0) is worth 200, (4, 2) is worth 220 "
            "and (0, 6) is worth 180. The best corner is ringed and labelled 'optimum'. No "
            "interior point beats a corner, which is why checking the corners is enough."
        ),
        caption="Figure 7.3.1. The furniture factory feasible region and its four corners.",
    )
    f.heading(24, 30, "Maximise 40x + 30y subject to 2x + y ≤ 10 and x + y ≤ 6")

    left, top, size = 76, 60, 330
    f.panel(left, top, size, size)
    sx = Scale(0, 7, left, left + size)
    sy = Scale(0, 7, top + size, top)
    f.axes(sx, sy,
           x_label="x, chairs per hour", y_label="y, tables per hour",
           x_ticks=[0, 1, 2, 3, 4, 5, 6, 7], y_ticks=[0, 1, 2, 3, 4, 5, 6, 7],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}")

    ordered = sorted(
        vertices,
        key=lambda v: math.atan2(
            v["y"] - sum(t["y"] for t in vertices) / len(vertices),
            v["x"] - sum(t["x"] for t in vertices) / len(vertices),
        ),
    )
    f.add(
        kit.polygon([(sx(v["x"]), sy(v["y"])) for v in ordered],
                    fill=pal.token("gulf-sands"),
                    stroke=pal.token(pal.LABEL), stroke_width=1.6)
    )
    f.add(
        kit.text(sx(1.5), sy(1.6), "feasible region",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700)
    )

    for index, constraint in enumerate(problem["constraints"]):
        a1, a2 = constraint["a"]
        rhs = constraint["b"]
        series = pal.line_series(index + 1)
        segment = _clip_boundary(a1, a2, rhs, 0, 7, 0, 7)
        if not segment:
            continue
        (px0, py0), (px1, py1) = segment
        f.add(
            kit.line(sx(px0), sy(py0), sx(px1), sy(py1),
                     stroke=series.color, stroke_width=2.4,
                     stroke_dasharray=series.dash)
        )
        # Label each boundary OUTSIDE the feasible region, where only that one
        # line passes: the two cross near (4, 2), so a shared x prints one label
        # on the other and both on the optimum marker.
        label_x = 2.2 if index == 0 else 5.4
        label_y = (rhs - a1 * label_x) / a2
        f.add(
            kit.text(sx(label_x) + 8, sy(label_y) - 8,
                     _constraint_text(a1, a2, rhs),
                     size=kit.FS_SMALL, color=pal.LABEL, weight=600)
        )

    for v in vertices:
        cx, cy = sx(v["x"]), sy(v["y"])
        if v["optimal"]:
            f.add(kit.circle(cx, cy, 10, fill="none",
                             stroke=pal.token("garnet"), stroke_width=2.4))
        f.add(
            kit.circle(cx, cy, 5.4, fill=pal.token("garnet")),
            kit.text(cx + 12, cy - 8,
                     f"({v['x']:g}, {v['y']:g})",
                     size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700),
            kit.text(cx + 12, cy + 8,
                     f"z = {v['z']:g}" + ("  optimum" if v["optimal"] else ""),
                     size=11.5,
                     color=pal.LABEL_STRONG if v["optimal"] else pal.LABEL_MUTED,
                     weight=700 if v["optimal"] else None),
        )

    lx = left + size + 44
    for i, entry in enumerate([
        "objective  z = 40x + 30y",
        "",
        "corners and their value:",
    ] + [f"  ({v['x']:g}, {v['y']:g})  z = {v['z']:g}"
         + ("  <- best" if v["optimal"] else "") for v in vertices]):
        if not entry:
            continue
        f.add(kit.text(lx, top + 40 + i * 23, entry, size=kit.FS_SMALL,
                       color=pal.LABEL_STRONG if "best" in entry else pal.LABEL,
                       weight=700 if "best" in entry else None, mono=True))

    f.add(
        f.wrapped(24, 452, "A linear objective on a convex region always attains its optimum at a "
                 "corner, so four evaluations settle it.", color=pal.LABEL_MUTED),
        f.wrapped(24, 450, "Four corners is nothing. Twenty variables and twenty constraints gives "
                 "over 100 billion candidate basic solutions — hence simplex.", color=pal.LABEL_MUTED),
    )

    f.table(
        [Column("Corner"), Column("x", numeric=True), Column("y", numeric=True),
         Column("Boundaries that meet there"), Column("Objective z", numeric=True),
         Column("Verdict")],
        [
            [
                f"({v['x']:g}, {v['y']:g})", kit.fmt(v["x"], 2), kit.fmt(v["y"], 2),
                " and ".join(v["from"]), kit.fmt(v["z"], 2),
                "optimum" if v["optimal"] else "feasible",
            ]
            for v in vertices
        ],
        caption="The four feasible corners, the boundaries that define each, and its value",
    )
    return f


def fig_simplex_path() -> Figure:
    problem = alg.SIMPLEX_EXAMPLE
    steps = alg.simplex_steps(problem)
    corners = []
    for step in steps:
        solution = step.state.get("solution")
        if not solution:
            continue
        point = (
            float(_as_fraction(solution["x1"])),
            float(_as_fraction(solution["x2"])),
        )
        z = float(_as_fraction(step.state["z"]))
        if not corners or corners[-1][0] != point:
            corners.append((point, z, step.state.get("entering")))

    f = Figure(
        slug="simplex-path",
        module="m7",
        width=760,
        height=536,
        topics=("7.4.6", "7.5.1", "7.5.5", "7.5.6", "7.5.7", "7.5.8", "7.5.9"),
        title=(
            f"Simplex walks (0, 0) to (3, 0) to (1.5, 2.5), raising z from 0 to 360 to 430 — "
            "three of the four corners, never the fourth."
        ),
        desc=(
            "The feasible region of the two-product plant, a quadrilateral with corners at "
            "(0, 0), (3, 0), (1.5, 2.5) and (0, 4), shaded and outlined. The path simplex "
            "takes is drawn as two arrows: from the origin along the x axis to (3, 0), then "
            "up and left to (1.5, 2.5). Each visited corner is a filled disc labelled with "
            "its coordinates and its objective value, 0 then 360 then 430; the unvisited "
            "corner (0, 4) is an open circle labelled with its value of 400. Simplex never "
            "evaluates it, because every move it makes goes to an adjacent corner with a "
            "larger objective."
        ),
        caption="Figure 7.5.5. The corners simplex visits on the two-product plant.",
    )
    f.heading(24, 30,
              "Maximise 120x₁ + 100x₂ subject to 2x₁ + 2x₂ ≤ 8 and "
              "5x₁ + 3x₂ ≤ 15")

    left, top, size = 76, 62, 330
    f.panel(left, top, size, size)
    sx = Scale(0, 5, left, left + size)
    sy = Scale(0, 5, top + size, top)
    f.axes(sx, sy, x_label="x₁", y_label="x₂",
           x_ticks=[0, 1, 2, 3, 4, 5], y_ticks=[0, 1, 2, 3, 4, 5],
           x_format=lambda v: f"{v:g}", y_format=lambda v: f"{v:g}")

    region = [(0.0, 0.0), (3.0, 0.0), (1.5, 2.5), (0.0, 4.0)]
    f.add(
        kit.polygon([(sx(x), sy(y)) for x, y in region],
                    fill=pal.token("gulf-sands"),
                    stroke=pal.token(pal.LABEL), stroke_width=1.6),
        kit.text(sx(0.7), sy(1.0), "feasible region",
                 size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700),
    )

    for index, (a, rhs, text, label_x) in enumerate((
        ((2, 2), 8, "2x₁ + 2x₂ = 8", 3.4),
        ((5, 3), 15, "5x₁ + 3x₂ = 15", 2.2),
    )):
        series = pal.line_series(index + 1)
        segment = _clip_boundary(a[0], a[1], rhs, 0, 5, 0, 5)
        if not segment:
            continue
        (px0, py0), (px1, py1) = segment
        f.add(
            kit.line(sx(px0), sy(py0), sx(px1), sy(py1),
                     stroke=series.color, stroke_width=2.3,
                     stroke_dasharray=series.dash),
            kit.text(sx(label_x) + 8, sy((rhs - a[0] * label_x) / a[1]) - 8, text,
                     size=kit.FS_SMALL, color=pal.LABEL, weight=600),
        )

    for i in range(len(corners) - 1):
        (x1, y1), _, _ = corners[i]
        (x2, y2), _, _ = corners[i + 1]
        ax1, ay1, ax2, ay2 = sx(x1), sy(y1), sx(x2), sy(y2)
        # Pull the head back by the corner disc's radius plus a little, so the
        # arrow lands beside the marker instead of under it.
        length = math.hypot(ax2 - ax1, ay2 - ay1) or 1.0
        ux, uy = (ax2 - ax1) / length, (ay2 - ay1) / length
        ax2, ay2 = ax2 - ux * 9.0, ay2 - uy * 9.0
        f.add(
            kit.line(ax1 + ux * 8.0, ay1 + uy * 8.0, ax2, ay2,
                     stroke=pal.token("garnet"), stroke_width=3.2),
            kit.arrow_head(ax1, ay1, ax2, ay2, 9.5, "garnet"),
        )

    visited = {c[0] for c in corners}
    for x, y in region:
        was_visited = (x, y) in visited
        z = 120 * x + 100 * y
        cx, cy = sx(x), sy(y)
        if was_visited:
            f.add(kit.circle(cx, cy, 6.0, fill=pal.token("garnet")))
        else:
            f.add(kit.circle(cx, cy, 6.0, fill=pal.token(pal.PANEL),
                             stroke=pal.token(pal.LABEL_MUTED), stroke_width=2))
        f.add(
            kit.text(cx + 12, cy - 8, f"({x:g}, {y:g})",
                     size=kit.FS_SMALL,
                     color=pal.LABEL_STRONG if was_visited else pal.LABEL_MUTED,
                     weight=700 if was_visited else None),
            kit.text(cx + 12, cy + 8,
                     f"z = {z:g}" + ("" if was_visited else "  never evaluated"),
                     size=11.5,
                     color=pal.LABEL_STRONG if was_visited else pal.LABEL_MUTED),
        )

    lx = left + size + 40
    lines = ["simplex path:"]
    for i, ((x, y), z, entering) in enumerate(corners):
        lines.append(f"  {i}. ({x:g}, {y:g})   z = {z:g}")
    lines += [
        "",
        "corner (0, 4) is adjacent to",
        "the origin too, but x₁ had the",
        "more negative coefficient,",
        "so simplex went right first.",
    ]
    for i, entry in enumerate(lines):
        if not entry:
            continue
        f.add(kit.text(lx, top + 36 + i * 22, entry, size=kit.FS_SMALL,
                       color=pal.LABEL, mono=i < len(corners) + 1))

    f.add(
        kit.circle(30, 458, 6.0, fill=pal.token("garnet")),
        kit.text(44, 463, "corner simplex visited",
                 size=kit.FS_SMALL, color=pal.LABEL),
        kit.circle(250, 458, 6.0, fill=pal.token(pal.PANEL),
                   stroke=pal.token(pal.LABEL_MUTED), stroke_width=2),
        kit.text(264, 463, "corner it never evaluated",
                 size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        f.wrapped(24, 486, "Each pivot moves to an ADJACENT corner with a larger objective, which is "
                 "why simplex terminates and why it skips corners.", color=pal.LABEL_MUTED),
    )

    rows = []
    for i, step in enumerate(steps):
        state = step.state
        if "solution" not in state:
            continue
        rows.append([
            i,
            ", ".join(state["basis"]),
            state["solution"]["x1"],
            state["solution"]["x2"],
            state["z"],
            state.get("entering") or "—",
            state.get("departing") or "—",
        ])
    f.table(
        [Column("Tableau", numeric=True), Column("Basic variables"),
         Column("x₁"), Column("x₂"), Column("Objective z", numeric=True),
         Column("Entering"), Column("Departing")],
        rows,
        caption=(
            "Every tableau in the simplex run: which variables are basic, the corner they "
            "describe, and the pivot that follows"
        ),
    )
    return f


def _as_fraction(text: str):
    from fractions import Fraction

    return Fraction(text)


def fig_simplex_tableaus() -> Figure:
    """The tableau sequence drawn as real text tables inside the SVG.

    A simplex tableau is a table of numbers. AUTHORING-CONTRACT §6.6 is explicit
    that a table of numbers is never a formula and never an image, so this SVG
    draws every entry as a ``<text>`` node and ships the identical numbers as a
    real ``<table>`` beside it. Nothing here is a raster.
    """
    problem = alg.SIMPLEX_EXAMPLE
    steps = alg.simplex_steps(problem)
    names = alg.simplex_variable_names(problem)
    shown = [s for s in steps if "solution" in s.state][:3]

    f = Figure(
        slug="simplex-tableaus",
        module="m7",
        width=830,
        height=470,
        topics=("7.5.4", "7.5.6", "7.5.7", "7.5.8", "7.5.9", "7.5.10"),
        title=(
            "Three tableaus take the objective from 0 to 360 to 430; the run stops when no "
            "negative coefficient is left in the objective row."
        ),
        desc=(
            "Three simplex tableaus side by side, each a table of exact fractions with one "
            "row per constraint plus an objective row, and one column per variable plus a "
            "right-hand side. In the first tableau the basic variables are the two slacks "
            "and the objective row reads minus 120 and minus 100. The pivot element in each "
            "of the first two tableaus is ringed, and the entering column and departing row "
            "are marked with arrows and named in words. In the third tableau the objective "
            "row holds 35 and 10 with no negative entry, which is the optimality test "
            "passing."
        ),
        caption="Figure 7.5.8. The three tableaus of the two-product plant, entry by entry.",
    )
    f.heading(24, 30, "Three tableaus, exact fractions, pivots marked")

    col_w = 44
    row_h = 30
    for index, step in enumerate(shown):
        x0 = 26 + index * 258
        y0 = 88
        state = step.state
        f.add(
            kit.text(x0, y0 - 34,
                     f"Tableau {index + 1}" + (
                         "" if index == 0 else f" after pivoting on {shown[index - 1].state.get('entering', '')}"
                     ),
                     size=kit.FS_LABEL, color=pal.LABEL, weight=700),
            kit.text(x0, y0 - 16,
                     f"basic: {', '.join(state['basis'])}   z = {state['z']}",
                     size=kit.FS_SMALL, color=pal.LABEL_MUTED),
        )
        table_w = col_w * (len(names) + 2)
        table_h = row_h * (len(step.rows) + 1)
        f.panel(x0, y0, table_w, table_h)

        headers = ["basic"] + names + ["rhs"]
        for c, header in enumerate(headers):
            f.add(
                kit.text(x0 + c * col_w + col_w / 2, y0 + row_h - 10, header,
                         size=11.5, color=pal.LABEL_STRONG, anchor="middle",
                         weight=700, mono=True)
            )
        f.add(
            kit.line(x0, y0 + row_h, x0 + table_w, y0 + row_h,
                     stroke=pal.token(pal.LABEL), stroke_width=1.4)
        )

        for r, row in enumerate(step.rows):
            objective_row = r == len(step.rows) - 1
            if objective_row:
                f.add(
                    kit.line(x0, y0 + (r + 1) * row_h, x0 + table_w,
                             y0 + (r + 1) * row_h,
                             stroke=pal.token(pal.LABEL), stroke_width=1.4)
                )
            for c, value in enumerate(row):
                cell_x = x0 + c * col_w + col_w / 2
                cell_y = y0 + (r + 2) * row_h - 10
                text_value = "z" if objective_row and c == 0 else str(value)
                f.add(
                    kit.text(cell_x, cell_y, text_value, size=11.5,
                             color=pal.LABEL_STRONG, anchor="middle", mono=True,
                             weight=700 if objective_row else None)
                )

        pivot_row = state.get("pivotRow")
        pivot_col = state.get("pivotCol")
        if pivot_row is not None and pivot_col is not None:
            cx = x0 + (pivot_col + 1) * col_w + col_w / 2
            cy = y0 + (pivot_row + 2) * row_h - 14
            f.add(
                kit.circle(cx, cy, 14, fill="none",
                           stroke=pal.token("garnet"), stroke_width=2.2),
                kit.text(x0, y0 + table_h + 24,
                         f"pivot on {state['pivot']}: {state['entering']} enters, "
                         f"{state['departing']} departs",
                         size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=600),
            )
        elif state.get("optimal"):
            f.add(
                kit.text(x0, y0 + table_h + 24,
                         "no negative entry in the objective row: optimal",
                         size=kit.FS_SMALL, color=pal.LABEL_STRONG, weight=700)
            )

    f.add(
        f.wrapped(26, 392, "Entering variable: the most negative objective coefficient, lowest index "
                 "on a tie (Bland's rule, which is what stops cycling).", color=pal.LABEL_MUTED),
        f.wrapped(26, 412, "Departing variable: the smallest positive ratio of right-hand side to the "
                 "entering column's coefficient.", color=pal.LABEL_MUTED),
        f.wrapped(26, 432, "Every entry is an exact fraction and real selectable text, not a picture "
                 "of a table.", color=pal.LABEL_MUTED),
    )

    rows = []
    for index, step in enumerate(shown):
        for r, row in enumerate(step.rows):
            rows.append([index + 1, row[0]] + list(row[1:]))
    f.table(
        [Column("Tableau", numeric=True), Column("Basic variable")]
        + [Column(n, numeric=True) for n in names]
        + [Column("Right-hand side", numeric=True)],
        rows,
        caption=(
            "Every entry of the three tableaus, as exact fractions, with the basic variable "
            "labelling each row"
        ),
    )
    return f


# ===========================================================================
# Registry
# ===========================================================================

FIGURE_BUILDERS = [
    fig_big_o_growth,
    fig_runtime_scaling,
    fig_search_comparison,
    fig_selection_sort_trace,
    fig_monte_carlo_pi,
    fig_monte_carlo_error,
    fig_clt,
    fig_brownian,
    fig_prng_lattice,
    fig_dijkstra_graph,
    fig_dijkstra_vs_kruskal,
    fig_bfs_dfs,
    fig_convolution_kernels,
    fig_convolution_worked,
    fig_kmeans_iterations,
    fig_dendrograms,
    fig_linkage_points,
    fig_convex_hull,
    fig_ear_clipping,
    fig_voronoi_delaunay,
    fig_point_line_distance,
    fig_lp_feasible_region,
    fig_simplex_path,
    fig_simplex_tableaus,
]


def generate(figures_root: Path = FIGURES, only: str | None = None) -> list[tuple[Path, bool]]:
    """Build every figure. Returns (path, changed) pairs."""
    results: list[tuple[Path, bool]] = []
    for builder in FIGURE_BUILDERS:
        figure = builder()
        if only and only not in f"{figure.module}/{figure.slug}":
            continue
        written = figure.write(figures_root)
        out_dir = figures_root / figure.module
        for name in (f"{figure.slug}.svg", f"{figure.slug}.table.html"):
            target = out_dir / name
            results.append((target, target in written))
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--list", action="store_true", help="list the figures and exit")
    parser.add_argument("--only", help="build only figures whose module/slug contains this")
    args = parser.parse_args()

    if args.list:
        for builder in FIGURE_BUILDERS:
            figure = builder()
            print(f"{figure.module}/{figure.slug}.svg   {', '.join(figure.topics)}")
        return 0

    results = generate(only=args.only)
    changed = sum(1 for _, c in results if c)
    for path, was_changed in results:
        print(f"  {'wrote  ' if was_changed else 'ok     '} {path.relative_to(ROOT)}")
    print(f"\n{len(results)} files, {changed} changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
