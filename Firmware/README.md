# Starboard Firmware

This directory contains QMK firmware for Starboard.

Current target:

- MCU: Seeed XIAO RP2040
- Firmware: QMK
- Features: 6-key matrix, encoder rotation, encoder press, SSD1306 OLED, SK6812 RGB lighting
- Configuration: VIA protocol (4 dynamic layers, encoder map, 16 macros, RGB lighting), used by the web configurator at <https://deveworld.github.io/starboard/configure/>

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

To flash, enter the bootloader and copy the generated `.uf2` file to the mounted `RPI-RP2` drive. On an assembled board, hold FN (bottom-right key) and press the top-left key (`QK_BOOT`), or hold the top-left key while plugging in USB (bootmagic). A bare XIAO can also use its BOOT button.

## Configurator protocol

Starboard answers standard VIA raw-HID commands (usage page `0xFF60`, usage `0x61`, 32-byte reports). OLED settings use VIA's custom channel `0`, handled in `keymaps/default/keymap.c` and stored in the EEPROM user datablock:

| Value id | Data | Meaning |
| ---: | --- | --- |
| `1` | 1 byte | Display mode: `0` status, `1` custom text, `2` off |
| `2`–`5` | 21 bytes | Custom text lines 1–4, printable ASCII |

`id_custom_set_value` applies a value immediately, `id_custom_save` persists all of them. The web app regenerates its keycode and RGB-mode tables from the QMK headers with `web/scripts/gen-qmk-data.py`, and `web/scripts/hw-test.mts` exercises the protocol against a connected board over Linux hidraw.

On Linux, give your user access to the raw HID interface once:

```sh
echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="5354", ATTRS{idProduct}=="0001", TAG+="uaccess"' | sudo tee /etc/udev/rules.d/60-starboard.rules
sudo udevadm control --reload && sudo udevadm trigger
```
