"""Seeded Monte Carlo π and CLT teaching models."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

PARENTS = {
    "uniform": {"label": "Uniform(0, 1)", "mean": 0.5, "variance": 1.0 / 12.0},
    "exponential": {"label": "Exponential(λ=1)", "mean": 1.0, "variance": 1.0},
}


def default_state() -> dict[str, Any]:
    """Return a classroom starting configuration with a fixed seed."""

    return normalize_state({"n_points": 200, "seed": 7, "parent": "exponential", "sample_size": 12, "n_means": 400})


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Clamp Monte Carlo controls."""

    raw = raw or {}
    n_points = min(2000, max(20, int(raw.get("n_points", 200))))
    seed = min(99, max(1, int(raw.get("seed", 7))))
    parent = str(raw.get("parent", "exponential"))
    if parent not in PARENTS:
        parent = "exponential"
    sample_size = min(80, max(2, int(raw.get("sample_size", 12))))
    n_means = min(2000, max(50, int(raw.get("n_means", 400))))
    return {
        "n_points": n_points,
        "seed": seed,
        "parent": parent,
        "sample_size": sample_size,
        "n_means": n_means,
    }


def dart_sample(state: dict[str, Any]) -> dict[str, Any]:
    """Throw seeded points in [-1, 1]² and estimate π = 4 * (hits / n)."""

    state = normalize_state(state)
    rng = np.random.default_rng(state["seed"])
    xs = rng.uniform(-1.0, 1.0, state["n_points"])
    ys = rng.uniform(-1.0, 1.0, state["n_points"])
    inside = xs**2 + ys**2 <= 1.0
    hits = int(np.count_nonzero(inside))
    estimate = 4.0 * hits / state["n_points"]
    error = abs(estimate - math.pi)
    return {
        "x": xs.tolist(),
        "y": ys.tolist(),
        "inside": inside.tolist(),
        "hits": hits,
        "n": state["n_points"],
        "estimate": estimate,
        "error": error,
        "seed": state["seed"],
    }


def parent_draws(rng: np.random.Generator, parent: str, count: int) -> np.ndarray:
    """Draw `count` i.i.d. samples from the named parent distribution."""

    if parent == "uniform":
        return rng.uniform(0.0, 1.0, count)
    return rng.exponential(1.0, count)


def clt_sample(state: dict[str, Any]) -> dict[str, Any]:
    """Build a histogram of sample means from a seeded parent distribution."""

    state = normalize_state(state)
    spec = PARENTS[state["parent"]]
    rng = np.random.default_rng(1000 + state["seed"])
    raw = parent_draws(rng, state["parent"], 4000)
    means = np.array(
        [parent_draws(rng, state["parent"], state["sample_size"]).mean() for _ in range(state["n_means"])],
        dtype=float,
    )
    theoretical_mean = spec["mean"]
    theoretical_se = math.sqrt(spec["variance"] / state["sample_size"])
    return {
        "label": spec["label"],
        "parent": state["parent"],
        "raw": raw.tolist(),
        "means": means.tolist(),
        "sample_size": state["sample_size"],
        "n_means": state["n_means"],
        "empirical_mean": float(means.mean()),
        "empirical_std": float(means.std(ddof=1)),
        "theoretical_mean": theoretical_mean,
        "theoretical_se": theoretical_se,
    }


def pi_takeaway(state: dict[str, Any]) -> str:
    """Connect hit-or-miss area to the 1/√n Monte Carlo error scale."""

    sample = dart_sample(state)
    return (
        f"With n = {sample['n']} seeded throws, {sample['hits']} landed in the unit disk, so "
        f"π̂ = 4 × {sample['hits']}/{sample['n']} = {sample['estimate']:.4f} "
        f"(error {sample['error']:.4f}). Typical Monte Carlo error shrinks like 1/√n, not 1/n."
    )


def clt_takeaway(state: dict[str, Any]) -> str:
    """Connect the histogram of means to the CLT scale √(σ²/n)."""

    sample = clt_sample(state)
    return (
        f"Each mean averages {sample['sample_size']} draws from {sample['label']}. "
        f"The histogram of {sample['n_means']} such means has empirical SD {sample['empirical_std']:.3f}; "
        f"the CLT scale is σ/√n = {sample['theoretical_se']:.3f}. The parent need not be Gaussian."
    )
