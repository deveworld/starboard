"use client";

import { useMemo, useState } from "react";
import {
  BASIC_ENTRIES, BASIC_GROUPS, LAYER_FN_TITLE, QUANTUM_GROUPS, decode, describe, hex, label,
  layerKey, layerTap, macroKey, withMods, type Entry, type LayerFn, type Mod,
} from "./keycodes.ts";
import type { Step } from "./macro.ts";

const TABS = [
  ...BASIC_GROUPS.map((g) => ({ id: g.id, name: g.name })),
  ...QUANTUM_GROUPS.map((g) => ({ id: g.id, name: g.name })),
  { id: "shortcut", name: "Shortcut" },
  { id: "layers", name: "Layers" },
  { id: "macros", name: "Macros" },
];
const GROUPS = new Map([...BASIC_GROUPS, ...QUANTUM_GROUPS].map((g) => [g.id, g.entries]));

export function Cap({ entry, active, onPick }: { entry: Entry; active: boolean; onPick: (code: number) => void }) {
  return (
    <button
      type="button"
      title={`${entry.title} (${hex(entry.code)})`}
      onClick={() => onPick(entry.code)}
      className={`h-11 min-w-11 border px-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active ? "border-ink bg-ink text-paper" : "border-ink/25 bg-paper hover:border-ink hover:bg-card"
      }`}
    >
      {entry.label}
    </button>
  );
}

