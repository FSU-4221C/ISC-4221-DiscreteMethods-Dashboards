"""Scoring for convolution and components practice."""

from __future__ import annotations

from typing import Any

from image_model import component_query, convolution_query, normalize_state

THEORY_Q1_CORRECT = "neighborhood"
THEORY_Q2_CORRECT = "diagonal"


def kernel_prompt(state: dict[str, Any]) -> str:
    """Ask for the center weight of the frozen kernel."""

    query = convolution_query(normalize_state(state))
    return f"3. For the frozen kernel ({query['label']}), what is the center weight A_22? Enter the number shown in the 3×3 matrix."


def count_prompt(state: dict[str, Any]) -> str:
    """Ask for the frozen component count."""

    query = component_query(normalize_state(state))
    return f"4. With {query['connectivity']}-connectivity on the thresholded teaching image, how many connected components are there?"


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
    center: float | None,
    count: float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen-image items."""

    state = normalize_state(explore_state)
    conv = convolution_query(state)
    comp = component_query(state)
    center_weight = float(conv["matrix"][1][1])
    q1 = _choice(
        theory1,
        THEORY_Q1_CORRECT,
        "A convolution replaces each pixel by a weighted sum of its neighborhood. The kernel is those weights.",
        "The kernel is not a color lookup and not a histogram. It is a local linear combination.",
    )
    q2 = _choice(
        theory2,
        THEORY_Q2_CORRECT,
        "4-connectivity ignores diagonal steps, so corner-touching squares stay two blobs. 8-connectivity merges them.",
        "The pixel values did not change. Only the definition of neighbor changed.",
    )
    q3 = _numeric(center, center_weight, f"The center weight of {conv['label']} is {center_weight:g}.", 0.05)
    q4 = _numeric(count, float(comp["count"]), f"{comp['connectivity']}-connectivity labels {comp['count']} component(s).", 0.0)
    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": f"Progress: {correct_count} of 4 correct. Refresh the frozen kernel or connectivity if Explore changed.",
    }
