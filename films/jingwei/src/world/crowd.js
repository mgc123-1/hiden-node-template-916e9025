// Everyone else. 59 life-lines running alongside the lead thread, just out
// of frame, each with its own small story drawn in the same line-language.
// In bar 6 the camera pulls back to find them; each one is revealed on a
// pluck of the cascade, then they funnel into the loom as warps.

import { TimedPath } from './path.js';
import { rng, smootherstep } from '../core/math.js';
import { cues, WARPS, TAUT_T0 } from '../score.js';
import { LEAD_WARP, WARP_GAP } from './journey.js';

export const LOOM_Y = -((LEAD_WARP - (WARPS - 1) / 2) * WARP_GAP); // lead warp lands on y = 0
export const warpY = (i) => LOOM_Y + (i - (WARPS - 1) / 2) * WARP_GAP;

// Motifs, in the same pictographic language as the lead thread.
function motif(kind, r, x0, len, amp) {
  const pts = [];
  const step = 8;
  switch (kind) {
    case 'pulse': {
      const every = r.range(150, 220);
      for (let x = 0; x <= len; x += 3) {
        const ph = x % every;
        let y = 0;
        if (ph > every - 26) {
          const u = (ph - (every - 26)) / 26;
          y = u < 0.35 ? (-amp * u) / 0.35 : u < 0.7 ? -amp + (amp * 1.35 * (u - 0.35)) / 0.35 : amp * 0.35 * (1 - (u - 0.7) / 0.3);
        }
        pts.push([x0 + x, y]);
      }
      break;
    }
    case 'peaks': {
      let x = 0;
      pts.push([x0, 0]);
      while (x < len - 60) {
        const w = r.range(50, 110);
        const h = amp * r.range(0.5, 1.2);
        pts.push([x0 + x + w / 2, -h], [x0 + x + w, -h * r.range(0.1, 0.5)]);
        x += w;
      }
      pts.push([x0 + len, 0]);
      break;
    }
    case 'ties': {
      const gap = r.range(28, 44);
      for (let x = 0; x < len; x += gap) {
        pts.push([x0 + x, 0], [x0 + x, -amp * 0.22], [x0 + x, amp * 0.22], [x0 + x, 0]);
      }
      pts.push([x0 + len, 0]);
      break;
    }
    case 'field': {
      const rows = Math.max(4, Math.floor(len / 26));
      const gap = len / rows;
      const h = amp * 0.8;
      for (let k = 0; k < rows; k++) {
        const x = x0 + k * gap + gap / 2;
        const up = k % 2 === 0;
        pts.push([x, up ? h : -h], [x, up ? -h : h]);
      }
      pts.push([x0 + len, 0]);
      break;
    }
    case 'house': {
      const w = amp * 0.9;
      const hw = w * 0.55;
      const pad = (len - w) / 2;
      const hx = x0 + pad;
      pts.push([hx, 0], [hx, -hw], [hx - w * 0.14, -hw - w * 0.05], [hx + w / 2, -hw - w * 0.48], [hx + w * 1.14, -hw - w * 0.05], [hx + w, -hw], [hx + w, 0], [x0 + len, 0]);
      break;
    }
    case 'loop': {
      const R = amp * 0.45;
      const cx = x0 + len / 2;
      pts.push([cx - R * 1.2, 0]);
      for (let k = 0; k <= 28; k++) {
        const a = Math.PI / 2 + (k / 28) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * R * 1.1 + (k / 28) * R * 0.3, -R + Math.sin(a) * R]);
      }
      pts.push([x0 + len, 0]);
      break;
    }
    case 'river':
    default: {
      const wl = r.range(160, 260);
      const ph = r() * 6;
      for (let x = 0; x <= len; x += step) pts.push([x0 + x, Math.sin(x / wl * Math.PI * 2 + ph) * amp * 0.35]);
    }
  }
  return pts;
}

const KINDS = ['pulse', 'peaks', 'ties', 'field', 'house', 'river', 'loop', 'river', 'pulse', 'peaks', 'river', 'house', 'peaks', 'loop'];

export function buildCrowd(journey) {
  const lead = journey.path;
  const Xa = journey.Xa;
  const r = rng(1949);
  const funnel0 = Xa - 1850;
  const lines = [];
  // Front speed matched to the lead thread through the funnel.
  const leadAt12 = lead.headAt(12.5).x;
  const speed = (Xa - leadAt12) / (TAUT_T0 - 12.5);
  const reveal = [...cues.cascade];
  const others = [];
  for (let i = 0; i < WARPS; i++) if (i !== LEAD_WARP) others.push(i);
  // Reveal order: outward from the lead thread, alternating above/below —
  // the pull-back discovers neighbours first.
  const order = [...others].sort((a, b) => Math.abs(a - LEAD_WARP) - Math.abs(b - LEAD_WARP) || a - b);
  for (const i of others) {
    const above = i < LEAD_WARP;
    const rank = above ? (LEAD_WARP - 1 - i) / (LEAD_WARP - 1) : (i - LEAD_WARP - 1) / (WARPS - LEAD_WARP - 2);
    const yb = above ? -1300 - rank * 980 + r.range(-18, 18) : 930 + rank * 880 + r.range(-18, 18);
    const x0 = r.range(3400, 6900);
    const jitterT = r.range(-0.05, 0.05);
    // History: motifs laid end-to-end along the baseline.
    const pts = [[x0, yb]];
    let x = x0 + r.range(40, 120);
    pts.push([x, yb]);
    while (x < funnel0 - 200) {
      const kind = r.pick(KINDS);
      const len = Math.min(funnel0 - 200 - x, r.range(180, 520));
      const amp = r.range(40, 95);
      for (const [mx, my] of motif(kind, r, x, len, amp)) pts.push([mx, yb + my]);
      x += len;
      const gap = r.range(30, 160);
      pts.push([x + gap, yb]);
      x += gap;
    }
    // Funnel into the warp slot.
    const yi = warpY(i);
    for (let fx = x + 20; fx <= Xa; fx += 16) {
      const u = smootherstep(funnel0 - 100, Xa - 120, fx);
      pts.push([fx, yb + (yi - yb) * u]);
    }
    // Time: the front marches at the lead thread's pace, arriving at the loom
    // together; the warp is then pulled taut on its note of the glissando.
    const p = new TimedPath();
    const tOfX = (px) => TAUT_T0 + jitterT - (Xa - px) / speed;
    let lastT = -Infinity;
    for (const [px, py] of pts) {
      const t = Math.max(lastT + 1e-5, tOfX(px));
      p.push(px, py, t);
      lastT = t;
    }
    p.lineTo(Xa + WARP_GAP * 40 + 22, yi, cues.warpTaut[i], 6);
    p.freeze();
    const k = order.indexOf(i);
    const note = reveal[Math.min(reveal.length - 1, Math.floor((k / order.length) * reveal.length))];
    lines.push({ i, path: p, y: yi, yb, x0, revealT: note.t + (k % 2) * 0.02, above, width: r.range(0.82, 1.1), seed: i * 17 + 3 });
  }
  return lines;
}
