"""Scoring for traversal and Dijkstra practice."""

from __future__ import annotations

from typing import Any

from graph_alg_model import dijkstra_query, normalize_state, traversal_query

THEORY_Q1_CORRECT = "queue"
THEORY_Q2_CORRECT = "weights"


def bfs_prompt(state: dict[str, Any]) -> str:
    """Word the frozen BFS-order question."""

    query = traversal_query(normalize_state(state))
    return f"3. From start {query['start']}, what is the third vertex in the BFS visit order? Enter the letter."


def dist_prompt(state: dict[str, Any]) -> str:
    """Word the frozen Dijkstra distance question."""

    query = dijkstra_query(normalize_state(state))
    return (
        f"4. After Dijkstra finishes from {query['start']}, what is the shortest-path weight to {query['goal']}? "
        "Enter the integer total of the teal path."
    )


def _choice(answer: str | None, expected: str, correct: str, incorrect: str) -> dict[str, str]:
    """Score one multiple-choice item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    if answer == expected:
        return {"status": "correct", "text": f"Correct. {correct}"}
    return {"status": "incorrect", "text": f"Needs revision. {incorrect}"}


def _text(answer: str | None, expected: str, explanation: str) -> dict[str, str]:
    """Score a single-letter vertex answer."""

    if answer is None or str(answer).strip() == "":
        return {"status": "incomplete", "text": "Incomplete: enter a vertex letter before submitting."}
    if str(answer).strip().upper() == expected:
        return {"status": "correct", "text": f"Correct. {explanation}"}
    return {"status": "incorrect", "text": f"Needs revision. {explanation}"}


def _integer(answer: int | float | None, expected: int, explanation: str) -> dict[str, str]:
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
    third_vertex: str | None,
    distance: int | float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen-graph items."""

    state = normalize_state(explore_state)
    trav = traversal_query(state)
    dij = dijkstra_query(state)
    third = trav["bfs_order"][2] if len(trav["bfs_order"]) >= 3 else trav["bfs_order"][-1]
    q1 = _choice(
        theory1,
        THEORY_Q1_CORRECT,
        "BFS stores the frontier in a queue, so earlier-discovered vertices are expanded first (layer by layer).",
        "DFS uses a stack. Dijkstra uses a priority queue of tentative distances, which is not BFS unless every weight is 1.",
    )
    q2 = _choice(
        theory2,
        THEORY_Q2_CORRECT,
        "Dijkstra's distance is the sum of edge weights along a path. BFS counts hops and matches Dijkstra only when every weight is 1.",
        "The teal path is a weighted shortest path, not necessarily the fewest-hop BFS path.",
    )
    q3 = _text(third_vertex, third, f"BFS visit order from {trav['start']} is {trav['bfs_order']}, so the third vertex is {third}.")
    q4 = _integer(distance, int(dij["goal_dist"] or 0), f"Shortest {dij['start']}–{dij['goal']} path {'–'.join(dij['path'])} has weight {dij['goal_dist']}.")
    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": f"Progress: {correct_count} of 4 correct. Refresh the frozen graph if the start or goal changed.",
    }
