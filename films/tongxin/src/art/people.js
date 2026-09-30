// People, cut from card. One parametric body; costume, headwear, hair and
// jewellery come from per-people presets. Frontal, pinned at shoulders,
// elbows, wrists, neck, hips and knees.

import { buildPuppet } from '../engine/puppet.js';
import { poly, smooth, ellipse, fill, stroke, clipTo, ikat, stripesH, band, flowers } from './draw.js';
import { rng } from '../core.js';

const SKIN = '#f0c6a0';
const HAIR = '#1b1311';

// ─── Parts ──────────────────────────────────────────────────────────────────

function drawHead(ctx, s) {
  const skin = s.skin ?? SKIN;
  const hair = s.hairColor ?? HAIR;
  const style = s.hair ?? 'long';
  // Hair mass behind the face.
  fill(ctx, hair, (c) => {
    if (style === 'short') smooth(c, [[-0.1, 0.12], [-0.095, 0.24], [0, 0.285], [0.095, 0.24], [0.1, 0.12], [0.085, 0.07], [-0.085, 0.07]]);
    else smooth(c, [[-0.105, 0.0], [-0.112, 0.2], [-0.06, 0.28], [0, 0.29], [0.06, 0.28], [0.112, 0.2], [0.105, 0.0], [0.07, -0.04], [-0.07, -0.04]]);
  });
  // Ears.
  for (const sx of [-1, 1]) fill(ctx, skin, (c) => ellipse(c, sx * 0.084, 0.125, 0.016, 0.026));
  // Face: an egg, a little pointed at the chin.
  fill(ctx, skin, (c) => smooth(c, [[0, 0.245], [0.07, 0.225], [0.086, 0.15], [0.078, 0.07], [0.045, 0.02], [0, 0.005], [-0.045, 0.02], [-0.078, 0.07], [-0.086, 0.15], [-0.07, 0.225]]));
  // Soft shade under the hairline and jaw (printed, not rendered).
  ctx.save();
  clipTo(ctx, (c) => smooth(c, [[0, 0.245], [0.07, 0.225], [0.086, 0.15], [0.078, 0.07], [0.045, 0.02], [0, 0.005], [-0.045, 0.02], [-0.078, 0.07], [-0.086, 0.15], [-0.07, 0.225]]), () => {
    const g = ctx.createLinearGradient(0, 0.0, 0, 0.1);
    g.addColorStop(0, 'rgba(150,80,50,0.18)');
    g.addColorStop(1, 'rgba(150,80,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-0.1, -0.01, 0.2, 0.12);
  });
  ctx.restore();
  // Blush.
  for (const sx of [-1, 1]) {
    const g = ctx.createRadialGradient(sx * 0.047, 0.088, 0, sx * 0.047, 0.088, 0.03);
    g.addColorStop(0, s.blush ?? 'rgba(226,110,96,0.55)');
    g.addColorStop(1, 'rgba(226,110,96,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx * 0.047 - 0.03, 0.058, 0.06, 0.06);
  }
  // Hairline / fringe: centre parting framing the face.
  if (style !== 'short') fill(ctx, hair, (c) => smooth(c, [[-0.09, 0.15], [-0.075, 0.235], [-0.02, 0.262], [0, 0.245], [0.02, 0.262], [0.075, 0.235], [0.09, 0.15], [0.08, 0.2], [0.03, 0.235], [0, 0.222], [-0.03, 0.235], [-0.08, 0.2]]));
  else fill(ctx, hair, (c) => smooth(c, [[-0.09, 0.17], [-0.06, 0.25], [0.03, 0.262], [0.09, 0.2], [0.085, 0.185], [0.02, 0.228], [-0.05, 0.22]]));
  // Brows (Uyghur usma: nearly joined).
  const browY = 0.163;
  for (const sx of [-1, 1]) {
    stroke(ctx, hair, 0.0065, (c) => {
      c.moveTo(sx * 0.012, browY - 0.001);
      c.quadraticCurveTo(sx * 0.035, browY + 0.012, sx * 0.061, browY - 0.004);
    });
  }
  if (s.usma) stroke(ctx, hair, 0.004, (c) => {
    c.moveTo(-0.013, browY - 0.001);
    c.quadraticCurveTo(0, browY + 0.003, 0.013, browY - 0.001);
  });
  // Eyes.
  const eyeY = 0.134;
  const look = s.look ?? 0.25; // glance sideways
  for (const sx of [-1, 1]) {
    const ex = sx * 0.036;
    if (s.eyes === 'closed') {
      stroke(ctx, '#1b1311', 0.0055, (c) => {
        c.moveTo(ex - 0.018, eyeY + 0.002);
        c.quadraticCurveTo(ex, eyeY - 0.012, ex + 0.018, eyeY + 0.002);
      });
      continue;
    }
    // Sclera almond.
    const almond = (c) => {
      c.moveTo(ex - 0.021, eyeY);
      c.quadraticCurveTo(ex - 0.004, eyeY + 0.017, ex + 0.021, eyeY + 0.002);
      c.quadraticCurveTo(ex + 0.002, eyeY - 0.012, ex - 0.021, eyeY);
      c.closePath();
    };
    fill(ctx, '#fbf6ee', almond);
    clipTo(ctx, almond, () => {
      fill(ctx, '#3a2218', (c) => ellipse(c, ex + look * 0.008, eyeY + 0.001, 0.0105, 0.0115));
      fill(ctx, '#0d0806', (c) => ellipse(c, ex + look * 0.008, eyeY + 0.001, 0.005, 0.0055));
      fill(ctx, 'rgba(255,255,255,0.9)', (c) => ellipse(c, ex + look * 0.008 + 0.004, eyeY + 0.005, 0.0026, 0.0026));
    });
    // Upper lash line, lifting at the outer corner.
    stroke(ctx, '#140c09', 0.0048, (c) => {
      c.moveTo(ex - sx * 0.021, eyeY);
      c.quadraticCurveTo(ex - sx * 0.004, eyeY + 0.018, ex + sx * 0.024, eyeY + 0.006);
    });
  }
  // Nose: a small shadow.
  stroke(ctx, 'rgba(160,90,62,0.55)', 0.0035, (c) => {
    c.moveTo(-0.006, 0.083);
    c.quadraticCurveTo(0, 0.078, 0.007, 0.083);
  });
  // Mouth: a small smile.
  fill(ctx, s.lips ?? '#c8423a', (c) => {
    c.moveTo(-0.02, 0.052);
    c.quadraticCurveTo(0, 0.043 - (s.smile ?? 0.006), 0.02, 0.052);
    c.quadraticCurveTo(0.008, 0.058, 0, 0.055);
    c.quadraticCurveTo(-0.008, 0.058, -0.02, 0.052);
  });
  // Earrings.
  if (s.earrings) for (const sx of [-1, 1]) {
    fill(ctx, s.earrings, (c) => ellipse(c, sx * 0.088, 0.09, 0.008, 0.008));
    fill(ctx, s.earrings, (c) => ellipse(c, sx * 0.088, 0.066, 0.006, 0.013));
  }
}

function drawBackHair(ctx, s) {
  const hair = s.hairColor ?? HAIR;
  if (s.hair === 'braids') {
    // Many thin braids (Uyghur girls wear dozens).
    const n = s.braids ?? 9;
    for (let i = 0; i < n; i++) {
      const x = -0.1 + (0.2 * i) / (n - 1);
      const len = 0.5 + 0.08 * Math.sin(i * 1.7);
      ctx.fillStyle = hair;
      for (let y = 0.06; y > -len; y -= 0.022) {
        ctx.beginPath();
        ellipse(ctx, x + Math.sin(y * 30 + i) * 0.003, y, 0.0105, 0.014);
        ctx.fill();
      }
      fill(ctx, s.braidTie ?? '#c7213b', (c) => ellipse(c, x, -len - 0.006, 0.008, 0.01));
    }
  } else if (s.hair === 'bun') {
    fill(ctx, hair, (c) => ellipse(c, 0, 0.3, 0.07, 0.055));
  } else if (s.hair === 'long') {
    fill(ctx, hair, (c) => smooth(c, [[-0.11, 0.18], [-0.13, -0.1], [-0.1, -0.32], [0, -0.36], [0.1, -0.32], [0.13, -0.1], [0.11, 0.18]]));
  }
}

function drawHat(ctx, s) {
  const h = s.hat;
  if (!h) return;
  if (h.kind === 'doppa') {
    // Four-cornered cap, embroidered.
    const shape = (c) => poly(c, [[-0.088, 0.0], [-0.078, 0.085], [0.078, 0.085], [0.088, 0.0]]);
    fill(ctx, h.base ?? '#1a4d2e', shape);
    clipTo(ctx, shape, () => {
      if (h.chust) {
        // Black with white almond (badam) motifs.
        for (const x of [-0.045, 0, 0.045]) {
          fill(ctx, '#f2ece0', (c) => {
            c.moveTo(x - 0.012, 0.012);
            c.bezierCurveTo(x - 0.03, 0.06, x + 0.01, 0.085, x + 0.012, 0.05);
            c.bezierCurveTo(x + 0.016, 0.03, x, 0.02, x - 0.012, 0.012);
          });
        }
      } else {
        flowers(ctx, -0.09, 0.0, 0.09, 0.09, h.flowers ?? ['#d7263d', '#f4a261', '#ffffff', '#e9c46a'], 0.018, 5, 1.2);
      }
      band(ctx, -0.1, 0.1, 0.006, 0.012, h.trim ?? '#c9a227', '#7a1020', 'dots');
    });
  } else if (h.kind === 'mongol') {
    fill(ctx, h.base ?? '#1f4e8c', (c) => smooth(c, [[-0.1, 0.0], [-0.085, 0.08], [0, 0.14], [0.085, 0.08], [0.1, 0.0]], true, 0.4));
    fill(ctx, h.brim ?? '#c9a227', (c) => poly(c, [[-0.11, 0.0], [-0.1, 0.03], [0.1, 0.03], [0.11, 0.0]]));
    fill(ctx, '#c1121f', (c) => ellipse(c, 0, 0.145, 0.018, 0.018));
  } else if (h.kind === 'tibet') {
    // Turquoise and coral ornaments across the crown.
    fill(ctx, h.base ?? '#7a1f2b', (c) => smooth(c, [[-0.1, 0.0], [-0.09, 0.05], [0, 0.07], [0.09, 0.05], [0.1, 0.0]], true, 0.4));
    for (let i = -2; i <= 2; i++) {
      fill(ctx, i % 2 ? '#d1495b' : '#2ec4b6', (c) => ellipse(c, i * 0.036, 0.03, 0.016, 0.016));
      fill(ctx, '#d4a24c', (c) => ellipse(c, i * 0.036, 0.03, 0.006, 0.006));
    }
  } else if (h.kind === 'miao') {
    // 银角: the great silver horns of Leishan Miao, with a comb of silver flowers.
    const silver = '#e7eaee';
    fill(ctx, silver, (c) => {
      c.moveTo(-0.03, 0.02);
      c.bezierCurveTo(-0.12, 0.06, -0.3, 0.12, -0.33, 0.33);
      c.bezierCurveTo(-0.27, 0.2, -0.13, 0.15, -0.02, 0.06);
      c.closePath();
      c.moveTo(0.03, 0.02);
      c.bezierCurveTo(0.12, 0.06, 0.3, 0.12, 0.33, 0.33);
      c.bezierCurveTo(0.27, 0.2, 0.13, 0.15, 0.02, 0.06);
      c.closePath();
    });
    stroke(ctx, '#a9b0b8', 0.004, (c) => {
      for (let k = 0; k < 6; k++) {
        c.moveTo(-0.05 - k * 0.04, 0.05 + k * 0.03);
        c.lineTo(-0.06 - k * 0.04, 0.09 + k * 0.035);
        c.moveTo(0.05 + k * 0.04, 0.05 + k * 0.03);
        c.lineTo(0.06 + k * 0.04, 0.09 + k * 0.035);
      }
    });
    // Silver flower crown band with dangles.
    fill(ctx, silver, (c) => smooth(c, [[-0.11, -0.01], [-0.1, 0.06], [0, 0.085], [0.1, 0.06], [0.11, -0.01], [0, 0.02]], true, 0.4));
    for (let i = -4; i <= 4; i++) {
      fill(ctx, '#ffffff', (c) => ellipse(c, i * 0.022, 0.04 + 0.02 * Math.cos(i * 0.4), 0.009, 0.009));
      stroke(ctx, '#c8ced6', 0.003, (c) => {
        c.moveTo(i * 0.024, -0.005);
        c.lineTo(i * 0.024, -0.04 - (i % 2 ? 0.01 : 0));
      });
      fill(ctx, '#e7eaee', (c) => ellipse(c, i * 0.024, -0.045 - (i % 2 ? 0.01 : 0), 0.005, 0.007));
    }
  } else if (h.kind === 'dai') {
    // High bun with a comb and a flower.
    fill(ctx, HAIR, (c) => ellipse(c, 0.02, 0.05, 0.065, 0.05));
    fill(ctx, '#d4a24c', (c) => poly(c, [[-0.05, 0.08], [0.06, 0.1], [0.06, 0.11], [-0.05, 0.09]]));
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      fill(ctx, '#f7a1b5', (c) => ellipse(c, -0.05 + Math.cos(a) * 0.016, 0.04 + Math.sin(a) * 0.016, 0.013, 0.009, a));
    }
    fill(ctx, '#f4d35e', (c) => ellipse(c, -0.05, 0.04, 0.008, 0.008));
  } else if (h.kind === 'scarf') {
    fill(ctx, h.base ?? '#264653', (c) => smooth(c, [[-0.11, -0.02], [-0.1, 0.07], [0, 0.1], [0.1, 0.07], [0.11, -0.02], [0, 0.03]], true, 0.4));
    band(ctx, -0.12, 0.12, 0.01, 0.016, h.trim ?? '#e76f51', '#f4d35e', 'diamond');
  } else if (h.kind === 'cap') {
    fill(ctx, h.base ?? '#ffffff', (c) => smooth(c, [[-0.09, 0.0], [-0.085, 0.05], [0, 0.07], [0.085, 0.05], [0.09, 0.0]], true, 0.4));
  } else if (h.kind === 'yi') {
    // Yi hero knot / wide black hat.
    fill(ctx, '#15110f', (c) => smooth(c, [[-0.2, 0.0], [-0.12, 0.05], [0, 0.07], [0.12, 0.05], [0.2, 0.0], [0, 0.02]], true, 0.4));
    band(ctx, -0.18, 0.18, 0.02, 0.012, '#15110f', '#e9c46a', 'dots');
  } else if (h.kind === 'korean') {
    // Hair drawn smoothly back; a red daenggi bow and a gold pin at the side.
    fill(ctx, HAIR, (c) => smooth(c, [[-0.1, -0.02], [-0.095, 0.05], [0, 0.075], [0.095, 0.05], [0.1, -0.02], [0, 0.03]], true, 0.4));
    fill(ctx, '#c1121f', (c) => { poly(c, [[0.1, 0.0], [0.16, 0.04], [0.16, -0.03]]); poly(c, [[0.1, 0.0], [0.13, -0.08], [0.1, -0.1]]); });
    stroke(ctx, '#e9c46a', 0.007, (c) => { c.moveTo(-0.13, 0.03); c.lineTo(0.02, 0.05); });
  } else if (h.kind === 'zhuang') {
    // Folded indigo head-cloth with a woven-brocade front edge and a side tassel.
    const shape = (c) => smooth(c, [[-0.115, -0.015], [-0.125, 0.07], [-0.06, 0.1], [0.07, 0.1], [0.13, 0.075], [0.118, -0.015]], true, 0.3);
    fill(ctx, h.base ?? '#1d2b53', shape);
    clipTo(ctx, shape, () => {
      band(ctx, -0.14, 0.14, 0.012, 0.03, '#c1121f', '#f4d35e', 'diamond', '#2a9d8f');
      band(ctx, -0.14, 0.14, 0.04, 0.012, '#f4d35e', '#1d2b53', 'dots');
    });
    stroke(ctx, '#c1121f', 0.008, (c) => { c.moveTo(0.12, 0.05); c.lineTo(0.16, -0.12); });
    for (const k of [0, 1, 2]) fill(ctx, ['#c1121f', '#f4d35e', '#2a9d8f'][k], (c) => ellipse(c, 0.155 + k * 0.012, -0.13 - k * 0.012, 0.012, 0.018));
  } else if (h.kind === 'hani') {
    // Indigo cap studded with silver, bead fringe over the brow, wool pompoms.
    const shape = (c) => smooth(c, [[-0.11, -0.01], [-0.1, 0.08], [0, 0.11], [0.1, 0.08], [0.11, -0.01]], true, 0.4);
    fill(ctx, '#1b2440', shape);
    for (let row = 0; row < 3; row++) for (let i = -4; i <= 4; i++) fill(ctx, '#e7eaee', (c) => ellipse(c, i * 0.023 + (row % 2) * 0.011, 0.015 + row * 0.028, 0.007, 0.007));
    for (let i = -5; i <= 5; i++) stroke(ctx, '#e7eaee', 0.003, (c) => { c.moveTo(i * 0.02, -0.005); c.lineTo(i * 0.02, -0.03 - (i % 2 ? 0.008 : 0)); });
    for (const [x, y, col] of [[-0.12, 0.05, '#e63946'], [-0.13, 0.0, '#2a9d8f'], [-0.12, -0.05, '#f4d35e'], [0.12, 0.05, '#e63946'], [0.13, 0.0, '#f4a261'], [0.12, -0.05, '#8338ec']]) fill(ctx, col, (c) => ellipse(c, x, y, 0.022, 0.022));
  } else if (h.kind === 'kazakh') {
    // Fox-fur brim and a tall crown topped with an owl-feather plume.
    fill(ctx, '#b0412e', (c) => smooth(c, [[-0.08, 0.05], [-0.06, 0.22], [0, 0.25], [0.06, 0.22], [0.08, 0.05]], true, 0.4));
    band(ctx, -0.1, 0.1, 0.12, 0.02, '#b0412e', '#f4d35e', 'dots');
    fill(ctx, '#c98b4a', (c) => smooth(c, [[-0.13, -0.02], [-0.14, 0.06], [-0.1, 0.1], [0.1, 0.1], [0.14, 0.06], [0.13, -0.02], [0, 0.0]], true, 0.4));
    stroke(ctx, '#8a5a2b', 0.004, (c) => { for (let x = -0.12; x < 0.13; x += 0.018) { c.moveTo(x, 0.0); c.lineTo(x + 0.01, 0.08); } });
    for (let k = -2; k <= 2; k++) fill(ctx, '#f7f3ea', (c) => ellipse(c, k * 0.012, 0.29 + Math.abs(k) * -0.01, 0.008, 0.05, k * 0.25));
  } else if (h.kind === 'manchu') {
    // 两把头: a broad black board on a stem, a great peony, tassels at the side.
    fill(ctx, '#15110f', (c) => poly(c, [[-0.03, 0.0], [-0.03, 0.14], [0.03, 0.14], [0.03, 0.0]]));
    fill(ctx, '#15110f', (c) => smooth(c, [[-0.3, 0.13], [-0.31, 0.2], [0.31, 0.2], [0.3, 0.13]], true, 0.2));
    band(ctx, -0.3, 0.3, 0.165, 0.018, '#15110f', '#d4a24c', 'cloud');
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      fill(ctx, p % 2 ? '#d62839' : '#e5566b', (c) => ellipse(c, Math.cos(a) * 0.035, 0.17 + Math.sin(a) * 0.03, 0.04, 0.026, a));
    }
    fill(ctx, '#f4d35e', (c) => ellipse(c, 0, 0.17, 0.015, 0.015));
    for (let k = 0; k < 3; k++) stroke(ctx, k === 1 ? '#f4d35e' : '#d62839', 0.006, (c) => { c.moveTo(0.26 + k * 0.012, 0.13); c.lineTo(0.27 + k * 0.012, -0.12); });
  } else if (h.kind === 'bai') {
    // 风花雪月: white crest (snow), a crescent top (moon), embroidered flowers, a white tassel (wind).
    fill(ctx, '#fbfaf7', (c) => smooth(c, [[-0.12, -0.01], [-0.13, 0.07], [-0.05, 0.1], [0.05, 0.1], [0.13, 0.07], [0.12, -0.01]], true, 0.3));
    fill(ctx, '#fbfaf7', (c) => { c.moveTo(-0.12, 0.07); c.quadraticCurveTo(0, 0.28, 0.13, 0.07); c.quadraticCurveTo(0, 0.18, -0.12, 0.07); });
    band(ctx, -0.13, 0.13, 0.03, 0.03, '#d62839', '#f7a1b5', 'diamond', '#fbfaf7');
    flowers(ctx, -0.1, 0.05, 0.1, 0.09, ['#e5566b', '#f7a1b5'], 0.018, 21, 1.2);
    for (let k = 0; k < 7; k++) stroke(ctx, '#fbfaf7', 0.006, (c) => { c.moveTo(-0.12, 0.02); c.lineTo(-0.15 - k * 0.006, -0.18 - (k % 3) * 0.02); });
  } else if (h.kind === 'naxi') {
    fill(ctx, '#23395b', (c) => smooth(c, [[-0.1, -0.01], [-0.1, 0.06], [0, 0.09], [0.1, 0.06], [0.1, -0.01]], true, 0.4));
    band(ctx, -0.11, 0.11, 0.005, 0.016, '#23395b', '#e9c46a', 'dots');
  } else if (h.kind === 'dong') {
    // High bun with a silver comb, a silver flower crown and a side flower.
    fill(ctx, HAIR, (c) => ellipse(c, 0, 0.07, 0.07, 0.06));
    fill(ctx, '#e7eaee', (c) => smooth(c, [[-0.09, 0.03], [-0.07, 0.12], [0, 0.14], [0.07, 0.12], [0.09, 0.03], [0, 0.06]], true, 0.4));
    for (let i = -3; i <= 3; i++) fill(ctx, '#ffffff', (c) => ellipse(c, i * 0.024, 0.11 - Math.abs(i) * 0.012, 0.01, 0.01));
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      fill(ctx, '#e5566b', (c) => ellipse(c, 0.1 + Math.cos(a) * 0.016, 0.06 + Math.sin(a) * 0.016, 0.014, 0.009, a));
    }
  } else if (h.kind === 'li') {
    // Black head-cloth with a woven Li-brocade front band, knotted at the side.
    const shape = (c) => smooth(c, [[-0.115, -0.01], [-0.12, 0.07], [0, 0.1], [0.12, 0.07], [0.115, -0.01]], true, 0.35);
    fill(ctx, '#15110f', shape);
    clipTo(ctx, shape, () => band(ctx, -0.14, 0.14, 0.025, 0.035, '#15110f', '#e63946', 'zigzag'));
    fill(ctx, '#15110f', (c) => poly(c, [[0.1, 0.03], [0.17, 0.0], [0.16, -0.08], [0.12, -0.02]]));
  } else if (h.kind === 'yiGirl') {
    // Liangshan Yi: a broad black hat, banded red and yellow, silver at the brim.
    fill(ctx, '#15110f', (c) => smooth(c, [[-0.16, 0.0], [-0.18, 0.09], [-0.1, 0.13], [0.1, 0.13], [0.18, 0.09], [0.16, 0.0]], true, 0.2));
    band(ctx, -0.18, 0.18, 0.03, 0.022, '#c1121f', '#f4d35e', 'diamond');
    band(ctx, -0.18, 0.18, 0.065, 0.014, '#f4d35e', '#c1121f', 'zigzag');
    band(ctx, -0.18, 0.18, 0.1, 0.018, '#15110f', '#c1121f', 'cloud');
    for (let i = -6; i <= 6; i++) fill(ctx, '#e7eaee', (c) => ellipse(c, i * 0.026, -0.004, 0.006, 0.006));
  }
}

