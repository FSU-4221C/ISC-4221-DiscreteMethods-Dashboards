"""Scoring for theoretical and frozen Explore graph questions."""

from __future__ import annotations

from typing import Any

from graph_model import graph_view, normalize_state

THEORY_Q1_CORRECT = "symmetric"
THEORY_Q2_CORRECT = "isolated"


def _view(state: dict[str, Any]) -> dict[str, Any]:
    """Normalize Explore state and derive the same representations as the plots."""

    return graph_view(normalize_state(state))


def vertex_count_prompt(state: dict[str, Any]) -> str:
    """Word the frozen vertex-count question from the live model."""

    view = _view(state)
    kind = view["kind"]
    return (
        f"3. The frozen {kind} is the one drawn in Explore when you froze it. "
        "What is N, the number of vertices? This is the order of the adjacency matrix."
    )


def selected_degree_prompt(state: dict[str, Any]) -> str:
    """Word the frozen degree question for the selected vertex."""

    view = _view(state)
    selected = view["selected"]
    if selected is None:
        return (
            "4. The frozen graph has no vertices. Enter 0 for the degree of a missing vertex."
        )
    if view["directed"]:
        return (
            f"4. In the frozen digraph, what is the out-degree of vertex {selected}? "
            "That is the length of its adjacency-structure sublist (out-neighbors only)."
        )
    return (
        f"4. In the frozen undirected graph, what is the degree of vertex {selected}? "
        "That is the length of its adjacency-structure sublist."
    )


def expected_vertex_count(state: dict[str, Any]) -> int:
    """Return N for the frozen graph."""

    return int(_view(state)["n"])


def expected_selected_degree(state: dict[str, Any]) -> int:
    """Return degree or out-degree of the frozen selected vertex."""

    view = _view(state)
    selected = view["selected"]
    if selected is None:
        return 0
    info = view["degrees"][selected]
    if view["directed"]:
        return int(info["out"])
    return int(info["degree"])


def frozen_summary_bits(state: dict[str, Any]) -> dict[str, str]:
    """Short labels describing the frozen graph for the Practice snapshot."""

    view = _view(state)
    selected = view["selected"] or "none"
    isolated = ", ".join(view["isolated"]) if view["isolated"] else "none"
    return {
        "kind": view["kind"],
        "n": str(view["n"]),
        "m": str(view["m"]),
        "selected": selected,
        "edge_display": view["edge_display"],
        "isolated": isolated,
    }


def _choice_result(answer: str | None, expected: str, correct: str, incorrect: str) -> dict[str, str]:
    """Score one multiple-choice item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    if answer == expected:
        return {"status": "correct", "text": f"Correct. {correct}"}
    return {"status": "incorrect", "text": f"Needs revision. {incorrect}"}


def _integer_result(answer: int | float | None, expected: int, explanation: str) -> dict[str, str]:
    """Score one integer item with exact match."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: enter an integer before submitting."}
    try:
        value = int(round(float(answer)))
    except (TypeError, ValueError):
        return {"status": "incomplete", "text": "Incomplete: enter an integer before submitting."}
    if value == expected:
        return {"status": "correct", "text": f"Correct. {explanation}"}
    return {
        "status": "incorrect",
        "text": f"Needs revision. {explanation} The accepted value is an exact integer.",
    }


def score_practice(
    theory1: str | None,
    theory2: str | None,
    n_answer: int | float | None,
    degree_answer: int | float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen-graph items together."""

    view = _view(explore_state)
    q1 = _choice_result(
        theory1,
        THEORY_Q1_CORRECT,
        (
            "For a simple undirected graph, {uv} is the same as {vu}, so A_ij = A_ji. "
            "The diagonal is zero because this lab does not allow loops."
        ),
        (
            "An undirected simple graph has a symmetric adjacency matrix with zeros on the diagonal. "
            "Directed graphs can break that symmetry: A_ij = 1 means an arc i → j, which need not "
            "come with j → i."
        ),
    )
    q2 = _choice_result(
        theory2,
        THEORY_Q2_CORRECT,
        (
            "An edge list stores pairs of endpoints. An isolated vertex belongs to no pair, so it "
            "does not appear. SIMPLE's list is {AB, AC, BC, CD}; E is only visible in the vertex "
            "list, the zero row of A, or an empty adjacency-structure sublist."
        ),
        (
            "The edge list is not missing E because of a numbering convention or because E is last. "
            "E is isolated: it touches no edge, so no pair in the list can mention it."
        ),
    )

    n_expected = expected_vertex_count(explore_state)
    q3 = _integer_result(
        n_answer,
        n_expected,
        f"N = {n_expected} is the number of labelled vertices and the order of A.",
    )
    degree_expected = expected_selected_degree(explore_state)
    selected = view["selected"]
    if selected is None:
        degree_explain = "The frozen graph has no vertices, so the degree readout is 0."
    elif view["directed"]:
        degree_explain = (
            f"Out-degree of {selected} is {degree_expected}, the length of its out-neighbor sublist."
        )
    else:
        degree_explain = (
            f"Degree of {selected} is {degree_expected}, the length of Sublist({selected})."
        )
    q4 = _integer_result(degree_answer, degree_expected, degree_explain)

    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": (
            f"Progress: {correct_count} of 4 correct. Revisit Explore if the frozen graph no longer "
            "matches the canvas, or revise and submit again."
        ),
    }
