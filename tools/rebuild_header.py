#!/usr/bin/env python3
"""rebuild_header.py — two-row header with sticky chapter dropdowns.

WHAT CHANGED AND WHY
--------------------
The old header was one row holding the wordmark, nine module links and a
three-radio theme switch. Everything competed for one line, so the module
labels shortened to "M0 … M7" to fit and the theme switch was wherever the
flex run left room.

The new shape is the two-row header the explorable-explainer layout laws
describe, with one addition the course structure needs:

    +-------------------------------------------------------------+
    |  ISC 4221C  Discrete Algorithms          [Auto|Light|Dark]  |  row 1
    +-------------------------------------------------------------+
    |  Home | Module 0 v  Module 1 v  …  Module 7 v | Threads  |  row 2, sticky
    +-------------------------------------------------------------+

Row 1 is identity and utilities, with the theme switch pushed to the right
edge. It scrolls away. Row 2 is module navigation, sticks to the top of the
viewport, and never wraps — every module is visible at once, with its sections
behind a dropdown rather than spilled onto the strip.

The CSS/JS identifiers stay `chapter-nav` / `chapter-menu`. That is not a
mismatch to tidy up: `.module-nav` is already taken by the sidebar "On this
page" navigation, and reusing it here would collide. The domain word in
everything a READER sees is "module".

ROW 2 IS A SIBLING OF <header>, NOT A CHILD OF IT. This is the whole reason
sticky works. A sticky element is confined to its parent's box, so a sticky
row inside a 126px-tall <header> sticks for 85px of scroll and then leaves
with it — which looked exactly like sticky being ignored. Its parent has to be
<body> for it to have the page to stick to.

The dropdown contents come from `assets/js/nav-map.js`, generated from the
pages themselves by tools/generate_nav_map.py, so a renamed section cannot
leave a stale menu entry behind. The markup written here is only the buttons
and the empty menu containers; nav.js fills them at runtime.

Idempotent: a page already carrying the new header is skipped.

    python3 tools/rebuild_header.py [--check]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The new shape closes </header> BEFORE the nav. An older revision has the
# nav inside, so this string is what distinguishes them.
MARKER = '</header>\n\n<!-- ROW 2 — modules.'
# Matches the header AND any sibling chapter-nav that follows it, so a page
# carrying an earlier revision is replaced whole rather than accumulating a
# second strip.
HEADER_RE = re.compile(
    r"<header class=\"site-header\">.*?</header>"
    r"(?:\s*<!--[^>]*?-->)*"
    r"(?:\s*<nav class=\"chapter-nav\".*?</nav>)?",
    re.S,
)

def chapters() -> list[tuple[str, str, str]]:
    return [
        ("m0-foundations.html", "Module 0", "M0"),
        ("m1-algorithm-design.html", "Module 1", "M1"),
        ("m2-probability.html", "Module 2", "M2"),
        ("m3-graphs.html", "Module 3", "M3"),
        ("m4-image-processing.html", "Module 4", "M4"),
        ("m5-data-mining.html", "Module 5", "M5"),
        ("m6-computational-geometry.html", "Module 6", "M6"),
        ("m7-discrete-optimization.html", "Module 7", "M7"),
    ]


def build_header(prefix: str) -> str:
    """`prefix` is '' for a top-level page, '../' for cross-cutting/."""
    items = []
    for file, label, short in chapters():
        slug = file.split("-")[0]                      # m0 … m7
        items.append(f"""        <li class="chapter-nav__item" data-chapter="{slug}">
          <button class="chapter-nav__button"
                  type="button"
                  id="chapbtn-{slug}"
                  aria-expanded="false"
                  aria-controls="chapmenu-{slug}"
                  data-chapter-file="{prefix}{file}">
            <span class="chapter-nav__full">{label}</span>
            <span class="chapter-nav__short" aria-hidden="true">{short}</span>
            <span class="chapter-nav__caret" aria-hidden="true"></span>
          </button>
          <div class="chapter-nav__menu" id="chapmenu-{slug}" role="group"
               aria-labelledby="chapbtn-{slug}" hidden></div>
        </li>""")
    chapter_items = "\n".join(items)

    return f"""<header class="site-header">
  <!-- ROW 1 — identity and utilities. Scrolls away with the page. -->
  <div class="site-header__bar">
    <div class="site-header__bar-inner wrap">
      <a class="brand" href="{prefix}index.html">
        <span>
          <span class="brand__code">ISC 4221C</span>
          <span class="brand__name">Discrete Algorithms · Spring 2026</span>
        </span>
      </a>

      <!-- Pushed to the right edge by margin-inline-start:auto, not by a
           spacer element. Ships `hidden`; theme.js reveals it, so a reader
           without the script never sees a control that cannot work. -->
      <fieldset class="theme-switch" hidden>
        <legend class="theme-switch__legend">Theme</legend>
        <span class="theme-switch__option">
          <input class="theme-switch__input" type="radio" name="theme" id="theme-system" value="system" checked>
          <label class="theme-switch__label" for="theme-system">Auto</label>
        </span>
        <span class="theme-switch__option">
          <input class="theme-switch__input" type="radio" name="theme" id="theme-light" value="light">
          <label class="theme-switch__label" for="theme-light">Light</label>
        </span>
        <span class="theme-switch__option">
          <input class="theme-switch__input" type="radio" name="theme" id="theme-dark" value="dark">
          <label class="theme-switch__label" for="theme-dark">Dark</label>
        </span>
      </fieldset>
    </div>
  </div>