// Torso shapes.
const TORSO = (c) => smooth(c, [[-0.112, 0.0], [-0.118, 0.16], [-0.14, 0.34], [-0.172, 0.41], [-0.15, 0.445], [-0.055, 0.465], [0, 0.46], [0.055, 0.465], [0.15, 0.445], [0.172, 0.41], [0.14, 0.34], [0.118, 0.16], [0.112, 0.0]], true, 0.25);

function drawTorso(ctx, s) {
  const skin = s.skin ?? SKIN;
  // Neck.
  fill(ctx, skin, (c) => poly(c, [[-0.036, 0.4], [-0.034, 0.54], [0.034, 0.54], [0.036, 0.4]]));
  const top = s.top ?? {};
  fill(ctx, top.color ?? '#b5179e', TORSO);
  clipTo(ctx, TORSO, () => {
    if (top.pattern === 'ikat') ikat(ctx, -0.2, -0.02, 0.2, 0.5, top.colors, top.seed ?? 3, 0.05);
    if (top.pattern === 'stripes') stripesH(ctx, -0.2, -0.02, 0.2, 0.5, top.colors, top.stripeH ?? 0.04);
    if (top.pattern === 'embroidered') {
      band(ctx, -0.2, 0.2, 0.25, 0.05, top.colors?.[0] ?? '#1d3557', top.colors?.[1] ?? '#e63946', 'diamond', top.colors?.[2]);
      band(ctx, -0.2, 0.2, 0.33, 0.03, top.colors?.[1] ?? '#e63946', top.colors?.[2] ?? '#f1faee', 'zigzag');
    }
    if (top.vest) {
      // Velvet vest opening to a V, with gold embroidery on the fronts.
      fill(ctx, top.vest, (c) => {
        poly(c, [[-0.2, -0.02], [-0.2, 0.46], [-0.06, 0.46], [-0.02, 0.2], [-0.03, -0.02]]);
        poly(c, [[0.2, -0.02], [0.2, 0.46], [0.06, 0.46], [0.02, 0.2], [0.03, -0.02]]);
      });
      stroke(ctx, top.vestTrim ?? '#d4a24c', 0.008, (c) => {
        poly(c, [[-0.06, 0.46], [-0.02, 0.2], [-0.03, -0.02]], false);
        poly(c, [[0.06, 0.46], [0.02, 0.2], [0.03, -0.02]], false);
      });
      flowers(ctx, -0.14, 0.06, -0.05, 0.3, [top.vestTrim ?? '#d4a24c', '#e76f51'], 0.014, 11, 0.9);
      flowers(ctx, 0.05, 0.06, 0.14, 0.3, [top.vestTrim ?? '#d4a24c', '#e76f51'], 0.014, 12, 0.9);
    }
    if (top.robeCross) {
      // Wrap-over robe front (deel / chuba), with a broad trim.
      fill(ctx, top.trim ?? '#c9a227', (c) => poly(c, [[-0.06, 0.465], [0.13, 0.12], [0.16, 0.14], [-0.02, 0.47]]));
    }
    if (top.collar) fill(ctx, top.collar, (c) => smooth(c, [[-0.058, 0.462], [-0.03, 0.4], [0, 0.39], [0.03, 0.4], [0.058, 0.462], [0, 0.44]], true, 0.4));
    if (top.sash) fill(ctx, top.sash, (c) => poly(c, [[-0.2, 0.0], [-0.2, 0.07], [0.2, 0.07], [0.2, 0.0]]));
  });
  // Necklace.
  const nk = s.necklace;
  if (nk === 'turquoise') {
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (0.15 + (0.7 * i) / 10);
      const x = Math.cos(a) * 0.075;
      const y = 0.44 - Math.sin(a) * 0.1;
      fill(ctx, i % 3 === 1 ? '#e8a33d' : i % 3 === 2 ? '#c0392b' : '#2ec4b6', (c) => ellipse(c, x, y, 0.011, 0.011));
    }
    fill(ctx, '#e8a33d', (c) => ellipse(c, 0, 0.325, 0.02, 0.02));
  } else if (nk === 'silver') {
    for (let k = 0; k < 3; k++) stroke(ctx, '#e7eaee', 0.012, (c) => c.ellipse(0, 0.47, 0.075 + k * 0.02, 0.05 + k * 0.03, 0, Math.PI * 1.08, Math.PI * 1.92));
    for (let i = -3; i <= 3; i++) fill(ctx, '#e7eaee', (c) => ellipse(c, i * 0.025, 0.37 - Math.abs(i) * 0.008, 0.007, 0.012));
  } else if (nk === 'gold') {
    stroke(ctx, '#d4a24c', 0.005, (c) => c.ellipse(0, 0.47, 0.06, 0.045, 0, Math.PI * 1.1, Math.PI * 1.9));
  }
}

