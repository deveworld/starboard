// Exercise the configurator's protocol client against a real Starboard over Linux hidraw.
// Every change is read back and then restored; nothing is saved to EEPROM.
// Run: node --experimental-strip-types scripts/hw-test.mts [--leave-oled]
import assert from "node:assert/strict";
import { open, readdir, readFile, type FileHandle } from "node:fs/promises";
import { KEYCODES } from "../app/configure/qmk.generated.ts";
import { withMods } from "../app/configure/keycodes.ts";
import { joinMacros, splitMacros } from "../app/configure/macro.ts";
import { DemoTransport, Starboard, UnhandledError, type Transport } from "../app/configure/via.ts";

const RAW_USAGE = Buffer.from([0x06, 0x60, 0xff, 0x09, 0x61]); // Usage Page 0xFF60, Usage 0x61

async function findRawHid(): Promise<string> {
  for (const name of await readdir("/sys/class/hidraw")) {
    const dir = `/sys/class/hidraw/${name}/device`;
    const uevent = await readFile(`${dir}/uevent`, "utf8");
    if (!/HID_ID=0003:00005354:00000001/i.test(uevent)) continue;
    if ((await readFile(`${dir}/report_descriptor`)).includes(RAW_USAGE)) return `/dev/${name}`;
  }
  throw new Error("No Starboard raw HID interface found (is the VIA firmware flashed?)");
}

class HidrawTransport implements Transport {
  readonly kind = "hid";
  readonly name: string;
  private fh: FileHandle;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(fh: FileHandle, path: string) {
    this.fh = fh;
    this.name = `Starboard (${path})`;
  }

  exchange(packet: Uint8Array): Promise<Uint8Array> {
    const run = async () => {
      // hidraw wants the report number first; this interface has none, so 0
      await this.fh.write(Buffer.concat([Buffer.from([0]), Buffer.from(packet)]));
      const buf = Buffer.alloc(32);
      for (;;) {
        const read = this.fh.read(buf, 0, 32, null);
        const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1000));
        await Promise.race([read, timeout]);
        if (buf[0] === 0xff) throw new UnhandledError(`command 0x${packet[0].toString(16)} unhandled`);
        if (buf[0] === packet[0]) return new Uint8Array(buf);
      }
    };
    const result = this.chain.then(run, run);
    this.chain = result.catch(() => undefined);
    return result;
  }

  close() {
    return this.fh.close();
  }
}

const K = KEYCODES;
let passed = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`ok  ${name}`);
};

const path = await findRawHid();
const fh = await open(path, "r+");
const sb = new Starboard(new HidrawTransport(fh, path));
const demo = new Starboard(new DemoTransport());
console.log(`using ${path}\n`);

await test("protocol version and layer count", async () => {
  assert.equal(await sb.protocolVersion(), 0x0d);
  assert.equal(await sb.layerCount(), 4);
});

await test("keymap and encoder map match the demo board's defaults", async () => {
  const t0 = performance.now();
  assert.deepEqual(await sb.readKeymap(4), await demo.readKeymap(4));
  for (let l = 0; l < 4; l++) {
    for (const cw of [false, true]) assert.equal(await sb.getEncoder(l, cw), await demo.getEncoder(l, cw), `layer ${l} cw=${cw}`);
  }
  console.log(`    (read in ${(performance.now() - t0).toFixed(0)} ms)`);
});

await test("set keycode reads back, then restores", async () => {
  const before = (await sb.readKeymap(4))[3][0];
  const code = withMods(K.KC_V, ["ctrl", "shift"]);
  await sb.setKeycode(3, 0, 0, code);
  assert.equal((await sb.readKeymap(4))[3][0], code);
  await sb.setKeycode(3, 0, 0, before);
  assert.equal((await sb.readKeymap(4))[3][0], before);
});

await test("set encoder reads back, then restores", async () => {
  const before = await sb.getEncoder(3, true);
  await sb.setEncoder(3, true, K.KC_MEDIA_NEXT_TRACK);
  assert.equal(await sb.getEncoder(3, true), K.KC_MEDIA_NEXT_TRACK);
  await sb.setEncoder(3, true, before);
  assert.equal(await sb.getEncoder(3, true), before);
});

await test("macro buffer write/read round-trip, then restores the original bytes", async () => {
  const count = await sb.macroCount();
  const size = await sb.macroBufferSize();
  console.log(`    (${count} macros, ${size} byte buffer)`);
  assert.equal(count, 16);
  const t0 = performance.now();
  const original = await sb.readMacroBuffer(size);
  console.log(`    (buffer read in ${(performance.now() - t0).toFixed(0)} ms)`);
  const macros = splitMacros(original, count);
  macros[15] = [
    { type: "text", text: "hw test" },
    { type: "delay", ms: 20 },
    { type: "tap", key: K.KC_ENTER },
  ];
  await sb.writeMacroBuffer(joinMacros(macros), size);
  const back = await sb.readMacroBuffer(size);
  assert.equal(back[size - 1], 0);
  assert.deepEqual(splitMacros(back, count), macros);
  // restore byte-for-byte (last byte is always 0 after a reset/write)
  await sb.writeMacroBuffer([...original.subarray(0, size - 1)], size);
  assert.deepEqual(await sb.readMacroBuffer(size), original);
});

await test("lighting values round-trip, then restore", async () => {
  const before = await sb.getRgb();
  console.log(`    (current: ${JSON.stringify(before)})`);
  await sb.setRgbBrightness(255);
  await sb.setRgbColor(85, 200);
  await sb.setRgbSpeed(2);
  await sb.setRgbEffect(9); // rainbow swirl
  const now = await sb.getRgb();
  assert.deepEqual(now, { effect: 9, speed: 2, brightness: 255, hue: 85, sat: 200 });
  await sb.setRgbEffect(0);
  assert.equal((await sb.getRgb()).effect, 0, "effect 0 turns the lights off");
  await sb.setRgbEffect(before.effect);
  await sb.setRgbSpeed(before.speed);
  await sb.setRgbBrightness(before.brightness);
  await sb.setRgbColor(before.hue, before.sat);
  assert.deepEqual(await sb.getRgb(), before, "restored exactly, brightness included");
});

await test("OLED channel round-trips", async () => {
  const before = await sb.getOled();
  console.log(`    (current: ${JSON.stringify(before)})`);
  await sb.setOledMode(1);
  const lines = ["Configurator OK", "", "via WebHID client", "123456789012345678901"];
  for (let i = 0; i < 4; i++) await sb.setOledLine(i, lines[i]);
  assert.deepEqual(await sb.getOled(), { mode: 1, lines });
  await sb.setOledLine(1, "this line is far too long for the display");
  // the firmware keeps the first 21 bytes; trailing spaces are trimmed on read
  assert.equal((await sb.getOled()).lines[1], "this line is far too", "truncated to 21 chars");
  await sb.setOledLine(1, "");
  if (!process.argv.includes("--leave-oled")) {
    await sb.setOledMode(before.mode);
    for (let i = 0; i < 4; i++) await sb.setOledLine(i, before.lines[i]);
    assert.deepEqual(await sb.getOled(), before);
  }
});

await test("unknown custom values are reported as unhandled", async () => {
  await assert.rejects(() => (sb as any).cmd(0x08, 0, 99), UnhandledError);
});

console.log(`\n${passed} passed on hardware`);
await fh.close().catch(() => undefined);
process.exit(0);
