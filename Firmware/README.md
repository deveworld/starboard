# Starboard Firmware

This directory contains QMK firmware for Starboard.

Current target:

- MCU: Seeed XIAO RP2040
- Firmware: QMK
- Features: 6-key matrix, encoder rotation, encoder press, SSD1306 OLED, SK6812 RGB lighting

The current PCB uses a XIAO RP2040, which has no BLE radio. ZMK is a good fit for a future wireless revision with a BLE-capable controller such as a XIAO nRF52840, but this hardware is better served by QMK.

The source archive for submission is `production/firmware-qmk.zip`. A compiled UF2 is available at `production/firmware.uf2`.

## Build

Copy `Firmware/qmk/starboard` into a QMK checkout under `keyboards/starboard`, then build:

```sh
qmk compile -kb starboard -km default
```

or:

```sh
make starboard:default
```

To flash, hold BOOT while plugging in the XIAO RP2040, then copy the generated `.uf2` file to the mounted bootloader drive.
