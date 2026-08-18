# Dashboard Redesign Plan — ISC 4221C (2026)

Bringing the dashboard onto [`../standards/design-system.md`](../standards/design-system.md).

> **Status: all seven phases are done.** This document is kept as the record of
> what was changed and why, not as a to-do list. §7 at the end lists what the
> rebuild found that the plan did not predict, and §8 lists the authoring debt
> it surfaced but did not fix.
>
> The gate is `python3 Dashboard/tools/build.py --check`, which now includes a
> `design` audit. It passes.

**Scope of the change:** the visual system and the page structure. **Not** the
palette (every hex and every ratio stays), not the accessibility guarantees,
not the content, not the build pipeline.

**Why this is cheaper than it looks.** The markup is already semantic and
class-named, the colour layer is already tokenised, and the demo panels are
built by one JavaScript file. So ~80% of the redesign is CSS, ~15% is three
shared JS/HTML files, and only ~5% is a mechanical pass over the fourteen
content pages. Nobody re-authors a 250KB module page by hand.

---

## 1. What is actually wrong

The current build passes every box in `../standards/artifact-checklist.md`
sections A and D. It is genuinely accessible. It also reads as a departmental
flyer, for eight specific reasons:

| # | Defect | Where |
|---|---|---|
| 1 | A saturated FSU Garnet slab across the top of every page, with a 4px gold rule under it | `dashboard.css` §3 `.site-header` |
| 2 | A 4px gold rule again on the top edge of every module card — the same device twice on one screen | `dashboard.css` §7 `.topic-card` |
| 3 | Every interactive panel filled cream `#F3EDE1` on a white page, so the page has two competing backgrounds and every demo is a beige box | `dashboard.css` §9 `.demo` |
| 4 | No surface scale. Depth is carried by three shadow tokens instead of by stepping a ramp | `fsu-tokens.css` §5, `dashboard.css` throughout |
| 5 | Five radii in use — 2px, 4px, 8px, 999px, and the arch — which is five voices | `fsu-tokens.css` §5 |
| 6 | Wordmark, nine module links, and a three-option theme switch competing for one wrapping row | `index.html` header, `dashboard.css` §3 |
| 7 | Counts rendered as a loose row of `<span>`s rather than one divided strip; five primary buttons on the home page | `index.html` `.page-header__meta`, `#threads` |
| 8 | Demo panels put prose beside the figure in a 17rem sidebar, so the stage collapses next to a column of text | `demo.js`, `dashboard.css` §9 |

Items 1–3 are the whole "tacky" feeling. They are also the cheapest to fix.

## 2. The target, in one line

**Garnet is ink. Gold is a mark. White is the room.** Full rationale in
`design-system.md` §1.1.

---

## 3. Phases

Each phase is independently shippable and independently reviewable. Run
`python3 tools/build.py --check` and the §D checklist after each.

### Phase 0 — Measure the four missing pairings *(blocking, ~1 hour)*

`design-system.md` needs surfaces that `color-palette.md` has not measured yet.
Nothing in Phase 2 can use them until this lands.

1. Run `../tools/contrast.py` for Black, Slate, FSU Garnet, and Neutral +2 Slate
   on Gold +2 Canvas `#E7DCC4` and on Gold +1 Canvas `#DACAA6`.
2. Propose two dark steps above Stadium Night and measure White and FSU Gold on
   each. Reject any candidate that drops White below 7:1.
3. Move the passing rows into `color-palette.md` §2, delete the corresponding
   rows from its §6, and re-run `python3 tools/fsu_palette.py` so the self-check
   covers them.

**Deliverable:** `color-palette.md` §2 gains two (light) and up to two (dark)
tables. **Gate:** `fsu_palette.py` self-check passes; §6 is empty or shrunk.

If a pairing fails, do not force it — drop that surface step from the system and
say so in `design-system.md` §1.2. A ramp with three honest steps beats one with
five invented ones.

### Phase 1 — Token layer *(~2 hours, `fsu-tokens.css`)*

