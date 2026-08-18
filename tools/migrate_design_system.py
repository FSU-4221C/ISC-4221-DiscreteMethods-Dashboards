#!/usr/bin/env python3
"""migrate_design_system.py — bring the fifteen content pages onto the 2026
design system (``../standards/design-system.md``).

    python3 Dashboard/tools/migrate_design_system.py --dry-run
    python3 Dashboard/tools/migrate_design_system.py

Four mechanical edits, each of which would otherwise be fifteen hand-edits of a
250KB file:

  1. ``data-surface="dark"`` comes off ``.site-header``.
     The masthead is no longer a garnet fill, so that attribute would flip the
     focus ring to FSU Gold *on white* — 1.94:1, an invisible focus indicator,
     failing 2.4.7 and 1.4.11 at once. This is the one edit that is a defect
     rather than a preference, and it is why the script exists.

  2. Two labels per nav item (design-system.md §6.3, Law 2).
     The short form is aria-hidden decoration; the full form is only ever
     hidden visually, so the accessible name never collapses to "M3".

  3. A hairline group separator between Home and the module run.

  4. The coverage legend becomes a single row whose definitions appear on
     hover or focus, with every <dt> wired to its <dd> by aria-describedby so
     a screen reader gets the definition whether or not anything is hovered.

IDEMPOTENT. Every edit checks for its own output first, so a second run
reports "0 changed" and leaves timestamps alone — the same contract build.py
holds itself to. Run it twice; the second run is the test.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

DASHBOARD = Path(__file__).resolve().parent.parent

# The nav strip. Short form is what shows when the viewport narrows; full form
# is the accessible name at every width.
NAV_LABELS: dict[str, tuple[str, str]] = {
    "index.html":                    ("Home", "Course home"),
    "m0-foundations.html":           ("M0", "M0 · Foundations"),
    "m1-algorithm-design.html":      ("M1", "M1 · Algorithm Design"),
    "m2-probability.html":           ("M2", "M2 · Probability"),
    "m3-graphs.html":                ("M3", "M3 · Graphs"),
    "m4-image-processing.html":      ("M4", "M4 · Image Processing"),
    "m5-data-mining.html":           ("M5", "M5 · Data Mining"),
    "m6-computational-geometry.html":("M6", "M6 · Computational Geometry"),
    "m7-discrete-optimization.html": ("M7", "M7 · Discrete Optimization"),
}

# Coverage markers, in the order they appear in the legend. The glyph and the
# word both come from the existing markup; only the wrapper changes.
LEGEND_ORDER = ["full", "partial", "lab", "new", "exam", "none", "slides"]


def pages() -> list[Path]:
    found = sorted(DASHBOARD.glob("*.html")) + sorted(
        (DASHBOARD / "cross-cutting").glob("*.html")
    )
    return [p for p in found if p.name != "_TEMPLATE.html"] + [
        DASHBOARD / "_TEMPLATE.html"
    ]


# --------------------------------------------------------------------------
# 1. The focus-ring defect
# --------------------------------------------------------------------------

def drop_header_dark_surface(html: str) -> str:
    return html.replace(
        '<header class="site-header" data-surface="dark">',
        '<header class="site-header">',
    )


# --------------------------------------------------------------------------
# 2 + 3. Law 2 — two labels per item, and the group separator
# --------------------------------------------------------------------------

NAV_LINK_RE = re.compile(
    r'<li([^>]*)><a class="primary-nav__link" href="([^"]+)">([^<]+)</a></li>'
)


def rewrite_nav(html: str) -> str:
    def one(m: re.Match[str]) -> str:
        li_attrs, href, _old_label = m.group(1), m.group(2), m.group(3)
        key = href.rsplit("/", 1)[-1]
        if key not in NAV_LABELS:
            return m.group(0)
        short, full = NAV_LABELS[key]

        # A hairline between "Home" and the module run, so nine items do not
        # read as one undifferentiated string.
        cls = ' class="primary-nav__sep"' if key == "m0-foundations.html" else ""
        if "primary-nav__sep" in li_attrs:
            cls = ""

        return (
            f"<li{li_attrs}{cls}><a class=\"primary-nav__link\" href=\"{href}\">"
            f'<span class="primary-nav__short" aria-hidden="true">{short}</span>'
            f'<span class="primary-nav__full">{full}</span>'
            f"</a></li>"
        )

    return NAV_LINK_RE.sub(one, html)


# --------------------------------------------------------------------------
# 4. The coverage legend
# --------------------------------------------------------------------------

LEGEND_PAIR_RE = re.compile(
    r'<dt>(?P<pill><span class="pill pill--(?P<kind>[a-z]+)">.*?</span>)</dt>\s*'
    r"<dd>(?P<desc>.*?)</dd>",
    re.S,
)

DIV_TAG_RE = re.compile(r"<(/?)div\b[^>]*>", re.I)


def _legend_span(html: str) -> tuple[int, int] | None:
    """Byte span of the whole ``<div class="coverage-legend">…</div>``.

    Found by counting <div> depth, NOT by a regex ending in ``</dl>\\s*</div>``.
    That regex is what broke m0 and m7: both pages carry an extra paragraph
    inside the legend after the list, so the anchor failed at the real closing
    tag, `(.*?)` happily backtracked to the NEXT </dl> further down the page,
    and the substitution swallowed a topic section and one </div> with it. The
    missing </div> then closed <main> early and eleven topic sections escaped
    the layout grid onto <body>.

    A depth counter cannot do that. Anything that must know where a container
    ends should count, not pattern-match.
    """
    start = html.find('<div class="coverage-legend">')
    if start == -1:
        return None

    depth = 0
    for match in DIV_TAG_RE.finditer(html, start):
        depth += -1 if match.group(1) else 1
        if depth == 0:
            return start, match.end()
    return None       # unbalanced input; leave it alone rather than guess


def rewrite_legend(html: str, slug: str) -> str:
    span = _legend_span(html)
    if span is None:
        return html
    start, end = span
    block = html[start:end]

    if "coverage-legend__item" in block:
        return html   # already migrated

    if "<strong>Coverage markers</strong>" not in block:
        return html

    items: list[str] = []
    for pair in LEGEND_PAIR_RE.finditer(block):
        kind = pair.group("kind")
        desc = pair.group("desc").strip()
        pill = pair.group("pill")
        dd_id = f"legend-{slug}-{kind}"

        # tabindex on the pill gives keyboard users parity with hover, which
        # 1.4.13 requires. aria-describedby means the definition is announced
        # regardless — the popover is a convenience for sighted users, not the
        # only copy of the information.
        pill = pill.replace(
            '<span class="pill ',
            f'<span tabindex="0" aria-describedby="{dd_id}" class="pill ',
            1,
        )
        items.append(
            f'          <div class="coverage-legend__item">\n'
            f"            <dt>{pill}</dt>\n"
            f'            <dd id="{dd_id}">{desc}</dd>\n'
            f"          </div>"
        )

    if not items:
        return html

    # Anything the page put inside the legend AFTER the list — m0 and m7 each
    # carry a paragraph explaining why a marker is absent — is real editorial
    # content and is kept, below the row.
    tail = ""
    after_dl = block.rfind("</dl>")
    if after_dl != -1:
        trailing = block[after_dl + len("</dl>"):]
        trailing = re.sub(r"</div>\s*$", "", trailing).strip()
        if trailing:
            tail = f"\n      <div class=\"coverage-legend__note\">{trailing}</div>"

    replacement = (
        '<div class="coverage-legend">\n'
        '      <p class="coverage-legend__intro" id="coverage-legend-intro">'
        "Coverage markers</p>\n"
        '      <dl aria-labelledby="coverage-legend-intro">\n'
        + "\n".join(items)
        + "\n      </dl>"
        + tail
        + "\n    </div>"
    )

    return html[:start] + replacement + html[end:]


# --------------------------------------------------------------------------

def migrate(path: Path) -> tuple[bool, list[str]]:
    original = path.read_text(encoding="utf-8")
    html = original
    did: list[str] = []

    step = drop_header_dark_surface(html)
    if step != html:
        did.append("header: dropped data-surface=dark")
        html = step

    step = rewrite_nav(html)
    if step != html:
        did.append("nav: two labels per item + group separator")
        html = step

    step = rewrite_legend(html, path.stem.replace("_", "-"))
    if step != html:
        did.append("legend: single row with hover/focus definitions")
        html = step

    if html == original:
        return False, []
    path.write_text(html, encoding="utf-8")
    return True, did


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    changed = 0
    for path in pages():
        if not path.exists():
            continue
        if args.dry_run:
            before = path.read_text(encoding="utf-8")
            after = rewrite_legend(
                rewrite_nav(drop_header_dark_surface(before)),
                path.stem.replace("_", "-"),
            )
            if after != before:
                changed += 1
                print(f"would change  {path.relative_to(DASHBOARD)}")
            continue

        did, notes = migrate(path)
        if did:
            changed += 1
            print(f"changed  {path.relative_to(DASHBOARD)}")
            for n in notes:
                print(f"           {n}")

    print(f"\n{changed} file(s) {'would change' if args.dry_run else 'changed'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
