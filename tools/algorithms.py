"""algorithms.py — the deterministic course algorithms, shared by every generator.

    Regenerate everything:  python3 Dashboard/tools/build.py
    Self-check this file:   python3 Dashboard/tools/algorithms.py

Shared helper, not a generator. ``generate_figures.py``, ``generate_traces.py``
and ``generate_datasets.py`` all import from here.

--------------------------------------------------------------------------
WHY ONE MODULE
--------------------------------------------------------------------------
AUTHORING-CONTRACT §6.4 requires that the figure, the data table and the live
text summary of a demo agree on every step. The cheapest way to guarantee that
is to compute each trace exactly once and let the figure and the table both
read it. So the algorithms live here, the traces are their JSON serialisation,
and the figures draw from the same objects — no algorithm is implemented twice.

--------------------------------------------------------------------------
DETERMINISM
--------------------------------------------------------------------------
Nothing here reads the clock, the environment, or ``random``. Every sampled
quantity comes from :class:`Mulberry32`, which is a bit-exact port of
``seededRandom()`` in ``Dashboard/assets/js/demo.js``.

That matters more than it looks. A student who opens the k-means demo, types
seed 4221 and presses Play must see the same iterations as the precomputed
trace, the shipped SVG and the alt text. If Python and JavaScript disagree in
the last bit, three artefacts that claim to describe one run describe three.

``build.py --check`` re-runs the JS generator through node when node is present
and compares the first 64 draws; if node is absent it reports that the check
was skipped rather than pretending it passed.

--------------------------------------------------------------------------
FIDELITY TO THE COURSE
--------------------------------------------------------------------------
Where the 2025 sources contain a defect, the recon notes say so and this module
implements the CORRECT version — with a comment naming the defect, so nobody
"fixes" it back. Where the 2025 sources are merely unusual (the selection-sort
step message reading state after the swap; Kruskal's set-identity merge), the
teaching value is in the quirk and it is kept, also with a comment.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from fractions import Fraction

# ---------------------------------------------------------------------------
# 1. The PRNG — bit-exact with demo.js seededRandom()
# ---------------------------------------------------------------------------

_U32 = 0xFFFFFFFF


class Mulberry32:
    """Port of ``seededRandom()`` from ``Dashboard/assets/js/demo.js``.

    The JS runs on doubles but every operator in the chain (``>>>``, ``|``,
    ``^``, ``Math.imul``) truncates to 32 bits, so carrying the state as an
    unsigned 32-bit integer reproduces the same bit pattern exactly. The one
    subtlety is ``a += 0x6d2b79f5``: in JS ``a`` grows past 2**32 as a float,
    but every consumer of it truncates mod 2**32, so masking here is equivalent.
    """

    def __init__(self, seed: int):
        self.seed = int(seed)
        self.a = (int(seed) & _U32) or 1

    @staticmethod
    def _imul(x: int, y: int) -> int:
        return (x * y) & _U32

    def next(self) -> float:
        """Uniform in [0, 1)."""
        self.a = (self.a + 0x6D2B79F5) & _U32
        t = self.a
        t = self._imul(t ^ (t >> 15), t | 1)
        t = (t ^ (t + self._imul(t ^ (t >> 7), t | 61))) & _U32
        return ((t ^ (t >> 14)) & _U32) / 4294967296.0

    # -- convenience, all built on next() so the stream stays reproducible --

    def uniform(self, lo: float, hi: float) -> float:
        return lo + (hi - lo) * self.next()

    def randint(self, lo: int, hi: int) -> int:
        """Inclusive on both ends."""
        return lo + int(self.next() * (hi - lo + 1))

    def normal(self, mu: float = 0.0, sigma: float = 1.0) -> float:
        """Box-Muller, using two draws. Deterministic given the seed."""
        u1 = max(self.next(), 1e-12)
        u2 = self.next()
        return mu + sigma * math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)

    def exponential(self, scale: float = 1.0) -> float:
        return -scale * math.log(max(self.next(), 1e-12))

    def choice(self, items):
        return items[int(self.next() * len(items))]

    def shuffled(self, items: list) -> list:
        """Fisher-Yates on a copy."""
        out = list(items)
        for i in range(len(out) - 1, 0, -1):
            j = int(self.next() * (i + 1))
            out[i], out[j] = out[j], out[i]
        return out


# The seed used by every artefact in this pipeline unless a generator says
# otherwise. 4221 is the course number; it is recorded in every JSON file so a
# student can retype it into the demo and get the identical run.
SEED = 4221


# ---------------------------------------------------------------------------
# 2. A trace step
# ---------------------------------------------------------------------------


@dataclass
class Step:
    """One step of an algorithm trace.

    ``label`` is what ``steps.label(model, i)`` returns in demo.js. It states
    the DELTA — what changed this step — because the same sentence describing
    two consecutive steps is the defect alt-text-style-guide.md §4a exists to
    prevent. ``rows`` matches the trace's ``columns`` and becomes the table.
    """

    label: str
    rows: list[list[object]] = field(default_factory=list)
    state: dict = field(default_factory=dict)
    alt: str = ""  # per-step figure description, if the step has a figure


# ---------------------------------------------------------------------------
# 3. M1 — sorting, searching, growth rates
# ---------------------------------------------------------------------------


#: The eight-value array every M1 artefact sorts and searches. Eight is the 2025
#: default: small enough that every step fits on one screen, unsorted enough that
#: bubble sort needs many more steps than selection sort. Fixed here so the
#: figure, the trace and the fallback table are provably the same eight numbers.
SORT_ARRAY: list[int] = [64, 25, 12, 22, 11, 90, 45, 30]


def selection_sort_steps(values: list[int]) -> list[Step]:
    """Selection sort, one step per outer iteration.

    Matches the 2025 Brute Force Sorting Visualizer, including the quirk that
    the step message is composed AFTER the swap, so it names the values in
    their new positions. That is how the app reads and how the lecture demo
    reads; the wording here says "now holds" so the reading is unambiguous
    rather than merely inherited.
    """
    arr = list(values)
    n = len(arr)
    steps: list[Step] = []
    comparisons = 0
    swaps = 0

    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            comparisons += 1
            if arr[j] < arr[min_idx]:
                min_idx = j
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
            swaps += 1
            label = (
                f"Pass {i + 1}: the smallest unsorted value is {arr[i]} at index {min_idx}; "
                f"it swaps into index {i}, which sends {arr[min_idx]} to index {min_idx}."
            )
        else:
            label = (
                f"Pass {i + 1}: index {i} already holds the smallest unsorted value "
                f"({arr[i]}), so no swap is needed."
            )
        steps.append(
            Step(
                label=label,
                rows=[[k, v, _sort_status(k, i)] for k, v in enumerate(arr)],
                state={
                    "array": list(arr),
                    "pass": i + 1,
                    "pivot": i,
                    "minIndex": min_idx,
                    "swapped": min_idx != i,
                    "comparisons": comparisons,
                    "swaps": swaps,
                    "sortedUpTo": i,
                },
            )
        )
    return steps


def _sort_status(index: int, boundary: int) -> str:
    if index < boundary:
        return "sorted"
    if index == boundary:
        return "just placed"
    return "unsorted"


def bubble_sort_steps(values: list[int]) -> list[Step]:
    """Bubble sort, one step PER SWAP, with the early exit on a clean pass.

    Also matches the 2025 app. The per-swap granularity is the point: it is
    what makes the O(n^2) step count visible next to selection sort's n-1.
    """
    arr = list(values)
    n = len(arr)
    steps: list[Step] = []
    comparisons = 0
    swaps = 0
    passes = 0

    for i in range(n):
        swapped = False
        passes = i + 1
        for j in range(0, n - i - 1):
            comparisons += 1
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
                swaps += 1
                steps.append(
                    Step(
                        label=(
                            f"Pass {i + 1}, comparison at index {j}: {arr[j + 1]} was larger "
                            f"than {arr[j]}, so the pair swaps and {arr[j + 1]} moves one "
                            "place to the right."
                        ),
                        rows=[[k, v, _bubble_status(k, j, n - i - 1)] for k, v in enumerate(arr)],
                        state={
                            "array": list(arr),
                            "pass": i + 1,
                            "compareAt": j,
                            "comparisons": comparisons,
                            "swaps": swaps,
                            "sortedFrom": n - i,
                        },
                    )
                )
        if not swapped:
            steps.append(
                Step(
                    label=(
                        f"Pass {i + 1} made no swaps, so the array is already in order and "
                        "bubble sort stops early."
                    ),
                    rows=[[k, v, "sorted"] for k, v in enumerate(arr)],
                    state={
                        "array": list(arr),
                        "pass": i + 1,
                        "compareAt": -1,
                        "comparisons": comparisons,
                        "swaps": swaps,
                        "sortedFrom": 0,
                        "earlyExit": True,
                    },
                )
            )
            break
    for step in steps:
        step.state["passes"] = passes
    return steps


def _bubble_status(index: int, compare_at: int, tail: int) -> str:
    if index >= tail:
        return "sorted"
    if index in (compare_at, compare_at + 1):
        return "just swapped"
    return "unsorted"


def sequential_search_steps(arr: list[int], target: int) -> list[Step]:
    """Linear scan. O(n): the number of steps is the answer's index plus one."""
    steps: list[Step] = []
    for i, value in enumerate(arr):
        found = value == target
        steps.append(
            Step(
                label=(
                    f"Step {i + 1}: look at index {i}, which holds {value}. "
                    + (
                        f"It equals the target {target}, so the search stops here after "
                        f"{i + 1} comparisons."
                        if found
                        else f"It is not {target}, so move one place right."
                    )
                ),
                rows=[[i, value, "match" if found else "no match", i + 1]],
                state={"index": i, "value": value, "found": found, "comparisons": i + 1},
            )
        )
        if found:
            break
    else:
        steps.append(
            Step(
                label=(
                    f"The scan reached the end without finding {target}; "
                    f"a linear search costs all {len(arr)} comparisons to prove absence."
                ),
                rows=[[len(arr) - 1, arr[-1], "not found", len(arr)]],
                state={"index": -1, "found": False, "comparisons": len(arr)},
            )
        )
    return steps


