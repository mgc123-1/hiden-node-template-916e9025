// Shot 05 art: props, one backdrop per people, and the kaleidoscope textiles.
// Every backdrop is built around a person standing at the origin, seen from +z.

import * as THREE from 'three';
import { card } from '../engine/paper.js';
import { buildPuppet } from '../engine/puppet.js';
import { poly, smooth, ellipse, fill, stroke, clipTo, ikat, band, flowers } from './draw.js';
import { groundSheet, karst, cloud } from './set.js';
import { rng, TAU } from '../core.js';

const at = (m, x, y, z, s = 1) => {
  m.position.set(x, y, z);
  m.scale.setScalar(s);
  return m;
};
const flat = (w, d, color, px = 8) => groundSheet(w, d, (ctx) => {
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -d / 2, w, d);
}, px);

// ─── Props ──────────────────────────────────────────────────────────────────

/** 绣球: a ball of twelve embroidered petals with a tassel. Origin at the centre. */
export function xiuqiu(r = 0.11) {
  return card({
    bounds: [-r * 1.3, -r * 2.6, r * 1.3, r * 1.3],
    px: 1400,
    draw: (ctx) => {
      const cols = ['#d62839', '#f4d35e', '#2a9d8f', '#e76f51', '#3a86ff', '#f7a1b5'];
      fill(ctx, '#d62839', (c) => ellipse(c, 0, 0, r, r));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        fill(ctx, cols[k], (c) => ellipse(c, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.46, r * 0.24, a));
        fill(ctx, '#fff6', (c) => ellipse(c, Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.12, r * 0.06, a));
      }
      fill(ctx, '#f4d35e', (c) => ellipse(c, 0, 0, r * 0.2, r * 0.2));
      stroke(ctx, '#f4d35e', r * 0.06, (c) => { c.moveTo(0, -r); c.lineTo(0, -r * 1.5); });
      for (let k = -3; k <= 3; k++) stroke(ctx, '#d62839', r * 0.05, (c) => { c.moveTo(0, -r * 1.5); c.lineTo(k * r * 0.1, -r * 2.5); });
    },
  });
}

/** A torch: a pine stick bound with cord, and three layers of cut-paper flame. */
export function torch() {
  const g = new THREE.Group();
  g.add(card({
    bounds: [-0.04, -0.7, 0.04, 0.08],
    px: 500,
    draw: (ctx) => {
      fill(ctx, '#6b4a2b', (c) => poly(c, [[-0.025, -0.7], [0.025, -0.7], [0.035, 0.05], [-0.035, 0.05]]));
      for (let y = -0.1; y > -0.3; y -= 0.04) stroke(ctx, '#c1121f', 0.012, (c) => { c.moveTo(-0.035, y); c.lineTo(0.035, y - 0.02); });
    },
  }));
  const flames = [];
  const tones = ['#d62828', '#f77f00', '#fcbf49', '#ffe8a3'];
  tones.forEach((col, k) => {
    const s = 0.62 * (1 - k * 0.2);
    const f = card({
      bounds: [-0.2, -0.02, 0.2, 0.6],
      px: 400,
      glowThrough: 0.7 + k * 0.25,
      cast: false,
      draw: (ctx) => fill(ctx, col, (c) => {
        c.moveTo(-0.14 * s, 0.02);
        c.bezierCurveTo(-0.2 * s, 0.2 * s, -0.05 * s, 0.3 * s, -0.08 * s, 0.5 * s);
        c.bezierCurveTo(0.0, 0.36 * s, 0.1 * s, 0.4 * s, 0.03 * s, 0.58 * s);
        c.bezierCurveTo(0.18 * s, 0.4 * s, 0.2 * s, 0.2 * s, 0.14 * s, 0.02);
        c.closePath();
      }),
    });
    f.position.set(0, 0.03, 0.004 * k);
    g.add(f);
    flames.push(f);
  });
  g.flames = flames;
  g.flicker = (t, seed = 0) => flames.forEach((f, k) => {
    f.scale.set(1 + 0.08 * Math.sin(t * 23 + k * 2 + seed), 1 + 0.16 * Math.sin(t * 17 + k * 1.3 + seed * 1.7), 1);
    f.rotation.z = 0.08 * Math.sin(t * 13 + k + seed);
  });
  return g;
}

