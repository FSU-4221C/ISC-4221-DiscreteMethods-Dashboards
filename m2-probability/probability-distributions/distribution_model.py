"""Deterministic PDF, CDF, and expectation model for the probability lab.

Course language uses PDF for both the discrete mass function and the continuous
density. Continuous point probabilities are identically zero; interval
probability is the area (or the CDF). This is a teaching model of named
distributions, not a fitted dataset.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from scipy import stats

CONTINUOUS_FAMILIES = ("gaussian", "uniform", "exponential")
DISCRETE_FAMILIES = ("fair_die", "two_dice", "poisson", "invented")
INVENTED_SUPPORT = (1, 2, 3, 4, 5, 6)
DEFAULT_WEIGHTS = (1.0, 1.0, 1.0, 1.0, 1.0, 1.0)
PLOT_POINTS = 360


def default_state() -> dict[str, Any]:
    """Return the canonical Explore controls for a new session."""

    return {
        "continuous_family": "gaussian",
        "mu": 0.0,
        "sigma": 1.0,
        "uniform_a": 0.0,
        "uniform_b": 6.0,
        "exp_rate": 0.5,
        "x": 0.0,
        "discrete_family": "invented",
        "poisson_lambda": 3.0,
        "weights": list(DEFAULT_WEIGHTS),
        "k": 3,
    }


def _finite_float(value: Any, fallback: float) -> float:
    """Coerce a control value to a finite float."""

    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    if not math.isfinite(number):
        return fallback
    return number


def _clamp(value: float, low: float, high: float) -> float:
    """Clamp a scalar into a closed interval."""

    return min(max(value, low), high)


def normalize_weights(weights: list[float] | tuple[float, ...] | None) -> list[float]:
    """Turn nonnegative masses on six faces into a discrete PDF."""

    raw = list(weights) if weights is not None else list(DEFAULT_WEIGHTS)
    cleaned: list[float] = []
    for index in range(len(INVENTED_SUPPORT)):
        item = raw[index] if index < len(raw) else 1.0
        cleaned.append(max(0.0, _finite_float(item, 1.0)))
    total = sum(cleaned)
    if total <= 0:
        return [1.0 / len(INVENTED_SUPPORT)] * len(INVENTED_SUPPORT)
    return [mass / total for mass in cleaned]


def continuous_support(state: dict[str, Any]) -> tuple[float, float]:
    """Return a plotting window that covers essentially all of the continuous PDF."""

    family = state.get("continuous_family", "gaussian")
    if family == "uniform":
        low = _finite_float(state.get("uniform_a"), 0.0)
        high = _finite_float(state.get("uniform_b"), 6.0)
        if high <= low:
            high = low + 1.0
        pad = 0.15 * (high - low)
        return low - pad, high + pad
    if family == "exponential":
        rate = max(0.05, _finite_float(state.get("exp_rate"), 0.5))
        return 0.0, min(40.0, 8.0 / rate)
    mu = _finite_float(state.get("mu"), 0.0)
    sigma = max(0.15, _finite_float(state.get("sigma"), 1.0))
    return mu - 4.5 * sigma, mu + 4.5 * sigma


def continuous_distribution(state: dict[str, Any]) -> Any:
    """Return the SciPy frozen distribution for the current continuous family."""

    family = state.get("continuous_family", "gaussian")
    if family == "uniform":
        low = _finite_float(state.get("uniform_a"), 0.0)
        high = _finite_float(state.get("uniform_b"), 6.0)
        if high <= low:
            high = low + 1.0
        return stats.uniform(loc=low, scale=high - low)
    if family == "exponential":
        rate = max(0.05, _finite_float(state.get("exp_rate"), 0.5))
        return stats.expon(scale=1.0 / rate)
    mu = _finite_float(state.get("mu"), 0.0)
    sigma = max(0.15, _finite_float(state.get("sigma"), 1.0))
    return stats.norm(loc=mu, scale=sigma)


def continuous_grid(state: dict[str, Any]) -> np.ndarray:
    """Return x-values used only for drawing the continuous curves."""

    low, high = continuous_support(state)
    return np.linspace(low, high, PLOT_POINTS)


def continuous_query(state: dict[str, Any]) -> dict[str, Any]:
    """Evaluate density, CDF, and moments at the current probe x."""

    dist = continuous_distribution(state)
    low, high = continuous_support(state)
    x_value = _clamp(_finite_float(state.get("x"), 0.0), low, high)
    pdf_value = float(dist.pdf(x_value))
    cdf_value = float(dist.cdf(x_value))
    mean_value = float(dist.mean())
    var_value = float(dist.var())
    return {
        "family": state.get("continuous_family", "gaussian"),
        "x": x_value,
        "pdf": pdf_value,
        "cdf": cdf_value,
        "survival": float(max(0.0, 1.0 - cdf_value)),
        "point_probability": 0.0,
        "mean": mean_value,
        "variance": var_value,
        "x_min": low,
        "x_max": high,
        "label": continuous_label(state),
    }


def continuous_curves(state: dict[str, Any]) -> dict[str, np.ndarray | float]:
    """Return PDF and CDF samples for plotting, plus the probe location."""

    dist = continuous_distribution(state)
    xs = continuous_grid(state)
    query = continuous_query(state)
    return {
        "x": xs,
        "pdf": np.asarray(dist.pdf(xs), dtype=float),
        "cdf": np.asarray(dist.cdf(xs), dtype=float),
        "probe_x": query["x"],
        "probe_pdf": query["pdf"],
        "probe_cdf": query["cdf"],
        "mean": query["mean"],
    }


def continuous_label(state: dict[str, Any]) -> str:
    """Human-readable name of the current continuous PDF."""

    family = state.get("continuous_family", "gaussian")
    if family == "uniform":
        low = _finite_float(state.get("uniform_a"), 0.0)
        high = _finite_float(state.get("uniform_b"), 6.0)
        return f"Uniform({low:g}, {high:g})"
    if family == "exponential":
        rate = max(0.05, _finite_float(state.get("exp_rate"), 0.5))
        return f"Exponential(λ = {rate:g})"
    mu = _finite_float(state.get("mu"), 0.0)
    sigma = max(0.15, _finite_float(state.get("sigma"), 1.0))
    return f"Gaussian(μ = {mu:g}, σ = {sigma:g})"


def two_dice_pdf() -> tuple[list[int], list[float]]:
    """Return the PDF of the sum of two fair dice."""

    values = list(range(2, 13))
    counts = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]
    return values, [count / 36.0 for count in counts]


def poisson_pdf(lam: float) -> tuple[list[int], list[float]]:
    """Return a truncated Poisson PDF that covers essentially all of the mass."""

    rate = max(0.2, min(12.0, lam))
    dist = stats.poisson(mu=rate)
    upper = int(max(8, stats.poisson.ppf(0.999, mu=rate)))
    values = list(range(0, upper + 1))
    probs = [float(dist.pmf(value)) for value in values]
    total = sum(probs)
    return values, [prob / total for prob in probs]


def discrete_pdf(state: dict[str, Any]) -> tuple[list[int], list[float]]:
    """Return support and probabilities for the current discrete family."""

    family = state.get("discrete_family", "invented")
    if family == "fair_die":
        values = list(INVENTED_SUPPORT)
        return values, [1.0 / 6.0] * 6
    if family == "two_dice":
        return two_dice_pdf()
    if family == "poisson":
        return poisson_pdf(_finite_float(state.get("poisson_lambda"), 3.0))
    values = list(INVENTED_SUPPORT)
    return values, normalize_weights(state.get("weights"))


def discrete_query(state: dict[str, Any]) -> dict[str, Any]:
    """Evaluate point mass, CDF, and expectation at the selected outcome."""

    values, probs = discrete_pdf(state)
    selected = int(round(_finite_float(state.get("k"), values[0])))
    if selected not in values:
        selected = min(values, key=lambda value: abs(value - selected))
        selected = int(selected)
    point = 0.0
    cdf_value = 0.0
    mean_value = 0.0
    second = 0.0
    for value, prob in zip(values, probs, strict=True):
        mean_value += value * prob
        second += (value**2) * prob
        if value <= selected:
            cdf_value += prob
        if value == selected:
            point = prob
    variance = max(0.0, second - mean_value**2)
    return {
        "family": state.get("discrete_family", "invented"),
        "values": values,
        "probs": probs,
        "k": selected,
        "point_probability": point,
        "cdf": cdf_value,
        "survival": float(max(0.0, 1.0 - cdf_value)),
        "mean": mean_value,
        "variance": variance,
        "label": discrete_label(state),
    }


def discrete_label(state: dict[str, Any]) -> str:
    """Human-readable name of the current discrete PDF."""

    family = state.get("discrete_family", "invented")
    if family == "fair_die":
        return "Fair die (discrete uniform on 1–6)"
    if family == "two_dice":
        return "Sum of two fair dice"
    if family == "poisson":
        lam = _finite_float(state.get("poisson_lambda"), 3.0)
        return f"Poisson(λ = {lam:g})"
    return "Invented die (your masses, renormalized)"


def discrete_cdf_curve(values: list[int], probs: list[float]) -> tuple[list[float], list[float]]:
    """Return a right-continuous step curve for the discrete CDF."""

    if not values:
        return [0.0], [0.0]
    xs: list[float] = [values[0] - 0.8]
    ys: list[float] = [0.0]
    running = 0.0
    for value, prob in zip(values, probs, strict=True):
        xs.extend([value, value])
        ys.extend([running, running + prob])
        running += prob
    xs.append(values[-1] + 0.8)
    ys.append(1.0)
    return xs, ys


def normalize_state(state: dict[str, Any] | None) -> dict[str, Any]:
    """Validate learner-controlled values and keep them JSON-safe."""

    source = state or default_state()
    family = source.get("continuous_family", "gaussian")
    if family not in CONTINUOUS_FAMILIES:
        family = "gaussian"
    discrete_family = source.get("discrete_family", "invented")
    if discrete_family not in DISCRETE_FAMILIES:
        discrete_family = "invented"
    mu = _finite_float(source.get("mu"), 0.0)
    sigma = _clamp(_finite_float(source.get("sigma"), 1.0), 0.15, 5.0)
    uniform_a = _finite_float(source.get("uniform_a"), 0.0)
    uniform_b = _finite_float(source.get("uniform_b"), 6.0)
    if uniform_b <= uniform_a + 0.2:
        uniform_b = uniform_a + 1.0
    exp_rate = _clamp(_finite_float(source.get("exp_rate"), 0.5), 0.05, 4.0)
    weights = normalize_weights(source.get("weights"))
    poisson_lambda = _clamp(_finite_float(source.get("poisson_lambda"), 3.0), 0.2, 12.0)
    normalized = {
        "continuous_family": family,
        "mu": mu,
        "sigma": sigma,
        "uniform_a": uniform_a,
        "uniform_b": uniform_b,
        "exp_rate": exp_rate,
        "x": _finite_float(source.get("x"), 0.0),
        "discrete_family": discrete_family,
        "poisson_lambda": poisson_lambda,
        "weights": weights,
        "k": int(round(_finite_float(source.get("k"), 3.0))),
    }
    low, high = continuous_support(normalized)
    normalized["x"] = _clamp(normalized["x"], low, high)
    values, _probs = discrete_pdf(normalized)
    if normalized["k"] not in values:
        normalized["k"] = int(min(values, key=lambda value: abs(value - normalized["k"])))
    return normalized


def format_probability(value: float) -> str:
    """Format a probability or density for labels and feedback."""

    if not math.isfinite(value):
        return "undefined"
    if abs(value) < 5e-4:
        return f"{value:.2e}"
    return f"{value:.3f}"


def continuous_takeaway(state: dict[str, Any]) -> str:
    """Explain the current continuous probe in course language."""

    query = continuous_query(state)
    return (
        f"Takeaway: at x = {query['x']:.2f}, the PDF height is {format_probability(query['pdf'])}, "
        f"but P(X = {query['x']:.2f}) = 0. The shaded area is F_X(x) = "
        f"P(X ≤ {query['x']:.2f}) = {format_probability(query['cdf'])}."
    )


def discrete_takeaway(state: dict[str, Any]) -> str:
    """Explain the current discrete outcome, CDF, and expectation."""

    query = discrete_query(state)
    return (
        f"Takeaway: P(X = {query['k']}) = {format_probability(query['point_probability'])} and "
        f"F_X({query['k']}) = P(X ≤ {query['k']}) = {format_probability(query['cdf'])}. "
        f"The expected value is E[X] = {query['mean']:.3f}."
    )
