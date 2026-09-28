// Starboard speaks the VIA raw-HID protocol (quantum/via.c): 32-byte reports,
// the response echoes the command id, and 0xFF means "unhandled".
// OLED settings ride on VIA's custom channel 0 (see keymaps/default/keymap.c).

import { KEYCODES, RGB_LIMIT_VAL } from "./qmk.generated.ts";
import { layerTap } from "./keycodes.ts";

export const USB_FILTER: HIDDeviceFilter = { vendorId: 0x5354, productId: 0x0001, usagePage: 0xff60, usage: 0x61 };

const REPORT_SIZE = 32;
const CHUNK = 28; // buffer reads/writes carry 4 header bytes
const TIMEOUT_MS = 1000;

const CMD = {
  protocolVersion: 0x01,
  setKeyboardValue: 0x03,
  setKeycode: 0x05,
  keymapReset: 0x06,
  customSet: 0x07,
  customGet: 0x08,
  customSave: 0x09,
  macroCount: 0x0c,
  macroBufferSize: 0x0d,
  macroGetBuffer: 0x0e,
  macroSetBuffer: 0x0f,
  macroReset: 0x10,
  layerCount: 0x11,
  keymapGetBuffer: 0x12,
  getEncoder: 0x14,
  setEncoder: 0x15,
  unhandled: 0xff,
} as const;

const DEVICE_INDICATION = 0x05;
const CHANNEL = { custom: 0, rgblight: 2 } as const;
const RGB = { brightness: 1, effect: 2, speed: 3, color: 4 } as const;
const OLED = { mode: 1, line0: 2 } as const;

export const MATRIX_ROWS = 3;
export const MATRIX_COLS = 3;
export const OLED_LINES = 4;
export const OLED_LINE_CHARS = 21;

export type OledMode = 0 | 1 | 2; // status, custom text, off

export interface RgbState {
  effect: number; // 0 = off, otherwise an rgblight mode number
  speed: number;
  brightness: number; // 0-255, scaled to RGBLIGHT_LIMIT_VAL by the firmware
  hue: number;
  sat: number;
}

export interface OledState {
  mode: OledMode;
  lines: string[];
}

export class UnhandledError extends Error {}

// The firmware reports brightness as floor(val * 255 / LIMIT) and stores a write as floor(v * LIMIT / 255),
// so echoing a reported value back can land one step lower. Send the smallest value that maps onto the
// step the reported value came from, which makes read -> write lossless.
export function viaBrightness(reported: number): number {
  const val = Math.ceil((reported * RGB_LIMIT_VAL) / 255);
  return Math.min(255, Math.ceil((val * 255) / RGB_LIMIT_VAL));
}

export interface Transport {
  readonly kind: "hid" | "demo";
  readonly name: string;
  exchange(packet: Uint8Array): Promise<Uint8Array>;
  close(): Promise<void>;
}

export class HidTransport implements Transport {
  readonly kind = "hid";
  readonly device: HIDDevice;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(device: HIDDevice) {
    this.device = device;
  }

  get name() {
    return this.device.productName || "Starboard";
  }

  exchange(packet: Uint8Array): Promise<Uint8Array> {
    const run = () =>
      new Promise<Uint8Array>((resolve, reject) => {
        const done = () => {
          clearTimeout(timer);
          this.device.removeEventListener("inputreport", onReport);
        };
        const onReport = (e: HIDInputReportEvent) => {
          const data = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength).slice();
          if (data[0] !== packet[0] && data[0] !== CMD.unhandled) return;
          done();
          if (data[0] === CMD.unhandled) reject(new UnhandledError(`command 0x${packet[0].toString(16)} unhandled`));
          else resolve(data);
        };
        const timer = setTimeout(() => {
          done();
          reject(new Error("Starboard did not answer"));
        }, TIMEOUT_MS);
        this.device.addEventListener("inputreport", onReport);
        this.device.sendReport(0, packet as Uint8Array<ArrayBuffer>).catch((err) => {
          done();
          reject(err);
        });
      });
    // One request in flight at a time, so responses can't be matched to the wrong caller
    const result = this.chain.then(run, run);
    this.chain = result.catch(() => undefined);
    return result;
  }

  close() {
    return this.device.close();
  }
}

export async function requestHid(): Promise<HidTransport | null> {
  const [device] = await navigator.hid!.requestDevice({ filters: [USB_FILTER] });
  return device ? openHid(device) : null;
}

