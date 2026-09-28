// A thread is a polyline whose every vertex carries the time the needle laid
// it down. "Draw the thread at time t" is then just "every vertex with
// time <= t, plus an interpolated head".

import { searchSorted } from '../core/math.js';

export class TimedPath {
  constructor() {
    this.x = [];
    this.y = [];
    this.t = [];
    this.s = []; // cumulative arc length
  }
  get n() {
    return this.x.length;
  }
  get last() {
    const n = this.x.length - 1;
    return { x: this.x[n], y: this.y[n], t: this.t[n], s: this.s[n] };
  }
  push(x, y, t) {
    const n = this.x.length;
    if (n) {
      const dx = x - this.x[n - 1];
      const dy = y - this.y[n - 1];
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) {
        this.t[n - 1] = Math.max(this.t[n - 1], t);
        return this;
      }
      this.s.push(this.s[n - 1] + d);
    } else this.s.push(0);
    this.x.push(x);
    this.y.push(y);
    this.t.push(t);
    return this;
  }
  /** Straight run to (x, y) arriving at time t1; time spread by arc length. */
  lineTo(x, y, t1, step = 6) {
    const { x: x0, y: y0, t: t0 } = this.last;
    const d = Math.hypot(x - x0, y - y0);
    const k = Math.max(1, Math.ceil(d / step));
    for (let i = 1; i <= k; i++) this.push(x0 + ((x - x0) * i) / k, y0 + ((y - y0) * i) / k, t0 + ((t1 - t0) * i) / k);
    return this;
  }
  /** Polyline through pts [[x,y],...] arriving at t1, constant speed. */
  polyTo(pts, t1, step = 6) {
    const { x: x0, y: y0, t: t0 } = this.last;
    const all = [[x0, y0], ...pts];
    let total = 0;
    for (let i = 1; i < all.length; i++) total += Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]);
    let acc = 0;
    for (let i = 1; i < all.length; i++) {
      const [ax, ay] = all[i - 1];
      const [bx, by] = all[i];
      const d = Math.hypot(bx - ax, by - ay);
      const k = Math.max(1, Math.ceil(d / step));
      for (let j = 1; j <= k; j++) {
        const u = j / k;
        this.push(ax + (bx - ax) * u, ay + (by - ay) * u, t0 + ((t1 - t0) * (acc + d * u)) / (total || 1));
      }
      acc += d;
    }
    return this;
  }
  /** Quadratic Bézier to p via control c, arriving at t1. */
  quadTo(cx, cy, x, y, t1, steps = 24) {
    const { x: x0, y: y0 } = this.last;
    const pts = [];
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const a = (1 - u) * (1 - u);
      const b = 2 * (1 - u) * u;
      const c = u * u;
      pts.push([a * x0 + b * cx + c * x, a * y0 + b * cy + c * y]);
    }
    return this.polyTo(pts, t1, 1e9);
  }
  /** Sample a parametric curve f(τ) -> [x, y] for τ in (t0, t1]. */
  fn(t0, t1, f, dt = 1 / 480) {
    const k = Math.max(1, Math.ceil((t1 - t0) / dt));
    for (let i = 1; i <= k; i++) {
      const tau = t0 + ((t1 - t0) * i) / k;
      const [x, y] = f(tau);
      this.push(x, y, tau);
    }
    return this;
  }
  freeze() {
    this.x = Float64Array.from(this.x);
    this.y = Float64Array.from(this.y);
    this.t = Float64Array.from(this.t);
    this.s = Float64Array.from(this.s);
    return this;
  }
  /** Index of the last vertex laid by time t (-1 if none). */
  indexAt(t) {
    return searchSorted(this.t, t);
  }
  /** Interpolated needle position at time t. */
  headAt(t) {
    const n = this.x.length;
    const i = this.indexAt(t);
    if (i < 0) return { x: this.x[0], y: this.y[0], s: 0, i: -1, done: false };
    if (i >= n - 1) return { x: this.x[n - 1], y: this.y[n - 1], s: this.s[n - 1], i: n - 1, done: true };
    const dt = this.t[i + 1] - this.t[i];
    const u = dt > 0 ? (t - this.t[i]) / dt : 1;
    return {
      x: this.x[i] + (this.x[i + 1] - this.x[i]) * u,
      y: this.y[i] + (this.y[i + 1] - this.y[i]) * u,
      s: this.s[i] + (this.s[i + 1] - this.s[i]) * u,
      i,
      done: false,
    };
  }
  /** Point at arc length s. */
  atS(s) {
    const i = Math.max(0, searchSorted(this.s, s));
    const n = this.x.length;
    if (i >= n - 1) return { x: this.x[n - 1], y: this.y[n - 1], i: n - 1 };
    const d = this.s[i + 1] - this.s[i];
    const u = d > 0 ? (s - this.s[i]) / d : 0;
    return { x: this.x[i] + (this.x[i + 1] - this.x[i]) * u, y: this.y[i] + (this.y[i + 1] - this.y[i]) * u, i };
  }
  /** Smoothed heading at time t (averaged over `span` world units behind the head). */
  headingAt(t, span = 60) {
    const h = this.headAt(t);
    const b = this.atS(Math.max(0, h.s - span));
    const dx = h.x - b.x;
    const dy = h.y - b.y;
    return Math.hypot(dx, dy) < 1e-6 ? 0 : Math.atan2(dy, dx);
  }
}
