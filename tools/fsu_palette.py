"""fsu_palette.py — the FSU accessible palette, for the offline figure pipeline.

    Regenerate everything:  python3 Dashboard/tools/build.py
    Self-check this file:   python3 Dashboard/tools/fsu_palette.py

Single source of truth for colour in the generated SVGs. It mirrors
``standards/color-palette.md`` and ``Dashboard/assets/css/fsu-tokens.css`` and
verifies itself against the ratios *published in that document* — it never
invents one. Run this file directly and it re-measures every documented pairing
with the same formula ``standards``/``tools/contrast.py`` uses; a drift in
either direction is a hard failure, not a warning.

--------------------------------------------------------------------------
WHY GENERATED SVG EMITS ``var(--token, #fallback)``
--------------------------------------------------------------------------
A generated figure has to survive two very different lives:

  inlined into a page   the page's ``fsu-tokens.css`` is in scope, so
                        ``var(--fsu-garnet)`` resolves and the figure re-themes
                        with the rest of the dashboard;
  opened on its own     ``figures/m3/dijkstra-example-graph.svg`` double-clicked
                        from a folder, or used as ``<img src=…>``, where no
                        stylesheet is in scope at all.

``var(--fsu-garnet, #782f40)`` covers both: the token wins when it exists, the
literal only ever appears in the standalone case. The literal is written once,
here, from ``color-palette.md`` — it is never typed into a figure by hand.

--------------------------------------------------------------------------
WHY FIGURES DRAW THEIR OWN WHITE PANEL
--------------------------------------------------------------------------
The palette's contrast is not symmetric across themes. Measured on white, FSU
Garnet is 9.21:1 and FSU Gold is 1.94:1; on Stadium Night the order reverses.
``--fsu-series-1`` … ``--fsu-series-6`` are the same six colours in both
themes, so a plot line that is safe in light mode is not automatically safe in
dark mode.

Rather than guess, every generated figure paints its own plot panel in
``--fsu-white`` (a raw brand token, identical in both themes) and draws on it
with foregrounds whose ratio *against white* is published. The measured ratios
therefore hold whatever theme the surrounding page is in. The panel carries a
visible border so it does not float on a dark page.

Consequence, and it is deliberate: generated figures use **raw brand tokens
only** (``--fsu-garnet``, ``--fsu-slate``, …). They never use the semantic
tokens (``--fsu-color-body``, ``--fsu-surface``, …), because those flip with
the theme and would break the guarantee above.

--------------------------------------------------------------------------
WHY THERE ARE TWO SERIES ORDERS
--------------------------------------------------------------------------
``color-palette.md`` §5 fixes the draw order: Garnet, Gold, Plaza Brick, Gulf
Sands, Legacy Blue, Westcott Water. That order is right for **filled areas**,
where the fill sits under a dark outline and a dark label.

It is wrong for **thin lines and small markers on white**. The alt-text style
guide §7 says it plainly: FSU Gold on white is 1.94:1, "never as text or as a
line on white". Gulf Sands and Westcott Water are lighter still. WCAG 1.4.11
wants 3:1 for a meaningful graphic, so a gold trend line is not a style
preference, it is a defect.

``LINE_SERIES`` is therefore §5's order with the fills-only colours removed and
the neutral ramp appended, so a six-series line chart still has six
distinguishable strokes that each clear 3:1 on white. Primaries still lead, so
a chart with four or fewer line series stays majority-primary.

And in every case colour is a *redundant* channel: each series also carries a
dash pattern, a marker shape, and a direct text label (1.4.1).
"""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# 1. The palette. Hex values from standards/color-palette.md §1, lower-cased to
#    match Dashboard/assets/css/fsu-tokens.css.
# ---------------------------------------------------------------------------

HEX: dict[str, str] = {
    # Primary — must carry >=70% of the visual weight
    "garnet": "#782f40",
    "gold": "#ceb888",
    "white": "#ffffff",
    # Secondary
    "stadium-night": "#101820",
    "plaza-brick": "#572932",
    "gulf-sands": "#dfd1a7",
    # Accent — small doses only
    "legacy-blue": "#425563",
    "westcott-water": "#5cb8b2",
    "vault-garnet": "#a6192e",
    "vault-gold": "#ffc72c",
    # Gold tints
    "gold-1c": "#dacaa6",
    "gold-2c": "#e7dcc4",
    "gold-3c": "#f3ede1",
    # Neutral ramp
    "off-white": "#f4f4f4",
    "neutral-2w": "#d5d4d4",
    "neutral-1w": "#b5b5b4",
    "neutral": "#969594",
    "neutral-2s": "#565554",
    "slate": "#2c2a29",
    "black": "#161514",
}

