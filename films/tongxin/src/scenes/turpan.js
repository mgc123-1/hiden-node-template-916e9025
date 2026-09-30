// Shot 01 · 吐鲁番 · 维吾尔族
// Hook: the frame is full of silk. DUM — it whips away and we are inside a
// sunlit paper courtyard, mid-spin. The camera orbits and pulls back through
// the grape trellis; the girl slides her neck on the beats; on bar 3 she
// flicks her wrist and the silk leaves her hand like a snake for the sky.

import * as THREE from 'three';
import { at, BEAT, S8, clamp, lerp, ease, prog, keys, catmull, TAU, rng } from '../core.js';
import { makePerson, pose, PEOPLE, ATLAS_B, ATLAS_C } from '../art/people.js';
import { groundSheet, skyDome, cloud, grapeLeafCard, grapeBunch, post, turpanWall, flamingMountains, carpet, dap, stand } from '../art/set.js';
import { Ribbon } from '../engine/silk.js';
import { handWorld } from '../engine/fk.js';
import { fill, poly } from '../art/draw.js';

export const T0 = at(1);
export const T1 = at(4);
export const FLICK = at(3);
export const CUT = at(4) - 0.2; // hidden cut inside the cloud layer

export function createTurpan(env) {
  const g = new THREE.Group();
  const r = rng(101);

  // Ground, carpet, sky, distance.
  g.add(groundSheet(80, 80, (ctx) => {
    ctx.fillStyle = '#e4c79c';
    ctx.fillRect(-40, -40, 80, 80);
  }, 12));
  const cp = carpet(3.4, 4.6);
  cp.position.set(0, 0.004, 0.2);
  g.add(cp);
  const wall = turpanWall(18, 3.6);
  wall.position.set(0, 0, -5.2);
  g.add(wall);
  for (const [z, h, col, gul, s] of [[-70, 22, '#c4552d', '#8e2f1b', 5], [-120, 30, '#d9774a', '#b4512e', 6], [-190, 34, '#e3a27a', '#cf8458', 7]]) {
    const m = flamingMountains(420, h, s, col, gul);
    m.position.set(0, 0, z);
    g.add(m);
  }
  g.add(skyDome('#f4d9b4'));
  for (let i = 0; i < 7; i++) {
    const c = cloud(24 + r() * 18, 6 + r() * 3, 200 + i, ['#fbf1e0', '#f3dcc0']);
    c.position.set(-140 + i * 45 + r() * 20, 40 + r() * 30, -240 - r() * 40);
    g.add(c);
  }

  // Trellis: posts, beams, a canopy of leaves, hanging bunches.
  for (const [x, z] of [[-3.3, 2.2], [3.3, 2.2], [-3.3, -3.0], [3.3, -3.0]]) {
    const p = post(3.0, '#1f8a8a');
    p.position.set(x, 0, z);
    g.add(p);
  }
  for (const z of [2.2, -3.0]) {
    const beam = stand([-3.6, -0.08, 3.6, 0.08], (ctx) => fill(ctx, '#6b3f22', (c) => poly(c, [[-3.6, -0.08], [-3.6, 0.08], [3.6, 0.08], [3.6, -0.08]])), { px: 80 });
    beam.position.set(0, 3.0, z);
    g.add(beam);
  }
  const leafProtos = Array.from({ length: 8 }, (_, i) => grapeLeafCard(300 + i, 0.2 + (i % 3) * 0.03));
  const leaves = new THREE.Group();
  for (let i = 0; i < 420; i++) {
    const x = -4 + r() * 8;
    const z = -3.4 + r() * 6.2;
    // Keep a gap in the canopy above the carpet for the silk to escape through.
    if (Math.hypot(x - 0.6, z + 0.9) < 0.75 && r() < 0.85) continue;
    const L = leafProtos[i % leafProtos.length].clone();
    L.position.set(x, 3.0 + r() * 0.35, z);
    L.rotation.set(-Math.PI / 2 + (r() - 0.5) * 1.1, r() * TAU, (r() - 0.5) * 0.8);
    leaves.add(L);
  }
  // Leaves drooping from the front edge — the curtain we pull back through.
  for (let i = 0; i < 70; i++) {
    const L = leafProtos[(i + 3) % leafProtos.length].clone();
    L.position.set(-4 + r() * 8, 2.55 + r() * 0.5, 2.3 + r() * 0.5);
    L.rotation.set((r() - 0.5) * 0.9, (r() - 0.5) * 1.2, Math.PI + (r() - 0.5) * 1.4);
    leaves.add(L);
  }
  g.add(leaves);
  const bunchProtos = Array.from({ length: 6 }, (_, i) => grapeBunch(400 + i, i % 2 === 0, 0.28 + (i % 3) * 0.05));
  for (let i = 0; i < 46; i++) {
    const b = bunchProtos[i % bunchProtos.length].clone();
    b.position.set(-3.8 + r() * 7.6, 2.95 - r() * 0.15, -3.2 + r() * 5.8);
    b.rotation.y = (r() - 0.5) * 0.8;
    g.add(b);
  }

  // People.
  const girl = makePerson({ ...PEOPLE.uyghurGirl(), detail: 1500 });
  g.add(girl.root);
  const dancers = [
    { p: makePerson(PEOPLE.uyghurWoman(ATLAS_B, 31)), x: -2.1, z: -1.9, ph: 0.3 },
    { p: makePerson(PEOPLE.uyghurWoman(ATLAS_C, 41, { hat: { kind: 'doppa', base: '#b5179e' } })), x: 2.3, z: -2.3, ph: 1.4 },
    { p: makePerson(PEOPLE.uyghurWoman(['#e63946', '#ffb703', '#023047', '#8ecae6', '#fb8500'], 51)), x: -0.9, z: -3.9, ph: 2.1 },
  ];
  const drummers = [
    { p: makePerson(PEOPLE.uyghurMan()), x: -3.5, z: -3.0, ph: 0 },
    { p: makePerson(PEOPLE.uyghurMan({ top: { color: '#f4efe6', vest: '#3a0ca3', vestTrim: '#d4a24c', sash: '#c9a227' } })), x: 3.6, z: -3.3, ph: 0.5 },
  ];
  for (const d of [...dancers, ...drummers]) {
    d.p.root.position.set(d.x, 0, d.z);
    d.p.root.rotation.y = -d.x * 0.08;
    g.add(d.p.root);
  }
  for (const d of drummers) {
    const drum = dap(0.24);
    drum.position.set(0.02, 1.12, 0.12);
    d.p.j.hips.add(drum);
    d.drum = drum;
  }

  // Clouds overhead: the layer we climb into at the end of the shot.
  const ceiling = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const c = cloud(9 + r() * 10, 3 + r() * 2.5, 500 + i, ['#fdf7ee', '#f2e4cf', '#e8d3b6']);
    c.position.set(-14 + r() * 24, 17 + r() * 5, -10 + r() * 14);
    c.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.6);
    ceiling.add(c);
  }
  g.add(ceiling);

  // ── Choreography ──────────────────────────────────────────────────────────
  const B = BEAT;
  const beatPhase = (t) => ((t % B) + B) % B / B;
  const spinEnd = at(2);
  const camEndAz = 0.32;

  // The girl's facing: slow drift, a fast 1¼ spin after the DUM, then she
  // follows the camera round.
  // Angular velocity: she has been spinning; she settles into a slow drift for
  // the macro; the DUM snaps her into a fast spin that brakes to face camera.
  const omega = (t) => {
    if (t < -0.9) return 2.8;
    if (t < -0.15) return lerp(2.8, 0.45, ease.inOutCubic((t + 0.9) / 0.75));
    if (t < at(1, 1)) return 0.45;
    if (t < at(1, 1) + 0.06) return lerp(0.45, 11.5, (t - at(1, 1)) / 0.06);
    if (t < spinEnd) return 11.5 * (1 - ease.inCubic((t - at(1, 1) - 0.06) / (spinEnd - at(1, 1) - 0.06)) * 0.985);
    return 0;
  };
  const TT0 = -10;
  const TDT = 1 / 1000;
  const turnTable = new Float64Array(Math.ceil((spinEnd - TT0) / TDT) + 2);
  for (let i = 1; i < turnTable.length; i++) turnTable[i] = turnTable[i - 1] + omega(TT0 + (i - 0.5) * TDT) * TDT;
  const rawTurn = (t) => {
    const f = (Math.min(t, spinEnd) - TT0) / TDT;
    const i = Math.max(0, Math.min(turnTable.length - 2, Math.floor(f)));
    return turnTable[i] + (turnTable[i + 1] - turnTable[i]) * (f - i);
  };
  // Offset so the spin comes to rest facing the camera.
  const endRaw = rawTurn(spinEnd);
  const turnOffset = camEndAz - (endRaw - Math.round((endRaw - camEndAz) / TAU) * TAU) ;
  const turnAt = (t) => {
    if (t < spinEnd) return rawTurn(t) + turnOffset;
    return endRaw + turnOffset + 0.12 * Math.sin((t - spinEnd) * 3.3) - lerp(0, camEndAz, prog(t, spinEnd, FLICK, ease.inOutCubic));
  };
  const girlPose = (t) => {
    const spinning = t < spinEnd;
    const dt = 0.01;
    const spinVel = (turnAt(t + dt) - turnAt(t - dt)) / (2 * dt);
    // Neck slide (移颈): a snap to the side on every beat through bar 2.
    let slide = 0;
    if (t >= spinEnd && t < FLICK + 0.2) {
      const k = Math.floor((t - spinEnd) / B);
      const ph = beatPhase(t - spinEnd);
      const from = k % 2 ? 1 : -1;
      slide = 0.024 * lerp(-from, from, ease.outQuart(clamp(ph / 0.35)));
    }
    // Ribbon arm: out and high during the spin, figure-eights in the dance,
    // a whip-snap on the flick.
    const w8 = TAU * (t - spinEnd) / (2 * B);
    let raiseB = spinning ? 1.85 : 1.55 + 0.55 * Math.sin(w8);
    let elbowB = spinning ? 0.25 : 0.45 + 0.35 * Math.sin(w8 + 1.2);
    let wristB = spinning ? 0.2 : 0.4 * Math.sin(w8 * 2);
    const fl = prog(t, FLICK - 0.12, FLICK + 0.05, ease.inCubic);
    const after = prog(t, FLICK + 0.05, FLICK + 0.6, ease.outCubic);
    if (t > FLICK - 0.12) {
      raiseB = lerp(lerp(raiseB, 1.2, fl), 2.75, prog(t, FLICK - 0.02, FLICK + 0.08, ease.outQuart));
      elbowB = lerp(elbowB, -0.1, fl);
      wristB = lerp(wristB, -0.6, fl) + 0.9 * prog(t, FLICK - 0.02, FLICK + 0.06);
    }
    return {
      turn: turnAt(t),
      raiseA: spinning ? 2.3 : 2.55 + 0.1 * Math.sin(w8 * 2),
      elbowA: spinning ? 0.9 : 1.5,
      wristA: 0.7 * Math.sin((TAU * t) / B),
      raiseB,
      elbowB,
      wristB,
      neckSlide: slide,
      head: 0.04 * Math.sin(t * 2.1) - 0.08 * after,
      skirtFlare: clamp(Math.abs(spinVel) / 9) * 0.55 + 0.04,
      skirtSwing: -clamp(spinVel / 30, -0.12, 0.12),
      braid: clamp(-spinVel / 12, -0.5, 0.5),
      hipY: -0.015 * Math.abs(Math.sin((Math.PI * t) / B)),
    };
  };

  // Hand → silk. Held until the flick, then free flight.
  const hold = (t) => handWorld(girlPose(t), 'B', [0, 0, 0], girl.spec.scale ?? 1);
  const release = hold(FLICK + 0.04);
  const flight = [
    release,
    [release[0] + 0.3, release[1] + 1.2, release[2] - 0.4],
    [0.7, 3.2, -0.9],
    [0.0, 6.5, -2.2],
    [-1.6, 10.5, -3.6],
    [-0.8, 15.5, -5.0],
    [-2.2, 21.5, -6.5],
  ];
  const flightT = [FLICK + 0.04, FLICK + 0.25, FLICK + 0.55, FLICK + 0.95, FLICK + 1.35, FLICK + 1.75, FLICK + 2.2];
  const flightAt = (t) => {
    let i = 0;
    while (i < flightT.length - 2 && t > flightT[i + 1]) i++;
    const u = (i + clamp((t - flightT[i]) / (flightT[i + 1] - flightT[i]))) / (flightT.length - 1);
    const p = catmull(flight, u);
    // A snake's weave on top of the climb.
    const w = Math.sin((t - FLICK) * 9) * 0.35 * prog(t, FLICK + 0.1, FLICK + 0.5);
    return [p[0] + w, p[1], p[2] + w * 0.4];
  };
  const head = (t) => (t <= FLICK + 0.04 ? hold(t) : flightAt(t));
  // While she holds it, the silk flares out and down from her hand in a
  // spiral cone (centrifugal + gravity); once free it simply streams.
  const heldness = (t) => 1 - prog(t, FLICK, FLICK + 0.7, ease.inOutCubic);
  const deform = (u, x, y, z, t) => {
    const k = heldness(t);
    if (k <= 0) return [x, y, z];
    const rr = Math.hypot(x, z) || 1;
    const out = 1 + k * (1.9 * u);
    return [x * out, y - k * (0.85 * u * u + 0.1 * u), z * out];
  };
  const silk = new Ribbon({ head, deform, length: 6.8, width: 0.15, segments: 240, history: 8, wave: { amp: 0.12, len: 2.2, freq: 1.4 }, twist: { perLen: 0.6, amp: 1.0, len: 3.4, freq: 0.8 } });
  g.add(silk.mesh);

  // ── Camera ────────────────────────────────────────────────────────────────
  const cam = env.camera;
  const target = new THREE.Vector3();
  // Macro framing: find where a far loop of the silk sits mid-hook.
  const MACRO_S = 5.2;
  let macro = null;
  const macroSetup = () => {
    if (macro) return macro;
    const a = silk._probe(0.0, MACRO_S);
    const b = silk._probe(at(1, 1), MACRO_S);
    const m = silk._probe(at(1, 1) * 0.5, MACRO_S);
    const az = Math.atan2(m[0], m[2]);
    const r0 = Math.hypot(m[0], m[2]);
    macro = { az, r0, y: m[1], a, b };
    return macro;
  };
  const orbit = (t) => {
    const M = macroSetup();
    const u = prog(t, at(1, 1), spinEnd, ease.outCubic);
    const az = lerp(M.az, camEndAz + (M.az > camEndAz ? 0 : 0), u);
    const rad = lerp(M.r0 + 0.55, 1.75, ease.inOutQuad(u));
    const h = lerp(M.y + 0.05, 1.42, ease.inOutQuad(u));
    return { pos: [Math.sin(az) * rad, h, Math.cos(az) * rad], look: [0, lerp(1.1, 1.42, u), 0] };
  };
  const wide = { pos: [0.4, 1.8, 7.9], look: [0, 1.5, -1.2] };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const cameraAt = (t) => {
    const M = macroSetup();
    if (t < at(1, 1)) {
      // Hook: a hand's breadth from a loop of silk drifting past; the
      // courtyard behind is nothing but warm, out-of-focus colour.
      const pos = [Math.sin(M.az) * (M.r0 + 0.55), M.y + 0.05, Math.cos(M.az) * (M.r0 + 0.55)];
      const p = silk._probe(t, MACRO_S);
      const look = [lerp(p[0], 0, 0.35), lerp(p[1], 1.2, 0.35), lerp(p[2], 0, 0.35)];
      return { pos, look, fov: 30, dof: { focus: Math.max(0.2, dist(pos, p)), aperture: 0.03, maxBlur: 26 } };
    }
    if (t < spinEnd) {
      // DUM: the silk whips away, focus racks to her, the camera wheels round.
      const o = orbit(t);
      const rack = prog(t, at(1, 1), at(1, 1) + 0.3, ease.inOutCubic);
      const f = lerp(0.55, dist(o.pos, [0, 1.4, 0]), rack);
      return { pos: o.pos, look: o.look, fov: lerp(30, 36, rack), dof: { focus: f, aperture: lerp(0.03, 0.012, rack), maxBlur: 22 } };
    }
    if (t < FLICK) {
      const o = orbit(spinEnd);
      const u = prog(t, spinEnd, FLICK, ease.inOutCubic);
      const pos = o.pos.map((v, i) => lerp(v, wide.pos[i], u));
      return { pos, look: o.look.map((v, i) => lerp(v, wide.look[i], u)), fov: 36, dof: { focus: dist(pos, [0, 1.4, 0]), aperture: lerp(0.012, 0.004, u), maxBlur: 16 } };
    }
    // Chase: the camera rises after the silk through the leaves into cloud.
    const h = head(t);
    const hb = head(t - 0.3);
    const k = prog(t, FLICK, FLICK + 0.5, ease.inOutCubic);
    const chase = [hb[0] + 0.55, hb[1] - 0.9, hb[2] + 1.4];
    const pos = wide.pos.map((v, i) => lerp(v, chase[i], k));
    return { pos, look: wide.look.map((v, i) => lerp(v, h[i], k)), fov: lerp(36, 48, k), dof: { focus: dist(pos, h), aperture: 0.006, maxBlur: 14 } };
  };

  // Silk probe: a point on the body s metres behind the head (for framing).
  silk._probe = (t, s) => {
    silk.update(t);
    const i = Math.round((s / silk.o.length) * silk.o.segments);
    const p = silk.pos;
    return [(p[i * 6] + p[i * 6 + 3]) / 2, (p[i * 6 + 1] + p[i * 6 + 4]) / 2, (p[i * 6 + 2] + p[i * 6 + 5]) / 2];
  };

  function update(t) {
    pose(girl, girlPose(t));
    for (const d of dancers) {
      const ph = t * 2.2 + d.ph;
      pose(d.p, { raiseA: 2.2 + 0.4 * Math.sin(ph), raiseB: 1.2 + 0.6 * Math.sin(ph + 1), elbowA: 1.2, elbowB: 0.6, wristA: 0.6 * Math.sin((TAU * t) / BEAT + d.ph), wristB: 0.5 * Math.sin((TAU * t) / BEAT), neckSlide: 0.015 * Math.sin((Math.PI * t) / BEAT + d.ph), skirtFlare: 0.08 + 0.05 * Math.sin(ph), turn: -d.x * 0.08 + 0.25 * Math.sin(t * 1.3 + d.ph), hipY: -0.012 * Math.abs(Math.sin((Math.PI * t) / BEAT)) });
    }
    for (const d of drummers) {
      // Strike on the beat: the hand comes down onto the skin.
      const ph = beatPhase(t + d.ph * S8);
      const hit = Math.exp(-ph * 9);
      pose(d.p, { raiseA: 0.55, elbowA: 1.9, raiseB: 0.35 + 0.5 * (1 - hit), elbowB: 1.6 - 0.5 * hit, wristB: -0.4 * hit, lean: 0.03 * Math.sin(t * 3 + d.ph), hipY: -0.01 * hit, turn: -d.x * 0.06 });
      d.drum.rotation.z = 0.05 * Math.sin(t * 4);
    }
    silk.update(t);
    const c = cameraAt(t);
    cam.position.set(...c.pos);
    target.set(...c.look);
    cam.lookAt(target);
    cam.fov = c.fov ?? 38;
    cam.userData.dof = c.dof ?? null;
    cam.near = t < at(1, 1) + 0.3 ? 0.02 : 0.05;
    cam.updateProjectionMatrix();
    env.light({
      sun: [-6, 11, 7],
      sunColor: '#fff0da',
      sunIntensity: 3.2,
      hemiSky: '#fbe8cf',
      hemiGround: '#b48a5a',
      hemiIntensity: 1.2,
      bg: '#f4d9b4',
      fog: ['#f1d5ad', 45, 300],
      shadowCenter: [0, 1.2, -0.5],
      shadowSize: 9,
      exposure: 1.0,
    });
  }

  return { group: g, update, start: T0, end: CUT, silk, girl };
}