// Reconnect without a prompt to a device the user already granted
export async function reconnectHid(): Promise<HidTransport | null> {
  const devices = await navigator.hid!.getDevices();
  const device = devices.find((d) => matchesFilter(d));
  return device ? openHid(device) : null;
}

export const matchesFilter = (d: HIDDevice) =>
  d.vendorId === USB_FILTER.vendorId &&
  d.productId === USB_FILTER.productId &&
  d.collections.some((c) => c.usagePage === USB_FILTER.usagePage && c.usage === USB_FILTER.usage);

async function openHid(device: HIDDevice) {
  if (!device.opened) await device.open();
  return new HidTransport(device);
}

const toAscii = (s: string) => [...s].map((c) => c.charCodeAt(0)).filter((c) => c >= 0x20 && c <= 0x7e);
const fromAscii = (b: ArrayLike<number>) => {
  let s = "";
  for (let i = 0; i < b.length && b[i] !== 0; i++) s += b[i] >= 0x20 && b[i] <= 0x7e ? String.fromCharCode(b[i]) : " ";
  return s.replace(/\s+$/, "");
};

export class Starboard {
  readonly transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  private cmd(...bytes: number[]) {
    const packet = new Uint8Array(REPORT_SIZE);
    packet.set(bytes.slice(0, REPORT_SIZE));
    return this.transport.exchange(packet);
  }

  async protocolVersion() {
    const r = await this.cmd(CMD.protocolVersion);
    return (r[1] << 8) | r[2];
  }

  async layerCount() {
    return (await this.cmd(CMD.layerCount))[1];
  }

  // keymap[layer][row * MATRIX_COLS + col]
  async readKeymap(layers: number): Promise<number[][]> {
    const size = layers * MATRIX_ROWS * MATRIX_COLS * 2;
    const bytes = await this.readBuffer(CMD.keymapGetBuffer, size);
    const per = MATRIX_ROWS * MATRIX_COLS;
    return Array.from({ length: layers }, (_, l) =>
      Array.from({ length: per }, (_, i) => (bytes[(l * per + i) * 2] << 8) | bytes[(l * per + i) * 2 + 1]),
    );
  }

  async setKeycode(layer: number, row: number, col: number, code: number) {
    await this.cmd(CMD.setKeycode, layer, row, col, code >> 8, code & 0xff);
  }

  async resetKeymap() {
    await this.cmd(CMD.keymapReset);
  }

  async getEncoder(layer: number, clockwise: boolean) {
    const r = await this.cmd(CMD.getEncoder, layer, 0, clockwise ? 1 : 0);
    return (r[4] << 8) | r[5];
  }

  async setEncoder(layer: number, clockwise: boolean, code: number) {
    await this.cmd(CMD.setEncoder, layer, 0, clockwise ? 1 : 0, code >> 8, code & 0xff);
  }

  async macroCount() {
    return (await this.cmd(CMD.macroCount))[1];
  }

  async macroBufferSize() {
    const r = await this.cmd(CMD.macroBufferSize);
    return (r[1] << 8) | r[2];
  }

  readMacroBuffer(size: number) {
    return this.readBuffer(CMD.macroGetBuffer, size);
  }

  // Same guard VIA uses: a non-zero last byte tells the firmware a write is in progress
  async writeMacroBuffer(data: number[], size: number) {
    if (data.length > size - 1) throw new Error(`Macros use ${data.length} bytes; the board holds ${size - 1}`);
    await this.writeBuffer(CMD.macroSetBuffer, size - 1, [0xff]);
    await this.writeBuffer(CMD.macroSetBuffer, 0, data);
    await this.writeBuffer(CMD.macroSetBuffer, size - 1, [0x00]);
  }

  async resetMacros() {
    await this.cmd(CMD.macroReset);
  }

  async getRgb(): Promise<RgbState> {
    const get = (id: number) => this.cmd(CMD.customGet, CHANNEL.rgblight, id);
    const brightness = (await get(RGB.brightness))[3];
    const effect = (await get(RGB.effect))[3];
    const speed = (await get(RGB.speed))[3];
    const color = await get(RGB.color);
    return { effect, speed, brightness, hue: color[3], sat: color[4] };
  }

  async setRgbEffect(effect: number) {
    await this.cmd(CMD.customSet, CHANNEL.rgblight, RGB.effect, effect);
  }

  async setRgbSpeed(speed: number) {
    await this.cmd(CMD.customSet, CHANNEL.rgblight, RGB.speed, speed);
  }

  async setRgbBrightness(brightness: number) {
    await this.cmd(CMD.customSet, CHANNEL.rgblight, RGB.brightness, viaBrightness(brightness));
  }

