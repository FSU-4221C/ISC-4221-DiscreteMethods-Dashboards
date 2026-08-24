# ISC 4221C interactive labs

Local Dash labs for Discrete Algorithms for Science Applications, grouped by
course module. Each lab has an **Explore** tab (one to four interactive
sections) and a **Practice** tab with concept questions plus items scored from
the frozen Explore state.

These pages are not on the public course index yet.

Create a shared environment for all labs from the repository root:

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

Then change to a lab folder listed below and run:

```bash
python app.py
```

| Module | Lab | Port | What it teaches |
| --- | --- | --- | --- |
| 0 Foundations | `m0-foundations/python-practice` | 8051 | Python drills for the course |
| 0 Foundations | `m0-foundations/git-github` | 8050 | Working tree, staging, commits, remotes |
| 1 Algorithms | `m1-algorithms/algorithm-orders` | 8052 | Big-O growth curves and snippet classification |
| 1 Algorithms | `m1-algorithms/algorithm-strategies` | 8055 | Sequential vs binary search; greedy vs optimal coins |
| 2 Probability | `m2-probability/probability-distributions` | 8053 | PDF, CDF, and expectation |
| 2 Probability | `m2-probability/monte-carlo` | 8056 | Seeded π estimate and the CLT |
| 3 Graphs | `m3-graphs/graph-builder` | 8054 | Click-to-build graphs and their representations |
| 3 Graphs | `m3-graphs/graph-algorithms` | 8057 | BFS vs DFS; Dijkstra on nonnegative weights |
| 4 Images | `m4-images/image-processing` | 8058 | 3×3 convolution; 4- vs 8-connected components |
| 5 Data mining | — | — | No executable lab yet (Examples_Current had a tutorial only) |
| 6 Geometry | `m6-geometry/convex-hulls` | 8059 | Click-to-add points and Andrew's monotone chain |
| 7 Optimization | `m7-optimization/linear-programming` | 8060 | 2-variable LPs, feasible region, vertex principle |

Run one lab at a time, or set the lab's `*_DASHBOARD_PORT` environment variable.

Each lab folder contains `test_*.py`. From that folder, run:

```bash
python -m unittest -v
```
