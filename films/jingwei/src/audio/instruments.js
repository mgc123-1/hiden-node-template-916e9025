// Instruments. Each returns a mono Float32Array starting at the event onset
// (or {L, R} for stereo sources). Nothing is sampled; everything is modelled.

import { SR, Biquad, whiteNoise, polyblepSaw } from './dsp.js';

const TAU = Math.PI * 2;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const len = (sec) => Math.max(1, Math.round(sec * SR));

/**
 * Zheng — Karplus–Strong with a fractional-delay loop, a plectrum-shaped
 * excitation, the characteristic "press" pitch settle, and optional 揉弦
 * vibrato. `cut` (seconds from onset) hard-mutes the string.
 */
export function zheng({ m, v, d = 1.6, vib = 0, harmonic = false }, seed, cut = Infinity) {
  const f0 = mtof(m);
  if (harmonic) return zhengHarmonic(f0, v, d, cut);
  // Decay: low strings ring long, high strings short.
  const t60 = Math.max(1.1, 6.5 - (m - 38) * 0.11);
  const ring = Math.min(cut, d + 0.35, t60);
  const n = len(Math.min(cut, ring + 0.05));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const maxDelay = Math.ceil(SR / f0) + 8;
  const buf = new Float32Array(maxDelay * 2 + 8);
  const size = buf.length;
  // Excitation: a short, slightly lowpassed noise burst + plectrum impulse,
  // combed at the pluck position (near the bridge → bright, nasal).
  const exLen = Math.round(SR / f0);
  const ex = new Float32Array(exLen);
  const bright = 0.35 + 0.5 * v;
  let lp = 0;
  for (let i = 0; i < exLen; i++) {
    lp += (noise() - lp) * bright;
    ex[i] = lp + (i < 3 ? 1.2 : 0);
  }
  const pick = Math.max(1, Math.round(exLen * 0.14));
  for (let i = exLen - 1; i >= pick; i--) ex[i] -= ex[i - pick] * 0.9;
  for (let i = 0; i < exLen; i++) buf[i] = ex[i] * 0.6;
  let w = exLen;
  // Loop gain from T60; loop lowpass gets darker for low notes.
  const g = 10 ** (-3 / (f0 * t60));
  const damp = Math.min(0.62, 0.18 + (84 - m) * 0.006);
  // The loop lowpass adds phase delay; take it out of the line so high strings stay in tune.
  const lpDelay = damp / (1 - damp);
  let prev = 0;
  let phase = 0;
  const release = len(0.08);
  const stopAt = len(ring);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Pitch: pressed sharp on the attack, then settles; vibrato after 0.25 s.
    let cents = 14 * Math.exp(-t / 0.045);
    if (vib) {
      const depth = 16 * Math.min(1, Math.max(0, (t - 0.22) / 0.35));
      phase += (TAU * 5.4) / SR;
      cents += depth * Math.sin(phase);
    }
    const period = SR / (f0 * 2 ** (cents / 1200)) - lpDelay;
    const rp = w - period;
    const ri = Math.floor(rp);
    const fr = rp - ri;
    const a = buf[((ri % size) + size) % size];
    const b = buf[(((ri + 1) % size) + size) % size];
    const x = a + (b - a) * fr;
    const y = (x * (1 - damp) + prev * damp) * g;
    prev = y;
    buf[w % size] = y;
    w++;
    let env = 1;
    if (i > stopAt - release) env = Math.max(0, (stopAt - i) / release);
    out[i] = y * env;
  }
  // Soundboard: a couple of broad resonances, plus pluck noise ("tick").
  const body1 = new Biquad('peak', 260, 1.2, 4);
  const body2 = new Biquad('peak', 2400, 1.0, 3);
  const hp = new Biquad('hp', 55, 0.7);
  for (let i = 0; i < n; i++) out[i] = hp.step(body2.step(body1.step(out[i])));
  const tick = len(0.006);
  for (let i = 0; i < Math.min(tick, n); i++) out[i] += noise() * 0.25 * v * (1 - i / tick);
  const gain = v * 0.55;
  for (let i = 0; i < n; i++) out[i] *= gain;
  return out;
}

/** 泛音 — a harmonic touched at the node: nearly a sine, glassy. */
function zhengHarmonic(f0, v, d, cut) {
  const n = len(Math.min(cut, d + 0.4));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = (1 - Math.exp(-t / 0.002)) * Math.exp(-t / (d * 0.42));
    out[i] = (Math.sin(TAU * f0 * t) + 0.18 * Math.sin(TAU * 2 * f0 * t) * Math.exp(-t / 0.3) + 0.05 * Math.sin(TAU * 3 * f0 * t)) * env * v * 0.42;
  }
  return out;
}