Purely additive plus three deletions. No component touches a hex.

| Change | Detail |
|---|---|
| Add the surface ramp | `--fsu-paper`, `--fsu-paper-warm`, `--fsu-paper-warm-2`, `--fsu-paper-warm-3`, `--fsu-ink-canvas`, both themes |
| Add the hairline tier | `--fsu-line-soft`, `--fsu-line`, `--fsu-line-strong` — rename in place from `--fsu-border*`, keeping the old names as aliases for one release |
| Collapse the radii | `--fsu-radius: 3px`. Point `--fsu-radius-sm` and `--fsu-radius-lg` at it and mark both deprecated. Delete `--fsu-radius-arch` |
| Demote the rule | `--fsu-rule-width: 4px` → `2px` |
| Quarantine the shadows | Keep `--fsu-shadow-1/2/3` defined; add a comment that the nav disclosure panel is the only permitted consumer |
| Add mono figure tokens | `--fsu-numeric: tabular-nums` helper class for counts, topic numbers, complexities |

Keep the aliases. Fourteen pages and six Python generators reference these names;
a hard rename is a day of churn for no visual gain.

**Gate:** `git diff` shows no new hex outside §1. `build.py --check` colour audit
still passes (it forbids raw hex outside a `var()` fallback).

### Phase 2 — The three defects that carry the feeling *(~4 hours, `dashboard.css` only)*

This is the phase that changes how the dashboard looks. No markup changes at
all, so it can be reviewed as a pure CSS diff and reverted in one commit.

1. **Masthead** (`§3`). `.site-header` background becomes `--fsu-paper`; the
   4px gold `border-block-end` becomes a 1px `--fsu-line`. `.brand__code` goes
   garnet, `.brand__name` goes Neutral +2 Slate. `.primary-nav__link` colour
   flips from white to Plaza Brick, active state to garnet with a 2px gold
   underline. Remove `data-surface="dark"` from the header in Phase 4 — until
   then it is inert, not wrong.
2. **Module cards** (`§7`). Delete `border-block-start: var(--fsu-rule-width)
   solid var(--fsu-rule)`. Border becomes `--fsu-line`; radius 3px.
3. **Demo panels** (`§9`). `.demo` background `--fsu-paper-warm` stays, but
   `.demo__controls` flips from `--fsu-surface` to a nested surface so the field
   region reads as *lighter* than what surrounds it. Radius `--fsu-radius-lg` →
   `--fsu-radius`.
4. **Sweep the shadows.** Every `box-shadow` in `dashboard.css` that is not the
   focus halo goes. There are three; none of them was carrying meaning.
5. **Band alternation.** Add `.band` / `.band-alt` at `--fsu-paper` /
   `--fsu-paper-warm` with a `--fsu-line` hairline between, and `section-y`
   padding of 3.5rem / 4.5rem at `lg`.

**Gate:** side-by-side screenshots of `index.html` and `m3-graphs.html` before
and after. Checklist §A10 passes. Zero markup diff.

### Phase 3 — Law 1, the demo panel *(~6 hours, `demo.js` + `dashboard.css` §9)*

One file builds every demo panel on the site, so this is a single-point fix that
lands on all 47 of them at once.

1. Restructure the DOM `demo.js` emits into the four regions: `head` /
   `stage + controls` / `readout` / `explain`. The `.demo__data` table moves
   into `explain` and stays permanently in the DOM.
2. Grid the panel so the sidebar is capped to the stage height and scrolls
   internally — this is what structurally prevents the failure rather than
   relying on authors.
3. Add the console warnings that keep it honest: a hint over 90 characters, more
   than 7 controls, more than 6 readout values, stage aspect outside 0.50–0.72.
   Warnings, not errors — an author mid-edit should not get a blank panel.
4. Convert the readout row into the stat-strip recipe (`design-system.md` §7.3).

**Gate:** every demo still mounts; `build.py --check` passes; a keyboard pass on
one demo per module; §D8 Law 1 boxes checked.

