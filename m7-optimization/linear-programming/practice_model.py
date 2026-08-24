"""Scoring for linear-programming practice."""

from __future__ import annotations

from typing import Any

from lp_model import lp_query, normalize_state

THEORY_Q1_CORRECT = "vertex"
THEORY_Q2_CORRECT = "halfplanes"


def z_prompt(state: dict[str, Any]) -> str:
    """Ask for the frozen optimal objective value."""

    query = lp_query(normalize_state(state))
    best = query["best"]
    kind = "maximum" if query["kind"] == "max" else "minimum"
    return f"3. For the frozen problem ({query['title']}), what is the {kind} value of z? Enter the number on the gold star."


def vertex_prompt(state: dict[str, Any]) -> str:
    """Ask how many feasible vertices the frozen LP has."""

    query = lp_query(normalize_state(state))
    return f"4. How many feasible vertices does the frozen {query['title']} instance have?"


def _choice(answer: str | None, expected: str, correct: str, incorrect: str) -> dict[str, str]:
    """Score one multiple-choice item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    if answer == expected:
        return {"status": "correct", "text": f"Correct. {correct}"}
    return {"status": "incorrect", "text": f"Needs revision. {incorrect}"}


def _numeric(answer: float | None, expected: float, explanation: str, abs_tol: float) -> dict[str, str]:
    """Score one numeric item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: enter a numeric answer before submitting."}
    if abs(float(answer) - expected) <= abs_tol:
        return {"status": "correct", "text": f"Correct. {explanation}"}
    return {"status": "incorrect", "text": f"Needs revision. {explanation}"}


def score_practice(
    theory1: str | None,
    theory2: str | None,
    z_answer: float | None,
    n_vertices: float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen-LP items."""

    query = lp_query(normalize_state(explore_state))
    best = query["best"]
    q1 = _choice(
        theory1,
        THEORY_Q1_CORRECT,
        "A bounded two-variable LP attains its optimum at a vertex of the feasible region, so it is enough to evaluate z there.",
        "The optimum is not an arbitrary interior point. The vertex principle is the 2D reason simplex walks vertices.",
    )
    q2 = _choice(
        theory2,
        THEORY_Q2_CORRECT,
        "Each linear inequality is a half-plane. The feasible region is their intersection (including x ≥ 0, y ≥ 0).",
        "The feasible region is not one constraint line. It is the intersection of half-planes.",
    )
    z_expected = float(best["z"]) if best else 0.0
    q3 = _numeric(z_answer, z_expected, f"The optimum is z = {z_expected:.2f} at ({best['x']:.2f}, {best['y']:.2f})." if best else "No feasible vertex.", 0.15)
    q4 = _numeric(n_vertices, float(len(query["vertices"])), f"There are {len(query['vertices'])} feasible vertices.", 0.0)
    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": f"Progress: {correct_count} of 4 correct. Refresh the frozen problem if you switched word problems.",
    }
