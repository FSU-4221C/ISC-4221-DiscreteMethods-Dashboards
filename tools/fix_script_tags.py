#!/usr/bin/env python3
"""fix_script_tags.py — point every page at the classic-script runtime.

Companion to `demodulize.py`. Rewrites the script block at the foot of each
page into one `defer` list in dependency order:

    core/gfx.js             canvas stage, drag handles, palette bridge
    vendor/prism.js         local Prism tokenizer (data-manual; no autoload)
    highlight.js            colours .code-block listings from the lang label
    theme.js                reads the stored theme; must run before anything paints
    nav-map.js         the generated chapter/section map
    nav.js             builds the chapter dropdowns from it
    search-index.js    only where the page has a [data-search] block
    search.js          ditto; reads window.SearchIndex, so it comes after
    demo.js            publishes window.Demo
    demos/<page>.js    self-registers against it

`defer` matters twice over: it keeps execution in document order, which is
what makes the dependency order above sufficient, and it defers execution
until the document is parsed, which is the one behaviour of `type="module"`
worth keeping.

The cross-cutting/ pages are included, with a `../` prefix. They were missed
on the first pass and were still carrying `type="module"`, which meant five
pages stayed broken under `file://` while the audit — which only globbed the
root — reported everything green. The audit now walks both directories too.

Idempotent: re-running finds the block already in this shape and does nothing.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Loaded on every page, in this order.
CORE = [
    "assets/js/core/gfx.js",
    "assets/js/vendor/prism.js",
    "assets/js/highlight.js",
    "assets/js/theme.js",
    "assets/js/nav-map.js",
    "assets/js/nav.js",
]

# Loaded only where the page actually has a search box. search-index.js is
# large, and a thread page that cannot search should not pay for it.
SEARCH = [
    "assets/js/search-index.js",
    "assets/js/search.js",
]

RUNTIME = ["assets/js/demo.js"]

BLOCK_RE = re.compile(
    r"(?:[ \t]*<script(?:\s+(?:type=\"module\"|defer|data-manual))*\s+src=\"(?:\.\./)?assets/js/[^\"]+\"></script>\s*\n)+"
)
DEMO_SRC_RE = re.compile(r"src=\"(?:\.\./)?(assets/js/demos/[^\"]+)\"")


def rewrite(html: str, prefix: str) -> str | None:
    match = BLOCK_RE.search(html)
    if match is None:
        return None

    block = match.group(0)
    page_demos = DEMO_SRC_RE.findall(block)

    wanted = list(CORE)
    if "data-search" in html:
        wanted += SEARCH
    wanted += RUNTIME + page_demos

    lines = []
    for src in wanted:
        extra = ' data-manual' if src.endswith("vendor/prism.js") else ""
        lines.append(f'<script defer{extra} src="{prefix}{src}"></script>')
    replacement = "\n".join(lines) + "\n"
    if block == replacement:
        return None
    return html[: match.start()] + replacement + html[match.end():]


def targets() -> list[Path]:
    return sorted(ROOT.glob("*.html")) + sorted((ROOT / "cross-cutting").glob("*.html"))


def main() -> int:
    changed = 0
    for path in targets():
        prefix = "../" if path.parent.name == "cross-cutting" else ""
        html = path.read_text(encoding="utf-8")
        out = rewrite(html, prefix)
        if out is None:
            continue
        path.write_text(out, encoding="utf-8")
        print(f"updated: {path.relative_to(ROOT)}")
        changed += 1
    print(f"{changed} page(s) updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
