"""Image processing lab for ISC 4221C Module 4.

    python app.py

Open http://127.0.0.1:8058.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, dcc, html, no_update

from figures import filtered_figure, labels_figure, source_figure
from image_model import (
    KERNELS,
    component_query,
    component_takeaway,
    convolution_query,
    convolution_takeaway,
    default_state,
    normalize_state,
)
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from practice_model import count_prompt, kernel_prompt, score_practice


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    """Build a consistently styled action button."""

    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def question_block(number: int, legend: Any, control: Any, feedback_id: str) -> html.Fieldset:
    """Build one practice question with a live feedback region."""

    return html.Fieldset(
        [html.Legend([html.Span(str(number), className="question-number"), legend]), control, html.Div(id=feedback_id, className="feedback", **{"aria-live": "polite"})],
        className="question-block",
    )


def kernel_table(matrix: list[list[float]]) -> html.Table:
    """Render the 3×3 kernel as a numeric table."""

    body = [html.Tr([html.Td(f"{value:g}") for value in row]) for row in matrix]
    return html.Table([html.Tbody(body)], className="adj-matrix", **{"aria-label": "3 by 3 convolution kernel"})


initial = default_state()

explore_layout = html.Div(
    [
        html.Section(
            [html.P("CURRENT IMAGE", className="status-label"), html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"})],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["convolution"]["objective"], className="objective"), html.H2(SECTIONS["convolution"]["title"]), html.P(SECTIONS["convolution"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Kernel", className="control-label"),
                        dcc.RadioItems(
                            id="kernel-control",
                            className="graph-kind-options",
                            options=[{"label": spec["label"], "value": key} for key, spec in KERNELS.items()],
                            value=initial["kernel"],
                        ),
                        html.Div(id="kernel-matrix"),
                    ],
                    className="control-panel",
                ),
                html.Div(
                    [
                        html.Div([dcc.Graph(id="source-graph", figure=source_figure(initial), config={"displaylogo": False}), dcc.Graph(id="filtered-graph", figure=filtered_figure(initial), config={"displaylogo": False})], className="figure-pair"),
                    ],
                    className="figure-column",
                ),
                html.P(id="conv-explanation", className="state-explanation"),
                html.P(id="conv-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.Div([html.P(SECTIONS["components"]["objective"], className="objective"), html.H2(SECTIONS["components"]["title"]), html.P(SECTIONS["components"]["instructions"], className="instructions")], className="section-heading"),
                html.Div(
                    [
                        html.Label("Connectivity", className="control-label"),
                        dcc.RadioItems(
                            id="connectivity-control",
                            className="graph-kind-options",
                            options=[{"label": "4-connected", "value": 4}, {"label": "8-connected", "value": 8}],
                            value=initial["connectivity"],
                        ),
                    ],
                    className="control-panel",
                ),
                html.Div([dcc.Graph(id="label-graph", figure=labels_figure(initial), config={"displaylogo": False}), html.Div(id="comp-stats", className="stat-pills")], className="figure-column"),
                html.P(id="comp-explanation", className="state-explanation"),
                html.P(id="comp-takeaway", className="takeaway"),
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
                html.H2("Kernels and connectivity"),
                html.P(PRACTICE_INTRO),
                html.Div([html.Div(id="practice-state-summary", className="frozen-state"), button("Use current Explore settings", "refresh-practice-button", "secondary")], className="practice-snapshot-row"),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "What does a convolution kernel do at each pixel?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {"label": "It replaces the pixel by a weighted sum of its neighborhood.", "value": "neighborhood"},
                            {"label": "It sorts all pixel intensities globally, like a histogram stretch.", "value": "histogram"},
                            {"label": "It assigns a random color from a palette.", "value": "palette"},
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "Why can 4-connectivity and 8-connectivity disagree on this teaching image?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {"label": "The two bright squares touch only at a corner, which 8-connectivity treats as adjacent.", "value": "diagonal"},
                            {"label": "8-connectivity thresholds the image at a different intensity.", "value": "threshold"},
                            {"label": "4-connectivity ignores the right-hand plate entirely.", "value": "plate"},
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(3, html.Span(id="state-question-kernel"), dcc.Input(id="q3-answer", type="number", debounce=True, className="number-input"), "q3-feedback"),
                question_block(4, html.Span(id="state-question-count"), dcc.Input(id="q4-answer", type="number", debounce=True, className="number-input"), "q4-feedback"),
                html.Div([button("Submit answers", "submit-practice-button"), button("Reset answers", "reset-practice-button", "outline")], className="practice-actions"),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Image Processing Lab · ISC 4221C", suppress_callback_exceptions=True)
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 4", className="eyebrow"),
                html.H1("Image Processing Lab"),
                html.P("Convolve a 32×32 teaching image, then count connected components under 4- versus 8-connectivity.", className="subtitle"),
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
        html.Footer("Synthetic teaching image. No uploads; convolution is a 3×3 neighborhood model.", className="app-footer"),
    ],
    className="app-shell",
)


@app.callback(Output("explore-store", "data"), Input("kernel-control", "value"), Input("connectivity-control", "value"))
def update_explore_state(kernel: str, connectivity: int) -> dict[str, Any]:
    """Keep kernel and connectivity in one store."""

    return normalize_state({"kernel": kernel, "connectivity": connectivity})


@app.callback(
    Output("parameter-summary", "children"),
    Output("source-graph", "figure"),
    Output("filtered-graph", "figure"),
    Output("kernel-matrix", "children"),
    Output("conv-explanation", "children"),
    Output("conv-takeaway", "children"),
    Output("label-graph", "figure"),
    Output("comp-stats", "children"),
    Output("comp-explanation", "children"),
    Output("comp-takeaway", "children"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render convolution and component views."""

    state = normalize_state(state)
    conv = convolution_query(state)
    comp = component_query(state)
    summary = [html.Strong(conv["label"]), html.Span(f"{comp['connectivity']}-connected"), html.Span(f"{comp['count']} components")]
    expl = f"Mean intensity went from {conv['source_mean']:.1f} to {conv['filtered_mean']:.1f}."
    comp_expl = f"Foreground pixels: {comp['foreground']}. Labels 1…{comp['count']}."
    return (
        summary,
        source_figure(state),
        filtered_figure(state),
        kernel_table(conv["matrix"]),
        expl,
        convolution_takeaway(state),
        labels_figure(state),
        [html.Span(["components ", html.B(str(comp["count"]))]), html.Span(["foreground ", html.B(str(comp["foreground"]))])],
        comp_expl,
        component_takeaway(state),
    )


@app.callback(Output("practice-store", "data"), Input("refresh-practice-button", "n_clicks"), State("explore-store", "data"), prevent_initial_call=True)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current kernel and connectivity."""

    del clicks
    return normalize_state(state)


@app.callback(Output("practice-state-summary", "children"), Output("state-question-kernel", "children"), Output("state-question-count", "children"), Input("practice-store", "data"))
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen image settings."""

    state = normalize_state(state)
    conv = convolution_query(state)
    comp = component_query(state)
    summary = [html.Strong("Frozen Explore settings"), html.Span(conv["label"]), html.Span(f"{comp['connectivity']}-connected, {comp['count']} components")]
    return summary, kernel_prompt(state), count_prompt(state)


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
def score_answers(clicks: int, t1: str | None, t2: str | None, center: float | None, count: float | None, state: dict[str, Any]) -> tuple[Any, ...]:
    """Score concept and frozen-image responses."""

    del clicks
    result = score_practice(t1, t2, center, count, state)
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
    app.run(host="127.0.0.1", port=int(os.environ.get("IMAGE_DASHBOARD_PORT", "8058")), debug=False)