def binary_search_steps(arr: list[int], target: int) -> list[Step]:
    """Iterative binary search on a sorted array. Halves the window each step."""
    left, right = 0, len(arr) - 1
    steps: list[Step] = []
    comparisons = 0

    while left <= right:
        mid = (left + right) // 2
        comparisons += 1
        window = right - left + 1
        if arr[mid] == target:
            label = (
                f"Step {comparisons}: the window is indices {left} to {right} "
                f"({window} values); the midpoint index {mid} holds {arr[mid]}, which is the "
                f"target. Found after {comparisons} comparisons."
            )
            steps.append(
                Step(
                    label=label,
                    rows=[[comparisons, left, mid, right, arr[mid], "equal", window]],
                    state={
                        "left": left, "mid": mid, "right": right, "value": arr[mid],
                        "verdict": "equal", "window": window, "comparisons": comparisons,
                        "found": True,
                    },
                )
            )
            break
        if arr[mid] < target:
            verdict = "too small"
            label = (
                f"Step {comparisons}: the window is indices {left} to {right} "
                f"({window} values); the midpoint index {mid} holds {arr[mid]}, below the "
                f"target {target}, so the left half is discarded and the window becomes "
                f"{mid + 1} to {right}."
            )
            steps.append(
                Step(
                    label=label,
                    rows=[[comparisons, left, mid, right, arr[mid], verdict, window]],
                    state={
                        "left": left, "mid": mid, "right": right, "value": arr[mid],
                        "verdict": verdict, "window": window, "comparisons": comparisons,
                        "found": False,
                    },
                )
            )
            left = mid + 1
        else:
            verdict = "too large"
            label = (
                f"Step {comparisons}: the window is indices {left} to {right} "
                f"({window} values); the midpoint index {mid} holds {arr[mid]}, above the "
                f"target {target}, so the right half is discarded and the window becomes "
                f"{left} to {mid - 1}."
            )
            steps.append(
                Step(
                    label=label,
                    rows=[[comparisons, left, mid, right, arr[mid], verdict, window]],
                    state={
                        "left": left, "mid": mid, "right": right, "value": arr[mid],
                        "verdict": verdict, "window": window, "comparisons": comparisons,
                        "found": False,
                    },
                )
            )
            right = mid - 1
    else:
        steps.append(
            Step(
                label=(
                    f"The window is empty, so {target} is not in the array. "
                    f"Binary search proved that in {comparisons} comparisons."
                ),
                rows=[[comparisons, left, -1, right, "—", "absent", 0]],
                state={"found": False, "comparisons": comparisons},
            )
        )
    return steps


#: The six complexity classes of topic 1.4.5, each with a closed form and the
#: dash/marker channel it uses in a figure.
COMPLEXITY_CLASSES: tuple[tuple[str, str], ...] = (
    ("O(1)", "constant"),
    ("O(log n)", "logarithmic"),
    ("O(n)", "linear"),
    ("O(n log n)", "linearithmic"),
    ("O(n^2)", "quadratic"),
    ("O(2^n)", "exponential"),
)


def complexity_value(name: str, n: float) -> float:
    """Operation count for a complexity class at input size *n*.

    ``O(2^n)`` overflows a float above n ~= 1024 and is a ~3011-digit integer at
    n = 10000, which is exactly the crash the 2025 Big-O Explorer shipped with.
    It returns ``math.inf`` past the representable range instead, and the table
    prints "beyond 1e308" — an honest answer that also makes the point.
    """
    if name == "O(1)":
        return 1.0
    if name == "O(log n)":
        return math.log2(n) if n > 1 else 0.0
    if name == "O(n)":
        return float(n)
    if name == "O(n log n)":
        return n * math.log2(n) if n > 1 else 0.0
    if name == "O(n^2)":
        return float(n) ** 2
    if name == "O(2^n)":
        return float(2.0 ** n) if n < 1024 else math.inf
    raise ValueError(f"unknown complexity class {name!r}")


def human_duration(seconds: float) -> str:
    """Seconds -> the phrase the slides use ("seconds to centuries")."""
    if not math.isfinite(seconds):
        return "beyond a lifetime"
    units = (
        (1, "second", 1.0),
        (60, "minute", 60.0),
        (60, "hour", 3600.0),
        (24, "day", 86400.0),
        (365.25, "year", 31_557_600.0),
        (100, "century", 3_155_760_000.0),
    )
    if seconds < 1:
        return f"{seconds:.3g} s"
    best_name, best_size = "second", 1.0
    for _, name, size in units:
        if seconds >= size:
            best_name, best_size = name, size
    value = seconds / best_size
    plural = "" if abs(value - 1) < 1e-9 else "s"
    if value >= 1000:
        return f"{value:.3g} {best_name}{plural}"
    return f"{value:.3g} {best_name}{plural}"


# ---------------------------------------------------------------------------
# 4. M2 — Monte Carlo, CLT, Brownian motion, LCG
# ---------------------------------------------------------------------------


def monte_carlo_pi(n: int, seed: int = SEED) -> dict:
    """Area-ratio pi estimate on the square [-1, 1]^2.

    Returns the points as well as the estimate so the figure, the table and the
    text all describe the same sample. ``inside`` is a real boolean, and the
    figure encodes it with a marker SHAPE as well as a colour — the 2025 app
    used red/blue fill alone, which is the 1.4.1 failure the audit names.
    """
    rng = Mulberry32(seed)
    points = []
    inside = 0
    for _ in range(n):
        x = rng.uniform(-1.0, 1.0)
        y = rng.uniform(-1.0, 1.0)
        hit = x * x + y * y <= 1.0
        inside += 1 if hit else 0
        points.append((x, y, hit))
    estimate = 4.0 * inside / n
    p_hat = inside / n
    se = math.sqrt(max(p_hat * (1 - p_hat), 0.0) / n)
    return {
        "n": n,
        "seed": seed,
        "points": points,
        "inside": inside,
        "outside": n - inside,
        "estimate": estimate,
        "error": abs(estimate - math.pi),
        "ratio": p_hat,
        # z from the 2025 app's dropdown: 90% 1.645, 95% 1.96, 99% 2.576.
        "ci95": (4 * (p_hat - 1.96 * se), 4 * (p_hat + 1.96 * se)),
        "ciContainsPi": 4 * (p_hat - 1.96 * se) <= math.pi <= 4 * (p_hat + 1.96 * se),
    }


def monte_carlo_convergence(sizes: list[int], seed: int = SEED) -> list[dict]:
    """One independent pi estimate per sample size, all from one seeded stream.

    Independent runs rather than a running total, because the teaching point is
    the 1/sqrt(n) envelope, and a single cumulative path is one draw from it and
    can look like anything.
    """
    out = []
    for i, n in enumerate(sizes):
        run = monte_carlo_pi(n, seed=seed + i)
        out.append(
            {
                "n": n,
                "seed": seed + i,
                "estimate": run["estimate"],
                "error": run["error"],
                "inside": run["inside"],
                # The 1/sqrt(n) reference envelope, anchored at the first size.
                "reference": None,
            }
        )
    anchor = out[0]
    for row in out:
        row["reference"] = anchor["error"] * math.sqrt(anchor["n"] / row["n"])
    return out


#: Parent distributions offered by the 2025 CLT lab, reduced to the four that
#: are visibly non-normal (the point of the demo) and computable in closed form.
CLT_PARENTS: dict[str, dict] = {
    "uniform": {"label": "Uniform on 0 to 1", "mean": 0.5, "sd": math.sqrt(1 / 12)},
    "exponential": {"label": "Exponential, mean 1", "mean": 1.0, "sd": 1.0},
    "bernoulli": {"label": "Coin flip, 0 or 1", "mean": 0.5, "sd": 0.5},
    "dice": {"label": "Fair six-sided die", "mean": 3.5, "sd": math.sqrt(35 / 12)},
}


def _clt_draw(rng: Mulberry32, parent: str) -> float:
    if parent == "uniform":
        return rng.next()
    if parent == "exponential":
        return rng.exponential(1.0)
    if parent == "bernoulli":
        return 1.0 if rng.next() < 0.5 else 0.0
    if parent == "dice":
        return float(rng.randint(1, 6))
    raise ValueError(f"unknown parent distribution {parent!r}")


def clt_series(
    parent: str,
    sample_sizes: list[int],
    samples: int = 2000,
    bins: int = 18,
    seed: int = SEED,
) -> dict:
    """Sampling distribution of the mean, at several sample sizes n.

    The whole claim of the CLT is ``SD[xbar] = sigma / sqrt(n)``, so each entry
    carries the theoretical value beside the observed one. The demo's text
    summary reads those two numbers out; the figure only draws them.
    """
    info = CLT_PARENTS[parent]
    lo = info["mean"] - 4 * info["sd"]
    hi = info["mean"] + 4 * info["sd"]
    out = []
    for k, n in enumerate(sample_sizes):
        rng = Mulberry32(seed + 1000 * k)
        means = []
        for _ in range(samples):
            total = 0.0
            for _ in range(n):
                total += _clt_draw(rng, parent)
            means.append(total / n)
        observed_mean = sum(means) / len(means)
        variance = sum((m - observed_mean) ** 2 for m in means) / (len(means) - 1)
        observed_sd = math.sqrt(variance)
        width = (hi - lo) / bins
        counts = [0] * bins
        for m in means:
            index = int((m - lo) / width)
            counts[min(max(index, 0), bins - 1)] += 1
        out.append(
            {
                "n": n,
                "seed": seed + 1000 * k,
                "counts": counts,
                "binLow": lo,
                "binWidth": width,
                "observedMean": observed_mean,
                "observedSd": observed_sd,
                "theoreticalMean": info["mean"],
                "theoreticalSd": info["sd"] / math.sqrt(n),
                # Sample skewness: the number that actually shrinks as n grows.
                "skewness": _skewness(means),
            }
        )
    return {
        "parent": parent,
        "parentLabel": info["label"],
        "populationMean": info["mean"],
        "populationSd": info["sd"],
        "samples": samples,
        "bins": bins,
        "range": [lo, hi],
        "series": out,
    }


def _skewness(values: list[float]) -> float:
    n = len(values)
    mean = sum(values) / n
    m2 = sum((v - mean) ** 2 for v in values) / n
    m3 = sum((v - mean) ** 3 for v in values) / n
    return m3 / (m2 ** 1.5) if m2 > 0 else 0.0


def brownian_path(
    steps: int = 240,
    dt: float = 0.05,
    drift: float = 0.0,
    sigma: float = 1.0,
    seed: int = SEED,
) -> dict:
    """A single 2-D Brownian path, plus the displacement statistics.

    The 2025 simulator printed a "theoretical distance" of ``sqrt(2*sigma*T)``.
    That is dimensionally wrong — sigma is not squared. For a 2-D walk whose
    per-axis standard deviation is ``sigma*sqrt(t)``:

        E[||X(t)||^2] = 2 sigma^2 t          so RMS displacement = sigma*sqrt(2t)
        E[||X(t)||]   = sigma*sqrt(pi t / 2)

    Both are reported, each labelled with what it measures, so the demo can say
    which one it is comparing against instead of quoting one number and hoping.
    """
    rng = Mulberry32(seed)
    xs, ys = [0.0], [0.0]
    for _ in range(steps):
        xs.append(xs[-1] + rng.normal(drift * dt, sigma * math.sqrt(dt)))
        ys.append(ys[-1] + rng.normal(drift * dt, sigma * math.sqrt(dt)))
    total_time = steps * dt
    displacement = math.hypot(xs[-1], ys[-1])
    return {
        "seed": seed,
        "steps": steps,
        "dt": dt,
        "drift": drift,
        "sigma": sigma,
        "totalTime": total_time,
        "x": xs,
        "y": ys,
        "displacement": displacement,
        "rmsTheory": sigma * math.sqrt(2 * total_time),
        "meanTheory": sigma * math.sqrt(math.pi * total_time / 2),
        "maxRadius": max(math.hypot(x, y) for x, y in zip(xs, ys)),
    }


