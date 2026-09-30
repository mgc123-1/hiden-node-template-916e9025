// The camera: one continuous move, no cuts. Zoom is interpolated in log space
// so a 20× dive feels as even as a 2× one.

import { at, DURATION } from './core/time.js';
import { clamp, ease, lerp, noise1, smoothstep, springKick } from './core/math.js';
import { HOOK_PLUCK, END_PLUCK, DROP, DIVE, REWIND, SILENCE, cues, TAUT_T0 } from './score.js';
import { DEPART, LEAD_WARP } from './world/journey.js';

const lz = (a, b, u) => Math.exp(lerp(Math.log(a), Math.log(b), u));
const seg = (t, a, b, fn = ease.inOutCubic) => fn(clamp((t - a) / (b - a)));

export function makeCamera(world) {
  const { journey, loom } = world;
  const lead = journey.path;
  const drift = [noise1(71), noise1(72), noise1(73)];
  const F = journey.field;
  const fieldCx = (F.x0 + F.x1) / 2;
  const headX = (t) => lead.headAt(t).x;
  const HOLD = { x: 470, y: -10, z: 1 };
  const flagCx = loom.Xa + 148;
  const diveRow = 27; // warp 33 floats over weft 27
  const dive = { x: loom.rowX(diveRow), y: loom.warpY(LEAD_WARP) };
  const END = { x: 470, y: 36, z: 0.94 };

  function base(t) {
    // ── Hook: macro on the paper, then pulled back by the needle's flight.
    if (t < 0.7) return { x: 14, y: 8, z: lerp(5.0, 5.5, ease.inOutSine(t / 0.7)), r: 0 };
    if (t < 1.36) {
      const u = seg(t, 0.7, 1.36, ease.inOutQuart);
      return { x: lerp(14, HOLD.x, u), y: lerp(8, HOLD.y, u), z: lz(5.5, HOLD.z, u), r: 0 };
    }
    // ── Bars 2–5: follow the needle, re-framing on each downbeat.
    if (t < at(6)) {
      // Lead offsets (world units ahead of centre) and zoom per section.
      const follow = (dx) => headX(t) - dx;
      let x = HOLD.x;
      let y = HOLD.y;
      let z = HOLD.z;
      const kF = seg(t, DEPART, DEPART + 0.9, ease.inOutQuad);
      x = lerp(HOLD.x, follow(260), kF);
      y = lerp(HOLD.y, -70, kF);
      z = lerp(1, 0.96, kF);
      const kM = seg(t, 4.78, 5.4);
      x = lerp(x, follow(640), kM);
      y = lerp(y, -420, kM);
      z = lz(z, 0.54, kM);
      const kR = seg(t, 7.3, 7.95);
      x = lerp(x, follow(430), kR);
      y = lerp(y, -60, kR);
      z = lz(z, 0.8, kR);
      const kH = seg(t, 9.55, 10.25, ease.inOutQuart);
      x = lerp(x, fieldCx - 90, kH);
      y = lerp(y, 10, kH);
      z = lz(z, 0.9, kH);
      x += (t - 10.25) * 26 * kH; // slow drift across the field
      return { x, y, z, r: 0 };
    }
    // ── Bar 6: pull back to find everyone; then roll into the loom.
    if (t < SILENCE[0]) {
      const kO = seg(t, at(6), at(6) + 0.95, ease.outCubic);
      const front = headX(Math.min(t, TAUT_T0));
      const x0 = fieldCx - 90 + (at(6) - 10.25) * 26;
      let x = lerp(x0, front - 1500, kO);
      let y = lerp(10, -260, kO);
      let z = lz(0.9, 0.25, kO);
      let r = 0;
      const kD = seg(t, TAUT_T0 - 0.05, at(7) + 0.02, ease.inOutCubic);
      x = lerp(x, loom.Xa + 46, kD);
      y = lerp(y, loom.warpY(29.5), kD);
      z = lz(z, 4.6, kD);
      r = lerp(0, -Math.PI / 2, seg(t, TAUT_T0 - 0.02, at(7) + 0.1, ease.inOutQuart));
      const rSettle = seg(t, at(8, 2), SILENCE[0], ease.inOutSine);
      r += 0.012 * rSettle;
      // Weaving: rise with the cloth, ease out, and stop dead on the silence.
      // Hold on the fell while the first picks go in, then rise with the cloth
      // and land — dead still — on the silence.
      const kW = seg(t, at(7) + 0.02, SILENCE[0], (u) => ease.inOutCubic(u ** 1.4));
      x = lerp(x, flagCx, kW);
      z = lz(z, 3.0, kW);
      y -= 14 * seg(t, at(8), SILENCE[0], ease.inOutSine);
      return { x, y, z, r };
    }
    // ── Silence and the flag.
    if (t < DIVE[0]) {
      const u = clamp((t - DROP) / (DIVE[0] - DROP));
      const e = t < DROP ? 0 : ease.inOutSine(u);
      let z = lz(3.0, 3.16, e);
      if (t >= DROP) z *= 1 + 0.035 * springKick(t - DROP, 3.2, 6);
      // Drift: a slow arc across the cloth, as if walking past it.
      return { x: flagCx + 5 * e, y: loom.warpY(29.5) - 14 + 28 * e, z, r: -Math.PI / 2 + 0.012 - 0.03 * e };
    }
    // ── Dive into one thread, rolling it horizontal.
    if (t < REWIND[0]) {
      const u = seg(t, DIVE[0], DIVE[1], ease.inOutCubic);
      return {
        x: lerp(flagCx + 5, dive.x, ease.inOutQuart(clamp((t - DIVE[0]) / (DIVE[1] - DIVE[0])))),
        y: lerp(loom.warpY(29.5) + 14, dive.y, u),
        z: lz(3.16, 17, seg(t, DIVE[0], DIVE[1], ease.inOutQuart)),
        r: lerp(-Math.PI / 2 - 0.018, 0, u),
      };
    }
    // ── Ride the thread home.
    if (t < END_PLUCK - 0.2) {
      const u = clamp((t - REWIND[0]) / (END_PLUCK - 0.2 - REWIND[0]));
      const x = lerp(dive.x, END.x, ease.inOutQuint(u));
      const y = lerp(dive.y, END.y, smoothstep(0.1, 0.95, u)) + Math.sin(u * Math.PI) * -160;
      // Zoom: out fast, glide, settle.
      const z = u < 0.22 ? lz(17, 0.5, ease.outCubic(u / 0.22)) : u < 0.7 ? 0.5 : lz(0.5, END.z, ease.inOutCubic((u - 0.7) / 0.3));
      return { x, y, z, r: 0 };
    }
    return { x: END.x, y: END.y, z: END.z * (1 + 0.035 * ease.outQuad(clamp((t - END_PLUCK) / (DURATION - END_PLUCK)))), r: 0 };
  }

  return function camera(t) {
    const c = base(t);
    // Impacts: the hook pluck, the drop, the last pluck — a short screen shake.
    let shx = 0;
    let shy = 0;
    for (const [t0, amp] of [[HOOK_PLUCK, 7], [END_PLUCK, 5], [DROP, 5]]) {
      const d = t - t0;
      if (d > 0 && d < 0.8) {
        shy += amp * springKick(d, 9, 7);
        shx += amp * 0.4 * springKick(d + 0.03, 11, 8);
      }
    }
    // Kicks in the flag section nudge the frame.
    for (const tp of cues.pulses) {
      const d = t - tp;
      if (d > 0 && d < 0.4) shy += 1.6 * springKick(d, 7, 9);
    }
    // Breath: sub-pixel drift so the frame never feels locked off (except in the silence).
    const still = t >= SILENCE[0] && t < SILENCE[1] ? 0 : 1;
    shx += drift[0](t * 0.7) * 1.2 * still;
    shy += drift[1](t * 0.6) * 1.2 * still;
    const cr = Math.cos(c.r);
    const sr = Math.sin(c.r);
    // Shake is specified in screen pixels; convert to world.
    c.x -= (cr * shx + sr * shy) / c.z;
    c.y -= (-sr * shx + cr * shy) / c.z;
    return c;
  };
}

