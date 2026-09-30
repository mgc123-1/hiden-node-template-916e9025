// Renders the soundtrack to out/soundtrack.wav (48 kHz, 16-bit stereo) and a
// compact dist/soundtrack.m4a for the live preview.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { renderSoundtrack } from '../src/audio/mix.js';
import { writeWav } from '../src/audio/dsp.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const t0 = Date.now();
const bus = renderSoundtrack({ log: (s) => console.log('  ' + s) });
const out = path.join(root, 'out', 'soundtrack.wav');
writeWav(out, bus, fs);
// Opus for open browsers, AAC for Safari.
const webm = path.join(root, 'dist', 'soundtrack.webm');
const m4a = path.join(root, 'dist', 'soundtrack.m4a');
spawnSync(ffmpegInstaller.path, ['-y', '-v', 'error', '-i', out, '-c:a', 'libopus', '-b:a', '192k', webm], { stdio: 'inherit' });
spawnSync(ffmpegInstaller.path, ['-y', '-v', 'error', '-i', out, '-c:a', 'aac', '-b:a', '256k', m4a], { stdio: 'inherit' });
console.log(`wrote out/soundtrack.wav, dist/soundtrack.webm, dist/soundtrack.m4a in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
