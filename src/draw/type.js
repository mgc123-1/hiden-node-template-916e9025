// Printed type. Each character drops in top-to-bottom behind a travelling red
// thread — the same gesture as a stitch being pulled through the sheet.

import { clamp, ease } from '../core/math.js';
import { INK, RED, rgb } from './palette.js';

export const FONT = {
  serif: (w) => `NotoSerifSC-${w}`,
  mono: 'IBMPlexMono',
};

const GLYPHS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ°′·—×';
const hash = (a, b) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function charReveal(t, tIn, tOut, k, stagger, dur = 0.17) {
  const s = tIn + k * stagger;
  const p = ease.outCubic(clamp((t - s) / dur));
  const q = ease.inCubic(clamp((t - (tOut + k * stagger * 0.4)) / 0.15));
  return [p, q];
}

function drawGlyphs(ctx, glyphs, t, L, size, zoom, familyFont) {
  // glyphs: [{ch, x, y, w, h}] cells in local units; reveal top→bottom.
  const edgeW = Math.max(1.3 / zoom, size * 0.03);
  glyphs.forEach((g, k) => {
    const [p, q] = charReveal(t, L.tIn, L.tOut, k, L.stagger ?? 0.1);
    if (p <= 0 || q >= 1) return;
    const top = g.y + g.h * q;
    const bot = g.y + g.h * p;
    if (bot <= top) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.x - g.w * 0.3, top, g.w * 1.6, bot - top);
    ctx.clip();
    ctx.font = familyFont;
    ctx.fillText(g.ch, g.x + g.w / 2, g.y + g.h / 2);
    ctx.restore();
    if (p < 1 && q <= 0 && g.ch.trim()) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.sin(Math.PI * p) * 0.95;
      ctx.strokeStyle = rgb(RED.rgb);
      ctx.lineWidth = edgeW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.x - g.w * 0.08, bot);
      ctx.lineTo(g.x + g.w * 1.08, bot);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function layout(ctx, text, size, font, vertical, tracking = 0) {
  ctx.font = font;
  const cells = [];
  if (vertical) {
    const pitch = size * 1.16;
    [...text].forEach((ch, k) => cells.push({ ch, x: 0, y: k * pitch, w: size, h: size * 1.02 }));
    return { cells, w: size, h: text.length * pitch };
  }
  let x = 0;
  for (const ch of text) {
    const w = ch === ' ' ? size * 0.34 : ctx.measureText(ch).width;
    cells.push({ ch, x, y: 0, w, h: size * 1.08 });
    x += w + tracking * size;
  }
  const total = x - tracking * size;
  return { cells, w: total, h: size * 1.08 };
}

/**
 * Draw one label. `setWorld()` puts the context in world space.
 */
export function drawLabel(ctx, L, t, cam, setWorld) {
  const inAt = L.tIn;
  const endAt = L.tOut + 0.6;
  if (t < inAt - 0.01 || t > endAt) return;
  setWorld();
  ctx.save();
  ctx.translate(L.x, L.y);
  ctx.rotate(L.rot || 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.globalCompositeOperation = 'multiply';
  const isMono = L.family === 'mono';
  const font = isMono ? `500 ${L.size}px ${FONT.mono}` : `${L.weight} ${L.size}px ${FONT.serif(L.weight)}`;
  const lay = layout(ctx, L.text, L.size, font, L.vertical, L.tracking ?? (isMono ? 0.1 : 0.06));
  let ox = 0;
  if (!L.vertical) {
    if (L.anchor === 'center') ox = -lay.w / 2;
    else if (L.anchor === 'right') ox = -lay.w;
  }
  const oy = L.vertical ? 0 : -lay.h / 2;
  ctx.translate(ox, oy);
  if (L.scramble) drawMono(ctx, L.text, L.size, t, L.tIn, L.tOut, cam.z, L.tracking ?? 0.1, false, 0);
  else drawGlyphs(ctx, lay.cells, t, L, L.size, cam.z, font);
  ctx.restore();

  if (L.mono) {
    const m = L.mono;
    setWorld();
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(L.rot || 0);
    ctx.translate(ox, oy);
    ctx.translate(m.dx, m.dy);
    if (m.vertical) ctx.rotate(Math.PI / 2);
    ctx.globalCompositeOperation = 'multiply';
    let text = m.text;
    if (m.counter) {
      const p = ease.outExpo(clamp((t - L.tIn - 0.1) / 1.3));
      const v = Math.round(1.4e9 * p);
      text = text.replace(/[\d ]{5,}$/, String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
    }
    drawMono(ctx, text, m.size, t, L.tIn + 0.08, L.tOut, cam.z, 0.12, true, 0);
    ctx.restore();
  }
}

/** Mono annotation: a red stitch mark, then characters that scramble and settle. */
function drawMono(ctx, text, size, t, tIn, tOut, zoom, tracking, mark, seed) {
  const font = `500 ${size}px ${FONT.mono}`;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const adv = ctx.measureText('0').width + tracking * size;
  const out = clamp((t - tOut) / 0.2);
  if (out >= 1) return;
  ctx.globalAlpha = 1 - out;
  let x = 0;
  if (mark) {
    const p = ease.outCubic(clamp((t - tIn) / 0.2));
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgb(RED.rgb);
    ctx.lineWidth = Math.max(1.2 / zoom, size * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 1.3 * p, 0);
    ctx.stroke();
    ctx.restore();
    x = size * 2;
  }
  const chars = [...text];
  chars.forEach((ch, k) => {
    const appear = tIn + 0.06 + k * 0.016;
    const settle = appear + 0.12 + (k % 3) * 0.02;
    if (t < appear || ch === ' ') {
      x += ch === ' ' ? adv : adv;
      return;
    }
    let g = ch;
    if (t < settle) g = GLYPHS[Math.floor(hash(k + seed, Math.floor(t * 40)) * GLYPHS.length)];
    ctx.fillStyle = t < settle ? rgb(RED.rgb) : INK;
    ctx.fillText(g, x, 0);
    x += adv;
  });
  ctx.globalAlpha = 1;
}
