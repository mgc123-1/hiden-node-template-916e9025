// Paper: the material the whole world is cut from.
//
// card() turns a 2-D drawing into a sheet of coloured card in 3-D: dyed
// surface with mottling, a fibre normal map so raking light finds the grain,
// a bevel along every cut edge, true alpha-tested shadows, and — for anything
// that turns around — a plain white reverse.

import * as THREE from 'three';
import { rng } from '../core.js';

const TILE = 1024;
let NORMAL = null;
let GRAIN = null;
export const PAPER_TILE_WORLD = 0.9; // world units covered by one fibre tile

function lattice(cells, seed) {
  const g = new Float32Array(cells * cells);
  const r = rng(seed);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const fx = (x / TILE) * cells;
    const fy = (y / TILE) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = g[(y0 % cells) * cells + (x0 % cells)];
    const b = g[(y0 % cells) * cells + ((x0 + 1) % cells)];
    const c = g[((y0 + 1) % cells) * cells + (x0 % cells)];
    const d = g[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Build the shared fibre normal map and colour-grain tile (once). */
export function initPaper() {
  if (NORMAL) return;
  // Height field: soft mottling + fine tooth + fibres.
  const hc = document.createElement('canvas');
  hc.width = hc.height = TILE;
  const h = hc.getContext('2d');
  const img = h.createImageData(TILE, TILE);
  const n1 = lattice(8, 1);
  const n2 = lattice(64, 2);
  const n3 = lattice(256, 3);
  const r = rng(77);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const v = 128 + (n1(x, y) - 0.5) * 30 + (n2(x, y) - 0.5) * 40 + (n3(x, y) - 0.5) * 34 + (r() - 0.5) * 18;
      const o = (y * TILE + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  h.putImageData(img, 0, 0);
  h.lineCap = 'round';
  for (let k = 0; k < 2200; k++) {
    const x = r() * TILE;
    const y = r() * TILE;
    const len = 6 + r() ** 2 * 60;
    const a = r() * Math.PI * 2;
    h.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.12 + r() * 0.2})` : `rgba(0,0,0,${0.08 + r() * 0.14})`;
    h.lineWidth = 0.6 + r() * 1.4;
    for (const ox of [-TILE, 0, TILE])
      for (const oy of [-TILE, 0, TILE]) {
        h.beginPath();
        h.moveTo(x + ox, y + oy);
        h.quadraticCurveTo(x + ox + Math.cos(a) * len * 0.5 + (r() - 0.5) * 10, y + oy + Math.sin(a) * len * 0.5, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        h.stroke();
      }
  }
  const hd = h.getImageData(0, 0, TILE, TILE).data;
  const H = (x, y) => hd[(((y + TILE) % TILE) * TILE + ((x + TILE) % TILE)) * 4] / 255;
  const nc = document.createElement('canvas');
  nc.width = nc.height = TILE;
  const nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(TILE, TILE);
  const k = 2.2;
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * k;
      const dy = (H(x, y + 1) - H(x, y - 1)) * k;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const o = (y * TILE + x) * 4;
      nimg.data[o] = (-dx * inv * 0.5 + 0.5) * 255;
      nimg.data[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      nimg.data[o + 2] = (inv * 0.5 + 0.5) * 255;
      nimg.data[o + 3] = 255;
    }
  nctx.putImageData(nimg, 0, 0);
  NORMAL = new THREE.CanvasTexture(nc);
  NORMAL.wrapS = NORMAL.wrapT = THREE.RepeatWrapping;
  NORMAL.colorSpace = THREE.NoColorSpace;
  NORMAL.anisotropy = 8;
  // Colour grain: multiply layer (near-white with mottling and fibres).
  const gc = document.createElement('canvas');
  gc.width = gc.height = 512;
  const g = gc.getContext('2d');
  const gi = g.createImageData(512, 512);
  const m1 = lattice(6, 9);
  const m2 = lattice(48, 10);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const v = 238 + (m1(x * 2, y * 2) - 0.5) * 26 + (m2(x * 2, y * 2) - 0.5) * 18 + (r() - 0.5) * 10;
      const o = (y * 512 + x) * 4;
      gi.data[o] = Math.min(255, v + 6);
      gi.data[o + 1] = Math.min(255, v + 3);
      gi.data[o + 2] = v;
      gi.data[o + 3] = 255;
    }
  g.putImageData(gi, 0, 0);
  GRAIN = gc;
}

export const paperNormal = () => NORMAL;
export const paperGrain = () => GRAIN;

/**
 * A sheet of card.
 * @param o.bounds [x0, y0, x1, y1] in world units around the card's origin (pivot)
 * @param o.draw   (ctx) => void — draws in world units, y up, origin at pivot
 * @param o.px     texture pixels per world unit
 * @param o.back   colour of the reverse, or false for none
 * @param o.bevel  cut-edge bevel strength (0–1)
 * @param o.grain  colour mottling strength (0–1)
 * @param o.seg    [sx, sy] geometry segments (for bending)
 */
export function card(o) {
  const T0 = performance.now();
  const g = cardInner(o);
  const dt = performance.now() - T0;
  if (dt > 300) console.warn(`slow card ${dt.toFixed(0)}ms bounds=${o.bounds.map((v) => v.toFixed(1))} px=${(o.px ?? 420).toFixed(0)} tex=${g.paper.tex.image.width}x${g.paper.tex.image.height}`);
  return g;
}

function cardInner(o) {
  const [x0, y0, x1, y1] = o.bounds;
  const w = x1 - x0;
  const h = y1 - y0;
  let px = o.px ?? 420;
  const maxPx = o.maxTex ?? 2048;
  px = Math.min(px, maxPx / w, maxPx / h);
  const cw = Math.max(4, Math.ceil(w * px));
  const ch = Math.max(4, Math.ceil(h * px));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.setTransform(cw / w, 0, 0, -ch / h, (-x0 * cw) / w, (y1 * ch) / h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  o.draw(ctx, { px, w, h });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  finishPaper(c, o.grain ?? 1, o.bevel ?? 1, px);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const nrm = NORMAL.clone();
  nrm.needsUpdate = true;
  nrm.repeat.set(w / PAPER_TILE_WORLD, h / PAPER_TILE_WORLD);
  const [sx, sy] = o.seg ?? [1, 1];
  const geo = new THREE.PlaneGeometry(w, h, sx, sy);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  const common = {
    roughness: o.roughness ?? 0.92,
    metalness: o.metalness ?? 0,
    alphaTest: 0.5,
    alphaToCoverage: true,
    normalMap: nrm,
    normalScale: new THREE.Vector2(o.normal ?? 0.55, o.normal ?? 0.55),
  };
  const group = new THREE.Group();
  const lit = o.glowThrough ? { emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: o.glowThrough } : {};
  const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ ...common, map: tex, side: o.back ? THREE.FrontSide : THREE.DoubleSide, ...lit, ...(o.material || {}) }));
  front.castShadow = o.cast ?? true;
  front.receiveShadow = o.receive ?? true;
  front.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  group.add(front);
  if (o.back) {
    const bc = document.createElement('canvas');
    bc.width = cw;
    bc.height = ch;
    const b = bc.getContext('2d');
    b.drawImage(c, 0, 0);
    b.globalCompositeOperation = 'source-in';
    b.fillStyle = o.back;
    b.fillRect(0, 0, cw, ch);
    b.globalCompositeOperation = 'multiply';
    b.drawImage(GRAIN, 0, 0, cw, ch);
    b.globalCompositeOperation = 'destination-in';
    b.drawImage(c, 0, 0);
    b.globalCompositeOperation = 'source-over';
    const btex = new THREE.CanvasTexture(bc);
    btex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ ...common, map: btex, side: THREE.BackSide }));
    back.castShadow = false;
    back.receiveShadow = o.receive ?? true;
    group.add(back);
  }
  // Not userData: three.js deep-copies userData through JSON on every clone().
  group.paper = { tex, geo, front, w, h, bounds: o.bounds };
  return group;
}

/** Mottle the dye and bevel the cut edges of a drawn sheet, in place. */
export function finishPaper(c, grain = 1, bevel = 1, px = 400) {
  const cw = c.width;
  const ch = c.height;
  const ctx = c.getContext('2d');
  // Keep the pristine cut-out: every later pass is masked back to it.
  const mask = document.createElement('canvas');
  mask.width = cw;
  mask.height = ch;
  mask.getContext('2d').drawImage(c, 0, 0);
  if (grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = grain;
    const s = Math.max(1, (px * PAPER_TILE_WORLD) / 512);
    for (let y = 0; y < ch; y += 512 * s) for (let x = 0; x < cw; x += 512 * s) ctx.drawImage(GRAIN, x, y, 512 * s, 512 * s);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.globalAlpha = 1;
    ctx.drawImage(mask, 0, 0);
    ctx.restore();
  }
  if (bevel > 0) {
    // Cut edge: a hairline of paper core catching the light on the top-left,
    // a hairline of shade on the bottom-right.
    const e = Math.max(1, Math.min(4, px / 260));
    const rim = (dx, dy, color, alpha) => {
      const t = document.createElement('canvas');
      t.width = cw;
      t.height = ch;
      const g = t.getContext('2d');
      g.drawImage(mask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(mask, dx, dy);
      ctx.save();
      ctx.globalAlpha = alpha * bevel;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.drawImage(t, 0, 0);
      ctx.restore();
    };
    rim(e, e, '#fffaf0', 0.55);
    rim(-e, -e, '#2a1a10', 0.3);
  }
}

/** Convenience: a card drawn from a single path-building function and fill. */
export function shapeCard(bounds, fill, pathFn, extra = {}) {
  return card({
    bounds,
    ...extra,
    draw: (ctx) => {
      ctx.beginPath();
      pathFn(ctx);
      ctx.fillStyle = fill;
      ctx.fill();
      if (extra.after) extra.after(ctx);
    },
  });
}
