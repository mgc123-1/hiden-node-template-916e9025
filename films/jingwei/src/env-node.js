// Node rendering environment: Skia canvas + the film's fonts.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = (f) => path.join(root, 'assets', 'fonts', f);
GlobalFonts.registerFromPath(font('NotoSerifSC-Regular.subset.ttf'), 'NotoSerifSC-400');
GlobalFonts.registerFromPath(font('NotoSerifSC-SemiBold.subset.ttf'), 'NotoSerifSC-600');
GlobalFonts.registerFromPath(font('NotoSerifSC-Black.subset.ttf'), 'NotoSerifSC-900');
GlobalFonts.registerFromPath(font('IBMPlexMono-Medium.ttf'), 'IBMPlexMono');

export { createCanvas, Path2D, root };