function drawUpperArm(ctx, s, side) {
  const sl = s.sleeve ?? {};
  const w = sl.puff ? 0.062 : 0.052;
  const shape = (c) => smooth(c, [[-w, 0.03], [w, 0.03], [w * 0.92, -0.18], [w * 0.8, -0.3], [-w * 0.8, -0.3], [-w * 0.92, -0.18]], true, 0.3);
  fill(ctx, sl.color ?? s.top?.color ?? '#b5179e', shape);
  clipTo(ctx, shape, () => {
    if (sl.pattern === 'ikat') ikat(ctx, -0.08, -0.32, 0.08, 0.05, sl.colors, (sl.seed ?? 4) + side, 0.04);
    if (sl.pattern === 'stripes') stripesH(ctx, -0.08, -0.32, 0.08, 0.05, sl.colors, 0.03);
  });
}

function drawForearm(ctx, s, side) {
  const sl = s.sleeve ?? {};
  const long = sl.long ?? 0; // extra sleeve length (Tibetan dance sleeves)
  const flare = sl.flare ?? 0;
  const shape = (c) => smooth(c, [[-0.046, 0.03], [0.046, 0.03], [0.042 + flare * 0.5, -0.12], [0.044 + flare, -0.27 - long], [-0.044 - flare, -0.27 - long], [-0.042 - flare * 0.5, -0.12]], true, 0.3);
  fill(ctx, sl.color ?? s.top?.color ?? '#b5179e', shape);
  clipTo(ctx, shape, () => {
    if (sl.pattern === 'ikat') ikat(ctx, -0.1, -0.6, 0.1, 0.05, sl.colors, (sl.seed ?? 6) + side, 0.04);
    if (sl.pattern === 'stripes') stripesH(ctx, -0.1, -0.6, 0.1, 0.05, sl.colors, 0.03);
    if (sl.cuff) fill(ctx, sl.cuff, (c) => poly(c, [[-0.12, -0.27 - long], [0.12, -0.27 - long], [0.12, -0.23 - long], [-0.12, -0.23 - long]]));
  });
}

