// Shot 04 · 黔东南 · 西双版纳 · 成都
// The rain becomes a waterfall of paper strips; behind it a Miao girl leaps,
// silver horns flashing. The silk brushes her crown and time stretches (speed
// ramp) while the silver swings — a fourth silk slips from the crown's chains.
// The silks run into a phoenix-tail bamboo grove and circle a Dai girl in her
// peacock dance (a fifth silk from her hand), then skim past a panda who drops
// his bamboo to bat at them, and shoot for the sky.

import * as THREE from 'three';
import { at, BEAT, clamp, lerp, ease, prog, catmull, TAU, rng } from '../core.js';
import { makePerson, pose, PEOPLE } from '../art/people.js';
import { groundSheet, skyDome, cloud, ridge, stand, karst } from '../art/set.js';
import { card } from '../engine/paper.js';
import { buildPuppet } from '../engine/puppet.js';
import { Ribbon } from '../engine/silk.js';
import { handWorld } from '../engine/fk.js';
import { chase } from '../engine/chase.js';
import { fill, poly, smooth, stroke, ellipse } from '../art/draw.js';

export const T0 = at(8) - 0.18;
export const CUT = at(10) - 0.12;
// Speed ramp: story time slows while the silk passes the silver crown.
const RAMP0 = at(8, 1);
const RAMP1 = at(8, 2, 2);
export function storyTime(t) {
  // Integral of a speed curve dipping to 0.22 between RAMP0 and RAMP1.
  const n = 400;
  let acc = T0;
  const dt = (t - T0) / n;
  for (let i = 0; i < n; i++) {
    const tt = T0 + (i + 0.5) * dt;
    const u = clamp((tt - RAMP0) / (RAMP1 - RAMP0));
    const speed = tt < RAMP0 || tt > RAMP1 ? 1 : 1 - 0.78 * Math.sin(Math.PI * u) ** 0.6;
    acc += speed * dt;
  }
  return acc;
}

function bambooStalk(h, seed) {
  const r = rng(seed);
  return card({
    bounds: [-0.9, 0, 0.9, h + 0.9],
    px: 160,
    draw: (ctx) => {
      fill(ctx, '#4d8b3c', (c) => poly(c, [[-0.05, 0], [-0.035, h], [0.035, h], [0.05, 0]]));
      for (let y = 0.5; y < h; y += 0.45 + r() * 0.15) fill(ctx, '#2f6a35', (c) => poly(c, [[-0.06, y], [0.06, y], [0.06, y + 0.04], [-0.06, y + 0.04]]));
      // Phoenix-tail fronds: arching sprays of narrow leaves near the top.
      for (let k = 0; k < 9; k++) {
        const y0 = h * (0.45 + 0.55 * (k / 9));
        const dir = k % 2 ? 1 : -1;
        const len = 0.5 + r() * 0.35;
        for (let l = 0; l < 6; l++) {
          const u = l / 6;
          const x0 = dir * len * u;
          const yy = y0 + 0.25 * Math.sin(Math.PI * u) - 0.35 * u * u;
          fill(ctx, l % 2 ? '#5d9b44' : '#3f7d3a', (c) => {
            c.moveTo(x0, yy);
            c.quadraticCurveTo(x0 + dir * 0.12, yy - 0.05, x0 + dir * 0.22, yy - 0.28);
            c.quadraticCurveTo(x0 + dir * 0.04, yy - 0.08, x0, yy);
          });
        }
      }
    },
  });
}

