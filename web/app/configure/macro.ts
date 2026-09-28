// Dynamic macros are stored as one buffer of NUL-terminated strings in QMK's
// send_string format: printable ASCII is typed as-is, and \x01 starts a command
// (tap/down/up take one basic keycode byte, delay takes decimal digits and '|').

export type Step =
  | { type: "text"; text: string }
  | { type: "tap" | "down" | "up"; key: number }
  | { type: "delay"; ms: number };

const PREFIX = 1;
const OP = { tap: 1, down: 2, up: 3, delay: 4 } as const;

export const isPrintable = (c: number) => c >= 0x20 && c <= 0x7e;

export function encodeMacro(steps: Step[]): number[] {
  const out: number[] = [];
  for (const s of steps) {
    if (s.type === "text") {
      for (const ch of s.text) {
        const c = ch.charCodeAt(0);
        if (isPrintable(c)) out.push(c);
      }
    } else if (s.type === "delay") {
      const ms = Math.max(0, Math.min(9999, Math.round(s.ms)));
      out.push(PREFIX, OP.delay, ...[...String(ms)].map((d) => d.charCodeAt(0)), "|".charCodeAt(0));
    } else if (s.key > 0 && s.key <= 0xff) {
      // keycode 0 would read as the string terminator
      out.push(PREFIX, OP[s.type], s.key);
    }
  }
  return out;
}

export function decodeMacro(bytes: ArrayLike<number>): Step[] {
  const steps: Step[] = [];
  let i = 0;
  const pushText = (c: number) => {
    const last = steps[steps.length - 1];
    if (last?.type === "text") last.text += String.fromCharCode(c);
    else steps.push({ type: "text", text: String.fromCharCode(c) });
  };
  while (i < bytes.length && bytes[i] !== 0) {
    const c = bytes[i++];
    if (c !== PREFIX) {
      if (isPrintable(c)) pushText(c);
      continue;
    }
    const op = bytes[i++];
    if (op === OP.delay) {
      let ms = 0;
      while (i < bytes.length && bytes[i] >= 0x30 && bytes[i] <= 0x39) ms = ms * 10 + (bytes[i++] - 0x30);
      if (bytes[i] === "|".charCodeAt(0)) i++;
      steps.push({ type: "delay", ms });
    } else if (op === OP.tap || op === OP.down || op === OP.up) {
      const key = bytes[i++];
      steps.push({ type: op === OP.tap ? "tap" : op === OP.down ? "down" : "up", key });
    }
  }
  return steps;
}

// Split the whole EEPROM buffer into `count` macros
export function splitMacros(buffer: Uint8Array, count: number): Step[][] {
  const macros: Step[][] = [];
  let start = 0;
  for (let n = 0; n < count; n++) {
    let end = start;
    while (end < buffer.length && buffer[end] !== 0) end++;
    macros.push(start < buffer.length ? decodeMacro(buffer.subarray(start, end)) : []);
    start = end + 1;
  }
  return macros;
}

export function joinMacros(macros: Step[][]): number[] {
  return macros.flatMap((m) => [...encodeMacro(m), 0]);
}
