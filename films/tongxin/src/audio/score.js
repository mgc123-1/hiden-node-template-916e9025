// 同心结 — the score. 128 BPM, sixteen bars, centred on D.
//
// Each land has its own band, and each band hands the melody on with the
// silk: dap and rawap (Hijaz on D) in Turpan; bone flute over a horn drone on
// the plateau; morin khuur and hooves on the grassland; silver bells, a slowed
// beat and the hulusi in the south. In the montage everyone plays the one
// theme, the drums cutting with the picture — beats, eighths, sixteenths. Then
// Beijing: the weave on the zheng, one beat of true silence, the gong on the
// downbeat, a crowd's cheer, a shutter, seven plucks for seven characters and
// a seal.

import { at, BEAT, S16, S8 } from '../core.js';

export const SIL0 = at(14, 3);
export const HIT = at(15);
export const FREEZE = at(16);
export const GATES = [[SIL0, HIT]];

const ev = {
  dap: [], rawap: [], zheng: [], flute: [], bowed: [], hulusi: [], pizz: [], bell: [], sbell: [],
  kick: [], drum: [], snap: [], shaker: [], wood: [], hoof: [], bass: [], sub: [], drone: [],
  pad: [], tutti: [], gong: [], fx: [], crowd: [], shutter: [], stamp: [],
};
const add = (k, e) => (ev[k] ||= []).push(e);
/** Notes given as [beatOffset, midi, beats] from time t0. */
const line = (k, t0, notes, o = {}) => notes.forEach(([b, m, d, v]) => add(k, { t: t0 + b * BEAT, m, d: d * BEAT, v: v ?? o.v ?? 0.8, ...o, ...(v === undefined ? {} : { v }) }));

// ─── Bar 1 · the hook: silk loop in macro, the DUM, the spin ───────────────
const DUM = at(1, 1);
add('fx', { type: 'silk', t0: 0.0, t1: 0.46, v: 0.35, from: 900, to: 1500, pan0: 0.3, pan1: -0.2 });
add('dap', { t: 0.04, kind: 'roll', d: 0.42, v: 0.5, pan: 0.1 });
add('fx', { type: 'reverse', t0: DUM - 0.35, t1: DUM, v: 0.35 });
add('dap', { t: DUM, kind: 'dum', v: 1.0 });
add('sub', { t: DUM, m: 38, v: 0.8 });
add('drone', { t: DUM, m: 38, d: 5.0, v: 0.55, bright: 0.25 });
add('drone', { t: DUM, m: 45, d: 5.0, v: 0.3, bright: 0.2 });
[50, 57, 62, 69].forEach((m, k) => add('rawap', { t: DUM + k * 0.018, m, d: 1.0, v: 0.75, pan: -0.25 + k * 0.15 }));
add('fx', { type: 'whoosh', t0: DUM + 0.02, t1: at(2) - 0.05, v: 0.3, rise: true });
// Spin: a rawap tremolo climbing the Hijaz scale, dap ticks thickening.
const hijaz = [62, 63, 66, 67, 69, 70, 72, 74];
for (let k = 0; k < 11; k++) {
  const t = at(1, 1, 2) + k * S16;
  add('rawap', { t, m: hijaz[Math.min(7, Math.floor(k / 1.5))], d: 0.12, v: 0.35 + 0.04 * k, pan: 0.2 });
  add('dap', { t, kind: k % 2 ? 'tek' : 'tak', v: 0.2 + 0.05 * k, pan: -0.3 });
}

