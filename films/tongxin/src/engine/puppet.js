// Paper puppets: people cut from card and joined at pins.
//
// A puppet is a tree of card parts. Each joint is a Group placed at a pin;
// parts hang off joints with a small z-offset so layers overlap like real
// cut-outs. Joints rotate in the picture plane; the whole figure can turn
// about its vertical axis (showing the white back of the card mid-spin).

import * as THREE from 'three';
import { card } from './paper.js';

/**
 * @param parts [{ name, parent, pin: [x, y], z, bounds, draw, back?, px? }]
 *   pin: joint position in the parent joint's frame (world units)
 *   bounds/draw: the card, in the joint's own frame (origin at the pin)
 */
export function buildPuppet(parts, opts = {}) {
  const root = new THREE.Group();
  const joints = { root };
  const cards = {};
  for (const p of parts) {
    const j = new THREE.Group();
    j.name = p.name;
    j.position.set(p.pin[0], p.pin[1], p.z ?? 0);
    (joints[p.parent ?? 'root'] || root).add(j);
    joints[p.name] = j;
    if (p.draw) {
      const c = card({ bounds: p.bounds, draw: p.draw, back: p.back ?? opts.back ?? '#efe8dc', px: p.px ?? opts.px ?? 700, bevel: p.bevel ?? 1, grain: p.grain ?? 0.9, cast: true, receive: true, seg: p.seg });
      c.position.z = p.cz ?? 0;
      j.add(c);
      cards[p.name] = c;
    }
  }
  return { root, j: joints, cards };
}

/** Rotate a joint (radians, in-plane). */
export const rot = (pup, name, a) => {
  const j = pup.j[name];
  if (j) j.rotation.z = a;
};
