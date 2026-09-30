// Shot 06 art: Tiananmen at dawn in cut paper, auspicious clouds, lanterns,
// the gold-embroidered medallion and the tassel.

import * as THREE from 'three';
import { card } from '../engine/paper.js';
import { poly, smooth, ellipse, fill, stroke, clipTo, band } from './draw.js';
import { rng, TAU } from '../core.js';

const RED = '#b0302a';
const RED_DK = '#7c231f';
const TILE = '#e3a62a';
const TILE_DK = '#b07a14';
const MARBLE = '#ece6da';
const TEAL = '#2f7a78';

function roof(ctx, x0, x1, y, h, ridgeW, o = {}) {
  // Sweeping eave with upturned corners; tiles as fine vertical rules.
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const curl = o.curl ?? w * 0.035;
  const shape = (c) => {
    c.moveTo(x0 - curl, y + curl * 0.9);
    c.quadraticCurveTo(x0 + w * 0.12, y - h * 0.05, cx - ridgeW / 2, y + h);
    c.lineTo(cx + ridgeW / 2, y + h);
    c.quadraticCurveTo(x1 - w * 0.12, y - h * 0.05, x1 + curl, y + curl * 0.9);
    c.lineTo(x1 - curl * 0.3, y - h * 0.06);
    c.lineTo(x0 + curl * 0.3, y - h * 0.06);
    c.closePath();
  };
  fill(ctx, TILE, shape);
  clipTo(ctx, shape, () => {
    ctx.strokeStyle = TILE_DK;
    ctx.lineWidth = w * 0.0022;
    for (let x = x0 - curl; x < x1 + curl; x += w * 0.011) {
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(cx + (x - cx) * (ridgeW / w) * 0.9, y + h);
      ctx.stroke();
    }
    fill(ctx, 'rgba(120,70,10,0.25)', (c) => poly(c, [[x0 - curl, y - h * 0.1], [x1 + curl, y - h * 0.1], [x1 + curl, y + h * 0.08], [x0 - curl, y + h * 0.08]]));
  });
  // Ridge and its end ornaments.
  fill(ctx, TILE_DK, (c) => poly(c, [[cx - ridgeW / 2 - 0.2, y + h - 0.1], [cx + ridgeW / 2 + 0.2, y + h - 0.1], [cx + ridgeW / 2 + 0.2, y + h + h * 0.08], [cx - ridgeW / 2 - 0.2, y + h + h * 0.08]]));
  for (const sx of [-1, 1]) fill(ctx, TILE_DK, (c) => smooth(c, [[cx + sx * ridgeW / 2, y + h], [cx + sx * (ridgeW / 2 + h * 0.18), y + h + h * 0.34], [cx + sx * (ridgeW / 2 - h * 0.05), y + h + h * 0.28], [cx + sx * (ridgeW / 2 - h * 0.12), y + h + h * 0.05]], true, 0.3));
}

