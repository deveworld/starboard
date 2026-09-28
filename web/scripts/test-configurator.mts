// Run: npm test (node --experimental-strip-types scripts/test-configurator.mts)
import assert from "node:assert/strict";
import { KEYCODES, RGB_LIMIT_VAL, VECTORS } from "../app/configure/qmk.generated.ts";
import {
  BASIC_GROUPS, QUANTUM_GROUPS, decode, label, layerKey, layerTap, macroKey, withMods,
} from "../app/configure/keycodes.ts";
import { decodeMacro, encodeMacro, joinMacros, splitMacros, type Step } from "../app/configure/macro.ts";
import { DemoTransport, MATRIX_COLS, Starboard, viaBrightness } from "../app/configure/via.ts";

let passed = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  passed++;
  console.log(`ok  ${name}`);
};

const K = KEYCODES;

await test("every catalog entry resolves to a QMK keycode", () => {
  for (const g of [...BASIC_GROUPS, ...QUANTUM_GROUPS]) {
    for (const e of g.entries) assert.equal(typeof e.code, "number", `${g.id}/${e.label}`);
  }
  const codes = [...BASIC_GROUPS, ...QUANTUM_GROUPS].flatMap((g) => g.entries.map((e) => e.code));
  assert.equal(new Set(codes).size, codes.length, "duplicate keycodes in catalog");
});

await test("encoders match the C preprocessor", () => {
  const ours: Record<string, number> = {
    "MO(1)": layerKey("MO", 1),
    "MO(3)": layerKey("MO", 3),
    "TG(2)": layerKey("TG", 2),
    "TO(0)": layerKey("TO", 0),
    "TO(3)": layerKey("TO", 3),
    "OSL(1)": layerKey("OSL", 1),
    "LT(1, KC_A)": layerTap(1, K.KC_A),
    "LT(3, KC_SPACE)": layerTap(3, K.KC_SPACE),
    "LCTL(KC_C)": withMods(K.KC_C, ["ctrl"]),
    "LSFT(KC_1)": withMods(K.KC_1, ["shift"]),
    "LALT(KC_TAB)": withMods(K.KC_TAB, ["alt"]),
    "LGUI(KC_L)": withMods(K.KC_L, ["gui"]),
    "LCTL(LSFT(KC_ESCAPE))": withMods(K.KC_ESCAPE, ["ctrl", "shift"]),
    "RCTL(KC_Z)": withMods(K.KC_Z, ["ctrl"], true),
    "RALT(KC_E)": withMods(K.KC_E, ["alt"], true),
    "QK_MACRO_0": macroKey(0),
    "QK_MACRO_15": macroKey(15),
  };
  assert.deepEqual(Object.keys(ours).sort(), Object.keys(VECTORS).sort());
  for (const [expr, value] of Object.entries(VECTORS)) assert.equal(ours[expr], value, expr);
});

await test("decode inverts every encoder", () => {
  assert.deepEqual(decode(layerKey("TG", 2)), { kind: "layer", fn: "TG", layer: 2 });
  assert.deepEqual(decode(layerTap(1, K.KC_RIGHT)), { kind: "lt", layer: 1, basic: K.KC_RIGHT });
  assert.deepEqual(decode(withMods(K.KC_C, ["ctrl", "shift"], true)), {
    kind: "mods", mods: ["ctrl", "shift"], right: true, basic: K.KC_C,
  });
  assert.deepEqual(decode(macroKey(7)), { kind: "macro", index: 7 });
  assert.equal(label(K.KC_AUDIO_VOL_UP), "Vol+");
  assert.equal(label(withMods(K.KC_C, ["ctrl"])), "Ctrl+C");
  assert.equal(label(layerTap(1, K.KC_RIGHT)), "→ / L1");
  assert.equal(label(0x7e00), "0x7E00");
});

await test("macro text, keys and delays round-trip", () => {
  const steps: Step[] = [
    { type: "text", text: "Hello, world!" },
    { type: "down", key: K.KC_LEFT_CTRL },
    { type: "tap", key: K.KC_C },
    { type: "up", key: K.KC_LEFT_CTRL },
    { type: "delay", ms: 250 },
    { type: "tap", key: K.KC_ENTER },
  ];
  const bytes = encodeMacro(steps);
  // Same bytes QMK's SS_DOWN(X_LCTL) SS_TAP(X_C) SS_UP(X_LCTL) SS_DELAY(250) produce
  assert.deepEqual(bytes.slice(13), [1, 2, 0xe0, 1, 1, 0x06, 1, 3, 0xe0, 1, 4, 0x32, 0x35, 0x30, 0x7c, 1, 1, 0x28]);
  assert.deepEqual(decodeMacro(bytes), steps);
  const buf = new Uint8Array(64);
  buf.set(joinMacros([steps.slice(0, 1), [], [{ type: "tap", key: K.KC_A }]]));
  assert.deepEqual(splitMacros(buf, 4), [steps.slice(0, 1), [], [{ type: "tap", key: K.KC_A }], []]);
  assert.deepEqual(encodeMacro([{ type: "text", text: "é\n" }]), [], "non-ASCII text is dropped");
});

await test("brightness survives a read -> write round trip at every step", async () => {
  for (let val = 0; val <= RGB_LIMIT_VAL; val++) {
    const reported = Math.floor((val * 255) / RGB_LIMIT_VAL); // via_qmk_rgblight_get_value
    const stored = Math.floor((viaBrightness(reported) * RGB_LIMIT_VAL) / 255); // via_qmk_rgblight_set_value
    assert.equal(stored, val, `val ${val}`);
  }
});

await test("client round-trips against the demo board", async () => {
  const sb = new Starboard(new DemoTransport());
  assert.equal(await sb.protocolVersion(), 0x0d);
  const layers = await sb.layerCount();
  const keymap = await sb.readKeymap(layers);
  assert.equal(keymap[0][0], K.KC_ESCAPE);
  assert.equal(keymap[0][1 * MATRIX_COLS + 2], layerTap(1, K.KC_RIGHT));
  assert.equal(keymap[3][0], K.KC_TRANSPARENT);
  await sb.setKeycode(2, 1, 1, withMods(K.KC_V, ["ctrl"]));
  assert.equal((await sb.readKeymap(layers))[2][1 * MATRIX_COLS + 1], withMods(K.KC_V, ["ctrl"]));
  assert.equal(await sb.getEncoder(0, true), K.KC_AUDIO_VOL_UP);
  await sb.setEncoder(0, true, K.KC_MEDIA_NEXT_TRACK);
  assert.equal(await sb.getEncoder(0, true), K.KC_MEDIA_NEXT_TRACK);

  const size = await sb.macroBufferSize();
  const macros: Step[][] = Array.from({ length: await sb.macroCount() }, () => []);
  macros[3] = [{ type: "text", text: "x".repeat(100) }];
  await sb.writeMacroBuffer(joinMacros(macros), size);
  const back = await sb.readMacroBuffer(size);
  assert.equal(back[size - 1], 0, "write guard cleared");
  assert.deepEqual(splitMacros(back, macros.length), macros);

  const rgb = await sb.getRgb();
  assert.deepEqual(rgb, { effect: 1, speed: 0, brightness: 127, hue: 170, sat: 255 });
  await sb.setRgbBrightness(255);
  assert.equal((await sb.getRgb()).brightness, 255);

  await sb.setOledMode(1);
  await sb.setOledLine(2, "Hi from the web");
  assert.deepEqual(await sb.getOled(), { mode: 1, lines: ["", "", "Hi from the web", ""] });
});

console.log(`\n${passed} passed`);
