// Linen paper: generated once as a seamless tile, then laid on the world at
// two octaves that cross-fade with zoom, so it stays crisp from a 16× macro to
// a 0.2× wide without ever visibly scaling.

import { rng } from '../core/math.js';
import { PAPER, INK_RGB, rgba } from './palette.js';

const TILE = 1024;

export function makePaperTile(createCanvas) {
  const c = createCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(TILE, TILE);
  const r = rng(2026);
  // Tileable value noise (lattice wraps).
  const lattice = (cells, seed) => {
    const g = new Float32Array(cells * cells);
    const rr = rng(seed);
    for (let i = 0; i < g.length; i++) g[i] = rr();
    return (x, y) => {
      const fx = (x / TILE) * cells;
      const fy = (y / TILE) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const a = g[(y0 % cells) * cells + (x0 % cells)];
      const b = g[(y0 % cells) * cells + ((x0 + 1) % cells)];
      const cc = g[((y0 + 1) % cells) * cells + (x0 % cells)];
      const d = g[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
      return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy;
    };
  };
  const n1 = lattice(4, 11);
  const n2 = lattice(16, 12);
  const n3 = lattice(64, 13);
  const n4 = lattice(256, 14);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = (n1(x, y) - 0.5) * 0.035 + (n2(x, y) - 0.5) * 0.03 + (n3(x, y) - 0.5) * 0.025 + (n4(x, y) - 0.5) * 0.03 + (r() - 0.5) * 0.028;
      const o = (y * TILE + x) * 4;
      img.data[o] = PAPER[0] * (1 + v);
      img.data[o + 1] = PAPER[1] * (1 + v * 1.02);
      img.data[o + 2] = PAPER[2] * (1 + v * 1.08);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Fibres: short curved strands, light and dark, drawn wrapped for seamlessness.
  ctx.lineCap = 'round';
  for (let k = 0; k < 2600; k++) {
    const x = r() * TILE;
    const y = r() * TILE;
    const len = 8 + r() ** 2 * 70;
    const a = r() * Math.PI * 2;
    const bend = (r() - 0.5) * len * 0.6;
    const dark = r() < 0.45;
    ctx.strokeStyle = dark ? rgba([150, 128, 100], 0.05 + r() * 0.07) : rgba([255, 252, 244], 0.1 + r() * 0.14);
    ctx.lineWidth = 0.5 + r() * 0.9;
    for (const ox of [-TILE, 0, TILE]) {
      for (const oy of [-TILE, 0, TILE]) {
        const bx = x + ox;
        const by = y + oy;
        if (bx < -80 || bx > TILE + 80 || by < -80 || by > TILE + 80) continue;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, by + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, bx + Math.cos(a) * len, by + Math.sin(a) * len);
        ctx.stroke();
      }
    }
  }
  // Specks.
  for (let k = 0; k < 900; k++) {
    ctx.fillStyle = rgba(r() < 0.7 ? [120, 100, 80] : [90, 70, 55], 0.08 + r() * 0.18);
    const s = 0.4 + r() ** 3 * 1.8;
    ctx.fillRect(r() * TILE, r() * TILE, s, s);
  }
  return c;
}

/** Fill the frame with world-locked paper. Two octaves cross-fade with zoom. */
export function drawPaper(ctx, tile, cam, W, H, createCanvas) {
  if (!drawPaper.big || drawPaper.tile !== tile) {
    // 2×2 pre-tiled sheet: fewer draws, fewer seams.
    const big = createCanvas(TILE * 2, TILE * 2);
    const g = big.getContext('2d');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.drawImage(tile, i * TILE, j * TILE);
    drawPaper.big = big;
    drawPaper.tile = tile;
  }
  const big = drawPaper.big;
  const lod = Math.log2(1 / cam.z);
  const L = Math.floor(lod);
  const f = lod - L;
  const c = Math.cos(cam.r);
  const sn = Math.sin(cam.r);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = rgba(PAPER, 1);
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(cam.z * c, cam.z * sn, -cam.z * sn, cam.z * c, W / 2 - cam.z * (c * cam.x - sn * cam.y), H / 2 - cam.z * (sn * cam.x + c * cam.y));
  const R = Math.hypot(W, H) / 2 / cam.z;
  const ov = 1.2 / cam.z;
  const layer = (level, alpha) => {
    if (alpha <= 0.002) return;
    const S = TILE * 2 * 2 ** level;
    ctx.globalAlpha = alpha;
    const ix0 = Math.floor((cam.x - R) / S);
    const ix1 = Math.floor((cam.x + R) / S);
    const iy0 = Math.floor((cam.y - R) / S);
    const iy1 = Math.floor((cam.y + R) / S);
    for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) ctx.drawImage(big, ix * S, iy * S, S + ov, S + ov);
  };
  layer(L, 1);
  layer(L + 1, f);
  ctx.restore();
}

/** Map graticule: faint 经纬 lines and registration crosses, printed on the sheet. */
export function drawGraticule(ctx, cam, toScreen, W, H, alpha = 1) {
  if (alpha <= 0) return;
  const G = 1000;
  const span = Math.hypot(W, H) / 2 / cam.z;
  const x0 = Math.floor((cam.x - span) / G) * G;
  const x1 = Math.ceil((cam.x + span) / G) * G;
  const y0 = Math.floor((cam.y - span) / G) * G;
  const y1 = Math.ceil((cam.y + span) / G) * G;
  if ((x1 - x0) / G > 60) return;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(INK_RGB, 0.055 * alpha);
  ctx.beginPath();
  for (let x = x0; x <= x1; x += G) {
    const a = toScreen(x, y0);
    const b = toScreen(x, y1);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  for (let y = y0; y <= y1; y += G) {
    const a = toScreen(x0, y);
    const b = toScreen(x1, y);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  const cross = Math.max(5, Math.min(14, 18 * cam.z));
  ctx.strokeStyle = rgba(INK_RGB, 0.28 * alpha);
  ctx.beginPath();
  for (let x = x0; x <= x1; x += G) {
    for (let y = y0; y <= y1; y += G) {
      const [sx, sy] = toScreen(x, y);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      ctx.moveTo(sx - cross, sy);
      ctx.lineTo(sx + cross, sy);
      ctx.moveTo(sx, sy - cross);
      ctx.lineTo(sx, sy + cross);
    }
  }
  ctx.stroke();
  ctx.restore();
}

