"""Plotly feasible-region figure for a two-variable LP."""

from __future__ import annotations

from typing import Any

import numpy as np
import plotly.graph_objects as go

from lp_model import lp_query

GARNET = "#782f40"
GOLD = "#ceb888"
TEAL = "#007a78"
INK = "#17212b"
PAPER = "rgba(0,0,0,0)"


def lp_figure(state: dict[str, Any]) -> go.Figure:
    """Draw constraint lines, the feasible region, vertices, and the optimum."""

    query = lp_query(state)
    x0, x1, y0, y1 = query["bounds"]
    xs = np.linspace(x0, x1, 180)
    ys = np.linspace(y0, y1, 180)
    grid_x, grid_y = np.meshgrid(xs, ys)
    feasible = (grid_x >= -1e-9) & (grid_y >= -1e-9)
    figure = go.Figure()
    for a, b, c, kind in query["constraints"]:
        if abs(b) > 1e-12:
            line_y = (c - a * xs) / b
            mask = (line_y >= y0) & (line_y <= y1)
            figure.add_trace(go.Scatter(x=xs[mask], y=line_y[mask], mode="lines", line={"width": 2, "color": GARNET}, name=f"{a:g}x + {b:g}y = {c:g}"))
        else:
            x_val = c / a
            figure.add_trace(go.Scatter(x=[x_val, x_val], y=[y0, y1], mode="lines", line={"width": 2, "color": GARNET}, name=f"{a:g}x = {c:g}"))
        value = a * grid_x + b * grid_y
        feasible &= value <= c + 1e-9 if kind == "le" else value >= c - 1e-9
    figure.add_trace(
        go.Contour(
            x=xs,
            y=ys,
            z=feasible.astype(int),
            showscale=False,
            contours={"start": 0.5, "end": 0.5, "size": 1},
            colorscale=[[0, "rgba(0,0,0,0)"], [1, "rgba(0,122,120,0.22)"]],
            hoverinfo="skip",
            name="feasible",
        )
    )
    if query["vertices"]:
        figure.add_trace(
            go.Scatter(
                x=[item["x"] for item in query["vertices"]],
                y=[item["y"] for item in query["vertices"]],
                mode="markers+text",
                text=[f"z={item['z']:.1f}" for item in query["vertices"]],
                textposition="top center",
                marker={"size": 12, "color": GARNET},
                name="vertices",
            )
        )
    best = query["best"]
    if best:
        figure.add_trace(go.Scatter(x=[best["x"]], y=[best["y"]], mode="markers", marker={"size": 18, "color": GOLD, "symbol": "star"}, name="optimum"))
    figure.update_layout(
        height=460,
        margin={"l": 52, "r": 18, "t": 48, "b": 48},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        title={"text": query["title"], "font": {"color": GARNET}},
        legend={"orientation": "h", "y": 1.02},
        uirevision=f"lp-{query['key']}",
    )
    figure.update_xaxes(title="x", range=[x0, x1], gridcolor="#ddd7cf", zeroline=False, constrain="domain")
    figure.update_yaxes(title="y", range=[y0, y1], gridcolor="#ddd7cf", zeroline=False, scaleanchor="x")
    return figure
