/*
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import {Window} from './window.js';

class InputManager {
  constructor() {
    this.#key_is_down = new Set();
    this.#key_was_down = new Set();
    this.#mouse_coordinates = {mouseIsDown: false, x: 0, y: 0};
  }
  RegisterWindow(win) {
    win.GetDomWindow().addEventListener('keydown', (event) => {
      this.#onKeyDown(event);
    });
    win.GetDomWindow().addEventListener('keyup', (event) => {
      this.#onKeyUp(event);
    });
    win.GetDomWindow().addEventListener('mousedown', (event) => {
      this.#onMouseDown(event);
    });
    win.GetDomWindow().addEventListener('mouseup', (event) => {
      this.#onMouseUp(event);
    });
  }

  // Use this for "level-triggered" actions, e.g. movement
  IsKeyDown(key) {
    return this.#key_is_down.has(key);
  }

  // Use this for "edge-triggered" actions, e.g. teleport
  WasKeyPressed(key) {
    return this.#key_is_down.has(key) && !this.#key_was_down.has(key);
  }

  GetMouseCoordinates() {
    return this.#mouse_coordinates;
  }
  #onKeyDown(event) {
    this.#key_is_down.add(event.key);
  }
  #onKeyUp(event) {
    this.#key_is_down.delete(event.key);
  }

  // Called if all game windows lose focus; we won't see any keyup events,
  // so pretend all keys are released.
  LostFocus() {
    this.#key_is_down.clear();
  }

  // Called at the end of each "tick" to remember previous state
  Update() {
    this.#key_was_down = new Set(this.#key_is_down);

    const gamepads = navigator.getGamepads();
    if (gamepads) {
      const gamepad = gamepads.find(g => g);
      if (gamepad) {
        const buttons = gamepad.buttons.map(b => b.pressed);
        const BUTTON_MAPPING = {
          // A/X/B/Y
          0: ' ',
          1: ']',
          2: '[',
          3: 'e',

          // Left/Right Shoulder/Trigger
          4: 't',
          5: 'r',

          // Back/Start
          8: 'Escape',

          // D-Pad
          12: 'ArrowUp',
          13: 'ArrowDown',
          14: 'ArrowLeft',
          15: 'ArrowRight',
        };

        for (const [id, key] of Object.entries(BUTTON_MAPPING)) {
          if (buttons[id])
            this.#key_is_down.add(key);
          else if (this.#last_buttons?.[id])
            this.#key_is_down.delete(key);
        }
        this.#last_buttons = buttons;

        const axes = gamepad.axes.map(v => Math.sign(Math.round(v * 2)));
        const AXIS_MAPPING = {
          // Left analog stick
          0: ['ArrowLeft', 'ArrowRight'],
          1: ['ArrowUp', 'ArrowDown'],
          // Right analog stick
          2: ['a', 'd'],
          3: ['w', 's'],
        };
        for (const [id, keys] of Object.entries(AXIS_MAPPING)) {
          const key_index = axes[id] < 0 ? 0 : 1;
          if (axes[id]) {
            this.#key_is_down.add(keys[key_index]);
            this.#key_is_down.delete(keys[1 - key_index]);
          } else if (this.#last_axes?.[id]) {
            this.#key_is_down.delete(keys[0]);
            this.#key_is_down.delete(keys[1]);
          }
        }
        this.#last_axes = axes;
      }
    }
  }

  #onMouseDown(event) {
    this.#mouse_coordinates = {
      mouseIsDown: true,
      x: event.clientX,
      y: event.clientY,
    };
  }
  #onMouseUp(event) {
    this.#mouse_coordinates = {
      mouseIsDown: false,
      x: event.clientX,
      y: event.clientY,
    };
  }

  // Currently observed state
  #key_is_down;

  // State during last update
  #key_was_down;

  // Last gamepad button state
  #last_buttons;

  // Last gamepad axis state
  #last_axes;

  // Mouse state during last update. Includes whether the mouse is down and
  // X and Y coordinates relative to the DOM Window where the event was
  // generated.
  #mouse_coordinates;
};

export default InputManager;
