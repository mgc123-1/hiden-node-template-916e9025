// Typography and the final mount. Quiet, small, exact: a name for each people
// as we meet them, a counter of threads, and at the end the frozen frame is
// mounted on paper like a family photograph with its caption and seal.

import { at, clamp, ease, prog, lerp, S16 } from './core.js';
import { FLICK } from './scenes/turpan.js';
import { TOUCH } from './scenes/tibet.js';
import { FLICK as FLICK3 } from './scenes/mongol.js';
import { NAMES, MONTAGE, silkCount } from './scenes/montage.js';
import { FREEZE } from './scenes/beijing.js';

const W = 1920;
const H = 1080;
const PAPER = '#fbf6ea';
const INK = '#2a1c16';
const SILK = '#a3081c';

const CAPTIONS = [
  [0.7, 3.45, '维吾尔族', '吐鲁番', 'UYGHUR — TURPAN, XINJIANG'],
  [4.35, 7.2, '藏族', '圣湖', 'TIBETAN — THE SACRED LAKE, XIZANG'],
  [8.25, 11.0, '蒙古族', '呼伦贝尔', 'MONGOL — HULUNBUIR, INNER MONGOLIA'],
  [12.95, 14.25, '苗族', '黔东南', 'MIAO — QIANDONGNAN, GUIZHOU'],
  [14.45, 15.75, '傣族', '西双版纳', 'DAI — XISHUANGBANNA, YUNNAN'],
  [15.85, 16.6, '大熊猫', '成都', 'GIANT PANDA — CHENGDU, SICHUAN'],
];

function nameTag(ctx, t, t0, t1, zh, place, en, o = {}) {
  if (t < t0 || t > t1) return false;
  const inDur = o.quick ? 0.04 : 0.28;
  const outDur = o.quick ? 0 : 0.2;
  const a = ease.outCubic(clamp((t - t0) / inDur));
  const b = outDur ? 1 - ease.inCubic(clamp((t - (t1 - outDur)) / outDur)) : 1;
  const x = 104;
  const y = H - 118;
  ctx.save();
  ctx.globalAlpha = b;
  // The silk tab.
  ctx.fillStyle = SILK;
  ctx.fillRect(x - 26, y - 44, 5, 44 + 30 * a);
  // Wipe-on reveal.
  ctx.beginPath();
  ctx.rect(x - 4, y - 70, 900 * a, 120);
  ctx.clip();
  ctx.shadowColor = 'rgba(20,10,5,0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = PAPER;
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 46px NotoSerifSC-900';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText(zh, x, y);
  const zw = ctx.measureText(zh).width;
  if (place) {
    ctx.font = '400 24px NotoSerifSC-400';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillText(place, x + zw + 18, y);
  }
  if (en) {
    ctx.font = '500 14px IBMPlexMono';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4.5px';
    ctx.globalAlpha = b * 0.82;
    ctx.fillText(en, x + 1, y + 30);
  }
  ctx.restore();
  return true;
}

// Silk count before the montage: one thread from the flick, then one per shot.
function earlyCount(t) {
  let n = 0;
  if (t >= FLICK - 0.1) n = 1;
  if (t >= TOUCH + 0.12) n = 2;
  if (t >= FLICK3 + 0.05) n = 3;
  if (t >= 13.62) n = 4;
  if (t >= 15.15) n = 5;
  return n;
}
function count(t) {
  return t < MONTAGE.T0 ? earlyCount(t) : silkCount(t);
}
let lastN = -1;
let lastChange = -10;
function counter(ctx, t) {
  if (t < FLICK - 0.1 || t > MONTAGE.END - 0.2) return false;
  const n = count(t);
  // Time since the count last changed (searched back, so frames stay pure).
  let since = 0;
  for (let k = 1; k <= 30; k++) {
    if (count(t - k / 120) !== n) break;
    since = k / 120;
  }
  void lastN;
  void lastChange;
  const fade = ease.outCubic(clamp((t - (FLICK - 0.1)) / 0.3)) * (1 - clamp((t - (MONTAGE.END - 0.45)) / 0.25));
  const x = W - 104;
  const y = 104;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.shadowColor = 'rgba(20,10,5,0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = PAPER;
  ctx.textAlign = 'right';
  ctx.font = '500 15px IBMPlexMono';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
  ctx.fillText('/ 56', x, y);
  const kick = 1 - ease.outCubic(clamp(since / 0.12));
  ctx.font = '500 44px IBMPlexMono';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 200, y - 48, 130, 58);
  ctx.clip();
  ctx.fillText(String(n).padStart(2, '0'), x - 74, y + 26 * kick);
  ctx.restore();
  ctx.font = '400 18px NotoSerifSC-400';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText('红绸', x, y - 32);
  ctx.fillStyle = SILK;
  ctx.fillRect(x - 164, y + 16, 164 * (n / 56), 3);
  ctx.globalAlpha = fade * 0.35;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x - 164 + 164 * (n / 56), y + 16, 164 * (1 - n / 56), 3);
  ctx.restore();
  return true;
}

