"""Graph builder lab for ISC 4221C Module 3.

Run from this folder with the course environment:

    python app.py

Then open http://127.0.0.1:8054.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, ctx, dcc, html, no_update

from figures import (
    canvas_figure,
    connect_target_options,
    edge_list_panel,
    matrix_table,
    structure_table,
    summary_pills,
    vertex_options,
)
from graph_model import (
    apply_event,
    build_takeaway,
    default_state,
    graph_view,
    normalize_state,
    representations_takeaway,
)
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from practice_model import (
    frozen_summary_bits,
    selected_degree_prompt,
    score_practice,
    vertex_count_prompt,
)


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    """Build a consistently styled action button."""

    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def question_block(number: int, legend: Any, control: Any, feedback_id: str) -> html.Fieldset:
    """Build one practice question with a live feedback region."""

    return html.Fieldset(
        [
            html.Legend([html.Span(str(number), className="question-number"), legend]),
            control,
            html.Div(id=feedback_id, className="feedback", **{"aria-live": "polite"}),
        ],
        className="question-block",
    )


def radio_options(name: str, choices: list[tuple[str, str]], value: str) -> dcc.RadioItems:
    """Build a labelled radio group used as a control panel filter."""

    return dcc.RadioItems(
        id=name,
        options=[{"label": label, "value": choice} for label, choice in choices],
        value=value,
        className="graph-kind-options",
        inputClassName="kind-input",
        labelClassName="kind-label",
    )


initial = default_state()

explore_layout = html.Div(
    [
        dcc.Store(id="click-store"),
        html.Section(
            [
                html.P("CURRENT GRAPH", className="status-label"),
                html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"}),
            ],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["build"]["objective"], className="objective"),
                        html.H2(SECTIONS["build"]["title"]),
                        html.P(SECTIONS["build"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Label("Graph kind", className="control-label"),
                        radio_options(
                            "kind-control",
                            [("Undirected", "undirected"), ("Directed (digraph)", "directed")],
                            "undirected",
                        ),
                        html.Label("Selected vertex", htmlFor="selected-vertex", className="control-label"),
                        dcc.Dropdown(
                            id="selected-vertex",
                            options=vertex_options(initial),
                            value=initial["selected"],
                            clearable=False,
                            searchable=False,
                            className="family-dropdown",
                        ),
                        html.Label("Connect selected to", htmlFor="connect-target", className="control-label"),
                        dcc.Dropdown(
                            id="connect-target",
                            options=connect_target_options(initial),
                            value=None,
                            clearable=True,
                            searchable=False,
                            placeholder="Choose a second vertex",
                            className="family-dropdown",
                        ),
                        html.Div(
                            [
                                button("Add vertex", "add-vertex-button"),
                                button("Connect", "connect-button", "secondary"),
                                button("Cancel edge", "cancel-pending-button", "outline"),
                                button("Delete selected", "delete-button", "outline"),
                            ],
                            className="button-row",
                        ),
                        html.Div(
                            [
                                button("Load SIMPLE", "simple-button", "secondary"),
                                button("Undo", "undo-button", "outline"),
                                button("Clear canvas", "clear-button", "outline"),
                            ],
                            className="button-row",
                        ),
                        html.P(id="editor-status", className="custom-status", **{"aria-live": "polite"}),
                    ],
                    className="control-panel",
                ),
                html.Div(
                    [
                        dcc.Graph(
                            id="graph-canvas",
                            figure=canvas_figure(initial),
                            config={
                                "displaylogo": False,
                                "modeBarButtonsToRemove": ["lasso2d", "select2d"],
                                "scrollZoom": False,
                            },
                            className="dashboard-graph",
                        ),
                    ],
                    className="figure-column",
                ),
                html.P(id="build-explanation", className="state-explanation"),
                html.P(id="build-takeaway", className="takeaway"),
            ],
            className="learning-card canvas-card",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["representations"]["objective"], className="objective"),
                        html.H2(SECTIONS["representations"]["title"]),
                        html.P(SECTIONS["representations"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Article(
                            [
                                html.H3("Edge list"),
                                html.Div(id="edge-list-panel"),
                            ],
                            className="rep-panel",
                        ),
                        html.Article(
                            [
                                html.H3("Adjacency matrix"),
                                html.Div(id="matrix-panel", className="table-scroll"),
                            ],
                            className="rep-panel",
                        ),
                        html.Article(
                            [
                                html.H3("Adjacency structure"),
                                html.Div(id="structure-panel", className="table-scroll"),
                            ],
                            className="rep-panel",
                        ),
                    ],
                    className="rep-grid",
                ),
                html.P(id="rep-explanation", className="state-explanation"),
                html.P(id="rep-takeaway", className="takeaway"),
            ],
            className="learning-card rep-card",
        ),
        html.Section(
            [
                html.H3("Sources"),
                html.Ul([html.Li(item) for item in SOURCES], className="source-list"),
            ],
            className="sources-card",
        ),
    ],
    className="explore-layout",
)

practice_layout = html.Div(
    [
        html.Section(
            [
                html.P("PRACTICE", className="eyebrow"),
                html.H2("Read the graph you just built"),
                html.P(PRACTICE_INTRO),
                html.Div(
                    [
                        html.Div(id="practice-state-summary", className="frozen-state"),
                        button("Use current Explore graph", "refresh-practice-button", "secondary"),
                    ],
                    className="practice-snapshot-row",
                ),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "For a simple undirected graph, why is the adjacency matrix symmetric with a zero diagonal?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {
                                "label": "Because {uv} is the same unordered edge as {vu}, and this lab does not allow loops.",
                                "value": "symmetric",
                            },
                            {
                                "label": "Because vertex labels must be stored in alphabetical order.",
                                "value": "alpha",
                            },
                            {
                                "label": "Because every undirected graph is a complete graph.",
                                "value": "complete",
                            },
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "SIMPLE's edge list is {AB, AC, BC, CD}. Why is isolated vertex E missing from that list?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {
                                "label": "An edge list stores pairs of endpoints, so a vertex that touches no edge never appears.",
                                "value": "isolated",
                            },
                            {
                                "label": "E is the last label, and edge lists omit the last vertex by convention.",
                                "value": "last",
                            },
                            {
                                "label": "The adjacency matrix already recorded E, so the list is allowed to drop it.",
                                "value": "redundant",
                            },
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(
                    3,
                    html.Span(id="state-question-n"),
                    dcc.Input(
                        id="q3-answer",
                        type="number",
                        debounce=True,
                        className="number-input",
                        placeholder="N",
                    ),
                    "q3-feedback",
                ),
                question_block(
                    4,
                    html.Span(id="state-question-degree"),
                    dcc.Input(
                        id="q4-answer",
                        type="number",
                        debounce=True,
                        className="number-input",
                        placeholder="degree",
                    ),
                    "q4-feedback",
                ),
                html.Div(
                    [
                        button("Submit answers", "submit-practice-button"),
                        button("Reset answers", "reset-practice-button", "outline"),
                    ],
                    className="practice-actions",
                ),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(
    __name__,
    title="Graph Builder Lab · ISC 4221C",
    suppress_callback_exceptions=True,
    assets_ignore=".*\\.map$",
)

app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 3", className="eyebrow"),
                html.H1("Graph Builder Lab"),
                html.P(
                    "Click a canvas to grow a simple graph. Directed or undirected, the edge list, "
                    "adjacency matrix, and adjacency structure are three views of the same object.",
                    className="subtitle",
                ),
                html.Ul([html.Li(item) for item in LEARNING_OBJECTIVES], className="learning-objectives"),
            ],
            className="app-header",
        ),
        html.Main(
            dcc.Tabs(
                id="top-navigation",
                value="explore",
                mobile_breakpoint=0,
                children=[
                    dcc.Tab(
                        label="Explore",
                        value="explore",
                        children=explore_layout,
                        className="top-tab",
                        selected_className="top-tab selected",
                    ),
                    dcc.Tab(
                        label="Practice",
                        value="practice",
                        children=practice_layout,
                        className="top-tab",
                        selected_className="top-tab selected",
                    ),
                ],
                className="top-tabs",
            )
        ),
        html.Footer(
            "Teaching model of simple graphs: no loops, at most one pair per undirected edge or directed arc.",
            className="app-footer",
        ),
    ],
    className="app-shell",
)


app.clientside_callback(
    """
    function(clickData) {
        if (!clickData || !clickData.points || !clickData.points.length) {
            return window.dash_clientside.no_update;
        }
        const point = clickData.points[0];
        return {
            x: point.x,
            y: point.y,
            customdata: point.customdata ?? null,
            curveNumber: point.curveNumber,
            t: Date.now()
        };
    }
    """,
    Output("click-store", "data"),
    Input("graph-canvas", "clickData"),
)


@app.callback(
    Output("explore-store", "data"),
    Input("click-store", "data"),
    Input("kind-control", "value"),
    Input("selected-vertex", "value"),
    Input("add-vertex-button", "n_clicks"),
    Input("connect-button", "n_clicks"),
    Input("cancel-pending-button", "n_clicks"),
    Input("delete-button", "n_clicks"),
    Input("simple-button", "n_clicks"),
    Input("undo-button", "n_clicks"),
    Input("clear-button", "n_clicks"),
    State("explore-store", "data"),
    State("connect-target", "value"),
    prevent_initial_call=True,
)
def update_explore_state(
    click: dict[str, Any] | None,
    kind: str | None,
    selected: str | None,
    add_clicks: int,
    connect_clicks: int,
    cancel_clicks: int,
    delete_clicks: int,
    simple_clicks: int,
    undo_clicks: int,
    clear_clicks: int,
    store: dict[str, Any] | None,
    connect_target: str | None,
) -> dict[str, Any]:
    """Keep the canvas, kind, and selection in one canonical store."""

    del add_clicks, connect_clicks, cancel_clicks, delete_clicks, simple_clicks, undo_clicks, clear_clicks
    current = normalize_state(store)
    trigger = ctx.triggered_id
    if trigger is None:
        return current
    if trigger == "click-store" and click:
        return apply_event(current, "click", click)
    if trigger == "kind-control":
        return apply_event(current, "set_kind", {"directed": kind == "directed"})
    if trigger == "selected-vertex":
        return apply_event(current, "select", {"vertex": selected})
    if trigger == "add-vertex-button":
        return apply_event(current, "add_vertex")
    if trigger == "connect-button":
        return apply_event(current, "connect", {"source": current["selected"], "target": connect_target})
    if trigger == "cancel-pending-button":
        return apply_event(current, "cancel")
    if trigger == "delete-button":
        return apply_event(current, "delete")
    if trigger == "simple-button":
        return apply_event(current, "simple")
    if trigger == "undo-button":
        return apply_event(current, "undo")
    if trigger == "clear-button":
        return apply_event(current, "clear")
    return current


@app.callback(
    Output("parameter-summary", "children"),
    Output("graph-canvas", "figure"),
    Output("build-explanation", "children"),
    Output("build-takeaway", "children"),
    Output("edge-list-panel", "children"),
    Output("matrix-panel", "children"),
    Output("structure-panel", "children"),
    Output("rep-explanation", "children"),
    Output("rep-takeaway", "children"),
    Output("editor-status", "children"),
    Output("kind-control", "value"),
    Output("selected-vertex", "options"),
    Output("selected-vertex", "value"),
    Output("connect-target", "options"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render the canvas and the three representations from one graph."""

    state = normalize_state(state)
    view = graph_view(state)
    pending = view["pending"]
    if pending:
        explanation = (
            f"An edge is started at {pending}. Click a different vertex to finish it, "
            "or click empty canvas to cancel."
        )
    elif view["n"] == 0:
        explanation = "The canvas is empty. Click anywhere inside the square to place vertex A."
    else:
        explanation = (
            f"Selected vertex {view['selected']}. Click empty space to add the next label, "
            "or click this vertex and then another to add an edge."
        )
    selected_neighbors = ", ".join(view["neighbors"]) if view["neighbors"] else "empty set"
    rep_explanation = (
        f"Highlighted vertex {view['selected'] or '—'}: adjacency-structure sublist [{selected_neighbors}]. "
        f"Edge list {view['edge_display']} has {view['m']} "
        f"{'arcs' if view['directed'] else 'pairs'}; isolated vertices are {', '.join(view['isolated']) or 'none'}."
    )
    return (
        summary_pills(state),
        canvas_figure(state),
        explanation,
        build_takeaway(state),
        edge_list_panel(state),
        matrix_table(state),
        structure_table(state),
        rep_explanation,
        representations_takeaway(state),
        state["message"],
        "directed" if state["directed"] else "undirected",
        vertex_options(state),
        view["selected"],
        connect_target_options(state),
    )


