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
#    define OLED_LINES 4
#    define OLED_LINE_CHARS 21

enum oled_mode {
    OLED_MODE_STATUS,
    OLED_MODE_TEXT,
    OLED_MODE_OFF,
    OLED_MODE_COUNT
};

// Persisted in the EEPROM user datablock; all zeroes (a fresh block) means status mode
typedef struct {
    uint8_t mode;
    char    lines[OLED_LINES][OLED_LINE_CHARS];
} oled_config_t;

_Static_assert(sizeof(oled_config_t) == EECONFIG_USER_DATA_SIZE, "EECONFIG_USER_DATA_SIZE must match oled_config_t");

static oled_config_t oled_config;

static const char *const layer_labels[] = {"Layer: BASE", "Layer: FN", "Layer: 2", "Layer: 3"};

void keyboard_post_init_user(void) {
    eeconfig_read_user_datablock(&oled_config, 0, sizeof(oled_config));
}

oled_rotation_t oled_init_user(oled_rotation_t rotation) {
    return OLED_ROTATION_180;
}

// Write a full-width line so stale characters are overwritten; unprintable bytes render as spaces
static void render_line(uint8_t line, const char *text) {
    char    buf[OLED_LINE_CHARS + 1];
    uint8_t i = 0;
    for (; i < OLED_LINE_CHARS && text[i]; i++) {
        buf[i] = (text[i] >= ' ' && text[i] <= '~') ? text[i] : ' ';
    }
    for (; i < OLED_LINE_CHARS; i++) {
        buf[i] = ' ';
    }
    buf[OLED_LINE_CHARS] = '\0';
    oled_set_cursor(0, line);
    oled_write(buf, false);
}

bool oled_task_user(void) {
    switch (oled_config.mode) {
        case OLED_MODE_OFF:
            oled_off();
            break;
        case OLED_MODE_TEXT:
            for (uint8_t i = 0; i < OLED_LINES; i++) {
                render_line(i, oled_config.lines[i]);
            }
            break;
        default: {
            uint8_t layer = get_highest_layer(layer_state);
            render_line(0, "Starboard");
            render_line(1, layer < ARRAY_SIZE(layer_labels) ? layer_labels[layer] : "Layer: ?");
            render_line(2, "XIAO RP2040");
            render_line(3, "");
            break;
        }
    }
    return false;
}

#    ifdef VIA_ENABLE
// VIA custom channel values, used by the web configurator
enum starboard_custom_value_id {
    id_oled_mode   = 1,
    id_oled_line_0 = 2, // lines 0-3 are ids 2-5; a line's 21 chars fit the 29 data bytes of a 32-byte packet
};

void via_custom_value_command_kb(uint8_t *data, uint8_t length) {
    // data = [ command_id, channel_id, value_id, value_data ]
    uint8_t *command_id = &(data[0]);
    uint8_t *channel_id = &(data[1]);
    uint8_t *value_id   = &(data[2]);
    uint8_t *value_data = &(data[3]);

    if (*channel_id == id_custom_channel) {
        bool is_line = *value_id >= id_oled_line_0 && *value_id < id_oled_line_0 + OLED_LINES;
        char *line   = is_line ? oled_config.lines[*value_id - id_oled_line_0] : NULL;

        switch (*command_id) {
            case id_custom_set_value:
                if (*value_id == id_oled_mode) {
                    oled_config.mode = value_data[0] < OLED_MODE_COUNT ? value_data[0] : OLED_MODE_STATUS;
                    return;
                }
                if (is_line) {
                    memcpy(line, value_data, OLED_LINE_CHARS);
                    return;
                }
                break;
            case id_custom_get_value:
                if (*value_id == id_oled_mode) {
                    value_data[0] = oled_config.mode;
                    return;
                }
                if (is_line) {
                    memcpy(value_data, line, OLED_LINE_CHARS);
                    return;
                }
                break;
            case id_custom_save:
                eeconfig_update_user_datablock(&oled_config, 0, sizeof(oled_config));
                return;
        }
    }

    *command_id = id_unhandled;
}
#    endif
#endif
