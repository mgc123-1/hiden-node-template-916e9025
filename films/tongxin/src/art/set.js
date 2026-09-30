// Set dressing: ground, sky, clouds, mountains, plants and buildings, all as card.

import * as THREE from 'three';
import { card, paperGrain } from '../engine/paper.js';
import { poly, smooth, ellipse, fill, stroke, clipTo, grapeLeaf, band, flowers } from './draw.js';
import { rng } from '../core.js';

/** A flat sheet lying on the ground (y = 0 plane). */
export function groundSheet(w, d, draw, px = 60, o = {}) {
  const c = card({ bounds: [-w / 2, -d / 2, w / 2, d / 2], draw, px, bevel: 0, cast: false, receive: true, ...o });
  c.rotation.x = -Math.PI / 2;
  return c;
}

/** A standing card (vertical), origin at bottom-centre unless bounds say otherwise. */
export function stand(bounds, draw, o = {}) {
  return card({ bounds, draw, ...o });
}

/** Dyed-paper sky: a huge far card, one colour with the paper's own mottling. */
export function skySheet(color, w = 900, h = 420, o = {}) {
  const c = card({
    bounds: [-w / 2, -h * 0.25, w / 2, h * 0.75],
    px: 3,
    bevel: 0,
    grain: 0.22,
    cast: false,
    receive: false,
    draw: (ctx) => {
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -h * 0.25, w, h);
      if (o.band) {
        ctx.fillStyle = o.band;
        ctx.fillRect(-w / 2, -h * 0.25, w, h * (o.bandH ?? 0.35));
      }
    },
    material: { fog: false },
    ...o,
  });
  c.paper.front.material.roughness = 1;
  c.paper.front.material.normalScale.set(0.2, 0.2);
  return c;
}

/** Paper sky: an inverted dome of dyed paper, unlit, following the camera's world. */
export function skyDome(color, r = 900, grain = 0.35) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 1024, 512);
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = grain;
  g.drawImage(paperGrain(), 0, 0, 512, 512);
  g.drawImage(paperGrain(), 512, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 11);
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  m.userData.isSky = true;
  return m;
}

/** A paper cloud: overlapping puffs with a flat base, in 1–3 tones. Translucent
 *  rice paper: lit through, so it never goes dark underneath. */
export function cloud(w, h, seed = 1, tones = ['#fbf5ea', '#efe3cf'], px = 40) {
  const r = rng(seed);
  const puffs = [];
  const n = 6 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + w * (0.12 + 0.76 * (i / (n - 1))) + (r() - 0.5) * w * 0.08;
    const rr = h * (0.28 + r() * 0.34) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.8);
    puffs.push([x, rr]);
  }
  return card({
    bounds: [-w / 2 - h * 0.2, -h * 0.05, w / 2 + h * 0.2, h * 1.1],
    px,
    grain: 0.8,
    bevel: 1,
    draw: (ctx) => {
      tones.forEach((tone, k) => {
        ctx.fillStyle = tone;
        ctx.beginPath();
        const inset = k * h * 0.08;
        for (const [x, rr] of puffs) ctx.moveTo(x + rr, rr * 0.9 + inset), ctx.arc(x, rr * 0.9 - inset * 0.5, Math.max(0.01, rr - inset), 0, Math.PI * 2);
        ctx.rect(-w / 2 + h * 0.1, 0 + inset, w - h * 0.2, h * 0.3);
        ctx.fill();
      });
    },
    glowThrough: 0.5,
    cast: false,
  });
}

/** A ridge line card (mountains, hills). profile: [[x, y], ...] top edge. */
export function ridge(profile, bottom, color, o = {}) {
  const xs = profile.map((p) => p[0]);
  const ys = profile.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  return card({
    bounds: [x0, bottom, x1, y1 + 0.5],
    px: o.px ?? 8,
    bevel: o.bevel ?? 1,
    grain: 1,
    draw: (ctx) => {
      fill(ctx, color, (c) => {
        c.moveTo(x0, bottom);
        for (const [x, y] of profile) c.lineTo(x, y);
        c.lineTo(x1, bottom);
        c.closePath();
      });
      if (o.detail) o.detail(ctx, { x0, x1, bottom, y1 });
    },
    ...o,
  });
}

