"""Monotone-chain convex hull teaching model."""

from __future__ import annotations

from typing import Any

Point = dict[str, float]


def default_state() -> dict[str, Any]:
    """Start with a small point set whose hull is obvious."""

    return normalize_state(
        {
            "points": [
                {"x": 0.15, "y": 0.20},
                {"x": 0.80, "y": 0.18},
                {"x": 0.78, "y": 0.82},
                {"x": 0.18, "y": 0.75},
                {"x": 0.45, "y": 0.48},
                {"x": 0.52, "y": 0.40},
            ]
        }
    )


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Keep at most 16 points inside the unit square."""

    raw = raw or {}
    points: list[Point] = []
    for point in raw.get("points", []):
        points.append(
            {
                "x": min(0.96, max(0.04, float(point.get("x", 0.5)))),
                "y": min(0.96, max(0.04, float(point.get("y", 0.5)))),
            }
        )
        if len(points) >= 16:
            break
    return {"points": points}


def _cross(origin: Point, a: Point, b: Point) -> float:
    """Return the z-component of (a-origin) × (b-origin)."""

    return (a["x"] - origin["x"]) * (b["y"] - origin["y"]) - (a["y"] - origin["y"]) * (b["x"] - origin["x"])


def convex_hull(points: list[Point]) -> list[Point]:
    """Andrew's monotone chain; returns hull vertices in CCW order."""

    unique: list[Point] = []
    seen: set[tuple[float, float]] = set()
    for point in points:
        key = (round(point["x"], 5), round(point["y"], 5))
        if key in seen:
            continue
        seen.add(key)
        unique.append(point)
    unique.sort(key=lambda item: (item["x"], item["y"]))
    if len(unique) <= 2:
        return unique

    lower: list[Point] = []
    for point in unique:
        while len(lower) >= 2 and _cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)
    upper: list[Point] = []
    for point in reversed(unique):
        while len(upper) >= 2 and _cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)
    return lower[:-1] + upper[:-1]


def hull_query(state: dict[str, Any]) -> dict[str, Any]:
    """Classify points as hull vertices or interior."""

    state = normalize_state(state)
    hull = convex_hull(state["points"])
    hull_keys = {(round(point["x"], 5), round(point["y"], 5)) for point in hull}
    interior = [point for point in state["points"] if (round(point["x"], 5), round(point["y"], 5)) not in hull_keys]
    return {
        "points": state["points"],
        "hull": hull,
        "interior": interior,
        "n": len(state["points"]),
        "h": len(hull),
        "interior_count": len(interior),
    }


def add_point(state: dict[str, Any], x: float, y: float) -> dict[str, Any]:
    """Append a canvas click as a new point."""

    current = normalize_state(state)
    if len(current["points"]) >= 16:
        return current
    current["points"].append({"x": x, "y": y})
    return normalize_state(current)


def clear_points() -> dict[str, Any]:
    """Empty the canvas."""

    return {"points": []}


def hull_takeaway(state: dict[str, Any]) -> str:
    """Connect hull cardinality to interior points."""

    query = hull_query(state)
    if query["n"] < 3:
        return "Need at least three non-collinear points before the hull is a polygon."
    return (
        f"{query['n']} points, {query['h']} hull vertices, {query['interior_count']} strictly inside. "
        "The hull is the unique convex polygon containing every point. Interior points never appear as hull vertices."
    )
