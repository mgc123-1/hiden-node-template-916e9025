// Shot 05 · 五十六个民族 — the kaleidoscope.
//
// Director's rule for this shot: the silk never cuts. The band of red is
// locked to the lens and flows left to right through all four bars while the
// world changes behind it — on the beat (bar 10), on the eighth (bar 11), on
// the sixteenth (bar 12). In every world someone touches the band and adds a
// thread of their own, so the band thickens cut by cut into a river. On the
// last sixteenth the river lifts like a curtain: below is a quilt of fifty-six
// patches (百家被, the "hundred families quilt" sewn for a child's blessing),
// and from every patch a silk rises toward the dawn.

import * as THREE from 'three';
import { at, BEAT, S8, S16, clamp, lerp, ease, prog, springKick, catmull, TAU, rng, smoothstep, keys } from '../core.js';
import { makePerson, pose, PEOPLE } from '../art/people.js';
import { SETS, xiuqiu, torch, eagle, swingRig, TEXTILES, mandala, windowFrame } from '../art/montage-art.js';
import { groundSheet, cloud, skyDome } from '../art/set.js';
import { card } from '../engine/paper.js';
import { Ribbon, silkMaterial } from '../engine/silk.js';
import { handWorld } from '../engine/fk.js';

export const T0 = at(10) - 0.02;
export const END = at(14);
const FLASH0 = at(12);
const QUILT0 = at(13);

const FOV = 40;
const TANH = Math.tan(((FOV / 2) * Math.PI) / 180);
const ASP = 16 / 9;
const REDS = ['#a3081c', '#b3101f', '#920a1d'];