def lcg_sequence(a: int, c: int, m: int, x0: int, n: int) -> list[float]:
    """A linear congruential generator, normalised to [0, 1).

    ``BAD_LCG`` is the 2025 lab's ``x <- (7x + 3) mod 1000``: a period of at
    most 1000 and a lag-1 plot that collapses onto a handful of lattice lines.
    ``GOOD_LCG`` is the Numerical Recipes generator. Plotting X[i] against
    X[i+1] for both, side by side, is the whole lesson.
    """
    x = x0
    out = []
    for _ in range(n):
        x = (a * x + c) % m
        out.append(x / m)
    return out


BAD_LCG = {"a": 7, "c": 3, "m": 1000, "x0": 1, "label": "x = (7x + 3) mod 1000"}
GOOD_LCG = {
    "a": 1664525,
    "c": 1013904223,
    "m": 2 ** 32,
    "x0": 1,
    "label": "x = (1664525x + 1013904223) mod 2^32",
}


# ---------------------------------------------------------------------------
# 5. M3 — graphs
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Graph:
    """An undirected graph with named nodes, fixed layout, and optional weights.

    The layout is authored, not force-directed: a fixed layout means the figure
    in the slides, the figure in the dashboard and the figure in the exam are
    the same picture, and a student can be told "the node top-left" and be
    right every time.
    """

    name: str
    nodes: tuple[str, ...]
    edges: tuple[tuple[str, str, int], ...]   # (u, v, weight)
    pos: dict[str, tuple[float, float]]
    weighted: bool = True

    def neighbours(self, node: str) -> list[str]:
        """Adjacent nodes in ascending name order — the order the trace assumes."""
        out = []
        for u, v, _ in self.edges:
            if u == node:
                out.append(v)
            elif v == node:
                out.append(u)
        return sorted(set(out))

    def weight(self, u: str, v: str) -> int:
        for a, b, w in self.edges:
            if {a, b} == {u, v}:
                return w
        raise KeyError(f"no edge {u}-{v}")

    def degree(self, node: str) -> int:
        return len(self.neighbours(node))

    def adjacency_matrix(self) -> list[list[int]]:
        index = {n: i for i, n in enumerate(self.nodes)}
        size = len(self.nodes)
        matrix = [[0] * size for _ in range(size)]
        for u, v, w in self.edges:
            value = w if self.weighted else 1
            matrix[index[u]][index[v]] = value
            matrix[index[v]][index[u]] = value
        return matrix


#: THE graph. One six-node weighted graph carries Dijkstra, Kruskal, BFS and
#: DFS across M3, so a student learns one picture and four algorithms rather
#: than four pictures. Weights are the 2025 "Simple Weighted" sample relabelled
#: A-F and given two extra edges so that the MST and the shortest-path tree are
#: genuinely different — which is the comparison the module needs and the 2025
#: graph could not make.
#:
#: The C-to-E weight of 6 is load-bearing. An earlier draft used 10, and at 10
#: the minimum spanning tree and the shortest-path tree from A come out as the
#: SAME five edges — so the M3 figure comparing them would have been comparing a
#: thing with itself, with a caption claiming otherwise. At 6 the shortest-path
#: tree reaches E through C while the spanning tree reaches it through D. The
#: self-check at the bottom of this file asserts they still differ.
CAMPUS_GRAPH = Graph(
    name="campus",
    nodes=("A", "B", "C", "D", "E", "F"),
    edges=(
        ("A", "B", 4),
        ("A", "C", 2),
        ("B", "C", 1),
        ("B", "D", 5),
        ("C", "D", 8),
        ("C", "E", 6),
        ("D", "E", 2),
        ("D", "F", 6),
        ("E", "F", 3),
    ),
    pos={
        "A": (0.10, 0.50),
        "B": (0.34, 0.16),
        "C": (0.34, 0.84),
        "D": (0.64, 0.30),
        "E": (0.64, 0.76),
        "F": (0.92, 0.52),
    },
)

#: A small unweighted tree-plus-cycle for the traversal view, where the visit
#: order is the whole content and weights would be noise.
TRAVERSAL_GRAPH = Graph(
    name="traversal",
    nodes=("A", "B", "C", "D", "E", "F", "G"),
    edges=(
        ("A", "B", 1),
        ("A", "C", 1),
        ("B", "D", 1),
        ("B", "E", 1),
        ("C", "F", 1),
        ("C", "G", 1),
        ("E", "F", 1),
    ),
    pos={
        "A": (0.50, 0.10),
        "B": (0.26, 0.40),
        "C": (0.74, 0.40),
        "D": (0.10, 0.76),
        "E": (0.40, 0.76),
        "F": (0.62, 0.76),
        "G": (0.90, 0.76),
    },
    weighted=False,
)

INF = float("inf")


def dijkstra_steps(graph: Graph, source: str) -> list[Step]:
    """Dijkstra with a linear-scan argmin and a predecessor array.

    The 2025 app had no ``prev[]``, so "find path to target" could only report a
    distance. Carrying predecessors is what turns the trace into a path, and it
    is the single highest-value upgrade the recon notes ask for (topic 3.5.7).
    """
    dist = {n: INF for n in graph.nodes}
    prev: dict[str, str | None] = {n: None for n in graph.nodes}
    dist[source] = 0
    visited: list[str] = []
    steps: list[Step] = []

    while len(visited) < len(graph.nodes):
        unfixed = [n for n in graph.nodes if n not in visited]
        current = min(unfixed, key=lambda n: (dist[n], n))
        if dist[current] == INF:
            steps.append(
                Step(
                    label=(
                        f"Every remaining node is still at infinity, so nothing else is "
                        f"reachable from {source} and the algorithm stops."
                    ),
                    rows=_dijkstra_rows(graph, dist, prev, visited, None),
                    state={"current": None, "done": True},
                )
            )
            break

        visited.append(current)
        relaxed = []
        for neighbour in graph.neighbours(current):
            if neighbour in visited:
                continue
            candidate = dist[current] + graph.weight(current, neighbour)
            if candidate < dist[neighbour]:
                before = dist[neighbour]
                dist[neighbour] = candidate
                prev[neighbour] = current
                relaxed.append((neighbour, before, candidate))

        if not relaxed:
            change = "No neighbour improved, so no distance changed this step."
        else:
            parts = [
                f"{node} drops from {'infinity' if before == INF else before} to {after}"
                for node, before, after in relaxed
            ]
            change = "Relaxing its edges: " + "; ".join(parts) + "."

        steps.append(
            Step(
                label=(
                    f"Step {len(visited)}: {current} is the nearest unfixed node at distance "
                    f"{dist[current]}, so it is fixed. {change}"
                ),
                rows=_dijkstra_rows(graph, dist, prev, visited, current),
                state={
                    "current": current,
                    "distances": {n: (None if dist[n] == INF else dist[n]) for n in graph.nodes},
                    "previous": dict(prev),
                    "visited": list(visited),
                    "relaxed": [
                        {"node": n, "from": None if b == INF else b, "to": a}
                        for n, b, a in relaxed
                    ],
                    "fixedCount": len(visited),
                },
            )
        )

    return steps


def _dijkstra_rows(graph, dist, prev, visited, current):
    rows = []
    for node in graph.nodes:
        rows.append(
            [
                node,
                "infinity" if dist[node] == INF else dist[node],
                prev[node] or "—",
                "fixed" if node in visited else "tentative",
            ]
        )
    return rows


def dijkstra_path(graph: Graph, source: str, target: str) -> tuple[list[str], float]:
    """The reconstructed shortest path and its length."""
    steps = dijkstra_steps(graph, source)
    final = steps[-1].state
    prev = final["previous"]
    dist = final["distances"]
    if dist.get(target) is None:
        return [], INF
    path = [target]
    while path[-1] != source:
        parent = prev[path[-1]]
        if parent is None:
            return [], INF
        path.append(parent)
    path.reverse()
    return path, dist[target]


class UnionFind:
    """Union-find with path compression and union by rank.

    The 2025 Kruskal view called its structure "Union-Find" but was really a
    set-per-node with an O(n) merge. Topic 3.6.5 names Union-Find explicitly, so
    this is the real thing, and ``snapshot()`` exposes the parent array — which
    is the part students are asked about and which the set-based version could
    not show.
    """

    def __init__(self, items):
        self.parent = {x: x for x in items}
        self.rank = {x: 0 for x in items}
        self.finds = 0

    def find(self, x):
        self.finds += 1
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:   # path compression
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a, b) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True

    def snapshot(self) -> dict[str, str]:
        return dict(self.parent)

    def components(self, items) -> list[list[str]]:
        groups: dict[str, list[str]] = {}
        for x in items:
            groups.setdefault(self.find(x), []).append(x)
        return [sorted(v) for _, v in sorted(groups.items())]


def kruskal_steps(graph: Graph) -> list[Step]:
    """Kruskal, one step per considered edge, with the union-find state exposed."""
    edges = sorted(graph.edges, key=lambda e: (e[2], e[0], e[1]))
    uf = UnionFind(graph.nodes)
    mst: list[tuple[str, str, int]] = []
    total = 0
    steps: list[Step] = []

    for index, (u, v, w) in enumerate(edges, start=1):
        root_u, root_v = uf.find(u), uf.find(v)
        if root_u != root_v:
            uf.union(u, v)
            mst.append((u, v, w))
            total += w
            action = "added"
            label = (
                f"Edge {index} of {len(edges)}: {u}-{v} weighs {w}. {u} is in component "
                f"{root_u} and {v} is in component {root_v}, so the edge joins two "
                f"components and is added. The tree now has {len(mst)} of "
                f"{len(graph.nodes) - 1} edges and weighs {total}."
            )
        else:
            action = "rejected"
            label = (
                f"Edge {index} of {len(edges)}: {u}-{v} weighs {w}. Both ends already find "
                f"root {root_u}, so adding it would close a cycle and it is rejected. "
                f"The tree stays at {len(mst)} edges weighing {total}."
            )

        components = uf.components(graph.nodes)
        steps.append(
            Step(
                label=label,
                rows=[
                    [index, f"{u}-{v}", w, action, len(mst), total,
                     " | ".join("{" + ",".join(c) + "}" for c in components)]
                ],
                state={
                    "edge": [u, v, w],
                    "action": action,
                    "mst": [list(e) for e in mst],
                    "totalWeight": total,
                    "parent": uf.snapshot(),
                    "components": components,
                    "edgesPlaced": len(mst),
                },
            )
        )
        if len(mst) == len(graph.nodes) - 1:
            steps[-1].label += " That is n minus 1 edges, so the spanning tree is complete."
            break

    return steps


