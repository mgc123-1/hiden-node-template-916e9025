// 经纬 — the score.
//
// Every sound in the film is an event in this file, and every piece of motion
// that is "in sync" reads its timing from the same events. The visuals never
// guess where a beat is.
//
// Key: D gong-mode pentatonic (D E F# A B). Harmony leans on I–vi–IV–V but
// the melody never leaves the five tones.

import { at, BEAT, S16, S32 } from './core/time.js';
import { rng } from './core/math.js';

const NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
/** 'F#5' -> MIDI number */
export const N = (s) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(s);
  return 12 * (Number(m[2]) + 1) + NAMES[m[1]];
};
export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const PENTA_PC = [2, 4, 6, 9, 11]; // D E F# A B
/** Pentatonic ladder between two notes, inclusive — the open strings of a zheng. */
export function ladder(from, to) {
  const out = [];
  for (let m = N(from); m <= N(to); m++) if (PENTA_PC.includes(m % 12)) out.push(m);
  return out;
}

const score = {
  zheng: [], // plucked string (guzheng-like Karplus–Strong)
  bell: [], //  bronze chime (bianzhong-like additive)
  kick: [],
  drum: [], //  tanggu — the big barrel drum
  snap: [],
  shaker: [],
  wood: [], //  woodblock — the loom's beater
  bass: [],
  pad: [],
  sub: [],
  fx: [], //    pierce · whoosh · riser · reverse · crash
  gates: [], // hard silences [t0, t1]
};

const z = (t, note, v, d = 1.6, o = {}) => score.zheng.push({ t, m: typeof note === 'string' ? N(note) : note, v, d, pan: 0, ...o });
const bell = (t, note, v, d = 3, o = {}) => score.bell.push({ t, m: N(note), v, d, pan: 0, ...o });
const kick = (t, v = 0.9) => score.kick.push({ t, v });
const drum = (t, v = 1, o = {}) => score.drum.push({ t, v, ...o });
const snap = (t, v = 0.5) => score.snap.push({ t, v });
const shake = (t, v = 0.4) => score.shaker.push({ t, v });
const wood = (t, v = 0.5, pitch = 1) => score.wood.push({ t, v, pitch });
const bass = (t, note, d, v = 0.7) => score.bass.push({ t, m: N(note), d, v });
const pad = (t, notes, d, v = 0.2, o = {}) => score.pad.push({ t, m: notes.map(N), d, v, attack: 0.6, release: 1.2, ...o });
const sub = (t, v = 0.8, note = 'D1') => score.sub.push({ t, v, m: N(note) });
const fx = (type, t0, t1, v = 0.5, o = {}) => score.fx.push({ type, t0, t1, v, ...o });

/** Glissando across the zheng: notes spread evenly over [t0, t1]. */
function gliss(t0, t1, notes, v0, v1, o = {}) {
  const out = [];
  notes.forEach((m, i) => {
    const k = notes.length === 1 ? 0 : i / (notes.length - 1);
    const t = t0 + (t1 - t0) * k;
    const e = { t, m, v: v0 + (v1 - v0) * k, d: 1.2, pan: (k - 0.5) * 0.9 * (o.panDir ?? 1), ...o };
    score.zheng.push(e);
    out.push(e);
  });
  return out;
}

// Visual cue tables, filled alongside the music.
export const cues = {
  heartbeats: [], // ECG R-peaks
  peaks: [], //      mountain summits { t, m }
  crenels: [], //    Great Wall merlons
  ties: [], //       rail ties
  furrows: [], //    field rows { t0, t1, m }
  cascade: [], //    { t, m, line }
  warpTaut: [], //   per-warp tension time
  weft: [], //       { row, t0, t1, dir }
  stars: [], //      { index, t0, t1 }
  pulses: [], //     fabric wave launch times
  plucks: [], //     zheng notes that shake the lead thread
};

