// Preview of the underglow: an approximation of QMK's rgblight effects,
// good enough to show what an effect looks like, not a cycle-exact simulation.

import { RGB_EFFECTS, RGB_LED_COUNT } from "./qmk.generated.ts";
import type { RgbState } from "./via.ts";

export type EffectName = (typeof RGB_EFFECTS)[number]["name"];

export const EFFECT_TITLE: Record<EffectName, string> = {
  STATIC_LIGHT: "Solid",
  BREATHING: "Breathing",
  RAINBOW_MOOD: "Rainbow",
  RAINBOW_SWIRL: "Rainbow swirl",
  SNAKE: "Snake",
  KNIGHT: "Knight rider",
  TWINKLE: "Twinkle",
};

export function effectOf(mode: number) {
  const e = RGB_EFFECTS.find((fx) => mode >= fx.mode && mode < fx.mode + fx.variants);
  return e ? { effect: e, variant: mode - e.mode } : null;
}

// HSV in QMK's 0-255 ranges to an sRGB triple
export function hsv(h: number, s: number, v: number): [number, number, number] {
  const hh = ((h / 255) * 360) % 360;
  const ss = s / 255;
  const vv = v / 255;
  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;
  const [r, g, b] =
    hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export const css = ([r, g, b]: [number, number, number], a = 1) => `rgb(${r} ${g} ${b} / ${a})`;

// Per-LED [hue, sat, level 0..1] at time t (seconds)
export function frame(rgb: RgbState, t: number): { hue: number; sat: number; level: number }[] {
  const leds = Array.from({ length: RGB_LED_COUNT }, () => ({ hue: rgb.hue, sat: rgb.sat, level: 1 }));
  if (rgb.effect === 0) return leds.map((l) => ({ ...l, level: 0 }));
  const fx = effectOf(rgb.effect);
  if (!fx) return leds;
  const speed = 1 + rgb.speed * 0.6;
  const v = fx.variant;
  switch (fx.effect.name) {
    case "BREATHING": {
      const period = [5, 3.5, 2.2, 1.4][v] ?? 3 / speed;
      const level = 0.15 + 0.85 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period));
      return leds.map((l) => ({ ...l, level }));
    }
    case "RAINBOW_MOOD": {
      const hue = (rgb.hue + t * [12, 24, 48][v] * speed) % 256;
      return leds.map((l) => ({ ...l, hue }));
    }
    case "RAINBOW_SWIRL": {
      const dir = v % 2 === 0 ? 1 : -1;
      const rate = [16, 16, 32, 32, 64, 64][v] * speed;
      return leds.map((l, i) => ({ ...l, hue: (rgb.hue + (i * 256) / leds.length + dir * t * rate + 2560) % 256 }));
    }
    case "SNAKE": {
      const dir = v % 2 === 0 ? 1 : -1;
      const head = Math.floor(t * [3, 3, 6, 6, 12, 12][v] * speed * dir);
      return leds.map((l, i) => {
        const d = (((head - i) % leds.length) + leds.length) % leds.length;
        return { ...l, level: d === 0 ? 1 : d === 1 ? 0.45 : 0.05 };
      });
    }
    case "KNIGHT": {
      const span = (leds.length - 1) * 2;
      const step = Math.floor(t * [4, 7, 12][v] * speed) % span;
      const pos = step < leds.length ? step : span - step;
      return leds.map((l, i) => ({ ...l, level: Math.abs(i - pos) === 0 ? 1 : Math.abs(i - pos) === 1 ? 0.35 : 0.05 }));
    }
    case "TWINKLE": {
      return leds.map((l, i) => {
        const phase = Math.sin(t * (1.3 + i * 0.37) * (1 + v * 0.4) + i * 2.1);
        return { ...l, level: phase > 0.6 ? (phase - 0.6) / 0.4 : 0.05 };
      });
    }
    default:
      return leds;
  }
}