def bfs_steps(graph: Graph, source: str) -> list[Step]:
    """Breadth-first search. One step per node dequeued and visited.

    Records the queue contents at the moment of the visit, because the queue is
    the thing that distinguishes BFS from DFS and is invisible in the drawing.
    """
    from collections import deque

    visited: list[str] = []
    queue = deque([source])
    depth = {source: 0}
    steps: list[Step] = []

    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.append(current)
        added = []
        for neighbour in graph.neighbours(current):
            if neighbour not in visited and neighbour not in queue:
                queue.append(neighbour)
                depth.setdefault(neighbour, depth[current] + 1)
                added.append(neighbour)

        queue_text = ", ".join(queue) if queue else "empty"
        added_text = (
            f"Enqueued {', '.join(added)} behind everything already waiting."
            if added
            else "No new neighbours to enqueue."
        )
        steps.append(
            Step(
                label=(
                    f"Step {len(visited)}: take {current} from the FRONT of the queue "
                    f"(distance {depth[current]} from {source}). {added_text} "
                    f"Queue is now: {queue_text}."
                ),
                rows=[[len(visited), current, depth[current], ", ".join(added) or "—",
                       queue_text, ", ".join(visited)]],
                state={
                    "current": current,
                    "visited": list(visited),
                    "container": list(queue),
                    "containerKind": "queue",
                    "depth": dict(depth),
                    "enqueued": added,
                },
            )
        )
    return steps


def dfs_steps(graph: Graph, source: str) -> list[Step]:
    """Depth-first search with an explicit stack.

    Neighbours are pushed in REVERSE order so the traversal follows ascending
    node names, which is what the 2025 app did and what the lecture trace on the
    board does. Without the reversal the visit order is the mirror image and
    students comparing with their notes conclude the demo is broken.
    """
    visited: list[str] = []
    stack = [source]
    steps: list[Step] = []

    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.append(current)
        added = []
        for neighbour in reversed(graph.neighbours(current)):
            if neighbour not in visited and neighbour not in stack:
                stack.append(neighbour)
                added.append(neighbour)

        stack_text = ", ".join(stack) if stack else "empty"
        added_text = (
            f"Pushed {', '.join(added)} onto the top."
            if added
            else "No new neighbours to push."
        )
        steps.append(
            Step(
                label=(
                    f"Step {len(visited)}: take {current} from the TOP of the stack. "
                    f"{added_text} Stack is now (top last): {stack_text}."
                ),
                rows=[[len(visited), current, ", ".join(added) or "—", stack_text,
                       ", ".join(visited)]],
                state={
                    "current": current,
                    "visited": list(visited),
                    "container": list(stack),
                    "containerKind": "stack",
                    "pushed": added,
                },
            )
        )
    return steps


# ---------------------------------------------------------------------------
# 6. M4 — convolution
# ---------------------------------------------------------------------------


def kernel_blur(size: int = 3) -> list[list[float]]:
    return [[1.0 / (size * size)] * size for _ in range(size)]


def kernel_gaussian(size: int = 3, sigma: float | None = None) -> list[list[float]]:
    """Normalised Gaussian kernel. Topic 4.4.10 is exactly this normalisation."""
    if sigma is None:
        sigma = size / 6.0
    centre = (size - 1) / 2.0
    raw = [
        [
            math.exp(-(((i - centre) ** 2 + (j - centre) ** 2) / (2 * sigma * sigma)))
            for j in range(size)
        ]
        for i in range(size)
    ]
    total = sum(sum(row) for row in raw)
    return [[value / total for value in row] for row in raw]


