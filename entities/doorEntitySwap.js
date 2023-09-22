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

import {GameEntity} from '../game.js';

// DoorEntity - has collision
class DoorEntitySwap extends GameEntity {
  static FILL_COLOR = '#e64cb0';
  constructor(game_context, x, y, w, h) {
    super(game_context, x, y);
    this.#width = w;
    this.#height = h;
    this.#animation_alpha = 1;
  }
  Update(ctx) {
    const window = this.GetOwningGameWindow().GetWindow();
    const currentScreen = window.GetScreenDetails()?.currentScreen ||
        window.GetDomWindow().screen;
    if (this.#prev_screen === undefined)
      this.#prev_screen = currentScreen;
    if (this.#prev_screen != currentScreen ||
        this.GetOwningGameWindow().GetMsSinceTeleport() < 1000) {
      this.#animation_alpha = 0;
    }
    if (this.#animation_alpha < 1) {
      this.#animation_alpha += 0.01;
    }
    this.#prev_screen = currentScreen;
  }
  Draw(ctx) {
    ctx.fillStyle = DoorEntitySwap.FILL_COLOR;
    ctx.globalAlpha = this.#animation_alpha;
    ctx.fillRect(this.GetX(), this.GetY(), this.#width, this.#height);
    ctx.strokeStyle = '#38063d';
    ctx.strokeRect(this.GetX(), this.GetY(), this.#width, this.#height);
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 1;
  }
  GetCollisionBox() {
    return {
      x1: this.GetX(),
      y1: this.GetY(),
      x2: this.GetX() + this.#width,
      y2: this.GetY() + this.#height,
      isBlocking: this.#animation_alpha >= 1,
    };
  }
  GetHeight() {
    return this.#height;
  }
  GetWidth() {
    return this.#width;
  }
  #width;
  #height;
  #prev_screen;
  #animation_alpha;
}

export {DoorEntitySwap};