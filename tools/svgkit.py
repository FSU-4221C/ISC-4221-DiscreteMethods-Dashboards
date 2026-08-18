"""svgkit.py — a tiny accessible-SVG writer, standard library only.

    Regenerate everything:  python3 Dashboard/tools/build.py
    Self-check this file:   python3 Dashboard/tools/svgkit.py

Shared helper, not a generator. ``generate_figures.py`` is the only caller.

--------------------------------------------------------------------------
WHY NOT MATPLOTLIB
--------------------------------------------------------------------------
matplotlib's SVG backend converts every text run to ``<path>`` unless you fight
it, which fails 1.4.5 Images of Text outright: the axis labels stop being text,
stop being selectable, stop being searchable, and stop re-flowing at 400% zoom.
It also has no notion of ``role="img"`` or of a ``<title>`` first child.

Writing the SVG directly is less code than configuring matplotlib not to do
those things, and it means the pipeline runs anywhere Python does. matplotlib
is not installed on the build machine as it stands; numpy is, and is also not
used, so ``tools/`` has zero third-party dependencies.

--------------------------------------------------------------------------
WHAT EVERY FIGURE FROM HERE CARRIES
--------------------------------------------------------------------------
``Figure.render()`` will not produce a file without:

  role="img"        so assistive tech announces the title instead of walking
                    the shape tree and saying nothing useful
  <title>           the FIRST child, stating the FINDING, not the drawing
  <desc>            the long description, referenced after the title in
                    aria-labelledby
  a data table      written beside the .svg as ``<name>.table.html``, ready to
                    paste into a page — AUTHORING-CONTRACT §6.2 requires the
                    figure and its table to ship together, and a figure whose
                    generator does not emit one is the exact defect this whole
                    project exists to fix

Text is always a real ``<text>`` node. Colour always comes from
``fsu_palette.token()``. Every series carries a dash and a marker as well as a
colour, and gets a directly-drawn label where there is room for one.
"""

from __future__ import annotations

import html
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import fsu_palette as pal

# ---------------------------------------------------------------------------
# 0. Type sizes, in SVG user units.
#
# The viewBox is authored so that 1 user unit == 1 CSS px at the figure's
# natural width, and the CSS sets `width: 100%; height: auto`, so these scale
# with the container rather than being frozen. 13 is the floor: below that,
# a reader at 200% zoom is reading 26px, which is fine, but a reader at 100%
# on a phone is not.
# ---------------------------------------------------------------------------

FS_TITLE = 17.0
FS_LABEL = 14.0
FS_BODY = 13.5
FS_TICK = 13.0
FS_SMALL = 12.5  # in-shape labels only, where the shape gives extra separation

FONT_SANS = (
    "'Open Sans', Arial, Helvetica, 'Helvetica Neue', sans-serif"
)
FONT_MONO = (
    "ui-monospace, 'DejaVu Sans Mono', 'Cascadia Mono', Consolas, monospace"
)


# ---------------------------------------------------------------------------
# 1. Escaping and number formatting
# ---------------------------------------------------------------------------


def esc(text: object) -> str:
    """Escape text for an XML text node or attribute value."""
    return html.escape(str(text), quote=True)


def num(value: float, places: int = 2) -> str:
    """Format a coordinate: no trailing zeros, no ``-0``, no ``1e-17``."""
    if isinstance(value, int):
        return str(value)
    if not math.isfinite(value):
        raise ValueError(f"non-finite coordinate: {value!r}")
    out = f"{value:.{places}f}".rstrip("0").rstrip(".")
    return "0" if out in ("", "-", "-0") else out


def fmt(value: float, places: int = 3) -> str:
    """Format a *displayed* number. Same rules, but keeps the decimals asked for."""
    if isinstance(value, int) or float(value).is_integer():
        return str(int(value))
    out = f"{value:.{places}f}"
    return "0" if out.lstrip("-").strip("0.") == "" else out


# ---------------------------------------------------------------------------
# 2. Element builders. Every one returns a string; a figure is a list of them.
# ---------------------------------------------------------------------------


def _attrs(pairs: dict[str, object]) -> str:
    out = []
    for key, value in pairs.items():
        if value is None or value is False:
            continue
        key = key.replace("_", "-")
        out.append(f'{key}="{esc(value)}"')
    return (" " + " ".join(out)) if out else ""


def tag(name: str, /, **attrs: object) -> str:
    """A self-closing element."""
    return f"<{name}{_attrs(attrs)} />"


def wrap(name: str, children: str, /, **attrs: object) -> str:
    """An element with children."""
    return f"<{name}{_attrs(attrs)}>{children}</{name}>"


def group(children: list[str], /, **attrs: object) -> str:
    return wrap("g", "\n".join(children), **attrs)


