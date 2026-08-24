"""Scoring for theoretical and frozen Explore distribution questions."""

from __future__ import annotations

import math
from typing import Any

from distribution_model import continuous_query, discrete_query, format_probability, normalize_state

THEORY_Q1_CORRECT = "zero"
THEORY_Q2_CORRECT = "cdf"


def continuous_state_prompt(state: dict[str, Any]) -> str:
    """Word the frozen continuous CDF question from the same model as the plot."""

    query = continuous_query(normalize_state(state))
    return (
        f"3. With the frozen continuous settings ({query['label']}), what is "
        f"F_X({query['x']:.2f}) = P(X ≤ {query['x']:.2f})? Enter a probability between 0 and 1."
    )


def discrete_state_prompt(state: dict[str, Any]) -> str:
    """Word the frozen discrete expectation question from the same model as the plot."""

    query = discrete_query(normalize_state(state))
    return (
        f"4. With the frozen discrete PDF ({query['label']}), what is E[X]? "
        "Use the same weighted sum as the Explore readout."
    )


def expected_continuous_cdf(state: dict[str, Any]) -> float:
    """Return F_X(x) for the frozen continuous probe."""

    return float(continuous_query(normalize_state(state))["cdf"])


def expected_discrete_mean(state: dict[str, Any]) -> float:
    """Return E[X] for the frozen discrete PDF."""

    return float(discrete_query(normalize_state(state))["mean"])


def _numeric_result(
    answer: float | None,
    expected: float,
    explanation: str,
    abs_tol: float,
) -> dict[str, str]:
    """Score one numeric item with an explicit tolerance."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: enter a numeric answer before submitting."}
    close = math.isclose(float(answer), expected, rel_tol=0.0, abs_tol=abs_tol)
    if close:
        return {"status": "correct", "text": f"Correct. {explanation}"}
    return {
        "status": "incorrect",
        "text": f"Needs revision. {explanation} Accepted tolerance is {abs_tol:g}.",
    }


def score_practice(
    theory1: str | None,
    theory2: str | None,
    cdf_answer: float | None,
    mean_answer: float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen dashboard items together."""

    state = normalize_state(explore_state)
    cont = continuous_query(state)
    disc = discrete_query(state)

    if theory1 is None:
        q1 = {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    elif theory1 == THEORY_Q1_CORRECT:
        q1 = {
            "status": "correct",
            "text": "Correct. A continuous random variable has infinitely many values, so a single point gets probability 0. The PDF height is density, not P(X = x).",
        }
    else:
        q1 = {
            "status": "incorrect",
            "text": "Needs revision. For a continuous PDF, P(X = x) = 0. Probability lives in intervals: the area under p_X between two bounds, which is a difference of CDF values.",
        }

    if theory2 is None:
        q2 = {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    elif theory2 == THEORY_Q2_CORRECT:
        q2 = {
            "status": "correct",
            "text": "Correct. By definition F_X(x) = P(X ≤ x). On the discrete side it is a running sum; on the continuous side it is the integral (the shaded area).",
        }
    else:
        q2 = {
            "status": "incorrect",
            "text": "Needs revision. The CDF is not the density at x and not P(X > x). It is the accumulated probability up to and including x.",
        }

    cdf_expected = expected_continuous_cdf(state)
    q3 = _numeric_result(
        cdf_answer,
        cdf_expected,
        (
            f"F_X({cont['x']:.2f}) = {format_probability(cdf_expected)} "
            f"for {cont['label']}."
        ),
        0.01,
    )
    mean_expected = expected_discrete_mean(state)
    q4 = _numeric_result(
        mean_answer,
        mean_expected,
        f"E[X] = Σ x p_X(x) = {mean_expected:.3f} for {disc['label']}.",
        0.03,
    )

    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": (
            f"Progress: {correct_count} of 4 correct. Revisit Explore if the frozen probe or "
            "invented masses no longer match the question, or revise and submit again."
        ),
    }
