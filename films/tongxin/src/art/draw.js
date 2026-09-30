// Drawing helpers for card art. All coordinates are world units, y up.

import { rng } from '../core.js';

export function poly(ctx, pts, close = true) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

/** Smooth closed curve through points (Catmull-Rom → Bézier). */
export function smooth(ctx, pts, close = true, tension = 0.5) {
  const n = pts.length;
  const P = (i) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    const k = tension / 3;
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

export function fill(ctx, color, fn) {
  ctx.beginPath();
  fn(ctx);
  ctx.fillStyle = color;
  ctx.fill();
}

export function stroke(ctx, color, width, fn) {
  ctx.beginPath();
  fn(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Run fn with the current path as a clip. */
export function clipTo(ctx, pathFn, fn) {
  ctx.save();
  ctx.beginPath();
  pathFn(ctx);
  ctx.clip();
  fn(ctx);
  ctx.restore();
}

// ─── Textile patterns (clip first, then call these to fill a region) ────────

/** 艾德莱斯 Atlas ikat: vertical colour bands with flame-shaped, feathered borders. */
export function ikat(ctx, x0, y0, x1, y1, colors, seed = 1, bandW = 0.06) {
  const r = rng(seed);
  let x = x0;
  let k = 0;
  while (x < x1) {
    const w = bandW * (0.6 + r() * 0.9);
    const c = colors[k % colors.length];
    ctx.beginPath();
    ctx.moveTo(x, y1);
    // Left edge: flame teeth (the dye bleeding up and down the warp).
    const teeth = Math.ceil((y1 - y0) / (bandW * 1.4));
    for (let i = 0; i <= teeth; i++) {
      const y = y1 - ((y1 - y0) * i) / teeth;
      const d = (i % 2 ? 0.35 : -0.12) * w * (0.7 + r() * 0.6);
      ctx.lineTo(x + d, y);
    }
    ctx.lineTo(x + w * 1.2, y0);
    for (let i = teeth; i >= 0; i--) {
      const y = y1 - ((y1 - y0) * i) / teeth;
      const d = (i % 2 ? 0.2 : -0.25) * w * (0.7 + r() * 0.6);
      ctx.lineTo(x + w + d, y);
    }
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    // Dye streaks: the characteristic blurred warp lines.
    ctx.strokeStyle = colors[(k + 2) % colors.length];
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = w * 0.06;
    for (let s = 0; s < 3; s++) {
      const sx = x + w * (0.2 + r() * 0.6);
      const sy = y0 + r() * (y1 - y0);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + (y1 - y0) * (0.05 + r() * 0.12));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    x += w;
    k++;
  }
}

/** Horizontal stripes (Tibetan bangdian apron, Korean saekdong sleeves). */
export function stripesH(ctx, x0, y0, x1, y1, colors, h) {
  let k = 0;
  for (let y = y1; y > y0 - h; y -= h, k++) {
    ctx.fillStyle = colors[k % colors.length];
    ctx.fillRect(x0, y - h, x1 - x0, h + 0.0005);
  }
}

/** A band of repeated motifs (embroidery borders). kind: diamond | cloud | zigzag | dots | cross */
export function band(ctx, x0, x1, y, h, bg, fg, kind = 'diamond', accent = null) {
  ctx.fillStyle = bg;
  ctx.fillRect(x0, y - h / 2, x1 - x0, h);
  const step = h * 1.1;
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;
  ctx.lineWidth = h * 0.12;
  for (let x = x0 + step / 2, i = 0; x < x1; x += step, i++) {
    ctx.beginPath();
    if (kind === 'diamond') {
      poly(ctx, [[x, y + h * 0.36], [x + h * 0.36, y], [x, y - h * 0.36], [x - h * 0.36, y]]);
      ctx.fill();
      if (accent) {
        ctx.beginPath();
        poly(ctx, [[x, y + h * 0.15], [x + h * 0.15, y], [x, y - h * 0.15], [x - h * 0.15, y]]);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.fillStyle = fg;
      }
    } else if (kind === 'zigzag') {
      ctx.moveTo(x - step / 2, y - h * 0.25);
      ctx.lineTo(x, y + h * 0.25);
      ctx.lineTo(x + step / 2, y - h * 0.25);
      ctx.stroke();
    } else if (kind === 'dots') {
      ctx.arc(x, y, h * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'cross') {
      ctx.fillRect(x - h * 0.3, y - h * 0.08, h * 0.6, h * 0.16);
      ctx.fillRect(x - h * 0.08, y - h * 0.3, h * 0.16, h * 0.6);
    } else if (kind === 'cloud') {
      // 云纹: a curl.
      ctx.arc(x, y, h * 0.28, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + h * 0.1, y, h * 0.12, Math.PI, Math.PI * 2.6);
      ctx.stroke();
    }
  }
}

/** Scatter small flowers (embroidery). */
export function flowers(ctx, x0, y0, x1, y1, colors, size, seed = 3, density = 1) {
  const r = rng(seed);
  const n = Math.round(((x1 - x0) * (y1 - y0)) / (size * size * 4) * density);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const c = colors[i % colors.length];
    ctx.fillStyle = c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 + r();
      ctx.beginPath();
      ellipse(ctx, x + Math.cos(a) * size * 0.5, y + Math.sin(a) * size * 0.5, size * 0.42, size * 0.24, a);
      ctx.fill();
    }
    ctx.fillStyle = '#f4d35e';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Grape leaf outline (five-lobed). */
export function grapeLeaf(ctx, cx, cy, s, rot = 0) {
  const pts = [];
  const lobes = [
    [0, 1.0],
    [0.35, 0.62],
    [0.72, 0.86],
    [0.95, 0.35],
    [1.3, 0.55],
    [1.55, 0.12],
    [2.3, 0.18],
  ];
  const outline = [];
  for (const [a, rr] of lobes) outline.push([a, rr]);
  for (let i = lobes.length - 2; i >= 0; i--) outline.push([-lobes[i][0], lobes[i][1]]);
  for (const [a, rr] of outline) {
    const ang = Math.PI / 2 - a + rot;
    pts.push([cx + Math.cos(ang) * rr * s, cy + Math.sin(ang) * rr * s]);
  }
  smooth(ctx, pts, true, 0.25);
}