**Risk:** demo panels are the highest-traffic component and the one place where
a regression is invisible on the page you are looking at and broken on another.
Mitigation: extend the existing audit with a mount-and-drive pass over every
`#demo-*-mount` on all fourteen pages before merging.

### Phase 4 — Law 2, the header *(~4 hours, `nav.js` + 15 HTML files)*

The only phase that touches content pages, and it touches exactly one block in
each.

1. Author the two-row header once in `_TEMPLATE.html`: row 1 brand + theme
   switch, row 2 the module strip with `flex-wrap: nowrap`,
   `justify-content: safe center`, and two labels per item
   (`<span class="nav__short">M3</span><span class="nav__full">Graphs</span>`).
2. Add a hairline group separator between `Home`, the eight modules, and
   `Threads`.
3. `nav.js`: horizontal scroll with edge fades, scroll the current item into
   view on load, map vertical wheel to horizontal scroll, and keep the existing
   narrow-viewport disclosure behaviour (revealed by JS, so nav stays visible
   with JS off).
4. Apply the block to the other fourteen pages with a script — the header sits
   between two stable comment markers; add them first if they are not there.

**Gate:** at 320px, 768px, and 1440px the strip is one line or scrolls with the
current item visible; nothing wraps; the first item is reachable at every width.
§D8 Law 2 boxes checked.

**Risk:** a scripted edit across fourteen files. Mitigation: dry-run the script,
diff one file by hand, and assert afterwards that all fifteen headers are
byte-identical to the template's.

### Phase 5 — Home page structure *(~3 hours, `index.html` only)*

1. `page-header__meta` becomes the stat-strip recipe: one bordered strip divided
   by hairlines, mono tabular numbers over `label-meta` terms.
2. The five cross-cutting threads keep **one** primary button between them;
   the other four become plain links in the prose that already introduces them.
   Right now all five are primary, which means none of them is.
3. The thread sections drop `.topic-section` (which is the *numbered topic*
   recipe and does not fit here) for a simple card grid.
4. Move the accessibility section's two callouts onto the §7.11 recipe: a 2px
   rail in the colour whose meaning applies, `paper-warm` fill, no shadow.

**Gate:** one `.btn--primary` on the page. Reflow at 320px.

### Phase 6 — Retire the aliases and update the contract *(~2 hours)*

1. Rewrite `AUTHORING-CONTRACT.md` §8 ("Colour and tokens") to point at
   `design-system.md` for usage and `color-palette.md` for values, and add the
   two layout laws to its §1 rules list.
2. Add the §6.x copy-pasteable markup for the stat strip, the chip, and the new
   callout.
3. Drop the deprecated `--fsu-radius-sm` / `--fsu-radius-lg` / `--fsu-border*`
   aliases once nothing references them (`grep` is the gate).
4. Extend `build.py --check` with a design-system audit: no `border-radius`
   literal, no `box-shadow` outside the focus halo and the nav panel, no gold at
   a width above 2px, exactly one `.btn--primary` per page.

That last item is the one that keeps this from drifting back. Everything else is
a one-time correction; the audit is what makes it stay corrected.

---

## 4. Order, effort, and what each phase buys

| Phase | Effort | Files | Buys |
|---|---|---|---|
| 0 Measure | 1h | `color-palette.md`, `fsu_palette.py` | Unblocks the surface ramp |
| 1 Tokens | 2h | `fsu-tokens.css` | Nothing visible; makes 2–5 mechanical |
| 2 The three defects | 4h | `dashboard.css` | **Most of the visual change** |
| 3 Law 1 | 6h | `demo.js`, `dashboard.css` | 47 demo panels stop collapsing |
| 4 Law 2 | 4h | `nav.js`, 15 × HTML | Header stops being a paragraph of links |
| 5 Home page | 3h | `index.html` | The page people judge the site by |
| 6 Contract + audit | 2h | `AUTHORING-CONTRACT.md`, `build.py` | It stays fixed |