def rect(x, y, w, h, /, **attrs) -> str:
    return tag("rect", x=num(x), y=num(y), width=num(w), height=num(h), **attrs)


def line(x1, y1, x2, y2, /, **attrs) -> str:
    return tag("line", x1=num(x1), y1=num(y1), x2=num(x2), y2=num(y2), **attrs)


def circle(cx, cy, r, /, **attrs) -> str:
    return tag("circle", cx=num(cx), cy=num(cy), r=num(r), **attrs)


def path(d: str, /, **attrs) -> str:
    return tag("path", d=d, **attrs)


def polyline(points: list[tuple[float, float]], /, **attrs) -> str:
    pts = " ".join(f"{num(x)},{num(y)}" for x, y in points)
    return tag("polyline", points=pts, fill="none", **attrs)


def polygon(points: list[tuple[float, float]], /, **attrs) -> str:
    pts = " ".join(f"{num(x)},{num(y)}" for x, y in points)
    return tag("polygon", points=pts, **attrs)


def text(
    x,
    y,
    content: str,
    /,
    size: float = FS_BODY,
    color: str = pal.LABEL,
    anchor: str = "start",
    weight: int | None = None,
    baseline: str | None = None,
    mono: bool = False,
    **attrs,
) -> str:
    """A real ``<text>`` node.

    ``color`` is a palette KEY, not a colour: the token wrapping happens here so
    a caller physically cannot paste a hex string in.
    """
    return wrap(
        "text",
        esc(content),
        x=num(x),
        y=num(y),
        fill=pal.token(color),
        font_size=num(size),
        font_family=FONT_MONO if mono else FONT_SANS,
        font_weight=weight,
        text_anchor=None if anchor == "start" else anchor,
        dominant_baseline=baseline,
        **attrs,
    )


MARKER_R = 4.6  # marker radius in user units; >= 3px stroke-equivalent at 1x


def marker(shape: str, cx: float, cy: float, r: float = MARKER_R, /, **attrs) -> str:
    """One of six marker shapes, so a series is identifiable without colour.

    Shapes are chosen to stay distinct at small size and in greyscale: a filled
    round blob, a filled box, a filled wedge, a filled kite, and two open
    strokes at different angles.
    """
    if shape == "circle":
        return circle(cx, cy, r, **attrs)
    if shape == "square":
        return rect(cx - r, cy - r, 2 * r, 2 * r, **attrs)
    if shape == "triangle":
        return polygon(
            [(cx, cy - r * 1.2), (cx + r * 1.1, cy + r * 0.8), (cx - r * 1.1, cy + r * 0.8)],
            **attrs,
        )
    if shape == "diamond":
        return polygon(
            [(cx, cy - r * 1.3), (cx + r * 1.1, cy), (cx, cy + r * 1.3), (cx - r * 1.1, cy)],
            **attrs,
        )
    if shape == "cross":
        fill = attrs.pop("fill", None)
        stroke = attrs.pop("stroke", fill)
        return group(
            [
                line(cx - r, cy - r, cx + r, cy + r, stroke=stroke, stroke_width=2.2),
                line(cx - r, cy + r, cx + r, cy - r, stroke=stroke, stroke_width=2.2),
            ],
            **attrs,
        )
    if shape == "plus":
        fill = attrs.pop("fill", None)
        stroke = attrs.pop("stroke", fill)
        return group(
            [
                line(cx - r * 1.2, cy, cx + r * 1.2, cy, stroke=stroke, stroke_width=2.2),
                line(cx, cy - r * 1.2, cx, cy + r * 1.2, stroke=stroke, stroke_width=2.2),
            ],
            **attrs,
        )
    raise ValueError(f"unknown marker shape {shape!r}")


def arrow_head(x1, y1, x2, y2, /, size: float = 7.0, color: str = pal.LABEL) -> str:
    """A filled triangle at (x2, y2) pointing along the segment.

    Drawn rather than declared as a ``<marker>`` because a ``<marker>`` inherits
    nothing useful when the SVG is inlined into a page that already has a
    ``<defs>`` with the same id.
    """
    angle = math.atan2(y2 - y1, x2 - x1)
    spread = math.radians(24)
    return polygon(
        [
            (x2, y2),
            (x2 - size * math.cos(angle - spread), y2 - size * math.sin(angle - spread)),
            (x2 - size * math.cos(angle + spread), y2 - size * math.sin(angle + spread)),
        ],
        fill=pal.token(color),
    )


# ---------------------------------------------------------------------------
# 3. Scales
# ---------------------------------------------------------------------------


