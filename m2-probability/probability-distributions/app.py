"""PDF and CDF lab for ISC 4221C Module 2.

Run from this folder with the course environment:

    python app.py

Then open http://127.0.0.1:8053.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, ctx, dcc, html, no_update

from distribution_model import (
    INVENTED_SUPPORT,
    continuous_query,
    continuous_takeaway,
    default_state,
    discrete_pdf,
    discrete_query,
    discrete_takeaway,
    format_probability,
    normalize_state,
)
from figures import (
    continuous_cdf_figure,
    continuous_pdf_figure,
    discrete_cdf_figure,
    discrete_pmf_figure,
)
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from practice_model import (
    continuous_state_prompt,
    discrete_state_prompt,
    score_practice,
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


def weight_slider(face: int, value: float) -> html.Div:
    """Build one mass control for the invented die."""

    return html.Div(
        [
            html.Label(f"Mass on {face}", htmlFor=f"weight-{face}", className="control-label"),
            dcc.Slider(
                id=f"weight-{face}",
                min=0,
                max=8,
                step=0.5,
                value=value,
                marks={0: "0", 4: "4", 8: "8"},
            ),
        ],
        className="weight-control",
    )


def clicked_x(click_data: dict[str, Any] | None) -> float | None:
    """Read the x-coordinate of a Plotly click, if present."""

    if not click_data:
        return None
    points = click_data.get("points") or []
    if not points:
        return None
    value = points[0].get("x")
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


initial = default_state()

explore_layout = html.Div(
    [
        html.Section(
            [
                html.P("CURRENT PROBES", className="status-label"),
                html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"}),
            ],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["continuous"]["objective"], className="objective"),
                        html.H2(SECTIONS["continuous"]["title"]),
                        html.P(SECTIONS["continuous"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Label("Continuous family", htmlFor="continuous-family", className="control-label"),
                        dcc.Dropdown(
                            id="continuous-family",
                            options=[
                                {"label": "Gaussian / normal", "value": "gaussian"},
                                {"label": "Uniform", "value": "uniform"},
                                {"label": "Exponential", "value": "exponential"},
                            ],
                            value=initial["continuous_family"],
                            clearable=False,
                            searchable=False,
                            className="family-dropdown",
                        ),
                        html.Div(
                            [
                                html.Label("Mean μ", htmlFor="mu-control", className="control-label"),
                                dcc.Slider(id="mu-control", min=-4, max=4, step=0.1, value=initial["mu"], marks={-4: "−4", 0: "0", 4: "4"}),
                                html.Label("Std. dev. σ", htmlFor="sigma-control", className="control-label"),
                                dcc.Slider(id="sigma-control", min=0.2, max=3, step=0.05, value=initial["sigma"], marks={0.2: "0.2", 1: "1", 3: "3"}),
                            ],
                            id="gaussian-controls",
                        ),
                        html.Div(
                            [
                                html.Label("Left endpoint a", htmlFor="uniform-a-control", className="control-label"),
                                dcc.Slider(id="uniform-a-control", min=-2, max=4, step=0.1, value=initial["uniform_a"], marks={-2: "−2", 0: "0", 4: "4"}),
                                html.Label("Right endpoint b", htmlFor="uniform-b-control", className="control-label"),
                                dcc.Slider(id="uniform-b-control", min=0, max=10, step=0.1, value=initial["uniform_b"], marks={0: "0", 6: "6", 10: "10"}),
                            ],
                            id="uniform-controls",
                        ),
                        html.Div(
                            [
                                html.Label("Rate λ", htmlFor="exp-rate-control", className="control-label"),
                                dcc.Slider(id="exp-rate-control", min=0.1, max=2.5, step=0.05, value=initial["exp_rate"], marks={0.1: "0.1", 0.5: "0.5", 2.5: "2.5"}),
                            ],
                            id="exponential-controls",
                        ),
                        html.Label("Probe x", htmlFor="x-control", className="control-label"),
                        dcc.Slider(id="x-control", min=-4.5, max=4.5, step=0.05, value=initial["x"], marks={-4: "−4", 0: "0", 4: "4"}),
                    ],
                    className="control-panel",
                    role="group",
                    **{"aria-label": "Controls for the continuous PDF"},
                ),
                html.Div(
                    [
                        html.Div(id="continuous-stats", className="stat-pills"),
                        html.Div(
                            [
                                dcc.Graph(id="continuous-pdf-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
                                dcc.Graph(id="continuous-cdf-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
                            ],
                            className="figure-pair",
                        ),
                    ],
                    className="figure-column",
                ),
                html.P(id="continuous-explanation", className="state-explanation", **{"aria-live": "polite"}),
                html.P(id="continuous-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["discrete"]["objective"], className="objective"),
                        html.H2(SECTIONS["discrete"]["title"]),
                        html.P(SECTIONS["discrete"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Label("Discrete family", htmlFor="discrete-family", className="control-label"),
                        dcc.Dropdown(
                            id="discrete-family",
                            options=[
                                {"label": "Invented die (edit masses)", "value": "invented"},
                                {"label": "Fair die", "value": "fair_die"},
                                {"label": "Sum of two fair dice", "value": "two_dice"},
                                {"label": "Poisson", "value": "poisson"},
                            ],
                            value=initial["discrete_family"],
                            clearable=False,
                            searchable=False,
                            className="family-dropdown",
                        ),
                        html.Div(
                            [weight_slider(face, initial["weights"][face - 1]) for face in INVENTED_SUPPORT],
                            id="invented-controls",
                            className="weight-grid",
                        ),
                        html.Div(
                            [
                                html.Label("Poisson λ", htmlFor="poisson-control", className="control-label"),
                                dcc.Slider(id="poisson-control", min=0.4, max=8, step=0.2, value=initial["poisson_lambda"], marks={0.4: "0.4", 3: "3", 8: "8"}),
                            ],
                            id="poisson-controls",
                        ),
                        html.Label("Outcome k", htmlFor="k-control", className="control-label"),
                        dcc.Slider(id="k-control", min=1, max=6, step=1, value=initial["k"], marks={1: "1", 3: "3", 6: "6"}),
                    ],
                    className="control-panel",
                    role="group",
                    **{"aria-label": "Controls for the discrete PDF"},
                ),
                html.Div(
                    [
                        html.Div(id="discrete-stats", className="stat-pills"),
                        html.Div(
                            [
                                dcc.Graph(id="discrete-pmf-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
                                dcc.Graph(id="discrete-cdf-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
                            ],
                            className="figure-pair",
                        ),
                    ],
                    className="figure-column",
                ),
                html.P(id="discrete-explanation", className="state-explanation", **{"aria-live": "polite"}),
                html.P(id="discrete-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.H3("What this model is"),
                html.P(
                    "The course uses PDF for both a discrete mass function and a continuous density. "
                    "Gold dashed lines mark E[X]. Click a curve or bar to move the probe. "
                    "Invented masses are renormalized so they always sum to 1."
                ),
                html.Ul([html.Li(source) for source in SOURCES], className="source-list"),
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
                html.H2("Read density, mass, and F_X(x) from the frozen plots"),
                html.P(PRACTICE_INTRO),
                html.Div(
                    [
                        html.Div(id="practice-state-summary", className="frozen-state"),
                        button("Use current Explore settings", "refresh-practice-button", "secondary"),
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
                    "For a continuous PDF, what is P(X = x) at a single number x?",
                    dcc.RadioItems(
                        id="q1-answer",
                        options=[
                            {"label": "0, because a single point has no area", "value": "zero"},
                            {"label": "The PDF height p_X(x)", "value": "height"},
                            {"label": "Always 1/2 at the mean", "value": "half"},
                        ],
                        className="answer-options",
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "What does the CDF value F_X(x) equal?",
                    dcc.RadioItems(
                        id="q2-answer",
                        options=[
                            {"label": "P(X ≤ x)", "value": "cdf"},
                            {"label": "P(X = x)", "value": "point"},
                            {"label": "P(X > x)", "value": "survival"},
                        ],
                        className="answer-options",
                    ),
                    "q2-feedback",
                ),
                question_block(
                    3,
                    html.Span(id="state-question-continuous"),
                    dcc.Input(id="q3-answer", type="number", step="any", placeholder="Enter a probability", className="number-input"),
                    "q3-feedback",
                ),
                question_block(
                    4,
                    html.Span(id="state-question-discrete"),
                    dcc.Input(id="q4-answer", type="number", step="any", placeholder="Enter E[X]", className="number-input"),
                    "q4-feedback",
                ),
                html.Div(
                    [button("Submit answers", "submit-practice-button"), button("Reset practice", "reset-practice-button", "outline")],
                    className="practice-actions",
                ),
                html.Div(id="practice-summary", className="practice-summary", role="status", **{"aria-live": "assertive", "tabIndex": -1}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="PDF & CDF Lab · ISC 4221C", update_title="Updating distribution…")
server = app.server
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 2", className="eyebrow"),
                html.H1("PDF & CDF Lab"),
                html.P(
                    "Move a probe through a named continuous density or an invented discrete PDF, "
                    "read the probability at that point, and watch the cumulative probability catch up.",
                    className="subtitle",
                ),
                html.Ul([html.Li(objective) for objective in LEARNING_OBJECTIVES], className="learning-objectives"),
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
        html.Footer(
            "Teaching model of named distributions. Invented masses are renormalized; learner data files are never uploaded.",
            className="app-footer",
        ),
    ],
    className="app-shell",
)


@app.callback(
    Output("explore-store", "data"),
    Input("continuous-family", "value"),
    Input("mu-control", "value"),
    Input("sigma-control", "value"),
    Input("uniform-a-control", "value"),
    Input("uniform-b-control", "value"),
    Input("exp-rate-control", "value"),
    Input("x-control", "value"),
    Input("discrete-family", "value"),
    Input("poisson-control", "value"),
    Input("k-control", "value"),
    Input("weight-1", "value"),
    Input("weight-2", "value"),
    Input("weight-3", "value"),
    Input("weight-4", "value"),
    Input("weight-5", "value"),
    Input("weight-6", "value"),
    Input("continuous-pdf-graph", "clickData"),
    Input("continuous-cdf-graph", "clickData"),
    Input("discrete-pmf-graph", "clickData"),
    Input("discrete-cdf-graph", "clickData"),
    State("explore-store", "data"),
)
def update_explore_state(*args: Any) -> dict[str, Any]:
    """Keep every probe, family, and invented mass in one canonical store."""

    (
        family,
        mu,
        sigma,
        uniform_a,
        uniform_b,
        exp_rate,
        x_value,
        discrete_family,
        poisson_lambda,
        k_value,
        w1,
        w2,
        w3,
        w4,
        w5,
        w6,
        pdf_click,
        cdf_click,
        pmf_click,
        step_click,
        store,
    ) = args
    current = {
        "continuous_family": family,
        "mu": mu,
        "sigma": sigma,
        "uniform_a": uniform_a,
        "uniform_b": uniform_b,
        "exp_rate": exp_rate,
        "x": x_value,
        "discrete_family": discrete_family,
        "poisson_lambda": poisson_lambda,
        "weights": [w1, w2, w3, w4, w5, w6],
        "k": k_value,
    }
    trigger = ctx.triggered_id
    if trigger in {"continuous-pdf-graph", "continuous-cdf-graph"}:
        clicked = clicked_x(pdf_click if trigger == "continuous-pdf-graph" else cdf_click)
        if clicked is not None:
            current["x"] = clicked
    if trigger in {"discrete-pmf-graph", "discrete-cdf-graph"}:
        clicked = clicked_x(pmf_click if trigger == "discrete-pmf-graph" else step_click)
        if clicked is not None:
            current["k"] = round(clicked)
    normalized = normalize_state(current)
    if trigger == "continuous-family":
        normalized["x"] = continuous_query(normalized)["mean"]
        normalized = normalize_state(normalized)
    if trigger == "discrete-family":
        normalized["k"] = int(round(discrete_query(normalized)["mean"]))
        normalized = normalize_state(normalized)
    del store
    return normalized


@app.callback(
    Output("parameter-summary", "children"),
    Output("continuous-stats", "children"),
    Output("discrete-stats", "children"),
    Output("continuous-pdf-graph", "figure"),
    Output("continuous-cdf-graph", "figure"),
    Output("discrete-pmf-graph", "figure"),
    Output("discrete-cdf-graph", "figure"),
    Output("continuous-explanation", "children"),
    Output("continuous-takeaway", "children"),
    Output("discrete-explanation", "children"),
    Output("discrete-takeaway", "children"),
    Output("gaussian-controls", "style"),
    Output("uniform-controls", "style"),
    Output("exponential-controls", "style"),
    Output("invented-controls", "style"),
    Output("poisson-controls", "style"),
    Output("x-control", "min"),
    Output("x-control", "max"),
    Output("x-control", "value"),
    Output("k-control", "min"),
    Output("k-control", "max"),
    Output("k-control", "value"),
    Output("k-control", "marks"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render both PDF/CDF pairs and the matching probe readouts."""

    state = normalize_state(state)
    cont = continuous_query(state)
    disc = discrete_query(state)
    values, _probs = discrete_pdf(state)
    summary = [
        html.Strong(cont["label"]),
        html.Span(f"x = {cont['x']:.2f}"),
        html.Strong(disc["label"]),
        html.Span(f"k = {disc['k']}"),
    ]
    continuous_stats = [
        html.Span(["p_X(x) = ", html.B(format_probability(cont["pdf"]))]),
        html.Span(["P(X = x) = ", html.B("0")]),
        html.Span(["F_X(x) = ", html.B(format_probability(cont["cdf"]))]),
        html.Span(["E[X] = ", html.B(f"{cont['mean']:.3f}")]),
    ]
    discrete_stats = [
        html.Span(["P(X = k) = ", html.B(format_probability(disc["point_probability"]))]),
        html.Span(["F_X(k) = ", html.B(format_probability(disc["cdf"]))]),
        html.Span(["E[X] = ", html.B(f"{disc['mean']:.3f}")]),
        html.Span(["Var(X) = ", html.B(f"{disc['variance']:.3f}")]),
    ]
    shown = {"display": "grid"}
    hidden = {"display": "none"}
    k_marks = {int(value): str(int(value)) for value in values[:: max(1, len(values) // 6)] + [values[-1]]}
    explanation_c = (
        f"The teal probe is x = {cont['x']:.2f}. Gold marks E[X] = {cont['mean']:.3f}. "
        f"P(X > x) = {format_probability(cont['survival'])}."
    )
    explanation_d = (
        f"The highlighted bar is k = {disc['k']}. Gold marks E[X] = {disc['mean']:.3f}. "
        f"P(X > k) = {format_probability(disc['survival'])}."
    )
    return (
        summary,
        continuous_stats,
        discrete_stats,
        continuous_pdf_figure(state),
        continuous_cdf_figure(state),
        discrete_pmf_figure(state),
        discrete_cdf_figure(state),
        explanation_c,
        continuous_takeaway(state),
        explanation_d,
        discrete_takeaway(state),
        shown if state["continuous_family"] == "gaussian" else hidden,
        shown if state["continuous_family"] == "uniform" else hidden,
        shown if state["continuous_family"] == "exponential" else hidden,
        shown if state["discrete_family"] == "invented" else hidden,
        shown if state["discrete_family"] == "poisson" else hidden,
        cont["x_min"],
        cont["x_max"],
        cont["x"],
        min(values),
        max(values),
        disc["k"],
        k_marks,
    )


@app.callback(
    Output("practice-store", "data"),
    Input("refresh-practice-button", "n_clicks"),
    State("explore-store", "data"),
    prevent_initial_call=True,
)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current Explore probes for the dashboard questions."""

    del clicks
    return normalize_state(state)


@app.callback(
    Output("practice-state-summary", "children"),
    Output("state-question-continuous", "children"),
    Output("state-question-discrete", "children"),
    Input("practice-store", "data"),
)
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen probes used by questions 3 and 4."""

    state = normalize_state(state)
    cont = continuous_query(state)
    disc = discrete_query(state)
    masses = ", ".join(
        f"{value}: {prob:.3f}" for value, prob in zip(disc["values"], disc["probs"], strict=True)
    )
    summary = [
        html.Strong("Frozen Explore settings"),
        html.Span(f"{cont['label']}, probe x = {cont['x']:.2f}"),
        html.Span(f"{disc['label']}, selected k = {disc['k']}"),
        html.Span(f"Discrete PDF p_X(x) = {{{masses}}}"),
    ]
    return summary, continuous_state_prompt(state), discrete_state_prompt(state)


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
    cdf_answer: float | None,
    mean_answer: float | None,
    explore_state: dict[str, Any],
) -> tuple[Any, ...]:
    """Score concept and frozen-plot responses with explanations."""

    del clicks
    result = score_practice(theory1, theory2, cdf_answer, mean_answer, explore_state)
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
    """Clear practice answers without changing Explore probes."""

    if not clicks:
        return (no_update,) * 9
    return None, None, None, None, "", "", "", "", "Practice reset. Explore settings were preserved."


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PROBABILITY_DASHBOARD_PORT", "8053")), debug=False)
