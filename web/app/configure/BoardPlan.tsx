"use client";

import { useEffect, useMemo, useState } from "react";
import { FONT } from "./qmk.generated.ts";
import { CASE, CASE_ORIGIN, ENCODER, KEYCAP, KEYS, LEDS, OLED_ACTIVE, OLED_MODULE } from "./geometry.ts";
import { frame, hsv, css } from "./lighting.ts";
import { OLED_LINE_CHARS, OLED_LINES, type RgbState } from "./via.ts";

export type Target = { kind: "key"; row: number; col: number } | { kind: "turn"; clockwise: boolean };

export const sameTarget = (a: Target | null, b: Target) =>
  !!a &&
  a.kind === b.kind &&
  (a.kind === "key" && b.kind === "key" ? a.row === b.row && a.col === b.col : a.kind === "turn" && b.kind === "turn" && a.clockwise === b.clockwise);

// Lit OLED pixels as one path, in 128x32 pixel units
function oledPath(lines: string[]) {
  let d = "";
  for (let row = 0; row < OLED_LINES; row++) {
    const text = (lines[row] ?? "").slice(0, OLED_LINE_CHARS);
    for (let col = 0; col < text.length; col++) {
      const c = text.charCodeAt(col);
      if (c < 0x20 || c > 0x7e) continue;
      for (let x = 0; x < 6; x++) {
        const bits = FONT[(c - 0x20) * 6 + x];
        for (let y = 0; y < 8; y++) if (bits & (1 << y)) d += `M${col * 6 + x} ${row * 8 + y}h.86v.86h-.86z`;
      }
    }
  }
  return d;
}

