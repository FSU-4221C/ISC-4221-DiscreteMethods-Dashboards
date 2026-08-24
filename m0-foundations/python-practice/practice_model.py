"""Pure session and scoring model for the Python practice dashboard."""

from __future__ import annotations

from copy import deepcopy
from random import Random
from typing import Any

from question_bank import KINDS, QUESTION_BY_ID, QUESTIONS, TOPICS


DEFAULT_CONFIG = {
    "topics": list(TOPICS),
    "difficulties": ["beginner", "intermediate"],
    "kinds": list(KINDS),
    "count": 10,
}


def normalize_config(config: dict[str, Any] | None) -> dict[str, Any]:
    """Validate learner-controlled filters and keep them JSON-safe."""

    source = config or DEFAULT_CONFIG
    topics = [topic for topic in source.get("topics", []) if topic in TOPICS]
    difficulties = [level for level in source.get("difficulties", []) if level in {"beginner", "intermediate"}]
    kinds = [kind for kind in source.get("kinds", []) if kind in KINDS]
    try:
        count = int(source.get("count", 10))
    except (TypeError, ValueError):
        count = 10
    return {
        "topics": topics,
        "difficulties": difficulties,
        "kinds": kinds,
        "count": max(5, min(20, count)),
    }


def available_questions(config: dict[str, Any] | None) -> list[dict[str, Any]]:
    normalized = normalize_config(config)
    return [
        question
        for question in QUESTIONS
        if question["topic"] in normalized["topics"]
        and question["difficulty"] in normalized["difficulties"]
        and question["kind"] in normalized["kinds"]
    ]


def topic_coverage(config: dict[str, Any] | None) -> dict[str, int]:
    available = available_questions(config)
    return {topic: sum(q["topic"] == topic for q in available) for topic in TOPICS}


def build_session(config: dict[str, Any] | None = None, seed: int = 1) -> dict[str, Any]:
    """Freeze a deterministic random practice set from the current filters."""

    normalized = normalize_config(config)
    pool = available_questions(normalized)
    count = min(normalized["count"], len(pool))
    ids = [question["id"] for question in Random(int(seed)).sample(pool, count)] if count else []
    message = (
        f"Session ready with {count} question(s) from {len(pool)} matching snippets."
        if count
        else "No snippets match these filters. Return to Explore and broaden the selection."
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
    ids = session.get("question_ids", [])
    if not ids:
        return None
    index = max(0, min(int(session.get("index", 0)), len(ids) - 1))
    return QUESTION_BY_ID[ids[index]]


def move(session: dict[str, Any], direction: int) -> dict[str, Any]:
    state = deepcopy(session)
    total = len(state.get("question_ids", []))
    if total:
        state["index"] = max(0, min(total - 1, int(state.get("index", 0)) + direction))
    return state


def submit_answer(session: dict[str, Any], answer: int | None) -> dict[str, Any]:
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
