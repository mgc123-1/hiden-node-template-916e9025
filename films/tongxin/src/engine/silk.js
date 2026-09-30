// Silk: the one fabric in a paper world.
//
// A ribbon is a strip whose body retraces, exactly, the path its head has
// flown — a snake, not a spline — with travelling waves and twist layered on
// top. Shading: deep dyed red, anisotropic sheen across the weave, and real
// translucency (the sun through the silk lights it from behind).

import * as THREE from 'three';
import { clamp, TAU } from '../core.js';

const RED = new THREE.Color('#a3081c');
let WEAVE = null;

/** Satin weave normal map: long warp floats along the ribbon, fine weft ticks. */
function weaveNormal() {
  if (WEAVE) return WEAVE;
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const h = new Float32Array(N * N);
  // Warp threads run along u (x); each float is 5 picks long, offset satin-wise.
  const threads = 32;
  const picks = 40;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const ty = (y / N) * threads;
      const row = Math.floor(ty);
      const fy = ty - row;
      const tx = (x / N) * picks + ((row * 2) % 5);
      const fx = tx % 5;
      const across = Math.sin(Math.PI * fy);
      const along = fx < 4.4 ? 1 : 0.35;
      h[y * N + x] = across * along;
    }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)];
      const dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
      const k = 1.4;
      const inv = 1 / Math.hypot(dx * k, dy * k, 1);
      const o = (y * N + x) * 4;
      img.data[o] = (-dx * k * inv * 0.5 + 0.5) * 255;
      img.data[o + 1] = (dy * k * inv * 0.5 + 0.5) * 255;
      img.data[o + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  WEAVE = new THREE.CanvasTexture(c);
  WEAVE.wrapS = WEAVE.wrapT = THREE.RepeatWrapping;
  WEAVE.colorSpace = THREE.NoColorSpace;
  WEAVE.anisotropy = 8;
  return WEAVE;
}

export function silkMaterial(color = RED, length = 8, width = 0.15) {
  const weave = weaveNormal().clone();
  weave.needsUpdate = true;
  weave.repeat.set(length / 0.012, width / 0.012);
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color('#ff7b6b'),
    anisotropy: 0.9,
    anisotropyRotation: 0,
    specularIntensity: 1.0,
    specularColor: new THREE.Color('#ffe2d6'),
    normalMap: weave,
    normalScale: new THREE.Vector2(0.35, 0.35),
    side: THREE.DoubleSide,
  });
  // Translucency: light arriving on the far side of the sheet shows through,
  // warmed by the dye. Added after direct lighting.
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
      {
        vec3 tN = normalize(normal);
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
          float back = max(0.0, -dot(tN, directionalLights[i].direction));
          float view = pow(max(0.0, dot(normalize(-vViewPosition), -directionalLights[i].direction)), 2.0);
          reflectedLight.directDiffuse += directionalLights[i].color * diffuseColor.rgb * vec3(1.25, 0.55, 0.42) * back * (0.32 + 0.9 * view);
        }
      }
      #endif`,
    );
  };
  return m;
}

/**
 * @param o.head    (t) => [x, y, z]   head position in world
 * @param o.length  ribbon length (world units)
 * @param o.width   ribbon width
 * @param o.born    time the ribbon starts to exist (tail anchored at head(born))
 * @param o.wave    { amp, len, freq }   lateral travelling wave (grows toward the tail)
 * @param o.twist   { base, perLen, amp, len, freq }
 */
