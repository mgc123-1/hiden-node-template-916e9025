// Shot 02 · 圣湖 · 藏族
// Out of the cloud, the silk dives on a turquoise lake under folded-paper
// snow peaks, threads a line of prayer flags (they snap and flutter as it
// passes), and slides through a dancer's open hands. She answers with a flick
// of her long sleeve: a second silk. Both ride the wind up the ridge and sweep
// across the lens.

import * as THREE from 'three';
import { at, BEAT, clamp, lerp, ease, prog, catmull, TAU, rng } from '../core.js';
import { makePerson, pose, PEOPLE } from '../art/people.js';
import { groundSheet, skyDome, cloud, ridge, stand } from '../art/set.js';
import { card } from '../engine/paper.js';
import { Ribbon } from '../engine/silk.js';
import { handWorld } from '../engine/fk.js';
import { chase } from '../engine/chase.js';
import { fill, poly, stroke, band, ellipse } from '../art/draw.js';

export const T0 = at(4) - 0.2;
export const TOUCH = at(5);
export const CUT = at(6) - 0.1;

/** Folded-paper peaks: a lit face and a shade face per peak, snow on top. */
function peaks(list, base, cols, px = 6) {
  // list: [[x, height, halfWidth], ...]
  const x0 = Math.min(...list.map(([x, , w]) => x - w)) - 5;
  const x1 = Math.max(...list.map(([x, , w]) => x + w)) + 5;
  const y1 = Math.max(...list.map(([, h]) => h));
  return card({
    bounds: [x0, base, x1, y1 + 1],
    px,
    bevel: 0.8,
    draw: (ctx) => {
      for (const [x, h, w] of list) {
        fill(ctx, cols.shade, (c) => poly(c, [[x - w, base], [x, h], [x + w, base]]));
        fill(ctx, cols.lit, (c) => poly(c, [[x - w, base], [x, h], [x + w * 0.12, base]]));
        // Snow cap with a torn lower edge.
        const sh = h - (h - base) * 0.34;
        const r = rng(Math.round(x * 13 + h));
        const pts = [[x, h]];
        const n = 7;
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          const xx = lerp(x + w * 0.34 * ((h - sh) / (h - base)) * 2.2, x - w * 0.34 * ((h - sh) / (h - base)) * 2.2, u);
          pts.push([xx, sh + (i % 2 ? (h - base) * 0.06 : -(h - base) * 0.02) * (0.6 + r())]);
        }
        fill(ctx, cols.snowShade, (c) => poly(c, pts));
        clipTo(ctx, pts, x, w, h, base, () => fill(ctx, cols.snow, (c) => poly(c, [[x - w, base], [x, h], [x + w * 0.12, base]])));
      }
    },
  });
}
function clipTo(ctx, pts, x, w, h, base, fn) {
  ctx.save();
  ctx.beginPath();
  poly(ctx, pts);
  ctx.clip();
  fn();
  ctx.restore();
}

/** A massif of folded paper: ridge line with shoulders, each facet lit or shaded
 *  by which way it faces the sun, snow on the upper facets. */
function massif(seed, width, height, cols, px = 5) {
  const r = rng(seed);
  // Ridge vertices.
  const ridgePts = [[-width / 2, 0]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const env = Math.sin(Math.PI * u) ** 0.7;
    ridgePts.push([-width / 2 + width * u + (r() - 0.5) * width * 0.04, height * env * (0.55 + 0.45 * (i % 2 ? 1 : r() * 0.7))]);
  }
  ridgePts.push([width / 2, 0]);
  const top = Math.max(...ridgePts.map((p) => p[1]));
  return card({
    bounds: [-width / 2, 0, width / 2, top + 1],
    px,
    bevel: 0.6,
    draw: (ctx) => {
      fill(ctx, cols.shade, (c) => poly(c, ridgePts));
      // Facets: from each ridge vertex a fold line runs down to the base; the
      // facet left of a peak faces the sun.
      for (let i = 1; i < ridgePts.length - 1; i++) {
        const [x, y] = ridgePts[i];
        const [px0, py0] = ridgePts[i - 1];
        const up = y > py0;
        const foot = [x - y * (0.35 + r() * 0.25), 0];
        if (up) fill(ctx, cols.lit, (c) => poly(c, [[px0, py0], [x, y], foot, [px0 - py0 * 0.4, 0]]));
        // Snow on the high facets.
        const snowLine = top * 0.52;
        if (y > snowLine) {
          const pts = [[x, y]];
          const k = 6;
          for (let j = 0; j <= k; j++) {
            const u = j / k;
            const sx = lerp(x - (y - snowLine) * 0.75, x + (y - snowLine) * 0.6, u);
            pts.push([sx, snowLine + (j % 2 ? (y - snowLine) * 0.22 : -(y - snowLine) * 0.08) * (0.6 + r())]);
          }
          fill(ctx, up ? cols.snow : cols.snowShade, (c) => poly(c, pts));
          fill(ctx, cols.snowShade, (c) => poly(c, [[x, y], pts[pts.length - 1], [x + (y - snowLine) * 0.15, snowLine + (y - snowLine) * 0.3]]));
        }
      }
    },
  });
}

