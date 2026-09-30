// The folk band, modelled: dap and rawap for Turpan, a bone flute and a horn
// drone for the plateau, morin khuur and hooves for the grassland, silver bells
// and hulusi for the south; gong, great drum, a crowd and a camera for Beijing.
// Each returns mono Float32Array (or {L, R}) starting at the onset.

import { SR, Biquad, whiteNoise, polyblepSaw } from './dsp.js';

const TAU = Math.PI * 2;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const len = (sec) => Math.max(1, Math.round(sec * SR));

/** Dap (手鼓): a goatskin frame drum ringed with iron jingles. kind: dum | tak | tek | roll */
export function dap({ v, kind = 'dum', d = 0.3 }, seed, cut = Infinity) {
  const dur = kind === 'dum' ? 0.7 : kind === 'roll' ? d + 0.2 : 0.35;
  const n = len(Math.min(cut, dur));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const jingle = new Biquad('hp', 5200, 0.7);
  const jpk = new Biquad('peak', 7800, 2, 6);
  const skin = new Biquad('bp', kind === 'dum' ? 900 : 2600, 0.8);
  if (kind === 'dum') {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      ph += (TAU * (92 + 40 * Math.exp(-t / 0.03))) / SR;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.22) * 0.9 + Math.sin(ph * 2.3) * Math.exp(-t / 0.08) * 0.25 + skin.step(noise()) * Math.exp(-t / 0.01) * 0.5;
    }
  } else if (kind === 'roll') {
    // Finger roll: a stream of soft strokes, swelling.
    const hits = Math.floor(d / 0.045);
    for (let k = 0; k < hits; k++) {
      const s0 = len(k * 0.045 + (noise() * 0.004));
      const g = 0.25 + 0.75 * (k / hits) ** 1.5;
      for (let i = 0; i < len(0.03) && s0 + i < n; i++) out[s0 + i] += skin.step(noise()) * Math.exp(-i / (SR * 0.006)) * g * 0.6;
    }
  } else {
    const f = kind === 'tak' ? 420 : 610;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.035) * 0.5 + skin.step(noise()) * Math.exp(-t / 0.012) * 0.9;
    }
  }
  // Jingles: a shimmer after every stroke.
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = kind === 'roll' ? Math.min(1, t / d) * 0.6 : Math.exp(-t / 0.09);
    out[i] += jpk.step(jingle.step(noise())) * e * (kind === 'dum' ? 0.18 : 0.35);
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 1.2) * v * 0.7;
  return out;
}

/**
 * Generic plucked string (Karplus–Strong), shaped per instrument.
 * rawap: bright, metallic, short, with a sympathetic shimmer.
 */
export function pluck({ m, v, d = 0.6, kind = 'rawap' }, seed, cut = Infinity) {
  const f0 = mtof(m);
  const P = {
    rawap: { t60: 1.4, damp: 0.12, pick: 0.09, body: [[380, 1.4, 5], [2900, 1.2, 5]], bright: 0.85, gain: 0.5 },
    pipa: { t60: 1.8, damp: 0.2, pick: 0.13, body: [[300, 1.2, 4], [2200, 1.0, 3]], bright: 0.7, gain: 0.5 },
    pizz: { t60: 0.6, damp: 0.35, pick: 0.2, body: [[220, 1, 3], [900, 1, 2]], bright: 0.4, gain: 0.55 },
  }[kind];
  const ring = Math.min(cut, d + 0.3, P.t60);
  const n = len(Math.min(cut, ring + 0.05));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const buf = new Float32Array(Math.ceil(SR / f0) * 2 + 16);
  const size = buf.length;
  const exLen = Math.round(SR / f0);
  let lp = 0;
  for (let i = 0; i < exLen; i++) {
    lp += (noise() - lp) * (0.3 + 0.6 * P.bright * v);
    buf[i] = lp + (i < 2 ? 1 : 0);
  }
  const pick = Math.max(1, Math.round(exLen * P.pick));
  for (let i = exLen - 1; i >= pick; i--) buf[i] -= buf[i - pick] * 0.85;
  let w = exLen;
  const g = 10 ** (-3 / (f0 * P.t60));
  const damp = P.damp;
  const lpDelay = damp / (1 - damp);
  let prev = 0;
  const stopAt = len(ring);
  const rel = len(0.05);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const cents = 8 * Math.exp(-t / 0.03);
    const period = SR / (f0 * 2 ** (cents / 1200)) - lpDelay;
    const rp = w - period;
    const ri = Math.floor(rp);
    const fr = rp - ri;
    const a = buf[((ri % size) + size) % size];
    const b = buf[(((ri + 1) % size) + size) % size];
    const y = ((a + (b - a) * fr) * (1 - damp) + prev * damp) * g;
    prev = y;
    buf[w % size] = y;
    w++;
    out[i] = y * (i > stopAt - rel ? Math.max(0, (stopAt - i) / rel) : 1);
  }
  const filters = P.body.map(([f, q, gdb]) => new Biquad('peak', f, q, gdb));
  const hp = new Biquad('hp', 90, 0.7);
  for (let i = 0; i < n; i++) {
    let x = out[i];
    for (const f of filters) x = f.step(x);
    out[i] = hp.step(x);
  }
  if (kind === 'rawap') {
    // Sympathetic strings: a faint, detuned octave shimmer.
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] += Math.sin(TAU * f0 * 2.004 * t) * Math.exp(-t / 0.5) * 0.04 * (1 - Math.exp(-t / 0.05));
    }
  }
  for (let i = 0; i < n; i++) out[i] *= v * P.gain;
  return out;
}