// ─── Bars 2–3 · Turpan: the neck-slide groove, the flick ───────────────────
function dapBar(t0, v = 1, pan = 0) {
  // Sanam-style: DUM tek TAK tek | DUM DUM TAK tek
  const pat = [['dum', 0], ['tek', 0.5], ['tak', 1], ['tek', 1.5], ['dum', 2], ['dum', 2.5], ['tak', 3], ['tek', 3.5], ['tek', 3.75]];
  for (const [kind, b] of pat) add('dap', { t: t0 + b * BEAT, kind, v: v * (kind === 'tek' ? 0.55 : 0.9), pan });
}
dapBar(at(2));
dapBar(at(3), 1, -0.1);
dapBar(at(3), 0.55, 0.45); // the drummers join
for (const b of [1, 3]) {
  add('snap', { t: at(2, b), v: 0.45 });
  add('snap', { t: at(3, b), v: 0.5 });
}
for (const b of [0, 2]) {
  add('bass', { t: at(2, b), m: 38, d: 0.35, v: 0.8 });
  add('bass', { t: at(3, b), m: 38, d: 0.35, v: 0.85 });
}
add('bass', { t: at(2, 3, 2), m: 45, d: 0.2, v: 0.6 });
line('rawap', at(2), [[0, 74, 0.5], [0.5, 75, 0.25], [0.75, 78, 0.25], [1, 79, 0.5], [1.5, 78, 0.25], [1.75, 75, 0.25], [2, 74, 0.25], [2.25, 75, 0.25], [2.5, 78, 0.25], [2.75, 79, 0.25], [3, 81, 0.5], [3.5, 82, 0.25], [3.75, 81, 0.25]], { v: 0.7, pan: 0.15 });
// The flick: a run up and away with the silk.
const FLICK = at(3);
add('dap', { t: FLICK, kind: 'tak', v: 1.0 });
add('fx', { type: 'silk', t0: FLICK - 0.05, t1: FLICK + 0.75, v: 0.7, from: 500, to: 3200, pan0: 0.1, pan1: 0.6 });
[74, 75, 78, 79, 81, 82, 84, 86].forEach((m, k) => add('rawap', { t: FLICK + k * (S16 * 0.66), m, d: 0.2, v: 0.55 + 0.03 * k, pan: 0.3 }));
line('rawap', at(3, 2), [[0, 86, 0.75], [0.75, 84, 0.25], [1, 82, 0.5], [1.5, 81, 0.5]], { v: 0.6, pan: 0.15 });
add('fx', { type: 'riser', t0: at(3, 2), t1: at(4) - 0.2, v: 0.35 });
add('fx', { type: 'whoosh', t0: at(4) - 0.55, t1: at(4) - 0.2, v: 0.45, rise: true });

// ─── Bars 4–5 · the plateau: horn drone, bone flute, a bell at the touch ───
add('drone', { t: at(4) - 0.2, m: 38, d: 3.9, v: 0.7, bright: 0.18 });
add('drone', { t: at(4) - 0.2, m: 45, d: 3.9, v: 0.4, bright: 0.15 });
add('pad', { t: at(4) - 0.2, m: [47, 54, 59, 62, 64], d: 3.6, v: 0.5, attack: 0.9, release: 1.0 });
add('fx', { type: 'whoosh', t0: at(4) - 0.2, t1: at(4, 3), v: 0.3, rise: false });
line('flute', at(4), [[0, 78, 1.2], [1.25, 76, 0.5], [1.75, 74, 0.25], [2, 71, 1.75, 0.75]], { v: 0.7, pan: -0.1 });
line('flute', at(5), [[0, 74, 0.5], [0.5, 76, 0.5], [1, 78, 0.5], [1.5, 81, 0.5], [2, 83, 1.9, 0.8]], { v: 0.72, pan: -0.1 });
for (const b of [0, 2]) {
  add('drum', { t: at(4, b), v: 0.45, tight: 1, pitch: 0.8 });
  add('drum', { t: at(5, b), v: 0.5, tight: 1, pitch: 0.8 });
}
for (let k = 0; k < 16; k++) add('shaker', { t: at(4) + k * S8, v: 0.18 + (k % 2 ? 0 : 0.06), pan: 0.4 });
add('bell', { t: at(5), m: 86, d: 3.5, v: 0.55, pan: 0.15 });
add('bell', { t: at(5) + 0.12, m: 93, d: 2.5, v: 0.3, pan: -0.2 });
add('fx', { type: 'silk', t0: at(5) + 0.1, t1: at(5) + 0.9, v: 0.45, from: 700, to: 2200, pan0: -0.3, pan1: 0.4 });
add('fx', { type: 'silk', t0: 8.95, t1: 9.35, v: 0.6, from: 1500, to: 600, pan0: -0.7, pan1: 0.7 });