/** The Gate of Heavenly Peace: platform wall, marble base, colonnade, double roof. */
export function tiananmen() {
  const g = new THREE.Group();
  const wall = card({
    bounds: [-58, 0, 58, 14.5],
    px: 34,
    maxTex: 4096,
    draw: (ctx) => {
      fill(ctx, RED, (c) => poly(c, [[-56, 0], [-55, 13], [55, 13], [56, 0]]));
      fill(ctx, RED_DK, (c) => poly(c, [[-56, 0], [-56, 0.9], [56, 0.9], [56, 0]]));
      // Parapet with crenels.
      fill(ctx, '#9a2a24', (c) => poly(c, [[-55.3, 12.6], [-55.3, 14.2], [55.3, 14.2], [55.3, 12.6]]));
      for (let x = -54.5; x < 55; x += 2.2) fill(ctx, RED, (c) => poly(c, [[x, 13.4], [x + 1.1, 13.4], [x + 1.1, 14.2], [x, 14.2]]));
      // Five gateways, the central one the tallest.
      for (const [x, w, h] of [[0, 7.2, 8.8], [-13, 5.4, 7], [13, 5.4, 7], [-25, 4.8, 6.2], [25, 4.8, 6.2]]) {
        fill(ctx, '#2c120f', (c) => { c.moveTo(x - w / 2, 0.9); c.lineTo(x - w / 2, h - w / 2); c.arc(x, h - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, 0.9); c.closePath(); });
        stroke(ctx, '#8e2a25', 0.3, (c) => { c.moveTo(x - w / 2 - 0.3, 0.9); c.lineTo(x - w / 2 - 0.3, h - w / 2); c.arc(x, h - w / 2, w / 2 + 0.3, Math.PI, 0, true); c.lineTo(x + w / 2 + 0.3, 0.9); });
      }
      // Faint brick courses.
      ctx.strokeStyle = 'rgba(90,20,15,0.18)';
      ctx.lineWidth = 0.05;
      for (let y = 1.5; y < 12.6; y += 0.7) {
        ctx.beginPath();
        ctx.moveTo(-55.5, y);
        ctx.lineTo(55.5, y);
        ctx.stroke();
      }
    },
  });
  g.add(wall);
  const tower = card({
    bounds: [-40, 14, 40, 40],
    px: 40,
    maxTex: 4096,
    draw: (ctx) => {
      // Marble base with balustrade.
      fill(ctx, MARBLE, (c) => poly(c, [[-35, 14], [-35, 16.4], [35, 16.4], [35, 14]]));
      stroke(ctx, '#bdb4a3', 0.12, (c) => { c.moveTo(-35, 15.2); c.lineTo(35, 15.2); for (let x = -34.5; x < 35; x += 1.4) { c.moveTo(x, 15.2); c.lineTo(x, 16.4); } });
      // Hall body: red columns, lattice doors, bracket band.
      fill(ctx, '#8e2a25', (c) => poly(c, [[-31, 16.4], [-31, 24.2], [31, 24.2], [31, 16.4]]));
      const cols = 12;
      for (let k = 0; k <= cols; k++) {
        const x = -30 + (60 * k) / cols;
        fill(ctx, '#c2372e', (c) => poly(c, [[x - 0.45, 16.4], [x - 0.45, 23.4], [x + 0.45, 23.4], [x + 0.45, 16.4]]));
        if (k < cols) {
          const x0 = x + 0.8;
          const x1 = x + 60 / cols - 0.8;
          fill(ctx, '#6d1f1a', (c) => poly(c, [[x0, 17], [x0, 22.6], [x1, 22.6], [x1, 17]]));
          ctx.strokeStyle = '#d4a24c';
          ctx.lineWidth = 0.08;
          for (let y = 17.4; y < 22.6; y += 0.55) {
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x1, y);
            ctx.stroke();
          }
          for (let xx = x0 + 0.5; xx < x1; xx += 0.55) {
            ctx.beginPath();
            ctx.moveTo(xx, 17);
            ctx.lineTo(xx, 22.6);
            ctx.stroke();
          }
        }
      }
      fill(ctx, TEAL, (c) => poly(c, [[-32, 23.4], [-32, 24.8], [32, 24.8], [32, 23.4]]));
      band(ctx, -32, 32, 24.1, 1.0, TEAL, '#d4a24c', 'dots', '#1f4f7a');
      roof(ctx, -37, 37, 24.6, 4.2, 54, { curl: 1.8 });
      // Upper storey.
      fill(ctx, '#8e2a25', (c) => poly(c, [[-25, 28.4], [-25, 31.6], [25, 31.6], [25, 28.4]]));
      for (let k = 0; k <= 10; k++) {
        const x = -24 + 4.8 * k;
        fill(ctx, '#c2372e', (c) => poly(c, [[x - 0.35, 28.4], [x - 0.35, 31.2], [x + 0.35, 31.2], [x + 0.35, 28.4]]));
      }
      band(ctx, -26, 26, 31.4, 0.9, TEAL, '#d4a24c', 'dots', '#1f4f7a');
      roof(ctx, -33, 33, 31.6, 6.6, 26, { curl: 1.6 });
    },
  });
  tower.position.z = -3;
  g.add(tower);
  // Lanterns under the eave (they sway on their own).
  const lanterns = [];
  const lanternProto = card({
    bounds: [-1.3, -3.2, 1.3, 0.2],
    px: 110,
    draw: (ctx) => {
      stroke(ctx, '#d4a24c', 0.08, (c) => { c.moveTo(0, 0.2); c.lineTo(0, -0.4); });
      fill(ctx, '#d4a24c', (c) => poly(c, [[-0.7, -0.35], [0.7, -0.35], [0.6, -0.6], [-0.6, -0.6]]));
      fill(ctx, '#d62828', (c) => ellipse(c, 0, -1.45, 1.2, 0.95));
      stroke(ctx, 'rgba(120,20,20,0.5)', 0.05, (c) => { for (const k of [-0.7, -0.35, 0, 0.35, 0.7]) c.ellipse(0, -1.45, Math.abs(k) * 1.2 + 0.02, 0.95, 0, 0, TAU); });
      fill(ctx, '#d4a24c', (c) => poly(c, [[-0.6, -2.3], [0.6, -2.3], [0.7, -2.55], [-0.7, -2.55]]));
      for (let k = -4; k <= 4; k++) stroke(ctx, '#e0b24c', 0.06, (c) => { c.moveTo(k * 0.08, -2.55); c.lineTo(k * 0.1, -3.2); });
    },
    glowThrough: 0.35,
  });
  for (let k = 0; k < 8; k++) {
    const l = lanternProto.clone();
    const x = -26.25 + 7.5 * k;
    l.position.set(x, 23.3, -2.2);
    g.add(l);
    lanterns.push(l);
  }
  g.lanterns = lanterns;
  // Red flags along the parapet.
  const flagProto = card({
    bounds: [-0.05, 0, 2.2, 4],
    px: 60,
    seg: [6, 1],
    draw: (ctx) => {
      stroke(ctx, '#e7e2d6', 0.1, (c) => { c.moveTo(0, 0); c.lineTo(0, 4); });
      fill(ctx, '#d62828', (c) => poly(c, [[0.05, 2.4], [0.05, 3.9], [2.2, 3.7], [2.2, 2.6]]));
    },
  });
  const flags = [];
  for (let k = 0; k < 12; k++) {
    const f = flagProto.clone();
    const x = -52 + k * (104 / 11);
    if (Math.abs(x) < 34) continue;
    f.position.set(x, 14.2, 0.2);
    g.add(f);
    flags.push(f);
  }
  g.flags = flags;
  return g;
}

