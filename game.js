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

class GameEntity {
  constructor(game_context, x, y) {
    this.#game_context = game_context;
    this.#is_shared = false;
    this.SetIsShared(false);
    this.SetPosition(x, y);
    this.SetZOrder(0);
  }
  async Update(ctx) {}
  Draw(ctx) {}
  SetPosition(x, y) {
    this.#x = x;
    this.#y = y;
  }
  GetX() {
    return this.#x;
  }
  GetY() {
    return this.#y;
  }
  GetZOrder() {
    return this.#z_order;
  }
  SetZOrder(z_order) {
    this.#z_order = z_order;
  }
  SetIsShared(shared) {
    this.#is_shared = shared;
  }
  IsShared() {
    return this.#is_shared;
  }
  SetOwningGameWindow(game) {
    this.#owning_game = game;
  }
  GetOwningGameWindow() {
    return this.#owning_game;
  }
  ReleaseOwningGameWindow(game) {
    this.#owning_game = undefined;
  }
  GetGameContext() {
    return this.#game_context;
  }
  OnWindowMove(delta_x, delta_y) {}

  #x;
  #y;
  // Z-order: Higher is front :) maybe: 0 = background, 1 = level, 2 = player?
  #z_order;
  #is_shared;
  #owning_game;
  #game_context;
};

class GameContext {
  constructor(input_manager) {
    this.#entities = new Array();
    this.#input_manager = input_manager;
  }
  InputManager() {
    return this.#input_manager;
  }
  SetInputManager(manager) {
    this.#input_manager = manager;
  }
  AddEntity(entity) {
    this.#entities.push(entity);
  }
  RemoveEntity(entity) {
    this.#entities.splice(this.#entities.indexOf(entity), 1);
  }
  GetEntities() {
    return this.#entities;
  }
  #input_manager;
  #entities;
}

export {GameEntity, GameContext};