// ─── Bar 1 · 一根线 ─────────────────────────────────────────────────────────
// Silence, then a needle pierces the paper from beneath, flies, and pulls the
// thread taut: the snap *is* the first note.
fx('pierce', at(1, 1), at(1, 1) + 0.2, 0.9);
fx('whoosh', at(1, 1) + 0.04, at(1, 2) + 0.02, 0.45, { rise: true });
gliss(at(1, 1) + 0.3, at(1, 2) - 0.03, ladder('A3', 'D5'), 0.07, 0.16, { tag: 'air' });
export const HOOK_PLUCK = at(1, 2);
z(HOOK_PLUCK, 'D2', 1.0, 6, { tag: 'hook' });
z(HOOK_PLUCK + 0.004, 'D3', 0.75, 6, { tag: 'hook' });
sub(HOOK_PLUCK, 0.55, 'D1');
z(at(1, 3), 'D6', 0.34, 3, { tag: 'harmonic', harmonic: true });

// ─── Bar 2 · 是心跳 ─────────────────────────────────────────────────────────
// The kick drum is the heartbeat: every R-peak on the ECG line lands on it.
for (let b = 0; b < 4; b++) {
  kick(at(2, b), 0.68);
  kick(at(2, b, 1), 0.3);
  cues.heartbeats.push(at(2, b));
}
pad(at(2), ['D3', 'A3', 'D4', 'F#4'], 2.6, 0.16, { attack: 1.4 });
z(at(2, 0, 2), 'A4', 0.52, 1.4, { pan: -0.2, tag: 'melody' });
z(at(2, 1, 2), 'D5', 0.58, 1.4, { pan: 0.1, tag: 'melody' });
z(at(2, 2, 0), 'E5', 0.5, 1.0, { pan: 0.15, tag: 'melody' });
z(at(2, 2, 2), 'F#5', 0.62, 2.2, { pan: 0.2, vib: 1, tag: 'melody' });
z(at(2, 3, 3), 'E5', 0.34, 0.8, { pan: 0.1, tag: 'melody' });
fx('whoosh', at(2, 3, 2), at(3) + 0.05, 0.3, { rise: true });

// ─── Bar 3 · 是山河 ─────────────────────────────────────────────────────────
// Melody pitch = summit height. The held B5 is the Great Wall ridge; its
// merlons are the shaker sixteenths; the watchtower is a woodblock knock.
bass(at(3), 'B1', 2.4, 0.5);
kick(at(3, 0), 0.72);
kick(at(3, 2), 0.55);
pad(at(3), ['B2', 'F#3', 'B3', 'D4'], 2.6, 0.19);
[
  [0, 0, 'D5'],
  [0, 2, 'E5'],
  [1, 0, 'F#5'],
  [1, 2, 'A5'],
].forEach(([b, s, n], i) => {
  z(at(3, b, s), n, 0.58 + i * 0.05, 1.3, { pan: -0.3 + i * 0.15, tag: 'peak' });
  cues.peaks.push({ t: at(3, b, s), m: N(n) });
});
z(at(3, 2), 'B5', 0.74, 2.0, { vib: 1, pan: 0.25, tag: 'ridge' });
cues.peaks.push({ t: at(3, 2), m: N('B5') });
for (let s = 0; s < 7; s++) {
  shake(at(3, 2, s), s % 2 ? 0.28 : 0.4);
  cues.crenels.push(at(3, 2, s));
}
wood(at(3, 3, 0), 0.42, 0.8);
z(at(3, 3, 2), 'A5', 0.46, 0.9, { pan: 0.2, tag: 'melody' });
fx('whoosh', at(3, 3, 2), at(4) + 0.05, 0.22, { rise: false });

