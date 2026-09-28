// Keycode catalog, labels and the 16-bit encode/decode rules QMK uses.
// Numbers come from qmk.generated.ts; this file only adds names people can read.

import { KEYCODES, RANGES, type KeycodeName } from "./qmk.generated.ts";

export type Mod = "ctrl" | "shift" | "alt" | "gui";
export type LayerFn = "MO" | "TG" | "TO" | "OSL";

export interface Entry {
  code: number;
  label: string;
  title: string;
}

export interface Group {
  id: string;
  name: string;
  entries: Entry[];
}

const k = (name: KeycodeName, label: string, title = label): Entry => ({ code: KEYCODES[name], label, title });

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => k(`KC_${c}` as KeycodeName, c));
const digits = "1234567890".split("").map((c) => k(`KC_${c}` as KeycodeName, c));
const fkeys = Array.from({ length: 24 }, (_, i) => k(`KC_F${i + 1}` as KeycodeName, `F${i + 1}`));
const numpad = "1234567890".split("").map((c) => k(`KC_KP_${c}` as KeycodeName, `KP ${c}`, `Keypad ${c}`));

export const BASIC_GROUPS: Group[] = [
  {
    id: "basic",
    name: "Basic",
    entries: [
      ...letters,
      ...digits,
      k("KC_ENTER", "Enter"),
      k("KC_ESCAPE", "Esc", "Escape"),
      k("KC_BACKSPACE", "Bksp", "Backspace"),
      k("KC_TAB", "Tab"),
      k("KC_SPACE", "Space"),
      k("KC_MINUS", "-"),
      k("KC_EQUAL", "="),
      k("KC_LEFT_BRACKET", "["),
      k("KC_RIGHT_BRACKET", "]"),
      k("KC_BACKSLASH", "\\"),
      k("KC_SEMICOLON", ";"),
      k("KC_QUOTE", "'"),
      k("KC_GRAVE", "`"),
      k("KC_COMMA", ","),
      k("KC_DOT", "."),
      k("KC_SLASH", "/"),
      k("KC_CAPS_LOCK", "Caps", "Caps Lock"),
    ],
  },
  {
    id: "nav",
    name: "Navigation",
    entries: [
      k("KC_UP", "↑", "Up"),
      k("KC_DOWN", "↓", "Down"),
      k("KC_LEFT", "←", "Left"),
      k("KC_RIGHT", "→", "Right"),
      k("KC_HOME", "Home"),
      k("KC_END", "End"),
      k("KC_PAGE_UP", "PgUp", "Page Up"),
      k("KC_PAGE_DOWN", "PgDn", "Page Down"),
      k("KC_INSERT", "Ins", "Insert"),
      k("KC_DELETE", "Del", "Delete"),
      k("KC_PRINT_SCREEN", "PrtSc", "Print Screen"),
      k("KC_SCROLL_LOCK", "ScrLk", "Scroll Lock"),
      k("KC_PAUSE", "Pause"),
      k("KC_APPLICATION", "Menu", "Application / context menu"),
    ],
  },
  {
    id: "mods",
    name: "Modifiers",
    entries: [
      k("KC_LEFT_CTRL", "LCtrl", "Left Control"),
      k("KC_LEFT_SHIFT", "LShift", "Left Shift"),
      k("KC_LEFT_ALT", "LAlt", "Left Alt"),
      k("KC_LEFT_GUI", "LGui", "Left GUI / Win / Cmd"),
      k("KC_RIGHT_CTRL", "RCtrl", "Right Control"),
      k("KC_RIGHT_SHIFT", "RShift", "Right Shift"),
      k("KC_RIGHT_ALT", "RAlt", "Right Alt"),
      k("KC_RIGHT_GUI", "RGui", "Right GUI / Win / Cmd"),
    ],
  },
  {
    id: "media",
    name: "Media",
    entries: [
      k("KC_AUDIO_MUTE", "Mute"),
      k("KC_AUDIO_VOL_DOWN", "Vol−", "Volume down"),
      k("KC_AUDIO_VOL_UP", "Vol+", "Volume up"),
      k("KC_MEDIA_PLAY_PAUSE", "Play", "Play / pause"),
      k("KC_MEDIA_STOP", "Stop"),
      k("KC_MEDIA_PREV_TRACK", "Prev", "Previous track"),
      k("KC_MEDIA_NEXT_TRACK", "Next", "Next track"),
      k("KC_BRIGHTNESS_DOWN", "Bri−", "Screen brightness down"),
      k("KC_BRIGHTNESS_UP", "Bri+", "Screen brightness up"),
      k("KC_CALCULATOR", "Calc", "Calculator"),
      k("KC_MAIL", "Mail"),
      k("KC_MY_COMPUTER", "PC", "My Computer"),
      k("KC_WWW_SEARCH", "Search", "Browser search"),
      k("KC_WWW_HOME", "Web", "Browser home"),
      k("KC_WWW_BACK", "Back", "Browser back"),
      k("KC_WWW_FORWARD", "Fwd", "Browser forward"),
      k("KC_WWW_REFRESH", "Reload", "Browser refresh"),
    ],
  },
  { id: "fn", name: "F-keys", entries: fkeys },
  {
    id: "numpad",
    name: "Numpad",
    entries: [
      ...numpad,
      k("KC_KP_DOT", "KP .", "Keypad ."),
      k("KC_KP_PLUS", "KP +", "Keypad +"),
      k("KC_KP_MINUS", "KP −", "Keypad −"),
      k("KC_KP_ASTERISK", "KP *", "Keypad *"),
      k("KC_KP_SLASH", "KP /", "Keypad /"),
      k("KC_KP_ENTER", "KP ⏎", "Keypad Enter"),
      k("KC_NUM_LOCK", "NumLk", "Num Lock"),
    ],
  },
];

