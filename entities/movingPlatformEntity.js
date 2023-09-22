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

import {BLACK_COLOR} from '../constants.js';
import {GameEntity} from '../game.js';

const DIRECTION = {
  FORWARD: 1,
  BACKWARD: -1,
};
class MovingPlatformEntity extends GameEntity {
  static FILL_COLOR = '#fc8803';
  constructor(gameContext, x, y, w, h, angle, distance, time) {
    super(gameContext, x, y);
    this.#width = w;
    this.#height = h;
    this.#direction = DIRECTION.FORWARD;
    this.SetMoveBehavior(angle, distance, time);
  }
  Update(game_context) {
    // Check if the new position would go past the move boundaries of this
    // platform.
    this.#checkIfDirectionShouldChange(game_context);
    let ddx = this.GetX() + this.#dx * this.#direction;
    let ddy = this.GetY() + this.#dy * this.#direction;

    const myBox = this.GetCollisionBox();
    // Check if the platform would interact with the player's collision box.
    for (const entity of game_context.GetEntities()) {
      if (entity === this || !entity.GetCollisionBox)
        continue;
      const pBox = entity.GetCollisionBox();
      // For now, the player entity is the only one with this method.
      if (!entity.IsOnGround)
        continue;
      // Check if the player is on the platform.
      if (myBox.x1 > pBox.x2 || myBox.x2 < pBox.x1 || myBox.y1 > pBox.y2 ||
          myBox.y2 < pBox.y1) {
        continue;
      }
      // Move the player according to the horizontal movement of this platform.
      // Use the top y-coordinate of the platform to ensure that the player
      // is standing on top of it.
      const pdx = entity.GetX() + this.#dx * this.#direction;
      const pdy = entity.GetY() + this.#dy * this.#direction;
      entity.SetPosition(pdx, pdy);
    }
    this.SetPosition(ddx, ddy);
  }
  Draw(ctx) {
    ctx.fillStyle = MovingPlatformEntity.FILL_COLOR;
    ctx.fillRect(this.GetX(), this.GetY(), this.#width, this.#height);
    ctx.strokeStyle = BLACK_COLOR;
    ctx.strokeRect(this.GetX(), this.GetY(), this.#width, this.#height);

    // Draw the path of the platform
    ctx.strokeStyle = '#CCCCCC';
    const midX = this.#width / 2;
    const midY = this.#height / 2;
    ctx.beginPath();
    ctx.moveTo(this.#x1 + midX, this.#y1 + midY);
    ctx.lineTo(this.#x2 + midX, this.#y2 + midY);
    ctx.stroke();
  }
  OnWindowMove(delta_x, delta_y) {
    this.#x1 += delta_x;
    this.#x2 += delta_x;
    this.#y1 += delta_y;
    this.#y2 += delta_y;
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
  SetMoveBehavior(angle_deg, distance, time) {
    this.#move_angle_rad = (angle_deg * Math.PI) / 180;
    this.#move_distance = distance;
    this.#move_time = time;

    // The starting point may actually be the end point depending on the move
    // angle.
    let xDirection = Math.cos(this.#move_angle_rad);
    let yDirection = Math.sin(this.#move_angle_rad);

    this.#x1 = this.GetX();
    this.#y1 = this.GetY();
    this.#x2 = this.GetX() + xDirection * this.#move_distance;
    this.#y2 = this.GetY() + yDirection * this.#move_distance;
    this.#dx = (this.#x2 - this.#x1) / this.#move_time;
    this.#dy = (this.#y2 - this.#y1) / this.#move_time;
  }
  #checkIfDirectionShouldChange(game_context) {
    const xDiff = this.#x2 - this.#x1;
    const yDiff = this.#y2 - this.#y1;

    if (xDiff >= 0) {
      if (yDiff >= 0) {
        // (x2, y2) are both larger than (x1, y1)
        if (this.GetX() < this.#x1 || this.GetY() < this.#y1) {
          this.#direction = DIRECTION.FORWARD;
          this.SetPosition(this.#x1, this.#y1);
          return;
        }
        if (this.GetX() > this.#x2 || this.GetY() > this.#y2) {
          this.#direction = DIRECTION.BACKWARD;
          this.SetPosition(this.#x2, this.#y2);
          return;
        }
      } else {
        // x2 is larger than x1, y2 is smaller than y1
        if (this.GetX() < this.#x1 || this.GetY() > this.#y1) {
          this.#direction = DIRECTION.FORWARD;
          this.SetPosition(this.#x1, this.#y1);
          return;
        }
        if (this.GetX() > this.#x2 || this.GetY() < this.#y2) {
          this.#direction = DIRECTION.BACKWARD;
          this.SetPosition(this.#x2, this.#y2);
          return;
        }
      }
    } else {
      if (yDiff >= 0) {
        // x2 is smaller than x1, y2 is larger than y1
        if (this.GetX() > this.#x1 || this.GetY() < this.#y1) {
          this.#direction = DIRECTION.FORWARD;
          this.SetPosition(this.#x1, this.#y1);
          return;
        }
        if (this.GetX() < this.#x2 || this.GetY() > this.#y2) {
          this.#direction = DIRECTION.BACKWARD;
          this.SetPosition(this.#x2, this.#y2);
          return;
        }
      } else {
        // (x2, y2) are both smaller than (x1, y1)
        if (this.GetX() > this.#x1 || this.GetY() > this.#y1) {
          this.#direction = DIRECTION.FORWARD;
          this.SetPosition(this.#x1, this.#y1);
          return;
        }
        if (this.GetX() < this.#x2 || this.GetY() < this.#y2) {
          this.#direction = DIRECTION.BACKWARD;
          this.SetPosition(this.#x2, this.#y2);
          return;
        }
      }
    }
  }

  #move_angle_rad;
  #move_time;
  #move_distance;
  #width;
  #height;
  #x1;
  #y1;
  #x2;
  #y2;
  #dx;
  #dy;
  #direction;
}

export {MovingPlatformEntity};