/** Bronze chime (bianzhong-like): inharmonic partials, each with its own decay. */
export function bell({ m, v, d = 3 }, seed, cut = Infinity) {
  const f = mtof(m);
  const n = len(Math.min(cut, d + 0.5));
  const out = new Float32Array(n);
  const partials = [
    [0.5, 0.12, 1.0],
    [1.0, 1.0, 1.0],
    [1.19, 0.12, 0.55],
    [1.5, 0.22, 0.5],
    [2.0, 0.42, 0.42],
    [2.52, 0.2, 0.3],
    [3.01, 0.16, 0.22],
    [4.16, 0.1, 0.14],
    [5.43, 0.06, 0.09],
  ];
  const noise = whiteNoise(seed);
  for (const [r, a, dk] of partials) {
    const ff = f * r;
    if (ff > SR * 0.45) continue;
    const tau = d * 0.36 * dk;
    const beat = 0.35 + r * 0.2;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] += a * Math.exp(-t / tau) * (Math.sin(TAU * ff * t) * 0.7 + Math.sin(TAU * (ff + beat) * t) * 0.3);
    }
  }
  // Mallet strike.
  const bp = new Biquad('bp', Math.min(9000, f * 3.2), 1.2);
  const strike = len(0.012);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = out[i] * (1 - Math.exp(-t / 0.0015)) + (i < strike ? bp.step(noise()) * (1 - i / strike) * 0.8 : 0);
  }
  const g = v * 0.3;
  for (let i = 0; i < n; i++) out[i] *= g;
  return out;
}

export function kick({ v }, seed, cut = Infinity) {
  const n = len(Math.min(cut, 0.6));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  let ph = 0;
  const hp = new Biquad('hp', 1800, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 46 + 120 * Math.exp(-t / 0.032) + 20 * Math.exp(-t / 0.2);
    ph += (TAU * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.26) * (1 - Math.exp(-t / 0.0015));
    const click = hp.step(noise()) * Math.exp(-t / 0.004) * 0.35;
    out[i] = Math.tanh((body + click) * 1.6) * v * 0.72;
  }
  return out;
}

/** 堂鼓 tanggu: circular-membrane modes over a falling pitch, plus stick. */
export function drum({ v, tight = 0, pitch = 1 }, seed, cut = Infinity) {
  const dur = tight ? 0.45 : 1.8;
  const n = len(Math.min(cut, dur));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const f0 = (tight ? 118 : 74) * pitch;
  const modes = [
    [1.0, 1.0, 1.0],
    [1.59, 0.55, 0.55],
    [2.14, 0.35, 0.4],
    [2.3, 0.22, 0.32],
    [2.65, 0.16, 0.25],
  ];
  const decay = tight ? 0.16 : 0.75;
  for (const [r, a, dk] of modes) {
    let ph = seed * 0.1 * r;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const bend = 1 + 0.28 * Math.exp(-t / 0.05);
      ph += (TAU * f0 * r * bend) / SR;
      out[i] += a * Math.sin(ph) * Math.exp(-t / (decay * dk));
    }
  }
  const bp = new Biquad('bp', tight ? 1400 : 900, 0.9);
  const stick = len(0.025);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const sk = i < stick ? bp.step(noise()) * (1 - i / stick) ** 2 * 1.4 : 0;
    out[i] = Math.tanh((out[i] * (1 - Math.exp(-t / 0.001)) + sk) * 1.3) * v * (tight ? 0.5 : 0.8);
  }
  return out;
}

export function snap({ v }, seed, cut = Infinity) {
  const n = len(Math.min(cut, 0.3));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 1700, 0.7);
  const hp = new Biquad('hp', 600, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 0;
    for (const o of [0, 0.009, 0.019]) if (t >= o) env += Math.exp(-(t - o) / 0.0055) * 0.8;
    if (t >= 0.026) env += Math.exp(-(t - 0.026) / 0.085);
    out[i] = hp.step(bp.step(noise())) * env * v * 0.9;
  }
  return out;
}

export function shaker({ v }, seed, cut = Infinity) {
  const n = len(Math.min(cut, 0.12));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const hp = new Biquad('hp', 6500, 0.8);
  const pk = new Biquad('peak', 9500, 1, 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = (1 - Math.exp(-t / 0.004)) * Math.exp(-t / 0.028);
    out[i] = pk.step(hp.step(noise())) * env * v * 0.55;
  }
  return out;
}

