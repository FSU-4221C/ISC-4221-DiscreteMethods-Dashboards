"""Plotly figures for algorithm-order growth and cost snapshots."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go

from complexity_model import cost_snapshot, format_cost, growth_series, selected_orders

GARNET = "#782f40"
GOLD = "#ceb888"
INK = "#17212b"
MUTED = "#5d6a75"
TEAL = "#007a78"
PAPER = "rgba(0,0,0,0)"

ORDER_COLORS = {
    "one_over_log": "#6b7280",
    "constant": "#007a78",
    "log_n": "#1d4e89",
    "sqrt_n": "#2f855a",
    "linear": "#b45309",
    "n_log_n": "#7c3aed",
    "n_log2_n": "#a21caf",
    "quadratic": "#782f40",
    "cubic": "#9a3412",
    "quartic": "#be123c",
    "exponential": "#0f766e",
    "factorial": "#111827",
}

CUSTOM_COLORS = ("#0369a1", "#4c1d95", "#9f1239", "#3f6212", "#c2410c", "#155e75")
DASH_STYLES = ("solid", "dash", "dot", "dashdot", "longdash", "longdashdot")


def _color_for(key: str, index: int) -> str:
    """Return a stable color for a preset key or a cycling custom color."""

    if key in ORDER_COLORS:
        return ORDER_COLORS[key]
    return CUSTOM_COLORS[index % len(CUSTOM_COLORS)]


def _base_figure(height: int, uirevision: str) -> go.Figure:
    """Apply the shared FSU-light Plotly treatment."""

    figure = go.Figure()
    figure.update_layout(
        height=height,
        margin={"l": 70, "r": 24, "t": 48, "b": 58},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        legend={
            "orientation": "h",
            "yanchor": "bottom",
            "y": 1.02,
            "x": 0,
            "font": {"size": 13},
        },
        hovermode="x unified",
        uirevision=uirevision,
    )
    return figure


def growth_figure(state: dict[str, Any]) -> go.Figure:
    """Plot selected orders from n = 2 to the current n."""

    data = growth_series(state)
    n_value = data["n"]
    y_scale = state.get("y_scale", "log")
    figure = _base_figure(460, f"growth-{y_scale}-{n_value}")
    if not data["series"]:
        figure.update_layout(title="Select at least one order to plot")
        figure.update_xaxes(title="Input size n", gridcolor="#ddd7cf")
        figure.update_yaxes(title="Model operation count", gridcolor="#ddd7cf")
        return figure

    for index, series in enumerate(data["series"]):
        plot_x: list[int] = []
        plot_y: list[float] = []
        hover_ops: list[float] = []
        for x_value, y_value, log_value in zip(series["x"], series["y"], series["log10"], strict=True):
            if y_value != y_value or log_value != log_value:
                continue
            if y_scale == "log":
                if log_value in {float("-inf"), float("inf")}:
                    continue
                plot_y.append(log_value)
            else:
                if y_value <= 0 or y_value == float("inf"):
                    continue
                plot_y.append(y_value)
            plot_x.append(x_value)
            hover_ops.append(y_value)
        if not plot_x:
            continue
        color = _color_for(series["key"], index)
        hover = (
            f"{series['label']}<br>n=%{{x:,}}<br>log₁₀ ops=%{{y:.3f}}<br>operations=%{{customdata:.4g}}<extra></extra>"
            if y_scale == "log"
            else f"{series['label']}<br>n=%{{x:,}}<br>operations=%{{y:.4g}}<extra></extra>"
        )
        figure.add_trace(
            go.Scatter(
                x=plot_x,
                y=plot_y,
                customdata=hover_ops,
                name=series["label"],
                mode="lines",
                line={"color": color, "width": 3, "dash": DASH_STYLES[index % len(DASH_STYLES)]},
                hovertemplate=hover,
            )
        )
        figure.add_trace(
            go.Scatter(
                x=[plot_x[-1]],
                y=[plot_y[-1]],
                customdata=[hover_ops[-1]],
                mode="markers",
                marker={"size": 10, "color": color, "symbol": "diamond"},
                showlegend=False,
                hovertemplate=hover,
            )
        )

    y_title = "log₁₀(operation count)" if y_scale == "log" else "Model operation count"
    figure.update_layout(title=f"How selected orders grow up to n = {n_value:,}")
    figure.update_xaxes(title="Input size n", type="log", gridcolor="#ddd7cf", zeroline=False)
    figure.update_yaxes(title=y_title, gridcolor="#ddd7cf", zeroline=False, type="linear")
    return figure


def snapshot_figure(state: dict[str, Any]) -> go.Figure:
    """Show operation counts at the current n as horizontal bars."""

    snapshot = cost_snapshot(state)
    n_value = snapshot["n"]
    defined = [item for item in snapshot["ranked"] if item["defined"] and item["cost"] == item["cost"]]
    figure = _base_figure(420, f"snapshot-{n_value}-{len(defined)}")
    if not defined:
        figure.update_layout(title="Select at least one order to compare at this n")
        return figure

    y_scale = state.get("y_scale", "log")
    labels = [item["label"] for item in defined]
    colors = [_color_for(item["key"], index) for index, item in enumerate(defined)]
    text = [format_cost(item["cost"]) for item in defined]
    if y_scale == "log":
        xs = [item["log10"] if item["log10"] not in {float("-inf"), float("inf")} else 0.0 for item in defined]
        x_title = "log₁₀(operation count)"
        hover = "%{y}<br>n=" + f"{n_value:,}" + "<br>log₁₀ ops=%{x:.3f}<extra></extra>"
    else:
        xs = [item["cost"] if item["cost"] != float("inf") else 0.0 for item in defined]
        x_title = "Model operation count"
        hover = "%{y}<br>n=" + f"{n_value:,}" + "<br>operations=%{x:.4g}<extra></extra>"
    figure.add_trace(
        go.Bar(
            x=xs,
            y=labels,
            orientation="h",
            marker={"color": colors},
            text=text,
            textposition="outside",
            hovertemplate=hover,
        )
    )
    figure.update_layout(
        title=f"Model operation count at n = {n_value:,}",
        showlegend=False,
        margin={"l": 110, "r": 90, "t": 48, "b": 48},
    )
    figure.update_xaxes(title=x_title, type="linear", gridcolor="#ddd7cf", zeroline=False)
    figure.update_yaxes(autorange="reversed", gridcolor="rgba(0,0,0,0)")
    return figure


def coverage_figure(config: dict[str, Any]) -> go.Figure:
    """Show how many of the 50 snippets match the Practice filters."""

    from practice_model import topic_coverage
    from question_bank import TOPICS

    coverage = topic_coverage(config)
    labels = list(TOPICS)
    counts = [coverage[topic] for topic in TOPICS]
    colors = ["#782f40" if count else "#b7b0a8" for count in counts]
    figure = _base_figure(340, "snippet-coverage")
    figure.add_trace(
        go.Bar(
            x=counts,
            y=labels,
            orientation="h",
            marker={"color": colors},
            text=counts,
            textposition="outside",
            hovertemplate="%{y}: %{x} matching snippets<extra></extra>",
        )
    )
    figure.update_layout(
        title="Matching snippets by order family",
        showlegend=False,
        margin={"l": 130, "r": 36, "t": 48, "b": 40},
        height=340,
    )
    figure.update_xaxes(title="Matching snippets", range=[0, 14], dtick=2, gridcolor="#ddd7cf", zeroline=False)
    figure.update_yaxes(autorange="reversed", gridcolor="rgba(0,0,0,0)")
    return figure


def selection_summary(state: dict[str, Any]) -> str:
    """Return a short text summary of the current comparison."""

    orders = selected_orders(state)
    if not orders:
        return "No orders selected."
    labels = ", ".join(order["label"] for order in orders)
    return f"Comparing {len(orders)} order(s): {labels}."