/** A golden eagle, wings spread, as a three-part puppet (body + two wings). */
export function eagle() {
  const B = '#4a3222';
  const wing = (sx) => (ctx) => {
    fill(ctx, B, (c) => {
      c.moveTo(0, 0.05);
      c.bezierCurveTo(sx * 0.3, 0.2, sx * 0.6, 0.18, sx * 0.85, 0.05);
      for (let k = 0; k < 6; k++) {
        const x = sx * (0.85 - k * 0.1);
        c.lineTo(x - sx * 0.02, -0.12 - k * 0.012);
        c.lineTo(x - sx * 0.07, -0.02);
      }
      c.lineTo(0, -0.08);
      c.closePath();
    });
    fill(ctx, '#7a5634', (c) => smooth(c, [[sx * 0.05, 0.04], [sx * 0.45, 0.12], [sx * 0.6, 0.06], [sx * 0.3, 0.0]], true, 0.4));
  };
  const parts = [
    { name: 'body', pin: [0, 0], z: 0, bounds: [-0.16, -0.4, 0.16, 0.25], draw: (ctx) => {
      fill(ctx, B, (c) => smooth(c, [[0, 0.2], [0.1, 0.1], [0.11, -0.15], [0.05, -0.38], [-0.05, -0.38], [-0.11, -0.15], [-0.1, 0.1]], true, 0.4));
      fill(ctx, '#c8a26a', (c) => ellipse(c, 0, 0.14, 0.07, 0.07));
      fill(ctx, '#f4d35e', (c) => poly(c, [[0.04, 0.15], [0.12, 0.12], [0.05, 0.1]]));
      fill(ctx, '#15110f', (c) => ellipse(c, 0.025, 0.16, 0.012, 0.012));
    } },
    { name: 'wingA', parent: 'body', pin: [-0.06, 0.04], z: -0.01, bounds: [-0.9, -0.22, 0.02, 0.24], draw: wing(-1) },
    { name: 'wingB', parent: 'body', pin: [0.06, 0.04], z: -0.01, bounds: [-0.02, -0.22, 0.9, 0.24], draw: wing(1) },
  ];
  return buildPuppet(parts, { back: '#5a4030', px: 600 });
}

/** A swing: two ropes from far above to a plank seat. Origin at the pivot. */
export function swingRig(len = 5) {
  return card({
    bounds: [-0.32, -len - 0.06, 0.32, 0],
    px: 160,
    draw: (ctx) => {
      for (const x of [-0.26, 0.26]) stroke(ctx, '#c9a66b', 0.025, (c) => { c.moveTo(x * 0.6, 0); c.lineTo(x, -len); });
      fill(ctx, '#8a5a2b', (c) => poly(c, [[-0.3, -len + 0.02], [0.3, -len + 0.02], [0.3, -len - 0.05], [-0.3, -len - 0.05]]));
      for (let y = -0.4; y > -len; y -= 0.5) for (const x of [-0.26, 0.26]) fill(ctx, '#d62839', (c) => ellipse(c, x * (0.6 + 0.4 * (-y / len)), y, 0.03, 0.02));
    },
  });
}

// ─── Backdrops ──────────────────────────────────────────────────────────────

function gableRoof(ctx, x0, x1, y, h, tile, edge, curl = 0.3) {
  // A Chinese roof: sweeping eaves, curling up at the corners.
  fill(ctx, tile, (c) => {
    c.moveTo(x0 - curl, y + curl * 0.6);
    c.quadraticCurveTo(x0 + (x1 - x0) * 0.15, y - 0.02, x0 + (x1 - x0) * 0.3, y + h * 0.25);
    c.lineTo(x0 + (x1 - x0) * 0.38, y + h);
    c.lineTo(x1 - (x1 - x0) * 0.38, y + h);
    c.lineTo(x1 - (x1 - x0) * 0.3, y + h * 0.25);
    c.quadraticCurveTo(x1 - (x1 - x0) * 0.15, y - 0.02, x1 + curl, y + curl * 0.6);
    c.lineTo(x1 - curl * 0.2, y - 0.08);
    c.lineTo(x0 + curl * 0.2, y - 0.08);
    c.closePath();
  });
  if (edge) stroke(ctx, edge, 0.05, (c) => {
    c.moveTo(x0 - curl, y + curl * 0.6);
    c.quadraticCurveTo(x0 + (x1 - x0) * 0.15, y - 0.02, x0 + (x1 - x0) * 0.3, y + h * 0.25);
    c.moveTo(x1 + curl, y + curl * 0.6);
    c.quadraticCurveTo(x1 - (x1 - x0) * 0.15, y - 0.02, x1 - (x1 - x0) * 0.3, y + h * 0.25);
  });
}

const peaks = (seed, w, h, col, o = {}) => {
  const r = rng(seed);
  const n = o.n ?? 7;
  const pts = [[-w / 2, 0]];
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w * i) / n;
    pts.push([x - w / n / 2, h * (0.35 + r() * 0.25)], [x, h * (0.6 + r() * 0.4)]);
  }
  pts.push([w / 2, 0]);
  return card({
    bounds: [-w / 2 - 1, 0, w / 2 + 1, h * 1.05],
    px: o.px ?? 6,
    draw: (ctx) => {
      fill(ctx, col, (c) => poly(c, pts));
      if (o.snow) clipTo(ctx, (c) => poly(c, pts), () => {
        for (let i = 2; i < pts.length - 1; i += 2) {
          const [x, y] = pts[i];
          fill(ctx, o.snow, (c) => poly(c, [[x - h * 0.22, y - h * 0.24], [x, y + 0.2], [x + h * 0.2, y - h * 0.22], [x + h * 0.08, y - h * 0.16], [x - h * 0.05, y - h * 0.26]]));
        }
      });
    },
  });
};