#: Human-readable names, used in ``<desc>`` and in the CSS comment header.
NAME: dict[str, str] = {
    "garnet": "FSU Garnet",
    "gold": "FSU Gold",
    "white": "White",
    "stadium-night": "Stadium Night",
    "plaza-brick": "Plaza Brick",
    "gulf-sands": "Gulf Sands",
    "legacy-blue": "Legacy Blue",
    "westcott-water": "Westcott Water",
    "vault-garnet": "Vault Garnet",
    "vault-gold": "Vault Gold",
    "gold-1c": "Gold +1 Canvas",
    "gold-2c": "Gold +2 Canvas",
    "gold-3c": "Gold +3 Canvas",
    "off-white": "S3 White",
    "neutral-2w": "Neutral +2 White",
    "neutral-1w": "Neutral +1 White",
    "neutral": "Neutral",
    "neutral-2s": "Neutral +2 Slate",
    "slate": "Slate",
    "black": "Black",
}


def token(key: str) -> str:
    """``token('garnet')`` -> ``var(--fsu-garnet, #782f40)``.

    The only way a colour is allowed into a generated SVG. See the module
    docstring for why the fallback is there.
    """
    if key not in HEX:
        raise KeyError(
            f"{key!r} is not in the FSU palette. Add it to standards/color-palette.md "
            "and to fsu-tokens.css first, then here — not the other way round."
        )
    return f"var(--fsu-{key}, {HEX[key]})"


def hex_of(key: str) -> str:
    """The literal, for contrast maths and for the `<desc>` colour note."""
    return HEX[key]


# ---------------------------------------------------------------------------
# 2. Semantic roles inside a figure. Named, so a generator never picks a colour
#    by eye and a reviewer can see the intent.
# ---------------------------------------------------------------------------

#: The plot panel. A raw token, identical in light and dark — see module docstring.
PANEL = "white"
#: Panel border, so the white panel reads as a panel on a dark page.
PANEL_EDGE = "neutral-2s"
#: Axis lines, ticks, and the frame.
AXIS = "neutral-2s"
#: Gridlines. Decorative; never the only way to read a value (the table is).
GRID = "neutral-2w"
#: Axis labels, tick labels, captions. 7.44:1 on white.
LABEL_MUTED = "neutral-2s"
#: Series labels, node labels, anything that carries meaning. 14.28:1 on white.
LABEL = "slate"
#: Emphasised in-figure text. 18.24:1 on white.
LABEL_STRONG = "black"
#: The "this is the answer" mark. 9.21:1 on white.
HIGHLIGHT = "garnet"
#: The "this was rejected / discarded" mark, always paired with a dash + a word.
REJECT = "neutral-2s"


# ---------------------------------------------------------------------------
# 3. Series
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Series:
    """One plot series: a colour plus the two non-colour channels it must carry.

    ``dash`` is an SVG ``stroke-dasharray`` (``None`` = solid) and ``marker`` is
    one of the shapes ``svgkit.marker()`` knows how to draw. Both are required
    so that removing colour entirely still leaves the series distinguishable
    (WCAG 1.4.1).
    """

    key: str          # palette key
    label: str        # the name a human uses for it in prose
    dash: str | None  # stroke-dasharray, or None for solid
    marker: str       # circle | square | triangle | diamond | cross | plus
    on_white: float   # measured ratio against white, from color-palette.md

    @property
    def color(self) -> str:
        return token(self.key)

    @property
    def hex(self) -> str:
        return HEX[self.key]


#: Draw order from color-palette.md §5, for FILLED AREAS (bars, regions,
#: swatches). Every fill gets a dark outline and a dark label, so the light
#: members of the sequence are legible.
SERIES: tuple[Series, ...] = (
    Series("garnet", "garnet", None, "circle", 9.21),
    Series("gold", "gold", "7 4", "square", 1.94),
    Series("plaza-brick", "plaza brick", "2 3", "triangle", 11.87),
    Series("gulf-sands", "gulf sands", "10 3 2 3", "diamond", 1.52),
    Series("legacy-blue", "legacy blue", "5 3", "cross", 7.75),
    Series("westcott-water", "westcott water", "1 3", "plus", 2.35),
)

