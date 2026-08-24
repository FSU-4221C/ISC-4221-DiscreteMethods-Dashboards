"""Monte Carlo lab for ISC 4221C Module 2.

    python app.py

Open http://127.0.0.1:8056.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, dcc, html, no_update

from figures import clt_figure, pi_figure
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from mc_model import clt_sample, clt_takeaway, dart_sample, default_state, normalize_state, pi_takeaway
from practice_model import pi_prompt, score_practice, se_prompt


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


initial = default_state()

explore_layout = html.Div(
    [
        html.Section(
            [html.P("CURRENT DRAW", className="status-label"), html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"})],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["pi"]["objective"], className="objective"), html.H2(SECTIONS["pi"]["title"]), html.P(SECTIONS["pi"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Number of throws n", htmlFor="n-points", className="control-label"),
                        dcc.Slider(id="n-points", min=20, max=2000, step=20, value=initial["n_points"], marks={20: "20", 200: "200", 1000: "1000", 2000: "2000"}),
                        html.Label("Seed", htmlFor="seed-control", className="control-label"),
                        dcc.Slider(id="seed-control", min=1, max=99, step=1, value=initial["seed"], marks={1: "1", 7: "7", 50: "50", 99: "99"}),
                    ],
                    className="control-panel",
                ),
                html.Div([dcc.Graph(id="pi-graph", figure=pi_figure(initial), config={"displaylogo": False}, className="dashboard-graph"), html.Div(id="pi-stats", className="stat-pills")], className="figure-column"),
                html.P(id="pi-explanation", className="state-explanation"),
                html.P(id="pi-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["clt"]["objective"], className="objective"), html.H2(SECTIONS["clt"]["title"]), html.P(SECTIONS["clt"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Parent distribution", className="control-label"),
                        dcc.RadioItems(
                            id="parent-control",
                            className="graph-kind-options",
                            options=[{"label": "Uniform(0, 1)", "value": "uniform"}, {"label": "Exponential(λ = 1)", "value": "exponential"}],
                            value=initial["parent"],
                        ),
                        html.Label("Sample size n for each mean", htmlFor="sample-size", className="control-label"),
                        dcc.Slider(id="sample-size", min=2, max=80, step=1, value=initial["sample_size"], marks={2: "2", 12: "12", 40: "40", 80: "80"}),
                    ],
                    className="control-panel",
                ),
                html.Div([dcc.Graph(id="clt-graph", figure=clt_figure(initial), config={"displaylogo": False}, className="dashboard-graph"), html.Div(id="clt-stats", className="stat-pills")], className="figure-column"),
                html.P(id="clt-explanation", className="state-explanation"),
                html.P(id="clt-takeaway", className="takeaway"),
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
                html.H2("Read the seeded simulation"),
                html.P(PRACTICE_INTRO),
                html.Div([html.Div(id="practice-state-summary", className="frozen-state"), button("Use current Explore settings", "refresh-practice-button", "secondary")], className="practice-snapshot-row"),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "Why is the dartboard estimate 4 × (hits / n)?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {"label": "The square has area 4 and the unit disk has area π, so the hit fraction estimates π/4.", "value": "area"},
                            {"label": "Four is the number of quadrants, and we average one π estimate from each.", "value": "quadrants"},
                            {"label": "Hits are always 25% of throws, so we multiply by 4 to recover 1.", "value": "quarter"},
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "Does the CLT require the parent distribution to be Gaussian?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {"label": "Yes: sample means are Gaussian only if each observation is Gaussian.", "value": "yes"},
                            {"label": "No: means of i.i.d. samples become approximately Gaussian even when the parent is skewed.", "value": "parent"},
                            {"label": "No, but only Uniform parents are allowed.", "value": "uniform"},
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(3, html.Span(id="state-question-pi"), dcc.Input(id="q3-answer", type="number", debounce=True, className="number-input"), "q3-feedback"),
                question_block(4, html.Span(id="state-question-se"), dcc.Input(id="q4-answer", type="number", debounce=True, className="number-input"), "q4-feedback"),
                html.Div([button("Submit answers", "submit-practice-button"), button("Reset answers", "reset-practice-button", "outline")], className="practice-actions"),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Monte Carlo Lab · ISC 4221C", suppress_callback_exceptions=True)
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 2", className="eyebrow"),
                html.H1("Monte Carlo Lab"),
                html.P("Estimate π with seeded darts, then watch sample means obey the central limit theorem.", className="subtitle"),
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
        html.Footer("Seeded teaching simulations. Results are reproducible for a given seed; they are not a cryptographic RNG study.", className="app-footer"),
    ],
    className="app-shell",
)


@app.callback(Output("explore-store", "data"), Input("n-points", "value"), Input("seed-control", "value"), Input("parent-control", "value"), Input("sample-size", "value"))
def update_explore_state(n_points: int, seed: int, parent: str, sample_size: int) -> dict[str, Any]:
    """Keep dart and CLT controls in one store."""

    return normalize_state({"n_points": n_points, "seed": seed, "parent": parent, "sample_size": sample_size, "n_means": 400})


@app.callback(
    Output("parameter-summary", "children"),
    Output("pi-graph", "figure"),
    Output("pi-stats", "children"),
    Output("pi-explanation", "children"),
    Output("pi-takeaway", "children"),
    Output("clt-graph", "figure"),
    Output("clt-stats", "children"),
    Output("clt-explanation", "children"),
    Output("clt-takeaway", "children"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render both Monte Carlo sections."""

    state = normalize_state(state)
    darts = dart_sample(state)
    clt = clt_sample(state)
    summary = [html.Strong(f"seed {darts['seed']}"), html.Span(f"n = {darts['n']} throws"), html.Strong(clt["label"]), html.Span(f"sample size {clt['sample_size']}")]
    pi_stats = [html.Span(["hits ", html.B(str(darts["hits"]))]), html.Span(["π̂ = ", html.B(f"{darts['estimate']:.4f}")]), html.Span(["|π̂ − π| = ", html.B(f"{darts['error']:.4f}")])]
    clt_stats = [html.Span(["empirical mean ", html.B(f"{clt['empirical_mean']:.3f}")]), html.Span(["empirical SD ", html.B(f"{clt['empirical_std']:.3f}")]), html.Span(["σ/√n = ", html.B(f"{clt['theoretical_se']:.3f}")])]
    return (
        summary,
        pi_figure(state),
        pi_stats,
        f"{darts['hits']} of {darts['n']} points fell inside x² + y² ≤ 1.",
        pi_takeaway(state),
        clt_figure(state),
        clt_stats,
        f"The teal curve is Normal(μ, σ²/n) scaled to the histogram counts.",
        clt_takeaway(state),
    )


@app.callback(Output("practice-store", "data"), Input("refresh-practice-button", "n_clicks"), State("explore-store", "data"), prevent_initial_call=True)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current seeded simulation."""

    del clicks
    return normalize_state(state)


@app.callback(Output("practice-state-summary", "children"), Output("state-question-pi", "children"), Output("state-question-se", "children"), Input("practice-store", "data"))
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen Monte Carlo draw."""

    state = normalize_state(state)
    darts = dart_sample(state)
    clt = clt_sample(state)
    summary = [html.Strong("Frozen Explore settings"), html.Span(f"seed {darts['seed']}, n = {darts['n']}"), html.Span(f"{clt['label']}, sample size {clt['sample_size']}")]
    return summary, pi_prompt(state), se_prompt(state)


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
def score_answers(clicks: int, t1: str | None, t2: str | None, a3: float | None, a4: float | None, state: dict[str, Any]) -> tuple[Any, ...]:
    """Score concept and frozen-simulation responses."""

    del clicks
    result = score_practice(t1, t2, a3, a4, state)
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
    app.run(host="127.0.0.1", port=int(os.environ.get("MONTE_CARLO_DASHBOARD_PORT", "8056")), debug=False)
