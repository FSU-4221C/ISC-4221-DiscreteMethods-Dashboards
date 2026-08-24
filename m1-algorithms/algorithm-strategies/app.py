"""Algorithm strategies lab for ISC 4221C Module 1.

Run:

    python app.py

Then open http://127.0.0.1:8055.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, dcc, html, no_update

from figures import coins_figure, search_figure
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SOURCES
from practice_model import binary_steps_prompt, optimal_coins_prompt, score_practice
from strategy_model import (
    COIN_SYSTEMS,
    coin_query,
    coin_takeaway,
    default_state,
    normalize_state,
    search_query,
    search_takeaway,
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


initial = default_state()

explore_layout = html.Div(
    [
        html.Section(
            [
                html.P("CURRENT SETTINGS", className="status-label"),
                html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"}),
            ],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["search"]["objective"], className="objective"),
                        html.H2(SECTIONS["search"]["title"]),
                        html.P(SECTIONS["search"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Label("Array length n", htmlFor="n-control", className="control-label"),
                        dcc.Slider(id="n-control", min=4, max=64, step=1, value=initial["n"], marks={4: "4", 16: "16", 32: "32", 64: "64"}),
                        html.Label("Target key", htmlFor="target-control", className="control-label"),
                        dcc.Slider(id="target-control", min=1, max=initial["n"], step=1, value=initial["target"], marks={1: "1", 8: "8", 16: "16"}),
                    ],
                    className="control-panel",
                ),
                html.Div(
                    [
                        dcc.Graph(id="search-graph", figure=search_figure(initial), config={"displaylogo": False}, className="dashboard-graph"),
                        html.Div(id="search-stats", className="stat-pills"),
                    ],
                    className="figure-column",
                ),
                html.P(id="search-explanation", className="state-explanation"),
                html.P(id="search-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["coins"]["objective"], className="objective"),
                        html.H2(SECTIONS["coins"]["title"]),
                        html.P(SECTIONS["coins"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Label("Coin system", className="control-label"),
                        dcc.RadioItems(
                            id="coin-system",
                            className="graph-kind-options",
                            options=[{"label": spec["label"], "value": key} for key, spec in COIN_SYSTEMS.items()],
                            value=initial["coin_system"],
                        ),
                        html.Label("Amount", htmlFor="amount-control", className="control-label"),
                        dcc.Slider(id="amount-control", min=1, max=40, step=1, value=initial["amount"], marks={1: "1", 6: "6", 20: "20", 40: "40"}),
                    ],
                    className="control-panel",
                ),
                html.Div(
                    [
                        dcc.Graph(id="coins-graph", figure=coins_figure(initial), config={"displaylogo": False}, className="dashboard-graph"),
                        html.Div(id="coin-stats", className="stat-pills"),
                    ],
                    className="figure-column",
                ),
                html.P(id="coin-explanation", className="state-explanation"),
                html.P(id="coin-takeaway", className="takeaway"),
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
                html.H2("Search counts and coin totals"),
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
                    "Why may we use binary search on the array in Explore?",
                    dcc.RadioItems(
                        id="q1-answer",
                        className="answer-options",
                        options=[
                            {"label": "Because the keys are already sorted, so each midpoint discards a whole half-interval.", "value": "sorted"},
                            {"label": "Because binary search always examines every key, just in a different order.", "value": "all"},
                            {"label": "Because n is a power of two, which is required for binary search.", "value": "power"},
                        ],
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "When is taking the largest feasible coin guaranteed to give the fewest coins?",
                    dcc.RadioItems(
                        id="q2-answer",
                        className="answer-options",
                        options=[
                            {"label": "Always, for every set of coin denominations.", "value": "always"},
                            {"label": "For some canonical systems (including US coins), but not for {4, 3, 1}.", "value": "counterexample"},
                            {"label": "Never: dynamic programming is the only correct method.", "value": "never"},
                        ],
                    ),
                    "q2-feedback",
                ),
                question_block(3, html.Span(id="state-question-binary"), dcc.Input(id="q3-answer", type="number", debounce=True, className="number-input"), "q3-feedback"),
                question_block(4, html.Span(id="state-question-coins"), dcc.Input(id="q4-answer", type="number", debounce=True, className="number-input"), "q4-feedback"),
                html.Div([button("Submit answers", "submit-practice-button"), button("Reset answers", "reset-practice-button", "outline")], className="practice-actions"),
                html.Div(id="practice-summary", className="practice-summary", **{"aria-live": "polite"}),
            ],
            className="practice-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Algorithm Strategies Lab · ISC 4221C", suppress_callback_exceptions=True)
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 1", className="eyebrow"),
                html.H1("Algorithm Strategies Lab"),
                html.P(
                    "Compare sequential search with binary search, then test when a greedy coin changer matches the fewest-coin solution.",
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
                    dcc.Tab(label="Explore", value="explore", children=explore_layout, className="top-tab", selected_className="top-tab selected"),
                    dcc.Tab(label="Practice", value="practice", children=practice_layout, className="top-tab", selected_className="top-tab selected"),
                ],
                className="top-tabs",
            )
        ),
        html.Footer("Teaching models of searching and change-making. Arrays are the sorted keys 1…n; no learner code is executed.", className="app-footer"),
    ],
    className="app-shell",
)


@app.callback(
    Output("explore-store", "data"),
    Input("n-control", "value"),
    Input("target-control", "value"),
    Input("coin-system", "value"),
    Input("amount-control", "value"),
)
def update_explore_state(n_value: int, target: int, system: str, amount: int) -> dict[str, Any]:
    """Keep search and coin controls in one canonical store."""

    return normalize_state({"n": n_value, "target": target, "coin_system": system, "amount": amount})


@app.callback(
    Output("parameter-summary", "children"),
    Output("search-graph", "figure"),
    Output("search-stats", "children"),
    Output("search-explanation", "children"),
    Output("search-takeaway", "children"),
    Output("coins-graph", "figure"),
    Output("coin-stats", "children"),
    Output("coin-explanation", "children"),
    Output("coin-takeaway", "children"),
    Output("target-control", "max"),
    Output("target-control", "value"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render both strategy sections from the frozen-friendly store."""

    state = normalize_state(state)
    search = search_query(state)
    coins = coin_query(state)
    summary = [
        html.Strong(f"n = {search['n']}"),
        html.Span(f"target {search['target']}"),
        html.Strong(coins["label"]),
        html.Span(f"amount {coins['amount']}"),
    ]
    search_stats = [
        html.Span(["sequential probes ", html.B(str(search["sequential"]["comparisons"]))]),
        html.Span(["binary midpoints ", html.B(str(search["binary"]["comparisons"]))]),
    ]
    coin_stats = [
        html.Span(["greedy ", html.B(str(coins["greedy_count"]))]),
        html.Span(["fewest ", html.B(str(coins["optimal_count"]))]),
        html.Span("greedy matches optimum" if coins["greedy_count"] == coins["optimal_count"] else "greedy is not optimal"),
    ]
    search_expl = (
        f"Sequential inspected indices {search['sequential']['inspected']}. "
        f"Binary inspected midpoints {search['binary']['inspected']}."
    )
    coin_expl = f"Greedy combination {coins['greedy']}. Fewest-coin combination {coins['optimal']}."
    return (
        summary,
        search_figure(state),
        search_stats,
        search_expl,
        search_takeaway(state),
        coins_figure(state),
        coin_stats,
        coin_expl,
        coin_takeaway(state),
        state["n"],
        state["target"],
    )