function makePanda() {
  const B = '#1a1614';
  const W = '#f4f0e8';
  const parts = [
    { name: 'body', pin: [0, 0.0], z: 0, bounds: [-0.6, -0.05, 0.6, 1.1], draw: (ctx) => {
      fill(ctx, W, (c) => smooth(c, [[-0.5, 0.05], [-0.55, 0.5], [-0.35, 0.95], [0, 1.05], [0.35, 0.95], [0.55, 0.5], [0.5, 0.05]], true, 0.4));
      fill(ctx, B, (c) => smooth(c, [[-0.52, 0.15], [-0.6, 0.0], [-0.2, -0.02], [-0.18, 0.2]], true, 0.4));
      fill(ctx, B, (c) => smooth(c, [[0.52, 0.15], [0.6, 0.0], [0.2, -0.02], [0.18, 0.2]], true, 0.4));
      fill(ctx, B, (c) => smooth(c, [[-0.5, 0.95], [-0.2, 1.05], [0.2, 1.05], [0.5, 0.95], [0.35, 0.8], [-0.35, 0.8]], true, 0.4));
      fill(ctx, '#3a302b', (c) => ellipse(c, -0.3, 0.07, 0.1, 0.06));
      fill(ctx, '#3a302b', (c) => ellipse(c, 0.3, 0.07, 0.1, 0.06));
    } },
    { name: 'head', parent: 'body', pin: [0, 1.0], z: 0.01, bounds: [-0.42, -0.05, 0.42, 0.62], draw: (ctx) => {
      fill(ctx, B, (c) => ellipse(c, -0.28, 0.5, 0.11, 0.11));
      fill(ctx, B, (c) => ellipse(c, 0.28, 0.5, 0.11, 0.11));
      fill(ctx, W, (c) => ellipse(c, 0, 0.25, 0.36, 0.29));
      fill(ctx, B, (c) => ellipse(c, -0.13, 0.28, 0.085, 0.11, -0.5));
      fill(ctx, B, (c) => ellipse(c, 0.13, 0.28, 0.085, 0.11, 0.5));
      fill(ctx, '#fff', (c) => ellipse(c, -0.12, 0.3, 0.025, 0.025));
      fill(ctx, '#fff', (c) => ellipse(c, 0.12, 0.3, 0.025, 0.025));
      fill(ctx, B, (c) => ellipse(c, 0, 0.17, 0.05, 0.035));
      stroke(ctx, B, 0.012, (c) => {
        c.moveTo(-0.05, 0.1);
        c.quadraticCurveTo(0, 0.07, 0.05, 0.1);
      });
    } },
    { name: 'armA', parent: 'body', pin: [-0.35, 0.8], z: 0.02, bounds: [-0.14, -0.55, 0.14, 0.1], draw: (ctx) => fill(ctx, B, (c) => smooth(c, [[-0.12, 0.08], [0.12, 0.08], [0.1, -0.45], [0, -0.53], [-0.1, -0.45]], true, 0.4)) },
    { name: 'armB', parent: 'body', pin: [0.35, 0.8], z: 0.02, bounds: [-0.14, -0.55, 0.14, 0.1], draw: (ctx) => fill(ctx, B, (c) => smooth(c, [[-0.12, 0.08], [0.12, 0.08], [0.1, -0.45], [0, -0.53], [-0.1, -0.45]], true, 0.4)) },
    { name: 'bamboo', parent: 'armA', pin: [0, -0.45], z: 0.01, bounds: [-0.04, -0.2, 0.5, 0.7], draw: (ctx) => {
      fill(ctx, '#6aa84f', (c) => poly(c, [[-0.02, -0.15], [0.02, -0.15], [0.3, 0.65], [0.26, 0.66]]));
      fill(ctx, '#4d8b3c', (c) => ellipse(c, 0.35, 0.55, 0.12, 0.04, 0.8));
    } },
  ];
  return buildPuppet(parts, { back: '#efe8dc', px: 500 });
}