function drawHand(ctx, s, side, pose = 'open') {
  const skin = s.skin ?? SKIN;
  if (pose === 'peacock') {
    // 孔雀手: fingers straight and fanned, thumb and index pinched into a beak.
    fill(ctx, skin, (c) => smooth(c, [[-0.03, 0.02], [0.03, 0.02], [0.032, -0.04], [0.045, -0.09], [0.03, -0.1], [0.01, -0.06], [-0.02, -0.095], [-0.035, -0.04]], true, 0.3));
    fill(ctx, skin, (c) => poly(c, [[-0.03, -0.03], [-0.07, -0.02], [-0.07, -0.028], [-0.03, -0.045]]));
    return;
  }
  // Mitten with thumb.
  fill(ctx, skin, (c) => smooth(c, [[-0.03, 0.02], [0.03, 0.02], [0.034, -0.05], [0.022, -0.1], [0, -0.108], [-0.022, -0.1], [-0.034, -0.05]], true, 0.35));
  fill(ctx, skin, (c) => smooth(c, [[side * 0.025, -0.01], [side * 0.052, -0.035], [side * 0.05, -0.05], [side * 0.028, -0.04]], true, 0.4));
  if (s.bangles) for (let k = 0; k < 2; k++) stroke(ctx, s.bangles, 0.006, (c) => {
    c.moveTo(-0.034, 0.012 - k * 0.012);
    c.lineTo(0.034, 0.012 - k * 0.012);
  });
}

