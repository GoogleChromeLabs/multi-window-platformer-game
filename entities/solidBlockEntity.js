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

// SolidBlockEntity - has collision
class SolidBlockEntity extends GameEntity {
  static fillColor = '#cb4c2d';
  constructor(game_context, x, y, w, h) {
    super(game_context, x, y);
    this.#width = w;
    this.#height = h;
  }
  Draw(ctx) {
    ctx.fillStyle = SolidBlockEntity.fillColor;
    ctx.fillRect(this.GetX(), this.GetY(), this.#width, this.#height);
    // Get all other blocks that are somewhat close to this one.
    const other_blocks = this.GetGameContext().GetEntities().filter(
        e => e.constructor == SolidBlockEntity &&
            Math.abs(e.GetX() - this.GetX()) < 60 &&
            Math.abs(e.GetY() - this.GetY()) < 60);
    ctx.strokeStyle = '000000';
    ctx.lineWidth = 0.5;
    // If no adjacent blocks below, draw a line.
    if (other_blocks
            .filter(
                e => e.GetX() == this.GetX() &&
                    e.GetY() == this.GetY() + this.GetHeight())
            .length == 0) {
      ctx.beginPath();
      ctx.moveTo(this.GetX(), this.GetY() + this.#height);
      ctx.lineTo(this.GetX() + this.#width, this.GetY() + this.#height);
      ctx.stroke();
    }
    // If no adjacent blocks left, draw a line.
    if (other_blocks
            .filter(
                e => e.GetY() == this.GetY() &&
                    e.GetX() == this.GetX() - e.GetWidth())
            .length == 0) {
      ctx.beginPath();
      ctx.moveTo(this.GetX(), this.GetY());
      ctx.lineTo(this.GetX(), this.GetY() + this.#height);
      ctx.stroke();
    }
    // If no adjacent blocks right, draw a line.
    if (other_blocks
            .filter(
                e => e.GetY() == this.GetY() &&
                    e.GetX() == this.GetX() + this.GetWidth())
            .length == 0) {
      ctx.beginPath();
      ctx.moveTo(this.GetX() + this.#width, this.GetY());
      ctx.lineTo(this.GetX() + this.#width, this.GetY() + this.#height);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    // If no adjacent blocks above, draw grass.
    if (other_blocks
            .filter(
                e => e.GetX() == this.GetX() &&
                    e.GetY() == this.GetY() - e.GetHeight())
            .length == 0) {
      ctx.fillStyle = '#308a35';
      ctx.fillRect(this.GetX(), this.GetY(), this.#width, 7);
    }
  }
  GetCollisionBox() {
    return {
      x1: this.GetX(),
      y1: this.GetY(),
      x2: this.GetX() + this.#width,
      y2: this.GetY() + this.#height,
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
}

export {SolidBlockEntity};