#: The 3x3 kernels the course names, plus the two Prewitt kernels the edge view
#: uses. Sobel X/Y are final-exam material (topic 4.5.3) and are the only place
#: in the M4 slides where a kernel is named without being printed — so it gets
#: printed here.
KERNELS: dict[str, dict] = {
    "identity": {
        "label": "Identity",
        "k": [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
        "effect": "leaves the image unchanged; the starting point for a custom kernel",
        "topic": "4.4.1",
    },
    "box-blur": {
        "label": "Box blur (mean)",
        "k": [[1 / 9] * 3 for _ in range(3)],
        "effect": "replaces each pixel with the average of its nine-pixel neighbourhood",
        "topic": "4.4.4",
    },
    "gaussian": {
        "label": "Gaussian blur",
        "k": kernel_gaussian(3, 1.0),
        "effect": "a weighted average that gives the centre pixel the most say",
        "topic": "4.4.9",
    },
    "sharpen": {
        "label": "Sharpen",
        "k": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
        "effect": "boosts the centre and subtracts its neighbours, exaggerating local change",
        "topic": "4.4.11",
    },
    "laplacian": {
        "label": "Laplacian",
        "k": [[0, -1, 0], [-1, 4, -1], [0, -1, 0]],
        "effect": "a second derivative: it peaks on both sides of an edge at once",
        "topic": "4.4.11",
    },
    "sobel-x": {
        "label": "Sobel X",
        "k": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
        "effect": "estimates the horizontal gradient, so it finds vertical edges",
        "topic": "4.5.3",
    },
    "sobel-y": {
        "label": "Sobel Y",
        "k": [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
        "effect": "estimates the vertical gradient, so it finds horizontal edges",
        "topic": "4.5.3",
    },
    "prewitt-x": {
        "label": "Prewitt X",
        "k": [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
        "effect": "an unweighted Sobel X; the same idea with equal row weights",
        "topic": "4.5.4",
    },
    "emboss": {
        "label": "Emboss",
        "k": [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
        "effect": "a directional derivative plus one, which reads as a lit relief",
        "topic": "4.4.11",
    },
}


#: A 7x7 grayscale patch with a step edge, a bright square and one salt speck.
#: Small enough to print every value in a table, structured enough that a blur,
#: a Sobel and a median all do visibly different things to it.
SAMPLE_PATCH: list[list[int]] = [
    [10, 10, 10, 200, 200, 200, 200],
    [10, 10, 10, 200, 200, 200, 200],
    [10, 10, 255, 200, 200, 120, 120],
    [10, 10, 10, 200, 200, 120, 120],
    [10, 10, 10, 200, 200, 120, 120],
    [10, 10, 10, 10, 10, 120, 120],
    [10, 10, 10, 10, 10, 120, 120],
]


def convolve2d(image: list[list[float]], kernel: list[list[float]],
               clamp: tuple[float, float] | None = (0, 255)) -> list[list[float]]:
    """Convolution with edge-replicate padding.

    Replicate rather than zero padding: zero padding invents a black border that
    every edge detector then finds, and students reasonably ask why there is a
    frame around their output.
    """
    rows, cols = len(image), len(image[0])
    k = len(kernel)
    radius = k // 2
    out = [[0.0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            total = 0.0
            for kr in range(k):
                for kc in range(k):
                    rr = min(max(r + kr - radius, 0), rows - 1)
                    cc = min(max(c + kc - radius, 0), cols - 1)
                    total += image[rr][cc] * kernel[kr][kc]
            if clamp:
                total = min(max(total, clamp[0]), clamp[1])
            out[r][c] = total
    return out


def convolution_worked_steps(
    image: list[list[float]], kernel: list[list[float]], cells: list[tuple[int, int]]
) -> list[Step]:
    """One step per output pixel, showing all nine products and their sum.

    This is the arithmetic students are asked to do by hand on the final
    (topic 4.4.1), so every multiplication is in the table rather than being
    summarised as a single output value.
    """
    radius = len(kernel) // 2
    rows, cols = len(image), len(image[0])
    steps: list[Step] = []
    for r, c in cells:
        terms = []
        total = 0.0
        for kr in range(len(kernel)):
            for kc in range(len(kernel)):
                rr = min(max(r + kr - radius, 0), rows - 1)
                cc = min(max(c + kc - radius, 0), cols - 1)
                pixel = image[rr][cc]
                weight = kernel[kr][kc]
                product = pixel * weight
                total += product
                terms.append(
                    [
                        f"({rr}, {cc})",
                        pixel,
                        round(weight, 4),
                        round(product, 3),
                    ]
                )
        clamped = min(max(total, 0), 255)
        note = "" if abs(clamped - total) < 1e-9 else f" The raw sum {total:.1f} is clipped to {clamped:.0f}."
        steps.append(
            Step(
                label=(
                    f"Output pixel ({r}, {c}): the kernel is centred on the input value "
                    f"{image[r][c]}, each of the nine neighbours is multiplied by its weight, "
                    f"and the products sum to {total:.2f}.{note}"
                ),
                rows=terms + [["sum", "", "", round(total, 3)]],
                state={
                    "row": r,
                    "col": c,
                    "centre": image[r][c],
                    "sum": total,
                    "output": clamped,
                    "terms": terms,
                },
            )
        )
    return steps


def median_filter(image: list[list[float]], size: int = 3) -> list[list[float]]:
    """Median filter — an order statistic, not an average.

    Kept beside ``convolve2d`` on purpose: the median filter is NOT a
    convolution, which is exactly why it beats the mean on salt and pepper
    (topic 4.4.7). No kernel of any weights can reproduce it.
    """
    rows, cols = len(image), len(image[0])
    radius = size // 2
    out = [[0.0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            window = []
            for dr in range(-radius, radius + 1):
                for dc in range(-radius, radius + 1):
                    rr = min(max(r + dr, 0), rows - 1)
                    cc = min(max(c + dc, 0), cols - 1)
                    window.append(image[rr][cc])
            window.sort()
            out[r][c] = window[len(window) // 2]
    return out


# ---------------------------------------------------------------------------
# 7. M5 — clustering
# ---------------------------------------------------------------------------

#: The 12-point worked example from the M5 lecture notes (LN-9). It exists only
#: in the notes — P1 replaced it with a "Live example!" placeholder — so
#: rebuilding it is a genuine restoration, not a re-illustration.
LINKAGE_POINTS: tuple[tuple[float, float], ...] = (
    (3, 0), (0, 1), (1, 1), (6, 1), (2, 2), (4, 2),
    (7, 3), (6, 5), (4, 7), (7, 7), (0, 8), (2, 8),
)

#: A 2-D set with three visible blobs, for the k-means step-through. Authored
#: rather than sampled so the answer is stable and the picture is uncrowded.
KMEANS_POINTS: tuple[tuple[float, float], ...] = (
    (1.0, 1.4), (1.6, 1.0), (0.8, 2.2), (1.9, 2.0), (1.2, 0.6), (2.3, 1.5),
    (6.4, 1.2), (7.1, 1.9), (6.8, 0.7), (7.6, 1.4), (6.1, 2.1), (7.3, 2.6),
    (3.6, 6.4), (4.3, 7.1), (3.1, 7.0), (4.6, 6.2), (3.9, 7.6), (4.9, 6.9),
)


def euclidean(a, b) -> float:
    return math.dist(a, b)


def manhattan(a, b) -> float:
    return sum(abs(x - y) for x, y in zip(a, b))


def kmeans_steps(
    points: list[tuple[float, float]],
    k: int = 3,
    seed: int = SEED,
    max_iter: int = 12,
    init: str = "forgy",
) -> list[Step]:
    """Lloyd's method, one step per iteration, recording inertia every time.

    The 2025 k-means view appended the SAME final inertia ``max_iter`` times and
    called it a convergence history. Here each iteration's assignment, centroid
    positions and inertia are real, which is what turns this into the
    step-through M5 (5.4.2-5.4.5) currently has no version of at all.

    ``init='forgy'`` picks k distinct data points as the initial centroids —
    the strategy the slides describe (5.4.4) — using the seeded PRNG, so
    initialisation sensitivity (5.4.6) is demonstrable by changing one number.
    """
    rng = Mulberry32(seed)
    if init == "forgy":
        chosen: list[int] = []
        while len(chosen) < k:
            index = int(rng.next() * len(points))
            if index not in chosen:
                chosen.append(index)
        centroids = [tuple(points[i]) for i in chosen]
        origin = f"Forgy initialisation with seed {seed} picked data points {', '.join(str(i + 1) for i in chosen)}"
    elif init == "first-k":
        centroids = [tuple(points[i]) for i in range(k)]
        origin = f"the first {k} data points"
    else:
        raise ValueError(f"unknown initialisation {init!r}")

    steps: list[Step] = []
    previous_labels: list[int] | None = None

    for iteration in range(1, max_iter + 1):
        labels = [
            min(range(k), key=lambda c: euclidean(p, centroids[c])) for p in points
        ]
        inertia = sum(
            euclidean(p, centroids[labels[i]]) ** 2 for i, p in enumerate(points)
        )
        moved = 0 if previous_labels is None else sum(
            1 for a, b in zip(labels, previous_labels) if a != b
        )

        new_centroids = []
        shifts = []
        for c in range(k):
            members = [p for i, p in enumerate(points) if labels[i] == c]
            if members:
                cx = sum(p[0] for p in members) / len(members)
                cy = sum(p[1] for p in members) / len(members)
            else:
                cx, cy = centroids[c]
            shifts.append(euclidean((cx, cy), centroids[c]))
            new_centroids.append((cx, cy))

        counts = [labels.count(c) for c in range(k)]
        if iteration == 1:
            label = (
                f"Iteration 1: starting from {origin}, every point joins its nearest "
                f"centroid, giving clusters of {', '.join(str(n) for n in counts)} points "
                f"and an inertia of {inertia:.2f}. Each centroid then moves to the mean of "
                f"its members, the largest move being {max(shifts):.2f}."
            )
        elif moved == 0:
            label = (
                f"Iteration {iteration}: no point changed cluster, so the assignment is "
                f"stable and the centroids move by at most {max(shifts):.3f}. "
                f"Inertia has settled at {inertia:.2f}."
            )
        else:
            label = (
                f"Iteration {iteration}: {moved} point{'s' if moved != 1 else ''} changed "
                f"cluster, dropping inertia to {inertia:.2f}. The centroids move again, the "
                f"largest by {max(shifts):.2f}."
            )

        steps.append(
            Step(
                label=label,
                rows=[
                    [
                        c + 1,
                        counts[c],
                        round(centroids[c][0], 3),
                        round(centroids[c][1], 3),
                        round(new_centroids[c][0], 3),
                        round(new_centroids[c][1], 3),
                        round(shifts[c], 4),
                    ]
                    for c in range(k)
                ],
                state={
                    "iteration": iteration,
                    "centroids": [list(c) for c in centroids],
                    "newCentroids": [list(c) for c in new_centroids],
                    "labels": labels,
                    "counts": counts,
                    "inertia": inertia,
                    "maxShift": max(shifts),
                    "reassigned": moved,
                    "converged": moved == 0 and iteration > 1,
                },
            )
        )

        if moved == 0 and iteration > 1:
            break
        previous_labels = labels
        centroids = new_centroids

    return steps


def linkage_steps(
    points: list[tuple[float, float]], method: str = "single"
) -> tuple[list[Step], list[dict]]:
    """Agglomerative clustering. Returns (steps, merges).

    ``method`` is one of single (nearest neighbour), complete (farthest
    neighbour), or average — the three the slides define at P1-25. Distances are
    Euclidean, matching ``pdist`` with its default metric.

    Merge heights come from the linkage definition, not from a recomputation of
    the point distances, so the dendrogram drawn from ``merges`` is the same
    tree the step table describes.
    """
    n = len(points)
    clusters: dict[int, list[int]] = {i: [i] for i in range(n)}
    heights: dict[int, float] = {i: 0.0 for i in range(n)}
    next_id = n
    merges: list[dict] = []
    steps: list[Step] = []

    def cluster_distance(a: list[int], b: list[int]) -> float:
        pairs = [euclidean(points[i], points[j]) for i in a for j in b]
        if method == "single":
            return min(pairs)
        if method == "complete":
            return max(pairs)
        if method == "average":
            return sum(pairs) / len(pairs)
        raise ValueError(f"unknown linkage {method!r}")

    verb = {
        "single": "the shortest link between them",
        "complete": "the longest link between them",
        "average": "the mean of all links between them",
    }[method]

    while len(clusters) > 1:
        best = None
        for a in sorted(clusters):
            for b in sorted(clusters):
                if a >= b:
                    continue
                d = cluster_distance(clusters[a], clusters[b])
                if best is None or d < best[0] - 1e-12:
                    best = (d, a, b)
        distance, a, b = best

        members = sorted(clusters[a] + clusters[b])
        merged_id = next_id
        next_id += 1
        merges.append(
            {
                "id": merged_id,
                "left": a,
                "right": b,
                "height": distance,
                "members": members,
                "size": len(members),
            }
        )
        heights[merged_id] = distance

        name_a = _cluster_name(a, n, clusters[a])
        name_b = _cluster_name(b, n, clusters[b])
        remaining = len(clusters) - 1

        steps.append(
            Step(
                label=(
                    f"Merge {len(merges)}: {name_a} and {name_b} are the closest pair at "
                    f"{distance:.3f} — {verb} — so they join at that height. "
                    f"{remaining} cluster{'s' if remaining != 1 else ''} remain."
                ),
                rows=[
                    [
                        len(merges),
                        name_a,
                        name_b,
                        round(distance, 4),
                        len(members),
                        ", ".join(str(m + 1) for m in members),
                        remaining,
                    ]
                ],
                state={
                    "merge": len(merges),
                    "left": a,
                    "right": b,
                    "height": distance,
                    "members": members,
                    "remaining": remaining,
                },
            )
        )

        del clusters[a]
        del clusters[b]
        clusters[merged_id] = members

    return steps, merges


def _cluster_name(cid: int, leaf_count: int, members: list[int]) -> str:
    if cid < leaf_count:
        return f"point {cid + 1}"
    return "cluster {" + ", ".join(str(m + 1) for m in members) + "}"


def dendrogram_layout(merges: list[dict], leaf_count: int) -> dict:
    """Leaf order and node coordinates for drawing the tree.

    Leaves are ordered by an in-order walk of the merge tree, which is what puts
    the crossing-free version of the dendrogram on the page. ``scipy`` does the
    same thing; doing it here keeps the pipeline dependency-free.
    """
    children = {m["id"]: (m["left"], m["right"]) for m in merges}
    height = {m["id"]: m["height"] for m in merges}
    root = merges[-1]["id"]

    order: list[int] = []

    def walk(node: int) -> None:
        if node < leaf_count:
            order.append(node)
            return
        left, right = children[node]
        walk(left)
        walk(right)

    walk(root)
    position = {leaf: i for i, leaf in enumerate(order)}

    coords: dict[int, tuple[float, float]] = {leaf: (position[leaf], 0.0) for leaf in order}
    for m in merges:
        left, right = m["left"], m["right"]
        x = (coords[left][0] + coords[right][0]) / 2
        coords[m["id"]] = (x, m["height"])

    return {
        "order": order,
        "coords": {k: list(v) for k, v in coords.items()},
        "root": root,
        "heights": height,
        "maxHeight": max(height.values()),
    }


def cut_dendrogram(merges: list[dict], leaf_count: int, threshold: float) -> list[list[int]]:
    """The clusters you get by cutting the tree at *threshold*."""
    parent = {i: i for i in range(leaf_count)}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for m in merges:
        if m["height"] <= threshold + 1e-12:
            for leaf in m["members"]:
                parent[find(leaf)] = find(m["members"][0])

    groups: dict[int, list[int]] = {}
    for leaf in range(leaf_count):
        groups.setdefault(find(leaf), []).append(leaf)
    return sorted((sorted(v) for v in groups.values()), key=lambda g: g[0])


# ---------------------------------------------------------------------------
# 8. M6 — computational geometry
# ---------------------------------------------------------------------------

#: The point set used by the hull, the Voronoi diagram and the Delaunay
#: triangulation, so the three figures are three readings of one picture.
#: In general position: no three collinear, no four cocircular.
GEOMETRY_POINTS: tuple[tuple[float, float], ...] = (
    (1.0, 1.5), (2.6, 0.6), (4.4, 1.1), (5.6, 2.7), (5.0, 4.6),
    (3.2, 5.4), (1.4, 4.3), (0.6, 2.9), (2.9, 2.4), (3.9, 3.4),
)

#: An 8-vertex non-convex polygon in counter-clockwise order, with two genuine
#: reflex vertices, so ear clipping has to skip a candidate before it succeeds.
EAR_POLYGON: tuple[tuple[float, float], ...] = (
    (0.0, 0.0), (4.0, 0.0), (4.0, 2.0), (2.4, 2.0),
    (3.2, 3.6), (4.4, 4.6), (1.4, 4.6), (0.0, 2.6),
)


def cross(o, a, b) -> float:
    """z-component of (a-o) x (b-o). Positive means a left turn at o (6.2.5)."""
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def polygon_area(points) -> float:
    """Signed area by the shoelace formula. Positive for counter-clockwise."""
    total = 0.0
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return total / 2.0


def polygon_centroid(points) -> tuple[float, float]:
    area = polygon_area(points)
    cx = cy = 0.0
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        factor = x1 * y2 - x2 * y1
        cx += (x1 + x2) * factor
        cy += (y1 + y2) * factor
    return (cx / (6 * area), cy / (6 * area))


def point_in_triangle(p, a, b, c) -> bool:
    d1, d2, d3 = cross(a, b, p), cross(b, c, p), cross(c, a, p)
    has_neg = min(d1, d2, d3) < -1e-12
    has_pos = max(d1, d2, d3) > 1e-12
    return not (has_neg and has_pos)


def convex_hull_steps(points: list[tuple[float, float]]) -> list[Step]:
    """Gift wrapping (Jarvis march), one step per hull vertex found.

    Starts at the leftmost point, breaking ties by lowest y — exactly as the
    slides state (M6 P3 frame 9) — and walks counter-clockwise. Each step
    records how many candidates were tested, which is where the O(n*h) cost
    comes from and is invisible in the finished picture.
    """
    n = len(points)
    start = min(range(n), key=lambda i: (points[i][0], points[i][1]))
    hull = [start]
    current = start
    steps: list[Step] = []
    tested_total = 0

    while True:
        candidate = (current + 1) % n
        tested = 0
        for i in range(n):
            if i == current:
                continue
            tested += 1
            turn = cross(points[current], points[candidate], points[i])
            if turn < 0 or (
                abs(turn) < 1e-12
                and euclidean(points[current], points[i])
                > euclidean(points[current], points[candidate])
            ):
                candidate = i
        tested_total += tested

        if candidate == start:
            steps.append(
                Step(
                    label=(
                        f"Step {len(steps) + 1}: from P{current + 1} the tightest wrap comes "
                        f"back to the start P{start + 1}, so the hull is closed. It has "
                        f"{len(hull)} vertices and cost {tested_total} candidate tests."
                    ),
                    rows=[
                        [
                            len(steps) + 1,
                            f"P{current + 1}",
                            f"P{start + 1}",
                            tested,
                            len(hull),
                            "closed",
                        ]
                    ],
                    state={
                        "hull": list(hull),
                        "from": current,
                        "to": start,
                        "tested": tested,
                        "closed": True,
                    },
                )
            )
            break

        if len(steps) == 0:
            label = (
                f"Step 1: P{start + 1} is the leftmost point, so it is certainly on the "
                f"hull. Testing all {tested} other points, P{candidate + 1} is the one that "
                f"leaves every point to its left, so the first hull edge is "
                f"P{start + 1} to P{candidate + 1}."
            )
        else:
            label = (
                f"Step {len(steps) + 1}: standing at P{current + 1} and testing {tested} "
                f"candidates, P{candidate + 1} is the one with every other point to its "
                f"left, so the wrap turns there. The hull now has {len(hull) + 1} vertices."
            )

        hull.append(candidate)
        steps.append(
            Step(
                label=label,
                rows=[
                    [
                        len(steps) + 1,
                        f"P{current + 1}",
                        f"P{candidate + 1}",
                        tested,
                        len(hull),
                        "added",
                    ]
                ],
                state={
                    "hull": list(hull),
                    "from": current,
                    "to": candidate,
                    "tested": tested,
                    "closed": False,
                },
            )
        )
        current = candidate

    return steps


def reflex_vertices(polygon: list[tuple[float, float]]) -> list[int]:
    """Indices of the vertices whose interior angle exceeds 180 degrees.

    Computed from the geometry rather than read out of an ear-clipping trace:
    the trace only reports the candidates it happened to test before it found an
    ear, so a polygon can have a reflex vertex that never appears in it. The
    drawing needs all of them, because "a reflex vertex can never be an ear" is
    the claim the picture is making.
    """
    n = len(polygon)
    ccw = polygon_area(polygon) > 0
    out = []
    for i in range(n):
        turn = cross(polygon[(i - 1) % n], polygon[i], polygon[(i + 1) % n])
        if (turn < -1e-12) if ccw else (turn > 1e-12):
            out.append(i)
    return out


def ear_clipping_steps(polygon: list[tuple[float, float]]) -> list[Step]:
    """Ear slicing. One step per vertex TESTED, not per ear removed.

    The rejected candidates are the content: "polygons have ears" (6.3.5) is
    only interesting once you have seen a reflex vertex fail the test and a
    convex vertex with a point inside it fail the second test. A trace that
    only shows successful clips teaches the theorem without the algorithm.
    """
    remaining = list(range(len(polygon)))
    triangles: list[tuple[int, int, int]] = []
    steps: list[Step] = []
    guard = 0

    while len(remaining) > 3 and guard < 500:
        guard += 1
        clipped = False
        for position in range(len(remaining)):
            prev_i = remaining[(position - 1) % len(remaining)]
            curr_i = remaining[position]
            next_i = remaining[(position + 1) % len(remaining)]
            a, b, c = polygon[prev_i], polygon[curr_i], polygon[next_i]

            convex = cross(a, b, c) > 1e-12
            intruders = []
            if convex:
                for other in remaining:
                    if other in (prev_i, curr_i, next_i):
                        continue
                    if point_in_triangle(polygon[other], a, b, c):
                        intruders.append(other)

            if convex and not intruders:
                triangles.append((prev_i, curr_i, next_i))
                remaining.remove(curr_i)
                steps.append(
                    Step(
                        label=(
                            f"Vertex V{curr_i + 1} is convex and no other vertex lies inside "
                            f"triangle V{prev_i + 1}-V{curr_i + 1}-V{next_i + 1}, so it is an "
                            f"ear. Clip it: that is triangle {len(triangles)}, and "
                            f"{len(remaining)} vertices are left."
                        ),
                        rows=[
                            [
                                len(steps) + 1,
                                f"V{curr_i + 1}",
                                "convex",
                                "none",
                                "ear clipped",
                                f"V{prev_i + 1}-V{curr_i + 1}-V{next_i + 1}",
                                len(remaining),
                            ]
                        ],
                        state={
                            "vertex": curr_i,
                            "triangle": [prev_i, curr_i, next_i],
                            "action": "clipped",
                            "remaining": list(remaining),
                            "triangles": [list(t) for t in triangles],
                        },
                    )
                )
                clipped = True
                break

            reason = "reflex" if not convex else "convex"
            blocked = (
                "not an ear: the interior angle is reflex, so the diagonal would fall "
                "outside the polygon"
                if not convex
                else "not an ear: vertex "
                + ", ".join(f"V{i + 1}" for i in intruders)
                + " lies inside the candidate triangle"
            )
            steps.append(
                Step(
                    label=(
                        f"Test V{curr_i + 1} with neighbours V{prev_i + 1} and "
                        f"V{next_i + 1}: {blocked}. Move to the next vertex."
                    ),
                    rows=[
                        [
                            len(steps) + 1,
                            f"V{curr_i + 1}",
                            reason,
                            ", ".join(f"V{i + 1}" for i in intruders) or "none",
                            "rejected",
                            f"V{prev_i + 1}-V{curr_i + 1}-V{next_i + 1}",
                            len(remaining),
                        ]
                    ],
                    state={
                        "vertex": curr_i,
                        "triangle": [prev_i, curr_i, next_i],
                        "action": "rejected",
                        "reason": reason,
                        "intruders": intruders,
                        "remaining": list(remaining),
                        "triangles": [list(t) for t in triangles],
                    },
                )
            )
        if not clipped:
            break

    if len(remaining) == 3:
        triangles.append(tuple(remaining))
        steps.append(
            Step(
                label=(
                    f"Three vertices are left — V{remaining[0] + 1}, V{remaining[1] + 1} and "
                    f"V{remaining[2] + 1} — so they form the last triangle. An n-vertex "
                    f"polygon always ends with n minus 2 triangles: {len(triangles)} here."
                ),
                rows=[
                    [
                        len(steps) + 1,
                        "—",
                        "final",
                        "none",
                        "last triangle",
                        "-".join(f"V{i + 1}" for i in remaining),
                        0,
                    ]
                ],
                state={
                    "vertex": None,
                    "triangle": list(remaining),
                    "action": "final",
                    "remaining": [],
                    "triangles": [list(t) for t in triangles],
                },
            )
        )
    return steps


def circumcircle(a, b, c) -> tuple[tuple[float, float], float] | None:
    d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
    if abs(d) < 1e-12:
        return None
    ux = (
        (a[0] ** 2 + a[1] ** 2) * (b[1] - c[1])
        + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1])
        + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])
    ) / d
    uy = (
        (a[0] ** 2 + a[1] ** 2) * (c[0] - b[0])
        + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0])
        + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])
    ) / d
    return (ux, uy), math.dist((ux, uy), a)


def delaunay_triangulation(points: list[tuple[float, float]]) -> list[dict]:
    """Delaunay by the empty-circumcircle definition, tested on every triple.

    O(n^4) and completely unsuitable for a real workload — and exactly right
    here, because it IS the definition (topic 6.5.3): a triangle is Delaunay
    when its circumcircle contains no other point. Ten points is 120 triples,
    which is instant, and the code reads as the definition rather than as an
    incremental-flip implementation nobody can check by hand.
    """
    n = len(points)
    triangles = []
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                result = circumcircle(points[i], points[j], points[k])
                if result is None:
                    continue
                centre, radius = result
                if all(
                    math.dist(centre, points[m]) > radius - 1e-9
                    for m in range(n)
                    if m not in (i, j, k)
                ):
                    triangles.append(
                        {
                            "vertices": [i, j, k],
                            "circumcentre": [centre[0], centre[1]],
                            "circumradius": radius,
                            "area": abs(
                                polygon_area([points[i], points[j], points[k]])
                            ),
                        }
                    )
    return triangles


def voronoi_cells(
    points: list[tuple[float, float]], bounds: tuple[float, float, float, float]
) -> list[dict]:
    """Voronoi cells by half-plane clipping of the bounding box.

    Each cell is the box repeatedly cut by the perpendicular bisector against
    every other generator. That is the definition read literally (topic 5.5.1)
    and it needs no dual-graph bookkeeping, so the code is checkable.
    """
    x0, y0, x1, y1 = bounds
    cells = []
    for i, site in enumerate(points):
        cell = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        for j, other in enumerate(points):
            if i == j:
                continue
            # Keep the half-plane closer to `site` than to `other`.
            mx, my = (site[0] + other[0]) / 2, (site[1] + other[1]) / 2
            nx, ny = site[0] - other[0], site[1] - other[1]
            cell = _clip_halfplane(cell, (mx, my), (nx, ny))
            if not cell:
                break
        if cell:
            cells.append(
                {
                    "site": i,
                    "polygon": [[round(x, 6), round(y, 6)] for x, y in cell],
                    "area": abs(polygon_area(cell)),
                    "vertices": len(cell),
                }
            )
    return cells


def _clip_halfplane(polygon, point, normal):
    """Sutherland-Hodgman clip to { p : (p - point) . normal >= 0 }."""
    if not polygon:
        return []
    px, py = point
    nx, ny = normal

    def inside(p):
        return (p[0] - px) * nx + (p[1] - py) * ny >= -1e-12

    def intersect(a, b):
        da = (a[0] - px) * nx + (a[1] - py) * ny
        db = (b[0] - px) * nx + (b[1] - py) * ny
        t = da / (da - db)
        return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))

    out = []
    for i in range(len(polygon)):
        a, b = polygon[i], polygon[(i + 1) % len(polygon)]
        ain, bin_ = inside(a), inside(b)
        if ain:
            out.append(a)
        if ain != bin_:
            out.append(intersect(a, b))
    return out


