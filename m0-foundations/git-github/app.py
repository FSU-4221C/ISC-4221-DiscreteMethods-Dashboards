"""Interactive Git and GitHub learning dashboard for ISC 4221C.

Run from this folder with ``python app.py`` and open http://127.0.0.1:8050.
"""

from __future__ import annotations

import os
from typing import Any

import dash
from dash import Dash, Input, Output, State, ctx, dcc, html, no_update

from figures import commit_graph_figure, state_explanations
from git_model import apply_action, file_change_status, git_status_summary, initial_state, unpublished_commits
from learning_content import LEARNING_OBJECTIVES, PRACTICE_INTRO, SECTIONS


def button(label: str, component_id: str, variant: str = "primary") -> html.Button:
    return html.Button(label, id=component_id, n_clicks=0, className=f"action-button {variant}")


def edit_button_appearance(state: dict[str, Any], filename: str, idle_label: str) -> tuple[str, str]:
    """Return the label and style for a file-edit control.

    Parameters
    ----------
    state : dict[str, Any]
        Current simulated repository.
    filename : str
        File owned by the button, such as ``README.md``.
    idle_label : str
        Button text used when the file has no uncommitted change.

    Returns
    -------
    tuple[str, str]
        Visible label and CSS class name. Color is paired with a status word so
        edited and staged states are not color-only.
    """
    status = file_change_status(state, filename)
    if status == "edited":
        return f"{filename} · edited", "action-button edited"
    if status == "staged":
        return f"{filename} · staged", "action-button staged"
    return idle_label, "action-button secondary"


def section_card(key: str, controls: list[Any], graph: Any, explanation_id: str) -> html.Section:
    section = SECTIONS[key]
    return html.Section(
        [
            html.Div(
                [
                    html.P(section["objective"], className="objective"),
                    html.H2(section["title"]),
                    html.P(section["instructions"], className="instructions"),
                ],
                className="section-heading",
            ),
            html.Div(controls, className="control-panel", role="group", **{"aria-label": f"Controls for {section['title']}"}),
            dcc.Loading(graph, type="circle", color="#782f40"),
            html.P(id=explanation_id, className="state-explanation", **{"aria-live": "polite"}),
            html.P([html.Strong("Takeaway: "), section["takeaway"]], className="takeaway"),
        ],
        className="learning-card",
        **{"aria-labelledby": f"{key}-section-label"},
    )


def snapshot_pipeline_view(state: dict[str, Any]) -> html.Div:
    """Build a responsive native-HTML snapshot pipeline."""
    status = git_status_summary(state)
    stages = [
        ("Working tree", status["working"], "edited file(s)"),
        ("Staging area", status["staged"], "selected snapshot(s)"),
        ("Local history", len(state["local_known"]), "known commit(s)"),
        ("GitHub", len(state["remote_known"]), "published commit(s)"),
    ]
    commands = ["git add", "git commit", "git push"]
    children: list[Any] = []
    for index, (title, count, unit) in enumerate(stages):
        children.append(
            html.Div(
                [html.Strong(title), html.Span(str(count), className="pipeline-count"), html.Small(unit)],
                className=f"pipeline-stage stage-{index + 1}",
            )
        )
        if index < len(commands):
            children.append(
                html.Div([html.Code(commands[index]), html.Span("→", **{"aria-hidden": "true"})], className="pipeline-arrow")
            )
    return html.Div(children, className="pipeline-visual", role="img", **{"aria-label": "Git state pipeline from working tree through staging and local history to GitHub"})


def sync_status_view(state: dict[str, Any]) -> html.Div:
    """Build a responsive local-versus-GitHub comparison."""
    status = git_status_summary(state)
    ahead = status["unpublished"]
    behind = status["behind"]
    if ahead and behind:
        relation = f"diverged · pull {behind}, then push {ahead}"
    elif ahead:
        relation = f"git push · {ahead} unpublished"
    elif behind:
        relation = f"git pull · {behind} to receive"
    else:
        relation = "in sync"

    def repository_panel(title: str, head: str, count: int, css_class: str) -> html.Div:
        return html.Div(
            [
                html.Strong(title),
                html.Span([status["branch"], " → ", html.B(head)], className="sync-head"),
                html.Small(f"{count} known commit(s)"),
            ],
            className=f"sync-repository {css_class}",
        )

    return html.Div(
        [
            repository_panel("Your computer", status["local_head"], len(state["local_known"]), "local"),
            html.Div([html.Code(relation), html.Span("↔", **{"aria-hidden": "true"})], className="sync-relation"),
            repository_panel("GitHub · origin", status["remote_head"] or "not published", len(state["remote_known"]), "remote"),
        ],
        className="sync-visual",
        role="img",
        **{"aria-label": f"Local and GitHub comparison for {status['branch']}: {relation}"},
    )


