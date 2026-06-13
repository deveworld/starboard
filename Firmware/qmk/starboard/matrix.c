/* Copyright 2026 Starboard
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

#include "matrix.h"
#include "gpio.h"

static const pin_t row_pins[2] = {GP29, GP28};
static const pin_t col_pins[MATRIX_COLS] = {GP3, GP4, GP1};
static const pin_t encoder_switch_pin = GP0;

static void select_row(uint8_t row) {
    gpio_set_pin_output(row_pins[row]);
    gpio_write_pin_low(row_pins[row]);
}

static void unselect_row(uint8_t row) {
    gpio_set_pin_input_high(row_pins[row]);
}

static matrix_row_t read_cols(void) {
    matrix_row_t row_state = 0;

    for (uint8_t col = 0; col < MATRIX_COLS; col++) {
        if (!gpio_read_pin(col_pins[col])) {
            row_state |= (matrix_row_t)(1U << col);
        }
    }

    return row_state;
}

void matrix_init_custom(void) {
    for (uint8_t row = 0; row < 2; row++) {
        gpio_set_pin_input_high(row_pins[row]);
    }

    for (uint8_t col = 0; col < MATRIX_COLS; col++) {
        gpio_set_pin_input_high(col_pins[col]);
    }

    gpio_set_pin_input_high(encoder_switch_pin);
}

bool matrix_scan_custom(matrix_row_t current_matrix[]) {
    bool changed = false;

    for (uint8_t row = 0; row < 2; row++) {
        select_row(row);
        matrix_io_delay();

        matrix_row_t row_state = read_cols();

        unselect_row(row);

        if (current_matrix[row] != row_state) {
            current_matrix[row] = row_state;
            changed = true;
        }
    }

    matrix_row_t encoder_switch_state = gpio_read_pin(encoder_switch_pin) ? 0 : 1;
    if (current_matrix[2] != encoder_switch_state) {
        current_matrix[2] = encoder_switch_state;
        changed = true;
    }

    return changed;
}