export const SETS = {
  zhuang() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#6f9a58'));
    const river = groundSheet(60, 6, (ctx) => {
      fill(ctx, '#4f9fa0', (c) => poly(c, [[-30, -2.5], [30, -1.5], [30, 3], [-30, 2.2]]));
      stroke(ctx, 'rgba(255,255,255,0.4)', 0.08, (c) => { for (let x = -28; x < 28; x += 3) { c.moveTo(x, 0); c.lineTo(x + 1.2, 0.1); } });
    }, 12);
    g.add(at(river, 0, 0.01, -7));
    [[-9, 7, '#3f7a64', 11], [-17, 11, '#5e9683', 12], [-32, 16, '#8db6a6', 13], [-55, 22, '#b3cfc3', 14]].forEach(([z, h, col, s]) => g.add(at(karst(s, 7, 90, h, col), 0, 0, z)));
    return g;
  },
  korean() {
    const g = new THREE.Group();
    g.add(flat(60, 40, '#b5a26a'));
    g.add(at(peaks(21, 120, 14, '#8aa3b8', { n: 9 }), 0, 0, -40));
    const hanok = card({ bounds: [-5, 0, 5, 4.2], px: 60, draw: (ctx) => {
      fill(ctx, '#f3ead8', (c) => poly(c, [[-3.6, 0], [-3.6, 2.2], [3.6, 2.2], [3.6, 0]]));
      for (const x of [-3.5, -1.8, 0, 1.8, 3.5]) fill(ctx, '#7a4b2a', (c) => poly(c, [[x - 0.08, 0], [x - 0.08, 2.2], [x + 0.08, 2.2], [x + 0.08, 0]]));
      for (const x of [-2.7, -0.9, 0.9, 2.7]) {
        fill(ctx, '#e9dcc0', (c) => poly(c, [[x - 0.6, 0.6], [x - 0.6, 1.9], [x + 0.6, 1.9], [x + 0.6, 0.6]]));
        stroke(ctx, '#7a4b2a', 0.03, (c) => { for (let k = -2; k <= 2; k++) { c.moveTo(x + k * 0.25, 0.6); c.lineTo(x + k * 0.25, 1.9); } c.moveTo(x - 0.6, 1.25); c.lineTo(x + 0.6, 1.25); });
      }
      gableRoof(ctx, -4.4, 4.4, 2.2, 1.9, '#4a4f57', '#2e3238', 0.7);
    } });
    g.add(at(hanok, 1.5, 0, -8));
    // Persimmon branch, close to the lens (thrown out of focus).
    const branch = card({ bounds: [-1.2, -0.6, 1.2, 0.6], px: 260, draw: (ctx) => {
      stroke(ctx, '#3b2a1f', 0.05, (c) => { c.moveTo(-1.2, 0.5); c.quadraticCurveTo(-0.2, 0.1, 1.1, -0.3); c.moveTo(-0.3, 0.15); c.lineTo(-0.1, -0.35); });
      for (const [x, y] of [[-0.1, -0.4], [0.5, -0.2], [0.9, -0.42], [-0.6, 0.2]]) {
        fill(ctx, '#f77f00', (c) => ellipse(c, x, y, 0.12, 0.1));
        fill(ctx, '#2f5d3a', (c) => ellipse(c, x, y + 0.09, 0.05, 0.02));
      }
      for (const [x, y, a] of [[0.2, 0.0, 0.4], [0.7, -0.05, -0.3], [-0.5, 0.4, 0.8], [1.0, -0.2, 0.2]]) fill(ctx, '#c85a2a', (c) => ellipse(c, x, y, 0.16, 0.06, a));
    } });
    g.add(at(branch, -2.2, 3.3, 1.0, 0.8));
    g.branch = branch;
    return g;
  },
  yi() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#232033'));
    g.add(at(peaks(31, 140, 12, '#1a2038', { n: 8 }), 0, 0, -45));
    g.add(at(peaks(32, 90, 7, '#262a44', { n: 6 }), 0, 0, -22));
    const r = rng(33);
    const far = [];
    for (let i = 0; i < 26; i++) {
      const tch = torch();
      const a = -0.2 - r() * 2.7;
      const d = 4 + r() * 9;
      tch.position.set(Math.cos(a) * d, 1.3 + r() * 0.5, -1 + Math.sin(a) * d * 0.9);
      tch.scale.setScalar(0.8 + r() * 0.3);
      g.add(tch);
      far.push(tch);
    }
    g.torches = far;
    return g;
  },
  hani() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#6b7f4a'));
    // Terraces: a hillside of water-mirrors, contour upon contour.
    const terr = card({ bounds: [-18, 0, 18, 12], px: 50, draw: (ctx) => {
      fill(ctx, '#5f7040', (c) => poly(c, [[-18, 0], [-18, 9], [-8, 11.5], [4, 12], [18, 10], [18, 0]]));
      for (let k = 0; k < 16; k++) {
        const y = 0.3 + k * 0.72;
        const pts = [];
        for (let x = -18; x <= 18; x += 1.5) pts.push([x, y + 0.5 * Math.sin(x * 0.35 + k * 0.7) + 0.25 * Math.sin(x * 0.9 + k)]);
        const top = pts.map(([x, yy]) => [x, yy + 0.46]);
        fill(ctx, k % 3 === 0 ? '#c9dde6' : k % 3 === 1 ? '#a9c7d6' : '#dfe8e0', (c) => { poly(c, [...pts, ...top.reverse()]); });
        stroke(ctx, '#4d5e33', 0.08, (c) => poly(c, pts, false));
      }
    } });
    g.add(at(terr, 0, 0, -10));
    g.add(at(peaks(41, 120, 16, '#a3b3a8', { n: 7 }), 0, 0, -45));
    return g;
  },
  kazakh() {
    const g = new THREE.Group();
    g.add(flat(90, 60, '#9aa76a'));
    g.add(at(peaks(51, 160, 26, '#7f93ad', { n: 9, snow: '#f4f6f8' }), 0, 0, -60));
    const r = rng(52);
    const pines = card({ bounds: [-20, 0, 20, 6], px: 30, draw: (ctx) => {
      for (let i = 0; i < 40; i++) {
        const x = -20 + r() * 40;
        const h = 3 + r() * 3;
        fill(ctx, i % 2 ? '#2f4f3f' : '#3c5e4b', (c) => poly(c, [[x - h * 0.22, 0], [x, h], [x + h * 0.22, 0]]));
      }
    } });
    g.add(at(pines, 0, 0, -18));
    return g;
  },
  hui() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#d9c08c'));
    g.add(at(peaks(61, 150, 9, '#c9a877', { n: 6 }), 0, 0, -50));
    // A mosque in the Chinese manner: green-tiled pavilion roofs and crescent finials.
    const mosque = card({ bounds: [-7, 0, 7, 9], px: 50, draw: (ctx) => {
      fill(ctx, '#efe4cf', (c) => poly(c, [[-5, 0], [-5, 3.2], [5, 3.2], [5, 0]]));
      for (const x of [-3, 0, 3]) fill(ctx, '#7a4b2a', (c) => { c.moveTo(x - 0.6, 0); c.lineTo(x - 0.6, 1.6); c.quadraticCurveTo(x, 2.4, x + 0.6, 1.6); c.lineTo(x + 0.6, 0); c.closePath(); });
      gableRoof(ctx, -5.8, 5.8, 3.2, 1.6, '#2f7d62', '#1f5a46', 0.6);
      fill(ctx, '#efe4cf', (c) => poly(c, [[-1.6, 4.8], [-1.6, 6.0], [1.6, 6.0], [1.6, 4.8]]));
      gableRoof(ctx, -2.4, 2.4, 6.0, 1.4, '#2f7d62', '#1f5a46', 0.4);
      stroke(ctx, '#d4a24c', 0.07, (c) => { c.moveTo(0, 7.4); c.lineTo(0, 8.1); });
      fill(ctx, '#d4a24c', (c) => { c.arc(0, 8.35, 0.3, Math.PI * 0.3, Math.PI * 1.7); c.arc(0.1, 8.35, 0.22, Math.PI * 1.6, Math.PI * 0.4, true); c.closePath(); });
      for (const x of [-6.3, 6.3]) {
        fill(ctx, '#efe4cf', (c) => poly(c, [[x - 0.3, 0], [x - 0.3, 6.2], [x + 0.3, 6.2], [x + 0.3, 0]]));
        gableRoof(ctx, x - 0.6, x + 0.6, 6.2, 0.8, '#2f7d62', null, 0.15);
      }
    } });
    g.add(at(mosque, -1.5, 0, -11));
    return g;
  },
  manchu() {
    const g = new THREE.Group();
    g.add(flat(70, 50, '#c9b48a'));
    // Red palace wall under yellow glazed tiles, a gingko blazing gold.
    const wall = card({ bounds: [-12, 0, 12, 4.4], px: 50, draw: (ctx) => {
      fill(ctx, '#a8322d', (c) => poly(c, [[-12, 0], [-12, 3.6], [12, 3.6], [12, 0]]));
      fill(ctx, '#e0a526', (c) => poly(c, [[-12.3, 3.5], [-12, 4.3], [12, 4.3], [12.3, 3.5]]));
      stroke(ctx, '#b07a14', 0.05, (c) => { for (let x = -12; x < 12; x += 0.3) { c.moveTo(x, 3.55); c.lineTo(x + 0.1, 4.25); } });
      fill(ctx, '#7c231f', (c) => poly(c, [[-12, 0], [-12, 0.5], [12, 0.5], [12, 0]]));
    } });
    g.add(at(wall, 0, 0, -3.5));
    const r = rng(71);
    const ginkgo = card({ bounds: [-3, 0, 3, 7], px: 60, draw: (ctx) => {
      stroke(ctx, '#4a3526', 0.25, (c) => { c.moveTo(0, 0); c.lineTo(0.1, 4); c.moveTo(0.05, 2.5); c.lineTo(-1.4, 4.2); c.moveTo(0.1, 3.2); c.lineTo(1.5, 4.6); });
      for (let i = 0; i < 140; i++) {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * 2.6;
        fill(ctx, ['#f4c430', '#e8a317', '#ffd95a'][i % 3], (c) => ellipse(c, Math.cos(a) * d, 4.6 + Math.sin(a) * d * 0.8, 0.28, 0.2, a));
      }
    } });
    g.add(at(ginkgo, 3.4, 0, -5.5));
    return g;
  },
  bai() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#6d8a6a'));
    g.add(at(flat(200, 50, '#5a8fb8', 3), 0, 0.01, -45));
    g.add(at(peaks(81, 160, 22, '#6d809c', { n: 8, snow: '#dfe6ee' }), 0, 0, -70));
    // The Three Pagodas of Chongsheng.
    const pag = card({ bounds: [-8, 0, 8, 14], px: 30, draw: (ctx) => {
      const tower = (x, h, w, tiers) => {
        for (let k = 0; k < tiers; k++) {
          const y = (h * k) / tiers;
          const ww = w * (1 - 0.45 * (k / tiers));
          fill(ctx, '#f1ede4', (c) => poly(c, [[x - ww / 2, y], [x - ww / 2, y + h / tiers - 0.08], [x + ww / 2, y + h / tiers - 0.08], [x + ww / 2, y]]));
          fill(ctx, '#b9b2a2', (c) => poly(c, [[x - ww / 2 - 0.12, y + h / tiers - 0.1], [x - ww / 2 - 0.04, y + h / tiers], [x + ww / 2 + 0.04, y + h / tiers], [x + ww / 2 + 0.12, y + h / tiers - 0.1]]));
        }
        fill(ctx, '#8a7a5a', (c) => poly(c, [[x - 0.08, h], [x, h + 0.8], [x + 0.08, h]]));
      };
      tower(0, 12.6, 1.6, 16);
      tower(-5.5, 8, 1.1, 10);
      tower(5.5, 8, 1.1, 10);
    } });
    g.add(at(pag, 0, 0, -30));
    // A white Bai wall with a grey tile coping.
    const wall = card({ bounds: [-9, 0, 9, 3], px: 50, draw: (ctx) => {
      fill(ctx, '#f6f3ea', (c) => poly(c, [[-9, 0], [-9, 2.5], [9, 2.5], [9, 0]]));
      fill(ctx, '#4a4f57', (c) => poly(c, [[-9.2, 2.4], [-9, 2.95], [9, 2.95], [9.2, 2.4]]));
      stroke(ctx, '#6d7c8f', 0.03, (c) => { c.moveTo(-9, 2.1); c.lineTo(9, 2.1); });
      band(ctx, -9, 9, 2.25, 0.18, '#f6f3ea', '#5a7fa8', 'cloud');
    } });
    g.add(at(wall, 0, 0, -6));
    return g;
  },
  naxi() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#7a8a5a'));
    // Jade Dragon Snow Mountain: a saw of white peaks.
    const jade = card({ bounds: [-60, 0, 60, 30], px: 6, draw: (ctx) => {
      const pts = [[-60, 0], [-45, 10], [-30, 16], [-22, 23], [-16, 19], [-10, 28], [-4, 22], [2, 29], [8, 21], [15, 25], [24, 15], [40, 9], [60, 4], [60, 0]];
      fill(ctx, '#7f8fa8', (c) => poly(c, pts));
      clipTo(ctx, (c) => poly(c, pts), () => fill(ctx, '#f4f6f8', (c) => poly(c, [[-40, 14], [-22, 17], [-10, 20], [2, 21], [15, 18], [30, 13], [30, 40], [-40, 40]])));
    } });
    g.add(at(jade, 0, 0, -80));
    // Lijiang roofs: layered dark tile with pale gable boards.
    const roofs = card({ bounds: [-14, 0, 14, 5], px: 40, draw: (ctx) => {
      for (let k = 0; k < 9; k++) {
        const x = -13 + k * 3.2;
        const y = 0.8 + (k % 3) * 0.7;
        fill(ctx, '#e9e2d0', (c) => poly(c, [[x - 1.2, 0], [x - 1.2, y + 0.6], [x + 1.2, y + 0.6], [x + 1.2, 0]]));
        gableRoof(ctx, x - 1.5, x + 1.5, y + 0.6, 1.2, '#3a3f48', '#262a30', 0.3);
      }
    } });
    g.add(at(roofs, 0, 0, -9));
    return g;
  },
  dong() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#5d8a4a'));
    g.add(at(peaks(91, 140, 14, '#4f7a5a', { n: 8 }), 0, 0, -40));
    // Drum tower: eave upon eave of dark fir and white-lined tiles.
    const tower = card({ bounds: [-4, 0, 4, 15], px: 40, draw: (ctx) => {
      fill(ctx, '#5a3b26', (c) => poly(c, [[-1.6, 0], [-1.6, 3], [1.6, 3], [1.6, 0]]));
      const tiers = 11;
      for (let k = 0; k < tiers; k++) {
        const y = 2.6 + k * 0.95;
        const w = 3.6 * (1 - k / (tiers + 2));
        fill(ctx, '#3a3f48', (c) => { c.moveTo(-w - 0.3, y + 0.2); c.quadraticCurveTo(-w * 0.5, y + 0.1, -w * 0.4, y + 0.7); c.lineTo(w * 0.4, y + 0.7); c.quadraticCurveTo(w * 0.5, y + 0.1, w + 0.3, y + 0.2); c.lineTo(w, y); c.lineTo(-w, y); c.closePath(); });
        stroke(ctx, '#f3efe6', 0.07, (c) => { c.moveTo(-w - 0.3, y + 0.2); c.quadraticCurveTo(-w * 0.5, y + 0.1, 0, y + 0.05); c.quadraticCurveTo(w * 0.5, y + 0.1, w + 0.3, y + 0.2); });
      }
      fill(ctx, '#d4a24c', (c) => poly(c, [[-0.1, 13], [0, 14.6], [0.1, 13]]));
    } });
    g.add(at(tower, -2.6, 0, -12));
    // Wind-and-rain bridge across the stream.
    const bridge = card({ bounds: [-12, 0, 12, 4], px: 30, draw: (ctx) => {
      fill(ctx, '#5a3b26', (c) => poly(c, [[-12, 1.2], [-12, 1.8], [12, 1.8], [12, 1.2]]));
      for (const x of [-8, 0, 8]) fill(ctx, '#8a8f98', (c) => poly(c, [[x - 0.8, 0], [x - 0.6, 1.2], [x + 0.6, 1.2], [x + 0.8, 0]]));
      gableRoof(ctx, -11.5, 11.5, 2.4, 0.9, '#3a3f48', '#f3efe6', 0.3);
      for (const x of [-8, 0, 8]) gableRoof(ctx, x - 1.1, x + 1.1, 3.1, 0.8, '#3a3f48', '#f3efe6', 0.2);
    } });
    g.add(at(bridge, 6, 0, -22));
    return g;
  },
  li() {
    const g = new THREE.Group();
    g.add(flat(80, 60, '#d9c9a0'));
    g.add(at(flat(200, 60, '#2a9dbc', 3), 0, 0.01, -50));
    // Boat-shaped house: a thatched hull upturned on stilts.
    const house = card({ bounds: [-5, 0, 5, 4], px: 50, draw: (ctx) => {
      for (const x of [-3.5, -1.2, 1.2, 3.5]) fill(ctx, '#6b4a2b', (c) => poly(c, [[x - 0.08, 0], [x - 0.08, 1.2], [x + 0.08, 1.2], [x + 0.08, 0]]));
      fill(ctx, '#b58a4a', (c) => { c.moveTo(-4.6, 1.1); c.bezierCurveTo(-4.4, 3.8, 4.4, 3.8, 4.6, 1.1); c.closePath(); });
      stroke(ctx, '#8a6232', 0.05, (c) => { for (let x = -4.2; x < 4.3; x += 0.25) { c.moveTo(x, 1.15); c.lineTo(x * 0.9, 2.2 + 0.9 * Math.cos((x / 4.6) * 1.4)); } });
    } });
    g.add(at(house, 2.5, 0, -8));
    const r = rng(111);
    const palms = card({ bounds: [-3, 0, 3, 9], px: 40, draw: (ctx) => {
      stroke(ctx, '#7a5a3a', 0.22, (c) => { c.moveTo(0.3, 0); c.quadraticCurveTo(-0.5, 4, 0.4, 8); });
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU;
        fill(ctx, k % 2 ? '#3d7a3a' : '#2f6a35', (c) => { c.moveTo(0.4, 8); c.quadraticCurveTo(0.4 + Math.cos(a) * 1.6, 8 + Math.sin(a) * 1.2 + 0.6, 0.4 + Math.cos(a) * 2.8, 8 + Math.sin(a) * 1.4 - 0.8); c.quadraticCurveTo(0.4 + Math.cos(a) * 1.4, 8 + Math.sin(a) * 0.8, 0.4, 8); });
      }
      void r;
    } });
    g.add(at(palms, -4.5, 0, -6));
    return g;
  },
};