function drawSkirt(ctx, s) {
  const sk = s.skirt;
  if (!sk) return;
  const L = sk.length ?? 0.9;
  const W = sk.width ?? 0.36;
  let shape;
  if (sk.kind === 'tube') shape = (c) => smooth(c, [[-0.12, 0.05], [0.12, 0.05], [0.14, -0.3], [0.13, -L], [-0.13, -L], [-0.14, -0.3]], true, 0.3);
  else if (sk.kind === 'pleated') shape = (c) => poly(c, [[-0.13, 0.05], [0.13, 0.05], [W, -L], [-W, -L]]);
  else shape = (c) => smooth(c, [[-0.12, 0.05], [0.12, 0.05], [W * 0.7, -L * 0.5], [W, -L], [0, -L - 0.03], [-W, -L], [-W * 0.7, -L * 0.5]], true, 0.35);
  fill(ctx, sk.color ?? '#b5179e', shape);
  clipTo(ctx, shape, () => {
    if (sk.pattern === 'ikat') ikat(ctx, -W - 0.1, -L - 0.1, W + 0.1, 0.1, sk.colors, sk.seed ?? 7, 0.075);
    if (sk.pattern === 'stripes') stripesH(ctx, -W - 0.1, -L - 0.1, W + 0.1, 0.1, sk.colors, sk.stripeH ?? 0.05);
    if (sk.pattern === 'pleats') {
      for (let x = -W; x < W; x += 0.028) stroke(ctx, 'rgba(0,0,0,0.25)', 0.004, (c) => {
        c.moveTo(x * 0.35, 0.05);
        c.lineTo(x, -L);
      });
    }
    if (sk.pattern === 'brocade') {
      for (let y = -0.1; y > -L; y -= 0.12) band(ctx, -W - 0.1, W + 0.1, y, 0.05, sk.colors[1], sk.colors[2], y % 0.24 < -0.1 ? 'diamond' : 'zigzag', sk.colors[3]);
    }
    if (sk.apron) {
      // Tibetan bangdian: a striped apron over the robe.
      clipTo(ctx, (c) => poly(c, [[-0.14, 0.02], [0.14, 0.02], [0.2, -L + 0.08], [-0.2, -L + 0.08]]), () => stripesH(ctx, -0.3, -L, 0.3, 0.05, sk.apron, 0.035));
    }
    if (sk.hem) {
      for (const [col, y0, h, kind, fg, acc] of sk.hem) band(ctx, -W - 0.2, W + 0.2, -L + y0, h, col, fg ?? '#f4d35e', kind ?? 'diamond', acc);
    }
  });
}