/** Bone flute / dizi: breathy tone with a chiff, a scoop and delayed vibrato. */
export function flute({ m, v, d = 0.5, vib = 1, bend = 0 }, seed, cut = Infinity) {
  const f = mtof(m);
  const n = len(Math.min(cut, d + 0.18));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const breath = new Biquad('bp', Math.min(9000, f * 2), 2.5);
  const chiff = new Biquad('bp', Math.min(9000, f * 4), 1.5);
  const air = new Biquad('hp', 2500, 0.7);
  let ph = 0;
  let vph = seed;
  const off = len(d);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    vph += (TAU * 5.2) / SR;
    const vdepth = vib * 0.012 * Math.min(1, Math.max(0, (t - 0.18) / 0.3));
    const scoop = -0.03 * Math.exp(-t / 0.05) + bend * Math.min(1, t / d);
    ph += (TAU * f * (1 + scoop + vdepth * Math.sin(vph))) / SR;
    const att = 1 - Math.exp(-t / 0.035);
    const env = att * (i < off ? 1 : Math.exp(-(i - off) / (0.06 * SR)));
    const tone = Math.sin(ph) + 0.22 * Math.sin(2 * ph) + 0.06 * Math.sin(3 * ph);
    const br = breath.step(noise()) * 0.35 + air.step(noise()) * 0.05;
    const ch = chiff.step(noise()) * Math.exp(-t / 0.025) * 0.9;
    out[i] = (tone * (0.85 + 0.15 * Math.sin(vph * 0.5)) + br) * env * v * 0.32 + ch * v * 0.25;
  }
  return out;
}

/** Horn / tanbur drone: dark saw through a slowly breathing formant. */
export function drone({ m, v, d = 2, bright = 0.3 }, seed, cut = Infinity) {
  const f = mtof(m);
  const n = len(Math.min(cut, d + 0.5));
  const out = new Float32Array(n);
  const lp = new Biquad('lp', 400, 0.9);
  const f1 = new Biquad('peak', 320, 3, 7);
  const f2 = new Biquad('peak', 900, 3, 5);
  let ph = seed * 0.37 % 1;
  let ph2 = 0.5;
  const off = len(d);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 64 === 0) lp.set('lp', 300 + 900 * bright * (0.6 + 0.4 * Math.sin(t * 1.3)), 0.9);
    const dt = f / SR;
    ph += dt * (1 + 0.002 * Math.sin(t * 5));
    if (ph >= 1) ph -= 1;
    ph2 += (dt * 1.004);
    if (ph2 >= 1) ph2 -= 1;
    const s = polyblepSaw(ph, dt) + 0.7 * polyblepSaw(ph2, dt);
    const env = Math.min(1, t / 0.35) * (i < off ? 1 : Math.exp(-(i - off) / (0.18 * SR)));
    out[i] = f2.step(f1.step(lp.step(s))) * env * v * 0.18;
  }
  return out;
}

