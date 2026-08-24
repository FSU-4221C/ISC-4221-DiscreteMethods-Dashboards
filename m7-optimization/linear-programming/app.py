"""Linear programming lab for ISC 4221C Module 7.

    python app.py

Open http://127.0.0.1:8060.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, dcc, html, no_update

from figures import lp_figure
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from lp_model import PROBLEMS, default_state, lp_query, lp_takeaway, normalize_state
from practice_model import score_practice, vertex_prompt, z_prompt


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    """Build a consistently styled action button."""

    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def question_block(number: int, legend: Any, control: Any, feedback_id: str) -> html.Fieldset:
    """Build one practice question with a live feedback region."""

    return html.Fieldset(
        [html.Legend([html.Span(str(number), className="question-number"), legend]), control, html.Div(id=feedback_id, className="feedback", **{"aria-live": "polite"})],
        className="question-block",
    )


initial = default_state()

explore_layout = html.Div(
    [
        html.Section(
            [html.P("CURRENT LP", className="status-label"), html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"})],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["region"]["objective"], className="objective"), html.H2(SECTIONS["region"]["title"]), html.P(SECTIONS["region"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Word problem", className="control-label"),
                        dcc.RadioItems(
                            id="problem-control",
                            className="graph-kind-options",
                            options=[{"label": spec["title"], "value": key} for key, spec in PROBLEMS.items()],
                            value=initial["problem"],
                        ),
                    ],
                    className="control-panel",
                ),
                html.Div([dcc.Graph(id="lp-graph", figure=lp_figure(initial), config={"displaylogo": False}, className="dashboard-graph"), html.Div(id="lp-stats", className="stat-pills")], className="figure-column"),
                html.P(id="lp-explanation", className="state-explanation"),
                html.P(id="lp-takeaway", className="takeaway"),
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
                html.H2("Read the feasible region"),
                html.P(PRACTICE_INTRO),
                html.Div([html.Div(id="practice-state-summary", className="frozen-state"), button("Use current Explore problem", "refresh-practice-button", "secondary")], className="practice-snapshot-row"),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "Where does a bounded two-variable linear program attain its optimum?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {"label": "At a vertex of the feasible region.", "value": "vertex"},
                            {"label": "At the centroid of the feasible region.", "value": "centroid"},
                            {"label": "Anywhere on a constraint line, even if infeasible for the others.", "value": "line"},
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "What is the feasible region geometrically?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {"label": "The intersection of the half-planes defined by the inequalities (including x, y ≥ 0).", "value": "halfplanes"},
                            {"label": "The union of the constraint lines.", "value": "union"},
                            {"label": "The disk inscribed in the first quadrant.", "value": "disk"},
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(3, html.Span(id="state-question-z"), dcc.Input(id="q3-answer", type="number", debounce=True, className="number-input"), "q3-feedback"),
                question_block(4, html.Span(id="state-question-v"), dcc.Input(id="q4-answer", type="number", debounce=True, className="number-input"), "q4-feedback"),
                html.Div([button("Submit answers", "submit-practice-button"), button("Reset answers", "reset-practice-button", "outline")], className="practice-actions"),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Linear Programming Lab · ISC 4221C", suppress_callback_exceptions=True)
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 7", className="eyebrow"),
                html.H1("Linear Programming Lab"),
                html.P("See a two-variable LP as half-planes, vertices, and an optimum marked on the feasible region.", className="subtitle"),
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
        html.Footer("Two-variable teaching LPs. The vertex enumeration is the 2D picture behind simplex, not a production solver.", className="app-footer"),
    ],
    className="app-shell",
)


@app.callback(Output("explore-store", "data"), Input("problem-control", "value"))
def update_explore_state(problem: str) -> dict[str, Any]:
    """Keep the selected word problem in the store."""

    return normalize_state({"problem": problem})


@app.callback(
    Output("parameter-summary", "children"),
    Output("lp-graph", "figure"),
    Output("lp-stats", "children"),
    Output("lp-explanation", "children"),
    Output("lp-takeaway", "children"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render the feasible region for the selected LP."""

    query = lp_query(normalize_state(state))
    best = query["best"]
    summary = [html.Strong(query["title"]), html.Span(query["kind"]), html.Span(f"{len(query['vertices'])} vertices")]
    if best:
        summary.append(html.Span(f"z* = {best['z']:.2f}"))
    stats = [html.Span(["vertices ", html.B(str(len(query["vertices"])))])]
    if best:
        stats.append(html.Span(["optimum (", html.B(f"{best['x']:.2f}, {best['y']:.2f}"), ")"]))
        stats.append(html.Span(["z* = ", html.B(f"{best['z']:.2f}")]))
    return summary, lp_figure(state), stats, query["story"], lp_takeaway(state)


@app.callback(Output("practice-store", "data"), Input("refresh-practice-button", "n_clicks"), State("explore-store", "data"), prevent_initial_call=True)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current LP."""

    del clicks
    return normalize_state(state)


@app.callback(Output("practice-state-summary", "children"), Output("state-question-z", "children"), Output("state-question-v", "children"), Input("practice-store", "data"))
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen linear program."""

    query = lp_query(normalize_state(state))
    best = query["best"]
    summary = [html.Strong("Frozen Explore problem"), html.Span(query["title"]), html.Span(f"{len(query['vertices'])} vertices")]
    if best:
        summary.append(html.Span(f"z* = {best['z']:.2f}"))
    return summary, z_prompt(state), vertex_prompt(state)


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
def score_answers(clicks: int, t1: str | None, t2: str | None, z_val: float | None, n_val: float | None, state: dict[str, Any]) -> tuple[Any, ...]:
    """Score concept and frozen-LP responses."""

    del clicks
    result = score_practice(t1, t2, z_val, n_val, state)
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
    """Clear practice answers without changing the selected LP."""

    if not clicks:
        return (no_update,) * 9
    return None, None, None, None, "", "", "", "", "Practice reset. Frozen problem was preserved."


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("LP_DASHBOARD_PORT", "8060")), debug=False)
