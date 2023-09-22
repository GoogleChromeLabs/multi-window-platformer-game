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

import {DoorEntity} from './entities/doorEntity.js';
import {DoorEntitySwap} from './entities/doorEntitySwap.js';
import {GoalEntity} from './entities/goalEntity.js';
import {MovingPlatformEntity} from './entities/movingPlatformEntity.js';
import {PlayerEntity} from './entities/playerEntity.js';
import {RespawnPointEntity} from './entities/respawnPointEntity.js';
import {RippleEntity} from './entities/rippleEntity.js';
import {SolidBlockEntity} from './entities/solidBlockEntity.js';
import {GameContext} from './game.js';
import InputManager from './inputManager.js';
import {LEVEL_DATA_LIST, LoadLevels} from './levels/levels.js';
import {MultiScreenUtil} from './multiScreen.js';
import {PlaySound} from './sound.js';
import {WindowManager} from './window.js';

const FIREWORKS_LEVEL_NUMBER = -1;

// Window Aware implementation of `Game` that can detect when shared entities
// enter the window and tethers them. The tethered objects will move with the
// window when it's dragged around.
class GameWindow {
  constructor(win) {
    this.#window = win;
    this.#last_window_x = this.GetWindow().GetDomWindow().screenX;
    this.#last_window_y = this.GetWindow().GetDomWindow().screenY;
    this.#owned_entities = new Set();
  }
  AddEntity(entity) {
    this.#owned_entities.add(entity);
    entity.SetOwningGameWindow(this);
  }
  ReleaseEntity(entity) {
    this.#owned_entities.delete(entity);
    entity.ReleaseOwningGameWindow();
  }
  GetWindow() {
    return this.#window;
  }

