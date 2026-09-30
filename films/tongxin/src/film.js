// The film: one scene graph, one camera, one sun. Each shot owns a set and
// drives the camera and light while it is active; shots change under cover
// (silk across the lens, cloud, rain) so the eye never sees a cut.

import * as THREE from 'three';
import { WIDTH, HEIGHT } from './core.js';
import { createTurpan } from './scenes/turpan.js';
import { createTibet } from './scenes/tibet.js';
import { createMongol } from './scenes/mongol.js';
import { createSouth } from './scenes/south.js';

export function createFilm() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.05, 2000);
  const sun = new THREE.DirectionalLight('#fff', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#fff', '#888', 1);
  scene.add(hemi);
  scene.fog = new THREE.Fog('#fff', 50, 300);

  const env = {
    scene,
    camera,
    light(o) {
      const c = new THREE.Vector3(...(o.shadowCenter ?? [0, 0, 0]));
      const dir = new THREE.Vector3(...o.sun).normalize();
      sun.position.copy(c).addScaledVector(dir, 40);
      sun.target.position.copy(c);
      sun.color.set(o.sunColor);
      sun.intensity = o.sunIntensity;
      const s = o.shadowSize ?? 10;
      Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 90 });
      sun.shadow.camera.updateProjectionMatrix();
      hemi.color.set(o.hemiSky);
      hemi.groundColor.set(o.hemiGround);
      hemi.intensity = o.hemiIntensity;
      scene.background = new THREE.Color(o.bg);
      scene.fog.color.set(o.fog[0]);
      scene.fog.near = o.fog[1];
      scene.fog.far = o.fog[2];
      env.exposure = o.exposure ?? 1;
    },
    exposure: 1,
  };

  const want = new URLSearchParams(location.search).get('shots');
  const builders = { turpan: createTurpan, tibet: createTibet, mongol: createMongol, south: createSouth };
  const shots = [];
  for (const [name, make] of Object.entries(builders)) {
    if (want && !want.split(',').includes(name)) continue;
    const t0 = performance.now();
    shots.push(make(env));
    console.warn(`built ${name} in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  }
  for (const s of shots) {
    s.group.visible = false;
    scene.add(s.group);
  }

  function update(t) {
    let active = shots[shots.length - 1];
    for (const s of shots) if (t >= s.start && t < s.end) active = s;
    for (const s of shots) s.group.visible = s === active;
    active.update(t);
    return { scene, camera };
  }

  return { update, env, shots };
}
