"""Plotly canvas and HTML representation panels for the graph builder."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import plotly.graph_objects as go
from dash import html

from graph_model import graph_view, normalize_state

GARNET = "#782f40"
GOLD = "#ceb888"
INK = "#17212b"
MUTED = "#5d6a75"
TEAL = "#007a78"
PAPER = "rgba(0,0,0,0)"
CANVAS_FILL = "rgba(247, 243, 237, 0.35)"


def _base_figure(height: int, uirevision: str) -> go.Figure:
    """Apply the shared FSU-light Plotly treatment."""

    figure = go.Figure()
    figure.update_layout(
        height=height,
        margin={"l": 24, "r": 18, "t": 36, "b": 28},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        showlegend=False,
        hovermode="closest",
        uirevision=uirevision,
        clickmode="event",
    )
    figure.update_xaxes(
        range=[-0.03, 1.03],
        constrain="domain",
        showgrid=True,
        gridcolor="#e6e0d7",
        zeroline=False,
        showticklabels=False,
        title=None,
        fixedrange=False,
    )
    figure.update_yaxes(
        range=[-0.03, 1.03],
        scaleanchor="x",
        scaleratio=1,
        showgrid=True,
        gridcolor="#e6e0d7",
        zeroline=False,
        showticklabels=False,
        title=None,
        fixedrange=False,
    )
    return figure


def _click_catcher() -> go.Heatmap:
    """Dense heatmap covering the axis range so empty-canvas clicks have coordinates."""

    samples = np.linspace(-0.04, 1.04, 65)
    zeros = np.zeros((len(samples), len(samples)))
    return go.Heatmap(
        x=samples,
        y=samples,
        z=zeros,
        zmin=0,
        zmax=1,
        colorscale=[[0, CANVAS_FILL], [1, CANVAS_FILL]],
        showscale=False,
        hoverinfo="none",
        hoverongaps=False,
        name="canvas",
    )


def _shortened_segment(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    pad: float = 0.048,
) -> tuple[float, float, float, float] | None:
    """Trim a segment so arrowheads stop at the node discs."""

    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length < 1e-9:
        return None
    ux, uy = dx / length, dy / length
    return (x1 + pad * ux, y1 + pad * uy, x2 - pad * ux, y2 - pad * uy)


def canvas_figure(state: dict[str, Any]) -> go.Figure:
    """Draw vertices and edges on a clickable square canvas."""

    current = normalize_state(state)
    view = graph_view(current)
    figure = _base_figure(520, f"graph-canvas-{current['revision']}")
    figure.add_trace(_click_catcher())

    vertex_lookup = {vertex["id"]: vertex for vertex in current["vertices"]}
    annotations: list[dict[str, Any]] = []
    edge_x: list[float | None] = []
    edge_y: list[float | None] = []
    for edge in current["edges"]:
        start = vertex_lookup[edge["source"]]
        end = vertex_lookup[edge["target"]]
        segment = _shortened_segment(float(start["x"]), float(start["y"]), float(end["x"]), float(end["y"]))
        if segment is None:
            continue
        x1, y1, x2, y2 = segment
        edge_x.extend([x1, x2, None])
        edge_y.extend([y1, y2, None])
        if current["directed"]:
            annotations.append(
                {
                    "x": x2,
                    "y": y2,
                    "ax": x1,
                    "ay": y1,
                    "xref": "x",
                    "yref": "y",
                    "axref": "x",
                    "ayref": "y",
                    "showarrow": True,
                    "arrowhead": 3,
                    "arrowsize": 1.35,
                    "arrowwidth": 2.2,
                    "arrowcolor": GARNET,
                    "standoff": 0,
                }
            )
    if edge_x:
        figure.add_trace(
            go.Scatter(
                x=edge_x,
                y=edge_y,
                mode="lines",
                line={"color": GARNET, "width": 3},
                hoverinfo="skip",
                name="edges",
            )
        )

    if current["vertices"]:
        xs = [float(vertex["x"]) for vertex in current["vertices"]]
        ys = [float(vertex["y"]) for vertex in current["vertices"]]
        labels = [str(vertex["id"]) for vertex in current["vertices"]]
        selected = current["selected"]
        pending = current["pending"]
        colors = []
        sizes = []
        outlines = []
        for label in labels:
            if label == pending:
                colors.append(GOLD)
                sizes.append(34)
                outlines.append(TEAL)
            elif label == selected:
                colors.append(GOLD)
                sizes.append(32)
                outlines.append(GARNET)
            else:
                colors.append(GARNET)
                sizes.append(28)
                outlines.append("white")
        figure.add_trace(
            go.Scatter(
                x=xs,
                y=ys,
                mode="markers+text",
                text=labels,
                textfont={"color": "white", "size": 14, "family": "Arial, sans-serif"},
                marker={
                    "size": sizes,
                    "color": colors,
                    "line": {"color": outlines, "width": 3},
                },
                customdata=labels,
                hovertemplate="Vertex %{text}<extra></extra>",
                name="vertices",
            )
        )

    title = f"{view['kind'].capitalize()}  ·  N = {view['n']}  ·  M = {view['m']}"
    if current["pending"]:
        title = f"Connecting from {current['pending']}  ·  click a second vertex"
    figure.update_layout(title={"text": title, "font": {"size": 16, "color": GARNET}}, annotations=annotations)
    return figure


def _cell_class(row_label: str, column_label: str, value: int, selected: str | None) -> str:
    """CSS class for one adjacency-matrix cell."""

    classes = ["one"] if value else ["zero"]
    if selected and (row_label == selected or column_label == selected):
        classes.append("hot")
    if selected and row_label == selected and column_label == selected:
        classes.append("focus")
    return " ".join(classes)


def matrix_table(state: dict[str, Any]) -> html.Table:
    """Render A as a labelled 0/1 table with the selected row and column marked."""

    view = graph_view(state)
    labels = view["labels"]
    matrix = view["matrix"]
    selected = view["selected"]
    header = [html.Th("A", className="corner", scope="col")]
    for label in labels:
        header.append(
            html.Th(
                label,
                scope="col",
                className="selected-head" if label == selected else "",
            )
        )
    body_rows = []
    for row_index, row_label in enumerate(labels):
        cells = [
            html.Th(
                row_label,
                scope="row",
                className="selected-head" if row_label == selected else "",
            )
        ]
        for column_index, column_label in enumerate(labels):
            value = matrix[row_index][column_index]
            cells.append(
                html.Td(
                    str(value),
                    className=_cell_class(row_label, column_label, value, selected),
                )
            )
        body_rows.append(html.Tr(cells))
    caption = (
        f"Adjacency matrix of the current {view['kind']}. "
        "A_ij = 1 iff there is an edge from i to j."
    )
    return html.Table(
        [
            html.Caption(caption),
            html.Thead(html.Tr(header)),
            html.Tbody(body_rows),
        ],
        className="adj-matrix",
        **{"aria-label": caption},
    )


def structure_table(state: dict[str, Any]) -> html.Table:
    """Render the adjacency structure as Node | Sublist(Node)."""

    view = graph_view(state)
    rows = []
    for label in view["labels"]:
        neighbors = view["structure"][label]
        sublist = ", ".join(neighbors) if neighbors else "empty set"
        info = view["degrees"][label]
        if view["directed"]:
            degree_note = f"in {info['in']}, out {info['out']}"
        else:
            degree_note = f"deg {info['degree']}"
        rows.append(
            html.Tr(
                [
                    html.Th(label, scope="row"),
                    html.Td(sublist),
                    html.Td(degree_note),
                ],
                className="selected-row" if label == view["selected"] else "",
            )
        )
    neighbor_heading = "Out-neighbors" if view["directed"] else "Sublist(Node)"
    caption = "Adjacency structure: one sublist of neighbors per vertex. Isolated vertices keep an empty sublist."
    return html.Table(
        [
            html.Caption(caption),
            html.Thead(
                html.Tr(
                    [
                        html.Th("Node", scope="col"),
                        html.Th(neighbor_heading, scope="col"),
                        html.Th("Degree", scope="col"),
                    ]
                )
            ),
            html.Tbody(rows),
        ],
        className="structure-table",
        **{"aria-label": caption},
    )


def edge_list_panel(state: dict[str, Any]) -> html.Div:
    """Show the edge list and name any vertices it cannot reconstruct."""

    view = graph_view(state)
    isolated = view["isolated"]
    if isolated:
        warning = (
            f"Isolated {', '.join(isolated)} "
            f"{'does' if len(isolated) == 1 else 'do'} not appear in this list. "
            "Reading the list back would drop those vertices unless N is stored separately."
        )
    else:
        warning = "Every vertex is incident to at least one edge, so the list names the whole vertex set."
    return html.Div(
        [
            html.P(view["edge_display"], className="edge-list-display"),
            html.P(
                f"M = {view['m']} {'directed arcs' if view['directed'] else 'undirected edges'}. {warning}",
                className="rep-note",
            ),
        ]
    )


def summary_pills(state: dict[str, Any]) -> list[html.Span]:
    """Compact status chips for the current graph."""

    view = graph_view(state)
    pills = [
        html.Strong(view["kind"]),
        html.Span(f"N = {view['n']} vertices"),
        html.Span(f"M = {view['m']} {'arcs' if view['directed'] else 'edges'}"),
    ]
    if view["selected"]:
        info = view["degrees"][view["selected"]]
        if view["directed"]:
            pills.append(
                html.Span(
                    f"{view['selected']}: in {info['in']}, out {info['out']}"
                )
            )
        else:
            pills.append(html.Span(f"{view['selected']}: degree {info['degree']}"))
    if view["pending"]:
        pills.append(html.Strong(f"pending {view['pending']}"))
    if view["isolated"]:
        pills.append(html.Span(f"isolated {', '.join(view['isolated'])}"))
    return pills


def vertex_options(state: dict[str, Any]) -> list[dict[str, str]]:
    """Dropdown options for every current vertex."""

    view = graph_view(state)
    return [{"label": label, "value": label} for label in view["labels"]]


def connect_target_options(state: dict[str, Any]) -> list[dict[str, str]]:
    """Dropdown options excluding the selected vertex (no loops)."""

    view = graph_view(state)
    selected = view["selected"]
    return [{"label": label, "value": label} for label in view["labels"] if label != selected]
