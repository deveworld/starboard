#!/usr/bin/env python3
"""Generate web/app/configure/qmk.generated.ts from a QMK checkout.

Every value is produced by compiling a small host program against the QMK
headers (and Starboard's own config.h), so the configurator speaks exactly the
keycode numbers, RGB mode numbers and OLED font the firmware was built with.

usage: web/scripts/gen-qmk-data.py [QMK_HOME]   (default: ~/qmk_firmware)
"""

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "web/app/configure/qmk.generated.ts"
KB_CONFIG = REPO / "Firmware/qmk/starboard/config.h"

# Primary keycode names worth offering in a macropad configurator
NAME_FILTER = re.compile(r"^(KC_\w+|QK_MOUSE_\w+|QK_UNDERGLOW_\w+|QK_MACRO_\d+|QK_BOOTLOADER|QK_REBOOT)$")

# Range bases and modifier flags the encoder/decoder is built from
RANGES = [
    "QK_BASIC", "QK_BASIC_MAX", "QK_MODS", "QK_MODS_MAX", "QK_LAYER_TAP", "QK_LAYER_TAP_MAX",
    "QK_TO", "QK_TO_MAX", "QK_MOMENTARY", "QK_MOMENTARY_MAX", "QK_TOGGLE_LAYER", "QK_TOGGLE_LAYER_MAX",
    "QK_ONE_SHOT_LAYER", "QK_ONE_SHOT_LAYER_MAX", "QK_MACRO", "QK_MACRO_MAX",
    "QK_LCTL", "QK_LSFT", "QK_LALT", "QK_LGUI", "QK_RMODS_MIN",
]

# Composite keycodes the TypeScript encoder must reproduce bit-for-bit
VECTORS = [
    "MO(1)", "MO(3)", "TG(2)", "TO(0)", "TO(3)", "OSL(1)",
    "LT(1, KC_A)", "LT(3, KC_SPACE)", "LCTL(KC_C)", "LSFT(KC_1)", "LALT(KC_TAB)", "LGUI(KC_L)",
    "LCTL(LSFT(KC_ESCAPE))", "RCTL(KC_Z)", "RALT(KC_E)", "QK_MACRO_0", "QK_MACRO_15",
]


