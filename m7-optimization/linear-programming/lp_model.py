"""Two-variable linear-program teaching model."""

from __future__ import annotations

from typing import Any

PROBLEMS: dict[str, dict[str, Any]] = {
    "furniture": {
        "title": "Furniture factory",
        "kind": "max",
        "objective": (40.0, 30.0),
        "constraints": [(2.0, 1.0, 10.0, "le"), (1.0, 1.0, 6.0, "le")],
        "bounds": (0.0, 10.0, 0.0, 10.0),
        "story": "Chairs x and tables y. Maximize 40x + 30y subject to 2x + y ≤ 10 (wood) and x + y ≤ 6 (labor), x, y ≥ 0.",
    },
    "diet": {
        "title": "Diet problem",
        "kind": "min",
        "objective": (0.6, 0.5),
        "constraints": [(10.0, 20.0, 100.0, "ge"), (20.0, 10.0, 100.0, "ge")],
        "bounds": (0.0, 15.0, 0.0, 15.0),
        "story": "Foods x and y. Minimize 0.6x + 0.5y subject to 10x + 20y ≥ 100 and 20x + 10y ≥ 100, x, y ≥ 0.",
    },
    "crops": {
        "title": "Crop planting",
        "kind": "max",
        "objective": (200.0, 300.0),
        "constraints": [(1.0, 1.0, 100.0, "le"), (2.0, 1.0, 160.0, "le")],
        "bounds": (0.0, 120.0, 0.0, 160.0),
        "story": "Wheat x and corn y (acres). Maximize 200x + 300y subject to x + y ≤ 100 (land) and 2x + y ≤ 160 (labor).",
    },
}


def default_state() -> dict[str, Any]:
    """Start with the furniture factory, the lecture running example."""

    return normalize_state({"problem": "furniture"})


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Validate the problem key."""

    raw = raw or {}
    problem = str(raw.get("problem", "furniture"))
    if problem not in PROBLEMS:
        problem = "furniture"
    return {"problem": problem}


def _satisfies(x: float, y: float, constraints: list[tuple[float, float, float, str]]) -> bool:
    """Return whether (x, y) meets every inequality, including x, y ≥ 0."""

    if x < -1e-9 or y < -1e-9:
        return False
    for a, b, c, kind in constraints:
        value = a * x + b * y
        if kind == "le" and value > c + 1e-8:
            return False
        if kind == "ge" and value < c - 1e-8:
            return False
    return True


def vertices_of(problem_key: str) -> list[dict[str, Any]]:
    """Intersect every pair of boundary lines and keep feasible vertices."""

    spec = PROBLEMS[problem_key]
    lines = [(a, b, c, kind) for a, b, c, kind in spec["constraints"]]
    lines.extend([(1.0, 0.0, 0.0, "ge"), (0.0, 1.0, 0.0, "ge")])
    found: list[dict[str, Any]] = []
    for i, (a1, b1, c1, _k1) in enumerate(lines):
        for a2, b2, c2, _k2 in lines[i + 1 :]:
            det = a1 * b2 - a2 * b1
            if abs(det) < 1e-12:
                continue
            x = (c1 * b2 - c2 * b1) / det
            y = (a1 * c2 - a2 * c1) / det
            if not _satisfies(x, y, spec["constraints"]):
                continue
            duplicate = any(abs(x - item["x"]) < 1e-7 and abs(y - item["y"]) < 1e-7 for item in found)
            if duplicate:
                continue
            c_obj, d_obj = spec["objective"]
            found.append({"x": x, "y": y, "z": c_obj * x + d_obj * y})
    return found


def lp_query(state: dict[str, Any]) -> dict[str, Any]:
    """Evaluate the objective at every feasible vertex."""

    state = normalize_state(state)
    spec = PROBLEMS[state["problem"]]
    verts = vertices_of(state["problem"])
    if not verts:
        best = None
    elif spec["kind"] == "max":
        best = max(verts, key=lambda item: item["z"])
    else:
        best = min(verts, key=lambda item: item["z"])
    return {
        "key": state["problem"],
        "title": spec["title"],
        "kind": spec["kind"],
        "story": spec["story"],
        "objective": spec["objective"],
        "constraints": spec["constraints"],
        "bounds": spec["bounds"],
        "vertices": verts,
        "best": best,
    }


def lp_takeaway(state: dict[str, Any]) -> str:
    """State the vertex principle for the current problem."""

    query = lp_query(state)
    best = query["best"]
    if best is None:
        return "This instance has no feasible vertex in the plotted window."
    word = "maximum" if query["kind"] == "max" else "minimum"
    return (
        f"A bounded two-variable LP attains its {word} at a vertex of the feasible region. "
        f"Here the {word} is z = {best['z']:.2f} at ({best['x']:.2f}, {best['y']:.2f}). "
        "Evaluating the objective at every feasible vertex is the whole algorithm in 2D."
    )
