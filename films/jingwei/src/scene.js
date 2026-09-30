// 经纬 · Warp & Weft — the scene. render(ctx, t) draws one frame; it is a pure
// function of t, so any frame can be rendered in any order.

import { at, WIDTH as W, HEIGHT as H, DURATION } from './core/time.js';
import { clamp, ease, gauss, lerp, smoothstep, TAU, rng } from './core/math.js';
import { cues, HOOK_PLUCK, END_PLUCK, DROP, DIVE, TIMELINE, SILENCE, WARPS, WEFTS, TAUT_T0 } from './score.js';
import { buildJourney, HOLE, ANCHOR, DEPART, LEAD_WARP, WARP_GAP, WEFT_GAP } from './world/journey.js';
import { buildCrowd } from './world/crowd.js';
import { buildLoom } from './world/loom.js';
import { buildLabels } from './world/labels.js';
import { makeCamera } from './camera.js';
import { makePaperTile, drawPaper, drawGraticule } from './draw/paper.js';
import { drawThread, drawHoles } from './draw/thread.js';
import { drawNeedle } from './draw/needle.js';
import { drawLabel } from './draw/type.js';
import { RED, WEFT, GOLD, shade, rgba, SHADOW_RGB } from './draw/palette.js';

const THREAD_W = 5.2; // world units
const NEEDLE_L = 150;

