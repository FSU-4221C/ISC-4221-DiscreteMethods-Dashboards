"""Session scoring for snippet practice and frozen Explore questions."""

from __future__ import annotations

import math
from copy import deepcopy
from random import Random
from typing import Any

from complexity_model import (
    clamp_n,
    cost_snapshot,
    format_cost,
    normalize_state,
    ratio_costliest_to_cheapest,
    selected_orders,
)
from question_bank import KINDS, QUESTION_BY_ID, QUESTIONS, TOPICS

DEFAULT_CONFIG = {
    "topics": list(TOPICS),
    "difficulties": ["beginner", "intermediate"],
    "kinds": list(KINDS),
    "count": 10,
}

THEORY_Q1_CORRECT = "add"
THEORY_Q2_CORRECT = "quadratic"


def normalize_config(config: dict[str, Any] | None) -> dict[str, Any]:
    """Validate learner-controlled snippet filters and keep them JSON-safe."""

    source = config or DEFAULT_CONFIG
    topics = [topic for topic in source.get("topics", []) if topic in TOPICS]
    difficulties = [
        level
        for level in source.get("difficulties", [])
        if level in {"beginner", "intermediate"}
    ]
    kinds = [kind for kind in source.get("kinds", []) if kind in KINDS]
    try:
        count = int(source.get("count", 10))
    except (TypeError, ValueError):
        count = 10
    return {
        "topics": topics,
        "difficulties": difficulties,
        "kinds": kinds,
        "count": max(5, min(50, count)),
    }


