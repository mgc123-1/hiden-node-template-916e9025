// Renders chosen frames (and a contact sheet) for review.
//   node scripts/render-stills.js 1.3 5.2 20.1      → out/stills/t01.300.png ...
//   node scripts/render-stills.js --sheet           → out/stills/sheet.png
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, Path2D, root } from '../src/env-node.js';
import { createScene } from '../src/scene.js';
import { WIDTH, HEIGHT } from '../src/core/time.js';

const args = process.argv.slice(2);
const dir = path.join(root, 'out', 'stills');
fs.mkdirSync(dir, { recursive: true });
const scene = createScene({ createCanvas, Path2D });
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');
const debug = args.includes('--debug');

if (args.includes('--sheet')) {
  const times = args.filter((a) => !a.startsWith('--')).map(Number);
  const T = times.length ? times : [0.4, 0.9, 1.5, 2.2, 3.3, 5.5, 6.8, 8.6, 9.8, 11.4, 13.0, 13.9, 14.6, 15.8, 17.9, 19.1, 19.6, 20.3, 21.0, 22.2, 23.7, 25.4, 26.3, 27.0, 27.7, 28.4, 29.1, 29.9];
  const cols = 4;
  const tw = 480, th = 270;
  const sheet = createCanvas(tw * cols, th * Math.ceil(T.length / cols));
  const sc = sheet.getContext('2d');
  T.forEach((t, k) => {
    const t0 = Date.now();
    scene.render(ctx, t, { debug: true });
    sc.drawImage(canvas, (k % cols) * tw, Math.floor(k / cols) * th, tw, th);
    process.stdout.write(`${t}s ${Date.now() - t0}ms  `);
  });
  fs.writeFileSync(path.join(dir, 'sheet.png'), sheet.toBuffer('image/png'));
  console.log('\nwrote out/stills/sheet.png');
} else {
  for (const a of args.filter((a) => !a.startsWith('--'))) {
    const t = Number(a);
    const t0 = Date.now();
    scene.render(ctx, t, { debug });
    const f = path.join(dir, `t${t.toFixed(3).padStart(6, '0')}.png`);
    fs.writeFileSync(f, canvas.toBuffer('image/png'));
    console.log(`${path.relative(root, f)}  ${Date.now() - t0} ms`);
  }
}
