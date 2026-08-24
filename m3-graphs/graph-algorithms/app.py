"""Graph algorithms lab for ISC 4221C Module 3.

    python app.py

Open http://127.0.0.1:8057.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, dcc, html, no_update

from figures import dijkstra_figure, traversal_figure
from graph_alg_model import VERTICES, default_state, dijkstra_query, dijkstra_takeaway, normalize_state, traversal_query, traversal_takeaway
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from practice_model import bfs_prompt, dist_prompt, score_practice


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    """Build a consistently styled action button."""

    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def question_block(number: int, legend: Any, control: Any, feedback_id: str) -> html.Fieldset:
    """Build one practice question with a live feedback region."""

    return html.Fieldset(
        [html.Legend([html.Span(str(number), className="question-number"), legend]), control, html.Div(id=feedback_id, className="feedback", **{"aria-live": "polite"})],
        className="question-block",
    )


vertex_options = [{"label": label, "value": label} for label in VERTICES]
initial = default_state()

explore_layout = html.Div(
    [
        html.Section(
            [html.P("CURRENT GRAPH", className="status-label"), html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"})],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["traversal"]["objective"], className="objective"), html.H2(SECTIONS["traversal"]["title"]), html.P(SECTIONS["traversal"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Start vertex", htmlFor="start-control", className="control-label"),
                        dcc.Dropdown(id="start-control", options=vertex_options, value=initial["start"], clearable=False, searchable=False, className="family-dropdown"),
                        html.Label("Traversal step", htmlFor="step-control", className="control-label"),
                        dcc.Slider(id="step-control", min=0, max=max(0, initial["bfs_len"] - 1), step=1, value=initial["step"], marks={0: "start"}),
                    ],
                    className="control-panel",
                ),
                html.Div(
                    [
                        html.Div(
                            [dcc.Graph(id="bfs-graph", figure=traversal_figure(initial, "bfs"), config={"displaylogo": False}, className="dashboard-graph"), dcc.Graph(id="dfs-graph", figure=traversal_figure(initial, "dfs"), config={"displaylogo": False}, className="dashboard-graph")],
                            className="figure-pair",
                        ),
                        html.Div(id="trav-stats", className="stat-pills"),
                    ],
                    className="figure-column",
                ),
                html.P(id="trav-explanation", className="state-explanation"),
                html.P(id="trav-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["dijkstra"]["objective"], className="objective"), html.H2(SECTIONS["dijkstra"]["title"]), html.P(SECTIONS["dijkstra"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Goal vertex", htmlFor="goal-control", className="control-label"),
                        dcc.Dropdown(id="goal-control", options=vertex_options, value=initial["goal"], clearable=False, searchable=False, className="family-dropdown"),
                        html.Label("Dijkstra step", htmlFor="dij-step", className="control-label"),
                        dcc.Slider(id="dij-step", min=0, max=max(0, initial["dij_len"] - 1), step=1, value=initial["dijkstra_step"], marks={0: "start"}),
                    ],
                    className="control-panel",
                ),
                html.Div([dcc.Graph(id="dij-graph", figure=dijkstra_figure(initial), config={"displaylogo": False}, className="dashboard-graph"), html.Div(id="dij-stats", className="stat-pills")], className="figure-column"),
                html.P(id="dij-explanation", className="state-explanation"),
                html.P(id="dij-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section([html.H3("Sources"), html.Ul([html.Li(item) for item in SOURCES], className="source-list")], className="sources-card"),
    ],
    className="explore-layout",
)

practice_layout = html.Div(
    [
        html.Section(
            [
                html.P("PRACTICE", className="eyebrow"),
                html.H2("Visit order and path weight"),
                html.P(PRACTICE_INTRO),
                html.Div([html.Div(id="practice-state-summary", className="frozen-state"), button("Use current Explore graph", "refresh-practice-button", "secondary")], className="practice-snapshot-row"),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "What data structure is the BFS frontier?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {"label": "A queue: vertices discovered earlier are expanded earlier.", "value": "queue"},
                            {"label": "A stack: BFS always dives down one branch first.", "value": "stack"},
                            {"label": "A priority queue of edge weights.", "value": "heap"},
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "What does Dijkstra's number on a vertex represent?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {"label": "The number of hops from the start, as in BFS.", "value": "hops"},
                            {"label": "The smallest sum of edge weights from the start (nonnegative weights).", "value": "weights"},
                            {"label": "The degree of the vertex.", "value": "degree"},
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(3, html.Span(id="state-question-bfs"), dcc.Input(id="q3-answer", type="text", debounce=True, className="text-input", maxLength=1), "q3-feedback"),
                question_block(4, html.Span(id="state-question-dist"), dcc.Input(id="q4-answer", type="number", debounce=True, className="number-input"), "q4-feedback"),
                html.Div([button("Submit answers", "submit-practice-button"), button("Reset answers", "reset-practice-button", "outline")], className="practice-actions"),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Graph Algorithms Lab · ISC 4221C", suppress_callback_exceptions=True)
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 3", className="eyebrow"),
                html.H1("Graph Algorithms Lab"),
                html.P("Step through BFS versus DFS, then watch Dijkstra settle a weighted shortest path.", className="subtitle"),
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
                    dcc.Tab(label="Explore", value="explore", children=explore_layout, className="top-tab", selected_className="top-tab selected"),
                    dcc.Tab(label="Practice", value="practice", children=practice_layout, className="top-tab", selected_className="top-tab selected"),
                ],
                className="top-tabs",
            )
        ),
        html.Footer("Teaching graph on seven vertices with positive weights. BFS hop-distance is not Dijkstra distance unless every weight is 1.", className="app-footer"),
    ],
    className="app-shell",
)


@app.callback(Output("explore-store", "data"), Input("start-control", "value"), Input("goal-control", "value"), Input("step-control", "value"), Input("dij-step", "value"))
def update_explore_state(start: str, goal: str, step: int, dij_step: int) -> dict[str, Any]:
    """Keep start, goal, and animation steps in one store."""

    return normalize_state({"start": start, "goal": goal, "step": step, "dijkstra_step": dij_step})


@app.callback(
    Output("parameter-summary", "children"),
    Output("bfs-graph", "figure"),
    Output("dfs-graph", "figure"),
    Output("trav-stats", "children"),
    Output("trav-explanation", "children"),
    Output("trav-takeaway", "children"),
    Output("dij-graph", "figure"),
    Output("dij-stats", "children"),
    Output("dij-explanation", "children"),
    Output("dij-takeaway", "children"),
    Output("step-control", "max"),
    Output("step-control", "value"),
    Output("dij-step", "max"),
    Output("dij-step", "value"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render traversal and Dijkstra views together."""

    state = normalize_state(state)
    trav = traversal_query(state)
    dij = dijkstra_query(state)
    summary = [html.Strong(f"start {state['start']}"), html.Span(f"goal {state['goal']}"), html.Span(f"BFS order {trav['bfs_order']}"), html.Span(f"path {'–'.join(dij['path'])}")]
    trav_stats = [html.Span(["BFS ", html.B(" ".join(trav["bfs_order"]))]), html.Span(["DFS ", html.B(" ".join(trav["dfs_order"]))])]
    dij_stats = [html.Span(["settled ", html.B(" ".join(dij["snap"]["settled"]))]), html.Span(["dist(goal) ", html.B(str(dij["goal_dist"]))])]
    expl = f"BFS frontier (queue) {trav['bfs']['frontier']}. DFS frontier (stack) {trav['dfs']['frontier']}."
    dij_expl = f"Tentative distances { {label: (value if value < 10**6 else '∞') for label, value in dij['snap']['dist'].items()} }."
    return (
        summary,
        traversal_figure(state, "bfs"),
        traversal_figure(state, "dfs"),
        trav_stats,
        expl,
        traversal_takeaway(state),
        dijkstra_figure(state),
        dij_stats,
        str(dij_expl),
        dijkstra_takeaway(state),
        trav["bfs_len"] - 1,
        state["step"],
        dij["n_steps"] - 1,
        state["dijkstra_step"],
    )