export const QUANTUM_GROUPS: Group[] = [
  {
    id: "mouse",
    name: "Mouse",
    entries: [
      k("QK_MOUSE_CURSOR_UP", "M↑", "Mouse up"),
      k("QK_MOUSE_CURSOR_DOWN", "M↓", "Mouse down"),
      k("QK_MOUSE_CURSOR_LEFT", "M←", "Mouse left"),
      k("QK_MOUSE_CURSOR_RIGHT", "M→", "Mouse right"),
      k("QK_MOUSE_BUTTON_1", "Btn1", "Left click"),
      k("QK_MOUSE_BUTTON_2", "Btn2", "Right click"),
      k("QK_MOUSE_BUTTON_3", "Btn3", "Middle click"),
      k("QK_MOUSE_BUTTON_4", "Btn4", "Back button"),
      k("QK_MOUSE_BUTTON_5", "Btn5", "Forward button"),
      k("QK_MOUSE_WHEEL_UP", "Wh↑", "Wheel up"),
      k("QK_MOUSE_WHEEL_DOWN", "Wh↓", "Wheel down"),
      k("QK_MOUSE_WHEEL_LEFT", "Wh←", "Wheel left"),
      k("QK_MOUSE_WHEEL_RIGHT", "Wh→", "Wheel right"),
    ],
  },
  {
    id: "rgb",
    name: "Lighting",
    entries: [
      k("QK_UNDERGLOW_TOGGLE", "RGB", "Lighting on / off"),
      k("QK_UNDERGLOW_MODE_NEXT", "Mode+", "Next effect"),
      k("QK_UNDERGLOW_MODE_PREVIOUS", "Mode−", "Previous effect"),
      k("QK_UNDERGLOW_HUE_UP", "Hue+"),
      k("QK_UNDERGLOW_HUE_DOWN", "Hue−"),
      k("QK_UNDERGLOW_SATURATION_UP", "Sat+", "Saturation up"),
      k("QK_UNDERGLOW_SATURATION_DOWN", "Sat−", "Saturation down"),
      k("QK_UNDERGLOW_VALUE_UP", "Bright+", "Brightness up"),
      k("QK_UNDERGLOW_VALUE_DOWN", "Bright−", "Brightness down"),
      k("QK_UNDERGLOW_SPEED_UP", "Speed+", "Effect speed up"),
      k("QK_UNDERGLOW_SPEED_DOWN", "Speed−", "Effect speed down"),
    ],
  },
  {
    id: "special",
    name: "Special",
    entries: [
      k("KC_NO", "None", "Does nothing"),
      k("KC_TRANSPARENT", "▽", "Transparent: use the key from the layer below"),
      k("QK_BOOTLOADER", "Boot", "Reboot into the UF2 bootloader"),
      k("QK_REBOOT", "Reboot", "Restart the keyboard"),
    ],
  },
];

const NAMED = new Map<number, Entry>();
for (const g of [...BASIC_GROUPS, ...QUANTUM_GROUPS]) for (const e of g.entries) NAMED.set(e.code, e);

// Only basic (8-bit) keycodes can be combined with modifiers, used in LT, or sent from macros
export const BASIC_ENTRIES = BASIC_GROUPS.flatMap((g) => g.entries);

const MOD_BITS: Record<Mod, number> = {
  ctrl: RANGES.QK_LCTL,
  shift: RANGES.QK_LSFT,
  alt: RANGES.QK_LALT,
  gui: RANGES.QK_LGUI,
};
const MOD_ORDER: Mod[] = ["ctrl", "shift", "alt", "gui"];
const MOD_LABEL: Record<Mod, string> = { ctrl: "Ctrl", shift: "Shift", alt: "Alt", gui: "Gui" };