function tibetanHouse(w = 7, h = 4.2) {
  return card({
    bounds: [-w / 2 - 0.3, 0, w / 2 + 0.3, h + 0.2],
    px: 120,
    draw: (ctx) => {
      // Battered white walls, slightly narrower at the top.
      fill(ctx, '#f4efe4', (c) => poly(c, [[-w / 2, 0], [-w / 2 + 0.25, h], [w / 2 - 0.25, h], [w / 2, 0]]));
      // 边玛 parapet band.
      fill(ctx, '#7a2e24', (c) => poly(c, [[-w / 2 + 0.22, h - 0.55], [-w / 2 + 0.25, h], [w / 2 - 0.25, h], [w / 2 - 0.22, h - 0.55]]));
      for (let x = -w / 2 + 0.6; x < w / 2 - 0.4; x += 0.7) fill(ctx, '#e9c46a', (c) => ellipse(c, x, h - 0.28, 0.1, 0.1));
      // Windows: black trapezoid frames, coloured lintels.
      for (const [wx, wy] of [[-2.1, 1.1], [0, 1.1], [2.1, 1.1], [-2.1, 2.5], [2.1, 2.5]]) {
        fill(ctx, '#161616', (c) => poly(c, [[wx - 0.55, wy - 0.1], [wx - 0.42, wy + 0.95], [wx + 0.42, wy + 0.95], [wx + 0.55, wy - 0.1]]));
        fill(ctx, '#5b3a1e', (c) => poly(c, [[wx - 0.3, wy + 0.05], [wx - 0.3, wy + 0.8], [wx + 0.3, wy + 0.8], [wx + 0.3, wy + 0.05]]));
        band(ctx, wx - 0.6, wx + 0.6, wy + 1.05, 0.12, '#1d6fa3', '#e63946', 'diamond', '#f4d35e');
        for (let k = -2; k <= 2; k++) fill(ctx, k % 2 ? '#e63946' : '#2a9d8f', (c) => poly(c, [[wx + k * 0.12 - 0.05, wy + 1.12], [wx + k * 0.12 + 0.05, wy + 1.12], [wx + k * 0.12, wy + 1.28]]));
      }
      // Door.
      fill(ctx, '#161616', (c) => poly(c, [[-0.7, 0], [-0.6, 2.1], [0.6, 2.1], [0.7, 0]]));
      fill(ctx, '#b3261e', (c) => poly(c, [[-0.5, 0], [-0.5, 1.9], [0.5, 1.9], [0.5, 0]]));
      stroke(ctx, '#e9c46a', 0.05, (c) => {
        c.moveTo(0, 0);
        c.lineTo(0, 1.9);
      });
    },
  });
}

const FLAG_COLS = ['#1d4ed8', '#f8fafc', '#dc2626', '#16a34a', '#facc15'];