/** The Golden Water bridges and the moat, the huabiao, and the square. */
export function forecourt() {
  const g = new THREE.Group();
  const moat = card({ bounds: [-70, -2.2, 70, 2.2], px: 10, bevel: 0, draw: (ctx) => fill(ctx, '#2f5f66', (c) => poly(c, [[-70, -2.2], [70, -2.2], [70, 2.2], [-70, 2.2]])) });
  moat.rotation.x = -Math.PI / 2;
  moat.position.set(0, 0.03, 6);
  g.add(moat);
  for (const x of [0, -8, 8, -16, 16]) {
    const w = x === 0 ? 5.2 : 4.2;
    const b = card({ bounds: [-w / 2 - 0.3, 0, w / 2 + 0.3, 2.2], px: 60, draw: (ctx) => {
      fill(ctx, MARBLE, (c) => { c.moveTo(-w / 2 - 0.3, 0); c.quadraticCurveTo(0, 1.6, w / 2 + 0.3, 0); c.lineTo(w / 2 + 0.3, 0.5); c.quadraticCurveTo(0, 2.2, -w / 2 - 0.3, 0.5); c.closePath(); });
      stroke(ctx, '#bdb4a3', 0.06, (c) => { for (let k = -4; k <= 4; k++) { const xx = (k / 4) * (w / 2); const yy = 1.6 * (1 - (xx / (w / 2 + 0.3)) ** 2) * 0.5 + 0.5; c.moveTo(xx, yy - 0.2); c.lineTo(xx, yy + 0.45); } });
    } });
    b.position.set(x, 0, 8.3);
    g.add(b);
  }
  for (const sx of [-1, 1]) {
    const hb = card({ bounds: [-1.6, 0, 1.6, 11.5], px: 50, draw: (ctx) => {
      fill(ctx, MARBLE, (c) => poly(c, [[-1.2, 0], [-1.2, 1.2], [1.2, 1.2], [1.2, 0]]));
      fill(ctx, MARBLE, (c) => poly(c, [[-0.45, 1.2], [-0.4, 9.6], [0.4, 9.6], [0.45, 1.2]]));
      stroke(ctx, '#c9c0ae', 0.06, (c) => { for (let y = 2; y < 9.4; y += 0.9) { c.moveTo(-0.4, y); c.quadraticCurveTo(0, y + 0.5, 0.4, y + 0.2); } });
      // Cloud board through the column, the round crown and the beast.
      fill(ctx, MARBLE, (c) => smooth(c, [[-1.5, 8.2], [-0.8, 8.9], [0, 8.7], [0.8, 9.1], [1.5, 8.5], [0.9, 8.0], [0, 8.3], [-0.9, 7.9]], true, 0.4));
      fill(ctx, MARBLE, (c) => ellipse(c, 0, 9.9, 1.1, 0.35));
      fill(ctx, MARBLE, (c) => smooth(c, [[-0.4, 10.1], [-0.3, 10.9], [0.1, 11.3], [0.4, 10.8], [0.35, 10.1]], true, 0.4));
    } });
    hb.position.set(sx * 21, 0, 11);
    g.add(hb);
  }
  return g;
}

