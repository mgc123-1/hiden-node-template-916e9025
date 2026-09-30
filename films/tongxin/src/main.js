// Browser entry: builds the film and exposes renderFrame(t) / grab() for the
// offline renderer, or plays in real time against the soundtrack.

import { WIDTH, HEIGHT, FPS } from './core.js';
import { initPaper } from './engine/paper.js';
import { createRenderer } from './engine/renderer.js';
import { createFilm } from './film.js';

export async function boot(canvas) {
  const faces = [
    ['NotoSerifSC-400', 'NotoSerifSC-Regular.subset.ttf'],
    ['NotoSerifSC-900', 'NotoSerifSC-Black.subset.ttf'],
    ['IBMPlexMono', 'IBMPlexMono-Medium.ttf'],
  ];
  await Promise.all(
    faces.map(async ([family, file]) => {
      try {
        const f = new FontFace(family, `url(/films/tongxin/assets/fonts/${file})`);
        await f.load();
        document.fonts.add(f);
      } catch (e) {
        console.warn('font', family, e.message);
      }
    }),
  );
  initPaper();
  const R = createRenderer(canvas, WIDTH, HEIGHT);
  const film = createFilm();
  R.renderer.compile(film.update(0).scene, film.env.camera);

  /** Render time t with `samples` shutter subframes spread over `shutter` seconds. */
  window.renderFrame = (t, samples = 1, shutter = 0.5 / FPS) => {
    const times = samples <= 1 ? [t] : Array.from({ length: samples }, (_, k) => t - shutter / 2 + (shutter * (k + 0.5)) / samples);
    R.renderer.toneMappingExposure = film.env.exposure;
    R.frame(film.update, times, (ctx) => (film.overlay ? film.overlay(ctx, t) : false), film.grade ? film.grade(t) : {});
    return true;
  };
  window.grab = () => R.grab();
  window.film = film;
  return { R, film };
}
