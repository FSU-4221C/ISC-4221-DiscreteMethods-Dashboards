#!/usr/bin/env python3
"""generate_datasets.py — the small fixed datasets the demos read.

    Run everything:   python3 Dashboard/tools/build.py
    Run just this:    python3 Dashboard/tools/generate_datasets.py
    List them:        python3 Dashboard/tools/generate_datasets.py --list

Writes to ``Dashboard/assets/data/m<N>/``. Traces are the *output* of an
algorithm; datasets are its *input* — the graph, the point set, the LP catalogue,
the labelled table. They are separate files because several demos share one
input, and because a student who wants to try the algorithm themselves should be
able to copy the data without wading through a trace.

--------------------------------------------------------------------------
WHY THE DATA IS AUTHORED RATHER THAN SAMPLED
--------------------------------------------------------------------------
Most of these could be generated randomly. They are not, and the reason is
pedagogical rather than technical: a fixed dataset means the figure in the
slides, the table in the lab, the demo on the dashboard and the question on the
exam are all about the same six nodes, and a student can be told "look at node
D" and be right every time.

Where randomness genuinely is the subject — the Monte Carlo samples, the k-means
initialisation — the seed is recorded in the file and is the same mulberry32
stream ``assets/js/demo.js`` uses, so a student can retype it and reproduce the
run exactly.

--------------------------------------------------------------------------
WHAT EVERY FILE CARRIES
--------------------------------------------------------------------------
    schema      "isc4221c-dataset/1"
    id, module, topics, title
    provenance  where the data came from — a slide, a lab, a lecture note, or
                "authored for the 2026 rebuild", stated in words
    columns     for anything tabular, so a page can build a real <table> from
                it without the author retyping the headers
    notes       the things a reader needs in order not to misuse it
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import algorithms as alg

SCHEMA = "isc4221c-dataset/1"
GENERATOR = "Dashboard/tools/generate_datasets.py"
COMMAND = "python3 Dashboard/tools/build.py"

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"


def dataset(
    *,
    id: str,
    module: str,
    topics: list[str],
    title: str,
    provenance: str,
    notes: list[str] | None = None,
    **payload,
) -> dict:
    return {
        "schema": SCHEMA,
        "id": id,
        "module": module,
        "topics": topics,
        "title": title,
        "provenance": provenance,
        "generator": GENERATOR,
        "command": COMMAND,
        "notes": notes or [],
        **payload,
    }


def column(label: str, unit: str = "", numeric: bool = False) -> dict:
    return {"label": label, "unit": unit, "numeric": numeric}


# ---------------------------------------------------------------------------
# M0 — Foundations & tooling
# ---------------------------------------------------------------------------


def m0_python_drills() -> dict:
    """Tiny inputs for the loop/recursion/vectorisation drills of Lab02.

    The expected outputs ship with them. A "Python sandbox" demo cannot execute
    Python in the browser — rule 9 of the authoring contract — so what it can do
    is show the input, let the student predict, and reveal the answer. That only
    works if the answer is data rather than something the page computes.
    """
    fib = [0, 1]
    while len(fib) < 15:
        fib.append(fib[-1] + fib[-2])

    return dataset(
        id="python-drills",
        module="M0",
        topics=["0.8", "0.10", "0.12"],
        title="Worked inputs and outputs for the loop, recursion and NumPy drills",
        provenance="authored for the 2026 rebuild, matching the exercises in Lab02",
        notes=[
            "Every expected output is precomputed. The browser never runs Python "
            "(AUTHORING-CONTRACT rule 9), so a 'predict the output' demo needs the "
            "answer as data.",
            "The factorial row stops at 20 because 21! exceeds what a JavaScript "
            "number represents exactly, and a demo that silently loses precision "
            "teaches the wrong lesson about integers.",
        ],
        drills=[
            {
                "id": "accumulate",
                "prompt": "Sum the integers from 1 to n with a for loop.",
                "inputs": [1, 5, 10, 100],
                "outputs": [1, 15, 55, 5050],
                "closedForm": "n(n + 1) / 2",
            },
            {
                "id": "factorial-recursive",
                "prompt": "Factorial by recursion: n! = n × (n − 1)!, with 0! = 1.",
                "inputs": list(range(0, 21)),
                "outputs": [math.factorial(n) for n in range(0, 21)],
                "closedForm": "n!",
                "note": "Recursion depth grows with n; the iterative version does not.",
            },
            {
                "id": "fibonacci",
                "prompt": "The first fifteen Fibonacci numbers.",
                "inputs": list(range(15)),
                "outputs": fib,
                "note": (
                    "Naive recursion recomputes F(k) exponentially often — 1.3 million "
                    "calls for F(30). This is the motivating example for memoisation."
                ),
            },
            {
                "id": "vectorise",
                "prompt": "Square every element of an array.",
                "inputs": [1, 2, 3, 4, 5, 6, 7, 8],
                "outputs": [1, 4, 9, 16, 25, 36, 49, 64],
                "note": (
                    "The loop and the vectorised form give identical answers; the "
                    "difference is that the vectorised form pushes the loop into "
                    "compiled code."
                ),
            },
        ],
        gitFlow=[
            {"step": 1, "command": "git clone <url>", "effect": "copies the remote repository, and its whole history, onto your machine"},
            {"step": 2, "command": "git switch -c my-feature", "effect": "creates a branch so your work does not touch main"},
            {"step": 3, "command": "git add <files>", "effect": "stages exactly the changes you mean to record"},
            {"step": 4, "command": "git commit -m \"...\"", "effect": "records the staged changes locally, with a message"},
            {"step": 5, "command": "git push -u origin my-feature", "effect": "publishes the branch to the remote"},
            {"step": 6, "command": "open a pull request", "effect": "asks for the branch to be reviewed and merged into main"},
        ],
    )


# ---------------------------------------------------------------------------
# M1 — sorting inputs, coin systems, biology strings
# ---------------------------------------------------------------------------

#: Ten Florida landmarks. Real coordinates, so sorting by latitude has a
#: checkable answer and the lab's "sort geospatial data" task (topic 1.5.1) has
#: something a student recognises rather than ten random floats.
FLORIDA_SITES = [
    ("Tallahassee", 30.4383, -84.2807),
    ("Jacksonville", 30.3322, -81.6557),
    ("Gainesville", 29.6516, -82.3248),
    ("Orlando", 28.5383, -81.3792),
    ("Tampa", 27.9506, -82.4572),
    ("Cape Canaveral", 28.3922, -80.6077),
    ("Sarasota", 27.3364, -82.5307),
    ("Fort Myers", 26.6406, -81.8723),
    ("Miami", 25.7617, -80.1918),
    ("Key West", 24.5551, -81.7800),
]


def m1_datasets() -> dict:
    by_latitude = sorted(FLORIDA_SITES, key=lambda s: s[1])
    return dataset(
        id="m1-inputs",
        module="M1",
        topics=["1.1.1", "1.1.2", "1.1.4", "1.3.3", "1.3.4", "1.5.1", "1.5.2", "1.5.3", "1.5.4"],
        title="The arrays, coin systems and sequences the M1 demos sort and search",
        provenance=(
            "the eight-value array is the 2025 sorting visualiser's default; the coin "
            "systems are its three presets; the coordinates are real Florida sites, for "
            "Lab03's geospatial sort"
        ),
        notes=[
            "The 'problematic' coin system is the point of the greedy demo. On 30 cents "
            "greedy takes 25 + 1 + 1 + 1 + 1 + 1 = 6 coins where 10 + 10 + 10 = 3 is "
            "optimal, so the greedy choice is provably not always right.",
            "The US system IS canonical, so greedy is optimal on it. Starting the demo "
            "there and only failing after the dropdown changes is deliberate: the "
            "counterexample lands harder when the default worked.",
        ],
        sortArray={
            "values": alg.SORT_ARRAY,
            "sorted": sorted(alg.SORT_ARRAY),
            "n": len(alg.SORT_ARRAY),
            "selectionSortComparisons": len(alg.SORT_ARRAY) * (len(alg.SORT_ARRAY) - 1) // 2,
        },
        coinSystems=[
            {
                "id": "us",
                "label": "United States",
                "coins": [1, 5, 10, 25],
                "canonical": True,
                "note": "greedy is optimal for every amount",
            },
            {
                "id": "custom",
                "label": "With a 20-cent coin",
                "coins": [1, 5, 10, 20, 25],
                "canonical": False,
                "counterexample": {
                    "amount": 41,
                    "greedy": [25, 10, 5, 1],
                    "greedyCount": 4,
                    "optimal": [20, 20, 1],
                    "optimalCount": 3,
                },
            },
            {
                "id": "problematic",
                "label": "Only 1, 10 and 25",
                "coins": [1, 10, 25],
                "canonical": False,
                "counterexample": {
                    "amount": 30,
                    "greedy": [25, 1, 1, 1, 1, 1],
                    "greedyCount": 6,
                    "optimal": [10, 10, 10],
                    "optimalCount": 3,
                },
            },
        ],
        geospatial={
            "columns": [
                column("Site"),
                column("Latitude", unit="degrees north", numeric=True),
                column("Longitude", unit="degrees west", numeric=True),
            ],
            "rows": [[name, lat, lon] for name, lat, lon in FLORIDA_SITES],
            "sortedByLatitude": [name for name, _, _ in by_latitude],
            "northernmost": by_latitude[-1][0],
            "southernmost": by_latitude[0][0],
        },
        codonTable=_codon_table(),
        aminoAcidCounts=_amino_acid_counts(),
    )


#: The standard genetic code. Lab04 asks students to translate DNA to protein
#: (topic 1.5.4); the table is the data that task needs and is not something to
#: retype from a textbook once per lab.
def _codon_table() -> dict:
    bases = "TCAG"
    amino = (
        "FFLLSSSSYY**CC*W"
        "LLLLPPPPHHQQRRRR"
        "IIIMTTTTNNKKSSRR"
        "VVVVAAAADDEEGGGG"
    )
    table = {}
    index = 0
    for b1 in bases:
        for b2 in bases:
            for b3 in bases:
                table[b1 + b2 + b3] = amino[index]
                index += 1
    return {
        "note": "'*' marks a stop codon. ATG is both methionine and the usual start codon.",
        "codons": table,
        "start": "ATG",
        "stops": [c for c, a in table.items() if a == "*"],
    }


def _amino_acid_counts() -> dict:
    """A short protein sequence with its letter counts already tallied."""
    sequence = "MKVLATGSSGYRDEFQNIPWHCMKVLATGSSGYRDEFQNIPWHCMKVLAT"
    counts: dict[str, int] = {}
    for letter in sequence:
        counts[letter] = counts.get(letter, 0) + 1
    return {
        "sequence": sequence,
        "length": len(sequence),
        "counts": dict(sorted(counts.items())),
        "mostCommon": max(counts.items(), key=lambda kv: (kv[1], kv[0]))[0],
        "note": (
            "A tally is the simplest possible O(n) pass over a sequence, and it is the "
            "counting task Lab04 sets. The answer is here so a demo can check the "
            "student's rather than recompute its own."
        ),
    }


# ---------------------------------------------------------------------------
# M2 — sample spaces and distributions
# ---------------------------------------------------------------------------


def m2_datasets() -> dict:
    dice_sums = {}
    for n in (1, 2, 3, 4):
        ways = _dice_sum_ways(n)
        total = 6 ** n
        dice_sums[str(n)] = {
            "sums": list(range(n, 6 * n + 1)),
            "ways": [ways[s] for s in range(n, 6 * n + 1)],
            "probabilities": [ways[s] / total for s in range(n, 6 * n + 1)],
            "total": total,
            "mean": 3.5 * n,
            "variance": (35 / 12) * n,
        }

    coin_counts = {}
    for n in (1, 2, 5, 10):
        coin_counts[str(n)] = {
            "heads": list(range(n + 1)),
            "ways": [math.comb(n, k) for k in range(n + 1)],
            "probabilities": [math.comb(n, k) / 2 ** n for k in range(n + 1)],
            "mean": n / 2,
            "variance": n / 4,
        }

    return dataset(
        id="m2-sample-spaces",
        module="M2",
        topics=["2.1.2", "2.3.1", "2.3.2", "2.3.4", "2.3.6", "2.3.8", "2.3.11", "2.4.1"],
        title="Exact sample spaces and distributions for dice and coins",
        provenance=(
            "computed exactly by convolving the uniform die PMF and by the binomial "
            "coefficients; replaces the approximation the 2025 Probability Building "
            "Blocks Explorer used for four or more dice"
        ),
        notes=[
            "The 2025 explorer approximated the dice-sum distribution for n > 3 with a "
            "triangular hack ('relative_prob = max(0.1, 1 - dist_from_middle/max_dist)'), "
            "so its 'theoretical' card was simply wrong for four dice. These counts come "
            "from convolving the uniform PMF n times and are exact.",
            "Probabilities are stored alongside the raw way-counts because the counts are "
            "what makes the reasoning visible: 6 of 36 ways give a sum of 7, and that is "
            "a sentence a student can check by hand.",
        ],
        diceSums=dice_sums,
        coinFlips=coin_counts,
        biasedDie={
            "faces": [1, 2, 3, 4, 5, 6],
            "probabilities": [0.10, 0.10, 0.10, 0.10, 0.10, 0.50],
            "mean": sum(f * p for f, p in zip(range(1, 7), [0.1] * 5 + [0.5])),
            "note": (
                "A die weighted towards six, for the inverse-transform sampling exercise "
                "of Lab05 (topic 2.3.9). The cumulative probabilities are the thresholds "
                "a uniform draw is compared against."
            ),
            "cumulative": [0.10, 0.20, 0.30, 0.40, 0.50, 1.00],
        },
        confidenceZ={
            "0.90": 1.645,
            "0.95": 1.960,
            "0.99": 2.576,
            "note": "Two-sided normal critical values, as used by the Monte Carlo interval demos.",
        },
    )


def _dice_sum_ways(n: int) -> dict[int, int]:
    """Ways to roll each total with n fair dice, by convolution — exact, no hack."""
    ways = {0: 1}
    for _ in range(n):
        nxt: dict[int, int] = {}
        for total, count in ways.items():
            for face in range(1, 7):
                nxt[total + face] = nxt.get(total + face, 0) + count
        ways = nxt
    return ways


# ---------------------------------------------------------------------------
# M3 — graphs in every representation
# ---------------------------------------------------------------------------


def _graph_payload(graph: alg.Graph) -> dict:
    matrix = graph.adjacency_matrix()
    return {
        "name": graph.name,
        "nodes": list(graph.nodes),
        "weighted": graph.weighted,
        "positions": {k: list(v) for k, v in graph.pos.items()},
        "edgeList": [[u, v, w] for u, v, w in graph.edges],
        "adjacencyList": {n: graph.neighbours(n) for n in graph.nodes},
        "adjacencyMatrix": matrix,
        "incidenceMatrix": _incidence_matrix(graph),
        "degrees": {n: graph.degree(n) for n in graph.nodes},
        "nodeCount": len(graph.nodes),
        "edgeCount": len(graph.edges),
        "totalWeight": sum(w for _, _, w in graph.edges) if graph.weighted else None,
        "density": (
            2 * len(graph.edges) / (len(graph.nodes) * (len(graph.nodes) - 1))
        ),
        "grf": _grf_text(graph),
    }


def _incidence_matrix(graph: alg.Graph) -> list[list[int]]:
    """Rows are nodes, columns are edges (topic 3.2.5, currently uncovered)."""
    index = {n: i for i, n in enumerate(graph.nodes)}
    matrix = [[0] * len(graph.edges) for _ in graph.nodes]
    for column, (u, v, _) in enumerate(graph.edges):
        matrix[index[u]][column] = 1
        matrix[index[v]][column] = 1
    return matrix


def _grf_text(graph: alg.Graph) -> str:
    """The course's GRF file format (topic 3.2.6), as literal text.

    Node count, edge count, then one edge per line. Shipped as a string so a
    page can show the file itself rather than describing it, which is what the
    topic actually asks for.
    """
    lines = [f"{len(graph.nodes)} {len(graph.edges)}"]
    index = {n: i + 1 for i, n in enumerate(graph.nodes)}
    for u, v, w in graph.edges:
        lines.append(f"{index[u]} {index[v]} {w}" if graph.weighted
                     else f"{index[u]} {index[v]}")
    return "\n".join(lines) + "\n"


def m3_datasets() -> dict:
    campus = alg.CAMPUS_GRAPH
    traversal = alg.TRAVERSAL_GRAPH
    # Space cost, for the representation trade-off view (topic 3.2.7).
    n, m = len(campus.nodes), len(campus.edges)
    return dataset(
        id="m3-graphs",
        module="M3",
        topics=[
            "3.1.2", "3.1.4", "3.1.5", "3.2.1", "3.2.2", "3.2.3", "3.2.4",
            "3.2.5", "3.2.6", "3.2.7", "3.3.1", "3.3.7",
        ],
        title="The two M3 graphs in every representation the module teaches",
        provenance=(
            "the campus graph extends the 2025 'Simple Weighted' sample with two edges so "
            "that its minimum spanning tree and its shortest-path tree genuinely differ; "
            "the traversal graph is a tree plus one cross edge"
        ),
        notes=[
            "One graph carries Dijkstra, Kruskal, BFS and DFS across the whole module. A "
            "student learns one picture and four algorithms instead of four pictures.",
            "Node positions are authored, not force-directed. spring_layout with a fixed "
            "seed still moves when the graph changes; an authored layout means 'the node "
            "at the top left' is a stable thing to say.",
            "The incidence matrix and the GRF text are included because topics 3.2.5 and "
            "3.2.6 are both marked NEW — nothing in the 2025 material shows either.",
        ],
        graphs={"campus": _graph_payload(campus), "traversal": _graph_payload(traversal)},
        representationCost={
            "columns": [
                column("Representation"),
                column("Space"),
                column("On this graph", unit="cells or entries", numeric=True),
                column("Is u adjacent to v?"),
                column("List the neighbours of v"),
                column("Best when"),
            ],
            "rows": [
                ["Adjacency matrix", "O(V²)", n * n, "O(1)", "O(V)",
                 "the graph is dense, or you test edges constantly"],
                ["Adjacency list", "O(V + E)", n + 2 * m, "O(deg v)", "O(deg v)",
                 "the graph is sparse, or you walk neighbours constantly"],
                ["Edge list", "O(E)", m, "O(E)", "O(E)",
                 "you only ever iterate over edges — Kruskal, for instance"],
            ],
        },
        tspCities={
            "note": (
                "Six cities for the brute-force travelling salesman demo (topics 3.6.11 "
                "and 3.6.12). Six is chosen deliberately: 5! / 2 = 60 distinct tours is "
                "small enough to enumerate in the browser and large enough that seven "
                "cities would be 360 and ten would be 181,440."
            ),
            "cities": [
                {"name": "Tallahassee", "x": 0.0, "y": 0.0},
                {"name": "Jacksonville", "x": 264.0, "y": 24.0},
                {"name": "Gainesville", "x": 200.0, "y": 118.0},
                {"name": "Orlando", "x": 300.0, "y": 232.0},
                {"name": "Tampa", "x": 214.0, "y": 300.0},
                {"name": "Miami", "x": 452.0, "y": 480.0},
            ],
            "distanceUnit": "kilometres, straight line",
            "tourCount": math.factorial(5) // 2,
        },
        maze={
            "note": (
                "A 5 by 5 maze as a grid graph (topic 3.2.9). '#' is wall, '.' is open. "
                "Turning it into an adjacency list and running BFS is the lab exercise; "
                "the shortest path is given so the demo can check an answer."
            ),
            "grid": [
                "S...#",
                "###.#",
                "....#",
                ".####",
                "....E",
            ],
            "start": [0, 0],
            "end": [4, 4],
            "shortestPathLength": 12,
        },
    )


# ---------------------------------------------------------------------------
# M4 — image patches
# ---------------------------------------------------------------------------

#: A 5 by 5 binary image with two 4-connected components that MERGE into one
#: under 8-connectivity. That difference is topic 4.6.6 and is the only reason
#: to have a connectivity control at all; the 2025 view's test matrix did not
#: have it, which is part of why its connectivity radio could be ignored
#: without anyone noticing.
COMPONENTS_IMAGE = [
    [1, 1, 0, 0, 0],
    [1, 1, 0, 1, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
    [1, 1, 0, 0, 1],
]


def _label_components(image: list[list[int]], connectivity: int) -> tuple[list[list[int]], int]:
    """Two-pass labelling with an explicit equivalence table (topics 4.6.3-4.6.5)."""
    rows, cols = len(image), len(image[0])
    labels = [[0] * cols for _ in range(rows)]
    equivalence: dict[int, int] = {}
    current = 0

    def find(x: int) -> int:
        while equivalence.get(x, x) != x:
            x = equivalence[x]
        return x

    neighbours = [(-1, 0), (0, -1)] if connectivity == 4 else [(-1, 0), (0, -1), (-1, -1), (-1, 1)]

    for r in range(rows):
        for c in range(cols):
            if not image[r][c]:
                continue
            found = []
            for dr, dc in neighbours:
                rr, cc = r + dr, c + dc
                if 0 <= rr < rows and 0 <= cc < cols and labels[rr][cc]:
                    found.append(find(labels[rr][cc]))
            if not found:
                current += 1
                labels[r][c] = current
                equivalence[current] = current
            else:
                smallest = min(found)
                labels[r][c] = smallest
                for other in found:
                    if other != smallest:
                        equivalence[other] = smallest

    remap: dict[int, int] = {}
    for r in range(rows):
        for c in range(cols):
            if labels[r][c]:
                root = find(labels[r][c])
                if root not in remap:
                    remap[root] = len(remap) + 1
                labels[r][c] = remap[root]
    return labels, len(remap)


def _morphology(image: list[list[int]], op: str) -> list[list[int]]:
    """Dilation or erosion with a 3 by 3 square structuring element.

    Topics 4.6.10 and 4.6.11 are examined on the FINAL but appear only in a
    supplementary deck, in no tutorial and in no 2025 dashboard — the clearest
    assess-what-was-not-taught risk in the course. Both are here.
    """
    rows, cols = len(image), len(image[0])
    out = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            window = [
                image[rr][cc]
                for rr in range(max(0, r - 1), min(rows, r + 2))
                for cc in range(max(0, c - 1), min(cols, c + 2))
            ]
            out[r][c] = max(window) if op == "dilate" else min(window)
    return out


def m4_datasets() -> dict:
    labels4, count4 = _label_components(COMPONENTS_IMAGE, 4)
    labels8, count8 = _label_components(COMPONENTS_IMAGE, 8)
    dilated = _morphology(COMPONENTS_IMAGE, "dilate")
    eroded = _morphology(COMPONENTS_IMAGE, "erode")

    patch = alg.SAMPLE_PATCH
    flat = [v for row in patch for v in row]
    histogram = {}
    for v in flat:
        histogram[v] = histogram.get(v, 0) + 1
    low, high = min(flat), max(flat)
    stretched = [
        [round((v - low) / (high - low) * 255) for v in row] for row in patch
    ]

    return dataset(
        id="m4-images",
        module="M4",
        topics=[
            "4.1.4", "4.2.3", "4.3.1", "4.3.2", "4.3.3", "4.6.1", "4.6.3",
            "4.6.4", "4.6.5", "4.6.6", "4.6.9", "4.6.10", "4.6.11",
        ],
        title="Small image patches for histograms, labelling and morphology",
        provenance=(
            "authored for the 2026 rebuild; the binary patch is chosen so that "
            "4-connectivity and 8-connectivity give DIFFERENT answers, which the 2025 "
            "test matrix did not"
        ),
        notes=[
            "Every image here is small enough to print every pixel value in a table. "
            "That is the point: 'segmentation' becomes checkable arithmetic rather than "
            "a picture that changes.",
            f"The binary patch has {count4} components under 4-connectivity and "
            f"{count8} under 8-connectivity. The 2025 connected-components view ignored "
            "its own connectivity control entirely, and on its test matrix nobody could "
            "have noticed.",
            "Dilation and erosion are included because they are examined on the final but "
            "appear only in the supplementary Images_OZ deck — no tutorial, no dashboard.",
            "The PGM text is the actual file format (topic 4.2.3): magic number, "
            "dimensions, maximum value, then the pixels.",
        ],
        greyPatch={
            "pixels": patch,
            "rows": len(patch),
            "cols": len(patch[0]),
            "min": low,
            "max": high,
            "mean": sum(flat) / len(flat),
            "histogram": [{"value": v, "count": c} for v, c in sorted(histogram.items())],
            "contrastStretched": stretched,
            "stretchFormula": "(v - min) / (max - min) x 255, clipped to 0 and 255",
            "pgm": _pgm_text(patch, high),
        },
        binaryPatch={
            "pixels": COMPONENTS_IMAGE,
            "labels4Connected": labels4,
            "components4Connected": count4,
            "labels8Connected": labels8,
            "components8Connected": count8,
            "dilated": dilated,
            "eroded": eroded,
            "structuringElement": "3 by 3 square",
            "morphologyNote": (
                "Dilation grows the foreground and closes small gaps; erosion shrinks it "
                "and removes specks. Erosion then dilation is an opening, which removes "
                "specks without regrowing them."
            ),
        },
        kernels={
            key: {"label": spec["label"], "values": spec["k"],
                  "sum": round(sum(sum(r) for r in spec["k"]), 10),
                  "topic": spec["topic"], "effect": spec["effect"]}
            for key, spec in alg.KERNELS.items()
        },
        colourBlocks={
            "note": (
                "A 6 by 6 RGB image of five flat colour blocks, for k-means colour "
                "quantisation (topic 4.3.4). Five distinct colours means k = 5 recovers "
                "them exactly and k = 3 has to merge two, which is the demonstration."
            ),
            "size": [6, 6],
            "palette": [
                {"name": "red", "rgb": [200, 40, 40]},
                {"name": "green", "rgb": [40, 160, 60]},
                {"name": "blue", "rgb": [40, 60, 200]},
                {"name": "yellow", "rgb": [230, 210, 60]},
                {"name": "purple", "rgb": [130, 60, 170]},
            ],
            "indices": [
                [0, 0, 1, 1, 2, 2],
                [0, 0, 1, 1, 2, 2],
                [3, 3, 4, 4, 0, 0],
                [3, 3, 4, 4, 0, 0],
                [1, 1, 2, 2, 3, 3],
                [1, 1, 2, 2, 3, 3],
            ],
        },
    )


def _pgm_text(patch: list[list[int]], maximum: int) -> str:
    lines = [
        "P2",
        f"# generated by {GENERATOR}",
        f"{len(patch[0])} {len(patch)}",
        str(maximum),
    ]
    for row in patch:
        lines.append(" ".join(str(v) for v in row))
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# M5 — clustering point sets and a labelled table for decision trees
# ---------------------------------------------------------------------------

#: Fourteen days of weather with a play/do-not-play label. Every attribute is
#: nominal, every split is enumerable by hand, and the information gains come
#: out to memorable numbers — which is what topics 5.6.6 to 5.6.9 and six final
#: exam problems need and what the course currently has no dataset for.
WEATHER_ROWS = [
    ("D1", "sunny", "hot", "high", "weak", "no"),
    ("D2", "sunny", "hot", "high", "strong", "no"),
    ("D3", "overcast", "hot", "high", "weak", "yes"),
    ("D4", "rain", "mild", "high", "weak", "yes"),
    ("D5", "rain", "cool", "normal", "weak", "yes"),
    ("D6", "rain", "cool", "normal", "strong", "no"),
    ("D7", "overcast", "cool", "normal", "strong", "yes"),
    ("D8", "sunny", "mild", "high", "weak", "no"),
    ("D9", "sunny", "cool", "normal", "weak", "yes"),
    ("D10", "rain", "mild", "normal", "weak", "yes"),
    ("D11", "sunny", "mild", "normal", "strong", "yes"),
    ("D12", "overcast", "mild", "high", "strong", "yes"),
    ("D13", "overcast", "hot", "normal", "weak", "yes"),
    ("D14", "rain", "mild", "high", "strong", "no"),
]
WEATHER_ATTRIBUTES = ["outlook", "temperature", "humidity", "wind"]


def _entropy(labels: list[str]) -> float:
    total = len(labels)
    if total == 0:
        return 0.0
    out = 0.0
    for value in set(labels):
        p = labels.count(value) / total
        if p > 0:
            out -= p * math.log2(p)
    return out


def _gini(labels: list[str]) -> float:
    total = len(labels)
    if total == 0:
        return 0.0
    return 1.0 - sum((labels.count(v) / total) ** 2 for v in set(labels))


def _classification_error(labels: list[str]) -> float:
    total = len(labels)
    if total == 0:
        return 0.0
    return 1.0 - max(labels.count(v) for v in set(labels)) / total


def _split_quality(rows, attribute_index: int) -> dict:
    labels = [r[-1] for r in rows]
    parent_entropy = _entropy(labels)
    parent_gini = _gini(labels)
    groups: dict[str, list] = {}
    for row in rows:
        groups.setdefault(row[attribute_index], []).append(row)

    weighted_entropy = 0.0
    weighted_gini = 0.0
    branches = []
    for value, subset in sorted(groups.items()):
        sub_labels = [r[-1] for r in subset]
        weight = len(subset) / len(rows)
        weighted_entropy += weight * _entropy(sub_labels)
        weighted_gini += weight * _gini(sub_labels)
        branches.append(
            {
                "value": value,
                "count": len(subset),
                "yes": sub_labels.count("yes"),
                "no": sub_labels.count("no"),
                "entropy": _entropy(sub_labels),
                "gini": _gini(sub_labels),
                "pure": len(set(sub_labels)) == 1,
            }
        )
    return {
        "attribute": WEATHER_ATTRIBUTES[attribute_index - 1],
        "branches": branches,
        "parentEntropy": parent_entropy,
        "childEntropy": weighted_entropy,
        "informationGain": parent_entropy - weighted_entropy,
        "parentGini": parent_gini,
        "childGini": weighted_gini,
        "giniGain": parent_gini - weighted_gini,
    }


def m5_datasets() -> dict:
    labels = [r[-1] for r in WEATHER_ROWS]
    splits = [_split_quality(WEATHER_ROWS, i) for i in range(1, 5)]
    best = max(splits, key=lambda s: s["informationGain"])

    return dataset(
        id="m5-data-mining",
        module="M5",
        topics=[
            "5.2.1", "5.2.3", "5.3.1", "5.3.6", "5.4.2", "5.4.3", "5.5.1",
            "5.6.1", "5.6.3", "5.6.5", "5.6.6", "5.6.7", "5.6.8", "5.6.9", "5.6.10",
        ],
        title="Point sets for clustering and a labelled table for decision trees",
        provenance=(
            "the twelve clustering points are the M5 lecture-note worked example (LN-9), "
            "which exists only in the notes; the fourteen-row weather table is the "
            "standard nominal-attribute example for information gain"
        ),
        notes=[
            "The twelve-point example was replaced in the P1 deck by a 'Live example!' "
            "placeholder, so the only place it survives is the lecture notes. Rebuilding "
            "it here is a restoration, not a re-illustration.",
            "Every impurity measure and every information gain in this file is computed, "
            "not transcribed. A demo can show its working and a student can check it: "
            f"splitting on {best['attribute']} gains "
            f"{best['informationGain']:.4f} bits, the most of the four.",
            "The overcast branch of the outlook split is PURE — all four days are 'yes' — "
            "which is why Hunt's algorithm stops there and makes it a leaf. That is the "
            "step students are asked to justify on the final.",
        ],
        clusteringPoints={
            "twelvePoint": {
                "points": [list(p) for p in alg.LINKAGE_POINTS],
                "labels": [str(i + 1) for i in range(len(alg.LINKAGE_POINTS))],
                "metric": "Euclidean",
                "source": "M5 lecture notes, the single/complete/average linkage example",
            },
            "kmeansPoints": {
                "points": [list(p) for p in alg.KMEANS_POINTS],
                "trueClusters": 3,
                "note": (
                    "Three visually separate blobs of six points each, so a correct "
                    "k-means run has an answer the student can see, and an "
                    "initialisation-sensitivity demo has something to go wrong with."
                ),
            },
            "distanceFunctions": [
                {"id": "euclidean", "label": "Euclidean (L2)",
                 "formula": "square root of the sum of squared differences",
                 "example": {"a": [0, 0], "b": [3, 4], "distance": 5.0}},
                {"id": "manhattan", "label": "Manhattan / cityblock (L1)",
                 "formula": "the sum of absolute differences",
                 "example": {"a": [0, 0], "b": [3, 4], "distance": 7.0}},
                {"id": "chebyshev", "label": "Chebyshev (L-infinity)",
                 "formula": "the largest single absolute difference",
                 "example": {"a": [0, 0], "b": [3, 4], "distance": 4.0}},
            ],
        },
        decisionTree={
            "columns": [
                column("Day"), column("Outlook"), column("Temperature"),
                column("Humidity"), column("Wind"), column("Play"),
            ],
            "rows": [list(r) for r in WEATHER_ROWS],
            "attributes": WEATHER_ATTRIBUTES,
            "target": "play",
            "classCounts": {"yes": labels.count("yes"), "no": labels.count("no")},
            "rootEntropy": _entropy(labels),
            "rootGini": _gini(labels),
            "rootClassificationError": _classification_error(labels),
            "splits": splits,
            "bestSplit": best["attribute"],
            "bestGain": best["informationGain"],
            "impurityNote": (
                "Entropy, Gini and classification error all peak at a 50/50 split and are "
                "zero on a pure node. They disagree about the middle, which is why the "
                "choice of measure changes the tree."
            ),
        },
        impurityCurve={
            "note": (
                "Entropy, Gini and classification error as a function of the proportion of "
                "one class, for the two-class case. This is the curve figure the slides "
                "draw and the exam asks about."
            ),
            "p": [round(i / 20, 2) for i in range(21)],
            "entropy": [
                round(_entropy(["a"] * i + ["b"] * (20 - i)), 6) for i in range(21)
            ],
            "gini": [round(_gini(["a"] * i + ["b"] * (20 - i)), 6) for i in range(21)],
            "classificationError": [
                round(_classification_error(["a"] * i + ["b"] * (20 - i)), 6)
                for i in range(21)
            ],
        },
    )


# ---------------------------------------------------------------------------
# M6 — geometry fixtures and quadrature rules
# ---------------------------------------------------------------------------


def m6_datasets() -> dict:
    triangle = [(0.0, 0.0), (4.0, 0.5), (1.5, 3.0)]
    area = abs(alg.polygon_area(triangle))
    centroid = alg.polygon_centroid(triangle)
    sides = [
        math.dist(triangle[i], triangle[(i + 1) % 3]) for i in range(3)
    ]

    return dataset(
        id="m6-geometry",
        module="M6",
        topics=[
            "6.1.1", "6.1.2", "6.2.1", "6.2.2", "6.2.3", "6.2.5", "6.3.1",
            "6.3.8", "6.4.1", "6.5.1", "6.5.5", "6.5.6", "6.5.7", "6.5.8",
        ],
        title="Point sets, polygons, a worked triangle, and the quadrature rules",
        provenance=(
            "authored for the 2026 rebuild; the point set is in general position (no "
            "three collinear, no four cocircular) so the Delaunay triangulation is unique"
        ),
        notes=[
            "The ten-point set does triple duty: convex hull, Voronoi diagram and "
            "Delaunay triangulation. Three figures of one picture is worth more than "
            "three pictures.",
            "The eight-vertex polygon has two reflex vertices, so ear clipping has to "
            "reject a candidate before it succeeds. A convex test polygon would let a "
            "broken implementation pass.",
            "Quadrature weights sum to 1 and are applied to the triangle's AREA, so the "
            "rule reads 'area times a weighted average of f' — which is the form the "
            "slides use and the one that generalises.",
        ],
        pointSet={
            "points": [list(p) for p in alg.GEOMETRY_POINTS],
            "labels": [f"P{i + 1}" for i in range(len(alg.GEOMETRY_POINTS))],
            "boundingBox": {
                "xMin": min(p[0] for p in alg.GEOMETRY_POINTS),
                "xMax": max(p[0] for p in alg.GEOMETRY_POINTS),
                "yMin": min(p[1] for p in alg.GEOMETRY_POINTS),
                "yMax": max(p[1] for p in alg.GEOMETRY_POINTS),
            },
            "generalPosition": True,
        },
        polygon={
            "vertices": [list(p) for p in alg.EAR_POLYGON],
            "labels": [f"V{i + 1}" for i in range(len(alg.EAR_POLYGON))],
            "orientation": "counter-clockwise",
            "area": abs(alg.polygon_area(alg.EAR_POLYGON)),
            "centroid": list(alg.polygon_centroid(alg.EAR_POLYGON)),
            "convex": len(alg.reflex_vertices(list(alg.EAR_POLYGON))) == 0,
            "reflexVertices": [i + 1 for i in alg.reflex_vertices(list(alg.EAR_POLYGON))],
            "expectedTriangles": len(alg.EAR_POLYGON) - 2,
        },
        triangle={
            "vertices": [list(p) for p in triangle],
            "sides": [round(s, 6) for s in sides],
            "perimeter": sum(sides),
            "area": area,
            "centroid": list(centroid),
            "orientation": "counter-clockwise" if alg.polygon_area(triangle) > 0 else "clockwise",
            "crossProductZ": alg.cross(*triangle),
            "insideTests": [
                {"point": [1.5, 1.0], "inside": alg.point_in_triangle((1.5, 1.0), *triangle)},
                {"point": [3.0, 2.0], "inside": alg.point_in_triangle((3.0, 2.0), *triangle)},
                {"point": [0.5, 2.5], "inside": alg.point_in_triangle((0.5, 2.5), *triangle)},
            ],
        },
        quadrature={
            "note": (
                "Barycentric quadrature rules on a triangle. The integral is the triangle's "
                "area times the weighted sum of f at the listed barycentric points."
            ),
            "rules": [
                {
                    "id": "centroid",
                    "label": "Rule of precision 1 (centroid)",
                    "points": [[1 / 3, 1 / 3, 1 / 3]],
                    "weights": [1.0],
                    "exactFor": "any polynomial of degree 1 or less",
                    "topic": "6.5.7",
                },
                {
                    "id": "midpoints",
                    "label": "Rule of precision 2 (edge midpoints)",
                    "points": [[0.5, 0.5, 0.0], [0.0, 0.5, 0.5], [0.5, 0.0, 0.5]],
                    "weights": [1 / 3, 1 / 3, 1 / 3],
                    "exactFor": "any polynomial of degree 2 or less",
                    "topic": "6.5.8",
                },
                {
                    "id": "vertices",
                    "label": "Vertex rule (precision 1)",
                    "points": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
                    "weights": [1 / 3, 1 / 3, 1 / 3],
                    "exactFor": "any polynomial of degree 1 or less",
                    "topic": "6.5.6",
                },
            ],
        },
        lineProjection={
            "note": "The worked point-to-line examples of topics 6.1.2 to 6.1.8.",
            "a": [1.0, 1.0],
            "b": [5.0, 3.0],
            "probes": [
                {"point": list(p), **{
                    k: (list(v) if isinstance(v, tuple) else v)
                    for k, v in alg.point_line_projection(p, (1.0, 1.0), (5.0, 3.0)).items()
                }}
                for p in [(2.0, 4.0), (4.0, 1.2), (6.4, 4.6), (0.2, 2.2)]
            ],
        },
    )


# ---------------------------------------------------------------------------
# M7 — the LP problem catalogue
# ---------------------------------------------------------------------------

#: The five problems from the 2025 LP Visualizer, with their scenarios. Kept
#: because the staged reveal — read the scenario, formulate it, look at the
#: geometry, check your answer — is the pedagogy, and it needs the words as
#: much as the numbers.
LP_CATALOGUE = [
    {
        "id": "furniture",
        "title": "The Furniture Factory",
        "sense": "max",
        "scenario": (
            "A workshop makes chairs and tables. A chair takes 2 hours of machine time "
            "and 1 hour of finishing; a table takes 1 hour of each. There are 10 machine "
            "hours and 6 finishing hours available. A chair yields 40 dollars of profit "
            "and a table 30."
        ),
        "objective": "maximise 40x + 30y",
        "variables": ["x = chairs per day", "y = tables per day"],
        "constraints": ["2x + y <= 10 (machine hours)", "x + y <= 6 (finishing hours)"],
        "a": [[2, 1], [1, 1]],
        "b": [10, 6],
        "c": [40, 30],
        "bounds": [0, 10],
    },
    {
        "id": "diet",
        "title": "The Diet Problem",
        "sense": "min",
        "scenario": (
            "Two foods must supply at least 100 units of each of two nutrients. Food X "
            "gives 10 units of the first and 20 of the second; food Y gives 20 and 10. "
            "Food X costs 0.60 a serving and food Y 0.50."
        ),
        "objective": "minimise 0.6x + 0.5y",
        "variables": ["x = servings of food X", "y = servings of food Y"],
        "constraints": ["10x + 20y >= 100 (nutrient 1)", "20x + 10y >= 100 (nutrient 2)"],
        "a": [[10, 20], [20, 10]],
        "b": [100, 100],
        "c": [0.6, 0.5],
        "sensePerConstraint": [">=", ">="],
        "bounds": [0, 15],
        "note": (
            "The historically first large LP, and the one that motivated the simplex "
            "method. Note the >= constraints: the feasible region is unbounded above, "
            "which is fine for a minimisation."
        ),
    },
    {
        "id": "investment",
        "title": "Investment Strategy",
        "sense": "max",
        "scenario": (
            "Ten thousand dollars is to be split between a fund returning 10 per cent and "
            "a bond returning 5 per cent. At least 2,000 must go into the bond, and no "
            "more than 6,000 into the fund."
        ),
        "objective": "maximise 0.10x + 0.05y",
        "variables": ["x = dollars in the fund", "y = dollars in the bond"],
        "constraints": ["x + y <= 10000", "y >= 2000", "x <= 6000"],
        "a": [[1, 1], [0, 1], [1, 0]],
        "b": [10000, 2000, 6000],
        "c": [0.10, 0.05],
        "sensePerConstraint": ["<=", ">=", "<="],
        "bounds": [0, 12000],
    },
    {
        "id": "crops",
        "title": "Crop Planting",
        "sense": "max",
        "scenario": (
            "A hundred acres can be planted with two crops. Crop A needs 2 units of "
            "labour per acre and crop B needs 1; 160 units of labour are available. Crop "
            "A returns 200 per acre and crop B returns 300."
        ),
        "objective": "maximise 200x + 300y",
        "variables": ["x = acres of crop A", "y = acres of crop B"],
        "constraints": ["x + y <= 100 (acres)", "2x + y <= 160 (labour)"],
        "a": [[1, 1], [2, 1]],
        "b": [100, 160],
        "c": [200, 300],
        "bounds": [0, 120],
    },
    {
        "id": "cargo",
        "title": "Cargo Shipping",
        "sense": "max",
        "scenario": (
            "A hold has 100 cubic metres of volume and a 6,000 kilogram weight limit. "
            "Crate A takes 1 cubic metre and 100 kilograms; crate B takes 2 cubic metres "
            "and 50 kilograms. Crate A is worth 500 and crate B 800."
        ),
        "objective": "maximise 500x + 800y",
        "variables": ["x = crates of type A", "y = crates of type B"],
        "constraints": ["x + 2y <= 100 (volume)", "100x + 50y <= 6000 (weight)"],
        "a": [[1, 2], [100, 50]],
        "b": [100, 6000],
        "c": [500, 800],
        "bounds": [0, 80],
    },
]


def m7_datasets() -> dict:
    solved = []
    for problem in LP_CATALOGUE:
        spec = {
            "name": problem["title"],
            "sense": problem["sense"],
            "objective": problem["c"],
            "constraints": [
                {"a": a, "b": b, "op": op}
                for a, b, op in zip(
                    problem["a"],
                    problem["b"],
                    problem.get("sensePerConstraint", ["<="] * len(problem["b"])),
                )
            ],
            "variableNames": ["x", "y"],
        }
        vertices = alg.lp_vertices(spec)
        if problem["sense"] == "min":
            vertices.sort(key=lambda v: v["z"])
            for v in vertices:
                v["optimal"] = abs(v["z"] - vertices[0]["z"]) < 1e-9
        solved.append(
            {
                **problem,
                "vertices": [
                    {"x": v["x"], "y": v["y"], "z": v["z"], "optimal": v["optimal"],
                     "from": v["from"]}
                    for v in vertices
                ],
                "optimum": {
                    "x": vertices[0]["x"], "y": vertices[0]["y"], "z": vertices[0]["z"]
                } if vertices else None,
                "vertexCount": len(vertices),
            }
        )

    return dataset(
        id="m7-linear-programs",
        module="M7",
        topics=[
            "7.1.1", "7.1.3", "7.2.1", "7.2.4", "7.2.5", "7.2.6", "7.2.7",
            "7.3.1", "7.3.2", "7.4.1", "7.4.4", "7.4.6", "7.4.9", "7.5.3", "7.5.8",
        ],
        title="Five linear programs, solved by enumerating their feasible corners",
        provenance="the five problems of the 2025 LP Visualizer, with their scenarios kept",
        notes=[
            "The scenarios are kept because the staged reveal — read the situation, "
            "formulate it, look at the geometry, check your answer — is the pedagogy, and "
            "it needs the words as much as the numbers.",
            "Every optimum here is found by enumerating the feasible basic solutions, "
            "which is the brute-force method of topics 7.4.6 to 7.4.9. The count of "
            "candidate intersections against the count that turn out feasible is the "
            "argument for simplex.",
            "The diet problem's >= constraints cannot go straight into the tableau "
            "builder in algorithms.py: a >= row needs a surplus and an artificial "
            "variable, and a phase-1 problem to drive the artificial out (topic 7.4.3). "
            "It is here for the graphical view.",
        ],
        problems=solved,
        standardForm={
            "note": (
                "The running simplex example in standard form. Each <= constraint gains "
                "one slack variable, so two constraints in two unknowns become two "
                "equations in four — an underdetermined system whose basic solutions are "
                "the corners (topics 7.4.1, 7.4.4, 7.4.5)."
            ),
            "original": [
                "maximise z = 120 x1 + 100 x2",
                "2 x1 + 2 x2 <= 8",
                "5 x1 + 3 x2 <= 15",
                "x1, x2 >= 0",
            ],
            "withSlack": [
                "maximise z = 120 x1 + 100 x2",
                "2 x1 + 2 x2 + x3 = 8",
                "5 x1 + 3 x2 + x4 = 15",
                "x1, x2, x3, x4 >= 0",
            ],
            "matrixA": [[2, 2, 1, 0], [5, 3, 0, 1]],
            "vectorB": [8, 15],
            "vectorC": [120, 100, 0, 0],
            "basicSolutionCount": math.comb(4, 2),
            "feasibleBasicSolutionCount": 4,
            "slackMeaning": (
                "x3 is unused capacity in the first constraint and x4 in the second. A "
                "slack variable that is zero at the optimum means that constraint is "
                "binding — it is what stops you doing better."
            ),
        },
    )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

DATASETS: dict[str, callable] = {
    "m0/python-drills.json": m0_python_drills,
    "m1/inputs.json": m1_datasets,
    "m2/sample-spaces.json": m2_datasets,
    "m3/graphs.json": m3_datasets,
    "m4/images.json": m4_datasets,
    "m5/data-mining.json": m5_datasets,
    "m6/geometry.json": m6_datasets,
    "m7/linear-programs.json": m7_datasets,
}


def generate(data_root: Path = DATA, only: str | None = None) -> list[tuple[Path, bool]]:
    written = []
    for relative, builder in DATASETS.items():
        if only and only not in relative:
            continue
        target = data_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        content = json.dumps(builder(), indent=2, ensure_ascii=False, allow_nan=False) + "\n"
        changed = not target.exists() or target.read_text(encoding="utf-8") != content
        if changed:
            target.write_text(content, encoding="utf-8")
        written.append((target, changed))
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--only")
    args = parser.parse_args()

    if args.list:
        for relative in DATASETS:
            print(relative)
        return 0

    results = generate(only=args.only)
    for path, changed in results:
        print(f"  {'wrote  ' if changed else 'ok     '} {path.relative_to(ROOT)}")
    print(f"\n{len(results)} datasets, {sum(1 for _, c in results if c)} changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
