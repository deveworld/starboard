"use client";

import { useState } from "react";
import { RGB_EFFECTS } from "./qmk.generated.ts";
import { BASIC_ENTRIES } from "./keycodes.ts";
import { EFFECT_TITLE, css, effectOf, hsv } from "./lighting.ts";
import { encodeMacro, isPrintable, type Step } from "./macro.ts";
import { macroSummary } from "./KeyPicker.tsx";
import { OLED_LINE_CHARS, type OledMode, type OledState, type RgbState } from "./via.ts";

const btn =
  "h-10 px-5 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40";
export const primaryBtn = `${btn} bg-ink text-paper hover:bg-accent disabled:hover:bg-ink`;
export const secondaryBtn = `${btn} border border-ink/40 hover:border-ink`;

export function SaveBar({
  dirty, blocked, onSave, onRevert, what, live = true,
}: {
  dirty: boolean; blocked?: boolean; onSave: () => void; onRevert: () => void; what: string; live?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-5">
      <button type="button" className={primaryBtn} disabled={!dirty || blocked} onClick={onSave}>
        Save {what} to board
      </button>
      <button type="button" className={secondaryBtn} disabled={!dirty} onClick={onRevert}>
        Revert
      </button>
      <span className="text-[13px] text-faint" aria-live="polite">
        {!dirty
          ? "Matches what the board has saved."
          : live
            ? "Previewing on the board. Unsaved changes are lost when it restarts."
            : "Not on the board until you save."}
      </span>
    </div>
  );
}

function Slider({
  id, name, value, max, onChange, track, format,
}: {
  id: string; name: string; value: number; max: number; onChange: (v: number) => void; track?: string; format?: (v: number) => string;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-4">
      <label htmlFor={id} className="text-[14px] text-ink/80">
        {name}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-ink w-full"
        style={track ? ({ "--track": track } as React.CSSProperties) : undefined}
      />
      <output htmlFor={id} className="text-right font-mono text-[13px] tabular-nums text-faint">
        {format ? format(value) : value}
      </output>
    </div>
  );
}

const HUE_TRACK = `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => css(hsv((i / 12) * 255, 255, 255))).join(", ")})`;