/** A line of prayer flags on a sagging string. Each flag is its own card so it can flutter. */
function flagLine(a, b, n, seed) {
  const g = new THREE.Group();
  const flags = [];
  const protos = FLAG_COLS.map((col) =>
    card({
      bounds: [-0.16, -0.36, 0.16, 0.0],
      px: 260,
      back: col,
      seg: [2, 3],
      draw: (ctx) => {
        fill(ctx, col, (c) => poly(c, [[-0.16, 0], [0.16, 0], [0.16, -0.36], [-0.16, -0.36]]));
        // Printed wind-horse, faintly.
        stroke(ctx, col === '#f8fafc' ? 'rgba(40,40,40,0.35)' : 'rgba(255,255,255,0.35)', 0.012, (c) => {
          c.moveTo(-0.08, -0.22);
          c.quadraticCurveTo(0, -0.12, 0.08, -0.22);
          c.moveTo(-0.06, -0.26);
          c.lineTo(0.06, -0.26);
        });
      },
    }),
  );
  const r = rng(seed);
  const sag = 0.18 * Math.hypot(b[0] - a[0], b[2] - a[2]) * 0.12 + 0.3;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u)];
    const f = protos[i % 5].clone();
    f.position.set(...p);
    f.rotation.y = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    g.add(f);
    flags.push({ f, p, ph: r() * TAU, base: f.rotation.y });
  }
  // The string.
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push(new THREE.Vector3(lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u)));
  }
  const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.008, 4), new THREE.MeshStandardMaterial({ color: '#d9cdb5', roughness: 1 }));
  g.add(line);
  return { g, flags };
}

function yak(seed) {
  return card({
    bounds: [-1.3, 0, 1.3, 1.6],
    px: 120,
    draw: (ctx) => {
      fill(ctx, '#1d1714', (c) => {
        c.moveTo(-1.1, 0.5);
        c.bezierCurveTo(-1.2, 1.2, -0.6, 1.45, 0.2, 1.4);
        c.bezierCurveTo(0.8, 1.45, 1.0, 1.2, 1.05, 0.95);
        c.lineTo(1.25, 0.8);
        c.lineTo(1.1, 0.6);
        c.lineTo(0.8, 0.55);
        c.lineTo(0.75, 0.0);
        c.lineTo(0.6, 0.0);
        c.lineTo(0.55, 0.35);
        c.lineTo(-0.6, 0.35);
        c.lineTo(-0.65, 0.0);
        c.lineTo(-0.8, 0.0);
        c.lineTo(-0.9, 0.3);
        c.closePath();
      });
      // Long skirt of hair.
      fill(ctx, '#2b221d', (c) => poly(c, [[-1.0, 0.55], [0.8, 0.6], [0.7, 0.25], [-0.9, 0.2]]));
      stroke(ctx, '#e8e0d0', 0.05, (c) => {
        c.moveTo(1.0, 1.1);
        c.quadraticCurveTo(1.15, 1.35, 0.95, 1.4);
      });
    },
  });
}

