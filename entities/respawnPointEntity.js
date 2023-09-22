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

import {PLAYER_HEIGHT, PLAYER_WIDTH} from './playerEntity.js';

class RespawnPointEntity extends GameEntity {
  constructor(game_context, x, y) {
    super(game_context, x, y);
  }
  Draw(ctx) {
    ctx.strokeStyle = '#FF0000';
    ctx.fillStyle = '#FF0000';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(
        this.GetX() + ((PLAYER_WIDTH / 2) - 2), this.GetY(), 4, PLAYER_HEIGHT);
    ctx.fillRect(
        this.GetX(), this.GetY() + ((PLAYER_HEIGHT / 2) - 2), PLAYER_WIDTH, 4);
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 1;
  }
}

export {RespawnPointEntity};