// ─── Vignettes ──────────────────────────────────────────────────────────────
// yaw/pitch/roll: camera attitude. lock: where (screen units, −1..1) the
// touching hand lands, at depth d. touch: fraction of the vignette at which
// the hand meets the band.
const VIG = [
  { key: 'zhuang', person: 'zhuangGirl', t0: T0, t1: at(10, 2), yaw: 0.18, pitch: 0.1, roll: -0.03, lock: [0.28, 0.27], d: 3.1, touch: 0.3, light: { sun: [-3, 7, 6], sunColor: '#fff3df', sunIntensity: 3.0, hemiSky: '#e6efe6', hemiGround: '#6d8a5c', hemiIntensity: 1.3, bg: '#cfe3d6', fog: ['#cfe3d6', 20, 120] } },
  { key: 'korean', person: 'koreanGirl', t0: at(10, 2), t1: at(10, 3), yaw: -0.08, pitch: 0.1, roll: 0.0, lock: [0.08, 0.27], d: 3.9, touch: 0.62, light: { sun: [4, 8, 5], sunColor: '#fff0d6', sunIntensity: 3.1, hemiSky: '#dbe8f5', hemiGround: '#a08850', hemiIntensity: 1.25, bg: '#9cc3e6', fog: ['#b9d3ea', 25, 140] } },
  { key: 'yi', person: 'yiGirl', t0: at(10, 3), t1: at(11), yaw: 0.1, pitch: 0.12, roll: -0.06, lock: [0.22, 0.27], d: 2.8, touch: 0.45, night: true, light: { sun: [-4, 6, 4], sunColor: '#7d8fc8', sunIntensity: 0.9, hemiSky: '#2a3560', hemiGround: '#120e18', hemiIntensity: 0.55, bg: '#111a33', fog: ['#111a33', 18, 80], exposure: 1.05 } },
  { key: 'hani', person: 'haniGirl', yaw: 0.14, pitch: 0.06, roll: 0.04, lock: [0.3, 0.27], d: 2.9, light: { sun: [-3, 8, 6], sunColor: '#fff5e6', sunIntensity: 2.8, hemiSky: '#e6eef2', hemiGround: '#6b7f4a', hemiIntensity: 1.35, bg: '#dfe9ee', fog: ['#dfe9ee', 18, 110] } },
  { key: 'kazakh', person: 'kazakhMan', yaw: -0.16, pitch: 0.14, roll: -0.05, lock: [0.26, 0.27], d: 3.0, light: { sun: [4, 9, 5], sunColor: '#fff6ea', sunIntensity: 3.1, hemiSky: '#d6e4f2', hemiGround: '#8a975a', hemiIntensity: 1.25, bg: '#8fb6dc', fog: ['#b8cfe4', 30, 160] } },
  { key: 'hui', person: 'huiMan', yaw: 0.12, pitch: 0.08, roll: 0.05, lock: [0.3, 0.27], d: 2.9, light: { sun: [-4, 7, 5], sunColor: '#fff0d8', sunIntensity: 3.0, hemiSky: '#f1e6cf', hemiGround: '#b89a66', hemiIntensity: 1.3, bg: '#e8dcc0', fog: ['#e8dcc0', 20, 120] } },
  { key: 'manchu', person: 'manchuGirl', yaw: -0.1, pitch: 0.1, roll: -0.04, lock: [0.24, 0.27], d: 2.8, light: { sun: [4, 8, 6], sunColor: '#fff2dc', sunIntensity: 3.0, hemiSky: '#dce6f2', hemiGround: '#a8906a', hemiIntensity: 1.3, bg: '#a9c6e8', fog: ['#c3d6ec', 25, 120] } },
  { key: 'bai', person: 'baiGirl', yaw: 0.16, pitch: 0.06, roll: 0.05, lock: [0.28, 0.27], d: 2.9, light: { sun: [-4, 8, 6], sunColor: '#fff6ea', sunIntensity: 2.9, hemiSky: '#e0eaf4', hemiGround: '#6d8a6a', hemiIntensity: 1.35, bg: '#a8c4e0', fog: ['#c6d8ea', 30, 160] } },
  { key: 'naxi', person: 'naxiGirl', yaw: -0.14, pitch: 0.12, roll: -0.05, lock: [0.24, 0.27], d: 2.8, light: { sun: [4, 9, 5], sunColor: '#fff6ea', sunIntensity: 3.1, hemiSky: '#dfe8f2', hemiGround: '#7a8a5a', hemiIntensity: 1.3, bg: '#8fb3dc', fog: ['#b5cce6', 30, 200] } },
  { key: 'dong', person: 'dongGirl', yaw: 0.12, pitch: 0.1, roll: 0.04, lock: [0.3, 0.27], d: 2.9, light: { sun: [-3, 8, 6], sunColor: '#fff3e0', sunIntensity: 2.8, hemiSky: '#e3ece2', hemiGround: '#5d8a4a', hemiIntensity: 1.35, bg: '#c8dccf', fog: ['#c8dccf', 20, 120] } },
  { key: 'li', person: 'liGirl', yaw: -0.12, pitch: 0.08, roll: -0.05, lock: [0.26, 0.27], d: 2.9, light: { sun: [4, 9, 6], sunColor: '#fff4e0', sunIntensity: 3.2, hemiSky: '#e2f0f4', hemiGround: '#b8a878', hemiIntensity: 1.3, bg: '#a8d8e8', fog: ['#c3e3ee', 30, 160] } },
];
for (let k = 3; k < VIG.length; k++) {
  VIG[k].t0 = at(11) + (k - 3) * S8;
  VIG[k].t1 = VIG[k].t0 + S8;
  VIG[k].touch = 0.35;
}
export const NAMES = [
  ['维吾尔族', 'UYGHUR'], ['藏族', 'TIBETAN'], ['蒙古族', 'MONGOL'], ['苗族', 'MIAO'], ['傣族', 'DAI'],
  ['壮族', 'ZHUANG'], ['朝鲜族', 'KOREAN'], ['彝族', 'YI'], ['哈尼族', 'HANI'], ['哈萨克族', 'KAZAKH'], ['回族', 'HUI'], ['满族', 'MANCHU'], ['白族', 'BAI'], ['纳西族', 'NAXI'], ['侗族', 'DONG'], ['黎族', 'LI'],
  ...TEXTILES.map((x) => [x.name, x.py]),
  ['布朗族', 'BLANG'], ['撒拉族', 'SALAR'], ['毛南族', 'MAONAN'], ['仡佬族', 'GELAO'], ['锡伯族', 'XIBE'], ['阿昌族', 'ACHANG'], ['普米族', 'PUMI'], ['怒族', 'NU'],
  ['乌孜别克族', 'UZBEK'], ['俄罗斯族', 'RUSSIAN'], ['德昂族', 'DE’ANG'], ['保安族', 'BONAN'], ['裕固族', 'YUGUR'], ['塔塔尔族', 'TATAR'], ['独龙族', 'DERUNG'], ['鄂伦春族', 'OROQEN'],
  ['门巴族', 'MONBA'], ['珞巴族', 'LHOBA'], ['基诺族', 'JINO'], ['拉祜族', 'LAHU'], ['水族', 'SUI'], ['东乡族', 'DONGXIANG'], ['达斡尔族', 'DAUR'], ['仫佬族', 'MULAM'],
];

