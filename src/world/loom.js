// The loom: 60 warps × 40 wefts = a 3:2 cloth, 360 × 240 world units.
// Flag geometry follows the national standard (GB 12982): on a 30 × 20 grid,
// the large star is centred at (5, 5) with circumradius 3; the small stars at
// (10, 2), (12, 4), (12, 7), (10, 9) with circumradius 1, each with one point
// aimed at the large star's centre.

import { cues, WARPS, WEFTS } from '../score.js';
import { WARP_GAP, WEFT_GAP } from './journey.js';
import { LOOM_Y, warpY } from './crowd.js';

export function buildLoom(journey) {
  const Xa = journey.Xa;
  const width = WARPS * WARP_GAP; // 360
  const height = WEFTS * WEFT_GAP; // 240
  const top = Xa + height;
  const rowX = (j) => Xa + WEFT_GAP * (j + 0.5);

  // Flag space (fx right, fy down, origin top-left, units = world) → world.
  // On screen (camera rolled −90°) world +y is right and world +x is up.
  const flagToWorld = (fx, fy) => [top - fy, LOOM_Y - width / 2 + fx];
  const worldToFlag = (wx, wy) => [wy - (LOOM_Y - width / 2), top - wx];

  // Stars in flag space.
  const g = height / 20;
  const starDefs = [
    { cx: 5 * g, cy: 5 * g, R: 3 * g },
    { cx: 10 * g, cy: 2 * g, R: g },
    { cx: 12 * g, cy: 4 * g, R: g },
    { cx: 12 * g, cy: 7 * g, R: g },
    { cx: 10 * g, cy: 9 * g, R: g },
  ];
  const big = starDefs[0];
  for (const s of starDefs) {
    // Heading of the "first point": up for the big star, toward the big star for the rest.
    s.heading = s === big ? -Math.PI / 2 : Math.atan2(big.cy - s.cy, big.cx - s.cx);
  }
  const stars = starDefs.map((s, index) => ({ ...s, index, stitches: satinStar(s), ...cues.stars[index] }));

  // Timeline: 77 running stitches, one per year, 1949 → 2026, above the cloth.
  const years = 77;
  const tl = { x: top + 40, y0: LOOM_Y - width / 2, y1: LOOM_Y + width / 2, stitches: [] };
  const pitch = (tl.y1 - tl.y0) / years;
  for (let k = 0; k < years; k++) tl.stitches.push({ a: tl.y0 + k * pitch + pitch * 0.18, b: tl.y0 + (k + 1) * pitch - pitch * 0.18 });

  return { Xa, top, width, height, rowX, warpY, flagToWorld, worldToFlag, stars, timeline: tl, weft: cues.weft, fringeTop: top + 22 };
}

/**
 * Satin-stitch a five-point star, the way a hand embroiderer faceted it:
 * each arm is split along its axis and each half filled with stitches
 * perpendicular to that axis — so the two halves catch the light differently.
 * Stitches are ordered as one clockwise sweep from the leading point.
 */
function satinStar({ cx, cy, R, heading }) {
  const r = R * 0.382;
  const out = [];
  const pitch = Math.max(1.35, R * 0.052);
  for (let k = 0; k < 5; k++) {
    const a = heading + (k * Math.PI * 2) / 5;
    const O = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    for (const side of [-1, 1]) {
      // Triangle C, O, I. Stitches perpendicular to axis C→O, from axis to edge.
      const ax = [Math.cos(a), Math.sin(a)];
      const nrm = [-ax[1] * side, ax[0] * side];
      const len = R;
      const n = Math.max(3, Math.round(len / pitch));
      for (let s = 0; s <= n; s++) {
        const d = (s / n) * len * 0.985;
        const P = [cx + ax[0] * d, cy + ax[1] * d];
        // Width of the half-arm at distance d along the axis.
        const wAt = halfWidth(d, R, r);
        if (wAt < 0.25) continue;
        const Q = [P[0] + nrm[0] * wAt, P[1] + nrm[1] * wAt];
        out.push({
          x0: P[0], y0: P[1], x1: Q[0], y1: Q[1],
          facet: side, arm: k,
          sweep: (k + (side > 0 ? 0.5 : 0) + (side > 0 ? s / n : 1 - s / n) * 0.5) / 5,
        });
      }
    }
  }
  out.sort((p, q) => p.sweep - q.sweep);
  return out;
}

/** Half-width of a star arm at distance d from centre (outer radius R, inner r). */
function halfWidth(d, R, r) {
  // The arm edge runs from the inner vertex (at angle π/5 off-axis, radius r)
  // to the tip (on-axis, radius R).
  const ix = r * Math.cos(Math.PI / 5);
  const iy = r * Math.sin(Math.PI / 5);
  if (d <= ix) return (d / ix) * iy; // inside the pentagon core: fan from centre
  const u = (d - ix) / (R - ix);
  return iy * (1 - u);
}
