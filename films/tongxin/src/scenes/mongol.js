// Shot 03 · 呼伦贝尔 · 蒙古族
// The silks overtake the lens; low and wide, a rider gallops beside them
// across layered grassland. He lifts his lasso pole, hooks the pair and whips
// them forward — a third silk uncoils from the loop. They shoot ahead like
// arrows; the sky greys; a curtain of paper rain closes the frame.

import * as THREE from 'three';
import { at, BEAT, clamp, lerp, ease, prog, TAU, rng } from '../core.js';
import { makePerson, pose, PEOPLE } from '../art/people.js';
import { groundSheet, skyDome, cloud, ridge, stand } from '../art/set.js';
import { card } from '../engine/paper.js';
import { buildPuppet } from '../engine/puppet.js';
import { Ribbon } from '../engine/silk.js';
import { fill, poly, smooth, stroke, band, ellipse } from '../art/draw.js';

export const T0 = at(6) - 0.1;
export const FLICK = at(6, 3, 2);
export const CUT = at(8) - 0.18;

// ─── Horse ──────────────────────────────────────────────────────────────────
function makeHorse() {
  const coat = '#8a4a2a';
  const dark = '#5a2e19';
  const mane = '#1b1210';
  const leg = (front) => (ctx) => {
    fill(ctx, front ? coat : dark, (c) => smooth(c, [[-0.11, 0.05], [0.11, 0.05], [0.07, -0.35], [0.05, -0.5], [-0.05, -0.5], [-0.08, -0.35]], true, 0.3));
  };
  const shin = (front) => (ctx) => {
    fill(ctx, front ? coat : dark, (c) => poly(c, [[-0.045, 0.02], [0.045, 0.02], [0.04, -0.42], [-0.04, -0.42]]));
    fill(ctx, '#2a1c14', (c) => poly(c, [[-0.06, -0.4], [0.07, -0.4], [0.08, -0.5], [-0.06, -0.5]]));
    fill(ctx, '#f2ece0', (c) => poly(c, [[-0.05, -0.34], [0.05, -0.34], [0.055, -0.4], [-0.055, -0.4]]));
  };
  const parts = [
    { name: 'body', pin: [0, 1.35], z: 0, bounds: [-1.0, -0.45, 1.0, 0.45], draw: (ctx) => {
      fill(ctx, coat, (c) => smooth(c, [[-0.95, 0.05], [-0.8, 0.32], [-0.2, 0.38], [0.5, 0.36], [0.92, 0.2], [0.95, -0.1], [0.6, -0.33], [-0.2, -0.36], [-0.8, -0.28]], true, 0.4));
      // Saddle cloth and saddle.
      fill(ctx, '#1f4e8c', (c) => poly(c, [[-0.3, 0.36], [0.3, 0.36], [0.35, -0.2], [-0.35, -0.2]]));
      band(ctx, -0.35, 0.35, -0.16, 0.08, '#1f4e8c', '#e9c46a', 'cloud');
      fill(ctx, '#b3261e', (c) => smooth(c, [[-0.32, 0.36], [-0.26, 0.5], [0.0, 0.42], [0.26, 0.5], [0.32, 0.36]], true, 0.4));
      band(ctx, -0.3, 0.3, 0.38, 0.05, '#b3261e', '#e9c46a', 'dots');
    } },
    { name: 'neck', parent: 'body', pin: [0.75, 0.2], z: 0.005, bounds: [-0.25, -0.25, 0.75, 0.95], draw: (ctx) => {
      fill(ctx, coat, (c) => smooth(c, [[-0.2, -0.15], [0.05, 0.55], [0.3, 0.85], [0.62, 0.72], [0.7, 0.55], [0.45, 0.45], [0.25, 0.1], [0.15, -0.2]], true, 0.4));
      fill(ctx, mane, (c) => smooth(c, [[-0.18, -0.05], [0.02, 0.55], [0.28, 0.9], [0.22, 0.6], [0.02, 0.2], [-0.1, -0.1]], true, 0.4));
      fill(ctx, '#111', (c) => ellipse(c, 0.44, 0.7, 0.025, 0.025));
      stroke(ctx, '#b3261e', 0.025, (c) => {
        c.moveTo(0.52, 0.55);
        c.lineTo(0.3, 0.7);
        c.moveTo(0.5, 0.6);
        c.lineTo(0.05, 0.35);
      });
    } },
    { name: 'tail', parent: 'body', pin: [-0.92, 0.18], z: -0.004, bounds: [-0.75, -0.8, 0.05, 0.1], draw: (ctx) => {
      fill(ctx, mane, (c) => smooth(c, [[0, 0.05], [-0.25, -0.05], [-0.6, -0.5], [-0.7, -0.78], [-0.45, -0.55], [-0.15, -0.25], [0.02, -0.05]], true, 0.4));
    } },
    { name: 'fl', parent: 'body', pin: [0.6, -0.2], z: 0.006, bounds: [-0.13, -0.52, 0.13, 0.07], draw: leg(true) },
    { name: 'flK', parent: 'fl', pin: [0, -0.46], z: 0.001, bounds: [-0.08, -0.52, 0.1, 0.04], draw: shin(true) },
    { name: 'bl', parent: 'body', pin: [-0.65, -0.18], z: 0.006, bounds: [-0.13, -0.52, 0.13, 0.07], draw: leg(true) },
    { name: 'blK', parent: 'bl', pin: [0, -0.46], z: 0.001, bounds: [-0.08, -0.52, 0.1, 0.04], draw: shin(true) },
    { name: 'fr', parent: 'body', pin: [0.55, -0.2], z: -0.006, bounds: [-0.13, -0.52, 0.13, 0.07], draw: leg(false) },
    { name: 'frK', parent: 'fr', pin: [0, -0.46], z: -0.001, bounds: [-0.08, -0.52, 0.1, 0.04], draw: shin(false) },
    { name: 'br', parent: 'body', pin: [-0.7, -0.18], z: -0.006, bounds: [-0.13, -0.52, 0.13, 0.07], draw: leg(false) },
    { name: 'brK', parent: 'br', pin: [0, -0.46], z: -0.001, bounds: [-0.08, -0.52, 0.1, 0.04], draw: shin(false) },
  ];
  return buildPuppet(parts, { back: '#e8dfcf', px: 420 });
}

