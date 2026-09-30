# 国庆动态影像 · National Day Motion Films

两支 30 秒的国庆祝福短片，画面与配乐全部由代码生成（three.js / Canvas 渲染，DSP 合成音乐）。

| 片名 | 说明 | 成片 |
|---|---|---|
| [**同心结 · The Knot of One Heart**](films/tongxin/README.md) | 根据分镜脚本改编：一根红绸从吐鲁番出发，经过圣湖、草原、苗岭、版纳、五十六个民族，在天安门上空编成一个同心结。剪纸世界里唯一的丝绸。 | [`films/tongxin/dist/tongxin-national-day-2026.mp4`](films/tongxin/dist/tongxin-national-day-2026.mp4) |
| [**经纬 · Warp & Weft**](films/jingwei/README.md) | 一根线穿过纸面，织出山河、归途与丰年，最后织成国旗。一镜到底。 | [`films/jingwei/dist/national-day-2026.mp4`](films/jingwei/dist/national-day-2026.mp4) |

```bash
npm install
npm run tongxin:audio && npm run tongxin:video
npm run jingwei:audio && npm run jingwei:video
```