def point_line_projection(p, a, b) -> dict:
    """The s coordinate, foot of perpendicular, and distance (topics 6.1.2-6.1.8).

    ``s`` is the parameter along the line ``a + s*(b - a)``. Its SIGN and
    whether it exceeds 1 is the whole content of topic 6.1.5, so it is returned
    with a verdict word rather than left for the reader to infer.
    """
    dx, dy = b[0] - a[0], b[1] - a[1]
    length_sq = dx * dx + dy * dy
    s = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length_sq
    foot = (a[0] + s * dx, a[1] + s * dy)
    if s < 0:
        where = "before the start of the segment"
    elif s > 1:
        where = "past the end of the segment"
    else:
        where = "between the two endpoints"
    return {
        "s": s,
        "foot": foot,
        "distance": math.dist(p, foot),
        "where": where,
        "segmentLength": math.sqrt(length_sq),
    }


# ---------------------------------------------------------------------------
# 9. M7 — linear programming and simplex
# ---------------------------------------------------------------------------

#: The running example from the M7 slides (P2 f2 / P3 f11 onwards):
#:     max  z = 120 x1 + 100 x2
#:     s.t. 2 x1 + 2 x2 <= 8
#:          5 x1 + 3 x2 <= 15
#:          x1, x2 >= 0
#: The slides state its vertices as (0,0), (3,0), (1.5,2.5), (0,4) and follow it
#: through three tableaus to the optimum, so this is the LP the whole simplex
#: arc has to reproduce exactly.
SIMPLEX_EXAMPLE = {
    "name": "Two-product plant",
    "sense": "max",
    "objective": [Fraction(120), Fraction(100)],
    "constraints": [
        {"a": [Fraction(2), Fraction(2)], "b": Fraction(8), "op": "<="},
        {"a": [Fraction(5), Fraction(3)], "b": Fraction(15), "op": "<="},
    ],
    "variableNames": ["x1", "x2"],
    "slackNames": ["x3", "x4"],
}

