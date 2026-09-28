// The whole film lives on one musical grid. Picture and sound both read time
// from here, so a cut can never drift off the beat.
//
// 96 BPM is a resting-but-moved heart rate: the heartbeat in bar 2 is the
// kick drum, literally.

export const BPM = 96;
export const BEAT = 60 / BPM; // 0.625 s
export const BAR = BEAT * 4; // 2.5 s
export const S16 = BEAT / 4; // 0.15625 s
export const S32 = BEAT / 8;
export const DURATION = 30;
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Time in seconds of (bar 1-based, beat 0-based, sixteenth 0-based). */
export const at = (bar, beat = 0, six = 0) => (bar - 1) * BAR + beat * BEAT + six * S16;

// Section map — the film's director's cut in one table.
export const SECTION = {
  hook: [0, at(2)], //          一根线   pierce · pull · pluck
  pulse: [at(2), at(3)], //     是心跳   the kick is the heartbeat
  land: [at(3), at(4)], //      是山河   melody pitch = mountain height
  home: [at(4), at(5)], //      是归途   rail ties on the hi-hats, a house on beat 4
  harvest: [at(5), at(6)], //   是丰年   one furrow per sixteenth
  many: [at(6), at(7)], //      千万根线 every pluck in the cascade is a new life-line
  weave: [at(7), at(8, 3)], //  织成经纬 each weft pass strums the warps like a zheng
  silence: [at(8, 3), at(9)], // one beat of nothing
  flag: [at(9), at(11)], //     锦绣     stars embroidered on the drop; 77 stitches for 77 years
  return: [at(11), at(12)], //  你我皆经纬 dive into one thread and ride it home
  end: [at(12), DURATION], //   国庆快乐 the same pluck that opened the film
};