export function LightingPanel({
  rgb, dirty, onChange, onSave, onRevert,
}: {
  rgb: RgbState; dirty: boolean; onChange: (patch: Partial<RgbState>) => void; onSave: () => void; onRevert: () => void;
}) {
  const current = effectOf(rgb.effect);
  const swatch = css(hsv(rgb.hue, rgb.sat, 255));

  return (
    <div>
      <fieldset>
        <legend className="text-[14px] text-ink/80">Effect</legend>
        <div className="mt-3 grid grid-cols-2 border-l border-t border-ink/15 sm:grid-cols-4">
          {[{ name: "OFF", mode: 0, variants: 1 } as const, ...RGB_EFFECTS].map((fx) => {
            const on = fx.mode === 0 ? rgb.effect === 0 : current?.effect.name === fx.name;
            return (
              <button
                key={fx.name}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ effect: fx.mode })}
                className={`border-b border-r border-ink/15 px-3 py-3 text-left text-[14px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                  on ? "bg-ink text-paper" : "hover:bg-card"
                }`}
              >
                {fx.name === "OFF" ? "Off" : EFFECT_TITLE[fx.name]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {current && current.effect.variants > 1 && (
        <div className="mt-5 flex items-center gap-4">
          <span className="text-[14px] text-ink/80">Variation</span>
          <div className="flex gap-1.5">
            {Array.from({ length: current.effect.variants }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={current.variant === i}
                onClick={() => onChange({ effect: current.effect.mode + i })}
                className={`h-9 w-9 border font-mono text-[13px] focus-visible:outline-2 focus-visible:outline-accent ${
                  current.variant === i ? "border-ink bg-ink text-paper" : "border-ink/25 hover:border-ink"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="h-6 w-6 border border-ink/30" style={{ background: swatch }} aria-hidden />
          <span className="text-[14px] text-faint">
            Color used by solid, breathing, snake, knight rider and twinkle
          </span>
        </div>
        <Slider id="hue" name="Hue" value={rgb.hue} max={255} onChange={(hue) => onChange({ hue })} track={HUE_TRACK} />
        <Slider
          id="sat"
          name="Saturation"
          value={rgb.sat}
          max={255}
          onChange={(sat) => onChange({ sat })}
          track={`linear-gradient(to right, ${css(hsv(rgb.hue, 0, 255))}, ${swatch})`}
        />
        <Slider
          id="bri"
          name="Brightness"
          value={rgb.brightness}
          max={255}
          onChange={(brightness) => onChange({ brightness })}
          format={(v) => `${Math.round((v / 255) * 100)}%`}
        />
        <Slider id="speed" name="Speed" value={rgb.speed} max={3} onChange={(speed) => onChange({ speed })} format={(v) => `${v + 1}/4`} />
      </div>

      <SaveBar dirty={dirty} onSave={onSave} onRevert={onRevert} what="lighting" />
    </div>
  );
}

const MODES: { mode: OledMode; name: string; hint: string }[] = [
  { mode: 0, name: "Status", hint: "Name, active layer and controller" },
  { mode: 1, name: "Your text", hint: "Four lines of up to 21 characters" },
  { mode: 2, name: "Off", hint: "Screen stays dark" },
];

export function DisplayPanel({
  oled, dirty, onChange, onSave, onRevert,
}: {
  oled: OledState; dirty: boolean; onChange: (next: OledState) => void; onSave: () => void; onRevert: () => void;
}) {
  const setLine = (i: number, text: string) => {
    const clean = [...text].filter((c) => isPrintable(c.charCodeAt(0))).join("").slice(0, OLED_LINE_CHARS);
    onChange({ ...oled, lines: oled.lines.map((l, j) => (j === i ? clean : l)) });
  };

  return (
    <div>
      <fieldset>
        <legend className="text-[14px] text-ink/80">Show</legend>
        <div className="mt-3 grid border-l border-t border-ink/15 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              aria-pressed={oled.mode === m.mode}
              onClick={() => onChange({ ...oled, mode: m.mode })}
              className={`border-b border-r border-ink/15 px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                oled.mode === m.mode ? "bg-ink text-paper" : "hover:bg-card"
              }`}
            >
              <span className="block text-[14px] font-medium">{m.name}</span>
              <span className={`block text-[13px] ${oled.mode === m.mode ? "text-paper/70" : "text-faint"}`}>{m.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {oled.mode === 1 && (
        <div className="mt-7 space-y-2">
          {oled.lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3">
              <label htmlFor={`line${i}`} className="text-[14px] text-ink/80">
                Line {i + 1}
              </label>
              <input
                id={`line${i}`}
                value={line}
                maxLength={OLED_LINE_CHARS}
                spellCheck={false}
                onChange={(e) => setLine(i, e.target.value)}
                className="h-10 border border-ink/30 bg-paper px-2 font-mono text-[14px] focus-visible:outline-2 focus-visible:outline-accent"
              />
              <span className="text-right font-mono text-[12px] tabular-nums text-faint">
                {line.length}/{OLED_LINE_CHARS}
              </span>
            </div>
          ))}
          <p className="pt-1 text-[13px] text-faint">Letters, digits and ASCII punctuation. Other characters are dropped.</p>
        </div>
      )}

      <SaveBar dirty={dirty} onSave={onSave} onRevert={onRevert} what="display" />
    </div>
  );
}

const STEP_TYPES: { type: Step["type"]; name: string }[] = [
  { type: "text", name: "Type text" },
  { type: "tap", name: "Tap key" },
  { type: "down", name: "Hold key" },
  { type: "up", name: "Release key" },
  { type: "delay", name: "Wait" },
];

function blank(type: Step["type"]): Step {
  if (type === "text") return { type, text: "" };
  if (type === "delay") return { type, ms: 100 };
  return { type, key: BASIC_ENTRIES[0].code };
}

export function MacroPanel({
  macros, bufferSize, dirty, onChange, onSave, onRevert,
}: {
  macros: Step[][]; bufferSize: number; dirty: boolean; onChange: (next: Step[][]) => void; onSave: () => void; onRevert: () => void;
}) {
  const [index, setIndex] = useState(0);
  const steps = macros[index] ?? [];
  const used = macros.reduce((n, m) => n + encodeMacro(m).length + 1, 0);
  const over = used > bufferSize - 1;

  const update = (next: Step[]) => onChange(macros.map((m, i) => (i === index ? next : m)));
  const setStep = (i: number, s: Step) => update(steps.map((x, j) => (j === i ? s : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-[9rem_1fr]">
        <ul className="flex flex-wrap gap-1.5 md:block md:space-y-0 md:border-t md:border-ink/10" aria-label="Macros">
          {macros.map((m, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`flex w-full items-baseline justify-between gap-2 border border-ink/15 px-2.5 py-2 text-left text-[14px] md:border-x-0 md:border-t-0 md:border-ink/10 focus-visible:outline-2 focus-visible:outline-accent ${
                  i === index ? "bg-ink text-paper" : "hover:bg-card"
                }`}
              >
                <span className="font-mono">M{i}</span>
                <span className={`hidden text-[12px] md:inline ${i === index ? "text-paper/60" : "text-faint"}`}>
                  {m.length ? `${m.length} step${m.length > 1 ? "s" : ""}` : "empty"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div>
          <p className="text-[14px] text-ink/70">
            Runs when a key assigned to <span className="font-mono">M{index}</span> is pressed. Assign it from the Keys tab.
          </p>
          <ol className="mt-4 border-t border-ink/10">
            {steps.length === 0 && <li className="border-b border-ink/10 py-4 text-[14px] text-faint">No steps yet. Add one below.</li>}
            {steps.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 border-b border-ink/10 py-2.5">
                <span className="w-6 font-mono text-[12px] text-faint">{i + 1}</span>
                <select
                  aria-label={`Step ${i + 1} action`}
                  value={s.type}
                  onChange={(e) => setStep(i, blank(e.target.value as Step["type"]))}
                  className="h-9 border border-ink/30 bg-paper px-1.5 text-[14px]"
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {s.type === "text" && (
                  <input
                    aria-label={`Step ${i + 1} text`}
                    value={s.text}
                    placeholder="Text to type"
                    onChange={(e) =>
                      setStep(i, { type: "text", text: [...e.target.value].filter((c) => isPrintable(c.charCodeAt(0))).join("") })
                    }
                    className="h-9 min-w-40 flex-1 border border-ink/30 bg-paper px-2 font-mono text-[14px]"
                  />
                )}
                {(s.type === "tap" || s.type === "down" || s.type === "up") && (
                  <select
                    aria-label={`Step ${i + 1} key`}
                    value={s.key}
                    onChange={(e) => setStep(i, { type: s.type, key: Number(e.target.value) })}
                    className="h-9 min-w-0 flex-1 border border-ink/30 bg-paper px-1.5 text-[14px]"
                  >
                    {BASIC_ENTRIES.map((e) => (
                      <option key={e.code} value={e.code}>
                        {e.title === e.label ? e.label : `${e.label} — ${e.title}`}
                      </option>
                    ))}
                  </select>
                )}
                {s.type === "delay" && (
                  <label className="flex flex-1 items-center gap-2 text-[14px] text-faint">
                    <input
                      aria-label={`Step ${i + 1} milliseconds`}
                      type="number"
                      min={0}
                      max={9999}
                      value={s.ms}
                      onChange={(e) => setStep(i, { type: "delay", ms: Math.max(0, Math.min(9999, Number(e.target.value))) })}
                      className="h-9 w-24 border border-ink/30 bg-paper px-2 font-mono text-[14px] text-ink"
                    />
                    ms
                  </label>
                )}
                <span className="ml-auto flex gap-1">
                  <button type="button" aria-label={`Move step ${i + 1} up`} onClick={() => move(i, -1)} className="h-9 w-8 text-faint hover:text-ink disabled:opacity-30" disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" aria-label={`Move step ${i + 1} down`} onClick={() => move(i, 1)} className="h-9 w-8 text-faint hover:text-ink disabled:opacity-30" disabled={i === steps.length - 1}>
                    ↓
                  </button>
                  <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => update(steps.filter((_, j) => j !== i))} className="h-9 w-8 text-faint hover:text-accent">
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {STEP_TYPES.map((t) => (
              <button key={t.type} type="button" className={`${secondaryBtn} h-9 px-3`} onClick={() => update([...steps, blank(t.type)])}>
                + {t.name}
              </button>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-faint">
            Preview: <span className="text-ink/80">{macroSummary(steps)}</span>
          </p>
          {steps.some((s) => s.type === "down") && !steps.some((s) => s.type === "up") && (
            <p className="mt-2 text-[13px] text-accent">This macro holds a key without releasing it; add a “Release key” step.</p>
          )}
        </div>
      </div>

      <p className={`mt-6 font-mono text-[12px] ${over ? "text-accent" : "text-faint"}`}>
        {used} / {bufferSize - 1} bytes of macro memory{over ? " — too long to save" : ""}
      </p>
      <SaveBar dirty={dirty} blocked={over} onSave={onSave} onRevert={onRevert} what="macros" live={false} />
    </div>
  );
}