@app.callback(
    Output("practice-store", "data"),
    Input("refresh-practice-button", "n_clicks"),
    State("explore-store", "data"),
    prevent_initial_call=True,
)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current Explore graph for the dashboard questions."""

    del clicks
    return normalize_state(state)


@app.callback(
    Output("practice-state-summary", "children"),
    Output("state-question-n", "children"),
    Output("state-question-degree", "children"),
    Input("practice-store", "data"),
)
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen graph used by questions 3 and 4."""

    bits = frozen_summary_bits(state)
    summary = [
        html.Strong("Frozen Explore graph"),
        html.Span(bits["kind"]),
        html.Span(f"N = {bits['n']}"),
        html.Span(f"M = {bits['m']}"),
        html.Span(f"selected {bits['selected']}"),
        html.Span(f"edge list {bits['edge_display']}"),
        html.Span(f"isolated {bits['isolated']}"),
    ]
    return summary, vertex_count_prompt(state), selected_degree_prompt(state)


@app.callback(
    Output("q1-feedback", "children"),
    Output("q1-feedback", "className"),
    Output("q2-feedback", "children"),
    Output("q2-feedback", "className"),
    Output("q3-feedback", "children"),
    Output("q3-feedback", "className"),
    Output("q4-feedback", "children"),
    Output("q4-feedback", "className"),
    Output("practice-summary", "children"),
    Input("submit-practice-button", "n_clicks"),
    State("q1-answer", "value"),
    State("q2-answer", "value"),
    State("q3-answer", "value"),
    State("q4-answer", "value"),
    State("practice-store", "data"),
    prevent_initial_call=True,
)
def score_answers(
    clicks: int,
    theory1: str | None,
    theory2: str | None,
    n_answer: float | None,
    degree_answer: float | None,
    explore_state: dict[str, Any],
) -> tuple[Any, ...]:
    """Score concept and frozen-graph responses with explanations."""

    del clicks
    result = score_practice(theory1, theory2, n_answer, degree_answer, explore_state)
    return (
        result["q1"]["text"],
        f"feedback {result['q1']['status']}",
        result["q2"]["text"],
        f"feedback {result['q2']['status']}",
        result["q3"]["text"],
        f"feedback {result['q3']['status']}",
        result["q4"]["text"],
        f"feedback {result['q4']['status']}",
        result["summary"],
    )


@app.callback(
    Output("q1-answer", "value"),
    Output("q2-answer", "value"),
    Output("q3-answer", "value"),
    Output("q4-answer", "value"),
    Output("q1-feedback", "children", allow_duplicate=True),
    Output("q2-feedback", "children", allow_duplicate=True),
    Output("q3-feedback", "children", allow_duplicate=True),
    Output("q4-feedback", "children", allow_duplicate=True),
    Output("practice-summary", "children", allow_duplicate=True),
    Input("reset-practice-button", "n_clicks"),
    prevent_initial_call=True,
)
def reset_practice(clicks: int) -> tuple[Any, ...]:
    """Clear practice answers without changing the Explore graph."""

    if not clicks:
        return (no_update,) * 9
    return None, None, None, None, "", "", "", "", "Practice reset. The frozen graph was preserved."


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("GRAPH_DASHBOARD_PORT", "8054")), debug=False)
