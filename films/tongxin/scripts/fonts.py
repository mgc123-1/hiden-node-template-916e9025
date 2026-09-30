#!/usr/bin/env python3
"""Build the static, subset CJK serif faces used by the film.

Noto Serif SC ships as a 25 MB variable font. The film only needs a few dozen
glyphs, so we instance three weights and subset them to every non-ASCII
character that appears in src/ (plus basic punctuation). Re-run after editing
any on-screen copy:

    python3 scripts/fonts.py /path/to/NotoSerifSC[wght].ttf
"""
import pathlib, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/probe/NotoSerifSC[wght].ttf'

chars = set(' 0123456789.,:;!?-—·•—()[]°′″×+/%、。，：；！？「」『』《》“”')
for p in (ROOT / 'src').rglob('*.js'):
    chars |= set(ch for ch in p.read_text('utf8') if ord(ch) > 127)
text = ''.join(sorted(chars))
print(f'{len(chars)} glyphs:', ''.join(c for c in text if ord(c) > 0x2E80))

for weight, name in [(400, 'Regular'), (900, 'Black')]:
    vf = TTFont(src)
    inst = instantiateVariableFont(vf, {'wght': weight}, inplace=False)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(inst)
    out = ROOT / 'assets' / 'fonts' / f'NotoSerifSC-{name}.subset.ttf'
    inst.save(out)
    print(out.name, out.stat().st_size, 'bytes')
