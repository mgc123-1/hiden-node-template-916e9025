// Chase camera: sit a fixed distance behind and above a moving point, measured
// in space (not time), so fast silk never runs away from the lens.
export function chase(head, t, back = 3, up = 1, side = 0, dt = 0.04) {
  const a = head(t - dt);
  const b = head(t);
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  let dz = b[2] - a[2];
  const l = Math.hypot(dx, dy, dz) || 1;
  dx /= l;
  dy /= l;
  dz /= l;
  // Side vector: horizontal, perpendicular to travel.
  let sx = -dz;
  let sz = dx;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl;
  sz /= sl;
  return [b[0] - dx * back + sx * side, b[1] - dy * back + up, b[2] - dz * back + sz * side];
}
