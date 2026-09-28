// Plan-view geometry in millimetres, taken from PCB/starboard.kicad_pcb
// (switch courtyard centres, encoder courtyard, OLED silkscreen, LED pads).
// Origin is the PCB's top-left corner; the case is centred on the board.

export const BOARD = { w: 63, h: 63 };
export const CASE = { w: 83.8, h: 83.8, r: 4 };
export const CASE_ORIGIN = { x: (BOARD.w - CASE.w) / 2, y: (BOARD.h - CASE.h) / 2 };

const PCB_X = 137;
const PCB_Y = 50;
const at = (x: number, y: number) => ({ x: x - PCB_X, y: y - PCB_Y });

export const KEY_PITCH = 19;
export const KEYCAP = 18; // 1u DSA cap

// Matrix position -> centre; order follows keyboard.json's layout
export const KEYS = [
  { row: 0, col: 0, ...at(149.46, 81.58), name: "Top left" },
  { row: 0, col: 1, ...at(168.46, 81.58), name: "Top middle" },
  { row: 0, col: 2, ...at(187.46, 81.58), name: "Top right" },
  { row: 1, col: 0, ...at(149.46, 100.58), name: "Bottom left" },
  { row: 1, col: 1, ...at(168.46, 100.58), name: "Bottom middle" },
  { row: 1, col: 2, ...at(187.46, 100.58), name: "Bottom right" },
] as const;

export const ENCODER = { ...at(187.5, 60.5), knob: 6.5, press: { row: 2, col: 0 } } as const;

// 0.91" module outline and its approximate 128x32 active area (22.4 x 5.6 mm)
export const OLED_MODULE = { ...at(140, 54), w: 38, h: 12 };
export const OLED_ACTIVE = { ...at(142.3, 57.2), w: 22.4, h: 5.6 };

// SK6812 chain order D1..D6: along the top row, then back along the bottom row
export const LEDS = [
  at(149.5, 88),
  at(168.5, 88),
  at(187.5, 88),
  at(187.5, 107),
  at(168.5, 107),
  at(149.5, 107),
];