// Silk count over time (5 carried in; one per vignette; one per flash; the rest rise from the quilt).
export function silkCount(t) {
  let n = 5;
  for (const v of VIG) if (t >= v.t0 + (v.t1 - v.t0) * v.touch) n++;
  for (let k = 0; k < 16; k++) if (t >= FLASH0 + k * S16 + 0.02) n++;
  if (t >= QUILT0) n = Math.max(n, Math.min(56, 32 + Math.floor(prog(t, QUILT0 + 0.1, QUILT0 + 1.0) * 24)));
  return n;
}
/** Which name is on screen at time t (index into NAMES), or −1. */
export function currentName(t) {
  for (let k = VIG.length - 1; k >= 0; k--) if (t >= VIG[k].t0) return t < VIG[k].t1 ? 5 + k : -1;
  return -1;
}
export function flashName(t) {
  if (t < FLASH0 || t >= QUILT0) return -1;
  return 16 + Math.min(15, Math.floor((t - FLASH0) / S16));
}
export const MONTAGE = { VIG, FLASH0, QUILT0, T0, END };

export function createMontage(env) {
  const g = new THREE.Group();
  const cam = env.camera;
  const r = rng(505);

  // ── The vignettes, each far from the others ────────────────────────────
  const vigs = VIG.map((v, k) => {
    const grp = new THREE.Group();
    const X = 2000 + k * 200;
    grp.position.set(X, 0, 0);
    const set = SETS[v.key]();
    grp.add(set);
    const person = makePerson({ ...PEOPLE[v.person](), detail: k < 3 ? 1000 : 800 });
    grp.add(person.root);
    g.add(grp);
    grp.visible = false;
    return { ...v, grp, set, person, X };
  });
  // Props.
  const ball = xiuqiu(0.12);
  vigs[0].grp.add(ball);
  // Korean swing: she stands on the board and swings toward the lens.
  const swing = swingRig(4.2);
  const swingPivot = new THREE.Group();
  swingPivot.position.set(0, 4.75, 0);
  vigs[1].grp.add(swingPivot);
  swingPivot.add(swing);
  vigs[1].grp.remove(vigs[1].person.root);
  swingPivot.add(vigs[1].person.root);
  vigs[1].person.root.position.set(0, -4.2 + 0.02, 0.03);
  const swingAngle = (t) => {
    const v = VIG[1];
    const u = clamp((t - v.t0) / (v.t1 - v.t0));
    // A pendulum in the picture plane: she flies across the frame, left to right.
    return -0.62 * Math.cos(Math.PI * (0.05 + 0.9 * u));
  };
  // Yi torch: held aloft, flame up (the wrist's −y points along the raised arm).
  const yiTorch = torch();
  vigs[2].person.j.wristB.add(yiTorch);
  yiTorch.position.set(0, -0.08, 0.02);
  yiTorch.rotation.z = Math.PI;
  const hawk = eagle();
  vigs[4].person.j.wristA.add(hawk.root);
  hawk.root.scale.setScalar(0.8);
  const perchHawk = (p) => {
    // Keep the eagle upright on the fist whatever the arm does.
    const a = (p.raiseA ?? 0) + (p.elbowA ?? 0) + (p.wristA ?? 0);
    hawk.root.rotation.z = a;
    hawk.root.position.set(-0.3 * Math.sin(a), -0.07 + 0.3 * Math.cos(a), 0.03);
  };

  // ── Kaleidoscope stage (bar 12) ────────────────────────────────────────
  const FX = 6000;
  const flashes = TEXTILES.map((spec, k) => {
    const grp = new THREE.Group();
    const R = 5.2;
    const m = card({ bounds: [-R, -R, R, R], px: 150, bevel: 0, draw: (ctx) => mandala(ctx, 2.7, spec, k + 1) });
    m.position.set(FX, 0, -6.6);
    const fr = windowFrame(3.0 + (k % 3) * 0.3, spec.pal[(k + 1) % spec.pal.length], k + 7);
    fr.position.set(FX, 0, -5.4);
    grp.add(m, fr);
    grp.visible = false;
    g.add(grp);
    return { grp, m, fr, spec };
  });

  // ── The quilt (bar 13) ─────────────────────────────────────────────────
  // Fifty-six hero patches at the centre of a patchwork land that runs to the
  // horizon; a bank of dawn cloud ahead.
  const QX = 9000;
  const quilt = new THREE.Group();
  quilt.position.set(QX, 0, 0);
  quilt.visible = false;
  g.add(quilt);
  quilt.add(skyDome('#f1d2ae', 900, 0.4));
  const P = 2.6; // patch size
  const cols = 8;
  const rows = 7;
  const fieldTones = ['#c1121f', '#f4d35e', '#2a9d8f', '#1d3557', '#e76f51', '#fbf6ea', '#6a4c93', '#8ab17d', '#e9c46a', '#264653'];
  quilt.add(groundSheet(420, 420, (ctx) => {
    const n = Math.ceil(420 / P);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = fieldTones[(i * 7 + j * 3 + ((i * j) % 5)) % fieldTones.length];
        ctx.fillRect(-210 + i * P, -210 + j * P, P, P);
      }
    ctx.strokeStyle = 'rgba(250,240,220,0.55)';
    ctx.lineWidth = 0.12;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(-210 + i * P, -210);
      ctx.lineTo(-210 + i * P, 210);
      ctx.moveTo(-210, -210 + i * P);
      ctx.lineTo(210, -210 + i * P);
      ctx.stroke();
    }
  }, 3));
  const patches = [];
  const heroCards = [];
  for (let i = 0; i < 56; i++) {
    const cx = (i % cols) - (cols - 1) / 2;
    const cz = Math.floor(i / cols) - (rows - 1) / 2;
    const base = TEXTILES[i % TEXTILES.length];
    const spec = i < 16 ? base : { ...base, bg: base.pal[i % base.pal.length], pal: [base.bg, ...base.pal.filter((c, j) => j !== i % base.pal.length)] };
    const pc = card({
      bounds: [-P / 2, -P / 2, P / 2, P / 2],
      px: 110,
      bevel: 1,
      draw: (ctx) => {
        clipTo2(ctx, P, () => mandala(ctx, P * 0.62, spec, i + 3));
        // Running stitch round the edge.
        ctx.strokeStyle = '#f6efe0';
        ctx.lineWidth = 0.025;
        ctx.setLineDash([0.07, 0.06]);
        ctx.strokeRect(-P / 2 + 0.07, -P / 2 + 0.07, P - 0.14, P - 0.14);
        ctx.setLineDash([]);
      },
    });
    pc.rotation.x = -Math.PI / 2;
    pc.position.set(cx * P, 0.03, cz * P);
    quilt.add(pc);
    patches.push({ pc, x: cx * P, z: cz * P });
    heroCards.push(pc);
  }
  // The patchwork continues: clones of the hero patches, out to where the fog takes them.
  for (let i = -9; i < 9; i++)
    for (let j = -14; j < 8; j++) {
      const x = (i + 0.5) * P;
      const z = j * P;
      if (Math.abs(x) < (cols * P) / 2 && Math.abs(z) < (rows * P) / 2 + 0.1) continue;
      const c = heroCards[Math.floor(r() * 56)].clone();
      c.position.set(x, 0.025, z);
      c.rotation.z = Math.floor(r() * 4) * (Math.PI / 2);
      quilt.add(c);
    }
  // ── The band: silks locked to the lens ─────────────────────────────────
  const rig = new THREE.Group();
  rig.matrixAutoUpdate = false;
  g.add(rig);
  const mats = REDS.map((c) => silkMaterial(c, 6, 0.12));
  // Anchored births: which silk is born where.
  const births = [];
  for (let i = 0; i < 5; i++) births.push({ born: -Infinity, full: -Infinity });
  vigs.forEach((v, k) => {
    const tt = v.t0 + (v.t1 - v.t0) * v.touch;
    births.push({ born: tt, full: v.t1, vig: k });
  });
  for (let k = 0; k < 16; k++) births.push({ born: FLASH0 + k * S16 + 0.02, full: FLASH0 + k * S16 + 0.12, sweep: true });
  const band = births.map((b, i) => {
    // The band grows upward from the reaching hands, so faces stay clear.
    const lane = i < 16 ? -0.05 + 0.045 * i * (0.9 + 0.2 * r()) : 0.05 + r() * 0.72;
    const d = 2.5 + r() * 1.6;
    const rib = new Ribbon({
      curve: (u, t) => bandPoint(i, u, t),
      length: 6,
      width: 0.1 * (d / 3),
      segments: 150,
      material: mats[i % 3],
      wave: { amp: 0.0 },
      twist: { base: r() * TAU, perLen: 0.35, amp: 0.9, len: 2.4, freq: 0.8 + r() * 0.4 },
    });
    rig.add(rib.mesh);
    return { ...b, rib, lane, d, ph: r() * TAU, sp: 0.8 + r() * 0.4 };
  });
  band.forEach((b, i) => (b.rank = (i + 0.5) / band.length));

  // Band shape in screen units → camera space.
  let cutT = T0;
  let touchX = 0.3;
  let touchT = -10;
  let lift = 0;
  let curtain = 0; // 0..1: the band sweeps back down over the lens and closes
  const toCam = (xs, ys, d) => [xs * d * TANH * ASP, ys * d * TANH, -d];
  const bandY = (b, xs, t) => {
    const kick = 1 + 1.6 * Math.exp(-7 * Math.max(0, t - cutT));
    const bump = 0.12 * Math.exp(-(((xs - touchX) / 0.22) ** 2)) * Math.exp(-5 * Math.abs(t - touchT));
    return 0.3 + b.lane * (1 + 0.18 * Math.sin(0.8 * xs + b.ph + t)) + 0.07 * kick * Math.sin(2.3 * xs - 4.4 * t + 0.25 * b.lane) + 0.028 * Math.sin(5.3 * xs * b.sp - 6.1 * t + b.ph) + bump + lift * (1.2 + 0.4 * Math.sin(b.ph));
  };
  const bandAt = (b, xs, t) => {
    let d = b.d + 0.22 * Math.sin(1.7 * xs - 3.1 * t + b.ph);
    let ys = bandY(b, xs, t);
    if (curtain > 0) {
      const c = ease.inOutCubic(curtain);
      const cy = -1.15 + 2.3 * b.rank + 0.05 * Math.sin(2.1 * xs - 5 * t + b.ph);
      ys = lerp(ys, cy, c);
      d = lerp(d, 1.25 + 0.25 * Math.sin(b.ph), c);
    }
    return toCam(xs, ys, d);
  };
  function bandPoint(i, u, t) {
    const b = band[i];
    if (t >= b.full) return bandAt(b, lerp(1.35, -1.35, u), t);
    if (b.sweep) {
      // Flash-born: sweeps in from the left edge.
      const head = lerp(-1.35, 1.35, prog(t, b.born, b.born + 0.1, ease.outCubic));
      return bandAt(b, lerp(head, -1.35, u), t);
    }
    // Hand-born: tail at the source, head running out along the band.
    const src = b.src || [0, 0, -3];
    const sxs = src[0] / (-src[2] * TANH * ASP);
    if (b.head) {
      const h = b.head;
      const mid = [(h[0] + src[0]) / 2, Math.min(h[1], src[1]) - 0.35, (h[2] + src[2]) / 2];
      const a = 1 - u;
      return [0, 1, 2].map((k) => u * u * src[k] + 2 * u * a * mid[k] + a * a * h[k]);
    }
    const head = lerp(sxs, 1.35, prog(t, b.born, b.born + 0.28, ease.outCubic));
    const xs = lerp(head, sxs, u);
    const w = smoothstep(0, 0.35, xs - sxs);
    const p = bandAt(b, xs, t);
    return [lerp(src[0], p[0], w), lerp(src[1], p[1], w), lerp(src[2], p[2], w)];
  }

  // ── Rising silks (bar 13) ──────────────────────────────────────────────
  // They shoot straight up past the lens, fanning round it: a vortex seen from above.
  const LENS = [0.2, 2.5];
  const rank = patches.map((p, i) => [Math.hypot(p.x, p.z * 1.2) + r() * 1.5, i]).sort((a, b) => a[0] - b[0]);
  const rise = rank.map(([, i], k) => {
    const p = patches[i];
    const born = QUILT0 + 0.05 + (k / 56) * 0.6;
    const sw = r() * TAU;
    const dx = p.x - LENS[0];
    const dz = p.z - LENS[1];
    const dl = Math.hypot(dx, dz) || 1;
    const fan = 1.2 + r() * 2.2;
    const ctrl = [
      [p.x, 0.0, p.z],
      [p.x + Math.cos(sw) * 0.5, 4, p.z + Math.sin(sw) * 0.5],
      [lerp(p.x, LENS[0], 0.55) + (dx / dl) * fan, 11, lerp(p.z, LENS[1], 0.55) + (dz / dl) * fan],
      [LENS[0] + (dx / dl) * fan * 1.3 - (dz / dl) * 1.5, 20, LENS[1] + (dz / dl) * fan * 1.3 + (dx / dl) * 1.5],
      [LENS[0] + (dx / dl) * fan * 2 - (dz / dl) * 4, 34, LENS[1] + (dz / dl) * fan * 2 + (dx / dl) * 4],
    ];
    const dur = 2.1 + r() * 0.35;
    const head = (t) => {
      const f = clamp((t - born) / dur);
      const u = f < 0.3 ? ease.outCubic(f / 0.3) * 0.3 : 0.3 + (f - 0.3) * (0.7 / 0.7);
      const q = catmull(ctrl, u);
      const s = (t - born) * 6 + sw;
      const spin = 0.5 * (1 - clamp(u * 3));
      return [QX + q[0] + spin * Math.cos(s), q[1], q[2] + spin * Math.sin(s)];
    };
    const rib = new Ribbon({ head, born, length: 22, width: 0.36, segments: 160, history: 3, material: mats[k % 3], wave: { amp: 0.22, len: 5, freq: 1.1 }, twist: { perLen: 0.3, amp: 1.2, len: 5, freq: 0.9 } });
    g.add(rib.mesh);
    return { rib, born, patch: p };
  });

  // ── Update ─────────────────────────────────────────────────────────────
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v3 = new THREE.Vector3();
  const pointColor = new THREE.Color('#ff9a3c');

  function vigPose(k, t) {
    const v = vigs[k];
    const u = clamp((t - v.t0) / (v.t1 - v.t0));
    const reach = ease.outCubic(clamp(u / Math.max(0.05, v.touch)));
    const bob = Math.sin(TAU * (t / (2 * BEAT)));
    if (v.key === 'zhuang') {
      // Wind-up behind, then the throw overhead.
      const thr = prog(t, v.t0 + 0.12, v.t0 + 0.42, ease.inOutCubic);
      return { raiseB: lerp(-0.5, 2.7, thr), elbowB: lerp(0.9, 0.1, thr), wristB: lerp(0.6, -0.3, thr), raiseA: 0.5 + 0.3 * thr, elbowA: 0.8, lean: lerp(-0.08, 0.1, thr), head: lerp(-0.05, 0.12, thr), neckSlide: 0.01 * bob, skirtSwing: 0.06 * Math.sin(t * 5), turn: 0.12 };
    }
    if (v.key === 'korean') {
      const a = swingAngle(t);
      return { raiseA: 2.95, raiseB: 2.95, elbowA: -0.1, elbowB: -0.1, wristA: 0.2, wristB: 0.2, head: -0.4 * a, skirtFlare: 0.15 + 0.2 * Math.abs(a), skirtSwing: -0.9 * a, turn: 0 };
    }
    if (v.key === 'yi') return { raiseB: lerp(1.6, 2.6, reach), elbowB: lerp(0.6, 0.15, reach), wristB: -0.1, raiseA: 0.3, elbowA: 0.3, head: 0.1, lean: 0.05, turn: 0.1 };
    if (v.key === 'kazakh') return { raiseA: 1.45, elbowA: 0.9, wristA: 0.2, raiseB: lerp(1.9, 2.55, reach), elbowB: 0.3, head: -0.06, turn: -0.08 };
    return { raiseB: lerp(1.8, 2.6, reach), elbowB: lerp(0.5, 0.15, reach), wristB: lerp(0.3, -0.2, reach), raiseA: 0.45 + 0.15 * bob, elbowA: 0.5, head: 0.08 * Math.sin(t * 6 + k), neckSlide: 0.012 * Math.sin(t * 9 + k), lean: 0.04, skirtFlare: 0.1 * Math.abs(bob), turn: v.yaw * -0.4 };
  }
  // Touch point in the vignette's world at the touch moment (the hand, or the ball).
  function touchWorld(k) {
    const v = vigs[k];
    const tt = v.t0 + (v.t1 - v.t0) * v.touch;
    if (v.key === 'korean') {
      pose(v.person, vigPose(k, tt));
      swingPivot.rotation.z = swingAngle(tt);
      v.grp.updateMatrixWorld(true);
      v.person.j.wristB.getWorldPosition(tmp);
      return [tmp.x, tmp.y, tmp.z];
    }
    const p = vigPose(k, tt);
    const h = handWorld(p, 'B', [v.X, 0, 0]);
    if (v.key === 'yi') h[1] += 0.45;
    return h;
  }
  const tmp = new THREE.Vector3();
  const touchPts = vigs.map((_, k) => touchWorld(k));
  function ballPos(t) {
    const v = vigs[0];
    const rel = v.t0 + 0.4;
    if (t < rel) {
      const h = handWorld(vigPose(0, t), 'B', [v.X, 0, 0]);
      return [h[0], h[1] - 0.05, h[2] + 0.06];
    }
    const s = t - rel;
    const h0 = handWorld(vigPose(0, rel), 'B', [v.X, 0, 0]);
    return [h0[0] + 2.2 * s, h0[1] + 2.4 * s - 2.2 * s * s, h0[2] + 0.2 + 0.5 * s];
  }

  function setCam(pos, quat, fov = FOV) {
    cam.position.set(...pos);
    cam.quaternion.copy(quat);
    cam.fov = fov;
    cam.near = 0.05;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    rig.matrix.copy(cam.matrixWorld);
    rig.matrixWorldNeedsUpdate = true;
  }
  const toCamSpace = (p) => {
    tmp.set(...p).applyMatrix4(cam.matrixWorldInverse);
    return [tmp.x, tmp.y, tmp.z];
  };

  function update(t) {
    lift = 0;
    curtain = 0;
    let active = -1;
    for (let k = 0; k < vigs.length; k++) if (t >= vigs[k].t0 && t < vigs[k].t1) active = k;
    const inFlash = t >= FLASH0 && t < QUILT0;
    const inQuilt = t >= QUILT0;
    vigs.forEach((v, k) => (v.grp.visible = k === active));
    flashes.forEach((f) => (f.grp.visible = false));
    quilt.visible = inQuilt;
    for (const x of rise) x.rib.mesh.visible = false;
    env.point.intensity = 0;

    if (active >= 0) {
      const v = vigs[active];
      cutT = v.t0;
      const vp = vigPose(active, t);
      pose(v.person, vp);
      if (v.key === 'kazakh') perchHawk(vp);
      if (v.key === 'korean') swingPivot.rotation.z = swingAngle(t);
      v.grp.updateMatrixWorld(true);
      const u = (t - v.t0) / (v.t1 - v.t0);
      // Camera: the touch point lands on the lock point; a slow push.
      e.set(v.pitch, v.yaw, v.roll + 0.03 * (u - 0.5), 'YXZ');
      q.setFromEuler(e);
      const d = v.d * (1 + 0.08 * (0.5 - u) * (active < 3 ? 2 : 1));
      const L = toCam(v.lock[0], v.lock[1], d);
      v3.set(...L).applyQuaternion(q);
      const T = touchPts[active];
      setCam([T[0] - v3.x, T[1] - v3.y, T[2] - v3.z], q);
      touchX = v.lock[0];
      touchT = v.t0 + (v.t1 - v.t0) * v.touch;
      cam.userData.dof = { focus: d, aperture: 0.02, maxBlur: 16 };
      env.light({ ...v.light, shadowCenter: [T[0] - 0.2, 1.2, T[2]], shadowSize: 4.5 });
      if (v.key === 'zhuang') {
        const b = ballPos(t);
        ball.position.set(b[0] - v.X, b[1], b[2]);
        ball.rotation.z = Math.max(0, t - v.t0 - 0.4) * -9;
      }
      if (v.key === 'korean') {
        v.set.branch.rotation.z = 0.05 * Math.sin(t * 3);
      }
      if (v.key === 'yi') {
        yiTorch.flicker(t, 1);
        v.set.torches.forEach((tc, i) => tc.flicker(t, i));
        yiTorch.getWorldPosition(tmp);
        env.point.position.set(tmp.x, tmp.y + 0.35, tmp.z + 0.3);
        env.point.color.copy(pointColor);
        env.point.intensity = 6;
        env.point.distance = 8;
      }
      if (v.key === 'kazakh') {
        const f = Math.sin(t * 22);
        hawk.j.wingA.rotation.z = -0.25 + 0.35 * f;
        hawk.j.wingB.rotation.z = 0.25 - 0.35 * f;
      }
    } else if (inFlash) {
      const k = Math.min(15, Math.floor((t - FLASH0) / S16));
      const f = flashes[k];
      f.grp.visible = true;
      cutT = FLASH0 + k * S16;
      touchT = -10;
      const s = t - FLASH0;
      f.m.rotation.z = 0.6 * s + k * 0.7;
      f.fr.rotation.z = -0.9 * s - k * 0.4;
      const roll = 0.35 * Math.sin(s * 2.1) + (k % 2 ? 0.08 : -0.08);
      e.set(0, 0, roll, 'YXZ');
      q.setFromEuler(e);
      setCam([FX, 0, 0], q);
      cam.userData.dof = { focus: 3, aperture: 0.012, maxBlur: 12 };
      env.light({ sun: [-2.5, 4, 6], sunColor: '#fff4e6', sunIntensity: 2.6, hemiSky: '#fff4ea', hemiGround: '#b89a80', hemiIntensity: 1.2, bg: f.spec.bg, fog: ['#000000', 500, 1000], shadowCenter: [FX, 0, -4], shadowSize: 6 });
    } else if (inQuilt) {
      // The curtain lifts off the lens; the quilt; the rise; on toward the dawn.
      lift = prog(t, QUILT0, QUILT0 + 0.3, ease.inCubic) * 2.4;
      curtain = prog(t, END - 0.34, END - 0.03);
      cutT = QUILT0;
      touchT = -10;
      const ck = keys([
        [QUILT0, [0.4, 10, 3.5, -1.5, 0.12, 46]],
        [END, [0.2, 16.5, 2.4, -1.47, -0.5, 54], ease.inOutSine],
      ]);
      const [cx, cy, cz, pitch, roll, fov] = ck(t);
      e.set(pitch, 0.0, roll, 'YXZ');
      q.setFromEuler(e);
      setCam([QX + cx, cy, cz], q, fov);
      cam.userData.dof = { focus: 14, aperture: 0.0, maxBlur: 8 };
      for (const x of rise) x.rib.update(t);
      for (const x of rise) {
        const pop = springKick(t - x.born, 3, 7);
        x.patch.pc.position.y = 0.03 + 0.14 * Math.max(0, pop);
      }
      env.light({ sun: [3, 2.2, -6], sunColor: '#ffd29a', sunIntensity: 3.4, hemiSky: '#f7e3cc', hemiGround: '#b08a6a', hemiIntensity: 1.3, bg: '#f1d2ae', fog: ['#f0cfae', 30, 170], shadowCenter: [QX + cx, 3, cz - 8], shadowSize: 20, exposure: 1.02 });
    }

    // Band sources for the silk being born in this vignette.
    for (let i = 0; i < band.length; i++) {
      const b = band[i];
      const vis = t >= b.born && (!inQuilt || lift < 2.3 || curtain > 0);
      b.rib.mesh.visible = vis;
      if (!vis) continue;
      if (b.vig !== undefined && t < b.full) {
        const v = vigs[b.vig];
        if (v.key === 'zhuang') {
          b.src = toCamSpace(handWorld(vigPose(0, t), 'B', [v.X, 0, 0]));
          const bp = ballPos(t);
          b.head = toCamSpace([bp[0], bp[1] - 0.2, bp[2]]);
        } else if (v.key === 'yi') {
          yiTorch.getWorldPosition(tmp);
          b.src = toCamSpace([tmp.x, tmp.y + 0.4, tmp.z]);
        } else {
          v.person.j.wristB.getWorldPosition(tmp);
          tmp.y -= 0.03;
          b.src = toCamSpace([tmp.x, tmp.y, tmp.z]);
        }
      } else {
        b.head = null;
      }
      b.rib.update(t);
    }
  }

  return { group: g, update, start: T0, end: END };
}

function clipTo2(ctx, P, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-P / 2, -P / 2, P, P);
  ctx.clip();
  fn();
  ctx.restore();
}