/** Woodblock: two inharmonic damped modes + a hard click. */
export function wood({ v, pitch = 1 }, seed, cut = Infinity) {
  const n = len(Math.min(cut, 0.16));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const f1 = 880 * pitch;
  const f2 = 1390 * pitch;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] =
      (Math.sin(TAU * f1 * t) * Math.exp(-t / 0.028) + 0.5 * Math.sin(TAU * f2 * t) * Math.exp(-t / 0.018) + noise() * Math.exp(-t / 0.0015) * 0.6) *
      v *
      0.6;
  }
  return out;
}

export function bass({ m, v, d }, seed, cut = Infinity) {
  const f = mtof(m);
  const n = len(Math.min(cut, d + 0.12));
  const out = new Float32Array(n);
  let ph = 0;
  const lp = new Biquad('lp', 420, 0.8);
  const off = len(d);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * f) / SR;
    const env = (1 - Math.exp(-t / 0.006)) * (i < off ? 1 : Math.exp(-(i - off) / (0.035 * SR))) * (0.8 + 0.2 * Math.exp(-t / 0.25));
    const x = Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph) * Math.exp(-t / 0.1);
    out[i] = lp.step(Math.tanh(x * 1.3)) * env * v * 0.62;
  }
  return out;
}

export function sub({ v, m }, seed, cut = Infinity) {
  const f = mtof(m);
  const n = len(Math.min(cut, 1.4));
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 + 1.2 * Math.exp(-t / 0.05))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / 0.55) * (1 - Math.exp(-t / 0.003)) * v * 0.8;
  }
  return out;
}

/** String pad: three detuned band-limited saws per note, lowpassed, stereo. */
export function pad({ m: notes, v, d, attack = 0.6, release = 1.2 }, seed, cut = Infinity) {
  const n = len(Math.min(cut, d + release));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const detune = [-7, 0, 6.5];
  const pans = [-0.8, 0, 0.8];
  const off = len(d);
  notes.forEach((m, k) => {
    const f = mtof(m);
    detune.forEach((c, j) => {
      const ff = f * 2 ** (c / 1200);
      let ph = ((seed * 0.137 + k * 0.31 + j * 0.53) % 1 + 1) % 1;
      const dt = ff / SR;
      const a = ((pans[j] + 1) * Math.PI) / 4;
      const gl = Math.cos(a);
      const gr = Math.sin(a);
      let vibPh = j * 1.7;
      for (let i = 0; i < n; i++) {
        vibPh += (TAU * 4.8) / SR;
        const vib = 1 + 0.0016 * Math.sin(vibPh) * Math.min(1, i / (SR * 0.8));
        ph += dt * vib;
        if (ph >= 1) ph -= 1;
        const s = polyblepSaw(ph, dt);
        L[i] += s * gl;
        R[i] += s * gr;
      }
    });
  });
  const lpL = new Biquad('lp', 1500, 0.6);
  const lpR = new Biquad('lp', 1500, 0.6);
  const lpL2 = new Biquad('lp', 2400, 0.5);
  const lpR2 = new Biquad('lp', 2400, 0.5);
  const hpL = new Biquad('hp', 140, 0.7);
  const hpR = new Biquad('hp', 140, 0.7);
  const g = (v * 0.16) / Math.sqrt(notes.length);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const envA = Math.min(1, t / attack);
    const env = (envA * envA * (3 - 2 * envA)) * (i < off ? 1 : Math.exp(-(i - off) / (release * 0.35 * SR)));
    L[i] = hpL.step(lpL2.step(lpL.step(L[i]))) * env * g;
    R[i] = hpR.step(lpR2.step(lpR.step(R[i]))) * env * g;
  }
  return { L, R };
}

// ─── Effects ────────────────────────────────────────────────────────────────

/** Needle through paper: a sharp tick, a few fibre crackles, a soft thump. */
export function pierce({ v }, seed) {
  const n = len(0.22);
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const hp = new Biquad('hp', 3000, 0.8);
  const bp = new Biquad('bp', 4200, 2);
  const crackles = [0.004, 0.011, 0.019, 0.027, 0.041, 0.058];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let c = hp.step(noise()) * Math.exp(-t / 0.0012) * 1.2;
    for (const o of crackles) if (t >= o) c += bp.step(noise()) * Math.exp(-(t - o) / 0.0016) * 0.35;
    c += Math.sin(TAU * 170 * t) * Math.exp(-t / 0.018) * 0.4;
    out[i] = c * v * 0.7;
  }
  return out;
}

