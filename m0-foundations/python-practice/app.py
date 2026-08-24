"""Practice-first Python syntax dashboard for ISC 4221C."""

from __future__ import annotations

import os
from typing import Any

from dash import Dash, Input, Output, State, ctx, dcc, html, no_update

from figures import COVERAGE_GRAPH_HEIGHT, coverage_figure
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
    submit_answer,
)
from question_bank import KIND_LABELS, KINDS, TOPICS


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def filter_toggle(label: str, component_id: str) -> html.Button:
    """Create a compact select/deselect control for a filter group.

    Parameters
    ----------
    label : str
        Visible button text, such as ``Select all``.
    component_id : str
        Stable Dash component id used by the callback.

    Returns
    -------
    html.Button
        Keyboard-accessible control that does not submit a form.
    """
    return html.Button(label, id=component_id, n_clicks=0, type="button", className="filter-toggle")


def all_topics_selected(selected: list[str] | None) -> bool:
    """Return whether every topic in the bank is currently checked.

    Parameters
    ----------
    selected : list[str] | None
        Currently checked topic labels.

    Returns
    -------
    bool
        True when the selection contains every available topic.
    """
    return set(selected or []) >= set(TOPICS)


def code_listing(source: str) -> html.Ol:
    return html.Ol(
        [html.Li(html.Code(line if line else "\u00a0")) for line in source.splitlines()],
        className="code-listing",
        **{"aria-label": "Python code with line numbers"},
    )


initial_config = normalize_config(DEFAULT_CONFIG)
initial_session = build_session(initial_config, seed=1)

topic_options = [{"label": topic, "value": topic} for topic in TOPICS]
kind_options = [{"label": KIND_LABELS[kind], "value": kind} for kind in KINDS]