function BasicSelect({ value, onChange, id }: { value: number; onChange: (v: number) => void; id: string }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 border border-ink/30 bg-paper px-2 text-[14px] focus-visible:outline-2 focus-visible:outline-accent"
    >
      {BASIC_GROUPS.map((g) => (
        <optgroup key={g.id} label={g.name}>
          {g.entries.map((e) => (
            <option key={e.code} value={e.code}>
              {e.title === e.label ? e.label : `${e.label} — ${e.title}`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const MODS: { id: Mod; name: string }[] = [
  { id: "ctrl", name: "Ctrl" },
  { id: "shift", name: "Shift" },
  { id: "alt", name: "Alt" },
  { id: "gui", name: "Gui / Win / Cmd" },
];

function ShortcutBuilder({ current, onPick }: { current: number; onPick: (code: number) => void }) {
  const d = decode(current);
  const [mods, setMods] = useState<Mod[]>(d.kind === "mods" ? d.mods : ["ctrl"]);
  const [right, setRight] = useState(d.kind === "mods" ? d.right : false);
  const [key, setKey] = useState(d.kind === "mods" ? d.basic : BASIC_ENTRIES[2].code);
  const code = withMods(key, mods, right);
  const toggle = (m: Mod) => setMods((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));

  return (
    <div className="space-y-5">
      <p className="text-[14px] text-ink/70">Hold modifiers and a key with one press, like Ctrl+C.</p>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="mb-2 text-[13px] text-faint">Modifiers</legend>
        {MODS.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={mods.includes(m.id)} onChange={() => toggle(m.id)} className="accent-ink" />
            {m.name}
          </label>
        ))}
        <label className="flex items-center gap-2 text-[14px] text-faint">
          <input type="checkbox" checked={right} onChange={(e) => setRight(e.target.checked)} className="accent-ink" />
          Right-hand
        </label>
      </fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] text-faint" htmlFor="shortcut-key">
          Key
          <BasicSelect id="shortcut-key" value={key} onChange={setKey} />
        </label>
        <button
          type="button"
          disabled={mods.length === 0}
          onClick={() => onPick(code)}
          className="h-10 bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-accent disabled:opacity-40"
        >
          Assign {label(code)}
        </button>
      </div>
    </div>
  );
}

function LayerBuilder({ layers, current, onPick }: { layers: number; current: number; onPick: (code: number) => void }) {
  const d = decode(current);
  const [ltLayer, setLtLayer] = useState(d.kind === "lt" ? d.layer : 1);
  const [ltKey, setLtKey] = useState(d.kind === "lt" ? d.basic : BASIC_ENTRIES[0].code);
  const range = Array.from({ length: layers }, (_, i) => i);

  return (
    <div className="space-y-6">
      <table className="w-full text-[14px]">
        <tbody>
          {(Object.keys(LAYER_FN_TITLE) as LayerFn[]).map((fn) => (
            <tr key={fn} className="border-b border-ink/10">
              <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink/80">
                {LAYER_FN_TITLE[fn]}
              </th>
              <td className="py-2.5">
                <div className="flex justify-end gap-1.5">
                  {range.map((l) => {
                    const code = layerKey(fn, l);
                    return (
                      <button
                        key={l}
                        type="button"
                        title={`${fn}(${l})`}
                        onClick={() => onPick(code)}
                        className={`h-9 w-9 border font-mono text-[13px] focus-visible:outline-2 focus-visible:outline-accent ${
                          code === current ? "border-ink bg-ink text-paper" : "border-ink/25 hover:border-ink"
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <p className="text-[14px] text-ink/80">Tap for a key, hold for a layer</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-faint" htmlFor="lt-key">
            Tap
            <BasicSelect id="lt-key" value={ltKey} onChange={setLtKey} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-faint" htmlFor="lt-layer">
            Hold
            <select
              id="lt-layer"
              value={ltLayer}
              onChange={(e) => setLtLayer(Number(e.target.value))}
              className="h-10 border border-ink/30 bg-paper px-2 text-[14px]"
            >
              {range.map((l) => (
                <option key={l} value={l}>
                  Layer {l}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onPick(layerTap(ltLayer, ltKey))}
            className="h-10 bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-accent"
          >
            Assign {label(layerTap(ltLayer, ltKey))}
          </button>
        </div>
      </div>
    </div>
  );
}

export function macroSummary(steps: Step[]) {
  if (steps.length === 0) return "Empty";
  return steps
    .map((s) => (s.type === "text" ? `“${s.text}”` : s.type === "delay" ? `${s.ms} ms` : `${s.type} ${label(s.key)}`))
    .join(" ");
}

interface Props {
  current: number;
  layers: number;
  macros: Step[][];
  onPick: (code: number) => void;
}

export default function KeyPicker({ current, layers, macros, onPick }: Props) {
  const [tab, setTab] = useState(() => {
    const d = decode(current);
    if (d.kind === "mods") return "shortcut";
    if (d.kind === "layer" || d.kind === "lt") return "layers";
    if (d.kind === "macro") return "macros";
    if (d.kind === "named") return TABS.find((t) => GROUPS.get(t.id)?.some((e) => e.code === current))?.id ?? "basic";
    return "basic";
  });
  const [query, setQuery] = useState("");
  const [raw, setRaw] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return [...BASIC_GROUPS, ...QUANTUM_GROUPS]
      .flatMap((g) => g.entries)
      .filter((e) => e.label.toLowerCase().includes(q) || e.title.toLowerCase().includes(q));
  }, [query]);

  const rawCode = /^(0x)?[0-9a-f]{1,4}$/i.test(raw.trim()) ? parseInt(raw.trim().replace(/^0x/i, ""), 16) : null;

  return (
    <div>
      <label className="sr-only" htmlFor="key-search">
        Search keys
      </label>
      <input
        id="key-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search keys, e.g. volume, F13, page"
        className="h-11 w-full border border-ink/30 bg-paper px-3 text-[15px] placeholder:text-faint focus-visible:outline-2 focus-visible:outline-accent"
      />

      {results ? (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {results.length === 0 && <p className="text-[14px] text-faint">No key matches “{query}”.</p>}
          {results.map((e) => (
            <Cap key={e.code} entry={e} active={e.code === current} onPick={onPick} />
          ))}
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Key groups" className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-b border-ink/15">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 pb-2 pt-1 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                  tab === t.id ? "border-ink text-ink" : "border-transparent text-faint hover:text-ink"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="pt-5">
            {GROUPS.has(tab) && (
              <div className="flex flex-wrap gap-1.5">
                {GROUPS.get(tab)!.map((e) => (
                  <Cap key={e.code} entry={e} active={e.code === current} onPick={onPick} />
                ))}
              </div>
            )}
            {tab === "shortcut" && <ShortcutBuilder current={current} onPick={onPick} />}
            {tab === "layers" && <LayerBuilder layers={layers} current={current} onPick={onPick} />}
            {tab === "macros" && (
              <ul className="border-t border-ink/10">
                {macros.map((m, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onPick(macroKey(i))}
                      className={`grid w-full grid-cols-[3rem_1fr] items-baseline gap-3 border-b border-ink/10 py-2.5 text-left text-[14px] focus-visible:outline-2 focus-visible:outline-accent ${
                        macroKey(i) === current ? "bg-ink text-paper" : "hover:bg-card"
                      }`}
                    >
                      <span className="pl-2 font-mono">M{i}</span>
                      <span className={`truncate ${m.length ? "" : "text-faint"}`}>{macroSummary(m)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <details className="mt-7 text-[14px]">
        <summary className="cursor-pointer text-faint hover:text-ink">Enter a raw keycode</summary>
        <div className="mt-3 flex items-center gap-3">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="0x0004"
            aria-label="Raw keycode in hex"
            className="h-10 w-32 border border-ink/30 bg-paper px-2 font-mono text-[14px]"
          />
          <button
            type="button"
            disabled={rawCode === null}
            onClick={() => rawCode !== null && onPick(rawCode)}
            className="h-10 border border-ink px-4 font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            Assign {rawCode !== null ? describe(rawCode) : ""}
          </button>
        </div>
      </details>
    </div>
  );
}