@app.callback(Output("practice-store", "data"), Input("refresh-practice-button", "n_clicks"), State("explore-store", "data"), prevent_initial_call=True)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current Explore settings for dashboard questions."""

    del clicks
    return normalize_state(state)


@app.callback(
    Output("practice-state-summary", "children"),
    Output("state-question-binary", "children"),
    Output("state-question-coins", "children"),
    Input("practice-store", "data"),
)
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str, str]:
    """Describe the frozen search and coin settings."""

    state = normalize_state(state)
    search = search_query(state)
    coins = coin_query(state)
    summary = [
        html.Strong("Frozen Explore settings"),
        html.Span(f"n = {search['n']}, target {search['target']}"),
        html.Span(f"{coins['label']}, amount {coins['amount']}"),
    ]
    return summary, binary_steps_prompt(state), optimal_coins_prompt(state)


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
def score_answers(clicks: int, t1: str | None, t2: str | None, n3: float | None, n4: float | None, state: dict[str, Any]) -> tuple[Any, ...]:
    """Score concept and frozen-state responses."""

    del clicks
    result = score_practice(t1, t2, n3, n4, state)
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
    """Clear practice answers without changing Explore settings."""

    if not clicks:
        return (no_update,) * 9
    return None, None, None, None, "", "", "", "", "Practice reset. Frozen settings were preserved."


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("STRATEGY_DASHBOARD_PORT", "8055")), debug=False)