function montageNames(ctx, t) {
  const { VIG, FLASH0, QUILT0, END } = MONTAGE;
  for (let k = 0; k < VIG.length; k++) {
    const v = VIG[k];
    if (t >= v.t0 && t < v.t1) {
      const [zh, en] = NAMES[5 + k];
      return nameTag(ctx, t, v.t0 + (k < 3 ? 0.05 : 0.0), v.t1, zh, null, en, { quick: k >= 3 });
    }
  }
  if (t >= FLASH0 && t < QUILT0) {
    const k = Math.min(15, Math.floor((t - FLASH0) / S16));
    const [zh, en] = NAMES[16 + k];
    return nameTag(ctx, t, FLASH0 + k * S16, FLASH0 + (k + 1) * S16, zh, null, en, { quick: true });
  }
  if (t >= QUILT0 && t < END) {
    // The roll call of everyone else, fast, then the sum of them all.
    const k = Math.floor(prog(t, QUILT0 + 0.1, QUILT0 + 1.0) * 24);
    if (t < QUILT0 + 1.05) {
      const [zh, en] = NAMES[Math.min(55, 32 + k)];
      return nameTag(ctx, t, QUILT0, QUILT0 + 1.05, zh, null, en, { quick: true });
    }
    return nameTag(ctx, t, QUILT0 + 1.05, END - 0.12, '五十六个民族', null, 'FIFTY-SIX PEOPLES — ONE FAMILY', { quick: false });
  }
  return false;
}

// ─── The end: the frozen frame, mounted ─────────────────────────────────────
const MOUNT0 = FREEZE + 0.06;
const MOUNT1 = FREEZE + 0.5;
export function grade(t) {
  if (t < MOUNT0) return {};
  const k = ease.inOutCubic(prog(t, MOUNT0, MOUNT1));
  return { frame: [lerp(1, 0.8, k), 0, lerp(0, 0.063, k)] };
}

function endCard(ctx, t) {
  if (t < MOUNT0 + 0.2) return false;
  const title = '祝祖国生日快乐';
  const t0 = MOUNT1 - 0.05;
  const x0 = 192;
  const base = 1012;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 66px NotoSerifSC-900';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
  let x = x0;
  for (let i = 0; i < title.length; i++) {
    const ch = title[i];
    const tc = t0 + i * S16;
    const w = ctx.measureText(ch).width;
    const a = clamp((t - tc) / 0.08);
    if (a > 0) {
      const s = lerp(1.18, 1, ease.outCubic(a));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x + w / 2, base - 22);
      ctx.scale(s, s);
      ctx.fillStyle = '#8e1b20';
      ctx.fillText(ch, -w / 2, 22);
      ctx.restore();
    }
    x += w;
  }
  // The seal, struck after the last character.
  const ts = t0 + title.length * S16 + 0.12;
  const sa = clamp((t - ts) / 0.06);
  if (sa > 0) {
    const s = lerp(1.35, 1, ease.outCubic(sa));
    const cx = x + 44;
    const cy = base - 30;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.rotate(-0.04);
    ctx.globalAlpha = 0.92 * sa;
    ctx.fillStyle = '#b3101f';
    ctx.fillRect(-34, -34, 68, 68);
    ctx.fillStyle = '#e9e1d2';
    ctx.font = '900 27px NotoSerifSC-900';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textAlign = 'center';
    ctx.fillText('同', 0, -4);
    ctx.fillText('心', 0, 26);
    // Worn edges of the stamp.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const rr = 30 + ((i * 7) % 5);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Colophon, right-aligned to the print.
  const ca = clamp((t - (t0 + 0.35)) / 0.35);
  if (ca > 0) {
    ctx.globalAlpha = ca;
    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    ctx.font = '400 24px NotoSerifSC-400';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillText('五十六个民族 · 一个同心结', 1728, base - 34);
    ctx.font = '500 15px IBMPlexMono';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.globalAlpha = ca * 0.75;
    ctx.fillText('1949 — 2026 · NATIONAL DAY · 同心结', 1728, base);
  }
  ctx.restore();
  return true;
}

export function overlay(ctx, t) {
  let any = false;
  for (const c of CAPTIONS) any = nameTag(ctx, t, ...c) || any;
  any = montageNames(ctx, t) || any;
  any = counter(ctx, t) || any;
  any = endCard(ctx, t) || any;
  return any;
}

export { at };
