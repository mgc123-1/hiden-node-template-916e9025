// Renders the film: 1920×1080, 60 fps, H.264 + AAC → dist/tongxin-national-day-2026.mp4
//
// Each worker is a headless Chromium rendering a contiguous run of frames
// (so every shot's textures are uploaded once per worker) and piping raw RGBA
// to its own x264. Motion blur is a real 180° shutter: each frame is the
// average of several sub-frame renders across the shutter interval, with more
// sub-frames where the picture moves fastest.
//
//   node films/tongxin/scripts/render-video.js [--workers 2] [--from 0 --to 30] [--crf 17] [--samples 1]

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { serve, openFilm, renderRaw, FILM } from './lib.js';
import { FPS, DURATION, WIDTH as W, HEIGHT as H } from '../src/core.js';

const FFMPEG = ffmpegInstaller.path;
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

// Sub-frames per frame: fast moments get more.
const FAST = [
  [0.35, 1.9, 4], // the DUM and the spin
  [3.6, 4.4, 4], // the flick
  [5.1, 5.8, 3], // into the cloud
  [8.85, 9.4, 4], // silk wipe
  [10.9, 11.3, 3], // lasso flick
  [12.5, 13.2, 3], // the rain curtain
  [16.3, 17.0, 3], // up and into the montage
  [22.45, 22.95, 3], // the curtain lifts
  [23.7, 24.9, 3], // the vortex, the curtain, the flight
  [26.2, 26.7, 3], // the hit
];
export function samplesAt(t, base) {
  if (t >= 28.125) return 1; // the frozen frame
  for (const [a, b, n] of FAST) if (t >= a && t < b) return Math.max(base, n);
  return base;
}

const main = async () => {
  const workers = Number(arg('workers', 2));
  const f0 = Math.round(Number(arg('from', 0)) * FPS);
  const f1 = Math.round(Number(arg('to', DURATION)) * FPS);
  const crf = arg('crf', '17');
  const base = Number(arg('samples', 2));
  const tmp = path.join(FILM, 'out', 'segments');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  // Balance by cost: frames weighted by their sub-frame count.
  const cost = [];
  for (let f = f0; f < f1; f++) cost.push(samplesAt(f / FPS, base) + 0.6);
  const total = cost.reduce((a, b) => a + b, 0);
  const jobs = [];
  let acc = 0;
  let a = f0;
  for (let f = f0; f < f1; f++) {
    acc += cost[f - f0];
    if (acc >= (total / workers) * (jobs.length + 1) || f === f1 - 1) {
      jobs.push({ a, b: f + 1, file: path.join(tmp, `seg_${String(a).padStart(5, '0')}.mp4`) });
      a = f + 1;
    }
  }
  console.log(`${f1 - f0} frames, ${jobs.length} workers, base ${base} sub-frames`);
  const { srv, port } = await serve();
  const t0 = Date.now();
  await Promise.all(jobs.map((job, k) => renderSegment(port, job, k, crf, base, t0)));
  srv.close();
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, jobs.map((j) => `file '${j.file}'`).join('\n'));
  const video = path.join(tmp, 'video.mp4');
  await run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const audio = path.join(FILM, 'out', 'soundtrack.wav');
  fs.mkdirSync(path.join(FILM, 'dist'), { recursive: true });
  const full = f0 === 0 && f1 === DURATION * FPS;
  const out = path.join(FILM, 'dist', full ? 'tongxin-national-day-2026.mp4' : `preview_${f0}_${f1}.mp4`);
  const aArgs = fs.existsSync(audio) ? ['-ss', String(f0 / FPS), '-t', String((f1 - f0) / FPS), '-i', audio] : [];
  await run(FFMPEG, [
    '-y', '-v', 'error', '-i', video, ...aArgs,
    '-map', '0:v', ...(aArgs.length ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000'] : []),
    '-c:v', 'copy', '-movflags', '+faststart', '-shortest', out,
  ]);
  console.log(`wrote ${path.relative(FILM, out)} in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
};

async function renderSegment(port, job, k, crf, base, t0) {
  const { browser, page } = await openFilm(port, { log: k === 0 });
  const ff = spawn(FFMPEG, [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-tune', 'film',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-g', '120', job.file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = job.b - job.a;
  for (let f = job.a; f < job.b; f++) {
    const t = f / FPS;
    const raw = await renderRaw(page, t, samplesAt(t, base));
    if (!ff.stdin.write(raw)) await new Promise((r) => ff.stdin.once('drain', r));
    const i = f - job.a + 1;
    if (i % 60 === 0 || i === n) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  [w${k}] ${i}/${n} frames (t=${t.toFixed(2)})  ${(el / 60).toFixed(1)} min`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('exit', r));
  await browser.close();
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exit ${c}`))));
  });
}

if (process.argv[1] && process.argv[1].endsWith('render-video.js')) await main();
