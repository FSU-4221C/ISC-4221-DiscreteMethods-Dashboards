"""Interactive algorithm-order lab for ISC 4221C Module 1.

Run from this folder with the course uv environment:

    python app.py

Then open http://127.0.0.1:8052.
"""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, ctx, dcc, html, no_update

from complexity_model import (
    add_custom_order,
    apply_explore_controls,
    catalog_orders,
    clear_custom_orders,
    cost_snapshot,
    default_state,
    format_cost,
    format_duration,
    growth_takeaway,
    normalize_state,
    snapshot_takeaway,
)
from figures import coverage_figure, growth_figure, snapshot_figure
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS, SNIPPET_STRATEGY, SOURCES
from practice_model import (
    DEFAULT_CONFIG,
    available_questions,
    build_session,
    clear_current_answer,
    current_question,
    move,
    normalize_config,
    progress,
    review_missed,
    score_warm_up,
    state_question_prompt,
    submit_answer,
)
from question_bank import KIND_LABELS, KINDS, TOPICS


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    """Build a consistently styled action button."""

    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def code_listing(source: str) -> html.Ol:
    """Render a snippet with line numbers and no learner-code execution."""

    return html.Ol(
        [html.Li(html.Code(line if line else "\u00a0")) for line in source.splitlines()],
        className="code-listing",
        **{"aria-label": "Code snippet with line numbers"},
    )


def order_options(state: dict[str, Any]) -> list[dict[str, str]]:
    """Build checklist options from presets plus any custom orders."""

    options = []
    for order in catalog_orders(state):
        options.append({"label": f"{order['label']}  ·  {order['expression']}", "value": order["key"]})
    return options


def cost_table(state: dict[str, Any]) -> html.Table:
    """Show operation counts, ratios, and the 1 ns duration metaphor."""

    snapshot = cost_snapshot(state)
    cheapest = snapshot["cheapest"]
    rows = [
        html.Thead(
            html.Tr(
                [
                    html.Th("Order"),
                    html.Th("Expression"),
                    html.Th("Operations"),
                    html.Th("vs cheapest"),
                    html.Th("If 1 ns / op"),
                ]
            )
        )
    ]
    body_rows = []
    for item in snapshot["ranked"]:
        if not item["defined"]:
            body_rows.append(
                html.Tr(
                    [
                        html.Td(item["label"]),
                        html.Td(html.Code(item["expression"])),
                        html.Td(item["error"], colSpan=3),
                    ]
                )
            )
            continue
        if cheapest is not None:
            relative = 10 ** (item["log10"] - cheapest["log10"])
            relative_text = "1×" if item["key"] == cheapest["key"] else f"{format_cost(relative)}×"
        else:
            relative_text = "—"
        body_rows.append(
            html.Tr(
                [
                    html.Td(item["label"]),
                    html.Td(html.Code(item["expression"])),
                    html.Td(format_cost(item["cost"])),
                    html.Td(relative_text),
                    html.Td(format_duration(item["cost"])),
                ]
            )
        )
    rows.append(html.Tbody(body_rows or [html.Tr(html.Td("Select at least one order.", colSpan=5))]))
    return html.Table(rows, className="cost-table", **{"aria-label": "Operation counts at the current n"})


def question_block(number: int, legend: Any, control: Any, feedback_id: str) -> html.Fieldset:
    """Build one warm-up question with live feedback region."""

    return html.Fieldset(
        [
            html.Legend([html.Span(str(number), className="question-number"), legend]),
            control,
            html.Div(id=feedback_id, className="feedback", **{"aria-live": "polite"}),
        ],
        className="question-block",
    )


initial_explore = default_state()
initial_config = normalize_config(DEFAULT_CONFIG)
initial_session = build_session(initial_config, seed=1)

topic_options = [{"label": topic, "value": topic} for topic in TOPICS]
kind_options = [{"label": KIND_LABELS[kind], "value": kind} for kind in KINDS]

