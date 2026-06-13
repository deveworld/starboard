/* Copyright 2026 Starboard
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

#include QMK_KEYBOARD_H

enum layers {
    _BASE,
    _FN
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [_BASE] = LAYOUT(
        KC_ESC,  KC_UP,   KC_AUDIO_MUTE, KC_MEDIA_PLAY_PAUSE,
        KC_LEFT, KC_DOWN, LT(_FN, KC_RIGHT)
    ),
    [_FN] = LAYOUT(
        QK_BOOT, QK_UNDERGLOW_TOGGLE, QK_UNDERGLOW_MODE_NEXT, KC_MEDIA_STOP,
        QK_UNDERGLOW_HUE_UP, QK_UNDERGLOW_SATURATION_UP, QK_UNDERGLOW_VALUE_UP
    )
};

#ifdef ENCODER_MAP_ENABLE
const uint16_t PROGMEM encoder_map[][NUM_ENCODERS][NUM_DIRECTIONS] = {
    [_BASE] = {ENCODER_CCW_CW(KC_AUDIO_VOL_DOWN, KC_AUDIO_VOL_UP)},
    [_FN] = {ENCODER_CCW_CW(QK_UNDERGLOW_VALUE_DOWN, QK_UNDERGLOW_VALUE_UP)}
};
#endif

#ifdef OLED_ENABLE
bool oled_task_user(void) {
    oled_write_ln_P(PSTR("Starboard"), false);

    switch (get_highest_layer(layer_state)) {
        case _FN:
            oled_write_ln_P(PSTR("Layer: FN"), false);
            break;
        default:
            oled_write_ln_P(PSTR("Layer: BASE"), false);
            break;
    }

    oled_write_ln_P(PSTR("XIAO RP2040"), false);
    return false;
}
#endif