#: The furniture problem from the 2025 LP Visualizer, kept for the graphical
#: view so the two M7 figures show the same method on two different problems.
LP_FURNITURE = {
    "name": "The Furniture Factory",
    "sense": "max",
    "objective": [40.0, 30.0],
    "constraints": [
        {"a": [2.0, 1.0], "b": 10.0, "op": "<="},
        {"a": [1.0, 1.0], "b": 6.0, "op": "<="},
    ],
    "variableNames": ["chairs", "tables"],
    "bounds": [0.0, 10.0],
}


def lp_vertices(problem: dict) -> list[dict]:
    """Every feasible basic solution, by intersecting each pair of boundaries.

    This is the brute-force basic-solution method (topics 7.4.6-7.4.9) done
    geometrically. The count of intersections tested versus the count that turn
    out feasible is the motivation for simplex, so both are reported.
    """
    a_list = [c["a"] for c in problem["constraints"]] + [[1.0, 0.0], [0.0, 1.0]]
    b_list = [c["b"] for c in problem["constraints"]] + [0.0, 0.0]
    ops = [c["op"] for c in problem["constraints"]] + [">=", ">="]

    seen: list[tuple[float, float]] = []
    out = []
    tested = 0
    for i in range(len(a_list)):
        for j in range(i + 1, len(a_list)):
            tested += 1
            a1, b1 = a_list[i], b_list[i]
            a2, b2 = a_list[j], b_list[j]
            det = a1[0] * a2[1] - a2[0] * a1[1]
            if abs(det) < 1e-9:
                continue
            x = (b1 * a2[1] - b2 * a1[1]) / det
            y = (a1[0] * b2 - a2[0] * b1) / det
            # A boundary through the origin solves to -0.0, which formats as
            # "-0" and reads as a bug in a corner label.
            x, y = x + 0.0, y + 0.0
            if x == 0:
                x = 0.0
            if y == 0:
                y = 0.0
            if x < -1e-9 or y < -1e-9:
                continue
            feasible = True
            for a, b, op in zip(a_list, b_list, ops):
                value = a[0] * x + a[1] * y
                if op == "<=" and value > b + 1e-9:
                    feasible = False
                if op == ">=" and value < b - 1e-9:
                    feasible = False
            if not feasible:
                continue
            if any(abs(x - px) < 1e-7 and abs(y - py) < 1e-7 for px, py in seen):
                continue
            seen.append((x, y))
            z = problem["objective"][0] * x + problem["objective"][1] * y
            out.append(
                {
                    "x": x,
                    "y": y,
                    "z": z,
                    "from": [_boundary_name(i, problem), _boundary_name(j, problem)],
                }
            )

    out.sort(key=lambda v: (-v["z"], v["x"]))
    best = out[0]["z"] if problem["sense"] == "max" else min(v["z"] for v in out)
    for v in out:
        v["optimal"] = abs(v["z"] - best) < 1e-9
    return out


def _boundary_name(index: int, problem: dict) -> str:
    n = len(problem["constraints"])
    if index < n:
        c = problem["constraints"][index]
        a, b = c["a"], c["b"]
        return f"{a[0]:g}x + {a[1]:g}y {'=' if c['op'] == '=' else c['op'].replace('<=', '=').replace('>=', '=')} {b:g}"
    return "x = 0" if index == n else "y = 0"


def _frac(value) -> str:
    """Render a Fraction the way the slides do: 3, -2, 3/5, 4/5."""
    f = Fraction(value)
    return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"


def simplex_steps(problem: dict) -> list[Step]:
    """The simplex method on an exact-rational tableau.

    Fractions, not floats. The slides show 3/5 and 4/5 and -2/5 and the exam
    expects them; a float tableau prints 0.6000000000000001 and a student
    checking their arithmetic against it concludes they are wrong.

    Entering variable: most negative objective-row coefficient, with the LOWEST
    INDEX breaking ties — that is Bland's rule (topic 7.5.10), and it is what
    guarantees the loop cannot cycle.
    Departing variable: smallest positive ratio of right-hand side to the
    entering column's coefficient (topic 7.5.7).
    """
    var_names = list(problem["variableNames"]) + list(problem["slackNames"])
    m = len(problem["constraints"])
    n = len(problem["variableNames"])

    # rows: [ x1..xn | s1..sm | rhs ], one per constraint, then the objective.
    rows: list[list[Fraction]] = []
    for i, c in enumerate(problem["constraints"]):
        if c["op"] != "<=":
            raise ValueError(
                "this tableau builder handles <= constraints only; a >= or = constraint "
                "needs an artificial variable and a phase-1 problem (topic 7.4.3)."
            )
        row = [Fraction(v) for v in c["a"]] + [Fraction(0)] * m + [Fraction(c["b"])]
        row[n + i] = Fraction(1)
        rows.append(row)
    # z - 120x1 - 100x2 = 0, so the objective row holds the NEGATED coefficients.
    objective = [-Fraction(v) for v in problem["objective"]] + [Fraction(0)] * m + [Fraction(0)]

    basis = [n + i for i in range(m)]
    steps: list[Step] = []
    iteration = 0

    def tableau_rows() -> list[list[object]]:
        out = []
        for i, row in enumerate(rows):
            out.append(
                [var_names[basis[i]]] + [_frac(v) for v in row[:-1]] + [_frac(row[-1])]
            )
        out.append(["z (objective)"] + [_frac(v) for v in objective[:-1]] + [_frac(objective[-1])])
        return out

    def solution() -> dict[str, Fraction]:
        values = {name: Fraction(0) for name in var_names}
        for i, b in enumerate(basis):
            values[var_names[b]] = rows[i][-1]
        return values

    values = solution()
    steps.append(
        Step(
            label=(
                f"Initial tableau. Setting the {n} decision variables to zero makes the "
                f"slack variables basic at {', '.join(f'{var_names[b]} = {_frac(rows[i][-1])}' for i, b in enumerate(basis))}, "
                f"which is the feasible corner "
                f"({', '.join(_frac(values[v]) for v in problem['variableNames'])}) with z = 0. "
                "Every right-hand side is positive, so this basic solution is feasible and "
                "simplex can start here."
            ),
            rows=tableau_rows(),
            state={
                "iteration": 0,
                "basis": [var_names[b] for b in basis],
                "solution": {k: _frac(v) for k, v in values.items()},
                "z": _frac(objective[-1]),
                "entering": None,
                "departing": None,
                "pivot": None,
                "optimal": False,
            },
        )
    )

    while iteration < 30:
        iteration += 1
        # Entering: most negative, lowest index on a tie (Bland's rule).
        entering = None
        best = Fraction(0)
        for j in range(len(var_names)):
            if objective[j] < best:
                best, entering = objective[j], j

        if entering is None:
            values = solution()
            steps.append(
                Step(
                    label=(
                        "Optimality test: no objective-row coefficient is negative, so no "
                        "variable can be increased without lowering z. The tableau is "
                        f"optimal at {', '.join(f'{v} = {_frac(values[v])}' for v in problem['variableNames'])} "
                        f"with z = {_frac(objective[-1])}."
                    ),
                    rows=tableau_rows(),
                    state={
                        "iteration": iteration,
                        "basis": [var_names[b] for b in basis],
                        "solution": {k: _frac(v) for k, v in values.items()},
                        "z": _frac(objective[-1]),
                        "entering": None,
                        "departing": None,
                        "pivot": None,
                        "optimal": True,
                    },
                )
            )
            break

        # Departing: smallest positive ratio.
        ratios = []
        departing = None
        best_ratio = None
        for i in range(m):
            coefficient = rows[i][entering]
            if coefficient > 0:
                ratio = rows[i][-1] / coefficient
                ratios.append((i, ratio))
                if best_ratio is None or ratio < best_ratio:
                    best_ratio, departing = ratio, i

        if departing is None:
            steps.append(
                Step(
                    label=(
                        f"Entering variable {var_names[entering]} has no positive coefficient "
                        "in any constraint row, so nothing limits how far it can increase. "
                        "The objective is unbounded and simplex stops."
                    ),
                    rows=tableau_rows(),
                    state={
                        "iteration": iteration,
                        "entering": var_names[entering],
                        "departing": None,
                        "unbounded": True,
                        "optimal": False,
                    },
                )
            )
            break

        pivot = rows[departing][entering]
        leaving_name = var_names[basis[departing]]
        ratio_text = "; ".join(
            f"{var_names[basis[i]]} row gives {_frac(rows[i][-1])} over "
            f"{_frac(rows[i][entering])} = {_frac(r)}"
            for i, r in ratios
        )

        # Pivot: scale the pivot row to 1, then clear the rest of the column.
        rows[departing] = [v / pivot for v in rows[departing]]
        for i in range(m):
            if i == departing:
                continue
            factor = rows[i][entering]
            if factor != 0:
                rows[i] = [a - factor * b for a, b in zip(rows[i], rows[departing])]
        factor = objective[entering]
        if factor != 0:
            objective = [a - factor * b for a, b in zip(objective, rows[departing])]
        basis[departing] = entering

        values = solution()
        steps.append(
            Step(
                label=(
                    f"Iteration {iteration}: {var_names[entering]} has the most negative "
                    f"objective coefficient ({_frac(best)}), so it enters. Ratio test — "
                    f"{ratio_text} — so {leaving_name} departs on the smallest positive "
                    f"ratio {_frac(best_ratio)}. Pivoting on {_frac(pivot)} moves to the "
                    f"adjacent corner "
                    f"({', '.join(_frac(values[v]) for v in problem['variableNames'])}) "
                    f"and raises z to {_frac(objective[-1])}."
                ),
                rows=tableau_rows(),
                state={
                    "iteration": iteration,
                    "basis": [var_names[b] for b in basis],
                    "solution": {k: _frac(v) for k, v in values.items()},
                    "z": _frac(objective[-1]),
                    "entering": var_names[entering],
                    "departing": leaving_name,
                    "pivot": _frac(pivot),
                    "pivotRow": departing,
                    "pivotCol": entering,
                    "ratios": [[var_names[basis[i]], _frac(r)] for i, r in ratios],
                    "optimal": False,
                },
            )
        )

    return steps


