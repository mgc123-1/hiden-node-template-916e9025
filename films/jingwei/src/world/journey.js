// The lead thread: one continuous line from the needle-hole to the loom.
// Every bend in it is placed by the score.

import { TimedPath } from './path.js';
import { at, S16 } from '../core/time.js';
import { cues, N, TAUT_T0, TAUT_T1, WARPS } from '../score.js';
import { gauss, noise1, smoothstep } from '../core/math.js';

export const HOLE = { x: 0, y: 0 };
export const ANCHOR = { x: 900, y: 0 };
export const DEPART = at(2) - 0.16;
export const LEAD_WARP = 33;
export const WARP_GAP = 6;
export const WEFT_GAP = 6;

// Heart: P, Q, R, S, T around each kick (seconds relative to the R-peak).
function ecg(tau) {
  let y = 0;
  for (const t of cues.heartbeats) {
    const d = tau - t;
    if (d < -0.3 || d > 0.4) continue;
    y += -16 * gauss(d + 0.165, 0.03) + 16 * gauss(d + 0.028, 0.009) - 228 * gauss(d, 0.0105) + 58 * gauss(d - 0.026, 0.011) - 40 * gauss(d - 0.2, 0.05);
  }
  return y;
}

// Summit height from pitch: the melody draws the mountains.
const summit = (m) => -(320 + (m - N('D5')) * 60);

function buildSpeed() {
  // Needle speed (world units / s) through bars 2–4.
  const knots = [
    [DEPART, 0],
    [DEPART + 0.22, 760],
    [4.95, 760],
    [5.05, 1100],
    [6.17, 1100],
    [6.27, 610],
    [7.17, 610],
    [7.3, 1000],
    [12, 1000],
  ];
  const v = (t) => {
    if (t <= knots[0][0]) return 0;
    for (let k = 1; k < knots.length; k++) {
      const [t1, v1] = knots[k];
      if (t <= t1) {
        const [t0, v0] = knots[k - 1];
        return v0 + (v1 - v0) * smoothstep(t0, t1, t);
      }
    }
    return knots[knots.length - 1][1];
  };
  const dt = 1 / 4000;
  const t0 = DEPART;
  const table = [0];
  for (let t = t0; t < 10.5; t += dt) table.push(table[table.length - 1] + v(t) * dt);
  return (t) => {
    const f = (t - t0) / dt;
    if (f <= 0) return ANCHOR.x;
    const i = Math.min(table.length - 2, Math.floor(f));
    return ANCHOR.x + table[i] + (table[i + 1] - table[i]) * (f - i);
  };
}

