// Shot 06 · 天安门 · 同心结
//
// The curtain of silk slides off the lens and every thread flies for the sky
// over the Gate of Heavenly Peace, where the fifty-six weave, over and under,
// into a panchang knot — eight cords of seven. One beat of silence while the
// last loop closes in slow motion. On the downbeat the knot pulls tight and the
// gold-embroidered 77 is struck into its heart. The camera cranes down to the
// square: fifty-six people, arms up, the silk tails still in their hands — and
// the picture freezes into a family photograph.

import * as THREE from 'three';
import { at, BEAT, clamp, lerp, ease, prog, springKick, catmull, keys, TAU, rng } from '../core.js';
import { makePerson, clonePerson, pose, PEOPLE } from '../art/people.js';
import { skyDome, groundSheet } from '../art/set.js';
import { tiananmen, forecourt, xiangyun, medallion, tasselCap } from '../art/beijing-art.js';
import { card } from '../engine/paper.js';
import { Ribbon, silkMaterial } from '../engine/silk.js';
import { handWorld } from '../engine/fk.js';
import { fill, ellipse } from '../art/draw.js';

export const B0 = at(14);
export const SIL0 = at(14, 3);
export const HIT = at(15);
export const CHEER = at(15, 1);
export const FREEZE = at(16);
const FOV = 40;
const TANH = Math.tan(((FOV / 2) * Math.PI) / 180);
const ASP = 16 / 9;

/** Knot time: normal, then one slowed beat of silence, then normal again. */
export function knotTime(t) {
  if (t < SIL0) return t;
  const slow = 0.3;
  if (t < HIT) return SIL0 + (t - SIL0) * slow;
  return SIL0 + (HIT - SIL0) * slow + (t - HIT);
}

// ─── The panchang knot, as eight cords of centre-line points ────────────────
const S = 20;
const N = 4;
const D = (2 * S) / N;
const H0 = 0.9;
const C_ = [-15, -5, 5, 15];