  async setRgbColor(hue: number, sat: number) {
    await this.cmd(CMD.customSet, CHANNEL.rgblight, RGB.color, hue, sat);
  }

  async saveRgb() {
    await this.cmd(CMD.customSave, CHANNEL.rgblight);
  }

  async getOled(): Promise<OledState> {
    const mode = (await this.cmd(CMD.customGet, CHANNEL.custom, OLED.mode))[3] as OledMode;
    const lines: string[] = [];
    for (let i = 0; i < OLED_LINES; i++) {
      const r = await this.cmd(CMD.customGet, CHANNEL.custom, OLED.line0 + i);
      lines.push(fromAscii(r.subarray(3, 3 + OLED_LINE_CHARS)));
    }
    return { mode, lines };
  }

  async setOledMode(mode: OledMode) {
    await this.cmd(CMD.customSet, CHANNEL.custom, OLED.mode, mode);
  }

  async setOledLine(index: number, text: string) {
    const bytes = toAscii(text).slice(0, OLED_LINE_CHARS);
    while (bytes.length < OLED_LINE_CHARS) bytes.push(0);
    await this.cmd(CMD.customSet, CHANNEL.custom, OLED.line0 + index, ...bytes);
  }

  async saveOled() {
    await this.cmd(CMD.customSave, CHANNEL.custom);
  }

  // Blink the underglow; VIA's convention is six calls 200 ms apart, which leaves it as it was
  async identify() {
    for (let i = 0; i < 6; i++) {
      await this.cmd(CMD.setKeyboardValue, DEVICE_INDICATION, i);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  private async readBuffer(cmd: number, size: number) {
    const out = new Uint8Array(size);
    for (let offset = 0; offset < size; offset += CHUNK) {
      const n = Math.min(CHUNK, size - offset);
      const r = await this.cmd(cmd, offset >> 8, offset & 0xff, n);
      out.set(r.subarray(4, 4 + n), offset);
    }
    return out;
  }

  private async writeBuffer(cmd: number, start: number, data: number[]) {
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK);
      const offset = start + i;
      await this.cmd(cmd, offset >> 8, offset & 0xff, chunk.length, ...chunk);
    }
  }
}

// ---------------------------------------------------------------------------
// Demo board: answers the same packets the firmware does, from the default keymap

const DEMO_LAYERS = 4;
const DEMO_MACROS = 16;
const DEMO_MACRO_BUFFER = 3882; // what the real firmware reports

function defaultKeymap(): number[][] {
  const K = KEYCODES;
  const layers = Array.from({ length: DEMO_LAYERS }, (_, l) =>
    new Array<number>(MATRIX_ROWS * MATRIX_COLS).fill(l < 2 ? K.KC_NO : K.KC_TRANSPARENT),
  );
  const at = (row: number, col: number) => row * MATRIX_COLS + col;
  const set = (layer: number, codes: [number, number, number][]) => {
    for (const [row, col, code] of codes) layers[layer][at(row, col)] = code;
  };
  set(0, [
    [0, 0, K.KC_ESCAPE], [0, 1, K.KC_UP], [0, 2, K.KC_AUDIO_MUTE], [2, 0, K.KC_MEDIA_PLAY_PAUSE],
    [1, 0, K.KC_LEFT], [1, 1, K.KC_DOWN], [1, 2, layerTap(1, K.KC_RIGHT)],
  ]);
  set(1, [
    [0, 0, K.QK_BOOTLOADER], [0, 1, K.QK_UNDERGLOW_TOGGLE], [0, 2, K.QK_UNDERGLOW_MODE_NEXT], [2, 0, K.KC_MEDIA_STOP],
    [1, 0, K.QK_UNDERGLOW_HUE_UP], [1, 1, K.QK_UNDERGLOW_SATURATION_UP], [1, 2, K.QK_UNDERGLOW_VALUE_UP],
  ]);
  return layers;
}

export class DemoTransport implements Transport {
  readonly kind = "demo";
  readonly name = "Demo board";
  private keymap = defaultKeymap();
  private encoders: number[][] = Array.from({ length: DEMO_LAYERS }, (_, l): number[] =>
    l === 0
      ? [KEYCODES.KC_AUDIO_VOL_DOWN, KEYCODES.KC_AUDIO_VOL_UP]
      : l === 1
        ? [KEYCODES.QK_UNDERGLOW_VALUE_DOWN, KEYCODES.QK_UNDERGLOW_VALUE_UP]
        : [KEYCODES.KC_TRANSPARENT, KEYCODES.KC_TRANSPARENT],
  );
  private macros = new Uint8Array(DEMO_MACRO_BUFFER);
  private rgb = { enabled: true, mode: 1, speed: 0, hue: 170, sat: 255, val: 64 };
  private oled = { mode: 0, lines: Array.from({ length: OLED_LINES }, () => new Uint8Array(OLED_LINE_CHARS)) };

