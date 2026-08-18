# Module demo scripts

One file per module page, named to match its page:

| Page | Demo script |
|---|---|
| `m0-foundations.html` | `m0-foundations.js` |
| `m1-algorithm-design.html` | `m1-algorithm-design.js` |
| `m2-probability.html` | `m2-probability.js` |
| `m3-graphs.html` | `m3-graphs.js` |
| `m4-image-processing.html` | `m4-image-processing.js` |
| `m5-data-mining.html` | `m5-data-mining.js` |
| `m6-computational-geometry.html` | `m6-computational-geometry.js` |
| `m7-discrete-optimization.html` | `m7-discrete-optimization.js` |

Every demo on a page lives in that one file. Do not inline demo code in the
HTML, and do not add a second script tag.

```js
import { createDemo, el, svgEl, seededRandom, formatNumber } from '../demo.js';
```

`../demo.js` documents the full spec object at the top of the file. The rules
for what a demo must provide are in
[`../../../AUTHORING-CONTRACT.md`](../../../AUTHORING-CONTRACT.md) §6.4 —
in short: `compute()`, `table()` and `summary()` are always required, and
`figureAlt()` becomes required the moment you declare a `figure()`. The runtime
refuses to render without them.
