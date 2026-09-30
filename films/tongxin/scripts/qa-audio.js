// QA: spectrogram + waveform of out/soundtrack.wav with the bar/beat grid.
import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { BAR, BEAT, DURATION } from '../src/core.js';

const wav = fs.readFileSync('out/soundtrack.wav');
const SR = wav.readUInt32LE(24);
const n = (wav.length - 44) / 4;
const mono = new Float32Array(n);
for (let i = 0; i < n; i++) mono[i] = (wav.readInt16LE(44 + i * 4) + wav.readInt16LE(46 + i * 4)) / 65536;

function fft(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(ang * k), s = Math.sin(ang * k);
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * c - im[i + k + len / 2] * s;
        const vi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      }
    }
  }
}

const W = 3000, SH = 700, WH = 260;
const c = createCanvas(W, SH + WH);
const ctx = c.getContext('2d');
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, W, SH + WH);
const F = 4096;
const img = ctx.createImageData(W, SH);
const fmin = 30, fmax = 16000;
for (let x = 0; x < W; x++) {
  const center = Math.floor((x / W) * n);
  const re = new Float64Array(F), im = new Float64Array(F);
  for (let i = 0; i < F; i++) {
    const s = center - F / 2 + i;
    re[i] = s >= 0 && s < n ? mono[s] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / F)) : 0;
  }
  fft(re, im);
  for (let y = 0; y < SH; y++) {
    const f = fmin * (fmax / fmin) ** (1 - y / SH);
    const b = Math.round((f / SR) * F);
    const mag = Math.hypot(re[b], im[b]) / (F / 4);
    const db = 20 * Math.log10(mag + 1e-9);
    const v = Math.max(0, Math.min(1, (db + 90) / 80));
    const o = (y * W + x) * 4;
    img.data[o] = 255 * Math.min(1, v * 1.6);
    img.data[o + 1] = 255 * Math.max(0, v * 1.6 - 0.5);
    img.data[o + 2] = 255 * Math.max(0, v * 2 - 1.2) + 60 * v;
    img.data[o + 3] = 255;
  }
}
ctx.putImageData(img, 0, 0);
// Waveform (peak per column).
ctx.fillStyle = '#9cf';
for (let x = 0; x < W; x++) {
  const a = Math.floor((x / W) * n), b = Math.floor(((x + 1) / W) * n);
  let pk = 0;
  for (let i = a; i < b; i++) pk = Math.max(pk, Math.abs(mono[i]));
  const h = pk * WH;
  ctx.fillRect(x, SH + WH / 2 - h / 2, 1, h);
}
// Grid.
for (let t = 0; t <= DURATION + 1e-6; t += BEAT) {
  const x = (t / DURATION) * W;
  const isBar = Math.abs(t / BAR - Math.round(t / BAR)) < 1e-6;
  ctx.fillStyle = isBar ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, 0, isBar ? 2 : 1, SH + WH);
  if (isBar) {
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(String(Math.round(t / BAR) + 1), x + 4, 24);
  }
}
for (const f of [100, 1000, 10000]) {
  const y = SH * (1 - Math.log(f / fmin) / Math.log(fmax / fmin));
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(0, y, W, 1);
  ctx.fillText(`${f}Hz`, 4, y - 4);
}
fs.writeFileSync('out/qa-audio.png', c.toBuffer('image/png'));
console.log('wrote out/qa-audio.png');