/** Morin khuur: a bowed horsehair string — saw with rosin noise, body formants, vibrato. */
export function bowed({ m, v, d = 0.6, vib = 1, slide = 0 }, seed, cut = Infinity) {
  const f = mtof(m);
  const n = len(Math.min(cut, d + 0.2));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const b1 = new Biquad('peak', 280, 1.8, 8);
  const b2 = new Biquad('peak', 1150, 2, 6);
  const b3 = new Biquad('peak', 2600, 2.5, 3);
  const lp = new Biquad('lp', 4200, 0.7);
  const hp = new Biquad('hp', 110, 0.7);
  let ph = 0;
  let vph = seed;
  const off = len(d);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    vph += (TAU * 5.6) / SR;
    const vd = vib * 0.009 * Math.min(1, Math.max(0, (t - 0.12) / 0.25));
    const sl = slide ? slide * Math.max(0, 1 - t / 0.09) : 0;
    const dt = (f * 2 ** (-sl / 12) * (1 + vd * Math.sin(vph))) / SR;
    ph += dt;
    if (ph >= 1) ph -= 1;
    const bow = polyblepSaw(ph, dt) * (0.9 + 0.1 * noise()) + noise() * 0.06;
    const att = 1 - Math.exp(-t / 0.05);
    const env = att * (i < off ? 1 : Math.exp(-(i - off) / (0.07 * SR)));
    out[i] = hp.step(lp.step(b3.step(b2.step(b1.step(bow))))) * env * v * 0.2;
  }
  return out;
}

/** Hulusi: a gourd reed pipe — hollow odd harmonics with a drone pipe beneath. */
export function hulusi({ m, v, d = 0.5, droneM = 57 }, seed, cut = Infinity) {
  const f = mtof(m);
  const fd = mtof(droneM);
  const n = len(Math.min(cut, d + 0.15));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const reed = new Biquad('bp', Math.min(8000, f * 3), 2);
  let ph = 0;
  let pd = 0;
  let vph = seed;
  const off = len(d);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    vph += (TAU * 4.6) / SR;
    ph += (TAU * f * (1 + 0.006 * Math.sin(vph) * Math.min(1, t / 0.3))) / SR;
    pd += (TAU * fd) / SR;
    const env = (1 - Math.exp(-t / 0.03)) * (i < off ? 1 : Math.exp(-(i - off) / (0.05 * SR)));
    const tone = Math.sin(ph) + 0.33 * Math.sin(3 * ph) + 0.14 * Math.sin(5 * ph) + 0.05 * Math.sin(7 * ph);
    const dr = (Math.sin(pd) + 0.3 * Math.sin(3 * pd)) * 0.28;
    out[i] = (tone + dr + reed.step(noise()) * 0.12) * env * v * 0.24;
  }
  return out;
}

/** One hoof on turf: a soft thud and a spray of earth. */
export function hoof({ v }, seed, cut = Infinity) {
  const n = len(Math.min(cut, 0.18));
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 1400, 0.8);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (70 + 60 * Math.exp(-t / 0.012))) / SR;
    out[i] = (Math.sin(ph) * Math.exp(-t / 0.05) + bp.step(noise()) * Math.exp(-t / 0.02) * 0.45) * v * 0.7;
  }
  return out;
}

/** Big gong (大锣): inharmonic shimmer that blooms after the strike, and a long tail. */
export function gong({ v, d = 5, f = 110 }, seed, cut = Infinity) {
  const n = len(Math.min(cut, d));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const noise = whiteNoise(seed);
  const parts = [[1, 1, 3.5], [1.47, 0.6, 2.8], [2.09, 0.5, 2.2], [2.56, 0.35, 1.9], [3.14, 0.3, 1.5], [4.3, 0.22, 1.1], [5.2, 0.16, 0.9], [6.7, 0.1, 0.7]];
  for (const [r, a, dk] of parts) {
    const ff = f * r;
    const bloom = 0.08 + 0.1 * r;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const env = (1 - Math.exp(-t / bloom)) * Math.exp(-t / dk);
      // The characteristic pitch "wah": partials bend down as they bloom.
      const s = Math.sin(TAU * ff * (t + 0.004 * Math.exp(-t / 0.4) * r));
      L[i] += a * env * s;
      R[i] += a * env * Math.sin(TAU * ff * 1.0015 * t + r);
    }
  }
  const lp = new Biquad('lp', 5000, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const hit = lp.step(noise()) * Math.exp(-t / 0.03) * 0.6;
    L[i] = (L[i] * 0.3 + hit) * v * 0.5;
    R[i] = (R[i] * 0.3 + hit) * v * 0.5;
  }
  return { L, R };
}

