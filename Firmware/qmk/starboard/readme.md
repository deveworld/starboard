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

Flash the generated UF2 by plugging in the XIAO RP2040 while holding BOOT, then copying the UF2 onto the bootloader drive.
