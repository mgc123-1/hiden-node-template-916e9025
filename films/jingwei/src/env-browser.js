// Browser rendering environment for the live preview.
export const createCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
export const Path2DCtor = window.Path2D;

export async function loadFonts(base = '../assets/fonts/') {
  const faces = [
    ['NotoSerifSC-400', 'NotoSerifSC-Regular.subset.ttf'],
    ['NotoSerifSC-600', 'NotoSerifSC-SemiBold.subset.ttf'],
    ['NotoSerifSC-900', 'NotoSerifSC-Black.subset.ttf'],
    ['IBMPlexMono', 'IBMPlexMono-Medium.ttf'],
  ];
  await Promise.all(
    faces.map(async ([family, file]) => {
      const f = new FontFace(family, `url(${base}${file})`);
      await f.load();
      document.fonts.add(f);
    }),
  );
}