@app.callback(Output("practice-store", "data"), Input("refresh-practice-button", "n_clicks"), State("explore-store", "data"), prevent_initial_call=True)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current start and goal."""

    del clicks
    return normalize_state(state)


@app.callback(Output("practice-state-summary", "children"), Output("state-question-bfs", "children"), Output("state-question-dist", "children"), Input("practice-store", "data"))
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen graph algorithms state."""

    state = normalize_state(state)
    trav = traversal_query(state)
    dij = dijkstra_query(state)
    summary = [html.Strong("Frozen Explore graph"), html.Span(f"start {state['start']}"), html.Span(f"goal {state['goal']}"), html.Span(f"BFS {trav['bfs_order']}"), html.Span(f"path {'–'.join(dij['path'])} weight {dij['goal_dist']}")]
    return summary, bfs_prompt(state), dist_prompt(state)


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
def score_answers(clicks: int, t1: str | None, t2: str | None, third: str | None, dist: float | None, state: dict[str, Any]) -> tuple[Any, ...]:
    """Score concept and frozen-graph responses."""

    del clicks
    result = score_practice(t1, t2, third, dist, state)
    return result["q1"]["text"], f"feedback {result['q1']['status']}", result["q2"]["text"], f"feedback {result['q2']['status']}", result["q3"]["text"], f"feedback {result['q3']['status']}", result["q4"]["text"], f"feedback {result['q4']['status']}", result["summary"]


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
    """Clear practice answers without changing Explore settings."""

    if not clicks:
        return (no_update,) * 9
    return None, None, None, None, "", "", "", "", "Practice reset. Frozen settings were preserved."


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("GRAPH_ALG_DASHBOARD_PORT", "8057")), debug=False)