export function buildJourney() {
  const p = new TimedPath();
  const xOf = buildSpeed();
  const jitter = noise1(31);

  // Bar 1: hole → anchor, laid during the needle's flight (rendered in the air
  // by the hook until it settles).
  p.push(HOLE.x, HOLE.y, at(1, 1));
  p.lineTo(ANCHOR.x, ANCHOR.y, at(1, 2), 8);
  p.push(ANCHOR.x + 0.001, ANCHOR.y, DEPART);

  // Mountain keys: [time, height].
  const pk = cues.peaks;
  const keys = [[4.86, 0]];
  for (let k = 0; k < 4; k++) {
    keys.push([pk[k].t, summit(pk[k].m)]);
    const nextT = pk[k + 1].t;
    keys.push([(pk[k].t + nextT) / 2 + 0.01, summit(pk[k].m) * 0.42 + (k === 3 ? -150 : 0)]);
  }
  const ridge = summit(pk[4].m);
  const WALL0 = cues.crenels[0];
  const WALL1 = cues.crenels[cues.crenels.length - 1];
  // The Great Wall rides the ridge.
  const wallBase = (tau) => ridge + 26 * Math.sin((tau - WALL0) * 5.2) + (tau - WALL0) * 60;
  keys.push([WALL0, ridge]);
  keys.push([WALL1, wallBase(WALL1)]);
  keys.push([WALL1 + 0.12, ridge * 0.5]);
  keys.push([WALL1 + 0.22, -90]);
  keys.push([at(4) - 0.02, 0]);
  const mountain = (tau) => {
    for (let k = 1; k < keys.length; k++) {
      if (tau <= keys[k][0]) {
        const [t0, h0] = keys[k - 1];
        const [t1, h1] = keys[k];
        const u = (tau - t0) / (t1 - t0);
        let h = h0 + (h1 - h0) * (h1 < h0 ? u ** 1.15 : 1 - (1 - u) ** 1.15);
        if (tau > WALL0 && tau < WALL1) {
          // Merlons on the sixteenths, a watchtower on beat 4.
          h = wallBase(tau);
          const idx = Math.floor((tau - WALL0) / S16);
          const ph = (tau - WALL0) / S16 - idx;
          if (idx === 4) h -= ph < 0.85 ? 74 : 0;
          else if (ph < 0.5) h -= 30;
        } else h += jitter(tau * 40) * 9 * Math.min(1, -h / 200);
        return h;
      }
    }
    return 0;
  };

  // Bars 2–3: heartbeat, then the heartbeat grows into mountains.
  p.fn(DEPART, at(4), (tau) => [xOf(tau), tau < 4.86 ? ecg(tau) : mountain(tau)], 1 / 600);

  // Bar 4: the railway (map symbol: a line crossed by ties) — one tie per hi-hat.
  for (const tk of cues.ties) {
    const x = xOf(tk);
    p.lineTo(x, 0, tk, 10);
    p.polyTo([[x, -24], [x, 24], [x, 0]], tk + 0.05, 4);
  }
  const houseT = at(4, 3);
  const hx = xOf(houseT);
  p.lineTo(hx, 0, houseT, 10);
  // Beat 4: a house with upturned eaves, and a door.
  const H = { x: hx, w: 210, wall: 118, ridge: 222 };
  {
    const t0 = houseT;
    const t1 = at(5) - 0.05;
    const q = new TimedPath();
    q.push(hx, 0, 0);
    q.lineTo(hx, -H.wall, 1, 4);
    q.lineTo(hx - 36, -H.wall - 10, 2, 4);
    q.quadTo(hx + 44, -H.wall - 26, hx + H.w / 2, -H.ridge, 3, 18);
    q.quadTo(hx + H.w - 44, -H.wall - 26, hx + H.w + 36, -H.wall - 10, 4, 18);
    q.lineTo(hx + H.w, -H.wall, 5, 4);
    q.lineTo(hx + H.w, 0, 6, 4);
    q.lineTo(hx + 132, 0, 7, 4);
    q.lineTo(hx + 132, -66, 8, 4);
    q.lineTo(hx + 172, -66, 9, 4);
    q.lineTo(hx + 172, 0, 10, 4);
    q.lineTo(hx + H.w + 20, 0, 11, 4);
    const S = q.s[q.s.length - 1];
    for (let i = 1; i < q.x.length; i++) p.push(q.x[i], q.y[i], t0 + ((t1 - t0) * q.s[i]) / S);
  }

  // Bar 5: the field — boustrophedon, one furrow per sixteenth.
  const F = { x0: hx + H.w + 110, rows: cues.furrows.length, gap: 58, half: 240 };
  const rowX = (k, y) => F.x0 + 30 + k * F.gap + 13 * Math.sin(y / 140 + k * 0.55);
  p.quadTo(rowX(0, F.half) - 30, F.half * 0.2, rowX(0, F.half), F.half, at(5) - 0.002, 16);
  cues.furrows.forEach((fr, k) => {
    const up = k % 2 === 0;
    const ya = up ? F.half : -F.half;
    const yb = -ya;
    const tRow = fr.t0 + (fr.t1 - fr.t0) * 0.82;
    const pts = [];
    for (let j = 1; j <= 30; j++) {
      const y = ya + ((yb - ya) * j) / 30;
      pts.push([rowX(k, y), y]);
    }
    p.polyTo(pts, tRow, 1e9);
    if (k < F.rows - 1) {
      // U-turn at the headland.
      const cx = (rowX(k, yb) + rowX(k + 1, yb)) / 2;
      const r = F.gap / 2;
      const arc = [];
      for (let j = 1; j <= 10; j++) {
        const a = Math.PI - (Math.PI * j) / 10;
        arc.push([cx + r * Math.cos(a), yb + (up ? -1 : 1) * r * Math.sin(a) * 0.9]);
      }
      p.polyTo(arc, fr.t1, 1e9);
    }
  });
  F.x1 = rowX(F.rows - 1, 0) + 30;

  // Bar 6: out of the field, onto the common road — where the others join.
  const exitX = p.last.x;
  const Xa = exitX + 2250;
  p.quadTo(exitX + 180, F.half + 20, exitX + 420, 60, at(6) + 0.36, 20);
  p.quadTo(exitX + 700, 0, exitX + 1000, 0, at(6) + 0.8, 16);
  p.lineTo(Xa, 0, TAUT_T0, 12);
  // Pulled taut up the loom.
  const tTaut = TAUT_T0 + ((TAUT_T1 - TAUT_T0) * LEAD_WARP) / (WARPS - 1);
  p.lineTo(Xa + WEFT_GAP * 40 + 22, 0, tTaut, 6);
  p.freeze();

  return { path: p, xOf, house: H, field: F, Xa, keys, ridge, wall: [WALL0, WALL1] };
}
