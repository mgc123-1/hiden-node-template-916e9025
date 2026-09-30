// Foley: the hiss of thread drawn across paper. Its loudness follows the
// needles' actual speed in the picture, so the sound moves with the line.

import { SR, Biquad, whiteNoise } from './dsp.js';
import { buildJourney } from '../world/journey.js';
import { buildLoom } from '../world/loom.js';
import { buildCrowd } from '../world/crowd.js';
import { makeCamera } from '../camera.js';
import { at, WIDTH } from '../core/time.js';
import { HOOK_PLUCK, SILENCE, TAUT_T0 } from '../score.js';

export function renderFoley(N) {
  const journey = buildJourney();
  const loom = buildLoom(journey);
  const crowd = buildCrowd(journey);
  const camera = makeCamera({ journey, loom, crowd });
  const lead = journey.path;
  // Control signals at 1 kHz.
  const CR = 1000;
  const n = Math.ceil((N / SR) * CR);
  const amp = new Float32Array(n);
  const pan = new Float32Array(n);
  const dt = 1 / CR;
  for (let k = 0; k < n; k++) {
    const t = k * dt;
    let v = 0;
    let x = null;
    if (t > HOOK_PLUCK + 1.0 && t < TAUT_T0 + 0.3) {
      const a = lead.headAt(t - dt);
      const b = lead.headAt(t + dt);
      v = Math.hypot(b.x - a.x, b.y - a.y) / (2 * dt);
      x = b;
    }
    let crowdV = 0;
    if (t > at(6) && t < TAUT_T0 + 0.6) {
      for (const c of crowd) {
        if (t < c.revealT) continue;
        const a = c.path.headAt(t - dt);
        const b = c.path.headAt(t + dt);
        crowdV += Math.hypot(b.x - a.x, b.y - a.y) / (2 * dt);
      }
    }
    let weft = 0;
    for (const r of loom.weft.slice(0, 10)) if (t >= r.t0 && t < r.t1) weft = (loom.width + 16) / (r.t1 - r.t0);
    const lin = Math.min(1, v / 2200) ** 0.7 + 0.35 * Math.min(1, crowdV / 60000) ** 0.6 + 0.55 * Math.min(1, weft / 2000) ** 0.7;
    amp[k] = t >= SILENCE[0] && t < SILENCE[1] ? 0 : lin;
    if (x) {
      const c = camera(t);
      const sx = (x.x - c.x) * Math.cos(c.r) * c.z - (x.y - c.y) * Math.sin(c.r) * c.z;
      pan[k] = Math.max(-0.7, Math.min(0.7, sx / (WIDTH / 2)));
    }
  }
  // Smooth (20 ms) and synthesise.
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const noise = whiteNoise(4242);
  const bp1 = new Biquad('bp', 3200, 0.8);
  const bp2 = new Biquad('bp', 7200, 1.1);
  const hp = new Biquad('hp', 1200, 0.7);
  let a = 0;
  let p = 0;
  const coef = Math.exp(-1 / (0.02 * SR));
  for (let i = 0; i < N; i++) {
    const kf = (i / SR) * CR;
    const k = Math.min(n - 1, Math.floor(kf));
    a = amp[k] + (a - amp[k]) * coef;
    p = pan[k] + (p - pan[k]) * coef;
    const w = noise();
    // Fibre grain: a slow random flutter on top of the hiss.
    const s = hp.step(bp1.step(w) * 0.8 + bp2.step(w) * 0.5) * a * (0.85 + 0.15 * Math.sin(i * 0.0021) * Math.sin(i * 0.00077));
    const ang = ((p + 1) * Math.PI) / 4;
    L[i] = s * Math.cos(ang);
    R[i] = s * Math.sin(ang);
  }
  return { L, R };
}
