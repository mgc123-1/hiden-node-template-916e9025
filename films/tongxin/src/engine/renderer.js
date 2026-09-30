// Renderer: HDR multisampled pass → shutter accumulation → output (tone map,
// lens falloff) → typography overlay. Deterministic: a frame is a pure
// function of time.

import * as THREE from 'three';

export function createRenderer(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const depthTex = new THREE.DepthTexture(W, H);
  depthTex.type = THREE.FloatType;
  const rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: depthTex });
  const rtDof = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const rtAcc = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);

  const accMat = new THREE.MeshBasicMaterial({ map: rtScene.texture, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false });

  // Depth of field: scatter-as-gather over a golden-angle disk. Each tap only
  // contributes if its own circle of confusion reaches the centre pixel, so
  // foreground blur spills over sharp background and not the other way round.
  const dofMat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rtScene.texture },
      tDepth: { value: depthTex },
      uNear: { value: 0.05 },
      uFar: { value: 2000 },
      uFocus: { value: 3 },
      uAperture: { value: 0 },
      uMaxBlur: { value: 18 },
      uRes: { value: new THREE.Vector2(W, H) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tDepth;
      uniform float uNear, uFar, uFocus, uAperture, uMaxBlur; uniform vec2 uRes;
      varying vec2 vUv;
      float linz(float d) { return uNear * uFar / (uFar - d * (uFar - uNear)); }
      float coc(vec2 uv) {
        float z = linz(texture2D(tDepth, uv).r);
        return clamp(uAperture * abs(1.0 / uFocus - 1.0 / z) * uRes.y, 0.0, uMaxBlur);
      }
      void main() {
        vec3 c0 = texture2D(tColor, vUv).rgb;
        if (uAperture <= 0.0) { gl_FragColor = vec4(c0, 1.0); return; }
        float r0 = coc(vUv);
        vec3 acc = c0; float wsum = 1.0;
        const int N = 40;
        float ga = 2.39996323;
        for (int i = 1; i < N; i++) {
          float fi = float(i);
          float rad = uMaxBlur * sqrt(fi / float(N));
          vec2 off = vec2(cos(fi * ga), sin(fi * ga)) * rad / uRes;
          vec2 uv = vUv + off;
          float ri = coc(uv);
          float w = smoothstep(rad - 1.5, rad, max(ri, min(r0, ri + 1.5)));
          acc += texture2D(tColor, uv).rgb * w;
          wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const dofScene = new THREE.Scene();
  const accScene = new THREE.Scene();
  accScene.add(new THREE.Mesh(quadGeo, accMat));
  dofScene.add(new THREE.Mesh(quadGeo, dofMat));

  const outMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: rtAcc.texture }, uVignette: { value: 0.16 }, uLift: { value: 0 }, uGain: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tSrc; uniform float uVignette; uniform float uLift; uniform float uGain;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tSrc, vUv).rgb * uGain;
        vec2 d = (vUv - 0.5) * vec2(1.0, 0.72);
        c *= 1.0 - uVignette * smoothstep(0.18, 0.62, length(d));
        c = mix(c, vec3(1.0), uLift);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const outScene = new THREE.Scene();
  outScene.add(new THREE.Mesh(quadGeo, outMat));

  // Typography overlay: a 2-D canvas composited after tone mapping.
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = W;
  overlayCanvas.height = H;
  const overlayTex = new THREE.CanvasTexture(overlayCanvas);
  overlayTex.colorSpace = THREE.SRGBColorSpace;
  const ovMat = new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const ovScene = new THREE.Scene();
  ovScene.add(new THREE.Mesh(quadGeo, ovMat));

  /**
   * @param update  (t) => { scene, camera } — prepares the world for time t
   * @param times   shutter sample times (length ≥ 1)
   * @param drawOverlay (ctx2d) => boolean — returns true if anything was drawn
   */
  function frame(update, times, drawOverlay, grade = {}) {
    renderer.setRenderTarget(rtAcc);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    accMat.opacity = 1 / times.length;
    for (const t of times) {
      const { scene, camera } = update(t);
      renderer.setRenderTarget(rtScene);
      renderer.render(scene, camera);
      const dof = camera.userData.dof;
      if (dof && dof.aperture > 0) {
        Object.assign(dofMat.uniforms.uNear, { value: camera.near });
        dofMat.uniforms.uFar.value = camera.far;
        dofMat.uniforms.uFocus.value = dof.focus;
        dofMat.uniforms.uAperture.value = dof.aperture;
        dofMat.uniforms.uMaxBlur.value = dof.maxBlur ?? 18;
        renderer.setRenderTarget(rtDof);
        renderer.render(dofScene, quadCam);
        accMat.map = rtDof.texture;
      } else accMat.map = rtScene.texture;
      renderer.setRenderTarget(rtAcc);
      renderer.autoClear = false;
      renderer.render(accScene, quadCam);
      renderer.autoClear = true;
    }
    outMat.uniforms.uVignette.value = grade.vignette ?? 0.16;
    outMat.uniforms.uLift.value = grade.lift ?? 0;
    outMat.uniforms.uGain.value = grade.gain ?? 1;
    renderer.setRenderTarget(null);
    renderer.render(outScene, quadCam);
    const octx = overlayCanvas.getContext('2d');
    octx.clearRect(0, 0, W, H);
    if (drawOverlay && drawOverlay(octx)) {
      overlayTex.needsUpdate = true;
      renderer.autoClear = false;
      renderer.render(ovScene, quadCam);
      renderer.autoClear = true;
    }
  }

  const px = new Uint8Array(W * H * 4);
  function grab() {
    const gl = renderer.getContext();
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < px.length; i += CH) s += String.fromCharCode.apply(null, px.subarray(i, i + CH));
    return btoa(s);
  }

  return { renderer, frame, grab };
}
