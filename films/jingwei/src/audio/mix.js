// Renders the score to a mastered stereo bus.

import score, { TIMELINE } from '../score.js';
import { buildJourney } from '../world/journey.js';
import { buildLoom } from '../world/loom.js';
import { DURATION } from '../core/time.js';
import { SR, Bus, Biquad, Reverb, pingPong, limit } from './dsp.js';
import * as I from './instruments.js';
import { renderFoley } from './foley.js';

const idx = (t) => Math.round(t * SR);

export function renderSoundtrack({ log = () => {} } = {}) {
  const N = Math.round(DURATION * SR);
  const gates = score.gates;
  // A note that starts before a silence is muted at its edge.
  const cutFor = (t) => {
    for (const [g0] of gates) if (t < g0) return g0 - t;
    return Infinity;
  };
  let seed = 1;

  const buses = {
    zheng: new Bus(N),
    bell: new Bus(N),
    drums: new Bus(N),
    perc: new Bus(N),
    bass: new Bus(N),
    pad: new Bus(N),
    fx: new Bus(N),
    foley: new Bus(N),
  };

  const mono = (bus, fn, events, gain = 1) => {
    for (const e of events) {
      const buf = fn(e, seed++, cutFor(e.t));
      bus.addMono(buf, idx(e.t), gain, e.pan ?? 0);
    }
  };
  const stereo = (bus, fn, events, gain = 1) => {
    for (const e of events) {
      const t = e.t ?? e.t0;
      const { L, R } = fn(e, seed++, cutFor(t));
      bus.addStereo(L, R, idx(t), gain);
    }
  };

  mono(buses.zheng, I.zheng, score.zheng);
  mono(buses.bell, I.bell, score.bell);
  mono(buses.drums, I.kick, score.kick);
  mono(buses.drums, I.drum, score.drum);
  mono(buses.drums, I.sub, score.sub);
  mono(buses.perc, I.snap, score.snap.map((e) => ({ ...e, pan: 0.08 })));
  mono(buses.perc, I.shaker, score.shaker.map((e, i) => ({ ...e, pan: i % 2 ? 0.35 : 0.2 })));
  mono(buses.perc, I.wood, score.wood.map((e) => ({ ...e, pan: -0.15 })));
  mono(buses.bass, I.bass, score.bass);
  stereo(buses.pad, I.pad, score.pad);
  for (const e of score.fx) {
    const fn = { pierce: I.pierce, whoosh: I.whoosh, riser: I.riser, reverse: I.reverse, crash: I.crash }[e.type];
    const out = fn(e, seed++);
    if (out instanceof Float32Array) buses.fx.addMono(out, idx(e.t0), 1, 0);
    else buses.fx.addStereo(out.L, out.R, idx(e.t0), 1);
  }
  // Needle through cloth: one tick per gold stitch, one per timeline stitch.
  {
    const loom = buildLoom(buildJourney());
    for (const s of loom.stars) {
      const times = [...new Set(s.stitches.map((st) => +(s.t0 + (s.t1 - s.t0) * st.sweep).toFixed(4)))].filter((_, k) => k % 2 === 0);
      const { L, R } = I.stitchTrain({ t0: s.t0, times, v: s.index === 0 ? 0.5 : 0.35 }, seed++);
      buses.fx.addStereo(L, R, idx(s.t0), 1);
    }
    const N77 = loom.timeline.stitches.length;
    const times = Array.from({ length: N77 }, (_, k) => TIMELINE[0] + ((TIMELINE[1] - TIMELINE[0]) * k) / N77);
    const { L, R } = I.stitchTrain({ t0: TIMELINE[0], times, v: 0.3 }, seed++);
    buses.fx.addStereo(L, R, idx(TIMELINE[0]), 1);
  }
  {
    const f = renderFoley(N);
    buses.foley.addStereo(f.L, f.R, 0, 1);
  }
  log('instruments rendered');

  // Sidechain: bass and pad breathe with the kick and the big drum.
  const duck = new Float32Array(N).fill(1);
  for (const e of [...score.kick, ...score.drum.filter((d) => !d.tight)]) {
    const s0 = idx(e.t);
    const depth = 0.5 * Math.min(1, e.v);
    for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
      const t = i / SR;
      const g = 1 - depth * Math.exp(-t / 0.11) * Math.min(1, t / 0.004 + 0.4);
      if (g < duck[s0 + i]) duck[s0 + i] = g;
    }
  }
  for (const b of [buses.bass, buses.pad]) for (let i = 0; i < N; i++) {
    b.L[i] *= duck[i];
    b.R[i] *= duck[i];
  }

  // Bus EQ.
  const eq = (bus, specs) => {
    for (const ch of [bus.L, bus.R]) for (const [type, f, q, g] of specs) new Biquad(type, f, q, g).run(ch);
  };
  eq(buses.zheng, [['hp', 70, 0.7], ['peak', 3200, 0.9, 1.5], ['highshelf', 9000, 0.7, 1.5]]);
  eq(buses.bell, [['hp', 180, 0.7]]);
  eq(buses.drums, [['peak', 60, 0.9, 2], ['peak', 380, 1.2, -3]]);
  eq(buses.perc, [['hp', 300, 0.7]]);
  eq(buses.pad, [['peak', 450, 1.0, -2.5]]);

  if (process.env.BUS_RMS) {
    const secs = [['pulse', 2.5, 5], ['land', 5, 7.5], ['harv', 10, 12.5], ['many', 12.5, 15], ['weave', 15, 19.3], ['flag', 20, 25], ['end', 27.5, 30]];
    for (const [k, b] of Object.entries(buses)) {
      const row = secs.map(([nm, a, z]) => {
        let s = 0;
        for (let i = idx(a); i < idx(z); i++) s += b.L[i] ** 2 + b.R[i] ** 2;
        return `${nm}:${(10 * Math.log10(s / (2 * (idx(z) - idx(a))) + 1e-12)).toFixed(0)}`;
      });
      log(`${k.padEnd(6)} ${row.join(' ')}`);
    }
  }
  const gains = { zheng: 2.3, bell: 1.1, drums: 0.42, perc: 0.85, bass: 0.42, pad: 1.7, fx: 0.75, foley: 0.07 };
  const sends = { zheng: 0.5, bell: 0.75, drums: 0.22, perc: 0.18, bass: 0.0, pad: 0.45, fx: 0.35, foley: 0.15 };

  const dry = new Bus(N);
  const send = new Bus(N);
  const delaySend = new Bus(N);
  for (const [k, b] of Object.entries(buses)) {
    b.mixInto(dry, gains[k]);
    b.mixInto(send, gains[k] * sends[k]);
  }
  buses.zheng.mixInto(delaySend, 0.22);
  buses.bell.mixInto(delaySend, 0.12);

  const flushAt = gates.map(([g0]) => idx(g0));
  const wet = new Reverb({ room: 0.86, damp: 0.32 }).process(send, flushAt);
  const echo = pingPong(delaySend, 0.46875, 0.32, 3000, flushAt);
  log('reverb/delay rendered');

  const master = new Bus(N);
  dry.mixInto(master, 1);
  wet.mixInto(master, 0.55);
  echo.mixInto(master, 0.5);
  eq(master, [['hp', 30, 0.7], ['peak', 220, 0.8, -1.5], ['highshelf', 10000, 0.7, 1.2]]);

  // Fader ride: the verse sits back so the drop has somewhere to go.
  const ride = [
    [0, 1.0], [2.4, 1.0], [2.6, 0.72], [12.3, 0.76], [12.6, 0.82], [15.0, 0.84], [19.37, 1.0],
    [20.0, 1.12], [24.9, 1.12], [25.1, 0.95], [30, 0.95],
  ];
  const rideAt = (t) => {
    for (let k = 1; k < ride.length; k++) {
      if (t <= ride[k][0]) {
        const [t0, g0] = ride[k - 1];
        const [t1, g1] = ride[k];
        const u = (t - t0) / (t1 - t0);
        return g0 + (g1 - g0) * u * u * (3 - 2 * u);
      }
    }
    return ride[ride.length - 1][1];
  };
  for (let i = 0; i < N; i++) {
    const g = rideAt(i / SR);
    master.L[i] *= g;
    master.R[i] *= g;
  }

  // Glue compressor (stereo-linked RMS, gentle).
  {
    const thr = 10 ** (-16 / 20);
    const ratio = 2.2;
    const att = Math.exp(-1 / (0.01 * SR));
    const rel = Math.exp(-1 / (0.18 * SR));
    let env = 0;
    let gr = 1;
    for (let i = 0; i < N; i++) {
      const x = Math.max(Math.abs(master.L[i]), Math.abs(master.R[i]));
      env = x > env ? x + (env - x) * att : x + (env - x) * rel;
      let target = 1;
      if (env > thr) target = (thr * (env / thr) ** (1 / ratio)) / env;
      gr = target < gr ? target + (gr - target) * att : target + (gr - target) * rel;
      master.L[i] *= gr;
      master.R[i] *= gr;
    }
  }

  // Loudness: set the chorus to a healthy level, then soft-clip and limit.
  const rms = (a, b) => {
    let s = 0;
    for (let i = idx(a); i < idx(b); i++) s += master.L[i] ** 2 + master.R[i] ** 2;
    return Math.sqrt(s / (2 * (idx(b) - idx(a))));
  };
  const target = 10 ** (-12.5 / 20);
  const makeup = target / rms(20, 25);
  for (let i = 0; i < N; i++) {
    master.L[i] = Math.tanh(master.L[i] * makeup * 1.05) / 1.05;
    master.R[i] = Math.tanh(master.R[i] * makeup * 1.05) / 1.05;
  }
  limit(master, -1.0);

  // Hard silences and the head/tail fades.
  const gateEnv = (t) => {
    let g = 1;
    for (const [g0, g1] of gates) {
      if (t >= g0 - 0.012 && t < g1) g = Math.min(g, Math.max(0, (g0 - t) / 0.012));
    }
    if (t < 0.01) g *= t / 0.01;
    if (t > DURATION - 0.9) g *= Math.max(0, (DURATION - t) / 0.9) ** 1.6;
    return g;
  };
  for (let i = 0; i < N; i++) {
    const g = gateEnv(i / SR);
    master.L[i] *= g;
    master.R[i] *= g;
  }

  const sections = [
    ['hook', 0, 2.5], ['pulse', 2.5, 5], ['land', 5, 7.5], ['home', 7.5, 10], ['harvest', 10, 12.5],
    ['many', 12.5, 15], ['weave', 15, 19.375], ['silence', 19.4, 19.99], ['flag', 20, 25], ['return', 25, 27.5], ['end', 27.5, 30],
  ];
  for (const [name, a, b] of sections) log(`${name.padEnd(8)} ${(20 * Math.log10(rms(a, b) + 1e-9)).toFixed(1)} dBFS rms`);
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(master.L[i]), Math.abs(master.R[i]));
  log(`peak ${(20 * Math.log10(pk)).toFixed(2)} dBFS, makeup ${(20 * Math.log10(makeup)).toFixed(1)} dB`);
  return master;
}