explore_layout = html.Div(
    [
        html.Section(
            [
                html.P("CURRENT COMPARISON", className="status-label"),
                html.Div(id="parameter-summary", className="state-summary", **{"aria-live": "polite"}),
                html.P(id="custom-status", className="custom-status", role="status"),
            ],
            className="comparison-status",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["growth"]["objective"], className="objective"),
                        html.H2(SECTIONS["growth"]["title"]),
                        html.P(SECTIONS["growth"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Label("Orders to plot", className="control-label", htmlFor="order-filter"),
                        dcc.Checklist(
                            id="order-filter",
                            options=order_options(initial_explore),
                            value=initial_explore["selected"],
                            className="order-options",
                        ),
                        html.Label("Add a custom order in n", className="control-label", htmlFor="custom-expression"),
                        dcc.Input(
                            id="custom-expression",
                            type="text",
                            placeholder="Examples: n**4, 1/log(n), n*log(n)**2",
                            debounce=False,
                            n_submit=0,
                            className="text-input",
                        ),
                        html.Div(
                            [
                                button("Add custom order", "add-custom-button"),
                                button("Clear custom orders", "clear-custom-button", "outline"),
                            ],
                            className="button-row",
                        ),
                        html.Label("Input size n", className="control-label", htmlFor="n-log-control"),
                        dcc.Slider(
                            id="n-log-control",
                            min=1,
                            max=6,
                            step=0.05,
                            value=initial_explore["n_log10"],
                            marks={1: "10", 2: "100", 3: "1,000", 4: "10⁴", 5: "10⁵", 6: "10⁶"},
                        ),
                        html.Label("Vertical axis", className="control-label"),
                        dcc.RadioItems(
                            id="y-scale-control",
                            options=[
                                {"label": "Logarithmic (compare classes)", "value": "log"},
                                {"label": "Linear (see who dominates)", "value": "linear"},
                            ],
                            value=initial_explore["y_scale"],
                            className="scale-options",
                        ),
                    ],
                    className="control-panel",
                    role="group",
                    **{"aria-label": "Controls for growth comparison"},
                ),
                dcc.Graph(id="growth-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
                html.P(id="growth-explanation", className="state-explanation", **{"aria-live": "polite"}),
                html.P(id="growth-takeaway", className="takeaway"),
            ],
            className="learning-card",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(SECTIONS["snapshot"]["objective"], className="objective"),
                        html.H2(SECTIONS["snapshot"]["title"]),
                        html.P(SECTIONS["snapshot"]["instructions"], className="instructions"),
                    ],
                    className="section-heading",
                ),
                dcc.Graph(id="snapshot-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
                html.Div(id="cost-table-container", className="table-scroll"),
                html.P(id="snapshot-takeaway", className="takeaway"),
            ],
            className="learning-card snapshot-card",
        ),
        html.Section(
            [
                html.H3("What this model is"),
                html.P(
                    "Each curve is the named expression evaluated at integer n, with log(n) = log₂(n). "
                    "It is a teaching model of operation counts, not a measured runtime. "
                    "1 / log n is included so you can see a decreasing comparison curve; algorithm costs do not go to zero."
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
                html.H2("Reason from growth, then classify snippets"),
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
                    "Two loops of length n run one after another. What is the tightest class?",
                    dcc.RadioItems(
                        id="q1-answer",
                        options=[
                            {"label": "O(n), because sequential loops add", "value": "add"},
                            {"label": "O(n²), because there are two loops", "value": "multiply"},
                            {"label": "O(2n²), which is a different class from O(n²)", "value": "twon"},
                        ],
                        className="answer-options",
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "for i in range(n): for j in range(i): … runs n(n − 1)/2 times. The class is:",
                    dcc.RadioItems(
                        id="q2-answer",
                        options=[
                            {"label": "O(n), because the inner loop is shorter than n", "value": "linear"},
                            {"label": "O(n²), because a triangular count is still quadratic", "value": "quadratic"},
                            {"label": "O(n!), because i and j permute", "value": "factorial"},
                        ],
                        className="answer-options",
                    ),
                    "q2-feedback",
                ),
                question_block(
                    3,
                    html.Span(id="state-question"),
                    dcc.Input(
                        id="q3-answer",
                        type="number",
                        step="any",
                        placeholder="Enter a numeric ratio",
                        className="number-input",
                    ),
                    "q3-feedback",
                ),
                html.Div(
                    [button("Submit these three", "submit-warmup-button"), button("Reset these three", "reset-warmup-button", "outline")],
                    className="practice-actions",
                ),
                html.Div(id="warmup-summary", className="practice-summary", role="status", **{"aria-live": "assertive", "tabIndex": -1}),
            ],
            className="practice-card",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P("OBJECTIVE: BUILD A SNIPPET SET THAT TARGETS THE ORDERS YOU WANT TO PRACTICE.", className="objective"),
                        html.H2("50-snippet order bank"),
                        html.P(
                            "Choose order families, difficulty, and session length. Changing these filters does not "
                            "invalidate an in-progress session until you rebuild it.",
                            className="instructions",
                        ),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Fieldset(
                            [
                                html.Legend("Order families"),
                                dcc.Checklist(id="topic-filter", options=topic_options, value=list(TOPICS), className="filter-options"),
                            ],
                            className="filter-group topics",
                        ),
                        html.Fieldset(
                            [
                                html.Legend("Difficulty"),
                                dcc.Checklist(
                                    id="difficulty-filter",
                                    options=[
                                        {"label": "Beginner", "value": "beginner"},
                                        {"label": "Intermediate", "value": "intermediate"},
                                    ],
                                    value=["beginner", "intermediate"],
                                    className="filter-options compact",
                                ),
                            ],
                            className="filter-group",
                        ),
                        html.Div(
                            [
                                html.Label("Snippets per session", htmlFor="count-filter", className="control-label"),
                                dcc.Slider(
                                    id="count-filter",
                                    min=5,
                                    max=50,
                                    step=5,
                                    value=10,
                                    marks={5: "5", 10: "10", 20: "20", 35: "35", 50: "50"},
                                ),
                            ],
                            className="length-control",
                        ),
                    ],
                    className="configuration-panel",
                ),
                html.Div(
                    [
                        html.Div(id="coverage-summary", className="coverage-summary", **{"aria-live": "polite"}),
                        dcc.Graph(id="coverage-graph", config={"displaylogo": False, "responsive": True}, className="coverage-graph"),
                    ],
                    className="coverage-panel",
                ),
            ],
            className="learning-card snippet-config",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P("ACTIVE SESSION", className="status-label"),
                        html.Div(id="progress-chips", className="progress-chips"),
                        html.Progress(id="session-progress", value=0, max=1, className="session-progress"),
                    ]
                ),
                html.Div(
                    [
                        button("Build session from filters", "new-session-button"),
                        button("Review missed", "review-missed-button", "secondary"),
                    ],
                    className="session-actions",
                ),
                html.P(id="session-message", className="session-message", role="status", **{"aria-live": "polite"}),
            ],
            className="session-status",
        ),
        html.Section(
            [
                html.Div(
                    [
                        html.P(id="question-position", className="question-position"),
                        html.Div(id="question-badges", className="question-badges"),
                    ],
                    className="question-meta",
                ),
                html.H2(id="question-prompt", className="question-prompt"),
                html.Div(id="code-container", className="code-panel"),
                html.Fieldset(
                    [
                        html.Legend("Choose the tightest standard order"),
                        dcc.RadioItems(id="answer-control", options=[], value=None, className="answer-options grid-answers"),
                    ],
                    className="answer-fieldset",
                ),
                html.Div(id="answer-feedback", className="feedback", **{"aria-live": "polite"}),
                html.Div(
                    [
                        button("Previous", "previous-button", "outline"),
                        button("Submit answer", "submit-button"),
                        button("Clear current", "clear-button", "secondary"),
                        button("Next", "next-button", "outline"),
                    ],
                    className="question-actions",
                ),
            ],
            id="question-card",
            className="question-card",
        ),
        html.Section(
            [
                html.H3("How to classify a snippet"),
                html.Dl([item for pair in SNIPPET_STRATEGY for item in (html.Dt(pair[0]), html.Dd(pair[1]))]),
            ],
            className="strategy-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Algorithm Orders · ISC 4221C", update_title="Updating orders…")