export function createScene({ createCanvas, Path2D }) {
  const journey = buildJourney();
  const loom = buildLoom(journey);
  const crowd = buildCrowd(journey);
  const world = { journey, loom, crowd };
  const labels = buildLabels(world);
  const camera = makeCamera(world);
  const paper = makePaperTile(createCanvas);
  const lead = journey.path;
  const leadTaut = cues.warpTaut[LEAD_WARP];
  const redN = shade(RED, 1);
  const weftN = shade(WEFT, 1);
  const K = [0.74, 0.84, 0.93, 1.0, 1.08, 1.17, 1.27];
  const redK = K.map((k) => shade(RED, k));
  const weftK = K.map((k) => shade(WEFT, k));
  const goldK = K.map((k) => shade(GOLD, k));
  const bucket = (k) => {
    let b = 0;
    let best = 9;
    for (let i = 0; i < K.length; i++) if (Math.abs(K[i] - k) < best) (best = Math.abs(K[i] - k)), (b = i);
    return b;
  };
  const maxN = Math.max(lead.n, ...crowd.map((c) => c.path.n)) + 8;
  const bufX = new Float32Array(maxN);
  const bufY = new Float32Array(maxN);

  // ── Camera plumbing ────────────────────────────────────────────────────────
  let cam;
  let cc = 1;
  let cs = 0;
  const toScreen = (x, y) => {
    const dx = x - cam.x;
    const dy = y - cam.y;
    return [W / 2 + (dx * cc - dy * cs) * cam.z, H / 2 + (dx * cs + dy * cc) * cam.z];
  };
  const setWorld = (ctx) => () => ctx.setTransform(cam.z * cc, cam.z * cs, -cam.z * cs, cam.z * cc, W / 2 - cam.z * (cc * cam.x - cs * cam.y), H / 2 - cam.z * (cs * cam.x + cc * cam.y));

  // ── Cloth: waves launched by the kicks during the flag ─────────────────────
  const hoistY = loom.warpY(0) - WARP_GAP / 2;
  const clothEnv = (t) => smoothstep(DROP - 0.05, DROP + 0.5, t) * (1 - smoothstep(DIVE[0] - 0.1, DIVE[0] + 0.45, t));
  function cloth(wy, wx, t) {
    const env = clothEnv(t);
    if (env <= 0) return 0;
    const u = wy - hoistY; // 0 at hoist … 360 at fly
    const v = (loom.top - wx) / loom.height;
    const hold = smoothstep(-10, 70, u);
    let z = 2.4 * Math.sin(TAU * (u / 210 + v * 0.2 - 0.8 * (t - DROP))) * hold;
    for (const tp of cues.pulses) {
      const d = t - tp;
      if (d < 0 || d > 1.4) continue;
      // A kick launches a swell from the hoist that rolls out to the fly.
      const front = d * 400 - 30;
      z += 8.5 * Math.exp(-2.1 * d) * (gauss(u - front, 38) - 0.45 * gauss(u - front + 70, 34)) * hold * (tp === DROP ? 1.4 : 1);
    }
    // Loose warps below the cloth follow, fading out.
    const below = wx < loom.Xa ? Math.exp(-(loom.Xa - wx) / 60) : 1;
    return z * env * below;
  }
  const clothSlope = (wy, wx, t) => (cloth(wy + 2, wx, t) - cloth(wy - 2, wx, t)) / 4;
  const inCloth = (wx) => wx > loom.Xa - 260 && wx < loom.fringeTop + 60;
  // Displace a world point by the cloth (height → up the screen, like a relief).
  const clothShift = (wx, wy, t) => (inCloth(wx) ? cloth(wy, wx, t) * 0.7 : 0);

  // ── Thread vibrations ──────────────────────────────────────────────────────
  // A pluck shivers the last stretch of thread behind the needle at that moment.
  const leadPlucks = cues.plucks
    .filter((e) => e.t > DEPART && e.t < at(6) + 0.2)
    .map((e) => ({ t: e.t, s: lead.headAt(e.t).s, a: 5 + e.v * 9 }));

  function projectPath(path, n, head, t, dispFn) {
    let k = 0;
    const put = (i, x, y) => {
      const off = dispFn ? dispFn(i, x, y) : null;
      let px = x;
      let py = y;
      if (off) {
        px += off[0];
        py += off[1];
      }
      const dx = px - cam.x;
      const dy = py - cam.y;
      bufX[k] = W / 2 + (dx * cc - dy * cs) * cam.z;
      bufY[k] = H / 2 + (dx * cs + dy * cc) * cam.z;
      k++;
    };
    for (let i = 0; i <= n; i++) put(i, path.x[i], path.y[i]);
    if (head) put(n + 0.5, head.x, head.y);
    return { x: bufX, y: bufY, n: k };
  }

  function normalAt(path, i) {
    const a = Math.max(0, i - 2);
    const b = Math.min(path.n - 1, i + 2);
    const dx = path.x[b] - path.x[a];
    const dy = path.y[b] - path.y[a];
    const d = Math.hypot(dx, dy) || 1;
    return [-dy / d, dx / d];
  }

  // Each weft pass strums the warps: warp i twangs at the instant the needle crosses it.
  const passCross = (row, wy) => {
    const r = loom.weft[row];
    const ya = r.dir > 0 ? loom.warpY(0) - 8 : loom.warpY(WARPS - 1) + 8;
    const yb = r.dir > 0 ? loom.warpY(WARPS - 1) + 8 : loom.warpY(0) - 8;
    const f = clamp((wy - ya) / (yb - ya));
    return r.t0 + ((r.t1 - r.t0) * Math.acos(1 - 2 * f)) / Math.PI; // inverse of inOutSine
  };
  function strum(t, wx, wy) {
    if (t < at(7) || t > SILENCE[0]) return 0;
    let y = 0;
    let fell = loom.Xa;
    for (let j = 0; j < WEFTS; j++) {
      const r = loom.weft[j];
      if (r.t1 <= t) fell = loom.rowX(j) + WEFT_GAP / 2;
      if (t < r.t0 || t > r.t1 + 0.6) continue;
      const tc = passCross(j, wy);
      const d = t - tc;
      if (d < 0 || d > 0.6) continue;
      const amp = j < 4 ? 2.4 : j < 10 ? 1.5 : 0.6;
      y += amp * Math.exp(-7 * d) * Math.sin(TAU * 13 * d);
    }
    if (!y || wx <= fell) return 0;
    const top = loom.fringeTop;
    return y * Math.sin(Math.PI * clamp((wx - fell) / (top - fell)));
  }

  function twang(t, tt, s, s0, s1, amp, f = 10) {
    const d = t - tt;
    if (d < 0 || d > 1.2 || s < s0 || s > s1) return 0;
    return amp * Math.exp(-4.5 * d) * Math.sin(TAU * f * d) * Math.sin((Math.PI * (s - s0)) / (s1 - s0));
  }

  // ── Lead thread ────────────────────────────────────────────────────────────
  function drawLead(ctx, t) {
    const w = THREAD_W * cam.z;
    if (t < HOOK_PLUCK) return drawHookFlight(ctx, t);
    const head = lead.headAt(t);
    const n = Math.max(0, head.i);
    const anchorS = ANCHOR.x;
    const pluckAt = (s, d) => {
      let off = 0;
      for (const p of leadPlucks) {
        const dt = t - p.t;
        if (dt < 0 || dt > 0.9) continue;
        const L = 440;
        if (s > p.s || s < p.s - L) continue;
        off += p.a * Math.exp(-5.5 * dt) * Math.sin(TAU * 9 * dt + d) * Math.sin((Math.PI * (s - p.s + L)) / L);
      }
      return off;
    };
    // The hook span (hole → anchor) vibrates as a taut string at the first and last pluck.
    const hookVib = (x) => {
      let y = 0;
      for (const [tp, amp] of [[HOOK_PLUCK, 26], [END_PLUCK, 24]]) {
        const d = t - tp;
        if (d < 0 || d > 3) continue;
        const u = x / ANCHOR.x;
        y += amp * Math.exp(-2.5 * d) * Math.sin(Math.PI * u) * Math.cos(TAU * 7.2 * d) + amp * 0.28 * Math.exp(-4 * d) * Math.sin(TAU * u) * Math.cos(TAU * 12.5 * d + 0.7);
      }
      return y;
    };
    const warpS0 = lead.headAt(TAUT_T0).s - 300;
    const warpS1 = lead.s[lead.n - 1];
    const disp = (i, x, y) => {
      const ii = Math.min(lead.n - 1, Math.floor(i));
      const s = lead.s[ii];
      let ox = 0;
      let oy = 0;
      if (s <= anchorS + 1) oy += hookVib(x);
      else if (t < at(6) + 1.2) {
        const a = pluckAt(s, 0);
        if (a) {
          const nr = normalAt(lead, ii);
          ox += nr[0] * a;
          oy += nr[1] * a;
        }
      }
      if (s > warpS0) {
        oy += twang(t, leadTaut, s, warpS0, warpS1, 3.2) + strum(t, x, y);
        ox += clothShift(x, y, t);
      }
      return ox || oy ? [ox, oy] : null;
    };
    const runs = [projectPath(lead, n, head.done ? null : head, t, disp)];
    // Lift: the span is off the paper while ringing.
    let lift = 0;
    for (const tp of [HOOK_PLUCK, END_PLUCK]) {
      const d = t - tp;
      if (d >= 0 && d < 3) lift = Math.max(lift, 12 * Math.exp(-1.2 * d));
    }
    drawThread(ctx, Path2D, runs, redN, { w, lift: lift * cam.z * 0.5, twist: 0, seed: 11 });
  }

  // Bar 1: the needle comes up through the paper and flies to the anchor.
  // Emerge (tip first, the eye still under the paper), then fly, then snap taut.
  const EMERGE = 0.13;
  function flight(t) {
    const t0 = at(1, 1);
    if (t < t0 + EMERGE) {
      const u = clamp((t - t0) / EMERGE);
      return { phase: 0, u: 0, e: ease.outCubic(u), x: 0, y: 0, lift: 2 + 26 * u, heading: -0.55 + 0.25 * u };
    }
    const u = clamp((t - t0 - EMERGE) / (HOOK_PLUCK - t0 - EMERGE));
    const e = 1 - (1 - u) ** 2.1;
    const x = ANCHOR.x * e;
    const y = -175 * Math.sin(Math.PI * u ** 0.75) * (1 - u ** 4);
    const lift = 28 + 70 * Math.sin(Math.PI * u) - 20 * u;
    return { phase: 1, u, e: 1, x, y, lift };
  }
  function drawHookFlight(ctx, t) {
    const w = THREAD_W * cam.z;
    if (t < at(1, 1)) return;
    const f = flight(t);
    if (f.phase === 0) {
      // Only the tip is through: the needle grows out of the hole.
      const [nx, ny] = toScreen(0, 0);
      drawNeedle(ctx, nx, ny, f.heading + cam.r, NEEDLE_L * cam.z * (0.12 + 0.88 * f.e), { lift: f.lift * cam.z * 0.5 });
      return;
    }
    // Thread trails behind: a sagging curve from the hole to the eye.
    const cx = f.x * 0.42;
    const cy = f.y * 0.95 + 70 * Math.sin(Math.PI * f.u) * (1 - f.u);
    // The needle lies along the thread it is pulling.
    const heading = Math.atan2(f.y - cy, f.x - cx);
    for (let k = 0; k <= 40; k++) {
      const s = k / 40;
      const x = (1 - s) ** 2 * HOLE.x + 2 * (1 - s) * s * cx + s * s * f.x;
      const y = (1 - s) ** 2 * HOLE.y + 2 * (1 - s) * s * cy + s * s * f.y;
      const [sx, sy] = toScreen(x, y);
      bufX[k] = sx;
      bufY[k] = sy;
    }
    const len = Math.hypot(f.x, f.y) + 40;
    drawThread(ctx, Path2D, [{ x: bufX, y: bufY, n: 41 }], redN, { w, lift: f.lift * 0.5 * cam.z, twist: -len * cam.z, seed: 5 });
    const [nx, ny] = toScreen(f.x, f.y);
    drawNeedle(ctx, nx, ny, heading + cam.r, NEEDLE_L * cam.z, { lift: f.lift * cam.z * 0.8 });
  }

  // ── Crowd ──────────────────────────────────────────────────────────────────
  function drawCrowd(ctx, t, pass) {
    if (t < 12.4) return;
    const w = THREAD_W * cam.z;
    for (const c of crowd) {
      if (t < c.revealT) continue;
      const p = c.path;
      const head = p.headAt(t);
      const r = ease.outCubic(clamp((t - c.revealT) / 0.42));
      const sVis = head.s * r;
      if (pass === 'needle') {
        if (t < cues.warpTaut[c.i] + 0.12) {
          const pt = r < 1 ? p.atS(sVis) : head;
          const hd = r < 1 ? Math.atan2(p.y[Math.min(p.n - 1, pt.i + 1)] - p.y[pt.i], p.x[Math.min(p.n - 1, pt.i + 1)] - p.x[pt.i]) : p.headingAt(t, 80);
          const [sx, sy] = toScreen(pt.x, pt.y + clothShift(pt.x, pt.y, t) * 0);
          const dive = 1 - clamp((t - cues.warpTaut[c.i]) / 0.12);
          drawNeedle(ctx, sx, sy, hd + cam.r, NEEDLE_L * 0.8 * cam.z * dive, { lift: 3 * cam.z, alpha: 0.95 });
        }
        continue;
      }
      let n;
      let hd = null;
      if (r < 1) {
        const pt = p.atS(sVis);
        n = pt.i;
        hd = pt;
      } else {
        n = Math.max(0, head.i);
        hd = head.done ? null : head;
      }
      const s0 = p.s[p.n - 1] - 262 - 320;
      const s1 = p.s[p.n - 1];
      const disp = (i, x, y) => {
        const ii = Math.min(p.n - 1, Math.floor(i));
        const s = p.s[ii];
        let ox = 0;
        let oy = 0;
        // Reveal shiver near the head.
        const d = t - c.revealT;
        if (d < 0.8 && s > sVis - 500) {
          const a = 7 * Math.exp(-5 * d) * Math.sin(TAU * 8 * d) * clamp((s - (sVis - 500)) / 500);
          const nr = normalAt(p, ii);
          ox += nr[0] * a;
          oy += nr[1] * a;
        }
        if (s > s0) {
          oy += twang(t, cues.warpTaut[c.i], s, s0, s1, 3.2) + strum(t, x, c.y);
          ox += clothShift(x, y, t);
        }
        return ox || oy ? [ox, oy] : null;
      };
      const runs = [projectPath(p, n, hd, t, disp)];
      drawThread(ctx, Path2D, runs, redN, { w: w * c.width, twist: 0, seed: c.seed });
    }
  }

  // ── Weaving ────────────────────────────────────────────────────────────────
  const yLeft = loom.warpY(0) - 8;
  const yRight = loom.warpY(WARPS - 1) + 8;
  function rowState(j, t) {
    const r = loom.weft[j];
    if (t < r.t0) return null;
    const u = clamp((t - r.t0) / (r.t1 - r.t0));
    const pe = ease.inOutSine(u);
    const ya = r.dir > 0 ? yLeft : yRight;
    const yb = r.dir > 0 ? yRight : yLeft;
    // Beat-in: the pick floats loose, then is packed down on the woodblock.
    const settle = ease.outBack(clamp((t - r.t1) / 0.09), 2.2);
    const loose = (j < 10 ? 3.2 : 1.6) * (1 - settle);
    return { u, y: lerp(ya, yb, pe), ya, yb, dir: r.dir, x: loom.rowX(j) + loose, done: u >= 1 };
  }

  function drawWeave(ctx, t) {
    if (t < at(7) - 0.05) return;
    const w = THREAD_W * cam.z;
    const rows = [];
    for (let j = 0; j < WEFTS; j++) {
      const s = rowState(j, t);
      if (!s) break;
      rows.push(s);
    }
    if (!rows.length) return;
    const waveK = (wx, wy) => {
      const sl = clothSlope(wy, wx, t);
      return 1 - sl * 0.75;
    };
    // Weft: one continuous thread, turning at each selvedge.
    const pts = [[loom.rowX(0) - 2, yLeft - 14], [loom.rowX(0), yLeft - 7]];
    rows.forEach((r, j) => {
      const steps = 30;
      const yEnd = r.done ? r.yb : r.y;
      for (let k = 0; k <= steps; k++) {
        const y = lerp(r.ya, yEnd, k / steps);
        pts.push([r.x, y]);
      }
      if (r.done && j + 1 < rows.length) {
        const nx = rows[j + 1].x;
        const side = r.dir > 0 ? 1 : -1;
        for (let k = 1; k < 6; k++) {
          const a = (k / 6) * Math.PI;
          pts.push([lerp(r.x, nx, k / 6), r.yb + side * Math.sin(a) * 3.2]);
        }
      }
    });
    const n = pts.length;
    for (let k = 0; k < n; k++) {
      const [x, y] = pts[k];
      const [sx, sy] = toScreen(x + clothShift(x, y, t), y);
      bufX[k] = sx;
      bufY[k] = sy;
    }
    const clothOn = clothEnv(t) > 0.01;
    drawThread(ctx, Path2D, [{ x: bufX, y: bufY, n }], weftN, { w: w * 0.96, seed: 21 });
    if (clothOn) {
      // Shade the weft cell by cell with the wave.
      const segs = K.map(() => []);
      rows.forEach((r) => {
        for (let i = -1; i <= WARPS; i++) {
          const yc = loom.warpY(Math.max(0, Math.min(WARPS - 1, i)));
          const y0 = i < 0 ? r.ya : yc - WARP_GAP / 2;
          const y1 = i >= WARPS ? r.yb : yc + WARP_GAP / 2;
          segs[bucket(waveK(r.x, (y0 + y1) / 2))].push([r.x, y0, r.x, y1]);
        }
      });
      segs.forEach((list, b) => drawSegs(ctx, list, weftK[b], w * 0.96, t, 'round', 21));
    }
    // Warp floats over the weft: plain weave, (i + j) even → warp on top.
    const over = K.map(() => []);
    rows.forEach((r, j) => {
      for (let i = 0; i < WARPS; i++) {
        if ((i + j) % 2) continue;
        const y = loom.warpY(i);
        if (!r.done && (r.dir > 0 ? y > r.y - 2 : y < r.y + 2)) continue;
        const k = clothOn ? bucket(waveK(r.x, y)) : 3;
        over[k].push([r.x - WEFT_GAP * 0.56, y, r.x + WEFT_GAP * 0.56, y]);
      }
    });
    over.forEach((list, b) => drawSegs(ctx, list, redK[b], w, t, 'butt', 31));
    // The weft needle.
    const cur = rows.find((r) => !r.done);
    if (cur && t < SILENCE[0]) {
      const [sx, sy] = toScreen(cur.x + clothShift(cur.x, cur.y, t), cur.y);
      drawNeedle(ctx, sx, sy, (cur.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + cam.r, NEEDLE_L * 0.55 * cam.z, { lift: 2 * cam.z });
    }
  }

  function drawSegs(ctx, list, style, w, t, cap, seed) {
    if (!list.length) return;
    const runs = [];
    for (const [x0, y0, x1, y1] of list) {
      const a = toScreen(x0 + clothShift(x0, y0, t), y0);
      const b = toScreen(x1 + clothShift(x1, y1, t), y1);
      runs.push({ x: [a[0], b[0]], y: [a[1], b[1]], n: 2 });
    }
    drawThread(ctx, Path2D, runs, style, { w, cap, seed });
  }

  // ── Stars (gold, satin stitch) ─────────────────────────────────────────────
  function drawStars(ctx, t) {
    if (t < DROP - 0.01) return;
    const w = 2.3 * cam.z;
    const facet = K.map(() => []);
    let needle = null;
    for (const s of loom.stars) {
      const span = s.t1 - s.t0;
      for (const st of s.stitches) {
        const ts = s.t0 + span * st.sweep;
        if (t < ts) continue;
        const grow = ease.outCubic(clamp((t - ts) / 0.035));
        const a = loom.flagToWorld(st.x0, st.y0);
        const bb = loom.flagToWorld(st.x1, st.y1);
        const b = [lerp(a[0], bb[0], grow), lerp(a[1], bb[1], grow)];
        const k = (st.facet < 0 ? 1.16 : 0.84) * (1 - clothSlope(a[1], a[0], t) * 0.9);
        facet[bucket(k)].push([a[0], a[1], b[0], b[1]]);
        if (t < s.t1 + 0.05) needle = { x: b[0], y: b[1], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      }
    }
    facet.forEach((list, b) => drawSegs(ctx, list, goldK[b], w, t, 'round', 41));
    if (needle && t < DROP + 1.3) {
      const [sx, sy] = toScreen(needle.x + clothShift(needle.x, needle.y, t), needle.y);
      drawNeedle(ctx, sx, sy, needle.a + cam.r, NEEDLE_L * 0.42 * cam.z, { lift: 5 * cam.z });
    }
  }

  // ── 77 stitches ────────────────────────────────────────────────────────────
  function drawTimeline(ctx, t) {
    if (t < TIMELINE[0] || t > DIVE[1] + 0.2) return;
    const tl = loom.timeline;
    const N = tl.stitches.length;
    const list = [];
    const holes = [];
    let tip = null;
    tl.stitches.forEach((s, k) => {
      const ts = TIMELINE[0] + ((TIMELINE[1] - TIMELINE[0]) * k) / N;
      if (t < ts) return;
      const g = ease.outCubic(clamp((t - ts) / 0.05));
      list.push([tl.x, s.a, tl.x, lerp(s.a, s.b, g)]);
      const a = toScreen(tl.x, s.a);
      const b = toScreen(tl.x, s.b);
      holes.push([a[0], a[1], 0.9], [b[0], b[1], 0.9 * g]);
      tip = [tl.x, lerp(s.a, s.b, g)];
    });
    drawHoles(ctx, holes, 0.55 * cam.z);
    drawSegs(ctx, list, redN, 2.2 * cam.z, t, 'round', 51);
    if (tip && t < TIMELINE[1] + 0.1) {
      const [sx, sy] = toScreen(tip[0], tip[1]);
      drawNeedle(ctx, sx, sy, Math.PI / 2 + cam.r, NEEDLE_L * 0.36 * cam.z, { lift: 3 * cam.z });
    }
  }

  // ── Paper events: the bulge before the pierce, the hole, warp-end holes ────
  function drawHoleMarks(ctx, t) {
    const z = cam.z;
    // Anticipation: the paper lifts where the needle will break through.
    if (t < at(1, 1) + 0.05 && t > 0.2) {
      const u = ease.inQuad(clamp((t - 0.2) / (at(1, 1) - 0.2)));
      const [hx, hy] = toScreen(HOLE.x, HOLE.y);
      const R = (15 + 7 * u) * z;
      const ring = (ox, oy, rgb, alpha) => {
        const g = ctx.createRadialGradient(hx + ox, hy + oy, R * 0.25, hx + ox, hy + oy, R * 1.1);
        g.addColorStop(0, `rgba(${rgb},0)`);
        g.addColorStop(0.6, `rgba(${rgb},${alpha})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hx + ox, hy + oy, R * 1.1, 0, TAU);
        ctx.fill();
      };
      // The paper domes up: shadowed rim away from the light, lit rim toward it.
      ring(R * 0.16, R * 0.2, '90,60,38', 0.13 * u);
      ring(-R * 0.14, -R * 0.18, '255,253,247', 0.5 * u);
    }
    const holes = [];
    let tip = null;
    tl.stitches.forEach((s, k) => {
      const ts = TIMELINE[0] + ((TIMELINE[1] - TIMELINE[0]) * k) / N;
      if (t < ts) return;
      const g = ease.outCubic(clamp((t - ts) / 0.05));
      list.push([tl.x, s.a, tl.x, lerp(s.a, s.b, g)]);
      const a = toScreen(tl.x, s.a);
      const b = toScreen(tl.x, s.b);
      holes.push([a[0], a[1], 0.9], [b[0], b[1], 0.9 * g]);
      tip = [tl.x, lerp(s.a, s.b, g)];
    });
    drawHoles(ctx, holes, 0.55 * cam.z);
    drawSegs(ctx, list, redN, 2.2 * cam.z, t, 'round', 51);
    if (tip && t < TIMELINE[1] + 0.1) {
      const [sx, sy] = toScreen(tip[0], tip[1]);
      drawNeedle(ctx, sx, sy, Math.PI / 2 + cam.r, NEEDLE_L * 0.36 * cam.z, { lift: 3 * cam.z });
    }
  }

  // ── Paper events: the bulge before the pierce, the hole, warp-end holes ────
  function drawHoleMarks(ctx, t) {
    const z = cam.z;
    // Anticipation: the paper lifts where the needle will break through.
    if (t < at(1, 1) + 0.05 && t > 0.2) {
      const u = ease.inQuad(clamp((t - 0.2) / (at(1, 1) - 0.2)));
      const [hx, hy] = toScreen(HOLE.x, HOLE.y);
      const R = (16 + 8 * u) * z;
      const g = ctx.createRadialGradient(hx - R * 0.3, hy - R * 0.35, R * 0.05, hx - R * 0.1, hy - R * 0.1, R);
      g.addColorStop(0, `rgba(255,253,247,${0.7 * u})`);
      g.addColorStop(0.55, `rgba(255,252,244,${0.18 * u})`);
      g.addColorStop(1, 'rgba(255,252,244,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, R, 0, TAU);
      ctx.fill();
      const g2 = ctx.createRadialGradient(hx + R * 0.4, hy + R * 0.45, R * 0.2, hx + R * 0.25, hy + R * 0.3, R * 0.9);
      g2.addColorStop(0, `rgba(80,50,30,${0.1 * u})`);
      g2.addColorStop(1, 'rgba(80,50,30,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(hx + R * 0.2, hy + R * 0.25, R, 0, TAU);
      ctx.fill();
    }
    const holes = [];
    if (t >= at(1, 1)) {
      const [hx, hy] = toScreen(HOLE.x, HOLE.y);
      // Torn paper: a few flaps pushed up and out by the needle.
      const tear = ease.outBack(clamp((t - at(1, 1)) / 0.1), 1.4);
      const rr = rng(7);
      ctx.save();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + rr() * 0.6;
        const l = (3.4 + rr() * 3) * z * tear;
        const hw = (1.2 + rr() * 0.9) * z;
        const bx = hx + Math.cos(a) * 2.4 * z;
        const by = hy + Math.sin(a) * 2.4 * z;
        const tx = bx + Math.cos(a) * l;
        const ty = by + Math.sin(a) * l;
        const nx = -Math.sin(a) * hw;
        const ny = Math.cos(a) * hw;
        ctx.beginPath();
        ctx.moveTo(bx + nx, by + ny);
        ctx.lineTo(tx + nx * 0.2, ty + ny * 0.2);
        ctx.lineTo(bx - nx, by - ny);
        ctx.closePath();
        ctx.fillStyle = rgba(SHADOW_RGB, 0.16);
        ctx.save();
        ctx.translate(0.5 * z, 0.8 * z);
        ctx.fill();
        ctx.restore();
        const lit = Math.cos(a + 2.4) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(${246 - 20 * (1 - lit)},${239 - 22 * (1 - lit)},${226 - 24 * (1 - lit)},0.95)`;
        ctx.fill();
      }
      ctx.restore();
      holes.push([hx, hy, 1]);
    }
    // Where each crowd line started.
    if (t > 12.4) {
      for (const c of crowd) {
        if (t < c.revealT) continue;
        const [sx, sy] = toScreen(c.path.x[0], c.path.y[0]);
        holes.push([sx, sy, 0.9]);
      }
    }
    if (t > at(7) - 0.05) {
      const [wx, wy] = toScreen(loom.rowX(0) - 2 + clothShift(loom.rowX(0), yLeft - 14, t), loom.warpY(0) - 22);
      drawHoles(ctx, [[wx, wy, 1]], 1.7 * z);
    }
    drawHoles(ctx, holes, Math.max(0.7, 3.2 * z));
    // Warp ends: every needle goes down through the paper at the top of the loom.
    if (t > TAUT_T0) {
      const ends = [];
      for (let i = 0; i < WARPS; i++) {
        if (t < cues.warpTaut[i]) continue;
        const [sx, sy] = toScreen(loom.fringeTop + clothShift(loom.fringeTop, loom.warpY(i), t), loom.warpY(i));
        ends.push([sx, sy, 1]);
      }
      drawHoles(ctx, ends, 1.9 * z);
    }
  }

  function drawLeadNeedle(ctx, t) {
    if (t < HOOK_PLUCK) return;
    if (t > leadTaut + 0.12) return;
    const head = lead.headAt(t);
    const [sx, sy] = toScreen(head.x, head.y);
    let a = lead.headingAt(t, 90);
    if (t < DEPART + 0.05) a = 0;
    const dive = 1 - clamp((t - leadTaut) / 0.12);
    const settle = t < DEPART ? 10 * Math.exp(-3 * (t - HOOK_PLUCK)) : 3;
    drawNeedle(ctx, sx, sy, a + cam.r, NEEDLE_L * cam.z * (t > TAUT_T0 ? 0.8 : 1) * dive, { lift: settle * cam.z });
  }

  // ── Frame ──────────────────────────────────────────────────────────────────
  function render(ctx, t, opts = {}) {
    t = Math.max(0, Math.min(DURATION - 1e-4, t));
    cam = camera(t);
    cc = Math.cos(cam.r);
    cs = Math.sin(cam.r);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawPaper(ctx, paper, cam, W, H, createCanvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gratAlpha = 0.35 + 0.65 * smoothstep(0.7, 0.3, cam.z);
    drawGraticule(ctx, cam, toScreen, W, H, gratAlpha);
    drawHoleMarks(ctx, t);
    drawCrowd(ctx, t, 'thread');
    drawLead(ctx, t);
    drawWeave(ctx, t);
    drawTimeline(ctx, t);
    drawStars(ctx, t);
    drawCrowd(ctx, t, 'needle');
    drawLeadNeedle(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sw = setWorld(ctx);
    for (const L of labels) drawLabel(ctx, L, t, cam, sw);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Light falling across the table: a touch brighter top-left, a touch of falloff.
    if (!render.light) {
      const c = createCanvas(W, H);
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(W * 0.32, H * 0.2, 60, W * 0.5, H * 0.55, W * 0.78);
      grad.addColorStop(0, 'rgba(255,248,236,0.10)');
      grad.addColorStop(0.55, 'rgba(255,248,236,0)');
      grad.addColorStop(1, 'rgba(60,40,25,0.16)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      render.light = c;
    }
    ctx.drawImage(render.light, 0, 0);
    if (opts.debug) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, 330, 34);
      ctx.fillStyle = '#fff';
      ctx.font = '20px IBMPlexMono';
      ctx.fillText(`t=${t.toFixed(3)} z=${cam.z.toFixed(2)}`, 10, 24);
    }
    return cam;
  }

  /** Largest on-screen displacement (px) across a shutter interval — drives motion blur. */
  function motionAt(t, shutter) {
    const ta = t - shutter / 2;
    const tb = t + shutter / 2;
    const A = camera(ta);
    const B = camera(tb);
    const proj = (c, x, y) => {
      const k = Math.cos(c.r);
      const s = Math.sin(c.r);
      const dx = x - c.x;
      const dy = y - c.y;
      return [W / 2 + (dx * k - dy * s) * c.z, H / 2 + (dx * s + dy * k) * c.z];
    };
    const unproj = (c, sx, sy) => {
      const k = Math.cos(c.r);
      const s = Math.sin(c.r);
      const u = (sx - W / 2) / c.z;
      const v = (sy - H / 2) / c.z;
      return [c.x + u * k + v * s, c.y - u * s + v * k];
    };
    let m = 0;
    for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]]) {
      const [wx, wy] = unproj(A, sx, sy);
      const [bx, by] = proj(B, wx, wy);
      m = Math.max(m, Math.hypot(bx - sx, by - sy));
    }
    // The needle itself.
    const pa = t < HOOK_PLUCK ? flight(ta) : lead.headAt(ta);
    const pb = t < HOOK_PLUCK ? flight(tb) : lead.headAt(tb);
    if (t < TAUT_T0 + 0.6 && t > at(1, 1)) {
      const a = proj(B, pa.x, pa.y);
      const b = proj(B, pb.x, pb.y);
      m = Math.max(m, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.6);
    }
    return m;
  }

  return { render, camera, world, labels, motionAt };
}