// ─── Bars 6–7 · the grassland: hooves, morin khuur, the flick, the rain ────
const G0 = at(6);
for (let k = 0; k < 16; k++) {
  const t = G0 - 0.1 + k * BEAT;
  if (t > at(8) - 0.25) break;
  [0, 0.085, 0.2].forEach((o, j) => add('hoof', { t: t + o, v: [0.55, 0.45, 0.85][j], pan: -0.2 + j * 0.1 }));
}
add('drone', { t: G0 - 0.1, m: 38, d: 3.6, v: 0.55, bright: 0.45 });
add('drone', { t: G0 - 0.1, m: 50, d: 3.6, v: 0.25, bright: 0.6 });
line('bowed', G0, [[0, 69, 1, 0.8], [1, 71, 0.5], [1.5, 74, 0.5], [2, 76, 1], [3, 74, 0.5], [3.5, 71, 0.5]], { vib: 1, pan: 0.2 });
line('bowed', at(7), [[0, 74, 0.5], [0.5, 76, 0.5], [1, 78, 0.5], [1.5, 81, 0.5], [2, 83, 1.5, 0.9], [3.5, 81, 0.5]], { vib: 1, pan: 0.2 });
ev.bowed[0].slide = 2;
for (let b = 0; b < 8; b++) {
  const t = G0 + b * BEAT;
  add('kick', { t, v: 0.55 + (b % 4 === 0 ? 0.2 : 0) });
  add('bass', { t, m: b < 4 ? 38 : b < 6 ? 45 : 47, d: 0.3, v: 0.7 });
  if (b >= 4) add('shaker', { t: t + S8, v: 0.25, pan: 0.3 });
}
add('drum', { t: G0, v: 0.8 });
add('drum', { t: at(7), v: 0.85 });
const FLICK3 = at(6, 3, 2);
add('snap', { t: FLICK3, v: 0.9 });
add('fx', { type: 'silk', t0: FLICK3 - 0.05, t1: FLICK3 + 0.6, v: 0.6, from: 600, to: 2800, pan0: 0.4, pan1: -0.3 });
add('fx', { type: 'rain', t0: at(7, 2), t1: at(8) + 0.9, v: 0.35, fadeIn: 0.9, fadeOut: 0.5 });
add('drum', { t: at(7, 3), v: 0.6, pitch: 0.7 });
add('drum', { t: at(7, 3, 2), v: 0.7, pitch: 0.7 });
add('fx', { type: 'riser', t0: at(7, 2), t1: at(8) - 0.18, v: 0.3 });

