# Starboard

QMK firmware for the Starboard macropad.

- Seeed XIAO RP2040
- 2x3 key matrix
- EC11 rotary encoder with push switch
- SSD1306 128x32 OLED over I2C
- 6 SK6812 MINI-E RGB LEDs

Build:

```sh
qmk compile -kb starboard -km default
```

Flash the generated UF2 by entering the bootloader (hold FN and press the top-left key, or hold the top-left key while plugging in USB), then copying the UF2 onto the `RPI-RP2` drive.

The default keymap enables VIA; configure it at <https://deveworld.github.io/starboard/configure/>.