/** Gallop: one stride per beat. Returns joint angles and body bob. */
function gallop(h, t) {
  const ph = (TAU * t) / BEAT;
  const legs = [['fl', 0.0], ['fr', 0.35], ['bl', 2.4], ['br', 2.75]];
  for (const [n, o] of legs) {
    const a = Math.sin(ph + o);
    h.j[n].rotation.z = 0.75 * a;
    h.j[n + 'K'].rotation.z = n[0] === 'f' ? -Math.max(0, Math.cos(ph + o)) * 1.3 : Math.max(0, -Math.cos(ph + o)) * 1.1;
  }
  h.j.body.position.y = 1.35 + 0.07 * Math.sin(ph * 1 + 0.6);
  h.j.body.rotation.z = 0.06 * Math.sin(ph + 1.8);
  h.j.neck.rotation.z = 0.12 * Math.sin(ph + 2.4);
  h.j.tail.rotation.z = 0.25 * Math.sin(ph + 0.5);
}

function yurt(seed) {
  return card({
    bounds: [-2.2, 0, 2.2, 3.1],
    px: 110,
    draw: (ctx) => {
      fill(ctx, '#f4f1ea', (c) => poly(c, [[-2, 0], [-2, 1.6], [0, 2.9], [2, 1.6], [2, 0]]));
      band(ctx, -2, 2, 1.45, 0.28, '#1f4e8c', '#f4f1ea', 'cloud');
      band(ctx, -1.5, 1.5, 2.2, 0.16, '#1f4e8c', '#e9c46a', 'diamond');
      fill(ctx, '#b3261e', (c) => poly(c, [[-0.4, 0], [-0.4, 1.05], [0.4, 1.05], [0.4, 0]]));
      band(ctx, -0.4, 0.4, 0.95, 0.12, '#e9c46a', '#b3261e', 'dots');
      fill(ctx, '#e9c46a', (c) => ellipse(c, 0, 2.95, 0.12, 0.12));
    },
  });
}

function grassTuft(seed, h = 0.5, col = '#6fa63e') {
  const r = rng(seed);
  return card({
    bounds: [-0.4, 0, 0.4, h * 1.1],
    px: 300,
    draw: (ctx) => {
      for (let i = 0; i < 9; i++) {
        const x = -0.3 + r() * 0.6;
        const tip = [x + (r() - 0.5) * 0.3, h * (0.6 + r() * 0.5)];
        fill(ctx, i % 3 ? col : '#8bbd4d', (c) => poly(c, [[x - 0.025, 0], tip, [x + 0.025, 0]]));
      }
    },
  });
}