def question_block(number: int, legend: Any, control: Any, feedback_id: str) -> html.Fieldset:
    return html.Fieldset(
        [
            html.Legend([html.Span(str(number), className="question-number"), legend]),
            control,
            html.Div(id=feedback_id, className="feedback", **{"aria-live": "polite"}),
        ],
        className="question-block",
    )


initial = initial_state()

snapshot_controls = [
    html.Div(
        [button("Edit README.md", "edit-readme-button", "secondary"), button("Edit analysis.py", "edit-code-button", "secondary")],
        className="button-row",
    ),
    html.Div([button("Stage all · git add .", "stage-button"),], className="button-row"),
    button("Commit staged · git commit", "commit-button"),
]

branch_controls = [
    html.Div([button("Create feature branch", "create-feature-button")], className="button-row"),
    html.Label("Branch to check out", htmlFor="branch-select", className="control-label"),
    dcc.Dropdown(
        id="branch-select",
        options=[{"label": "main", "value": "main"}],
        value="main",
        clearable=False,
        searchable=False,
        className="branch-dropdown",
    ),
    button("Switch branch · git switch", "checkout-button", "secondary"),
]

github_controls = [
    html.Div(
        [button("Push current branch", "push-button"), button("Pull current branch", "pull-button", "secondary")],
        className="button-row",
    ),
    html.Div(
        [button("Open pull request", "open-pr-button", "github"), button("Merge pull request", "merge-pr-button", "github")],
        className="button-row",
    ),
    html.Div([button("Simulate collaborator on main", "collaborator-button", "outline")], className="button-row"),
    html.Div(id="pr-state", className="pr-state"),
]

explore_layout = html.Div(
    [
        html.Section(
            [
                html.Div([html.P("CURRENT REPOSITORY", className="status-label"), html.Div(id="status-chips", className="status-chips")]),
                html.Div([html.P(id="last-action", className="last-action info", **{"aria-live": "polite"}), button("Reset simulation", "reset-simulation-button", "outline")], className="status-action"),
                html.Details([html.Summary("Command trail"), html.Ol(id="action-history", className="command-history")]),
            ],
            className="repository-status",
        ),
        section_card(
            "snapshots",
            snapshot_controls,
            html.Div(id="snapshot-graph", className="dashboard-graph"),
            "snapshot-explanation",
        ),
        section_card(
            "branches",
            branch_controls,
            dcc.Graph(id="commit-graph", config={"displaylogo": False, "responsive": True}, className="dashboard-graph"),
            "branch-explanation",
        ),
        section_card(
            "github",
            github_controls,
            html.Div(id="sync-graph", className="dashboard-graph"),
            "sync-explanation",
        ),
    ],
    className="explore-layout",
)

