"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BoardPlan, { type Target } from "./BoardPlan.tsx";
import OledCanvas from "./OledCanvas.tsx";
import KeyPicker from "./KeyPicker.tsx";
import { DisplayPanel, LightingPanel, MacroPanel, primaryBtn, secondaryBtn } from "./Panels.tsx";
import { ENCODER, KEYS } from "./geometry.ts";
import { describe, hex, label } from "./keycodes.ts";
import { joinMacros, splitMacros, type Step } from "./macro.ts";
import {
  DemoTransport, HidTransport, MATRIX_COLS, OLED_LINES, Starboard, UnhandledError, reconnectHid, requestHid,
  type OledState, type RgbState,
} from "./via.ts";

const LAYER_NAMES = ["Base", "FN", "Layer 2", "Layer 3"];
const STATUS_LABELS = ["Layer: BASE", "Layer: FN", "Layer: 2", "Layer: 3"];
const RELEASES = "https://github.com/deveworld/starboard/raw/main/production/firmware.uf2";
const UDEV = `echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="5354", ATTRS{idProduct}=="0001", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/60-starboard.rules
sudo udevadm control --reload && sudo udevadm trigger`;

type Tab = "keys" | "lighting" | "display" | "macros";
const TABS: { id: Tab; name: string }[] = [
  { id: "keys", name: "Keys" },
  { id: "lighting", name: "Lighting" },
  { id: "display", name: "Display" },
  { id: "macros", name: "Macros" },
];

interface Snapshot {
  layers: number;
  keymap: number[][];
  encoders: [number, number][];
  macros: Step[][];
  macroBytes: number;
  rgb: RgbState;
  oled: OledState | null; // null: firmware without the OLED channel
}

async function readAll(sb: Starboard): Promise<Snapshot> {
  await sb.protocolVersion();
  const layers = await sb.layerCount();
  const keymap = await sb.readKeymap(layers);
  const encoders: [number, number][] = [];
  for (let l = 0; l < layers; l++) encoders.push([await sb.getEncoder(l, false), await sb.getEncoder(l, true)]);
  const count = await sb.macroCount();
  const macroBytes = await sb.macroBufferSize();
  const macros = splitMacros(await sb.readMacroBuffer(macroBytes), count);
  const rgb = await sb.getRgb();
  let oled: OledState | null = null;
  try {
    oled = await sb.getOled();
  } catch (e) {
    if (!(e instanceof UnhandledError)) throw e;
  }
  return { layers, keymap, encoders, macros, macroBytes, rgb, oled };
}

const json = (v: unknown) => JSON.stringify(v);

function message(e: unknown) {
  if (e instanceof DOMException && e.name === "NetworkError")
    return "The browser could not open Starboard. On Linux this usually means the udev rule below is missing.";
  return e instanceof Error ? e.message : String(e);
}

// Sends the latest value only, never queuing stale intermediate states
function useLatest<T>(send: (value: T) => Promise<void>, onError: (e: unknown) => void) {
  const pending = useRef<{ value: T } | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const push = useCallback(
    (value: T) => {
      pending.current = { value };
      if (running.current) return;
      running.current = (async () => {
        try {
          while (pending.current) {
            const { value: v } = pending.current;
            pending.current = null;
            await send(v);
          }
        } catch (e) {
          onError(e);
        } finally {
          running.current = null;
        }
      })();
    },
    [send, onError],
  );
  const flush = useCallback(async () => {
    while (running.current) await running.current;
  }, []);
  return { push, flush };
}

