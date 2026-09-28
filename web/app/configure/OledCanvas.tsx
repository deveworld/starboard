"use client";

import { useEffect, useRef } from "react";
import { FONT } from "./qmk.generated.ts";
import { OLED_LINE_CHARS, OLED_LINES } from "./via.ts";

const W = 128;
const H = 32;
const GLYPH_W = 6;
const LIT = "#dfe9f2";

// Renders text exactly as the SSD1306 will: QMK's 6x8 glcdfont on a 128x32 grid
export default function OledCanvas({ lines, off, scale = 3 }: { lines: string[]; off?: boolean; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const px = scale * dpr;
    canvas.width = W * px;
    canvas.height = H * px;
    ctx.fillStyle = "#07090b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (off) return;
    ctx.fillStyle = LIT;
    const gap = px >= 5 ? px * 0.15 : 0; // hint of the pixel grid once pixels are large
    for (let row = 0; row < OLED_LINES; row++) {
      const text = (lines[row] ?? "").slice(0, OLED_LINE_CHARS);
      for (let col = 0; col < text.length; col++) {
        const c = text.charCodeAt(col);
        if (c < 0x20 || c > 0x7e) continue;
        for (let x = 0; x < GLYPH_W; x++) {
          const bits = FONT[(c - 0x20) * GLYPH_W + x];
          for (let y = 0; y < 8; y++) {
            if (bits & (1 << y)) ctx.fillRect((col * GLYPH_W + x) * px, (row * 8 + y) * px, px - gap, px - gap);
          }
        }
      }
    }
  }, [lines, off, scale]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={off ? "Display off" : `Display: ${lines.filter(Boolean).join(" / ") || "blank"}`}
      style={{ width: W * scale, height: H * scale, imageRendering: "pixelated" }}
      className="block max-w-full"
    />
  );
}
