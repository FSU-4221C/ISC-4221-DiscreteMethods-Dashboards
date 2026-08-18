# ISC 4221C Interactive Dashboard (2026)

A single static dashboard covering all 323 topics of ISC 4221C — Discrete
Algorithms. Plain HTML, CSS, and hand-written ES modules. No framework, no
bundler, no npm, and **no network requests of any kind**.

---

## Running it

**Open `index.html`.** Double-click it, drag it onto a browser window, put the
folder on a USB stick and open it there. No server, no install, no build step.
Everything works: search, the theme switch, and every interactive.

There is a local server in `tools/serve.py` if you want one, but it is a
convenience for editing (it disables caching so a reload picks up your changes),
not a requirement for reading.

```bash
python3 tools/serve.py          # optional; http://localhost:8731/index.html
```

### Why this used to need a server, and does not now

The runtime was written as ES modules (`<script type="module">`), and **Chrome
and Firefox refuse to load a module script from a `file://` address**: the
origin is opaque, so the CORS check fails before the file is read. Safari
allows it; the other two have not since 2019.

That made "works offline" and "works by opening the file" two different claims,
and the project only made the first one. A reader who double-clicked
`index.html` got the prose and the static figures, and a fallback note in place
of every interactive.

The runtime is now classic scripts publishing globals, which is the shape the
explorable-explainer format requires for exactly this reason. `tools/demodulize.py`
performed the conversion and documents it; `tools/fix_script_tags.py` keeps the
`defer` load order in dependency order. Both are idempotent, so re-running them
after adding a page is safe.

The old in-page fallbacks are still there and still correct — they now cover
only the case where JavaScript is genuinely off or a file is missing.

---

## Layout

```
Dashboard/
  index.html                  home: course map, search, threads, a11y statement
  _TEMPLATE.html              the skeleton every module page copies
  AUTHORING-CONTRACT.md       the rules the eight module pages follow
  m0-foundations.html         …m7-discrete-optimization.html
  assets/
    css/fsu-tokens.css        design tokens — colour, type, spacing, focus
    css/dashboard.css         layout and components, built on those tokens
    js/theme.js               light / dark / system, persisted
    js/nav-map.js             GENERATED chapter/section map for the header
    js/nav.js                 chapter dropdowns, current page, current section
    js/core/gfx.js            canvas stage, drag handles, token palette bridge
    js/search.js              client-side search over the generated index
    js/search-index.js        the index itself (module authors append to it)
    js/demo.js                the shared accessible widget runtime
    js/demos/                 one script per module page
    figures/ data/            generated static assets, per module
  tools/
    serve.py                  local static server (stdlib only, optional)
    build.py                  regenerates every static asset; --check audits
    generate_nav_map.py       reads the pages -> assets/js/nav-map.js
    rebuild_header.py         writes the two-row header on every page
    fix_script_tags.py        keeps the defer load order in dependency order
    demodulize.py             one-time ES-module -> classic-script conversion
    add_thread_search.py      gives the cross-cutting pages a search box
```

### After editing a page

| You changed | Run |
|---|---|
| a topic group's id or title | `python3 tools/generate_nav_map.py` |
| added a page, or its scripts | `python3 tools/fix_script_tags.py` |
| anything at all, before you push | `python3 tools/build.py --check` |

All of them are idempotent, so running one that was not needed costs nothing
and reports "already current".

---

## Accessibility

Target: **WCAG 2.1 AA**, plus the 2.2 AA additions. The full student-facing
statement is at [`../ACCESSIBILITY_STATEMENT.md`](../ACCESSIBILITY_STATEMENT.md).

The rule that shaped every design decision here: **every figure has a
non-visual equivalent** — a real data table of the numbers, or a text summary
in an `aria-live` region that updates when the figure does.

`assets/js/demo.js` enforces it. A demo that declares a figure without a
description, or omits its data table or its live summary, does not render; it
is replaced by a panel naming the missing function and the criterion it fails.
The accessible thing is the only thing that works.

---

## Adding a module page

Read [`AUTHORING-CONTRACT.md`](AUTHORING-CONTRACT.md) first. It is prescriptive
and has copy-pasteable markup for every component, the exact anchor-id
convention, the exact search-index entry shape, and the checklist to run before
declaring a page finished.