export default function Configurator() {
  const [hid, setHid] = useState<boolean | null>(null);
  const [board, setBoard] = useState<Starboard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [saved, setSaved] = useState<{ rgb: string; oled: string; macros: string }>({ rgb: "", oled: "", macros: "" });
  const [layer, setLayer] = useState(0);
  const [tab, setTab] = useState<Tab>("keys");
  const [selected, setSelected] = useState<Target | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fail = useCallback((e: unknown) => setError(message(e)), []);

  const open = useCallback(
    async (sb: Starboard, live: boolean) => {
      setBusy(live ? `Reading ${sb.transport.name}…` : null);
      setError(null);
      try {
        const snap = await readAll(sb);
        setData(snap);
        setSaved({ rgb: json(snap.rgb), oled: json(snap.oled), macros: json(snap.macros) });
        setBoard(live ? sb : null);
        setLayer(0);
      } catch (e) {
        fail(e);
        await sb.transport.close().catch(() => undefined);
      } finally {
        setBusy(null);
      }
    },
    [fail],
  );

  // Show the default layout straight away, and quietly reconnect to a board this browser already knows
  useEffect(() => {
    const supported = typeof navigator !== "undefined" && !!navigator.hid;
    setHid(supported);
    open(new Starboard(new DemoTransport()), false);
    if (!supported) return;
    reconnectHid()
      .then((t) => t && open(new Starboard(t), true))
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!navigator.hid || !(board?.transport instanceof HidTransport)) return;
    const device = board.transport.device;
    const onDisconnect = (e: HIDConnectionEvent) => {
      if (e.device !== device) return;
      setBoard(null);
      setError("Starboard was unplugged. Plug it back in and connect again.");
    };
    navigator.hid.addEventListener("disconnect", onDisconnect);
    return () => navigator.hid?.removeEventListener("disconnect", onDisconnect);
  }, [board]);

  const connect = async () => {
    setError(null);
    try {
      const t = await requestHid();
      if (t) await open(new Starboard(t), true);
    } catch (e) {
      fail(e);
    }
  };

  const disconnect = async () => {
    await board?.transport.close().catch(() => undefined);
    setBoard(null);
    setSelected(null);
    open(new Starboard(new DemoTransport()), false);
  };

  // --- lighting and display stream to the board as they change -------------
  // Only fields that differ from what the board last had are sent
  const sentRgb = useRef<RgbState | null>(null);
  const sentOled = useRef<OledState | null>(null);
  useEffect(() => {
    sentRgb.current = data?.rgb ?? null;
    sentOled.current = data?.oled ?? null;
    // re-baseline only when a board's state is (re)loaded, not on every edit
  }, [board]); // eslint-disable-line

  const rgbSync = useLatest<RgbState>(
    useCallback(
      async (v) => {
        const last = sentRgb.current;
        if (!board || !last) return;
        if (v.effect !== last.effect) await board.setRgbEffect(v.effect);
        if (v.speed !== last.speed) await board.setRgbSpeed(v.speed);
        if (v.brightness !== last.brightness) await board.setRgbBrightness(v.brightness);
        if (v.hue !== last.hue || v.sat !== last.sat) await board.setRgbColor(v.hue, v.sat);
        sentRgb.current = v;
      },
      [board],
    ),
    fail,
  );
  const oledSync = useLatest<OledState>(
    useCallback(
      async (v) => {
        const last = sentOled.current;
        if (!board || !last) return;
        if (v.mode !== last.mode) await board.setOledMode(v.mode);
        for (let i = 0; i < OLED_LINES; i++) if (v.lines[i] !== last.lines[i]) await board.setOledLine(i, v.lines[i] ?? "");
        sentOled.current = v;
      },
      [board],
    ),
    fail,
  );

  const setRgb = (patch: Partial<RgbState>) => {
    if (!data) return;
    const rgb = { ...data.rgb, ...patch };
    setData({ ...data, rgb });
    rgbSync.push(rgb);
  };
  const setOled = (oled: OledState) => {
    if (!data) return;
    setData({ ...data, oled });
    oledSync.push(oled);
  };

  const guarded = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    setError(null);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const saveRgb = () =>
    guarded("Saving lighting…", async () => {
      await rgbSync.flush();
      await board?.saveRgb();
      setSaved((s) => ({ ...s, rgb: json(data!.rgb) }));
    });
  const saveOled = () =>
    guarded("Saving display…", async () => {
      await oledSync.flush();
      await board?.saveOled();
      setSaved((s) => ({ ...s, oled: json(data!.oled) }));
    });
  const saveMacros = () =>
    guarded("Saving macros…", async () => {
      await board?.writeMacroBuffer(joinMacros(data!.macros), data!.macroBytes);
      setSaved((s) => ({ ...s, macros: json(data!.macros) }));
    });

  const assign = async (code: number) => {
    if (!data || !selected) return;
    const before = data;
    const next: Snapshot = {
      ...data,
      keymap: data.keymap.map((l) => [...l]),
      encoders: data.encoders.map((e) => [...e] as [number, number]),
    };
    if (selected.kind === "key") next.keymap[layer][selected.row * MATRIX_COLS + selected.col] = code;
    else next.encoders[layer][selected.clockwise ? 1 : 0] = code;
    setData(next);
    if (!board) return;
    try {
      if (selected.kind === "key") await board.setKeycode(layer, selected.row, selected.col, code);
      else await board.setEncoder(layer, selected.clockwise, code);
    } catch (e) {
      setData(before);
      fail(e);
    }
  };

  const resetKeymap = () =>
    guarded("Restoring the default keymap…", async () => {
      setConfirmReset(false);
      if (!board) return;
      await board.resetKeymap();
      const keymap = await board.readKeymap(data!.layers);
      const encoders: [number, number][] = [];
      for (let l = 0; l < data!.layers; l++) encoders.push([await board.getEncoder(l, false), await board.getEncoder(l, true)]);
      setData((d) => (d ? { ...d, keymap, encoders } : d));
    });

  const connected = !!board;
  const layerMap = data?.keymap[layer] ?? [];
  const turn = data?.encoders[layer] ?? [0, 0];
  const oledPreview =
    data?.oled?.mode === 1 ? data.oled.lines : ["Starboard", STATUS_LABELS[layer] ?? "Layer: ?", "XIAO RP2040", ""];

  const selectedCode =
    selected && data
      ? selected.kind === "key"
        ? layerMap[selected.row * MATRIX_COLS + selected.col]
        : turn[selected.clockwise ? 1 : 0]
      : null;
  const selectedName = !selected
    ? ""
    : selected.kind === "turn"
      ? `Knob, turn ${selected.clockwise ? "right" : "left"}`
      : selected.row === ENCODER.press.row && selected.col === ENCODER.press.col
        ? "Knob, press"
        : `${KEYS.find((k) => k.row === selected.row && k.col === selected.col)?.name} key`;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col border-ink/15 md:border-x">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 px-6 py-4 md:px-10">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="text-[15px] font-bold tracking-tight">
            Starboard<span className="text-accent">.</span>
          </Link>
          <span className="text-[15px] text-faint">Configure</span>
        </div>
        <div className="flex items-center gap-4 text-[14px]">
          {connected ? (
            <>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3d8a4e]" aria-hidden />
                {board!.transport.name}
              </span>
              {board!.transport.kind === "hid" && (
                <button type="button" onClick={() => guarded("Blinking…", () => board!.identify())} className="text-faint hover:text-ink">
                  Blink LEDs
                </button>
              )}
              <button type="button" onClick={disconnect} className="text-faint hover:text-accent">
                Disconnect
              </button>
            </>
          ) : (
            <span className="text-faint">Not connected</span>
          )}
        </div>
      </header>

      <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* The drawing previews every tab: key labels, the knob, lighting and the display */}
        <section aria-label="Board" className="border-b border-ink/20 md:border-b-0 md:border-r">
          <div className="px-6 py-8 md:sticky md:top-0 md:px-10 md:py-10">
            {data && (
              <BoardPlan
                labels={layerMap.map(label)}
                titles={layerMap.map(describe)}
                turnLabels={[label(turn[0]), label(turn[1])]}
                rgb={data.rgb}
                oled={{ off: data.oled?.mode === 2, lines: oledPreview }}
                selected={connected && tab === "keys" ? selected : null}
                onSelect={
                  connected
                    ? (t) => {
                        setTab("keys");
                        setSelected(t);
                      }
                    : undefined
                }
              />
            )}
            {data && (
              <figure className="mt-6 flex items-center gap-5">
                <div className="border border-ink/20 bg-card p-2">
                  <OledCanvas lines={oledPreview} off={data.oled?.mode === 2} scale={2} />
                </div>
                <figcaption className="text-[13px] leading-relaxed text-faint">
                  Detail A
                  <br />
                  The display enlarged, drawn with the firmware’s own font
                </figcaption>
              </figure>
            )}
            <div className="mt-6 flex items-center gap-4">
              <span className="text-[14px] text-faint" id="layer-label">
                Layer
              </span>
              <div role="radiogroup" aria-labelledby="layer-label" className="flex flex-wrap gap-1.5">
                {Array.from({ length: data?.layers ?? 4 }, (_, l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={layer === l}
                    onClick={() => setLayer(l)}
                    className={`h-9 border px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      layer === l ? "border-ink bg-ink text-paper" : "border-ink/25 hover:border-ink"
                    }`}
                  >
                    {LAYER_NAMES[l] ?? `Layer ${l}`}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-faint">
              Top view at PCB scale.{" "}
              {connected ? "Select a key or a side of the knob to change it." : "Connect a board to edit it."} Hold the FN key
              (bottom right) to reach layer FN.
            </p>
          </div>
        </section>

        <section aria-label="Settings" className="px-6 py-8 md:px-10 md:py-10">
          <div aria-live="polite" className="empty:hidden mb-6 space-y-2">
            {busy && <p className="text-[14px] text-faint">{busy}</p>}
            {error && <p className="border-l-2 border-accent pl-3 text-[14px] text-accent">{error}</p>}
          </div>

          {!connected ? (
            <div className="max-w-lg">
              <h1 className="display text-4xl font-bold md:text-5xl">Configure your Starboard</h1>
              <p className="mt-5 text-[16px] leading-relaxed text-ink/75">
                Change what each key and the knob do, set the lighting, write your own text on the display and record
                macros. Everything is sent straight to the keyboard over USB and kept after it restarts.
              </p>
              {hid === false && (
                <p className="mt-6 border-l-2 border-accent pl-3 text-[15px]">
                  This browser can’t talk to USB keyboards. Open this page in Chrome or Edge on a computer, or try the demo
                  board below.
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" className={primaryBtn} disabled={!hid || !!busy} onClick={connect}>
                  Connect Starboard
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  disabled={!!busy}
                  onClick={() => open(new Starboard(new DemoTransport()), true)}
                >
                  Try the demo board
                </button>
              </div>
              <dl className="mt-10 divide-y divide-ink/10 border-y border-ink/10 text-[14px]">
                <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-faint">Not in the list?</dt>
                  <dd className="text-ink/80">
                    The keyboard needs firmware with configurator support.{" "}
                    <a href={RELEASES} className="underline decoration-1 underline-offset-4 hover:text-accent">
                      Download the latest UF2
                    </a>
                    , hold FN and press the top-left key to enter the bootloader, then copy the file onto the RPI-RP2 drive.
                  </dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-faint">On Linux</dt>
                  <dd className="min-w-0 text-ink/80">
                    Allow your user to open the keyboard once, then reconnect it:
                    <pre className="mt-2 whitespace-pre-wrap break-all border border-ink/15 bg-card p-3 font-mono text-[12px] leading-relaxed">
                      {UDEV}
                    </pre>
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            data && (
              <>
                <div role="tablist" aria-label="Settings" className="flex gap-6 border-b border-ink/20">
                  {TABS.map((t) => {
                    const dirty =
                      (t.id === "lighting" && json(data.rgb) !== saved.rgb) ||
                      (t.id === "display" && json(data.oled) !== saved.oled) ||
                      (t.id === "macros" && json(data.macros) !== saved.macros);
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        type="button"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-[16px] transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                          tab === t.id ? "border-ink font-semibold" : "border-transparent text-faint hover:text-ink"
                        }`}
                      >
                        {t.name}
                        {dirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Unsaved changes" />}
                      </button>
                    );
                  })}
                </div>

                <div role="tabpanel" className="pt-8">
                  {tab === "keys" &&
                    (selected && selectedCode !== null ? (
                      <div>
                        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
                          <div>
                            <p className="text-[14px] text-faint">
                              {selectedName} · {LAYER_NAMES[layer] ?? `Layer ${layer}`}
                            </p>
                            <p className="mt-1 text-3xl font-bold tracking-tight">{label(selectedCode)}</p>
                            <p className="mt-1 text-[14px] text-ink/70">
                              {describe(selectedCode) !== label(selectedCode) && <>{describe(selectedCode)} · </>}
                              <span className="font-mono text-[13px] text-faint">{hex(selectedCode)}</span>
                            </p>
                          </div>
                          <button type="button" onClick={() => setSelected(null)} className="text-[14px] text-faint hover:text-ink">
                            Done
                          </button>
                        </div>
                        <KeyPicker
                          key={`${layer}:${json(selected)}`}
                          current={selectedCode}
                          layers={data.layers}
                          macros={data.macros}
                          onPick={assign}
                        />
                      </div>
                    ) : (
                      <div className="max-w-md">
                        <p className="text-[16px] leading-relaxed text-ink/80">
                          Select a key on the drawing. The two halves of the knob set what turning left and right does; its
                          centre is the press.
                        </p>
                        <p className="mt-3 text-[14px] text-faint">Changes to keys are saved on the board immediately.</p>
                        <div className="mt-10 border-t border-ink/10 pt-5">
                          {confirmReset ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <button type="button" className={primaryBtn} onClick={resetKeymap}>
                                Reset every layer
                              </button>
                              <button type="button" className={secondaryBtn} onClick={() => setConfirmReset(false)}>
                                Keep my keymap
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setConfirmReset(true)} className="text-[14px] text-faint hover:text-accent">
                              Restore the default keymap…
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  {tab === "lighting" && (
                    <LightingPanel
                      rgb={data.rgb}
                      dirty={json(data.rgb) !== saved.rgb}
                      onChange={setRgb}
                      onSave={saveRgb}
                      onRevert={() => setRgb(JSON.parse(saved.rgb))}
                    />
                  )}
                  {tab === "display" &&
                    (data.oled ? (
                      <DisplayPanel
                        oled={data.oled}
                        dirty={json(data.oled) !== saved.oled}
                        onChange={setOled}
                        onSave={saveOled}
                        onRevert={() => setOled(JSON.parse(saved.oled))}
                      />
                    ) : (
                      <p className="max-w-md text-[15px] text-ink/80">
                        This firmware can’t change the display yet.{" "}
                        <a href={RELEASES} className="underline decoration-1 underline-offset-4 hover:text-accent">
                          Flash the latest UF2
                        </a>{" "}
                        to write your own text.
                      </p>
                    ))}
                  {tab === "macros" && (
                    <MacroPanel
                      macros={data.macros}
                      bufferSize={data.macroBytes}
                      dirty={json(data.macros) !== saved.macros}
                      onChange={(macros) => setData({ ...data, macros })}
                      onSave={saveMacros}
                      onRevert={() => setData({ ...data, macros: JSON.parse(saved.macros) })}
                    />
                  )}
                </div>
              </>
            )
          )}
        </section>
      </div>

      <footer className="flex flex-col gap-2 border-t-2 border-ink px-6 py-6 text-[13px] text-faint md:flex-row md:items-center md:justify-between md:px-10">
        <p>Talks to the keyboard with WebHID and the VIA protocol. Nothing leaves your computer.</p>
        <Link href="/" className="hover:text-ink">
          Back to the Starboard page
        </Link>
      </footer>
    </div>
  );
}