// ─── Bar 4 · 是归途 ─────────────────────────────────────────────────────────
// Rail ties are stitched on every sixteenth; beat 4 draws a house.
bass(at(4), 'G1', 2.4, 0.52);
kick(at(4, 0), 0.7);
kick(at(4, 2), 0.58);
snap(at(4, 1), 0.34);
snap(at(4, 3), 0.4);
pad(at(4), ['G2', 'D3', 'G3', 'B3'], 2.6, 0.2);
for (let s = 0; s < 12; s++) {
  const t = at(4, 0, s);
  shake(t, s % 2 ? 0.3 : 0.46);
  cues.ties.push(t);
}
z(at(4, 0, 0), 'F#5', 0.6, 1.2, { pan: -0.1, tag: 'melody' });
z(at(4, 0, 3), 'E5', 0.42, 0.8, { pan: 0.0, tag: 'melody' });
z(at(4, 1, 2), 'D5', 0.54, 1.2, { pan: 0.1, tag: 'melody' });
z(at(4, 2, 0), 'E5', 0.48, 0.9, { pan: 0.1, tag: 'melody' });
z(at(4, 2, 2), 'B4', 0.5, 1.1, { pan: -0.1, tag: 'melody' });
z(at(4, 3, 0), 'D5', 0.62, 1.8, { pan: 0, tag: 'home' });
z(at(4, 3, 2), 'A4', 0.5, 1.8, { pan: 0, tag: 'home' });
bell(at(4, 3, 0), 'D6', 0.2, 2.5);

// ─── Bar 5 · 是丰年 ─────────────────────────────────────────────────────────
// Boustrophedon: one furrow per sixteenth, one pluck per furrow.
bass(at(5), 'A1', 2.4, 0.55);
kick(at(5, 0), 0.72);
kick(at(5, 2), 0.6);
snap(at(5, 1), 0.4);
snap(at(5, 3), 0.44);
pad(at(5), ['A2', 'D3', 'E3', 'A3'], 1.25, 0.2);
pad(at(5, 2), ['A2', 'C#3', 'E3', 'A3'], 1.35, 0.21, { attack: 0.3 });
const furrowNotes = ['A3', 'D4', 'E4', 'A4', 'D4', 'E4', 'A4', 'B4', 'E4', 'A4', 'B4', 'D5', 'A4', 'B4', 'D5', 'E5'];
furrowNotes.forEach((n, s) => {
  const t = at(5, 0, s);
  shake(t, s % 4 === 0 ? 0.42 : 0.26);
  z(t, n, s % 4 === 0 ? 0.52 : 0.36, 0.9, { pan: s % 2 ? 0.35 : -0.35, tag: 'furrow' });
  cues.furrows.push({ t0: t, t1: t + S16, m: N(n) });
});
fx('riser', at(5, 2), at(6), 0.42);

// ─── Bar 6 · 千万根线 ───────────────────────────────────────────────────────
// Pull back: we were never alone. Each pluck in the cascade lights a new line.
// On beat 4 every line is pulled taut into a warp — one glissando across them.
kick(at(6, 0), 1.0);
kick(at(6, 2), 0.8);
snap(at(6, 1), 0.44);
snap(at(6, 3), 0.4);
sub(at(6), 0.55, 'D1');
for (let s = 0; s < 12; s++) shake(at(6, 0, s), s % 2 ? 0.24 : 0.36);
bass(at(6), 'D2', 1.8, 0.66);
bass(at(6, 3), 'A1', 0.6, 0.6);
pad(at(6), ['D3', 'A3', 'D4', 'F#4', 'A4'], 2.5, 0.24, { attack: 0.9 });
{
  const r = rng(606);
  const pool = ladder('A4', 'A6');
  let line = 0;
  for (let k = 0; k < 24; k++) {
    const t = at(6) + k * S32;
    if (k > 0 && r() < 0.22) continue;
    const m = pool[Math.min(pool.length - 1, Math.floor(r() ** 0.8 * pool.length))];
    const e = { t: t + r() * 0.012, m, v: 0.18 + r() * 0.24, d: 1.4, pan: r.range(-0.85, 0.85), tag: 'cascade' };
    score.zheng.push(e);
    cues.cascade.push({ t: e.t, m, line: line++ });
    if (r() < 0.3) {
      const e2 = { ...e, t: e.t + S32 / 2, m: pool[Math.floor(r() * pool.length)], v: e.v * 0.7 };
      score.zheng.push(e2);
      cues.cascade.push({ t: e2.t, m: e2.m, line: line++ });
    }
  }
}
export const TAUT_T0 = at(6, 3);
export const TAUT_T1 = at(6, 3) + 0.52;
gliss(TAUT_T0, TAUT_T1, ladder('A3', 'E6'), 0.2, 0.42, { tag: 'taut' });
fx('reverse', at(6, 2, 2), at(7), 0.45);