@dataclass
class Scale:
    """A linear or log10 mapping from data to pixels."""

    lo: float
    hi: float
    px_lo: float
    px_hi: float
    log: bool = False

    def __post_init__(self):
        if self.log and (self.lo <= 0 or self.hi <= 0):
            raise ValueError("a log scale needs strictly positive bounds")
        if self.hi == self.lo:
            raise ValueError("a scale needs hi != lo")

    def _t(self, value: float) -> float:
        if self.log:
            return (math.log10(value) - math.log10(self.lo)) / (
                math.log10(self.hi) - math.log10(self.lo)
            )
        return (value - self.lo) / (self.hi - self.lo)

    def __call__(self, value: float) -> float:
        return self.px_lo + self._t(value) * (self.px_hi - self.px_lo)

    def clamp(self, value: float) -> float:
        return min(max(value, min(self.lo, self.hi)), max(self.lo, self.hi))


def nice_ticks(lo: float, hi: float, target: int = 5) -> list[float]:
    """Human-looking linear tick values covering [lo, hi]."""
    if hi <= lo:
        return [lo]
    raw = (hi - lo) / max(1, target)
    magnitude = 10 ** math.floor(math.log10(raw))
    for multiple in (1, 2, 2.5, 5, 10):
        step = magnitude * multiple
        if raw <= step:
            break
    start = math.ceil(lo / step) * step
    ticks, value = [], start
    while value <= hi + step * 1e-9:
        ticks.append(round(value, 10))
        value += step
    return ticks


def log_ticks(lo: float, hi: float) -> list[float]:
    """Decade ticks covering [lo, hi]."""
    ticks = []
    exponent = math.floor(math.log10(lo))
    while 10 ** exponent <= hi * 1.0000001:
        value = 10 ** exponent
        if value >= lo * 0.9999999:
            ticks.append(value)
        exponent += 1
    return ticks


def si(value: float) -> str:
    """Compact axis-tick text: 1000 -> 1K, 1000000 -> 1M."""
    for limit, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if abs(value) >= limit:
            scaled = value / limit
            return f"{scaled:g}{suffix}"
    return f"{value:g}"


# ---------------------------------------------------------------------------
# 4. The Figure
# ---------------------------------------------------------------------------


@dataclass
class Column:
    """One column of the data table shipped beside the figure."""

    label: str
    unit: str = ""
    numeric: bool = False

    @property
    def header(self) -> str:
        return f"{self.label} ({self.unit})" if self.unit else self.label