server = app.server
app.layout = html.Div(
    [
        dcc.Store(id="explore-store", data=initial_explore),
        dcc.Store(id="practice-store", data=initial_explore),
        dcc.Store(id="config-store", data=initial_config),
        dcc.Store(id="session-store", data=initial_session),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 1", className="eyebrow"),
                html.H1("Algorithm Orders Lab"),
                html.P(
                    "Compare how complexity classes grow with n, then classify fifty short programs by their tightest standard order.",
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
            "Teaching model of operation counts. Custom expressions are parsed with a restricted math language; learner code is never executed.",
            className="app-footer",
        ),
    ],
    className="app-shell",
)


@app.callback(
    Output("explore-store", "data"),
    Output("order-filter", "options"),
    Output("order-filter", "value"),
    Output("custom-expression", "value"),
    Input("order-filter", "value"),
    Input("n-log-control", "value"),
    Input("y-scale-control", "value"),
    Input("add-custom-button", "n_clicks"),
    Input("clear-custom-button", "n_clicks"),
    Input("custom-expression", "n_submit"),
    State("custom-expression", "value"),
    State("explore-store", "data"),
)
def update_explore_state(
    selected: list[str] | None,
    n_log10: float,
    y_scale: str,
    add_clicks: int,
    clear_clicks: int,
    n_submit: int,
    expression: str | None,
    store: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, str]], list[str], str]:
    """Keep Explore controls, custom orders, and n in one canonical store."""

    del add_clicks, clear_clicks, n_submit
    current = normalize_state(store)
    trigger = ctx.triggered_id
    if trigger in {"add-custom-button", "custom-expression"}:
        current = add_custom_order(current, expression or "")
        cleared = "" if not current["custom_error"] else (expression or "")
        return current, order_options(current), current["selected"], cleared
    if trigger == "clear-custom-button":
        current = clear_custom_orders(current)
        return current, order_options(current), current["selected"], ""
    current = apply_explore_controls(selected, n_log10, y_scale, current["custom"], current.get("custom_error", ""))
    return current, order_options(current), current["selected"], no_update