function lineA(i, forward) {
  const pts = [];
  const c = C_[i];
  for (let k = 0; k <= 160; k++) {
    const f = k / 160;
    const w = forward ? -S + 2 * S * f : S - 2 * S * f;
    const kk = (w + S) / D - 0.5;
    pts.push([(c + w) / 2, (w - c) / 2, H0 * Math.cos(Math.PI * (kk + i))]);
  }
  return pts;
}
function lineB(j, forward) {
  const pts = [];
  const d = C_[j];
  for (let k = 0; k <= 160; k++) {
    const f = k / 160;
    const w = forward ? -S + 2 * S * f : S - 2 * S * f;
    const kk = (w + S) / D - 0.5;
    pts.push([(d + w) / 2, (d - w) / 2, H0 * Math.cos(Math.PI * (kk + j + 1))]);
  }
  return pts;
}
/** A U-turn outside the diamond from p0 to p1, bulging along n. */
function loop(p0, p1, n, ext = 1.6) {
  const pts = [];
  const e = [p0[0] - p1[0], p0[1] - p1[1]];
  const el = Math.hypot(e[0], e[1]);
  e[0] /= el;
  e[1] /= el;
  const rho = el / 2;
  const M = [(p0[0] + p1[0]) / 2 + n[0] * ext, (p0[1] + p1[1]) / 2 + n[1] * ext];
  for (let k = 1; k <= 8; k++) {
    const f = k / 8;
    pts.push([p0[0] + n[0] * ext * f, p0[1] + n[1] * ext * f, lerp(p0[2], p1[2], f * 0.2)]);
  }
  for (let k = 1; k <= 40; k++) {
    const phi = (k / 40) * Math.PI;
    pts.push([M[0] + rho * (e[0] * Math.cos(phi) + n[0] * Math.sin(phi)), M[1] + rho * (e[1] * Math.cos(phi) + n[1] * Math.sin(phi)), lerp(p0[2], p1[2], 0.2 + 0.6 * (k / 40))]);
  }
  for (let k = 1; k <= 8; k++) {
    const f = 1 - k / 8;
    pts.push([p1[0] + n[0] * ext * f, p1[1] + n[1] * ext * f, lerp(p0[2], p1[2], 0.8 + 0.2 * (k / 8))]);
  }
  return pts;
}
const R2 = Math.SQRT1_2;
function cords() {
  const A = [lineA(0, true), lineA(1, false), lineA(2, true), lineA(3, false)];
  const B = [lineB(0, true), lineB(1, false), lineB(2, true), lineB(3, false)];
  const first = (p) => p[0];
  const last = (p) => p[p.length - 1];
  const out = [];
  // A family: left ear, then serpentine with loops on the UR / LL edges.
  out.push([...loop(first(B[0]), first(A[0]), [-1, 0], 1.4), ...A[0], ...loop(last(A[0]), first(A[1]), [R2, R2])]);
  out.push([...A[1], ...loop(last(A[1]), first(A[2]), [-R2, -R2])]);
  out.push([...A[2], ...loop(last(A[2]), first(A[3]), [R2, R2])]);
  const a3 = last(A[3]);
  const tail = [];
  for (let k = 1; k <= 20; k++) {
    const f = k / 20;
    tail.push([lerp(a3[0], 0, f) - 1.2 * Math.sin(Math.PI * f), lerp(a3[1], -23.5, f), lerp(a3[2], 0.4, f)]);
  }
  out.push([...A[3], ...tail]);
  // B family: loops on the LR / UL edges; the last cord ends in the hanging loop.
  out.push([...B[0], ...loop(last(B[0]), first(B[1]), [R2, -R2])]);
  out.push([...B[1], ...loop(last(B[1]), first(B[2]), [-R2, R2])]);
  out.push([...B[2], ...loop(last(B[2]), first(B[3]), [R2, -R2])]);
  const b3 = last(B[3]);
  const top = [];
  for (let k = 1; k <= 60; k++) {
    const f = k / 60;
    const a = Math.PI * 1.35 - f * Math.PI * 1.7;
    const p = [Math.cos(a) * 3.6, 24.2 + Math.sin(a) * 3.6];
    const w = clamp(f * 4);
    top.push([lerp(b3[0], p[0], w), lerp(b3[1], p[1], w), lerp(b3[2], 0.3, w)]);
  }
  out.push([...B[3], ...top]);
  return out;
}

/** Offset a centre line sideways within the knot plane. */
function offsetPath(pts, o) {
  const res = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    res.push([pts[i][0] - dy * o, pts[i][1] + dx * o, pts[i][2]]);
  }
  return res;
}

class Path {
  constructor(pts) {
    this.p = pts;
    this.s = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) this.s[i] = this.s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    this.len = this.s[pts.length - 1];
  }
  at(s, out) {
    const p = this.p;
    if (s <= 0) return out.splice(0, 3, ...p[0]), out;
    if (s >= this.len) return out.splice(0, 3, ...p[p.length - 1]), out;
    let lo = 0;
    let hi = p.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m] < s) lo = m;
      else hi = m;
    }
    const f = (s - this.s[lo]) / (this.s[hi] - this.s[lo] || 1);
    out[0] = p[lo][0] + (p[hi][0] - p[lo][0]) * f;
    out[1] = p[lo][1] + (p[hi][1] - p[lo][1]) * f;
    out[2] = p[lo][2] + (p[hi][2] - p[lo][2]) * f;
    return out;
  }
}