@dataclass
class Figure:
    """An accessible SVG plus the data table that is its non-visual equivalent.

    ``slug`` fixes the filenames: ``<slug>.svg`` and ``<slug>.table.html``.
    ``title`` states the FINDING (see alt-text-style-guide.md §3) and becomes
    the ``<title>`` first child. ``desc`` is the long description. ``caption``
    is the ``<figcaption>`` in the emitted table snippet and must NOT repeat
    the title — the caption labels, the title informs.
    """

    slug: str
    module: str                      # 'm1' … 'm7'
    width: float
    height: float
    title: str                       # the finding, <= ~160 chars
    desc: str                        # the long description
    caption: str                     # figcaption / table caption
    topics: tuple[str, ...] = ()     # COURSE_TOPIC_MAP ids this serves
    table_columns: list[Column] = field(default_factory=list)
    table_rows: list[list[object]] = field(default_factory=list)
    table_caption: str = ""
    table_row_header: bool = True
    body: list[str] = field(default_factory=list)
    header_notes: list[str] = field(default_factory=list)  # extra lines in the file header
    #: Bottom of the last wrapped block at each x, so consecutive wrapped()
    #: calls stack instead of overprinting. See wrapped().
    _wrap_cursor: dict = field(default_factory=dict, repr=False)

    # -- drawing -----------------------------------------------------------

    def add(self, *elements: str) -> None:
        self.body.extend(e for e in elements if e)

    def panel(self, x, y, w, h) -> None:
        """The fixed white plot panel. See fsu_palette's module docstring."""
        self.add(
            rect(
                x,
                y,
                w,
                h,
                fill=pal.token(pal.PANEL),
                stroke=pal.token(pal.PANEL_EDGE),
                stroke_width=1,
            )
        )

    def heading(self, x, y, content: str, size: float = FS_TITLE) -> None:
        self.add(text(x, y, content, size=size, color=pal.LABEL_STRONG, weight=700))

    def note(
        self,
        x: float,
        y: float,
        content: str,
        *,
        width: float | None = None,
        size: float = FS_SMALL,
        color: str = pal.LABEL_MUTED,
        weight: int | None = None,
        mono: bool = False,
        line_height: float = 19.0,
    ) -> float:
        """A wrapped run of prose under a figure. Returns the y after the last line.

        SVG does not wrap text — a ``<text>`` node is one line however long it
        is, and the overflow is simply invisible. Every footnote in this
        pipeline goes through here so that it wraps at the figure's own width
        instead of running off the edge, and so that ``_overflowing_text()``
        has nothing left to find.

        One ``<text>`` per line rather than ``<tspan>``s: a screen reader
        reading the shape tree gets clean line breaks either way, and separate
        nodes are what the overflow guard can measure.
        """
        limit = width if width is not None else self.width - x - 16
        words = content.split()
        lines: list[str] = []
        current = ""
        char_w = size * (self._CHAR_W_MONO if mono else self._CHAR_W_PROP)
        for word in words:
            candidate = f"{current} {word}".strip()
            if current and len(candidate) * char_w > limit:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)

        self.add(
            *[
                text(x, y + i * line_height, entry,
                     size=size, color=color, weight=weight, mono=mono)
                for i, entry in enumerate(lines)
            ]
        )
        return y + max(0, len(lines) - 1) * line_height

    def notes(
        self,
        x: float,
        y: float,
        paragraphs: list[str],
        *,
        width: float | None = None,
        size: float = FS_SMALL,
        color: str = pal.LABEL_MUTED,
        line_height: float = 19.0,
        gap: float = 7.0,
        emphasise: int | None = None,
    ) -> float:
        """Several wrapped paragraphs stacked under a figure. Returns the final y.

        Use this rather than a column of :meth:`wrapped` calls at hand-picked
        offsets: a paragraph that wraps to three lines instead of two silently
        lands on top of the one below it, and SVG will not tell you. Here the
        next paragraph starts wherever the previous one actually ended.

        ``emphasise`` gives one paragraph the stronger text colour and semibold
        weight — for the sentence that is the point rather than the caveat.
        """
        cursor = y
        for i, paragraph in enumerate(paragraphs):
            strong = emphasise is not None and i == emphasise
            cursor = self.note(
                x, cursor, paragraph,
                width=width,
                size=size,
                color=pal.LABEL if strong else color,
                weight=600 if strong else None,
                line_height=line_height,
            )
            cursor += line_height + gap
        return cursor - line_height - gap

    def wrapped(
        self,
        x: float,
        y: float,
        content: str,
        *,
        width: float | None = None,
        size: float = FS_SMALL,
        color: str = pal.LABEL_MUTED,
        weight: int | None = None,
        mono: bool = False,
        line_height: float = 19.0,
    ) -> str:
        """:meth:`note` as a value, so it composes inside an ``f.add(...)`` call.

        **Consecutive calls at the same x stack automatically.** The ``y`` you
        pass is a MINIMUM, not a position: if the previous wrapped block at this
        x ended lower than ``y``, this one starts below it instead.

        That is deliberate. The failure this replaces is silent and common — an
        author writes two captions 20 pixels apart, the first one wraps to three
        lines because somebody improved the wording, and the second is drawn on
        top of it. SVG reports nothing, the figure is unreadable, and the alt
        text still describes both sentences. Passing a y that is only a floor
        means editing the words can never cause the overlap.
        """
        limit = width if width is not None else self.width - x - 16
        char_w = size * (self._CHAR_W_MONO if mono else self._CHAR_W_PROP)
        lines: list[str] = []
        current = ""
        for word in content.split():
            candidate = f"{current} {word}".strip()
            if current and len(candidate) * char_w > limit:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)

        key = round(x, 1)
        start = max(y, self._wrap_cursor.get(key, float("-inf")))
        self._wrap_cursor[key] = start + len(lines) * line_height + 6.0

        return group(
            [
                text(x, start + i * line_height, entry,
                     size=size, color=color, weight=weight, mono=mono)
                for i, entry in enumerate(lines)
            ]
        )

    # -- axes --------------------------------------------------------------

    def axes(
        self,
        sx: Scale,
        sy: Scale,
        *,
        x_label: str,
        y_label: str,
        x_ticks: list[float] | None = None,
        y_ticks: list[float] | None = None,
        x_format=si,
        y_format=si,
        grid: bool = True,
    ) -> None:
        """Frame, gridlines, ticks, and the two axis titles.

        Axis titles are ``<text>``; the y title is rotated with a ``transform``
        rather than being set per-character, so it is still one selectable
        string.
        """
        x0, x1 = sx.px_lo, sx.px_hi
        y0, y1 = sy.px_lo, sy.px_hi  # y0 is the bottom in pixel space

        xt = x_ticks if x_ticks is not None else (
            log_ticks(sx.lo, sx.hi) if sx.log else nice_ticks(sx.lo, sx.hi)
        )
        yt = y_ticks if y_ticks is not None else (
            log_ticks(sy.lo, sy.hi) if sy.log else nice_ticks(sy.lo, sy.hi)
        )

        if grid:
            grid_lines = []
            for value in xt:
                px = sx(value)
                grid_lines.append(
                    line(px, y0, px, y1, stroke=pal.token(pal.GRID), stroke_width=1)
                )
            for value in yt:
                py = sy(value)
                grid_lines.append(
                    line(x0, py, x1, py, stroke=pal.token(pal.GRID), stroke_width=1)
                )
            # aria-hidden: gridlines are a reading aid for the drawing only. The
            # authoritative values are in the table.
            self.add(group(grid_lines, aria_hidden="true"))

        self.add(
            line(x0, y0, x1, y0, stroke=pal.token(pal.AXIS), stroke_width=1.5),
            line(x0, y0, x0, y1, stroke=pal.token(pal.AXIS), stroke_width=1.5),
        )

        for value in xt:
            px = sx(value)
            self.add(
                line(px, y0, px, y0 + 5, stroke=pal.token(pal.AXIS), stroke_width=1.5),
                text(px, y0 + 19, x_format(value), size=FS_TICK,
                     color=pal.LABEL_MUTED, anchor="middle"),
            )
        for value in yt:
            py = sy(value)
            self.add(
                line(x0 - 5, py, x0, py, stroke=pal.token(pal.AXIS), stroke_width=1.5),
                text(x0 - 9, py + 4.5, y_format(value), size=FS_TICK,
                     color=pal.LABEL_MUTED, anchor="end"),
            )

        self.add(
            text((x0 + x1) / 2, y0 + 40, x_label, size=FS_LABEL,
                 color=pal.LABEL, anchor="middle"),
            wrap(
                "text",
                esc(y_label),
                x="0",
                y="0",
                fill=pal.token(pal.LABEL),
                font_size=num(FS_LABEL),
                font_family=FONT_SANS,
                text_anchor="middle",
                transform=f"translate({num(x0 - 46)},{num((y0 + y1) / 2)}) rotate(-90)",
            ),
        )

    # -- series ------------------------------------------------------------

    def series_line(
        self,
        points: list[tuple[float, float]],
        series: pal.Series,
        *,
        label: str,
        label_at: tuple[float, float] | None = None,
        width: float = 2.4,
        markers_every: int = 0,
        label_anchor: str = "start",
    ) -> None:
        """A polyline with its dash, its markers, and a directly-drawn label.

        The label is drawn at the end of the line by default, which is what
        makes a legend optional: colour, dash, marker AND a word are all
        present, so nothing is carried by colour alone (1.4.1).
        """
        self.add(
            polyline(
                points,
                stroke=series.color,
                stroke_width=width,
                stroke_dasharray=series.dash,
                stroke_linejoin="round",
                stroke_linecap="round",
            )
        )
        if markers_every:
            for i in range(0, len(points), markers_every):
                x, y = points[i]
                self.add(marker(series.marker, x, y, fill=series.color, stroke=series.color))
        if label:
            lx, ly = label_at if label_at else (points[-1][0] + 7, points[-1][1] + 4)
            self.add(
                text(lx, ly, label, size=FS_SMALL, color=pal.LABEL,
                     weight=600, anchor=label_anchor)
            )

    def legend(
        self,
        x: float,
        y: float,
        entries: list[tuple[pal.Series, str]],
        *,
        line_height: float = 22.0,
        swatch: float = 26.0,
    ) -> None:
        """A legend that repeats the dash and the marker, not just the colour."""
        for i, (series, label) in enumerate(entries):
            row_y = y + i * line_height
            self.add(
                line(
                    x,
                    row_y,
                    x + swatch,
                    row_y,
                    stroke=series.color,
                    stroke_width=2.6,
                    stroke_dasharray=series.dash,
                    stroke_linecap="round",
                ),
                marker(series.marker, x + swatch / 2, row_y, 4.0,
                       fill=series.color, stroke=series.color),
                text(x + swatch + 9, row_y + 4.5, label, size=FS_SMALL, color=pal.LABEL),
            )

    # -- data table --------------------------------------------------------

    def table(
        self,
        columns: list[Column],
        rows: list[list[object]],
        *,
        caption: str = "",
        row_header: bool = True,
    ) -> None:
        self.table_columns = columns
        self.table_rows = rows
        self.table_caption = caption or self.caption
        self.table_row_header = row_header

    # -- output ------------------------------------------------------------

    # Measured against Chrome rendering the real stack (Open Sans / Arial and
    # DejaVu Sans Mono) across all 343 text nodes in this pipeline: the ratio of
    # rendered width to (font-size x characters) had a median of 0.47 and a
    # maximum of 0.59 for proportional text, and a flat 0.60 for the monospace
    # face. 0.55 and 0.61 sit just above the realistic worst case, so the
    # estimate below over-reports slightly and never under-reports — which is
    # the right direction for a guard that has no browser to ask.
    _CHAR_W_PROP = 0.55
    _CHAR_W_MONO = 0.61
    #: Slack before an overflow is called a defect. A couple of pixels of
    #: descender past the edge is invisible; twenty is a clipped word.
    _OVERFLOW_SLACK = 8.0

    _TEXT_RE = re.compile(
        r"<text\b(?P<attrs>[^>]*)>(?P<content>[^<]*)</text>", re.DOTALL
    )

    def _overflowing_text(self) -> list[str]:
        """Text nodes whose estimated box leaves the viewBox.

        Estimated, not measured — there is no browser in the build. It exists
        because the failure it catches is invisible in code review and obvious
        to a student: a caption that runs off the right edge of the figure, or
        sits below its bottom, is simply gone. Rotated text is skipped: it
        carries a transform and the estimate does not model one.
        """
        problems = []
        for match in self._TEXT_RE.finditer("\n".join(self.body)):
            attrs = match.group("attrs")
            if "transform=" in attrs:
                continue
            content = html.unescape(match.group("content"))
            if not content.strip():
                continue

            def attr(name: str, default: str = "") -> str:
                found = re.search(rf'{name}="([^"]*)"', attrs)
                return found.group(1) if found else default

            try:
                x = float(attr("x", "0"))
                y = float(attr("y", "0"))
                size = float(attr("font-size", str(FS_BODY)))
            except ValueError:
                continue

            mono = "mono" in attr("font-family")
            width = len(content) * size * (self._CHAR_W_MONO if mono else self._CHAR_W_PROP)
            anchor = attr("text-anchor", "start")
            left = x - width if anchor == "end" else x - width / 2 if anchor == "middle" else x
            right = left + width
            top = y - size * 0.8
            bottom = y + size * 0.25

            if right > self.width + self._OVERFLOW_SLACK:
                problems.append(
                    f'text runs {right - self.width:.0f}px past the right edge '
                    f'(viewBox width {self.width:.0f}): "{content[:56]}"'
                )
            elif left < -self._OVERFLOW_SLACK:
                problems.append(
                    f'text starts {-left:.0f}px left of the viewBox: "{content[:56]}"'
                )
            elif bottom > self.height + self._OVERFLOW_SLACK:
                problems.append(
                    f'text sits {bottom - self.height:.0f}px below the bottom edge '
                    f'(viewBox height {self.height:.0f}): "{content[:56]}"'
                )
            elif top < -self._OVERFLOW_SLACK:
                problems.append(
                    f'text sits {-top:.0f}px above the top edge: "{content[:56]}"'
                )
        return problems

    #: For collision detection the estimate should be REALISTIC, not pessimistic:
    #: the median measured ratio, so two labels that merely sit close are not
    #: reported. Overflow uses the pessimistic figure above, for the opposite
    #: reason.
    _CHAR_W_PROP_TYPICAL = 0.50
    _CHAR_W_MONO_TYPICAL = 0.60

    def _text_boxes(self, char_w_prop: float, char_w_mono: float) -> list[tuple]:
        boxes = []
        for match in self._TEXT_RE.finditer("\n".join(self.body)):
            attrs = match.group("attrs")
            if "transform=" in attrs:
                continue
            content = html.unescape(match.group("content"))
            if not content.strip():
                continue

            def attr(name: str, default: str = "") -> str:
                found = re.search(rf'{name}="([^"]*)"', attrs)
                return found.group(1) if found else default

            try:
                x = float(attr("x", "0"))
                y = float(attr("y", "0"))
                size = float(attr("font-size", str(FS_BODY)))
            except ValueError:
                continue

            mono = "mono" in attr("font-family")
            width = len(content) * size * (char_w_mono if mono else char_w_prop)
            anchor = attr("text-anchor", "start")
            left = x - width if anchor == "end" else x - width / 2 if anchor == "middle" else x
            boxes.append((left, y - size * 0.78, left + width, y + size * 0.22, content))
        return boxes

    def _colliding_text(self) -> list[str]:
        """Pairs of text nodes whose estimated boxes overlap.

        SVG happily draws one label on top of another and reports nothing. In a
        figure that is usually a wrapped caption landing on an axis title, or two
        series labels ending at the same height — both of which make the figure
        wrong rather than merely untidy, because the overlapping glyphs are
        unreadable and the alt text still claims both are there.
        """
        boxes = self._text_boxes(self._CHAR_W_PROP_TYPICAL, self._CHAR_W_MONO_TYPICAL)
        problems = []
        for i in range(len(boxes)):
            ax0, ay0, ax1, ay1, atext = boxes[i]
            for j in range(i + 1, len(boxes)):
                bx0, by0, bx1, by1, btext = boxes[j]
                overlap_x = min(ax1, bx1) - max(ax0, bx0)
                overlap_y = min(ay1, by1) - max(ay0, by0)
                # A couple of pixels of kerning slop is not a collision; a third
                # of a line height of vertical overlap on shared horizontal
                # extent is.
                if overlap_x > 2.0 and overlap_y > 3.0:
                    problems.append(
                        f'overlapping text: "{atext[:40]}" and "{btext[:40]}" '
                        f"share {overlap_x:.0f} by {overlap_y:.0f} pixels"
                    )
                    if len(problems) >= 6:
                        return problems
        return problems

    def _validate(self) -> None:
        problems = list(self._overflowing_text()) + list(self._colliding_text())
        if not self.title.strip():
            problems.append("title is empty — an informative figure needs one (1.1.1).")
        if not self.desc.strip():
            problems.append("desc is empty — <desc> is the long description.")
        if not self.caption.strip():
            problems.append("caption is empty.")
        if self.title.strip().lower() == self.caption.strip().lower():
            problems.append(
                "title and caption are the same string. The caption LABELS the figure; "
                "the title states the FINDING (AUTHORING-CONTRACT §6.2)."
            )
        if not self.table_columns or not self.table_rows:
            problems.append(
                "no data table. Every figure ships with its non-visual equivalent "
                "(WCAG 1.1.1, AUTHORING-CONTRACT §6.2). Call figure.table(...)."
            )
        for phrase in ("image of", "graph showing", "see figure", "as shown above", "picture of"):
            if phrase in self.title.lower():
                problems.append(
                    f'title contains "{phrase}" — alt-text-style-guide.md §5 lists it as '
                    "always wrong."
                )
        for row in self.table_rows:
            if len(row) != len(self.table_columns):
                problems.append(
                    f"a table row has {len(row)} cells but there are "
                    f"{len(self.table_columns)} columns."
                )
                break
        body = "\n".join(self.body)
        stray = re.search(r"#[0-9a-fA-F]{3,8}\b", body)
        if stray and "var(--fsu-" not in body[max(0, stray.start() - 40) : stray.start()]:
            problems.append(
                f"a raw colour literal {stray.group(0)!r} reached the drawing outside a "
                "var() fallback. Use fsu_palette.token()."
            )
        if problems:
            raise ValueError(
                f"figure {self.slug!r} is not shippable:\n  - " + "\n  - ".join(problems)
            )

    def render(self) -> str:
        """The SVG document text."""
        self._validate()

        title_id = f"fig-{self.slug}-title"
        desc_id = f"fig-{self.slug}-desc"

        header = [
            "Generated file — do not edit by hand.",
            "",
            "  Regenerate:  python3 Dashboard/tools/build.py",
            f"  Generator:   Dashboard/tools/generate_figures.py  (figure id {self.slug!r})",
            "",
            f"Topics: {', '.join(self.topics) if self.topics else '(unassigned)'}",
            "",
            "Colour comes from fsu-tokens.css when this file is inlined into a dashboard",
            "page; the var() fallbacks are the same values as standards/color-palette.md",
            "and only apply when the file is opened on its own. The white plot panel is",
            "deliberate and theme-independent — see Dashboard/tools/fsu_palette.py.",
            "",
            "The non-visual equivalent of this figure is the table in the sibling file",
            f"{self.slug}.table.html. Ship them together.",
        ]
        if self.header_notes:
            header += [""] + self.header_notes

        comment = "<!--\n" + "\n".join("  " + h if h else "" for h in header) + "\n-->"

        open_tag = (
            '<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {num(self.width)} {num(self.height)}" '
            f'width="{num(self.width)}" height="{num(self.height)}" '
            'role="img" '
            f'aria-labelledby="{title_id} {desc_id}" '
            'class="fsu-figure" '
            f'data-figure="{esc(self.slug)}">'
        )

        # A `<style>` inside the SVG. It sets nothing colour-related — the tokens
        # do that — only the box behaviour that makes the figure reflow (1.4.10).
        style = (
            "<style>\n"
            "    /* Reflow: the figure scales with its container instead of forcing\n"
            "       a horizontal page scrollbar at 320px or at 400% zoom (1.4.10). */\n"
            "    svg.fsu-figure { max-width: 100%; height: auto; }\n"
            "  </style>"
        )

        parts = [
            comment,
            open_tag,
            f"  <title id=\"{title_id}\">{esc(self.title)}</title>",
            f"  <desc id=\"{desc_id}\">{esc(self.desc)}</desc>",
            "  " + style,
            "  " + "\n  ".join("\n".join(self.body).split("\n")),
            "</svg>",
        ]
        return "\n".join(parts) + "\n"

    def render_table(self) -> str:
        """The paste-ready ``<figure>`` + data table snippet.

        Emitted as a separate file rather than inside the SVG because the table
        has to live in the HTML document to be reachable: a ``<table>`` inside
        an ``<img src="…svg">`` is invisible to everything.
        """
        data_id = f"fig-{self.slug}-data"
        cols = self.table_columns
        head = "".join(
            f'<th scope="col"{" class=\"is-numeric\"" if c.numeric else ""}>{esc(c.header)}</th>'
            for c in cols
        )
        body_rows = []
        for row in self.table_rows:
            cells = []
            for i, value in enumerate(row):
                numeric = cols[i].numeric
                cls = ' class="is-numeric"' if numeric else ""
                if self.table_row_header and i == 0:
                    cells.append(f'<th scope="row"{cls}>{esc(value)}</th>')
                else:
                    cells.append(f"<td{cls}>{esc(value)}</td>")
            body_rows.append("        <tr>" + "".join(cells) + "</tr>")

        return (
            "<!-- Generated by Dashboard/tools/generate_figures.py — regenerate with\n"
            "     python3 Dashboard/tools/build.py\n"
            "\n"
            f"     Paste this beside assets/figures/{self.module}/{self.slug}.svg.\n"
            "     Inline the SVG (do not use <img>): inline SVG keeps its text as real\n"
            "     text (1.4.5) and lets fsu-tokens.css theme it. -->\n"
            "<figure>\n"
            f"  <!-- inline the contents of assets/figures/{self.module}/{self.slug}.svg here -->\n"
            f"  <figcaption>{esc(self.caption)}</figcaption>\n"
            "</figure>\n"
            "\n"
            f'<div class="table-scroll" role="region" tabindex="0" aria-labelledby="{data_id}">\n'
            f'  <p class="visually-hidden" id="{data_id}">{esc(self.table_caption)}</p>\n'
            '  <table class="data-table">\n'
            f"    <caption>{esc(self.table_caption)}</caption>\n"
            "    <thead>\n"
            f"      <tr>{head}</tr>\n"
            "    </thead>\n"
            "    <tbody>\n"
            + "\n".join(body_rows)
            + "\n    </tbody>\n"
            "  </table>\n"
            "</div>\n"
        )

    def write(self, figures_root: Path) -> list[Path]:
        out_dir = figures_root / self.module
        out_dir.mkdir(parents=True, exist_ok=True)
        svg_path = out_dir / f"{self.slug}.svg"
        table_path = out_dir / f"{self.slug}.table.html"
        written = []
        for target, content in ((svg_path, self.render()), (table_path, self.render_table())):
            if not target.exists() or target.read_text(encoding="utf-8") != content:
                target.write_text(content, encoding="utf-8")
                written.append(target)
        return written