practice_layout = html.Div(
    [
        html.Section(
            [
                html.P("PRACTICE", className="eyebrow"),
                html.H2("Reason from repository state"),
                html.P(PRACTICE_INTRO),
                html.Div(
                    [html.Div(id="practice-state-summary", className="frozen-state"), button("Use current simulation", "refresh-practice-button", "secondary")],
                    className="practice-snapshot-row",
                ),
            ],
            className="practice-intro",
        ),
        html.Section(
            [
                question_block(
                    1,
                    "You committed your assignment, but the grader cannot see it on GitHub. Which command is missing?",
                    dcc.RadioItems(
                        id="q1-answer",
                        options=[
                            {"label": "git add", "value": "add"},
                            {"label": "git push", "value": "push"},
                            {"label": "git switch", "value": "switch"},
                        ],
                        className="answer-options",
                    ),
                    "q1-feedback",
                ),
                question_block(
                    2,
                    "Which sequence selects file snapshots, records a local checkpoint, then publishes it?",
                    dcc.RadioItems(
                        id="q2-answer",
                        options=[
                            {"label": "git add → git commit → git push", "value": "add-commit-push"},
                            {"label": "git commit → git add → git pull", "value": "commit-add-pull"},
                            {"label": "git push → git add → git commit", "value": "push-add-commit"},
                        ],
                        className="answer-options",
                    ),
                    "q2-feedback",
                ),
                question_block(
                    3,
                    "A feature branch exists with reviewed commits. Which action incorporates them into main?",
                    dcc.RadioItems(
                        id="q3-answer",
                        options=[
                            {"label": "Merge the pull request", "value": "merge"},
                            {"label": "Clone the repository again", "value": "clone"},
                            {"label": "Rename the feature branch", "value": "rename"},
                        ],
                        className="answer-options",
                    ),
                    "q3-feedback",
                ),
                question_block(
                    4,
                    html.Span(id="state-question"),
                    dcc.Input(id="q4-answer", type="number", min=0, step=1, placeholder="Enter a whole number", className="number-input"),
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

app = Dash(__name__, title="Git & GitHub · Interactive Learning Dashboard", update_title="Updating repository…")
server = app.server
app.layout = html.Div(
    [
        dcc.Store(id="simulation-store", data=initial),
        dcc.Store(id="practice-store", data=initial),
        html.Header(
            [
                html.P("ISC 4221C · MODULE 0", className="eyebrow"),
                html.H1("Git & GitHub Repository Lab"),
                html.P("Make changes, move branch pointers, synchronize with GitHub, and explain what every command actually did.", className="subtitle"),
                html.Ul([html.Li(objective) for objective in LEARNING_OBJECTIVES], className="learning-objectives"),
            ],
            className="app-header",
        ),
        html.Main(
            dcc.Tabs(
                id="top-navigation",
                value="explore",
                children=[
                    dcc.Tab(label="Explore", value="explore", children=explore_layout, className="top-tab", selected_className="top-tab selected"),
                    dcc.Tab(label="Practice", value="practice", children=practice_layout, className="top-tab", selected_className="top-tab selected"),
                ],
                className="top-tabs",
            )
        ),
        html.Footer("Teaching simulation: it models core Git relationships and does not execute commands on your files.", className="app-footer"),
    ],
    className="app-shell",
)


ACTION_BY_TRIGGER = {
    "edit-readme-button": "edit-readme",
    "edit-code-button": "edit-code",
    "stage-button": "stage",
    "commit-button": "commit",
    "create-feature-button": "create-feature",
    "checkout-button": "checkout",
    "push-button": "push",
    "pull-button": "pull",
    "open-pr-button": "open-pr",
    "merge-pr-button": "merge-pr",
    "collaborator-button": "collaborator",
    "reset-simulation-button": "reset",
}


@app.callback(
    Output("simulation-store", "data"),
    [Input(component_id, "n_clicks") for component_id in ACTION_BY_TRIGGER],
    State("simulation-store", "data"),
    State("branch-select", "value"),
    prevent_initial_call=True,
)
def update_simulation(*args: Any) -> dict[str, Any]:
    """Translate one clicked control into a pure teaching-model action."""
    state, branch = args[-2:]
    trigger = ctx.triggered_id
    action = ACTION_BY_TRIGGER.get(trigger)
    if not action:
        return no_update
    value = branch if action == "checkout" else None
    return apply_action(state, action, value)


@app.callback(
    Output("status-chips", "children"),
    Output("last-action", "children"),
    Output("last-action", "className"),
    Output("action-history", "children"),
    Output("snapshot-graph", "children"),
    Output("commit-graph", "figure"),
    Output("sync-graph", "children"),
    Output("branch-select", "options"),
    Output("branch-select", "value"),
    Output("snapshot-explanation", "children"),
    Output("branch-explanation", "children"),
    Output("sync-explanation", "children"),
    Output("pr-state", "children"),
    Output("pr-state", "className"),
    Output("edit-readme-button", "children"),
    Output("edit-readme-button", "className"),
    Output("edit-code-button", "children"),
    Output("edit-code-button", "className"),
    Input("simulation-store", "data"),
)
def render_simulation(state: dict[str, Any]) -> tuple[Any, ...]:
    status = git_status_summary(state)
    chips = [
        html.Span([html.B("HEAD "), status["branch"]], className="status-chip head"),
        html.Span(f"{status['working']} working", className="status-chip"),
        html.Span(f"{status['staged']} staged", className="status-chip"),
        html.Span(f"{status['unpublished']} unpublished", className="status-chip"),
        html.Span(f"{status['behind']} behind", className="status-chip"),
    ]
    history = [html.Li(html.Code(item)) for item in state["history"]]
    options = [{"label": name, "value": name} for name in state["local_branches"]]
    snapshot_text, branch_text, sync_text = state_explanations(state)
    pr_status = status["pr_status"]
    pr_label = {"none": "Pull request: not opened", "open": "Pull request: open for review", "merged": "Pull request: merged"}[pr_status]
    readme_label, readme_class = edit_button_appearance(state, "README.md", "Edit README.md")
    code_label, code_class = edit_button_appearance(state, "analysis.py", "Edit analysis.py")
    return (
        chips,
        state["last_action"],
        f"last-action {state['action_kind']}",
        history,
        snapshot_pipeline_view(state),
        commit_graph_figure(state),
        sync_status_view(state),
        options,
        state["current_branch"],
        snapshot_text,
        branch_text,
        sync_text,
        pr_label,
        f"pr-state {pr_status}",
        readme_label,
        readme_class,
        code_label,
        code_class,
    )


@app.callback(
    Output("practice-store", "data"),
    Input("refresh-practice-button", "n_clicks"),
    State("simulation-store", "data"),
    prevent_initial_call=True,
)
def refresh_practice_state(clicks: int, state: dict[str, Any]) -> dict[str, Any]:
    del clicks
    return state


@app.callback(
    Output("practice-state-summary", "children"),
    Output("state-question", "children"),
    Input("practice-store", "data"),
)
def render_practice_state(state: dict[str, Any]) -> tuple[Any, str]:
    status = git_status_summary(state)
    unpublished = len(unpublished_commits(state, status["branch"]))
    summary = [
        html.Strong(f"Frozen simulation · revision {state['revision']}"),
        html.Span(f"Branch: {status['branch']}"),
        html.Span(f"Local HEAD: {status['local_head']}"),
        html.Span(f"GitHub HEAD: {status['remote_head'] or 'not published'}"),
    ]
    prompt = (
        f"In the frozen simulation, how many commits reachable from local {status['branch']} "
        "have not yet been published to GitHub? Enter a whole number."
    )
    # Keep evaluator and wording derived from the same frozen model state.
    assert unpublished >= 0
    return summary, prompt


def practice_feedback(answer: Any, expected: Any, correct_text: str, revision_text: str) -> tuple[str, str, bool]:
    if answer is None:
        return "△ Incomplete. Choose or enter an answer, then submit again.", "feedback incomplete", False
    if answer == expected:
        return f"✓ Correct. {correct_text}", "feedback correct", True
    return f"✕ Needs revision. {revision_text}", "feedback incorrect", False


@app.callback(
    Output("q1-feedback", "children"), Output("q1-feedback", "className"),
    Output("q2-feedback", "children"), Output("q2-feedback", "className"),
    Output("q3-feedback", "children"), Output("q3-feedback", "className"),
    Output("q4-feedback", "children"), Output("q4-feedback", "className"),
    Output("practice-summary", "children"),
    Output("q1-answer", "value"), Output("q2-answer", "value"),
    Output("q3-answer", "value"), Output("q4-answer", "value"),
    Input("submit-practice-button", "n_clicks"),
    Input("reset-practice-button", "n_clicks"),
    Input("refresh-practice-button", "n_clicks"),
    State("q1-answer", "value"), State("q2-answer", "value"),
    State("q3-answer", "value"), State("q4-answer", "value"),
    State("practice-store", "data"),
    prevent_initial_call=True,
)
def score_or_reset_practice(*args: Any) -> tuple[Any, ...]:
    trigger = ctx.triggered_id
    q1, q2, q3, q4, frozen_state = args[-5:]
    if trigger in {"reset-practice-button", "refresh-practice-button"}:
        message = "Practice reset. Explore state was preserved." if trigger == "reset-practice-button" else "Practice now uses the refreshed simulation. Answers were cleared."
        return "", "feedback", "", "feedback", "", "feedback", "", "feedback", message, None, None, None, None

    expected_unpublished = len(unpublished_commits(frozen_state, frozen_state["current_branch"]))
    q4_value = None
    if q4 is not None:
        try:
            numeric = float(q4)
            if numeric.is_integer():
                q4_value = int(numeric)
        except (TypeError, ValueError):
            q4_value = None
    feedbacks = [
        practice_feedback(q1, "push", "A commit stays local; git push sends it to the remote.", "Use git push after committing to publish the checkpoint."),
        practice_feedback(q2, "add-commit-push", "Add selects snapshots, commit records them locally, and push publishes commits.", "Follow the state movement: working tree → staging → local history → GitHub."),
        practice_feedback(q3, "merge", "Merging the reviewed pull request advances main to include the proposed history.", "Opening or reviewing a pull request does not itself change main; the merge does."),
        practice_feedback(q4_value, expected_unpublished, f"Exactly {expected_unpublished} reachable local commit(s) are absent from GitHub in revision {frozen_state['revision']}.", f"Trace local {frozen_state['current_branch']} and count its commits that use the local-only marker. The expected count is {expected_unpublished}."),
    ]
    score = sum(item[2] for item in feedbacks)
    flat_feedback = [value for text, class_name, _ in feedbacks for value in (text, class_name)]
    summary = f"Progress: {score} of 4 correct. Revise any marked item and submit again; your answers are preserved."
    return (*flat_feedback, summary, no_update, no_update, no_update, no_update)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("GIT_DASHBOARD_PORT", "8050")), debug=False)
