#!/usr/bin/env python3
"""demodulize.py — turn the ES-module runtime into classic scripts.

WHY THIS EXISTS
---------------
Chrome and Firefox refuse to load `<script type="module">` from a `file://`
address: the origin is opaque, so the module's CORS check fails before the
file is ever read. The dashboard was therefore server-only, and a reader who
double-clicked `index.html` got the page with none of its behaviour — no
search, no theme switch, and every interactive replaced by its static
fallback.

"Works offline" and "works by opening the file" are not the same claim. The
explorable-explainer skill states the rule plainly: no modules and no fetch.
This script converts the runtime to satisfy it.

WHAT IT DOES
------------
Each module becomes an IIFE that publishes one global:

    (function (global) {
      'use strict';
      ...original body, `export` stripped...
      global.Demo = { createDemo, svgEl, ... };
    })(window);

`'use strict'` is not decoration. Module bodies are implicitly strict; a
classic script is not, so dropping it would silently change the semantics of
every file at once.

Cross-file `import` lines become destructuring from the publisher's global,
which is safe because the HTML loads the files in dependency order with
`defer` (deferred classic scripts execute in document order).

The script is idempotent: a file that already carries the banner is skipped.

    python3 tools/demodulize.py [--check]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "assets" / "js"

BANNER = "/* Classic script (no ES modules) — see tools/demodulize.py. */"

# module file -> the global it publishes
PUBLISHES = {
    "theme.js": "Theme",
    "nav.js": "Nav",
    "search-index.js": "SearchIndex",
    "search.js": "Search",
    "demo.js": "Demo",
}

# `import { a, b } from './x.js'` -> `const { a, b } = window.<Global>;`
RESOLVE = {
    "./search-index.js": "SearchIndex",
    "../demo.js": "Demo",
}

IMPORT_RE = re.compile(
    r"^import\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"];?\s*$", re.M
)
EXPORT_DEFAULT_RE = re.compile(r"^export\s+default\s+[^;]+;\s*$", re.M)
EXPORT_LIST_RE = re.compile(r"^export\s*\{([^}]*)\};?\s*$", re.M)
EXPORT_DECL_RE = re.compile(r"^export\s+(?=(?:function|const|let|var|class)\b)", re.M)
DECL_NAME_RE = re.compile(
    r"^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)",
    re.M,
)


def transform(source: str, publishes: str | None) -> str | None:
    """Return the rewritten source, or None if it is already converted."""
    if source.lstrip().startswith(BANNER):
        return None

    names: list[str] = [m.group(1) for m in DECL_NAME_RE.finditer(source)]
    for m in EXPORT_LIST_RE.finditer(source):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            # `export { a as b }` publishes b
            names.append(part.split(" as ")[-1].strip())

    body = source

    def _import(m: re.Match) -> str:
        spec = m.group(2)
        target = RESOLVE.get(spec)
        if target is None:
            raise SystemExit(f"demodulize: unmapped import target {spec!r}")
        return f"const {{{m.group(1)}}} = window.{target};"

    body = IMPORT_RE.sub(_import, body)
    body = EXPORT_DEFAULT_RE.sub("", body)
    body = EXPORT_LIST_RE.sub("", body)
    body = EXPORT_DECL_RE.sub("", body)

    # Indentation is deliberately NOT added. Re-indenting 4,000 lines would
    # bury the real change in whitespace and make every future diff useless.
    out = [BANNER, "(function (global) {", "'use strict';", "", body.rstrip(), ""]
    if publishes and names:
        seen: list[str] = []
        for n in names:
            if n not in seen:
                seen.append(n)
        out.append(f"global.{publishes} = {{ {', '.join(seen)} }};")
    out.append("})(window);")
    return "\n".join(out) + "\n"


def globals_for(path: Path) -> str | None:
    if path.parent.name == "demos":
        # Demo files publish nothing; they self-register on load.
        return None
    return PUBLISHES.get(path.name)


def targets() -> list[Path]:
    files = [JS / n for n in PUBLISHES]
    files += sorted((JS / "demos").glob("*.js"))
    return files


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report, do not write")
    args = ap.parse_args()

    changed, already = [], []
    for path in targets():
        if not path.exists():
            print(f"missing: {path.relative_to(ROOT)}", file=sys.stderr)
            return 1
        source = path.read_text(encoding="utf-8")
        result = transform(source, globals_for(path))
        if result is None:
            already.append(path)
            continue
        changed.append(path)
        if not args.check:
            path.write_text(result, encoding="utf-8")

    verb = "would convert" if args.check else "converted"
    for p in changed:
        print(f"{verb}: {p.relative_to(ROOT)}")
    if already:
        print(f"already classic: {len(already)} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