/** 祥云: an auspicious cloud of cut paper — a body of curls with a trailing tail. */
export function xiangyun(w, seed = 1, tones = ['#fbefe0', '#f1d6bd']) {
  const r = rng(seed);
  const h = w * 0.36;
  const curls = [];
  const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) curls.push([-w * 0.25 + (w * 0.55 * i) / (n - 1) + (r() - 0.5) * w * 0.05, h * (0.45 + r() * 0.25), h * (0.28 + r() * 0.12)]);
  return card({
    bounds: [-w / 2 - h * 0.2, -h * 0.1, w / 2 + h * 0.2, h * 1.2],
    px: Math.max(6, 900 / w),
    glowThrough: 0.45,
    cast: false,
    draw: (ctx) => {
      tones.forEach((tone, k) => {
        const inset = k * h * 0.07;
        fill(ctx, tone, (c) => {
          for (const [x, y, rr] of curls) {
            c.moveTo(x + rr - inset, y);
            c.arc(x, y, Math.max(0.01, rr - inset), 0, TAU);
          }
          c.moveTo(-w * 0.3, h * 0.25 + inset);
          c.quadraticCurveTo(w * 0.1, h * 0.02 + inset, w * 0.5 - inset, h * 0.18);
          c.quadraticCurveTo(w * 0.2, h * 0.3, -w * 0.3, h * 0.45 - inset);
          c.closePath();
        });
      });
      // The curls' spirals, as cut lines.
      ctx.strokeStyle = 'rgba(200,140,110,0.55)';
      ctx.lineWidth = h * 0.03;
      for (const [x, y, rr] of curls) {
        ctx.beginPath();
        for (let a = 0; a < TAU * 1.3; a += 0.1) {
          const q = rr * 0.75 * (1 - a / (TAU * 1.6));
          const px = x + Math.cos(a + 1) * q;
          const py = y + Math.sin(a + 1) * q;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    },
  });
}

/** The centre medallion: red satin, gold-embroidered 77, a gold cord rim. */
export function medallion(R = 5.4) {
  const px = 180;
  const s = Math.ceil(2 * R * 1.12 * px);
  const mc = document.createElement('canvas');
  mc.width = mc.height = s;
  const draw = (ctx, metal) => {
    const gold = metal ? '#ffffff' : '#f4c95d';
    const base = metal ? '#000000' : '#c8102e';
    fill(ctx, base, (c) => ellipse(c, 0, 0, R, R));
    stroke(ctx, gold, R * 0.07, (c) => ellipse(c, 0, 0, R * 0.93, R * 0.93));
    stroke(ctx, gold, R * 0.02, (c) => ellipse(c, 0, 0, R * 0.84, R * 0.84));
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      fill(ctx, gold, (c) => ellipse(c, Math.cos(a) * R * 0.885, Math.sin(a) * R * 0.885, R * 0.028, R * 0.028));
    }
    // The numerals, filled in satin stitch.
    ctx.save();
    ctx.scale(1, -1);
    ctx.font = `900 ${R * 1.25}px NotoSerifSC-900, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = gold;
    ctx.fillText('77', 0, R * 0.04);
    if (!metal) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.strokeStyle = 'rgba(120,70,10,0.45)';
      ctx.lineWidth = R * 0.012;
      for (let x = -R; x < R; x += R * 0.035) {
        ctx.beginPath();
        ctx.moveTo(x, -R);
        ctx.lineTo(x + R * 0.5, R);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  const c = card({ bounds: [-R * 1.05, -R * 1.05, R * 1.05, R * 1.05], px, bevel: 1, draw: (ctx) => draw(ctx, false), roughness: 0.45, normal: 0.8 });
  // Metalness from the same drawing: gold thread shines, satin does not.
  const g = mc.getContext('2d');
  const w = 2 * R * 1.05;
  g.setTransform(s / w, 0, 0, -s / w, s / 2, s / 2);
  draw(g, true);
  const mt = new THREE.CanvasTexture(mc);
  mt.colorSpace = THREE.NoColorSpace;
  const m = c.paper.front.material;
  m.metalnessMap = mt;
  m.metalness = 0.45;
  m.roughness = 0.32;
  m.needsUpdate = true;
  return c;
}

/** The tassel's gold cap (the strands are silk ribbons). */
export function tasselCap(r = 1.4) {
  return card({
    bounds: [-r, -r * 2.2, r, r * 0.8],
    px: 160,
    draw: (ctx) => {
      fill(ctx, '#d4a24c', (c) => ellipse(c, 0, 0, r * 0.5, r * 0.5));
      fill(ctx, '#e2b04a', (c) => poly(c, [[-r * 0.45, -r * 0.4], [r * 0.45, -r * 0.4], [r * 0.9, -r * 2.1], [-r * 0.9, -r * 2.1]]));
      band(ctx, -r, r, -r * 0.8, r * 0.25, '#b3101f', '#e2b04a', 'diamond');
      band(ctx, -r, r, -r * 1.6, r * 0.18, '#b3101f', '#e2b04a', 'dots');
    },
    metalness: 0.5,
    roughness: 0.4,
  });
}

export { RED, TILE };