@app.callback(
    Output("parameter-summary", "children"),
    Output("custom-status", "children"),
    Output("growth-graph", "figure"),
    Output("snapshot-graph", "figure"),
    Output("cost-table-container", "children"),
    Output("growth-explanation", "children"),
    Output("growth-takeaway", "children"),
    Output("snapshot-takeaway", "children"),
    Input("explore-store", "data"),
)
def render_explore(state: dict[str, Any]) -> tuple[Any, ...]:
    """Render every Explore view from the same normalized state."""

    state = normalize_state(state)
    n_value = state["n"]
    scale_label = "logarithmic" if state["y_scale"] == "log" else "linear"
    summary = [
        html.Strong(f"n = {n_value:,}"),
        html.Span(f"Vertical axis: {scale_label}"),
        html.Span(f"{len(state['selected'])} order(s) selected"),
        html.Span(f"{len(state['custom'])} custom order(s)"),
    ]
    error = state.get("custom_error") or ""
    snapshot = cost_snapshot(state)
    if snapshot["costliest"] is not None and snapshot["cheapest"] is not None:
        explanation = (
            f"At n = {n_value:,}, {snapshot['costliest']['label']} sits at the top of the selected list "
            f"and {snapshot['cheapest']['label']} at the bottom. "
            "Switch to a linear axis if you want to see the fastest curve swallow the rest."
        )
    else:
        explanation = "Select two or more orders to compare growth."
    return (
        summary,
        error,
        growth_figure(state),
        snapshot_figure(state),
        cost_table(state),
        explanation,
        growth_takeaway(state),
        snapshot_takeaway(state),
    )


@app.callback(
    Output("practice-store", "data"),
    Input("refresh-practice-button", "n_clicks"),
    State("explore-store", "data"),
    prevent_initial_call=True,
)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    """Freeze the current Explore settings for the dashboard question."""

    del clicks
    return normalize_state(state)


