"""Plotly network figures for traversal and Dijkstra."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go

from graph_alg_model import EDGES, VERTICES, dijkstra_query, traversal_query

GARNET = "#782f40"
GOLD = "#ceb888"
TEAL = "#007a78"
INK = "#17212b"
MUTED = "#8a8078"
PAPER = "rgba(0,0,0,0)"


def _base(title: str, uirevision: str) -> go.Figure:
    """Square canvas for the classroom graph."""

    figure = go.Figure()
    figure.update_layout(
        height=420,
        margin={"l": 20, "r": 16, "t": 42, "b": 20},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        showlegend=False,
        title={"text": title, "font": {"size": 16, "color": GARNET}},
        uirevision=uirevision,
    )
    figure.update_xaxes(range=[-0.05, 1.05], showticklabels=False, showgrid=True, gridcolor="#e6e0d7", zeroline=False)
    figure.update_yaxes(range=[-0.05, 1.05], scaleanchor="x", scaleratio=1, showticklabels=False, showgrid=True, gridcolor="#e6e0d7", zeroline=False)
    return figure


def _draw_edges(figure: go.Figure, highlight: set[tuple[str, str]]) -> None:
    """Draw weighted edges, emphasizing a highlighted path."""

    xs: list[float | None] = []
    ys: list[float | None] = []
    hx: list[float | None] = []
    hy: list[float | None] = []
    for source, target, weight in EDGES:
        x0, y0 = VERTICES[source]
        x1, y1 = VERTICES[target]
        pair = tuple(sorted((source, target)))
        if pair in highlight:
            hx.extend([x0, x1, None])
            hy.extend([y0, y1, None])
        else:
            xs.extend([x0, x1, None])
            ys.extend([y0, y1, None])
        figure.add_annotation(
            x=(x0 + x1) / 2,
            y=(y0 + y1) / 2,
            text=str(weight),
            showarrow=False,
            font={"size": 12, "color": INK},
            bgcolor="white",
        )
    if xs:
        figure.add_trace(go.Scatter(x=xs, y=ys, mode="lines", line={"color": MUTED, "width": 2}, hoverinfo="skip"))
    if hx:
        figure.add_trace(go.Scatter(x=hx, y=hy, mode="lines", line={"color": TEAL, "width": 5}, hoverinfo="skip"))


def _draw_nodes(figure: go.Figure, current: str, visited: list[str], start: str) -> None:
    """Color nodes by visited / current / start."""

    labels = list(VERTICES)
    xs = [VERTICES[label][0] for label in labels]
    ys = [VERTICES[label][1] for label in labels]
    colors = []
    for label in labels:
        if label == current:
            colors.append(GOLD)
        elif label == start:
            colors.append(TEAL)
        elif label in visited:
            colors.append(GARNET)
        else:
            colors.append("#c5b9ae")
    figure.add_trace(
        go.Scatter(
            x=xs,
            y=ys,
            mode="markers+text",
            text=labels,
            textfont={"color": "white", "size": 13},
            marker={"size": 28, "color": colors, "line": {"color": "white", "width": 2}},
            hovertemplate="vertex %{text}<extra></extra>",
        )
    )


def traversal_figure(state: dict[str, Any], kind: str) -> go.Figure:
    """Draw BFS or DFS at the current animation step."""

    query = traversal_query(state)
    snap = query["bfs"] if kind == "bfs" else query["dfs"]
    title = f"{kind.upper()} from {query['start']}  ·  visiting {snap['current']}"
    figure = _base(title, f"trav-{kind}-{query['start']}")
    _draw_edges(figure, set())
    _draw_nodes(figure, snap["current"], snap["visited"], query["start"])
    return figure


def dijkstra_figure(state: dict[str, Any]) -> go.Figure:
    """Draw Dijkstra's settled set and the eventual shortest path."""

    query = dijkstra_query(state)
    snap = query["snap"]
    highlight = set()
    path = query["path"]
    for index in range(len(path) - 1):
        highlight.add(tuple(sorted((path[index], path[index + 1]))))
    figure = _base(f"Dijkstra from {query['start']}  ·  settling {snap['current']}", f"dij-{query['start']}-{query['goal']}")
    _draw_edges(figure, highlight)
    _draw_nodes(figure, snap["current"], snap["settled"], query["start"])
    return figure
