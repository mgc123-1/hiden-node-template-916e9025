// Analytic forward kinematics for the paper puppet (see art/people.js) — the
// silk's head needs the hand's position at arbitrary past times.

const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** World position of a hand given pose params, side 'A' | 'B', root position and scale. */
export function handWorld(p, side, rootPos = [0, 0, 0], scale = 1, sleeveLong = 0) {
  const sgn = side === 'A' ? -1 : 1;
  const lean = p.lean ?? 0;
  const a1 = lean + sgn * (side === 'A' ? p.raiseA ?? 0.12 : p.raiseB ?? 0.12);
  const a2 = a1 + sgn * (side === 'A' ? p.elbowA ?? 0.1 : p.elbowB ?? 0.1);
  const a3 = a2 + sgn * (side === 'A' ? p.wristA ?? 0 : p.wristB ?? 0);
  let [x, y] = rot(lean, sgn * 0.155, 0.405);
  let d = rot(a1, 0, -0.28);
  x += d[0];
  y += d[1];
  d = rot(a2, 0, -0.255 - sleeveLong * 0.3);
  x += d[0];
  y += d[1];
  d = rot(a3, 0, -0.06);
  x += d[0];
  y += d[1];
  x += p.hipX ?? 0;
  y += 0.96 + (p.hipY ?? 0);
  const z = 0.03;
  const turn = p.turn ?? 0;
  const wx = (x * Math.cos(turn) + z * Math.sin(turn)) * scale;
  const wz = (-x * Math.sin(turn) + z * Math.cos(turn)) * scale;
  return [rootPos[0] + wx, rootPos[1] + y * scale, rootPos[2] + wz];
}