// ─── Kaleidoscope textiles ──────────────────────────────────────────────────
// Each people's textile, refolded into a mandala: rings of motifs from the
// cloth, repeated round the centre. Also used for the patches of the quilt.

export const TEXTILES = [
  { name: '汉族', py: 'HAN', note: '云锦', bg: '#9c1c24', pal: ['#e8b64a', '#f6e3b0', '#1d3557', '#c1121f'], rings: ['scroll', 'band', 'petal', 'scroll', 'diamond', 'dot'] },
  { name: '土家族', py: 'TUJIA', note: '西兰卡普', bg: '#15110f', pal: ['#e63946', '#f4d35e', '#2a9d8f', '#f77f00', '#8338ec'], rings: ['diamond', 'zig', 'diamond', 'band', 'diamond'] },
  { name: '布依族', py: 'BUYI', note: '蜡染', bg: '#1d3a6e', pal: ['#f1f5f9', '#9fb7d8'], rings: ['dot', 'petal', 'band', 'scale', 'dot', 'petal'] },
  { name: '瑶族', py: 'YAO', note: '挑花', bg: '#15110f', pal: ['#d62839', '#f4d35e', '#fbfaf7'], rings: ['zig', 'cross', 'band', 'zig', 'cross'] },
  { name: '畲族', py: 'SHE', note: '凤凰装', bg: '#1b2440', pal: ['#e63946', '#f4a261', '#2a9d8f', '#f4d35e'], rings: ['petal', 'stripes', 'eye', 'band', 'petal'] },
  { name: '羌族', py: 'QIANG', note: '羌绣', bg: '#1b1f3b', pal: ['#e5566b', '#f7a1b5', '#2a9d8f', '#f4d35e'], rings: ['scroll', 'petal', 'dot', 'scroll', 'petal'] },
  { name: '景颇族', py: 'JINGPO', note: '银泡', bg: '#5a0f16', pal: ['#15110f', '#e7eaee', '#f4d35e'], rings: ['dot', 'band', 'dot', 'zig', 'dot'] },
  { name: '土族', py: 'TU', note: '七彩袖', bg: '#fbf6ea', pal: ['#e63946', '#f77f00', '#f4d35e', '#2a9d8f', '#3a86ff', '#15110f'], rings: ['stripes', 'stripes', 'stripes'] },
  { name: '塔吉克族', py: 'TAJIK', note: '刺绣', bg: '#c1121f', pal: ['#fbfaf7', '#15110f', '#f4d35e'], rings: ['cross', 'petal', 'band', 'diamond', 'dot'] },
  { name: '柯尔克孜族', py: 'KIRGIZ', note: '毡绣', bg: '#1d3557', pal: ['#e63946', '#fbfaf7', '#f4d35e'], rings: ['scroll', 'band', 'scroll', 'petal'] },
  { name: '鄂温克族', py: 'EWENKI', note: '桦皮', bg: '#e8dcc0', pal: ['#6b4a2b', '#1d3557', '#c1121f'], rings: ['zig', 'dot', 'band', 'zig', 'scale'] },
  { name: '赫哲族', py: 'HEZHE', note: '鱼皮', bg: '#6b5a3e', pal: ['#e8dcc0', '#2a6f97', '#15110f'], rings: ['scale', 'band', 'scale', 'scroll'] },
  { name: '京族', py: 'JING', note: '海', bg: '#2a6f97', pal: ['#fbfaf7', '#f4d35e', '#a9d6e5'], rings: ['scale', 'petal', 'dot', 'band', 'scale'] },
  { name: '傈僳族', py: 'LISU', note: '花边', bg: '#fbfaf7', pal: ['#e63946', '#1d3557', '#f4d35e', '#2a9d8f'], rings: ['stripes', 'zig', 'stripes', 'diamond'] },
  { name: '佤族', py: 'VA', note: '红黑', bg: '#15110f', pal: ['#c1121f', '#e7eaee', '#f4d35e'], rings: ['band', 'zig', 'dot', 'band', 'cross'] },
  { name: '高山族', py: 'GAOSHAN', note: '菱纹', bg: '#c1121f', pal: ['#15110f', '#f4d35e', '#fbfaf7'], rings: ['diamond', 'band', 'diamond', 'zig', 'dot'] },
];

