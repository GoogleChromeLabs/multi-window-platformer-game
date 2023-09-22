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
class DoorEntity extends GameEntity {
  constructor(game_context, x, y, w, h) {
    super(game_context, x, y);
    this.#width = w;
    this.#height = h;
    this.#animation_height = this.#height;
  }
  Update(ctx) {
    const window = this.GetOwningGameWindow().GetWindow();
    const currentScreen = window.GetScreenDetails()?.currentScreen ||
        window.GetDomWindow().screen;
    if (this.#initial_screen === undefined)
      this.#initial_screen = currentScreen;
    if (currentScreen != this.#initial_screen ||
        this.GetOwningGameWindow().GetMsSinceTeleport() < 1500) {
      this.#animation_height = Math.max(this.#animation_height - 1, 0);
    } else {
      this.#animation_height =
          Math.min(this.#animation_height + 1, this.#height);
    }
  }
  Draw(ctx) {
    ctx.fillStyle = '#9c00ad';
    ctx.fillRect(this.GetX(), this.GetY(), this.#width, this.#animation_height);
    ctx.strokeStyle = '#38063d';
    ctx.strokeRect(this.GetX(), this.GetY(), this.#width, this.#height);
    ctx.strokeStyle = '#000000';
  }
  GetCollisionBox() {
    return {
      x1: this.GetX(),
      y1: this.GetY(),
      x2: this.GetX() + this.#width,
      y2: this.GetY() + this.#animation_height,
      isBlocking: true,
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
  #initial_screen;
  #animation_height;
}

export {DoorEntity};