// ─── Bars 7–8 · 织成经纬 ────────────────────────────────────────────────────
// The needle strums the warps on every weft pass; the woodblock is the beater
// packing each row down. Passes accelerate: beats → eighths → sixteenths → zip.
export const WARPS = 60;
export const WEFTS = 40;
{
  const passes = [];
  for (let b = 0; b < 4; b++) passes.push([at(7, b), 3 * S16]);
  passes.push([at(8, 0, 0), 2 * S16], [at(8, 0, 2), 2 * S16]);
  for (let s = 0; s < 4; s++) passes.push([at(8, 1, s), S16]);
  const zipT0 = at(8, 2);
  const zipT1 = at(8, 3) - 0.06;
  const rest = WEFTS - passes.length;
  for (let k = 0; k < rest; k++) {
    const t0 = zipT0 + ((zipT1 - zipT0 - 0.03) * k) / rest;
    passes.push([t0, 0.03 + (0.9 * (zipT1 - zipT0)) / rest]);
  }
  passes.forEach(([t0, d], row) => {
    const dir = row % 2 === 0 ? 1 : -1;
    cues.weft.push({ row, t0, t1: t0 + d, dir });
    if (row < 10) {
      const strum = row < 4 ? ladder('D4', 'D6') : ladder('A4', 'D6');
      gliss(t0 + 0.01, t0 + d - 0.02, dir > 0 ? strum : [...strum].reverse(), row < 4 ? 0.1 : 0.09, row < 4 ? 0.2 : 0.16, {
        tag: 'strum',
        d: 0.7,
        panDir: dir,
      });
      wood(t0 + d, row < 4 ? 0.55 : 0.42, 1 + (row % 2) * 0.06);
    }
  });
  gliss(zipT0, zipT1, ladder('D4', 'A6'), 0.12, 0.3, { tag: 'zip' });
}
// Groove under the weaving.
for (let b = 0; b < 4; b++) {
  kick(at(7, b), b === 0 ? 0.9 : 0.72);
  shake(at(7, b, 2), 0.3);
}
snap(at(7, 1), 0.42);
snap(at(7, 3), 0.46);
for (let e = 0; e < 8; e++) bass(at(7, 0) + e * 2 * S16, e % 2 ? 'G2' : 'G1', 0.26, 0.5);
pad(at(7), ['G2', 'D3', 'G3', 'B3', 'D4'], 2.6, 0.26, { attack: 0.8 });
bell(at(7, 0), 'D6', 0.26, 2.4);
bell(at(7, 2), 'B5', 0.22, 2.2);
kick(at(8, 0), 0.9);
kick(at(8, 1), 0.8);
snap(at(8, 1), 0.5);
for (let e = 0; e < 4; e++) bass(at(8, 0) + e * 2 * S16, e % 2 ? 'A2' : 'A1', 0.26, 0.52);
for (let s = 0; s < 4; s++) bass(at(8, 2, s), 'A1', 0.12, 0.5);
pad(at(8), ['A2', 'E3', 'A3', 'C#4', 'E4'], 1.9, 0.28, { attack: 0.5, release: 0.05 });
bell(at(8, 0), 'E6', 0.22, 1.8);
// Tanggu roll, tightening into the silence.
{
  const hits = [];
  for (let e = 0; e < 2; e++) hits.push(at(8, 0) + e * 2 * S16);
  for (let s = 0; s < 4; s++) hits.push(at(8, 1, s));
  for (let s = 0; s < 8; s++) hits.push(at(8, 2) + s * S32);
  hits.forEach((t, i) => drum(t, 0.28 + (0.5 * i) / hits.length, { tight: 1, pitch: 1 + i * 0.012 }));
}
fx('riser', at(8), at(8, 3), 0.75);