/** Draw a mandala of radius R centred at (0,0). */
export function mandala(ctx, R, spec, seed = 1) {
  const r = rng(seed);
  const pal = spec.pal;
  ctx.fillStyle = spec.bg;
  ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
  const rings = spec.rings;
  const nR = rings.length;
  const sym = [8, 12, 16, 6][seed % 4];
  // Outer field: a fine repeat of the first motif so the corners are cloth too.
  for (let k = 0; k < nR + 3; k++) {
    const kind = rings[k % nR];
    const r1 = R * (1 - k / (nR + 3)) * 1.45;
    const r0 = R * (1 - (k + 1) / (nR + 3)) * 1.45;
    const col = pal[k % pal.length];
    const col2 = pal[(k + 1) % pal.length];
    const m = sym * (k < 3 ? 2 : 1);
    const mid = (r0 + r1) / 2;
    const th = r1 - r0;
    ctx.save();
    if (kind === 'band') {
      fill(ctx, col, (c) => { c.arc(0, 0, r1 - th * 0.2, 0, TAU); c.arc(0, 0, r0 + th * 0.2, 0, TAU, true); });
      for (let i = 0; i < m * 2; i++) {
        const a = (i / (m * 2)) * TAU;
        fill(ctx, col2, (c) => ellipse(c, Math.cos(a) * mid, Math.sin(a) * mid, th * 0.12, th * 0.12));
      }
    } else if (kind === 'stripes') {
      const n = 7;
      for (let i = 0; i < n; i++) fill(ctx, pal[(i + k) % pal.length], (c) => { c.arc(0, 0, r1 - (th * i) / n, 0, TAU); c.arc(0, 0, r1 - (th * (i + 1)) / n, 0, TAU, true); });
    } else {
      for (let i = 0; i < m; i++) {
        const a = (i / m) * TAU + (k % 2 ? Math.PI / m : 0);
        ctx.save();
        ctx.rotate(a);
        ctx.translate(mid, 0);
        const s = th * 0.5;
        if (kind === 'petal') {
          fill(ctx, col, (c) => ellipse(c, 0, 0, s * 0.95, s * 0.42));
          fill(ctx, col2, (c) => ellipse(c, s * 0.1, 0, s * 0.45, s * 0.18));
        } else if (kind === 'diamond') {
          fill(ctx, col, (c) => poly(c, [[-s, 0], [0, s * 0.8], [s, 0], [0, -s * 0.8]]));
          fill(ctx, col2, (c) => poly(c, [[-s * 0.5, 0], [0, s * 0.4], [s * 0.5, 0], [0, -s * 0.4]]));
          fill(ctx, spec.bg, (c) => poly(c, [[-s * 0.18, 0], [0, s * 0.15], [s * 0.18, 0], [0, -s * 0.15]]));
        } else if (kind === 'dot') {
          fill(ctx, col, (c) => ellipse(c, 0, 0, s * 0.55, s * 0.55));
          fill(ctx, col2, (c) => ellipse(c, 0, 0, s * 0.25, s * 0.25));
        } else if (kind === 'zig') {
          fill(ctx, col, (c) => poly(c, [[-s, -s * 0.5], [0, s * 0.9], [s, -s * 0.5], [s * 0.6, -s * 0.5], [0, s * 0.3], [-s * 0.6, -s * 0.5]]));
        } else if (kind === 'cross') {
          fill(ctx, col, (c) => { poly(c, [[-s * 0.8, -s * 0.18], [s * 0.8, -s * 0.18], [s * 0.8, s * 0.18], [-s * 0.8, s * 0.18]]); poly(c, [[-s * 0.18, -s * 0.8], [s * 0.18, -s * 0.8], [s * 0.18, s * 0.8], [-s * 0.18, s * 0.8]]); });
          fill(ctx, col2, (c) => ellipse(c, 0, 0, s * 0.22, s * 0.22));
        } else if (kind === 'scroll') {
          stroke(ctx, col, s * 0.2, (c) => { c.arc(0, 0, s * 0.6, Math.PI * 0.1, Math.PI * 1.7); });
          stroke(ctx, col2, s * 0.14, (c) => { c.arc(s * 0.15, 0, s * 0.28, Math.PI, Math.PI * 2.7); });
        } else if (kind === 'scale') {
          fill(ctx, col, (c) => { c.arc(0, 0, s * 0.8, Math.PI, 0); c.closePath(); });
          fill(ctx, spec.bg, (c) => { c.arc(0, -s * 0.12, s * 0.55, Math.PI, 0); c.closePath(); });
        } else if (kind === 'eye') {
          fill(ctx, col, (c) => ellipse(c, 0, 0, s * 0.9, s * 0.55));
          fill(ctx, col2, (c) => ellipse(c, s * 0.1, 0, s * 0.5, s * 0.32));
          fill(ctx, spec.bg, (c) => ellipse(c, s * 0.18, 0, s * 0.2, s * 0.16));
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // The heart.
  fill(ctx, pal[0], (c) => ellipse(c, 0, 0, R * 0.09, R * 0.09));
  fill(ctx, spec.bg, (c) => ellipse(c, 0, 0, R * 0.045, R * 0.045));
  void r;
}

/** A cut-paper window frame (窗花) with a scalloped round opening. */
export function windowFrame(R, color, seed = 1) {
  const r = rng(seed);
  const lobes = 8 + Math.floor(r() * 3) * 4;
  const hole = R * 0.62;
  return card({
    bounds: [-R * 1.6, -R * 1.6, R * 1.6, R * 1.6],
    px: 140,
    bevel: 1,
    draw: (ctx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(-R * 1.6, -R * 1.6, R * 3.2, R * 3.2);
      // The opening, scalloped; holes punched round it.
      for (let i = 0; i <= lobes * 8; i++) {
        const a = (i / (lobes * 8)) * TAU;
        const rr = hole * (1 + 0.06 * Math.abs(Math.sin((a * lobes) / 2)));
        if (i === 0) ctx.moveTo(rr, 0);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      for (let i = 0; i < lobes; i++) {
        const a = ((i + 0.5) / lobes) * TAU;
        const d = hole * 1.2;
        ctx.moveTo(Math.cos(a) * d + R * 0.05, Math.sin(a) * d);
        ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * 0.05, R * 0.05, 0, 0, TAU, true);
      }
      ctx.fill('evenodd');
    },
  });
}

export { cloud };