// ─── Bars 8–9 · the south: silver bells, the slowed beat, hulusi, panda ───
const S0 = at(8);
add('sub', { t: S0 - 0.18, m: 43, v: 0.7 });
add('pad', { t: S0 - 0.18, m: [43, 50, 55, 59, 62], d: 3.6, v: 0.5, attack: 0.3, release: 1.2 });
[98, 93, 90, 86].forEach((m, k) => add('sbell', { t: S0 - 0.15 + k * 0.03, m, d: 1.6, v: 0.4, pan: -0.4 + k * 0.25 }));
// Slow motion (RAMP): bells an octave down and long; the beat drops out.
add('fx', { type: 'reverse', t0: at(8, 1) - 0.4, t1: at(8, 1), v: 0.3 });
[86, 81, 78].forEach((m, k) => add('bell', { t: at(8, 1) + k * 0.16, m, d: 2.2, v: 0.35, pan: 0.3 - k * 0.3 }));
add('fx', { type: 'silk', t0: at(8, 1) + 0.05, t1: at(8, 2, 2), v: 0.35, from: 400, to: 900, pan0: -0.4, pan1: 0.2 });
// Snap back: hulusi in the bamboo, elephant-foot drum and bamboo clacks.
const S1 = at(8, 2, 2);
add('drum', { t: S1, v: 0.7, tight: 1, pitch: 0.7 });
line('hulusi', S1, [[0, 71, 0.5], [0.5, 74, 0.5], [1, 76, 0.75], [1.75, 74, 0.25], [2, 71, 0.5], [2.5, 69, 0.5], [3, 67, 1]], { v: 0.75, droneM: 55, pan: -0.15 });
line('hulusi', at(9, 2, 2), [[0, 71, 0.5], [0.5, 74, 0.5], [1, 79, 1.0]], { v: 0.75, droneM: 55, pan: -0.15 });
for (let k = 0; k < 11; k++) {
  const t = S1 + k * S8;
  if (k % 2 === 0) add('drum', { t, v: 0.45, tight: 1, pitch: 0.75 });
  add('wood', { t: t + (k % 3 === 2 ? S16 : 0), v: 0.25 + (k % 2) * 0.1, pitch: 0.7 + (k % 3) * 0.1 });
}
for (const b of [0, 2]) add('bass', { t: at(9, b), m: b ? 45 : 40, d: 0.4, v: 0.7 });
add('fx', { type: 'silk', t0: 15.1, t1: 15.7, v: 0.45, from: 800, to: 2000, pan0: -0.2, pan1: 0.5 });
// Panda: two plucked question marks.
add('pizz', { t: 16.02, m: 62, d: 0.2, v: 0.8, pan: 0.4 });
add('pizz', { t: 16.02 + S8, m: 69, d: 0.3, v: 0.8, pan: 0.45 });
add('wood', { t: 16.02 + S8, v: 0.3, pitch: 1.3 });
add('fx', { type: 'riser', t0: at(9, 2), t1: at(10) - 0.13, v: 0.42 });
add('fx', { type: 'whoosh', t0: 16.35, t1: at(10) - 0.12, v: 0.5, rise: true });

