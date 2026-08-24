"""Plotly figures for the Monte Carlo dartboard and CLT histograms."""

from __future__ import annotations

from typing import Any

import numpy as np
import plotly.graph_objects as go

from mc_model import clt_sample, dart_sample

GARNET = "#782f40"
GOLD = "#ceb888"
TEAL = "#007a78"
INK = "#17212b"
PAPER = "rgba(0,0,0,0)"


def _base(height: int, uirevision: str) -> go.Figure:
    """Apply the shared FSU-light Plotly treatment."""

    figure = go.Figure()
    figure.update_layout(
        height=height,
        margin={"l": 52, "r": 18, "t": 42, "b": 48},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.02, "x": 0},
        uirevision=uirevision,
    )
    figure.update_xaxes(gridcolor="#ddd7cf", zeroline=False)
    figure.update_yaxes(gridcolor="#ddd7cf", zeroline=False)
    return figure


def pi_figure(state: dict[str, Any]) -> go.Figure:
    """Scatter hits and misses inside the unit square, with the unit circle."""

    sample = dart_sample(state)
    xs = np.asarray(sample["x"])
    ys = np.asarray(sample["y"])
    inside = np.asarray(sample["inside"], dtype=bool)
    figure = _base(420, f"pi-{sample['seed']}-{sample['n']}")
    theta = np.linspace(0, 2 * np.pi, 200)
    figure.add_trace(go.Scatter(x=np.cos(theta), y=np.sin(theta), mode="lines", line={"color": TEAL, "width": 2}, name="unit circle", hoverinfo="skip"))
    figure.add_trace(go.Scatter(x=xs[inside], y=ys[inside], mode="markers", marker={"size": 6, "color": GARNET}, name="inside", hovertemplate="inside<extra></extra>"))
    figure.add_trace(go.Scatter(x=xs[~inside], y=ys[~inside], mode="markers", marker={"size": 6, "color": GOLD}, name="outside", hovertemplate="outside<extra></extra>"))
    figure.update_xaxes(range=[-1.05, 1.05], constrain="domain", title="x")
    figure.update_yaxes(range=[-1.05, 1.05], scaleanchor="x", scaleratio=1, title="y")
    figure.update_layout(title=f"π̂ = {sample['estimate']:.4f}   (n = {sample['n']})")
    return figure


def clt_figure(state: dict[str, Any]) -> go.Figure:
    """Histogram of sample means with the CLT normal overlay."""

    sample = clt_sample(state)
    means = np.asarray(sample["means"])
    figure = _base(380, f"clt-{sample['parent']}-{sample['sample_size']}")
    figure.add_trace(go.Histogram(x=means, nbinsx=24, marker={"color": "rgba(120,47,64,0.75)"}, name="sample means"))
    grid = np.linspace(float(means.min()), float(means.max()), 120)
    sd = max(sample["theoretical_se"], 1e-9)
    density = (1.0 / (sd * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((grid - sample["theoretical_mean"]) / sd) ** 2)
    # Scale the curve to histogram counts.
    bin_width = (means.max() - means.min()) / 24 if means.max() > means.min() else 1.0
    figure.add_trace(
        go.Scatter(
            x=grid,
            y=density * len(means) * bin_width,
            mode="lines",
            line={"color": TEAL, "width": 3},
            name="CLT N(μ, σ²/n)",
        )
    )
    figure.update_layout(bargap=0.05, title=f"{sample['label']}, n = {sample['sample_size']}")
    figure.update_xaxes(title="sample mean")
    figure.update_yaxes(title="count")
    return figure