</header>

<!-- ROW 2 — modules. Sticky, and it never wraps: every module is visible at
     once, its sections behind a dropdown rather than spilled onto the strip.
     nav.js fills each .chapter-nav__menu from window.NAV_MAP.

     OUTSIDE <header> on purpose. A sticky element cannot leave its parent's
     box, so while this lived inside the two-row <header> it stuck for the
     header's own 85px of height and then scrolled away with it. Its parent has
     to be <body>. -->
<nav class="chapter-nav" aria-label="Modules">
  <div class="chapter-nav__inner wrap">
    <ul class="chapter-nav__list">
        <li class="chapter-nav__item chapter-nav__item--plain">
          <a class="chapter-nav__link" href="{prefix}index.html">Home</a>
        </li>
{chapter_items}
        <li class="chapter-nav__item chapter-nav__item--plain chapter-nav__item--sep"
            data-chapter="threads">
          <button class="chapter-nav__button"
                  type="button"
                  id="chapbtn-threads"
                  aria-expanded="false"
                  aria-controls="chapmenu-threads">
            <span class="chapter-nav__full">Threads</span>
            <span class="chapter-nav__short" aria-hidden="true">Thr</span>
            <span class="chapter-nav__caret" aria-hidden="true"></span>
          </button>
          <div class="chapter-nav__menu" id="chapmenu-threads" role="group"
               aria-labelledby="chapbtn-threads" hidden></div>
        </li>
      </ul>
    </div>
</nav>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    targets = sorted(ROOT.glob("*.html")) + sorted((ROOT / "cross-cutting").glob("*.html"))
    changed, skipped, missing = [], [], []

    for path in targets:
        html = path.read_text(encoding="utf-8")
        if MARKER in html:
            skipped.append(path)
            continue
        if not HEADER_RE.search(html):
            missing.append(path)
            continue
        prefix = "../" if path.parent.name == "cross-cutting" else ""
        out = HEADER_RE.sub(lambda _m: build_header(prefix), html, count=1)
        changed.append(path)
        if not args.check:
            path.write_text(out, encoding="utf-8")

    verb = "would rebuild" if args.check else "rebuilt"
    for p in changed:
        print(f"{verb}: {p.relative_to(ROOT)}")
    if skipped:
        print(f"already new header: {len(skipped)} page(s)")
    for p in missing:
        print(f"NO <header class=\"site-header\">: {p.relative_to(ROOT)}", file=sys.stderr)
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