export function createMongol(env) {
  const g = new THREE.Group();
  const r = rng(303);
  const sky = skyDome('#5d9fd8', 900, 0.4);
  g.add(sky);
  g.add(groundSheet(1200, 400, (ctx) => {
    ctx.fillStyle = '#79ad45';
    ctx.fillRect(-600, -200, 1200, 400);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = r() < 0.5 ? '#8cbc55' : '#6a9d3c';
      ctx.beginPath();
      ctx.ellipse(-600 + r() * 1200, -200 + r() * 400, 2 + r() * 6, 0.6 + r() * 1.5, 0, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = ['#f4d35e', '#ffffff', '#e76f51', '#b5179e'][i % 4];
      ctx.beginPath();
      ctx.arc(-600 + r() * 1200, -200 + r() * 400, 0.12, 0, TAU);
      ctx.fill();
    }
  }, 3));
  // Rolling hills, lightening with distance.
  const hillCols = ['#6ea23f', '#86b852', '#9dc86b', '#b6d48b'];
  hillCols.forEach((col, k) => {
    const z = -40 - k * 70;
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = -700 + i * 40;
      pts.push([x, 8 + k * 7 + 8 * Math.sin(i * 0.45 + k) + 4 * Math.sin(i * 1.3 + k * 2)]);
    }
    const hill = ridge(pts, 0, col, { px: 2, bevel: 0.5 });
    hill.position.set(0, -2, z);
    g.add(hill);
  });
  for (let i = 0; i < 8; i++) {
    const y = yurt(i);
    y.position.set(-40 + i * 38 + r() * 10, 0, -30 - r() * 18);
    y.scale.setScalar(1 + r() * 0.3);
    g.add(y);
  }
  // Big summer cumulus, in layers.
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const c = cloud(70 + r() * 60, 26 + r() * 14, 900 + i, ['#ffffff', '#eef3f8', '#dde7f1']);
    c.position.set(-250 + i * 70 + r() * 30, 30 + r() * 35, -220 - r() * 140);
    g.add(c);
    clouds.push(c);
  }
  // Foreground grass that whips past the lens.
  const tuftProtos = Array.from({ length: 5 }, (_, i) => grassTuft(40 + i, 0.45 + i * 0.08));
  for (let i = 0; i < 160; i++) {
    const tft = tuftProtos[i % 5].clone();
    tft.position.set(-20 + r() * 260, 0, 1.5 + r() * 5.5);
    g.add(tft);
  }
  for (let i = 0; i < 120; i++) {
    const tft = tuftProtos[i % 5].clone();
    tft.position.set(-20 + r() * 260, 0, -2 - r() * 10);
    g.add(tft);
  }

  // Horse and rider.
  const horse = makeHorse();
  g.add(horse.root);
  const rider = makePerson({ ...PEOPLE.mongolRider(), detail: 900 });
  horse.j.body.add(rider.root);
  rider.root.position.set(-0.05, -0.55, 0.12);
  // The lasso pole, in his right hand.
  const pole = card({
    bounds: [-0.03, -0.2, 0.03, 4.6],
    px: 200,
    draw: (ctx) => {
      fill(ctx, '#caa56a', (c) => poly(c, [[-0.02, -0.2], [-0.012, 4.4], [0.012, 4.4], [0.02, -0.2]]));
      ctx.strokeStyle = '#e8dcc2';
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.ellipse(-0.12, 4.45, 0.14, 0.2, 0.3, 0, TAU);
      ctx.stroke();
    },
  });
  rider.j.wristB.add(pole);
  pole.position.set(0, -0.06, 0.01);

  // Galloping line.
  const speed = (t) => lerp(13, 17, prog(t, T0, CUT));
  const horseX = (t) => 13 * (t - T0) + 2 * (t - T0) ** 2 / (CUT - T0);
  const riderPose = (t) => {
    const lift = prog(t, FLICK - 0.55, FLICK - 0.1, ease.inOutCubic);
    const whip = prog(t, FLICK - 0.08, FLICK + 0.12, ease.outQuart);
    const back = prog(t, FLICK + 0.4, FLICK + 1.0, ease.inOutCubic);
    return {
      thighA: 1.45, kneeA: -1.35, thighB: 1.35, kneeB: -1.25,
      raiseA: 0.9, elbowA: 1.6,
      raiseB: lerp(lerp(0.9, 2.45, lift), 1.3, whip) + (back * 0.2),
      elbowB: lerp(1.1, 0.2, lift),
      wristB: lerp(0, -0.5, lift) + 1.3 * whip - back * 0.6,
      lean: -0.12 + 0.03 * Math.sin((TAU * t) / BEAT),
      hipY: 0.03 * Math.sin((TAU * t) / BEAT + 1),
      turn: 0.35,
      head: 0.05,
    };
  };
  // Pole tip in world space (approximate, from the rider's hand chain).
  const poleTip = (t) => {
    const p = riderPose(t);
    const a = (p.lean ?? 0) + p.raiseB + p.elbowB + p.wristB;
    const hx = horseX(t) - 0.05 + 0.2 + Math.sin(p.raiseB) * 0.5;
    const hy = 1.35 - 0.55 + 0.96 + 0.4 + Math.cos(p.raiseB) * -0.5;
    return [hx - Math.sin(a) * 4.4, hy + Math.cos(a) * 4.4 * 0.9, 0.2];
  };

  // ── Silk ──────────────────────────────────────────────────────────────────
  // They overtake the lens, run beside the horse, get hooked and whipped.
  const boost = (t) => 6 * ease.outCubic(prog(t, FLICK, FLICK + 0.8)) * (t - FLICK > 0 ? t - FLICK : 0);
  const head1 = (t) => {
    const x = horseX(t) + lerp(-6, 1.2, prog(t, T0, T0 + 0.9, ease.outCubic)) + boost(t) * 2.2;
    const hook = prog(t, FLICK - 0.3, FLICK, ease.inOutCubic) * (1 - prog(t, FLICK + 0.1, FLICK + 0.6));
    return [x, 2.25 + 0.3 * Math.sin(t * 5.1) + 1.9 * hook, lerp(1.6, 0.9, prog(t, T0, T0 + 0.7)) + 0.3 * Math.sin(t * 3.7)];
  };
  const head2 = (t) => {
    const p = head1(t - 0.07);
    return [p[0] - 0.4, p[1] - 0.45 + 0.2 * Math.sin(t * 4.3 + 1), p[2] + 0.5];
  };
  const born3 = FLICK + 0.05;
  const head3 = (t) => {
    const tip = poleTip(Math.min(t, born3 + 0.05));
    const f = head1(t - 0.12);
    const k = prog(t, born3, born3 + 0.5, ease.inOutCubic);
    return [lerp(tip[0], f[0] - 0.8, k), lerp(tip[1], f[1] + 0.45, k), lerp(tip[2], f[2] - 0.4, k)];
  };
  const opts = { segments: 200, history: 2.5, wave: { amp: 0.22, len: 2.8, freq: 2.2 }, twist: { perLen: 0.6, amp: 1.0, len: 3.2, freq: 1.5 } };
  const silk1 = new Ribbon({ head: head1, length: 8, width: 0.15, ...opts });
  const silk2 = new Ribbon({ head: head2, length: 7, width: 0.14, ...opts });
  const silk3 = new Ribbon({ head: head3, born: born3, length: 6.5, width: 0.14, ...opts, wave: { amp: 0.3, len: 2.2, freq: 2.6 } });
  g.add(silk1.mesh, silk2.mesh, silk3.mesh);

  // Grass shreds kicked up by the hooves and the whip.
  const shredProto = card({ bounds: [-0.05, -0.02, 0.05, 0.02], px: 400, back: '#6a9d3c', draw: (ctx) => fill(ctx, '#8cbc55', (c) => poly(c, [[-0.05, 0], [0, 0.02], [0.05, 0], [0, -0.02]])) });
  const shreds = [];
  for (let i = 0; i < 90; i++) {
    const m = shredProto.clone();
    g.add(m);
    shreds.push({ m, t0: T0 + r() * (CUT - T0), vx: r() * 3, vy: 2 + r() * 4, vz: (r() - 0.5) * 3, spin: r() * 20 });
  }

  // Rain curtain: translucent paper strips that close the frame.
  const rain = new THREE.Group();
  const stripProto = card({ bounds: [-0.012, -1.2, 0.012, 1.2], px: 200, glowThrough: 0.4, cast: false, draw: (ctx) => fill(ctx, 'rgba(236,240,244,0.95)', (c) => poly(c, [[-0.012, -1.2], [0.012, -1.2], [0.012, 1.2], [-0.012, 1.2]])) });
  const strips = [];
  for (let i = 0; i < 700; i++) {
    const m = stripProto.clone();
    rain.add(m);
    strips.push({ m, x: r(), y: r(), z: r(), w: 0.6 + r() * 2.5 });
  }
  g.add(rain);

  const cam = env.camera;
  const target = new THREE.Vector3();

  function update(t) {
    const hx = horseX(t);
    horse.root.position.set(hx, 0, 0);
    gallop(horse, t);
    pose(rider, riderPose(t));
    silk1.update(t);
    silk2.update(t);
    silk3.update(t);

    for (const s of shreds) {
      const d = t - s.t0;
      const on = d > 0 && d < 1.2;
      s.m.visible = on;
      if (!on) continue;
      const x0 = horseX(s.t0) - 0.6;
      s.m.position.set(x0 + s.vx * d, 0.1 + s.vy * d - 4.9 * d * d, 0.4 + s.vz * d);
      s.m.rotation.set(s.spin * d, s.spin * d * 0.7, 0);
    }
    // Weather: storm light and rain in the last beats.
    const storm = prog(t, CUT - 1.1, CUT - 0.1, ease.inQuad);
    const curtain = prog(t, CUT - 0.55, CUT, ease.inCubic);
    // Camera: low, close, wide — tracking beside the horse; drifts ahead as the silks bolt.
    const ahead = prog(t, FLICK + 0.1, CUT, ease.inOutCubic);
    const cx = hx + lerp(0.2, 4.2, ahead);
    let pos = [cx, lerp(0.55, 1.1, ahead), lerp(3.7, 4.6, ahead)];
    let look = [cx + lerp(0.5, 3.2, ahead), lerp(1.75, 2.1, ahead), 0];
    // Entry: start a hand's breadth from the lead silk (the wipe from shot 02).
    const enter = 1 - prog(t, T0, T0 + 0.42, ease.outCubic);
    if (enter > 0) {
      const i = Math.round(0.35 * silk1.o.segments);
      const P = silk1.pos;
      const b = [(P[i * 6] + P[i * 6 + 3]) / 2, (P[i * 6 + 1] + P[i * 6 + 4]) / 2, (P[i * 6 + 2] + P[i * 6 + 5]) / 2];
      const into = [b[0] - 0.1, b[1] - 0.06, b[2] + 0.22];
      pos = pos.map((v, k) => lerp(v, into[k], enter));
      look = look.map((v, k) => lerp(v, b[k], enter));
    }
    for (const s of strips) {
      const vis = curtain > 0.02 || storm > 0.3;
      s.m.visible = vis;
      if (!vis) continue;
      const fall = ((s.y - t * 1.8 * s.w) % 1 + 1) % 1;
      const dz = lerp(7, 0.12, curtain * s.z);
      const spread = 1.1 * dz + 0.6;
      s.m.position.set(pos[0] + (look[0] - pos[0]) * (dz / 8) + (s.x - 0.5) * spread * 2, pos[1] - 1.5 + fall * 3.5, pos[2] - dz);
      s.m.scale.set(1 + curtain * 6 * (1 - s.z), 1, 1);
      s.m.visible = vis && (s.z < storm * 0.4 + curtain);
    }
    cam.position.set(...pos);
    target.set(...look);
    cam.lookAt(target);
    cam.fov = lerp(70, 74, ahead);
    cam.near = 0.03;
    cam.updateProjectionMatrix();
    cam.userData.dof = { focus: Math.max(1, cam.position.distanceTo(horse.root.position) - 0.5), aperture: 0.004, maxBlur: 14 };
    env.light({
      sun: [-3, 8, 7],
      sunColor: new THREE.Color('#fff4e2').lerp(new THREE.Color('#aeb8c4'), storm).getStyle(),
      sunIntensity: lerp(3.6, 1.2, storm),
      hemiSky: new THREE.Color('#cfe3f5').lerp(new THREE.Color('#8f9aa6'), storm).getStyle(),
      hemiGround: '#7c9a4a',
      hemiIntensity: lerp(1.15, 1.35, storm),
      bg: '#5d9fd8',
      fog: [new THREE.Color('#b9d4ea').lerp(new THREE.Color('#9aa5b0'), storm).getStyle(), lerp(80, 30, storm), lerp(700, 200, storm)],
      shadowCenter: [hx, 1, 0],
      shadowSize: 12,
      exposure: 1.0,
    });
    sky.material.color.set(new THREE.Color('#ffffff').lerp(new THREE.Color('#9aa3ad'), storm));
  }
  return { group: g, update, start: T0, end: CUT, silks: [silk1, silk2, silk3] };
}
