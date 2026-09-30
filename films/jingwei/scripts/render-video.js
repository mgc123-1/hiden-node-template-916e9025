// Renders the film: 1920×1080, 60 fps, H.264 + AAC → dist/national-day-2026.mp4
//
// Frames are rendered in parallel segments. Each frame gets a 180° shutter:
// when the picture moves fast on screen it is rendered as several sub-frames
// across the shutter interval and averaged (true motion blur, not a filter).
//
//   node scripts/render-video.js [--workers 4] [--from 0 --to 30] [--crf 18]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = ffmpegInstaller.path;
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

if (process.argv.includes('--worker')) await worker();
else await main();

async function main() {
  const { FPS, DURATION } = await import('../src/core/time.js');
  const workers = Number(arg('workers', Math.max(1, Math.min(os.cpus().length, 6))));
  const f0 = Math.round(Number(arg('from', 0)) * FPS);
  const f1 = Math.round(Number(arg('to', DURATION)) * FPS);
  const crf = arg('crf', '18');
  const segLen = 90;
  const tmp = path.join(root, 'out', 'segments');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const jobs = [];
  for (let a = f0; a < f1; a += segLen) jobs.push({ a, b: Math.min(f1, a + segLen), file: path.join(tmp, `seg_${String(a).padStart(5, '0')}.mp4`) });
  console.log(`${f1 - f0} frames, ${jobs.length} segments, ${workers} workers`);
  const t0 = Date.now();
  let done = 0;
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: workers }, () =>
      (async () => {
        while (queue.length) {
          const job = queue.shift();
          await new Promise((res, rej) => {
            const p = fork(fileURLToPath(import.meta.url), ['--worker', String(job.a), String(job.b), job.file, crf], { stdio: 'inherit' });
            p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`worker exit ${code}`))));
          });
          done++;
          const el = (Date.now() - t0) / 1000;
          console.log(`  segment ${done}/${jobs.length}  ${el.toFixed(0)} s elapsed`);
        }
      })(),
    ),
  );
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, jobs.map((j) => `file '${j.file}'`).join('\n'));
  const video = path.join(tmp, 'video.mp4');
  await run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const audio = path.join(root, 'out', 'soundtrack.wav');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const out = path.join(root, 'dist', f0 === 0 && f1 === DURATION * FPS ? 'national-day-2026.mp4' : `preview_${f0}_${f1}.mp4`);
  const aArgs = fs.existsSync(audio) ? ['-ss', String(f0 / FPS), '-t', String((f1 - f0) / FPS), '-i', audio] : [];
  await run(FFMPEG, [
    '-y', '-v', 'error', '-i', video, ...aArgs,
    '-map', '0:v', ...(aArgs.length ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000'] : []),
    '-c:v', 'copy', '-movflags', '+faststart', '-shortest', out,
  ]);
  console.log(`wrote ${path.relative(root, out)} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

async function worker() {
  const i = process.argv.indexOf('--worker');
  const a = Number(process.argv[i + 1]);
  const b = Number(process.argv[i + 2]);
  const file = process.argv[i + 3];
  const crf = process.argv[i + 4];
  const { createCanvas, Path2D } = await import('../src/env-node.js');
  const { createScene } = await import('../src/scene.js');
  const { FPS, WIDTH: W, HEIGHT: H } = await import('../src/core/time.js');
  const scene = createScene({ createCanvas, Path2D });
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const ff = spawn(FFMPEG, [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-tune', 'film',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-g', '120', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const acc = new Uint32Array(W * H * 4);
  const shutter = 0.5 / FPS;
  const motion = scene.motionAt;
  for (let f = a; f < b; f++) {
    const t = f / FPS;
    const px = motion(t, shutter);
    const n = Math.max(1, Math.min(28, Math.ceil(px / 5)));
    // A fresh buffer per frame: stdin.write() holds on to it until flushed.
    const out = Buffer.allocUnsafe(W * H * 4);
    if (n === 1) {
      scene.render(ctx, t);
      out.set(canvas.data());
    } else {
      acc.fill(0);
      for (let k = 0; k < n; k++) {
        scene.render(ctx, t - shutter / 2 + (shutter * (k + 0.5)) / n);
        const d = canvas.data();
        for (let p = 0; p < d.length; p++) acc[p] += d[p];
      }
      const half = n >> 1;
      for (let p = 0; p < out.length; p++) out[p] = ((acc[p] + half) / n) | 0;
    }
    if (!ff.stdin.write(out)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('exit', r));
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exit ${c}`))));
  });
}
