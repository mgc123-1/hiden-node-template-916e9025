// 同心结 — shared timing grid and small maths helpers.
// Picture and sound read every cue from the same grid.

export const BPM = 128;
export const BEAT = 60 / BPM; // 0.46875 s
export const BAR = BEAT * 4; // 1.875 s — 16 bars = 30 s
export const S16 = BEAT / 4;
export const S8 = BEAT / 2;
export const DURATION = 30;
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Seconds at (bar 1-based, beat 0-based, sixteenth 0-based). */
export const at = (bar, beat = 0, six = 0) => (bar - 1) * BAR + beat * BEAT + six * S16;

// The storyboard's six shots, fitted to the bar grid (5/4/4/4/8/5 s → 3/2/2/2/4/3 bars).
export const SHOT = {
  uyghur: [at(1), at(4)], //    01 吐鲁番 · 维吾尔族
  tibet: [at(4), at(6)], //     02 圣湖 · 藏族
  mongol: [at(6), at(8)], //    03 呼伦贝尔 · 蒙古族
  south: [at(8), at(10)], //    04 苗族 · 傣族 · 大熊猫
  montage: [at(10), at(14)], // 05 五十六个民族
  beijing: [at(14), DURATION], // 06 天安门 · 同心结
};

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inQuart: (t) => t ** 4,
  outQuart: (t) => 1 - (1 - t) ** 4,
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  outQuint: (t) => 1 - (1 - t) ** 5,
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};
export const prog = (t, a, b, fn = ease.linear) => fn(clamp((t - a) / (b - a)));
export const springKick = (dt, freq = 6, damp = 5) => (dt <= 0 ? 0 : Math.exp(-damp * dt) * Math.sin(TAU * freq * dt));

export function rng(seed = 1) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

export function noise1(seed = 0) {
  const r = rng(seed * 7919 + 13);
  const table = new Float32Array(512);
  for (let i = 0; i < 512; i++) table[i] = r() * 2 - 1;
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(table[i & 511], table[(i + 1) & 511], u);
  };
}

/** Piecewise keyframes [[t, value], ...] with per-segment easing (default inOutCubic). */
export function keys(list, fn = ease.inOutCubic) {
  return (t) => {
    if (t <= list[0][0]) return list[0][1];
    for (let i = 1; i < list.length; i++) {
      if (t <= list[i][0]) {
        const [t0, v0] = list[i - 1];
        const [t1, v1, f] = list[i];
        const u = (f || fn)((t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((x, k) => lerp(x, v1[k], u)) : lerp(v0, v1, u);
      }
    }
    return list[list.length - 1][1];
  };
}

/** Catmull-Rom through points [[x,y,z],...] at parameter u ∈ [0,1] (uniform). */
export function catmull(pts, u) {
  const n = pts.length - 1;
  const f = clamp(u) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n, i + 2)];
  const t2 = t * t;
  const t3 = t2 * t;
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
