"""Scoring for convex-hull practice."""

from __future__ import annotations

from typing import Any

from hull_model import hull_query, normalize_state

THEORY_Q1_CORRECT = "convex"
THEORY_Q2_CORRECT = "interior"


def hull_count_prompt(state: dict[str, Any]) -> str:
    """Ask for the frozen hull cardinality."""

    query = hull_query(normalize_state(state))
    return f"3. How many hull vertices does the frozen point set have? (h in the Explore readout)"


def interior_prompt(state: dict[str, Any]) -> str:
    """Ask for the frozen interior count."""

    query = hull_query(normalize_state(state))
    return f"4. How many of the frozen points are strictly interior to the hull?"


def _choice(answer: str | None, expected: str, correct: str, incorrect: str) -> dict[str, str]:
    """Score one multiple-choice item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    if answer == expected:
        return {"status": "correct", "text": f"Correct. {correct}"}
    return {"status": "incorrect", "text": f"Needs revision. {incorrect}"}


def _integer(answer: float | None, expected: int, explanation: str) -> dict[str, str]:
    """Score one exact integer."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: enter an integer before submitting."}
    try:
        value = int(round(float(answer)))
    except (TypeError, ValueError):
        return {"status": "incomplete", "text": "Incomplete: enter an integer before submitting."}
    if value == expected:
        return {"status": "correct", "text": f"Correct. {explanation}"}
    return {"status": "incorrect", "text": f"Needs revision. {explanation}"}


def score_practice(
    theory1: str | None,
    theory2: str | None,
    hull_count: float | None,
    interior_count: float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen-point-set items."""

    query = hull_query(normalize_state(explore_state))
    q1 = _choice(
        theory1,
        THEORY_Q1_CORRECT,
        "The convex hull is the unique convex polygon that contains every point of the set.",
        "The hull is not the bounding box and not the Delaunay triangulation. It is the convex polygon wrapping the set.",
    )
    q2 = _choice(
        theory2,
        THEORY_Q2_CORRECT,
        "A strictly interior point can be removed without changing the hull. Only hull vertices define the polygon.",
        "Interior points lie inside the polygon; they are not hull vertices.",
    )
    q3 = _integer(hull_count, query["h"], f"The hull has {query['h']} vertices.")
    q4 = _integer(interior_count, query["interior_count"], f"{query['interior_count']} points lie strictly inside.")
    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": f"Progress: {correct_count} of 4 correct. Refresh the frozen point set if you added points.",
    }
