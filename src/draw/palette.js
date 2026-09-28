// One material world: linen paper, cinnabar thread, gold thread, steel, ink.

export const PAPER = [236, 228, 214];
export const INK = '#1d1915';
export const INK_RGB = [29, 25, 21];
export const SHADOW_RGB = [70, 38, 22];

export const RED = { rgb: [200, 38, 29], dark: [118, 17, 12], light: [246, 116, 88] };
export const WEFT = { rgb: [186, 32, 25], dark: [104, 14, 10], light: [238, 98, 74] };
export const GOLD = { rgb: [232, 176, 48], dark: [140, 92, 14], light: [255, 238, 170] };

const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
export const rgb = ([r, g, b], k = 1) => `#${hex2(r * k)}${hex2(g * k)}${hex2(b * k)}`;
export const rgba = ([r, g, b], a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

/** A thread colourway, shaded by a light factor k (1 = neutral). */
export function shade(style, k = 1) {
  const lift = (c, l) => c.map((v, i) => v + (l[i] - v) * Math.max(0, k - 1) * 1.4);
  const base = k >= 1 ? lift(style.rgb, style.light) : style.rgb.map((v) => v * k);
  return {
    base: rgb(base),
    dark: rgb(style.dark, Math.min(1.15, k)),
    light: rgb(k >= 1 ? style.light : style.light.map((v, i) => v * (0.75 + 0.25 * k))),
    rgb: base,
  };
}