@app.callback(
    Output("practice-state-summary", "children"),
    Output("state-question", "children"),
    Input("practice-store", "data"),
)
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str]:
    """Describe the frozen Explore snapshot used by question 3."""

    state = normalize_state(state)
    labels = [order["label"] for order in catalog_orders(state) if order["key"] in state["selected"]]
    summary = [
        html.Strong("Frozen Explore settings"),
        html.Span(f"n = {state['n']:,}"),
        html.Span(f"Axis: {state['y_scale']}"),
        html.Span(", ".join(labels) if labels else "no orders selected"),
    ]
    return summary, state_question_prompt(state)


@app.callback(
    Output("q1-feedback", "children"),
    Output("q1-feedback", "className"),
    Output("q2-feedback", "children"),
    Output("q2-feedback", "className"),
    Output("q3-feedback", "children"),
    Output("q3-feedback", "className"),
    Output("warmup-summary", "children"),
    Input("submit-warmup-button", "n_clicks"),
    State("q1-answer", "value"),
    State("q2-answer", "value"),
    State("q3-answer", "value"),
    State("practice-store", "data"),
    prevent_initial_call=True,
)
def score_warmup(
    clicks: int,
    theory1: str | None,
    theory2: str | None,
    state_answer: float | None,
    explore_state: dict[str, Any],
) -> tuple[Any, ...]:
    """Score theoretical and state-dependent warm-up answers together."""

    del clicks
    result = score_warm_up(theory1, theory2, state_answer, explore_state)
    return (
        result["q1"]["text"],
        f"feedback {result['q1']['status']}",
        result["q2"]["text"],
        f"feedback {result['q2']['status']}",
        result["q3"]["text"],
        f"feedback {result['q3']['status']}",
        result["summary"],
    )


@app.callback(
    Output("q1-answer", "value"),
    Output("q2-answer", "value"),
    Output("q3-answer", "value"),
    Output("q1-feedback", "children", allow_duplicate=True),
    Output("q2-feedback", "children", allow_duplicate=True),
    Output("q3-feedback", "children", allow_duplicate=True),
    Output("warmup-summary", "children", allow_duplicate=True),
    Input("reset-warmup-button", "n_clicks"),
    prevent_initial_call=True,
)
def reset_warmup(clicks: int) -> tuple[Any, ...]:
    """Clear the three warm-up answers without changing Explore or the snippet session."""

    if not clicks:
        return no_update, no_update, no_update, no_update, no_update, no_update, no_update
    return None, None, None, "", "", "", "Warm-up reset. Explore settings and the snippet session were preserved."


@app.callback(
    Output("config-store", "data"),
    Input("topic-filter", "value"),
    Input("difficulty-filter", "value"),
    Input("count-filter", "value"),
)
def update_config(topics: list[str], difficulties: list[str], count: int) -> dict[str, Any]:
    """Normalize snippet-bank filters independently of Explore."""

    return normalize_config({"topics": topics, "difficulties": difficulties, "kinds": list(KINDS), "count": count})


@app.callback(
    Output("coverage-summary", "children"),
    Output("coverage-graph", "figure"),
    Input("config-store", "data"),
)
def render_configuration(config: dict[str, Any]) -> tuple[Any, Any]:
    """Show how many of the 50 snippets match the current filters."""

    matching = len(available_questions(config))
    requested = config["count"]
    if matching == 0:
        message = "No snippets match. Select at least one order family and difficulty."
        state_class = "coverage-count empty"
    elif matching < requested:
        message = f"{matching} matching snippets · the next session will use all {matching}."
        state_class = "coverage-count warning"
    else:
        message = f"{matching} matching snippets · {requested} will be sampled for the next session."
        state_class = "coverage-count ready"
    summary = [
        html.Strong(message, className=state_class),
        html.Span("The current snippet session is unchanged until you rebuild it."),
    ]
    return summary, coverage_figure(config)