**Total ≈ 22 hours.** Phases 0–2 are ~7 hours and carry most of the perceived
improvement; if time runs short, ship those and schedule the rest.

Phase 2 can ship without 3–5. Phase 3 and Phase 4 are independent of each other.
Phase 5 depends on Phase 2 only for the band and stat-strip CSS.

## 5. What is explicitly not changing

- Any hex value or any measured ratio. Phase 0 only *adds* rows.
- The offline guarantee — no fonts, no CDN, no `fetch`, still opens from a USB
  stick.
- Every accessibility affordance: the two-layer focus ring, the always-present
  data tables, the live regions, the skip link, `forced-colors`, print, reduced
  motion. Each phase re-runs the §D checklist rather than trusting that it held.
- Page content, topic numbering, anchor ids, and the search index shape. Nothing
  here invalidates a link.
- The Python build pipeline, other than the new audit in Phase 6.

## 6. Verification, per phase

```bash
python3 tools/build.py --check
```

plus, by hand:

1. Screenshots of `index.html`, `m3-graphs.html`, and one cross-cutting page at
   1440px, 768px, and 320px, before and after.
2. A keyboard pass end to end on the phase's changed component.
3. The `../standards/artifact-checklist.md` §A10 and §D boxes, with a name
   against every item no tool checked.
4. axe clean of critical and serious violations.

An unchecked box with no written exception blocks the phase. That is the
existing rule and the redesign does not get an exemption from it.

---

## 7. What the rebuild found that this plan did not predict

Five things. Four were latent defects that the redesign exposed rather than
caused, which is the useful kind of surprise.

1. **Every demo on the site was capped at 75ch.** `.topic-section__body > .demo`
   exempted the panel from the prose measure — but the panel is not the direct
   child, the *mount* is, and `demo.js` replaces the mount's children rather
   than the mount. So the exemption never matched and every one of the 47
   panels was silently 686px wide. This is why the control rail looked like it
   had no room: it did not. Fixed by exempting `[id$="-mount"]` as well.

2. **`max-block-size: 100%` on the control rail constrains nothing.** The
   percentage resolves against the grid area, whose height is partly determined
   by the rail. Circular. The first demo with nine controls turned a 429px
   figure into a 739px row — precisely the Law 1 failure the CSS was supposed
   to make structurally impossible. Needed an absolute cap *and* a
   `ResizeObserver`.

3. **Rail-beside-stage is a container query, not a media query.** A module page
   has an 18rem sidebar, so a 1280px viewport leaves a 650px panel. No viewport
   query can see that.

4. **The masthead's `data-surface="dark"` became an accessibility defect the
   moment the header stopped being garnet** — it flips the focus ring to FSU
   Gold, which measures 1.94:1 on white. An invisible focus indicator, failing
   2.4.7 and 1.4.11 together. This is the reason the migration is a script and
   not a hand-edit: it had to be right on all fifteen pages.

5. **The nav needed a wider shortening breakpoint than the layout does.** The
   trigger is "do the full labels still fit on one line" — about 1370px for
   nine module names — not any of the layout breakpoints. Measured, at 86rem.

## 8. Authoring debt this surfaced and did not fix

`demo.js` now warns in the console when a demo breaks a Law 1 constraint. It is
currently warning about real content:

| What | Roughly |
|---|---|
| Control help text over 90 characters | 6 controls across M3, M5, M6 |
| Panel descriptions over 160 characters | 4 demos, longest 190 characters |

None of these break the layout — the CSS holds regardless. They are prose in
the wrong region: a sentence in the control rail that belongs below the stage.
Fixing them is per-demo copy editing in `assets/js/demos/*.js`, which is a
content pass rather than a design one, so it is left for whoever next edits
those files. Open the console on any module page to see the current list.

One more, unrelated to Law 1: `.pill--none` and `.pill--slides` are defined in
the CSS but appear in no legend on any page. Either they are dead or the pages
that need them are not marking coverage completely.
