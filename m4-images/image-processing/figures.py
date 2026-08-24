"""Heatmap figures for source, filtered, binary, and labelled images."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go

from image_model import component_query, convolution_query

INK = "#17212b"
PAPER = "rgba(0,0,0,0)"
GARNET = "#782f40"


def _heatmap(values: Any, title: str, colorscale: str, uirevision: str, zmin: float | None = None, zmax: float | None = None) -> go.Figure:
    """Render a small teaching image without interpolation."""

    figure = go.Figure(
        go.Heatmap(
            z=values,
            colorscale=colorscale,
            showscale=True,
            zmin=zmin,
            zmax=zmax,
            hovertemplate="row=%{y}<br>col=%{x}<br>value=%{z:.1f}<extra></extra>",
        )
    )
    figure.update_layout(
        height=340,
        margin={"l": 40, "r": 40, "t": 42, "b": 40},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 14},
        title={"text": title, "font": {"size": 16, "color": GARNET}},
        uirevision=uirevision,
        yaxis={"autorange": "reversed", "scaleanchor": "x", "constrain": "domain"},
        xaxis={"constrain": "domain"},
    )
    figure.update_xaxes(showticklabels=False, showgrid=False, zeroline=False)
    figure.update_yaxes(showticklabels=False, showgrid=False, zeroline=False)
    return figure


def source_figure(state: dict[str, Any]) -> go.Figure:
    """Show the synthetic grayscale scene."""

    query = convolution_query(state)
    return _heatmap(query["source"], "Source 32×32", "Gray", "source-image", 0, 255)


def filtered_figure(state: dict[str, Any]) -> go.Figure:
    """Show the convolved image."""

    query = convolution_query(state)
    return _heatmap(query["filtered"], query["label"], "Gray", f"filt-{query['kernel']}", 0, 255)


def labels_figure(state: dict[str, Any]) -> go.Figure:
    """Show connected-component labels."""

    query = component_query(state)
    return _heatmap(query["labels"], f"{query['connectivity']}-connected labels", "Sunset", f"lab-{query['connectivity']}")
