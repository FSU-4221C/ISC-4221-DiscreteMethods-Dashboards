"""Plotly coverage figure for Python practice-session configuration."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go

from practice_model import topic_coverage
from question_bank import TOPICS


COVERAGE_GRAPH_HEIGHT = 500


def coverage_figure(config: dict[str, Any]) -> go.Figure:
    """Build a fixed-geometry coverage chart for the ten Python topics.

    Unselected topics stay in place as gray zero bars so category order, axis
    ranges, and margins do not change when the learner updates filters.

    Parameters
    ----------
    config : dict[str, Any]
        Normalized Explore filters used to count matching snippets.

    Returns
    -------
    go.Figure
        Horizontal bar chart with a locked plot area.
    """
    coverage = topic_coverage(config)
    short_labels = [topic.replace(" & ", " + ") for topic in TOPICS]
    counts = [coverage[topic] for topic in TOPICS]
    colors = ["#782f40" if count else "#b7b0a8" for count in counts]
    figure = go.Figure(
        go.Bar(
            x=counts,
            y=short_labels,
            orientation="h",
            marker={"color": colors},
            text=counts,
            textposition="outside",
            cliponaxis=False,
            hovertemplate="%{y}: %{x} matching snippets<extra></extra>",
        )
    )
    figure.update_layout(
        autosize=True,
        height=COVERAGE_GRAPH_HEIGHT,
        margin={"l": 168, "r": 36, "t": 16, "b": 84, "pad": 0, "autoexpand": False},
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"family": "Arial, sans-serif", "color": "#17212b", "size": 14},
        uirevision="python-question-coverage",
        showlegend=False,
        bargap=0.28,
    )
    figure.update_xaxes(
        range=[0, 12],
        dtick=2,
        gridcolor="#ddd7cf",
        zeroline=False,
        automargin=False,
        fixedrange=True,
        constrain="domain",
        ticksuffix=" ",
        title={"text": "Matching snippets", "standoff": 18},
    )
    figure.update_yaxes(
        type="category",
        categoryorder="array",
        categoryarray=short_labels,
        autorange="reversed",
        automargin=False,
        fixedrange=True,
        tickmode="array",
        tickvals=short_labels,
        ticktext=short_labels,
        gridcolor="rgba(0,0,0,0)",
    )
    return figure
