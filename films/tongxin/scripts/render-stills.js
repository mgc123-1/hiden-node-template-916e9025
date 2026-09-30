// Render frames at chosen times → out/stills (and optionally a contact sheet).
//   node films/tongxin/scripts/render-stills.js 0.2 1.0 2.5          (full-size PNGs)
//   node films/tongxin/scripts/render-stills.js --sheet 0.2 1 2 3    (one 4-up sheet)
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { serve, openFilm, renderRaw, FILM } from './lib.js';

const args = process.argv.slice(2);
const sheet = args.includes('--sheet');
const samples = Number((args.find((a) => a.startsWith('--samples=')) || '--samples=1').split('=')[1]);
const times = args.filter((a) => !a.startsWith('--')).map(Number);
const dir = path.join(FILM, 'out', 'stills');
fs.mkdirSync(dir, { recursive: true });
const { srv, port } = await serve();
const t0 = Date.now();
const { browser, page } = await openFilm(port);
console.log(`boot ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const toCanvas = (raw) => {
  const c = createCanvas(1920, 1080);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(1920, 1080);
  img.data.set(raw);
  ctx.putImageData(img, 0, 0);
  return c;
};
if (sheet) {
  const cols = 4, tw = 480, th = 270;
  const sc = createCanvas(tw * cols, th * Math.ceil(times.length / cols));
  const sx = sc.getContext('2d');
  for (let k = 0; k < times.length; k++) {
    const s = Date.now();
    const c = toCanvas(await renderRaw(page, times[k], samples));
    sx.drawImage(c, (k % cols) * tw, Math.floor(k / cols) * th, tw, th);
    sx.fillStyle = 'rgba(0,0,0,.55)'; sx.fillRect((k % cols) * tw, Math.floor(k / cols) * th, 70, 18);
    sx.fillStyle = '#fff'; sx.font = '13px sans-serif'; sx.fillText(times[k].toFixed(2), (k % cols) * tw + 4, Math.floor(k / cols) * th + 13);
    process.stdout.write(`${times[k]}s ${Date.now() - s}ms  `);
  }
  fs.writeFileSync(path.join(dir, 'sheet.png'), sc.toBuffer('image/png'));
  console.log('\nwrote out/stills/sheet.png');
} else {
  for (const t of times) {
    const s = Date.now();
    const c = toCanvas(await renderRaw(page, t, samples));
    const f = path.join(dir, `t${t.toFixed(3).padStart(6, '0')}.png`);
    fs.writeFileSync(f, c.toBuffer('image/png'));
    console.log(`${path.relative(FILM, f)}  ${Date.now() - s} ms`);
  }
}
await browser.close();
srv.close();