def main() -> None:
    qmk = Path(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/qmk_firmware"))
    commit = subprocess.check_output(["git", "-C", qmk, "rev-parse", "--short=8", "HEAD"], text=True).strip()

    header = (qmk / "quantum/keycodes.h").read_text()
    body = header[header.index("enum qk_keycode_defines"):]
    body = body[: body.index("};")]
    names = [n for n in re.findall(r"^\s+(\w+)\s*=\s*0x[0-9A-Fa-f]+,", body, re.M) if NAME_FILTER.match(n)]

    rgb_modes = re.findall(r"_RGBM_(?:SINGLE|MULTI)_(?:STATIC|DYNAMIC)\((\w+)\)",
                           (qmk / "quantum/rgblight/rgblight_modes.h").read_text())
    multi = set(re.findall(r"_RGBM_TMP_(?:STATIC|DYNAMIC)\((\w+)_end,", (qmk / "quantum/rgblight/rgblight_modes.h").read_text()))

    lines = [
        '#include <stdio.h>',
        '#define PROGMEM',
        f'#include "{KB_CONFIG}"',
        '#include "quantum_keycodes.h"',
        '#define _RGBM_SINGLE_STATIC(sym) RGBLIGHT_MODE_##sym,',
        '#define _RGBM_SINGLE_DYNAMIC(sym) RGBLIGHT_MODE_##sym,',
        '#define _RGBM_MULTI_STATIC(sym) RGBLIGHT_MODE_##sym,',
        '#define _RGBM_MULTI_DYNAMIC(sym) RGBLIGHT_MODE_##sym,',
        '#define _RGBM_TMP_STATIC(sym, msym) RGBLIGHT_MODE_##sym,',
        '#define _RGBM_TMP_DYNAMIC(sym, msym) RGBLIGHT_MODE_##sym,',
        'enum { RGBLIGHT_MODE_zero = 0,',
        '#include "rgblight_modes.h"',
        'RGBLIGHT_MODE_last };',
        '#include "glcdfont.c"',
        'int main(void) {',
        'printf("{\\"keycodes\\":{");',
    ]
    for i, n in enumerate(names):
        lines.append(f'printf("{"," if i else ""}\\"{n}\\":%d", (int)({n}));')
    lines.append('printf("},\\"ranges\\":{");')
    for i, n in enumerate(RANGES):
        lines.append(f'printf("{"," if i else ""}\\"{n}\\":%d", (int)({n}));')
    lines.append('printf("},\\"vectors\\":{");')
    for i, v in enumerate(VECTORS):
        lines.append(f'printf("{"," if i else ""}\\"{v}\\":%d", (int)({v}));')
    lines.append('printf("},\\"rgb\\":[");')
    for m in rgb_modes:
        # Only effects compiled into Starboard's firmware exist in the enum
        guard = "" if m == "STATIC_LIGHT" else f"RGBLIGHT_EFFECT_{m}"
        # X_end names the last variant itself, not one past it
        count = f"(RGBLIGHT_MODE_{m}_end - RGBLIGHT_MODE_{m} + 1)" if m in multi else "1"
        stmt = f'printf("%s{{\\"name\\":\\"{m}\\",\\"mode\\":%d,\\"variants\\":%d}}", first ? "" : ",", (int)RGBLIGHT_MODE_{m}, (int){count}); first = 0;'
        lines.append(f"#if {'1' if not guard else 'defined(' + guard + ')'}\n{stmt}\n#endif")
    lines.insert(lines.index('printf("},\\"rgb\\":[");') + 1, "int first = 1;")
    lines += [
        'printf("],\\"rgbLimitVal\\":%d,\\"rgbLedCount\\":%d", RGBLIGHT_LIMIT_VAL, RGBLIGHT_LED_COUNT);',
        'printf(",\\"font\\":[");',
        'for (int i = 0x20 * 6; i < 0x7F * 6; i++) printf("%s%d", i == 0x20 * 6 ? "" : ",", font[i]);',
        'printf("]}");',
        "return 0; }",
    ]

    with tempfile.TemporaryDirectory() as tmp:
        src, exe = Path(tmp, "gen.c"), Path(tmp, "gen")
        src.write_text("\n".join(lines) + "\n")
        Path(tmp, "progmem.h").write_text("")  # glcdfont.c wants it; PROGMEM is defined above
        includes = [tmp, "quantum", "quantum/keymap_extras", "quantum/sequencer", "quantum/rgblight", "drivers/oled"]
        subprocess.run(["gcc", "-std=gnu11", "-w", *[f"-I{qmk / p}" for p in includes], "-o", exe, src], check=True)
        data = json.loads(subprocess.check_output([exe], text=True))

    ts = [
        f"// Generated by web/scripts/gen-qmk-data.py from qmk_firmware@{commit}. Do not edit.",
        "// Values come from compiling against the QMK headers and Starboard's config.h.",
        "",
        f'export const QMK_COMMIT = "{commit}";',
        "",
        f"export const KEYCODES = {json.dumps(data['keycodes'], indent=2)} as const;",
        "",
        "export type KeycodeName = keyof typeof KEYCODES;",
        "",
        f"export const RANGES = {json.dumps(data['ranges'], indent=2)} as const;",
        "",
        "// Composite keycodes as the C preprocessor computes them; the encoder is tested against these",
        f"export const VECTORS: Record<string, number> = {json.dumps(data['vectors'], indent=2)};",
        "",
        f"export const RGB_EFFECTS = {json.dumps(data['rgb'], indent=2)} as const;",
        "",
        f"export const RGB_LIMIT_VAL = {data['rgbLimitVal']};",
        f"export const RGB_LED_COUNT = {data['rgbLedCount']};",
        "",
        "// QMK glcdfont, 6 column bytes per glyph for 0x20..0x7E, LSB = top pixel",
        f"export const FONT = new Uint8Array({json.dumps(data['font'])});",
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(ts))
    print(f"wrote {OUT.relative_to(REPO)}: {len(data['keycodes'])} keycodes, {len(data['rgb'])} RGB effects, "
          f"{len(data['font']) // 6} glyphs (qmk {commit})")


if __name__ == "__main__":
    main()
