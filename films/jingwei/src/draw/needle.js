// A steel sewing needle, drawn in screen space. The thread leaves from the eye.

import { rgba, SHADOW_RGB } from './palette.js';

/**
 * @param x,y  eye position (screen px)
 * @param a    heading (radians, screen)
 * @param L    length in px
 * @param o    { lift (px), alpha, gold }
 */
export function drawNeedle(ctx, x, y, a, L, o = {}) {
  if (L < 3) return;
  const lift = o.lift ?? 0;
  const alpha = o.alpha ?? 1;
  const T = Math.max(1.2, L * 0.052); // shank thickness
  const back = L * 0.16; // eye sits this far from the blunt end
  ctx.save();
  ctx.globalAlpha = alpha;
  const shape = (c) => {
    // Local frame: x along the needle from blunt end (−back) to tip (L − back).
    c.beginPath();
    c.moveTo(-back, 0);
    c.quadraticCurveTo(-back, -T / 2, -back + T * 0.9, -T / 2);
    c.lineTo(L * 0.62 - back, -T / 2);
    c.quadraticCurveTo(L * 0.86 - back, -T * 0.38, L - back, 0);
    c.quadraticCurveTo(L * 0.86 - back, T * 0.38, L * 0.62 - back, T / 2);
    c.lineTo(-back + T * 0.9, T / 2);
    c.quadraticCurveTo(-back, T / 2, -back, 0);
    c.closePath();
  };
  // Shadow on the paper.
  ctx.save();
  const k = lift / (lift + 30);
  ctx.translate(x + 0.6 + lift * 0.42, y + 1 + lift * 0.66);
  ctx.rotate(a);
  ctx.scale(1 + 0.08 * k, 1 + 0.9 * k);
  shape(ctx);
  ctx.fillStyle = rgba(SHADOW_RGB, 0.3 * (1 - 0.7 * k));
  ctx.fill();
  ctx.restore();

  ctx.translate(x, y);
  ctx.rotate(a);
  shape(ctx);
  // Polished steel: cool dark edges, a hot specular line toward the light.
  const g = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
  const lightTop = Math.cos(a) >= 0;
  const stops = lightTop
    ? ['#f5f7f8', '#c3c9cf', '#7d858e', '#3e444b']
    : ['#3e444b', '#7d858e', '#c3c9cf', '#f5f7f8'];
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.3, stops[1]);
  g.addColorStop(0.72, stops[2]);
  g.addColorStop(1, stops[3]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(0.5, T * 0.08);
  ctx.strokeStyle = 'rgba(30,34,38,0.55)';
  ctx.stroke();
  // Eye: an elongated slot you can see the paper through.
  if (T > 2.2) {
    ctx.beginPath();
    ctx.ellipse(-back + T * 1.9, 0, T * 1.05, T * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d9d0c1';
    ctx.fill();
    ctx.lineWidth = Math.max(0.4, T * 0.06);
    ctx.strokeStyle = 'rgba(30,34,38,0.6)';
    ctx.stroke();
  }
  // Specular glint along the shank.
  ctx.beginPath();
  ctx.moveTo(-back + T * 3.4, lightTop ? -T * 0.22 : T * 0.22);
  ctx.lineTo(L * 0.7 - back, lightTop ? -T * 0.16 : T * 0.16);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(0.4, T * 0.12);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}