function drawLeg(ctx, s, part) {
  const p = s.pants ?? { color: '#222' };
  if (part === 'thigh') fill(ctx, p.color, (c) => smooth(c, [[-0.068, 0.03], [0.068, 0.03], [0.058, -0.25], [0.05, -0.46], [-0.05, -0.46], [-0.058, -0.25]], true, 0.3));
  else {
    fill(ctx, p.color, (c) => poly(c, [[-0.05, 0.02], [0.05, 0.02], [0.046, -0.2], [-0.046, -0.2]]));
    // Boot.
    fill(ctx, p.boots ?? '#15110f', (c) => smooth(c, [[-0.054, -0.14], [0.054, -0.14], [0.056, -0.4], [0.1, -0.43], [0.1, -0.46], [-0.058, -0.46], [-0.058, -0.4]], true, 0.2));
    if (p.bootTrim) band(ctx, -0.07, 0.07, -0.16, 0.02, p.bootTrim, '#15110f', 'dots');
  }
}

// ─── Assembly ───────────────────────────────────────────────────────────────

/**
 * Build a person. Returns { root, j, cards, spec }.
 * spec.detail (px per unit) — raise for heroes seen in close-up.
 */
export function makePerson(spec) {
  const d = spec.detail ?? 900;
  const s = spec;
  const legs = !!s.pants;
  const parts = [
    { name: 'hips', pin: [0, 0.96], z: 0 },
    { name: 'skirt', parent: 'hips', pin: [0, 0.03], z: -0.006, bounds: [-(s.skirt?.width ?? 0.36) - 0.06, -(s.skirt?.length ?? 0.9) - 0.06, (s.skirt?.width ?? 0.36) + 0.06, 0.08], draw: (c) => drawSkirt(c, s), px: d * 0.9, skip: !s.skirt },
    { name: 'thighA', parent: 'hips', pin: [-0.07, 0.02], z: -0.004, bounds: [-0.08, -0.48, 0.08, 0.05], draw: (c) => drawLeg(c, s, 'thigh'), px: d * 0.7, skip: !legs },
    { name: 'kneeA', parent: 'thighA', pin: [0, -0.44], z: 0.001, bounds: [-0.07, -0.48, 0.11, 0.04], draw: (c) => drawLeg(c, s, 'shin'), px: d * 0.7, skip: !legs },
    { name: 'thighB', parent: 'hips', pin: [0.07, 0.02], z: -0.004, bounds: [-0.08, -0.48, 0.08, 0.05], draw: (c) => drawLeg(c, s, 'thigh'), px: d * 0.7, skip: !legs },
    { name: 'kneeB', parent: 'thighB', pin: [0, -0.44], z: 0.001, bounds: [-0.07, -0.48, 0.11, 0.04], draw: (c) => drawLeg(c, s, 'shin'), px: d * 0.7, skip: !legs },
    { name: 'torso', parent: 'hips', pin: [0, 0], z: 0, bounds: [-0.2, -0.03, 0.2, 0.56], draw: (c) => drawTorso(c, s), px: d },
    { name: 'head', parent: 'torso', pin: [0, 0.485], z: 0.008 },
    { name: 'backhair', parent: 'head', pin: [0, 0.14], z: -0.03, bounds: [-0.14, -0.7, 0.14, 0.4], draw: (c) => drawBackHair(c, s), px: d * 1.2, skip: !['braids', 'bun', 'long'].includes(s.hair) },
    { name: 'face', parent: 'head', pin: [0, 0], z: 0, bounds: [-0.14, -0.07, 0.14, 0.32], draw: (c) => drawHead(c, s), px: d * 2.2 },
    { name: 'hat', parent: 'head', pin: [0, 0.225], z: 0.004, bounds: [-0.36, s.hat?.low ? -0.32 : -0.08, 0.36, 0.4], draw: (c) => drawHat(c, s), px: d * 1.6, skip: !s.hat },
    { name: 'shoulderA', parent: 'torso', pin: [-0.155, 0.405], z: 0.012, bounds: [-0.08, -0.32, 0.08, 0.06], draw: (c) => drawUpperArm(c, s, 0), px: d },
    { name: 'elbowA', parent: 'shoulderA', pin: [0, -0.28], z: 0.002, bounds: [-0.1, -0.3 - (s.sleeve?.long ?? 0) - 0.02, 0.1, 0.05], draw: (c) => drawForearm(c, s, 0), px: d },
    { name: 'wristA', parent: 'elbowA', pin: [0, -0.255 - (s.sleeve?.long ?? 0) * 0.3], z: -0.001, bounds: [-0.08, -0.12, 0.08, 0.03], draw: (c) => drawHand(c, s, -1, s.handPose), px: d * 1.3 },
    { name: 'shoulderB', parent: 'torso', pin: [0.155, 0.405], z: 0.012, bounds: [-0.08, -0.32, 0.08, 0.06], draw: (c) => drawUpperArm(c, s, 1), px: d },
    { name: 'elbowB', parent: 'shoulderB', pin: [0, -0.28], z: 0.002, bounds: [-0.1, -0.3 - (s.sleeve?.long ?? 0) - 0.02, 0.1, 0.05], draw: (c) => drawForearm(c, s, 1), px: d },
    { name: 'wristB', parent: 'elbowB', pin: [0, -0.255 - (s.sleeve?.long ?? 0) * 0.3], z: -0.001, bounds: [-0.08, -0.12, 0.08, 0.03], draw: (c) => drawHand(c, s, 1, s.handPose), px: d * 1.3 },
  ].filter((p) => !p.skip);
  const pup = buildPuppet(parts, { back: s.back ?? '#efe6d6' });
  const k = s.scale ?? 1;
  pup.root.scale.setScalar(k);
  pup.spec = s;
  return pup;
}

/**
 * Pose a person. All angles in radians.
 * p: { raiseA, raiseB, elbowA, elbowB, wristA, wristB, head, neckSlide, lean, hipX, hipY,
 *      skirtFlare, turn, thighA, thighB, kneeA, kneeB, braid }
 */
export function pose(pup, p) {
  const j = pup.j;
  j.shoulderA.rotation.z = -(p.raiseA ?? 0.12);
  j.shoulderB.rotation.z = p.raiseB ?? 0.12;
  j.elbowA.rotation.z = -(p.elbowA ?? 0.1);
  j.elbowB.rotation.z = p.elbowB ?? 0.1;
  j.wristA.rotation.z = -(p.wristA ?? 0);
  j.wristB.rotation.z = p.wristB ?? 0;
  j.head.rotation.z = p.head ?? 0;
  j.head.position.x = p.neckSlide ?? 0;
  j.torso.rotation.z = p.lean ?? 0;
  j.hips.position.x = p.hipX ?? 0;
  j.hips.position.y = 0.96 + (p.hipY ?? 0);
  if (j.skirt) j.skirt.scale.x = 1 + (p.skirtFlare ?? 0);
  if (j.skirt) j.skirt.rotation.z = p.skirtSwing ?? 0;
  if (j.thighA) j.thighA.rotation.z = p.thighA ?? 0;
  if (j.thighB) j.thighB.rotation.z = p.thighB ?? 0;
  if (j.kneeA) j.kneeA.rotation.z = p.kneeA ?? 0;
  if (j.kneeB) j.kneeB.rotation.z = p.kneeB ?? 0;
  if (j.backhair) j.backhair.rotation.z = p.braid ?? 0;
  pup.root.rotation.y = p.turn ?? 0;
}