export function createBeijing(env) {
  const g = new THREE.Group();
  const cam = env.camera;
  const r = rng(606);

  // ── Set ────────────────────────────────────────────────────────────────
  g.add(skyDome('#efc3a0', 900, 0.4));
  const square = groundSheet(420, 320, (ctx) => {
    ctx.fillStyle = '#d8cdbd';
    ctx.fillRect(-210, -160, 420, 320);
    ctx.fillStyle = '#9d948a';
    ctx.fillRect(-210, 16, 420, 10);
    ctx.strokeStyle = 'rgba(120,105,90,0.22)';
    ctx.lineWidth = 0.06;
    for (let x = -210; x < 210; x += 2.4) {
      ctx.beginPath();
      ctx.moveTo(x, -160);
      ctx.lineTo(x, 16);
      ctx.stroke();
    }
    for (let y = -160; y < 16; y += 2.4) {
      ctx.beginPath();
      ctx.moveTo(-210, y);
      ctx.lineTo(210, y);
      ctx.stroke();
    }
  }, 8);
  square.position.set(0, 0, -40);
  g.add(square);
  const gate = tiananmen();
  gate.position.set(0, 0, -80);
  g.add(gate);
  const fc = forecourt();
  fc.position.set(0, 0, -80);
  g.add(fc);
  // Trees in the parks either side, as dark paper masses.
  for (const sx of [-1, 1]) {
    const trees = card({ bounds: [-30, 0, 30, 14], px: 12, draw: (ctx) => {
      for (let i = 0; i < 22; i++) {
        const x = -28 + r() * 56;
        const h = 8 + r() * 5;
        fill(ctx, i % 2 ? '#3d5a45' : '#4a6a50', (c) => { ellipse(c, x, h * 0.6, 3 + r() * 2, h * 0.45); });
      }
    } });
    trees.position.set(sx * 90, 0, -86);
    g.add(trees);
  }
  // A paper sun, low in the east; auspicious clouds.
  const sunDisc = card({ bounds: [-16, -16, 16, 16], px: 16, bevel: 0.6, glowThrough: 1.1, cast: false, draw: (ctx) => fill(ctx, '#e4572e', (c) => ellipse(c, 0, 0, 15, 15)), material: { fog: false } });
  sunDisc.position.set(230, 55, -520);
  sunDisc.lookAt(0, 30, 0);
  g.add(sunDisc);
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const w = 28 + r() * 36;
    const c = xiangyun(w, 700 + i, i % 3 ? ['#fbefe0', '#f1d6bd'] : ['#f7e3cf', '#ecc9aa']);
    c.position.set((r() - 0.5) * 360, 50 + r() * 70, -170 - r() * 170);
    c.scale.x = r() < 0.5 ? -1 : 1;
    g.add(c);
    clouds.push({ c, v: 1 + r() * 2 });
  }

  // ── The knot ───────────────────────────────────────────────────────────
  const C = new THREE.Vector3(0, 68, -72);
  const mats = ['#a3081c', '#b3101f', '#920a1d'].map((c) => silkMaterial(c, 40, 0.8));
  const order = [0, 4, 1, 5, 2, 6, 3, 7];
  const cam0 = new THREE.Vector3(0, 34, 11);
  const f0 = C.clone().sub(cam0).normalize();
  const r0 = new THREE.Vector3().crossVectors(f0, new THREE.Vector3(0, 1, 0)).normalize();
  const u0 = new THREE.Vector3().crossVectors(r0, f0);
  const lensPt = (xs, ys, d) => cam0.clone().addScaledVector(f0, d).addScaledVector(r0, xs * d * TANH * ASP).addScaledVector(u0, ys * d * TANH).sub(C);
  const cordPts = cords();
  const silks = [];
  cordPts.forEach((pts, ci) => {
    const slot = order.indexOf(ci);
    const tStart = B0 + 0.345 + 0.1 * slot;
    const tEnd = tStart + 0.5;
    for (let k = 0; k < 7; k++) {
      const n = ci * 7 + k;
      const knot = offsetPath(pts, (k - 3) * 0.86);
      // The curtain: this thread lies across the lens at t = B0 and flies from there.
      const rank = ((n * 37) % 56) / 55;
      const ys = -1.12 + 2.24 * rank;
      const d = 1.25 + 0.3 * r();
      const pl = lensPt(-1.7, ys, d);
      const pr = lensPt(1.3, ys, d);
      const e0 = knot[0];
      const e1 = knot[3];
      const tx = e0[0] - e1[0];
      const ty = e0[1] - e1[1];
      const tl = Math.hypot(tx, ty) || 1;
      const approach = [e0[0] + (tx / tl) * 12, e0[1] + (ty / tl) * 12, e0[2] + 10];
      const ctrl = [
        [pl.x, pl.y, pl.z],
        [pr.x, pr.y, pr.z],
        [pr.x + r0.x * 5 + f0.x * 8, pr.y + r0.y * 5 + f0.y * 8 + 3, pr.z + r0.z * 5 + f0.z * 8],
        [lerp(pr.x, approach[0], 0.5) + (r() - 0.5) * 20, lerp(pr.y, approach[1], 0.5) + 6, lerp(pr.z, approach[2], 0.5)],
        approach,
        e0,
      ];
      const flight = [];
      // Segment 0→1 straight across the lens, then a smooth flight.
      for (let q = 0; q <= 20; q++) flight.push([lerp(ctrl[0][0], ctrl[1][0], q / 20), lerp(ctrl[0][1], ctrl[1][1], q / 20), lerp(ctrl[0][2], ctrl[1][2], q / 20)]);
      for (let q = 1; q <= 200; q++) flight.push(catmull(ctrl.slice(1), q / 200));
      const path = new Path([...flight, ...knot.slice(1)]);
      const sAcross = new Path(flight.slice(0, 21)).len;
      const sEntry = new Path(flight).len;
      const L = path.len - sEntry;
      const out = [0, 0, 0];
      const silk = {
        path,
        sHead(tt) {
          if (tt < B0 + 0.04) return sAcross;
          if (tt < tStart) return lerp(sAcross, sEntry, ease.inOutCubic(clamp((tt - B0 - 0.04) / (tStart - B0 - 0.04))));
          return lerp(sEntry, path.len, ease.outQuad(clamp((tt - tStart) / (tEnd - tStart))) * 0.25 + clamp((tt - tStart) / (tEnd - tStart)) * 0.75);
        },
      };
      silk.rib = new Ribbon({
        curve: (u, t) => {
          const tt = knotTime(t);
          path.at(silk.sHead(tt) - u * L, out);
          return toWorld(out, t);
        },
        length: L,
        width: 1.0,
        segments: 220,
        material: mats[n % 3],
        wave: { amp: 0 },
        twist: { base: 0, perLen: 0, amp: 0.12, len: 6, freq: 0.6 },
      });
      g.add(silk.rib.mesh);
      silks.push(silk);
    }
  });
  // Tighten on the downbeat: the whole knot draws in, the weave deepens.
  const tight = (t) => ease.outBack(prog(t, HIT - 0.01, HIT + 0.22), 2.2);
  function toWorld(p, t) {
    const k = tight(t);
    const sc = 1 - 0.1 * k;
    const zs = 1 + 0.5 * k;
    return [C.x + p[0] * sc, C.y + p[1] * sc, C.z + p[2] * zs];
  }
  // Medallion and tassel.
  const med = medallion(6.2);
  g.add(med);
  const cap = tasselCap(1.5);
  g.add(cap);
  const strands = [];
  for (let k = 0; k < 22; k++) {
    const x0 = (k / 21 - 0.5) * 2.4;
    const z0 = (r() - 0.5) * 0.8;
    const ph = r() * TAU;
    const len = 7 + r() * 1.2;
    const tDrop = 25.82;
    const rib = new Ribbon({
      curve: (u, t) => {
        const tt = knotTime(t);
        const drop = ease.outCubic(clamp((tt - tDrop) / 0.14));
        const bounce = springKick(t - HIT, 2.2, 3.2);
        const sway = 0.5 * Math.sin(t * 1.3 + ph) * u * u + 1.4 * bounce * u * u;
        const p = [x0 * (1 + u * 0.35) + sway, -25.2 - u * len * drop, z0 + 0.3 * Math.sin(t * 1.1 + ph + u * 3)];
        return toWorld(p, t);
      },
      length: len,
      width: 0.22,
      segments: 60,
      material: mats[k % 3],
      wave: { amp: 0 },
      twist: { base: ph, perLen: 0.2, amp: 0.4, len: 4, freq: 0.5 },
    });
    g.add(rib.mesh);
    strands.push(rib);
  }

  // ── The square: fifty-six people ───────────────────────────────────────
  const presets = ['uyghurGirl', 'tibetanGirl', 'mongolRider', 'miaoGirl', 'daiGirl', 'zhuangGirl', 'koreanGirl', 'yiGirl', 'hanGirl', 'haniGirl', 'kazakhMan', 'huiMan', 'manchuGirl', 'baiGirl', 'naxiGirl', 'dongGirl', 'liGirl', 'hanBoy', 'uyghurMan'];
  const protos = presets.map((k) => makePerson({ ...(k === 'uyghurMan' ? PEOPLE.uyghurMan() : PEOPLE[k]()), detail: 560 }));
  const front = ['yiGirl', 'daiGirl', 'mongolRider', 'tibetanGirl', 'hanGirl', 'uyghurGirl', 'miaoGirl', 'zhuangGirl', 'koreanGirl', 'kazakhMan', 'manchuGirl', 'baiGirl', 'huiMan', 'liGirl'];
  const crowd = [];
  const rows = [
    { z: 21.8, y: 0.0, n: 14 },
    { z: 19.6, y: 0.42, n: 14 },
    { z: 17.4, y: 0.84, n: 14 },
    { z: 15.2, y: 1.26, n: 14 },
  ];
  // Stone risers under the back rows.
  rows.slice(1).forEach((row) => {
    const step = card({ bounds: [-13, -0.6, 13, row.y], px: 20, bevel: 0.6, draw: (ctx) => fill(ctx, '#cfc4b2', (c) => { c.rect(-13, -0.6, 26, row.y + 0.6); }) });
    step.position.set(0, 0, row.z + 0.9);
    g.add(step);
    const top = groundSheet(26, 2.2, (ctx) => { ctx.fillStyle = '#ddd3c3'; ctx.fillRect(-13, -1.1, 26, 2.2); }, 10);
    top.position.set(0, row.y + 0.005, row.z - 0.2);
    g.add(top);
  });
  let idx = 0;
  rows.forEach((row, ri) => {
    for (let k = 0; k < row.n; k++) {
      const key = ri === 0 ? front[k] : presets[(k * 7 + ri * 5 + 3) % presets.length];
      const pup = clonePerson(protos[presets.indexOf(key)]);
      const x = (k - (row.n - 1) / 2) * 1.62 + (ri % 2 ? 0.8 : 0) + (r() - 0.5) * 0.2;
      pup.root.position.set(x, row.y, row.z + (r() - 0.5) * 0.3);
      const sc = key === 'hanBoy' ? 0.82 : 0.96 + r() * 0.08;
      pup.root.scale.setScalar(sc);
      g.add(pup.root);
      crowd.push({ pup, x, row: ri, sc, delay: r() * 0.12, ph: r() * TAU, lift: 2.5 + r() * 0.5, bounce: 0.1 + r() * 0.12, key, id: idx++ });
    }
  });
  function cheerPose(c, t) {
    const up = ease.outBack(prog(t, CHEER + c.delay - 0.05, CHEER + c.delay + 0.2), 1.4);
    const wave = Math.sin(TAU * ((t - CHEER) / (2 * BEAT)) + c.ph);
    const pre = 0.3 + 0.15 * Math.sin(t * 2.5 + c.ph);
    const a = lerp(pre, c.lift + 0.15 * wave, up);
    const b = lerp(pre, c.lift + 0.15 * Math.sin(TAU * ((t - CHEER) / (2 * BEAT)) + c.ph + 1.3), up);
    return { raiseA: a, raiseB: b, elbowA: lerp(0.3, -0.15, up), elbowB: lerp(0.3, -0.15, up), wristA: 0.2 * up, wristB: 0.2 * up, head: 0.1 * up * Math.sin(c.ph) + 0.04 * wave * up, lean: 0.04 * wave * up, skirtFlare: 0.12 * up, turn: (c.x / 30) * -0.5 };
  }
  const jump = (c, t) => {
    const u = (t - CHEER - c.delay) / (2 * BEAT);
    if (u < 0) return 0;
    return c.bounce * Math.abs(Math.sin(Math.PI * u)) * (1 - 0.3 * clamp(u / 3));
  };
  // Silk tails in the front row's hands.
  const handSilks = crowd.filter((c) => c.row === 0 && c.id % 2 === 0).map((c) => {
    const side = c.id % 4 === 0 ? 'B' : 'A';
    const rib = new Ribbon({
      head: (t) => {
        const tt = Math.min(t, FREEZE);
        const p = cheerPose(c, tt);
        const h = handWorld(p, side, [c.x, rows[c.row].y + jump(c, tt), c.pup.root.position.z], c.sc);
        return [h[0], h[1] + 0.02, h[2] + 0.05];
      },
      length: 2.6,
      width: 0.11,
      segments: 60,
      history: 3,
      material: mats[c.id % 3],
      wave: { amp: 0.12, len: 1.4, freq: 1.6 },
      twist: { perLen: 0.8, amp: 0.8, len: 1.5, freq: 1.2 },
    });
    g.add(rib.mesh);
    return rib;
  });

  // ── Update ─────────────────────────────────────────────────────────────
  const target = new THREE.Vector3();
  const camK = keys([
    [B0, [0, 34, 11, 0, 68, -72, 40]],
    [SIL0, [0, 42.5, -15, 0, 67, -72, 40], ease.inOutSine],
    [HIT, [0, 44.5, -21, 0, 66.5, -72, 40], ease.linear],
    [HIT + 0.35, [0, 42, -11, 0, 64, -72, 42], ease.outCubic],
    [FREEZE - 0.12, [0, 1.3, 36, 0, 38.5, -80, 46], ease.inOutCubic],
  ]);
  function update(t) {
    const T = Math.min(t, FREEZE);
    const kt = knotTime(T);
    for (const s of silks) s.rib.update(T);
    // Medallion: struck in on the downbeat.
    const k = tight(T);
    const pop = ease.outBack(prog(T, HIT, HIT + 0.16), 2.6);
    med.visible = T >= HIT;
    med.scale.setScalar(Math.max(0.001, pop * (1 - 0.1 * k)));
    med.position.set(C.x, C.y + 0.3, C.z + 2.2 * (1 + 0.5 * k));
    med.rotation.z = 0.25 * (1 - pop);
    cap.visible = kt >= 25.8;
    const capP = toWorld([0, -24.2, 0.6], T);
    cap.position.set(...capP);
    cap.rotation.z = 0.05 * springKick(T - HIT, 2.2, 3.2);
    for (const st of strands) {
      st.update(T);
      st.mesh.visible = kt >= 25.82;
    }
    // The crowd.
    for (const c of crowd) {
      pose(c.pup, cheerPose(c, T));
      c.pup.root.position.y = rows[c.row].y + jump(c, T);
    }
    for (const h of handSilks) h.update(T);
    gate.lanterns.forEach((l, i) => (l.rotation.z = 0.04 * Math.sin(T * 1.7 + i)));
    gate.flags.forEach((f, i) => (f.rotation.y = 0.25 * Math.sin(T * 3 + i)));
    clouds.forEach(({ c, v }) => (c.position.x += 0 * v));
    // Camera: pull into the weave; hold through the silence; jolt; crane down.
    const [px, py, pz, lx, ly, lz, fov] = camK(T);
    const shake = 0.35 * springKick(T - HIT, 7, 9);
    cam.position.set(px + shake * 0.4, py + shake, pz);
    target.set(lx, ly, lz);
    cam.lookAt(target);
    cam.fov = fov;
    cam.near = 0.05;
    cam.updateProjectionMatrix();
    const nearCrowd = T > HIT + 0.9;
    cam.userData.dof = nearCrowd ? { focus: 13, aperture: 0.004, maxBlur: 8 } : { focus: cam.position.distanceTo(C), aperture: 0.0, maxBlur: 8 };
    env.light({
      sun: [6, 2.4, 5],
      sunColor: '#ffd6a6',
      sunIntensity: 3.1,
      hemiSky: '#f6dcc8',
      hemiGround: '#a88a78',
      hemiIntensity: 1.3,
      bg: '#efc3a0',
      fog: ['#efc6a4', 70, 560],
      shadowCenter: nearCrowd ? [0, 12, -20] : [0, 66, -72],
      shadowSize: nearCrowd ? 55 : 30,
      exposure: 1.0,
    });
  }
  return { group: g, update, start: B0, end: 30.01 };
}
