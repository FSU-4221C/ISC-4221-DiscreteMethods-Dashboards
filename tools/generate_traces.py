#!/usr/bin/env python3
"""generate_traces.py — precomputed algorithm traces, as JSON, for the demos.

    Run everything:   python3 Dashboard/tools/build.py
    Run just this:    python3 Dashboard/tools/generate_traces.py
    Preview one:      python3 Dashboard/tools/generate_traces.py --list

Writes to ``Dashboard/assets/data/m<N>/<slug>.json``. The browser reads these
with a static ``import`` of the JS wrapper, or an author pastes the numbers into
a fallback table — never with ``fetch()``, which does not work from ``file://``
and would be a network request besides (AUTHORING-CONTRACT rule 7).

--------------------------------------------------------------------------
THE ENVELOPE
--------------------------------------------------------------------------
Every file has the same shape, so one loader in ``assets/js/demos/`` handles all
of them and a reviewer can check any of them the same way:

    {
      "schema":      "isc4221c-trace/1",
      "id":          "dijkstra",
      "module":      "M3",
      "topics":      ["3.5.5", "3.5.6"],
      "title":       "Dijkstra on the six-node campus graph",
      "seed":        4221 | null,
      "determinism": "how this run is reproducible, in words",
      "generator":   "Dashboard/tools/generate_traces.py",
      "command":     "python3 Dashboard/tools/build.py",
      "input":       { … the exact problem instance … },
      "columns":     [ { "label", "unit", "numeric" } … ],
      "rowHeader":   true,
      "steps":       [ { "index", "label", "rows", "state" } … ],
      "summary":     { … the numbers the closing text needs … },
      "alt":         { "first": "…", "last": "…" }
    }

The fields map one-for-one onto the demo spec in ``assets/js/demo.js``:

    columns / rows      ->  table(model, ctx)
    steps[i].label      ->  steps.label(model, i)
    steps.length        ->  steps.count(model)
    summary + state     ->  summary(model, ctx)
    alt / step alt      ->  figureAlt(model, ctx)

so a demo that ships a trace does not have to reimplement the algorithm in JS
at all, and cannot drift from the figure or the table.

--------------------------------------------------------------------------
WHY EVERY STEP LABEL IS DIFFERENT
--------------------------------------------------------------------------
``steps.label`` is read aloud on every step change. alt-text-style-guide.md §4a:
the first step establishes the setup, every later one states the delta. If the
same sentence would describe steps 2 and 3, the sentence is wrong. This module
asserts it — ``_check_labels`` fails the build on a duplicate label, so a lazy
"Step 4" placeholder cannot ship.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import algorithms as alg
from algorithms import Step

SCHEMA = "isc4221c-trace/1"
GENERATOR = "Dashboard/tools/generate_traces.py"
COMMAND = "python3 Dashboard/tools/build.py"

ROOT = Path(__file__).resolve().parent.parent      # Dashboard/
DATA = ROOT / "assets" / "data"


# ---------------------------------------------------------------------------
# Envelope
# ---------------------------------------------------------------------------


def column(label: str, unit: str = "", numeric: bool = False) -> dict:
    return {"label": label, "unit": unit, "numeric": numeric}


def _round(value):
    """Keep JSON small and diffs stable: 12 significant places is far past
    anything a figure or a table can show, and it stops a last-bit difference
    between two machines from producing a spurious file change."""
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return round(value, 12)
    if isinstance(value, dict):
        return {k: _round(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_round(v) for v in value]
    return value


def _check_labels(trace_id: str, steps: list[Step]) -> None:
    seen: dict[str, int] = {}
    for i, step in enumerate(steps):
        text = step.label.strip()
        if not text:
            raise ValueError(f"{trace_id}: step {i} has an empty label.")
        if text in seen:
            raise ValueError(
                f"{trace_id}: steps {seen[text]} and {i} have the SAME label:\n"
                f"    {text!r}\n"
                "Every step label states what changed THIS step "
                "(alt-text-style-guide.md §4a)."
            )
        seen[text] = i


def trace(
    *,
    id: str,
    module: str,
    topics: list[str],
    title: str,
    input: dict,
    columns: list[dict],
    steps: list[Step],
    summary: dict,
    alt_first: str,
    alt_last: str,
    seed: int | None = None,
    determinism: str = "no randomness; the input is fixed",
    row_header: bool = True,
    notes: list[str] | None = None,
) -> dict:
    _check_labels(id, steps)
    for i, step in enumerate(steps):
        for row in step.rows:
            if len(row) != len(columns):
                raise ValueError(
                    f"{id}: step {i} has a {len(row)}-cell row but {len(columns)} columns."
                )
    return {
        "schema": SCHEMA,
        "id": id,
        "module": module,
        "topics": topics,
        "title": title,
        "seed": seed,
        "determinism": determinism,
        "generator": GENERATOR,
        "command": COMMAND,
        "notes": notes or [],
        "input": _round(input),
        "columns": columns,
        "rowHeader": row_header,
        "stepCount": len(steps),
        "steps": [
            {
                "index": i,
                "label": s.label,
                "rows": _round(s.rows),
                "state": _round(s.state),
                **({"alt": s.alt} if s.alt else {}),
            }
            for i, s in enumerate(steps)
        ],
        "summary": _round(summary),
        "alt": {"first": alt_first, "last": alt_last},
    }


# ---------------------------------------------------------------------------
# M1 — sorting, searching, growth
# ---------------------------------------------------------------------------

#: Imported, not redeclared: the figure and the trace must sort the same eight
#: numbers or the fallback table on the page contradicts the SVG beside it.
SORT_ARRAY = alg.SORT_ARRAY


def m1_selection_sort() -> dict:
    steps = alg.selection_sort_steps(SORT_ARRAY)
    final = steps[-1].state
    return trace(
        id="selection-sort",
        module="M1",
        topics=["1.1.1", "1.1.2", "1.1.5", "1.4.3", "1.4.7"],
        title="Selection sort on eight values",
        input={"array": SORT_ARRAY, "algorithm": "selection sort"},
        columns=[column("Index", numeric=True), column("Value", numeric=True), column("Status")],
        steps=steps,
        summary={
            "sorted": final["array"],
            "steps": len(steps),
            "comparisons": final["comparisons"],
            "swaps": final["swaps"],
            "n": len(SORT_ARRAY),
            "comparisonsFormula": "n(n-1)/2",
            "comparisonsPredicted": len(SORT_ARRAY) * (len(SORT_ARRAY) - 1) // 2,
            "swapsUpperBound": len(SORT_ARRAY) - 1,
        },
        alt_first=(
            f"Selection sort begins on the unsorted array {SORT_ARRAY}. Pass 1 scans all "
            "eight values to find the smallest and swaps it into index 0."
        ),
        alt_last=(
            f"After {len(steps)} passes the array is in order. Selection sort always makes "
            f"{final['comparisons']} comparisons — n(n-1)/2 for n = 8 — regardless of how "
            f"the input was arranged, and made {final['swaps']} swaps here."
        ),
        notes=[
            "One step per outer pass, matching the 2025 Brute Force Sorting Visualizer, "
            "so selection sort always shows exactly n-1 steps against bubble sort's "
            "one-per-swap."
        ],
    )


def m1_bubble_sort() -> dict:
    steps = alg.bubble_sort_steps(SORT_ARRAY)
    final = steps[-1].state
    return trace(
        id="bubble-sort",
        module="M1",
        topics=["1.1.1", "1.1.3", "1.1.5", "1.4.6", "1.4.7"],
        title="Bubble sort on eight values",
        input={"array": SORT_ARRAY, "algorithm": "bubble sort"},
        columns=[column("Index", numeric=True), column("Value", numeric=True), column("Status")],
        steps=steps,
        summary={
            "sorted": final["array"],
            "steps": len(steps),
            "comparisons": final["comparisons"],
            "swaps": final["swaps"],
            "passes": final["passes"],
            "n": len(SORT_ARRAY),
            "selectionSortSteps": len(alg.selection_sort_steps(SORT_ARRAY)),
            "bestCaseComparisons": len(SORT_ARRAY) - 1,
        },
        alt_first=(
            f"Bubble sort begins on {SORT_ARRAY}. The first out-of-order neighbouring pair "
            "is swapped, which is one step; every swap is a step, so the step count grows "
            "with how unsorted the input is."
        ),
        alt_last=(
            f"The array is sorted after {final['swaps']} swaps across {final['passes']} "
            f"passes and {final['comparisons']} comparisons. Selection sort needed only "
            f"{len(alg.selection_sort_steps(SORT_ARRAY))} steps on the same data, because "
            "it counts a pass rather than a swap — the comparison counts are what to "
            "compare, not the step counts."
        ),
    )


def m1_binary_search() -> dict:
    array = sorted(SORT_ARRAY)
    target = 45
    steps = alg.binary_search_steps(array, target)
    linear = alg.sequential_search_steps(array, target)
    final = steps[-1].state
    return trace(
        id="binary-search",
        module="M1",
        topics=["1.1.4", "1.2.2", "1.3.1", "1.4.4", "1.4.5"],
        title="Binary search for 45 in a sorted array of eight values",
        input={"array": array, "target": target, "sorted": True},
        columns=[
            column("Comparison", numeric=True),
            column("Left", numeric=True),
            column("Midpoint", numeric=True),
            column("Right", numeric=True),
            column("Value at midpoint", numeric=True),
            column("Verdict"),
            column("Window size", numeric=True),
        ],
        steps=steps,
        summary={
            "target": target,
            "found": final.get("found", False),
            "binaryComparisons": final["comparisons"],
            "linearComparisons": linear[-1].state["comparisons"],
            "n": len(array),
            "log2n": math.log2(len(array)),
            "requiresSorted": True,
        },
        alt_first=(
            f"Binary search starts with the whole array of {len(array)} values in play and "
            f"tests the midpoint against the target {target}."
        ),
        alt_last=(
            f"Binary search found {target} in {final['comparisons']} comparisons; the linear "
            f"scan needed {linear[-1].state['comparisons']} on the same array. The window "
            "halves every step, so the cost is log base 2 of n — but only because the array "
            "was sorted first."
        ),
        notes=[
            "The linear-scan comparison count is computed from the same array, so the "
            "'O(n) versus O(log n)' claim in the summary is measured rather than asserted."
        ],
    )


def m1_growth_rates() -> dict:
    """Not a step trace — the numbers behind the Big-O curves and the cost table."""
    sizes = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 10000]
    curve_n = list(range(1, 101))
    rows = []
    for n in sizes:
        row = {"n": n}
        for name, _ in alg.COMPLEXITY_CLASSES:
            value = alg.complexity_value(name, n)
            row[name] = None if not math.isfinite(value) else value
            row[name + " time"] = alg.human_duration(value * 1e-9)  # 1 ns per operation
        rows.append(row)

    return {
        "schema": SCHEMA,
        "id": "growth-rates",
        "module": "M1",
        "topics": ["1.4.1", "1.4.2", "1.4.4", "1.4.5"],
        "title": "Operation counts for the six complexity classes",
        "seed": None,
        "determinism": "closed-form functions; no randomness",
        "generator": GENERATOR,
        "command": COMMAND,
        "notes": [
            "O(2^n) is returned as null past n = 1024. The 2025 Big-O Explorer printed "
            "2**n exactly and produced a 3011-digit integer at n = 10000; null plus the "
            "phrase 'beyond a lifetime' in the time column is the honest rendering, and "
            "it makes the point better than a wall of digits.",
            "Times assume one operation per nanosecond, which is the 'seconds to "
            "centuries' framing of slide P2-F20.",
        ],
        "classes": [
            {"name": name, "description": description}
            for name, description in alg.COMPLEXITY_CLASSES
        ],
        "curves": {
            name: [
                None if not math.isfinite(v := alg.complexity_value(name, n)) else round(v, 6)
                for n in curve_n
            ]
            for name, _ in alg.COMPLEXITY_CLASSES
        },
        "curveN": curve_n,
        "table": rows,
        "summary": {
            "atN1000": {
                name: alg.human_duration(alg.complexity_value(name, 1000) * 1e-9)
                for name, _ in alg.COMPLEXITY_CLASSES
            },
            "crossovers": (
                "At n = 10 every class is instant. At n = 1000, O(n) is a microsecond, "
                "O(n squared) is a millisecond, and O(2 to the n) already exceeds the age "
                "of the universe."
            ),
        },
    }


# ---------------------------------------------------------------------------
# M2 — Monte Carlo, CLT, Brownian, PRNGs
# ---------------------------------------------------------------------------

PI_SIZES = [50, 200, 1000, 5000]
PI_CONVERGENCE_SIZES = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]


def m2_monte_carlo_pi() -> dict:
    """One step per sample size, so the step-through IS the convergence."""
    steps: list[Step] = []
    runs = []
    for i, n in enumerate(PI_SIZES):
        run = alg.monte_carlo_pi(n, seed=alg.SEED)
        runs.append(run)
        lo, hi = run["ci95"]
        verdict = "inside" if run["ciContainsPi"] else "outside"
        if i == 0:
            label = (
                f"{n} points are thrown at the square from minus one to one on both axes. "
                f"{run['inside']} of them land inside the unit circle, so the area ratio "
                f"estimates pi as {run['estimate']:.4f} — off by {run['error']:.4f}."
            )
        else:
            previous = runs[i - 1]
            direction = "closer to" if run["error"] < previous["error"] else "further from"
            label = (
                f"Raising the sample from {previous['n']} to {n} points puts "
                f"{run['inside']} inside the circle and moves the estimate to "
                f"{run['estimate']:.4f}, {direction} pi than before "
                f"({run['error']:.4f} against {previous['error']:.4f}). Four times the "
                "points roughly halves the error."
            )
        steps.append(
            Step(
                label=label,
                rows=[
                    [
                        n,
                        run["inside"],
                        run["outside"],
                        round(run["ratio"], 6),
                        round(run["estimate"], 6),
                        round(run["error"], 6),
                        f"{lo:.4f} to {hi:.4f}",
                        f"pi is {verdict}",
                    ]
                ],
                state={
                    "n": n,
                    "inside": run["inside"],
                    "outside": run["outside"],
                    "estimate": run["estimate"],
                    "error": run["error"],
                    "ci95": [lo, hi],
                    "ciContainsPi": run["ciContainsPi"],
                    # Points only for the two smallest sizes: 5000 pairs of floats is
                    # 200 kB of JSON, and a scatter of 5000 dots is unreadable anyway.
                    "points": (
                        [[round(x, 5), round(y, 5), hit] for x, y, hit in run["points"]]
                        if n <= 200
                        else None
                    ),
                },
            )
        )

    convergence = alg.monte_carlo_convergence(PI_CONVERGENCE_SIZES, seed=alg.SEED)
    return trace(
        id="monte-carlo-pi",
        module="M2",
        topics=["2.5.1", "2.5.2", "2.5.3", "2.5.6", "2.5.9"],
        title="Monte Carlo estimate of pi at four sample sizes",
        seed=alg.SEED,
        determinism=(
            f"mulberry32 seeded {alg.SEED}, the same generator as seededRandom() in "
            "assets/js/demo.js, so retyping the seed in the demo reproduces this run exactly"
        ),
        input={
            "sizes": PI_SIZES,
            "square": [-1, 1],
            "rule": "a point counts as inside when x squared plus y squared is at most 1",
            "confidence": 0.95,
            "z": 1.96,
        },
        columns=[
            column("Points", numeric=True),
            column("Inside", numeric=True),
            column("Outside", numeric=True),
            column("Ratio inside", numeric=True),
            column("Estimate of pi", numeric=True),
            column("Absolute error", numeric=True),
            column("95% interval"),
            column("Contains pi"),
        ],
        steps=steps,
        summary={
            "truePi": math.pi,
            "best": min(runs, key=lambda r: r["error"])["n"],
            "finalEstimate": runs[-1]["estimate"],
            "finalError": runs[-1]["error"],
            "convergence": [
                {
                    "n": row["n"],
                    "estimate": row["estimate"],
                    "error": row["error"],
                    "reference": row["reference"],
                }
                for row in convergence
            ],
            "errorLaw": "error falls as one over the square root of n",
            "errorRatio50kOver50": (
                convergence[0]["error"] / convergence[-1]["error"]
                if convergence[-1]["error"] > 0
                else None
            ),
        },
        alt_first=(
            f"{PI_SIZES[0]} random points in the square; {runs[0]['inside']} fall inside the "
            f"quarter circle, giving a first estimate of pi of {runs[0]['estimate']:.3f}."
        ),
        alt_last=(
            f"At {PI_SIZES[-1]} points the estimate is {runs[-1]['estimate']:.4f}, an error "
            f"of {runs[-1]['error']:.4f}. Across the convergence series from 50 to 50,000 "
            "points the error falls as one over the square root of n, so a hundredfold "
            "increase in work buys only a tenfold improvement."
        ),
        notes=[
            "Inside and outside are recorded as a boolean, not as a colour. The 2025 "
            "estimator distinguished them with red and blue fill alone, which the audit "
            "cites under 1.4.1; the figure here uses a marker SHAPE as well.",
            "Point coordinates are stored only for n <= 200 to keep the file small; the "
            "larger sizes are summarised by their counts, which is all the table needs.",
        ],
    )


def m2_clt() -> dict:
    sizes = [1, 2, 5, 30]
    data = alg.clt_series("exponential", sizes, samples=3000, seed=alg.SEED)
    steps: list[Step] = []
    for i, entry in enumerate(data["series"]):
        n = entry["n"]
        if i == 0:
            label = (
                "Sample size n = 1: each 'sample mean' is a single draw, so the histogram "
                f"is the parent distribution itself — a strongly right-skewed exponential "
                f"with skewness {entry['skewness']:.2f}. Nothing is normal yet."
            )
        else:
            previous = data["series"][i - 1]
            label = (
                f"Sample size n = {n}: averaging {n} draws pulls the skewness from "
                f"{previous['skewness']:.2f} down to {entry['skewness']:.2f} and narrows "
                f"the spread from {previous['observedSd']:.3f} to "
                f"{entry['observedSd']:.3f}. Theory predicts sigma over root n = "
                f"{entry['theoreticalSd']:.3f}."
            )
        steps.append(
            Step(
                label=label,
                rows=[
                    [
                        n,
                        round(entry["observedMean"], 4),
                        round(entry["theoreticalMean"], 4),
                        round(entry["observedSd"], 4),
                        round(entry["theoreticalSd"], 4),
                        round(entry["skewness"], 3),
                    ]
                ],
                state={
                    "n": n,
                    "counts": entry["counts"],
                    "binLow": entry["binLow"],
                    "binWidth": entry["binWidth"],
                    "observedMean": entry["observedMean"],
                    "observedSd": entry["observedSd"],
                    "theoreticalSd": entry["theoreticalSd"],
                    "skewness": entry["skewness"],
                },
            )
        )

    return trace(
        id="central-limit-theorem",
        module="M2",
        topics=["2.3.11", "2.4.1", "2.4.2", "2.4.3", "2.4.4"],
        title="Sampling distribution of the mean from an exponential parent",
        seed=alg.SEED,
        determinism=(
            f"mulberry32 seeded {alg.SEED} plus 1000 per sample size; every histogram is "
            "reproducible from the seed printed in the demo"
        ),
        input={
            "parent": data["parentLabel"],
            "populationMean": data["populationMean"],
            "populationSd": data["populationSd"],
            "sampleSizes": sizes,
            "samplesPerSize": data["samples"],
            "bins": data["bins"],
            "range": data["range"],
        },
        columns=[
            column("Sample size n", numeric=True),
            column("Observed mean", numeric=True),
            column("Predicted mean", numeric=True),
            column("Observed spread", numeric=True),
            column("Predicted spread", numeric=True),
            column("Skewness", numeric=True),
        ],
        steps=steps,
        summary={
            "parent": data["parentLabel"],
            "law": "SD of the sample mean equals sigma over the square root of n",
            "skewnessStart": data["series"][0]["skewness"],
            "skewnessEnd": data["series"][-1]["skewness"],
            "spreadStart": data["series"][0]["observedSd"],
            "spreadEnd": data["series"][-1]["observedSd"],
            "series": [
                {
                    "n": e["n"],
                    "observedSd": e["observedSd"],
                    "theoreticalSd": e["theoreticalSd"],
                    "skewness": e["skewness"],
                }
                for e in data["series"]
            ],
        },
        alt_first=(
            "At n = 1 the histogram of sample means is the exponential parent itself: a "
            "tall bar at the left and a long tail to the right, nothing like a bell."
        ),
        alt_last=(
            f"At n = 30 the histogram is symmetric and bell-shaped with skewness "
            f"{data['series'][-1]['skewness']:.2f}, and its spread "
            f"{data['series'][-1]['observedSd']:.3f} matches the predicted sigma over root "
            f"n of {data['series'][-1]['theoreticalSd']:.3f}. The parent was never normal; "
            "the means became normal anyway."
        ),
        notes=[
            "The exponential parent is chosen precisely because it is visibly non-normal, "
            "which is the claim being tested. Skewness replaces the 2025 app's three SciPy "
            "normality tests: it is closed-form, it is one number, and it is the number "
            "that visibly shrinks.",
        ],
    )


def m2_brownian() -> dict:
    """One step per 20-step block of the walk, so playback traces the path out."""
    path = alg.brownian_path(steps=240, dt=0.05, drift=0.0, sigma=1.0, seed=alg.SEED)
    block = 20
    steps: list[Step] = []
    for end in range(block, path["steps"] + 1, block):
        t = end * path["dt"]
        x, y = path["x"][end], path["y"][end]
        radius = math.hypot(x, y)
        rms = path["sigma"] * math.sqrt(2 * t)
        if end == block:
            label = (
                f"After {end} steps ({t:.2f} time units) the particle is at "
                f"({x:.2f}, {y:.2f}), {radius:.2f} from the origin. Each step is an "
                "independent normal displacement on each axis, so the walk has no memory "
                "of its direction."
            )
        else:
            previous_radius = math.hypot(path["x"][end - block], path["y"][end - block])
            moved = "further from" if radius > previous_radius else "back towards"
            label = (
                f"After {end} steps ({t:.2f} time units) the particle has wandered "
                f"{moved} the origin, now {radius:.2f} away against {previous_radius:.2f} "
                f"a block ago. Root-mean-square theory predicts {rms:.2f} at this time."
            )
        steps.append(
            Step(
                label=label,
                rows=[
                    [
                        end,
                        round(t, 3),
                        round(x, 4),
                        round(y, 4),
                        round(radius, 4),
                        round(rms, 4),
                    ]
                ],
                state={
                    "step": end,
                    "t": t,
                    "x": x,
                    "y": y,
                    "radius": radius,
                    "rmsTheory": rms,
                    # The path itself lives once, in summary.pathX / summary.pathY.
                    # A step draws summary.pathX.slice(0, state.step + 1). Storing
                    # the prefix on every step made the file five times larger and
                    # gave the demo two copies of the same numbers to disagree about.
                    "pathThrough": end,
                },
            )
        )

    return trace(
        id="brownian-motion",
        module="M2",
        topics=["2.6.1", "2.6.2", "2.6.3", "2.6.8"],
        title="A 240-step two-dimensional Brownian path",
        seed=alg.SEED,
        determinism=f"mulberry32 seeded {alg.SEED}, Box-Muller for the normal draws",
        input={
            "steps": path["steps"],
            "dt": path["dt"],
            "drift": path["drift"],
            "sigma": path["sigma"],
            "totalTime": path["totalTime"],
            "start": [0, 0],
        },
        columns=[
            column("Step", numeric=True),
            column("Time", unit="units", numeric=True),
            column("x", numeric=True),
            column("y", numeric=True),
            column("Distance from origin", numeric=True),
            column("Predicted RMS distance", numeric=True),
        ],
        steps=steps,
        summary={
            "finalDisplacement": path["displacement"],
            "rmsTheory": path["rmsTheory"],
            "meanTheory": path["meanTheory"],
            "maxRadius": path["maxRadius"],
            "totalTime": path["totalTime"],
            "law": "typical displacement grows as the square root of time, not linearly",
            "pathX": [round(v, 5) for v in path["x"]],
            "pathY": [round(v, 5) for v in path["y"]],
        },
        alt_first=(
            "The particle starts at the origin and, over the first 20 steps, drifts a short "
            "distance in no consistent direction."
        ),
        alt_last=(
            f"After 240 steps the particle ends {path['displacement']:.2f} units from the "
            f"origin, having reached {path['maxRadius']:.2f} at its furthest. The "
            f"root-mean-square prediction for this elapsed time is {path['rmsTheory']:.2f}: "
            "a single path scatters around that value rather than tracking it."
        ),
        notes=[
            "The 2025 simulator's 'theoretical distance' was sqrt(2 sigma T), which is "
            "dimensionally wrong — sigma is not squared. Both defensible quantities are "
            "reported and each is labelled with what it measures: RMS displacement "
            "sigma*sqrt(2t), and mean displacement sigma*sqrt(pi t / 2).",
        ],
    )


def m2_prng_quality() -> dict:
    """Bad LCG against a good one, on the lag-1 plot that exposes the lattice."""
    n = 400
    bad = alg.lcg_sequence(alg.BAD_LCG["a"], alg.BAD_LCG["c"], alg.BAD_LCG["m"],
                           alg.BAD_LCG["x0"], n)
    good = alg.lcg_sequence(alg.GOOD_LCG["a"], alg.GOOD_LCG["c"], alg.GOOD_LCG["m"],
                            alg.GOOD_LCG["x0"], n)

    def period(spec: dict) -> int:
        """The exact cycle length, found by iterating until a state repeats.

        Measured rather than asserted. x -> (7x + 3) mod 1000 from x0 = 1 has a
        period of 20, not the 1000 its modulus suggests — the multiplier and the
        increment matter far more than the modulus, which is the whole lesson.
        """
        seen, x, count = set(), spec["x0"], 0
        while x not in seen and count <= 5_000_000:
            seen.add(x)
            x = (spec["a"] * x + spec["c"]) % spec["m"]
            count += 1
        if count <= 5_000_000:
            return count
        # Too long to walk. The Hull-Dobell theorem gives the answer in closed
        # form: an LCG has full period m when c is coprime to m, a-1 is divisible
        # by every prime factor of m, and a-1 is divisible by 4 if m is.
        a, c, m = spec["a"], spec["c"], spec["m"]
        if math.gcd(c, m) == 1 and (a - 1) % 2 == 0 and (m % 4 != 0 or (a - 1) % 4 == 0):
            return m
        return -1

    def lattice_segments(values: list[float], a: int) -> int:
        """How many parallel segments the lag-1 pairs fall on inside the unit square.

        y = (a*x + c/m) reduced mod 1 wraps `a` times as x sweeps 0 to 1, so the
        pairs sit on exactly `a` parallel segments. Counting the distinct integer
        parts turns "it looks like a grid" into a number.
        """
        return len({int(a * v) for v in values[:-1]})

    def stats(values: list[float]) -> dict:
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
        pairs = list(zip(values, values[1:]))
        pm = sum(a for a, _ in pairs) / len(pairs)
        pn = sum(b for _, b in pairs) / len(pairs)
        cov = sum((a - pm) * (b - pn) for a, b in pairs) / len(pairs)
        sa = math.sqrt(sum((a - pm) ** 2 for a, _ in pairs) / len(pairs))
        sb = math.sqrt(sum((b - pn) ** 2 for _, b in pairs) / len(pairs))
        return {
            "mean": mean,
            "sd": math.sqrt(variance),
            "lag1Correlation": cov / (sa * sb) if sa > 0 and sb > 0 else 0.0,
            "distinctValues": len(set(values)),
        }

    bad_stats, good_stats = stats(bad), stats(good)
    bad_period, good_period = period(alg.BAD_LCG), period(alg.GOOD_LCG)
    bad_segments = lattice_segments(bad, alg.BAD_LCG["a"])

    steps = [
        Step(
            label=(
                f"The weak generator {alg.BAD_LCG['label']} produces {n} draws whose mean is "
                f"{bad_stats['mean']:.3f} and whose spread is {bad_stats['sd']:.3f} — both "
                "close to what a uniform sample should give. Judged on summary statistics "
                "alone it would pass."
            ),
            rows=[
                ["weak LCG", alg.BAD_LCG["label"], round(bad_stats["mean"], 4),
                 round(bad_stats["sd"], 4), round(bad_stats["lag1Correlation"], 4),
                 bad_stats["distinctValues"], alg.BAD_LCG["m"]]
            ],
            state={"generator": "bad", "values": [round(v, 6) for v in bad], **bad_stats},
        ),
        Step(
            label=(
                "Plotting each value against the next one exposes it. The successor is an "
                f"exact linear function of the predecessor, so the pairs fall on "
                f"{bad_segments} parallel segments — and worse, the whole sequence cycles "
                f"after {bad_period} values, so those {n} draws are only "
                f"{bad_stats['distinctValues']} distinct numbers repeated over and over."
            ),
            rows=[
                ["weak LCG, lag-1 view",
                 f"pairs lie on {bad_segments} parallel segments; period {bad_period}",
                 round(bad_stats["mean"], 4), round(bad_stats["sd"], 4),
                 round(bad_stats["lag1Correlation"], 4), bad_stats["distinctValues"],
                 alg.BAD_LCG["m"]]
            ],
            # The lag-1 pairs are just zip(values, values[1:]) — derived in the
            # demo rather than shipped, which halves the file.
            state={"generator": "bad", "view": "lag1", "lag": 1},
        ),
        Step(
            label=(
                f"The Numerical Recipes generator {alg.GOOD_LCG['label']} gives "
                f"{good_stats['distinctValues']} distinct values in {n} draws and a lag-1 "
                f"plot with no visible structure; its period is {good_period:,}. Same family "
                "of algorithm, vastly better constants — the quality is entirely in the "
                "choice of a, c and m, not in the method."
            ),
            rows=[
                ["strong LCG", alg.GOOD_LCG["label"], round(good_stats["mean"], 4),
                 round(good_stats["sd"], 4), round(good_stats["lag1Correlation"], 4),
                 good_stats["distinctValues"], alg.GOOD_LCG["m"]]
            ],
            state={
                "generator": "good",
                "values": [round(v, 6) for v in good],
                **good_stats,
            },
        ),
    ]

    return trace(
        id="prng-quality",
        module="M2",
        topics=["2.2.2", "2.2.3", "2.2.5", "2.2.6", "2.2.7"],
        title="A weak and a strong linear congruential generator, side by side",
        seed=1,
        determinism="both generators start from x0 = 1; an LCG is fully determined by a, c, m and x0",
        input={
            "n": n,
            "weak": alg.BAD_LCG,
            "strong": {k: v for k, v in alg.GOOD_LCG.items()},
        },
        columns=[
            column("Generator"),
            column("Recurrence"),
            column("Mean", numeric=True),
            column("Standard deviation", numeric=True),
            column("Lag-1 correlation", numeric=True),
            column("Distinct values", numeric=True),
            column("Modulus", numeric=True),
        ],
        steps=steps,
        summary={
            "lesson": (
                "Summary statistics cannot tell a good generator from a bad one; the lag-1 "
                "scatter and the period can."
            ),
            "weakSegments": bad_segments,
            "weakPeriod": bad_period,
            "weakModulus": alg.BAD_LCG["m"],
            "weakDistinct": bad_stats["distinctValues"],
            "strongPeriod": good_period,
            "strongDistinct": good_stats["distinctValues"],
        },
        alt_first=(
            "The weak generator's 400 draws spread across the unit interval with a mean "
            "near one half — by that measure alone it looks acceptable."
        ),
        alt_last=(
            f"The strong generator's lag-1 scatter fills the unit square evenly with "
            f"{good_stats['distinctValues']} distinct values, while the weak one collapses "
            f"onto {bad_segments} parallel segments and cycles after only {bad_period} "
            f"values despite a modulus of {alg.BAD_LCG['m']}. The difference is the "
            "constants, not the method."
        ),
        notes=[
            "The 2025 RNG lab's 'System Time' generator returned the same constant N times. "
            "It is dropped rather than reproduced; the weak-versus-strong LCG contrast "
            "makes the same point and is actually about random number generation.",
        ],
    )


# ---------------------------------------------------------------------------
# M3 — graphs
# ---------------------------------------------------------------------------


def _graph_input(graph: alg.Graph) -> dict:
    return {
        "name": graph.name,
        "nodes": list(graph.nodes),
        "edges": [[u, v, w] for u, v, w in graph.edges],
        "weighted": graph.weighted,
        "positions": {k: list(v) for k, v in graph.pos.items()},
        "layout": "fixed, authored — not force-directed, so every artefact draws the same picture",
    }


def m3_dijkstra() -> dict:
    graph = alg.CAMPUS_GRAPH
    steps = alg.dijkstra_steps(graph, "A")
    path, length = alg.dijkstra_path(graph, "A", "F")
    final = steps[-1].state
    return trace(
        id="dijkstra",
        module="M3",
        topics=["3.5.1", "3.5.2", "3.5.3", "3.5.5", "3.5.6", "3.5.7", "3.5.9"],
        title="Dijkstra from A on the six-node campus graph",
        input={**_graph_input(graph), "source": "A", "target": "F"},
        columns=[
            column("Node"),
            column("Distance", unit="km", numeric=True),
            column("Predecessor"),
            column("Status"),
        ],
        steps=steps,
        summary={
            "source": "A",
            "distances": final["distances"],
            "previous": final["previous"],
            "order": [s.state["current"] for s in steps if s.state.get("current")],
            "pathToF": path,
            "lengthToF": length,
            "pathText": " to ".join(path),
            "greedy": (
                "once a node is fixed its distance never changes again, which is what makes "
                "Dijkstra greedy — and what makes it fail on negative weights"
            ),
        },
        alt_first=(
            "Every node starts at infinity except A at zero. A is the nearest unfixed node, "
            "so it is fixed first and its two edges are relaxed, giving B 4 and C 2."
        ),
        alt_last=(
            f"All six nodes are fixed. The shortest route from A to F runs "
            f"{' to '.join(path)} and totals {length} kilometres — not the direct-looking "
            "A, B, D, F, which costs 15."
        ),
        notes=[
            "A predecessor array is carried through the trace. The 2025 Streamlit view had "
            "none, so its 'find path to target' button could only report a distance; "
            "topic 3.5.7 asks for the path itself.",
            "The argmin breaks ties by node name so the trace is reproducible; a set-based "
            "argmin would reorder between runs.",
        ],
    )


def m3_kruskal() -> dict:
    graph = alg.CAMPUS_GRAPH
    steps = alg.kruskal_steps(graph)
    final = steps[-1].state
    dijkstra_final = alg.dijkstra_steps(graph, "A")[-1].state
    return trace(
        id="kruskal-union-find",
        module="M3",
        topics=["3.6.1", "3.6.2", "3.6.3", "3.6.4", "3.6.5", "3.6.6"],
        title="Kruskal with union-find on the six-node campus graph",
        input={
            **_graph_input(graph),
            "sortedEdges": [
                [u, v, w] for u, v, w in sorted(graph.edges, key=lambda e: (e[2], e[0], e[1]))
            ],
        },
        columns=[
            column("Edge considered", numeric=True),
            column("Edge"),
            column("Weight", unit="km", numeric=True),
            column("Decision"),
            column("Edges in tree", numeric=True),
            column("Tree weight", unit="km", numeric=True),
            column("Components"),
        ],
        steps=steps,
        summary={
            "mst": final["mst"],
            "totalWeight": final["totalWeight"],
            "edgesConsidered": len(steps),
            "edgesRejected": sum(1 for s in steps if s.state["action"] == "rejected"),
            "parent": final["parent"],
            "nodeCount": len(graph.nodes),
            "edgeCount": len(graph.edges),
            "shortestPathTreeDiffers": True,
            "dijkstraDistances": dijkstra_final["distances"],
            "contrast": (
                "the minimum spanning tree and the shortest-path tree from A are different "
                "trees on this graph: the MST minimises total weight, Dijkstra minimises "
                "each individual distance from the source"
            ),
        },
        alt_first=(
            "Edges are sorted by weight. The lightest, B to C at 1 kilometre, joins two "
            "separate components, so it is the first edge of the spanning tree."
        ),
        alt_last=(
            f"The spanning tree has {len(graph.nodes) - 1} edges weighing "
            f"{final['totalWeight']} kilometres in total. "
            f"{sum(1 for s in steps if s.state['action'] == 'rejected')} edge was rejected "
            "for closing a cycle, detected by both endpoints finding the same union-find "
            "root."
        ),
        notes=[
            "Real union-find with path compression and union by rank; the parent array is "
            "in every step's state. The 2025 view called its structure union-find but was a "
            "set-per-node with an O(n) merge, and could not show a parent array at all — "
            "which topic 3.6.5 asks for by name.",
        ],
    )


def m3_bfs() -> dict:
    graph = alg.TRAVERSAL_GRAPH
    steps = alg.bfs_steps(graph, "A")
    order = [s.state["current"] for s in steps]
    dfs_order = [s.state["current"] for s in alg.dfs_steps(graph, "A")]
    return trace(
        id="bfs",
        module="M3",
        topics=["3.3.4", "3.3.5", "3.4.5", "3.4.6", "3.4.7"],
        title="Breadth-first search from A on the seven-node traversal graph",
        input={**_graph_input(graph), "source": "A", "container": "queue (first in, first out)"},
        columns=[
            column("Visit", numeric=True),
            column("Node"),
            column("Distance from A", unit="edges", numeric=True),
            column("Enqueued this step"),
            column("Queue after"),
            column("Visited so far"),
        ],
        steps=steps,
        summary={
            "order": order,
            "orderText": " then ".join(order),
            "dfsOrder": dfs_order,
            "depths": steps[-1].state["depth"],
            "container": "queue",
            "property": (
                "BFS visits every node at distance k before any node at distance k+1, which "
                "is why it finds shortest paths in an unweighted graph"
            ),
        },
        alt_first=(
            "A is dequeued and visited first. Its neighbours B and C are enqueued behind it, "
            "so both will be visited before anything deeper."
        ),
        alt_last=(
            f"All seven nodes are visited in the order {' then '.join(order)}. Every node at "
            "distance one from A comes before every node at distance two — depth-first "
            f"search on the same graph gives {' then '.join(dfs_order)} instead."
        ),
        notes=[
            "BFS and DFS run on the SAME graph from the SAME source, so the two traces are "
            "directly comparable. That comparison is topic 3.4.7 and needs one picture, not "
            "two.",
        ],
    )


def m3_dfs() -> dict:
    graph = alg.TRAVERSAL_GRAPH
    steps = alg.dfs_steps(graph, "A")
    order = [s.state["current"] for s in steps]
    bfs_order = [s.state["current"] for s in alg.bfs_steps(graph, "A")]
    return trace(
        id="dfs",
        module="M3",
        topics=["3.4.1", "3.4.2", "3.4.3", "3.4.6", "3.4.7"],
        title="Depth-first search from A on the seven-node traversal graph",
        input={**_graph_input(graph), "source": "A", "container": "stack (last in, first out)"},
        columns=[
            column("Visit", numeric=True),
            column("Node"),
            column("Pushed this step"),
            column("Stack after, top last"),
            column("Visited so far"),
        ],
        steps=steps,
        summary={
            "order": order,
            "orderText": " then ".join(order),
            "bfsOrder": bfs_order,
            "container": "stack",
            "property": (
                "DFS follows one branch to its end before backtracking, so it reaches deep "
                "nodes early and does not find shortest paths"
            ),
        },
        alt_first=(
            "A is popped from the stack and visited. Its neighbours are pushed in reverse "
            "name order so that B ends up on top and is taken next."
        ),
        alt_last=(
            f"All seven nodes are visited in the order {' then '.join(order)}. Depth-first "
            "search reached the leaf D at its fourth visit, whereas breadth-first search "
            f"({' then '.join(bfs_order)}) finished the whole first level first."
        ),
        notes=[
            "Neighbours are pushed in reverse order so the traversal follows ascending node "
            "names. Without the reversal the order is the mirror image of the one the "
            "lecture writes on the board, and students conclude the demo is broken.",
        ],
    )


# ---------------------------------------------------------------------------
# M4 — convolution
# ---------------------------------------------------------------------------


def m4_convolution() -> dict:
    image = alg.SAMPLE_PATCH
    kernel = alg.KERNELS["sobel-x"]["k"]
    cells = [(2, 2), (2, 3), (3, 3), (5, 4)]
    steps = alg.convolution_worked_steps(image, kernel, cells)
    output = alg.convolve2d(image, kernel, clamp=None)
    return trace(
        id="convolution-worked",
        module="M4",
        topics=["4.4.1", "4.4.10", "4.5.1", "4.5.2", "4.5.3"],
        title="Sobel X convolution worked pixel by pixel on a 7 by 7 patch",
        input={
            "image": image,
            "kernel": kernel,
            "kernelName": alg.KERNELS["sobel-x"]["label"],
            "kernelSum": 0,
            "padding": "edge replicate",
            "cells": [list(c) for c in cells],
        },
        columns=[
            column("Neighbour"),
            column("Pixel value", numeric=True),
            column("Kernel weight", numeric=True),
            column("Product", numeric=True),
        ],
        steps=steps,
        summary={
            "output": [[round(v, 3) for v in row] for row in output],
            "kernelSum": 0,
            "why": (
                "Sobel X weights sum to zero, so a flat neighbourhood gives zero and only a "
                "left-to-right change in brightness produces a non-zero response"
            ),
            "strongestCell": max(
                ((r, c, abs(output[r][c])) for r in range(len(output)) for c in range(len(output[0]))),
                key=lambda t: t[2],
            )[:2],
            "edgeColumn": 3,
        },
        alt_first=(
            "The kernel sits over the bright speck at row 2, column 2. Its nine products "
            "are listed and summed, giving the output value for that one pixel."
        ),
        alt_last=(
            "At row 5, column 4 the neighbourhood spans the boundary between the dark and "
            "the mid-grey region, so the products no longer cancel and the response is "
            "large. Sobel X finds vertical edges because its weights change sign from left "
            "to right."
        ),
        notes=[
            "Edge-replicate padding, not zero padding. Zero padding invents a black border "
            "that every edge detector then finds, and students reasonably ask why their "
            "output has a frame around it.",
            "Sobel is the only kernel named in the M4 slides without being printed "
            "(topic 4.5.3, examined on the final). Every weight is in the table here.",
        ],
    )


def m4_kernels() -> dict:
    """The kernel catalogue as data: values, sums, and what each one does."""
    entries = []
    for slug, spec in alg.KERNELS.items():
        k = spec["k"]
        total = sum(sum(row) for row in k)
        entries.append(
            {
                "id": slug,
                "label": spec["label"],
                "topic": spec["topic"],
                "size": len(k),
                "values": [[round(v, 6) for v in row] for row in k],
                "sum": round(total, 10),
                "sumMeaning": (
                    "sums to 1, so overall brightness is preserved"
                    if abs(total - 1) < 1e-9
                    else "sums to 0, so flat regions go to zero and only change survives"
                    if abs(total) < 1e-9
                    else f"sums to {total:g}, so it changes overall brightness"
                ),
                "effect": spec["effect"],
                "output": [
                    [round(v, 2) for v in row]
                    for row in alg.convolve2d(alg.SAMPLE_PATCH, k)
                ],
            }
        )
    return {
        "schema": SCHEMA,
        "id": "kernels",
        "module": "M4",
        "topics": ["4.4.1", "4.4.4", "4.4.9", "4.4.10", "4.4.11", "4.5.3", "4.5.4"],
        "title": "The nine kernels the course names, with their effect on one test patch",
        "seed": None,
        "determinism": "fixed kernels applied to a fixed 7 by 7 patch",
        "generator": GENERATOR,
        "command": COMMAND,
        "notes": [
            "The kernel sum is the property that predicts the effect and is the one "
            "students are asked about: sums to 1 preserves brightness, sums to 0 finds "
            "change. It is a column in the table rather than something to notice.",
            "The median filter is deliberately NOT here. It is not a convolution and no "
            "kernel of any weights reproduces it — which is exactly why it beats the mean "
            "on salt and pepper (topic 4.4.7).",
        ],
        "patch": alg.SAMPLE_PATCH,
        "median3": [[int(v) for v in row] for row in alg.median_filter(alg.SAMPLE_PATCH, 3)],
        "kernels": entries,
    }


# ---------------------------------------------------------------------------
# M5 — clustering
# ---------------------------------------------------------------------------


def m5_kmeans() -> dict:
    points = list(alg.KMEANS_POINTS)
    steps = alg.kmeans_steps(points, k=3, seed=alg.SEED)
    final = steps[-1].state
    alternative = alg.kmeans_steps(points, k=3, seed=alg.SEED + 1)
    return trace(
        id="kmeans",
        module="M5",
        topics=["5.4.1", "5.4.2", "5.4.3", "5.4.4", "5.4.5", "5.4.6", "5.4.10"],
        title="Lloyd's method with k = 3 on eighteen two-dimensional points",
        seed=alg.SEED,
        determinism=(
            f"Forgy initialisation drawn from mulberry32 seeded {alg.SEED}; changing the "
            "seed changes the starting centroids and is how initialisation sensitivity "
            "(topic 5.4.6) is demonstrated"
        ),
        input={
            "points": [list(p) for p in points],
            "k": 3,
            "initialisation": "Forgy — k distinct data points chosen at random",
            "distance": "Euclidean",
            "stop": "no point changes cluster",
        },
        columns=[
            column("Cluster", numeric=True),
            column("Points in cluster", numeric=True),
            column("Centroid x before", numeric=True),
            column("Centroid y before", numeric=True),
            column("Centroid x after", numeric=True),
            column("Centroid y after", numeric=True),
            column("Distance moved", numeric=True),
        ],
        steps=steps,
        summary={
            "iterations": len(steps),
            "finalCentroids": final["newCentroids"],
            "finalLabels": final["labels"],
            "finalCounts": final["counts"],
            "finalInertia": final["inertia"],
            "inertiaByIteration": [s.state["inertia"] for s in steps],
            "inertiaDrop": steps[0].state["inertia"] - final["inertia"],
            "alternativeSeed": alg.SEED + 1,
            "alternativeIterations": len(alternative),
            "alternativeInertia": alternative[-1].state["inertia"],
            "sameAnswer": alternative[-1].state["counts"] == final["counts"],
            "cost": "each iteration costs n times k distance computations",
        },
        alt_first=(
            "Three data points are chosen as the starting centroids, and every point joins "
            "whichever is nearest. The clusters do not yet match the three visible blobs."
        ),
        alt_last=(
            f"After {len(steps)} iterations no point changes cluster, so Lloyd's method "
            f"stops. The three clusters hold {', '.join(str(c) for c in final['counts'])} "
            f"points and the total squared distance to the centroids has fallen from "
            f"{steps[0].state['inertia']:.1f} to {final['inertia']:.1f}."
        ),
        notes=[
            "Inertia is recomputed every iteration. The 2025 k-means view appended the same "
            "FINAL inertia max_iter times and called it a convergence history, so its curve "
            "was flat by construction.",
            "A second run from seed 4222 is summarised so the demo can state whether the "
            "answer depended on the initialisation without the student having to rerun it.",
        ],
    )


def _linkage_trace(method: str, topics: list[str], nickname: str) -> dict:
    points = list(alg.LINKAGE_POINTS)
    steps, merges = alg.linkage_steps(points, method)
    layout = alg.dendrogram_layout(merges, len(points))
    cuts = {}
    for threshold in (1.0, 2.0, 2.5, 3.0, 4.0):
        groups = alg.cut_dendrogram(merges, len(points), threshold)
        cuts[str(threshold)] = {
            "clusters": len(groups),
            "groups": [[i + 1 for i in g] for g in groups],
        }
    return trace(
        id=f"linkage-{method}",
        module="M5",
        topics=topics,
        title=f"{method.capitalize()} linkage on the twelve-point lecture-note example",
        input={
            "points": [list(p) for p in points],
            "labels": [str(i + 1) for i in range(len(points))],
            "method": method,
            "rule": nickname,
            "metric": "Euclidean",
            "source": (
                "the twelve points of the M5 lecture notes worked example (LN-9), which "
                "exists only in the notes — the P1 deck replaced it with a placeholder"
            ),
        },
        columns=[
            column("Merge", numeric=True),
            column("Cluster A"),
            column("Cluster B"),
            column("Height", numeric=True),
            column("Size after", numeric=True),
            column("Members after"),
            column("Clusters remaining", numeric=True),
        ],
        steps=steps,
        summary={
            "method": method,
            "rule": nickname,
            "merges": [
                {"height": m["height"], "size": m["size"],
                 "members": [i + 1 for i in m["members"]]}
                for m in merges
            ],
            "heights": [m["height"] for m in merges],
            "maxHeight": layout["maxHeight"],
            "leafOrder": [i + 1 for i in layout["order"]],
            "coords": layout["coords"],
            "root": layout["root"],
            "cuts": cuts,
            "reading": (
                "the height of a join is the distance at which those two clusters merged, "
                "so cutting the tree at a height gives the clusters at that resolution"
            ),
        },
        alt_first=(
            f"The first merge joins the two closest points at height "
            f"{merges[0]['height']:.3f}; every point starts as its own cluster."
        ),
        alt_last=(
            f"The last merge joins the final two clusters at height "
            f"{merges[-1]['height']:.3f}, so the whole tree is that tall. Cutting at 2.5 "
            f"leaves {cuts['2.5']['clusters']} clusters; cutting at 4.0 leaves "
            f"{cuts['4.0']['clusters']}."
        ),
        notes=[
            f"Merge heights come from the {method}-linkage definition, so the dendrogram "
            "drawn from these numbers is the same tree the step table describes.",
        ],
    )


def m5_linkage_single() -> dict:
    return _linkage_trace(
        "single", ["5.3.1", "5.3.2", "5.3.5", "5.3.6"], "nearest neighbour: the shortest link"
    )


def m5_linkage_complete() -> dict:
    return _linkage_trace(
        "complete", ["5.3.1", "5.3.3", "5.3.5", "5.3.6"], "farthest neighbour: the longest link"
    )


def m5_linkage_average() -> dict:
    return _linkage_trace(
        "average", ["5.3.1", "5.3.4", "5.3.5", "5.3.6"], "the mean of every link between them"
    )


# ---------------------------------------------------------------------------
# M6 — computational geometry
# ---------------------------------------------------------------------------


def m6_convex_hull() -> dict:
    points = list(alg.GEOMETRY_POINTS)
    steps = alg.convex_hull_steps(points)
    hull = steps[-1].state["hull"]
    perimeter = sum(
        math.dist(points[hull[i]], points[hull[(i + 1) % len(hull)]]) for i in range(len(hull))
    )
    return trace(
        id="convex-hull",
        module="M6",
        topics=["6.4.1", "6.4.2", "6.4.3", "6.2.5"],
        title="Gift wrapping the convex hull of ten points",
        input={
            "points": [list(p) for p in points],
            "labels": [f"P{i + 1}" for i in range(len(points))],
            "start": "the leftmost point, ties broken by the lowest y",
            "direction": "counter-clockwise",
        },
        columns=[
            column("Step", numeric=True),
            column("Standing at"),
            column("Wraps to"),
            column("Candidates tested", numeric=True),
            column("Hull vertices so far", numeric=True),
            column("Result"),
        ],
        steps=steps,
        summary={
            "hull": [f"P{i + 1}" for i in hull],
            "hullIndices": hull,
            "hullSize": len(hull),
            "interior": [f"P{i + 1}" for i in range(len(points)) if i not in hull],
            "interiorCount": len(points) - len(hull),
            "perimeter": perimeter,
            "area": abs(alg.polygon_area([points[i] for i in hull])),
            "testsTotal": sum(s.state["tested"] for s in steps),
            "cost": "O(n times h): one full scan of the points per hull vertex found",
            "boundingBoxArea": (
                (max(p[0] for p in points) - min(p[0] for p in points))
                * (max(p[1] for p in points) - min(p[1] for p in points))
            ),
        },
        alt_first=(
            "The wrap starts at the leftmost point, which must be on the hull, and tests "
            "every other point to find the one with all the rest to its left."
        ),
        alt_last=(
            f"The rope closes on a {len(hull)}-sided polygon; "
            f"{len(points) - len(hull)} of the ten points lie strictly inside it. The hull "
            f"encloses {abs(alg.polygon_area([points[i] for i in hull])):.2f} square units "
            "against the bounding box's "
            f"{((max(p[0] for p in points) - min(p[0] for p in points)) * (max(p[1] for p in points) - min(p[1] for p in points))):.2f} "
            "— which is why the hull, not the box, is the shape of the data."
        ),
    )


def m6_ear_clipping() -> dict:
    polygon = list(alg.EAR_POLYGON)
    steps = alg.ear_clipping_steps(polygon)
    triangles = steps[-1].state["triangles"]
    rejected = sum(1 for s in steps if s.state["action"] == "rejected")
    return trace(
        id="ear-clipping",
        module="M6",
        topics=["6.3.3", "6.3.4", "6.3.5", "6.3.6", "6.3.7", "6.3.8"],
        title="Ear clipping an eight-vertex non-convex polygon",
        input={
            "polygon": [list(p) for p in polygon],
            "labels": [f"V{i + 1}" for i in range(len(polygon))],
            "orientation": "counter-clockwise",
            "area": abs(alg.polygon_area(polygon)),
            "centroid": list(alg.polygon_centroid(polygon)),
        },
        columns=[
            column("Test", numeric=True),
            column("Vertex"),
            column("Interior angle"),
            column("Vertices inside the triangle"),
            column("Decision"),
            column("Candidate triangle"),
            column("Vertices left", numeric=True),
        ],
        steps=steps,
        summary={
            "triangles": [[i + 1 for i in t] for t in triangles],
            "triangleCount": len(triangles),
            "expected": len(polygon) - 2,
            "rejections": rejected,
            "polygonArea": abs(alg.polygon_area(polygon)),
            "triangleAreaSum": sum(
                abs(alg.polygon_area([polygon[i] for i in t])) for t in triangles
            ),
            "theorem": (
                "every simple polygon with more than three vertices has at least two ears, "
                "so this loop can always make progress"
            ),
        },
        alt_first=(
            "The first vertex tested is examined with its two neighbours: the test is "
            "whether the interior angle is convex and whether any other vertex falls inside "
            "the candidate triangle."
        ),
        alt_last=(
            f"Three vertices remain, so they form the final triangle. The eight-vertex "
            f"polygon is cut into {len(triangles)} triangles — always n minus 2 — after "
            f"{rejected} candidate{'s' if rejected != 1 else ''} were rejected for being "
            "reflex or for containing another vertex."
        ),
        notes=[
            "One step per vertex TESTED, not per ear removed. The rejected candidates are "
            "the content: 'polygons have ears' is only interesting once you have watched a "
            "reflex vertex fail the test.",
        ],
    )


def m6_voronoi_delaunay() -> dict:
    points = list(alg.GEOMETRY_POINTS)
    bounds = (0.0, 0.0, 6.2, 6.0)
    cells = alg.voronoi_cells(points, bounds)
    triangles = alg.delaunay_triangulation(points)
    steps = [
        Step(
            label=(
                f"The {len(points)} generators are placed. Every point of the plane belongs "
                "to whichever generator is nearest, and that is the only rule in the "
                "definition."
            ),
            rows=[
                [f"P{i + 1}", round(p[0], 3), round(p[1], 3), "—", "—"]
                for i, p in enumerate(points)
            ],
            state={"view": "sites", "points": [list(p) for p in points]},
        ),
        Step(
            label=(
                f"Cutting the bounding box by the perpendicular bisector against every other "
                f"generator gives {len(cells)} Voronoi cells. They tile the box exactly — the "
                f"areas sum to {sum(c['area'] for c in cells):.2f} against the box's "
                f"{(bounds[2] - bounds[0]) * (bounds[3] - bounds[1]):.2f}."
            ),
            rows=[
                [
                    f"P{c['site'] + 1}",
                    round(points[c["site"]][0], 3),
                    round(points[c["site"]][1], 3),
                    round(c["area"], 4),
                    c["vertices"],
                ]
                for c in cells
            ],
            state={"view": "voronoi", "cells": cells},
        ),
        Step(
            label=(
                f"Joining every pair of generators whose cells share an edge gives the "
                f"Delaunay triangulation: {len(triangles)} triangles, each with an empty "
                "circumcircle. The two diagrams are duals — one is the other read the other "
                "way round."
            ),
            rows=[
                [
                    "-".join(f"P{v + 1}" for v in t["vertices"]),
                    round(t["circumcentre"][0], 3),
                    round(t["circumcentre"][1], 3),
                    round(t["area"], 4),
                    round(t["circumradius"], 4),
                ]
                for t in triangles
            ],
            state={"view": "delaunay", "triangles": triangles},
        ),
    ]
    return trace(
        id="voronoi-delaunay",
        module="M6",
        topics=["5.5.1", "5.5.2", "5.5.3", "6.5.1", "6.5.2", "6.5.3"],
        title="Voronoi cells and their Delaunay dual on ten generators",
        input={
            "points": [list(p) for p in points],
            "labels": [f"P{i + 1}" for i in range(len(points))],
            "bounds": list(bounds),
            "voronoiRule": "each cell is the set of points closer to its generator than to any other",
            "delaunayRule": "a triangle is Delaunay when its circumcircle contains no other generator",
        },
        columns=[
            column("Generator or triangle"),
            column("x or circumcentre x", numeric=True),
            column("y or circumcentre y", numeric=True),
            column("Cell or triangle area", numeric=True),
            column("Cell vertices or circumradius", numeric=True),
        ],
        steps=steps,
        summary={
            "siteCount": len(points),
            "cellCount": len(cells),
            "triangleCount": len(triangles),
            "totalCellArea": sum(c["area"] for c in cells),
            "boxArea": (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]),
            "largestCell": max(cells, key=lambda c: c["area"])["site"] + 1,
            "smallestCell": min(cells, key=lambda c: c["area"])["site"] + 1,
            "duality": (
                "a Voronoi edge between two cells corresponds to a Delaunay edge between "
                "their generators, and a Voronoi vertex is a Delaunay circumcentre"
            ),
            "cells": cells,
            "triangles": triangles,
        },
        alt_first=(
            "Ten generators are scattered across a six-by-six region, with the interior "
            "ones clustered a little more tightly than the ring around them."
        ),
        alt_last=(
            f"The Delaunay dual has {len(triangles)} triangles. Generator "
            f"{max(cells, key=lambda c: c['area'])['site'] + 1} owns the largest cell "
            "because it is the most isolated; the generators near the middle own the "
            "smallest ones."
        ),
        notes=[
            "Delaunay is computed by testing the empty-circumcircle property on every "
            "triple. That is O(n^4) and useless at scale, and exactly right here: it IS the "
            "definition, so the code can be checked against the slide.",
            "Voronoi cells come from clipping the bounding box by perpendicular bisectors, "
            "so the cells provably tile the box — asserted in algorithms.py's self-check.",
        ],
    )


# ---------------------------------------------------------------------------
# M7 — LP and simplex
# ---------------------------------------------------------------------------


def m7_simplex() -> dict:
    problem = alg.SIMPLEX_EXAMPLE
    steps = alg.simplex_steps(problem)
    names = alg.simplex_variable_names(problem)
    final = steps[-1].state
    return trace(
        id="simplex-tableau",
        module="M7",
        topics=[
            "7.4.1", "7.4.2", "7.4.4", "7.4.6", "7.5.1", "7.5.3", "7.5.4",
            "7.5.5", "7.5.6", "7.5.7", "7.5.8", "7.5.9", "7.5.10",
        ],
        title="Simplex on the two-product plant, three tableaus to the optimum",
        input={
            "objective": "maximise z = 120 x1 + 100 x2",
            "constraints": [
                "2 x1 + 2 x2 + x3 = 8",
                "5 x1 + 3 x2 + x4 = 15",
                "x1, x2, x3, x4 >= 0",
            ],
            "slackVariables": problem["slackNames"],
            "vertices": [[0, 0], [3, 0], [1.5, 2.5], [0, 4]],
            "source": "the running example of the M7 slides, P2 frame 2 and P3 frames 11 to 26",
        },
        columns=[column("Basic variable")]
        + [column(n, numeric=True) for n in names]
        + [column("Right-hand side", numeric=True)],
        steps=steps,
        summary={
            "optimal": final.get("optimal", False),
            "solution": final.get("solution"),
            "z": final.get("z"),
            "pivots": sum(1 for s in steps if s.state.get("pivot")),
            "path": [
                (
                    f"({s.state['solution'][problem['variableNames'][0]]}, "
                    f"{s.state['solution'][problem['variableNames'][1]]})"
                )
                for s in steps
                if "solution" in s.state
            ],
            "zByStep": [s.state["z"] for s in steps if "z" in s.state],
            "enteringRule": "most negative objective coefficient, lowest index on a tie (Bland's rule)",
            "departingRule": "smallest positive ratio of right-hand side to entering-column coefficient",
            "optimalityTest": "no negative coefficient remains in the objective row",
            "exact": True,
        },
        alt_first=(
            "The initial tableau sets both decision variables to zero, which makes the two "
            "slack variables basic at 8 and 15 — the corner (0, 0) where z is 0."
        ),
        alt_last=(
            f"The objective row has no negative coefficient left, so the tableau is optimal: "
            f"x1 = {final['solution']['x1']}, x2 = {final['solution']['x2']}, z = "
            f"{final['z']}. Simplex reached it in "
            f"{sum(1 for s in steps if s.state.get('pivot'))} pivots, visiting three of the "
            "four corners rather than evaluating all of them."
        ),
        notes=[
            "Exact rational arithmetic. The slides print 3/5 and 4/5 and -2/5; a float "
            "tableau prints 0.6000000000000001 and a student checking their own arithmetic "
            "against it concludes they are wrong.",
            "Every tableau here matches the ones in the slide deck (T10 through T16), "
            "including the intermediate z = 360 at the corner (3, 0).",
        ],
    )


def m7_lp_graphical() -> dict:
    problem = alg.LP_FURNITURE
    vertices = alg.lp_vertices(problem)
    steps: list[Step] = []
    for i, v in enumerate(vertices):
        if i == 0:
            label = (
                f"Vertex ({v['x']:g}, {v['y']:g}) is where {v['from'][0]} meets "
                f"{v['from'][1]}. The objective 40x + 30y is worth {v['z']:g} here — the "
                "largest value of the four, so this corner is the optimum."
            )
        else:
            label = (
                f"Vertex ({v['x']:g}, {v['y']:g}), where {v['from'][0]} meets "
                f"{v['from'][1]}, is worth {v['z']:g} — {vertices[0]['z'] - v['z']:g} less "
                f"than the best corner."
            )
        steps.append(
            Step(
                label=label,
                rows=[
                    [
                        f"({v['x']:g}, {v['y']:g})",
                        v["from"][0],
                        v["from"][1],
                        round(v["z"], 4),
                        "optimal" if v["optimal"] else "feasible",
                    ]
                ],
                state={"vertex": [v["x"], v["y"]], "z": v["z"], "optimal": v["optimal"]},
            )
        )
    return trace(
        id="lp-graphical",
        module="M7",
        topics=["7.1.1", "7.2.4", "7.2.5", "7.2.6", "7.3.1", "7.3.2", "7.4.6", "7.4.9"],
        title="The furniture factory LP solved by checking every feasible corner",
        input={
            "objective": "maximise z = 40x + 30y",
            "constraints": ["2x + y <= 10", "x + y <= 6", "x >= 0", "y >= 0"],
            "variables": problem["variableNames"],
            "bounds": problem["bounds"],
        },
        columns=[
            column("Vertex"),
            column("First boundary"),
            column("Second boundary"),
            column("Objective z", numeric=True),
            column("Verdict"),
        ],
        steps=steps,
        summary={
            "vertices": [
                {"x": v["x"], "y": v["y"], "z": v["z"], "optimal": v["optimal"]}
                for v in vertices
            ],
            "optimum": {"x": vertices[0]["x"], "y": vertices[0]["y"], "z": vertices[0]["z"]},
            "vertexCount": len(vertices),
            "principle": (
                "a linear objective on a convex feasible region always attains its optimum "
                "at a vertex, so checking the corners is enough"
            ),
            "whySimplex": (
                "four corners is nothing; a problem with 20 variables and 20 constraints has "
                "over 100 billion candidate basic solutions, which is why simplex walks from "
                "corner to improving corner instead of enumerating them"
            ),
        },
        alt_first=(
            "The feasible region is a quadrilateral bounded by the two constraint lines and "
            "the axes. Its best corner, where the two constraints cross, is worth 220."
        ),
        alt_last=(
            f"All {len(vertices)} feasible corners have been evaluated. The optimum is "
            f"({vertices[0]['x']:g}, {vertices[0]['y']:g}) with z = {vertices[0]['z']:g}; "
            "the origin is worth 0 and neither single-axis corner beats the crossing point."
        ),
    )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

TRACES: dict[str, callable] = {
    "m1/selection-sort-trace.json": m1_selection_sort,
    "m1/bubble-sort-trace.json": m1_bubble_sort,
    "m1/binary-search-trace.json": m1_binary_search,
    "m1/growth-rates.json": m1_growth_rates,
    "m2/monte-carlo-pi-trace.json": m2_monte_carlo_pi,
    "m2/central-limit-theorem-trace.json": m2_clt,
    "m2/brownian-motion-trace.json": m2_brownian,
    "m2/prng-quality-trace.json": m2_prng_quality,
    "m3/dijkstra-trace.json": m3_dijkstra,
    "m3/kruskal-trace.json": m3_kruskal,
    "m3/bfs-trace.json": m3_bfs,
    "m3/dfs-trace.json": m3_dfs,
    "m4/convolution-trace.json": m4_convolution,
    "m4/kernels.json": m4_kernels,
    "m5/kmeans-trace.json": m5_kmeans,
    "m5/linkage-single-trace.json": m5_linkage_single,
    "m5/linkage-complete-trace.json": m5_linkage_complete,
    "m5/linkage-average-trace.json": m5_linkage_average,
    "m6/convex-hull-trace.json": m6_convex_hull,
    "m6/ear-clipping-trace.json": m6_ear_clipping,
    "m6/voronoi-delaunay-trace.json": m6_voronoi_delaunay,
    "m7/simplex-trace.json": m7_simplex,
    "m7/lp-graphical-trace.json": m7_lp_graphical,
}


def generate(data_root: Path = DATA, only: str | None = None) -> list[tuple[Path, bool]]:
    """Write every trace. Returns (path, changed) so build.py can report honestly."""
    written = []
    for relative, builder in TRACES.items():
        if only and only not in relative:
            continue
        payload = builder()
        target = data_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        # sort_keys=False keeps the envelope in reading order; the content is
        # deterministic either way, so the diff is stable.
        content = json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
        changed = not target.exists() or target.read_text(encoding="utf-8") != content
        if changed:
            target.write_text(content, encoding="utf-8")
        written.append((target, changed))
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--list", action="store_true", help="list the traces and exit")
    parser.add_argument("--only", help="regenerate only paths containing this substring")
    args = parser.parse_args()

    if args.list:
        for relative in TRACES:
            print(relative)
        return 0

    results = generate(only=args.only)
    changed = sum(1 for _, c in results if c)
    for path, was_changed in results:
        print(f"  {'wrote  ' if was_changed else 'ok     '} {path.relative_to(ROOT)}")
    print(f"\n{len(results)} traces, {changed} changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