def simplex_variable_names(problem: dict) -> list[str]:
    return list(problem["variableNames"]) + list(problem["slackNames"])


# ---------------------------------------------------------------------------
# 10. Self-check
# ---------------------------------------------------------------------------


def _self_check() -> int:
    problems: list[str] = []

    # -- PRNG determinism ---------------------------------------------------
    a = [Mulberry32(42).next() for _ in range(3)]
    b = [Mulberry32(42).next() for _ in range(3)]
    if a != b:
        problems.append("Mulberry32 is not reproducible")
    stream = Mulberry32(7)
    values = [stream.next() for _ in range(200)]
    if not all(0.0 <= v < 1.0 for v in values):
        problems.append("Mulberry32 left [0, 1)")
    if len(set(values)) < 190:
        problems.append("Mulberry32 is repeating far too early")

    # -- sorting ------------------------------------------------------------
    data = [64, 25, 12, 22, 11, 90, 45, 30]
    sel = selection_sort_steps(data)
    if sel[-1].state["array"] != sorted(data):
        problems.append("selection sort did not sort")
    if len(sel) != len(data) - 1:
        problems.append("selection sort should emit exactly n-1 steps")
    bub = bubble_sort_steps(data)
    if bub[-1].state["array"] != sorted(data):
        problems.append("bubble sort did not sort")
    if bubble_sort_steps(sorted(data))[-1].state.get("earlyExit") is not True:
        problems.append("bubble sort did not take the early exit on sorted input")

    # -- search -------------------------------------------------------------
    arr = sorted(data)
    for target in arr:
        found = binary_search_steps(arr, target)[-1].state.get("found")
        if not found:
            problems.append(f"binary search missed {target}")
    if binary_search_steps(arr, 999)[-1].state.get("found"):
        problems.append("binary search found an absent value")

    # -- graphs -------------------------------------------------------------
    steps = dijkstra_steps(CAMPUS_GRAPH, "A")
    final = steps[-1].state["distances"]
    #  A-C 2, C-B 1 => B 3; B-D 5 => D 8; D-E 2 => E 10 vs C-E 10 (tie, D-E first
    #  found at 10 keeps prev D? both 10) ; E-F 3 => F 13 vs D-F 6 => 14.
    expected = {"A": 0, "B": 3, "C": 2, "D": 8, "E": 8, "F": 11}
    if final != expected:
        problems.append(f"Dijkstra distances changed: {final} != {expected}")
    path, length = dijkstra_path(CAMPUS_GRAPH, "A", "F")
    if length != 11 or path != ["A", "C", "E", "F"]:
        problems.append(f"Dijkstra path wrong: {path} length {length}")

    k = kruskal_steps(CAMPUS_GRAPH)
    if k[-1].state["edgesPlaced"] != len(CAMPUS_GRAPH.nodes) - 1:
        problems.append("Kruskal did not build a spanning tree")
    if k[-1].state["totalWeight"] != 13:
        problems.append(f"Kruskal weight changed: {k[-1].state['totalWeight']} != 13")

    mst_edges = {frozenset((u, v)) for u, v, _ in k[-1].state["mst"]}
    spt_edges = {
        frozenset((node, parent))
        for node, parent in steps[-1].state["previous"].items()
        if parent
    }
    if mst_edges == spt_edges:
        problems.append(
            "the minimum spanning tree and the shortest-path tree are the same edge set "
            "on CAMPUS_GRAPH, so the M3 figure comparing them compares a thing with "
            "itself. Adjust a weight."
        )

    bfs = bfs_steps(TRAVERSAL_GRAPH, "A")
    if [s.state["current"] for s in bfs] != ["A", "B", "C", "D", "E", "F", "G"]:
        problems.append(f"BFS order changed: {[s.state['current'] for s in bfs]}")
    dfs = dfs_steps(TRAVERSAL_GRAPH, "A")
    if len(dfs) != len(TRAVERSAL_GRAPH.nodes):
        problems.append("DFS did not visit every node")

    # -- geometry -----------------------------------------------------------
    hull = convex_hull_steps(list(GEOMETRY_POINTS))
    hull_vertices = hull[-1].state["hull"]
    if len(hull_vertices) < 3:
        problems.append("convex hull is degenerate")
    interior = set(range(len(GEOMETRY_POINTS))) - set(hull_vertices)
    hull_polygon = [GEOMETRY_POINTS[i] for i in hull_vertices]
    for i in interior:
        p = GEOMETRY_POINTS[i]
        if any(cross(hull_polygon[j], hull_polygon[(j + 1) % len(hull_polygon)], p) < -1e-9
               for j in range(len(hull_polygon))):
            problems.append(f"point {i} is outside the hull but was not a hull vertex")

    ears = ear_clipping_steps(list(EAR_POLYGON))
    triangles = ears[-1].state["triangles"]
    if len(triangles) != len(EAR_POLYGON) - 2:
        problems.append(
            f"ear clipping produced {len(triangles)} triangles, expected {len(EAR_POLYGON) - 2}"
        )
    total_area = sum(
        abs(polygon_area([EAR_POLYGON[i] for i in t])) for t in triangles
    )
    if abs(total_area - abs(polygon_area(list(EAR_POLYGON)))) > 1e-9:
        problems.append("triangulated area does not equal the polygon area")
    if not any(s.state["action"] == "rejected" for s in ears):
        problems.append("the ear-clipping polygon never rejects a candidate — pick a harder one")

    tri = delaunay_triangulation(list(GEOMETRY_POINTS))
    if len(tri) < 5:
        problems.append("Delaunay produced too few triangles")
    cells = voronoi_cells(list(GEOMETRY_POINTS), (0.0, 0.0, 6.2, 6.0))
    if len(cells) != len(GEOMETRY_POINTS):
        problems.append("a Voronoi cell went missing")
    if abs(sum(c["area"] for c in cells) - 6.2 * 6.0) > 1e-6:
        problems.append("Voronoi cells do not tile the bounding box")

    # -- clustering ---------------------------------------------------------
    km = kmeans_steps(list(KMEANS_POINTS), k=3, seed=SEED)
    if not km[-1].state["converged"]:
        problems.append("k-means did not converge inside max_iter")
    inertias = [s.state["inertia"] for s in km]
    if any(b > a + 1e-9 for a, b in zip(inertias, inertias[1:])):
        problems.append("k-means inertia increased — Lloyd's method cannot do that")

    for method in ("single", "complete", "average"):
        steps_l, merges = linkage_steps(list(LINKAGE_POINTS), method)
        if len(merges) != len(LINKAGE_POINTS) - 1:
            problems.append(f"{method} linkage produced {len(merges)} merges")
        heights = [m["height"] for m in merges]
        if any(b < a - 1e-9 for a, b in zip(heights, heights[1:])):
            problems.append(f"{method} linkage heights are not monotone (an inversion)")
        layout = dendrogram_layout(merges, len(LINKAGE_POINTS))
        if sorted(layout["order"]) != list(range(len(LINKAGE_POINTS))):
            problems.append(f"{method} dendrogram lost a leaf")

    # -- convolution --------------------------------------------------------
    for name, spec in KERNELS.items():
        total = sum(sum(row) for row in spec["k"])
        if name in ("box-blur", "gaussian") and abs(total - 1) > 1e-9:
            problems.append(f"kernel {name} should sum to 1, sums to {total}")
        if name in ("sobel-x", "sobel-y", "laplacian", "prewitt-x") and abs(total) > 1e-9:
            problems.append(f"kernel {name} should sum to 0, sums to {total}")
    identity_out = convolve2d(SAMPLE_PATCH, KERNELS["identity"]["k"])
    if [[int(v) for v in row] for row in identity_out] != SAMPLE_PATCH:
        problems.append("the identity kernel changed the image")
    speck = SAMPLE_PATCH[2][2]
    if median_filter(SAMPLE_PATCH)[2][2] == speck:
        problems.append("the median filter did not remove the salt speck")

    # -- LP / simplex -------------------------------------------------------
    steps_s = simplex_steps(SIMPLEX_EXAMPLE)
    last = steps_s[-1].state
    if not last.get("optimal"):
        problems.append("simplex did not reach an optimal tableau")
    if last["solution"]["x1"] != "3/2" or last["solution"]["x2"] != "5/2":
        problems.append(f"simplex optimum changed: {last['solution']}")
    if last["z"] != "430":
        problems.append(f"simplex optimal z changed: {last['z']}, slides say 430")
    z_values = [Fraction(s.state["z"]) for s in steps_s if "z" in s.state]
    if any(b < a for a, b in zip(z_values, z_values[1:])):
        problems.append("simplex let the objective decrease")

    vertices = lp_vertices(LP_FURNITURE)
    if len(vertices) != 4:
        problems.append(f"the furniture LP should have 4 feasible vertices, found {len(vertices)}")
    if abs(vertices[0]["z"] - 220.0) > 1e-9:
        problems.append(f"furniture optimum changed: z = {vertices[0]['z']}, expected 220")

    # -- Monte Carlo --------------------------------------------------------
    mc = monte_carlo_pi(2000, seed=SEED)
    if abs(mc["estimate"] - math.pi) > 0.2:
        problems.append(f"Monte Carlo pi is suspiciously far off: {mc['estimate']}")
    conv = monte_carlo_convergence([100, 400, 1600, 6400], seed=SEED)
    if len(conv) != 4:
        problems.append("convergence series lost an entry")

    clt = clt_series("exponential", [1, 2, 5, 30], samples=400, seed=SEED)
    skews = [s["skewness"] for s in clt["series"]]
    if abs(skews[-1]) >= abs(skews[0]):
        problems.append("CLT skewness did not shrink as n grew")
    for entry in clt["series"]:
        if abs(entry["observedSd"] - entry["theoreticalSd"]) > 0.35 * entry["theoreticalSd"]:
            problems.append(
                f"CLT observed sd {entry['observedSd']:.3f} is far from the theoretical "
                f"{entry['theoreticalSd']:.3f} at n = {entry['n']}"
            )

    bm = brownian_path(seed=SEED)
    if len(bm["x"]) != bm["steps"] + 1:
        problems.append("Brownian path length is wrong")

    for p in problems:
        print(f"  - {p}")
    print("algorithms self-check:", "FAILED" if problems else "OK")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(_self_check())