// ─── Silence ────────────────────────────────────────────────────────────────
export const SILENCE = [at(8, 3), at(9)];
score.gates.push(SILENCE);

// ─── Bars 9–10 · 锦绣 ───────────────────────────────────────────────────────
// The drop. Gold thread: the big star on the downbeat, four small stars on
// four sixteenths, each a bronze chime. Every kick sends a wave through cloth.
export const DROP = at(9);
drum(DROP, 1.0);
kick(DROP, 1.0);
sub(DROP, 1.0, 'D1');
z(DROP, 'D2', 1.0, 5, { tag: 'drop' });
z(DROP + 0.004, 'D3', 0.8, 5, { tag: 'drop' });
bell(DROP, 'D5', 0.5, 4);
bell(DROP, 'A5', 0.42, 4);
bell(DROP, 'D6', 0.38, 4);
fx('crash', DROP, DROP + 3, 0.32);
cues.stars.push({ index: 0, t0: DROP, t1: DROP + BEAT * 0.9 });
['A5', 'B5', 'D6', 'E6'].forEach((n, i) => {
  const t = at(9, 1, i);
  bell(t, n, 0.46, 2.8, { pan: -0.4 + i * 0.27 });
  z(t, n, 0.3, 1.0, { pan: -0.4 + i * 0.27, tag: 'star' });
  cues.stars.push({ index: i + 1, t0: t, t1: t + S16 * 0.95 });
});
for (const bar of [9, 10]) {
  for (const [b, s] of [
    [0, 0],
    [1, 2],
    [2, 0],
    [3, 2],
  ]) {
    if (!(bar === 9 && b === 0)) kick(at(bar, b, s), b % 2 ? 0.78 : 0.95);
    cues.pulses.push(at(bar, b, s));
  }
  snap(at(bar, 1), 0.55);
  snap(at(bar, 3), 0.6);
  for (let s = 0; s < 16; s++) shake(at(bar, 0, s), s % 4 === 2 ? 0.42 : s % 2 ? 0.2 : 0.3);
}
[
  [0, 0, 'D2', 0.45],
  [0, 3, 'D2', 0.15],
  [1, 2, 'D3', 0.3],
  [2, 0, 'D2', 0.45],
  [2, 3, 'D2', 0.15],
  [3, 0, 'A1', 0.3],
  [3, 2, 'B1', 0.3],
].forEach(([b, s, n, d]) => bass(at(9, b, s), n, d, 0.72));
[
  [0, 0, 'G1', 0.45],
  [0, 3, 'G1', 0.15],
  [1, 2, 'G2', 0.3],
  [2, 0, 'A1', 0.45],
  [2, 3, 'A1', 0.15],
  [3, 0, 'A2', 0.3],
  [3, 2, 'C#2', 0.3],
].forEach(([b, s, n, d]) => bass(at(10, b, s), n, d, 0.72));
pad(at(9), ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], 2.5, 0.28, { attack: 0.08 });
pad(at(10), ['G2', 'D3', 'G3', 'B3', 'D4'], 1.25, 0.28, { attack: 0.1 });
pad(at(10, 2), ['A2', 'E3', 'A3', 'C#4', 'E4'], 1.3, 0.28, { attack: 0.1 });
// Main theme.
[
  [9, 2, 0, 'F#5', 0.3, 0.66],
  [9, 2, 2, 'A5', 0.3, 0.66],
  [9, 3, 0, 'B5', 0.5, 0.72],
  [9, 3, 3, 'A5', 0.25, 0.54],
  [10, 0, 0, 'D6', 0.9, 0.78],
  [10, 1, 0, 'B5', 0.35, 0.62],
  [10, 1, 2, 'A5', 0.35, 0.6],
  [10, 2, 0, 'E5', 0.5, 0.64],
  [10, 2, 3, 'F#5', 0.25, 0.52],
  [10, 3, 0, 'A5', 0.35, 0.62],
  [10, 3, 2, 'E5', 0.3, 0.55],
].forEach(([bar, b, s, n, d, v]) => z(at(bar, b, s), n, v, d + 1.0, { pan: 0.12, tag: 'theme', vib: d > 0.4 ? 1 : 0 }));
bell(at(10, 0, 0), 'D6', 0.3, 3);
export const TIMELINE = [at(10), at(11) - 0.08];
drum(at(10), 0.78);
for (let s = 0; s < 4; s++) drum(at(10, 3, s), 0.32 + s * 0.12, { tight: 1, pitch: 1.05 + s * 0.03 });

