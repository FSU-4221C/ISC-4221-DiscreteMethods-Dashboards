"""Convex hull lab for ISC 4221C Module 6.

    python app.py

Open http://127.0.0.1:8059.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, ctx, dcc, html, no_update

from figures import hull_figure
from hull_model import add_point, clear_points, default_state, hull_query, hull_takeaway, normalize_state
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from practice_model import hull_count_prompt, interior_prompt, score_practice


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
        dcc.Store(id="click-store"),
        html.Section(
            [html.P("CURRENT POINT SET", className="status-label"), html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"})],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["hull"]["objective"], className="objective"), html.H2(SECTIONS["hull"]["title"]), html.P(SECTIONS["hull"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        button("Load sample", "sample-button", "secondary"),
                        button("Clear canvas", "clear-button", "outline"),
                    ],
                    className="control-panel",
                ),
                html.Div([dcc.Graph(id="hull-canvas", figure=hull_figure(initial), config={"displaylogo": False, "scrollZoom": False}, className="dashboard-graph")], className="figure-column"),
                html.P(id="hull-explanation", className="state-explanation"),
                html.P(id="hull-takeaway", className="takeaway"),
            ],
            className="learning-card canvas-card",
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
                html.H2("Read the hull you built"),
                html.P(PRACTICE_INTRO),
                html.Div([html.Div(id="practice-state-summary", className="frozen-state"), button("Use current Explore points", "refresh-practice-button", "secondary")], className="practice-snapshot-row"),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "What is the convex hull of a finite point set in the plane?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {"label": "The unique convex polygon that contains every point of the set.", "value": "convex"},
                            {"label": "The axis-aligned bounding box of the points.", "value": "box"},
                            {"label": "The Delaunay triangulation of the points.", "value": "delaunay"},
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "If you delete a strictly interior point, what happens to the hull?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {"label": "The hull polygon stays the same.", "value": "interior"},
                            {"label": "The hull always loses one vertex.", "value": "loses"},
                            {"label": "The remaining points become collinear.", "value": "collinear"},
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(3, html.Span(id="state-question-h"), dcc.Input(id="q3-answer", type="number", debounce=True, className="number-input"), "q3-feedback"),
                question_block(4, html.Span(id="state-question-i"), dcc.Input(id="q4-answer", type="number", debounce=True, className="number-input"), "q4-feedback"),
                html.Div([button("Submit answers", "submit-practice-button"), button("Reset answers", "reset-practice-button", "outline")], className="practice-actions"),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Convex Hull Lab · ISC 4221C", suppress_callback_exceptions=True)
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 6", className="eyebrow"),
                html.H1("Convex Hull Lab"),
                html.P("Click a canvas to grow a point set and watch the convex hull update.", className="subtitle"),
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
        html.Footer("Andrew's monotone chain on at most 16 points. A teaching model, not a computational-geometry library.", className="app-footer"),
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
        return {x: point.x, y: point.y, t: Date.now()};
    }
    """,
    Output("click-store", "data"),
    Input("hull-canvas", "clickData"),
)


@app.callback(
    Output("explore-store", "data"),
    Input("click-store", "data"),
    Input("sample-button", "n_clicks"),
    Input("clear-button", "n_clicks"),
    State("explore-store", "data"),
    prevent_initial_call=True,
)
def update_explore_state(click: dict[str, Any] | None, sample_clicks: int, clear_clicks: int, store: dict[str, Any] | None) -> dict[str, Any]:
    """Add a clicked point, reload the sample, or clear."""

    del sample_clicks, clear_clicks
    trigger = ctx.triggered_id
    if trigger == "clear-button":
        return clear_points()
    if trigger == "sample-button":
        return default_state()
    if trigger == "click-store" and click:
        return add_point(store or default_state(), float(click["x"]), float(click["y"]))
    return normalize_state(store)


@app.callback(
    Output("parameter-summary", "children"),
    Output("hull-canvas", "figure"),
    Output("hull-explanation", "children"),
    Output("hull-takeaway", "children"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render the hull canvas from the point store."""

    state = normalize_state(state)
    query = hull_query(state)
    summary = [html.Strong(f"n = {query['n']}"), html.Span(f"hull vertices {query['h']}"), html.Span(f"interior {query['interior_count']}")]
    expl = "Click empty canvas to add a point. Gold = interior, garnet = hull vertex."
    return summary, hull_figure(state), expl, hull_takeaway(state)


@app.callback(Output("practice-store", "data"), Input("refresh-practice-button", "n_clicks"), State("explore-store", "data"), prevent_initial_call=True)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current point set."""

    del clicks
    return normalize_state(state)


@app.callback(Output("practice-state-summary", "children"), Output("state-question-h", "children"), Output("state-question-i", "children"), Input("practice-store", "data"))
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen point set."""

    query = hull_query(normalize_state(state))
    summary = [html.Strong("Frozen Explore points"), html.Span(f"n = {query['n']}"), html.Span(f"h = {query['h']}"), html.Span(f"interior {query['interior_count']}")]
    return summary, hull_count_prompt(state), interior_prompt(state)


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
def score_answers(clicks: int, t1: str | None, t2: str | None, h_val: float | None, i_val: float | None, state: dict[str, Any]) -> tuple[Any, ...]:
    """Score concept and frozen-hull responses."""

    del clicks
    result = score_practice(t1, t2, h_val, i_val, state)
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
    """Clear practice answers without changing Explore points."""

    if not clicks:
        return (no_update,) * 9
    return None, None, None, None, "", "", "", "", "Practice reset. Frozen points were preserved."


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("HULL_DASHBOARD_PORT", "8059")), debug=False)
