/* ============================================================================
   gfx.js — canvas stage, world<->screen mapping, drag handles, and a small
   line-art 3D projector. Everything is drawn as hairlines and flat fills so
   the figures match the rest of the system instead of looking like a
   different program's output. Exposes the global `Gfx`.

   Adapted from the explorable-explainer core. One thing is different, and it
   is the thing that had to change: the upstream palette is a dark-only table
   of literals. This dashboard has a light canvas and a dark one, and the two
   surface ramps run in OPPOSITE directions — on paper a deeper step reads as
   inset, on ink a lighter step reads as raised. A literal that is correct on
   one canvas is wrong on the other, so `C` is resolved from the CSS custom
   properties in fsu-tokens.css instead of written here.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ==========================================================================
     PALETTE — read from the design tokens, not written here.

     `C` keeps the upstream key names so the drawing code and the craft rules
     transfer unchanged, but every value comes from a token. The names are
     therefore ROLES, not tones: `ink900` is "the surface a figure sits on",
     which is #FFFFFF on paper and #121B25 on ink.

     Nothing may be added to this table that is not a token. A literal colour
     inside a widget is the single thing that makes seventy figures stop
     looking like one system, and it is also how a figure ends up legible in
     one theme and invisible in the other.
     ======================================================================== */

  const TOKENS = {
    /* Surfaces. Role-named because the two ramps run in opposite directions. */
    ink950: '--fsu-surf-chrome',
    ink900: '--fsu-surf-page',     /* the default stage background */
    ink850: '--fsu-surf-band',
    ink800: '--fsu-surf-panel',
    ink750: '--fsu-surf-inset',
    ink700: '--fsu-surf-mark',
    ink600: '--fsu-chart-axis',

    /* Text and neutral marks, in descending strength. */
    white: '--fsu-color-strong',
    s200:  '--fsu-color-strong',
    s300:  '--fsu-color-body',
    s400:  '--fsu-color-caption',
    s500:  '--fsu-color-caption',

    /* Hairlines. These carry the structural load; there are no shadows. */
    lineSoft:   '--fsu-chart-gridline',
    line:       '--fsu-line',
    lineStrong: '--fsu-line-strong',

    /* The four figure inks. See fsu-tokens.css §7b for what each one means
       and the measured ratio it clears on every step of its ramp. */
    accent: '--fsu-fig-accent',
    ok:     '--fsu-fig-ok',
    warn:   '--fsu-fig-warn',
    info:   '--fsu-fig-info',

    /* The series ramp, for the figures that really are charts. */
    series1: '--fsu-series-1', series2: '--fsu-series-2', series3: '--fsu-series-3',
    series4: '--fsu-series-4', series5: '--fsu-series-5', series6: '--fsu-series-6'
  };

  /* The upstream code and the upstream craft notes name accents by hue and by
     a 200–700 step. Both are aliased onto the four semantic inks so a widget
     written against either vocabulary draws the right colour. The step number
     is deliberately ignored: a real 6-step ramp per accent would need
     twenty-four measured values per theme, and the system does not need the
     resolution — weight and alpha carry emphasis instead. */
  const ALIASES = {
    azure: 'accent',    /* the interactive colour: handles, the answer */
    emerald: 'ok',
    amber: 'warn',
    iris: 'info'
  };

  const C = {};

  /** Read every token off :root. Called at load and on every theme change. */
  function refresh() {
    const cs = global.getComputedStyle(document.documentElement);
    for (const key in TOKENS) {
      const v = cs.getPropertyValue(TOKENS[key]).trim();
      if (v) C[key] = v;
    }
    for (const hue in ALIASES) {
      const v = C[ALIASES[hue]];
      for (const step of [200, 300, 400, 500, 600, 700]) C[hue + step] = v;
      C[hue] = v;
    }
    C.series = [C.series1, C.series2, C.series3, C.series4, C.series5, C.series6];
    return C;
  }

  /* A figure drawn before the stylesheet applies would bake in empty strings,
     so seed synchronously and re-read whenever the theme flips. */
  refresh();

  const onThemeChange = () => {
    refresh();
    STAGES.forEach(s => s.invalidate());
  };

  new MutationObserver(onThemeChange).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  if (global.matchMedia) {
    const mq = global.matchMedia('(prefers-color-scheme: dark)');
    /* addListener is the pre-2019 spelling; Safari 13 needs it. */
    if (mq.addEventListener) mq.addEventListener('change', onThemeChange);
    else if (mq.addListener) mq.addListener(onThemeChange);
  }

  /** Translucent version of a colour. Accepts #rgb, #rrggbb, rgb() and rgba(). */
  const alpha = (color, a) => {
    if (!color) return `rgba(0,0,0,${a})`;
    const s = String(color).trim();
    if (s[0] === '#') {
      const h = s.slice(1);
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    const m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      const [r, g, b] = m[1].split(/[\s,/]+/).filter(Boolean);
      return `rgba(${parseFloat(r)},${parseFloat(g)},${parseFloat(b)},${a})`;
    }
    return s;   /* a named colour or a system colour — pass it through intact */
  };

  const FONT = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const FONT_UI = '600 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  /* ==========================================================================
     Stage — a canvas with a world coordinate system (y up by default).
     ======================================================================== */
  /* Every live stage, so a theme change can repaint all of them. A Set, not
     an array: destroy() has to be able to remove one in constant time. */
  const STAGES = new Set();

  class Stage {
    /**
     * @param {HTMLElement} host   element the canvas is appended to
     * @param {object} opt
     *   aspect  height / width of the drawing area (default 0.58)
     *   world   {x:[min,max], y:[min,max]} world rectangle to fit
     *   yUp     true (default) puts +y upward, as in maths, not screen space
     *   fit     'contain' (default) preserves aspect; 'stretch' does not
     *   bg      background fill
     */
    constructor(host, opt) {
      opt = opt || {};
      this.host = host;
      this.aspect = opt.aspect != null ? opt.aspect : 0.58;
      this.yUp = opt.yUp !== false;
      this.fit = opt.fit || 'contain';
      /* Held as a key, not a value. `bg` resolves through C on every draw, so
         a theme flip repaints against the new surface instead of keeping the
         one that happened to be current when the widget mounted. */
      this._bgKey = opt.bg || 'ink900';
      this.world = opt.world || { x: [-1, 1], y: [-1, 1] };
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.touchAction = 'none';
      host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.handles = [];
      this._drawFns = [];
      this._dragging = null;
      this._hover = null;
      this._raf = null;
      this._pointer = null;
      this._bindPointer();
      this._bindKeyboard();
      this._observe();
      this.resize();
      STAGES.add(this);
    }

    /** The current background fill. A token key resolves; anything else is
        taken as a literal so a caller can still pass `'transparent'`. */
    get bg() { return C[this._bgKey] || this._bgKey; }
    set bg(v) { this._bgKey = v; }

    /** Release observers and listeners. A page can hold twenty stages. */
    destroy() {
      STAGES.delete(this);
      if (this._ro) this._ro.disconnect();
      this.stop();
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }

    /* ---- sizing ---- */
    _observe() {
      if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', () => this.resize());
        return;
      }
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.host);
    }

    resize() {
      const w = Math.max(240, this.host.clientWidth || 640);
      /* Height is aspect-derived but CAPPED, and the cap comes from the CSS so
         there is one number rather than two that can disagree.

         Without this, widening the shell breaks every figure: a 1130px-wide
         stage at aspect 0.62 wants to be 700px tall, the host's
         max-block-size clips it at --dash-stage-max, and the bottom of the
         drawing is simply gone — with no error, because the canvas never
         learns its box was cut. Shrinking the effective aspect instead keeps
         the whole world visible; `contain` in _computeMap then letterboxes
         rather than cropping. */
      const h = Math.min(Math.round(w * this.aspect), this._maxHeight());
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.height = h + 'px';
      this._computeMap();
      this.draw();
    }

    /** The tallest this stage may draw, in CSS pixels.

        Read from `--dash-stage-max` on :root so the layout owns the number.
        The token is a `min()` expression, which getComputedStyle resolves to
        a used length only when it is applied to a property — so it is read
        off a throwaway probe element rather than parsed by hand. Cached,
        because resize() can fire many times during a drag of the window
        edge, and re-measuring per frame is a layout thrash for a value that
        only changes when the viewport does. */
    _maxHeight() {
      if (this._maxH != null && this._maxHVw === window.innerHeight) return this._maxH;
      let px = Infinity;
      try {
        const probe = document.createElement('div');
        probe.style.cssText =
          'position:absolute;visibility:hidden;height:var(--dash-stage-max)';
        document.body.appendChild(probe);
        const measured = parseFloat(getComputedStyle(probe).height);
        probe.remove();
        if (measured > 0) px = measured;
      } catch (e) {
        /* No document body yet, or a engine that declines the custom
           property. An uncapped stage is the old behaviour, not a crash. */
      }
      this._maxH = px;
      this._maxHVw = window.innerHeight;
      return px;
    }

    setWorld(world) { this.world = world; this._computeMap(); this.draw(); }

    _computeMap() {
      const [x0, x1] = this.world.x, [y0, y1] = this.world.y;
      const ww = x1 - x0, wh = y1 - y0;
      let sx = this.w / ww, sy = this.h / wh;
      if (this.fit === 'contain') { const s = Math.min(sx, sy); sx = s; sy = s; }
      this._sx = sx; this._sy = sy;
      this._ox = (this.w - ww * sx) / 2 - x0 * sx;
      this._oy = this.yUp
        ? this.h - ((this.h - wh * sy) / 2 - y0 * sy)
        : (this.h - wh * sy) / 2 - y0 * sy;
      this._flip = this.yUp ? -1 : 1;
    }

    /* ---- coordinate mapping ---- */
    X(x) { return this._ox + x * this._sx; }
    Y(y) { return this._oy + this._flip * y * this._sy; }
    S(v) { return v * this._sx; }                 // world length -> px
    invX(px) { return (px - this._ox) / this._sx; }
    invY(py) { return (py - this._oy) / (this._flip * this._sy); }
    pt(p) { return [this.X(p[0]), this.Y(p[1])]; }

    /* ---- draw pipeline ---- */
    onDraw(fn) { this._drawFns.push(fn); return this; }
    clearDraw() { this._drawFns = []; return this; }

    draw() {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      if (this.bg !== 'none') { ctx.fillStyle = this.bg; ctx.fillRect(0, 0, this.w, this.h); }
      for (const fn of this._drawFns) fn(ctx, this);
      this._drawHandles(ctx);
    }

    /** Schedule a redraw on the next frame; safe to call many times. */
    invalidate() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = null; this.draw(); });
    }

    /** Continuous animation. fn(dt, t) returns false to stop. */
    animate(fn) {
      this.stop();
      const t0 = performance.now();
      let last = t0;
      const step = now => {
        const dt = (now - last) / 1000; last = now;
        if (fn(dt, (now - t0) / 1000) === false) { this._anim = null; return; }
        this.draw();
        this._anim = requestAnimationFrame(step);
      };
      this._anim = requestAnimationFrame(step);
      return this;
    }
    stop() { if (this._anim) cancelAnimationFrame(this._anim); this._anim = null; }

    /* ---- primitives (all take world coordinates unless noted) ---- */
    line(a, b, o) {
      o = o || {}; const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = o.color || C.s400;
      ctx.lineWidth = o.width || 1;
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.lineCap = o.cap || 'butt';
      ctx.beginPath();
      ctx.moveTo(this.X(a[0]), this.Y(a[1]));
      ctx.lineTo(this.X(b[0]), this.Y(b[1]));
      ctx.stroke();
      ctx.restore();
      return this;
    }

    poly(pts, o) {
      o = o || {}; const ctx = this.ctx;
      if (pts.length < 2) return this;
      ctx.save();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      ctx.moveTo(this.X(pts[0][0]), this.Y(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(this.X(pts[i][0]), this.Y(pts[i][1]));
      if (o.close) ctx.closePath();
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.color !== null) {
        ctx.strokeStyle = o.color || C.s400;
        ctx.lineWidth = o.width || 1;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.restore();
      return this;
    }

    arrow(a, b, o) {
      o = o || {}; const ctx = this.ctx;
      const ax = this.X(a[0]), ay = this.Y(a[1]);
      const bx = this.X(b[0]), by = this.Y(b[1]);
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      if (L < 0.5) return this;
      const head = Math.min(o.head || 9, L * 0.45);
      const ux = dx / L, uy = dy / L;
      const tipX = bx, tipY = by;
      const baseX = bx - ux * head, baseY = by - uy * head;
      ctx.save();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      ctx.strokeStyle = o.color || C.azure400;
      ctx.fillStyle = o.color || C.azure400;
      ctx.lineWidth = o.width || 1.6;
      ctx.lineCap = 'round';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(baseX, baseY); ctx.stroke();
      ctx.setLineDash([]);
      const wgt = head * 0.42;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(baseX - uy * wgt, baseY + ux * wgt);
      ctx.lineTo(baseX + uy * wgt, baseY - ux * wgt);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      return this;
    }

    dot(p, o) {
      o = o || {}; const ctx = this.ctx;
      const r = o.r || 4;
      ctx.save();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      ctx.beginPath();
      ctx.arc(this.X(p[0]), this.Y(p[1]), r, 0, Math.PI * 2);
      if (o.fill !== null) { ctx.fillStyle = o.fill || o.color || C.azure400; ctx.fill(); }
      if (o.ring) {
        ctx.strokeStyle = o.ring; ctx.lineWidth = o.ringWidth || 1.5; ctx.stroke();
      }
      ctx.restore();
      return this;
    }

    /** A square marker — used where a point must read as "a measurement". */
    square(p, o) {
      o = o || {}; const ctx = this.ctx;
      const r = o.r || 3.5;
      ctx.save();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      ctx.beginPath();
      ctx.rect(this.X(p[0]) - r, this.Y(p[1]) - r, r * 2, r * 2);
      if (o.fill !== null) { ctx.fillStyle = o.fill || o.color || C.amber400; ctx.fill(); }
      if (o.ring) { ctx.strokeStyle = o.ring; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
      return this;
    }

    cross(p, o) {
      o = o || {}; const ctx = this.ctx;
      const r = o.r || 5, x = this.X(p[0]), y = this.Y(p[1]);
      ctx.save();
      ctx.strokeStyle = o.color || C.amber400;
      ctx.lineWidth = o.width || 1.4;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
      ctx.stroke(); ctx.restore();
      return this;
    }

    circle(c, r, o) {
      o = o || {}; const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      ctx.arc(this.X(c[0]), this.Y(c[1]), this.S(r), 0, Math.PI * 2);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.color !== null) { ctx.strokeStyle = o.color || C.s400; ctx.lineWidth = o.width || 1; ctx.stroke(); }
      ctx.restore();
      return this;
    }

    /** Ellipse from two semi-axis vectors (world coords). The covariance shape. */
    ellipseAxes(c, a1, a2, o) {
      o = o || {};
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
        pts.push([c[0] + a1[0] * ct + a2[0] * st, c[1] + a1[1] * ct + a2[1] * st]);
      }
      return this.poly(pts, Object.assign({ close: true }, o));
    }

    text(p, str, o) {
      o = o || {}; const ctx = this.ctx;
      ctx.save();
      ctx.font = o.font || FONT;
      ctx.fillStyle = o.color || C.s400;
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'middle';
      const x = this.X(p[0]) + (o.dx || 0), y = this.Y(p[1]) + (o.dy || 0);
      if (o.box) {
        const m = ctx.measureText(str);
        const pad = 3.5, hh = 7;
        let bx = x;
        if (ctx.textAlign === 'center') bx = x - m.width / 2;
        else if (ctx.textAlign === 'right') bx = x - m.width;
        ctx.fillStyle = o.box === true ? alpha(C.ink900, 0.88) : o.box;
        ctx.fillRect(bx - pad, y - hh - 1, m.width + pad * 2, hh * 2 + 2);
        ctx.fillStyle = o.color || C.s400;
      }
      ctx.fillText(str, x, y);
      ctx.restore();
      return this;
    }

    /** Text positioned in pixels from a canvas corner — for HUD labels. */
    hud(px, py, str, o) {
      o = o || {}; const ctx = this.ctx;
      ctx.save();
      ctx.font = o.font || FONT;
      ctx.fillStyle = o.color || C.s500;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'top';
      ctx.fillText(str, px < 0 ? this.w + px : px, py < 0 ? this.h + py : py);
      ctx.restore();
      return this;
    }

    /** The rubber-sheet grid. `map` transforms a world point before drawing,
        which is what turns this into the "matrix warps space" picture. */
    grid(o) {
      o = o || {};
      const step = o.step || 1;
      const [x0, x1] = o.x || this.world.x, [y0, y1] = o.y || this.world.y;
      const map = o.map || (p => p);
      const seg = o.curved === false ? 1 : 24;
      const col = o.color || C.lineSoft;
      const colMajor = o.majorColor || C.line;
      const draw = (a, b, major) => {
        const pts = [];
        for (let i = 0; i <= seg; i++) {
          const t = i / seg;
          pts.push(map([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
        }
        this.poly(pts, { color: major ? colMajor : col, width: major ? 1 : 1 });
      };
      for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step)
        draw([x, y0], [x, y1], Math.abs(x) < 1e-9);
      for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step)
        draw([x0, y], [x1, y], Math.abs(y) < 1e-9);
      return this;
    }

    /** Plain axes with ticks. */
    axes(o) {
      o = o || {};
      const [x0, x1] = o.x || this.world.x, [y0, y1] = o.y || this.world.y;
      this.line([x0, 0], [x1, 0], { color: o.color || C.ink600, width: 1 });
      this.line([0, y0], [0, y1], { color: o.color || C.ink600, width: 1 });
      if (o.labels) {
        this.text([x1, 0], o.labels[0], { dx: -4, dy: -9, align: 'right', color: C.s500 });
        this.text([0, y1], o.labels[1], { dx: 6, dy: 8, color: C.s500 });
      }
      return this;
    }

    /* ---- draggable handles ---- */
    /**
     * @param {object} h  { get:()=>[x,y], set:(x,y)=>void, r, color, label,
     *                      hint, constrain:(x,y)=>[x,y] }
     */
    addHandle(h) { this.handles.push(h); return h; }
    clearHandles() { this.handles = []; }

    _drawHandles(ctx) {
      for (const h of this.handles) {
        if (h.hidden && h.hidden()) continue;
        const p = h.get();
        const x = this.X(p[0]), y = this.Y(p[1]);
        const active = this._dragging === h || this._hover === h;
        const r = (h.r || 6) + (active ? 1.5 : 0);
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = alpha(h.color || C.azure400, active ? 0.22 : 0.10);
        ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = h.color || C.accent;
        ctx.fill();
        /* The ring is the stage background, not white: it reads as a cut-out
           separating the handle from whatever it sits on, and white would be
           invisible on the light canvas. */
        ctx.strokeStyle = active ? this.bg : alpha(this.bg, 0.65);
        ctx.lineWidth = 1.25; ctx.stroke();

        /* Keyboard focus is drawn, not implied. Two concentric rings in
           opposing colours so the indicator survives any background it lands
           on (2.4.7, 1.4.11). */
        if (this._kbHandle === h && this._focused) {
          ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = this.bg; ctx.lineWidth = 4; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.stroke();
        }
        if (h.label) {
          ctx.font = FONT_UI;
          ctx.fillStyle = active ? C.white : C.s300;
          ctx.textAlign = h.labelAlign || 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(h.label, x + (h.labelAlign === 'right' ? -r - 7 : r + 7), y - 0.5);
        }
        ctx.restore();
      }
    }

    /* ------------------------------------------------------------------
       Keyboard operation of the handles.

       The upstream stage is pointer-only. A figure whose whole point is that
       you can grab it is unusable without a mouse unless the same grab is
       reachable from the keyboard (2.1.1), so every handle is drivable with
       the arrow keys and the gesture is announced.

       The canvas takes one tab stop, not one per handle: twenty widgets with
       four handles each would otherwise put eighty stops between the reader
       and the next paragraph. Enter cycles within the figure.
       ------------------------------------------------------------------ */

    _visibleHandles() {
      return this.handles.filter(h => !(h.hidden && h.hidden()));
    }

    _announce(msg) {
      if (this.onAnnounce) this.onAnnounce(msg);
    }

    _bindKeyboard() {
      const cv = this.canvas;
      cv.addEventListener('focus', () => {
        this._focused = true;
        const vis = this._visibleHandles();
        if (vis.length && !vis.includes(this._kbHandle)) this._kbHandle = vis[0];
        if (this._kbHandle) {
          this._announce(`${this._kbHandle.label || 'point'} selected. `
            + 'Arrow keys move it, Enter selects the next point.');
        }
        this.invalidate();
      });
      cv.addEventListener('blur', () => { this._focused = false; this.invalidate(); });

      cv.addEventListener('keydown', e => {
        const vis = this._visibleHandles();
        if (!vis.length) return;
        if (!vis.includes(this._kbHandle)) this._kbHandle = vis[0];
        const h = this._kbHandle;

        if (e.key === 'Enter' || e.key === ' ') {
          const next = vis[(vis.indexOf(h) + 1) % vis.length];
          this._kbHandle = next;
          this._announce(`${next.label || 'point'} selected.`);
          this.invalidate();
          e.preventDefault();
          return;
        }

        const dirs = {
          ArrowLeft: [-1, 0], ArrowRight: [1, 0],
          ArrowUp: [0, 1], ArrowDown: [0, -1]
        };
        const d = dirs[e.key];
        if (!d) return;

        /* One press is 1% of the world width; Shift is 10%, so a reader can
           cross the figure in ten presses or place a point precisely. */
        const span = this.world.x[1] - this.world.x[0];
        const stepSize = span * (e.shiftKey ? 0.1 : 0.01);
        const p = h.get();
        let nx = p[0] + d[0] * stepSize;
        let ny = p[1] + d[1] * (this.yUp ? stepSize : -stepSize);
        if (h.constrain) [nx, ny] = h.constrain(nx, ny);
        h.set(nx, ny);
        if (this.onChange) this.onChange(h);
        this.invalidate();
        e.preventDefault();
      });
    }

    _hit(px, py) {
      let best = null, bd = 15;
      for (const h of this.handles) {
        if (h.hidden && h.hidden()) continue;
        const p = h.get();
        const d = Math.hypot(this.X(p[0]) - px, this.Y(p[1]) - py);
        if (d < bd) { bd = d; best = h; }
      }
      return best;
    }

    _local(e) {
      const r = this.canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    _bindPointer() {
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => {
        const [px, py] = this._local(e);
        const h = this._hit(px, py);
        if (h) {
          this._dragging = h;
          cv.setPointerCapture(e.pointerId);
          e.preventDefault();
          if (h.onGrab) h.onGrab();
          this.invalidate();
        } else if (this.onBackgroundDown) {
          this.onBackgroundDown(this.invX(px), this.invY(py), e);
        }
      });
      cv.addEventListener('pointermove', e => {
        const [px, py] = this._local(e);
        this._pointer = [this.invX(px), this.invY(py)];
        if (this._dragging) {
          let wx = this.invX(px), wy = this.invY(py);
          if (this._dragging.constrain) [wx, wy] = this._dragging.constrain(wx, wy);
          this._dragging.set(wx, wy);
          if (this.onChange) this.onChange();
          this.invalidate();
        } else {
          const h = this._hit(px, py);
          if (h !== this._hover) { this._hover = h; this.invalidate(); }
          cv.style.cursor = h ? 'grab' : (this.onBackgroundDown ? 'crosshair' : 'default');
          if (this.onHover) { this.onHover(this.invX(px), this.invY(py)); this.invalidate(); }
        }
      });
      const end = e => {
        if (this._dragging) {
          if (this._dragging.onRelease) this._dragging.onRelease();
          this._dragging = null;
          try { cv.releasePointerCapture(e.pointerId); } catch (_) {}
          this.invalidate();
        }
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('pointerleave', () => {
        this._pointer = null; this._hover = null;
        if (this.onHover) this.onHover(null, null);
        this.invalidate();
      });
    }
  }

  /* ==========================================================================
     Cam3 — a tiny orbiting perspective camera for line-art 3D on a 2D canvas.
     Deliberately not a 3D engine: no shading, no textures, just projected
     points and lines, so 3D figures look like the 2D ones.
     ======================================================================== */
  class Cam3 {
    constructor(opt) {
      opt = opt || {};
      this.yaw = opt.yaw != null ? opt.yaw : 0.75;      // radians, around world +Z
      this.pitch = opt.pitch != null ? opt.pitch : 0.42; // radians, up from XY plane
      this.dist = opt.dist != null ? opt.dist : 9;
      this.target = opt.target || [0, 0, 0];
      this.fov = opt.fov != null ? opt.fov : 1.0;        // controls the scale
      this.up = opt.up || 'z';                            // 'z' or 'y'
    }

    eye() {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const d = this.dist;
      if (this.up === 'z') return [this.target[0] + d * cp * cy, this.target[1] + d * cp * sy, this.target[2] + d * sp];
      return [this.target[0] + d * cp * sy, this.target[1] + d * sp, this.target[2] + d * cp * cy];
    }

    basis() {
      const e = this.eye();
      const fwd = norm3(sub3(this.target, e));
      const worldUp = this.up === 'z' ? [0, 0, 1] : [0, 1, 0];
      let right = norm3(cr(fwd, worldUp));
      if (!isFinite(right[0])) right = [1, 0, 0];
      const up = cr(right, fwd);
      return { e, fwd, right, up };
    }

    /** Project a world point. Returns {x, y, z} in a normalised view plane
        (roughly -1..1) plus camera-space depth z. Behind-camera points get z<0. */
    project(p) {
      const b = this._b || (this._b = this.basis());
      const v = sub3(p, b.e);
      const z = d3(v, b.fwd);
      const x = d3(v, b.right), y = d3(v, b.up);
      const s = this.fov / Math.max(z, 1e-4);
      return { x: x * s, y: y * s, z };
    }

    /** Call after changing yaw/pitch/dist/target. */
    update() { this._b = this.basis(); return this; }

    /** Attach mouse-drag orbiting to a Stage. */
    orbit(stage, opt) {
      opt = opt || {};
      const cv = stage.canvas;
      let last = null;
      const dn = e => {
        if (stage._hit(...stage._local(e))) return;   // handles win
        last = [e.clientX, e.clientY];
        cv.setPointerCapture(e.pointerId);
        cv.style.cursor = 'grabbing';
      };
      const mv = e => {
        if (!last) return;
        const dx = e.clientX - last[0], dy = e.clientY - last[1];
        last = [e.clientX, e.clientY];
        this.yaw -= dx * 0.008;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * 0.008));
        this.update();
        if (opt.onChange) opt.onChange();
        stage.invalidate();
      };
      const up = () => { last = null; cv.style.cursor = ''; };
      cv.addEventListener('pointerdown', dn);
      cv.addEventListener('pointermove', mv);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      if (opt.zoom !== false) {
        cv.addEventListener('wheel', e => {
          e.preventDefault();
          this.dist = Math.max(opt.minDist || 2.2, Math.min(opt.maxDist || 40,
            this.dist * (1 + Math.sign(e.deltaY) * 0.09)));
          this.update(); stage.invalidate();
        }, { passive: false });
      }
      this.update();
      return this;
    }
  }

  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const d3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm3 = a => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

  /* ==========================================================================
     Painter — depth-sorted drawing for the 3D scenes.
     ======================================================================== */
  class Painter {
    constructor(stage, cam) { this.stage = stage; this.cam = cam; this.items = []; }
    clear() { this.items = []; return this; }

    /** Add a segment defined by two world points. */
    line3(a, b, o) {
      const A = this.cam.project(a), B = this.cam.project(b);
      if (A.z <= 0.02 && B.z <= 0.02) return this;
      this.items.push({ z: (A.z + B.z) / 2, kind: 'line', A, B, o: o || {} });
      return this;
    }
    arrow3(a, b, o) {
      const A = this.cam.project(a), B = this.cam.project(b);
      if (A.z <= 0.02 || B.z <= 0.02) return this;
      this.items.push({ z: (A.z + B.z) / 2, kind: 'arrow', A, B, o: o || {} });
      return this;
    }
    dot3(p, o) {
      const P = this.cam.project(p);
      if (P.z <= 0.02) return this;
      this.items.push({ z: P.z, kind: 'dot', A: P, o: o || {} });
      return this;
    }
    poly3(pts, o) {
      const P = pts.map(p => this.cam.project(p));
      if (P.some(p => p.z <= 0.02)) return this;
      const z = P.reduce((s, p) => s + p.z, 0) / P.length;
      this.items.push({ z, kind: 'poly', P, o: o || {} });
      return this;
    }
    text3(p, str, o) {
      const P = this.cam.project(p);
      if (P.z <= 0.02) return this;
      this.items.push({ z: P.z - 1e-3, kind: 'text', A: P, str, o: o || {} });
      return this;
    }

    /** Draw everything back-to-front. */
    flush() {
      const s = this.stage;
      this.items.sort((a, b) => b.z - a.z);
      for (const it of this.items) {
        const o = it.o;
        if (it.kind === 'line') s.line([it.A.x, it.A.y], [it.B.x, it.B.y], o);
        else if (it.kind === 'arrow') s.arrow([it.A.x, it.A.y], [it.B.x, it.B.y], o);
        else if (it.kind === 'dot') s.dot([it.A.x, it.A.y], o);
        else if (it.kind === 'poly') s.poly(it.P.map(p => [p.x, p.y]), o);
        else if (it.kind === 'text') s.text([it.A.x, it.A.y], it.str, o);
      }
      this.items = [];
      return this;
    }
  }

  /* ==========================================================================
     Small shared drawing recipes reused across widgets
     ======================================================================== */

  /** A camera drawn as a frustum pyramid, in world coordinates.
      R, t place it: columns of R are the camera axes in world coords. */
  function drawCamera(painter, R, t, opt) {
    opt = opt || {};
    const s = opt.size || 0.55;
    const ar = opt.aspect || 1.35;
    const f = opt.f || 1.1;                 // depth of the image plane, in units of s
    const col = opt.color || C.azure400;
    const ax = c => [R[0][c], R[1][c], R[2][c]];
    const X = ax(0), Y = ax(1), Z = ax(2);
    const P = (a, b, c) => [
      t[0] + X[0] * a + Y[0] * b + Z[0] * c,
      t[1] + X[1] * a + Y[1] * b + Z[1] * c,
      t[2] + X[2] * a + Y[2] * b + Z[2] * c
    ];
    const d = s * f;
    const corners = [P(-s * ar, -s, d), P(s * ar, -s, d), P(s * ar, s, d), P(-s * ar, s, d)];
    painter.poly3(corners, { color: col, width: 1.2, close: true,
      fill: opt.fill !== false ? alpha(col, 0.09) : null });
    for (const c of corners) painter.line3(t, c, { color: col, width: 1, alpha: 0.75 });
    painter.dot3(t, { r: 4, fill: col });
    if (opt.axes) {
      painter.arrow3(t, P(s * 1.5, 0, 0), { color: C.amber400, width: 1.3, head: 7 });
      painter.arrow3(t, P(0, s * 1.5, 0), { color: C.emerald400, width: 1.3, head: 7 });
      painter.arrow3(t, P(0, 0, s * 1.8), { color: C.iris400, width: 1.3, head: 7 });
    }
    if (opt.label) painter.text3(t, opt.label, { color: col, dx: 9, dy: -10, font: FONT_UI });
    return { corners, center: t, plane: (u, v) => P(u * s * ar, v * s, d) };
  }

  /** A ground grid in the world Z = z0 plane. */
  function drawGround(painter, opt) {
    opt = opt || {};
    const n = opt.n || 8, step = opt.step || 1, z0 = opt.z0 || 0;
    const col = opt.color || C.lineSoft;
    const e = n * step / 2;
    for (let i = 0; i <= n; i++) {
      const u = -e + i * step;
      painter.line3([u, -e, z0], [u, e, z0], { color: col, width: 1 });
      painter.line3([-e, u, z0], [e, u, z0], { color: col, width: 1 });
    }
    return painter;
  }

  global.Gfx = { C, alpha, refresh, Stage, Cam3, Painter, drawCamera, drawGround,
                 FONT, FONT_UI, _stages: STAGES };
})(window);