/** Tutti: brass and strings together, a filter-swept saw stack (stereo). */
export function tutti({ m: notes, v, d = 1.2, swell = 0.02 }, seed, cut = Infinity) {
  const n = len(Math.min(cut, d + 0.9));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const off = len(d);
  notes.forEach((m, k) => {
    const f = mtof(m);
    [-9, 0, 8].forEach((c, j) => {
      const ff = f * 2 ** (c / 1200);
      const dt = ff / SR;
      let ph = (seed * 0.13 + k * 0.27 + j * 0.41) % 1;
      const pan = (j - 1) * 0.6 + (k % 2 ? 0.1 : -0.1);
      const gl = Math.cos(((pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((pan + 1) * Math.PI) / 4);
      for (let i = 0; i < n; i++) {
        ph += dt;
        if (ph >= 1) ph -= 1;
        const s = polyblepSaw(ph, dt);
        L[i] += s * gl;
        R[i] += s * gr;
      }
    });
  });
  const fl = new Biquad('lp', 800, 0.9);
  const fr = new Biquad('lp', 800, 0.9);
  const hl = new Biquad('hp', 70, 0.7);
  const hr = new Biquad('hp', 70, 0.7);
  const g = (v * 0.13) / Math.sqrt(notes.length);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 32 === 0) {
      const cf = 700 + 4200 * Math.exp(-t / 0.35) * Math.min(1, t / swell) + 900;
      fl.set('lp', cf, 0.9);
      fr.set('lp', cf, 0.9);
    }
    const env = Math.min(1, t / swell) * (i < off ? 1 - 0.25 * Math.min(1, t / 0.6) : Math.exp(-(i - off) / (0.3 * SR)));
    L[i] = hl.step(fl.step(L[i])) * env * g;
    R[i] = hr.step(fr.step(R[i])) * env * g;
  }
  return { L, R };
}

/** A crowd's cheer: many voiced shouts through vowel formants, staggered and panned. */
export function crowd({ v, voices = 56, d = 1.1 }, seed) {
  const n = len(d + 0.6);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const noise = whiteNoise(seed);
  const vowels = [[730, 1090, 2440], [660, 1720, 2410], [570, 840, 2410], [440, 1020, 2240]];
  for (let k = 0; k < voices; k++) {
    const off = Math.floor((noise() * 0.5 + 0.5) * 0.09 * SR);
    const f0 = 150 + (noise() * 0.5 + 0.5) * 190;
    const vw = vowels[k % vowels.length];
    const fs = [new Biquad('bp', vw[0], 5), new Biquad('bp', vw[1], 6), new Biquad('bp', vw[2], 7)];
    const pan = noise() * 0.9;
    const gl = Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = Math.sin(((pan + 1) * Math.PI) / 4);
    const dur = d * (0.6 + 0.4 * (noise() * 0.5 + 0.5));
    let ph = 0;
    const m = len(dur);
    for (let i = 0; i < m && off + i < n; i++) {
      const t = i / SR;
      // A shout: pitch leaps up then falls; breathy onset.
      const f = f0 * (1 + 0.35 * Math.exp(-t / 0.08) * Math.min(1, t / 0.02) - 0.18 * (t / dur));
      ph += f / SR;
      if (ph >= 1) ph -= 1;
      const src = (ph < 0.4 ? ph / 0.4 : (1 - ph) / 0.6) * 2 - 1 + noise() * 0.25;
      const env = Math.min(1, t / 0.03) * Math.max(0, 1 - t / dur) ** 0.6;
      const y = (fs[0].step(src) + fs[1].step(src) * 0.6 + fs[2].step(src) * 0.3) * env;
      L[off + i] += y * gl;
      R[off + i] += y * gr;
    }
  }
  const g = (v * 1.6) / Math.sqrt(voices);
  for (let i = 0; i < n; i++) {
    L[i] *= g;
    R[i] *= g;
  }
  return { L, R };
}

/** A camera shutter: mirror slap, curtain, a tiny spring. */
export function shutter({ v }, seed) {
  const n = len(0.16);
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 3200, 1.4);
  const bp2 = new Biquad('bp', 1800, 2.5);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let e = Math.exp(-t / 0.004);
    if (t > 0.055) e += 0.8 * Math.exp(-(t - 0.055) / 0.005);
    out[i] = (bp.step(noise()) * e + bp2.step(noise()) * e * 0.5 + Math.sin(TAU * 140 * t) * Math.exp(-t / 0.02) * 0.3) * v * 0.9;
  }
  return out;
}

/** The seal pressed into paper: a soft, dense thud with a grain of paper. */
export function stamp({ v }, seed) {
  const n = len(0.3);
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const lp = new Biquad('lp', 900, 0.7);
  const hp = new Biquad('bp', 2600, 0.8);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (95 + 60 * Math.exp(-t / 0.01))) / SR;
    out[i] = (Math.sin(ph) * Math.exp(-t / 0.06) + lp.step(noise()) * Math.exp(-t / 0.02) * 0.6 + hp.step(noise()) * Math.exp(-t / 0.008) * 0.25) * v * 0.8;
  }
  return out;
}