export class Ribbon {
  constructor(o) {
    this.o = { segments: 180, history: 7, dt: 1 / 240, width: 0.16, length: 9, born: -Infinity, ...o };
    const n = this.o.segments;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array((n + 1) * 2 * 3);
    this.nrm = new Float32Array((n + 1) * 2 * 3);
    const uv = new Float32Array((n + 1) * 2 * 2);
    for (let i = 0; i <= n; i++) {
      uv.set([i / n, 0, i / n, 1], i * 4);
    }
    const idx = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.tan = new Float32Array((n + 1) * 2 * 4);
    geo.setAttribute('tangent', new THREE.BufferAttribute(this.tan, 4));
    geo.setIndex(idx);
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, o.material ?? silkMaterial(o.color, this.o.length, this.o.width));
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.K = Math.ceil(this.o.history / this.o.dt);
    this.tx = new Float64Array(this.K + 1);
    this.ty = new Float64Array(this.K + 1);
    this.tz = new Float64Array(this.K + 1);
    this.ts = new Float64Array(this.K + 1);
  }

  /** Recompute the strip for time t. `up` is the preferred ribbon plane normal hint. */
  update(t, up = [0, 1, 0]) {
    const o = this.o;
    const visible = t >= o.born && (o.dies === undefined || t < o.dies);
    this.mesh.visible = visible;
    if (!visible) return;
    // 1. Sample the head's history back from t.
    const K = this.K;
    let cum = 0;
    let k = 0;
    let px, py, pz;
    for (; k <= K; k++) {
      const tk = Math.max(o.born, t - k * o.dt);
      const [x, y, z] = o.head(tk);
      if (k > 0) cum += Math.hypot(x - px, y - py, z - pz);
      this.tx[k] = x;
      this.ty[k] = y;
      this.tz[k] = z;
      this.ts[k] = cum;
      px = x;
      py = y;
      pz = z;
      if (cum >= o.length || tk <= o.born) break;
    }
    const last = Math.min(k, K);
    // 2. Resample at even arc length; bunch at the anchor if history is short.
    const n = o.segments;
    const L = o.length;
    const pts = this._pts || (this._pts = new Float64Array((n + 1) * 3));
    let j = 0;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * L;
      while (j < last && this.ts[j + 1] < s) j++;
      let x, y, z;
      if (j >= last) {
        x = this.tx[last];
        y = this.ty[last];
        z = this.tz[last];
      } else {
        const d = this.ts[j + 1] - this.ts[j];
        const u = d > 1e-9 ? (s - this.ts[j]) / d : 0;
        x = this.tx[j] + (this.tx[j + 1] - this.tx[j]) * u;
        y = this.ty[j] + (this.ty[j + 1] - this.ty[j]) * u;
        z = this.tz[j] + (this.tz[j + 1] - this.tz[j]) * u;
      }
      if (o.deform) {
        const d = o.deform(s / L, x, y, z, t);
        x = d[0];
        y = d[1];
        z = d[2];
      }
      pts[i * 3] = x;
      pts[i * 3 + 1] = y;
      pts[i * 3 + 2] = z;
    }
    // 3. Frames, waves, twist, and the strip itself.
    const wv = { amp: 0.18, len: 2.6, freq: 1.3, ...(o.wave || {}) };
    const tw = { base: 0, perLen: 0.9, amp: 1.1, len: 3.2, freq: 0.9, ...(o.twist || {}) };
    const hw = o.width / 2;
    let prevN = null;
    for (let i = 0; i <= n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n, i + 1);
      let tx = pts[b * 3] - pts[a * 3];
      let ty = pts[b * 3 + 1] - pts[a * 3 + 1];
      let tz = pts[b * 3 + 2] - pts[a * 3 + 2];
      let tl = Math.hypot(tx, ty, tz);
      if (tl < 1e-9) {
        tx = 1;
        ty = 0;
        tz = 0;
        tl = 1;
      }
      tx /= tl;
      ty /= tl;
      tz /= tl;
      // N = normalize(T × up), falling back gracefully and staying continuous.
      let nx = ty * up[2] - tz * up[1];
      let ny = tz * up[0] - tx * up[2];
      let nz = tx * up[1] - ty * up[0];
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 0.15 && prevN) {
        nx = prevN[0];
        ny = prevN[1];
        nz = prevN[2];
        nl = 1;
      } else if (nl < 1e-6) {
        nx = 0;
        ny = 0;
        nz = 1;
        nl = 1;
      }
      nx /= nl;
      ny /= nl;
      nz /= nl;
      if (prevN && nx * prevN[0] + ny * prevN[1] + nz * prevN[2] < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      prevN = [nx, ny, nz];
      const bx = ny * tz - nz * ty;
      const by = nz * tx - nx * tz;
      const bz = nx * ty - ny * tx;
      const s = (i / n) * L;
      const grow = clamp(s / (L * 0.35)) * (o.waveScale ?? 1);
      const ph = TAU * (s / wv.len - wv.freq * t);
      const lat = wv.amp * grow * Math.sin(ph);
      const ver = wv.amp * 0.6 * grow * Math.sin(ph * 0.73 + 1.3);
      const cx = pts[i * 3] + nx * lat + bx * ver;
      const cy = pts[i * 3 + 1] + ny * lat + by * ver;
      const cz = pts[i * 3 + 2] + nz * lat + bz * ver;
      const th = tw.base + tw.perLen * s + tw.amp * Math.sin(TAU * (s / tw.len - tw.freq * t)) * clamp(s / 1.2);
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const wx = nx * c + bx * sn;
      const wy = ny * c + by * sn;
      const wz = nz * c + bz * sn;
      // Swallow-tail cut at the free end.
      const endU = o.swallow ? clamp((L - s) / (o.width * 0.9)) : 1;
      const ha = hw;
      const pinch = o.swallow ? 1 - (1 - endU) * 0.0 : 1;
      this.pos.set([cx + wx * ha * pinch, cy + wy * ha * pinch, cz + wz * ha * pinch], i * 6);
      this.pos.set([cx - wx * ha * pinch, cy - wy * ha * pinch, cz - wz * ha * pinch], i * 6 + 3);
      // Face normal = T × W.
      const fx = ty * wz - tz * wy;
      const fy = tz * wx - tx * wz;
      const fz = tx * wy - ty * wx;
      this.nrm.set([fx, fy, fz, fx, fy, fz], i * 6);
      this.tan.set([tx, ty, tz, 1, tx, ty, tz, 1], i * 8);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
    this.geo.attributes.tangent.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }
}