export function profileNoise(x0, x1, n, base, amp, seed, sharp = 0.6) {
  const r = rng(seed);
  const pts = [];
  let y = base;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    y = base + amp * (Math.sin(i * 0.9 + r() * 2) * 0.5 + (r() - 0.5) * sharp);
    pts.push([x, y]);
  }
  return pts;
}

// ─── Turpan ─────────────────────────────────────────────────────────────────

export function grapeLeafCard(seed, size = 0.22, green = '#3f7d3a') {
  const r = rng(seed);
  const tones = ['#4d8b3c', '#3f7d3a', '#5d9b44', '#2f6a35', '#6aa84f', '#35743a'];
  const col = tones[Math.floor(r() * tones.length)];
  return card({
    bounds: [-size, -size * 0.45, size, size * 1.45],
    px: 500,
    seg: [2, 2],
    draw: (ctx) => {
      fill(ctx, col, (c) => grapeLeaf(c, 0, 0.35 * size, size * 0.95));
      stroke(ctx, 'rgba(255,255,220,0.35)', size * 0.025, (c) => {
        c.moveTo(0, -0.1 * size);
        c.lineTo(0, 1.2 * size);
        for (const a of [-1.1, -0.5, 0.5, 1.1]) {
          c.moveTo(0, 0.15 * size);
          c.lineTo(Math.sin(a) * 0.8 * size, 0.15 * size + Math.cos(a) * 0.8 * size);
        }
      });
      stroke(ctx, '#2c4f22', size * 0.04, (c) => {
        c.moveTo(0, 0.02 * size);
        c.lineTo(0.05 * size, -0.4 * size);
      });
    },
  });
}

export function grapeBunch(seed, green = false, s = 0.3) {
  const r = rng(seed);
  const berries = [];
  for (let row = 0; row < 8; row++) {
    const y = -row * s * 0.12;
    const wrow = s * (0.34 - row * 0.034);
    const n = Math.max(1, Math.round(wrow / (s * 0.075)));
    for (let i = 0; i < n; i++) berries.push([-wrow / 2 + (wrow * (i + 0.5)) / n + (r() - 0.5) * s * 0.02, y + (r() - 0.5) * s * 0.02]);
  }
  const base = green ? ['#b5c95a', '#9fb84a', '#c9d86b'] : ['#5a2a6e', '#4a1f5c', '#6d3580'];
  return card({
    bounds: [-s * 0.3, -s * 1.05, s * 0.3, s * 0.3],
    px: 600,
    draw: (ctx) => {
      stroke(ctx, '#5b4020', s * 0.03, (c) => {
        c.moveTo(0, s * 0.28);
        c.lineTo(0.01, 0);
      });
      for (const [x, y] of berries) {
        fill(ctx, base[Math.floor(r() * 3)], (c) => ellipse(c, x, y, s * 0.048, s * 0.054));
        fill(ctx, 'rgba(255,255,255,0.35)', (c) => ellipse(c, x - s * 0.014, y + s * 0.018, s * 0.012, s * 0.016));
      }
    },
  });
}

/** Carved, painted wooden post. */
export function post(h = 3, color = '#2a7f8f') {
  return card({
    bounds: [-0.09, 0, 0.09, h],
    px: 300,
    draw: (ctx) => {
      fill(ctx, '#7a4a28', (c) => poly(c, [[-0.07, 0], [-0.07, h], [0.07, h], [0.07, 0]]));
      fill(ctx, color, (c) => poly(c, [[-0.08, h - 0.5], [-0.08, h], [0.08, h], [0.08, h - 0.5]]));
      band(ctx, -0.08, 0.08, h - 0.25, 0.1, color, '#e9c46a', 'diamond', '#c1121f');
      fill(ctx, color, (c) => poly(c, [[-0.09, 0], [-0.09, 0.35], [0.09, 0.35], [0.09, 0]]));
      for (let y = 0.6; y < h - 0.6; y += 0.22) stroke(ctx, 'rgba(40,20,10,0.35)', 0.008, (c) => {
        c.moveTo(-0.06, y);
        c.lineTo(0.06, y + 0.04);
      });
    },
  });
}