const LAYER_BASE: Record<LayerFn, number> = {
  MO: RANGES.QK_MOMENTARY,
  TG: RANGES.QK_TOGGLE_LAYER,
  TO: RANGES.QK_TO,
  OSL: RANGES.QK_ONE_SHOT_LAYER,
};
export const LAYER_FN_TITLE: Record<LayerFn, string> = {
  MO: "Hold for layer",
  TG: "Toggle layer",
  TO: "Switch to layer",
  OSL: "Next key on layer",
};

// Mirrors LCTL()/RCTL()... in quantum_keycodes.h: 4 mod bits, bit 4 selects the right-hand mods
export function withMods(basic: number, mods: Mod[], right = false): number {
  if (mods.length === 0) return basic & 0xff;
  let code = basic & 0xff;
  for (const m of mods) code |= MOD_BITS[m];
  return right ? code | RANGES.QK_RMODS_MIN : code;
}

// MO()/TG()/TO()/OSL() mask the layer to 5 bits
export const layerKey = (fn: LayerFn, layer: number): number => LAYER_BASE[fn] | (layer & 0x1f);

// LT() packs a 4-bit layer and an 8-bit basic keycode
export const layerTap = (layer: number, basic: number): number =>
  RANGES.QK_LAYER_TAP | ((layer & 0xf) << 8) | (basic & 0xff);

export const macroKey = (n: number): number => RANGES.QK_MACRO + n;

export type Decoded =
  | { kind: "named"; entry: Entry }
  | { kind: "mods"; mods: Mod[]; right: boolean; basic: number }
  | { kind: "layer"; fn: LayerFn; layer: number }
  | { kind: "lt"; layer: number; basic: number }
  | { kind: "macro"; index: number }
  | { kind: "raw"; code: number };

const inRange = (c: number, lo: number, hi: number) => c >= lo && c <= hi;

export function decode(code: number): Decoded {
  const named = NAMED.get(code);
  if (named) return { kind: "named", entry: named };
  if (inRange(code, RANGES.QK_MODS, RANGES.QK_MODS_MAX)) {
    const bits = code & 0x1f00;
    return {
      kind: "mods",
      mods: MOD_ORDER.filter((m) => bits & MOD_BITS[m]),
      right: (bits & RANGES.QK_RMODS_MIN) !== 0,
      basic: code & 0xff,
    };
  }
  if (inRange(code, RANGES.QK_LAYER_TAP, RANGES.QK_LAYER_TAP_MAX)) {
    return { kind: "lt", layer: (code >> 8) & 0xf, basic: code & 0xff };
  }
  for (const fn of ["MO", "TG", "TO", "OSL"] as LayerFn[]) {
    const lo = LAYER_BASE[fn];
    if (inRange(code, lo, lo + 0x1f)) return { kind: "layer", fn, layer: code & 0x1f };
  }
  if (inRange(code, RANGES.QK_MACRO, RANGES.QK_MACRO_MAX)) return { kind: "macro", index: code - RANGES.QK_MACRO };
  return { kind: "raw", code };
}

export const hex = (code: number) => "0x" + code.toString(16).toUpperCase().padStart(4, "0");

const basicLabel = (basic: number) => NAMED.get(basic)?.label ?? hex(basic);

// Short text for a keycap
export function label(code: number): string {
  const d = decode(code);
  switch (d.kind) {
    case "named":
      return d.entry.label;
    case "mods":
      return `${d.right ? "R" : ""}${d.mods.map((m) => MOD_LABEL[m]).join("+")}+${basicLabel(d.basic)}`;
    case "layer":
      return `${d.fn} ${d.layer}`;
    case "lt":
      return `${basicLabel(d.basic)} / L${d.layer}`;
    case "macro":
      return `M${d.index}`;
    case "raw":
      return hex(d.code);
  }
}

// Longer description for a tooltip or the inspector
export function describe(code: number): string {
  const d = decode(code);
  switch (d.kind) {
    case "named":
      return d.entry.title;
    case "mods":
      return `${d.right ? "Right " : ""}${d.mods.map((m) => MOD_LABEL[m]).join(" + ")} + ${basicLabel(d.basic)}`;
    case "layer":
      return `${LAYER_FN_TITLE[d.fn]} ${d.layer}`;
    case "lt":
      return `Tap for ${basicLabel(d.basic)}, hold for layer ${d.layer}`;
    case "macro":
      return `Run macro ${d.index}`;
    case "raw":
      return `Keycode ${hex(d.code)}`;
  }
}
