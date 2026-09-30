// Live preview: serves the repo and prints the film's URL.
//   node films/tongxin/scripts/serve.js [port]      → open …/web/index.html?play
// On a real GPU the film plays in real time against dist/soundtrack.m4a
// (click to start; ?t=24 starts at 24 s; ?shots=montage,beijing loads only those).
import { serve } from './lib.js';

const port = Number(process.argv[2] || 8173);
await serve(port);
console.log(`同心结 → http://127.0.0.1:${port}/films/tongxin/web/index.html?play`);
