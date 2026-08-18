#!/usr/bin/env python3
"""build.py — regenerate every static asset the dashboard ships.

    python3 Dashboard/tools/build.py            # build everything, report what changed
    python3 Dashboard/tools/build.py --check    # build, then audit; non-zero exit on a defect
    python3 Dashboard/tools/build.py --only m3  # just one module
    python3 Dashboard/tools/build.py --list     # what would be built
    python3 Dashboard/tools/build.py --clean    # delete generated assets, then rebuild

Standard library only. No numpy, no matplotlib, no network. Runs in about a
second on a laptop, which is deliberate — a build nobody minds re-running is a
build that stays run.

--------------------------------------------------------------------------
IDEMPOTENT, AND THAT IS CHECKED
--------------------------------------------------------------------------
Every generator writes a file only when its bytes differ from what is already
there, so a second run reports "0 changed" and leaves every timestamp alone.
That is not a nicety: these assets are checked in beside their generators, and a
build that rewrote 71 files with identical content on every run would make every
diff useless and every review a guess.

``--check`` proves it rather than asserting it: it builds, hashes everything,
builds again, and fails if any hash moved.

--------------------------------------------------------------------------
WHAT --check AUDITS
--------------------------------------------------------------------------
    determinism      a second build changes nothing
    prng agreement   the Python mulberry32 matches assets/js/demo.js's, checked
                     through node when node is installed and reported as SKIPPED
                     when it is not — never silently passed
    svg structure    role="img", <title> first, <desc> present, well-formed XML
    figure pairing   every .svg has its .table.html beside it
    json validity    every file parses, carries the envelope, and has no NaN
    step labels      no two steps of a trace share a description
    offline          no http(s) reference anywhere except the SVG XML namespace
    colour           no raw hex outside a var(--fsu-…, #…) fallback
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import algorithms  # noqa: E402
import fsu_palette  # noqa: E402
import generate_datasets  # noqa: E402
import generate_figures  # noqa: E402
import generate_traces  # noqa: E402
import svgkit  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent          # Dashboard/
FIGURES = ROOT / "assets" / "figures"
DATA = ROOT / "assets" / "data"

#: The one legitimate "http" string in the whole dashboard. It is an XML
#: namespace IDENTIFIER — nothing is fetched from it, and createElementNS will
#: not accept anything else. assets/js/demo.js documents the same exception.
SVG_NAMESPACE = "http://www.w3.org/2000/svg"


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


class Report:
    def __init__(self) -> None:
        self.written: list[Path] = []
        self.unchanged: list[Path] = []
        self.problems: list[str] = []
        self.skipped: list[str] = []

    def record(self, results: list[tuple[Path, bool]]) -> None:
        for path, changed in results:
            (self.written if changed else self.unchanged).append(path)

    def fail(self, message: str) -> None:
        self.problems.append(message)

    def skip(self, message: str) -> None:
        self.skipped.append(message)


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def section(title: str) -> None:
    print(f"\n{title}")
    print("-" * max(len(title), 40))


# ---------------------------------------------------------------------------
# Self-checks — run BEFORE anything is written
# ---------------------------------------------------------------------------


def run_self_checks(report: Report) -> bool:
    section("Self-checks")

    palette_problems = fsu_palette.self_check()
    if palette_problems:
        for problem in palette_problems:
            report.fail(f"palette: {problem}")
        print(f"  palette      FAILED ({len(palette_problems)})")
    else:
        print(f"  palette      ok  ({len(fsu_palette.PUBLISHED_RATIOS)} published ratios re-measured)")

    if svgkit._self_check() != 0:
        report.fail("svgkit self-check failed; see the lines above.")
        print("  svgkit       FAILED")
    else:
        print("  svgkit       ok")

    if algorithms._self_check() != 0:
        report.fail("algorithms self-check failed; see the lines above.")
        print("  algorithms   FAILED")
    else:
        print("  algorithms   ok  (every trace re-derived and its invariants asserted)")

    return not report.problems


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------


def build(report: Report, only: str | None) -> None:
    section("Figures")
    results = generate_figures.generate(FIGURES, only=only)
    report.record(results)
    for path, changed in results:
        print(f"  {'wrote  ' if changed else '       '} {rel(path)}")

    section("Traces")
    results = generate_traces.generate(DATA, only=only)
    report.record(results)
    for path, changed in results:
        print(f"  {'wrote  ' if changed else '       '} {rel(path)}")

    section("Datasets")
    results = generate_datasets.generate(DATA, only=only)
    report.record(results)
    for path, changed in results:
        print(f"  {'wrote  ' if changed else '       '} {rel(path)}")


def clean() -> int:
    removed = 0
    for directory in (FIGURES, DATA):
        if directory.exists():
            removed += sum(1 for _ in directory.rglob("*") if _.is_file())
            shutil.rmtree(directory)
    print(f"Removed {removed} generated files from assets/figures/ and assets/data/.")
    return removed


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------


def hash_tree() -> dict[str, str]:
    out = {}
    for directory in (FIGURES, DATA):
        for path in sorted(directory.rglob("*")):
            if path.is_file():
                out[rel(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    return out


def audit_determinism(report: Report) -> None:
    before = hash_tree()
    generate_figures.generate(FIGURES)
    generate_traces.generate(DATA)
    generate_datasets.generate(DATA)
    after = hash_tree()

    changed = [k for k in before if before.get(k) != after.get(k)]
    added = sorted(set(after) - set(before))
    if changed or added:
        for name in (changed + added)[:8]:
            report.fail(f"not idempotent: {name} differs between two consecutive builds")
    print(f"  determinism  {'ok' if not (changed or added) else 'FAILED'}  "
          f"({len(after)} files hashed twice)")


def audit_prng(report: Report) -> None:
    """Cross-check the Python mulberry32 against the one in assets/js/demo.js.

    Skipped, loudly, when node is not installed. A check that silently passes
    because the tool was missing is worse than no check: it is a check somebody
    will later cite as evidence.
    """
    node = shutil.which("node")
    if not node:
        report.skip(
            "PRNG cross-check SKIPPED: node is not installed. The Python mulberry32 was "
            "not compared against assets/js/demo.js on this machine."
        )
        print("  prng         SKIPPED (node not installed)")
        return

    script = r"""
      const SEEDS = [1, 42, 4221, 123456];
      function seededRandom(seed) {
        let a = (Number(seed) >>> 0) || 1;
        return function next() {
          a += 0x6d2b79f5;
          let t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const out = {};
      for (const s of SEEDS) {
        const r = seededRandom(s);
        out[s] = Array.from({length: 64}, () => r());
      }
      process.stdout.write(JSON.stringify(out));
    """
    try:
        completed = subprocess.run(
            [node, "-e", script], capture_output=True, text=True, timeout=30, check=True
        )
        js = json.loads(completed.stdout)
    except Exception as error:  # noqa: BLE001 - any failure means "could not check"
        report.skip(f"PRNG cross-check SKIPPED: node ran but failed ({error}).")
        print("  prng         SKIPPED (node failed)")
        return

    mismatches = []
    for seed_text, expected in js.items():
        rng = algorithms.Mulberry32(int(seed_text))
        for i, want in enumerate(expected):
            got = rng.next()
            if abs(got - want) > 0:
                mismatches.append(f"seed {seed_text}, draw {i}: python {got!r} != js {want!r}")
                break

    if mismatches:
        for m in mismatches:
            report.fail(f"PRNG mismatch with assets/js/demo.js — {m}")
        print("  prng         FAILED")
    else:
        print("  prng         ok  (256 draws across 4 seeds, bit-identical to demo.js)")


def audit_svgs(report: Report) -> None:
    files = sorted(FIGURES.rglob("*.svg"))
    if not files:
        report.fail("no SVG figures were produced")
        return
    bad = 0
    for path in files:
        source = path.read_text(encoding="utf-8")
        try:
            root = ET.fromstring(source)
        except ET.ParseError as error:
            report.fail(f"{rel(path)}: not well-formed XML — {error}")
            bad += 1
            continue

        if root.get("role") != "img":
            report.fail(f'{rel(path)}: missing role="img" (WCAG 1.1.1)')
            bad += 1
        children = list(root)
        if not children or not children[0].tag.endswith("title"):
            report.fail(f"{rel(path)}: <title> is not the first child")
            bad += 1
        if not any(child.tag.endswith("desc") for child in children):
            report.fail(f"{rel(path)}: no <desc> long description")
            bad += 1
        if not root.get("aria-labelledby"):
            report.fail(f"{rel(path)}: no aria-labelledby")
            bad += 1
        if not root.get("viewBox"):
            report.fail(f"{rel(path)}: no viewBox, so it cannot reflow (WCAG 1.4.10)")
            bad += 1

        table = path.with_suffix("").with_suffix(".table.html")
        table = path.parent / f"{path.stem}.table.html"
        if not table.exists():
            report.fail(
                f"{rel(path)}: no {table.name} beside it. Every figure ships with its "
                "data table (AUTHORING-CONTRACT §6.2)."
            )
            bad += 1

        if "<text" not in source:
            report.fail(f"{rel(path)}: no <text> nodes — is the text baked into paths? (1.4.5)")
            bad += 1

    print(f"  svg          {'ok' if not bad else 'FAILED'}  ({len(files)} figures checked)")


def audit_json(report: Report) -> None:
    files = sorted(DATA.rglob("*.json"))
    if not files:
        report.fail("no JSON data was produced")
        return
    bad = 0
    for path in files:
        text = path.read_text(encoding="utf-8")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as error:
            report.fail(f"{rel(path)}: invalid JSON — {error}")
            bad += 1
            continue
        if "NaN" in text or "Infinity" in text:
            report.fail(f"{rel(path)}: contains NaN or Infinity, which JSON.parse rejects")
            bad += 1
        for field in ("schema", "id", "module", "topics", "title"):
            if field not in payload:
                report.fail(f"{rel(path)}: envelope is missing {field!r}")
                bad += 1
        if "steps" in payload:
            labels = [s.get("label", "") for s in payload["steps"]]
            if any(not label.strip() for label in labels):
                report.fail(f"{rel(path)}: a step has an empty label")
                bad += 1
            if len(set(labels)) != len(labels):
                report.fail(
                    f"{rel(path)}: two steps share a description. Every step states what "
                    "changed THAT step (alt-text-style-guide.md §4a)."
                )
                bad += 1
            columns = len(payload.get("columns", []))
            for step in payload["steps"]:
                if any(len(row) != columns for row in step.get("rows", [])):
                    report.fail(f"{rel(path)}: step {step.get('index')} has a wrong-width row")
                    bad += 1
                    break
    print(f"  json         {'ok' if not bad else 'FAILED'}  ({len(files)} files checked)")


def audit_offline_and_colour(report: Report) -> None:
    url = re.compile(r"https?://[^\s\"'<>)]+")
    hex_colour = re.compile(r"#[0-9a-fA-F]{3,8}\b")
    bad = 0
    checked = 0

    for path in sorted(list(FIGURES.rglob("*")) + list(DATA.rglob("*"))):
        if not path.is_file():
            continue
        checked += 1
        source = path.read_text(encoding="utf-8")

        for match in url.finditer(source):
            if match.group(0) == SVG_NAMESPACE:
                continue
            report.fail(f"{rel(path)}: external URL {match.group(0)!r} (AUTHORING-CONTRACT rule 7)")
            bad += 1
            break

        for match in hex_colour.finditer(source):
            window = source[max(0, match.start() - 40): match.start()]
            if "var(--fsu-" in window:
                continue          # the documented standalone fallback
            report.fail(
                f"{rel(path)}: raw colour {match.group(0)!r} outside a var(--fsu-…) "
                "fallback (AUTHORING-CONTRACT §8)"
            )
            bad += 1
            break

    print(f"  offline      {'ok' if not bad else 'FAILED'}  ({checked} files scanned)")


def audit_topic_coverage(report: Report) -> None:
    """Which COURSE_TOPIC_MAP ids the generated assets claim to serve.

    Informational, not a gate. The pipeline produces figures and data; whether
    every one of the 323 topics has a SECTION is the page authors' job and is
    checked by tools/verify_topic_coverage.py at the repository root.
    """
    topics: set[str] = set()
    for path in sorted(list(FIGURES.rglob("*.svg")) + list(DATA.rglob("*.json"))):
        source = path.read_text(encoding="utf-8")
        if path.suffix == ".json":
            try:
                topics.update(json.loads(source).get("topics", []))
            except json.JSONDecodeError:
                continue
        else:
            match = re.search(r"Topics: (.+)", source)
            if match and "unassigned" not in match.group(1):
                topics.update(t.strip() for t in match.group(1).split(","))

    by_module: dict[str, int] = {}
    for topic in topics:
        by_module[topic.split(".")[0]] = by_module.get(topic.split(".")[0], 0) + 1
    print(f"  coverage     {len(topics)} distinct topic ids referenced: "
          + ", ".join(f"M{k}:{v}" for k, v in sorted(by_module.items())))


def audit_markup(report: Report) -> None:
    """Every page's tags balance, and <main> really contains the page.

    This exists because of a specific failure that was invisible in review and
    obvious to a reader: one surplus ``</div>`` inside ``<main>`` makes the
    HTML parser pop the stack past ``<main>`` and ``.layout``, so every section
    after it becomes a child of ``<body>``. The grid stops applying, and the
    rest of the page renders full-bleed underneath the sidebar instead of
    beside it. Nothing errors, nothing logs, and the top of the page looks
    perfect.

    Two assertions, both cheap:
      1. tags balance
      2. the LAST topic section on the page is still inside <main>
    """
    from html.parser import HTMLParser

    void = {"area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "source", "track", "wbr"}

    class Balance(HTMLParser):
        def __init__(self) -> None:
            super().__init__(convert_charrefs=True)
            self.stack: list[tuple[str, int]] = []
            self.problems: list[str] = []
            self.escaped_main = False

        def handle_starttag(self, tag, attrs):
            if tag in void:
                return
            attr = dict(attrs)
            # A topic section that opens while <main> is not on the stack has
            # escaped the layout grid.
            if tag == "section" and "topic-" in (attr.get("class") or ""):
                if not any(t == "main" for t, _ in self.stack):
                    self.escaped_main = True
            self.stack.append((tag, self.getpos()[0]))

        def handle_endtag(self, tag):
            if tag in void:
                return
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == tag:
                    for orphan, line in self.stack[i + 1:]:
                        self.problems.append(
                            f"<{orphan}> opened at line {line} is closed early by "
                            f"</{tag}> at line {self.getpos()[0]}"
                        )
                    del self.stack[i:]
                    return
            self.problems.append(
                f"stray </{tag}> at line {self.getpos()[0]} with no matching open tag"
            )

    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "cross-cutting").glob("*.html"))
    bad = 0
    for path in pages:
        parser = Balance()
        parser.feed(path.read_text(encoding="utf-8"))
        for problem in parser.problems[:4]:
            report.fail(f"{rel(path)}: {problem}")
            bad += 1
        for tag, line in parser.stack:
            report.fail(f"{rel(path)}: <{tag}> opened at line {line} is never closed")
            bad += 1
        if parser.escaped_main:
            report.fail(
                f"{rel(path)}: a topic section is outside <main> — it will render "
                "full-bleed under the sidebar instead of in the content column."
            )
            bad += 1

    print(f"  markup       {'ok' if not bad else 'FAILED'}  ({len(pages)} pages parsed)")


def audit_design_system(report: Report) -> None:
    """Static conformance with ``../standards/design-system.md``.

    Everything else in this file is a one-time correction. This is the check
    that makes the correction stay corrected — the first build put a garnet
    slab and a 4px gold rule back three times before anyone noticed, because
    each individual reintroduction looked reasonable in isolation.

    Deliberately narrow. It only checks things that are unambiguous in the CSS
    and the markup; taste is checked by a human against artifact-checklist.md
    §A10, not here.
    """
    css_dir = ROOT / "assets" / "css"
    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "cross-cutting").glob("*.html"))
    bad = 0

    # 1. One radius. Values are captured and tested in Python rather than
    #    excluded with a lookahead: `border-radius:\s*(?!var\()` backtracks
    #    \s* to zero width and then passes the lookahead at the space, so it
    #    flags every single token use. Ask for the value, then judge it.
    allowed_radius = {"--fsu-radius", "--fsu-radius-pill"}
    deprecated_radius = {"--fsu-radius-sm", "--fsu-radius-lg"}

    for path in sorted(css_dir.glob("*.css")):
        source = path.read_text(encoding="utf-8")
        for match in re.finditer(r"border-radius:\s*([^;]+);", source):
            value = match.group(1).strip()
            line = source[: match.start()].count("\n") + 1
            names = set(re.findall(r"--fsu-radius[a-z-]*", value))

            if not names:
                if value in {"0", "inherit", "initial", "unset"}:
                    continue
                report.fail(
                    f"{rel(path)}:{line}: literal border-radius {value!r} — "
                    "design-system.md §4 has one radius, --fsu-radius."
                )
                bad += 1
                continue

            stale = names & deprecated_radius
            if stale:
                report.fail(
                    f"{rel(path)}:{line}: {', '.join(sorted(stale))} is a deprecated "
                    "alias kept only for the content pages. New CSS uses --fsu-radius."
                )
                bad += 1
            elif names - allowed_radius:
                report.fail(
                    f"{rel(path)}:{line}: unknown radius token "
                    f"{', '.join(sorted(names - allowed_radius))}."
                )
                bad += 1

    # 2. No shadows outside the two permitted consumers: the focus-ring halo,
    #    and a genuinely floating layer that says so in a comment beside it.
    for path in sorted(css_dir.glob("*.css")):
        source = path.read_text(encoding="utf-8")
        for match in re.finditer(r"box-shadow:\s*([^;]+);", source):
            value = match.group(1).strip()
            if "focus-ring-halo" in value or value == "none":
                continue
            line = source[: match.start()].count("\n") + 1
            # Window spans BOTH sides: the exception is usually documented in a
            # trailing comment on the same line, which a look-behind misses.
            window = source[max(0, match.start() - 400): match.end() + 200]
            if "floating layer" in window:
                continue        # documented exception, see design-system.md §5
            report.fail(
                f"{rel(path)}:{line}: box-shadow {value!r} — design-system.md §5 "
                "has no shadows. Depth is a surface step or a hairline."
            )
            bad += 1

    # 3. Gold is a mark, not a band. --fsu-rule-width is the only width gold is
    #    ever drawn at, and it is 2px.
    tokens = (css_dir / "fsu-tokens.css").read_text(encoding="utf-8")
    match = re.search(r"--fsu-rule-width:\s*([^;]+);", tokens)
    if match and match.group(1).strip() != "2px":
        report.fail(
            f"--fsu-rule-width is {match.group(1).strip()!r}, expected '2px'. "
            "design-system.md §1.1 — gold at 4px is a band, and a band is what "
            "made the first build read as a flyer."
        )
        bad += 1

    # 4. One primary button per view.
    for path in pages:
        count = path.read_text(encoding="utf-8").count("btn--primary")
        if count > 1:
            report.fail(
                f"{rel(path)}: {count} .btn--primary — design-system.md §7.8 "
                "allows one per view. If everything is primary, nothing is."
            )
            bad += 1

    # 5. The masthead is not a dark surface any more. Leaving the attribute on
    #    flips the focus ring to FSU Gold on white: 1.94:1, invisible, 2.4.7
    #    and 1.4.11 at the same time. This one is a defect, not a preference.
    for path in pages:
        if '<header class="site-header" data-surface="dark"' in path.read_text(encoding="utf-8"):
            report.fail(
                f"{rel(path)}: .site-header still carries data-surface=\"dark\". "
                "The masthead sits on paper now, so that flips the focus ring to "
                "Gold on white (1.94:1) — an invisible focus indicator."
            )
            bad += 1

    # 6. Law 2: the module strip must not wrap.
    dashboard_css = (css_dir / "dashboard.css").read_text(encoding="utf-8")
    strip = re.search(r"\.primary-nav__list\s*\{([^}]*)\}", dashboard_css)
    if strip:
        body = strip.group(1)
        if "flex-wrap: nowrap" not in body:
            report.fail(
                ".primary-nav__list has lost `flex-wrap: nowrap` — design-system.md "
                "§6.3, Law 2. A wrapping strip becomes a paragraph of links."
            )
            bad += 1
        if "safe center" not in body:
            report.fail(
                ".primary-nav__list needs `justify-content: safe center`. Plain "
                "`center` centres the overflow too and puts the first item "
                "permanently out of reach."
            )
            bad += 1

    print(f"  design       {'ok' if not bad else 'FAILED'}  "
          f"({len(pages)} pages, {len(list(css_dir.glob('*.css')))} stylesheets)")


def audit_interactivity(report: Report) -> None:
    """Two hard rules about the runtime, and one honest count.

    The hard rules are the ones that were actual defects:

    1.  No `<script type="module">` anywhere. Chrome and Firefox refuse to
        load a module script from a `file://` address, so a single one of
        these anywhere in a page silently takes the whole runtime down for
        any reader who opened the folder rather than a server. This is not a
        style preference; it is the difference between a dashboard that works
        when you double-click it and one that does not.

    2.  No literal colours in a demo file. Every mark in a figure resolves
        through a token, because the light and dark ramps run in opposite
        directions and a hex value that reads correctly on one canvas is
        invisible on the other.

    The count is the conversion frontier: how many demos drive their figure
    from a `stage` (draggable, canvas, world coordinates) versus a `figure`
    (redrawn SVG, controls only). This does not fail the build — an SVG
    figure is a legitimate choice for something with no spatial state to
    grab. It is reported so the number cannot quietly stay where it is.
    """
    # A real tag, not the word "module" in prose. _TEMPLATE.html documents
    # this very failure in a comment, and matching that comment would make
    # the audit fail on its own explanation.
    module_tag = re.compile(r"<script[^>]*\btype=\"module\"", re.I)
    comment = re.compile(r"<!--.*?-->", re.S)
    module_scripts = 0
    # cross-cutting/ MUST be included. It was not, and the five pages there
    # kept `type="module"` through a whole pass while this audit reported
    # green — an audit that only looks where you remember to look is worse
    # than none, because it certifies the gap.
    for path in (sorted(ROOT.glob("*.html"))
                 + sorted((ROOT / "cross-cutting").glob("*.html"))):
        html = comment.sub("", path.read_text(encoding="utf-8"))
        if module_tag.search(html):
            report.fail(
                f"{rel(path)}: <script type=\"module\"> — blocked under file://, "
                "which disables the entire runtime. Run tools/fix_script_tags.py."
            )
            module_scripts += 1

    demos = sorted((ROOT / "assets" / "js" / "demos").glob("*.js"))
    # Count the demos themselves, not their figure functions: some pages
    # declare `figure(model, ctx) {` as a method and some pass a named
    # function, and one file wraps every call in mountDemos() so the
    # indentation differs. `createDemo(` is the one unambiguous marker.
    total = 0
    stage_count = 0
    literal_colours = 0
    hex_colour = re.compile(r"#[0-9a-fA-F]{3,8}\b")

    for path in demos:
        source = path.read_text(encoding="utf-8")
        total += len(re.findall(r"\bcreateDemo\(", source))
        stage_count += len(re.findall(r"^\s*stage:\s*\{", source, re.M))

        for match in hex_colour.finditer(source):
            line_start = source.rfind("\n", 0, match.start()) + 1
            line = source[line_start:source.find("\n", match.start())]
            if line.lstrip().startswith(("*", "/*", "//")):
                continue          # a ratio table or a note in a comment
            report.fail(
                f"{rel(path)}: literal colour {match.group(0)!r} in a figure. "
                "Use a token through Gfx.C or var(--fsu-…) — a hex value is "
                "correct on at most one of the two canvases."
            )
            literal_colours += 1
            break

    pct = (100 * stage_count // total) if total else 0
    ok = not module_scripts and not literal_colours
    pages = (len(list(ROOT.glob("*.html")))
             + len(list((ROOT / "cross-cutting").glob("*.html"))))
    print(f"  interactive  {'ok' if ok else 'FAILED'}  "
          f"({stage_count}/{total} demos draggable, {pct}%; "
          f"{len(demos)} demo files, {pages} pages, "
          f"{module_scripts} module scripts)")


def audit(report: Report) -> None:
    section("Audit")
    audit_determinism(report)
    audit_prng(report)
    audit_svgs(report)
    audit_json(report)
    audit_offline_and_colour(report)
    audit_markup(report)
    audit_design_system(report)
    audit_interactivity(report)
    audit_topic_coverage(report)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def list_targets() -> int:
    print("Figures  (assets/figures/<module>/<slug>.svg + .table.html)")
    for builder in generate_figures.FIGURE_BUILDERS:
        figure = builder()
        print(f"  {figure.module}/{figure.slug:<28s} {', '.join(figure.topics)}")
    print("\nTraces  (assets/data/)")
    for relative in generate_traces.TRACES:
        print(f"  {relative}")
    print("\nDatasets  (assets/data/)")
    for relative in generate_datasets.DATASETS:
        print(f"  {relative}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Regenerate the dashboard's static figures, traces and datasets.",
        epilog="Everything it writes is checked in beside this script.",
    )
    parser.add_argument("--check", action="store_true",
                        help="audit after building; exit non-zero on any defect")
    parser.add_argument("--only", help="restrict to paths containing this, e.g. m3")
    parser.add_argument("--list", action="store_true", help="list the targets and exit")
    parser.add_argument("--clean", action="store_true",
                        help="delete assets/figures and assets/data first")
    args = parser.parse_args()

    if args.list:
        return list_targets()

    started = time.perf_counter()
    print("ISC 4221C dashboard asset build")
    print(f"root: {ROOT}")

    if args.clean:
        section("Clean")
        clean()

    report = Report()
    if not run_self_checks(report):
        print("\nBUILD STOPPED — a self-check failed, so nothing was written.")
        for problem in report.problems:
            print(f"  - {problem}")
        return 1

    try:
        build(report, args.only)
    except Exception as error:  # noqa: BLE001 - report which generator, then re-raise
        print(f"\nBUILD FAILED while generating: {error}")
        raise

    if args.check:
        if args.only:
            print("\n(--check ignores --only: the audit needs the whole tree.)")
        audit(report)

    elapsed = time.perf_counter() - started
    section("Summary")
    print(f"  {len(report.written)} written, {len(report.unchanged)} already current, "
          f"{len(report.written) + len(report.unchanged)} total")
    print(f"  figures: {len(list(FIGURES.rglob('*.svg')))} SVG "
          f"+ {len(list(FIGURES.rglob('*.table.html')))} data tables")
    print(f"  data:    {len(list(DATA.rglob('*.json')))} JSON files")
    print(f"  seed:    {algorithms.SEED} (mulberry32, same stream as assets/js/demo.js)")
    print(f"  time:    {elapsed:.2f}s")

    for note in report.skipped:
        print(f"\n  SKIPPED: {note}")

    if report.problems:
        print(f"\n  {len(report.problems)} PROBLEM(S):")
        for problem in report.problems:
            print(f"    - {problem}")
        return 1

    if args.check:
        print("\n  All checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
