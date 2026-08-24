"""Plotly canvas for points and their convex hull."""

from __future__ import annotations

from typing import Any

import numpy as np
import plotly.graph_objects as go

from hull_model import hull_query

GARNET = "#782f40"
GOLD = "#ceb888"
TEAL = "#007a78"
INK = "#17212b"
PAPER = "rgba(0,0,0,0)"


def hull_figure(state: dict[str, Any]) -> go.Figure:
    """Draw interior points, hull vertices, and the hull polygon."""

    query = hull_query(state)
    figure = go.Figure()
    samples = np.linspace(0.0, 1.0, 50)
    figure.add_trace(
        go.Heatmap(
            x=samples,
            y=samples,
            z=np.zeros((len(samples), len(samples))),
            showscale=False,
            hoverinfo="none",
            colorscale=[[0, "rgba(247,243,237,0.35)"], [1, "rgba(247,243,237,0.35)"]],
        )
    )
    if query["hull"] and query["h"] >= 2:
        hx = [point["x"] for point in query["hull"]] + [query["hull"][0]["x"]]
        hy = [point["y"] for point in query["hull"]] + [query["hull"][0]["y"]]
        figure.add_trace(go.Scatter(x=hx, y=hy, mode="lines", fill="toself", line={"color": TEAL, "width": 3}, fillcolor="rgba(0,122,120,0.12)", hoverinfo="skip", name="hull"))
    if query["interior"]:
        figure.add_trace(
            go.Scatter(
                x=[point["x"] for point in query["interior"]],
                y=[point["y"] for point in query["interior"]],
                mode="markers",
                marker={"size": 12, "color": GOLD},
                name="interior",
                hovertemplate="interior<extra></extra>",
            )
        )
    if query["hull"]:
        figure.add_trace(
            go.Scatter(
                x=[point["x"] for point in query["hull"]],
                y=[point["y"] for point in query["hull"]],
                mode="markers",
                marker={"size": 16, "color": GARNET},
                name="hull vertex",
                hovertemplate="hull vertex<extra></extra>",
            )
        )
    figure.update_layout(
        height=480,
        margin={"l": 24, "r": 18, "t": 40, "b": 28},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        title={"text": f"{query['n']} points  ·  hull {query['h']}", "font": {"color": GARNET}},
        uirevision="hull-canvas",
        clickmode="event",
        showlegend=True,
        legend={"orientation": "h", "y": 1.02},
    )
    figure.update_xaxes(range=[-0.03, 1.03], showticklabels=False, showgrid=True, gridcolor="#e6e0d7", zeroline=False)
    figure.update_yaxes(range=[-0.03, 1.03], scaleanchor="x", scaleratio=1, showticklabels=False, showgrid=True, gridcolor="#e6e0d7", zeroline=False)
    return figure
