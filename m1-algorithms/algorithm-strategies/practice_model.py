"""Scoring for search and coin-change practice."""

from __future__ import annotations

from typing import Any

from strategy_model import coin_query, normalize_state, search_query

THEORY_Q1_CORRECT = "sorted"
THEORY_Q2_CORRECT = "counterexample"


def binary_steps_prompt(state: dict[str, Any]) -> str:
    """Word the frozen binary-search count from the live model."""

    query = search_query(normalize_state(state))
    return (
        f"3. With the frozen sorted list of n = {query['n']} and target {query['target']}, "
        "how many midpoints does binary search inspect?"
    )


def optimal_coins_prompt(state: dict[str, Any]) -> str:
    """Word the frozen fewest-coin question from the live model."""

    query = coin_query(normalize_state(state))
    return (
        f"4. With the frozen system {query['label']} and amount {query['amount']}, "
        "what is the fewest number of coins?"
    )


def _choice(answer: str | None, expected: str, correct: str, incorrect: str) -> dict[str, str]:
    """Score one multiple-choice item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    if answer == expected:
        return {"status": "correct", "text": f"Correct. {correct}"}
    return {"status": "incorrect", "text": f"Needs revision. {incorrect}"}


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
    binary_answer: int | float | None,
    coins_answer: int | float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen dashboard items."""

    state = normalize_state(explore_state)
    search = search_query(state)
    coins = coin_query(state)
    q1 = _choice(
        theory1,
        THEORY_Q1_CORRECT,
        "Binary search maintains a contiguous interval of a sorted array and discards the half that cannot contain the target.",
        "Binary search is not faster because it is parallel, and it is incorrect on an unsorted list. Sorted order is the prerequisite.",
    )
    q2 = _choice(
        theory2,
        THEORY_Q2_CORRECT,
        "Greedy is optimal for canonical systems such as US coins, but {4, 3, 1} with amount 6 is a standard counterexample (4+1+1 versus 3+3).",
        "Greedy is not guaranteed for every coin system. The dashboard's {4, 3, 1} example is there specifically to break the largest-coin rule.",
    )
    q3 = _integer(
        binary_answer,
        int(search["binary"]["comparisons"]),
        f"Binary search inspects {search['binary']['comparisons']} midpoints: {search['binary']['inspected']}.",
    )
    q4 = _integer(
        coins_answer,
        int(coins["optimal_count"]),
        f"The fewest-coin combination is {coins['optimal']} ({coins['optimal_count']} coins).",
    )
    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": f"Progress: {correct_count} of 4 correct. Revise and submit again, or refresh the frozen Explore settings.",
    }