// ─── Presets ────────────────────────────────────────────────────────────────

export const ATLAS_A = ['#c2185b', '#f9c80e', '#1b998b', '#2d3a8c', '#101010', '#f9f4ef', '#e84a5f'];
export const ATLAS_B = ['#6a0dad', '#ff6f59', '#f7d08a', '#1e6091', '#0b0b0b', '#43aa8b'];
export const ATLAS_C = ['#118ab2', '#ef476f', '#ffd166', '#06d6a0', '#073b4c'];

export const PEOPLE = {
  uyghurGirl: (o = {}) => ({
    hair: 'braids', braids: 11, usma: true, earrings: '#d4a24c', look: 0.35, smile: 0.008,
    hat: { kind: 'doppa', base: '#14532d', trim: '#c9a227' },
    top: { color: '#c2185b', pattern: 'ikat', colors: ATLAS_A, seed: 11, vest: '#1b1b2f', vestTrim: '#d4a24c', collar: '#d4a24c' },
    sleeve: { color: '#c2185b', pattern: 'ikat', colors: ATLAS_A, seed: 12, cuff: '#d4a24c' },
    skirt: { kind: 'flare', color: '#c2185b', pattern: 'ikat', colors: ATLAS_A, seed: 13, width: 0.42, length: 0.9, hem: [['#1b1b2f', 0.03, 0.05, 'diamond', '#d4a24c', '#c2185b']] },
    necklace: 'gold', bangles: '#d4a24c', ...o,
  }),
  uyghurWoman: (colors, seed, o = {}) => ({
    hair: 'braids', braids: 7, usma: true, earrings: '#d4a24c', look: -0.2,
    hat: { kind: 'doppa', base: '#7b2cbf', flowers: ['#ffd166', '#ef476f', '#ffffff'] },
    top: { color: colors[0], pattern: 'ikat', colors, seed },
    sleeve: { color: colors[0], pattern: 'ikat', colors, seed: seed + 1 },
    skirt: { kind: 'flare', color: colors[0], pattern: 'ikat', colors, seed: seed + 2, width: 0.38, length: 0.9 },
    detail: 480, ...o,
  }),
  uyghurMan: (o = {}) => ({
    hair: 'short', look: 0.1,
    hat: { kind: 'doppa', base: '#101010', chust: true },
    top: { color: '#f4efe6', vest: '#141414', vestTrim: '#d4a24c', sash: '#7a1020' },
    sleeve: { color: '#f4efe6' },
    pants: { color: '#1c1c1c', boots: '#3b2314' },
    detail: 480, ...o,
  }),
  tibetanGirl: (o = {}) => ({
    hair: 'long', earrings: '#e8a33d', look: 0, eyes: 'closed', smile: 0.01,
    hat: { kind: 'tibet' },
    top: { color: '#7a1f2b', robeCross: true, trim: '#2ec4b6', collar: '#f1e3c6' },
    sleeve: { color: '#f1e3c6', long: 0.22, flare: 0.02, cuff: '#2ec4b6' },
    skirt: { kind: 'flare', color: '#5b1a24', width: 0.33, length: 0.92, apron: ['#d62828', '#f77f00', '#2a9d8f', '#fcbf49', '#264653', '#e9c46a', '#8338ec'], hem: [['#2ec4b6', 0.02, 0.035, 'cross', '#7a1f2b']] },
    necklace: 'turquoise', ...o,
  }),
  mongolRider: (o = {}) => ({
    hair: 'short', look: 0.4,
    hat: { kind: 'mongol', base: '#1f4e8c', brim: '#c9a227' },
    top: { color: '#1f6fb2', robeCross: true, trim: '#d4a24c', sash: '#f28c28' },
    sleeve: { color: '#1f6fb2', cuff: '#d4a24c' },
    pants: { color: '#1f6fb2', boots: '#7a2e1b', bootTrim: '#d4a24c' },
    ...o,
  }),
  miaoGirl: (o = {}) => ({
    hair: 'bun', look: 0.3, smile: 0.01,
    hat: { kind: 'miao' },
    top: { color: '#1b1f3b', pattern: 'embroidered', colors: ['#1b1f3b', '#d62828', '#f4a261'] },
    sleeve: { color: '#1b1f3b', pattern: 'stripes', colors: ['#1b1f3b', '#1b1f3b', '#d62828', '#f4a261', '#1b1f3b', '#2a9d8f'] },
    skirt: { kind: 'pleated', color: '#14142b', width: 0.3, length: 0.5, pattern: 'pleats', hem: [['#d62828', 0.05, 0.05, 'diamond', '#f4a261', '#2a9d8f'], ['#1b1f3b', 0.12, 0.03, 'zigzag', '#e7eaee']] },
    pants: { color: '#14142b', boots: '#14142b' },
    necklace: 'silver', earrings: '#e7eaee', ...o,
  }),
  zhuangGirl: (o = {}) => ({
    hair: 'long', look: 0.2, smile: 0.012, earrings: '#e7eaee',
    hat: { kind: 'zhuang', low: true },
    top: { color: '#1d2b53', pattern: 'embroidered', colors: ['#1d2b53', '#c1121f', '#f4d35e'], collar: '#c1121f' },
    sleeve: { color: '#1d2b53', cuff: '#c1121f' },
    skirt: { kind: 'pleated', color: '#1d2b53', width: 0.34, length: 0.85, pattern: 'pleats', hem: [['#c1121f', 0.04, 0.05, 'diamond', '#f4d35e', '#2a9d8f']] },
    necklace: 'silver', bangles: '#e7eaee', ...o,
  }),
  koreanGirl: (o = {}) => ({
    hair: 'long', look: -0.25, smile: 0.012,
    hat: { kind: 'korean' },
    top: { color: '#fbf6ea', collar: '#fbfaf7', sash: '#c1121f' },
    sleeve: { color: '#fbf6ea', pattern: 'stripes', colors: ['#e63946', '#f4a261', '#f4d35e', '#2a9d8f', '#3a86ff', '#8338ec', '#fbf6ea'], cuff: '#1d3557' },
    skirt: { kind: 'flare', color: '#d62839', width: 0.46, length: 0.98 },
    ...o,
  }),
  yiGirl: (o = {}) => ({
    hair: 'long', look: 0.15, smile: 0.01, earrings: '#e7eaee',
    hat: { kind: 'yiGirl' },
    top: { color: '#15110f', pattern: 'embroidered', colors: ['#15110f', '#c1121f', '#f4d35e'], collar: '#c1121f' },
    sleeve: { color: '#15110f', pattern: 'stripes', colors: ['#15110f', '#15110f', '#c1121f', '#f4d35e'] },
    skirt: { kind: 'pleated', color: '#15110f', width: 0.42, length: 0.92, pattern: 'pleats', hem: [['#c1121f', 0.05, 0.06, 'zigzag', '#f4d35e'], ['#f4d35e', 0.18, 0.05, 'diamond', '#15110f', '#c1121f'], ['#2a6f97', 0.32, 0.05, 'cross', '#f4d35e']] },
    necklace: 'silver', ...o,
  }),
  haniGirl: (o = {}) => ({
    hair: 'long', look: 0.3, smile: 0.012,
    hat: { kind: 'hani', low: true },
    top: { color: '#1b2440', pattern: 'embroidered', colors: ['#1b2440', '#e63946', '#e7eaee'], collar: '#e7eaee' },
    sleeve: { color: '#1b2440', pattern: 'stripes', colors: ['#1b2440', '#1b2440', '#1b2440', '#e63946', '#f4d35e', '#2a9d8f'] },
    skirt: { kind: 'tube', color: '#1b2440', length: 0.6 },
    pants: { color: '#1b2440', boots: '#1b2440' },
    necklace: 'silver', ...o,
  }),
  kazakhMan: (o = {}) => ({
    hair: 'short', look: -0.3,
    hat: { kind: 'kazakh' },
    top: { color: '#3b2a4f', robeCross: true, trim: '#c98b4a', sash: '#b0412e' },
    sleeve: { color: '#3b2a4f', cuff: '#c98b4a' },
    pants: { color: '#2a1f35', boots: '#3b2314' },
    ...o,
  }),
  huiMan: (o = {}) => ({
    hair: 'short', look: 0.2, smile: 0.01,
    hat: { kind: 'cap' },
    top: { color: '#fbfaf7', vest: '#15110f', vestTrim: '#15110f' },
    sleeve: { color: '#fbfaf7' },
    pants: { color: '#15110f', boots: '#15110f' },
    ...o,
  }),
  manchuGirl: (o = {}) => ({
    hair: 'bun', look: -0.15, smile: 0.008, earrings: '#e7eaee',
    hat: { kind: 'manchu', low: true },
    top: { color: '#2a6f97', robeCross: true, trim: '#f4d35e', collar: '#f4d35e' },
    sleeve: { color: '#2a6f97', cuff: '#fbfaf7', long: 0.04 },
    skirt: { kind: 'tube', color: '#2a6f97', length: 0.95, hem: [['#f4d35e', 0.05, 0.05, 'cloud', '#2a6f97']] },
    ...o,
  }),
  baiGirl: (o = {}) => ({
    hair: 'long', look: 0.25, smile: 0.012, earrings: '#e7eaee',
    hat: { kind: 'bai', low: true },
    top: { color: '#fbfaf7', vest: '#c1121f', vestTrim: '#f7a1b5', collar: '#c1121f' },
    sleeve: { color: '#fbfaf7', cuff: '#2a6f97' },
    skirt: { kind: 'tube', color: '#2a6f97', length: 0.7, hem: [['#fbfaf7', 0.35, 0.3, 'dots', '#f7a1b5']] },
    pants: { color: '#fbfaf7', boots: '#c1121f' },
    ...o,
  }),
  naxiGirl: (o = {}) => ({
    hair: 'long', look: -0.2, smile: 0.01,
    hat: { kind: 'naxi' },
    top: { color: '#2a6f97', vest: '#7a1f2b', vestTrim: '#e9c46a' },
    sleeve: { color: '#2a6f97', cuff: '#e9c46a' },
    skirt: { kind: 'pleated', color: '#1b2440', width: 0.34, length: 0.9, pattern: 'pleats', apron: ['#fbfaf7', '#f1ece0'] },
    ...o,
  }),
  dongGirl: (o = {}) => ({
    hair: 'bun', look: 0.1, smile: 0.012, earrings: '#e7eaee',
    hat: { kind: 'dong' },
    top: { color: '#3a2f4a', pattern: 'embroidered', colors: ['#3a2f4a', '#e5566b', '#2a9d8f'], collar: '#e7eaee' },
    sleeve: { color: '#3a2f4a', cuff: '#e5566b' },
    skirt: { kind: 'pleated', color: '#2a2438', width: 0.34, length: 0.55, pattern: 'pleats' },
    pants: { color: '#2a2438', boots: '#2a2438' },
    necklace: 'silver', ...o,
  }),
  liGirl: (o = {}) => ({
    hair: 'long', look: 0.25, smile: 0.012,
    hat: { kind: 'li' },
    top: { color: '#15110f', collar: '#e63946', pattern: 'embroidered', colors: ['#15110f', '#e63946', '#f4d35e'] },
    sleeve: { color: '#15110f', cuff: '#e63946' },
    skirt: { kind: 'tube', color: '#15110f', length: 0.75, pattern: 'brocade', colors: ['#15110f', '#e63946', '#f4d35e', '#2a9d8f'] },
    ...o,
  }),
  hanGirl: (o = {}) => ({
    hair: 'bun', look: 0.1, smile: 0.012, earrings: '#d4a24c',
    top: { color: '#c1121f', collar: '#d4a24c', pattern: 'embroidered', colors: ['#c1121f', '#d4a24c', '#f6e3b0'] },
    sleeve: { color: '#c1121f', cuff: '#d4a24c' },
    skirt: { kind: 'tube', color: '#1d3557', length: 0.9, hem: [['#d4a24c', 0.05, 0.04, 'cloud', '#1d3557']] },
    ...o,
  }),
  hanBoy: (o = {}) => ({
    hair: 'short', look: -0.1, smile: 0.012,
    top: { color: '#fbfaf7', collar: '#1d3557', sash: '#c1121f' },
    sleeve: { color: '#fbfaf7' },
    pants: { color: '#1d3557', boots: '#15110f' },
    ...o,
  }),
  daiGirl: (o = {}) => ({
    hair: 'short', look: -0.3, smile: 0.008, handPose: 'peacock',
    hat: { kind: 'dai' },
    top: { color: '#f7d6e0' },
    sleeve: { color: '#f7d6e0' },
    skirt: { kind: 'tube', color: '#1b998b', length: 0.93, pattern: 'brocade', colors: ['#1b998b', '#0b6e4f', '#f4d35e', '#ef476f'] },
    bangles: '#d4a24c', ...o,
  }),
};

/** Clone a puppet cheaply (shares textures and geometry) and rebuild its joint map. */
export function clonePerson(pup) {
  const root = pup.root.clone();
  const j = { root };
  root.traverse((o) => {
    if (o.name && !(o.name in j)) j[o.name] = o;
  });
  return { root, j, cards: pup.cards, spec: pup.spec };
}

export { rng };