// ─── Bars 10–13 · the kaleidoscope ─────────────────────────────────────────
const M0 = at(10);
const chords = [
  [M0, [50, 57, 62, 66, 69]], // D
  [at(11), [47, 54, 59, 62, 66]], // Bm
  [at(11, 2), [43, 55, 59, 62, 67]], // G
  [at(12), [43, 55, 62, 67, 71]], // G
  [at(12, 2), [45, 57, 61, 64, 69]], // A
];
chords.forEach(([t, m], k) => add('pad', { t: t - 0.05, m, d: (k === 1 || k === 3 ? 2 : k === 0 ? 4 : 2) * BEAT + 0.1, v: 0.55, attack: 0.08, release: 0.3 }));
add('pad', { t: at(13) - 0.05, m: [42, 54, 62, 66, 69, 74], d: 2 * BEAT, v: 0.65, attack: 0.08, release: 0.5 });
add('pad', { t: at(13, 2) - 0.05, m: [45, 57, 62, 64, 69, 76], d: 2 * BEAT, v: 0.7, attack: 0.1, release: 0.4 });
// The theme, zheng and flute in octaves.
const theme = [
  [at(10), [[0, 69, 1], [1, 74, 0.5], [1.5, 76, 0.5], [2, 78, 1], [3, 76, 0.5], [3.5, 74, 0.5]]],
  [at(11), [[0, 71, 1.5], [1.5, 74, 0.5], [2, 76, 0.5], [2.5, 78, 0.5], [3, 81, 1]]],
  [at(12), [[0, 83, 0.5], [0.5, 81, 0.5], [1, 78, 0.5], [1.5, 76, 0.5], [2, 78, 0.25], [2.25, 81, 0.25], [2.5, 83, 0.25], [2.75, 86, 0.25], [3, 88, 1]]],
  [at(13), [[0, 86, 2], [2, 83, 1], [3, 81, 1]]],
];
for (const [t0, notes] of theme) {
  line('zheng', t0, notes, { v: 0.8, pan: -0.2 });
  line('flute', t0, notes.map(([b, m, d]) => [b, m + 12 > 96 ? m : m, d]), { v: 0.45, pan: 0.2, vib: 0.6 });
}
// Drums cut with the picture.
for (let b = 0; b < 4; b++) {
  const t = at(10, b);
  add('drum', { t, v: 0.9 });
  add('kick', { t, v: 0.8 });
  if (b % 2) add('snap', { t, v: 0.6 });
  add('bass', { t, m: 38, d: 0.4, v: 0.8 });
}
add('fx', { type: 'silk', t0: at(10) + 0.1, t1: at(10, 1), v: 0.5, from: 700, to: 2600, pan0: -0.3, pan1: 0.6 }); // the ball
add('fx', { type: 'whoosh', t0: at(10, 2), t1: at(10, 3) - 0.05, v: 0.3, rise: true }); // the swing
add('fx', { type: 'crackle', t: at(10, 3), v: 0.5 }); // the torches
for (let k = 0; k < 8; k++) {
  const t = at(11) + k * S8;
  add('drum', { t, v: 0.7 + (k % 2 ? 0 : 0.15), tight: 1, pitch: [1, 1.12, 0.9, 1.26, 1, 1.18, 0.84, 1.33][k] });
  if (k % 2 === 0) add('kick', { t, v: 0.75 });
  add('bass', { t, m: k < 4 ? 47 : 43, d: 0.2, v: 0.7 });
  add('shaker', { t: t + S16, v: 0.3, pan: 0.35 });
}
for (let k = 0; k < 16; k++) {
  const t = at(12) + k * S16;
  add('drum', { t, v: 0.45 + 0.4 * (k / 15), tight: 1, pitch: 0.9 + 0.5 * (k / 15) });
  add('stitch', { t });
  if (k % 4 === 0) add('kick', { t, v: 0.8 });
  if (k % 2 === 0) add('bass', { t, m: k < 8 ? 43 : 45, d: 0.12, v: 0.65 });
}
// The lift: the river leaves the lens; the quilt; everything rises.
add('crash', { t: at(13), v: 0.55 });
add('sub', { t: at(13), m: 38, v: 1.0 });
add('drum', { t: at(13), v: 1.0, pitch: 0.8 });
add('gong', { t: at(13), v: 0.35, d: 3, f: 180 });
add('fx', { type: 'silk', t0: at(13), t1: at(13) + 0.6, v: 0.6, from: 1800, to: 700, pan0: 0, pan1: 0 });
for (let k = 0; k < 4; k++) add('kick', { t: at(13, k), v: 0.6 });
add('fx', { type: 'riser', t0: at(13, 1), t1: at(14) - 0.05, v: 0.55 });
add('fx', { type: 'silk', t0: at(14) - 0.36, t1: at(14) - 0.02, v: 0.7, from: 600, to: 1800, pan0: -0.8, pan1: 0.8 });

// ─── Bar 14 · Beijing: the curtain opens; the weave ────────────────────────
const B0 = at(14);
add('tutti', { t: B0, m: [38, 50, 57, 62, 66, 69], d: 0.7, v: 0.8, swell: 0.01 });
add('drum', { t: B0, v: 1.0, pitch: 0.75 });
add('kick', { t: B0, v: 0.9 });
add('crash', { t: B0, v: 0.35 });
add('fx', { type: 'silk', t0: B0, t1: B0 + 0.45, v: 0.6, from: 1400, to: 3000, pan0: -0.3, pan1: 0.9 });
add('pad', { t: B0 + 0.3, m: [50, 57, 62, 66, 69, 74], d: SIL0 - B0 - 0.3, v: 0.6, attack: 1.2, release: 0.01 });
// Weaving: the zheng runs up and down the pentatonic as the cords go over and under.
const penta = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86];
const weaveStart = at(14, 0, 3);
for (let k = 0; ; k++) {
  const t = weaveStart + k * S16;
  if (t >= SIL0 - 0.03) break;
  const up = Math.floor(k / 8) % 2 === 0;
  const i = up ? k % 8 : 7 - (k % 8);
  add('zheng', { t, m: penta[i + Math.min(3, Math.floor(k / 8))], d: 0.25, v: 0.45 + 0.35 * (k / 10), pan: Math.sin(k * 0.9) * 0.5 });
  if (k % 2 === 0) add('stitch', { t: t + 0.01 });
}
for (let b = 1; b < 3; b++) add('kick', { t: at(14, b), v: 0.5 + b * 0.1 });
add('fx', { type: 'reverse', t0: SIL0 - 0.5, t1: SIL0, v: 0.4 });
// SIL0 → HIT: silence.