#: Draw order for LINES AND MARKERS on the white panel. §5's order with the
#: members below 3:1 on white dropped (1.4.11), then the neutral ramp appended
#: so six line series are still available. See the module docstring.
LINE_SERIES: tuple[Series, ...] = (
    Series("garnet", "garnet", None, "circle", 9.21),
    Series("plaza-brick", "plaza brick", "7 4", "square", 11.87),
    Series("legacy-blue", "legacy blue", "2 3", "triangle", 7.75),
    Series("slate", "slate", "10 3 2 3", "diamond", 14.28),
    Series("neutral-2s", "neutral slate", "5 3", "cross", 7.44),
    Series("black", "black", "1 3", "plus", 18.24),
)


def line_series(i: int) -> Series:
    """Line series *i*, cycling. Prefer <= 6 series; beyond that, split the chart."""
    return LINE_SERIES[i % len(LINE_SERIES)]


def fill_series(i: int) -> Series:
    """Filled-area series *i*, cycling, in color-palette.md §5 order."""
    return SERIES[i % len(SERIES)]


# ---------------------------------------------------------------------------
# 4. Contrast — measured, never estimated
# ---------------------------------------------------------------------------


def _linear(channel: int) -> float:
    c = channel / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_string: str) -> float:
    """WCAG 2.x relative luminance of an sRGB hex colour."""
    h = hex_string.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def contrast(a: str, b: str) -> float:
    """Contrast ratio between two hex colours. ``(L_lighter + .05)/(L_darker + .05)``."""
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def contrast_keys(a: str, b: str) -> float:
    """Contrast ratio between two palette keys."""
    return contrast(HEX[a], HEX[b])


#: Every ratio this pipeline is allowed to quote, transcribed from
#: standards/color-palette.md §2. ``self_check()`` re-measures all of them; if
#: one drifts the build stops. Nothing outside this table may be cited.
PUBLISHED_RATIOS: tuple[tuple[str, str, float], ...] = (
    ("black", "white", 18.24),
    ("stadium-night", "white", 17.89),
    ("slate", "white", 14.28),
    ("plaza-brick", "white", 11.87),
    ("garnet", "white", 9.21),
    ("legacy-blue", "white", 7.75),
    ("neutral-2s", "white", 7.44),
    ("black", "gold-3c", 15.64),
    ("slate", "gold-3c", 12.25),
    ("garnet", "gold-3c", 7.90),
    ("neutral-2s", "gold-3c", 6.38),
    ("white", "garnet", 9.21),
    ("gold", "garnet", 4.75),
    ("black", "gold", 9.41),
    ("slate", "gold", 7.37),
    ("plaza-brick", "gold", 6.13),
    ("white", "stadium-night", 17.89),
    ("gold", "stadium-night", 9.23),
    ("white", "plaza-brick", 11.87),
    ("white", "legacy-blue", 7.75),
    ("gold", "plaza-brick", 6.13),
    # From §3, "never use these" — asserted so a regression is caught too.
    ("white", "gold", 1.94),
    ("neutral", "white", 2.99),
)

#: One published number this pipeline could not reproduce.
#:
#: standards/color-palette.md §3 prints "Neutral +1 White `#B5B5B4` on white —
#: 1.97:1". Re-measured here and independently with the repository's own
#: ``tools/contrast.py``, the same formula gives **2.05:1**.
#:
#: Nothing is affected: both numbers are far below every threshold and §3's
#: verdict ("borders only") stands either way. It is recorded rather than
#: silently corrected because color-palette.md is the source of truth and
#: AUTHORING-CONTRACT §8 forbids quoting an unpublished ratio — so this
#: pipeline quotes neither value, and the discrepancy is somebody's to resolve
#: with ``python3 tools/contrast.py``.
DISPUTED_RATIOS: tuple[tuple[str, str, float, float], ...] = (
    ("neutral-1w", "white", 1.97, 2.05),
)

#: The 1.4.11 floor for a meaningful graphic (a plot line, a node fill edge, a
#: region boundary). Text has its own, higher, floor.
GRAPHIC_MIN = 3.0
#: The 1.4.3 floor for normal-size text.
TEXT_MIN = 4.5


def ratio_text(fg_key: str, bg_key: str = "white") -> str:
    """``'9.21:1'`` for a pairing that color-palette.md publishes; raises otherwise.

    Deliberately refuses to format an unpublished pairing. AUTHORING-CONTRACT §8:
    "Never claim a contrast ratio that is not in color-palette.md."
    """
    for fg, bg, value in PUBLISHED_RATIOS:
        if fg == fg_key and bg == bg_key:
            return f"{value:.2f}:1"
    raise KeyError(
        f"{NAME.get(fg_key, fg_key)} on {NAME.get(bg_key, bg_key)} is not published in "
        "standards/color-palette.md. Measure it there with tools/contrast.py first."
    )


