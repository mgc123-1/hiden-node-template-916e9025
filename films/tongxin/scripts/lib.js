// Shared: static server for the repo, a WebGL-capable headless Chromium page,
// and frame decoding.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const FILM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(FILM, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'audio/webm', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.json': 'application/json' };

export function serve(port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(REPO, url.endsWith('/') ? url + 'index.html' : url);
      if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

export const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function openFilm(port, { log = true, shots = process.env.SHOTS } = {}) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--js-flags=--max-old-space-size=8192'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  if (log) {
    page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log('  [page]', m.text()));
    page.on('pageerror', (e) => console.log('  [page error]', e.message));
  }
  await page.goto(`http://127.0.0.1:${port}/films/tongxin/web/index.html${shots ? `?shots=${shots}` : ''}`);
  await page.waitForFunction(() => window.ready || window.bootError, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.bootError);
  if (err) throw new Error(err);
  return { browser, page };
}

/** Render time t and return raw RGBA (top-down) as a Buffer. */
export async function renderRaw(page, t, samples = 1) {
  const b64 = await page.evaluate(([t, s]) => {
    window.renderFrame(t, s);
    return window.grab();
  }, [t, samples]);
  const raw = Buffer.from(b64, 'base64');
  // readPixels is bottom-up.
  const W = 1920 * 4;
  const out = Buffer.allocUnsafe(raw.length);
  for (let y = 0; y < 1080; y++) raw.copy(out, y * W, (1079 - y) * W, (1080 - y) * W);
  return out;
}