// ─── Bar 15 · the knot pulls tight; the cheer ──────────────────────────────
add('gong', { t: HIT, v: 1.0, d: 4.5, f: 98 });
add('drum', { t: HIT, v: 1.0, pitch: 0.62 });
add('kick', { t: HIT, v: 1.0 });
add('sub', { t: HIT, m: 38, v: 1.0 });
add('tutti', { t: HIT, m: [38, 50, 57, 62, 66, 69, 74], d: 1.6, v: 1.0, swell: 0.012 });
add('crash', { t: HIT, v: 0.5 });
add('bell', { t: HIT + 0.02, m: 86, d: 3, v: 0.4, pan: 0.3 });
const CHEER = at(15, 1);
add('crowd', { t: CHEER - 0.03, v: 0.85, d: 1.1 });
add('crowd', { t: CHEER + 2 * BEAT, v: 0.45, d: 0.9, voices: 40 });
line('flute', CHEER, [[0, 74, 0.5], [0.5, 76, 0.5], [1, 78, 0.5], [1.5, 81, 1.5]], { v: 0.6, pan: 0.15 });
line('zheng', CHEER, [[0, 74, 0.5], [0.5, 76, 0.5], [1, 78, 0.5], [1.5, 81, 1.5]], { v: 0.7, pan: -0.15 });
add('pad', { t: CHEER, m: [43, 55, 59, 62, 67, 71], d: FREEZE - CHEER - 0.05, v: 0.55, attack: 0.3, release: 0.05 });
for (let k = 0; k < 6; k++) {
  const t = CHEER + k * BEAT;
  if (t >= FREEZE - 0.05) break;
  add('drum', { t, v: 0.75, pitch: 0.8 });
  add('kick', { t, v: 0.7 });
  add('cha', { t: t + S8, v: 0.4 });
  add('bass', { t, m: k < 3 ? 43 : 45, d: 0.35, v: 0.75 });
}

// ─── Bar 16 · the shutter, the mount, seven characters, the seal ───────────
add('shutter', { t: FREEZE, v: 0.9 });
add('tutti', { t: FREEZE + 0.02, m: [38, 50, 57, 62, 66, 69, 76], d: 1.5, v: 0.55, swell: 0.3 });
add('pad', { t: FREEZE + 0.02, m: [50, 57, 62, 64, 66, 69], d: 1.6, v: 0.5, attack: 0.4, release: 0.8 });
add('fx', { type: 'paper', t0: FREEZE + 0.06, t1: FREEZE + 0.5, v: 0.5 });
const T0 = FREEZE + 0.5 - 0.05;
[69, 71, 74, 76, 78, 81, 86].forEach((m, k) => add('zheng', { t: T0 + k * S16, m, d: 0.9, v: 0.55 + 0.04 * k, pan: -0.3 + k * 0.1 }));
const SEAL = T0 + 7 * S16 + 0.12;
add('stamp', { t: SEAL, v: 0.9 });
add('bell', { t: SEAL + 0.01, m: 74, d: 2.2, v: 0.4, pan: 0 });
add('bell', { t: SEAL + 0.01, m: 81, d: 2.0, v: 0.25, pan: 0.2 });

export default ev;
