"""Scoring for Monte Carlo practice."""

from __future__ import annotations

import math
from typing import Any

from mc_model import clt_sample, dart_sample, normalize_state

THEORY_Q1_CORRECT = "area"
THEORY_Q2_CORRECT = "parent"


def pi_prompt(state: dict[str, Any]) -> str:
    """Word the frozen π̂ question from the same seeded draw as the plot."""

    sample = dart_sample(normalize_state(state))
    return (
        f"3. With seed {sample['seed']} and n = {sample['n']} throws, what is π̂ = 4 × (hits / n)? "
        "Enter the value shown on the dashboard, to two decimal places is enough."
    )


def se_prompt(state: dict[str, Any]) -> str:
    """Word the frozen CLT standard-error question."""

    sample = clt_sample(normalize_state(state))
    return (
        f"4. For {sample['label']} with sample size n = {sample['sample_size']}, "
        "what is the CLT scale σ/√n? Use three decimal places."
    )


def _choice(answer: str | None, expected: str, correct: str, incorrect: str) -> dict[str, str]:
    """Score one multiple-choice item."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: choose an answer before submitting."}
    if answer == expected:
        return {"status": "correct", "text": f"Correct. {correct}"}
    return {"status": "incorrect", "text": f"Needs revision. {incorrect}"}


def _numeric(answer: float | None, expected: float, explanation: str, abs_tol: float) -> dict[str, str]:
    """Score one numeric item with an explicit absolute tolerance."""

    if answer is None:
        return {"status": "incomplete", "text": "Incomplete: enter a numeric answer before submitting."}
    close = math.isclose(float(answer), expected, rel_tol=0.0, abs_tol=abs_tol)
    if close:
        return {"status": "correct", "text": f"Correct. {explanation}"}
    return {"status": "incorrect", "text": f"Needs revision. {explanation} Accepted tolerance is {abs_tol:g}."}


def score_practice(
    theory1: str | None,
    theory2: str | None,
    pi_answer: float | None,
    se_answer: float | None,
    explore_state: dict[str, Any],
) -> dict[str, Any]:
    """Score two concept items and two frozen simulation items."""

    state = normalize_state(explore_state)
    darts = dart_sample(state)
    clt = clt_sample(state)
    q1 = _choice(
        theory1,
        THEORY_Q1_CORRECT,
        "The square has area 4 and the disk has area π, so 4 × (hits / n) estimates π.",
        "π̂ is not the count of hits and not the side length. It is four times the hit fraction.",
    )
    q2 = _choice(
        theory2,
        THEORY_Q2_CORRECT,
        "The CLT is about means of i.i.d. samples. The parent may be skewed (Exponential) or bounded (Uniform).",
        "The parent does not have to be Gaussian. That is the point of the Exponential example.",
    )
    q3 = _numeric(pi_answer, darts["estimate"], f"π̂ = 4 × {darts['hits']}/{darts['n']} = {darts['estimate']:.4f}.", 0.02)
    q4 = _numeric(se_answer, clt["theoretical_se"], f"σ/√n = {clt['theoretical_se']:.3f} for {clt['label']}.", 0.01)
    items = [q1, q2, q3, q4]
    correct_count = sum(item["status"] == "correct" for item in items)
    return {
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "q4": q4,
        "correct_count": correct_count,
        "summary": f"Progress: {correct_count} of 4 correct. Refresh the frozen seed if Explore changed.",
    }