  async exchange(p: Uint8Array): Promise<Uint8Array> {
    const r = p.slice();
    const u16 = (i: number) => (p[i] << 8) | p[i + 1];
    const per = MATRIX_ROWS * MATRIX_COLS;
    switch (p[0]) {
      case CMD.protocolVersion:
        r[1] = 0x00;
        r[2] = 0x0d;
        break;
      case CMD.setKeyboardValue:
        break;
      case CMD.layerCount:
        r[1] = DEMO_LAYERS;
        break;
      case CMD.keymapGetBuffer:
        for (let i = 0; i < p[3]; i++) {
          const byte = u16(1) + i;
          const code = this.keymap[Math.floor(byte / 2 / per)][Math.floor(byte / 2) % per];
          r[4 + i] = byte % 2 === 0 ? code >> 8 : code & 0xff;
        }
        break;
      case CMD.setKeycode:
        this.keymap[p[1]][p[2] * MATRIX_COLS + p[3]] = u16(4);
        break;
      case CMD.keymapReset:
        this.keymap = defaultKeymap();
        break;
      case CMD.getEncoder: {
        const code = this.encoders[p[1]][p[3] ? 1 : 0];
        r[4] = code >> 8;
        r[5] = code & 0xff;
        break;
      }
      case CMD.setEncoder:
        this.encoders[p[1]][p[3] ? 1 : 0] = u16(4);
        break;
      case CMD.macroCount:
        r[1] = DEMO_MACROS;
        break;
      case CMD.macroBufferSize:
        r[1] = DEMO_MACRO_BUFFER >> 8;
        r[2] = DEMO_MACRO_BUFFER & 0xff;
        break;
      case CMD.macroGetBuffer:
        r.set(this.macros.subarray(u16(1), u16(1) + p[3]), 4);
        break;
      case CMD.macroSetBuffer:
        this.macros.set(p.subarray(4, 4 + p[3]), u16(1));
        break;
      case CMD.macroReset:
        this.macros.fill(0);
        break;
      case CMD.customGet:
      case CMD.customSet:
      case CMD.customSave:
        if (!this.custom(p, r)) r[0] = CMD.unhandled;
        break;
      default:
        r[0] = CMD.unhandled;
    }
    await new Promise((res) => setTimeout(res, 2));
    if (r[0] === CMD.unhandled) throw new UnhandledError(`command 0x${p[0].toString(16)} unhandled`);
    return r;
  }

  private custom(p: Uint8Array, r: Uint8Array): boolean {
    const [cmd, channel, id] = p;
    const set = cmd === CMD.customSet;
    if (cmd === CMD.customSave) return channel === CHANNEL.rgblight || channel === CHANNEL.custom;
    if (channel === CHANNEL.rgblight) {
      const rgb = this.rgb;
      if (id === RGB.brightness) {
        if (set) rgb.val = Math.floor((p[3] * RGB_LIMIT_VAL) / 255);
        else r[3] = Math.floor((rgb.val * 255) / RGB_LIMIT_VAL);
      } else if (id === RGB.effect) {
        if (set) {
          rgb.enabled = p[3] !== 0;
          if (p[3]) rgb.mode = p[3];
        } else r[3] = rgb.enabled ? rgb.mode : 0;
      } else if (id === RGB.speed) {
        if (set) rgb.speed = p[3];
        else r[3] = rgb.speed;
      } else if (id === RGB.color) {
        if (set) [rgb.hue, rgb.sat] = [p[3], p[4]];
        else [r[3], r[4]] = [rgb.hue, rgb.sat];
      } else return false;
      return true;
    }
    if (channel === CHANNEL.custom) {
      if (id === OLED.mode) {
        if (set) this.oled.mode = p[3] < 3 ? p[3] : 0;
        else r[3] = this.oled.mode;
        return true;
      }
      const line = id - OLED.line0;
      if (line >= 0 && line < OLED_LINES) {
        if (set) this.oled.lines[line].set(p.subarray(3, 3 + OLED_LINE_CHARS));
        else r.set(this.oled.lines[line], 3);
        return true;
      }
    }
    return false;
  }

  async close() {}
}
