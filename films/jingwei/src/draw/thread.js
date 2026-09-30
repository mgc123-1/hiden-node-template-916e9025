// Thread rendering. Level of detail follows on-screen width:
//   < 2.2 px  a single stroke and its contact shadow
//   ≥ 2.2 px  + cylinder shading (dark flank, specular ridge)
//   ≥ 5 px    + ply twist
//   ≥ 12 px   + stray fibres
// All geometry arrives in screen space; light always comes from the top-left.

import { rgba, SHADOW_RGB } from './palette.js';

const W = 1920;
const H = 1080;

/** Build a Path2D from screen-space runs [{x, y, n}], dropping sub-pixel steps
 *  and anything well outside the frame. */
export function runsToPath(Path2DCtor, runs, margin = 80) {
  const p = new Path2DCtor();
  for (const r of runs) {
    let pen = false;
    let lx = 0;
    let ly = 0;
    for (let i = 0; i < r.n; i++) {
      const x = r.x[i];
      const y = r.y[i];
      const out = x < -margin || x > W + margin || y < -margin || y > H + margin;
      if (out) {
        // Keep one point beyond the edge so strokes leave the frame cleanly.
        if (pen) {
          p.lineTo(x, y);
          pen = false;
        }
        continue;
      }
      if (!pen) {
        if (i > 0) p.moveTo(r.x[i - 1], r.y[i - 1]), p.lineTo(x, y);
        else p.moveTo(x, y);
        pen = true;
        lx = x;
        ly = y;
        continue;
      }
      const d = Math.abs(x - lx) + Math.abs(y - ly);
      if (d < 0.6 && i < r.n - 1) continue;
      p.lineTo(x, y);
      lx = x;
      ly = y;
    }
  }
  return p;
}

/** Twist marks: short slanted strokes across the thread every `pitch` px. */
function twistPath(Path2DCtor, runs, w, phase) {
  const p = new Path2DCtor();
  const pitch = w * 0.95;
  const half = w * 0.46;
  const slant = w * 0.3;
  for (const r of runs) {
    let acc = ((-phase % pitch) + pitch) % pitch;
    for (let i = 1; i < r.n; i++) {
      const x0 = r.x[i - 1];
      const y0 = r.y[i - 1];
      const dx = r.x[i] - x0;
      const dy = r.y[i] - y0;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) continue;
      if ((x0 < -60 && r.x[i] < -60) || (x0 > W + 60 && r.x[i] > W + 60) || (y0 < -60 && r.y[i] < -60) || (y0 > H + 60 && r.y[i] > H + 60)) {
        acc -= d;
        while (acc < 0) acc += pitch;
        continue;
      }
      const tx = dx / d;
      const ty = dy / d;
      const nx = -ty;
      const ny = tx;
      while (acc <= d) {
        const cx = x0 + tx * acc;
        const cy = y0 + ty * acc;
        p.moveTo(cx + nx * half - tx * slant, cy + ny * half - ty * slant);
        p.lineTo(cx - nx * half + tx * slant, cy - ny * half + ty * slant);
        acc += pitch;
      }
      acc -= d;
    }
  }
  return p;
}

function fuzzPath(Path2DCtor, runs, w, seed) {
  const p = new Path2DCtor();
  let s = seed | 0 || 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (const r of runs) {
    for (let i = 1; i < r.n; i += 1) {
      const x0 = r.x[i - 1];
      const y0 = r.y[i - 1];
      if (x0 < -40 || x0 > W + 40 || y0 < -40 || y0 > H + 40) continue;
      const dx = r.x[i] - x0;
      const dy = r.y[i] - y0;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) continue;
      const count = Math.floor((d / w) * 0.9 + rnd());
      for (let k = 0; k < count; k++) {
        const u = rnd();
        const side = rnd() < 0.5 ? -1 : 1;
        const nx = (-dy / d) * side;
        const ny = (dx / d) * side;
        const bx = x0 + dx * u + nx * w * 0.45;
        const by = y0 + dy * u + ny * w * 0.45;
        const len = w * (0.25 + rnd() * 0.6);
        const lean = (rnd() - 0.5) * 1.6;
        p.moveTo(bx, by);
        p.quadraticCurveTo(bx + nx * len * 0.5 + (dx / d) * len * lean, by + ny * len * 0.5 + (dy / d) * len * lean, bx + nx * len + (dx / d) * len * lean * 1.4, by + ny * len + (dy / d) * len * lean * 1.4);
      }
    }
  }
  return p;
}

/**
 * Draw a thread (or a batch of same-styled threads).
 * @param style { base, dark, light } CSS colours
 * @param o { w, lift, alpha, twist, seed, shadow, cap }
 */
export function drawThread(ctx, Path2DCtor, runs, style, o = {}) {
  const w = o.w ?? 3;
  if (w <= 0.05) return;
  const alpha = o.alpha ?? 1;
  const lift = o.lift ?? 0;
  const path = o.path ?? runsToPath(Path2DCtor, runs);
  ctx.save();
  ctx.lineCap = o.cap ?? 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = alpha;
  if (o.shadow !== false) {
    const k = lift / (lift + 22);
    const sx = 0.22 * w + 0.42 * lift + 0.5;
    const sy = 0.34 * w + 0.66 * lift + 0.7;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.strokeStyle = rgba(SHADOW_RGB, 0.3 * (1 - 0.72 * k));
    ctx.lineWidth = w * 1.04 * (1 + 0.9 * k);
    ctx.stroke(path);
    if (w > 1.4 || lift > 2) {
      ctx.strokeStyle = rgba(SHADOW_RGB, 0.07 * (1 - 0.4 * k));
      ctx.lineWidth = w * 1.9 * (1 + 1.3 * k);
      ctx.stroke(path);
    }
    ctx.restore();
  }
  ctx.strokeStyle = style.base;
  ctx.lineWidth = w;
  ctx.stroke(path);
  if (w >= 2.2) {
    ctx.save();
    ctx.translate(0.17 * w, 0.22 * w);
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = style.dark;
    ctx.lineWidth = w * 0.44;
    ctx.stroke(path);
    ctx.restore();
    if (w >= 5) {
      const tw = twistPath(Path2DCtor, runs, w, o.twist ?? 0);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * 0.32;
      ctx.strokeStyle = style.dark;
      ctx.lineWidth = Math.max(0.8, w * 0.11);
      ctx.stroke(tw);
      ctx.translate(-w * 0.06, -w * 0.08);
      ctx.globalAlpha = alpha * 0.2;
      ctx.strokeStyle = style.light;
      ctx.lineWidth = Math.max(0.6, w * 0.07);
      ctx.stroke(tw);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(-0.15 * w, -0.19 * w);
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = style.light;
    ctx.lineWidth = Math.max(0.6, w * 0.17);
    ctx.stroke(path);
    ctx.restore();
    if (w >= 12) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = style.light;
      ctx.lineWidth = Math.max(0.6, w * 0.018);
      ctx.stroke(fuzzPath(Path2DCtor, runs, w, o.seed ?? 3));
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Needle holes: small punctures with a lit lower-right lip. */
export function drawHoles(ctx, pts, r) {
  if (!pts.length || r < 0.4) return;
  ctx.save();
  for (const [x, y, a = 1] of pts) {
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,250,240,0.55)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y + r * 0.35, r * 1.1, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,24,14,0.78)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