def available_questions(config: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Return bank items that match the current filters."""

    normalized = normalize_config(config)
    return [
        question
        for question in QUESTIONS
        if question["topic"] in normalized["topics"]
        and question["difficulty"] in normalized["difficulties"]
        and question["kind"] in normalized["kinds"]
    ]


def topic_coverage(config: dict[str, Any] | None) -> dict[str, int]:
    """Count matching snippets in each order family."""

    available = available_questions(config)
    return {topic: sum(question["topic"] == topic for question in available) for topic in TOPICS}


def build_session(config: dict[str, Any] | None = None, seed: int = 1) -> dict[str, Any]:
    """Freeze a deterministic random practice set from the current filters."""

    normalized = normalize_config(config)
    pool = available_questions(normalized)
    count = min(normalized["count"], len(pool))
    ids = [question["id"] for question in Random(int(seed)).sample(pool, count)] if count else []
    message = (
        f"Session ready with {count} snippet(s) from {len(pool)} matching items."
        if count
        else "No snippets match these filters. Broaden the order families or difficulty."
    )
    return {
        "question_ids": ids,
        "index": 0,
        "answers": {},
        "correct": {},
        "attempts": {},
        "config": normalized,
        "seed": int(seed),
        "mode": "mixed",
        "message": message,
    }


def current_question(session: dict[str, Any]) -> dict[str, Any] | None:
    """Return the snippet currently on screen, if any."""

    ids = session.get("question_ids", [])
    if not ids:
        return None
    index = max(0, min(int(session.get("index", 0)), len(ids) - 1))
    return QUESTION_BY_ID[ids[index]]


def move(session: dict[str, Any], direction: int) -> dict[str, Any]:
    """Advance or rewind the session index without changing answers."""

    state = deepcopy(session)
    total = len(state.get("question_ids", []))
    if total:
        state["index"] = max(0, min(total - 1, int(state.get("index", 0)) + direction))
    return state


def submit_answer(session: dict[str, Any], answer: int | None) -> dict[str, Any]:
    """Score the current snippet and keep the chosen option for retry."""

    state = deepcopy(session)
    question = current_question(state)
    if question is None:
        state["message"] = "No active question to score."
        return state
    if answer is None:
        state["message"] = "Choose one option before submitting."
        return state
    answer_index = int(answer)
    question_id = question["id"]
    state["answers"][question_id] = answer_index
    state["correct"][question_id] = answer_index == question["correct"]
    state["attempts"][question_id] = int(state["attempts"].get(question_id, 0)) + 1
    state["message"] = (
        "Correct—continue when you are ready."
        if state["correct"][question_id]
        else "Needs revision—use the explanation, change the option, and retry."
    )
    return state


def clear_current_answer(session: dict[str, Any]) -> dict[str, Any]:
    """Clear only the snippet currently on screen."""

    state = deepcopy(session)
    question = current_question(state)
    if question is None:
        return state
    question_id = question["id"]
    state["answers"].pop(question_id, None)
    state["correct"].pop(question_id, None)
    state["attempts"].pop(question_id, None)
    state["message"] = "Current answer cleared; the rest of the session was preserved."
    return state


def review_missed(session: dict[str, Any]) -> dict[str, Any]:
    """Create a fresh retry set from questions currently marked incorrect."""

    missed = [
        question_id
        for question_id in session.get("question_ids", [])
        if session.get("correct", {}).get(question_id) is False
    ]
    if not missed:
        state = deepcopy(session)
        state["message"] = "No missed questions yet. Submit some answers before starting review."
        return state
    return {
        "question_ids": missed,
        "index": 0,
        "answers": {},
        "correct": {},
        "attempts": {},
        "config": deepcopy(session["config"]),
        "seed": int(session.get("seed", 1)) + 1,
        "mode": "review missed",
        "message": f"Review session ready with {len(missed)} missed question(s).",
    }


def progress(session: dict[str, Any]) -> dict[str, int]:
    """Return answered, correct, and remaining counts for the snippet session."""

    ids = session.get("question_ids", [])
    answers = session.get("answers", {})
    correctness = session.get("correct", {})
    answered = sum(question_id in answers for question_id in ids)
    correct = sum(correctness.get(question_id) is True for question_id in ids)
    return {
        "total": len(ids),
        "answered": answered,
        "correct": correct,
        "remaining": len(ids) - answered,
    }


def state_question_prompt(explore_state: dict[str, Any]) -> str:
    """Word the frozen dashboard question from the same model as the plot."""

    state = normalize_state(explore_state)
    n_value = clamp_n(state["n"])
    orders = selected_orders(state)
    keys = {order["key"] for order in orders}
    if "linear" in keys and "quadratic" in keys:
        return (
            f"3. Using the frozen Explore settings at n = {n_value:,}, how many times more "
            "expensive is O(n²) than O(n)? Use the same operation-count model as the plot."
        )
    snapshot = cost_snapshot(state)
    if len(orders) < 2 or snapshot["cheapest"] is None or snapshot["costliest"] is None:
        return (
            f"3. With the frozen Explore settings, n = {n_value:,} and fewer than two orders "
            "are selected. Enter 1 — the ratio of a class to itself."
        )
    cheapest = snapshot["cheapest"]["label"]
    costliest = snapshot["costliest"]["label"]
    return (
        f"3. Using the frozen Explore settings at n = {n_value:,}, how many times more "
        f"expensive is {costliest} than {cheapest}? Enter the ratio of the model "
        "operation counts from the plot."
    )


def expected_state_answer(explore_state: dict[str, Any]) -> tuple[float, str]:
    """Return the numeric target and a short calculation note."""

    state = normalize_state(explore_state)
    n_value = clamp_n(state["n"])
    orders = selected_orders(state)
    keys = {order["key"] for order in orders}
    if "linear" in keys and "quadratic" in keys:
        ratio = float(n_value)
        note = (
            f"At n = {n_value:,}, O(n²) / O(n) = n = {format_cost(ratio)} "
            "in this operation-count model."
        )
        return ratio, note
    if len(orders) < 2:
        return 1.0, f"Only one order is selected, so the ratio is 1 at n = {n_value:,}."
    ratio = ratio_costliest_to_cheapest(state)
    if ratio is None:
        return float(len(orders)), f"{len(orders)} orders are selected at n = {n_value:,}."
    snapshot = cost_snapshot(state)
    cheapest = snapshot["cheapest"]
    costliest = snapshot["costliest"]
    assert cheapest is not None and costliest is not None
    note = (
        f"At n = {n_value:,}, {costliest['label']} / {cheapest['label']} = "
        f"{format_cost(ratio)} using the same operation-count model as Explore."
    )
    return float(ratio), note


def score_warm_up(
    theory1: str | None,
    theory2: str | None,
    state_answer: float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score the three frozen Explore questions with explanations."""

    expected, expected_note = expected_state_answer(explore_state)
    if theory1 is None:
        q1 = {
            "status": "incomplete",
            "text": "Incomplete: choose an answer before submitting.",
        }
    elif theory1 == THEORY_Q1_CORRECT:
        q1 = {
            "status": "correct",
            "text": "Correct. Sequential loops add; nested loops multiply. Two n-length loops in a row stay O(n).",
        }
    else:
        q1 = {
            "status": "incorrect",
            "text": "Needs revision. Nested loops multiply their bounds. Loops that run one after another add, so O(n) + O(n) is still O(n).",
        }

    if theory2 is None:
        q2 = {
            "status": "incomplete",
            "text": "Incomplete: choose an answer before submitting.",
        }
    elif theory2 == THEORY_Q2_CORRECT:
        q2 = {
            "status": "correct",
            "text": "Correct. n(n − 1)/2 is a quadratic. Dropping the lower-order −n/2 term leaves Θ(n²), which is O(n²).",
        }
    else:
        q2 = {
            "status": "incorrect",
            "text": "Needs revision. A triangular nested loop still visits a quadratic number of pairs. Constants and lower-order terms do not change the class.",
        }

    if state_answer is None:
        q3 = {
            "status": "incomplete",
            "text": "Incomplete: enter a numeric ratio before submitting.",
        }
    else:
        relative = 0.02 if expected >= 1 else 0.05
        absolute = 0.5 if expected >= 10 else 0.05
        close = math.isclose(float(state_answer), expected, rel_tol=relative, abs_tol=absolute)
        if close:
            q3 = {"status": "correct", "text": f"Correct. {expected_note}"}
        else:
            q3 = {
                "status": "incorrect",
                "text": f"Needs revision. {expected_note} Accepted tolerance is 2% (or 0.5 for large values).",
            }

    statuses = [q1["status"], q2["status"], q3["status"]]
    correct_count = sum(status == "correct" for status in statuses)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "correct_count": correct_count,
        "summary": (
            f"Progress: {correct_count} of 3 correct. Revisit Explore if the frozen n or "
            "selected orders no longer match the question, or revise and submit again."
        ),
    }