/** Filtered-noise swish. rise=true sweeps up, false sweeps down. Stereo pan sweep. */
export function whoosh({ t0, t1, v, rise = true }, seed) {
  const dur = t1 - t0;
  const n = len(dur + 0.15);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 500, 1.2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = Math.min(1, t / dur);
    const u = rise ? k : 1 - k;
    if (i % 32 === 0) bp.set('bp', 300 * 2 ** (u * 4.2), 1.3);
    const peak = rise ? 0.78 : 0.3;
    const env = (k < peak ? (k / peak) ** 2 : Math.max(0, 1 - (k - peak) / (1 - peak + 0.12)) ** 1.5) * (t > dur ? Math.exp(-(t - dur) / 0.04) : 1);
    const s = bp.step(noise()) * env * v * 1.1;
    const p = (rise ? k : 1 - k) * 0.9 - 0.45;
    const a = ((p + 1) * Math.PI) / 4;
    L[i] = s * Math.cos(a);
    R[i] = s * Math.sin(a);
  }
  return { L, R };
}

/** Tension riser: noise + sine sweep, exponential swell, cut dead at t1. */
export function riser({ t0, t1, v }, seed) {
  const dur = t1 - t0;
  const n = len(dur);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const nl = whiteNoise(seed);
  const nr = whiteNoise(seed + 7);
  const bpl = new Biquad('bp', 400, 2);
  const bpr = new Biquad('bp', 400, 2);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = t / dur;
    if (i % 32 === 0) {
      const f = 250 * 2 ** (k * 4.5);
      bpl.set('bp', f, 1.5 + k * 3);
      bpr.set('bp', f * 1.03, 1.5 + k * 3);
    }
    ph += (TAU * 180 * 2 ** (k * 3.2)) / SR;
    const env = k ** 2.4 * (1 - Math.exp(-(dur - t) / 0.003));
    const tone = Math.sin(ph) * 0.18 + Math.sin(ph * 1.5) * 0.08;
    L[i] = (bpl.step(nl()) * 0.9 + tone) * env * v * 0.7;
    R[i] = (bpr.step(nr()) * 0.9 + tone) * env * v * 0.7;
  }
  return { L, R };
}

/** Reverse swell: bright noise growing into the downbeat. */
export function reverse({ t0, t1, v }, seed) {
  const dur = t1 - t0;
  const n = len(dur);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const nl = whiteNoise(seed);
  const nr = whiteNoise(seed + 3);
  const hl = new Biquad('hp', 2500, 0.7);
  const hr = new Biquad('hp', 2500, 0.7);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const env = Math.exp((k - 1) * 4.5) * Math.min(1, (n - i) / (0.004 * SR));
    L[i] = hl.step(nl()) * env * v * 0.55;
    R[i] = hr.step(nr()) * env * v * 0.55;
  }
  return { L, R };
}

/** Needle punching cloth: a train of tiny dry ticks at the visual stitch times. */
export function stitchTrain({ t0, times, v }, seed) {
  const end = times[times.length - 1] - t0 + 0.05;
  const n = len(end);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 5200, 1.6);
  const tick = len(0.004);
  times.forEach((t, k) => {
    const s0 = Math.round((t - t0) * SR);
    const g = v * (0.75 + 0.25 * noise());
    const pan = Math.sin(k * 1.7) * 0.4;
    for (let i = 0; i < tick && s0 + i < n; i++) {
      const x = noise() * (1 - i / tick) ** 2 * g;
      L[s0 + i] += x * (1 - pan);
      R[s0 + i] += x * (1 + pan);
    }
  });
  for (let i = 0; i < n; i++) {
    L[i] = bp.step(L[i]);
  }
  const bp2 = new Biquad('bp', 5200, 1.6);
  for (let i = 0; i < n; i++) R[i] = bp2.step(R[i]);
  return { L, R };
}

/** Soft metallic wash for the drop (a restrained cymbal). */
export function crash({ t0, t1, v }, seed) {
  const n = len(t1 - t0);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const nl = whiteNoise(seed);
  const nr = whiteNoise(seed + 5);
  const hl = new Biquad('hp', 4200, 0.7);
  const hr = new Biquad('hp', 4200, 0.7);
  const partials = [3170, 4230, 5410, 6880, 8120];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let ring = 0;
    for (const p of partials) ring += Math.sin(TAU * p * t + p);
    const env = (1 - Math.exp(-t / 0.002)) * Math.exp(-t / 0.9);
    L[i] = (hl.step(nl()) + ring * 0.04) * env * v * 0.6;
    R[i] = (hr.step(nr()) + ring * 0.04) * env * v * 0.6;
  }
  return { L, R };
}
