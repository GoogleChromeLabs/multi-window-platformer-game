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
import {MultiScreenUtil} from '../multiScreen.js';
import {PlaySound} from '../sound.js';

import {RespawnPointEntity} from './respawnPointEntity.js';
import {RippleEntity} from './rippleEntity.js';

// TODO: Tune these as appropriate
const PhysicalConstants = {
  max_player_dx: 4,
  max_player_dy: 15,
  gravity_ddy: 0.2,
  move_ddx: 0.4,  // TODO: Different ddx for ground vs. air?
  friction_ddx: 0.3,
  jump_ddy: -4,
};

function Clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

const RESPAWN_TIME = 1000;  // ms

const PLAYER_WIDTH = 16,
      PLAYER_HEIGHT = 16;  // TODO: Make these properties.

// Simple entity draws a cube and is moved with the arrow keys.
class PlayerEntity extends GameEntity {
  constructor(game_context, x, y) {
    super(game_context, x, y);
    this.SetZOrder(2);
    this.#dx = 0;
    this.#dy = 0;
    // Animate a ripple when the player spawns.
    game_context.AddEntity(new RippleEntity(game_context, x, y));
  }
  async Update(context) {
    // Skip input & physics if respawning.
    if (this.#respawn_timeout_id)
      return;

    const screenBoundaries = await MultiScreenUtil.GetMultiScreenBoundaries();

    // Within this scope:
    // * player position must not change
    // * output is updated velocity #dx/#dy
    {
      const on_ground = this.IsOnGround(context);
      let ddx = 0, ddy = 0;

      // Handle input
      var left = 0, right = 0, jump = 0;
      if (context.InputManager().IsKeyDown('ArrowRight')) {
        right = 1;
      }
      if (context.InputManager().IsKeyDown('ArrowLeft')) {
        left = 1;
      }
      if (context.InputManager().IsKeyDown(' ')) {
        jump = 1;
      }
      if (context.InputManager().WasKeyPressed('r')) {
        context.AddEntity(new RippleEntity(context, this.GetX(), this.GetY()));
        PlaySound('roar', await this.GetPan());
      }

      // Map input to acceleration
      if (right) {
        ddx = PhysicalConstants.move_ddx * right;
      }
      if (left) {
        ddx = -PhysicalConstants.move_ddx * left;
      }
      if (jump) {
        if (on_ground) {
          PlaySound('jump', await this.GetPan());
          ddy = PhysicalConstants.jump_ddy;
        }
      }

      // Acceleration / limiting
      let friction_ddx =
          Math.min(PhysicalConstants.friction_ddx, Math.abs(this.#dx));
      ddx -= Math.sign(this.#dx) * friction_ddx;

      ddy += PhysicalConstants.gravity_ddy;
      if (on_ground && ddy > 0) {
        ddy = 0;
      }

      this.#dx = Clamp(
          this.#dx + ddx, -PhysicalConstants.max_player_dx,
          PhysicalConstants.max_player_dx);
      this.#dy = Clamp(
          this.#dy + ddy, -PhysicalConstants.max_player_dy,
          PhysicalConstants.max_player_dy);
    }

    // At this point, #dx and #dy have been updated, but
    // the position has not yet been changed.

    const my = this.GetCollisionBox();

    // Reset player to respawn point if out of bounds.
    if (my.y1 > screenBoundaries.bottom || my.y2 < screenBoundaries.top ||
        my.x1 < screenBoundaries.left || my.x2 > screenBoundaries.right) {
      this.Respawn();
    }

    // Horizontal collision
    if (this.#dx) {
      my.x1 += this.#dx;
      my.x2 += this.#dx;

      for (const entity of context.GetEntities()) {
        if (entity === this || !entity.GetCollisionBox)
          continue;
        if (entity.GetOwningGameWindow() != this.GetOwningGameWindow())
          continue;
        const box = entity.GetCollisionBox();
        if (my.x1 >= box.x2 || my.x2 <= box.x1 || my.y1 >= box.y2 ||
            my.y2 <= box.y1) {
          continue;
        }
        if (box.onCollision) {
          box.onCollision(context, this);
        }
        if (box.isBlocking) {
          let yDiff = Math.abs(my.y2 - box.y1);
          if (yDiff < 1) {
            continue;
          }
          // console.log('horizontal collision');
          PlaySound('h-collision', await this.GetPan());
          // Check here if the y positions are close enough to pop the player
          // upwards instead.
          if (this.#dx < 0) {
            my.x1 = box.x2;
            my.x2 = my.x1 + PLAYER_WIDTH;
          } else {
            my.x2 = box.x1;
            my.x1 = my.x2 - PLAYER_WIDTH;
          }
          this.#dx = 0;
        }
      }
    }

    // Vertical collision
    if (this.#dy) {
      my.y1 += this.#dy;
      my.y2 += this.#dy;

      for (const entity of context.GetEntities()) {
        if (entity === this || !entity.GetCollisionBox)
          continue;
        if (entity.GetOwningGameWindow() != this.GetOwningGameWindow())
          continue;
        const box = entity.GetCollisionBox();
        if (my.x1 >= box.x2 || my.x2 <= box.x1 || my.y1 >= box.y2 ||
            my.y2 <= box.y1) {
          continue;
        }
        if (box.onCollision) {
          box.onCollision(context, this);
        }
        if (box.isBlocking) {
          // console.log("vertical collision");
          PlaySound('v-collision', await this.GetPan());
          if (this.#dy < 0) {
            my.y1 = box.y2;
            my.y2 = my.y1 + PLAYER_HEIGHT;
          } else {
            my.y2 = box.y1;
            my.y1 = my.y2 - PLAYER_HEIGHT;
          }
          this.#dy = 0;
        }
      }
    }

    this.SetPosition(my.x1, my.y1);
  }
  Draw(ctx) {
    // Don't draw if respawning.
    if (this.#respawn_timeout_id)
      return;

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(this.GetX(), this.GetY(), PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  // Physics
  GetCollisionBox() {
    return {
      x1: this.GetX(),
      y1: this.GetY(),
      x2: this.GetX() + PLAYER_WIDTH,
      y2: this.GetY() + PLAYER_HEIGHT,
      isBlocking: true,
    };
  }
  IsOnGround(context) {
    const my = this.GetCollisionBox();

    for (const entity of context.GetEntities()) {
      if (entity === this || !entity.GetCollisionBox)
        continue;
      if (entity.GetOwningGameWindow() != this.GetOwningGameWindow())
        continue;
      const box = entity.GetCollisionBox();
      if (my.x1 >= box.x2 || my.x2 <= box.x1)
        continue;
      if (my.y2 === box.y1)
        return true;
    }
    return false;
  }
  SetOwningGameWindow(game) {
    super.SetOwningGameWindow(game);
    game.GetWindow().Focus();
  }

  async Respawn() {
    // Already queued?
    if (this.#respawn_timeout_id)
      return;
    PlaySound('fall', await this.GetPan());
    this.#respawn_timeout_id = setTimeout(() => {
      this.#respawn_timeout_id = 0;
      let context = this.GetGameContext();
      let respawn =
          context.GetEntities().find(e => e.constructor == RespawnPointEntity);
      this.SetPosition(respawn.GetX(), respawn.GetY());
      this.#dx = 0;
      this.#dy = 0;
      // Animate a ripple when the player respawns.
      context.AddEntity(
          new RippleEntity(context, respawn.GetX(), respawn.GetY()));
    }, RESPAWN_TIME);
  }

  async GetPan() {
    const screenBoundaries = await MultiScreenUtil.GetMultiScreenBoundaries();

    // Fraction of distance from left edge to right edge of bounds.
    const f = (this.GetX() - screenBoundaries.left) /
        (screenBoundaries.right - screenBoundaries.left);

    // Map to -1.0 ... +1.0
    return f * 2.0 - 1.0;
  }


  #dx;
  #dy;
  #respawn_timeout_id;
}

export {PlayerEntity, PLAYER_HEIGHT, PLAYER_WIDTH};
