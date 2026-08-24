"""Plotly figures for search probes and coin combinations."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go

from strategy_model import coin_query, search_query

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
        margin={"l": 52, "r": 18, "t": 52, "b": 88},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        legend={
            "orientation": "h",
            "yanchor": "top",
            "y": -0.22,
            "x": 0,
            "xanchor": "left",
            "bgcolor": "rgba(0,0,0,0)",
        },
        hovermode="closest",
        uirevision=uirevision,
        title={"y": 0.98, "x": 0, "xanchor": "left", "yanchor": "top"},
    )
    figure.update_xaxes(gridcolor="#ddd7cf", zeroline=False)
    figure.update_yaxes(gridcolor="#ddd7cf", zeroline=False)
    return figure


def search_figure(state: dict[str, Any]) -> go.Figure:
    """Draw the sorted keys with sequential and binary probe marks."""

    query = search_query(state)
    values = query["values"]
    xs = list(range(len(values)))
    figure = _base(400, f"search-{query['n']}")
    figure.add_trace(
        go.Bar(
            x=xs,
            y=values,
            marker={"color": "#e7e0d6"},
            name="sorted keys",
            hovertemplate="index=%{x}<br>key=%{y}<extra></extra>",
        )
    )
    seq = query["sequential"]["inspected"]
    binary = query["binary"]["inspected"]
    figure.add_trace(
        go.Scatter(
            x=seq,
            y=[values[i] for i in seq],
            mode="markers",
            marker={"size": 11, "color": GOLD, "symbol": "square"},
            name=f"sequential ({query['sequential']['comparisons']})",
            hovertemplate="sequential probe index=%{x}<extra></extra>",
        )
    )
    figure.add_trace(
        go.Scatter(
            x=binary,
            y=[values[i] for i in binary],
            mode="markers",
            marker={"size": 16, "color": GARNET, "symbol": "diamond"},
            name=f"binary ({query['binary']['comparisons']})",
            hovertemplate="binary midpoint index=%{x}<extra></extra>",
        )
    )
    target_index = query["target"] - 1
    figure.add_vline(x=target_index, line={"color": TEAL, "width": 2, "dash": "dot"})
    figure.update_xaxes(title="index")
    figure.update_yaxes(title="key")
    figure.update_layout(title=f"Find {query['target']} in 1…{query['n']}")
    return figure


def coins_figure(state: dict[str, Any]) -> go.Figure:
    """Compare greedy versus optimal coin counts as grouped bars."""

    query = coin_query(state)
    figure = _base(360, f"coins-{query['label']}-{query['amount']}")
    labels = [f"{coin}¢" for coin in query["coins"]]
    greedy_counts = [query["greedy"].count(coin) for coin in query["coins"]]
    optimal_counts = [query["optimal"].count(coin) for coin in query["coins"]]
    figure.add_trace(go.Bar(x=labels, y=greedy_counts, name="greedy", marker={"color": GOLD}))
    figure.add_trace(go.Bar(x=labels, y=optimal_counts, name="fewest coins (DP)", marker={"color": GARNET}))
    figure.update_layout(barmode="group", title=f"Amount {query['amount']} with {query['label']}")
    figure.update_yaxes(title="coins used", dtick=1)
    return figure