function capFont(text: string) {
  const n = text.length;
  return n <= 2 ? 4.2 : n <= 4 ? 3.3 : n <= 6 ? 2.7 : n <= 9 ? 2.1 : 1.7;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function useClock(running: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return t;
}

interface Props {
  labels: string[]; // per matrix index row * 3 + col
  titles: string[];
  turnLabels: [string, string]; // [counter-clockwise, clockwise]
  rgb: RgbState;
  oled: { off: boolean; lines: string[] };
  selected: Target | null;
  onSelect?: (t: Target) => void;
}

export default function BoardPlan({ labels, titles, turnLabels, rgb, oled, selected, onSelect }: Props) {
  const reduced = usePrefersReducedMotion();
  const animated = rgb.effect > 1 && !reduced;
  const t = useClock(animated);
  const leds = frame(rgb, animated ? t : 0);
  const pixels = useMemo(() => oledPath(oled.off ? [] : oled.lines), [oled]);
  const brightness = 0.35 + 0.65 * (rgb.brightness / 255);

  const keyAt = (row: number, col: number) => labels[row * 3 + col] ?? "";
  const interactive = !!onSelect;
  const press = ENCODER.press;

  const hit = (target: Target, title: string) =>
    interactive
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": title,
          "aria-pressed": sameTarget(selected, target),
          onClick: () => onSelect!(target),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect!(target);
            }
          },
          className: "cursor-pointer outline-none [&:focus-visible>.cap]:stroke-accent [&:focus-visible>.cap]:[stroke-width:0.6]",
        }
      : {};

  const r = ENCODER.knob;
  // Half of the knob's ring: outer arc top -> bottom, inner arc back up
  const knobArc = (clockwise: boolean) =>
    `M${ENCODER.x} ${ENCODER.y - r} A${r} ${r} 0 0 ${clockwise ? 1 : 0} ${ENCODER.x} ${ENCODER.y + r} ` +
    `L${ENCODER.x} ${ENCODER.y + 3.2} A3.2 3.2 0 0 ${clockwise ? 0 : 1} ${ENCODER.x} ${ENCODER.y - 3.2} Z`;

  return (
    <svg
      viewBox={`${CASE_ORIGIN.x - 7} ${CASE_ORIGIN.y - 9} ${CASE.w + 14} ${CASE.h + 16}`}
      className="block h-auto w-full select-none"
      role="group"
      aria-label="Starboard, top view"
    >
      <defs>
        {leds.map((l, i) => {
          const c = hsv(l.hue, l.sat, 255);
          return (
            <radialGradient id={`glow${i}`} key={i}>
              <stop offset="0%" stopColor={css(c, Math.min(1, l.level * brightness))} />
              <stop offset="100%" stopColor={css(c, 0)} />
            </radialGradient>
          );
        })}
      </defs>

      {/* dimension: case width */}
      <g className="text-ink/45" stroke="currentColor" strokeWidth={0.15}>
        <path d={`M${CASE_ORIGIN.x} ${CASE_ORIGIN.y - 5}h${CASE.w}M${CASE_ORIGIN.x} ${CASE_ORIGIN.y - 6.5}v3M${CASE_ORIGIN.x + CASE.w} ${CASE_ORIGIN.y - 6.5}v3`} />
      </g>
      <text x={CASE_ORIGIN.x + CASE.w / 2} y={CASE_ORIGIN.y - 6.2} textAnchor="middle" className="fill-faint font-mono" fontSize={2.3}>
        83.8
      </text>

      {/* case */}
      <rect
        x={CASE_ORIGIN.x}
        y={CASE_ORIGIN.y}
        width={CASE.w}
        height={CASE.h}
        rx={CASE.r}
        className="fill-card stroke-ink"
        strokeWidth={0.3}
      />

      {/* underglow sits beneath the caps */}
      {LEDS.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y - 3} rx={13} ry={11} fill={`url(#glow${i})`} />
      ))}

      {/* OLED window */}
      <rect
        x={OLED_MODULE.x}
        y={OLED_MODULE.y}
        width={OLED_MODULE.w}
        height={OLED_MODULE.h}
        className="fill-none stroke-ink/30"
        strokeWidth={0.15}
        strokeDasharray="0.8 0.6"
      />
      <rect x={OLED_ACTIVE.x - 1.2} y={OLED_ACTIVE.y - 1.6} width={OLED_ACTIVE.w + 2.4} height={OLED_ACTIVE.h + 3.2} fill="#07090b" />
      <path
        d={pixels}
        fill="#dfe9f2"
        transform={`translate(${OLED_ACTIVE.x} ${OLED_ACTIVE.y}) scale(${OLED_ACTIVE.w / 128} ${OLED_ACTIVE.h / 32})`}
      />

      <g className="pointer-events-none">
        <circle cx={OLED_MODULE.x + 2.2} cy={OLED_MODULE.y - 2.6} r={1.7} className="fill-none stroke-ink/60" strokeWidth={0.15} />
        <text x={OLED_MODULE.x + 2.2} y={OLED_MODULE.y - 2.5} textAnchor="middle" dominantBaseline="middle" fontSize={2} className="fill-ink/70 font-mono">
          A
        </text>
      </g>

      {/* keys */}
      {KEYS.map((k) => {
        const target: Target = { kind: "key", row: k.row, col: k.col };
        const on = sameTarget(selected, target);
        const text = keyAt(k.row, k.col);
        return (
          <g key={`${k.row}${k.col}`} {...hit(target, `${k.name} key: ${titles[k.row * 3 + k.col] ?? text}`)}>
            <rect
              className={`cap ${on ? "fill-ink stroke-ink" : "fill-paper stroke-ink/70 hover:fill-card"}`}
              x={k.x - KEYCAP / 2}
              y={k.y - KEYCAP / 2}
              width={KEYCAP}
              height={KEYCAP}
              rx={1.4}
              strokeWidth={on ? 0.5 : 0.25}
            />
            <rect
              className="pointer-events-none fill-none stroke-ink/15"
              x={k.x - KEYCAP / 2 + 2.2}
              y={k.y - KEYCAP / 2 + 1.6}
              width={KEYCAP - 4.4}
              height={KEYCAP - 5.4}
              rx={1}
              strokeWidth={0.2}
            />
            <text
              x={k.x}
              y={k.y - 0.4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={capFont(text)}
              className={`pointer-events-none font-medium ${on ? "fill-paper" : "fill-ink"}`}
            >
              {text}
            </text>
          </g>
        );
      })}

      {/* encoder: left half turns counter-clockwise, right half clockwise, centre presses */}
      {([false, true] as const).map((cw) => {
        const target: Target = { kind: "turn", clockwise: cw };
        const on = sameTarget(selected, target);
        return (
          <g key={String(cw)} {...hit(target, `Turn ${cw ? "right" : "left"}: ${turnLabels[cw ? 1 : 0]}`)}>
            <path
              d={knobArc(cw)}
              className={`cap ${on ? "fill-ink stroke-ink" : "fill-paper stroke-ink/70 hover:fill-card"}`}
              strokeWidth={0.25}
            />
            <text
              x={ENCODER.x + (cw ? 4.9 : -4.9)}
              y={ENCODER.y + 0.2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={2.6}
              className={`pointer-events-none ${on ? "fill-paper" : "fill-ink/60"}`}
            >
              {cw ? "↻" : "↺"}
            </text>
          </g>
        );
      })}
      <g {...hit({ kind: "key", row: press.row, col: press.col }, `Encoder press: ${titles[press.row * 3 + press.col]}`)}>
        <circle
          cx={ENCODER.x}
          cy={ENCODER.y}
          r={3}
          className={`cap ${
            sameTarget(selected, { kind: "key", row: press.row, col: press.col })
              ? "fill-accent stroke-accent"
              : "fill-ink/85 stroke-ink hover:fill-ink"
          }`}
          strokeWidth={0.25}
        />
      </g>

      {/* encoder bindings, drawn as callouts to the right of the knob */}
      <g className="pointer-events-none fill-ink font-mono" fontSize={2.1}>
        <text x={ENCODER.x + r + 2.4} y={ENCODER.y - 3.6}>
          ↻ {turnLabels[1]}
        </text>
        <text x={ENCODER.x + r + 2.4} y={ENCODER.y + 0.8}>
          ● {keyAt(press.row, press.col)}
        </text>
        <text x={ENCODER.x + r + 2.4} y={ENCODER.y + 5.2}>
          ↺ {turnLabels[0]}
        </text>
      </g>
    </svg>
  );
}
