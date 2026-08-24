"""Plotly figures for continuous and discrete PDF/CDF pairs."""

from __future__ import annotations

from typing import Any

import numpy as np
import plotly.graph_objects as go

from distribution_model import (
    continuous_curves,
    continuous_query,
    discrete_cdf_curve,
    discrete_query,
)

GARNET = "#782f40"
GOLD = "#ceb888"
INK = "#17212b"
MUTED = "#5d6a75"
TEAL = "#007a78"
PAPER = "rgba(0,0,0,0)"


def _base_figure(height: int, uirevision: str) -> go.Figure:
    """Apply the shared FSU-light Plotly treatment."""

    figure = go.Figure()
    figure.update_layout(
        height=height,
        margin={"l": 58, "r": 22, "t": 46, "b": 52},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.02, "x": 0},
        hovermode="closest",
        uirevision=uirevision,
    )
    figure.update_xaxes(gridcolor="#ddd7cf", zeroline=False)
    figure.update_yaxes(gridcolor="#ddd7cf", zeroline=False)
    return figure


def continuous_pdf_figure(state: dict[str, Any]) -> go.Figure:
    """Plot the continuous PDF with the area to the left of the probe shaded."""

    curves = continuous_curves(state)
    query = continuous_query(state)
    xs = np.asarray(curves["x"])
    pdf = np.asarray(curves["pdf"])
    probe = float(curves["probe_x"])
    figure = _base_figure(380, f"cont-pdf-{query['family']}")
    mask = xs <= probe + 1e-12
    if np.any(mask):
        figure.add_trace(
            go.Scatter(
                x=np.append(xs[mask], probe),
                y=np.append(pdf[mask], query["pdf"]),
                mode="lines",
                fill="tozeroy",
                line={"color": TEAL, "width": 0.5},
                fillcolor="rgba(0, 122, 120, 0.28)",
                name="P(X ≤ x)",
                hoverinfo="skip",
                showlegend=True,
            )
        )
    figure.add_trace(
        go.Scatter(
            x=xs,
            y=pdf,
            mode="lines",
            name="PDF p_X(x)",
            line={"color": GARNET, "width": 3},
            hovertemplate="x=%{x:.2f}<br>p_X(x)=%{y:.3f}<extra></extra>",
        )
    )
    figure.add_vline(x=probe, line={"color": TEAL, "width": 2, "dash": "dot"})
    figure.add_vline(x=query["mean"], line={"color": GOLD, "width": 2, "dash": "dash"})
    figure.add_trace(
        go.Scatter(
            x=[probe],
            y=[query["pdf"]],
            mode="markers",
            marker={"size": 12, "color": TEAL, "symbol": "diamond"},
            name="probe x",
            hovertemplate="x=%{x:.2f}<br>density=%{y:.3f}<extra></extra>",
        )
    )
    figure.update_layout(title=f"PDF · {query['label']}")
    figure.update_xaxes(title="x")
    figure.update_yaxes(title="p_X(x)  (density)")
    return figure


def continuous_cdf_figure(state: dict[str, Any]) -> go.Figure:
    """Plot the continuous CDF with the probe (x, F(x)) marked."""

    curves = continuous_curves(state)
    query = continuous_query(state)
    figure = _base_figure(380, f"cont-cdf-{query['family']}")
    figure.add_trace(
        go.Scatter(
            x=curves["x"],
            y=curves["cdf"],
            mode="lines",
            name="CDF F_X(x)",
            line={"color": GARNET, "width": 3},
            hovertemplate="x=%{x:.2f}<br>F_X(x)=%{y:.3f}<extra></extra>",
        )
    )
    figure.add_vline(x=query["x"], line={"color": TEAL, "width": 2, "dash": "dot"})
    figure.add_hline(y=query["cdf"], line={"color": TEAL, "width": 1, "dash": "dot"})
    figure.add_trace(
        go.Scatter(
            x=[query["x"]],
            y=[query["cdf"]],
            mode="markers",
            marker={"size": 12, "color": TEAL, "symbol": "diamond"},
            name="F_X(x)",
            hovertemplate="x=%{x:.2f}<br>F_X(x)=%{y:.3f}<extra></extra>",
        )
    )
    figure.update_layout(title="CDF · P(X ≤ x)")
    figure.update_xaxes(title="x")
    figure.update_yaxes(title="F_X(x)", range=[-0.05, 1.08])
    return figure


def discrete_pmf_figure(state: dict[str, Any]) -> go.Figure:
    """Plot the discrete PDF with the selected outcome highlighted."""

    query = discrete_query(state)
    colors = [TEAL if value == query["k"] else GARNET for value in query["values"]]
    figure = _base_figure(380, f"disc-pmf-{query['family']}")
    figure.add_trace(
        go.Bar(
            x=query["values"],
            y=query["probs"],
            marker={"color": colors},
            name="p_X(x)",
            hovertemplate="x=%{x}<br>P(X = %{x})=%{y:.3f}<extra></extra>",
        )
    )
    figure.add_vline(x=query["mean"], line={"color": GOLD, "width": 2, "dash": "dash"})
    figure.update_layout(title=f"PDF · {query['label']}", bargap=0.28)
    figure.update_xaxes(title="outcome x", dtick=1)
    figure.update_yaxes(title="P(X = x)")
    return figure


def discrete_cdf_figure(state: dict[str, Any]) -> go.Figure:
    """Plot the discrete CDF as a right-continuous step function."""

    query = discrete_query(state)
    xs, ys = discrete_cdf_curve(query["values"], query["probs"])
    figure = _base_figure(380, f"disc-cdf-{query['family']}")
    figure.add_trace(
        go.Scatter(
            x=xs,
            y=ys,
            mode="lines",
            line={"color": GARNET, "width": 3, "shape": "linear"},
            name="F_X(x)",
            hovertemplate="x=%{x:.0f}<br>F_X=%{y:.3f}<extra></extra>",
        )
    )
    figure.add_vline(x=query["k"], line={"color": TEAL, "width": 2, "dash": "dot"})
    figure.add_trace(
        go.Scatter(
            x=[query["k"]],
            y=[query["cdf"]],
            mode="markers",
            marker={"size": 12, "color": TEAL, "symbol": "diamond"},
            name="F_X(k)",
            hovertemplate="k=%{x}<br>F_X(k)=%{y:.3f}<extra></extra>",
        )
    )
    figure.update_layout(title="CDF · P(X ≤ x)")
    figure.update_xaxes(title="x")
    figure.update_yaxes(title="F_X(x)", range=[-0.05, 1.08])
    return figure
