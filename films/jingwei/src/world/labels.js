// All on-screen copy. Type is printed on the sheet (world-anchored, scales and
// rotates with the paper) and revealed one character per note.

import { at, S16, DURATION } from '../core/time.js';
import { DROP, DIVE, TIMELINE, END_PLUCK } from '../score.js';

export const COPY = {
  hook: '一根线',
  pulse: '是心跳',
  land: '是山河',
  home: '是归途',
  harvest: '是丰年',
  many: '千万根线',
  weave: '织成经纬',
  years: ['七十七年', '一针一线'],
  theme: '你我皆经纬',
  bless: '国庆快乐',
  wish: '愿山河锦绣 · 万家团圆',
  en: 'HAPPY NATIONAL DAY — 1949 · 2026',
};

export function buildLabels(world) {
  const { journey, loom } = world;
  const xOf = journey.xOf;
  const L = [];
  const add = (o) => L.push({ weight: 600, vertical: true, stagger: S16, rot: 0, ink: 1, ...o });

  // 一根线 — appears on the harmonic after the first pluck.
  add({ text: COPY.hook, x: 250, y: -318, size: 78, tIn: at(1, 3), tOut: 4.2, weight: 900,
    mono: { text: 'N°01  ·  Ø 0.5 MM  ·  CINNABAR', size: 13, dx: -34, dy: 4, vertical: true } });
  add({ text: COPY.pulse, x: xOf(3.36), y: 96, size: 70, tIn: at(2, 1), tOut: at(3) + 0.35,
    mono: { text: 'N°02  ·  96 BPM', size: 13, dx: -30, dy: 4, vertical: true } });
  add({ text: COPY.land, x: xOf(5.52), y: 70, size: 118, tIn: at(3, 1), tOut: at(4) + 0.4,
    mono: { text: 'N°03  ·  40°21′N 116°01′E', size: 21, dx: -50, dy: 6, vertical: true } });
  add({ text: COPY.home, x: xOf(8.35), y: -372, size: 84, tIn: at(4, 1), tOut: at(5) + 0.3,
    mono: { text: 'N°04  ·  10.01 — 10.07', size: 15, dx: -36, dy: 4, vertical: true } });
  const F = journey.field;
  add({ text: COPY.harvest, x: F.x1 + 118, y: -236, size: 76, tIn: at(5, 1), tOut: at(6) + 0.5,
    mono: { text: 'N°05  ·  47°15′N 132°37′E', size: 14, dx: -34, dy: 4, vertical: true } });

  // 千万根线 — set large and horizontal in the wide, printed between the bands.
  add({ text: COPY.many, x: 6150, y: 590, size: 250, vertical: false, tIn: at(6, 1), tOut: at(6, 3) + 0.25, weight: 900, tracking: 0.28,
    mono: { text: 'N°06  ·  × 1 400 000 000', size: 60, dx: 10, dy: 330, vertical: false, counter: true } });

  // 织成经纬 — printed to the right of the loom, upright once the camera has rolled.
  add({ text: COPY.weave, x: loom.Xa + 214, y: loom.warpY(59) + 62, size: 26, rot: Math.PI / 2, tIn: at(7, 1), tOut: DROP + 0.02, weight: 900,
    mono: { text: 'N°07  ·  60 WARP × 40 WEFT', size: 4.4, dx: -10, dy: 1, vertical: true } });

  // 七十七年 · 一针一线 — beside the flag while the timeline is stitched.
  add({ text: COPY.years[0], x: loom.Xa + 226, y: loom.warpY(59) + 66, size: 23, rot: Math.PI / 2, tIn: TIMELINE[0], tOut: DIVE[0] + 0.1, weight: 900, stagger: S16 * 2 });
  add({ text: COPY.years[1], x: loom.Xa + 226, y: loom.warpY(59) + 34, size: 23, rot: Math.PI / 2, tIn: TIMELINE[0] + 0.62, tOut: DIVE[0] + 0.1, weight: 400, stagger: S16 * 2,
    mono: { text: 'N°08  ·  77 STITCHES', size: 4.2, dx: -9, dy: 1, vertical: true } });
  const tl = loom.timeline;
  add({ text: '1949', mono: null, x: tl.x + 10, y: tl.y0, size: 7.5, rot: Math.PI / 2, vertical: false, family: 'mono', tIn: TIMELINE[0], tOut: DIVE[0] + 0.1, anchor: 'left' });
  add({ text: '2026', mono: null, x: tl.x + 10, y: tl.y1, size: 7.5, rot: Math.PI / 2, vertical: false, family: 'mono', tIn: TIMELINE[1] - 0.05, tOut: DIVE[0] + 0.1, anchor: 'right' });

  // End card — the thread becomes a rule between the theme and the wish.
  add({ text: COPY.theme, x: 450, y: -128, size: 50, vertical: false, tracking: 0.62, tIn: END_PLUCK - 0.52, tOut: DURATION + 1, weight: 600, anchor: 'center' });
  add({ text: COPY.bless, x: 450, y: 212, size: 132, vertical: false, tracking: 0.3, tIn: at(12, 0, 1), tOut: DURATION + 1, weight: 900, anchor: 'center', stagger: S16 });
  add({ text: COPY.wish, x: 450, y: 336, size: 30, vertical: false, tracking: 0.42, tIn: END_PLUCK + 0.7, tOut: DURATION + 1, weight: 400, anchor: 'center', stagger: 0.03 });
  add({ text: COPY.en, x: 450, y: 392, size: 15, vertical: false, family: 'mono', tracking: 0.32, tIn: END_PLUCK + 0.92, tOut: DURATION + 1, anchor: 'center', stagger: 0.012, scramble: true });

  return L;
}