/** Rain: a hiss of fine drops over a field of individual ticks (stereo). */
export function rain({ t0, t1, v, fadeIn = 0.4, fadeOut = 0.3 }, seed) {
  const dur = t1 - t0;
  const n = len(dur);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const nl = whiteNoise(seed);
  const nr = whiteNoise(seed + 9);
  const hl = new Biquad('bp', 3500, 0.5);
  const hr = new Biquad('bp', 3700, 0.5);
  const dl = new Biquad('bp', 5000, 3);
  const dr = new Biquad('bp', 4600, 3);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / fadeIn) * Math.min(1, (dur - t) / fadeOut);
    const tickL = nl() > 0.994 ? 1 : 0;
    const tickR = nr() > 0.994 ? 1 : 0;
    L[i] = (hl.step(nl()) * 0.5 + dl.step(tickL * 3)) * env * v;
    R[i] = (hr.step(nr()) * 0.5 + dr.step(tickR * 3)) * env * v;
  }
  return { L, R };
}

/** Silk through air: a soft, band-limited swish with the ribbon's speed profile. */
export function silk({ t0, t1, v, from = 600, to = 2400, pan0 = -0.5, pan1 = 0.5 }, seed) {
  const dur = t1 - t0;
  const n = len(dur + 0.1);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', from, 2.2);
  const bp2 = new Biquad('bp', from * 1.5, 3);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = Math.min(1, t / dur);
    if (i % 32 === 0) {
      const f = from * (to / from) ** k;
      bp.set('bp', f, 2.2);
      bp2.set('bp', f * 1.6, 3);
    }
    const env = Math.sin(Math.PI * Math.min(1, k)) ** 1.5 * (t > dur ? Math.exp(-(t - dur) / 0.03) : 1);
    // Flutter: the cloth snapping at a few Hz.
    const fl = 0.75 + 0.25 * Math.sin(TAU * (9 + 6 * k) * t);
    const s = (bp.step(noise()) + bp2.step(noise()) * 0.5) * env * fl * v;
    const p = pan0 + (pan1 - pan0) * k;
    const a = ((p + 1) * Math.PI) / 4;
    L[i] = s * Math.cos(a);
    R[i] = s * Math.sin(a);
  }
  return { L, R };
}

export { mtof };

/** A needle tick through cloth. */
export function stitch({ v = 0.5 }, seed) {
  const n = len(0.02);
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 5200, 1.6);
  for (let i = 0; i < n; i++) out[i] = bp.step(noise()) * (1 - i / n) ** 3 * v * 1.2;
  return out;
}

/** Torch fire: a bed of crackles. */
export function crackle({ v, d = 0.5 }, seed) {
  const n = len(d);
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 2400, 1.2);
  const lp = new Biquad('lp', 600, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.02) * Math.max(0, 1 - t / d);
    const pop = noise() > 0.9985 ? 4 : 0;
    out[i] = (bp.step(pop) + lp.step(noise()) * 0.25) * env * v;
  }
  return out;
}

/** Cymbal (镲) — a short, bright splash for the festive offbeats. */
export function cha({ v }, seed) {
  const n = len(0.35);
  const out = new Float32Array(n);
  const noise = whiteNoise(seed);
  const hp = new Biquad('hp', 3800, 0.7);
  const pk = new Biquad('peak', 6200, 1.5, 5);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let ring = 0;
    for (const p of [2870, 3910, 5120, 6630]) ring += Math.sin(TAU * p * t + p);
    out[i] = (pk.step(hp.step(noise())) + ring * 0.05) * (1 - Math.exp(-t / 0.001)) * Math.exp(-t / 0.09) * v * 0.6;
  }
  return out;
}

/** A sheet of paper sliding onto another. */
export function paper({ t0, t1, v }, seed) {
  const dur = t1 - t0;
  const n = len(dur + 0.05);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const noise = whiteNoise(seed);
  const bp = new Biquad('bp', 1800, 0.6);
  const lp = new Biquad('lp', 5000, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = Math.min(1, t / dur);
    const env = Math.sin(Math.PI * k) ** 0.8 * (0.8 + 0.2 * noise());
    const s = lp.step(bp.step(noise())) * env * v * 0.6;
    L[i] = s * (1 - 0.3 * k);
    R[i] = s * (0.7 + 0.3 * k);
  }
  return { L, R };
}