/** Mud-brick wall with a carved turquoise gate and a drying-house lattice. */
export function turpanWall(w = 16, h = 3.6) {
  return card({
    bounds: [-w / 2, 0, w / 2, h],
    px: 110,
    draw: (ctx) => {
      fill(ctx, '#d6a26a', (c) => poly(c, [[-w / 2, 0], [-w / 2, h], [w / 2, h], [w / 2, 0]]));
      // Courses of brick, faintly.
      for (let y = 0.25; y < h; y += 0.25) stroke(ctx, 'rgba(120,70,30,0.18)', 0.02, (c) => {
        c.moveTo(-w / 2, y);
        c.lineTo(w / 2, y);
      });
      // Drying-house lattice (晾房): a grid of diamond vents.
      const lx0 = 2.2;
      const lx1 = w / 2 - 0.6;
      fill(ctx, '#b87c45', (c) => poly(c, [[lx0, 1.2], [lx0, h - 0.2], [lx1, h - 0.2], [lx1, 1.2]]));
      for (let y = 1.45; y < h - 0.35; y += 0.34)
        for (let x = lx0 + 0.25 + ((Math.round(y / 0.34) % 2) * 0.17); x < lx1 - 0.15; x += 0.34)
          fill(ctx, '#3b2416', (c) => poly(c, [[x, y + 0.11], [x + 0.08, y], [x, y - 0.11], [x - 0.08, y]]));
      // Gate: arched, double leaf, turquoise with carved panels.
      const gx = -2.6;
      fill(ctx, '#7b4b2a', (c) => {
        c.moveTo(gx - 1.05, 0);
        c.lineTo(gx - 1.05, 2.3);
        c.arc(gx, 2.3, 1.05, Math.PI, 0, true);
        c.lineTo(gx + 1.05, 0);
        c.closePath();
      });
      fill(ctx, '#1f8a8a', (c) => {
        c.moveTo(gx - 0.9, 0);
        c.lineTo(gx - 0.9, 2.3);
        c.arc(gx, 2.3, 0.9, Math.PI, 0, true);
        c.lineTo(gx + 0.9, 0);
        c.closePath();
      });
      for (const sx of [-1, 1])
        for (let k = 0; k < 3; k++) {
          const px0 = gx + sx * 0.45;
          const py = 0.35 + k * 0.72;
          fill(ctx, '#176c6c', (c) => poly(c, [[px0 - 0.3, py], [px0 - 0.3, py + 0.55], [px0 + 0.3, py + 0.55], [px0 + 0.3, py]]));
          fill(ctx, '#e9c46a', (c) => poly(c, [[px0, py + 0.44], [px0 + 0.14, py + 0.27], [px0, py + 0.1], [px0 - 0.14, py + 0.27]]));
        }
      stroke(ctx, '#0f4d4d', 0.03, (c) => {
        c.moveTo(gx, 0);
        c.lineTo(gx, 3.2);
      });
      // Window with a carved screen.
      const wx = -6.2;
      fill(ctx, '#7b4b2a', (c) => poly(c, [[wx - 0.7, 1.2], [wx - 0.7, 2.6], [wx + 0.7, 2.6], [wx + 0.7, 1.2]]));
      fill(ctx, '#1f8a8a', (c) => poly(c, [[wx - 0.6, 1.3], [wx - 0.6, 2.5], [wx + 0.6, 2.5], [wx + 0.6, 1.3]]));
      for (let x = wx - 0.5; x <= wx + 0.51; x += 0.2)
        for (let y = 1.4; y <= 2.41; y += 0.2) fill(ctx, '#0f4d4d', (c) => ellipse(c, x, y, 0.05, 0.05));
      // Parapet.
      fill(ctx, '#b87c45', (c) => poly(c, [[-w / 2, h - 0.25], [-w / 2, h], [w / 2, h], [w / 2, h - 0.25]]));
    },
  });
}