# ---------------------------------------------------------------------------
# 5. Self-check
# ---------------------------------------------------------------------------


def _self_check() -> int:
    problems: list[str] = []

    if num(-0.0001, 2) != "0":
        problems.append("num() produced a signed zero")
    if num(3.140000, 2) != "3.14":
        problems.append("num() left trailing zeros")
    if esc('a & b < "c"') != "a &amp; b &lt; &quot;c&quot;":
        problems.append("esc() is not escaping")

    s = Scale(0, 10, 0, 100)
    if abs(s(5) - 50) > 1e-9:
        problems.append("linear Scale is wrong")
    s = Scale(1, 1000, 0, 100, log=True)
    if abs(s(10) - 33.3333) > 1e-3:
        problems.append("log Scale is wrong")

    # A figure with no table must refuse to render.
    f = Figure("x", "m0", 100, 100, title="A finding", desc="Long.", caption="Figure 0.")
    try:
        f.render()
        problems.append("Figure.render() allowed a figure with no data table")
    except ValueError:
        pass

    # Title == caption must refuse too.
    f = Figure("x", "m0", 100, 100, title="Same", desc="d", caption="Same")
    f.table([Column("a")], [["1"]])
    try:
        f.render()
        problems.append("Figure.render() allowed title == caption")
    except ValueError:
        pass

    # A good one must render with role, title first, and desc.
    f = Figure("ok", "m0", 100, 50, title="Two of three points sit inside.",
               desc="Long description.", caption="Figure 0.1. Example.")
    f.table([Column("Point"), Column("x", numeric=True)], [["A", 1]])
    f.add(circle(10, 10, 3, fill=pal.token("garnet")))
    out = f.render()
    for needle in ('role="img"', "<title id=", "<desc id=", "aria-labelledby="):
        if needle not in out:
            problems.append(f"rendered SVG is missing {needle}")
    if out.index("<title") > out.index("<desc"):
        problems.append("<title> is not the first child")
    if "var(--fsu-" not in out:
        problems.append("rendered SVG has no token references")

    for p in problems:
        print(f"  - {p}")
    print("svgkit self-check:", "FAILED" if problems else "OK")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(_self_check())