// ─── Bar 11 · 你我皆经纬 ────────────────────────────────────────────────────
// Drums fall away. We dive into one thread and ride it back to the start.
export const DIVE = [at(11), at(11) + 0.8];
export const REWIND = [at(11) + 0.8, at(11, 3) + 0.4];
bell(at(11), 'D6', 0.5, 3.5);
bell(at(11), 'A5', 0.3, 3.5);
z(at(11), 'D5', 0.46, 2.5, { tag: 'melody' });
sub(at(11), 0.4, 'D1');
fx('whoosh', at(11) + 0.05, DIVE[1], 0.36, { rise: true });
pad(at(11), ['B2', 'F#3', 'B3', 'D4'], 1.3, 0.22);
pad(at(11, 2), ['G2', 'D3', 'G3', 'B3'], 1.25, 0.2, { release: 1.4 });
gliss(REWIND[0] + 0.02, REWIND[1] - 0.12, [...ladder('D3', 'D6')].reverse(), 0.22, 0.1, { tag: 'rewind', d: 0.9 });
fx('reverse', REWIND[0] - 0.1, REWIND[1] - 0.05, 0.3);
fx('whoosh', REWIND[0], REWIND[1], 0.4, { rise: false });
kick(at(11, 3, 1), 0.38);
kick(at(11, 3, 2), 0.2);

// ─── Bar 12 · 国庆快乐 ──────────────────────────────────────────────────────
// Same thread, same note, same frame as the first pluck.
export const END_PLUCK = at(12);
z(END_PLUCK, 'D2', 0.95, 6, { tag: 'hook' });
z(END_PLUCK + 0.004, 'D3', 0.72, 6, { tag: 'hook' });
sub(END_PLUCK, 0.5, 'D1');
bell(END_PLUCK, 'D5', 0.34, 5);
bell(END_PLUCK, 'A5', 0.26, 5);
pad(END_PLUCK, ['D3', 'A3', 'D4', 'F#4', 'A4'], 2.2, 0.18, { attack: 0.5, release: 1.5 });
// 国 庆 快 乐 — one harmonic per character as the blessing is set.
['D5', 'F#5', 'A5'].forEach((n, i) => z(at(12, 0, i + 1), n, 0.2 + i * 0.03, 2.6, { tag: 'harmonic', harmonic: true, pan: -0.3 + i * 0.2 }));
z(at(12, 1), 'D6', 0.3, 3, { tag: 'harmonic', harmonic: true });
z(at(12, 2, 2), 'A5', 0.22, 3, { tag: 'harmonic', harmonic: true });

// Notes that visibly shake the lead thread.
for (const e of score.zheng) if (['melody', 'peak', 'ridge', 'home', 'furrow', 'theme', 'star'].includes(e.tag)) cues.plucks.push(e);
for (const k of Object.keys(score)) score[k].sort((a, b) => (a.t ?? a.t0 ?? a[0]) - (b.t ?? b.t0 ?? b[0]));
for (const k of Object.keys(cues)) if (cues[k].length && typeof cues[k][0] === 'object') cues[k].sort((a, b) => (a.t ?? a.t0) - (b.t ?? b.t0));
cues.warpTaut = Array.from({ length: WARPS }, (_, i) => TAUT_T0 + ((TAUT_T1 - TAUT_T0) * i) / (WARPS - 1));

export default score;