/** 火焰山: red-orange ranges scored by vertical gullies. */
export function flamingMountains(width, height, seed, color, gully) {
  const prof = [];
  const r = rng(seed);
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + (width * i) / n;
    const y = height * (0.55 + 0.3 * Math.sin(i * 0.55 + seed) + 0.15 * (r() - 0.5));
    prof.push([x, y]);
  }
  return ridge(prof, 0, color, {
    px: 5,
    detail: (ctx) => {
      ctx.strokeStyle = gully;
      for (let i = 0; i < 160; i++) {
        const x = -width / 2 + r() * width;
        ctx.lineWidth = 0.3 + r() * 1.2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (r() - 0.5) * 3, height * (0.3 + r() * 0.6));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  });
}

/** 维吾尔族 carpet: red field, medallion, borders. */
export function carpet(w, d) {
  return groundSheet(w, d, (ctx) => {
    fill(ctx, '#9b1d20', (c) => poly(c, [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2]]));
    fill(ctx, '#1d3557', (c) => poly(c, [[-w / 2 + 0.2, -d / 2 + 0.2], [-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2], [w / 2 - 0.2, -d / 2 + 0.2]]));
    fill(ctx, '#b32428', (c) => poly(c, [[-w / 2 + 0.32, -d / 2 + 0.32], [-w / 2 + 0.32, d / 2 - 0.32], [w / 2 - 0.32, d / 2 - 0.32], [w / 2 - 0.32, -d / 2 + 0.32]]));
    band(ctx, -w / 2 + 0.2, w / 2 - 0.2, d / 2 - 0.26, 0.1, '#1d3557', '#e9c46a', 'diamond', '#b32428');
    band(ctx, -w / 2 + 0.2, w / 2 - 0.2, -d / 2 + 0.26, 0.1, '#1d3557', '#e9c46a', 'diamond', '#b32428');
    fill(ctx, '#1d3557', (c) => poly(c, [[0, d * 0.33], [w * 0.3, 0], [0, -d * 0.33], [-w * 0.3, 0]]));
    fill(ctx, '#e9c46a', (c) => poly(c, [[0, d * 0.22], [w * 0.2, 0], [0, -d * 0.22], [-w * 0.2, 0]]));
    fill(ctx, '#b32428', (c) => poly(c, [[0, d * 0.12], [w * 0.1, 0], [0, -d * 0.12], [-w * 0.1, 0]]));
    flowers(ctx, -w / 2 + 0.4, -d / 2 + 0.4, -w * 0.25, d / 2 - 0.4, ['#e9c46a', '#f1faee'], 0.07, 21, 0.5);
    flowers(ctx, w * 0.25, -d / 2 + 0.4, w / 2 - 0.4, d / 2 - 0.4, ['#e9c46a', '#f1faee'], 0.07, 22, 0.5);
  }, 160);
}

/** Dap: frame drum with inner rings. */
export function dap(r = 0.24) {
  return card({
    bounds: [-r * 1.05, -r * 1.05, r * 1.05, r * 1.05],
    px: 700,
    draw: (ctx) => {
      fill(ctx, '#6b3e1f', (c) => ellipse(c, 0, 0, r, r));
      fill(ctx, '#ead9b8', (c) => ellipse(c, 0, 0, r * 0.88, r * 0.88));
      fill(ctx, 'rgba(160,110,60,0.25)', (c) => ellipse(c, 0, 0, r * 0.5, r * 0.5));
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        fill(ctx, '#c9a227', (c) => ellipse(c, Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94, r * 0.06, r * 0.06));
      }
    },
  });
}

export { THREE, clipTo, smooth };
