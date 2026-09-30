// Small, dependency-free DSP toolkit. Everything is offline and deterministic.

export const SR = 48000;
const TAU = Math.PI * 2;

export function whiteNoise(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s / 4294967296) * 2 - 1;
  };
}

// RBJ biquad. Direct form I, per-sample.
export class Biquad {
  constructor(type, freq, q = 0.707, gainDb = 0) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(type, freq, q, gainDb);
  }
  set(type, freq, q = 0.707, gainDb = 0) {
    const w = (TAU * Math.min(freq, SR * 0.49)) / SR;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * q);
    const A = 10 ** (gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lp':
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'hp':
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'bp':
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'peak':
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cw + s); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - s);
        a0 = A + 1 + (A - 1) * cw + s; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - s;
        break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cw + s); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - s);
        a0 = A + 1 - (A - 1) * cw + s; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - s;
        break;
      }
      default:
        throw new Error(type);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  step(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
  run(buf) {
    for (let i = 0; i < buf.length; i++) buf[i] = this.step(buf[i]);
    return buf;
  }
}

/** Band-limited sawtooth via PolyBLEP. */
export function polyblepSaw(phase, dt) {
  let v = 2 * phase - 1;
  if (phase < dt) {
    const t = phase / dt;
    v -= t + t - t * t - 1;
  } else if (phase > 1 - dt) {
    const t = (phase - 1) / dt;
    v -= t * t + t + t + 1;
  }
  return v;
}

/** Stereo bus with equal-power panning helpers. */
export class Bus {
  constructor(len) {
    this.L = new Float32Array(len);
    this.R = new Float32Array(len);
  }
  addMono(buf, start, gain = 1, pan = 0) {
    const a = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(a) * gain * Math.SQRT2;
    const gr = Math.sin(a) * gain * Math.SQRT2;
    const n = Math.min(buf.length, this.L.length - start);
    for (let i = Math.max(0, -start); i < n; i++) {
      this.L[start + i] += buf[i] * gl;
      this.R[start + i] += buf[i] * gr;
    }
  }
  addStereo(bl, br, start, gain = 1) {
    const n = Math.min(bl.length, this.L.length - start);
    for (let i = Math.max(0, -start); i < n; i++) {
      this.L[start + i] += bl[i] * gain;
      this.R[start + i] += br[i] * gain;
    }
  }
  mixInto(dst, gain = 1) {
    for (let i = 0; i < this.L.length; i++) {
      dst.L[i] += this.L[i] * gain;
      dst.R[i] += this.R[i] * gain;
    }
  }
  apply(fnL, fnR = fnL) {
    fnL(this.L);
    fnR(this.R);
  }
}

// Freeverb-style stereo reverb with a flushable state.
const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASSES = [556, 441, 341, 225];
export class Reverb {
  constructor({ room = 0.84, damp = 0.28, spread = 23, preDelay = 0.018, scale = SR / 44100 } = {}) {
    this.room = room;
    this.damp = damp;
    const mk = (n) => ({ buf: new Float32Array(Math.round(n * scale)), i: 0, store: 0 });
    this.cL = COMBS.map(mk);
    this.cR = COMBS.map((n) => mk(n + spread));
    this.aL = ALLPASSES.map(mk);
    this.aR = ALLPASSES.map((n) => mk(n + spread));
    this.pre = new Float32Array(Math.max(1, Math.round(preDelay * SR)));
    this.preR = new Float32Array(this.pre.length);
    this.pi = 0;
  }
  flush() {
    for (const c of [...this.cL, ...this.cR, ...this.aL, ...this.aR]) {
      c.buf.fill(0);
      c.store = 0;
    }
    this.pre.fill(0);
    this.preR.fill(0);
  }
  /** Process input bus into a new wet bus. `flushAt` sample indices reset the tail. */
  process(inBus, flushAt = []) {
    const n = inBus.L.length;
    const out = new Bus(n);
    const flush = new Set(flushAt);
    const fb = this.room;
    const d1 = this.damp;
    const d2 = 1 - d1;
    for (let s = 0; s < n; s++) {
      if (flush.has(s)) this.flush();
      const pL = this.pre[this.pi];
      const pR = this.preR[this.pi];
      this.pre[this.pi] = inBus.L[s];
      this.preR[this.pi] = inBus.R[s];
      this.pi = (this.pi + 1) % this.pre.length;
      const inp = (pL + pR) * 0.015;
      let oL = 0;
      let oR = 0;
      for (let k = 0; k < 8; k++) {
        let c = this.cL[k];
        let y = c.buf[c.i];
        c.store = y * d2 + c.store * d1;
        c.buf[c.i] = inp + c.store * fb;
        c.i = (c.i + 1) % c.buf.length;
        oL += y;
        c = this.cR[k];
        y = c.buf[c.i];
        c.store = y * d2 + c.store * d1;
        c.buf[c.i] = inp + c.store * fb;
        c.i = (c.i + 1) % c.buf.length;
        oR += y;
      }
      for (let k = 0; k < 4; k++) {
        let a = this.aL[k];
        let b = a.buf[a.i];
        a.buf[a.i] = oL + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        oL = b - oL;
        a = this.aR[k];
        b = a.buf[a.i];
        a.buf[a.i] = oR + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        oR = b - oR;
      }
      out.L[s] = oL;
      out.R[s] = oR;
    }
    return out;
  }
}

/** Ping-pong delay, lowpassed in the loop. */
export function pingPong(inBus, time, feedback = 0.35, lpHz = 3500, flushAt = []) {
  const n = inBus.L.length;
  const d = Math.round(time * SR);
  const out = new Bus(n);
  const bufL = new Float32Array(d);
  const bufR = new Float32Array(d);
  const lpL = new Biquad('lp', lpHz, 0.6);
  const lpR = new Biquad('lp', lpHz, 0.6);
  const flush = new Set(flushAt);
  let i = 0;
  for (let s = 0; s < n; s++) {
    if (flush.has(s)) {
      bufL.fill(0);
      bufR.fill(0);
    }
    const yL = bufL[i];
    const yR = bufR[i];
    const mono = (inBus.L[s] + inBus.R[s]) * 0.5;
    bufL[i] = lpL.step(mono + yR * feedback);
    bufR[i] = lpR.step(yL * feedback);
    i = (i + 1) % d;
    out.L[s] = yL;
    out.R[s] = yR;
  }
  return out;
}

/** Lookahead peak limiter (stereo-linked). */
export function limit(bus, ceilingDb = -1, lookahead = 0.004, release = 0.12) {
  const ceil = 10 ** (ceilingDb / 20);
  const n = bus.L.length;
  const la = Math.round(lookahead * SR);
  const peak = new Float32Array(n);
  for (let i = 0; i < n; i++) peak[i] = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
  // Sliding max over lookahead window.
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    const end = Math.min(n, i + la);
    for (let j = i; j < end; j++) if (peak[j] > m) m = peak[j];
    need[i] = m > ceil ? ceil / m : 1;
  }
  const rel = Math.exp(-1 / (release * SR));
  let g = 1;
  for (let i = 0; i < n; i++) {
    const target = need[i];
    g = target < g ? target : target + (g - target) * rel;
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
  return bus;
}

export function writeWav(path, bus, fs) {
  const n = bus.L.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 4, 40);
  // TPDF dither to 16-bit.
  const noise = whiteNoise(99);
  for (let i = 0; i < n; i++) {
    const d = (noise() + noise()) * 0.5 / 32768;
    const l = Math.max(-1, Math.min(1, bus.L[i] + d));
    const r = Math.max(-1, Math.min(1, bus.R[i] + d));
    data.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path, data);
}
