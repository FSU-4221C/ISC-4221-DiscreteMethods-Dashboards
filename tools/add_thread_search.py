#!/usr/bin/env python3
"""add_thread_search.py — give the cross-cutting pages a search box.

The five thread pages under cross-cutting/ had no `[data-search]` block at
all, so "search the whole site" was not true: land on a thread page and the
only way out was the header. Every other page carries one.

The block is the same one the module pages use, with page-unique ids, inserted
at the top of `<main>`. `fix_script_tags.py` keys the search scripts off the
presence of `data-search`, so run it afterwards to load them.

`data-search-base="../"` matters: the search index stores root-relative urls,
which is the only stable thing to store, so a result opened from one level
down needs the prefix. Without it every result on a thread page 404s.

Idempotent.

    python3 tools/add_thread_search.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THREADS = ROOT / "cross-cutting"

MAIN_RE = re.compile(r"(<main\b[^>]*>)", re.I)


def block(slug: str) -> str:
    return f"""
    <!-- Search. Every page carries one; a reader who lands here from a link
         should not have to go back to the home page to look something up.
         Ids are page-unique because two [data-search] blocks on one page
         would otherwise share a label target. -->
    <section class="search search--inline" data-search data-search-limit="8"
             data-search-base="../"
             aria-label="Search the course">
      <form class="search__form" role="search">
        <div class="search__field">
          <label class="search__label" for="{slug}-search">Search all topics</label>
          <input class="search__input" id="{slug}-search" name="q" type="search"
                 autocomplete="off" spellcheck="false" data-search-input>
        </div>
      </form>
      <p class="search__status" role="status" aria-live="polite" data-search-status></p>
      <ul class="search__results" data-search-results aria-label="Search results"></ul>
      <p class="search__nojs">Search is not running. JavaScript is switched off,
         or a script file is missing.</p>
    </section>
"""


def main() -> int:
    changed, skipped = [], []
    for path in sorted(THREADS.glob("*.html")):
        html = path.read_text(encoding="utf-8")
        if "data-search" in html:
            skipped.append(path)
            continue
        m = MAIN_RE.search(html)
        if not m:
            print(f"no <main> in {path.name}", file=sys.stderr)
            return 1
        slug = path.stem
        out = html[: m.end()] + block(slug) + html[m.end():]
        path.write_text(out, encoding="utf-8")
        changed.append(path)

    for p in changed:
        print(f"added search: cross-cutting/{p.name}")
    if skipped:
        print(f"already had search: {len(skipped)} page(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