export function createTibet(env) {
  const g = new THREE.Group();
  const r = rng(202);
  g.add(skyDome('#355f9c', 900, 0.5));
  g.add(groundSheet(300, 300, (ctx) => {
    ctx.fillStyle = '#c7ae72';
    ctx.fillRect(-150, -150, 300, 300);
    ctx.fillStyle = '#9fa860';
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.ellipse(-150 + r() * 300, -150 + r() * 300, 3 + r() * 9, 1 + r() * 3, r() * 3, 0, TAU);
      ctx.fill();
    }
  }, 6));
  // The holy lake.
  const lake = groundSheet(200, 90, (ctx) => {
    ctx.fillStyle = '#1b9aa8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 100, 45, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#35b9c1';
    ctx.beginPath();
    ctx.ellipse(-8, 6, 82, 33, 0.05, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.25;
    for (let i = 0; i < 40; i++) {
      const x = -70 + r() * 140;
      const y = -30 + r() * 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3 + r() * 6, y);
      ctx.stroke();
    }
  }, 10, { roughness: 0.35 });
  lake.position.set(0, 0.01, 50);
  g.add(lake);
  // Mountains: a pale far wall, the great massif, a nearer shoulder of hills.
  const band = card({ bounds: [-700, 0, 700, 60], px: 1, bevel: 0, grain: 0.3, cast: false, receive: false, draw: (ctx) => fill(ctx, '#7fa3cf', (c) => poly(c, [[-700, 0], [-700, 60], [700, 60], [700, 0]])), material: { fog: false } });
  band.position.set(0, 0, -600);
  g.add(band);
  const colsFar = { lit: '#e6edf6', shade: '#a3b6d0', snow: '#ffffff', snowShade: '#dbe3ee' };
  const colsMid = { lit: '#f6f7f9', shade: '#8499b8', snow: '#ffffff', snowShade: '#c9d5e5' };
  for (const [x, z, w, h, sd, cols] of [[-160, -430, 300, 110, 11, colsFar], [150, -440, 320, 125, 12, colsFar], [-30, -260, 260, 118, 13, colsMid], [-190, -240, 180, 70, 14, colsMid], [170, -250, 200, 80, 15, colsMid]]) {
    const m = massif(sd, w, h, cols, 3);
    m.position.set(x, 0, z);
    g.add(m);
  }
  const near = ridge([[-120, 0], [-90, 10], [-60, 17], [-30, 12], [-5, 20], [20, 14], [50, 22], [80, 12], [120, 0]], 0, '#8c7a52', { px: 5 });
  near.position.set(0, 0, -80);
  g.add(near);
  for (let i = 0; i < 9; i++) {
    const c = cloud(30 + r() * 30, 8 + r() * 4, 700 + i, ['#ffffff', '#e8eef6']);
    c.position.set(-200 + i * 50 + r() * 20, 50 + r() * 40, -260 - r() * 60);
    g.add(c);
  }
  // Cloud we fall out of.
  for (let i = 0; i < 40; i++) {
    const c = cloud(10 + r() * 12, 3 + r() * 2.5, 760 + i, ['#ffffff', '#eef2f7', '#dfe6ef']);
    c.position.set(-6 + r() * 26, 36 + r() * 10, 48 + r() * 30);
    c.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.6, 0, r() * TAU);
    g.add(c);
  }
  const house = tibetanHouse();
  house.position.set(-7.5, 0, -8);
  house.rotation.y = 0.25;
  g.add(house);
  const house2 = tibetanHouse(5, 3.4);
  house2.position.set(8.5, 0, -12);
  house2.rotation.y = -0.3;
  g.add(house2);
  const lines = [
    flagLine([-5.4, 4.3, -7.2], [5.5, 3.8, -3], 26, 1),
    flagLine([-4.5, 3.2, 7], [5, 3.0, 13], 24, 2),
    flagLine([6.4, 3.4, -11], [12, 5.5, -26], 20, 3),
  ];
  for (const l of lines) g.add(l.g);
  for (const [x, z] of [[5.5, -3], [-4.5, 7], [5, 13]]) {
    const pole = stand([-0.04, 0, 0.04, 4.2], (ctx) => fill(ctx, '#6b4a2b', (c) => poly(c, [[-0.04, 0], [-0.04, 4.2], [0.04, 4.2], [0.04, 0]])), { px: 200 });
    pole.position.set(x, 0, z);
    g.add(pole);
  }
  for (const [x, z, s] of [[-24, -45, 1], [-18, -52, 0.9], [22, -48, 1.1]]) {
    const y = yak(x);
    y.position.set(x, 0, z);
    y.scale.setScalar(s);
    g.add(y);
  }

  // People: the dancer, and a guozhuang circle behind her.
  const girl = makePerson({ ...PEOPLE.tibetanGirl(), detail: 1300 });
  g.add(girl.root);
  const ring = [];
  const ringCols = [['#7a1f2b', '#f1e3c6'], ['#1d3557', '#f1faee'], ['#5b1a24', '#fcbf49'], ['#264653', '#e9c46a'], ['#6d2e46', '#f1e3c6']];
  for (let i = 0; i < 5; i++) {
    const [robe, sleeve] = ringCols[i];
    const p = makePerson(PEOPLE.tibetanGirl({ eyes: 'open', look: 0, top: { color: robe, robeCross: true, trim: '#2ec4b6', collar: sleeve }, sleeve: { color: sleeve, long: 0.22, cuff: '#2ec4b6' }, skirt: { kind: 'flare', color: robe, width: 0.33, length: 0.92, apron: i % 2 ? ['#d62828', '#f77f00', '#2a9d8f', '#fcbf49', '#264653'] : null }, detail: 420, necklace: 'turquoise' }));
    ring.push({ p, ph: (i / 5) * TAU });
    g.add(p.root);
  }

  // ── Silk ──────────────────────────────────────────────────────────────────
  const path1 = [[7, 44, 66], [4, 26, 48], [2, 9, 28], [-1.2, 2.2, 13], [-1.4, 1.55, 4.5], [0.05, 1.32, 0.3], [2.4, 2.0, -1.8], [4.2, 5.2, -8], [5.4, 11, -20], [3.5, 18.5, -34]];
  const times1 = [T0, 5.85, 6.25, 6.75, 7.2, TOUCH, 7.85, 8.3, 8.8, 9.35];
  const along = (pts, ts) => (t) => {
    let i = 0;
    while (i < ts.length - 2 && t > ts[i + 1]) i++;
    const u = (i + clamp((t - ts[i]) / (ts[i + 1] - ts[i]))) / (ts.length - 1);
    return catmull(pts, u);
  };
  const base1 = along(path1, times1);
  const head1 = (t) => {
    const p = base1(t);
    const w = Math.sin(t * 7.3) * 0.5 * (1 - prog(t, 6.9, 7.4) + prog(t, 7.7, 8.2));
    return [p[0] + w, p[1] + w * 0.25, p[2]];
  };
  const girlPose = (t) => {
    const step = Math.sin((Math.PI * t) / BEAT);
    const reach = prog(t, 7.0, 7.4, ease.inOutCubic) * (1 - prog(t, 7.75, 8.2, ease.inOutCubic));
    const flick = prog(t, TOUCH + 0.08, TOUCH + 0.22, ease.outQuart);
    const swing = Math.sin((TAU * t) / (2 * BEAT));
    return {
      raiseA: lerp(0.55 + 0.45 * swing, 1.05, reach),
      raiseB: lerp(lerp(0.55 - 0.45 * swing, 1.05, reach), 2.55, flick * (1 - prog(t, 8.2, 8.8))),
      elbowA: lerp(0.5, 0.25, reach),
      elbowB: lerp(0.5, 0.25, reach) - 0.3 * flick,
      wristA: lerp(0.2, -0.5, reach),
      wristB: lerp(0.2, -0.5, reach),
      head: lerp(0.05 * step, -0.1, reach),
      hipX: 0.035 * step * (1 - reach),
      hipY: -0.02 * Math.abs(step),
      lean: 0.03 * step,
      skirtFlare: 0.04 + 0.03 * Math.abs(step),
      turn: 0.1,
    };
  };
  const SLEEVE = 0.22;
  const hand2 = (t) => handWorld(girlPose(t), 'B', [0, 0, 0], 1, SLEEVE);
  const born2 = TOUCH + 0.12;
  const head2 = (t) => {
    // Out of the sleeve, then falls in beside the first silk.
    const k = prog(t, born2, born2 + 0.55, ease.inOutCubic);
    const h = hand2(Math.min(t, born2 + 0.12));
    const f = head1(t - 0.22);
    return [lerp(h[0], f[0] + 0.55, k), lerp(h[1], f[1] - 0.35, k), lerp(h[2], f[2] + 0.3, k)];
  };
  const silk1 = new Ribbon({ head: head1, length: 7.5, width: 0.15, segments: 220, history: 6, wave: { amp: 0.2, len: 2.6, freq: 1.3 }, twist: { perLen: 0.5, amp: 1.2, len: 3.2, freq: 0.9 } });
  const silk2 = new Ribbon({ head: head2, born: born2, length: 6.5, width: 0.14, segments: 200, history: 6, wave: { amp: 0.22, len: 2.2, freq: 1.5 }, twist: { perLen: 0.8, amp: 1.0, len: 2.8, freq: 1.1 } });
  g.add(silk1.mesh, silk2.mesh);

  // ── Camera ────────────────────────────────────────────────────────────────
  const cam = env.camera;
  const target = new THREE.Vector3();
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const bodyPt = (s, t) => {
    silk1.update(t);
    const i = Math.round((s / silk1.o.length) * silk1.o.segments);
    const p = silk1.pos;
    return [(p[i * 6] + p[i * 6 + 3]) / 2, (p[i * 6 + 1] + p[i * 6 + 4]) / 2, (p[i * 6 + 2] + p[i * 6 + 5]) / 2];
  };
  const cameraAt = (t) => {
    const h = head1(t);
    // Dive and skim: chase from behind and above.
    const dive = prog(t, T0, 6.8, ease.inOutCubic);
    const behindPos = chase(head1, t, lerp(3.4, 2.4, dive), lerp(1.4, 0.35, dive), 0.6);
    const touch = [0.55, 1.58, 2.05];
    const k = prog(t, 6.95, 7.3, ease.inOutCubic) * (1 - prog(t, 7.9, 8.3, ease.inOutCubic));
    let pos = behindPos.map((v, i) => lerp(v, touch[i], k));
    let look = h.map((v, i) => lerp(v, [0, 1.4, 0][i], k));
    // Rise with the pair up the ridge, then let the silk sweep the lens.
    if (t > 7.9) {

      const up = chase(head1, t, 3.2, -0.6, -1.2);
      const u = prog(t, 7.9, 8.4, ease.inOutCubic);
      pos = pos.map((v, i) => lerp(v, up[i], u));
      look = look.map((v, i) => lerp(v, h[i], u));
    }
    const wipe = prog(t, 9.0, 9.26, ease.inCubic);
    if (wipe > 0) {
      // Keep the heading; slide up to the silk until it fills the lens.
      const b = bodyPt(1.3, t);
      const d = look.map((v, i) => v - pos[i]);
      const dl = Math.hypot(...d) || 1;
      const into = b.map((v, i) => v - (d[i] / dl) * 0.16);
      const ahead = b.map((v, i) => v + (d[i] / dl) * 6);
      pos = pos.map((v, i) => lerp(v, into[i], wipe));
      look = look.map((v, i) => lerp(v, ahead[i], wipe));
    }
    const focus = k > 0.5 ? dist(pos, [0, 1.5, 0]) : dist(pos, h);
    return { pos, look: look.map((v, i) => lerp(v, [0, 1.48, 0][i], k * 0.4)), fov: lerp(46, 32, k), dof: { focus, aperture: lerp(0.005, 0.016, k), maxBlur: 18 } };
  };

  function update(t) {
    pose(girl, girlPose(t));
    ring.forEach((d, i) => {
      const a = d.ph + t * 0.55;
      d.p.root.position.set(Math.sin(a) * 2.6, 0, -4.2 + Math.cos(a) * 1.2);
      const step = Math.sin((Math.PI * t) / BEAT + i);
      const sw = Math.sin((TAU * t) / (2 * BEAT) + i);
      pose(d.p, { raiseA: 0.6 + 0.5 * sw, raiseB: 0.6 - 0.5 * sw, elbowA: 0.4, elbowB: 0.4, hipX: 0.03 * step, hipY: -0.02 * Math.abs(step), turn: 0.15 * Math.sin(a) });
    });
    silk1.update(t);
    silk2.update(t);
    // Flags flutter; hard when a silk passes close.
    const hs = [head1(t), silk2.mesh.visible ? head2(t) : null].filter(Boolean);
    for (const l of lines)
      for (const f of l.flags) {
        let near = 0;
        for (const h of hs) near = Math.max(near, Math.exp(-dist(h, f.p) / 1.5));
        const amp = 0.18 + 0.9 * near;
        f.f.rotation.y = f.base + amp * Math.sin(t * (6 + 8 * near) + f.ph);
        f.f.rotation.x = 0.25 * amp * Math.sin(t * 9 + f.ph * 2);
      }
    const c = cameraAt(t);
    cam.position.set(...c.pos);
    target.set(...c.look);
    cam.lookAt(target);
    cam.fov = c.fov;
    cam.near = 0.03;
    cam.updateProjectionMatrix();
    cam.userData.dof = c.dof;
    env.light({
      sun: [-4, 9, 6],
      sunColor: '#fff7ec',
      sunIntensity: 3.6,
      hemiSky: '#c9daf0',
      hemiGround: '#9a8660',
      hemiIntensity: 1.15,
      bg: '#3d6fae',
      fog: ['#a9c1dc', 60, 520],
      shadowCenter: [0, 1, 0],
      shadowSize: 14,
      exposure: 1.0,
    });
  }
  return { group: g, update, start: T0, end: CUT, silks: [silk1, silk2] };
}