  Update(game_context) {
    this.#window.Update(game_context);
    // Check for window movements.
    if (this.GetWindow().GetDomWindow().screenX != this.#last_window_x ||
        this.GetWindow().GetDomWindow().screenY != this.#last_window_y) {
      let delta_x =
          this.GetWindow().GetDomWindow().screenX - this.#last_window_x;
      let delta_y =
          this.GetWindow().GetDomWindow().screenY - this.#last_window_y;
      this.#last_window_x = this.GetWindow().GetDomWindow().screenX;
      this.#last_window_y = this.GetWindow().GetDomWindow().screenY;
      // Update "tethered" shared objects to move along with the window.
      for (const e of this.#owned_entities) {
        e.OnWindowMove(delta_x, delta_y);
        e.SetPosition(e.GetX() + delta_x, e.GetY() + delta_y);
      }
      this.GetWindow().Sync();
    }
    // Check when a shared entity enters our window/game and add it to our local
    // entities.
    for (const e of game_context.GetEntities()) {
      if (!e.IsShared())
        continue;
      if (this.#owned_entities.has(e))
        continue;
      if (e.GetOwningGameWindow()?.Contains(e))
        continue;
      if (this.Contains(e)) {
        e.GetOwningGameWindow()?.ReleaseEntity(e);
        this.AddEntity(e);
      }
    }
    // Check when a "tethered" shared object leaves our window.
    for (const e of this.#owned_entities) {
      if (!e.IsShared())
        continue;
      if (!this.Contains(e)) {
        this.ReleaseEntity(e);
      }
    }
  }

  SetController(controller) {
    this.#controller = controller;
  }
  GetController() {
    return this.#controller;
  }
  GetWindow() {
    return this.#window;
  }
  Contains(entity) {
    return this.GetWindow().Contains(entity.GetX(), entity.GetY());
  }
  GetMsSinceTeleport() {
    return Date.now() - (this.#teleport_timestamp || 0);
  }
  Teleport() {
    this.#teleport_timestamp = Date.now();
    let screenDetails = this.#window.GetScreenDetails();
    const currentScreen = screenDetails?.currentScreen || window.screen;
    let screen =
        screenDetails?.screens.find(s => s !== screenDetails.currentScreen) ||
        window.screen;
    let context = this.#controller.GetContext();
    let domWindow = this.#window.GetDomWindow();
    let x = domWindow.screenX + (domWindow.outerWidth / 2);
    let y = domWindow.screenY + (domWindow.outerHeight / 2);
    let xFraction = ((x) - currentScreen.availLeft) / currentScreen.availWidth;
    let yFraction = ((y) - currentScreen.availTop) / currentScreen.availHeight;
    // TODO: Make a window teleport ripple effect, fix locations.
    context.AddEntity(new RippleEntity(context, x, y));
    if (screen != screenDetails?.currentScreen && screen != window.screen) {
      domWindow.moveTo(
          screen.availLeft + (screen.availWidth * xFraction) -
              (domWindow.outerWidth / 2),
          screen.availTop + (screen.availHeight * yFraction) -
              (domWindow.outerHeight / 2));
    } else {
      domWindow.moveTo(
          screen.availLeft +
              (domWindow.screenX - screen.availLeft + domWindow.outerWidth) %
                  screen.availWidth,
          domWindow.screenY);
    }
    // Sync window bounds are clamped to the current screen (crbug.com/1306895).
    setTimeout(() => {
      // TODO: Make a window teleport ripple effect, fix locations.
      let x = domWindow.screenX + domWindow.outerWidth / 2;
      let y = domWindow.screenY + domWindow.outerHeight / 2;
      context.AddEntity(new RippleEntity(context, x, y));
    }, 100);
  }

  Draw() {
    const w = this.GetWindow();
    // Repaint a background every frame.
    const ctx = w.GetCanvas()?.getContext('2d');
    if (!ctx)
      return;
    ctx.globalAlpha = 1;
    ctx.resetTransform();
    ctx.fillStyle = w.IsFocused() ? '#93b8fb' : '#75a5fb';
    ctx.fillRect(0, 0, w.GetCanvas().width, w.GetCanvas().height);
    ctx.translate(-w.GetX(), -w.GetY());

    // Draw all entities from other windows translucent.
    ctx.globalAlpha = 0.15;
    this.GetController().GetContext().GetEntities().forEach((e) => {
      if (e.GetOwningGameWindow() != this) {
        ctx.save();
        e.Draw(ctx);
        ctx.restore();
      }
    });

    // Draw all entities in this window normally.
    ctx.globalAlpha = 1;
    this.GetController().GetContext().GetEntities().forEach((e) => {
      if (e.GetOwningGameWindow() == this) {
        ctx.save();
        e.Draw(ctx);
        ctx.restore();
      }
    });

    w.GetDomWindow().requestAnimationFrame(() => this.Draw());
  }

  #last_window_x;
  #last_window_y;
  #owned_entities;
  #controller;
  #window;
  #teleport_timestamp;
}

// Main game controller.
class GameController {
  constructor() {
    this.#window_manager = new WindowManager();
    this.#current_level_number = 0;
  }
  async Initialize(progress_callback) {
    await this.#window_manager.Initialize();
    await LoadLevels(progress_callback);
  }
  async Start(level_index, stop_callback) {
    if (this.#is_running)
      throw new Error('Already running');
    this.#is_running = true;
    this.#stop_callback = stop_callback;
    PlaySound('start');

    this.#current_level_number = level_index;
    // Request multi-screen details for additional game functionality.
    // (e.g. knowing when the player exits the aggregate screen space)
    this.#screen_details = await MultiScreenUtil.GetScreenDetails();
    // Show game windows on another screen when available.
    this.#primary_game_screen =
        this.#screen_details?.screens.find(
            s => s != this.#screen_details.currentScreen) ||
        window.screen;
    await this.LoadLevel(LEVEL_DATA_LIST[this.#current_level_number]);
  }
  Stop() {
    if (!this.#is_running)
      return;
    this.#is_running = false;

    if (this.#cleanup_callback) {
      this.#cleanup_callback();
      this.#cleanup_callback = undefined;
    }

    if (this.#game_windows) {
      this.CloseCurrentWindows();
    }

    this.#stop_callback(
        (this.#current_level_number + LEVEL_DATA_LIST.length) %
        LEVEL_DATA_LIST.length);
    this.#stop_callback = undefined;
    this.#current_level_number = 0;
  }
  async LoadLevel(level_data) {
    this.#game_context = new GameContext(new InputManager());
    if (this.#game_windows) {
      this.CloseCurrentWindows();
    }

    if (level_data === undefined) {
      // We've reached the end of the game; show something special.
      console.log('The end of the game was reached');
      this.#current_level_number = FIREWORKS_LEVEL_NUMBER;
      level_data = this.FireworksLevelData();
    }

    // Make a copy, since we'll modify it below.
    level_data = self.structuredClone(level_data);

    // Compute bounding box of windows to get offset
    const bbox =
        {top: Infinity, left: Infinity, bottom: -Infinity, right: -Infinity};
    level_data.windows.forEach(window => {
      // Ignore fullscreen windows.
      if (window.fullscreen)
        return;
      bbox.left = Math.min(bbox.top, window.x);
      bbox.top = Math.min(bbox.top, window.y);
      bbox.right = Math.max(bbox.right, window.x + window.width);
      bbox.bottom = Math.max(bbox.bottom, window.y + window.height);
    });

    // Offset in global coordinates for initial window/entity positions.
    let screen = this.#primary_game_screen;
    const offset_x = Math.round(
        screen.availLeft + (screen.availWidth - (bbox.right - bbox.left)) / 2);
    const offset_y = Math.round(
        screen.availTop + (screen.availHeight - (bbox.bottom - bbox.top)) / 2);

    // Actually modify the initial positions of all windows.
    level_data.windows.forEach(window => {
      // Ignore fullscreen windows.
      if (window.fullscreen)
        return;

      let local_offset_x = offset_x;
      let local_offset_y = offset_y;

      // Ensure it fits on the display
      if (window.x + local_offset_x < screen.availLeft) {
        local_offset_x += screen.availLeft - (window.x + local_offset_x);
      }
      if (window.x + window.width + local_offset_x >
          screen.availLeft + screen.availWidth) {
        local_offset_x += (screen.availLeft + screen.availWidth) -
            (window.x + window.width + local_offset_x);
      }
      if (window.y + local_offset_y < screen.availTop) {
        local_offset_y += screen.availTop - (window.y + local_offset_y);
      }
      if (window.y + window.height + local_offset_y >
          screen.availTop + screen.availHeight) {
        local_offset_y += (screen.availTop + screen.availHeight) -
            (window.y + window.height + local_offset_y);
      }

      window.x += local_offset_x;
      window.y += local_offset_y;
      window.entities.forEach(entity => {
        entity.x += local_offset_x;
        entity.y += local_offset_y;
      });
    });

    // Instantiate level with player last, so it has focus.
    level_data.windows.sort((w1, w2) => {
      const HasPlayer = w => w.entities.some(e => e.type === 'PlayerEntity');
      const p1 = HasPlayer(w1) ? 1 : 0;
      const p2 = HasPlayer(w2) ? 1 : 0;
      return p1 - p2;
    });


    this.#game_windows = new Array();
    let windowPromises = [];
    level_data.windows.forEach(async w => {
      // TODO: Post about --enable-features=FullscreenPopupWindows + M113+
      // TODO: Work around requestAnimationFrame not firing on space switch.
      const windowPromise = this.#window_manager.AddWindow(
          w.width, w.height, w.x, w.y, w.allow_resize, w.fullscreen);
      windowPromises.push(windowPromise);
      windowPromise.then(window => {
        if (window) {
          this.GetContext().InputManager().RegisterWindow(
              window, this.GetContext());
          const game_window = new GameWindow(window, this.GetContext());
          game_window.SetController(this);
          this.#game_windows.push(game_window);
          w.entities.forEach(t => {
            let entity = this.InstantiateEntity(t);
            if (t.shared)
              entity.SetIsShared(true);
            this.AddEntity(entity);
            game_window.AddEntity(entity);
          });
        }
      });
    });

    const windows = await Promise.all(windowPromises);
    if (windows.some(w => !w)) {
      this.CloseCurrentWindows();
      self.document.querySelector('#popups-blocked').showModal();
    } else {
      windows.forEach(w => {
        w.SetTitle(`Level ${this.#current_level_number + 1}`);
        w.ShowToast(
            `Level ${this.#current_level_number + 1}`,
            level_data.level_text || '');
      });
      if (this.#current_level_number == FIREWORKS_LEVEL_NUMBER) {
        const intervals = [];
        const timeouts = [];
        timeouts.push(setTimeout(() => {
          this.Stop();
        }, 12000));
        PlaySound('fireworks');
        intervals.push(setInterval(() => {
          PlaySound('fireworks');
        }, 1500));
        intervals.push(setInterval(async () => {
          let bounds = await MultiScreenUtil.GetMultiScreenBoundaries();
          let x = bounds.left + Math.round(Math.random() * bounds.width);
          let y = bounds.top + Math.round(Math.random() * bounds.height);
          let entity =
              new RippleEntity(this.#game_context, x, y, /*style=*/ 'rainbow');
          this.AddEntity(entity);
        }, 100));
        this.#cleanup_callback = () => {
          timeouts.forEach(i => {
            clearTimeout(i);
          });
          intervals.forEach(i => {
            clearInterval(i);
          });
        };
      }

      // Start rAF loops for all windows.
      this.#game_windows.forEach(gw => {
        gw.Draw();
      });
    }

    this.#load_next_level = false;
    this.#retry_level = false;

    this.StartGameLoop();
  }
  InstantiateEntity(entity_data) {
    // TODO: Can we dynamically instantiate a class from a string?
    switch (entity_data.type) {
      case 'PlayerEntity':
        return new PlayerEntity(
            this.GetContext(), entity_data.x, entity_data.y);
      case 'SolidBlockEntity':
        return new SolidBlockEntity(
            this.GetContext(), entity_data.x, entity_data.y, entity_data.width,
            entity_data.height);
      case 'GoalEntity':
        return new GoalEntity(
            this.GetContext(), entity_data.x, entity_data.y, entity_data.width,
            entity_data.height);
      case 'DoorEntity':
        return new DoorEntity(
            this.GetContext(), entity_data.x, entity_data.y, entity_data.width,
            entity_data.height);
      case 'DoorEntitySwap':
        return new DoorEntitySwap(
            this.GetContext(), entity_data.x, entity_data.y, entity_data.width,
            entity_data.height);
      case 'RespawnPointEntity':
        return new RespawnPointEntity(
            this.GetContext(), entity_data.x, entity_data.y);
      case 'RippleEntity':
        return new RippleEntity(
            this.GetContext(), entity_data.x, entity_data.y);
      case 'MovingPlatformEntity':
        return new MovingPlatformEntity(
            this.GetContext(), entity_data.x, entity_data.y, entity_data.width,
            entity_data.height, entity_data.angle, entity_data.distance,
            entity_data.time);
    }
    throw new Error('Unknown type');
  }
  GetContext() {
    return this.#game_context;
  }
  StartGameLoop() {
    if (!this.#is_running)
      return;

    const GAME_RATE = 1000 / 120;  // Hz
    setTimeout(() => this.Update(), GAME_RATE);
  }
  AddEntity(entity) {
    this.GetContext().AddEntity(entity);
  }

  async Update() {
    let context = this.GetContext();
    if (context.InputManager().WasKeyPressed('Escape') ||
        this.#game_windows.some(w => w.GetWindow().IsClosed())) {
      this.Stop();
      return;
    }

    const has_focus = this.#game_windows.some(w => w.GetWindow().IsFocused());
    if (!has_focus && this.#had_focus) {
      context.InputManager().LostFocus();
    }
    this.#had_focus = has_focus;

    // TODO: Windows can only focus opened popups with transient activation.
    // (i.e. key presses on a game window cannot cycle focus to a sibling)
    if (context.InputManager().WasKeyPressed('['))
      this.#window_manager.CycleFocus(1);
    else if (context.InputManager().WasKeyPressed(']'))
      this.#window_manager.CycleFocus(-1);

    if (context.InputManager().WasKeyPressed('e'))
      this.RotateWindowPositions();

    if (context.InputManager().WasKeyPressed('t'))
      this.TeleportWindow();

    this.#game_windows.forEach(w => w.Update(context));
    for (const entity of context.GetEntities()) {
      await entity.Update(context);
    }

    // Sort entities by z-order.
    context.GetEntities().sort((e1, e2) => e1.GetZOrder() - e2.GetZOrder());

    context.InputManager().Update();
    if (this.#load_next_level || this.#retry_level) {
      this.#current_level_number = this.#retry_level ?
          this.#current_level_number :
          this.#current_level_number + 1;
      await this.LoadLevel(LEVEL_DATA_LIST[this.#current_level_number]);
      PlaySound('start');
      return;  // LoadLevel kick off the next update loop.
    }

    this.StartGameLoop();
  }

  SetLoadNextLevel() {
    this.#load_next_level = true;
  }
  SetRetryLevel() {
    this.#retry_level = true;
  }
  CloseCurrentWindows() {
    // TODO: This is way too intrusive. Figure out the model we want.
    for (let i = 0; i < this.#game_windows.length; i++) {
      this.#game_windows[i].GetWindow().GetDomWindow().close();
    }
    this.#game_windows.length = 0;
    this.#window_manager.GetWindows().length = 0;
  }

  RotateWindowPositions() {
    const windows = this.#window_manager.GetWindows();
    if (windows.length < 2)
      return;

    const last = windows[windows.length - 1];
    let savedX = last.GetDomWindow().screenX;
    let savedY = last.GetDomWindow().screenY;
    for (let w of this.#window_manager.GetWindows()) {
      let currX = savedX, currY = savedY;
      savedX = w.GetDomWindow().screenX;
      savedY = w.GetDomWindow().screenY;
      w.GetDomWindow().moveTo(currX, currY);
    }
  }

  TeleportWindow() {
    this.#game_windows.find(w => w.GetWindow().IsFocused())?.Teleport();
  }

  FireworksLevelData() {
    let level_data = {id: -1, level_text: 'You won!', windows: []};
    for (let s of this.#screen_details?.screens || [window.screen]) {
      level_data.windows.push({
        x: s.availLeft,
        y: s.availTop,
        width: s.availWidth,
        height: s.availHeight,
        entities: [],
        fullscreen: true,
      });
    }
    return level_data;
  }

  #window_manager;
  #screen_details;
  #primary_game_screen;
  #game_windows;
  #game_context;
  #current_level_number;
  #load_next_level;
  #retry_level;
  #had_focus;

  // True when the game loop is active.
  #is_running;

  // Invoked when the game loop stops.
  #stop_callback;

  // Optionally registered by levels, invoked when the game loop stops.
  #cleanup_callback;
};

export default GameController;