export function createSouth(env) {
  const g = new THREE.Group();
  const r = rng(404);
  g.add(skyDome('#b4cfc4', 900, 0.4));
  g.add(groundSheet(400, 200, (ctx) => {
    ctx.fillStyle = '#6d9a58';
    ctx.fillRect(-200, -100, 400, 200);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = r() < 0.5 ? '#7fae63' : '#5c8a4a';
      ctx.beginPath();
      ctx.ellipse(-200 + r() * 400, -100 + r() * 200, 1 + r() * 3, 0.5 + r(), r() * 3, 0, TAU);
      ctx.fill();
    }
  }, 5));
  for (const [z, h, col, seed] of [[-30, 22, '#4f7f5a', 1], [-70, 34, '#6d9a80', 2], [-130, 46, '#93b6a4', 3], [-210, 58, '#b1cbbe', 4]]) {
    const k = karst(seed, 9, 360, h, col);
    k.position.set(20, 0, z);
    g.add(k);
  }
  // Pool and waterfall at x ≈ 0.
  const pool = groundSheet(14, 8, (ctx) => {
    fill(ctx, '#2c8c8c', (c) => ellipse(c, 0, 0, 6.8, 3.8));
    fill(ctx, '#3fa6a0', (c) => ellipse(c, -0.6, 0.3, 5.4, 2.8));
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.05;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(0.8, -0.5, k * 0.9, k * 0.45, 0, 0, TAU);
      ctx.stroke();
    }
  }, 60, { roughness: 0.3 });
  pool.position.set(0, 0.012, -4.5);
  g.add(pool);
  const cliff = card({ bounds: [-8, 0, 8, 10], px: 30, draw: (ctx) => {
    fill(ctx, '#56675c', (c) => smooth(c, [[-8, 0], [-7, 6], [-4, 9.5], [0, 10], [4, 9.3], [7.5, 6.5], [8, 0]], true, 0.3));
    fill(ctx, '#3f4f46', (c) => poly(c, [[-2.4, 0], [-2.2, 9.4], [2.2, 9.4], [2.4, 0]]));
    for (let i = 0; i < 30; i++) fill(ctx, '#6a7d6f', (c) => ellipse(c, -7 + r() * 14, r() * 9, 0.3 + r() * 0.6, 0.2 + r() * 0.3));
  } });
  cliff.position.set(0, 0, -8.8);
  g.add(cliff);
  // Waterfall: translucent strips sliding down (and the rain we arrive through).
  const fallProto = card({ bounds: [-0.05, -0.8, 0.05, 0.8], px: 160, glowThrough: 0.6, cast: false, draw: (ctx) => fill(ctx, '#eef6f6', (c) => poly(c, [[-0.05, -0.8], [0.05, -0.8], [0.05, 0.8], [-0.05, 0.8]])) });
  const falls = [];
  for (let i = 0; i < 260; i++) {
    const m = fallProto.clone();
    g.add(m);
    falls.push({ m, x: -2.1 + r() * 4.2, y: r(), z: -8.4 + r() * 0.5, v: 0.9 + r() * 0.5 });
  }
  const rain = [];
  for (let i = 0; i < 420; i++) {
    const m = fallProto.clone();
    m.scale.set(0.3, 1.4, 1);
    g.add(m);
    rain.push({ m, x: r(), y: r(), z: r(), v: 0.8 + r() * 0.6 });
  }
  for (let i = 0; i < 12; i++) {
    const rock = card({ bounds: [-0.6, 0, 0.6, 0.7], px: 120, draw: (ctx) => fill(ctx, i % 2 ? '#56675c' : '#6a7d6f', (c) => smooth(c, [[-0.55, 0], [-0.45, 0.45], [0, 0.62], [0.4, 0.5], [0.58, 0]], true, 0.4)) });
    rock.position.set(-6 + r() * 12, 0, -1.5 - r() * 6);
    rock.scale.setScalar(0.6 + r());
    g.add(rock);
  }
  // Bamboo grove from x ≈ 12 to 40.
  const stalks = [];
  for (let i = 0; i < 46; i++) {
    const s = bambooStalk(5 + r() * 3, 600 + i);
    s.position.set(9 + r() * 34, 0, -3 - r() * 9);
    s.rotation.y = (r() - 0.5) * 0.5;
    g.add(s);
    stalks.push({ s, ph: r() * TAU });
  }
  for (let i = 0; i < 14; i++) {
    const s = bambooStalk(5 + r() * 2, 700 + i);
    s.position.set(9 + r() * 34, 0, 2.5 + r() * 2.5);
    g.add(s);
    stalks.push({ s, ph: r() * TAU });
  }
  // Dai bamboo house.
  const house = card({ bounds: [-3.4, 0, 3.4, 5.4], px: 90, draw: (ctx) => {
    for (const x of [-2.6, -1, 1, 2.6]) fill(ctx, '#8a6a3a', (c) => poly(c, [[x - 0.08, 0], [x - 0.08, 1.6], [x + 0.08, 1.6], [x + 0.08, 0]]));
    fill(ctx, '#c9a66b', (c) => poly(c, [[-2.9, 1.6], [-2.9, 3.0], [2.9, 3.0], [2.9, 1.6]]));
    for (let x = -2.8; x < 2.9; x += 0.18) stroke(ctx, 'rgba(90,60,30,0.4)', 0.02, (c) => {
      c.moveTo(x, 1.6);
      c.lineTo(x, 3.0);
    });
    fill(ctx, '#6b4a2b', (c) => poly(c, [[-3.4, 2.8], [-1.2, 5.3], [1.2, 5.3], [3.4, 2.8], [2.6, 3.2], [-2.6, 3.2]]));
    fill(ctx, '#e9c46a', (c) => poly(c, [[-0.2, 5.3], [0, 5.5], [0.2, 5.3]]));
  } });
  house.position.set(27, 0, -12);
  g.add(house);

  // People.
  const miao = makePerson({ ...PEOPLE.miaoGirl(), detail: 1200 });
  miao.root.position.set(1.4, 0, -2.6);
  g.add(miao.root);
  const dai = makePerson({ ...PEOPLE.daiGirl(), detail: 1100 });
  dai.root.position.set(20, 0, -1.6);
  g.add(dai.root);
  const panda = makePanda();
  panda.root.position.set(34.5, 0, -1.4);
  g.add(panda.root);

  // ── Silks: five by the end ────────────────────────────────────────────────
  // Head of the lead silk, in story time (s).
  const lead = [[-6, 3.0, 2.5], [-2.5, 2.3, -1.2], [1.1, 2.45, -2.45], [4.5, 2.2, -1.5], [9, 1.9, 0.2], [14, 1.7, 1.2], [18.2, 1.5, 0.4], [20.0, 1.9, -3.0], [21.8, 1.5, -1.4], [20.8, 1.2, 0.3], [24, 1.5, 0.5], [30, 1.3, 0.8], [34.3, 1.35, -0.6], [37, 2.4, 0.2], [40, 7, -1], [42, 14, -3]];
  const leadT = [T0, 13.25, 13.62, 13.95, 14.2, 14.45, 14.7, 14.92, 15.12, 15.3, 15.55, 15.9, 16.12, 16.35, 16.6, 16.9];
  const along = (pts, ts) => (s) => {
    let i = 0;
    while (i < ts.length - 2 && s > ts[i + 1]) i++;
    const u = (i + clamp((s - ts[i]) / (ts[i + 1] - ts[i]))) / (ts.length - 1);
    return catmull(pts, u);
  };
  const leadAt = along(lead, leadT);
  const ST = [];
  // Precompute story time for the trail's past samples.
  const stTable = new Float64Array(1601);
  const t0 = T0 - 3;
  for (let i = 0; i <= 1600; i++) stTable[i] = storyTime(Math.max(T0, t0 + (i / 1600) * (CUT - t0 + 0.2))) - Math.max(0, T0 - (t0 + (i / 1600) * (CUT - t0 + 0.2)));
  const st = (t) => {
    const f = ((t - t0) / (CUT - t0 + 0.2)) * 1600;
    const i = Math.max(0, Math.min(1599, Math.floor(f)));
    return stTable[i] + (stTable[i + 1] - stTable[i]) * (f - i);
  };
  void ST;
  const head = (k, lag, off) => (t) => {
    const s = st(t) - lag;
    const p = leadAt(s);
    return [p[0] + off[0] * Math.sin(s * 3 + k), p[1] + off[1] + 0.12 * Math.sin(s * 4.1 + k), p[2] + off[2]];
  };
  const opts = { segments: 200, history: 4, wave: { amp: 0.2, len: 2.6, freq: 1.4 }, twist: { perLen: 0.6, amp: 1.0, len: 3.0, freq: 1.0 } };
  const silks = [
    new Ribbon({ head: head(0, 0, [0.1, 0, 0]), length: 8, width: 0.15, ...opts }),
    new Ribbon({ head: head(1, 0.07, [0.25, -0.3, 0.35]), length: 7, width: 0.14, ...opts }),
    new Ribbon({ head: head(2, 0.12, [0.3, 0.32, -0.3]), length: 7, width: 0.14, ...opts }),
  ];
  // Silk 4 slips from the Miao crown; silk 5 from the Dai girl's hand.
  const crownAt = (t) => {
    const p = miao.root.position;
    return [p.x + 0.12, p.y + 1.85 + miaoHop(t), p.z + 0.05];
  };
  const born4 = 13.62;
  const born5 = 15.15;
  const s4 = head(3, 0.18, [0.35, -0.55, 0.2]);
  const s5 = head(4, 0.22, [0.3, 0.55, 0.3]);
  silks.push(new Ribbon({ head: (t) => { const k = prog(st(t), born4, born4 + 0.3, ease.inOutCubic); const c = crownAt(Math.min(t, born4 + 0.3)); const f = s4(t); return c.map((v, i) => lerp(v, f[i], k)); }, born: born4, length: 6.5, width: 0.14, ...opts }));
  const daiHand = (t) => handWorld(daiPose(t), 'B', [dai.root.position.x, 0, dai.root.position.z]);
  silks.push(new Ribbon({ head: (t) => { const k = prog(st(t), born5, born5 + 0.3, ease.inOutCubic); const c = daiHand(Math.min(t, born5 + 0.3)); const f = s5(t); return c.map((v, i) => lerp(v, f[i], k)); }, born: born5, length: 6.5, width: 0.14, ...opts }));
  for (const s of silks) g.add(s.mesh);

  function miaoHop(t) {
    const s = st(t);
    const ph = ((s - T0) / (2 * BEAT)) % 1;
    return 0.28 * Math.sin(Math.PI * ph) ** 1.5;
  }
  function daiPose(t) {
    const s = st(t);
    const w = Math.sin((TAU * s) / (4 * BEAT));
    return { raiseA: 2.3, elbowA: 1.6 + 0.2 * w, wristA: -1.3, raiseB: 0.9 + 0.3 * w, elbowB: -0.6, wristB: 1.2, lean: 0.12 * w, head: -0.12 * w, neckSlide: 0.015 * w, hipX: 0.05 * w, skirtSwing: 0.04 * w, turn: 0.25 };
  }

  const cam = env.camera;
  const target = new THREE.Vector3();
  const lead0 = head(0, 0, [0.1, 0, 0]);

  function update(t) {
    const s = st(t);
    // Miao: leaping; the crown shivers most in the slow motion.
    const hop = miaoHop(t);
    miao.root.position.y = hop;
    const ph = ((s - T0) / (2 * BEAT)) % 1;
    pose(miao, { raiseA: 1.6 + 0.6 * Math.sin(Math.PI * ph), raiseB: 1.6 + 0.6 * Math.sin(Math.PI * ph), elbowA: 0.6, elbowB: 0.6, skirtFlare: 0.2 * Math.sin(Math.PI * ph), thighA: 0.3 * Math.sin(Math.PI * ph), thighB: -0.3 * Math.sin(Math.PI * ph), kneeA: -0.5 * Math.sin(Math.PI * ph), kneeB: -0.2, head: 0.05 * Math.sin(s * 9) * prog(s, RAMP0, RAMP0 + 0.1), turn: -0.15 });
    if (miao.j.hat) miao.j.hat.rotation.z = 0.06 * Math.sin(s * 14) * Math.exp(-Math.max(0, s - 13.6) * 2) * prog(s, 13.5, 13.62);
    pose(dai, daiPose(t));
    // Panda: chewing, then drops the bamboo and bats at the silk.
    const bat = prog(s, 15.85, 16.05, ease.outBack) * (1 - prog(s, 16.3, 16.6));
    panda.j.armB.rotation.z = lerp(0.2, 2.3, bat) + 0.3 * Math.sin(s * 12) * bat;
    panda.j.armA.rotation.z = -0.8 + 0.1 * Math.sin(s * 5) - 0.6 * prog(s, 15.8, 16.0);
    panda.j.head.rotation.z = 0.05 * Math.sin(s * 3) + 0.15 * bat;
    panda.j.body.rotation.z = -0.05 * bat;
    for (const x of silks) x.update(t);
    for (const st0 of stalks) st0.s.rotation.z = 0.02 * Math.sin(s * 1.5 + st0.ph) + 0.05 * Math.exp(-Math.abs(st0.s.position.x - lead0(t)[0]) * 0.6);
    for (const f of falls) {
      const y = ((f.y - s * 0.9 * f.v) % 1 + 1) % 1;
      f.m.position.set(f.x, 0.5 + y * 9, f.z);
    }
    // Camera: through the rain, the waterfall pool, a slow-motion push on the
    // crown, tracking into the bamboo, a spin round the Dai girl, the panda.
    const h = lead0(t);
    const keysPos = [[-4.5, 2.2, 6.5], [-1.2, 2.1, 3.6], [0.4, 2.35, 0.2], [3.2, 2.1, 2.8], [10, 1.7, 5.2], [16.5, 1.6, 4.2], [20.8, 1.7, 3.2], [23.5, 1.6, 2.6], [31, 1.4, 3.6], [34.8, 1.5, 2.7], [38, 2.2, 5.0], [41, 5, 7]];
    const keysT = [T0, 13.25, 13.62, 13.95, 14.4, 14.75, 15.1, 15.45, 15.85, 16.1, 16.45, 16.9];
    const pos = along(keysPos, keysT)(s);
    const lookK = [[0, 2.2, -4], [1.2, 2.2, -2.5], [1.3, 2.3, -2.6], [3.5, 1.8, -1], [14, 1.6, -1], [19.6, 1.5, -1.6], [20, 1.5, -1.6], [22, 1.4, -1], [33, 1.3, -1.2], [34.5, 1.2, -1.4], [40, 5, -2], [42, 12, -3]];
    const look = along(lookK, keysT)(s).map((v, i) => lerp(v, h[i], 0.35));
    cam.position.set(...pos);
    target.set(...look);
    cam.lookAt(target);
    cam.fov = 40;
    cam.near = 0.03;
    cam.updateProjectionMatrix();
    const slow = s > RAMP0 && s < RAMP1 + 0.2;
    cam.userData.dof = { focus: Math.max(0.5, cam.position.distanceTo(target)), aperture: slow ? 0.018 : 0.008, maxBlur: 20 };
    // Rain at the start, in front of the lens.
    const rainOn = 1 - prog(t, T0, 13.4, ease.inCubic);
    for (const q of rain) {
      q.m.visible = q.z < rainOn;
      if (!q.m.visible) continue;
      const y = ((q.y - t * 1.6 * q.v) % 1 + 1) % 1;
      q.m.position.set(pos[0] - 3 + q.x * 6, pos[1] - 2 + y * 4.5, pos[2] - 0.5 - q.z * 4);
    }
    env.light({
      sun: [-3, 8, 5],
      sunColor: '#fff6e6',
      sunIntensity: 2.6,
      hemiSky: '#dcece6',
      hemiGround: '#6d8a5c',
      hemiIntensity: 1.45,
      bg: '#b4cfc4',
      fog: ['#c3d8cf', 25, 260],
      shadowCenter: [pos[0] + 2, 1, -2],
      shadowSize: 12,
      exposure: 1.02,
    });
  }
  return { group: g, update, start: T0, end: CUT, silks };
}
