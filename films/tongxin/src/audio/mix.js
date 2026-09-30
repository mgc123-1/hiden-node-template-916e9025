// Renders the score to a mastered stereo bus.

import score, { GATES } from './score.js';
import { DURATION } from '../core.js';
import { SR, Bus, Biquad, Reverb, pingPong, limit } from './dsp.js';
import * as I from './instruments.js';
import * as F from './folk.js';

const idx = (t) => Math.round(t * SR);

export function renderSoundtrack({ log = () => {} } = {}) {
  const N = Math.round(DURATION * SR);
  // A note that starts before a silence is muted at its edge.
  const cutFor = (t) => {
    for (const [g0] of GATES) if (t < g0) return g0 - t;
    return Infinity;
  };
  let seed = 1;
  const buses = {
    pluck: new Bus(N), // rawap, zheng, pizz
    wind: new Bus(N), // flute, hulusi
    bowed: new Bus(N),
    bell: new Bus(N),
    drums: new Bus(N), // kick, drum, sub, dap dum, hooves
    perc: new Bus(N), // dap, snap, shaker, wood, cha, stitch
    bass: new Bus(N),
    drone: new Bus(N),
    pad: new Bus(N), // pad, tutti
    gong: new Bus(N),
    fx: new Bus(N),
    crowd: new Bus(N),
  };
  const E = (k) => score[k] || [];
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

  mono(buses.pluck, (e, s, c) => F.pluck({ ...e, kind: 'rawap' }, s, c), E('rawap'));
  mono(buses.pluck, (e, s, c) => F.pluck({ ...e, kind: 'pizz' }, s, c), E('pizz'));
  mono(buses.pluck, I.zheng, E('zheng'), 1.1);
  mono(buses.wind, F.flute, E('flute'));
  mono(buses.wind, F.hulusi, E('hulusi'));
  mono(buses.bowed, F.bowed, E('bowed'));
  mono(buses.bell, I.bell, E('bell'));
  mono(buses.bell, (e, s, c) => I.bell({ ...e, d: e.d ?? 1.2 }, s, c), E('sbell'), 0.7);
  mono(buses.drums, I.kick, E('kick'));
  mono(buses.drums, I.drum, E('drum'));
  mono(buses.drums, I.sub, E('sub'));
  mono(buses.drums, F.hoof, E('hoof'), 0.8);
  mono(buses.perc, F.dap, E('dap'));
  mono(buses.perc, I.snap, E('snap').map((e) => ({ ...e, pan: 0.1 })));
  mono(buses.perc, I.shaker, E('shaker'));
  mono(buses.perc, I.wood, E('wood').map((e, i) => ({ ...e, pan: i % 2 ? -0.3 : 0.25 })));
  mono(buses.perc, F.cha, E('cha').map((e, i) => ({ ...e, pan: i % 2 ? 0.3 : -0.3 })));
  mono(buses.perc, F.stitch, E('stitch').map((e, i) => ({ ...e, v: 0.35, pan: Math.sin(i * 1.7) * 0.5 })));
  mono(buses.bass, I.bass, E('bass'));
  mono(buses.drone, F.drone, E('drone'));
  stereo(buses.pad, I.pad, E('pad'));
  stereo(buses.pad, F.tutti, E('tutti'));
  stereo(buses.gong, F.gong, E('gong'));
  for (const e of E('crash')) {
    const { L, R } = I.crash({ t0: e.t, t1: e.t + 2.5, v: e.v }, seed++);
    buses.perc.addStereo(L, R, idx(e.t), 0.8);
  }
  stereo(buses.crowd, F.crowd, E('crowd'));
  mono(buses.fx, F.shutter, E('shutter'));
  mono(buses.fx, F.stamp, E('stamp'));
  for (const e of E('fx')) {
    const fns = { silk: F.silk, rain: F.rain, paper: F.paper, whoosh: I.whoosh, riser: I.riser, reverse: I.reverse };
    if (e.type === 'crackle') {
      buses.fx.addMono(F.crackle({ v: e.v, d: 0.5 }, seed++), idx(e.t), 1, 0.2);
      continue;
    }
    const out = fns[e.type](e, seed++);
    if (out instanceof Float32Array) buses.fx.addMono(out, idx(e.t0), 1, 0);
    else buses.fx.addStereo(out.L, out.R, idx(e.t0), 1);
  }
  log('instruments rendered');

  // Sidechain: bass, drone and pads breathe with the kick and the big drum.
  const duck = new Float32Array(N).fill(1);
  for (const e of [...E('kick'), ...E('drum').filter((d) => !d.tight)]) {
    const s0 = idx(e.t);
    const depth = 0.45 * Math.min(1, e.v);
    for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
      const t = i / SR;
      const g = 1 - depth * Math.exp(-t / 0.11) * Math.min(1, t / 0.004 + 0.4);
      if (g < duck[s0 + i]) duck[s0 + i] = g;
    }
  }
  for (const b of [buses.bass, buses.pad, buses.drone]) for (let i = 0; i < N; i++) {
    b.L[i] *= duck[i];
    b.R[i] *= duck[i];
  }

  const eq = (bus, specs) => {
    for (const ch of [bus.L, bus.R]) for (const [type, f, q, g] of specs) new Biquad(type, f, q, g).run(ch);
  };
  eq(buses.pluck, [['hp', 80, 0.7], ['peak', 3200, 0.9, 1.5]]);
  eq(buses.wind, [['hp', 200, 0.7], ['peak', 2500, 1, 1]]);
  eq(buses.bowed, [['hp', 120, 0.7]]);
  eq(buses.bell, [['hp', 200, 0.7]]);
  eq(buses.drums, [['peak', 60, 0.9, 2], ['peak', 380, 1.2, -3]]);
  eq(buses.perc, [['hp', 250, 0.7]]);
  eq(buses.pad, [['peak', 450, 1.0, -2.5]]);
  eq(buses.crowd, [['hp', 180, 0.7], ['peak', 2500, 1, 2]]);

  if (process.env.BUS_RMS) {
    const secs = [['turpan', 1.9, 5.4], ['tibet', 5.6, 9.2], ['mongol', 9.4, 12.9], ['south', 13.1, 16.8], ['mont', 16.9, 24.3], ['beij', 24.4, 25.7], ['hit', 26.25, 28.1], ['end', 28.1, 30]];
    for (const [k, b] of Object.entries(buses)) {
      const row = secs.map(([nm, a, z]) => {
        let s = 0;
        for (let i = idx(a); i < idx(z); i++) s += b.L[i] ** 2 + b.R[i] ** 2;
        return `${nm}:${(10 * Math.log10(s / (2 * (idx(z) - idx(a))) + 1e-12)).toFixed(0)}`;
      });
      log(`${k.padEnd(6)} ${row.join(' ')}`);
    }
  }
  const gains = { pluck: 2.3, wind: 2.1, bowed: 2.0, bell: 1.1, drums: 0.3, perc: 0.9, bass: 0.4, drone: 0.6, pad: 1.5, gong: 0.9, fx: 0.7, crowd: 1.5 };
  const sends = { pluck: 0.45, wind: 0.55, bowed: 0.45, bell: 0.75, drums: 0.2, perc: 0.18, bass: 0.0, drone: 0.3, pad: 0.45, gong: 0.4, fx: 0.3, crowd: 0.35 };

  const dry = new Bus(N);
  const send = new Bus(N);
  const delaySend = new Bus(N);
  for (const [k, b] of Object.entries(buses)) {
    b.mixInto(dry, gains[k]);
    b.mixInto(send, gains[k] * sends[k]);
  }
  buses.pluck.mixInto(delaySend, 0.18);
  buses.wind.mixInto(delaySend, 0.12);
  buses.bell.mixInto(delaySend, 0.12);

  const flushAt = GATES.map(([g0]) => idx(g0));
  const wet = new Reverb({ room: 0.86, damp: 0.3 }).process(send, flushAt);
  const echo = pingPong(delaySend, 0.46875 * 0.75, 0.3, 3200, flushAt);
  log('reverb/delay rendered');

  const master = new Bus(N);
  dry.mixInto(master, 1);
  wet.mixInto(master, 0.55);
  echo.mixInto(master, 0.45);
  eq(master, [['hp', 30, 0.7], ['peak', 220, 0.8, -1.5], ['highshelf', 10000, 0.7, 1.2]]);

  // Fader ride: the lands sit back so the montage and the hit can open up.
  const ride = [[0, 0.9], [5.4, 0.92], [5.8, 0.7], [9.2, 0.72], [9.5, 0.8], [12.9, 0.84], [16.7, 0.86], [16.9, 1.05], [24.3, 1.1], [26.2, 1.1], [26.3, 1.18], [28.1, 1.12], [30, 1.0]];
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
  // Glue compressor.
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
  const rms = (a, b) => {
    let s = 0;
    for (let i = idx(a); i < idx(b); i++) s += master.L[i] ** 2 + master.R[i] ** 2;
    return Math.sqrt(s / (2 * (idx(b) - idx(a))));
  };
  const target = 10 ** (-12.5 / 20);
  const makeup = target / rms(16.9, 24.3);
  for (let i = 0; i < N; i++) {
    master.L[i] = Math.tanh(master.L[i] * makeup * 1.05) / 1.05;
    master.R[i] = Math.tanh(master.R[i] * makeup * 1.05) / 1.05;
  }
  // The ride goes after the glue so the lands really do sit back.
  for (let i = 0; i < N; i++) {
    const g = rideAt(i / SR);
    master.L[i] *= g;
    master.R[i] *= g;
  }
  limit(master, -1.0);
  // The silence is absolute; head and tail fades.
  const gateEnv = (t) => {
    let g = 1;
    for (const [g0, g1] of GATES) if (t >= g0 - 0.012 && t < g1) g = Math.min(g, Math.max(0, (g0 - t) / 0.012));
    if (t < 0.01) g *= t / 0.01;
    if (t > DURATION - 0.6) g *= Math.max(0, (DURATION - t) / 0.6) ** 1.5;
    return g;
  };
  for (let i = 0; i < N; i++) {
    const g = gateEnv(i / SR);
    master.L[i] *= g;
    master.R[i] *= g;
  }
  const sections = [['hook', 0, 1.875], ['turpan', 1.875, 5.4], ['tibet', 5.6, 9.2], ['mongol', 9.4, 12.9], ['south', 13.1, 16.8], ['montage', 16.9, 24.3], ['weave', 24.4, 25.75], ['silence', 25.8, 26.24], ['hit', 26.25, 28.1], ['end', 28.1, 30]];
  for (const [name, a, b] of sections) log(`${name.padEnd(8)} ${(20 * Math.log10(rms(a, b) + 1e-9)).toFixed(1)} dBFS rms`);
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(master.L[i]), Math.abs(master.R[i]));
  log(`peak ${(20 * Math.log10(pk)).toFixed(2)} dBFS, makeup ${(20 * Math.log10(makeup)).toFixed(1)} dB`);
  return master;
}