# ---------------------------------------------------------------------------
# 5. Self-check
# ---------------------------------------------------------------------------


def self_check() -> list[str]:
    """Return a list of problems. Empty list means the palette is consistent."""
    problems: list[str] = []

    for fg, bg, published in PUBLISHED_RATIOS:
        measured = contrast_keys(fg, bg)
        if abs(measured - published) > 0.005:
            problems.append(
                f"{NAME[fg]} on {NAME[bg]}: color-palette.md says {published:.2f}:1, "
                f"measured {measured:.2f}:1"
            )

    for i, s in enumerate(SERIES):
        measured = contrast_keys(s.key, "white")
        if abs(measured - s.on_white) > 0.005:
            problems.append(
                f"SERIES[{i}] {NAME[s.key]}: on_white recorded {s.on_white}, measured {measured:.2f}"
            )

    for i, s in enumerate(LINE_SERIES):
        measured = contrast_keys(s.key, "white")
        if measured < GRAPHIC_MIN:
            problems.append(
                f"LINE_SERIES[{i}] {NAME[s.key]} is {measured:.2f}:1 on white, below the "
                f"{GRAPHIC_MIN}:1 floor for a meaningful graphic (WCAG 1.4.11)."
            )

    for role, key, floor, why in (
        ("LABEL", LABEL, TEXT_MIN, "figure text, WCAG 1.4.3"),
        ("LABEL_MUTED", LABEL_MUTED, TEXT_MIN, "axis and tick labels are normal-size text"),
        ("LABEL_STRONG", LABEL_STRONG, TEXT_MIN, "figure text, WCAG 1.4.3"),
        ("AXIS", AXIS, GRAPHIC_MIN, "axis lines are meaningful graphics, WCAG 1.4.11"),
        ("HIGHLIGHT", HIGHLIGHT, GRAPHIC_MIN, "the answer mark is a meaningful graphic"),
        ("PANEL_EDGE", PANEL_EDGE, GRAPHIC_MIN, "the panel border is a meaningful graphic"),
    ):
        measured = contrast_keys(key, PANEL)
        if measured < floor:
            problems.append(
                f"role {role} = {NAME[key]} is {measured:.2f}:1 on the panel, below {floor}:1 ({why})."
            )

    # Brand rules that are easy to break by accident (color-palette.md §1).
    if HEX["garnet"] != "#782f40" or HEX["gold"] != "#ceb888":
        problems.append("FSU Garnet and FSU Gold must not be re-tinted.")

    seen = [s.key for s in LINE_SERIES]
    if len(set(seen)) != len(seen):
        problems.append("LINE_SERIES repeats a colour; six series need six colours.")
    dashes = [s.dash for s in LINE_SERIES]
    if len(set(map(str, dashes))) != len(dashes):
        problems.append("LINE_SERIES repeats a dash pattern; the non-colour channel collides.")
    markers = [s.marker for s in LINE_SERIES]
    if len(set(markers)) != len(markers):
        problems.append("LINE_SERIES repeats a marker shape; the non-colour channel collides.")

    return problems


def main() -> int:
    problems = self_check()
    print("FSU palette self-check")
    print("=" * 58)
    print(f"{len(HEX)} colours, {len(PUBLISHED_RATIOS)} published ratios re-measured.\n")

    print("Line series (must each clear 3:1 on white — WCAG 1.4.11):")
    for i, s in enumerate(LINE_SERIES, 1):
        print(
            f"  {i}. {NAME[s.key]:18s} {s.hex}  {contrast_keys(s.key, 'white'):5.2f}:1  "
            f"dash={s.dash or 'solid':<10s} marker={s.marker}"
        )
    print("\nFilled-area series (color-palette.md §5 order; dark outline + dark label):")
    for i, s in enumerate(SERIES, 1):
        print(f"  {i}. {NAME[s.key]:18s} {s.hex}  {contrast_keys(s.key, 'white'):5.2f}:1 on white")

    for fg, bg, published, measured in DISPUTED_RATIOS:
        print(
            f"\nNOTE  {NAME[fg]} on {NAME[bg]}: color-palette.md §3 prints "
            f"{published:.2f}:1, measured {measured:.2f}:1 (also by tools/contrast.py). "
            "Both fail every threshold, so no artefact depends on it; this pipeline "
            "quotes neither."
        )

    if problems:
        print("\nPROBLEMS")
        for p in problems:
            print(f"  - {p}")
        return 1

    print("\nOK — every published ratio matches, every role clears its floor.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