explore_layout = html.Div(
    [
        html.Section(
            [
                html.Div(
                    [
                        html.P("OBJECTIVE: BUILD A PRACTICE SET THAT TARGETS YOUR CURRENT GAPS.", className="objective"),
                        html.H2("Configure the 100-snippet bank"),
                        html.P(
                            "Choose topics, difficulty, question styles, and session length. "
                            "The coverage chart updates immediately; the active Practice session stays frozen until you explicitly rebuild it.",
                            className="instructions",
                        ),
                    ],
                    className="section-heading",
                ),
                html.Div(
                    [
                        html.Fieldset(
                            [
                                html.Legend("Topics"),
                                html.Div(
                                    [
                                        filter_toggle("Select all", "topic-select-all"),
                                        filter_toggle("Deselect all", "topic-deselect-all"),
                                    ],
                                    className="filter-toolbar",
                                    role="group",
                                    **{"aria-label": "Select or deselect all topics"},
                                ),
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
                        html.Fieldset(
                            [
                                html.Legend("Question styles"),
                                dcc.Checklist(id="kind-filter", options=kind_options, value=list(KINDS), className="filter-options compact"),
                            ],
                            className="filter-group",
                        ),
                        html.Div(
                            [
                                html.Label("Questions per session", htmlFor="count-filter", className="control-label"),
                                dcc.Slider(
                                    id="count-filter",
                                    min=5,
                                    max=20,
                                    step=5,
                                    value=10,
                                    marks={5: "5", 10: "10", 15: "15", 20: "20"},
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
                        dcc.Graph(
                            id="coverage-graph",
                            config={"displaylogo": False, "responsive": True},
                            className="coverage-graph",
                            style={"height": f"{COVERAGE_GRAPH_HEIGHT}px", "width": "100%"},
                        ),
                    ],
                    className="coverage-panel",
                ),
                html.P(
                    [
                        html.Strong("Takeaway: "),
                        "Short, mixed sessions are useful for fluency; topic-specific sessions are better when one misconception keeps recurring. "
                        "Changing these controls does not invalidate an in-progress session.",
                    ],
                    className="takeaway",
                ),
            ],
            className="learning-card",
        )
    ],
    className="explore-layout",
)

practice_layout = html.Div(
    [
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
                        button("Build session from Explore", "new-session-button"),
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
                        html.Legend("Choose one answer"),
                        dcc.RadioItems(id="answer-control", options=[], value=None, className="answer-options"),
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
                html.H3("How to use the question styles"),
                html.Dl(
                    [
                        html.Dt("Predict / trace"), html.Dd("Follow assignments in order and write down each name's value before choosing."),
                        html.Dt("Locate an error"), html.Dd("Separate parse-time syntax errors from exceptions that appear only when a line executes."),
                        html.Dt("Choose a fix"), html.Dd("Prefer the smallest change that restores the intended type, scope, or control flow."),
                        html.Dt("Explain behavior"), html.Dd("Identify the Python rule—mutability, truthiness, iteration, scope, or dispatch—that controls the outcome."),
                    ]
                ),
            ],
            className="strategy-card",
        ),
    ],
    className="practice-layout",
)

app = Dash(__name__, title="Python Syntax Practice · ISC 4221C", update_title="Loading Python practice…")
server = app.server
app.layout = html.Div(
    [
        dcc.Store(id="config-store", data=initial_config),
        dcc.Store(id="session-store", data=initial_session),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 0", className="eyebrow"),
                html.H1("Python Syntax Practice Lab"),
                html.P(
                    "Read short programs, predict behavior, diagnose errors, and build fluency across 100 multiple-choice code snippets.",
                    className="subtitle",
                ),
                html.Div(
                    [
                        html.Span("100 authored snippets"),
                        html.Span("10 Python topics"),
                        html.Span("6 question styles"),
                        html.Span("Retry + missed review"),
                    ],
                    className="header-stats",
                ),
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
            "All snippets are fixed course content. The dashboard does not execute learner-supplied Python code.",
            className="app-footer",
        ),
    ],
    className="app-shell",
)


@app.callback(
    Output("topic-filter", "value"),
    Input("topic-select-all", "n_clicks"),
    Input("topic-deselect-all", "n_clicks"),
    prevent_initial_call=True,
)
def set_all_topics(_select_clicks: int, _deselect_clicks: int) -> list[str]:
    """Select every topic, or clear the topic checklist.

    Parameters
    ----------
    _select_clicks : int
        Click count for the Select all control; used only as a trigger.
    _deselect_clicks : int
        Click count for the Deselect all control; used only as a trigger.

    Returns
    -------
    list[str]
        All topic labels after Select all, or an empty list after Deselect all.
    """
    if ctx.triggered_id == "topic-deselect-all":
        return []
    return list(TOPICS)


@app.callback(
    Output("topic-select-all", "disabled"),
    Output("topic-deselect-all", "disabled"),
    Input("topic-filter", "value"),
)
def update_topic_toggle_state(selected: list[str] | None) -> tuple[bool, bool]:
    """Disable the redundant select or deselect control for the current checklist.

    Parameters
    ----------
    selected : list[str] | None
        Currently checked topic labels.

    Returns
    -------
    tuple[bool, bool]
        Disabled flags for Select all and Deselect all, in that order.
    """
    chosen = set(selected or [])
    return all_topics_selected(selected), not chosen


@app.callback(
    Output("config-store", "data"),
    Input("topic-filter", "value"),
    Input("difficulty-filter", "value"),
    Input("kind-filter", "value"),
    Input("count-filter", "value"),
)
def update_config(topics: list[str], difficulties: list[str], kinds: list[str], count: int) -> dict[str, Any]:
    return normalize_config({"topics": topics, "difficulties": difficulties, "kinds": kinds, "count": count})


@app.callback(
    Output("coverage-summary", "children"),
    Output("coverage-graph", "figure"),
    Input("config-store", "data"),
)
def render_configuration(config: dict[str, Any]) -> tuple[Any, Any]:
    matching = len(available_questions(config))
    requested = config["count"]
    if matching == 0:
        message = "No snippets match. Select at least one topic, difficulty, and question style."
        state_class = "coverage-count empty"
    elif matching < requested:
        message = f"{matching} matching snippets · the next session will use all {matching}."
        state_class = "coverage-count warning"
    else:
        message = f"{matching} matching snippets · {requested} will be sampled for the next session."
        state_class = "coverage-count ready"
    summary = [html.Strong(message, className=state_class), html.Span("The current Practice session is unchanged until you rebuild it.")]
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
            chips, 0, 1, session["message"], "No active question", [],
            "Broaden the Explore filters, then build a new session.",
            html.Div("No code snippet is available.", className="empty-code"),
            [], None, "", "feedback", True, True, True, True,
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
        feedback = [html.Strong("✓ Correct. "), question["explanation"], html.Span(f" Attempts: {attempts}.")]
        feedback_class = "feedback correct"
    elif correctness is False:
        correct_text = question["options"][question["correct"]]
        feedback = [
            html.Strong("✕ Needs revision. "),
            question["explanation"],
            html.Span([" Correct answer: ", html.Code(correct_text), ". Change your choice and submit again."]),
        ]
        feedback_class = "feedback incorrect"
    elif session.get("message") == "Choose one option before submitting.":
        feedback = "△ Incomplete. Choose an answer, then submit again."
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
    app.run(host="127.0.0.1", port=int(os.environ.get("PYTHON_PRACTICE_PORT", "8051")), debug=False)