@app.callback(
    Output("session-store", "data"),
    Input("new-session-button", "n_clicks"),
    Input("review-missed-button", "n_clicks"),
    Input("previous-button", "n_clicks"),
    Input("next-button", "n_clicks"),
    Input("submit-button", "n_clicks"),
    Input("clear-button", "n_clicks"),
    State("config-store", "data"),
    State("session-store", "data"),
    State("answer-control", "value"),
    prevent_initial_call=True,
)
def update_session(*args: Any) -> dict[str, Any]:
    """Apply one snippet-session action from the Practice controls."""

    config, session, answer = args[-3:]
    trigger = ctx.triggered_id
    if trigger == "new-session-button":
        return build_session(config, seed=int(session.get("seed", 1)) + 1)
    if trigger == "review-missed-button":
        return review_missed(session)
    if trigger == "previous-button":
        return move(session, -1)
    if trigger == "next-button":
        return move(session, 1)
    if trigger == "submit-button":
        return submit_answer(session, answer)
    if trigger == "clear-button":
        return clear_current_answer(session)
    return no_update


@app.callback(
    Output("progress-chips", "children"),
    Output("session-progress", "value"),
    Output("session-progress", "max"),
    Output("session-message", "children"),
    Output("question-position", "children"),
    Output("question-badges", "children"),
    Output("question-prompt", "children"),
    Output("code-container", "children"),
    Output("answer-control", "options"),
    Output("answer-control", "value"),
    Output("answer-feedback", "children"),
    Output("answer-feedback", "className"),
    Output("previous-button", "disabled"),
    Output("next-button", "disabled"),
    Output("submit-button", "disabled"),
    Output("clear-button", "disabled"),
    Input("session-store", "data"),
)
def render_session(session: dict[str, Any]) -> tuple[Any, ...]:
    """Render the current snippet, saved answer, and feedback from session state."""

    stats = progress(session)
    total = stats["total"]
    chips = [
        html.Span(f"{stats['answered']} answered", className="progress-chip"),
        html.Span(f"{stats['correct']} correct", className="progress-chip correct-chip"),
        html.Span(f"{stats['remaining']} remaining", className="progress-chip"),
        html.Span(session.get("mode", "mixed"), className="progress-chip mode-chip"),
    ]
    question = current_question(session)
    if question is None:
        return (
            chips,
            0,
            1,
            session["message"],
            "No active question",
            [],
            "Broaden the order-family filters, then build a new session.",
            html.Div("No code snippet is available.", className="empty-code"),
            [],
            None,
            "",
            "feedback",
            True,
            True,
            True,
            True,
        )

    index = int(session["index"])
    question_id = question["id"]
    saved_answer = session.get("answers", {}).get(question_id)
    correctness = session.get("correct", {}).get(question_id)
    attempts = int(session.get("attempts", {}).get(question_id, 0))
    badges = [
        html.Span(question["topic"], className="question-badge topic"),
        html.Span(question["difficulty"], className="question-badge difficulty"),
        html.Span(KIND_LABELS[question["kind"]], className="question-badge kind"),
    ]
    options = [{"label": option, "value": option_index} for option_index, option in enumerate(question["options"])]

    if correctness is True:
        feedback = [html.Strong("Correct. "), question["explanation"], html.Span(f" Attempts: {attempts}.")]
        feedback_class = "feedback correct"
    elif correctness is False:
        correct_text = question["options"][question["correct"]]
        feedback = [
            html.Strong("Needs revision. "),
            question["explanation"],
            html.Span([" Tightest listed class: ", html.Code(correct_text), ". Change your choice and submit again."]),
        ]
        feedback_class = "feedback incorrect"
    elif session.get("message") == "Choose one option before submitting.":
        feedback = "Incomplete. Choose an order, then submit again."
        feedback_class = "feedback incomplete"
    else:
        feedback = ""
        feedback_class = "feedback"

    return (
        chips,
        stats["answered"],
        max(1, total),
        session["message"],
        f"Question {index + 1} of {total} · {question_id}",
        badges,
        question["prompt"],
        code_listing(question["code"]),
        options,
        saved_answer,
        feedback,
        feedback_class,
        index == 0,
        index >= total - 1,
        False,
        False,
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("ALGORITHM_ORDERS_PORT", "8052")), debug=False)
