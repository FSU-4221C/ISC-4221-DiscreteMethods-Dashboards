"""Plotly figure builders for the Git teaching model."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go

from git_model import ancestors, commits_behind, git_status_summary, unpublished_commits

GARNET = "#782f40"
GOLD = "#ceb888"
INK = "#17212b"
MUTED = "#607180"
TEAL = "#007a78"
ORANGE = "#c55a11"
PAPER = "rgba(0,0,0,0)"


def _base_figure(height: int, uirevision: str) -> go.Figure:
    figure = go.Figure()
    figure.update_layout(
        height=height,
        margin={"l": 24, "r": 24, "t": 30, "b": 24},
        paper_bgcolor=PAPER,
        plot_bgcolor=PAPER,
        font={"family": "Arial, sans-serif", "color": INK, "size": 15},
        showlegend=False,
        uirevision=uirevision,
    )
    return figure


def snapshot_pipeline_figure(state: dict[str, Any]) -> go.Figure:
    """Show how file snapshots move from editing to GitHub."""
    status = git_status_summary(state)
    stages = [
        ("Working tree", status["working"], "edited file(s)"),
        ("Staging area", status["staged"], "selected snapshot(s)"),
        ("Local history", len(state["local_known"]), "known commit(s)"),
        ("GitHub", len(state["remote_known"]), "published commit(s)"),
    ]
    colors = ["#e8f2f2", "#fff4d6", "#f3e8ec", "#e7edf5"]
    figure = _base_figure(280, "snapshot-pipeline")
    for index, ((title, count, unit), color) in enumerate(zip(stages, colors, strict=True)):
        x0 = index * 1.25
        figure.add_shape(
            type="rect", x0=x0, x1=x0 + 0.95, y0=0.2, y1=1.15,
            line={"color": GARNET if index == 2 else MUTED, "width": 3 if index == 2 else 1.5},
            fillcolor=color,
        )
        figure.add_annotation(
            x=x0 + 0.475, y=0.92, text=f"<b>{title}</b>", showarrow=False, font={"size": 16}
        )
        figure.add_annotation(
            x=x0 + 0.475, y=0.58, text=f"<b>{count}</b>", showarrow=False,
            font={"size": 28, "color": GARNET},
        )
        figure.add_annotation(x=x0 + 0.475, y=0.34, text=unit, showarrow=False, font={"size": 13, "color": MUTED})
        if index < 3:
            labels = ["git add", "git commit", "git push"]
            figure.add_annotation(
                x=x0 + 1.16, y=0.68, ax=x0 + 0.99, ay=0.68, xref="x", yref="y", axref="x", ayref="y",
                text=labels[index], showarrow=True, arrowhead=2, arrowwidth=2, arrowcolor=TEAL,
                font={"size": 12, "color": TEAL},
            )
    figure.update_xaxes(visible=False, range=[-0.1, 4.75], fixedrange=True)
    figure.update_yaxes(visible=False, range=[0, 1.4], fixedrange=True)
    return figure


def commit_graph_figure(state: dict[str, Any]) -> go.Figure:
    """Draw the commit DAG and encode whether each commit is local, remote, or both."""
    commits = state["commits"]
    positions = {commit["id"]: (index, 1 if commit["lane"] == "feature" else 0) for index, commit in enumerate(commits)}
    figure = _base_figure(410, "git-commit-dag")

    for commit in commits:
        x, y = positions[commit["id"]]
        for parent in commit["parents"]:
            parent_x, parent_y = positions[parent]
            figure.add_trace(go.Scatter(
                x=[parent_x, x], y=[parent_y, y], mode="lines",
                line={"color": "#7a8792", "width": 3}, hoverinfo="skip",
            ))

    local = set(state["local_known"])
    remote = set(state["remote_known"])
    status_styles = {
        "both": (GARNET, "circle", "Local + GitHub"),
        "local": (TEAL, "diamond", "Local only"),
        "remote": (ORANGE, "square", "GitHub only"),
    }
    for key, (color, symbol, label) in status_styles.items():
        selected = []
        for commit in commits:
            commit_id = commit["id"]
            location = "both" if commit_id in local and commit_id in remote else "local" if commit_id in local else "remote"
            if location == key:
                selected.append(commit)
        if not selected:
            continue
        figure.add_trace(go.Scatter(
            x=[positions[c["id"]][0] for c in selected],
            y=[positions[c["id"]][1] for c in selected],
            mode="markers+text", name=label, showlegend=True,
            text=[c["id"] for c in selected], textposition="bottom center",
            marker={"size": 22, "color": color, "symbol": symbol, "line": {"color": "white", "width": 2}},
            customdata=[[c["message"], c["author"], label] for c in selected],
            hovertemplate="<b>%{text}</b><br>%{customdata[0]}<br>Author: %{customdata[1]}<br>%{customdata[2]}<extra></extra>",
        ))

    annotations = []
    for branch, head in state["local_branches"].items():
        x, y = positions[head]
        prefix = "HEAD → " if branch == state["current_branch"] else ""
        annotations.append(dict(x=x, y=y + 0.23, text=f"<b>{prefix}{branch}</b>", showarrow=True, arrowhead=0, ax=0, ay=-30, bgcolor="#ffffff", bordercolor=GARNET))
    for branch, head in state["remote_branches"].items():
        x, y = positions[head]
        annotations.append(dict(x=x, y=y - 0.23, text=f"origin/{branch}", showarrow=True, arrowhead=0, ax=0, ay=30, bgcolor="#ffffff", bordercolor=ORANGE))
    figure.update_layout(
        annotations=annotations,
        legend={"orientation": "h", "yanchor": "bottom", "y": 1.03, "xanchor": "left", "x": 0},
        hovermode="closest",
    )
    figure.update_xaxes(visible=False, range=[-0.6, max(3.8, len(commits) - 0.25)], fixedrange=False)
    figure.update_yaxes(
        tickmode="array", tickvals=[0, 1], ticktext=["main", "feature"],
        range=[-0.55, 1.55], gridcolor="#d8dee4", zeroline=False, fixedrange=True,
    )
    return figure


def sync_figure(state: dict[str, Any]) -> go.Figure:
    """Compare the current branch on the learner's computer and GitHub."""
    status = git_status_summary(state)
    local_head = status["local_head"]
    remote_head = status["remote_head"] or "not published"
    ahead = status["unpublished"]
    behind = status["behind"]
    figure = _base_figure(290, "git-sync-state")
    panels = [
        (0.15, 1.65, "Your computer", local_head, len(state["local_known"]), "#e8f2f2", TEAL),
        (2.35, 3.85, "GitHub · origin", remote_head, len(state["remote_known"]), "#fff0e6", ORANGE),
    ]
    for x0, x1, title, head, count, fill, border in panels:
        figure.add_shape(type="rect", x0=x0, x1=x1, y0=0.15, y1=1.25, fillcolor=fill, line={"color": border, "width": 2.5})
        figure.add_annotation(x=(x0 + x1) / 2, y=1.0, text=f"<b>{title}</b>", showarrow=False, font={"size": 18})
        figure.add_annotation(x=(x0 + x1) / 2, y=0.68, text=f"{status['branch']} → <b>{head}</b>", showarrow=False, font={"size": 16})
        figure.add_annotation(x=(x0 + x1) / 2, y=0.38, text=f"{count} known commit(s)", showarrow=False, font={"size": 13, "color": MUTED})
    arrow_text = "in sync"
    arrow_color = MUTED
    if ahead and behind:
        arrow_text, arrow_color = f"diverged · push {ahead} / pull {behind}", GARNET
    elif ahead:
        arrow_text, arrow_color = f"git push · {ahead} unpublished", TEAL
    elif behind:
        arrow_text, arrow_color = f"git pull · {behind} to receive", ORANGE
    figure.add_annotation(
        x=2.18, y=0.7, ax=1.82, ay=0.7, xref="x", yref="y", axref="x", ayref="y",
        text=f"<b>{arrow_text}</b>", showarrow=True, arrowhead=3, arrowside="end+start",
        arrowwidth=3, arrowcolor=arrow_color, font={"size": 13, "color": arrow_color},
    )
    figure.update_xaxes(visible=False, range=[0, 4], fixedrange=True)
    figure.update_yaxes(visible=False, range=[0, 1.5], fixedrange=True)
    return figure


def state_explanations(state: dict[str, Any]) -> tuple[str, str, str]:
    """Return short explanations tied to the figures' current state."""
    status = git_status_summary(state)
    snapshot = (
        f"Now: {status['working']} working-tree change(s), {status['staged']} staged snapshot(s), "
        f"and {status['unpublished']} local commit(s) not yet on GitHub."
    )
    branch_heads = ", ".join(f"{name} → {head}" for name, head in state["local_branches"].items())
    branch = f"HEAD is on {status['branch']}. Local branch pointers: {branch_heads}."
    if status["unpublished"] and status["behind"]:
        sync = "The histories diverged: pull integrates GitHub's work before a push can succeed."
    elif status["unpublished"]:
        sync = f"Your branch has {status['unpublished']} unpublished commit(s); commit is not the same as push."
    elif status["behind"]:
        sync = f"GitHub has {status['behind']} commit(s) your local branch has not received; pull brings them down."
    else:
        sync = "The current branch has no unpublished or missing commits relative to GitHub."
    return snapshot, branch, sync
